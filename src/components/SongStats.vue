<template>
  <div class="pjsk-song-stats" :class="{ 'is-exporting': isExportingPng }">
    <div class="stats-layout" :class="{ 'nav-collapsed': navCollapsed, 'mobile-nav-overlay': isNavTopLayout, 'mobile-nav-open': !navCollapsed }">
      <button
        v-if="navCollapsed"
        class="floating-menu-btn"
        title="展开统计菜单"
        @click="setNavCollapsed(false)"
      >
        <img src="/data/icon/menu.png" class="floating-menu-icon" alt="菜单" />
      </button>

      <aside class="stats-nav card-panel" :class="{ 'mobile-floating': isNavTopLayout, 'is-collapsed': navCollapsed, 'is-open': !navCollapsed }">
        <button v-if="!navCollapsed" class="nav-collapse-fab" @click="setNavCollapsed(true)" title="收起统计菜单">
          <img src="/data/icon/menu_open.png" class="nav-collapse-fab-icon" alt="收起菜单" />
        </button>

        <div class="nav-quick-wrap">
          <div class="nav-scroll">
            <div v-for="group in navGroups" :key="group.id" class="nav-group">
              <button
                class="nav-link nav-link-main"
                :class="{ active: isGroupActive(group) }"
                :title="group.title"
                @click="scrollToSection(group.id)"
              >
                {{ group.title }}
              </button>
              <div v-if="group.children?.length && isGroupExpanded(group)" class="nav-sub-list">
                <button
                  v-for="item in group.children"
                  :key="item.id"
                  class="nav-link nav-link-sub"
                  :class="{ active: activeNavId === item.id, 'is-duo-subanchor': item.anchorKind === 'duo-unit' }"
                  v-show="shouldShowNavChild(item)"
                  :title="item.title"
                  @click="scrollToSection(item.id)"
                >
                  {{ item.title }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div class="stats-main">
        <div class="stats-main-head">
          <h1>乐曲统计</h1>
        </div>

        <section class="song-disclaimer" aria-label="素材声明">
          <p>
            本页面为非官方、非商业的个人研究与交流项目，不拥有所展示素材的版权。
            相关版权归其合法权利人所有，包括但不限于 Sega、Colorful Palette、Crypton 等。
          </p>
          <p>
            如有版权或使用问题，请通过
            <a
              :href="PROJECT_GITHUB_ISSUES_URL"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Issues
            </a>
            联系维护者处理。
          </p>
        </section>

        <section id="panel-song-stats" class="stats-section card-panel section-main">
          <div class="section-head">
            <div class="section-head-left">
              <h2>{{ getSongSectionTitle('panel-song-stats') }}</h2>
            </div>
          </div>

          <div class="stats-grid">
            <article id="panel-oc-stats" class="stats-section card-panel">
              <div class="section-head section-head-sub">
                <div class="section-head-left">
                  <h2>{{ getSongSectionTitle('panel-oc-stats') }}</h2>
                  <label class="song-deleted-toggle">
                    <input v-model="includeDeletedSongsInStats" type="checkbox" />
                    <span>统计删除曲目</span>
                  </label>
                </div>
                <button class="card-export-btn song-export-btn" :disabled="isExportingPng" @click="exportSongPanelPng('panel-oc-stats', getSongSectionTitle('panel-oc-stats'))">PNG</button>
              </div>
              <div class="song-insight-scroll song-oc-scroll">
                <table class="song-insight-table song-oc-table">
                  <thead>
                    <tr>
                      <th>团体</th>
                      <th>总歌曲</th>
                      <th>独占曲</th>
                      <th>独占2D</th>
                      <th>独占3D</th>
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
                      <td>{{ item.totalCount }}</td>
                      <td>{{ item.uniqueCount }}</td>
                      <td>{{ item.with2dCount }}</td>
                      <td>{{ item.with3dCount }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>

            <article id="panel-vs-song-stats" class="stats-section card-panel">
              <div class="section-head section-head-sub">
                <div class="section-head-left">
                  <h2>{{ getSongSectionTitle('panel-vs-song-stats') }}</h2>
                  <label class="song-duo-image-toggle">
                    <input :checked="vsSongImageMode" type="checkbox" @change="onVsSongImageModeChange" />
                    <span>曲绘显示</span>
                  </label>
                </div>
                <div class="section-head-actions">
                  <div class="anvo-mode-switch">
                    <button class="anvo-mode-btn" @click="toggleAllVsSongExpandCollapse">
                      {{ vsSongGlobalToggleLabel }}
                    </button>
                  </div>
                  <button class="card-export-btn song-export-btn" :disabled="isExportingPng" @click="exportSongPanelPng('panel-vs-song-stats', getSongSectionTitle('panel-vs-song-stats'))">PNG</button>
                </div>
              </div>

              <div class="song-role-card-grid song-stat-grid">
                <article
                  v-for="row in virtualSingerSongStats"
                  :key="`song-vs-${row.name}`"
                  :ref="(el) => setVsSongCardRef(row.name, el)"
                  :class="['song-role-card', 'song-stat-card', 'song-vs-event-card', { 'is-image-mode': vsSongImageMode }]"
                  :style="{ backgroundColor: row.tint }"
                >
                  <div v-if="vsSongImageMode" class="song-vs-event-image-layout">
                    <div class="song-vs-event-image-head">
                      <div class="song-vs-event-image-head-main">
                        <img
                          v-if="row.avatar"
                          :src="row.avatar"
                          :alt="row.name"
                          class="song-role-avatar song-image-main-avatar"
                        />
                        <div class="song-vs-event-image-head-stats">
                          <div class="song-vs-event-image-name">{{ row.name }}</div>
                          <div class="song-image-count song-vs-event-image-total">{{ row.count }} 首</div>
                        </div>
                      </div>
                      <div class="song-role-card-tools">
                        <button class="song-mini-icon-btn" @click="toggleVsSongCardExpandCollapse(row.name)">
                          <img
                            :src="getVsSongCardMode(row.name) === 'collapsed' ? '/data/icon/expand.png' : '/data/icon/collapse.png'"
                            :alt="getVsSongCardMode(row.name) === 'collapsed' ? '展开' : '收起'"
                            class="song-mini-icon-btn-img"
                          />
                        </button>
                        <button class="card-export-btn song-export-btn song-mini-png-btn" :disabled="isExportingPng" @click="exportVirtualSingerCardPng(row)">PNG</button>
                      </div>
                      <div class="song-vs-event-unit-counts song-vs-event-unit-counts-image">
                        <div
                          v-for="unitKey in VS_UNIT_ORDER"
                          :key="`${row.name}-image-${unitKey}`"
                          class="song-vs-event-unit-stack"
                        >
                          <span
                            class="song-vs-event-unit-chip"
                            :style="{ backgroundColor: hexToRgba(unitColorMap[unitKey] || '#94a3b8', 0.2) }"
                          >
                            <img :src="UNIT_TAG_ICON_MAP[unitKey]" class="song-vs-event-unit-logo" :alt="unitKey" />
                            <span class="song-vs-event-unit-count">{{ row.unitCounts[unitKey] }}</span>
                          </span>
                          <div class="song-vs-event-unit-mv-chips">
                            <span class="song-vs-event-unit-mv-chip is-compact" :style="{ backgroundColor: hexToRgba(unitColorMap[unitKey] || '#94a3b8', 0.22) }">
                              <span class="song-vs-event-unit-mv-num">{{ row.unit2dCounts[unitKey] }}</span>
                              <span class="song-vs-event-unit-mv-sep">|</span>
                              <span class="song-vs-event-unit-mv-num song-vs-event-unit-mv-num-3d">{{ row.unit3dCounts[unitKey] }}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div v-if="!isVsSongCardCollapsed(row.name)" class="song-vs-event-image-groups">
                      <section
                        v-for="group in getVsSongImageGroups(row)"
                        :key="`vs-image-group-${row.name}-${group.unit}`"
                        class="song-vs-event-image-group"
                        :style="{ backgroundColor: group.tint }"
                      >
                        <div class="song-event-image-grid song-vs-event-image-grid">
                          <div
                            v-for="song in group.songs"
                            :key="`vs-song-jacket-${row.name}-${song.songId}-${song.eventId}`"
                            class="song-image-jacket-tile song-vs-event-image-jacket-tile"
                            :title="song.songName || '-'"
                          >
                            <div :class="['song-jacket-media', 'song-duo-song-jacket-item', { 'is-3d-frame': song.has3d }]">
                              <img
                                v-if="song.jacketUrl"
                                :src="song.jacketUrl"
                                :alt="`${song.songName || '歌曲'} 封面`"
                                class="song-jacket-img song-duo-song-jacket-img"
                                loading="lazy"
                                decoding="async"
                                @error="onSongJacketError"
                              />
                              <span class="song-jacket-fallback">-</span>
                            </div>
                            <span class="song-image-jacket-caption song-vs-event-image-tag-pill" :style="{ backgroundColor: hexToRgba(song.imageColor, 0.28) }">{{ song.textTag }}</span>
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
                        <div class="song-role-text">
                          <div class="song-role-name">{{ row.name }}</div>
                          <div class="song-role-count">{{ row.count }} 首</div>
                        </div>
                      </div>
                      <div class="song-role-card-tools">
                        <button class="song-mini-icon-btn" @click="toggleVsSongCardExpandCollapse(row.name)">
                          <img
                            :src="getVsSongCardMode(row.name) === 'collapsed' ? '/data/icon/expand.png' : '/data/icon/collapse.png'"
                            :alt="getVsSongCardMode(row.name) === 'collapsed' ? '展开' : '收起'"
                            class="song-mini-icon-btn-img"
                          />
                        </button>
                        <button class="card-export-btn song-export-btn song-mini-png-btn" :disabled="isExportingPng" @click="exportVirtualSingerCardPng(row)">PNG</button>
                      </div>
                    </div>

                    <div class="song-vs-event-unit-counts">
                      <div
                        v-for="unitKey in VS_UNIT_ORDER"
                        :key="`${row.name}-${unitKey}`"
                        class="song-vs-event-unit-stack"
                      >
                        <span
                          class="song-vs-event-unit-chip"
                          :style="{ backgroundColor: hexToRgba(unitColorMap[unitKey] || '#94a3b8', 0.2) }"
                        >
                          <img :src="UNIT_TAG_ICON_MAP[unitKey]" class="song-vs-event-unit-logo" :alt="unitKey" />
                          <span class="song-vs-event-unit-count">{{ row.unitCounts[unitKey] }}</span>
                        </span>
                        <div class="song-vs-event-unit-mv-chips">
                          <span class="song-vs-event-unit-mv-chip is-compact" :style="{ backgroundColor: hexToRgba(unitColorMap[unitKey] || '#94a3b8', 0.22) }">
                            <span class="song-vs-event-unit-mv-num">{{ row.unit2dCounts[unitKey] }}</span>
                            <span class="song-vs-event-unit-mv-sep">|</span>
                            <span class="song-vs-event-unit-mv-num song-vs-event-unit-mv-num-3d">{{ row.unit3dCounts[unitKey] }}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <ul
                      v-if="getVsSongCardMode(row.name) !== 'collapsed'"
                      :class="['song-role-list', 'song-stat-list', 'song-stat-list-vs-event', `is-${getVsSongCardMode(row.name)}`]"
                    >
                      <li v-for="song in row.songs" :key="`${row.name}-${song.tag}-${song.eventId}-${song.songId}`" class="song-vs-event-text-row">
                        <span class="song-vs-event-tag" :style="{ color: song.color }">{{ song.textTag }}</span>
                        <span class="song-vs-event-title" :class="{ 'is-no-2dmv': song.no2dMv }">{{ song.songName }}</span>
                        <div class="song-event-mv-col song-vs-event-mv-col">
                          <span v-if="song.has3d" class="song-mv-chip is-3d song-event-mv-chip">3D</span>
                          <span v-else class="song-event-mv-empty song-vs-event-mv-empty"></span>
                        </div>
                      </li>
                    </ul>
                  </template>
                </article>
                <div v-if="virtualSingerSongStats.length === 0" class="song-empty">暂无虚拟歌手参与歌曲数据</div>
              </div>
            </article>

            <article id="panel-oc-book-stats" class="stats-section card-panel">
              <div class="section-head section-head-sub">
                <div class="section-head-left">
                  <h2>{{ getSongSectionTitle('panel-oc-book-stats') }}</h2>
                  <label class="song-duo-image-toggle">
                    <input :checked="ocBookImageMode" type="checkbox" @change="onOcBookImageModeChange" />
                    <span>曲绘显示</span>
                  </label>
                </div>
                <div class="section-head-actions">
                  <div class="anvo-mode-switch">
                    <button class="anvo-mode-btn" @click="toggleAllOcBookExpandCollapse">
                      {{ ocBookGlobalToggleLabel }}
                    </button>
                  </div>
                  <button class="card-export-btn song-export-btn" :disabled="isExportingPng" @click="exportSongPanelPng('panel-oc-book-stats', getSongSectionTitle('panel-oc-book-stats'))">PNG</button>
                </div>
              </div>

              <div class="song-oc-event-unit-grid">
                <article
                  v-for="unitGroup in ocBookStatsByUnit"
                  :key="`oc-book-${unitGroup.unit}`"
                  :ref="(el) => setOcBookUnitCardRef(unitGroup.unit, el)"
                  :class="['song-oc-event-unit-card', { 'is-collapsed': !isOcBookUnitExpanded(unitGroup.unit) }]"
                  :style="{ backgroundColor: unitGroup.tint }"
                >
                  <div class="song-oc-event-unit-head">
                    <img
                      v-if="UNIT_TITLE_LOGO_MAP[unitGroup.unit]"
                      :src="UNIT_TITLE_LOGO_MAP[unitGroup.unit]"
                      :alt="unitGroup.label"
                      class="song-oc-unit-logo"
                    />
                    <span class="song-oc-event-unit-count">{{ unitGroup.totalSongs }} 首</span>
                    <div class="song-oc-event-unit-mv-chips">
                      <span class="song-oc-event-mv-stat-chip is-2d" :style="{ backgroundColor: hexToRgba(unitColorMap[unitGroup.unit] || '#94a3b8', 0.22) }">2D | {{ unitGroup.total2d }}</span>
                      <span class="song-oc-event-mv-stat-chip is-3d" :style="{ backgroundColor: hexToRgba(unitColorMap[unitGroup.unit] || '#94a3b8', 0.22) }">3D | {{ unitGroup.total3d }}</span>
                    </div>
                    <div class="song-oc-event-unit-tools">
                      <button class="song-mini-icon-btn" @click="toggleOcBookUnitExpandCollapse(unitGroup.unit)">
                        <img
                          :src="isOcBookUnitExpanded(unitGroup.unit) ? '/data/icon/collapse.png' : '/data/icon/expand.png'"
                          :alt="isOcBookUnitExpanded(unitGroup.unit) ? '收起' : '展开'"
                          class="song-mini-icon-btn-img"
                        />
                      </button>
                      <button class="card-export-btn song-export-btn song-mini-png-btn" :disabled="isExportingPng" @click="exportOcBookUnitCardPng(unitGroup)">PNG</button>
                    </div>
                  </div>

                  <div v-if="isOcBookUnitExpanded(unitGroup.unit)" class="song-role-card-grid song-stat-grid song-oc-event-members-grid">
                    <article
                      v-for="member in unitGroup.members"
                      :key="`oc-book-${unitGroup.unit}-${member.name}`"
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
                          <div class="song-role-text">
                            <div class="song-role-name">{{ member.name }}</div>
                            <div class="song-role-count">{{ member.count }} 首</div>
                          </div>
                        </div>
                        <div class="song-oc-event-member-mv-chips">
                          <span class="song-oc-event-mv-stat-chip is-2d" :style="{ backgroundColor: hexToRgba(unitColorMap[member.unit] || '#94a3b8', 0.22) }">2D | {{ member.count2d }}</span>
                          <span class="song-oc-event-mv-stat-chip is-3d" :style="{ backgroundColor: hexToRgba(unitColorMap[member.unit] || '#94a3b8', 0.22) }">3D | {{ member.count3d }}</span>
                        </div>
                      </div>

                      <div v-if="ocBookImageMode" class="song-event-image-grid song-oc-event-image-grid">
                        <div
                          v-for="song in member.songs"
                          :key="`oc-book-image-${member.name}-${song.songId}-${song.eventId}`"
                          class="song-oc-event-image-item"
                          :title="song.songName || '-'"
                        >
                          <div :class="['song-jacket-media', 'song-duo-song-jacket-item', 'song-oc-event-jacket', { 'is-3d-frame': song.has3d }]">
                            <img
                              v-if="song.jacketUrl"
                              :src="song.jacketUrl"
                              :alt="`${song.songName || '歌曲'} 封面`"
                              class="song-jacket-img song-duo-song-jacket-img"
                              loading="lazy"
                              decoding="async"
                              @error="onSongJacketError"
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
                <div v-if="ocBookStatsByUnit.length === 0" class="song-empty">暂无各团书下数据</div>
              </div>
            </article>

            <article id="panel-another-vocal" class="stats-section card-panel">
              <div class="section-head section-head-sub">
                <div class="section-head-left">
                  <h2>{{ getSongSectionTitle('panel-another-vocal') }}</h2>
                  <label class="song-duo-image-toggle">
                    <input :checked="anotherImageMode" type="checkbox" @change="onAnotherImageModeChange" />
                    <span>曲绘显示</span>
                  </label>
                </div>
                <div class="section-head-actions">
                  <div v-if="!anotherImageMode" class="anvo-mode-switch">
                    <button class="anvo-mode-btn" @click="toggleAllAnotherExpandCollapse">
                      {{ anotherGlobalToggleLabel }}
                    </button>
                    <button class="anvo-mode-btn" :class="{ active: anotherAllFixed }" @click="setAllAnotherFixedMode">
                      固定高度
                    </button>
                  </div>
                  <button class="card-export-btn song-export-btn" :disabled="isExportingPng" @click="exportSongPanelPng('panel-another-vocal', getSongSectionTitle('panel-another-vocal'))">PNG</button>
                </div>
              </div>

              <div class="song-role-card-grid song-stat-grid">
                <article
                  v-for="row in anotherVocalCards"
                  :key="`another-card-${row.name}`"
                  :ref="(el) => setAnvoCardRef(row.name, el)"
                  :class="['song-role-card', 'song-stat-card', 'song-anvo-card', { 'is-image-mode': anotherImageMode }]"
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
                      <div class="song-image-count">{{ row.count }} 首</div>
                    </div>
                    <div class="song-image-jacket-grid">
                      <div
                        v-for="song in row.songs"
                        :key="`anvo-song-jacket-${row.name}-${song.id}-${song.vocalId}`"
                        class="song-jacket-media song-duo-song-jacket-item"
                        :title="song.title || '-'"
                      >
                        <img
                          v-if="song.jacketUrl"
                          :src="song.jacketUrl"
                          :alt="`${song.title || '歌曲'} 封面`"
                          class="song-jacket-img song-duo-song-jacket-img"
                          loading="lazy"
                          decoding="async"
                          @error="onSongJacketError"
                        />
                        <span class="song-jacket-fallback">-</span>
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
                        <button class="song-mini-icon-btn" @click="toggleAnotherCardExpandCollapse(row.name)">
                          <img
                            :src="getAnotherCardMode(row.name) === 'collapsed' ? '/data/icon/expand.png' : '/data/icon/collapse.png'"
                            :alt="getAnotherCardMode(row.name) === 'collapsed' ? '展开' : '收起'"
                            class="song-mini-icon-btn-img"
                          />
                        </button>
                        <button class="card-export-btn song-export-btn song-mini-png-btn" :disabled="isExportingPng" @click="exportAnotherCardPng(row)">PNG</button>
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

            <article id="panel-duo-stats" class="stats-section card-panel">
              <div class="section-head section-head-sub">
                <div class="section-head-left">
                  <h2>{{ getSongSectionTitle('panel-duo-stats') }}</h2>
                  <label class="song-duo-image-toggle">
                    <input :checked="duoImageMode" type="checkbox" @change="onDuoImageModeChange" />
                    <span>曲绘显示</span>
                  </label>
                </div>
                <div class="section-head-actions">
                  <div v-if="!duoImageMode" class="anvo-mode-switch">
                    <button class="anvo-mode-btn" @click="toggleAllDuoExpandCollapse">
                      {{ duoGlobalToggleLabel }}
                    </button>
                  </div>
                  <button class="card-export-btn song-export-btn" :disabled="isExportingPng" @click="exportSongPanelPng('panel-duo-stats', getSongSectionTitle('panel-duo-stats'))">PNG</button>
                </div>
              </div>

              <div class="song-duo-unit-grid">
                <article
                  v-for="unitCard in sameUnitPairUnitCards"
                  :key="`duo-unit-${unitCard.unit}`"
                  :id="unitCard.anchorId"
                  :class="['song-duo-unit-card', { 'is-ws-split': unitCard.isWsSplit && !duoImageMode }]"
                  :style="{ backgroundColor: unitCard.tint }"
                >
                  <div
                    :class="['song-duo-pair-grid', 'song-stat-grid', { 'is-ws-split-grid': unitCard.isWsSplit && !duoImageMode, 'is-image-compact': duoImageMode }]"
                    :ref="(el) => setDuoPairGridRef(unitCard.unit, el)"
                  >
                    <article
                      v-for="card in unitCard.pairs"
                      :key="card.key"
                      :class="['song-role-card', 'song-duo-card', 'song-stat-card', { 'is-image-mode': duoImageMode }]"
                      :style="duoImageMode
                        ? { backgroundImage: card.gradientBg, borderColor: unitColorMap[unitCard.unit] || '#334155' }
                        : { backgroundImage: card.gradientBg }"
                    >
                      <div v-if="duoImageMode" class="song-duo-image-row">
                        <div class="song-image-identity song-duo-image-identity" :title="`${card.memberA.name} & ${card.memberB.name}`">
                          <div class="song-duo-image-avatars">
                            <img :src="getCharacterAvatarSrc(card.memberA.name)" :alt="card.memberA.name" class="song-role-avatar song-duo-image-avatar" />
                            <img :src="getCharacterAvatarSrc(card.memberB.name)" :alt="card.memberB.name" class="song-role-avatar song-duo-image-avatar" />
                          </div>
                          <div class="song-image-count">{{ card.count }} 首</div>
                        </div>
                        <div class="song-image-jacket-grid song-duo-jacket-grid">
                          <div
                            v-for="song in card.songs"
                            :key="`duo-song-jacket-${card.key}-${song.id}`"
                            class="song-jacket-media song-duo-song-jacket-item"
                            :title="song.title || '-'"
                          >
                            <img
                              v-if="song.jacketUrl"
                              :src="song.jacketUrl"
                              :alt="`${song.title || '歌曲'} 封面`"
                              class="song-jacket-img song-duo-song-jacket-img"
                              loading="lazy"
                              decoding="async"
                              @error="onSongJacketError"
                            />
                            <span class="song-jacket-fallback">-</span>
                          </div>
                        </div>
                      </div>
                      <template v-else>
                        <div class="song-role-head">
                          <div class="song-role-main song-stat-main">
                            <img :src="getCharacterAvatarSrc(card.memberA.name)" :alt="card.memberA.name" class="song-role-avatar" />
                            <img :src="getCharacterAvatarSrc(card.memberB.name)" :alt="card.memberB.name" class="song-role-avatar" />
                            <div class="song-role-text">
                                  <div class="song-role-name song-duo-name">
                                <span :ref="(el) => setDuoNameRef(card.key, el)" class="duo-name-probe">{{ card.memberA.name }} & {{ card.memberB.name }}</span>
                                <span v-if="!isDuoNameCompact(card.key)" class="duo-name-full">{{ card.memberA.name }} & {{ card.memberB.name }}</span>
                                <span v-else class="duo-name-short">{{ getCharacterSingleMark(card.memberA.name) }} & {{ getCharacterSingleMark(card.memberB.name) }}</span>
                                  </div>
                              <div class="song-role-count">{{ card.count }} 首</div>
                            </div>
                          </div>
                          <button class="song-mini-icon-btn" @click="toggleDuoCardExpandCollapse(card.key)">
                                <img
                                  :src="isDuoCardExpanded(card.key) ? '/data/icon/collapse.png' : '/data/icon/expand.png'"
                                  :alt="isDuoCardExpanded(card.key) ? '收起' : '展开'"
                                  class="song-mini-icon-btn-img"
                                />
                          </button>
                        </div>
                        <ul v-if="isDuoCardExpanded(card.key)" class="song-role-list song-stat-list song-stat-list-duo">
                          <li v-for="song in card.songs" :key="`duo-song-${card.key}-${song.id}`">
                            <span class="song-role-song-id">#{{ song.id }}</span>
                            <span class="song-role-song-title">{{ song.title || '-' }}</span>
                          </li>
                        </ul>
                      </template>
                    </article>
                  </div>
                </article>
                <div v-if="sameUnitPairUnitCards.length === 0" class="song-empty">暂无同团双人歌曲数据</div>
              </div>
            </article>
          </div>
        </section>

        <section id="panel-song-search" class="stats-section card-panel section-main">
          <div class="section-head">
            <div class="section-head-left">
              <h2>{{ getSongSectionTitle('panel-song-search') }}</h2>
            </div>
          </div>

          <section class="song-toolbar">
            <input
              v-model.trim="keyword"
              class="song-search"
              type="text"
              placeholder="按歌曲名 / 词曲作者搜索（ID 用 #，如 #241）"
            />
          </section>

          <section
            ref="songListWrapRef"
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
                  <th>封面</th>
                  <th>歌曲</th>
                  <th class="song-th-filter">
                    <div class="song-th-title">团体</div>
                    <select v-model="groupFilter" class="song-filter-select song-th-select">
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
                    <div class="song-th-title">MV</div>
                    <select v-model="mvFilter" class="song-filter-select song-th-select">
                      <option value="all">全部</option>
                      <option value="3d">3DMV</option>
                      <option value="2d">2DMV</option>
                      <option value="vs2d">2DMV(VS)</option>
                      <option value="original">原画MV</option>
                    </select>
                  </th>
                  <th class="song-th-filter">
                    <div class="song-th-title">难度排序</div>
                    <div class="song-th-filter-stack">
                      <select v-model="difficultySortKey" class="song-filter-select song-th-select">
                        <option
                          v-for="option in DIFFICULTY_SORT_OPTIONS"
                          :key="`difficulty-sort-head-${option.value}`"
                          :value="option.value"
                        >
                          {{ option.label }}
                        </option>
                      </select>
                      <select
                        v-model="difficultySortOrder"
                        class="song-filter-select song-th-select"
                        :disabled="difficultySortKey === 'none'"
                      >
                        <option value="desc">高到低</option>
                        <option value="asc">低到高</option>
                      </select>
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
                    <div class="song-jacket-media">
                      <img
                        v-if="song.jacketUrl"
                        :src="song.jacketUrl"
                        :alt="`${song.title || '歌曲'} 封面`"
                        class="song-jacket-img"
                        loading="lazy"
                        decoding="async"
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
            <button class="song-page-btn" :disabled="currentSongPage <= 1" @click="changeSongPage(-1)">-</button>
            <span class="song-page-text">第 {{ currentSongPage }} / {{ totalSongPages }} 页</span>
            <button class="song-page-btn" :disabled="currentSongPage >= totalSongPages" @click="changeSongPage(1)">+</button>
            <button class="song-home-btn" title="回到第一页" @click="backToSongHome">
              <img src="/data/icon/reset.png" class="song-home-btn-icon" alt="回到第一页" />
            </button>
            <label class="song-page-size-field">
              <span>每页</span>
              <select v-model.number="songPageSize" class="song-page-size-select">
                <option v-for="size in SONG_PAGE_SIZE_OPTIONS" :key="`song-page-size-${size}`" :value="size">{{ size }}</option>
              </select>
            </label>
            <span class="song-page-count">共 {{ filteredSongs.length }} 首</span>
          </section>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import html2canvas from 'html2canvas';

const props = defineProps({
  allEvents: { type: Array, default: () => [] },
  allSongs: { type: Array, default: () => [] },
  allCharacters: { type: Array, default: () => [] }
});

const keyword = ref('');
const mvFilter = ref('all');
const groupFilter = ref('all');
const difficultySortKey = ref('none');
const difficultySortOrder = ref('desc');
const includeDeletedSongsInStats = ref(true);
const isExportingPng = ref(false);
const currentSongPage = ref(1);
const songPageSize = ref(10);
const anotherCardModeMap = ref({});
const anotherImageMode = ref(false);
const duoCardExpandedMap = ref({});
const duoNameCompactMap = ref({});
const duoImageMode = ref(false);
const duoNameRefMap = new Map();
const duoPairGridRefMap = new Map();
const duoPairGridColumnMap = ref({});
const songListWrapRef = ref(null);
const isSongTableOverflowing = ref(false);
const anvoCardRefMap = new Map();
const vsSongCardModeMap = ref({});
const vsSongImageMode = ref(false);
const ocBookImageMode = ref(false);
const ocBookUnitExpandedMap = ref({});
const vsSongCardRefMap = new Map();
const ocBookUnitCardRefMap = new Map();
let duoNameRaf = 0;
let duoPairGridRaf = 0;
let duoPairGridResizeObserver = null;
let songTableResizeObserver = null;
let resizeViewportRaf = 0;
let viewportScrollHost = null;
let lastViewportAnchorSnapshot = null;

const DELETED_SONG_ID_SET = new Set([241, 290]);

const navCollapsed = ref(false);
const activeNavId = ref('panel-song-stats');
const isMobileNav = ref(false);
const isNavTopLayout = ref(false);
const navTopLayoutPrev = ref(null);
let sectionObserver = null;

const SONG_DIFFICULTY_ORDER = Object.freeze([
  { key: 'easy', label: 'E' },
  { key: 'normal', label: 'N' },
  { key: 'hard', label: 'H' },
  { key: 'expert', label: 'EX' },
  { key: 'master', label: 'M' },
  { key: 'append', label: 'AP' }
]);
const SONG_STAT_CARD_TINT_ALPHA = 0.2;

const DIFFICULTY_SORT_OPTIONS = Object.freeze([
  { value: 'none', label: '默认顺序(ID)' },
  { value: 'easy', label: '按 EASY 难度' },
  { value: 'normal', label: '按 NORMAL 难度' },
  { value: 'hard', label: '按 HARD 难度' },
  { value: 'expert', label: '按 EXPERT 难度' },
  { value: 'master', label: '按 MASTER 难度' },
  { value: 'append', label: '按 APPEND 难度' }
]);

const SONG_PAGE_SIZE_OPTIONS = Object.freeze([10, 20, 30, 50, 100]);

const MV_TAG_MAP = Object.freeze({
  '3dmv': { label: '3D', tone: 'is-3d' },
  '2dmv': { label: '2D', tone: 'is-2d' },
  'vs_2dmv': { label: '2D(VS)', tone: 'is-vs2d' },
  original: { label: '原画', tone: 'is-original' },
  image: null
});

const UNIT_TAG_ICON_MAP = Object.freeze({
  ln: '/elements/ln.png',
  mmj: '/elements/mmj.png',
  vbs: '/elements/vbs.png',
  ws: '/elements/ws.png',
  nc: '/elements/nc.png',
  vs: '/elements/vs.png'
});
const LOCAL_SONG_JACKET_BASE_PATH = '/songs';
const PROJECT_GITHUB_ISSUES_URL = 'https://github.com/Melodrama13/Melodrama13.github.io/issues';

const UNIT_TITLE_LOGO_MAP = Object.freeze({
  ln: '/elements/Leo_need.png',
  mmj: '/elements/MORE_MORE_JUMP!.png',
  vbs: '/elements/Vivid_BAD_SQUAD.png',
  ws: '/elements/ワンダーランズ×ショウタイム.png',
  nc: '/elements/25時、ナイトコードで.png',
  vs: '/elements/virtual_singer.png'
});

const BASE_UNIT_COLOR_MAP = Object.freeze({
  ln: '#4455dd',
  mmj: '#88dd44',
  vbs: '#ee1166',
  ws: '#ff9900',
  nc: '#884499',
  vs: '#33aaee'
});

const GROUP_FILTER_OPTIONS = Object.freeze([
  { value: 'all', label: '全部团体' },
  { value: 'vocaloid', label: 'Vocaloid' },
  { value: 'ln', label: 'Leo/need' },
  { value: 'mmj', label: 'MORE MORE JUMP!' },
  { value: 'vbs', label: 'Vivid BAD SQUAD' },
  { value: 'ws', label: 'ワンダーランズ×ショウタイム' },
  { value: 'nc', label: '25時、ナイトコードで。' },
  { value: 'other', label: '其他' }
]);

const UNIT_NAV_LABEL_MAP = Object.freeze({
  ln: 'LN',
  mmj: 'MMJ',
  vbs: 'VBS',
  ws: 'WS',
  nc: 'NC'
});

const UNIT_TAG_ABBR_MAP = Object.freeze({
  ln: 'ln',
  mmj: 'mmj',
  vbs: 'vbs',
  ws: 'ws',
  nc: 'nc',
  vs: 'vs'
});

const OC_UNIT_OPTIONS = Object.freeze([
  { key: 'ln', label: 'Leo/need' },
  { key: 'mmj', label: 'MORE MORE JUMP!' },
  { key: 'vbs', label: 'Vivid BAD SQUAD' },
  { key: 'ws', label: 'ワンダーランズ×ショウタイム' },
  { key: 'nc', label: '25時、ナイトコードで。' }
]);

const OC_UNIT_KEYS = Object.freeze(OC_UNIT_OPTIONS.map((item) => item.key));
const VS_UNIT_ORDER = Object.freeze(['ln', 'mmj', 'vbs', 'ws', 'nc']);
const VS_UNIT_ORDER_MAP = Object.freeze({ ln: 1, mmj: 2, vbs: 3, ws: 4, nc: 5 });

const SONG_SECTION_TITLE_MAP = Object.freeze({
  'panel-song-stats': '乐曲统计',
  'panel-oc-stats': '各团歌曲统计',
  'panel-vs-song-stats': 'VS书下统计',
  'panel-oc-book-stats': 'OC书下统计',
  'panel-another-vocal': 'Anvo统计',
  'panel-duo-stats': '双人歌曲统计',
  'panel-song-search': '乐曲检索'
});

const getSongSectionTitle = (id) => SONG_SECTION_TITLE_MAP[id] || String(id || '');

const navGroups = computed(() => {
  const duoUnitChildren = sameUnitPairUnitCards.value.map((unitCard) => ({
    id: unitCard.anchorId,
    title: `${UNIT_NAV_LABEL_MAP[unitCard.unit] || String(unitCard.unit || '').toUpperCase()} 双人歌曲`,
    anchorKind: 'duo-unit'
  }));

  return [
    {
      id: 'panel-song-stats',
      title: getSongSectionTitle('panel-song-stats'),
      children: [
        { id: 'panel-oc-stats', title: getSongSectionTitle('panel-oc-stats') },
        { id: 'panel-vs-song-stats', title: getSongSectionTitle('panel-vs-song-stats') },
        { id: 'panel-oc-book-stats', title: getSongSectionTitle('panel-oc-book-stats') },
        { id: 'panel-another-vocal', title: getSongSectionTitle('panel-another-vocal') },
        { id: 'panel-duo-stats', title: getSongSectionTitle('panel-duo-stats') },
        ...duoUnitChildren
      ]
    },
    {
      id: 'panel-song-search',
      title: getSongSectionTitle('panel-song-search'),
      children: []
    }
  ];
});

const navTargetIds = computed(() => {
  const ids = [];
  navGroups.value.forEach((g) => {
    ids.push(g.id);
    (g.children || []).forEach((c) => ids.push(c.id));
  });
  return ids;
});

const duoUnitNavIds = computed(() => {
  const ids = [];
  navGroups.value.forEach((group) => {
    (group.children || []).forEach((item) => {
      if (item.anchorKind === 'duo-unit') ids.push(item.id);
    });
  });
  return new Set(ids);
});

const isDuoNavScopeActive = computed(() => {
  if (activeNavId.value === 'panel-duo-stats') return true;
  return duoUnitNavIds.value.has(activeNavId.value);
});

const isGroupActive = (group) => {
  if (activeNavId.value === group.id) return true;
  return (group.children || []).some((c) => c.id === activeNavId.value);
};

const isGroupExpanded = (group) => isMobileNav.value || isGroupActive(group);

const shouldShowNavChild = (item) => {
  if (item?.anchorKind !== 'duo-unit') return true;
  return isMobileNav.value || isDuoNavScopeActive.value;
};

const getScrollContainer = () => {
  const content = document.querySelector('.content-area');
  if (content instanceof HTMLElement) return content;
  if (document.scrollingElement instanceof HTMLElement) return document.scrollingElement;
  return document.documentElement;
};

const snapshotViewportAnchor = () => {
  const host = getScrollContainer();
  const hostRect = host.getBoundingClientRect();
  const anchorId = activeNavId.value;
  const anchorEl = anchorId ? document.getElementById(anchorId) : null;
  const ratio = (host.scrollTop + host.clientHeight / 2) / Math.max(1, host.scrollHeight);
  return {
    anchorId,
    hasAnchor: !!anchorEl,
    anchorTop: anchorEl ? (anchorEl.getBoundingClientRect().top - hostRect.top) : 0,
    scrollTop: host.scrollTop,
    ratio
  };
};

const restoreViewportAnchor = (snapshot) => {
  if (!snapshot) return;
  const host = getScrollContainer();
  const hostRect = host.getBoundingClientRect();
  const anchorEl = snapshot.anchorId ? document.getElementById(snapshot.anchorId) : null;
  if (snapshot.hasAnchor && anchorEl) {
    const afterTop = anchorEl.getBoundingClientRect().top - hostRect.top;
    const nextTop = snapshot.scrollTop + (afterTop - snapshot.anchorTop);
    const maxTop = Math.max(0, host.scrollHeight - host.clientHeight);
    host.scrollTop = Math.max(0, Math.min(maxTop, nextTop));
    return;
  }
  const targetTop = snapshot.ratio * host.scrollHeight - host.clientHeight / 2;
  const maxTop = Math.max(0, host.scrollHeight - host.clientHeight);
  host.scrollTop = Math.max(0, Math.min(maxTop, targetTop));
};

const rememberViewportAnchor = () => {
  lastViewportAnchorSnapshot = snapshotViewportAnchor();
};

const bindViewportScrollTracking = () => {
  const host = getScrollContainer();
  if (viewportScrollHost && viewportScrollHost !== host) {
    viewportScrollHost.removeEventListener('scroll', rememberViewportAnchor);
  }
  viewportScrollHost = host;
  viewportScrollHost.addEventListener('scroll', rememberViewportAnchor, { passive: true });
};

const handleWindowResize = () => {
  const snapshot = lastViewportAnchorSnapshot || snapshotViewportAnchor();
  if (resizeViewportRaf) cancelAnimationFrame(resizeViewportRaf);
  resizeViewportRaf = requestAnimationFrame(() => {
    resizeViewportRaf = 0;
    updateMobileNavState();
    void (async () => {
      await nextTick();
      await waitNextPaint();
      restoreViewportAnchor(snapshot);
      rememberViewportAnchor();
    })();
  });
};

const withPreservedScrollCenter = async (applyChange) => {
  const snapshot = snapshotViewportAnchor();
  applyChange();
  await nextTick();
  await waitNextPaint();
  restoreViewportAnchor(snapshot);
  rememberViewportAnchor();
};

const onVsSongImageModeChange = (event) => {
  const checked = !!event?.target?.checked;
  void withPreservedScrollCenter(() => {
    vsSongImageMode.value = checked;
  });
};

const onOcBookImageModeChange = (event) => {
  const checked = !!event?.target?.checked;
  void withPreservedScrollCenter(() => {
    ocBookImageMode.value = checked;
  });
};

const onAnotherImageModeChange = (event) => {
  const checked = !!event?.target?.checked;
  void withPreservedScrollCenter(() => {
    anotherImageMode.value = checked;
  });
};

const onDuoImageModeChange = (event) => {
  const checked = !!event?.target?.checked;
  void withPreservedScrollCenter(() => {
    duoImageMode.value = checked;
  });
};

const setNavCollapsed = (nextCollapsed, preserveCenter = true) => {
  const next = !!nextCollapsed;
  if (navCollapsed.value === next) return;
  if (!preserveCenter) {
    navCollapsed.value = next;
    return;
  }
  void withPreservedScrollCenter(() => {
    navCollapsed.value = next;
  });
};

const updateMobileNavState = () => {
  if (typeof window === 'undefined') return;
  const isTopLayout = window.innerWidth <= 900;
  const prev = navTopLayoutPrev.value;
  const nextCollapsed = prev === null
    ? isTopLayout
    : (prev !== isTopLayout ? isTopLayout : navCollapsed.value);
  const needPreserve = prev !== null
    && (isNavTopLayout.value !== isTopLayout || navCollapsed.value !== nextCollapsed);

  const applyState = () => {
    isNavTopLayout.value = isTopLayout;
    isMobileNav.value = isTopLayout;
    navCollapsed.value = nextCollapsed;
    navTopLayoutPrev.value = isTopLayout;
  };

  if (needPreserve) {
    void withPreservedScrollCenter(applyState);
    recalcSongTableOverflow();
    return;
  }
  applyState();
  recalcSongTableOverflow();
};

const scrollSectionIntoHost = (id, behavior = 'smooth') => {
  const el = document.getElementById(id);
  if (!el) return false;
  const host = getScrollContainer();
  const hostRect = host.getBoundingClientRect();
  const targetRect = el.getBoundingClientRect();
  const nextTop = host.scrollTop + (targetRect.top - hostRect.top) - 8;
  host.scrollTo({ top: Math.max(0, nextTop), behavior });
  return true;
};

const scrollToSection = async (id) => {
  activeNavId.value = id;

  if (isNavTopLayout.value) {
    if (!scrollSectionIntoHost(id, 'auto')) return;
    setNavCollapsed(true, false);
    await nextTick();
    await waitNextPaint();
    scrollSectionIntoHost(id, 'auto');
    return;
  }

  scrollSectionIntoHost(id, 'smooth');
};

const backToSongHome = () => {
  if (currentSongPage.value <= 1) return;
  currentSongPage.value = 1;
};

const recalcSongTableOverflow = () => {
  const wrap = songListWrapRef.value;
  if (!(wrap instanceof HTMLElement)) {
    isSongTableOverflowing.value = false;
    return;
  }
  isSongTableOverflowing.value = wrap.scrollWidth - wrap.clientWidth > 1;
};

const bindSectionObserver = async () => {
  if (sectionObserver) {
    sectionObserver.disconnect();
    sectionObserver = null;
  }

  await nextTick();
  const ids = navTargetIds.value;

  sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((e) => e.isIntersecting)
      .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
    if (visible.length > 0) {
      activeNavId.value = visible[0].target.id;
    }
  }, {
    root: null,
    rootMargin: '-25% 0px -60% 0px',
    threshold: [0.05, 0.2, 0.4]
  });

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });
};

