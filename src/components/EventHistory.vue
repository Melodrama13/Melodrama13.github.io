<template>
  <div ref="historyWrapperRef" class="event-history-wrapper" :class="{ 'with-editor': isEditorOpen }">
    <transition name="float-stats-fade">
      <div
        v-if="isEditorOpen"
        class="predict-preview-floating"
        aria-live="polite"
      >
        <div class="preview-config-panel" :class="{ 'is-collapsed': previewFloatingCollapsed }" :style="previewConfigPanelStyle" @mousedown="bringPreviewConfigToFront" @touchstart="bringPreviewConfigToFront">
          <div class="preview-config-head" @mousedown.prevent="startDragPreviewConfig($event)" @touchstart.prevent="startDragPreviewConfigTouch($event)">
            <span>悬浮统计（最多5个）</span>
            <div class="preview-config-actions">
              <button class="preview-config-reset" @mousedown.stop @touchstart.stop @click="previewFloatingCollapsed = !previewFloatingCollapsed">{{ previewFloatingCollapsed ? '展开统计' : '收起统计' }}</button>
              <button v-if="!previewFloatingCollapsed" class="preview-config-reset" @mousedown.stop @touchstart.stop @click="resetPreviewPanelLayout">重置布局</button>
            </div>
          </div>
          <div v-show="!previewFloatingCollapsed" class="preview-config-options">
            <button
              v-for="opt in previewPanelOptions"
              :key="`opt-${opt.id}`"
              class="preview-config-btn"
              :class="{ 'is-active': opt.selected }"
              :disabled="opt.disabled || (!opt.selected && selectedPreviewPanelIds.length >= 5)"
              :title="opt.tip || ''"
              @click="togglePreviewPanelType(opt.id)"
            >
              {{ opt.title }}
            </button>
          </div>
          <div v-if="!previewFloatingCollapsed && selectedPreviewPanelIds.includes('attr-five')" class="preview-char-select" :class="{ 'is-collapsed': previewAttrCharCollapsed }">
            <div class="preview-char-select-title">
              <span>属性统计人选（最多8人）</span>
              <div class="preview-char-select-actions">
                <button class="preview-char-select-toggle" @click="clearPreviewAttrChars" :disabled="selectedPreviewAttrChars.length === 0">清空</button>
                <button class="preview-char-select-toggle" @click="previewAttrCharCollapsed = !previewAttrCharCollapsed">{{ previewAttrCharCollapsed ? '展开' : '收起' }}</button>
              </div>
            </div>
            <div v-show="!previewAttrCharCollapsed" class="preview-char-chips">
              <button
                v-for="name in previewSelectableChars"
                :key="`pick-${name}`"
                class="preview-char-chip"
                :class="{ 'is-active': selectedPreviewAttrChars.includes(name) }"
                :disabled="!selectedPreviewAttrChars.includes(name) && selectedPreviewAttrChars.length >= 8"
                @click="togglePreviewAttrChar(name)"
                :title="name"
              >
                <img :src="`/chibi_s/${getCharAbbr(name)}.webp`" class="preview-char-chip-avatar" />
              </button>
            </div>
          </div>
          <div v-if="!previewFloatingCollapsed && selectedPreviewPanelIds.includes('festival')" class="preview-char-select preview-festival-select">
            <div class="preview-char-select-title">
              <span>节日（单选）</span>
            </div>
            <div class="preview-festival-chips">
              <button
                v-for="fest in PREVIEW_FESTIVAL_TYPES"
                :key="`preview-festival-${fest}`"
                class="preview-festival-chip"
                :class="{ 'is-active': selectedPreviewFestival === fest }"
                @click="setSelectedPreviewFestival(fest)"
              >
                {{ fest }}
              </button>
            </div>
            <label v-if="canTogglePreviewFestivalFes(activePreviewFestivalName)" class="preview-festival-fes-toggle">
              <input v-model="previewFestivalFesToggles[activePreviewFestivalName]" type="checkbox" />
              <span>统计FES</span>
            </label>
          </div>
        </div>
        <div
          v-show="!previewFloatingCollapsed"
          v-for="panel in previewFloatingPanels"
          :key="panel.id"
          :class="['preview-panel', { 'is-collapsed': isPreviewPanelCollapsed(panel.id) }]"
          :style="getPreviewPanelStyle(panel.id)"
          @mousedown="bringPreviewPanelToFront(panel.id)"
          @touchstart="bringPreviewPanelToFront(panel.id)"
        >
          <div class="preview-panel-head" @mousedown.prevent="startDragPreview(panel.id, $event)" @touchstart.prevent="startDragPreviewTouch(panel.id, $event)">
            <span class="preview-icon">{{ panel.icon }}</span>
            <span class="preview-title">{{ panel.title }}</span>
            <button
              class="preview-collapse-btn"
              :title="isPreviewPanelCollapsed(panel.id) ? '展开' : '收起'"
              @mousedown.stop
              @touchstart.stop
              @click.stop="togglePreviewPanelCollapsed(panel.id)"
            >
              {{ isPreviewPanelCollapsed(panel.id) ? '▸' : '▾' }}
            </button>
            <span class="preview-drag-hint">拖动</span>
          </div>
          <div v-show="!isPreviewPanelCollapsed(panel.id)" class="preview-steps" :style="getPreviewStepsStyle(panel.id)">
            <template v-if="panel.id === 'attr-five'">
              <div class="preview-attr-head">
                <span>角色</span>
                <img src="/elements/pure.png" class="preview-attr-head-icon" title="Pure" />
                <img src="/elements/cool.png" class="preview-attr-head-icon" title="Cool" />
                <img src="/elements/cute.png" class="preview-attr-head-icon" title="Cute" />
                <img src="/elements/happy.png" class="preview-attr-head-icon" title="Happy" />
                <img src="/elements/mysterious.png" class="preview-attr-head-icon" title="Mysterious" />
              </div>
              <div v-for="row in previewAttrFiveRows" :key="`attr-five-${row.name}`" class="preview-attr-row" :style="getPreviewAttrRowStyle(row.name)">
                <img :src="`/chibi_s/${getCharAbbr(row.name)}.webp`" class="preview-attr-avatar" :title="row.name" />
                <span>{{ row.Pure }}</span>
                <span>{{ row.Cool }}</span>
                <span>{{ row.Cute }}</span>
                <span>{{ row.Happy }}</span>
                <span>{{ row.Mysterious }}</span>
              </div>
              <div v-if="previewAttrFiveRows.length === 0" class="preview-step preview-step-empty">
                <span class="preview-meta">请先在上方选择最多8位角色</span>
              </div>
            </template>
            <template v-else-if="panel.id === 'festival'">
              <div v-if="panel.festivalName" class="preview-festival-head">
                当前节日：{{ panel.festivalName }}
                <span v-if="panel.festivalShowFes" class="preview-festival-fes-state">（统计FES：{{ panel.festivalIncludeFes ? '开' : '关' }}）</span>
              </div>
              <div v-for="row in panel.festivalRows" :key="`festival-${row.key}`" class="preview-festival-row">
                <span class="preview-festival-label">{{ row.label }}</span>
                <div class="preview-avatars preview-festival-avatars">
                  <div v-for="char in row.chars" :key="`festival-${row.key}-${char.name}`" class="preview-avatar-box preview-festival-avatar-box">
                    <img
                      :src="`/chibi_s/${getCharAbbr(char.name)}.webp`"
                      class="preview-avatar"
                      :title="char.name"
                    />
                    <img v-if="getFestivalPreviewUnitLogo(char.name)" :src="getFestivalPreviewUnitLogo(char.name)" class="preview-festival-unit-logo" />
                    <span v-if="row.key !== 'none' && (char.count || 0) > 1" class="preview-festival-count">{{ char.count || 0 }}</span>
                    <span v-if="char.isPermOnly" class="preview-festival-perm">普</span>
                  </div>
                  <div v-if="!row.chars || row.chars.length === 0" class="preview-meta">暂无</div>
                </div>
              </div>
              <div v-if="!panel.festivalRows || panel.festivalRows.length === 0" class="preview-step preview-step-empty">
                <span class="preview-meta">当前活动不在节日统计范围内</span>
              </div>
            </template>
            <template v-else-if="panel.id === 'vs-last-four'">
              <table class="preview-vs-mini-table">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th v-for="u in PREVIEW_BOX_UNITS" :key="`pv-vs-head-${u}`">
                      <img :src="`/elements/${u}.png`" class="preview-vs-mini-unit-logo" :title="u.toUpperCase()" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in previewVsLastFourCompactRows" :key="`pv-vs-row-${row.name}`">
                    <th>
                      <img :src="`/chars/${getCharAbbr(row.name)}.png`" class="preview-vs-mini-avatar" :title="row.name" />
                    </th>
                    <td v-for="u in PREVIEW_BOX_UNITS" :key="`pv-vs-cell-${row.name}-${u}`" :style="getPreviewVsMiniDataCellStyle(row.daysByUnit[u])">
                      {{ row.daysByUnit[u] }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </template>
            <template v-else-if="panel.id === 'vs-unit-score'">
              <table class="preview-vs-score-table">
                <thead>
                  <tr>
                    <th>V\团</th>
                    <th v-for="u in PREVIEW_BOX_UNITS" :key="`pv-score-head-${u}`">
                      <img :src="`/elements/${u}.png`" class="preview-vs-mini-unit-logo" :title="u.toUpperCase()" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in previewVsUnitScoreRows" :key="`pv-score-row-${row.name}`">
                    <th>
                      <img :src="`/chars/${getCharAbbr(row.name)}.png`" class="preview-vs-mini-avatar" :title="row.name" />
                    </th>
                    <td v-for="u in PREVIEW_BOX_UNITS" :key="`pv-score-cell-${row.name}-${u}`">
                      <div v-if="row.attrsByUnit[u]?.length" class="preview-vs-score-icons">
                        <img
                          v-for="(attr, idx) in row.attrsByUnit[u]"
                          :key="`pv-score-attr-${row.name}-${u}-${idx}`"
                          :src="`/elements/${String(attr).toLowerCase()}.png`"
                          class="preview-vs-score-attr"
                          :title="attr"
                        />
                      </div>
                      <span v-else class="preview-vs-score-empty">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </template>
            <template v-else>
            <div v-for="step in panel.steps" :key="`${panel.id}-${step.count}`" class="preview-step">
              <span class="preview-count">{{ step.count }}</span>
              <div class="preview-avatars">
                <div v-for="char in step.chars" :key="`${panel.id}-${step.count}-${char.name}`" class="preview-avatar-box">
                  <img
                    :src="`/chibi_s/${getCharAbbr(char.name)}.webp`"
                    class="preview-avatar"
                    :title="char.name"
                  />
                  <div v-if="panel.id === 'reward'" class="preview-reward-sub">{{ char.rewardThreeCount || 0 }}+{{ char.rewardTwoCount || 0 }}</div>
                </div>
              </div>
            </div>
            <div v-if="panel.steps.length === 0" class="preview-step preview-step-empty">
              <span class="preview-meta">暂无数据</span>
            </div>
            </template>
          </div>
          <div
            v-if="!isPreviewPanelCollapsed(panel.id)"
            class="preview-resize-handle"
            @mousedown.prevent.stop="startResizePreview(panel.id, $event)"
            @touchstart.prevent.stop="startResizePreviewTouch(panel.id, $event)"
            title="拖动缩放"
          ></div>
        </div>
      </div>
    </transition>
    <div class="event-history" ref="historyContainer" @scroll.passive="handleHistoryScroll">
      <div ref="filterStickyRef" class="filter-sticky">
        <div class="filter-bar">
          <button @click="sortDesc = !sortDesc" class="sort-btn" :title="sortDesc ? '最新在前' : '最早在前'">
            {{ sortDesc ? '最新在前' : '最早在前' }}
          </button>
          <button
            @click="hideBirthdayRows = !hideBirthdayRows"
            :class="['nav-btn', 'compact-tip', { 'active-highlight': !hideBirthdayRows }]"
            :title="hideBirthdayRows ? '已隐藏生日行' : '显示生日行'"
            data-tip="生日行"
          >
            <img src="/elements/birthday.png" class="compact-btn-icon" alt="生日" />
          </button>
          <button
            @click="hideCollabPools = !hideCollabPools"
            :class="['nav-btn', 'compact-tip', { 'active-highlight': !hideCollabPools }]"
            :title="hideCollabPools ? '已隐藏联动卡池' : '显示联动卡池'"
            data-tip="联动卡池"
          >
            {{ hideCollabPools ? '联动隐藏' : '联动显示' }}
          </button>
          <button @click="scrollTo('top')" class="nav-btn compact-tip" title="顶部" data-tip="回到顶部">
            顶部
          </button>
          <button @click="scrollTo('current')" class="nav-btn current-btn compact-tip" title="当前活动" data-tip="当前活动">
            当期
          </button>
          <button @click="scrollTo('bottom')" class="nav-btn compact-tip" title="底部" data-tip="前往底部">
            底部
          </button>
          <button 
            @click="showFilter = !showFilter" 
            :title="hasActiveFilters ? '已启用筛选' : '筛选面板'"
            :class="['nav-btn', 'compact-tip', { 'active-highlight': hasActiveFilters || showFilter }]"
            data-tip="筛选面板"
          >
            {{ isCompactFilterBar ? '🔍' : filterPanelSummaryText }}
          </button>
          <button v-if="hasActiveFilters" @click="resetFilters" class="clear-btn" :title="isCompactFilterBar ? '重置筛选' : ''">
            {{ isCompactFilterBar ? '✕' : '重置筛选' }}
          </button>
        </div>
        <transition name="slide-fade">
          <div v-if="showFilter" class="filter-panel">
          <div class="filter-row">
            <span class="row-label">模式</span>
            <div class="btn-group">
              <button :class="{active: filterMode === 'single'}" @click="filterMode = 'single'; resetFilters()">卡片筛选</button>
              <button :class="{active: filterMode === 'event'}" @click="filterMode = 'event'; resetFilters()">活动筛选</button>
            </div>
          </div>

          <div v-if="filterMode !== 'event'" class="filter-row">
            <span class="row-label">角色</span>
            <div class="chip-group">
              <div v-for="(abbr, name) in CHAR_MAP" :key="name" 
                  :class="['char-chip', { 'is-selected': filterCriteria.selectedChars.includes(name) }]"
                  :title="name"
                  @click="toggleChar(name)">
                <img :src="`/chars/${getCharAbbr(name)}.png`" class="chip-img" />
                <span>{{ name }}</span>
              </div>
            </div>
          </div>

          <template v-if="filterMode === 'event'">
            <div class="filter-row">
              <span class="row-label">角色</span>
              <div class="chip-group">
                <div v-for="(abbr, name) in CHAR_MAP" :key="`event-char-${name}`"
                    :class="['char-chip', { 'is-selected': eventFilterCriteria.characters.includes(name) }]"
                    :title="name"
                    @click="toggleEventFilterCharacter(name)">
                  <img :src="`/chars/${getCharAbbr(name)}.png`" class="chip-img" />
                  <span>{{ name }}</span>
                </div>
              </div>
            </div>

            <div class="filter-row">
              <span class="row-label">是否Ban</span>
              <div class="btn-group-sm">
                <button
                  :class="{ active: eventFilterCriteria.isBan === 'yes' }"
                  :disabled="!canUseEventBanFilter"
                  @click="setEventBanFilter('yes')"
                >是</button>
                <button
                  :class="{ active: eventFilterCriteria.isBan === 'no' }"
                  :disabled="!canUseEventBanFilter"
                  @click="setEventBanFilter('no')"
                >否</button>
              </div>
            </div>

            <div class="filter-row">
              <span class="row-label">活动类型</span>
              <div class="btn-group-sm">
                <button
                  v-for="opt in EVENT_TYPE_FILTER_OPTIONS"
                  :key="`event-type-${opt.value}`"
                  :class="{ active: eventFilterCriteria.eventTypes.includes(opt.value) }"
                  @click="toggleEventFilterArray('eventTypes', opt.value)"
                >{{ opt.label }}</button>
              </div>
            </div>

            <div class="filter-row">
              <span class="row-label">卡池类型</span>
              <div class="btn-group-sm">
                <button
                  v-for="opt in EVENT_GACHA_FILTER_OPTIONS"
                  :key="`event-gacha-${opt.value}`"
                  :class="{ active: eventFilterCriteria.gachaTypes.includes(opt.value) }"
                  @click="toggleEventFilterArray('gachaTypes', opt.value)"
                >{{ opt.label }}</button>
              </div>
            </div>

            <div class="filter-row">
              <span class="row-label">活动节日</span>
              <div class="btn-group-sm">
                <button
                  v-for="fest in eventFestivalOptions"
                  :key="`event-festival-${fest}`"
                  :class="{ active: eventFilterCriteria.festivals.includes(fest) }"
                  @click="toggleEventFilterArray('festivals', fest)"
                >{{ fest }}</button>
              </div>
            </div>

            <div class="filter-row">
              <span class="row-label">活动属性</span>
              <div class="icon-group attributes">
                <img
                  v-for="attr in ['Happy', 'Mysterious', 'Cute', 'Cool', 'Pure']"
                  :key="`event-attr-${attr}`"
                  :src="`/elements/${attr.toLowerCase()}.png`"
                  :class="{ 'icon-active': eventFilterCriteria.attributes.includes(attr) }"
                  @click="toggleEventFilterArray('attributes', attr)"
                />
              </div>
            </div>

            <div class="filter-row">
              <span class="row-label">活动团体</span>
              <div class="icon-group units" :class="{ 'is-disabled': isEventUnitFilterDisabledByMix }" :title="isEventUnitFilterDisabledByMix ? '选择混活时不可选活动团体' : ''">
                <img
                  v-for="unit in ['ln', 'mmj', 'vbs', 'ws', 'nc', 'vs']"
                  :key="`event-unit-${unit}`"
                  :src="`/elements/${unit}.png`"
                  :class="{ 'icon-active': eventFilterCriteria.units.includes(unit), 'icon-disabled': isEventUnitFilterDisabledByMix }"
                  @click="toggleEventFilterArray('units', unit)"
                  :title="unit.toUpperCase()"
                />
              </div>
            </div>
          </template>

          <template v-if="filterMode === 'single' && filterCriteria.selectedChars.length > 0">
            <div class="filter-row">
              <span class="row-label">组合</span>
              <div class="icon-group units">
                <img v-for="(color, unit) in UNIT_COLORS" :key="unit" 
                    :src="`/elements/${unit}.png`" 
                    :class="{ 'icon-active': filterCriteria.unit === unit }"
                    @click="filterCriteria.unit = (filterCriteria.unit === unit ? null : unit)"
                    :title="unit.toUpperCase()" />
              </div>
            </div>

            <div class="filter-row">
              <span class="row-label">属性</span>
              <div class="icon-group attributes">
                <img v-for="attr in ['Happy', 'Mysterious', 'Cute', 'Cool', 'Pure']" 
                    :key="attr" :src="`/elements/${attr.toLowerCase()}.png`"
                    :class="{ 'icon-active': filterCriteria.attribute === attr }"
                    @click="filterCriteria.attribute = (filterCriteria.attribute === attr ? null : attr)" />
              </div>
            </div>

            <div class="filter-row">
              <span class="row-label">技能</span>
              <div class="btn-group-sm">
                <button v-for="(label, key) in { score_up:'分卡', accuracy:'判卡', recovery:'奶卡', p_score:'P分', unit_score: '团分', cfes_l: 'CFES血分', cfes_j: 'CFES判分', bfes_up: 'BFES' }" 
                        :key="key" :class="{ active: filterCriteria.skill === key }"
                        @click="filterCriteria.skill = (filterCriteria.skill === key ? null : key)">
                  {{ label }}
                </button>
              </div>
            </div>

            <div class="filter-row">
              <span class="row-label">稀有度</span>
              <div class="rarity-group">
                <div v-for="r in [1,2,3,4]" :key="r" 
                    :class="['rarity-item', { 'active': filterCriteria.rarity === r }]"
                    @click="filterCriteria.rarity = (filterCriteria.rarity === r ? null : r)">
                  <img v-for="n in r" :key="n" :src="`/elements/${r === 4 ? 'rstar' : 'ystar'}.png`" class="star-img" />
                </div>
                <div :class="['rarity-item', { 'active': filterCriteria.rarity === 'birthday' }]"
                    @click="filterCriteria.rarity = (filterCriteria.rarity === 'birthday' ? null : 'birthday')">
                  <img src="/elements/birthday.png" class="birthday-img" />
                </div>
              </div>
            </div>

            <div class="filter-row">
              <span class="row-label">类型</span>
              <div class="btn-group-sm">
                <button 
                  v-for="(label, key) in { 
                    perm: '常驻', limited: '普通限定', ue: 'UE限定', cfes: 'CFES', bfes: 'BFES', collab: '联动限定', movie: '剧场版' 
                  }" 
                  :key="key"
                  :class="{ active: filterCriteria.cardType === key }"
                  @click="filterCriteria.cardType = (filterCriteria.cardType === key ? null : key)"
                >
                  {{ label }}
                </button>
              </div>
            </div>
          </template>
          </div>
        </transition>
      </div>
      <div class="history-list" ref="listRef">
        <template v-for="row in displayRows" :key="row.key">
        <div
            v-if="row.kind === 'event'"
            :id="'event-' + row.event.id"
            class="event-item"
            :class="['event-item', getPredictStatus(row.event)]"
            @click="openPredictEditor(row.event)"
            :style="[
              isUnitRelated(row.event)
                ? { backgroundColor: getUnitColor(row.event.unit) + '20' }
                : { background: 'linear-gradient(45deg, rgba(253, 124, 193, 0.20) 0%, rgba(135, 192, 255, 0.20) 50%, rgba(248, 255, 135, 0.20) 100%)' },
              row.event.gacha_type === '普通限定'
                ? { border: '3px solid #ff4d4f' }
                : (row.event.gacha_type === 'UE限定' ? { border: '3px solid #f59e0b' } : {})
              ]">
          <button
            v-if="getPredictStatus(row.event) === 'predicted'"
            class="predict-delete-btn"
            title="删除这条预测"
            @click.stop="removePredict(row.event)"
          >
            ×
          </button>
          <div class="event-basic">
            <span class="event-id">#{{ row.event.id }}</span>
            <span class="event-date">{{ row.event.date }}</span>
            <span v-if="getBoxTurnInRound(row.event)" class="box-turn-tag">轮{{ getBoxTurnInRound(row.event) }}</span>
            <span v-if="getPredictStatus(row.event) === 'todo'" class="predict-status-badge is-todo">待预测</span>
            <span v-if="getPredictStatus(row.event) === 'predicted'" class="predict-status-badge is-done">已预测</span>
            <div v-if="isSpecialFestival(row.event.festival)" class="fest-tag">
              {{ row.event.festival }}
            </div>
          </div>

          <div class="banner-section">
            <div class="avatar-wrapper">
              <template v-if="row.event.event_type === 'World Link' && row.event.unit">
                <img :src="`/elements/${row.event.unit.toLowerCase()}.png`" class="unit-logo-banner" :title="row.event.unit" />
              </template>
              <template v-else-if="row.event.banner">
                <img :src="`/chibi_s/${getCharAbbr(row.event.banner)}.webp`" class="banner-avatar" :title="'Ban主: ' + row.event.banner" />
                <span class="banner-tag" :style="{ backgroundColor: getCharColor(row.event.banner) }">BAN</span>
              </template>
            </div>
          </div>

          <div class="event-main-content">
            <div class="event-title-row">
              <span class="event-title">{{ row.event.event_title }}</span>
            </div>
            
            <div class="type-indicator">
              <span class="type-tag" :style="getTypeTagStyle(row.event)">
                {{ row.event.event_type }}
              </span>
              <span class="series-text">{{ formatSeries(row.event) }}</span>
            </div>
          </div>

          <div class="event-members">
            <div class="member-row">
              <div v-for="card in getNormalCards(row.event.memberCards)" :key="card.CardID" class="member-card-box">
                <div class="avatar-container" :style="{ borderColor: getUnitColor(card.Affiliation) }">
                  <img :src="`/chars/${getCharAbbr(card.Name)}.png`" class="member-avatar" />
                  <img v-if="hasAttributeIcon(card.Attribute)" :src="`/elements/${card.Attribute.toLowerCase()}.png`" class="card-attr-icon" />
                  <img v-if="isVirtualSinger(card.Name)" :src="`/elements/${card.Affiliation.toLowerCase()}.png`" class="sub-unit-logo" />
                  <div v-if="['limited', 'collab_t'].includes(card.Type?.toLowerCase())" class="lim-tag">期间限定</div>
                  <div class="stars-overlay">
                    <img v-for="n in parseInt(card.Rarity)" :key="n" :src="card.Rarity == 4 ? '/elements/rstar.png' : '/elements/ystar.png'" class="star-icon" />
                  </div>
                  <div class="card-detail-tooltip">
                    <p><strong>ID：</strong>{{ card.CardID }}</p>
                    <p><strong>类型：</strong>{{ translateType(card.Type) }}</p>
                    <p><strong>技能：</strong>{{ translateSkill(card.Skill) }}</p>
                    <p><strong>属性：</strong>{{ translateAttr(card.Attribute) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="getFesCards(row.event.memberCards).length > 0" class="member-row fes-row">
              <img :src="`/elements/${getFesType(row.event.memberCards)}.webp`" class="fes-type-icon" />
              <div v-for="card in getFesCards(row.event.memberCards)" :key="card.CardID" class="member-card-box">
                <div class="avatar-container" :style="{ borderColor: getUnitColor(card.Affiliation) }">
                  <img :src="`/chars/${getCharAbbr(card.Name)}.png`" class="member-avatar" />
                  <img v-if="hasAttributeIcon(card.Attribute)" :src="`/elements/${card.Attribute.toLowerCase()}.png`" class="card-attr-icon" />
                  <img v-if="isVirtualSinger(card.Name)" :src="`/elements/${card.Affiliation.toLowerCase()}.png`" class="sub-unit-logo" />
                  <div class="stars-overlay">
                    <img v-for="n in parseInt(card.Rarity)" :key="n" :src="'/elements/rstar.png'" class="star-icon" />
                  </div>
                  <div class="card-detail-tooltip">
                    <p><strong>ID：</strong>{{ card.CardID }}</p>
                    <p><strong>类型：</strong>{{ translateType(card.Type) }}</p>
                    <p><strong>技能：</strong>{{ translateSkill(card.Skill) }}</p>
                    <p><strong>属性：</strong>{{ translateAttr(card.Attribute) }}</p>                </div>
                </div>
              </div>
            </div>
          </div>

          <div class="vs-section">
            <div v-if="row.event.virtual_singer" class="vs-list">
              <img v-for="vs in parseVS(row.event.virtual_singer)" :key="vs" :src="`/chars/${getCharAbbr(vs)}.png`" :title="vs" class="vs-avatar" />
            </div>
            <div class="song-tooltip" v-if="row.event.event_song">
              <span class="info-icon">🎵</span>
              <div class="tooltip-content">
                <p><strong>书下曲：</strong>{{ row.event.event_song }}</p>
                <p v-if="row.event.song_alias"><strong>别名：</strong>{{ row.event.song_alias }}</p>
                <p><strong>P主：</strong>{{ row.event.composer }}</p>
              </div>
            </div>
          </div>

          <div class="attr-section">
            <img v-if="hasAttributeIcon(row.event.event_attribute)" :src="`/elements/${row.event.event_attribute.toLowerCase()}.png`" class="attr-icon" />
          </div>
        </div>
        <div
          v-else
          :id="row.id"
          class="birthday-row"
          :style="{ backgroundColor: getBirthdayRowTint(row.name) }"
        >
          <div class="birthday-date">{{ row.date }}</div>
          <div class="birthday-name">{{ row.name }}</div>
          <div class="birthday-main-icon">
            <img src="/elements/birthday.png" class="birthday-row-icon" title="生日限定" />
          </div>
          <div class="birthday-attr-end">
            <img
              v-if="hasAttributeIcon(row.attribute)"
              :src="`/elements/${row.attribute.toLowerCase()}.png`"
              class="birthday-row-icon"
              :title="translateAttr(row.attribute)"
            />
          </div>
        </div>
        </template>
      </div>
      <PredictEditor 
        v-if="isEditorOpen"
        :is-open="isEditorOpen" 
        :event="currentEditingEvent"
        :char-map="CHAR_MAP"
        :box-locked-units="currentEditingBoxLockedUnits"
        @close="handleCloseEditor"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, nextTick, watch, onMounted, onActivated, onDeactivated, onBeforeUnmount } from 'vue';
import PredictEditor from './PredictEditor.vue';


// 2. 【新增】接收从 App.vue 传下来的总表（包含历史+预测）
const props = defineProps({
  allEvents: { type: Array, default: () => [] },
  allCards: { type: Array, default: () => [] },
  allBaseCards: { type: Array, default: () => [] },
  statsPreviewData: { type: Object, default: null },
  jumpEventId: { type: [Number, String], default: null },
  jumpEventSeq: { type: Number, default: 0 }
});
const emit = defineEmits(['sync-preview-event-id']);
const savePredictEvent = inject('savePredictEvent');
const deletePredictEvent = inject('deletePredictEvent');

const normalizeEventId = (value) => String(value ?? '').trim();
const isNumericEventId = (value) => /^\d+$/.test(normalizeEventId(value));
const hideCollabPools = ref(true);
const hideBirthdayRows = ref(false);

const normalizeAttr = (attr) => {
  const map = {
    pure: 'Pure',
    cool: 'Cool',
    cute: 'Cute',
    happy: 'Happy',
    mysterious: 'Mysterious'
  };
  return map[String(attr || '').toLowerCase()] || attr;
};

const hasAttributeIcon = (attr) => {
  const raw = String(attr || '').trim();
  return raw !== '' && raw !== '-';
};

const parseDateSafe = (dateStr) => {
  const d = new Date(String(dateStr || '').replace(/\//g, '-'));
  const t = d.getTime();
  return Number.isFinite(t) ? d : null;
};

const getDateValue = (dateStr) => parseDateSafe(dateStr)?.getTime() || 0;

const hexToRgba = (hex, alpha) => {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getBirthdayRowTint = (name) => hexToRgba(getCharColor(name), 0.2);

const BIRTHDAY_ORDER = {
  '镜音铃': 22,
  '镜音连': 23
};

const getPredictStatus = (event) => {
  const today = new Date();
  const eventDate = new Date(event.date.replace(/\//g, '-'));
  
  if (eventDate <= today) return 'past'; // 历史活动

  // 只看是否存在本地预测补丁，避免 WL 因基础卡自带人选被误判为“已预测”
  if (event.isPredict === true) {
    return 'predicted';
  }
  return 'todo';
};

const getCurrentEventId = () => {
  const today = new Date();
  const candidates = (props.allEvents || []).filter(ev => {
    if (!isNumericEventId(ev?.id)) return false;
    const evDate = new Date(ev.date.replace(/\//g, '-'));
    return evDate <= today;
  });
  if (candidates.length === 0) return -1;
  return candidates.reduce((prev, curr) => (Number(prev.id) > Number(curr.id) ? prev : curr)).id;
};

const canOpenPredictEditor = (event) => {
  if (!event) return false;
  if (!isNumericEventId(event?.id)) return false;
  const currentId = getCurrentEventId();
  return Number(event.id) > Number(currentId);
};

const isEditorOpen = ref(false);
const currentEditingEvent = ref(null);
const lastFocusedEventId = ref(null);
const historyWrapperRef = ref(null);
const filterStickyRef = ref(null);
const previewLayerCursor = ref(0);
const previewPanelLayers = ref({});
const previewConfigLayer = ref(0);
const previewPanelState = ref({});
const previewFloatingCollapsed = ref(false);
const previewAttrCharCollapsed = ref(false);
const previewConfigDragState = ref({ dragging: false, offsetX: 0, offsetY: 0 });
const previewConfigPanelPos = ref({ x: null, y: null });
const previewDragState = ref({ dragging: false, panelId: '', offsetX: 0, offsetY: 0 });
const previewResizeState = ref({ resizing: false, panelId: '', startX: 0, startY: 0, startScale: 1 });
const PREVIEW_LAYER_BASE = 4200;
const PREVIEW_CONFIG_LEFT = 14;
const PREVIEW_CONFIG_WIDTH = 360;
const PREVIEW_CONFIG_PANEL_SAFE_HEIGHT = 230;
const PREVIEW_PANEL_X_GAP = 18;
const PREVIEW_PANEL_SLOT_GAP = 14;
const PREVIEW_EDITOR_RIGHT_RESERVED = 392;
const PREVIEW_DEFAULT_PANEL_WIDTH = 208;
const PREVIEW_DEFAULT_PANEL_HEIGHT = 260;
const PREVIEW_SCREEN_EDGE_GAP = 10;
const PREVIEW_DRAG_MIN_VISIBLE_X = 80;
const PREVIEW_DRAG_MIN_VISIBLE_Y = 44;
const PREVIEW_PANEL_MIN_SCALE = 0.75;
const PREVIEW_PANEL_MAX_SCALE = 1.8;

const getPreviewDragMinY = () => {
  const filterEl = filterStickyRef.value;
  if (!filterEl) return PREVIEW_SCREEN_EDGE_GAP;
  const rect = filterEl.getBoundingClientRect();
  return Math.max(PREVIEW_SCREEN_EDGE_GAP, Math.round(rect.top + 2));
};

const previewConfigPanelStyle = computed(() => {
  const x = previewConfigPanelPos.value.x;
  const y = previewConfigPanelPos.value.y;
  const z = previewConfigLayer.value || PREVIEW_LAYER_BASE;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { zIndex: z };
  return {
    left: `${x}px`,
    top: `${y}px`,
    zIndex: z
  };
});

const clampPreviewConfigPanelPos = (x, y) => {
  const panelWidth = window.innerWidth <= 1000 ? 320 : 360;
  const maxX = Math.max(0, window.innerWidth - panelWidth - 6);
  const maxY = Math.max(0, window.innerHeight - 42);
  const minY = getPreviewDragMinY();
  return {
    x: Math.min(maxX, Math.max(6, x)),
    y: Math.min(maxY, Math.max(minY, y))
  };
};

const stopDragPreviewConfig = () => {
  previewConfigDragState.value = { dragging: false, offsetX: 0, offsetY: 0 };
};

const startDragPreviewConfig = (event) => {
  if (event.target?.closest('button')) return;
  bringPreviewConfigToFront();
  const panelEl = event.currentTarget?.closest('.preview-config-panel');
  const rect = panelEl?.getBoundingClientRect();
  if (!rect) return;
  const curX = Number.isFinite(previewConfigPanelPos.value.x) ? previewConfigPanelPos.value.x : rect.left;
  const curY = Number.isFinite(previewConfigPanelPos.value.y) ? previewConfigPanelPos.value.y : rect.top;
  previewConfigPanelPos.value = { x: curX, y: curY };
  previewConfigDragState.value = {
    dragging: true,
    offsetX: event.clientX - curX,
    offsetY: event.clientY - curY
  };
};

const startDragPreviewConfigTouch = (event) => {
  if (event.target?.closest('button')) return;
  bringPreviewConfigToFront();
  const t = event.touches?.[0] || event.changedTouches?.[0];
  if (!t) return;
  const panelEl = event.currentTarget?.closest('.preview-config-panel');
  const rect = panelEl?.getBoundingClientRect();
  if (!rect) return;
  const curX = Number.isFinite(previewConfigPanelPos.value.x) ? previewConfigPanelPos.value.x : rect.left;
  const curY = Number.isFinite(previewConfigPanelPos.value.y) ? previewConfigPanelPos.value.y : rect.top;
  previewConfigPanelPos.value = { x: curX, y: curY };
  previewConfigDragState.value = {
    dragging: true,
    offsetX: t.clientX - curX,
    offsetY: t.clientY - curY
  };
};

const handleDragPreviewConfig = (event) => {
  if (!previewConfigDragState.value.dragging) return;
  const next = clampPreviewConfigPanelPos(
    event.clientX - previewConfigDragState.value.offsetX,
    event.clientY - previewConfigDragState.value.offsetY
  );
  previewConfigPanelPos.value = next;
};

const handleDragPreviewConfigTouch = (event) => {
  if (!previewConfigDragState.value.dragging) return;
  const t = event.touches?.[0] || event.changedTouches?.[0];
  if (!t) return;
  event.preventDefault();
  const next = clampPreviewConfigPanelPos(
    t.clientX - previewConfigDragState.value.offsetX,
    t.clientY - previewConfigDragState.value.offsetY
  );
  previewConfigPanelPos.value = next;
};

const getPreviewDefaultPanelPosition = (idx = 0, avoidEditorDrawer = true) => {
  const slot = Number.isFinite(idx) ? idx : 0;
  const isNarrow = window.innerWidth <= 1000;
  const baseX = isNarrow
    ? PREVIEW_CONFIG_LEFT
    : (PREVIEW_CONFIG_LEFT + PREVIEW_CONFIG_WIDTH + PREVIEW_PANEL_X_GAP);
  const baseY = isNarrow ? PREVIEW_CONFIG_PANEL_SAFE_HEIGHT : 74;
  const rightReserved = (avoidEditorDrawer && isEditorOpen.value && !isNarrow)
    ? PREVIEW_EDITOR_RIGHT_RESERVED
    : PREVIEW_SCREEN_EDGE_GAP;
  const stepX = PREVIEW_DEFAULT_PANEL_WIDTH + PREVIEW_PANEL_SLOT_GAP;
  const usableWidth = Math.max(PREVIEW_DEFAULT_PANEL_WIDTH, window.innerWidth - baseX - rightReserved);
  const columnCount = Math.max(1, Math.floor((usableWidth + PREVIEW_PANEL_SLOT_GAP) / stepX));
  const col = slot % columnCount;
  const row = Math.floor(slot / columnCount);
  return {
    x: baseX + (col * stepX),
    y: baseY + (row * (PREVIEW_DEFAULT_PANEL_HEIGHT + PREVIEW_PANEL_SLOT_GAP))
  };
};

const getPreviewDefaultState = (idx = 0) => ({
  ...getPreviewDefaultPanelPosition(idx),
  scale: 1,
  collapsed: false
});

const resetPreviewPanelLayout = () => {
  previewConfigPanelPos.value = { x: null, y: null };
  nextTick(() => {
    updatePreviewConfigOffset();
  });
  const nextState = { ...previewPanelState.value };
  selectedPreviewPanelIds.value.forEach((panelId, idx) => {
    const cur = nextState[panelId] || getPreviewDefaultState(idx);
    const pos = getPreviewDefaultPanelPosition(idx, true);
    nextState[panelId] = {
      ...cur,
      x: pos.x,
      y: pos.y
    };
    bringPreviewPanelToFront(panelId);
  });
  previewPanelState.value = nextState;
  selectedPreviewPanelIds.value.forEach((panelId) => clampPreviewPanelPosition(panelId));
};

const getPreviewPanelBaseSize = (panelId) => {
  if (panelId === 'attr-five') return { width: 188, height: 340 };
  if (panelId === 'festival') return { width: 236, height: 350 };
  if (panelId === 'vs-last-four') return { width: 236, height: 242 };
  if (panelId === 'reward') return { width: 208, height: 260 };
  return { width: 208, height: 260 };
};

const bringPreviewConfigToFront = () => {
  previewLayerCursor.value += 1;
  previewConfigLayer.value = PREVIEW_LAYER_BASE + previewLayerCursor.value;
};

const bringPreviewPanelToFront = (panelId) => {
  previewLayerCursor.value += 1;
  previewPanelLayers.value = {
    ...previewPanelLayers.value,
    [panelId]: PREVIEW_LAYER_BASE + previewLayerCursor.value
  };
};

const isPreviewPanelCollapsed = (panelId) => Boolean(previewPanelState.value[panelId]?.collapsed);

const togglePreviewPanelCollapsed = (panelId) => {
  const cur = previewPanelState.value[panelId] || getPreviewDefaultState(0);
  previewPanelState.value = {
    ...previewPanelState.value,
    [panelId]: {
      ...cur,
      collapsed: !cur.collapsed
    }
  };
};

const getPreviewPanelStyle = (panelId) => {
  const p = previewPanelState.value[panelId] || getPreviewDefaultState(0);
  const base = getPreviewPanelBaseSize(panelId);
  const scale = Number.isFinite(p.scale) ? p.scale : 1;
  const z = previewPanelLayers.value[panelId] || PREVIEW_LAYER_BASE;
  return {
    left: `${p.x}px`,
    top: `${p.y}px`,
    width: `${base.width}px`,
    minWidth: `${base.width}px`,
    height: 'auto',
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    zIndex: z
  };
};

const getPreviewStepsStyle = (panelId) => {
  return {};
};

const clampPreviewPanelPosition = (panelId) => {
  const current = previewPanelState.value[panelId];
  if (!current) return;
  const base = getPreviewPanelBaseSize(panelId);
  const scale = Number.isFinite(current.scale) ? current.scale : 1;
  const panelWidth = base.width * scale;
  const panelHeight = current.collapsed ? 44 : (base.height * scale);
  const maxX = Math.max(0, window.innerWidth - PREVIEW_DRAG_MIN_VISIBLE_X);
  const maxY = Math.max(0, window.innerHeight - PREVIEW_DRAG_MIN_VISIBLE_Y);
  const minY = getPreviewDragMinY();
  previewPanelState.value = {
    ...previewPanelState.value,
    [panelId]: {
      ...current,
      x: Math.min(maxX, Math.max(PREVIEW_SCREEN_EDGE_GAP - panelWidth, current.x)),
      y: Math.min(maxY, Math.max(minY, current.y))
    }
  };
};

const startDragPreview = (panelId, event) => {
  bringPreviewPanelToFront(panelId);
  const current = previewPanelState.value[panelId] || getPreviewDefaultState(0);
  previewDragState.value = {
    dragging: true,
    panelId,
    offsetX: event.clientX - current.x,
    offsetY: event.clientY - current.y
  };
};

const startDragPreviewTouch = (panelId, event) => {
  const t = event.touches?.[0] || event.changedTouches?.[0];
  if (!t) return;
  bringPreviewPanelToFront(panelId);
  const current = previewPanelState.value[panelId] || getPreviewDefaultState(0);
  previewDragState.value = {
    dragging: true,
    panelId,
    offsetX: t.clientX - current.x,
    offsetY: t.clientY - current.y
  };
};

const stopDragPreview = () => {
  previewDragState.value = { dragging: false, panelId: '', offsetX: 0, offsetY: 0 };
};

const stopResizePreview = () => {
  previewResizeState.value = { resizing: false, panelId: '', startX: 0, startY: 0, startScale: 1 };
};

const startResizePreview = (panelId, event) => {
  bringPreviewPanelToFront(panelId);
  const current = previewPanelState.value[panelId] || { scale: 1 };
  previewResizeState.value = {
    resizing: true,
    panelId,
    startX: event.clientX,
    startY: event.clientY,
    startScale: Number.isFinite(current.scale) ? current.scale : 1
  };
};

const startResizePreviewTouch = (panelId, event) => {
  const t = event.touches?.[0] || event.changedTouches?.[0];
  if (!t) return;
  bringPreviewPanelToFront(panelId);
  const current = previewPanelState.value[panelId] || { scale: 1 };
  previewResizeState.value = {
    resizing: true,
    panelId,
    startX: t.clientX,
    startY: t.clientY,
    startScale: Number.isFinite(current.scale) ? current.scale : 1
  };
};

const handleDragPreview = (event) => {
  if (previewResizeState.value.resizing) return;
  if (!previewDragState.value.dragging) return;
  const panelId = previewDragState.value.panelId;
  if (!panelId) return;
  const current = previewPanelState.value[panelId] || getPreviewDefaultState(0);
  const base = getPreviewPanelBaseSize(panelId);
  const panelWidth = base.width * (current.scale || 1);
  const panelHeight = current.collapsed ? 44 : (base.height * (current.scale || 1));
  const maxX = Math.max(0, window.innerWidth - PREVIEW_DRAG_MIN_VISIBLE_X);
  const maxY = Math.max(0, window.innerHeight - PREVIEW_DRAG_MIN_VISIBLE_Y);
  const minY = getPreviewDragMinY();
  const nextX = event.clientX - previewDragState.value.offsetX;
  const nextY = event.clientY - previewDragState.value.offsetY;
  previewPanelState.value = {
    ...previewPanelState.value,
    [panelId]: {
      ...current,
      x: Math.min(maxX, Math.max(PREVIEW_SCREEN_EDGE_GAP - panelWidth, nextX)),
      y: Math.min(maxY, Math.max(minY, nextY))
    }
  };
};

const handleDragPreviewTouch = (event) => {
  if (previewResizeState.value.resizing) return;
  if (!previewDragState.value.dragging) return;
  const t = event.touches?.[0] || event.changedTouches?.[0];
  if (!t) return;
  event.preventDefault();
  const panelId = previewDragState.value.panelId;
  if (!panelId) return;
  const current = previewPanelState.value[panelId] || getPreviewDefaultState(0);
  const base = getPreviewPanelBaseSize(panelId);
  const panelWidth = base.width * (current.scale || 1);
  const panelHeight = current.collapsed ? 44 : (base.height * (current.scale || 1));
  const maxX = Math.max(0, window.innerWidth - PREVIEW_DRAG_MIN_VISIBLE_X);
  const maxY = Math.max(0, window.innerHeight - PREVIEW_DRAG_MIN_VISIBLE_Y);
  const minY = getPreviewDragMinY();
  const nextX = t.clientX - previewDragState.value.offsetX;
  const nextY = t.clientY - previewDragState.value.offsetY;
  previewPanelState.value = {
    ...previewPanelState.value,
    [panelId]: {
      ...current,
      x: Math.min(maxX, Math.max(PREVIEW_SCREEN_EDGE_GAP - panelWidth, nextX)),
      y: Math.min(maxY, Math.max(minY, nextY))
    }
  };
};

const handleResizePreview = (event) => {
  if (!previewResizeState.value.resizing) return;
  const panelId = previewResizeState.value.panelId;
  if (!panelId) return;
  const current = previewPanelState.value[panelId] || getPreviewDefaultState(0);
  if (current.collapsed) return;
  const base = getPreviewPanelBaseSize(panelId);
  const dx = event.clientX - previewResizeState.value.startX;
  const dy = event.clientY - previewResizeState.value.startY;
  const scaleDelta = Math.max(dx / Math.max(1, base.width), dy / Math.max(1, base.height));
  const nextScale = Math.min(PREVIEW_PANEL_MAX_SCALE, Math.max(PREVIEW_PANEL_MIN_SCALE, previewResizeState.value.startScale + scaleDelta));
  previewPanelState.value = {
    ...previewPanelState.value,
    [panelId]: {
      ...current,
      scale: nextScale
    }
  };
  clampPreviewPanelPosition(panelId);
};

const handleResizePreviewTouch = (event) => {
  if (!previewResizeState.value.resizing) return;
  const t = event.touches?.[0] || event.changedTouches?.[0];
  if (!t) return;
  event.preventDefault();
  const panelId = previewResizeState.value.panelId;
  if (!panelId) return;
  const current = previewPanelState.value[panelId] || getPreviewDefaultState(0);
  if (current.collapsed) return;
  const base = getPreviewPanelBaseSize(panelId);
  const dx = t.clientX - previewResizeState.value.startX;
  const dy = t.clientY - previewResizeState.value.startY;
  const scaleDelta = Math.max(dx / Math.max(1, base.width), dy / Math.max(1, base.height));
  const nextScale = Math.min(PREVIEW_PANEL_MAX_SCALE, Math.max(PREVIEW_PANEL_MIN_SCALE, previewResizeState.value.startScale + scaleDelta));
  previewPanelState.value = {
    ...previewPanelState.value,
    [panelId]: {
      ...current,
      scale: nextScale
    }
  };
  clampPreviewPanelPosition(panelId);
};

const findEventElementInContainer = (eventId) => {
  const container = historyContainer.value;
  if (!container) return null;
  const id = `event-${normalizeEventId(eventId)}`;
  return Array.from(container.querySelectorAll('.event-item')).find((item) => item.id === id) || null;
};


const findRowElementInContainer = (rowId) => {
  const container = historyContainer.value;
  if (!container || !rowId) return null;
  return Array.from(container.querySelectorAll('.event-item, .birthday-row')).find((item) => item.id === rowId) || null;
};

const preserveAnchorWhileLayoutChanges = (eventId, mutator) => {
  const container = historyContainer.value;
  const anchorElBefore = findEventElementInContainer(eventId);
  const beforeTop = anchorElBefore?.getBoundingClientRect().top;

  mutator();

  if (!container || typeof beforeTop !== 'number') return;

  // 多帧校正，覆盖抽屉动画与紧凑样式切换期间的连续重排。
  const correctAnchor = () => {
    const anchorElAfter = findEventElementInContainer(eventId);
    if (!anchorElAfter) return;
    const afterTop = anchorElAfter.getBoundingClientRect().top;
    const delta = afterTop - beforeTop;
    if (Math.abs(delta) > 0.5) {
      container.scrollTop += delta;
    }
  };

  nextTick(() => {
    let frames = 6;
    const tick = () => {
      correctAnchor();
      frames -= 1;
      if (frames > 0) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(correctAnchor, 220);
  });
};

// 2. 统一的内部滚动函数，解决筛选栏被顶走的问题
const _internalScrollTo = (eventId, behavior = 'smooth') => {
  const idKey = normalizeEventId(eventId);
  if (!idKey) return false;

  const container = historyContainer.value;
  const el = findEventElementInContainer(idKey);
  if (!el || !container) return false;
  if (container.clientHeight <= 0 || container.getClientRects().length === 0) return false;

  // 获取筛选栏的高度作为偏移量
  const filterBar = container.querySelector('.filter-bar');
  const offset = filterBar ? filterBar.offsetHeight + 10 : 80;
  const containerTop = container.getBoundingClientRect().top;
  const elementTop = el.getBoundingClientRect().top;
  const targetTop = Math.max(0, container.scrollTop + (elementTop - containerTop) - offset);

  container.scrollTo({ top: targetTop, behavior });
  suppressRestoreUntil.value = Date.now() + 1000;
  historyScrollTop.value = targetTop;
  try {
    sessionStorage.setItem(HISTORY_SCROLL_KEY, String(targetTop));
  } catch (_) {}
  setActiveEventItem(idKey);
  return true;
};

const openPredictEditor = (event) => {
  if (!canOpenPredictEditor(event)) {
    return;
  }

  lastFocusedEventId.value = event.id;
  currentEditingEvent.value = event;
  emit('sync-preview-event-id', Number(event.id));
  preserveAnchorWhileLayoutChanges(event.id, () => {
    isEditorOpen.value = true;
  });
};

const handleCloseEditor = () => {
  const anchorId = currentEditingEvent.value?.id || lastFocusedEventId.value;
  if (!anchorId) {
    isEditorOpen.value = false;
    return;
  }

  preserveAnchorWhileLayoutChanges(anchorId, () => {
    isEditorOpen.value = false;
  });
  emit('sync-preview-event-id', null);
};

const removePredict = (event) => {
  if (!event || getPredictStatus(event) !== 'predicted') return;
  const ok = confirm(`确定删除活动 #${event.id} 的预测吗？`);
  if (!ok) return;
  if (typeof deletePredictEvent === 'function') {
    deletePredictEvent(event.id);
  }
};

const sortDesc = ref(false); 
const listRef = ref(null);
const currentActiveId = ref(null);
const PREVIEW_LIMITED_TYPES = new Set(['limited', 'cfes', 'bfes', 'collab_t']);
const PREVIEW_FESTIVAL_TYPES = ['新年', '婚活', '情人节', '白情', '半周年', '周年'];
const PREVIEW_BOX_UNITS = ['ln', 'mmj', 'vbs', 'ws', 'nc'];
const PREVIEW_PANEL_DEFS = [
  { id: 'four', title: '四星数', icon: '⭐', statKey: 'fourStarCount', externalKey: 'fourStarCount' },
  { id: 'limited', title: '限定数', icon: '🎀', statKey: 'limitedCount', externalKey: 'limitedCount' },
  { id: 'vs-last-four', title: 'V上次四星', icon: 'V', statKey: 'vsLastFour' },
  { id: 'vs-unit-score', title: '团分', icon: 'U', statKey: 'vsUnitScore' },
  { id: 'p-score', title: 'P分', icon: 'P', statKey: 'pScoreCount' },
  { id: 'pure-score', title: '分卡', icon: 'S', statKey: 'pureScoreCount' },
  { id: 'recovery', title: '奶卡', icon: '❤', statKey: 'recoveryCount' },
  { id: 'accuracy', title: '判卡', icon: '✓', statKey: 'accuracyCount' },
  { id: 'three', title: '三星数', icon: '3', statKey: 'threeStarCount' },
  { id: 'two', title: '二星数', icon: '2', statKey: 'twoStarCount' },
  { id: 'reward', title: '报酬', icon: '🎁', statKey: 'rewardTotalCount' },
  { id: 'attr-five', title: '五属性', icon: '🧩', statKey: 'attrFive' },
  { id: 'festival', title: '节日人选', icon: '🎊', statKey: 'festival', externalKey: 'festival' }
];
const PREVIEW_CHAR_ORDER = {
  '星乃一歌': 1, '天马咲希': 2, '望月穗波': 3, '日野森志步': 4,
  '花里实乃里': 5, '桐谷遥': 6, '桃井爱莉': 7, '日野森雫': 8,
  '小豆泽心羽': 9, '白石杏': 10, '东云彰人': 11, '青柳冬弥': 12,
  '天马司': 13, '凤笑梦': 14, '草薙宁宁': 15, '神代类': 16,
  '宵崎奏': 17, '朝比奈真冬': 18, '东云绘名': 19, '晓山瑞希': 20,
  '初音未来': 21, '镜音铃': 22, '镜音连': 23, '巡音流歌': 24, 'MEIKO': 25, 'KAITO': 26
};
const PREVIEW_FESTIVAL_VS_UNIT_ORDER = { ln: 1, mmj: 2, vbs: 3, ws: 4, nc: 5, vs: 6 };
const selectedPreviewPanelIds = ref(['four', 'limited']);
const selectedPreviewAttrChars = ref([]);
const selectedPreviewFestival = ref(PREVIEW_FESTIVAL_TYPES[0]);
const previewFestivalFesToggles = ref({
  '半周年': false,
  '周年': false
});

const compareFestivalPreviewName = (a, b) => {
  const aName = String(a || '').trim();
  const bName = String(b || '').trim();
  const aBase = aName.split(' ')[0] || aName;
  const bBase = bName.split(' ')[0] || bName;
  const ao = PREVIEW_CHAR_ORDER[aBase] || 999;
  const bo = PREVIEW_CHAR_ORDER[bBase] || 999;
  if (ao !== bo) return ao - bo;
  return aName.localeCompare(bName, 'zh-Hans-CN');
};

const previewSelectableChars = computed(() => {
  return Object.keys(CHAR_MAP).sort((a, b) => (PREVIEW_CHAR_ORDER[a] || 999) - (PREVIEW_CHAR_ORDER[b] || 999));
});

const togglePreviewAttrChar = (name) => {
  const current = [...selectedPreviewAttrChars.value];
  const idx = current.indexOf(name);
  if (idx >= 0) {
    current.splice(idx, 1);
    selectedPreviewAttrChars.value = current;
    return;
  }
  if (current.length >= 8) return;
  current.push(name);
  selectedPreviewAttrChars.value = current;
};

const clearPreviewAttrChars = () => {
  selectedPreviewAttrChars.value = [];
};

const setSelectedPreviewFestival = (festival) => {
  if (!PREVIEW_FESTIVAL_TYPES.includes(festival)) return;
  selectedPreviewFestival.value = festival;
};

const parseFestivalPreviewCharKey = (charKey) => {
  const raw = String(charKey || '').trim();
  if (!raw) return { baseName: '', unit: '', isVs: false };
  const [baseName, suffixRaw] = raw.split(/\s+/);
  const unit = String(suffixRaw || '').toLowerCase();
  return {
    baseName,
    unit,
    isVs: isVirtualSinger(baseName)
  };
};

const buildFestivalPreviewCharKey = (card) => {
  const fullName = String(card?.Name || '').trim();
  const [baseName] = fullName.split(/\s+/);
  if (!baseName || !PREVIEW_CHAR_ORDER[baseName]) return '';
  if (!isVirtualSinger(baseName)) return baseName;

  const unit = String(card?.Affiliation || '').trim().toLowerCase();
  if (unit && unit !== 'vs' && PREVIEW_FESTIVAL_VS_UNIT_ORDER[unit]) {
    return `${baseName} ${unit}`;
  }
  return baseName;
};

const compareFestivalPreviewCharKey = (aKey, bKey) => {
  const a = parseFestivalPreviewCharKey(aKey);
  const b = parseFestivalPreviewCharKey(bKey);
  const baseDiff = (PREVIEW_CHAR_ORDER[a.baseName] || 999) - (PREVIEW_CHAR_ORDER[b.baseName] || 999);
  if (baseDiff !== 0) return baseDiff;

  if (a.isVs && b.isVs) {
    const au = PREVIEW_FESTIVAL_VS_UNIT_ORDER[a.unit || 'vs'] || 999;
    const bu = PREVIEW_FESTIVAL_VS_UNIT_ORDER[b.unit || 'vs'] || 999;
    if (au !== bu) return au - bu;
  }

  return String(aKey).localeCompare(String(bKey), 'zh-Hans-CN');
};

const canTogglePreviewFestivalFes = (festival) => ['半周年', '周年'].includes(String(festival || '').trim());

const shouldCountPreviewFestivalFes = (festival) => {
  const fest = String(festival || '').trim();
  if (!canTogglePreviewFestivalFes(fest)) return false;
  return !!previewFestivalFesToggles.value[fest];
};

const previewPanelOptions = computed(() => PREVIEW_PANEL_DEFS.map((def) => {
  const selected = selectedPreviewPanelIds.value.includes(def.id);
  const isFestival = def.id === 'festival';
  const dynamicTitle = isFestival && activePreviewFestivalName.value
    ? `节日人选·${activePreviewFestivalName.value}`
    : def.title;
  return {
    ...def,
    title: dynamicTitle,
    selected,
    disabled: false,
    tip: ''
  };
}));

const togglePreviewPanelType = (panelId) => {
  const current = [...selectedPreviewPanelIds.value];
  const idx = current.indexOf(panelId);
  if (idx >= 0) {
    current.splice(idx, 1);
    selectedPreviewPanelIds.value = current;
    return;
  }
  if (current.length >= 5) return;
  current.push(panelId);
  selectedPreviewPanelIds.value = current;
};

watch(selectedPreviewPanelIds, (ids) => {
  if (!ids.includes('attr-five')) {
    previewAttrCharCollapsed.value = false;
  }
});

const isCollabPoolEvent = (event) => {
  const id = normalizeEventId(event?.id).toLowerCase();
  const eventType = String(event?.event_type || '').trim();
  const gachaType = String(event?.gacha_type || '').trim();
  return /^c\d+$/.test(id) || eventType.includes('联动') || gachaType.includes('联动');
};

const getEventTime = (event) => {
  return getDateValue(event?.date);
};

const compareEventOrderAsc = (a, b) => {
  const aNum = isNumericEventId(a?.id);
  const bNum = isNumericEventId(b?.id);
  if (aNum && bNum) return Number(a.id) - Number(b.id);

  const ta = getEventTime(a);
  const tb = getEventTime(b);
  if (ta !== tb) return ta - tb;
  return normalizeEventId(a?.id).localeCompare(normalizeEventId(b?.id));
};

const normalizeUnitKey = (unit) => String(unit || '').trim().toLowerCase();

const isBoxEvent = (event) => {
  if (String(event?.event_type || '').trim() !== '箱活') return false;
  return PREVIEW_BOX_UNITS.includes(normalizeUnitKey(event?.unit));
};

const boxTurnByEventId = computed(() => {
  const map = {};
  let usedUnits = new Set();
  let roundNo = 1;

  [...(props.allEvents || [])]
    .filter((event) => isNumericEventId(event?.id))
    .sort(compareEventOrderAsc)
    .forEach((event) => {
      if (!isBoxEvent(event)) return;
      const unit = normalizeUnitKey(event?.unit);
      if (!unit) return;

      if (usedUnits.size >= PREVIEW_BOX_UNITS.length || usedUnits.has(unit)) {
        usedUnits = new Set();
        roundNo += 1;
      }

      usedUnits.add(unit);
      map[normalizeEventId(event.id)] = {
        roundNo,
        turnInRound: usedUnits.size
      };
    });

  return map;
});

const getBoxTurnInRound = (event) => {
  const idKey = normalizeEventId(event?.id);
  const turn = boxTurnByEventId.value?.[idKey]?.turnInRound;
  return Number.isFinite(turn) && turn >= 1 ? turn : null;
};

const getBoxLockedUnitsBeforeEvent = (targetEvent) => {
  const targetId = Number(targetEvent?.id);
  if (!Number.isFinite(targetId) || targetId <= 0) return [];

  let usedUnits = new Set();
  [...(props.allEvents || [])]
    .filter((event) => isNumericEventId(event?.id))
    .sort(compareEventOrderAsc)
    .forEach((event) => {
      const eventId = Number(event?.id);
      if (!Number.isFinite(eventId) || eventId >= targetId) return;
      if (!isBoxEvent(event)) return;
      const unit = normalizeUnitKey(event?.unit);
      if (!unit) return;

      if (usedUnits.size >= PREVIEW_BOX_UNITS.length || usedUnits.has(unit)) {
        usedUnits = new Set();
      }
      usedUnits.add(unit);
    });

  // One full round completed (5 unique units) means the next box event starts a new round.
  if (usedUnits.size >= PREVIEW_BOX_UNITS.length) {
    usedUnits = new Set();
  }

  return [...usedUnits];
};

const currentEditingBoxLockedUnits = computed(() => {
  return getBoxLockedUnitsBeforeEvent(currentEditingEvent.value);
});

const setActiveEventItem = (eventId) => {
  const idKey = normalizeEventId(eventId);
  if (!idKey) return;
  currentActiveId.value = idKey;

  const container = historyContainer.value;
  if (!container) return;
  container.querySelectorAll('.event-item').forEach((item) => item.classList.remove('is-active'));
  const target = findEventElementInContainer(idKey);
  if (target) target.classList.add('is-active');
};

const lastHandledJumpSeq = ref(0);
const pendingJumpSeq = ref(0);
const queueJumpRequest = (seqValue, idValue) => {
  const seq = Number(seqValue || 0);
  if (!Number.isFinite(seq) || seq <= 0) return false;
  if (seq === lastHandledJumpSeq.value) return false;

  const idKey = normalizeEventId(idValue);
  if (!idKey) return false;

  pendingJumpEventId.value = idKey;
  pendingJumpSeq.value = seq;
  return true;
};

const queueJumpFromProps = () => queueJumpRequest(props.jumpEventSeq, props.jumpEventId);

const previewMaxEventId = computed(() => {
  const editingId = Number(currentEditingEvent.value?.id);
  if (Number.isFinite(editingId) && editingId > 0) return editingId;
  const currentId = Number(getCurrentEventId());
  return Number.isFinite(currentId) && currentId > 0 ? currentId : Number.MAX_SAFE_INTEGER;
});

const previewFestivalContext = computed(() => {
  const fest = String(selectedPreviewFestival.value || '').trim();
  if (!PREVIEW_FESTIVAL_TYPES.includes(fest)) return null;
  return { festival: fest };
});

const isFestivalPreviewAvailable = computed(() => true);
const activePreviewFestivalName = computed(() => previewFestivalContext.value?.festival || '');

const previewFestivalRowsLocal = computed(() => {
  const maxId = Number(previewMaxEventId.value);
  if (!Number.isFinite(maxId) || maxId <= 0) return {};

  const eventFestivalMap = {};
  (props.allEvents || []).forEach((event) => {
    if (!isNumericEventId(event?.id)) return;
    const eid = Number(event.id);
    if (eid > maxId) return;
    const festival = String(event?.festival || '').trim();
    if (!PREVIEW_FESTIVAL_TYPES.includes(festival)) return;
    eventFestivalMap[eid] = festival;
  });

  const buckets = Object.fromEntries(
    PREVIEW_FESTIVAL_TYPES.map((festival) => [
      festival,
      {
        four: {},
        three: {},
        two: {},
        fourMeta: {},
        seenBase: new Set()
      }
    ])
  );

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinPreviewLimit(card, maxId)) return;
    const eid = String(card?.EventID || '').trim();
    if (!isNumericEventId(eid)) return;
    const festival = eventFestivalMap[Number(eid)];
    if (!festival || !buckets[festival]) return;

    const charName = buildFestivalPreviewCharKey(card);
    if (!charName) return;
    const baseName = parseFestivalPreviewCharKey(charName).baseName;
    if (!baseName) return;
    const rarity = String(card?.Rarity || '').trim();
    const type = String(card?.Type || '').trim().toLowerCase();
    const isFes = ['cfes', 'bfes'].includes(type);
    if (isFes && !shouldCountPreviewFestivalFes(festival)) return;

    const bucket = buckets[festival];
    if (rarity === '4' || isFes) {
      bucket.four[charName] = (bucket.four[charName] || 0) + 1;
      if (!bucket.fourMeta[charName]) {
        bucket.fourMeta[charName] = { perm: 0, nonPerm: 0 };
      }
      if (type === 'perm') bucket.fourMeta[charName].perm += 1;
      else bucket.fourMeta[charName].nonPerm += 1;
      bucket.seenBase.add(baseName);
      return;
    }
    if (rarity === '3') {
      bucket.three[charName] = (bucket.three[charName] || 0) + 1;
      bucket.seenBase.add(baseName);
      return;
    }
    if (rarity === '2') {
      bucket.two[charName] = (bucket.two[charName] || 0) + 1;
      bucket.seenBase.add(baseName);
    }
  });

  const allBaseNames = Object.keys(CHAR_MAP)
    .sort((a, b) => (PREVIEW_CHAR_ORDER[a] || 999) - (PREVIEW_CHAR_ORDER[b] || 999));

  const toRowList = (mapObj, options = {}) => Object.entries(mapObj || {})
    .map(([name, count]) => {
      const meta = options.fourMeta?.[name];
      const isPermOnly = !!meta && meta.perm > 0 && meta.nonPerm === 0;
      return { name, count: Number(count || 0), isPermOnly };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => compareFestivalPreviewCharKey(a.name, b.name));

  const result = {};
  PREVIEW_FESTIVAL_TYPES.forEach((festival) => {
    const bucket = buckets[festival] || { four: {}, three: {}, two: {}, fourMeta: {}, seenBase: new Set() };
    result[festival] = [
      { key: 'four', label: '4星', chars: toRowList(bucket.four, { fourMeta: bucket.fourMeta }) },
      { key: 'three', label: '3星', chars: toRowList(bucket.three) },
      { key: 'two', label: '2星', chars: toRowList(bucket.two) },
      {
        key: 'none',
        label: '未出',
        chars: allBaseNames
          .filter((name) => !bucket.seenBase.has(name))
          .map((name) => ({ name, count: 0 }))
      }
    ];
  });
  return result;
});

const previewFestivalRowsMap = computed(() => {
  return previewFestivalRowsLocal.value;
});

const currentPreviewFestivalRows = computed(() => {
  const festival = activePreviewFestivalName.value;
  if (!festival) return [];
  const rows = previewFestivalRowsMap.value?.[festival];
  return Array.isArray(rows) ? rows : [];
});

const previewFestivalIncludeFes = computed(() => {
  const fest = activePreviewFestivalName.value;
  return !!previewFestivalFesToggles.value[String(fest || '').trim()];
});

const previewFestivalShowFes = computed(() => canTogglePreviewFestivalFes(activePreviewFestivalName.value));

const PREVIEW_VS_NAMES = ['初音未来', '镜音铃', '镜音连', '巡音流歌', 'MEIKO', 'KAITO'];

const previewVsLastFourMap = computed(() => {
  const result = {};
  PREVIEW_VS_NAMES.forEach((vs) => {
    result[vs] = Object.fromEntries(PREVIEW_BOX_UNITS.map((u) => [u, null]));
  });

  const maxId = Number(previewMaxEventId.value);
  if (!Number.isFinite(maxId) || maxId <= 0) return result;

  const eventDateById = {};
  (props.allEvents || []).forEach((event) => {
    const eid = String(event?.id || '').trim();
    if (!/^\d+$/.test(eid)) return;
    if (Number(eid) > maxId) return;
    eventDateById[eid] = getDateValue(event?.date);
  });

  (props.allCards || []).forEach((card) => {
    const eid = String(card?.EventID || '').trim();
    if (!/^\d+$/.test(eid)) return;
    if (Number(eid) > maxId) return;
    const rarity = String(card?.Rarity || '').trim();
    if (rarity !== '4') return;
    const name = String(card?.Name || '').trim().split(' ')[0];
    if (!PREVIEW_VS_NAMES.includes(name)) return;
    const unit = String(card?.Affiliation || '').trim().toLowerCase();
    if (!PREVIEW_BOX_UNITS.includes(unit)) return;
    const dateValue = Number(eventDateById[eid] || 0);
    if (!dateValue) return;
    const current = result[name][unit];
    if (current === null || dateValue > current) {
      result[name][unit] = dateValue;
    }
  });

  return result;
});

const previewReferenceDateValue = computed(() => {
  const targetId = Number(previewMaxEventId.value);
  if (!Number.isFinite(targetId) || targetId <= 0) return Date.now();
  const target = (props.allEvents || []).find((event) => Number(event?.id) === targetId);
  const t = getDateValue(target?.date);
  return t > 0 ? t : Date.now();
});

const previewVsLastFourCompactRows = computed(() => {
  const anchor = Number(previewReferenceDateValue.value || Date.now());
  return PREVIEW_VS_NAMES.map((name) => {
    const unitMap = previewVsLastFourMap.value[name] || {};
    const daysByUnit = {};
    PREVIEW_BOX_UNITS.forEach((unit) => {
      const t = Number(unitMap[unit] || 0);
      daysByUnit[unit] = t > 0 ? Math.max(0, Math.floor((anchor - t) / 86400000)) : '-';
    });
    return { name, daysByUnit };
  });
});

const previewVsUnitScoreRows = computed(() => {
  const maxId = Number(previewMaxEventId.value);
  const rows = Object.fromEntries(
    PREVIEW_VS_NAMES.map((name) => [
      name,
      {
        name,
        attrsByUnit: Object.fromEntries(PREVIEW_BOX_UNITS.map((u) => [u, []]))
      }
    ])
  );

  if (!Number.isFinite(maxId) || maxId <= 0) {
    return PREVIEW_VS_NAMES.map((name) => rows[name]);
  }

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinPreviewLimit(card, maxId)) return;
    const skill = String(card?.Skill || '').trim().toLowerCase();
    if (skill !== 'unit_score') return;

    const baseName = String(card?.Name || '').trim().split(/\s+/)[0] || '';
    if (!PREVIEW_VS_NAMES.includes(baseName)) return;

    const unit = String(card?.Affiliation || '').trim().toLowerCase();
    if (!PREVIEW_BOX_UNITS.includes(unit)) return;

    const attr = normalizeAttr(card?.Attribute);
    if (!['Pure', 'Cool', 'Cute', 'Happy', 'Mysterious'].includes(attr)) return;

    rows[baseName].attrsByUnit[unit].push(attr);
  });

  return PREVIEW_VS_NAMES.map((name) => rows[name]);
});

const previewVsLastFourMaxDays = computed(() => {
  let max = 0;
  previewVsLastFourCompactRows.value.forEach((row) => {
    PREVIEW_BOX_UNITS.forEach((unit) => {
      const v = Number(row?.daysByUnit?.[unit]);
      if (Number.isFinite(v) && v > max) max = v;
    });
  });
  return Math.max(1, max);
});

const getPreviewVsMiniDataCellStyle = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return {
      backgroundColor: 'rgba(148, 163, 184, 0.12)',
      color: '#64748b'
    };
  }
  const ratio = Math.min(1, Math.max(0, n / previewVsLastFourMaxDays.value));
  const shade = Math.round(240 - (ratio * 110));
  const text = shade <= 165 ? '#f8fafc' : '#0f172a';
  return {
    backgroundColor: `rgb(${shade}, ${shade}, ${shade})`,
    color: text,
    fontWeight: 600
  };
};

const isCardWithinPreviewLimit = (card, maxId) => {
  const eidRaw = String(card?.EventID || '').trim();
  if (!eidRaw || eidRaw.toLowerCase() === 'ori') return true;
  if (!/^\d+$/.test(eidRaw)) return true;
  return Number(eidRaw) <= maxId;
};

const isPreviewEventRewardCard = (card) => {
  const rarity = String(card?.Rarity || '').trim();
  return isNumericEventId(card?.EventID) && ['2', '3'].includes(rarity);
};

const previewCharStats = computed(() => {
  const stats = {};
  const maxId = previewMaxEventId.value;
  (props.allCards || []).forEach((card) => {
    const name = String(card?.Name || '').trim();
    if (!name || name === '-' || name === 'CardID') return;
    if (!isCardWithinPreviewLimit(card, maxId)) return;

    if (!stats[name]) {
      stats[name] = {
        name,
        fourStarCount: 0,
        limitedCount: 0,
        pScoreCount: 0,
        twoStarCount: 0,
        threeStarCount: 0,
        rewardTwoCount: 0,
        rewardThreeCount: 0,
        accuracyCount: 0,
        recoveryCount: 0,
        unitScoreCount: 0,
        pureScoreCount: 0,
        rewardTotalCount: 0,
        attr4Counts: { Pure: 0, Cool: 0, Cute: 0, Happy: 0, Mysterious: 0 }
      };
    }

    const rarity = String(card?.Rarity || '').trim();
    const type = String(card?.Type || '').toLowerCase();
    const skill = String(card?.Skill || '').toLowerCase();
    if (rarity === '4') {
      stats[name].fourStarCount += 1;
      if (skill === 'p_score') stats[name].pScoreCount += 1;
      if (skill === 'accuracy') stats[name].accuracyCount += 1;
      if (skill === 'recovery') stats[name].recoveryCount += 1;
      if (skill === 'unit_score') stats[name].unitScoreCount += 1;
      const attr = normalizeAttr(card?.Attribute);
      if (stats[name].attr4Counts[attr] !== undefined) {
        stats[name].attr4Counts[attr] += 1;
      }
    }
    if (rarity === '3') stats[name].threeStarCount += 1;
    if (rarity === '2') stats[name].twoStarCount += 1;
    if (isPreviewEventRewardCard(card)) {
      if (rarity === '3') stats[name].rewardThreeCount += 1;
      if (rarity === '2') stats[name].rewardTwoCount += 1;
    }
    if (PREVIEW_LIMITED_TYPES.has(type)) stats[name].limitedCount += 1;
  });

  return Object.values(stats).map((s) => {
    s.pureScoreCount = s.fourStarCount - s.accuracyCount - s.recoveryCount - s.unitScoreCount;
    s.rewardTotalCount = s.rewardThreeCount + s.rewardTwoCount;
    return s;
  });
});

const previewAttrFiveRows = computed(() => {
  if (!selectedPreviewPanelIds.value.includes('attr-five')) return [];
  const selected = selectedPreviewAttrChars.value;
  if (selected.length === 0) return [];

  const statMap = new Map(previewCharStats.value.map((s) => [s.name, s]));
  return selected
    .map((name) => {
      const s = statMap.get(name);
      return {
        name,
        Pure: s?.attr4Counts?.Pure || 0,
        Cool: s?.attr4Counts?.Cool || 0,
        Cute: s?.attr4Counts?.Cute || 0,
        Happy: s?.attr4Counts?.Happy || 0,
        Mysterious: s?.attr4Counts?.Mysterious || 0
      };
    })
    .sort((a, b) => (PREVIEW_CHAR_ORDER[a.name] || 999) - (PREVIEW_CHAR_ORDER[b.name] || 999));
});

const buildPreviewSteps = (key) => {
  const grouped = new Map();
  previewCharStats.value.forEach((row) => {
    const count = Number(row?.[key] || 0);
    if (!grouped.has(count)) grouped.set(count, []);
    grouped.get(count).push({
      name: row.name,
      rewardThreeCount: row.rewardThreeCount || 0,
      rewardTwoCount: row.rewardTwoCount || 0
    });
  });

  return Array.from(grouped.entries())
    .map(([count, chars]) => ({
      count,
      chars: [...chars].sort((a, b) => {
        const ao = PREVIEW_CHAR_ORDER[a.name] || 999;
        const bo = PREVIEW_CHAR_ORDER[b.name] || 999;
        if (ao !== bo) return ao - bo;
        return String(a.name).localeCompare(String(b.name), 'zh-Hans-CN');
      })
    }))
    .sort((a, b) => b.count - a.count);
};

const getPreviewStepsByKey = (key) => {
  const panelDef = PREVIEW_PANEL_DEFS.find((d) => d.statKey === key);
  const external = props.statsPreviewData;
  const externalMaxId = Number(external?.maxEventId);
  if (panelDef?.externalKey && Number.isFinite(externalMaxId) && externalMaxId === Number(previewMaxEventId.value)) {
    const groups = external?.groups?.[panelDef.externalKey];
    if (Array.isArray(groups) && groups.length > 0) {
      return groups.map((g) => ({
        count: Number(g?.count || 0),
        chars: Array.isArray(g?.chars) ? g.chars.map((c) => ({ name: c.name })) : []
      }));
    }
  }
  return buildPreviewSteps(key);
};

const getPreviewAttrRowStyle = (name) => {
  return {
    backgroundColor: hexToRgba(getCharColor(name), 0.3)
  };
};

const previewFloatingPanels = computed(() => {
  return selectedPreviewPanelIds.value
    .map((id) => PREVIEW_PANEL_DEFS.find((d) => d.id === id))
    .filter(Boolean)
    .map((def) => ({
      id: def.id,
      title: def.id === 'festival' && activePreviewFestivalName.value
        ? `节日人选·${activePreviewFestivalName.value}`
        : def.title,
      icon: def.icon,
      steps: (def.id === 'festival' || def.id === 'vs-last-four' || def.id === 'vs-unit-score') ? [] : getPreviewStepsByKey(def.statKey),
      festivalName: def.id === 'festival' ? activePreviewFestivalName.value : '',
      festivalRows: def.id === 'festival' ? currentPreviewFestivalRows.value : [],
      festivalIncludeFes: def.id === 'festival' ? previewFestivalIncludeFes.value : false,
      festivalShowFes: def.id === 'festival' ? previewFestivalShowFes.value : false
    }));
});

watch(previewFloatingPanels, (panels) => {
  const nextState = { ...previewPanelState.value };
  panels.forEach((panel, idx) => {
    if (!nextState[panel.id]) {
      nextState[panel.id] = getPreviewDefaultState(idx);
    }
    if (!previewPanelLayers.value[panel.id]) {
      bringPreviewPanelToFront(panel.id);
    }
  });
  previewPanelState.value = nextState;
  panels.forEach((panel) => clampPreviewPanelPosition(panel.id));
}, { immediate: true });

watch(() => [props.jumpEventSeq, props.jumpEventId], ([seqValue, idValue]) => {
  const queued = queueJumpRequest(seqValue, idValue);
  if (!queued) return;
  nextTick(() => {
    requestAnimationFrame(() => {
      consumePendingJump('smooth', 30);
    });
  });
}, { flush: 'post' });
// 新增筛选相关的状态
const showFilter = ref(false);
const filterMode = ref('single'); // 'single' | 'event'
const EVENT_TYPE_FILTER_OPTIONS = [
  { value: 'box', label: '箱活' },
  { value: 'mix', label: '混活' },
  { value: 'wl', label: 'WL' },
  { value: 'collab', label: '联动' }
];
const EVENT_FESTIVAL_ORDER = ['新年', '情人节', '白情', '半周年', '五月', '婚活', '六月', '夏活', '八月', '九月', '周年', '十一月', '十二月'];
const EVENT_FESTIVAL_EXCLUDE = new Set(['开服', '二月', '三月']);
const EVENT_GACHA_FILTER_OPTIONS = [
  { value: 'perm', label: '常驻' },
  { value: 'limited', label: '普通限定' },
  { value: 'ue', label: 'UE限定' },
  { value: 'collab', label: '联动' }
];

const filterCriteria = ref({
  selectedChars: [], // 选中的角色名数组
  rarity: null,      // 1, 2, 3, 4, 'birthday'
  attribute: null,   // 'Happy', 'Mysterious', 'Cute', 'Cool', 'Pure'
  skill: null,       // 'score_up', 'accuracy', 'recovery', 'p_score'
  cardType: null,    // 'perm', 'limited', 'collab_t', 'cfes', 'bfes'
  unit: null         // 'ln', 'mmj', 'vbs', 'ws', 'nc', 'vs'
});

const eventFilterCriteria = ref({
  characters: [],
  isBan: null, // 'yes' | 'no' | null
  eventTypes: [],
  festivals: [],
  attributes: [],
  units: [],
  gachaTypes: []
});

const canUseEventBanFilter = computed(() => eventFilterCriteria.value.characters.length === 1);

const sortedEvents = computed(() => {
  return [...(props.allEvents || [])].sort((a, b) => (
    sortDesc.value ? compareEventOrderAsc(b, a) : compareEventOrderAsc(a, b)
  ));
});

const hasDetailFilters = computed(() => {
  const f = filterCriteria.value || {};
  return Boolean(
    (f.selectedChars && f.selectedChars.length > 0) ||
    f.rarity ||
    f.attribute ||
    f.skill ||
    f.cardType ||
    f.unit
  );
});

const hasEventFilters = computed(() => {
  const f = eventFilterCriteria.value || {};
  return Boolean(
    (f.characters && f.characters.length > 0) ||
    f.isBan ||
    (f.eventTypes && f.eventTypes.length > 0) ||
    (f.festivals && f.festivals.length > 0) ||
    (f.attributes && f.attributes.length > 0) ||
    (f.units && f.units.length > 0) ||
    (f.gachaTypes && f.gachaTypes.length > 0)
  );
});

const hasActiveFilters = computed(() => {
  if (filterMode.value === 'event') return hasEventFilters.value;
  return hasDetailFilters.value;
});

const filterPanelSummaryText = computed(() => {
  if (!hasActiveFilters.value) return '🔍 筛选面板';
  if (filterMode.value === 'event') {
    const parts = [];
    if (eventFilterCriteria.value.characters.length > 0) {
      parts.push(`角色${eventFilterCriteria.value.characters.length}`);
    }
    if (eventFilterCriteria.value.eventTypes.length > 0) parts.push(`类型${eventFilterCriteria.value.eventTypes.length}`);
    if (eventFilterCriteria.value.festivals.length > 0) parts.push(`节日${eventFilterCriteria.value.festivals.length}`);
    return `活动: ${parts.join(' · ') || '已启用'}`;
  }
  return filterCriteria.value.selectedChars.length > 0
    ? `已选: ${filterCriteria.value.selectedChars[0]}`
    : '🔍 筛选面板';
});

const isEventUnitFilterDisabledByMix = computed(() => {
  return eventFilterCriteria.value.eventTypes.includes('mix');
});

const eventFestivalOptions = computed(() => {
  const set = new Set();
  baseEvents.value.forEach((event) => {
    const fest = String(event?.festival || '').trim();
    if (!fest || EVENT_FESTIVAL_EXCLUDE.has(fest)) return;
    set.add(fest);
  });
  const ordered = EVENT_FESTIVAL_ORDER.filter((fest) => set.has(fest));
  const extra = [...set].filter((fest) => !EVENT_FESTIVAL_ORDER.includes(fest));
  return [...ordered, ...extra];
});

const baseEvents = computed(() => {
  const forceShowCollab = filterMode.value === 'event' && (
    eventFilterCriteria.value.eventTypes.includes('collab')
    || eventFilterCriteria.value.gachaTypes.includes('collab')
  );
  if (forceShowCollab) return sortedEvents.value;
  if (!hideCollabPools.value) return sortedEvents.value;
  return sortedEvents.value.filter((event) => !isCollabPoolEvent(event));
});

const baseEventRows = computed(() => {
  return baseEvents.value.map((event) => ({
    kind: 'event',
    key: `event-${normalizeEventId(event?.id)}`,
    event
  }));
});

// 核心筛选逻辑
// 3. 【重构】简化核心筛选逻辑的数据源
const filteredData = computed(() => {
  let data = baseEvents.value;

  if (filterMode.value === 'event') {
    if (!hasEventFilters.value) return data;
    return data.filter((event) => matchEventFilters(event));
  }

  if (!hasDetailFilters.value) return data;

  return data.filter(event => {
    const selectedNames = filterCriteria.value.selectedChars;

    const targetChar = selectedNames[0];
    return (event.memberCards || []).some(card => {
      const cardMainName = card.Name.split(' ')[0];
      if (cardMainName !== targetChar) return false;

      let matchType = true;
      if (filterCriteria.value.cardType) {
        const cType = card.Type?.toLowerCase();
        if (filterCriteria.value.cardType === 'collab') {
          matchType = (cType === 'collab' || cType === 'collab_t');
        } else if (filterCriteria.value.cardType === 'ue') {
          matchType = ['wl1', 'wl2', 'wl3'].includes(cType);
        } else {
          matchType = (cType === filterCriteria.value.cardType);
        }
      }
      const matchRarity = !filterCriteria.value.rarity || 
                         (filterCriteria.value.rarity === 'birthday' 
                            ? card.Type === 'birthday' 
                            : parseInt(card.Rarity) === filterCriteria.value.rarity);      
      const matchAttr = !filterCriteria.value.attribute || 
             (card.Attribute && normalizeAttr(card.Attribute) === normalizeAttr(filterCriteria.value.attribute)); 

      const matchSkill = !filterCriteria.value.skill || 
                 (card.Skill && card.Skill.toLowerCase() === filterCriteria.value.skill.toLowerCase());

      const matchUnit = !filterCriteria.value.unit || 
                 (card.Affiliation && card.Affiliation.toLowerCase() === filterCriteria.value.unit.toLowerCase());
      return matchRarity && matchAttr && matchSkill && matchType && matchUnit;
    });
  });
});

const birthdayRows = computed(() => {
  const rows = [];
  const seen = new Set();
  const sourceCards = (props.allBaseCards && props.allBaseCards.length > 0)
    ? props.allBaseCards
    : (props.allCards || []);

  sourceCards.forEach((card) => {
    if (String(card?.Type || '').toLowerCase() !== 'birthday') return;
    const name = String(card?.Name || '').trim().split(' ')[0];
    const date = String(card?.Date || '').trim();
    if (!name || !date) return;

    const key = `${name}|${date}`;
    if (seen.has(key)) return;
    seen.add(key);

    rows.push({
      kind: 'birthday',
      key: `birthday-${key}`,
      id: `birthday-${key}`,
      name,
      date,
      attribute: normalizeAttr(card?.Attribute)
    });
  });

  return rows;
});

const filteredBirthdayRows = computed(() => {
  if (filterMode.value === 'event') return [];
  if (hideBirthdayRows.value) return [];

  const selected = filterCriteria.value.selectedChars || [];
  return birthdayRows.value.filter((row) => {
    if (selected.length > 0 && !selected.includes(row.name)) return false;

    if (filterCriteria.value.rarity && filterCriteria.value.rarity !== 'birthday') return false;

    if (filterCriteria.value.attribute && normalizeAttr(filterCriteria.value.attribute) !== normalizeAttr(row.attribute)) return false;

    if (filterCriteria.value.skill) return false;
    if (filterCriteria.value.unit) return false;
    if (filterCriteria.value.cardType) return false;

    return true;
  });
});

const displayRows = computed(() => {
  const events = hasActiveFilters.value
    ? filteredData.value.map((event) => ({
      kind: 'event',
      key: `event-${normalizeEventId(event?.id)}`,
      event
    }))
    : baseEventRows.value;
  const birthdays = filteredBirthdayRows.value;
  if (!hasActiveFilters.value && birthdays.length === 0) return events;
  if (birthdays.length === 0) return events;
  const merged = [...events, ...birthdays];

  merged.sort((a, b) => {
    const ta = a.kind === 'event' ? getDateValue(a.event?.date) : getDateValue(a.date);
    const tb = b.kind === 'event' ? getDateValue(b.event?.date) : getDateValue(b.date);
    if (ta !== tb) return sortDesc.value ? tb - ta : ta - tb;

    if (a.kind !== b.kind) return a.kind === 'event' ? -1 : 1;

    if (a.kind === 'birthday' && b.kind === 'birthday') {
      const ao = BIRTHDAY_ORDER[a.name] ?? 999;
      const bo = BIRTHDAY_ORDER[b.name] ?? 999;
      if (ao !== bo) return ao - bo;
    }

    const ak = a.kind === 'event' ? normalizeEventId(a.event?.id) : a.key;
    const bk = b.kind === 'event' ? normalizeEventId(b.event?.id) : b.key;
    return ak.localeCompare(bk);
  });

  return merged;
});

const updatePreviewConfigOffset = () => {
  if (Number.isFinite(previewConfigPanelPos.value.x) && Number.isFinite(previewConfigPanelPos.value.y)) return;
  const wrapper = historyWrapperRef.value;
  if (!wrapper) return;
  const filterEl = filterStickyRef.value;
  if (!filterEl) {
    wrapper.style.setProperty('--preview-config-top', '16px');
    return;
  }
  const rect = filterEl.getBoundingClientRect();
  const nextTop = Math.max(16, Math.round(rect.bottom + 6));
  wrapper.style.setProperty('--preview-config-top', `${nextTop}px`);
};

const isJumpFilterActive = () => {
  return hasActiveFilters.value;
};

const isEventVisibleInRows = (eventId) => {
  const idKey = normalizeEventId(eventId);
  if (!idKey) return false;
  return displayRows.value.some((row) => row.kind === 'event' && normalizeEventId(row.event?.id) === idKey);
};

const relaxFiltersForJump = (eventId) => {
  const idKey = normalizeEventId(eventId);
  if (!idKey) return;
  if (isEventVisibleInRows(idKey)) return;

  if (hideCollabPools.value) {
    hideCollabPools.value = false;
  }

  if (isJumpFilterActive()) {
    resetFilters();
    showFilter.value = false;
  }
};
// 处理角色点击
const toggleChar = (name) => {
  if (filterMode.value === 'event') return;
  // 单人模式：切换选中或清空
  filterCriteria.value.selectedChars = filterCriteria.value.selectedChars.includes(name) ? [] : [name];
};

const toggleEventFilterCharacter = (name) => {
  const current = [...eventFilterCriteria.value.characters];
  const idx = current.indexOf(name);
  if (idx >= 0) current.splice(idx, 1);
  else current.push(name);
  eventFilterCriteria.value.characters = current;
  if (!canUseEventBanFilter.value) {
    eventFilterCriteria.value.isBan = null;
  }
};

const setEventBanFilter = (value) => {
  if (!canUseEventBanFilter.value) {
    eventFilterCriteria.value.isBan = null;
    return;
  }
  eventFilterCriteria.value.isBan = eventFilterCriteria.value.isBan === value ? null : value;
};

const toggleEventFilterArray = (key, value) => {
  if (key === 'units' && isEventUnitFilterDisabledByMix.value) return;
  const current = [...(eventFilterCriteria.value[key] || [])];
  const idx = current.indexOf(value);
  if (idx >= 0) current.splice(idx, 1);
  else current.push(value);
  eventFilterCriteria.value[key] = current;
  if (key === 'eventTypes' && eventFilterCriteria.value.eventTypes.includes('mix')) {
    eventFilterCriteria.value.units = [];
  }
};

const VS_TOKEN_TO_NAME = {
  MIKU: '初音未来',
  RIN: '镜音铃',
  LEN: '镜音连',
  LUKA: '巡音流歌',
  MEIKO: 'MEIKO',
  KAITO: 'KAITO'
};

const parseEventVsNames = (vsStr) => {
  const names = parseVS(vsStr).map((raw) => {
    const token = String(raw || '').trim();
    if (!token) return '';
    const upper = token.toUpperCase();
    return VS_TOKEN_TO_NAME[upper] || token;
  }).filter(Boolean);
  return names;
};

const getEventCardNames = (event) => {
  const names = new Set();
  const fromEvent = Array.isArray(event?.memberCards) ? event.memberCards : [];
  fromEvent.forEach((card) => {
    const n = String(card?.Name || '').trim().split(' ')[0];
    if (n && n !== '-' && n !== 'CardID') names.add(n);
  });

  const eid = normalizeEventId(event?.id);
  if (eid) {
    (props.allCards || []).forEach((card) => {
      if (normalizeEventId(card?.EventID) !== eid) return;
      const n = String(card?.Name || '').trim().split(' ')[0];
      if (n && n !== '-' && n !== 'CardID') names.add(n);
    });
  }

  return [...names];
};

const eventContainsCharacter = (event, name) => {
  const target = String(name || '').trim();
  if (!target) return true;
  const banner = String(event?.banner || '').trim();
  if (banner === target) return true;
  const vsNames = parseEventVsNames(event?.virtual_singer);
  if (vsNames.includes(target)) return true;
  return getEventCardNames(event).includes(target);
};

const matchEventTypeFilter = (event, typeValue) => {
  const eventType = String(event?.event_type || '').trim();
  const gachaType = String(event?.gacha_type || '').trim();
  const idRaw = String(event?.id || '').trim().toLowerCase();
  if (typeValue === 'box') return eventType === '箱活';
  if (typeValue === 'mix') return eventType === '混活';
  if (typeValue === 'wl') return ['wl', 'world link', 'world link终章'].includes(eventType.toLowerCase());
  if (typeValue === 'collab') {
    return eventType.includes('联动') || gachaType.includes('联动') || /^c\d+$/.test(idRaw);
  }
  return false;
};

const matchEventGachaFilter = (event, gachaValue) => {
  const gachaType = String(event?.gacha_type || '').trim();
  if (gachaValue === 'perm') return gachaType === '常驻';
  if (gachaValue === 'limited') return gachaType === '普通限定';
  if (gachaValue === 'ue') return gachaType === 'UE限定';
  if (gachaValue === 'collab') return gachaType.includes('联动');
  return false;
};

const matchEventFilters = (event) => {
  const f = eventFilterCriteria.value;
  if (f.characters.length > 0) {
    const hasAllSelected = f.characters.every((name) => eventContainsCharacter(event, name));
    if (!hasAllSelected) return false;
  }

  if (canUseEventBanFilter.value && f.isBan) {
    const targetChar = f.characters[0];
    const isBan = String(event?.banner || '').trim() === targetChar;
    if (f.isBan === 'yes' && !isBan) return false;
    if (f.isBan === 'no' && isBan) return false;
  }

  if (f.eventTypes.length > 0 && !f.eventTypes.some((typeValue) => matchEventTypeFilter(event, typeValue))) return false;

  if (f.festivals.length > 0) {
    const festival = String(event?.festival || '').trim();
    if (!f.festivals.includes(festival)) return false;
  }

  if (f.attributes.length > 0) {
    const attr = normalizeAttr(event?.event_attribute);
    if (!f.attributes.includes(attr)) return false;
  }

  if (f.units.length > 0) {
    const unit = String(event?.unit || '').trim().toLowerCase();
    if (!f.units.includes(unit)) return false;
  }

  if (f.gachaTypes.length > 0 && !f.gachaTypes.some((g) => matchEventGachaFilter(event, g))) return false;
  return true;
};
// 重置所有筛选
const resetFilters = () => {
  filterCriteria.value = { selectedChars: [], rarity: null, attribute: null, skill: null, cardType: null, unit: null };
  eventFilterCriteria.value = {
    characters: [],
    isBan: null,
    eventTypes: [],
    festivals: [],
    attributes: [],
    units: [],
    gachaTypes: []
  };
};

const historyContainer = ref(null); // 声明 ref
const historyScrollTop = ref(0);
const HISTORY_SCROLL_KEY = 'pjsk_history_scroll_top_v1';
const viewportAnchor = ref({ id: '', top: 0 });
const pendingJumpEventId = ref('');
const suppressRestoreUntil = ref(0);
const isCompactFilterBar = ref(false);
let resizeRafId = 0;
let jumpRetryTimer = 0;

const updateCompactFilterState = () => {
  isCompactFilterBar.value = window.innerWidth <= 900;
};

const saveHistoryScroll = () => {
  if (!historyContainer.value) return;
  historyScrollTop.value = historyContainer.value.scrollTop || 0;
  try {
    sessionStorage.setItem(HISTORY_SCROLL_KEY, String(historyScrollTop.value));
  } catch (_) {}
};

const handleHistoryScroll = () => {
  updateViewportAnchor();
  saveHistoryScroll();
};

const getViewportAnchor = () => {
  const container = historyContainer.value;
  if (!container) return null;

  const containerTop = container.getBoundingClientRect().top;
  const nodes = container.querySelectorAll('.event-item, .birthday-row');
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.bottom > containerTop + 24) {
      if (!node.id) continue;
      return {
        id: node.id,
        top: rect.top - containerTop
      };
    }
  }
  return null;
};

