import { ref, computed, inject, hasInjectionContext } from 'vue';
import { APP_SETTINGS_KEY } from '../../services/appSettings.js';

/** Owns card presentation behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardPresentation(inputs) {
  const settings = hasInjectionContext() ? inject(APP_SETTINGS_KEY, null) : null;
  const navNameFormat = settings?.nameFormat || ref('single');

  const navCardImageMode = settings?.singleCardFace || ref('after');

  const isFesCardType = (typeValue) => inputs.constants.FES_CARD_TYPES.has(String(typeValue || '').trim().toLowerCase());

  const isFesSkillType = (skillKind) => {
    const kind = String(skillKind || '').trim().toLowerCase();
    if (!kind) return false;
    // Keep compatibility with specific CFES variants like cfes_l / cfes_j.
    if (kind.startsWith('cfes')) return true;
    return inputs.constants.FES_SKILL_TYPES.has(kind);
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
    return hexToRgba(inputs.metadata.getCharColor(name), 0.2);
  };

  const getMatrixUnitColor = (name) => inputs.metadata.UNIT_COLORS[inputs.metadata.getUnitByChar(name)] || '#9ca3af';

  const getUnitMatrixTint = (name) => hexToSoftSolid(getMatrixUnitColor(name));

  const getRecordTint = (name, alpha = 0.3) => hexToRgba(inputs.metadata.getCharColor(name), alpha);

  const parseDateSafe = (dateStr) => {
    const d = new Date(String(dateStr || '').replace(/\//g, '-'));
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const normalizeBannerName = (banner) => String(banner || '').trim().split(/\s+/)[0] || '';

  const monthsSince = (dateStr) => {
    const d = parseDateSafe(dateStr);
    if (!d) return 0;
    const ref = inputs.eventCatalog.referenceDateObj.value;
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
    const names = [...(sourceNames || [])].sort((a, b) => (inputs.metadata.CHAR_ORDER[a] || 999) - (inputs.metadata.CHAR_ORDER[b] || 999));
    const lukaIdx = names.indexOf('巡音流歌');
    const mikuIdx = names.indexOf('初音未来');
    if (lukaIdx >= 0 && mikuIdx >= 0 && lukaIdx !== mikuIdx + 1) {
      names.splice(lukaIdx, 1);
      names.splice(mikuIdx + 1, 0, '巡音流歌');
    }
    return names;
  };

  const compareCharOrder = (a, b) => (inputs.metadata.CHAR_ORDER[a] || 999) - (inputs.metadata.CHAR_ORDER[b] || 999);

  const getUnitAccentColor = (unit) => inputs.metadata.UNIT_COLORS[String(unit || '').trim().toLowerCase()] || '#64748b';

  const getDistUnitSummaryChipStyle = (unit) => {
    const color = getUnitAccentColor(unit);
    return {
      backgroundColor: hexToRgba(color, 0.16),
      borderColor: hexToRgba(color, 0.34),
      color
    };
  };

  const getTypeSeriesText = (value) => {
    const s = String(value ?? '').trim();
    return s && s !== 'null' && s !== 'undefined' ? s : '';
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

    const wl3Ids = (inputs.props.allEvents || [])
      .filter((item) => {
        if (inputs.eventCatalog.shouldSkipPredictEvent(item)) return false;
        if (!inputs.eventCatalog.isNumericEventId(item?.id)) return false;
        if (Number(item.id) > Number(inputs.eventCatalog.safeMaxEventId.value)) return false;
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
    const bannerMark = bannerName ? inputs.metadata.getCharAbbr(bannerName).toLowerCase() : '';
    const unitMark = String(ev.unit || '').trim().toLowerCase();
    const collabLabel = inputs.constants.SPECIAL_EVENT_KEY_LABELS[sourceKey] || '';

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

  const formatGapValue = (gap) => (gap ? `${gap.days}天 | ${gap.periods}期` : '-');

  const getLineupCardId = (name) => `lineup-card-${inputs.metadata.getCharAbbr(name).toLowerCase()}`;

  const getSupportCardId = (unit) => `support-card-${String(unit || '').toLowerCase()}`;

  const getAttrSummaryCardId = (name) => `attr-summary-${inputs.metadata.getCharAbbr(name).toLowerCase()}`;

  const getSupportMemberIconKey = (slot) => {
    const baseName = String(slot?.name || '').trim().split(/\s+/)[0] || '';
    if (!baseName) return '';

    const baseAbbr = inputs.metadata.CHAR_MAP[baseName] || inputs.metadata.getCharAbbr(baseName);
    if (!inputs.metadata.VS_NAMES.includes(baseName)) return baseAbbr;

    const unit = String(slot?.unit || '').trim().toLowerCase();
    if (unit && unit !== 'vs') return `${String(baseAbbr).toLowerCase()}_${unit}`;
    return baseAbbr;
  };

  const getCharSingleMark = (name) => {
    const key = String(name || '').split(/\s+/)[0];
    return inputs.metadata.CHAR_SINGLE_MAP[key] || key;
  };

  const useSingleNameMark = computed(() => navNameFormat.value === 'single');

  const getDistNameLabel = (name) => {
    if (useSingleNameMark.value) return getCharSingleMark(name);
    return inputs.metadata.getCharAbbr(name);
  };

  return {
    toDisplayOrderedCharNames,
    getLineupCardId,
    getSupportCardId,
    hexToRgba,
    hexToSoftSolid,
    parseDateSafe,
    getNonBanEventMark,
    daysBetween,
    useSingleNameMark,
    normalizeBannerName,
    isFesCardType,
    getCharSingleMark,
    isFesSkillType,
    getFesKindBySkillKind,
    monthsSince,
    compareCharOrder,
    getTypeSeriesText,
    getEventTypeShort,
    getSupportMemberIconKey,
    getCharTint,
    getUnitMatrixTint,
    getUnitAccentColor,
    getMatrixUnitColor,
    getAttrSummaryCardId,
    getWl3PartSuffix,
    navCardImageMode,
    getDistNameLabel,
    getDistUnitSummaryChipStyle,
    getRecordTint,
    formatGapValue,
    navNameFormat,
  };
}
