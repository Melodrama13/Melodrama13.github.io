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
            <span>悬浮统计（最多6个）</span>
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
              :disabled="opt.disabled || (!opt.selected && selectedPreviewPanelIds.length >= 6)"
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
                <button
                  class="preview-char-select-toggle"
                  @click="appendPreviewAttrCharsFromCurrentLineup"
                  :disabled="!canAppendCurrentLineupToPreviewAttr"
                >获取列表</button>
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
          <div v-if="!previewFloatingCollapsed && selectedPreviewPanelIds.includes('daily-lineup')" class="preview-char-select" :class="{ 'is-collapsed': previewDailyLineupCharCollapsed }">
            <div class="preview-char-select-title">
              <span>日挑配队人选（最多6人）</span>
              <div class="preview-char-select-actions">
                <button
                  class="preview-char-select-toggle"
                  @click="appendPreviewDailyLineupCharsFromCurrentLineup"
                  :disabled="!canAppendCurrentLineupToPreviewDailyLineup"
                >读取列表</button>
                <button class="preview-char-select-toggle" @click="clearPreviewDailyLineupChars" :disabled="selectedPreviewDailyLineupChars.length === 0">清空</button>
                <button class="preview-char-select-toggle" @click="previewDailyLineupCharCollapsed = !previewDailyLineupCharCollapsed">{{ previewDailyLineupCharCollapsed ? '展开' : '收起' }}</button>
              </div>
            </div>
            <div v-show="!previewDailyLineupCharCollapsed" class="preview-char-chips">
              <button
                v-for="name in previewSelectableChars"
                :key="`pick-daily-${name}`"
                class="preview-char-chip"
                :class="{ 'is-active': selectedPreviewDailyLineupChars.includes(name) }"
                :disabled="!selectedPreviewDailyLineupChars.includes(name) && selectedPreviewDailyLineupChars.length >= 6"
                @click="togglePreviewDailyLineupChar(name)"
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
            <span class="preview-title">{{ panel.title }}</span>
            <label
              v-if="panel.id === 'festival'"
              class="preview-head-toggle"
              @mousedown.stop
              @touchstart.stop
              @click.stop
            >
              <input v-model="previewFestivalMergeHigherRanks" type="checkbox" />
              <span>高星合并</span>
            </label>
            <label
              v-if="panel.id === 'reward'"
              class="preview-head-toggle"
              title="勾选后，报酬统计会额外计入联动的二/三星卡。"
              @mousedown.stop
              @touchstart.stop
              @click.stop
            >
              <input v-model="previewIncludeCollabReward" type="checkbox" />
              <span>联动</span>
            </label>
            <label
              v-if="panel.id === 'pure-score'"
              class="preview-head-toggle"
              title="勾选后，分卡统计会计入团分卡。"
              @mousedown.stop
              @touchstart.stop
              @click.stop
            >
              <input v-model="previewIncludeUnitScoreInPureScore" type="checkbox" />
              <span>团分</span>
            </label>
            <div
              v-if="panel.id === 'limited-ban'"
              class="preview-head-filters"
              @mousedown.stop
              @touchstart.stop
              @click.stop
            >
              <button
                class="preview-head-filter-btn"
                :title="previewLimitedBanFilterButtonTitle"
                @click="cyclePreviewLimitedBanEventTypeFilter"
              >{{ previewLimitedBanFilterButtonText }}</button>
            </div>
            <div
              v-if="panel.id === 'banner'"
              class="preview-head-filters"
              @mousedown.stop
              @touchstart.stop
              @click.stop
            >
              <button
                class="preview-head-filter-btn"
                :title="previewBannerFilterButtonTitle"
                @click="cyclePreviewBannerEventTypeFilter"
              >{{ previewBannerFilterButtonText }}</button>
            </div>
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
                <span>当前节日：{{ panel.festivalName }}</span>
                <label
                  v-if="panel.festivalShowFes"
                  class="preview-festival-inline-toggle"
                  @mousedown.stop
                  @touchstart.stop
                  @click.stop
                >
                  <input v-model="previewFestivalFesToggles[activePreviewFestivalName]" type="checkbox" />
                  <span>统计FES：{{ panel.festivalIncludeFes ? '开' : '关' }}</span>
                </label>
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
                  <div v-if="!row.chars || row.chars.length === 0" class="preview-meta">-</div>
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
            <template v-else-if="panel.id === 'daily-lineup'">
              <div v-for="row in previewDailyLineupRows" :key="`daily-${row.name}`" class="preview-daily-card" :style="getPreviewDailyCardStyle(row.name)">
                <div class="preview-daily-head">
                  <img :src="`/chibi_s/${getCharAbbr(row.name)}.webp`" class="preview-daily-avatar" :title="row.name" />
                  <span class="preview-daily-name">{{ row.name }}</span>
                </div>
                <table class="preview-daily-table">
                  <tbody>
                    <tr
                      v-for="plan in row.plans"
                      :key="`daily-plan-${row.name}-${plan.attr}`"
                      class="preview-daily-plan-row"
                      :style="getPreviewDailyPlanStyle(plan.attr)"
                    >
                      <td class="preview-daily-attr-cell">
                        <img :src="`/elements/${String(plan.attr).toLowerCase()}.png`" class="preview-daily-attr" :title="translateAttr(plan.attr)" />
                      </td>
                      <td
                        v-for="(score, idx) in plan.memberScores"
                        :key="`daily-score-${row.name}-${plan.attr}-${idx}`"
                        :class="['preview-daily-score-cell', getPreviewDailyScoreCellClass(plan.memberFesKinds?.[idx], score)]"
                      >
                        {{ score > 0 ? score : '-' }}
                      </td>
                      <td class="preview-daily-total-cell">{{ plan.total }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-if="previewDailyLineupRows.length === 0" class="preview-step preview-step-empty">
                <span class="preview-meta">请先在上方选择最多6位角色</span>
              </div>
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
        <div class="filter-bar" :class="{ 'is-compact': isCompactFilterBar }">
          <button @click="sortDesc = !sortDesc" class="sort-btn" :title="sortDesc ? '最新在前' : '最早在前'">
            {{ sortDesc ? '最新在前' : '最早在前' }}
          </button>
          <button
            @click="toggleBirthdayRowsVisibility"
            :class="['nav-btn', { 'compact-tip': isCompactFilterBar, 'is-icon-only': isCompactFilterBar, 'active-highlight': !hideBirthdayRows }]"
            :title="hideBirthdayRows ? '已隐藏生日行' : '显示生日行'"
            :data-tip="isCompactFilterBar ? '生日行' : null"
          >
            <img src="/elements/birthday.png" class="compact-btn-icon birthday-toggle-icon" alt="生日" />
            <span v-if="!isCompactFilterBar">生日行：{{ hideBirthdayRows ? '隐藏' : '显示' }}</span>
          </button>
          <button
            @click="togglePreviewRowsVisibility"
            :class="['nav-btn', { 'compact-tip': isCompactFilterBar, 'is-icon-only': isCompactFilterBar, 'active-highlight': !hidePreviewRows }]"
            :title="hidePreviewRows ? '已隐藏生放送行' : '显示生放送行'"
            :data-tip="isCompactFilterBar ? '生放送' : null"
          >
            <img src="/data/icon/live.png" class="compact-btn-icon" alt="生放送" />
            <span v-if="!isCompactFilterBar">生放送：{{ hidePreviewRows ? '隐藏' : '显示' }}</span>
          </button>
          <button
            @click="toggleCollabPoolsVisibility"
            :class="['nav-btn', { 'compact-tip': isCompactFilterBar, 'is-icon-only': isCompactFilterBar, 'active-highlight': !hideCollabPools }]"
            :title="hideCollabPools ? '已隐藏联动卡池' : '显示联动卡池'"
            :data-tip="isCompactFilterBar ? '联动卡池' : null"
          >
            <img src="/data/icon/collaboration.png" class="compact-btn-icon" alt="联动" />
            <span v-if="!isCompactFilterBar">联动卡池：{{ hideCollabPools ? '隐藏' : '显示' }}</span>
          </button>
          <button @click="scrollTo('top')" :class="['nav-btn', 'compact-tip', { 'is-icon-only': isCompactFilterBar }]" title="顶部" data-tip="回到顶部">
            <img src="/data/icon/top.png" class="compact-btn-icon" alt="顶部" />
            <span v-if="!isCompactFilterBar">顶部</span>
          </button>
          <button @click="scrollTo('current')" class="nav-btn current-btn compact-tip" title="当前活动" data-tip="当前活动">
            当期
          </button>
          <button @click="scrollTo('bottom')" :class="['nav-btn', 'compact-tip', { 'is-icon-only': isCompactFilterBar }]" title="底部" data-tip="前往底部">
            <img src="/data/icon/bottom.png" class="compact-btn-icon" alt="底部" />
            <span v-if="!isCompactFilterBar">底部</span>
          </button>
          <button 
            @click="showFilter = !showFilter" 
            :title="hasActiveFilters ? '已启用筛选' : '筛选面板'"
            :class="['nav-btn', 'compact-tip', { 'is-icon-only': isCompactFilterBar && !hasActiveFilters, 'has-count': isCompactFilterBar && hasActiveFilters, 'active-highlight': hasActiveFilters || showFilter }]"
            data-tip="筛选面板"
          >
            <img src="/data/icon/filter.png" class="compact-btn-icon" alt="筛选" />
            <span v-if="!isCompactFilterBar">{{ hasActiveFilters ? `筛选：${filterHitEventCount}个活动` : '筛选' }}</span>
            <span v-else-if="hasActiveFilters" class="compact-filter-count">{{ filterHitEventCount }}</span>
          </button>
        </div>
        <transition name="slide-fade">
          <div v-if="showFilter" class="filter-panel">
          <div class="filter-row filter-mode-row">
            <span class="row-label">模式</span>
            <div class="btn-group">
              <button class="filter-mode-btn" :class="{active: filterMode === 'event'}" @click="switchFilterMode('event')">活动筛选</button>
              <button class="filter-mode-btn" :class="{active: filterMode === 'single'}" @click="switchFilterMode('single')">卡片筛选</button>
              <button class="filter-mode-btn clear-btn panel-reset-btn" :class="{ 'is-ready': hasActiveFilters }" :disabled="!hasActiveFilters" @click="resetFilters">{{ isCompactFilterBar ? '重置' : '重置筛选' }}</button>
              <button class="filter-mode-btn clear-btn panel-reset-btn panel-collapse-btn" @click="showFilter = false">收起</button>
            </div>
            <span v-if="hasActiveFilters" class="filter-mode-hit-count">{{ activeFilteredEventCount }}个活动</span>
          </div>

          <div v-if="filterMode !== 'event'" class="filter-row">
            <span class="row-label">角色</span>
            <div class="chip-group">
              <div v-for="(abbr, name) in CHAR_MAP" :key="name" 
                  :class="['char-chip', { 'is-selected': filterCriteria.selectedChars.includes(name) }]"
                  :title="name"
                  @click="toggleChar(name)">
                <img :src="`/chars/${getCharAbbr(name)}.png`" class="chip-img" />
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
              <span class="row-label">多人规则</span>
              <div class="btn-group-sm">
                <button
                  :class="{ active: eventFilterCriteria.multiPersonRule === 'same-event' }"
                  :disabled="!canUseMultiPersonRule"
                  @click="setEventMultiPersonRule('same-event')"
                >同活</button>
                <button
                  :class="{ active: eventFilterCriteria.multiPersonRule === 'same-pool' }"
                  :disabled="!canUseMultiPersonRule"
                  @click="setEventMultiPersonRule('same-pool')"
                >同池</button>
              </div>
            </div>            

            <div class="filter-row">
              <span class="row-label">特殊规则</span>
              <div class="btn-group-sm">
                <button
                  v-for="opt in EVENT_SPECIAL_RULE_OPTIONS"
                  :key="`event-rule-${opt.value}`"
                  :class="{ active: eventFilterCriteria.specialRules.includes(opt.value) }"
                  :disabled="opt.value === 'four-no-vs' && !canUseFourNoVsRule"
                  :title="opt.value === 'four-no-vs' && !canUseFourNoVsRule ? '仅在仅选箱活时可用' : ''"
                  @click="toggleEventSpecialRule(opt.value)"
                >{{ opt.label }}</button>
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

          <template v-if="filterMode === 'single'">
            <div class="filter-row">
              <span class="row-label">组合</span>
              <div class="icon-group units">
                <img v-for="(color, unit) in UNIT_COLORS" :key="unit" 
                    :src="`/elements/${unit}.png`" 
                    :class="{ 'icon-active': filterCriteria.units.includes(unit) }"
                    @click="toggleDetailFilterArray('units', unit)"
                    :title="unit.toUpperCase()" />
              </div>
            </div>

            <div class="filter-row">
              <span class="row-label">属性</span>
              <div class="icon-group attributes">
                <img v-for="attr in ['Happy', 'Mysterious', 'Cute', 'Cool', 'Pure']" 
                    :key="attr" :src="`/elements/${attr.toLowerCase()}.png`"
                    :class="{ 'icon-active': filterCriteria.attributes.includes(attr) }"
                    @click="toggleDetailFilterArray('attributes', attr)" />
              </div>
            </div>

            <div class="filter-row">
              <span class="row-label">技能</span>
              <div class="btn-group-sm">
                <button v-for="(label, key) in { score_up:'普分', accuracy:'判卡', recovery:'奶卡', p_score:'P分', unit_score: '团分', cfes_l: 'CFES血分', cfes_j: 'CFES判分', bfes_up: 'BFES' }" 
                        :key="key" :class="{ active: filterCriteria.skills.includes(key) }"
                        @click="toggleDetailFilterArray('skills', key)">
                  {{ label }}
                </button>
              </div>
            </div>

            <div class="filter-row">
              <span class="row-label">稀有度</span>
              <div class="rarity-group">
                <div v-for="r in [1,2,3,4]" :key="r" 
                    :class="['rarity-item', { 'active': filterCriteria.rarities.includes(r) }]"
                    @click="toggleDetailFilterArray('rarities', r)">
                  <img v-for="n in r" :key="n" :src="`/elements/${r === 4 ? 'rstar' : 'ystar'}.png`" class="star-img" />
                </div>
                <div :class="['rarity-item', { 'active': filterCriteria.rarities.includes('birthday') }]"
                    @click="toggleDetailFilterArray('rarities', 'birthday')">
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
                  :class="{ active: filterCriteria.cardTypes.includes(key) }"
                  @click="toggleDetailFilterArray('cardTypes', key)"
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
          :class="['event-item', getPredictStatus(row.event), { 'is-tooltip-raised': tooltipRaisedEventKey === row.key }]"
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
            <div
              v-if="isEditorOpen && formatSeriesCompact(row.event)"
              class="editor-series-chip"
              :style="getEditorSeriesStyle(row.event)"
            >
              {{ formatSeriesCompact(row.event) }}
            </div>
          </div>

          <div v-if="!isEditorOpen" class="event-main-content">
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
              <div v-for="(card, normalIndex) in getNormalCards(row.event.memberCards)" :key="`${card.CardID}-${normalIndex}`" class="member-card-box">
                <div
                  class="avatar-container"
                  :class="{ 'is-open': isCardTooltipOpen(row.key, card, `n-${normalIndex}`) }"
                  :style="{ borderColor: getUnitColor(card.Affiliation) }"
                  @mouseenter="handleCardTooltipEnter(row.key, card, `n-${normalIndex}`, $event)"
                  @mouseleave="clearTooltipRaisedEvent(row.key)"
                  @focusin="handleCardTooltipEnter(row.key, card, `n-${normalIndex}`, $event)"
                  @focusout="clearTooltipRaisedEvent(row.key)"
                  @click.stop="toggleCardTooltip(row.key, card, `n-${normalIndex}`, $event)"
                  tabindex="0"
                >
                  <img :src="`/chars/${getCharAbbr(card.Name)}.png`" class="member-avatar" />
                  <img v-if="hasAttributeIcon(card.Attribute)" :src="`/elements/${card.Attribute.toLowerCase()}.png`" class="card-attr-icon" />
                  <img v-if="isVirtualSinger(card.Name)" :src="`/elements/${card.Affiliation.toLowerCase()}.png`" class="sub-unit-logo" />
                  <div v-if="['limited', 'collab_t', 'wl3'].includes(card.Type?.toLowerCase())" class="lim-tag">期间限定</div>  
                  <div class="stars-overlay">
                    <img v-for="n in parseInt(card.Rarity)" :key="n" :src="card.Rarity == 4 ? '/elements/rstar.png' : '/elements/ystar.png'" class="star-icon" />
                  </div>
                  <div class="card-detail-tooltip" :style="getCardTooltipStyle(row.key, card, `n-${normalIndex}`)">
                    <div class="card-tooltip-hero" :class="{ 'is-text-only': getVisibleCardTooltipImageList(card).length === 0 }">
                      <div v-if="getVisibleCardTooltipImageList(card).length > 0" class="card-tooltip-media" :class="{ 'is-dual': getVisibleCardTooltipImageList(card).length > 1 }">
                        <div
                          v-for="src in getVisibleCardTooltipImageList(card)"
                          :key="`card-tip-${row.key}-${card.CardID}-${normalIndex}-${src}`"
                          class="card-tooltip-jacket-item"
                          :class="{ 'is-failed': isCardTooltipImageFailed(card, src) }"
                        >
                          <img
                            :src="src"
                            class="card-tooltip-jacket media-load-shimmer"
                            :alt="`${card.Name || '角色'} 卡面`"
                            loading="lazy"
                            decoding="async"
                            @load="onCardTooltipImageLoad"
                            @error="onCardTooltipImageError($event, card, src)"
                          />
                        </div>
                      </div>
                      <div class="card-tooltip-grid">
                        <p class="card-tooltip-row"><strong class="card-tooltip-label">ID</strong><span class="card-tooltip-value">{{ card.CardID }}</span></p>
                        <p class="card-tooltip-row"><strong class="card-tooltip-label">类型</strong><span class="card-tooltip-value">{{ translateType(card.Type) }}</span></p>
                        <p class="card-tooltip-row"><strong class="card-tooltip-label">技能</strong><span class="card-tooltip-value">{{ translateSkill(card.Skill) }}</span></p>
                        <p class="card-tooltip-row"><strong class="card-tooltip-label">属性</strong><span class="card-tooltip-value">{{ translateAttr(card.Attribute) }}</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="getFesCards(row.event.memberCards).length > 0" class="member-row fes-row">
              <img :src="`/elements/${getFesType(row.event.memberCards)}.webp`" class="fes-type-icon" />
              <div v-for="(card, fesIndex) in getFesCards(row.event.memberCards)" :key="`${card.CardID}-${fesIndex}`" class="member-card-box">
                <div
                  class="avatar-container"
                  :class="{ 'is-open': isCardTooltipOpen(row.key, card, `f-${fesIndex}`) }"
                  :style="{ borderColor: getUnitColor(card.Affiliation) }"
                  @mouseenter="handleCardTooltipEnter(row.key, card, `f-${fesIndex}`, $event)"
                  @mouseleave="clearTooltipRaisedEvent(row.key)"
                  @focusin="handleCardTooltipEnter(row.key, card, `f-${fesIndex}`, $event)"
                  @focusout="clearTooltipRaisedEvent(row.key)"
                  @click.stop="toggleCardTooltip(row.key, card, `f-${fesIndex}`, $event)"
                  tabindex="0"
                >
                  <img :src="`/chars/${getCharAbbr(card.Name)}.png`" class="member-avatar" />
                  <img v-if="hasAttributeIcon(card.Attribute)" :src="`/elements/${card.Attribute.toLowerCase()}.png`" class="card-attr-icon" />
                  <img v-if="isVirtualSinger(card.Name)" :src="`/elements/${card.Affiliation.toLowerCase()}.png`" class="sub-unit-logo" />
                  <div class="stars-overlay">
                    <img v-for="n in parseInt(card.Rarity)" :key="n" :src="'/elements/rstar.png'" class="star-icon" />
                  </div>
                  <div class="card-detail-tooltip" :style="getCardTooltipStyle(row.key, card, `f-${fesIndex}`)">
                    <div class="card-tooltip-hero" :class="{ 'is-text-only': getVisibleCardTooltipImageList(card).length === 0 }">
                      <div v-if="getVisibleCardTooltipImageList(card).length > 0" class="card-tooltip-media" :class="{ 'is-dual': getVisibleCardTooltipImageList(card).length > 1 }">
                        <div
                          v-for="src in getVisibleCardTooltipImageList(card)"
                          :key="`card-tip-${row.key}-${card.CardID}-${fesIndex}-${src}`"
                          class="card-tooltip-jacket-item"
                          :class="{ 'is-failed': isCardTooltipImageFailed(card, src) }"
                        >
                          <img
                            :src="src"
                            class="card-tooltip-jacket media-load-shimmer"
                            :alt="`${card.Name || '角色'} 卡面`"
                            loading="lazy"
                            decoding="async"
                            @load="onCardTooltipImageLoad"
                            @error="onCardTooltipImageError($event, card, src)"
                          />
                        </div>
                      </div>
                      <div class="card-tooltip-grid">
                        <p class="card-tooltip-row"><strong class="card-tooltip-label">ID</strong><span class="card-tooltip-value">{{ card.CardID }}</span></p>
                        <p class="card-tooltip-row"><strong class="card-tooltip-label">类型</strong><span class="card-tooltip-value">{{ translateType(card.Type) }}</span></p>
                        <p class="card-tooltip-row"><strong class="card-tooltip-label">技能</strong><span class="card-tooltip-value">{{ translateSkill(card.Skill) }}</span></p>
                        <p class="card-tooltip-row"><strong class="card-tooltip-label">属性</strong><span class="card-tooltip-value">{{ translateAttr(card.Attribute) }}</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="!isEditorOpen" class="vs-section">
            <div class="vs-top-row">
              <div v-if="row.event.virtual_singer" class="vs-list">
                <img v-for="vs in parseVS(row.event.virtual_singer)" :key="vs" :src="`/chars/${getCharAbbr(vs)}.png`" :title="vs" class="vs-avatar" />
              </div>
              <div
                class="song-tooltip"
                :class="{ 'is-open': isSongTooltipOpen(row.key) }"
                v-if="hasSongTooltip(row.event)"
                @mouseenter="setTooltipRaisedEvent(row.key)"
                @mouseleave="clearTooltipRaisedEvent(row.key)"
                @focusin="setTooltipRaisedEvent(row.key)"
                @focusout="clearTooltipRaisedEvent(row.key)"
                @click.stop="toggleSongTooltip(row.key)"
              >
                <span class="info-icon" aria-hidden="true">🎵</span>
                <div class="tooltip-content">
                  <div class="song-tooltip-hero">
                    <div class="song-tooltip-jacket-wrap" :class="{ 'is-failed': !getSongTooltipImageSrc(row.event) }">
                      <img
                        :src="getSongTooltipImageSrc(row.event)"
                        class="song-tooltip-jacket media-load-shimmer"
                        :alt="`${getSongTitleText(row.event) || '歌曲'} 曲绘`"
                        loading="lazy"
                        decoding="async"
                        @load="onSongTooltipImageLoad"
                        @error="onSongTooltipImageError"
                      />
                      <span class="song-tooltip-jacket-fallback">曲绘加载失败</span>
                    </div>
                    <div class="song-tooltip-grid">
                      <p v-if="getSongIdText(row.event)" class="song-tooltip-row"><strong class="song-tooltip-label">歌曲ID</strong><span class="song-tooltip-value">{{ getSongIdText(row.event) }}</span></p>
                      <p class="song-tooltip-row"><strong class="song-tooltip-label">书下曲</strong><span class="song-tooltip-value">{{ getSongTitleText(row.event) }}</span></p>
                      <p v-if="row.event.song_alias" class="song-tooltip-row"><strong class="song-tooltip-label">别名</strong><span class="song-tooltip-value">{{ row.event.song_alias }}</span></p>
                      <p class="song-tooltip-row"><strong class="song-tooltip-label">作曲</strong><span class="song-tooltip-value">{{ getSongComposerText(row.event) }}</span></p>
                      <p class="song-tooltip-row"><strong class="song-tooltip-label">作词</strong><span class="song-tooltip-value">{{ getSongLyricistText(row.event) }}</span></p>
                      <p class="song-tooltip-row"><strong class="song-tooltip-label">编曲</strong><span class="song-tooltip-value">{{ getSongArrangerText(row.event) }}</span></p>
                    </div>
                  </div>
                </div>
              </div>
              <img
                v-if="hasAttributeIcon(row.event.event_attribute)"
                :src="`/elements/${row.event.event_attribute.toLowerCase()}.png`"
                class="attr-icon attr-icon-inline"
                :title="translateAttr(row.event.event_attribute)"
              />
            </div>
            <div class="song-mv-grid" v-if="hasSongTooltip(row.event)">
              <span class="song-mv-pill is-3d" :class="{ 'is-empty': !hasSong3DMV(row.event) }">3D</span>
              <span class="song-mv-pill is-2d" :class="{ 'is-empty': !hasSong2DMV(row.event) }">2D</span>
            </div>
          </div>
        </div>
        <div
          v-else-if="row.kind === 'preview'"
          :id="row.id"
          class="preview-row"
        >
          <div class="preview-label">生放送</div>
          <div class="preview-date">{{ row.date }} {{ row.week }}</div>
          <div class="preview-members">
            <img
              v-for="member in row.members"
              :key="`preview-${row.key}-${member}`"
              :src="`/chibi_s/${getCharAbbr(member)}.webp`"
              class="preview-member-avatar"
              :title="member"
            />
          </div>
        </div>
        <div
          v-else
          :id="row.id"
          class="birthday-row"
          :class="{ 'is-open': isBirthdayInfoOpen(row) }"
          :style="{ backgroundColor: getBirthdayRowTint(row.name) }"
          @click.stop="toggleBirthdayInfo(row)"
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
          <div v-if="isBirthdayInfoOpen(row)" class="birthday-info-popover">
            <img
              v-if="getBirthdayCardImageSrc(row) && !isBirthdayCardImageFailed(row)"
              :src="getBirthdayCardImageSrc(row)"
              class="birthday-info-card media-load-shimmer"
              :alt="`${row.name} 生日卡面`"
              loading="lazy"
              decoding="async"
              @load="onBirthdayCardImageLoad($event, row)"
              @error="onBirthdayCardImageError($event, row)"
            />
            <div class="birthday-info-content">
              <div class="birthday-info-title">{{ row.name }}</div>
              <div class="birthday-info-meta">卡面ID：{{ row.cardId || '-' }}</div>
              <div class="birthday-info-meta">属性：{{ translateAttr(row.attribute) }}</div>
            </div>
          </div>
        </div>
        </template>
      </div>
      <PredictEditor 
        v-if="isEditorOpen"
        :is-open="isEditorOpen" 
        :event="currentEditingEvent"
        :char-map="CHAR_MAP"
        :all-characters="props.allCharacters"
        :box-locked-units="currentEditingBoxLockedUnits"
        @selection-change="handlePredictSelectionChange"
        @close="handleCloseEditor"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, nextTick, watch, onMounted, onActivated, onDeactivated, onBeforeUnmount } from 'vue';
