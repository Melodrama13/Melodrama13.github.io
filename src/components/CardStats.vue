<template>
  <div class="pjsk-stats" :class="{ 'matrix-sort-anchor-suppressed': suppressMatrixViewportAnchor }">
    <div class="stats-layout" :class="{ 'nav-collapsed': navCollapsed, 'mobile-nav-overlay': isNavTopLayout, 'mobile-nav-open': !navCollapsed }">
      <button
        v-if="navCollapsed"
        class="floating-menu-btn export-hide"
        title="展开统计菜单"
        @click="setNavCollapsed(false)"
      >
        <img src="/data/icon/menu.png" class="floating-menu-icon" alt="菜单" />
      </button>
      <aside class="stats-nav card-panel" :class="{ 'mobile-floating': isNavTopLayout, 'is-collapsed': navCollapsed, 'is-open': !navCollapsed }">
        <button v-if="!navCollapsed" class="nav-collapse-fab export-hide" @click="setNavCollapsed(true)" title="收起统计菜单">
          <img src="/data/icon/menu_open.png" class="nav-collapse-fab-icon" alt="收起菜单" />
        </button>

        <div v-if="!navCollapsed" class="nav-cutoff" :class="{ 'mini-cutoff': isMiniFloatingNav }">
          <div class="nav-cutoff-title" v-if="!isNavTopLayout">统计截止活动 ID</div>
          <div v-if="isNavTopLayout" class="mini-cutoff-line">统计截止活动ID：{{ safeMaxEventId }}</div>
          <div v-else class="nav-cutoff-controls">
            <button class="id-step-btn" @click="adjustDisplayEventId(-1)" title="减少 1">－</button>
            <input
              type="number"
              step="1"
              inputmode="numeric"
              :value="displayEventIdDraft"
              @focus="onDisplayEventIdFocus"
              @input="onDisplayEventIdInput($event.target.value)"
              @blur="onDisplayEventIdBlur"
              class="id-input"
              placeholder="输入活动 ID"
            />
            <button class="id-step-btn" @click="adjustDisplayEventId(1)" title="增加 1">＋</button>
            <button @click="manualEventId = null" class="reset-mini-btn" :title="`恢复到当前参考活动 ID：${autoCurrentId}`">
              <img src="/data/icon/reset.png" class="reset-mini-icon" alt="复位" />
            </button>
          </div>
          <p class="config-tips">{{ isNavTopLayout ? `系统时间：${nowStr} | 在顶栏中输入更大ID可查看预测统计。` : `系统时间：${nowStr} | 输入更大ID可查看预测统计。` }}</p>
        </div>

        <template v-if="!navCollapsed">
          <div v-if="showDesktopNameControls" class="nav-name-format export-hide">
            <span class="nav-name-format-title">名称格式</span>
            <div class="nav-name-format-options">
              <label class="nav-name-format-option">
                <input v-model="navNameFormat" type="radio" value="abbr" />
                缩写
              </label>
              <label class="nav-name-format-option">
                <input v-model="navNameFormat" type="radio" value="single" />
                单字
              </label>
            </div>
          </div>
          <div class="nav-quick-wrap">
            <div class="nav-scroll">
              <div v-for="group in navGroups" :key="group.id" class="nav-group">
                <button
                  class="nav-link nav-link-main"
                  :class="{ active: isGroupActive(group) }"
                  :title="group.title"
                  @click="scrollToSection(group.id)"
                >
                  {{ group.title }}
                </button>
                <div v-if="group.children?.length && isGroupExpanded(group)" class="nav-sub-list">
                  <button
                    v-for="item in group.children"
                    :key="item.id"
                    class="nav-link nav-link-sub"
                    :class="{ active: activeNavId === item.id }"
                    :title="item.title"
                    @click="scrollToSection(item.id)"
                  >
                    {{ item.title }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </aside>

      <div class="stats-main">
        <div class="stats-main-head">
          <h1>角色卡片统计</h1>
        </div>

        <div id="panel-dist" class="stats-section card-panel section-main">
          <div class="section-head">
            <div class="section-head-left">
              <h2>阶梯分布</h2>
              <label v-if="showDesktopNameControls" class="dist-hide-name-toggle export-hide" title="勾选后不显示角色头像下方名称。">
                <input v-model="hideDistCharNames" type="checkbox" />
                隐藏角色名
              </label>
            </div>
            <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-dist', '阶梯分布')">PNG</button>
          </div>
          <div class="stats-grid">
            <div
              v-for="panel in groupPanels"
              :key="panel.id"
              class="stats-section card-panel"
              :id="`panel-${panel.id}`"
            >
              <div class="section-head section-head-sub">
                <div class="section-head-left">
                  <h2>{{ panel.title }}</h2>
                  <label
                    v-if="panel.id === 'reward'"
                    class="reward-collab-toggle"
                    title="勾选后，报酬统计会额外计入联动的二/三星卡。"
                  >
                    <input v-model="includeCollabRewardCards" type="checkbox" />
                    统计联动
                  </label>
                  <label
                    v-if="panel.id === 'pure-score'"
                    class="reward-collab-toggle"
                    title="勾选后，4星分卡会计入团分卡。"
                  >
                    <input v-model="includeUnitScoreInPureScore" type="checkbox" />
                    统计团分
                  </label>
                  <label
                    v-if="panel.id === 'fes-limited'"
                    class="reward-collab-toggle"
                    title="勾选后，百六限定次数会额外计入当期FES卡。"
                  >
                    <input v-model="fesLimitedIncludeFes" type="checkbox" />
                    统计FES
                  </label>
                  <div v-if="panel.id === 'limited-ban'" class="head-inline-filters">
                    <label class="head-filter-toggle" title="只统计箱限Ban个数。">
                      <input
                        type="checkbox"
                        :checked="limitedBanEventTypeFilter === '箱活'"
                        @change="setLimitedBanEventTypeFilter('箱活', $event.target.checked)"
                      />
                      只看箱活
                    </label>
                    <label class="head-filter-toggle" title="只统计混限Ban个数。">
                      <input
                        type="checkbox"
                        :checked="limitedBanEventTypeFilter === '混活'"
                        @change="setLimitedBanEventTypeFilter('混活', $event.target.checked)"
                      />
                      只看混活
                    </label>
                  </div>
                  <div v-if="panel.id === 'banner'" class="head-inline-filters">
                    <label class="head-filter-toggle" title="只统计箱活Banner个数。">
                      <input
                        type="checkbox"
                        :checked="bannerEventTypeFilter === '箱活'"
                        @change="setBannerEventTypeFilter('箱活', $event.target.checked)"
                      />
                      只看箱活
                    </label>
                    <label class="head-filter-toggle" title="只统计混活Banner个数。">
                      <input
                        type="checkbox"
                        :checked="bannerEventTypeFilter === '混活'"
                        @change="setBannerEventTypeFilter('混活', $event.target.checked)"
                      />
                      只看混活
                    </label>
                  </div>
                  <div v-if="panel.id === 'fes-limited-ban'" class="head-inline-filters">
                    <label class="head-filter-toggle" title="只统计百六箱限Ban个数。">
                      <input
                        type="checkbox"
                        :checked="fesLimitedBanEventTypeFilter === '箱活'"
                        @change="setFesLimitedBanEventTypeFilter('箱活', $event.target.checked)"
                      />
                      只看箱活
                    </label>
                    <label class="head-filter-toggle" title="只统计百六混限Ban个数。">
                      <input
                        type="checkbox"
                        :checked="fesLimitedBanEventTypeFilter === '混活'"
                        @change="setFesLimitedBanEventTypeFilter('混活', $event.target.checked)"
                      />
                      只看混活
                    </label>
                  </div>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng(`panel-${panel.id}`, `阶梯分布_${panel.title}`)">PNG</button>
              </div>
              <table class="count-table" :class="{ 'compact-char-table': hideDistCharNames, 'reward-breakdown-table': panel.showRewardBreakdown }">
                <thead>
                  <tr><th width="50">数量</th><th>持有角色</th></tr>
                </thead>
                <tbody>
                  <tr v-for="group in panel.groups" :key="`${panel.id}-${group.count}`">
                    <td class="count-cell" :class="panel.cellClass">{{ group.count }}</td>
                    <td class="chars-cell">
                      <div v-for="char in group.chars" :key="`${panel.id}-${char.name}`" class="char-avatar-box">
                        <img
                          :src="`/chibi_s/${getCharAbbr(char.name)}.webp`"
                          :title="char.name"
                          class="avatar-img"
                          :style="getStepFestivalAvatarStyle(char.name)"
                        />
                        <span v-if="!hideDistCharNames" class="abbr-text">{{ getDistNameLabel(char.name) }}</span>
                        <span v-if="panel.showRewardBreakdown" class="sub-stat">{{ char.rewardThreeCount }}+{{ char.rewardTwoCount }}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div id="panel-festival" class="stats-section card-panel festival-panel">
          <div class="section-head">
            <div class="section-head-left">
              <h2>节日人选</h2>
              <label v-if="showDesktopNameControls" class="festival-hide-name-toggle export-hide" title="勾选后不显示角色头像下方名称。">
                <input v-model="hideFestivalCharNames" type="checkbox" />
                隐藏角色名
              </label>
              <label class="festival-merge-toggle" title="勾选后，若角色已在更高星级出现，则不在低星级重复显示。">
                <input v-model="festivalMergeHigherRanks" type="checkbox" />
                高星合并低星
              </label>
            </div>
            <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-festival', '节日人选')">PNG</button>
          </div>
          <div class="festival-grid">
            <div
              v-for="fest in festivalCharStats"
              :key="fest.festival"
              :id="fest.anchorId"
              class="festival-card card-panel"
            >
              <div class="festival-card-head">
                <div class="festival-head-left">
                  <h3>{{ fest.festival }}</h3>
                  <label class="festival-merge-toggle festival-card-merge-toggle" title="勾选后，若角色已在更高星级出现，则不在低星级重复显示。">
                    <input v-model="festivalMergeToggles[fest.festival]" type="checkbox" />
                    高星合并低星
                  </label>
                  <label v-if="canToggleFestivalFes(fest.festival)" class="festival-fes-toggle">
                    <input v-model="festivalFesToggles[fest.festival]" type="checkbox" />
                    统计FES
                  </label>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng(fest.anchorId, `节日人选_${fest.festival}`)">PNG</button>
              </div>
              <table class="count-table" :class="{ 'compact-char-table': hideFestivalCharNames }">
                <tbody>
                  <tr v-for="row in fest.rows" :key="`${fest.festival}-${row.key}`">
                    <td class="count-cell festival-tier-cell" :class="`festival-tier-${row.key}`">
                      <div v-if="row.key !== 'none'" class="festival-star-stack">
                        <img
                          v-for="idx in getFestivalTierCount(row.key)"
                          :key="`${fest.festival}-${row.key}-star-${idx}`"
                          :src="getFestivalTierIcon(row.key)"
                          class="festival-star-icon"
                        />
                      </div>
                      <span v-else class="festival-none-text">无</span>
                    </td>
                    <td class="chars-cell" :class="{ 'festival-chars-empty-cell': !row.chars.length }">
                      <template v-if="row.chars.length">
                        <div
                          v-for="char in row.chars"
                          :key="`${fest.festival}-${row.key}-${char.name}`"
                          class="char-avatar-box festival-avatar-box"
                        >
                          <div class="festival-avatar-wrap">
                            <span v-if="char.count > 1" class="festival-count-badge">{{ char.count }}</span>
                            <img
                              :src="`/chibi_s/${getCharAbbr(char.name)}.webp`"
                              :title="char.name"
                              class="avatar-img"
                              :style="getStepFestivalAvatarStyle(char.name)"
                            />
                            <img
                              v-if="getFestivalUnitLogoByName(char.name)"
                              :src="getFestivalUnitLogoByName(char.name)"
                              class="festival-unit-logo"
                            />
                            <span v-if="row.key === 'four' && char.isPermOnly" class="festival-perm-mark">普</span>
                          </div>
                          <span v-if="!hideFestivalCharNames" class="abbr-text">{{ getFestivalDisplayNameLabel(char.name) }}</span>
                        </div>
                      </template>
                      <span v-else class="festival-empty">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div id="panel-related" class="stats-section card-panel related-panel">
          <div class="section-head">
            <h2>相关记录</h2>
            <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-related', '相关记录')">PNG</button>
          </div>

          <div class="record-grid">
            <div id="rel-last-four" class="record-block">
              <div class="block-head">
                <h3>{{ getRelatedRecordTitle('rel-last-four') }}</h3>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-last-four', '相关记录_上一次四星')">PNG</button>
              </div>
              <table class="record-table">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th>活动</th>
                    <th>日期</th>
                    <th>距今</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in lastFourStarRecords" :key="`last-four-${row.name}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <img :src="`/chibi_s/${getCharAbbr(row.name)}.webp`" class="record-avatar" :style="{ borderColor: getCharColor(row.name) }" />
                      <span>{{ row.name }}</span>
                    </td>
                    <td>
                      <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.eventRef)">{{ getJumpLinkLabel(row.eventRef, row.eventLabel) }}</button>
                    </td>
                    <td>{{ row.date }}</td>
                    <td>{{ row.months }}个月 | {{ row.periods }}期</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-last-limited" class="record-block">
              <div class="block-head">
                <h3>{{ getRelatedRecordTitle('rel-last-limited') }}</h3>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-last-limited', '相关记录_上一次限定')">PNG</button>
              </div>
              <table class="record-table">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th>活动</th>
                    <th>日期</th>
                    <th>距今</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in lastLimitedRecords" :key="`last-limited-${row.name}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <img :src="`/chibi_s/${getCharAbbr(row.name)}.webp`" class="record-avatar" :style="{ borderColor: getCharColor(row.name) }" />
                      <span>{{ row.name }}</span>
                    </td>
                    <td>
                      <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.eventRef)">{{ getJumpLinkLabel(row.eventRef, row.eventLabel) }}</button>
                    </td>
                    <td>{{ row.date }}</td>
                    <td>{{ row.months }}个月 | {{ row.periods }}期</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-four-long" class="record-block">
              <div class="block-head">
                <h3>{{ getRelatedRecordTitle('rel-four-long') }}</h3>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-four-long', '相关记录_四星最长间隔')">PNG</button>
              </div>
              <table class="record-table">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th>活动始末</th>
                    <th>最长</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in fourStarLongestIntervals" :key="`four-long-${row.name}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <img :src="`/chibi_s/${getCharAbbr(row.name)}.webp`" class="record-avatar" :style="{ borderColor: getCharColor(row.name) }" />
                      <span>{{ row.name }}</span>
                    </td>
                    <td class="range-cell">
                      <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.longest?.startRef)">{{ getJumpLinkLabel(row.longest?.startRef, row.longest?.startMark || '-') }}</button>
                      <span>→</span>
                      <button class="jump-link" :disabled="!row.longest?.endRef" @click.stop="jumpToHistoryByEventRef(row.longest?.endRef)">{{ getJumpLinkLabel(row.longest?.endRef, row.longest?.endMark || '-') }}</button>
                    </td>
                    <td>{{ formatGapValue(row.longest) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-four-short" class="record-block">
              <div class="block-head">
                <h3>{{ getRelatedRecordTitle('rel-four-short') }}</h3>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-four-short', '相关记录_四星最短间隔')">PNG</button>
              </div>
              <table class="record-table">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th>活动始末</th>
                    <th>最短</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in fourStarShortestIntervals" :key="`four-short-${row.name}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <img :src="`/chibi_s/${getCharAbbr(row.name)}.webp`" class="record-avatar" :style="{ borderColor: getCharColor(row.name) }" />
                      <span>{{ row.name }}</span>
                    </td>
                    <td class="range-cell">
                      <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.shortest?.startRef)">{{ getJumpLinkLabel(row.shortest?.startRef, row.shortest?.startMark || '-') }}</button>
                      <span>→</span>
                      <button class="jump-link" :disabled="!row.shortest?.endRef" @click.stop="jumpToHistoryByEventRef(row.shortest?.endRef)">{{ getJumpLinkLabel(row.shortest?.endRef, row.shortest?.endMark || '-') }}</button>
                    </td>
                    <td>{{ formatGapValue(row.shortest) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-limited-long" class="record-block">
              <div class="block-head">
                <h3>{{ getRelatedRecordTitle('rel-limited-long') }}</h3>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-limited-long', '相关记录_限定最长间隔')">PNG</button>
              </div>
              <table class="record-table">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th>活动始末</th>
                    <th>最长</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in limitedLongestIntervals" :key="`lim-long-${row.name}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <img :src="`/chibi_s/${getCharAbbr(row.name)}.webp`" class="record-avatar" :style="{ borderColor: getCharColor(row.name) }" />
                      <span>{{ row.name }}</span>
                    </td>
                    <td class="range-cell">
                      <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.longest?.startRef)">{{ getJumpLinkLabel(row.longest?.startRef, row.longest?.startMark || '-') }}</button>
                      <span>→</span>
                      <button class="jump-link" :disabled="!row.longest?.endRef" @click.stop="jumpToHistoryByEventRef(row.longest?.endRef)">{{ getJumpLinkLabel(row.longest?.endRef, row.longest?.endMark || '-') }}</button>
                    </td>
                    <td>{{ formatGapValue(row.longest) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-limited-short" class="record-block">
              <div class="block-head">
                <h3>{{ getRelatedRecordTitle('rel-limited-short') }}</h3>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-limited-short', '相关记录_限定最短间隔')">PNG</button>
              </div>
              <table class="record-table">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th>活动始末</th>
                    <th>最短</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in limitedShortestIntervals" :key="`lim-short-${row.name}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <img :src="`/chibi_s/${getCharAbbr(row.name)}.webp`" class="record-avatar" :style="{ borderColor: getCharColor(row.name) }" />
                      <span>{{ row.name }}</span>
                    </td>
                    <td class="range-cell">
                      <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.shortest?.startRef)">{{ getJumpLinkLabel(row.shortest?.startRef, row.shortest?.startMark || '-') }}</button>
                      <span>→</span>
                      <button class="jump-link" :disabled="!row.shortest?.endRef" @click.stop="jumpToHistoryByEventRef(row.shortest?.endRef)">{{ getJumpLinkLabel(row.shortest?.endRef, row.shortest?.endMark || '-') }}</button>
                    </td>
                    <td>{{ formatGapValue(row.shortest) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-ban-long" class="record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-ban-long') }}</h3>
                  <div class="head-inline-filters">
                    <label class="head-filter-toggle" title="只统计箱活的Ban间隔。">
                      <input
                        type="checkbox"
                        :checked="banEventTypeFilter === '箱活'"
                        @change="setBanEventTypeFilter('箱活', $event.target.checked)"
                      />
                      只看箱活
                    </label>
                    <label class="head-filter-toggle" title="只统计混活的Ban间隔。">
                      <input
                        type="checkbox"
                        :checked="banEventTypeFilter === '混活'"
                        @change="setBanEventTypeFilter('混活', $event.target.checked)"
                      />
                      只看混活
                    </label>
                  </div>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-ban-long', '相关记录_Ban最长间隔')">PNG</button>
              </div>
              <table class="record-table">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th>活动始末</th>
                    <th>最长 Ban</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in banLongestIntervals" :key="`ban-long-${row.name}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <img :src="`/chibi_s/${getCharAbbr(row.name)}.webp`" class="record-avatar" :style="{ borderColor: getCharColor(row.name) }" />
                      <span>{{ row.name }}</span>
                    </td>
                    <td class="range-cell">
                      <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.longest?.startRef)">{{ getJumpLinkLabel(row.longest?.startRef, row.longest?.startMark || '-') }}</button>
                      <span>→</span>
                      <button class="jump-link" :disabled="!row.longest?.endRef" @click.stop="jumpToHistoryByEventRef(row.longest?.endRef)">{{ getJumpLinkLabel(row.longest?.endRef, row.longest?.endMark || '-') }}</button>
                    </td>
                    <td>{{ formatGapValue(row.longest) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-ban-short" class="record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-ban-short') }}</h3>
                  <div class="head-inline-filters">
                    <label class="head-filter-toggle" title="只统计箱活的Ban间隔。">
                      <input
                        type="checkbox"
                        :checked="banEventTypeFilter === '箱活'"
                        @change="setBanEventTypeFilter('箱活', $event.target.checked)"
                      />
                      只看箱活
                    </label>
                    <label class="head-filter-toggle" title="只统计混活的Ban间隔。">
                      <input
                        type="checkbox"
                        :checked="banEventTypeFilter === '混活'"
                        @change="setBanEventTypeFilter('混活', $event.target.checked)"
                      />
                      只看混活
                    </label>
                  </div>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-ban-short', '相关记录_Ban最短间隔')">PNG</button>
              </div>
              <table class="record-table">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th>活动始末</th>
                    <th>最短 Ban</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in banShortestIntervals" :key="`ban-short-${row.name}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <img :src="`/chibi_s/${getCharAbbr(row.name)}.webp`" class="record-avatar" :style="{ borderColor: getCharColor(row.name) }" />
                      <span>{{ row.name }}</span>
                    </td>
                    <td class="range-cell">
                      <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.shortest?.startRef)">{{ getJumpLinkLabel(row.shortest?.startRef, row.shortest?.startMark || '-') }}</button>
                      <span>→</span>
                      <button class="jump-link" :disabled="!row.shortest?.endRef" @click.stop="jumpToHistoryByEventRef(row.shortest?.endRef)">{{ getJumpLinkLabel(row.shortest?.endRef, row.shortest?.endMark || '-') }}</button>
                    </td>
                    <td>{{ formatGapValue(row.shortest) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-vs-unit-last-four" class="record-block">
              <div class="record-head-row">
                <div class="record-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-vs-unit-last-four') }}</h3>
                  <div class="record-head-controls">
                    <label class="record-compact-toggle">
                      <input v-model="vsUnitLastFourCompact" type="checkbox" />
                      简略版本
                    </label>
                    <button
                      v-if="!vsUnitLastFourCompact"
                      class="record-sort-btn"
                      :class="{ active: vsUnitLastFourSort !== 'char' }"
                      @click="toggleVsUnitLastFourSort"
                    >
                      {{ vsUnitLastFourSortLabel }}
                    </button>
                  </div>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-vs-unit-last-four', '相关记录_各团虚拟歌手上次四星')">PNG</button>
              </div>

              <table v-if="!vsUnitLastFourCompact" class="record-table">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th>活动</th>
                    <th>日期</th>
                    <th>距今</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in vsUnitLastFourRecordsSorted" :key="`vs-unit-last-four-${row.key}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <img :src="`/chibi_s/${getCharAbbr(row.name)}.webp`" class="record-avatar" :style="{ borderColor: getCharColor(row.name) }" />
                      <img v-if="getVsUnitLogoByKey(row.key)" :src="getVsUnitLogoByKey(row.key)" class="record-unit-avatar" />
                      <span>{{ row.label }}</span>
                    </td>
                    <td>
                      <button class="jump-link" :disabled="!row.eventRef" @click.stop="jumpToHistoryByEventRef(row.eventRef)">{{ getJumpLinkLabel(row.eventRef, row.eventLabel) }}</button>
                    </td>
                    <td>{{ row.date }}</td>
                    <td>{{ row.days }}天 | {{ row.periods }}期</td>
                  </tr>
                </tbody>
              </table>

              <table v-else class="record-table vs-unit-score-table vs-unit-last-four-mini-table">
                <thead>
                  <tr>
                    <th>V\团</th>
                    <th v-for="u in VS_UNIT_SORT_ORDER" :key="`mini-head-${u}`" :style="getVsMiniUnitHeadStyle(u)">
                      <img :src="unitLogoMap[u]" class="mini-unit-logo" :alt="u" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in vsUnitLastFourCompactRows" :key="`mini-row-${row.name}`">
                    <td class="record-char vs-score-char-cell" :style="getVsMiniVsHeadStyle(row.name)">
                      <img :src="`/chibi_s/${getCharAbbr(row.name)}.webp`" class="record-avatar" :style="{ borderColor: getCharColor(row.name) }" />
                    </td>
                    <td v-for="u in VS_UNIT_SORT_ORDER" :key="`mini-cell-${row.name}-${u}`" class="vs-mini-days-cell" :style="getVsMiniDataCellStyle(row.daysByUnit[u])">{{ row.daysByUnit[u] }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-vs-unit-score" class="record-block">
              <div class="block-head">
                <h3>{{ getRelatedRecordTitle('rel-vs-unit-score') }}</h3>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-vs-unit-score', '相关记录_团分统计')">PNG</button>
              </div>
              <table class="record-table vs-unit-score-table">
                <thead>
                  <tr>
                    <th>V\团</th>
                    <th v-for="u in VS_UNIT_SORT_ORDER" :key="`score-head-${u}`" :style="getVsScoreUnitHeadStyle(u)">
                      <img :src="unitLogoMap[u]" class="mini-unit-logo" :alt="u" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in vsUnitScoreAttrRows" :key="`score-row-${row.name}`">
                    <td class="record-char vs-score-char-cell" :style="getVsScoreVsHeadStyle(row.name)">
                      <img :src="`/chibi_s/${getCharAbbr(row.name)}.webp`" class="record-avatar" :style="{ borderColor: getCharColor(row.name) }" />
                    </td>
                    <td v-for="u in VS_UNIT_SORT_ORDER" :key="`score-cell-${row.name}-${u}`" :style="getVsScoreCellStyle(row.name, u)">
                      <div v-if="row.attrsByUnit[u]?.length" class="score-attr-wrap">
                        <img
                          v-for="(attr, idx) in row.attrsByUnit[u]"
                          :key="`score-attr-${row.name}-${u}-${idx}`"
                          :src="`/elements/${String(attr).toLowerCase()}.png`"
                          :title="attr"
                          class="score-attr-icon"
                        />
                      </div>
                      <span v-else class="score-empty">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-cfes-stat" class="record-block fes-record-block">
              <div class="block-head">
                <h3>{{ getRelatedRecordTitle('rel-cfes-stat') }}</h3>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-cfes-stat', '相关记录_CFES统计')">PNG</button>
              </div>
              <table class="record-table fes-record-table">
                <thead>
                  <tr>
                    <th class="fes-row-head" aria-label="团体"></th>
                    <th v-for="attr in ATTRS" :key="`cfes-head-${attr}`" :style="getFesMatrixAttrHeadStyle(attr)">
                      <img :src="`/elements/${String(attr).toLowerCase()}.png`" class="fes-attr-icon" :alt="ATTR_LABELS[attr]" :title="ATTR_LABELS[attr]" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="unit in RELATED_FES_UNITS" :key="`cfes-row-${unit}`">
                    <td class="fes-unit-head" :style="getFesMatrixUnitHeadStyle(unit)">
                      <img :src="unitLogoMap[unit]" class="mini-unit-logo" :alt="unit" :title="unit.toUpperCase()" />
                    </td>
                    <td
                      v-for="attr in ATTRS"
                      :key="`cfes-cell-${unit}-${attr}`"
                      :style="getFesMatrixCellStyle(unit, attr)"
                    >
                      <div v-if="cfesRecordMatrix.iconRows[unit][attr]?.length" class="fes-cell-icons">
                        <img
                          v-for="icon in cfesRecordMatrix.iconRows[unit][attr]"
                          :key="`cfes-icon-${unit}-${attr}-${icon.iconKey}`"
                          :src="`/chibi_s/${icon.iconKey}.webp`"
                          class="fes-cell-avatar"
                          :title="icon.name"
                          :alt="icon.name"
                          :style="{ borderColor: getCharColor(icon.name) }"
                        />
                      </div>
                      <span v-else class="score-empty">-</span>
                    </td>
                  </tr>
                  <tr class="fes-total-row">
                    <td class="fes-total-head">总计</td>
                    <td v-for="attr in ATTRS" :key="`cfes-total-${attr}`" class="fes-total-num" :style="getFesMatrixTotalCellStyle(attr)">
                      {{ cfesRecordMatrix.totals[attr] }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-bfes-stat" class="record-block fes-record-block">
              <div class="block-head">
                <h3>{{ getRelatedRecordTitle('rel-bfes-stat') }}</h3>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-bfes-stat', '相关记录_BFES统计')">PNG</button>
              </div>
              <table class="record-table fes-record-table">
                <thead>
                  <tr>
                    <th class="fes-row-head" aria-label="团体"></th>
                    <th v-for="attr in ATTRS" :key="`bfes-head-${attr}`" :style="getFesMatrixAttrHeadStyle(attr)">
                      <img :src="`/elements/${String(attr).toLowerCase()}.png`" class="fes-attr-icon" :alt="ATTR_LABELS[attr]" :title="ATTR_LABELS[attr]" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="unit in RELATED_FES_UNITS" :key="`bfes-row-${unit}`">
                    <td class="fes-unit-head" :style="getFesMatrixUnitHeadStyle(unit)">
                      <img :src="unitLogoMap[unit]" class="mini-unit-logo" :alt="unit" :title="unit.toUpperCase()" />
                    </td>
                    <td
                      v-for="attr in ATTRS"
                      :key="`bfes-cell-${unit}-${attr}`"
                      :style="getFesMatrixCellStyle(unit, attr)"
                    >
                      <div v-if="bfesRecordMatrix.iconRows[unit][attr]?.length" class="fes-cell-icons">
                        <img
                          v-for="icon in bfesRecordMatrix.iconRows[unit][attr]"
                          :key="`bfes-icon-${unit}-${attr}-${icon.iconKey}`"
                          :src="`/chibi_s/${icon.iconKey}.webp`"
                          class="fes-cell-avatar"
                          :title="icon.name"
                          :alt="icon.name"
                          :style="{ borderColor: getCharColor(icon.name) }"
                        />
                      </div>
                      <span v-else class="score-empty">-</span>
                    </td>
                  </tr>
                  <tr class="fes-total-row">
                    <td class="fes-total-head">总计</td>
                    <td v-for="attr in ATTRS" :key="`bfes-total-${attr}`" class="fes-total-num" :style="getFesMatrixTotalCellStyle(attr)">
                      {{ bfesRecordMatrix.totals[attr] }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div id="panel-lineup" class="stats-section card-panel lineup-panel">
          <div class="section-head">
            <div class="section-head-left">
              <h2>日挑配队</h2>
              <button class="lineup-toggle-btn" @click="toggleLineupExpandedAll">{{ getLineupGlobalToggleLabel() }}</button>
            </div>
            <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-lineup', '日挑配队')">PNG</button>
          </div>
          <div class="lineup-tip">注意：仅从技能分值角度考虑最佳配队，不考虑其他影响（如综合力、歌曲、难度等）。配队不唯一，新卡优先显示。</div>
          <div class="lineup-grid">
            <div
              v-for="row in characterLineupRows"
              :key="`lineup-${row.name}`"
              :id="getLineupCardId(row.name)"
              class="lineup-card"
              :style="{ '--lineup-accent': getCharColor(row.name), backgroundColor: getRecordTint(row.name, 0.2) }"
            >
              <div class="lineup-char-head">
                <div class="lineup-char-main">
                  <img :src="`/chibi_s/${getCharAbbr(row.name)}.webp`" class="lineup-char-avatar" :style="{ borderColor: getCharColor(row.name) }" />
                  <div class="lineup-char-text">
                    <div class="lineup-char-name">{{ row.name }}</div>
                    <div class="lineup-char-sub">最优属性：{{ ATTR_LABELS[row.bestPlan.attr] }} {{ row.bestPlan.total }}</div>
                  </div>
                </div>
                <div class="lineup-head-actions">
                  <button
                    v-if="row.otherPlans.length"
                    class="lineup-toggle-btn"
                    @click="toggleLineupExpanded(row.name)"
                  >
                    {{ getLineupToggleLabel(row.name, row.otherPlans.length) }}
                  </button>
                  <button
                    class="card-export-btn"
                    :disabled="isExportingPng"
                    @click="exportElementPng(getLineupCardId(row.name), `日挑配队_${row.name}`)"
                  >PNG</button>
                </div>
              </div>

              <div class="lineup-plan-row lineup-plan-main" :style="getLineupRowStyle(row.bestPlan.attr)">
                <div class="lineup-attr-cell">
                  <img :src="`/elements/${String(row.bestPlan.attr).toLowerCase()}.png`" class="lineup-attr-icon" :title="ATTR_LABELS[row.bestPlan.attr]" />
                </div>
                <div
                  v-for="(slot, idx) in row.bestPlan.memberSlots"
                  :key="`main-${row.name}-${row.bestPlan.attr}-${idx}`"
                  class="lineup-member-cell"
                  :class="{ 'is-empty': !slot, 'is-cfes': slot?.fesKind === 'cfes', 'is-bfes': slot?.fesKind === 'bfes' }"
                  :style="getLineupMemberCellStyle(slot, row.bestPlan.attr)"
                >
                  <template v-if="slot">
                    <div class="lineup-member-score">{{ slot.score }}</div>
                    <button class="jump-link lineup-jump" :disabled="!slot.eventRef" @click.stop="jumpToHistoryByEventRef(slot.eventRef)">{{ getJumpLinkLabel(slot.eventRef, slot.eventLabel) }}</button>
                  </template>
                  <span v-else class="lineup-empty">-</span>
                </div>
                <div class="lineup-total-cell">{{ row.bestPlan.total }}</div>
              </div>

              <div v-if="row.otherPlans.length && isLineupExpanded(row.name)" class="lineup-more-list">
                <div
                  v-for="plan in row.otherPlans"
                  :key="`other-${row.name}-${plan.attr}`"
                  class="lineup-plan-row"
                  :style="getLineupRowStyle(plan.attr)"
                >
                  <div class="lineup-attr-cell">
                    <img :src="`/elements/${String(plan.attr).toLowerCase()}.png`" class="lineup-attr-icon" :title="ATTR_LABELS[plan.attr]" />
                  </div>
                  <div
                    v-for="(slot, idx) in plan.memberSlots"
                    :key="`slot-${row.name}-${plan.attr}-${idx}`"
                    class="lineup-member-cell"
                    :class="{ 'is-empty': !slot, 'is-cfes': slot?.fesKind === 'cfes', 'is-bfes': slot?.fesKind === 'bfes' }"
                    :style="getLineupMemberCellStyle(slot, plan.attr)"
                  >
                    <template v-if="slot">
                      <div class="lineup-member-score">{{ slot.score }}</div>
                      <button class="jump-link lineup-jump" :disabled="!slot.eventRef" @click.stop="jumpToHistoryByEventRef(slot.eventRef)">{{ getJumpLinkLabel(slot.eventRef, slot.eventLabel) }}</button>
                    </template>
                    <span v-else class="lineup-empty">-</span>
                  </div>
                  <div class="lineup-total-cell">{{ plan.total }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="panel-support" class="stats-section card-panel support-panel">
          <div class="section-head">
            <div class="section-head-left">
              <h2>支援配队</h2>
              <label class="support-wl-toggle export-hide" title="勾选后才计算并显示 WL 配队（更耗时）。">
                <input v-model="supportEnableWlLineup" type="checkbox" />
                <span>WL配队</span>
              </label>
            </div>
            <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-support', '支援配队')">PNG</button>
          </div>
          <div class="lineup-tip">注意：仅从技能分值角度考虑最佳配队，不考虑其他影响（如综合力、歌曲、难度等）。配队不唯一，同分卡会优先取OC，再取VS，且新卡优先显示。</div>
          <div class="support-grid">
            <div
              v-for="unitRow in supportLineupRows"
              :key="`support-${unitRow.unit}`"
              :id="getSupportCardId(unitRow.unit)"
              class="support-card"
              :style="{ backgroundColor: hexToRgba(UNIT_COLORS[unitRow.unit] || '#64748b', 0.12) }"
            >
              <div class="support-head">
                <img :src="supportUnitTitleLogoMap[unitRow.unit] || unitLogoMap[unitRow.unit]" class="support-unit-title-logo" :title="unitRow.unit.toUpperCase()" />
                <div class="support-head-actions">
                  <label v-if="unitRow.unit === 'vs'" class="support-vs-toggle export-hide">
                    <input v-model="supportUseOriginalVsTeam" type="checkbox" />
                    <span>原v队</span>
                  </label>
                  <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng(getSupportCardId(unitRow.unit), `支援配队_${unitRow.unit.toUpperCase()}`)">PNG</button>
                </div>
              </div>

              <div
                v-for="plan in unitRow.plans"
                :key="`support-${unitRow.unit}-${plan.attr}`"
                class="lineup-plan-row support-plan-row"
                :style="getLineupRowStyle(plan.attr)"
              >
                <div class="lineup-attr-cell">
                  <img v-if="isSupportAttrIcon(plan.attr)" :src="`/elements/${String(plan.attr).toLowerCase()}.png`" class="lineup-attr-icon" :title="ATTR_LABELS[plan.attr]" />
                  <span v-else class="lineup-attr-text">WL</span>
                </div>
                <div
                  v-for="(slot, idx) in plan.memberSlots"
                  :key="`support-slot-${unitRow.unit}-${plan.attr}-${idx}`"
                  class="lineup-member-cell"
                  :class="{ 'is-empty': !slot, 'support-member-cell': !!slot, 'is-cfes': slot?.fesKind === 'cfes', 'is-bfes': slot?.fesKind === 'bfes' }"
                  :style="getLineupMemberCellStyle(slot, plan.attr)"
                >
                  <template v-if="slot">
                    <img :src="`/chibi_s/${getSupportMemberIconKey(slot)}.webp`" class="support-member-avatar" :title="slot.name" :alt="slot.name" />
                    <img
                      v-if="plan.attr === SUPPORT_WL_ATTR && isSupportAttrIcon(slot.attr)"
                      :src="`/elements/${String(slot.attr).toLowerCase()}.png`"
                      class="support-member-attr-icon"
                      :title="ATTR_LABELS[slot.attr]"
                      :alt="ATTR_LABELS[slot.attr]"
                    />
                    <div class="lineup-member-score">{{ slot.score }}</div>
                    <button class="jump-link lineup-jump" :disabled="!slot.eventRef" @click.stop="jumpToHistoryByEventRef(slot.eventRef)">{{ getJumpLinkLabel(slot.eventRef, slot.eventLabel) }}</button>
                  </template>
                  <span v-else class="lineup-empty">-</span>
                </div>
                <div class="lineup-total-cell">{{ formatSupportTotal(plan.total) }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div id="panel-matrix" class="stats-section card-panel matrix-panel">
          <div class="section-head">
            <div class="section-head-left">
              <h2>角色矩阵</h2>
              <label class="matrix-pure-toggle" title="勾选后，分卡统计会计入团分卡。">
                <input v-model="includeUnitScoreInPureScore" type="checkbox" />
                分卡统计团分
              </label>
            </div>
            <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-matrix', '角色矩阵')">PNG</button>
          </div>
          <div class="matrix-wrap">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th>角色</th>
                  <th v-for="(attr, idx) in ATTRS" :key="`head-${attr}`" :class="matrixGroupClass(idx, ATTRS.length)">
                    <button class="matrix-sort-btn" @click="toggleMatrixSort(attr)">
                      <span>{{ ATTR_LABELS[attr] }}</span>
                      <span class="matrix-sort-ind">{{ getMatrixSortIndicator(attr) }}</span>
                    </button>
                  </th>
                  <th :class="matrixGroupClass(0, 4)">
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('pureScoreCount')"><span>分卡</span><span class="matrix-sort-ind">{{ getMatrixSortIndicator('pureScoreCount') }}</span></button>
                  </th>
                  <th>
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('scoreUpCount')"><span>普分</span><span class="matrix-sort-ind">{{ getMatrixSortIndicator('scoreUpCount') }}</span></button>
                  </th>
                  <th>
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('pScoreCount')"><span>P 分</span><span class="matrix-sort-ind">{{ getMatrixSortIndicator('pScoreCount') }}</span></button>
                  </th>
                  <th>
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('accuracyCount')"><span>判卡</span><span class="matrix-sort-ind">{{ getMatrixSortIndicator('accuracyCount') }}</span></button>
                  </th>
                  <th :class="matrixGroupClass(3, 4)">
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('recoveryCount')"><span>奶卡</span><span class="matrix-sort-ind">{{ getMatrixSortIndicator('recoveryCount') }}</span></button>
                  </th>
                  <th :class="matrixGroupClass(0, 4)">
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('fourStarCount')"><span>四星</span><span class="matrix-sort-ind">{{ getMatrixSortIndicator('fourStarCount') }}</span></button>
                  </th>
                  <th>
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('threeStarCount')"><span>三星</span><span class="matrix-sort-ind">{{ getMatrixSortIndicator('threeStarCount') }}</span></button>
                  </th>
                  <th>
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('twoStarCount')"><span>二星</span><span class="matrix-sort-ind">{{ getMatrixSortIndicator('twoStarCount') }}</span></button>
                  </th>
                  <th :class="matrixGroupClass(3, 4)">
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('rewardTotalCount')"><span>报酬</span><span class="matrix-sort-ind">{{ getMatrixSortIndicator('rewardTotalCount') }}</span></button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in attrMatrixRows"
                  :key="`attr-${row.name}`"
                  :class="getMatrixUnitFrameClass(row.name)"
                  :style="{
                    backgroundColor: getCharTint(row.name),
                    '--matrix-unit-border-color': getMatrixUnitColor(row.name)
                  }"
                >
                  <td class="row-char" :style="{ backgroundColor: getUnitMatrixTint(row.name) }">
                    <img
                      :src="`/chibi_s/${getCharAbbr(row.name)}.webp`"
                      class="mini-avatar"
                      :title="row.name"
                      :style="{ borderColor: getCharColor(row.name) }"
                    />
                  </td>
                  <td
                    v-for="(attr, idx) in ATTRS"
                    :key="`${row.name}-${attr}`"
                    class="matrix-num"
                    :class="[matrixGroupClass(idx, ATTRS.length), getAttrExtremeClass(attr, row[attr], row.name)]"
                  >
                    {{ row[attr] }}
                  </td>
                  <td class="matrix-num" :class="matrixGroupClass(0, 4)">{{ row.pureScoreCount }}</td>
                  <td class="matrix-num">{{ row.scoreUpCount }}</td>
                  <td class="matrix-num">{{ row.pScoreCount }}</td>
                  <td class="matrix-num">{{ row.accuracyCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(3, 4)">{{ row.recoveryCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(0, 4)">{{ row.fourStarCount }}</td>
                  <td class="matrix-num">{{ row.threeStarCount }}</td>
                  <td class="matrix-num">{{ row.twoStarCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(3, 4)">{{ row.rewardTotalCount }}</td>
                </tr>
                <tr class="matrix-total-row">
                  <td class="row-char matrix-total-label">总计</td>
                  <td v-for="(attr, idx) in ATTRS" :key="`attr-total-${attr}`" class="matrix-num" :class="matrixGroupClass(idx, ATTRS.length)">
                    {{ attrMatrixTotalRow[attr] }}
                  </td>
                  <td class="matrix-num" :class="matrixGroupClass(0, 4)">{{ attrMatrixTotalRow.pureScoreCount }}</td>
                  <td class="matrix-num">{{ attrMatrixTotalRow.scoreUpCount }}</td>
                  <td class="matrix-num">{{ attrMatrixTotalRow.pScoreCount }}</td>
                  <td class="matrix-num">{{ attrMatrixTotalRow.accuracyCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(3, 4)">{{ attrMatrixTotalRow.recoveryCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(0, 4)">{{ attrMatrixTotalRow.fourStarCount }}</td>
                  <td class="matrix-num">{{ attrMatrixTotalRow.threeStarCount }}</td>
                  <td class="matrix-num">{{ attrMatrixTotalRow.twoStarCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(3, 4)">{{ attrMatrixTotalRow.rewardTotalCount }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="panel-vs-matrix" class="stats-section card-panel matrix-panel">
          <div class="section-head">
            <h2>虚拟歌手矩阵</h2>
            <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-vs-matrix', '虚拟歌手矩阵')">PNG</button>
          </div>
          <div class="matrix-wrap">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th>角色</th>
                  <th v-for="(attr, idx) in ATTRS" :key="`vs-head-${attr}`" :class="matrixGroupClass(idx, ATTRS.length)">
                    <button class="matrix-sort-btn" @click="toggleMatrixSort(attr)">
                      <span>{{ ATTR_LABELS[attr] }}</span>
                      <span class="matrix-sort-ind">{{ getMatrixSortIndicator(attr) }}</span>
                    </button>
                  </th>
                  <th :class="matrixGroupClass(0, 4)">
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('unitScoreCount')"><span>团分</span><span class="matrix-sort-ind">{{ getMatrixSortIndicator('unitScoreCount') }}</span></button>
                  </th>
                  <th>
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('scoreUpCount')"><span>普分</span><span class="matrix-sort-ind">{{ getMatrixSortIndicator('scoreUpCount') }}</span></button>
                  </th>
                  <th>
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('pScoreCount')"><span>P 分</span><span class="matrix-sort-ind">{{ getMatrixSortIndicator('pScoreCount') }}</span></button>
                  </th>
                  <th>
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('accuracyCount')"><span>判卡</span><span class="matrix-sort-ind">{{ getMatrixSortIndicator('accuracyCount') }}</span></button>
                  </th>
                  <th :class="matrixGroupClass(3, 4)">
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('recoveryCount')"><span>奶卡</span><span class="matrix-sort-ind">{{ getMatrixSortIndicator('recoveryCount') }}</span></button>
                  </th>
                  <th :class="matrixGroupClass(0, 4)">
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('fourStarCount')"><span>四星</span><span class="matrix-sort-ind">{{ getMatrixSortIndicator('fourStarCount') }}</span></button>
                  </th>
                  <th>
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('threeStarCount')"><span>三星</span><span class="matrix-sort-ind">{{ getMatrixSortIndicator('threeStarCount') }}</span></button>
                  </th>
                  <th>
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('twoStarCount')"><span>二星</span><span class="matrix-sort-ind">{{ getMatrixSortIndicator('twoStarCount') }}</span></button>
                  </th>
                  <th :class="matrixGroupClass(3, 4)">
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('rewardTotalCount')"><span>报酬</span><span class="matrix-sort-ind">{{ getMatrixSortIndicator('rewardTotalCount') }}</span></button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in virtualSingerMatrixRows"
                  :key="`vs-matrix-${row.name}`"
                  :class="getMatrixUnitFrameClass(row.name, 'vs')"
                  :style="{
                    backgroundColor: getCharTint(row.name),
                    '--matrix-unit-border-color': getMatrixUnitColor(row.name)
                  }"
                >
                  <td class="row-char" :style="{ backgroundColor: getUnitMatrixTint(row.name) }">
                    <div class="matrix-avatar-wrap">
                      <img
                        :src="`/chibi_s/${getCharAbbr(row.name)}.webp`"
                        class="mini-avatar"
                        :title="row.name"
                        :style="{ borderColor: getCharColor(row.name) }"
                      />
                      <img
                        v-if="getVsUnitLogoByKey(row.name)"
                        :src="getVsUnitLogoByKey(row.name)"
                        class="matrix-avatar-unit-logo"
                        :alt="parseVsMatrixRowName(row.name).unit"
                        :title="parseVsMatrixRowName(row.name).unit.toUpperCase()"
                      />
                    </div>
                  </td>
                  <td
                    v-for="(attr, idx) in ATTRS"
                    :key="`vs-${row.name}-${attr}`"
                    class="matrix-num"
                    :class="[matrixGroupClass(idx, ATTRS.length), getVsMatrixValueClass(row[attr])]"
                  >
                    {{ row[attr] }}
                  </td>
                  <td class="matrix-num" :class="[matrixGroupClass(0, 4), getVsMatrixValueClass(row.unitScoreCount)]">{{ row.unitScoreCount }}</td>
                  <td class="matrix-num" :class="getVsMatrixValueClass(row.scoreUpCount)">{{ row.scoreUpCount }}</td>
                  <td class="matrix-num" :class="getVsMatrixValueClass(row.pScoreCount)">{{ row.pScoreCount }}</td>
                  <td class="matrix-num" :class="getVsMatrixValueClass(row.accuracyCount)">{{ row.accuracyCount }}</td>
                  <td class="matrix-num" :class="[matrixGroupClass(3, 4), getVsMatrixValueClass(row.recoveryCount)]">{{ row.recoveryCount }}</td>
                  <td class="matrix-num" :class="[matrixGroupClass(0, 4), getVsMatrixValueClass(row.fourStarCount)]">{{ row.fourStarCount }}</td>
                  <td class="matrix-num" :class="getVsMatrixValueClass(row.threeStarCount)">{{ row.threeStarCount }}</td>
                  <td class="matrix-num" :class="getVsMatrixValueClass(row.twoStarCount)">{{ row.twoStarCount }}</td>
                  <td class="matrix-num" :class="[matrixGroupClass(3, 4), getVsMatrixValueClass(row.rewardTotalCount)]">{{ row.rewardTotalCount }}</td>
                </tr>
                <tr
                  v-for="unitTotal in virtualSingerUnitTotalRows"
                  :key="`vs-unit-total-${unitTotal.unit}`"
                  class="matrix-vs-unit-total-row"
                  :style="{ '--matrix-vs-total-bg': getVsUnitTotalTint(unitTotal.unit), '--matrix-unit-border-color': UNIT_COLORS[unitTotal.unit] || '#9ca3af' }"
                >
                  <td class="row-char matrix-vs-unit-total-char">
                    <img :src="unitLogoMap[unitTotal.unit]" class="matrix-vs-unit-total-logo" :alt="unitTotal.unit" :title="unitTotal.unit.toUpperCase()" />
                  </td>
                  <td v-for="(attr, idx) in ATTRS" :key="`vs-total-${unitTotal.unit}-${attr}`" class="matrix-num" :class="matrixGroupClass(idx, ATTRS.length)">
                    {{ unitTotal[attr] }}
                  </td>
                  <td class="matrix-num" :class="matrixGroupClass(0, 4)">{{ unitTotal.unitScoreCount }}</td>
                  <td class="matrix-num">{{ unitTotal.scoreUpCount }}</td>
                  <td class="matrix-num">{{ unitTotal.pScoreCount }}</td>
                  <td class="matrix-num">{{ unitTotal.accuracyCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(3, 4)">{{ unitTotal.recoveryCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(0, 4)">{{ unitTotal.fourStarCount }}</td>
                  <td class="matrix-num">{{ unitTotal.threeStarCount }}</td>
                  <td class="matrix-num">{{ unitTotal.twoStarCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(3, 4)">{{ unitTotal.rewardTotalCount }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch, reactive } from 'vue';
import html2canvas from 'html2canvas';
// 1. 接收两个 Props
const props = defineProps({
  allEvents: { type: Array, default: () => [] },
  allCards: { type: Array, default: () => [] },
  allSongs: { type: Array, default: () => [] },
  allCharacters: { type: Array, default: () => [] },
  jumpEventId: { type: [Number, String], default: null },
  previewSyncEventId: { type: [Number, String], default: null }
});
const emit = defineEmits(['jump-to-event', 'stats-preview-update']);

// 2. 新增：用户自定义的截止 ID 状态
const manualEventId = ref(null);
const displayEventIdDraft = ref('');
const isEditingDisplayEventId = ref(false);
const navCollapsed = ref(false);
const activeNavId = ref('panel-dist');
const matrixSortKey = ref('');
const matrixSortOrder = ref('');
const suppressMatrixViewportAnchor = ref(false);
const vsUnitLastFourSort = ref('char');
const vsUnitLastFourCompact = ref(true);
const includeCollabRewardCards = ref(false);
const hideDistCharNames = ref(true);
const hideFestivalCharNames = ref(true);
const navNameFormat = ref('single');
const banEventTypeFilter = ref('all');
const bannerEventTypeFilter = ref('all');
const limitedBanEventTypeFilter = ref('all');
const fesLimitedBanEventTypeFilter = ref('all');
const fesLimitedIncludeFes = ref(false);
const includeUnitScoreInPureScore = ref(false);
const festivalMergeToggles = reactive({
  新年: false,
  婚活: false,
  情人节: false,
  白情: false,
  半周年: false,
  周年: false
});
const festivalMergeHigherRanks = computed({
  get: () => Object.keys(festivalMergeToggles).every((fest) => !!festivalMergeToggles[fest]),
  set: (value) => {
    const checked = !!value;
    Object.keys(festivalMergeToggles).forEach((fest) => {
      festivalMergeToggles[fest] = checked;
    });
  }
});
const isMobileNav = ref(false);
const isNavTopLayout = ref(false);
const navTopLayoutPrev = ref(null);
const supportUseOriginalVsTeam = ref(true);
const supportEnableWlLineup = ref(false);
const festivalFesToggles = reactive({
  半周年: false,
  周年: false
});
let sectionObserver = null;
const isExportingPng = ref(false);
let matrixSortAnchorTimer = 0;

//const getCharAbbr = (name) => CHAR_MAP[name] || name.toUpperCase() || name.toLowerCase();
const getCharAbbr = (name) => {
  if (!name) return '';
  // 尝试按空格拆分（例如 "初音未来 ln" -> ["初音未来", "ln"]）
  const parts = name.split(' ');
  const mainName = parts[0]; // 角色本体名字
  const unitSuffix = parts.length > 1 ? parts[1].toLowerCase() : null; // 团队后缀
  if (isVirtualSinger(mainName)) {  // 利用 isVirtualSinger 判断是否为虚拟歌手
    const abbr = CHAR_MAP[mainName] || String(mainName || '').toUpperCase(); // 从映射表获取基础缩写，如 MIKU, RIN
    if (unitSuffix && unitSuffix !== 'vs') {    // 如果有团队后缀，且后缀不是 'vs'
      return `${abbr.toLowerCase()}_${unitSuffix}`;      // 返回通用格式：缩写小写_团队名（如 miku_ln）
    }
    return abbr;    // 没有后缀或属于 vs 团队，返回原始大写缩写（如 MIKU）
  }
  // 非虚拟歌手角色，直接按全名查找映射
  return CHAR_MAP[name] || name.toUpperCase() || name.toLowerCase();
};

const jumpToHistoryByEventRef = (eventRef) => {
  const id = String(eventRef?.id ?? '').trim();
  if (!id) return;
  emit('jump-to-event', id);
};

const getCharColor = (name) => {
  const key = String(name || '').split(' ')[0];
  return CHAR_COLORS[key] || '#d1d5db';
};

const STEP_FESTIVAL_AVATAR_BORDER_MODE = 'unit'; // 'unit' | 'char'
const STEP_FESTIVAL_AVATAR_BORDER_WIDTH = 2;

const getStepFestivalAvatarBorderColor = (name) => {
  if (STEP_FESTIVAL_AVATAR_BORDER_MODE === 'char') {
    return getCharColor(name);
  }
  return UNIT_COLORS[getUnitByChar(name)] || '#d1d5db';
};

const getStepFestivalAvatarStyle = (name) => ({
  borderColor: getStepFestivalAvatarBorderColor(name),
  borderWidth: `${STEP_FESTIVAL_AVATAR_BORDER_WIDTH}px`
});

const showDesktopNameControls = computed(() => !isNavTopLayout.value);
const isMiniFloatingNav = computed(() => isNavTopLayout.value && navCollapsed.value);
const isSupportAttrIcon = (attr) => ATTRS.includes(String(attr || ''));

const BASE_UNIT_COLORS = {
  ln: '#4455DD',
  mmj: '#88DD44',
  vbs: '#EE1166',
  ws: '#FF9900',
  nc: '#884499',
  vs: '#111827'
};
const unitLogoMap = {
  ln: '/elements/ln.png',
  mmj: '/elements/mmj.png',
  vbs: '/elements/vbs.png',
  ws: '/elements/ws.png',
  nc: '/elements/nc.png',
  vs: '/elements/vs.png'
};
const CHAR_MAP = {};
const CHAR_SINGLE_MAP = {};
const CHAR_COLORS = {};
const CHAR_UNIT_MAP = {};
const CHAR_ORDER = {};
const VS_NAMES = [];
const VS_ALIAS_MAP = {};
const UNIT_COLORS = { ...BASE_UNIT_COLORS };

const replaceObject = (target, next) => {
  Object.keys(target).forEach((key) => {
    delete target[key];
  });
  Object.assign(target, next);
};

const replaceArray = (target, next) => {
  target.splice(0, target.length, ...next);
};

const applyCharacterMetaSource = (characters) => {
  if (!Array.isArray(characters) || characters.length === 0) {
    replaceObject(CHAR_MAP, {});
    replaceObject(CHAR_SINGLE_MAP, {});
    replaceObject(CHAR_COLORS, {});
    replaceObject(CHAR_UNIT_MAP, {});
    replaceObject(CHAR_ORDER, {});
    replaceObject(UNIT_COLORS, BASE_UNIT_COLORS);
    replaceObject(VS_ALIAS_MAP, {});
    replaceArray(VS_NAMES, []);
    return;
  }

  const nextCharMap = {};
  const nextSingleMap = {};
  const nextCharColors = {};
  const nextCharUnit = {};
  const nextCharOrder = {};
  const nextVsNames = [];
  const nextVsAliasMap = {};
  const nextUnitColors = { ...BASE_UNIT_COLORS };

  const addVsAlias = (aliasRaw, canonicalRaw) => {
    const alias = String(aliasRaw || '').trim();
    const canonical = String(canonicalRaw || '').trim();
    if (!alias || !canonical) return;
    nextVsAliasMap[alias] = canonical;
    nextVsAliasMap[alias.toUpperCase()] = canonical;
  };

  const sortedChars = [...characters]
    .map((char, idx) => ({ char, idx }))
    .filter(({ char }) => !!String(char?.zh_name || '').trim())
    .sort((a, b) => {
      const ao = Number(a.char?.id);
      const bo = Number(b.char?.id);
      const av = Number.isFinite(ao) && ao > 0 ? ao : 9999 + a.idx;
      const bv = Number.isFinite(bo) && bo > 0 ? bo : 9999 + b.idx;
      return av - bv;
    });

  sortedChars.forEach(({ char }, index) => {
    const name = String(char?.zh_name || '').trim();
    const unit = String(char?.unit || '').trim().toLowerCase() || 'vs';
    const abbr = String(char?.en_abbr || '').trim() || name.toUpperCase();
    const singleMark = String(char?.single_mark || '').trim() || name.slice(0, 1);
    const color = String(char?.color || '').trim();
    const unitColor = String(char?.unit_color || '').trim();
    const orderId = Number(char?.id);

    nextCharMap[name] = abbr;
    nextSingleMap[name] = singleMark;
    if (color) nextCharColors[name] = color;
    nextCharUnit[name] = unit;
    nextCharOrder[name] = Number.isFinite(orderId) && orderId > 0 ? orderId : index + 1;

    if (unit === 'vs') {
      nextVsNames.push(name);
      addVsAlias(name, name);
      addVsAlias(char?.ja_name, name);
      addVsAlias(char?.en_abbr, name);
      addVsAlias(char?.given_name_english, name);
      addVsAlias(char?.given_name, name);
      addVsAlias(`${String(char?.first_name_english || '').trim()} ${String(char?.given_name_english || '').trim()}`.trim(), name);
      addVsAlias(`${String(char?.first_name || '').trim()}${String(char?.given_name || '').trim()}`.trim(), name);
    }
    if (unitColor) {
      nextUnitColors[unit] = unitColor;
    }
  });

  if (Object.keys(nextCharMap).length === 0) {
    replaceObject(CHAR_MAP, {});
    replaceObject(CHAR_SINGLE_MAP, {});
    replaceObject(CHAR_COLORS, {});
    replaceObject(CHAR_UNIT_MAP, {});
    replaceObject(CHAR_ORDER, {});
    replaceObject(UNIT_COLORS, BASE_UNIT_COLORS);
    replaceObject(VS_ALIAS_MAP, {});
    replaceArray(VS_NAMES, []);
    return;
  }

  replaceObject(CHAR_MAP, nextCharMap);
  replaceObject(CHAR_SINGLE_MAP, nextSingleMap);
  replaceObject(CHAR_COLORS, nextCharColors);
  replaceObject(CHAR_UNIT_MAP, nextCharUnit);
  replaceObject(CHAR_ORDER, nextCharOrder);
  replaceObject(UNIT_COLORS, nextUnitColors);
  replaceObject(VS_ALIAS_MAP, nextVsAliasMap);
  replaceArray(VS_NAMES, nextVsNames);
};

watch(
  () => props.allCharacters,
  (characters) => {
    applyCharacterMetaSource(characters);
  },
  { immediate: true }
);

const LINEUP_CHAR_NAMES = computed(() => {
  const names = Object.keys(CHAR_ORDER).sort((a, b) => (CHAR_ORDER[a] || 999) - (CHAR_ORDER[b] || 999));
  const lukaIdx = names.indexOf('巡音流歌');
  const mikuIdx = names.indexOf('初音未来');
  if (lukaIdx >= 0 && mikuIdx >= 0 && lukaIdx !== mikuIdx + 1) {
    names.splice(lukaIdx, 1);
    names.splice(mikuIdx + 1, 0, '巡音流歌');
  }
  return names;
});
const ATTRS = ['Pure', 'Cool', 'Cute', 'Happy', 'Mysterious'];
const SUPPORT_WL_ATTR = 'wl';
const LIMITED_TYPES = new Set(['limited', 'cfes', 'bfes', 'collab_t', 'wl3']);//加入wl3为限定卡
const FES_CARD_TYPES = new Set(['cfes', 'bfes']);
const FES_SKILL_TYPES = new Set(['cfes', 'bfes_up']);
const EXCLUDED_PERIOD_EVENT_TYPES = new Set(['测试']);
const SPECIAL_EVENT_KEY_LABELS = {
  c1: '大罪',
  c2: '三丽欧',
  c3: 'ES',
  c4: '东方',
  c5: '拓麻歌子',
  movie: '剧场版'
};
const ATTR_LABELS = {
  Pure: '绿草',
  Cool: '蓝星',
  Cute: '粉花',
  Happy: '橙心',
  Mysterious: '紫月'
};
const ATTR_COLORS = Object.freeze({
  Pure: '#17a159',
  Cool: '#4b48e9',
  Cute: '#f35c9b',
  Happy: '#ff8719',
  Mysterious: '#8e65c2'
});
const SPECIAL_FESTIVALS = ['新年', '婚活', '情人节', '白情', '半周年', '周年'];
const FESTIVAL_ANCHOR_IDS = Object.fromEntries(SPECIAL_FESTIVALS.map((fest, idx) => [fest, `festival-${idx + 1}`]));
const FESTIVAL_VS_UNIT_ORDER = { ln: 1, mmj: 2, vbs: 3, ws: 4, nc: 5, vs: 6 };
const VS_UNIT_SORT_ORDER = ['ln', 'mmj', 'vbs', 'ws', 'nc'];
const RELATED_FES_UNITS = ['ln', 'mmj', 'vbs', 'ws', 'nc', 'vs'];
const SUPPORT_UNITS = ['vs', 'ln', 'mmj', 'vbs', 'ws', 'nc'];
const supportUnitTitleLogoMap = Object.freeze({
  ln: '/elements/Leo_need.png',
  mmj: '/elements/MORE_MORE_JUMP!.png',
  vbs: '/elements/Vivid_BAD_SQUAD.png',
  ws: '/elements/ワンダーランズ×ショウタイム.png',
  nc: '/elements/25時、ナイトコードで.png',
  vs: '/elements/virtual_singer.png'
});

const isVirtualSinger = (name) => VS_NAMES.includes(name);

const getUnitByChar = (name) => {
  const raw = String(name || '').trim();
  if (!raw) return 'vs';
  const [baseName, suffixRaw] = raw.split(/\s+/);
  const suffix = String(suffixRaw || '').toLowerCase();
  if (VS_NAMES.includes(baseName)) {
    if (suffix && UNIT_COLORS[suffix]) return suffix;
    return 'vs';
  }
  return CHAR_UNIT_MAP[baseName] || 'vs';
};

const normalizeFestivalCharName = (name) => {
  const raw = String(name || '').trim();
  if (!raw) return '';
  const [baseName] = raw.split(/\s+/);
  return CHAR_ORDER[baseName] ? baseName : '';
};

const parseFestivalCharKey = (charKey) => {
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

const buildFestivalCharKey = (card) => {
  const baseName = normalizeFestivalCharName(card?.Name);
  if (!baseName) return '';
  if (!isVirtualSinger(baseName)) return baseName;

  const unit = String(card?.Affiliation || '').trim().toLowerCase();
  if (unit && unit !== 'vs' && FESTIVAL_VS_UNIT_ORDER[unit]) {
    return `${baseName} ${unit}`;
  }
  return baseName;
};

const compareFestivalCharKey = (aKey, bKey) => {
  const a = parseFestivalCharKey(aKey);
  const b = parseFestivalCharKey(bKey);
  const baseDiff = (CHAR_ORDER[a.baseName] || 999) - (CHAR_ORDER[b.baseName] || 999);
  if (baseDiff !== 0) return baseDiff;

  if (a.isVs && b.isVs) {
    const au = FESTIVAL_VS_UNIT_ORDER[a.unit || 'vs'] || 999;
    const bu = FESTIVAL_VS_UNIT_ORDER[b.unit || 'vs'] || 999;
    if (au !== bu) return au - bu;
  }

  return String(aKey).localeCompare(String(bKey), 'zh-Hans-CN');
};

const getFestivalUnitLogoByName = (charName) => {
  const parsed = parseFestivalCharKey(charName);
  if (!parsed.isVs) return '';
  if (!parsed.unit || parsed.unit === 'vs') return '';
  return unitLogoMap[parsed.unit] || '';
};

const getFestivalDisplayNameLabel = (charName) => {
  const parsed = parseFestivalCharKey(charName);
  if (useSingleNameMark.value) {
    return getCharSingleMark(parsed.baseName || charName);
  }
  if (parsed?.isVs) {
    return CHAR_MAP[parsed.baseName] || getCharAbbr(parsed.baseName);
  }
  return getCharAbbr(charName);
};

const canToggleFestivalFes = (festival) => ['半周年', '周年'].includes(String(festival || '').trim());

const shouldCountFestivalFes = (festival) => {
  if (!canToggleFestivalFes(festival)) return false;
  return !!festivalFesToggles[String(festival || '').trim()];
};

const getFestivalTierCount = (tierKey) => {
  if (tierKey === 'four') return 4;
  if (tierKey === 'three') return 3;
  if (tierKey === 'two') return 2;
  return 0;
};

const getFestivalTierIcon = (tierKey) => (tierKey === 'four' ? '/elements/rstar.png' : '/elements/ystar.png');

const isFesCardType = (typeValue) => FES_CARD_TYPES.has(String(typeValue || '').trim().toLowerCase());

const isFesSkillType = (skillKind) => {
  const kind = String(skillKind || '').trim().toLowerCase();
  if (!kind) return false;
  // Keep compatibility with specific CFES variants like cfes_l / cfes_j.
  if (kind.startsWith('cfes')) return true;
  return FES_SKILL_TYPES.has(kind);
};

const getFesKindBySkillKind = (skillKind) => {
  const kind = String(skillKind || '').trim().toLowerCase();
  if (kind === 'bfes_up') return 'bfes';
  if (kind.startsWith('cfes')) return 'cfes';
  return '';
};

const hexToRgba = (hex, alpha) => {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const hexToSoftSolid = (hex, mix = 0.78) => {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return 'rgb(229, 231, 235)';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const rr = Math.round(r + (255 - r) * mix);
  const gg = Math.round(g + (255 - g) * mix);
  const bb = Math.round(b + (255 - b) * mix);
  return `rgb(${rr}, ${gg}, ${bb})`;
};

const getCharTint = (name) => {
  return hexToRgba(getCharColor(name), 0.2);
};

const getMatrixUnitColor = (name) => UNIT_COLORS[getUnitByChar(name)] || '#9ca3af';

const getUnitMatrixTint = (name) => hexToSoftSolid(getMatrixUnitColor(name));

const disableMatrixViewportAnchorTemporarily = () => {
  suppressMatrixViewportAnchor.value = true;
  if (matrixSortAnchorTimer) {
    clearTimeout(matrixSortAnchorTimer);
  }
  matrixSortAnchorTimer = setTimeout(() => {
    suppressMatrixViewportAnchor.value = false;
    matrixSortAnchorTimer = 0;
  }, 200);
};

const toggleMatrixSort = (key) => {
  disableMatrixViewportAnchorTemporarily();
  if (matrixSortKey.value !== key) {
    matrixSortKey.value = key;
    matrixSortOrder.value = 'desc';
    return;
  }
  if (matrixSortOrder.value === 'desc') {
    matrixSortOrder.value = 'asc';
    return;
  }
  if (matrixSortOrder.value === 'asc') {
    matrixSortKey.value = '';
    matrixSortOrder.value = '';
    return;
  }
  matrixSortOrder.value = 'desc';
};

const getMatrixSortIndicator = (key) => {
  if (matrixSortKey.value !== key || !matrixSortOrder.value) return '↕';
  return matrixSortOrder.value === 'desc' ? '↓' : '↑';
};

const isMatrixDefaultSort = computed(() => !matrixSortKey.value || !matrixSortOrder.value);

const buildMatrixUnitFrameMap = (rows) => {
  const map = new Map();
  if (!isMatrixDefaultSort.value) return map;
  rows.forEach((row, idx) => {
    const unit = getUnitByChar(row.name);
    const prevUnit = idx > 0 ? getUnitByChar(rows[idx - 1].name) : null;
    const nextUnit = idx < rows.length - 1 ? getUnitByChar(rows[idx + 1].name) : null;
    map.set(row.name, {
      start: unit !== prevUnit,
      end: unit !== nextUnit
    });
  });
  return map;
};

const matrixUnitFrameMap = computed(() => buildMatrixUnitFrameMap(attrMatrixRows.value));
const vsMatrixUnitFrameMap = computed(() => buildMatrixUnitFrameMap(virtualSingerMatrixRows.value));

const getMatrixUnitFrameClass = (name, matrixType = 'char') => {
  const frameMap = matrixType === 'vs' ? vsMatrixUnitFrameMap.value : matrixUnitFrameMap.value;
  const info = frameMap.get(name);
  if (!info) return [];
  return [
    'matrix-unit-framed',
    info.start ? 'matrix-unit-group-start-row' : '',
    info.end ? 'matrix-unit-group-end-row' : ''
  ].filter(Boolean);
};

const toggleVsUnitLastFourSort = () => {
  if (vsUnitLastFourSort.value === 'char') {
    vsUnitLastFourSort.value = 'date-desc';
    return;
  }
  if (vsUnitLastFourSort.value === 'date-desc') {
    vsUnitLastFourSort.value = 'date-asc';
    return;
  }
  vsUnitLastFourSort.value = 'char';
};

const vsUnitLastFourSortLabel = computed(() => {
  if (vsUnitLastFourSort.value === 'date-desc') return '日期↓';
  if (vsUnitLastFourSort.value === 'date-asc') return '日期↑';
  return '日期';
});

const getRecordTint = (name, alpha = 0.3) => hexToRgba(getCharColor(name), alpha);

const parseDateSafe = (dateStr) => {
  const d = new Date(String(dateStr || '').replace(/\//g, '-'));
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeBannerName = (banner) => String(banner || '').trim().split(/\s+/)[0] || '';

const monthsSince = (dateStr) => {
  const d = parseDateSafe(dateStr);
  if (!d) return 0;
  const ref = referenceDateObj.value;
  let m = (ref.getFullYear() - d.getFullYear()) * 12 + (ref.getMonth() - d.getMonth());
  if (ref.getDate() < d.getDate()) m -= 1;
  return Math.max(0, m);
};

const daysBetween = (dateA, dateB) => {
  const a = parseDateSafe(dateA);
  const b = parseDateSafe(dateB);
  if (!a || !b) return 0;
  const diff = Math.abs(b.getTime() - a.getTime());
  return Math.round(diff / (1000 * 60 * 60 * 24));
};

const compareCharOrder = (a, b) => (CHAR_ORDER[a] || 999) - (CHAR_ORDER[b] || 999);

const getTypeSeriesText = (value) => {
  const s = String(value ?? '').trim();
  return s && s !== 'null' && s !== 'undefined' ? s : '';
};

const buildGapRanges = (eventList, countFn) => {
  const ranges = [];
  for (let i = 1; i < eventList.length; i += 1) {
    const prev = eventList[i - 1];
    const curr = eventList[i];
    ranges.push({
      startMark: getNonBanEventMark(prev),
      endMark: getNonBanEventMark(curr),
      startRef: prev,
      endRef: curr,
      startTypeSeriesId: prev.typeSeriesId,
      endTypeSeriesId: curr.typeSeriesId,
      startEventType: prev.eventType,
      endEventType: curr.eventType,
      days: daysBetween(prev.date, curr.date),
      periods: countFn(prev, curr)
    });
  }
  return ranges;
};

const pickGap = (ranges, mode) => {
  if (!ranges.length) return null;
  return [...ranges].sort((a, b) => {
    if (mode === 'max') {
      if (b.days !== a.days) return b.days - a.days;
      return b.periods - a.periods;
    }
    if (a.days !== b.days) return a.days - b.days;
    return a.periods - b.periods;
  })[0];
};

const pickGapByPeriods = (ranges, mode) => {
  if (!ranges.length) return null;
  return [...ranges].sort((a, b) => {
    if (mode === 'max') {
      if (b.periods !== a.periods) return b.periods - a.periods;
      return b.days - a.days;
    }
    if (a.periods !== b.periods) return a.periods - b.periods;
    return a.days - b.days;
  })[0];
};

const getEventTypeShort = (eventType) => {
  const t = String(eventType || '').trim();
  if (t === '箱活') return '箱';
  if (t === '混活') return '混';
  if (t === 'World Link') return 'WL';
  if (t === 'World Link终章') return 'WL终';
  return t || '?';
};

const getWl3PartSuffix = (ev) => {
  const eventType = String(ev?.eventType || '').trim();
  const typeSeries = Number(getTypeSeriesText(ev?.typeSeriesId));
  if (eventType !== 'World Link' || typeSeries !== 3) return '';

  const currentId = Number(ev?.id ?? ev?.sourceKey);
  if (!Number.isFinite(currentId)) return '';

  const wl3Ids = (props.allEvents || [])
    .filter((item) => {
      if (shouldSkipPredictEvent(item)) return false;
      if (!isNumericEventId(item?.id)) return false;
      if (Number(item.id) > Number(safeMaxEventId.value)) return false;
      if (String(item?.event_type || '').trim() !== 'World Link') return false;
      return Number(getTypeSeriesText(item?.type_series_id)) === 3;
    })
    .map((item) => Number(item.id))
    .sort((a, b) => a - b);

  const idx = wl3Ids.indexOf(currentId);
  if (idx < 0) return '';
  return ` p${idx + 1}`;
};

const getNonBanEventMark = (ev) => {
  if (!ev) return '?';
  const sourceKey = String(ev.sourceKey || ev.id || '').trim();
  if (sourceKey === '0') return '开服';
  const typeSeries = getTypeSeriesText(ev.typeSeriesId);
  const eventType = String(ev.eventType || '').trim();
  const shortType = getEventTypeShort(eventType);
  const bannerName = normalizeBannerName(ev.banner);
  const bannerMark = bannerName ? getCharAbbr(bannerName).toLowerCase() : '';
  const unitMark = String(ev.unit || '').trim().toLowerCase();
  const collabLabel = SPECIAL_EVENT_KEY_LABELS[sourceKey] || '';

  if (eventType === 'World Link' || eventType === 'World Link终章') {
    if (eventType === 'World Link' && Number(typeSeries) === 3) {
      const base = `wl3${getWl3PartSuffix(ev)}`;
      return ev.isFesCard ? `${base}(fes)` : base;
    }
    const wlHead = bannerMark || unitMark || 'vs';
    const base = typeSeries ? `${wlHead} wl${typeSeries}` : `${wlHead} wl`;
    return ev.isFesCard ? `${base}(fes)` : base;
  }

  let base = '?';
  if (bannerMark && typeSeries) base = `${bannerMark}${typeSeries}${shortType}`;
  else if (bannerMark) base = `${bannerMark}${shortType}`;
  else if (unitMark && typeSeries) base = `${unitMark}${typeSeries}${shortType}`;
  else if (typeSeries) base = `${typeSeries}${shortType}`;
  else if (collabLabel) base = collabLabel;
  else if (sourceKey) base = sourceKey;

  return ev.isFesCard ? `${base}(fes)` : base;
};

const formatRangeLabel = (gap) => (gap ? `${gap.startMark}→${gap.endMark}` : '-');
const formatGapValue = (gap) => (gap ? `${gap.days}天 | ${gap.periods}期` : '-');

const formatBanRangeLabel = (gap) => {
  if (!gap) return '-';
  const left = `${getTypeSeriesText(gap.startTypeSeriesId) || '?'}${getEventTypeShort(gap.startEventType)}`;
  const right = `${getTypeSeriesText(gap.endTypeSeriesId) || '?'}${getEventTypeShort(gap.endEventType)}`;
  return `${left}→${right}`;
};

const RELATED_RECORD_ITEMS = [
  { id: 'rel-last-four', title: '上一次四星' },
  { id: 'rel-last-limited', title: '上一次限定' },
  { id: 'rel-four-long', title: '四星最长间隔' },
  { id: 'rel-four-short', title: '四星最短间隔' },
  { id: 'rel-limited-long', title: '限定最长间隔' },
  { id: 'rel-limited-short', title: '限定最短间隔' },
  { id: 'rel-ban-long', title: 'Ban最长间隔' },
  { id: 'rel-ban-short', title: 'Ban最短间隔' },
  { id: 'rel-vs-unit-last-four', title: '各团VS上次四星' },
  { id: 'rel-vs-unit-score', title: '团分统计' },
  { id: 'rel-cfes-stat', title: 'CFES统计' },
  { id: 'rel-bfes-stat', title: 'BFES统计' }
];

const RELATED_RECORD_TITLE_MAP = Object.fromEntries(
  RELATED_RECORD_ITEMS.map((item) => [item.id, item.title])
);

const getRelatedRecordTitle = (id) => RELATED_RECORD_TITLE_MAP[id] || id;

const navGroups = computed(() => {
  const distChildren = groupPanels.value.map((p) => ({
    id: `panel-${p.id}`,
    title: p.title
  }));

  return [
    {
      id: 'panel-dist',
      title: '阶梯分布',
      children: distChildren
    },
    {
      id: 'panel-festival',
      title: '节日人选',
      children: SPECIAL_FESTIVALS.map((fest) => ({
        id: FESTIVAL_ANCHOR_IDS[fest],
        title: fest
      }))
    },
    {
      id: 'panel-related',
      title: '相关记录',
      children: RELATED_RECORD_ITEMS.map((item) => ({ id: item.id, title: item.title }))
    },
    {
      id: 'panel-lineup',
      title: '日挑配队',
      children: []
    },
    {
      id: 'panel-support',
      title: '支援配队',
      children: []
    },
    {
      id: 'panel-matrix',
      title: '角色矩阵',
      children: []
    },
    {
      id: 'panel-vs-matrix',
      title: '虚拟歌手矩阵',
      children: []
    }
  ];
});

const navTargetIds = computed(() => {
  const ids = [];
  navGroups.value.forEach((g) => {
    ids.push(g.id);
    (g.children || []).forEach((c) => ids.push(c.id));
  });
  return ids;
});

const isGroupActive = (group) => {
  if (activeNavId.value === group.id) return true;
  return (group.children || []).some((c) => c.id === activeNavId.value);
};

const isGroupExpanded = (group) => isMobileNav.value || isGroupActive(group);

const getScrollContainer = () => {
  const content = document.querySelector('.content-area');
  if (content instanceof HTMLElement) return content;
  if (document.scrollingElement instanceof HTMLElement) return document.scrollingElement;
  return document.documentElement;
};

const withPreservedScrollCenter = async (applyChange) => {
  const host = getScrollContainer();
  const ratio = (host.scrollTop + host.clientHeight / 2) / Math.max(1, host.scrollHeight);
  applyChange();
  await nextTick();
  await waitNextPaint();
  const targetTop = ratio * host.scrollHeight - host.clientHeight / 2;
  const maxTop = Math.max(0, host.scrollHeight - host.clientHeight);
  host.scrollTop = Math.max(0, Math.min(maxTop, targetTop));
};

const setNavCollapsed = (nextCollapsed, preserveCenter = true) => {
  const next = !!nextCollapsed;
  if (navCollapsed.value === next) return;
  if (!preserveCenter) {
    navCollapsed.value = next;
    return;
  }
  void withPreservedScrollCenter(() => {
    navCollapsed.value = next;
  });
};

const updateMobileNavState = () => {
  if (typeof window === 'undefined') return;
  const isTopLayout = window.innerWidth <= 900;
  const prev = navTopLayoutPrev.value;
  const nextCollapsed = prev === null
    ? isTopLayout
    : (prev !== isTopLayout ? isTopLayout : navCollapsed.value);
  const needPreserve = prev !== null
    && (isNavTopLayout.value !== isTopLayout || navCollapsed.value !== nextCollapsed);

  const applyState = () => {
    isNavTopLayout.value = isTopLayout;
    isMobileNav.value = isTopLayout;
    navCollapsed.value = nextCollapsed;
    navTopLayoutPrev.value = isTopLayout;
  };

  if (needPreserve) {
    void withPreservedScrollCenter(applyState);
    return;
  }
  applyState();
};

const scrollToSection = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  activeNavId.value = id;
  const host = getScrollContainer();
  const hostRect = host.getBoundingClientRect();
  const targetRect = el.getBoundingClientRect();
  const nextTop = host.scrollTop + (targetRect.top - hostRect.top) - 8;
  host.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
  if (isNavTopLayout.value) {
    setNavCollapsed(true, false);
  }
};

const sanitizeExportFileName = (name) => {
  const raw = String(name || '').trim();
  const cleaned = raw
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[.\s]+$/g, '')
    .trim();
  return cleaned || 'pjsk_stats';
};

const formatExportTimestamp = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}_${hh}${mm}`;
};

const triggerDownloadPng = async (canvas, fileName) => {
  const blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });
  if (!blob) {
    throw new Error('toBlob failed');
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

const waitNextPaint = () => new Promise((resolve) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(resolve);
  });
});

