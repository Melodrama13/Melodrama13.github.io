import { VS_NAV_ABBR_WHITELIST, UNIT_NAV_LABEL_MAP, ANVO_UNIT_FIRST_MEMBER_ANCHORS, getSongSectionTitle } from './songDisplayConstants.js';
import { computed } from 'vue';

/** Explicit dependencies keep this feature instance isolated. Effects connect after page composition. */
export function useSongNavigationModel({
  getNavAbbrFromName,
  virtualSingerSongStats,
  getVsSingerBookSubtitle,
  ocBookStatsByUnit,
  threeDmvStatsByUnit,
  twoDmvStatsByUnit,
  coverAlbumStats,
  anotherVocalCards,
  sameUnitPairUnitCards,
  activeNavId,
  isMobileNav
}) {
const makeVsSingerNavAnchorId = (name) => {
  const abbr = getNavAbbrFromName(name);
  if (!abbr || !VS_NAV_ABBR_WHITELIST.includes(abbr)) return '';
  return `panel-vs-singer-${abbr}`;
};

const makeOcBookUnitNavAnchorId = (unitKey) => {
  const key = String(unitKey || '').trim().toLowerCase();
  if (!key) return '';
  return `panel-oc-unit-${key}`;
};

const makeAnvoUnitNavAnchorId = (unitKey) => {
  const key = String(unitKey || '').trim().toLowerCase();
  if (!key) return '';
  return `panel-anvo-unit-${key}`;
};

const makeThreeDmvUnitNavAnchorId = (unitKey) => {
  const key = String(unitKey || '').trim().toLowerCase();
  if (!key) return '';
  return `panel-3dmv-unit-${key}`;
};

const makeTwoDmvUnitNavAnchorId = (unitKey) => {
  const key = String(unitKey || '').trim().toLowerCase();
  if (!key) return '';
  return `panel-2dmv-unit-${key}`;
};

const getCoverAlbumUnitNavAnchorId = (unitKey) => {
  const key = String(unitKey || '').trim().toLowerCase();
  return key ? `panel-cover-album-unit-${key}` : '';
};

const coverAlbumUnitNavChildren = computed(() => coverAlbumStats.value.map((group) => ({
  id: getCoverAlbumUnitNavAnchorId(group.unit),
  title: `${UNIT_NAV_LABEL_MAP[group.unit] || String(group.unit || '').toUpperCase()} 翻唱专辑`,
  anchorKind: 'cover-album-unit'
})));

const vsSingerNavChildren = computed(() => {
  return virtualSingerSongStats.value
    .map((row) => {
      const id = makeVsSingerNavAnchorId(row.name);
      if (!id) return null;
      return {
        id,
        title: getVsSingerBookSubtitle(row.name),
        anchorKind: 'vs-singer'
      };
    })
    .filter(Boolean);
});

const vsSingerAnchorIdByName = computed(() => {
  const map = new Map();
  virtualSingerSongStats.value.forEach((row) => {
    const id = makeVsSingerNavAnchorId(row.name);
    if (!id) return;
    map.set(String(row.name || ''), id);
  });
  return map;
});

const getVsSingerNavAnchorId = (name) => {
  return vsSingerAnchorIdByName.value.get(String(name || '')) || '';
};

const ocBookUnitNavChildren = computed(() => {
  return ocBookStatsByUnit.value
    .map((group) => {
      const id = makeOcBookUnitNavAnchorId(group.unit);
      if (!id) return null;
      return {
        id,
        title: `${UNIT_NAV_LABEL_MAP[group.unit] || String(group.unit || '').toUpperCase()} 书下`,
        anchorKind: 'oc-unit'
      };
    })
    .filter(Boolean);
});

const getOcBookUnitNavAnchorId = (unit) => makeOcBookUnitNavAnchorId(unit);

const threeDmvUnitNavChildren = computed(() => {
  return threeDmvStatsByUnit.value
    .map((group) => {
      const id = makeThreeDmvUnitNavAnchorId(group.unit);
      if (!id) return null;
      return {
        id,
        title: `${UNIT_NAV_LABEL_MAP[group.unit] || String(group.unit || '').toUpperCase()} 3DMV`,
        anchorKind: '3dmv-unit'
      };
    })
    .filter(Boolean);
});

const twoDmvUnitNavChildren = computed(() => {
  return twoDmvStatsByUnit.value
    .map((group) => {
      const id = makeTwoDmvUnitNavAnchorId(group.unit);
      if (!id) return null;
      return {
        id,
        title: `${UNIT_NAV_LABEL_MAP[group.unit] || String(group.unit || '').toUpperCase()} 2DMV`,
        anchorKind: '2dmv-unit'
      };
    })
    .filter(Boolean);
});

const anvoUnitAnchorIdByName = computed(() => {
  const map = new Map();
  ANVO_UNIT_FIRST_MEMBER_ANCHORS.forEach((config) => {
    const matched = anotherVocalCards.value.find((row) => getNavAbbrFromName(row.name) === config.abbr);
    if (!matched) return;
    const id = makeAnvoUnitNavAnchorId(config.unit);
    if (!id) return;
    map.set(String(matched.name || ''), id);
  });
  return map;
});

const anvoUnitNavChildren = computed(() => {
  return ANVO_UNIT_FIRST_MEMBER_ANCHORS
    .map((config) => {
      const matched = anotherVocalCards.value.find((row) => getNavAbbrFromName(row.name) === config.abbr);
      if (!matched) return null;
      return {
        id: makeAnvoUnitNavAnchorId(config.unit),
        title: config.title,
        anchorKind: 'anvo-unit'
      };
    })
    .filter(Boolean);
});

const getAnvoNavAnchorId = (name) => {
  return anvoUnitAnchorIdByName.value.get(String(name || '')) || '';
};

const navGroups = computed(() => {
  const duoUnitChildren = sameUnitPairUnitCards.value.map((unitCard) => ({
    id: unitCard.anchorId,
    title: `${UNIT_NAV_LABEL_MAP[unitCard.unit] || String(unitCard.unit || '').toUpperCase()} 双人歌曲`,
    anchorKind: 'duo-unit'
  }));

  return [
    {
      id: 'panel-oc-stats',
      title: getSongSectionTitle('panel-oc-stats'),
      children: []
    },
    {
      id: 'panel-vs-song-stats',
      title: getSongSectionTitle('panel-vs-song-stats'),
      children: [...vsSingerNavChildren.value]
    },
    {
      id: 'panel-oc-book-stats',
      title: getSongSectionTitle('panel-oc-book-stats'),
      children: [...ocBookUnitNavChildren.value]
    },
    {
      id: 'panel-book-round-stats',
      title: getSongSectionTitle('panel-book-round-stats'),
      children: []
    },
    {
      id: 'panel-another-vocal',
      title: getSongSectionTitle('panel-another-vocal'),
      children: [...anvoUnitNavChildren.value]
    },
    {
      id: 'panel-duo-stats',
      title: getSongSectionTitle('panel-duo-stats'),
      children: [...duoUnitChildren]
    },
    {
      id: 'panel-3dmv-stats',
      title: getSongSectionTitle('panel-3dmv-stats'),
      children: [...threeDmvUnitNavChildren.value]
    },
    {
      id: 'panel-2dmv-stats',
      title: getSongSectionTitle('panel-2dmv-stats'),
      children: [...twoDmvUnitNavChildren.value]
    },
    {
      id: 'panel-cover-album-stats',
      title: getSongSectionTitle('panel-cover-album-stats'),
      children: [...coverAlbumUnitNavChildren.value]
    },
    {
      id: 'panel-april-fool-stats',
      title: getSongSectionTitle('panel-april-fool-stats'),
      children: []
    },
    {
      id: 'panel-song-search',
      title: getSongSectionTitle('panel-song-search'),
      children: []
    }
  ];
});

const navTargetIds = computed(() => {
  const ids = [];
  navGroups.value.forEach((g) => {
    ids.push(g.id);
    (g.children || []).forEach((c) => ids.push(c.id));
  });
  return ids;
});

const duoUnitNavIds = computed(() => {
  const ids = [];
  navGroups.value.forEach((group) => {
    (group.children || []).forEach((item) => {
      if (item.anchorKind === 'duo-unit') ids.push(item.id);
    });
  });
  return new Set(ids);
});

const vsSingerNavIds = computed(() => {
  const ids = [];
  navGroups.value.forEach((group) => {
    (group.children || []).forEach((item) => {
      if (item.anchorKind === 'vs-singer') ids.push(item.id);
    });
  });
  return new Set(ids);
});

const ocUnitNavIds = computed(() => {
  const ids = [];
  navGroups.value.forEach((group) => {
    (group.children || []).forEach((item) => {
      if (item.anchorKind === 'oc-unit') ids.push(item.id);
    });
  });
  return new Set(ids);
});

const anvoUnitNavIds = computed(() => {
  const ids = [];
  navGroups.value.forEach((group) => {
    (group.children || []).forEach((item) => {
      if (item.anchorKind === 'anvo-unit') ids.push(item.id);
    });
  });
  return new Set(ids);
});

const threeDmvUnitNavIds = computed(() => {
  const ids = [];
  navGroups.value.forEach((group) => {
    (group.children || []).forEach((item) => {
      if (item.anchorKind === '3dmv-unit') ids.push(item.id);
    });
  });
  return new Set(ids);
});

const twoDmvUnitNavIds = computed(() => {
  const ids = [];
  navGroups.value.forEach((group) => {
    (group.children || []).forEach((item) => {
      if (item.anchorKind === '2dmv-unit') ids.push(item.id);
    });
  });
  return new Set(ids);
});

const isDuoNavScopeActive = computed(() => {
  if (activeNavId.value === 'panel-duo-stats') return true;
  return duoUnitNavIds.value.has(activeNavId.value);
});

const isVsNavScopeActive = computed(() => {
  if (activeNavId.value === 'panel-vs-song-stats') return true;
  return vsSingerNavIds.value.has(activeNavId.value);
});

const isOcBookNavScopeActive = computed(() => {
  if (activeNavId.value === 'panel-oc-book-stats') return true;
  return ocUnitNavIds.value.has(activeNavId.value);
});

const isAnvoNavScopeActive = computed(() => {
  if (activeNavId.value === 'panel-another-vocal') return true;
  return anvoUnitNavIds.value.has(activeNavId.value);
});

const isThreeDmvNavScopeActive = computed(() => {
  if (activeNavId.value === 'panel-3dmv-stats') return true;
  return threeDmvUnitNavIds.value.has(activeNavId.value);
});

const isTwoDmvNavScopeActive = computed(() => {
  if (activeNavId.value === 'panel-2dmv-stats') return true;
  return twoDmvUnitNavIds.value.has(activeNavId.value);
});

const coverAlbumUnitNavIds = computed(() => new Set(coverAlbumUnitNavChildren.value.map((item) => item.id)));
const isCoverAlbumNavScopeActive = computed(() => activeNavId.value === 'panel-cover-album-stats'
  || coverAlbumUnitNavIds.value.has(activeNavId.value));

const isNestedNavChild = (item) => {
  const kind = String(item?.anchorKind || '').trim();
  return ['duo-unit', 'vs-singer', 'oc-unit', 'anvo-unit', '3dmv-unit', '2dmv-unit', 'cover-album-unit'].includes(kind);
};

const shouldShowNavChild = (item) => {
  const kind = String(item?.anchorKind || '').trim();
  if (!kind) return true;
  if (kind === 'duo-unit') return isMobileNav.value || isDuoNavScopeActive.value;
  if (kind === 'vs-singer') return isMobileNav.value || isVsNavScopeActive.value;
  if (kind === 'oc-unit') return isMobileNav.value || isOcBookNavScopeActive.value;
  if (kind === 'anvo-unit') return isMobileNav.value || isAnvoNavScopeActive.value;
  if (kind === '3dmv-unit') return isMobileNav.value || isThreeDmvNavScopeActive.value;
  if (kind === '2dmv-unit') return isMobileNav.value || isTwoDmvNavScopeActive.value;
  if (kind === 'cover-album-unit') return isMobileNav.value || isCoverAlbumNavScopeActive.value;
  return true;
};

return { makeVsSingerNavAnchorId, makeOcBookUnitNavAnchorId, makeAnvoUnitNavAnchorId, makeThreeDmvUnitNavAnchorId, makeTwoDmvUnitNavAnchorId, getCoverAlbumUnitNavAnchorId, coverAlbumUnitNavChildren, coverAlbumUnitNavIds, isCoverAlbumNavScopeActive, vsSingerNavChildren, vsSingerAnchorIdByName, getVsSingerNavAnchorId, ocBookUnitNavChildren, getOcBookUnitNavAnchorId, threeDmvUnitNavChildren, twoDmvUnitNavChildren, anvoUnitAnchorIdByName, anvoUnitNavChildren, getAnvoNavAnchorId, navGroups, navTargetIds, duoUnitNavIds, vsSingerNavIds, ocUnitNavIds, anvoUnitNavIds, threeDmvUnitNavIds, twoDmvUnitNavIds, isDuoNavScopeActive, isVsNavScopeActive, isOcBookNavScopeActive, isAnvoNavScopeActive, isThreeDmvNavScopeActive, isTwoDmvNavScopeActive, isNestedNavChild, shouldShowNavChild };
}
