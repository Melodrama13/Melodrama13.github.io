# UI 系统开发规范

这份规范是维护者修改 PJSK Planner UI 时的代码级约束。实现以 `src/styles/tokens.css`、`src/styles/primitives.css`、`src/styles/motion.css`、`src/ui/breakpoints.js`、共享 scoped CSS 片段和 `scripts/check-ui-policy.js` 为准；文档只记录当前已经实现的结构。

## 1. 范围与保真原则

- 只有声明和值都完全相同的重复项才可以抽成 token 或共享片段。颜色、间距、阴影、圆角或尺寸只要有差异，就留在原组件；例如 Card Stats 面板圆角 `28px` 与 Song Stats 面板圆角 `18px` 不能合并。
- 纯代码整理保持字体、间距、尺寸、颜色、材质、DOM 和功能行为。经过明确授权的 UI 规范化可以调整视觉规则；必须说明范围、同步本规范，并验证观感与功能。本次第三轮的变更范围见第 4.2 节。
- 初次 UI 规范化阶段的视觉/响应式变化仅限断点规范化：Card Stats 两处原 `760px` 的紧凑规则统一到 `768px`；与 CSS 紧凑/导出边界对应的运行时判断采用包含边界值的语义。本轮经确认将原 `1200/1201px` 的屏幕和组件宽度规则迁移到 `1280/1281px`，运行时 tablet 分界同步改为 `1280px`；顶栏与活动筛选操作栏也统一到此分界。后续经单独确认的手机端底部悬浮导航、活动页数据源入口，以及 Predict Editor 随侧拉/底部布局切换材质、移除装饰性青绿色底色并校准桌面折射，均属于各自独立的功能变更，不放宽其他组件的保真约束。
- 现有胶囊控件的 `border-radius: 999px` 是 UI 合同的一部分。已有控件的按下反馈（变暗/缩放）以及释放后的恢复也属于合同；修改时必须保留 `:active` 与释放后的原有行为。
- 不因为本规范而引入新的主题、组件包装、字体、图标或布局系统。

## 2. 加载顺序

`src/main.js` 的全局样式顺序固定为：

```text
src/styles/tokens.css → src/style.css → src/styles/liquid-glass.css → src/styles/primitives.css → src/styles/motion.css → src/styles/appearance.css
```

`tokens.css` 只提供 `:root` 下的 `--ui-*` 值，必须先加载，供基础样式、全局 primitive 和 SFC 样式解析。`style.css` 保留应用级基础规则。`primitives.css` 必须继续由 `src/main.js` 以全局 import 加载，并位于基础规则之后，以维持现有的 base-before-primitive cascade 顺序：通用 checkbox、pill、table 和 circle 规则在相同 selector 下继续拥有原来的后置优先级。禁止把 primitives 改成局部或 SFC import，也不要用新的 Vue wrapper 改变 DOM 或 specificity。

## 3. Token 分层

| 层级 | 当前 token | 使用边界 | 兼容 alias |
| --- | --- | --- | --- |
| Shell glass | `--ui-shell-glass-*`、`--ui-shell-active-*` | 顶部 shell 与 Event History 共用的玻璃背景、边框、阴影和 active 状态 | App 的 `.nav-tabs` 保留 `--top-*`；Event History 保留 `--history-*` |
| Stats navigation | `--ui-stats-nav-*`、`--ui-stats-control-radius` | Card Stats 与 Song Stats 统计导航的尺寸、玻璃材质、控件状态和 active 状态 | `.pjsk-stats`、`.pjsk-song-stats` 继续使用 `--stats-nav-*`、`--stats-radius-btn` 等 `--stats-*` |
| Neutral global controls | `--ui-control-bg`、`--ui-control-bg-hover`、`--ui-control-border`、`--ui-control-border-hover`、`--ui-control-label`、`--ui-control-label-muted`、`--ui-control-radius-pill`、`--ui-control-disabled-opacity`、`--ui-control-press-scale`、`--ui-control-focus-*` | `src/styles/primitives.css` 的既有通用控件及其交互状态 | selector 和局部覆盖仍由各自原位置负责 |
| Motion | `--ui-motion-duration-*`、`--ui-motion-ease-*`、`--ui-motion-{角色}`、加载动画 token | 控件、浮层、导航和抽屉共用的动效标准，见第 10 节 | `--ui-motion-control` 指向 state；`--ui-control-press-scale` 指向统一按压比例 |

兼容 alias 必须留在消费组件的 root selector 中，而不是把消费者批量改名。例如当前代码仍是以下映射：

```css
.nav-tabs {
  --top-glass-bg: var(--ui-shell-glass-bg);
}

.event-history-wrapper {
  --history-glass-bg: var(--ui-shell-glass-bg);
}

.pjsk-stats,
.pjsk-song-stats {
  --stats-nav-width: var(--ui-stats-nav-width);
  --stats-radius-btn: var(--ui-stats-control-radius);
}
```

这样既保留现有 consumer 名称，也保留组件继承边界和 Teleport/fallback 行为；新增 token 不等于删除这些 alias。

## 3.1 浅色与深色外观

本轮经单独授权加入浅色、深色与跟随系统三种外观选项，默认跟随系统，保留已保存的手动选择。外观状态由应用设置持有，样式只消费 `html[data-theme="light"|"dark"]` 的最终结果；`appearance.css` 不再自行用系统媒体查询决定主题。浅色沿用原有规则，深色覆盖集中放在加载链末尾，不改变现有几何、断点、字体、按压与折射行为。

后续 UI 设计与修改必须同时考虑深、浅两种外观，并分别查看实际页面验收；不得只修正其中一侧。检查范围包括嵌套面板／渐变背景、文字与图标对比、浮层玻璃透明度和导出结果。活动页卡面详情悬浮层两种外观共用 145°、48%／38% 的渐变透明度，保留各自明暗色彩；不额外叠加不透明底色或改变现有滤镜。

深色的 `--ui-appearance-*` 变量负责正文、次要文字、表面、填充、边界与可读的中性强调；已有 `--ui-control-*`、`--ui-glass-*`、shell 和统计导航变量按同一入口切换。历史 feature 样式的硬编码中性色使用显式 selector 覆盖，不能用整页反色或图片滤镜代替主题。特定黑色 UI 图标允许单独调整明度；卡面、曲绘、头像和属性图标保持原样。团体 Logo 保留透明背景和品牌色，细字标用浅灰边缘光晕增加辨识，单色 VS 字标使用浅色墨迹，不添加矩形白色衬底；这些处理不作用于用户预测画布内的 Logo。

角色、团体、属性和统计分类继续使用现有色相。原有半透明代表色自然叠加在深色表面上；原有实色浅填充的矩阵、配队与乐曲统计卡使用局部深色遮色层，保留数据色，正文保持足够对比。预测编辑器的 `--pe-*` 和数据源 `--source-*` 兼容 alias 仍限定在各自 consumer，不能提升到全局。

外观入口覆盖整个 document，包含 Teleport 面板及附加到 `body` 的导出克隆。`.export-clone-root` 和 `.song-export-clone-root` 在深色使用与正文一致的深色底，覆盖透明内容导出时的旧白色回退；不得只更换文字颜色而留下浅色画布。Special Predict 画布的用户配色与真实图片不跟随界面主题。修改深色规则时同时核对原生表单、表格、设置／数据源、预测编辑器、Chromium 折射、WebKit frost 与实际 PNG 输出。

## 4. 全局与局部边界

`src/styles/primitives.css` 只承载四个已经全局化的 primitive selector family：

1. `.pjsk-ui-checkbox` 及其 checkbox input；
2. `.pjsk-ui-btn-pill` 及其 hover、active、disabled 和 `.btn-icon` 规则；
3. `.pjsk-table` 及其 `th`、`td` 规则；
4. `.pjsk-ui-btn-circle` 及其 hover、active、disabled 规则。

这些控件的外观、`focus-visible` 和禁用规则由 primitive 层维护；动态反馈和减少动态效果由后置的 `motion.css` 维护，不需要新增控件 wrapper。

原生控件使用职责明确的交互 family：按钮 `pjsk-ui-action`，单行输入与 select `pjsk-ui-field`，多行输入 `pjsk-ui-textarea`，checkbox/radio `pjsk-ui-choice`，颜色输入 `pjsk-ui-swatch`，滑杆 `pjsk-ui-range`。feature 样式继续决定宽高、间距、字体与玻璃材质；family 统一胶囊输入框、键盘焦点、按下变暗、禁用和减少动态效果，避免让紧凑统计控件与编辑器使用同一尺寸。

键盘焦点使用 2px 深绿色 outline，offset 为 2px，不改变布局。禁用保留原生 HTML disabled 行为并使用统一透明度；按钮按下变暗后恢复；减少动态效果时所有 family 过渡关闭。`aria-invalid="true"` 提供错误边框，`aria-busy="true"` 提供等待指针；选中态继续由业务状态驱动，并在适用处使用 `aria-pressed` / `aria-checked`。可编辑画布文字、PNG 内容和文件上传的原生功能不套用表单背景规则。

