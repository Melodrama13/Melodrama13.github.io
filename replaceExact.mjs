import fs from 'fs';
import path from 'path';

function replaceByLines(filePath, funcStart, funcEnd, isCardStats) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Replace import
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("import html2canvas from 'html2canvas';")) {
      lines[i] = lines[i].replace("import html2canvas from 'html2canvas';", "import { toCanvas } from 'html-to-image';");
    }
  }

  const funcName = isCardStats ? 'runExportElementPng' : 'exportElementPng';
  const param = isCardStats ? 'id' : 'targetEl';
  const extraSetup = isCardStats 
    ? "  const targetEl = typeof id === 'string' ? document.getElementById(id) : id;\n  if (!targetEl) return setScreenshotModalState({ state: 'error', title: '错误', message: '未找到元素', cancelTask: null });\n"
    : "";

  const newFunction = `const ${funcName} = async (${param}, title, options = {}) => {
${extraSetup}  const exportLabel = String(options?.taskLabel || title || '当前模块');
  const exportStartAt = performance.now();
  const formatElapsed = () => \`\${Math.max(0, Math.round(performance.now() - exportStartAt))}ms\`;

  setScreenshotModalState({
    state: 'capturing',
    title: '截图中',
    message: '[初始化] 正在准备捕获 ' + exportLabel,
    cancelTask: () => {}
  });

  try {
    await new Promise(r => setTimeout(r, 600));

    setScreenshotModalState({
      state: 'capturing',
      title: '截图中',
      message: '[渲染中] ' + exportLabel + '，旧设备可能需要较长时间...',
      cancelTask: () => {}
    });

    const canvas = await toCanvas(targetEl, {
      backgroundColor: '#ffffff',
      pixelRatio: window.devicePixelRatio && window.devicePixelRatio > 1 ? window.devicePixelRatio : 2,
      skipFonts: false,
      filter: (node) => {
        if (node.classList && (node.classList.contains('export-hide') || node.classList.contains('nav-cutoff-controls'))) {
          return false;
        }
        return true;
      }
    });

    if (!canvas) throw new Error('toCanvas returned null');

    setScreenshotModalState({
      state: 'exporting',
      title: '导出图片',
      message: '[编码中] 正在生成 PNG 文件...',
      cancelTask: () => {}
    });

    const ts = typeof formatExportTimestamp === 'function' ? formatExportTimestamp() : Date.now();
    const safeTitle = typeof sanitizeExportFileName === 'function' ? sanitizeExportFileName(\`\${title}_\${ts}\`) : \`\${title}_\${ts}\`;

    if (typeof triggerDownloadPng === 'function') {
      await triggerDownloadPng(canvas, safeTitle);
    } else {
      canvas.toBlob(blob => {
        if(!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = safeTitle + ".png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    setScreenshotModalState({
      state: 'success',
      title: '导出成功',
      message: \`【\${exportLabel}】已导出 PNG（耗时 \${formatElapsed()}）\`,
      cancelTask: null,
      autoCloseMs: 1400
    });
  } catch (error) {
    console.error('导出失败:', error);
    setScreenshotModalState({
      state: 'failed',
      title: '截图失败',
      message: '[失败] 导出发生错误: ' + error.message,
      retryTask: typeof options?.retryTask === 'function' ? options.retryTask : null,
      cancelTask: null
    });
  }
};`;

  // Splice out the old function lines
  lines.splice(funcStart - 1, funcEnd - funcStart + 1, newFunction);

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

replaceByLines(path.resolve('src/components/SongStats.vue'), 4014, 4287, false);
replaceByLines(path.resolve('src/components/CardStats.vue'), 4228, 4458, true);