const prepareExportClone = async (targetEl) => {
  if (!targetEl) return null;

  const rect = targetEl.getBoundingClientRect();
  const sourceStyle = window.getComputedStyle(targetEl);
  const sourceBgColor = String(sourceStyle.backgroundColor || '').trim();
  const hasVisibleBg = sourceBgColor && sourceBgColor !== 'transparent' && sourceBgColor !== 'rgba(0, 0, 0, 0)';
  const clone = targetEl.cloneNode(true);
  clone.classList.add('export-clone-root');
  clone.style.position = 'fixed';
  clone.style.left = '-20000px';
  clone.style.top = '0';
  clone.style.margin = '0';
  clone.style.pointerEvents = 'none';
  clone.style.zIndex = '-1';
  clone.style.background = hasVisibleBg ? sourceBgColor : '#ffffff';
  clone.style.width = `${Math.max(1, Math.ceil(rect.width))}px`;
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';

  clone.querySelectorAll('.card-export-btn').forEach((btn) => {
    btn.style.display = 'none';
  });
  clone.querySelectorAll('.lineup-toggle-btn').forEach((btn) => {
    btn.style.display = 'none';
  });
  clone.querySelectorAll('.export-hide').forEach((el) => {
    el.style.display = 'none';
  });
  // html2canvas may over-render inset shadow on low-alpha CFES backgrounds,
  // causing a gray veil in the middle/corners; keep on-screen style unchanged
  // and neutralize this shadow only in export clone.
  clone.querySelectorAll('.lineup-member-cell.is-cfes').forEach((cell) => {
    cell.style.boxShadow = 'none';
  });

  const originalMatrixWrap = targetEl.querySelector('.matrix-wrap');
  const cloneMatrixWrap = clone.querySelector('.matrix-wrap');
  if (originalMatrixWrap && cloneMatrixWrap) {
    const fullMatrixWidth = Math.max(originalMatrixWrap.scrollWidth, originalMatrixWrap.clientWidth);
    const fullMatrixHeight = Math.max(originalMatrixWrap.scrollHeight, originalMatrixWrap.clientHeight);
    cloneMatrixWrap.style.maxHeight = 'none';
    cloneMatrixWrap.style.height = `${fullMatrixHeight}px`;
    cloneMatrixWrap.style.width = `${fullMatrixWidth}px`;
    cloneMatrixWrap.style.overflow = 'visible';

    const cloneMatrixHeadCells = clone.querySelectorAll('.matrix-table thead th, .matrix-table th:first-child, .matrix-table td:first-child');
    cloneMatrixHeadCells.forEach((cell) => {
      cell.style.position = 'static';
      cell.style.left = 'auto';
      cell.style.top = 'auto';
    });

    const panelPadding = 28;
    clone.style.width = `${Math.max(Math.ceil(rect.width), fullMatrixWidth + panelPadding)}px`;
  }

  const originalSongLists = targetEl.querySelectorAll('.song-list');
  const cloneSongLists = clone.querySelectorAll('.song-list');
  cloneSongLists.forEach((listEl, idx) => {
    const source = originalSongLists[idx];
    const fullHeight = source ? Math.max(source.scrollHeight, source.clientHeight) : listEl.scrollHeight;
    listEl.style.maxHeight = 'none';
    listEl.style.height = `${fullHeight}px`;
    listEl.style.overflow = 'visible';
  });

  document.body.appendChild(clone);
  await waitNextPaint();
  return clone;
};