const updateViewportAnchor = () => {
  const anchor = getViewportAnchor();
  if (!anchor) return;
  viewportAnchor.value = anchor;
};

const restoreViewportAnchor = () => {
  const container = historyContainer.value;
  const anchor = viewportAnchor.value;
  if (!container || !anchor?.id) return;

  const el = findRowElementInContainer(anchor.id);
  if (!el) return;

  const containerTop = container.getBoundingClientRect().top;
  const nextTop = el.getBoundingClientRect().top - containerTop;
  container.scrollTop += (nextTop - anchor.top);
  saveHistoryScroll();
};

const handleWindowResize = () => {
  if (resizeRafId) cancelAnimationFrame(resizeRafId);
  resizeRafId = requestAnimationFrame(() => {
    updateCompactFilterState();
    if (Number.isFinite(previewConfigPanelPos.value.x) && Number.isFinite(previewConfigPanelPos.value.y)) {
      previewConfigPanelPos.value = clampPreviewConfigPanelPos(previewConfigPanelPos.value.x, previewConfigPanelPos.value.y);
    }
    updatePreviewConfigOffset();
    restoreViewportAnchor();
    Object.keys(previewPanelState.value).forEach((panelId) => clampPreviewPanelPosition(panelId));
    resizeRafId = 0;
  });
};

