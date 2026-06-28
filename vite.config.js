import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'node:child_process'

const buildId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
const codeReleaseNotes = [
  '修复了部分bug。',
  '优化了UI细节。'

]
const resourceReleaseNotes = ['更新资源']

const getCurrentCommitChangedFiles = () => {
  try {
    return execSync('git diff-tree --root --no-commit-id --name-only -r -m HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .split(/\r?\n/)
      .map((file) => file.trim().replace(/\\/g, '/'))
      .filter(Boolean)
  } catch {
    return []
  }
}

const getCurrentCommitSubject = () => {
  try {
    return execSync('git log -1 --pretty=%s', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
  } catch {
    return ''
  }
}

const NON_RESOURCE_JSON_FILES = new Set([
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json'
])

const isJsonResourceOnlyBuild = (files) => (
  files.length > 0
  && files.every((file) => file.endsWith('.json'))
  && files.every((file) => !NON_RESOURCE_JSON_FILES.has(file) && !file.startsWith('.'))
)

const changedFiles = getCurrentCommitChangedFiles()
const commitSubject = getCurrentCommitSubject()
const updateKind = isJsonResourceOnlyBuild(changedFiles) || commitSubject === 'chore: sync external game data'
  ? 'resource'
  : 'code'
const releaseNotes = updateKind === 'resource' ? resourceReleaseNotes : codeReleaseNotes

const versionManifestPlugin = () => ({
  name: 'pjsk-version-manifest',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ buildId, generatedAt: new Date().toISOString(), updateKind, releaseNotes }, null, 2)
    })
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), versionManifestPlugin()],
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
    __APP_RELEASE_NOTES__: JSON.stringify(releaseNotes),
    __APP_UPDATE_KIND__: JSON.stringify(updateKind)
  }
})
