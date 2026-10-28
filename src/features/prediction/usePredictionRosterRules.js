import { computed } from "vue";
import { isCollaborationEvent } from "../../domain/collaborationEvents.js";
import { WORLD_LINK_PREDICTION_SKILL } from '../../domain/worldLink.js';

/** Owns prediction roster rules; state is per editor instance. */
export const usePredictionRosterRules = (dependencies = {}) => {
  const isWorldLinkMode = computed(() => dependencies.form.eventType === 'World Link' && dependencies.isWorldLinkTeamSeries(dependencies.props.event));
  const isFixedRosterCollabMode = computed(() => isCollaborationEvent(dependencies.props.event));
  const isFixedRosterMode = computed(() => isWorldLinkMode.value || isFixedRosterCollabMode.value);
  const fixedRosterTip = computed(() => {
    if (isFixedRosterCollabMode.value) return '联动人选、人数、星级与组合已固定，仅预测花色和技能';
    if (isWorldLinkMode.value) return 'World Link 人选固定，无需 Ban主';
    return '第一个角色默认为 Ban主';
  });
  const normalizedBoxLockedUnits = computed(() => {
    const list = Array.isArray(dependencies.props.boxLockedUnits) ? dependencies.props.boxLockedUnits : [];
    return list
      .map((u) => String(u || '').trim().toLowerCase())
      .filter((u) => dependencies.BOX_UNITS.includes(u));
  });

  let isApplyingRules = false;

  const getOCUnit = (name) => dependencies.CHAR_UNIT_MAP[name] || 'vs';
  const isUnitLockedInCurrentRound = (unit, options = {}) => {
    const ignoreFesBypass = options.ignoreFesBypass === true;
    if (dependencies.form.eventType !== '箱活') return false;
    if (!ignoreFesBypass && dependencies.FES_FESTIVALS.includes(String(dependencies.props.event?.festival || '').trim())) return false;
    return normalizedBoxLockedUnits.value.includes(String(unit || '').trim().toLowerCase());
  };
  const isFesFestival = () => dependencies.FES_FESTIVALS.includes(String(dependencies.props.event?.festival || '').trim());
  const isBfesSkillAvailable = (char) => !isWorldLinkMode.value && !isFixedRosterCollabMode.value && !!dependencies.ACTIVE_FES_SKILL_KEY && isFesFestival() && String(char?.rarity) === '4';
  const isPScoreAvailable = (char) => String(char?.rarity) === '4';
  const isVsFesSkillMode = (char) => isBfesSkillAvailable(char) && dependencies.VS_NAMES.includes(char?.name);
  const isActiveFesSkill = (skillType) => String(skillType || '').trim() === dependencies.ACTIVE_FES_SKILL_KEY;

  const isFesSkillTag = (skillType) => {
    const raw = String(skillType || '').trim().toLowerCase();
    return raw.includes('fes') || isActiveFesSkill(raw);
  };

  const isBannerEligibleChar = (char) => {
    if (!char) return false;
    if (String(char?.rarity || '') !== '4') return false;
    if (isFesSkillTag(char?.skillType)) return false;
    if (dependencies.form.eventType === '箱活') {
      if (dependencies.VS_NAMES.includes(char?.name)) return false;
      if (isUnitLockedInCurrentRound(getOCUnit(char?.name), { ignoreFesBypass: true })) return false;
    }
    return true;
  };

  const bannerCandidates = computed(() => dependencies.form.selectedChars.filter((char) => isBannerEligibleChar(char)));

  const activeBannerName = computed(() => {
    if (isFixedRosterMode.value) return '';
    const names = bannerCandidates.value.map((char) => String(char?.name || '').trim()).filter(Boolean);
    if (!names.length) return '';
    if (names.includes(dependencies.form.bannerName)) return dependencies.form.bannerName;
    return names[0];
  });

  const syncBannerName = () => {
    if (isFixedRosterMode.value) {
      dependencies.form.bannerName = '';
      return;
    }
    const next = activeBannerName.value;
    if (dependencies.form.bannerName !== next) {
      dependencies.form.bannerName = next;
    }
  };

  const shouldMarkBannerCard = (char) => {
    if (isFixedRosterMode.value) return false;
    return String(char?.name || '').trim() === String(activeBannerName.value || '').trim();
  };

  const getBannerUnit = () => {
    const banner = dependencies.form.selectedChars.find((char) => String(char?.name || '').trim() === String(activeBannerName.value || '').trim());
    if (banner && banner.name) return getOCUnit(banner.name);
    const fallback = dependencies.form.selectedChars.find((char) => !dependencies.VS_NAMES.includes(char?.name));
    if (fallback?.name) return getOCUnit(fallback.name);
    if (dependencies.form.selectedChars[0]?.name) return getOCUnit(dependencies.form.selectedChars[0].name);
    return '';
  };

  const getDisplayUnit = (char) => {
    if (isFixedRosterCollabMode.value) {
      return char?.selectedUnit || getOCUnit(char?.name);
    }
    if (isBfesVsUnitLocked(char)) {
      return 'vs';
    }
    if (dependencies.VS_NAMES.includes(char?.name) && isVSUnitLocked(char)) {
      return getBannerUnit();
    }
    if (dependencies.VS_NAMES.includes(char?.name)) {
      return char?.selectedUnit || 'vs';
    }
    return getOCUnit(char?.name);
  };

  const isVSUnitLocked = (char) => {
    return isFixedRosterMode.value
      || isBfesVsUnitLocked(char)
      || (dependencies.form.eventType === '箱活' && dependencies.VS_NAMES.includes(char.name) && !!getBannerUnit());
  };

  const isBfesLocked = (char) => {
    return isActiveFesSkill(char?.skillType) && String(char?.rarity) === '4';
  };

  const isForcedBfesInBox = (char) => {
    if (dependencies.form.eventType !== '箱活' || !isFesFestival() || dependencies.form.selectedChars.length === 0) return false;
    if (dependencies.VS_NAMES.includes(char?.name)) return false;
    const bannerUnit = getBannerUnit();
    if (!bannerUnit) return false;
    return getOCUnit(char?.name) !== bannerUnit;
  };

  const isBfesVsUnitLocked = (char) => {
    return isBfesLocked(char) && dependencies.VS_NAMES.includes(char?.name);
  };

  const isUnitScoreLocked = (char) => {
    return !isVsFesSkillMode(char) && !isBfesLocked(char) && dependencies.form.gachaType === 'limited' && dependencies.VS_NAMES.includes(char?.name) && String(char?.rarity) === '4';
  };

  const isConfirmedSkillLocked = () => isWorldLinkMode.value;

  const isSkillLocked = (char) => {
    return isConfirmedSkillLocked() || isForcedBfesInBox(char) || isUnitScoreLocked(char);
  };

  const isRarityLocked = (char) => {
    return isFixedRosterMode.value || isForcedBfesInBox(char);
  };

  const isAttrLocked = (char) => {
    return !isWorldLinkMode.value && !!dependencies.form.predictAttr && String(char?.rarity) === '4' && !isBfesLocked(char);
  };

  const isCharSelectable = (name) => {
    return getCharDisableReason(name) === '';
  };

  const getCharDisableReason = (name) => {
    if (isFixedRosterMode.value) return '';
    if (dependencies.form.eventType !== '箱活') return '';

    const isFirstPick = dependencies.form.selectedChars.length === 0;
    if (!dependencies.VS_NAMES.includes(name) && isUnitLockedInCurrentRound(getOCUnit(name), { ignoreFesBypass: isFirstPick })) {
      return '本轮箱活已出';
    }

    if (isFirstPick) {
      return dependencies.VS_NAMES.includes(name) ? '箱活Ban主禁止选v' : '';
    }

    if (isFesFestival()) return '';
    if (dependencies.VS_NAMES.includes(name)) return '';

    const bannerUnit = getBannerUnit();
    return getOCUnit(name) === bannerUnit ? '' : '与箱活团队不一致';
  };

  const clearInvalidBoxBanner = () => {
    if (dependencies.form.eventType !== '箱活') return;
    const bannerIdx = dependencies.form.selectedChars.findIndex((char) => String(char?.name || '').trim() === String(dependencies.form.bannerName || '').trim());
    if (bannerIdx < 0) return;
    const bannerChar = dependencies.form.selectedChars[bannerIdx];
    if (!bannerChar) return;
    if (
      dependencies.VS_NAMES.includes(bannerChar.name)
      || isUnitLockedInCurrentRound(getOCUnit(bannerChar.name), { ignoreFesBypass: true })
    ) {
      dependencies.form.selectedChars.splice(bannerIdx, 1);
    }
  };

  const applyBoxPoolRestriction = () => {
    if (dependencies.form.eventType !== '箱活' || dependencies.form.selectedChars.length === 0) return;
    for (let i = dependencies.form.selectedChars.length - 1; i >= 1; i -= 1) {
      const c = dependencies.form.selectedChars[i];
      if (!isCharSelectable(c.name)) {
        dependencies.form.selectedChars.splice(i, 1);
      }
    }
  };

  const applyGlobalAttrToFourStars = () => {
    if (isWorldLinkMode.value) {
      dependencies.form.predictAttr = '';
      return;
    }
    if (!dependencies.form.predictAttr) return;
    dependencies.form.selectedChars.forEach((c) => {
      if (String(c.rarity) === '4' && !isBfesLocked(c)) {
        c.attr = dependencies.form.predictAttr;
      }
    });
  };

  const applyFesRules = () => {
    if (isWorldLinkMode.value || isFixedRosterCollabMode.value) return;
    dependencies.form.selectedChars.forEach((c) => {
      if (!isBfesSkillAvailable(c) && isActiveFesSkill(c.skillType)) {
        c.skillType = '-';
      }
      if (isBfesVsUnitLocked(c)) {
        c.selectedUnit = 'vs';
      }
    });
  };

  const applyAutoSkillRules = () => {
    dependencies.form.selectedChars.forEach((c) => {
      if (isFixedRosterCollabMode.value) {
        if (!isPScoreAvailable(c) && c.skillType === 'p_score') c.skillType = '-';
        return;
      }
      if (isConfirmedSkillLocked()) {
        c.skillType = WORLD_LINK_PREDICTION_SKILL;
        return;
      }

      if (isForcedBfesInBox(c)) {
        c.rarity = '4';
        c.skillType = dependencies.ACTIVE_FES_SKILL_KEY;
      } else if (isVsFesSkillMode(c) && !['unit_score', dependencies.ACTIVE_FES_SKILL_KEY].includes(c.skillType)) {
        c.skillType = 'unit_score';
      } else if (isBfesLocked(c)) {
        c.skillType = dependencies.ACTIVE_FES_SKILL_KEY;
      } else if (isUnitScoreLocked(c)) {
        c.skillType = 'unit_score';
      } else if (!isVsFesSkillMode(c) && (c.skillType === 'unit_score' || isActiveFesSkill(c.skillType))) {
        c.skillType = '-';
      }

      if (!isPScoreAvailable(c) && c.skillType === 'p_score') {
        c.skillType = '-';
      }
    });
  };

  const lockVSUnitToBanner = () => {
    if (dependencies.form.eventType !== '箱活' || dependencies.form.selectedChars.length === 0) return;
    const bannerUnit = getBannerUnit();
    if (!bannerUnit) return;
    dependencies.form.selectedChars.forEach((c) => {
      if (isBfesVsUnitLocked(c)) {
        c.selectedUnit = 'vs';
      } else if (dependencies.VS_NAMES.includes(c.name)) {
        c.selectedUnit = bannerUnit;
      }
    });
  };

  const applyAllRules = () => {
    if (isApplyingRules) return;
    isApplyingRules = true;
    try {
      clearInvalidBoxBanner();
      applyBoxPoolRestriction();
      syncBannerName();
      applyGlobalAttrToFourStars();
      applyFesRules();
      applyAutoSkillRules();
      syncBannerName();
      lockVSUnitToBanner();
    } finally {
      isApplyingRules = false;
      dependencies.bumpRender();
    }
  };
  return {
    get isWorldLinkMode() { return isWorldLinkMode; },
    get isFixedRosterCollabMode() { return isFixedRosterCollabMode; },
    get isFixedRosterMode() { return isFixedRosterMode; },
    get fixedRosterTip() { return fixedRosterTip; },
    get normalizedBoxLockedUnits() { return normalizedBoxLockedUnits; },
    get isApplyingRules() { return isApplyingRules; },
    get getOCUnit() { return getOCUnit; },
    get isUnitLockedInCurrentRound() { return isUnitLockedInCurrentRound; },
    get isFesFestival() { return isFesFestival; },
    get isBfesSkillAvailable() { return isBfesSkillAvailable; },
    get isPScoreAvailable() { return isPScoreAvailable; },
    get isVsFesSkillMode() { return isVsFesSkillMode; },
    get isActiveFesSkill() { return isActiveFesSkill; },
    get isFesSkillTag() { return isFesSkillTag; },
    get isBannerEligibleChar() { return isBannerEligibleChar; },
    get bannerCandidates() { return bannerCandidates; },
    get activeBannerName() { return activeBannerName; },
    get syncBannerName() { return syncBannerName; },
    get shouldMarkBannerCard() { return shouldMarkBannerCard; },
    get getBannerUnit() { return getBannerUnit; },
    get getDisplayUnit() { return getDisplayUnit; },
    get isVSUnitLocked() { return isVSUnitLocked; },
    get isBfesLocked() { return isBfesLocked; },
    get isForcedBfesInBox() { return isForcedBfesInBox; },
    get isBfesVsUnitLocked() { return isBfesVsUnitLocked; },
    get isUnitScoreLocked() { return isUnitScoreLocked; },
    get isConfirmedSkillLocked() { return isConfirmedSkillLocked; },
    get isSkillLocked() { return isSkillLocked; },
    get isRarityLocked() { return isRarityLocked; },
    get isAttrLocked() { return isAttrLocked; },
    get isCharSelectable() { return isCharSelectable; },
    get getCharDisableReason() { return getCharDisableReason; },
    get clearInvalidBoxBanner() { return clearInvalidBoxBanner; },
    get applyBoxPoolRestriction() { return applyBoxPoolRestriction; },
    get applyGlobalAttrToFourStars() { return applyGlobalAttrToFourStars; },
    get applyFesRules() { return applyFesRules; },
    get applyAutoSkillRules() { return applyAutoSkillRules; },
    get lockVSUnitToBanner() { return lockVSUnitToBanner; },
    get applyAllRules() { return applyAllRules; }
  };
};
