import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOWED_VIEWPORT_WIDTHS = new Set([
  520,
  521,
  699,
  700,
  701,
  768,
  769,
  900,
  901,
  1200,
  1201,
  1360,
]);

const SHARED_SOURCES = {
  'src/styles/scoped/stats-navigation-base.css': [
    'src/components/CardStats.vue',
    'src/components/SongStats.vue',
  ],
  'src/styles/scoped/stats-navigation-responsive.css': [
    'src/components/CardStats.vue',
    'src/components/SongStats.vue',
  ],
  'src/styles/scoped/media-load-shimmer.css': [
    'src/components/CardStats.vue',
    'src/components/SongStats.vue',
    'src/components/EventHistory.vue',
  ],
};

function normalizePath(file) {
  return file.replaceAll('\\', '/');
}

function lineNumber(text, offset) {
  return text.slice(0, offset).split('\n').length;
}

function stripCssComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

function maskCssCommentsAndStrings(text) {
  const characters = [...text];
  let quote = null;

  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];

    if (quote) {
      if (character === '\\') {
        if (characters[index + 1] !== '\n' && characters[index + 1] !== '\r') {
          characters[index + 1] = ' ';
        }
        characters[index] = ' ';
        index += 1;
      } else if (character === quote) {
        characters[index] = ' ';
        quote = null;
      } else if (character !== '\n' && character !== '\r') {
        characters[index] = ' ';
      }
      continue;
    }

    if (character === '"' || character === "'") {
      characters[index] = ' ';
      quote = character;
    } else if (character === '/' && characters[index + 1] === '*') {
      characters[index] = ' ';
      characters[index + 1] = ' ';
      index += 2;
      while (index < characters.length && !(characters[index] === '*' && characters[index + 1] === '/')) {
        if (characters[index] !== '\n' && characters[index] !== '\r') characters[index] = ' ';
        index += 1;
      }
      if (index < characters.length) {
        characters[index] = ' ';
        if (characters[index + 1] === '/') characters[index + 1] = ' ';
        index += 1;
      }
    }
  }

  return characters.join('');
}

function normalizeCssPart(text) {
  return stripCssComments(text)
    .replace(/\s+/g, ' ')
    .replace(/\s*([,:;{}>+~])\s*/g, '$1')
    .trim();
}