watch([showFilter, isEditorOpen], () => {
  nextTick(() => {
    updatePreviewConfigOffset();
  });
}, { flush: 'post' });

const consumePendingJump = (behavior = 'auto', retry = 8) => {
  const idKey = pendingJumpEventId.value;
  if (!idKey) return false;

  relaxFiltersForJump(idKey);

  const ok = _internalScrollTo(idKey, behavior);
  if (ok) {
    if (pendingJumpSeq.value > 0) {
      lastHandledJumpSeq.value = pendingJumpSeq.value;
    }
    pendingJumpEventId.value = '';
    pendingJumpSeq.value = 0;
    if (jumpRetryTimer) {
      clearTimeout(jumpRetryTimer);
      jumpRetryTimer = 0;
    }
    return true;
  }

  if (retry > 0) {
    if (jumpRetryTimer) clearTimeout(jumpRetryTimer);
    jumpRetryTimer = setTimeout(() => {
      consumePendingJump(behavior, retry - 1);
    }, 80);
  }
  return false;
};

const jumpToEventById = (eventId, behavior = 'auto') => {
  const idKey = normalizeEventId(eventId);
  if (!idKey) return false;
  pendingJumpEventId.value = idKey;
  if (pendingJumpSeq.value <= 0) {
    pendingJumpSeq.value = Number(props.jumpEventSeq || 0);
  }
  return consumePendingJump(behavior, 30);
};