输入框必须有 label 或 aria-label；错误文字使用关联说明与 alert，导出反馈使用 status。不得通过新增 ARIA menu 角色替代真实的键盘交互。App 的旧 scoped cascade 只跨入 `data-feature-view^="app-"` 边界，避免通用按钮规则改变统计页分页按钮。

其余值仍属于组件局部。特别是以下兼容 alias、功能/数据变量和导出运行时覆盖都不得提升到 `:root`：

- App 顶栏的 `--top-*`、数据源/加载器相关的 `--source-*`、`--loader-*` 和 `--app-icon-filter`；
- Event History 的 `--history-*`、`--eh-*`、`--event-*`、`--member-*`、`--preview-*`、`--record-*`、`--daily-*`、属性/单位颜色与事件几何变量；
- Card Stats 的 `--stats-*`（包括 Card 专有的 `--stats-radius-panel: 28px`）、`--matrix-*`、`--lineup-*`、`--festival-*`、`--fes-*`、`--duo-*`、`--special-limited-*`、`--rel-*` 以及卡片/矩阵/单位/属性数据颜色和几何变量；
- Song Stats 的 `--stats-radius-panel: 18px`、`--song-*` 和 Anvo 填充几何变量；Predict Editor 的 `--pe-*`；Special Predict 画布和工具栏的 `--special-*`。

导出代码也保持局部：克隆节点复制或临时覆盖根节点 custom properties（例如 Song Stats 导出 clone 对 `--stats-radius-btn` 的保留）以及克隆节点的尺寸、背景、位置、动画清理，不能抽成 global token。Event History 的拖拽/定位值 `--preview-config-top` 同样只属于对应 wrapper。只有在值被证明为跨功能 exact duplicate 后，才可以提出新的 `--ui-*` token。

## 4.1 Liquid Glass 所有权与降级

Liquid Glass 的路径固定为：`tokens.css` 中的 `--ui-glass-*` token → `src/styles/liquid-glass.css` 的统一材质 class → `src/ui/liquidGlass.js` 插件 → App 内唯一的 `LiquidGlassFilters` SVG host → 获准的 consumer。`src/main.js` 必须在基础样式之后、primitive 之前导入该样式，并在 mount 前安装 `liquidGlassPlugin`；不要在 SFC 中复制滤镜、环境探测或生命周期代码。

| 层级 | class / runtime | 获准 consumer 与限制 |
| --- | --- | --- |
| Refractive | `.ui-liquid-glass.ui-liquid-glass--refractive` + `v-liquid-glass` | 背后内容较安静、可优先展示透射时使用：桌面顶栏背景及其三页切换轨道/滑块、截止活动 ID 外框、数据源按键、预测数量与清理提示胶囊、Predict Editor 的右侧抽屉（`>900px`）、手机端底部 `.mobile-tab-glider` 与活动页 `.mobile-source-trigger`，以及直达顶部 `.floating-top-btn`。插件为每个已连接表面生成或复用 SVG 边缘位移滤镜；桌面编辑器使用更薄的中性遮色和受限的内部位移，不新增材质等级。 |
| Prominent | `.ui-liquid-glass.ui-liquid-glass--prominent`；主要外层使用 `v-liquid-glass`，重复悬浮窗仅使用 CSS | 背后有滚动内容或密集文字、需要更稳定的可读性时使用：Predict Editor 的底部抽屉（`≤900px`）、Card/Song Stats 的 `.stats-nav` 与紧凑态 `.floating-menu-btn`、Event History 的 `.filter-bar` / `.filter-panel`、App 的 `.source-menu`，以及预测编辑时的悬浮统计配置窗与最多 6 个统计窗。悬浮统计不为每个窗新增 SVG 滤镜。内部 group/control/input/option 使用语义 token，不能追加子级折射。 |
| Regular | `.ui-liquid-glass.ui-liquid-glass--regular` + `v-liquid-glass` | 介于透射与强调之间的普通悬浮表面；目前用于 Special Predict toolbar，不因视口宽度单独改变材质。 |
| Modal | `.ui-liquid-glass.ui-liquid-glass--modal`，CSS-only readable frost | App 更新/导出状态弹窗和 Event History 的未保存预测切换弹窗。遮罩与对话框语义仍保持 local。 |
| Chip | `.ui-liquid-glass.ui-liquid-glass--chip`，CSS-only | 小型、重复的 pill/chip；活动详情／查先例／本期纪录面板内部的筛选控件、配置卡片、纪录卡、评级与依据标签，以及活动概览、卡片、WL 篇章、复刻和歌唱版本信息块；不得挂 directive。 |

活动详情、查先例与本期纪录内部沿用 Chip 的边缘高光与内阴影，共用局部的淡色透光填充；代表色、难度色、金银铜评级和选中状态由各功能 selector 保留，不覆盖全局材质参数、不追加子级折射。原生查询字段由独立外框承载高光，select 使用透明外观与不拦截点击的箭头图标，保留原生弹出和键盘操作，避免 WebKit 忽略原生 select 的阴影。活动选择器仅在输入外框与下拉菜单使用材质，外层定位容器不建立额外隔离层，菜单保留实色底以确保密集文字可读。高对比度或减少透明度时，三页内的彩色胶囊文字同步回退到深色，避免全局实色背景降级后留下白色文字。

顶栏与活动信息三页切换共用 `UiGlassTabs.vue`，位置测量、拖动跨页和按压反馈由 `useGlassTabGestures.js`／`useGlassTabFeedback.js` 按实例持有；底部导航继续通过同一手势模块工作。滑块静止时只保留选中阴影，按下时居中放大，移动时显现玻璃。活动面板采用 `contained` 模式：沿用同款轨道和滑块，但不激活内部 directive，也不增加子级 backdrop filter；由已有 Prominent 外层提供折射，避免叠加 SVG 取样把轨道画成灰色。活动详情的难度胶囊仅以原难度色的 10% 淡填充与细边框表达分类，文字使用同色系深色；歌曲页的原有难度配色保持不变。

活动信息的切换栏采用独立紧凑尺寸：默认整体高 30px，小屏高 32px、宽度不超过 280px 并居中，标题栏同步收紧留白；顶栏和底部导航保持各自原尺寸。

详情活动概览使用 14% 代表色填充；箱／混活分类胶囊使用 22% 淡色填充、深色文字与细彩边：箱活、总集篇和 WL1／WL2 延用团体色，混活及 WL3 延用原三色渐变并逐色淡化。总集篇标签在宽窄屏均显示“总集篇 · 团体缩写”；WL 各篇章行使用角色代表色的 18% 填充。此样式通过 `getEditorSeriesStyle(event, { glass: true })` 明确启用，活动列表与预测编辑器的原配色保持不变。

这五项是视觉材质等级，不是浏览器运行模式。运行模式另分 Chromium 的 SVG `refractive`、WebKit 等引擎的 CSS `frosted`、辅助功能要求下的 `opaque`；同一材质等级在三种运行模式下都有对应呈现。选材依据是玻璃背后的内容密度和前景可读性，不是设备名称本身。Predict Editor 恰好以 `900px` 切换侧拉与底部布局，因此只在外层抽屉随布局切换 Refractive / Prominent；桌面侧拉的透射和位移参数在共享 token 中独立配置，底部抽屉仍沿用 Prominent。桌面与手机端编辑器、活动筛选栏／面板、卡片及乐曲统计导航、悬浮统计窗共用强化的 optical rim 和 CSS-only 微镜片控件边：外框加强上亮下暗的边缘，内部中性控件只用淡暗轮廓与细内高光，不增加材质等级、子级 backdrop-filter 或 SVG 位移。悬浮统计的被动表面使用中性透色，不保留旧青绿色底色；保存、选中、禁用、聚焦等语义状态色仍由原组件控制。opaque、低透明度与高对比模式取消装饰性微镜片阴影。

材质本身只在 `tokens.css` 中定义：`--ui-glass-ambient-image` 提供带克制暖玫瑰色的中性环境场；各 tier 的 `--ui-glass-*-bg` 保持近无色透射。prominent tier 独占 `--ui-glass-shadow-prominent` 的外部深度与五道静态 inset optical rim，以及 `--ui-glass-optical-rim-prominent` 的 1px conic 边缘 caustic。需强化边缘的 Prominent consumer 与桌面折射编辑器可加 `.ui-glass-optical-detail`：共享 `--ui-glass-optical-prominent-*` 外框 token 与 `--ui-glass-optical-micro-*` 内部中性控件 token；此 class 仅增加光学边缘，不改变 Refractive 的透色或滤镜。`liquid-glass.css` 只把 token 应用于 tier，并以不接收 pointer event 的 `::before` 绘制宽阔的 pointer-driven specular highlight、以 `::after` 绘制仅边缘可见的 masked static rim；SVG 位移仍只属于外层 directive。不得在 consumer 中复制 gradient、shadow、filter 或 pseudo-element recipe。

Event History 的 `.filter-bar`（操作栏）、`.filter-panel` 和 App 的 `.source-menu`（数据源展开面板）明确使用 `prominent` tier，并各自只拥有一个外层 `v-liquid-glass`/SVG `url(#...)` 位移；仅桌面顶栏的数据源按键使用折射态，展开面板不随按键改变材质。Card/Song Stats 的完整与紧凑导航遵循同一规则。它们依靠较高的白色雾化层与语义内部填充在滚动/密集文本上保持可读性；桌面顶栏与手机底栏的三页切换均以独立折射滑块承载选中态。

