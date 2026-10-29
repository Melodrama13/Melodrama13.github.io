<template>
<article data-feature-view="song-april-fool-stats-panel" data-feature-page="songs" id="panel-april-fool-stats" class="stats-section card-panel" data-scroll-anchor="panel-april-fool-stats">
              <div class="section-head section-head-sub">
                <div class="section-head-left">
                  <h2>{{ getSongSectionTitle('panel-april-fool-stats') }}</h2>
                </div>
                <button class="pjsk-ui-action pjsk-ui-btn-pill card-export-btn song-export-btn" :disabled="isExportingPng" @click="exportSongPanelPng('panel-april-fool-stats', getSongSectionTitle('panel-april-fool-stats'))">PNG</button>
              </div>

              <div class="song-april-year-grid">
                <article
                  v-for="yearCard in aprilFoolSongStatsByYear"
                  :key="`april-fool-year-${yearCard.year}`"
                  class="song-april-year-card"
                >
                  <div class="song-april-year-head">
                    <span class="song-april-year-title">{{ yearCard.year }}</span>
                  </div>
                  <ul class="song-april-song-list">
                    <li
                      v-for="song in yearCard.songs"
                      :key="`april-fool-song-${yearCard.year}-${song.id}`"
                      class="song-april-song-row"
                    >
                      <div
                        class="pjsk-ui-action pjsk-ui-action--image song-jacket-media song-april-song-jacket"
                        @mouseenter="showSongImageTitle($event, song.title || '-', { songId: song.id })"
                        @mouseleave="clearSongImageTitleToast"
                        @click="showSongImageTitle($event, song.title || '-', { songId: song.id })"
                      >
                        <img crossorigin="anonymous" loading="lazy" decoding="async"
                          v-if="song.jacketUrl"
                          :src="song.jacketUrl"
                          :alt="`${song.title || '歌曲'} 封面`"
                          class="song-jacket-img media-load-shimmer"
                          @load="onSongJacketLoad"
                          @error="onSongJacketError"
                        />
                        <span class="song-jacket-fallback">-</span>
                      </div>
                      <div class="song-april-vocal-icons">
                        <img
                          v-for="icon in song.vocalIcons"
                          :key="`april-fool-icon-${yearCard.year}-${song.id}-${icon.name}`"
                          :src="icon.icon"
                          :alt="icon.name"
                          :title="icon.name"
                          class="song-oc-event-vs-icon song-april-vocal-icon"
                          :style="{ borderColor: icon.borderColor }"
                        />
                      </div>
                    </li>
                  </ul>
                </article>
                <div v-if="aprilFoolSongStatsByYear.length === 0" class="song-empty">暂无愚人节歌曲数据</div>
              </div>
            </article>
</template>

<script setup>
import { getSongSectionTitle } from './songDisplayConstants.js';

/** Feature view: native markup and callbacks are preserved; state remains in its controller. */
defineProps(["isExportingPng","exportSongPanelPng","aprilFoolSongStatsByYear","showSongImageTitle","clearSongImageTitleToast","onSongJacketLoad","onSongJacketError"]);

</script>
