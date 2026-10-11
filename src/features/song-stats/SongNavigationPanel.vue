<template>
<UiSurfaceTransition kind="navigation">
<aside v-show="!navCollapsed" :inert="navCollapsed" data-feature-view="song-navigation-panel" data-feature-page="songs" v-liquid-glass="!navCollapsed" class="stats-nav card-panel ui-liquid-glass ui-liquid-glass--prominent ui-glass-optical-detail" :class="{ 'mobile-floating': isNavTopLayout, 'is-collapsed': navCollapsed, 'is-open': !navCollapsed }">
        <button class="pjsk-ui-action nav-collapse-fab" @click="setNavCollapsed(true)" title="收起统计菜单">
          <img src="/data/icon/menu_open.png" class="nav-collapse-fab-icon" alt="收起菜单" />
        </button>

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
                  :class="{ active: activeNavId === item.id, 'is-duo-subanchor': isNestedNavChild(item) }"
                  v-show="shouldShowNavChild(item)"
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


/** Feature view: native markup and callbacks are preserved; state remains in its controller. */
defineProps(["isNavTopLayout","navCollapsed","setNavCollapsed","navGroups","isGroupActive","handleParentNavClick","isGroupExpanded","activeNavId","isNestedNavChild","handleChildNavClick","shouldShowNavChild"]);

</script>
