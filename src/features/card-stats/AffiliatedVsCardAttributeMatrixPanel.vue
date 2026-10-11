<template>
<div data-feature-view="affiliated-vs-card-attribute-matrix-panel" data-feature-page="cards" id="panel-vs-matrix" data-scroll-anchor="panel-vs-matrix" class="stats-section card-panel matrix-panel">
          <div class="section-head">
            <h2>虚拟歌手矩阵</h2>
            <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-vs-matrix', '虚拟歌手矩阵')">PNG</button>
          </div>
          <div class="matrix-wrap">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th>角色</th>
                  <th v-for="(attr, idx) in ATTRS" :key="`vs-head-${attr}`" :class="matrixGroupClass(idx, ATTRS.length)">
                    <button class="pjsk-ui-action matrix-sort-btn" @click="toggleMatrixSort(attr)">
                      <span>{{ ATTR_LABELS[attr] }}</span>
                      <img class="matrix-sort-icon" :src="getMatrixSortIconSrc(attr)" alt="排序图标" />
                    </button>
                  </th>
                  <th :class="matrixGroupClass(0, 4)">
                    <button class="pjsk-ui-action matrix-sort-btn" @click="toggleMatrixSort('unitScoreCount')"><span>团分</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('unitScoreCount')" alt="排序图标" /></button>
                  </th>
                  <th>
                    <button class="pjsk-ui-action matrix-sort-btn" @click="toggleMatrixSort('scoreUpCount')"><span>普分</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('scoreUpCount')" alt="排序图标" /></button>
                  </th>
                  <th>
                    <button class="pjsk-ui-action matrix-sort-btn" @click="toggleMatrixSort('pScoreCount')"><span>P 分</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('pScoreCount')" alt="排序图标" /></button>
                  </th>
                  <th>
                    <button class="pjsk-ui-action matrix-sort-btn" @click="toggleMatrixSort('accuracyCount')"><span>判卡</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('accuracyCount')" alt="排序图标" /></button>
                  </th>
                  <th :class="matrixGroupClass(3, 4)">
                    <button class="pjsk-ui-action matrix-sort-btn" @click="toggleMatrixSort('recoveryCount')"><span>奶卡</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('recoveryCount')" alt="排序图标" /></button>
                  </th>
                  <th :class="matrixGroupClass(0, 4)">
                    <button class="pjsk-ui-action matrix-sort-btn" @click="toggleMatrixSort('fourStarCount')"><span>四星</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('fourStarCount')" alt="排序图标" /></button>
                  </th>
                  <th>
                    <button class="pjsk-ui-action matrix-sort-btn" @click="toggleMatrixSort('threeStarCount')"><span>三星</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('threeStarCount')" alt="排序图标" /></button>
                  </th>
                  <th>
                    <button class="pjsk-ui-action matrix-sort-btn" @click="toggleMatrixSort('twoStarCount')"><span>二星</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('twoStarCount')" alt="排序图标" /></button>
                  </th>
                  <th :class="matrixGroupClass(3, 4)">
                    <button class="pjsk-ui-action matrix-sort-btn" @click="toggleMatrixSort('rewardTotalCount')"><span>报酬</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('rewardTotalCount')" alt="排序图标" /></button>
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
</template>

<script setup>
defineProps(["isExportingPng","exportElementPng","ATTRS","matrixGroupClass","toggleMatrixSort","ATTR_LABELS","getMatrixSortIconSrc","virtualSingerMatrixRows","getMatrixUnitFrameClass","getCharTint","getMatrixUnitColor","getUnitMatrixTint","getCharAbbr","getCharColor","getVsUnitLogoByKey","parseVsMatrixRowName","getVsMatrixValueClass","virtualSingerUnitTotalRows","getVsUnitTotalTint","UNIT_COLORS","unitLogoMap"]);
</script>
