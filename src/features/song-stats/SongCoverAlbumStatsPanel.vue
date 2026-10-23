<template>
  <article
    id="panel-cover-album-stats"
    class="stats-section card-panel song-cover-album-panel"
    data-feature-view="song-cover-album-stats-panel"
    data-feature-page="songs"
    data-scroll-anchor="panel-cover-album-stats"
    :style="groupStyle()"
  >
    <div class="section-head section-head-sub">
      <div class="section-head-left">
        <h2>{{ getSongSectionTitle('panel-cover-album-stats') }}</h2>
        <select class="pjsk-ui-field song-cover-album-mode-select" :value="displayMode" :disabled="isExportingPng" aria-label="翻唱专辑显示模式" @change="$emit('display-mode-change', $event)">
          <option value="text">文字</option>
          <option value="image">曲绘</option>
          <option value="image-text">曲绘+文字</option>
        </select>
        <label class="song-duo-image-toggle song-cover-album-prediction-toggle">
          <input class="pjsk-ui-choice" type="checkbox" :checked="onlyPredicted" :disabled="isExportingPng" @change="$emit('only-predicted-change', $event)" />
          <span>仅预测</span>
        </label>
      </div>
      <button
        type="button"
        class="pjsk-ui-action pjsk-ui-btn-pill card-export-btn song-export-btn"
        :disabled="isExportingPng || !visibleGroups.length"
        :aria-label="`导出${exportTitle} PNG`"
        @click="exportSongPanelPng('panel-cover-album-stats', exportTitle)"
      >PNG</button>
    </div>
    <div class="song-cover-album-groups" :class="{ 'is-prediction-only': onlyPredicted }">
    <section v-for="group in visibleGroups" :key="group.unit" :id="getUnitNavAnchorId(group.unit)" :data-scroll-anchor="`cover-album-unit-${group.unit}`" class="song-cover-album-group" :data-unit="group.unit" :style="groupStyle(group)" :aria-label="`${group.label}翻唱专辑`">
      <div class="song-cover-album-summary">
        <h3 class="song-cover-album-group-title">
          <img v-if="UNIT_TITLE_LOGO_MAP[group.unit]" :src="UNIT_TITLE_LOGO_MAP[group.unit]" :alt="group.label" class="song-cover-album-group-logo" />
          <span v-else>{{ group.label }}</span>
        </h3>
        <div class="song-cover-album-summary-counts">
          <span v-if="!onlyPredicted">官方 <strong>{{ group.officialAlbumCount }}</strong> 张 · <strong>{{ group.officialSongCount }}</strong> 首</span>
          <span>待收录 <strong>{{ group.pendingSongCount }}</strong> 首</span>
        </div>
      </div>
      <div class="song-cover-album-grid">
        <section
          v-for="album in group.albums"
          :key="album.volume"
          class="song-cover-album-card"
          :class="{ 'is-predicted': album.status !== 'official' }"
          :aria-label="`${group.label} Vol.${album.volume} ${statusLabel(album)}`"
        >
          <div class="song-cover-album-head">
            <h3>Vol.{{ album.volume }} <span class="song-cover-album-status" :class="`is-${album.status}`">{{ statusLabel(album) }}</span></h3>
            <span class="song-cover-album-count">{{ album.tracks.length }}/12</span>
          </div>
          <SongCoverAlbumTrackList :tracks="album.tracks" v-bind="trackListProps" />
          <div v-if="album.status !== 'official'" class="song-cover-album-foot">
            <span v-if="album.remainingCount">还差 {{ album.remainingCount }} 首，曲序暂定</span>
            <span v-else>依实装顺序预测 · 非官方名单</span>
          </div>
        </section>
      </div>
      <p v-if="!group.pendingSongCount" class="song-cover-album-note">暂无新的可预测曲目。</p>
      <section v-if="group.excludedSongs.length" class="song-cover-album-extra song-cover-album-exceptions" aria-label="未收录曲">
        <div class="song-cover-album-head">
          <h3>未收录曲</h3>
          <span class="song-cover-album-count">{{ group.excludedSongs.length }} 首</span>
        </div>
        <p class="song-cover-album-note">曾被专辑跳过，暂不计入预测，后续收录待确认。</p>
        <SongCoverAlbumTrackList :tracks="group.excludedSongs" v-bind="trackListProps" />
      </section>
      <section v-if="group.undatedSongs.length" class="song-cover-album-extra" aria-label="日期待确认">
        <div class="song-cover-album-head"><h3>日期待确认</h3></div>
        <p class="song-cover-album-note">实装日期尚不明确，暂不计入排序。</p>
        <SongCoverAlbumTrackList :tracks="group.undatedSongs" v-bind="trackListProps" />
      </section>
    </section>
    </div>
    <div v-if="!visibleGroups.length" class="song-empty">暂无翻唱专辑数据</div>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import { BASE_UNIT_COLOR_MAP, UNIT_TITLE_LOGO_MAP, getSongSectionTitle } from './songDisplayConstants.js';
import { hexToRgba, mixHexWithWhite } from './songFormatters.js';
import SongCoverAlbumTrackList from './SongCoverAlbumTrackList.vue';

const props = defineProps({
  statsByUnit: { type: Array, default: () => [] },
  getUnitNavAnchorId: { type: Function, required: true },
  onlyPredicted: Boolean,
  displayMode: { type: String, default: 'text' },
  unitColorByKey: { type: Object, default: () => ({}) },
  isExportingPng: Boolean,
  exportSongPanelPng: { type: Function, required: true },
  getCharacterAvatarSrc: { type: Function, required: true },
  showSongImageTitle: { type: Function, required: true },
  clearSongImageTitleToast: { type: Function, required: true },
  onSongJacketLoad: { type: Function, required: true },
  onSongJacketError: { type: Function, required: true }
});
defineEmits(['only-predicted-change', 'display-mode-change']);
const visibleGroups = computed(() => {
  if (!props.onlyPredicted) return props.statsByUnit;
  return props.statsByUnit.map((group) => {
    const nextVolume = Math.max(0, ...group.albums.filter((album) => album.status === 'official').map((album) => album.volume)) + 1;
    const nextAlbum = group.albums.find((album) => album.volume === nextVolume && album.status !== 'official');
    return {
      ...group,
      albums: [nextAlbum || { volume: nextVolume, status: 'candidate', tracks: [], remainingCount: 12 }],
      excludedSongs: [], undatedSongs: []
    };
  });
});
const exportTitle = computed(() => `全部团体 翻唱专辑${props.onlyPredicted ? '预测' : '统计'}`);
const groupStyle = (group) => {
  const unit = group?.unit;
  const color = props.unitColorByKey[unit] || BASE_UNIT_COLOR_MAP[unit] || '#64748b';
  return {
    '--cover-album-accent': color,
    '--cover-album-group-border': hexToRgba(color, 0.45),
    '--cover-album-tint': mixHexWithWhite(color, 0.17),
    '--cover-album-card-fill': mixHexWithWhite(color, 0.09),
    '--cover-album-accent-soft': hexToRgba(color, 0.14)
  };
};
const trackListProps = computed(() => ({
  displayMode: props.displayMode,
  getCharacterAvatarSrc: props.getCharacterAvatarSrc,
  showSongImageTitle: props.showSongImageTitle,
  clearSongImageTitleToast: props.clearSongImageTitleToast,
  onSongJacketLoad: props.onSongJacketLoad,
  onSongJacketError: props.onSongJacketError
}));
const statusLabel = (album) => ({ official: '官方', predicted: '预测', candidate: '候选' })[album.status];
</script>

<style scoped src="./styles/songCoverAlbumStats.css"></style>