onMounted(() => {
  updateMobileNavState();
  window.addEventListener('resize', handleWindowResize);
  bindViewportScrollTracking();
  rememberViewportAnchor();
  if (typeof ResizeObserver !== 'undefined') {
    duoPairGridResizeObserver = new ResizeObserver(() => {
      scheduleRecalcDuoPairGridColumns();
    });
    duoPairGridRefMap.forEach((el) => {
      duoPairGridResizeObserver.observe(el);
    });
    songTableResizeObserver = new ResizeObserver(() => {
      recalcSongTableOverflow();
    });
    if (songListWrapRef.value) {
      songTableResizeObserver.observe(songListWrapRef.value);
    }
  }
  nextTick(() => {
    scheduleRecalcDuoPairGridColumns();
    recalcSongTableOverflow();
  });
  bindSectionObserver();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize);
  if (viewportScrollHost) {
    viewportScrollHost.removeEventListener('scroll', rememberViewportAnchor);
    viewportScrollHost = null;
  }
  if (resizeViewportRaf) cancelAnimationFrame(resizeViewportRaf);
  if (duoPairGridResizeObserver) {
    duoPairGridResizeObserver.disconnect();
    duoPairGridResizeObserver = null;
  }
  if (songTableResizeObserver) {
    songTableResizeObserver.disconnect();
    songTableResizeObserver = null;
  }
  if (duoPairGridRaf) cancelAnimationFrame(duoPairGridRaf);
  if (sectionObserver) sectionObserver.disconnect();
});