defineExpose({
  jumpToEventById
});

const isReloadNavigation = () => {
  try {
    const navEntries = performance.getEntriesByType('navigation');
    const nav = Array.isArray(navEntries) && navEntries.length > 0 ? navEntries[0] : null;
    return nav?.type === 'reload';
  } catch (_) {
    return false;
  }
};

const restoreHistoryScroll = () => {
  const container = historyContainer.value;
  if (!container) return;
  if (pendingJumpEventId.value) return;
  if (Date.now() < suppressRestoreUntil.value) return;

  let targetTop = historyScrollTop.value;
  if (!Number.isFinite(targetTop) || targetTop <= 0) {
    try {
      const cached = Number(sessionStorage.getItem(HISTORY_SCROLL_KEY) || '0');
      targetTop = Number.isFinite(cached) ? cached : 0;
    } catch (_) {
      targetTop = 0;
    }
  }

  requestAnimationFrame(() => {
    container.scrollTop = targetTop;
    requestAnimationFrame(() => {
      container.scrollTop = targetTop;
    });
  });
};

onMounted(() => {
  window.addEventListener('mousemove', handleDragPreviewConfig);
  window.addEventListener('mouseup', stopDragPreviewConfig);
  window.addEventListener('touchmove', handleDragPreviewConfigTouch, { passive: false });
  window.addEventListener('touchend', stopDragPreviewConfig);
  window.addEventListener('touchcancel', stopDragPreviewConfig);
  window.addEventListener('mousemove', handleDragPreview);
  window.addEventListener('mousemove', handleResizePreview);
  window.addEventListener('mouseup', stopDragPreview);
  window.addEventListener('mouseup', stopResizePreview);
  window.addEventListener('touchmove', handleDragPreviewTouch, { passive: false });
  window.addEventListener('touchmove', handleResizePreviewTouch, { passive: false });
  window.addEventListener('touchend', stopDragPreview);
  window.addEventListener('touchend', stopResizePreview);
  window.addEventListener('touchcancel', stopDragPreview);
  window.addEventListener('touchcancel', stopResizePreview);
  updateCompactFilterState();
  updatePreviewConfigOffset();
  if (isReloadNavigation()) {
    historyScrollTop.value = 0;
    try {
      sessionStorage.setItem(HISTORY_SCROLL_KEY, '0');
    } catch (_) {}
  }

  nextTick(() => {
    queueJumpFromProps();
    if (pendingJumpEventId.value) {
      consumePendingJump('auto', 20);
    } else if (!consumePendingJump('auto')) {
      restoreHistoryScroll();
      saveHistoryScroll();
    } else {
      saveHistoryScroll();
    }
    updateViewportAnchor();
  });
  window.addEventListener('resize', handleWindowResize);
});