三页切换栏、滑块及桌面顶栏其他胶囊使用 `data-ui-glass-profile="lens"`，仍属于 Refractive 材质。位移沿胶囊轮廓法线计算：弧面宽度为短边的 23%（上限 32px），中央超过一半区域保持低畸变；最外沿较窄的 curl 区域允许局部取样回折，模拟倒影与哈哈镜边缘，回折不延伸到中心。Chromium 在该边缘位移场中分别以 `1.055 / 1 / 0.945` 倍位移采样 RGB，增强局部色散；中心保持零位移、不追加整体模糊。曲率继续控制局部柔散射及方向性明暗反光。Prominent 光学边框及小型镜片的 CSS rim 只在约 1px 边缘加入淡蓝紫过渡，非 Chromium 回退不伪装成真实 RGB 折射。按压通过独立 `scale` 动画放大滑块，`data-ui-glass-pressed` 同步驱动其滤镜强度与反光，拖动平移仍即时跟随；每个透镜使用独立滤镜，避免动画影响其他实例。

内层滑块另标记 `data-ui-glass-lens-role="selector"`：边缘弧面宽度为短边的 25%（同样上限 32px），中央一半保持低畸变。该角色采用向外的背景反向采样，使外层栏的上边线在成像中向下弯、下边线向上弯；滑块自身轮廓仍然外凸。滑块反光沿垂直方向对称分布，顶部左右角不因光照方向出现一明一暗；外层轨道仍保留轻微方向性反光。滑块常态仅显示选中阴影，不绘制玻璃底色、描边或 backdrop；按压、拖动和点击切页期间显现玻璃，同时移除滑块阴影。`useAppTabGliderFeedback.js` 只在状态变动及原生动画完成或取消的边界读取动画状态，等待实际平移和回弹结束再恢复阴影；快速反向与取消用所有权序号隔离旧完成回调，卸载和布局切换清理等待。沿用缓存滤镜，不重复创建光学实例，也不逐帧读取布局。桌面与手机滑块按压时使用 `--ui-motion-selector-press-scale: 1.2` 等比膨胀，文字与图标按钮保持原尺寸；松开恢复为 `1`。位置由独立 `translate` 承担，膨胀不能影响任一位置的中心或布局尺寸。弯曲来自实时背景而非固定装饰线，因此随拖动作用于外层栏、文字和图标；不改变外层栏及其他玻璃面的曲线。此为视觉近似，不宣称复现苹果的内部光学模型。

顶栏胶囊和交互中滑块的反射描边使用 `--ui-glass-lens-rim-width: 0.75px`；上下高光及左右内阴影由共享 lens reflection / bevel tokens 控制。轨道也使用较淡的边线和阴影。保留细边反光、透明底色与原有折射，不通过叠加宽内阴影强化厚度；此微调不增加滤镜、动画属性或逐帧计算，也不改变控件的外框尺寸。

外层轨道、文字图标按钮、内层滑块按此顺序绘制，滑块同时折射已合成的外层背景和文字图标。桌面顶栏用独立 `.nav-tabs-glass` 承载背景，`.desktop-tab-switcher` 留在原有顶栏位置；顶栏容器自身不使用 backdrop-filter，避免新增祖先 backdrop root 阻断滑块采样。桌面滑块按实际按钮位置和宽度对齐，保留宽屏原文案及紧凑顶栏短文案；桌面与手机共用拖动距离判定、点击和键盘按钮语义。滑块不接收指针事件。手机切换栏宽度为 `min(60vw, 320px)`，高度为 `56px`，按钮触控高度至少 `46px`，源按钮与回顶按钮同步对齐。WebKit 保留 CSS 磨砂与按压反馈，不宣称支持背景位移；减少动态效果时取消膨胀动画；opaque 模式以实色外框承载内容，滑块改为透明轮廓，避免遮住下层文字。

一个 glass 表面只拥有一个材质。其子元素、重复内容卡片、导出面板、列表行和数据内容 panel 必须保持原有局部表面；上表明确获准的 Chip consumer 可复用 CSS-only 高光与内阴影，其余不能追加 `.ui-liquid-glass`，子级均不得激活额外的 `v-liquid-glass`。这避免嵌套 backdrop/filter、额外 SVG 位移和导出画面漂移。

“查先例”使用达成、连续、期间、配置四个问题入口，由项目定义决定有效字段；查询字段的阅读与键盘顺序统一从项目、范围、角色开始，再到观察序列／期间与次数。以同一字段网格渲染，手机平衡为两至三列，面板达到 540px 后最多四列、760px 后最多六列；列数根据当前字段数量平衡，不用空字段占位。配置顶部只保留 UP 数／活动／卡池；逐卡条件块宽屏两块并排，每块四项同排，手机两列两行。达成项目保留数量、花色、补齐和技能，配置使用独立入口，按单张卡片的组合属性查询；间隔仅反查里程碑索引中的真实纪录，默认极值，可展开历史突破。连续在过滤观察序列后判断命中，FES 条件只作用于卡片；全部活动支持 WL／联动开关，混活可选跨团双人，同 V 要求整段有同一 VS。每段只返回一次，按达到 N 次的时点筛选首次／最近；书下依据为横向 64px 曲绘、VS 头像及简称胶囊。期间支持月份、自然年、运营年，保留零次对象与并列极值；月份优先使用永久年月标识，无键时按覆盖最多月份归属。新年默认下一年及运营年边界复用统计页；“统计非完整期间”默认选中，所有期间均可排除未完整窗口；连续 N 期仍必须存在 N 个数字活动。切换项目清除隐藏条件，失效时段回到全部有效期间。普通查询结果继续复用既有评级卡片、卡面依据、时间线和活动定位，不显示额外统计口径解释栏。

所有次数默认 MAX，切换项目后重置；选项及 MAX／MIN 根据已开数据和当前条件动态生成。连续次数只提供 MAX 和明确数字，数字 N 表示恰好 N 次，不提供 MIN；有次数关系选择器的项目可明确改为至少／至多。查先例首次打开不查询，切换项目清空旧结果，必须点击查找；编辑条件与复选框不重新计算结果，保留上次查询快照并显示待查询。结果下拉框在达成、连续、期间、配置四个入口都仅出现一次，统一放在查找左侧；“更多条件／结果／查找”使用三列 footer，手机结果字段保留 16px 原生字号缩放。

连续项目使用“出四星／未出四星／出报酬／未出报酬／出卡／双人同池／同类型卡／书下同V／同团Ban／花色缺席”。序列中的“箱活”紧挨“混活”上方。双人本人箱活增加独立箱主，未指定箱主则按各箱主独立观察，不能跨箱主接续；同团 Ban 本人箱活按个人箱主选序列、团体作主体。缺席类依据保留每一期活动 Ban 卡面或团体替代。仍在连续用主题色点和浅底胶囊，已结束用中性色胶囊，状态不再只嵌入普通说明文字。

同类型卡保留 sameAttribute 内部兼容键，使用 streakProperty 选择同色或同技能，观察序列为个人四星／个人全卡；单位按张。完整个人流判定后才应用花色／技能选择，中间不同特征不能被提前筛掉。异值同时发行批次中断跨批连续，批内同值可形成独立结果。个人全卡可选生日卡，默认不计；使用独立 personalCardSteps 保存无活动行的生日来源，原四星／阶梯 ledger 不变。生日卡按实际花色和 birthday 技能判断，使用 birth 边框，只显示日期与生日来源，不生成不存在的活动定位按钮。退出全卡或取消生日时清理生日技能；书下同 V 隐藏并强制关闭 WL。

配置作为第四入口，由 HistoryPrecedentPoolBuilder 展示顶部 UP 数／活动／卡池，以及可添加、复制、删除的卡片条件块。每块独立设置星级、技能、花色、附属组合，默认四星且其余任意，不提供成员组合或混合项目数量列表。各卡位用不同实际 CardID 一一匹配，使用增广路径处理交叠条件，不能让同一卡重复满足多个卡位。未指定的卡片不限；UP 是原具体池完整四星数，二／三星仅取当期报酬，并受报酬联动共享口径控制。附属 V 按 Affiliation 归团，卡位直接指定归属，不应用成员组合的本团 V 过滤。FES 开关与 18／27 分池沿用原规则；已知未来四星仅在 catalog source.pendingUp 保留 timestamp／fes，配置等所属具体池完整开放后参与，预测卡不延迟，未来卡不进入证据或原统计账本。无关的晚报酬不延迟匹配。结果保留完整原四星池及命中报酬，64px 卡面与命中轮廓沿用原样。标题按数量在前显示“3UP · 2P分＋1奶卡”，技能人数多者优先；逐卡设置深拷贝到查询快照，编辑后显示待查询。角色组合交给活动筛选，首次同池里程碑不受本入口移除成员模式影响。

