<template>
<article data-feature-view="song-book-round-stats-panel" data-feature-page="songs" id="panel-book-round-stats" class="stats-section card-panel" data-scroll-anchor="panel-book-round-stats">
              <div class="section-head section-head-sub">
                <div class="section-head-left">
                  <h2>{{ getSongSectionTitle('panel-book-round-stats') }}</h2>
                </div>
                <button class="pjsk-ui-action pjsk-ui-btn-pill card-export-btn song-export-btn" :disabled="isExportingPng" @click="exportSongPanelPng('panel-book-round-stats', getSongSectionTitle('panel-book-round-stats'))">PNG</button>
              </div>

              <div class="song-book-round-layout">
                <section class="song-book-round-table-card">
                  <div class="song-book-round-title">OC</div>
                  <div class="song-book-round-scroll">
                    <table class="song-book-round-table song-book-round-oc-table">
                      <thead>
                        <tr>
                          <th class="song-book-round-index-head">轮</th>
                          <th v-for="position in BOOK_ROUND_POSITION_KEYS" :key="`book-round-oc-head-${position}`">{{ position }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="round in bookRoundStats" :key="`book-round-oc-${round.round}`">
                          <th class="song-book-round-index-cell">{{ round.round }}</th>
                          <td
                            v-for="position in BOOK_ROUND_POSITION_KEYS"
                            :key="`book-round-oc-${round.round}-${position}`"
                            class="song-book-round-cell song-book-round-oc-cell"
                            :style="{ backgroundColor: round.cells[position - 1]?.ocFill || '#f8fafc' }"
                          >
                            <img
                              v-if="round.cells[position - 1]?.ocIcon"
                              :src="round.cells[position - 1].ocIcon"
                              :alt="round.cells[position - 1].ocName"
                              :title="round.cells[position - 1].ocTitle"
                              class="song-book-round-character-icon"
                            />
                            <span v-else class="song-book-round-empty">-</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section class="song-book-round-table-card">
                  <div class="song-book-round-title song-book-round-title-with-legend">
                    <span>VS</span>
                    <span class="song-book-round-legend">
                      <span class="song-book-round-legend-pill is-3d">3D</span>
                      <span class="song-book-round-legend-pill is-2d">2D</span>
                    </span>
                  </div>
                  <div class="song-book-round-scroll">
                    <table class="song-book-round-table song-book-round-vs-table">
                      <thead>
                        <tr>
                          <th class="song-book-round-index-head">轮</th>
                          <th v-for="position in BOOK_ROUND_POSITION_KEYS" :key="`book-round-vs-head-${position}`">{{ position }}</th>
                          <th class="song-book-round-missing-head">缺失</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="round in bookRoundStats" :key="`book-round-vs-${round.round}`">
                          <th class="song-book-round-index-cell">{{ round.round }}</th>
                          <td
                            v-for="position in BOOK_ROUND_POSITION_KEYS"
                            :key="`book-round-vs-${round.round}-${position}`"
                            :class="['song-book-round-cell', 'song-book-round-vs-cell', round.cells[position - 1] ? (round.cells[position - 1].has3d ? 'is-3d' : 'is-2d') : 'is-empty']"
                          >
                            <div v-if="round.cells[position - 1]?.vsIcons?.length" class="song-book-round-icon-row">
                              <img
                                v-for="vs in round.cells[position - 1].vsIcons"
                                :key="`book-round-vs-icon-${round.round}-${position}-${vs.name}`"
                                :src="vs.icon"
                                :alt="vs.name"
                                :title="vs.name"
                                class="song-book-round-character-icon"
                              />
                            </div>
                            <span v-else class="song-book-round-empty">-</span>
                          </td>
                          <td class="song-book-round-cell song-book-round-missing-cell">
                            <div v-if="round.missingVsIcons.length" class="song-book-round-icon-row">
                              <img
                                v-for="vs in round.missingVsIcons"
                                :key="`book-round-missing-vs-${round.round}-${vs.name}`"
                                :src="vs.icon"
                                :alt="vs.name"
                                :title="vs.name"
                                class="song-book-round-character-icon"
                              />
                            </div>
                            <span v-else class="song-book-round-empty">-</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              <div v-if="bookRoundStats.length === 0" class="song-empty">暂无书下轮次数据</div>
            </article>
</template>

<script setup>
import { getSongSectionTitle, BOOK_ROUND_POSITION_KEYS } from './songDisplayConstants.js';

/** Feature view: native markup and callbacks are preserved; state remains in its controller. */
defineProps(["isExportingPng","exportSongPanelPng","bookRoundStats"]);

</script>
