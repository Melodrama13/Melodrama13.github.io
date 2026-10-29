<template>
  <article id="panel-vs-song-stats" class="stats-section card-panel song-commissioned-stats-panel" :class="{ 'is-image-mode': isImageMode }" data-scroll-anchor="panel-vs-song-stats">
    <div class="section-head section-head-sub">
      <div class="section-head-left">
        <h2>{{ title }}</h2>
        <label class="song-duo-image-toggle is-image-toggle">
          <input class="pjsk-ui-choice" :checked="isImageMode" type="checkbox" @change="$emit('change-image-mode', $event)" />
          <span>曲绘显示</span>
        </label>
      </div>
      <div class="section-head-actions">
        <div class="anvo-mode-switch">
          <button class="pjsk-ui-action anvo-mode-btn" @click="$emit('toggle-all')">
            {{ globalToggleLabel }}
          </button>
        </div>
        <button class="pjsk-ui-action pjsk-ui-btn-pill card-export-btn song-export-btn" :disabled="isExportingPng" @click="$emit('export-panel', 'panel-vs-song-stats', title)">PNG</button>
      </div>
    </div>

    <div class="song-role-card-grid song-stat-grid">
      <article
        v-for="row in statsBySinger"
        :key="`song-vs-${row.name}`"
        :id="getSingerAnchorId(row.name) || undefined"
        :data-scroll-anchor="`vs-card-${row.name}`"
        :ref="(el) => registerSingerCardElement(row.name, el)"
        :class="['song-role-card', 'song-stat-card', 'song-vs-event-card', { 'is-image-mode': isImageMode }]"
        :style="{ backgroundColor: row.tint }"
      >
        <div v-if="isImageMode" class="song-vs-event-image-layout">
          <div class="song-vs-event-image-head">
            <div class="song-vs-event-image-head-main">
              <img
                v-if="row.avatar"
                :src="row.avatar"
                :alt="row.name"
                class="song-role-avatar song-image-main-avatar"
              />
              <div class="song-vs-event-image-head-stats">
                <div class="song-image-count song-image-count-circle">{{ row.count }}</div>
              </div>
              <span class="song-vs-pill song-vs-total-mv-chip song-vs-total-mv-chip-head">
                <span>2D {{ row.total2d }}</span>
                <span class="song-vs-total-mv-sep">|</span>
                <span class="song-vs-total-mv-3d">3D {{ row.total3d }}</span>
              </span>
            </div>
            <div class="song-role-card-tools">
              <button class="pjsk-ui-action song-mini-icon-btn" @click="$emit('toggle-singer', row.name)">
                <img
                  :src="getSingerDisplayMode(row.name) === 'collapsed' ? '/data/icon/expand.png' : '/data/icon/collapse.png'"
                  :alt="getSingerDisplayMode(row.name) === 'collapsed' ? '展开' : '收起'"
                  class="song-mini-icon-btn-img"
                />
              </button>
            </div>
            <div class="song-vs-event-unit-counts song-vs-event-unit-counts-image">
              <div class="song-vs-event-unit-stack song-vs-event-unit-stack-total">
                <span class="song-vs-pill song-vs-total-mv-chip song-vs-total-mv-chip-stat">
                  <span>2D {{ row.total2d }}</span>
                  <span class="song-vs-total-mv-sep">|</span>
                  <span class="song-vs-total-mv-3d">3D {{ row.total3d }}</span>
                </span>
              </div>
              <div
                v-for="unitKey in unitOrder"
                :key="`${row.name}-image-${unitKey}`"
                class="song-vs-event-unit-stack"
              >
                <span
                  class="song-vs-pill song-vs-event-unit-chip"
                  :style="{ backgroundColor: colorToRgba(unitColorByKey[unitKey] || '#94a3b8', 0.2) }"
                >
                  <img :src="unitIconByKey[unitKey]" class="song-vs-event-unit-logo" :alt="unitKey" />
                  <span class="song-vs-event-unit-count">{{ row.unitCounts[unitKey] }}</span>
                </span>
                <div class="song-vs-event-unit-mv-chips">
                  <span class="song-vs-pill song-vs-event-unit-mv-chip is-compact" :style="{ backgroundColor: colorToRgba(unitColorByKey[unitKey] || '#94a3b8', 0.22) }">
                    <span class="song-vs-event-unit-mv-num">{{ row.unit2dCounts[unitKey] }}</span>
                    <span class="song-vs-event-unit-mv-sep">|</span>
                    <span class="song-vs-event-unit-mv-num song-vs-event-unit-mv-num-3d">{{ row.unit3dCounts[unitKey] }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="!isSingerCollapsed(row.name)" class="song-vs-event-image-groups">
            <section
              v-for="group in getSingerImageGroups(row)"
              :key="`vs-image-group-${row.name}-${group.unit}`"
              class="song-vs-event-image-group"
              :style="{ backgroundColor: group.tint }"
            >
              <div class="song-event-image-grid song-vs-event-image-grid">
                <div
                  v-for="song in group.songs"
                  :key="`vs-song-jacket-${row.name}-${song.songId}-${song.eventId}`"
                  class="pjsk-ui-action pjsk-ui-action--image song-image-jacket-tile song-vs-event-image-jacket-tile"
                  @mouseenter="$emit('show-song-title', $event, song.songName || '-', { songId: song.songId })"
                  @mouseleave="$emit('clear-song-title', $event)"
                  @click="$emit('show-song-title', $event, song.songName || '-', { songId: song.songId })"
                >
                  <div :class="['song-jacket-media', 'song-duo-song-jacket-item', { 'is-3d-frame': song.has3d }]">
                    <img crossorigin="anonymous" loading="lazy" decoding="async"
                      v-if="song.jacketUrl"
                      :src="song.jacketUrl"
                      :alt="`${song.songName || '歌曲'} 封面`"
                      class="song-jacket-img song-duo-song-jacket-img media-load-shimmer"
                      @load="$emit('jacket-load', $event)"
                      @error="$emit('jacket-error', $event)"
                    />
                    <span class="song-jacket-fallback">-</span>
                  </div>
                  <span class="song-image-jacket-caption song-vs-event-image-tag-pill" :style="{ backgroundColor: colorToRgba(song.imageColor, 0.28) }">{{ song.textTag }}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
        <template v-else>
          <div class="song-role-head">
            <div class="song-role-main song-stat-main">
              <img
                v-if="row.avatar"
                :src="row.avatar"
                :alt="row.name"
                class="song-role-avatar song-vs-event-avatar"
              />
              <div class="song-image-count song-image-count-circle">{{ row.count }}</div>
              <span class="song-vs-pill song-vs-total-mv-chip song-vs-total-mv-chip-head">
                <span>2D {{ row.total2d }}</span>
                <span class="song-vs-total-mv-sep">|</span>
                <span class="song-vs-total-mv-3d">3D {{ row.total3d }}</span>
              </span>
            </div>
            <div class="song-role-card-tools">
              <button class="pjsk-ui-action song-mini-icon-btn" @click="$emit('toggle-singer', row.name)">
                <img
                  :src="getSingerDisplayMode(row.name) === 'collapsed' ? '/data/icon/expand.png' : '/data/icon/collapse.png'"
                  :alt="getSingerDisplayMode(row.name) === 'collapsed' ? '展开' : '收起'"
                  class="song-mini-icon-btn-img"
                />
              </button>
            </div>
          </div>

          <div class="song-vs-event-unit-counts">
            <div
              v-for="unitKey in unitOrder"
              :key="`${row.name}-${unitKey}`"
              class="song-vs-event-unit-stack"
            >
              <span
                class="song-vs-pill song-vs-event-unit-chip"
                :style="{ backgroundColor: colorToRgba(unitColorByKey[unitKey] || '#94a3b8', 0.2) }"
              >
                <img :src="unitIconByKey[unitKey]" class="song-vs-event-unit-logo" :alt="unitKey" />
                <span class="song-vs-event-unit-count">{{ row.unitCounts[unitKey] }}</span>
              </span>
              <div class="song-vs-event-unit-mv-chips">
                <span class="song-vs-pill song-vs-event-unit-mv-chip is-compact" :style="{ backgroundColor: colorToRgba(unitColorByKey[unitKey] || '#94a3b8', 0.22) }">
                  <span class="song-vs-event-unit-mv-num">{{ row.unit2dCounts[unitKey] }}</span>
                  <span class="song-vs-event-unit-mv-sep">|</span>
                  <span class="song-vs-event-unit-mv-num song-vs-event-unit-mv-num-3d">{{ row.unit3dCounts[unitKey] }}</span>
                </span>
              </div>
            </div>
          </div>

          <ul
            v-if="getSingerDisplayMode(row.name) !== 'collapsed'"
            :class="['song-role-list', 'song-stat-list', 'song-stat-list-vs-event', `is-${getSingerDisplayMode(row.name)}`]"
          >
            <li v-for="song in row.songs" :key="`${row.name}-${song.tag}-${song.eventId}-${song.songId}`" :data-scroll-anchor="`vs-song-${row.name}-${song.eventId}-${song.songId}`" class="song-vs-event-text-row">
              <div class="song-vs-event-tag-vs-col">
                <div class="song-oc-event-vs-icons is-text-col is-vs-tag-col">
                  <img
                    v-if="song.tagIcon"
                    :src="song.tagIcon"
                    :alt="song.tagNumber"
                    class="song-oc-event-vs-icon"
                  />
                  <span v-else class="song-oc-event-vs-icon is-empty-slot" aria-hidden="true"></span>
                </div>
                <span class="song-vs-event-tag" :style="{ color: song.color }">{{ song.tagNumber }}</span>
              </div>
              <span class="song-vs-event-title" :class="{ 'is-no-2dmv': song.no2dMv }">{{ song.songName }}</span>
              <div class="song-event-mv-col song-vs-event-mv-col">
                <span v-if="song.has3d" class="song-mv-chip is-3d song-event-mv-chip">3D</span>
                <span v-else class="song-event-mv-empty song-vs-event-mv-empty"></span>
              </div>
            </li>
          </ul>
        </template>
      </article>
      <div v-if="statsBySinger.length === 0" class="song-empty">暂无虚拟歌手参与歌曲数据</div>
    </div>
  </article>
</template>

<script setup>
/**
 * Read-only commissioned-song presentation. The page owns statistics, display
 * state, viewport preservation, title overlays and capture tasks. Native events
 * are emitted synchronously; card registration forwards HTMLElement or null.
 */
defineProps({
  title: { type: String, required: true },
  isImageMode: { type: Boolean, required: true },
  globalToggleLabel: { type: String, required: true },
  isExportingPng: { type: Boolean, required: true },
  unitColorByKey: { type: Object, required: true },
  colorToRgba: { type: Function, required: true },
  statsBySinger: { type: Array, required: true },
  unitOrder: { type: Array, required: true },
  unitIconByKey: { type: Object, required: true },
  getSingerAnchorId: { type: Function, required: true },
  registerSingerCardElement: { type: Function, required: true },
  getSingerDisplayMode: { type: Function, required: true },
  isSingerCollapsed: { type: Function, required: true },
  getSingerImageGroups: { type: Function, required: true },
});

defineEmits(['change-image-mode', 'toggle-all', 'export-panel', 'show-song-title', 'clear-song-title', 'jacket-load', 'jacket-error', 'toggle-singer']);
</script>

<style scoped src="./styles/vsCommissionedSongStatsFoundation.css"></style>
<style scoped src="./styles/vsCommissionedSongStatsContent.css"></style>
<style scoped src="../../styles/scoped/media-load-shimmer.css"></style>
<style scoped src="./styles/vsCommissionedSongStatsResponsive.css"></style>
<style scoped src="./styles/vsCommissionedSongStatsCompactResponsive.css"></style>
<style scoped src="./styles/commissionedSongStatsSummary.css"></style>
<style scoped src="./styles/vsCommissionedSongStatsSummary.css"></style>