const resolveExportElementById = (id) => {
  const targetId = String(id || '').trim();
  if (!targetId) return null;

  const exact = document.getElementById(targetId);
  if (!exact) return null;
  if (exact.classList.contains('card-panel') || exact.classList.contains('record-block') || exact.classList.contains('festival-card') || exact.classList.contains('lineup-card') || exact.classList.contains('support-card')) {
    return exact;
  }
  return exact.closest('.record-block, .festival-card, .lineup-card, .support-card, .card-panel');
};

const exportElementPng = async (id, title) => {
  if (isExportingPng.value) return;
  const targetEl = resolveExportElementById(id);
  if (!targetEl) {
    alert('未找到可导出的模块区域。');
    return;
  }

  isExportingPng.value = true;
  let cloneEl = null;
  try {
    cloneEl = await prepareExportClone(targetEl);
    const renderEl = cloneEl || targetEl;
    const renderHeight = Math.ceil(renderEl.scrollHeight || renderEl.clientHeight || 0);
    const exportPanelId = String(id || '').trim();
    const isLineupLikePanelExport = exportPanelId === 'panel-lineup' || exportPanelId === 'panel-support';
    const isMobileScreen = window.innerWidth <= 900;
    const renderScale = isLineupLikePanelExport
      ? (isMobileScreen
          ? (renderHeight > 8000 ? 1 : Math.max(1, Math.min(1.2, window.devicePixelRatio || 1)))
          : (renderHeight > 12000 ? Math.max(1.25, Math.min(1.6, window.devicePixelRatio || 1)) : Math.max(1.6, window.devicePixelRatio || 1)))
      : Math.max(2, window.devicePixelRatio || 1);
    const canvas = await html2canvas(renderEl, {
      backgroundColor: '#ffffff',
      scale: renderScale,
      useCORS: true,
      logging: false,
      width: Math.ceil(renderEl.scrollWidth || renderEl.clientWidth || 0),
      height: Math.ceil(renderEl.scrollHeight || renderEl.clientHeight || 0)
    });
    const fileName = sanitizeExportFileName(`pjsk_${title || id}_${formatExportTimestamp()}`);
    await triggerDownloadPng(canvas, fileName);
  } catch (error) {
    console.error('导出模块PNG失败', error);
    const idKey = String(id || '').trim();
    const isLineupPanel = idKey === 'panel-lineup' || idKey === 'panel-support';
    const isMobileScreen = window.innerWidth <= 900;
    if (isLineupPanel && isMobileScreen) {
      alert('导出失败。\n建议改用每个角色卡片右上角 PNG 按钮分批导出，或先收起其余属性后再导出总图。');
    } else {
      alert('导出PNG失败，请稍后重试。');
    }
  } finally {
    if (cloneEl && cloneEl.parentNode) {
      cloneEl.parentNode.removeChild(cloneEl);
    }
    isExportingPng.value = false;
  }
};

