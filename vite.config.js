import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const buildId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
const releaseNotes = [
  '现在支持点击角色头像查看角色缩略卡面啦！',
  '活动页面也可以查看曲绘了！',
  '乐曲检索功能新增了罗马音/假名搜索。',
  '新增了若干乐曲相关统计，如2D/3DMV统计。',
  '优化了UI细节（其实主要在干这个），优化了曲绘展示。'

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
