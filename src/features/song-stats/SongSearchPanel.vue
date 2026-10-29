<template>
<section data-feature-view="song-search-panel" data-feature-page="songs" id="panel-song-search" class="stats-section card-panel section-main">
          <div class="section-head">
            <div class="section-head-left">
              <h2>{{ getSongSectionTitle('panel-song-search') }}</h2>
            </div>
          </div>

          <section class="song-toolbar">
            <input
              v-model.trim="keyword"
              class="pjsk-ui-field song-search"
              type="text"
              placeholder="按 ID（请加前缀#，如 #241）/ 歌曲名（支持假名与罗马音）/ 词曲作者搜索"
              aria-label="搜索乐曲"
            />
          </section>

          <section
            :ref="registerSongListWrap"
            :class="['song-list-wrap', { 'is-h-scroll': isSongTableOverflowing }]"
          >
            <table class="song-table">
              <colgroup>
                <col class="song-col-id" />
                <col class="song-col-jacket" />
                <col class="song-col-song" />
                <col class="song-col-group" />
                <col class="song-col-mv" />
                <col class="song-col-diff" />
                <col class="song-col-credit" />
                <col class="song-col-credit" />
                <col class="song-col-credit" />
              </colgroup>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>曲绘</th>
                  <th>曲名</th>
                  <th class="song-th-filter">
                    <select v-model="groupFilter" class="pjsk-ui-field song-filter-select song-th-select" aria-label="团体筛选">
                      <option
                        v-for="option in GROUP_FILTER_OPTIONS"
                        :key="`group-filter-head-${option.value}`"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                  </th>
                  <th class="song-th-filter">
                    <select v-model="mvFilter" class="pjsk-ui-field song-filter-select song-th-select" aria-label="MV 筛选">
                      <option value="all">MV</option>
                      <option value="3d">3DMV</option>
                      <option value="2d">2DMV</option>
                      <option value="vs2d">VS2D</option>
                      <option value="original">原画MV</option>
                    </select>
                  </th>
                  <th class="song-th-filter">
                    <div class="song-th-filter-stack">
                      <select v-model="difficultySortKey" class="pjsk-ui-field song-filter-select song-th-select">
                        <option value="">难度</option>
                        <option
                          v-for="option in DIFFICULTY_SORT_OPTIONS"
                          :key="`difficulty-sort-head-${option.value}`"
                          :value="option.value"
                        >
                          {{ option.label }}
                        </option>
                      </select>
                      <button
                        class="pjsk-ui-action song-diff-order-btn"
                        :class="[`is-${difficultySortMode}`]"
                        :title="difficultySortModeTitle"
                        @click="cycleDifficultySortMode($event)"
                      >
                        <img :src="difficultySortModeIconSrc" class="song-diff-order-icon" alt="排序模式" />
                      </button>
                    </div>
                  </th>
                  <th>作曲</th>
                  <th>作词</th>
                  <th>编曲</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="song in pagedSongs" :key="`song-${song.id}-${song.title}`">
                  <td>{{ song.id }}</td>
                  <td class="song-jacket-cell">
                    <div
                      class="pjsk-ui-action pjsk-ui-action--image song-jacket-media"
                      @mouseenter="showSongImageTitle($event, song.title || '-', { songId: song.id, compact: true })"
                      @mouseleave="clearSongImageTitleToast"
                      @click="showSongImageTitle($event, song.title || '-', { songId: song.id, compact: true })"
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
                  </td>
                  <td class="song-title-cell">
                    <span class="song-title-text">{{ song.title || '-' }}</span>
                  </td>
                  <td class="song-group-cell">
                    <div class="song-group-wrap">
                      <span v-if="song.groupTags.length === 0" class="song-group-empty">-</span>
                      <template v-for="group in song.groupTags" :key="`group-${song.id}-${group.key}`">
                        <img
                          v-if="group.kind === 'logo'"
                          :src="group.icon"
                          :alt="group.label"
                          :title="group.label"
                          class="song-group-logo"
                        />
                        <span v-else :class="['song-group-pill', { 'is-other': group.kind === 'other' }]">
                          {{ group.label }}
                        </span>
                      </template>
                    </div>
                  </td>
                  <td class="song-mv-cell">
                    <div class="song-mv-wrap">
                      <span v-if="song.mvTags.length === 0" class="song-mv-empty">-</span>
                      <span
                        v-for="mv in song.mvTags"
                        :key="`mv-${song.id}-${mv.key}-${mv.label}`"
                        :class="['song-mv-chip', mv.tone]"
                      >
                        {{ mv.label }}
                      </span>
                    </div>
                  </td>
                  <td class="song-diff-cell">
                    <div class="song-diff-wrap">
                      <span
                        v-for="diff in SONG_DIFFICULTY_ORDER"
                        :key="`diff-${song.id}-${diff.key}`"
                        :class="['song-diff-badge', `is-${diff.key}`, { 'is-empty': diff.key === 'append' && isSongDifficultyMissing(song, diff.key) }]"
                      >
                        {{ diff.key === 'append' && isSongDifficultyMissing(song, diff.key) ? '' : getSongDifficultyText(song, diff.key) }}
                      </span>
                    </div>
                  </td>
                  <td class="song-credit-cell">{{ song.composer || '-' }}</td>
                  <td class="song-credit-cell">{{ song.lyricist || '-' }}</td>
                  <td class="song-credit-cell">{{ song.arranger || '-' }}</td>
                </tr>
                <tr v-if="filteredSongs.length === 0">
                  <td colspan="9" class="song-empty">暂无匹配歌曲</td>
                </tr>
                <tr
                  v-for="n in emptyPagedRowCount"
                  :key="`song-placeholder-${n}`"
                  class="song-placeholder-row"
                >
                  <td colspan="9"></td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="song-pagination" v-if="filteredSongs.length > 0">
            <button class="pjsk-ui-action song-page-btn" :disabled="currentSongPage <= 1" @click="changeSongPage(-1, $event)">-</button>
            <span class="song-page-text">第 {{ currentSongPage }} / {{ totalSongPages }} 页</span>
            <button class="pjsk-ui-action song-page-btn" :disabled="currentSongPage >= totalSongPages" @click="changeSongPage(1, $event)">+</button>
            <button class="pjsk-ui-action song-home-btn" title="回到第一页" @click="backToSongHome($event)">
              <img src="/data/icon/reset.png" class="song-home-btn-icon" alt="回到第一页" />
            </button>
            <label class="song-page-size-field">
              <span>每页</span>
              <select :value="songPageSize" class="pjsk-ui-field song-page-size-select" @change="onSongPageSizeChange($event)">
                <option v-for="size in SONG_PAGE_SIZE_OPTIONS" :key="`song-page-size-${size}`" :value="size" :selected="size === songPageSize">{{ size }}</option>
              </select>
            </label>
            <span class="song-page-count">共 {{ filteredSongs.length }} 首</span>
          </section>
        </section>
</template>

<script setup>
import { getSongSectionTitle, GROUP_FILTER_OPTIONS, DIFFICULTY_SORT_OPTIONS, SONG_DIFFICULTY_ORDER, SONG_PAGE_SIZE_OPTIONS } from './songDisplayConstants.js';
import { isSongDifficultyMissing, getSongDifficultyText } from './songFormatters.js';

/** Feature view: native markup and callbacks are preserved; state remains in its controller. */
defineProps(["registerSongListWrap","isSongTableOverflowing","difficultySortMode","difficultySortModeTitle","cycleDifficultySortMode","difficultySortModeIconSrc","pagedSongs","showSongImageTitle","clearSongImageTitleToast","onSongJacketLoad","onSongJacketError","filteredSongs","emptyPagedRowCount","currentSongPage","changeSongPage","totalSongPages","backToSongHome","songPageSize","onSongPageSizeChange"]);
const keyword = defineModel('keyword', { required: true });
const groupFilter = defineModel('groupFilter', { required: true });
const mvFilter = defineModel('mvFilter', { required: true });
const difficultySortKey = defineModel('difficultySortKey', { required: true });
</script>