const matrixGroupClass = (idx, len) => ({
  'matrix-group-start': idx === 0,
  'matrix-group-end': idx === len - 1
});

const bindSectionObserver = async () => {
  if (sectionObserver) {
    sectionObserver.disconnect();
    sectionObserver = null;
  }

  await nextTick();
  const ids = navTargetIds.value;

  sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((e) => e.isIntersecting)
      .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
    if (visible.length > 0) {
      activeNavId.value = visible[0].target.id;
    }
  }, {
    root: null,
    rootMargin: '-25% 0px -60% 0px',
    threshold: [0.05, 0.2, 0.4]
  });

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });
};

onMounted(() => {
  updateMobileNavState();
  window.addEventListener('resize', updateMobileNavState);
  bindSectionObserver();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateMobileNavState);
  if (sectionObserver) sectionObserver.disconnect();
  if (matrixSortAnchorTimer) {
    clearTimeout(matrixSortAnchorTimer);
    matrixSortAnchorTimer = 0;
  }
});

const normalizeAttr = (attr) => {
  const map = {
    pure: 'Pure',
    cool: 'Cool',
    cute: 'Cute',
    happy: 'Happy',
    mysterious: 'Mysterious'
  };
  return map[String(attr || '').trim().toLowerCase()] || '';
};

const isNumericEventId = (eventId) => /^\d+$/.test(String(eventId || '').trim());

const isCardWithinLimit = (card, maxEid) => {
  const eid = String(card?.EventID || '').trim();
  if (eid === 'ori') return true;
  if (isNumericEventId(eid)) return Number(eid) <= Number(maxEid);
  return true;
};

const isEventRewardCard = (card) => {
  const rarity = String(card?.Rarity || '').trim();
  if (!['2', '3'].includes(rarity)) return false;
  // 默认按活动卡计算报酬；勾选后额外计入联动二/三星。
  if (isNumericEventId(card?.EventID)) return true;
  if (!includeCollabRewardCards.value) return false;
  return String(card?.Type || '').trim().toLowerCase() === 'collab';
};

const setBanEventTypeFilter = (targetType, checked) => {
  if (checked) {
    banEventTypeFilter.value = targetType;
    return;
  }
  if (banEventTypeFilter.value === targetType) {
    banEventTypeFilter.value = 'all';
  }
};

const setBannerEventTypeFilter = (targetType, checked) => {
  if (checked) {
    bannerEventTypeFilter.value = targetType;
    return;
  }
  if (bannerEventTypeFilter.value === targetType) {
    bannerEventTypeFilter.value = 'all';
  }
};

const setLimitedBanEventTypeFilter = (targetType, checked) => {
  if (checked) {
    limitedBanEventTypeFilter.value = targetType;
    return;
  }
  if (limitedBanEventTypeFilter.value === targetType) {
    limitedBanEventTypeFilter.value = 'all';
  }
};

const setFesLimitedBanEventTypeFilter = (targetType, checked) => {
  if (checked) {
    fesLimitedBanEventTypeFilter.value = targetType;
    return;
  }
  if (fesLimitedBanEventTypeFilter.value === targetType) {
    fesLimitedBanEventTypeFilter.value = 'all';
  }
};

const limitedBanCountMap = computed(() => {
  const map = {};
  const maxEid = safeMaxEventId.value;
  const typeFilter = limitedBanEventTypeFilter.value;

  (props.allEvents || []).forEach((ev) => {
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (eid > maxEid) return;

    const eventType = String(ev?.event_type || '').trim();
    if (typeFilter !== 'all' && eventType !== typeFilter) return;

    if (String(ev?.gacha_type || '').trim() !== '普通限定') return;

    const bannerName = normalizeBannerName(ev?.banner);
    if (!CHAR_ORDER[bannerName]) return;
    if (VS_NAMES.includes(bannerName)) return;
    map[bannerName] = (map[bannerName] || 0) + 1;
  });

  return map;
});

const limitedBanLastEventIdMap = computed(() => {
  const map = {};
  const maxEid = safeMaxEventId.value;
  const typeFilter = limitedBanEventTypeFilter.value;

  (props.allEvents || []).forEach((ev) => {
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (eid > maxEid) return;

    const eventType = String(ev?.event_type || '').trim();
    if (typeFilter !== 'all' && eventType !== typeFilter) return;

    if (String(ev?.gacha_type || '').trim() !== '普通限定') return;

    const bannerName = normalizeBannerName(ev?.banner);
    if (!CHAR_ORDER[bannerName]) return;
    if (VS_NAMES.includes(bannerName)) return;
    map[bannerName] = Math.max(Number(map[bannerName] || 0), eid);
  });

  return map;
});

const fesLimitedEventIdSet = computed(() => {
  const maxEid = safeMaxEventId.value;
  const fesEventIds = new Set();
  const result = new Set();

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinLimit(card, maxEid)) return;
    const eidRaw = String(card?.EventID || '').trim();
    if (!isNumericEventId(eidRaw)) return;
    const type = String(card?.Type || '').trim().toLowerCase();
    if (isFesCardType(type)) {
      fesEventIds.add(Number(eidRaw));
    }
  });

  (props.allEvents || []).forEach((ev) => {
    if (shouldSkipPredictEvent(ev)) return;
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (eid > maxEid) return;
    if (String(ev?.gacha_type || '').trim() !== '普通限定') return;
    if (!fesEventIds.has(eid)) return;
    result.add(eid);
  });

  return result;
});

const fesLimitedBanCountMap = computed(() => {
  const map = {};
  const targetEventIds = fesLimitedEventIdSet.value;
  const typeFilter = fesLimitedBanEventTypeFilter.value;
  if (!targetEventIds.size) return map;

  (props.allEvents || []).forEach((ev) => {
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (!targetEventIds.has(eid)) return;

    const eventType = String(ev?.event_type || '').trim();
    if (typeFilter !== 'all' && eventType !== typeFilter) return;

    const bannerName = normalizeBannerName(ev?.banner);
    if (!CHAR_ORDER[bannerName]) return;
    if (VS_NAMES.includes(bannerName)) return;
    map[bannerName] = (map[bannerName] || 0) + 1;
  });

  return map;
});

const fesLimitedBanLastEventIdMap = computed(() => {
  const map = {};
  const targetEventIds = fesLimitedEventIdSet.value;
  const typeFilter = fesLimitedBanEventTypeFilter.value;
  if (!targetEventIds.size) return map;

  (props.allEvents || []).forEach((ev) => {
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (!targetEventIds.has(eid)) return;

    const eventType = String(ev?.event_type || '').trim();
    if (typeFilter !== 'all' && eventType !== typeFilter) return;

    const bannerName = normalizeBannerName(ev?.banner);
    if (!CHAR_ORDER[bannerName]) return;
    if (VS_NAMES.includes(bannerName)) return;
    map[bannerName] = Math.max(Number(map[bannerName] || 0), eid);
  });

  return map;
});

const bannerCountMap = computed(() => {
  const map = {};
  const maxEid = safeMaxEventId.value;
  const typeFilter = bannerEventTypeFilter.value;

  (props.allEvents || []).forEach((ev) => {
    if (shouldSkipPredictEvent(ev)) return;
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (eid > maxEid) return;

    const eventType = String(ev?.event_type || '').trim();
    if (!['箱活', '混活'].includes(eventType)) return;
    if (typeFilter !== 'all' && eventType !== typeFilter) return;

    const bannerName = normalizeBannerName(ev?.banner);
    if (!CHAR_ORDER[bannerName]) return;
    if (VS_NAMES.includes(bannerName)) return;
    map[bannerName] = (map[bannerName] || 0) + 1;
  });

  return map;
});

const bannerLastEventIdMap = computed(() => {
  const map = {};
  const maxEid = safeMaxEventId.value;
  const typeFilter = bannerEventTypeFilter.value;

  (props.allEvents || []).forEach((ev) => {
    if (shouldSkipPredictEvent(ev)) return;
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (eid > maxEid) return;

    const eventType = String(ev?.event_type || '').trim();
    if (!['箱活', '混活'].includes(eventType)) return;
    if (typeFilter !== 'all' && eventType !== typeFilter) return;

    const bannerName = normalizeBannerName(ev?.banner);
    if (!CHAR_ORDER[bannerName]) return;
    if (VS_NAMES.includes(bannerName)) return;
    map[bannerName] = Math.max(Number(map[bannerName] || 0), eid);
  });

  return map;
});

const now = new Date();
const nowStr = now.toLocaleDateString();

const toFiniteEventId = (value) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n > 0 ? n : null;
};


// 3. 自动计算“当前实际活动”的 ID (作为默认值)
const autoCurrentId = computed(() => {
  const today = new Date();
  const numericIds = (props.allEvents || [])
    .filter((ev) => {
      if (ev?.isPredict) return false;
      if (!isNumericEventId(ev?.id)) return false;
      const evDate = parseDateSafe(ev?.date);
      if (!evDate) return false;
      return evDate <= today;
    })
    .map((e) => Number(e.id));

  return numericIds.length > 0 ? Math.max(...numericIds) : 0;
});
// 4. 最终使用的截止 ID：如果用户没手动改过，就用自动计算的
const displayEventId = computed({
  get: () => {
    const syncId = toFiniteEventId(props.previewSyncEventId);
    const preferred = syncId ?? manualEventId.value ?? autoCurrentId.value;
    const n = toFiniteEventId(preferred);
    return n ?? 0;
  },
  set: (val) => {
    const n = toFiniteEventId(val);
    manualEventId.value = n ?? null;
  }
});

const updateDisplayEventIdDraft = () => {
  if (isEditingDisplayEventId.value) return;
  const n = toFiniteEventId(displayEventId.value);
  displayEventIdDraft.value = n == null ? '' : String(n);
};

const onDisplayEventIdFocus = () => {
  isEditingDisplayEventId.value = true;
};

const onDisplayEventIdInput = (rawVal) => {
  displayEventIdDraft.value = String(rawVal ?? '');
  const n = toFiniteEventId(displayEventIdDraft.value);
  manualEventId.value = n ?? null;
};

const adjustDisplayEventId = (delta) => {
  const cur = toFiniteEventId(displayEventIdDraft.value)
    ?? toFiniteEventId(displayEventId.value)
    ?? toFiniteEventId(autoCurrentId.value)
    ?? 1;
  const next = Math.max(1, Number(cur) + Number(delta || 0));
  manualEventId.value = next;
  displayEventIdDraft.value = String(next);
  isEditingDisplayEventId.value = false;
};

const onDisplayEventIdBlur = () => {
  isEditingDisplayEventId.value = false;
  const n = toFiniteEventId(displayEventIdDraft.value);
  manualEventId.value = n ?? null;
  updateDisplayEventIdDraft();
};

const getTopBarState = () => ({
  displayEventId: Number(displayEventId.value || 0),
  displayEventIdDraft: String(displayEventIdDraft.value || ''),
  autoCurrentId: Number(autoCurrentId.value || 0),
  navCollapsed: !!navCollapsed.value,
  isNavTopLayout: !!isNavTopLayout.value
});

const setTopBarDisplayEventIdDraft = (rawVal) => {
  displayEventIdDraft.value = String(rawVal ?? '');
  const n = toFiniteEventId(displayEventIdDraft.value);
  manualEventId.value = n ?? null;
};

const applyTopBarDisplayEventId = (rawVal) => {
  if (rawVal !== undefined) {
    displayEventIdDraft.value = String(rawVal ?? '');
  }
  const n = toFiniteEventId(displayEventIdDraft.value);
  manualEventId.value = n ?? null;
  isEditingDisplayEventId.value = false;
  updateDisplayEventIdDraft();
  return Number(displayEventId.value || 0);
};

const adjustTopBarDisplayEventId = (delta) => {
  adjustDisplayEventId(delta);
  return Number(displayEventId.value || 0);
};

const resetTopBarDisplayEventId = () => {
  manualEventId.value = null;
  isEditingDisplayEventId.value = false;
  updateDisplayEventIdDraft();
  return Number(displayEventId.value || 0);
};

const toggleTopBarNavCollapsed = () => {
  setNavCollapsed(!navCollapsed.value);
  return !!navCollapsed.value;
};

watch(displayEventId, () => {
  updateDisplayEventIdDraft();
}, { immediate: true });

const safeMaxEventId = computed(() => {
  const n = toFiniteEventId(displayEventId.value);
  return n ?? 0;
});

const includePredictEventsInStats = computed(() => Number(safeMaxEventId.value) > Number(autoCurrentId.value));

const shouldSkipPredictEvent = (ev) => !!(ev?.isPredict && !includePredictEventsInStats.value);

const allEventsById = computed(() => {
  const map = {};
  (props.allEvents || []).forEach((ev) => {
    if (!isNumericEventId(ev?.id)) return;
    map[Number(ev.id)] = ev;
  });
  return map;
});

const referenceDateObj = computed(() => {
  const fallback = new Date();
  const maxEid = Number(safeMaxEventId.value);
  if (!Number.isFinite(maxEid) || maxEid <= 0) return fallback;
  if (maxEid === Number(autoCurrentId.value)) return fallback;

  const refEvent = allEventsById.value[maxEid];
  const refDate = parseDateSafe(refEvent?.date);
  return refDate || fallback;
});

const referenceDateStr = computed(() => {
  const d = referenceDateObj.value;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
});

const eventsById = computed(() => {
  const map = {};
  (props.allEvents || []).forEach((ev) => {
    if (shouldSkipPredictEvent(ev)) return;
    if (!isNumericEventId(ev?.id)) return;
    map[Number(ev.id)] = ev;
  });
  return map;
});

const validPeriodEventIds = computed(() => {
  const maxEid = safeMaxEventId.value;
  return (props.allEvents || [])
    .filter((ev) => {
      if (shouldSkipPredictEvent(ev)) return false;
      if (!isNumericEventId(ev?.id)) return false;
      if (Number(ev.id) > maxEid) return false;
      return !EXCLUDED_PERIOD_EVENT_TYPES.has(String(ev?.event_type || '').trim());
    })
    .map((ev) => Number(ev.id))
    .sort((a, b) => a - b);
});

const validPeriodEvents = computed(() => {
  const idSet = new Set(validPeriodEventIds.value);
  return (props.allEvents || [])
    .filter((ev) => {
      if (shouldSkipPredictEvent(ev)) return false;
      if (!isNumericEventId(ev?.id)) return false;
      return idSet.has(Number(ev.id));
    })
    .map((ev) => ({
      id: Number(ev.id),
      dateObj: parseDateSafe(ev.date)
    }))
    .filter((ev) => ev.dateObj)
    .sort((a, b) => a.id - b.id);
});

const countPeriodsBetweenExclusive = (startEvent, endEvent) => {
  const startId = Number(startEvent?.id);
  const endId = Number(endEvent?.id);
  if (Number.isFinite(startId) && Number.isFinite(endId)) {
    return validPeriodEventIds.value.filter((id) => id > startId && id < endId).length;
  }

  const startDate = parseDateSafe(startEvent?.date);
  const endDate = parseDateSafe(endEvent?.date);
  if (!startDate || !endDate) return 0;
  return validPeriodEvents.value.filter((ev) => ev.dateObj > startDate && ev.dateObj < endDate).length;
};

const countPeriodsSince = (eventRef) => {
  const eventId = Number(eventRef?.id ?? eventRef);
  const maxEid = Number(displayEventId.value);
  if (Number.isFinite(eventId)) {
    return validPeriodEventIds.value.filter((id) => id > eventId && id <= maxEid).length;
  }

  const startDate = parseDateSafe(eventRef?.date);
  if (!startDate) return 0;
  return validPeriodEvents.value.filter((ev) => ev.dateObj > startDate).length;
};

const LINEUP_SKILL_BASE = Object.freeze({
  bfes_up: 160,
  cfes: 140,
  p_score: 130,
  score_up: 120,
  accuracy: 100,
  recovery: 100,
  unit_score: 100,
  default: 120
});
const LINEUP_ATTR_BG = Object.freeze({
  Cool: '#4b48e9',
  Cute: '#f35c9b',
  Pure: '#17a159',
  Happy: '#ff8719',
  Mysterious: '#8e65c2'
});
const LINEUP_BASE_ALPHA = 0.15;
const LINEUP_FES_ALPHA = Object.freeze({ cfes: 0.2, bfes: 0.35 });
// NOTE(wl-heuristic-2026-04): WL 计算为了移动端性能，当前强制“VS只看原v”，
// 并把 OC 的候选卡裁剪为 BFES/团分（unit_score，按150视作稳定触发）。
// 若后续出现高倍率的非原v/CFES/P分卡，再回退这组筛选即可。
const WL_OC_UNIT_SCORE_BASE = 150;
const WL_OC_ALLOWED_SKILLS = new Set(['bfes_up', 'unit_score']);
const WL_OC_FALLBACK_SKILLS = new Set(['bfes_up', 'unit_score', 'p_score', 'score_up', 'default']);

const makeLineupFesBg = (alpha) => {
  const a = Math.max(0, Math.min(1, Number(alpha)));
  return `linear-gradient(45deg, rgba(253,124,193,${a}) 0%, rgba(135,192,255,${a}) 50%, rgba(248,255,135,${a}) 100%)`;
};

const getCardBaseName = (cardName) => String(cardName || '').trim().split(/\s+/)[0] || '';

const getLineupCardId = (name) => `lineup-card-${getCharAbbr(name).toLowerCase()}`;
const getSupportCardId = (unit) => `support-card-${String(unit || '').toLowerCase()}`;

const getSupportMemberIconKey = (slot) => {
  const baseName = String(slot?.name || '').trim().split(/\s+/)[0] || '';
  if (!baseName) return '';

  const baseAbbr = CHAR_MAP[baseName] || getCharAbbr(baseName);
  if (!VS_NAMES.includes(baseName)) return baseAbbr;

  const unit = String(slot?.unit || '').trim().toLowerCase();
  if (unit && unit !== 'vs') return `${String(baseAbbr).toLowerCase()}_${unit}`;
  return baseAbbr;
};

const getCharSingleMark = (name) => {
  const key = String(name || '').split(/\s+/)[0];
  return CHAR_SINGLE_MAP[key] || key;
};

const useSingleNameMark = computed(() => isMobileNav.value || navNameFormat.value === 'single');

const getDistNameLabel = (name) => {
  if (useSingleNameMark.value) return getCharSingleMark(name);
  return getCharAbbr(name);
};

const getLineupCardUnit = (card, baseName) => {
  if (isVirtualSinger(baseName)) {
    const aff = String(card?.Affiliation || '').trim().toLowerCase();
    if (aff && UNIT_COLORS[aff]) return aff;
    return 'vs';
  }
  return CHAR_UNIT_MAP[baseName] || 'vs';
};

const getLineupSkillInfo = (card) => {
  const skill = String(card?.Skill || '').trim().toLowerCase();
  const type = String(card?.Type || '').trim().toLowerCase();

  if (skill === 'bfes_up' || type === 'bfes') {
    return { kind: 'bfes_up', baseScore: LINEUP_SKILL_BASE.bfes_up, isUnitScore: false };
  }
  if (skill.startsWith('cfes') || type === 'cfes') {
    return { kind: 'cfes', baseScore: LINEUP_SKILL_BASE.cfes, isUnitScore: false };
  }
  if (skill === 'p_score') {
    return { kind: 'p_score', baseScore: LINEUP_SKILL_BASE.p_score, isUnitScore: false };
  }
  if (skill === 'score_up') {
    return { kind: 'score_up', baseScore: LINEUP_SKILL_BASE.score_up, isUnitScore: false };
  }
  if (skill === 'accuracy') {
    return { kind: 'accuracy', baseScore: LINEUP_SKILL_BASE.accuracy, isUnitScore: false };
  }
  if (skill === 'recovery') {
    return { kind: 'recovery', baseScore: LINEUP_SKILL_BASE.recovery, isUnitScore: false };
  }
  if (skill === 'unit_score') {
    return { kind: 'unit_score', baseScore: LINEUP_SKILL_BASE.unit_score, isUnitScore: true };
  }
  return { kind: 'default', baseScore: LINEUP_SKILL_BASE.default, isUnitScore: false };
};

const buildLineupEventRef = (card) => {
  const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
  if (!sourceKey) {
    return { eventRef: null, eventLabel: '-' };
  }
  if (!isNumericEventId(sourceKey)) {
    const label = SPECIAL_EVENT_KEY_LABELS[sourceKey] || sourceKey;
    return { eventRef: { id: sourceKey }, eventLabel: label };
  }
  const ev = eventsById.value[Number(sourceKey)];
  if (!ev) {
    if (Number(sourceKey) === 0) {
      return { eventRef: { id: 0, sourceKey: '0' }, eventLabel: '开服' };
    }
    return { eventRef: { id: Number(sourceKey) }, eventLabel: `ID ${sourceKey}` };
  }
  const eventRef = {
    id: Number(ev.id),
    date: ev.date,
    typeSeriesId: ev.type_series_id,
    eventType: String(ev.event_type || '').trim(),
    banner: String(ev.banner || '').trim(),
    unit: String(ev.unit || '').trim(),
    sourceKey: String(ev.id)
  };
  return { eventRef, eventLabel: getNonBanEventMark(eventRef) };
};

const getLineupEventMark = (eventRef, useSingleMark = false) => {
  if (!eventRef) return '-';
  const sourceKey = String(eventRef.sourceKey || eventRef.id || '').trim();
  if (!sourceKey) return '-';
  if (sourceKey === '0') return '开服';
  if (!isNumericEventId(sourceKey)) {
    return SPECIAL_EVENT_KEY_LABELS[sourceKey] || sourceKey;
  }

  const typeSeries = getTypeSeriesText(eventRef.typeSeriesId);
  const eventType = String(eventRef.eventType || '').trim();
  const shortType = getEventTypeShort(eventType);

  if (useSingleMark && (eventType === 'World Link' || eventType === 'World Link终章')) {
    if (eventType === 'World Link' && Number(typeSeries) === 3) {
      return eventRef.isFesCard ? 'wl3(fes)' : 'wl3';
    }
    const base = typeSeries ? `wl${typeSeries}` : 'wl';
    return eventRef.isFesCard ? `${base}(fes)` : base;
  }

  const bannerName = normalizeBannerName(eventRef.banner);
  const bannerMark = bannerName
    ? (useSingleMark ? getCharSingleMark(bannerName) : getCharAbbr(bannerName).toLowerCase())
    : '';
  const unitMark = String(eventRef.unit || '').trim().toLowerCase();

  if (eventType === 'World Link' || eventType === 'World Link终章') {
    if (eventType === 'World Link' && Number(typeSeries) === 3) {
      const base = `wl3${getWl3PartSuffix(eventRef)}`;
      return eventRef.isFesCard ? `${base}(fes)` : base;
    }
    const wlHead = bannerMark || unitMark || 'vs';
    const base = typeSeries ? `${wlHead} wl${typeSeries}` : `${wlHead} wl`;
    return eventRef.isFesCard ? `${base}(fes)` : base;
  }

  let base = '?';
  if (bannerMark && typeSeries) base = `${bannerMark}${typeSeries}${shortType}`;
  else if (bannerMark) base = `${bannerMark}${shortType}`;
  else if (unitMark && typeSeries) base = `${unitMark}${typeSeries}${shortType}`;
  else if (typeSeries) base = `${typeSeries}${shortType}`;
  else base = sourceKey;

  return eventRef.isFesCard ? `${base}(fes)` : base;
};

