# UI 系统开发规范

这份规范是维护者修改 PJSK Planner UI 时的代码级约束。实现以 `src/styles/tokens.css`、`src/styles/primitives.css`、`src/ui/breakpoints.js`、三个 scoped CSS 片段和 `scripts/check-ui-policy.js` 为准；文档只记录当前已经实现的结构。

## 1. 范围与保真原则

- 只有声明和值都完全相同的重复项才可以抽成 token 或共享片段。颜色、间距、阴影、圆角或尺寸只要有差异，就留在原组件；例如 Card Stats 面板圆角 `28px` 与 Song Stats 面板圆角 `18px` 不能合并。
- 当前视觉值是冻结的：字体、字号、行高、间距、尺寸、圆角、颜色、渐变、阴影、透明度、动效、DOM、class 和功能行为都不得因“整理”而改变。
- 本阶段唯一允许的视觉/响应式变化是断点规范化：Card Stats 两处原 `760px` 的紧凑规则统一到 `768px`；与 CSS 紧凑/导出边界对应的运行时 `1200px` 判断采用包含 `1200px` 的语义。除此之外不得顺手改布局。
- 现有胶囊控件的 `border-radius: 999px` 是 UI 合同的一部分。已有控件的按下反馈（变暗/缩放）以及释放后的恢复也属于合同；修改时必须保留 `:active` 与释放后的原有行为。
- 不因为本规范而引入新的主题、组件包装、字体、图标或布局系统。

## 2. 加载顺序

`src/main.js` 的全局样式顺序固定为：

```text
src/styles/tokens.css → src/style.css → src/styles/liquid-glass.css → src/styles/primitives.css
```

`tokens.css` 只提供 `:root` 下的 `--ui-*` 值，必须先加载，供基础样式、全局 primitive 和 SFC 样式解析。`style.css` 保留应用级基础规则。`primitives.css` 必须继续由 `src/main.js` 以全局 import 加载，并位于基础规则之后，以维持现有的 base-before-primitive cascade 顺序：通用 checkbox、pill、table 和 circle 规则在相同 selector 下继续拥有原来的后置优先级。禁止把 primitives 改成局部或 SFC import，也不要用新的 Vue wrapper 改变 DOM 或 specificity。

## 3. Token 分层

| 层级 | 当前 token | 使用边界 | 兼容 alias |
| --- | --- | --- | --- |
| Shell glass | `--ui-shell-glass-*`、`--ui-shell-active-*` | 顶部 shell 与 Event History 共用的玻璃背景、边框、阴影和 active 状态 | App 的 `.nav-tabs` 保留 `--top-*`；Event History 保留 `--history-*` |
| Stats navigation | `--ui-stats-nav-*`、`--ui-stats-control-radius` | Card Stats 与 Song Stats 统计导航的尺寸、玻璃材质、控件状态和 active 状态 | `.pjsk-stats`、`.pjsk-song-stats` 继续使用 `--stats-nav-*`、`--stats-radius-btn` 等 `--stats-*` |
| Neutral global controls | `--ui-control-bg`、`--ui-control-bg-hover`、`--ui-control-border`、`--ui-control-border-hover`、`--ui-control-label`、`--ui-control-label-muted` | `src/styles/primitives.css` 的既有通用控件 | selector 和局部覆盖仍由各自原位置负责 |
| Motion | `--ui-motion-control`、`--ui-motion-shimmer-duration` | 通用控件过渡和共享图片加载 shimmer | 组件不把动效值重新扩散成全局 feature token |

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
| Refractive | `.ui-liquid-glass.ui-liquid-glass--refractive` + `v-liquid-glass` | 顶部 `.nav-tabs`。插件为每个已连接表面生成或复用 SVG 边缘位移滤镜。 |
| Prominent | `.ui-liquid-glass.ui-liquid-glass--prominent` + `v-liquid-glass` | Card/Song Stats 的 `.stats-nav` 与紧凑态 `.floating-menu-btn`、Event History 的 `.filter-bar` / `.filter-panel`、App 的 `.source-menu`。这是唯一的强调玻璃层，内部 group/control/input/option 使用语义 token，不能追加子级折射。 |
| Regular | `.ui-liquid-glass.ui-liquid-glass--regular` + `v-liquid-glass` | Predict drawer 与 Special Predict toolbar 的既有常规材质和 outer-surface refraction；不把 prominent recipe 复制到这些 consumer。 |
| Modal | `.ui-liquid-glass.ui-liquid-glass--modal`，CSS-only readable frost | App 更新/导出状态弹窗和 Event History 的未保存预测切换弹窗。遮罩与对话框语义仍保持 local。 |
| Chip | `.ui-liquid-glass.ui-liquid-glass--chip`，CSS-only | 小型、重复的 pill/chip；不得挂 directive。 |

