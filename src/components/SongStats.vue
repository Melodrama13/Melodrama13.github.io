<template>
  <div ref="songStatsRootRef" class="pjsk-song-stats" :class="{ 'is-exporting': isExportingPng }">
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
                @click="handleParentNavClick(group)"
              >
                {{ group.title }}
              </button>
              <div v-if="group.children?.length && isGroupExpanded(group)" class="nav-sub-list">
                <button
                  v-for="item in group.children"
                  :key="item.id"
                  class="nav-link nav-link-sub"
                  :class="{ active: activeNavId === item.id, 'is-duo-subanchor': isNestedNavChild(item) }"
                  v-show="shouldShowNavChild(item)"
                  :title="item.title"
                  @click="handleChildNavClick(group, item)"
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
            本网站为非官方、非商业的个人研究与交流项目，不拥有所展示素材的版权。
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

        <section id="panel-song-stats" class="stats-section card-panel section-main" data-scroll-anchor="panel-song-stats">
          <div class="section-head">
            <div class="section-head-left">
              <h2>{{ getSongSectionTitle('panel-song-stats') }}</h2>
            </div>
          </div>

          <div class="stats-grid">
            <article id="panel-oc-stats" class="stats-section card-panel" data-scroll-anchor="panel-oc-stats">
              <div class="section-head section-head-sub">
                <div class="section-head-left">
                  <h2>{{ getSongSectionTitle('panel-oc-stats') }}</h2>
                  <label class="song-deleted-toggle">
                    <input v-model="includeDeletedSongsInStats" type="checkbox" />
                    <span>统计删除曲目</span>
                  </label>
                </div>
                <button class="pjsk-ui-btn-pill card-export-btn song-export-btn" :disabled="isExportingPng" @click="exportSongPanelPng('panel-oc-stats', getSongSectionTitle('panel-oc-stats'))">PNG</button>
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

            <article id="panel-vs-song-stats" class="stats-section card-panel" data-scroll-anchor="panel-vs-song-stats">
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
                  <button class="pjsk-ui-btn-pill card-export-btn song-export-btn" :disabled="isExportingPng" @click="exportSongPanelPng('panel-vs-song-stats', getSongSectionTitle('panel-vs-song-stats'))">PNG</button>
                </div>
              </div>

              <div class="song-role-card-grid song-stat-grid">
                <article
                  v-for="row in virtualSingerSongStats"
                  :key="`song-vs-${row.name}`"
                  :id="getVsSingerNavAnchorId(row.name) || undefined"
                  :data-scroll-anchor="`vs-card-${row.name}`"
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
                          <div class="song-image-count song-image-count-circle">{{ row.count }}</div>
                        </div>
                        <span class="song-vs-pill song-vs-total-mv-chip song-vs-total-mv-chip-head">
                          <span>2D {{ row.total2d }}</span>
                          <span class="song-vs-total-mv-sep">|</span>
                          <span class="song-vs-total-mv-3d">3D {{ row.total3d }}</span>
                        </span>
                      </div>
                      <div class="song-role-card-tools">
                        <button class="song-mini-icon-btn" @click="toggleVsSongCardExpandCollapse(row.name)">
                          <img
                            :src="getVsSongCardMode(row.name) === 'collapsed' ? '/data/icon/expand.png' : '/data/icon/collapse.png'"
                            :alt="getVsSongCardMode(row.name) === 'collapsed' ? '展开' : '收起'"
                            class="song-mini-icon-btn-img"
                          />
                        </button>
                        <button class="pjsk-ui-btn-pill card-export-btn song-export-btn song-mini-png-btn" :disabled="isExportingPng" @click="exportVirtualSingerCardPng(row)">PNG</button>
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
                          v-for="unitKey in VS_UNIT_ORDER"
                          :key="`${row.name}-image-${unitKey}`"
                          class="song-vs-event-unit-stack"
                        >
                          <span
                            class="song-vs-pill song-vs-event-unit-chip"
                            :style="{ backgroundColor: hexToRgba(unitColorMap[unitKey] || '#94a3b8', 0.2) }"
                          >
                            <img :src="UNIT_TAG_ICON_MAP[unitKey]" class="song-vs-event-unit-logo" :alt="unitKey" />
                            <span class="song-vs-event-unit-count">{{ row.unitCounts[unitKey] }}</span>
                          </span>
                          <div class="song-vs-event-unit-mv-chips">
                            <span class="song-vs-pill song-vs-event-unit-mv-chip is-compact" :style="{ backgroundColor: hexToRgba(unitColorMap[unitKey] || '#94a3b8', 0.22) }">
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
                            @click="showSongImageTitle($event, song.songName || '-')"
                          >
                            <div :class="['song-jacket-media', 'song-duo-song-jacket-item', { 'is-3d-frame': song.has3d }]">
                              <img
                                v-if="song.jacketUrl"
                                :src="song.jacketUrl"
                                :alt="`${song.songName || '歌曲'} 封面`"
                                class="song-jacket-img song-duo-song-jacket-img media-load-shimmer"
                                loading="lazy"
                                decoding="async"
                                @load="onSongJacketLoad"
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
                        <div class="song-image-count song-image-count-circle">{{ row.count }}</div>
                        <span class="song-vs-pill song-vs-total-mv-chip song-vs-total-mv-chip-head">
                          <span>2D {{ row.total2d }}</span>
                          <span class="song-vs-total-mv-sep">|</span>
                          <span class="song-vs-total-mv-3d">3D {{ row.total3d }}</span>
                        </span>
                      </div>
                      <div class="song-role-card-tools">
                        <button class="song-mini-icon-btn" @click="toggleVsSongCardExpandCollapse(row.name)">
                          <img
                            :src="getVsSongCardMode(row.name) === 'collapsed' ? '/data/icon/expand.png' : '/data/icon/collapse.png'"
                            :alt="getVsSongCardMode(row.name) === 'collapsed' ? '展开' : '收起'"
                            class="song-mini-icon-btn-img"
                          />
                        </button>
                        <button class="pjsk-ui-btn-pill card-export-btn song-export-btn song-mini-png-btn" :disabled="isExportingPng" @click="exportVirtualSingerCardPng(row)">PNG</button>
                      </div>
                    </div>

                    <div class="song-vs-event-unit-counts">
                      <div
                        v-for="unitKey in VS_UNIT_ORDER"
                        :key="`${row.name}-${unitKey}`"
                        class="song-vs-event-unit-stack"
                      >
                        <span
                          class="song-vs-pill song-vs-event-unit-chip"
                          :style="{ backgroundColor: hexToRgba(unitColorMap[unitKey] || '#94a3b8', 0.2) }"
                        >
                          <img :src="UNIT_TAG_ICON_MAP[unitKey]" class="song-vs-event-unit-logo" :alt="unitKey" />
                          <span class="song-vs-event-unit-count">{{ row.unitCounts[unitKey] }}</span>
                        </span>
                        <div class="song-vs-event-unit-mv-chips">
                          <span class="song-vs-pill song-vs-event-unit-mv-chip is-compact" :style="{ backgroundColor: hexToRgba(unitColorMap[unitKey] || '#94a3b8', 0.22) }">
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
                <div v-if="virtualSingerSongStats.length === 0" class="song-empty">暂无虚拟歌手参与歌曲数据</div>
              </div>
            </article>

            <article id="panel-oc-book-stats" class="stats-section card-panel" data-scroll-anchor="panel-oc-book-stats">
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
                  <button class="pjsk-ui-btn-pill card-export-btn song-export-btn" :disabled="isExportingPng" @click="exportSongPanelPng('panel-oc-book-stats', getSongSectionTitle('panel-oc-book-stats'))">PNG</button>
                </div>
              </div>

              <div class="song-oc-event-unit-grid">
                <article
                  v-for="unitGroup in ocBookStatsByUnit"
                  :key="`oc-book-${unitGroup.unit}`"
                  :id="getOcBookUnitNavAnchorId(unitGroup.unit)"
                  :data-scroll-anchor="`oc-unit-${unitGroup.unit}`"
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
                    <span class="song-image-count song-image-count-circle">{{ unitGroup.totalSongs }}</span>
                    <div class="song-oc-event-unit-mv-chips">
                      <span class="song-vs-pill song-oc-event-mv-stat-chip is-2d" :style="{ backgroundColor: hexToRgba(unitColorMap[unitGroup.unit] || '#94a3b8', 0.22) }">2D | {{ unitGroup.total2d }}</span>
                      <span class="song-vs-pill song-oc-event-mv-stat-chip is-3d" :style="{ backgroundColor: hexToRgba(unitColorMap[unitGroup.unit] || '#94a3b8', 0.22) }">3D | {{ unitGroup.total3d }}</span>
                    </div>
                    <div class="song-oc-event-unit-tools">
                      <button class="song-mini-icon-btn" @click="toggleOcBookUnitExpandCollapse(unitGroup.unit)">
                        <img
                          :src="isOcBookUnitExpanded(unitGroup.unit) ? '/data/icon/collapse.png' : '/data/icon/expand.png'"
                          :alt="isOcBookUnitExpanded(unitGroup.unit) ? '收起' : '展开'"
                          class="song-mini-icon-btn-img"
                        />
                      </button>
                      <button class="pjsk-ui-btn-pill card-export-btn song-export-btn song-mini-png-btn" :disabled="isExportingPng" @click="exportOcBookUnitCardPng(unitGroup)">PNG</button>
                    </div>
                  </div>

                  <div v-if="isOcBookUnitExpanded(unitGroup.unit)" class="song-role-card-grid song-stat-grid song-oc-event-members-grid">
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
                          <span class="song-vs-pill song-oc-event-mv-stat-chip is-2d" :style="{ backgroundColor: hexToRgba(unitColorMap[member.unit] || '#94a3b8', 0.22) }">2D | {{ member.count2d }}</span>
                          <span class="song-vs-pill song-oc-event-mv-stat-chip is-3d" :style="{ backgroundColor: hexToRgba(unitColorMap[member.unit] || '#94a3b8', 0.22) }">3D | {{ member.count3d }}</span>
                        </div>
                      </div>

                      <div v-if="ocBookImageMode" class="song-event-image-grid song-oc-event-image-grid">
                        <div
                          v-for="song in member.songs"
                          :key="`oc-book-image-${member.name}-${song.songId}-${song.eventId}`"
                          class="song-oc-event-image-item"
                          :title="song.songName || '-'"
                          @click="showSongImageTitle($event, song.songName || '-')"
                        >
                          <div :class="['song-jacket-media', 'song-duo-song-jacket-item', 'song-oc-event-jacket', { 'is-3d-frame': song.has3d }]">
                            <img
                              v-if="song.jacketUrl"
                              :src="song.jacketUrl"
                              :alt="`${song.songName || '歌曲'} 封面`"
                              class="song-jacket-img song-duo-song-jacket-img media-load-shimmer"
                              loading="lazy"
                              decoding="async"
                              @load="onSongJacketLoad"
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
                <div v-if="ocBookStatsByUnit.length === 0" class="song-empty">暂无各团书下数据</div>
              </div>
            </article>

            <article id="panel-another-vocal" class="stats-section card-panel" data-scroll-anchor="panel-another-vocal">
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
                  <button class="pjsk-ui-btn-pill card-export-btn song-export-btn" :disabled="isExportingPng" @click="exportSongPanelPng('panel-another-vocal', getSongSectionTitle('panel-another-vocal'))">PNG</button>
                </div>
              </div>

              <div class="song-role-card-grid song-stat-grid">
                <article
                  v-for="row in anotherVocalCards"
                  :key="`another-card-${row.name}`"
                  :id="getAnvoNavAnchorId(row.name) || undefined"
                  :data-scroll-anchor="`anvo-card-${row.name}`"
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
                        @click="showSongImageTitle($event, song.title || '-')"
                      >
                        <img
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
                        <button class="pjsk-ui-btn-pill card-export-btn song-export-btn song-mini-png-btn" :disabled="isExportingPng" @click="exportAnotherCardPng(row)">PNG</button>
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

            <article id="panel-duo-stats" class="stats-section card-panel" data-scroll-anchor="panel-duo-stats">
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
                  <button class="pjsk-ui-btn-pill card-export-btn song-export-btn" :disabled="isExportingPng" @click="exportSongPanelPng('panel-duo-stats', getSongSectionTitle('panel-duo-stats'))">PNG</button>
                </div>
              </div>

              <div class="song-duo-unit-grid">
                <article
                  v-for="unitCard in sameUnitPairUnitCards"
                  :key="`duo-unit-${unitCard.unit}`"
                  :id="unitCard.anchorId"
                  :data-scroll-anchor="`duo-unit-${unitCard.unit}`"
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
                      :data-scroll-anchor="`duo-card-${card.key}`"
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
                            class="song-jacket-media song-duo-song-jacket-item song-oc-event-jacket"
                            :title="song.title || '-'"
                            @click="showSongImageTitle($event, song.title || '-')"
                          >
                            <img
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
                            <div class="song-oc-event-vs-icons is-mini is-overlay">
                              <img
                                v-for="vs in song.vsIcons"
                                :key="`duo-image-vs-${card.key}-${song.id}-${vs.name}`"
                                :src="vs.icon"
                                :alt="vs.name"
                                :title="vs.name"
                                class="song-oc-event-vs-icon"
                              />
                            </div>
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
                            <div class="song-oc-event-vs-icons is-duo-inline">
                              <span
                                v-if="(song.vsIcons?.length || 0) === 0"
                                class="song-oc-event-vs-icon is-placeholder-slot"
                                aria-hidden="true"
                              ></span>
                              <img
                                v-for="vs in song.vsIcons"
                                :key="`duo-text-vs-${card.key}-${song.id}-${vs.name}`"
                                :src="vs.icon"
                                :alt="vs.name"
                                :title="vs.name"
                                class="song-oc-event-vs-icon"
                              />
                            </div>
                            <span class="song-role-song-title">{{ song.title || '-' }}</span>
                            <div class="song-event-mv-col song-duo-event-mv-col">
                              <span v-if="song.has2d" class="song-mv-chip is-2d song-event-mv-chip">2D</span>
                              <span v-else class="song-event-mv-empty song-duo-event-mv-empty"></span>
                            </div>
                            <div class="song-event-mv-col song-duo-event-mv-col">
                              <span v-if="song.has3d" class="song-mv-chip is-3d song-event-mv-chip">3D</span>
                              <span v-else class="song-event-mv-empty song-duo-event-mv-empty"></span>
                            </div>
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
              placeholder="按 ID（请加前缀#，如 #241）/ 歌曲名（支持假名与罗马音）/ 词曲作者搜索"
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
                  <th>曲绘</th>
                  <th>曲名</th>
                  <th class="song-th-filter">
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
                    <select v-model="mvFilter" class="song-filter-select song-th-select">
                      <option value="all">MV</option>
                      <option value="3d">3DMV</option>
                      <option value="2d">2DMV</option>
                      <option value="vs2d">VS2D</option>
                      <option value="original">原画MV</option>
                    </select>
                  </th>
                  <th class="song-th-filter">
                    <div class="song-th-filter-stack">
                      <select v-model="difficultySortKey" class="song-filter-select song-th-select">
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
                        class="song-diff-order-btn"
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
                    <div class="song-jacket-media" @click="showSongImageTitle($event, song.title || '-')">
                      <img
                        v-if="song.jacketUrl"
                        :src="song.jacketUrl"
                        :alt="`${song.title || '歌曲'} 封面`"
                        class="song-jacket-img media-load-shimmer"
                        loading="lazy"
                        decoding="async"
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
            <button class="song-page-btn" :disabled="currentSongPage <= 1" @click="changeSongPage(-1, $event)">-</button>
            <span class="song-page-text">第 {{ currentSongPage }} / {{ totalSongPages }} 页</span>
            <button class="song-page-btn" :disabled="currentSongPage >= totalSongPages" @click="changeSongPage(1, $event)">+</button>
            <button class="song-home-btn" title="回到第一页" @click="backToSongHome($event)">
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

        <div
          v-if="songImageTitleToast"
          class="song-image-title-toast"
          :style="{ left: `${songImageTitleToast.left}px`, top: `${songImageTitleToast.top}px` }"
        >
          {{ songImageTitleToast.text }}
        </div>
      </div>
    </div>

    <div
      v-if="screenshotModalVisible"
      class="song-screenshot-modal-mask"
      @click.self="closeScreenshotModal"
    >
      <div class="song-screenshot-modal" :class="`is-${screenshotModalState}`" role="status" aria-live="polite">
        <div class="song-screenshot-modal-head">
          <div class="song-screenshot-modal-head-main">
            <span
              v-if="screenshotModalState === 'capturing' || screenshotModalState === 'retrying'"
              class="song-screenshot-modal-spinner"
              aria-hidden="true"
            ></span>
            <span class="song-screenshot-modal-title">{{ screenshotModalTitle }}</span>
          </div>
          <button
            v-if="screenshotModalState === 'capturing' || screenshotModalState === 'retrying'"
            class="pjsk-ui-btn-pill card-export-btn song-screenshot-modal-close-btn"
            @click="forceCancelScreenshotExport"
          >
            取消
          </button>
        </div>
        <p class="song-screenshot-modal-message">{{ screenshotModalMessage }}</p>
        <div v-if="screenshotModalState === 'failed'" class="song-screenshot-modal-actions">
          <button class="pjsk-ui-btn-pill card-export-btn song-screenshot-modal-btn" :disabled="isExportingPng" @click="retryScreenshotExport">重新截图</button>
          <button class="pjsk-ui-btn-pill card-export-btn song-screenshot-modal-btn song-screenshot-modal-btn-secondary" :disabled="isExportingPng" @click="closeScreenshotModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import html2canvas from 'html2canvas';