onDeactivated(() => {
  stopDragPreviewConfig();
  emit('sync-preview-event-id', null);
  stopDragPreview();
  stopResizePreview();
  pendingJumpEventId.value = '';
  pendingJumpSeq.value = 0;
  if (jumpRetryTimer) {
    clearTimeout(jumpRetryTimer);
    jumpRetryTimer = 0;
  }
  if (resizeRafId) {
    cancelAnimationFrame(resizeRafId);
    resizeRafId = 0;
  }
  window.removeEventListener('mousemove', handleDragPreviewConfig);
  window.removeEventListener('mouseup', stopDragPreviewConfig);
  window.removeEventListener('touchmove', handleDragPreviewConfigTouch);
  window.removeEventListener('touchend', stopDragPreviewConfig);
  window.removeEventListener('touchcancel', stopDragPreviewConfig);
  window.removeEventListener('mousemove', handleDragPreview);
  window.removeEventListener('mousemove', handleResizePreview);
  window.removeEventListener('mouseup', stopDragPreview);
  window.removeEventListener('mouseup', stopResizePreview);
  window.removeEventListener('touchmove', handleDragPreviewTouch);
  window.removeEventListener('touchmove', handleResizePreviewTouch);
  window.removeEventListener('touchend', stopDragPreview);
  window.removeEventListener('touchend', stopResizePreview);
  window.removeEventListener('touchcancel', stopDragPreview);
  window.removeEventListener('touchcancel', stopResizePreview);
  window.removeEventListener('resize', handleWindowResize);
});

