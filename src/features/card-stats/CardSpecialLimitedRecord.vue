<template>
<div data-feature-view="card-special-limited-record" data-feature-page="cards" id="rel-special-limited-stat" data-scroll-anchor="rel-special-limited-stat" class="record-block special-limited-record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-special-limited-stat') }}</h3>
                  <label class="support-wl-toggle fes-card-mode-toggle stats-checkbox export-hide">
                    <input class="pjsk-ui-choice" :checked="specialLimitedShowCardImages" type="checkbox" @change="onSpecialLimitedShowCardImagesChange" />
                    <span>显示卡面</span>
                  </label>
                </div>
                <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-special-limited-stat', '特殊统计_特殊限定统计')">PNG</button>
              </div>
              <div
                class="special-limited-matrix"
                :class="{ 'is-card-mode': specialLimitedShowCardImages, 'has-cfes-double': specialLimitedHasDoubleCfes }"
              >
                <template v-for="unitGroup in specialLimitedUnitGroups" :key="`special-limited-group-wrap-${unitGroup.unit}`">
                  <span
                    v-for="breakClass in unitGroup.breakBeforeClasses"
                    :key="`special-limited-break-${unitGroup.unit}-${breakClass}`"
                    class="special-limited-line-break"
                    :class="breakClass"
                    aria-hidden="true"
                  ></span>
                  <div
                    class="special-limited-unit-segment"
                    :class="[
                      `special-limited-segment-${unitGroup.index}`,
                      { 'has-cfes-double': hasSpecialLimitedDoubleCfes(unitGroup) }
                    ]"
                    :style="{ '--special-limited-unit-cols': unitGroup.characters.length, '--special-limited-unit-color': unitGroup.color }"
                  >
                    <div class="special-limited-unit-spacer" aria-hidden="true"></div>
                    <div class="special-limited-unit-band" :style="{ backgroundColor: unitGroup.tint }">
                      <img :src="unitLogoMap[unitGroup.unit]" class="special-limited-unit-logo" :alt="unitGroup.unit" />
                    </div>
                    <div class="special-limited-head-spacer" aria-hidden="true"></div>
                    <div
                      v-for="char in unitGroup.characters"
                      :key="`special-limited-head-${unitGroup.unit}-${char.name}`"
                      class="special-limited-char-head"
                      :style="{ '--special-limited-char-color': char.color, '--special-limited-char-tint': char.tint }"
                      :title="char.name"
                    >
                      <img :src="`/chibi_s/${getCharAbbr(char.name)}.webp`" class="special-limited-char-avatar" :style="{ borderColor: char.color }" :alt="char.name" />
                    </div>
                    <template v-for="row in specialLimitedRows" :key="`special-limited-row-${unitGroup.unit}-${row.key}`">
                      <div class="special-limited-row-label" :class="`is-${row.key}`">
                        <span>{{ row.label }}</span>
                      </div>
                      <div
                        v-for="char in unitGroup.characters"
                        :key="`special-limited-cell-${row.key}-${char.name}`"
                        class="special-limited-data-cell"
                        :class="{
                          'is-empty': !specialLimitedMatrix[row.key]?.[char.name]?.cards?.length,
                          'is-multi': (specialLimitedMatrix[row.key]?.[char.name]?.cards?.length || 0) > 1
                        }"
                        :style="{ '--special-limited-char-color': char.color, '--special-limited-char-tint': char.tint, '--special-limited-char-soft': char.softTint, '--special-limited-char-empty': char.emptyTint }"
                        :title="specialLimitedMatrix[row.key]?.[char.name]?.title || `${row.label} ${char.name}`"
                      >
                        <template v-if="specialLimitedShowCardImages">
                          <div v-if="specialLimitedMatrix[row.key]?.[char.name]?.cards?.length" class="special-limited-card-stack">
                            <div
                              v-for="card in specialLimitedMatrix[row.key][char.name].cards"
                              :key="`special-limited-card-${row.key}-${char.name}-${card.cardId || card.orderId}`"
                              class="fes-card-thumb special-limited-card-thumb"
                            >
                              <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                              <img crossorigin="anonymous"
                                v-if="card.imageSrc"
                                :src="card.imageSrc"
                                :alt="`${char.name} ${row.label} 卡面`"
                                class="fes-card-thumb-img media-load-shimmer"
                                loading="lazy"
                                decoding="async"
                                @load="onMediaImageLoad"
                                @error="onMediaImageError"
                              />
                              <span v-if="!card.imageSrc" class="special-limited-card-fallback">{{ getCharSingleMark(char.name) }}</span>
                              <img
                                v-if="ATTRS.includes(card.attr)"
                                :src="`/elements/${String(card.attr).toLowerCase()}.png`"
                                class="fes-card-thumb-attr"
                                :alt="ATTR_LABELS[card.attr]"
                                :title="ATTR_LABELS[card.attr]"
                                loading="lazy"
                                decoding="async"
                              />
                            </div>
                          </div>
                          <span v-else class="score-empty">-</span>
                        </template>
                        <template v-else>
                          <div v-if="specialLimitedMatrix[row.key]?.[char.name]?.cards?.length" class="special-limited-attr-stack">
                            <template v-for="card in specialLimitedMatrix[row.key][char.name].cards" :key="`special-limited-attr-${row.key}-${char.name}-${card.cardId || card.orderId}`">
                              <img
                                v-if="ATTRS.includes(card.attr)"
                                :src="`/elements/${String(card.attr).toLowerCase()}.png`"
                                class="special-limited-attr-icon"
                                :alt="ATTR_LABELS[card.attr]"
                                :title="ATTR_LABELS[card.attr]"
                              />
                            </template>
                            <span v-if="!specialLimitedMatrix[row.key][char.name].cards.some((card) => ATTRS.includes(card.attr))" class="score-empty">-</span>
                          </div>
                          <span v-else class="score-empty">-</span>
                        </template>
                      </div>
                    </template>
                  </div>
                </template>
              </div>
            </div>
</template>

<script setup>
defineProps(["getRelatedRecordTitle","specialLimitedShowCardImages","onSpecialLimitedShowCardImagesChange","isExportingPng","exportElementPng","specialLimitedHasDoubleCfes","specialLimitedUnitGroups","hasSpecialLimitedDoubleCfes","unitLogoMap","getCharAbbr","specialLimitedRows","specialLimitedMatrix","onMediaImageLoad","onMediaImageError","getCharSingleMark","ATTRS","ATTR_LABELS"]);
</script>