const getJumpLinkLabel = (eventRef, fallback = '-') => {
  if (!eventRef) return fallback || '-';
  const mark = getLineupEventMark(eventRef, useSingleNameMark.value);
  return mark || fallback || '-';
};

const calcLineupUnitScore = (unit, unitCountMap) => {
  const selfIncluded = Number(unitCountMap[unit] || 0);
  const others = Math.max(0, selfIncluded - 1);
  const bonus = (others * 10) + (others === 4 ? 10 : 0);
  return 100 + bonus;
};

const evalLineupMembers = (cards) => {
  const unitCountMap = cards.reduce((map, card) => {
    map[card.unit] = Number(map[card.unit] || 0) + 1;
    return map;
  }, {});

  const members = cards.map((card) => {
    const score = card.isUnitScore ? calcLineupUnitScore(card.unit, unitCountMap) : card.baseScore;
    return {
      ...card,
      score
    };
  });

  const baseTotal = members.reduce((sum, m) => sum + m.score, 0);
  const captainBonus = members.length ? Math.max(...members.map((m) => m.score)) : 0;
  return { total: baseTotal + captainBonus, members };
};

const compareLineupSolvedHit = (nextHit, bestHit) => {
  if (!bestHit) return true;
  if (nextHit.total !== bestHit.total) return nextHit.total > bestHit.total;

  const nextBfes = nextHit.members.filter((m) => m.fesKind === 'bfes').length;
  const bestBfes = bestHit.members.filter((m) => m.fesKind === 'bfes').length;
  if (nextBfes !== bestBfes) return nextBfes > bestBfes;

  const nextCfes = nextHit.members.filter((m) => m.fesKind === 'cfes').length;
  const bestCfes = bestHit.members.filter((m) => m.fesKind === 'cfes').length;
  if (nextCfes !== bestCfes) return nextCfes > bestCfes;

  const nextNewest = Math.max(...nextHit.members.map((m) => Number(m.eventRef?.id || 0)));
  const bestNewest = Math.max(...bestHit.members.map((m) => Number(m.eventRef?.id || 0)));
  return nextNewest > bestNewest;
};

const solveSingleCharLineup = (cards) => {
  const source = [...(cards || [])];
  if (!source.length) return null;

  const teamSize = Math.min(5, source.length);
  let best = null;
  const selected = [];

  const dfs = (startIdx) => {
    const need = teamSize - selected.length;
    if (need === 0) {
      const hit = evalLineupMembers(selected);
      if (compareLineupSolvedHit(hit, best)) {
        best = hit;
      }
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

const buildLineupPlan = (captainName, attr, attrPool) => {
  const cards = [...(attrPool?.[attr]?.[captainName] || [])];
  const solved = solveSingleCharLineup(cards);
  if (!solved) return null;

  const orderedMembers = [...solved.members].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Number(b.eventRef?.id || 0) - Number(a.eventRef?.id || 0);
  });

  const memberSlots = [...orderedMembers];
  while (memberSlots.length < 5) memberSlots.push(null);

  return {
    attr,
    total: solved.total,
    bfesCount: orderedMembers.filter((m) => m.fesKind === 'bfes').length,
    cfesCount: orderedMembers.filter((m) => m.fesKind === 'cfes').length,
    members: orderedMembers,
    memberSlots
  };
};

const compareLineupCardForPick = (a, b) => {
  if ((b?.baseScore || 0) !== (a?.baseScore || 0)) return (b?.baseScore || 0) - (a?.baseScore || 0);
  const aBfes = a?.fesKind === 'bfes' ? 1 : 0;
  const bBfes = b?.fesKind === 'bfes' ? 1 : 0;
  if (bBfes !== aBfes) return bBfes - aBfes;
  const aCfes = a?.fesKind === 'cfes' ? 1 : 0;
  const bCfes = b?.fesKind === 'cfes' ? 1 : 0;
  if (bCfes !== aCfes) return bCfes - aCfes;
  return Number(b?.eventRef?.id || 0) - Number(a?.eventRef?.id || 0);
};

const compressSupportCards = (cards) => {
  const bestBySignature = {};
  (cards || []).forEach((card) => {
    const signature = [
      String(card?.unit || ''),
      Number(card?.baseScore || 0),
      card?.isUnitScore ? 1 : 0,
      String(card?.fesKind || ''),
      String(card?.skillKind || '')
    ].join('|');
    const prev = bestBySignature[signature];
    if (!prev || compareLineupCardForPick(card, prev) < 0) {
      bestBySignature[signature] = card;
    }
  });
  return Object.values(bestBySignature).sort(compareLineupCardForPick);
};

const evalSupportMembers = (cards) => {
  const lineupHit = evalLineupMembers(cards);
  const orderedMembers = [...lineupHit.members].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Number(b.eventRef?.id || 0) - Number(a.eventRef?.id || 0);
  });
  const captainScore = Number(orderedMembers[0]?.score || 0);
  const othersScore = orderedMembers.slice(1).reduce((sum, m) => sum + Number(m.score || 0), 0);
  const total = captainScore + (othersScore / 5);
  return {
    total,
    members: orderedMembers,
    captainScore,
    othersScore
  };
};

const compareSupportSolvedHit = (nextHit, bestHit, targetUnit) => {
  if (!bestHit) return true;

  if (compareLineupSolvedHit(nextHit, bestHit)) return true;
  if (compareLineupSolvedHit(bestHit, nextHit)) return false;

  if (targetUnit === 'vs') {
    const nextPureVs = nextHit.members.filter((m) => String(m?.unit || '').trim().toLowerCase() === 'vs').length;
    const bestPureVs = bestHit.members.filter((m) => String(m?.unit || '').trim().toLowerCase() === 'vs').length;
    if (nextPureVs !== bestPureVs) return nextPureVs > bestPureVs;
    return false;
  }

  const nextOcInUnit = nextHit.members.filter((m) => m.unit === targetUnit && !isVirtualSinger(String(m?.name || '').trim())).length;
  const bestOcInUnit = bestHit.members.filter((m) => m.unit === targetUnit && !isVirtualSinger(String(m?.name || '').trim())).length;
  if (nextOcInUnit !== bestOcInUnit) return nextOcInUnit > bestOcInUnit;

  const nextVsCount = nextHit.members.filter((m) => isVirtualSinger(String(m?.name || '').trim())).length;
  const bestVsCount = bestHit.members.filter((m) => isVirtualSinger(String(m?.name || '').trim())).length;
  if (nextVsCount !== bestVsCount) return nextVsCount < bestVsCount;

  return false;
};

const solveSupportLineup = (cardsByName, targetUnit) => {
  const entries = Object.entries(cardsByName || {})
    .map(([name, cards]) => ({
      name,
      // Keep all card options for a character; unit_score cards can outperform score_up after lineup composition.
      cards: compressSupportCards(cards)
    }))
    .filter((entry) => entry.cards.length > 0)
    .sort((a, b) => compareLineupCardForPick(b.cards[0], a.cards[0]));

  if (!entries.length) return null;

  const teamSize = Math.min(5, entries.length);
  let best = null;
  const selected = [];

  const dfs = (idx) => {
    const remainNeed = teamSize - selected.length;
    const remainEntries = entries.length - idx;
    if (remainNeed === 0) {
      const hit = evalSupportMembers(selected);
      if (compareSupportSolvedHit(hit, best, targetUnit)) best = hit;
      return;
    }
    if (remainEntries < remainNeed) return;
    if (idx >= entries.length) return;

    const entry = entries[idx];
    for (let i = 0; i < entry.cards.length; i += 1) {
      selected.push(entry.cards[i]);
      dfs(idx + 1);
      selected.pop();
    }

    dfs(idx + 1);
  };

  dfs(0);
  return best;
};

const buildSupportLineupPlan = (targetUnit, attr, supportPool) => {
  const cardsByName = supportPool?.[targetUnit]?.[attr] || {};
  const solved = solveSupportLineup(cardsByName, targetUnit);
  if (!solved) {
    return {
      attr,
      total: 0,
      members: [],
      memberSlots: [null, null, null, null, null]
    };
  }

  const memberSlots = [...solved.members];
  while (memberSlots.length < 5) memberSlots.push(null);

  return {
    attr,
    total: solved.total,
    members: solved.members,
    memberSlots
  };
};

const buildSupportWlPlan = (targetUnit, supportPool) => {
  const isVsTarget = targetUnit === 'vs';
  const isOcTarget = targetUnit !== 'vs';

  const buildWlAttrCandidateCards = (cardsByName, { strictOc = true, widen = false } = {}) => {
    const cards = Object.values(cardsByName || {}).flatMap((list) => Array.isArray(list) ? list : []);
    const normalized = cards
      .filter((card) => {
        const unit = String(card?.unit || '').trim().toLowerCase();
        const skillKind = String(card?.skillKind || '').trim().toLowerCase();

        // NOTE(wl-heuristic-2026-04): WL 行固定按“原v”统计，忽略“原v队”勾选，避免无效搜索空间。
        if (isVsTarget) return unit === 'vs';

        // NOTE(wl-heuristic-2026-04): OC 行仅保留 BFES/团分，未来若出现高倍率 CFES/P分再回退。
        if (isOcTarget) {
          if (unit !== targetUnit) return false;
          if (!strictOc) return true;
          return WL_OC_ALLOWED_SKILLS.has(skillKind);
        }

        return true;
      })
      .map((card) => {
        const skillKind = String(card?.skillKind || '').trim().toLowerCase();
        if (isOcTarget && skillKind === 'unit_score') {
          return { ...card, baseScore: WL_OC_UNIT_SCORE_BASE };
        }
        return card;
      });

    const sorted = [...normalized].sort(compareLineupCardForPick);
    if (!sorted.length) return [];

    const unitScoreCards = sorted.filter((card) => card?.isUnitScore).slice(0, widen ? 8 : 4);
    const bfesCards = sorted.filter((card) => card?.fesKind === 'bfes').slice(0, widen ? 8 : 4);
    const scoreCards = sorted
      .filter((card) => WL_OC_FALLBACK_SKILLS.has(String(card?.skillKind || '').trim().toLowerCase()))
      .slice(0, widen ? 8 : 4);
    const highBaseCards = sorted.slice(0, widen ? 9 : 5);

    const merged = [];
    const seen = new Set();
    const pushUnique = (card) => {
      const key = String(card?.cardId || '').trim() || `${String(card?.name || '').trim()}|${String(card?.attr || '').trim()}|${String(card?.unit || '').trim()}|${String(card?.skillKind || '').trim()}|${Number(card?.baseScore || 0)}`;
      if (!key || seen.has(key)) return;
      seen.add(key);
      merged.push(card);
    };

    unitScoreCards.forEach(pushUnique);
    bfesCards.forEach(pushUnique);
    scoreCards.forEach(pushUnique);
    highBaseCards.forEach(pushUnique);
    if (isVsTarget || !strictOc || widen) {
      sorted.forEach(pushUnique);
    }

    const limit = isVsTarget
      ? (widen ? 14 : 10)
      : (strictOc ? (widen ? 10 : 6) : (widen ? 14 : 10));
    return merged.slice(0, limit);
  };

  const buildAttrBuckets = (strictOc, widen) => ATTRS.map((attr) => {
    const cardsByName = supportPool?.[targetUnit]?.[attr] || {};
    return {
      attr,
      cards: buildWlAttrCandidateCards(cardsByName, { strictOc, widen })
    };
  });

  const solveByBuckets = (attrBuckets) => {
    if (attrBuckets.some((bucket) => bucket.cards.length === 0)) {
      return null;
    }

    let best = null;
    const selected = [];
    const usedNames = new Set();

    const dfs = (idx) => {
      if (idx >= attrBuckets.length) {
        if (selected.length !== ATTRS.length) return;
        const hit = evalSupportMembers(selected);
        if (compareSupportSolvedHit(hit, best, targetUnit)) best = hit;
        return;
      }

      const bucket = attrBuckets[idx];
      for (let i = 0; i < bucket.cards.length; i += 1) {
        const card = bucket.cards[i];
        const nameKey = String(card?.name || '').trim();
        if (!nameKey || usedNames.has(nameKey)) continue;
        usedNames.add(nameKey);
        selected.push(card);
        dfs(idx + 1);
        selected.pop();
        usedNames.delete(nameKey);
      }
    };

    dfs(0);
    return best;
  };

  let best = solveByBuckets(buildAttrBuckets(true, false));
  if (!best && isOcTarget) {
    // 回退策略：当严格筛选导致某团 WL 行无法成队时，放宽到同团全技能并扩大候选集。
    best = solveByBuckets(buildAttrBuckets(false, true));
  }
  if (!best && isVsTarget) {
    best = solveByBuckets(buildAttrBuckets(true, true));
  }

  if (!best) {
    return {
      attr: SUPPORT_WL_ATTR,
      total: 0,
      members: [],
      memberSlots: [null, null, null, null, null]
    };
  }

  const memberSlots = [...best.members];
  while (memberSlots.length < 5) memberSlots.push(null);

  return {
    attr: SUPPORT_WL_ATTR,
    total: best.total,
    members: best.members,
    memberSlots
  };
};

const getLineupRowStyle = (attr) => {
  if (String(attr || '').toLowerCase() === SUPPORT_WL_ATTR) {
    return {
      '--lineup-row-bg': 'transparent',
      '--lineup-row-border': 'rgba(71, 85, 105, 0.34)',
      '--lineup-row-fg': '#111827',
      '--lineup-row-fg-muted': '#64748b'
    };
  }
  const bg = LINEUP_ATTR_BG[attr] || '#64748b';
  const flatBg = hexToSoftSolid(bg, 1 - LINEUP_BASE_ALPHA);
  return {
    '--lineup-row-bg': flatBg,
    '--lineup-row-border': hexToRgba(bg, 0.38),
    '--lineup-row-fg': '#111827',
    '--lineup-row-fg-muted': '#64748b'
  };
};

const getLineupMemberCellStyle = (slot, attr) => {
  if (slot?.fesKind === 'bfes') {
    return {
      background: makeLineupFesBg(LINEUP_FES_ALPHA.bfes),
      borderColor: '#4c1d95',
      color: '#111827'
    };
  }
  if (slot?.fesKind === 'cfes') {
    return {
      background: makeLineupFesBg(LINEUP_FES_ALPHA.cfes),
      borderColor: '#ffffff',
      boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.18)',
      color: '#111827'
    };
  }
  return getLineupRowStyle(attr);
};

const lineupCardPoolByAttr = computed(() => {
  const maxEid = safeMaxEventId.value;
  const pool = Object.fromEntries(ATTRS.map((attr) => [attr, {}]));

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinLimit(card, maxEid)) return;
    if (String(card?.Rarity || '').trim() !== '4') return;

    const baseName = getCardBaseName(card?.Name);
    if (!baseName || !CHAR_ORDER[baseName]) return;

    const attr = normalizeAttr(card?.Attribute);
    if (!attr) return;

    const skillInfo = getLineupSkillInfo(card);
    const { eventRef, eventLabel } = buildLineupEventRef(card);
    const unit = getLineupCardUnit(card, baseName);

    if (!pool[attr][baseName]) pool[attr][baseName] = [];
    pool[attr][baseName].push({
      cardId: String(card?.CardID || ''),
      name: baseName,
      attr,
      unit,
      baseScore: skillInfo.baseScore,
      isUnitScore: skillInfo.isUnitScore,
      isFes: isFesSkillType(skillInfo.kind),
      fesKind: getFesKindBySkillKind(skillInfo.kind),
      skillKind: skillInfo.kind,
      eventRef,
      eventLabel
    });
  });

  return pool;
});

const characterLineupRows = computed(() => {
  const names = [...LINEUP_CHAR_NAMES.value];

  return names.map((name) => {
    const plans = ATTRS
      .map((attr) => buildLineupPlan(name, attr, lineupCardPoolByAttr.value))
      .filter(Boolean)
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        if ((b.bfesCount || 0) !== (a.bfesCount || 0)) return (b.bfesCount || 0) - (a.bfesCount || 0);
        if ((b.cfesCount || 0) !== (a.cfesCount || 0)) return (b.cfesCount || 0) - (a.cfesCount || 0);
        return ATTRS.indexOf(a.attr) - ATTRS.indexOf(b.attr);
      });

    if (!plans.length) {
      const emptyPlan = {
        attr: 'Pure',
        total: 0,
        members: [],
        memberSlots: [null, null, null, null, null]
      };
      return {
        name,
        bestPlan: emptyPlan,
        otherPlans: []
      };
    }

    return {
      name,
      bestPlan: plans[0],
      otherPlans: plans.slice(1)
    };
  });
});

const supportCardPoolByUnitAttr = computed(() => {
  const maxEid = safeMaxEventId.value;
  const pool = Object.fromEntries(
    SUPPORT_UNITS.map((unit) => [unit, Object.fromEntries(ATTRS.map((attr) => [attr, {}]))])
  );

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinLimit(card, maxEid)) return;
    if (String(card?.Rarity || '').trim() !== '4') return;

    const baseName = getCardBaseName(card?.Name);
    if (!baseName || !CHAR_ORDER[baseName]) return;

    const attr = normalizeAttr(card?.Attribute);
    if (!attr) return;

    const unit = getLineupCardUnit(card, baseName);
    const skillInfo = getLineupSkillInfo(card);
    const { eventRef, eventLabel } = buildLineupEventRef(card);

    SUPPORT_UNITS.forEach((targetUnit) => {
      if (targetUnit === 'vs') {
        if (!VS_NAMES.includes(baseName)) return;
        if (supportUseOriginalVsTeam.value && unit !== 'vs') return;
      } else if (unit !== targetUnit) {
        return;
      }

      if (!pool[targetUnit][attr][baseName]) pool[targetUnit][attr][baseName] = [];
      pool[targetUnit][attr][baseName].push({
        cardId: String(card?.CardID || ''),
        name: baseName,
        attr,
        unit,
        baseScore: skillInfo.baseScore,
        isUnitScore: skillInfo.isUnitScore,
        isFes: isFesSkillType(skillInfo.kind),
        fesKind: getFesKindBySkillKind(skillInfo.kind),
        skillKind: skillInfo.kind,
        eventRef,
        eventLabel
      });
    });
  });

  return pool;
});

const supportLineupRows = computed(() => {
  return SUPPORT_UNITS.map((unit) => {
    const plans = ATTRS
      .map((attr) => buildSupportLineupPlan(unit, attr, supportCardPoolByUnitAttr.value))
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return ATTRS.indexOf(a.attr) - ATTRS.indexOf(b.attr);
      });

    if (supportEnableWlLineup.value) {
      plans.push(buildSupportWlPlan(unit, supportCardPoolByUnitAttr.value));
    }

    return {
      unit,
      plans
    };
  });
});

const formatSupportTotal = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0';
  if (Math.abs(num - Math.round(num)) < 1e-9) return String(Math.round(num));
  return num.toFixed(1);
};

const lineupExpandedMap = ref({});

const isLineupExpanded = (name) => !!lineupExpandedMap.value[String(name || '')];

const lineupRowsWithOthers = computed(() => characterLineupRows.value.filter((row) => (row.otherPlans || []).length > 0));

const isLineupAllExpanded = computed(() => {
  if (!lineupRowsWithOthers.value.length) return false;
  return lineupRowsWithOthers.value.every((row) => isLineupExpanded(row.name));
});

const getLineupToggleLabel = (name, count = 0) => {
  const expanded = isLineupExpanded(name);
  if (isMobileNav.value) return expanded ? '收起' : '展开';
  return expanded ? '收起其余属性' : '展开其余属性';
};

const getLineupGlobalToggleLabel = () => {
  if (isMobileNav.value) return isLineupAllExpanded.value ? '全部收起' : '全部展开';
  return isLineupAllExpanded.value ? '收起其余属性（全部）' : '展开其余属性（全部）';
};

const toggleLineupExpanded = (name) => {
  const key = String(name || '');
  if (!key) return;
  lineupExpandedMap.value = {
    ...lineupExpandedMap.value,
    [key]: !lineupExpandedMap.value[key]
  };
};

const toggleLineupExpandedAll = () => {
  const target = !isLineupAllExpanded.value;
  const next = { ...lineupExpandedMap.value };
  lineupRowsWithOthers.value.forEach((row) => {
    next[row.name] = target;
  });
  lineupExpandedMap.value = next;
};

const getCardProgressOrderId = (card) => {
  const cardId = Number(String(card?.CardID || '').trim());
  if (Number.isFinite(cardId) && cardId > 0) return cardId;
  const eventId = Number(String(card?.EventID || '').trim());
  if (Number.isFinite(eventId) && eventId > 0) return eventId * 10000;
  return 0;
};

const getStatProgressOrderKey = (row, key) => {
  if (key === 'fourStarCount') return Number(row?.lastFourStarOrderId || 0);
  if (key === 'limitedCount') return Number(row?.lastLimitedOrderId || 0);
  if (key === 'fesLimitedCount') return Number(row?.lastFesLimitedOrderId || 0);
  if (key === 'scoreUpCount') return Number(row?.lastScoreUpOrderId || 0);
  if (key === 'pScoreCount') return Number(row?.lastPScoreOrderId || 0);
  if (key === 'pureScoreCount') return Number(row?.lastPureScoreOrderId || 0);
  if (key === 'recoveryCount') return Number(row?.lastRecoveryOrderId || 0);
  if (key === 'accuracyCount') return Number(row?.lastAccuracyOrderId || 0);
  if (key === 'threeStarCount') return Number(row?.lastThreeStarOrderId || 0);
  if (key === 'twoStarCount') return Number(row?.lastTwoStarOrderId || 0);
  if (key === 'rewardTotalCount') return Number(row?.lastRewardOrderId || 0);
  if (key === 'bannerCount') return Number(row?.lastBannerOrderId || 0);
  if (key === 'limitedBanCount') return Number(row?.lastLimitedBanOrderId || 0);
  if (key === 'fesLimitedBanCount') return Number(row?.lastFesLimitedBanOrderId || 0);
  return Number(row?.lastCardOrderId || 0);
};

// 2. 这里的计算属性直接指向完整的卡片源
const processedStats = computed(() => {
  const stats = {};
  const maxEid = safeMaxEventId.value; // 这里拿到的是基于日期计算出的 ID
  const cardsSource = props.allCards || []; // 使用 App.vue 传下来的全量卡片

  cardsSource.forEach(card => {
    const name = card.Name;
    // 基础过滤：排除无效数据
    if (!name || name === "-" || name === "CardID") return;

    // --- 核心修改：日期约束逻辑 ---
    // 逻辑：如果是活动卡 (有数字 EventID)，且 ID 大于当前正在进行的活动 ID，则跳过统计
    // 除非是初始卡 ("ori")，否则必须满足 EventID <= maxEid
    if (!isCardWithinLimit(card, maxEid)) {
      return; 
    }

    // 初始化角色的统计对象
    if (!stats[name]) {
      stats[name] = { 
        name, 
        affiliation: card.Affiliation || 'vs', 
        fourStarCount: 0, 
        limitedCount: 0,
        pScoreCount: 0,
        scoreUpCount: 0,
        twoStarCount: 0,
        threeStarCount: 0,
        rewardTwoCount: 0,
        rewardThreeCount: 0,
        bannerCount: 0,
        limitedBanCount: 0,
        fesLimitedCount: 0,
        fesLimitedBanCount: 0,
        accuracyCount: 0,
        recoveryCount: 0,
        unitScoreCount: 0,
        pendingSkillCount: 0,
        pureScoreCount: 0,
        lastCardOrderId: 0,
        lastFourStarOrderId: 0,
        lastLimitedOrderId: 0,
        lastPScoreOrderId: 0,
        lastScoreUpOrderId: 0,
        lastPureScoreOrderId: 0,
        lastRecoveryOrderId: 0,
        lastAccuracyOrderId: 0,
        lastThreeStarOrderId: 0,
        lastTwoStarOrderId: 0,
        lastRewardOrderId: 0,
        lastBannerOrderId: 0,
        lastLimitedBanOrderId: 0,
        lastFesLimitedOrderId: 0,
        lastFesLimitedBanOrderId: 0,
        attrCounts: { Pure: 0, Cool: 0, Cute: 0, Happy: 0, Mysterious: 0 }
      };
    }

    const eventIdRaw = String(card?.EventID || '').trim();
    const eventIdNum = isNumericEventId(eventIdRaw) ? Number(eventIdRaw) : null;
    const rarity = String(card.Rarity || '').trim();
    const skill = String(card.Skill || '').toLowerCase();
    const cardType = String(card?.Type || '').trim().toLowerCase();
    const attr = normalizeAttr(card.Attribute);
    const progressOrderId = getCardProgressOrderId(card);
    stats[name].lastCardOrderId = Math.max(Number(stats[name].lastCardOrderId || 0), progressOrderId);

    // 统计 4 星卡片及技能分类
    if (rarity === "4") {
      stats[name].fourStarCount++;
      stats[name].lastFourStarOrderId = Math.max(Number(stats[name].lastFourStarOrderId || 0), progressOrderId);

      if (eventIdNum !== null && fesLimitedEventIdSet.value.has(eventIdNum)) {
        const isFesCard = isFesCardType(cardType);
        if (fesLimitedIncludeFes.value || !isFesCard) {
          stats[name].fesLimitedCount++;
          stats[name].lastFesLimitedOrderId = Math.max(Number(stats[name].lastFesLimitedOrderId || 0), progressOrderId);
        }
      }

      if (skill === 'p_score') {
        stats[name].pScoreCount++;
        stats[name].lastPScoreOrderId = Math.max(Number(stats[name].lastPScoreOrderId || 0), progressOrderId);
      }
      if (skill === 'score_up') {
        stats[name].scoreUpCount++;
        stats[name].lastScoreUpOrderId = Math.max(Number(stats[name].lastScoreUpOrderId || 0), progressOrderId);
      }
      if (skill === 'accuracy') {
        stats[name].accuracyCount++;
        stats[name].lastAccuracyOrderId = Math.max(Number(stats[name].lastAccuracyOrderId || 0), progressOrderId);
      }
      if (skill === 'recovery') {
        stats[name].recoveryCount++;
        stats[name].lastRecoveryOrderId = Math.max(Number(stats[name].lastRecoveryOrderId || 0), progressOrderId);
      }
      if (skill === 'unit_score') stats[name].unitScoreCount++;
      if (!skill || skill === '-') stats[name].pendingSkillCount++;
      const excludedPureSkills = includeUnitScoreInPureScore.value
        ? ['accuracy', 'recovery', '-', '']
        : ['accuracy', 'recovery', 'unit_score', '-', ''];
      if (!excludedPureSkills.includes(skill)) {
        stats[name].lastPureScoreOrderId = Math.max(Number(stats[name].lastPureScoreOrderId || 0), progressOrderId);
      }

      if (attr) {
        stats[name].attrCounts[attr] += 1;
      }
    }

    if (rarity === '3') {
      stats[name].threeStarCount++;
      stats[name].lastThreeStarOrderId = Math.max(Number(stats[name].lastThreeStarOrderId || 0), progressOrderId);
    }
    if (rarity === '2') {
      stats[name].twoStarCount++;
      stats[name].lastTwoStarOrderId = Math.max(Number(stats[name].lastTwoStarOrderId || 0), progressOrderId);
    }

    if (isEventRewardCard(card)) {
      if (rarity === '3') stats[name].rewardThreeCount++;
      if (rarity === '2') stats[name].rewardTwoCount++;
      stats[name].lastRewardOrderId = Math.max(Number(stats[name].lastRewardOrderId || 0), progressOrderId);
    }

    // 统计限定卡片 (含 Fes 和 联名限定)
    if (LIMITED_TYPES.has(cardType)) {
      stats[name].limitedCount++;
      stats[name].lastLimitedOrderId = Math.max(Number(stats[name].lastLimitedOrderId || 0), progressOrderId);
    }
  });

  // 最后的汇总处理
  return Object.values(stats).map(s => {
    // 计算“纯分卡”数量：四星总数 - (判定 + 奶卡 + 团分)
    // 同时剔除技能待定的 4 星卡，避免被误记为分卡。
    const pureSubtract = includeUnitScoreInPureScore.value
      ? (s.accuracyCount + s.recoveryCount + s.pendingSkillCount)
      : (s.accuracyCount + s.recoveryCount + s.unitScoreCount + s.pendingSkillCount);
    s.pureScoreCount = s.fourStarCount - pureSubtract;
    s.rewardTotalCount = s.rewardThreeCount + s.rewardTwoCount;
    s.bannerCount = bannerCountMap.value[normalizeBannerName(s.name)] || 0;
    s.lastBannerOrderId = Number(bannerLastEventIdMap.value[normalizeBannerName(s.name)] || 0);
    s.limitedBanCount = limitedBanCountMap.value[normalizeBannerName(s.name)] || 0;
    s.lastLimitedBanOrderId = Number(limitedBanLastEventIdMap.value[normalizeBannerName(s.name)] || 0);
    s.fesLimitedBanCount = fesLimitedBanCountMap.value[normalizeBannerName(s.name)] || 0;
    s.lastFesLimitedBanOrderId = Number(fesLimitedBanLastEventIdMap.value[normalizeBannerName(s.name)] || 0);
    s.attrTotalCount = ATTRS.reduce((sum, a) => sum + s.attrCounts[a], 0);
    return s;
  });
});

