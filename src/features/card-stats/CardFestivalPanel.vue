<template>
<div data-feature-view="card-festival-panel" data-feature-page="cards" id="panel-festival" data-scroll-anchor="panel-festival" class="stats-section card-panel festival-panel">
          <div class="section-head">
            <div class="section-head-left">
              <h2>节日人选</h2>
              <label class="festival-card-mode-toggle stats-checkbox" title="勾选后，节日人选按年份展示卡面。">
                <input class="pjsk-ui-choice" v-model="festivalShowCardImages" type="checkbox" />
                显示卡面
              </label>
              <label v-if="!festivalShowCardImages && showDesktopNameControls" class="festival-hide-name-toggle stats-checkbox export-hide" title="勾选后不显示角色头像下方名称。">
                <input class="pjsk-ui-choice" v-model="hideFestivalCharNames" type="checkbox" />
                隐藏角色名
              </label>
              <label v-if="!festivalShowCardImages" class="festival-merge-toggle stats-checkbox" title="勾选后，若角色已在更高星级出现，则不在低星级重复显示。">
                <input class="pjsk-ui-choice"
                  :checked="festivalMergeHigherRanks"
                  :indeterminate="festivalMergeHigherRanksIndeterminate"
                  type="checkbox"
                  @change="onFestivalMergeHigherRanksChange"
                />
                高星合并低星
              </label>
            </div>
            <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-festival', '节日人选')">PNG</button>
          </div>
          <div class="festival-grid">
            <div
              v-for="fest in festivalCharStats"
              :key="fest.festival"
              :id="fest.anchorId"
              :data-scroll-anchor="fest.anchorId"
              class="festival-card card-panel"
            >
              <div class="festival-card-head">
                <div class="festival-head-left">
                  <h3>{{ fest.festival }}</h3>
                  <label v-if="!festivalShowCardImages" class="festival-merge-toggle stats-checkbox festival-card-merge-toggle" title="勾选后，若角色已在更高星级出现，则不在低星级重复显示。">
                    <input class="pjsk-ui-choice" v-model="festivalMergeToggles[fest.festival]" type="checkbox" />
                    高星合并低星
                  </label>
                  <label v-if="canToggleFestivalFes(fest.festival)" class="festival-fes-toggle stats-checkbox">
                    <input class="pjsk-ui-choice"
                      :checked="festivalFesEnabled"
                      :indeterminate="festivalFesEnabledIndeterminate"
                      type="checkbox"
                      @change="onFestivalFesEnabledChange"
                    />
                    统计FES
                  </label>
                </div>
                <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng(fest.anchorId, `节日人选_${fest.festival}`)">PNG</button>
              </div>
              <table v-if="!festivalShowCardImages" class="count-table" :class="{ 'compact-char-table': hideFestivalCharNames }">
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
              <table v-else class="festival-card-table" :style="{ '--festival-card-column-count': fest.fourSlotCount + 2 }">
                <colgroup>
                  <col class="festival-card-year-col" />
                  <col v-for="idx in fest.fourSlotCount" :key="`${fest.festival}-four-col-${idx}`" class="festival-card-four-col" />
                  <col class="festival-card-minor-col" />
                  <col class="festival-card-minor-col" />
                </colgroup>
                <thead>
                  <tr>
                    <th class="festival-card-year-head">年份</th>
                    <th :colspan="fest.fourSlotCount" class="festival-card-tier-head festival-card-tier-head-four">
                      <span class="festival-star-stack festival-star-stack-row">
                        <img
                          v-for="idx in 4"
                          :key="`${fest.festival}-card-head-four-${idx}`"
                          :src="getFestivalTierIcon('four')"
                          class="festival-star-icon"
                        />
                      </span>
                    </th>
                    <th class="festival-card-tier-head festival-card-tier-head-three">
                      <span class="festival-star-stack festival-star-stack-row">
                        <img
                          v-for="idx in 3"
                          :key="`${fest.festival}-card-head-three-${idx}`"
                          :src="getFestivalTierIcon('three')"
                          class="festival-star-icon"
                        />
                      </span>
                    </th>
                    <th class="festival-card-tier-head festival-card-tier-head-two">
                      <span class="festival-star-stack festival-star-stack-row">
                        <img
                          v-for="idx in 2"
                          :key="`${fest.festival}-card-head-two-${idx}`"
                          :src="getFestivalTierIcon('two')"
                          class="festival-star-icon"
                        />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="yearRow in fest.yearRows" :key="`${fest.festival}-year-${yearRow.year}`">
                  <tr>
                    <td class="festival-card-year-cell" :rowspan="yearRow.fes.length ? 2 : 1">{{ yearRow.year }}</td>
                    <td :colspan="fest.fourSlotCount" class="festival-card-tier-cell festival-card-tier-cell-four">
                      <div class="festival-card-image-list festival-card-image-list-four" :style="{ '--festival-card-slot-count': fest.fourSlotCount, '--festival-card-cell-span': fest.fourSlotCount }">
                        <div
                          v-for="slot in yearRow.fourSlots"
                          :key="slot.key"
                          class="festival-card-image-item"
                          :class="{ 'is-empty': slot.type === 'empty' }"
                          :title="slot.card?.title || ''"
                        >
                          <div v-if="slot.type === 'card'" class="festival-card-image-thumb">
                            <img :src="`/elements/card_frame_${slot.card.frameRarity}.png`" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                            <img crossorigin="anonymous"
                              v-if="slot.card.imageSrc"
                              :src="slot.card.imageSrc"
                              :alt="`${slot.card.label} 卡面`"
                              class="fes-card-thumb-img media-load-shimmer"
                              loading="lazy"
                              decoding="async"
                              @load="onMediaImageLoad"
                              @error="onMediaImageError"
                            />
                            <img
                              v-else
                              :src="`/chibi_s/${getCharAbbr(slot.card.name)}.webp`"
                              :alt="slot.card.label"
                              class="festival-card-image-fallback"
                            />
                            <img
                              v-if="ATTRS.includes(slot.card.attr)"
                              :src="`/elements/${String(slot.card.attr).toLowerCase()}.png`"
                              :alt="ATTR_LABELS[slot.card.attr]"
                              :title="ATTR_LABELS[slot.card.attr]"
                              class="fes-card-thumb-attr"
                            />
                            <img
                              v-if="slot.card.unitLogo"
                              :src="slot.card.unitLogo"
                              class="festival-card-unit-logo"
                              :alt="slot.card.unit"
                            />
                            <span v-if="slot.card.isPermOnly" class="festival-card-perm-mark">普</span>
                          </div>
                        </div>
                        <span v-if="!yearRow.four.length" class="festival-empty">-</span>
                      </div>
                    </td>
                    <td class="festival-card-tier-cell festival-card-tier-cell-three">
                      <div class="festival-card-image-list festival-card-image-list-minor" style="--festival-card-slot-count: 1; --festival-card-cell-span: 1;">
                        <div
                          v-for="card in yearRow.three"
                          :key="card.key"
                          class="festival-card-image-item"
                          :title="card.title"
                        >
                          <div class="festival-card-image-thumb">
                            <img :src="`/elements/card_frame_${card.frameRarity}.png`" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                            <img crossorigin="anonymous"
                              v-if="card.imageSrc"
                              :src="card.imageSrc"
                              :alt="`${card.label} 卡面`"
                              class="fes-card-thumb-img media-load-shimmer"
                              loading="lazy"
                              decoding="async"
                              @load="onMediaImageLoad"
                              @error="onMediaImageError"
                            />
                            <img
                              v-else
                              :src="`/chibi_s/${getCharAbbr(card.name)}.webp`"
                              :alt="card.label"
                              class="festival-card-image-fallback"
                            />
                            <img
                              v-if="ATTRS.includes(card.attr)"
                              :src="`/elements/${String(card.attr).toLowerCase()}.png`"
                              :alt="ATTR_LABELS[card.attr]"
                              :title="ATTR_LABELS[card.attr]"
                              class="fes-card-thumb-attr"
                            />
                            <img
                              v-if="card.unitLogo"
                              :src="card.unitLogo"
                              class="festival-card-unit-logo"
                              :alt="card.unit"
                            />
                          </div>
                        </div>
                        <span v-if="!yearRow.three.length" class="festival-empty">-</span>
                      </div>
                    </td>
                    <td class="festival-card-tier-cell festival-card-tier-cell-two">
                      <div class="festival-card-image-list festival-card-image-list-minor" style="--festival-card-slot-count: 1; --festival-card-cell-span: 1;">
                        <div
                          v-for="card in yearRow.two"
                          :key="card.key"
                          class="festival-card-image-item"
                          :title="card.title"
                        >
                          <div class="festival-card-image-thumb">
                            <img :src="`/elements/card_frame_${card.frameRarity}.png`" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                            <img crossorigin="anonymous"
                              v-if="card.imageSrc"
                              :src="card.imageSrc"
                              :alt="`${card.label} 卡面`"
                              class="fes-card-thumb-img media-load-shimmer"
                              loading="lazy"
                              decoding="async"
                              @load="onMediaImageLoad"
                              @error="onMediaImageError"
                            />
                            <img
                              v-else
                              :src="`/chibi_s/${getCharAbbr(card.name)}.webp`"
                              :alt="card.label"
                              class="festival-card-image-fallback"
                            />
                            <img
                              v-if="ATTRS.includes(card.attr)"
                              :src="`/elements/${String(card.attr).toLowerCase()}.png`"
                              :alt="ATTR_LABELS[card.attr]"
                              :title="ATTR_LABELS[card.attr]"
                              class="fes-card-thumb-attr"
                            />
                            <img
                              v-if="card.unitLogo"
                              :src="card.unitLogo"
                              class="festival-card-unit-logo"
                              :alt="card.unit"
                            />
                          </div>
                        </div>
                        <span v-if="!yearRow.two.length" class="festival-empty">-</span>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="yearRow.fes.length" class="festival-card-fes-row">
                    <td :colspan="fest.fourSlotCount + 2" class="festival-card-tier-cell festival-card-tier-cell-four festival-card-tier-cell-fes">
                      <div class="festival-card-image-list festival-card-image-list-four festival-card-image-list-fes" :style="{ '--festival-card-slot-count': fest.fourSlotCount + 2, '--festival-card-cell-span': fest.fourSlotCount + 2 }">
                        <div
                          v-for="slot in yearRow.fesSlots"
                          :key="slot.key"
                          class="festival-card-image-item"
                          :class="{ 'is-empty': slot.type === 'empty', 'is-logo': slot.type === 'logo' }"
                          :title="slot.card?.title || slot.label || ''"
                        >
                          <div v-if="slot.type === 'logo'" class="festival-card-fes-logo-box">
                            <img :src="slot.logo" class="festival-card-fes-logo" :alt="slot.label" />
                          </div>
                          <div v-else-if="slot.type === 'card'" class="festival-card-image-thumb">
                            <img :src="`/elements/card_frame_${slot.card.frameRarity}.png`" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                            <img crossorigin="anonymous"
                              v-if="slot.card.imageSrc"
                              :src="slot.card.imageSrc"
                              :alt="`${slot.card.label} 卡面`"
                              class="fes-card-thumb-img media-load-shimmer"
                              loading="lazy"
                              decoding="async"
                              @load="onMediaImageLoad"
                              @error="onMediaImageError"
                            />
                            <img
                              v-else
                              :src="`/chibi_s/${getCharAbbr(slot.card.name)}.webp`"
                              :alt="slot.card.label"
                              class="festival-card-image-fallback"
                            />
                            <img
                              v-if="ATTRS.includes(slot.card.attr)"
                              :src="`/elements/${String(slot.card.attr).toLowerCase()}.png`"
                              :alt="ATTR_LABELS[slot.card.attr]"
                              :title="ATTR_LABELS[slot.card.attr]"
                              class="fes-card-thumb-attr"
                            />
                            <img
                              v-if="slot.card.unitLogo"
                              :src="slot.card.unitLogo"
                              class="festival-card-unit-logo"
                              :alt="slot.card.unit"
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                  </template>
                  <tr class="festival-card-none-row">
                    <td class="festival-card-year-cell festival-card-none-label">无</td>
                    <td :colspan="fest.fourSlotCount + 2" class="festival-card-none-cell">
                      <div class="chars-cell festival-card-none-avatars" :class="{ 'festival-chars-empty-cell': !fest.noneChars.length }">
                        <template v-if="fest.noneChars.length">
                          <div
                            v-for="char in fest.noneChars"
                            :key="`${fest.festival}-none-card-mode-${char.name}`"
                            class="char-avatar-box festival-avatar-box"
                          >
                            <div class="festival-avatar-wrap">
                              <img
                                :src="`/chibi_s/${getCharAbbr(char.name)}.webp`"
                                :title="char.name"
                                class="avatar-img"
                                :style="getStepFestivalAvatarStyle(char.name)"
                              />
                            </div>
                          </div>
                        </template>
                        <span v-else class="festival-empty">-</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
</template>

<script setup>
defineProps(["showDesktopNameControls","festivalMergeHigherRanks","festivalMergeHigherRanksIndeterminate","onFestivalMergeHigherRanksChange","isExportingPng","exportElementPng","festivalCharStats","festivalMergeToggles","canToggleFestivalFes","festivalFesEnabled","festivalFesEnabledIndeterminate","onFestivalFesEnabledChange","getFestivalTierCount","getFestivalTierIcon","getCharAbbr","getStepFestivalAvatarStyle","getFestivalUnitLogoByName","getFestivalDisplayNameLabel","onMediaImageLoad","onMediaImageError","ATTRS","ATTR_LABELS"]);
const festivalShowCardImages = defineModel('festivalShowCardImages');
const hideFestivalCharNames = defineModel('hideFestivalCharNames');
</script>
