<template>
  <section id="history-precedent-panel" ref="panelElement" v-liquid-glass
    data-feature-view="history-precedent-panel" data-feature-page="history"
    class="precedent-panel ui-liquid-glass ui-liquid-glass--prominent ui-glass-optical-detail"
    role="region" aria-labelledby="precedent-panel-title" tabindex="-1"
    data-html2canvas-ignore="true" @keydown.esc.stop.prevent="close()">
    <header class="precedent-header">
      <h2 id="precedent-panel-title"><History :size="18" aria-hidden="true" />活动与先例</h2>
      <UiGlassTabs v-model="mode" class="precedent-segment" :items="detailTabs" label="活动信息页面" contained />
      <button type="button" class="pjsk-ui-action precedent-close precedent-surface ui-liquid-glass ui-liquid-glass--chip" aria-label="收起活动与先例" @click="close()"><X :size="18" aria-hidden="true" /></button>
    </header>

    <div class="precedent-scroll">
      <form v-if="mode === 'search'" class="precedent-builder" @submit.prevent="search">
        <div class="precedent-rule-types" role="group" aria-label="问题类型"><button v-for="item in queryFamilies" :key="item.value" type="button" class="pjsk-ui-action precedent-surface ui-liquid-glass ui-liquid-glass--chip" :aria-pressed="family === item.value" :class="{ 'is-selected': family === item.value }" @click="applyFamily(item.value)">{{ item.label }}</button></div>
        <HistoryPrecedentPoolBuilder v-if="family === 'pool'" :draft="draft" :quantity-options="quantityOptions" />
        <template v-else>
          <HistoryPrecedentQueryFields :fields="queryControls.core" :draft="draft" :project="project" label="查询条件" @project="project = $event" />
          <HistoryPrecedentQueryFields v-if="queryControls.secondary.length" :fields="queryControls.secondary" :draft="draft" label="筛选条件" secondary />
        </template>
        <div class="precedent-builder-footer">
          <details v-if="queryRuleGroups.length" class="precedent-advanced"><summary class="pjsk-ui-action precedent-surface ui-liquid-glass ui-liquid-glass--chip">更多条件</summary>
            <div class="precedent-query-rules"><fieldset v-for="group in queryRuleGroups" :key="group.label" class="precedent-query-rule-group"><legend>{{ group.label }}</legend><div class="precedent-rule-options"><label v-for="option in group.options" :key="option.key" class="precedent-rule-option"><input v-if="option.target === 'draft'" v-model="draft[option.key]" type="checkbox" /><input v-else v-model="milestoneRules[option.key]" type="checkbox" />{{ option.label }}</label></div></fieldset></div>
          </details>
          <label class="precedent-result-field">结果<span class="precedent-order-surface precedent-field-surface precedent-surface ui-liquid-glass ui-liquid-glass--chip"><select v-model="draft.order" class="pjsk-ui-field precedent-order" aria-label="达成记录"><option value="all">全部</option><option value="first">首次</option><option value="latest">最近</option></select><ChevronDown class="precedent-field-chevron" :size="12" aria-hidden="true" /></span></label>
          <button class="pjsk-ui-action precedent-primary precedent-surface ui-liquid-glass ui-liquid-glass--chip" type="submit" :disabled="!isValid"><Search :size="15" aria-hidden="true" />查找</button>
        </div>
      </form>

      <div v-else class="precedent-event-picker" :class="{ 'is-details': mode === 'details' }">
        <HistoryRecordEventPicker v-model="selectedEventId" :options="recordEventOptions" :label="mode === 'details' ? '查看活动详情' : '查看活动纪录'" />
        <div v-if="mode === 'event' && milestoneCategories.length" class="precedent-categories" role="group" aria-label="里程碑分类">
          <button type="button" class="pjsk-ui-action precedent-surface ui-liquid-glass ui-liquid-glass--chip" :class="{ 'is-selected': milestoneFilter === 'all' }" :aria-pressed="milestoneFilter === 'all'" @click="milestoneFilter = 'all'">全部<span>{{ records.length }}</span></button>
          <button v-for="category in milestoneCategories" :key="category.value" type="button" class="pjsk-ui-action precedent-surface ui-liquid-glass ui-liquid-glass--chip" :class="{ 'is-selected': milestoneFilter === category.value }" :aria-pressed="milestoneFilter === category.value" @click="milestoneFilter = category.value">{{ category.label }}<span>{{ category.count }}</span></button>
        </div>
        <details v-if="mode === 'event'" class="precedent-record-rules">
          <summary class="pjsk-ui-action precedent-surface ui-liquid-glass ui-liquid-glass--chip">口径选项</summary>
          <div class="precedent-rule-options">
            <fieldset v-for="group in ruleOptionGroups" :key="group.label" class="precedent-rule-cluster precedent-query-rule-group"><legend>{{ group.label }}</legend><label v-for="option in group.options" :key="option.key" class="precedent-rule-option"><input v-model="milestoneRules[option.key]" type="checkbox" />{{ option.label }}</label></fieldset>
          </div>
        </details>
      </div>

      <HistoryEventDetails v-if="mode === 'details'" :key="selectedEventId" :details="selectedEventDetails" :presentation="presentation" :card-media="cardMedia" :song-media="songMedia" :characters="[...catalog.characterByName.values()]" :attribute-labels="attributeLabels" />

      <section v-if="mode === 'event' || mode === 'search' && hasSearched" class="precedent-results" aria-label="查询结果" aria-live="polite">
        <div v-if="mode === 'search' && result.progress" class="precedent-color-progress">
          <div class="precedent-progress-summary"><span>全员进度<small> · {{ result.threshold }} 张</small></span><strong>{{ result.progress.covered }}<small> / {{ result.progress.total }} 人</small></strong></div>
          <progress class="precedent-progress" :value="result.progress.covered" :max="result.progress.total || 1" :aria-label="`已达标 ${result.progress.covered} 人，共 ${result.progress.total} 人`"></progress>
          <details v-if="result.progress.missing.length" class="precedent-missing"><summary class="pjsk-ui-action precedent-surface ui-liquid-glass ui-liquid-glass--chip">未达标 {{ result.progress.missing.length }} 人</summary><ul class="precedent-missing-people"><li v-for="person in result.progress.missing" :key="person.name" :title="missingPersonLabel(person)"><img :src="`/chars/${presentation.getCharAbbr(person.name)}.png`" :alt="person.name" loading="lazy" /><strong>{{ person.count }}/{{ result.threshold }}</strong></li></ul></details>
        </div>
        <div v-for="section in recordSections" :key="section.key" class="precedent-result-group" :data-precedent-section="section.key">
        <div class="precedent-results-heading"><span>{{ section.label }}<small>{{ section.total }}</small></span><span v-if="mode === 'event' || !hasPendingChanges && section.records.some(record => record.grade)" class="precedent-grade-legend" aria-label="按金、银、铜评级优先展示" title="按金、银、铜评级优先展示"><span v-for="grade in ['gold', 'silver', 'bronze']" :key="grade" :data-grade="grade"><i aria-hidden="true"></i>{{ milestoneGrades[grade].label }}</span></span><span v-else-if="section.key === 'matches' && hasPendingChanges" class="precedent-pending">条件已变更 · 待查询</span></div>

        <div class="precedent-record-list" :class="{ 'is-single': section.total === 1 }">
        <article v-for="record in section.records" :key="record.key" class="precedent-record precedent-surface ui-liquid-glass ui-liquid-glass--chip" :class="{ 'is-group-completion': record.isGroupCompletion }" :data-grade="record.grade">
          <div class="precedent-record-tags" :class="{ 'is-dense': badgeList(record).length > 3 }"><span v-for="badge in badgeList(record)" :key="badge.text" class="precedent-record-tag precedent-surface ui-liquid-glass ui-liquid-glass--chip" :data-grade="badge.grade" :aria-label="badge.text" :aria-description="gradeDescription(badge)" :title="gradeDescription(badge)"><i v-if="badge.grade && badge.grade !== 'unrated'" class="precedent-grade-dot" aria-hidden="true"></i><template v-if="badge.attribute">{{ badge.prefix }}<img :src="`/elements/${badge.attribute.toLowerCase()}.png`" :alt="attributeLabels[badge.attribute]" />{{ badge.suffix }}</template><template v-else>{{ badge.text }}</template></span></div>
          <div class="precedent-record-main">
            <img v-if="record.name" class="precedent-avatar" :src="`/chars/${presentation.getCharAbbr(record.name)}.png`" :alt="record.name" :title="record.name" />
            <img v-else-if="record.subject?.kind === 'unit'" class="precedent-avatar precedent-unit-avatar" :src="`/elements/${record.subject.unit}.png`" :alt="record.scopeLabel" />
            <span v-else-if="record.pair" class="precedent-pair-avatars"><img v-for="name in record.pair" :key="name" :src="`/chars/${presentation.getCharAbbr(name)}.png`" alt="" /></span>
            <span v-else class="precedent-record-icon precedent-surface ui-liquid-glass ui-liquid-glass--chip"><Trophy :size="18" aria-hidden="true" /></span>
            <div class="precedent-record-copy">
              <div class="precedent-record-title">
                <h3 v-if="record.type === 'sequence' && record.attribute" class="precedent-color-title"><span v-if="record.name">{{ record.name }} ·</span><img class="precedent-attribute-icon" :src="`/elements/${record.attribute.toLowerCase()}.png`" :alt="attributeLabels[record.attribute]" /><span>{{ record.sequenceMetric === 'flowerGap' ? '缺席' : '连续' }} <strong class="precedent-result-number">{{ record.after }}</strong> {{ record.sequenceMetric === 'flowerGap' ? '期' : '张' }}</span></h3>
                <h3 v-else-if="record.type === 'completion' && attributeLabels[record.completionAttribute]" class="precedent-color-title"><span>{{ record.scopeLabel }} ·</span><img class="precedent-attribute-icon" :src="`/elements/${record.completionAttribute.toLowerCase()}.png`" :alt="attributeLabels[record.completionAttribute]" /><span><strong class="precedent-result-number">{{ record.threshold }}</strong> 四星</span></h3>
                <h3 v-else-if="record.type === 'attribute' && record.attribute !== 'all'" class="precedent-color-title"><span v-if="recordTitleName(record)">{{ recordTitleName(record) }} ·</span><img class="precedent-attribute-icon" :src="`/elements/${record.attribute.toLowerCase()}.png`" :alt="attributeLabels[record.attribute]" /><span><strong class="precedent-result-number">{{ record.threshold }}</strong> 四星</span></h3>
                <h3 v-else-if="record.type === 'skillFirst'" class="precedent-color-title"><span>{{ record.name }} ·</span><img class="precedent-attribute-icon" :src="`/elements/${record.attribute.toLowerCase()}.png`" :alt="attributeLabels[record.attribute]" /><span>首张 {{ skillLabels[record.skill] }}</span></h3>
                <h3 v-else-if="record.type === 'streak'" class="precedent-color-title"><span>{{ record.name }} ·</span><img class="precedent-attribute-icon" :src="`/elements/${record.attribute.toLowerCase()}.png`" :alt="attributeLabels[record.attribute]" /><span>连续 <strong class="precedent-result-number">{{ record.after }}</strong> 张</span></h3>
                <h3 v-else><template v-for="(part, index) in recordTitle(record).split(/(\d+)/)" :key="index"><strong v-if="index % 2" class="precedent-result-number">{{ part }}</strong><template v-else>{{ part }}</template></template></h3>
              </div>
              <p v-if="record.advancement" class="precedent-record-advance"><span>{{ advancementLabel(record) }}</span><strong>用时 {{ record.advancement.days }} 天</strong></p>
              <p v-else-if="record.type === 'interval'" class="precedent-record-metrics"><span v-for="unit in record.recordUnits" :key="unit" class="precedent-record-metric"><template v-if="record.previousValues[unit] != null"><span class="precedent-previous-value">{{ record.previousValues[unit] }}</span><span class="precedent-metric-arrow" aria-hidden="true">→</span></template><strong class="precedent-result-number">{{ record[unit] }}</strong><span class="precedent-metric-unit">{{ unit === 'days' ? '天' : '期' }}</span></span></p>
              <p v-else-if="record.type === 'sequence'" class="precedent-sequence-description"><span>{{ recordDescription(record) }}</span><span v-if="record.sequenceMetric !== 'flowerGap'" class="precedent-run-status precedent-surface ui-liquid-glass ui-liquid-glass--chip" :data-ongoing="record.ongoing"><i aria-hidden="true"></i>{{ record.ongoing ? '仍在连续' : '已结束' }}</span></p>
              <p v-else>{{ recordDescription(record) }}</p>
            </div>
          </div>
          <ol class="precedent-checkpoints" role="list" aria-label="达成时间线">
            <li v-for="point in recordCheckpoints(record)" :key="point.key" class="precedent-checkpoint" :class="{ 'precedent-advance-origin': point.key === 'start' }" :aria-label="point.label" :title="point.key === 'start' && record.advancement ? advancementOrigin(record) : undefined">
              <span class="precedent-checkpoint-dot" aria-hidden="true"></span>
              <div class="precedent-checkpoint-main">
                <div class="precedent-checkpoint-summary">
                  <time>{{ new Date(point.timestamp).toLocaleDateString('zh-CN') }}</time>
                  <span v-for="holder in point.holders" :key="`${holder.name}:${holder.attribute}`" class="precedent-checkpoint-holder" :title="holder.name"><img class="precedent-checkpoint-avatar" :src="`/chars/${presentation.getCharAbbr(holder.name)}.png`" :alt="holder.name" /><img v-if="holder.attribute && (record.type === 'attribute' && record.attribute !== 'all' || ['personalCompletion', 'completion', 'skillFirst'].includes(record.type))" class="precedent-attribute-icon" :src="`/elements/${holder.attribute.toLowerCase()}.png`" :alt="attributeLabels[holder.attribute]" /></span>
                </div>
                <div class="precedent-checkpoint-events">
                  <div v-for="event in point.events" :key="event.id" class="precedent-checkpoint-event" :title="event.event_title || event.event_type">
                    <strong v-if="presentation.formatSeriesCompact(event)">{{ presentation.formatSeriesCompact(event) }}</strong><span>{{ event.event_title || event.event_type }}</span>
                  </div>
                </div>
              </div>
              <div class="precedent-checkpoint-jumps"><button v-for="event in point.events.filter(event => !event.isPersonalCardSource)" :key="event.id" type="button" class="pjsk-ui-action precedent-jump precedent-surface ui-liquid-glass ui-liquid-glass--chip" :aria-label="`定位活动 ${event.id}`" @click="jumpToRecord(event.id)">#{{ event.id }}<ArrowUpRight :size="13" aria-hidden="true" /></button></div>
            </li>
          </ol>
          <details v-if="record.periodWindows?.length > 1" class="precedent-period-windows">
            <summary class="pjsk-ui-action precedent-surface ui-liquid-glass ui-liquid-glass--chip">适用窗口 {{ record.periodWindows.length }}</summary>
            <ul><li v-for="window in record.periodWindows" :key="window.key"><time>{{ new Date(window.startTimestamp).toLocaleDateString('zh-CN') }}</time><span aria-hidden="true">—</span><time>{{ new Date(window.endTimestamp).toLocaleDateString('zh-CN') }}</time></li></ul>
          </details>
          <HistoryPrecedentEvidence :record="record" :presentation="presentation" :card-media="cardMedia" :attribute-labels="attributeLabels" :scope-options="scopeOptions" :event-for-card="evidenceEvent" :jump-to-event="jumpToRecord" />
        </article>
        </div>

        <div v-if="section.key === 'matches' && !filteredRecords.length" class="precedent-empty"><Search :size="23" aria-hidden="true" /><strong>{{ mode === 'event' ? '暂无此类里程碑' : appliedQuery.type === 'pool' ? '暂无匹配配置' : result.threshold === 0 ? '零张无需历史达成' : '暂无匹配先例' }}</strong><p v-if="mode === 'search' && (result.threshold !== 0 || appliedQuery.type === 'pool')">可放宽范围或数量条件。</p></div>
        <button v-if="section.key === 'matches' && filteredRecords.length > visibleCount" type="button" class="pjsk-ui-action precedent-show-more precedent-surface ui-liquid-glass ui-liquid-glass--chip" @click="visibleCount += 10">更多 {{ filteredRecords.length - visibleCount }}<ChevronDown :size="14" aria-hidden="true" /></button>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import UiGlassTabs from '../../components/ui/UiGlassTabs.vue';