const groupByCount = (data, key) => {
  const groups = {};
  data.forEach(char => {
    const count = char[key];
    if (!groups[count]) groups[count] = [];
    groups[count].push(char);
  });
  return Object.keys(groups)
    .map(count => ({
      count: parseInt(count, 10),
      chars: groups[count].sort((a, b) => {
        const ao = getStatProgressOrderKey(a, key);
        const bo = getStatProgressOrderKey(b, key);
        if (ao !== bo) return ao - bo;
        const ac = CHAR_ORDER[String(a?.name || '').split(/\s+/)[0]] || 999;
        const bc = CHAR_ORDER[String(b?.name || '').split(/\s+/)[0]] || 999;
        if (ac !== bc) return ac - bc;
        return String(a?.name || '').localeCompare(String(b?.name || ''), 'zh-Hans-CN');
      })
    }))
    .sort((a, b) => b.count - a.count);
};

const groupPanels = computed(() => [
  { id: 'four', title: '4星总数分布', cellClass: '', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'fourStarCount') },
  { id: 'limited', title: '限定总数分布', cellClass: 'lim', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'limitedCount') },
  { id: 'pure-score', title: '4星分卡数量分布', cellClass: 'pure-score', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'pureScoreCount') },
  { id: 'reward', title: '报酬总数分布', cellClass: 'reward', showRewardBreakdown: true, groups: groupByCount(processedStats.value, 'rewardTotalCount') },
  { id: 'p-score', title: '4星P分数量分布', cellClass: 'p-score', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'pScoreCount') },
  { id: 'score-up', title: '4星普分数量分布', cellClass: 'score-up', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'scoreUpCount') },
  { id: 'recovery', title: '4星奶卡数量分布', cellClass: 'recovery', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'recoveryCount') },
  { id: 'accuracy', title: '4星判卡数量分布', cellClass: 'accuracy', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'accuracyCount') },
  { id: 'three', title: '3星总数分布', cellClass: 'three-star', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'threeStarCount') },
  { id: 'two', title: '2星总数分布', cellClass: 'two-star', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'twoStarCount') },
  { id: 'banner', title: 'Banner数量分布', cellClass: 'banner', showRewardBreakdown: false,
    groups: groupByCount(
      processedStats.value.filter((row) => !VS_NAMES.includes(String(row?.name || '').trim().split(/\s+/)[0])),
      'bannerCount')
  },
  { id: 'limited-ban', title: '限Ban数量分布', cellClass: 'limited-ban', showRewardBreakdown: false, 
    groups: groupByCount(
      processedStats.value.filter((row) => !VS_NAMES.includes(String(row?.name || '').trim().split(/\s+/)[0])),
      'limitedBanCount')
  },
  { id: 'fes-limited', title: '百六限定次数分布', cellClass: 'fes-limited', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'fesLimitedCount') },
  { id: 'fes-limited-ban', title: '百六限Ban次数分布', cellClass: 'fes-limited-ban', showRewardBreakdown: false,
    groups: groupByCount(
      processedStats.value.filter((row) => !VS_NAMES.includes(String(row?.name || '').trim().split(/\s+/)[0])),
      'fesLimitedBanCount')
  }
]);

const festivalCharStats = computed(() => {
  const maxEid = safeMaxEventId.value;
  const allNames = Object.keys(CHAR_ORDER).sort((a, b) => (CHAR_ORDER[a] || 999) - (CHAR_ORDER[b] || 999));
  const eventFestivalMap = {};

  (props.allEvents || []).forEach((ev) => {
    if (shouldSkipPredictEvent(ev)) return;
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (eid > maxEid) return;
    const fest = String(ev?.festival || '').trim();
    if (!SPECIAL_FESTIVALS.includes(fest)) return;
    eventFestivalMap[eid] = fest;
  });

  const festCounts = Object.fromEntries(SPECIAL_FESTIVALS.map((fest) => [
    fest,
    {
      four: {},
      three: {},
      two: {},
      fourMeta: {},
      seenBase: new Set()
    }
  ]));

  (props.allCards || []).forEach((card) => {
    const eid = String(card?.EventID || '').trim();
    if (!isNumericEventId(eid)) return;
    const fest = eventFestivalMap[Number(eid)];
    if (!fest) return;

    const charName = buildFestivalCharKey(card);
    if (!charName) return;

    const baseName = parseFestivalCharKey(charName).baseName;
    if (!baseName) return;

    const type = String(card?.Type || '').trim().toLowerCase();
    const isFes = isFesCardType(type);
    if (isFes && !shouldCountFestivalFes(fest)) return;

    const rarity = String(card?.Rarity || '').trim();
    const festBucket = festCounts[fest];

    if (rarity === '4' || isFes) {
      festBucket.four[charName] = (festBucket.four[charName] || 0) + 1;
      if (!festBucket.fourMeta[charName]) {
        festBucket.fourMeta[charName] = { perm: 0, nonPerm: 0 };
      }
      if (type === 'perm') festBucket.fourMeta[charName].perm += 1;
      else festBucket.fourMeta[charName].nonPerm += 1;
      festBucket.seenBase.add(baseName);
      return;
    }
    if (rarity === '3') {
      festBucket.three[charName] = (festBucket.three[charName] || 0) + 1;
      festBucket.seenBase.add(baseName);
      return;
    }
    if (rarity === '2') {
      festBucket.two[charName] = (festBucket.two[charName] || 0) + 1;
      festBucket.seenBase.add(baseName);
    }
  });

  const buildCountRow = (countMap, options = {}) => Object.entries(countMap || {})
    .filter(([, count]) => Number(count) > 0)
    .map(([name, count]) => {
      const meta = options.fourMeta?.[name];
      const isPermOnly = !!meta && meta.perm > 0 && meta.nonPerm === 0;
      return { name, count: Number(count), isPermOnly };
    })
    .sort((a, b) => compareFestivalCharKey(a.name, b.name));
  const getFestivalBaseName = (charName) => parseFestivalCharKey(charName).baseName;

  const shouldMergeFestivalRows = (festival) => {
    const festKey = String(festival || '').trim();
    return !!festivalMergeToggles[festKey];
  };

  const applyFestivalMerge = (festival, rows) => {
    if (!shouldMergeFestivalRows(festival)) return rows;
    const fourRow = rows.find((row) => row.key === 'four') || { chars: [] };
    const threeRow = rows.find((row) => row.key === 'three') || { chars: [] };
    const twoRow = rows.find((row) => row.key === 'two') || { chars: [] };

    const fourBaseSet = new Set((fourRow.chars || []).map((item) => getFestivalBaseName(item.name)).filter(Boolean));
    const mergedThreeChars = (threeRow.chars || []).filter((item) => !fourBaseSet.has(getFestivalBaseName(item.name)));
    const threeBaseSet = new Set(mergedThreeChars.map((item) => getFestivalBaseName(item.name)).filter(Boolean));
    const mergedTwoChars = (twoRow.chars || []).filter((item) => {
      const base = getFestivalBaseName(item.name);
      if (!base) return false;
      return !fourBaseSet.has(base) && !threeBaseSet.has(base);
    });

    return rows.map((row) => {
      if (row.key === 'three') return { ...row, chars: mergedThreeChars };
      if (row.key === 'two') return { ...row, chars: mergedTwoChars };
      return row;
    });
  };

  return SPECIAL_FESTIVALS.map((fest) => {
    const festBucket = festCounts[fest];
    const rows = [
      { key: 'four', label: '4星', chars: buildCountRow(festBucket.four, { fourMeta: festBucket.fourMeta }) },
      { key: 'three', label: '3星', chars: buildCountRow(festBucket.three) },
      { key: 'two', label: '2星', chars: buildCountRow(festBucket.two) }
    ];

    const noneChars = allNames
      .filter((name) => !festBucket.seenBase.has(name))
      .map((name) => ({ name, count: 0 }));

    rows.push({ key: 'none', label: '未出', chars: noneChars });
    return { festival: fest, anchorId: FESTIVAL_ANCHOR_IDS[fest], rows: applyFestivalMerge(fest, rows) };
  });
});

const previewDailyLineupMap = computed(() => {
  const result = {};
  (characterLineupRows.value || []).forEach((row) => {
    const name = String(row?.name || '').trim();
    if (!name) return;
    // Keep exactly the same order as stats panel: bestPlan first, then otherPlans.
    const plans = [row?.bestPlan, ...(row?.otherPlans || [])]
      .filter(Boolean)
      .map((plan) => ({
        attr: String(plan?.attr || ''),
        total: Number(plan?.total || 0),
        memberScores: [...(plan?.memberSlots || [])]
          .slice(0, 5)
          .map((slot) => Number(slot?.score || 0)),
        memberFesKinds: [...(plan?.memberSlots || [])]
          .slice(0, 5)
          .map((slot) => String(slot?.fesKind || ''))
      }));
    result[name] = plans;
  });
  return result;
});

const statsPreviewPayload = computed(() => {
  const fourPanel = groupPanels.value.find((p) => p.id === 'four');
  const limitedPanel = groupPanels.value.find((p) => p.id === 'limited');
  const scoreUpPanel = groupPanels.value.find((p) => p.id === 'score-up');
  const limitedBanPanel = groupPanels.value.find((p) => p.id === 'limited-ban');
  const fesLimitedPanel = groupPanels.value.find((p) => p.id === 'fes-limited');
  const fesLimitedBanPanel = groupPanels.value.find((p) => p.id === 'fes-limited-ban');
  const festivalGroups = Object.fromEntries(
    (festivalCharStats.value || []).map((item) => [item.festival, item.rows || []])
  );
  return {
    maxEventId: safeMaxEventId.value,
    groups: {
      fourStarCount: fourPanel?.groups || [],
      limitedCount: limitedPanel?.groups || [],
      scoreUpCount: scoreUpPanel?.groups || [],
      limitedBanCount: limitedBanPanel?.groups || [],
      fesLimitedCount: fesLimitedPanel?.groups || [],
      fesLimitedBanCount: fesLimitedBanPanel?.groups || [],
      bannerCount: groupPanels.value.find((p) => p.id === 'banner')?.groups || [],
      festival: festivalGroups,
      dailyLineup: previewDailyLineupMap.value
    }
  };
});

watch(statsPreviewPayload, (payload) => {
  emit('stats-preview-update', payload);
}, { immediate: true });

const attrMatrixRows = computed(() => {
  const baseRows = [...processedStats.value]
    .sort((a, b) => (CHAR_ORDER[a.name] || 999) - (CHAR_ORDER[b.name] || 999))
    .map((s) => ({
      name: s.name,
      Pure: s.attrCounts.Pure,
      Cool: s.attrCounts.Cool,
      Cute: s.attrCounts.Cute,
      Happy: s.attrCounts.Happy,
      Mysterious: s.attrCounts.Mysterious,
      pureScoreCount: s.pureScoreCount,
      scoreUpCount: s.scoreUpCount,
      pScoreCount: s.pScoreCount,
      accuracyCount: s.accuracyCount,
      recoveryCount: s.recoveryCount,
      fourStarCount: s.fourStarCount,
      threeStarCount: s.threeStarCount,
      twoStarCount: s.twoStarCount,
      rewardTotalCount: s.rewardTotalCount
    }));

  const key = matrixSortKey.value;
  const order = matrixSortOrder.value;
  if (!key || !order) return baseRows;

  const orderFactor = order === 'desc' ? -1 : 1;
  return [...baseRows].sort((a, b) => {
    const av = Number(a?.[key] || 0);
    const bv = Number(b?.[key] || 0);
    if (av !== bv) return (av - bv) * orderFactor;
    return (CHAR_ORDER[a.name] || 999) - (CHAR_ORDER[b.name] || 999);
  });
});

const createMatrixStatSeed = (name) => ({
  name,
  fourStarCount: 0,
  pScoreCount: 0,
  twoStarCount: 0,
  threeStarCount: 0,
  rewardTwoCount: 0,
  rewardThreeCount: 0,
  accuracyCount: 0,
  recoveryCount: 0,
  unitScoreCount: 0,
  pendingSkillCount: 0,
  pureScoreCount: 0,
  scoreUpCount: 0,
  rewardTotalCount: 0,
  attrCounts: { Pure: 0, Cool: 0, Cute: 0, Happy: 0, Mysterious: 0 }
});

const parseVsMatrixRowName = (name) => {
  const [baseName, unitRaw] = String(name || '').trim().split(/\s+/);
  return {
    baseName,
    unit: String(unitRaw || '').toLowerCase()
  };
};

const compareVsMatrixName = (aName, bName) => {
  const a = parseVsMatrixRowName(aName);
  const b = parseVsMatrixRowName(bName);
  const au = VS_UNIT_SORT_ORDER.indexOf(a.unit);
  const bu = VS_UNIT_SORT_ORDER.indexOf(b.unit);
  const aUnitOrder = au >= 0 ? au : 999;
  const bUnitOrder = bu >= 0 ? bu : 999;
  if (aUnitOrder !== bUnitOrder) return aUnitOrder - bUnitOrder;
  const ac = CHAR_ORDER[a.baseName] || 999;
  const bc = CHAR_ORDER[b.baseName] || 999;
  if (ac !== bc) return ac - bc;
  return String(aName).localeCompare(String(bName), 'zh-Hans-CN');
};

const virtualSingerMatrixRows = computed(() => {
  const maxEid = safeMaxEventId.value;
  const matrixStats = {};

  VS_UNIT_SORT_ORDER.forEach((unit) => {
    VS_NAMES.forEach((vsName) => {
      const key = `${vsName} ${unit}`;
      matrixStats[key] = createMatrixStatSeed(key);
    });
  });

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinLimit(card, maxEid)) return;
    const baseName = String(card?.Name || '').trim();
    if (!VS_NAMES.includes(baseName)) return;
    const unit = String(card?.Affiliation || '').trim().toLowerCase();
    if (!VS_UNIT_SORT_ORDER.includes(unit)) return;

    const key = `${baseName} ${unit}`;
    const target = matrixStats[key];
    if (!target) return;

    const rarity = String(card?.Rarity || '').trim();
    const skill = String(card?.Skill || '').toLowerCase();
    const attr = normalizeAttr(card?.Attribute);

    if (rarity === '4') {
      target.fourStarCount += 1;
      if (skill === 'p_score') target.pScoreCount += 1;
      if (skill === 'score_up') target.scoreUpCount += 1;
      if (skill === 'accuracy') target.accuracyCount += 1;
      if (skill === 'recovery') target.recoveryCount += 1;
      if (skill === 'unit_score') target.unitScoreCount += 1;
      if (!skill || skill === '-') target.pendingSkillCount += 1;
      if (attr) target.attrCounts[attr] += 1;
    }

    if (rarity === '3') target.threeStarCount += 1;
    if (rarity === '2') target.twoStarCount += 1;

    if (isEventRewardCard(card)) {
      if (rarity === '3') target.rewardThreeCount += 1;
      if (rarity === '2') target.rewardTwoCount += 1;
    }
  });

  const baseRows = Object.values(matrixStats)
    .map((s) => {
      const pureSubtract = includeUnitScoreInPureScore.value
        ? (s.accuracyCount + s.recoveryCount + s.pendingSkillCount)
        : (s.accuracyCount + s.recoveryCount + s.unitScoreCount + s.pendingSkillCount);
      s.pureScoreCount = s.fourStarCount - pureSubtract;
      s.rewardTotalCount = s.rewardThreeCount + s.rewardTwoCount;
      return {
        name: s.name,
        Pure: s.attrCounts.Pure,
        Cool: s.attrCounts.Cool,
        Cute: s.attrCounts.Cute,
        Happy: s.attrCounts.Happy,
        Mysterious: s.attrCounts.Mysterious,
        unitScoreCount: s.unitScoreCount,
        pureScoreCount: s.pureScoreCount,
        scoreUpCount: s.scoreUpCount,
        pScoreCount: s.pScoreCount,
        accuracyCount: s.accuracyCount,
        recoveryCount: s.recoveryCount,
        fourStarCount: s.fourStarCount,
        threeStarCount: s.threeStarCount,
        twoStarCount: s.twoStarCount,
        rewardTotalCount: s.rewardTotalCount
      };
    })
    .sort((a, b) => compareVsMatrixName(a.name, b.name));

  const key = matrixSortKey.value;
  const order = matrixSortOrder.value;
  if (!key || !order) return baseRows;

  const orderFactor = order === 'desc' ? -1 : 1;
  return [...baseRows].sort((a, b) => {
    const av = Number(a?.[key] || 0);
    const bv = Number(b?.[key] || 0);
    if (av !== bv) return (av - bv) * orderFactor;
    return compareVsMatrixName(a.name, b.name);
  });
});

const attrMatrixTotalRow = computed(() => {
  const seed = {
    Pure: 0,
    Cool: 0,
    Cute: 0,
    Happy: 0,
    Mysterious: 0,
    unitScoreCount: 0,
    pureScoreCount: 0,
    scoreUpCount: 0,
    pScoreCount: 0,
    accuracyCount: 0,
    recoveryCount: 0,
    fourStarCount: 0,
    threeStarCount: 0,
    twoStarCount: 0,
    rewardTotalCount: 0
  };

  return (attrMatrixRows.value || []).reduce((acc, row) => {
    ATTRS.forEach((attr) => {
      acc[attr] += Number(row?.[attr] || 0);
    });
    acc.unitScoreCount += Number(row?.unitScoreCount || 0);
    acc.pureScoreCount += Number(row?.pureScoreCount || 0);
    acc.scoreUpCount += Number(row?.scoreUpCount || 0);
    acc.pScoreCount += Number(row?.pScoreCount || 0);
    acc.accuracyCount += Number(row?.accuracyCount || 0);
    acc.recoveryCount += Number(row?.recoveryCount || 0);
    acc.fourStarCount += Number(row?.fourStarCount || 0);
    acc.threeStarCount += Number(row?.threeStarCount || 0);
    acc.twoStarCount += Number(row?.twoStarCount || 0);
    acc.rewardTotalCount += Number(row?.rewardTotalCount || 0);
    return acc;
  }, seed);
});

const getVsUnitTotalTint = (unit) => hexToRgba(UNIT_COLORS[unit] || '#64748b', 0.2);

const virtualSingerUnitTotalRows = computed(() => {
  const unitRows = Object.fromEntries(VS_UNIT_SORT_ORDER.map((unit) => [unit, {
    unit,
    Pure: 0,
    Cool: 0,
    Cute: 0,
    Happy: 0,
    Mysterious: 0,
    unitScoreCount: 0,
    pureScoreCount: 0,
    scoreUpCount: 0,
    pScoreCount: 0,
    accuracyCount: 0,
    recoveryCount: 0,
    fourStarCount: 0,
    threeStarCount: 0,
    twoStarCount: 0,
    rewardTotalCount: 0
  }]));

  (virtualSingerMatrixRows.value || []).forEach((row) => {
    const unit = parseVsMatrixRowName(row?.name).unit;
    if (!unitRows[unit]) return;
    ATTRS.forEach((attr) => {
      unitRows[unit][attr] += Number(row?.[attr] || 0);
    });
    unitRows[unit].unitScoreCount += Number(row?.unitScoreCount || 0);
    unitRows[unit].pureScoreCount += Number(row?.pureScoreCount || 0);
    unitRows[unit].scoreUpCount += Number(row?.scoreUpCount || 0);
    unitRows[unit].pScoreCount += Number(row?.pScoreCount || 0);
    unitRows[unit].accuracyCount += Number(row?.accuracyCount || 0);
    unitRows[unit].recoveryCount += Number(row?.recoveryCount || 0);
    unitRows[unit].fourStarCount += Number(row?.fourStarCount || 0);
    unitRows[unit].threeStarCount += Number(row?.threeStarCount || 0);
    unitRows[unit].twoStarCount += Number(row?.twoStarCount || 0);
    unitRows[unit].rewardTotalCount += Number(row?.rewardTotalCount || 0);
  });

  const baseRows = VS_UNIT_SORT_ORDER.map((unit) => unitRows[unit]);
  const key = matrixSortKey.value;
  const order = matrixSortOrder.value;
  if (!key || !order) return baseRows;

  const orderFactor = order === 'desc' ? -1 : 1;
  return [...baseRows].sort((a, b) => {
    const av = Number(a?.[key] || 0);
    const bv = Number(b?.[key] || 0);
    if (av !== bv) return (av - bv) * orderFactor;
    const au = VS_UNIT_SORT_ORDER.indexOf(String(a?.unit || ''));
    const bu = VS_UNIT_SORT_ORDER.indexOf(String(b?.unit || ''));
    const ao = au >= 0 ? au : 999;
    const bo = bu >= 0 ? bu : 999;
    return ao - bo;
  });
});

const buildUnitAttrExtremes = (rows) => {
  const result = {};
  const unitBuckets = {};
  rows.forEach((row) => {
    const unit = getUnitByChar(row.name);
    if (!unitBuckets[unit]) unitBuckets[unit] = [];
    unitBuckets[unit].push(row);
  });

  Object.entries(unitBuckets).forEach(([unit, rows]) => {
    const values = rows.flatMap((r) => ATTRS.map((attr) => Number(r[attr]) || 0));
    const max = values.length ? Math.max(...values) : 0;
    const min = values.length ? Math.min(...values) : 0;
    result[unit] = { max, min };
  });

  return result;
};

const unitAttrExtremes = computed(() => buildUnitAttrExtremes(attrMatrixRows.value));

const getAttrExtremeClass = (attr, value, name) => {
  void attr;
  const unit = getUnitByChar(name);
  const range = unitAttrExtremes.value?.[unit];
  if (!range) return '';
  if (range.max !== range.min && value === range.max) return 'matrix-max';
  if (range.max !== range.min && value === range.min) return 'matrix-min';
  return '';
};

const getVsMatrixValueClass = (value) => (Number(value || 0) === 0 ? 'matrix-vs-zero' : '');

const charEventBuckets = computed(() => {
  const maxEid = safeMaxEventId.value;
  const maxEventDate = parseDateSafe(eventsById.value[maxEid]?.date);
  const buckets = {};

  (props.allCards || []).forEach((card) => {
    const name = String(card?.Name || '').trim();
    if (!name || name === '-' || name === 'CardID') return;
    if (!CHAR_ORDER[name]) return;
    if (!isCardWithinLimit(card, maxEid)) return;

    const eidRaw = String(card?.EventID || '').trim();
    const gachaRaw = String(card?.GachaID || '').trim();
    const sourceKey = eidRaw || gachaRaw;
    if (!sourceKey) return;

    const isNum = isNumericEventId(sourceKey);
    const eventIdOrKey = isNum ? Number(sourceKey) : sourceKey;
    const ev = isNum ? eventsById.value[Number(sourceKey)] : null;
    const cardDate = parseDateSafe(card?.Date);
    if (!isNum && maxEventDate && cardDate && cardDate > maxEventDate) return;

    if (!buckets[name]) {
      buckets[name] = {
        four: new Set(),
        limited: new Set(),
        eventMeta: {}
      };
    }

    if (!buckets[name].eventMeta[sourceKey]) {
      buckets[name].eventMeta[sourceKey] = {
        id: eventIdOrKey,
        date: String(ev?.date || card?.Date || ''),
        title: String(ev?.event_title || '').trim() || `ID ${sourceKey}`,
        typeSeriesId: ev?.type_series_id,
        eventType: String(ev?.event_type || '').trim(),
        banner: String(ev?.banner || '').trim(),
        unit: String(ev?.unit || '').trim() || String(card?.Affiliation || '').trim(),
        sourceKey,
        isFesCard: false
      };
    }

    if (isFesCardType(card?.Type)) {
      buckets[name].eventMeta[sourceKey].isFesCard = true;
    }

    if (String(card?.Rarity || '').trim() === '4') {
      buckets[name].four.add(sourceKey);
    }
    if (LIMITED_TYPES.has(String(card?.Type || '').toLowerCase())) {
      buckets[name].limited.add(sourceKey);
    }
  });

  const toEvents = (set, metaMap) => [...set]
    .map((key) => metaMap[key])
    .filter(Boolean)
    .sort((a, b) => {
      const da = parseDateSafe(a.date)?.getTime() || 0;
      const db = parseDateSafe(b.date)?.getTime() || 0;
      if (da !== db) return da - db;
      return String(a.sourceKey).localeCompare(String(b.sourceKey));
    });

  const result = {};
  Object.keys(buckets).forEach((name) => {
    result[name] = {
      four: toEvents(buckets[name].four, buckets[name].eventMeta),
      limited: toEvents(buckets[name].limited, buckets[name].eventMeta)
    };
  });
  return result;
});

