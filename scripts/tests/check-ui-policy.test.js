import assert from 'node:assert/strict';
import test from 'node:test';

import { inspectUiPolicy } from '../check-ui-policy.js';

const navigationBasePath = 'src/styles/scoped/stats-navigation-base.css';
const navigationResponsivePath = 'src/styles/scoped/stats-navigation-responsive.css';
const shimmerPath = 'src/styles/scoped/media-load-shimmer.css';
const liquidGlassPath = 'src/styles/liquid-glass.css';
const mainPath = 'src/main.js';
const appPath = 'src/App.vue';
const liquidGlassFiltersPath = 'src/components/ui/LiquidGlassFilters.vue';

const navigationBase = '.stats-navigation { display: flex; }\n';
const navigationResponsive = '@media (max-width: 520px) { .stats-navigation { gap: 4px; } }\n';
const shimmer = ".media-load-shimmer:not([data-loaded='1']) { animation: shimmer 1s linear infinite; }\n";
const liquidGlass = '.ui-liquid-glass { position: relative; }\n.ui-liquid-glass--regular { --ui-glass-surface-bg: #fff; }\n';
const main = `
import { createApp } from 'vue';
import './styles/tokens.css';
import './style.css';
import './styles/liquid-glass.css';
import './styles/primitives.css';
import App from './App.vue';

createApp(App).mount('#app');
`;
const app = `
<template>
  <div class="main-app">
    <LiquidGlassFilters />
  </div>
</template>

<script setup>
import LiquidGlassFilters from './components/ui/LiquidGlassFilters.vue';
</script>
`;
const liquidGlassFilters = '<template><svg id="ui-liquid-glass-filter-host"></svg></template>\n';

function scopedSource(path) {
  return `<style scoped src="../${path.slice('src/'.length)}"></style>`;
}

function consumerSources({ card = true, song = true, event = true } = {}) {
  const navigationSources = `${scopedSource(navigationBasePath)}\n${scopedSource(navigationResponsivePath)}`;
  const shimmerSource = scopedSource(shimmerPath);

  return {
    'src/components/CardStats.vue': card ? `${navigationSources}\n${shimmerSource}` : '',
    'src/components/SongStats.vue': song ? `${navigationSources}\n${shimmerSource}` : '',
    'src/components/EventHistory.vue': event ? shimmerSource : '',
  };
}

function inspectFixture(overrides = {}) {
  const sources = new Map([
    [navigationBasePath, navigationBase],
    [navigationResponsivePath, navigationResponsive],
    [shimmerPath, shimmer],
    [liquidGlassPath, liquidGlass],
    [mainPath, main],
    [appPath, app],
    [liquidGlassFiltersPath, liquidGlassFilters],
    ...Object.entries(consumerSources()),
    ...Object.entries(overrides),
  ]);

  return inspectUiPolicy({
    files: [...sources.keys()],
    readText: (file) => sources.get(file),
  });
}

test('accepts the declared viewport widths', () => {
  const diagnostics = inspectFixture({
    'src/styles/allowed-widths.css': `
      @media (max-width: 520px) { .a { color: red; } }
      @media (min-width: 521px) { .b { color: red; } }
      @media (max-width: 699px) { .c { color: red; } }
      @media (min-width: 700px) { .d { color: red; } }
      @media (max-width: 701px) { .e { color: red; } }
      @media (max-width: 768px) { .f { color: red; } }
      @media (min-width: 769px) { .g { color: red; } }
      @media (max-width: 900px) { .h { color: red; } }
      @media (min-width: 901px) { .i { color: red; } }
      @media (max-width: 1200px) { .j { color: red; } }
      @media (min-width: 1201px) { .k { color: red; } }
      @media (min-width: 1360px) { .l { color: red; } }
    `,
  });

  assert.deepEqual(diagnostics, []);
});

test('reports an undeclared viewport width with its file and line', () => {
  const diagnostics = inspectFixture({
    'src/styles/undeclared-width.css': '\n@media (max-width: 760px) { .a { color: red; } }',
  });

  assert.ok(diagnostics.includes('src/styles/undeclared-width.css:2: undeclared viewport width 760px'));
});

