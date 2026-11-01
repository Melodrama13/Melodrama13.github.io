# 公开开发脚本

此目录随公开仓库发布。

| 文件 | 作用 |
| --- | --- |
| `check-ui-policy.js` | 检查 UI 样式、动效和材质是否符合项目规范；运行 `npm run check:ui` |
| `check-prediction-order.js` | 检查活动资料与开发者预测顺序表的完整性；运行 `npm run check:prediction-order`，也会在 `npm run build` 前自动运行 |
| `lazyModuleRecoveryPlugin.js` | Vite 构建插件，提供延迟加载模块的实际产物地址，供页面在加载失败后重试 |

顺序检查只读取文件，发现缺行、重复 ID、重复标识或特殊活动类型不一致时以失败状态退出。它不改活动资料、顺序表或用户预测。检查数据副本时可使用 `--events-file` 与 `--order-file`；未指定后者时读取活动文件同目录的 `pjsk_prediction_order.json`。

数据抓取、活动/卡片/歌曲/WL 篇章同步及图片同步脚本只在 `Melodrama13/pjsk-planner-sync-private` 私有仓库的 `scripts/` 维护。此公开目录不提供同步实现或本机辅助入口。

本地从网站根目录直接执行同级私有仓库的脚本，例如 `node ../pjsk-planner-sync-private/scripts/sync-cards-other-source.mjs --dry-run`。本机可选辅助工具放在忽略目录，不需要提交或改写 `package.json`。

GitHub 自动同步保持原流程：将私有仓库检出到临时目录 `.sync-private/`，再把其中 `scripts/*.mjs` 安装到本站的 `sync-scripts/`，使用原有 npm 同步命令执行。脚本始终以网站为工作目录，共用模块也从网站 `src/` 导入。生产脚本新增、修改及提交只在私有仓库进行。
