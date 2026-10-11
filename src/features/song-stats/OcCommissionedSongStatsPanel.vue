<template>
  <article id="panel-oc-book-stats" class="stats-section card-panel song-commissioned-stats-panel" :class="{ 'is-image-mode': isImageMode }" data-scroll-anchor="panel-oc-book-stats">
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
        <button class="pjsk-ui-action pjsk-ui-btn-pill card-export-btn song-export-btn" :disabled="isExportingPng" @click="$emit('export-panel', 'panel-oc-book-stats', title)">PNG</button>
      </div>
    </div>

    <div class="song-oc-event-unit-grid">
      <article
        v-for="unitGroup in statsByUnit"
        :key="`oc-book-${unitGroup.unit}`"
        :id="getUnitAnchorId(unitGroup.unit)"
        :data-scroll-anchor="`oc-unit-${unitGroup.unit}`"
        :ref="(el) => registerUnitCardElement(unitGroup.unit, el)"
        :class="['song-oc-event-unit-card', { 'is-collapsed': !isUnitExpanded(unitGroup.unit) }]"
        :style="{ backgroundColor: unitGroup.tint }"
      >
        <div class="song-oc-event-unit-head">
          <img
            v-if="unitLogoByKey[unitGroup.unit]"
            :src="unitLogoByKey[unitGroup.unit]"
            :alt="unitGroup.label"
            class="song-oc-unit-logo"
          />
          <span class="song-image-count song-image-count-circle">{{ unitGroup.totalSongs }}</span>
          <div class="song-oc-event-unit-mv-chips">
            <span class="song-vs-pill song-oc-event-mv-stat-chip is-2d" :style="{ backgroundColor: colorToRgba(unitColorByKey[unitGroup.unit] || '#94a3b8', 0.22) }">2D | {{ unitGroup.total2d }}</span>
            <span class="song-vs-pill song-oc-event-mv-stat-chip is-3d" :style="{ backgroundColor: colorToRgba(unitColorByKey[unitGroup.unit] || '#94a3b8', 0.22) }">3D | {{ unitGroup.total3d }}</span>
          </div>
          <div class="song-oc-event-unit-tools">
            <button class="pjsk-ui-action song-mini-icon-btn" @click="$emit('toggle-unit', unitGroup.unit)">
              <img
                :src="isUnitExpanded(unitGroup.unit) ? '/data/icon/collapse.png' : '/data/icon/expand.png'"
                :alt="isUnitExpanded(unitGroup.unit) ? '收起' : '展开'"
                class="song-mini-icon-btn-img"
              />
            </button>
          </div>
        </div>

        <div v-if="isUnitExpanded(unitGroup.unit)" class="song-role-card-grid song-stat-grid song-oc-event-members-grid">
          <article
            v-for="member in unitGroup.members"
            :key="`oc-book-${unitGroup.unit}-${member.name}`"
            :data-scroll-anchor="`oc-member-${unitGroup.unit}-${member.name}`"
            class="song-role-card song-stat-card song-oc-event-member-card"
            :style="{ backgroundColor: member.tint }"
          >
            <div class="song-role-head">
              <div class="song-role-main song-stat-main">
                <img
                  v-if="member.avatar"
                  :src="member.avatar"
                  :alt="member.name"
                  class="song-role-avatar"
                />
                <div class="song-image-count song-image-count-circle">{{ member.count }}</div>
              </div>
              <div class="song-oc-event-member-mv-chips">
                <span class="song-vs-pill song-oc-event-mv-stat-chip is-2d" :style="{ backgroundColor: colorToRgba(unitColorByKey[member.unit] || '#94a3b8', 0.22) }">2D | {{ member.count2d }}</span>
                <span class="song-vs-pill song-oc-event-mv-stat-chip is-3d" :style="{ backgroundColor: colorToRgba(unitColorByKey[member.unit] || '#94a3b8', 0.22) }">3D | {{ member.count3d }}</span>
              </div>
            </div>

            <div v-if="isImageMode" class="song-event-image-grid song-oc-event-image-grid">
              <div
                v-for="song in member.songs"
                :key="`oc-book-image-${member.name}-${song.songId}-${song.eventId}`"
                class="pjsk-ui-action pjsk-ui-action--image song-oc-event-image-item"
                @mouseenter="$emit('show-song-title', $event, song.songName || '-', { songId: song.songId })"
                @mouseleave="$emit('clear-song-title', $event)"
                @click="$emit('show-song-title', $event, song.songName || '-', { songId: song.songId })"
              >
                <div :class="['song-jacket-media', 'song-duo-song-jacket-item', 'song-oc-event-jacket', { 'is-3d-frame': song.has3d }]">
                  <img crossorigin="anonymous"
                    v-if="song.jacketUrl"
                    :src="song.jacketUrl"
                    :alt="`${song.songName || '歌曲'} 封面`"
                    class="song-jacket-img song-duo-song-jacket-img media-load-shimmer"
                    loading="lazy"
                    decoding="async"
                    @load="$emit('jacket-load', $event)"
                    @error="$emit('jacket-error', $event)"
                  />
                  <span class="song-jacket-fallback">-</span>
                  <div class="song-oc-event-vs-icons is-mini is-overlay">
                    <img
                      v-for="vs in song.vsIcons"
                      :key="`oc-book-image-vs-${member.name}-${song.songId}-${vs.name}`"
                      :src="vs.icon"
                      :alt="vs.name"
                      :title="vs.name"
                      class="song-oc-event-vs-icon"
                    />
                  </div>
                </div>
              </div>
            </div>

            <ul v-else class="song-role-list song-stat-list song-oc-event-text-list">
              <li
                v-for="song in member.songs"
                :key="`oc-book-text-${member.name}-${song.songId}-${song.eventId}`"
                :data-scroll-anchor="`oc-song-${member.unit}-${member.name}-${song.eventId}-${song.songId}`"
                class="song-oc-event-text-row"
              >
                <div class="song-oc-event-tag-vs-col">
                  <span class="song-oc-event-tag" :style="{ color: song.tagColor }">{{ song.tagNumber }}</span>
                  <div class="song-oc-event-vs-icons is-text-col">
                    <img
                      v-for="vs in song.vsIcons"
                      :key="`oc-book-text-vs-${member.name}-${song.songId}-${vs.name}`"
                      :src="vs.icon"
                      :alt="vs.name"
                      :title="vs.name"
                      class="song-oc-event-vs-icon"
                    />
                  </div>
                </div>
                <span class="song-role-song-title song-oc-event-song-title" :class="{ 'is-no-2dmv': !song.has2d }">{{ song.songName }}</span>
                <div class="song-event-mv-col song-oc-event-mv-col">
                  <span v-if="song.has3d" class="song-mv-chip is-3d song-event-mv-chip">3D</span>
                  <span v-else class="song-event-mv-empty song-oc-event-mv-empty"></span>
                </div>
              </li>
            </ul>
          </article>
        </div>
      </article>
      <div v-if="statsByUnit.length === 0" class="song-empty">暂无各团书下数据</div>
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
  statsByUnit: { type: Array, required: true },
  unitLogoByKey: { type: Object, required: true },
  getUnitAnchorId: { type: Function, required: true },
  registerUnitCardElement: { type: Function, required: true },
  isUnitExpanded: { type: Function, required: true },
});

defineEmits(['change-image-mode', 'toggle-all', 'export-panel', 'show-song-title', 'clear-song-title', 'jacket-load', 'jacket-error', 'toggle-unit']);
</script>

<style scoped src="./styles/ocCommissionedSongStatsFoundation.css"></style>
<style scoped src="./styles/ocCommissionedSongStatsContent.css"></style>
<style scoped src="../../styles/scoped/media-load-shimmer.css"></style>
<style scoped src="./styles/ocCommissionedSongStatsResponsive.css"></style>
<style scoped src="./styles/ocCommissionedSongStatsCompactResponsive.css"></style>
<style scoped src="./styles/commissionedSongStatsSummary.css"></style>
