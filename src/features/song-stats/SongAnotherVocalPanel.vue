<template>
<article data-feature-view="song-another-vocal-panel" data-feature-page="songs" id="panel-another-vocal" class="stats-section card-panel" data-scroll-anchor="panel-another-vocal">
              <div class="section-head section-head-sub song-anvo-section-head">
                <div class="section-head-left song-anvo-section-head-left">
                  <h2>{{ getSongSectionTitle('panel-another-vocal') }}</h2>
                  <label class="song-duo-image-toggle is-image-toggle">
                    <input class="pjsk-ui-choice" :checked="anotherImageMode" type="checkbox" @change="onAnotherImageModeChange" />
                    <span>曲绘显示</span>
                  </label>
                  <label v-if="canShowAnvoFillToggle" class="song-duo-image-toggle">
                    <input class="pjsk-ui-choice" :checked="anvoFillDisplay" type="checkbox" @change="onAnvoFillDisplayChange" />
                    <span>铺满显示</span>
                  </label>
                  <label class="song-duo-image-toggle" title="多个筛选同时选中时需全部满足。">
                    <input class="pjsk-ui-choice" v-model="anvoCoverOnly" type="checkbox" />
                    <span>仅翻唱</span>
                  </label>
                  <label class="song-duo-image-toggle" title="多个筛选同时选中时需全部满足。">
                    <input class="pjsk-ui-choice" v-model="anvoThreeDOnly" type="checkbox" />
                    <span>仅3D</span>
                  </label>
                  <label class="song-duo-image-toggle" title="多个筛选同时选中时需全部满足。">
                    <input class="pjsk-ui-choice" v-model="anvoTwoDOnly" type="checkbox" />
                    <span>仅2D</span>
                  </label>
                </div>
                <div class="section-head-actions">
                  <div v-if="!anotherImageMode" class="anvo-mode-switch">
                    <button class="pjsk-ui-action anvo-mode-btn" @click="toggleAllAnotherExpandCollapse">
                      {{ anotherGlobalToggleLabel }}
                    </button>
                    <button class="pjsk-ui-action anvo-mode-btn" :class="{ active: anotherAllFixed }" @click="setAllAnotherFixedMode">
                      固定高度
                    </button>
                  </div>
                  <button class="pjsk-ui-action pjsk-ui-btn-pill card-export-btn song-export-btn" :disabled="isExportingPng" @click="exportSongPanelPng('panel-another-vocal', getSongSectionTitle('panel-another-vocal'))">PNG</button>
                </div>
              </div>

              <div class="song-role-card-grid song-stat-grid">
                <article
                  v-for="row in anotherVocalCards"
                  :key="`another-card-${row.name}`"
                  :id="getAnvoNavAnchorId(row.name) || undefined"
                  :data-scroll-anchor="`anvo-card-${row.name}`"
                  :class="['song-role-card', 'song-stat-card', 'song-anvo-card', { 'is-image-mode': anotherImageMode, 'is-fill-mode': isAnvoFillModeActive }]"
                  :style="getAnotherCardStyle(row)"
                >
                  <div v-if="anotherImageMode" class="song-anvo-image-layout">
                    <div class="song-anvo-image-head" :title="row.name">
                      <img
                        v-if="row.avatar"
                        :src="row.avatar"
                        :alt="row.name"
                        class="song-role-avatar song-image-main-avatar"
                      />
                      <div class="song-image-count">{{ row.count }}</div>
                    </div>
                    <div class="song-image-jacket-grid">
                      <div
                        v-for="song in row.songs"
                        :key="`anvo-song-jacket-${row.name}-${song.id}-${song.vocalId}`"
                        class="pjsk-ui-action pjsk-ui-action--image song-image-jacket-tile song-anvo-jacket-tile"
                        @mouseenter="showSongImageTitle($event, song.title || '-', { songId: song.id })"
                        @mouseleave="clearSongImageTitleToast"
                        @click="showSongImageTitle($event, song.title || '-', { songId: song.id })"
                      >
                        <div class="song-jacket-media song-duo-song-jacket-item">
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
                        <span v-if="song.releasedAtText" class="song-image-jacket-caption song-image-date-caption">{{ song.releasedAtText }}</span>
                      </div>
                    </div>
                  </div>
                  <template v-else>
                    <div class="song-role-head">
                      <div class="song-role-main">
                        <img
                          v-if="row.avatar"
                          :src="row.avatar"
                          :alt="row.name"
                          class="song-role-avatar"
                        />
                        <div class="song-role-text">
                          <div class="song-role-name">{{ row.name }}</div>
                          <div class="song-role-count">{{ row.count }} 首</div>
                        </div>
                      </div>
                      <div class="song-role-card-tools">
                        <button class="pjsk-ui-action song-mini-icon-btn" @click="toggleAnotherCardExpandCollapse(row.name)">
                          <img
                            :src="getAnotherCardMode(row.name) === 'collapsed' ? '/data/icon/expand.png' : '/data/icon/collapse.png'"
                            :alt="getAnotherCardMode(row.name) === 'collapsed' ? '展开' : '收起'"
                            class="song-mini-icon-btn-img"
                          />
                        </button>
                      </div>
                    </div>

                    <ul
                      v-if="getAnotherCardMode(row.name) !== 'collapsed'"
                      :class="['song-role-list', 'song-stat-list', `is-${getAnotherCardMode(row.name)}`]"
                    >
                      <li v-for="song in row.songs" :key="`another-song-${row.name}-${song.id}-${song.vocalId}`" :class="{ 'is-deleted-song': song.isDeletedSong }">
                        <span class="song-role-song-id">#{{ song.id }}</span>
                        <span class="song-role-song-title">{{ song.title || '-' }}</span>
                      </li>
                    </ul>
                  </template>
                </article>
                <div v-if="anotherVocalCards.length === 0" class="song-empty">暂无 Another Vocal 数据</div>
              </div>
            </article>
</template>

<script setup>
import { getSongSectionTitle } from './songDisplayConstants.js';

/** Feature view: native markup and callbacks are preserved; state remains in its controller. */
defineProps(["anotherImageMode","onAnotherImageModeChange","canShowAnvoFillToggle","anvoFillDisplay","onAnvoFillDisplayChange","toggleAllAnotherExpandCollapse","anotherGlobalToggleLabel","anotherAllFixed","setAllAnotherFixedMode","isExportingPng","exportSongPanelPng","anotherVocalCards","getAnvoNavAnchorId","isAnvoFillModeActive","getAnotherCardStyle","showSongImageTitle","clearSongImageTitleToast","onSongJacketLoad","onSongJacketError","toggleAnotherCardExpandCollapse","getAnotherCardMode"]);
const anvoCoverOnly = defineModel('anvoCoverOnly', { required: true });
const anvoThreeDOnly = defineModel('anvoThreeDOnly', { required: true });
const anvoTwoDOnly = defineModel('anvoTwoDOnly', { required: true });
</script>