test('ignores container and non-viewport media conditions', () => {
  const diagnostics = inspectFixture({
    'src/styles/non-viewport-media.css': `
      /* @media (max-width: 760px) { .comment { color: red; } } */
      .pseudo::before { content: "@media (max-width: 760px) { .string { color: red; } }"; }
      @container (min-width: 760px) { .a { color: red; } }
      @media (prefers-reduced-motion: reduce) { .b { color: red; } }
      @media (pointer: coarse) and (hover: none) { .c { color: red; } }
    `,
  });

  assert.deepEqual(diagnostics, []);
});

for (const consumer of ['CardStats.vue', 'SongStats.vue']) {
  test(`requires both navigation fragments in ${consumer}`, () => {
    const file = `src/components/${consumer}`;
    const diagnostics = inspectFixture({
      [file]: scopedSource(shimmerPath),
    });

    assert.ok(diagnostics.some((diagnostic) => diagnostic.includes(consumer) && diagnostic.includes('stats-navigation-base.css')));
    assert.ok(diagnostics.some((diagnostic) => diagnostic.includes(consumer) && diagnostic.includes('stats-navigation-responsive.css')));
  });
}

for (const consumer of ['CardStats.vue', 'SongStats.vue', 'EventHistory.vue']) {
  test(`requires the shimmer fragment in ${consumer}`, () => {
    const file = `src/components/${consumer}`;
    const diagnostics = inspectFixture({
      [file]: '',
    });

    assert.ok(diagnostics.some((diagnostic) => diagnostic.includes(consumer) && diagnostic.includes('media-load-shimmer.css')));
  });
}

test('reports a missing shared source even when its consumers declare it', () => {
  const sources = new Map([
    [navigationResponsivePath, navigationResponsive],
    [shimmerPath, shimmer],
    ...Object.entries(consumerSources()),
  ]);
  const diagnostics = inspectUiPolicy({
    files: [...sources.keys()],
    readText: (file) => sources.get(file),
  });

  assert.ok(diagnostics.some((diagnostic) => diagnostic.includes('missing shared source') && diagnostic.includes(navigationBasePath)));
});

test('rejects an unscoped shared source style', () => {
  const diagnostics = inspectFixture({
    'src/components/CardStats.vue': `
      <style src="../styles/scoped/stats-navigation-base.css"></style>
      ${scopedSource(navigationResponsivePath)}
      ${scopedSource(shimmerPath)}
    `,
  });

  assert.ok(diagnostics.some((diagnostic) => diagnostic.includes('CardStats.vue') && diagnostic.includes('unscoped') && diagnostic.includes('stats-navigation-base.css')));
});

test('rejects normalized shared rules that remain inline in a consumer', () => {
  const diagnostics = inspectFixture({
    'src/components/CardStats.vue': `
      ${scopedSource(navigationBasePath)}
      ${scopedSource(navigationResponsivePath)}
      ${scopedSource(shimmerPath)}
      <style scoped>
        .stats-navigation {display: flex;}
      </style>
    `,
  });

  assert.ok(diagnostics.some((diagnostic) => diagnostic.includes('CardStats.vue') && diagnostic.includes('duplicate normalized shared rule') && diagnostic.includes('.stats-navigation')));
});

test('accepts the centralized liquid glass import, singleton host, and material selectors', () => {
  assert.deepEqual(inspectFixture(), []);
});

test('rejects liquid glass governance violations outside the central material source', () => {
  const diagnostics = inspectFixture({
    [mainPath]: `
      import { createApp } from 'vue';
      import './styles/tokens.css';
      import './style.css';
      import './styles/primitives.css';
    `,
    [appPath]: `
      <template><div class="main-app"></div></template>
      <script setup>import LiquidGlassFilters from './components/ui/LiquidGlassFilters.vue';</script>
    `,
    'src/components/CardStats.vue': `
      ${scopedSource(navigationBasePath)}
      ${scopedSource(navigationResponsivePath)}
      ${scopedSource(shimmerPath)}
      <style scoped>.ui-liquid-glass--regular { background: white; }</style>
    `,
  });

  assert.ok(diagnostics.some((message) => message.includes('missing global liquid glass import')));
  assert.ok(diagnostics.some((message) => message.includes('LiquidGlassFilters must be mounted exactly once')));
  assert.ok(diagnostics.some((message) => message.includes('liquid glass material selector must stay centralized')));
});
