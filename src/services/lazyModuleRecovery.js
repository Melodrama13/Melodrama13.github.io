// The build plugin replaces these development paths with Rollup chunk URLs.
// Only the URL metadata is eager; the components and engines remain deferred.
const recoveryModulePaths = {
  predictionEditor: '/src/components/PredictEditor.vue',
  captureCanvas: '/node_modules/html-to-image/es/index.js',
  captureHtml: '/node_modules/html2canvas/dist/html2canvas.esm.js'
};

const withRetryQuery = (url, attempt) => {
  const target = new URL(url, import.meta.url);
  target.searchParams.set('moduleRetry', String(attempt));
  return target.href;
};

const reloadFailedStylesheet = (url, attempt) => new Promise((resolve, reject) => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = withRetryQuery(url, attempt);
  link.onload = () => {
    const failedUrl = new URL(url, import.meta.url).href;
    for (const previous of document.head.querySelectorAll('link[rel="stylesheet"]')) {
      if (previous !== link && previous.href === failedUrl) previous.remove();
    }
    resolve();
  };
  link.onerror = () => {
    link.remove();
    reject(new Error(`Unable to preload CSS for ${url}`));
  };
  document.head.appendChild(link);
});

/** A new import URL bypasses the browser's cached failure after a user retry. */
export const createRetryableModuleImporter = (moduleKey, importModule) => {
  let hasFailed = false;
  let retryAttempt = 0;
  const failedStylesheets = new Set();
  const rememberFailure = error => {
    hasFailed = true;
    const match = String(error?.message || '').match(/^Unable to preload CSS for (.+)$/);
    if (match) failedStylesheets.add(match[1]);
  };

  return async () => {
    if (!hasFailed) {
      try { return await importModule(); }
      catch (error) { rememberFailure(error); throw error; }
    }
    const attempt = ++retryAttempt;
    for (const url of failedStylesheets) {
      await reloadFailedStylesheet(url, attempt);
      failedStylesheets.delete(url);
    }
    try { return await importModule(); }
    catch (error) { rememberFailure(error); }
    const url = withRetryQuery(recoveryModulePaths[moduleKey], attempt);
    try { return await import(/* @vite-ignore */ url); }
    catch (error) { rememberFailure(error); throw error; }
  };
};
