import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const buildId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
const releaseNotes = [
  '现在优化了各页面png截图导出的功能！应该不会出现导出卡住的问题了吧（？），如果还有问题请务必反馈！',
  '活动页面可以查看卡面与曲绘了！',
  '乐曲检索功能支持罗马音/假名搜索。',
  '优化了UI细节（其实还是在干这个）。'

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
