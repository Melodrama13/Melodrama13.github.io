<template>
<div v-static-corners data-ui-static-corner="float" data-ui-static-paint data-feature-view="history-preview-panel" data-feature-page="history"


          :key="panel.id"
          :data-preview-panel="panel.id"
          :class="['preview-panel', 'ui-liquid-glass', 'ui-liquid-glass--prominent', 'ui-glass-optical-detail', { 'is-collapsed': isPreviewPanelCollapsed(panel.id) }]"
          :style="getPreviewPanelStyle(panel.id)"
          @mousedown="bringPreviewPanelToFront(panel.id)"
          @touchstart="bringPreviewPanelToFront(panel.id)"
        >
          <div class="preview-panel-head" @mousedown.prevent="startDragPreview(panel.id, $event)" @touchstart.prevent="startDragPreviewTouch(panel.id, $event)">
            <span class="preview-title">{{ panel.title }}</span>
            <HistoryPreviewCollapseButton :collapsed="isPreviewPanelCollapsed(panel.id)" :label="panel.title" @toggle="togglePreviewPanelCollapsed(panel.id)" />
          </div>
          <div v-if="hasPreviewOptions" v-show="!isPreviewPanelCollapsed(panel.id)" class="preview-panel-options" role="group" :aria-label="`${panel.title}选项`" @mousedown.stop @touchstart.stop @click.stop>
            <template v-if="panel.id === 'limited'">
              <label class="preview-head-toggle" title="计入发限WL卡。"><input class="pjsk-ui-choice" v-model="previewLimitedIncludeWl3" type="checkbox" /><span>WL</span></label>
              <label class="preview-head-toggle" title="计入歌限卡。"><input class="pjsk-ui-choice" v-model="previewLimitedIncludeSongLimited" type="checkbox" /><span>歌限</span></label>
            </template>
            <template v-if="panel.id === 'banner'">
              <label v-for="type in CARD_STATISTICS_EVENT_TYPES" :key="type" class="preview-head-toggle"><input class="pjsk-ui-choice" v-model="previewBannerEventTypeFilter" :value="type" type="checkbox" /><span>{{ type }}</span></label>
            </template>
            <template v-if="panel.id === 'limited-ban'">
              <label v-for="type in CARD_STATISTICS_EVENT_TYPES" :key="type" class="preview-head-toggle"><input class="pjsk-ui-choice" v-model="previewLimitedBanEventTypeFilter" :value="type" type="checkbox" /><span>{{ type }}</span></label>
            </template>
            <label v-if="['three', 'two'].includes(panel.id)" class="preview-head-toggle" title="三星、二星按报酬统计。"><input class="pjsk-ui-choice" v-model="previewThreeUseRewardCount" type="checkbox" /><span>报酬</span></label>
            <label v-if="['reward', 'three', 'two'].includes(panel.id)" class="preview-head-toggle" :title="panel.id !== 'reward' &amp;&amp; !previewThreeUseRewardCount ? '先勾选报酬，再设置是否计入联动卡。' : '联动卡同时计入报酬及采用报酬口径的三星、二星。'"><input class="pjsk-ui-choice" v-model="previewIncludeCollabReward" :disabled="panel.id !== 'reward' && !previewThreeUseRewardCount" type="checkbox" /><span>联动</span></label>
            <label v-if="['pure-score', 'char-attr'].includes(panel.id)" class="preview-head-toggle" title="分卡统计计入团分卡。"><input class="pjsk-ui-choice" v-model="previewIncludeUnitScoreInPureScore" type="checkbox" /><span>团分</span></label>
            <template v-if="panel.id === 'year'">
              <label class="preview-head-toggle" title="按周年活动至下一周年前一期活动划分。"><input class="pjsk-ui-choice" v-model="previewYearUseOperatingYear" type="checkbox" /><span>运营年</span></label>
              <label class="preview-head-toggle" title="仅影响自然年统计，运营年始终按周年周期划分。"><input class="pjsk-ui-choice" v-model="previewYearNewYearNextYear" :disabled="previewYearUseOperatingYear" type="checkbox" /><span>新年次年</span></label>
              <label v-for="option in CARD_YEAR_RARITY_OPTIONS" :key="option.value" class="preview-head-toggle"><input class="pjsk-ui-choice" v-model="previewYearRarities" :value="option.value" type="checkbox" /><span>{{ option.label }}</span></label>
              <label v-for="option in CARD_YEAR_TYPE_OPTIONS" :key="option.value" class="preview-head-toggle"><input class="pjsk-ui-choice" v-model="previewYearCardTypes" :value="option.value" type="checkbox" /><span>{{ option.label }}</span></label>
            </template>
            <template v-if="panel.id === 'festival'">
              <label class="preview-head-toggle" title="角色已在更高星级出现时，不再列入低星级。"><input class="pjsk-ui-choice" v-model="previewFestivalMergeHigherRanks" type="checkbox" /><span>高星合并</span></label>
              <label v-if="panel.festivalShowFes" class="preview-head-toggle"><input class="pjsk-ui-choice" v-model="previewFestivalFesToggles[activePreviewFestivalName]" type="checkbox" /><span>FES</span></label>
            </template>
          </div>
          <div v-show="!isPreviewPanelCollapsed(panel.id)" class="preview-steps" :class="{ 'is-grouped-list': panel.id === 'festival' || panel.steps.length > 0 }" :style="getPreviewStepsStyle(panel.id)">
            <div v-if="panel.id === 'year'" class="preview-year-summary"><span>{{ panel.yearLabel }}</span><span>共 {{ panel.yearTotal }} 张</span></div>
            <template v-if="panel.id === 'attr-five'">
              <div class="preview-attr-head">
                <span>角色</span>
                <img src="/elements/attr_pure_v1.png" class="preview-attr-head-icon" title="Pure" />
                <img src="/elements/attr_cool_v1.png" class="preview-attr-head-icon" title="Cool" />
                <img src="/elements/attr_cute_v1.png" class="preview-attr-head-icon" title="Cute" />
                <img src="/elements/attr_happy_v1.png" class="preview-attr-head-icon" title="Happy" />
                <img src="/elements/attr_mysterious_v1.png" class="preview-attr-head-icon" title="Mysterious" />
              </div>
              <div
                v-for="row in previewAttrFiveSummaryRows"
                :key="`attr-five-summary-${row.key}`"
                class="preview-attr-row preview-attr-summary-row"
              >
                <span class="preview-attr-summary-label">{{ row.label }}</span>
                <span>{{ row.Pure }}</span>
                <span>{{ row.Cool }}</span>
                <span>{{ row.Cute }}</span>
                <span>{{ row.Happy }}</span>
                <span>{{ row.Mysterious }}</span>
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
                    <th></th>
                    <th v-for="name in PREVIEW_VS_NAMES" :key="`pv-vs-head-${name}`">
                      <img :src="`/chars/${getCharAbbr(name)}.png`" class="preview-vs-mini-avatar" :title="name" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in previewVsLastFourUnitRows" :key="`pv-vs-row-${row.unit}`">
                    <th>
                      <img :src="`/elements/unit_mini_${row.unit}.png`" class="preview-vs-mini-unit-logo" :title="row.unit.toUpperCase()" />
                    </th>
                    <td v-for="name in PREVIEW_VS_NAMES" :key="`pv-vs-cell-${row.unit}-${name}`" :style="getPreviewVsMiniDataCellStyle(row.daysByVs[name])">
                      {{ row.daysByVs[name] }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </template>
            <template v-else-if="panel.id === 'vs-unit-four-count'">
              <table class="preview-vs-mini-table">
                <thead>
                  <tr>
                    <th></th>
                    <th v-for="name in PREVIEW_VS_NAMES" :key="`pv-vs-four-head-${name}`">
                      <img :src="`/chars/${getCharAbbr(name)}.png`" class="preview-vs-mini-avatar" :title="name" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in previewVsUnitFourCountUnitRows" :key="`pv-vs-four-row-${row.unit}`">
                    <th>
                      <img :src="`/elements/unit_mini_${row.unit}.png`" class="preview-vs-mini-unit-logo" :title="row.unit.toUpperCase()" />
                    </th>
                    <td v-for="name in PREVIEW_VS_NAMES" :key="`pv-vs-four-cell-${row.unit}-${name}`" :style="getPreviewVsFourCountCellStyle(row.countByVs[name])">
                      {{ Number(row.countByVs[name] || 0) > 0 ? row.countByVs[name] : '-' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </template>
            <template v-else-if="panel.id === 'vs-unit-score'">
              <table class="preview-vs-score-table">
                <thead>
                  <tr>
                    <th></th>
                    <th v-for="name in PREVIEW_VS_NAMES" :key="`pv-score-head-${name}`">
                      <img :src="`/chars/${getCharAbbr(name)}.png`" class="preview-vs-mini-avatar" :title="name" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in previewVsUnitScoreUnitRows" :key="`pv-score-row-${row.unit}`">
                    <th>
                      <img :src="`/elements/unit_mini_${row.unit}.png`" class="preview-vs-mini-unit-logo" :title="row.unit.toUpperCase()" />
                    </th>
                    <td v-for="name in PREVIEW_VS_NAMES" :key="`pv-score-cell-${row.unit}-${name}`">
                      <div v-if="row.attrsByVs[name]?.length" class="preview-vs-score-icons">
                        <img
                          v-for="(attr, idx) in row.attrsByVs[name]"
                          :key="`pv-score-attr-${row.unit}-${name}-${idx}`"
                          :src="`/elements/attr_${String(attr).toLowerCase()}_v1.png`"
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
            <template v-else-if="panel.id === 'vs-original'">
              <table class="preview-vs-score-table">
                <thead>
                  <tr>
                    <th></th>
                    <th v-for="name in PREVIEW_VS_NAMES" :key="`pv-original-head-${name}`">
                      <img :src="`/chars/${getCharAbbr(name)}.png`" class="preview-vs-mini-avatar" :title="name" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in previewVsOriginalRows" :key="`pv-original-row-${row.type}`">
                    <th>{{ row.type }}</th>
                    <td v-for="name in PREVIEW_VS_NAMES" :key="`pv-original-cell-${row.type}-${name}`">
                      <div v-if="row.attrsByVs[name]?.length" class="preview-vs-score-icons">
                        <img
                          v-for="(attr, idx) in row.attrsByVs[name]"
                          :key="`pv-original-attr-${row.type}-${name}-${idx}`"
                          :src="`/elements/attr_${String(attr).toLowerCase()}_v1.png`"
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
                        <img :src="`/elements/attr_${String(plan.attr).toLowerCase()}_v1.png`" class="preview-daily-attr" :title="translateAttr(plan.attr)" />
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
            <template v-else-if="panel.id === 'char-attr'">
              <div v-for="card in previewCharAttrRows" :key="`char-attr-${card.name}`" class="preview-char-attr-card" :style="getPreviewCharAttrCardStyle(card.name)">
                <div class="preview-char-attr-head">
                  <img :src="`/chibi_s/${getCharAbbr(card.name)}.webp`" class="preview-char-attr-avatar" :title="card.name" />
                  <span class="preview-char-attr-name">{{ card.name }}</span>
                </div>
                <table class="preview-char-attr-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>{{ card.mainScoreLabel }}</th>
                      <th>普</th>
                      <th>P</th>
                      <th>判</th>
                      <th>奶</th>
                      <th>4</th>
                      <th>3</th>
                      <th>2</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in card.rows"
                      :key="`char-attr-row-${card.name}-${row.attr}`"
                      :style="getPreviewCharAttrRowStyle(row.attr)"
                    >
                      <td class="preview-char-attr-attr-cell">
                        <img :src="`/elements/attr_${String(row.attr).toLowerCase()}_v1.png`" class="preview-char-attr-attr-icon" :title="translateAttr(row.attr)" />
                      </td>
                      <td>{{ row.mainScoreCount }}</td>
                      <td>{{ row.scoreUpCount }}</td>
                      <td>{{ row.pScoreCount }}</td>
                      <td>{{ row.accuracyCount }}</td>
                      <td>{{ row.recoveryCount }}</td>
                      <td>{{ row.fourStarCount }}</td>
                      <td>{{ row.threeStarCount }}</td>
                      <td>{{ row.twoStarCount }}</td>
                    </tr>
                    <tr class="preview-char-attr-total-row">
                      <td>总</td>
                      <td>{{ card.totalRow.mainScoreCount }}</td>
                      <td>{{ card.totalRow.scoreUpCount }}</td>
                      <td>{{ card.totalRow.pScoreCount }}</td>
                      <td>{{ card.totalRow.accuracyCount }}</td>
                      <td>{{ card.totalRow.recoveryCount }}</td>
                      <td>{{ card.totalRow.fourStarCount }}</td>
                      <td>{{ card.totalRow.threeStarCount }}</td>
                      <td>{{ card.totalRow.twoStarCount }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-if="previewCharAttrRows.length === 0" class="preview-step preview-step-empty">
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
</template>

<script setup>
import { computed } from 'vue';
import { CARD_STATISTICS_EVENT_TYPES } from '../card-stats/cardStatisticsRules.js';
import { CARD_YEAR_RARITY_OPTIONS } from '../card-stats/cardYearStats.js';
import { CARD_YEAR_TYPE_OPTIONS } from '../card-stats/cardYearCardTypes.js';
import HistoryPreviewCollapseButton from './HistoryPreviewCollapseButton.vue';
const props = defineProps({
  previewLayout: { type: Object, required: true },
  previewSelections: { type: Object, required: true },
  previewCutoff: { type: Object, required: true },
  vsPreview: { type: Object, required: true },
  previewStatistics: { type: Object, required: true },
  dailyLineup: { type: Object, required: true },
  characterAttributePreview: { type: Object, required: true },
  presentation: { type: Object, required: true },
  panel: { type: Object, required: true },
});
const { bringPreviewPanelToFront, isPreviewPanelCollapsed, togglePreviewPanelCollapsed, getPreviewPanelStyle, getPreviewStepsStyle, startDragPreview, startDragPreviewTouch, startResizePreview, startResizePreviewTouch } = props.previewLayout;
const { previewYearRarities, previewYearCardTypes, previewYearUseOperatingYear, previewYearNewYearNextYear, previewIncludeCollabReward, previewThreeUseRewardCount, previewLimitedIncludeWl3, previewLimitedIncludeSongLimited, previewIncludeUnitScoreInPureScore, previewFestivalMergeHigherRanks, previewFestivalFesToggles, previewLimitedBanEventTypeFilter, previewBannerEventTypeFilter } = props.previewSelections;
const hasPreviewOptions = computed(() => ['limited', 'banner', 'limited-ban', 'reward', 'three', 'two', 'pure-score', 'char-attr', 'festival', 'year'].includes(props.panel.id));
const { activePreviewFestivalName } = props.previewCutoff;
const { PREVIEW_VS_NAMES, previewVsLastFourUnitRows, previewVsUnitFourCountUnitRows, previewVsUnitScoreUnitRows, previewVsOriginalRows, getPreviewVsMiniDataCellStyle, getPreviewVsFourCountCellStyle } = props.vsPreview;
const { previewAttrFiveSummaryRows, previewAttrFiveRows, getPreviewAttrRowStyle } = props.previewStatistics;
const { previewDailyLineupRows, getPreviewDailyPlanStyle, getPreviewDailyCardStyle, getPreviewDailyScoreCellClass } = props.dailyLineup;
const { previewCharAttrRows, getPreviewCharAttrCardStyle, getPreviewCharAttrRowStyle } = props.characterAttributePreview;
const { translateAttr, getCharAbbr, getFestivalPreviewUnitLogo } = props.presentation;
</script>
