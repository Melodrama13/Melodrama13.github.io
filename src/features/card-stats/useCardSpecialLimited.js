import { ref, computed } from 'vue';

/** Owns card special limited behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardSpecialLimited(inputs) {
  const specialLimitedShowCardImages = ref(false);

  const onSpecialLimitedShowCardImagesChange = (event) => {
    const checked = !!event?.target?.checked;
    const anchorEl = event?.target instanceof HTMLElement ? event.target : null;
    void inputs.navigation.withInteractionPinnedPosition(() => {
      specialLimitedShowCardImages.value = checked;
    }, anchorEl);
  };

  const specialLimitedRows = computed(() => inputs.constants.SPECIAL_LIMITED_STAT_TYPES);

  const SPECIAL_LIMITED_TYPE_KEY_SET = computed(() => new Set(specialLimitedRows.value.map((row) => row.key)));

  const getSpecialLimitedBreakBeforeClasses = (index) => {
    if (index <= 1) return [];
    const classes = ['break-6'];
    if (index === 3 || index === 5) classes.push('break-10');
    if (index === 4) classes.push('break-14');
    return classes;
  };

  const specialLimitedUnitGroups = computed(() => (
    inputs.constants.RELATED_FES_UNITS
      .map((unit, idx) => {
        const characters = inputs.metadata.LINEUP_CHAR_NAMES.value
          .filter((name) => inputs.metadata.getUnitByChar(name) === unit)
          .map((name) => {
            const charColor = inputs.metadata.getCharColor(name);
            return {
              name,
              color: charColor,
              tint: inputs.presentation.hexToRgba(charColor, 0.2),
              softTint: inputs.presentation.hexToRgba(charColor, 0.1),
              emptyTint: inputs.presentation.hexToRgba(charColor, 0.055)
            };
          });
        const color = inputs.metadata.UNIT_COLORS[unit] || '#94a3b8';
        return {
          unit,
          index: idx + 1,
          color,
          tint: inputs.presentation.hexToRgba(color, 0.12),
          characters,
          breakBeforeClasses: getSpecialLimitedBreakBeforeClasses(idx + 1)
        };
      })
      .filter((group) => group.characters.length > 0)
  ));

  const createSpecialLimitedMatrixSeed = () => Object.fromEntries(
    inputs.constants.SPECIAL_LIMITED_STAT_TYPES.map((row) => [
      row.key,
      Object.fromEntries(inputs.metadata.LINEUP_CHAR_NAMES.value.map((name) => [
        name,
        { cards: [], title: `${row.label} ${name}` }
      ]))
    ])
  );

  const getSpecialLimitedCardTitle = (rowLabel, charName, cards) => {
    if (!Array.isArray(cards) || !cards.length) return `${rowLabel} ${charName}`;
    const suffix = cards
      .map((card) => {
        const id = card.cardId ? `#${card.cardId}` : '';
        const attr = inputs.constants.ATTR_LABELS[card.attr] || card.attr || '-';
        return `${id} ${attr}`.trim();
      })
      .filter(Boolean)
      .join(' / ');
    return `${rowLabel} ${charName}${suffix ? `：${suffix}` : ''}`;
  };

  const specialLimitedMatrix = computed(() => {
    const matrix = createSpecialLimitedMatrixSeed();
    const maxEid = inputs.eventCatalog.safeMaxEventId.value;

    (inputs.props.allCards || []).forEach((card) => {
      if (!inputs.eventCatalog.isCardWithinLimit(card, maxEid)) return;

      const type = String(card?.Type || '').trim().toLowerCase();
      if (!SPECIAL_LIMITED_TYPE_KEY_SET.value.has(type)) return;
      if (String(card?.Rarity || '').trim() !== '4') return;

      const baseName = inputs.metadata.getCardBaseName(card?.Name);
      if (!baseName || !inputs.metadata.CHAR_ORDER[baseName]) return;

      const attr = inputs.eventCatalog.normalizeCardStatsAttribute(card?.Attribute);
      if (!inputs.constants.ATTRS.includes(attr)) return;

      const cardId = Number(String(card?.CardID || '').trim());
      if (!Number.isFinite(cardId) || cardId <= 0) return;

      const cell = matrix[type]?.[baseName];
      if (!cell) return;

      cell.cards.push({
        cardId,
        orderId: inputs.distribution.getCardProgressOrderId(card) || cardId,
        attr,
        imageSrc: inputs.media.buildCardImageSrc(cardId, baseName, { rarity: '4', card })
      });
    });

    inputs.constants.SPECIAL_LIMITED_STAT_TYPES.forEach((row) => {
      inputs.metadata.LINEUP_CHAR_NAMES.value.forEach((name) => {
        const cell = matrix[row.key]?.[name];
        if (!cell) return;
        cell.cards.sort((a, b) => {
          const ao = Number(a?.orderId || 0);
          const bo = Number(b?.orderId || 0);
          if (ao !== bo) return ao - bo;
          return inputs.constants.ATTRS.indexOf(a?.attr) - inputs.constants.ATTRS.indexOf(b?.attr);
        });
        cell.title = getSpecialLimitedCardTitle(row.label, name, cell.cards);
      });
    });

    return matrix;
  });

  const specialLimitedHasDoubleCfes = computed(() => (
    inputs.metadata.LINEUP_CHAR_NAMES.value.some((name) => (
      (specialLimitedMatrix.value?.cfes?.[name]?.cards?.length || 0) > 1
    ))
  ));

  const hasSpecialLimitedDoubleCfes = (unitGroup) => (
    Array.isArray(unitGroup?.characters)
    && unitGroup.characters.some((char) => (
      (specialLimitedMatrix.value?.cfes?.[char.name]?.cards?.length || 0) > 1
    ))
  );

  return {
    specialLimitedShowCardImages,
    onSpecialLimitedShowCardImagesChange,
    specialLimitedHasDoubleCfes,
    specialLimitedUnitGroups,
    hasSpecialLimitedDoubleCfes,
    specialLimitedRows,
    specialLimitedMatrix,
  };
}
