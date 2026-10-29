<template>
  <ol class="song-cover-album-tracks" :class="{ 'is-image-mode': displayMode === 'image', 'is-mixed-mode': displayMode === 'image-text' }">
    <li v-for="track in tracks" :key="track.id" class="song-cover-album-track" :data-song-id="track.id">
      <template v-if="displayMode !== 'text'">
        <span v-if="displayMode === 'image-text'" class="song-cover-album-track-number" aria-hidden="true">{{ String(track.position).padStart(2, '0') }}</span>
        <button
          type="button"
          class="pjsk-ui-action pjsk-ui-action--image song-jacket-media song-cover-album-jacket"
          :class="{ 'is-failed': !track.jacketUrl }"
          :aria-label="`查看 ${track.title} 的乐曲信息`"
          :disabled="track.missing"
          @mouseenter="showSongImageTitle($event, track.title, { songId: track.id, releaseDate: track.releaseDate })"
          @mouseleave="clearSongImageTitleToast"
          @focus="showSongImageTitle($event, track.title, { songId: track.id, releaseDate: track.releaseDate })"
          @blur="clearSongImageTitleToast"
          @click="showSongImageTitle($event, track.title, { songId: track.id, releaseDate: track.releaseDate })"
        >
          <img crossorigin="anonymous" loading="lazy" decoding="async" v-if="track.jacketUrl" :src="track.jacketUrl" :alt="`${track.title} 封面`" class="song-jacket-img media-load-shimmer" @load="onSongJacketLoad" @error="onSongJacketError" />
          <span class="song-jacket-fallback">-</span>
          <span v-if="track.vsNames.length" class="song-oc-event-vs-icons is-mini is-overlay song-cover-album-vs-icons">
            <img v-for="name in track.vsNames" :key="name" :src="getCharacterAvatarSrc(name)" :alt="name" :title="name" class="song-oc-event-vs-icon song-cover-album-vs-icon" />
          </span>
        </button>
        <span v-if="displayMode === 'image-text'" class="song-role-song-title song-cover-album-track-title">{{ track.title }}</span>
      </template>
      <template v-else>
        <div class="song-oc-event-tag-vs-col">
          <span class="song-oc-event-tag song-cover-album-track-number" aria-hidden="true">{{ String(track.position).padStart(2, '0') }}</span>
          <span class="song-oc-event-vs-icons is-text-col song-cover-album-vs-icons">
            <img v-for="name in track.vsNames" :key="name" :src="getCharacterAvatarSrc(name)" :alt="name" :title="name" class="song-oc-event-vs-icon song-cover-album-vs-icon" />
          </span>
        </div>
        <span class="song-role-song-title song-cover-album-track-title">{{ track.title }}</span>
      </template>
      <time class="song-cover-album-track-date" :datetime="dateTime(track.releaseDate)" :aria-label="`游戏实装日期：${formatSongShortDate(track.releaseDate) || '待确认'}`">{{ formatSongShortDate(track.releaseDate) || '日期待确认' }}</time>
    </li>
  </ol>
</template>

<script setup>
import { formatSongShortDate } from './songFormatters.js';
defineProps({
  tracks: { type: Array, default: () => [] },
  displayMode: { type: String, default: 'text' },
  getCharacterAvatarSrc: { type: Function, required: true },
  showSongImageTitle: { type: Function, required: true },
  clearSongImageTitleToast: { type: Function, required: true },
  onSongJacketLoad: { type: Function, required: true },
  onSongJacketError: { type: Function, required: true }
});
const dateTime = (raw) => {
  const match = String(raw || '').match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : undefined;
};
</script>

<style scoped src="./styles/songCoverAlbumTracks.css"></style>