“每期都有本团四星”的来源与分母使用有正式数字编号的活动，终章、总集篇计入，测试活动排除；联动永不增加活动期数；固定月／年与动态年自动纳入联动卡，仅连续 N 期提供“计入联动”卡片开关，报酬联动使用独立共用口径。同团四星仍只比较数字活动，不把联动算作额外一期。同团四星固定计入本团 V，依据卡片 Affiliation 归入副团体，附属 V 不合并进 VS，原 V 仍属于 VS；不显示归属复选框，计入 FES 默认开启且可关闭。期间的卡片项目包含四星、三星、二星、报酬、同团四星，活动项目包含 Banner、同团 Ban；去掉限定、百六限定和独立技能计数项目，将分卡、P分、普分、奶卡、判卡等放入技能条件。技能可与任何卡片项目组合，分卡沿用统计页的团分口径，Banner／同团 Ban 隐藏并清空技能；四星／Banner 在限定类型下提供百三／百六分类。活动与卡片／卡池筛选同排，卡片项目按卡片 Type 判断常驻／限定，Banner／同团 Ban 按活动 gacha_type 判断。百六是普通限定活动中包含 FES 卡，百三是其余普通限定活动；判断不依赖是否有 OC Ban 主；四星百六的“计入 FES”沿用统计页规则，也计入早期常驻池的 CFES。

四个入口默认全部记录；首次／最近以当前匹配集合的达成时点标注，分页前保留并列标记，连续使用达到 N 次的时点、期间使用窗口起点。标记与已有里程碑标签并列放在右上角，不占纵向高度。“全部”结果在四个入口统一先排首次、再排最近、其余按达成时间倒序；同时带首次与最近标记的记录只出现一次，全部并列边界均保留。排序在分页前执行，首次／最近单独查询沿用原有筛选语义。技能首张的每条记录始终代表角色×花色×技能的首张，“最近”表示这些首张中时间最晚者。配置默认不限定技能；WL3 不附加本团 V 限制，UP 不随逐卡条件缩小。首次同池里程碑与连续双人同池仍保留原本团 V 口径。查先例的口径复选框直接并入更多条件，常用角色、花色与技能等下拉移入主筛选区，下拉选项以卡片／活动等用途分组，保留本期纪录原有独立口径折叠。

期间的动态周期包含“动态年／连续 N 期”，不增加动态月。动态年按日历日期滑动一年，终日不包含，闰日向下一年二月末对齐；连续 N 期使用正式数字编号活动序列，默认 3 期，不足 N 期的尾段不参与。恢复“统计非完整期间”并默认开启，关闭后要求窗口已结束；联动不占期数、不延长 N 期的结束边界，其卡片按窗口内实际开放时间筛入。固定月份、自然年、运营年沿用永久年月标识与统计页归属规则。期间核心条件为项目、范围、角色／覆盖、周期、时段／期数、次数；下方以浅线分隔活动、卡片／卡池、限定分类、技能和次数关系，相关的活动与卡片类型保持相邻。仅四星／Banner 选限定时展示百三／百六分类；其他项目自动清除隐藏分类。年标题统一“对象 · 1 年 M 项目”，小字写“2025年 · 自然年”等，月份与 N 期保留原单位。标题前缀由活动与卡片／卡池类型组合：常驻卡片用常驻、常驻活动用普活，单选箱／混用箱活／混活；组合为普箱／普混／箱限／混限，百三／百六加在最前。查询结果保存应用时的筛选快照，编辑条件不改变已有标题。

查先例的更多条件按“结果／活动与时间／卡片来源／计数口径／角色归属”组成语义分组，仅出现当前问题适用的选项，使用 fieldset、legend 和浅分隔线，桌面两列、手机单列，不新增嵌套折叠。连续双人同池也显示共用的本团 V 开关，避免跨项目的隐藏条件影响结果。本期纪录保留原独立口径折叠。

动态结果按对象、项目、命中数量、卡面与命中活动去重，将依据相同且相互重叠的窗口合并为一张卡片。固定期间不合并，零次且不重叠的空档分别保留；团体覆盖分母不同的结果也分别保留。结果说明标注合并窗口数，独立的“适用窗口 N”折叠保留每个精确起止日期，卡面依据仍只展示一次。首次／最近在合并前按全部匹配窗口判断，合并后保留两类标记；单独筛选首次／最近时分别采用对应端的窗口作为主描述。窗口列表与依据在宽屏单卡布局中各自横跨整卡，手机保持单列。

开服来源（ID 0）计入固定月份、自然年、运营年的卡片数量，确保 2020 年九月和首年包含初始卡；不作为动态 N 期活动，也不计入团体四星活动覆盖。合并的零次结果切换首次／最近时，时间线与所选窗口的起止日期同步。

书下、同团 Ban、花色缺席按实际歌曲／活动数显示依据数量；同团 Ban 使用每期 Ban 主卡面，花色缺席包含两端和中间活动。无 Ban 主活动用对应团体 logo 替代卡面，跨团 WL 可组合多个团体 logo；有附属组合的 VS Ban 优先精确匹配卡片姓名。勾选计入 WL 后，无固定活动花色的已知 WL 计入缺席期数但不触发固定花色出现；普通活动花色未知仍中断判断。活动依据继续复用卡面边框、花色比例与活动简称跳转。

活动页“先例与纪录”的 `HistoryPrecedentPanel` 是独立的 Prominent 外层表面，挂在现有吸顶操作栏下，与活动筛选面板互斥展开；通过现有 `UiSurfaceTransition` 播放 popover 动效。查询方向放在标题栏。花色查询合并突破与全员补齐，项目、范围、角色、数量与花色／技能按统一网格排列，窄屏保持紧凑、宽屏增加列数；花色可选任意、全部和五种单色，数量选项按 1～MAX 随已开卡片和当前条件动态生成并倒序排列，极值标为“7(MAX)”“6(MIN)”且不重复列出，相同极值合并标注；默认选择全角色、任意、MAX 和全部记录；本期纪录默认跟随当期已开活动，用户手动选择历史活动后保留该选择。任意／全部先按每人最多／最少的一色计算，再在人物范围内取极值。达成记录和按人数统计的全员进度同时呈现；全员达成以同款结果卡跟在首次达成下方，展示最后补齐者及首次至全员达成的耗时，保留同刻并列；未达标者以头像和下方数量进度呈现，缺少花色收进提示；更多条件、结果与查找同排，角色、花色、技能等常用下拉在主筛选区，更多条件按语义分组放补充复选框，证据折叠展示；本期里程碑可按类别筛选。内部条件、结果和证据列表使用普通局部表面，输入、按钮和选择器复用现有交互 family。面板使用页面容器宽度、最大高度和内部滚动，在 `900/520px` 断点适配，手机端标题、方向切换与关闭同排，基础字段按数量平衡为两至三列，缩小内边距和区块间距，字段呈现为 30px 高、约 13px 字；原生字段保留 16px 字号并按比例缩放，以避免 iOS 聚焦缩放。范围固定使用“全角色／全OC／LN／MMJ／VBS／WS／NC／VS”；其他下拉文案使用“任意”“全部”“不限”“最早”等简短用语；花色结果用花色图标和“四星”数量呈现，突破说明与耗时合为一行，起点与终点共用对称的日期／角色／花色及活动信息布局，活动简称复用现有单字与轮次（如奏3箱、WL3 P1），保留标题和编号并对齐跳转按钮；卡片依据使用横向多列花后缩略图，复用共享卡面当前版本的四星框、卡图与左上花色比例，随容器缩放；缩紧列间及卡图与标题区的间距；下方活动简称采用带边框和跳转箭头的胶囊按钮，按钮和日期在同宽标题区内居中，活动编号与标题保留在提示中，卡名收进图片替代文本和悬停提示。WebKit 中，即使计算样式包含 blur，滚动内容上的背景滤镜仍可能不实际成像；共享 `liquid-glass.css` 为这一密集阅读表面在 frosted 模式增加基于 `--ui-glass-fallback-bg` 的底色，保留统一光学边框并保证文字可读。活动右下角使用 18px 单圈 i 图标，以绝对定位放在卡片内部右下角，24px 点击区域与原属性、歌曲触发区分开，不增加活动行的横向留白。收起或 Escape 返回触发按钮焦点，活动跳转复用现有导航所有者；活动 PNG 的克隆会移除入口。

“本期纪录”使用首次达成、间隔纪录、花色达成、首次同池四类。分类胶囊保持单行，窄屏横向滚动；口径开关折叠在“口径选项”，不扩大默认控制区。首次达成沿用 14 个基础阶梯指标，三个 Banner 指标分别计算箱／混／全活动，扩为 20 个数量维度，报酬卡主区只显示总数，二／三星拆分收进依据；Banner 比较 OC。间隔在全角色范围内比较已结束区间的严格最长／最短突破，天数和期数独立比较，双破合并；当前区间以与突破相同的起终点行展示，旧纪录及并列保持者收进依据。团体五色补齐要求每位成员的五色都达标，复用 `/elements/unit_mini_{unit}.png` 圆形 logo 和人物卡片排版，展示最后贡献者的角色与花色，上一补齐阶到本阶显示耗时。VS 同池的归属显示在人物名旁，首次限定／混活等条件同时保留。证据边框随卡片稀有度使用 `card_frame_2/3/4_v1.png`，统一使用 CardArtwork 当前版本的卡图、边框与花色比例。历史记录由独立的全稀有度 ledger 与四星 query stream 供给，口径是明确快照，不绑定其他页面的临时筛选状态。