const lastFourStarRecords = computed(() => {
  return Object.keys(charEventBuckets.value)
    .map((name) => {
      const arr = charEventBuckets.value[name].four;
      if (!arr.length) return null;
      const last = arr[arr.length - 1];
      return {
        name,
        eventId: Number(last.id),
        eventLabel: getNonBanEventMark(last),
        eventRef: last,
        date: last.date,
        months: monthsSince(last.date),
        periods: countPeriodsSince(last)
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const da = parseDateSafe(a.date)?.getTime() || 0;
      const db = parseDateSafe(b.date)?.getTime() || 0;
      // Older first (longer since last appearance should be on top)
      if (da !== db) return da - db;
      return compareCharOrder(a.name, b.name);
    });
});

const buildVsUnitKey = (baseName, unit) => `${baseName} ${unit}`;

const parseVsUnitKey = (key) => {
  const [baseName, unitRaw] = String(key || '').trim().split(/\s+/);
  const unit = String(unitRaw || '').toLowerCase();
  return { baseName, unit };
};

const getVsUnitLogoByKey = (key) => {
  const { unit } = parseVsUnitKey(key);
  return unitLogoMap[unit] || '';
};

const VS_UNIT_ROW_KEYS = VS_NAMES.flatMap((vsName) =>
  VS_UNIT_SORT_ORDER.map((unit) => buildVsUnitKey(vsName, unit))
);

const getVsUnitRecordLabel = (nameWithUnit) => {
  const [baseName, unitRaw] = String(nameWithUnit || '').trim().split(/\s+/);
  const baseAbbr = CHAR_MAP[baseName] || getCharAbbr(baseName);
  const unit = String(unitRaw || '').toUpperCase();
  return `${baseAbbr} ${unit}`;
};

const vsUnitLastFourRecords = computed(() => {
  const maxEid = safeMaxEventId.value;
  const maxEventDate = parseDateSafe(eventsById.value[maxEid]?.date);
  const latestByKey = {};

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinLimit(card, maxEid)) return;
    if (String(card?.Rarity || '').trim() !== '4') return;

    const fullName = String(card?.Name || '').trim();
    const baseName = fullName.split(/\s+/)[0] || fullName;
    if (!VS_NAMES.includes(baseName)) return;

    const unit = String(card?.Affiliation || '').trim().toLowerCase();
    if (!VS_UNIT_SORT_ORDER.includes(unit)) return;

    const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
    if (!sourceKey) return;

    const isNum = isNumericEventId(sourceKey);
    const ev = isNum ? eventsById.value[Number(sourceKey)] : null;
    const eventDateStr = String(ev?.date || card?.Date || '').trim();
    const eventDate = parseDateSafe(eventDateStr);
    if (!eventDate) return;
    if (!isNum && maxEventDate && eventDate > maxEventDate) return;

    const recordKey = buildVsUnitKey(baseName, unit);
    const prev = latestByKey[recordKey];
    const nextRecord = {
      key: recordKey,
      name: recordKey,
      label: getVsUnitRecordLabel(recordKey),
      eventRef: ev
        ? {
            id: Number(ev.id),
            date: ev.date,
            typeSeriesId: ev.type_series_id,
            eventType: String(ev.event_type || '').trim(),
            banner: String(ev.banner || '').trim(),
            unit: String(ev.unit || '').trim(),
            sourceKey: String(ev.id)
          }
        : null,
      eventLabel: ev
        ? getNonBanEventMark({
            id: Number(ev.id),
            typeSeriesId: ev.type_series_id,
            eventType: String(ev.event_type || '').trim(),
            banner: String(ev.banner || '').trim(),
            unit: String(ev.unit || '').trim(),
            sourceKey: String(ev.id)
          })
        : `ID ${sourceKey}`,
      date: eventDateStr,
      dateValue: eventDate.getTime(),
      days: daysBetween(eventDateStr, referenceDateStr.value),
      periods: ev ? countPeriodsSince({ id: Number(ev.id), date: ev.date }) : 0
    };

    if (!prev || nextRecord.dateValue > prev.dateValue) {
      latestByKey[recordKey] = nextRecord;
    }
  });

  return VS_UNIT_ROW_KEYS.map((key) => {
    const hit = latestByKey[key];
    if (hit) return hit;
    return {
      key,
      name: key,
      label: getVsUnitRecordLabel(key),
      eventRef: null,
      eventLabel: '-',
      date: '-',
      dateValue: 0,
      days: 0,
      periods: 0
    };
  });
});

const vsUnitLastFourRecordsSorted = computed(() => {
  const rows = [...vsUnitLastFourRecords.value];
  if (vsUnitLastFourSort.value === 'date-desc') {
    return rows.sort((a, b) => {
      const av = a.dateValue || 0;
      const bv = b.dateValue || 0;
      if (bv !== av) return bv - av;
      return VS_UNIT_ROW_KEYS.indexOf(a.key) - VS_UNIT_ROW_KEYS.indexOf(b.key);
    });
  }
  if (vsUnitLastFourSort.value === 'date-asc') {
    return rows.sort((a, b) => {
      const aMiss = !a.dateValue;
      const bMiss = !b.dateValue;
      if (aMiss !== bMiss) return aMiss ? 1 : -1;
      const av = a.dateValue || 0;
      const bv = b.dateValue || 0;
      if (av !== bv) return av - bv;
      return VS_UNIT_ROW_KEYS.indexOf(a.key) - VS_UNIT_ROW_KEYS.indexOf(b.key);
    });
  }
  return rows;
});

const vsUnitLastFourCompactRows = computed(() => {
  const rowMap = Object.fromEntries(
    VS_NAMES.map((name) => [name, { name, daysByUnit: Object.fromEntries(VS_UNIT_SORT_ORDER.map((u) => [u, 0])) }])
  );

  vsUnitLastFourRecords.value.forEach((item) => {
    const { baseName, unit } = parseVsUnitKey(item.key);
    if (!rowMap[baseName] || !VS_UNIT_SORT_ORDER.includes(unit)) return;
    rowMap[baseName].daysByUnit[unit] = Number(item.days || 0);
  });

  return VS_NAMES.map((name) => rowMap[name]);
});

const vsUnitScoreAttrRows = computed(() => {
  const maxEid = safeMaxEventId.value;
  const maxEventDate = parseDateSafe(eventsById.value[maxEid]?.date);
  const rowMap = Object.fromEntries(
    VS_NAMES.map((name) => [
      name,
      {
        name,
        attrsByUnit: Object.fromEntries(VS_UNIT_SORT_ORDER.map((u) => [u, []]))
      }
    ])
  );

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinLimit(card, maxEid)) return;
    const skill = String(card?.Skill || '').trim().toLowerCase();
    if (skill !== 'unit_score') return;

    const fullName = String(card?.Name || '').trim();
    const baseName = fullName.split(/\s+/)[0] || fullName;
    if (!VS_NAMES.includes(baseName)) return;

    const unit = String(card?.Affiliation || '').trim().toLowerCase();
    if (!VS_UNIT_SORT_ORDER.includes(unit)) return;

    const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
    if (!sourceKey) return;
    const isNum = isNumericEventId(sourceKey);
    const ev = isNum ? eventsById.value[Number(sourceKey)] : null;
    const eventDate = parseDateSafe(String(ev?.date || card?.Date || '').trim());
    if (!eventDate) return;
    if (!isNum && maxEventDate && eventDate > maxEventDate) return;

    const attr = normalizeAttr(card?.Attribute);
    if (!ATTRS.includes(attr)) return;
    rowMap[baseName].attrsByUnit[unit].push(attr);
  });

  return VS_NAMES.map((name) => rowMap[name]);
});

const vsUnitLastFourMaxDays = computed(() => {
  const values = vsUnitLastFourCompactRows.value
    .flatMap((row) => VS_UNIT_SORT_ORDER.map((u) => Number(row?.daysByUnit?.[u] || 0)))
    .filter((v) => v > 0);
  return values.length ? Math.max(...values) : 0;
});

const getVsMiniUnitHeadStyle = (unit) => ({
  backgroundColor: hexToRgba(UNIT_COLORS[unit] || '#9ca3af', 0.28)
});

const getVsMiniVsHeadStyle = (name) => ({
  backgroundColor: hexToRgba(getCharColor(name), 0.28)
});

const getVsScoreUnitHeadStyle = (unit) => ({
  backgroundColor: hexToRgba(UNIT_COLORS[unit] || '#9ca3af', 0.28)
});

const getVsScoreVsHeadStyle = (name) => ({
  backgroundColor: hexToRgba(getCharColor(name), 0.26)
});

const getVsScoreCellStyle = (name, unit) => ({
  backgroundImage: `linear-gradient(${hexToRgba(getCharColor(name), 0.12)}, ${hexToRgba(getCharColor(name), 0.12)}), linear-gradient(${hexToRgba(UNIT_COLORS[unit] || '#9ca3af', 0.12)}, ${hexToRgba(UNIT_COLORS[unit] || '#9ca3af', 0.12)})`,
  backgroundColor: '#f8fafc'
});

const getVsMiniDataCellStyle = (days) => {
  const d = Number(days || 0);
  if (d <= 0) {
    return {
      backgroundColor: 'rgb(245, 247, 250)',
      color: '#94a3b8'
    };
  }
  const maxDays = Math.max(1, Number(vsUnitLastFourMaxDays.value || 1));
  const ratio = Math.min(1, d / maxDays);
  const shade = Math.round(245 - (ratio * 95));
  const bg = `rgb(${shade}, ${shade}, ${shade})`;
  const fg = shade < 175 ? '#ffffff' : '#1f2937';
  return {
    backgroundColor: bg,
    color: fg,
    fontWeight: 700
  };
};

const getFesMatrixAttrHeadStyle = (attr) => ({
  backgroundColor: hexToRgba(ATTR_COLORS[attr] || '#94a3b8', 0.18)
});

const getFesMatrixUnitHeadStyle = (unit) => ({
  backgroundColor: hexToRgba(UNIT_COLORS[unit] || '#94a3b8', 0.2)
});

const getFesMatrixCellStyle = (unit, attr) => ({
  backgroundImage: `linear-gradient(${hexToRgba(UNIT_COLORS[unit] || '#94a3b8', 0.12)}, ${hexToRgba(UNIT_COLORS[unit] || '#94a3b8', 0.12)}), linear-gradient(${hexToRgba(ATTR_COLORS[attr] || '#94a3b8', 0.12)}, ${hexToRgba(ATTR_COLORS[attr] || '#94a3b8', 0.12)})`,
  backgroundColor: '#f8fafc'
});

const getFesMatrixTotalCellStyle = (attr) => ({
  backgroundColor: hexToRgba(ATTR_COLORS[attr] || '#94a3b8', 0.2),
  fontWeight: 800
});

const createFesIconRowsSeed = () => Object.fromEntries(
  RELATED_FES_UNITS.map((unit) => [
    unit,
    Object.fromEntries(ATTRS.map((attr) => [attr, []]))
  ])
);

const createFesIconSeenSeed = () => Object.fromEntries(
  RELATED_FES_UNITS.map((unit) => [
    unit,
    Object.fromEntries(ATTRS.map((attr) => [attr, new Set()]))
  ])
);

const buildFesRecordMatrix = (fesType) => {
  const maxEid = safeMaxEventId.value;
  const targetType = String(fesType || '').trim().toLowerCase();
  const iconRows = createFesIconRowsSeed();
  const seenRows = createFesIconSeenSeed();
  const totals = Object.fromEntries(ATTRS.map((attr) => [attr, 0]));

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinLimit(card, maxEid)) return;
    if (String(card?.Type || '').trim().toLowerCase() !== targetType) return;
    if (String(card?.Rarity || '').trim() !== '4') return;

    const baseName = getCardBaseName(card?.Name);
    if (!baseName || !CHAR_ORDER[baseName]) return;

    const attr = normalizeAttr(card?.Attribute);
    if (!ATTRS.includes(attr)) return;

    const unit = getLineupCardUnit(card, baseName);
    if (!RELATED_FES_UNITS.includes(unit)) return;

    totals[attr] += 1;

    const iconKey = getSupportMemberIconKey({ name: baseName, unit });
    const uniqueKey = `${baseName}|${iconKey}`;
    const seen = seenRows[unit]?.[attr];
    if (!seen || seen.has(uniqueKey)) return;

    seen.add(uniqueKey);
    iconRows[unit][attr].push({
      name: baseName,
      iconKey
    });
  });

  RELATED_FES_UNITS.forEach((unit) => {
    ATTRS.forEach((attr) => {
      iconRows[unit][attr].sort((a, b) => compareCharOrder(a.name, b.name));
    });
  });

  return {
    iconRows,
    totals
  };
};

const cfesRecordMatrix = computed(() => buildFesRecordMatrix('cfes'));
const bfesRecordMatrix = computed(() => buildFesRecordMatrix('bfes'));

const lastLimitedRecords = computed(() => {
  return Object.keys(charEventBuckets.value)
    .map((name) => {
      const arr = charEventBuckets.value[name].limited;
      if (!arr.length) return null;
      const last = arr[arr.length - 1];
      return {
        name,
        eventId: Number(last.id),
        eventLabel: getNonBanEventMark(last),
        eventRef: last,
        date: last.date,
        months: monthsSince(last.date),
        periods: countPeriodsSince(last)
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const da = parseDateSafe(a.date)?.getTime() || 0;
      const db = parseDateSafe(b.date)?.getTime() || 0;
      // Older first (longer since last appearance should be on top)
      if (da !== db) return da - db;
      return compareCharOrder(a.name, b.name);
    });
});

const fourStarIntervalRecords = computed(() => {
  const nowGapDate = referenceDateStr.value;
  return Object.keys(charEventBuckets.value)
    .map((name) => {
      const arr = charEventBuckets.value[name].four;
      if (!arr.length) return null;
      const ranges = buildGapRanges(arr, countPeriodsBetweenExclusive);
      const historicalRanges = [...ranges];
      const last = arr[arr.length - 1];
      ranges.push({
        startMark: getNonBanEventMark(last),
        endMark: '至今',
        startRef: last,
        endRef: null,
        startTypeSeriesId: last.typeSeriesId,
        endTypeSeriesId: 'NOW',
        startEventType: last.eventType,
        endEventType: '当前',
        days: daysBetween(last.date, nowGapDate),
        periods: countPeriodsSince(last)
      });
      return {
        name,
        longest: pickGapByPeriods(ranges, 'max'),
        shortest: pickGap(historicalRanges, 'min')
      };
    })
    .filter(Boolean);
});

const limitedIntervalRecords = computed(() => {
  const nowGapDate = referenceDateStr.value;
  return Object.keys(charEventBuckets.value)
    .map((name) => {
      const arr = charEventBuckets.value[name].limited;
      if (!arr.length) return null;
      const ranges = buildGapRanges(arr, countPeriodsBetweenExclusive);
      const historicalRanges = [...ranges];
      const last = arr[arr.length - 1];
      ranges.push({
        startMark: getNonBanEventMark(last),
        endMark: '至今',
        startRef: last,
        endRef: null,
        startTypeSeriesId: last.typeSeriesId,
        endTypeSeriesId: 'NOW',
        startEventType: last.eventType,
        endEventType: '当前',
        days: daysBetween(last.date, nowGapDate),
        periods: countPeriodsSince(last)
      });
      return {
        name,
        longest: pickGapByPeriods(ranges, 'max'),
        shortest: pickGap(historicalRanges, 'min')
      };
    })
    .filter(Boolean);
});

const fourStarLongestIntervals = computed(() => {
  return [...fourStarIntervalRecords.value].sort((a, b) => {
    if (b.longest.days !== a.longest.days) return b.longest.days - a.longest.days;
    if (b.longest.periods !== a.longest.periods) return b.longest.periods - a.longest.periods;
    return compareCharOrder(a.name, b.name);
  });
});

const fourStarShortestIntervals = computed(() => {
  return [...fourStarIntervalRecords.value].sort((a, b) => {
    const ad = a.shortest?.days ?? Number.POSITIVE_INFINITY;
    const bd = b.shortest?.days ?? Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;

    const ap = a.shortest?.periods ?? Number.POSITIVE_INFINITY;
    const bp = b.shortest?.periods ?? Number.POSITIVE_INFINITY;
    if (ap !== bp) return ap - bp;

    return compareCharOrder(a.name, b.name);
  });
});

const limitedLongestIntervals = computed(() => {
  return [...limitedIntervalRecords.value].sort((a, b) => {
    if (b.longest.days !== a.longest.days) return b.longest.days - a.longest.days;
    if (b.longest.periods !== a.longest.periods) return b.longest.periods - a.longest.periods;
    return compareCharOrder(a.name, b.name);
  });
});

const limitedShortestIntervals = computed(() => {
  return [...limitedIntervalRecords.value].sort((a, b) => {
    const ad = a.shortest?.days ?? Number.POSITIVE_INFINITY;
    const bd = b.shortest?.days ?? Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;

    const ap = a.shortest?.periods ?? Number.POSITIVE_INFINITY;
    const bp = b.shortest?.periods ?? Number.POSITIVE_INFINITY;
    if (ap !== bp) return ap - bp;

    return compareCharOrder(a.name, b.name);
  });
});

const banIntervalRecords = computed(() => {
  const maxEid = safeMaxEventId.value;
  const typeFilter = banEventTypeFilter.value;
  const nowGapDate = referenceDateStr.value;
  const bucket = {};

  (props.allEvents || []).forEach((ev) => {
    if (shouldSkipPredictEvent(ev)) return;
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (eid > maxEid) return;
    const eventType = String(ev?.event_type || '').trim();
    if (EXCLUDED_PERIOD_EVENT_TYPES.has(eventType)) return;
    if (typeFilter !== 'all' && eventType !== typeFilter) return;
    const name = normalizeBannerName(ev?.banner);
    if (!CHAR_ORDER[name]) return;
    if (VS_NAMES.includes(name)) return;

    if (!bucket[name]) bucket[name] = [];
    bucket[name].push({
      id: eid,
      date: String(ev?.date || ''),
      typeSeriesId: ev?.type_series_id,
      eventType
    });
  });

  return Object.keys(bucket)
    .map((name) => {
      const events = bucket[name].sort((a, b) => a.id - b.id);
      if (!events.length) {
        return { name, shortest: null, longest: null };
      }
      const ranges = buildGapRanges(events, countPeriodsBetweenExclusive);
      const historicalRanges = [...ranges];
      const last = events[events.length - 1];
      // Align with four/limited longest logic: include gap from latest ban to current reference date.
      ranges.push({
        startMark: `${getTypeSeriesText(last.typeSeriesId) || '?'}${getEventTypeShort(last.eventType)}`,
        endMark: '至今',
        startRef: last,
        endRef: null,
        startTypeSeriesId: last.typeSeriesId,
        endTypeSeriesId: 'NOW',
        startEventType: last.eventType,
        endEventType: '当前',
        days: daysBetween(last.date, nowGapDate),
        periods: countPeriodsSince(last)
      });
      return {
        name,
        shortest: pickGap(historicalRanges, 'min'),
        longest: pickGapByPeriods(ranges, 'max')
      };
    })
    .sort((a, b) => compareCharOrder(a.name, b.name));
});

const banLongestIntervals = computed(() => {
  return [...banIntervalRecords.value].sort((a, b) => {
    const ad = a.longest?.days ?? -1;
    const bd = b.longest?.days ?? -1;
    if (bd !== ad) return bd - ad;
    return compareCharOrder(a.name, b.name);
  });
});

const banShortestIntervals = computed(() => {
  return [...banIntervalRecords.value].sort((a, b) => {
    const ad = a.shortest?.days ?? Number.POSITIVE_INFINITY;
    const bd = b.shortest?.days ?? Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;
    return compareCharOrder(a.name, b.name);
  });
});

defineExpose({
  getTopBarState,
  setTopBarDisplayEventIdDraft,
  applyTopBarDisplayEventId,
  adjustTopBarDisplayEventId,
  resetTopBarDisplayEventId,
  toggleTopBarNavCollapsed
});
</script>

<style scoped>
.pjsk-stats {
  padding: 24px;
  color: #1f2937;
  background: linear-gradient(45deg, rgba(253, 124, 193, 0.30) 0%, rgba(135, 192, 255, 0.30) 50%, rgba(248, 255, 135, 0.30) 100%);
  min-height: 100vh;
  --matrix-sticky-top: 0px;
  --stats-radius-panel: 18px;
  --stats-radius-btn: 12px;
  --stats-nav-width: 220px;
  --stats-nav-left: 44px;
  --stats-nav-top: 78px;
}

.pjsk-stats.matrix-sort-anchor-suppressed {
  overflow-anchor: none;
}

.pjsk-stats button:not(:disabled) {
  transition: filter 0.16s ease, transform 0.16s ease, background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.pjsk-stats button:not(:disabled):active {
  filter: brightness(0.86);
  transform: translateY(1px) scale(0.97);
}

.stats-layout {
  display: grid;
  grid-template-columns: var(--stats-nav-width) 1fr;
  gap: 16px;
}

.stats-layout.nav-collapsed {
  grid-template-columns: 1fr;
}

.stats-layout.nav-collapsed .stats-nav {
  display: none;
}

.stats-layout:not(.nav-collapsed) .stats-main {
  grid-column: 2;
}

.stats-nav {
  position: fixed;
  top: var(--stats-nav-top);
  left: var(--stats-nav-left);
  width: var(--stats-nav-width);
  height: calc(100vh - var(--stats-nav-top) - 10px);
  max-height: calc(100vh - var(--stats-nav-top) - 10px);
  min-height: 0;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 10;
}

.nav-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  padding-bottom: 4px;
  padding-right: 2px;
}

.nav-quick-wrap {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: var(--stats-radius-panel);
  background: #ffffff;
  padding: 8px 6px 6px;
}

.nav-cutoff {
  border: 1px solid #e5e7eb;
  border-radius: var(--stats-radius-panel);
  background: #ffffff;
  padding: 8px;
}

.nav-name-format {
  border: 1px solid #e5e7eb;
  border-radius: var(--stats-radius-panel);
  background: #ffffff;
  padding: 8px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: nowrap;
}

.nav-name-format-title {
  font-size: 0.76rem;
  font-weight: 700;
  color: #374151;
  margin: 0;
  white-space: nowrap;
}

.nav-name-format-options {
  display: inline-flex;
  gap: 10px;
  flex-wrap: nowrap;
}

.nav-name-format-option {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.74rem;
  color: #374151;
}

.nav-cutoff-title {
  font-size: 0.76rem;
  font-weight: 700;
  color: #374151;
  margin-bottom: 6px;
}

.nav-cutoff-controls {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 8px;
}

.nav-group:last-child {
  margin-bottom: 0;
}

.nav-collapse-fab {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  min-height: 32px;
  height: 32px;
  padding: 0;
  border: 2px solid #b91c1c;
  border-radius: 999px;
  background: #ef4444;
  cursor: pointer;
  font-weight: 700;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

.nav-collapse-fab-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  display: block;
  filter: brightness(0) saturate(100%) invert(100%);
}

.floating-menu-btn {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 54px);
  left: 8px;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 2px solid #0f766e;
  background: #33ccbb;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.2);
  color: #f8fafc;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 4300;
  padding: 0;
  cursor: pointer;
}

.floating-menu-icon {
  width: 17px;
  height: 17px;
  object-fit: contain;
  display: block;
  filter: brightness(0) saturate(100%) invert(96%) sepia(6%) saturate(243%) hue-rotate(182deg) brightness(103%) contrast(96%);
}

