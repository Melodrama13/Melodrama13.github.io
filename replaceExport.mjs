import fs from 'fs';
import path from 'path';

function replaceExportFunction(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Replace html2canvas import
  content = content.replace(/import html2canvas from 'html2canvas';/g, "import { toCanvas } from 'html-to-image';");

  // 2. We need to replace the entire `const exportElementPng = async (targetEl, title, options = {}) => { ... };` block
  // Since it's huge, let's find the boundaries.
  const startPhrase = "const exportElementPng = async (targetEl, title, options = {}) => {";
  const startIdx = content.indexOf(startPhrase);
  if (startIdx === -1) {
    console.error(`Not found in ${filePath}`);
    return;
  }
  
  // We need to find the matching closing `};`
  // We can do this by counting braces.
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
  
  console.log(`Replacing block from ${startIdx} to ${endIdx} in ${filePath}`);
  
  const newFunction = `const exportElementPng = async (targetEl, title, options = {}) => {
  const exportLabel = String(options?.taskLabel || title || '当前模块');
  setScreenshotModalState({
    state: 'capturing',
    title: '截图中',
    message: '[初始化] 正在准备使用 html-to-image 捕获 ' + exportLabel,
    cancelTask: () => {}
  });

  try {
    // 短暂等待，确保重绘
    await new Promise(r => setTimeout(r, 600));

    // 使用 html-to-image 直接转换 SVG 为 Canvas
    // 这里使用 targetEl 本身，不需要克隆
    setScreenshotModalState({
      state: 'capturing',
      title: '截图中',
      message: '[渲染中] ' + exportLabel + '，在旧设备上可能需要较长时间...',
      cancelTask: () => {}
    });

    const canvas = await toCanvas(targetEl, {
      backgroundColor: '#ffffff',
      pixelRatio: window.devicePixelRatio && window.devicePixelRatio > 1 ? window.devicePixelRatio : 2,
      skipFonts: false, // 允许加载字体
      filter: (node) => {
        // 过滤掉我们不想要出现在截图里的 UI 按钮
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

    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        try {
          if (!blob) throw new Error('toBlob failed');
          
          if (window.showSaveFilePicker && !isMobile()) {
            try {
              const handle = await window.showSaveFilePicker({
                suggestedName: \`PJSK\${exportLabel}.png\`,
                types: [{
                  description: 'PNG Image',
                  accept: { 'image/png': ['.png'] }
                }]
              });
              const writable = await handle.createWritable();
              await writable.write(blob);
              await writable.close();
            } catch (fsErr) {
              if (fsErr.name !== 'AbortError') throw fsErr;
            }
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`PJSK\${exportLabel}.png\`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
          
          setScreenshotModalState({
            state: 'done',
            title: '导出成功',
            message: '图片已保存成功！',
            cancelTask: null
          });
          setTimeout(() => {
            if (screenshotModalState.value.state === 'done') {
              setScreenshotModalState({ state: 'idle', title: '', message: '', cancelTask: null });
            }
          }, 1500);
          resolve(true);
        } catch (err) {
          reject(err);
        }
      }, 'image/png');
    });

  } catch (error) {
    console.error('html-to-image 截图失败:', error);
    setScreenshotModalState({
      state: 'error',
      title: '截图失败',
      message: '[失败] html-to-image 导出发生错误: ' + error.message,
      cancelTask: null
    });
    // 3秒后关闭错误弹窗
    setTimeout(() => {
      setScreenshotModalState({ state: 'idle', title: '', message: '', cancelTask: null });
    }, 3000);
    return false;
  }
};`;

  content = content.substring(0, startIdx) + newFunction + content.substring(endIdx + 1);

  // 还有其他的诊断函数如 getRenderDiagnosticPlan, applyCaptureProbeInClonedDoc 等不调用也没关系, 因为去掉了。
  // But to keep file clean, we can just leave them or let Vue shake them out.
  // wait, toCanvas replaces the whole block including canvas.toBlob logic.
  // Wait, isMobile() might not be defined? 
  // Let me replace `!isMobile()` with `!navigator.userAgent.match(/Mobile|Android|iP(ad|hone|od)/i)`
  content = content.replace(/!isMobile\(\)/g, "!(navigator.userAgent.match(/Mobile|Android|iP(ad|hone|od)/i))");

  fs.writeFileSync(filePath, content, 'utf8');
}

replaceExportFunction(path.resolve('src/components/SongStats.vue'));
replaceExportFunction(path.resolve('src/components/CardStats.vue'));