CFES／BFES 技能首次从花色技能与同技能配置中排除；它们的卡片仍可贡献数量／花色进度、同池及百六纪录。花色上限在 OC／VS 范围内分别记录单色及任意花色的首次新高；同次达成保留一张卡片与金／银两个标签，并选择对应范围及花色的上一阶计算用时，不记录个人追平；个人／团体／全员补齐保留；四星、限定、报酬等数量及间隔纪录统一比较全角色。Banner 的参与者仍仅为 OC。

依据由 `HistoryPrecedentEvidence` 呈现，共用 `HistoryPrecedentCardGallery` 的稀有度框、花色比例、居中简称胶囊和日期。间隔依据按“本次纪录／此前纪录”分区，每段区间用头像与保持者名称、天数／期数数值、横向两端卡面和圆点连线表达；卡面只属于对应保持者与端点活动，不再把所有卡片混成一排。同一旧区间同时保持天数及期数时合并，其他并列保持者各自成行。每对卡面在窄屏也保持横排，宽屏按可用空间将各保持者区间并列展示；没有卡面的 Banner 端点仍显示头像、简称跳转及日期。报酬组成仅在折叠依据中显示。

先例纪录的字阶按信息角色区分：主结果数字在手机／桌面为 20／22px，纪录标题为 14／15px；活动简称与说明为 12px，日期及编号为 11px 左右。数字使用等宽数码，单位保持正文大小；间隔只放大实际突破单位的新值，旧值及箭头弱化。依据中的本次数值为 16／18px，此前数值为 14px 中性色；状态标签使用淡填色。普通结果卡在既有局部渐变下增加稳定底色，减少环境图案干扰。概览与时间线、依据入口之间使用同一浅色分隔线；宽屏单结果的时间线使用左竖线，依据各保持者在 458／696px 容器断点下切换横线／列间竖线，不增加嵌套玻璃。

口径区按数量／同池两组，以八个自然宽度的复选项紧凑换行，统一使用“计入”，取消 Banner 活动范围选择器；箱活、混活、全活动的三个 Banner 数量族及间隔自动独立判定。同池仅计入本团 V 默认开启；技能配置中有 OC 时，仅保留归属匹配的 VS，纯 VS 配置仍保留。WL1／2 同池计入箱活，WL3 计入混活，不生成 WL 单独纪录。间隔破纪录徽标统一为“间隔新纪录”，标题去掉“全活动”，箱活／混活的 Banner 缩为 Ban，保留最长／最短。三星／二星徽标固定使用“三星新上限／二星新上限”，数量 Banner 徽标使用 Banner、限Ban、箱Ban、混Ban、箱限Ban、混限Ban、百六限Ban、百六箱限Ban、百六混限Ban 九种简称，不修改统计口径。名称和金银铜评级由 `milestoneLabels.js` 统一生成，详见 [全部名称与评级](milestone-catalog.md)。金级优先于银级、铜级，同色连出为铜级；同级延用原有顺序。名称胶囊绝对定位在卡片右上角框线上，不增加标签行，不占用纵向高度或标题宽度，单条横向布局同样适用；以整张卡片框线、浅色胶囊、小圆点及顶部图例共同表达金银铜；金色偏黄、银色偏冷灰、铜色偏红棕，金铜保持明显色相差异，悬浮说明和可访问描述包含评级。花色标题与普通数量标题统一使用文字基线，花色突破、技能首张及同色连出标题共用花色图标规则，使用文字基线对齐并向下 1px 作视觉补偿，使图标底部与大数字底部齐平；同色连出标题采用“角色 · 花色 logo 连续 N 张”，属性文字保留在图标替代文本中；金银铜边框为 2px。“查先例”和“本期纪录”均移除底部“统计口径”说明，只保留用于实际筛选的口径选项；单色新上限徽标使用 OC／VS 前缀、花色图标和“新上限”，可访问名称保留花色文字。技能标题使用花色图标及“首张 奶卡”等有空格的文本；同池、连出等标题的数字两侧统一留白。范围内的数量新上限、OC／VS花色新上限及间隔纪录，标题只显示项目与数量，不以达成者姓名开头；达成者保留左侧头像、姓名提示及依据。个人五色补齐、技能首张、同色连出保留姓名，团体纪录保留团体名称；查先例的个人达成结果也保留姓名。卡图通过 `--precedent-card-size: 64px` 共用同一规格，间隔端点不再单独放大，稀有度框与属性仍按比例缩放。

历史达成日期继续取关联活动开放时间与卡片实装时间中的较晚者，提前于活动开放的 FES 不单独前移历史查询时间轴。联动同池与统计页复用 `cardDuoRules` 的活动类型判断，包含 c6 及后续标明“联动”的卡池。

纪录列表的响应式按 `HistoryPrecedentPanel` 自身的 inline-size 容器宽度判断：“查先例”和“本期纪录”共用相同规则，内容宽度达到 `760px` 时使用两列等宽、顶部对齐的网格，保持从左到右、从上到下的记录顺序；每个结果分区仅一条结果时，概览与时间线左右排列，依据横跨整张卡片。达成记录和全员达成各自适配，前后分区顺序不变，全员进度条保持整行。展开依据不强制相邻卡片等高，加载更多保留既有结果顺序。宽屏活动选择与分类同排，口径选项占下一行；查询条件仍使用原有布局。窄面板恢复原有纵向结构，浏览器缩放和在大屏中缩窄面板也适用。

起终点共用有序时间线：8px 空心起点、实心终点，通过随行高延伸的细线连接，多位并列者／多场活动换行也能衔接；单个达成点不显示延长线。界面不显示“起点／终点”文字，角色全名改为 18px 行内头像，日期、花色、活动与跳转保留；全名保留在头像替代文本与提示中；有序列表及每个时间点的可访问名称保留其语义。

活动选择复用 `HistoryRecordEventPicker` 可编辑组合框，支持输入 `#id`、已有活动简称及下拉选择；数字活动展示 `#编号 · 简称 · 标题`，缺失简称时省略该段。部分／歧义输入只筛选，不自动切换；Enter 确认准确匹配或键盘高亮选项，失焦恢复已选值。Escape 优先收起列表，列表关闭后再交由外层面板处理。组件内列表不传送到 body，以保留面板定位和玻璃层级；手机输入框保留 16px 字号、30px 高度。

纪录口径的“三星/二星仅报酬”共用一个默认开启状态；统计页的两个“报酬”框也引用同一 `useRewardCountForLowStars`，默认开启。统计页的“统计联动”在报酬框之后按条件出现，三个面板共用默认关闭的 `includeCollabRewardCards`，切换不改变报酬框自身位置。二／三星的报酬数量、达成排序和附属 VS 汇总均选择对应口径的 reward count 及 progress key，和报酬总数一致。两页各自保有本页规则状态。

`liquidGlassPlugin` 是唯一的 refraction 生命周期 owner：它维护一个共享 `#ui-liquid-glass-filter-host`，引用计数复用等几何和已解析 refraction config 的滤镜，并由插件级 KeepAlive bridge 在 cached tab `deactivated` 时暂停表面、释放 pointer/window listener、ResizeObserver、timer/RAF、filter、attribute 和内联 style；`activated` 时只恢复一次，最终 directive unmount 才销毁注册。不得用 per-consumer lifecycle hook、document-wide observer 或 per-element MutationObserver 替代它。

SVG blur 由每个外层表面的计算 CSS property `--ui-glass-refraction-blur-radius` 决定：未设置、非法或负值时回退为 `GLASS_PRESET.blurRadius` 的 `2`（`feGaussianBlur stdDeviation="0.7"`），值上限为 `64`。prominent tier 把它设为 `--ui-glass-refraction-blur-prominent: 16`，因此生成 `stdDeviation="5.6"`；它还映射 `--ui-glass-refraction-strength-prominent: 1.14` 与 `--ui-glass-refraction-spread-prominent: 1.45` 到每个外层的 runtime config。运行时只接受有限正数（缺失、非法或非正数回退 `1`），strength 上限为 `2`，spread 限制为 `0.5..2`；strength 同时作用于 edge/rim/corner/ripple 强度，spread 仅放宽 edge/rim 衰减而不启用中心 warp。已解析 config 与 blur 同时参与位移缓存键、共享和 SVG filter margin，不能在 consumer 中用内联 recipe 替代。

中心区域默认仍为零位移；仅桌面 Predict Editor 在共享材质映射中设置 `--ui-glass-refraction-warp-strength`，当前为 `0.1` 倍的 preset base intensity。插件只接受有限正数，最大 `0.2`，缺失、零或非法值保持 `warp: false`；该值与其他配置一同参与位移缓存键。它使抽屉上方背后的参考文字有轻微弯曲，不能推广到覆盖密集文本的 Prominent、Regular 或导航滑块。WebKit 仍使用原有 CSS 雾化，辅助功能的 opaque 模式仍优先。

SVG `url(#filter)` enhancement 只在 Chromium 且根状态为 `data-ui-glass-mode="refractive"` 时启用。其他引擎保留 CSS frost；`prefers-reduced-transparency`、高对比/forced-colors 会强制 opaque 并隐藏 prominent `::after` rim，`prefers-reduced-motion` 停止 ambient motion 并隐藏 pointer-following specular，但保留不依赖 pointer 的 prominent static rim。测试可在导航后写 root dataset 来选择确定模式，但生产代码不得把该覆盖写入 storage 或 URL。