import { toHiragana, toRomaji } from 'wanakana';

const props = defineProps({
  allEvents: { type: Array, default: () => [] },
  allSongs: { type: Array, default: () => [] },
  allCharacters: { type: Array, default: () => [] }
});

const keyword = ref('');
const mvFilter = ref('all');
const groupFilter = ref('all');
const difficultySortKey = ref('');
const difficultySortMode = ref('none');
const includeDeletedSongsInStats = ref(true);
const isExportingPng = ref(false);
const screenshotModalVisible = ref(false);
const screenshotModalState = ref('idle');
const screenshotModalTitle = ref('');
const screenshotModalMessage = ref('');
const screenshotModalRetryTask = ref(null);
const screenshotModalCancelTask = ref(null);
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
const songStatsRootRef = ref(null);
const songListWrapRef = ref(null);
const isSongTableOverflowing = ref(false);
const songImageTitleToast = ref(null);
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
let songImageTitleToastTimer = 0;
let screenshotModalAutoCloseTimer = 0;
let navSyncRaf = 0;
let statsMainInteractionHost = null;
let lastInteractiveAnchorEl = null;
let lastInteractiveAt = 0;
let pendingSongCaptureRenderTask = null;

const DELETED_SONG_ID_SET = new Set([241, 290]);

const navCollapsed = ref(false);
const activeNavId = ref('panel-oc-stats');
const isMobileNav = ref(false);
const isNavTopLayout = ref(false);
const navTopLayoutPrev = ref(null);
const mobileNavExpandedGroups = ref({});
let sectionObserver = null;

const SONG_DIFFICULTY_ORDER = Object.freeze([
  { key: 'easy', label: 'EASY' },
  { key: 'normal', label: 'NORMAL' },
  { key: 'hard', label: 'HARD' },
  { key: 'expert', label: 'EXPERT' },
  { key: 'master', label: 'MASTER' },
  { key: 'append', label: 'APPEND' }
]);
const SONG_STAT_CARD_TINT_ALPHA = 0.2;

const DIFFICULTY_SORT_OPTIONS = Object.freeze([
  { value: 'easy', label: 'EASY' },
  { value: 'normal', label: 'NORMAL' },
  { value: 'hard', label: 'HARD' },
  { value: 'expert', label: 'EXPERT' },
  { value: 'master', label: 'MASTER' },
  { value: 'append', label: 'APPEND' }
]);

const difficultySortModeIconSrc = computed(() => {
  if (difficultySortMode.value === 'desc') return '/data/icon/circle_arrow_down.png';
  if (difficultySortMode.value === 'asc') return '/data/icon/circle_arrow_up.png';
  return '/data/icon/circle_arrow_up_down.png';
});

const difficultySortModeTitle = computed(() => {
  if (!difficultySortKey.value) {
    if (difficultySortMode.value === 'desc') return '当前：ID高到低（点击切到ID低到高）';
    if (difficultySortMode.value === 'asc') return '当前：ID低到高（点击切到默认）';
    return '当前：ID排序（点击切到ID高到低）';
  }
  if (difficultySortMode.value === 'desc') return '当前：高到低（点击切到低到高）';
  if (difficultySortMode.value === 'asc') return '当前：低到高（点击切到ID排序）';
  return '当前：ID排序（点击切到高到低）';
});

const cycleDifficultySortMode = (event) => {
  const anchorEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  void withInteractionPinnedPosition(() => {
    if (difficultySortMode.value === 'none') {
      difficultySortMode.value = 'desc';
      return;
    }
    if (difficultySortMode.value === 'desc') {
      difficultySortMode.value = 'asc';
      return;
    }
    difficultySortMode.value = 'none';
  }, anchorEl);
};

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
  { value: 'all', label: '团体' },
  { value: 'vs', label: 'VS' },
  { value: 'ln', label: 'LN' },
  { value: 'mmj', label: 'MMJ' },
  { value: 'vbs', label: 'VBS' },
  { value: 'ws', label: 'WS' },
  { value: 'nc', label: 'NC' },
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
const CORE_UNIT_KEYS = Object.freeze(['vs', ...OC_UNIT_KEYS]);
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

const VS_NAV_ABBR_WHITELIST = Object.freeze(['miku', 'rin', 'len', 'luka', 'meiko', 'kaito']);
const ANVO_UNIT_FIRST_MEMBER_ANCHORS = Object.freeze([
  { unit: 'ln', abbr: 'ick', title: 'LN Anvo' },
  { unit: 'mmj', abbr: 'mnr', title: 'MMJ Anvo' },
  { unit: 'vbs', abbr: 'khn', title: 'VBS Anvo' },
  { unit: 'ws', abbr: 'tks', title: 'WS Anvo' },
  { unit: 'nc', abbr: 'knd', title: 'NC Anvo' },
  { unit: 'vs', abbr: 'miku', title: 'VS Anvo' }
]);

const getNavAbbrFromName = (name) => {
  return String(getCharacterAbbr(name) || '')
    .trim()
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();
};

const getVsSingerBookSubtitle = (name) => {
  const abbr = getNavAbbrFromName(name);
  if (!abbr) return `${String(name || '').trim()} 书下`;
  return `${abbr.toUpperCase()} 书下`;
};

const makeVsSingerNavAnchorId = (name) => {
  const abbr = getNavAbbrFromName(name);
  if (!abbr || !VS_NAV_ABBR_WHITELIST.includes(abbr)) return '';
  return `panel-vs-singer-${abbr}`;
};

const makeOcBookUnitNavAnchorId = (unitKey) => {
  const key = String(unitKey || '').trim().toLowerCase();
  if (!key) return '';
  return `panel-oc-unit-${key}`;
};

const makeAnvoUnitNavAnchorId = (unitKey) => {
  const key = String(unitKey || '').trim().toLowerCase();
  if (!key) return '';
  return `panel-anvo-unit-${key}`;
};

const vsSingerNavChildren = computed(() => {
  return virtualSingerSongStats.value
    .map((row) => {
      const id = makeVsSingerNavAnchorId(row.name);
      if (!id) return null;
      return {
        id,
        title: getVsSingerBookSubtitle(row.name),
        anchorKind: 'vs-singer'
      };
    })
    .filter(Boolean);
});

const vsSingerAnchorIdByName = computed(() => {
  const map = new Map();
  virtualSingerSongStats.value.forEach((row) => {
    const id = makeVsSingerNavAnchorId(row.name);
    if (!id) return;
    map.set(String(row.name || ''), id);
  });
  return map;
});

const getVsSingerNavAnchorId = (name) => {
  return vsSingerAnchorIdByName.value.get(String(name || '')) || '';
};

const ocBookUnitNavChildren = computed(() => {
  return ocBookStatsByUnit.value
    .map((group) => {
      const id = makeOcBookUnitNavAnchorId(group.unit);
      if (!id) return null;
      return {
        id,
        title: `${UNIT_NAV_LABEL_MAP[group.unit] || String(group.unit || '').toUpperCase()} 书下`,
        anchorKind: 'oc-unit'
      };
    })
    .filter(Boolean);
});

const getOcBookUnitNavAnchorId = (unit) => makeOcBookUnitNavAnchorId(unit);

const anvoUnitAnchorIdByName = computed(() => {
  const map = new Map();
  ANVO_UNIT_FIRST_MEMBER_ANCHORS.forEach((config) => {
    const matched = anotherVocalCards.value.find((row) => getNavAbbrFromName(row.name) === config.abbr);
    if (!matched) return;
    const id = makeAnvoUnitNavAnchorId(config.unit);
    if (!id) return;
    map.set(String(matched.name || ''), id);
  });
  return map;
});

