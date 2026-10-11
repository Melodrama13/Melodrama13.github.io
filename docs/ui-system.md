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
src/styles/tokens.css → src/style.css → src/styles/liquid-glass.css → src/styles/primitives.css → src/styles/motion.css
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
| Chip | `.ui-liquid-glass.ui-liquid-glass--chip`，CSS-only | 小型、重复的 pill/chip；不得挂 directive。 |

这五项是视觉材质等级，不是浏览器运行模式。运行模式另分 Chromium 的 SVG `refractive`、WebKit 等引擎的 CSS `frosted`、辅助功能要求下的 `opaque`；同一材质等级在三种运行模式下都有对应呈现。选材依据是玻璃背后的内容密度和前景可读性，不是设备名称本身。Predict Editor 恰好以 `900px` 切换侧拉与底部布局，因此只在外层抽屉随布局切换 Refractive / Prominent；桌面侧拉的透射和位移参数在共享 token 中独立配置，底部抽屉仍沿用 Prominent。桌面与手机端编辑器、活动筛选栏／面板、卡片及乐曲统计导航、悬浮统计窗共用强化的 optical rim 和 CSS-only 微镜片控件边：外框加强上亮下暗的边缘，内部中性控件只用淡暗轮廓与细内高光，不增加材质等级、子级 backdrop-filter 或 SVG 位移。悬浮统计的被动表面使用中性透色，不保留旧青绿色底色；保存、选中、禁用、聚焦等语义状态色仍由原组件控制。opaque、低透明度与高对比模式取消装饰性微镜片阴影。

材质本身只在 `tokens.css` 中定义：`--ui-glass-ambient-image` 提供带克制暖玫瑰色的中性环境场；各 tier 的 `--ui-glass-*-bg` 保持近无色透射。prominent tier 独占 `--ui-glass-shadow-prominent` 的外部深度与五道静态 inset optical rim，以及 `--ui-glass-optical-rim-prominent` 的 1px conic 边缘 caustic。需强化边缘的 Prominent consumer 与桌面折射编辑器可加 `.ui-glass-optical-detail`：共享 `--ui-glass-optical-prominent-*` 外框 token 与 `--ui-glass-optical-micro-*` 内部中性控件 token；此 class 仅增加光学边缘，不改变 Refractive 的透色或滤镜。`liquid-glass.css` 只把 token 应用于 tier，并以不接收 pointer event 的 `::before` 绘制宽阔的 pointer-driven specular highlight、以 `::after` 绘制仅边缘可见的 masked static rim；SVG 位移仍只属于外层 directive。不得在 consumer 中复制 gradient、shadow、filter 或 pseudo-element recipe。

Event History 的 `.filter-bar`（操作栏）、`.filter-panel` 和 App 的 `.source-menu`（数据源展开面板）明确使用 `prominent` tier，并各自只拥有一个外层 `v-liquid-glass`/SVG `url(#...)` 位移；仅桌面顶栏的数据源按键使用折射态，展开面板不随按键改变材质。Card/Song Stats 的完整与紧凑导航遵循同一规则。它们依靠较高的白色雾化层与语义内部填充在滚动/密集文本上保持可读性；桌面顶栏与手机底栏的三页切换均以独立折射滑块承载选中态。

三页切换栏、滑块及桌面顶栏其他胶囊使用 `data-ui-glass-profile="lens"`，仍属于 Refractive 材质。位移沿胶囊轮廓法线计算：弧面宽度为短边的 23%（上限 32px），中央超过一半区域保持低畸变；最外沿较窄的 curl 区域允许局部取样回折，模拟倒影与哈哈镜边缘，回折不延伸到中心。Chromium 在该边缘位移场中分别以 `1.055 / 1 / 0.945` 倍位移采样 RGB，增强局部色散；中心保持零位移、不追加整体模糊。曲率继续控制局部柔散射及方向性明暗反光。Prominent 光学边框及小型镜片的 CSS rim 只在约 1px 边缘加入淡蓝紫过渡，非 Chromium 回退不伪装成真实 RGB 折射。按压通过独立 `scale` 动画放大滑块，`data-ui-glass-pressed` 同步驱动其滤镜强度与反光，拖动平移仍即时跟随；每个透镜使用独立滤镜，避免动画影响其他实例。

内层滑块另标记 `data-ui-glass-lens-role="selector"`：边缘弧面宽度为短边的 25%（同样上限 32px），中央一半保持低畸变。该角色采用向外的背景反向采样，使外层栏的上边线在成像中向下弯、下边线向上弯；滑块自身轮廓仍然外凸。滑块反光沿垂直方向对称分布，顶部左右角不因光照方向出现一明一暗；外层轨道仍保留轻微方向性反光。滑块常态仅显示选中阴影，不绘制玻璃底色、描边或 backdrop；按压、拖动和点击切页期间显现玻璃，同时移除滑块阴影。`useAppTabGliderFeedback.js` 只在状态变动及原生动画完成或取消的边界读取动画状态，等待实际平移和回弹结束再恢复阴影；快速反向与取消用所有权序号隔离旧完成回调，卸载和布局切换清理等待。沿用缓存滤镜，不重复创建光学实例，也不逐帧读取布局。桌面与手机滑块按压时使用 `--ui-motion-selector-press-scale: 1.2` 等比膨胀，文字与图标按钮保持原尺寸；松开恢复为 `1`。位置由独立 `translate` 承担，膨胀不能影响任一位置的中心或布局尺寸。弯曲来自实时背景而非固定装饰线，因此随拖动作用于外层栏、文字和图标；不改变外层栏及其他玻璃面的曲线。此为视觉近似，不宣称复现苹果的内部光学模型。

顶栏胶囊和交互中滑块的反射描边使用 `--ui-glass-lens-rim-width: 0.75px`；上下高光及左右内阴影由共享 lens reflection / bevel tokens 控制。轨道也使用较淡的边线和阴影。保留细边反光、透明底色与原有折射，不通过叠加宽内阴影强化厚度；此微调不增加滤镜、动画属性或逐帧计算，也不改变控件的外框尺寸。

外层轨道、文字图标按钮、内层滑块按此顺序绘制，滑块同时折射已合成的外层背景和文字图标。桌面顶栏用独立 `.nav-tabs-glass` 承载背景，`.desktop-tab-switcher` 留在原有顶栏位置；顶栏容器自身不使用 backdrop-filter，避免新增祖先 backdrop root 阻断滑块采样。桌面滑块按实际按钮位置和宽度对齐，保留宽屏原文案及紧凑顶栏短文案；桌面与手机共用拖动距离判定、点击和键盘按钮语义。滑块不接收指针事件。手机切换栏宽度为 `min(60vw, 320px)`，高度为 `56px`，按钮触控高度至少 `46px`，源按钮与回顶按钮同步对齐。WebKit 保留 CSS 磨砂与按压反馈，不宣称支持背景位移；减少动态效果时取消膨胀动画；opaque 模式以实色外框承载内容，滑块改为透明轮廓，避免遮住下层文字。

一个 glass 表面只拥有一个材质。其子元素、重复内容卡片、导出面板、列表行和数据内容 panel 必须保持原有局部表面，不能追加 `.ui-liquid-glass` 或 `v-liquid-glass`。这避免嵌套 backdrop/filter、额外 SVG 位移和导出画面漂移。

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
- dark mode 或全局主题切换；
- 新字体、新图标或新的组件库；
- feature-specific dynamic styles 与 export-only styles 的迁移/统一。

这些事项需要单独的视觉设计、行为范围和回归评审；本规范不把它们描述为已经完成。