非 Chromium 的 `data-ui-glass-mode="frosted"` 必须通过独立的 `--ui-glass-filter-frosted-*` token 对齐 Chromium 的光学模糊量，而不能直接复用可读性优先的通用高模糊值。当前 refractive / regular / prominent 回退分别为 `2px / 3px / 6px`；这些值按材质模式选择，与 viewport 断点无关，因此真实移动设备与桌面窄视口保持相近的透明感，同时继续保留 CSS rim、specular 和 prominent optical rim。`scripts/check-ui-policy.js` 会阻止三档回退缺失、未映射或重新超过约束上限。

SFC 只保留既有几何、定位、响应式断点和语义状态色；central stylesheet 仅拥有 glass tokens/material。任何新增 consumer 必须同时证明不改变字体、间距、边界框、圆角、DOM 或 export PNG blob。

## 4.2 通用控件交互规则

普通状态保持现有尺寸、字号、配色和材质。全站动效规范化将按压与释放交给共享规则，局部样式负责选中态和布局，不再叠加第二份按压缩放。

| 规则 | 共享 token / 行为 |
| --- | --- |
| 胶囊圆角 | `--ui-control-radius-pill: 999px` |
| 禁用透明度 | `--ui-control-disabled-opacity: 0.6`，保留原生 disabled 与既有指针限制 |
| 通用按钮按压 | `--ui-control-press-scale` 指向 `--ui-motion-press-scale: 0.97`；独立 `scale` 保留定位 transform，密集导航行不缩放 |
| 键盘焦点 | `--ui-control-focus-color: #0f766e`、`--ui-control-focus-width: 2px`、`--ui-control-focus-offset: 2px`；仅 `:focus-visible` 显示轮廓，不占据布局空间 |
| 反馈过渡 | press 80ms、release 220ms、状态色 160ms；仅显式过渡 scale/translate/transform/opacity 和小面积颜色，filter/阴影保持静态，宽高和间距直接重排 |
| 减少动态效果 | `prefers-reduced-motion: reduce` 关闭运动，保留静态按下/聚焦/选中反馈；`ui-motion-accessibility` 的重要级联层覆盖 scoped 规则及 Teleport、伪元素、加载和 JS 动画 |

这是通用 primitive 的默认规则。原生按钮、checkbox 及其 Enter／Space 行为保持不变，焦点轮廓不引入额外 DOM。OC／VS 书下面板继续对称使用原有导出控件；新组件复用通用 class 与 token，避免再次复制焦点和动效规则。

视觉验收比较 Chromium／WebKit 在 `390/820/1440px` 的正常样式和尺寸，并验证实际 OC／VS 页面上的焦点与减少动态效果。截图基线须采用同一版业务与滚动逻辑；不要让旧的页面定位逻辑改变取景位置。按钮过渡范围缩小能消除非预期尺寸动画，不能据此宣称全站加载时间或帧率提升。

## 4.3 书下曲绘统计头部

OC／VS 书下面板使用 `song-commissioned-stats-panel`，曲绘开启时添加 `is-image-mode`。共享 `commissionedSongStatsSummary.css` 保护胶囊及其数字／图标不被 flex 压缩；文字模式沿用原规则。VS 专有的容器布局放在 `vsCommissionedSongStatsSummary.css`，不在 OC 面板编译。

VS 以每张歌手卡片的内容宽度作为 `commissioned-song-summary` 容器查询边界，不根据设备名称或视口宽度选择头部排版：

| 卡片内容宽度 | 头部排版 |
| --- | --- |
| 大于 `56rem` | 身份、总 MV、五团横向胶囊对、收起按钮同排；第一列按总 MV 内容宽度，其余列保留各团最小内容宽度 |
| 大于 `36rem` 且不超过 `56rem` | 头部仍同排；每团的数量／MV 胶囊上下排列 |
| 不超过 `36rem` | 总 MV 放到头像和总数旁；各团独占下一行，保留五列；小于五列最小总宽的 `18.5rem` 时自动分列换行 |

中间和窄档的各团胶囊从 `3.5rem`（默认 56px）增长到 `5rem`（默认 80px）即停止。余下空间通过 `justify-content: space-between` 分配到各团之间；数量和 MV 胶囊保持等宽、上下对齐。极窄自动分列仍保留 `5rem` 的上限，避免少量列被拉成过长胶囊。总 MV 胶囊按内容宽度显示，不套用各团的宽度上限。

容器阈值留有胶囊内容和间距的余量，使用 rem 随根字号调整。收起按钮留在正常布局中，不再以固定 `92px` 预留空位。曲绘网格、头像与文字字号、统计值、单位颜色和导出控制器不改变；导出克隆保留面板 class 与相同容器规则。OC 的现有分组头部继续保留原来的排列。

## 5. Scoped 共享片段

共享片段必须通过每个 SFC 的 `<style scoped src="...">` 编译，不能在 `main.js` 或全局 stylesheet 中 import。当前片段和完整消费者如下：

| 片段 | 消费者 | 内容 |
| --- | --- | --- |
| `src/styles/scoped/stats-navigation-base.css` | `src/components/CardStats.vue`、`src/components/SongStats.vue` | 统计导航的基础布局、玻璃面板、链接和 active 规则 |
| `src/styles/scoped/stats-navigation-responsive.css` | `src/components/CardStats.vue`、`src/components/SongStats.vue` | 统计导航在 `1280/900/520px` 处的响应式规则 |
| `src/styles/scoped/media-load-shimmer.css` | `src/components/CardStats.vue`、`src/components/SongStats.vue`、`src/components/EventHistory.vue`、`src/features/song-stats/OcCommissionedSongStatsPanel.vue`、`src/features/song-stats/VsCommissionedSongStatsPanel.vue`、`src/features/card-stats/NuigurumiStatsPanel.vue` | 图片加载 shimmer、keyframes 和 reduced-motion 规则 |

例如消费者必须保留类似以下标签（路径按 SFC 所在目录解析）：

```vue
<style scoped src="../styles/scoped/stats-navigation-base.css"></style>
```

外部片段在每个消费者的 scoped pipeline 中独立编译，因此生成 CSS 仍带有该 SFC 的 scope。拆分 inline style 时，要把外部片段放在它替代的最早规则所在的 cascade 位置；组件专有声明和后续 override 留在原位置。这样才能同时保持 scoped selector、层叠顺序和 Card/Song/Event 各自的局部差异。`npm.cmd run check:ui` 会检查片段存在、每个消费者的 `scoped` source、未声明 viewport 宽度以及仍重复留在 inline scoped block 中的 exact rule。

完整拆分后的视图用 `data-feature-page` 保留页面样式边界。原 scoped 规则的扩展分支使用明确页面限定的 `:global()`，让同一规则同时适用于子组件和脱离页面的导出克隆；视图仍通过 `data-feature-view` 标明职责，不增加布局包装。页面边界不能泛化成全局 `button`／`table`，也不能把 `::before` 等伪元素放进 `:is()`。单独导出嵌套元素由捕获服务保留功能边界，相关参数、图片预算及导出专用样式继续采用各页原政策。

悬浮框等以 `Transition` 为根的视图，必须把这两个边界属性放在实际渲染的 DOM 根节点上。验收要打开浮层，检查标题、徽章、图标及信息行的计算样式，同时检查悬停关闭、点击固定和外部关闭；仅断言浮层可见，无法发现内部样式失效。

业务展示组件的局部样式放在 `src/features/<功能>/styles/`。OC／VS 书下面板使用对称的 `ocCommissionedSongStats*`／`vsCommissionedSongStats*` 文件，只编译各自实际使用的内容和响应式规则；统计导航仍归父页面。`NuigurumiStatsPanel` 与 `EventHistoryFilterToolbar` 同样只携带自己的规则，根节点和祖先继承关系保持原样。拆出组件时必须检查动态 class、伪类、加载态和导出克隆，不能将整页 CSS 复制到每个子组件。

## 6. 响应式策略

以下是当前注册在 `src/ui/breakpoints.js` 的 viewport 概念；CSS 仍使用数字 media condition，不能把 CSS media 条件改写成 custom property：

| 边界 | 当前含义与归属 |
| --- | --- |
| `520px` | extra-small phone；通常是 `max-width: 520px` 与 `min-width: 521px` 的两侧 |
| `700px` | editor/small transition；保留现有 `max-width: 699px` / `min-width: 700px`，或组件为保持 exact `700px` 的现有归属而使用 `min-width: 701px`。不得为了整齐改动 `699/700/701` 的 ownership |
| `768px` | small-tablet transition；Card Stats 两处紧凑规则使用 `max-width: 768px`，另一侧为 `min-width: 769px`；App 在这一侧隐藏顶栏并显示自适应居中的底部三页切换栏，滑动可按距离跨越多个页面；活动页的圆形数据源入口独立贴于右侧、菜单向上展开；Card/Song Stats 的悬浮菜单按钮及面板同步上移，直达顶部按钮与底部切换栏垂直居中对齐，箭头保持原字号而以字重与描边增强辨识度 |
| `900px` | compact application layout；`max-width: 900px` 与 `min-width: 901px` |
| `1000px` | 仅 Event History preview-panel 定位/宽度的 JavaScript feature threshold（`historyPreviewMax`）；不是新的 CSS viewport breakpoint |
| `1280px` | tablet/desktop、顶栏、活动筛选操作栏与导出边界；CSS 使用 `max-width: 1280px` / `min-width: 1281px`，对应运行时判断包含 exact `1280px`。原有 `1200/1201px` 规则及 `tabletMax` 均迁移到此分界；1200 毫秒、图片数量和层级等常量不属于宽度规则 |
| `1360px` | Card Stats 相关记录表的局部宽度上界，保留原有用途；顶栏与活动筛选操作栏使用 `1280px`，不再共用此边界 |

