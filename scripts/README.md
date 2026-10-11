# 公开开发脚本

此目录随公开仓库发布。

| 文件 | 作用 |
| --- | --- |
| `check-ui-policy.js` | 检查 UI 样式、动效和材质是否符合项目规范；运行 `npm run check:ui` |
| `check-prediction-order.js` | 检查活动资料与开发者预测顺序表的完整性；运行 `npm run check:prediction-order`，也会在 `npm run build` 前自动运行 |
| `lazyModuleRecoveryPlugin.js` | Vite 构建插件，提供延迟加载模块的实际产物地址，供页面在加载失败后重试 |

顺序检查只读取文件，发现缺行、重复 ID、重复标识或特殊活动类型不一致时以失败状态退出。它不改活动资料、顺序表或用户预测。检查数据副本时可使用 `--events-file` 与 `--order-file`；未指定后者时读取活动文件同目录的 `pjsk_prediction_order.json`。

数据抓取、活动/卡片/歌曲同步及图片同步脚本放在同级的 `sync-scripts/`。该目录由 Git 忽略，脚本在 `Melodrama13/pjsk-planner-sync-private` 私有仓库维护；本地通过项目根目录的 `npm run sync:*` 或 `npm run fetch:other-source` 使用。

GitHub 自动同步会将私有仓库检出到临时目录 `.sync-private/`，再把其中 `scripts/*.mjs` 安装到本站的 `sync-scripts/`。