onActivated(() => {
  nextTick(() => {
    queueJumpFromProps();
    if (pendingJumpEventId.value) {
      consumePendingJump('auto', 20);
    } else if (!consumePendingJump('auto')) {
      restoreHistoryScroll();
    }
    updateViewportAnchor();
    updatePreviewConfigOffset();
  });
  window.addEventListener('mousemove', handleDragPreviewConfig);
  window.addEventListener('mouseup', stopDragPreviewConfig);
  window.addEventListener('touchmove', handleDragPreviewConfigTouch, { passive: false });
  window.addEventListener('touchend', stopDragPreviewConfig);
  window.addEventListener('touchcancel', stopDragPreviewConfig);
  window.addEventListener('mousemove', handleDragPreview);
  window.addEventListener('mousemove', handleResizePreview);
  window.addEventListener('mouseup', stopDragPreview);
  window.addEventListener('mouseup', stopResizePreview);
  window.addEventListener('touchmove', handleDragPreviewTouch, { passive: false });
  window.addEventListener('touchmove', handleResizePreviewTouch, { passive: false });
  window.addEventListener('touchend', stopDragPreview);
  window.addEventListener('touchend', stopResizePreview);
  window.addEventListener('touchcancel', stopDragPreview);
  window.addEventListener('touchcancel', stopResizePreview);
  window.addEventListener('resize', handleWindowResize);
});

onBeforeUnmount(() => {
  stopDragPreviewConfig();
  emit('sync-preview-event-id', null);
  stopDragPreview();
  stopResizePreview();
  if (jumpRetryTimer) {
    clearTimeout(jumpRetryTimer);
    jumpRetryTimer = 0;
  }
  if (resizeRafId) {
    cancelAnimationFrame(resizeRafId);
    resizeRafId = 0;
  }
  window.removeEventListener('mousemove', handleDragPreviewConfig);
  window.removeEventListener('mouseup', stopDragPreviewConfig);
  window.removeEventListener('touchmove', handleDragPreviewConfigTouch);
  window.removeEventListener('touchend', stopDragPreviewConfig);
  window.removeEventListener('touchcancel', stopDragPreviewConfig);
  window.removeEventListener('mousemove', handleDragPreview);
  window.removeEventListener('mousemove', handleResizePreview);
  window.removeEventListener('mouseup', stopDragPreview);
  window.removeEventListener('mouseup', stopResizePreview);
  window.removeEventListener('touchmove', handleDragPreviewTouch);
  window.removeEventListener('touchmove', handleResizePreviewTouch);
  window.removeEventListener('touchend', stopDragPreview);
  window.removeEventListener('touchend', stopResizePreview);
  window.removeEventListener('touchcancel', stopDragPreview);
  window.removeEventListener('touchcancel', stopResizePreview);
  window.removeEventListener('resize', handleWindowResize);
});