import PredictEditor from './PredictEditor.vue';
import html2canvas from 'html2canvas';


// 2. 【新增】接收从 App.vue 传下来的总表（包含历史+预测）
const props = defineProps({
  allEvents: { type: Array, default: () => [] },
  allCards: { type: Array, default: () => [] },
  allSongs: { type: Array, default: () => [] },
  allCharacters: { type: Array, default: () => [] },
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
const hidePreviewRows = ref(false);
const previewDataRows = ref([]);
const tooltipRaisedEventKey = ref(null);
const openedCardTooltipKey = ref('');
const openedSongTooltipEventKey = ref('');
const openedBirthdayInfoKey = ref('');
const cardTooltipOffsetMap = ref({});

const makeCardTooltipKey = (eventKey, card, slotKey = '') => {
  const eventPart = String(eventKey || '').trim();
  const cardIdPart = String(card?.CardID || '').trim();
  const namePart = String(card?.Name || '').trim();
  const slotPart = String(slotKey || '').trim();
  return `${eventPart}::${slotPart}::${cardIdPart || namePart}`;
};

const hasOpenTooltipForEventKey = (eventKey) => {
  const key = String(eventKey || '').trim();
  if (!key) return false;
  if (openedSongTooltipEventKey.value === key) return true;
  return openedCardTooltipKey.value.startsWith(`${key}::`);
};

const closeInlineTooltips = () => {
  openedCardTooltipKey.value = '';
  openedSongTooltipEventKey.value = '';
  tooltipRaisedEventKey.value = null;
  cardTooltipOffsetMap.value = {};
};

const setCardTooltipOffset = (tooltipKey, offsetX = 0, offsetY = 0) => {
  if (!tooltipKey) return;
  cardTooltipOffsetMap.value = {
    ...cardTooltipOffsetMap.value,
    [tooltipKey]: {
      '--card-tooltip-shift-x': `${Math.round(offsetX)}px`,
      '--card-tooltip-shift-y': `${Math.round(offsetY)}px`
    }
  };
};

const clearCardTooltipOffset = (tooltipKey) => {
  if (!tooltipKey || !cardTooltipOffsetMap.value[tooltipKey]) return;
  const next = { ...cardTooltipOffsetMap.value };
  delete next[tooltipKey];
  cardTooltipOffsetMap.value = next;
};

const getCardTooltipStyle = (eventKey, card, slotKey = '') => {
  const key = makeCardTooltipKey(eventKey, card, slotKey);
  return cardTooltipOffsetMap.value[key] || null;
};

const adjustCardTooltipViewport = (eventKey, card, slotKey = '', hostEl = null) => {
  const tooltipKey = makeCardTooltipKey(eventKey, card, slotKey);
  const host = hostEl instanceof HTMLElement ? hostEl : null;
  if (!tooltipKey || !host) return;

  const tooltipEl = host.querySelector('.card-detail-tooltip');
  if (!(tooltipEl instanceof HTMLElement)) return;

  clearCardTooltipOffset(tooltipKey);
  const rect = tooltipEl.getBoundingClientRect();
  const edge = 8;
  let shiftX = 0;
  let shiftY = 0;

  if (rect.left < edge) {
    shiftX += edge - rect.left;
  }
  if (rect.right > window.innerWidth - edge) {
    shiftX -= rect.right - (window.innerWidth - edge);
  }
  if (rect.top < edge) {
    shiftY += edge - rect.top;
  }
  if (rect.bottom > window.innerHeight - edge) {
    shiftY -= rect.bottom - (window.innerHeight - edge);
  }

  setCardTooltipOffset(tooltipKey, shiftX, shiftY);
};

const handleCardTooltipEnter = (eventKey, card, slotKey = '', event) => {
  setTooltipRaisedEvent(eventKey);
  const host = event?.currentTarget;
  if (!(host instanceof HTMLElement)) return;
  adjustCardTooltipViewport(eventKey, card, slotKey, host);
};

const makeBirthdayInfoKey = (row) => String(row?.key || row?.id || '').trim();

const closeBirthdayInfo = () => {
  openedBirthdayInfoKey.value = '';
};

const toggleBirthdayInfo = (row) => {
  const key = makeBirthdayInfoKey(row);
  if (!key) return;
  openedBirthdayInfoKey.value = openedBirthdayInfoKey.value === key ? '' : key;
};

const isBirthdayInfoOpen = (row) => openedBirthdayInfoKey.value === makeBirthdayInfoKey(row);

const handleTooltipGlobalPointerDown = (event) => {
  const target = event?.target;
  if (!(target instanceof HTMLElement)) {
    closeInlineTooltips();
    closeBirthdayInfo();
    return;
  }
  if (target.closest('.birthday-row')) {
    closeInlineTooltips();
    return;
  }
  closeBirthdayInfo();
  if (target.closest('.avatar-container, .song-tooltip')) return;
  closeInlineTooltips();
};

const setTooltipRaisedEvent = (eventKey) => {
  tooltipRaisedEventKey.value = eventKey;
};

const clearTooltipRaisedEvent = (eventKey) => {
  if (tooltipRaisedEventKey.value === eventKey && !hasOpenTooltipForEventKey(eventKey)) {
    tooltipRaisedEventKey.value = null;
  }
};

const toggleCardTooltip = (eventKey, card, slotKey = '', event = null) => {
  const key = makeCardTooltipKey(eventKey, card, slotKey);
  const host = event?.currentTarget;

  if (openedCardTooltipKey.value === key) {
    openedCardTooltipKey.value = '';
    clearCardTooltipOffset(key);
    if (openedSongTooltipEventKey.value !== String(eventKey || '').trim()) {
      clearTooltipRaisedEvent(eventKey);
    }
    return;
  }

  if (openedCardTooltipKey.value && openedCardTooltipKey.value !== key) {
    cardTooltipOffsetMap.value = {};
  }

  if (host instanceof HTMLElement) {
    adjustCardTooltipViewport(eventKey, card, slotKey, host);
  }

  openedCardTooltipKey.value = key;
  openedSongTooltipEventKey.value = '';
  setTooltipRaisedEvent(eventKey);
};

const isCardTooltipOpen = (eventKey, card, slotKey = '') => openedCardTooltipKey.value === makeCardTooltipKey(eventKey, card, slotKey);

const toggleSongTooltip = (eventKey) => {
  const key = String(eventKey || '').trim();
  if (!key) return;
  if (openedSongTooltipEventKey.value === key) {
    openedSongTooltipEventKey.value = '';
    clearTooltipRaisedEvent(key);
    return;
  }
  openedSongTooltipEventKey.value = key;
  openedCardTooltipKey.value = '';
  setTooltipRaisedEvent(key);
};

const isSongTooltipOpen = (eventKey) => openedSongTooltipEventKey.value === String(eventKey || '').trim();

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

const toFiniteSongId = (value) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n > 0 ? n : null;
};

const songsById = computed(() => {
  const map = new Map();
  (props.allSongs || []).forEach((song) => {
    const id = toFiniteSongId(song?.id);
    if (id === null) return;
    map.set(id, song);
  });
  return map;
});

const getSongByEvent = (event) => {
  const id = toFiniteSongId(event?.song_id);
  if (id === null) return null;
  return songsById.value.get(id) || null;
};

const getSongCategories = (song) => {
  if (!Array.isArray(song?.categories)) return [];
  return song.categories.map((item) => String(item || '').trim().toUpperCase()).filter(Boolean);
};

const hasSong3DMV = (event) => {
  const song = getSongByEvent(event);
  if (!song) return false;
  const categories = getSongCategories(song);
  return categories.includes('3DMV');
};

const hasSong2DMV = (event) => {
  const song = getSongByEvent(event);
  if (!song) return false;
  const categories = getSongCategories(song);
  return categories.includes('2DMV');
};

const getSongIdText = (event) => {
  const id = toFiniteSongId(event?.song_id);
  return id === null ? '' : String(id);
};

const getSongTooltipImageSrc = (event) => {
  const id = toFiniteSongId(event?.song_id);
  if (id === null) return '';
  return `/songs/song_${String(id).padStart(3, '0')}.webp`;
};

const markMediaImageSettled = (event) => {
  const img = event?.target;
  if (!(img instanceof HTMLImageElement)) return null;
  img.dataset.loaded = '1';
  return img;
};

const onCardTooltipImageLoad = (event) => {
  const img = markMediaImageSettled(event);
  if (!img) return;
  const holder = img.closest('.card-tooltip-jacket-item');
  if (holder instanceof HTMLElement) {
    holder.classList.remove('is-failed');
  }
};

const onSongTooltipImageError = (event) => {
  const img = markMediaImageSettled(event);
  if (!img) return;
  const holder = img.closest('.song-tooltip-jacket-wrap');
  if (holder instanceof HTMLElement) {
    holder.classList.add('is-failed');
  }
};

const onSongTooltipImageLoad = (event) => {
  const img = markMediaImageSettled(event);
  if (!img) return;
  const holder = img.closest('.song-tooltip-jacket-wrap');
  if (holder instanceof HTMLElement) {
    holder.classList.remove('is-failed');
  }
};

const getSongTitleText = (event) => {
  return String(getSongByEvent(event)?.title || '').trim();
};

const normalizeSongCreditText = (value) => {
  const text = String(value || '').trim();
  return text || '-';
};

const getSongComposerText = (event) => {
  return normalizeSongCreditText(getSongByEvent(event)?.composer);
};

const getSongLyricistText = (event) => {
  return normalizeSongCreditText(getSongByEvent(event)?.lyricist);
};

const getSongArrangerText = (event) => {
  return normalizeSongCreditText(getSongByEvent(event)?.arranger);
};

const hasSongTooltip = (event) => {
  return !!getSongByEvent(event);
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

const hasNonEmptyText = (value) => String(value || '').trim().length > 0;
const isEventOfficialRevealedByJson = (event) => {
  const sourceTitle = String(event?.source_event_title || '').trim();
  const sourceGacha = String(event?.source_gacha_title || '').trim();
  return hasNonEmptyText(sourceTitle) && hasNonEmptyText(sourceGacha);
};

const getPredictStatus = (event) => {
  if (isEventOfficialRevealedByJson(event)) return 'past';
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
  if (isEventOfficialRevealedByJson(event)) return false;
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
const previewDailyLineupCharCollapsed = ref(false);
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
  if (panelId === 'daily-lineup') return { width: 228, height: 390 };
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
  if (panelId === 'daily-lineup') {
    return {
      maxHeight: '380px',
      overflowY: 'auto'
    };
  }
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
  return Array.from(container.querySelectorAll('.event-item, .birthday-row, .preview-row')).find((item) => item.id === rowId) || null;
};

const preserveAnchorWhileLayoutChanges = (eventId, mutator) => {
  const container = historyContainer.value;
  if (!container) {
    mutator();
    return;
  }

  const anchorElBefore = findEventElementInContainer(eventId);
  const beforeTop = anchorElBefore
    ? (anchorElBefore.getBoundingClientRect().top - container.getBoundingClientRect().top)
    : null;

  mutator();

  if (typeof beforeTop !== 'number') return;

  // 多帧校正，覆盖抽屉动画与紧凑样式切换期间的连续重排。
  const correctAnchor = () => {
    const anchorElAfter = findEventElementInContainer(eventId);
    if (!anchorElAfter) return;
    const afterTop = anchorElAfter.getBoundingClientRect().top - container.getBoundingClientRect().top;
    const delta = afterTop - beforeTop;
    if (Math.abs(delta) > 0.5) {
      container.scrollTop += delta;
    }
  };

  nextTick(() => {
    let frames = 12;
    const tick = () => {
      correctAnchor();
      frames -= 1;
      if (frames > 0) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(correctAnchor, 220);
    setTimeout(correctAnchor, 420);
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
  currentEditingSelectionNames.value = Array.isArray(event?.memberCards)
    ? [...new Set(event.memberCards.map((card) => normalizeCharName(card?.Name)).filter((name) => !!CHAR_MAP.value[name]))]
    : [];
  emit('sync-preview-event-id', Number(event.id));
  preserveAnchorWhileLayoutChanges(event.id, () => {
    isEditorOpen.value = true;
  });
};

const handleCloseEditor = () => {
  const anchorId = currentEditingEvent.value?.id || lastFocusedEventId.value;
  if (!anchorId) {
    isEditorOpen.value = false;
    currentEditingSelectionNames.value = [];
    return;
  }

  preserveAnchorWhileLayoutChanges(anchorId, () => {
    isEditorOpen.value = false;
  });
  currentEditingSelectionNames.value = [];
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
const PREVIEW_LIMITED_TYPES = new Set(['limited', 'cfes', 'bfes', 'collab_t', 'wl3']);  //补充了WL3
const FES_CARD_TYPES = new Set(['cfes', 'bfes']);
const PREVIEW_FESTIVAL_TYPES = ['新年', '婚活', '情人节', '白情', '半周年', '周年'];
const PREVIEW_BOX_UNITS = ['ln', 'mmj', 'vbs', 'ws', 'nc'];
const PREVIEW_ATTRS = ['Pure', 'Cool', 'Cute', 'Happy', 'Mysterious'];
const PREVIEW_DAILY_ATTR_COLOR = {
  Pure: '#84cc16',
  Cool: '#3b82f6',
  Cute: '#f472b6',
  Happy: '#f59e0b',
  Mysterious: '#8b5cf6'
};
const PREVIEW_DAILY_CHAR_UNIT_MAP = computed(() => {
  const map = {};
  (props.allCharacters || []).forEach((char) => {
    const name = String(char?.zh_name || '').trim();
    const unit = String(char?.unit || '').trim().toLowerCase();
    if (!name) return;
    map[name] = unit || 'vs';
  });
  return map;
});
const PREVIEW_DAILY_SKILL_BASE = {
  bfes_up: 160,
  cfes: 140,
  p_score: 130,
  score_up: 120,
  accuracy: 100,
  recovery: 100,
  unit_score: 100,
  default: 120
};
const PREVIEW_PANEL_DEFS = [
  { id: 'four', title: '四星', icon: '⭐', statKey: 'fourStarCount', externalKey: 'fourStarCount' },
  { id: 'limited', title: '限定', icon: '🎀', statKey: 'limitedCount', externalKey: 'limitedCount' },
  { id: 'banner', title: 'Banner', icon: 'B', statKey: 'bannerCount', externalKey: 'bannerCount' },
  { id: 'limited-ban', title: '限Ban', icon: '🚫', statKey: 'limitedBanCount', externalKey: 'limitedBanCount' },
  { id: 'vs-last-four', title: 'V上次四星', icon: 'V', statKey: 'vsLastFour' },
  { id: 'vs-unit-score', title: '团分', icon: 'U', statKey: 'vsUnitScore' },
  { id: 'pure-score', title: '分卡', icon: 'S', statKey: 'pureScoreCount' },
  { id: 'p-score', title: 'P分', icon: 'P', statKey: 'pScoreCount' },
  { id: 'score-up', title: '普分', icon: 'N', statKey: 'scoreUpCount', externalKey: 'scoreUpCount' },
  { id: 'recovery', title: '奶卡', icon: '❤', statKey: 'recoveryCount' },
  { id: 'accuracy', title: '判卡', icon: '✓', statKey: 'accuracyCount' },
  { id: 'three', title: '三星', icon: '3', statKey: 'threeStarCount' },
  { id: 'two', title: '二星', icon: '2', statKey: 'twoStarCount' },
  { id: 'reward', title: '报酬', icon: '🎁', statKey: 'rewardTotalCount' },
  { id: 'daily-lineup', title: '日挑配队', icon: '📊', statKey: 'dailyLineup' },
  { id: 'attr-five', title: '花色', icon: '🧩', statKey: 'attrFive' },
  { id: 'festival', title: '节日人选', icon: '🎊', statKey: 'festival', externalKey: 'festival' }
];
const PREVIEW_CHAR_ORDER = computed(() => {
  const map = {};
  (props.allCharacters || []).forEach((char) => {
    const name = String(char?.zh_name || '').trim();
    const order = Number(char?.id);
    if (!name || !Number.isFinite(order)) return;
    map[name] = order;
  });
  return map;
});
const getPreviewCharOrder = (name) => Number(PREVIEW_CHAR_ORDER.value[String(name || '').trim()] || 999);
const PREVIEW_FESTIVAL_VS_UNIT_ORDER = { ln: 1, mmj: 2, vbs: 3, ws: 4, nc: 5, vs: 6 };
const selectedPreviewPanelIds = ref([]);
const selectedPreviewAttrChars = ref([]);
const selectedPreviewDailyLineupChars = ref([]);
const currentEditingSelectionNames = ref([]);
const previewIncludeCollabReward = ref(false);
const previewIncludeUnitScoreInPureScore = ref(false);
const previewLimitedBanEventTypeFilter = ref('all');
const previewBannerEventTypeFilter = ref('all');
const previewFestivalMergeHigherRanks = ref(false);
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
  const ao = getPreviewCharOrder(aBase);
  const bo = getPreviewCharOrder(bBase);
  if (ao !== bo) return ao - bo;
  return aName.localeCompare(bName, 'zh-Hans-CN');
};

const previewSelectableChars = computed(() => {
  return Object.keys(CHAR_MAP.value).sort((a, b) => getPreviewCharOrder(a) - getPreviewCharOrder(b));
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

const togglePreviewDailyLineupChar = (name) => {
  const current = [...selectedPreviewDailyLineupChars.value];
  const idx = current.indexOf(name);
  if (idx >= 0) {
    current.splice(idx, 1);
    selectedPreviewDailyLineupChars.value = current;
    return;
  }
  if (current.length >= 6) return;
  current.push(name);
  selectedPreviewDailyLineupChars.value = current;
};

const clearPreviewDailyLineupChars = () => {
  selectedPreviewDailyLineupChars.value = [];
};

const normalizeCharName = (value) => String(value || '').trim().split(/\s+/)[0] || '';

const getCurrentLineupCharNames = () => {
  const names = [];
  const seen = new Set();

  const pushName = (raw) => {
    const name = normalizeCharName(raw);
    if (!name || !CHAR_MAP.value[name] || seen.has(name)) return;
    seen.add(name);
    names.push(name);
  };

  (currentEditingSelectionNames.value || []).forEach((name) => pushName(name));
  if (names.length > 0) return names;

  const cards = Array.isArray(currentEditingEvent.value?.memberCards)
    ? currentEditingEvent.value.memberCards
    : [];
  cards.forEach((card) => pushName(card?.Name));
  return names;
};

const getCurrentLineupFourStarCharNames = () => {
  const names = [];
  const seen = new Set();
  const cards = Array.isArray(currentEditingEvent.value?.memberCards)
    ? currentEditingEvent.value.memberCards
    : [];

  cards.forEach((card) => {
    if (String(card?.Rarity || '').trim() !== '4') return;
    const name = normalizeCharName(card?.Name);
    if (!name || !CHAR_MAP.value[name] || seen.has(name)) return;
    seen.add(name);
    names.push(name);
  });

  return names;
};

const canAppendCurrentLineupToPreviewAttr = computed(() => {
  const source = getCurrentLineupCharNames();
  if (source.length === 0) return false;
  if (selectedPreviewAttrChars.value.length >= 8) return false;
  return source.some((name) => !selectedPreviewAttrChars.value.includes(name));
});

const appendPreviewAttrCharsFromCurrentLineup = () => {
  const source = getCurrentLineupCharNames();
  if (source.length === 0) return;

  const next = [...selectedPreviewAttrChars.value];
  source.forEach((name) => {
    if (next.length >= 8) return;
    if (next.includes(name)) return;
    next.push(name);
  });
  selectedPreviewAttrChars.value = next;
};

const canAppendCurrentLineupToPreviewDailyLineup = computed(() => {
  const source = getCurrentLineupFourStarCharNames();
  if (source.length === 0) return false;
  if (selectedPreviewDailyLineupChars.value.length >= 6) return false;
  return source.some((name) => !selectedPreviewDailyLineupChars.value.includes(name));
});

const appendPreviewDailyLineupCharsFromCurrentLineup = () => {
  const source = getCurrentLineupFourStarCharNames();
  if (source.length === 0) return;

  const next = [...selectedPreviewDailyLineupChars.value];
  source.forEach((name) => {
    if (next.length >= 6) return;
    if (next.includes(name)) return;
    next.push(name);
  });
  selectedPreviewDailyLineupChars.value = next;
};

const handlePredictSelectionChange = (names) => {
  const list = Array.isArray(names)
    ? names.map((name) => normalizeCharName(name)).filter((name) => !!CHAR_MAP.value[name])
    : [];
  currentEditingSelectionNames.value = [...new Set(list)];
};

const setSelectedPreviewFestival = (festival) => {
  if (!PREVIEW_FESTIVAL_TYPES.includes(festival)) return;
  selectedPreviewFestival.value = festival;
};

const setPreviewLimitedBanEventTypeFilter = (targetType, checked) => {
  if (checked) {
    previewLimitedBanEventTypeFilter.value = targetType;
    return;
  }
  if (previewLimitedBanEventTypeFilter.value === targetType) {
    previewLimitedBanEventTypeFilter.value = 'all';
  }
};

const cyclePreviewLimitedBanEventTypeFilter = () => {
  const current = previewLimitedBanEventTypeFilter.value;
  if (current === 'all') {
    previewLimitedBanEventTypeFilter.value = '箱活';
    return;
  }
  if (current === '箱活') {
    previewLimitedBanEventTypeFilter.value = '混活';
    return;
  }
  previewLimitedBanEventTypeFilter.value = 'all';
};

const setPreviewBannerEventTypeFilter = (targetType, checked) => {
  if (checked) {
    previewBannerEventTypeFilter.value = targetType;
    return;
  }
  if (previewBannerEventTypeFilter.value === targetType) {
    previewBannerEventTypeFilter.value = 'all';
  }
};

const cyclePreviewBannerEventTypeFilter = () => {
  const current = previewBannerEventTypeFilter.value;
  if (current === 'all') {
    previewBannerEventTypeFilter.value = '箱活';
    return;
  }
  if (current === '箱活') {
    previewBannerEventTypeFilter.value = '混活';
    return;
  }
  previewBannerEventTypeFilter.value = 'all';
};

const previewLimitedBanFilterButtonText = computed(() => {
  const current = previewLimitedBanEventTypeFilter.value;
  if (current === '箱活') return '仅箱';
  if (current === '混活') return '仅混';
  return '箱混';
});

const previewLimitedBanFilterButtonTitle = computed(() => {
  const current = previewLimitedBanEventTypeFilter.value;
  if (current === '箱活') return '当前仅统计箱活，点击切换到混活';
  if (current === '混活') return '当前仅统计混活，点击切换到全体';
  return '当前统计全体，点击切换到箱活';
});

const previewBannerFilterButtonText = computed(() => {
  const current = previewBannerEventTypeFilter.value;
  if (current === '箱活') return '仅箱';
  if (current === '混活') return '仅混';
  return '箱混';
});

const previewBannerFilterButtonTitle = computed(() => {
  const current = previewBannerEventTypeFilter.value;
  if (current === '箱活') return '当前仅统计箱活Banner，点击切换到混活';
  if (current === '混活') return '当前仅统计混活Banner，点击切换到全体';
  return '当前统计全体Banner，点击切换到箱活';
});

const isFesCardType = (typeValue) => FES_CARD_TYPES.has(String(typeValue || '').trim().toLowerCase());

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
  if (!baseName || getPreviewCharOrder(baseName) >= 999) return '';
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
  const baseDiff = getPreviewCharOrder(a.baseName) - getPreviewCharOrder(b.baseName);
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
  const isLimitedBan = def.id === 'limited-ban';
  const dynamicTitle = isFestival && activePreviewFestivalName.value
    ? `节日人选·${activePreviewFestivalName.value}`
    : (isLimitedBan && previewLimitedBanEventTypeFilter.value !== 'all'
      ? `限Ban·${previewLimitedBanEventTypeFilter.value === '箱活' ? '箱' : '混'}`
      : (def.id === 'banner' && previewBannerEventTypeFilter.value !== 'all'
        ? `Banner·${previewBannerEventTypeFilter.value === '箱活' ? '箱' : '混'}`
        : def.title));
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
  if (current.length >= 6) return;
  current.push(panelId);
  selectedPreviewPanelIds.value = current;
};

watch(selectedPreviewPanelIds, (ids) => {
  if (!ids.includes('attr-five')) {
    previewAttrCharCollapsed.value = false;
  }
  if (!ids.includes('daily-lineup')) {
    previewDailyLineupCharCollapsed.value = false;
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
    const isFes = isFesCardType(type);
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

  const allBaseNames = Object.keys(CHAR_MAP.value)
    .sort((a, b) => getPreviewCharOrder(a) - getPreviewCharOrder(b));

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
  if (!Array.isArray(rows)) return [];
  if (!previewFestivalMergeHigherRanks.value) return rows;

  const getBaseName = (charName) => parseFestivalPreviewCharKey(charName).baseName;
  const fourRow = rows.find((row) => row.key === 'four') || { chars: [] };
  const threeRow = rows.find((row) => row.key === 'three') || { chars: [] };
  const twoRow = rows.find((row) => row.key === 'two') || { chars: [] };

  const fourBaseSet = new Set((fourRow.chars || []).map((item) => getBaseName(item.name)).filter(Boolean));
  const mergedThreeChars = (threeRow.chars || []).filter((item) => !fourBaseSet.has(getBaseName(item.name)));
  const threeBaseSet = new Set(mergedThreeChars.map((item) => getBaseName(item.name)).filter(Boolean));
  const mergedTwoChars = (twoRow.chars || []).filter((item) => {
    const base = getBaseName(item.name);
    if (!base) return false;
    return !fourBaseSet.has(base) && !threeBaseSet.has(base);
  });

  return rows.map((row) => {
    if (row.key === 'three') return { ...row, chars: mergedThreeChars };
    if (row.key === 'two') return { ...row, chars: mergedTwoChars };
    return row;
  });
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
  if (!['2', '3'].includes(rarity)) return false;
  if (isNumericEventId(card?.EventID)) return true;
  if (!previewIncludeCollabReward.value) return false;
  return String(card?.Type || '').trim().toLowerCase() === 'collab';
};

const getPreviewCardProgressOrderId = (card) => {
  const cardId = Number(String(card?.CardID || '').trim());
  if (Number.isFinite(cardId) && cardId > 0) return cardId;
  const eventId = Number(String(card?.EventID || '').trim());
  if (Number.isFinite(eventId) && eventId > 0) return eventId * 10000;
  return 0;
};

const getPreviewStepBaseOrder = (name) => {
  const base = String(name || '').trim().split(/\s+/)[0] || '';
  return getPreviewCharOrder(base);
};

const previewStepProgressOrderMap = computed(() => {
  const maxId = Number(previewMaxEventId.value);
  const rowMap = {};

  const ensure = (rawName) => {
    const name = String(rawName || '').trim();
    if (!name) return null;
    if (!rowMap[name]) {
      rowMap[name] = {
        lastCardOrderId: 0,
        lastFourStarOrderId: 0,
        lastLimitedOrderId: 0,
        lastPScoreOrderId: 0,
        lastPureScoreOrderId: 0,
        lastRecoveryOrderId: 0,
        lastAccuracyOrderId: 0,
        lastThreeStarOrderId: 0,
        lastTwoStarOrderId: 0,
        lastRewardOrderId: 0,
        lastLimitedBanOrderId: 0
      };
    }
    return rowMap[name];
  };

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinPreviewLimit(card, maxId)) return;
    const name = String(card?.Name || '').trim();
    if (!name || name === '-' || name === 'CardID') return;

    const row = ensure(name);
    if (!row) return;

    const rarity = String(card?.Rarity || '').trim();
    const skill = String(card?.Skill || '').trim().toLowerCase();
    const type = String(card?.Type || '').trim().toLowerCase();
    const progressOrderId = getPreviewCardProgressOrderId(card);

    row.lastCardOrderId = Math.max(Number(row.lastCardOrderId || 0), progressOrderId);

    if (rarity === '4') {
      row.lastFourStarOrderId = Math.max(Number(row.lastFourStarOrderId || 0), progressOrderId);
      if (skill === 'p_score') row.lastPScoreOrderId = Math.max(Number(row.lastPScoreOrderId || 0), progressOrderId);
      if (skill === 'score_up') row.lastScoreUpOrderId = Math.max(Number(row.lastScoreUpOrderId || 0), progressOrderId);
      if (skill === 'accuracy') row.lastAccuracyOrderId = Math.max(Number(row.lastAccuracyOrderId || 0), progressOrderId);
      if (skill === 'recovery') row.lastRecoveryOrderId = Math.max(Number(row.lastRecoveryOrderId || 0), progressOrderId);
      const excludedPureSkills = previewIncludeUnitScoreInPureScore.value
        ? ['accuracy', 'recovery', '-', '']
        : ['accuracy', 'recovery', 'unit_score', '-', ''];
      if (!excludedPureSkills.includes(skill)) {
        row.lastPureScoreOrderId = Math.max(Number(row.lastPureScoreOrderId || 0), progressOrderId);
      }
    }

    if (rarity === '3') {
      row.lastThreeStarOrderId = Math.max(Number(row.lastThreeStarOrderId || 0), progressOrderId);
    }
    if (rarity === '2') {
      row.lastTwoStarOrderId = Math.max(Number(row.lastTwoStarOrderId || 0), progressOrderId);
    }

    if (isPreviewEventRewardCard(card)) {
      row.lastRewardOrderId = Math.max(Number(row.lastRewardOrderId || 0), progressOrderId);
    }

    if (PREVIEW_LIMITED_TYPES.has(type)) {
      row.lastLimitedOrderId = Math.max(Number(row.lastLimitedOrderId || 0), progressOrderId);
    }
  });

  const typeFilter = previewLimitedBanEventTypeFilter.value;
  const bannerTypeFilter = previewBannerEventTypeFilter.value;
  (props.allEvents || []).forEach((ev) => {
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (!Number.isFinite(eid) || eid <= 0) return;
    if (Number.isFinite(maxId) && maxId > 0 && eid > maxId) return;

    const bannerName = normalizeCharName(ev?.banner);
    if (bannerName && getPreviewCharOrder(bannerName) < 999 && !isVirtualSinger(bannerName)) {
      const eventType = String(ev?.event_type || '').trim();
      if (['箱活', '混活'].includes(eventType) && (bannerTypeFilter === 'all' || bannerTypeFilter === eventType)) {
        const row = ensure(bannerName);
        if (row) {
          row.lastBannerOrderId = Math.max(Number(row.lastBannerOrderId || 0), eid);
        }
      }
    }

    if (String(ev?.gacha_type || '').trim() !== '普通限定') return;

    const eventType = String(ev?.event_type || '').trim();
    if (typeFilter !== 'all' && eventType !== typeFilter) return;

    const bannerNameLimited = bannerName;
    if (!bannerNameLimited || getPreviewCharOrder(bannerNameLimited) >= 999 || isVirtualSinger(bannerNameLimited)) return;
    const row = ensure(bannerNameLimited);
    if (!row) return;
    row.lastLimitedBanOrderId = Math.max(Number(row.lastLimitedBanOrderId || 0), eid);
  });

  return rowMap;
});

const getPreviewStepProgressOrderKey = (name, key) => {
  const row = previewStepProgressOrderMap.value[String(name || '').trim()] || {};
  if (key === 'fourStarCount') return Number(row.lastFourStarOrderId || 0);
  if (key === 'limitedCount') return Number(row.lastLimitedOrderId || 0);
  if (key === 'pScoreCount') return Number(row.lastPScoreOrderId || 0);
  if (key === 'scoreUpCount') return Number(row.lastScoreUpOrderId || 0);
  if (key === 'pureScoreCount') return Number(row.lastPureScoreOrderId || 0);
  if (key === 'recoveryCount') return Number(row.lastRecoveryOrderId || 0);
  if (key === 'accuracyCount') return Number(row.lastAccuracyOrderId || 0);
  if (key === 'threeStarCount') return Number(row.lastThreeStarOrderId || 0);
  if (key === 'twoStarCount') return Number(row.lastTwoStarOrderId || 0);
  if (key === 'rewardTotalCount') return Number(row.lastRewardOrderId || 0);
  if (key === 'bannerCount') return Number(row.lastBannerOrderId || 0);
  if (key === 'limitedBanCount') return Number(row.lastLimitedBanOrderId || 0);
  return Number(row.lastCardOrderId || 0);
};

const comparePreviewStepCharByKey = (aName, bName, key) => {
  const ao = getPreviewStepProgressOrderKey(aName, key);
  const bo = getPreviewStepProgressOrderKey(bName, key);
  if (ao !== bo) return ao - bo;
  const ac = getPreviewStepBaseOrder(aName);
  const bc = getPreviewStepBaseOrder(bName);
  if (ac !== bc) return ac - bc;
  return String(aName || '').localeCompare(String(bName || ''), 'zh-Hans-CN');
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
        scoreUpCount: 0,
        bannerCount: 0,
        twoStarCount: 0,
        threeStarCount: 0,
        rewardTwoCount: 0,
        rewardThreeCount: 0,
        accuracyCount: 0,
        recoveryCount: 0,
        unitScoreCount: 0,
        pendingSkillCount: 0,
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
      if (skill === 'score_up') stats[name].scoreUpCount += 1;
      if (skill === 'accuracy') stats[name].accuracyCount += 1;
      if (skill === 'recovery') stats[name].recoveryCount += 1;
      if (skill === 'unit_score') stats[name].unitScoreCount += 1;
      if (!skill || skill === '-') stats[name].pendingSkillCount += 1;
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

  const bannerTypeFilter = previewBannerEventTypeFilter.value;
  (props.allEvents || []).forEach((ev) => {
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (!Number.isFinite(eid) || eid <= 0) return;
    if (Number.isFinite(maxId) && maxId > 0 && eid > maxId) return;

    const eventType = String(ev?.event_type || '').trim();
    if (!['箱活', '混活'].includes(eventType)) return;
    if (bannerTypeFilter !== 'all' && bannerTypeFilter !== eventType) return;

    const bannerName = normalizeCharName(ev?.banner);
    if (!bannerName || getPreviewCharOrder(bannerName) >= 999 || isVirtualSinger(bannerName)) return;

    if (!stats[bannerName]) {
      stats[bannerName] = {
        name: bannerName,
        fourStarCount: 0,
        limitedCount: 0,
        pScoreCount: 0,
        scoreUpCount: 0,
        bannerCount: 0,
        twoStarCount: 0,
        threeStarCount: 0,
        rewardTwoCount: 0,
        rewardThreeCount: 0,
        accuracyCount: 0,
        recoveryCount: 0,
        unitScoreCount: 0,
        pendingSkillCount: 0,
        pureScoreCount: 0,
        rewardTotalCount: 0,
        attr4Counts: { Pure: 0, Cool: 0, Cute: 0, Happy: 0, Mysterious: 0 }
      };
    }
    stats[bannerName].bannerCount += 1;
  });

  return Object.values(stats).map((s) => {
    const pureSubtract = previewIncludeUnitScoreInPureScore.value
      ? (s.accuracyCount + s.recoveryCount + s.pendingSkillCount)
      : (s.accuracyCount + s.recoveryCount + s.unitScoreCount + s.pendingSkillCount);
    s.pureScoreCount = s.fourStarCount - pureSubtract;
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
    .sort((a, b) => getPreviewCharOrder(a.name) - getPreviewCharOrder(b.name));
});

const previewLimitedBanSteps = computed(() => {
  const maxId = Number(previewMaxEventId.value);
  if (!Number.isFinite(maxId) || maxId <= 0) return [];

  const typeFilter = previewLimitedBanEventTypeFilter.value;
  const countMap = Object.fromEntries(
    Object.keys(PREVIEW_CHAR_ORDER.value)
      .filter((name) => !isVirtualSinger(name))
      .map((name) => [name, 0])
  );

  (props.allEvents || []).forEach((ev) => {
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (eid > maxId) return;
    if (String(ev?.gacha_type || '').trim() !== '普通限定') return;

    const eventType = String(ev?.event_type || '').trim();
    if (typeFilter !== 'all' && eventType !== typeFilter) return;

    const bannerName = normalizeCharName(ev?.banner);
    if (!bannerName || getPreviewCharOrder(bannerName) >= 999) return;
    if (isVirtualSinger(bannerName)) return;
    countMap[bannerName] = Number(countMap[bannerName] || 0) + 1;
  });

  const grouped = new Map();
  Object.entries(countMap).forEach(([name, count]) => {
    const n = Number(count || 0);
    if (!grouped.has(n)) grouped.set(n, []);
    grouped.get(n).push({ name });
  });

  return Array.from(grouped.entries())
    .map(([count, chars]) => ({
      count,
      chars: chars.sort((a, b) => comparePreviewStepCharByKey(a.name, b.name, 'limitedBanCount'))
    }))
    .sort((a, b) => b.count - a.count);
});

const previewBannerSteps = computed(() => {
  const grouped = new Map();
  previewCharStats.value
    .filter((row) => !isVirtualSinger(String(row?.name || '').trim().split(/\s+/)[0]))
    .forEach((row) => {
      const count = Number(row?.bannerCount || 0);
      if (!grouped.has(count)) grouped.set(count, []);
      grouped.get(count).push({ name: row.name });
    });

  return Array.from(grouped.entries())
    .map(([count, chars]) => ({
      count,
      chars: chars.sort((a, b) => comparePreviewStepCharByKey(a.name, b.name, 'bannerCount'))
    }))
    .sort((a, b) => b.count - a.count);
});

const previewDailyLineupRows = computed(() => {
  if (!selectedPreviewPanelIds.value.includes('daily-lineup')) return [];
  if (!selectedPreviewDailyLineupChars.value.length) return [];

  const external = props.statsPreviewData;
  const externalMaxId = Number(external?.maxEventId);
  const lineupMap = external?.groups?.dailyLineup || {};
  const canUseExternal = Number.isFinite(externalMaxId)
    && externalMaxId === Number(previewMaxEventId.value)
    && lineupMap
    && typeof lineupMap === 'object';

  const getDailyCardSkillInfo = (card) => {
    const skill = String(card?.Skill || '').trim().toLowerCase();
    const type = String(card?.Type || '').trim().toLowerCase();

    if (skill === 'bfes_up' || type === 'bfes') {
      return { kind: 'bfes_up', baseScore: PREVIEW_DAILY_SKILL_BASE.bfes_up, isUnitScore: false };
    }
    if (skill.startsWith('cfes') || type === 'cfes') {
      return { kind: 'cfes', baseScore: PREVIEW_DAILY_SKILL_BASE.cfes, isUnitScore: false };
    }
    if (skill === 'p_score') {
      return { kind: 'p_score', baseScore: PREVIEW_DAILY_SKILL_BASE.p_score, isUnitScore: false };
    }
    if (skill === 'score_up') {
      return { kind: 'score_up', baseScore: PREVIEW_DAILY_SKILL_BASE.score_up, isUnitScore: false };
    }
    if (skill === 'accuracy') {
      return { kind: 'accuracy', baseScore: PREVIEW_DAILY_SKILL_BASE.accuracy, isUnitScore: false };
    }
    if (skill === 'recovery') {
      return { kind: 'recovery', baseScore: PREVIEW_DAILY_SKILL_BASE.recovery, isUnitScore: false };
    }
    if (skill === 'unit_score') {
      return { kind: 'unit_score', baseScore: PREVIEW_DAILY_SKILL_BASE.unit_score, isUnitScore: true };
    }
    return { kind: 'default', baseScore: PREVIEW_DAILY_SKILL_BASE.default, isUnitScore: false };
  };

  const getDailyCardUnit = (card, baseName) => {
    if (isVirtualSinger(baseName)) {
      const aff = String(card?.Affiliation || '').trim().toLowerCase();
      return aff && UNIT_COLORS.value[aff] ? aff : 'vs';
    }
    return PREVIEW_DAILY_CHAR_UNIT_MAP.value[baseName] || 'vs';
  };

  const calcDailyUnitScore = (unit, members) => {
    const sameUnitCount = members.reduce((sum, m) => sum + (m.unit === unit ? 1 : 0), 0);
    const others = Math.max(0, sameUnitCount - 1);
    return 100 + (others * 10) + (others === 4 ? 10 : 0);
  };

  const evalDailyMembers = (cards) => {
    const members = cards.map((card) => ({ ...card }));
    members.forEach((m) => {
      if (m.isUnitScore) {
        m.score = calcDailyUnitScore(m.unit, members);
      } else {
        m.score = m.baseScore;
      }
    });
    const baseTotal = members.reduce((sum, m) => sum + Number(m.score || 0), 0);
    const captainBonus = members.length ? Math.max(...members.map((m) => Number(m.score || 0))) : 0;
    return { total: baseTotal + captainBonus, members };
  };

  const compareDailySolvedHit = (nextHit, bestHit) => {
    if (!bestHit) return true;
    if (nextHit.total !== bestHit.total) return nextHit.total > bestHit.total;

    const nextBfes = nextHit.members.filter((m) => m.fesKind === 'bfes').length;
    const bestBfes = bestHit.members.filter((m) => m.fesKind === 'bfes').length;
    if (nextBfes !== bestBfes) return nextBfes > bestBfes;

    const nextCfes = nextHit.members.filter((m) => m.fesKind === 'cfes').length;
    const bestCfes = bestHit.members.filter((m) => m.fesKind === 'cfes').length;
    if (nextCfes !== bestCfes) return nextCfes > bestCfes;

    const nextNewest = Math.max(...nextHit.members.map((m) => Number(m.eventId || 0)));
    const bestNewest = Math.max(...bestHit.members.map((m) => Number(m.eventId || 0)));
    return nextNewest > bestNewest;
  };

  const solveDailyLineup = (cards) => {
    const source = [...(cards || [])];
    if (!source.length) return null;
    const teamSize = Math.min(5, source.length);
    let best = null;
    const selected = [];

    const dfs = (startIdx) => {
      const need = teamSize - selected.length;
      if (need === 0) {
        const hit = evalDailyMembers(selected);
        if (compareDailySolvedHit(hit, best)) best = hit;
        return;
      }

      for (let i = startIdx; i <= source.length - need; i += 1) {
        selected.push(source[i]);
        dfs(i + 1);
        selected.pop();
      }
    };

    dfs(0);
    return best;
  };

  const localLineupMap = (() => {
    if (canUseExternal) return null;
    const maxId = Number(previewMaxEventId.value);
    if (!Number.isFinite(maxId) || maxId <= 0) return {};

    const byNameAttr = {};
    (props.allCards || []).forEach((card) => {
      if (!isCardWithinPreviewLimit(card, maxId)) return;
      if (String(card?.Rarity || '').trim() !== '4') return;

      const baseName = normalizeCharName(card?.Name);
      if (!baseName || getPreviewCharOrder(baseName) >= 999) return;

      const attr = normalizeAttr(card?.Attribute);
      if (!PREVIEW_ATTRS.includes(attr)) return;

      const skillInfo = getDailyCardSkillInfo(card);
      const unit = getDailyCardUnit(card, baseName);
      if (!byNameAttr[baseName]) byNameAttr[baseName] = {};
      if (!byNameAttr[baseName][attr]) byNameAttr[baseName][attr] = [];

      byNameAttr[baseName][attr].push({
        cardId: String(card?.CardID || ''),
        unit,
        baseScore: skillInfo.baseScore,
        isUnitScore: skillInfo.isUnitScore,
        fesKind: skillInfo.kind === 'bfes_up' ? 'bfes' : (skillInfo.kind === 'cfes' ? 'cfes' : ''),
        eventId: Number(String(card?.EventID || '').trim()) || 0
      });
    });

    const map = {};
    Object.keys(byNameAttr).forEach((name) => {
      const plans = PREVIEW_ATTRS
        .map((attr) => {
          const solved = solveDailyLineup(byNameAttr[name][attr] || []);
          if (!solved) return null;
          const orderedMembers = [...solved.members].sort((a, b) => {
            if (Number(b.score || 0) !== Number(a.score || 0)) return Number(b.score || 0) - Number(a.score || 0);
            return Number(b.eventId || 0) - Number(a.eventId || 0);
          });
          const memberScores = orderedMembers.map((m) => Number(m.score || 0));
          while (memberScores.length < 5) memberScores.push(0);
          return {
            attr,
            total: Number(solved.total || 0),
            memberScores,
            memberFesKinds: orderedMembers.map((m) => String(m.fesKind || '')),
            bfesCount: orderedMembers.filter((m) => m.fesKind === 'bfes').length,
            cfesCount: orderedMembers.filter((m) => m.fesKind === 'cfes').length
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (b.total !== a.total) return b.total - a.total;
          if ((b.bfesCount || 0) !== (a.bfesCount || 0)) return (b.bfesCount || 0) - (a.bfesCount || 0);
          if ((b.cfesCount || 0) !== (a.cfesCount || 0)) return (b.cfesCount || 0) - (a.cfesCount || 0);
          return PREVIEW_ATTRS.indexOf(a.attr) - PREVIEW_ATTRS.indexOf(b.attr);
        })
        .map(({ bfesCount, cfesCount, ...plan }) => plan);
      map[name] = plans;
    });
    return map;
  })();

  const activeLineupMap = canUseExternal ? lineupMap : localLineupMap;
  if (!activeLineupMap || typeof activeLineupMap !== 'object') return [];

  return selectedPreviewDailyLineupChars.value
    .map((name) => {
      const plansRaw = Array.isArray(activeLineupMap?.[name]) ? activeLineupMap[name] : [];
      const plans = plansRaw
        .map((plan) => {
          const attr = String(plan?.attr || '');
          if (!PREVIEW_ATTRS.includes(attr)) return null;
          const rawScores = Array.isArray(plan?.memberScores) ? plan.memberScores : [];
          const memberScores = [...rawScores].slice(0, 5).map((n) => Number(n || 0));
          while (memberScores.length < 5) memberScores.push(0);
          const rawKinds = Array.isArray(plan?.memberFesKinds) ? plan.memberFesKinds : [];
          const memberFesKinds = [...rawKinds].slice(0, 5).map((k) => String(k || ''));
          while (memberFesKinds.length < 5) memberFesKinds.push('');
          return {
            attr,
            total: Number(plan?.total || 0),
            memberScores,
            memberFesKinds
          };
        })
        .filter(Boolean);
      if (!plans.length) {
        return null;
      }
      return { name, plans };
    })
    .filter(Boolean)
    .sort((a, b) => getPreviewCharOrder(a.name) - getPreviewCharOrder(b.name));
});

const getPreviewDailyPlanStyle = (attr) => {
  const color = PREVIEW_DAILY_ATTR_COLOR[String(attr || '')] || '#94a3b8';
  return {
    '--daily-row-bg': hexToRgba(color, 0.12),
    '--lineup-row-border': hexToRgba(color, 0.52)
  };
};

const getPreviewDailyCardStyle = (name) => {
  const color = getCharColor(name);
  return {
    backgroundColor: hexToRgba(color, 0.14),
    borderColor: hexToRgba(color, 0.34)
  };
};

const getPreviewDailyScoreCellClass = (fesKind, score) => {
  const kind = String(fesKind || '').toLowerCase();
  const empty = Number(score || 0) <= 0;
  return {
    'is-empty': empty,
    'is-bfes': !empty && kind === 'bfes',
    'is-cfes': !empty && kind === 'cfes'
  };
};

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
      chars: [...chars].sort((a, b) => comparePreviewStepCharByKey(a.name, b.name, key))
    }))
    .sort((a, b) => b.count - a.count);
};

const getPreviewStepsByKey = (key) => {
  if (key === 'limitedBanCount' && previewLimitedBanEventTypeFilter.value !== 'all') {
    return previewLimitedBanSteps.value;
  }
  if (key === 'bannerCount' && previewBannerEventTypeFilter.value !== 'all') {
    return previewBannerSteps.value;
  }
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
  if (key === 'limitedBanCount') {
    return previewLimitedBanSteps.value;
  }
  if (key === 'bannerCount') {
    return previewBannerSteps.value;
  }
  return buildPreviewSteps(key);
};

const getPreviewAttrRowStyle = (name) => {
  return {
    backgroundColor: hexToRgba(getCharColor(name), 0.3)
  };
};

const previewFloatingPanels = computed(() => {
  if (!isEditorOpen.value) return [];
  return selectedPreviewPanelIds.value
    .map((id) => PREVIEW_PANEL_DEFS.find((d) => d.id === id))
    .filter(Boolean)
    .map((def) => ({
      id: def.id,
      title: def.title,
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
    if (panel.id === 'daily-lineup') {
      const cur = nextState[panel.id];
      nextState[panel.id] = {
        ...cur,
        scale: Math.min(1, Number(cur?.scale || 1))
      };
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
const filterMode = ref('event'); // 'single' | 'event'
const EVENT_TYPE_FILTER_OPTIONS = [
  { value: 'box', label: '箱活' },
  { value: 'mix', label: '混活' },
  { value: 'wl', label: 'World Link' },
  { value: 'collab', label: '联动' }
];
const EVENT_SPECIAL_RULE_OPTIONS = [
  { value: 'two-vs', label: '2VS' },
  { value: 'three-oc', label: '3OC' },
  { value: 'four-no-vs', label: '4花后' }
];
const EVENT_FESTIVAL_ORDER = ['新年', '情人节', '白情', '半周年', '五月', '婚活', '六月', '夏活', '八月', '九月', '周年', '十一月', '十二月'];
const EVENT_FESTIVAL_EXCLUDE = new Set(['开服', '二月', '三月']);
const EVENT_GACHA_FILTER_OPTIONS = [
  { value: 'perm', label: '常驻' },
  { value: 'limited', label: '普通限定' },
  { value: 'limited160', label: '百六' },
  { value: 'ue', label: 'UE限定' },
  { value: 'cfes', label: 'CFES' },
  { value: 'bfes', label: 'BFES' },
  { value: 'collab', label: '联动' }
];

const filterCriteria = ref({
  selectedChars: [], // 选中的角色名数组
  rarities: [],      // [1, 2, 3, 4, 'birthday']
  attributes: [],    // ['Happy', 'Mysterious', 'Cute', 'Cool', 'Pure']
  skills: [],        // ['score_up', 'accuracy', ...]
  cardTypes: [],     // ['perm', 'limited', ...]
  units: []          // ['ln', 'mmj', 'vbs', 'ws', 'nc', 'vs']
});

const eventFilterCriteria = ref({
  characters: [],
  multiPersonRule: 'same-event', // 'same-event' | 'same-pool'
  isBan: null, // 'yes' | 'no' | null
  eventTypes: [],
  specialRules: [],
  festivals: [],
  attributes: [],
  units: [],
  gachaTypes: []
});

const canUseEventBanFilter = computed(() => eventFilterCriteria.value.characters.length === 1);
const canUseMultiPersonRule = computed(() => eventFilterCriteria.value.characters.length >= 2);
const canUseFourNoVsRule = computed(() => {
  const selectedTypes = eventFilterCriteria.value.eventTypes || [];
  return selectedTypes.length === 1 && selectedTypes[0] === 'box';
});

const sortedEvents = computed(() => {
  return [...(props.allEvents || [])].sort((a, b) => (
    sortDesc.value ? compareEventOrderAsc(b, a) : compareEventOrderAsc(a, b)
  ));
});

const normalLimitedEventsAsc = computed(() => {
  return [...(props.allEvents || [])]
    .filter((event) => String(event?.gacha_type || '').trim() === '普通限定')
    .sort(compareEventOrderAsc);
});

const hasDetailFilters = computed(() => {
  const f = filterCriteria.value || {};
  return Boolean(
    (f.selectedChars && f.selectedChars.length > 0) ||
    (f.rarities && f.rarities.length > 0) ||
    (f.attributes && f.attributes.length > 0) ||
    (f.skills && f.skills.length > 0) ||
    (f.cardTypes && f.cardTypes.length > 0) ||
    (f.units && f.units.length > 0)
  );
});

const hasEventFilters = computed(() => {
  const f = eventFilterCriteria.value || {};
  return Boolean(
    (f.characters && f.characters.length > 0) ||
    f.isBan ||
    (f.eventTypes && f.eventTypes.length > 0) ||
    (f.specialRules && f.specialRules.length > 0) ||
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

  const matchDetailCardType = (card, typeValue) => {
    const cType = String(card?.Type || '').toLowerCase();
    if (typeValue === 'collab') return cType === 'collab' || cType === 'collab_t';
    if (typeValue === 'ue') return ['wl1', 'wl2', 'wl3'].includes(cType);
    return cType === String(typeValue || '').toLowerCase();
  };

  return data.filter((event) => {
    const selectedNames = filterCriteria.value.selectedChars || [];
    const cards = getEventCardsForFilter(event);
    return cards.some((card) => {
      const cardMainName = String(card?.Name || '').trim().split(' ')[0];
      if (!cardMainName || cardMainName === '-' || cardMainName === 'CardID') return false;

      if (selectedNames.length > 0 && !selectedNames.includes(cardMainName)) return false;

      const matchType = !filterCriteria.value.cardTypes.length
        || filterCriteria.value.cardTypes.some((t) => matchDetailCardType(card, t));

      const rarityRaw = String(card?.Rarity || '').trim();
      const cardTypeRaw = String(card?.Type || '').trim().toLowerCase();
      const matchRarity = !filterCriteria.value.rarities.length
        || filterCriteria.value.rarities.some((r) => {
          if (r === 'birthday') return cardTypeRaw === 'birthday';
          return Number(rarityRaw) === Number(r);
        });

      const attr = normalizeAttr(card?.Attribute);
      const matchAttr = !filterCriteria.value.attributes.length
        || filterCriteria.value.attributes.includes(attr);

      const skill = String(card?.Skill || '').toLowerCase();
      const matchSkill = !filterCriteria.value.skills.length
        || filterCriteria.value.skills.includes(skill);

      const unit = String(card?.Affiliation || '').toLowerCase();
      const matchUnit = !filterCriteria.value.units.length
        || filterCriteria.value.units.includes(unit);

      return matchRarity && matchAttr && matchSkill && matchType && matchUnit;
    });
  });
});

const filterHitEventCount = computed(() => filteredData.value.length);

const activeFilteredEventCount = computed(() => {
  if (!hasActiveFilters.value) return 0;
  return filteredData.value.length;
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
    const cardDate = String(card?.Date || '').trim();
    if (!name || !cardDate) return;

    const matched = cardDate.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (!matched) return;

    const year = Number(matched[1]);
    const fallbackMonth = Number(matched[2]);
    const fallbackDay = Number(matched[3]);
    if (!Number.isFinite(year) || !Number.isFinite(fallbackMonth) || !Number.isFinite(fallbackDay)) return;

    const md = CHARACTER_BIRTHDAY_MD_MAP.value[name] || null;
    const month = md?.month || Math.trunc(fallbackMonth);
    const day = md?.day || Math.trunc(fallbackDay);
    const date = `${Math.trunc(year)}/${month}/${day}`;

    const key = `${name}|${date}`;
    if (seen.has(key)) return;
    seen.add(key);

    rows.push({
      kind: 'birthday',
      key: `birthday-${key}`,
      id: `birthday-${key}`,
      name,
      date,
      cardId: normalizeCardIdText(card?.CardID),
      attribute: normalizeAttr(card?.Attribute)
    });
  });

  return rows;
});

const previewRows = computed(() => {
  return (previewDataRows.value || []).map((item) => {
    const idNum = Number(item?.id);
    const date = String(item?.date || '').trim();
    const week = String(item?.week || '').trim();
    const members = Array.isArray(item?.members)
      ? item.members.map((name) => String(name || '').trim()).filter((name) => !!CHAR_MAP.value[name]).slice(0, 4)
      : [];
    const safeId = Number.isFinite(idNum) ? idNum : `x${Math.random().toString(36).slice(2, 8)}`;
    return {
      kind: 'preview',
      key: `preview-${safeId}`,
      id: `preview-${safeId}`,
      date,
      week,
      members
    };
  }).filter((row) => row.date && row.members.length > 0);
});

const previewRowsWithAnchor = computed(() => {
  const limited = normalLimitedEventsAsc.value;
  return previewRows.value.map((row) => {
    const rowTime = getDateValue(row.date);
    const anchorEvent = limited.find((event) => {
      const t = getDateValue(event?.date);
      if (!t || !rowTime) return false;
      return t >= rowTime;
    }) || null;
    const anchorEventKey = anchorEvent ? `event-${normalizeEventId(anchorEvent.id)}` : '';
    return {
      ...row,
      anchorEventKey
    };
  });
});

const filteredBirthdayRows = computed(() => {
  if (hideBirthdayRows.value) return [];

  if (filterMode.value === 'event') {
    if (hasEventFilters.value) return [];
    return birthdayRows.value;
  }

  const selected = filterCriteria.value.selectedChars || [];
  return birthdayRows.value.filter((row) => {
    if (selected.length > 0 && !selected.includes(row.name)) return false;

    if (filterCriteria.value.attributes.length > 0 && !filterCriteria.value.attributes.includes(normalizeAttr(row.attribute))) return false;

    if (filterCriteria.value.skills.length > 0) return false;
    if (filterCriteria.value.units.length > 0) return false;
    if (filterCriteria.value.cardTypes.length > 0) return false;

    return true;
  });
});

const filteredPreviewRows = computed(() => {
  if (hidePreviewRows.value) return [];
  if (hasActiveFilters.value) return [];
  return previewRowsWithAnchor.value;
});

const rowTypePriority = (row) => {
  if (row.kind === 'preview') return 0;
  if (row.kind === 'birthday') return 1;
  return 2;
};

const displayRows = computed(() => {
  const events = hasActiveFilters.value
    ? filteredData.value.map((event) => ({
      kind: 'event',
      key: `event-${normalizeEventId(event?.id)}`,
      event
    }))
    : baseEventRows.value;
  const birthdays = filteredBirthdayRows.value;
  const previews = filteredPreviewRows.value;
  const merged = birthdays.length > 0 ? [...events, ...birthdays] : [...events];

  merged.sort((a, b) => {
    const ta = a.kind === 'event' ? getDateValue(a.event?.date) : getDateValue(a.date);
    const tb = b.kind === 'event' ? getDateValue(b.event?.date) : getDateValue(b.date);
    if (ta !== tb) return sortDesc.value ? tb - ta : ta - tb;

    const pa = rowTypePriority(a);
    const pb = rowTypePriority(b);
    if (pa !== pb) return pa - pb;

    if (a.kind === 'birthday' && b.kind === 'birthday') {
      const ao = BIRTHDAY_ORDER[a.name] ?? 999;
      const bo = BIRTHDAY_ORDER[b.name] ?? 999;
      if (ao !== bo) return ao - bo;
    }

    const ak = a.kind === 'event' ? normalizeEventId(a.event?.id) : a.key;
    const bk = b.kind === 'event' ? normalizeEventId(b.event?.id) : b.key;
    return ak.localeCompare(bk);
  });

  if (previews.length === 0) return merged;

  const previewBucket = new Map();
  const unAnchored = [];
  previews.forEach((row) => {
    if (!row.anchorEventKey) {
      unAnchored.push(row);
      return;
    }
    if (!previewBucket.has(row.anchorEventKey)) previewBucket.set(row.anchorEventKey, []);
    previewBucket.get(row.anchorEventKey).push(row);
  });

  previewBucket.forEach((rows) => {
    rows.sort((a, b) => {
      const ta = getDateValue(a.date);
      const tb = getDateValue(b.date);
      return sortDesc.value ? tb - ta : ta - tb;
    });
  });

  const withPreview = [];
  merged.forEach((row) => {
    if (row.kind === 'event') {
      const bucket = previewBucket.get(row.key);
      if (bucket && bucket.length > 0) withPreview.push(...bucket);
    }
    withPreview.push(row);
  });

  if (unAnchored.length > 0) {
    unAnchored.sort((a, b) => {
      const ta = getDateValue(a.date);
      const tb = getDateValue(b.date);
      return sortDesc.value ? tb - ta : ta - tb;
    });
    return sortDesc.value ? [...unAnchored, ...withPreview] : [...withPreview, ...unAnchored];
  }

  return withPreview;
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
  const current = [...(filterCriteria.value.selectedChars || [])];
  const idx = current.indexOf(name);
  if (idx >= 0) current.splice(idx, 1);
  else current.push(name);
  filterCriteria.value.selectedChars = current;
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
  if (!canUseMultiPersonRule.value) {
    eventFilterCriteria.value.multiPersonRule = 'same-event';
  }
};

const setEventMultiPersonRule = (rule) => {
  if (!canUseMultiPersonRule.value) return;
  if (!['same-event', 'same-pool'].includes(rule)) return;
  eventFilterCriteria.value.multiPersonRule = rule;
};

const toggleDetailFilterArray = (key, value) => {
  const current = [...(filterCriteria.value[key] || [])];
  const idx = current.indexOf(value);
  if (idx >= 0) current.splice(idx, 1);
  else current.push(value);
  filterCriteria.value[key] = current;
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
  if (key === 'eventTypes' && !canUseFourNoVsRule.value) {
    eventFilterCriteria.value.specialRules = (eventFilterCriteria.value.specialRules || []).filter((rule) => rule !== 'four-no-vs');
  }
};

const toggleEventSpecialRule = (ruleValue) => {
  if (!EVENT_SPECIAL_RULE_OPTIONS.some((item) => item.value === ruleValue)) return;
  if (ruleValue === 'four-no-vs' && !canUseFourNoVsRule.value) return;
  const current = [...(eventFilterCriteria.value.specialRules || [])];
  const idx = current.indexOf(ruleValue);
  if (idx >= 0) current.splice(idx, 1);
  else current.push(ruleValue);
  eventFilterCriteria.value.specialRules = current;
};

const getCardBaseName = (card) => String(card?.Name || '').trim().split(' ')[0] || '';

const isFesCard = (card) => {
  const t = String(card?.Type || '').trim().toLowerCase();
  return t === 'cfes' || t === 'bfes';
};

const isVsEventCard = (card) => {
  const baseName = getCardBaseName(card);
  return isVirtualSinger(baseName);
};

const getEventCardsForFilter = (event) => {
  const cardsInEvent = Array.isArray(event?.memberCards) ? event.memberCards.filter(Boolean) : [];
  if (cardsInEvent.length > 0) return cardsInEvent;
  const eid = normalizeEventId(event?.id);
  if (!eid) return [];
  return (props.allCards || []).filter((card) => normalizeEventId(card?.EventID) === eid);
};

const getEventNonFesCards = (event) => getEventCardsForFilter(event).filter((card) => !isFesCard(card));

const matchEventSpecialRule = (event, rule) => {
  const cards = getEventNonFesCards(event);

  if (rule === 'three-oc') {
    const fourStars = cards.filter((card) => String(card?.Rarity || '').trim() === '4');
    if (fourStars.length !== 3) return false;
    return fourStars.every((card) => !isVsEventCard(card));
  }

  if (rule === 'two-vs') {
    const vsCount = cards.filter((card) => isVsEventCard(card)).length;
    return vsCount >= 2;
  }

  if (rule === 'four-no-vs') {
    const highRarity = cards.filter((card) => {
      const rarity = String(card?.Rarity || '').trim();
      return rarity === '4' || rarity === '3';
    });
    if (!highRarity.length) return false;
    return highRarity.every((card) => !isVsEventCard(card));
  }

  return true;
};

const getEventCardNames = (event) => {
  const names = new Set();
  const fromEvent = getEventCardsForFilter(event);
  fromEvent.forEach((card) => {
    const n = String(card?.Name || '').trim().split(' ')[0];
    if (n && n !== '-' && n !== 'CardID') names.add(n);
  });

  return [...names];
};

const eventContainsCharacter = (event, name) => {
  const target = String(name || '').trim();
  if (!target) return true;
  const banner = String(event?.banner || '').trim();
  if (banner === target) return true;
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

  const typeSet = new Set();
  const eventCards = getEventCardsForFilter(event);
  eventCards.forEach((card) => {
    const t = String(card?.Type || '').trim().toLowerCase();
    if (t) typeSet.add(t);
  });

  if (gachaValue === 'perm') return gachaType === '常驻';
  if (gachaValue === 'limited') return gachaType === '普通限定';
  if (gachaValue === 'limited160') {
    return gachaType === '普通限定' && (typeSet.has('cfes') || typeSet.has('bfes'));
  }
  if (gachaValue === 'ue') return gachaType === 'UE限定';
  if (gachaValue === 'cfes') return typeSet.has('cfes');
  if (gachaValue === 'bfes') return typeSet.has('bfes');
  if (gachaValue === 'collab') return gachaType.includes('联动');
  return false;
};

const matchEventFilters = (event) => {
  const f = eventFilterCriteria.value;
  if (f.characters.length > 0) {
    const hasAllSelected = f.characters.every((name) => eventContainsCharacter(event, name));
    if (!hasAllSelected) return false;

    if (f.characters.length >= 2 && f.multiPersonRule === 'same-pool') {
      const cards = Array.isArray(event?.memberCards) ? event.memberCards : [];
      const hasAllFourStar = f.characters.every((name) => {
        const target = String(name || '').trim();
        return cards.some((card) => {
          const cardName = String(card?.Name || '').trim().split(' ')[0];
          const rarity = String(card?.Rarity || '').trim();
          return cardName === target && rarity === '4';
        });
      });
      if (!hasAllFourStar) return false;
    }
  }

  if (canUseEventBanFilter.value && f.isBan) {
    const targetChar = f.characters[0];
    const isBan = String(event?.banner || '').trim() === targetChar;
    if (f.isBan === 'yes' && !isBan) return false;
    if (f.isBan === 'no' && isBan) return false;
  }

  if (f.eventTypes.length > 0 && !f.eventTypes.some((typeValue) => matchEventTypeFilter(event, typeValue))) return false;

  if (f.specialRules.length > 0 && !f.specialRules.every((rule) => matchEventSpecialRule(event, rule))) return false;

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
const switchFilterMode = (nextMode) => {
  if (filterMode.value === nextMode) return;
  filterMode.value = nextMode;
  resetFilters();
};

const resetFilters = () => {
  filterCriteria.value = { selectedChars: [], rarities: [], attributes: [], skills: [], cardTypes: [], units: [] };
  eventFilterCriteria.value = {
    characters: [],
    multiPersonRule: 'same-event',
    isBan: null,
    eventTypes: [],
    specialRules: [],
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
  const nodes = container.querySelectorAll('.event-item, .birthday-row, .preview-row');
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
  if (!container || !anchor?.id) return false;

  const el = findRowElementInContainer(anchor.id);
  if (!el) return false;

  const containerTop = container.getBoundingClientRect().top;
  const nextTop = el.getBoundingClientRect().top - containerTop;
  container.scrollTop += (nextTop - anchor.top);
  saveHistoryScroll();
  return true;
};

const toggleVisibilityWithViewportAnchor = (targetRef) => {
  const container = historyContainer.value;
  if (!container) {
    targetRef.value = !targetRef.value;
    return;
  }

  updateViewportAnchor();
  const prevScrollTop = container.scrollTop;
  const prevScrollHeight = container.scrollHeight;
  targetRef.value = !targetRef.value;

  nextTick(() => {
    const restored = restoreViewportAnchor();
    if (!restored) {
      const delta = container.scrollHeight - prevScrollHeight;
      container.scrollTop = Math.max(0, prevScrollTop + delta);
      saveHistoryScroll();
    }
  });
};

const toggleBirthdayRowsVisibility = () => toggleVisibilityWithViewportAnchor(hideBirthdayRows);
const togglePreviewRowsVisibility = () => toggleVisibilityWithViewportAnchor(hidePreviewRows);
const toggleCollabPoolsVisibility = () => toggleVisibilityWithViewportAnchor(hideCollabPools);

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

const sanitizeExportBaseName = (name) => {
  const raw = String(name || '').trim();
  const cleaned = raw.replace(/[\\/:*?"<>|]/g, '_').replace(/[.\s]+$/g, '').trim();
  return cleaned || 'pjsk-predict-snapshot';
};

const parseEventIdFromDomId = (domId) => {
  const raw = String(domId || '').trim();
  if (!raw.startsWith('event-')) return '';
  return raw.slice(6);
};

const normalizeRangeEventId = (value) => {
  const n = Number(String(value || '').trim());
  if (!Number.isFinite(n) || n <= 0) return '';
  return String(Math.trunc(n));
};

const getExportRowsInRange = (includeBirthdayRows = true, options = {}) => {
  const listEl = listRef.value;
  if (!listEl) return { rows: [], rowsAllInRange: [], firstEventId: '', lastEventId: '', error: '历史列表尚未渲染完成。' };

  const rows = Array.from(listEl.querySelectorAll(':scope > .event-item, :scope > .birthday-row, :scope > .preview-row'));
  if (rows.length === 0) return { rows: [], rowsAllInRange: [], firstEventId: '', lastEventId: '', error: '当前历史列表为空。' };

  const predicted = rows.filter((node) => node.classList.contains('event-item') && node.classList.contains('predicted'));
  if (predicted.length === 0) return { rows: [], rowsAllInRange: [], firstEventId: '', lastEventId: '', error: '当前数据源没有已预测活动。' };

  const defaultFirstPred = predicted[0];
  const defaultLastPred = predicted[predicted.length - 1];

  let firstPred = defaultFirstPred;
  let lastPred = defaultLastPred;

  const requestedStart = normalizeRangeEventId(options?.rangeStartId);
  const requestedEnd = normalizeRangeEventId(options?.rangeEndId);

  if (requestedStart || requestedEnd) {
    if (!requestedStart || !requestedEnd) {
      return { rows: [], rowsAllInRange: [], firstEventId: '', lastEventId: '', error: '自选范围需要同时填写起始和结束活动ID。' };
    }

    const startNum = Number(requestedStart);
    const endNum = Number(requestedEnd);
    const normalizedFrom = String(Math.min(startNum, endNum));
    const normalizedTo = String(Math.max(startNum, endNum));

    const findEventNodeById = (eventId) => rows.find((node) => node.classList.contains('event-item') && parseEventIdFromDomId(node.id) === eventId);

    const startNode = findEventNodeById(normalizedFrom);
    const endNode = findEventNodeById(normalizedTo);

    if (!startNode || !endNode) {
      return { rows: [], rowsAllInRange: [], firstEventId: '', lastEventId: '', error: '自选范围中的活动ID不在当前列表中，请检查筛选条件或ID。' };
    }

    firstPred = startNode;
    lastPred = endNode;
  }

  const firstIndex = rows.indexOf(firstPred);
  const lastIndex = rows.indexOf(lastPred);
  if (firstIndex < 0 || lastIndex < 0 || lastIndex < firstIndex) {
    return { rows: [], rowsAllInRange: [], firstEventId: '', lastEventId: '', error: '预测区间定位失败，请重试。' };
  }

  const rowsAllInRange = rows.slice(firstIndex, lastIndex + 1);

  const exportRows = rowsAllInRange.filter((node) => {
    if (node.classList.contains('preview-row')) return false;
    if (!includeBirthdayRows && node.classList.contains('birthday-row')) return false;
    return true;
  });

  if (exportRows.length === 0) {
    return { rows: [], rowsAllInRange: [], firstEventId: '', lastEventId: '', error: '导出区间没有可导出的行。' };
  }

  return {
    rows: exportRows,
    rowsAllInRange,
    firstEventId: parseEventIdFromDomId(firstPred.id),
    lastEventId: parseEventIdFromDomId(lastPred.id),
    error: ''
  };
};

const getPredictedExportRangeInfo = (includeBirthdayRows = true) => {
  const { firstEventId, lastEventId, error } = getExportRowsInRange(includeBirthdayRows);
  if (error) return { ok: false, firstEventId: '', lastEventId: '', message: error };
  return { ok: true, firstEventId, lastEventId, message: '' };
};

const withTemporaryScreenshotOverrides = (rowsAllInRange, includeBirthdayRows, isMobile, runner) => {
  const hiddenNodes = [];
  const deleteButtons = [];
  const predictBadges = [];
  const limTags = [];

  rowsAllInRange.forEach((node) => {
    const isPreview = node.classList.contains('preview-row');
    const isBirthday = node.classList.contains('birthday-row');
    if (isPreview || (!includeBirthdayRows && isBirthday)) {
      hiddenNodes.push({ node, display: node.style.display });
      node.style.display = 'none';
      return;
    }

    node.querySelectorAll('.predict-delete-btn').forEach((btn) => {
      deleteButtons.push({ node: btn, visibility: btn.style.visibility });
      btn.style.visibility = 'hidden';
    });

    node.querySelectorAll('.predict-status-badge').forEach((badge) => {
      predictBadges.push({ node: badge, visibility: badge.style.visibility });
      badge.style.visibility = 'hidden';
    });

    if (!isMobile) {
      node.querySelectorAll('.lim-tag').forEach((tag) => {
      limTags.push({
        node: tag,
        clipPath: tag.style.clipPath,
        webkitClipPath: tag.style.webkitClipPath,
        mask: tag.style.mask,
        webkitMask: tag.style.webkitMask,
        transform: tag.style.transform,
        borderRadius: tag.style.borderRadius,
        width: tag.style.width,
        height: tag.style.height,
        lineHeight: tag.style.lineHeight,
        fontSize: tag.style.fontSize,
        padding: tag.style.padding,
        display: tag.style.display,
        alignItems: tag.style.alignItems,
        justifyContent: tag.style.justifyContent,
        html: tag.innerHTML,
        text: tag.style.textAlign,
        whiteSpace: tag.style.whiteSpace,
        position: tag.style.position,
        top: tag.style.top,
        right: tag.style.right,
        left: tag.style.left,
        zIndex: tag.style.zIndex
      });

      // 导出时统一成移动端的圆角标签样式，避免 PC 端切角在截图引擎上失真。
      const rawText = String(tag.textContent || '').trim() || '期间限定';
      tag.innerHTML = rawText;
      tag.style.setProperty('clip-path', 'none', 'important');
      tag.style.setProperty('-webkit-clip-path', 'none', 'important');
      tag.style.setProperty('mask', 'none', 'important');
      tag.style.setProperty('-webkit-mask', 'none', 'important');
      tag.style.display = 'inline-flex';
      tag.style.alignItems = 'center';
      tag.style.justifyContent = 'center';
      tag.style.borderRadius = '6px';
      tag.style.width = 'auto';
      tag.style.height = 'auto';
      tag.style.lineHeight = '1.1';
      tag.style.padding = '1px 6px';
      tag.style.fontSize = '9px';
      tag.style.whiteSpace = 'nowrap';
      tag.style.textAlign = 'center';
      tag.style.position = 'absolute';
      tag.style.top = '-3px';
      tag.style.left = 'calc(50% - 8px)';
      tag.style.right = 'auto';
      tag.style.transform = 'translateX(-50%)';
      tag.style.zIndex = '9';
      });
    }
  });

  const restore = () => {
    hiddenNodes.forEach(({ node, display }) => {
      node.style.display = display;
    });
    deleteButtons.forEach(({ node, visibility }) => {
      node.style.visibility = visibility;
    });
    predictBadges.forEach(({ node, visibility }) => {
      node.style.visibility = visibility;
    });
    limTags.forEach((snapshot) => {
      const { node, clipPath, webkitClipPath, mask, webkitMask } = snapshot;
      node.style.clipPath = clipPath;
      node.style.webkitClipPath = webkitClipPath;
      node.style.mask = mask;
      node.style.webkitMask = webkitMask;
      node.style.transform = snapshot.transform;
      node.style.borderRadius = snapshot.borderRadius;
      node.style.width = snapshot.width;
      node.style.height = snapshot.height;
      node.style.lineHeight = snapshot.lineHeight;
      node.style.fontSize = snapshot.fontSize;
      node.style.padding = snapshot.padding;
      node.style.display = snapshot.display;
      node.style.alignItems = snapshot.alignItems;
      node.style.justifyContent = snapshot.justifyContent;
      node.style.textAlign = snapshot.text;
      node.style.whiteSpace = snapshot.whiteSpace;
      node.style.position = snapshot.position;
      node.style.top = snapshot.top;
      node.style.right = snapshot.right;
      node.style.left = snapshot.left;
      node.style.zIndex = snapshot.zIndex;
      node.innerHTML = snapshot.html;
    });
  };

  return Promise.resolve()
    .then(runner)
    .finally(restore);
};

const getCaptureBoundsFromRows = (listEl, rows) => {
  if (!listEl || !Array.isArray(rows) || rows.length === 0) {
    return { top: 0, height: 1, width: Math.max(320, Number(listEl?.clientWidth || 0)) };
  }

  const visibleRows = rows.filter((node) => {
    const style = window.getComputedStyle(node);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
  const targetRows = visibleRows.length > 0 ? visibleRows : rows;

  const firstRect = targetRows[0].getBoundingClientRect();
  const lastRect = targetRows[targetRows.length - 1].getBoundingClientRect();
  const listRect = listEl.getBoundingClientRect();
  const top = Math.max(0, Math.floor(firstRect.top - listRect.top - 1));
  const bottom = Math.max(top + 1, Math.ceil(lastRect.bottom - listRect.top + 1));
  return {
    top,
    height: Math.max(1, bottom - top),
    width: Math.max(320, Math.ceil(listEl.clientWidth || listRect.width || 320))
  };
};

const exportPredictedRangePng = async (options = {}) => {
  const includeBirthdayRows = options?.includeBirthdayRows !== false;
  const { rows, rowsAllInRange, error } = getExportRowsInRange(includeBirthdayRows, {
    rangeStartId: options?.rangeStartId,
    rangeEndId: options?.rangeEndId
  });
  if (error) return { ok: false, message: error };

  const listEl = listRef.value;
  if (!listEl) return { ok: false, message: '历史列表尚未渲染完成。' };

  try {
    const isMobile = window.innerWidth <= 768;
    const canvas = await withTemporaryScreenshotOverrides(rowsAllInRange, includeBirthdayRows, isMobile, async () => {
      await nextTick();
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));

      const bounds = getCaptureBoundsFromRows(listEl, rows);
      const deviceScale = Number(window.devicePixelRatio || 1);
      const useExperimentalHQ = !!options?.experimentalHQ;
      const budgets = isMobile
        ? (useExperimentalHQ
          ? [13_000_000, 9_000_000, 6_800_000, 4_800_000, 3_000_000]
          : [9_000_000, 6_200_000, 4_200_000, 3_000_000])
        : [18_000_000];

      let lastErr = null;
      for (const pixelBudget of budgets) {
        const rawScale = Math.sqrt(pixelBudget / Math.max(1, bounds.width * bounds.height));
        const scale = isMobile
          ? (useExperimentalHQ
            ? Math.max(0.42, Math.min(deviceScale, rawScale, 2.0))
            : Math.max(0.38, Math.min(deviceScale, rawScale, 1.6)))
          : Math.max(0.45, Math.min(deviceScale, rawScale, 2));

        try {
          return await html2canvas(listEl, {
            backgroundColor: '#f4f7f6',
            scale,
            useCORS: true,
            logging: false,
            imageTimeout: 12000,
            x: 0,
            y: bounds.top,
            width: bounds.width,
            height: bounds.height,
            scrollX: 0,
            scrollY: 0
          });
        } catch (err) {
          lastErr = err;
        }
      }

      throw lastErr || new Error('capture failed');
    });

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const fallback = `pjsk-predict-snapshot-${y}${m}${d}`;
    const fileBaseName = sanitizeExportBaseName(options?.fileBaseName || fallback);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('toBlob failed'));
      }, 'image/png');
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileBaseName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return { ok: true, message: '预测截图导出成功。' };
  } catch (err) {
    console.error('导出预测截图失败', err);
    return { ok: false, message: '导出失败，请重试。' };
  }
};

defineExpose({
  jumpToEventById,
  getPredictedExportRangeInfo,
  exportPredictedRangePng
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
  Promise.all([
    fetch('/data/pjsk_preview.json').then((res) => (res.ok ? res.json() : [])).catch(() => [])
  ]).then(([previewRows]) => {
    previewDataRows.value = Array.isArray(previewRows) ? previewRows : [];
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
  document.addEventListener('pointerdown', handleTooltipGlobalPointerDown, true);
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
  closeInlineTooltips();
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
  document.removeEventListener('pointerdown', handleTooltipGlobalPointerDown, true);
});

onActivated(() => {
  closeInlineTooltips();
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
  document.addEventListener('pointerdown', handleTooltipGlobalPointerDown, true);
});

onBeforeUnmount(() => {
  closeInlineTooltips();
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
  document.removeEventListener('pointerdown', handleTooltipGlobalPointerDown, true);
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

const FALLBACK_UNIT_COLORS = {
  ln: '#4455DD',
  mmj: '#88DD44',
  vbs: '#EE1166',
  ws: '#FF9900',
  nc: '#884499',
  vs: '#000000'
};

const CHAR_MAP = computed(() => {
  const map = {};
  (props.allCharacters || []).forEach((char) => {
    const key = String(char?.zh_name || '').trim();
    const abbr = String(char?.en_abbr || '').trim();
    if (!key || !abbr) return;
    map[key] = abbr;
  });
  return map;
});

const CHARACTER_BIRTHDAY_MD_MAP = computed(() => {
  const map = {};
  (props.allCharacters || []).forEach((char) => {
    const name = String(char?.zh_name || '').trim();
    const month = Number(char?.birthday_month);
    const day = Number(char?.birthday_day);
    if (!name) return;
    if (!Number.isFinite(month) || !Number.isFinite(day)) return;
    if (month < 1 || month > 12 || day < 1 || day > 31) return;
    map[name] = { month: Math.trunc(month), day: Math.trunc(day) };
  });
  return map;
});

const birthdayCardImageErrorMap = ref({});

const getBirthdayCardImageSrc = (row) => {
  const cardId = parseCardIdNumber(row?.cardId);
  if (cardId === null) return '';
  const folder = CHAR_CARD_FOLDER_MAP.value[String(row?.name || '').trim()];
  if (!folder) return '';
  return `/cards/${folder}/card${cardId}.webp`;
};

const isBirthdayCardImageFailed = (row) => {
  const key = makeBirthdayInfoKey(row);
  return !!birthdayCardImageErrorMap.value[key];
};

const onBirthdayCardImageError = (event, row) => {
  markMediaImageSettled(event);
  const key = makeBirthdayInfoKey(row);
  if (!key) return;
  birthdayCardImageErrorMap.value = {
    ...birthdayCardImageErrorMap.value,
    [key]: true
  };
};

const onBirthdayCardImageLoad = (event, row) => {
  markMediaImageSettled(event);
  const key = makeBirthdayInfoKey(row);
  if (!key || !birthdayCardImageErrorMap.value[key]) return;
  const next = { ...birthdayCardImageErrorMap.value };
  delete next[key];
  birthdayCardImageErrorMap.value = next;
};

const CHAR_CARD_FOLDER_MAP = computed(() => {
  const map = {};
  (props.allCharacters || []).forEach((char) => {
    const name = String(char?.zh_name || '').trim();
    const idRaw = Number(char?.id);
    const abbr = String(char?.en_abbr || '').trim().toLowerCase();
    if (!name || !Number.isFinite(idRaw) || idRaw <= 0 || !abbr) return;
    map[name] = `${String(Math.trunc(idRaw)).padStart(3, '0')}${abbr}`;
  });
  return map;
});

const getCardTooltipBaseName = (nameRaw) => String(nameRaw || '').trim().split(/\s+/)[0] || '';

const CARD_TOOLTIP_RESERVED_TYPE_RE = /(pred|reserve|placeholder)/i;
const cardTooltipImageErrorMap = ref({});

const normalizeCardIdText = (value) => String(value || '').trim();

const parseCardIdNumber = (value) => {
  const text = normalizeCardIdText(value);
  if (!/^\d+$/.test(text)) return null;
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const isCardTooltipImageEligible = (card) => {
  const cardIdRaw = normalizeCardIdText(card?.CardID);
  if (!cardIdRaw || cardIdRaw === '-' || /^pred-/i.test(cardIdRaw)) return false;
  if (!/^\d+$/.test(cardIdRaw)) return false;

  const baseName = getCardTooltipBaseName(card?.Name);
  if (!baseName || baseName === '-' || /^pred-/i.test(baseName)) return false;

  const typeRaw = String(card?.Type || '').trim();
  if (CARD_TOOLTIP_RESERVED_TYPE_RE.test(typeRaw)) return false;

  return true;
};

const shouldIncludeCardNormalImage = (cardId) => {
  return Number(cardId) !== 1167;
};

const shouldIncludeCardTrainingImage = (card, cardId) => {
  const typeRaw = String(card?.Type || '').trim().toLowerCase();
  if (typeRaw === 'birthday') return false;
  const rarity = Number(card?.Rarity);
  if (Number.isFinite(rarity) && rarity <= 2) return false;
  if (Number(cardId) === 1167) return true;
  return true;
};

const getCardTooltipImageList = (card) => {
  if (!isCardTooltipImageEligible(card)) return [];

  const cardId = parseCardIdNumber(card?.CardID);
  if (cardId === null) return [];

  const baseName = getCardTooltipBaseName(card?.Name);
  const folder = CHAR_CARD_FOLDER_MAP.value[baseName];
  if (!folder) return [];

  const base = `/cards/${folder}/card${Math.trunc(cardId)}`;
  const list = [];
  if (shouldIncludeCardNormalImage(cardId)) {
    list.push(`${base}.webp`);
  }
  if (shouldIncludeCardTrainingImage(card, cardId)) {
    list.push(`${base}_t.webp`);
  }
  return list;
};

const getVisibleCardTooltipImageList = (card) => {
  return getCardTooltipImageList(card).filter((src) => !isCardTooltipImageFailed(card, src));
};

const makeCardTooltipImageErrorKey = (card, src) => `${normalizeCardIdText(card?.CardID)}::${String(src || '').trim()}`;

const isCardTooltipImageFailed = (card, src) => {
  const key = makeCardTooltipImageErrorKey(card, src);
  return !!cardTooltipImageErrorMap.value[key];
};

const onCardTooltipImageError = (event, card, src) => {
  const img = markMediaImageSettled(event);
  if (!img) return;

  const key = makeCardTooltipImageErrorKey(card, src || img.getAttribute('src') || '');
  if (!key.endsWith('::')) {
    cardTooltipImageErrorMap.value = {
      ...cardTooltipImageErrorMap.value,
      [key]: true
    };
  }
};

const CHAR_SINGLE_MAP = computed(() => {
  const map = {};
  (props.allCharacters || []).forEach((char) => {
    const key = String(char?.zh_name || '').trim();
    const mark = String(char?.single_mark || '').trim();
    if (!key || !mark) return;
    map[key] = mark;
  });
  return map;
});

const CHAR_COLORS = computed(() => {
  const map = {};
  (props.allCharacters || []).forEach((char) => {
    const key = String(char?.zh_name || '').trim();
    const color = String(char?.color || '').trim();
    if (!key || !color) return;
    map[key] = color;
  });
  return map;
});

const UNIT_COLORS = computed(() => {
  const map = { ...FALLBACK_UNIT_COLORS };
  (props.allCharacters || []).forEach((char) => {
    const unit = String(char?.unit || '').trim().toLowerCase();
    const color = String(char?.unit_color || '').trim();
    if (!unit || !color) return;
    map[unit] = color;
  });
  return map;
});

const VS_NAMES = computed(() => {
  return (props.allCharacters || [])
    .filter((char) => String(char?.unit || '').trim().toLowerCase() === 'vs')
    .map((char) => String(char?.zh_name || '').trim())
    .filter(Boolean);
});

// 转换函数
const translateType = (t) => {
  const map = { perm: '常驻', limited: '普通限定', collab: '联动限定', collab_t: '联动限定', cfes: 'CFES', bfes: 'BFES', movie: '剧场版限定', wl1: 'WL1', wl2: 'WL2', wl3: 'WL3' };
  return map[t?.toLowerCase()] || t;
};
const translateSkill = (s) => {
  const map = { score_up: '普分', accuracy: '判卡', recovery: '奶卡', p_score: 'P分', unit_score: '团分', cfes_l: 'CFES血分', cfes_j: 'CFES判分', bfes_up: 'BFES' };
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
    const abbr = CHAR_MAP.value[mainName]; // 从映射表获取基础缩写，如 MIKU, RIN
    if (!abbr) return mainName.toUpperCase();
    if (unitSuffix && unitSuffix !== 'vs') {    // 如果有团队后缀，且后缀不是 'vs'
      return `${abbr.toLowerCase()}_${unitSuffix}`;      // 返回通用格式：缩写小写_团队名（如 miku_ln）
    }
    return abbr;    // 没有后缀或属于 vs 团队，返回原始大写缩写（如 MIKU）
  }
  // 非虚拟歌手角色，直接按全名查找映射
  return CHAR_MAP.value[name] || name.toUpperCase() || name.toLowerCase();
};
//const getUnitColor = (unit) => UNIT_COLORS[unit?.toLowerCase()] || '#999999';
const getUnitColor = (unit) => {
  if (!unit) return 'transparent'; // 如果 unit 为空，返回透明或默认背景色
  return UNIT_COLORS.value[String(unit).toLowerCase()] || '#999999';
};
//const getCharColor = (name) => CHAR_COLORS[name] || '#999999';
// 修改后的获取颜色逻辑
const getCharColor = (name) => {
  if (!name) return '#999999';
  // 提取真正的角色名：取空格前的部分（例如从 "初音未来 LN" 中提取 "初音未来"）
  const realName = name.split(' ')[0];   
  return CHAR_COLORS.value[realName] || CHAR_COLORS.value[name] || '#999999';
};

const isVirtualSinger = (name) => VS_NAMES.value.includes(String(name || '').trim());
//const isUnitRelated = (ev) => ['箱活','World Link'].includes(ev.event_type);
const isUnitRelated = (ev) => {
  const isTypeMatch = ['箱活', 'WL', 'World Link'].includes(ev.event_type);
  return isTypeMatch && !!ev.unit; // !!ev.unit 确保 unit 不为空字符串或 null
};
const isSpecialFestival = (fest) => ['新年', '半周年', '情人节', '白情', '周年', '婚活'].includes(fest);

const getNormalCards = (cards) => {
  const source = Array.isArray(cards) ? cards : [];
  const rank = (card) => {
    const rarity = Number(String(card?.Rarity || '').trim());
    if (rarity === 4) return 0;
    if (rarity === 3) return 1;
    if (rarity === 2) return 2;
    return 9;
  };

  return source
    .filter(c => !isFesCardType(c?.Type))
    .map((card, idx) => ({ card, idx }))
    .sort((a, b) => {
      const ar = rank(a.card);
      const br = rank(b.card);
      if (ar !== br) return ar - br;
      return a.idx - b.idx;
    })
    .map((item) => item.card);
};
  const getFesCards = (cards) => cards.filter(c => isFesCardType(c?.Type));
  const getFesType = (cards) => cards.find(c => isFesCardType(c?.Type))?.Type?.toLowerCase() || 'cfes';

const getTypeTagStyle = (ev) => {
  if (isUnitRelated(ev)) return { backgroundColor: getUnitColor(ev.unit) };
  return { background: 'linear-gradient(45deg, #FD7CC1 0%, #87C0FF 50%, #F8FF87 100%)', color: '#FFFFFF', fontWeight: 'bold' };
};

const formatSeries = (ev) => {
  if (!ev.type_series_id) return '';
  if (ev.event_type === '箱活') return `${ev.banner.split(' ')[0]} ${ev.type_series_id}箱`;
  if (ev.event_type === '混活') return `${ev.banner.split(' ')[0]} ${ev.type_series_id}混`;
  if (ev.event_type === 'World Link') return `${ev.unit} WL${ev.type_series_id}${getWl3PartSuffix(ev)}`;
  return ev.type_series_id;
};

const getSingleCharLabel = (name) => {
  const raw = String(name || '').trim();
  if (!raw) return '';
  const main = raw.split(' ')[0] || raw;
  return CHAR_SINGLE_MAP.value[main] || main.slice(0, 1);
};

const isWl3Event = (ev) => {
  const t = String(ev?.event_type || '').trim();
  if (t !== 'World Link') return false;
  const cards = Array.isArray(ev?.memberCards) ? ev.memberCards : [];
  return cards.some((card) => String(card?.Type || '').trim().toLowerCase() === 'wl3');
};

const getWl3PartSuffix = (ev) => {
  if (!isWl3Event(ev)) return '';
  const currentId = Number(ev?.id);
  if (!Number.isFinite(currentId)) return '';

  const wl3Ids = (props.allEvents || [])
    .filter((item) => {
      if (!isNumericEventId(item?.id)) return false;
      if (String(item?.event_type || '').trim() !== 'World Link') return false;
      const ts = Number(String(item?.type_series_id || '').trim());
      return Number.isFinite(ts) && ts === 3;
    })
    .map((item) => Number(item.id))
    .sort((a, b) => a - b);

  const idx = wl3Ids.indexOf(currentId);
  if (idx < 0) return '';
  return ` P${idx + 1}`;
};

const formatSeriesCompact = (ev) => {
  if (!ev?.type_series_id) return '';
  const sid = String(ev.type_series_id).trim();
  if (!sid) return '';
  if (ev.event_type === '箱活') return `${getSingleCharLabel(ev.banner)}${sid}箱`;
  if (ev.event_type === '混活') return `${getSingleCharLabel(ev.banner)}${sid}混`;
  if (ev.event_type === 'World Link') return `${String(ev.unit || '').toUpperCase()} WL${sid}${getWl3PartSuffix(ev)}`;
  return sid;
};

const getEditorSeriesStyle = (ev) => {
  if (!ev) return {};
  const eventType = String(ev.event_type || '').trim();
  if (eventType === '混活' || isWl3Event(ev)) {
    return {
      background: 'linear-gradient(45deg, #FD7CC1 0%, #87C0FF 50%, #F8FF87 100%)',
      borderColor: 'transparent',
      color: '#ffffff',
      fontWeight: '700'
    };
  }

  if (eventType === '箱活' || (eventType === 'World Link' && !isWl3Event(ev))) {
    const base = getUnitColor(ev.unit);
    return {
      backgroundColor: base,
      borderColor: base,
      color: '#ffffff',
      fontWeight: '700'
    };
  }

  return {};
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
  --editor-drawer-width: clamp(320px, 30vw, 380px);
  --preview-config-top: 16px;
  --eh-radius-card: 16px;
  --eh-radius-panel: 16px;
  --eh-radius-btn: 12px;
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
  gap: 4px;
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
  filter: grayscale(1) saturate(0.2) opacity(0.7);
}

.preview-char-chip.is-active .preview-char-chip-avatar {
  filter: none;
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

.preview-title {
  font-size: 0.86rem;
  font-weight: 700;
}

.preview-head-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 6px;
  font-size: 0.68rem;
  color: #475569;
  user-select: none;
}

.preview-head-toggle input {
  width: 12px;
  height: 12px;
}

.preview-head-filters {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 6px;
}

.preview-head-filter-toggle {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.66rem;
  color: #334155;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  padding: 1px 6px;
  background: #f8fafc;
}

.preview-head-filter-toggle input {
  width: 11px;
  height: 11px;
}

.preview-head-filter-btn {
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
  font-size: 0.66rem;
  line-height: 1;
  padding: 3px 8px;
  cursor: pointer;
}

.preview-head-filter-btn:hover {
  background: #e2e8f0;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 0.72rem;
  color: #334155;
  font-weight: 700;
  margin-bottom: 2px;
}

.preview-festival-inline-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.68rem;
  font-weight: 600;
  color: #0f766e;
  white-space: nowrap;
}

.preview-festival-inline-toggle input {
  width: 12px;
  height: 12px;
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

.preview-daily-card {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.88);
  padding: 6px;
  box-sizing: border-box;
}

.preview-daily-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.preview-daily-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
}

.preview-daily-name {
  font-size: 0.74rem;
  font-weight: 700;
  color: #1f2937;
}

.preview-daily-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 2px;
  table-layout: fixed;
}

.preview-daily-plan-row td {
  background: var(--daily-row-bg, rgba(148, 163, 184, 0.16));
}

.preview-daily-attr-cell {
  width: 14px;
  text-align: center;
  padding: 1px 1px;
  border: 1px solid var(--lineup-row-border, rgba(148, 163, 184, 0.52));
  border-radius: 6px;
}

.preview-daily-attr {
  width: 13px;
  height: 13px;
  object-fit: contain;
}

.preview-daily-score-cell {
  width: 1.55em;
  height: 1.45em;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 4px;
  font-size: 0.60rem;
  line-height: 1;
  color: #1f2937;
  text-align: center;
  padding: 0;
}

.preview-daily-score-cell.is-empty {
  color: #94a3b8;
}

.preview-daily-score-cell.is-bfes {
  border-color: #4c1d95;
  box-shadow: inset 0 0 0 1px rgba(76, 29, 149, 0.28);
}

.preview-daily-score-cell.is-cfes {
  border-color: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.25);
}

.preview-daily-total-cell {
  width: 1.52em;
  font-size: 0.63rem;
  font-weight: 700;
  color: #0f172a;
  text-align: center;
  padding: 0 1px;
  border: 1px solid var(--lineup-row-border, rgba(148, 163, 184, 0.52));
  border-radius: 6px;
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
  touch-action: pan-y pinch-zoom;
  overscroll-behavior-x: contain;
}

.event-history > h1 {
  display: none;
}

button:not(:disabled) {
  transition: filter 0.16s ease, transform 0.16s ease, background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

button:not(:disabled):active {
  filter: brightness(0.86);
  transform: translateY(1px) scale(0.97);
}

/* 如果你希望编辑器是覆盖式的（Overlapping），则维持 position: fixed 
   但给左侧列表增加 marginRight */
@media (min-width: 1001px) {
  .event-history-wrapper.with-editor .event-history {
    margin-right: var(--editor-drawer-width); /* 强制拉开距离，绝不重叠 */
  }
}

.filter-sticky {
  position: sticky;
  top: 0;
  z-index: 1500;
  background: #f4f7f6;
  overflow: visible;
  isolation: isolate;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  border-radius: 999px;
  border: 1px solid #ddd;
  background: #fff;
  transition: 0.2s;
  white-space: nowrap;
  min-height: 32px;
  line-height: 1;
}

.nav-btn.is-icon-only {
  width: 36px;
  padding: 0;
  border-radius: 999px;
  aspect-ratio: 1 / 1;
}


.filter-bar { margin-bottom: 0; }
.sort-btn {
  padding: 8px 16px;
  cursor: pointer;
  border-radius: 999px;
  border: 1px solid #ddd;
  background: #fff;
  flex: 0 0 auto;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  line-height: 1;
}

.current-btn {
  min-width: 58px;
  font-weight: 700;
}

.compact-btn-icon {
  width: 17px;
  height: 17px;
  object-fit: contain;
  flex: 0 0 17px;
  display: block;
  filter: var(--history-icon-filter, none);
}

/* Optional PNG tinting for highlighted filter buttons. */
.nav-btn.active-highlight .compact-btn-icon {
  --history-icon-filter: brightness(0) saturate(100%) invert(43%) sepia(58%) saturate(900%) hue-rotate(130deg) brightness(95%) contrast(90%);
}

.nav-btn.active-highlight .compact-btn-icon.birthday-toggle-icon {
  --history-icon-filter: none;
}

.compact-filter-count {
  margin-left: 3px;
  min-width: 20px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.12);
  border: 1px solid rgba(15, 118, 110, 0.35);
  color: #0f766e;
  font-size: 0.66rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.birthday-inline-icon {
  margin-right: 4px;
}

.clear-btn {
  flex: 0 0 auto;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.history-list { display: flex; flex-direction: column; gap: 12px; padding-bottom: 16px; 
  margin-top: 20px;
  position: relative;
}

.event-item {
  scroll-margin-top: 80px; /* 对应 .sticky-filter 的高度 */
  position: relative; /* 必须为 relative 以便伪元素定位 */
  z-index: 1;
  display: flex; align-items: center; padding: 12px 20px; border-radius: var(--eh-radius-card);
  background: var(--bg-color); box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: all 0.2s; border-left: 6px solid transparent;
  box-sizing: border-box;
}
.event-item:hover { z-index: 900; transform: translateX(5px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

.birthday-row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 42px;
  border-radius: var(--eh-radius-panel);
  padding: 6px 14px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  cursor: pointer;
  position: relative;
  transition: filter 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
  box-sizing: border-box;
}

.birthday-row:active {
  filter: brightness(0.92);
  transform: translateY(1px);
}

.birthday-row.is-open {
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
  border-color: rgba(14, 116, 144, 0.38);
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

.birthday-info-popover {
  position: absolute;
  left: 10px;
  top: calc(100% + 8px);
  z-index: 1400;
  min-width: 220px;
  max-width: min(320px, calc(100vw - 30px));
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.98), rgba(241, 245, 249, 0.95));
  box-shadow: 0 14px 26px rgba(15, 23, 42, 0.2);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
}

.birthday-info-card {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  background: rgba(241, 245, 249, 0.9);
  object-fit: contain;
  object-position: center;
  flex: 0 0 auto;
}

.media-load-shimmer:not([data-loaded='1']) {
  background-image: linear-gradient(110deg, #d1d5db 8%, #f3f4f6 18%, #d1d5db 33%);
  background-size: 220% 100%;
  animation: media-shimmer 1.05s linear infinite;
}

@keyframes media-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -40% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .media-load-shimmer:not([data-loaded='1']) {
    animation: none;
    background-image: none;
    background-color: #d1d5db;
  }
}

.birthday-info-content {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.birthday-info-title {
  font-size: 0.84rem;
  color: #0f172a;
  font-weight: 800;
  line-height: 1.2;
}

.birthday-info-meta {
  font-size: 0.72rem;
  color: #475569;
  line-height: 1.2;
  word-break: break-word;
}

.preview-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  border-radius: 12px;
  padding: 6px 14px;
  border: 1px dashed rgba(15, 23, 42, 0.16);
  background: rgba(15, 23, 42, 0.03);
  box-sizing: border-box;
}

.preview-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 66px;
  border-radius: 999px;
  padding: 2px 8px;
  background: rgba(15, 23, 42, 0.12);
  color: #111827;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
}

.preview-date {
  font-size: 0.76rem;
  color: #4b5563;
  white-space: nowrap;
}

.preview-members {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  margin-left: 0;
  min-width: 0;
  gap: 9px;
  flex-wrap: nowrap;
}

.preview-member-avatar {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  object-fit: cover;
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
  z-index: 950;
  transform: translateX(10px);
  box-shadow: 0 4px 20px rgba(51, 204, 187, 0.3);
  /* 确保这里不设置 border，否则会挤压内部布局 */
  border: none; 
}

.event-item.is-tooltip-raised {
  z-index: 1700;
}

/* 仅在角色详情悬浮框触发时抬高该活动卡，使 tooltip 可压过筛选栏。 */
.event-item:has(.avatar-container:hover),
.event-item:has(.avatar-container:focus-within),
.event-item:has(.avatar-container.is-open),
.event-item:has(.song-tooltip:hover),
.event-item:has(.song-tooltip:focus-within),
.event-item:has(.song-tooltip.is-open) {
  z-index: 1700;
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
  border-radius: var(--eh-radius-panel);
  position: relative;
  z-index: 1510;
  padding: 15px;
  margin-top: -6px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.filter-mode-row {
  align-items: center;
}

.filter-mode-row .row-label {
  align-self: center;
  padding-top: 0;
}

.filter-mode-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  min-height: 30px;
  padding: 0 11px;
  font-size: 0.76rem;
  font-weight: 400;
  line-height: 1;
  box-sizing: border-box;
}

.filter-mode-row .btn-group {
  align-items: center;
}

.filter-mode-row .btn-group > .filter-mode-btn {
  height: 30px;
  min-height: 30px;
  padding: 0 11px;
  font-size: 0.76rem;
  font-weight: 400;
  line-height: 1;
}

.filter-mode-row .panel-reset-btn {
  margin-left: 0;
  padding: 0 11px;
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

.filter-mode-hit-count {
  margin-left: auto;
  font-size: 0.78rem;
  color: #0f766e;
  background: #ecfeff;
  border: 1px solid #99f6e4;
  border-radius: 999px;
  padding: 2px 8px;
  line-height: 1.4;
  white-space: nowrap;
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
  border-radius: 999px;
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
  width: 38px;
  height: 38px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: 0.2s;
}
.char-chip.is-selected {
  background: rgba(51, 204, 187, 0.14);
  border-color: #33ccbb;
}
.chip-img {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
  filter: grayscale(1) opacity(0.45);
  transition: filter 0.2s ease, transform 0.2s ease;
}

.char-chip.is-selected .chip-img {
  filter: grayscale(0) opacity(1);
  transform: scale(1.04);
}

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
  border-radius: 999px;
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
  border-radius: 999px;
  cursor: pointer;
}

.panel-reset-btn {
  margin-left: 2px;
  padding: 0 10px;
  font-size: inherit;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 999px;
}

.sort-btn:hover,
.nav-btn:hover,
.btn-group button:hover,
.btn-group-sm button:hover,
.panel-reset-btn:hover {
  background: #e5e7eb;
}

.btn-group button.active:hover,
.btn-group-sm button.active:hover,
.nav-btn.active-highlight:hover {
  background: #33ccbb;
}

.clear-btn:hover {
  filter: brightness(0.92);
}

.panel-reset-btn.is-ready {
  background: #ef4444;
  color: #fff;
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.18);
}

.panel-reset-btn:disabled {
  opacity: 1;
  background: #f3f4f6;
  color: #9ca3af;
  border-color: #e5e7eb;
  box-shadow: none;
  cursor: not-allowed;
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

.editor-series-chip {
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 18px;
  padding: 1px 7px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #f1f5f9;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
}

.event-history-wrapper.with-editor .banner-section {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}

/* 3. 标题 */
.event-main-content { width: 160px; padding: 0 5px; }
.event-title { font-weight: bold; font-size: 1rem; color: #333; line-height: 1.3; }
.type-indicator { margin-top: 5px; display: flex; align-items: center; gap: 8px; min-width: 0; flex-wrap: nowrap; }
.type-tag { font-size: 0.7rem; padding: 2px 8px; border-radius: 10px; color: white; white-space: nowrap; flex: 0 0 auto; }
.series-text { white-space: nowrap; overflow: visible; text-overflow: clip; min-width: 0; flex: 1 1 auto; }

/* 4. 角色卡片展示逻辑 */
.event-members { flex: 1; display: flex; flex-direction: column; gap: 10px; padding: 0 15px; border-left: 1px solid transparent; }
.event-history-wrapper.with-editor .event-members { border-left-color: #d6dde8; }
.member-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.fes-row { padding-top: 8px; border-top: 1px dashed #eee; }
.fes-type-icon { height: 70px; margin-right: 5px; }
.card-attr-icon { position: absolute; top: -5px; right: -5px; width: 22px; height: 22px; z-index: 3; }

.avatar-container { 
  position: relative; width: 80px; height: 80px; 
  border-radius: 50%; border: 3px solid #eee; padding: 1px;
  cursor: pointer;
  transition: filter 0.18s ease, transform 0.18s ease;
}

.avatar-container:active {
  filter: brightness(0.9);
  transform: scale(0.97);
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
  
  /* 回退到手工形状：显示稳定，导出逻辑也更一致。 */
  clip-path: polygon(21% 28%, 78% 30%, 93% 90%, 5.5% 80%); 
  
  z-index: 2;
  white-space: nowrap;
  pointer-events: none;
}


/* 角色卡片详情悬浮 */
.card-detail-tooltip {
  --card-tooltip-thumb-size: 64px;
  --card-tooltip-thumb-gap: 2px;
  visibility: hidden;
  position: absolute;
  left: 50%;
  bottom: calc(100% + 12px);
  width: fit-content;
  max-width: min(92vw, 360px);
  transform: translate(calc(-50% + var(--card-tooltip-shift-x, 0px)), calc(8px + var(--card-tooltip-shift-y, 0px)));
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.98), rgba(241, 245, 249, 0.95));
  color: #0f172a;
  padding: 6px 10px;
  z-index: 20000;
  pointer-events: auto;
  opacity: 0;
  transition: opacity 0.16s ease;
  text-align: left;
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.28);
}

.avatar-container.is-open .card-detail-tooltip {
  visibility: visible;
  opacity: 1;
  transform: translate(calc(-50% + var(--card-tooltip-shift-x, 0px)), var(--card-tooltip-shift-y, 0px));
}

.card-tooltip-hero {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
  width: fit-content;
  max-width: 100%;
}

.card-tooltip-hero.is-text-only {
  display: block;
}

.card-tooltip-media {
  width: var(--card-tooltip-thumb-size);
  display: grid;
  grid-template-columns: var(--card-tooltip-thumb-size);
  justify-content: center;
  gap: var(--card-tooltip-thumb-gap);
  flex: 0 0 auto;
}

.card-tooltip-media.is-dual {
  width: calc(var(--card-tooltip-thumb-size) * 2 + var(--card-tooltip-thumb-gap));
  grid-template-columns: repeat(2, var(--card-tooltip-thumb-size));
}

.card-tooltip-jacket-item {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(148, 163, 184, 0.18);
  position: relative;
}

.card-tooltip-jacket {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  background: transparent;
  display: block;
}

.card-tooltip-jacket-fallback {
  display: none;
  position: absolute;
  inset: 0;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.62rem;
  color: #334155;
  padding: 6px;
}

.card-tooltip-jacket-item.is-failed .card-tooltip-jacket {
  display: none;
}

.card-tooltip-jacket-item.is-failed .card-tooltip-jacket-fallback {
  display: flex;
}

.card-tooltip-grid {
  min-width: 0;
  display: grid;
  gap: 4px;
  flex: 0 0 auto;
  width: fit-content;
  align-self: center;
}

.card-tooltip-row {
  margin: 0;
  display: grid;
  grid-template-columns: 36px max-content;
  align-items: center;
  gap: 4px;
}

.card-tooltip-label {
  color: #64748b;
  font-size: 0.64rem;
  font-weight: 700;
  white-space: nowrap;
}

.card-tooltip-value {
  color: #0f172a;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.15;
  min-width: max-content;
  white-space: nowrap;
  word-break: keep-all;
  overflow-wrap: normal;
}

.stars-overlay {
  position: absolute; bottom: -1px; left: -2px; display: flex; gap: 0px;
}
.star-icon { width: 11px; height: 11px; }

/* 5. VS & 音乐 */
.vs-section {
  width: 116px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
.vs-top-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.vs-list { display: flex; gap: 2px; justify-content: flex-end; }
.vs-avatar { width: 45px; height: 45px; border-radius: 50%; border: 1px solid #ddd; }
.song-tooltip {
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
}
.song-tooltip .info-icon {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.18);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(226, 232, 240, 0.9));
  padding: 0;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.16);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
}
.song-mv-grid {
  width: auto;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.song-mv-pill {
  width: 52px;
  height: 26px;
  padding: 0;
  border-radius: 999px;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16.5px;
  font-weight: 500;
  line-height: 1;
  isolation: isolate;
}
.song-mv-pill.is-3d {
  background: linear-gradient(0deg, rgba(255, 187, 204, 0.88), rgba(255, 187, 204, 0.88)), #ffffff;
  border-color: #ea086a;
  color: #000000;
}
.song-mv-pill.is-2d {
  background: linear-gradient(0deg, rgba(51, 204, 187, 0.88), rgba(51, 204, 187, 0.88)), #ffffff;
  border-color: #0f766e;
  color: #ffffff;
}
.song-mv-pill.is-empty {
  visibility: hidden;
}
.tooltip-content {
  visibility: hidden;
  position: absolute;
  right: 0;
  bottom: calc(100% + 10px);
  width: min(320px, 78vw);
  max-width: 320px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.98), rgba(241, 245, 249, 0.95));
  color: #0f172a;
  padding: 8px;
  z-index: 20000;
  font-size: 0.8rem;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.22s ease, transform 0.22s ease;
  pointer-events: auto;
  white-space: normal;
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.26);
}

.song-tooltip.is-open .tooltip-content {
  visibility: visible;
  opacity: 1;
  transform: translateY(0);
}

@media (hover: hover) and (pointer: fine) {
  .avatar-container:hover .card-detail-tooltip {
    visibility: visible;
    opacity: 1;
    transform: translate(calc(-50% + var(--card-tooltip-shift-x, 0px)), var(--card-tooltip-shift-y, 0px));
  }

  .song-tooltip:hover .tooltip-content {
    visibility: visible;
    opacity: 1;
    transform: translateY(0);
  }
}

.song-tooltip-hero {
  display: grid;
  grid-template-columns: 116px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.song-tooltip-jacket-wrap {
  width: 116px;
  height: 116px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(148, 163, 184, 0.18);
  position: relative;
}

.song-tooltip-jacket {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}

.song-tooltip-jacket-fallback {
  display: none;
  position: absolute;
  inset: 0;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.62rem;
  color: #334155;
  padding: 6px;
}

.song-tooltip-jacket-wrap.is-failed .song-tooltip-jacket {
  display: none;
}

.song-tooltip-jacket-wrap.is-failed .song-tooltip-jacket-fallback {
  display: flex;
}

.song-tooltip-grid {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.song-tooltip-row {
  margin: 0;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  align-items: center;
  gap: 6px;
}

.song-tooltip-label {
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 700;
}

.song-tooltip-value {
  color: #0f172a;
  font-size: 0.74rem;
  font-weight: 700;
  line-height: 1.2;
  min-width: 0;
  word-break: break-word;
}

.attr-icon-inline {
  width: 32px;
  height: 32px;
}

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

  .event-item { flex-wrap: wrap; }
  .event-members { width: 100%; border-left: none; border-top: 1px solid transparent; padding: 10px 0; }
  .event-history-wrapper.with-editor .event-members { border-top-color: #d6dde8; }
}

@media (min-width: 901px) and (max-width: 1100px) {
  .filter-bar {
    padding: 9px 4px;
    gap: 8px;
  }

  .filter-bar .sort-btn,
  .filter-bar .nav-btn,
  .filter-bar .clear-btn {
    height: 33px;
    min-height: 33px;
    padding: 0 10px;
    font-size: 0.79rem;
  }

  .filter-bar .nav-btn.is-icon-only {
    width: 33px;
    min-width: 33px;
    height: 33px;
    min-height: 33px;
    padding: 0;
  }

  .filter-bar .nav-btn.compact-tip.has-count {
    min-width: 58px;
    height: 33px;
    min-height: 33px;
    padding: 0 9px;
  }

  .sort-btn {
    min-width: 94px;
  }

  .current-btn {
    min-width: 60px;
  }

  .compact-btn-icon {
    width: 16px;
    height: 16px;
  }
}

@media (min-width: 1001px) and (max-width: 1366px) and (pointer: coarse) {
  .filter-panel .chip-group {
    flex-wrap: nowrap;
    gap: 4px;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 2px;
  }

  .filter-panel .char-chip {
    width: 36px;
    height: 36px;
    flex: 0 0 auto;
  }

  .filter-panel .chip-img {
    width: 100%;
    height: 100%;
  }

  .filter-bar {
    padding: 10px 4px;
    gap: 8px;
  }

  .filter-bar .sort-btn,
  .filter-bar .nav-btn,
  .filter-bar .clear-btn {
    height: 34px;
    min-height: 34px;
    padding: 0 10px;
    font-size: 0.8rem;
  }

  .filter-bar .nav-btn.is-icon-only {
    width: 34px;
    min-width: 34px;
    height: 34px;
    min-height: 34px;
    padding: 0;
  }

  .filter-bar .nav-btn.compact-tip.has-count {
    min-width: 60px;
    height: 34px;
    min-height: 34px;
    padding: 0 10px;
  }

  .sort-btn {
    min-width: 96px;
  }

  .current-btn {
    min-width: 62px;
  }
}

@media (max-width: 900px) {
  .event-history-wrapper.with-editor .event-history {
    margin-right: 0;
  }

  .event-history-wrapper {
    --preview-config-top: calc(env(safe-area-inset-top) + 62px);
  }

  .event-history > h1 {
    display: none;
  }

  .filter-bar {
    padding: 4px 2px;
    gap: 3px;
    margin-bottom: 4px;
  }

  .filter-bar .sort-btn,
  .filter-bar .nav-btn,
  .filter-bar .clear-btn {
    min-width: 0;
    height: 31px;
    min-height: 31px;
    padding: 0 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.74rem;
    line-height: 1;
    white-space: nowrap;
  }

  .filter-bar .nav-btn.is-icon-only {
    width: 31px;
    min-width: 31px;
    height: 31px;
    min-height: 31px;
    padding: 0;
    border-radius: 999px;
    aspect-ratio: 1 / 1;
    box-sizing: border-box;
  }

  .filter-bar .nav-btn.compact-tip.has-count {
    width: auto;
    min-width: 56px;
    height: 31px;
    min-height: 31px;
    padding: 0 8px;
    gap: 4px;
    border-radius: 999px;
    aspect-ratio: auto;
    box-sizing: border-box;
  }

  .sort-btn {
    min-width: 86px;
  }

  .current-btn {
    min-width: 58px;
  }

  .compact-btn-icon {
    width: 15px;
    height: 15px;
  }

  .compact-filter-count {
    min-width: 22px;
    height: 20px;
    padding: 0 6px;
    font-size: 0.68rem;
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

@media (min-width: 769px) and (max-width: 900px) {
  .filter-mode-btn {
    height: 29px;
    min-height: 29px;
    font-size: 0.74rem;
    padding: 0 9px;
  }

  .filter-mode-row .panel-reset-btn {
    padding: 0 9px;
  }

  .filter-mode-row .btn-group {
    gap: 5px;
  }

  .filter-bar {
    padding: 7px 3px;
    gap: 6px;
    margin-bottom: 6px;
  }

  .filter-bar .sort-btn,
  .filter-bar .nav-btn,
  .filter-bar .clear-btn {
    height: 32px;
    min-height: 32px;
    padding: 0 9px;
    font-size: 0.76rem;
  }

  .filter-bar .nav-btn.is-icon-only {
    width: 32px;
    min-width: 32px;
    height: 32px;
    min-height: 32px;
  }

  .filter-bar .nav-btn.compact-tip.has-count {
    min-width: 56px;
    height: 32px;
    min-height: 32px;
    padding: 0 8px;
  }

  .sort-btn {
    min-width: 90px;
  }

  .current-btn {
    min-width: 60px;
  }

  .compact-btn-icon {
    width: 15px;
    height: 15px;
  }

  .compact-filter-count {
    min-width: 21px;
    height: 20px;
    padding: 0 6px;
    font-size: 0.67rem;
  }

  .fes-row {
    justify-content: center;
    gap: 12px;
  }

  .fes-type-icon {
    height: 54px;
    margin-right: 6px;
    align-self: center;
  }
}

@media (max-width: 900px) {
  .filter-bar .sort-btn,
  .filter-bar .nav-btn,
  .filter-bar .clear-btn {
    height: 30px;
    min-height: 30px;
    padding: 0 6px;
    font-size: 0.72rem;
  }

  .filter-bar .nav-btn.is-icon-only {
    width: 30px;
    min-width: 30px;
    height: 30px;
    min-height: 30px;
    padding: 0;
    border-radius: 999px;
    aspect-ratio: 1 / 1;
    box-sizing: border-box;
  }

  .filter-bar .nav-btn.compact-tip.has-count {
    width: auto;
    min-width: 52px;
    height: 30px;
    min-height: 30px;
    padding: 0 8px;
    gap: 3px;
    border-radius: 999px;
    aspect-ratio: auto;
    box-sizing: border-box;
  }

  .current-btn {
    min-width: 56px;
  }

  .compact-btn-icon {
    width: 14px;
    height: 14px;
  }

  .compact-filter-count {
    min-width: 20px;
    height: 19px;
    padding: 0 5px;
    font-size: 0.66rem;
  }

  .event-history {
    --member-avatar-size: clamp(62px, 10.2vw, 54px);
  }

  .event-history {
    padding: 0 10px 10px;
  }

  .history-list {
    gap: 8px;
    margin-top: 10px;
  }

  .filter-panel {
    max-height: none;
    overflow: visible;
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

  .filter-mode-hit-count {
    font-size: 0.68rem;
    padding: 2px 6px;
  }

  .preview-char-chip {
    width: 26px;
    height: 26px;
  }

  .btn-group,
  .btn-group-sm {
    gap: 6px;
  }

  .btn-group button,
  .btn-group-sm button {
    font-size: 0.74rem;
    padding: 3px 8px;
    border-radius: 999px;
  }

  .filter-mode-btn {
    height: 28px;
    min-height: 28px;
    font-size: 0.72rem;
    padding: 0 8px;
  }

  .filter-mode-row .panel-reset-btn {
    padding: 0 8px;
  }

  .filter-mode-row .btn-group {
    gap: 4px;
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
    grid-template-columns: 44px 52px minmax(0, 1fr) auto;
    grid-template-areas:
      "basic banner main vs"
      "members members members members";
    align-items: center;
    column-gap: 8px;
    row-gap: 8px;
    padding: 10px;
  }

  .preview-row {
    gap: 8px;
    min-height: 38px;
    padding: 4px 8px;
  }

  .preview-label {
    min-width: 54px;
    font-size: 0.66rem;
    padding: 1px 6px;
  }

  .preview-date {
    font-size: 0.68rem;
  }

  .preview-members {
    justify-content: flex-start;
    margin-left: 8px;
    gap: 7px;
  }

  .preview-member-avatar {
    width: 48px;
    height: 48px;
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
    width: 42px;
    height: 42px;
    border-width: 2px;
  }

  .unit-logo-banner {
    width: 48px;
    height: 48px;
  }

  .banner-tag {
    right: -6px;
    bottom: 4px;
    font-size: 6px;
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

  .vs-top-row {
    gap: 4px;
  }

  .vs-avatar {
    width: 26px;
    height: 26px;
  }

  .song-tooltip .info-icon {
    width: 20px;
    height: 20px;
    font-size: 12px;
  }

  .birthday-info-popover {
    left: 0;
    right: 0;
    max-width: 100%;
  }

  .song-mv-pill {
    width: 33px;
    height: 20px;
    font-size: 12px;
  }

  .song-mv-grid {
    gap: 4px;
  }

  .attr-icon {
    width: 22px;
    height: 22px;
  }

  .attr-icon-inline {
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
    gap: 10px;
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
    width: clamp(13px, calc(var(--member-avatar-size) * 0.32), 18px);
    height: clamp(13px, calc(var(--member-avatar-size) * 0.32), 18px);
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
    bottom: -1px;
    left: -3px;
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
    --member-avatar-size: clamp(52px, 10.8vw, 48px);
  }

  .event-item {
    grid-template-columns: 40px 46px minmax(0, 1fr) auto;
    column-gap: 6px;
    row-gap: 6px;
    padding: 8px;
  }

  .preview-row {
    padding: 4px 7px;
    gap: 6px;
    min-height: 34px;
  }

  .preview-label {
    min-width: 48px;
    font-size: 0.62rem;
    padding: 1px 5px;
  }

  .preview-date {
    font-size: 0.64rem;
  }

  .preview-member-avatar {
    width: 36px;
    height: 36px;
  }

  .event-title {
    font-size: 0.86rem;
  }

  .filter-panel {
    max-height: none;
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