const normalizeSongId = (idRaw) => {
  const n = Number(idRaw);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

const normalizeHexColor = (raw) => {
  const color = String(raw || '').trim();
  if (!/^#([\da-fA-F]{3}|[\da-fA-F]{6})$/.test(color)) return '';
  if (color.length === 4) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toLowerCase();
  }
  return color.toLowerCase();
};

const hexToRgba = (hex, alpha = 1) => {
  const safe = normalizeHexColor(hex);
  const a = Math.max(0, Math.min(1, Number(alpha)));
  if (!safe) return `rgba(148, 163, 184, ${a})`;
  const num = Number.parseInt(safe.slice(1), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const mixHexWithWhite = (hex, strength = 0.2) => {
  const safe = normalizeHexColor(hex);
  const s = Math.max(0, Math.min(1, Number(strength)));
  if (!safe) return 'rgb(226, 232, 240)';
  const num = Number.parseInt(safe.slice(1), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const blendedR = Math.round(255 * (1 - s) + r * s);
  const blendedG = Math.round(255 * (1 - s) + g * s);
  const blendedB = Math.round(255 * (1 - s) + b * s);
  return `rgb(${blendedR}, ${blendedG}, ${blendedB})`;
};

const normalizeCategoryKey = (value) => String(value || '').trim().toLowerCase();

const normalizeGroupKey = (value) => {
  const key = normalizeCategoryKey(value);
  if (key === 'vs') return 'vocaloid';
  return key;
};

const buildOrderedGroupKeys = (keysRaw) => {
  const seen = new Set();
  const keys = [];

  (Array.isArray(keysRaw) ? keysRaw : []).forEach((raw) => {
    const key = normalizeGroupKey(raw);
    if (!key || key === 'all' || seen.has(key)) return;
    seen.add(key);
    keys.push(key);
  });

  return keys;
};

const buildGroupTags = (groupKeysRaw) => {
  return buildOrderedGroupKeys(groupKeysRaw).map((key) => {
    if (key === 'vocaloid') {
      return { key, kind: 'logo', label: 'VS', icon: UNIT_TAG_ICON_MAP.vs };
    }

    if (Object.prototype.hasOwnProperty.call(UNIT_TAG_ICON_MAP, key)) {
      return { key, kind: 'logo', label: key.toUpperCase(), icon: UNIT_TAG_ICON_MAP[key] };
    }

    if (key === 'other') {
      return { key, kind: 'other', label: '其他' };
    }

    return { key, kind: 'text', label: key.toUpperCase() };
  });
};

const buildMvTags = (categories) => {
  const tags = [];
  const seenLabels = new Set();

  categories.forEach((raw) => {
    const key = normalizeCategoryKey(raw);
    if (!key) return;

    const mapped = Object.prototype.hasOwnProperty.call(MV_TAG_MAP, key)
      ? MV_TAG_MAP[key]
      : { label: String(raw || '').trim(), tone: 'is-other' };

    if (!mapped) return;
    if (seenLabels.has(mapped.label)) return;

    seenLabels.add(mapped.label);
    tags.push({ key, label: mapped.label, tone: mapped.tone });
  });

  return tags;
};

const buildSongJacketIdText = (songIdRaw) => {
  const id = Number(songIdRaw);
  if (!Number.isFinite(id) || id <= 0) return null;
  return String(Math.trunc(id)).padStart(3, '0');
};

const buildLocalSongJacketUrl = (songIdRaw) => {
  const idText = buildSongJacketIdText(songIdRaw);
  if (!idText) return '';
  const fileName = `song_${idText}.webp`;
  return `${LOCAL_SONG_JACKET_BASE_PATH}/${fileName}`;
};

const normalizeSongRow = (row) => {
  const idNum = Number(row?.id);
  const categories = Array.isArray(row?.categories)
    ? row.categories.map((c) => String(c || '').trim()).filter(Boolean)
    : [];
  const tagKeys = Array.isArray(row?.tags)
    ? row.tags.map((tag) => normalizeCategoryKey(tag)).filter(Boolean)
    : [];
  const groupKeys = buildOrderedGroupKeys(Array.isArray(row?.tags) ? row.tags : []);
  const localJacketUrl = buildLocalSongJacketUrl(row?.id);

  return {
    id: row?.id ?? '-',
    songIdNum: Number.isFinite(idNum) ? idNum : null,
    isDeletedSong: Number.isFinite(idNum) && DELETED_SONG_ID_SET.has(idNum),
    title: String(row?.title || '').trim(),
    composer: String(row?.composer || '').trim(),
    lyricist: String(row?.lyricist || '').trim(),
    arranger: String(row?.arranger || '').trim(),
    difficulties: row?.difficulties && typeof row.difficulties === 'object' ? row.difficulties : {},
    tagKeys,
    categoryKeys: categories.map((c) => normalizeCategoryKey(c)).filter(Boolean),
    groupKeys,
    vocals: Array.isArray(row?.vocals) ? row.vocals : [],
    mvTags: buildMvTags(categories),
    groupTags: buildGroupTags(groupKeys),
    jacketUrl: localJacketUrl
  };
};

const songs = computed(() => {
  return (Array.isArray(props.allSongs) ? props.allSongs : [])
    .map((row) => normalizeSongRow(row))
    .sort((a, b) => normalizeSongId(a.id) - normalizeSongId(b.id));
});

const songsForStats = computed(() => {
  if (includeDeletedSongsInStats.value) return songs.value;
  return songs.value.filter((song) => !song.isDeletedSong);
});

const characters = computed(() => {
  return (Array.isArray(props.allCharacters) ? props.allCharacters : [])
    .map((char, idx) => {
      const name = String(char?.zh_name || '').trim();
      if (!name) return null;
      const order = Number(char?.id);
      return {
        name,
        unit: String(char?.unit || '').trim().toLowerCase() || 'vs',
        abbr: String(char?.en_abbr || '').trim() || name,
        singleMark: String(char?.single_mark || '').trim() || String(name).slice(0, 1),
        order: Number.isFinite(order) && order > 0 ? order : 900 + idx,
        color: normalizeHexColor(char?.color) || '#cbd5e1',
        unitColor: normalizeHexColor(char?.unit_color)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'zh-Hans-CN'));
});

const characterByName = computed(() => {
  return new Map(characters.value.map((char) => [char.name, char]));
});

const charactersByUnit = computed(() => {
  const grouped = Object.fromEntries(OC_UNIT_KEYS.map((key) => [key, []]));
  characters.value.forEach((char) => {
    if (!Object.prototype.hasOwnProperty.call(grouped, char.unit)) return;
    grouped[char.unit].push(char);
  });
  return grouped;
});

const unitColorMap = computed(() => {
  const next = { ...BASE_UNIT_COLOR_MAP };
  characters.value.forEach((char) => {
    if (char.unitColor) next[char.unit] = char.unitColor;
  });
  return next;
});

const getAnotherCharacterSortOrder = (charMeta) => {
  if (!charMeta) return Number.MAX_SAFE_INTEGER;
  if (charMeta.name !== '巡音流歌') return charMeta.order;
  const mikuOrder = characterByName.value.get('初音未来')?.order;
  if (!Number.isFinite(mikuOrder)) return charMeta.order;
  return mikuOrder + 0.01;
};

const normalizeCharacterName = (rawName) => {
  const full = String(rawName || '').trim();
  if (!full) return '';
  if (characterByName.value.has(full)) return full;

  const base = full.split(/\s+/)[0] || '';
  if (base && characterByName.value.has(base)) return base;
  return '';
};

const getCharacterAvatarSrc = (rawName) => {
  const normalized = normalizeCharacterName(rawName);
  const meta = characterByName.value.get(normalized);
  const key = String(meta?.abbr || '').trim();
  return key ? `/chibi_s/${key}.webp` : '';
};

const getCharacterColor = (rawName) => {
  const normalized = normalizeCharacterName(rawName);
  return characterByName.value.get(normalized)?.color || '#cbd5e1';
};

const getCharacterSingleMark = (rawName) => {
  const normalized = normalizeCharacterName(rawName);
  const mark = String(characterByName.value.get(normalized)?.singleMark || '').trim();
  if (mark) return mark;
  return String(normalized || rawName || '').slice(0, 1);
};

const getCharacterAbbr = (rawName) => {
  const normalized = normalizeCharacterName(rawName);
  return String(characterByName.value.get(normalized)?.abbr || normalized || rawName || '').trim();
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const toFiniteSongId = (value) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n > 0 ? n : null;
};

const songsById = computed(() => {
  const map = new Map();
  songs.value.forEach((song) => {
    const id = toFiniteSongId(song?.id);
    if (id === null) return;
    map.set(id, song);
  });
  return map;
});

const VS_ALIAS_MAP = computed(() => {
  const map = new Map();
  characters.value
    .filter((char) => char.unit === 'vs')
    .forEach((char) => {
      const aliases = [
        char.name,
        char.name.split(/\s+/)[0],
        String(char.abbr || '').trim(),
        String(char.abbr || '').trim().toUpperCase(),
        String(char.abbr || '').trim().toLowerCase(),
        String(char.singleMark || '').trim()
      ].filter(Boolean);

      aliases.forEach((alias) => {
        map.set(String(alias), char.name);
      });
    });
  return map;
});

const VS_NAMES = computed(() => {
  return characters.value.filter((char) => char.unit === 'vs').map((char) => char.name);
});

const parseVS = (vsStr) => {
  if (!vsStr) return [];
  return String(vsStr)
    .split(/[,，/、\s]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      return VS_ALIAS_MAP.value.get(token)
        || VS_ALIAS_MAP.value.get(token.toUpperCase())
        || VS_ALIAS_MAP.value.get(token.toLowerCase())
        || '';
    })
    .filter((name) => VS_NAMES.value.includes(name));
};

const getUnitByChar = (name) => {
  const raw = String(name || '').trim();
  if (!raw) return 'vs';
  const [baseName, suffixRaw] = raw.split(/\s+/);
  const suffix = String(suffixRaw || '').toLowerCase();
  const baseUnit = characterByName.value.get(normalizeCharacterName(baseName))?.unit || 'vs';
  if (baseUnit === 'vs') {
    if (suffix && Object.prototype.hasOwnProperty.call(unitColorMap.value, suffix)) return suffix;
    return 'vs';
  }
  return baseUnit;
};

const hasSong2DMVCategory = (song) => {
  if (!Array.isArray(song?.categoryKeys)) return false;
  return song.categoryKeys.includes('2dmv');
};

const hasSong3DMVCategory = (song) => {
  if (!Array.isArray(song?.categoryKeys)) return false;
  return song.categoryKeys.includes('3dmv');
};

const normalizeAsciiAbbr = (raw) => String(raw || '').trim().replace(/[^a-zA-Z]/g, '').toLowerCase();

const makeSongTagSingle = (ev) => {
  const sid = String(ev?.type_series_id || '').trim();
  const bannerName = String(ev?.banner || '').trim();
  const unit = String(ev?.unit || '').trim().toLowerCase();
  if (bannerName) return `${getCharacterSingleMark(bannerName)}${sid}`;
  if (unit) return `${String(unit).slice(0, 1)}${sid}`;
  return sid ? `曲${sid}` : '未知';
};

const makeSongTagAbbr = (ev) => {
  const sid = String(ev?.type_series_id || '').trim();
  const bannerName = String(ev?.banner || '').trim();
  const unit = String(ev?.unit || '').trim().toLowerCase();
  if (bannerName) {
    const abbr = normalizeAsciiAbbr(getCharacterAbbr(bannerName));
    return `${abbr || 'char'}${sid}`;
  }
  if (unit) {
    const unitAbbr = UNIT_TAG_ABBR_MAP[unit] || normalizeAsciiAbbr(unit) || 'song';
    return `${unitAbbr}${sid}`;
  }
  return sid ? `song${sid}` : 'unknown';
};

const makeSongTagNumber = (ev) => {
  const sid = String(ev?.type_series_id || '').trim();
  if (sid) return sid;
  const matched = String(makeSongTagSingle(ev)).match(/(\d+)$/);
  return matched ? matched[1] : '-';
};

const getSongTagColor = (ev) => {
  const bannerName = String(ev?.banner || '').trim();
  const unit = bannerName ? getUnitByChar(bannerName) : String(ev?.unit || '').trim().toLowerCase();
  return unitColorMap.value[unit] || '#111827';
};

const getSongTagImageColor = (ev) => {
  const bannerName = String(ev?.banner || '').trim();
  const byCharacter = bannerName ? getCharacterColor(bannerName) : '';
  if (byCharacter) return byCharacter;
  return getSongTagColor(ev);
};

const characterColorByAbbr = computed(() => {
  const map = new Map();
  characters.value.forEach((char) => {
    const abbr = String(char?.abbr || '').trim().toLowerCase();
    if (!abbr) return;
    map.set(abbr, char?.color || '#334155');
  });
  return map;
});

const getTagColorByTag = (tagRaw) => {
  const raw = String(tagRaw || '').trim().toLowerCase();
  const matched = raw.match(/^[a-z]+/);
  const abbr = matched ? matched[0] : '';
  return characterColorByAbbr.value.get(abbr) || '#334155';
};

const buildVsIconsFromNames = (vsNames) => {
  return asArray(vsNames)
    .map((name) => {
      const icon = getCharacterAvatarSrc(name);
      if (!icon) return null;
      return { name, icon };
    })
    .filter(Boolean);
};

const parseSeriesOrder = (ev) => {
  const rawSeries = Number(ev?.type_series_id);
  if (Number.isFinite(rawSeries) && rawSeries > 0) return Math.trunc(rawSeries);

  const tag = makeSongTagNumber(ev);
  const matched = String(tag).match(/(\d+)$/);
  if (matched) return Number(matched[1]);
  return Number.MAX_SAFE_INTEGER;
};

const ocBookStatsByUnit = computed(() => {
  const groupMap = Object.fromEntries(OC_UNIT_KEYS.map((unitKey) => [unitKey, new Map()]));
  const orderMap = Object.fromEntries(
    OC_UNIT_KEYS.map((unitKey) => [
      unitKey,
      new Map((charactersByUnit.value[unitKey] || []).map((char, idx) => [char.name, idx]))
    ])
  );

  asArray(props.allEvents).forEach((ev) => {
    if (ev?.isPredict) return;
    if (!Number.isFinite(Number(ev?.id))) return;

    const songId = toFiniteSongId(ev?.song_id);
    if (songId === null) return;
    const song = songsById.value.get(songId);
    const songName = String(song?.title || '').trim();
    if (!songName) return;

    const bannerName = String(ev?.banner || '').trim();
    if (!bannerName) return;
    const unitKey = getUnitByChar(bannerName);
    if (!OC_UNIT_KEYS.includes(unitKey)) return;

    const normalizedName = normalizeCharacterName(bannerName);
    const memberName = normalizedName || bannerName;
    const memberMap = groupMap[unitKey];
    if (!memberMap.has(memberName)) {
      memberMap.set(memberName, {
        name: memberName,
        unit: unitKey,
        avatar: getCharacterAvatarSrc(memberName),
        tint: mixHexWithWhite(getCharacterColor(memberName), SONG_STAT_CARD_TINT_ALPHA),
        songs: []
      });
    }

    const tag = makeSongTagSingle(ev);
    memberMap.get(memberName).songs.push({
      tag,
      tagNumber: makeSongTagNumber(ev),
      tagColor: unitColorMap.value[unitKey] || BASE_UNIT_COLOR_MAP[unitKey] || '#334155',
      songId,
      songName,
      jacketUrl: String(song?.jacketUrl || '').trim(),
      eventId: Number(ev.id),
      seriesOrder: parseSeriesOrder(ev),
      vsIcons: buildVsIconsFromNames(parseVS(ev?.virtual_singer)),
      has2d: hasSong2DMVCategory(song),
      has3d: hasSong3DMVCategory(song)
    });
  });

  return OC_UNIT_OPTIONS.map((unitItem) => {
    const memberMap = groupMap[unitItem.key];
    const memberOrder = orderMap[unitItem.key];
    const members = [...memberMap.values()]
      .map((member) => {
        const songs = [...member.songs].sort((a, b) => {
          if (a.seriesOrder !== b.seriesOrder) return a.seriesOrder - b.seriesOrder;
          if (a.eventId !== b.eventId) return a.eventId - b.eventId;
          return a.songId - b.songId;
        });
        const count3d = songs.filter((song) => song.has3d).length;
        return {
          ...member,
          songs,
          count: songs.length,
          count3d,
          count2d: songs.length - count3d
        };
      })
      .filter((member) => member.count > 0)
      .sort((a, b) => {
        const ai = memberOrder.has(a.name) ? memberOrder.get(a.name) : Number.MAX_SAFE_INTEGER;
        const bi = memberOrder.has(b.name) ? memberOrder.get(b.name) : Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        return a.name.localeCompare(b.name, 'zh-Hans-CN');
      });

    return {
      unit: unitItem.key,
      label: unitItem.label,
      tint: mixHexWithWhite(unitColorMap.value[unitItem.key] || BASE_UNIT_COLOR_MAP[unitItem.key] || '#cbd5e1', 0.18),
      members,
      totalSongs: members.reduce((sum, member) => sum + member.count, 0),
      total3d: members.reduce((sum, member) => sum + member.count3d, 0),
      total2d: members.reduce((sum, member) => sum + member.count2d, 0)
    };
  }).filter((unitGroup) => unitGroup.members.length > 0);
});

const getVsSongImageGroups = (row) => {
  const songs = Array.isArray(row?.songs) ? row.songs : [];
  return VS_UNIT_ORDER.map((unitKey) => {
    const unitSongs = songs.filter((song) => song.unit === unitKey);
    if (!unitSongs.length) return null;
    return {
      unit: unitKey,
      tint: mixHexWithWhite(unitColorMap.value[unitKey] || BASE_UNIT_COLOR_MAP[unitKey] || '#cbd5e1', 0.14),
      songs: unitSongs
    };
  }).filter(Boolean);
};

const virtualSingerSongStats = computed(() => {
  const map = Object.fromEntries(VS_NAMES.value.map((name) => [name, []]));

  (Array.isArray(props.allEvents) ? props.allEvents : []).forEach((ev) => {
    if (ev?.isPredict) return;
    if (!Number.isFinite(Number(ev?.id))) return;
    const songId = toFiniteSongId(ev?.song_id);
    if (songId === null) return;
    const song = songsById.value.get(songId);
    const songTitle = String(song?.title || '').trim();
    if (!songTitle) return;

    const bannerName = String(ev?.banner || '').trim();
    const unitRaw = String(ev?.unit || '').trim().toLowerCase();
    const inferredUnit = bannerName ? getUnitByChar(bannerName) : unitRaw;

    const songItem = {
      tag: makeSongTagSingle(ev),
      textTag: makeSongTagAbbr(ev),
      songId,
      songName: songTitle,
      jacketUrl: String(song?.jacketUrl || '').trim(),
      color: getSongTagColor(ev),
      imageColor: getSongTagImageColor(ev),
      unit: inferredUnit,
      eventId: Number(ev.id),
      has3d: hasSong3DMVCategory(song),
      no2dMv: !hasSong2DMVCategory(song)
    };

    parseVS(ev?.virtual_singer).forEach((vsName) => {
      if (!map[vsName]) return;
      map[vsName].push(songItem);
    });
  });

  return VS_NAMES.value.map((name) => {
    const songsList = [...(map[name] || [])].sort((a, b) => {
      const ua = VS_UNIT_ORDER_MAP[a.unit] || 99;
      const ub = VS_UNIT_ORDER_MAP[b.unit] || 99;
      if (ua !== ub) return ua - ub;
      if (a.eventId !== b.eventId) return a.eventId - b.eventId;
      return a.songId - b.songId;
    });

    const unitCounts = { ln: 0, mmj: 0, vbs: 0, ws: 0, nc: 0 };
    const unit3dCounts = { ln: 0, mmj: 0, vbs: 0, ws: 0, nc: 0 };
    songsList.forEach((songItem) => {
      if (Object.prototype.hasOwnProperty.call(unitCounts, songItem.unit)) {
        unitCounts[songItem.unit] += 1;
        if (songItem.has3d) {
          unit3dCounts[songItem.unit] += 1;
        }
      }
    });
    const unit2dCounts = {
      ln: unitCounts.ln - unit3dCounts.ln,
      mmj: unitCounts.mmj - unit3dCounts.mmj,
      vbs: unitCounts.vbs - unit3dCounts.vbs,
      ws: unitCounts.ws - unit3dCounts.ws,
      nc: unitCounts.nc - unit3dCounts.nc
    };

    return {
      name,
      avatar: getCharacterAvatarSrc(name),
      tint: mixHexWithWhite(getCharacterColor(name), SONG_STAT_CARD_TINT_ALPHA),
      count: songsList.length,
      songs: songsList,
      unitCounts,
      unit3dCounts,
      unit2dCounts
    };
  });
});

const getVsSongCardMode = (name) => vsSongCardModeMap.value[String(name || '')] || 'expanded';

const isOcBookUnitExpanded = (unit) => ocBookUnitExpandedMap.value[String(unit || '')] !== false;

const isVsSongCardCollapsed = (name) => getVsSongCardMode(name) === 'collapsed';

const vsSongGlobalToggleLabel = computed(() => {
  const cards = virtualSingerSongStats.value;
  if (!cards.length) return '展开全部';
  const allCollapsed = cards.every((card) => getVsSongCardMode(card.name) === 'collapsed');
  return allCollapsed ? '展开全部' : '收起全部';
});

const ocBookGlobalToggleLabel = computed(() => {
  const groups = ocBookStatsByUnit.value;
  if (!groups.length) return '收起全部';
  const allCollapsed = groups.every((group) => !isOcBookUnitExpanded(group.unit));
  return allCollapsed ? '展开全部' : '收起全部';
});

const toggleAllVsSongExpandCollapse = () => {
  const cards = virtualSingerSongStats.value;
  if (!cards.length) return;
  const shouldExpandAll = cards.every((card) => getVsSongCardMode(card.name) === 'collapsed');
  const nextMode = shouldExpandAll ? 'expanded' : 'collapsed';
  const next = {};
  cards.forEach((card) => {
    next[card.name] = nextMode;
  });
  vsSongCardModeMap.value = next;
};

const toggleAllOcBookExpandCollapse = () => {
  const groups = ocBookStatsByUnit.value;
  if (!groups.length) return;
  const shouldExpandAll = groups.every((group) => !isOcBookUnitExpanded(group.unit));
  const next = {};
  groups.forEach((group) => {
    next[group.unit] = shouldExpandAll;
  });
  ocBookUnitExpandedMap.value = next;
};

const toggleOcBookUnitExpandCollapse = (unit) => {
  const key = String(unit || '');
  if (!key) return;
  ocBookUnitExpandedMap.value = {
    ...ocBookUnitExpandedMap.value,
    [key]: !isOcBookUnitExpanded(key)
  };
};

const toggleVsSongCardExpandCollapse = (name) => {
  const key = String(name || '');
  if (!key) return;
  const current = getVsSongCardMode(key);
  const nextMode = current === 'collapsed' ? 'expanded' : 'collapsed';
  vsSongCardModeMap.value = {
    ...vsSongCardModeMap.value,
    [key]: nextMode
  };
};

const setVsSongCardRef = (name, el) => {
  if (el && el instanceof HTMLElement) {
    vsSongCardRefMap.set(name, el);
  } else {
    vsSongCardRefMap.delete(name);
  }
};

const setOcBookUnitCardRef = (unit, el) => {
  const key = String(unit || '');
  if (!key) return;
  if (el && el instanceof HTMLElement) {
    ocBookUnitCardRefMap.set(key, el);
  } else {
    ocBookUnitCardRefMap.delete(key);
  }
};

const scheduleRecalcDuoNameCompact = () => {
  if (duoNameRaf) cancelAnimationFrame(duoNameRaf);
  duoNameRaf = requestAnimationFrame(() => {
    duoNameRaf = 0;
    const next = {};
    duoNameRefMap.forEach((el, key) => {
      if (!el || !(el instanceof HTMLElement)) return;
      next[key] = el.scrollWidth > el.clientWidth + 1;
    });
    duoNameCompactMap.value = next;
  });
};

const setDuoNameRef = (key, el) => {
  if (el && el instanceof HTMLElement) {
    duoNameRefMap.set(key, el);
  } else {
    duoNameRefMap.delete(key);
  }
  scheduleRecalcDuoNameCompact();
};

const parseCssPx = (value) => {
  const n = Number.parseFloat(String(value || '').trim());
  return Number.isFinite(n) ? n : NaN;
};

const resolveGridGapPx = (styles) => {
  const columnGap = parseCssPx(styles?.columnGap);
  if (Number.isFinite(columnGap)) return columnGap;
  const gap = parseCssPx(styles?.gap);
  return Number.isFinite(gap) ? gap : 0;
};

const resolveGridMinCardWidthPx = (el, styles) => {
  const raw = String(styles?.getPropertyValue('--song-stat-min-card-width') || '').trim();
  if (!raw) return NaN;

  if (raw.endsWith('%')) {
    const ratio = Number.parseFloat(raw) / 100;
    const width = el.clientWidth || parseCssPx(styles?.width);
    if (Number.isFinite(ratio) && ratio > 0 && Number.isFinite(width) && width > 0) {
      return width * ratio;
    }
  }

  const px = parseCssPx(raw);
  return Number.isFinite(px) ? px : NaN;
};

const getBaseGridColumnCount = (el) => {
  if (!(el instanceof HTMLElement)) return 1;
  const styles = window.getComputedStyle(el);
  const width = el.clientWidth || parseCssPx(styles.width);
  const minCardWidth = resolveGridMinCardWidthPx(el, styles);
  const gap = resolveGridGapPx(styles);
  if (!Number.isFinite(width) || width <= 0) return 1;
  if (!Number.isFinite(minCardWidth) || minCardWidth <= 0) return 1;
  const count = Math.floor((width + gap) / (minCardWidth + gap));
  return Math.max(1, count);
};

const recalcDuoPairGridColumns = () => {
  const next = {};
  duoPairGridRefMap.forEach((el, unit) => {
    next[unit] = getBaseGridColumnCount(el);
  });
  duoPairGridColumnMap.value = next;
};

const scheduleRecalcDuoPairGridColumns = () => {
  if (duoPairGridRaf) cancelAnimationFrame(duoPairGridRaf);
  duoPairGridRaf = requestAnimationFrame(() => {
    duoPairGridRaf = 0;
    recalcDuoPairGridColumns();
  });
};

const setDuoPairGridRef = (unit, el) => {
  const key = String(unit || '');
  const prevEl = duoPairGridRefMap.get(key);
  if (duoPairGridResizeObserver && prevEl && prevEl !== el) {
    duoPairGridResizeObserver.unobserve(prevEl);
  }

  if (el && el instanceof HTMLElement) {
    duoPairGridRefMap.set(key, el);
    if (duoPairGridResizeObserver) duoPairGridResizeObserver.observe(el);
  } else {
    duoPairGridRefMap.delete(key);
  }

  scheduleRecalcDuoPairGridColumns();
};

const setAnvoCardRef = (name, el) => {
  if (el && el instanceof HTMLElement) {
    anvoCardRefMap.set(name, el);
  } else {
    anvoCardRefMap.delete(name);
  }
};

const isDuoNameCompact = (key) => duoNameCompactMap.value[key] === true;

const getKnownCharacters = (rawList) => {
  const uniq = new Map();
  (Array.isArray(rawList) ? rawList : []).forEach((rawName) => {
    const normalized = normalizeCharacterName(rawName);
    if (!normalized) return;
    const meta = characterByName.value.get(normalized);
    if (!meta) return;
    uniq.set(meta.name, meta);
  });
  return Array.from(uniq.values());
};

const isOcUniqueSongForUnit = (song, unitKey) => {
  if (!song.tagKeys.includes(unitKey)) return false;
  return !OC_UNIT_OPTIONS.some((item) => item.key !== unitKey && song.tagKeys.includes(item.key));
};

const ocUniqueStats = computed(() => {
  return OC_UNIT_OPTIONS.map((item) => {
    const totalSongs = songsForStats.value.filter((song) => song.tagKeys.includes(item.key));
    const uniqueSongs = songsForStats.value.filter((song) => isOcUniqueSongForUnit(song, item.key));
    const with2dCount = uniqueSongs.filter((song) => song.categoryKeys.includes('2dmv')).length;
    const with3dCount = uniqueSongs.filter((song) => song.categoryKeys.includes('3dmv')).length;

    return {
      unit: item.key,
      totalCount: totalSongs.length,
      uniqueCount: uniqueSongs.length,
      with2dCount,
      with3dCount
    };
  });
});

const anotherVocalCards = computed(() => {
  const rowMap = new Map();

  songsForStats.value.forEach((song) => {
    song.vocals.forEach((vocal) => {
      if (normalizeCategoryKey(vocal?.type) !== 'another_vocal') return;
      const vocalId = normalizeSongId(vocal?.vocal_id);

      getKnownCharacters(vocal?.characters).forEach((charMeta) => {
        if (!rowMap.has(charMeta.name)) {
          rowMap.set(charMeta.name, { meta: charMeta, songs: new Map() });
        }

        const row = rowMap.get(charMeta.name);
        const songKey = `${song.id}-${song.title}`;
        const prev = row.songs.get(songKey);
        if (!prev || vocalId < prev.vocalId) {
          row.songs.set(songKey, {
            id: song.id,
            title: song.title || '-',
            jacketUrl: String(song.jacketUrl || '').trim(),
            vocalId,
            isDeletedSong: song.isDeletedSong
          });
        }
      });
    });
  });

  return Array.from(rowMap.values())
    .map((row) => {
      const songsList = Array.from(row.songs.values()).sort((a, b) => {
        if (a.vocalId !== b.vocalId) return a.vocalId - b.vocalId;
        return normalizeSongId(a.id) - normalizeSongId(b.id);
      });
      return {
        name: row.meta.name,
        unit: row.meta.unit,
        order: row.meta.order,
        avatar: getCharacterAvatarSrc(row.meta.name),
        tint: hexToRgba(row.meta.color, SONG_STAT_CARD_TINT_ALPHA),
        count: songsList.length,
        songs: songsList
      };
    })
    .sort((a, b) => {
      const aOrder = getAnotherCharacterSortOrder(a);
      const bOrder = getAnotherCharacterSortOrder(b);
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name, 'zh-Hans-CN');
    });
});

const getAnotherCardMode = (name) => anotherCardModeMap.value[name] || 'fixed';

const isAnotherCardCollapsed = (name) => getAnotherCardMode(name) === 'collapsed';

const anotherGlobalToggleLabel = computed(() => {
  const cards = anotherVocalCards.value;
  if (cards.length === 0) return '展开全部';
  const allCollapsedOrFixed = cards.every((card) => {
    const mode = getAnotherCardMode(card.name);
    return mode === 'collapsed' || mode === 'fixed';
  });
  return allCollapsedOrFixed ? '展开全部' : '收起全部';
});

const anotherAllFixed = computed(() => {
  const cards = anotherVocalCards.value;
  if (cards.length === 0) return false;
  return cards.every((card) => getAnotherCardMode(card.name) === 'fixed');
});

const toggleAllAnotherExpandCollapse = () => {
  const cards = anotherVocalCards.value;
  if (cards.length === 0) return;
  const shouldExpandAll = cards.every((card) => {
    const mode = getAnotherCardMode(card.name);
    return mode === 'collapsed' || mode === 'fixed';
  });
  const nextMode = shouldExpandAll ? 'expanded' : 'collapsed';
  const next = {};
  cards.forEach((card) => {
    next[card.name] = nextMode;
  });
  anotherCardModeMap.value = next;
};

const setAllAnotherFixedMode = () => {
  const cards = anotherVocalCards.value;
  if (cards.length === 0) return;
  const next = {};
  cards.forEach((card) => {
    next[card.name] = 'fixed';
  });
  anotherCardModeMap.value = next;
};

const toggleAnotherCardExpandCollapse = (name) => {
  const current = getAnotherCardMode(name);
  const nextMode = current === 'collapsed' ? 'expanded' : (current === 'fixed' ? 'expanded' : 'collapsed');
  anotherCardModeMap.value = {
    ...anotherCardModeMap.value,
    [name]: nextMode
  };
};

const getAnotherCardStyle = (row) => {
  return {
    backgroundColor: row?.tint || '#ffffff'
  };
};

const sameUnitPairUnitCardsRaw = computed(() => {
  return OC_UNIT_OPTIONS.map((unitOption) => {
    const unitKey = unitOption.key;
    const pairs = [];
    const members = (charactersByUnit.value[unitKey] || []).slice().sort((a, b) => a.order - b.order);

    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        const memberA = members[i];
        const memberB = members[j];
        const pairNames = [memberA.name, memberB.name].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
        const songMap = new Map();

        songsForStats.value.forEach((song) => {
          const hasPair = song.vocals.some((vocal) => {
            if (normalizeCategoryKey(vocal?.type) !== 'sekai') return false;

            const ocChars = getKnownCharacters(vocal?.characters).filter((char) => OC_UNIT_KEYS.includes(char.unit));
            const uniqOcChars = Array.from(new Map(ocChars.map((char) => [char.name, char])).values());
            if (uniqOcChars.length !== 2) return false;
            if (!uniqOcChars.every((char) => char.unit === unitKey)) return false;

            const names = uniqOcChars.map((char) => char.name).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
            return names[0] === pairNames[0] && names[1] === pairNames[1];
          });

          if (!hasPair) return;
          songMap.set(`${song.id}-${song.title}`, {
            id: song.id,
            title: song.title || '-',
            jacketUrl: song.jacketUrl || ''
          });
        });

        if (songMap.size === 0) continue;

        pairs.push({
          key: `${unitKey}-${memberA.name}-${memberB.name}`,
          memberA,
          memberB,
          count: songMap.size,
          songs: Array.from(songMap.values()).sort((a, b) => normalizeSongId(a.id) - normalizeSongId(b.id)),
          gradientBg: `linear-gradient(90deg, ${hexToRgba(getCharacterColor(memberA.name), 0.26)} 0%, ${hexToRgba(getCharacterColor(memberB.name), 0.26)} 100%)`
        });
      }
    }

    pairs.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const aFirst = Math.min(a.memberA.order, a.memberB.order);
      const bFirst = Math.min(b.memberA.order, b.memberB.order);
      if (aFirst !== bFirst) return aFirst - bFirst;
      const aSecond = Math.max(a.memberA.order, a.memberB.order);
      const bSecond = Math.max(b.memberA.order, b.memberB.order);
      return aSecond - bSecond;
    });

    return {
      unit: unitKey,
      tint: hexToRgba(unitColorMap.value[unitKey] || '#94a3b8', 0.14),
      pairs
    };
  });
});

