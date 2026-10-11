<template>
<UiSurfaceTransition kind="navigation">
<aside v-show="!navCollapsed" :inert="navCollapsed" data-feature-view="card-stats-navigation" data-feature-page="cards" v-liquid-glass="!navCollapsed" class="stats-nav card-panel ui-liquid-glass ui-liquid-glass--prominent ui-glass-optical-detail" :class="{ 'mobile-floating': isNavTopLayout, 'is-collapsed': navCollapsed, 'is-open': !navCollapsed }">
        <button class="pjsk-ui-action nav-collapse-fab export-hide" @click="setNavCollapsed(true)" title="收起统计菜单">
          <img src="/data/icon/menu_open.png" class="nav-collapse-fab-icon" alt="收起菜单" />
        </button>

        <div class="nav-cutoff" :class="{ 'mini-cutoff': isMiniFloatingNav }">
          <div class="mini-cutoff-line">统计活动截止ID：{{ safeMaxEventId }}</div>
          <div class="mobile-cutoff-controls">
            <div class="mini-cutoff-line">统计活动截止 ID</div>
            <div class="nav-cutoff-controls">
              <button type="button" class="pjsk-ui-action id-step-btn" title="减少 1" @click="adjustDisplayEventId(-1)">
                <span class="mobile-cutoff-lens ui-liquid-glass ui-liquid-glass--chip" aria-hidden="true"></span>
                <span class="mobile-cutoff-action-label">－</span>
              </button>
              <input
                v-model="displayEventIdDraft"
                class="pjsk-ui-field id-input"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="8"
                aria-label="统计活动截止 ID"
                @focus="onDisplayEventIdFocus"
                @input="onDisplayEventIdInput($event.target.value)"
                @blur="onDisplayEventIdBlur"
              />
              <button type="button" class="pjsk-ui-action id-step-btn" title="增加 1" @click="adjustDisplayEventId(1)">
                <span class="mobile-cutoff-lens ui-liquid-glass ui-liquid-glass--chip" aria-hidden="true"></span>
                <span class="mobile-cutoff-action-label">＋</span>
              </button>
              <button type="button" class="pjsk-ui-action reset-mini-btn" title="恢复当前活动 ID" @click="resetTopBarDisplayEventId">
                <span class="mobile-cutoff-lens ui-liquid-glass ui-liquid-glass--chip" aria-hidden="true"></span>
                <img src="/data/icon/reset.png" class="reset-mini-icon" alt="" />
              </button>
            </div>
          </div>
        </div>

          <div v-if="!isMobileNav" class="nav-name-format export-hide">
            <span class="nav-name-format-title">名称格式</span>
            <div class="nav-name-format-options">
              <label class="nav-name-format-option">
                <input class="pjsk-ui-choice" v-model="navNameFormat" type="radio" value="abbr" />
                缩写
              </label>
              <label class="nav-name-format-option">
                <input class="pjsk-ui-choice" v-model="navNameFormat" type="radio" value="single" />
                单字
              </label>
            </div>
          </div>
          <div class="nav-name-format export-hide">
            <span class="nav-name-format-title">卡面展示</span>
            <div class="nav-name-format-options">
              <label class="nav-name-format-option">
                <input class="pjsk-ui-choice" v-model="navCardImageMode" type="radio" value="before" />
                花前
              </label>
              <label class="nav-name-format-option">
                <input class="pjsk-ui-choice" v-model="navCardImageMode" type="radio" value="after" />
                花后
              </label>
            </div>
          </div>
          <div class="nav-quick-wrap">
            <div class="nav-scroll">
              <div v-for="group in navGroups" :key="group.id" class="nav-group">
                <button
                  class="pjsk-ui-action nav-link nav-link-main"
                  :class="{ active: isGroupActive(group) }"
                  :title="group.title"
                  :data-nav-target="group.id"
                  @click="handleParentNavClick(group)"
                >
                  {{ group.title }}
                </button>
                <div v-if="group.children?.length && isGroupExpanded(group)" class="nav-sub-list">
                  <button
                    v-for="item in group.children"
                    :key="item.id"
                    class="pjsk-ui-action nav-link nav-link-sub"
                    :class="{ active: activeNavId === item.id }"
                    :title="item.title"
                  :data-nav-target="item.id"
                    @click="handleChildNavClick(group, item)"
                  >
                    {{ item.title }}
                  </button>
                </div>
              </div>
            </div>
          </div>
      </aside>
</UiSurfaceTransition>
</template>

<script setup>
import UiSurfaceTransition from '../../components/ui/UiSurfaceTransition.vue';
defineProps(["isNavTopLayout","navCollapsed","setNavCollapsed","isMiniFloatingNav","safeMaxEventId","adjustDisplayEventId","onDisplayEventIdFocus","onDisplayEventIdInput","onDisplayEventIdBlur","resetTopBarDisplayEventId","isMobileNav","navGroups","isGroupActive","handleParentNavClick","isGroupExpanded","activeNavId","handleChildNavClick"]);
const displayEventIdDraft = defineModel('displayEventIdDraft');
const navNameFormat = defineModel('navNameFormat');
const navCardImageMode = defineModel('navCardImageMode');
</script>
