import { ref, computed } from 'vue';
import { isLocalSpoilerPreview } from '../../utils/spoilerGuard.js';

/** Owns card nuigurumi behavior for one mounted page instance.
 * Inputs are explicit feature interfaces; getters preserve lazy cross-feature reads.
 */
export function useCardNuigurumi(inputs) {
  const nuigurumiShowCardImages = ref(false);

  const nuigurumiHideCharNames = ref(true);

  const nuigurumiCharacterByAbbr = computed(() => {
    const map = {};
    (inputs.props.allCharacters || []).forEach((char) => {
      const abbr = String(char?.en_abbr || '').trim().toLowerCase();
      if (!abbr) return;
      const name = String(char?.zh_name || char?.ja_name || '').trim();
      map[abbr] = {
        abbr,
        name,
        singleMark: String(char?.single_mark || '').trim(),
        unit: String(char?.unit || '').trim().toLowerCase(),
        order: Number(char?.id || 999)
      };
    });
    return map;
  });

  const nuigurumiAbbrByCardName = computed(() => {
    const map = {};
    (inputs.props.allCharacters || []).forEach((char) => {
      const abbr = String(char?.en_abbr || '').trim().toLowerCase();
      if (!abbr) return;
      [
        char?.zh_name,
        char?.ja_name,
        `${String(char?.first_name || '').trim()}${String(char?.given_name || '').trim()}`
      ].forEach((name) => {
        const key = String(name || '').trim();
        if (key) map[key] = abbr;
      });
    });
    return map;
  });

  const getNuigurumiCardAbbr = (card) => {
    const baseName = inputs.metadata.getCardBaseName(card?.Name);
    return nuigurumiAbbrByCardName.value[baseName] || '';
  };

  const getNuigurumiCardSortTime = (card) => {
    const d = inputs.presentation.parseDateSafe(card?.Date);
    return d ? d.getTime() : 0;
  };

  const nuigurumiCardPools = computed(() => {
    const pools = {};
    const now = new Date();
    const showUnreleased = isLocalSpoilerPreview();
    const sourceCards = Array.isArray(inputs.props.allBaseCards) && inputs.props.allBaseCards.length
      ? inputs.props.allBaseCards
      : [];
    sourceCards.forEach((card) => {
      const cardId = Number(card?.CardID);
      if (!Number.isFinite(cardId) || cardId <= 0) return;
      const cardDate = inputs.presentation.parseDateSafe(card?.Date);
      if (!cardDate || (!showUnreleased && cardDate > now)) return;
      if (String(card?.Rarity || '').trim() !== '4') return;
      const type = String(card?.Type || '').trim().toLowerCase();
      if (!type) return;
      const abbr = getNuigurumiCardAbbr(card);
      if (!abbr) return;
      const key = `${type}::${abbr}`;
      if (!pools[key]) pools[key] = [];
      pools[key].push(card);
    });

    Object.keys(pools).forEach((key) => {
      pools[key].sort((a, b) => {
        const byDate = getNuigurumiCardSortTime(a) - getNuigurumiCardSortTime(b);
        if (byDate !== 0) return byDate;
        const aid = Number(a?.CardID || 0);
        const bid = Number(b?.CardID || 0);
        if (aid !== bid) return aid - bid;
        return String(a?.Name || '').localeCompare(String(b?.Name || ''), 'zh-Hans-CN');
      });
    });

    return pools;
  });

  const getNuigurumiTypeLabel = (type) => {
    const normalized = String(type || '').trim().toLowerCase();
    if (normalized === 'cfes') return 'CFES';
    if (normalized === 'bfes') return 'BFES';
    if (normalized === 'limited') return '期间限定';
    return normalized || '-';
  };

  const getNuigurumiMobileTypeLabel = (type) => {
    const normalized = String(type || '').trim().toLowerCase();
    if (normalized === 'limited') return '普限';
    if (normalized === 'cfes') return 'CFES';
    if (normalized === 'bfes') return 'BFES';
    return normalized || '-';
  };

  const getNuigurumiCompactLabel = (label) => {
    const raw = String(label || '').trim();
    if (raw === '本轮备选') return '备选';
    if (raw === '下一轮备选') return '下轮';
    return raw;
  };

  const getNuigurumiCandidateLabel = (row, mode = 'desktop') => {
    const kind = String(row?.candidateKind || '').trim();
    if (kind === 'current') return '备选';
    if (kind === 'next') return mode === 'mobile' ? '下轮' : '下轮';
    return getNuigurumiCompactLabel(row?.label);
  };

  const getNuigurumiCompactDate = (dateText) => {
    const [yearRaw, monthRaw] = String(dateText || '').split('/');
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return String(dateText || '').trim() || '-';
    return `${String(year).slice(-2)}/${month}`;
  };

  const getNuigurumiMobileDateLabel = (row) => {
    const label = getNuigurumiCandidateLabel(row, 'mobile');
    if (label) return label;
    return getNuigurumiCompactDate(row?.date);
  };

  const getNuigurumiDateCellLabel = (row) => {
    const label = getNuigurumiCandidateLabel(row, 'desktop');
    if (label) return label;
    return row?.date || '-';
  };

  const getNuigurumiMemberLabel = (member) => {
    if (inputs.presentation.useSingleNameMark.value && member?.singleMark) return member.singleMark;
    return String(member?.abbr || '').toUpperCase();
  };

  const showNuigurumiCharNames = computed(() => !inputs.navigation.isNavTopLayout.value && !nuigurumiHideCharNames.value);

  const getNuigurumiMonthOrder = (dateText) => {
    const [yearRaw, monthRaw] = String(dateText || '').split('/');
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return 0;
    return year * 12 + month;
  };

  const nuigurumiAllCharacterAbbrs = computed(() => (
    Object.values(nuigurumiCharacterByAbbr.value || {})
      .sort((a, b) => {
        const ao = Number(a?.order || 999);
        const bo = Number(b?.order || 999);
        if (ao !== bo) return ao - bo;
        return String(a?.abbr || '').localeCompare(String(b?.abbr || ''));
      })
      .map((item) => item.abbr)
  ));

  const NUIGURUMI_OC_UNITS = ['ln', 'mmj', 'vbs', 'ws', 'nc'];

  const NUIGURUMI_UNIT_ORDER = [...NUIGURUMI_OC_UNITS, 'vs'];

  const getNuigurumiAbbrUnit = (abbr) => {
    const normalized = String(abbr || '').trim().toLowerCase();
    return String(nuigurumiCharacterByAbbr.value[normalized]?.unit || '').trim().toLowerCase() || 'vs';
  };

  const createNuigurumiUnitQueues = (abbrs) => {
    const queues = Object.fromEntries(NUIGURUMI_UNIT_ORDER.map((unit) => [unit, []]));
    (abbrs || []).forEach((abbr) => {
      const normalized = String(abbr || '').trim().toLowerCase();
      if (!normalized) return;
      const unit = NUIGURUMI_UNIT_ORDER.includes(getNuigurumiAbbrUnit(normalized))
        ? getNuigurumiAbbrUnit(normalized)
        : 'vs';
      queues[unit].push(normalized);
    });
    return queues;
  };

  const hasNuigurumiQueuedMember = (queues) => (
    Object.values(queues || {}).some((items) => Array.isArray(items) && items.length > 0)
  );

  const getNuigurumiVsCountForMonth = (month) => {
    const monthNum = Number(month);
    if (!Number.isFinite(monthNum)) return 1;
    return monthNum % 2 === 0 ? 1 : 2;
  };

  const addNuigurumiMonth = (dateText, offset) => {
    const [yearRaw, monthRaw] = String(dateText || '').split('/');
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      return { date: '', year: 0, month: 0 };
    }
    const zeroBased = year * 12 + (month - 1) + Number(offset || 0);
    const nextYear = Math.floor(zeroBased / 12);
    const nextMonth = (zeroBased % 12) + 1;
    return {
      date: `${nextYear}/${nextMonth}`,
      year: nextYear,
      month: nextMonth
    };
  };

  const takeNuigurumiCandidateAbbrs = (queues, month) => {
    const picked = [];
    NUIGURUMI_OC_UNITS.forEach((unit) => {
      const next = queues?.[unit]?.shift();
      if (next) picked.push(next);
    });
    const vsCount = getNuigurumiVsCountForMonth(month);
    for (let i = 0; i < vsCount; i += 1) {
      const next = queues?.vs?.shift();
      if (next) picked.push(next);
    }
    return picked;
  };

  const buildNuigurumiMember = (abbr, type, occurrenceIndex) => {
    const normalizedAbbr = String(abbr || '').trim().toLowerCase();
    const normalizedType = String(type || '').trim().toLowerCase();
    const meta = nuigurumiCharacterByAbbr.value[normalizedAbbr] || {};
    const name = meta.name || normalizedAbbr.toUpperCase();
    const card = nuigurumiCardPools.value[`${normalizedType}::${normalizedAbbr}`]?.[occurrenceIndex] || null;
    const cardId = Number(card?.CardID || 0);
    const attr = inputs.eventCatalog.normalizeCardStatsAttribute(card?.Attribute);
    return {
      abbr: normalizedAbbr,
      name,
      singleMark: meta.singleMark || '',
      iconKey: normalizedAbbr.toUpperCase(),
      cardId: Number.isFinite(cardId) && cardId > 0 ? cardId : '',
      cardAttr: inputs.constants.ATTRS.includes(attr) ? attr : '',
      cardImageSrc: card ? inputs.media.buildCardImageSrc(card?.CardID, name, { rarity: '4' }) : ''
    };
  };

  const nuigurumiRows = computed(() => {
    const occurrences = {};
    const sourceRows = [...(inputs.props.nuigurumiData || [])]
      .filter((row) => String(row?.Date || '').trim() && Array.isArray(row?.Character))
      .sort((a, b) => getNuigurumiMonthOrder(a?.Date) - getNuigurumiMonthOrder(b?.Date));

    const rows = sourceRows.map((row, index) => {
      const date = String(row?.Date || '').trim();
      const type = String(row?.Type || '').trim().toLowerCase();
      const round = Math.floor(index / 4) + 1;
      const roundIndex = (index % 4) + 1;
      const isRoundEnd = roundIndex === 4;
      const members = row.Character
        .map((abbrRaw) => String(abbrRaw || '').trim().toLowerCase())
        .filter(Boolean)
        .map((abbr) => {
          const occurrenceKey = `${type}::${abbr}`;
          const occurrenceIndex = Number(occurrences[occurrenceKey] || 0);
          occurrences[occurrenceKey] = occurrenceIndex + 1;
          return buildNuigurumiMember(abbr, type, occurrenceIndex);
        });

        return {
          date,
          type,
          round,
          roundIndex,
          isRoundEnd,
          members
        };
      });

    if (!rows.length) return rows;

    const allAbbrs = nuigurumiAllCharacterAbbrs.value;
    const lastRow = rows[rows.length - 1];
    const currentRound = Number(lastRow?.round || 1);
    const currentType = String(lastRow?.type || 'limited').trim().toLowerCase() || 'limited';
    const currentRoundUsed = new Set(
      rows
        .filter((row) => Number(row?.round || 0) === currentRound)
        .flatMap((row) => (row.members || []).map((member) => member.abbr))
    );
    const currentMissing = allAbbrs.filter((abbr) => !currentRoundUsed.has(abbr));
    let candidateMonthOffset = 1;
    const appendCandidateRows = ({ abbrs, round, type, label, candidateKind, maxRows = 4, consumeOccurrences = true }) => {
      const queues = createNuigurumiUnitQueues(abbrs);
      let localIndex = 0;
      while (hasNuigurumiQueuedMember(queues) && localIndex < maxRows) {
        const monthInfo = addNuigurumiMonth(lastRow?.date, candidateMonthOffset);
        candidateMonthOffset += 1;
        const picked = takeNuigurumiCandidateAbbrs(queues, monthInfo.month);
        if (!picked.length) continue;
        const members = picked.map((abbr) => {
          const key = `${type}::${abbr}`;
          const occurrenceIndex = Number(occurrences[key] || 0);
          if (consumeOccurrences) {
            occurrences[key] = occurrenceIndex + 1;
          }
          return buildNuigurumiMember(abbr, type, occurrenceIndex);
        });
        rows.push({
          date: monthInfo.date,
          type,
          round,
          roundIndex: 5 + localIndex,
          isRoundEnd: !hasNuigurumiQueuedMember(queues),
          isCandidate: true,
          label,
          candidateKind,
          members
        });
        localIndex += 1;
      }
    };

    if (currentMissing.length) {
      appendCandidateRows({
        abbrs: currentMissing,
        round: currentRound,
        type: currentType,
        label: '本轮备选',
        candidateKind: 'current',
        maxRows: 4,
        consumeOccurrences: true
      });
    }

    appendCandidateRows({
      abbrs: allAbbrs,
      round: currentRound + 1,
      type: currentType || 'limited',
      label: '下一轮备选',
      candidateKind: 'next',
      maxRows: 4,
      consumeOccurrences: false
    });

    return rows;
  });

  return {
    nuigurumiRows,
    nuigurumiHideCharNames,
    nuigurumiShowCardImages,
    showNuigurumiCharNames,
    getNuigurumiMobileDateLabel,
    getNuigurumiMobileTypeLabel,
    getNuigurumiDateCellLabel,
    getNuigurumiTypeLabel,
    getNuigurumiMemberLabel,
  };
}
