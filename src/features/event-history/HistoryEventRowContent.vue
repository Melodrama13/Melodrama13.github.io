<template>
<button
            v-if="getPredictStatus(row.event) === 'predicted'"
            class="pjsk-ui-action predict-delete-btn"
            title="删除这条预测"
            @click.stop="removePredict(row.event)"
          >
            ×
          </button>
          <div class="event-basic">
            <span class="event-id">#{{ row.event.id }}</span>
            <span class="event-date">{{ formatEventDatePadded(row.event.start_date) }}</span>
            <span v-if="row.event.end_date" class="event-end-date">{{ formatEventDatePadded(row.event.end_date) }}</span>
            <span v-if="getBoxTurnInRound(row.event)" class="box-turn-tag">轮{{ getBoxTurnInRound(row.event) }}</span>
            <div v-if="isSpecialFestival(row.event.festival)" class="fest-tag">
              {{ row.event.festival }}
            </div>
          </div>

          <div class="banner-section">
            <div class="avatar-wrapper">
              <template v-if="['World Link', '总集篇'].includes(row.event.event_type) && row.event.unit">
                <img :src="`/elements/${row.event.unit.toLowerCase()}.png`" class="unit-logo-banner" :title="row.event.unit" />
              </template>
              <template v-else-if="row.event.banner">
                <img :src="`/chibi_s/${getCharAbbr(row.event.banner)}.webp`" class="banner-avatar" :title="'Ban主: ' + row.event.banner" />
                <span class="banner-tag" :style="{ backgroundColor: getCharColor(row.event.banner) }">BAN</span>
              </template>
            </div>
            <div
              v-if="formatSeriesCompact(row.event)"
              class="editor-series-chip"
              :style="getEditorSeriesStyle(row.event)"
            >
              {{ formatSeriesCompact(row.event) }}
            </div>
          </div>

          <div class="event-main-content">
            <div class="event-title-row">
              <span class="event-title">{{ row.event.event_title || (isCompilationEvent(row.event) ? `${row.event.unit} 总集篇` : '') }}</span>
            </div>

            <div class="type-indicator">
              <span class="type-tag" :style="getTypeTagStyle(row.event)">
                {{ row.event.event_type }}
              </span>
              <span class="series-text">{{ formatSeries(row.event) }}</span>
            </div>
          </div>

          <div class="event-members">
            <template v-if="shouldRenderEventHeavy(row)">
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
                  <div v-if="getMemberRibbonLabel(card)" class="lim-tag"><span class="lim-tag-text">{{ getMemberRibbonLabel(card) }}</span></div>
                  <div class="stars-overlay">
                    <img v-for="n in parseInt(card.Rarity)" :key="n" :src="card.Rarity == 4 ? '/elements/rstar.png' : '/elements/ystar.png'" class="star-icon" />
                  </div>
                  <div class="card-detail-tooltip" :style="getCardTooltipStyle(row.key, card, `n-${normalIndex}`)">
                    <div v-if="shouldRenderCardTooltipContent(row.key, card, `n-${normalIndex}`)" class="card-tooltip-hero" :class="{ 'is-text-only': getVisibleCardTooltipImageList(card).length === 0 }">
                      <div v-if="getVisibleCardTooltipImageList(card).length > 0" class="card-tooltip-media" :class="{ 'is-dual': getVisibleCardTooltipImageList(card).length > 1 }">
                        <div
                          v-for="src in getVisibleCardTooltipImageList(card)"
                          :key="`card-tip-${row.key}-${card.CardID}-${normalIndex}-${src}`"
                          class="card-tooltip-jacket-item"
                          :class="{ 'is-failed': isCardTooltipImageFailed(card, src) }"
                        >
                          <img
                            crossorigin="anonymous"
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
            </template>
            <template v-else>
              <div class="member-row member-row-placeholder" aria-hidden="true">
                <span
                  v-for="n in getEventPlaceholderMemberCount(row.event, 'normal')"
                  :key="`member-placeholder-${row.key}-${n}`"
                  class="member-card-placeholder"
                ></span>
              </div>
            </template>

            <div v-if="shouldRenderEventHeavy(row) && getFesCards(row.event.memberCards).length > 0" class="member-row fes-row">
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
                  <div v-if="getMemberRibbonLabel(card)" class="lim-tag"><span class="lim-tag-text">{{ getMemberRibbonLabel(card) }}</span></div>
                  <div class="stars-overlay">
                    <img v-for="n in parseInt(card.Rarity)" :key="n" :src="'/elements/rstar.png'" class="star-icon" />
                  </div>
                  <div class="card-detail-tooltip" :style="getCardTooltipStyle(row.key, card, `f-${fesIndex}`)">
                    <div v-if="shouldRenderCardTooltipContent(row.key, card, `f-${fesIndex}`)" class="card-tooltip-hero" :class="{ 'is-text-only': getVisibleCardTooltipImageList(card).length === 0 }">
                      <div v-if="getVisibleCardTooltipImageList(card).length > 0" class="card-tooltip-media" :class="{ 'is-dual': getVisibleCardTooltipImageList(card).length > 1 }">
                        <div
                          v-for="src in getVisibleCardTooltipImageList(card)"
                          :key="`card-tip-${row.key}-${card.CardID}-${fesIndex}-${src}`"
                          class="card-tooltip-jacket-item"
                          :class="{ 'is-failed': isCardTooltipImageFailed(card, src) }"
                        >
                          <img
                            crossorigin="anonymous"
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
            <div v-else-if="getEventPlaceholderMemberCount(row.event, 'fes') > 0" class="member-row fes-row member-row-placeholder" aria-hidden="true">
              <span class="fes-type-icon-placeholder"></span>
              <span
                v-for="n in getEventPlaceholderMemberCount(row.event, 'fes')"
                :key="`fes-placeholder-${row.key}-${n}`"
                class="member-card-placeholder"
              ></span>
            </div>
          </div>

          <div class="vs-section">
            <template v-if="shouldRenderEventHeavy(row)">
            <div class="vs-top-row">
              <div v-if="row.event.virtual_singer" class="vs-list">
                <img v-for="vs in parseVS(row.event.virtual_singer)" :key="vs" :src="`/chars/${getCharAbbr(vs)}.png`" :title="vs" class="vs-avatar" />
              </div>
              <div
                class="song-tooltip"
                :class="{ 'is-open': isSongTooltipOpen(row.key) }"
                v-if="hasSongTooltip(row.event)"
                :style="getSongTooltipStyle(row.key)"
                @mouseenter="handleSongTooltipEnter(row.key, $event)"
                @mouseleave="clearTooltipRaisedEvent(row.key)"
                @focusin="handleSongTooltipEnter(row.key, $event)"
                @focusout="clearTooltipRaisedEvent(row.key)"
                @click.stop="toggleSongTooltip(row.key, $event)"
              >
                <span class="info-icon" aria-hidden="true">🎵</span>
                <div class="tooltip-content">
                  <div v-if="shouldRenderSongTooltipContent(row.key)" class="song-tooltip-hero">
                    <div class="song-tooltip-jacket-wrap" :class="{ 'is-failed': !getSongTooltipImageSrc(row.event) }">
                      <img
                        crossorigin="anonymous"
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
            </template>
            <div v-else class="vs-section-placeholder" aria-hidden="true">
              <div class="vs-placeholder-row">
                <span
                  v-for="n in getEventPlaceholderVsCount(row.event)"
                  :key="`vs-placeholder-${row.key}-${n}`"
                  class="vs-avatar-placeholder"
                ></span>
              </div>
              <div class="song-mv-grid song-mv-grid-placeholder" v-if="hasSongTooltip(row.event)">
                <span class="song-mv-pill-placeholder"></span>
                <span class="song-mv-pill-placeholder"></span>
              </div>
            </div>
          </div>