材质本身只在 `tokens.css` 中定义：`--ui-glass-ambient-image` 提供带克制暖玫瑰色的中性环境场；各 tier 的 `--ui-glass-*-bg` 保持近无色透射。prominent tier 独占 `--ui-glass-shadow-prominent` 的外部深度与五道静态 inset optical rim，以及 `--ui-glass-optical-rim-prominent` 的 1px conic 边缘 caustic。`liquid-glass.css` 只把 token 应用于 tier，并以不接收 pointer event 的 `::before` 绘制宽阔的 pointer-driven specular highlight、以 prominent `::after` 绘制仅边缘可见的 masked static rim；SVG 位移仍只属于外层 directive。不得在 consumer 中复制 gradient、shadow、filter 或 pseudo-element recipe。

Event History 的 `.filter-bar`（操作栏）、`.filter-panel` 和 App 的 `.source-menu`（数据源面板）明确使用 `prominent` tier，并各自只拥有一个外层 `v-liquid-glass`/SVG `url(#...)` 位移；Card/Song Stats 的完整与紧凑导航遵循同一规则。它们依靠较高的白色雾化层与语义内部填充在滚动/密集文本上保持可读性；顶部导航维持既有 refractive tier。

一个 glass 表面只拥有一个材质。其子元素、重复内容卡片、导出面板、列表行和数据内容 panel 必须保持原有局部表面，不能追加 `.ui-liquid-glass` 或 `v-liquid-glass`。这避免嵌套 backdrop/filter、额外 SVG 位移和导出画面漂移。

`liquidGlassPlugin` 是唯一的 refraction 生命周期 owner：它维护一个共享 `#ui-liquid-glass-filter-host`，引用计数复用等几何和已解析 refraction config 的滤镜，并由插件级 KeepAlive bridge 在 cached tab `deactivated` 时暂停表面、释放 pointer/window listener、ResizeObserver、timer/RAF、filter、attribute 和内联 style；`activated` 时只恢复一次，最终 directive unmount 才销毁注册。不得用 per-consumer lifecycle hook、document-wide observer 或 per-element MutationObserver 替代它。

SVG blur 由每个外层表面的计算 CSS property `--ui-glass-refraction-blur-radius` 决定：未设置、非法或负值时回退为 `GLASS_PRESET.blurRadius` 的 `2`（`feGaussianBlur stdDeviation="0.7"`），值上限为 `64`。prominent tier 把它设为 `--ui-glass-refraction-blur-prominent: 16`，因此生成 `stdDeviation="5.6"`；它还映射 `--ui-glass-refraction-strength-prominent: 1.14` 与 `--ui-glass-refraction-spread-prominent: 1.45` 到每个外层的 runtime config。运行时只接受有限正数（缺失、非法或非正数回退 `1`），strength 上限为 `2`，spread 限制为 `0.5..2`；strength 同时作用于 edge/rim/corner/ripple 强度，spread 仅放宽 edge/rim 衰减而不启用中心 warp。已解析 config 与 blur 同时参与位移缓存键、共享和 SVG filter margin，不能在 consumer 中用内联 recipe 替代。

SVG `url(#filter)` enhancement 只在 Chromium 且根状态为 `data-ui-glass-mode="refractive"` 时启用。其他引擎保留 CSS frost；`prefers-reduced-transparency`、高对比/forced-colors 会强制 opaque 并隐藏 prominent `::after` rim，`prefers-reduced-motion` 停止 ambient motion 并隐藏 pointer-following specular，但保留不依赖 pointer 的 prominent static rim。测试可在导航后写 root dataset 来选择确定模式，但生产代码不得把该覆盖写入 storage 或 URL。

非 Chromium 的 `data-ui-glass-mode="frosted"` 必须通过独立的 `--ui-glass-filter-frosted-*` token 对齐 Chromium 的光学模糊量，而不能直接复用可读性优先的通用高模糊值。当前 refractive / regular / prominent 回退分别为 `2px / 3px / 6px`；这些值按材质模式选择，与 viewport 断点无关，因此真实移动设备与桌面窄视口保持相近的透明感，同时继续保留 CSS rim、specular 和 prominent optical rim。`scripts/check-ui-policy.js` 会阻止三档回退缺失、未映射或重新超过约束上限。

SFC 只保留既有几何、定位、响应式断点和语义状态色；central stylesheet 仅拥有 glass tokens/material。任何新增 consumer 必须同时证明不改变字体、间距、边界框、圆角、DOM 或 export PNG blob。

## 5. Scoped 共享片段

共享片段必须通过每个 SFC 的 `<style scoped src="...">` 编译，不能在 `main.js` 或全局 stylesheet 中 import。当前片段和完整消费者如下：

| 片段 | 消费者 | 内容 |
| --- | --- | --- |
| `src/styles/scoped/stats-navigation-base.css` | `src/components/CardStats.vue`、`src/components/SongStats.vue` | 统计导航的基础布局、玻璃面板、链接和 active 规则 |
| `src/styles/scoped/stats-navigation-responsive.css` | `src/components/CardStats.vue`、`src/components/SongStats.vue` | 统计导航在 `1200/900/520px` 处的响应式规则 |
| `src/styles/scoped/media-load-shimmer.css` | `src/components/CardStats.vue`、`src/components/SongStats.vue`、`src/components/EventHistory.vue` | 图片加载 shimmer、keyframes 和 reduced-motion 规则 |