const anvoUnitNavChildren = computed(() => {
  return ANVO_UNIT_FIRST_MEMBER_ANCHORS
    .map((config) => {
      const matched = anotherVocalCards.value.find((row) => getNavAbbrFromName(row.name) === config.abbr);
      if (!matched) return null;
      return {
        id: makeAnvoUnitNavAnchorId(config.unit),
        title: config.title,
        anchorKind: 'anvo-unit'
      };
    })
    .filter(Boolean);
});

const getAnvoNavAnchorId = (name) => {
  return anvoUnitAnchorIdByName.value.get(String(name || '')) || '';
};

const navGroups = computed(() => {
  const duoUnitChildren = sameUnitPairUnitCards.value.map((unitCard) => ({
    id: unitCard.anchorId,
    title: `${UNIT_NAV_LABEL_MAP[unitCard.unit] || String(unitCard.unit || '').toUpperCase()} 双人歌曲`,
    anchorKind: 'duo-unit'
  }));

  return [
    {
      id: 'panel-oc-stats',
      title: getSongSectionTitle('panel-oc-stats'),
      children: []
    },
    {
      id: 'panel-vs-song-stats',
      title: getSongSectionTitle('panel-vs-song-stats'),
      children: [...vsSingerNavChildren.value]
    },
    {
      id: 'panel-oc-book-stats',
      title: getSongSectionTitle('panel-oc-book-stats'),
      children: [...ocBookUnitNavChildren.value]
    },
    {
      id: 'panel-another-vocal',
      title: getSongSectionTitle('panel-another-vocal'),
      children: [...anvoUnitNavChildren.value]
    },
    {
      id: 'panel-duo-stats',
      title: getSongSectionTitle('panel-duo-stats'),
      children: [...duoUnitChildren]
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

const vsSingerNavIds = computed(() => {
  const ids = [];
  navGroups.value.forEach((group) => {
    (group.children || []).forEach((item) => {
      if (item.anchorKind === 'vs-singer') ids.push(item.id);
    });
  });
  return new Set(ids);
});

const ocUnitNavIds = computed(() => {
  const ids = [];
  navGroups.value.forEach((group) => {
    (group.children || []).forEach((item) => {
      if (item.anchorKind === 'oc-unit') ids.push(item.id);
    });
  });
  return new Set(ids);
});

const anvoUnitNavIds = computed(() => {
  const ids = [];
  navGroups.value.forEach((group) => {
    (group.children || []).forEach((item) => {
      if (item.anchorKind === 'anvo-unit') ids.push(item.id);
    });
  });
  return new Set(ids);
});

const isDuoNavScopeActive = computed(() => {
  if (activeNavId.value === 'panel-duo-stats') return true;
  return duoUnitNavIds.value.has(activeNavId.value);
});

const isVsNavScopeActive = computed(() => {
  if (activeNavId.value === 'panel-vs-song-stats') return true;
  return vsSingerNavIds.value.has(activeNavId.value);
});

const isOcBookNavScopeActive = computed(() => {
  if (activeNavId.value === 'panel-oc-book-stats') return true;
  return ocUnitNavIds.value.has(activeNavId.value);
});

const isAnvoNavScopeActive = computed(() => {
  if (activeNavId.value === 'panel-another-vocal') return true;
  return anvoUnitNavIds.value.has(activeNavId.value);
});

const isGroupActive = (group) => {
  if (activeNavId.value === group.id) return true;
  return (group.children || []).some((c) => c.id === activeNavId.value);
};

const isGroupExpanded = (group) => {
  if (!isMobileNav.value) return isGroupActive(group);
  return !!mobileNavExpandedGroups.value[String(group?.id || '')];
};

const resetMobileNavGroupExpansion = () => {
  mobileNavExpandedGroups.value = {};
};

const isNestedNavChild = (item) => {
  const kind = String(item?.anchorKind || '').trim();
  return ['duo-unit', 'vs-singer', 'oc-unit', 'anvo-unit'].includes(kind);
};

const shouldShowNavChild = (item) => {
  const kind = String(item?.anchorKind || '').trim();
  if (!kind) return true;
  if (kind === 'duo-unit') return isMobileNav.value || isDuoNavScopeActive.value;
  if (kind === 'vs-singer') return isMobileNav.value || isVsNavScopeActive.value;
  if (kind === 'oc-unit') return isMobileNav.value || isOcBookNavScopeActive.value;
  if (kind === 'anvo-unit') return isMobileNav.value || isAnvoNavScopeActive.value;
  return true;
};

const getScrollContainer = () => {
  const content = document.querySelector('.content-area');
  if (content instanceof HTMLElement) return content;
  if (document.scrollingElement instanceof HTMLElement) return document.scrollingElement;
  return document.documentElement;
};

const pickActiveNavTargetIdByViewport = () => {
  const host = getScrollContainer();
  const hostRect = host.getBoundingClientRect();
  const anchorY = hostRect.top + Math.min(140, Math.max(72, hostRect.height * 0.2));
  const ids = navTargetIds.value;

  const containing = [];
  const upcoming = [];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLElement)) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    if (rect.top <= anchorY && rect.bottom > anchorY) {
      containing.push({ id, top: rect.top, height: rect.height });
      return;
    }
    if (rect.top > anchorY) {
      upcoming.push({ id, top: rect.top });
    }
  });

  if (containing.length > 0) {
    containing.sort((a, b) => {
      if (b.top !== a.top) return b.top - a.top;
      return a.height - b.height;
    });
    return containing[0].id;
  }

  if (upcoming.length > 0) {
    upcoming.sort((a, b) => a.top - b.top);
    return upcoming[0].id;
  }

  return ids[ids.length - 1] || '';
};

const syncActiveNavByViewport = () => {
  try {
    const nextId = pickActiveNavTargetIdByViewport();
    if (nextId && activeNavId.value !== nextId) {
      activeNavId.value = nextId;
    }
  } catch (_) {
    // Guard against observer/DOM race to avoid crashing the whole page.
  }
};

const scheduleNavSync = () => {
  if (navSyncRaf) return;
  navSyncRaf = requestAnimationFrame(() => {
    navSyncRaf = 0;
    syncActiveNavByViewport();
  });
};

const SCROLL_SNAPSHOT_ANCHOR_SELECTOR = '[data-scroll-anchor]';

const getAnchorNodesInStatsMain = () => {
  const statsMain = document.querySelector('.stats-main');
  if (!(statsMain instanceof HTMLElement)) return [];
  return Array.from(statsMain.querySelectorAll(SCROLL_SNAPSHOT_ANCHOR_SELECTOR)).filter((el) => el instanceof HTMLElement);
};

const findAnchorElementByKey = (key) => {
  const wanted = String(key || '');
  if (!wanted) return null;
  const nodes = getAnchorNodesInStatsMain();
  for (const el of nodes) {
    if (el instanceof HTMLElement && el.dataset.scrollAnchor === wanted) return el;
  }
  return null;
};

const getViewportCenterAnchorElement = (host) => {
  if (!(host instanceof HTMLElement)) return null;
  const hostRect = host.getBoundingClientRect();
  if (hostRect.width <= 2 || hostRect.height <= 2) return null;

  const nodes = getAnchorNodesInStatsMain();
  const topEdge = hostRect.top + 24;
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) continue;
    if (rect.bottom <= topEdge || rect.top >= hostRect.bottom) continue;
    return node;
  }
  return null;
};

const snapshotViewportAnchor = () => {
  const host = getScrollContainer();
  const hostRect = host.getBoundingClientRect();
  const centerAnchorEl = getViewportCenterAnchorElement(host);
  const anchorEl = centerAnchorEl;
  const anchorRect = anchorEl ? anchorEl.getBoundingClientRect() : null;
  const anchorTop = anchorRect ? (anchorRect.top - hostRect.top) : 0;
  return {
    anchorEl,
    anchorKey: anchorEl?.dataset?.scrollAnchor || '',
    hasAnchor: !!anchorEl,
    anchorTop,
    scrollTop: host.scrollTop
  };
};

const restoreViewportAnchor = (snapshot) => {
  if (!snapshot) return;
  const host = getScrollContainer();
  const hostRect = host.getBoundingClientRect();
  const clampTop = (top) => {
    const maxTop = Math.max(0, host.scrollHeight - host.clientHeight);
    return Math.max(0, Math.min(maxTop, top));
  };
  const connectedSnapshotAnchor = snapshot.anchorEl instanceof HTMLElement && snapshot.anchorEl.isConnected
    ? snapshot.anchorEl
    : null;
  const anchorEl = connectedSnapshotAnchor || findAnchorElementByKey(snapshot.anchorKey);
  if (snapshot.hasAnchor && anchorEl) {
    const afterRect = anchorEl.getBoundingClientRect();
    const afterTop = afterRect.top - hostRect.top;
    const nextTop = snapshot.scrollTop + (afterTop - snapshot.anchorTop);
    host.scrollTop = clampTop(nextTop);
    return;
  }
  // Keep absolute top when no anchor is available to avoid height-ratio jumps.
  host.scrollTop = clampTop(snapshot.scrollTop);
};

const rememberViewportAnchor = () => {
  lastViewportAnchorSnapshot = snapshotViewportAnchor();
};

const handleViewportScroll = () => {
  rememberViewportAnchor();
  scheduleNavSync();
};

const bindViewportScrollTracking = () => {
  const host = getScrollContainer();
  if (viewportScrollHost && viewportScrollHost !== host) {
    viewportScrollHost.removeEventListener('scroll', handleViewportScroll);
  }
  viewportScrollHost = host;
  viewportScrollHost.addEventListener('scroll', handleViewportScroll, { passive: true });
};

const handleWindowResize = () => {
  const snapshot = snapshotViewportAnchor();
  if (resizeViewportRaf) cancelAnimationFrame(resizeViewportRaf);
  resizeViewportRaf = requestAnimationFrame(() => {
    resizeViewportRaf = 0;
    updateMobileNavState();
    void (async () => {
      await nextTick();
      await waitNextPaint();
      restoreViewportAnchor(snapshot);
      rememberViewportAnchor();
      scheduleNavSync();
    })();
  });
};

const withPreservedScrollCenter = async (applyChange) => {
  const snapshot = snapshotViewportAnchor();
  applyChange();
  await nextTick();
  restoreViewportAnchor(snapshot);
  rememberViewportAnchor();
  scheduleNavSync();
};

const withLockedViewportAnchor = async (applyChange) => {
  const snapshot = snapshotViewportAnchor();
  applyChange();
  await nextTick();
  restoreViewportAnchor(snapshot);
  rememberViewportAnchor();
  scheduleNavSync();
};

const clampHostScrollTop = (host, top) => {
  if (!(host instanceof HTMLElement)) return 0;
  const maxTop = Math.max(0, host.scrollHeight - host.clientHeight);
  return Math.max(0, Math.min(maxTop, top));
};

const withPinnedElementPosition = async (targetEl, applyChange) => {
  const snapshot = snapshotViewportAnchor();
  const pinnedEl = targetEl instanceof HTMLElement ? targetEl : null;
  const beforeHost = getScrollContainer();
  const beforeHostRect = beforeHost.getBoundingClientRect();
  const pinnedTop = pinnedEl
    ? (pinnedEl.getBoundingClientRect().top - beforeHostRect.top)
    : null;

  const restoreByPinnedElement = () => {
    if (!(pinnedEl instanceof HTMLElement) || !pinnedEl.isConnected || !Number.isFinite(pinnedTop)) {
      return false;
    }
    const host = getScrollContainer();
    const hostRect = host.getBoundingClientRect();
    const afterTop = pinnedEl.getBoundingClientRect().top - hostRect.top;
    const nextTop = host.scrollTop + (afterTop - pinnedTop);
    host.scrollTop = clampHostScrollTop(host, nextTop);
    return true;
  };

  applyChange();
  await nextTick();
  const restored = restoreByPinnedElement();
  if (!restored) {
    restoreViewportAnchor(snapshot);
  }

  rememberViewportAnchor();
  scheduleNavSync();
};

const withPreservedScrollTop = async (applyChange) => {
  const host = getScrollContainer();
  const beforeTop = host.scrollTop;
  applyChange();
  await nextTick();
  const nextHost = getScrollContainer();
  nextHost.scrollTop = clampHostScrollTop(nextHost, beforeTop);
  rememberViewportAnchor();
  scheduleNavSync();
};

const getLayoutAnchorForNavToggle = () => {
  const activeId = String(activeNavId.value || '').trim();
  if (activeId) {
    const activeEl = document.getElementById(activeId);
    if (activeEl instanceof HTMLElement) {
      return { anchorId: activeId, anchorEl: activeEl };
    }
  }

  const fallbackAnchor = getViewportCenterAnchorElement(getScrollContainer());
  if (fallbackAnchor instanceof HTMLElement) {
    return {
      anchorId: String(fallbackAnchor.id || '').trim(),
      anchorEl: fallbackAnchor
    };
  }

  return { anchorId: '', anchorEl: null };
};

