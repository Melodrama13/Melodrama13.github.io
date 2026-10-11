<template>
<UiSurfaceTransition kind="feedback">
          <div
            v-if="songImageTitleToast"
            class="song-image-title-toast"
            data-feature-view="song-title-toast"
            data-feature-page="songs"
            :style="{ left: `${songImageTitleToast.left}px`, top: `${songImageTitleToast.top}px` }"
          >
            <template v-if="songImageTitleToast.compact">
              <span class="song-toast-compact-id">#{{ songImageTitleToast.idText }}</span>
              <span class="song-toast-compact-title">{{ songImageTitleToast.title }}</span>
            </template>
            <template v-else>
              <div class="song-toast-head">
                <span class="song-toast-id">#{{ songImageTitleToast.idText }}</span>
                <span class="song-toast-title">{{ songImageTitleToast.title }}</span>
              </div>
              <div class="song-toast-diff-wrap">
                <span
                  v-for="diff in songImageTitleToast.difficulties"
                  :key="`toast-diff-${diff.key}`"
                  :class="['song-diff-badge', `is-${diff.key}`, { 'is-empty': diff.empty }]"
                >
                  {{ diff.empty ? '' : diff.text }}
                </span>
              </div>
              <div v-if="songImageTitleToast.mvTags.length || songImageTitleToast.groupTags.length" class="song-toast-tag-meta">
                <div v-if="songImageTitleToast.mvTags.length" class="song-toast-tag-row">
                  <span class="song-toast-tag-label">MV</span>
                  <div class="song-mv-wrap song-toast-mv-wrap">
                    <span
                      v-for="mv in songImageTitleToast.mvTags"
                      :key="`toast-mv-${mv.key}`"
                      :class="['song-mv-chip', mv.tone]"
                    >
                      {{ mv.label }}
                    </span>
                  </div>
                </div>
                <div v-if="songImageTitleToast.groupTags.length" class="song-toast-tag-row">
                  <span class="song-toast-tag-label">团体</span>
                  <div class="song-group-wrap song-toast-group-wrap">
                    <template v-for="group in songImageTitleToast.groupTags" :key="`toast-group-${group.key}`">
                      <img
                        v-if="group.kind === 'logo'"
                        :src="group.icon"
                        :alt="group.label"
                        :title="group.label"
                        class="song-group-logo song-toast-group-logo"
                        loading="lazy"
                        decoding="async"
                      />
                      <span v-else :class="['song-group-pill', { 'is-other': group.kind === 'other' }]">{{ group.label }}</span>
                    </template>
                  </div>
                </div>
              </div>
              <div class="song-toast-meta">
                <div v-if="songImageTitleToast.releaseDate"><span>日期</span><b>{{ songImageTitleToast.releaseDate }}</b></div>
                <div v-if="songImageTitleToast.composer"><span>作曲</span><b>{{ songImageTitleToast.composer }}</b></div>
                <div v-if="songImageTitleToast.lyricist"><span>作词</span><b>{{ songImageTitleToast.lyricist }}</b></div>
                <div v-if="songImageTitleToast.arranger"><span>编曲</span><b>{{ songImageTitleToast.arranger }}</b></div>
              </div>
            </template>
          </div>
        </UiSurfaceTransition>
</template>

<script setup>
import UiSurfaceTransition from '../../components/ui/UiSurfaceTransition.vue';


/** Feature view: native markup and callbacks are preserved; state remains in its controller. */
defineProps(["songImageTitleToast"]);

</script>
