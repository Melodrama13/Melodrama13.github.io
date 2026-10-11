<template>
<div data-feature-view="history-filter-panel" data-feature-page="history"  v-liquid-glass class="filter-panel ui-liquid-glass ui-liquid-glass--prominent ui-glass-optical-detail">
          <div class="filter-row filter-mode-row">
            <span class="row-label">模式</span>
            <div class="btn-group">
              <button class="pjsk-ui-action filter-mode-btn" :class="{active: filterMode === 'event'}" @click="switchFilterMode('event')">{{ isCompactFilterBar ? '活动' : '活动筛选' }}</button>
              <button class="pjsk-ui-action filter-mode-btn" :class="{active: filterMode === 'single'}" @click="switchFilterMode('single')">{{ isCompactFilterBar ? '卡片' : '卡片筛选' }}</button>
              <button class="pjsk-ui-action filter-mode-btn clear-btn panel-reset-btn" :class="{ 'is-ready': hasActiveFilters }" :disabled="!hasActiveFilters" @click="resetFilters">{{ isCompactFilterBar ? '重置' : '重置筛选' }}</button>
              <button class="pjsk-ui-action filter-mode-btn clear-btn panel-reset-btn panel-collapse-btn" @click="showFilter = false">收起</button>
            </div>
            <span v-if="hasActiveFilters" class="filter-mode-hit-count">{{ activeFilteredEventCount }}个活动</span>
          </div>

          <div v-if="filterMode !== 'event'" class="filter-row">
            <span class="row-label">角色</span>
            <div class="chip-group">
              <div v-for="(abbr, name) in CHAR_MAP" :key="name"
                  :class="['pjsk-ui-action', 'char-chip', { 'is-selected': filterCriteria.selectedChars.includes(name) }]"
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
                    :class="['pjsk-ui-action', 'char-chip', { 'is-selected': eventFilterCriteria.characters.includes(name) }]"
                    :title="name"
                    @click="toggleEventFilterCharacter(name)">
                  <img :src="`/chars/${getCharAbbr(name)}.png`" class="chip-img" />
                </div>
              </div>
            </div>

            <div class="filter-row">
              <span class="row-label">是否Ban</span>
              <div class="btn-group-sm">
                <button class="pjsk-ui-action"
                  :class="{ active: eventFilterCriteria.isBan === 'yes' }"
                  :disabled="!canUseEventBanFilter"
                  @click="setEventBanFilter('yes')"
                >是</button>
                <button class="pjsk-ui-action"
                  :class="{ active: eventFilterCriteria.isBan === 'no' }"
                  :disabled="!canUseEventBanFilter"
                  @click="setEventBanFilter('no')"
                >否</button>
              </div>
            </div>

            <div class="filter-row">
              <span class="row-label">多人规则</span>
              <div class="btn-group-sm">
                <button class="pjsk-ui-action"
                  :class="{ active: eventFilterCriteria.multiPersonRule === 'same-event' }"
                  :disabled="!canUseMultiPersonRule"
                  @click="setEventMultiPersonRule('same-event')"
                >同活</button>
                <button class="pjsk-ui-action"
                  :class="{ active: eventFilterCriteria.multiPersonRule === 'same-pool' }"
                  :disabled="!canUseMultiPersonRule"
                  @click="setEventMultiPersonRule('same-pool')"
                >同池</button>
              </div>
            </div>

            <div class="filter-row">
              <span class="row-label">特殊规则</span>
              <div class="btn-group-sm">
                <button class="pjsk-ui-action"
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
                <button class="pjsk-ui-action"
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
                <button class="pjsk-ui-action"
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
                <button class="pjsk-ui-action"
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
                  class="pjsk-ui-action pjsk-ui-action--image"
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
                  class="pjsk-ui-action pjsk-ui-action--image"
                  v-for="unit in ['ln', 'mmj', 'vbs', 'ws', 'nc', 'vs']"
                  :key="`event-unit-${unit}`"
                  :src="`/elements/${unit}.png`"
                  :class="{ 'icon-active': eventFilterCriteria.units.includes(unit), 'icon-disabled': isEventUnitFilterDisabledByMix }"
                  :aria-disabled="isEventUnitFilterDisabledByMix"
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
                <img class="pjsk-ui-action pjsk-ui-action--image" v-for="(color, unit) in UNIT_COLORS" :key="unit"
                    :src="`/elements/${unit}.png`"
                    :class="{ 'icon-active': filterCriteria.units.includes(unit) }"
                    @click="toggleDetailFilterArray('units', unit)"
                    :title="unit.toUpperCase()" />
              </div>
            </div>

            <div class="filter-row">
              <span class="row-label">属性</span>
              <div class="icon-group attributes">
                <img class="pjsk-ui-action pjsk-ui-action--image" v-for="attr in ['Happy', 'Mysterious', 'Cute', 'Cool', 'Pure']"
                    :key="attr" :src="`/elements/${attr.toLowerCase()}.png`"
                    :class="{ 'icon-active': filterCriteria.attributes.includes(attr) }"
                    @click="toggleDetailFilterArray('attributes', attr)" />
              </div>
            </div>

            <div class="filter-row">
              <span class="row-label">技能</span>
              <div class="btn-group-sm">
                <button class="pjsk-ui-action" v-for="(label, key) in { score_up:'普分', accuracy:'判卡', recovery:'奶卡', p_score:'P分', unit_score: '团分', cfes_l: 'CFES血分', cfes_j: 'CFES判分', bfes_up: 'BFES' }"
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
                    :class="['pjsk-ui-action', 'rarity-item', { 'active': filterCriteria.rarities.includes(r) }]"
                    @click="toggleDetailFilterArray('rarities', r)">
                  <img v-for="n in r" :key="n" :src="`/elements/${r === 4 ? 'rstar' : 'ystar'}.png`" class="star-img" />
                </div>
                <div :class="['pjsk-ui-action', 'rarity-item', { 'active': filterCriteria.rarities.includes('birthday') }]"
                    @click="toggleDetailFilterArray('rarities', 'birthday')">
                  <img src="/elements/birthday.png" class="birthday-img" />
                </div>
              </div>
            </div>

            <div class="filter-row">
              <span class="row-label">类型</span>
              <div class="btn-group-sm">
                <button class="pjsk-ui-action"
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
</template>

<script setup>
const props = defineProps({
  filtering: { type: Object, required: true },
  rows: { type: Object, required: true },
  previewSelections: { type: Object, required: true },
  filterLayout: { type: Object, required: true },
  presentation: { type: Object, required: true },
});
const { showFilter, filterMode, EVENT_TYPE_FILTER_OPTIONS, EVENT_SPECIAL_RULE_OPTIONS, EVENT_GACHA_FILTER_OPTIONS, filterCriteria, eventFilterCriteria, canUseEventBanFilter, canUseMultiPersonRule, canUseFourNoVsRule, hasActiveFilters, isEventUnitFilterDisabledByMix, eventFestivalOptions, toggleChar, toggleEventFilterCharacter, setEventMultiPersonRule, toggleDetailFilterArray, setEventBanFilter, toggleEventFilterArray, toggleEventSpecialRule, switchFilterMode, resetFilters } = props.filtering;
const { activeFilteredEventCount } = props.rows;
const { CHAR_MAP } = props.previewSelections;
const { isCompactFilterBar } = props.filterLayout;
const { UNIT_COLORS, getCharAbbr } = props.presentation;
</script>
