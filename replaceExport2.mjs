import fs from 'fs';
import path from 'path';

function replaceExportFunction(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace html2canvas import
  content = content.replace(/import html2canvas from 'html2canvas';/g, "import { toCanvas } from 'html-to-image';");

  let startPhrase = "const exportElementPng = async (targetEl, title, options = {}) => {";
  let isCardStats = false;
  let startIdx = content.indexOf(startPhrase);
  
  if (startIdx === -1) {
    startPhrase = "const runExportElementPng = async (id, title, options = {}) => {";
    startIdx = content.indexOf(startPhrase);
    if (startIdx !== -1) {
      isCardStats = true;
    }
  }

  if (startIdx === -1) {
    console.error(`Not found in ${filePath}`);
    return;
  }
  
  let braceCount = 0;
  let endIdx = -1;
  let started = false;
  
  for (let i = startIdx; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
      started = true;
    } else if (content[i] === '}') {
      braceCount--;
    }
    
    if (started && braceCount === 0) {
      if (content.substr(i + 1, 1) === ';') {
        endIdx = i + 1;
      } else {
        endIdx = i;
      }
      break;
    }
  }
  
  if (endIdx === -1) {
    console.error(`Could not find end of exportElementPng in ${filePath}`);
    return;
  }
  
  const newFunction = `const ${isCardStats ? 'runExportElementPng' : 'exportElementPng'} = async (${isCardStats ? 'id' : 'targetEl'}, title, options = {}) => {
  ${isCardStats ? "const targetEl = typeof id === 'string' ? document.getElementById(id) : id;\n  if (!targetEl) return setScreenshotModalState({ state: 'error', title: '错误', message: '找不到元素' });\n" : ""}
  const exportLabel = String(options?.taskLabel || title || '当前模块');
  const exportStartAt = performance.now();
  const formatElapsed = () => \`\${Math.max(0, Math.round(performance.now() - exportStartAt))}ms\`;
  
  setScreenshotModalState({
    state: 'capturing',
    title: '截图中',
    message: '[初始化] 正在准备使用 html-to-image 捕获 ' + exportLabel,
    cancelTask: () => {}
  });

  let canvas = null;
  try {
    await new Promise(r => setTimeout(r, 600));

    setScreenshotModalState({
      state: 'capturing',
      title: '截图中',
      message: '[渲染中] ' + exportLabel + '，在旧设备上可能需要较长时间...',
      cancelTask: () => {}
    });

    canvas = await toCanvas(targetEl, {
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

    if (!canvas) {
      throw new Error('html-to-image returned null canvas');
    }

    setScreenshotModalState({
      state: 'exporting',
      title: '导出图片',
      message: '[编码中] 正在生成 PNG 文件...',
      cancelTask: () => {}
    });

    // Helper functions from the component
    const safeTitle = typeof sanitizeExportFileName === 'function' 
      ? sanitizeExportFileName(\`\${title}_\${Date.now()}\`) 
      : \`\${title}_\${Date.now()}\`;

    if (typeof triggerDownloadPng === 'function') {
      await triggerDownloadPng(canvas, safeTitle);
    } else {
      // Fallback
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
    console.error('html-to-image 截图失败:', error);
    setScreenshotModalState({
      state: 'failed',
      title: '截图失败',
      message: '[失败] html-to-image 导出发生错误: ' + error.message,
      retryTask: typeof options?.retryTask === 'function' ? options.retryTask : null,
      cancelTask: null
    });
  }
};`;

  content = content.substring(0, startIdx) + newFunction + content.substring(endIdx + 1);

  fs.writeFileSync(filePath, content, 'utf8');
}

replaceExportFunction(path.resolve('src/components/SongStats.vue'));
replaceExportFunction(path.resolve('src/components/CardStats.vue'));