App 顶栏在 `901–1280px` 统一采用 10px 纵向内边距、36px 控件最小高度和 `0.86rem` 的三页切换字号，使 11 英寸 iPad 接近全宽的窗口与全屏横向显示保持同一比例。宽屏三页切换也明确指定 `0.86rem`，不依赖浏览器默认按钮字号；更宽的桌面仍保留原有宽松顶栏间距。`≤900px` 的紧凑文案与尺寸、`≤768px` 的底部导航规则不受影响。

活动页筛选操作栏在同一中等宽度档采用 6px 纵向内边距；鼠标模式的按钮为 33px / `0.79rem`，触屏模式为 34px / `0.8rem`。更宽屏幕的排序与导航按钮也明确指定基础字号 `0.8rem`，避免浏览器默认值造成文字比例变化；`≤900px` 的紧凑操作栏、预测编辑器占用空间后的紧凑状态仍由原有规则控制。

Card/Song Stats 共用的导航滚动区不预留可见滚动条槽，仍可滚动；内框左右各留 4px 保护胶囊阴影。外框在手机、紧凑桌面和宽桌面断点同步缩窄，使胶囊维持原有宽度，而非填满被移除的空白。

下列条件是独立概念，不得写进 viewport 断点表或被合并：

- `680px` 是 Card/Song/Event 导出或捕获分层使用的 `minSide = min(width, height)` 阈值，不是 viewport 宽度；
- `(hover: none)`、`(pointer: coarse)` 是输入能力条件；既有 coarse-pointer 判断和 Event History media clause 要保持原位置；
- `prefers-reduced-motion: reduce` 是用户动效偏好，由共享 `motion.css` 和 JS 动画 owner 处理；具体行为见第 4.2、10 节；
- `@container` 的 `special-limited`、Anvo/其他容器宽度阈值是组件容器条件，不是 viewport media query。policy checker 会忽略这些 container query。

新增 CSS viewport 宽度必须先有明确的功能含义，并同步 policy 白名单、边界测试和本规范；不能仅为减少数字种类而合并。

### 共享卡面

活动页和统计页的方形卡面统一使用 `src/components/ui/CardArtwork.vue`。`HistoryCardArtwork.vue` 仅适配活动数据，统计模块直接传入卡图、稀有度、花色、团体与缎带信息；原有图片 URL 选择、花前花后规则、延迟加载和失败重试由各自媒体逻辑继续管理。

| 层 | 统一几何 | 层级 |
| --- | --- | --- |
| 卡图 / fallback | v1：内缩 5%，宽高 90%；v2：内缩 0，宽高 100%，圆角 6.6%，贴满新框 | 1 / 0 |
| 边框 | 铺满卡片，使用对应版本素材 | 2 |
| 花色 | v1：左上偏移 3%，宽高 23%；v2：左上贴边，高 22.4%，宽按素材比例自动计算 | 3 |
| 团体 | v1：右侧偏移 3%；v2：右侧贴边；底部偏移均为 3%，宽高 23% | 4 |
| 星级 | v1：左侧偏移 5%；v2：左侧偏移 2%；底部偏移均为 5%，整组宽 58%、高 17%，单星占组宽 25%，高按 72:70 素材比例自动计算，在组内垂直居中 | 4 |
| 缎带 | 右上旋转 30°，位置与字号均按卡片比例缩放 | 5 |

`showFrame`、`showAttribute` 默认开启；`showUnit`、`showStars`、`showRibbon`、`showPermanentRibbon` 默认关闭。各模块只能选择显示层与整体 `size`（数字为 px，也支持 CSS 宽度），不得覆盖内部层的位置、尺寸或 z-index。隐藏某层不会改变其余层的几何。

卡面版本在 `src/config/cardArtwork.js` 的 `DEFAULT_CARD_ARTWORK_VERSION` 统一选择 `'v1'` 或 `'v2'`，当前默认 `'v2'`；组件也接受代码层面的 `version` 参数。v1 保留原比例，v2 使用新边框及贴边花色角标，卡图铺满卡片，避免新框透明侧边露出内缩间隙。v2 的星级组向左、团体 logo 向右靠近卡片边缘，两者大小、底部距离和层级保持一致；限定/常驻缎带的全部几何及层级不随版本变化。星星与 v2 花色使用实际等比宽高，避免 html2canvas 导出时因不支持 `object-fit` 而拉伸。当前只提供代码配置，页面全局切换按钮后续再添加。

限定缎带由 `ribbonLabel` 提供文案；常驻缎带由 `isPermanent` 和 `showPermanentRibbon` 共同控制，固定显示雾蓝灰色“常驻”，与限定缎带共用形状和比例。节日卡面开启常驻缎带，仅标记原 `isPermOnly` 卡片，替代旧的“普”；普通限定节日卡不额外加限定缎带。字符头像、独立属性图标、曲绘和通用原图查看器继续使用对应展示组件。

### elements 图片命名

`public/elements/` 按图片含义统一命名，保留原扩展名及同一 logo 的 PNG、WebP 资源：

| 资源 | 文件名 |
| --- | --- |
| 原属性图标 / 新属性图标 | `attr_{cool/cute/happy/mysterious/pure}_v1.png` / `_v2.png` |
| mini 团体 logo | `unit_mini_{ln/mmj/vbs/ws/nc/vs}.png` |
| 大团体 logo | `unit_logo_{ln/mmj/vbs/ws/nc/vs}.png` / `.webp` |
| 原卡框 / 新卡框 | `card_frame_{1/2/3/4/birth}_v1.png` / `_v2.png` |
| 黄色星星 / 彩色星星 / 生日 | `rarity_ystar.png` / `rarity_rstar.png` / `rarity_birthday.png` |
| Colorful FES / Bloom FES | `fes_colorful.webp` / `fes_bloom.webp` |

共享卡面默认引用 v2 属性和卡框，可通过统一配置切回 v1；独立花色筛选等图标仍使用 v1。生日卡框两版统一使用 `birth`。文件命名不改变 `cfes`、`bfes` 等业务键；预加载保留独立 v1 花色并随默认卡面版本加载对应边框和花色。

## 7. 修改流程

1. **比较 exact value。** 新增或复用 token 前，在现有 selector 和消费路径中逐项比较值、声明和继承范围。仅 exact duplicate 可进入 `tokens.css`；相似值继续使用 local variable，并保留兼容 alias。
2. **说明断点含义。** 新增 viewport breakpoint 前写明它解决的 feature、两侧 ownership 和测试宽度；运行时阈值使用 `UI_BREAKPOINTS`，CSS 继续使用数字条件。`680`、pointer/hover、reduced-motion 和 container 条件不能冒充 viewport breakpoint。
3. **保持 scoped 位置。** 共享 CSS 只抽取 exact duplicated author-source rules；每个消费者用 `<style scoped src>`，并把标签放在被替代规则的原 cascade 位置。不得将 feature/data/export 样式提升为不受功能边界限制的全局规则。
4. **完成验证。** 运行第 8 节的 policy、build 和 Git 检查，并按改动范围运行本地忽略的回归用例；涉及视觉变化时，还必须在临时开发分支完成对应视口的人工或自动化对比。
5. **隔离阶段资产。** 一次性的视觉基线、实现计划、审查报告和测试输出不得长期进入正式分支；需要保留时放入本地忽略目录，或通过专用归档 tag 保存。

## 8. 验证命令

每条命令独立执行，并在实现报告中记录真实输出与 exit code：

```powershell
npm.cmd run check:ui
npm.cmd run build
git diff --check
git status --short
```

预期是 policy 输出 `UI policy check passed`、Vite production build 成功且 `git diff --check` 无输出。本地存在忽略的测试文件时，还应按改动范围运行并记录结果；这些测试文件不随正式仓库发布。涉及视觉材质、布局或响应式边界的改动，应在临时开发分支补充定向视觉验收；阶段测试与截图资产不长期保留在正式分支。

## 9. 预测编辑器与活动详情的动效开销

预测编辑器首次打开后保留实例，通过 `v-show` 完成关闭动画。每次打开仍按当前活动源数据重新初始化表单和未保存基线；关闭清除草稿、禁用原因浮层和拖拽监听，KeepAlive 返回不应重新显示已关闭的抽屉。