import HistoryPrecedentPoolBuilder from './HistoryPrecedentPoolBuilder.vue';
import HistoryEventDetails from './HistoryEventDetails.vue';
import HistoryPrecedentQueryFields from './HistoryPrecedentQueryFields.vue';
import { getPrecedentQueryControls } from './precedentQueryControls.js';
import { Search, History, Trophy, ArrowUpRight, X, ChevronDown } from 'lucide-vue-next';
import HistoryRecordEventPicker from './HistoryRecordEventPicker.vue';
import HistoryPrecedentEvidence from './HistoryPrecedentEvidence.vue';
import { makePrecedentEventOptions } from './precedentEventOptions.js';
import { MILESTONE_GRADES as milestoneGrades } from './milestoneLabels.js';
import { QUERY_FAMILIES as queryFamilies } from './precedentQueryDefinitions.js';
import { getQueryRuleGroups, MILESTONE_RULE_OPTIONS as ruleOptions } from './precedentRuleGroups.js';
const detailTabs = Object.freeze([{ value: 'details', label: '活动详情' }, { value: 'search', label: '查先例' }, { value: 'event', label: '本期纪录' }]);
const props = defineProps({ precedents: { type: Object, required: true }, presentation: { type: Object, required: true }, cardMedia: { type: Object, required: true }, songMedia: { type: Object, required: true } });
const { mode, draft, appliedQuery, selectedEventId, selectedEventDetails, eventOptions, catalog, characterOptions, scopeOptions, skillLabels,
  attributeLabels, isValid, hasSearched, hasPendingChanges, result, draftColorBounds, quantityOptions, records, filteredRecords, recordSections, visibleCount,
  extraConditionCount, milestoneFilter, milestoneCategories, milestoneRules,
  close, search, applyPreset, applyFamily, family, project, sequences, periodOptions, jumpToRecord, recordTitle, recordTitleName, recordDescription, advancementLabel, advancementOrigin, recordCheckpoints, evidenceEvent } = props.precedents;