const withNavAnchorPinnedPosition = async (applyChange) => {
  const host = getScrollContainer();
  const hostRect = host.getBoundingClientRect();
  const { anchorId, anchorEl } = getLayoutAnchorForNavToggle();
  const beforeAnchor = anchorEl instanceof HTMLElement ? anchorEl : null;

  if (!(beforeAnchor instanceof HTMLElement)) {
    await withPreservedScrollTop(applyChange);
    return;
  }

  const beforeTop = beforeAnchor.getBoundingClientRect().top - hostRect.top;
  applyChange();
  await nextTick();

  const nextHost = getScrollContainer();
  const nextHostRect = nextHost.getBoundingClientRect();
  const afterAnchor = anchorId
    ? document.getElementById(anchorId)
    : (beforeAnchor.isConnected ? beforeAnchor : null);

  if (afterAnchor instanceof HTMLElement) {
    const afterTop = afterAnchor.getBoundingClientRect().top - nextHostRect.top;
    const nextTop = nextHost.scrollTop + (afterTop - beforeTop);
    nextHost.scrollTop = clampHostScrollTop(nextHost, nextTop);
  }

  rememberViewportAnchor();
  scheduleNavSync();
};

const rememberInteractiveAnchorFromEvent = (event) => {
  const target = event?.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.closest('.stats-nav')) return;

  const interactive = target.closest('button, input[type="checkbox"], input[type="radio"], select');
  if (!(interactive instanceof HTMLElement)) return;

  lastInteractiveAnchorEl = interactive;
  lastInteractiveAt = Date.now();
};

const consumeRecentInteractiveAnchor = (maxAgeMs = 1200) => {
  if (!(lastInteractiveAnchorEl instanceof HTMLElement)) return null;
  if (!lastInteractiveAnchorEl.isConnected) {
    lastInteractiveAnchorEl = null;
    return null;
  }
  if (Date.now() - lastInteractiveAt > maxAgeMs) {
    lastInteractiveAnchorEl = null;
    return null;
  }
  return lastInteractiveAnchorEl;
};

const withInteractionPinnedPosition = async (applyChange, explicitTarget = null) => {
  const target = explicitTarget instanceof HTMLElement ? explicitTarget : consumeRecentInteractiveAnchor();
  if (target instanceof HTMLElement) {
    await withPinnedElementPosition(target, applyChange);
    return;
  }
  await withInfoAreaTopLeftPinned(applyChange);
};

const withInfoAreaTopLeftPinned = async (applyChange) => {
  await withNavAnchorPinnedPosition(applyChange);
};

const onVsSongImageModeChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    vsSongImageMode.value = checked;
  }, anchorEl);
};

const onOcBookImageModeChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    ocBookImageMode.value = checked;
  }, anchorEl);
};

const onAnotherImageModeChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    anotherImageMode.value = checked;
  }, anchorEl);
};

const onDuoImageModeChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    duoImageMode.value = checked;
  }, anchorEl);
};

const setNavCollapsed = (nextCollapsed, preserveCenter = true) => {
  const next = !!nextCollapsed;
  if (navCollapsed.value === next) return;
  if (!next) {
    resetMobileNavGroupExpansion();
  }
  if (!preserveCenter) {
    navCollapsed.value = next;
    return;
  }
  void withInfoAreaTopLeftPinned(() => {
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
    if (isTopLayout) {
      resetMobileNavGroupExpansion();
    }
  };

  if (needPreserve) {
    void withInfoAreaTopLeftPinned(applyState);
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

const scrollToSection = (id, options = {}) => {
  const collapseOnMobile = options?.collapseOnMobile !== false;
  const el = document.getElementById(id);
  if (!el) return;
  activeNavId.value = id;
  const host = getScrollContainer();
  const hostRect = host.getBoundingClientRect();
  const targetRect = el.getBoundingClientRect();
  const nextTop = host.scrollTop + (targetRect.top - hostRect.top) - 8;
  host.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
  scheduleNavSync();
  if (isNavTopLayout.value && collapseOnMobile) {
    setNavCollapsed(true, false);
  }
};

const handleParentNavClick = (group) => {
  const groupId = String(group?.id || '').trim();
  if (!groupId) return;
  const hasChildren = Array.isArray(group?.children) && group.children.length > 0;

  if (isNavTopLayout.value) {
    if (hasChildren) {
      mobileNavExpandedGroups.value = {
        [groupId]: true
      };
      scrollToSection(groupId, { collapseOnMobile: false });
      return;
    }

    resetMobileNavGroupExpansion();
    scrollToSection(groupId, { collapseOnMobile: true });
    return;
  }

  scrollToSection(groupId);
};

const handleChildNavClick = (_group, item) => {
  const itemId = String(item?.id || '').trim();
  if (!itemId) return;
  scrollToSection(itemId, { collapseOnMobile: true });
  if (isNavTopLayout.value) {
    resetMobileNavGroupExpansion();
  }
};

const backToSongHome = (event = null) => {
  if (currentSongPage.value <= 1) return;
  const anchorEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  void withInteractionPinnedPosition(() => {
    currentSongPage.value = 1;
  }, anchorEl);
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
  const host = getScrollContainer();
  const observerRoot = host instanceof HTMLElement && host !== document.documentElement ? host : null;

  if (typeof IntersectionObserver === 'undefined') {
    scheduleNavSync();
    return;
  }

  try {
    sectionObserver = new IntersectionObserver(() => {
      scheduleNavSync();
    }, {
      root: observerRoot,
      rootMargin: '-10% 0px -75% 0px',
      threshold: [0, 0.01, 0.1]
    });
  } catch (_) {
    sectionObserver = new IntersectionObserver(() => {
      scheduleNavSync();
    }, {
      root: null,
      rootMargin: '-10% 0px -75% 0px',
      threshold: [0, 0.01, 0.1]
    });
  }

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLElement)) return;
    if (observerRoot instanceof HTMLElement && !observerRoot.contains(el)) return;
    sectionObserver.observe(el);
  });

  scheduleNavSync();
};