const sameUnitPairUnitCards = computed(() => {
  return sameUnitPairUnitCardsRaw.value
    .filter((unitCard) => unitCard.pairs.length > 0)
    .map((unitCard) => {
      const unit = unitCard.unit;
      const gridColumns = duoPairGridColumnMap.value[unit] || 0;
      return {
        ...unitCard,
        anchorId: `panel-duo-unit-${unit}`,
        isWsSplit: unit === 'ws' && unitCard.pairs.length === 6 && gridColumns >= 4
      };
    });
});

const isDuoCardExpanded = (key) => duoCardExpandedMap.value[key] !== false;

const duoGlobalToggleLabel = computed(() => {
  const keys = sameUnitPairUnitCards.value.flatMap((unitCard) => unitCard.pairs.map((pair) => pair.key));
  if (keys.length === 0) return '展开全部';
  const allCollapsed = keys.every((key) => !isDuoCardExpanded(key));
  return allCollapsed ? '展开全部' : '收起全部';
});

const toggleAllDuoExpandCollapse = () => {
  const keys = sameUnitPairUnitCards.value.flatMap((unitCard) => unitCard.pairs.map((pair) => pair.key));
  if (keys.length === 0) return;
  const shouldExpandAll = keys.every((key) => !isDuoCardExpanded(key));
  const next = {};
  keys.forEach((key) => {
    next[key] = shouldExpandAll;
  });
  duoCardExpandedMap.value = next;
};

