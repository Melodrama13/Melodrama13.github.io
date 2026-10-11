# 代码结构与命名约定

页面负责组合功能模块。提取职责时保留现有功能、交互、公共数据和存储格式；不按文件行数强行切分同一流程。

## 模块职责

| 位置 | 职责 | 当前模块 |
| --- | --- | --- |
| `src/domain/` | 不依赖 Vue、DOM、fetch 或 storage 的业务规则 | `gameAttributes` 合法属性映射、`songPairVocalIndex` 音源角色索引 |
| `src/services/publicData/` | 公共 JSON、版本缓存和离线回退 | `createPublicDataRepository` |
| `src/services/predictionStorage/` | 预测数据源存储和旧格式迁移 | `createPredictionSourceStorage` |
| `src/services/capture/` | 截图库按需加载、元素状态、资产等待、样式上下文、取消和顺序渲染编排 | `captureEngineLoader`、`captureElementState`、`captureAssetReadiness`、`captureStyleContext`、`captureTaskControl`、`captureRenderAttempts` |
| `src/features/app-shell/` | 应用导航、数据加载、版本提示、预测数据源及文件操作 | `useAppTabGestures`、`useAppResourceLoading`、`useAppVersionUpdates`、`useAppPredictionSources`、`AppSourceMenuContents` |
| `src/features/prediction/` | 编辑器草稿与规则、预测源状态、特殊预测画布和导出 | `usePredictionEditorInitialization`、`usePredictionRosterRules`、`useSpecialCaseRows`、`SpecialPredictionSingleCanvas`、`SpecialPredictionMultiCanvas` |
| `src/features/song-stats/` | 乐曲目录、搜索、各统计模型、导航和导出 | `useSongSearch`、`useSongMvStats`、`ocCommissionedSongStats`、`vsCommissionedSongStats`、对应 `Oc`／`Vs` 面板 |
| `src/features/card-stats/` | 角色统计、属性矩阵、期数索引和展示 | `cardCharacterStats`、`characterCardAttributeMatrixRows`、`affiliatedVsCardAttributeMatrixRows`、`cardPeriodIndex`、`NuigurumiStatsPanel` |
| `src/features/event-history/` | 活动行、筛选、预览、导航、编辑器加载及导出 | `useHistoryRows`、`useHistoryProgressiveRender`、`useHistoryEditorLoading`、`useHistoryCapture`、`HistoryEventRowContent` |
| `src/components/` 与 `src/App.vue` | 组合功能模块、连接 props／事件及必要的跨功能接口 | 六个页面入口，具体职责见下表 |
| `src/ui/`、`src/composables/`、`src/styles/` | 既有共享控件、材质、断点、导航和保位机制 | 参见 UI 与导航规范 |

页面拥有的状态继续由页面管理。展示组件接收响应式 props，同步发出原生事件或明确的业务参数。DOM 注册函数接收 `HTMLElement` 或 `null`；不要把页面原来的元素 ref 换成组件实例。公共数据继续以 `shallowRef` 保存整份快照。预测源 composable 每次调用创建独立状态。`useReleasedSongCatalog` 管理乐曲发布与规范化计算；页面实例的 `computed` 管理模型依赖和索引失效，不把响应式状态放进纯模型或全局缓存。索引保留源对象引用和顺序，返回的索引集合及缓存数组供调用方只读使用，不能原地排序、追加或删除。

| 页面入口 | 功能所有者 | 视图所有者 |
| --- | --- | --- |
| `App.vue` | `useApp*`：页面切换、手势、公共数据、版本、数据源、预测合并和文件操作 | `App*`：导航、数据源菜单、状态和版本弹窗 |
| `CardStats.vue` | `useCard*`：统计、属性矩阵、节日、记录、配队、导航和捕获 | `Card*`、`VsCard*` 及角色／分团 VS 属性矩阵面板 |
| `EventHistory.vue` | `useHistory*`：排序、筛选、行模型、预览、预测、媒体、渐进渲染和捕获 | `History*`、`EventHistoryFilterToolbar` |
| `SongStats.vue` | `useSong*`：目录、角色、书下、MV、CP、搜索、阅读位置和捕获 | `Song*`、对称的 `OcCommissionedSongStatsPanel`／`VsCommissionedSongStatsPanel` |
| `PredictEditor.vue` | `usePrediction*`：草稿、规则同步、初始化、抽屉及保存操作 | `PredictionEditorHeader`、`PredictionEditorRoster`、`PredictionEditorCharacterPool`、`PredictionEditorFooter` |
| `SpecialPredictGenerator.vue` | `useSpecial*`：数据源、分支、外观、文字、备注、字体、撤销、画布和捕获 | `SpecialPrediction*` 控件与单／多分支画布，卡片图层归 `SpecialPredictionCardCell` |

每个 controller 调用创建自己的状态。页面通过具名 getter 连接相邻功能，保持响应式读取和原初始化顺序；视图持有实际的 ref／computed，不能把可变值展开成一次性快照。watch 和生命周期在依赖连接后按原次序注册。增加功能应放进有明确职责的所有者，不能把整个页面搬进一个通用 composable，或用万能 scope Proxy 隐藏依赖。

