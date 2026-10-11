import { ref, computed } from 'vue';

/** Owns card fes records behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardFesRecords(inputs) {
  const fesRecordShowCardImages = ref(false);

  const onFesRecordShowCardImagesChange = (event) => {
    const checked = !!event?.target?.checked;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      fesRecordShowCardImages.value = checked;
    }, anchorEl);
  };

  const getFesMatrixAttrHeadStyle = (attr) => ({
    backgroundColor: inputs.presentation.hexToRgba(inputs.constants.ATTR_COLORS[attr] || '#94a3b8', 0.18)
  });

  const getFesMatrixUnitHeadStyle = (unit) => ({
    backgroundColor: inputs.presentation.hexToRgba(inputs.metadata.UNIT_COLORS[unit] || '#94a3b8', 0.2)
  });

  const getFesMatrixCellStyle = (unit, attr) => ({
    backgroundImage: `linear-gradient(${inputs.presentation.hexToRgba(inputs.metadata.UNIT_COLORS[unit] || '#94a3b8', 0.12)}, ${inputs.presentation.hexToRgba(inputs.metadata.UNIT_COLORS[unit] || '#94a3b8', 0.12)}), linear-gradient(${inputs.presentation.hexToRgba(inputs.constants.ATTR_COLORS[attr] || '#94a3b8', 0.12)}, ${inputs.presentation.hexToRgba(inputs.constants.ATTR_COLORS[attr] || '#94a3b8', 0.12)})`,
    backgroundColor: '#f8fafc'
  });

  const getFesMatrixUnitStripCellStyle = (unit) => ({
    backgroundColor: inputs.presentation.hexToRgba(inputs.metadata.UNIT_COLORS[unit] || '#94a3b8', 0.14)
  });

  const getFesMatrixTotalCellStyle = (attr) => ({
    fontWeight: 800
  });

  const getFesMatrixTotalChipStyle = (attr) => ({
    backgroundColor: inputs.presentation.hexToRgba(inputs.constants.ATTR_COLORS[attr] || '#94a3b8', 0.2),
    fontWeight: 800
  });

  const createFesIconRowsSeed = () => Object.fromEntries(
    inputs.constants.RELATED_FES_UNITS.map((unit) => [
      unit,
      Object.fromEntries(inputs.constants.ATTRS.map((attr) => [attr, []]))
    ])
  );

  const createFesIconSeenSeed = () => Object.fromEntries(
    inputs.constants.RELATED_FES_UNITS.map((unit) => [
      unit,
      Object.fromEntries(inputs.constants.ATTRS.map((attr) => [attr, new Set()]))
    ])
  );

  const createFesCardsSeed = () => Object.fromEntries(
    inputs.constants.RELATED_FES_UNITS.map((unit) => [unit, []])
  );

  const buildFesRecordMatrix = (fesType) => {
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;
    const targetType = String(fesType || '').trim().toLowerCase();
    const iconRows = createFesIconRowsSeed();
    const seenRows = createFesIconSeenSeed();
    const cardsByUnit = createFesCardsSeed();
    const totals = Object.fromEntries(inputs.constants.ATTRS.map((attr) => [attr, 0]));

    (inputs.props.allCards || []).forEach((card) => {
      if (!inputs.eventCatalog.isCardWithinLimit(card, maxEid)) return;
      if (String(card?.Type || '').trim().toLowerCase() !== targetType) return;
      if (String(card?.Rarity || '').trim() !== '4') return;

      const baseName = inputs.metadata.getCardBaseName(card?.Name);
      if (!baseName || !inputs.metadata.CHAR_ORDER[baseName]) return;

      const attr = inputs.eventCatalog.normalizeCardStatsAttribute(card?.Attribute);
      if (!inputs.constants.ATTRS.includes(attr)) return;

      const unit = inputs.lineupRules.getLineupCardUnit(card, baseName);
      if (!inputs.constants.RELATED_FES_UNITS.includes(unit)) return;

      cardsByUnit[unit].push({
        cardId: inputs.distribution.getCardProgressOrderId(card),
        attr,
        name: baseName,
        imageSrc: inputs.media.buildFesCardImageSrc(card?.CardID, baseName, targetType)
      });

      totals[attr] += 1;

      const iconKey = inputs.presentation.getSupportMemberIconKey({ name: baseName, unit });
      const uniqueKey = `${baseName}|${iconKey}`;
      const seen = seenRows[unit]?.[attr];
      if (!seen || seen.has(uniqueKey)) return;

      seen.add(uniqueKey);
      iconRows[unit][attr].push({
        name: baseName,
        iconKey
      });
    });

    inputs.constants.RELATED_FES_UNITS.forEach((unit) => {
      cardsByUnit[unit].sort((a, b) => {
        const aid = Number(a?.cardId || 0);
        const bid = Number(b?.cardId || 0);
        if (aid !== bid) return aid - bid;
        const byName = inputs.presentation.compareCharOrder(a?.name, b?.name);
        if (byName !== 0) return byName;
        return String(a?.attr || '').localeCompare(String(b?.attr || ''));
      });

      inputs.constants.ATTRS.forEach((attr) => {
        iconRows[unit][attr].sort((a, b) => inputs.presentation.compareCharOrder(a.name, b.name));
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

  return {
    fesRecordShowCardImages,
    onFesRecordShowCardImagesChange,
    getFesMatrixAttrHeadStyle,
    getFesMatrixUnitHeadStyle,
    getFesMatrixCellStyle,
    cfesRecordMatrix,
    getFesMatrixUnitStripCellStyle,
    getFesMatrixTotalCellStyle,
    getFesMatrixTotalChipStyle,
    bfesRecordMatrix,
  };
}