// 滚动逻辑优化
const scrollTo = (target) => {
  const container = historyContainer.value;
  if (!container) return;

  if (target === 'top') {
    container.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (target === 'bottom') {
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  } else if (target === 'current') {
    const today = new Date();
    const candidates = (props.allEvents || []).filter(ev => {
      if (!isNumericEventId(ev?.id)) return false;
      // 兼容日期格式处理
      const evDate = new Date(ev.date.replace(/\//g, '-'));
      return evDate <= today;
    });

    if (candidates.length > 0) {
      const currentEvent = candidates.reduce((prev, curr) => (prev.id > curr.id ? prev : curr));
      
      const el = findEventElementInContainer(currentEvent.id);
      if (el) {
        // --- 核心修复逻辑开始 ---
        
        // 1. 获取筛选栏的高度，确保定位后不会被它遮住
        // 如果你的筛选栏 class 是 .filter-bar，动态获取它的高度
        const filterBar = container.querySelector('.filter-bar');
        const offset = filterBar ? filterBar.offsetHeight + 10 : 80; // 默认预留80px

        // 2. 计算目标元素相对于容器顶部的距离
        // 使用 container.scrollTo 而不是 el.scrollIntoView 
        // 这样可以防止整个网页（外层）跟着一起跳动
        const targetTop = el.offsetTop - offset;

        container.scrollTo({
          top: targetTop,
          behavior: 'smooth'
        });
        
        // --- 核心修复逻辑结束 ---

        setActiveEventItem(currentEvent.id);
      }
    }
  }
};

const CHAR_MAP = {
  "星乃一歌": "ICK", "天马咲希": "SAKI", "望月穗波": "HNM", "日野森志步": "SHIHO",
  "花里实乃里": "MNR", "桐谷遥": "HRK", "桃井爱莉": "AIRI", "日野森雫": "SZK",
  "小豆泽心羽": "KHN", "白石杏": "AN", "东云彰人": "AKT", "青柳冬弥": "TOYA",
  "天马司": "TKS", "凤笑梦": "EMU", "草薙宁宁": "NENE", "神代类": "RUI",
  "宵崎奏": "KND", "朝比奈真冬": "MFY", "东云绘名": "ENA", "晓山瑞希": "MZK",
  "初音未来": "MIKU", "镜音铃": "RIN", "镜音连": "LEN", "巡音流歌": "LUKA", "MEIKO": "MEIKO", "KAITO": "KAITO",
//  "初音未来 ln": "miku_ln", "初音未来 mmj": "miku_mmj", "初音未来 vbs": "miku_vbs", "初音未来 ws": "miku_ws", "初音未来 nc": "miku_nc"
};
const CHAR_COLORS = {
  "星乃一歌": "#33AAEE", "天马咲希": "#FFDD44", "望月穗波": "#EE6666", "日野森志步": "#BBDD22",
  "花里实乃里": "#FFCCAA", "桐谷遥": "#99CCFF", "桃井爱莉": "#FFAACC", "日野森雫": "#99EEDD",
  "小豆泽心羽": "#FF6699", "白石杏": "#00BBDD", "东云彰人": "#FF7722", "青柳冬弥": "#0077DD",
  "天马司": "#FFBB00", "凤笑梦": "#FF66BB", "草薙宁宁": "#33DD99", "神代类": "#BB88EE",
  "宵崎奏": "#BB6688", "朝比奈真冬": "#8888CC", "东云绘名": "#CCAA88", "晓山瑞希": "#DDAACC",
  "初音未来": "#33CCBB", "镜音铃": "#FFCC11", "镜音连": "#FFEE11", "巡音流歌": "#FFBBCC", "MEIKO": "#DD4444", "KAITO": "#3366CC"
};
const UNIT_COLORS = {
  "ln": "#4455DD", "mmj": "#88DD44", "vbs": "#EE1166", "ws": "#FF9900", "nc": "#884499", "vs": "#000000"
};

// 转换函数
const translateType = (t) => {
  const map = { perm: '常驻', limited: '普通限定', collab: '联动限定', collab_t: '联动限定', cfes: 'CFES', bfes: 'BFES', movie: '剧场版限定', wl1: 'WL1', wl2: 'WL2', wl3: 'WL3' };
  return map[t?.toLowerCase()] || t;
};
const translateSkill = (s) => {
  const map = { score_up: '分卡', accuracy: '判卡', recovery: '奶卡', p_score: 'P分', unit_score: '团分', cfes_l: 'CFES血分', cfes_j: 'CFES判分', bfes_up: 'BFES' };
  return map[s?.toLowerCase()] || s;
};
const translateAttr = (a) => {
  const map = { Happy: '橙心', Mysterious: '紫月', Cute: '粉花', Cool: '蓝星', Pure: '绿草' };
  const normalized = normalizeAttr(a);
  return map[normalized] || a;
};

//const getCharAbbr = (name) => CHAR_MAP[name] || name.toUpperCase() || name.toLowerCase();
const getCharAbbr = (name) => {
  if (!name) return '';
  // 尝试按空格拆分（例如 "初音未来 ln" -> ["初音未来", "ln"]）
  const parts = name.split(' ');
  const mainName = parts[0]; // 角色本体名字
  const unitSuffix = parts.length > 1 ? parts[1].toLowerCase() : null; // 团队后缀
  if (isVirtualSinger(mainName)) {  // 利用 isVirtualSinger 判断是否为虚拟歌手
    const abbr = CHAR_MAP[mainName]; // 从映射表获取基础缩写，如 MIKU, RIN    
    if (unitSuffix && unitSuffix !== 'vs') {    // 如果有团队后缀，且后缀不是 'vs'
      return `${abbr.toLowerCase()}_${unitSuffix}`;      // 返回通用格式：缩写小写_团队名（如 miku_ln）
    }
    return abbr;    // 没有后缀或属于 vs 团队，返回原始大写缩写（如 MIKU）
  }
  // 非虚拟歌手角色，直接按全名查找映射
  return CHAR_MAP[name] || name.toUpperCase() || name.toLowerCase();
};
//const getUnitColor = (unit) => UNIT_COLORS[unit?.toLowerCase()] || '#999999';
const getUnitColor = (unit) => {
  if (!unit) return 'transparent'; // 如果 unit 为空，返回透明或默认背景色
  return UNIT_COLORS[unit.toLowerCase()] || '#999999';
};
//const getCharColor = (name) => CHAR_COLORS[name] || '#999999';
// 修改后的获取颜色逻辑
const getCharColor = (name) => {
  if (!name) return '#999999';
  // 提取真正的角色名：取空格前的部分（例如从 "初音未来 LN" 中提取 "初音未来"）
  const realName = name.split(' ')[0];   
  return CHAR_COLORS[realName] || CHAR_COLORS[name] || '#999999';
};

const isVirtualSinger = (name) => ["初音未来", "镜音铃", "镜音连", "巡音流歌", "MEIKO", "KAITO"].includes(name);
//const isUnitRelated = (ev) => ['箱活','World Link'].includes(ev.event_type);
const isUnitRelated = (ev) => {
  const isTypeMatch = ['箱活', 'WL', 'World Link'].includes(ev.event_type);
  return isTypeMatch && !!ev.unit; // !!ev.unit 确保 unit 不为空字符串或 null
};
const isSpecialFestival = (fest) => ['新年', '半周年', '情人节', '白情', '周年', '婚活'].includes(fest);

const getNormalCards = (cards) => cards.filter(c => !['cfes', 'bfes'].includes(c.Type?.toLowerCase()));
const getFesCards = (cards) => cards.filter(c => ['cfes', 'bfes'].includes(c.Type?.toLowerCase()));
const getFesType = (cards) => cards.find(c => ['cfes', 'bfes'].includes(c.Type?.toLowerCase()))?.Type?.toLowerCase() || 'cfes';

const getTypeTagStyle = (ev) => {
  if (isUnitRelated(ev)) return { backgroundColor: getUnitColor(ev.unit) };
  return { background: 'linear-gradient(45deg, #FD7CC1 0%, #87C0FF 50%, #F8FF87 100%)', color: '#FFFFFF', fontWeight: 'bold' };
};

const formatSeries = (ev) => {
  if (!ev.type_series_id) return '';
  if (ev.event_type === '箱活') return `${ev.banner.split(' ')[0]} ${ev.type_series_id}箱`;
  if (ev.event_type === '混活') return `${ev.banner.split(' ')[0]} ${ev.type_series_id}混`;
  if (ev.event_type === 'World Link') return `${ev.unit} WL${ev.type_series_id}`;
  return ev.type_series_id;
};

const parseVS = (vsStr) => {
  if (!vsStr) return [];
  return vsStr.split(/[,，/、\s]+/).filter(s => s);
};

const getFestivalPreviewUnitLogo = (name) => {
  const raw = String(name || '').trim();
  if (!raw) return '';
  const parts = raw.split(' ');
  const baseName = parts[0] || raw;
  if (!isVirtualSinger(baseName)) return '';
  const unit = String(parts[1] || '').trim().toLowerCase();
  if (!unit || unit === 'vs') return '';
  return `/elements/${unit}.png`;
};


</script>

<style scoped>
/* 外层包裹器，使用 flex 布局 */
/* 1. 最外层容器：强制充满屏幕且不溢出 */
.event-history-wrapper {
  display: flex;
  width: 100%;
  height: 100%;
  position: relative; /* 锁定外层不滚动 */
  top: 0;
  left: 0;
  overflow: hidden;
  --editor-drawer-width: 380px;
  --preview-config-top: 16px;
}

.predict-preview-floating {
  position: static;
  z-index: 6200;
  pointer-events: none;
}

.preview-config-panel {
  position: fixed;
  left: 14px;
  top: var(--preview-config-top);
  z-index: 6200;
  width: 360px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
  padding: 8px;
  pointer-events: auto;
  max-height: 42vh;
  overflow: auto;
}

.preview-config-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.78rem;
  font-weight: 700;
  color: #334155;
  margin-bottom: 6px;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.preview-config-head:active {
  cursor: grabbing;
}

.preview-config-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.preview-config-panel.is-collapsed {
  width: 210px;
  max-height: none;
  overflow: visible;
}

.preview-config-reset {
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
  font-size: 0.68rem;
  padding: 3px 9px;
  cursor: pointer;
}

.preview-config-reset:hover {
  background: #e2e8f0;
}

.preview-config-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preview-config-btn {
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
  font-size: 0.72rem;
  padding: 4px 10px;
  cursor: pointer;
}

.preview-config-btn.is-active {
  background: #0ea5e9;
  color: #fff;
  border-color: #0ea5e9;
}

.preview-config-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.preview-char-select {
  margin-top: 8px;
  border-top: 1px dashed #cbd5e1;
  padding-top: 8px;
}

.preview-char-select-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.72rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
}

.preview-char-select-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.preview-char-select-toggle {
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
  font-size: 0.64rem;
  padding: 2px 8px;
  cursor: pointer;
}

.preview-char-select-toggle:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.preview-char-select.is-collapsed .preview-char-select-title {
  margin-bottom: 0;
}

.preview-char-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.preview-char-chip {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid #cbd5e1;
  background: #fff;
  padding: 0;
  cursor: pointer;
}

.preview-char-chip.is-active {
  border-color: #0ea5e9;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.22);
}

.preview-char-chip:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.preview-char-chip-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.preview-festival-select {
  margin-top: 6px;
}

.preview-festival-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preview-festival-chip {
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #fff;
  color: #334155;
  font-size: 0.68rem;
  line-height: 1;
  padding: 4px 9px;
  cursor: pointer;
}

.preview-festival-chip.is-active {
  border-color: #0ea5e9;
  background: rgba(14, 165, 233, 0.14);
  color: #0f172a;
}

.preview-festival-fes-toggle {
  margin-top: 7px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.68rem;
  color: #475569;
  user-select: none;
}

.preview-festival-fes-toggle input {
  width: 14px;
  height: 14px;
}

.preview-panel {
  position: fixed;
  min-width: 0;
  border-radius: 10px;
  padding: 10px 10px 8px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.15);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(4px);
  pointer-events: auto;
  overflow: hidden;
}

.preview-panel.is-collapsed {
  min-width: 160px;
  padding: 8px 10px;
}

.preview-panel-head {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  color: #1f2937;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.preview-panel-head:active {
  cursor: grabbing;
}

.preview-icon {
  font-size: 0.85rem;
}

.preview-title {
  font-size: 0.86rem;
  font-weight: 700;
}

.preview-collapse-btn {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: #f8fafc;
  color: #334155;
  font-size: 0.8rem;
  cursor: pointer;
  margin-left: 6px;
  padding: 0;
  line-height: 1;
}

.preview-collapse-btn:hover {
  background: #e2e8f0;
}

.preview-drag-hint {
  margin-left: auto;
  font-size: 0.68rem;
  color: #6b7280;
}

.preview-steps {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  overflow: hidden;
  width: 100%;
}

.preview-attr-head,
.preview-attr-row {
  display: grid;
  grid-template-columns: 26px repeat(5, 22px);
  align-items: center;
  justify-items: center;
  gap: 4px;
  font-size: 0.72rem;
  width: fit-content;
}

.preview-attr-head {
  color: #64748b;
  font-weight: 700;
  padding: 0 2px;
}

.preview-attr-head > :first-child,
.preview-attr-row > :first-child {
  justify-self: center;
}

.preview-attr-head-icon {
  width: 16px;
  height: 16px;
  justify-self: center;
  object-fit: contain;
}

.preview-attr-row {
  background: rgba(241, 245, 249, 0.9);
  border-radius: 6px;
  padding: 2px;
}

.preview-attr-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.preview-festival-head {
  width: 100%;
  font-size: 0.72rem;
  color: #334155;
  font-weight: 700;
  margin-bottom: 2px;
}

.preview-festival-fes-state {
  margin-left: 6px;
  font-weight: 600;
  color: #0f766e;
}

.preview-festival-row {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  border-radius: 6px;
  padding: 2px 6px;
  background: rgba(236, 253, 245, 0.9);
  box-sizing: border-box;
}

.preview-festival-label {
  flex: 0 0 30px;
  min-width: 30px;
  text-align: center;
  font-size: 0.72rem;
  font-weight: 700;
  color: #065f46;
}

.preview-festival-avatars {
  flex: 1 1 auto;
}

.preview-festival-avatar-box {
  position: relative;
}

.preview-festival-unit-logo {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 10px;
  height: 10px;
  object-fit: contain;
  z-index: 2;
}

.preview-festival-count {
  position: absolute;
  right: -4px;
  top: -4px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  font-size: 7px;
  line-height: 11px;
  font-weight: 700;
  text-align: center;
  background: #ef4444;
  color: #fff;
}

.preview-festival-perm {
  position: absolute;
  left: -4px;
  bottom: -2px;
  border-radius: 6px;
  padding: 0 3px;
  font-size: 8px;
  line-height: 1.2;
  background: rgba(15, 23, 42, 0.88);
  color: #fff;
}

.preview-vs-mini-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 3px;
  table-layout: fixed;
}

.preview-vs-mini-table th,
.preview-vs-mini-table td {
  text-align: center;
  font-size: 0.68rem;
  color: #0f172a;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.12);
  padding: 3px 0;
}

.preview-vs-mini-table thead th {
  background: rgba(148, 163, 184, 0.12);
  color: #0f172a;
  font-weight: 700;
}

.preview-vs-mini-unit-logo {
  width: 16px;
  height: 16px;
  object-fit: contain;
  vertical-align: middle;
}

.preview-vs-mini-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  vertical-align: middle;
}

.preview-vs-score-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 3px;
  table-layout: fixed;
}

.preview-vs-score-table th,
.preview-vs-score-table td {
  text-align: center;
  font-size: 0.68rem;
  color: #0f172a;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.12);
  padding: 3px 2px;
  vertical-align: middle;
}

.preview-vs-score-icons {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2px;
}

.preview-vs-score-attr {
  width: 13px;
  height: 13px;
  object-fit: contain;
}

.preview-vs-score-empty {
  color: #94a3b8;
}

.preview-step {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  border-radius: 6px;
  padding: 2px 6px;
  background: rgba(236, 253, 245, 0.9);
  color: #065f46;
  font-size: 0.72rem;
  line-height: 1.2;
  width: 100%;
  box-sizing: border-box;
}

.preview-count {
  flex: 0 0 26px;
  min-width: 26px;
  text-align: center;
  font-size: 0.84rem;
  font-weight: 700;
}

.preview-meta {
  color: #0f766e;
}

.preview-avatars {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  align-items: start;
  max-width: 100%;
}

.preview-avatar-box {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.preview-avatar {
  width: 21px;
  height: 21px;
  border-radius: 50%;
  border: none;
  object-fit: cover;
}

.preview-reward-sub {
  font-size: 9px;
  line-height: 1;
  color: #475569;
}

.preview-step-empty {
  justify-content: center;
  background: rgba(241, 245, 249, 0.9);
}

.preview-resize-handle {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 14px;
  height: 14px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 0 45%, #94a3b8 45% 55%, transparent 55% 100%);
}

.float-stats-fade-enter-active,
.float-stats-fade-leave-active {
  transition: opacity 0.18s ease;
}

.float-stats-fade-enter-from,
.float-stats-fade-leave-to {
  opacity: 0;
}
/* 2. 左侧：活动列表区 */
.event-history {
  flex: 1; /* 占据剩余所有空间 */
  height: 100%;
  overflow-y: auto; /* 只有列表区可以滚动 */
  overflow-x: hidden;
  padding: 0 20px 20px;
  box-sizing: border-box;
  background: #f4f7f6;
  transition: margin-right 0.18s ease;
  min-width: 0; /* 防止子元素撑开 flex */
  touch-action: pan-y;
  overscroll-behavior-x: contain;
}

.event-history > h1 {
  display: none;
}
/* 如果你希望编辑器是覆盖式的（Overlapping），则维持 position: fixed 
   但给左侧列表增加 marginRight */
@media (min-width: 1001px) {
  .event-history-wrapper.with-editor .event-history {
    margin-right: var(--editor-drawer-width); /* 强制拉开距离，绝不重叠 */
  }

  /* 预测抽屉打开时启用紧凑模式，直接压缩关键尺寸，保证肉眼可见。 */
  .event-history-wrapper.with-editor .history-list {
    gap: 10px;
    margin-top: 16px;
  }

  .event-history-wrapper.with-editor .event-item {
    padding: clamp(10px, 1vw, 14px) clamp(12px, 1.2vw, 20px);
    border-left-width: 6px;
  }

  .event-history-wrapper.with-editor .event-item,
  .event-history-wrapper.with-editor .event-item *,
  .event-history-wrapper.with-editor .birthday-row,
  .event-history-wrapper.with-editor .birthday-row * {
    transition: none !important;
  }

  .event-history-wrapper.with-editor .event-basic {
    width: clamp(48px, 4.4vw, 60px);
    gap: 3px;
  }

  .event-history-wrapper.with-editor .event-id {
    font-size: clamp(0.92rem, 0.98vw, 1.08rem);
  }

  .event-history-wrapper.with-editor .event-date {
    font-size: clamp(0.64rem, 0.72vw, 0.74rem);
  }

  .event-history-wrapper.with-editor .box-turn-tag {
    font-size: 0.56rem;
    padding: 1px 5px;
  }

  .event-history-wrapper.with-editor .banner-section {
    width: clamp(66px, 6vw, 80px);
    margin: 0 clamp(4px, 0.7vw, 8px);
  }

  .event-history-wrapper.with-editor .banner-avatar {
    width: clamp(52px, 4.8vw, 64px);
    height: clamp(52px, 4.8vw, 64px);
  }

  .event-history-wrapper.with-editor .unit-logo-banner {
    width: clamp(56px, 5.2vw, 68px);
    height: clamp(56px, 5.2vw, 68px);
  }

  .event-history-wrapper.with-editor .event-main-content {
    width: clamp(138px, 13.2vw, 176px);
    padding: 0 4px;
    min-width: 0;
  }

  .event-history-wrapper.with-editor .event-title {
    font-size: clamp(0.9rem, 1.02vw, 1rem);
    line-height: 1.26;
  }

  .event-history-wrapper.with-editor .type-tag {
    font-size: clamp(0.66rem, 1vw, 0.74rem);
    padding: 1px 7px;
    white-space: nowrap;
    flex: 0 0 auto;
  }

  .event-history-wrapper.with-editor .series-text {
    font-size: clamp(0.76rem, 1.05vw, 0.9rem);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex: 1 1 auto;
  }

  .event-history-wrapper.with-editor .fest-tag {
    font-size: 0.62rem;
    padding: 1px 5px;
  }

  .event-history-wrapper.with-editor .type-indicator {
    margin-top: 3px;
    gap: 6px;
    min-width: 0;
    flex-wrap: nowrap;
  }

  .event-history-wrapper.with-editor .event-members {
    --with-editor-gap: 4px;
    --with-editor-slot-size: clamp(64px, calc((100% - (var(--with-editor-gap) * 5)) / 6), 118px);
    gap: 8px;
    padding: 0 8px;
  }

  .event-history-wrapper.with-editor .member-row:not(.fes-row) {
    display: flex;
    flex-wrap: wrap;
    column-gap: var(--with-editor-gap);
    row-gap: 6px;
    align-items: flex-start;
    justify-content: flex-start;
  }

  .event-history-wrapper.with-editor .fes-row {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: var(--with-editor-gap);
    padding-left: 10px;
  }

  .event-history-wrapper.with-editor .member-row .member-card-box {
    flex: 0 0 var(--with-editor-slot-size);
    width: var(--with-editor-slot-size);
    max-width: var(--with-editor-slot-size);
    justify-self: start;
  }

  .event-history-wrapper.with-editor .fes-row .member-card-box {
    flex: 0 0 var(--with-editor-slot-size);
    width: var(--with-editor-slot-size);
    max-width: var(--with-editor-slot-size);
  }

  .event-history-wrapper.with-editor .fes-type-icon {
    height: 52px;
    flex: 0 0 auto;
    margin-right: 8px;
  }

  .event-history-wrapper.with-editor .avatar-container {
    width: min(100%, var(--with-editor-slot-size));
    height: min(100%, var(--with-editor-slot-size));
    aspect-ratio: 1 / 1;
    border-width: 3px;
    box-sizing: border-box;
    margin: 0 auto;
  }

  .event-history-wrapper.with-editor .avatar-container .star-icon {
    width: clamp(8px, calc(var(--with-editor-slot-size) * 0.16), 11px);
    height: clamp(8px, calc(var(--with-editor-slot-size) * 0.16), 11px);
  }

  .event-history-wrapper.with-editor .lim-tag {
    top: -2px;
    right: calc(var(--with-editor-slot-size) * 0.2);
    width: auto;
    height: auto;
    line-height: 1.1;
    padding: 1px 4px;
    font-size: clamp(6px, calc(var(--with-editor-slot-size) * 0.11), 8px);
    border-radius: 8px;
    transform: none;
    clip-path: none;
  }

  .event-history-wrapper.with-editor .vs-section {
    width: 56px;
    max-width: 56px;
    flex: 0 0 56px;
    gap: 4px;
    justify-content: center;
    overflow: hidden;
  }

  .event-history-wrapper.with-editor .vs-avatar,
  .event-history-wrapper.with-editor .vs-list img {
    width: clamp(22px, calc(var(--with-editor-slot-size) * 0.4), 30px);
    height: clamp(22px, calc(var(--with-editor-slot-size) * 0.4), 30px);
    max-width: 30px;
    max-height: 30px;
    border-radius: 50%;
    object-fit: cover;
  }

  .event-history-wrapper.with-editor .song-tooltip,
  .event-history-wrapper.with-editor .attr-section {
    display: none;
  }

  .event-history-wrapper.with-editor .card-attr-icon {
    width: clamp(14px, calc(var(--with-editor-slot-size) * 0.28), 20px);
    height: clamp(14px, calc(var(--with-editor-slot-size) * 0.28), 20px);
  }

  .event-history-wrapper.with-editor .sub-unit-logo {
    width: clamp(18px, calc(var(--with-editor-slot-size) * 0.34), 24px);
    height: clamp(18px, calc(var(--with-editor-slot-size) * 0.34), 24px);
    right: -7px;
    bottom: -4px;
  }

  .event-history-wrapper.with-editor .birthday-row {
    min-height: 34px;
    padding: 4px 10px;
    gap: 10px;
  }

  .event-history-wrapper.with-editor .birthday-date {
    width: 78px;
    font-size: 0.72rem;
  }

  .event-history-wrapper.with-editor .birthday-name {
    min-width: 74px;
    font-size: 0.9rem;
  }

  .event-history-wrapper.with-editor .birthday-row-icon {
    width: 18px;
    height: 18px;
  }
}

.filter-sticky {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: #f4f7f6;
  overflow: visible;
}

.filter-bar {
  background: #f4f7f6;
  padding: 15px 5px;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  gap: 10px;
}

.nav-btn {
  padding: 8px 15px;
  flex: 0 0 auto;
  cursor: pointer;
  border-radius: 6px;
  border: 1px solid #ddd;
  background: #fff;
  transition: 0.2s;
  white-space: nowrap;
}
.nav-btn:hover { background: #eee; }


.filter-bar { margin-bottom: 15px; }
.sort-btn { padding: 8px 16px; cursor: pointer; border-radius: 4px; border: 1px solid #ddd; background: #fff; flex: 0 0 auto; white-space: nowrap; }

.compact-btn-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
  vertical-align: middle;
}

.birthday-inline-icon {
  margin-right: 4px;
}

.clear-btn {
  flex: 0 0 auto;
  white-space: nowrap;
}
.history-list { display: flex; flex-direction: column; gap: 12px; padding-bottom: 16px; 
  margin-top: 20px; }

.event-item {
  scroll-margin-top: 80px; /* 对应 .sticky-filter 的高度 */
  position: relative; /* 必须为 relative 以便伪元素定位 */
  z-index: 1;
  display: flex; align-items: center; padding: 12px 20px; border-radius: 12px;
  background: var(--bg-color); box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: all 0.2s; border-left: 6px solid transparent;
  box-sizing: border-box;
}
.event-item:hover { z-index: 1200; transform: translateX(5px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

.birthday-row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 42px;
  border-radius: 10px;
  padding: 6px 14px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  box-sizing: border-box;
}

.birthday-date {
  width: 95px;
  font-size: 0.78rem;
  color: #4b5563;
}

.birthday-name {
  font-weight: 700;
  color: #111827;
  min-width: 92px;
}

.birthday-main-icon {
  display: inline-flex;
  align-items: center;
}

.birthday-attr-end {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
}

.birthday-row-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.predict-delete-btn {
  position: absolute;
  top: 8px;
  right: 10px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.92);
  color: #fff;
  font-size: 16px;
  line-height: 24px;
  text-align: center;
  cursor: pointer;
  z-index: 1300;
  padding: 0;
}

.predict-delete-btn:hover {
  background: #dc2626;
}

.predict-status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 0.62rem;
  line-height: 1.2;
  color: #fff;
  font-weight: 700;
}

.predict-status-badge.is-todo {
  background: #f59e0b;
}

.predict-status-badge.is-done {
  background: #10b981;
}

.box-turn-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 0.62rem;
  line-height: 1.2;
  color: #fff;
  background: #2563eb;
  font-weight: 700;
}


