<template>
  <div class="pjsk-stats">
    <div class="stats-layout" :class="{ 'nav-collapsed': navCollapsed }">
      <aside class="stats-nav card-panel">
        <button class="nav-toggle" @click="navCollapsed = !navCollapsed">{{ navCollapsed ? '>' : '<' }}</button>

        <div v-if="!navCollapsed" class="nav-cutoff">
            <div class="nav-cutoff-title">统计截止活动 ID</div>
            <div class="nav-cutoff-controls">
              <input
                type="number"
                :value="displayEventIdDraft"
                @focus="onDisplayEventIdFocus"
                @input="onDisplayEventIdInput($event.target.value)"
                @blur="onDisplayEventIdBlur"
                class="id-input"
                placeholder="输入活动 ID"
              />
              <button @click="manualEventId = null" class="reset-mini-btn" :title="`恢复到当前参考活动 ID：${autoCurrentId}`">
                恢复
              </button>
            </div>
            <p class="config-tips">系统时间：{{ nowStr }} | 输入更大ID可查看预测统计。</p>
        </div>

        <template v-if="!navCollapsed">
          <div class="nav-title">快速跳转</div>
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
        </template>
      </aside>

      <div class="stats-main">
        <div class="stats-main-head">
          <h1>角色卡片统计</h1>
        </div>

        <div id="panel-dist" class="stats-section card-panel section-main">
          <div class="section-head">
            <h2>阶梯分布</h2>
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
                  <div v-if="panel.id === 'limited-ban'" class="head-inline-filters">
                    <label class="head-filter-toggle" title="只统计箱限ban个数。">
                      <input
                        type="checkbox"
                        :checked="limitedBanEventTypeFilter === '箱活'"
                        @change="setLimitedBanEventTypeFilter('箱活', $event.target.checked)"
                      />
                      只看箱活
                    </label>
                    <label class="head-filter-toggle" title="只统计混限ban个数。">
                      <input
                        type="checkbox"
                        :checked="limitedBanEventTypeFilter === '混活'"
                        @change="setLimitedBanEventTypeFilter('混活', $event.target.checked)"
                      />
                      只看混活
                    </label>
                  </div>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng(`panel-${panel.id}`, `阶梯分布_${panel.title}`)">PNG</button>
              </div>
              <table class="count-table">
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
                          :style="{ borderColor: getCharColor(char.name) }"
                        />
                        <span class="abbr-text">{{ getCharAbbr(char.name) }}</span>
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
                  <label v-if="canToggleFestivalFes(fest.festival)" class="festival-fes-toggle">
                    <input v-model="festivalFesToggles[fest.festival]" type="checkbox" />
                    统计FES
                  </label>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng(fest.anchorId, `节日人选_${fest.festival}`)">PNG</button>
              </div>
              <table class="count-table">
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
                    <td class="chars-cell">
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
                              :style="{ borderColor: getCharColor(char.name) }"
                            />
                            <img
                              v-if="getFestivalUnitLogoByName(char.name)"
                              :src="getFestivalUnitLogoByName(char.name)"
                              class="festival-unit-logo"
                            />
                            <span v-if="row.key === 'four' && char.isPermOnly" class="festival-perm-mark">普</span>
                          </div>
                          <span class="abbr-text">{{ getFestivalDisplayAbbr(char.name) }}</span>
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
                      <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.eventRef)">{{ row.eventLabel }}</button>
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
                      <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.eventRef)">{{ row.eventLabel }}</button>
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
                      <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.longest?.startRef)">{{ row.longest?.startMark || '-' }}</button>
                      <span>→</span>
                      <button class="jump-link" :disabled="!row.longest?.endRef" @click.stop="jumpToHistoryByEventRef(row.longest?.endRef)">{{ row.longest?.endMark || '-' }}</button>
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
                      <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.shortest?.startRef)">{{ row.shortest?.startMark || '-' }}</button>
                      <span>→</span>
                      <button class="jump-link" :disabled="!row.shortest?.endRef" @click.stop="jumpToHistoryByEventRef(row.shortest?.endRef)">{{ row.shortest?.endMark || '-' }}</button>
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
                      <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.longest?.startRef)">{{ row.longest?.startMark || '-' }}</button>
                      <span>→</span>
                      <button class="jump-link" :disabled="!row.longest?.endRef" @click.stop="jumpToHistoryByEventRef(row.longest?.endRef)">{{ row.longest?.endMark || '-' }}</button>
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
                      <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.shortest?.startRef)">{{ row.shortest?.startMark || '-' }}</button>
                      <span>→</span>
                      <button class="jump-link" :disabled="!row.shortest?.endRef" @click.stop="jumpToHistoryByEventRef(row.shortest?.endRef)">{{ row.shortest?.endMark || '-' }}</button>
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
                      <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.longest?.startRef)">{{ row.longest?.startMark || '-' }}</button>
                      <span>→</span>
                      <button class="jump-link" :disabled="!row.longest?.endRef" @click.stop="jumpToHistoryByEventRef(row.longest?.endRef)">{{ row.longest?.endMark || '-' }}</button>
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
                      <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.shortest?.startRef)">{{ row.shortest?.startMark || '-' }}</button>
                      <span>→</span>
                      <button class="jump-link" :disabled="!row.shortest?.endRef" @click.stop="jumpToHistoryByEventRef(row.shortest?.endRef)">{{ row.shortest?.endMark || '-' }}</button>
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
                      <button class="jump-link" :disabled="!row.eventRef" @click.stop="jumpToHistoryByEventRef(row.eventRef)">{{ row.eventLabel }}</button>
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
          </div>
        </div>

        <div id="panel-vs-song" class="stats-section card-panel song-panel">
          <div class="section-head">
            <h2>虚拟歌手参与书下</h2>
            <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-vs-song', '虚拟歌手参与书下')">PNG</button>
          </div>
          <div class="song-grid">
            <div v-for="vs in virtualSingerSongStats" :key="`song-${vs.name}`" :id="`song-${getCharAbbr(vs.name).toLowerCase()}`" class="song-card" :style="{ backgroundColor: getRecordTint(vs.name, 0.2) }">
              <div class="song-head">
                <div class="song-head-main">
                  <img :src="`/chibi_s/${getCharAbbr(vs.name)}.webp`" class="song-avatar" :style="{ borderColor: getCharColor(vs.name) }" />
                  <div>
                    <div class="song-name">{{ vs.name }}</div>
                    <div class="song-count">{{ vs.count }} 首</div>
                  </div>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng(`song-${getCharAbbr(vs.name).toLowerCase()}`, `虚拟歌手参与书下_${vs.name}`)">PNG</button>
              </div>
              <div class="unit-counts">
                <span v-for="u in ['ln','mmj','vbs','ws','nc']" :key="`${vs.name}-${u}`" class="unit-chip" :style="{ backgroundColor: getUnitTint(u) }">
                  <img :src="unitLogoMap[u]" class="unit-logo" :alt="u" />
                  <span class="unit-count-num">{{ vs.unitCounts[u] }}</span>
                </span>
              </div>
              <ul class="song-list">
                <li v-for="s in vs.songs" :key="`${vs.name}-${s.tag}`">
                  <span class="song-tag" :style="{ color: s.color }">{{ s.tag }}</span>
                  <span class="song-title">{{ s.songName }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div id="panel-matrix" class="stats-section card-panel matrix-panel">
          <div class="section-head">
            <h2>角色矩阵</h2>
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
                  <td class="matrix-num">{{ row.pScoreCount }}</td>
                  <td class="matrix-num">{{ row.accuracyCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(3, 4)">{{ row.recoveryCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(0, 4)">{{ row.fourStarCount }}</td>
                  <td class="matrix-num">{{ row.threeStarCount }}</td>
                  <td class="matrix-num">{{ row.twoStarCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(3, 4)">{{ row.rewardTotalCount }}</td>
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
const vsUnitLastFourSort = ref('char');
const vsUnitLastFourCompact = ref(true);
const includeCollabRewardCards = ref(false);
const banEventTypeFilter = ref('all');
const limitedBanEventTypeFilter = ref('all');
const festivalMergeHigherRanks = ref(false);
const isMobileNav = ref(false);
const festivalFesToggles = reactive({
  半周年: false,
  周年: false
});
let sectionObserver = null;
const isExportingPng = ref(false);

const CHAR_MAP = {
  "星乃一歌": "ICK", "天马咲希": "SAKI", "望月穗波": "HNM", "日野森志步": "SHIHO",
  "花里实乃里": "MNR", "桐谷遥": "HRK", "桃井爱莉": "AIRI", "日野森雫": "SZK",
  "小豆泽心羽": "KHN", "白石杏": "AN", "东云彰人": "AKT", "青柳冬弥": "TOYA",
  "天马司": "TKS", "凤笑梦": "EMU", "草薙宁宁": "NENE", "神代类": "RUI",
  "宵崎奏": "KND", "朝比奈真冬": "MFY", "东云绘名": "ENA", "晓山瑞希": "MZK",
  "初音未来": "MIKU", "镜音铃": "RIN", "镜音连": "LEN", "巡音流歌": "LUKA", "MEIKO": "MEIKO", "KAITO": "KAITO"
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

const jumpToHistoryByEventRef = (eventRef) => {
  const id = String(eventRef?.id ?? '').trim();
  if (!id) return;
  emit('jump-to-event', id);
};

const getCharColor = (name) => {
  const key = String(name || '').split(' ')[0];
  return CHAR_COLORS[key] || '#d1d5db';
};

const VS_NAMES = ["初音未来", "镜音铃", "镜音连", "巡音流歌", "MEIKO", "KAITO"];
const UNIT_COLORS = {
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
  nc: '/elements/nc.png'
};
const CHAR_COLORS = {
  "星乃一歌": "#33AAEE", "天马咲希": "#FFDD44", "望月穗波": "#EE6666", "日野森志步": "#BBDD22",
  "花里实乃里": "#FFCCAA", "桐谷遥": "#99CCFF", "桃井爱莉": "#FFAACC", "日野森雫": "#99EEDD",
  "小豆泽心羽": "#FF6699", "白石杏": "#00BBDD", "东云彰人": "#FF7722", "青柳冬弥": "#0077DD",
  "天马司": "#FFBB00", "凤笑梦": "#FF66BB", "草薙宁宁": "#33DD99", "神代类": "#BB88EE",
  "宵崎奏": "#BB6688", "朝比奈真冬": "#8888CC", "东云绘名": "#CCAA88", "晓山瑞希": "#DDAACC",
  "初音未来": "#33CCBB", "镜音铃": "#FFCC11", "镜音连": "#FFEE11", "巡音流歌": "#FFBBCC", "MEIKO": "#DD4444", "KAITO": "#3366CC"
};
const CHAR_UNIT_MAP = {
  "星乃一歌": "ln", "天马咲希": "ln", "望月穗波": "ln", "日野森志步": "ln",
  "花里实乃里": "mmj", "桐谷遥": "mmj", "桃井爱莉": "mmj", "日野森雫": "mmj",
  "小豆泽心羽": "vbs", "白石杏": "vbs", "东云彰人": "vbs", "青柳冬弥": "vbs",
  "天马司": "ws", "凤笑梦": "ws", "草薙宁宁": "ws", "神代类": "ws",
  "宵崎奏": "nc", "朝比奈真冬": "nc", "东云绘名": "nc", "晓山瑞希": "nc"
};
const CHAR_ORDER = {
  "星乃一歌": 1, "天马咲希": 2, "望月穗波": 3, "日野森志步": 4,
  "花里实乃里": 5, "桐谷遥": 6, "桃井爱莉": 7, "日野森雫": 8,
  "小豆泽心羽": 9, "白石杏": 10, "东云彰人": 11, "青柳冬弥": 12,
  "天马司": 13, "凤笑梦": 14, "草薙宁宁": 15, "神代类": 16,
  "宵崎奏": 17, "朝比奈真冬": 18, "东云绘名": 19, "晓山瑞希": 20,
  "初音未来": 21, "镜音铃": 22, "镜音连": 23, "巡音流歌": 24, "MEIKO": 25, "KAITO": 26
};
const ATTRS = ['Pure', 'Cool', 'Cute', 'Happy', 'Mysterious'];
const LIMITED_TYPES = new Set(['limited', 'cfes', 'bfes', 'collab_t']);
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
const SPECIAL_FESTIVALS = ['新年', '婚活', '情人节', '白情', '半周年', '周年'];
const FESTIVAL_ANCHOR_IDS = Object.fromEntries(SPECIAL_FESTIVALS.map((fest, idx) => [fest, `festival-${idx + 1}`]));
const FESTIVAL_VS_UNIT_ORDER = { ln: 1, mmj: 2, vbs: 3, ws: 4, nc: 5, vs: 6 };
const VS_UNIT_SORT_ORDER = ['ln', 'mmj', 'vbs', 'ws', 'nc'];

const isVirtualSinger = (name) => VS_NAMES.includes(name);

const parseVS = (vsStr) => {
  if (!vsStr) return [];
  const aliasMap = {
    MIKU: '初音未来',
    RIN: '镜音铃',
    LEN: '镜音连',
    LUKA: '巡音流歌',
    MEIKO: 'MEIKO',
    KAITO: 'KAITO',
    '初音未来': '初音未来',
    '镜音铃': '镜音铃',
    '镜音连': '镜音连',
    '巡音流歌': '巡音流歌'
  };

  return String(vsStr)
    .split(/[,，/、\s]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => aliasMap[token.toUpperCase()] || aliasMap[token] || token)
    .filter((name) => VS_NAMES.includes(name));
};

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

const getFestivalDisplayAbbr = (charName) => {
  const parsed = parseFestivalCharKey(charName);
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

const toggleMatrixSort = (key) => {
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

const matrixUnitFrameMap = computed(() => {
  const map = new Map();
  if (!isMatrixDefaultSort.value) return map;
  const rows = attrMatrixRows.value;
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
});

const getMatrixUnitFrameClass = (name) => {
  const info = matrixUnitFrameMap.value.get(name);
  if (!info) return [];
  return [
    'matrix-unit-framed',
    info.start ? 'matrix-unit-group-start-row' : '',
    info.end ? 'matrix-unit-group-end-row' : ''
  ].filter(Boolean);
};

const getUnitTint = (unit) => hexToRgba(UNIT_COLORS[unit] || '#9ca3af', 0.3);

const makeSongTag = (ev) => {
  const sid = String(ev?.type_series_id || '').trim();
  const bannerName = String(ev?.banner || '').trim();
  const unit = String(ev?.unit || '').trim().toLowerCase();
  if (bannerName) return `${getCharAbbr(bannerName).toLowerCase()}${sid}`;
  if (unit) return `${unit}${sid}`;
  return sid ? `ev${sid}` : 'unknown';
};

const getSongTagColor = (ev) => {
  const bannerName = String(ev?.banner || '').trim();
  const unit = bannerName ? getUnitByChar(bannerName) : String(ev?.unit || '').trim().toLowerCase();
  return UNIT_COLORS[unit] || '#111827';
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
  { id: 'rel-vs-unit-score', title: '团分统计' }
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
      id: 'panel-vs-song',
      title: '虚拟歌手书下',
      children: []
    },
    {
      id: 'panel-matrix',
      title: '角色矩阵',
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

const updateMobileNavState = () => {
  if (typeof window === 'undefined') return;
  isMobileNav.value = window.innerWidth <= 900;
};

const scrollToSection = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  activeNavId.value = id;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

const triggerDownloadPng = (canvas, fileName) => {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${fileName}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
  if (exact.classList.contains('card-panel') || exact.classList.contains('record-block') || exact.classList.contains('festival-card') || exact.classList.contains('song-card')) {
    return exact;
  }
  return exact.closest('.record-block, .festival-card, .song-card, .card-panel');
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
    const canvas = await html2canvas(renderEl, {
      backgroundColor: '#ffffff',
      scale: Math.max(2, window.devicePixelRatio || 1),
      useCORS: true,
      logging: false,
      width: Math.ceil(renderEl.scrollWidth || renderEl.clientWidth || 0),
      height: Math.ceil(renderEl.scrollHeight || renderEl.clientHeight || 0)
    });
    const fileName = sanitizeExportFileName(`pjsk_${title || id}_${formatExportTimestamp()}`);
    triggerDownloadPng(canvas, fileName);
  } catch (error) {
    console.error('导出模块PNG失败', error);
    alert('导出PNG失败，请稍后重试。');
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

const setLimitedBanEventTypeFilter = (targetType, checked) => {
  if (checked) {
    limitedBanEventTypeFilter.value = targetType;
    return;
  }
  if (limitedBanEventTypeFilter.value === targetType) {
    limitedBanEventTypeFilter.value = 'all';
  }
};

const limitedBanCountMap = computed(() => {
  const map = {};
  const maxEid = safeMaxEventId.value;
  const typeFilter = limitedBanEventTypeFilter.value;

  (props.allEvents || []).forEach((ev) => {
    if (ev?.isPredict) return;
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

const onDisplayEventIdBlur = () => {
  isEditingDisplayEventId.value = false;
  const n = toFiniteEventId(displayEventIdDraft.value);
  manualEventId.value = n ?? null;
  updateDisplayEventIdDraft();
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
        twoStarCount: 0,
        threeStarCount: 0,
        rewardTwoCount: 0,
        rewardThreeCount: 0,
        limitedBanCount: 0,
        accuracyCount: 0,
        recoveryCount: 0,
        unitScoreCount: 0,
        pureScoreCount: 0,
        attrCounts: { Pure: 0, Cool: 0, Cute: 0, Happy: 0, Mysterious: 0 }
      };
    }

    const rarity = String(card.Rarity || '').trim();
    const skill = String(card.Skill || '').toLowerCase();
    const attr = normalizeAttr(card.Attribute);

    // 统计 4 星卡片及技能分类
    if (rarity === "4") {
      stats[name].fourStarCount++;

      if (skill === 'p_score') stats[name].pScoreCount++;
      if (skill === 'accuracy') stats[name].accuracyCount++;
      if (skill === 'recovery') stats[name].recoveryCount++;
      if (skill === 'unit_score') stats[name].unitScoreCount++;

      if (attr) {
        stats[name].attrCounts[attr] += 1;
      }
    }

    if (rarity === '3') stats[name].threeStarCount++;
    if (rarity === '2') stats[name].twoStarCount++;

    if (isEventRewardCard(card)) {
      if (rarity === '3') stats[name].rewardThreeCount++;
      if (rarity === '2') stats[name].rewardTwoCount++;
    }

    // 统计限定卡片 (含 Fes 和 联名限定)
    if (LIMITED_TYPES.has(String(card.Type).toLowerCase())) {
      stats[name].limitedCount++;
    }
  });

  // 最后的汇总处理
  return Object.values(stats).map(s => {
    // 计算“纯分卡”数量：四星总数 - (判定 + 奶卡 + 团分)
    // 这样剩下的就是 100% / 110% / 120% / 130% 等纯分卡
    s.pureScoreCount = s.fourStarCount - s.accuracyCount - s.recoveryCount - s.unitScoreCount;
    s.rewardTotalCount = s.rewardThreeCount + s.rewardTwoCount;
    s.limitedBanCount = limitedBanCountMap.value[normalizeBannerName(s.name)] || 0;
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
      chars: groups[count].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
    }))
    .sort((a, b) => b.count - a.count);
};

const groupPanels = computed(() => [
  { id: 'four', title: '4星总数分布', cellClass: '', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'fourStarCount') },
  { id: 'limited', title: '限定总数分布', cellClass: 'lim', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'limitedCount') },
  { id: 'p-score', title: '4星P分数量分布', cellClass: 'p-score', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'pScoreCount') },
  { id: 'pure-score', title: '4星分卡数量分布 (非判非奶非团分)', cellClass: 'pure-score', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'pureScoreCount') },
  { id: 'recovery', title: '4星奶卡数量分布', cellClass: 'recovery', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'recoveryCount') },
  { id: 'accuracy', title: '4星判卡数量分布', cellClass: 'accuracy', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'accuracyCount') },
  { id: 'three', title: '3星总数分布', cellClass: 'three-star', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'threeStarCount') },
  { id: 'two', title: '2星总数分布', cellClass: 'two-star', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'twoStarCount') },
  {
    id: 'reward',
    title: '报酬总数分布',
    cellClass: 'reward',
    showRewardBreakdown: true,
    groups: groupByCount(processedStats.value, 'rewardTotalCount')
  },
  {
    id: 'limited-ban',
    title: '限ban数量分布',
    cellClass: 'limited-ban',
    showRewardBreakdown: false,
    groups: groupByCount(
      processedStats.value.filter((row) => !VS_NAMES.includes(String(row?.name || '').trim().split(/\s+/)[0])),
      'limitedBanCount'
    )
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
    const isFes = ['cfes', 'bfes'].includes(type);
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

  const applyFestivalMerge = (rows) => {
    if (!festivalMergeHigherRanks.value) return rows;
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
    return { festival: fest, anchorId: FESTIVAL_ANCHOR_IDS[fest], rows: applyFestivalMerge(rows) };
  });
});

const statsPreviewPayload = computed(() => {
  const fourPanel = groupPanels.value.find((p) => p.id === 'four');
  const limitedPanel = groupPanels.value.find((p) => p.id === 'limited');
  const festivalGroups = Object.fromEntries(
    (festivalCharStats.value || []).map((item) => [item.festival, item.rows || []])
  );
  return {
    maxEventId: safeMaxEventId.value,
    groups: {
      fourStarCount: fourPanel?.groups || [],
      limitedCount: limitedPanel?.groups || [],
      festival: festivalGroups
    }
  };
});

watch(statsPreviewPayload, (payload) => {
  emit('stats-preview-update', payload);
}, { immediate: true });

const attrMatrixRows = computed(() => {
  const rows = [...processedStats.value]
    .sort((a, b) => (CHAR_ORDER[a.name] || 999) - (CHAR_ORDER[b.name] || 999))
    .map((s) => ({
      name: s.name,
      Pure: s.attrCounts.Pure,
      Cool: s.attrCounts.Cool,
      Cute: s.attrCounts.Cute,
      Happy: s.attrCounts.Happy,
      Mysterious: s.attrCounts.Mysterious,
      pureScoreCount: s.pureScoreCount,
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
  if (!key || !order) return rows;

  const orderFactor = order === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = Number(a?.[key] || 0);
    const bv = Number(b?.[key] || 0);
    if (av !== bv) return (av - bv) * orderFactor;
    return (CHAR_ORDER[a.name] || 999) - (CHAR_ORDER[b.name] || 999);
  });
});

const unitAttrExtremes = computed(() => {
  const result = {};
  const unitBuckets = {};
  attrMatrixRows.value.forEach((row) => {
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
});

const getAttrExtremeClass = (attr, value, name) => {
  void attr;
  const unit = getUnitByChar(name);
  const range = unitAttrExtremes.value?.[unit];
  if (!range) return '';
  if (range.max !== range.min && value === range.max) return 'matrix-max';
  if (range.max !== range.min && value === range.min) return 'matrix-min';
  return '';
};

const virtualSingerSongStats = computed(() => {
  const maxEid = safeMaxEventId.value;
  const map = Object.fromEntries(VS_NAMES.map((n) => [n, []]));
  const unitOrder = { ln: 1, mmj: 2, vbs: 3, ws: 4, nc: 5 };

  (props.allEvents || []).forEach((ev) => {
    if (ev?.isPredict) return;
    if (!isNumericEventId(ev?.id)) return;
    if (Number(ev.id) > maxEid) return;
    if (!String(ev?.event_song || '').trim()) return;

    const bannerName = String(ev?.banner || '').trim();
    const unitRaw = String(ev?.unit || '').trim().toLowerCase();
    const inferredUnit = bannerName ? getUnitByChar(bannerName) : unitRaw;
    const songItem = {
      tag: makeSongTag(ev),
      songName: String(ev?.event_song || '').trim(),
      color: getSongTagColor(ev),
      unit: inferredUnit,
      eventId: Number(ev.id)
    };
    parseVS(ev?.virtual_singer).forEach((vs) => {
      if (!map[vs]) return;
      map[vs].push(songItem);
    });
  });

  return VS_NAMES.map((name) => {
    const songs = [...map[name]].sort((a, b) => {
      const ua = unitOrder[a.unit] || 99;
      const ub = unitOrder[b.unit] || 99;
      if (ua !== ub) return ua - ub;
      return a.eventId - b.eventId;
    });

    const unitCounts = { ln: 0, mmj: 0, vbs: 0, ws: 0, nc: 0 };
    songs.forEach((s) => {
      if (unitCounts[s.unit] !== undefined) unitCounts[s.unit] += 1;
    });

    return {
      name,
      count: songs.length,
      songs,
      unitCounts
    };
  });
});

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

    if (['cfes', 'bfes'].includes(String(card?.Type || '').toLowerCase())) {
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
      if (db !== da) return db - da;
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
      if (db !== da) return db - da;
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
      if (events.length < 2) {
        return { name, shortest: null, longest: null };
      }
      const ranges = buildGapRanges(events, countPeriodsBetweenExclusive);
      return {
        name,
        shortest: pickGap(ranges, 'min'),
        longest: pickGap(ranges, 'max')
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
</script>

<style scoped>
.pjsk-stats {
  padding: 24px;
  color: #1f2937;
  background: linear-gradient(45deg, rgba(253, 124, 193, 0.30) 0%, rgba(135, 192, 255, 0.30) 50%, rgba(248, 255, 135, 0.30) 100%);
  min-height: 100vh;
  --matrix-sticky-top: 0px;
}

.stats-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 16px;
}

.stats-layout.nav-collapsed {
  grid-template-columns: 56px 1fr;
}

.stats-nav {
  position: sticky;
  top: 8px;
  align-self: start;
  max-height: calc(100vh - 120px);
  min-height: 0;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 4px;
  padding-right: 2px;
}

.nav-cutoff {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  padding: 8px;
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
  margin-bottom: 6px;
}

.nav-toggle {
  width: 100%;
  min-height: 38px;
  padding: 0;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;
  font-weight: 700;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nav-title {
  font-weight: 700;
  color: #374151;
  margin: 2px 0 4px;
}

.nav-link {
  width: 100%;
  text-align: left;
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  font-size: 0.82rem;
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
  padding: 5px 8px 5px 18px;
  font-size: 0.78rem;
}

.nav-link:hover {
  background: #eef2ff;
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
  border-radius: 8px;
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
  .festival-merge-toggle {
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
  grid-template-columns: repeat(auto-fit, minmax(460px, 1fr));
  gap: 20px;
  align-items: flex-start;
}

.stats-section { flex: 1; }

.card-panel {
  background: #ffffffd9;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
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
  padding: 10px;
  text-align: left;
}

.count-cell {
  font-size: 1.8em;
  font-weight: bold;
  text-align: center;
  background: #fafafa;
  color: #444;
}

.count-cell.lim { color: #ff4d4f; }
.count-cell.p-score { color: #eb2f96; } /* P分粉色 */
.count-cell.pure-score { color: #f5222d; } /* 分卡红色 */
.count-cell.reward { color: #f97316; }
.count-cell.limited-ban { color: #0f766e; }
.count-cell.three-star { color: #7c3aed; }
.count-cell.two-star { color: #059669; }
.count-cell.accuracy { color: #2563eb; }
.count-cell.recovery { color: #db2777; }

.chars-cell { display: flex; flex-wrap: wrap; gap: 8px; }

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

.sub-stat {
  font-size: 0.66em;
  color: #6b7280;
  margin-top: 2px;
}

.id-input {
  width: 64px;
  padding: 4px 6px;
  border: 2px solid #33ccbb;
  border-radius: 4px;
  font-size: 0.88rem;
  text-align: center;
}

.reset-mini-btn {
  padding: 4px 8px;
  background: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  white-space: nowrap;
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
.festival-panel {
  margin-top: 18px;
}

.festival-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
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
}

.festival-star-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
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

.matrix-num {
  color: #374151;
  font-weight: 600;
}

.matrix-group-start {
  border-left: 2px solid #94a3b8 !important;
}

.matrix-group-end {
  border-right: 2px solid #94a3b8 !important;
}

.matrix-max {
  color: #dc2626;
  font-weight: 800;
}

.matrix-min {
  color: #2563eb;
  font-weight: 800;
}

.song-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.song-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px;
  background: #ffffff;
}

.song-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.song-head-main {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.song-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid #d1d5db;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    inset 0 -2px 3px rgba(15, 23, 42, 0.2),
    0 2px 5px rgba(15, 23, 42, 0.2);
}

.song-name {
  font-weight: 700;
  color: #111827;
}

.song-count {
  font-size: 0.82rem;
  color: #6b7280;
}

.song-list {
  margin: 0;
  padding-left: 0;
  list-style: none;
  max-height: 180px;
  overflow-y: auto;
}

.unit-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.unit-chip {
  font-size: 0.72rem;
  font-weight: 700;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  padding: 2px 8px 2px 4px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.unit-logo {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.unit-count-num {
  color: #111827;
}

.song-list li {
  font-size: 0.82rem;
  line-height: 1.4;
  display: flex;
  align-items: baseline;
  gap: 8px;
  white-space: nowrap;
}

.song-tag {
  font-weight: 700;
  min-width: 4.4em;
  font-family: Consolas, 'Courier New', monospace;
}

.song-title {
  font-size: 0.7rem;
  color: #111827;
}

.record-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
}

.score-attr-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.score-empty {
  color: #94a3b8;
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
  border-radius: 6px;
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

@media (max-width: 1200px) {
  .stats-layout { grid-template-columns: 180px 1fr; }
  .stats-layout.nav-collapsed { grid-template-columns: 48px 1fr; }
  .stats-grid { grid-template-columns: 1fr; }
  .record-grid { grid-template-columns: 1fr; }
  .pjsk-stats { padding: 14px; }
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

  .stats-nav {
    position: static;
    max-height: none;
    top: auto;
  }

  .nav-toggle {
    padding: 5px 8px;
    font-size: 0.9rem;
  }

  .nav-cutoff {
    padding: 7px;
  }

  .nav-cutoff-title {
    font-size: 0.72rem;
  }

  .nav-cutoff-controls {
    gap: 4px;
  }

  .id-input {
    width: 56px;
    font-size: 0.82rem;
  }

  .reset-mini-btn {
    font-size: 0.72rem;
    padding: 3px 6px;
  }

  .config-tips {
    font-size: 0.68rem;
  }

  .nav-title {
    font-size: 0.82rem;
  }

  .nav-scroll {
    max-height: 180px;
  }

  .nav-group {
    margin-bottom: 4px;
  }

  .nav-link {
    font-size: 0.74rem;
    padding: 5px 7px;
  }

  .nav-link-sub {
    padding: 4px 7px 4px 14px;
    font-size: 0.7rem;
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
    font-size: 0.74rem;
  }

  .mini-avatar {
    width: 28px;
    height: 28px;
  }

  .song-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .festival-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .festival-card {
    padding: 8px;
  }

  .song-card {
    padding: 8px;
  }

  .song-list {
    max-height: 130px;
  }

  .song-list li {
    font-size: 0.74rem;
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
}

@media (max-width: 520px) {
  .pjsk-stats {
    padding: 6px;
  }

  .stats-main h1 {
    font-size: 1rem;
    margin-bottom: 6px;
  }

  .card-panel {
    padding: 8px;
  }

  .nav-scroll {
    max-height: 160px;
  }

  .count-table {
    min-width: 0;
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