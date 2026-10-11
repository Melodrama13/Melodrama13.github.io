import { normalizeUnit } from './specialPredictionFormatters.js';

/** Owns special prediction note tokens with explicit instance dependencies. */
export function useSpecialNoteTokens(ports = {}) {
const UNIT_LOGOS = {
  ln: '/elements/Leo_need.webp',
  mmj: '/elements/MORE_MORE_JUMP!.webp',
  vbs: '/elements/Vivid_BAD_SQUAD.webp',
  ws: '/elements/ワンダーランズ×ショウタイム.webp',
  nc: '/elements/25時、ナイトコードで.webp',
  vs: '/elements/virtual_singer.webp'
};

const NOTE_ICON_TOKEN_PATTERN = /\[\[sp-icon:(attr|char|unit):([^\]]+)\]\]/g;

const NOTE_ICON_TRIGGER_SPACE_VERSION = 2;

const NOTE_ATTRIBUTE_COMMANDS = Object.freeze({
  cute: ['cute', '粉花', '粉'],
  cool: ['cool', '蓝星', '蓝'],
  pure: ['pure', '绿草', '绿'],
  happy: ['happy', '黄心', '橙心', '黄', '橙'],
  mysterious: ['mysterious', '紫月', '紫']
});

const NOTE_UNIT_COMMANDS = Object.freeze({
  ln: ['ln', 'leoneed'],
  mmj: ['mmj', 'moremorejump'],
  vbs: ['vbs', 'vividbadsquad'],
  ws: ['ws', 'wxs', 'wonderlandsxshowtime'],
  nc: ['nc', '25', '25ji', '25时'],
  vs: ['vs', 'virtualsinger', '虚拟歌手']
});

const findNoteCommandAlias = (definitions, command) => (
  Object.entries(definitions).find(([, aliases]) => aliases.includes(command))?.[0] || ''
);

const getNoteIconDescriptor = (kind, rawKey) => {
  const key = String(rawKey || '').trim();
  if (kind === 'attr' && Object.prototype.hasOwnProperty.call(NOTE_ATTRIBUTE_COMMANDS, key)) {
    return { kind, key, src: `/elements/${key}.png`, alt: key, className: 'is-attribute' };
  }
  if (kind === 'unit' && Object.prototype.hasOwnProperty.call(NOTE_UNIT_COMMANDS, key)) {
    return { kind, key, src: `/elements/${key}.png`, alt: key.toUpperCase(), className: 'is-unit' };
  }
  if (kind !== 'char') return null;
  const separator = key.lastIndexOf('_');
  const abbr = separator > 0 ? key.slice(0, separator) : key;
  const unit = separator > 0 ? normalizeUnit(key.slice(separator + 1)) : '';
  const meta = Object.values(ports.metadata.charMap.value).find((item) => item.abbr.toLowerCase() === abbr.toLowerCase());
  if (!meta) return null;
  const suffix = meta.unit === 'vs' && unit && unit !== 'vs' ? `_${unit}` : '';
  const fileName = suffix ? `${meta.abbr.toLowerCase()}${suffix}` : meta.abbr;
  return {
    kind,
    key: suffix ? `${meta.abbr}${suffix}` : meta.abbr,
    src: `/chibi_s/${fileName}.webp`,
    alt: meta.zhName,
    className: 'is-character'
  };
};

const resolveNoteIconCommand = (rawCommand) => {
  const command = String(rawCommand || '').trim().toLowerCase();
  if (!command) return null;
  const attribute = findNoteCommandAlias(NOTE_ATTRIBUTE_COMMANDS, command);
  if (attribute) return getNoteIconDescriptor('attr', attribute);
  const unit = findNoteCommandAlias(NOTE_UNIT_COMMANDS, command);
  if (unit) return getNoteIconDescriptor('unit', unit);

  const separator = command.lastIndexOf('_');
  const characterAlias = separator > 0 ? command.slice(0, separator) : command;
  const requestedUnit = separator > 0 ? command.slice(separator + 1) : '';
  const meta = ports.metadata.characterCommandMap.value.get(characterAlias);
  if (!meta) return null;
  if (requestedUnit && (meta.unit !== 'vs' || !Object.prototype.hasOwnProperty.call(NOTE_UNIT_COMMANDS, requestedUnit))) {
    return null;
  }
  return getNoteIconDescriptor('char', requestedUnit ? `${meta.abbr}_${requestedUnit}` : meta.abbr);
};

const createEventNoteIconElement = (descriptor) => {
  const image = document.createElement('img');
  image.className = `special-note-inline-icon ${descriptor.className || ''}`.trim();
  image.src = descriptor.src;
  image.alt = descriptor.alt || '';
  image.draggable = false;
  image.contentEditable = 'false';
  image.dataset.noteToken = `[[sp-icon:${descriptor.kind}:${descriptor.key}]]`;
  return image;
};

const renderEventNoteContent = (element, value) => {
  if (!element) return;
  const text = String(value ?? '');
  const fragment = document.createDocumentFragment();
  let offset = 0;
  const pattern = new RegExp(NOTE_ICON_TOKEN_PATTERN.source, 'g');
  for (const match of text.matchAll(pattern)) {
    if (match.index > offset) fragment.appendChild(document.createTextNode(text.slice(offset, match.index)));
    const descriptor = getNoteIconDescriptor(match[1], match[2]);
    fragment.appendChild(descriptor
      ? createEventNoteIconElement(descriptor)
      : document.createTextNode(match[0]));
    offset = match.index + match[0].length;
  }
  if (offset < text.length) fragment.appendChild(document.createTextNode(text.slice(offset)));
  element.replaceChildren(fragment);
};

const isEventNoteBlockElement = (node) => (
  node instanceof HTMLElement && ['DIV', 'P'].includes(node.tagName)
);

const isEventNotePlaceholderBreak = (node) => (
  isEventNoteBlockElement(node)
  && node.childNodes.length === 1
  && node.firstChild instanceof HTMLElement
  && node.firstChild.tagName === 'BR'
);

const serializeEventNoteChildren = (element) => {
  const children = [...(element?.childNodes || [])];
  let value = '';
  let previousNode = null;
  let previousContent = '';
  children.forEach((node, index) => {
    const content = serializeEventNoteNode(node);
    if (
      index > 0
      && (isEventNoteBlockElement(previousNode) || isEventNoteBlockElement(node))
      && !previousContent.endsWith('\n')
    ) {
      value += '\n';
    }
    value += content;
    previousNode = node;
    previousContent = content;
  });
  return value;
};

const serializeEventNoteNode = (node) => {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
  if (!(node instanceof HTMLElement)) return '';
  if (node.matches('img.special-note-inline-icon[data-note-token]')) return node.dataset.noteToken || '';
  if (node.tagName === 'BR') return '\n';
  if (isEventNotePlaceholderBreak(node)) return '';
  return serializeEventNoteChildren(node);
};

const serializeEventNoteElement = (element) => serializeEventNoteChildren(element);

return { UNIT_LOGOS,
NOTE_ICON_TOKEN_PATTERN,
NOTE_ICON_TRIGGER_SPACE_VERSION,
NOTE_ATTRIBUTE_COMMANDS,
NOTE_UNIT_COMMANDS,
findNoteCommandAlias,
getNoteIconDescriptor,
resolveNoteIconCommand,
createEventNoteIconElement,
renderEventNoteContent,
isEventNoteBlockElement,
isEventNotePlaceholderBreak,
serializeEventNoteChildren,
serializeEventNoteNode,
serializeEventNoteElement };
}