/* 活跃状态基础样式 */
.event-item.is-active {
  position: relative;
  z-index: 10;
  transform: translateX(10px);
  box-shadow: 0 4px 20px rgba(51, 204, 187, 0.3);
  /* 确保这里不设置 border，否则会挤压内部布局 */
  border: none; 
}

/* 专门负责流光的伪元素 */
.event-item.is-active::before {
  content: "";
  position: absolute;
  /* 这里的负值决定了边框的粗细（向外扩散 3px） */
  top: -3px;
  left: -3px;
  right: -3px;
  bottom: -3px;
  
  /* 流光渐变 */
  background: linear-gradient(90deg, #33CCBB, #FD7CC1, #FFEE11, #33CCBB);
  background-size: 300% 100%;
  
  /* 必须设置比父级稍大一点的圆角 */
  border-radius: 15px; 
  
  /* 核心：将中间部分镂空，只露出边缘 */
  -webkit-mask: 
    linear-gradient(#fff 0 0) content-box, 
    linear-gradient(#fff 0 0);
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  
  padding: 3px; /* 这里的厚度要和 top/left 的负值一致 */
  animation: border-flowing 4s linear infinite;
  pointer-events: none;
  z-index: -1; /* 确保在内容下方，但在背景上方 */
}

@keyframes border-flowing {
  0% { background-position: 0% 0%; }
  100% { background-position: 300% 0%; }
}

/* 筛选面板基础样式 */
.filter-panel {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.filter-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.row-label {
  font-weight: bold;
  min-width: 45px;
  color: #666;
  font-size: 0.9rem;
  padding-top: 4px;
}


/* 按钮组父容器 */
.btn-group, .btn-group-sm {
  display: flex;      /* 开启弹性布局 */
  flex-wrap: wrap;    /* 允许自动换行 */
  gap: 8px 10px;      /* 核心：第一个值是行间距(row-gap)，第二个值是列间距(column-gap) */
  flex: 1;            /* 让容器占据剩余宽度 */
}
/* 按钮样式修改 */
.btn-group button, 
.btn-group-sm button {
  padding: 4px 12px;
  border: 1px solid #eee;
  background: #f9f9f9;
  cursor: pointer;
  border-radius: 4px;
  white-space: nowrap; /* 确保按钮文字不会在内部换行 */
  transition: all 0.2s;
  /* margin-right: 5px;  <-- 建议删掉这一行，改用父级的 gap */
}
/* 选中状态保持不变 */
.btn-group button.active, 
.btn-group-sm button.active {
  background: #33ccbb;
  color: white;
  border-color: #33ccbb;
}

/* 角色 Chip */
.chip-group {
  display: flex;
  flex-wrap: wrap; /* 自动换行 */
  gap: 8px;
}
.char-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #f5f5f5;
  border-radius: 20px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: 0.2s;
}
.char-chip.is-selected {
  background: #e6fffb;
  border-color: #33ccbb;
  color: #33ccbb;
}
.chip-img { width: 24px; height: 24px; border-radius: 50%; }

/* 图标组高亮控制 */
.icon-group { display: flex; }
.icon-group.attributes {gap: 10px;}
.icon-group.attributes img {
  width: 35px; height: 35px;
  cursor: pointer;
  filter: grayscale(1) opacity(0.5);
  transition: 0.2s;
}
.icon-group.units {gap: 6px;}
.icon-group.units img {
  width: 38px; height: 38px;
  cursor: pointer;
  filter: grayscale(1) opacity(0.5);
  transition: 0.2s;
}
.icon-group img.icon-active {
  filter: grayscale(0) opacity(1);
  transform: scale(1.1);
}

.icon-group.is-disabled {
  opacity: 0.38;
}

.icon-group img.icon-disabled {
  cursor: not-allowed;
}

/* 稀有度星星样式 */
.rarity-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.rarity-item {
  padding: 4px 8px;
  border: 1px solid #eee;
  border-radius: 6px;
  display: flex;
  align-items: center;
  cursor: pointer;
}
.rarity-item.active {
  border-color: #ffa940;
  background: #fff7e6;
}
.star-img { width: 18px; height: 18px; margin-right: 2px; }
.birthday-img { width: 18px; height: 18px; }

/* 顶部按钮高亮 */
.active-highlight {
  background: #33ccbb !important;
  color: white !important;
  border-color: #33ccbb !important;
}

.clear-btn {
  background: #ff4d4f;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 6px;
  cursor: pointer;
}

/* 展开动画 */
.slide-fade-enter-active, .slide-fade-leave-active {
  transition: all 0.3s ease-out;
}
.slide-fade-enter-from, .slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}


/* 1. 基础信息：日期下方居中显示节日 */
.event-basic { width: 60px; display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; }
.event-id { font-weight: bold; color: #777; font-size: 1.1rem; }
.event-date { font-size: 0.75rem; color: #999; }
.fest-tag { background: #ff4d4f; color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: bold; }

/* 2. Banner */
.banner-section { width: 80px; text-align: center; margin: 0 10px; }
.avatar-wrapper { position: relative; display: inline-block; }
.banner-avatar { width: 64px; height: 64px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.banner-tag { position: absolute; bottom: 2px; right: -6px; color: white; font-size: 9px; padding: 1px 4px; border-radius: 4px; font-weight: bold; border: 1px solid white; }
.unit-logo-banner { width: 68px; height: 68px; object-fit: contain; }

/* 3. 标题 */
.event-main-content { width: 160px; padding: 0 5px; }
.event-title { font-weight: bold; font-size: 1rem; color: #333; line-height: 1.3; }
.type-indicator { margin-top: 5px; display: flex; align-items: center; gap: 8px; min-width: 0; flex-wrap: nowrap; }
.type-tag { font-size: 0.7rem; padding: 2px 8px; border-radius: 10px; color: white; white-space: nowrap; flex: 0 0 auto; }
.series-text { white-space: nowrap; overflow: visible; text-overflow: clip; min-width: 0; flex: 1 1 auto; }

/* 4. 角色卡片展示逻辑 */
.event-members { flex: 1; display: flex; flex-direction: column; gap: 10px; padding: 0 15px; border-left: 1px solid #eee; }
.member-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.fes-row { padding-top: 8px; border-top: 1px dashed #eee; }
.fes-type-icon { height: 70px; margin-right: 5px; }
.card-attr-icon { position: absolute; top: -5px; right: -5px; width: 22px; height: 22px; z-index: 3; }

.avatar-container { 
  position: relative; width: 80px; height: 80px; 
  border-radius: 50%; border: 3px solid #eee; padding: 1px;
}
.member-avatar { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.sub-unit-logo {
  position: absolute; bottom: -6px; right: -10px;
  width: 28px; height: 28px; 
}
/* 期间限定标签 - 伪切角方案 */
.lim-tag { 
  position: absolute; 
  top: 4px; 
  right: -6px; 
  
  background: #ff4d4f; 
  color: white; 
  font-size: 8px; 
  font-weight: bold;
  
  /* 增加高度和宽度，确保旋转后能覆盖右上角弧度 */
  width: 100%;
  height: 16px; 
  line-height: 18px;
  text-align: center;
  
  /* 关键 1：旋转并定位 */
  /* 通过 rotate 旋转，通过 translate 向上向右微调 */
  transform: rotate(45deg) translate(13px, -8px);
  
  /* 关键 2：裁剪形状 */
  /* 这个路径会将矩形裁剪成一个适配圆形边框的形状，确保不溢出 */
  /* 如果你的圆环大小有变，可以微调这些百分比 */
  clip-path: polygon(21% 28%, 78% 30%, 93% 90%, 5.5% 80%); 
  
  z-index: 2;
  white-space: nowrap;
  pointer-events: none;
}


/* 角色卡片详情悬浮 */
.card-detail-tooltip {
  visibility: hidden; position: absolute; bottom: 110%; left: 50%; transform: translateX(-50%);
  background: rgba(0,0,0,0.85); color: white; padding: 8px; border-radius: 6px; 
  font-size: 0.7rem; min-width: 100px; z-index: 20000; pointer-events: none; opacity: 0; transition: 0.2s;
  text-align: left; /* 修改点：文本居左 */
}
.avatar-container:hover .card-detail-tooltip { visibility: visible; opacity: 1; }

.stars-overlay {
  position: absolute; bottom: -1px; left: -2px; display: flex; gap: 0px;
}
.star-icon { width: 11px; height: 11px; }

/* 5. VS & 音乐 */
.vs-section { width: 80px; display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
.vs-list { display: flex; flex-wrap: wrap; gap: 4px; justify-content: flex-end; }
.vs-avatar { width: 45px; height: 45px; border-radius: 50%; border: 1px solid #ddd; }
.song-tooltip { cursor: help; position: relative; }
.tooltip-content {
  visibility: hidden; position: absolute; bottom: 125%; right: 0;
  background: #333; color: white; padding: 10px; border-radius: 10px; width: fit-content;
  z-index: 100; font-size: 0.8rem; opacity: 0; transition: opacity 0.3s;
  pointer-events: none; /* 加上这个可以防止鼠标意外触发弹窗自身的位移 */
  white-space: nowrap;  /* 防止文字换行导致高度计算错误 */
}
.song-tooltip:hover .tooltip-content { visibility: visible; opacity: 1; }

.attr-section { width: 50px; text-align: right; }
.attr-icon { width: 35px; height: 35px; }

@media (max-width: 1000px) {
  .event-history-wrapper {
    --preview-config-top: calc(env(safe-area-inset-top) + 66px);
  }

  .preview-config-panel {
    width: 320px;
    left: 8px;
    max-height: 46vh;
  }

  .preview-panel {
    min-width: 0;
    padding: 6px 6px 5px;
  }

  .preview-avatar {
    width: 19px;
    height: 19px;
  }

  .event-history-wrapper.with-editor .event-history {
    margin-right: 0;
  }

  .event-item { flex-wrap: wrap; }
  .event-members { width: 100%; border-left: none; border-top: 1px solid #eee; padding: 10px 0; }
}

@media (max-width: 900px) {
  .event-history-wrapper {
    --preview-config-top: calc(env(safe-area-inset-top) + 62px);
  }

  .event-history > h1 {
    display: none;
  }

  .filter-bar {
    padding: 6px 3px;
    gap: 4px;
    margin-bottom: 4px;
  }

  .sort-btn,
  .nav-btn,
  .clear-btn {
    min-width: 0;
    height: 31px;
    padding: 0 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.74rem;
    line-height: 1;
    white-space: nowrap;
  }

  .compact-btn-icon {
    width: 15px;
    height: 15px;
  }

  .compact-tip {
    position: relative;
  }

  .compact-tip:active::after,
  .compact-tip:focus-visible::after {
    content: attr(data-tip);
    position: absolute;
    left: 50%;
    bottom: calc(100% + 4px);
    transform: translateX(-50%);
    font-size: 0.62rem;
    line-height: 1;
    color: #fff;
    background: rgba(15, 23, 42, 0.88);
    border-radius: 6px;
    padding: 4px 6px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 1200;
  }
}

@media (max-width: 768px) {
  .event-history {
    --member-avatar-size: clamp(42px, 10.2vw, 54px);
  }

  .event-history {
    padding: 0 10px 10px;
  }

  .history-list {
    gap: 8px;
    margin-top: 10px;
  }

  .filter-panel {
    max-height: 52vh;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 8px;
    margin-bottom: 8px;
    gap: 8px;
  }

  .filter-row {
    gap: 8px;
  }

  .row-label {
    min-width: 38px;
    font-size: 0.78rem;
    padding-top: 2px;
  }

  .btn-group,
  .btn-group-sm {
    gap: 6px;
  }

  .btn-group button,
  .btn-group-sm button {
    font-size: 0.74rem;
    padding: 3px 8px;
    border-radius: 6px;
  }

  .icon-group.attributes {
    gap: 6px;
  }

  .icon-group.units {
    gap: 4px;
  }

  .icon-group.attributes img {
    width: 27px;
    height: 27px;
  }

  .icon-group.units img {
    width: 29px;
    height: 29px;
  }

  .rarity-group {
    gap: 6px;
  }

  .rarity-item {
    padding: 2px 5px;
  }

  .star-img,
  .birthday-img {
    width: 14px;
    height: 14px;
  }

  .chip-group {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(30px, 1fr));
    gap: 3px;
    width: 100%;
  }

  .char-chip {
    width: 30px;
    height: 30px;
    padding: 0;
    border-radius: 50%;
    justify-content: center;
    margin: 0 auto;
    border-width: 1px;
  }

  .char-chip span {
    display: none;
  }

  .chip-img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    filter: grayscale(1) opacity(0.42);
  }

  .char-chip.is-selected .chip-img {
    filter: grayscale(0) opacity(1);
  }

  .event-item {
    display: grid;
    grid-template-columns: 44px 52px minmax(0, 1fr) auto auto;
    grid-template-areas:
      "basic banner main vs attr"
      "members members members members members";
    align-items: center;
    column-gap: 8px;
    row-gap: 8px;
    padding: 10px;
  }

  .event-basic {
    grid-area: basic;
    width: auto;
    gap: 2px;
  }

  .event-id {
    font-size: 0.82rem;
  }

  .event-date {
    font-size: 0.58rem;
    line-height: 1.1;
  }

  .fest-tag {
    font-size: 0.56rem;
    padding: 1px 4px;
  }

  .banner-section {
    grid-area: banner;
    width: auto;
    margin: 0;
  }

  .banner-avatar {
    width: 46px;
    height: 46px;
    border-width: 2px;
  }

  .unit-logo-banner {
    width: 48px;
    height: 48px;
  }

  .banner-tag {
    right: -4px;
    bottom: 0;
    font-size: 8px;
    padding: 0 4px;
  }

  .event-main-content {
    grid-area: main;
    width: auto;
    min-width: 0;
    padding: 0;
  }

  .event-title {
    display: block;
    width: 100%;
    font-size: 0.95rem;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .type-indicator {
    margin-top: 2px;
    gap: 5px;
  }

  .type-tag {
    font-size: 0.62rem;
    padding: 1px 6px;
  }

  .series-text {
    font-size: 0.68rem;
  }

  .vs-section {
    grid-area: vs;
    width: auto;
    justify-content: flex-end;
    gap: 4px;
  }

  .vs-avatar {
    width: 24px;
    height: 24px;
  }

  .song-tooltip .info-icon {
    font-size: 13px;
  }

  .attr-section {
    grid-area: attr;
    width: auto;
    text-align: center;
  }

  .attr-icon {
    width: 22px;
    height: 22px;
  }

  .event-members {
    grid-area: members;
    width: 100%;
    border-left: none;
    border-top: 1px solid #d6dde8;
    padding: 8px 0 0;
    gap: 8px;
  }

  .member-row {
    gap: 8px;
    align-items: flex-start;
  }

  .member-row:not(.fes-row) {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 6px;
    justify-items: center;
    align-items: start;
  }

  .fes-row {
    padding-top: 6px;
  }

  .fes-type-icon {
    height: 44px;
    margin-right: 2px;
  }

  .avatar-container {
    width: var(--member-avatar-size);
    height: var(--member-avatar-size);
    border-width: 2px;
  }

  .card-attr-icon {
    width: clamp(13px, calc(var(--member-avatar-size) * 0.34), 18px);
    height: clamp(13px, calc(var(--member-avatar-size) * 0.34), 18px);
    top: -3px;
    right: -3px;
  }

  .sub-unit-logo {
    width: clamp(14px, calc(var(--member-avatar-size) * 0.38), 20px);
    height: clamp(14px, calc(var(--member-avatar-size) * 0.38), 20px);
    right: -5px;
    bottom: -4px;
  }

  .stars-overlay {
    bottom: -2px;
    left: -1px;
    gap: 0;
  }

  .predict-delete-btn {
    top: 6px;
    right: 34px;
    width: 22px;
    height: 22px;
    line-height: 22px;
    font-size: 14px;
  }

  .predict-status-badge {
    font-size: 0.54rem;
    padding: 1px 5px;
  }

  .star-icon {
    width: clamp(7px, calc(var(--member-avatar-size) * 0.17), 10px);
    height: clamp(7px, calc(var(--member-avatar-size) * 0.17), 10px);
  }

  .lim-tag {
    top: -2px;
    right: 14px;
    width: auto;
    height: auto;
    line-height: 1.1;
    padding: 1px 4px;
    font-size: 6px;
    border-radius: 8px;
    transform: none;
    clip-path: none;
  }
}

@media (max-width: 520px) {
  .event-history {
    --member-avatar-size: clamp(38px, 10.8vw, 48px);
  }

  .event-item {
    grid-template-columns: 40px 46px minmax(0, 1fr) auto auto;
    column-gap: 6px;
    row-gap: 6px;
    padding: 8px;
  }

  .event-title {
    font-size: 0.9rem;
  }

  .filter-panel {
    max-height: 56vh;
  }

  .chip-group {
    grid-template-columns: repeat(auto-fill, minmax(28px, 1fr));
    gap: 2px;
  }

  .char-chip {
    width: 28px;
    height: 28px;
  }

  .type-tag {
    font-size: 0.58rem;
    padding: 1px 5px;
  }

  .series-text {
    font-size: 0.62rem;
  }

  .lim-tag {
    right: 12px;
    font-size: 5px;
    padding: 1px 3px;
  }

  .predict-delete-btn {
    right: 30px;
    width: 20px;
    height: 20px;
    line-height: 20px;
    font-size: 12px;
  }
}
</style>