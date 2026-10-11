import { computed } from 'vue';

/** Character Attribute Preview owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: PreviewSelections, PreviewCutoff, Formatting, Presentation.
 */
export function useHistoryCharacterAttributePreview(ports) {
const createPreviewCharAttrMetricSeed = () => ({
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

const createPreviewCharAttrSeed = () => ({
  Pure: createPreviewCharAttrMetricSeed(),
  Cool: createPreviewCharAttrMetricSeed(),
  Cute: createPreviewCharAttrMetricSeed(),
  Happy: createPreviewCharAttrMetricSeed(),
  Mysterious: createPreviewCharAttrMetricSeed(),
  total: createPreviewCharAttrMetricSeed()
});

const previewCharAttrRows = computed(() => {
  if (!ports.previewSelections.selectedPreviewPanelIds.value.includes('char-attr')) return [];
  if (!ports.previewSelections.selectedPreviewCharAttrChars.value.length) return [];

  const maxId = Number(ports.previewCutoff.previewMaxEventId.value);
  const pureExcludedSkills = ports.previewSelections.previewIncludeUnitScoreInPureScore.value
    ? new Set(['accuracy', 'recovery', '-', ''])
    : new Set(['accuracy', 'recovery', 'unit_score', '-', '']);

  const statsByName = Object.fromEntries(
    ports.previewSelections.selectedPreviewCharAttrChars.value.map((name) => [name, createPreviewCharAttrSeed()])
  );

  ports.previewCutoff.previewEffectiveCards.value.forEach((card) => {
    if (!ports.previewCutoff.isCardWithinPreviewLimit(card, maxId)) return;
    const baseName = ports.previewSelections.normalizeCharName(card?.Name);
    if (!statsByName[baseName]) return;

    const attr = ports.formatting.normalizeEventHistoryAttribute(card?.Attribute);
    if (!ports.previewSelections.PREVIEW_ATTRS.includes(attr)) return;

    const rarity = String(card?.Rarity || '').trim();
    const skill = String(card?.Skill || '').trim().toLowerCase();
    const attrBucket = statsByName[baseName][attr];
    const totalBucket = statsByName[baseName].total;
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
    const source = bucket || createPreviewCharAttrMetricSeed();
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

  return ports.previewSelections.selectedPreviewCharAttrChars.value
    .map((name) => {
      const source = statsByName[name] || createPreviewCharAttrSeed();
      const isVs = ports.presentation.isVirtualSinger(name);
      return {
        name,
        mainScoreLabel: isVs ? '团' : '分',
        rows: ports.previewSelections.PREVIEW_ATTRS.map((attr) => toSummaryRow(source[attr], isVs, attr)),
        totalRow: toSummaryRow(source.total, isVs, 'total')
      };
    })
    .sort((a, b) => ports.previewSelections.getPreviewCharOrder(a.name) - ports.previewSelections.getPreviewCharOrder(b.name));
});

const getPreviewCharAttrCardStyle = (name) => {
  const color = ports.presentation.getCharColor(name);
  return {
    backgroundColor: ports.formatting.hexToRgba(color, 0.14),
    borderColor: ports.formatting.hexToRgba(color, 0.34)
  };
};

const getPreviewCharAttrRowStyle = (attr) => {
  const color = ports.previewSelections.PREVIEW_DAILY_ATTR_COLOR[String(attr || '')] || '#94a3b8';
  return {
    '--preview-char-attr-row-bg': ports.formatting.hexToRgba(color, 0.16)
  };
};


return {
  previewCharAttrRows,
  getPreviewCharAttrCardStyle,
  getPreviewCharAttrRowStyle,
};
}