const toggleDuoCardExpandCollapse = (key) => {
  duoCardExpandedMap.value = {
    ...duoCardExpandedMap.value,
    [key]: !isDuoCardExpanded(key)
  };
};

const filteredSongs = computed(() => {
  const key = keyword.value.toLowerCase().trim();
  const isIdSearch = key.startsWith('#');
  const idQuery = isIdSearch ? key.slice(1).trim() : '';
  const mv = mvFilter.value;
  const group = groupFilter.value;
  const sortKey = difficultySortKey.value;
  const sortOrder = difficultySortOrder.value === 'asc' ? 'asc' : 'desc';

  const filtered = songs.value.filter((song) => {
    let textHit = false;
    if (!key) {
      textHit = true;
    } else if (isIdSearch) {
      textHit = idQuery ? String(song.id).toLowerCase().includes(idQuery) : true;
    } else {
      textHit = song.title.toLowerCase().includes(key)
        || song.composer.toLowerCase().includes(key)
        || song.lyricist.toLowerCase().includes(key)
        || song.arranger.toLowerCase().includes(key);
    }
    if (!textHit) return false;

    if (mv === '3d' && !song.categoryKeys.includes('3dmv')) return false;
    if (mv === '2d' && !song.categoryKeys.includes('2dmv') && !song.categoryKeys.includes('vs_2dmv')) return false;
    if (mv === 'vs2d' && !song.categoryKeys.includes('vs_2dmv')) return false;
    if (mv === 'original' && !song.categoryKeys.includes('original')) return false;

    if (group !== 'all' && !song.groupKeys.includes(group)) return false;
    return true;
  });

  if (sortKey === 'none') return filtered;

  return [...filtered].sort((a, b) => {
    const rawA = a?.difficulties?.[sortKey];
    const rawB = b?.difficulties?.[sortKey];
    const diffA = rawA === null || rawA === undefined || rawA === '' ? null : Number(rawA);
    const diffB = rawB === null || rawB === undefined || rawB === '' ? null : Number(rawB);
    const hasA = Number.isFinite(diffA);
    const hasB = Number.isFinite(diffB);

    if (!hasA && !hasB) {
      return normalizeSongId(a.id) - normalizeSongId(b.id);
    }
    if (!hasA) return 1;
    if (!hasB) return -1;

    if (diffA !== diffB) {
      return sortOrder === 'asc' ? diffA - diffB : diffB - diffA;
    }

    return normalizeSongId(a.id) - normalizeSongId(b.id);
  });
});

const getSongDifficultyText = (song, key) => {
  const raw = song?.difficulties?.[key];
  if (raw === null || raw === undefined || raw === '') return '-';
  const n = Number(raw);
  return Number.isFinite(n) ? String(n) : String(raw);
};

const isSongDifficultyMissing = (song, key) => {
  const raw = song?.difficulties?.[key];
  return raw === null || raw === undefined || raw === '';
};

const totalSongPages = computed(() => {
  return Math.max(1, Math.ceil(filteredSongs.value.length / songPageSize.value));
});

const pagedSongs = computed(() => {
  const page = Math.min(Math.max(1, currentSongPage.value), totalSongPages.value);
  const start = (page - 1) * songPageSize.value;
  return filteredSongs.value.slice(start, start + songPageSize.value);
});

const emptyPagedRowCount = computed(() => {
  if (filteredSongs.value.length === 0) return 0;
  return Math.max(0, songPageSize.value - pagedSongs.value.length);
});

