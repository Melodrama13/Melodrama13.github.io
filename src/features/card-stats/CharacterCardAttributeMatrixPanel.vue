<template>
<div data-feature-view="character-card-attribute-matrix-panel" data-feature-page="cards" id="panel-matrix" data-scroll-anchor="panel-matrix" class="stats-section card-panel matrix-panel">
          <div class="section-head">
            <div class="section-head-left">
              <h2>角色矩阵</h2>
              <label class="matrix-pure-toggle stats-checkbox" title="勾选后，分卡统计会计入团分卡。">
                <input class="pjsk-ui-choice" :checked="includeUnitScoreInPureScore" type="checkbox" @change="onIncludeUnitScoreInPureScoreChange" />
                分卡统计团分
              </label>
            </div>
            <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-matrix', '角色矩阵')">PNG</button>
          </div>
          <div class="matrix-wrap">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th>角色</th>
                  <th v-for="(attr, idx) in ATTRS" :key="`head-${attr}`" :class="matrixGroupClass(idx, ATTRS.length)">
                    <button class="pjsk-ui-action matrix-sort-btn" @click="toggleMatrixSort(attr)">
                      <span>{{ ATTR_LABELS[attr] }}</span>
                      <img class="matrix-sort-icon" :src="getMatrixSortIconSrc(attr)" alt="排序图标" />
                    </button>
                  </th>
                  <th :class="matrixGroupClass(0, 4)">
                    <button class="pjsk-ui-action matrix-sort-btn" @click="toggleMatrixSort('pureScoreCount')"><span>分卡</span><img class="matrix-sort-icon" :src="getMatrixSortIconSrc('pureScoreCount')" alt="排序图标" /></button>
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
</template>

<script setup>
defineProps(["includeUnitScoreInPureScore","onIncludeUnitScoreInPureScoreChange","isExportingPng","exportElementPng","ATTRS","matrixGroupClass","toggleMatrixSort","ATTR_LABELS","getMatrixSortIconSrc","attrMatrixRows","getMatrixUnitFrameClass","getCharTint","getMatrixUnitColor","getUnitMatrixTint","getCharAbbr","getCharColor","getAttrExtremeClass","attrMatrixTotalRow"]);
</script>
