<template>
  <div ref="cardStatsRootRef" class="pjsk-stats" :class="{ 'matrix-sort-anchor-suppressed': suppressMatrixViewportAnchor }">
    <div class="stats-layout" :class="{ 'nav-collapsed': navCollapsed, 'mobile-nav-overlay': isNavTopLayout, 'mobile-nav-open': !navCollapsed }">
      <button
        v-if="navCollapsed"
        class="floating-menu-btn export-hide"
        title="展开统计菜单"
        @click="setNavCollapsed(false)"
      >
        <img src="/data/icon/menu.png" class="floating-menu-icon" alt="菜单" />
      </button>
      <aside class="stats-nav card-panel" :class="{ 'mobile-floating': isNavTopLayout, 'is-collapsed': navCollapsed, 'is-open': !navCollapsed }">
        <button v-if="!navCollapsed" class="nav-collapse-fab export-hide" @click="setNavCollapsed(true)" title="收起统计菜单">
          <img src="/data/icon/menu_open.png" class="nav-collapse-fab-icon" alt="收起菜单" />
        </button>

        <div v-if="!navCollapsed" class="nav-cutoff" :class="{ 'mini-cutoff': isMiniFloatingNav }">
          <div class="nav-cutoff-title" v-if="!isNavTopLayout">统计截止活动 ID</div>
          <div v-if="isNavTopLayout" class="mini-cutoff-line">统计截止活动ID：{{ safeMaxEventId }}</div>
          <div v-else class="nav-cutoff-controls">
            <button class="id-step-btn" @click="adjustDisplayEventId(-1)" title="减少 1">－</button>
            <input
              type="number"
              step="1"
              inputmode="numeric"
              :value="displayEventIdDraft"
              @focus="onDisplayEventIdFocus"
              @input="onDisplayEventIdInput($event.target.value)"
              @blur="onDisplayEventIdBlur"
              class="id-input"
              placeholder="输入活动 ID"
            />
            <button class="id-step-btn" @click="adjustDisplayEventId(1)" title="增加 1">＋</button>
            <button @click="manualEventId = null" class="reset-mini-btn" :title="`恢复到当前参考活动 ID：${autoCurrentId}`">
              <img src="/data/icon/reset.png" class="reset-mini-icon" alt="复位" />
            </button>
          </div>
          <p class="config-tips">{{ isNavTopLayout ? `系统时间：${nowStr} | 在顶栏中输入更大ID可查看预测统计。` : `系统时间：${nowStr} | 输入更大ID可查看预测统计。` }}</p>
        </div>

        <template v-if="!navCollapsed">
          <div v-if="!isMobileNav" class="nav-name-format export-hide">
            <span class="nav-name-format-title">名称格式</span>
            <div class="nav-name-format-options">
              <label class="nav-name-format-option">
                <input v-model="navNameFormat" type="radio" value="abbr" />
                缩写
              </label>
              <label class="nav-name-format-option">
                <input v-model="navNameFormat" type="radio" value="single" />
                单字
              </label>
            </div>
          </div>
          <div class="nav-name-format export-hide">
            <span class="nav-name-format-title">卡面展示</span>
            <div class="nav-name-format-options">
              <label class="nav-name-format-option">
                <input v-model="navCardImageMode" type="radio" value="before" />
                花前
              </label>
              <label class="nav-name-format-option">
                <input v-model="navCardImageMode" type="radio" value="after" />
                花后
              </label>
            </div>
          </div>
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
                    :class="{ active: activeNavId === item.id }"
                    :title="item.title"
                    @click="handleChildNavClick(group, item)"
                  >
                    {{ item.title }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </aside>

      <div class="stats-main">
        <div class="stats-main-head">
          <h1>角色卡片统计</h1>
        </div>

        <div id="panel-dist" data-scroll-anchor="panel-dist" class="stats-section card-panel section-main">
          <div class="section-head">
            <div class="section-head-left">
              <h2>阶梯分布</h2>
              <label v-if="showDesktopNameControls" class="dist-hide-name-toggle stats-checkbox export-hide" title="勾选后不显示角色头像下方名称。">
                <input v-model="hideDistCharNames" type="checkbox" />
                隐藏角色名
              </label>
            </div>
            <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-dist', '阶梯分布')">PNG</button>
          </div>
          <div class="stats-grid">
            <div
              v-for="panel in groupPanels"
              :key="panel.id"
              class="stats-section card-panel"
              :id="`panel-${panel.id}`"
              :data-scroll-anchor="`panel-${panel.id}`"
            >
              <div class="section-head section-head-sub">
                <div class="section-head-left">
                  <h2>{{ panel.title }}</h2>
                  <label
                    v-if="panel.id === 'reward'"
                    class="reward-collab-toggle stats-checkbox"
                    title="勾选后，报酬统计会额外计入联动的二/三星卡。"
                  >
                    <input v-model="includeCollabRewardCards" type="checkbox" />
                    统计联动
                  </label>
                  <label
                    v-if="panel.id === 'pure-score'"
                    class="reward-collab-toggle stats-checkbox"
                    title="勾选后，4星分卡会计入团分卡。"
                  >
                    <input :checked="includeUnitScoreInPureScore" type="checkbox" @change="onIncludeUnitScoreInPureScoreChange" />
                    统计团分
                  </label>
                  <label
                    v-if="panel.id === 'fes-limited'"
                    class="reward-collab-toggle stats-checkbox"
                    title="勾选后，百六限定次数会额外计入当期FES卡。"
                  >
                    <input v-model="fesLimitedIncludeFes" type="checkbox" />
                    统计FES
                  </label>
                  <div v-if="panel.id === 'limited-ban'" class="head-inline-filters">
                    <label class="head-filter-toggle stats-checkbox" title="只统计箱限Ban个数。">
                      <input
                        type="checkbox"
                        :checked="limitedBanEventTypeFilter === '箱活'"
                        @change="setLimitedBanEventTypeFilter('箱活', $event.target.checked)"
                      />
                      仅箱
                    </label>
                    <label class="head-filter-toggle stats-checkbox" title="只统计混限Ban个数。">
                      <input
                        type="checkbox"
                        :checked="limitedBanEventTypeFilter === '混活'"
                        @change="setLimitedBanEventTypeFilter('混活', $event.target.checked)"
                      />
                      仅混
                    </label>
                  </div>
                  <div v-if="panel.id === 'banner'" class="head-inline-filters">
                    <label class="head-filter-toggle stats-checkbox" title="只统计箱活Banner个数。">
                      <input
                        type="checkbox"
                        :checked="bannerEventTypeFilter === '箱活'"
                        @change="setBannerEventTypeFilter('箱活', $event.target.checked)"
                      />
                      仅箱
                    </label>
                    <label class="head-filter-toggle stats-checkbox" title="只统计混活Banner个数。">
                      <input
                        type="checkbox"
                        :checked="bannerEventTypeFilter === '混活'"
                        @change="setBannerEventTypeFilter('混活', $event.target.checked)"
                      />
                      仅混
                    </label>
                  </div>
                  <div v-if="panel.id === 'fes-limited-ban'" class="head-inline-filters">
                    <label class="head-filter-toggle stats-checkbox" title="只统计百六箱限Ban个数。">
                      <input
                        type="checkbox"
                        :checked="fesLimitedBanEventTypeFilter === '箱活'"
                        @change="setFesLimitedBanEventTypeFilter('箱活', $event.target.checked)"
                      />
                      仅箱
                    </label>
                    <label class="head-filter-toggle stats-checkbox" title="只统计百六混限Ban个数。">
                      <input
                        type="checkbox"
                        :checked="fesLimitedBanEventTypeFilter === '混活'"
                        @change="setFesLimitedBanEventTypeFilter('混活', $event.target.checked)"
                      />
                      仅混
                    </label>
                  </div>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng(`panel-${panel.id}`, `阶梯分布_${panel.title}`)">PNG</button>
              </div>
              <table class="count-table" :class="{ 'compact-char-table': hideDistCharNames, 'reward-breakdown-table': panel.showRewardBreakdown }">
                <thead>
                  <tr><th width="50">数量</th><th>持有角色</th></tr>
                </thead>
                <tbody>
                  <tr v-for="group in panel.groups" :key="`${panel.id}-${group.count}`">
                    <td class="count-cell" :class="panel.cellClass">{{ group.count }}</td>
                    <td class="chars-cell">
                      <div v-for="char in group.chars" :key="`${panel.id}-${char.name}`" class="char-avatar-box">
                        <img
                          :src="`/chibi_s/${getCharAbbr(char.name)}.webp`"
                          :title="char.name"
                          class="avatar-img"
                          :style="getStepFestivalAvatarStyle(char.name)"
                        />
                        <span v-if="!hideDistCharNames" class="abbr-text">{{ getDistNameLabel(char.name) }}</span>
                        <span v-if="panel.showRewardBreakdown" class="sub-stat">{{ char.rewardThreeCount }}+{{ char.rewardTwoCount }}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div id="panel-festival" data-scroll-anchor="panel-festival" class="stats-section card-panel festival-panel">
          <div class="section-head">
            <div class="section-head-left">
              <h2>节日人选</h2>
              <label v-if="showDesktopNameControls" class="festival-hide-name-toggle stats-checkbox export-hide" title="勾选后不显示角色头像下方名称。">
                <input v-model="hideFestivalCharNames" type="checkbox" />
                隐藏角色名
              </label>
              <label class="festival-merge-toggle stats-checkbox" title="勾选后，若角色已在更高星级出现，则不在低星级重复显示。">
                <input v-model="festivalMergeHigherRanks" type="checkbox" />
                高星合并低星
              </label>
            </div>
            <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-festival', '节日人选')">PNG</button>
          </div>
          <div class="festival-grid">
            <div
              v-for="fest in festivalCharStats"
              :key="fest.festival"
              :id="fest.anchorId"
              :data-scroll-anchor="fest.anchorId"
              class="festival-card card-panel"
            >
              <div class="festival-card-head">
                <div class="festival-head-left">
                  <h3>{{ fest.festival }}</h3>
                  <label class="festival-merge-toggle stats-checkbox festival-card-merge-toggle" title="勾选后，若角色已在更高星级出现，则不在低星级重复显示。">
                    <input v-model="festivalMergeToggles[fest.festival]" type="checkbox" />
                    高星合并低星
                  </label>
                  <label v-if="canToggleFestivalFes(fest.festival)" class="festival-fes-toggle stats-checkbox">
                    <input v-model="festivalFesToggles[fest.festival]" type="checkbox" />
                    统计FES
                  </label>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng(fest.anchorId, `节日人选_${fest.festival}`)">PNG</button>
              </div>
              <table class="count-table" :class="{ 'compact-char-table': hideFestivalCharNames }">
                <tbody>
                  <tr v-for="row in fest.rows" :key="`${fest.festival}-${row.key}`">
                    <td class="count-cell festival-tier-cell" :class="`festival-tier-${row.key}`">
                      <div v-if="row.key !== 'none'" class="festival-star-stack">
                        <img
                          v-for="idx in getFestivalTierCount(row.key)"
                          :key="`${fest.festival}-${row.key}-star-${idx}`"
                          :src="getFestivalTierIcon(row.key)"
                          class="festival-star-icon"
                        />
                      </div>
                      <span v-else class="festival-none-text">无</span>
                    </td>
                    <td class="chars-cell" :class="{ 'festival-chars-empty-cell': !row.chars.length }">
                      <template v-if="row.chars.length">
                        <div
                          v-for="char in row.chars"
                          :key="`${fest.festival}-${row.key}-${char.name}`"
                          class="char-avatar-box festival-avatar-box"
                        >
                          <div class="festival-avatar-wrap">
                            <span v-if="char.count > 1" class="festival-count-badge">{{ char.count }}</span>
                            <img
                              :src="`/chibi_s/${getCharAbbr(char.name)}.webp`"
                              :title="char.name"
                              class="avatar-img"
                              :style="getStepFestivalAvatarStyle(char.name)"
                            />
                            <img
                              v-if="getFestivalUnitLogoByName(char.name)"
                              :src="getFestivalUnitLogoByName(char.name)"
                              class="festival-unit-logo"
                            />
                            <span v-if="row.key === 'four' && char.isPermOnly" class="festival-perm-mark">普</span>
                          </div>
                          <span v-if="!hideFestivalCharNames" class="abbr-text">{{ getFestivalDisplayNameLabel(char.name) }}</span>
                        </div>
                      </template>
                      <span v-else class="festival-empty">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div id="panel-related" data-scroll-anchor="panel-related" class="stats-section card-panel related-panel">
          <div class="section-head">
            <div class="section-head-left">
              <h2>相关记录</h2>
              <label class="fes-card-mode-toggle stats-checkbox" title="统一控制相关记录中可切换卡面的子模块。">
                <input :checked="relatedPanelShowCardImagesAll" type="checkbox" @change="onRelatedPanelShowAllCardImagesChange" />
                显示卡面
              </label>
            </div>
            <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-related', '相关记录')">PNG</button>
          </div>

          <div class="record-grid">
            <div id="rel-last-four" data-scroll-anchor="rel-last-four" class="record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-last-four') }}</h3>
                  <label class="fes-card-mode-toggle stats-checkbox">
                    <input :checked="relatedLastRecordShowCardImages" type="checkbox" @change="onRelatedLastRecordShowCardImagesChange" />
                    显示卡面
                  </label>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-last-four', '相关记录_上一次四星')">PNG</button>
              </div>
              <table :class="['record-table', 'related-table', 'related-table-last', { 'last-record-table-card-mode': relatedLastRecordShowCardImages }]">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th v-if="relatedLastRecordShowCardImages">卡面</th>
                    <th>活动</th>
                    <th>日期</th>
                    <th>距今</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in lastFourStarDisplayRecords" :key="`last-four-${row.name}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <img
                        :src="`/chibi_s/${getCharAbbr(row.name)}.webp`"
                        class="record-avatar"
                        :class="{ 'related-last-avatar-large': relatedLastRecordShowCardImages }"
                        :style="{ borderColor: getCharColor(row.name) }"
                      />
                      <span v-if="!relatedLastRecordShowCardImages">{{ row.name }}</span>
                    </td>
                    <td v-if="relatedLastRecordShowCardImages" class="related-last-card-cell">
                      <div v-if="row.cardImageSrc" class="lineup-slot-card related-last-card-thumb">
                        <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                        <img
                          :src="row.cardImageSrc"
                          :alt="`${row.name} 卡面`"
                          class="lineup-slot-card-img media-load-shimmer"
                          loading="lazy"
                          decoding="async"
                          @load="onMediaImageLoad"
                          @error="onMediaImageError"
                        />
                        <img
                          v-if="ATTRS.includes(row.cardAttr)"
                          :src="`/elements/${String(row.cardAttr).toLowerCase()}.png`"
                          :alt="ATTR_LABELS[row.cardAttr]"
                          :title="ATTR_LABELS[row.cardAttr]"
                          class="related-last-card-attr"
                        />
                      </div>
                      <span v-else class="score-empty">-</span>
                    </td>
                    <td>
                      <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.eventRef)">{{ getJumpLinkLabel(row.eventRef, row.eventLabel) }}</button>
                    </td>
                    <td>{{ row.date }}</td>
                    <td>{{ row.months }}个月 | {{ row.periods }}期</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-last-limited" data-scroll-anchor="rel-last-limited" class="record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-last-limited') }}</h3>
                  <label class="fes-card-mode-toggle stats-checkbox">
                    <input :checked="relatedLastRecordShowCardImages" type="checkbox" @change="onRelatedLastRecordShowCardImagesChange" />
                    显示卡面
                  </label>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-last-limited', '相关记录_上一次限定')">PNG</button>
              </div>
              <table :class="['record-table', 'related-table', 'related-table-last', { 'last-record-table-card-mode': relatedLastRecordShowCardImages }]">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th v-if="relatedLastRecordShowCardImages">卡面</th>
                    <th>活动</th>
                    <th>日期</th>
                    <th>距今</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in lastLimitedDisplayRecords" :key="`last-limited-${row.name}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <img
                        :src="`/chibi_s/${getCharAbbr(row.name)}.webp`"
                        class="record-avatar"
                        :class="{ 'related-last-avatar-large': relatedLastRecordShowCardImages }"
                        :style="{ borderColor: getCharColor(row.name) }"
                      />
                      <span v-if="!relatedLastRecordShowCardImages">{{ row.name }}</span>
                    </td>
                    <td v-if="relatedLastRecordShowCardImages" class="related-last-card-cell">
                      <div v-if="row.cardImageSrc" class="lineup-slot-card related-last-card-thumb">
                        <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                        <img
                          :src="row.cardImageSrc"
                          :alt="`${row.name} 卡面`"
                          class="lineup-slot-card-img media-load-shimmer"
                          loading="lazy"
                          decoding="async"
                          @load="onMediaImageLoad"
                          @error="onMediaImageError"
                        />
                        <img
                          v-if="ATTRS.includes(row.cardAttr)"
                          :src="`/elements/${String(row.cardAttr).toLowerCase()}.png`"
                          :alt="ATTR_LABELS[row.cardAttr]"
                          :title="ATTR_LABELS[row.cardAttr]"
                          class="related-last-card-attr"
                        />
                      </div>
                      <span v-else class="score-empty">-</span>
                    </td>
                    <td>
                      <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.eventRef)">{{ getJumpLinkLabel(row.eventRef, row.eventLabel) }}</button>
                    </td>
                    <td>{{ row.date }}</td>
                    <td>{{ row.months }}个月 | {{ row.periods }}期</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-four-long" data-scroll-anchor="rel-four-long" class="record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-four-long') }}</h3>
                  <label class="fes-card-mode-toggle stats-checkbox">
                    <input :checked="intervalFourShowCardImages" type="checkbox" @change="onIntervalFourShowCardImagesChange" />
                    显示卡面
                  </label>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-four-long', '相关记录_四星最长间隔')">PNG</button>
              </div>
              <table :class="['record-table', 'related-table', 'related-table-interval', { 'interval-record-table-card-mode': intervalFourShowCardImages }]">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th v-if="intervalFourShowCardImages">卡面</th>
                    <th>活动始末</th>
                    <th>最长</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in fourStarLongestDisplayRecords" :key="`four-long-${row.name}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <img
                        :src="`/chibi_s/${getCharAbbr(row.name)}.webp`"
                        class="record-avatar"
                        :class="{ 'interval-avatar-large': intervalFourShowCardImages }"
                        :style="{ borderColor: getCharColor(row.name) }"
                      />
                      <span v-if="!intervalFourShowCardImages">{{ row.name }}</span>
                    </td>
                    <td v-if="intervalFourShowCardImages" class="range-card-cell">
                      <template v-if="intervalFourShowCardImages">
                        <div class="interval-card-column">
                          <div class="interval-card-item is-stack-item">
                            <div v-if="row.longestStartCardImageSrc" class="lineup-slot-card related-last-card-thumb interval-card-thumb">
                              <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                              <img
                                :src="row.longestStartCardImageSrc"
                                :alt="`${row.name} 卡面`"
                                class="lineup-slot-card-img media-load-shimmer"
                                loading="lazy"
                                decoding="async"
                                @load="onMediaImageLoad"
                                @error="onMediaImageError"
                              />
                              <img
                                v-if="ATTRS.includes(row.longestStartCardAttr)"
                                :src="`/elements/${String(row.longestStartCardAttr).toLowerCase()}.png`"
                                :alt="ATTR_LABELS[row.longestStartCardAttr]"
                                :title="ATTR_LABELS[row.longestStartCardAttr]"
                                class="related-last-card-attr"
                              />
                            </div>
                            <span v-else class="score-empty">-</span>
                          </div>
                          <span class="interval-stack-arrow">↓</span>
                          <div class="interval-card-item is-stack-item">
                            <div v-if="row.longestEndCardImageSrc" class="lineup-slot-card related-last-card-thumb interval-card-thumb">
                              <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                              <img
                                :src="row.longestEndCardImageSrc"
                                :alt="`${row.name} 卡面`"
                                class="lineup-slot-card-img media-load-shimmer"
                                loading="lazy"
                                decoding="async"
                                @load="onMediaImageLoad"
                                @error="onMediaImageError"
                              />
                              <img
                                v-if="ATTRS.includes(row.longestEndCardAttr)"
                                :src="`/elements/${String(row.longestEndCardAttr).toLowerCase()}.png`"
                                :alt="ATTR_LABELS[row.longestEndCardAttr]"
                                :title="ATTR_LABELS[row.longestEndCardAttr]"
                                class="related-last-card-attr"
                              />
                            </div>
                            <span v-else class="score-empty">-</span>
                          </div>
                        </div>
                      </template>
                    </td>
                    <td class="range-cell" :class="{ 'is-card-mode': intervalFourShowCardImages }">
                      <template v-if="intervalFourShowCardImages">
                        <div class="interval-jump-column">
                          <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.longest?.startRef)">{{ getJumpLinkLabel(row.longest?.startRef, row.longest?.startMark || '-') }}</button>
                          <span class="interval-stack-arrow">↓</span>
                          <button class="jump-link" :disabled="!row.longest?.endRef" @click.stop="jumpToHistoryByEventRef(row.longest?.endRef)">{{ getJumpLinkLabel(row.longest?.endRef, row.longest?.endMark || '-') }}</button>
                        </div>
                      </template>
                      <template v-else>
                        <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.longest?.startRef)">{{ getJumpLinkLabel(row.longest?.startRef, row.longest?.startMark || '-') }}</button>
                        <span>→</span>
                        <button class="jump-link" :disabled="!row.longest?.endRef" @click.stop="jumpToHistoryByEventRef(row.longest?.endRef)">{{ getJumpLinkLabel(row.longest?.endRef, row.longest?.endMark || '-') }}</button>
                      </template>
                    </td>
                    <td>{{ formatGapValue(row.longest) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-four-short" data-scroll-anchor="rel-four-short" class="record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-four-short') }}</h3>
                  <label class="fes-card-mode-toggle stats-checkbox">
                    <input :checked="intervalFourShowCardImages" type="checkbox" @change="onIntervalFourShowCardImagesChange" />
                    显示卡面
                  </label>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-four-short', '相关记录_四星最短间隔')">PNG</button>
              </div>
              <table :class="['record-table', 'related-table', 'related-table-interval', { 'interval-record-table-card-mode': intervalFourShowCardImages }]">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th v-if="intervalFourShowCardImages">卡面</th>
                    <th>活动始末</th>
                    <th>最短</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in fourStarShortestDisplayRecords" :key="`four-short-${row.name}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <img
                        :src="`/chibi_s/${getCharAbbr(row.name)}.webp`"
                        class="record-avatar"
                        :class="{ 'interval-avatar-large': intervalFourShowCardImages }"
                        :style="{ borderColor: getCharColor(row.name) }"
                      />
                      <span v-if="!intervalFourShowCardImages">{{ row.name }}</span>
                    </td>
                    <td v-if="intervalFourShowCardImages" class="range-card-cell">
                      <template v-if="intervalFourShowCardImages">
                        <div class="interval-card-column">
                          <div class="interval-card-item is-stack-item">
                            <div v-if="row.shortestStartCardImageSrc" class="lineup-slot-card related-last-card-thumb interval-card-thumb">
                              <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                              <img
                                :src="row.shortestStartCardImageSrc"
                                :alt="`${row.name} 卡面`"
                                class="lineup-slot-card-img media-load-shimmer"
                                loading="lazy"
                                decoding="async"
                                @load="onMediaImageLoad"
                                @error="onMediaImageError"
                              />
                              <img
                                v-if="ATTRS.includes(row.shortestStartCardAttr)"
                                :src="`/elements/${String(row.shortestStartCardAttr).toLowerCase()}.png`"
                                :alt="ATTR_LABELS[row.shortestStartCardAttr]"
                                :title="ATTR_LABELS[row.shortestStartCardAttr]"
                                class="related-last-card-attr"
                              />
                            </div>
                            <span v-else class="score-empty">-</span>
                          </div>
                          <span class="interval-stack-arrow">↓</span>
                          <div class="interval-card-item is-stack-item">
                            <div v-if="row.shortestEndCardImageSrc" class="lineup-slot-card related-last-card-thumb interval-card-thumb">
                              <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                              <img
                                :src="row.shortestEndCardImageSrc"
                                :alt="`${row.name} 卡面`"
                                class="lineup-slot-card-img media-load-shimmer"
                                loading="lazy"
                                decoding="async"
                                @load="onMediaImageLoad"
                                @error="onMediaImageError"
                              />
                              <img
                                v-if="ATTRS.includes(row.shortestEndCardAttr)"
                                :src="`/elements/${String(row.shortestEndCardAttr).toLowerCase()}.png`"
                                :alt="ATTR_LABELS[row.shortestEndCardAttr]"
                                :title="ATTR_LABELS[row.shortestEndCardAttr]"
                                class="related-last-card-attr"
                              />
                            </div>
                            <span v-else class="score-empty">-</span>
                          </div>
                        </div>
                      </template>
                    </td>
                    <td class="range-cell" :class="{ 'is-card-mode': intervalFourShowCardImages }">
                      <template v-if="intervalFourShowCardImages">
                        <div class="interval-jump-column">
                          <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.shortest?.startRef)">{{ getJumpLinkLabel(row.shortest?.startRef, row.shortest?.startMark || '-') }}</button>
                          <span class="interval-stack-arrow">↓</span>
                          <button class="jump-link" :disabled="!row.shortest?.endRef" @click.stop="jumpToHistoryByEventRef(row.shortest?.endRef)">{{ getJumpLinkLabel(row.shortest?.endRef, row.shortest?.endMark || '-') }}</button>
                        </div>
                      </template>
                      <template v-else>
                        <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.shortest?.startRef)">{{ getJumpLinkLabel(row.shortest?.startRef, row.shortest?.startMark || '-') }}</button>
                        <span>→</span>
                        <button class="jump-link" :disabled="!row.shortest?.endRef" @click.stop="jumpToHistoryByEventRef(row.shortest?.endRef)">{{ getJumpLinkLabel(row.shortest?.endRef, row.shortest?.endMark || '-') }}</button>
                      </template>
                    </td>
                    <td>{{ formatGapValue(row.shortest) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-limited-long" data-scroll-anchor="rel-limited-long" class="record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-limited-long') }}</h3>
                  <label class="fes-card-mode-toggle stats-checkbox">
                    <input :checked="intervalLimitedShowCardImages" type="checkbox" @change="onIntervalLimitedShowCardImagesChange" />
                    显示卡面
                  </label>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-limited-long', '相关记录_限定最长间隔')">PNG</button>
              </div>
              <table :class="['record-table', 'related-table', 'related-table-interval', { 'interval-record-table-card-mode': intervalLimitedShowCardImages }]">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th v-if="intervalLimitedShowCardImages">卡面</th>
                    <th>活动始末</th>
                    <th>最长</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in limitedLongestDisplayRecords" :key="`lim-long-${row.name}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <img
                        :src="`/chibi_s/${getCharAbbr(row.name)}.webp`"
                        class="record-avatar"
                        :class="{ 'interval-avatar-large': intervalLimitedShowCardImages }"
                        :style="{ borderColor: getCharColor(row.name) }"
                      />
                      <span v-if="!intervalLimitedShowCardImages">{{ row.name }}</span>
                    </td>
                    <td v-if="intervalLimitedShowCardImages" class="range-card-cell">
                      <template v-if="intervalLimitedShowCardImages">
                        <div class="interval-card-column">
                          <div class="interval-card-item is-stack-item">
                            <div v-if="row.longestStartCardImageSrc" class="lineup-slot-card related-last-card-thumb interval-card-thumb">
                              <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                              <img
                                :src="row.longestStartCardImageSrc"
                                :alt="`${row.name} 卡面`"
                                class="lineup-slot-card-img media-load-shimmer"
                                loading="lazy"
                                decoding="async"
                                @load="onMediaImageLoad"
                                @error="onMediaImageError"
                              />
                              <img
                                v-if="ATTRS.includes(row.longestStartCardAttr)"
                                :src="`/elements/${String(row.longestStartCardAttr).toLowerCase()}.png`"
                                :alt="ATTR_LABELS[row.longestStartCardAttr]"
                                :title="ATTR_LABELS[row.longestStartCardAttr]"
                                class="related-last-card-attr"
                              />
                            </div>
                            <span v-else class="score-empty">-</span>
                          </div>
                          <span class="interval-stack-arrow">↓</span>
                          <div class="interval-card-item is-stack-item">
                            <div v-if="row.longestEndCardImageSrc" class="lineup-slot-card related-last-card-thumb interval-card-thumb">
                              <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                              <img
                                :src="row.longestEndCardImageSrc"
                                :alt="`${row.name} 卡面`"
                                class="lineup-slot-card-img media-load-shimmer"
                                loading="lazy"
                                decoding="async"
                                @load="onMediaImageLoad"
                                @error="onMediaImageError"
                              />
                              <img
                                v-if="ATTRS.includes(row.longestEndCardAttr)"
                                :src="`/elements/${String(row.longestEndCardAttr).toLowerCase()}.png`"
                                :alt="ATTR_LABELS[row.longestEndCardAttr]"
                                :title="ATTR_LABELS[row.longestEndCardAttr]"
                                class="related-last-card-attr"
                              />
                            </div>
                            <span v-else class="score-empty">-</span>
                          </div>
                        </div>
                      </template>
                    </td>
                    <td class="range-cell" :class="{ 'is-card-mode': intervalLimitedShowCardImages }">
                      <template v-if="intervalLimitedShowCardImages">
                        <div class="interval-jump-column">
                          <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.longest?.startRef)">{{ getJumpLinkLabel(row.longest?.startRef, row.longest?.startMark || '-') }}</button>
                          <span class="interval-stack-arrow">↓</span>
                          <button class="jump-link" :disabled="!row.longest?.endRef" @click.stop="jumpToHistoryByEventRef(row.longest?.endRef)">{{ getJumpLinkLabel(row.longest?.endRef, row.longest?.endMark || '-') }}</button>
                        </div>
                      </template>
                      <template v-else>
                        <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.longest?.startRef)">{{ getJumpLinkLabel(row.longest?.startRef, row.longest?.startMark || '-') }}</button>
                        <span>→</span>
                        <button class="jump-link" :disabled="!row.longest?.endRef" @click.stop="jumpToHistoryByEventRef(row.longest?.endRef)">{{ getJumpLinkLabel(row.longest?.endRef, row.longest?.endMark || '-') }}</button>
                      </template>
                    </td>
                    <td>{{ formatGapValue(row.longest) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-limited-short" data-scroll-anchor="rel-limited-short" class="record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-limited-short') }}</h3>
                  <label class="fes-card-mode-toggle stats-checkbox">
                    <input :checked="intervalLimitedShowCardImages" type="checkbox" @change="onIntervalLimitedShowCardImagesChange" />
                    显示卡面
                  </label>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-limited-short', '相关记录_限定最短间隔')">PNG</button>
              </div>
              <table :class="['record-table', 'related-table', 'related-table-interval', { 'interval-record-table-card-mode': intervalLimitedShowCardImages }]">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th v-if="intervalLimitedShowCardImages">卡面</th>
                    <th>活动始末</th>
                    <th>最短</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in limitedShortestDisplayRecords" :key="`lim-short-${row.name}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <img
                        :src="`/chibi_s/${getCharAbbr(row.name)}.webp`"
                        class="record-avatar"
                        :class="{ 'interval-avatar-large': intervalLimitedShowCardImages }"
                        :style="{ borderColor: getCharColor(row.name) }"
                      />
                      <span v-if="!intervalLimitedShowCardImages">{{ row.name }}</span>
                    </td>
                    <td v-if="intervalLimitedShowCardImages" class="range-card-cell">
                      <template v-if="intervalLimitedShowCardImages">
                        <div class="interval-card-column">
                          <div class="interval-card-item is-stack-item">
                            <div v-if="row.shortestStartCardImageSrc" class="lineup-slot-card related-last-card-thumb interval-card-thumb">
                              <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                              <img
                                :src="row.shortestStartCardImageSrc"
                                :alt="`${row.name} 卡面`"
                                class="lineup-slot-card-img media-load-shimmer"
                                loading="lazy"
                                decoding="async"
                                @load="onMediaImageLoad"
                                @error="onMediaImageError"
                              />
                              <img
                                v-if="ATTRS.includes(row.shortestStartCardAttr)"
                                :src="`/elements/${String(row.shortestStartCardAttr).toLowerCase()}.png`"
                                :alt="ATTR_LABELS[row.shortestStartCardAttr]"
                                :title="ATTR_LABELS[row.shortestStartCardAttr]"
                                class="related-last-card-attr"
                              />
                            </div>
                            <span v-else class="score-empty">-</span>
                          </div>
                          <span class="interval-stack-arrow">↓</span>
                          <div class="interval-card-item is-stack-item">
                            <div v-if="row.shortestEndCardImageSrc" class="lineup-slot-card related-last-card-thumb interval-card-thumb">
                              <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                              <img
                                :src="row.shortestEndCardImageSrc"
                                :alt="`${row.name} 卡面`"
                                class="lineup-slot-card-img media-load-shimmer"
                                loading="lazy"
                                decoding="async"
                                @load="onMediaImageLoad"
                                @error="onMediaImageError"
                              />
                              <img
                                v-if="ATTRS.includes(row.shortestEndCardAttr)"
                                :src="`/elements/${String(row.shortestEndCardAttr).toLowerCase()}.png`"
                                :alt="ATTR_LABELS[row.shortestEndCardAttr]"
                                :title="ATTR_LABELS[row.shortestEndCardAttr]"
                                class="related-last-card-attr"
                              />
                            </div>
                            <span v-else class="score-empty">-</span>
                          </div>
                        </div>
                      </template>
                    </td>
                    <td class="range-cell" :class="{ 'is-card-mode': intervalLimitedShowCardImages }">
                      <template v-if="intervalLimitedShowCardImages">
                        <div class="interval-jump-column">
                          <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.shortest?.startRef)">{{ getJumpLinkLabel(row.shortest?.startRef, row.shortest?.startMark || '-') }}</button>
                          <span class="interval-stack-arrow">↓</span>
                          <button class="jump-link" :disabled="!row.shortest?.endRef" @click.stop="jumpToHistoryByEventRef(row.shortest?.endRef)">{{ getJumpLinkLabel(row.shortest?.endRef, row.shortest?.endMark || '-') }}</button>
                        </div>
                      </template>
                      <template v-else>
                        <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.shortest?.startRef)">{{ getJumpLinkLabel(row.shortest?.startRef, row.shortest?.startMark || '-') }}</button>
                        <span>→</span>
                        <button class="jump-link" :disabled="!row.shortest?.endRef" @click.stop="jumpToHistoryByEventRef(row.shortest?.endRef)">{{ getJumpLinkLabel(row.shortest?.endRef, row.shortest?.endMark || '-') }}</button>
                      </template>
                    </td>
                    <td>{{ formatGapValue(row.shortest) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-ban-long" data-scroll-anchor="rel-ban-long" class="record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-ban-long') }}</h3>
                  <label class="fes-card-mode-toggle stats-checkbox">
                    <input :checked="intervalBanShowCardImages" type="checkbox" @change="onIntervalBanShowCardImagesChange" />
                    显示卡面
                  </label>
                  <div class="head-inline-filters">
                    <label class="head-filter-toggle stats-checkbox" title="只统计箱活的Ban间隔。">
                      <input
                        type="checkbox"
                        :checked="banEventTypeFilter === '箱活'"
                        @change="setBanEventTypeFilter('箱活', $event.target.checked)"
                      />
                      仅箱
                    </label>
                    <label class="head-filter-toggle stats-checkbox" title="只统计混活的Ban间隔。">
                      <input
                        type="checkbox"
                        :checked="banEventTypeFilter === '混活'"
                        @change="setBanEventTypeFilter('混活', $event.target.checked)"
                      />
                      仅混
                    </label>
                  </div>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-ban-long', '相关记录_Ban最长间隔')">PNG</button>
              </div>
              <table :class="['record-table', 'related-table', 'related-table-interval', { 'interval-record-table-card-mode': intervalBanShowCardImages }]">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th v-if="intervalBanShowCardImages">卡面</th>
                    <th>活动始末</th>
                    <th>最长 Ban</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in banLongestDisplayRecords" :key="`ban-long-${row.name}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <img
                        :src="`/chibi_s/${getCharAbbr(row.name)}.webp`"
                        class="record-avatar"
                        :class="{ 'interval-avatar-large': intervalBanShowCardImages }"
                        :style="{ borderColor: getCharColor(row.name) }"
                      />
                      <span v-if="!intervalBanShowCardImages">{{ row.name }}</span>
                    </td>
                    <td v-if="intervalBanShowCardImages" class="range-card-cell">
                      <template v-if="intervalBanShowCardImages">
                        <div class="interval-card-column">
                          <div class="interval-card-item is-stack-item">
                            <div v-if="row.longestStartCardImageSrc" class="lineup-slot-card related-last-card-thumb interval-card-thumb">
                              <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                              <img
                                :src="row.longestStartCardImageSrc"
                                :alt="`${row.name} 卡面`"
                                class="lineup-slot-card-img media-load-shimmer"
                                loading="lazy"
                                decoding="async"
                                @load="onMediaImageLoad"
                                @error="onMediaImageError"
                              />
                              <img
                                v-if="ATTRS.includes(row.longestStartCardAttr)"
                                :src="`/elements/${String(row.longestStartCardAttr).toLowerCase()}.png`"
                                :alt="ATTR_LABELS[row.longestStartCardAttr]"
                                :title="ATTR_LABELS[row.longestStartCardAttr]"
                                class="related-last-card-attr"
                              />
                            </div>
                            <span v-else class="score-empty">-</span>
                          </div>
                          <span class="interval-stack-arrow">↓</span>
                          <div class="interval-card-item is-stack-item">
                            <div v-if="row.longestEndCardImageSrc" class="lineup-slot-card related-last-card-thumb interval-card-thumb">
                              <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                              <img
                                :src="row.longestEndCardImageSrc"
                                :alt="`${row.name} 卡面`"
                                class="lineup-slot-card-img media-load-shimmer"
                                loading="lazy"
                                decoding="async"
                                @load="onMediaImageLoad"
                                @error="onMediaImageError"
                              />
                              <img
                                v-if="ATTRS.includes(row.longestEndCardAttr)"
                                :src="`/elements/${String(row.longestEndCardAttr).toLowerCase()}.png`"
                                :alt="ATTR_LABELS[row.longestEndCardAttr]"
                                :title="ATTR_LABELS[row.longestEndCardAttr]"
                                class="related-last-card-attr"
                              />
                            </div>
                            <span v-else class="score-empty">-</span>
                          </div>
                        </div>
                      </template>
                    </td>
                    <td class="range-cell" :class="{ 'is-card-mode': intervalBanShowCardImages }">
                      <template v-if="intervalBanShowCardImages">
                        <div class="interval-jump-column">
                          <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.longest?.startRef)">{{ getJumpLinkLabel(row.longest?.startRef, row.longest?.startMark || '-') }}</button>
                          <span class="interval-stack-arrow">↓</span>
                          <button class="jump-link" :disabled="!row.longest?.endRef" @click.stop="jumpToHistoryByEventRef(row.longest?.endRef)">{{ getJumpLinkLabel(row.longest?.endRef, row.longest?.endMark || '-') }}</button>
                        </div>
                      </template>
                      <template v-else>
                        <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.longest?.startRef)">{{ getJumpLinkLabel(row.longest?.startRef, row.longest?.startMark || '-') }}</button>
                        <span>→</span>
                        <button class="jump-link" :disabled="!row.longest?.endRef" @click.stop="jumpToHistoryByEventRef(row.longest?.endRef)">{{ getJumpLinkLabel(row.longest?.endRef, row.longest?.endMark || '-') }}</button>
                      </template>
                    </td>
                    <td>{{ formatGapValue(row.longest) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-ban-short" data-scroll-anchor="rel-ban-short" class="record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-ban-short') }}</h3>
                  <label class="fes-card-mode-toggle stats-checkbox">
                    <input :checked="intervalBanShowCardImages" type="checkbox" @change="onIntervalBanShowCardImagesChange" />
                    显示卡面
                  </label>
                  <div class="head-inline-filters">
                    <label class="head-filter-toggle stats-checkbox" title="只统计箱活的Ban间隔。">
                      <input
                        type="checkbox"
                        :checked="banEventTypeFilter === '箱活'"
                        @change="setBanEventTypeFilter('箱活', $event.target.checked)"
                      />
                      仅箱
                    </label>
                    <label class="head-filter-toggle stats-checkbox" title="只统计混活的Ban间隔。">
                      <input
                        type="checkbox"
                        :checked="banEventTypeFilter === '混活'"
                        @change="setBanEventTypeFilter('混活', $event.target.checked)"
                      />
                      仅混
                    </label>
                  </div>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-ban-short', '相关记录_Ban最短间隔')">PNG</button>
              </div>
              <table :class="['record-table', 'related-table', 'related-table-interval', { 'interval-record-table-card-mode': intervalBanShowCardImages }]">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th v-if="intervalBanShowCardImages">卡面</th>
                    <th>活动始末</th>
                    <th>最短 Ban</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in banShortestDisplayRecords" :key="`ban-short-${row.name}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <img
                        :src="`/chibi_s/${getCharAbbr(row.name)}.webp`"
                        class="record-avatar"
                        :class="{ 'interval-avatar-large': intervalBanShowCardImages }"
                        :style="{ borderColor: getCharColor(row.name) }"
                      />
                      <span v-if="!intervalBanShowCardImages">{{ row.name }}</span>
                    </td>
                    <td v-if="intervalBanShowCardImages" class="range-card-cell">
                      <template v-if="intervalBanShowCardImages">
                        <div class="interval-card-column">
                          <div class="interval-card-item is-stack-item">
                            <div v-if="row.shortestStartCardImageSrc" class="lineup-slot-card related-last-card-thumb interval-card-thumb">
                              <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                              <img
                                :src="row.shortestStartCardImageSrc"
                                :alt="`${row.name} 卡面`"
                                class="lineup-slot-card-img media-load-shimmer"
                                loading="lazy"
                                decoding="async"
                                @load="onMediaImageLoad"
                                @error="onMediaImageError"
                              />
                              <img
                                v-if="ATTRS.includes(row.shortestStartCardAttr)"
                                :src="`/elements/${String(row.shortestStartCardAttr).toLowerCase()}.png`"
                                :alt="ATTR_LABELS[row.shortestStartCardAttr]"
                                :title="ATTR_LABELS[row.shortestStartCardAttr]"
                                class="related-last-card-attr"
                              />
                            </div>
                            <span v-else class="score-empty">-</span>
                          </div>
                          <span class="interval-stack-arrow">↓</span>
                          <div class="interval-card-item is-stack-item">
                            <div v-if="row.shortestEndCardImageSrc" class="lineup-slot-card related-last-card-thumb interval-card-thumb">
                              <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                              <img
                                :src="row.shortestEndCardImageSrc"
                                :alt="`${row.name} 卡面`"
                                class="lineup-slot-card-img media-load-shimmer"
                                loading="lazy"
                                decoding="async"
                                @load="onMediaImageLoad"
                                @error="onMediaImageError"
                              />
                              <img
                                v-if="ATTRS.includes(row.shortestEndCardAttr)"
                                :src="`/elements/${String(row.shortestEndCardAttr).toLowerCase()}.png`"
                                :alt="ATTR_LABELS[row.shortestEndCardAttr]"
                                :title="ATTR_LABELS[row.shortestEndCardAttr]"
                                class="related-last-card-attr"
                              />
                            </div>
                            <span v-else class="score-empty">-</span>
                          </div>
                        </div>
                      </template>
                    </td>
                    <td class="range-cell" :class="{ 'is-card-mode': intervalBanShowCardImages }">
                      <template v-if="intervalBanShowCardImages">
                        <div class="interval-jump-column">
                          <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.shortest?.startRef)">{{ getJumpLinkLabel(row.shortest?.startRef, row.shortest?.startMark || '-') }}</button>
                          <span class="interval-stack-arrow">↓</span>
                          <button class="jump-link" :disabled="!row.shortest?.endRef" @click.stop="jumpToHistoryByEventRef(row.shortest?.endRef)">{{ getJumpLinkLabel(row.shortest?.endRef, row.shortest?.endMark || '-') }}</button>
                        </div>
                      </template>
                      <template v-else>
                        <button class="jump-link" @click.stop="jumpToHistoryByEventRef(row.shortest?.startRef)">{{ getJumpLinkLabel(row.shortest?.startRef, row.shortest?.startMark || '-') }}</button>
                        <span>→</span>
                        <button class="jump-link" :disabled="!row.shortest?.endRef" @click.stop="jumpToHistoryByEventRef(row.shortest?.endRef)">{{ getJumpLinkLabel(row.shortest?.endRef, row.shortest?.endMark || '-') }}</button>
                      </template>
                    </td>
                    <td>{{ formatGapValue(row.shortest) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-vs-unit-last-four" data-scroll-anchor="rel-vs-unit-last-four" class="record-block">
              <div class="record-head-row">
                <div class="record-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-vs-unit-last-four') }}</h3>
                  <div class="record-head-controls">
                    <label class="record-compact-toggle stats-checkbox">
                      <input :checked="vsUnitLastFourCompact" type="checkbox" @change="onVsUnitLastFourCompactChange" />
                      简略版本
                    </label>
                    <label v-if="!vsUnitLastFourCompact" class="fes-card-mode-toggle stats-checkbox">
                      <input :checked="vsUnitLastFourShowCardImages" type="checkbox" @change="onVsUnitLastFourShowCardImagesChange" />
                      显示卡面
                    </label>
                    <button
                      v-if="!vsUnitLastFourCompact"
                      class="record-sort-btn"
                      :class="{ active: vsUnitLastFourSort !== 'char' }"
                      @click="onToggleVsUnitLastFourSort"
                    >
                      {{ vsUnitLastFourSortLabel }}
                    </button>
                  </div>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-vs-unit-last-four', '相关记录_各团虚拟歌手上次四星')">PNG</button>
              </div>

              <table v-if="!vsUnitLastFourCompact" :class="['record-table', 'related-table', 'related-table-vs-last', { 'vs-last-four-card-mode': vsUnitLastFourShowCardImages }]">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th v-if="vsUnitLastFourShowCardImages">卡面</th>
                    <th>活动</th>
                    <th>日期</th>
                    <th>距今</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in vsUnitLastFourDisplayRecords" :key="`vs-unit-last-four-${row.key}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <span class="record-avatar-stack">
                        <img
                          :src="`/chibi_s/${getCharAbbr(row.name)}.webp`"
                          class="record-avatar"
                          :class="{ 'vs-last-four-avatar-large': vsUnitLastFourShowCardImages }"
                          :style="{ borderColor: getCharColor(row.name) }"
                        />
                        <span v-if="getVsUnitLogoByKey(row.key)" class="record-avatar-corner-badge" :class="{ 'is-large': vsUnitLastFourShowCardImages }">
                          <img :src="getVsUnitLogoByKey(row.key)" class="record-avatar-corner-logo" :alt="row.label" />
                        </span>
                      </span>
                      <span v-if="!vsUnitLastFourShowCardImages">{{ row.label }}</span>
                    </td>
                    <td v-if="vsUnitLastFourShowCardImages" class="related-last-card-cell">
                      <div v-if="row.cardImageSrc" class="lineup-slot-card related-last-card-thumb">
                        <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                        <img
                          :src="row.cardImageSrc"
                          :alt="`${row.label} 卡面`"
                          class="lineup-slot-card-img media-load-shimmer"
                          loading="lazy"
                          decoding="async"
                          @load="onMediaImageLoad"
                          @error="onMediaImageError"
                        />
                        <img
                          v-if="ATTRS.includes(row.cardAttr)"
                          :src="`/elements/${String(row.cardAttr).toLowerCase()}.png`"
                          :alt="ATTR_LABELS[row.cardAttr]"
                          :title="ATTR_LABELS[row.cardAttr]"
                          class="related-last-card-attr"
                        />
                      </div>
                      <span v-else class="score-empty">-</span>
                    </td>
                    <td>
                      <button class="jump-link" :disabled="!row.eventRef" @click.stop="jumpToHistoryByEventRef(row.eventRef)">{{ getJumpLinkLabel(row.eventRef, row.eventLabel) }}</button>
                    </td>
                    <td>{{ row.date }}</td>
                    <td>{{ row.days }}天 | {{ row.periods }}期</td>
                  </tr>
                </tbody>
              </table>

              <table v-else class="record-table vs-unit-score-table vs-unit-last-four-mini-table">
                <thead>
                  <tr>
                    <th>团体</th>
                    <th v-for="name in VS_NAMES" :key="`mini-head-${name}`" :style="getVsMiniVsHeadStyle(name)">
                      <img :src="`/chibi_s/${getCharAbbr(name)}.webp`" class="record-avatar" :style="{ borderColor: getCharColor(name) }" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in vsUnitLastFourCompactUnitRows" :key="`mini-row-${row.unit}`">
                    <td class="record-char vs-score-char-cell" :style="getVsMiniUnitHeadStyle(row.unit)">
                      <img :src="unitLogoMap[row.unit]" class="mini-unit-logo" :alt="row.unit" />
                    </td>
                    <td v-for="name in VS_NAMES" :key="`mini-cell-${row.unit}-${name}`" class="vs-mini-days-cell" :style="getVsMiniDataCellStyle(row.daysByVs[name])">{{ row.daysByVs[name] }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-vs-unit-four-count" data-scroll-anchor="rel-vs-unit-four-count" class="record-block">
              <div class="record-head-row">
                <div class="record-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-vs-unit-four-count') }}</h3>
                  <div class="record-head-controls">
                    <label class="record-compact-toggle stats-checkbox">
                      <input :checked="vsUnitFourCountCompact" type="checkbox" @change="onVsUnitFourCountCompactChange" />
                      简略版本
                    </label>
                    <label v-if="!vsUnitFourCountCompact" class="fes-card-mode-toggle stats-checkbox">
                      <input :checked="vsUnitFourCountShowCardImages" type="checkbox" @change="onVsUnitFourCountShowCardImagesChange" />
                      显示卡面
                    </label>
                    <button
                      v-if="!vsUnitFourCountCompact"
                      class="record-sort-btn"
                      :class="{ active: vsUnitFourCountSort !== 'char' }"
                      @click="onToggleVsUnitFourCountSort"
                    >
                      {{ vsUnitFourCountSortLabel }}
                    </button>
                  </div>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-vs-unit-four-count', '相关记录_各团VS四星数')">PNG</button>
              </div>

              <table v-if="!vsUnitFourCountCompact" :class="['record-table', 'related-table', 'related-table-vs-last', 'vs-four-count-detail-table', { 'vs-last-four-card-mode': vsUnitFourCountShowCardImages }]">
                <thead>
                  <tr>
                    <th>角色</th>
                    <th>数量</th>
                    <th>{{ vsUnitFourCountShowCardImages ? '卡面' : '属性' }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in vsUnitFourCountDisplayRecords" :key="`vs-four-detail-row-${row.key}`" :style="{ backgroundColor: getRecordTint(row.name), '--record-tint': getRecordTint(row.name, 0.3) }">
                    <td class="record-char">
                      <span class="record-avatar-stack">
                        <img
                          :src="getVsUnitVariantAvatarSrc(row.key, row.name)"
                          class="record-avatar"
                          :class="{ 'vs-last-four-avatar-large': vsUnitFourCountShowCardImages }"
                          :style="{ borderColor: getCharColor(row.name) }"
                          @error="onVsUnitVariantAvatarError"
                        />
                        <span v-if="getVsUnitLogoByKey(row.key)" class="record-avatar-corner-badge" :class="{ 'is-large': vsUnitFourCountShowCardImages }">
                          <img :src="getVsUnitLogoByKey(row.key)" class="record-avatar-corner-logo" :alt="row.label" />
                        </span>
                      </span>
                      <span v-if="!vsUnitFourCountShowCardImages">{{ row.label }}</span>
                    </td>
                    <td class="vs-four-count-value-cell"><span class="vs-four-count-value">{{ row.count }}</span></td>
                    <td>
                      <template v-if="vsUnitFourCountShowCardImages">
                        <div v-if="row.cards.length" class="score-card-wrap">
                          <div
                            v-for="(card, idx) in row.cards"
                            :key="`vs-four-card-${row.key}-${card.cardId || 'na'}-${idx}`"
                            class="fes-card-thumb"
                            :title="`${row.label} #${card.cardId || '-'}`"
                          >
                            <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                            <img
                              v-if="card.imageSrc"
                              :src="card.imageSrc"
                              :alt="`${row.label} 卡面`"
                              class="fes-card-thumb-img media-load-shimmer"
                              loading="lazy"
                              decoding="async"
                              @load="onMediaImageLoad"
                              @error="onMediaImageError"
                            />
                            <img
                              v-if="ATTRS.includes(card.attr)"
                              :src="`/elements/${String(card.attr).toLowerCase()}.png`"
                              class="fes-card-thumb-attr"
                              :alt="ATTR_LABELS[card.attr]"
                              :title="ATTR_LABELS[card.attr]"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                        </div>
                        <span v-else class="score-empty">-</span>
                      </template>
                      <template v-else>
                        <div v-if="row.attrs.length" class="score-attr-wrap">
                          <img
                            v-for="(attr, idx) in row.attrs"
                            :key="`vs-four-attr-${row.key}-${idx}`"
                            :src="`/elements/${String(attr).toLowerCase()}.png`"
                            :title="ATTR_LABELS[attr] || attr"
                            :alt="ATTR_LABELS[attr] || attr"
                            class="score-attr-icon"
                          />
                        </div>
                        <span v-else class="score-empty">-</span>
                      </template>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table v-else class="record-table vs-unit-score-table vs-unit-last-four-mini-table">
                <thead>
                  <tr>
                    <th>团体</th>
                    <th v-for="name in VS_NAMES" :key="`vs-four-count-head-${name}`" :style="getVsScoreVsHeadStyle(name)">
                      <img :src="`/chibi_s/${getCharAbbr(name)}.webp`" class="record-avatar" :style="{ borderColor: getCharColor(name) }" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in vsUnitFourCountRows" :key="`vs-four-count-row-${row.unit}`">
                    <td class="record-char vs-score-char-cell" :style="getVsScoreUnitHeadStyle(row.unit)">
                      <img :src="unitLogoMap[row.unit]" class="mini-unit-logo" :alt="row.unit" />
                    </td>
                    <td
                      v-for="name in VS_NAMES"
                      :key="`vs-four-count-cell-${row.unit}-${name}`"
                      :class="['vs-mini-days-cell', getVsFourCountMiniCellClass(row.countByVs[name])]"
                      :style="getVsScoreCellStyle(name, row.unit)"
                    >
                      <span v-if="Number(row.countByVs[name] || 0) > 0">{{ row.countByVs[name] }}</span>
                      <span v-else class="score-empty">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-vs-unit-score" data-scroll-anchor="rel-vs-unit-score" class="record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-vs-unit-score') }}</h3>
                  <label class="fes-card-mode-toggle stats-checkbox">
                    <input :checked="vsUnitScoreShowCardImages" type="checkbox" @change="onVsUnitScoreShowCardImagesChange" />
                    <span>显示卡面</span>
                  </label>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-vs-unit-score', '相关记录_团分统计')">PNG</button>
              </div>
              <table :class="['record-table', 'vs-unit-score-table', { 'is-card-mode': vsUnitScoreShowCardImages }]">
                <thead>
                  <tr>
                    <th>团体</th>
                    <th v-for="name in VS_NAMES" :key="`score-head-${name}`" :style="getVsScoreVsHeadStyle(name)">
                      <img :src="`/chibi_s/${getCharAbbr(name)}.webp`" class="record-avatar" :style="{ borderColor: getCharColor(name) }" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in vsUnitScoreAttrByUnitRows" :key="`score-row-${row.unit}`">
                    <td class="record-char vs-score-char-cell" :style="getVsScoreUnitHeadStyle(row.unit)">
                      <img :src="unitLogoMap[row.unit]" class="mini-unit-logo" :alt="row.unit" />
                    </td>
                    <td v-for="name in VS_NAMES" :key="`score-cell-${row.unit}-${name}`" :style="getVsScoreCellStyle(name, row.unit)">
                      <div v-if="vsUnitScoreShowCardImages && row.cardsByVs[name]?.length" class="score-card-wrap">
                        <div
                          v-for="(card, idx) in row.cardsByVs[name]"
                          :key="`score-card-${row.unit}-${name}-${card.cardId || 'na'}-${idx}`"
                          class="fes-card-thumb"
                          :title="`${name} #${card.cardId || '-'}`"
                        >
                          <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                          <img
                            v-if="card.imageSrc"
                            :src="card.imageSrc"
                            :alt="`${name} 卡面`"
                            class="fes-card-thumb-img media-load-shimmer"
                            loading="lazy"
                            decoding="async"
                            @load="onMediaImageLoad"
                            @error="onMediaImageError"
                          />
                          <img
                            v-if="ATTRS.includes(card.attr)"
                            :src="`/elements/${String(card.attr).toLowerCase()}.png`"
                            class="fes-card-thumb-attr"
                            :alt="ATTR_LABELS[card.attr]"
                            :title="ATTR_LABELS[card.attr]"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      </div>
                      <div v-else-if="row.attrsByVs[name]?.length" class="score-attr-wrap">
                        <img
                          v-for="(attr, idx) in row.attrsByVs[name]"
                          :key="`score-attr-${row.unit}-${name}-${idx}`"
                          :src="`/elements/${String(attr).toLowerCase()}.png`"
                          :title="attr"
                          class="score-attr-icon"
                        />
                      </div>
                      <span v-else class="score-empty">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-vs-original-stat" data-scroll-anchor="rel-vs-original-stat" class="record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-vs-original-stat') }}</h3>
                  <label class="fes-card-mode-toggle stats-checkbox">
                    <input :checked="vsOriginalStatShowCardImages" type="checkbox" @change="onVsOriginalStatShowCardImagesChange" />
                    <span>显示卡面</span>
                  </label>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-vs-original-stat', '相关记录_原V统计')">PNG</button>
              </div>
              <table :class="['record-table', 'vs-unit-score-table', 'vs-original-stat-table', { 'is-card-mode': vsOriginalStatShowCardImages }]">
                <thead>
                  <tr>
                    <th>类型</th>
                    <th v-for="name in VS_NAMES" :key="`vs-original-head-${name}`" :style="getVsScoreVsHeadStyle(name)">
                      <img :src="`/chibi_s/${getCharAbbr(name)}.webp`" class="record-avatar" :style="{ borderColor: getCharColor(name) }" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in vsOriginalStatRows" :key="`vs-original-row-${row.type}`">
                    <td class="record-char vs-original-type-cell">{{ row.type }}</td>
                    <td
                      v-if="vsOriginalStatShowCardImages && row.type === '其他'"
                      :colspan="VS_NAMES.length"
                      :style="getVsOriginalStatCellStyle(VS_NAMES[0] || '')"
                    >
                      <div v-if="getVsOriginalOtherRowCards(row).length" class="score-card-wrap score-card-wrap-merged-six">
                        <div
                          v-for="(card, idx) in getVsOriginalOtherRowCards(row)"
                          :key="`vs-original-other-card-${card.cardId || 'na'}-${idx}`"
                          class="fes-card-thumb"
                          :title="`${card.name} #${card.cardId || '-'}`"
                        >
                          <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                          <img
                            v-if="card.imageSrc"
                            :src="card.imageSrc"
                            :alt="`${card.name} 卡面`"
                            class="fes-card-thumb-img media-load-shimmer"
                            loading="lazy"
                            decoding="async"
                            @load="onMediaImageLoad"
                            @error="onMediaImageError"
                          />
                          <img
                            v-if="ATTRS.includes(card.attr)"
                            :src="`/elements/${String(card.attr).toLowerCase()}.png`"
                            class="fes-card-thumb-attr"
                            :alt="ATTR_LABELS[card.attr]"
                            :title="ATTR_LABELS[card.attr]"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      </div>
                      <span v-else class="score-empty">-</span>
                    </td>
                    <td
                      v-else-if="!vsOriginalStatShowCardImages && row.type === '其他'"
                      :colspan="VS_NAMES.length"
                      class="vs-original-other-compact-cell"
                    >
                      <div class="score-attr-wrap">
                        <img
                          v-for="(attr, idx) in getVsOriginalOtherRowAttrs(row)"
                          :key="`vs-original-other-compact-attr-${idx}`"
                          :src="`/elements/${String(attr).toLowerCase()}.png`"
                          :title="ATTR_LABELS[attr] || attr"
                          :alt="ATTR_LABELS[attr] || attr"
                          class="score-attr-icon"
                        />
                      </div>
                      <span v-if="!getVsOriginalOtherRowAttrs(row).length" class="score-empty">-</span>
                    </td>
                    <template v-else>
                      <td v-for="name in VS_NAMES" :key="`vs-original-cell-${row.type}-${name}`" :style="getVsOriginalStatCellStyle(name)">
                        <div v-if="vsOriginalStatShowCardImages && row.cardsByVs[name]?.length" class="score-card-wrap">
                          <div
                            v-for="(card, idx) in row.cardsByVs[name]"
                            :key="`vs-original-card-${row.type}-${name}-${card.cardId || 'na'}-${idx}`"
                            class="fes-card-thumb"
                            :title="`${name} #${card.cardId || '-'}`"
                          >
                            <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                            <img
                              v-if="card.imageSrc"
                              :src="card.imageSrc"
                              :alt="`${name} 卡面`"
                              class="fes-card-thumb-img media-load-shimmer"
                              loading="lazy"
                              decoding="async"
                              @load="onMediaImageLoad"
                              @error="onMediaImageError"
                            />
                            <img
                              v-if="ATTRS.includes(card.attr)"
                              :src="`/elements/${String(card.attr).toLowerCase()}.png`"
                              class="fes-card-thumb-attr"
                              :alt="ATTR_LABELS[card.attr]"
                              :title="ATTR_LABELS[card.attr]"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                        </div>
                        <div v-else-if="row.attrsByVs[name]?.length" class="score-attr-wrap">
                          <img
                            v-for="(attr, idx) in row.attrsByVs[name]"
                            :key="`vs-original-attr-${row.type}-${name}-${idx}`"
                            :src="`/elements/${String(attr).toLowerCase()}.png`"
                            :title="ATTR_LABELS[attr] || attr"
                            :alt="ATTR_LABELS[attr] || attr"
                            class="score-attr-icon"
                          />
                        </div>
                        <span v-else class="score-empty">-</span>
                      </td>
                    </template>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-cfes-stat" data-scroll-anchor="rel-cfes-stat" class="record-block fes-record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-cfes-stat') }}</h3>
                  <label class="support-wl-toggle fes-card-mode-toggle stats-checkbox export-hide">
                    <input :checked="fesRecordShowCardImages" type="checkbox" @change="onFesRecordShowCardImagesChange" />
                    <span>显示卡面</span>
                  </label>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-cfes-stat', '相关记录_CFES统计')">PNG</button>
              </div>
              <table class="record-table fes-record-table" :class="{ 'is-card-mode': fesRecordShowCardImages }">
                <thead>
                  <tr>
                    <th class="fes-row-head" aria-label="团体"></th>
                    <th v-if="!fesRecordShowCardImages" v-for="attr in ATTRS" :key="`cfes-head-${attr}`" :style="getFesMatrixAttrHeadStyle(attr)">
                      <img :src="`/elements/${String(attr).toLowerCase()}.png`" class="fes-attr-icon" :alt="ATTR_LABELS[attr]" :title="ATTR_LABELS[attr]" />
                    </th>
                    <th v-else class="fes-cards-head">卡面</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="unit in RELATED_FES_UNITS" :key="`cfes-row-${unit}`">
                    <td class="fes-unit-head" :style="getFesMatrixUnitHeadStyle(unit)">
                      <img :src="unitLogoMap[unit]" class="mini-unit-logo" :alt="unit" :title="unit.toUpperCase()" />
                    </td>
                    <td
                      v-if="!fesRecordShowCardImages"
                      v-for="attr in ATTRS"
                      :key="`cfes-cell-${unit}-${attr}`"
                      :style="getFesMatrixCellStyle(unit, attr)"
                    >
                      <div v-if="cfesRecordMatrix.iconRows[unit][attr]?.length" class="fes-cell-icons">
                        <img
                          v-for="icon in cfesRecordMatrix.iconRows[unit][attr]"
                          :key="`cfes-icon-${unit}-${attr}-${icon.iconKey}`"
                          :src="`/chibi_s/${icon.iconKey}.webp`"
                          class="fes-cell-avatar"
                          :title="icon.name"
                          :alt="icon.name"
                          :style="{ borderColor: getCharColor(icon.name) }"
                        />
                      </div>
                      <span v-else class="score-empty">-</span>
                    </td>
                    <td v-else class="fes-card-strip-cell" :style="getFesMatrixUnitStripCellStyle(unit)">
                      <div class="fes-card-strip">
                        <div
                          v-for="(card, cardIdx) in cfesRecordMatrix.cardsByUnit[unit]"
                          :key="`cfes-card-${unit}-${card.cardId || 'na'}-${card.name}-${cardIdx}`"
                          class="fes-card-thumb"
                          :title="`${card.name} #${card.cardId || '-'}`"
                        >
                          <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                          <img
                            v-if="card.imageSrc"
                            :src="card.imageSrc"
                            :alt="`${card.name} 卡面`"
                            class="fes-card-thumb-img media-load-shimmer"
                            loading="lazy"
                            decoding="async"
                            @load="onMediaImageLoad"
                            @error="onMediaImageError"
                          />
                          <img
                            v-if="ATTRS.includes(card.attr)"
                            :src="`/elements/${String(card.attr).toLowerCase()}.png`"
                            class="fes-card-thumb-attr"
                            :alt="ATTR_LABELS[card.attr]"
                            :title="ATTR_LABELS[card.attr]"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <span v-if="!cfesRecordMatrix.cardsByUnit[unit]?.length" class="score-empty">-</span>
                      </div>
                    </td>
                  </tr>
                  <tr class="fes-total-row">
                    <td class="fes-total-head">总计</td>
                    <td v-if="!fesRecordShowCardImages" v-for="attr in ATTRS" :key="`cfes-total-${attr}`" class="fes-total-num" :style="getFesMatrixTotalCellStyle(attr)">
                      {{ cfesRecordMatrix.totals[attr] }}
                    </td>
                    <td v-else class="fes-total-attr-wrap-cell">
                      <div class="fes-total-attr-wrap">
                        <span v-for="attr in ATTRS" :key="`cfes-total-card-${attr}`" class="fes-total-attr-item" :style="getFesMatrixTotalChipStyle(attr)">
                          <img :src="`/elements/${String(attr).toLowerCase()}.png`" class="fes-total-attr-icon" :alt="ATTR_LABELS[attr]" :title="ATTR_LABELS[attr]" />
                          <span class="fes-total-attr-num">{{ cfesRecordMatrix.totals[attr] }}</span>
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="rel-bfes-stat" data-scroll-anchor="rel-bfes-stat" class="record-block fes-record-block">
              <div class="block-head">
                <div class="block-head-left">
                  <h3>{{ getRelatedRecordTitle('rel-bfes-stat') }}</h3>
                  <label class="support-wl-toggle fes-card-mode-toggle stats-checkbox export-hide">
                    <input :checked="fesRecordShowCardImages" type="checkbox" @change="onFesRecordShowCardImagesChange" />
                    <span>显示卡面</span>
                  </label>
                </div>
                <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('rel-bfes-stat', '相关记录_BFES统计')">PNG</button>
              </div>
              <table class="record-table fes-record-table" :class="{ 'is-card-mode': fesRecordShowCardImages }">
                <thead>
                  <tr>
                    <th class="fes-row-head" aria-label="团体"></th>
                    <th v-if="!fesRecordShowCardImages" v-for="attr in ATTRS" :key="`bfes-head-${attr}`" :style="getFesMatrixAttrHeadStyle(attr)">
                      <img :src="`/elements/${String(attr).toLowerCase()}.png`" class="fes-attr-icon" :alt="ATTR_LABELS[attr]" :title="ATTR_LABELS[attr]" />
                    </th>
                    <th v-else class="fes-cards-head">卡面</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="unit in RELATED_FES_UNITS" :key="`bfes-row-${unit}`">
                    <td class="fes-unit-head" :style="getFesMatrixUnitHeadStyle(unit)">
                      <img :src="unitLogoMap[unit]" class="mini-unit-logo" :alt="unit" :title="unit.toUpperCase()" />
                    </td>
                    <td
                      v-if="!fesRecordShowCardImages"
                      v-for="attr in ATTRS"
                      :key="`bfes-cell-${unit}-${attr}`"
                      :style="getFesMatrixCellStyle(unit, attr)"
                    >
                      <div v-if="bfesRecordMatrix.iconRows[unit][attr]?.length" class="fes-cell-icons">
                        <img
                          v-for="icon in bfesRecordMatrix.iconRows[unit][attr]"
                          :key="`bfes-icon-${unit}-${attr}-${icon.iconKey}`"
                          :src="`/chibi_s/${icon.iconKey}.webp`"
                          class="fes-cell-avatar"
                          :title="icon.name"
                          :alt="icon.name"
                          :style="{ borderColor: getCharColor(icon.name) }"
                        />
                      </div>
                      <span v-else class="score-empty">-</span>
                    </td>
                    <td v-else class="fes-card-strip-cell" :style="getFesMatrixUnitStripCellStyle(unit)">
                      <div class="fes-card-strip">
                        <div
                          v-for="(card, cardIdx) in bfesRecordMatrix.cardsByUnit[unit]"
                          :key="`bfes-card-${unit}-${card.cardId || 'na'}-${card.name}-${cardIdx}`"
                          class="fes-card-thumb"
                          :title="`${card.name} #${card.cardId || '-'}`"
                        >
                          <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                          <img
                            v-if="card.imageSrc"
                            :src="card.imageSrc"
                            :alt="`${card.name} 卡面`"
                            class="fes-card-thumb-img media-load-shimmer"
                            loading="lazy"
                            decoding="async"
                            @load="onMediaImageLoad"
                            @error="onMediaImageError"
                          />
                          <img
                            v-if="ATTRS.includes(card.attr)"
                            :src="`/elements/${String(card.attr).toLowerCase()}.png`"
                            class="fes-card-thumb-attr"
                            :alt="ATTR_LABELS[card.attr]"
                            :title="ATTR_LABELS[card.attr]"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <span v-if="!bfesRecordMatrix.cardsByUnit[unit]?.length" class="score-empty">-</span>
                      </div>
                    </td>
                  </tr>
                  <tr class="fes-total-row">
                    <td class="fes-total-head">总计</td>
                    <td v-if="!fesRecordShowCardImages" v-for="attr in ATTRS" :key="`bfes-total-${attr}`" class="fes-total-num" :style="getFesMatrixTotalCellStyle(attr)">
                      {{ bfesRecordMatrix.totals[attr] }}
                    </td>
                    <td v-else class="fes-total-attr-wrap-cell">
                      <div class="fes-total-attr-wrap">
                        <span v-for="attr in ATTRS" :key="`bfes-total-card-${attr}`" class="fes-total-attr-item" :style="getFesMatrixTotalChipStyle(attr)">
                          <img :src="`/elements/${String(attr).toLowerCase()}.png`" class="fes-total-attr-icon" :alt="ATTR_LABELS[attr]" :title="ATTR_LABELS[attr]" />
                          <span class="fes-total-attr-num">{{ bfesRecordMatrix.totals[attr] }}</span>
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div id="panel-lineup" data-scroll-anchor="panel-lineup" class="stats-section card-panel lineup-panel">
          <div class="section-head">
            <div class="section-head-left">
              <h2>日挑配队</h2>
              <label class="support-wl-toggle fes-card-mode-toggle stats-checkbox export-hide">
                <input :checked="lineupShowCardImages" type="checkbox" @change="onLineupShowCardImagesChange" />
                <span>显示卡面</span>
              </label>
            </div>
            <div class="lineup-section-actions">
              <button class="lineup-toggle-btn lineup-toggle-btn-global" @click="toggleLineupExpandedAll($event)">{{ getLineupGlobalToggleLabel() }}</button>
              <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-lineup', '日挑配队')">PNG</button>
            </div>
          </div>
          <div class="lineup-tip">注意：仅从技能分值角度考虑最佳配队，不考虑其他影响（如综合力、歌曲、难度等）。配队不唯一，新卡优先显示。</div>
          <div class="lineup-grid">
            <div
              v-for="row in characterLineupRows"
              :key="`lineup-${row.name}`"
              :id="getLineupCardId(row.name)"
              :data-scroll-anchor="getLineupCardId(row.name)"
              class="lineup-card"
              :style="{ '--lineup-accent': getCharColor(row.name), '--unit-card-accent-color': getMatrixUnitColor(row.name), backgroundColor: getRecordTint(row.name, 0.2) }"
            >
              <div class="lineup-char-head">
                <div class="lineup-char-main">
                  <img :src="`/chibi_s/${getCharAbbr(row.name)}.webp`" class="lineup-char-avatar" :style="{ borderColor: getCharColor(row.name) }" />
                  <div class="lineup-char-text">
                    <div class="lineup-char-name">{{ row.name }}</div>
                    <div class="lineup-char-sub">最优属性：{{ ATTR_LABELS[row.bestPlan.attr] }} {{ row.bestPlan.total }}</div>
                  </div>
                </div>
                <div class="lineup-head-actions">
                  <button
                    v-if="row.otherPlans.length"
                    class="lineup-toggle-btn"
                    @click="toggleLineupExpanded(row.name, $event)"
                  >
                    {{ getLineupToggleLabel(row.name, row.otherPlans.length) }}
                  </button>
                  <button
                    class="card-export-btn"
                    :disabled="isExportingPng"
                    @click="exportElementPng(getLineupCardId(row.name), `日挑配队_${row.name}`)"
                  >PNG</button>
                </div>
              </div>

              <div class="lineup-plan-row lineup-plan-main" :style="getLineupRowStyle(row.bestPlan.attr)">
                <div class="lineup-attr-cell">
                  <img :src="`/elements/${String(row.bestPlan.attr).toLowerCase()}.png`" class="lineup-attr-icon" :title="ATTR_LABELS[row.bestPlan.attr]" />
                </div>
                <div
                  v-for="(slot, idx) in row.bestPlan.memberSlots"
                  :key="`main-${row.name}-${row.bestPlan.attr}-${idx}`"
                  class="lineup-member-cell"
                  :class="{ 'is-empty': !slot, 'is-cfes': slot?.fesKind === 'cfes', 'is-bfes': slot?.fesKind === 'bfes', 'is-card-mode': lineupShowCardImages && !!slot }"
                  :style="getLineupMemberCellStyle(slot, row.bestPlan.attr)"
                >
                  <template v-if="slot">
                    <template v-if="lineupShowCardImages">
                      <div class="lineup-slot-card">
                        <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                        <img
                          v-if="getLineupSlotCardImageSrc(slot)"
                          :src="getLineupSlotCardImageSrc(slot)"
                          :alt="`${slot.name} 卡面`"
                          class="lineup-slot-card-img media-load-shimmer"
                          loading="lazy"
                          decoding="async"
                          @load="onMediaImageLoad"
                          @error="onMediaImageError"
                        />
                      </div>
                      <div class="lineup-member-score">{{ slot.score }}</div>
                    </template>
                    <template v-else>
                      <div class="lineup-member-score">{{ slot.score }}</div>
                      <button class="jump-link lineup-jump" :disabled="!slot.eventRef" @click.stop="jumpToHistoryByEventRef(slot.eventRef)">{{ getJumpLinkLabel(slot.eventRef, slot.eventLabel) }}</button>
                    </template>
                  </template>
                  <span v-else class="lineup-empty">-</span>
                </div>
                <div class="lineup-total-cell">{{ row.bestPlan.total }}</div>
              </div>

              <div v-if="row.otherPlans.length && isLineupExpanded(row.name)" class="lineup-more-list">
                <div
                  v-for="plan in row.otherPlans"
                  :key="`other-${row.name}-${plan.attr}`"
                  class="lineup-plan-row"
                  :style="getLineupRowStyle(plan.attr)"
                >
                  <div class="lineup-attr-cell">
                    <img :src="`/elements/${String(plan.attr).toLowerCase()}.png`" class="lineup-attr-icon" :title="ATTR_LABELS[plan.attr]" />
                  </div>
                  <div
                    v-for="(slot, idx) in plan.memberSlots"
                    :key="`slot-${row.name}-${plan.attr}-${idx}`"
                    class="lineup-member-cell"
                    :class="{ 'is-empty': !slot, 'is-cfes': slot?.fesKind === 'cfes', 'is-bfes': slot?.fesKind === 'bfes', 'is-card-mode': lineupShowCardImages && !!slot }"
                    :style="getLineupMemberCellStyle(slot, plan.attr)"
                  >
                    <template v-if="slot">
                      <template v-if="lineupShowCardImages">
                        <div class="lineup-slot-card">
                          <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                          <img
                            v-if="getLineupSlotCardImageSrc(slot)"
                            :src="getLineupSlotCardImageSrc(slot)"
                            :alt="`${slot.name} 卡面`"
                            class="lineup-slot-card-img media-load-shimmer"
                            loading="lazy"
                            decoding="async"
                            @load="onMediaImageLoad"
                            @error="onMediaImageError"
                          />
                        </div>
                        <div class="lineup-member-score">{{ slot.score }}</div>
                      </template>
                      <template v-else>
                        <div class="lineup-member-score">{{ slot.score }}</div>
                        <button class="jump-link lineup-jump" :disabled="!slot.eventRef" @click.stop="jumpToHistoryByEventRef(slot.eventRef)">{{ getJumpLinkLabel(slot.eventRef, slot.eventLabel) }}</button>
                      </template>
                    </template>
                    <span v-else class="lineup-empty">-</span>
                  </div>
                  <div class="lineup-total-cell">{{ plan.total }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="panel-support" data-scroll-anchor="panel-support" class="stats-section card-panel support-panel">
          <div class="section-head">
            <div class="section-head-left">
              <h2>支援配队</h2>
              <label class="support-wl-toggle fes-card-mode-toggle stats-checkbox export-hide">
                <input :checked="supportShowCardImages" type="checkbox" @change="onSupportShowCardImagesChange" />
                <span>显示卡面</span>
              </label>
              <label class="support-wl-toggle stats-checkbox export-hide" title="勾选后才计算并显示 WL 配队（更耗时）。">
                <input :checked="supportEnableWlLineup" type="checkbox" @change="onSupportEnableWlLineupChange" />
                <span>WL配队</span>
              </label>
            </div>
            <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-support', '支援配队')">PNG</button>
          </div>
          <div class="lineup-tip">注意：仅从技能分值角度考虑最佳配队，不考虑其他影响（如综合力、歌曲、难度等）。配队不唯一，同分卡会优先取OC，再取VS，且新卡优先显示。</div>
          <div class="support-grid">
            <div
              v-for="unitRow in supportLineupRows"
              :key="`support-${unitRow.unit}`"
              :id="getSupportCardId(unitRow.unit)"
              :data-scroll-anchor="getSupportCardId(unitRow.unit)"
              class="support-card"
              :style="{ '--unit-card-accent-color': getUnitAccentColor(unitRow.unit), backgroundColor: hexToRgba(getUnitAccentColor(unitRow.unit), 0.12) }"
            >
              <div class="support-head">
                <img :src="supportUnitTitleLogoMap[unitRow.unit] || unitLogoMap[unitRow.unit]" class="support-unit-title-logo" :title="unitRow.unit.toUpperCase()" />
                <div class="support-head-actions">
                  <label v-if="unitRow.unit === 'vs'" class="support-vs-toggle stats-checkbox export-hide">
                    <input :checked="supportUseOriginalVsTeam" type="checkbox" @change="onSupportUseOriginalVsTeamChange" />
                    <span>原v队</span>
                  </label>
                  <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng(getSupportCardId(unitRow.unit), `支援配队_${unitRow.unit.toUpperCase()}`)">PNG</button>
                </div>
              </div>

              <div
                v-for="plan in unitRow.plans"
                :key="`support-${unitRow.unit}-${plan.attr}`"
                class="lineup-plan-row support-plan-row"
                :style="getLineupRowStyle(plan.attr)"
              >
                <div class="lineup-attr-cell">
                  <img v-if="isSupportAttrIcon(plan.attr)" :src="`/elements/${String(plan.attr).toLowerCase()}.png`" class="lineup-attr-icon" :title="ATTR_LABELS[plan.attr]" />
                  <span v-else class="lineup-attr-text">WL</span>
                </div>
                <div
                  v-for="(slot, idx) in plan.memberSlots"
                  :key="`support-slot-${unitRow.unit}-${plan.attr}-${idx}`"
                  class="lineup-member-cell"
                  :class="{ 'is-empty': !slot, 'support-member-cell': !!slot, 'is-cfes': slot?.fesKind === 'cfes', 'is-bfes': slot?.fesKind === 'bfes', 'is-card-mode': supportShowCardImages && !!slot }"
                  :style="getLineupMemberCellStyle(slot, plan.attr)"
                >
                  <template v-if="slot">
                    <template v-if="supportShowCardImages">
                      <div class="lineup-slot-card">
                        <img src="/elements/card_frame_4.png" class="fes-card-thumb-frame" alt="卡框" loading="lazy" decoding="async" />
                        <img
                          v-if="getLineupSlotCardImageSrc(slot)"
                          :src="getLineupSlotCardImageSrc(slot)"
                          :alt="`${slot.name} 卡面`"
                          class="lineup-slot-card-img media-load-shimmer"
                          loading="lazy"
                          decoding="async"
                          @load="onMediaImageLoad"
                          @error="onMediaImageError"
                        />
                        <img
                          v-if="plan.attr === SUPPORT_WL_ATTR && isSupportAttrIcon(slot.attr)"
                          :src="`/elements/${String(slot.attr).toLowerCase()}.png`"
                          class="fes-card-thumb-attr"
                          :alt="ATTR_LABELS[slot.attr]"
                          :title="ATTR_LABELS[slot.attr]"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <div class="lineup-member-score">{{ slot.score }}</div>
                    </template>
                    <template v-else>
                      <img :src="`/chibi_s/${getSupportMemberIconKey(slot)}.webp`" class="support-member-avatar" :title="slot.name" :alt="slot.name" />
                      <img
                        v-if="plan.attr === SUPPORT_WL_ATTR && isSupportAttrIcon(slot.attr)"
                        :src="`/elements/${String(slot.attr).toLowerCase()}.png`"
                        class="support-member-attr-icon"
                        :title="ATTR_LABELS[slot.attr]"
                        :alt="ATTR_LABELS[slot.attr]"
                      />
                      <div class="lineup-member-score">{{ slot.score }}</div>
                      <button class="jump-link lineup-jump" :disabled="!slot.eventRef" @click.stop="jumpToHistoryByEventRef(slot.eventRef)">{{ getJumpLinkLabel(slot.eventRef, slot.eventLabel) }}</button>
                    </template>
                  </template>
                  <span v-else class="lineup-empty">-</span>
                </div>
                <div class="lineup-total-cell">{{ formatSupportTotal(plan.total) }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div id="panel-attr-summary" data-scroll-anchor="panel-attr-summary" class="stats-section card-panel matrix-panel attr-summary-panel">
          <div class="section-head">
            <h2>花色统计</h2>
            <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-attr-summary', '花色统计')">PNG</button>
          </div>
          <div class="attr-summary-grid">
            <div
              v-for="card in attrSummaryCards"
              :key="`attr-summary-${card.name}`"
              :id="card.anchorId"
              :data-scroll-anchor="card.anchorId"
              class="attr-summary-card"
              :style="{
                backgroundColor: getCharTint(card.name),
                '--unit-card-accent-color': getMatrixUnitColor(card.name)
              }"
            >
              <div class="attr-summary-card-head">
                <div class="attr-summary-head-left">
                  <img
                    :src="`/chibi_s/${getCharAbbr(card.name)}.webp`"
                    class="attr-summary-avatar"
                    :title="card.name"
                    :alt="card.name"
                    :style="{ borderColor: getCharColor(card.name) }"
                  />
                  <span class="attr-summary-name">{{ card.name }}</span>
                </div>
                <button
                  class="card-export-btn"
                  :disabled="isExportingPng"
                  @click="exportElementPng(card.anchorId, `花色统计_${card.name}`)"
                >PNG</button>
              </div>

              <table class="attr-summary-table">
                <thead>
                  <tr>
                    <th>属性</th>
                    <th>{{ card.mainScoreLabel }}</th>
                    <th>普分</th>
                    <th>P 分</th>
                    <th>判卡</th>
                    <th>奶卡</th>
                    <th>四星</th>
                    <th>三星</th>
                    <th>二星</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in card.rows" :key="`attr-summary-${card.name}-${row.attr}`" class="attr-summary-data-row" :style="getAttrSummaryAttrRowStyle(row.attr)">
                    <td class="attr-summary-attr-cell">
                      <img :src="`/elements/${String(row.attr).toLowerCase()}.png`" class="attr-summary-attr-icon" :alt="ATTR_LABELS[row.attr]" :title="ATTR_LABELS[row.attr]" />
                    </td>
                    <td class="attr-summary-num">{{ row.mainScoreCount }}</td>
                    <td class="attr-summary-num">{{ row.scoreUpCount }}</td>
                    <td class="attr-summary-num">{{ row.pScoreCount }}</td>
                    <td class="attr-summary-num">{{ row.accuracyCount }}</td>
                    <td class="attr-summary-num">{{ row.recoveryCount }}</td>
                    <td class="attr-summary-num">{{ row.fourStarCount }}</td>
                    <td class="attr-summary-num">{{ row.threeStarCount }}</td>
                    <td class="attr-summary-num">{{ row.twoStarCount }}</td>
                  </tr>
                  <tr class="attr-summary-total-row">
                    <td class="attr-summary-attr-cell">总计</td>
                    <td class="attr-summary-num">{{ card.totalRow.mainScoreCount }}</td>
                    <td class="attr-summary-num">{{ card.totalRow.scoreUpCount }}</td>
                    <td class="attr-summary-num">{{ card.totalRow.pScoreCount }}</td>
                    <td class="attr-summary-num">{{ card.totalRow.accuracyCount }}</td>
                    <td class="attr-summary-num">{{ card.totalRow.recoveryCount }}</td>
                    <td class="attr-summary-num">{{ card.totalRow.fourStarCount }}</td>
                    <td class="attr-summary-num">{{ card.totalRow.threeStarCount }}</td>
                    <td class="attr-summary-num">{{ card.totalRow.twoStarCount }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div id="panel-matrix" data-scroll-anchor="panel-matrix" class="stats-section card-panel matrix-panel">
          <div class="section-head">
            <div class="section-head-left">
              <h2>角色矩阵</h2>
              <label class="matrix-pure-toggle stats-checkbox" title="勾选后，分卡统计会计入团分卡。">
                <input :checked="includeUnitScoreInPureScore" type="checkbox" @change="onIncludeUnitScoreInPureScoreChange" />
                分卡统计团分
              </label>
            </div>
            <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-matrix', '角色矩阵')">PNG</button>
          </div>
          <div class="matrix-wrap">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th>角色</th>
                  <th v-for="(attr, idx) in ATTRS" :key="`head-${attr}`" :class="matrixGroupClass(idx, ATTRS.length)">
                    <button class="matrix-sort-btn" @click="toggleMatrixSort(attr)">
                      <span>{{ ATTR_LABELS[attr] }}</span>
                      <img class="matrix-sort-icon" :src="getMatrixSortIconSrc(attr)" alt="排序图标" />
                    </button>
                  </th>
                  <th :class="matrixGroupClass(0, 4)">
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('pureScoreCount')"><span>分卡</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('pureScoreCount')" alt="排序图标" /></button>
                  </th>
                  <th>
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('scoreUpCount')"><span>普分</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('scoreUpCount')" alt="排序图标" /></button>
                  </th>
                  <th>
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('pScoreCount')"><span>P 分</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('pScoreCount')" alt="排序图标" /></button>
                  </th>
                  <th>
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('accuracyCount')"><span>判卡</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('accuracyCount')" alt="排序图标" /></button>
                  </th>
                  <th :class="matrixGroupClass(3, 4)">
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('recoveryCount')"><span>奶卡</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('recoveryCount')" alt="排序图标" /></button>
                  </th>
                  <th :class="matrixGroupClass(0, 4)">
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('fourStarCount')"><span>四星</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('fourStarCount')" alt="排序图标" /></button>
                  </th>
                  <th>
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('threeStarCount')"><span>三星</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('threeStarCount')" alt="排序图标" /></button>
                  </th>
                  <th>
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('twoStarCount')"><span>二星</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('twoStarCount')" alt="排序图标" /></button>
                  </th>
                  <th :class="matrixGroupClass(3, 4)">
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('rewardTotalCount')"><span>报酬</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('rewardTotalCount')" alt="排序图标" /></button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in attrMatrixRows"
                  :key="`attr-${row.name}`"
                  :class="getMatrixUnitFrameClass(row.name)"
                  :style="{
                    backgroundColor: getCharTint(row.name),
                    '--matrix-unit-border-color': getMatrixUnitColor(row.name)
                  }"
                >
                  <td class="row-char" :style="{ backgroundColor: getUnitMatrixTint(row.name) }">
                    <img
                      :src="`/chibi_s/${getCharAbbr(row.name)}.webp`"
                      class="mini-avatar"
                      :title="row.name"
                      :style="{ borderColor: getCharColor(row.name) }"
                    />
                  </td>
                  <td
                    v-for="(attr, idx) in ATTRS"
                    :key="`${row.name}-${attr}`"
                    class="matrix-num"
                    :class="[matrixGroupClass(idx, ATTRS.length), getAttrExtremeClass(attr, row[attr], row.name)]"
                  >
                    {{ row[attr] }}
                  </td>
                  <td class="matrix-num" :class="matrixGroupClass(0, 4)">{{ row.pureScoreCount }}</td>
                  <td class="matrix-num">{{ row.scoreUpCount }}</td>
                  <td class="matrix-num">{{ row.pScoreCount }}</td>
                  <td class="matrix-num">{{ row.accuracyCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(3, 4)">{{ row.recoveryCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(0, 4)">{{ row.fourStarCount }}</td>
                  <td class="matrix-num">{{ row.threeStarCount }}</td>
                  <td class="matrix-num">{{ row.twoStarCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(3, 4)">{{ row.rewardTotalCount }}</td>
                </tr>
                <tr class="matrix-total-row">
                  <td class="row-char matrix-total-label">总计</td>
                  <td v-for="(attr, idx) in ATTRS" :key="`attr-total-${attr}`" class="matrix-num" :class="matrixGroupClass(idx, ATTRS.length)">
                    {{ attrMatrixTotalRow[attr] }}
                  </td>
                  <td class="matrix-num" :class="matrixGroupClass(0, 4)">{{ attrMatrixTotalRow.pureScoreCount }}</td>
                  <td class="matrix-num">{{ attrMatrixTotalRow.scoreUpCount }}</td>
                  <td class="matrix-num">{{ attrMatrixTotalRow.pScoreCount }}</td>
                  <td class="matrix-num">{{ attrMatrixTotalRow.accuracyCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(3, 4)">{{ attrMatrixTotalRow.recoveryCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(0, 4)">{{ attrMatrixTotalRow.fourStarCount }}</td>
                  <td class="matrix-num">{{ attrMatrixTotalRow.threeStarCount }}</td>
                  <td class="matrix-num">{{ attrMatrixTotalRow.twoStarCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(3, 4)">{{ attrMatrixTotalRow.rewardTotalCount }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="panel-vs-matrix" data-scroll-anchor="panel-vs-matrix" class="stats-section card-panel matrix-panel">
          <div class="section-head">
            <h2>虚拟歌手矩阵</h2>
            <button class="card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-vs-matrix', '虚拟歌手矩阵')">PNG</button>
          </div>
          <div class="matrix-wrap">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th>角色</th>
                  <th v-for="(attr, idx) in ATTRS" :key="`vs-head-${attr}`" :class="matrixGroupClass(idx, ATTRS.length)">
                    <button class="matrix-sort-btn" @click="toggleMatrixSort(attr)">
                      <span>{{ ATTR_LABELS[attr] }}</span>
                      <img class="matrix-sort-icon" :src="getMatrixSortIconSrc(attr)" alt="排序图标" />
                    </button>
                  </th>
                  <th :class="matrixGroupClass(0, 4)">
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('unitScoreCount')"><span>团分</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('unitScoreCount')" alt="排序图标" /></button>
                  </th>
                  <th>
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('scoreUpCount')"><span>普分</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('scoreUpCount')" alt="排序图标" /></button>
                  </th>
                  <th>
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('pScoreCount')"><span>P 分</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('pScoreCount')" alt="排序图标" /></button>
                  </th>
                  <th>
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('accuracyCount')"><span>判卡</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('accuracyCount')" alt="排序图标" /></button>
                  </th>
                  <th :class="matrixGroupClass(3, 4)">
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('recoveryCount')"><span>奶卡</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('recoveryCount')" alt="排序图标" /></button>
                  </th>
                  <th :class="matrixGroupClass(0, 4)">
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('fourStarCount')"><span>四星</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('fourStarCount')" alt="排序图标" /></button>
                  </th>
                  <th>
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('threeStarCount')"><span>三星</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('threeStarCount')" alt="排序图标" /></button>
                  </th>
                  <th>
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('twoStarCount')"><span>二星</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('twoStarCount')" alt="排序图标" /></button>
                  </th>
                  <th :class="matrixGroupClass(3, 4)">
                    <button class="matrix-sort-btn" @click="toggleMatrixSort('rewardTotalCount')"><span>报酬</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('rewardTotalCount')" alt="排序图标" /></button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in virtualSingerMatrixRows"
                  :key="`vs-matrix-${row.name}`"
                  :class="getMatrixUnitFrameClass(row.name, 'vs')"
                  :style="{
                    backgroundColor: getCharTint(row.name),
                    '--matrix-unit-border-color': getMatrixUnitColor(row.name)
                  }"
                >
                  <td class="row-char" :style="{ backgroundColor: getUnitMatrixTint(row.name) }">
                    <div class="matrix-avatar-wrap">
                      <img
                        :src="`/chibi_s/${getCharAbbr(row.name)}.webp`"
                        class="mini-avatar"
                        :title="row.name"
                        :style="{ borderColor: getCharColor(row.name) }"
                      />
                      <img
                        v-if="getVsUnitLogoByKey(row.name)"
                        :src="getVsUnitLogoByKey(row.name)"
                        class="matrix-avatar-unit-logo"
                        :alt="parseVsMatrixRowName(row.name).unit"
                        :title="parseVsMatrixRowName(row.name).unit.toUpperCase()"
                      />
                    </div>
                  </td>
                  <td
                    v-for="(attr, idx) in ATTRS"
                    :key="`vs-${row.name}-${attr}`"
                    class="matrix-num"
                    :class="[matrixGroupClass(idx, ATTRS.length), getVsMatrixValueClass(row[attr])]"
                  >
                    {{ row[attr] }}
                  </td>
                  <td class="matrix-num" :class="[matrixGroupClass(0, 4), getVsMatrixValueClass(row.unitScoreCount)]">{{ row.unitScoreCount }}</td>
                  <td class="matrix-num" :class="getVsMatrixValueClass(row.scoreUpCount)">{{ row.scoreUpCount }}</td>
                  <td class="matrix-num" :class="getVsMatrixValueClass(row.pScoreCount)">{{ row.pScoreCount }}</td>
                  <td class="matrix-num" :class="getVsMatrixValueClass(row.accuracyCount)">{{ row.accuracyCount }}</td>
                  <td class="matrix-num" :class="[matrixGroupClass(3, 4), getVsMatrixValueClass(row.recoveryCount)]">{{ row.recoveryCount }}</td>
                  <td class="matrix-num" :class="[matrixGroupClass(0, 4), getVsMatrixValueClass(row.fourStarCount)]">{{ row.fourStarCount }}</td>
                  <td class="matrix-num" :class="getVsMatrixValueClass(row.threeStarCount)">{{ row.threeStarCount }}</td>
                  <td class="matrix-num" :class="getVsMatrixValueClass(row.twoStarCount)">{{ row.twoStarCount }}</td>
                  <td class="matrix-num" :class="[matrixGroupClass(3, 4), getVsMatrixValueClass(row.rewardTotalCount)]">{{ row.rewardTotalCount }}</td>
                </tr>
                <tr
                  v-for="unitTotal in virtualSingerUnitTotalRows"
                  :key="`vs-unit-total-${unitTotal.unit}`"
                  class="matrix-vs-unit-total-row"
                  :style="{ '--matrix-vs-total-bg': getVsUnitTotalTint(unitTotal.unit), '--matrix-unit-border-color': UNIT_COLORS[unitTotal.unit] || '#9ca3af' }"
                >
                  <td class="row-char matrix-vs-unit-total-char">
                    <img :src="unitLogoMap[unitTotal.unit]" class="matrix-vs-unit-total-logo" :alt="unitTotal.unit" :title="unitTotal.unit.toUpperCase()" />
                  </td>
                  <td v-for="(attr, idx) in ATTRS" :key="`vs-total-${unitTotal.unit}-${attr}`" class="matrix-num" :class="matrixGroupClass(idx, ATTRS.length)">
                    {{ unitTotal[attr] }}
                  </td>
                  <td class="matrix-num" :class="matrixGroupClass(0, 4)">{{ unitTotal.unitScoreCount }}</td>
                  <td class="matrix-num">{{ unitTotal.scoreUpCount }}</td>
                  <td class="matrix-num">{{ unitTotal.pScoreCount }}</td>
                  <td class="matrix-num">{{ unitTotal.accuracyCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(3, 4)">{{ unitTotal.recoveryCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(0, 4)">{{ unitTotal.fourStarCount }}</td>
                  <td class="matrix-num">{{ unitTotal.threeStarCount }}</td>
                  <td class="matrix-num">{{ unitTotal.twoStarCount }}</td>
                  <td class="matrix-num" :class="matrixGroupClass(3, 4)">{{ unitTotal.rewardTotalCount }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>

    <div
      v-if="screenshotModalVisible"
      class="screenshot-export-modal-mask"
      @click.self="closeScreenshotModal"
    >
      <div class="screenshot-export-modal" :class="`is-${screenshotModalState}`" role="status" aria-live="polite">
        <div class="screenshot-export-modal-head">
          <div class="screenshot-export-modal-head-main">
            <span
              v-if="screenshotModalState === 'capturing' || screenshotModalState === 'retrying'"
              class="screenshot-export-modal-spinner"
              aria-hidden="true"
            ></span>
            <span class="screenshot-export-modal-title">{{ screenshotModalTitle }}</span>
          </div>
          <button
            v-if="screenshotModalState === 'capturing' || screenshotModalState === 'retrying'"
            class="card-export-btn screenshot-export-modal-close-btn"
            @click="forceCancelScreenshotExport"
          >
            取消
          </button>
        </div>
        <p class="screenshot-export-modal-message">{{ screenshotModalMessage }}</p>
        <div v-if="screenshotModalState === 'failed'" class="screenshot-export-modal-actions">
          <button class="card-export-btn screenshot-export-modal-btn" :disabled="isExportingPng" @click="retryScreenshotExport">重新截图</button>
          <button class="card-export-btn screenshot-export-modal-btn screenshot-export-modal-btn-secondary" :disabled="isExportingPng" @click="closeScreenshotModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch, reactive } from 'vue';
import { toCanvas } from 'html-to-image';
// 1. 接收两个 Props
const props = defineProps({
  allEvents: { type: Array, default: () => [] },
  allCards: { type: Array, default: () => [] },
  allSongs: { type: Array, default: () => [] },
  allCharacters: { type: Array, default: () => [] },
  jumpEventId: { type: [Number, String], default: null },
  previewSyncEventId: { type: [Number, String], default: null }
});
const emit = defineEmits(['jump-to-event', 'stats-preview-update']);

// 2. 新增：用户自定义的截止 ID 状态
const manualEventId = ref(null);
const displayEventIdDraft = ref('');
const isEditingDisplayEventId = ref(false);
const navCollapsed = ref(false);
const activeNavId = ref('panel-dist');
const matrixSortKey = ref('');
const matrixSortOrder = ref('');
const suppressMatrixViewportAnchor = ref(false);
const vsUnitLastFourSort = ref('char');
const vsUnitFourCountSort = ref('char');
const vsUnitLastFourCompact = ref(true);
const vsUnitLastFourShowCardImages = ref(false);
const vsUnitFourCountCompact = ref(true);
const vsUnitFourCountShowCardImages = ref(false);
const vsUnitScoreShowCardImages = ref(false);
const vsOriginalStatShowCardImages = ref(false);
const includeCollabRewardCards = ref(false);
const hideDistCharNames = ref(true);
const hideFestivalCharNames = ref(true);
const navNameFormat = ref('single');
const navCardImageMode = ref('after');
const banEventTypeFilter = ref('all');
const bannerEventTypeFilter = ref('all');
const limitedBanEventTypeFilter = ref('all');
const fesLimitedBanEventTypeFilter = ref('all');
const fesLimitedIncludeFes = ref(false);
const includeUnitScoreInPureScore = ref(false);
const festivalMergeToggles = reactive({
  新年: false,
  婚活: false,
  情人节: false,
  白情: false,
  半周年: false,
  周年: false
});
const festivalMergeHigherRanks = computed({
  get: () => Object.keys(festivalMergeToggles).every((fest) => !!festivalMergeToggles[fest]),
  set: (value) => {
    const checked = !!value;
    Object.keys(festivalMergeToggles).forEach((fest) => {
      festivalMergeToggles[fest] = checked;
    });
  }
});
const isMobileNav = ref(false);
const isNavTopLayout = ref(false);
const navTopLayoutPrev = ref(null);
const supportUseOriginalVsTeam = ref(true);
const supportEnableWlLineup = ref(false);
const lineupShowCardImages = ref(false);
const supportShowCardImages = ref(false);
const relatedLastRecordShowCardImages = ref(false);
const fesRecordShowCardImages = ref(false);
const intervalFourShowCardImages = ref(false);
const intervalLimitedShowCardImages = ref(false);
const intervalBanShowCardImages = ref(false);
const festivalFesToggles = reactive({
  半周年: false,
  周年: false
});
const cardStatsRootRef = ref(null);
let sectionObserver = null;
const isExportingPng = ref(false);
const screenshotModalVisible = ref(false);
const screenshotModalState = ref('idle');
const screenshotModalTitle = ref('');
const screenshotModalMessage = ref('');
const screenshotModalRetryTask = ref(null);
const screenshotModalCancelTask = ref(null);
let screenshotModalAutoCloseTimer = 0;
let matrixSortAnchorTimer = 0;
let navSyncRaf = 0;
let viewportScrollHost = null;
let viewportPreserveLock = 0;
let statsMainInteractionHost = null;
let lastInteractiveAnchorEl = null;
let lastInteractiveAt = 0;
let relatedJumpChipSyncRaf = 0;
let relatedJumpResizeObserver = null;
let relatedJumpMutationObserver = null;
let pendingCardCaptureRenderTask = null;
let lineupCardLayoutSyncRaf = 0;
let lineupCardLayoutSyncTimer = 0;
let lineupCardLayoutResizeObserver = null;
let lineupCardLayoutMutationObserver = null;
const mobileNavExpandedGroups = ref({});

//const getCharAbbr = (name) => CHAR_MAP[name] || name.toUpperCase() || name.toLowerCase();
const getCharAbbr = (name) => {
  if (!name) return '';
  // 尝试按空格拆分（例如 "初音未来 ln" -> ["初音未来", "ln"]）
  const parts = name.split(' ');
  const mainName = parts[0]; // 角色本体名字
  const unitSuffix = parts.length > 1 ? parts[1].toLowerCase() : null; // 团队后缀
  if (isVirtualSinger(mainName)) {  // 利用 isVirtualSinger 判断是否为虚拟歌手
    const abbr = CHAR_MAP[mainName] || String(mainName || '').toUpperCase(); // 从映射表获取基础缩写，如 MIKU, RIN
    if (unitSuffix && unitSuffix !== 'vs') {    // 如果有团队后缀，且后缀不是 'vs'
      return `${abbr.toLowerCase()}_${unitSuffix}`;      // 返回通用格式：缩写小写_团队名（如 miku_ln）
    }
    return abbr;    // 没有后缀或属于 vs 团队，返回原始大写缩写（如 MIKU）
  }
  // 非虚拟歌手角色，直接按全名查找映射
  return CHAR_MAP[name] || name.toUpperCase() || name.toLowerCase();
};

const jumpToHistoryByEventRef = (eventRef) => {
  const id = String(eventRef?.id ?? '').trim();
  if (!id) return;
  emit('jump-to-event', id);
};

const getCharColor = (name) => {
  const key = String(name || '').split(' ')[0];
  return CHAR_COLORS[key] || '#d1d5db';
};

const STEP_FESTIVAL_AVATAR_BORDER_MODE = 'unit'; // 'unit' | 'char'
const STEP_FESTIVAL_AVATAR_BORDER_WIDTH = 2;

const getStepFestivalAvatarBorderColor = (name) => {
  if (STEP_FESTIVAL_AVATAR_BORDER_MODE === 'char') {
    return getCharColor(name);
  }
  return UNIT_COLORS[getUnitByChar(name)] || '#d1d5db';
};

const getStepFestivalAvatarStyle = (name) => ({
  borderColor: getStepFestivalAvatarBorderColor(name),
  borderWidth: `${STEP_FESTIVAL_AVATAR_BORDER_WIDTH}px`
});

const showDesktopNameControls = computed(() => !isNavTopLayout.value);
const isMiniFloatingNav = computed(() => isNavTopLayout.value && navCollapsed.value);
const isSupportAttrIcon = (attr) => ATTRS.includes(String(attr || ''));

const BASE_UNIT_COLORS = {
  ln: '#4455DD',
  mmj: '#88DD44',
  vbs: '#EE1166',
  ws: '#FF9900',
  nc: '#884499',
  vs: '#111827'
};
const unitLogoMap = {
  ln: '/elements/ln.png',
  mmj: '/elements/mmj.png',
  vbs: '/elements/vbs.png',
  ws: '/elements/ws.png',
  nc: '/elements/nc.png',
  vs: '/elements/vs.png'
};
const CHAR_MAP = {};
const CHAR_SINGLE_MAP = {};
const CHAR_COLORS = {};
const CHAR_UNIT_MAP = {};
const CHAR_ORDER = {};
const VS_NAMES = [];
const VS_ALIAS_MAP = {};
const UNIT_COLORS = { ...BASE_UNIT_COLORS };

const replaceObject = (target, next) => {
  Object.keys(target).forEach((key) => {
    delete target[key];
  });
  Object.assign(target, next);
};

const replaceArray = (target, next) => {
  target.splice(0, target.length, ...next);
};

const applyCharacterMetaSource = (characters) => {
  if (!Array.isArray(characters) || characters.length === 0) {
    replaceObject(CHAR_MAP, {});
    replaceObject(CHAR_SINGLE_MAP, {});
    replaceObject(CHAR_COLORS, {});
    replaceObject(CHAR_UNIT_MAP, {});
    replaceObject(CHAR_ORDER, {});
    replaceObject(UNIT_COLORS, BASE_UNIT_COLORS);
    replaceObject(VS_ALIAS_MAP, {});
    replaceArray(VS_NAMES, []);
    return;
  }

  const nextCharMap = {};
  const nextSingleMap = {};
  const nextCharColors = {};
  const nextCharUnit = {};
  const nextCharOrder = {};
  const nextVsNames = [];
  const nextVsAliasMap = {};
  const nextUnitColors = { ...BASE_UNIT_COLORS };

  const addVsAlias = (aliasRaw, canonicalRaw) => {
    const alias = String(aliasRaw || '').trim();
    const canonical = String(canonicalRaw || '').trim();
    if (!alias || !canonical) return;
    nextVsAliasMap[alias] = canonical;
    nextVsAliasMap[alias.toUpperCase()] = canonical;
  };

  const sortedChars = [...characters]
    .map((char, idx) => ({ char, idx }))
    .filter(({ char }) => !!String(char?.zh_name || '').trim())
    .sort((a, b) => {
      const ao = Number(a.char?.id);
      const bo = Number(b.char?.id);
      const av = Number.isFinite(ao) && ao > 0 ? ao : 9999 + a.idx;
      const bv = Number.isFinite(bo) && bo > 0 ? bo : 9999 + b.idx;
      return av - bv;
    });

  sortedChars.forEach(({ char }, index) => {
    const name = String(char?.zh_name || '').trim();
    const unit = String(char?.unit || '').trim().toLowerCase() || 'vs';
    const abbr = String(char?.en_abbr || '').trim() || name.toUpperCase();
    const singleMark = String(char?.single_mark || '').trim() || name.slice(0, 1);
    const color = String(char?.color || '').trim();
    const unitColor = String(char?.unit_color || '').trim();
    const orderId = Number(char?.id);

    nextCharMap[name] = abbr;
    nextSingleMap[name] = singleMark;
    if (color) nextCharColors[name] = color;
    nextCharUnit[name] = unit;
    nextCharOrder[name] = Number.isFinite(orderId) && orderId > 0 ? orderId : index + 1;

    if (unit === 'vs') {
      nextVsNames.push(name);
      addVsAlias(name, name);
      addVsAlias(char?.ja_name, name);
      addVsAlias(char?.en_abbr, name);
      addVsAlias(char?.given_name_english, name);
      addVsAlias(char?.given_name, name);
      addVsAlias(`${String(char?.first_name_english || '').trim()} ${String(char?.given_name_english || '').trim()}`.trim(), name);
      addVsAlias(`${String(char?.first_name || '').trim()}${String(char?.given_name || '').trim()}`.trim(), name);
    }
    if (unitColor) {
      nextUnitColors[unit] = unitColor;
    }
  });

  if (Object.keys(nextCharMap).length === 0) {
    replaceObject(CHAR_MAP, {});
    replaceObject(CHAR_SINGLE_MAP, {});
    replaceObject(CHAR_COLORS, {});
    replaceObject(CHAR_UNIT_MAP, {});
    replaceObject(CHAR_ORDER, {});
    replaceObject(UNIT_COLORS, BASE_UNIT_COLORS);
    replaceObject(VS_ALIAS_MAP, {});
    replaceArray(VS_NAMES, []);
    return;
  }

  replaceObject(CHAR_MAP, nextCharMap);
  replaceObject(CHAR_SINGLE_MAP, nextSingleMap);
  replaceObject(CHAR_COLORS, nextCharColors);
  replaceObject(CHAR_UNIT_MAP, nextCharUnit);
  replaceObject(CHAR_ORDER, nextCharOrder);
  replaceObject(UNIT_COLORS, nextUnitColors);
  replaceObject(VS_ALIAS_MAP, nextVsAliasMap);
  replaceArray(VS_NAMES, nextVsNames);
};

watch(
  () => props.allCharacters,
  (characters) => {
    applyCharacterMetaSource(characters);
  },
  { immediate: true }
);

const LINEUP_CHAR_NAMES = computed(() => {
  return toDisplayOrderedCharNames(Object.keys(CHAR_ORDER));
});
const ATTRS = ['Pure', 'Cool', 'Cute', 'Happy', 'Mysterious'];
const SUPPORT_WL_ATTR = 'wl';
const LIMITED_TYPES = new Set(['limited', 'cfes', 'bfes', 'collab_t', 'wl3']);//加入wl3为限定卡
const FES_CARD_TYPES = new Set(['cfes', 'bfes']);
const FES_SKILL_TYPES = new Set(['cfes', 'bfes_up']);
const EXCLUDED_PERIOD_EVENT_TYPES = new Set(['测试']);
const SPECIAL_EVENT_KEY_LABELS = {
  c1: '大罪',
  c2: '三丽欧',
  c3: 'ES',
  c4: '东方',
  c5: '拓麻歌子',
  movie: '剧场版'
};
const ATTR_LABELS = {
  Pure: '绿草',
  Cool: '蓝星',
  Cute: '粉花',
  Happy: '橙心',
  Mysterious: '紫月'
};
const ATTR_COLORS = Object.freeze({
  Pure: '#17a159',
  Cool: '#4b48e9',
  Cute: '#f35c9b',
  Happy: '#ff8719',
  Mysterious: '#8e65c2'
});
const SPECIAL_FESTIVALS = ['新年', '婚活', '情人节', '白情', '半周年', '周年'];
const FESTIVAL_ANCHOR_IDS = Object.fromEntries(SPECIAL_FESTIVALS.map((fest, idx) => [fest, `festival-${idx + 1}`]));
const FESTIVAL_VS_UNIT_ORDER = { ln: 1, mmj: 2, vbs: 3, ws: 4, nc: 5, vs: 6 };
const VS_UNIT_SORT_ORDER = ['ln', 'mmj', 'vbs', 'ws', 'nc'];
const VS_ORIGINAL_STAT_TYPES = ['大罪', 'CFES', 'BFES', 'WL1', 'WL2', 'WL3', '其他'];
const RELATED_FES_UNITS = ['ln', 'mmj', 'vbs', 'ws', 'nc', 'vs'];
const SUPPORT_UNITS = ['vs', 'ln', 'mmj', 'vbs', 'ws', 'nc'];
const LINEUP_NAV_UNITS = ['ln', 'mmj', 'vbs', 'ws', 'nc', 'vs'];
const SUPPORT_NAV_UNITS = ['vs', 'ln', 'mmj', 'vbs', 'ws', 'nc'];
const supportUnitTitleLogoMap = Object.freeze({
  ln: '/elements/Leo_need.png',
  mmj: '/elements/MORE_MORE_JUMP!.png',
  vbs: '/elements/Vivid_BAD_SQUAD.png',
  ws: '/elements/ワンダーランズ×ショウタイム.png',
  nc: '/elements/25時、ナイトコードで.png',
  vs: '/elements/virtual_singer.png'
});

const CHAR_CARD_FOLDER_MAP = computed(() => {
  const map = {};
  (props.allCharacters || []).forEach((char) => {
    const idNum = Number(String(char?.id ?? '').trim());
    const abbr = String(char?.en_abbr || '').trim().toLowerCase();
    if (!Number.isFinite(idNum) || idNum <= 0 || !abbr) return;

    const folder = `${String(idNum).padStart(3, '0')}${abbr}`;
    const keys = [
      char?.zh_name,
      char?.ja_name,
      `${String(char?.first_name || '').trim()}${String(char?.given_name || '').trim()}`
    ];

    keys.forEach((key) => {
      const normalized = String(key || '').trim();
      if (!normalized) return;
      map[normalized] = folder;
    });
  });
  return map;
});

const isVirtualSinger = (name) => VS_NAMES.includes(name);

const getUnitByChar = (name) => {
  const raw = String(name || '').trim();
  if (!raw) return 'vs';
  const [baseName, suffixRaw] = raw.split(/\s+/);
  const suffix = String(suffixRaw || '').toLowerCase();
  if (VS_NAMES.includes(baseName)) {
    if (suffix && UNIT_COLORS[suffix]) return suffix;
    return 'vs';
  }
  return CHAR_UNIT_MAP[baseName] || 'vs';
};

const normalizeFestivalCharName = (name) => {
  const raw = String(name || '').trim();
  if (!raw) return '';
  const [baseName] = raw.split(/\s+/);
  return CHAR_ORDER[baseName] ? baseName : '';
};

const parseFestivalCharKey = (charKey) => {
  const raw = String(charKey || '').trim();
  if (!raw) return { baseName: '', unit: '', isVs: false };
  const [baseName, suffixRaw] = raw.split(/\s+/);
  const unit = String(suffixRaw || '').toLowerCase();
  return {
    baseName,
    unit,
    isVs: isVirtualSinger(baseName)
  };
};

const buildFestivalCharKey = (card) => {
  const baseName = normalizeFestivalCharName(card?.Name);
  if (!baseName) return '';
  if (!isVirtualSinger(baseName)) return baseName;

  const unit = String(card?.Affiliation || '').trim().toLowerCase();
  if (unit && unit !== 'vs' && FESTIVAL_VS_UNIT_ORDER[unit]) {
    return `${baseName} ${unit}`;
  }
  return baseName;
};

const compareFestivalCharKey = (aKey, bKey) => {
  const a = parseFestivalCharKey(aKey);
  const b = parseFestivalCharKey(bKey);
  const baseDiff = (CHAR_ORDER[a.baseName] || 999) - (CHAR_ORDER[b.baseName] || 999);
  if (baseDiff !== 0) return baseDiff;

  if (a.isVs && b.isVs) {
    const au = FESTIVAL_VS_UNIT_ORDER[a.unit || 'vs'] || 999;
    const bu = FESTIVAL_VS_UNIT_ORDER[b.unit || 'vs'] || 999;
    if (au !== bu) return au - bu;
  }

  return String(aKey).localeCompare(String(bKey), 'zh-Hans-CN');
};

const getFestivalUnitLogoByName = (charName) => {
  const parsed = parseFestivalCharKey(charName);
  if (!parsed.isVs) return '';
  if (!parsed.unit || parsed.unit === 'vs') return '';
  return unitLogoMap[parsed.unit] || '';
};

const getFestivalDisplayNameLabel = (charName) => {
  const parsed = parseFestivalCharKey(charName);
  if (useSingleNameMark.value) {
    return getCharSingleMark(parsed.baseName || charName);
  }
  if (parsed?.isVs) {
    return CHAR_MAP[parsed.baseName] || getCharAbbr(parsed.baseName);
  }
  return getCharAbbr(charName);
};

const canToggleFestivalFes = (festival) => ['半周年', '周年'].includes(String(festival || '').trim());

const shouldCountFestivalFes = (festival) => {
  if (!canToggleFestivalFes(festival)) return false;
  return !!festivalFesToggles[String(festival || '').trim()];
};

const getFestivalTierCount = (tierKey) => {
  if (tierKey === 'four') return 4;
  if (tierKey === 'three') return 3;
  if (tierKey === 'two') return 2;
  return 0;
};

const getFestivalTierIcon = (tierKey) => (tierKey === 'four' ? '/elements/rstar.png' : '/elements/ystar.png');

const isFesCardType = (typeValue) => FES_CARD_TYPES.has(String(typeValue || '').trim().toLowerCase());

const isFesSkillType = (skillKind) => {
  const kind = String(skillKind || '').trim().toLowerCase();
  if (!kind) return false;
  // Keep compatibility with specific CFES variants like cfes_l / cfes_j.
  if (kind.startsWith('cfes')) return true;
  return FES_SKILL_TYPES.has(kind);
};

const getFesKindBySkillKind = (skillKind) => {
  const kind = String(skillKind || '').trim().toLowerCase();
  if (kind === 'bfes_up') return 'bfes';
  if (kind.startsWith('cfes')) return 'cfes';
  return '';
};

const hexToRgba = (hex, alpha) => {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const hexToSoftSolid = (hex, mix = 0.78) => {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return 'rgb(229, 231, 235)';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const rr = Math.round(r + (255 - r) * mix);
  const gg = Math.round(g + (255 - g) * mix);
  const bb = Math.round(b + (255 - b) * mix);
  return `rgb(${rr}, ${gg}, ${bb})`;
};

const getCharTint = (name) => {
  return hexToRgba(getCharColor(name), 0.2);
};

const getMatrixUnitColor = (name) => UNIT_COLORS[getUnitByChar(name)] || '#9ca3af';

const getUnitMatrixTint = (name) => hexToSoftSolid(getMatrixUnitColor(name));

const disableMatrixViewportAnchorTemporarily = () => {
  suppressMatrixViewportAnchor.value = true;
  if (matrixSortAnchorTimer) {
    clearTimeout(matrixSortAnchorTimer);
  }
  matrixSortAnchorTimer = setTimeout(() => {
    suppressMatrixViewportAnchor.value = false;
    matrixSortAnchorTimer = 0;
  }, 200);
};

const toggleMatrixSort = (key) => {
  void withInteractionPinnedPosition(() => {
    disableMatrixViewportAnchorTemporarily();
    if (matrixSortKey.value !== key) {
      matrixSortKey.value = key;
      matrixSortOrder.value = 'desc';
      return;
    }
    if (matrixSortOrder.value === 'desc') {
      matrixSortOrder.value = 'asc';
      return;
    }
    if (matrixSortOrder.value === 'asc') {
      matrixSortKey.value = '';
      matrixSortOrder.value = '';
      return;
    }
    matrixSortOrder.value = 'desc';
  });
};

const getMatrixSortIconSrc = (key) => {
  if (matrixSortKey.value !== key || !matrixSortOrder.value) return '/data/icon/circle_arrow_up_down.png';
  return matrixSortOrder.value === 'desc' ? '/data/icon/circle_arrow_down.png' : '/data/icon/circle_arrow_up.png';
};

const isMatrixDefaultSort = computed(() => !matrixSortKey.value || !matrixSortOrder.value);

const buildMatrixUnitFrameMap = (rows) => {
  const map = new Map();
  if (!isMatrixDefaultSort.value) return map;
  rows.forEach((row, idx) => {
    const unit = getUnitByChar(row.name);
    const prevUnit = idx > 0 ? getUnitByChar(rows[idx - 1].name) : null;
    const nextUnit = idx < rows.length - 1 ? getUnitByChar(rows[idx + 1].name) : null;
    map.set(row.name, {
      start: unit !== prevUnit,
      end: unit !== nextUnit
    });
  });
  return map;
};

const matrixUnitFrameMap = computed(() => buildMatrixUnitFrameMap(attrMatrixRows.value));
const vsMatrixUnitFrameMap = computed(() => buildMatrixUnitFrameMap(virtualSingerMatrixRows.value));

const getMatrixUnitFrameClass = (name, matrixType = 'char') => {
  const frameMap = matrixType === 'vs' ? vsMatrixUnitFrameMap.value : matrixUnitFrameMap.value;
  const info = frameMap.get(name);
  if (!info) return [];
  return [
    'matrix-unit-framed',
    info.start ? 'matrix-unit-group-start-row' : '',
    info.end ? 'matrix-unit-group-end-row' : ''
  ].filter(Boolean);
};

const toggleVsUnitLastFourSort = () => {
  if (vsUnitLastFourSort.value === 'char') {
    vsUnitLastFourSort.value = 'date-desc';
    return;
  }
  if (vsUnitLastFourSort.value === 'date-desc') {
    vsUnitLastFourSort.value = 'date-asc';
    return;
  }
  vsUnitLastFourSort.value = 'char';
};

const onToggleVsUnitLastFourSort = (event) => {
  const anchorEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  void withInteractionPinnedPosition(() => {
    toggleVsUnitLastFourSort();
  }, anchorEl);
};

const onVsUnitLastFourCompactChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    vsUnitLastFourCompact.value = checked;
  }, anchorEl);
};

const onVsUnitFourCountCompactChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    vsUnitFourCountCompact.value = checked;
  }, anchorEl);
};

const toggleVsUnitFourCountSort = () => {
  if (vsUnitFourCountSort.value === 'char') {
    vsUnitFourCountSort.value = 'count-desc';
    return;
  }
  if (vsUnitFourCountSort.value === 'count-desc') {
    vsUnitFourCountSort.value = 'count-asc';
    return;
  }
  vsUnitFourCountSort.value = 'char';
};

const onToggleVsUnitFourCountSort = (event) => {
  const anchorEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  void withInteractionPinnedPosition(() => {
    toggleVsUnitFourCountSort();
  }, anchorEl);
};

const vsUnitLastFourSortLabel = computed(() => {
  if (vsUnitLastFourSort.value === 'date-desc') return '日期↓';
  if (vsUnitLastFourSort.value === 'date-asc') return '日期↑';
  return '日期';
});

const vsUnitFourCountSortLabel = computed(() => {
  if (vsUnitFourCountSort.value === 'count-desc') return '数量↓';
  if (vsUnitFourCountSort.value === 'count-asc') return '数量↑';
  return '数量';
});

const getRecordTint = (name, alpha = 0.3) => hexToRgba(getCharColor(name), alpha);

const parseDateSafe = (dateStr) => {
  const d = new Date(String(dateStr || '').replace(/\//g, '-'));
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeBannerName = (banner) => String(banner || '').trim().split(/\s+/)[0] || '';

const monthsSince = (dateStr) => {
  const d = parseDateSafe(dateStr);
  if (!d) return 0;
  const ref = referenceDateObj.value;
  let m = (ref.getFullYear() - d.getFullYear()) * 12 + (ref.getMonth() - d.getMonth());
  if (ref.getDate() < d.getDate()) m -= 1;
  return Math.max(0, m);
};

const daysBetween = (dateA, dateB) => {
  const a = parseDateSafe(dateA);
  const b = parseDateSafe(dateB);
  if (!a || !b) return 0;
  const diff = Math.abs(b.getTime() - a.getTime());
  return Math.round(diff / (1000 * 60 * 60 * 24));
};

const toDisplayOrderedCharNames = (sourceNames) => {
  const names = [...(sourceNames || [])].sort((a, b) => (CHAR_ORDER[a] || 999) - (CHAR_ORDER[b] || 999));
  const lukaIdx = names.indexOf('巡音流歌');
  const mikuIdx = names.indexOf('初音未来');
  if (lukaIdx >= 0 && mikuIdx >= 0 && lukaIdx !== mikuIdx + 1) {
    names.splice(lukaIdx, 1);
    names.splice(mikuIdx + 1, 0, '巡音流歌');
  }
  return names;
};

const compareCharOrder = (a, b) => (CHAR_ORDER[a] || 999) - (CHAR_ORDER[b] || 999);

const getUnitAccentColor = (unit) => UNIT_COLORS[String(unit || '').trim().toLowerCase()] || '#64748b';

const getTypeSeriesText = (value) => {
  const s = String(value ?? '').trim();
  return s && s !== 'null' && s !== 'undefined' ? s : '';
};

const buildGapRanges = (eventList, countFn) => {
  const ranges = [];
  for (let i = 1; i < eventList.length; i += 1) {
    const prev = eventList[i - 1];
    const curr = eventList[i];
    ranges.push({
      startMark: getNonBanEventMark(prev),
      endMark: getNonBanEventMark(curr),
      startRef: prev,
      endRef: curr,
      startTypeSeriesId: prev.typeSeriesId,
      endTypeSeriesId: curr.typeSeriesId,
      startEventType: prev.eventType,
      endEventType: curr.eventType,
      days: daysBetween(prev.date, curr.date),
      periods: countFn(prev, curr)
    });
  }
  return ranges;
};

const pickGap = (ranges, mode) => {
  if (!ranges.length) return null;
  return [...ranges].sort((a, b) => {
    if (mode === 'max') {
      if (b.days !== a.days) return b.days - a.days;
      return b.periods - a.periods;
    }
    if (a.days !== b.days) return a.days - b.days;
    return a.periods - b.periods;
  })[0];
};

const pickGapByPeriods = (ranges, mode) => {
  if (!ranges.length) return null;
  return [...ranges].sort((a, b) => {
    if (mode === 'max') {
      if (b.periods !== a.periods) return b.periods - a.periods;
      return b.days - a.days;
    }
    if (a.periods !== b.periods) return a.periods - b.periods;
    return a.days - b.days;
  })[0];
};

const getEventTypeShort = (eventType) => {
  const t = String(eventType || '').trim();
  if (t === '箱活') return '箱';
  if (t === '混活') return '混';
  if (t === 'World Link') return 'WL';
  if (t === 'World Link终章') return 'WL终';
  return t || '?';
};

const getWl3PartSuffix = (ev) => {
  const eventType = String(ev?.eventType || '').trim();
  const typeSeries = Number(getTypeSeriesText(ev?.typeSeriesId));
  if (eventType !== 'World Link' || typeSeries !== 3) return '';

  const currentId = Number(ev?.id ?? ev?.sourceKey);
  if (!Number.isFinite(currentId)) return '';

  const wl3Ids = (props.allEvents || [])
    .filter((item) => {
      if (shouldSkipPredictEvent(item)) return false;
      if (!isNumericEventId(item?.id)) return false;
      if (Number(item.id) > Number(safeMaxEventId.value)) return false;
      if (String(item?.event_type || '').trim() !== 'World Link') return false;
      return Number(getTypeSeriesText(item?.type_series_id)) === 3;
    })
    .map((item) => Number(item.id))
    .sort((a, b) => a - b);

  const idx = wl3Ids.indexOf(currentId);
  if (idx < 0) return '';
  return ` p${idx + 1}`;
};

const getNonBanEventMark = (ev) => {
  if (!ev) return '?';
  const sourceKey = String(ev.sourceKey || ev.id || '').trim();
  if (sourceKey === '0') return '开服';
  const typeSeries = getTypeSeriesText(ev.typeSeriesId);
  const eventType = String(ev.eventType || '').trim();
  const shortType = getEventTypeShort(eventType);
  const bannerName = normalizeBannerName(ev.banner);
  const bannerMark = bannerName ? getCharAbbr(bannerName).toLowerCase() : '';
  const unitMark = String(ev.unit || '').trim().toLowerCase();
  const collabLabel = SPECIAL_EVENT_KEY_LABELS[sourceKey] || '';

  if (eventType === 'World Link' || eventType === 'World Link终章') {
    if (eventType === 'World Link' && Number(typeSeries) === 3) {
      const base = `wl3${getWl3PartSuffix(ev)}`;
      return ev.isFesCard ? `${base}(fes)` : base;
    }
    const wlHead = bannerMark || unitMark || 'vs';
    const base = typeSeries ? `${wlHead} wl${typeSeries}` : `${wlHead} wl`;
    return ev.isFesCard ? `${base}(fes)` : base;
  }

  let base = '?';
  if (bannerMark && typeSeries) base = `${bannerMark}${typeSeries}${shortType}`;
  else if (bannerMark) base = `${bannerMark}${shortType}`;
  else if (unitMark && typeSeries) base = `${unitMark}${typeSeries}${shortType}`;
  else if (typeSeries) base = `${typeSeries}${shortType}`;
  else if (collabLabel) base = collabLabel;
  else if (sourceKey) base = sourceKey;

  return ev.isFesCard ? `${base}(fes)` : base;
};

const formatRangeLabel = (gap) => (gap ? `${gap.startMark}→${gap.endMark}` : '-');
const formatGapValue = (gap) => (gap ? `${gap.days}天 | ${gap.periods}期` : '-');

const formatBanRangeLabel = (gap) => {
  if (!gap) return '-';
  const left = `${getTypeSeriesText(gap.startTypeSeriesId) || '?'}${getEventTypeShort(gap.startEventType)}`;
  const right = `${getTypeSeriesText(gap.endTypeSeriesId) || '?'}${getEventTypeShort(gap.endEventType)}`;
  return `${left}→${right}`;
};

const RELATED_RECORD_ITEMS = [
  { id: 'rel-last-four', title: '上一次四星' },
  { id: 'rel-last-limited', title: '上一次限定' },
  { id: 'rel-four-long', title: '四星最长间隔' },
  { id: 'rel-four-short', title: '四星最短间隔' },
  { id: 'rel-limited-long', title: '限定最长间隔' },
  { id: 'rel-limited-short', title: '限定最短间隔' },
  { id: 'rel-ban-long', title: 'Ban最长间隔' },
  { id: 'rel-ban-short', title: 'Ban最短间隔' },
  { id: 'rel-vs-unit-last-four', title: '各团VS上次四星' },
  { id: 'rel-vs-unit-four-count', title: '各团VS四星数' },
  { id: 'rel-vs-unit-score', title: '团分统计' },
  { id: 'rel-vs-original-stat', title: '原V统计' },
  { id: 'rel-cfes-stat', title: 'CFES统计' },
  { id: 'rel-bfes-stat', title: 'BFES统计' }
];

const RELATED_RECORD_TITLE_MAP = Object.fromEntries(
  RELATED_RECORD_ITEMS.map((item) => [item.id, item.title])
);

const getRelatedRecordTitle = (id) => RELATED_RECORD_TITLE_MAP[id] || id;
const getUnitNavTitle = (unit) => String(unit || '').toUpperCase();

const lineupUnitFirstNameMap = computed(() => {
  const firstByUnit = {};
  characterLineupRows.value.forEach((row) => {
    const name = String(row?.name || '').trim();
    if (!name) return;
    const unit = getUnitByChar(name);
    if (!LINEUP_NAV_UNITS.includes(unit)) return;
    if (!firstByUnit[unit]) firstByUnit[unit] = name;
  });
  return firstByUnit;
});

const lineupUnitNavChildren = computed(() => {
  return LINEUP_NAV_UNITS
    .filter((unit) => !!lineupUnitFirstNameMap.value[unit])
    .map((unit) => ({
      id: getLineupCardId(lineupUnitFirstNameMap.value[unit]),
      title: getUnitNavTitle(unit)
    }));
});

const supportUnitNavChildren = computed(() => {
  const supportUnitSet = new Set(
    supportLineupRows.value
      .map((row) => String(row?.unit || '').toLowerCase())
      .filter((unit) => SUPPORT_NAV_UNITS.includes(unit))
  );

  return SUPPORT_NAV_UNITS
    .filter((unit) => supportUnitSet.has(unit))
    .map((unit) => ({
      id: getSupportCardId(unit),
      title: getUnitNavTitle(unit)
    }));
});

const createAttrSummaryMetricSeed = () => ({
  pureScoreCount: 0,
  unitScoreCount: 0,
  scoreUpCount: 0,
  pScoreCount: 0,
  accuracyCount: 0,
  recoveryCount: 0,
  fourStarCount: 0,
  threeStarCount: 0,
  twoStarCount: 0
});

const createAttrSummarySeed = () => ({
  Pure: createAttrSummaryMetricSeed(),
  Cool: createAttrSummaryMetricSeed(),
  Cute: createAttrSummaryMetricSeed(),
  Happy: createAttrSummaryMetricSeed(),
  Mysterious: createAttrSummaryMetricSeed(),
  total: createAttrSummaryMetricSeed()
});

const attrSummaryCards = computed(() => {
  const maxEid = safeMaxEventId.value;
  const names = toDisplayOrderedCharNames(Object.keys(CHAR_ORDER));
  const statsByName = Object.fromEntries(names.map((name) => [name, createAttrSummarySeed()]));
  const pureExcludedSkills = includeUnitScoreInPureScore.value
    ? new Set(['accuracy', 'recovery', '-', ''])
    : new Set(['accuracy', 'recovery', 'unit_score', '-', '']);

  (props.allCards || []).forEach((card) => {
    const name = String(card?.Name || '').trim();
    if (!statsByName[name]) return;
    if (!isCardWithinLimit(card, maxEid)) return;

    const attr = normalizeAttr(card?.Attribute);
    if (!ATTRS.includes(attr)) return;

    const rarity = String(card?.Rarity || '').trim();
    const skill = String(card?.Skill || '').trim().toLowerCase();
    const attrBucket = statsByName[name][attr];
    const totalBucket = statsByName[name].total;
    const increase = (key) => {
      attrBucket[key] += 1;
      totalBucket[key] += 1;
    };

    if (rarity === '4') {
      increase('fourStarCount');
      if (skill === 'score_up') increase('scoreUpCount');
      if (skill === 'p_score') increase('pScoreCount');
      if (skill === 'accuracy') increase('accuracyCount');
      if (skill === 'recovery') increase('recoveryCount');
      if (skill === 'unit_score') increase('unitScoreCount');
      if (!pureExcludedSkills.has(skill)) increase('pureScoreCount');
    }

    if (rarity === '3') increase('threeStarCount');
    if (rarity === '2') increase('twoStarCount');
  });

  const toSummaryRow = (bucket, isVs, attr) => {
    const source = bucket || createAttrSummaryMetricSeed();
    return {
      attr,
      mainScoreCount: isVs ? Number(source.unitScoreCount || 0) : Number(source.pureScoreCount || 0),
      scoreUpCount: Number(source.scoreUpCount || 0),
      pScoreCount: Number(source.pScoreCount || 0),
      accuracyCount: Number(source.accuracyCount || 0),
      recoveryCount: Number(source.recoveryCount || 0),
      fourStarCount: Number(source.fourStarCount || 0),
      threeStarCount: Number(source.threeStarCount || 0),
      twoStarCount: Number(source.twoStarCount || 0)
    };
  };

  return names.map((name) => {
    const isVs = isVirtualSinger(name);
    const unit = String(getUnitByChar(name) || '').toLowerCase() || 'vs';
    const source = statsByName[name] || createAttrSummarySeed();
    return {
      name,
      unit,
      anchorId: getAttrSummaryCardId(name),
      mainScoreLabel: isVs ? '团分' : '分卡',
      rows: ATTRS.map((attr) => toSummaryRow(source[attr], isVs, attr)),
      totalRow: toSummaryRow(source.total, isVs, 'total')
    };
  });
});

const attrSummaryUnitNavChildren = computed(() => {
  const firstByUnit = {};
  (attrSummaryCards.value || []).forEach((card) => {
    const unit = String(card?.unit || '').toLowerCase();
    if (!LINEUP_NAV_UNITS.includes(unit)) return;
    if (!firstByUnit[unit]) firstByUnit[unit] = card;
  });

  return LINEUP_NAV_UNITS
    .filter((unit) => !!firstByUnit[unit])
    .map((unit) => ({
      id: firstByUnit[unit].anchorId,
      title: getUnitNavTitle(unit)
    }));
});

const navGroups = computed(() => {
  const distChildren = groupPanels.value.map((p) => ({
    id: `panel-${p.id}`,
    title: p.title
  }));

  return [
    {
      id: 'panel-dist',
      title: '阶梯分布',
      children: distChildren
    },
    {
      id: 'panel-festival',
      title: '节日人选',
      children: SPECIAL_FESTIVALS.map((fest) => ({
        id: FESTIVAL_ANCHOR_IDS[fest],
        title: fest
      }))
    },
    {
      id: 'panel-related',
      title: '相关记录',
      children: RELATED_RECORD_ITEMS.map((item) => ({ id: item.id, title: item.title }))
    },
    {
      id: 'panel-lineup',
      title: '日挑配队',
      children: lineupUnitNavChildren.value
    },
    {
      id: 'panel-support',
      title: '支援配队',
      children: supportUnitNavChildren.value
    },
    {
      id: 'panel-attr-summary',
      title: '花色统计',
      children: attrSummaryUnitNavChildren.value
    },
    {
      id: 'panel-matrix',
      title: '角色矩阵',
      children: []
    },
    {
      id: 'panel-vs-matrix',
      title: '虚拟歌手矩阵',
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
  const topLevelGroupIds = new Set(navGroups.value.map((group) => String(group?.id || '').trim()));
  const isChildNavId = (id) => !topLevelGroupIds.has(String(id || '').trim());

  const containing = [];
  const passed = [];
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
    if (rect.top <= anchorY) {
      passed.push({ id, top: rect.top });
      return;
    }
    if (rect.top > anchorY) {
      upcoming.push({ id, top: rect.top });
    }
  });

  if (containing.length > 0) {
    const containingChildren = containing.filter((item) => isChildNavId(item.id));
    if (containingChildren.length > 0) {
      containingChildren.sort((a, b) => {
        if (b.top !== a.top) return b.top - a.top;
        return a.height - b.height;
      });
      return containingChildren[0].id;
    }

    containing.sort((a, b) => {
      if (b.top !== a.top) return b.top - a.top;
      return a.height - b.height;
    });
    return containing[0].id;
  }

  if (passed.length > 0) {
    passed.sort((a, b) => b.top - a.top);
    return passed[0].id;
  }

  if (upcoming.length > 0) {
    upcoming.sort((a, b) => a.top - b.top);
    return upcoming[0].id;
  }

  return ids[ids.length - 1] || ids[0] || '';
};

const syncActiveNavByViewport = () => {
  if (viewportPreserveLock > 0) return;
  try {
    const nextId = pickActiveNavTargetIdByViewport();
    if (nextId && activeNavId.value !== nextId) {
      activeNavId.value = nextId;
    }
  } catch (_) {
    // Guard against DOM timing races.
  }
};

const scheduleNavSync = () => {
  if (navSyncRaf) return;
  navSyncRaf = requestAnimationFrame(() => {
    navSyncRaf = 0;
    syncActiveNavByViewport();
  });
};

const SCROLL_SNAPSHOT_ANCHOR_SELECTOR = '.stats-main [data-scroll-anchor]';

const getAnchorNodesInStatsMain = () => {
  const statsMain = document.querySelector('.stats-main');
  if (!(statsMain instanceof HTMLElement)) return [];
  return Array.from(statsMain.querySelectorAll(SCROLL_SNAPSHOT_ANCHOR_SELECTOR))
    .filter((el) => el instanceof HTMLElement && String(el.id || '').trim());
};

const findAnchorElementByKey = (key) => {
  const wanted = String(key || '').trim();
  if (!wanted) return null;
  const statsMain = document.querySelector('.stats-main');
  if (!(statsMain instanceof HTMLElement)) return null;
  const escaped = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(wanted)
    : wanted.replace(/"/g, '\\"');
  const el = statsMain.querySelector(`[data-scroll-anchor="${escaped}"]`);
  if (!(el instanceof HTMLElement)) return null;
  return el;
};

const getViewportCenterAnchorElement = (host) => {
  if (!(host instanceof HTMLElement)) return null;
  const hostRect = host.getBoundingClientRect();
  if (hostRect.width <= 2 || hostRect.height <= 2) return null;

  const nodes = getAnchorNodesInStatsMain();
  const centerY = hostRect.top + (hostRect.height * 0.35);
  let bestNode = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    const visibleTop = Math.max(rect.top, hostRect.top);
    const visibleBottom = Math.min(rect.bottom, hostRect.bottom);
    if ((visibleBottom - visibleTop) < 8) continue;
    const mid = (visibleTop + visibleBottom) * 0.5;
    const distance = Math.abs(mid - centerY);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestNode = node;
    }
  }
  return bestNode;
};

const getActiveNavAnchorElement = () => {
  const host = getScrollContainer();
  const hostRect = host.getBoundingClientRect();
  const isVisibleInViewport = (el) => {
    if (!(el instanceof HTMLElement)) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return false;
    const visibleTop = Math.max(rect.top, hostRect.top);
    const visibleBottom = Math.min(rect.bottom, hostRect.bottom);
    return (visibleBottom - visibleTop) >= 10;
  };

  const activeId = String(activeNavId.value || '').trim();
  if (activeId) {
    const exact = findAnchorElementByKey(activeId);
    if (isVisibleInViewport(exact)) return exact;
  }

  const byViewportId = pickActiveNavTargetIdByViewport();
  if (byViewportId) {
    const byViewport = findAnchorElementByKey(byViewportId);
    if (isVisibleInViewport(byViewport)) return byViewport;
  }

  return null;
};

const snapshotViewportAnchor = (options = {}) => {
  const preferActiveNav = options?.preferActiveNav === true;
  const host = getScrollContainer();
  const hostRect = host.getBoundingClientRect();
  const activeAnchor = getActiveNavAnchorElement();
  const viewportAnchor = getViewportCenterAnchorElement(host);
  const anchorEl = preferActiveNav
    ? (activeAnchor || viewportAnchor)
    : (viewportAnchor || activeAnchor);
  const anchorRect = anchorEl ? anchorEl.getBoundingClientRect() : null;
  const anchorTop = anchorRect ? (anchorRect.top - hostRect.top) : 0;
  return {
    anchorEl,
    anchorId: String(anchorEl?.id || '').trim(),
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

  const connectedAnchor = snapshot.anchorEl instanceof HTMLElement && snapshot.anchorEl.isConnected
    ? snapshot.anchorEl
    : null;
  const anchorEl = connectedAnchor || findAnchorElementByKey(snapshot.anchorId);

  if (snapshot.hasAnchor && anchorEl instanceof HTMLElement) {
    const afterRect = anchorEl.getBoundingClientRect();
    const afterTop = afterRect.top - hostRect.top;
    const nextTop = snapshot.scrollTop + (afterTop - snapshot.anchorTop);
    host.scrollTop = clampTop(nextTop);
    return;
  }

  host.scrollTop = clampTop(snapshot.scrollTop);
};

const withPreservedScrollCenter = async (applyChange, options = {}) => {
  const snapshot = snapshotViewportAnchor(options);
  viewportPreserveLock += 1;
  try {
    applyChange();
    await nextTick();
    restoreViewportAnchor(snapshot);
  } finally {
    viewportPreserveLock = Math.max(0, viewportPreserveLock - 1);
    scheduleNavSync();
  }
};

const clampHostScrollTop = (host, top) => {
  if (!(host instanceof HTMLElement)) return 0;
  const maxTop = Math.max(0, host.scrollHeight - host.clientHeight);
  return Math.max(0, Math.min(maxTop, top));
};

const withPreservedScrollTop = async (applyChange) => {
  const host = getScrollContainer();
  const beforeTop = host.scrollTop;
  applyChange();
  await nextTick();
  const nextHost = getScrollContainer();
  nextHost.scrollTop = clampHostScrollTop(nextHost, beforeTop);
  scheduleNavSync();
};

const getLayoutAnchorForNavToggle = () => {
  const host = getScrollContainer();
  const hostRect = host.getBoundingClientRect();
  const isVisibleInViewport = (el) => {
    if (!(el instanceof HTMLElement)) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return false;
    const visibleTop = Math.max(rect.top, hostRect.top);
    const visibleBottom = Math.min(rect.bottom, hostRect.bottom);
    return (visibleBottom - visibleTop) >= 10;
  };

  const activeId = String(activeNavId.value || '').trim();
  if (activeId) {
    const activeEl = findAnchorElementByKey(activeId);
    if (isVisibleInViewport(activeEl)) {
      return { anchorId: activeId, anchorEl: activeEl };
    }
  }

  const fallbackAnchor = getViewportCenterAnchorElement(getScrollContainer());
  if (fallbackAnchor instanceof HTMLElement) {
    return {
      anchorId: String(fallbackAnchor?.dataset?.scrollAnchor || fallbackAnchor.id || '').trim(),
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
    ? (findAnchorElementByKey(anchorId) || document.getElementById(anchorId))
    : (beforeAnchor.isConnected ? beforeAnchor : null);

  if (afterAnchor instanceof HTMLElement) {
    const afterTop = afterAnchor.getBoundingClientRect().top - nextHostRect.top;
    const nextTop = nextHost.scrollTop + (afterTop - beforeTop);
    nextHost.scrollTop = clampHostScrollTop(nextHost, nextTop);
  }

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

const withPinnedElementPosition = async (targetEl, applyChange) => {
  const snapshot = snapshotViewportAnchor({ preferActiveNav: false });
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

  scheduleNavSync();
};

const withInteractionPinnedPosition = async (applyChange, explicitTarget = null) => {
  const target = explicitTarget instanceof HTMLElement ? explicitTarget : consumeRecentInteractiveAnchor();
  if (target instanceof HTMLElement) {
    await withPinnedElementPosition(target, applyChange);
    return;
  }
  await withNavAnchorPinnedPosition(applyChange);
};

const withInfoAreaTopLeftPinned = async (applyChange) => {
  await withNavAnchorPinnedPosition(applyChange);
};

const handleViewportScroll = () => {
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

const setNavCollapsed = (nextCollapsed, preserveCenter = true) => {
  const next = !!nextCollapsed;
  if (navCollapsed.value === next) return;
  if (!next) {
    resetMobileNavGroupExpansion();
  }
  if (!preserveCenter) {
    navCollapsed.value = next;
    void nextTick(() => {
      triggerLineupCardModeRowLayoutSyncBurst();
    });
    return;
  }
  void withInfoAreaTopLeftPinned(() => {
    navCollapsed.value = next;
    void nextTick(() => {
      triggerLineupCardModeRowLayoutSyncBurst();
    });
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
    void nextTick(() => {
      triggerLineupCardModeRowLayoutSyncBurst();
    });
  };

  if (needPreserve) {
    void withInfoAreaTopLeftPinned(() => {
      applyState();
      bindViewportScrollTracking();
    });
    return;
  }
  applyState();
  bindViewportScrollTracking();
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

const sanitizeExportFileName = (name) => {
  const raw = String(name || '').trim();
  const cleaned = raw
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[.\s]+$/g, '')
    .trim();
  return cleaned || 'pjsk_stats';
};

const formatExportTimestamp = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}_${hh}${mm}`;
};

const triggerDownloadPng = async (canvas, fileName) => {
  const blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });
  if (!blob) {
    throw new Error('toBlob failed');
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
  pendingCardCaptureRenderTask = null;
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

const getCaptureDeviceTier = () => {
  const width = Number(window?.innerWidth || 0);
  const height = Number(window?.innerHeight || 0);
  const minSide = Math.min(width || Number.MAX_SAFE_INTEGER, height || Number.MAX_SAFE_INTEGER);
  if (width < 1200) {
    if (minSide >= 680) return 'tablet';
    return 'phone';
  }
  return 'desktop';
};

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

const buildExportScaleCandidates = (preferredScale, isMobileScreen) => {
  const baseScale = Number.isFinite(preferredScale) && preferredScale > 0 ? preferredScale : 1;
  const ladder = isMobileScreen
    ? [baseScale, Math.min(baseScale, 1.4), 1.15, 1]
    : [baseScale, Math.min(baseScale, 1.8), 1.45, 1.2, 1];
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

const buildAdaptiveScaleCandidates = (preferredScale, deviceTier, heavyMediaCount) => {
  const isMobileScreen = deviceTier !== 'desktop';
  const base = buildExportScaleCandidates(preferredScale, isMobileScreen);
  if (heavyMediaCount < 18) return base;

  const seen = new Set();
  const targeted = (deviceTier === 'phone' || deviceTier === 'tablet'
    ? [Math.max(1.75, Math.min(base[0] || 2, 2.05)), 1.65, 1.45, 1.25]
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

const buildCardCaptureProfile = ({ deviceTier, heavyMediaCount }) => {
  const preferredScale = 2.0;
  const scales = buildAdaptiveScaleCandidates(preferredScale, deviceTier, heavyMediaCount);
  const baseScale = Number(scales[0] || preferredScale || 1);
  return {
    preferredScale,
    scales,
    baseScale
  };
};

const buildCardCaptureMessage = (exportTitle, baseScale) => {
  const scale = Number(baseScale || 1);
  return `正在导出「${exportTitle}」... 基础清晰度 x${scale.toFixed(2)}`;
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

const getRenderDiagnosticPlan = (attemptIndex) => {
  if (attemptIndex <= 0) {
    return { key: 'normal', label: '标准渲染' };
  }
  if (attemptIndex === 1) {
    return { key: 'style-sanitize', label: '禁用动画/滤镜' };
  }
  if (attemptIndex === 2) {
    return { key: 'flatten-decor', label: '扁平化装饰层（阴影/渐变/伪元素）' };
  }
  if (attemptIndex === 3) {
    return { key: 'hide-unready-images', label: '隐藏未就绪图片' };
  }
  return { key: 'style-no-image', label: '禁用动画/滤镜 + 隐藏全部图片' };
};

const applyRenderDiagnosticMitigation = (rootEl, planKey) => {
  if (!(rootEl instanceof HTMLElement)) {
    return {
      styleSanitized: 0,
      hiddenImages: 0,
      flattenedDecor: 0,
      pseudoDisabled: false
    };
  }
  const result = {
    styleSanitized: 0,
    hiddenImages: 0,
    flattenedDecor: 0,
    pseudoDisabled: false
  };
  const needSanitizeStyle = planKey === 'style-sanitize' || planKey === 'style-no-image';
  const hideAllImages = planKey === 'style-no-image';
  const hideUnreadyImages = planKey === 'hide-unready-images' || hideAllImages;
  const flattenDecor = planKey === 'flatten-decor' || planKey === 'style-no-image';

  if (needSanitizeStyle) {
    rootEl.querySelectorAll('*').forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const computed = window.getComputedStyle(node);
      let touched = false;
      if (computed.animationName && computed.animationName !== 'none') {
        node.style.animation = 'none';
        touched = true;
      }
      if (computed.transitionProperty && computed.transitionProperty !== 'all 0s ease 0s' && computed.transitionDuration !== '0s') {
        node.style.transition = 'none';
        touched = true;
      }
      if (computed.filter && computed.filter !== 'none') {
        node.style.filter = 'none';
        touched = true;
      }
      if (computed.backdropFilter && computed.backdropFilter !== 'none') {
        node.style.backdropFilter = 'none';
        touched = true;
      }
      if (computed.mixBlendMode && computed.mixBlendMode !== 'normal') {
        node.style.mixBlendMode = 'normal';
        touched = true;
      }
      if (computed.position === 'sticky') {
        node.style.position = 'static';
        node.style.top = 'auto';
        node.style.left = 'auto';
        touched = true;
      }
      if (touched) {
        result.styleSanitized += 1;
      }
    });
  }

  if (flattenDecor) {
    if (!rootEl.querySelector('style[data-export-diag="pseudo-off"]')) {
      const pseudoStyle = document.createElement('style');
      pseudoStyle.setAttribute('data-export-diag', 'pseudo-off');
      pseudoStyle.textContent = '*::before,*::after{content:none !important;animation:none !important;transition:none !important;box-shadow:none !important;text-shadow:none !important;}';
      rootEl.appendChild(pseudoStyle);
      result.pseudoDisabled = true;
    }
    rootEl.querySelectorAll('*').forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const computed = window.getComputedStyle(node);
      let touched = false;
      if (computed.boxShadow && computed.boxShadow !== 'none') {
        node.style.boxShadow = 'none';
        touched = true;
      }
      if (computed.textShadow && computed.textShadow !== 'none') {
        node.style.textShadow = 'none';
        touched = true;
      }
      if (computed.backgroundImage && computed.backgroundImage !== 'none') {
        node.style.backgroundImage = 'none';
        touched = true;
      }
      if (computed.clipPath && computed.clipPath !== 'none') {
        node.style.clipPath = 'none';
        touched = true;
      }
      if (computed.webkitMaskImage && computed.webkitMaskImage !== 'none') {
        node.style.webkitMaskImage = 'none';
        touched = true;
      }
      if (computed.maskImage && computed.maskImage !== 'none') {
        node.style.maskImage = 'none';
        touched = true;
      }
      if (computed.overflow === 'clip') {
        node.style.overflow = 'visible';
        touched = true;
      }
      if (touched) {
        result.flattenedDecor += 1;
      }
    });
  }

  if (hideUnreadyImages) {
    rootEl.querySelectorAll('img').forEach((imgEl) => {
      if (!(imgEl instanceof HTMLImageElement)) return;
      const ready = imgEl.complete && imgEl.naturalWidth > 0;
      if (!hideAllImages && ready) return;
      imgEl.dataset.failed = '1';
      imgEl.style.display = 'none';
      result.hiddenImages += 1;
    });
  }

  return result;
};

const getRenderStallSignals = (rootEl) => {
  if (!(rootEl instanceof HTMLElement)) return '无可用诊断节点';
  let animated = 0;
  let filtered = 0;
  let sticky = 0;
  rootEl.querySelectorAll('*').forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const computed = window.getComputedStyle(node);
    if (computed.animationName && computed.animationName !== 'none') animated += 1;
    if ((computed.filter && computed.filter !== 'none') || (computed.backdropFilter && computed.backdropFilter !== 'none') || (computed.mixBlendMode && computed.mixBlendMode !== 'normal')) {
      filtered += 1;
    }
    if (computed.position === 'sticky') sticky += 1;
  });
  const images = Array.from(rootEl.querySelectorAll('img'));
  const unreadyImages = images.filter((imgEl) => !(imgEl instanceof HTMLImageElement) || !(imgEl.complete && imgEl.naturalWidth > 0)).length;
  return `动画节点 ${animated}，滤镜/混合节点 ${filtered}，sticky 节点 ${sticky}，未就绪图片 ${unreadyImages}/${images.length}`;
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

const waitPendingCardCaptureRenderTask = async (maxWaitMs = 0) => {
  const pending = pendingCardCaptureRenderTask;
  if (!pending) return true;
  if (!(maxWaitMs > 0)) {
    try {
      await pending;
      return true;
    } catch (_) {
      // Ignore previous render failure; caller handles current retry policy.
      return true;
    }
  }
  try {
    const settled = await Promise.race([
      pending.then(() => true).catch(() => true),
      new Promise((resolve) => {
        window.setTimeout(() => resolve(false), maxWaitMs);
      })
    ]);
    return !!settled;
  } catch (_) {
    // Ignore previous render failure; caller handles current retry policy.
    return true;
  }
};

const trackCardCaptureRenderTask = (taskPromise) => {
  const tracked = Promise.resolve(taskPromise).finally(() => {
    if (pendingCardCaptureRenderTask === tracked) {
      pendingCardCaptureRenderTask = null;
    }
  });
  pendingCardCaptureRenderTask = tracked;
  return tracked;
};

const forceReleaseCardCaptureRenderTask = () => {
  pendingCardCaptureRenderTask = null;
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

const getTableColumnWidths = (tableEl) => {
  if (!(tableEl instanceof HTMLTableElement)) return [];
  const headRow = tableEl.querySelector('thead tr');
  const bodyRow = tableEl.querySelector('tbody tr');
  const probeRow = headRow || bodyRow;
  if (!(probeRow instanceof HTMLTableRowElement)) return [];
  const cells = Array.from(probeRow.children).filter((cell) => cell instanceof HTMLTableCellElement);
  return cells.map((cell) => Math.max(1, Math.ceil(cell.getBoundingClientRect().width)));
};

const applyTableColumnWidths = (tableEl, widths) => {
  if (!(tableEl instanceof HTMLTableElement) || !Array.isArray(widths) || widths.length === 0) return;
  let colgroup = tableEl.querySelector('colgroup.export-sync-colgroup');
  if (!(colgroup instanceof HTMLTableColElement) && !(colgroup instanceof HTMLElement)) {
    colgroup = document.createElement('colgroup');
    colgroup.className = 'export-sync-colgroup';
    tableEl.insertBefore(colgroup, tableEl.firstChild);
  }
  colgroup.innerHTML = '';
  widths.forEach((widthPx) => {
    const col = document.createElement('col');
    col.style.width = `${widthPx}px`;
    col.style.minWidth = `${widthPx}px`;
    colgroup.appendChild(col);
  });

  const totalWidth = widths.reduce((sum, value) => sum + value, 0);
  tableEl.style.tableLayout = 'fixed';
  tableEl.style.width = `${Math.max(1, Math.ceil(totalWidth))}px`;
  tableEl.style.minWidth = `${Math.max(1, Math.ceil(totalWidth))}px`;
  tableEl.style.maxWidth = 'none';
};

const syncRecordBlockLayoutForExport = (sourceBlock, cloneBlock) => {
  if (!(sourceBlock instanceof HTMLElement) || !(cloneBlock instanceof HTMLElement)) return 0;
  let expandedWidth = Math.max(sourceBlock.clientWidth, sourceBlock.scrollWidth);
  const sourceTables = sourceBlock.querySelectorAll('table');
  const cloneTables = cloneBlock.querySelectorAll('table');

  cloneTables.forEach((cloneTable, idx) => {
    const sourceTable = sourceTables[idx];
    if (!(cloneTable instanceof HTMLTableElement) || !(sourceTable instanceof HTMLTableElement)) return;
    const widths = getTableColumnWidths(sourceTable);
    if (widths.length > 0) {
      applyTableColumnWidths(cloneTable, widths);
    } else {
      const tableWidth = Math.max(sourceTable.clientWidth, sourceTable.scrollWidth);
      cloneTable.style.width = `${tableWidth}px`;
      cloneTable.style.minWidth = `${tableWidth}px`;
      cloneTable.style.maxWidth = 'none';
    }
    expandedWidth = Math.max(expandedWidth, sourceTable.scrollWidth + 20);
  });

  const sourceBlockHeight = Math.max(sourceBlock.clientHeight, sourceBlock.scrollHeight);
  cloneBlock.style.overflow = 'visible';
  cloneBlock.style.maxHeight = 'none';
  cloneBlock.style.height = `${Math.max(1, Math.ceil(sourceBlockHeight))}px`;
  cloneBlock.style.width = `${Math.max(1, Math.ceil(expandedWidth))}px`;
  cloneBlock.style.minWidth = `${Math.max(1, Math.ceil(expandedWidth))}px`;
  cloneBlock.style.maxWidth = 'none';
  return expandedWidth;
};

const copyCssCustomPropertiesFromAncestors = (sourceEl, targetEl, stopEl = null) => {
  if (!(sourceEl instanceof HTMLElement) || !(targetEl instanceof HTMLElement)) return;
  const chain = [];
  let cursor = sourceEl;
  while (cursor instanceof HTMLElement) {
    chain.push(cursor);
    if (stopEl instanceof HTMLElement && cursor === stopEl) break;
    cursor = cursor.parentElement;
  }
  for (let idx = chain.length - 1; idx >= 0; idx -= 1) {
    copyCssCustomProperties(window.getComputedStyle(chain[idx]), targetEl);
  }
};

const syncCloneFormControlsWithSource = (sourceRoot, cloneRoot) => {
  if (!(sourceRoot instanceof HTMLElement) || !(cloneRoot instanceof HTMLElement)) return;
  const sourceInputs = Array.from(sourceRoot.querySelectorAll('input, select, textarea'));
  const cloneInputs = Array.from(cloneRoot.querySelectorAll('input, select, textarea'));
  const pairCount = Math.min(sourceInputs.length, cloneInputs.length);
  for (let idx = 0; idx < pairCount; idx += 1) {
    const source = sourceInputs[idx];
    const clone = cloneInputs[idx];
    if (source instanceof HTMLInputElement && clone instanceof HTMLInputElement) {
      clone.checked = source.checked;
      clone.indeterminate = source.indeterminate;
      clone.value = source.value;
      if (source.checked) {
        clone.setAttribute('checked', 'checked');
      } else {
        clone.removeAttribute('checked');
      }
      if (source.value !== undefined && source.value !== null) {
        clone.setAttribute('value', String(source.value));
      }
      continue;
    }
    if (source instanceof HTMLSelectElement && clone instanceof HTMLSelectElement) {
      clone.selectedIndex = source.selectedIndex;
      clone.value = source.value;
      Array.from(clone.options).forEach((opt, optIdx) => {
        if (!(opt instanceof HTMLOptionElement)) return;
        const selected = optIdx === source.selectedIndex;
        opt.selected = selected;
        if (selected) {
          opt.setAttribute('selected', 'selected');
        } else {
          opt.removeAttribute('selected');
        }
      });
      continue;
    }
    if (source instanceof HTMLTextAreaElement && clone instanceof HTMLTextAreaElement) {
      clone.value = source.value;
    }
  }
};

const syncCloneBackgroundStylesWithSource = (sourceRoot, cloneRoot) => {
  if (!(sourceRoot instanceof HTMLElement) || !(cloneRoot instanceof HTMLElement)) return;
  const sourceNodes = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll('*'))];
  const cloneNodes = [cloneRoot, ...Array.from(cloneRoot.querySelectorAll('*'))];
  const pairCount = Math.min(sourceNodes.length, cloneNodes.length);
  for (let idx = 0; idx < pairCount; idx += 1) {
    const sourceEl = sourceNodes[idx];
    const cloneEl = cloneNodes[idx];
    if (!(sourceEl instanceof HTMLElement) || !(cloneEl instanceof HTMLElement)) continue;
    const computed = window.getComputedStyle(sourceEl);
    const background = String(computed.background || '').trim();
    const bgColor = String(computed.backgroundColor || '').trim();
    const bgImage = String(computed.backgroundImage || '').trim();
    const bgRepeat = String(computed.backgroundRepeat || '').trim();
    const bgPosition = String(computed.backgroundPosition || '').trim();
    const bgSize = String(computed.backgroundSize || '').trim();
    const border = String(computed.border || '').trim();
    const borderColor = String(computed.borderColor || '').trim();
    // Avoid writing shorthand `background` here: on some cards it serializes with transparent color
    // and wipes the intended fill while keeping gradient strips.
    if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
      cloneEl.style.backgroundColor = bgColor;
    }
    if (bgImage && bgImage !== 'none') {
      cloneEl.style.backgroundImage = bgImage;
      if (bgRepeat) cloneEl.style.backgroundRepeat = bgRepeat;
      if (bgPosition) cloneEl.style.backgroundPosition = bgPosition;
      if (bgSize) cloneEl.style.backgroundSize = bgSize;
    }
    if (border && border !== '0px none rgb(0, 0, 0)') {
      cloneEl.style.border = border;
    } else if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)') {
      cloneEl.style.borderColor = borderColor;
    }
  }
};

const isTransparentColor = (colorText) => {
  const value = String(colorText || '').trim().toLowerCase();
  return !value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)';
};

const resolveSingleCardFillFromSource = (sourceEl) => {
  if (!(sourceEl instanceof HTMLElement)) return '';
  const inlineBgColor = String(sourceEl.style?.backgroundColor || '').trim();
  if (!isTransparentColor(inlineBgColor)) return inlineBgColor;
  const computed = window.getComputedStyle(sourceEl);
  const bgColor = String(computed.backgroundColor || '').trim();
  if (!isTransparentColor(bgColor)) return bgColor;

  const resolvedLineupBg = String(computed.getPropertyValue('--lineup-row-bg') || '').trim();
  if (resolvedLineupBg) return resolvedLineupBg;

  const resolvedRecordTint = String(computed.getPropertyValue('--record-tint') || '').trim();
  if (resolvedRecordTint) return resolvedRecordTint;

  const rowLikeHost = sourceEl.closest('.lineup-plan-row, tr');
  if (rowLikeHost instanceof HTMLElement) {
    const hostComputed = window.getComputedStyle(rowLikeHost);
    const hostLineupBg = String(hostComputed.getPropertyValue('--lineup-row-bg') || '').trim();
    if (hostLineupBg) return hostLineupBg;
    const hostRecordTint = String(hostComputed.getPropertyValue('--record-tint') || '').trim();
    if (hostRecordTint) return hostRecordTint;
    const hostBgColor = String(hostComputed.backgroundColor || '').trim();
    if (!isTransparentColor(hostBgColor)) return hostBgColor;
  }

  return '';
};

const syncSingleCardFillStylesWithSource = (sourceRoot, cloneRoot) => {
  if (!(sourceRoot instanceof HTMLElement) || !(cloneRoot instanceof HTMLElement)) return;
  const collectNodesIncludingRoot = (rootEl, selector) => {
    const nodes = [];
    if (rootEl.matches(selector)) {
      nodes.push(rootEl);
    }
    nodes.push(...Array.from(rootEl.querySelectorAll(selector)));
    return nodes;
  };
  const selectors = [
    '.lineup-card',
    '.support-card',
    '.attr-summary-card',
    '.lineup-member-cell',
    '.support-member-cell',
    '.related-last-card-thumb',
    '.interval-card-thumb'
  ];
  selectors.forEach((selector) => {
    const sourceNodes = collectNodesIncludingRoot(sourceRoot, selector);
    const cloneNodes = collectNodesIncludingRoot(cloneRoot, selector);
    const pairCount = Math.min(sourceNodes.length, cloneNodes.length);
    for (let idx = 0; idx < pairCount; idx += 1) {
      const sourceEl = sourceNodes[idx];
      const cloneEl = cloneNodes[idx];
      if (!(sourceEl instanceof HTMLElement) || !(cloneEl instanceof HTMLElement)) continue;
      const computed = window.getComputedStyle(sourceEl);
      const bgImage = String(computed.backgroundImage || '').trim();
      const resolvedFill = resolveSingleCardFillFromSource(sourceEl);

      if (resolvedFill) {
        cloneEl.style.setProperty('background-color', resolvedFill, 'important');
      }
      if (bgImage && bgImage !== 'none') {
        cloneEl.style.setProperty('background-image', bgImage, 'important');
      }
    }
  });
};

const preloadSingleImageUrlForCapture = (url, timeoutMs = 7000) => new Promise((resolve) => {
  const src = String(url || '').trim();
  if (!src) {
    resolve(false);
    return;
  }
  let done = false;
  let timer = 0;
  const img = new Image();
  const finish = (ok) => {
    if (done) return;
    done = true;
    if (timer) clearTimeout(timer);
    img.onload = null;
    img.onerror = null;
    resolve(!!ok);
  };
  img.onload = () => finish(true);
  img.onerror = () => finish(false);
  try {
    img.decoding = 'async';
    img.loading = 'eager';
    img.referrerPolicy = 'no-referrer';
  } catch (_) {
    // Ignore unsupported attributes.
  }
  timer = window.setTimeout(() => finish(false), timeoutMs);
  img.src = src;
});

const preloadImageUrlsForCapture = async (rootEl, options = {}) => {
  if (!(rootEl instanceof HTMLElement)) return;
  const maxImages = Number(options?.maxImages || 0) > 0 ? Number(options.maxImages) : 260;
  const concurrency = Number(options?.concurrency || 0) > 0 ? Number(options.concurrency) : 8;
  const timeoutMs = Number(options?.timeoutMs || 0) > 0 ? Number(options.timeoutMs) : 7000;
  const srcList = Array.from(rootEl.querySelectorAll('img'))
    .map((imgEl) => String(imgEl?.currentSrc || imgEl?.getAttribute('src') || '').trim())
    .filter(Boolean)
    .slice(0, maxImages);
  const uniq = [...new Set(srcList)];
  if (!uniq.length) return;

  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, uniq.length)) }).map(async () => {
    while (cursor < uniq.length) {
      const idx = cursor;
      cursor += 1;
      await preloadSingleImageUrlForCapture(uniq[idx], timeoutMs);
    }
  });
  await Promise.allSettled(workers);
};

const hideTransientMediaForCapture = (rootEl) => {
  if (!(rootEl instanceof HTMLElement)) return 0;
  let hidden = 0;
  rootEl.querySelectorAll('img').forEach((imgEl) => {
    if (!(imgEl instanceof HTMLImageElement)) return;
    if (imgEl.complete && imgEl.naturalWidth > 0) return;
    imgEl.style.display = 'none';
    imgEl.dataset.failed = '1';
    hidden += 1;
  });
  return hidden;
};

const buildCapturePixelRatioPlan = (deviceTier) => {
  const target = 2;
  const ladder = deviceTier === 'desktop'
    ? [target, 1]
    : [target, 1];
  const seen = new Set();
  return ladder.filter((value) => {
    const key = String(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const CAPTURE_IMAGE_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';

const syncLineupCardModeRowLayout = () => {
  const rootEl = cardStatsRootRef.value;
  if (!(rootEl instanceof HTMLElement)) return;
  const viewportWidth = Number(window?.innerWidth || 0);
  // Keep pad behavior close to desktop: rely on native grid stretch and avoid JS-forced row heights.
  // Only keep force-sync for very small screens where card cell width oscillation is more visible.
  const shouldForce = viewportWidth > 0 && viewportWidth <= 760;
  const rows = rootEl.querySelectorAll('.lineup-plan-row');
  rows.forEach((row) => {
    if (!(row instanceof HTMLElement)) return;
    if (!shouldForce) {
      row.style.removeProperty('min-height');
      row.querySelectorAll('.lineup-member-cell .lineup-slot-card').forEach((slot) => {
        if (!(slot instanceof HTMLElement)) return;
        slot.style.removeProperty('height');
      });
      return;
    }
    const slotCards = row.querySelectorAll('.lineup-member-cell.is-card-mode .lineup-slot-card');
    if (!slotCards.length) {
      row.style.removeProperty('min-height');
      return;
    }
    // Clear stale row min-height first, otherwise cells can stay stretched and never shrink.
    row.style.removeProperty('min-height');
    slotCards.forEach((slot) => {
      if (!(slot instanceof HTMLElement)) return;
      const width = Math.ceil(slot.getBoundingClientRect().width || slot.clientWidth || 0);
      if (width > 0) {
        slot.style.height = `${width}px`;
      }
    });
    const rowCells = Array.from(row.children).filter((child) => child instanceof HTMLElement);
    let maxHeight = 0;
    rowCells.forEach((cell) => {
      maxHeight = Math.max(maxHeight, Math.ceil(cell.getBoundingClientRect().height || 0));
    });
    if (maxHeight > 0) {
      row.style.minHeight = `${maxHeight}px`;
    }
  });
};

const scheduleLineupCardModeRowLayoutSync = () => {
  if (lineupCardLayoutSyncRaf) return;
  lineupCardLayoutSyncRaf = requestAnimationFrame(() => {
    lineupCardLayoutSyncRaf = 0;
    syncLineupCardModeRowLayout();
  });
};

const queueLineupCardModeRowLayoutSync = () => {
  scheduleLineupCardModeRowLayoutSync();
};

const triggerLineupCardModeRowLayoutSyncBurst = () => {
  queueLineupCardModeRowLayoutSync();
  requestAnimationFrame(() => {
    queueLineupCardModeRowLayoutSync();
  });
};

const bindLineupCardModeLayoutObserver = () => {
  if (lineupCardLayoutResizeObserver) {
    lineupCardLayoutResizeObserver.disconnect();
    lineupCardLayoutResizeObserver = null;
  }
  if (lineupCardLayoutMutationObserver) {
    lineupCardLayoutMutationObserver.disconnect();
    lineupCardLayoutMutationObserver = null;
  }
  if (typeof ResizeObserver === 'undefined') return;
  const rootEl = cardStatsRootRef.value;
  const statsMain = rootEl instanceof HTMLElement ? rootEl.querySelector('.stats-main') : null;
  const statsLayout = rootEl instanceof HTMLElement ? rootEl.querySelector('.stats-layout') : null;
  if (!(statsMain instanceof HTMLElement) && !(statsLayout instanceof HTMLElement) && !(rootEl instanceof HTMLElement)) return;
  lineupCardLayoutResizeObserver = new ResizeObserver(() => {
    queueLineupCardModeRowLayoutSync();
  });
  if (statsMain instanceof HTMLElement) {
    lineupCardLayoutResizeObserver.observe(statsMain);
  }
  if (statsLayout instanceof HTMLElement) {
    lineupCardLayoutResizeObserver.observe(statsLayout);
  }
  if (rootEl instanceof HTMLElement) {
    lineupCardLayoutResizeObserver.observe(rootEl);
  }
  if (typeof MutationObserver !== 'undefined' && statsLayout instanceof HTMLElement) {
    lineupCardLayoutMutationObserver = new MutationObserver(() => {
      triggerLineupCardModeRowLayoutSyncBurst();
    });
    lineupCardLayoutMutationObserver.observe(statsLayout, {
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }
};

const isEventLikeCaptureError = (error) => {
  if (typeof Event !== 'undefined' && error instanceof Event) return true;
  const raw = String(error?.message || error || '').trim().toLowerCase();
  return raw === '[object event]' || raw.includes('event');
};

const getCaptureErrorText = (error) => {
  if (typeof Event !== 'undefined' && error instanceof Event) {
    const eventType = String(error.type || 'unknown');
    return { text: `资源事件异常（${eventType}）`, retryable: true };
  }
  const message = String(error?.message || error || '').trim();
  const lower = message.toLowerCase();
  if (lower === '[object event]') {
    return { text: '资源事件异常（Event）', retryable: true };
  }
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
  if (lower.includes('html-to-image failed') || lower.includes('tocanvas failed')) {
    return { text: '渲染失败（html-to-image 无返回）', retryable: true };
  }
  if (lower.includes('previous-render-still-running')) {
    return { text: '上一轮渲染任务仍未结束（疑似卡死）', retryable: false };
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

const getExportFailedMessage = (reasons = []) => {
  const summary = summarizeCaptureReasons(reasons, 4);
  if (summary) {
    return `降级重试后仍失败。失败链路：${summary}`;
  }
  return '降级重试后仍失败。可能是渲染问题，再试一次没准行，这次你一定要成功。';
};

const prepareExportClone = async (targetEl) => {
  if (!targetEl) return null;

  const rootEl = cardStatsRootRef.value instanceof HTMLElement
    ? cardStatsRootRef.value
    : targetEl.closest('.pjsk-stats');
  const rect = targetEl.getBoundingClientRect();
  const sourceStyle = window.getComputedStyle(targetEl);
  const rootStyle = rootEl instanceof HTMLElement ? window.getComputedStyle(rootEl) : null;
  const relatedPanelEl = targetEl.closest('.related-panel');
  const relatedPanelStyle = relatedPanelEl instanceof HTMLElement ? window.getComputedStyle(relatedPanelEl) : null;
  const sourceRadiusVar = String(sourceStyle.getPropertyValue('--stats-radius-btn') || '').trim();
  const sourceBgColor = String(sourceStyle.backgroundColor || '').trim();
  const hasVisibleBg = sourceBgColor && sourceBgColor !== 'transparent' && sourceBgColor !== 'rgba(0, 0, 0, 0)';
  const clone = targetEl.cloneNode(true);
  clone.classList.add('export-clone-root');
  clone.style.position = 'relative';
  clone.style.left = '0';
  clone.style.top = '0';
  clone.style.margin = '0';
  clone.style.pointerEvents = 'none';
  clone.style.zIndex = 'auto';
  if (!hasVisibleBg) {
    clone.style.backgroundColor = '#ffffff';
  }
  clone.style.width = `${Math.max(1, Math.ceil(rect.width))}px`;
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';
  if (relatedPanelEl instanceof HTMLElement) {
    clone.classList.add('related-panel');
  }
  copyCssCustomProperties(rootStyle, clone);
  copyCssCustomProperties(sourceStyle, clone);
  copyCssCustomProperties(relatedPanelStyle, clone);
  copyCssCustomPropertiesFromAncestors(targetEl, clone, rootEl);
  syncCloneImagesWithSource(targetEl, clone);
  syncCloneFormControlsWithSource(targetEl, clone);
  syncCloneBackgroundStylesWithSource(targetEl, clone);
  syncSingleCardFillStylesWithSource(targetEl, clone);
  if (targetEl.classList.contains('lineup-card') || targetEl.classList.contains('support-card') || targetEl.classList.contains('attr-summary-card')) {
    const explicitFill = resolveSingleCardFillFromSource(targetEl);
    if (explicitFill) {
      clone.style.setProperty('background-color', explicitFill, 'important');
    }
  }
  if (sourceRadiusVar) {
    clone.style.setProperty('--stats-radius-btn', sourceRadiusVar);
  }

  clone.querySelectorAll('.card-export-btn').forEach((btn) => {
    btn.style.display = 'none';
  });
  clone.querySelectorAll('.lineup-toggle-btn').forEach((btn) => {
    btn.style.display = 'none';
  });
  clone.querySelectorAll('.export-hide').forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    if (el.closest('.stats-checkbox') || el.matches('.stats-checkbox')) return;
    if (el.querySelector('input[type="checkbox"]')) return;
    if (el.matches('button, .floating-menu-btn, .nav-collapse-fab, .song-mini-icon-btn')) {
      el.style.display = 'none';
    }
  });
  // html-to-image may over-render inset shadow on low-alpha CFES backgrounds,
  // causing a gray veil in the middle/corners; keep on-screen style unchanged
  // and neutralize this shadow only in export clone.
  clone.querySelectorAll('.lineup-member-cell.is-cfes').forEach((cell) => {
    cell.style.boxShadow = 'none';
  });

  const stabilizeStyle = document.createElement('style');
  stabilizeStyle.textContent = `
    .export-clone-root,
    .export-clone-root * {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    .export-clone-root *::-webkit-scrollbar {
      width: 0 !important;
      height: 0 !important;
      display: none !important;
      background: transparent !important;
    }
    .export-clone-root * {
      box-shadow: none !important;
      text-shadow: none !important;
    }
    .export-clone-root input[type="checkbox"] {
      appearance: none !important;
      -webkit-appearance: none !important;
      width: 14px !important;
      height: 14px !important;
      border: 1px solid #64748b !important;
      border-radius: 3px !important;
      background: #ffffff !important;
      position: relative !important;
      margin: 0 !important;
      accent-color: #14b8a6 !important;
    }
    .export-clone-root input[type="checkbox"]:checked {
      border-color: #14b8a6 !important;
      background: #14b8a6 !important;
    }
    .export-clone-root input[type="checkbox"]:checked::after {
      content: "";
      position: absolute;
      left: 4px;
      top: 1px;
      width: 3px;
      height: 7px;
      border: solid #ffffff;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
  `;
  clone.insertBefore(stabilizeStyle, clone.firstChild);

  const originalMatrixWrap = targetEl.querySelector('.matrix-wrap');
  const cloneMatrixWrap = clone.querySelector('.matrix-wrap');
  if (originalMatrixWrap && cloneMatrixWrap) {
    const fullMatrixWidth = Math.max(originalMatrixWrap.scrollWidth, originalMatrixWrap.clientWidth);
    const fullMatrixHeight = Math.max(originalMatrixWrap.scrollHeight, originalMatrixWrap.clientHeight);
    cloneMatrixWrap.style.maxHeight = 'none';
    cloneMatrixWrap.style.height = `${fullMatrixHeight}px`;
    cloneMatrixWrap.style.width = `${fullMatrixWidth}px`;
    cloneMatrixWrap.style.overflow = 'visible';

    const cloneMatrixHeadCells = clone.querySelectorAll('.matrix-table thead th, .matrix-table th:first-child, .matrix-table td:first-child');
    cloneMatrixHeadCells.forEach((cell) => {
      cell.style.position = 'static';
      cell.style.left = 'auto';
      cell.style.top = 'auto';
    });

    const panelPadding = 28;
    clone.style.width = `${Math.max(Math.ceil(rect.width), fullMatrixWidth + panelPadding)}px`;
  }

  const originalSongLists = targetEl.querySelectorAll('.song-list');
  const cloneSongLists = clone.querySelectorAll('.song-list');
  cloneSongLists.forEach((listEl, idx) => {
    const source = originalSongLists[idx];
    const fullHeight = source ? Math.max(source.scrollHeight, source.clientHeight) : listEl.scrollHeight;
    listEl.style.maxHeight = 'none';
    listEl.style.height = `${fullHeight}px`;
    listEl.style.overflow = 'visible';
  });

  // 相关记录子模块存在横向滚动和列宽变量，导出时同步布局避免列宽漂移。
  let expandedCloneWidth = Math.max(1, Math.ceil(rect.width));
  if (targetEl.classList.contains('record-block') && clone.classList.contains('record-block')) {
    expandedCloneWidth = Math.max(expandedCloneWidth, syncRecordBlockLayoutForExport(targetEl, clone));
  }
  const sourceRecordBlocks = targetEl.querySelectorAll('.record-block');
  const cloneRecordBlocks = clone.querySelectorAll('.record-block');
  cloneRecordBlocks.forEach((block, idx) => {
    const source = sourceRecordBlocks[idx];
    const nextWidth = syncRecordBlockLayoutForExport(source, block);
    expandedCloneWidth = Math.max(expandedCloneWidth, nextWidth + 20);
  });

  if (expandedCloneWidth > Math.ceil(rect.width)) {
    clone.style.width = `${expandedCloneWidth}px`;
  }

  const host = document.createElement('div');
  host.className = 'export-clone-host';
  host.style.position = 'fixed';
  host.style.left = '-30000px';
  host.style.top = '0';
  host.style.width = 'auto';
  host.style.height = 'auto';
  host.style.overflow = 'visible';
  host.style.pointerEvents = 'none';
  host.style.zIndex = '-1';
  host.appendChild(clone);
  document.body.appendChild(host);
  await waitNextPaint();
  return clone;
};

const resolveExportElementById = (id) => {
  const targetId = String(id || '').trim();
  if (!targetId) return null;

  const exact = document.getElementById(targetId);
  if (!exact) return null;
  if (exact.classList.contains('card-panel') || exact.classList.contains('record-block') || exact.classList.contains('festival-card') || exact.classList.contains('lineup-card') || exact.classList.contains('support-card') || exact.classList.contains('attr-summary-card')) {
    return exact;
  }
  return exact.closest('.record-block, .festival-card, .lineup-card, .support-card, .attr-summary-card, .card-panel');
};

const freezeCssVariablesForCapture = (targetEl) => {
  if (!(targetEl instanceof HTMLElement)) {
    return () => {};
  }
  const prevValues = new Map();
  const computed = window.getComputedStyle(targetEl);
  for (let idx = 0; idx < computed.length; idx += 1) {
    const prop = computed[idx];
    if (!String(prop || '').startsWith('--')) continue;
    const value = String(computed.getPropertyValue(prop) || '').trim();
    if (!value) continue;
    prevValues.set(prop, targetEl.style.getPropertyValue(prop));
    targetEl.style.setProperty(prop, value);
  }
  return () => {
    prevValues.forEach((prev, prop) => {
      if (prev) {
        targetEl.style.setProperty(prop, prev);
      } else {
        targetEl.style.removeProperty(prop);
      }
    });
  };
};

const hideExportControlsForLiveCapture = (rootEl) => {
  if (!(rootEl instanceof HTMLElement)) {
    return () => {};
  }
  const selectors = [
    '.card-export-btn',
    '.lineup-toggle-btn',
    '.song-mini-icon-btn',
    '.floating-menu-btn',
    '.nav-collapse-fab'
  ].join(', ');
  const nodes = Array.from(rootEl.querySelectorAll(selectors));
  const touched = [];
  nodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    touched.push({ node, display: node.style.display });
    node.style.display = 'none';
  });
  return () => {
    touched.forEach((entry) => {
      if (!(entry?.node instanceof HTMLElement)) return;
      entry.node.style.display = entry.display || '';
    });
  };
};

const shouldCaptureLiveElementForExport = (targetEl, options = {}) => {
  if (options?.captureLiveElement === true) return true;
  if (!(targetEl instanceof HTMLElement)) return false;
  return targetEl.classList.contains('lineup-card')
    || targetEl.classList.contains('support-card')
    || targetEl.classList.contains('attr-summary-card');
};

const forceSingleCardFillForLiveCapture = (targetEl) => {
  if (!(targetEl instanceof HTMLElement)) {
    return () => {};
  }
  const isSingleCard = targetEl.classList.contains('lineup-card')
    || targetEl.classList.contains('support-card')
    || targetEl.classList.contains('attr-summary-card');
  if (!isSingleCard) {
    return () => {};
  }

  const selectors = [
    '.lineup-card',
    '.support-card',
    '.attr-summary-card',
    '.lineup-member-cell',
    '.support-member-cell',
    '.related-last-card-thumb',
    '.interval-card-thumb'
  ];

  const collectNodesIncludingRoot = (rootEl, selector) => {
    const nodes = [];
    if (rootEl.matches(selector)) {
      nodes.push(rootEl);
    }
    nodes.push(...Array.from(rootEl.querySelectorAll(selector)));
    return nodes;
  };

  const touched = [];
  selectors.forEach((selector) => {
    const nodes = collectNodesIncludingRoot(targetEl, selector);
    nodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      touched.push({
        node,
        backgroundColor: node.style.getPropertyValue('background-color'),
        backgroundColorPriority: node.style.getPropertyPriority('background-color'),
        backgroundImage: node.style.getPropertyValue('background-image'),
        backgroundImagePriority: node.style.getPropertyPriority('background-image')
      });

      const fill = resolveSingleCardFillFromSource(node);
      if (fill) {
        node.style.setProperty('background-color', fill, 'important');
      }
      const computed = window.getComputedStyle(node);
      const bgImage = String(computed.backgroundImage || '').trim();
      if (bgImage && bgImage !== 'none') {
        node.style.setProperty('background-image', bgImage, 'important');
      }
    });
  });

  return () => {
    touched.forEach((entry) => {
      if (!(entry?.node instanceof HTMLElement)) return;
      if (entry.backgroundColor) {
        entry.node.style.setProperty('background-color', entry.backgroundColor, entry.backgroundColorPriority || '');
      } else {
        entry.node.style.removeProperty('background-color');
      }
      if (entry.backgroundImage) {
        entry.node.style.setProperty('background-image', entry.backgroundImage, entry.backgroundImagePriority || '');
      } else {
        entry.node.style.removeProperty('background-image');
      }
    });
  };
};

const runExportElementPng = async (id, title, options = {}) => {
  const previousIdle = await waitPendingCardCaptureRenderTask(1200);
  if (!previousIdle) {
    forceReleaseCardCaptureRenderTask();
  }

  const targetEl = typeof id === 'string' ? (resolveExportElementById(id) || document.getElementById(id)) : id;
  if (!targetEl) return setScreenshotModalState({ state: 'error', title: '错误', message: '未找到元素', cancelTask: null });

  const exportLabel = String(options?.taskLabel || title || '当前模块');
  const deviceTier = getCaptureDeviceTier();
  const captureLiveElement = shouldCaptureLiveElementForExport(targetEl, options);
  const cancelContext = createExportCancelContext();
  const exportStartAt = performance.now();
  const formatElapsed = () => `${Math.max(0, Math.round(performance.now() - exportStartAt))}ms`;

  setScreenshotModalState({
    state: 'capturing',
    title: '截图中',
    message: '[初始化] 正在准备捕获 ' + exportLabel,
    cancelTask: cancelContext.cancel
  });

  let cloneEl = null;
  let restoreFrozenCssVars = () => {};
  let restoreHiddenLiveControls = () => {};
  let restoreSingleCardFill = () => {};
  try {
    const sourceImages = Array.from(targetEl.querySelectorAll('img'));
    sourceImages.forEach((imgEl) => {
      if (!(imgEl instanceof HTMLImageElement)) return;
      imgEl.setAttribute('loading', 'eager');
      imgEl.setAttribute('decoding', 'sync');
      if ('fetchPriority' in imgEl) {
        imgEl.fetchPriority = 'high';
      }
    });

    await waitForRenderableAssets(targetEl, {
      maxWaitMs: deviceTier === 'phone' ? 3600 : 3000,
      maxImages: Math.max(120, Math.min(1200, sourceImages.length + 80))
    });
    await preloadImageUrlsForCapture(targetEl, {
      maxImages: Math.max(120, Math.min(900, sourceImages.length + 60)),
      concurrency: deviceTier === 'desktop' ? 12 : 6,
      timeoutMs: deviceTier === 'phone' ? 9000 : 7000
    });

    if (cancelContext.isCancelled()) {
      throw new Error('export-cancelled');
    }

    setScreenshotModalState({
      state: 'capturing',
      title: '截图中',
      message: captureLiveElement ? '[布局中] 正在使用页面实时布局...' : '[克隆中] 正在准备导出布局...',
      cancelTask: cancelContext.cancel
    });

    if (!captureLiveElement) {
      cloneEl = await prepareExportClone(targetEl);
    }
    const renderEl = cloneEl || targetEl;
    if (captureLiveElement) {
      restoreFrozenCssVars = freezeCssVariablesForCapture(renderEl);
      restoreHiddenLiveControls = hideExportControlsForLiveCapture(renderEl);
      restoreSingleCardFill = forceSingleCardFillForLiveCapture(renderEl);
    }

    const cloneImages = Array.from(renderEl.querySelectorAll('img'));
    cloneImages.forEach((imgEl) => {
      if (!(imgEl instanceof HTMLImageElement)) return;
      imgEl.setAttribute('loading', 'eager');
      imgEl.setAttribute('decoding', 'sync');
      if ('fetchPriority' in imgEl) {
        imgEl.fetchPriority = 'high';
      }
    });

    await waitForRenderableAssets(renderEl, {
      maxWaitMs: deviceTier === 'phone' ? 4200 : 3400,
      maxImages: Math.max(180, Math.min(1400, cloneImages.length + 120))
    });
    await preloadImageUrlsForCapture(renderEl, {
      maxImages: Math.max(180, Math.min(1200, cloneImages.length + 100)),
      concurrency: deviceTier === 'desktop' ? 12 : 6,
      timeoutMs: deviceTier === 'phone' ? 9000 : 7000
    });

    await waitNextPaint();

    if (cancelContext.isCancelled()) {
      throw new Error('export-cancelled');
    }

    const width = Math.max(1, Math.ceil(renderEl.scrollWidth || renderEl.clientWidth || 0));
    const height = Math.max(1, Math.ceil(renderEl.scrollHeight || renderEl.clientHeight || 0));
    const heavyMediaCount = countHeavyMediaNodes(renderEl);
    const pixelRatioPlan = buildCapturePixelRatioPlan(deviceTier);
    let canvas = null;
    let lastRenderError = null;

    for (let attemptIdx = 0; attemptIdx < pixelRatioPlan.length; attemptIdx += 1) {
      const pixelRatio = pixelRatioPlan[attemptIdx];
      const canvasWidth = Math.max(1, Math.round(width * pixelRatio));
      const canvasHeight = Math.max(1, Math.round(height * pixelRatio));
      const renderTimeoutMs = Math.min(
        56000,
        Math.max(12000, Math.round(computeRenderTimeoutMs({
          deviceTier,
          heavyMediaCount,
          width,
          height,
          scale: pixelRatio
        }) * (1.35 + (attemptIdx * 0.25))))
      );

      setScreenshotModalState({
        state: 'capturing',
        title: '截图中',
        message: `[渲染中] ${exportLabel}（${width}x${height}，像素比 x${pixelRatio.toFixed(2)}，尝试 ${attemptIdx + 1}/${pixelRatioPlan.length}）`,
        cancelTask: cancelContext.cancel
      });

      try {
        const renderTask = trackCardCaptureRenderTask(toCanvas(renderEl, {
          backgroundColor: '#ffffff',
          width,
          height,
          canvasWidth,
          canvasHeight,
          pixelRatio: 1,
          skipFonts: false,
          cacheBust: false,
          skipAutoScale: true,
          imagePlaceholder: CAPTURE_IMAGE_PLACEHOLDER,
          filter: (node) => {
            if (node.classList && node.classList.contains('nav-cutoff-controls')) {
              return false;
            }
            return true;
          }
        }));

        canvas = await withRenderTimeout(renderTask, renderTimeoutMs, cancelContext.cancelPromise);
        if (canvas) break;
      } catch (renderError) {
        lastRenderError = renderError;
        if (isExportCancelledError(renderError)) {
          throw renderError;
        }
        if (isRenderTimeoutError(renderError)) {
          forceReleaseCardCaptureRenderTask();
        }
        if (isEventLikeCaptureError(renderError)) {
          hideTransientMediaForCapture(renderEl);
          await preloadImageUrlsForCapture(renderEl, {
            maxImages: 520,
            concurrency: 4,
            timeoutMs: 9000
          });
          await waitNextPaint();
        }
      }
    }

    if (!canvas) {
      throw lastRenderError || new Error('toCanvas returned null');
    }

    setScreenshotModalState({
      state: 'exporting',
      title: '导出图片',
      message: '[编码中] 正在生成 PNG 文件...',
      cancelTask: cancelContext.cancel
    });

    const ts = typeof formatExportTimestamp === 'function' ? formatExportTimestamp() : Date.now();
    const safeTitle = typeof sanitizeExportFileName === 'function' ? sanitizeExportFileName(`${title}_${ts}`) : `${title}_${ts}`;

    if (typeof triggerDownloadPng === 'function') {
      await triggerDownloadPng(canvas, safeTitle);
    } else {
      canvas.toBlob(blob => {
        if(!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = safeTitle + ".png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    setScreenshotModalState({
      state: 'success',
      title: '导出成功',
      message: `【${exportLabel}】已导出 PNG（耗时 ${formatElapsed()}）`,
      cancelTask: null,
      autoCloseMs: 1400
    });
  } catch (error) {
    if (isExportCancelledError(error)) {
      setScreenshotModalState({
        state: 'idle',
        title: '',
        message: '',
        cancelTask: null
      });
      return;
    }
    if (isRenderTimeoutError(error)) {
      forceReleaseCardCaptureRenderTask();
    }
    const detail = getCaptureErrorText(error);
    console.error('导出失败:', error);
    setScreenshotModalState({
      state: 'failed',
      title: '截图失败',
      message: '[失败] 导出发生错误: ' + detail.text,
      retryTask: typeof options?.retryTask === 'function' ? options.retryTask : null,
      cancelTask: null
    });
  } finally {
    restoreFrozenCssVars();
    restoreHiddenLiveControls();
    restoreSingleCardFill();
    if (screenshotModalCancelTask.value === cancelContext.cancel) {
      screenshotModalCancelTask.value = null;
    }
    if (cloneEl) {
      const cloneHost = cloneEl.parentNode;
      if (cloneHost instanceof HTMLElement && cloneHost.classList.contains('export-clone-host')) {
        cloneHost.remove();
      } else if (cloneEl.parentNode) {
        cloneEl.parentNode.removeChild(cloneEl);
      }
    }
  }
};

const exportElementPng = async (id, title) => {
  await runExportElementPng(id, title);
};

const matrixGroupClass = (idx, len) => ({
  'matrix-group-start': idx === 0,
  'matrix-group-end': idx === len - 1
});

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
    sectionObserver = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        scheduleNavSync();
      }
    }, {
      root: observerRoot,
      rootMargin: '-10% 0px -75% 0px',
      threshold: [0, 0.01, 0.1]
    });
  } catch (_) {
    sectionObserver = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        scheduleNavSync();
      }
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

const syncRelatedJumpChipWidths = () => {
  const panel = document.getElementById('panel-related');
  if (!(panel instanceof HTMLElement)) return;
  const blocks = panel.querySelectorAll('.record-block');
  blocks.forEach((blockEl) => {
    if (!(blockEl instanceof HTMLElement)) return;
    const buttons = blockEl.querySelectorAll('.jump-link');
    if (!buttons.length) {
      blockEl.style.removeProperty('--record-jump-chip-width');
      return;
    }

    let maxWidth = 0;
    buttons.forEach((btnEl) => {
      if (!(btnEl instanceof HTMLButtonElement)) return;
      const prevWidth = btnEl.style.width;
      const prevMinWidth = btnEl.style.minWidth;
      const prevMaxWidth = btnEl.style.maxWidth;
      btnEl.style.width = 'auto';
      btnEl.style.minWidth = '0';
      btnEl.style.maxWidth = 'none';
      const measured = Math.ceil(btnEl.getBoundingClientRect().width);
      if (measured > maxWidth) maxWidth = measured;
      btnEl.style.width = prevWidth;
      btnEl.style.minWidth = prevMinWidth;
      btnEl.style.maxWidth = prevMaxWidth;
    });

    if (maxWidth > 0) {
      blockEl.style.setProperty('--record-jump-chip-width', `${maxWidth}px`);
    }
  });
};

const scheduleRelatedJumpChipWidthSync = () => {
  if (relatedJumpChipSyncRaf) return;
  relatedJumpChipSyncRaf = requestAnimationFrame(() => {
    relatedJumpChipSyncRaf = 0;
    syncRelatedJumpChipWidths();
  });
};

const bindRelatedJumpChipObservers = () => {
  if (relatedJumpResizeObserver) {
    relatedJumpResizeObserver.disconnect();
    relatedJumpResizeObserver = null;
  }
  if (relatedJumpMutationObserver) {
    relatedJumpMutationObserver.disconnect();
    relatedJumpMutationObserver = null;
  }

  const panel = document.getElementById('panel-related');
  if (!(panel instanceof HTMLElement)) return;

  if (typeof ResizeObserver !== 'undefined') {
    relatedJumpResizeObserver = new ResizeObserver(() => {
      scheduleRelatedJumpChipWidthSync();
    });
    relatedJumpResizeObserver.observe(panel);
  }

  if (typeof MutationObserver !== 'undefined') {
    relatedJumpMutationObserver = new MutationObserver(() => {
      scheduleRelatedJumpChipWidthSync();
    });
    relatedJumpMutationObserver.observe(panel, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  scheduleRelatedJumpChipWidthSync();
};

onMounted(() => {
  updateMobileNavState();
  window.addEventListener('resize', updateMobileNavState);
  bindViewportScrollTracking();
  const localRoot = cardStatsRootRef.value;
  const statsMain = localRoot instanceof HTMLElement ? localRoot.querySelector('.stats-main') : null;
  if (statsMain instanceof HTMLElement) {
    statsMainInteractionHost = statsMain;
    statsMainInteractionHost.addEventListener('pointerdown', rememberInteractiveAnchorFromEvent, true);
    statsMainInteractionHost.addEventListener('keydown', rememberInteractiveAnchorFromEvent, true);
  }
  scheduleNavSync();
  bindSectionObserver();
  nextTick(() => {
    bindRelatedJumpChipObservers();
    bindLineupCardModeLayoutObserver();
    triggerLineupCardModeRowLayoutSyncBurst();
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateMobileNavState);
  if (typeof screenshotModalCancelTask.value === 'function') {
    screenshotModalCancelTask.value();
  }
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
  if (navSyncRaf) {
    cancelAnimationFrame(navSyncRaf);
    navSyncRaf = 0;
  }
  if (relatedJumpChipSyncRaf) {
    cancelAnimationFrame(relatedJumpChipSyncRaf);
    relatedJumpChipSyncRaf = 0;
  }
  if (lineupCardLayoutSyncRaf) {
    cancelAnimationFrame(lineupCardLayoutSyncRaf);
    lineupCardLayoutSyncRaf = 0;
  }
  if (lineupCardLayoutSyncTimer) {
    clearTimeout(lineupCardLayoutSyncTimer);
    lineupCardLayoutSyncTimer = 0;
  }
  if (lineupCardLayoutResizeObserver) {
    lineupCardLayoutResizeObserver.disconnect();
    lineupCardLayoutResizeObserver = null;
  }
  if (lineupCardLayoutMutationObserver) {
    lineupCardLayoutMutationObserver.disconnect();
    lineupCardLayoutMutationObserver = null;
  }
  if (relatedJumpResizeObserver) {
    relatedJumpResizeObserver.disconnect();
    relatedJumpResizeObserver = null;
  }
  if (relatedJumpMutationObserver) {
    relatedJumpMutationObserver.disconnect();
    relatedJumpMutationObserver = null;
  }
  if (sectionObserver) sectionObserver.disconnect();
  clearScreenshotModalAutoClose();
  screenshotModalRetryTask.value = null;
  screenshotModalCancelTask.value = null;
  if (matrixSortAnchorTimer) {
    clearTimeout(matrixSortAnchorTimer);
    matrixSortAnchorTimer = 0;
  }
});

const normalizeAttr = (attr) => {
  const map = {
    pure: 'Pure',
    cool: 'Cool',
    cute: 'Cute',
    happy: 'Happy',
    mysterious: 'Mysterious'
  };
  return map[String(attr || '').trim().toLowerCase()] || '';
};

const isNumericEventId = (eventId) => /^\d+$/.test(String(eventId || '').trim());

const isCardWithinLimit = (card, maxEid) => {
  const eid = String(card?.EventID || '').trim();
  if (eid === 'ori') return true;
  if (isNumericEventId(eid)) return Number(eid) <= Number(maxEid);
  return true;
};

const isEventRewardCard = (card) => {
  const rarity = String(card?.Rarity || '').trim();
  if (!['2', '3'].includes(rarity)) return false;
  // 默认按活动卡计算报酬；勾选后额外计入联动二/三星。
  if (isNumericEventId(card?.EventID)) return true;
  if (!includeCollabRewardCards.value) return false;
  return String(card?.Type || '').trim().toLowerCase() === 'collab';
};

const setBanEventTypeFilter = (targetType, checked) => {
  if (checked) {
    banEventTypeFilter.value = targetType;
    return;
  }
  if (banEventTypeFilter.value === targetType) {
    banEventTypeFilter.value = 'all';
  }
};

const setBannerEventTypeFilter = (targetType, checked) => {
  if (checked) {
    bannerEventTypeFilter.value = targetType;
    return;
  }
  if (bannerEventTypeFilter.value === targetType) {
    bannerEventTypeFilter.value = 'all';
  }
};

const setLimitedBanEventTypeFilter = (targetType, checked) => {
  if (checked) {
    limitedBanEventTypeFilter.value = targetType;
    return;
  }
  if (limitedBanEventTypeFilter.value === targetType) {
    limitedBanEventTypeFilter.value = 'all';
  }
};

const setFesLimitedBanEventTypeFilter = (targetType, checked) => {
  if (checked) {
    fesLimitedBanEventTypeFilter.value = targetType;
    return;
  }
  if (fesLimitedBanEventTypeFilter.value === targetType) {
    fesLimitedBanEventTypeFilter.value = 'all';
  }
};

const limitedBanCountMap = computed(() => {
  const map = {};
  const maxEid = safeMaxEventId.value;
  const typeFilter = limitedBanEventTypeFilter.value;

  (props.allEvents || []).forEach((ev) => {
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (eid > maxEid) return;

    const eventType = String(ev?.event_type || '').trim();
    if (typeFilter !== 'all' && eventType !== typeFilter) return;

    if (String(ev?.gacha_type || '').trim() !== '普通限定') return;

    const bannerName = normalizeBannerName(ev?.banner);
    if (!CHAR_ORDER[bannerName]) return;
    if (VS_NAMES.includes(bannerName)) return;
    map[bannerName] = (map[bannerName] || 0) + 1;
  });

  return map;
});

const limitedBanLastEventIdMap = computed(() => {
  const map = {};
  const maxEid = safeMaxEventId.value;
  const typeFilter = limitedBanEventTypeFilter.value;

  (props.allEvents || []).forEach((ev) => {
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (eid > maxEid) return;

    const eventType = String(ev?.event_type || '').trim();
    if (typeFilter !== 'all' && eventType !== typeFilter) return;

    if (String(ev?.gacha_type || '').trim() !== '普通限定') return;

    const bannerName = normalizeBannerName(ev?.banner);
    if (!CHAR_ORDER[bannerName]) return;
    if (VS_NAMES.includes(bannerName)) return;
    map[bannerName] = Math.max(Number(map[bannerName] || 0), eid);
  });

  return map;
});

const fesLimitedEventIdSet = computed(() => {
  const maxEid = safeMaxEventId.value;
  const fesEventIds = new Set();
  const result = new Set();

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinLimit(card, maxEid)) return;
    const eidRaw = String(card?.EventID || '').trim();
    if (!isNumericEventId(eidRaw)) return;
    const type = String(card?.Type || '').trim().toLowerCase();
    if (isFesCardType(type)) {
      fesEventIds.add(Number(eidRaw));
    }
  });

  (props.allEvents || []).forEach((ev) => {
    if (shouldSkipPredictEvent(ev)) return;
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (eid > maxEid) return;
    if (String(ev?.gacha_type || '').trim() !== '普通限定') return;
    if (!fesEventIds.has(eid)) return;
    result.add(eid);
  });

  return result;
});

const fesLimitedBanCountMap = computed(() => {
  const map = {};
  const targetEventIds = fesLimitedEventIdSet.value;
  const typeFilter = fesLimitedBanEventTypeFilter.value;
  if (!targetEventIds.size) return map;

  (props.allEvents || []).forEach((ev) => {
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (!targetEventIds.has(eid)) return;

    const eventType = String(ev?.event_type || '').trim();
    if (typeFilter !== 'all' && eventType !== typeFilter) return;

    const bannerName = normalizeBannerName(ev?.banner);
    if (!CHAR_ORDER[bannerName]) return;
    if (VS_NAMES.includes(bannerName)) return;
    map[bannerName] = (map[bannerName] || 0) + 1;
  });

  return map;
});

const fesLimitedBanLastEventIdMap = computed(() => {
  const map = {};
  const targetEventIds = fesLimitedEventIdSet.value;
  const typeFilter = fesLimitedBanEventTypeFilter.value;
  if (!targetEventIds.size) return map;

  (props.allEvents || []).forEach((ev) => {
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (!targetEventIds.has(eid)) return;

    const eventType = String(ev?.event_type || '').trim();
    if (typeFilter !== 'all' && eventType !== typeFilter) return;

    const bannerName = normalizeBannerName(ev?.banner);
    if (!CHAR_ORDER[bannerName]) return;
    if (VS_NAMES.includes(bannerName)) return;
    map[bannerName] = Math.max(Number(map[bannerName] || 0), eid);
  });

  return map;
});

const bannerCountMap = computed(() => {
  const map = {};
  const maxEid = safeMaxEventId.value;
  const typeFilter = bannerEventTypeFilter.value;

  (props.allEvents || []).forEach((ev) => {
    if (shouldSkipPredictEvent(ev)) return;
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (eid > maxEid) return;

    const eventType = String(ev?.event_type || '').trim();
    if (!['箱活', '混活'].includes(eventType)) return;
    if (typeFilter !== 'all' && eventType !== typeFilter) return;

    const bannerName = normalizeBannerName(ev?.banner);
    if (!CHAR_ORDER[bannerName]) return;
    if (VS_NAMES.includes(bannerName)) return;
    map[bannerName] = (map[bannerName] || 0) + 1;
  });

  return map;
});

const bannerLastEventIdMap = computed(() => {
  const map = {};
  const maxEid = safeMaxEventId.value;
  const typeFilter = bannerEventTypeFilter.value;

  (props.allEvents || []).forEach((ev) => {
    if (shouldSkipPredictEvent(ev)) return;
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (eid > maxEid) return;

    const eventType = String(ev?.event_type || '').trim();
    if (!['箱活', '混活'].includes(eventType)) return;
    if (typeFilter !== 'all' && eventType !== typeFilter) return;

    const bannerName = normalizeBannerName(ev?.banner);
    if (!CHAR_ORDER[bannerName]) return;
    if (VS_NAMES.includes(bannerName)) return;
    map[bannerName] = Math.max(Number(map[bannerName] || 0), eid);
  });

  return map;
});

const now = new Date();
const nowStr = now.toLocaleDateString();

const toFiniteEventId = (value) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n > 0 ? n : null;
};


// 3. 自动计算“当前实际活动”的 ID (作为默认值)
const autoCurrentId = computed(() => {
  const today = new Date();
  const numericIds = (props.allEvents || [])
    .filter((ev) => {
      if (ev?.isPredict) return false;
      if (!isNumericEventId(ev?.id)) return false;
      const evDate = parseDateSafe(ev?.date);
      if (!evDate) return false;
      return evDate <= today;
    })
    .map((e) => Number(e.id));

  return numericIds.length > 0 ? Math.max(...numericIds) : 0;
});
// 4. 最终使用的截止 ID：如果用户没手动改过，就用自动计算的
const displayEventId = computed({
  get: () => {
    const syncId = toFiniteEventId(props.previewSyncEventId);
    const preferred = syncId ?? manualEventId.value ?? autoCurrentId.value;
    const n = toFiniteEventId(preferred);
    return n ?? 0;
  },
  set: (val) => {
    const n = toFiniteEventId(val);
    manualEventId.value = n ?? null;
  }
});

const updateDisplayEventIdDraft = () => {
  if (isEditingDisplayEventId.value) return;
  const n = toFiniteEventId(displayEventId.value);
  displayEventIdDraft.value = n == null ? '' : String(n);
};

const onDisplayEventIdFocus = () => {
  isEditingDisplayEventId.value = true;
};

const onDisplayEventIdInput = (rawVal) => {
  displayEventIdDraft.value = String(rawVal ?? '');
  const n = toFiniteEventId(displayEventIdDraft.value);
  manualEventId.value = n ?? null;
};

const adjustDisplayEventId = (delta) => {
  const cur = toFiniteEventId(displayEventIdDraft.value)
    ?? toFiniteEventId(displayEventId.value)
    ?? toFiniteEventId(autoCurrentId.value)
    ?? 1;
  const next = Math.max(1, Number(cur) + Number(delta || 0));
  manualEventId.value = next;
  displayEventIdDraft.value = String(next);
  isEditingDisplayEventId.value = false;
};

const onDisplayEventIdBlur = () => {
  isEditingDisplayEventId.value = false;
  const n = toFiniteEventId(displayEventIdDraft.value);
  manualEventId.value = n ?? null;
  updateDisplayEventIdDraft();
};

const getTopBarState = () => ({
  displayEventId: Number(displayEventId.value || 0),
  displayEventIdDraft: String(displayEventIdDraft.value || ''),
  autoCurrentId: Number(autoCurrentId.value || 0),
  navCollapsed: !!navCollapsed.value,
  isNavTopLayout: !!isNavTopLayout.value
});

const setTopBarDisplayEventIdDraft = (rawVal) => {
  displayEventIdDraft.value = String(rawVal ?? '');
  const n = toFiniteEventId(displayEventIdDraft.value);
  manualEventId.value = n ?? null;
};

const applyTopBarDisplayEventId = (rawVal) => {
  if (rawVal !== undefined) {
    displayEventIdDraft.value = String(rawVal ?? '');
  }
  const n = toFiniteEventId(displayEventIdDraft.value);
  manualEventId.value = n ?? null;
  isEditingDisplayEventId.value = false;
  updateDisplayEventIdDraft();
  return Number(displayEventId.value || 0);
};

const adjustTopBarDisplayEventId = (delta) => {
  adjustDisplayEventId(delta);
  return Number(displayEventId.value || 0);
};

const resetTopBarDisplayEventId = () => {
  manualEventId.value = null;
  isEditingDisplayEventId.value = false;
  updateDisplayEventIdDraft();
  return Number(displayEventId.value || 0);
};

const toggleTopBarNavCollapsed = () => {
  setNavCollapsed(!navCollapsed.value);
  return !!navCollapsed.value;
};

watch(displayEventId, () => {
  updateDisplayEventIdDraft();
}, { immediate: true });

watch(navCollapsed, () => {
  triggerLineupCardModeRowLayoutSyncBurst();
});

const safeMaxEventId = computed(() => {
  const n = toFiniteEventId(displayEventId.value);
  return n ?? 0;
});

const includePredictEventsInStats = computed(() => Number(safeMaxEventId.value) > Number(autoCurrentId.value));

const shouldSkipPredictEvent = (ev) => !!(ev?.isPredict && !includePredictEventsInStats.value);

const allEventsById = computed(() => {
  const map = {};
  (props.allEvents || []).forEach((ev) => {
    if (!isNumericEventId(ev?.id)) return;
    map[Number(ev.id)] = ev;
  });
  return map;
});

const referenceDateObj = computed(() => {
  const fallback = new Date();
  const maxEid = Number(safeMaxEventId.value);
  if (!Number.isFinite(maxEid) || maxEid <= 0) return fallback;
  if (maxEid === Number(autoCurrentId.value)) return fallback;

  const refEvent = allEventsById.value[maxEid];
  const refDate = parseDateSafe(refEvent?.date);
  return refDate || fallback;
});

const referenceDateStr = computed(() => {
  const d = referenceDateObj.value;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
});

const eventsById = computed(() => {
  const map = {};
  (props.allEvents || []).forEach((ev) => {
    if (shouldSkipPredictEvent(ev)) return;
    if (!isNumericEventId(ev?.id)) return;
    map[Number(ev.id)] = ev;
  });
  return map;
});

const validPeriodEventIds = computed(() => {
  const maxEid = safeMaxEventId.value;
  return (props.allEvents || [])
    .filter((ev) => {
      if (shouldSkipPredictEvent(ev)) return false;
      if (!isNumericEventId(ev?.id)) return false;
      if (Number(ev.id) > maxEid) return false;
      return !EXCLUDED_PERIOD_EVENT_TYPES.has(String(ev?.event_type || '').trim());
    })
    .map((ev) => Number(ev.id))
    .sort((a, b) => a - b);
});

const validPeriodEvents = computed(() => {
  const idSet = new Set(validPeriodEventIds.value);
  return (props.allEvents || [])
    .filter((ev) => {
      if (shouldSkipPredictEvent(ev)) return false;
      if (!isNumericEventId(ev?.id)) return false;
      return idSet.has(Number(ev.id));
    })
    .map((ev) => ({
      id: Number(ev.id),
      dateObj: parseDateSafe(ev.date)
    }))
    .filter((ev) => ev.dateObj)
    .sort((a, b) => a.id - b.id);
});

const countPeriodsBetweenExclusive = (startEvent, endEvent) => {
  const startId = Number(startEvent?.id);
  const endId = Number(endEvent?.id);
  if (Number.isFinite(startId) && Number.isFinite(endId)) {
    return validPeriodEventIds.value.filter((id) => id > startId && id < endId).length;
  }

  const startDate = parseDateSafe(startEvent?.date);
  const endDate = parseDateSafe(endEvent?.date);
  if (!startDate || !endDate) return 0;
  return validPeriodEvents.value.filter((ev) => ev.dateObj > startDate && ev.dateObj < endDate).length;
};

const countPeriodsSince = (eventRef) => {
  const eventId = Number(eventRef?.id ?? eventRef);
  const maxEid = Number(displayEventId.value);
  if (Number.isFinite(eventId)) {
    return validPeriodEventIds.value.filter((id) => id > eventId && id <= maxEid).length;
  }

  const startDate = parseDateSafe(eventRef?.date);
  if (!startDate) return 0;
  return validPeriodEvents.value.filter((ev) => ev.dateObj > startDate).length;
};

const LINEUP_SKILL_BASE = Object.freeze({
  bfes_up: 160,
  cfes: 140,
  p_score: 130,
  score_up: 120,
  accuracy: 100,
  recovery: 100,
  unit_score: 100,
  default: 120
});
const LINEUP_ATTR_BG = Object.freeze({
  Cool: '#4b48e9',
  Cute: '#f35c9b',
  Pure: '#17a159',
  Happy: '#ff8719',
  Mysterious: '#8e65c2'
});
const LINEUP_BASE_ALPHA = 0.15;
const LINEUP_FES_ALPHA = Object.freeze({ cfes: 0.2, bfes: 0.35 });
// NOTE(wl-heuristic-2026-04): WL 计算为了移动端性能，当前强制“VS只看原v”，
// 并把 OC 的候选卡裁剪为 BFES/团分（unit_score，按150视作稳定触发）。
// 若后续出现高倍率的非原v/CFES/P分卡，再回退这组筛选即可。
const WL_OC_UNIT_SCORE_BASE = 150;
const WL_OC_ALLOWED_SKILLS = new Set(['bfes_up', 'unit_score']);
const WL_OC_FALLBACK_SKILLS = new Set(['bfes_up', 'unit_score', 'p_score', 'score_up', 'default']);

const makeLineupFesBg = (alpha) => {
  const a = Math.max(0, Math.min(1, Number(alpha)));
  return `linear-gradient(45deg, rgba(253,124,193,${a}) 0%, rgba(135,192,255,${a}) 50%, rgba(248,255,135,${a}) 100%)`;
};

const getCardBaseName = (cardName) => String(cardName || '').trim().split(/\s+/)[0] || '';

const getLineupCardId = (name) => `lineup-card-${getCharAbbr(name).toLowerCase()}`;
const getSupportCardId = (unit) => `support-card-${String(unit || '').toLowerCase()}`;
const getAttrSummaryCardId = (name) => `attr-summary-${getCharAbbr(name).toLowerCase()}`;

const getSupportMemberIconKey = (slot) => {
  const baseName = String(slot?.name || '').trim().split(/\s+/)[0] || '';
  if (!baseName) return '';

  const baseAbbr = CHAR_MAP[baseName] || getCharAbbr(baseName);
  if (!VS_NAMES.includes(baseName)) return baseAbbr;

  const unit = String(slot?.unit || '').trim().toLowerCase();
  if (unit && unit !== 'vs') return `${String(baseAbbr).toLowerCase()}_${unit}`;
  return baseAbbr;
};

const getCharSingleMark = (name) => {
  const key = String(name || '').split(/\s+/)[0];
  return CHAR_SINGLE_MAP[key] || key;
};

const useSingleNameMark = computed(() => isMobileNav.value || navNameFormat.value === 'single');

const getDistNameLabel = (name) => {
  if (useSingleNameMark.value) return getCharSingleMark(name);
  return getCharAbbr(name);
};

const getLineupCardUnit = (card, baseName) => {
  if (isVirtualSinger(baseName)) {
    const aff = String(card?.Affiliation || '').trim().toLowerCase();
    if (aff && UNIT_COLORS[aff]) return aff;
    return 'vs';
  }
  return CHAR_UNIT_MAP[baseName] || 'vs';
};

const getLineupSkillInfo = (card) => {
  const skill = String(card?.Skill || '').trim().toLowerCase();
  const type = String(card?.Type || '').trim().toLowerCase();

  if (skill === 'bfes_up' || type === 'bfes') {
    return { kind: 'bfes_up', baseScore: LINEUP_SKILL_BASE.bfes_up, isUnitScore: false };
  }
  if (skill.startsWith('cfes') || type === 'cfes') {
    return { kind: 'cfes', baseScore: LINEUP_SKILL_BASE.cfes, isUnitScore: false };
  }
  if (skill === 'p_score') {
    return { kind: 'p_score', baseScore: LINEUP_SKILL_BASE.p_score, isUnitScore: false };
  }
  if (skill === 'score_up') {
    return { kind: 'score_up', baseScore: LINEUP_SKILL_BASE.score_up, isUnitScore: false };
  }
  if (skill === 'accuracy') {
    return { kind: 'accuracy', baseScore: LINEUP_SKILL_BASE.accuracy, isUnitScore: false };
  }
  if (skill === 'recovery') {
    return { kind: 'recovery', baseScore: LINEUP_SKILL_BASE.recovery, isUnitScore: false };
  }
  if (skill === 'unit_score') {
    return { kind: 'unit_score', baseScore: LINEUP_SKILL_BASE.unit_score, isUnitScore: true };
  }
  return { kind: 'default', baseScore: LINEUP_SKILL_BASE.default, isUnitScore: false };
};

const buildLineupEventRef = (card) => {
  const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
  const cardType = String(card?.Type || '').trim().toLowerCase();
  const skillKind = String(card?.Skill || '').trim().toLowerCase();
  const fesType = cardType === 'bfes' || cardType === 'cfes'
    ? cardType
    : (skillKind === 'bfes_up' ? 'bfes' : (skillKind.startsWith('cfes') ? 'cfes' : ''));
  const isFesCard = isFesCardType(cardType) || !!fesType;

  const attachFesMeta = (eventRef) => ({
    ...eventRef,
    isFesCard,
    fesType
  });

  if (!sourceKey) {
    return { eventRef: null, eventLabel: '-' };
  }
  if (!isNumericEventId(sourceKey)) {
    const label = SPECIAL_EVENT_KEY_LABELS[sourceKey] || sourceKey;
    return {
      eventRef: attachFesMeta({
        id: sourceKey,
        sourceKey,
        date: String(card?.Date || '').trim()
      }),
      eventLabel: label
    };
  }
  const ev = eventsById.value[Number(sourceKey)];
  if (!ev) {
    if (Number(sourceKey) === 0) {
      return {
        eventRef: attachFesMeta({ id: 0, sourceKey: '0', date: String(card?.Date || '').trim() }),
        eventLabel: '开服'
      };
    }
    return {
      eventRef: attachFesMeta({ id: Number(sourceKey), sourceKey, date: String(card?.Date || '').trim() }),
      eventLabel: `ID ${sourceKey}`
    };
  }
  const eventRef = {
    id: Number(ev.id),
    date: ev.date,
    typeSeriesId: ev.type_series_id,
    eventType: String(ev.event_type || '').trim(),
    banner: String(ev.banner || '').trim(),
    unit: String(ev.unit || '').trim(),
    sourceKey: String(ev.id)
  };
  return { eventRef: attachFesMeta(eventRef), eventLabel: getNonBanEventMark(eventRef) };
};

const getLineupEventMark = (eventRef, useSingleMark = false) => {
  if (!eventRef) return '-';
  const sourceKey = String(eventRef.sourceKey || eventRef.id || '').trim();
  if (!sourceKey) return '-';
  if (sourceKey === '0') return '开服';
  if (!isNumericEventId(sourceKey)) {
    return SPECIAL_EVENT_KEY_LABELS[sourceKey] || sourceKey;
  }

  const typeSeries = getTypeSeriesText(eventRef.typeSeriesId);
  const eventType = String(eventRef.eventType || '').trim();
  const shortType = getEventTypeShort(eventType);

  if (useSingleMark && (eventType === 'World Link' || eventType === 'World Link终章')) {
    if (eventType === 'World Link' && Number(typeSeries) === 3) {
      return eventRef.isFesCard ? 'wl3(fes)' : 'wl3';
    }
    const base = typeSeries ? `wl${typeSeries}` : 'wl';
    return eventRef.isFesCard ? `${base}(fes)` : base;
  }

  const bannerName = normalizeBannerName(eventRef.banner);
  const bannerMark = bannerName
    ? (useSingleMark ? getCharSingleMark(bannerName) : getCharAbbr(bannerName).toLowerCase())
    : '';
  const unitMark = String(eventRef.unit || '').trim().toLowerCase();

  if (eventType === 'World Link' || eventType === 'World Link终章') {
    if (eventType === 'World Link' && Number(typeSeries) === 3) {
      const base = `wl3${getWl3PartSuffix(eventRef)}`;
      return eventRef.isFesCard ? `${base}(fes)` : base;
    }
    const wlHead = bannerMark || unitMark || 'vs';
    const base = typeSeries ? `${wlHead} wl${typeSeries}` : `${wlHead} wl`;
    return eventRef.isFesCard ? `${base}(fes)` : base;
  }

  let base = '?';
  if (bannerMark && typeSeries) base = `${bannerMark}${typeSeries}${shortType}`;
  else if (bannerMark) base = `${bannerMark}${shortType}`;
  else if (unitMark && typeSeries) base = `${unitMark}${typeSeries}${shortType}`;
  else if (typeSeries) base = `${typeSeries}${shortType}`;
  else base = sourceKey;

  return eventRef.isFesCard ? `${base}(fes)` : base;
};

const getFesJumpLabel = (eventRef) => {
  const fesType = String(eventRef?.fesType || '').trim().toLowerCase();
  if (fesType === 'cfes') return 'CFES';
  if (fesType === 'bfes') return 'BFES';
  return 'FES';
};

const getJumpLinkLabel = (eventRef, fallback = '-') => {
  if (!eventRef) return fallback || '-';
  if (eventRef?.isFesCard) return getFesJumpLabel(eventRef);
  const mark = getLineupEventMark(eventRef, useSingleNameMark.value);
  return mark || fallback || '-';
};

const calcLineupUnitScore = (unit, unitCountMap) => {
  const selfIncluded = Number(unitCountMap[unit] || 0);
  const others = Math.max(0, selfIncluded - 1);
  const bonus = (others * 10) + (others === 4 ? 10 : 0);
  return 100 + bonus;
};

const evalLineupMembers = (cards) => {
  const unitCountMap = cards.reduce((map, card) => {
    map[card.unit] = Number(map[card.unit] || 0) + 1;
    return map;
  }, {});

  const members = cards.map((card) => {
    const score = card.isUnitScore ? calcLineupUnitScore(card.unit, unitCountMap) : card.baseScore;
    return {
      ...card,
      score
    };
  });

  const baseTotal = members.reduce((sum, m) => sum + m.score, 0);
  const captainBonus = members.length ? Math.max(...members.map((m) => m.score)) : 0;
  return { total: baseTotal + captainBonus, members };
};

const getEventRefRecencyScore = (eventRef) => {
  const dateText = String(eventRef?.date || '').trim();
  const dateObj = parseDateSafe(dateText);
  if (dateObj) return dateObj.getTime();

  const sourceKey = String(eventRef?.sourceKey || eventRef?.id || '').trim();
  if (isNumericEventId(sourceKey)) return Number(sourceKey);
  return 0;
};

const compareMemberFreshness = (nextMembers, bestMembers) => {
  const normalize = (members) => {
    return [...(members || [])]
      .map((item) => ({
        recency: getEventRefRecencyScore(item?.eventRef),
        cardId: Number(String(item?.cardId || '').trim()) || 0
      }))
      .sort((a, b) => {
        if (b.recency !== a.recency) return b.recency - a.recency;
        return b.cardId - a.cardId;
      });
  };

  const next = normalize(nextMembers);
  const best = normalize(bestMembers);
  const size = Math.max(next.length, best.length);

  for (let i = 0; i < size; i += 1) {
    const n = next[i] || { recency: 0, cardId: 0 };
    const b = best[i] || { recency: 0, cardId: 0 };
    if (n.recency !== b.recency) return n.recency - b.recency;
    if (n.cardId !== b.cardId) return n.cardId - b.cardId;
  }

  return 0;
};

const compareLineupSolvedHit = (nextHit, bestHit) => {
  if (!bestHit) return true;
  if (nextHit.total !== bestHit.total) return nextHit.total > bestHit.total;

  const nextBfes = nextHit.members.filter((m) => m.fesKind === 'bfes').length;
  const bestBfes = bestHit.members.filter((m) => m.fesKind === 'bfes').length;
  if (nextBfes !== bestBfes) return nextBfes > bestBfes;

  const nextCfes = nextHit.members.filter((m) => m.fesKind === 'cfes').length;
  const bestCfes = bestHit.members.filter((m) => m.fesKind === 'cfes').length;
  if (nextCfes !== bestCfes) return nextCfes > bestCfes;

  const freshnessDiff = compareMemberFreshness(nextHit.members, bestHit.members);
  if (freshnessDiff !== 0) return freshnessDiff > 0;
  return false;
};

const solveSingleCharLineup = (cards) => {
  const source = [...(cards || [])];
  if (!source.length) return null;

  const teamSize = Math.min(5, source.length);
  let best = null;
  const selected = [];

  const dfs = (startIdx) => {
    const need = teamSize - selected.length;
    if (need === 0) {
      const hit = evalLineupMembers(selected);
      if (compareLineupSolvedHit(hit, best)) {
        best = hit;
      }
      return;
    }

    for (let i = startIdx; i <= source.length - need; i += 1) {
      selected.push(source[i]);
      dfs(i + 1);
      selected.pop();
    }
  };

  dfs(0);
  return best;
};

const buildLineupPlan = (captainName, attr, attrPool) => {
  const cards = [...(attrPool?.[attr]?.[captainName] || [])];
  const solved = solveSingleCharLineup(cards);
  if (!solved) return null;

  const orderedMembers = [...solved.members].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Number(b.eventRef?.id || 0) - Number(a.eventRef?.id || 0);
  });

  const memberSlots = [...orderedMembers];
  while (memberSlots.length < 5) memberSlots.push(null);

  return {
    attr,
    total: solved.total,
    bfesCount: orderedMembers.filter((m) => m.fesKind === 'bfes').length,
    cfesCount: orderedMembers.filter((m) => m.fesKind === 'cfes').length,
    members: orderedMembers,
    memberSlots
  };
};

const compareLineupCardForPick = (a, b) => {
  if ((b?.baseScore || 0) !== (a?.baseScore || 0)) return (b?.baseScore || 0) - (a?.baseScore || 0);
  const aBfes = a?.fesKind === 'bfes' ? 1 : 0;
  const bBfes = b?.fesKind === 'bfes' ? 1 : 0;
  if (bBfes !== aBfes) return bBfes - aBfes;
  const aCfes = a?.fesKind === 'cfes' ? 1 : 0;
  const bCfes = b?.fesKind === 'cfes' ? 1 : 0;
  if (bCfes !== aCfes) return bCfes - aCfes;
  return Number(b?.eventRef?.id || 0) - Number(a?.eventRef?.id || 0);
};

const compressSupportCards = (cards) => {
  const bestBySignature = {};
  (cards || []).forEach((card) => {
    const signature = [
      String(card?.unit || ''),
      Number(card?.baseScore || 0),
      card?.isUnitScore ? 1 : 0,
      String(card?.fesKind || ''),
      String(card?.skillKind || '')
    ].join('|');
    const prev = bestBySignature[signature];
    if (!prev || compareLineupCardForPick(card, prev) < 0) {
      bestBySignature[signature] = card;
    }
  });
  return Object.values(bestBySignature).sort(compareLineupCardForPick);
};

const evalSupportMembers = (cards) => {
  const lineupHit = evalLineupMembers(cards);
  const orderedMembers = [...lineupHit.members].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Number(b.eventRef?.id || 0) - Number(a.eventRef?.id || 0);
  });
  const captainScore = Number(orderedMembers[0]?.score || 0);
  const othersScore = orderedMembers.slice(1).reduce((sum, m) => sum + Number(m.score || 0), 0);
  const total = captainScore + (othersScore / 5);
  return {
    total,
    members: orderedMembers,
    captainScore,
    othersScore
  };
};

const compareSupportSolvedHit = (nextHit, bestHit, targetUnit) => {
  if (!bestHit) return true;

  if (compareLineupSolvedHit(nextHit, bestHit)) return true;
  if (compareLineupSolvedHit(bestHit, nextHit)) return false;

  if (targetUnit === 'vs') {
    const nextPureVs = nextHit.members.filter((m) => String(m?.unit || '').trim().toLowerCase() === 'vs').length;
    const bestPureVs = bestHit.members.filter((m) => String(m?.unit || '').trim().toLowerCase() === 'vs').length;
    if (nextPureVs !== bestPureVs) return nextPureVs > bestPureVs;
    return false;
  }

  const nextOcInUnit = nextHit.members.filter((m) => m.unit === targetUnit && !isVirtualSinger(String(m?.name || '').trim())).length;
  const bestOcInUnit = bestHit.members.filter((m) => m.unit === targetUnit && !isVirtualSinger(String(m?.name || '').trim())).length;
  if (nextOcInUnit !== bestOcInUnit) return nextOcInUnit > bestOcInUnit;

  const nextVsCount = nextHit.members.filter((m) => isVirtualSinger(String(m?.name || '').trim())).length;
  const bestVsCount = bestHit.members.filter((m) => isVirtualSinger(String(m?.name || '').trim())).length;
  if (nextVsCount !== bestVsCount) return nextVsCount < bestVsCount;

  return false;
};

const solveSupportLineup = (cardsByName, targetUnit) => {
  const entries = Object.entries(cardsByName || {})
    .map(([name, cards]) => ({
      name,
      // Keep all card options for a character; unit_score cards can outperform score_up after lineup composition.
      cards: compressSupportCards(cards)
    }))
    .filter((entry) => entry.cards.length > 0)
    .sort((a, b) => compareLineupCardForPick(b.cards[0], a.cards[0]));

  if (!entries.length) return null;

  const teamSize = Math.min(5, entries.length);
  let best = null;
  const selected = [];

  const dfs = (idx) => {
    const remainNeed = teamSize - selected.length;
    const remainEntries = entries.length - idx;
    if (remainNeed === 0) {
      const hit = evalSupportMembers(selected);
      if (compareSupportSolvedHit(hit, best, targetUnit)) best = hit;
      return;
    }
    if (remainEntries < remainNeed) return;
    if (idx >= entries.length) return;

    const entry = entries[idx];
    for (let i = 0; i < entry.cards.length; i += 1) {
      selected.push(entry.cards[i]);
      dfs(idx + 1);
      selected.pop();
    }

    dfs(idx + 1);
  };

  dfs(0);
  return best;
};

const buildSupportLineupPlan = (targetUnit, attr, supportPool) => {
  const cardsByName = supportPool?.[targetUnit]?.[attr] || {};
  const solved = solveSupportLineup(cardsByName, targetUnit);
  if (!solved) {
    return {
      attr,
      total: 0,
      members: [],
      memberSlots: [null, null, null, null, null]
    };
  }

  const memberSlots = [...solved.members];
  while (memberSlots.length < 5) memberSlots.push(null);

  return {
    attr,
    total: solved.total,
    members: solved.members,
    memberSlots
  };
};

const buildSupportWlPlan = (targetUnit, supportPool) => {
  const isVsTarget = targetUnit === 'vs';
  const isOcTarget = targetUnit !== 'vs';

  const buildWlAttrCandidateCards = (cardsByName, { strictOc = true, widen = false } = {}) => {
    const cards = Object.values(cardsByName || {}).flatMap((list) => Array.isArray(list) ? list : []);
    const normalized = cards
      .filter((card) => {
        const unit = String(card?.unit || '').trim().toLowerCase();
        const skillKind = String(card?.skillKind || '').trim().toLowerCase();

        // NOTE(wl-heuristic-2026-04): WL 行固定按“原v”统计，忽略“原v队”勾选，避免无效搜索空间。
        if (isVsTarget) return unit === 'vs';

        // NOTE(wl-heuristic-2026-04): OC 行仅保留 BFES/团分，未来若出现高倍率 CFES/P分再回退。
        if (isOcTarget) {
          if (unit !== targetUnit) return false;
          if (!strictOc) return true;
          return WL_OC_ALLOWED_SKILLS.has(skillKind);
        }

        return true;
      })
      .map((card) => {
        const skillKind = String(card?.skillKind || '').trim().toLowerCase();
        if (isOcTarget && skillKind === 'unit_score') {
          return { ...card, baseScore: WL_OC_UNIT_SCORE_BASE };
        }
        return card;
      });

    const sorted = [...normalized].sort(compareLineupCardForPick);
    if (!sorted.length) return [];

    const unitScoreCards = sorted.filter((card) => card?.isUnitScore).slice(0, widen ? 8 : 4);
    const bfesCards = sorted.filter((card) => card?.fesKind === 'bfes').slice(0, widen ? 8 : 4);
    const scoreCards = sorted
      .filter((card) => WL_OC_FALLBACK_SKILLS.has(String(card?.skillKind || '').trim().toLowerCase()))
      .slice(0, widen ? 8 : 4);
    const highBaseCards = sorted.slice(0, widen ? 9 : 5);

    const merged = [];
    const seen = new Set();
    const pushUnique = (card) => {
      const key = String(card?.cardId || '').trim() || `${String(card?.name || '').trim()}|${String(card?.attr || '').trim()}|${String(card?.unit || '').trim()}|${String(card?.skillKind || '').trim()}|${Number(card?.baseScore || 0)}`;
      if (!key || seen.has(key)) return;
      seen.add(key);
      merged.push(card);
    };

    unitScoreCards.forEach(pushUnique);
    bfesCards.forEach(pushUnique);
    scoreCards.forEach(pushUnique);
    highBaseCards.forEach(pushUnique);
    if (isVsTarget || !strictOc || widen) {
      sorted.forEach(pushUnique);
    }

    const limit = isVsTarget
      ? (widen ? 14 : 10)
      : (strictOc ? (widen ? 10 : 6) : (widen ? 14 : 10));
    return merged.slice(0, limit);
  };

  const buildAttrBuckets = (strictOc, widen) => ATTRS.map((attr) => {
    const cardsByName = supportPool?.[targetUnit]?.[attr] || {};
    return {
      attr,
      cards: buildWlAttrCandidateCards(cardsByName, { strictOc, widen })
    };
  });

  const solveByBuckets = (attrBuckets) => {
    if (attrBuckets.some((bucket) => bucket.cards.length === 0)) {
      return null;
    }

    let best = null;
    const selected = [];
    const usedNames = new Set();

    const dfs = (idx) => {
      if (idx >= attrBuckets.length) {
        if (selected.length !== ATTRS.length) return;
        const hit = evalSupportMembers(selected);
        if (compareSupportSolvedHit(hit, best, targetUnit)) best = hit;
        return;
      }

      const bucket = attrBuckets[idx];
      for (let i = 0; i < bucket.cards.length; i += 1) {
        const card = bucket.cards[i];
        const nameKey = String(card?.name || '').trim();
        if (!nameKey || usedNames.has(nameKey)) continue;
        usedNames.add(nameKey);
        selected.push(card);
        dfs(idx + 1);
        selected.pop();
        usedNames.delete(nameKey);
      }
    };

    dfs(0);
    return best;
  };

  let best = solveByBuckets(buildAttrBuckets(true, false));
  if (!best && isOcTarget) {
    // 回退策略：当严格筛选导致某团 WL 行无法成队时，放宽到同团全技能并扩大候选集。
    best = solveByBuckets(buildAttrBuckets(false, true));
  }
  if (!best && isVsTarget) {
    best = solveByBuckets(buildAttrBuckets(true, true));
  }

  if (!best) {
    return {
      attr: SUPPORT_WL_ATTR,
      total: 0,
      members: [],
      memberSlots: [null, null, null, null, null]
    };
  }

  const memberSlots = [...best.members];
  while (memberSlots.length < 5) memberSlots.push(null);

  return {
    attr: SUPPORT_WL_ATTR,
    total: best.total,
    members: best.members,
    memberSlots
  };
};

const getLineupRowStyle = (attr) => {
  if (String(attr || '').toLowerCase() === SUPPORT_WL_ATTR) {
    return {
      '--lineup-row-bg': 'transparent',
      '--lineup-row-border': 'rgba(71, 85, 105, 0.34)',
      '--lineup-row-fg': '#111827',
      '--lineup-row-fg-muted': '#64748b'
    };
  }
  const bg = LINEUP_ATTR_BG[attr] || '#64748b';
  const flatBg = hexToSoftSolid(bg, 1 - LINEUP_BASE_ALPHA);
  return {
    '--lineup-row-bg': flatBg,
    '--lineup-row-border': hexToRgba(bg, 0.38),
    '--lineup-row-fg': '#111827',
    '--lineup-row-fg-muted': '#64748b'
  };
};

const getLineupMemberCellStyle = (slot, attr) => {
  if (slot?.fesKind === 'bfes') {
    return {
      background: makeLineupFesBg(LINEUP_FES_ALPHA.bfes),
      borderColor: '#4c1d95',
      color: '#111827'
    };
  }
  if (slot?.fesKind === 'cfes') {
    return {
      background: makeLineupFesBg(LINEUP_FES_ALPHA.cfes),
      borderColor: '#ffffff',
      boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.18)',
      color: '#111827'
    };
  }
  return getLineupRowStyle(attr);
};

const lineupCardPoolByAttr = computed(() => {
  const maxEid = safeMaxEventId.value;
  const pool = Object.fromEntries(ATTRS.map((attr) => [attr, {}]));

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinLimit(card, maxEid)) return;
    if (String(card?.Rarity || '').trim() !== '4') return;

    const baseName = getCardBaseName(card?.Name);
    if (!baseName || !CHAR_ORDER[baseName]) return;

    const attr = normalizeAttr(card?.Attribute);
    if (!attr) return;

    const skillInfo = getLineupSkillInfo(card);
    const { eventRef, eventLabel } = buildLineupEventRef(card);
    const unit = getLineupCardUnit(card, baseName);

    if (!pool[attr][baseName]) pool[attr][baseName] = [];
    pool[attr][baseName].push({
      cardId: String(card?.CardID || ''),
      name: baseName,
      attr,
      unit,
      baseScore: skillInfo.baseScore,
      isUnitScore: skillInfo.isUnitScore,
      isFes: isFesSkillType(skillInfo.kind),
      fesKind: getFesKindBySkillKind(skillInfo.kind),
      skillKind: skillInfo.kind,
      eventRef,
      eventLabel
    });
  });

  return pool;
});

const characterLineupRows = computed(() => {
  const names = [...LINEUP_CHAR_NAMES.value];

  return names.map((name) => {
    const plans = ATTRS
      .map((attr) => buildLineupPlan(name, attr, lineupCardPoolByAttr.value))
      .filter(Boolean)
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        if ((b.bfesCount || 0) !== (a.bfesCount || 0)) return (b.bfesCount || 0) - (a.bfesCount || 0);
        if ((b.cfesCount || 0) !== (a.cfesCount || 0)) return (b.cfesCount || 0) - (a.cfesCount || 0);
        return ATTRS.indexOf(a.attr) - ATTRS.indexOf(b.attr);
      });

    if (!plans.length) {
      const emptyPlan = {
        attr: 'Pure',
        total: 0,
        members: [],
        memberSlots: [null, null, null, null, null]
      };
      return {
        name,
        bestPlan: emptyPlan,
        otherPlans: []
      };
    }

    return {
      name,
      bestPlan: plans[0],
      otherPlans: plans.slice(1)
    };
  });
});

const supportCardPoolByUnitAttr = computed(() => {
  const maxEid = safeMaxEventId.value;
  const pool = Object.fromEntries(
    SUPPORT_UNITS.map((unit) => [unit, Object.fromEntries(ATTRS.map((attr) => [attr, {}]))])
  );

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinLimit(card, maxEid)) return;
    if (String(card?.Rarity || '').trim() !== '4') return;

    const baseName = getCardBaseName(card?.Name);
    if (!baseName || !CHAR_ORDER[baseName]) return;

    const attr = normalizeAttr(card?.Attribute);
    if (!attr) return;

    const unit = getLineupCardUnit(card, baseName);
    const skillInfo = getLineupSkillInfo(card);
    const { eventRef, eventLabel } = buildLineupEventRef(card);

    SUPPORT_UNITS.forEach((targetUnit) => {
      if (targetUnit === 'vs') {
        if (!VS_NAMES.includes(baseName)) return;
        if (supportUseOriginalVsTeam.value && unit !== 'vs') return;
      } else if (unit !== targetUnit) {
        return;
      }

      if (!pool[targetUnit][attr][baseName]) pool[targetUnit][attr][baseName] = [];
      pool[targetUnit][attr][baseName].push({
        cardId: String(card?.CardID || ''),
        name: baseName,
        attr,
        unit,
        baseScore: skillInfo.baseScore,
        isUnitScore: skillInfo.isUnitScore,
        isFes: isFesSkillType(skillInfo.kind),
        fesKind: getFesKindBySkillKind(skillInfo.kind),
        skillKind: skillInfo.kind,
        eventRef,
        eventLabel
      });
    });
  });

  return pool;
});

const supportLineupRows = computed(() => {
  return SUPPORT_UNITS.map((unit) => {
    const plans = ATTRS
      .map((attr) => buildSupportLineupPlan(unit, attr, supportCardPoolByUnitAttr.value))
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return ATTRS.indexOf(a.attr) - ATTRS.indexOf(b.attr);
      });

    if (supportEnableWlLineup.value) {
      plans.push(buildSupportWlPlan(unit, supportCardPoolByUnitAttr.value));
    }

    return {
      unit,
      plans
    };
  });
});

const formatSupportTotal = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0';
  if (Math.abs(num - Math.round(num)) < 1e-9) return String(Math.round(num));
  return num.toFixed(1);
};

const lineupExpandedMap = ref({});

const isLineupExpanded = (name) => !!lineupExpandedMap.value[String(name || '')];

const lineupRowsWithOthers = computed(() => characterLineupRows.value.filter((row) => (row.otherPlans || []).length > 0));

const isLineupAllExpanded = computed(() => {
  if (!lineupRowsWithOthers.value.length) return false;
  return lineupRowsWithOthers.value.every((row) => isLineupExpanded(row.name));
});

const getLineupToggleLabel = (name, count = 0) => {
  const expanded = isLineupExpanded(name);
  if (isMobileNav.value) return expanded ? '收起' : '展开';
  return expanded ? '收起其余属性' : '展开其余属性';
};

const getLineupGlobalToggleLabel = () => {
  if (isMobileNav.value) return isLineupAllExpanded.value ? '收起全部' : '展开全部';
  return isLineupAllExpanded.value ? '收起全部其余属性' : '展开全部其余属性';
};

const onFesRecordShowCardImagesChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    fesRecordShowCardImages.value = checked;
  }, anchorEl);
};

const onLineupShowCardImagesChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    lineupShowCardImages.value = checked;
    void nextTick(() => {
      queueLineupCardModeRowLayoutSync();
    });
  }, anchorEl);
};

const onSupportShowCardImagesChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    supportShowCardImages.value = checked;
    void nextTick(() => {
      queueLineupCardModeRowLayoutSync();
    });
  }, anchorEl);
};

const onSupportEnableWlLineupChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    supportEnableWlLineup.value = checked;
  }, anchorEl);
};

const onSupportUseOriginalVsTeamChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    supportUseOriginalVsTeam.value = checked;
  }, anchorEl);
};

const onRelatedLastRecordShowCardImagesChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    relatedLastRecordShowCardImages.value = checked;
  }, anchorEl);
};

const relatedPanelShowCardImagesAll = computed({
  get: () => (
    !!relatedLastRecordShowCardImages.value
    && !!intervalFourShowCardImages.value
    && !!intervalLimitedShowCardImages.value
    && !!intervalBanShowCardImages.value
    && !!vsUnitLastFourShowCardImages.value
    && !!vsUnitFourCountShowCardImages.value
    && !!vsUnitScoreShowCardImages.value
    && !!vsOriginalStatShowCardImages.value
    && !!fesRecordShowCardImages.value
  ),
  set: (value) => {
    const checked = !!value;
    relatedLastRecordShowCardImages.value = checked;
    intervalFourShowCardImages.value = checked;
    intervalLimitedShowCardImages.value = checked;
    intervalBanShowCardImages.value = checked;
    vsUnitLastFourShowCardImages.value = checked;
    vsUnitFourCountShowCardImages.value = checked;
    vsUnitScoreShowCardImages.value = checked;
    vsOriginalStatShowCardImages.value = checked;
    fesRecordShowCardImages.value = checked;
  }
});

const onRelatedPanelShowAllCardImagesChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    relatedPanelShowCardImagesAll.value = checked;
  }, anchorEl);
};

const onIncludeUnitScoreInPureScoreChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    includeUnitScoreInPureScore.value = checked;
  }, anchorEl);
};

const onVsUnitLastFourShowCardImagesChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    vsUnitLastFourShowCardImages.value = checked;
  }, anchorEl);
};

const onVsUnitFourCountShowCardImagesChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    vsUnitFourCountShowCardImages.value = checked;
  }, anchorEl);
};

const onVsUnitScoreShowCardImagesChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    vsUnitScoreShowCardImages.value = checked;
  }, anchorEl);
};

const onVsOriginalStatShowCardImagesChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    vsOriginalStatShowCardImages.value = checked;
  }, anchorEl);
};

const onIntervalFourShowCardImagesChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    intervalFourShowCardImages.value = checked;
  }, anchorEl);
};

const onIntervalLimitedShowCardImagesChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    intervalLimitedShowCardImages.value = checked;
  }, anchorEl);
};

const onIntervalBanShowCardImagesChange = (event) => {
  const checked = !!event?.target?.checked;
  const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
  void withInteractionPinnedPosition(() => {
    intervalBanShowCardImages.value = checked;
  }, anchorEl);
};

const toggleLineupExpanded = (name, event = null) => {
  const key = String(name || '');
  if (!key) return;
  const anchorEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  void withInteractionPinnedPosition(() => {
    lineupExpandedMap.value = {
      ...lineupExpandedMap.value,
      [key]: !lineupExpandedMap.value[key]
    };
  }, anchorEl);
};

const toggleLineupExpandedAll = (event = null) => {
  const target = !isLineupAllExpanded.value;
  const anchorEl = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  void withInteractionPinnedPosition(() => {
    const next = { ...lineupExpandedMap.value };
    lineupRowsWithOthers.value.forEach((row) => {
      next[row.name] = target;
    });
    lineupExpandedMap.value = next;
  }, anchorEl);
};

const getCardProgressOrderId = (card) => {
  const cardId = Number(String(card?.CardID || '').trim());
  if (Number.isFinite(cardId) && cardId > 0) return cardId;
  const eventId = Number(String(card?.EventID || '').trim());
  if (Number.isFinite(eventId) && eventId > 0) return eventId * 10000;
  return 0;
};

const getStatProgressOrderKey = (row, key) => {
  if (key === 'fourStarCount') return Number(row?.lastFourStarOrderId || 0);
  if (key === 'limitedCount') return Number(row?.lastLimitedOrderId || 0);
  if (key === 'fesLimitedCount') return Number(row?.lastFesLimitedOrderId || 0);
  if (key === 'scoreUpCount') return Number(row?.lastScoreUpOrderId || 0);
  if (key === 'pScoreCount') return Number(row?.lastPScoreOrderId || 0);
  if (key === 'pureScoreCount') return Number(row?.lastPureScoreOrderId || 0);
  if (key === 'recoveryCount') return Number(row?.lastRecoveryOrderId || 0);
  if (key === 'accuracyCount') return Number(row?.lastAccuracyOrderId || 0);
  if (key === 'threeStarCount') return Number(row?.lastThreeStarOrderId || 0);
  if (key === 'twoStarCount') return Number(row?.lastTwoStarOrderId || 0);
  if (key === 'rewardTotalCount') return Number(row?.lastRewardOrderId || 0);
  if (key === 'bannerCount') return Number(row?.lastBannerOrderId || 0);
  if (key === 'limitedBanCount') return Number(row?.lastLimitedBanOrderId || 0);
  if (key === 'fesLimitedBanCount') return Number(row?.lastFesLimitedBanOrderId || 0);
  return Number(row?.lastCardOrderId || 0);
};

// 2. 这里的计算属性直接指向完整的卡片源
const processedStats = computed(() => {
  const stats = {};
  const maxEid = safeMaxEventId.value; // 这里拿到的是基于日期计算出的 ID
  const cardsSource = props.allCards || []; // 使用 App.vue 传下来的全量卡片

  cardsSource.forEach(card => {
    const name = card.Name;
    // 基础过滤：排除无效数据
    if (!name || name === "-" || name === "CardID") return;

    // --- 核心修改：日期约束逻辑 ---
    // 逻辑：如果是活动卡 (有数字 EventID)，且 ID 大于当前正在进行的活动 ID，则跳过统计
    // 除非是初始卡 ("ori")，否则必须满足 EventID <= maxEid
    if (!isCardWithinLimit(card, maxEid)) {
      return; 
    }

    // 初始化角色的统计对象
    if (!stats[name]) {
      stats[name] = { 
        name, 
        affiliation: card.Affiliation || 'vs', 
        fourStarCount: 0, 
        limitedCount: 0,
        pScoreCount: 0,
        scoreUpCount: 0,
        twoStarCount: 0,
        threeStarCount: 0,
        rewardTwoCount: 0,
        rewardThreeCount: 0,
        bannerCount: 0,
        limitedBanCount: 0,
        fesLimitedCount: 0,
        fesLimitedBanCount: 0,
        accuracyCount: 0,
        recoveryCount: 0,
        unitScoreCount: 0,
        pendingSkillCount: 0,
        pureScoreCount: 0,
        lastCardOrderId: 0,
        lastFourStarOrderId: 0,
        lastLimitedOrderId: 0,
        lastPScoreOrderId: 0,
        lastScoreUpOrderId: 0,
        lastPureScoreOrderId: 0,
        lastRecoveryOrderId: 0,
        lastAccuracyOrderId: 0,
        lastThreeStarOrderId: 0,
        lastTwoStarOrderId: 0,
        lastRewardOrderId: 0,
        lastBannerOrderId: 0,
        lastLimitedBanOrderId: 0,
        lastFesLimitedOrderId: 0,
        lastFesLimitedBanOrderId: 0,
        attrCounts: { Pure: 0, Cool: 0, Cute: 0, Happy: 0, Mysterious: 0 }
      };
    }

    const eventIdRaw = String(card?.EventID || '').trim();
    const eventIdNum = isNumericEventId(eventIdRaw) ? Number(eventIdRaw) : null;
    const rarity = String(card.Rarity || '').trim();
    const skill = String(card.Skill || '').toLowerCase();
    const cardType = String(card?.Type || '').trim().toLowerCase();
    const attr = normalizeAttr(card.Attribute);
    const progressOrderId = getCardProgressOrderId(card);
    stats[name].lastCardOrderId = Math.max(Number(stats[name].lastCardOrderId || 0), progressOrderId);

    // 统计 4 星卡片及技能分类
    if (rarity === "4") {
      stats[name].fourStarCount++;
      stats[name].lastFourStarOrderId = Math.max(Number(stats[name].lastFourStarOrderId || 0), progressOrderId);

      const isFesCard = isFesCardType(cardType);
      const isFesLimitedEventCard = eventIdNum !== null && fesLimitedEventIdSet.value.has(eventIdNum);
      const shouldCountFesLimited = (isFesLimitedEventCard && !isFesCard)
        || (fesLimitedIncludeFes.value && isFesCard);
      if (shouldCountFesLimited) {
        stats[name].fesLimitedCount++;
        stats[name].lastFesLimitedOrderId = Math.max(Number(stats[name].lastFesLimitedOrderId || 0), progressOrderId);
      }

      if (skill === 'p_score') {
        stats[name].pScoreCount++;
        stats[name].lastPScoreOrderId = Math.max(Number(stats[name].lastPScoreOrderId || 0), progressOrderId);
      }
      if (skill === 'score_up') {
        stats[name].scoreUpCount++;
        stats[name].lastScoreUpOrderId = Math.max(Number(stats[name].lastScoreUpOrderId || 0), progressOrderId);
      }
      if (skill === 'accuracy') {
        stats[name].accuracyCount++;
        stats[name].lastAccuracyOrderId = Math.max(Number(stats[name].lastAccuracyOrderId || 0), progressOrderId);
      }
      if (skill === 'recovery') {
        stats[name].recoveryCount++;
        stats[name].lastRecoveryOrderId = Math.max(Number(stats[name].lastRecoveryOrderId || 0), progressOrderId);
      }
      if (skill === 'unit_score') stats[name].unitScoreCount++;
      if (!skill || skill === '-') stats[name].pendingSkillCount++;
      const excludedPureSkills = includeUnitScoreInPureScore.value
        ? ['accuracy', 'recovery', '-', '']
        : ['accuracy', 'recovery', 'unit_score', '-', ''];
      if (!excludedPureSkills.includes(skill)) {
        stats[name].lastPureScoreOrderId = Math.max(Number(stats[name].lastPureScoreOrderId || 0), progressOrderId);
      }

      if (attr) {
        stats[name].attrCounts[attr] += 1;
      }
    }

    if (rarity === '3') {
      stats[name].threeStarCount++;
      stats[name].lastThreeStarOrderId = Math.max(Number(stats[name].lastThreeStarOrderId || 0), progressOrderId);
    }
    if (rarity === '2') {
      stats[name].twoStarCount++;
      stats[name].lastTwoStarOrderId = Math.max(Number(stats[name].lastTwoStarOrderId || 0), progressOrderId);
    }

    if (isEventRewardCard(card)) {
      if (rarity === '3') stats[name].rewardThreeCount++;
      if (rarity === '2') stats[name].rewardTwoCount++;
      stats[name].lastRewardOrderId = Math.max(Number(stats[name].lastRewardOrderId || 0), progressOrderId);
    }

    // 统计限定卡片 (含 Fes 和 联名限定)
    if (LIMITED_TYPES.has(cardType)) {
      stats[name].limitedCount++;
      stats[name].lastLimitedOrderId = Math.max(Number(stats[name].lastLimitedOrderId || 0), progressOrderId);
    }
  });

  // 最后的汇总处理
  return Object.values(stats).map(s => {
    // 计算“纯分卡”数量：四星总数 - (判定 + 奶卡 + 团分)
    // 同时剔除技能待定的 4 星卡，避免被误记为分卡。
    const pureSubtract = includeUnitScoreInPureScore.value
      ? (s.accuracyCount + s.recoveryCount + s.pendingSkillCount)
      : (s.accuracyCount + s.recoveryCount + s.unitScoreCount + s.pendingSkillCount);
    s.pureScoreCount = s.fourStarCount - pureSubtract;
    s.rewardTotalCount = s.rewardThreeCount + s.rewardTwoCount;
    s.bannerCount = bannerCountMap.value[normalizeBannerName(s.name)] || 0;
    s.lastBannerOrderId = Number(bannerLastEventIdMap.value[normalizeBannerName(s.name)] || 0);
    s.limitedBanCount = limitedBanCountMap.value[normalizeBannerName(s.name)] || 0;
    s.lastLimitedBanOrderId = Number(limitedBanLastEventIdMap.value[normalizeBannerName(s.name)] || 0);
    s.fesLimitedBanCount = fesLimitedBanCountMap.value[normalizeBannerName(s.name)] || 0;
    s.lastFesLimitedBanOrderId = Number(fesLimitedBanLastEventIdMap.value[normalizeBannerName(s.name)] || 0);
    s.attrTotalCount = ATTRS.reduce((sum, a) => sum + s.attrCounts[a], 0);
    return s;
  });
});

const groupByCount = (data, key) => {
  const groups = {};
  data.forEach(char => {
    const count = char[key];
    if (!groups[count]) groups[count] = [];
    groups[count].push(char);
  });
  return Object.keys(groups)
    .map(count => ({
      count: parseInt(count, 10),
      chars: groups[count].sort((a, b) => {
        const ao = getStatProgressOrderKey(a, key);
        const bo = getStatProgressOrderKey(b, key);
        if (ao !== bo) return ao - bo;
        const ac = CHAR_ORDER[String(a?.name || '').split(/\s+/)[0]] || 999;
        const bc = CHAR_ORDER[String(b?.name || '').split(/\s+/)[0]] || 999;
        if (ac !== bc) return ac - bc;
        return String(a?.name || '').localeCompare(String(b?.name || ''), 'zh-Hans-CN');
      })
    }))
    .sort((a, b) => b.count - a.count);
};

const groupPanels = computed(() => [
  { id: 'four', title: '4星总数', cellClass: '', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'fourStarCount') },
  { id: 'limited', title: '限定总数', cellClass: 'lim', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'limitedCount') },
  { id: 'pure-score', title: '4星分卡数', cellClass: 'pure-score', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'pureScoreCount') },
  { id: 'reward', title: '报酬总数', cellClass: 'reward', showRewardBreakdown: true, groups: groupByCount(processedStats.value, 'rewardTotalCount') },
  { id: 'p-score', title: '4星P分数', cellClass: 'p-score', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'pScoreCount') },
  { id: 'score-up', title: '4星普分数', cellClass: 'score-up', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'scoreUpCount') },
  { id: 'recovery', title: '4星奶卡数', cellClass: 'recovery', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'recoveryCount') },
  { id: 'accuracy', title: '4星判卡数', cellClass: 'accuracy', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'accuracyCount') },
  { id: 'three', title: '3星总数', cellClass: 'three-star', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'threeStarCount') },
  { id: 'two', title: '2星总数', cellClass: 'two-star', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'twoStarCount') },
  { id: 'banner', title: 'Banner数', cellClass: 'banner', showRewardBreakdown: false,
    groups: groupByCount(
      processedStats.value.filter((row) => !VS_NAMES.includes(String(row?.name || '').trim().split(/\s+/)[0])),
      'bannerCount')
  },
  { id: 'limited-ban', title: '限Ban数', cellClass: 'limited-ban', showRewardBreakdown: false, 
    groups: groupByCount(
      processedStats.value.filter((row) => !VS_NAMES.includes(String(row?.name || '').trim().split(/\s+/)[0])),
      'limitedBanCount')
  },
  { id: 'fes-limited', title: '百六限定次数', cellClass: 'fes-limited', showRewardBreakdown: false, groups: groupByCount(processedStats.value, 'fesLimitedCount') },
  { id: 'fes-limited-ban', title: '百六限Ban次数', cellClass: 'fes-limited-ban', showRewardBreakdown: false,
    groups: groupByCount(
      processedStats.value.filter((row) => !VS_NAMES.includes(String(row?.name || '').trim().split(/\s+/)[0])),
      'fesLimitedBanCount')
  }
]);

const festivalCharStats = computed(() => {
  const maxEid = safeMaxEventId.value;
  const allNames = Object.keys(CHAR_ORDER).sort((a, b) => (CHAR_ORDER[a] || 999) - (CHAR_ORDER[b] || 999));
  const eventFestivalMap = {};

  (props.allEvents || []).forEach((ev) => {
    if (shouldSkipPredictEvent(ev)) return;
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (eid > maxEid) return;
    const fest = String(ev?.festival || '').trim();
    if (!SPECIAL_FESTIVALS.includes(fest)) return;
    eventFestivalMap[eid] = fest;
  });

  const festCounts = Object.fromEntries(SPECIAL_FESTIVALS.map((fest) => [
    fest,
    {
      four: {},
      three: {},
      two: {},
      fourMeta: {},
      seenBase: new Set()
    }
  ]));

  (props.allCards || []).forEach((card) => {
    const eid = String(card?.EventID || '').trim();
    if (!isNumericEventId(eid)) return;
    const fest = eventFestivalMap[Number(eid)];
    if (!fest) return;

    const charName = buildFestivalCharKey(card);
    if (!charName) return;

    const baseName = parseFestivalCharKey(charName).baseName;
    if (!baseName) return;

    const type = String(card?.Type || '').trim().toLowerCase();
    const isFes = isFesCardType(type);
    if (isFes && !shouldCountFestivalFes(fest)) return;

    const rarity = String(card?.Rarity || '').trim();
    const festBucket = festCounts[fest];

    if (rarity === '4' || isFes) {
      festBucket.four[charName] = (festBucket.four[charName] || 0) + 1;
      if (!festBucket.fourMeta[charName]) {
        festBucket.fourMeta[charName] = { perm: 0, nonPerm: 0 };
      }
      if (type === 'perm') festBucket.fourMeta[charName].perm += 1;
      else festBucket.fourMeta[charName].nonPerm += 1;
      festBucket.seenBase.add(baseName);
      return;
    }
    if (rarity === '3') {
      festBucket.three[charName] = (festBucket.three[charName] || 0) + 1;
      festBucket.seenBase.add(baseName);
      return;
    }
    if (rarity === '2') {
      festBucket.two[charName] = (festBucket.two[charName] || 0) + 1;
      festBucket.seenBase.add(baseName);
    }
  });

  const buildCountRow = (countMap, options = {}) => Object.entries(countMap || {})
    .filter(([, count]) => Number(count) > 0)
    .map(([name, count]) => {
      const meta = options.fourMeta?.[name];
      const isPermOnly = !!meta && meta.perm > 0 && meta.nonPerm === 0;
      return { name, count: Number(count), isPermOnly };
    })
    .sort((a, b) => compareFestivalCharKey(a.name, b.name));
  const getFestivalBaseName = (charName) => parseFestivalCharKey(charName).baseName;

  const shouldMergeFestivalRows = (festival) => {
    const festKey = String(festival || '').trim();
    return !!festivalMergeToggles[festKey];
  };

  const applyFestivalMerge = (festival, rows) => {
    if (!shouldMergeFestivalRows(festival)) return rows;
    const fourRow = rows.find((row) => row.key === 'four') || { chars: [] };
    const threeRow = rows.find((row) => row.key === 'three') || { chars: [] };
    const twoRow = rows.find((row) => row.key === 'two') || { chars: [] };

    const fourBaseSet = new Set((fourRow.chars || []).map((item) => getFestivalBaseName(item.name)).filter(Boolean));
    const mergedThreeChars = (threeRow.chars || []).filter((item) => !fourBaseSet.has(getFestivalBaseName(item.name)));
    const threeBaseSet = new Set(mergedThreeChars.map((item) => getFestivalBaseName(item.name)).filter(Boolean));
    const mergedTwoChars = (twoRow.chars || []).filter((item) => {
      const base = getFestivalBaseName(item.name);
      if (!base) return false;
      return !fourBaseSet.has(base) && !threeBaseSet.has(base);
    });

    return rows.map((row) => {
      if (row.key === 'three') return { ...row, chars: mergedThreeChars };
      if (row.key === 'two') return { ...row, chars: mergedTwoChars };
      return row;
    });
  };

  return SPECIAL_FESTIVALS.map((fest) => {
    const festBucket = festCounts[fest];
    const rows = [
      { key: 'four', label: '4星', chars: buildCountRow(festBucket.four, { fourMeta: festBucket.fourMeta }) },
      { key: 'three', label: '3星', chars: buildCountRow(festBucket.three) },
      { key: 'two', label: '2星', chars: buildCountRow(festBucket.two) }
    ];

    const noneChars = allNames
      .filter((name) => !festBucket.seenBase.has(name))
      .map((name) => ({ name, count: 0 }));

    rows.push({ key: 'none', label: '未出', chars: noneChars });
    return { festival: fest, anchorId: FESTIVAL_ANCHOR_IDS[fest], rows: applyFestivalMerge(fest, rows) };
  });
});

const previewDailyLineupMap = computed(() => {
  const result = {};
  (characterLineupRows.value || []).forEach((row) => {
    const name = String(row?.name || '').trim();
    if (!name) return;
    // Keep exactly the same order as stats panel: bestPlan first, then otherPlans.
    const plans = [row?.bestPlan, ...(row?.otherPlans || [])]
      .filter(Boolean)
      .map((plan) => ({
        attr: String(plan?.attr || ''),
        total: Number(plan?.total || 0),
        memberScores: [...(plan?.memberSlots || [])]
          .slice(0, 5)
          .map((slot) => Number(slot?.score || 0)),
        memberFesKinds: [...(plan?.memberSlots || [])]
          .slice(0, 5)
          .map((slot) => String(slot?.fesKind || ''))
      }));
    result[name] = plans;
  });
  return result;
});

const statsPreviewPayload = computed(() => {
  const fourPanel = groupPanels.value.find((p) => p.id === 'four');
  const limitedPanel = groupPanels.value.find((p) => p.id === 'limited');
  const scoreUpPanel = groupPanels.value.find((p) => p.id === 'score-up');
  const limitedBanPanel = groupPanels.value.find((p) => p.id === 'limited-ban');
  const fesLimitedPanel = groupPanels.value.find((p) => p.id === 'fes-limited');
  const fesLimitedBanPanel = groupPanels.value.find((p) => p.id === 'fes-limited-ban');
  const festivalGroups = Object.fromEntries(
    (festivalCharStats.value || []).map((item) => [item.festival, item.rows || []])
  );
  return {
    maxEventId: safeMaxEventId.value,
    groups: {
      fourStarCount: fourPanel?.groups || [],
      limitedCount: limitedPanel?.groups || [],
      scoreUpCount: scoreUpPanel?.groups || [],
      limitedBanCount: limitedBanPanel?.groups || [],
      fesLimitedCount: fesLimitedPanel?.groups || [],
      fesLimitedBanCount: fesLimitedBanPanel?.groups || [],
      bannerCount: groupPanels.value.find((p) => p.id === 'banner')?.groups || [],
      festival: festivalGroups,
      dailyLineup: previewDailyLineupMap.value
    }
  };
});

watch(statsPreviewPayload, (payload) => {
  emit('stats-preview-update', payload);
}, { immediate: true });

const attrMatrixRows = computed(() => {
  const baseRows = [...processedStats.value]
    .sort((a, b) => (CHAR_ORDER[a.name] || 999) - (CHAR_ORDER[b.name] || 999))
    .map((s) => ({
      name: s.name,
      Pure: s.attrCounts.Pure,
      Cool: s.attrCounts.Cool,
      Cute: s.attrCounts.Cute,
      Happy: s.attrCounts.Happy,
      Mysterious: s.attrCounts.Mysterious,
      pureScoreCount: s.pureScoreCount,
      scoreUpCount: s.scoreUpCount,
      pScoreCount: s.pScoreCount,
      accuracyCount: s.accuracyCount,
      recoveryCount: s.recoveryCount,
      fourStarCount: s.fourStarCount,
      threeStarCount: s.threeStarCount,
      twoStarCount: s.twoStarCount,
      rewardTotalCount: s.rewardTotalCount
    }));

  const key = matrixSortKey.value;
  const order = matrixSortOrder.value;
  if (!key || !order) return baseRows;

  const orderFactor = order === 'desc' ? -1 : 1;
  return [...baseRows].sort((a, b) => {
    const av = Number(a?.[key] || 0);
    const bv = Number(b?.[key] || 0);
    if (av !== bv) return (av - bv) * orderFactor;
    return (CHAR_ORDER[a.name] || 999) - (CHAR_ORDER[b.name] || 999);
  });
});

const createMatrixStatSeed = (name) => ({
  name,
  fourStarCount: 0,
  pScoreCount: 0,
  twoStarCount: 0,
  threeStarCount: 0,
  rewardTwoCount: 0,
  rewardThreeCount: 0,
  accuracyCount: 0,
  recoveryCount: 0,
  unitScoreCount: 0,
  pendingSkillCount: 0,
  pureScoreCount: 0,
  scoreUpCount: 0,
  rewardTotalCount: 0,
  attrCounts: { Pure: 0, Cool: 0, Cute: 0, Happy: 0, Mysterious: 0 }
});

const parseVsMatrixRowName = (name) => {
  const [baseName, unitRaw] = String(name || '').trim().split(/\s+/);
  return {
    baseName,
    unit: String(unitRaw || '').toLowerCase()
  };
};

const compareVsMatrixName = (aName, bName) => {
  const a = parseVsMatrixRowName(aName);
  const b = parseVsMatrixRowName(bName);
  const au = VS_UNIT_SORT_ORDER.indexOf(a.unit);
  const bu = VS_UNIT_SORT_ORDER.indexOf(b.unit);
  const aUnitOrder = au >= 0 ? au : 999;
  const bUnitOrder = bu >= 0 ? bu : 999;
  if (aUnitOrder !== bUnitOrder) return aUnitOrder - bUnitOrder;
  const ac = CHAR_ORDER[a.baseName] || 999;
  const bc = CHAR_ORDER[b.baseName] || 999;
  if (ac !== bc) return ac - bc;
  return String(aName).localeCompare(String(bName), 'zh-Hans-CN');
};

const virtualSingerMatrixRows = computed(() => {
  const maxEid = safeMaxEventId.value;
  const matrixStats = {};

  VS_UNIT_SORT_ORDER.forEach((unit) => {
    VS_NAMES.forEach((vsName) => {
      const key = `${vsName} ${unit}`;
      matrixStats[key] = createMatrixStatSeed(key);
    });
  });

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinLimit(card, maxEid)) return;
    const baseName = String(card?.Name || '').trim();
    if (!VS_NAMES.includes(baseName)) return;
    const unit = String(card?.Affiliation || '').trim().toLowerCase();
    if (!VS_UNIT_SORT_ORDER.includes(unit)) return;

    const key = `${baseName} ${unit}`;
    const target = matrixStats[key];
    if (!target) return;

    const rarity = String(card?.Rarity || '').trim();
    const skill = String(card?.Skill || '').toLowerCase();
    const attr = normalizeAttr(card?.Attribute);

    if (rarity === '4') {
      target.fourStarCount += 1;
      if (skill === 'p_score') target.pScoreCount += 1;
      if (skill === 'score_up') target.scoreUpCount += 1;
      if (skill === 'accuracy') target.accuracyCount += 1;
      if (skill === 'recovery') target.recoveryCount += 1;
      if (skill === 'unit_score') target.unitScoreCount += 1;
      if (!skill || skill === '-') target.pendingSkillCount += 1;
      if (attr) target.attrCounts[attr] += 1;
    }

    if (rarity === '3') target.threeStarCount += 1;
    if (rarity === '2') target.twoStarCount += 1;

    if (isEventRewardCard(card)) {
      if (rarity === '3') target.rewardThreeCount += 1;
      if (rarity === '2') target.rewardTwoCount += 1;
    }
  });

  const baseRows = Object.values(matrixStats)
    .map((s) => {
      const pureSubtract = includeUnitScoreInPureScore.value
        ? (s.accuracyCount + s.recoveryCount + s.pendingSkillCount)
        : (s.accuracyCount + s.recoveryCount + s.unitScoreCount + s.pendingSkillCount);
      s.pureScoreCount = s.fourStarCount - pureSubtract;
      s.rewardTotalCount = s.rewardThreeCount + s.rewardTwoCount;
      return {
        name: s.name,
        Pure: s.attrCounts.Pure,
        Cool: s.attrCounts.Cool,
        Cute: s.attrCounts.Cute,
        Happy: s.attrCounts.Happy,
        Mysterious: s.attrCounts.Mysterious,
        unitScoreCount: s.unitScoreCount,
        pureScoreCount: s.pureScoreCount,
        scoreUpCount: s.scoreUpCount,
        pScoreCount: s.pScoreCount,
        accuracyCount: s.accuracyCount,
        recoveryCount: s.recoveryCount,
        fourStarCount: s.fourStarCount,
        threeStarCount: s.threeStarCount,
        twoStarCount: s.twoStarCount,
        rewardTotalCount: s.rewardTotalCount
      };
    })
    .sort((a, b) => compareVsMatrixName(a.name, b.name));

  const key = matrixSortKey.value;
  const order = matrixSortOrder.value;
  if (!key || !order) return baseRows;

  const orderFactor = order === 'desc' ? -1 : 1;
  return [...baseRows].sort((a, b) => {
    const av = Number(a?.[key] || 0);
    const bv = Number(b?.[key] || 0);
    if (av !== bv) return (av - bv) * orderFactor;
    return compareVsMatrixName(a.name, b.name);
  });
});

const attrMatrixTotalRow = computed(() => {
  const seed = {
    Pure: 0,
    Cool: 0,
    Cute: 0,
    Happy: 0,
    Mysterious: 0,
    unitScoreCount: 0,
    pureScoreCount: 0,
    scoreUpCount: 0,
    pScoreCount: 0,
    accuracyCount: 0,
    recoveryCount: 0,
    fourStarCount: 0,
    threeStarCount: 0,
    twoStarCount: 0,
    rewardTotalCount: 0
  };

  return (attrMatrixRows.value || []).reduce((acc, row) => {
    ATTRS.forEach((attr) => {
      acc[attr] += Number(row?.[attr] || 0);
    });
    acc.unitScoreCount += Number(row?.unitScoreCount || 0);
    acc.pureScoreCount += Number(row?.pureScoreCount || 0);
    acc.scoreUpCount += Number(row?.scoreUpCount || 0);
    acc.pScoreCount += Number(row?.pScoreCount || 0);
    acc.accuracyCount += Number(row?.accuracyCount || 0);
    acc.recoveryCount += Number(row?.recoveryCount || 0);
    acc.fourStarCount += Number(row?.fourStarCount || 0);
    acc.threeStarCount += Number(row?.threeStarCount || 0);
    acc.twoStarCount += Number(row?.twoStarCount || 0);
    acc.rewardTotalCount += Number(row?.rewardTotalCount || 0);
    return acc;
  }, seed);
});

const getVsUnitTotalTint = (unit) => hexToRgba(UNIT_COLORS[unit] || '#64748b', 0.2);

const virtualSingerUnitTotalRows = computed(() => {
  const unitRows = Object.fromEntries(VS_UNIT_SORT_ORDER.map((unit) => [unit, {
    unit,
    Pure: 0,
    Cool: 0,
    Cute: 0,
    Happy: 0,
    Mysterious: 0,
    unitScoreCount: 0,
    pureScoreCount: 0,
    scoreUpCount: 0,
    pScoreCount: 0,
    accuracyCount: 0,
    recoveryCount: 0,
    fourStarCount: 0,
    threeStarCount: 0,
    twoStarCount: 0,
    rewardTotalCount: 0
  }]));

  (virtualSingerMatrixRows.value || []).forEach((row) => {
    const unit = parseVsMatrixRowName(row?.name).unit;
    if (!unitRows[unit]) return;
    ATTRS.forEach((attr) => {
      unitRows[unit][attr] += Number(row?.[attr] || 0);
    });
    unitRows[unit].unitScoreCount += Number(row?.unitScoreCount || 0);
    unitRows[unit].pureScoreCount += Number(row?.pureScoreCount || 0);
    unitRows[unit].scoreUpCount += Number(row?.scoreUpCount || 0);
    unitRows[unit].pScoreCount += Number(row?.pScoreCount || 0);
    unitRows[unit].accuracyCount += Number(row?.accuracyCount || 0);
    unitRows[unit].recoveryCount += Number(row?.recoveryCount || 0);
    unitRows[unit].fourStarCount += Number(row?.fourStarCount || 0);
    unitRows[unit].threeStarCount += Number(row?.threeStarCount || 0);
    unitRows[unit].twoStarCount += Number(row?.twoStarCount || 0);
    unitRows[unit].rewardTotalCount += Number(row?.rewardTotalCount || 0);
  });

  const baseRows = VS_UNIT_SORT_ORDER.map((unit) => unitRows[unit]);
  const key = matrixSortKey.value;
  const order = matrixSortOrder.value;
  if (!key || !order) return baseRows;

  const orderFactor = order === 'desc' ? -1 : 1;
  return [...baseRows].sort((a, b) => {
    const av = Number(a?.[key] || 0);
    const bv = Number(b?.[key] || 0);
    if (av !== bv) return (av - bv) * orderFactor;
    const au = VS_UNIT_SORT_ORDER.indexOf(String(a?.unit || ''));
    const bu = VS_UNIT_SORT_ORDER.indexOf(String(b?.unit || ''));
    const ao = au >= 0 ? au : 999;
    const bo = bu >= 0 ? bu : 999;
    return ao - bo;
  });
});

const buildUnitAttrExtremes = (rows) => {
  const result = {};
  const unitBuckets = {};
  rows.forEach((row) => {
    const unit = getUnitByChar(row.name);
    if (!unitBuckets[unit]) unitBuckets[unit] = [];
    unitBuckets[unit].push(row);
  });

  Object.entries(unitBuckets).forEach(([unit, rows]) => {
    const values = rows.flatMap((r) => ATTRS.map((attr) => Number(r[attr]) || 0));
    const max = values.length ? Math.max(...values) : 0;
    const min = values.length ? Math.min(...values) : 0;
    result[unit] = { max, min };
  });

  return result;
};

const unitAttrExtremes = computed(() => buildUnitAttrExtremes(attrMatrixRows.value));

const getAttrExtremeClass = (attr, value, name) => {
  void attr;
  const unit = getUnitByChar(name);
  const range = unitAttrExtremes.value?.[unit];
  if (!range) return '';
  if (range.max !== range.min && value === range.max) return 'matrix-max';
  if (range.max !== range.min && value === range.min) return 'matrix-min';
  return '';
};

const getVsMatrixValueClass = (value) => (Number(value || 0) === 0 ? 'matrix-vs-zero' : '');

const getAttrSummaryAttrRowStyle = (attr) => {
  const color = ATTR_COLORS[String(attr || '').trim()] || '#94a3b8';
  return { '--attr-summary-row-bg': hexToSoftSolid(color, 0.84) };
};

const charEventBuckets = computed(() => {
  const maxEid = safeMaxEventId.value;
  const maxEventDate = parseDateSafe(eventsById.value[maxEid]?.date);
  const buckets = {};

  (props.allCards || []).forEach((card) => {
    const name = String(card?.Name || '').trim();
    if (!name || name === '-' || name === 'CardID') return;
    if (!CHAR_ORDER[name]) return;
    if (!isCardWithinLimit(card, maxEid)) return;

    const eidRaw = String(card?.EventID || '').trim();
    const gachaRaw = String(card?.GachaID || '').trim();
    const sourceKey = eidRaw || gachaRaw;
    if (!sourceKey) return;

    const isNum = isNumericEventId(sourceKey);
    const eventIdOrKey = isNum ? Number(sourceKey) : sourceKey;
    const ev = isNum ? eventsById.value[Number(sourceKey)] : null;
    const cardDate = parseDateSafe(card?.Date);
    if (!isNum && maxEventDate && cardDate && cardDate > maxEventDate) return;

    if (!buckets[name]) {
      buckets[name] = {
        four: new Set(),
        limited: new Set(),
        eventMeta: {}
      };
    }

    if (!buckets[name].eventMeta[sourceKey]) {
      buckets[name].eventMeta[sourceKey] = {
        id: eventIdOrKey,
        date: String(ev?.date || card?.Date || ''),
        title: String(ev?.event_title || '').trim() || `ID ${sourceKey}`,
        typeSeriesId: ev?.type_series_id,
        eventType: String(ev?.event_type || '').trim(),
        banner: String(ev?.banner || '').trim(),
        unit: String(ev?.unit || '').trim() || String(card?.Affiliation || '').trim(),
        sourceKey,
        isFesCard: false,
        fesType: ''
      };
    }

    if (isFesCardType(card?.Type)) {
      buckets[name].eventMeta[sourceKey].isFesCard = true;
      const fesType = String(card?.Type || '').trim().toLowerCase();
      if (fesType === 'bfes' || fesType === 'cfes') {
        const prev = String(buckets[name].eventMeta[sourceKey].fesType || '').trim().toLowerCase();
        if (!prev || (prev === 'cfes' && fesType === 'bfes')) {
          buckets[name].eventMeta[sourceKey].fesType = fesType;
        }
      }
    }

    if (String(card?.Rarity || '').trim() === '4') {
      buckets[name].four.add(sourceKey);
    }
    if (LIMITED_TYPES.has(String(card?.Type || '').toLowerCase())) {
      buckets[name].limited.add(sourceKey);
    }
  });

  const toEvents = (set, metaMap) => [...set]
    .map((key) => metaMap[key])
    .filter(Boolean)
    .sort((a, b) => {
      const da = parseDateSafe(a.date)?.getTime() || 0;
      const db = parseDateSafe(b.date)?.getTime() || 0;
      if (da !== db) return da - db;
      return String(a.sourceKey).localeCompare(String(b.sourceKey));
    });

  const result = {};
  Object.keys(buckets).forEach((name) => {
    result[name] = {
      four: toEvents(buckets[name].four, buckets[name].eventMeta),
      limited: toEvents(buckets[name].limited, buckets[name].eventMeta)
    };
  });
  return result;
});

const lastFourStarRecords = computed(() => {
  return Object.keys(charEventBuckets.value)
    .map((name) => {
      const arr = charEventBuckets.value[name].four;
      if (!arr.length) return null;
      const last = arr[arr.length - 1];
      return {
        name,
        eventId: Number(last.id),
        eventLabel: getNonBanEventMark(last),
        eventRef: last,
        date: last.date,
        months: monthsSince(last.date),
        periods: countPeriodsSince(last)
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const da = parseDateSafe(a.date)?.getTime() || 0;
      const db = parseDateSafe(b.date)?.getTime() || 0;
      // Older first (longer since last appearance should be on top)
      if (da !== db) return da - db;
      return compareCharOrder(a.name, b.name);
    });
});

const buildVsUnitKey = (baseName, unit) => `${baseName} ${unit}`;

const parseVsUnitKey = (key) => {
  const [baseName, unitRaw] = String(key || '').trim().split(/\s+/);
  const unit = String(unitRaw || '').toLowerCase();
  return { baseName, unit };
};

const getVsUnitVariantAvatarSrc = (key, name) => {
  const { unit } = parseVsUnitKey(key);
  const baseName = String(name || '').trim();
  const fallbackAbbr = String(getCharAbbr(baseName) || '').trim().toLowerCase();
  const baseAbbr = String(CHAR_MAP[baseName] || fallbackAbbr).trim().toLowerCase();
  if (baseAbbr && unit) {
    return `/chibi_s/${baseAbbr}_${unit}.webp`;
  }
  return `/chibi_s/${fallbackAbbr || baseAbbr}.webp`;
};

const onVsUnitVariantAvatarError = (event) => {
  const target = event?.target;
  if (!(target instanceof HTMLImageElement)) return;
  if (target.dataset.fallbackApplied === '1') return;

  const altText = String(target.alt || '').trim();
  const fallbackAbbr = String(getCharAbbr(altText) || '').trim().toLowerCase();
  if (!fallbackAbbr) return;
  target.dataset.fallbackApplied = '1';
  target.src = `/chibi_s/${fallbackAbbr}.webp`;
};

const getVsUnitLogoByKey = (key) => {
  const { unit } = parseVsUnitKey(key);
  return unitLogoMap[unit] || '';
};

const getVsOriginalStatType = (card, sourceKey) => {
  const normalizedSourceKey = String(sourceKey || '').trim().toLowerCase();
  if (normalizedSourceKey === 'c1') return '大罪';

  const cardType = String(card?.Type || '').trim().toLowerCase();
  if (cardType === 'cfes') return 'CFES';
  if (cardType === 'bfes') return 'BFES';
  if (cardType.startsWith('wl1')) return 'WL1';
  if (cardType.startsWith('wl2')) return 'WL2';
  if (cardType.startsWith('wl3')) return 'WL3';
  return '其他';
};

const VS_UNIT_ROW_KEYS = VS_NAMES.flatMap((vsName) =>
  VS_UNIT_SORT_ORDER.map((unit) => buildVsUnitKey(vsName, unit))
);

const getVsUnitRecordLabel = (nameWithUnit) => {
  const [baseName, unitRaw] = String(nameWithUnit || '').trim().split(/\s+/);
  const baseAbbr = CHAR_MAP[baseName] || getCharAbbr(baseName);
  const unit = String(unitRaw || '').toUpperCase();
  return `${baseAbbr} ${unit}`;
};

const vsUnitLastFourRecords = computed(() => {
  const maxEid = safeMaxEventId.value;
  const maxEventDate = parseDateSafe(eventsById.value[maxEid]?.date);
  const latestByKey = {};

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinLimit(card, maxEid)) return;
    if (String(card?.Rarity || '').trim() !== '4') return;

    const fullName = String(card?.Name || '').trim();
    const baseName = fullName.split(/\s+/)[0] || fullName;
    if (!VS_NAMES.includes(baseName)) return;

    const unit = String(card?.Affiliation || '').trim().toLowerCase();
    if (!VS_UNIT_SORT_ORDER.includes(unit)) return;

    const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
    if (!sourceKey) return;

    const isNum = isNumericEventId(sourceKey);
    const ev = isNum ? eventsById.value[Number(sourceKey)] : null;
    const eventDateStr = String(ev?.date || card?.Date || '').trim();
    const eventDate = parseDateSafe(eventDateStr);
    if (!eventDate) return;
    if (!isNum && maxEventDate && eventDate > maxEventDate) return;

    const recordKey = buildVsUnitKey(baseName, unit);
    const prev = latestByKey[recordKey];
    const nextRecord = {
      key: recordKey,
      name: recordKey,
      label: getVsUnitRecordLabel(recordKey),
      eventRef: ev
        ? {
            id: Number(ev.id),
            date: ev.date,
            typeSeriesId: ev.type_series_id,
            eventType: String(ev.event_type || '').trim(),
            banner: String(ev.banner || '').trim(),
            unit: String(ev.unit || '').trim(),
            sourceKey: String(ev.id)
          }
        : null,
      eventLabel: ev
        ? getNonBanEventMark({
            id: Number(ev.id),
            typeSeriesId: ev.type_series_id,
            eventType: String(ev.event_type || '').trim(),
            banner: String(ev.banner || '').trim(),
            unit: String(ev.unit || '').trim(),
            sourceKey: String(ev.id)
          })
        : `ID ${sourceKey}`,
      date: eventDateStr,
      dateValue: eventDate.getTime(),
      days: daysBetween(eventDateStr, referenceDateStr.value),
      periods: ev ? countPeriodsSince({ id: Number(ev.id), date: ev.date }) : 0
    };

    if (!prev || nextRecord.dateValue > prev.dateValue) {
      latestByKey[recordKey] = nextRecord;
    }
  });

  return VS_UNIT_ROW_KEYS.map((key) => {
    const hit = latestByKey[key];
    if (hit) return hit;
    return {
      key,
      name: key,
      label: getVsUnitRecordLabel(key),
      eventRef: null,
      eventLabel: '-',
      date: '-',
      dateValue: 0,
      days: 0,
      periods: 0
    };
  });
});

const vsUnitLastFourRecordsSorted = computed(() => {
  const rows = [...vsUnitLastFourRecords.value];
  if (vsUnitLastFourSort.value === 'date-desc') {
    return rows.sort((a, b) => {
      const av = a.dateValue || 0;
      const bv = b.dateValue || 0;
      if (bv !== av) return bv - av;
      return VS_UNIT_ROW_KEYS.indexOf(a.key) - VS_UNIT_ROW_KEYS.indexOf(b.key);
    });
  }
  if (vsUnitLastFourSort.value === 'date-asc') {
    return rows.sort((a, b) => {
      const aMiss = !a.dateValue;
      const bMiss = !b.dateValue;
      if (aMiss !== bMiss) return aMiss ? 1 : -1;
      const av = a.dateValue || 0;
      const bv = b.dateValue || 0;
      if (av !== bv) return av - bv;
      return VS_UNIT_ROW_KEYS.indexOf(a.key) - VS_UNIT_ROW_KEYS.indexOf(b.key);
    });
  }
  return rows;
});

const vsUnitLastFourCompactRows = computed(() => {
  const rowMap = Object.fromEntries(
    VS_NAMES.map((name) => [name, { name, daysByUnit: Object.fromEntries(VS_UNIT_SORT_ORDER.map((u) => [u, 0])) }])
  );

  vsUnitLastFourRecords.value.forEach((item) => {
    const { baseName, unit } = parseVsUnitKey(item.key);
    if (!rowMap[baseName] || !VS_UNIT_SORT_ORDER.includes(unit)) return;
    rowMap[baseName].daysByUnit[unit] = Number(item.days || 0);
  });

  return VS_NAMES.map((name) => rowMap[name]);
});

const vsUnitLastFourCompactUnitRows = computed(() => {
  const rowMap = Object.fromEntries(
    VS_UNIT_SORT_ORDER.map((unit) => [unit, { unit, daysByVs: Object.fromEntries(VS_NAMES.map((name) => [name, 0])) }])
  );

  vsUnitLastFourRecords.value.forEach((item) => {
    const { baseName, unit } = parseVsUnitKey(item.key);
    if (!rowMap[unit] || !VS_NAMES.includes(baseName)) return;
    rowMap[unit].daysByVs[baseName] = Number(item.days || 0);
  });

  return VS_UNIT_SORT_ORDER.map((unit) => rowMap[unit]);
});

const vsUnitScoreAttrRows = computed(() => {
  const maxEid = safeMaxEventId.value;
  const maxEventDate = parseDateSafe(eventsById.value[maxEid]?.date);
  const rowMap = Object.fromEntries(
    VS_NAMES.map((name) => [
      name,
      {
        name,
        attrsByUnit: Object.fromEntries(VS_UNIT_SORT_ORDER.map((u) => [u, []]))
      }
    ])
  );

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinLimit(card, maxEid)) return;
    const skill = String(card?.Skill || '').trim().toLowerCase();
    if (skill !== 'unit_score') return;

    const fullName = String(card?.Name || '').trim();
    const baseName = fullName.split(/\s+/)[0] || fullName;
    if (!VS_NAMES.includes(baseName)) return;

    const unit = String(card?.Affiliation || '').trim().toLowerCase();
    if (!VS_UNIT_SORT_ORDER.includes(unit)) return;

    const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
    if (!sourceKey) return;
    const isNum = isNumericEventId(sourceKey);
    const ev = isNum ? eventsById.value[Number(sourceKey)] : null;
    const eventDate = parseDateSafe(String(ev?.date || card?.Date || '').trim());
    if (!eventDate) return;
    if (!isNum && maxEventDate && eventDate > maxEventDate) return;

    const attr = normalizeAttr(card?.Attribute);
    if (!ATTRS.includes(attr)) return;
    rowMap[baseName].attrsByUnit[unit].push(attr);
  });

  return VS_NAMES.map((name) => rowMap[name]);
});

const vsUnitScoreAttrByUnitRows = computed(() => {
  const maxEid = safeMaxEventId.value;
  const maxEventDate = parseDateSafe(eventsById.value[maxEid]?.date);
  const rowMap = Object.fromEntries(
    VS_UNIT_SORT_ORDER.map((unit) => [
      unit,
      {
        unit,
        attrsByVs: Object.fromEntries(VS_NAMES.map((name) => [name, []])),
        cardsByVs: Object.fromEntries(VS_NAMES.map((name) => [name, []]))
      }
    ])
  );

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinLimit(card, maxEid)) return;
    const skill = String(card?.Skill || '').trim().toLowerCase();
    if (skill !== 'unit_score') return;

    const fullName = String(card?.Name || '').trim();
    const baseName = fullName.split(/\s+/)[0] || fullName;
    if (!VS_NAMES.includes(baseName)) return;

    const unit = String(card?.Affiliation || '').trim().toLowerCase();
    if (!VS_UNIT_SORT_ORDER.includes(unit)) return;

    const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
    if (!sourceKey) return;
    const isNum = isNumericEventId(sourceKey);
    const ev = isNum ? eventsById.value[Number(sourceKey)] : null;
    const eventDate = parseDateSafe(String(ev?.date || card?.Date || '').trim());
    if (!eventDate) return;
    if (!isNum && maxEventDate && eventDate > maxEventDate) return;

    const attr = normalizeAttr(card?.Attribute);
    const cardId = getCardProgressOrderId(card);
    rowMap[unit].cardsByVs[baseName].push({
      cardId,
      attr,
      name: baseName,
      imageSrc: buildCardImageSrc(card?.CardID, baseName, { rarity: String(card?.Rarity || '4') })
    });
  });

  return VS_UNIT_SORT_ORDER.map((unit) => {
    const row = rowMap[unit];
    VS_NAMES.forEach((name) => {
      row.cardsByVs[name].sort((a, b) => {
        const aid = Number(a?.cardId || 0);
        const bid = Number(b?.cardId || 0);
        if (aid !== bid) return aid - bid;
        return ATTRS.indexOf(a?.attr) - ATTRS.indexOf(b?.attr);
      });
      row.attrsByVs[name] = row.cardsByVs[name]
        .map((item) => item?.attr)
        .filter((attr) => ATTRS.includes(attr));
    });
    return row;
  });
});

const vsUnitFourCountDetailRecords = computed(() => {
  const maxEid = safeMaxEventId.value;
  const maxEventDate = parseDateSafe(eventsById.value[maxEid]?.date);
  const rowMap = Object.fromEntries(
    VS_UNIT_ROW_KEYS.map((key) => {
      const { baseName } = parseVsUnitKey(key);
      return [
        key,
        {
          key,
          name: baseName,
          label: getVsUnitRecordLabel(key),
          count: 0,
          attrs: [],
          cards: []
        }
      ];
    })
  );

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinLimit(card, maxEid)) return;
    if (String(card?.Rarity || '').trim() !== '4') return;

    const fullName = String(card?.Name || '').trim();
    const baseName = fullName.split(/\s+/)[0] || fullName;
    if (!VS_NAMES.includes(baseName)) return;

    const unit = String(card?.Affiliation || '').trim().toLowerCase();
    if (!VS_UNIT_SORT_ORDER.includes(unit)) return;

    const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
    if (!sourceKey) return;
    const isNum = isNumericEventId(sourceKey);
    const ev = isNum ? eventsById.value[Number(sourceKey)] : null;
    const eventDate = parseDateSafe(String(ev?.date || card?.Date || '').trim());
    if (!eventDate) return;
    if (!isNum && maxEventDate && eventDate > maxEventDate) return;

    const key = buildVsUnitKey(baseName, unit);
    const row = rowMap[key];
    if (!row) return;

    const attr = normalizeAttr(card?.Attribute);
    row.cards.push({
      cardId: getCardProgressOrderId(card),
      attr,
      name: baseName,
      imageSrc: buildCardImageSrc(card?.CardID, baseName, { rarity: String(card?.Rarity || '4') })
    });
  });

  return VS_UNIT_ROW_KEYS.map((key) => {
    const row = rowMap[key];
    row.cards.sort((a, b) => {
      const aid = Number(a?.cardId || 0);
      const bid = Number(b?.cardId || 0);
      if (aid !== bid) return aid - bid;
      return ATTRS.indexOf(a?.attr) - ATTRS.indexOf(b?.attr);
    });
    row.attrs = row.cards
      .map((item) => item?.attr)
      .filter((attr) => ATTRS.includes(attr));
    row.count = row.cards.length;
    return row;
  });
});

const vsUnitFourCountRows = computed(() => {
  const rowMap = Object.fromEntries(
    VS_UNIT_SORT_ORDER.map((unit) => [
      unit,
      {
        unit,
        countByVs: Object.fromEntries(VS_NAMES.map((name) => [name, 0]))
      }
    ])
  );

  vsUnitFourCountDetailRecords.value.forEach((item) => {
    const { baseName, unit } = parseVsUnitKey(item?.key);
    if (!rowMap[unit] || !VS_NAMES.includes(baseName)) return;
    rowMap[unit].countByVs[baseName] = Number(item?.count || 0);
  });

  return VS_UNIT_SORT_ORDER.map((unit) => rowMap[unit]);
});

const vsUnitFourCountMax = computed(() => {
  const values = vsUnitFourCountRows.value
    .flatMap((row) => VS_NAMES.map((name) => Number(row?.countByVs?.[name] || 0)))
    .filter((v) => Number.isFinite(v) && v > 0);
  return values.length ? Math.max(...values) : 0;
});

const vsUnitFourCountMin = computed(() => {
  const values = vsUnitFourCountRows.value
    .flatMap((row) => VS_NAMES.map((name) => Number(row?.countByVs?.[name] || 0)))
    .filter((v) => Number.isFinite(v) && v > 0);
  return values.length ? Math.min(...values) : 0;
});

const getVsFourCountMiniCellClass = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n === vsUnitFourCountMax.value && vsUnitFourCountMax.value > 0) return 'vs-four-count-max';
  if (n === vsUnitFourCountMin.value && vsUnitFourCountMin.value > 0) return 'vs-four-count-min';
  return '';
};

const vsUnitFourCountDisplayRecords = computed(() => {
  const rows = [...vsUnitFourCountDetailRecords.value];
  if (vsUnitFourCountSort.value === 'count-desc') {
    return rows.sort((a, b) => {
      const av = Number(a?.count || 0);
      const bv = Number(b?.count || 0);
      if (bv !== av) return bv - av;
      return VS_UNIT_ROW_KEYS.indexOf(a.key) - VS_UNIT_ROW_KEYS.indexOf(b.key);
    });
  }
  if (vsUnitFourCountSort.value === 'count-asc') {
    return rows.sort((a, b) => {
      const av = Number(a?.count || 0);
      const bv = Number(b?.count || 0);
      if (av !== bv) return av - bv;
      return VS_UNIT_ROW_KEYS.indexOf(a.key) - VS_UNIT_ROW_KEYS.indexOf(b.key);
    });
  }
  return rows;
});

const vsOriginalStatRows = computed(() => {
  const maxEid = safeMaxEventId.value;
  const maxEventDate = parseDateSafe(eventsById.value[maxEid]?.date);
  const rowMap = Object.fromEntries(
    VS_ORIGINAL_STAT_TYPES.map((type) => [
      type,
      {
        type,
        attrsByVs: Object.fromEntries(VS_NAMES.map((name) => [name, []])),
        cardsByVs: Object.fromEntries(VS_NAMES.map((name) => [name, []]))
      }
    ])
  );

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinLimit(card, maxEid)) return;
    if (String(card?.Rarity || '').trim() !== '4') return;

    const fullName = String(card?.Name || '').trim();
    const baseName = fullName.split(/\s+/)[0] || fullName;
    if (!VS_NAMES.includes(baseName)) return;

    const unit = String(card?.Affiliation || '').trim().toLowerCase();
    if (unit !== 'vs') return;

    const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
    if (!sourceKey) return;
    const isNum = isNumericEventId(sourceKey);
    const ev = isNum ? eventsById.value[Number(sourceKey)] : null;
    const eventDate = parseDateSafe(String(ev?.date || card?.Date || '').trim());
    if (!eventDate) return;
    if (!isNum && maxEventDate && eventDate > maxEventDate) return;

    const attr = normalizeAttr(card?.Attribute);
    const statType = getVsOriginalStatType(card, sourceKey);
    if (!rowMap[statType]) return;
    rowMap[statType].cardsByVs[baseName].push({
      cardId: getCardProgressOrderId(card),
      attr,
      name: baseName,
      imageSrc: buildCardImageSrc(card?.CardID, baseName, { rarity: String(card?.Rarity || '4') })
    });
  });

  return VS_ORIGINAL_STAT_TYPES.map((type) => {
    const row = rowMap[type];
    VS_NAMES.forEach((name) => {
      row.cardsByVs[name].sort((a, b) => {
        const aid = Number(a?.cardId || 0);
        const bid = Number(b?.cardId || 0);
        if (aid !== bid) return aid - bid;
        return ATTRS.indexOf(a?.attr) - ATTRS.indexOf(b?.attr);
      });
      row.attrsByVs[name] = row.cardsByVs[name]
        .map((item) => item?.attr)
        .filter((attr) => ATTRS.includes(attr));
    });
    return row;
  });
});

const getVsOriginalOtherRowCards = (row) => {
  if (!row?.cardsByVs) return [];
  if (VS_NAMES.includes('初音未来') && row.cardsByVs['初音未来']?.length) {
    return row.cardsByVs['初音未来'];
  }
  for (let i = 0; i < VS_NAMES.length; i += 1) {
    const key = VS_NAMES[i];
    if (row.cardsByVs[key]?.length) return row.cardsByVs[key];
  }
  return [];
};

const getVsOriginalOtherRowAttrs = (row) => {
  if (!row?.attrsByVs) return [];
  if (VS_NAMES.includes('初音未来') && row.attrsByVs['初音未来']?.length) {
    return row.attrsByVs['初音未来'];
  }
  for (let i = 0; i < VS_NAMES.length; i += 1) {
    const key = VS_NAMES[i];
    if (row.attrsByVs[key]?.length) return row.attrsByVs[key];
  }
  return [];
};

const vsUnitLastFourMaxDays = computed(() => {
  const values = vsUnitLastFourCompactUnitRows.value
    .flatMap((row) => VS_NAMES.map((name) => Number(row?.daysByVs?.[name] || 0)))
    .filter((v) => v > 0);
  return values.length ? Math.max(...values) : 0;
});

const getVsMiniUnitHeadStyle = (unit) => ({
  backgroundColor: hexToRgba(UNIT_COLORS[unit] || '#9ca3af', 0.28)
});

const getVsMiniVsHeadStyle = (name) => ({
  backgroundColor: hexToRgba(getCharColor(name), 0.28)
});

const getVsScoreUnitHeadStyle = (unit) => ({
  backgroundColor: hexToRgba(UNIT_COLORS[unit] || '#9ca3af', 0.28)
});

const getVsScoreVsHeadStyle = (name) => ({
  backgroundColor: hexToRgba(getCharColor(name), 0.26)
});

const getVsScoreCellStyle = (name, unit) => ({
  backgroundImage: `linear-gradient(${hexToRgba(getCharColor(name), 0.12)}, ${hexToRgba(getCharColor(name), 0.12)}), linear-gradient(${hexToRgba(UNIT_COLORS[unit] || '#9ca3af', 0.12)}, ${hexToRgba(UNIT_COLORS[unit] || '#9ca3af', 0.12)})`,
  backgroundColor: '#f8fafc'
});

const getVsOriginalStatCellStyle = (name) => ({
  backgroundImage: `linear-gradient(${hexToRgba(getCharColor(name), 0.14)}, ${hexToRgba(getCharColor(name), 0.14)})`,
  backgroundColor: '#f8fafc'
});

const getVsMiniDataCellStyle = (days) => {
  const d = Number(days || 0);
  if (d <= 0) {
    return {
      backgroundColor: 'rgb(245, 247, 250)',
      color: '#94a3b8'
    };
  }
  const maxDays = Math.max(1, Number(vsUnitLastFourMaxDays.value || 1));
  const ratio = Math.min(1, d / maxDays);
  const shade = Math.round(245 - (ratio * 95));
  const bg = `rgb(${shade}, ${shade}, ${shade})`;
  const fg = shade < 175 ? '#ffffff' : '#1f2937';
  return {
    backgroundColor: bg,
    color: fg,
    fontWeight: 700
  };
};

const getFesMatrixAttrHeadStyle = (attr) => ({
  backgroundColor: hexToRgba(ATTR_COLORS[attr] || '#94a3b8', 0.18)
});

const getFesMatrixUnitHeadStyle = (unit) => ({
  backgroundColor: hexToRgba(UNIT_COLORS[unit] || '#94a3b8', 0.2)
});

const getFesMatrixCellStyle = (unit, attr) => ({
  backgroundImage: `linear-gradient(${hexToRgba(UNIT_COLORS[unit] || '#94a3b8', 0.12)}, ${hexToRgba(UNIT_COLORS[unit] || '#94a3b8', 0.12)}), linear-gradient(${hexToRgba(ATTR_COLORS[attr] || '#94a3b8', 0.12)}, ${hexToRgba(ATTR_COLORS[attr] || '#94a3b8', 0.12)})`,
  backgroundColor: '#f8fafc'
});

const getFesMatrixUnitStripCellStyle = (unit) => ({
  backgroundColor: hexToRgba(UNIT_COLORS[unit] || '#94a3b8', 0.14)
});

const getFesMatrixTotalCellStyle = (attr) => ({
  fontWeight: 800
});

const getFesMatrixTotalChipStyle = (attr) => ({
  backgroundColor: hexToRgba(ATTR_COLORS[attr] || '#94a3b8', 0.2),
  fontWeight: 800
});

const createFesIconRowsSeed = () => Object.fromEntries(
  RELATED_FES_UNITS.map((unit) => [
    unit,
    Object.fromEntries(ATTRS.map((attr) => [attr, []]))
  ])
);

const createFesIconSeenSeed = () => Object.fromEntries(
  RELATED_FES_UNITS.map((unit) => [
    unit,
    Object.fromEntries(ATTRS.map((attr) => [attr, new Set()]))
  ])
);

const createFesCardsSeed = () => Object.fromEntries(
  RELATED_FES_UNITS.map((unit) => [unit, []])
);

const getCardFolderByName = (name) => {
  const key = String(name || '').trim();
  if (!key) return '';
  return CHAR_CARD_FOLDER_MAP.value[key] || '';
};

const cardRarityByIdMap = computed(() => {
  const result = {};
  (props.allCards || []).forEach((card) => {
    const cardId = Number(card?.CardID);
    if (!Number.isFinite(cardId) || cardId <= 0) return;
    const rarity = String(card?.Rarity || '').trim();
    if (!rarity) return;
    result[cardId] = rarity;
  });
  return result;
});

const getCardRarityTier = (rarityValue) => {
  const rarityNum = Number(String(rarityValue || '').trim());
  if (!Number.isFinite(rarityNum)) return 0;
  return rarityNum;
};

const shouldUseAfterCardImage = (cardId, rarityHint = '') => {
  if (navCardImageMode.value !== 'after') return false;
  const idNum = Number(cardId);
  const rarityRaw = String(rarityHint || cardRarityByIdMap.value[idNum] || '').trim();
  const rarityTier = getCardRarityTier(rarityRaw);
  // 1/2星卡没有花后图，即使选择花后模式也回退花前。
  if (rarityTier > 0 && rarityTier <= 2) return false;
  return true;
};

const buildCardImageSrc = (cardId, baseName, options = {}) => {
  const idNum = Number(cardId);
  if (!Number.isFinite(idNum) || idNum <= 0) return '';

  const folder = getCardFolderByName(baseName);
  if (!folder) return '';

  const suffix = shouldUseAfterCardImage(idNum, options?.rarity) ? '_t' : '';
  return `/cards/${folder}/card${idNum}${suffix}.webp`;
};

const buildFesCardImageSrc = (cardId, baseName, fesType) => {
  void fesType;
  return buildCardImageSrc(cardId, baseName, { rarity: '4' });
};

const getLineupSlotCardImageSrc = (slot) => {
  const baseName = getCardBaseName(slot?.name);
  if (!baseName) return '';
  const idNum = Number(slot?.cardId);
  if (!Number.isFinite(idNum) || idNum <= 0) return '';
  return buildCardImageSrc(idNum, baseName, { rarity: '4' });
};

const markMediaImageSettled = (event) => {
  const target = event?.target;
  if (!(target instanceof HTMLImageElement)) return;
  target.dataset.loaded = '1';
};

const onMediaImageLoad = (event) => {
  markMediaImageSettled(event);
  const target = event?.target;
  if (!(target instanceof HTMLImageElement)) return;
  target.style.visibility = '';
};

const onMediaImageError = (event) => {
  markMediaImageSettled(event);
  const target = event?.target;
  if (!(target instanceof HTMLImageElement)) return;
  target.style.visibility = 'hidden';
};

const buildFesRecordMatrix = (fesType) => {
  const maxEid = safeMaxEventId.value;
  const targetType = String(fesType || '').trim().toLowerCase();
  const iconRows = createFesIconRowsSeed();
  const seenRows = createFesIconSeenSeed();
  const cardsByUnit = createFesCardsSeed();
  const totals = Object.fromEntries(ATTRS.map((attr) => [attr, 0]));

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinLimit(card, maxEid)) return;
    if (String(card?.Type || '').trim().toLowerCase() !== targetType) return;
    if (String(card?.Rarity || '').trim() !== '4') return;

    const baseName = getCardBaseName(card?.Name);
    if (!baseName || !CHAR_ORDER[baseName]) return;

    const attr = normalizeAttr(card?.Attribute);
    if (!ATTRS.includes(attr)) return;

    const unit = getLineupCardUnit(card, baseName);
    if (!RELATED_FES_UNITS.includes(unit)) return;

    cardsByUnit[unit].push({
      cardId: getCardProgressOrderId(card),
      attr,
      name: baseName,
      imageSrc: buildFesCardImageSrc(card?.CardID, baseName, targetType)
    });

    totals[attr] += 1;

    const iconKey = getSupportMemberIconKey({ name: baseName, unit });
    const uniqueKey = `${baseName}|${iconKey}`;
    const seen = seenRows[unit]?.[attr];
    if (!seen || seen.has(uniqueKey)) return;

    seen.add(uniqueKey);
    iconRows[unit][attr].push({
      name: baseName,
      iconKey
    });
  });

  RELATED_FES_UNITS.forEach((unit) => {
    cardsByUnit[unit].sort((a, b) => {
      const aid = Number(a?.cardId || 0);
      const bid = Number(b?.cardId || 0);
      if (aid !== bid) return aid - bid;
      const byName = compareCharOrder(a?.name, b?.name);
      if (byName !== 0) return byName;
      return String(a?.attr || '').localeCompare(String(b?.attr || ''));
    });

    ATTRS.forEach((attr) => {
      iconRows[unit][attr].sort((a, b) => compareCharOrder(a.name, b.name));
    });
  });

  return {
    iconRows,
    cardsByUnit,
    totals
  };
};

const cfesRecordMatrix = computed(() => buildFesRecordMatrix('cfes'));
const bfesRecordMatrix = computed(() => buildFesRecordMatrix('bfes'));

const lastLimitedRecords = computed(() => {
  return Object.keys(charEventBuckets.value)
    .map((name) => {
      const arr = charEventBuckets.value[name].limited;
      if (!arr.length) return null;
      const last = arr[arr.length - 1];
      return {
        name,
        eventId: Number(last.id),
        eventLabel: getNonBanEventMark(last),
        eventRef: last,
        date: last.date,
        months: monthsSince(last.date),
        periods: countPeriodsSince(last)
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const da = parseDateSafe(a.date)?.getTime() || 0;
      const db = parseDateSafe(b.date)?.getTime() || 0;
      // Older first (longer since last appearance should be on top)
      if (da !== db) return da - db;
      return compareCharOrder(a.name, b.name);
    });
});

const buildRelatedRecordCardInfoMap = (matcher) => {
  const maxEid = safeMaxEventId.value;
  const maxEventDate = parseDateSafe(eventsById.value[maxEid]?.date);
  const result = {};

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinLimit(card, maxEid)) return;
    if (typeof matcher === 'function' && !matcher(card)) return;

    const rawName = String(card?.Name || '').trim();
    const baseName = getCardBaseName(rawName);
    if (!baseName || !CHAR_ORDER[baseName]) return;

    const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
    if (!sourceKey) return;

    const isNumSource = isNumericEventId(sourceKey);
    if (!isNumSource && maxEventDate) {
      const cardDate = parseDateSafe(card?.Date);
      if (cardDate && cardDate > maxEventDate) return;
    }

    const cardId = Number(card?.CardID);
    if (!Number.isFinite(cardId) || cardId <= 0) return;
    const attr = normalizeAttr(card?.Attribute);
    const rarity = String(card?.Rarity || '').trim();

    const mapKey = `${baseName}::${sourceKey}`;
    const prev = result[mapKey];
    if (!prev || cardId > Number(prev?.cardId || 0)) {
      result[mapKey] = {
        cardId,
        attr: ATTRS.includes(attr) ? attr : '',
        rarity
      };
    }
  });

  return result;
};

const relatedLastRecordCardInfoMap = computed(() => buildRelatedRecordCardInfoMap(() => true));

const relatedFourStarCardInfoMap = computed(() => buildRelatedRecordCardInfoMap((card) => (
  String(card?.Rarity || '').trim() === '4'
)));

const relatedLimitedCardInfoMap = computed(() => buildRelatedRecordCardInfoMap((card) => {
  if (String(card?.Rarity || '').trim() !== '4') return false;
  const cardType = String(card?.Type || '').trim().toLowerCase();
  return LIMITED_TYPES.has(cardType);
}));

const getRelatedRecordCardInfo = (name, eventRef, options = {}) => {
  const baseName = String(name || '').trim();
  if (!baseName) return { imageSrc: '', attr: '' };

  const sourceKey = String(eventRef?.sourceKey || (isNumericEventId(eventRef?.id) ? eventRef.id : '') || '').trim();
  if (!sourceKey) return { imageSrc: '', attr: '' };

  const mapKey = `${baseName}::${sourceKey}`;
  const mode = String(options?.mode || '').trim().toLowerCase();
  const useFourStarOnly = options?.fourStarOnly === true;
  const useLimitedOnly = mode === 'limited';
  const useFourOnly = mode === 'four' || (useFourStarOnly && !useLimitedOnly);
  const infoMap = useLimitedOnly
    ? relatedLimitedCardInfoMap.value
    : (useFourOnly ? relatedFourStarCardInfoMap.value : relatedLastRecordCardInfoMap.value);
  const info = infoMap[mapKey] || null;
  const cardId = Number(info?.cardId || 0);
  if (!Number.isFinite(cardId) || cardId <= 0) return { imageSrc: '', attr: '' };

  return {
    imageSrc: buildCardImageSrc(cardId, baseName, { rarity: info?.rarity }),
    attr: ATTRS.includes(String(info?.attr || '')) ? String(info.attr) : ''
  };
};

const getRelatedLastRecordCardInfo = (name, eventRef) => {
  return getRelatedRecordCardInfo(name, eventRef, { mode: 'all' });
};

const getRelatedLimitedRecordCardInfo = (name, eventRef) => {
  return getRelatedRecordCardInfo(name, eventRef, { mode: 'limited' });
};

const vsUnitLastFourCardInfoMap = computed(() => {
  const maxEid = safeMaxEventId.value;
  const maxEventDate = parseDateSafe(eventsById.value[maxEid]?.date);
  const result = {};

  (props.allCards || []).forEach((card) => {
    if (!isCardWithinLimit(card, maxEid)) return;
    if (String(card?.Rarity || '').trim() !== '4') return;

    const fullName = String(card?.Name || '').trim();
    const baseName = getCardBaseName(fullName);
    if (!VS_NAMES.includes(baseName)) return;

    const unit = String(card?.Affiliation || '').trim().toLowerCase();
    if (!VS_UNIT_SORT_ORDER.includes(unit)) return;

    const sourceKey = String(card?.EventID || '').trim() || String(card?.GachaID || '').trim();
    if (!sourceKey) return;

    const isNumSource = isNumericEventId(sourceKey);
    if (!isNumSource && maxEventDate) {
      const cardDate = parseDateSafe(card?.Date);
      if (cardDate && cardDate > maxEventDate) return;
    }

    const cardId = Number(card?.CardID);
    if (!Number.isFinite(cardId) || cardId <= 0) return;
    const attr = normalizeAttr(card?.Attribute);

    const mapKey = `${baseName}::${unit}::${sourceKey}`;
    const prev = result[mapKey];
    if (!prev || cardId > Number(prev?.cardId || 0)) {
      result[mapKey] = {
        cardId,
        attr: ATTRS.includes(attr) ? attr : ''
      };
    }
  });

  return result;
});

const getVsUnitLastFourCardInfo = (row) => {
  const { baseName, unit } = parseVsUnitKey(row?.key);
  if (!baseName || !VS_UNIT_SORT_ORDER.includes(unit)) return { imageSrc: '', attr: '' };
  const sourceKey = String(row?.eventRef?.sourceKey || '').trim();
  if (!sourceKey) return { imageSrc: '', attr: '' };

  const mapKey = `${baseName}::${unit}::${sourceKey}`;
  const info = vsUnitLastFourCardInfoMap.value[mapKey] || null;
  const cardId = Number(info?.cardId || 0);
  if (!Number.isFinite(cardId) || cardId <= 0) return { imageSrc: '', attr: '' };

  const folder = getCardFolderByName(baseName);
  if (!folder) return { imageSrc: '', attr: '' };
  return {
    imageSrc: buildCardImageSrc(cardId, baseName, { rarity: '4' }),
    attr: ATTRS.includes(String(info?.attr || '')) ? String(info.attr) : ''
  };
};

const lastFourStarDisplayRecords = computed(() => (
  (lastFourStarRecords.value || []).map((row) => {
    const cardInfo = getRelatedLastRecordCardInfo(row.name, row.eventRef);
    return {
      ...row,
      cardImageSrc: cardInfo.imageSrc,
      cardAttr: cardInfo.attr
    };
  })
));

const lastLimitedDisplayRecords = computed(() => (
  (lastLimitedRecords.value || []).map((row) => {
    const cardInfo = getRelatedLimitedRecordCardInfo(row.name, row.eventRef);
    return {
      ...row,
      cardImageSrc: cardInfo.imageSrc,
      cardAttr: cardInfo.attr
    };
  })
));

const vsUnitLastFourDisplayRecords = computed(() => (
  (vsUnitLastFourRecordsSorted.value || []).map((row) => {
    const cardInfo = getVsUnitLastFourCardInfo(row);
    return {
      ...row,
      cardImageSrc: cardInfo.imageSrc,
      cardAttr: cardInfo.attr
    };
  })
));

const fourStarLongestDisplayRecords = computed(() => (
  (fourStarLongestIntervals.value || []).map((row) => {
    const startCard = getRelatedRecordCardInfo(row.name, row?.longest?.startRef, { mode: 'four' });
    const endCard = getRelatedRecordCardInfo(row.name, row?.longest?.endRef, { mode: 'four' });
    return {
      ...row,
      longestStartCardImageSrc: startCard.imageSrc,
      longestStartCardAttr: startCard.attr,
      longestEndCardImageSrc: endCard.imageSrc,
      longestEndCardAttr: endCard.attr
    };
  })
));

const fourStarShortestDisplayRecords = computed(() => (
  (fourStarShortestIntervals.value || []).map((row) => {
    const startCard = getRelatedRecordCardInfo(row.name, row?.shortest?.startRef, { mode: 'four' });
    const endCard = getRelatedRecordCardInfo(row.name, row?.shortest?.endRef, { mode: 'four' });
    return {
      ...row,
      shortestStartCardImageSrc: startCard.imageSrc,
      shortestStartCardAttr: startCard.attr,
      shortestEndCardImageSrc: endCard.imageSrc,
      shortestEndCardAttr: endCard.attr
    };
  })
));

const limitedLongestDisplayRecords = computed(() => (
  (limitedLongestIntervals.value || []).map((row) => {
    const startCard = getRelatedRecordCardInfo(row.name, row?.longest?.startRef, { mode: 'limited' });
    const endCard = getRelatedRecordCardInfo(row.name, row?.longest?.endRef, { mode: 'limited' });
    return {
      ...row,
      longestStartCardImageSrc: startCard.imageSrc,
      longestStartCardAttr: startCard.attr,
      longestEndCardImageSrc: endCard.imageSrc,
      longestEndCardAttr: endCard.attr
    };
  })
));

const limitedShortestDisplayRecords = computed(() => (
  (limitedShortestIntervals.value || []).map((row) => {
    const startCard = getRelatedRecordCardInfo(row.name, row?.shortest?.startRef, { mode: 'limited' });
    const endCard = getRelatedRecordCardInfo(row.name, row?.shortest?.endRef, { mode: 'limited' });
    return {
      ...row,
      shortestStartCardImageSrc: startCard.imageSrc,
      shortestStartCardAttr: startCard.attr,
      shortestEndCardImageSrc: endCard.imageSrc,
      shortestEndCardAttr: endCard.attr
    };
  })
));

const banLongestDisplayRecords = computed(() => (
  (banLongestIntervals.value || []).map((row) => {
    const startCard = getRelatedRecordCardInfo(row.name, row?.longest?.startRef, { mode: 'four' });
    const endCard = getRelatedRecordCardInfo(row.name, row?.longest?.endRef, { mode: 'four' });
    return {
      ...row,
      longestStartCardImageSrc: startCard.imageSrc,
      longestStartCardAttr: startCard.attr,
      longestEndCardImageSrc: endCard.imageSrc,
      longestEndCardAttr: endCard.attr
    };
  })
));

const banShortestDisplayRecords = computed(() => (
  (banShortestIntervals.value || []).map((row) => {
    const startCard = getRelatedRecordCardInfo(row.name, row?.shortest?.startRef, { mode: 'four' });
    const endCard = getRelatedRecordCardInfo(row.name, row?.shortest?.endRef, { mode: 'four' });
    return {
      ...row,
      shortestStartCardImageSrc: startCard.imageSrc,
      shortestStartCardAttr: startCard.attr,
      shortestEndCardImageSrc: endCard.imageSrc,
      shortestEndCardAttr: endCard.attr
    };
  })
));

const fourStarIntervalRecords = computed(() => {
  const nowGapDate = referenceDateStr.value;
  return Object.keys(charEventBuckets.value)
    .map((name) => {
      const arr = charEventBuckets.value[name].four;
      if (!arr.length) return null;
      const ranges = buildGapRanges(arr, countPeriodsBetweenExclusive);
      const historicalRanges = [...ranges];
      const last = arr[arr.length - 1];
      ranges.push({
        startMark: getNonBanEventMark(last),
        endMark: '至今',
        startRef: last,
        endRef: null,
        startTypeSeriesId: last.typeSeriesId,
        endTypeSeriesId: 'NOW',
        startEventType: last.eventType,
        endEventType: '当前',
        days: daysBetween(last.date, nowGapDate),
        periods: countPeriodsSince(last)
      });
      return {
        name,
        longest: pickGapByPeriods(ranges, 'max'),
        shortest: pickGap(historicalRanges, 'min')
      };
    })
    .filter(Boolean);
});

const limitedIntervalRecords = computed(() => {
  const nowGapDate = referenceDateStr.value;
  return Object.keys(charEventBuckets.value)
    .map((name) => {
      const arr = charEventBuckets.value[name].limited;
      if (!arr.length) return null;
      const ranges = buildGapRanges(arr, countPeriodsBetweenExclusive);
      const historicalRanges = [...ranges];
      const last = arr[arr.length - 1];
      ranges.push({
        startMark: getNonBanEventMark(last),
        endMark: '至今',
        startRef: last,
        endRef: null,
        startTypeSeriesId: last.typeSeriesId,
        endTypeSeriesId: 'NOW',
        startEventType: last.eventType,
        endEventType: '当前',
        days: daysBetween(last.date, nowGapDate),
        periods: countPeriodsSince(last)
      });
      return {
        name,
        longest: pickGapByPeriods(ranges, 'max'),
        shortest: pickGap(historicalRanges, 'min')
      };
    })
    .filter(Boolean);
});

const fourStarLongestIntervals = computed(() => {
  return [...fourStarIntervalRecords.value].sort((a, b) => {
    const ap = Number(a?.longest?.periods ?? -1);
    const bp = Number(b?.longest?.periods ?? -1);
    if (bp !== ap) return bp - ap;
    const ad = Number(a?.longest?.days ?? -1);
    const bd = Number(b?.longest?.days ?? -1);
    if (bd !== ad) return bd - ad;
    return compareCharOrder(a.name, b.name);
  });
});

const fourStarShortestIntervals = computed(() => {
  return [...fourStarIntervalRecords.value].sort((a, b) => {
    const ap = Number(a?.shortest?.periods ?? Number.POSITIVE_INFINITY);
    const bp = Number(b?.shortest?.periods ?? Number.POSITIVE_INFINITY);
    if (ap !== bp) return ap - bp;
    const ad = Number(a?.shortest?.days ?? Number.POSITIVE_INFINITY);
    const bd = Number(b?.shortest?.days ?? Number.POSITIVE_INFINITY);
    if (ad !== bd) return ad - bd;

    return compareCharOrder(a.name, b.name);
  });
});

const limitedLongestIntervals = computed(() => {
  return [...limitedIntervalRecords.value].sort((a, b) => {
    const ap = Number(a?.longest?.periods ?? -1);
    const bp = Number(b?.longest?.periods ?? -1);
    if (bp !== ap) return bp - ap;
    const ad = Number(a?.longest?.days ?? -1);
    const bd = Number(b?.longest?.days ?? -1);
    if (bd !== ad) return bd - ad;
    return compareCharOrder(a.name, b.name);
  });
});

const limitedShortestIntervals = computed(() => {
  return [...limitedIntervalRecords.value].sort((a, b) => {
    const ap = Number(a?.shortest?.periods ?? Number.POSITIVE_INFINITY);
    const bp = Number(b?.shortest?.periods ?? Number.POSITIVE_INFINITY);
    if (ap !== bp) return ap - bp;
    const ad = Number(a?.shortest?.days ?? Number.POSITIVE_INFINITY);
    const bd = Number(b?.shortest?.days ?? Number.POSITIVE_INFINITY);
    if (ad !== bd) return ad - bd;

    return compareCharOrder(a.name, b.name);
  });
});

const banIntervalRecords = computed(() => {
  const maxEid = safeMaxEventId.value;
  const typeFilter = banEventTypeFilter.value;
  const nowGapDate = referenceDateStr.value;
  const bucket = {};

  (props.allEvents || []).forEach((ev) => {
    if (shouldSkipPredictEvent(ev)) return;
    if (!isNumericEventId(ev?.id)) return;
    const eid = Number(ev.id);
    if (eid > maxEid) return;
    const eventType = String(ev?.event_type || '').trim();
    if (EXCLUDED_PERIOD_EVENT_TYPES.has(eventType)) return;
    if (typeFilter !== 'all' && eventType !== typeFilter) return;
    const name = normalizeBannerName(ev?.banner);
    if (!CHAR_ORDER[name]) return;
    if (VS_NAMES.includes(name)) return;

    if (!bucket[name]) bucket[name] = [];
    bucket[name].push({
      id: eid,
      sourceKey: String(eid),
      date: String(ev?.date || ''),
      typeSeriesId: ev?.type_series_id,
      eventType
    });
  });

  return Object.keys(bucket)
    .map((name) => {
      const events = bucket[name].sort((a, b) => a.id - b.id);
      if (!events.length) {
        return { name, shortest: null, longest: null };
      }
      const ranges = buildGapRanges(events, countPeriodsBetweenExclusive);
      const historicalRanges = [...ranges];
      const last = events[events.length - 1];
      // Align with four/limited longest logic: include gap from latest ban to current reference date.
      ranges.push({
        startMark: `${getTypeSeriesText(last.typeSeriesId) || '?'}${getEventTypeShort(last.eventType)}`,
        endMark: '至今',
        startRef: last,
        endRef: null,
        startTypeSeriesId: last.typeSeriesId,
        endTypeSeriesId: 'NOW',
        startEventType: last.eventType,
        endEventType: '当前',
        days: daysBetween(last.date, nowGapDate),
        periods: countPeriodsSince(last)
      });
      return {
        name,
        shortest: pickGap(historicalRanges, 'min'),
        longest: pickGapByPeriods(ranges, 'max')
      };
    })
    .sort((a, b) => compareCharOrder(a.name, b.name));
});

const banLongestIntervals = computed(() => {
  return [...banIntervalRecords.value].sort((a, b) => {
    const ap = Number(a?.longest?.periods ?? -1);
    const bp = Number(b?.longest?.periods ?? -1);
    if (bp !== ap) return bp - ap;
    const ad = Number(a?.longest?.days ?? -1);
    const bd = Number(b?.longest?.days ?? -1);
    if (bd !== ad) return bd - ad;
    return compareCharOrder(a.name, b.name);
  });
});

const banShortestIntervals = computed(() => {
  return [...banIntervalRecords.value].sort((a, b) => {
    const ap = Number(a?.shortest?.periods ?? Number.POSITIVE_INFINITY);
    const bp = Number(b?.shortest?.periods ?? Number.POSITIVE_INFINITY);
    if (ap !== bp) return ap - bp;
    const ad = Number(a?.shortest?.days ?? Number.POSITIVE_INFINITY);
    const bd = Number(b?.shortest?.days ?? Number.POSITIVE_INFINITY);
    if (ad !== bd) return ad - bd;
    return compareCharOrder(a.name, b.name);
  });
});

defineExpose({
  getTopBarState,
  setTopBarDisplayEventIdDraft,
  applyTopBarDisplayEventId,
  adjustTopBarDisplayEventId,
  resetTopBarDisplayEventId,
  toggleTopBarNavCollapsed
});
</script>

<style scoped>
.pjsk-stats {
  padding: 24px;
  color: #1f2937;
  background: linear-gradient(45deg, rgba(253, 124, 193, 0.30) 0%, rgba(135, 192, 255, 0.30) 50%, rgba(248, 255, 135, 0.30) 100%);
  min-height: 100vh;
  --matrix-sticky-top: 0px;
  --stats-radius-panel: 28px;
  --stats-radius-card: 22px;
  --stats-radius-btn: 12px;
  --stats-nav-width: 220px;
  --stats-nav-left: 44px;
  --stats-nav-top: 78px;
}

.pjsk-stats.matrix-sort-anchor-suppressed {
  overflow-anchor: none;
}

.pjsk-stats button:not(:disabled) {
  transition: filter 0.16s ease, transform 0.16s ease, background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.pjsk-stats button:not(:disabled):active {
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

.nav-cutoff {
  border: 1px solid #e5e7eb;
  border-radius: var(--stats-radius-panel);
  background: rgba(255, 255, 255, 0.4);
  padding: 8px;
}

.nav-name-format {
  border: 1px solid #e5e7eb;
  border-radius: var(--stats-radius-panel);
  background: rgba(255, 255, 255, 0.4);
  padding: 8px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: nowrap;
}

.nav-name-format-title {
  font-size: 0.76rem;
  font-weight: 700;
  color: #374151;
  margin: 0;
  white-space: nowrap;
}

.nav-name-format-options {
  display: inline-flex;
  gap: 10px;
  flex-wrap: nowrap;
}

.nav-name-format-option {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.74rem;
  color: #374151;
}

.nav-cutoff-title {
  font-size: 0.76rem;
  font-weight: 700;
  color: #374151;
  margin-bottom: 6px;
}

.nav-cutoff-controls {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
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
  font-weight: 700;
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

.nav-collapse-fab:hover,
.id-step-btn:hover,
.reset-mini-btn:hover,
.nav-link:hover,
.lineup-toggle-btn:hover,
.record-sort-btn:hover:not(.active) {
  background: #e5e7eb;
}

.nav-collapse-fab:hover {
  background: #dc2626;
}

.nav-link.active {
  background: rgba(219, 234, 254, 0.6);
  border-color: #93c5fd;
  color: #1d4ed8;
}

.stats-main {
  min-width: 0;
}

.stats-main-head {
  margin-bottom: 6px;
}

.section-head,
.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
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
}

.card-export-btn:hover:not(:disabled) {
  background: #e2e8f0;
}

.card-export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.screenshot-export-modal-mask {
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

.screenshot-export-modal {
  width: min(420px, 100%);
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: #ffffff;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.22);
  padding: 14px;
}

.screenshot-export-modal.is-failed {
  border-color: rgba(239, 68, 68, 0.5);
}

.screenshot-export-modal.is-success {
  border-color: rgba(34, 197, 94, 0.42);
}

.screenshot-export-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.screenshot-export-modal-head-main {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.screenshot-export-modal-title {
  font-size: 0.92rem;
  font-weight: 800;
  color: #0f172a;
}

.screenshot-export-modal-message {
  margin: 10px 0 0;
  font-size: 0.78rem;
  line-height: 1.5;
  color: #334155;
}

.screenshot-export-modal-spinner {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid #cbd5e1;
  border-top-color: #0ea5e9;
  animation: screenshot-export-spin 0.85s linear infinite;
}

.screenshot-export-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.screenshot-export-modal-btn {
  min-width: 84px;
}

.screenshot-export-modal-btn-secondary {
  opacity: 0.9;
}

.screenshot-export-modal-close-btn {
  min-width: 56px;
  padding: 2px 8px;
}

@keyframes screenshot-export-spin {
  to {
    transform: rotate(360deg);
  }
}

.stats-main-head h1,
.section-head h2,
.block-head h3 {
  margin: 0;
}

.section-head-sub h2 {
  font-size: 1.02rem;
}

.section-head.section-head-sub {
  margin-bottom: 8px;
  align-items: flex-start;
}

.section-head.section-head-sub .card-export-btn {
  align-self: flex-start;
}

.section-head-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.block-head-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.head-inline-filters {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.head-filter-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #475569;
  font-weight: 700;
  white-space: nowrap;
  user-select: none;
  line-height: 1;
}

.head-filter-toggle input {
  margin: 0;
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  position: relative;
  top: -1px;
}

@media (max-width: 760px) {
  .section-head.section-head-sub {
    align-items: center;
    margin-bottom: 8px;
    padding-top: 2px;
  }

  .section-head.section-head-sub .card-export-btn {
    align-self: center;
  }

  .section-head-left,
  .head-inline-filters {
    gap: 6px;
  }

  .head-filter-toggle,
  .reward-collab-toggle,
  .festival-merge-toggle,
  .festival-hide-name-toggle {
    font-size: 0.7rem;
  }
}

.section-main {
  margin-bottom: 18px;
}

.pjsk-stats h1 {
  margin-top: 0;
  margin-bottom: 14px;
}



/* 2x2 网格布局 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 20px;
  align-items: flex-start;
}

.stats-section { flex: 1; }

.card-panel {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: var(--stats-radius-panel);
  padding: 14px;
  box-shadow: 0 6px 20px rgba(17, 24, 39, 0.06);
}

.card-panel h2 {
  margin-top: 0;
  margin-bottom: 0;
  font-size: 1.05rem;
}

.count-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.count-table th, .count-table td {
  border: 1px solid #f0f0f0;
  padding: 8px;
  text-align: left;
}

.count-cell {
  font-size: 1.5em;
  font-weight: bold;
  text-align: center;
  background: #fafafa;
  color: #444;
}

.count-cell.lim { color: #ff4d4f; }
.count-cell.p-score { color: #eb2f96; }
.count-cell.score-up { color: #fa8c16; }
.count-cell.pure-score { color: #f5222d; }
.count-cell.reward { color: #f97316; }
.count-cell.banner { color: #7c3aed; }
.count-cell.limited-ban { color: #0f766e; }
.count-cell.fes-limited { color: #dc2626; }
.count-cell.fes-limited-ban { color: #9333ea; }
.count-cell.three-star { color: #7c3aed; }
.count-cell.two-star { color: #059669; }
.count-cell.accuracy { color: #2563eb; }
.count-cell.recovery { color: #db2777; }

.chars-cell { display: flex; flex-wrap: wrap; gap: 8px; }

.count-table.compact-char-table td {
  padding-top: 7px;
  padding-bottom: 7px;
}

.count-table.compact-char-table .chars-cell {
  gap: 4px;
}

.count-table.compact-char-table .char-avatar-box {
  width: 50px;
  height: 50px;
}

.count-table.compact-char-table .avatar-img,
.count-table.compact-char-table .festival-avatar-wrap {
  width: 46px;
  height: 46px;
}

.count-table.compact-char-table .sub-stat {
  margin-top: 1px;
}

.count-table.compact-char-table.reward-breakdown-table .char-avatar-box {
  height: auto;
  min-height: 56px;
}

.count-table.compact-char-table.reward-breakdown-table .sub-stat {
  margin-top: 2px;
  line-height: 1.08;
}

.char-avatar-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 56px;
}

.avatar-img {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid #d1d5db;
  object-fit: cover;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    inset 0 -2px 4px rgba(15, 23, 42, 0.18),
    0 2px 5px rgba(15, 23, 42, 0.22);
}

.abbr-text {
  font-size: 0.6em;
  margin-top: 2px;
  color: #999;
  font-weight: bold;
}

.dist-hide-name-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #475569;
}

.sub-stat {
  font-size: 0.66em;
  color: #6b7280;
  margin-top: 2px;
}

.id-input {
  width: 58px;
  padding: 3px 5px;
  border: 2px solid #33ccbb;
  border-radius: var(--stats-radius-btn);
  font-size: 0.82rem;
  text-align: center;
  appearance: textfield;
  -moz-appearance: textfield;
}

.id-input::-webkit-outer-spin-button,
.id-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.id-step-btn {
  width: 24px;
  height: 24px;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
  font-size: 0.78rem;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  touch-action: manipulation;
  transition: filter 0.16s ease, transform 0.16s ease, background-color 0.16s ease;
}

.mini-cutoff-line {
  font-size: 0.82rem;
  font-weight: 800;
  color: #0f172a;
  white-space: nowrap;
}

.reset-mini-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  box-sizing: border-box;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  touch-action: manipulation;
  transition: filter 0.16s ease, transform 0.16s ease, background-color 0.16s ease;
}

.id-step-btn:active,
.reset-mini-btn:active {
  filter: brightness(0.82);
  transform: translateY(1px) scale(0.96);
}

.reset-mini-icon {
  width: 14px;
  height: 14px;
  object-fit: contain;
  display: block;
}

.config-tips {
  font-size: 0.74rem;
  color: #4b5563;
  margin: 0;
  text-align: left;
}

.matrix-panel,
.song-panel,
.related-panel,
.festival-panel,
.lineup-panel,
.support-panel {
  margin-top: 18px;
}

.lineup-tip {
  margin: 4px 0 10px;
  font-size: 0.76rem;
  color: #475569;
}

.lineup-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 10px;
}

.support-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 10px;
}

.support-card {
  position: relative;
  border: 1px solid #dbe3ee;
  border-radius: var(--stats-radius-card);
  padding: 9px;
  background-image: linear-gradient(to right, var(--unit-card-accent-color, #94a3b8) 0, var(--unit-card-accent-color, #94a3b8) 3px, transparent 3px, transparent 100%);
  background-repeat: no-repeat;
  box-shadow: 0 5px 14px rgba(15, 23, 42, 0.12);
}

.support-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.support-head-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
}

.support-vs-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #475569;
  font-weight: 700;
  user-select: none;
}

.support-vs-toggle input {
  margin: 0;
}

.support-wl-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #475569;
  font-weight: 700;
  user-select: none;
}

.support-wl-toggle input {
  margin: 0;
}

.support-unit-title-logo {
  height: 38px;
  width: auto;
  max-width: 300px;
  object-fit: contain;
}

.support-unit-logo {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.support-plan-row {
  margin-bottom: 5px;
}

.support-plan-row:last-child {
  margin-bottom: 0;
}

.support-member-cell {
  gap: 1px;
}

.support-member-cell.is-card-mode {
  gap: 3px;
}

.support-member-avatar {
  width: 33px;
  height: 33px;
  border-radius: 50%;
  border: 1px solid rgba(15, 23, 42, 0.2);
  object-fit: cover;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.18);
}

.lineup-card {
  position: relative;
  border: 1px solid #dbe3ee;
  border-radius: var(--stats-radius-card);
  padding: 9px;
  background-image: linear-gradient(to right, var(--unit-card-accent-color, #94a3b8) 0, var(--unit-card-accent-color, #94a3b8) 3px, transparent 3px, transparent 100%);
  background-repeat: no-repeat;
  box-shadow: 0 5px 14px rgba(15, 23, 42, 0.12);
}

.lineup-char-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.lineup-char-main {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
}

.lineup-char-main > div {
  min-width: 0;
}

.lineup-char-text {
  min-width: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
  white-space: nowrap;
}

.lineup-head-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  justify-content: flex-end;
}

.lineup-section-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  justify-content: flex-end;
}

.lineup-toggle-btn {
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #ffffff;
  color: #334155;
  font-size: 0.72rem;
  line-height: 1;
  padding: 4px 8px;
  cursor: pointer;
}

.lineup-toggle-btn:hover {
  background: #e2e8f0;
}

.lineup-toggle-btn-global {
  border-radius: var(--stats-radius-btn);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 8px;
}

.lineup-char-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid var(--lineup-accent, #d1d5db);
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.22);
}

.lineup-char-name {
  font-size: 0.88rem;
  font-weight: 800;
  color: #111827;
}

.lineup-char-sub {
  margin-top: 0;
  font-size: 0.68rem;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lineup-plan-row {
  display: grid;
  grid-template-columns: 30px repeat(5, minmax(0, 1fr)) 48px;
  gap: 5px;
  align-items: stretch;
}

.lineup-plan-main {
  margin-bottom: 6px;
}

.lineup-attr-cell,
.lineup-total-cell,
.lineup-member-cell {
  border: 1px solid var(--lineup-row-border, #cbd5e1);
  border-radius: 12px;
  background: var(--lineup-row-bg, rgba(255, 255, 255, 0.88));
  color: var(--lineup-row-fg, #111827);
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lineup-attr-cell {
  padding: 2px;
}

.lineup-attr-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.lineup-member-cell {
  position: relative;
  flex-direction: column;
  gap: 2px;
  padding: 3px 2px;
}

.lineup-member-cell.is-card-mode {
  justify-content: flex-start;
  gap: 3px;
}

.lineup-slot-card {
  position: relative;
  width: 100%;
  max-width: 100%;
  aspect-ratio: 1 / 1;
  flex: 0 0 auto;
  overflow: hidden;
  isolation: isolate;
}

.lineup-slot-card-img {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 90%;
  height: 90%;
  transform: translate(-50%, -50%);
  object-fit: cover;
  border-radius: 0;
  z-index: 1;
  background-color: #e5e7eb;
}

.support-member-attr-icon {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 13px;
  height: 13px;
  object-fit: contain;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.24);
  pointer-events: none;
}

.lineup-member-cell.is-empty {
  color: var(--lineup-row-fg-muted, #94a3b8);
  font-size: 0.8rem;
  font-weight: 700;
}

.lineup-member-score {
  font-size: 0.98rem;
  font-weight: 800;
  color: inherit;
  line-height: 1;
}

.lineup-jump {
  width: 100%;
  max-width: 100%;
  padding: 1px 3px;
  font-size: 11px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: clip;
  -webkit-text-size-adjust: none;
  text-size-adjust: none;
}

.lineup-total-cell {
  font-size: 1.06rem;
  font-weight: 900;
  letter-spacing: 0.01em;
  color: var(--lineup-row-fg, #0f172a);
}

.lineup-more {
  border-top: 1px dashed #cbd5e1;
  padding-top: 6px;
}

.lineup-more summary {
  cursor: pointer;
  color: #0f172a;
  font-weight: 700;
  font-size: 0.72rem;
}

.lineup-more-list {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.lineup-empty {
  color: #94a3b8;
}

.festival-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 12px;
  align-items: start;
}

.festival-card {
  border: 1px solid #dbe3ee;
  border-radius: var(--stats-radius-card);
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  padding: 10px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
}

.festival-card h3 {
  margin: 0;
  font-size: 0.92rem;
  color: #111827;
}

.festival-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.festival-head-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.festival-merge-toggle {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #475569;
  font-weight: 700;
  white-space: nowrap;
}

.festival-card-merge-toggle {
  margin-left: 0;
  margin-top: 2px;
}

.festival-hide-name-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #475569;
  font-weight: 700;
  white-space: nowrap;
}

.festival-hide-name-toggle input {
  margin: 0;
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  position: relative;
  top: -1px;
}

.festival-merge-toggle input {
  margin: 0;
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  position: relative;
  top: -1px;
}

.festival-fes-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #475569;
  font-weight: 700;
  white-space: nowrap;
  margin-top: 2px;
}

.festival-fes-toggle input {
  margin: 0;
}

.festival-tier-cell {
  width: 40px;
  min-width: 40px;
  padding: 4px 2px !important;
  font-size: 0.86rem;
  font-weight: 800;
  text-align: center;
  vertical-align: middle;
}

.festival-star-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.festival-star-icon {
  width: 11px;
  height: 11px;
  object-fit: contain;
}

.festival-none-text {
  display: inline-block;
  width: 100%;
  text-align: center;
  color: #4b5563;
  font-size: 0.76rem;
  font-weight: 800;
}

.festival-tier-four {
  color: #dc2626;
}

.festival-tier-three {
  color: #7c3aed;
}

.festival-tier-two {
  color: #059669;
}

.festival-tier-none {
  color: #4b5563;
}

.festival-avatar-box {
  position: relative;
}

.festival-avatar-wrap {
  width: 52px;
  height: 52px;
  position: relative;
}

.festival-count-badge {
  position: absolute;
  left: 1px;
  top: 1px;
  min-width: 14px;
  height: 14px;
  border-radius: 999px;
  background: #dc2626;
  color: #fff;
  font-size: 0.58rem;
  line-height: 14px;
  text-align: center;
  font-weight: 800;
  border: 1px solid #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
  z-index: 2;
}

.festival-unit-logo {
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 16px;
  height: 16px;
  object-fit: contain;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.25);
  z-index: 2;
}

.festival-perm-mark {
  position: absolute;
  left: 1px;
  bottom: 1px;
  min-width: 14px;
  height: 14px;
  line-height: 14px;
  text-align: center;
  font-size: 0.58rem;
  font-weight: 800;
  color: #ffffff;
  background: #111827;
  border: 1px solid #fff;
  border-radius: 999px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.2);
  z-index: 2;
}

.festival-empty {
  color: #9ca3af;
  font-size: 0.85rem;
}

.festival-chars-empty-cell {
  display: table-cell;
}

.festival-chars-empty-cell .festival-empty {
  display: inline-block;
  width: 100%;
}

.matrix-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
  table-layout: fixed;
}

.matrix-wrap {
  position: relative;
  overflow-x: auto;
  overflow-y: auto;
  max-height: calc(100vh - 140px);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}

.matrix-table th,
.matrix-table td {
  border: 1px solid #e5e7eb;
  padding: 8px 10px;
  text-align: center;
}

.matrix-table thead th {
  position: sticky;
  top: 0;
  z-index: 40;
  background: #f8fafc;
  box-shadow: 0 1px 0 #e5e7eb;
}

.matrix-table th:first-child {
  position: sticky;
  left: 0;
  z-index: 50;
  background: #f8fafc;
}

.matrix-table td:first-child {
  position: sticky;
  left: 0;
  z-index: 30;
}

.matrix-table tbody tr.matrix-unit-framed td:first-child {
  border-left: 3px solid var(--matrix-unit-border-color);
}

.matrix-table tbody tr.matrix-unit-framed td:last-child {
  border-right: 3px solid var(--matrix-unit-border-color);
}

.matrix-table tbody tr.matrix-unit-group-start-row td {
  border-top: 3px solid var(--matrix-unit-border-color);
}

.matrix-table tbody tr.matrix-unit-group-end-row td {
  border-bottom: 3px solid var(--matrix-unit-border-color);
}

.matrix-sort-btn {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 2px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  width: 100%;
}
.matrix-sort-btn > span {
  white-space: nowrap;
}
.matrix-sort-icon {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  object-fit: contain;
}
.row-char {
  text-align: center;
}

.mini-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #d1d5db;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.75),
    inset 0 -2px 3px rgba(15, 23, 42, 0.2),
    0 1px 3px rgba(15, 23, 42, 0.2);
}

.matrix-avatar-wrap {
  position: relative;
  width: 36px;
  height: 36px;
  margin: 0 auto;
}

.matrix-avatar-unit-logo {
  position: absolute;
  bottom: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  object-fit: contain;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.22);
}

.matrix-table td.matrix-num {
  color: #374151;
  font-weight: 700;
  font-size: 1.12rem;
  line-height: 1.1;
  font-family: 'DIN Alternate', 'Avenir Next', 'Trebuchet MS', 'Segoe UI', 'Microsoft YaHei', sans-serif;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
}

.matrix-group-start {
  border-left: 2px solid #c5ccd6 !important;
}

.matrix-group-end {
  border-right: 2px solid #c5ccd6 !important;
}

.matrix-table td.matrix-num.matrix-max {
  color: #dc2626;
  font-weight: 800;
}

.matrix-table td.matrix-num.matrix-min {
  color: #2563eb;
  font-weight: 800;
}

.matrix-zero {
  color: #475569;
  font-weight: 800;
  background-color: rgba(148, 163, 184, 0.16);
}

.matrix-table td.matrix-num.matrix-vs-zero {
  color: #111827;
  font-weight: 700;
  background-color: #ffffff !important;
}

.attr-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
}

.attr-summary-card {
  position: relative;
  border: 1px solid #dbe3ee;
  border-radius: var(--stats-radius-card);
  padding: 8px;
  background-image: linear-gradient(to right, var(--unit-card-accent-color, #94a3b8) 0, var(--unit-card-accent-color, #94a3b8) 3px, transparent 3px, transparent 100%);
  background-repeat: no-repeat;
  box-shadow: 0 5px 14px rgba(15, 23, 42, 0.12);
}

.attr-summary-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.attr-summary-head-left {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.attr-summary-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #d1d5db;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.75),
    inset 0 -2px 3px rgba(15, 23, 42, 0.2),
    0 1px 3px rgba(15, 23, 42, 0.2);
}

.attr-summary-name {
  font-size: 0.86rem;
  font-weight: 800;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attr-summary-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  background: #ffffff;
  border: 1px solid #dbe3ee;
  border-radius: 12px;
  overflow: hidden;
}

.attr-summary-table th,
.attr-summary-table td {
  border: 1px solid #e2e8f0;
  padding: 4px 3px;
  text-align: center;

}

.attr-summary-table thead th,
.attr-summary-total-row {
  background: rgba(255, 255, 255, 0.68);
  font-weight: 700;
  font-size: 0.74rem;
  color: #0f172a;
}

.attr-summary-table tbody tr.attr-summary-data-row td {
  background: var(--attr-summary-row-bg, #ffffff);
}

.attr-summary-total-row td {
  background: rgba(255, 255, 255, 0.68);
}

.attr-summary-attr-cell {
  width: 16%;
  text-align: center;
  vertical-align: middle;
  line-height: 1.1;
  white-space: nowrap;
  font-weight: 700;
  color: #0f172a;
}

.attr-summary-attr-icon {
  width: 18px;
  height: 18px;
  display: inline-block;
  margin: 0;
  object-fit: contain;
  vertical-align: middle;
}

.attr-summary-num {
  color: #1f2937;
  font-weight: 800;
  font-size: 0.88rem;
  line-height: 1;
  font-family: 'DIN Alternate', 'Avenir Next', 'Trebuchet MS', 'Segoe UI', 'Microsoft YaHei', sans-serif;
  font-variant-numeric: tabular-nums;
}


.matrix-pure-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #475569;
}

.matrix-total-row td {
  background: #ffffff !important;
}

.matrix-total-row .matrix-num,
.matrix-total-row .matrix-total-label {
  font-weight: 900;
  color: #111827;
}

.matrix-vs-unit-total-row td {
  background: var(--matrix-vs-total-bg) !important;
}

.matrix-vs-unit-total-row .matrix-num {
  font-weight: 900;
  color: #111827;
}

.matrix-vs-unit-total-char {
  text-align: center;
}

.matrix-vs-unit-total-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.record-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 12px;
}

.record-block {
  border: 1px solid #e5e7eb;
  border-radius: var(--stats-radius-card);
  background: #fff;
  padding: 10px;
}

.related-panel .record-block {
  overflow-x: auto;
}

.record-block h3 {
  margin: 0;
  font-size: 0.98rem;
  color: #111827;
}

.record-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.record-head-left {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.record-head-controls {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.block-head-left .fes-card-mode-toggle {
  margin-left: 2px;
}

.record-compact-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.74rem;
  font-weight: 700;
  color: #475569;
}

.record-compact-toggle input {
  margin: 0;
}

.record-sort-btn {
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
  font-size: 0.72rem;
  padding: 2px 10px;
  cursor: pointer;
}

.record-sort-btn.active {
  background: #0ea5e9;
  border-color: #0ea5e9;
  color: #fff;
}

.record-table {
  width: 100%;
  border-collapse: collapse;
}

.record-table th,
.record-table td {
  border: 1px solid #e5e7eb;
  padding: 7px 9px;
  text-align: center;
  font-size: 0.82rem;
  white-space: nowrap;
}



td.record-char {
  display: table-cell !important;
  vertical-align: middle;
  text-align: left !important;
}

.record-char > * {
  display: inline-block;
  vertical-align: middle;
}

.record-char > span.record-avatar-stack,
.record-char > img.record-avatar {
  margin-right: 7px;
}

.vs-unit-score-table .vs-score-char-cell {
  display: table-cell;
  text-align: center;
  vertical-align: middle;
  padding-left: 6px;
  padding-right: 6px;
}

.vs-unit-score-table .vs-score-char-cell .record-avatar {
  display: block;
  margin: 0 auto;
}

.reward-collab-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #475569;
  font-weight: 700;
  white-space: nowrap;
  line-height: 1;
}

.reward-collab-toggle input {
  margin: 0;
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  position: relative;
  top: -1px;
}

.section-head.section-head-sub + .count-table {
  margin-top: 0;
}

.record-char > span:not(.record-avatar-stack) {
  min-width: 0;
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
}

.record-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.6px solid #d1d5db;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.2);
}

.record-unit-avatar {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.2);
}

.record-avatar-stack {
  position: relative;
  width: 26px;
  height: 26px;
  display: inline-flex;
  flex: 0 0 26px;
  min-width: 26px;
  overflow: visible;
}

.record-avatar-stack .record-avatar {
  width: 100%;
  height: 100%;
}

.record-avatar-corner-badge {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 14px;
  height: 14px;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  padding: 0;
}

.record-avatar-corner-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.vs-last-four-card-mode td.record-char {
  text-align: center !important;
}

.vs-last-four-card-mode td.record-char > span.record-avatar-stack,
.vs-last-four-card-mode td.record-char > img.record-avatar {
  margin-right: 0 !important;
}

.vs-last-four-avatar-large {
  width: var(--rel-avatar-size-card, 34px);
  height: var(--rel-avatar-size-card, 34px);
}

.vs-last-four-card-mode .record-avatar-stack {
  width: var(--rel-avatar-size-card, 34px);
  height: var(--rel-avatar-size-card, 34px);
  flex-basis: var(--rel-avatar-size-card, 34px);
  min-width: var(--rel-avatar-size-card, 34px);
}

.record-avatar-corner-badge.is-large {
  width: 17px;
  height: 17px;
  right: -3px;
  bottom: -3px;
}

.last-record-table-card-mode tbody td {
  height: 76px;
  vertical-align: middle;
}

.last-record-table-card-mode td.record-char {
  text-align: center !important;
}

.last-record-table-card-mode td.record-char > span.record-avatar-stack,
.last-record-table-card-mode td.record-char > img.record-avatar {
  margin-right: 0 !important;
}

.related-last-avatar-large {
  width: var(--rel-avatar-size-card, 34px);
  height: var(--rel-avatar-size-card, 34px);
}

.related-last-card-cell {
  width: auto;
  min-width: 0;
}

.related-last-card-thumb {
  width: var(--rel-last-card-frame-size, 62px);
  height: var(--rel-last-card-frame-size, 62px);
  margin: 0 auto;
}

.related-last-card-attr {
  position: absolute;
  left: 2px;
  top: 2px;
  width: clamp(11px, calc(var(--rel-card-logo-scale, 0.24) * 100%), 18px);
  height: clamp(11px, calc(var(--rel-card-logo-scale, 0.24) * 100%), 18px);
  object-fit: contain;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.24);
  z-index: 3;
}

.mini-unit-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.vs-unit-last-four-mini-table .vs-mini-days-cell {
  font-size: 0.96rem;
  font-weight: 800;
}

.vs-unit-score-table td.record-char {
  text-align: center !important;
  width: 100%;
}

.vs-unit-score-table .record-avatar {
  width: 34px;
  height: 34px;
}

.vs-unit-score-table {
  table-layout: fixed;
}

.vs-unit-score-table th:first-child,
.vs-unit-score-table td:first-child {
  width: 56px;
  min-width: 56px;
  max-width: 56px;
  padding-left: 2px;
  padding-right: 2px;
}

.vs-unit-score-table th,
.vs-unit-score-table td {
  text-align: center;
  vertical-align: middle;
  padding: 6px 5px;
}

.vs-unit-score-table.is-card-mode th,
.vs-unit-score-table.is-card-mode td {
  padding: 2px;
}

.vs-four-count-value {
  display: inline-block;
  font-size: 0.96rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
}

.vs-original-stat-table th:first-child,
.vs-original-stat-table td:first-child {
  width: 56px;
  min-width: 56px;
  max-width: 56px;
}

.vs-original-stat-table .vs-original-type-cell {
  text-align: center !important;
  font-weight: 800;
  color: #334155;
  background-color: #f1f5f9;
}

.score-attr-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  width: 100%;
  margin: 0;
  border-radius: 10px;
  padding: 0;
}

.score-attr-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.vs-four-count-detail-table .score-attr-icon {
  width: 18px;
  height: 18px;
}

.score-card-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  width: 100%;
  max-width: 126px;
  min-height: 60px;
  margin: 0 auto;
}

.score-card-wrap .fes-card-thumb {
  --fes-card-frame-size: 56px;
}

.score-card-wrap-single {
  max-width: 100%;
}

.score-card-wrap-merged-six {
  max-width: 100%;
}

.related-panel .related-table-vs-last.vs-four-count-detail-table:not(.vs-last-four-card-mode) {
  min-width: calc(var(--rel-min-char-col) + var(--rel-min-event-col));
}

.related-panel .related-table-vs-last.vs-four-count-detail-table.vs-last-four-card-mode {
  min-width: calc(var(--rel-min-char-col) + var(--rel-min-card-col));
}

.related-panel .vs-four-count-detail-table:not(.vs-last-four-card-mode) td.record-char {
  text-align: left !important;
}

.related-panel .vs-four-count-detail-table.vs-last-four-card-mode td.record-char {
  text-align: center !important;
}

.vs-four-count-value-cell {
  text-align: center;
}

.vs-four-count-detail-table td:last-child {
  text-align: left;
}

.vs-four-count-detail-table .score-card-wrap {
  justify-content: flex-start;
  max-width: none;
}

.vs-four-count-detail-table .score-attr-wrap {
  justify-content: flex-start;
}

.vs-unit-score-table:not(.is-card-mode) .score-attr-wrap,
.vs-original-stat-table:not(.is-card-mode) .score-attr-wrap {
  justify-content: center;
}

.vs-unit-score-table.is-card-mode .score-card-wrap,
.vs-original-stat-table.is-card-mode .score-card-wrap {
  gap: 2px;
  justify-content: center;
  align-items: flex-start;
  max-width: none;
  min-height: 0;
}

.vs-unit-score-table.is-card-mode .score-card-wrap .fes-card-thumb,
.vs-original-stat-table.is-card-mode .score-card-wrap .fes-card-thumb {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  height: auto;
  aspect-ratio: 1 / 1;
  flex: 0 0 100%;
}

.vs-original-stat-table.is-card-mode .score-card-wrap-merged-six {
  justify-content: flex-start;
}

.vs-original-stat-table.is-card-mode .score-card-wrap-merged-six .fes-card-thumb {
  width: calc((100% - 10px) / 6);
  max-width: calc((100% - 10px) / 6);
  flex-basis: calc((100% - 10px) / 6);
}

.vs-unit-score-table.is-card-mode .score-card-wrap .fes-card-thumb-img,
.vs-original-stat-table.is-card-mode .score-card-wrap .fes-card-thumb-img {
  width: 90%;
  height: 90%;
}

.vs-unit-score-table.is-card-mode .score-card-wrap .fes-card-thumb-attr,
.vs-original-stat-table.is-card-mode .score-card-wrap .fes-card-thumb-attr {
  left: 2px;
  top: 2px;
  width: clamp(10px, 24%, 16px);
  height: clamp(10px, 24%, 16px);
}

.vs-unit-last-four-mini-table .vs-mini-days-cell.vs-four-count-max {
  color: #dc2626;
  font-weight: 900;
}

.vs-unit-last-four-mini-table .vs-mini-days-cell.vs-four-count-min {
  color: #2563eb;
  font-weight: 900;
}

.vs-original-other-compact-cell {
  background: rgba(57, 197, 187, 0.2);
}

.score-empty {
  color: #94a3b8;
}

.fes-card-mode-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 700;
  color: #475569;
  user-select: none;
}

.fes-card-mode-toggle input[type='checkbox'] {
  margin: 0;
}

.stats-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #475569;
  font-weight: 700;
  white-space: nowrap;
  user-select: none;
  line-height: 1;
}

.stats-checkbox input[type='checkbox'] {
  margin: 0;
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  position: relative;
  top: -1px;
  accent-color: #14b8a6;
}

.fes-record-table {
  table-layout: fixed;
}

.fes-record-table.is-card-mode tbody tr:not(.fes-total-row) td {
  height: auto;
  min-height: 102px;
}

.fes-record-table th,
.fes-record-table td {
  padding: 6px 6px;
}

.fes-record-table tbody tr:not(.fes-total-row) td {
  height: 102px;
}

.fes-record-table td {
  vertical-align: middle;
}

.fes-row-head {
  min-width: 64px;
  width: 64px;
  font-size: 0.74rem;
}

.fes-cards-head {
  font-size: 0.8rem;
  letter-spacing: 0.02em;
}

.fes-unit-head,
.fes-total-head {
  font-weight: 800;
}

.fes-total-head {
  background: transparent;
}

.fes-total-num {
  font-size: 1.04rem;
  font-weight: 800;
  color: #0f172a;
}

.fes-attr-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.fes-cell-icons {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  gap: 2px;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 68px;
  min-height: 90px;
  margin: 0 auto;
}

.fes-cell-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1.8px solid #d1d5db;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.2);
}

.fes-card-strip-cell {
  text-align: left;
}

.fes-card-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: flex-start;
  min-height: 60px;
}

.fes-card-thumb {
  --fes-card-frame-size: 60px;
  --fes-card-image-scale: 0.9;
  position: relative;
  width: var(--fes-card-frame-size);
  height: var(--fes-card-frame-size);
  flex: 0 0 auto;
}

.fes-card-thumb-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  z-index: 5;
}

.fes-card-thumb-img {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(var(--fes-card-frame-size) * var(--fes-card-image-scale));
  height: calc(var(--fes-card-frame-size) * var(--fes-card-image-scale));
  transform: translate(-50%, -50%);
  object-fit: cover;
  border-radius: 0px;
  z-index: 1;
  background-color: #e5e7eb;
}

.fes-card-thumb-attr {
  position: absolute;
  left: 2px;
  top: 2px;
  width: 16px;
  height: 16px;
  object-fit: contain;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.25);
  z-index: 3;
}

.fes-total-attr-wrap-cell {
  padding: 8px 10px;
}

.fes-total-attr-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

.fes-total-attr-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
}

.fes-total-attr-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.fes-total-attr-num {
  font-size: 0.92rem;
  font-weight: 800;
  color: #0f172a;
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

.record-table th {
  background: #f8fafc;
  font-weight: 700;
}

.range-cell {
  white-space: nowrap;
}

.range-cell.is-card-mode {
  white-space: normal;
}

.range-cell > span {
  margin: 0 3px;
}

.related-panel {
  --related-record-card-row-height: 88px;
  /* 头像与卡面尺寸 */
  --rel-avatar-size: 22px;
  --rel-avatar-size-card: 34px;
  --rel-last-card-frame-size: 70px;
  --rel-interval-card-frame-size: 70px;
  --rel-card-image-scale: 0.9;
  --rel-card-logo-scale: 0.24;
  --rel-jump-chip-min: 60px;

  /* 列宽最小值 */
  --rel-min-char-col: 40px;
  --rel-min-card-col: 10px;
  --rel-min-event-col: 10px;
  --rel-min-range-col: 40px;
  --rel-min-date-col: 10px;
  --rel-min-gap-col: 10px;

  /* 上次记录（不显示卡面）列占比 */
  --rel-last-char-pct: 28%;
  --rel-last-event-pct: 20%;
  --rel-last-date-pct: 26%;
  --rel-last-gap-pct: 26%;

  /* 上次记录（显示卡面）列占比 */
  --rel-last-card-char-pct: 10%;
  --rel-last-card-card-pct: 24%;
  --rel-last-card-event-pct: 20%;
  --rel-last-card-date-pct: 23%;
  --rel-last-card-gap-pct: 23%;

  /* 间隔记录（不显示卡面）列占比 */
  --rel-int-char-pct: 28%;
  --rel-int-range-pct: 44%;
  --rel-int-gap-pct: 28%;

  /* 间隔记录（显示卡面）列占比 */
  --rel-int-card-char-pct: 10%;
  --rel-int-card-card-pct: 44%;
  --rel-int-card-range-pct: 22%;
  --rel-int-card-gap-pct: 26%;
}

.related-panel .related-table {
  width: 100%;
  min-width: 0;
  table-layout: auto;
}

.related-panel .related-table-last:not(.last-record-table-card-mode),
.related-panel .related-table-vs-last:not(.vs-last-four-card-mode) {
  min-width: calc(var(--rel-min-char-col) + var(--rel-min-event-col) + var(--rel-min-date-col) + var(--rel-min-gap-col));
}

.related-panel .related-table-last.last-record-table-card-mode,
.related-panel .related-table-vs-last.vs-last-four-card-mode {
  min-width: calc(var(--rel-min-char-col) + var(--rel-min-card-col) + var(--rel-min-event-col) + var(--rel-min-date-col) + var(--rel-min-gap-col));
}

.related-panel .related-table-interval:not(.interval-record-table-card-mode) {
  min-width: calc(var(--rel-min-char-col) + var(--rel-min-range-col) + var(--rel-min-gap-col));
}

.related-panel .related-table-interval.interval-record-table-card-mode {
  min-width: calc(var(--rel-min-char-col) + var(--rel-min-card-col) + var(--rel-min-range-col) + var(--rel-min-gap-col));
}

.related-panel .related-table th,
.related-panel .related-table td {
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
}

.related-panel .related-table th:first-child,
.related-panel .related-table td:first-child {
  overflow: visible;
  text-overflow: clip;
}

.related-panel .related-table-last:not(.last-record-table-card-mode) td.record-char,
.related-panel .related-table-interval:not(.interval-record-table-card-mode) td.record-char,
.related-panel .related-table-vs-last:not(.vs-last-four-card-mode) td.record-char {
  text-align: left !important;
}

.related-panel .related-table-last.last-record-table-card-mode td.record-char,
.related-panel .related-table-interval.interval-record-table-card-mode td.record-char,
.related-panel .related-table-vs-last.vs-last-four-card-mode td.record-char {
  text-align: center !important;
}

.related-panel .related-table-last.last-record-table-card-mode td.record-char > span.record-avatar-stack,
.related-panel .related-table-last.last-record-table-card-mode td.record-char > img.record-avatar,
.related-panel .related-table-interval.interval-record-table-card-mode td.record-char > span.record-avatar-stack,
.related-panel .related-table-interval.interval-record-table-card-mode td.record-char > img.record-avatar,
.related-panel .related-table-vs-last.vs-last-four-card-mode td.record-char > span.record-avatar-stack,
.related-panel .related-table-vs-last.vs-last-four-card-mode td.record-char > img.record-avatar {
  margin-right: 0 !important;
}

.related-panel .related-table .record-char > span:not(.record-avatar-stack) {
  flex: 0 0 auto;
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
}

.related-panel .related-table .record-avatar {
  width: var(--rel-avatar-size);
  height: var(--rel-avatar-size);
}

.related-panel .related-table .record-avatar-stack {
  width: var(--rel-avatar-size);
  height: var(--rel-avatar-size);
  flex: 0 0 var(--rel-avatar-size);
  min-width: var(--rel-avatar-size);
}

.related-panel .related-table.last-record-table-card-mode .record-avatar,
.related-panel .related-table.vs-last-four-card-mode .record-avatar,
.related-panel .related-table .record-avatar.related-last-avatar-large,
.related-panel .related-table .record-avatar.interval-avatar-large,
.related-panel .related-table .record-avatar.vs-last-four-avatar-large {
  width: var(--rel-avatar-size-card);
  height: var(--rel-avatar-size-card);
}

.related-panel .related-table.vs-last-four-card-mode .record-avatar-stack {
  width: var(--rel-avatar-size-card);
  height: var(--rel-avatar-size-card);
  flex: 0 0 var(--rel-avatar-size-card);
  min-width: var(--rel-avatar-size-card);
}

.related-panel .related-table .lineup-slot-card-img {
  width: calc(100% * var(--rel-card-image-scale));
  height: calc(100% * var(--rel-card-image-scale));
}

.related-panel .related-table-last:not(.last-record-table-card-mode) th:first-child,
.related-panel .related-table-last:not(.last-record-table-card-mode) td:first-child,
.related-panel .related-table-vs-last:not(.vs-last-four-card-mode) th:first-child,
.related-panel .related-table-vs-last:not(.vs-last-four-card-mode) td:first-child {
  width: var(--rel-last-char-pct);
  min-width: var(--rel-min-char-col);
}

.related-panel .related-table-last:not(.last-record-table-card-mode) th:nth-child(2),
.related-panel .related-table-last:not(.last-record-table-card-mode) td:nth-child(2),
.related-panel .related-table-vs-last:not(.vs-last-four-card-mode) th:nth-child(2),
.related-panel .related-table-vs-last:not(.vs-last-four-card-mode) td:nth-child(2) {
  width: var(--rel-last-event-pct);
  min-width: var(--rel-min-event-col);
}

.related-panel .related-table-last:not(.last-record-table-card-mode) th:nth-child(3),
.related-panel .related-table-last:not(.last-record-table-card-mode) td:nth-child(3),
.related-panel .related-table-vs-last:not(.vs-last-four-card-mode) th:nth-child(3),
.related-panel .related-table-vs-last:not(.vs-last-four-card-mode) td:nth-child(3) {
  width: var(--rel-last-date-pct);
  min-width: var(--rel-min-date-col);
}

.related-panel .related-table-last:not(.last-record-table-card-mode) th:nth-child(4),
.related-panel .related-table-last:not(.last-record-table-card-mode) td:nth-child(4),
.related-panel .related-table-vs-last:not(.vs-last-four-card-mode) th:nth-child(4),
.related-panel .related-table-vs-last:not(.vs-last-four-card-mode) td:nth-child(4) {
  width: var(--rel-last-gap-pct);
  min-width: var(--rel-min-gap-col);
}

.related-panel .related-table-last.last-record-table-card-mode th:first-child,
.related-panel .related-table-last.last-record-table-card-mode td:first-child,
.related-panel .related-table-vs-last.vs-last-four-card-mode th:first-child,
.related-panel .related-table-vs-last.vs-last-four-card-mode td:first-child {
  width: var(--rel-last-card-char-pct);
  min-width: var(--rel-min-char-col);
}

.related-panel .related-table-last.last-record-table-card-mode th:nth-child(2),
.related-panel .related-table-last.last-record-table-card-mode td:nth-child(2),
.related-panel .related-table-vs-last.vs-last-four-card-mode th:nth-child(2),
.related-panel .related-table-vs-last.vs-last-four-card-mode td:nth-child(2) {
  width: var(--rel-last-card-card-pct);
  min-width: var(--rel-min-card-col);
}

.related-panel .related-table-last.last-record-table-card-mode th:nth-child(3),
.related-panel .related-table-last.last-record-table-card-mode td:nth-child(3),
.related-panel .related-table-vs-last.vs-last-four-card-mode th:nth-child(3),
.related-panel .related-table-vs-last.vs-last-four-card-mode td:nth-child(3) {
  width: var(--rel-last-card-event-pct);
  min-width: var(--rel-min-event-col);
}

.related-panel .related-table-last.last-record-table-card-mode th:nth-child(4),
.related-panel .related-table-last.last-record-table-card-mode td:nth-child(4),
.related-panel .related-table-vs-last.vs-last-four-card-mode th:nth-child(4),
.related-panel .related-table-vs-last.vs-last-four-card-mode td:nth-child(4) {
  width: var(--rel-last-card-date-pct);
  min-width: var(--rel-min-date-col);
}

.related-panel .related-table-last.last-record-table-card-mode th:nth-child(5),
.related-panel .related-table-last.last-record-table-card-mode td:nth-child(5),
.related-panel .related-table-vs-last.vs-last-four-card-mode th:nth-child(5),
.related-panel .related-table-vs-last.vs-last-four-card-mode td:nth-child(5) {
  width: var(--rel-last-card-gap-pct);
  min-width: var(--rel-min-gap-col);
}

.related-panel .related-table-vs-last.vs-four-count-detail-table:not(.vs-last-four-card-mode) th:first-child,
.related-panel .related-table-vs-last.vs-four-count-detail-table:not(.vs-last-four-card-mode) td:first-child {
  width: var(--rel-last-char-pct);
  min-width: var(--rel-min-char-col);
}

.related-panel .related-table-vs-last.vs-four-count-detail-table:not(.vs-last-four-card-mode) th:nth-child(2),
.related-panel .related-table-vs-last.vs-four-count-detail-table:not(.vs-last-four-card-mode) td:nth-child(2) {
  width: 14%;
  min-width: 50px;
}

.related-panel .related-table-vs-last.vs-four-count-detail-table:not(.vs-last-four-card-mode) th:nth-child(3),
.related-panel .related-table-vs-last.vs-four-count-detail-table:not(.vs-last-four-card-mode) td:nth-child(3) {
  width: auto;
  min-width: 200px;
}

.related-panel .related-table-vs-last.vs-four-count-detail-table.vs-last-four-card-mode th:first-child,
.related-panel .related-table-vs-last.vs-four-count-detail-table.vs-last-four-card-mode td:first-child {
  width: var(--rel-last-card-char-pct);
  min-width: var(--rel-min-char-col);
}

.related-panel .related-table-vs-last.vs-four-count-detail-table.vs-last-four-card-mode th:nth-child(2),
.related-panel .related-table-vs-last.vs-four-count-detail-table.vs-last-four-card-mode td:nth-child(2) {
  width: 12%;
  min-width: 50px;
}

.related-panel .related-table-vs-last.vs-four-count-detail-table.vs-last-four-card-mode th:nth-child(3),
.related-panel .related-table-vs-last.vs-four-count-detail-table.vs-last-four-card-mode td:nth-child(3) {
  width: auto;
  min-width: 220px;
}

.related-panel .related-table-interval:not(.interval-record-table-card-mode) th:first-child,
.related-panel .related-table-interval:not(.interval-record-table-card-mode) td:first-child {
  width: var(--rel-int-char-pct);
  min-width: var(--rel-min-char-col);
}

.related-panel .related-table-interval:not(.interval-record-table-card-mode) th:nth-child(2),
.related-panel .related-table-interval:not(.interval-record-table-card-mode) td:nth-child(2) {
  width: var(--rel-int-range-pct);
  min-width: var(--rel-min-range-col);
}

.related-panel .related-table-interval:not(.interval-record-table-card-mode) th:nth-child(3),
.related-panel .related-table-interval:not(.interval-record-table-card-mode) td:nth-child(3) {
  width: var(--rel-int-gap-pct);
  min-width: var(--rel-min-gap-col);
}

.interval-record-table-card-mode td.record-char {
  text-align: center !important;
}

.interval-record-table-card-mode td.record-char > span.record-avatar-stack,
.interval-record-table-card-mode td.record-char > img.record-avatar {
  margin-right: 0 !important;
}

.vs-last-four-card-mode tbody td,
.interval-record-table-card-mode tbody td {
  height: var(--related-record-card-row-height);
  vertical-align: middle;
}

.interval-record-table-card-mode {
  table-layout: fixed;
}

.related-panel .related-table-interval.interval-record-table-card-mode th:first-child,
.related-panel .related-table-interval.interval-record-table-card-mode td:first-child {
  width: var(--rel-int-card-char-pct);
  min-width: var(--rel-min-char-col);
  padding-left: 2px;
  padding-right: 2px;
}

.related-panel .related-table-interval.interval-record-table-card-mode th:nth-child(2),
.related-panel .related-table-interval.interval-record-table-card-mode td:nth-child(2) {
  width: var(--rel-int-card-card-pct);
  min-width: var(--rel-min-card-col);
}

.related-panel .related-table-interval.interval-record-table-card-mode th:nth-child(3),
.related-panel .related-table-interval.interval-record-table-card-mode td:nth-child(3) {
  width: var(--rel-int-card-range-pct);
  min-width: var(--rel-min-range-col);
}

.related-panel .related-table-interval.interval-record-table-card-mode th:nth-child(4),
.related-panel .related-table-interval.interval-record-table-card-mode td:nth-child(4) {
  width: var(--rel-int-card-gap-pct);
  min-width: var(--rel-min-gap-col);
}

.interval-avatar-large {
  width: 34px;
  height: 34px;
}

.range-card-cell {
  white-space: nowrap;
  padding-left: 4px;
  padding-right: 4px;
}

.interval-card-column {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-wrap: nowrap;
}

.interval-jump-column {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.interval-card-column > .interval-stack-arrow {
  display: none;
}

.interval-card-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--rel-interval-card-frame-size);
  min-width: var(--rel-interval-card-frame-size);
  height: var(--rel-interval-card-frame-size);
  min-height: var(--rel-interval-card-frame-size);
}

.interval-card-item.is-stack-item {
  min-height: 0;
}

.interval-card-thumb {
  width: 100%;
  height: 100%;
}

.interval-stack-arrow {
  line-height: 1;
  color: #475569;
  font-weight: 700;
  font-size: 0.82rem;
}

.range-cell.is-card-mode .jump-link {
  width: min(100%, 90%);
  min-width: var(--rel-jump-chip-min);
  max-width: 90%;
}

.jump-link {
  appearance: none;
  -webkit-appearance: none;
  border: 1px solid rgba(15, 23, 42, 0.18);
  border-radius: var(--stats-radius-btn, 999px);
  padding: 2px 7px;
  font-size: 0.72rem;
  line-height: 1.35;
  font-weight: 700;
  color: #1f2937;
  background: var(--record-tint, #e5e7eb);
  cursor: pointer;
  white-space: nowrap;
}

.related-panel .record-block .jump-link {
  width: var(--record-jump-chip-width, auto);
  min-width: var(--record-jump-chip-width, auto);
  max-width: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  word-break: break-word;
}

.related-panel .range-cell.is-card-mode .jump-link {
  width: min(100%, 90%);
  min-width: var(--rel-jump-chip-min);
  max-width: 90%;
}

.jump-link:hover:not(:disabled) {
  filter: brightness(0.98);
}

.jump-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (min-width: 901px) {
  .matrix-table th,
  .matrix-table td {
    font-size: 0.92rem;
  }

  .matrix-table td.matrix-num {
    font-size: 1.24rem;
  }

  .vs-unit-score-table th,
  .vs-unit-score-table td {
    padding: 12px 10px;
  }

  .vs-unit-score-table.is-card-mode th,
  .vs-unit-score-table.is-card-mode td {
    padding: 3px;
  }

  .vs-unit-last-four-mini-table .vs-mini-days-cell {
    font-size: 1.16rem;
    font-weight: 800;
  }

  .score-attr-wrap {
    gap: 2px;
  }

  .score-attr-icon {
    width: 24px;
    height: 24px;
  }
}

@media (min-width: 901px) and (max-width: 1360px) {
  .related-panel .related-table th:first-child,
  .related-panel .related-table td:first-child {
    padding-left: 3px;
    padding-right: 3px;
  }
}


@media (min-width: 1201px) {
  .nav-cutoff-controls {
    justify-content: flex-start;
  }

  .nav-cutoff-controls .id-input {
    width: 72px;
    padding: 2px 0;
    text-align: center;
  }
}

@media (min-width: 901px) and (max-width: 1200px) {
  .pjsk-stats {
    --stats-nav-width: 196px;
    --stats-nav-left: 34px;
    --stats-nav-top: 78px;
  }

  .stats-layout { grid-template-columns: var(--stats-nav-width) 1fr; }
  .stats-layout.nav-collapsed { grid-template-columns: 1fr; }
  .stats-nav {
    height: calc(100vh - var(--stats-nav-top) - 10px);
    max-height: calc(100vh - var(--stats-nav-top) - 10px);
  }
  .pjsk-stats { padding: 14px; }

  .score-attr-wrap {
    gap: 2px;
  }

  .score-attr-icon {
    width: 22px;
    height: 22px;
  }

  .nav-cutoff {
    padding: 7px;
  }

  .nav-cutoff-controls {
    gap: 4px;
  }

  .id-input {
    width: 56px;
    padding: 2px 4px;
    font-size: 0.8rem;
  }

  .id-step-btn {
    width: 26px;
    height: 26px;
    font-size: 0.78rem;
  }

  .reset-mini-btn {
    width: 26px;
    height: 26px;
  }

  .reset-mini-icon {
    width: 14px;
    height: 14px;
  }

  .config-tips {
    font-size: 0.68rem;
  }

  .nav-name-format {
    gap: 6px;
    padding: 7px;
    justify-content: space-between;
  }

  .nav-name-format-title {
    font-size: 0.72rem;
  }

  .nav-name-format-options {
    gap: 6px;
  }

  .nav-name-format-option {
    gap: 3px;
    font-size: 0.68rem;
    white-space: nowrap;
  }
}

@media (max-width: 900px) {
  .pjsk-stats {
    padding: 8px;
    --matrix-sticky-top: 0px;
  }

  .stats-layout,
  .stats-layout.nav-collapsed {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .stats-layout:not(.nav-collapsed) .stats-main {
    grid-column: auto;
  }

  .stats-layout.mobile-nav-open .stats-main {
    padding-top: 0;
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

  .nav-collapse-fab {
    z-index: 4201;
  }

  .stats-nav.mobile-floating.is-collapsed {
    display: none;
  }

  .nav-cutoff {
    padding: 7px;
  }

  .nav-name-format {
    padding: 7px;
  }

  .nav-name-format-title {
    font-size: 0.72rem;
  }

  .nav-name-format-option {
    font-size: 0.7rem;
  }

  .nav-cutoff-title {
    font-size: 0.72rem;
  }

  .nav-cutoff-controls {
    gap: 4px;
  }

  .id-input {
    width: 54px;
    font-size: 0.78rem;
  }

  .id-step-btn,
  .reset-mini-btn {
    width: 24px;
    height: 24px;
    font-size: 0.74rem;
  }

  .reset-mini-icon {
    width: 13px;
    height: 13px;
  }

  .reset-mini-btn {
    font-size: 0.72rem;
    padding: 0;
  }

  .config-tips {
    font-size: 0.68rem;
  }

  .nav-scroll { max-height: none; }

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

  .stats-main h1 {
    margin-bottom: 8px;
    font-size: 1.1rem;
  }

  .stats-main-head {
    margin-bottom: 8px;
  }

  .card-export-btn {
    font-size: 0.64rem;
    padding: 3px 6px;
  }

  .card-panel {
    padding: 9px;
    border-radius: 14px;
  }

  .card-panel h2 {
    margin-bottom: 8px;
    font-size: 0.96rem;
  }

  /* Keep header-row titles aligned with inline controls; avoid extra gap before tables. */
  .section-head h2 {
    margin-bottom: 0;
    line-height: 1.1;
  }

  .section-head-left {
    align-items: center;
  }

  .stats-grid {
    gap: 10px;
    grid-template-columns: 1fr;
  }

  .stats-section {
    overflow-x: auto;
  }

  .count-table {
    min-width: 300px;
    table-layout: fixed;
  }

  .count-table th,
  .count-table td {
    padding: 5px 4px;
    font-size: 0.78rem;
  }

  .count-table th:first-child,
  .count-table td:first-child {
    width: 40px;
    max-width: 40px;
  }

  .count-cell {
    font-size: 1.1em;
  }

  .chars-cell {
    gap: 2px;
  }

  .count-table.compact-char-table .char-avatar-box {
    height: auto;
    min-height: 42px;
  }

  .count-table.compact-char-table.reward-breakdown-table .char-avatar-box {
    min-height: 48px;
  }

  .char-avatar-box {
    width: 44px;
  }

  .avatar-img {
    width: 42px;
    height: 42px;
  }

  .festival-avatar-wrap {
    width: 42px;
    height: 42px;
  }

  .festival-unit-logo {
    width: 13px;
    height: 13px;
  }

  .festival-perm-mark,
  .festival-count-badge {
    min-width: 12px;
    height: 12px;
    line-height: 12px;
    font-size: 0.52rem;
  }

  .chars-cell .abbr-text {
    display: none;
  }

  .sub-stat {
    font-size: 0.62em;
    margin-top: 1px;
  }

  .matrix-wrap {
    overflow-x: auto;
    overflow-y: auto;
    max-height: calc(100vh - 120px);
  }

  .matrix-table {
    min-width: 620px;
  }

  .matrix-table th,
  .matrix-table td {
    padding: 6px;
    font-size: 0.8rem;
  }

  .mini-avatar {
    width: 30px;
    height: 30px;
  }

  .matrix-avatar-wrap {
    width: 30px;
    height: 30px;
  }

  .matrix-avatar-unit-logo {
    width: 15px;
    height: 15px;
    right: -4px;
    bottom: -4px;
  }

  .matrix-table td.matrix-num {
    font-size: 0.98rem;
  }

  .attr-summary-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .attr-summary-card {
    padding: 7px;
  }

  .attr-summary-table th,
  .attr-summary-table td {
    padding: 4px 2px;
  }

  .attr-summary-num {
    font-size: 0.98rem;
  }

  .attr-summary-attr-icon {
    width: 18px;
    height: 18px;
  }

  .fes-record-table tbody tr:not(.fes-total-row) td {
    height: 84px;
  }

  .fes-attr-icon {
    width: 20px;
    height: 20px;
  }

  .fes-cell-icons {
    min-height: 72px;
    gap: 1px;
  }

  .fes-cell-avatar {
    width: 36px;
    height: 36px;
  }

  .fes-row-head {
    width: 54px;
    min-width: 54px;
    font-size: 0.66rem;
  }

  .fes-total-num {
    font-size: 0.88rem;
  }

  .festival-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .lineup-plan-row {
    grid-template-columns: 24px repeat(5, minmax(0, 1fr)) 40px;
    gap: 4px;
  }

  .support-unit-title-logo {
    height: 28px;
    max-width: 220px;
  }

  .support-member-avatar {
    width: 27px;
    height: 27px;
  }

  .support-member-attr-icon {
    width: 11px;
    height: 11px;
    top: 1px;
    right: 1px;
  }

  .lineup-char-head {
    gap: 4px;
    flex-wrap: nowrap;
  }

  .lineup-char-main {
    gap: 6px;
  }

  .lineup-char-text {
    gap: 4px;
    align-items: center;
  }

  .lineup-char-avatar {
    width: 30px;
    height: 30px;
  }

  .lineup-char-name {
    font-size: 0.8rem;
    white-space: nowrap;
  }

  .lineup-char-sub {
    font-size: 0.62rem;
    max-width: 30vw;
  }

  .lineup-head-actions {
    gap: 3px;
    flex-wrap: nowrap;
    flex: 0 0 auto;
  }

  .lineup-toggle-btn {
    font-size: 0.58rem;
    padding: 3px 5px;
    white-space: nowrap;
  }

  .lineup-toggle-btn-global {
    font-size: 0.64rem;
    padding: 3px 6px;
    line-height: 1;
  }

  .lineup-head-actions .card-export-btn {
    font-size: 0.58rem;
    padding: 3px 5px;
    white-space: nowrap;
  }

  .lineup-attr-cell,
  .lineup-total-cell,
  .lineup-member-cell {
    min-height: 48px;
  }

  .lineup-attr-icon {
    width: 17px;
    height: 17px;
  }

  .lineup-member-score {
    font-size: 0.86rem;
  }

  .lineup-jump {
    font-size: 0.54rem;
    padding: 1px 2px;
  }

  .lineup-total-cell {
    font-size: 0.9rem;
    font-weight: 900;
  }

  .festival-card {
    padding: 8px;
  }

  .record-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .record-block {
    padding: 8px;
    overflow-x: visible;
  }

  .record-head-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    flex-wrap: nowrap;
  }

  .record-head-left {
    width: auto;
    min-width: 0;
    gap: 4px;
    flex-wrap: nowrap;
    align-items: center;
  }

  .record-head-left h3 {
    font-size: 0.82rem;
    white-space: nowrap;
  }

  .record-head-controls {
    width: auto;
    justify-content: flex-start;
    flex-wrap: nowrap;
    gap: 4px;
  }

  .stats-checkbox {
    font-size: 0.66rem;
    white-space: nowrap;
  }

  .record-sort-btn {
    font-size: 0.62rem;
    padding: 1px 6px;
  }

  .vs-unit-score-table .record-avatar {
    width: 24px;
    height: 24px;
  }

  .vs-original-stat-table th:first-child,
  .vs-original-stat-table td:first-child {
    width: 52px;
    min-width: 52px;
    max-width: 52px;
  }

  .mini-unit-logo {
    width: 24px;
    height: 24px;
  }

  .record-table {
    min-width: 0;
    table-layout: fixed;
  }

  .record-table th,
  .record-table td {
    padding: 4px 3px;
    font-size: 0.68rem;
    word-break: break-word;
  }

  .related-panel .related-table th:first-child,
  .related-panel .related-table td:first-child {
    padding-left: 2px;
    padding-right: 2px;
  }

  .record-char {
    gap: 4px;
  }

  .related-panel .related-table-last.last-record-table-card-mode .record-char > span:not(.record-avatar-stack),
  .related-panel .related-table-interval.interval-record-table-card-mode .record-char > span:not(.record-avatar-stack),
  .related-panel .related-table-vs-last.vs-last-four-card-mode .record-char > span:not(.record-avatar-stack) {
    display: none;
  }

  .record-char > span:not(.record-avatar-stack) {
    min-width: 0;
    overflow: visible;
    text-overflow: clip;
    white-space: nowrap;
  }

  .related-panel .record-char > span:not(.record-avatar-stack) {
    overflow: visible;
    text-overflow: clip;
    white-space: nowrap;
  }

  .record-avatar {
    width: 24px;
    height: 24px;
  }

  .related-panel {
    --related-record-card-row-height: 78px;
    --rel-avatar-size: 24px;
    --rel-avatar-size-card: 30px;
    --rel-last-card-frame-size: 60px;
    --rel-interval-card-frame-size: 60px;
    --rel-jump-chip-min: 64px;

    --rel-min-char-col: 10px;
    --rel-min-card-col: 60px;
    --rel-min-event-col: 40px;
    --rel-min-range-col: 40px;
    --rel-min-date-col: 10px;
    --rel-min-gap-col: 10px;

    --rel-last-char-pct: 28%;
    --rel-last-event-pct: 20%;
    --rel-last-date-pct: 26%;
    --rel-last-gap-pct: 26%;

    --rel-last-card-char-pct: 10%;
    --rel-last-card-card-pct: 24%;
    --rel-last-card-event-pct: 18%;
    --rel-last-card-date-pct: 24%;
    --rel-last-card-gap-pct: 24%;

    --rel-int-char-pct: 28%;
    --rel-int-range-pct: 44%;
    --rel-int-gap-pct: 28%;

    --rel-int-card-char-pct: 10%;
    --rel-int-card-card-pct: 40%;
    --rel-int-card-range-pct: 26%;
    --rel-int-card-gap-pct: 26%;
  }

  .interval-card-column {
    gap: 2px;
  }

  .jump-link {
    font-size: 0.62rem;
    padding: 1px 4px;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .related-panel .jump-link,
  .related-panel .record-block .jump-link {
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
    word-break: break-word;
  }

  .jump-link.lineup-jump {
    font-size: 10px;
    padding: 1px 2px;
    text-overflow: clip;
    -webkit-text-size-adjust: none;
    text-size-adjust: none;
  }
}

@media (max-width: 520px) {
  .pjsk-stats {
    padding: 6px;
  }

  .related-panel {
    --related-record-card-row-height: 78px;
    --rel-avatar-size: 24px;
    --rel-avatar-size-card: 30px;
    --rel-last-card-frame-size: 60px;
    --rel-interval-card-frame-size: 60px;
    --rel-jump-chip-min: 60px;

    --rel-min-char-col: 10px;
    --rel-min-card-col: 60px;
    --rel-min-event-col: 40px;
    --rel-min-range-col: 40px;
    --rel-min-date-col: 10px;
    --rel-min-gap-col: 10px;

    --rel-last-char-pct: 28%;
    --rel-last-event-pct: 20%;
    --rel-last-date-pct: 26%;
    --rel-last-gap-pct: 26%;

    --rel-last-card-char-pct: 10%;
    --rel-last-card-card-pct: 24%;
    --rel-last-card-event-pct: 18%;
    --rel-last-card-date-pct: 24%;
    --rel-last-card-gap-pct: 24%;

    --rel-int-char-pct: 28%;
    --rel-int-range-pct: 44%;
    --rel-int-gap-pct: 28%;

    --rel-int-card-char-pct: 10%;
    --rel-int-card-card-pct: 40%;
    --rel-int-card-range-pct: 26%;
    --rel-int-card-gap-pct: 26%;
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

  .stats-main h1 {
    font-size: 1rem;
    margin-bottom: 6px;
  }

  .card-panel {
    padding: 8px;
  }

  .nav-scroll { max-height: none; }

  .count-table {
    min-width: 0;
  }

  .count-table.compact-char-table .char-avatar-box {
    width: 34px;
    height: auto;
    min-height: 34px;
  }

  .count-table.compact-char-table .avatar-img,
  .count-table.compact-char-table .festival-avatar-wrap {
    width: 34px;
    height: 34px;
  }

  .count-table.compact-char-table.reward-breakdown-table .char-avatar-box {
    min-height: 42px;
  }

  .char-avatar-box {
    width: 38px;
  }

  .avatar-img {
    width: 38px;
    height: 38px;
  }

  .score-attr-wrap {
    gap: 2px;
  }

  .score-attr-icon {
    width: 20px;
    height: 20px;
  }

  .record-table {
    min-width: 0;
  }
}
</style>