const changeSongPage = (delta) => {
  const next = currentSongPage.value + delta;
  if (next < 1 || next > totalSongPages.value) return;
  currentSongPage.value = next;
};

const onSongJacketError = (event) => {
  const img = event?.target;
  if (!(img instanceof HTMLImageElement)) return;
  if (img.dataset.failed === '1') return;
  img.dataset.failed = '1';
  img.style.display = 'none';
  const holder = img.closest('.song-jacket-media');
  if (holder instanceof HTMLElement) {
    holder.classList.add('is-failed');
  }
};

const waitNextPaint = () => new Promise((resolve) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(resolve);
  });
});

const sanitizeExportFileName = (name) => {
  const raw = String(name || '').trim();
  const cleaned = raw
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[.\s]+$/g, '')
    .trim();
  return cleaned || 'song-stats';
};

const formatExportTimestamp = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

const triggerDownloadPng = async (canvas, fileName) => {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('无法生成 PNG 文件');
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

const exportElementPng = async (targetEl, title) => {
  const width = Math.ceil(targetEl.scrollWidth || targetEl.clientWidth || 0);
  const height = Math.ceil(targetEl.scrollHeight || targetEl.clientHeight || 0);
  const canvas = await html2canvas(targetEl, {
    backgroundColor: '#ffffff',
    scale: Math.max(2, window.devicePixelRatio || 1),
    useCORS: true,
    logging: false,
    width,
    height
  });
  const safeTitle = sanitizeExportFileName(`song_${title}_${formatExportTimestamp()}`);
  await triggerDownloadPng(canvas, safeTitle);
};

const snapshotAnotherCardModes = () => ({ ...anotherCardModeMap.value });
const snapshotDuoExpandedMap = () => ({ ...duoCardExpandedMap.value });
const snapshotVsSongCardModes = () => ({ ...vsSongCardModeMap.value });
const snapshotOcBookExpandedMap = () => ({ ...ocBookUnitExpandedMap.value });

const expandAnotherCardsForExport = (targetName = '') => {
  const next = { ...anotherCardModeMap.value };
  anotherVocalCards.value.forEach((card) => {
    if (!targetName || card.name === targetName) {
      next[card.name] = 'expanded';
    }
  });
  anotherCardModeMap.value = next;
};

const expandAllDuoCardsForExport = () => {
  const next = { ...duoCardExpandedMap.value };
  sameUnitPairUnitCards.value.forEach((unitCard) => {
    unitCard.pairs.forEach((pair) => {
      next[pair.key] = true;
    });
  });
  duoCardExpandedMap.value = next;
};

const expandVsSongCardsForExport = (targetName = '') => {
  const next = { ...vsSongCardModeMap.value };
  virtualSingerSongStats.value.forEach((card) => {
    if (!targetName || card.name === targetName) {
      next[card.name] = 'expanded';
    }
  });
  vsSongCardModeMap.value = next;
};

const expandOcBookUnitsForExport = (targetUnit = '') => {
  const next = { ...ocBookUnitExpandedMap.value };
  ocBookStatsByUnit.value.forEach((group) => {
    if (!targetUnit || group.unit === targetUnit) {
      next[group.unit] = true;
    }
  });
  ocBookUnitExpandedMap.value = next;
};

const exportSongPanelPng = async (panelId, title) => {
  if (isExportingPng.value) return;
  const targetEl = document.getElementById(panelId);
  if (!targetEl) {
    alert('未找到可导出的区域。');
    return;
  }

  const prevAnotherModes = snapshotAnotherCardModes();
  const prevDuoExpanded = snapshotDuoExpandedMap();
  const prevVsSongModes = snapshotVsSongCardModes();
  const prevOcBookExpanded = snapshotOcBookExpandedMap();
  isExportingPng.value = true;

  try {
    if (panelId === 'panel-another-vocal') {
      expandAnotherCardsForExport();
    } else if (panelId === 'panel-vs-song-stats') {
      expandVsSongCardsForExport();
    } else if (panelId === 'panel-oc-book-stats') {
      expandOcBookUnitsForExport();
    } else if (panelId === 'panel-duo-stats') {
      expandAllDuoCardsForExport();
    }

    await nextTick();
    await waitNextPaint();
    await exportElementPng(targetEl, title);
  } catch (error) {
    console.error('导出乐曲统计 PNG 失败', error);
    alert('导出 PNG 失败，请稍后重试。');
  } finally {
    anotherCardModeMap.value = prevAnotherModes;
    duoCardExpandedMap.value = prevDuoExpanded;
    vsSongCardModeMap.value = prevVsSongModes;
    ocBookUnitExpandedMap.value = prevOcBookExpanded;
    await nextTick();
    isExportingPng.value = false;
  }
};

const exportVirtualSingerCardPng = async (row) => {
  if (isExportingPng.value) return;
  const targetEl = vsSongCardRefMap.get(row?.name);
  if (!targetEl) {
    alert('未找到可导出的角色卡片。');
    return;
  }

  const prevVsSongModes = snapshotVsSongCardModes();
  isExportingPng.value = true;
  try {
    expandVsSongCardsForExport(row?.name || '');
    await nextTick();
    await waitNextPaint();
    await exportElementPng(targetEl, `虚拟歌手参与书下_${row?.name || '角色'}`);
  } catch (error) {
    console.error('导出虚拟歌手参与歌曲 PNG 失败', error);
    alert('导出 PNG 失败，请稍后重试。');
  } finally {
    vsSongCardModeMap.value = prevVsSongModes;
    await nextTick();
    isExportingPng.value = false;
  }
};

const exportAnotherCardPng = async (row) => {
  if (isExportingPng.value) return;
  const targetEl = anvoCardRefMap.get(row?.name);
  if (!targetEl) {
    alert('未找到可导出的角色卡片。');
    return;
  }

  const prevAnotherModes = snapshotAnotherCardModes();
  isExportingPng.value = true;
  try {
    expandAnotherCardsForExport(row?.name || '');
    await nextTick();
    await waitNextPaint();
    await exportElementPng(targetEl, `Anvo_${row?.name || '角色'}`);
  } catch (error) {
    console.error('导出 Anvo 角色 PNG 失败', error);
    alert('导出 PNG 失败，请稍后重试。');
  } finally {
    anotherCardModeMap.value = prevAnotherModes;
    await nextTick();
    isExportingPng.value = false;
  }
};

const exportOcBookUnitCardPng = async (unitGroup) => {
  if (isExportingPng.value) return;
  const unitKey = String(unitGroup?.unit || '');
  const targetEl = ocBookUnitCardRefMap.get(unitKey);
  if (!targetEl) {
    alert('未找到可导出的团体卡片。');
    return;
  }

  const prevOcBookExpanded = snapshotOcBookExpandedMap();
  isExportingPng.value = true;
  try {
    expandOcBookUnitsForExport(unitKey);
    await nextTick();
    await waitNextPaint();
    await exportElementPng(targetEl, `OC书下_${unitGroup?.label || unitKey || '团体'}`);
  } catch (error) {
    console.error('导出 OC 书下团体 PNG 失败', error);
    alert('导出 PNG 失败，请稍后重试。');
  } finally {
    ocBookUnitExpandedMap.value = prevOcBookExpanded;
    await nextTick();
    isExportingPng.value = false;
  }
};

watch(vsSongImageMode, (enabled) => {
  if (!enabled) return;
  expandVsSongCardsForExport();
});

watch(ocBookImageMode, (enabled) => {
  if (!enabled) return;
  expandOcBookUnitsForExport();
});

watch(anotherVocalCards, (cards) => {
  const next = {};
  cards.forEach((card) => {
    next[card.name] = anotherCardModeMap.value[card.name] || 'fixed';
  });
  anotherCardModeMap.value = next;
}, { immediate: true });

watch(sameUnitPairUnitCards, (unitCards) => {
  const next = {};
  unitCards.forEach((unitCard) => {
    unitCard.pairs.forEach((pair) => {
      next[pair.key] = duoCardExpandedMap.value[pair.key] !== false;
    });
  });
  duoCardExpandedMap.value = next;
  nextTick(() => {
    scheduleRecalcDuoPairGridColumns();
    scheduleRecalcDuoNameCompact();
  });
}, { immediate: true });

watch([keyword, mvFilter, groupFilter, difficultySortKey, difficultySortOrder], () => {
  currentSongPage.value = 1;
});

watch(songPageSize, () => {
  currentSongPage.value = 1;
});

watch([songPageSize, filteredSongs], async () => {
  await nextTick();
  recalcSongTableOverflow();
}, { deep: false });

watch(virtualSingerSongStats, (cards) => {
  const next = {};
  cards.forEach((card) => {
    next[card.name] = vsSongCardModeMap.value[card.name] || 'expanded';
  });
  vsSongCardModeMap.value = next;
}, { immediate: true });

watch(ocBookStatsByUnit, (groups) => {
  const next = {};
  groups.forEach((group) => {
    next[group.unit] = ocBookUnitExpandedMap.value[group.unit] !== false;
  });
  ocBookUnitExpandedMap.value = next;
}, { immediate: true });

watch(navCollapsed, () => {
  nextTick(() => {
    scheduleRecalcDuoPairGridColumns();
    scheduleRecalcDuoNameCompact();
  });
});

watch(totalSongPages, (nextTotal) => {
  if (currentSongPage.value > nextTotal) {
    currentSongPage.value = nextTotal;
  }
});
</script>

<style scoped>
.pjsk-song-stats {
  padding: 24px;
  color: #1f2937;
  background: linear-gradient(45deg, rgba(253, 124, 193, 0.3) 0%, rgba(135, 192, 255, 0.3) 50%, rgba(248, 255, 135, 0.3) 100%);
  min-height: 100vh;
  --stats-radius-panel: 18px;
  --stats-radius-btn: 12px;
  --stats-nav-width: 220px;
  --stats-nav-left: 44px;
  --stats-nav-top: 78px;
  --song-btn-pad-x: 8px;
  --song-mini-toggle-size: 20px;
  --song-stat-min-card-width: 250px;
  --song-event-mv-col-width: 22px;
  --song-event-mv-chip-width: 26px;
  --song-event-mv-chip-height: 14px;
  --song-event-mv-chip-font-size: 0.52rem;
  --song-event-mv-chip-pad-x: 4px;
  --song-vs-text-tag-width: 3.4em;
  --song-jacket-default-size: 64px;
  --song-jacket-track-size: 68px;
  --song-oc-tag-vs-gap: 4px;
  --song-oc-vs-col-width: 14px;
}

.pjsk-song-stats button:not(:disabled) {
  transition: filter 0.16s ease, transform 0.16s ease, background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.pjsk-song-stats button:not(:disabled):active {
  filter: brightness(0.86);
  transform: translateY(1px) scale(0.97);
}

.stats-layout {
  display: grid;
  grid-template-columns: var(--stats-nav-width) 1fr;
  gap: 16px;
}

.stats-layout.nav-collapsed {
  grid-template-columns: 1fr;
}

.stats-layout.nav-collapsed .stats-nav {
  display: none;
}

.stats-layout:not(.nav-collapsed) .stats-main {
  grid-column: 2;
}

.stats-nav {
  position: fixed;
  top: var(--stats-nav-top);
  left: var(--stats-nav-left);
  width: var(--stats-nav-width);
  height: calc(100vh - var(--stats-nav-top) - 10px);
  max-height: calc(100vh - var(--stats-nav-top) - 10px);
  min-height: 0;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 10;
}

.nav-quick-wrap {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: var(--stats-radius-panel);
  background: #ffffff;
  padding: 8px 6px 6px;
}

.nav-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  padding-bottom: 4px;
  padding-right: 2px;
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 8px;
}

.nav-group:last-child {
  margin-bottom: 0;
}

.nav-link {
  width: 100%;
  text-align: left;
  min-height: 32px;
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  font-size: 0.82rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-link-main {
  font-weight: 700;
  border-color: #d1d5db;
}

.nav-sub-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-link-sub {
  padding: 5px 12px 5px 24px;
  font-size: 0.78rem;
}

.nav-link-sub.is-duo-subanchor {
  padding-left: 34px;
  font-size: 0.74rem;
  color: #64748b;
}

.nav-link:hover {
  background: #e5e7eb;
}

.nav-link.active {
  background: #dbeafe;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.nav-collapse-fab {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  min-height: 32px;
  height: 32px;
  padding: 0;
  border: 2px solid #b91c1c;
  border-radius: 999px;
  background: #ef4444;
  cursor: pointer;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

.nav-collapse-fab-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  display: block;
  filter: brightness(0) saturate(100%) invert(100%);
}

.floating-menu-btn {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 54px);
  left: 8px;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 2px solid #0f766e;
  background: #33ccbb;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.2);
  color: #f8fafc;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 4300;
  padding: 0;
  cursor: pointer;
}

.floating-menu-icon {
  width: 17px;
  height: 17px;
  object-fit: contain;
  display: block;
  filter: brightness(0) saturate(100%) invert(96%) sepia(6%) saturate(243%) hue-rotate(182deg) brightness(103%) contrast(96%);
}

.stats-main {
  min-width: 0;
}

.stats-main-head {
  margin-bottom: 6px;
}

.stats-main-head h1,
.section-head h2,
.stats-section h2 {
  margin: 0;
  font-weight: 700;
  color: #0f172a;
}

.section-head,
.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.section-head-sub h2 {
  font-size: 1rem;
}

.section-head-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.section-head-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.card-export-btn {
  border: 1px solid #cbd5e1;
  border-radius: var(--stats-radius-btn);
  background: #f8fafc;
  color: #334155;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 8px;
  line-height: 1;
  cursor: pointer;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.card-export-btn:hover:not(:disabled) {
  background: #e2e8f0;
}

.card-export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.song-deleted-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.74rem;
  color: #475569;
  user-select: none;
}

.song-duo-image-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.74rem;
  color: #475569;
  user-select: none;
}

.song-deleted-toggle input {
  margin: 0;
}

.song-duo-image-toggle input {
  margin: 0;
}

.pjsk-song-stats.is-exporting .song-export-btn,
.pjsk-song-stats.is-exporting .song-role-card-tools,
.pjsk-song-stats.is-exporting .song-oc-event-unit-tools,
.pjsk-song-stats.is-exporting .anvo-mode-switch{
  display: none !important;
}

.pjsk-song-stats.is-exporting #panel-duo-stats .song-mini-icon-btn {
  display: none !important;
}

.card-panel {
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: var(--stats-radius-panel);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
  padding: 12px;
}

.section-main {
  margin-bottom: 14px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.song-insight-scroll {
  overflow: auto;
}

.song-insight-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 520px;
}

.song-insight-table th,
.song-insight-table td {
  border-bottom: 1px solid #e5e7eb;
  padding: 7px 9px;
  font-size: 0.8rem;
  vertical-align: middle;
}

.song-insight-table thead th {
  background: #f8fafc;
  color: #475569;
}

.song-oc-scroll {
  overflow: visible;
}

.song-oc-table {
  min-width: 0;
  table-layout: fixed;
}

.song-oc-table th,
.song-oc-table td {
  text-align: center;
  height: 44px;
}

.song-oc-unit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.song-oc-unit-logo {
  height: 24px;
  width: auto;
  max-width: 150px;
  object-fit: contain;
}

.anvo-mode-switch {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  gap: 6px;
}

.anvo-mode-btn {
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #ffffff;
  color: #334155;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 8px;
  line-height: 1;
  cursor: pointer;
  flex: 0 0 auto;
}

.anvo-mode-btn:hover {
  background: #e2e8f0;
}

.anvo-mode-btn.active {
  border-color: #93c5fd;
  background: #dbeafe;
  color: #1d4ed8;
}

.song-role-card-grid {
  display: grid;
  gap: 10px;
}

.song-stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--song-stat-min-card-width)), 1fr));
  gap: 10px;
}

.song-vs-event-avatar {
  width: 30px;
  height: 30px;
  flex-basis: 30px;
}

.song-vs-event-unit-counts {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 7px;
}