</template>

<script setup>
import { isCompilationEvent } from '../../utils/compilationEvents.js';

const props = defineProps({
  formatting: { type: Object, required: true },
  tooltips: { type: Object, required: true },
  songMedia: { type: Object, required: true },
  predictionEligibility: { type: Object, required: true },
  predictionEditor: { type: Object, required: true },
  eventOrdering: { type: Object, required: true },
  progressiveRender: { type: Object, required: true },
  presentation: { type: Object, required: true },
  cardMedia: { type: Object, required: true },
  row: { type: Object, required: true },
});
const { hasAttributeIcon, formatEventDatePadded } = props.formatting;
const { getCardTooltipStyle, handleCardTooltipEnter, getSongTooltipStyle, handleSongTooltipEnter, clearTooltipRaisedEvent, toggleCardTooltip, isCardTooltipOpen, shouldRenderCardTooltipContent, toggleSongTooltip, isSongTooltipOpen, shouldRenderSongTooltipContent } = props.tooltips;
const { hasSong3DMV, hasSong2DMV, getSongIdText, getSongTooltipImageSrc, onCardTooltipImageLoad, onSongTooltipImageError, onSongTooltipImageLoad, getSongTitleText, getSongComposerText, getSongLyricistText, getSongArrangerText, hasSongTooltip } = props.songMedia;
const { getPredictStatus } = props.predictionEligibility;
const { removePredict } = props.predictionEditor;
const { getBoxTurnInRound } = props.eventOrdering;
const { shouldRenderEventHeavy, getEventPlaceholderMemberCount, getEventPlaceholderVsCount } = props.progressiveRender;
const { translateType, translateSkill, translateAttr, getCharAbbr, getUnitColor, getCharColor, isVirtualSinger, isSpecialFestival, getNormalCards, getFesCards, getFesType, getMemberRibbonLabel, getTypeTagStyle, formatSeries, formatSeriesCompact, getEditorSeriesStyle, parseVS } = props.presentation;
const { getVisibleCardTooltipImageList, isCardTooltipImageFailed, onCardTooltipImageError } = props.cardMedia;
</script>