.nav-link {
  width: 100%;
  text-align: left;
  min-height: 32px;
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  font-size: 0.82rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-link-main {
  font-weight: 700;
  border-color: #d1d5db;
}

.nav-sub-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-link-sub {
  padding: 5px 12px 5px 24px;
  font-size: 0.78rem;
}

.nav-collapse-fab:hover,
.id-step-btn:hover,
.reset-mini-btn:hover,
.nav-link:hover,
.lineup-toggle-btn:hover,
.record-sort-btn:hover:not(.active) {
  background: #e5e7eb;
}

.nav-collapse-fab:hover {
  background: #dc2626;
}

.nav-link.active {
  background: #dbeafe;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.stats-main {
  min-width: 0;
}

.stats-main-head {
  margin-bottom: 6px;
}

.section-head,
.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.card-export-btn {
  border: 1px solid #cbd5e1;
  border-radius: var(--stats-radius-btn);
  background: #f8fafc;
  color: #334155;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 8px;
  line-height: 1;
  cursor: pointer;
  flex: 0 0 auto;
}

.card-export-btn:hover:not(:disabled) {
  background: #e2e8f0;
}

.card-export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.stats-main-head h1,
.section-head h2,
.block-head h3 {
  margin: 0;
}

.section-head-sub h2 {
  font-size: 1.02rem;
}

.section-head.section-head-sub {
  margin-bottom: 8px;
  align-items: flex-start;
}

.section-head.section-head-sub .card-export-btn {
  align-self: flex-start;
}

.section-head-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.block-head-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.head-inline-filters {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.head-filter-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #475569;
  font-weight: 700;
  white-space: nowrap;
  user-select: none;
  line-height: 1;
}

.head-filter-toggle input {
  margin: 0;
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  position: relative;
  top: -1px;
}

@media (max-width: 760px) {
  .section-head.section-head-sub {
    align-items: center;
    margin-bottom: 8px;
    padding-top: 2px;
  }

  .section-head.section-head-sub .card-export-btn {
    align-self: center;
  }

  .section-head-left,
  .head-inline-filters {
    gap: 6px;
  }

  .head-filter-toggle,
  .reward-collab-toggle,
  .festival-merge-toggle,
  .festival-hide-name-toggle {
    font-size: 0.7rem;
  }
}

.section-main {
  margin-bottom: 18px;
}

.pjsk-stats h1 {
  margin-top: 0;
  margin-bottom: 14px;
}



/* 2x2 网格布局 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 20px;
  align-items: flex-start;
}

.stats-section { flex: 1; }

.card-panel {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: var(--stats-radius-panel);
  padding: 14px;
  box-shadow: 0 6px 20px rgba(17, 24, 39, 0.06);
}

.card-panel h2 {
  margin-top: 0;
  margin-bottom: 0;
  font-size: 1.05rem;
}

.count-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.count-table th, .count-table td {
  border: 1px solid #f0f0f0;
  padding: 8px;
  text-align: left;
}

.count-cell {
  font-size: 1.5em;
  font-weight: bold;
  text-align: center;
  background: #fafafa;
  color: #444;
}

.count-cell.lim { color: #ff4d4f; }
.count-cell.p-score { color: #eb2f96; }
.count-cell.score-up { color: #fa8c16; }
.count-cell.pure-score { color: #f5222d; }
.count-cell.reward { color: #f97316; }
.count-cell.banner { color: #7c3aed; }
.count-cell.limited-ban { color: #0f766e; }
.count-cell.fes-limited { color: #dc2626; }
.count-cell.fes-limited-ban { color: #9333ea; }
.count-cell.three-star { color: #7c3aed; }
.count-cell.two-star { color: #059669; }
.count-cell.accuracy { color: #2563eb; }
.count-cell.recovery { color: #db2777; }

.chars-cell { display: flex; flex-wrap: wrap; gap: 8px; }

.count-table.compact-char-table td {
  padding-top: 7px;
  padding-bottom: 7px;
}

.count-table.compact-char-table .chars-cell {
  gap: 4px;
}

.count-table.compact-char-table .char-avatar-box {
  width: 50px;
  height: 50px;
}

.count-table.compact-char-table .avatar-img,
.count-table.compact-char-table .festival-avatar-wrap {
  width: 46px;
  height: 46px;
}

.count-table.compact-char-table .sub-stat {
  margin-top: 1px;
}

.count-table.compact-char-table.reward-breakdown-table .char-avatar-box {
  height: auto;
  min-height: 56px;
}

.count-table.compact-char-table.reward-breakdown-table .sub-stat {
  margin-top: 2px;
  line-height: 1.08;
}

.char-avatar-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 56px;
}

.avatar-img {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid #d1d5db;
  object-fit: cover;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    inset 0 -2px 4px rgba(15, 23, 42, 0.18),
    0 2px 5px rgba(15, 23, 42, 0.22);
}

.abbr-text {
  font-size: 0.6em;
  margin-top: 2px;
  color: #999;
  font-weight: bold;
}

.dist-hide-name-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #475569;
}

.sub-stat {
  font-size: 0.66em;
  color: #6b7280;
  margin-top: 2px;
}

.id-input {
  width: 58px;
  padding: 3px 5px;
  border: 2px solid #33ccbb;
  border-radius: var(--stats-radius-btn);
  font-size: 0.82rem;
  text-align: center;
  appearance: textfield;
  -moz-appearance: textfield;
}

.id-input::-webkit-outer-spin-button,
.id-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.id-step-btn {
  width: 24px;
  height: 24px;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
  font-size: 0.78rem;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  touch-action: manipulation;
  transition: filter 0.16s ease, transform 0.16s ease, background-color 0.16s ease;
}

.mini-cutoff-line {
  font-size: 0.82rem;
  font-weight: 800;
  color: #0f172a;
  white-space: nowrap;
}

.reset-mini-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  box-sizing: border-box;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  touch-action: manipulation;
  transition: filter 0.16s ease, transform 0.16s ease, background-color 0.16s ease;
}

.id-step-btn:active,
.reset-mini-btn:active {
  filter: brightness(0.82);
  transform: translateY(1px) scale(0.96);
}

.reset-mini-icon {
  width: 14px;
  height: 14px;
  object-fit: contain;
  display: block;
}

.config-tips {
  font-size: 0.74rem;
  color: #4b5563;
  margin: 0;
  text-align: left;
}

.matrix-panel,
.song-panel,
.related-panel,
.festival-panel,
.lineup-panel,
.support-panel {
  margin-top: 18px;
}

.lineup-tip {
  margin: 4px 0 10px;
  font-size: 0.76rem;
  color: #475569;
}

.lineup-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 10px;
}

.support-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 10px;
}

.support-card {
  border: 1px solid #dbe3ee;
  border-radius: 10px;
  padding: 9px;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.08);
}

.support-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.support-head-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
}

.support-vs-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #475569;
  font-weight: 700;
  user-select: none;
}

.support-vs-toggle input {
  margin: 0;
}

.support-wl-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #475569;
  font-weight: 700;
  user-select: none;
}

.support-wl-toggle input {
  margin: 0;
}

.support-unit-title-logo {
  height: 38px;
  width: auto;
  max-width: 300px;
  object-fit: contain;
}

.support-unit-logo {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.support-plan-row {
  margin-bottom: 5px;
}

.support-plan-row:last-child {
  margin-bottom: 0;
}

.support-member-cell {
  gap: 1px;
}

.support-member-avatar {
  width: 33px;
  height: 33px;
  border-radius: 50%;
  border: 1px solid rgba(15, 23, 42, 0.2);
  object-fit: cover;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.18);
}

.lineup-card {
  border: 1px solid #dbe3ee;
  border-radius: 10px;
  padding: 9px;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.08);
}

.lineup-char-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.lineup-char-main {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
}

.lineup-char-main > div {
  min-width: 0;
}

.lineup-char-text {
  min-width: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
  white-space: nowrap;
}

.lineup-head-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  justify-content: flex-end;
}

.lineup-toggle-btn {
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
  font-size: 0.66rem;
  line-height: 1;
  padding: 4px 8px;
  cursor: pointer;
}

.lineup-toggle-btn:hover {
  background: #e2e8f0;
}

.lineup-char-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid var(--lineup-accent, #d1d5db);
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.22);
}

.lineup-char-name {
  font-size: 0.88rem;
  font-weight: 800;
  color: #111827;
}

.lineup-char-sub {
  margin-top: 0;
  font-size: 0.68rem;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lineup-plan-row {
  display: grid;
  grid-template-columns: 30px repeat(5, minmax(0, 1fr)) 48px;
  gap: 5px;
  align-items: stretch;
}

.lineup-plan-main {
  margin-bottom: 6px;
}

.lineup-attr-cell,
.lineup-total-cell,
.lineup-member-cell {
  border: 1px solid var(--lineup-row-border, #cbd5e1);
  border-radius: 10px;
  background: var(--lineup-row-bg, rgba(255, 255, 255, 0.88));
  color: var(--lineup-row-fg, #111827);
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lineup-attr-cell {
  padding: 2px;
}

.lineup-attr-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.lineup-member-cell {
  position: relative;
  flex-direction: column;
  gap: 2px;
  padding: 3px 2px;
}

.support-member-attr-icon {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 13px;
  height: 13px;
  object-fit: contain;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.24);
  pointer-events: none;
}

.lineup-member-cell.is-empty {
  color: var(--lineup-row-fg-muted, #94a3b8);
  font-size: 0.8rem;
  font-weight: 700;
}

.lineup-member-score {
  font-size: 0.98rem;
  font-weight: 800;
  color: inherit;
  line-height: 1;
}

.lineup-jump {
  width: 100%;
  max-width: 100%;
  padding: 1px 3px;
  font-size: 11px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: clip;
  -webkit-text-size-adjust: none;
  text-size-adjust: none;
}

.lineup-total-cell {
  font-size: 0.86rem;
  font-weight: 800;
  color: var(--lineup-row-fg, #0f172a);
}

.lineup-more {
  border-top: 1px dashed #cbd5e1;
  padding-top: 6px;
}

.lineup-more summary {
  cursor: pointer;
  color: #0f172a;
  font-weight: 700;
  font-size: 0.72rem;
}

.lineup-more-list {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.lineup-empty {
  color: #94a3b8;
}

.festival-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 12px;
  align-items: start;
}

.festival-card {
  border: 1px solid #dbe3ee;
  border-radius: 10px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  padding: 10px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
}

.festival-card h3 {
  margin: 0;
  font-size: 0.92rem;
  color: #111827;
}

.festival-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.festival-head-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.festival-merge-toggle {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #475569;
  font-weight: 700;
  white-space: nowrap;
}

.festival-card-merge-toggle {
  margin-left: 0;
  margin-top: 2px;
}

.festival-hide-name-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #475569;
  font-weight: 700;
  white-space: nowrap;
}

.festival-hide-name-toggle input {
  margin: 0;
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  position: relative;
  top: -1px;
}

.festival-merge-toggle input {
  margin: 0;
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  position: relative;
  top: -1px;
}

.festival-fes-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #475569;
  font-weight: 700;
  white-space: nowrap;
  margin-top: 2px;
}

.festival-fes-toggle input {
  margin: 0;
}

.festival-tier-cell {
  width: 40px;
  min-width: 40px;
  padding: 4px 2px !important;
  font-size: 0.86rem;
  font-weight: 800;
  text-align: center;
  vertical-align: middle;
}

.festival-star-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.festival-star-icon {
  width: 11px;
  height: 11px;
  object-fit: contain;
}

.festival-none-text {
  display: inline-block;
  width: 100%;
  text-align: center;
  color: #4b5563;
  font-size: 0.76rem;
  font-weight: 800;
}

.festival-tier-four {
  color: #dc2626;
}

.festival-tier-three {
  color: #7c3aed;
}

.festival-tier-two {
  color: #059669;
}

.festival-tier-none {
  color: #4b5563;
}

.festival-avatar-box {
  position: relative;
}

.festival-avatar-wrap {
  width: 52px;
  height: 52px;
  position: relative;
}

.festival-count-badge {
  position: absolute;
  left: 1px;
  top: 1px;
  min-width: 14px;
  height: 14px;
  border-radius: 999px;
  background: #dc2626;
  color: #fff;
  font-size: 0.58rem;
  line-height: 14px;
  text-align: center;
  font-weight: 800;
  border: 1px solid #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
  z-index: 2;
}

.festival-unit-logo {
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 16px;
  height: 16px;
  object-fit: contain;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.25);
  z-index: 2;
}

.festival-perm-mark {
  position: absolute;
  left: 1px;
  bottom: 1px;
  min-width: 14px;
  height: 14px;
  line-height: 14px;
  text-align: center;
  font-size: 0.58rem;
  font-weight: 800;
  color: #ffffff;
  background: #111827;
  border: 1px solid #fff;
  border-radius: 999px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.2);
  z-index: 2;
}

.festival-empty {
  color: #9ca3af;
  font-size: 0.85rem;
}

.festival-chars-empty-cell {
  display: table-cell;
}

.festival-chars-empty-cell .festival-empty {
  display: inline-block;
  width: 100%;
}

.matrix-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
  table-layout: fixed;
}

.matrix-wrap {
  position: relative;
  overflow-x: auto;
  overflow-y: auto;
  max-height: calc(100vh - 140px);
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.matrix-table th,
.matrix-table td {
  border: 1px solid #e5e7eb;
  padding: 8px 10px;
  text-align: center;
}

.matrix-table thead th {
  position: sticky;
  top: 0;
  z-index: 40;
  background: #f8fafc;
  box-shadow: 0 1px 0 #e5e7eb;
}

.matrix-table th:first-child {
  position: sticky;
  left: 0;
  z-index: 50;
  background: #f8fafc;
}

.matrix-table td:first-child {
  position: sticky;
  left: 0;
  z-index: 30;
}

.matrix-table tbody tr.matrix-unit-framed td:first-child {
  border-left: 3px solid var(--matrix-unit-border-color);
}

.matrix-table tbody tr.matrix-unit-framed td:last-child {
  border-right: 3px solid var(--matrix-unit-border-color);
}

.matrix-table tbody tr.matrix-unit-group-start-row td {
  border-top: 3px solid var(--matrix-unit-border-color);
}

.matrix-table tbody tr.matrix-unit-group-end-row td {
  border-bottom: 3px solid var(--matrix-unit-border-color);
}

.matrix-sort-btn {
  width: 100%;
  border: none;
  background: transparent;
  color: #111827;
  font-size: inherit;
  font-weight: 700;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
}

.matrix-sort-ind {
  font-size: 0.72em;
  color: #64748b;
}

.row-char {
  text-align: center;
}

.mini-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #d1d5db;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.75),
    inset 0 -2px 3px rgba(15, 23, 42, 0.2),
    0 1px 3px rgba(15, 23, 42, 0.2);
}

.matrix-avatar-wrap {
  position: relative;
  width: 36px;
  height: 36px;
  margin: 0 auto;
}

.matrix-avatar-unit-logo {
  position: absolute;
  bottom: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  object-fit: contain;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.22);
}

.matrix-table td.matrix-num {
  color: #374151;
  font-weight: 700;
  font-size: 1.12rem;
  line-height: 1.1;
  font-family: 'DIN Alternate', 'Avenir Next', 'Trebuchet MS', 'Segoe UI', 'Microsoft YaHei', sans-serif;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
}

.matrix-group-start {
  border-left: 2px solid #c5ccd6 !important;
}

.matrix-group-end {
  border-right: 2px solid #c5ccd6 !important;
}

.matrix-table td.matrix-num.matrix-max {
  color: #dc2626;
  font-weight: 800;
}

.matrix-table td.matrix-num.matrix-min {
  color: #2563eb;
  font-weight: 800;
}

.matrix-zero {
  color: #475569;
  font-weight: 800;
  background-color: rgba(148, 163, 184, 0.16);
}

.matrix-table td.matrix-num.matrix-vs-zero {
  color: #64748b;
  font-weight: 650;
  background-color: rgba(148, 163, 184, 0.1);
}

.matrix-pure-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #475569;
}

.matrix-total-row td {
  background: #ffffff !important;
}

.matrix-total-row .matrix-num,
.matrix-total-row .matrix-total-label {
  font-weight: 900;
  color: #111827;
}

.matrix-vs-unit-total-row td {
  background: var(--matrix-vs-total-bg) !important;
}

.matrix-vs-unit-total-row .matrix-num {
  font-weight: 900;
  color: #111827;
}

.matrix-vs-unit-total-char {
  text-align: center;
}

.matrix-vs-unit-total-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.record-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 12px;
}

.record-block {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  padding: 10px;
}

.record-block h3 {
  margin: 0;
  font-size: 0.98rem;
  color: #111827;
}

.record-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.record-head-left {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.record-head-controls {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.record-compact-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.74rem;
  font-weight: 700;
  color: #475569;
}

.record-compact-toggle input {
  margin: 0;
}

.record-sort-btn {
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
  font-size: 0.72rem;
  padding: 2px 10px;
  cursor: pointer;
}

.record-sort-btn.active {
  background: #0ea5e9;
  border-color: #0ea5e9;
  color: #fff;
}

.record-table {
  width: 100%;
  border-collapse: collapse;
}

.record-table th,
.record-table td {
  border: 1px solid #e5e7eb;
  padding: 7px 9px;
  text-align: center;
  font-size: 0.82rem;
  white-space: nowrap;
}

.record-table th + th,
.record-table td + td {
  border-left: 1px solid #9fb0c2;
}

.record-char {
  display: flex;
  align-items: center;
  gap: 7px;
  justify-content: flex-start;
}

.vs-unit-score-table .vs-score-char-cell {
  display: table-cell;
  text-align: center;
  vertical-align: middle;
  padding-left: 6px;
  padding-right: 6px;
}

.vs-unit-score-table .vs-score-char-cell .record-avatar {
  display: block;
  margin: 0 auto;
}

.reward-collab-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #475569;
  font-weight: 700;
  white-space: nowrap;
  line-height: 1;
}

.reward-collab-toggle input {
  margin: 0;
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  position: relative;
  top: -1px;
}

.section-head.section-head-sub + .count-table {
  margin-top: 0;
}

.record-char > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.6px solid #d1d5db;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.2);
}

.record-unit-avatar {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.2);
}

.mini-unit-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.vs-unit-last-four-mini-table .vs-mini-days-cell {
  font-size: 0.96rem;
  font-weight: 800;
}

.vs-unit-score-table .record-char {
  justify-content: center;
  width: 100%;
  gap: 0;
}

.vs-unit-score-table .record-avatar {
  width: 34px;
  height: 34px;
}

.vs-unit-score-table {
  table-layout: fixed;
}

.vs-unit-score-table th:first-child,
.vs-unit-score-table td:first-child {
  width: 64px;
  min-width: 64px;
  max-width: 64px;
  padding-left: 4px;
  padding-right: 4px;
}

.vs-unit-score-table th,
.vs-unit-score-table td {
  text-align: center;
  vertical-align: middle;
  padding: 9px 8px;
}

.score-attr-wrap {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 3px;
  border-radius: 10px;
  padding: 2px 4px;
}

.score-attr-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.score-empty {
  color: #94a3b8;
}

.fes-record-table {
  table-layout: fixed;
}

.fes-record-table th,
.fes-record-table td {
  padding: 6px 6px;
}

.fes-record-table tbody tr:not(.fes-total-row) td {
  height: 102px;
}

.fes-record-table td {
  vertical-align: middle;
}

.fes-row-head {
  min-width: 64px;
  width: 64px;
  font-size: 0.74rem;
}

.fes-unit-head,
.fes-total-head {
  font-weight: 800;
}

.fes-total-head {
  background: #e2e8f0;
}

.fes-total-num {
  font-size: 1.04rem;
  font-weight: 800;
  color: #0f172a;
}

.fes-attr-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.fes-cell-icons {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  gap: 2px;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 68px;
  min-height: 90px;
  margin: 0 auto;
}

.fes-cell-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1.8px solid #d1d5db;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.2);
}

.record-table th {
  background: #f8fafc;
  font-weight: 700;
}

.range-cell {
  white-space: nowrap;
}

.range-cell > span {
  margin: 0 3px;
}

.jump-link {
  appearance: none;
  -webkit-appearance: none;
  border: 1px solid rgba(15, 23, 42, 0.18);
  border-radius: var(--stats-radius-btn);
  padding: 2px 7px;
  font-size: 0.72rem;
  line-height: 1.35;
  font-weight: 700;
  color: #1f2937;
  background: var(--record-tint, #e5e7eb);
  cursor: pointer;
  white-space: nowrap;
}

.jump-link:hover:not(:disabled) {
  filter: brightness(0.98);
}

.jump-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (min-width: 901px) {
  .matrix-table th,
  .matrix-table td {
    font-size: 0.92rem;
  }

  .matrix-table td.matrix-num {
    font-size: 1.24rem;
  }

  .vs-unit-score-table th,
  .vs-unit-score-table td {
    padding: 12px 10px;
  }

  .vs-unit-last-four-mini-table .vs-mini-days-cell {
    font-size: 1.16rem;
    font-weight: 800;
  }

  .score-attr-wrap {
    gap: 4px;
  }

  .score-attr-icon {
    width: 28px;
    height: 28px;
  }
}

@media (min-width: 901px) and (max-width: 1360px) {
  .related-panel .record-char > span {
    display: none;
  }

  .related-panel .record-table th:first-child,
  .related-panel .record-table td:first-child {
    width: 44px;
    min-width: 44px;
    max-width: 44px;
    padding-left: 3px;
    padding-right: 3px;
  }

  .related-panel .record-char {
    justify-content: center;
  }
}

@media (max-width: 1200px) {
  .pjsk-stats {
    --stats-nav-width: 196px;
    --stats-nav-left: 34px;
    --stats-nav-top: 78px;
  }

  .stats-layout { grid-template-columns: var(--stats-nav-width) 1fr; }
  .stats-layout.nav-collapsed { grid-template-columns: 1fr; }
  .stats-nav {
    height: calc(100vh - var(--stats-nav-top) - 10px);
    max-height: calc(100vh - var(--stats-nav-top) - 10px);
  }
  .pjsk-stats { padding: 14px; }
}

@media (min-width: 1201px) {
  .nav-cutoff-controls {
    justify-content: flex-start;
  }

  .nav-cutoff-controls .id-input {
    width: 72px;
    padding: 2px 0;
    text-align: center;
  }
}

@media (min-width: 901px) and (max-width: 1200px) {
  .nav-cutoff {
    padding: 7px;
  }

  .nav-cutoff-controls {
    gap: 4px;
  }

  .id-input {
    width: 56px;
    padding: 2px 4px;
    font-size: 0.8rem;
  }

  .id-step-btn {
    width: 26px;
    height: 26px;
    font-size: 0.78rem;
  }

  .reset-mini-btn {
    width: 26px;
    height: 26px;
  }

  .reset-mini-icon {
    width: 14px;
    height: 14px;
  }

  .config-tips {
    font-size: 0.68rem;
  }

  .nav-name-format {
    gap: 6px;
    padding: 7px;
    justify-content: space-between;
  }

  .nav-name-format-title {
    font-size: 0.72rem;
  }

  .nav-name-format-options {
    gap: 6px;
  }

  .nav-name-format-option {
    gap: 3px;
    font-size: 0.68rem;
    white-space: nowrap;
  }
}

@media (max-width: 900px) {
  .pjsk-stats {
    padding: 8px;
    --matrix-sticky-top: 0px;
  }

  .stats-layout,
  .stats-layout.nav-collapsed {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .stats-layout:not(.nav-collapsed) .stats-main {
    grid-column: auto;
  }

  .stats-layout.mobile-nav-open .stats-main {
    padding-top: 0;
  }

  .stats-layout.mobile-nav-open .floating-menu-btn {
    background: #ef4444;
    border-color: #b91c1c;
    color: #ffffff;
  }

  .stats-nav {
    position: static;
    left: auto;
    width: auto;
    height: auto;
    max-height: none;
    top: auto;
  }

  .stats-nav.mobile-floating {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 52px);
    left: 8px;
    right: 8px;
    max-height: calc(100dvh - 60px);
    z-index: 4200;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.22);
    background: #ffffff;
    opacity: 1;
    backdrop-filter: none;
    overflow: hidden;
  }

  .nav-collapse-fab {
    z-index: 4201;
  }

  .stats-nav.mobile-floating.is-collapsed {
    display: none;
  }

  .stats-nav.mobile-floating.is-open {
    right: 8px;
    left: 8px;
    max-height: calc(100dvh - 64px);
  }

  .nav-cutoff {
    padding: 7px;
  }

  .nav-name-format {
    padding: 7px;
  }

  .nav-name-format-title {
    font-size: 0.72rem;
  }

  .nav-name-format-option {
    font-size: 0.7rem;
  }

  .nav-cutoff-title {
    font-size: 0.72rem;
  }

  .nav-cutoff-controls {
    gap: 4px;
  }

  .id-input {
    width: 54px;
    font-size: 0.78rem;
  }

  .id-step-btn,
  .reset-mini-btn {
    width: 24px;
    height: 24px;
    font-size: 0.74rem;
  }

  .reset-mini-icon {
    width: 13px;
    height: 13px;
  }

  .reset-mini-btn {
    font-size: 0.72rem;
    padding: 0;
  }

  .config-tips {
    font-size: 0.68rem;
  }

  .nav-scroll { max-height: none; }

  .nav-group {
    margin-bottom: 4px;
  }

  .nav-link {
    min-height: 26px;
    font-size: 0.72rem;
    padding: 4px 8px;
  }

  .nav-link-sub {
    padding: 3px 8px 3px 22px;
    font-size: 0.68rem;
  }

  .stats-main h1 {
    margin-bottom: 8px;
    font-size: 1.1rem;
  }

  .stats-main-head {
    margin-bottom: 8px;
  }

  .card-export-btn {
    font-size: 0.64rem;
    padding: 3px 6px;
  }

  .card-panel {
    padding: 9px;
    border-radius: 10px;
  }

  .card-panel h2 {
    margin-bottom: 8px;
    font-size: 0.96rem;
  }

  /* Keep header-row titles aligned with inline controls; avoid extra gap before tables. */
  .section-head h2 {
    margin-bottom: 0;
    line-height: 1.1;
  }

  .section-head-left {
    align-items: center;
  }

  .stats-grid {
    gap: 10px;
    grid-template-columns: 1fr;
  }

  .stats-section {
    overflow-x: auto;
  }

  .count-table {
    min-width: 300px;
    table-layout: fixed;
  }

  .count-table th,
  .count-table td {
    padding: 5px 4px;
    font-size: 0.78rem;
  }

  .count-table th:first-child,
  .count-table td:first-child {
    width: 40px;
    max-width: 40px;
  }

  .count-cell {
    font-size: 1.1em;
  }

  .chars-cell {
    gap: 2px;
  }

  .count-table.compact-char-table .char-avatar-box {
    height: auto;
    min-height: 42px;
  }

  .count-table.compact-char-table.reward-breakdown-table .char-avatar-box {
    min-height: 48px;
  }

  .char-avatar-box {
    width: 44px;
  }

  .avatar-img {
    width: 42px;
    height: 42px;
  }

  .festival-avatar-wrap {
    width: 42px;
    height: 42px;
  }

  .festival-unit-logo {
    width: 13px;
    height: 13px;
  }

  .festival-perm-mark,
  .festival-count-badge {
    min-width: 12px;
    height: 12px;
    line-height: 12px;
    font-size: 0.52rem;
  }

  .chars-cell .abbr-text {
    display: none;
  }

  .sub-stat {
    font-size: 0.62em;
    margin-top: 1px;
  }

  .matrix-wrap {
    overflow-x: auto;
    overflow-y: auto;
    max-height: calc(100vh - 120px);
  }

  .matrix-table {
    min-width: 620px;
  }

  .matrix-table th,
  .matrix-table td {
    padding: 6px;
    font-size: 0.8rem;
  }

  .mini-avatar {
    width: 30px;
    height: 30px;
  }

  .matrix-avatar-wrap {
    width: 30px;
    height: 30px;
  }

  .matrix-avatar-unit-logo {
    width: 15px;
    height: 15px;
    right: -4px;
    bottom: -4px;
  }

  .matrix-table td.matrix-num {
    font-size: 0.98rem;
  }

  .fes-record-table tbody tr:not(.fes-total-row) td {
    height: 84px;
  }

  .fes-attr-icon {
    width: 20px;
    height: 20px;
  }

  .fes-cell-icons {
    min-height: 72px;
    gap: 1px;
  }

  .fes-cell-avatar {
    width: 36px;
    height: 36px;
  }

  .fes-row-head {
    width: 54px;
    min-width: 54px;
    font-size: 0.66rem;
  }

  .fes-total-num {
    font-size: 0.88rem;
  }

  .festival-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .lineup-plan-row {
    grid-template-columns: 24px repeat(5, minmax(0, 1fr)) 40px;
    gap: 4px;
  }

  .support-unit-title-logo {
    height: 28px;
    max-width: 220px;
  }

  .support-member-avatar {
    width: 27px;
    height: 27px;
  }

  .support-member-attr-icon {
    width: 11px;
    height: 11px;
    top: 1px;
    right: 1px;
  }

  .lineup-char-head {
    gap: 4px;
    flex-wrap: nowrap;
  }

  .lineup-char-main {
    gap: 6px;
  }

  .lineup-char-text {
    gap: 4px;
    align-items: center;
  }

  .lineup-char-avatar {
    width: 30px;
    height: 30px;
  }

  .lineup-char-name {
    font-size: 0.8rem;
    white-space: nowrap;
  }

  .lineup-char-sub {
    font-size: 0.62rem;
    max-width: 30vw;
  }

  .lineup-head-actions {
    gap: 3px;
    flex-wrap: nowrap;
    flex: 0 0 auto;
  }

  .lineup-toggle-btn {
    font-size: 0.58rem;
    padding: 3px 5px;
    white-space: nowrap;
  }

  .lineup-head-actions .card-export-btn {
    font-size: 0.58rem;
    padding: 3px 5px;
    white-space: nowrap;
  }

  .lineup-attr-cell,
  .lineup-total-cell,
  .lineup-member-cell {
    min-height: 48px;
  }

  .lineup-attr-icon {
    width: 17px;
    height: 17px;
  }

  .lineup-member-score {
    font-size: 0.86rem;
  }

  .lineup-jump {
    font-size: 0.54rem;
    padding: 1px 2px;
  }

  .lineup-total-cell {
    font-size: 0.74rem;
  }

  .festival-card {
    padding: 8px;
  }

  .record-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .record-block {
    padding: 8px;
    overflow-x: visible;
  }

  .record-head-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    flex-wrap: nowrap;
  }

  .record-head-left {
    width: auto;
    min-width: 0;
    gap: 4px;
    flex-wrap: nowrap;
    align-items: center;
  }

  .record-head-left h3 {
    font-size: 0.82rem;
    white-space: nowrap;
  }

  .record-head-controls {
    width: auto;
    justify-content: flex-start;
    flex-wrap: nowrap;
    gap: 4px;
  }

  .record-compact-toggle {
    font-size: 0.66rem;
    white-space: nowrap;
  }

  .record-sort-btn {
    font-size: 0.62rem;
    padding: 1px 6px;
  }

  .vs-unit-score-table .record-avatar {
    width: 24px;
    height: 24px;
  }

  .mini-unit-logo {
    width: 24px;
    height: 24px;
  }

  .record-table {
    min-width: 0;
    table-layout: fixed;
  }

  .record-table th,
  .record-table td {
    padding: 4px 3px;
    font-size: 0.68rem;
    word-break: break-word;
  }

  .related-panel .record-table th:first-child,
  .related-panel .record-table td:first-child {
    width: 38px;
    min-width: 38px;
    max-width: 38px;
    padding-left: 2px;
    padding-right: 2px;
  }

  .record-char {
    gap: 4px;
    justify-content: center;
  }

  .related-panel .record-char > span {
    display: none;
  }

  .record-char > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .record-avatar {
    width: 22px;
    height: 22px;
  }

  .jump-link {
    font-size: 0.62rem;
    padding: 1px 4px;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .jump-link.lineup-jump {
    font-size: 10px;
    padding: 1px 2px;
    text-overflow: clip;
    -webkit-text-size-adjust: none;
    text-size-adjust: none;
  }
}

@media (max-width: 520px) {
  .pjsk-stats {
    padding: 6px;
  }

  .floating-menu-btn {
    top: calc(env(safe-area-inset-top, 0px) + 48px);
    width: 34px;
    height: 34px;
  }

  .nav-collapse-fab {
    width: 30px;
    min-height: 30px;
    height: 30px;
  }

  .stats-main h1 {
    font-size: 1rem;
    margin-bottom: 6px;
  }

  .card-panel {
    padding: 8px;
  }

  .nav-scroll { max-height: none; }

  .count-table {
    min-width: 0;
  }

  .count-table.compact-char-table .char-avatar-box {
    width: 34px;
    height: auto;
    min-height: 34px;
  }

  .count-table.compact-char-table .avatar-img,
  .count-table.compact-char-table .festival-avatar-wrap {
    width: 34px;
    height: 34px;
  }

  .count-table.compact-char-table.reward-breakdown-table .char-avatar-box {
    min-height: 42px;
  }

  .char-avatar-box {
    width: 38px;
  }

  .avatar-img {
    width: 38px;
    height: 38px;
  }

  .record-table {
    min-width: 0;
  }
}
</style>