.song-vs-event-unit-stack {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.song-vs-event-unit-chip {
  font-size: 0.72rem;
  font-weight: 700;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  padding: 2px 6px 2px 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
  white-space: nowrap;
}

.song-vs-event-unit-logo {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.song-vs-event-unit-count {
  color: #111827;
}

.song-vs-event-unit-mv-chips {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.song-vs-event-unit-mv-chip {
  min-height: 16px;
  border-radius: 999px;
  border: 1px solid rgba(51, 65, 85, 0.24);
  padding: 0 6px;
  color: #0f172a;
  font-size: 0.58rem;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
  white-space: nowrap;
}

.song-vs-event-unit-mv-chip.is-compact {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.song-vs-event-unit-mv-num {
  font-variant-numeric: tabular-nums;
}

.song-vs-event-unit-mv-num-3d {
  color: #dc2626;
  font-weight: 800;
}

.song-vs-event-unit-mv-sep {
  color: #475569;
}

.song-vs-event-image-name {
  color: #111827;
  font-size: 0.82rem;
  font-weight: 800;
  line-height: 1.2;
}

.song-stat-list-vs-event li {
  white-space: normal;
}

.song-vs-event-text-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) var(--song-event-mv-col-width);
  align-items: center;
  gap: 4px;
}

.song-event-mv-col {
  width: var(--song-event-mv-col-width);
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  align-self: center;
}

.song-event-mv-empty {
  display: inline-block;
  width: var(--song-event-mv-chip-width);
  height: var(--song-event-mv-chip-height);
}

.song-event-mv-chip {
  font-size: var(--song-event-mv-chip-font-size);
  font-weight: 200;
  min-height: var(--song-event-mv-chip-height);
  height: var(--song-event-mv-chip-height);
  min-width: var(--song-event-mv-chip-width);
  width: var(--song-event-mv-chip-width);
  padding: 0 var(--song-event-mv-chip-pad-x);
  line-height: 1;
}

.song-vs-event-unit-counts:not(.song-vs-event-unit-counts-image) .song-vs-event-unit-mv-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 16px;
  box-sizing: border-box;
}

.song-vs-event-tag,
.song-oc-event-tag {
  font-size: 0.72rem;
  font-weight: 700;
}

.song-vs-event-tag {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  width: var(--song-vs-text-tag-width);
  min-width: var(--song-vs-text-tag-width);
  text-align: left;
  font-variant-numeric: tabular-nums;
}

.song-vs-event-title,
.song-oc-event-song-title {
  font-size: 0.75rem;
  color: #111827;
  min-width: 0;
  flex: 1 1 auto;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
  line-height: 1.35;
}

.song-vs-event-title.is-no-2dmv {
  color: #dc2626;
  font-weight: 700;
}

.song-oc-event-song-title.is-no-2dmv {
  color: #dc2626;
  font-weight: 700;
}

.song-role-card,
.song-stat-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 9px;
  background: #ffffff;
  min-width: 0;
}

.song-role-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 7px;
}

.song-role-main,
.song-stat-main {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.song-role-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid #cbd5e1;
  object-fit: cover;
  flex: 0 0 30px;
}

.song-role-unit-logo {
  width: 18px;
  height: 18px;
  object-fit: contain;
  flex: 0 0 18px;
}

.song-role-card-tools {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.song-mini-btn {
  min-height: 24px;
  padding: 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #ffffff;
  color: #334155;
  font-size: 0.68rem;
  font-weight: 700;
  cursor: pointer;
}

.song-mini-btn.active {
  border-color: #93c5fd;
  background: #dbeafe;
  color: #1d4ed8;
}

.song-mini-icon-btn {
  width: var(--song-mini-toggle-size);
  height: var(--song-mini-toggle-size);
  min-height: var(--song-mini-toggle-size);
  padding: 0;
  border-radius: 999px;
  border: 1px solid #94a3b8;
  background: rgba(226, 232, 240, 0.88);
  color: #334155;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  line-height: 1;
  flex: 0 0 var(--song-mini-toggle-size);
}

.song-mini-icon-btn span {
  font-size: 0.85rem;
  font-weight: 700;
}

.song-mini-icon-btn-img {
  width: 12px;
  height: 12px;
  object-fit: contain;
  display: block;
}

.song-role-text {
  min-width: 0;
}

.song-duo-card .song-role-text {
  container-type: inline-size;
}

.song-duo-name .duo-name-short {
  display: inline;
}

.song-duo-name {
  position: relative;
  display: block;
  white-space: nowrap;
}

.duo-name-probe {
  position: absolute;
  inset: 0;
  visibility: hidden;
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-role-name {
  color: #111827;
  font-weight: 700;
  font-size: 0.82rem;
  line-height: 1.2;
}

.song-role-count {
  font-size: 0.74rem;
  color: #6b7280;
  line-height: 1.2;
  white-space: nowrap;
}

.song-role-list,
.song-stat-list {
  margin: 0;
  padding-left: 0;
  list-style: none;
}

.song-role-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.75rem;
  line-height: 1.32;
  padding: 1px 0;
}

.song-role-list li.is-deleted-song .song-role-song-id,
.song-role-list li.is-deleted-song .song-role-song-title {
  color: #dc2626;
  font-weight: 700;
}

.song-role-list.is-fixed {
  max-height: 172px;
  overflow-y: auto;
}

.song-role-list.is-expanded {
  max-height: none;
  overflow: visible;
}

.song-role-song-id {
  flex: 0 0 auto;
  min-width: 36px;
  font-family: Consolas, 'Courier New', monospace;
  color: #2563eb;
}

.song-role-song-title {
  color: #111827;
  word-break: break-word;
}

.song-duo-unit-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.song-duo-unit-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 9px;
}

.song-duo-pair-grid {
  gap: 10px;
}

.song-vs-event-card.is-image-mode,
.song-anvo-card.is-image-mode {
  grid-column: 1 / -1;
}

.song-vs-event-card.is-image-mode,
.song-anvo-card.is-image-mode,
.song-duo-card.is-image-mode {
  padding: 7px;
}

.song-duo-image-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px;
  align-items: start;
}

.song-vs-event-image-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;
  align-items: start;
}

.song-anvo-image-layout {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
  align-items: start;
}

.song-vs-event-image-head {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  min-width: 0;
  padding-top: 0;
}

.song-vs-event-image-head-main {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1 1 auto;
}

.song-vs-event-image-head .song-role-card-tools {
  margin-left: auto;
  align-self: flex-start;
  flex: 0 0 auto;
}

.song-anvo-image-head {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  min-width: 68px;
  padding-top: 2px;
}

.song-vs-event-image-head-stats {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
}

.song-vs-event-image-total {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
}

.song-vs-event-unit-counts-image {
  margin-left: 0;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  justify-content: stretch;
  align-items: center;
  gap: 4px;
  width: auto;
  grid-column: auto;
  flex: 1 1 auto;
  min-width: 0;
}

.song-vs-event-unit-counts-image .song-vs-event-unit-stack {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.song-vs-event-unit-counts-image .song-vs-event-unit-chip {
  width: auto;
  min-width: 56px;
  flex: 0 0 auto;
  justify-content: center;
  padding: 1px 6px 1px 3px;
}

.song-vs-event-unit-counts-image .song-vs-event-unit-mv-chips {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex: 0 0 auto;
}

.song-vs-event-unit-counts-image .song-vs-event-unit-mv-chip {
  min-width: 56px;
  width: auto;
}

.song-vs-event-card.is-image-mode .song-vs-event-unit-counts-image .song-vs-event-unit-chip {
  font-size: 0.8rem;
  min-height: 24px;
}

.song-vs-event-card.is-image-mode .song-vs-event-unit-counts-image .song-vs-event-unit-logo {
  width: 18px;
  height: 18px;
}

.song-vs-event-card.is-image-mode .song-vs-event-unit-counts-image .song-vs-event-unit-mv-chip {
  min-height: 20px;
  font-size: 0.72rem;
  line-height: 20px;
}

.song-vs-event-image-groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 4px;
}

.song-vs-event-image-group {
  border: 1px solid #dbeafe;
  border-radius: 8px;
  padding: 6px;
  display: block;
}

.song-image-identity {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  min-width: 62px;
  padding-top: 2px;
}

.song-image-main-avatar {
  width: 30px;
  height: 30px;
  min-width: 30px;
  min-height: 30px;
  flex: 0 0 30px;
}

.song-image-name {
  color: #111827;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.15;
  text-align: center;
}

.song-image-count {
  color: #475569;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.1;
  text-align: center;
  white-space: nowrap;
}

.song-duo-image-identity {
  min-width: 56px;
}

.song-duo-image-avatars {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.song-duo-image-avatar {
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  flex: 0 0 28px;
}

.song-event-image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, var(--song-jacket-track-size));
  justify-content: space-between;
  align-items: flex-start;
  row-gap: 6px;
  column-gap: 0;
  min-width: 0;
}

.song-image-jacket-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, var(--song-jacket-track-size));
  justify-content: space-between;
  align-items: flex-start;
  row-gap: 6px;
  column-gap: 0;
  min-width: 0;
}

.song-image-jacket-tile,
.song-oc-event-image-item {
  width: var(--song-jacket-track-size);
  max-width: var(--song-jacket-track-size);
}

.song-event-image-grid .song-jacket-media,
.song-event-image-grid .song-duo-song-jacket-item {
  width: var(--song-jacket-track-size);
  height: var(--song-jacket-track-size);
  min-width: var(--song-jacket-track-size);
  min-height: var(--song-jacket-track-size);
  box-sizing: border-box;
}

.song-oc-event-image-grid {
  row-gap: 2px;
}

.song-duo-jacket-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: flex-start;
  row-gap: 6px;
  column-gap: 4px;
  min-width: 0;
}

.song-duo-card.is-image-mode .song-duo-jacket-grid {
  justify-content: flex-start;
  flex-wrap: wrap;
}

.song-duo-card.is-image-mode {
  min-width: 0;
  border: 2px solid #334155;
}

.song-duo-pair-grid.is-image-compact {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
}

.song-duo-pair-grid.is-image-compact > .song-duo-card.is-image-mode {
  width: fit-content;
  max-width: 100%;
  min-width: 100px;
  flex: 0 1 auto;
}

.song-duo-song-jacket-item {
  width: var(--song-jacket-track-size);
  height: var(--song-jacket-track-size);
  min-width: var(--song-jacket-track-size);
  min-height: var(--song-jacket-track-size);
  border-radius: 8px;
  flex: 0 0 auto;
}

.song-duo-song-jacket-img {
  border-radius: 8px;
}

.song-image-jacket-tile {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
}

.song-image-jacket-caption {
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.1;
  margin-top: 2px;
  max-width: var(--song-jacket-track-size);
  color: #1f2937;
  word-break: break-word;
}

.song-vs-event-image-tag-pill {
  min-width: 4em;
  max-width: 4em;
  min-height: 1.45em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-radius: 999px;
  color: #111827;
  font-size: 0.7rem;
  font-weight: 600;
}

.song-oc-event-unit-count {
  margin-left: 0;
  color: #334155;
  font-weight: 700;
}

.song-oc-event-unit-mv-chips,
.song-oc-event-member-mv-chips {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 6px;
  flex-wrap: wrap;
}

.song-oc-event-mv-stat-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-height: 16px;
  height: 16px;
  border-radius: 999px;
  border: 1px solid rgba(51, 65, 85, 0.24);
  padding: 0 6px;
  color: #0f172a;
  font-size: 0.66rem;
  font-weight: 700;
  line-height: 16px;
  white-space: nowrap;
}

.song-oc-event-mv-stat-chip.is-3d {
  color: #dc2626;
  font-weight: 800;
}

.song-oc-event-member-mv-chips {
  justify-content: flex-end;
}

.song-oc-event-unit-tools {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.song-oc-event-members-grid {
  gap: 2px;
}

.song-oc-event-member-card {
  padding: 8px;
}

.song-oc-event-text-list {
  max-height: none;
  overflow: visible;
}

.song-oc-event-text-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) var(--song-event-mv-col-width);
  align-items: center;
  gap: 4px;
}

.song-oc-event-tag-vs-col {
  display: inline-flex;
  align-items: flex-start;
  gap: var(--song-oc-tag-vs-gap);
  min-width: 0;
}

.song-oc-event-tag {
  min-width: 0.8em;
  text-align: right;
}

.song-oc-event-vs-icons {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
}

.song-oc-event-vs-icons.is-mini {
  gap: 0px;
}

.song-oc-event-vs-icons.is-text-col {
  width: var(--song-oc-vs-col-width);
  min-width: var(--song-oc-vs-col-width);
  display: grid;
  grid-auto-rows: var(--song-oc-vs-col-width);
  align-content: start;
  justify-items: start;
  gap: 1px;
}

.song-oc-event-vs-icon {
  width: 18px;
  height: 18px;
  box-sizing: border-box;
  border-radius: 999px;
  object-fit: cover;
  border: 1px solid #ffffff;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.18);
}

.song-oc-event-vs-icons.is-mini .song-oc-event-vs-icon {
  width: 18px;
  height: 18px;
}

.song-vs-event-mv-col,
.song-oc-event-mv-col {
  justify-content: flex-end;
}

.song-vs-event-mv-empty,
.song-oc-event-mv-empty {
  width: var(--song-event-mv-chip-width);
}

.song-oc-event-image-grid {
  row-gap: 2px;
}

.song-oc-event-image-item {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.song-oc-event-jacket {
  position: relative;
  overflow: hidden;
}

.song-oc-event-vs-icons.is-overlay {
  position: absolute;
  top: 0px;
  right: 0px;
  z-index: 2;
  flex-direction: column;
  align-items: flex-end;
}

.song-oc-event-image-meta {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.song-home-btn {
  width: 30px;
  height: 30px;
  min-height: 30px;
  min-width: 30px;
  padding: 0;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  line-height: 1;
}

.song-home-btn-icon {
  width: 14px;
  height: 14px;
  object-fit: contain;
  display: block;
}

.song-oc-event-unit-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.song-oc-event-unit-card {
  border: 1px solid rgba(51, 65, 85, 0.34);
  border-radius: 10px;
  padding: 8px;
  background: #ffffff;
  min-width: 0;
}

.song-oc-event-unit-head {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: start;
  column-gap: 8px;
  row-gap: 4px;
  margin-bottom: 8px;
}

.song-oc-event-unit-card.is-collapsed .song-oc-event-unit-head {
  margin-bottom: 0;
}

.song-oc-event-unit-head .song-oc-event-unit-count {
  white-space: nowrap;
}

.song-oc-event-unit-head .song-oc-event-unit-mv-chips {
  margin-left: 0;
  min-width: 0;
}

.song-oc-event-unit-head .song-oc-event-unit-tools {
  margin-left: 0;
  justify-self: end;
  align-self: start;
}

.song-duo-unit-card.is-ws-split .song-duo-pair-grid > .song-duo-card:nth-child(1) {
  grid-column: 1;
  grid-row: 1;
}

.song-duo-unit-card.is-ws-split .song-duo-pair-grid > .song-duo-card:nth-child(2) {
  grid-column: 2;
  grid-row: 1;
}

.song-duo-unit-card.is-ws-split .song-duo-pair-grid > .song-duo-card:nth-child(3) {
  grid-column: 1;
  grid-row: 2;
}

.song-duo-unit-card.is-ws-split .song-duo-pair-grid > .song-duo-card:nth-child(4) {
  grid-column: 2;
  grid-row: 2;
}

.song-duo-unit-card.is-ws-split .song-duo-pair-grid > .song-duo-card:nth-child(5) {
  grid-column: 3;
  grid-row: 2;
}

.song-duo-unit-card.is-ws-split .song-duo-pair-grid > .song-duo-card:nth-child(6) {
  grid-column: 4;
  grid-row: 2;
}

.song-duo-card .song-role-list {
  max-height: none;
  overflow: visible;
}

.song-toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.song-disclaimer {
  margin: 0 0 10px;
  padding: 9px 10px;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  background: #f8fafc;
  color: #334155;
  font-size: 0.76rem;
  line-height: 1.5;
}

.song-disclaimer p {
  margin: 0;
}

.song-disclaimer p + p {
  margin-top: 4px;
}

.song-disclaimer a {
  color: #2563eb;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.song-disclaimer a:hover {
  color: #1d4ed8;
}

.song-search {
  flex: 1 1 280px;
  min-width: 220px;
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  font-size: 0.9rem;
}

.song-column-filters {
  display: inline-flex;
  column-gap: 6px;
  row-gap: 6px;
  flex-wrap: wrap;
}

.song-filter-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 700;
}

.song-filter-select {
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #fff;
  color: #334155;
  font-size: 0.8rem;
  padding: 5px 9px;
  min-height: 31px;
  cursor: pointer;
  white-space: nowrap;
}

.song-list-wrap {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: auto;
}

.song-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
  min-width: 980px;
}

.song-col-id {
  width: 56px;
}

.song-col-jacket {
  width: 78px;
}

.song-col-song {
  width: 18%;
}

.song-col-group {
  width: 12%;
}

.song-col-mv {
  width: 16%;
}

.song-col-diff {
  width: 1%;
}

.song-col-credit {
  width: 16.7%;
}

.song-table th,
.song-table td {
  border-bottom: 1px solid #e5e7eb;
  padding: 10px 10px;
  text-align: left;
  font-size: 0.84rem;
  vertical-align: middle;
}

.song-table th:not(:last-child),
.song-table td:not(:last-child) {
  border-right: 1px solid #f1f5f9;
}

.song-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f8fafc;
  text-align: center;
}

.song-th-filter {
  min-width: 0;
}

.song-th-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: #475569;
  line-height: 1.1;
  margin-bottom: 4px;
}

.song-th-filter-stack {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;
}

.song-th-select {
  width: 100%;
  min-width: 0;
  min-height: 27px;
  padding: 3px 8px;
  font-size: 0.72rem;
}

.song-th-select:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.song-title-cell {
  min-width: 0;
}

