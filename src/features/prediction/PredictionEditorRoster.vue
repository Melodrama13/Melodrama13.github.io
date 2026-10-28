<template>
<div data-feature-view="prediction-editor-roster" data-feature-page="prediction-editor" class="selected-section">
        <div class="section-title">
          <span>当前阵容 ({{ form.selectedChars.length }})</span>
          <span class="tip">{{ fixedRosterTip }}</span>
        </div>

        <div class="selected-list" :key="selectedRenderKey">
          <div
            v-for="(char, idx) in form.selectedChars"
            :key="`${char.cardId || ''}-${char.name}-${idx}`"
            class="editor-card"
            :class="{ 'is-banner-card': shouldMarkBannerCard(char) }"
          >
            <div class="card-left">
              <img :src="`/chars/${charMap[char.name]}.png`" class="editor-avatar" />
            </div>

            <div class="card-right">
              <div class="name-row">
                <span class="char-name">{{ char.name }}</span>
              </div>

              <div class="config-row">
                <select v-if="VS_NAMES.includes(char.name) && !isVSUnitLocked(char)" v-model="char.selectedUnit" class="pjsk-ui-field mini-select unit-sel">
                  <option v-for="u in UNITS" :key="u" :value="u">{{u.toUpperCase()}}</option>
                </select>
                <span v-else class="unit-tag">{{ getDisplayUnit(char).toUpperCase() }}</span>

                <select v-model="char.rarity" class="pjsk-ui-field mini-select rarity-sel" :disabled="isRarityLocked(char)">
                  <option value="4">4★</option>
                  <option value="3">3★</option>
                  <option value="2">2★</option>
                </select>

                <select v-model="char.attr" class="pjsk-ui-field mini-select attr-sel" :disabled="isAttrLocked(char)">
                  <option value="-">待定</option>
                  <option value="Pure">绿草</option>
                  <option value="Mysterious">紫月</option>
                  <option value="Cute">粉花</option>
                  <option value="Cool">蓝星</option>
                  <option value="Happy">橙心</option>
                </select>

                <select v-if="isVsFesSkillMode(char)" v-model="char.skillType" class="pjsk-ui-field mini-select skill-sel">
                  <option value="unit_score">团分</option>
                  <option :value="ACTIVE_FES_SKILL_KEY">{{ ACTIVE_FES_SKILL_LABEL }}</option>
                </select>
                <select v-else v-model="char.skillType" class="pjsk-ui-field mini-select skill-sel" :disabled="isSkillLocked(char)">
                  <option value="-">待定</option>
                  <option value="score_up">普分</option>
                  <option v-if="isPScoreAvailable(char)" value="p_score">P分</option>
                  <option value="recovery">奶卡</option>
                  <option value="accuracy">判卡</option>
                  <option v-if="isUnitScoreLocked(char) || char.skillType === 'unit_score' || (isFixedRosterCollabMode && VS_NAMES.includes(char.name) && String(char.rarity) === '4')" value="unit_score">团分</option>
                  <option v-if="isBfesSkillAvailable(char)" :value="ACTIVE_FES_SKILL_KEY">{{ ACTIVE_FES_SKILL_LABEL }}</option>
                </select>
              </div>
            </div>
          </div>
          <div v-if="form.selectedChars.length === 0" class="empty-hint">请在下方选择角色</div>
        </div>
      </div>
</template>

<script setup>
/** Native controls share the editor's per-instance form and explicit actions. */
defineProps(["form","fixedRosterTip","selectedRenderKey","shouldMarkBannerCard","charMap","VS_NAMES","isVSUnitLocked","UNITS","getDisplayUnit","isRarityLocked","isAttrLocked","isVsFesSkillMode","ACTIVE_FES_SKILL_KEY","ACTIVE_FES_SKILL_LABEL","isSkillLocked","isPScoreAvailable","isUnitScoreLocked","isBfesSkillAvailable","isFixedRosterCollabMode"]);
</script>
