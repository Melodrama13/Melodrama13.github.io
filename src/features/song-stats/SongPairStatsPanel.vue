<template>
<article data-feature-view="song-pair-stats-panel" data-feature-page="songs" id="panel-duo-stats" class="stats-section card-panel" data-scroll-anchor="panel-duo-stats">
              <div class="section-head section-head-sub">
                <div class="section-head-left">
                  <h2>{{ getSongSectionTitle('panel-duo-stats') }}</h2>
                  <label class="song-duo-image-toggle is-image-toggle">
                    <input class="pjsk-ui-choice" :checked="duoImageMode" type="checkbox" @change="onDuoImageModeChange" />
                    <span>曲绘显示</span>
                  </label>
                </div>
                <div class="section-head-actions">
                  <div v-if="!duoImageMode" class="anvo-mode-switch">
                    <button class="pjsk-ui-action anvo-mode-btn" @click="toggleAllDuoExpandCollapse">
                      {{ duoGlobalToggleLabel }}
                    </button>
                  </div>
                  <button class="pjsk-ui-action pjsk-ui-btn-pill card-export-btn song-export-btn" :disabled="isExportingPng" @click="exportSongPanelPng('panel-duo-stats', getSongSectionTitle('panel-duo-stats'))">PNG</button>
                </div>
              </div>

              <div class="song-duo-unit-grid">
                <article
                  v-for="unitCard in sameUnitPairUnitCards"
                  :key="`duo-unit-${unitCard.unit}`"
                  :id="unitCard.anchorId"
                  :data-scroll-anchor="`duo-unit-${unitCard.unit}`"
                  :class="['song-duo-unit-card', { 'is-ws-split': unitCard.isWsSplit && !duoImageMode }]"
                  :style="{ backgroundColor: unitCard.tint }"
                >
                  <div
                    :class="['song-duo-pair-grid', 'song-stat-grid', { 'is-ws-split-grid': unitCard.isWsSplit && !duoImageMode, 'is-image-compact': duoImageMode }]"
                    :ref="(el) => setDuoPairGridRef(unitCard.unit, el)"
                  >
                    <article
                      v-for="card in unitCard.pairs"
                      :key="card.key"
                      :data-scroll-anchor="`duo-card-${card.key}`"
                      :class="['song-role-card', 'song-duo-card', 'song-stat-card', { 'is-image-mode': duoImageMode }]"
                      :style="duoImageMode
                        ? { backgroundImage: card.gradientBg, borderColor: unitColorMap[unitCard.unit] || '#334155' }
                        : { backgroundImage: card.gradientBg }"
                    >
                      <div v-if="duoImageMode" class="song-duo-image-row">
                        <div class="song-image-identity song-duo-image-identity" :title="`${card.memberA.name} & ${card.memberB.name}`">
                          <div class="song-duo-image-avatars">
                            <img :src="getCharacterAvatarSrc(card.memberA.name)" :alt="card.memberA.name" class="song-role-avatar song-duo-image-avatar" />
                            <img :src="getCharacterAvatarSrc(card.memberB.name)" :alt="card.memberB.name" class="song-role-avatar song-duo-image-avatar" />
                          </div>
                          <div class="song-image-count">{{ card.count }}</div>
                        </div>
                        <div class="song-image-jacket-grid song-duo-jacket-grid">
                          <div
                            v-for="song in card.songs"
                            :key="`duo-song-jacket-${card.key}-${song.id}`"
                            class="pjsk-ui-action pjsk-ui-action--image song-image-jacket-tile song-duo-jacket-tile"
                            @mouseenter="showSongImageTitle($event, song.title || '-', { songId: song.id })"
                            @mouseleave="clearSongImageTitleToast"
                            @click="showSongImageTitle($event, song.title || '-', { songId: song.id })"
                          >
                            <div class="song-jacket-media song-duo-song-jacket-item song-oc-event-jacket">
                              <img crossorigin="anonymous" loading="lazy" decoding="async"
                                v-if="song.jacketUrl"
                                :src="song.jacketUrl"
                                :alt="`${song.title || '歌曲'} 封面`"
                                class="song-jacket-img song-duo-song-jacket-img media-load-shimmer"
                                @load="onSongJacketLoad"
                                @error="onSongJacketError"
                              />
                              <span class="song-jacket-fallback">-</span>
                              <div class="song-oc-event-vs-icons is-mini is-overlay">
                                <img
                                  v-for="vs in song.vsIcons"
                                  :key="`duo-image-vs-${card.key}-${song.id}-${vs.name}`"
                                  :src="vs.icon"
                                  :alt="vs.name"
                                  :title="vs.name"
                                  class="song-oc-event-vs-icon"
                                />
                              </div>
                            </div>
                            <span v-if="song.releaseDateText" class="song-image-jacket-caption song-image-date-caption">{{ song.releaseDateText }}</span>
                          </div>
                        </div>
                      </div>
                      <template v-else>
                        <div class="song-role-head">
                          <div class="song-role-main song-stat-main">
                            <img :src="getCharacterAvatarSrc(card.memberA.name)" :alt="card.memberA.name" class="song-role-avatar" />
                            <img :src="getCharacterAvatarSrc(card.memberB.name)" :alt="card.memberB.name" class="song-role-avatar" />
                            <div class="song-role-text">
                                  <div class="song-role-name song-duo-name">
                                <span :ref="(el) => setDuoNameRef(card.key, el)" class="duo-name-probe">{{ card.memberA.name }} & {{ card.memberB.name }}</span>
                                <span v-if="!isDuoNameCompact(card.key)" class="duo-name-full">{{ card.memberA.name }} & {{ card.memberB.name }}</span>
                                <span v-else class="duo-name-short">{{ getCharacterSingleMark(card.memberA.name) }} & {{ getCharacterSingleMark(card.memberB.name) }}</span>
                                  </div>
                              <div class="song-role-count">{{ card.count }} 首</div>
                            </div>
                          </div>
                          <button class="pjsk-ui-action song-mini-icon-btn" @click="toggleDuoCardExpandCollapse(card.key)">
                                <img
                                  :src="isDuoCardExpanded(card.key) ? '/data/icon/collapse.png' : '/data/icon/expand.png'"
                                  :alt="isDuoCardExpanded(card.key) ? '收起' : '展开'"
                                  class="song-mini-icon-btn-img"
                                />
                          </button>
                        </div>
                        <ul v-if="isDuoCardExpanded(card.key)" class="song-role-list song-stat-list song-stat-list-duo">
                          <li v-for="song in card.songs" :key="`duo-song-${card.key}-${song.id}`">
                            <div class="song-oc-event-vs-icons is-duo-inline">
                              <span
                                v-if="(song.vsIcons?.length || 0) === 0"
                                class="song-oc-event-vs-icon is-placeholder-slot"
                                aria-hidden="true"
                              ></span>
                              <img
                                v-for="vs in song.vsIcons"
                                :key="`duo-text-vs-${card.key}-${song.id}-${vs.name}`"
                                :src="vs.icon"
                                :alt="vs.name"
                                :title="vs.name"
                                class="song-oc-event-vs-icon"
                              />
                            </div>
                            <span class="song-role-song-title">{{ song.title || '-' }}</span>
                            <div class="song-event-mv-col song-duo-event-mv-col">
                              <span v-if="song.has2d" class="song-mv-chip is-2d song-event-mv-chip">2D</span>
                              <span v-else class="song-event-mv-empty song-duo-event-mv-empty"></span>
                            </div>
                            <div class="song-event-mv-col song-duo-event-mv-col">
                              <span v-if="song.has3d" class="song-mv-chip is-3d song-event-mv-chip">3D</span>
                              <span v-else class="song-event-mv-empty song-duo-event-mv-empty"></span>
                            </div>
                          </li>
                        </ul>
                      </template>
                    </article>
                  </div>
                </article>
                <div v-if="sameUnitPairUnitCards.length === 0" class="song-empty">暂无同团双人歌曲数据</div>
              </div>
            </article>
</template>

<script setup>
import { getSongSectionTitle } from './songDisplayConstants.js';

/** Feature view: native markup and callbacks are preserved; state remains in its controller. */
defineProps(["duoImageMode","onDuoImageModeChange","toggleAllDuoExpandCollapse","duoGlobalToggleLabel","isExportingPng","exportSongPanelPng","sameUnitPairUnitCards","setDuoPairGridRef","unitColorMap","getCharacterAvatarSrc","showSongImageTitle","clearSongImageTitleToast","onSongJacketLoad","onSongJacketError","setDuoNameRef","isDuoNameCompact","getCharacterSingleMark","toggleDuoCardExpandCollapse","isDuoCardExpanded"]);

</script>
