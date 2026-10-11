<template>
<div data-feature-view="card-distribution-panel" data-feature-page="cards" id="panel-dist" data-scroll-anchor="panel-dist" class="stats-section card-panel section-main">
          <div class="section-head">
            <div class="section-head-left">
              <h2>阶梯分布</h2>
              <label v-if="showDesktopNameControls" class="dist-hide-name-toggle stats-checkbox export-hide" title="勾选后不显示角色头像下方名称。">
                <input class="pjsk-ui-choice" v-model="hideDistCharNames" type="checkbox" />
                隐藏角色名
              </label>
              <label class="dist-vs-unit-toggle stats-checkbox export-hide" title="勾选后，阶梯分布底部团汇总会额外计入附属该团的VS卡片；活动banner相关统计不计入。">
                <input class="pjsk-ui-choice"
                  :checked="includeVsInDistUnitSummary"
                  :indeterminate="includeVsInDistUnitSummaryIndeterminate"
                  type="checkbox"
                  @change="onIncludeVsInDistUnitSummaryChange"
                />
                团统计VS
              </label>
            </div>
            <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-dist', '阶梯分布')">PNG</button>
          </div>
          <div class="stats-grid">
            <div
              v-for="panel in groupPanels"
              :key="panel.id"
              class="stats-section card-panel"
              :id="`panel-${panel.id}`"
              :data-scroll-anchor="`panel-${panel.id}`"
            >
              <div class="section-head section-head-sub">
                <div class="section-head-left">
                  <h2>{{ panel.title }}</h2>
                  <label
                    v-if="panel.allowVsUnitSummary"
                    class="dist-vs-unit-toggle stats-checkbox"
                    title="勾选后，该项底部团汇总会额外计入附属该团的VS卡片。"
                  >
                    <input class="pjsk-ui-choice" v-model="distVsUnitSummaryToggles[panel.id]" type="checkbox" />
                    团统计VS
                  </label>
                  <label
                    v-if="panel.id === 'limited'"
                    class="reward-collab-toggle stats-checkbox"
                    title="勾选后，限定总数与限定间隔记录会计入WL3卡。"
                  >
                    <input class="pjsk-ui-choice" v-model="limitedIncludeWl3" type="checkbox" />
                    <span>{{ isMobileNav ? 'WL3' : '统计WL3' }}</span>
                  </label>
                  <label
                    v-if="panel.id === 'limited'"
                    class="reward-collab-toggle stats-checkbox"
                    title="勾选后，限定总数与限定间隔记录会计入歌限卡。"
                  >
                    <input class="pjsk-ui-choice" v-model="limitedIncludeSongLimited" type="checkbox" />
                    <span>{{ isMobileNav ? '歌限' : '统计歌限' }}</span>
                  </label>
                  <label
                    v-if="panel.id === 'reward'"
                    class="reward-collab-toggle stats-checkbox"
                    title="勾选后，报酬统计会额外计入联动的二/三星卡。"
                  >
                    <input class="pjsk-ui-choice" v-model="includeCollabRewardCards" type="checkbox" />
                    统计联动
                  </label>
                  <label
                    v-if="panel.id === 'three'"
                    class="reward-collab-toggle stats-checkbox"
                    title="勾选后，三星总数按报酬三星统计（包括联动）。"
                  >
                    <input class="pjsk-ui-choice" v-model="useRewardCountForThreeStar" type="checkbox" />
                    报酬
                  </label>
                  <label
                    v-if="panel.id === 'two'"
                    class="reward-collab-toggle stats-checkbox"
                    title="勾选后，二星总数按报酬二星统计（包括联动）。"
                  >
                    <input class="pjsk-ui-choice" v-model="useRewardCountForTwoStar" type="checkbox" />
                    报酬
                  </label>
                  <label
                    v-if="panel.id === 'pure-score'"
                    class="reward-collab-toggle stats-checkbox"
                    title="勾选后，4星分卡会计入团分卡。"
                  >
                    <input class="pjsk-ui-choice" :checked="includeUnitScoreInPureScore" type="checkbox" @change="onIncludeUnitScoreInPureScoreChange" />
                    统计团分
                  </label>
                  <label
                    v-if="panel.id === 'fes-limited'"
                    class="reward-collab-toggle stats-checkbox"
                    title="勾选后，百六限定次数会额外计入当期FES卡。"
                  >
                    <input class="pjsk-ui-choice" v-model="fesLimitedIncludeFes" type="checkbox" />
                    统计FES
                  </label>
                  <div v-if="panel.id === 'limited-ban'" class="head-inline-filters">
                    <label class="head-filter-toggle stats-checkbox" title="统计箱活限定Ban个数。">
                      <input class="pjsk-ui-choice"
                        type="checkbox"
                        :checked="limitedBanEventTypeFilter.includes('箱活')"
                        @change="setLimitedBanEventTypeFilter('箱活', $event.target.checked)"
                      />
                      箱活
                    </label>
                    <label class="head-filter-toggle stats-checkbox" title="统计混活限定Ban个数。">
                      <input class="pjsk-ui-choice"
                        type="checkbox"
                        :checked="limitedBanEventTypeFilter.includes('混活')"
                        @change="setLimitedBanEventTypeFilter('混活', $event.target.checked)"
                      />
                      混活
                    </label>
                  </div>
                  <div v-if="panel.id === 'banner'" class="head-inline-filters">
                    <label class="head-filter-toggle stats-checkbox" title="统计箱活Banner个数。">
                      <input class="pjsk-ui-choice"
                        type="checkbox"
                        :checked="bannerEventTypeFilter.includes('箱活')"
                        @change="setBannerEventTypeFilter('箱活', $event.target.checked)"
                      />
                      箱活
                    </label>
                    <label class="head-filter-toggle stats-checkbox" title="统计混活Banner个数。">
                      <input class="pjsk-ui-choice"
                        type="checkbox"
                        :checked="bannerEventTypeFilter.includes('混活')"
                        @change="setBannerEventTypeFilter('混活', $event.target.checked)"
                      />
                      混活
                    </label>
                  </div>
                  <div v-if="panel.id === 'fes-limited-ban'" class="head-inline-filters">
                    <label class="head-filter-toggle stats-checkbox" title="统计百六箱限Ban个数。">
                      <input class="pjsk-ui-choice"
                        type="checkbox"
                        :checked="fesLimitedBanEventTypeFilter.includes('箱活')"
                        @change="setFesLimitedBanEventTypeFilter('箱活', $event.target.checked)"
                      />
                      箱活
                    </label>
                    <label class="head-filter-toggle stats-checkbox" title="统计百六混限Ban个数。">
                      <input class="pjsk-ui-choice"
                        type="checkbox"
                        :checked="fesLimitedBanEventTypeFilter.includes('混活')"
                        @change="setFesLimitedBanEventTypeFilter('混活', $event.target.checked)"
                      />
                      混活
                    </label>
                  </div>
                </div>
                <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng(`panel-${panel.id}`, `阶梯分布_${panel.title}`)">PNG</button>
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
              <div v-if="panel.unitSummary?.length" class="dist-unit-summary">
                <span
                  v-for="unitRow in panel.unitSummary"
                  :key="`${panel.id}-unit-summary-${unitRow.unit}`"
                  class="dist-unit-summary-chip"
                  :style="getDistUnitSummaryChipStyle(unitRow.unit)"
                  :title="`${unitRow.title}：${unitRow.total}`"
                >
                  <img :src="unitLogoMap[unitRow.unit]" class="dist-unit-summary-logo" :alt="unitRow.title" />
                  <span class="dist-unit-summary-num">{{ unitRow.total }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
</template>

<script setup>
defineProps(["showDesktopNameControls","includeVsInDistUnitSummary","includeVsInDistUnitSummaryIndeterminate","onIncludeVsInDistUnitSummaryChange","isExportingPng","exportElementPng","groupPanels","distVsUnitSummaryToggles","isMobileNav","includeUnitScoreInPureScore","onIncludeUnitScoreInPureScoreChange","limitedBanEventTypeFilter","setLimitedBanEventTypeFilter","bannerEventTypeFilter","setBannerEventTypeFilter","fesLimitedBanEventTypeFilter","setFesLimitedBanEventTypeFilter","getCharAbbr","getStepFestivalAvatarStyle","getDistNameLabel","getDistUnitSummaryChipStyle","unitLogoMap"]);
const hideDistCharNames = defineModel('hideDistCharNames');
const limitedIncludeWl3 = defineModel('limitedIncludeWl3');
const limitedIncludeSongLimited = defineModel('limitedIncludeSongLimited');
const includeCollabRewardCards = defineModel('includeCollabRewardCards');
const useRewardCountForThreeStar = defineModel('useRewardCountForThreeStar');
const useRewardCountForTwoStar = defineModel('useRewardCountForTwoStar');
const fesLimitedIncludeFes = defineModel('fesLimitedIncludeFes');
</script>