共同编排和页面业务政策分别保留清晰职责。OC／VS 的资格和排序、普通角色矩阵与分团 VS 矩阵的行结构、活动页与卡片页的当前活动规则继续按各自合同处理。`runCaptureRenderAttempts` 只负责顺序尝试、结果和错误传递；同步准备位于渲染异常处理之外，预算、DPR、渲染任务管理和恢复仍由页面提供。Card 的超时释放和 Song 的等待收尾政策不能因复用而统一。

## 文件与名称

Vue 组件使用 PascalCase，文件名与组件名相同；JavaScript 与 CSS 文件使用 camelCase；功能目录使用 kebab-case。composable 使用 `use` 加职责名称，动作函数采用明确的动词和宾语，例如 `loadPublicData`、`persistPredictionSources`。稳定常量使用 UPPER_SNAKE_CASE。

同类模块保持相同词汇、词序和后缀。书下曲固定使用 `CommissionedSong`，原创角色和虚拟歌手分别使用 `Oc`／`Vs`；UI 文案仍显示 OC／VS。实际分组名称保持差异：OC 按 `Unit`，VS 按 `Singer`。

| 职责 | OC | VS |
| --- | --- | --- |
| 统计纯模型 | `ocCommissionedSongStats.js` | `vsCommissionedSongStats.js` |
| 统计面板 | `OcCommissionedSongStatsPanel.vue` | `VsCommissionedSongStatsPanel.vue` |
| 基础样式 | `ocCommissionedSongStatsFoundation.css` | `vsCommissionedSongStatsFoundation.css` |
| 内容样式 | `ocCommissionedSongStatsContent.css` | `vsCommissionedSongStatsContent.css` |
| 响应式样式 | `ocCommissionedSongStatsResponsive.css` | `vsCommissionedSongStatsResponsive.css` |
| 紧凑响应式样式 | `ocCommissionedSongStatsCompactResponsive.css` | `vsCommissionedSongStatsCompactResponsive.css` |

变量写明实体、用途和单位，例如 `predictionSources`、`activePredictionSourceId`、`panelElement`、`timeoutMs`。布尔值使用 `is`／`has`／`can`／`should`，或明确的复数判断 `areCharacterNamesHidden`。集合索引采用 `By` 加分组键。新增功能 class 采用清晰的 kebab-case 前缀，例如 `song-search__filters`；状态类采用 `.is-open` 等现有语义。避免 `common2`、`helper-new` 和含义不明的缩写。

既有未迁移代码保留原名称。JSON 字段、storage key、DOM ID、导航锚点、导出格式与已有公共 API 属于兼容接口，不能随内部更名批量替换。

## 样式所有权

完整规则见 [UI 开发规范](ui-system.md)。功能样式位于对应 `features/<功能>/styles/`，通过原位置的 `<style scoped src="...">` 编译；全局样式顺序、变量继承、选择器优先级及响应式断点保持原合同。

拆出组件时只携带其真实使用的规则。检查静态和动态 class、祖先选择器、伪类、坏图、加载态及导出克隆；不要向每个子组件复制整页 CSS。原页面继续拥有未迁移区块、导航和弹窗样式。分组、间距、圆角和材质的既有差异不能因为复用而被统一。

`data-feature-view` 标明具体视图，`data-feature-page` 标明样式所属页面。页面样式保留原 scoped 规则，并通过 `:global([data-feature-page="cards"] …)` 等明确的功能边界匹配拆出的原生元素；边界属性承担原父 scope 的选择器权重。共享导航规则只列出实际消费页面。不得使用无页面限定的全局按钮或表格规则。伪元素写在 `:is()`／`:where()` 外面，例如 `:is(.lim-tag)::before`。

单独导出嵌套内容时，`copyCaptureFeatureBoundary` 将原元素所属页面的标记保留到克隆根节点，继续应用相同规则；不复制或硬编码 Vue scope ID。截图引擎由 `captureEngineLoader` 在首次调用时加载，共享库代码，任务状态和恢复仍归各页面。取消后的旧 Card 任务不能重新打开弹窗或改写新任务的状态。

预测编辑器和截图库使用 `createRetryableModuleImporter` 处理真实下载失败。浏览器可能缓存失败的模块请求，用户重试时通过构建产物的实际 URL 重新请求；失败的样式下载先恢复，成功后清理原失败链接并保留已恢复的样式。构建插件 `scripts/lazyModuleRecoveryPlugin.js` 只提供 chunk URL，不提前执行编辑器或截图库。Card 导出入口向失败弹窗提供原任务的重试回调，页面继续拥有截图预算、质量、取消和清理。

## 迁移与验证

每次迁移一个明确职责，结构移动、行为修正和样式更名分别提交。验证同一输入下的统计、DOM、计算样式、交互、存储、KeepAlive、阅读位置及实际 PNG；相关浏览器检查覆盖 Chromium 和 WebKit。构建与 `check:ui` 通过后再提交。

删除实现前检查脚本、模板、动态引用、`defineExpose`、DOM 查询、导出和本地同步脚本。测试和执行证据遵循仓库已有忽略规则保存在本地；验证范围和既有失败要明确记录。