const recordEventOptions = computed(() => {
  const cards = new Map(catalog.value.events.map(source => [String(source.event.id), source.cards.map(entry => entry.card)]));
  return makePrecedentEventOptions(eventOptions.value, event => props.presentation.formatSeriesCompact({ ...event, memberCards: cards.get(String(event.id)) || [] }));
});
const missingPersonLabel = person => `${person.name} · ${person.count}/${result.value.threshold}${appliedQuery.value.attribute === 'all' ? ` · 未达标：${(person.attributes || []).filter(cell => cell.count < result.value.threshold).map(cell => attributeLabels[cell.attribute]).join('、')}` : ''}`;
const gradeDescription = record => record.grade ? record.grade === 'unrated' ? '暂未评级；排在金、银、铜之后' : `${milestoneGrades[record.grade].label}级里程碑` : undefined;
const badgeList = record => {
  const badges = record.badges?.length ? [...record.badges] : record.badge ? [{ ...record.badgeParts, text: record.badge, grade: record.grade }] : [];
  if (mode.value === 'search') for (const position of record.queryPositions || []) {
    const text = position === 'first' ? '首次达成' : '最近达成';
    if (!badges.some(badge => badge.text === text)) badges.push({ text });
  }
  return badges.length ? badges : [{ text: '达成' }];
};
const queryControls = computed(() => getPrecedentQueryControls(props.precedents));
const queryRuleGroups = computed(() => getQueryRuleGroups(draft));
const ruleOptionGroups = [{ label: '数量口径', options: ruleOptions.slice(0, 6) }, { label: '同池口径', options: ruleOptions.slice(6) }];
const panelElement = ref(null);
onMounted(() => panelElement.value?.focus({ preventScroll: true }));
</script>

<style scoped src="./styles/historyPrecedentPanel.css"></style>