.song-jacket-cell {
  text-align: center;
}

.song-jacket-media {
  width: var(--song-jacket-default-size);
  height: var(--song-jacket-default-size);
  border-radius: 10px;
  border: 2px solid #94a3b8;
  background: #eef2f7;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.song-jacket-media.is-3d-frame {
  border: 2px solid #94a3b8;
  background: #eef2f7;
  position: relative;
}

.song-jacket-media.is-3d-frame::after {
  content: '3D';
  position: absolute;
  top: 2px;
  left: 2px;
  height: 12px;
  padding: 0 4px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.95);
  background: linear-gradient(90deg, #ef4444, #f97316);
  color: #ffffff;
  font-size: 0.52rem;
  font-weight: 800;
  line-height: 12px;
  letter-spacing: 0.02em;
  pointer-events: none;
  z-index: 3;
}

.song-jacket-media.is-3d-frame .song-jacket-img,
.song-jacket-media.is-3d-frame .song-duo-song-jacket-img {
  border-radius: inherit;
}

.song-jacket-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.song-jacket-fallback {
  display: none;
  color: #94a3b8;
  font-weight: 700;
  font-size: 0.8rem;
  line-height: 1;
}

.song-jacket-media.is-failed .song-jacket-fallback {
  display: inline-block;
}

.song-list-wrap.is-h-scroll .song-table th:nth-child(2) {
  left: 0;
  z-index: 4;
  box-shadow: 2px 0 0 #e5e7eb;
}

.song-list-wrap.is-h-scroll .song-table td:nth-child(2) {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #fff;
  box-shadow: 2px 0 0 #e5e7eb;
}

.song-title-text {
  display: block;
  color: #0f172a;
  font-weight: 700;
}

.song-mv-cell,
.song-group-cell {
  min-width: 0;
}

.song-mv-wrap,
.song-group-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.song-group-logo {
  width: 25px;
  height: 25px;
  object-fit: contain;
}

.song-group-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  color: #334155;
  background: #f8fafc;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.15;
  padding: 2px 7px;
  white-space: nowrap;
}

.song-group-pill.is-other {
  border-color: #94a3b8;
  color: #475569;
  background: rgba(226, 232, 240, 0.85);
}

.song-group-empty,
.song-mv-empty {
  color: #94a3b8;
}

.song-credit-cell {
  word-break: break-word;
  color: #1f2937;
}

.song-diff-cell {
  min-width: 0;
  width: 1%;
  white-space: nowrap;
}

.song-diff-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.song-diff-badge {
  width: 32px;
  height: 32px;
  min-width: 32px;
  max-width: 32px;
  min-height: 32px;
  max-height: 32px;
  flex: 0 0 32px;
  padding: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.0rem;
  font-weight: 620;
  line-height: 1;
  color: #ffffff;
}

.song-diff-badge.is-easy {
  background: #14d473;
}

.song-diff-badge.is-normal {
  background: #38bef0;
}

.song-diff-badge.is-hard {
  background: #f9c803;
  color: #0f172a;
}

.song-diff-badge.is-expert {
  background: #f64478;
}

.song-diff-badge.is-master {
  background: #c735f9;
}

.song-diff-badge.is-append {
  background: #f883cb;
}

.song-diff-badge.is-empty {
  background: transparent;
  color: transparent;
}

.song-pagination {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.song-page-btn {
  width: 28px;
  min-height: 28px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #ffffff;
  color: #334155;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  line-height: 1;
}

.song-page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.song-page-text,
.song-page-count {
  color: #475569;
  font-size: 0.78rem;
  font-weight: 700;
}

.song-page-size-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 700;
}

.song-page-size-select {
  min-height: 27px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  padding: 0 8px;
  font-size: 0.76rem;
  background: #ffffff;
  color: #334155;
}

.song-placeholder-row td {
  height: 48px;
  background: #ffffff;
}

.song-mv-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 2px 8px;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

.song-mv-chip.song-event-mv-chip {
  font-size: var(--song-event-mv-chip-font-size);
  min-height: var(--song-event-mv-chip-height);
  height: var(--song-event-mv-chip-height);
  min-width: var(--song-event-mv-chip-width);
  width: var(--song-event-mv-chip-width);
  padding: 0 var(--song-event-mv-chip-pad-x);
  line-height: 1;
}

.song-mv-chip.is-3d {
  border-color: #f91674;
  background: rgba(254, 170, 197, 0.5);
  color: #9a3412;
}

.song-mv-chip.is-2d {
  border-color: #14b8a6;
  background: rgba(153, 246, 228, 0.42);
  color: #0f766e;
}

.song-mv-chip.is-vs2d {
  border-color: #0ea5e9;
  background: rgba(186, 230, 253, 0.52);
  color: #0c4a6e;
}

.song-mv-chip.is-original {
  border-color: #8b5cf6;
  background: rgba(221, 214, 254, 0.48);
  color: #5b21b6;
}

.song-mv-chip.is-other {
  border-color: #94a3b8;
  background: rgba(226, 232, 240, 0.58);
  color: #334155;
}

.song-empty {
  text-align: center;
  color: #64748b;
}

@media (max-width: 1200px) {
  .pjsk-song-stats {
    --stats-nav-width: 196px;
    --stats-nav-left: 34px;
    --stats-nav-top: 78px;
    padding: 2px;
    --song-stat-min-card-width: 220px;
  }

  .stats-layout {
    grid-template-columns: var(--stats-nav-width) 1fr;
  }

  .stats-layout.nav-collapsed {
    grid-template-columns: 1fr;
  }

  .song-duo-unit-card.is-ws-split .song-duo-pair-grid > .song-duo-card {
    grid-column: auto;
    grid-row: auto;
  }
}

@media (max-width: 900px) {
  .pjsk-song-stats {
    padding: 8px;
    --song-btn-pad-x: 6px;
    --song-mini-toggle-size: 20px;
    --song-stat-min-card-width: 210px;
    --song-event-mv-col-width: 28px;
    --song-event-mv-chip-width: 22px;
    --song-event-mv-chip-height: 11px;
    --song-event-mv-chip-font-size: 0.5rem;
    --song-event-mv-chip-pad-x: 3px;
    --song-jacket-default-size: 56px;
    --song-jacket-track-size: 52px;
    --song-oc-vs-col-width: 14px;
  }

  .stats-layout,
  .stats-layout.nav-collapsed {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .stats-layout:not(.nav-collapsed) .stats-main {
    grid-column: auto;
  }

  .stats-layout.mobile-nav-open .floating-menu-btn {
    background: #ef4444;
    border-color: #b91c1c;
    color: #ffffff;
  }

  .stats-nav {
    position: static;
    left: auto;
    width: auto;
    height: auto;
    max-height: none;
    top: auto;
  }

  .stats-nav.mobile-floating {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 52px);
    left: 8px;
    right: 8px;
    max-height: calc(100dvh - 60px);
    z-index: 4200;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.22);
    background: #ffffff;
    overflow: hidden;
  }

  .stats-nav.mobile-floating.is-collapsed {
    display: none;
  }

  .stats-nav.mobile-floating.is-open {
    right: 8px;
    left: 8px;
    max-height: calc(100dvh - 64px);
  }

  .nav-scroll {
    max-height: none;
  }

  .nav-group {
    margin-bottom: 4px;
  }

  .nav-link {
    min-height: 26px;
    font-size: 0.72rem;
    padding: 4px 8px;
  }

  .nav-link-sub {
    padding: 3px 8px 3px 22px;
    font-size: 0.68rem;
  }

  .nav-link-sub.is-duo-subanchor {
    padding-left: 30px;
    font-size: 0.66rem;
  }

  .stats-main-head h1 {
    margin-bottom: 8px;
    font-size: 1.1rem;
  }

  .card-panel {
    padding: 9px;
    border-radius: 10px;
  }

  .section-head h2 {
    font-size: 0.96rem;
  }

  .card-export-btn {
    font-size: 0.64rem;
    padding: 3px 6px;
  }

  .song-mini-png-btn {
    font-size: 0.58rem;
    padding: 3px 5px;
    white-space: nowrap;
  }

  .song-insight-table th,
  .song-insight-table td {
    padding: 6px 8px;
    font-size: 0.76rem;
  }

  .song-oc-table {
    min-width: 0;
  }

  .song-oc-unit-logo {
    height: 20px;
    max-width: 110px;
  }

  .song-vs-event-unit-counts {
    gap: 4px;
  }

  .song-vs-event-unit-chip {
    font-size: 0.64rem;
    gap: 4px;
    padding: 1px 4px 1px 3px;
  }

  .song-vs-event-unit-logo {
    width: 14px;
    height: 14px;
  }

  .anvo-mode-switch {
    gap: 4px;
  }

  .anvo-mode-btn {
    font-size: 0.64rem;
    padding: 3px 6px;
    line-height: 1;
  }

  .song-toolbar {
    gap: 8px;
  }

  .song-duo-image-toggle {
    font-size: 0.7rem;
  }

  .song-duo-image-toggle > span {
    font-size: 0;
    line-height: 1;
  }

  .song-duo-image-toggle > span::after {
    content: '曲绘';
    font-size: 0.7rem;
  }

  .song-disclaimer {
    font-size: 0.7rem;
    line-height: 1.45;
    padding: 8px;
  }

  .song-filter-field {
    font-size: 0.74rem;
  }

  .song-filter-select {
    font-size: 0.76rem;
    padding: 4px 8px;
    min-height: 29px;
  }

  .song-th-title {
    font-size: 0.66rem;
    margin-bottom: 3px;
  }

  .song-th-filter-stack {
    gap: 3px;
  }

  .song-th-select {
    min-height: 24px;
    padding: 2px 6px;
    font-size: 0.66rem;
  }

  .song-home-btn {
    width: 28px;
    height: 28px;
    min-height: 28px;
    min-width: 28px;
  }

  .song-col-id {
    width: 46px;
  }

  .song-col-jacket {
    width: 72px;
  }

  .song-col-song {
    width: 12%;
  }

  .song-col-group {
    width: 12%;
  }

  .song-col-mv {
    width: 9%;
  }

  .song-col-credit {
    width: 12%;
  }

  .song-jacket-media {
    border-radius: 8px;
  }

  .song-vs-event-image-head,
  .song-anvo-image-head {
    gap: 5px;
  }

  .song-vs-event-image-groups {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .song-vs-event-image-group {
    padding: 5px;
  }

  .song-vs-event-unit-counts-image .song-vs-event-unit-chip {
    font-size: 0.58rem;
    gap: 3px;
    padding: 1px 4px 1px 3px;
    width: 56px;
  }

  .song-vs-event-unit-counts-image .song-vs-event-unit-stack {
    flex-direction: row;
    align-items: center;
  }

  .song-vs-event-unit-counts-image .song-vs-event-unit-mv-chips {
    flex-direction: row;
    align-items: center;
  }

  .song-vs-event-unit-counts-image .song-vs-event-unit-mv-chip {
    min-width: 48px;
  }

  .song-oc-event-vs-icon {
    width: 14px;
    height: 14px;
  }

  .song-oc-event-vs-icons.is-mini .song-oc-event-vs-icon {
    width: 14px;
    height: 14px;
  }

  .song-image-identity {
    min-width: 56px;
    gap: 3px;
  }

  .song-image-main-avatar {
    width: 24px;
    height: 24px;
    min-width: 24px;
    min-height: 24px;
    flex-basis: 24px;
  }

  .song-image-name {
    font-size: 0.66rem;
  }

  .song-image-count {
    font-size: 0.64rem;
  }

  .song-duo-image-avatar {
    width: 24px;
    height: 24px;
    min-width: 24px;
    min-height: 24px;
    flex-basis: 24px;
  }

  .song-duo-jacket-grid {
    gap: 5px;
  }

  .song-duo-song-jacket-item {
    border-radius: 7px;
  }

  .song-duo-song-jacket-img {
    border-radius: 7px;
  }

  .song-image-jacket-caption {
    font-size: 0.58rem;
  }

  .song-title-text {
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
    word-break: break-word;
    line-height: 1.25;
  }

  .song-table {
    min-width: 1020px;
  }

  .song-diff-badge {
    width: 28px;
    height: 28px;
    min-width: 28px;
    max-width: 28px;
    min-height: 28px;
    max-height: 28px;
    flex: 0 0 28px;
    font-size: 0.78rem;
  }

}

@media (min-width: 901px) and (max-width: 1366px) and (orientation: landscape) {
  .pjsk-song-stats {
    --song-jacket-default-size: 60px;
    --song-jacket-track-size: 60px;
  }

  .song-image-main-avatar {
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
    flex-basis: 28px;
  }

  .song-duo-image-avatar {
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
    flex-basis: 28px;
  }

  .song-vs-event-image-groups {
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  }

  .song-vs-event-unit-counts-image .song-vs-event-unit-chip {
    width: 50px;
  }
}

@media (min-width: 641px) {
  .song-vs-event-card.is-image-mode .song-vs-event-image-head {
    position: relative;
    padding-right: 92px;
  }

  .song-vs-event-card.is-image-mode .song-vs-event-image-head .song-role-card-tools {
    position: absolute;
    top: 0;
    right: 0;
    margin-left: 0;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    z-index: 1;
  }
}

@media (max-width: 640px) {
  .pjsk-song-stats {
    --song-btn-pad-x: 5px;
    --song-mini-toggle-size: 18px;
    --song-stat-min-card-width: 100%;
    --song-event-mv-col-width: 28px;
    --song-event-mv-chip-width: 21px;
    --song-event-mv-chip-height: 11px;
    --song-event-mv-chip-font-size: 0.5rem;
    --song-event-mv-chip-pad-x: 3px;
    --song-jacket-default-size: 68px;
    --song-jacket-track-size: 68px;
  }

  .song-col-jacket {
    width: 68px;
  }

  .song-vs-event-image-layout,
  .song-anvo-image-layout {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .song-vs-event-image-head,
  .song-anvo-image-head {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: flex-start;
    min-width: 0;
    padding-top: 0;
    gap: 6px;
  }

  .song-vs-event-card.is-image-mode .song-vs-event-image-head-main {
    display: flex;
    flex-direction: row;
    align-items: center;
    min-width: 0;
    flex: 1 1 auto;
    gap: 6px;
  }

  .song-vs-event-card.is-image-mode .song-vs-event-image-head .song-role-card-tools {
    margin-left: auto;
    flex: 0 0 auto;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
  }

  .song-vs-event-card.is-image-mode .song-vs-event-image-head-stats {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    min-width: 0;
  }

  .song-vs-event-card.is-image-mode .song-vs-event-unit-counts-image {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    justify-content: stretch;
    align-items: start;
    gap: 4px;
    width: 100%;
    grid-column: 1 / -1;
  }

  .song-vs-event-image-total {
    min-width: auto;
    justify-content: flex-start;
    text-align: left;
  }

  .song-vs-event-card.is-image-mode .song-vs-event-unit-counts-image .song-vs-event-unit-stack {
    width: auto;
    min-width: 0;
    flex-direction: column;
    align-items: stretch;
  }

  .song-vs-event-card.is-image-mode .song-vs-event-unit-counts-image .song-vs-event-unit-chip {
    width: 100%;
    min-width: 0;
    justify-content: center;
  }

  .song-vs-event-card.is-image-mode .song-vs-event-unit-counts-image .song-vs-event-unit-mv-chips {
    flex-direction: row;
    align-items: center;
    justify-content: center;
  }

  .song-vs-event-card.is-image-mode .song-vs-event-unit-counts-image .song-vs-event-unit-mv-chip {
    min-width: 0;
    width: 100%;
  }

  .song-vs-event-card.is-image-mode .song-image-main-avatar {
    width: 30px;
    height: 30px;
    min-width: 30px;
    min-height: 30px;
    flex-basis: 30px;
  }

  .song-vs-event-card.is-image-mode .song-vs-event-image-name {
    font-size: 0.82rem;
    font-weight: 700;
    line-height: 1.2;
  }

  .song-vs-event-card.is-image-mode .song-vs-event-image-total.song-image-count {
    font-size: 0.74rem;
    font-weight: 700;
    line-height: 1.2;
    color: #6b7280;
    min-width: auto;
    justify-content: flex-start;
    text-align: left;
  }

  .song-oc-event-vs-icon {
    width: 20px;
    height: 20px;
  }

  .song-oc-event-vs-icons.is-mini .song-oc-event-vs-icon {
    width: 20px;
    height: 20px;
  }

  .song-duo-image-avatars {
    min-width: 54px;
    gap: 4px;
  }

  .song-duo-image-identity {
    min-width: 62px;
  }

  .song-col-credit {
    width: 10.5%;
  }

  .song-diff-wrap {
    gap: 4px;
  }

  .song-diff-badge {
    width: 25px;
    height: 25px;
    min-width: 25px;
    max-width: 25px;
    min-height: 25px;
    max-height: 25px;
    flex: 0 0 25px;
    font-size: 0.7rem;
  }
}
</style>