例如消费者必须保留类似以下标签（路径按 SFC 所在目录解析）：

```vue
<style scoped src="../styles/scoped/stats-navigation-base.css"></style>
```

外部片段在每个消费者的 scoped pipeline 中独立编译，因此生成 CSS 仍带有该 SFC 的 scope。拆分 inline style 时，要把外部片段放在它替代的最早规则所在的 cascade 位置；组件专有声明和后续 override 留在原位置。这样才能同时保持 scoped selector、层叠顺序和 Card/Song/Event 各自的局部差异。`npm.cmd run check:ui` 会检查片段存在、每个消费者的 `scoped` source、未声明 viewport 宽度以及仍重复留在 inline scoped block 中的 exact rule。

## 6. 响应式策略

以下是当前注册在 `src/ui/breakpoints.js` 的 viewport 概念；CSS 仍使用数字 media condition，不能把 CSS media 条件改写成 custom property：

| 边界 | 当前含义与归属 |
| --- | --- |
| `520px` | extra-small phone；通常是 `max-width: 520px` 与 `min-width: 521px` 的两侧 |
| `700px` | editor/small transition；保留现有 `max-width: 699px` / `min-width: 700px`，或组件为保持 exact `700px` 的现有归属而使用 `min-width: 701px`。不得为了整齐改动 `699/700/701` 的 ownership |
| `768px` | small-tablet transition；Card Stats 两处紧凑规则使用 `max-width: 768px`，另一侧为 `min-width: 769px` |
| `900px` | compact application layout；`max-width: 900px` 与 `min-width: 901px` |
| `1000px` | 仅 Event History preview-panel 定位/宽度的 JavaScript feature threshold（`historyPreviewMax`）；不是新的 CSS viewport breakpoint |
| `1200px` | tablet/desktop 与导出边界；CSS 使用 `max-width: 1200px` / `min-width: 1201px`，对应的运行时判断在需要模拟 CSS compact/export 侧时包含 exact `1200px` |
| `1360px` | Card Stats 专用 wide 上界；保持 feature-specific，不推广到其他页面 |

下列条件是独立概念，不得写进 viewport 断点表或被合并：

- `680px` 是 Card/Song/Event 导出或捕获分层使用的 `minSide = min(width, height)` 阈值，不是 viewport 宽度；
- `(hover: none)`、`(pointer: coarse)` 是输入能力条件；既有 coarse-pointer 判断和 Event History media clause 要保持原位置；
- `prefers-reduced-motion: reduce` 是用户动效偏好，当前由 App 和 shimmer 规则处理；
- `@container` 的 `special-limited`、Anvo/其他容器宽度阈值是组件容器条件，不是 viewport media query。policy checker 会忽略这些 container query。

新增 CSS viewport 宽度必须先有明确的功能含义，并同步 policy 白名单、边界测试和本规范；不能仅为减少数字种类而合并。

## 7. 修改流程

1. **比较 exact value。** 新增或复用 token 前，在现有 selector 和消费路径中逐项比较值、声明和继承范围。仅 exact duplicate 可进入 `tokens.css`；相似值继续使用 local variable，并保留兼容 alias。
2. **说明断点含义。** 新增 viewport breakpoint 前写明它解决的 feature、两侧 ownership 和测试宽度；运行时阈值使用 `UI_BREAKPOINTS`，CSS 继续使用数字条件。`680`、pointer/hover、reduced-motion 和 container 条件不能冒充 viewport breakpoint。
3. **保持 scoped 位置。** 共享 CSS 只抽取 exact duplicated author-source rules；每个消费者用 `<style scoped src>`，并把标签放在被替代规则的原 cascade 位置。不要把 feature/data/export 样式提升为 global。
4. **完成验证。** 运行第 8 节的 policy、unit、build 和 Git 检查；涉及视觉变化时，还必须在临时开发分支完成对应视口的人工或自动化对比。
5. **隔离阶段资产。** 一次性的视觉基线、实现计划、审查报告和测试输出不得长期进入正式分支；需要保留时放入本地忽略目录，或通过专用归档 tag 保存。

## 8. 验证命令

每条命令独立执行，并在实现报告中记录真实输出与 exit code：

```powershell
npm.cmd run test:unit
npm.cmd run check:ui
npm.cmd run build
git diff --check
git status --short
```

预期是 unit tests 零失败、policy 输出 `UI policy check passed`、Vite production build 成功且 `git diff --check` 无输出。涉及视觉材质、布局或响应式边界的改动，应在临时开发分支补充定向视觉验收；阶段测试与截图资产不长期保留在正式分支。

## 9. 暂缓事项

以下事项不属于当前已实现的 UI 治理能力，不能在普通整理提交中顺手完成：

- 合并相似但不完全相同的颜色、间距、圆角、阴影或字体值；
- 因无障碍目标而改变既有控件尺寸；
- 页面布局重设计或新的响应式换行方案；
- dark mode 或全局主题切换；
- 新字体、新图标或新的组件库；
- feature-specific dynamic styles 与 export-only styles 的迁移/统一。

这些事项需要单独的视觉设计、行为范围和回归评审；本规范不把它们描述为已经完成。
