<template>
  <div data-feature-view="card-year-stats-panel" data-feature-page="cards" id="panel-year" data-scroll-anchor="panel-year" class="stats-section card-panel section-main year-stats-panel">
    <div class="section-head">
      <div class="section-head-left">
        <h2>年份统计</h2>
        <label class="stats-checkbox">
          <input class="pjsk-ui-choice" v-model="yearShowCardImages" type="checkbox" />
          显示卡面
        </label>
        <label v-if="yearShowCardImages" class="stats-checkbox">
          <input class="pjsk-ui-choice" v-model="yearShowCardDates" type="checkbox" />
          显示出卡日期
        </label>
        <label v-if="!yearShowCardImages && showDesktopNameControls" class="stats-checkbox export-hide">
          <input class="pjsk-ui-choice" v-model="hideYearCharNames" type="checkbox" />
          隐藏角色名
        </label>
        <label v-if="!yearShowCardImages" class="dist-vs-unit-toggle stats-checkbox export-hide" title="勾选后，各年底部团汇总会额外计入附属该团的VS卡片。">
          <input class="pjsk-ui-choice" :checked="includeVsInYearUnitSummary" :indeterminate="includeVsInYearUnitSummaryIndeterminate" type="checkbox" @change="onIncludeVsInYearUnitSummaryChange" />
          团统计VS
        </label>
        <label class="stats-checkbox" title="从周年活动到下一周年前一期活动，联动按活动开启日期归属。">
          <input class="pjsk-ui-choice" v-model="yearUseOperatingYear" type="checkbox" />
          按照运营年统计
        </label>
        <label class="stats-checkbox" title="仅影响自然年统计；运营年始终按周年周期划分。">
          <input class="pjsk-ui-choice" v-model="yearNewYearNextYear" :disabled="yearUseOperatingYear" type="checkbox" />
          新年计入下一年
        </label>
        <div class="head-inline-filters" role="group" aria-label="年份统计稀有度">
          <label v-for="option in yearRarityOptions" :key="option.value" class="stats-checkbox">
            <input class="pjsk-ui-choice" v-model="yearRarities" type="checkbox" :value="option.value" />
            {{ option.label }}
          </label>
        </div>
        <div class="head-inline-filters" role="group" aria-label="年份统计卡片类型">
          <label v-for="option in yearCardTypeOptions" :key="option.value" class="stats-checkbox">
            <input class="pjsk-ui-choice" v-model="yearCardTypes" type="checkbox" :value="option.value" />
            {{ option.label }}
          </label>
        </div>
      </div>
      <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-year', '年份统计')">PNG</button>
    </div>
    <div class="stats-grid year-stats-grid" :class="{ 'is-card-mode': yearShowCardImages }">
      <div v-for="panel in yearPanels" :key="panel.year" :id="panel.anchorId" :data-scroll-anchor="panel.anchorId" class="stats-section card-panel year-stats-card">
        <div class="section-head section-head-sub">
          <div class="section-head-left">
            <h2>{{ panel.title }}</h2>
            <span class="year-stats-total">共 {{ panel.total }} 张</span>
            <label v-if="!yearShowCardImages" class="dist-vs-unit-toggle stats-checkbox" title="勾选后，该年底部团汇总会额外计入附属该团的VS卡片。">
              <input class="pjsk-ui-choice" :checked="panel.includeVsInUnitSummary" type="checkbox" @change="onYearVsUnitSummaryChange(panel.anchorId, $event.target.checked)" />
              团统计VS
            </label>
          </div>
          <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng(panel.anchorId, `年份统计_${panel.title}`)">PNG</button>
        </div>
        <table v-if="!yearShowCardImages" class="count-table" :class="{ 'compact-char-table': hideYearCharNames }">
          <thead><tr><th width="50" scope="col">数量</th><th scope="col">持有角色</th></tr></thead>
          <tbody>
            <tr v-for="group in panel.groups" :key="group.count">
              <td class="count-cell">{{ group.count }}</td>
              <td class="chars-cell">
                <div v-for="character in group.chars" :key="character.name" class="char-avatar-box">
                  <img :src="`/chibi_s/${getCharAbbr(character.name)}.webp`" :alt="character.name" :title="character.name" class="avatar-img" :style="getStepFestivalAvatarStyle(character.name)" loading="lazy" decoding="async" />
                  <span v-if="!hideYearCharNames" class="abbr-text">{{ getDistNameLabel(character.name) }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="matrix-wrap year-stats-wrap" tabindex="0" role="region" :aria-label="`${panel.title}角色卡面，按实装时间从上至下排列`">
          <table class="year-stats-table" :style="{ '--year-character-count': panel.characters.length }">
            <thead>
              <tr>
                <th v-for="character in panel.characters" :key="character.name" scope="col" :style="{ backgroundColor: getCharTint(character.name) }">
                  <img :src="`/chibi_s/${getCharAbbr(character.name)}.webp`" :alt="character.name" :title="character.name" class="avatar-img year-stats-avatar" :style="getStepFestivalAvatarStyle(character.name)" loading="lazy" decoding="async" />
                  <span class="year-stats-character-name">{{ getDistNameLabel(character.name) }}</span>
                  <span class="year-stats-character-count">{{ character.cards.length }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td v-for="character in panel.characters" :key="character.name" :style="{ backgroundColor: getCharTint(character.name) }">
                  <div class="year-stats-card-list">
                    <div v-for="card in character.cards" :key="card.CardID" class="year-stats-card-entry" :data-card-id="card.CardID" :title="`${character.name} · ${card.CardName || card.CardID} · ${card.dateLabel}`">
                      <div class="year-stats-thumb">
                        <img :src="`/elements/card_frame_${card.Rarity}.png`" class="year-stats-thumb-frame" alt="" loading="lazy" decoding="async" />
                        <img v-if="buildCardImageSrc(card.CardID, character.name, { card })" :src="buildCardImageSrc(card.CardID, character.name, { card })" :alt="`${character.name} ${card.CardName || ''}`" class="year-stats-thumb-image media-load-shimmer" loading="lazy" decoding="async" crossorigin="anonymous" @load="onMediaImageLoad" @error="onMediaImageError" />
                        <img v-if="ATTR_LABELS[card.Attribute]" :src="`/elements/${String(card.Attribute).toLowerCase()}.png`" class="year-stats-thumb-attr" :alt="ATTR_LABELS[card.Attribute]" loading="lazy" decoding="async" />
                        <span v-if="card.limitedLabel" class="year-stats-card-ribbon"><span>{{ card.limitedLabel }}</span></span>
                      </div>
                      <span v-if="yearShowCardDates" class="year-stats-date">{{ card.dateLabel.split('/').slice(1).join('/') }}</span>
                    </div>
                    <span v-if="!character.cards.length" class="year-stats-empty">—</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!yearShowCardImages" class="dist-unit-summary">
          <span v-for="unitRow in panel.unitSummary" :key="unitRow.unit" class="dist-unit-summary-chip" :style="getDistUnitSummaryChipStyle(unitRow.unit)" :title="`${unitRow.title}：${unitRow.total}`">
            <img :src="unitLogoMap[unitRow.unit]" class="dist-unit-summary-logo" :alt="unitRow.title" />
            <span class="dist-unit-summary-num">{{ unitRow.total }}</span>
          </span>
        </div>
      </div>
    </div>
    <p v-if="!yearPanels.length" class="year-stats-empty">当前统计范围内暂无卡片。</p>
  </div>
</template>

<script setup>
defineProps([
  'yearPanels', 'yearRarityOptions', 'yearCardTypeOptions', 'showDesktopNameControls', 'isExportingPng', 'exportElementPng',
  'getCharAbbr', 'getStepFestivalAvatarStyle', 'getDistNameLabel', 'getCharTint',
  'buildCardImageSrc', 'onMediaImageLoad', 'onMediaImageError', 'ATTR_LABELS',
  'includeVsInYearUnitSummary', 'includeVsInYearUnitSummaryIndeterminate',
  'onIncludeVsInYearUnitSummaryChange', 'onYearVsUnitSummaryChange',
  'getDistUnitSummaryChipStyle', 'unitLogoMap'
]);
const yearRarities = defineModel('yearRarities');
const yearCardTypes = defineModel('yearCardTypes');
const yearShowCardImages = defineModel('yearShowCardImages');
const yearShowCardDates = defineModel('yearShowCardDates');
const yearUseOperatingYear = defineModel('yearUseOperatingYear');
const yearNewYearNextYear = defineModel('yearNewYearNextYear');
const hideYearCharNames = defineModel('hideYearCharNames');
</script>

<style scoped src="./styles/cardYearStatsContent.css"></style>
