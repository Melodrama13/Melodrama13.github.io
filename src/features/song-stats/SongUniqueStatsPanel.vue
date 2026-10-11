<template>
<article data-feature-view="song-unique-stats-panel" data-feature-page="songs" id="panel-oc-stats" class="stats-section card-panel" data-scroll-anchor="panel-oc-stats">
              <div class="section-head section-head-sub">
                <div class="section-head-left">
                  <h2>{{ getSongSectionTitle('panel-oc-stats') }}</h2>
                  <label class="song-deleted-toggle">
                    <input class="pjsk-ui-choice" v-model="includeDeletedSongsInStats" type="checkbox" />
                    <span>统计删除曲目</span>
                  </label>
                </div>
                <button class="pjsk-ui-action pjsk-ui-btn-pill card-export-btn song-export-btn" :disabled="isExportingPng" @click="exportSongPanelPng('panel-oc-stats', getSongSectionTitle('panel-oc-stats'))">PNG</button>
              </div>
              <div class="song-insight-scroll song-oc-scroll">
                <table class="song-insight-table song-oc-table">
                  <thead>
                    <tr>
                      <th>团体</th>
                      <th>歌曲</th>
                      <th>2D</th>
                      <th>3D</th>
                      <th>APD</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in ocUniqueStats" :key="`oc-unit-${item.unit}`">
                      <td>
                        <div class="song-oc-unit">
                          <img
                            v-if="UNIT_TITLE_LOGO_MAP[item.unit]"
                            :src="UNIT_TITLE_LOGO_MAP[item.unit]"
                            :alt="item.label"
                            class="song-oc-unit-logo"
                          />
                        </div>
                      </td>
                      <td>{{ item.uniqueCount }}</td>
                      <td>{{ item.with2dCount }}</td>
                      <td>{{ item.with3dCount }}</td>
                      <td>{{ item.withApdCount }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>
</template>

<script setup>
import { getSongSectionTitle, UNIT_TITLE_LOGO_MAP } from './songDisplayConstants.js';

/** Feature view: native markup and callbacks are preserved; state remains in its controller. */
defineProps(["isExportingPng","exportSongPanelPng","ocUniqueStats"]);
const includeDeletedSongsInStats = defineModel('includeDeletedSongsInStats', { required: true });
</script>
