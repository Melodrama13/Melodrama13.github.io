import path from 'node:path';

/** Expose emitted chunk URLs to failure recovery without importing their code. */
export const lazyModuleRecoveryPlugin = () => {
  let root;
  let references;
  return {
    name: 'pjsk-lazy-module-recovery',
    apply: 'build',
    configResolved(config) { root = config.root; },
    async buildStart() {
      const modules = [
        ['predictionEditor', path.resolve(root, 'src/components/PredictEditor.vue')],
        ['captureCanvas', 'html-to-image'],
        ['captureHtml', 'html2canvas']
      ];
      references = new Map();
      for (const [key, specifier] of modules) {
        const resolved = await this.resolve(specifier, path.resolve(root, 'src/services/lazyModuleRecovery.js'));
        if (!resolved) this.error(`Cannot resolve deferred module ${specifier}`);
        references.set(key, this.emitFile({type:'chunk',id:resolved.id}));
      }
    },
    transform(code, id) {
      if (!id.replaceAll('\\', '/').endsWith('/src/services/lazyModuleRecovery.js')) return;
      const paths = {
        predictionEditor: '/src/components/PredictEditor.vue',
        captureCanvas: '/node_modules/html-to-image/es/index.js',
        captureHtml: '/node_modules/html2canvas/dist/html2canvas.esm.js'
      };
      for (const [key, sourcePath] of Object.entries(paths)) code = code.replace(JSON.stringify(sourcePath), `import.meta.ROLLUP_FILE_URL_${references.get(key)}`).replace(`'${sourcePath}'`, `import.meta.ROLLUP_FILE_URL_${references.get(key)}`);
      return {code,map:null};
    }
  };
};
