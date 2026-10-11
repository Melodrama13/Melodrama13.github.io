<template>
<article data-feature-view="song-three-dmv-stats-panel" data-feature-page="songs" id="panel-3dmv-stats" class="stats-section card-panel" data-scroll-anchor="panel-3dmv-stats">
              <div class="section-head section-head-sub">
                <div class="section-head-left">
                  <h2>{{ getSongSectionTitle('panel-3dmv-stats') }}</h2>
                  <label class="song-duo-image-toggle is-image-toggle">
                    <input class="pjsk-ui-choice" :checked="threeDmvImageMode" type="checkbox" @change="onThreeDmvImageModeChange" />
                    <span>曲绘显示</span>
                  </label>
                  <label class="song-duo-image-toggle">
                    <input class="pjsk-ui-choice" :checked="threeDmvCoverOnly" type="checkbox" @change="onThreeDmvCoverOnlyChange" />
                    <span>仅翻唱</span>
                  </label>
                </div>
                <button class="pjsk-ui-action pjsk-ui-btn-pill card-export-btn song-export-btn" :disabled="isExportingPng" @click="exportSongPanelPng('panel-3dmv-stats', getSongSectionTitle('panel-3dmv-stats'))">PNG</button>
              </div>

              <div :class="['song-3dmv-unit-grid', { 'is-image-mode': threeDmvImageMode }]">
                <article
                  v-for="unitCard in threeDmvStatsByUnit"
                  :key="`3dmv-unit-${unitCard.unit}`"
                  :id="unitCard.anchorId"
                  :data-scroll-anchor="`3dmv-unit-${unitCard.unit}`"
                  :class="['song-3dmv-unit-card', { 'is-image-mode': threeDmvImageMode }]"
                  :style="{ backgroundColor: unitCard.tint, borderColor: hexToRgba(unitColorMap[unitCard.unit] || '#94a3b8', 0.45) }"
                >
                  <div class="song-3dmv-unit-head">
                    <div class="song-3dmv-unit-title">
                      <img v-if="UNIT_TITLE_LOGO_MAP[unitCard.unit]" :src="UNIT_TITLE_LOGO_MAP[unitCard.unit]" :alt="unitCard.label" class="song-oc-unit-logo" />
                      <span v-else class="song-oc-unit-name">{{ unitCard.label }}</span>
                      <span class="song-image-count song-image-count-circle song-3dmv-total-circle">{{ unitCard.total }}</span>
                    </div>
                    <div class="song-3dmv-vs-counts">
                      <span
                        v-for="vs in unitCard.vsStats"
                        :key="`3dmv-vs-count-${unitCard.unit}-${vs.name}`"
                        class="song-vs-pill song-3dmv-vs-chip"
                        :style="{ backgroundColor: hexToRgba(vs.color, 0.28), borderColor: hexToRgba(vs.color, 0.5) }"
                      >
                        <img :src="vs.icon" :alt="vs.name" :title="vs.name" class="song-3dmv-vs-chip-icon" />
                        <span>{{ vs.count }}</span>
                      </span>
                    </div>
                  </div>

                  <template v-if="!threeDmvImageMode">
                    <div class="song-3dmv-text-sections">
                      <section class="song-3dmv-text-section is-small-vocal">
                        <div class="song-3dmv-section-title">小于5人 <span>{{ unitCard.smallSongs.length }}</span></div>
                        <ul class="song-3dmv-text-list">
                          <li v-for="song in unitCard.smallSongs" :key="`3dmv-small-${unitCard.unit}-${song.id}`">
                            <div class="song-3dmv-avatar-row">
                              <img
                                v-for="icon in song.vocalIcons"
                                :key="`3dmv-small-icon-${unitCard.unit}-${song.id}-${icon.name}`"
                                :src="icon.icon"
                                :alt="icon.name"
                                :title="icon.name"
                                class="song-oc-event-vs-icon song-3dmv-vocal-icon"
                              />
                            </div>
                            <span class="song-role-song-title">{{ song.title || '-' }}</span>
                          </li>
                        </ul>
                      </section>

                      <section class="song-3dmv-text-section is-full-vocal">
                        <div class="song-3dmv-section-title">5人 <span>{{ unitCard.fullSongs.length }}</span></div>
                        <ul class="song-3dmv-text-list">
                          <li v-for="song in unitCard.fullSongs" :key="`3dmv-full-${unitCard.unit}-${song.id}`">
                            <div class="song-3dmv-avatar-row">
                              <span
                                v-if="(song.vsIcons?.length || 0) === 0"
                                class="song-oc-event-vs-icon is-placeholder-slot"
                                aria-hidden="true"
                              ></span>
                              <img
                                v-for="icon in song.vsIcons"
                                :key="`3dmv-full-vs-${unitCard.unit}-${song.id}-${icon.name}`"
                                :src="icon.icon"
                                :alt="icon.name"
                                :title="icon.name"
                                class="song-oc-event-vs-icon song-3dmv-vocal-icon"
                              />
                            </div>
                            <span class="song-role-song-title">{{ song.title || '-' }}</span>
                          </li>
                        </ul>
                      </section>
                    </div>
                  </template>

                  <template v-else>
                    <div class="song-3dmv-image-sections">
                      <section class="song-3dmv-image-section is-small-vocal">
                        <div class="song-3dmv-section-title">小于5人 <span>{{ unitCard.smallSongs.length }}</span></div>
                        <div class="song-image-jacket-grid song-3dmv-jacket-grid">
                          <div
                            v-for="song in unitCard.smallSongs"
                            :key="`3dmv-image-small-${unitCard.unit}-${song.id}`"
                            class="pjsk-ui-action pjsk-ui-action--image song-image-jacket-tile song-3dmv-jacket-tile"
                            @mouseenter="showSongImageTitle($event, song.title || '-', { songId: song.id })"
                            @mouseleave="clearSongImageTitleToast"
                            @click="showSongImageTitle($event, song.title || '-', { songId: song.id })"
                          >
                            <div class="song-jacket-media song-duo-song-jacket-item song-oc-event-jacket">
                              <img crossorigin="anonymous"
                                v-if="song.jacketUrl"
                                :src="song.jacketUrl"
                                :alt="`${song.title || '歌曲'} 封面`"
                                class="song-jacket-img song-duo-song-jacket-img media-load-shimmer"
                                loading="lazy"
                                decoding="async"
                                @load="onSongJacketLoad"
                                @error="onSongJacketError"
                              />
                              <span class="song-jacket-fallback">-</span>
                            </div>
                            <div class="song-3dmv-image-vocals">
                              <img
                                v-for="icon in song.vocalIcons"
                                :key="`3dmv-image-small-icon-${unitCard.unit}-${song.id}-${icon.name}`"
                                :src="icon.icon"
                                :alt="icon.name"
                                :title="icon.name"
                                class="song-oc-event-vs-icon song-3dmv-vocal-icon"
                              />
                            </div>
                          </div>
                        </div>
                      </section>

                      <section class="song-3dmv-image-section is-full-vocal">
                        <div class="song-3dmv-section-title">5人 <span>{{ unitCard.fullSongs.length }}</span></div>
                        <div class="song-image-jacket-grid song-3dmv-jacket-grid">
                          <div
                            v-for="song in unitCard.fullSongs"
                            :key="`3dmv-image-full-${unitCard.unit}-${song.id}`"
                            class="pjsk-ui-action pjsk-ui-action--image song-image-jacket-tile song-3dmv-jacket-tile"
                            @mouseenter="showSongImageTitle($event, song.title || '-', { songId: song.id })"
                            @mouseleave="clearSongImageTitleToast"
                            @click="showSongImageTitle($event, song.title || '-', { songId: song.id })"
                          >
                            <div class="song-jacket-media song-duo-song-jacket-item song-oc-event-jacket">
                              <img crossorigin="anonymous"
                                v-if="song.jacketUrl"
                                :src="song.jacketUrl"
                                :alt="`${song.title || '歌曲'} 封面`"
                                class="song-jacket-img song-duo-song-jacket-img media-load-shimmer"
                                loading="lazy"
                                decoding="async"
                                @load="onSongJacketLoad"
                                @error="onSongJacketError"
                              />
                              <span class="song-jacket-fallback">-</span>
                              <div class="song-oc-event-vs-icons is-mini is-overlay song-3dmv-vs-overlay">
                                <img
                                  v-for="icon in song.vsIcons"
                                  :key="`3dmv-image-full-vs-${unitCard.unit}-${song.id}-${icon.name}`"
                                  :src="icon.icon"
                                  :alt="icon.name"
                                  :title="icon.name"
                                  class="song-oc-event-vs-icon"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                  </template>
                </article>
              </div>
            </article>
</template>

<script setup>
import { getSongSectionTitle, UNIT_TITLE_LOGO_MAP } from './songDisplayConstants.js';
import { hexToRgba } from './songFormatters.js';

/** Feature view: native markup and callbacks are preserved; state remains in its controller. */
defineProps(["threeDmvImageMode","onThreeDmvImageModeChange","threeDmvCoverOnly","onThreeDmvCoverOnlyChange","isExportingPng","exportSongPanelPng","threeDmvStatsByUnit","unitColorMap","showSongImageTitle","clearSongImageTitleToast","onSongJacketLoad","onSongJacketError"]);

</script>