function findMatchingBrace(text, openIndex) {
  let depth = 0;
  let quote = null;

  for (let index = openIndex; index < text.length; index += 1) {
    const character = text[index];

    if (quote) {
      if (character === '\\') {
        index += 1;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }

    if (character === '/' && text[index + 1] === '*') {
      const commentEnd = text.indexOf('*/', index + 2);
      index = commentEnd === -1 ? text.length : commentEnd + 1;
      continue;
    }

    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return text.length - 1;
}

function skipCssTrivia(text, start) {
  let index = start;
  while (index < text.length) {
    if (/\s/.test(text[index])) {
      index += 1;
      continue;
    }
    if (text[index] === '/' && text[index + 1] === '*') {
      const commentEnd = text.indexOf('*/', index + 2);
      index = commentEnd === -1 ? text.length : commentEnd + 2;
      continue;
    }
    break;
  }
  return index;
}

function nextCssBoundary(text, start, end = text.length) {
  let quote = null;

  for (let index = start; index < end; index += 1) {
    const character = text[index];

    if (quote) {
      if (character === '\\') {
        index += 1;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }

    if (character === '/' && text[index + 1] === '*') {
      const commentEnd = text.indexOf('*/', index + 2);
      index = commentEnd === -1 ? text.length : commentEnd + 1;
      continue;
    }

    if (character === '{' || character === ';') {
      return { index, character };
    }
  }

  return { index: text.length, character: null };
}

function collectCssRules(text, start = 0, context = [], end = text.length) {
  const rules = [];
  let cursor = start;

  while (cursor < end) {
    cursor = skipCssTrivia(text, cursor);
    if (cursor >= end) break;

    const boundary = nextCssBoundary(text, cursor, end);
    if (boundary.character === null) break;

    const header = text.slice(cursor, boundary.index).trim();
    if (!header) {
      cursor = boundary.index + 1;
      continue;
    }

    if (boundary.character === ';') {
      cursor = boundary.index + 1;
      continue;
    }

    const closeIndex = findMatchingBrace(text, boundary.index);
    const body = text.slice(boundary.index + 1, closeIndex);
    const normalizedHeader = normalizeCssPart(header);

    if (header.startsWith('@')) {
      rules.push(...collectCssRules(text, boundary.index + 1, [...context, normalizedHeader], closeIndex));
    } else {
      rules.push({
        key: `${context.join('|')}|${normalizeCssPart(header)}|${normalizeCssPart(body)}`,
        selector: normalizeCssPart(header),
        lineOffset: cursor,
      });
    }

    cursor = closeIndex + 1;
  }

  return rules;
}

function extractStyleBlocks(text) {
  const blocks = [];
  const stylePattern = /<style\b([^>]*)>([\s\S]*?)<\/style\s*>/gi;
  for (const match of text.matchAll(stylePattern)) {
    const attributes = match[1] || '';
    const content = match[2] || '';
    const contentOffset = match.index + match[0].indexOf('>') + 1;
    blocks.push({
      attributes,
      content,
      contentOffset,
      tagOffset: match.index,
    });
  }
  return blocks;
}

function extractMediaHeaders(text, offset = 0) {
  const mediaHeaders = [];
  const mediaPattern = /@media\s*([^\{]+)\{/gi;
  const scanText = maskCssCommentsAndStrings(text);

  for (const match of scanText.matchAll(mediaPattern)) {
    const condition = match[1].trim();
    const widthPattern = /(?:min|max)-width\s*:\s*(\d+(?:\.\d+)?)px\b/gi;
    for (const widthMatch of condition.matchAll(widthPattern)) {
      const rawWidth = widthMatch[1];
      const numericWidth = Number(rawWidth);
      mediaHeaders.push({
        width: rawWidth,
        numericWidth,
        offset: offset + match.index,
      });
    }
  }

  return mediaHeaders;
}

function inspectViewportWidths(file, text) {
  const diagnostics = [];
  const styleBlocks = file.endsWith('.vue') ? extractStyleBlocks(text) : [{ content: text, contentOffset: 0 }];
  const seen = new Set();

  for (const block of styleBlocks) {
    for (const media of extractMediaHeaders(block.content, block.contentOffset)) {
      if (ALLOWED_VIEWPORT_WIDTHS.has(media.numericWidth)) continue;
      const line = lineNumber(text, media.offset);
      const key = `${file}:${line}:${media.width}`;
      if (seen.has(key)) continue;
      seen.add(key);
      diagnostics.push(`${file}:${line}: undeclared viewport width ${media.width}px`);
    }
  }

  return diagnostics;
}

function resolveSourcePath(consumerFile, source) {
  if (!source.startsWith('.')) return normalizePath(source);
  return normalizePath(path.posix.normalize(path.posix.join(path.posix.dirname(consumerFile), source)));
}

function isScoped(attributes) {
  return /(?:^|\s)scoped(?:\s|$)/i.test(attributes);
}

function extractStyleSources(file, text) {
  const sources = [];
  for (const block of extractStyleBlocks(text)) {
    const srcMatch = block.attributes.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) continue;
    sources.push({
      source: resolveSourcePath(file, srcMatch[1]),
      scoped: isScoped(block.attributes),
      line: lineNumber(text, block.tagOffset),
    });
  }
  return sources;
}

function extractInlineScopedRules(file, text) {
  const rules = [];
  for (const block of extractStyleBlocks(text)) {
    if (!isScoped(block.attributes) || /\bsrc\s*=/i.test(block.attributes)) continue;
    for (const rule of collectCssRules(block.content)) {
      rules.push({ ...rule, line: lineNumber(text, block.contentOffset + rule.lineOffset) });
    }
  }
  return rules;
}

function inspectSharedSources(sourceMap) {
  const diagnostics = [];
  const sourceRules = new Map();

  for (const sharedPath of Object.keys(SHARED_SOURCES)) {
    const sharedText = sourceMap.get(sharedPath);
    if (typeof sharedText !== 'string') {
      diagnostics.push(`missing shared source ${sharedPath}`);
      sourceRules.set(sharedPath, []);
      continue;
    }
    sourceRules.set(sharedPath, collectCssRules(sharedText));
  }

  for (const [sharedPath, consumers] of Object.entries(SHARED_SOURCES)) {
    for (const consumer of consumers) {
      const text = sourceMap.get(consumer);
      const sources = typeof text === 'string' ? extractStyleSources(consumer, text) : [];
      const matchingSources = sources.filter((entry) => entry.source === sharedPath);

      if (matchingSources.length === 0) {
        diagnostics.push(`${consumer}: missing scoped consumer for ${sharedPath}`);
      } else if (matchingSources.some((entry) => !entry.scoped)) {
        diagnostics.push(`${consumer}:${matchingSources.find((entry) => !entry.scoped).line}: unscoped shared source ${sharedPath}`);
      }

      if (typeof text !== 'string') continue;
      const sharedRuleKeys = new Map((sourceRules.get(sharedPath) || []).map((rule) => [rule.key, rule]));
      if (sharedRuleKeys.size === 0) continue;
      for (const rule of extractInlineScopedRules(consumer, text)) {
        const sharedRule = sharedRuleKeys.get(rule.key);
        if (!sharedRule) continue;
        diagnostics.push(`${consumer}:${rule.line}: duplicate normalized shared rule ${rule.selector} from ${sharedPath}`);
      }
    }
  }

  return diagnostics;
}

export function inspectUiPolicy({ files, readText }) {
  const normalizedFiles = [...new Set(files.map(normalizePath))]
    .filter((file) => /^src\/.*\.(?:vue|css)$/i.test(file))
    .sort();
  const sourceMap = new Map();
  const diagnostics = [];

  for (const file of normalizedFiles) {
    const text = readText(file);
    if (typeof text !== 'string') continue;
    sourceMap.set(file, text);
    diagnostics.push(...inspectViewportWidths(file, text));
  }

  diagnostics.push(...inspectSharedSources(sourceMap));
  return [...new Set(diagnostics)].sort();
}

function collectSourceFiles(rootDir) {
  const srcDir = path.join(rootDir, 'src');
  const files = [];

  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (/\.(?:vue|css)$/i.test(entry.name)) {
        files.push(normalizePath(path.relative(rootDir, absolutePath)));
      }
    }
  }

  visit(srcDir);
  return files.sort();
}

export function runUiPolicyCheck(rootDir) {
  const absoluteRoot = path.resolve(rootDir);
  const files = collectSourceFiles(absoluteRoot);
  return inspectUiPolicy({
    files,
    readText: (file) => fs.readFileSync(path.join(absoluteRoot, file), 'utf8'),
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const diagnostics = runUiPolicyCheck(process.cwd());
  if (diagnostics.length > 0) {
    console.error(diagnostics.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('UI policy check passed');
  }
}
