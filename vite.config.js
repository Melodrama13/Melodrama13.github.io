import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const buildId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
const releaseNotes = [
  'anvo导出截图时自动铺平显示。',
  '现在进行预测时可以实时查看当前预测对于统计数据的影响。',
  '优化了卡片/歌曲详情悬浮窗的显示逻辑。',
  '增加了3DMV/2DMV以及愚人节歌曲的详情显示。',
  '修复了部分bug。',
  '优化了UI细节。'

]

const versionManifestPlugin = () => ({
  name: 'pjsk-version-manifest',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ buildId, generatedAt: new Date().toISOString(), releaseNotes }, null, 2)
    })
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), versionManifestPlugin()],
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
    __APP_RELEASE_NOTES__: JSON.stringify(releaseNotes)
  }
})