onMounted(() => {
  updateMobileNavState();
  window.addEventListener('resize', handleWindowResize);
  bindViewportScrollTracking();
  const localRoot = songStatsRootRef.value;
  const statsMain = localRoot instanceof HTMLElement ? localRoot.querySelector('.stats-main') : null;
  if (statsMain instanceof HTMLElement) {
    statsMainInteractionHost = statsMain;
    statsMainInteractionHost.addEventListener('pointerdown', rememberInteractiveAnchorFromEvent, true);
    statsMainInteractionHost.addEventListener('keydown', rememberInteractiveAnchorFromEvent, true);
  }
  rememberViewportAnchor();
  scheduleNavSync();
  if (typeof ResizeObserver !== 'undefined') {
    duoPairGridResizeObserver = new ResizeObserver(() => {
      scheduleRecalcDuoPairGridColumns();
    });
    duoPairGridRefMap.forEach((el) => {
      if (el instanceof HTMLElement) duoPairGridResizeObserver.observe(el);
    });
    songTableResizeObserver = new ResizeObserver(() => {
      recalcSongTableOverflow();
    });
    if (songListWrapRef.value instanceof HTMLElement) {
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
  if (statsMainInteractionHost instanceof HTMLElement) {
    statsMainInteractionHost.removeEventListener('pointerdown', rememberInteractiveAnchorFromEvent, true);
    statsMainInteractionHost.removeEventListener('keydown', rememberInteractiveAnchorFromEvent, true);
    statsMainInteractionHost = null;
  }
  lastInteractiveAnchorEl = null;
  lastInteractiveAt = 0;
  if (viewportScrollHost) {
    viewportScrollHost.removeEventListener('scroll', handleViewportScroll);
    viewportScrollHost = null;
  }
  if (songImageTitleToastTimer) {
    clearTimeout(songImageTitleToastTimer);
    songImageTitleToastTimer = 0;
  }
  if (typeof screenshotModalCancelTask.value === 'function') {
    screenshotModalCancelTask.value();
  }
  clearScreenshotModalAutoClose();
  screenshotModalRetryTask.value = null;
  screenshotModalCancelTask.value = null;
  if (navSyncRaf) {
    cancelAnimationFrame(navSyncRaf);
    navSyncRaf = 0;
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

const parseSlashDateOrder = (raw) => {
  const text = String(raw || '').trim();
  const match = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return Number.MAX_SAFE_INTEGER;
  if (month < 1 || month > 12 || day < 1 || day > 31) return Number.MAX_SAFE_INTEGER;
  return year * 10000 + month * 100 + day;
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
const normalizeSearchText = (value) => String(value || '').trim().toLowerCase();
const normalizeSearchHiragana = (value) => toHiragana(String(value || '').trim()).toLowerCase();
const normalizeSearchRomaji = (value) => toRomaji(toHiragana(String(value || '').trim()))
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const normalizeGroupKey = (value) => {
  const key = normalizeCategoryKey(value);
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
  return buildOrderedGroupKeys(groupKeysRaw)
    .map((key) => {
      if (key === 'vs') {
        return { key, kind: 'logo', label: 'VS', icon: UNIT_TAG_ICON_MAP.vs };
      }

      if (key === 'vocaloid') {
        return null;
      }

      if (Object.prototype.hasOwnProperty.call(UNIT_TAG_ICON_MAP, key)) {
        return { key, kind: 'logo', label: key.toUpperCase(), icon: UNIT_TAG_ICON_MAP[key] };
      }

      if (key === 'other') {
        return { key, kind: 'other', label: '其他' };
      }

      return { key, kind: 'text', label: key.toUpperCase() };
    })
    .filter(Boolean);
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
  const title = String(row?.title || '').trim();
  const composer = String(row?.composer || '').trim();
  const lyricist = String(row?.lyricist || '').trim();
  const arranger = String(row?.arranger || '').trim();
  const pronunciation = String(row?.pronunciation || '').trim();
  const categories = Array.isArray(row?.categories)
    ? row.categories.map((c) => String(c || '').trim()).filter(Boolean)
    : [];
  const unitsRaw = Array.isArray(row?.units) ? row.units : [];
  const unitKeys = unitsRaw.map((tag) => normalizeCategoryKey(tag)).filter(Boolean);
  const groupKeys = buildOrderedGroupKeys(unitsRaw);
  const localJacketUrl = buildLocalSongJacketUrl(row?.id);

  return {
    id: row?.id ?? '-',
    songIdNum: Number.isFinite(idNum) ? idNum : null,
    isDeletedSong: Number.isFinite(idNum) && DELETED_SONG_ID_SET.has(idNum),
    title,
    pronunciation,
    pronunciationHiragana: normalizeSearchHiragana(pronunciation),
    pronunciationRomaji: normalizeSearchRomaji(pronunciation),
    composer,
    lyricist,
    arranger,
    searchTitle: normalizeSearchText(title),
    searchComposer: normalizeSearchText(composer),
    searchLyricist: normalizeSearchText(lyricist),
    searchArranger: normalizeSearchText(arranger),
    difficulties: row?.difficulties && typeof row.difficulties === 'object' ? row.difficulties : {},
    unitKeys,
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

const hasSongAppendDifficulty = (song) => !isSongDifficultyMissing(song, 'append');

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
      tagNumber: makeSongTagNumber(ev),
      tagIcon: getCharacterAvatarSrc(bannerName),
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
    const total3d = unit3dCounts.ln + unit3dCounts.mmj + unit3dCounts.vbs + unit3dCounts.ws + unit3dCounts.nc;
    const total2d = songsList.length - total3d;

    return {
      name,
      avatar: getCharacterAvatarSrc(name),
      tint: mixHexWithWhite(getCharacterColor(name), SONG_STAT_CARD_TINT_ALPHA),
      count: songsList.length,
      songs: songsList,
      unitCounts,
      unit3dCounts,
      unit2dCounts,
      total2d,
      total3d
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
  void withInteractionPinnedPosition(() => {
    const shouldExpandAll = cards.every((card) => getVsSongCardMode(card.name) === 'collapsed');
    const nextMode = shouldExpandAll ? 'expanded' : 'collapsed';
    const next = {};
    cards.forEach((card) => {
      next[card.name] = nextMode;
    });
    vsSongCardModeMap.value = next;
  });
};

const toggleAllOcBookExpandCollapse = () => {
  const groups = ocBookStatsByUnit.value;
  if (!groups.length) return;
  void withInteractionPinnedPosition(() => {
    const shouldExpandAll = groups.every((group) => !isOcBookUnitExpanded(group.unit));
    const next = {};
    groups.forEach((group) => {
      next[group.unit] = shouldExpandAll;
    });
    ocBookUnitExpandedMap.value = next;
  });
};

const toggleOcBookUnitExpandCollapse = (unit) => {
  const key = String(unit || '');
  if (!key) return;
  void withInteractionPinnedPosition(() => {
    ocBookUnitExpandedMap.value = {
      ...ocBookUnitExpandedMap.value,
      [key]: !isOcBookUnitExpanded(key)
    };
  });
};

const toggleVsSongCardExpandCollapse = (name) => {
  const key = String(name || '');
  if (!key) return;
  void withInteractionPinnedPosition(() => {
    const current = getVsSongCardMode(key);
    const nextMode = current === 'collapsed' ? 'expanded' : 'collapsed';
    vsSongCardModeMap.value = {
      ...vsSongCardModeMap.value,
      [key]: nextMode
    };
  });
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

const isCoreUniqueSongForUnit = (song, unitKey) => {
  if (!song.unitKeys.includes(unitKey)) return false;
  return !CORE_UNIT_KEYS.some((coreKey) => coreKey !== unitKey && song.unitKeys.includes(coreKey));
};

const ocUniqueStats = computed(() => {
  const rows = [
    {
      unit: 'vs',
      isUniqueSong: (song) => isCoreUniqueSongForUnit(song, 'vs'),
      has2d: (song) => song.categoryKeys.includes('2dmv') || song.categoryKeys.includes('vs_2dmv')
    },
    ...OC_UNIT_OPTIONS.map((item) => ({
      unit: item.key,
      isUniqueSong: (song) => isCoreUniqueSongForUnit(song, item.key),
      has2d: (song) => song.categoryKeys.includes('2dmv')
    }))
  ];

  return rows.map((row) => {
    const uniqueSongs = songsForStats.value.filter((song) => row.isUniqueSong(song));
    const with2dCount = uniqueSongs.filter((song) => row.has2d(song)).length;
    const with3dCount = uniqueSongs.filter((song) => song.categoryKeys.includes('3dmv')).length;
    const withApdCount = uniqueSongs.filter((song) => hasSongAppendDifficulty(song)).length;

    return {
      unit: row.unit,
      uniqueCount: uniqueSongs.length,
      with2dCount,
      with3dCount,
      withApdCount
    };
  });
});

const anotherVocalCards = computed(() => {
  const rowMap = new Map();

  songsForStats.value.forEach((song) => {
    song.vocals.forEach((vocal) => {
      if (normalizeCategoryKey(vocal?.type) !== 'another_vocal') return;
      const vocalId = normalizeSongId(vocal?.vocal_id);
      const releasedAt = String(vocal?.released_at || '').trim();
      const releasedAtOrder = parseSlashDateOrder(releasedAt);

      getKnownCharacters(vocal?.characters).forEach((charMeta) => {
        if (!rowMap.has(charMeta.name)) {
          rowMap.set(charMeta.name, { meta: charMeta, songs: new Map() });
        }

        const row = rowMap.get(charMeta.name);
        const songKey = `${song.id}-${song.title}`;
        const prev = row.songs.get(songKey);
        if (!prev || releasedAtOrder < prev.releasedAtOrder || (releasedAtOrder === prev.releasedAtOrder && vocalId < prev.vocalId)) {
          row.songs.set(songKey, {
            id: song.id,
            title: song.title || '-',
            jacketUrl: String(song.jacketUrl || '').trim(),
            vocalId,
            releasedAt,
            releasedAtOrder,
            isDeletedSong: song.isDeletedSong
          });
        }
      });
    });
  });

  return Array.from(rowMap.values())
    .map((row) => {
      const songsList = Array.from(row.songs.values()).sort((a, b) => {
        if (a.releasedAtOrder !== b.releasedAtOrder) return a.releasedAtOrder - b.releasedAtOrder;
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
  void withInteractionPinnedPosition(() => {
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
  });
};

const setAllAnotherFixedMode = () => {
  const cards = anotherVocalCards.value;
  if (cards.length === 0) return;
  void withInteractionPinnedPosition(() => {
    const next = {};
    cards.forEach((card) => {
      next[card.name] = 'fixed';
    });
    anotherCardModeMap.value = next;
  });
};

const toggleAnotherCardExpandCollapse = (name) => {
  void withInteractionPinnedPosition(() => {
    const current = getAnotherCardMode(name);
    const nextMode = current === 'collapsed' ? 'expanded' : (current === 'fixed' ? 'expanded' : 'collapsed');
    anotherCardModeMap.value = {
      ...anotherCardModeMap.value,
      [name]: nextMode
    };
  });
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
          let matchedPairVocal = null;

          song.vocals.forEach((vocal) => {
            if (normalizeCategoryKey(vocal?.type) !== 'sekai') return;

            const ocChars = getKnownCharacters(vocal?.characters).filter((char) => OC_UNIT_KEYS.includes(char.unit));
            const uniqOcChars = Array.from(new Map(ocChars.map((char) => [char.name, char])).values());
            if (uniqOcChars.length !== 2) return;
            if (!uniqOcChars.every((char) => char.unit === unitKey)) return;

            const names = uniqOcChars.map((char) => char.name).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
            if (names[0] !== pairNames[0] || names[1] !== pairNames[1]) return;

            const vsNames = getKnownCharacters(vocal?.characters)
              .filter((char) => char.unit === 'vs')
              .sort((a, b) => a.order - b.order)
              .map((char) => char.name)
              .slice(0, 2);

            const vocalSortId = normalizeSongId(vocal?.vocal_id);
            if (!matchedPairVocal || vocalSortId < matchedPairVocal.vocalSortId) {
              matchedPairVocal = { vocalSortId, vsNames };
              return;
            }

            if (vocalSortId === matchedPairVocal.vocalSortId && vsNames.length > matchedPairVocal.vsNames.length) {
              matchedPairVocal = { vocalSortId, vsNames };
            }
          });

          if (!matchedPairVocal) return;
          songMap.set(`${song.id}-${song.title}`, {
            id: song.id,
            title: song.title || '-',
            jacketUrl: song.jacketUrl || '',
            vsIcons: buildVsIconsFromNames(matchedPairVocal.vsNames),
            has2d: hasSong2DMVCategory(song),
            has3d: hasSong3DMVCategory(song)
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
  void withInteractionPinnedPosition(() => {
    const shouldExpandAll = keys.every((key) => !isDuoCardExpanded(key));
    const next = {};
    keys.forEach((key) => {
      next[key] = shouldExpandAll;
    });
    duoCardExpandedMap.value = next;
  });
};

const toggleDuoCardExpandCollapse = (key) => {
  void withInteractionPinnedPosition(() => {
    duoCardExpandedMap.value = {
      ...duoCardExpandedMap.value,
      [key]: !isDuoCardExpanded(key)
    };
  });
};

const filteredSongs = computed(() => {
  const rawKeyword = String(keyword.value || '').trim();
  const key = normalizeSearchText(rawKeyword);
  const keyHiragana = normalizeSearchHiragana(rawKeyword);
  const keyRomaji = normalizeSearchRomaji(rawKeyword);
  const isIdSearch = key.startsWith('#');
  const idQuery = isIdSearch ? key.slice(1).trim() : '';
  const mv = mvFilter.value;
  const group = groupFilter.value;
  const sortKey = difficultySortKey.value;
  const sortMode = difficultySortMode.value;

  const filtered = songs.value.filter((song) => {
    let textHit = false;
    if (!key) {
      textHit = true;
    } else if (isIdSearch) {
      textHit = idQuery ? String(song.id).toLowerCase().includes(idQuery) : true;
    } else {
      textHit = song.searchTitle.includes(key)
        || song.searchComposer.includes(key)
        || song.searchLyricist.includes(key)
        || song.searchArranger.includes(key)
        || (keyHiragana && song.pronunciationHiragana.includes(keyHiragana))
        || (keyRomaji && song.pronunciationRomaji.includes(keyRomaji));
    }
    if (!textHit) return false;

    if (mv === '3d' && !song.categoryKeys.includes('3dmv')) return false;
    if (mv === '2d' && !song.categoryKeys.includes('2dmv') && !song.categoryKeys.includes('vs_2dmv')) return false;
    if (mv === 'vs2d' && !song.categoryKeys.includes('vs_2dmv')) return false;
    if (mv === 'original' && !song.categoryKeys.includes('original')) return false;

    if (sortKey === 'append' && isSongDifficultyMissing(song, 'append')) return false;

    if (group !== 'all' && !song.groupKeys.includes(group)) return false;
    return true;
  });

  if (!sortKey) {
    if (sortMode === 'desc') {
      return [...filtered].sort((a, b) => normalizeSongId(b.id) - normalizeSongId(a.id));
    }
    return [...filtered].sort((a, b) => normalizeSongId(a.id) - normalizeSongId(b.id));
  }

  if (sortMode === 'none') {
    return [...filtered].sort((a, b) => normalizeSongId(a.id) - normalizeSongId(b.id));
  }

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
      return sortMode === 'asc' ? diffA - diffB : diffB - diffA;
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

const changeSongPage = (delta, event = null) => {
  const next = currentSongPage.value + delta;
  if (next < 1 || next > totalSongPages.value) return;
  const anchorEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  void withInteractionPinnedPosition(() => {
    currentSongPage.value = next;
  }, anchorEl);
};

const onSongJacketError = (event) => {
  const img = event?.target;
  if (!(img instanceof HTMLImageElement)) return;
  if (img.dataset.failed === '1') return;
  img.dataset.loaded = '1';
  img.dataset.failed = '1';
  img.style.display = 'none';
  const holder = img.closest('.song-jacket-media');
  if (holder instanceof HTMLElement) {
    holder.classList.add('is-failed');
  }
};

const onSongJacketLoad = (event) => {
  const img = event?.target;
  if (!(img instanceof HTMLImageElement)) return;
  img.dataset.loaded = '1';
  img.style.display = '';
  const holder = img.closest('.song-jacket-media');
  if (holder instanceof HTMLElement) {
    holder.classList.remove('is-failed');
  }
};

const showSongImageTitle = (event, rawTitle) => {
  const nextTitle = String(rawTitle || '').trim() || '-';
  const targetEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 720;
  const estimatedWidth = Math.min(320, Math.max(140, Math.ceil(nextTitle.length * 14)));
  const estimatedHeight = 34;

  let left = Math.max(8, Math.floor((viewportWidth - estimatedWidth) / 2));
  let top = Math.max(8, viewportHeight - estimatedHeight - 20);

  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const preferRightLeft = rect.right + 10;
    const preferLeftLeft = rect.left - estimatedWidth - 10;
    left = preferRightLeft + estimatedWidth <= viewportWidth - 8
      ? preferRightLeft
      : Math.max(8, preferLeftLeft);
    top = rect.top + rect.height / 2 - estimatedHeight / 2;
  }

  left = Math.max(8, Math.min(viewportWidth - estimatedWidth - 8, left));
  top = Math.max(8, Math.min(viewportHeight - estimatedHeight - 8, top));

  songImageTitleToast.value = {
    text: nextTitle,
    left: Math.round(left),
    top: Math.round(top)
  };
  if (songImageTitleToastTimer) {
    clearTimeout(songImageTitleToastTimer);
  }
  songImageTitleToastTimer = setTimeout(() => {
    songImageTitleToast.value = null;
    songImageTitleToastTimer = 0;
  }, 1600);
};

const waitNextPaint = () => new Promise((resolve) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(resolve);
  });
});

const clearScreenshotModalAutoClose = () => {
  if (!screenshotModalAutoCloseTimer) return;
  clearTimeout(screenshotModalAutoCloseTimer);
  screenshotModalAutoCloseTimer = 0;
};

const setScreenshotModalState = ({ state = 'capturing', title = '', message = '', retryTask = null, cancelTask = null, autoCloseMs = 0 } = {}) => {
  clearScreenshotModalAutoClose();
  screenshotModalVisible.value = true;
  screenshotModalState.value = state;
  screenshotModalTitle.value = title;
  screenshotModalMessage.value = message;
  screenshotModalRetryTask.value = typeof retryTask === 'function' ? retryTask : null;
  screenshotModalCancelTask.value = typeof cancelTask === 'function' ? cancelTask : null;
  if (autoCloseMs > 0) {
    screenshotModalAutoCloseTimer = setTimeout(() => {
      if (!isExportingPng.value) {
        screenshotModalVisible.value = false;
      }
      screenshotModalAutoCloseTimer = 0;
    }, autoCloseMs);
  }
};

const closeScreenshotModal = () => {
  if (isExportingPng.value && screenshotModalState.value !== 'failed') return;
  clearScreenshotModalAutoClose();
  screenshotModalVisible.value = false;
  screenshotModalState.value = 'idle';
  screenshotModalTitle.value = '';
  screenshotModalMessage.value = '';
  screenshotModalRetryTask.value = null;
  screenshotModalCancelTask.value = null;
};

const forceCancelScreenshotExport = () => {
  const task = screenshotModalCancelTask.value;
  if (typeof task === 'function') {
    task();
  }
  isExportingPng.value = false;
  clearScreenshotModalAutoClose();
  screenshotModalVisible.value = false;
  screenshotModalState.value = 'idle';
  screenshotModalTitle.value = '';
  screenshotModalMessage.value = '';
  screenshotModalRetryTask.value = null;
  screenshotModalCancelTask.value = null;
};

const retryScreenshotExport = async () => {
  if (isExportingPng.value) return;
  const task = screenshotModalRetryTask.value;
  if (typeof task !== 'function') return;
  screenshotModalRetryTask.value = null;
  await task();
};

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

const getCaptureDeviceTier = () => {
  const width = Number(window?.innerWidth || 0);
  const height = Number(window?.innerHeight || 0);
  const minSide = Math.min(width || Number.MAX_SAFE_INTEGER, height || Number.MAX_SAFE_INTEGER);
  if (width <= 900) {
    if (minSide >= 680) return 'tablet';
    return 'phone';
  }
  return 'desktop';
};

const buildSongExportScaleCandidates = (preferredScale, isMobileScreen) => {
  const baseScale = Number.isFinite(preferredScale) && preferredScale > 0 ? preferredScale : 1;
  const ladder = isMobileScreen
    ? [baseScale, Math.min(baseScale, 1.3), 1.1, 1]
    : [baseScale, Math.min(baseScale, 1.9), 1.45, 1.2, 1];
  const seen = new Set();
  return ladder
    .map((value) => Math.max(1, Number(value.toFixed(2))))
    .filter((value) => {
      const key = String(value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const countHeavyMediaNodes = (rootEl) => {
  if (!(rootEl instanceof HTMLElement)) return 0;
  const mediaNodes = rootEl.querySelectorAll('img');
  let heavy = 0;
  mediaNodes.forEach((img) => {
    const src = String(img?.getAttribute('src') || img?.currentSrc || '').toLowerCase();
    const cls = String(img?.className || '').toLowerCase();
    const isIconLike = src.includes('/icon/') || cls.includes('icon') || cls.includes('badge') || cls.includes('chip');
    if (isIconLike) return;
    if (src.includes('/cards/') || (src.includes('/songs/') && !src.includes('/icon/')) || cls.includes('card') || cls.includes('jacket')) {
      heavy += 1;
    }
  });
  return heavy;
};

const buildSongAdaptiveScaleCandidates = (preferredScale, deviceTier, heavyMediaCount) => {
  const isMobileScreen = deviceTier !== 'desktop';
  const base = buildSongExportScaleCandidates(preferredScale, isMobileScreen);
  if (heavyMediaCount < 18) return base;

  const seen = new Set();
  const targeted = (deviceTier === 'phone' || deviceTier === 'tablet'
    ? [Math.max(1.7, Math.min(base[0] || 2, 2.0)), 1.55, 1.38, 1.2]
    : [Math.max(1.95, base[0] || 2), Math.max(1.8, Math.min(base[0] || 2, 2.2)), 1.65, 1.35]
  )
    .map((value) => Math.max(1, Number(value.toFixed(2))))
    .filter((value) => {
      const key = String(value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return targeted.length ? targeted : base;
};

const buildSongCaptureProfile = ({ deviceTier, heavyMediaCount }) => {
  const preferredScale = 2.0;
  const scales = buildSongAdaptiveScaleCandidates(preferredScale, deviceTier, heavyMediaCount);
  const baseScale = Number(scales[0] || preferredScale || 1);
  return {
    preferredScale,
    scales,
    baseScale
  };
};

const buildSongCaptureMessage = (exportLabel, baseScale) => {
  const scale = Number(baseScale || 1);
  return `正在导出「${exportLabel}」... 基础清晰度 x${scale.toFixed(2)}`;
};

const computeRenderTimeoutMs = ({ deviceTier, heavyMediaCount, width, height, scale }) => {
  const totalMegaPixels = (Math.max(1, width) * Math.max(1, height) * Math.max(1, scale) * Math.max(1, scale)) / 1000000;
  const heavyBoost = heavyMediaCount >= 18 ? 1200 : 0;
  if (totalMegaPixels <= 4) return 4200 + heavyBoost;
  if (totalMegaPixels <= 8) return 5600 + heavyBoost;
  if (totalMegaPixels <= 14) return 7200 + heavyBoost;
  if (totalMegaPixels <= 22) return 9000 + heavyBoost;
  if (totalMegaPixels <= 32) return 10800 + heavyBoost;
  const tierCap = deviceTier === 'phone' ? 14000 : (deviceTier === 'tablet' ? 15500 : 14500);
  return tierCap + heavyBoost;
};

const waitForSingleImageReady = (imgEl, timeoutMs = 2200) => new Promise((resolve) => {
  if (!(imgEl instanceof HTMLImageElement)) {
    resolve();
    return;
  }
  if (imgEl.complete) {
    resolve();
    return;
  }
  let done = false;
  let timer = 0;
  const finish = () => {
    if (done) return;
    done = true;
    imgEl.removeEventListener('load', finish);
    imgEl.removeEventListener('error', finish);
    if (timer) clearTimeout(timer);
    resolve();
  };
  imgEl.addEventListener('load', finish, { once: true });
  imgEl.addEventListener('error', finish, { once: true });
  timer = window.setTimeout(finish, timeoutMs);
});

const waitForRenderableAssets = async (rootEl, options = {}) => {
  if (!(rootEl instanceof HTMLElement)) return;
  const maxWaitMs = Number(options?.maxWaitMs || 0) > 0 ? Number(options.maxWaitMs) : 2600;
  const maxImages = Number(options?.maxImages || 0) > 0 ? Number(options.maxImages) : 72;

  const fontReadyPromise = (document?.fonts?.ready && typeof document.fonts.ready.then === 'function')
    ? document.fonts.ready.catch(() => undefined)
    : Promise.resolve();
  const images = Array.from(rootEl.querySelectorAll('img')).slice(0, maxImages);
  const imageReadyPromise = Promise.allSettled(images.map((img) => waitForSingleImageReady(img, Math.min(2400, maxWaitMs))));

  await Promise.race([
    Promise.allSettled([fontReadyPromise, imageReadyPromise]),
    new Promise((resolve) => window.setTimeout(resolve, maxWaitMs))
  ]);
};

const syncCloneImagesWithSource = (sourceRoot, cloneRoot) => {
  if (!(sourceRoot instanceof HTMLElement) || !(cloneRoot instanceof HTMLElement)) return;
  const sourceImages = Array.from(sourceRoot.querySelectorAll('img'));
  const cloneImages = Array.from(cloneRoot.querySelectorAll('img'));
  const pairCount = Math.min(sourceImages.length, cloneImages.length);

  for (let idx = 0; idx < pairCount; idx += 1) {
    const sourceImg = sourceImages[idx];
    const cloneImg = cloneImages[idx];
    const sourceUrl = String(sourceImg?.currentSrc || sourceImg?.getAttribute('src') || sourceImg?.src || '').trim();

    cloneImg.setAttribute('loading', 'eager');
    cloneImg.setAttribute('decoding', 'sync');
    if ('fetchPriority' in cloneImg) {
      cloneImg.fetchPriority = 'high';
    }

    if (sourceUrl) {
      cloneImg.setAttribute('src', sourceUrl);
    }
    if (sourceImg?.dataset?.loaded === '1') {
      cloneImg.dataset.loaded = '1';
    }
    if (sourceImg?.dataset?.failed === '1') {
      cloneImg.dataset.failed = '1';
      cloneImg.style.display = 'none';
    }
  }

  for (let idx = pairCount; idx < cloneImages.length; idx += 1) {
    const cloneImg = cloneImages[idx];
    cloneImg.setAttribute('loading', 'eager');
    cloneImg.setAttribute('decoding', 'sync');
    if ('fetchPriority' in cloneImg) {
      cloneImg.fetchPriority = 'high';
    }
  }
};

const isRenderableSameOriginUrl = (rawUrl) => {
  const url = String(rawUrl || '').trim();
  if (!url) return true;
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) return true;
  if (url.startsWith('/')) return true;
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.origin === window.location.origin;
  } catch (_) {
    return true;
  }
};

const sanitizeSongCloneForExport = (cloneRoot) => {
  if (!(cloneRoot instanceof HTMLElement)) return;

  // html2canvas in static deployment is more fragile with sticky cells.
  cloneRoot.querySelectorAll('.song-table thead th, .song-list-wrap.is-h-scroll .song-table th:nth-child(2), .song-list-wrap.is-h-scroll .song-table td:nth-child(2)').forEach((cell) => {
    if (!(cell instanceof HTMLElement)) return;
    cell.style.position = 'static';
    cell.style.top = 'auto';
    cell.style.left = 'auto';
    cell.style.boxShadow = 'none';
  });

  // Disable shimmer animation in clone to avoid timing-related empty paints.
  cloneRoot.querySelectorAll('.media-load-shimmer').forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    node.style.animation = 'none';
    node.style.backgroundImage = 'none';
  });

  // Prevent tainted canvas by skipping off-origin images in export clone.
  cloneRoot.querySelectorAll('img').forEach((imgEl) => {
    const src = String(imgEl?.getAttribute('src') || imgEl?.currentSrc || '').trim();
    if (!src) return;
    if (isRenderableSameOriginUrl(src)) return;
    imgEl.dataset.failed = '1';
    imgEl.style.display = 'none';
  });
};

const withRenderTimeout = async (promise, timeoutMs, cancelPromise = null) => {
  let timer = 0;
  try {
    const raceTasks = [
      promise,
      new Promise((_, reject) => {
        timer = window.setTimeout(() => {
          reject(new Error(`render-timeout-${timeoutMs}`));
        }, timeoutMs);
      })
    ];
    if (cancelPromise) {
      raceTasks.push(cancelPromise.then(() => {
        throw new Error('export-cancelled');
      }));
    }
    return await Promise.race(raceTasks);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const waitPendingSongCaptureRenderTask = async () => {
  const pending = pendingSongCaptureRenderTask;
  if (!pending) return;
  try {
    await pending;
  } catch (_) {
    // Ignore previous render failure; caller handles current retry policy.
  }
};

const trackSongCaptureRenderTask = (taskPromise) => {
  const tracked = Promise.resolve(taskPromise).finally(() => {
    if (pendingSongCaptureRenderTask === tracked) {
      pendingSongCaptureRenderTask = null;
    }
  });
  pendingSongCaptureRenderTask = tracked;
  return tracked;
};

const createExportCancelContext = () => {
  let resolveCancel = null;
  let cancelled = false;
  const cancelPromise = new Promise((resolve) => {
    resolveCancel = resolve;
  });
  return {
    cancelPromise,
    isCancelled: () => cancelled,
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      if (typeof resolveCancel === 'function') {
        resolveCancel(true);
      }
    }
  };
};

const isExportCancelledError = (error) => String(error?.message || '').includes('export-cancelled');
const isRenderTimeoutError = (error) => /render-timeout-\d+/.test(String(error?.message || ''));
const isGithubPagesHost = () => /github\.io$/i.test(String(window?.location?.hostname || ''));

const copyCssCustomProperties = (sourceStyle, targetEl) => {
  if (!(sourceStyle instanceof CSSStyleDeclaration) || !(targetEl instanceof HTMLElement)) return;
  for (let i = 0; i < sourceStyle.length; i += 1) {
    const prop = sourceStyle[i];
    if (!String(prop || '').startsWith('--')) continue;
    const value = String(sourceStyle.getPropertyValue(prop) || '').trim();
    if (!value) continue;
    targetEl.style.setProperty(prop, value);
  }
};

const prepareSongExportClone = async (targetEl) => {
  if (!targetEl) return null;

  const rootEl = songStatsRootRef.value instanceof HTMLElement
    ? songStatsRootRef.value
    : targetEl.closest('.pjsk-song-stats');
  const rect = targetEl.getBoundingClientRect();
  const sourceStyle = window.getComputedStyle(targetEl);
  const rootStyle = rootEl instanceof HTMLElement ? window.getComputedStyle(rootEl) : null;
  const sourceRadiusVar = String(sourceStyle.getPropertyValue('--stats-radius-btn') || '').trim();
  const sourceBgColor = String(sourceStyle.backgroundColor || '').trim();
  const hasVisibleBg = sourceBgColor && sourceBgColor !== 'transparent' && sourceBgColor !== 'rgba(0, 0, 0, 0)';

  const clone = targetEl.cloneNode(true);
  clone.classList.add('song-export-clone-root');
  clone.style.position = 'fixed';
  clone.style.left = '-20000px';
  clone.style.top = '0';
  clone.style.margin = '0';
  clone.style.pointerEvents = 'none';
  clone.style.zIndex = '-1';
  clone.style.background = hasVisibleBg ? sourceBgColor : '#ffffff';
  clone.style.width = `${Math.max(1, Math.ceil(rect.width))}px`;
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';

  // SongStats 大量尺寸依赖根节点 CSS 变量，克隆到 body 后需要显式继承，
  // 否则会出现截图字号/卡片网格与屏幕不一致。
  copyCssCustomProperties(rootStyle, clone);
  copyCssCustomProperties(sourceStyle, clone);
  syncCloneImagesWithSource(targetEl, clone);
  sanitizeSongCloneForExport(clone);

  if (sourceRadiusVar) {
    clone.style.setProperty('--stats-radius-btn', sourceRadiusVar);
  }

  clone.querySelectorAll('.song-export-btn, .song-role-card-tools, .song-oc-event-unit-tools, .anvo-mode-switch').forEach((el) => {
    el.style.display = 'none';
  });
  clone.querySelectorAll('#panel-duo-stats .song-mini-icon-btn').forEach((el) => {
    el.style.display = 'none';
  });

  const scrollSelectors = [
    '.song-insight-scroll',
    '.song-role-list',
    '.song-vs-event-image-groups',
    '.song-duo-song-pair-grid',
    '.song-oc-event-members-grid'
  ].join(', ');
  const originalScrollBlocks = targetEl.querySelectorAll(scrollSelectors);
  const cloneScrollBlocks = clone.querySelectorAll(scrollSelectors);
  cloneScrollBlocks.forEach((block, idx) => {
    const source = originalScrollBlocks[idx];
    const fullHeight = source ? Math.max(source.scrollHeight, source.clientHeight) : Math.max(block.scrollHeight, block.clientHeight);
    block.style.maxHeight = 'none';
    block.style.height = `${Math.max(1, fullHeight)}px`;
    block.style.overflow = 'visible';
  });

  document.body.appendChild(clone);
  await waitNextPaint();
  return clone;
};

const getCaptureErrorText = (error) => {
  const message = String(error?.message || error || '').trim();
  const lower = message.toLowerCase();
  const timeoutMatch = message.match(/render-timeout-(\d+)/);
  if (timeoutMatch) {
    return { text: `渲染超时（>${timeoutMatch[1]}ms）`, retryable: true };
  }
  if (lower.includes('export-cancelled')) {
    return { text: '已取消截图', retryable: false };
  }
  if (lower.includes('tainted') || lower.includes('securityerror')) {
    return { text: '画布被跨域资源污染（tainted canvas）', retryable: false };
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return { text: '资源加载失败（网络或跨域）', retryable: true };
  }
  if (lower.includes('toblob failed') || lower.includes('无法生成 png')) {
    return { text: 'PNG 编码失败（toBlob）', retryable: true };
  }
  if (lower.includes('html2canvas failed')) {
    return { text: '渲染失败（html2canvas 无返回）', retryable: true };
  }
  if (!message) {
    return { text: '未知错误（无错误消息）', retryable: true };
  }
  return { text: `异常：${message}`, retryable: true };
};

const summarizeCaptureReasons = (reasons, max = 3) => {
  if (!Array.isArray(reasons) || reasons.length === 0) return '';
  const sliced = reasons.slice(0, max);
  const base = sliced.join('；');
  if (reasons.length > max) {
    return `${base}；其余 ${reasons.length - max} 次省略`;
  }
  return base;
};

const getSongExportFailedMessage = (reasons = []) => {
  const summary = summarizeCaptureReasons(reasons, 4);
  if (summary) {
    return `降级重试后仍失败。失败链路：${summary}`;
  }
  return '降级重试后仍失败。可能是渲染问题，再试一次没准行，这次你一定要成功。';
};

const exportElementPng = async (targetEl, title, options = {}) => {
  await waitPendingSongCaptureRenderTask();
  const exportLabel = String(options?.taskLabel || title || '当前模块');
  const deviceTier = getCaptureDeviceTier();
  const initialHeavyMediaCount = countHeavyMediaNodes(targetEl);
  const cancelContext = createExportCancelContext();
  const initialCaptureProfile = buildSongCaptureProfile({
    deviceTier,
    heavyMediaCount: initialHeavyMediaCount
  });
  setScreenshotModalState({
    state: options?.fromRetry ? 'retrying' : 'capturing',
    title: options?.fromRetry ? '重新截图中' : '截图中',
    message: buildSongCaptureMessage(exportLabel, initialCaptureProfile.baseScale),
    cancelTask: cancelContext.cancel
  });

  let cloneEl = null;
  const downgradeReasons = [];
  try {
    if (!options?.fromRetry && initialHeavyMediaCount > 0) {
      // 首轮导出先做一次资源预热，降低“第一次失败、第二次秒过”的概率。
      await waitForRenderableAssets(targetEl, {
        maxWaitMs: deviceTier === 'phone' ? 1800 : (deviceTier === 'tablet' ? 2200 : 1800),
        maxImages: Math.min(180, Math.max(40, initialHeavyMediaCount + 24))
      });
      await waitNextPaint();
      if (cancelContext.isCancelled()) {
        throw new Error('export-cancelled');
      }
    }

    cloneEl = await prepareSongExportClone(targetEl);
    if (cancelContext.isCancelled()) {
      throw new Error('export-cancelled');
    }
    const renderEl = cloneEl || targetEl;
    const width = Math.ceil(renderEl.scrollWidth || renderEl.clientWidth || 0);
    const height = Math.ceil(renderEl.scrollHeight || renderEl.clientHeight || 0);
    const isMobileScreen = deviceTier !== 'desktop';
    const heavyMediaCount = countHeavyMediaNodes(renderEl);
    await waitForRenderableAssets(renderEl, {
      maxWaitMs: heavyMediaCount >= 18
        ? (deviceTier === 'phone' ? 2400 : (deviceTier === 'tablet' ? 2800 : 2400))
        : (deviceTier === 'phone' ? 1200 : (deviceTier === 'tablet' ? 1500 : 1200)),
      maxImages: isMobileScreen ? 140 : 180
    });
    if (cancelContext.isCancelled()) {
      throw new Error('export-cancelled');
    }
    const captureProfile = buildSongCaptureProfile({
      deviceTier,
      heavyMediaCount
    });
    const scales = captureProfile.scales;
    const baseScale = captureProfile.baseScale;
    setScreenshotModalState({
      state: options?.fromRetry ? 'retrying' : 'capturing',
      title: options?.fromRetry ? '重新截图中' : '截图中',
      message: buildSongCaptureMessage(exportLabel, baseScale),
      cancelTask: cancelContext.cancel
    });
    let canvas = null;
    let lastError = null;

    for (let idx = 0; idx < scales.length; idx += 1) {
      const scale = scales[idx];
      if (idx > 0) {
        const prevReason = downgradeReasons[downgradeReasons.length - 1] || '';
        setScreenshotModalState({
          state: 'retrying',
          title: '失败降级重试中',
          message: `截图失败，正在降级到清晰度 x${scale.toFixed(2)} 重试（${idx}/${scales.length - 1}）...${prevReason ? ` 上次失败原因：${prevReason}` : ''}`,
          cancelTask: cancelContext.cancel
        });
        await waitNextPaint();
        if (cancelContext.isCancelled()) {
          throw new Error('export-cancelled');
        }
      }

      try {
        await waitPendingSongCaptureRenderTask();
        const baseRenderTimeoutMs = computeRenderTimeoutMs({
          deviceTier,
          heavyMediaCount,
          width,
          height,
          scale
        });
        // First attempt uses a safer floor on static hosts; then relaxes gradually.
        const timeoutFloor = deviceTier === 'phone' ? 9000 : 7000;
        const hostMultiplier = isGithubPagesHost() ? 1.6 : 1;
        const renderTimeoutMs = Math.min(
          32000,
          Math.round(Math.max(baseRenderTimeoutMs, timeoutFloor) * hostMultiplier * (1 + (idx * 0.45)))
        );
        const renderTask = trackSongCaptureRenderTask(html2canvas(renderEl, {
          backgroundColor: '#ffffff',
          scale,
          useCORS: true,
          logging: false,
          imageTimeout: deviceTier === 'phone' ? 11000 : 18000,
          width,
          height
        }));
        canvas = await withRenderTimeout(renderTask, renderTimeoutMs, cancelContext.cancelPromise);
        break;
      } catch (error) {
        const detail = getCaptureErrorText(error);
        lastError = error;
        downgradeReasons.push(`x${scale.toFixed(2)}：${detail.text}`);
        if (isRenderTimeoutError(error)) {
          // Timed-out html2canvas tasks are not cancellable; wait completion before next retry.
          await waitPendingSongCaptureRenderTask();
        }
        if (!detail.retryable) {
          break;
        }
      }
    }

    if (!canvas) {
      throw lastError || new Error('html2canvas failed');
    }

    const safeTitle = sanitizeExportFileName(`song_${title}_${formatExportTimestamp()}`);
    await triggerDownloadPng(canvas, safeTitle);
    const downgradeSummary = summarizeCaptureReasons(downgradeReasons, 2);
    setScreenshotModalState({
      state: 'success',
      title: '截图完成',
      message: `「${exportLabel}」已导出 PNG。${downgradeSummary ? ` 已降级：${downgradeSummary}` : ''}`,
      cancelTask: null,
      autoCloseMs: 1400
    });
  } catch (error) {
    if (isExportCancelledError(error)) {
      return;
    }
    const terminalDetail = getCaptureErrorText(error);
    if (!downgradeReasons.length) {
      downgradeReasons.push(`终止：${terminalDetail.text}`);
    }
    setScreenshotModalState({
      state: 'failed',
      title: '截图失败',
      message: getSongExportFailedMessage(downgradeReasons),
      retryTask: typeof options?.retryTask === 'function' ? options.retryTask : null,
      cancelTask: null
    });
    throw error;
  } finally {
    if (screenshotModalCancelTask.value === cancelContext.cancel) {
      screenshotModalCancelTask.value = null;
    }
    if (cloneEl && cloneEl.parentNode) {
      cloneEl.parentNode.removeChild(cloneEl);
    }
  }
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
    setScreenshotModalState({
      state: 'failed',
      title: '截图失败',
      message: '未找到可导出的区域。'
    });
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
    await exportElementPng(targetEl, title, {
      taskLabel: title,
      retryTask: () => exportSongPanelPng(panelId, title)
    });
  } catch (error) {
    console.error('导出乐曲统计 PNG 失败', error);
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
    setScreenshotModalState({
      state: 'failed',
      title: '截图失败',
      message: '未找到可导出的角色卡片。'
    });
    return;
  }

  const prevVsSongModes = snapshotVsSongCardModes();
  isExportingPng.value = true;
  try {
    expandVsSongCardsForExport(row?.name || '');
    await nextTick();
    await waitNextPaint();
    await exportElementPng(targetEl, `虚拟歌手参与书下_${row?.name || '角色'}`, {
      taskLabel: `虚拟歌手参与书下_${row?.name || '角色'}`,
      retryTask: () => exportVirtualSingerCardPng(row)
    });
  } catch (error) {
    console.error('导出虚拟歌手参与歌曲 PNG 失败', error);
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
    setScreenshotModalState({
      state: 'failed',
      title: '截图失败',
      message: '未找到可导出的角色卡片。'
    });
    return;
  }

  const prevAnotherModes = snapshotAnotherCardModes();
  isExportingPng.value = true;
  try {
    expandAnotherCardsForExport(row?.name || '');
    await nextTick();
    await waitNextPaint();
    await exportElementPng(targetEl, `Anvo_${row?.name || '角色'}`, {
      taskLabel: `Anvo_${row?.name || '角色'}`,
      retryTask: () => exportAnotherCardPng(row)
    });
  } catch (error) {
    console.error('导出 Anvo 角色 PNG 失败', error);
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
    setScreenshotModalState({
      state: 'failed',
      title: '截图失败',
      message: '未找到可导出的团体卡片。'
    });
    return;
  }

  const prevOcBookExpanded = snapshotOcBookExpandedMap();
  isExportingPng.value = true;
  try {
    expandOcBookUnitsForExport(unitKey);
    await nextTick();
    await waitNextPaint();
    await exportElementPng(targetEl, `OC书下_${unitGroup?.label || unitKey || '团体'}`, {
      taskLabel: `OC书下_${unitGroup?.label || unitKey || '团体'}`,
      retryTask: () => exportOcBookUnitCardPng(unitGroup)
    });
  } catch (error) {
    console.error('导出 OC 书下团体 PNG 失败', error);
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

watch(() => navTargetIds.value.join('|'), () => {
  void bindSectionObserver();
});

watch([keyword, mvFilter, groupFilter, difficultySortKey, difficultySortMode], () => {
  currentSongPage.value = 1;
});

watch(difficultySortKey, (nextKey) => {
  if (!nextKey) {
    difficultySortMode.value = 'none';
  }
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
  --song-vs-pill-height: 20px;
  --song-vs-pill-gap: 2px;
  --song-vs-pill-font-size: 0.74rem;
  --song-vs-pill-pad-x: 4px;
  --song-duo-vs-icon-size: 18px;
  --song-duo-vs-icon-gap: 2px;
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
  background: rgba(255, 255, 255, 0.4);
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
  background: rgba(255, 255, 255, 0.4);
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
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-left: 6px;
  padding-left: 10px;
}

.nav-sub-list::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 2px;
  bottom: 2px;
  width: 1px;
  background: #cbd5e1;
}

.nav-link-sub {
  align-self: stretch;
  margin-left: 8px;
  width: calc(100% - 8px);
  padding: 5px 10px;
  text-indent: 0;
  font-size: 0.78rem;
}

.nav-link-sub.is-duo-subanchor {
  margin-left: 14px;
  width: calc(100% - 14px);
  font-size: 0.74rem;
  color: #64748b;
}

.nav-link:hover {
  background: rgba(229, 231, 235, 0.6);
}


.nav-link.active {
  background: rgba(219, 234, 254, 0.6);
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

.song-screenshot-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(15, 23, 42, 0.36);
  backdrop-filter: blur(1px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.song-screenshot-modal {
  width: min(420px, 100%);
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: #ffffff;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.22);
  padding: 14px;
}

.song-screenshot-modal.is-failed {
  border-color: rgba(239, 68, 68, 0.5);
}

.song-screenshot-modal.is-success {
  border-color: rgba(34, 197, 94, 0.42);
}

.song-screenshot-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.song-screenshot-modal-head-main {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.song-screenshot-modal-title {
  font-size: 0.92rem;
  font-weight: 800;
  color: #0f172a;
}

.song-screenshot-modal-message {
  margin: 10px 0 0;
  font-size: 0.78rem;
  line-height: 1.5;
  color: #334155;
}

.song-screenshot-modal-spinner {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid #cbd5e1;
  border-top-color: #0ea5e9;
  animation: song-screenshot-spin 0.85s linear infinite;
}

.song-screenshot-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.song-screenshot-modal-btn {
  min-width: 84px;
}

.song-screenshot-modal-btn-secondary {
  opacity: 0.9;
}

.song-screenshot-modal-close-btn {
  min-width: 56px;
  padding: 2px 8px;
}

@keyframes song-screenshot-spin {
  to {
    transform: rotate(360deg);
  }
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
  height: 28px;
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
  gap: 4px;
  margin-bottom: 7px;
}

.song-vs-event-unit-stack {
  display: flex;
  flex-direction: column;
  gap: var(--song-vs-pill-gap);
  min-width: 0;
}

.song-vs-event-unit-chip {
  width: 100%;
  min-width: 0;
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
  gap: var(--song-vs-pill-gap);
}

.song-vs-event-unit-mv-chip {
  width: 100%;
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

.song-vs-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--song-vs-pill-gap);
  box-sizing: border-box;
  min-height: var(--song-vs-pill-height);
  height: var(--song-vs-pill-height);
  border-radius: 999px;
  border: 1px solid rgba(51, 65, 85, 0.32);
  color: #0f172a;
  font-size: var(--song-vs-pill-font-size);
  font-weight: 700;
  line-height: 1;
  padding: 0 var(--song-vs-pill-pad-x);
  white-space: nowrap;
}

.song-vs-total-mv-chip {
  background: transparent;
}

.song-vs-total-mv-sep {
  color: #475569;
}

.song-vs-total-mv-3d {
  color: #dc2626;
  font-weight: 800;
}

.song-vs-total-mv-chip-head {
  margin-left: 4px;
}

.song-vs-event-card.is-image-mode .song-vs-total-mv-chip-head {
  display: none;
}

.song-vs-event-unit-stack-total {
  align-items: flex-start;
  justify-content: center;
}

.song-vs-total-mv-chip-stat {
  width: auto;
  min-width: fit-content;
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

.song-vs-event-tag-vs-col {
  display: inline-flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
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
  width: auto;
  min-width: 0.8em;
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


.song-vs-event-unit-counts-image {
  margin-left: 0;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
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
  gap: var(--song-vs-pill-gap);
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
  gap: var(--song-vs-pill-gap);
  flex: 0 0 auto;
}

.song-vs-event-unit-counts-image .song-vs-event-unit-mv-chip {
  min-width: 56px;
  width: auto;
}

.song-vs-event-unit-counts-image .song-vs-event-unit-stack-total .song-vs-total-mv-chip {
  min-width: fit-content;
}

.song-vs-event-card.is-image-mode .song-vs-event-unit-counts-image .song-vs-event-unit-logo {
  width: 18px;
  height: 18px;
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

.song-image-count-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  min-width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid rgba(51, 65, 85, 0.34);
  border-radius: 999px;
  background: transparent;
  color: #0f172a;
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.78), 0 2px 6px rgba(15, 23, 42, 0.16);
}

.song-duo-image-identity {
  min-width: 56px;
}

.song-duo-image-avatars {
  display: inline-flex;
  align-items: center;
  gap: 1px;
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

.song-image-jacket-tile {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
}

.song-vs-event-image-jacket-tile {
  align-items: center;
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
  border: 1px solid #c6c7ca;
  border-radius: 999px;
  color: #111827;
  font-size: 0.7rem;
  font-weight: 600;
  margin-left: auto;
  margin-right: auto;
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
  margin-left: 4px;
  flex-wrap: wrap;
}

.song-oc-event-mv-stat-chip {
  min-width: fit-content;
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

.song-vs-event-tag-vs-col .song-oc-event-vs-icons.is-text-col.is-vs-tag-col {
  width: var(--song-oc-vs-col-width);
  min-width: var(--song-oc-vs-col-width);
  grid-auto-rows: var(--song-oc-vs-col-width);
  justify-items: end;
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

.song-oc-event-vs-icon.is-empty-slot {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}

.song-oc-event-vs-icon.is-placeholder-slot {
  background: transparent;
  border-style: dashed;
  border-color: rgba(255, 255, 255, 0.96);
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.12);
}

.song-oc-event-vs-icons.is-duo-inline {
  width: calc(var(--song-duo-vs-icon-size) * 2 + var(--song-duo-vs-icon-gap));
  min-width: calc(var(--song-duo-vs-icon-size) * 2 + var(--song-duo-vs-icon-gap));
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
  gap: var(--song-duo-vs-icon-gap);
}

.song-oc-event-vs-icons.is-duo-inline .song-oc-event-vs-icon {
  width: var(--song-duo-vs-icon-size);
  height: var(--song-duo-vs-icon-size);
}

.song-oc-event-vs-icons.is-mini .song-oc-event-vs-icon {
  width: 22px;
  height: 22px;
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
  align-items: center;
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

.song-oc-event-unit-count-circle {
  margin-left: 0;
  flex: 0 0 auto;
}

.song-oc-event-unit-head .song-oc-event-unit-count-circle {
  justify-self: start;
  align-self: center;
}

.song-oc-event-unit-head .song-oc-event-unit-mv-chips {
  margin-left: 0;
  min-width: 0;
  align-self: center;
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

.song-stat-list-duo li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) var(--song-event-mv-col-width) var(--song-event-mv-col-width);
  align-items: center;
  gap: 6px;
}

.song-duo-event-mv-col {
  justify-content: flex-end;
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

.song-th-filter-stack {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px;
  align-items: center;
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

.song-diff-order-btn {
  width: 27px;
  height: 27px;
  min-width: 27px;
  min-height: 27px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
  cursor: pointer;
  padding: 0;
  transition: filter 0.2s ease, transform 0.2s ease;
}

.song-diff-order-btn:active {
  filter: brightness(0.88);
  transform: scale(0.96);
}

.song-diff-order-icon {
  width: 21px;
  height: 21px;
  object-fit: contain;
  display: block;
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
  cursor: pointer;
  transition: filter 0.2s ease, transform 0.2s ease;
}

.song-jacket-media:active {
  filter: brightness(0.88);
  transform: scale(0.98);
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
  border-radius: 0;
}

.song-jacket-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 0;
}

.media-load-shimmer:not([data-loaded='1']) {
  background-image: linear-gradient(110deg, #d1d5db 8%, #f3f4f6 18%, #d1d5db 33%);
  background-size: 220% 100%;
  animation: media-shimmer 1.05s linear infinite;
}

@keyframes media-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -40% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .media-load-shimmer:not([data-loaded='1']) {
    animation: none;
    background-image: none;
    background-color: #d1d5db;
  }
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

.song-image-title-toast {
  position: fixed;
  max-width: min(82vw, 320px);
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(51, 65, 85, 0.3);
  background: rgba(255, 255, 255, 0.96);
  color: #0f172a;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.18);
  z-index: 1200;
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
    --song-jacket-default-size: 60px;
    --song-jacket-track-size: 60px;
    padding: 2px;
    --song-stat-min-card-width: 220px;
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

  .song-oc-event-vs-icons.is-mini .song-oc-event-vs-icon {
  width: 20px;
  height: 20px;
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
    --song-duo-vs-icon-size: 14px;
    --song-duo-vs-icon-gap: 1px;
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
    right: auto;
    width: min(240px, calc(100vw - 16px));
    max-width: calc(100vw - 16px);
    max-height: calc(100dvh - 60px);
    z-index: 4200;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.22);
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border-radius: 24px !important;
    overflow: hidden;
  }

  .stats-nav.mobile-floating.is-collapsed {
    display: none;
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
    margin-left: 6px;
    width: calc(100% - 6px);
    padding: 3px 8px;
    text-indent: 0;
    font-size: 0.68rem;
  }

  .nav-link-sub.is-duo-subanchor {
    margin-left: 10px;
    width: calc(100% - 10px);
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
    height: 28px;
    max-width: 110px;
  }

  .song-vs-event-unit-counts {
    gap: 4px;
  }

  .song-vs-pill {
    font-size: 0.76rem;
  }

  .song-vs-event-unit-logo {
    width: 18px;
    height: 18px;
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

  .song-th-filter-stack {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 3px;
  }

  .song-th-select {
    min-height: 24px;
    padding: 2px 6px;
    font-size: 0.66rem;
  }

  .song-diff-order-btn {
    width: 24px;
    height: 24px;
    min-width: 24px;
    min-height: 24px;
  }

  .song-diff-order-icon {
    width: 18px;
    height: 18px;
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
    width: 56px;
  }

  .song-vs-event-unit-counts-image .song-vs-event-unit-stack-total .song-vs-total-mv-chip {
    min-width: fit-content;
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
    width: 18px;
    height: 18px;
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

@media (max-width: 520px) {
  .pjsk-song-stats {
    padding: 6px;
  }

  .floating-menu-btn {
    top: calc(env(safe-area-inset-top, 0px) + 48px);
    width: 34px;
    height: 34px;
  }

  .nav-collapse-fab {
    width: 30px;
    min-height: 30px;
    height: 30px;
  }
}


@media (min-width: 521px) {
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

@media (max-width: 520px) {
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
    --song-duo-vs-icon-size: 20px;
    --song-duo-vs-icon-gap: 1px;
  }

  .song-col-jacket {
    width: 40px;
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

  .song-vs-event-card.is-image-mode .song-vs-total-mv-chip-head {
    display: inline-flex;
  }

  .song-vs-event-card.is-image-mode .song-vs-event-unit-stack-total {
    display: none;
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

  .song-image-count-circle {
    font-size: 0.92rem;
    font-weight: 800;
    line-height: 1;
    color: #0f172a;
    min-width: 30px;
    justify-content: center;
    text-align: center;
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
    min-width: 50px;
    gap: 1px;
  }

  .song-duo-image-identity {
    min-width: 62px;
  }

  .song-col-credit {
    width: 12.5%;
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

.stats-nav.mobile-floating .nav-cutoff,
.stats-nav.mobile-floating .nav-section,
.stats-nav.mobile-floating .nav-group {
  background: rgba(255, 255, 255, 0.4);
}
</style>