大范围移动期间，`liquidGlassMotion.js` 为抽屉进出、桌面活动内容平移和统计导航菜单开关分别持有可释放的折射暂缓。根节点的 `data-ui-glass-motion-deferred="true"` 仅在 Chromium `refractive` 模式下让玻璃表面采用各自已有的 CSS frost，避免移动内容使固定导航等表面的 SVG 折射逐帧失效。最后一个所有者结束、取消或离开后恢复原 SVG；快速反向、断点变化、KeepAlive 和减少动态效果都必须释放所有权。运行模式和稳定材质参数保持原值，WebKit/opaque 规则不变。

抽屉的 `data-ui-glass-defer-rebuild="true"` 仍暂缓活动内容排版期间的位移场生成；`data-ui-surface-motion` 标记抽屉自己的原生动画，防止活动内容先结束时过早恢复折射。相同几何先命中缓存再计算像素场，resize、配置和辅助功能改变仍触发刷新。不复制页面或创建冻结背景截图，不引入逐帧布局读取。

环境背景与彩色行边框保持静态，保留原有颜色和玻璃参数，避免持续装饰动画使玻璃背板反复失效。活动内容采用一次排版后的横向平移动画，只处理可见内容组，不缩放列表和头像；结束、用户输入、resize、减少动态效果偏好变化和导出均清除临时动画，不保留临时行高或占位节点。

## 10. 全站动效标准

依据 [Apple HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion)、[Designing Fluid Interfaces](https://developer.apple.com/videos/play/wwdc2018/803/) 和 [Animate with springs](https://developer.apple.com/videos/play/wwdc2023/10158/) 的即时响应、自然收敛、可中断原则。下表是本项目的网页参数，CSS 曲线近似自然运动，不宣称这些数值由 Apple 规定。

| 角色 | 时长 | 使用方式 |
| --- | --- | --- |
| press / release | 80 / 220ms | 普通按钮等比缩至 0.97，静态 brightness 0.92，释放无过冲 |
| state | 160ms | 输入、选中和小面积状态色变化 |
| feedback | 180ms | 更新提示、回顶按钮、曲名提示，淡入及少量平移 |
| popover | 220ms | 数据源、筛选及悬浮统计，淡入和平移 6px |
| dialog | 280ms | 全屏遮罩仅 opacity；`.ui-motion-dialog-panel` 平移 8px、等比缩放 0.98 |
| drawer | 320ms（进出） | 侧栏从右、底部抽屉从下进出；本体使用临时 translate3d，桌面活动内容只横向平移 |
| navigation | 280ms | 主导航选中滑块自然收敛，拖动直接跟随输入 |
| navigation-panel / navigation-panel-dismiss | 400 / 280ms | 卡片／乐曲统计菜单从按钮位置连同内容等比舒展；整体略过冲后收敛，软轮廓恢复圆角面板，收起回到按钮 |
| dismiss | 160ms | 浮层离场，立即 inert，完成后由 Vue 隐藏/移除 |

`tokens.css` 是唯一参数源。CSS 消费简写 `var(--ui-motion-press)` 等；`getUiMotionTiming(role, element)` 从同一 token 读取时长和曲线，兼容生产压缩后的 `.32s`，每次交互只读取一次。`motion.css` 拥有原生控件动态反馈；`pjsk-ui-action--image` 与 `pjsk-ui-action` 一起用于曲绘和筛选图标，使用 opacity 0.85 的按压反馈，保留语义灰度滤镜。原生 checkbox/radio/select/range 遵循浏览器输入行为，不额外移动其值或模仿原生弹窗。

原生按钮的悬停反馈由共享 `::before` 状态层提供，使用 state 时长进入、release 时长退出；指针停留时保持高亮，不能用短暂 keyframes 或反复切换渐变代替。仅在 `(hover: hover) and (pointer: fine)` 下响应悬停，按下反馈仍适用于触屏。状态层不接受指针事件、不改变命中区域、不替换选中背景；`::after` 保留给现有提示。零优先级定位规则不得覆盖固定按钮和局部定位。玻璃按钮保留其光学伪元素，在已有背景图下叠加共享 hover 色，材质规则仍归 `liquid-glass.css`。禁用按钮不显示交互状态层，减少动态效果时保留静态反馈。

具有指针捕获的主导航通过 `data-ui-control-pressed="true"` 补充原生 `:active`，由现有导航手势 owner 标记实际按下的按钮。触屏可能延迟原生按压状态；显式状态仍使用共享按压样式，不建立第二套动画。松开、取消、失去指针捕获和切换布局统一清除该状态，禁用导航不得开始按压或拖动。拖动结束后的点击拦截只处理重复指针点击，键盘或辅助技术产生的 `detail=0` 激活仍可正常切换页面。

`UiSurfaceTransition.vue` 不增加 DOM，不移动业务状态。`useUiSurfaceMotion.js` 按元素拥有 WAAPI 动画：先批量读取绘制状态，暂停首姿态并经双 RAF 后播放，以 `Animation.finished` 收尾；快速反向从当前姿态接续。Vue 仍负责 v-if/v-show 的可见性，离场内容保留到动画结束并立即 inert。取消、减少动态效果变化、KeepAlive 离开和卸载会清理动画与监听。不得再给这些 surface 叠加 CSS enter/leave 动画或独立结束定时器。

`kind="drawer"` 配合 `edge="right"` 或 `edge="bottom"`，进出均使用 drawer 时长；首姿态准备合成变换，结束后移除临时 transform。方向改变立即结清旧动画。预测编辑器的初始手机状态在 setup 时按当前 viewport 判断，首次显示也必须从底部进入，不再依赖旧的 CSS slide 结束计时。

`kind="navigation"` 使用独立的 navigation-panel / navigation-panel-dismiss 时长，保持主导航滑块原有时长和无过冲轨迹。导航 owner 在展开按钮的 click 捕获阶段记录按钮实际位置，支持指针、键盘与程序激活，并在收起时更新目标位置。`navigationUnfoldMotion.js` 根据菜单静止尺寸预先计算兼容的八段三次曲线路径，以及归一化阻尼弹簧的平移与等比缩放，再由原生 WAAPI 播放 `transform`、`clip-path: path(...)` 与 opacity：整张菜单从按钮位置舒展，略过冲后收敛；软轮廓随动作恢复为圆角面板。直接子内容只淡入淡出，随父菜单一起等比移动，保持文字图标的比例；不插值布局宽高、网格或滚动位置。临时 SVG 细描边跟随原生动画时钟，RAF 仅插值预计算的坐标，不读取布局或 computed style；完成、取消和离开页面都移除描边。该轮廓动画会产生局部绘制，不视为纯合成动画。不支持 path 的浏览器降级为左上固定点的 0.9 等比缩放。

菜单移动期间共用玻璃 motion lease，暂停 SVG 折射并保留 CSS frost，结束或取消后恢复。快速反向从当前变换、轮廓与内容透明度接续；窗口尺寸变化立即结清基于旧尺寸的动画。减少动态效果时直接切换可见性；KeepAlive 离开、卸载和外部取消均清理动画、描边 RAF、触发按钮监听与折射暂缓。

密集列表不做悬停横移；普通导航行与数据源行使用共享按压等比缩小，中心和布局尺寸保持不变。卡片和乐曲的详情浮层沿用共享 state 过渡，头像开关只平移。页面切换依靠选中滑块提供反馈，不同时绘制两份密集页面。桌面和手机的三页滑块静止时只保留选中阴影，按压或切页时显现无阴影的玻璃；在按下时等比膨胀至 1.2，文字图标按钮保持原尺寸，并继续提供明暗反馈；松开恢复，保留现有光学按压强度变化。滑块使用独立 selector 比例，普通按钮仍缩至 0.97；位置使用独立 translate，缩放不得影响滑块中心。拖动直接跟随输入，抽屉拖动期间关闭高度过渡，松手才进入吸附。原生滚动与 `scrollNavigation.js` 的唯一导航所有权保持不变。

性能约束：禁止 `transition: all`、未指定属性的过渡、裸时长、filter/backdrop-filter/阴影插值和持续装饰动画；不为全站控件长期设置 will-change、不新增逐帧布局测量。仅真实加载保留 spinner/shimmer；减少动态效果下静止并保留文字。`check:ui` 使用 Vite 已有的 PostCSS 依赖逐规则检查，包括连续声明、长写法、动画 keyframes、标准 token 和样式导入。长写法 duration/delay 必须在同一规则中明确 transition-property 或 transition，避免 CSS 默认的 all；无限 iteration-count 必须明确对应加载动画。

活动普通卡、FES 卡与歌曲详情的内容只在真正首次打开时创建，关闭后保留以复用图片和内容。隐藏详情的加载 shimmer 必须暂停；开启、延迟悬停、键盘焦点、点击固定、边缘定位和再次打开仍采用原交互。

## 11. 暂缓事项

以下事项不属于当前已实现的 UI 治理能力，不能在普通整理提交中顺手完成：

- 合并相似但不完全相同的颜色、间距、圆角、阴影或字体值；
- 因无障碍目标而改变既有控件尺寸；
- 页面布局重设计或新的响应式换行方案；
- 新字体、新图标或新的组件库；
- feature-specific dynamic styles 与 export-only styles 的迁移/统一。

这些事项需要单独的视觉设计、行为范围和回归评审；本规范不把它们描述为已经完成。
