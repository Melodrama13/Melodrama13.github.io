<template>
<div data-feature-view="card-attribute-summary-panel" data-feature-page="cards" id="panel-attr-summary" data-scroll-anchor="panel-attr-summary" class="stats-section card-panel matrix-panel attr-summary-panel">
          <div class="section-head">
            <h2>花色统计</h2>
            <button class="pjsk-ui-action card-export-btn" :disabled="isExportingPng" @click="exportElementPng('panel-attr-summary', '花色统计')">PNG</button>
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
                  class="pjsk-ui-action card-export-btn"
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
                      <img :src="`/elements/attr_${String(row.attr).toLowerCase()}_v1.png`" class="attr-summary-attr-icon" :alt="ATTR_LABELS[row.attr]" :title="ATTR_LABELS[row.attr]" />
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
</template>

<script setup>
defineProps(["isExportingPng","exportElementPng","attrSummaryCards","getCharTint","getMatrixUnitColor","getCharAbbr","getCharColor","getAttrSummaryAttrRowStyle","ATTR_LABELS"]);
</script>
