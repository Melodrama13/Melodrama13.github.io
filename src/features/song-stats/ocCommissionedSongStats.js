/** Build the OC commissioned-song statistics with the page's existing rules. */
export function buildOcCommissionedSongStats({
  events,
  songsById,
  unitOptions,
  charactersByUnit,
  unitColorByKey,
  baseUnitColorByKey,
  cardTintAlpha,
  toFiniteSongId,
  getUnitByChar,
  normalizeCharacterName,
  getCharacterAvatarSrc,
  getCharacterColor,
  mixHexWithWhite,
  makeSongTagSingle,
  makeSongTagNumber,
  parseSeriesOrder,
  parseVS,
  buildVsIconsFromNames,
  hasSong2DMVCategory,
  hasSong3DMVCategory,
}) {
  const unitKeys = unitOptions.map((unit) => unit.key);
  const groupMap = Object.fromEntries(unitKeys.map((unitKey) => [unitKey, new Map()]));
  const orderMap = Object.fromEntries(
    unitKeys.map((unitKey) => [
      unitKey,
      new Map((charactersByUnit[unitKey] || []).map((char, idx) => [char.name, idx]))
    ])
  );

  (Array.isArray(events) ? events : []).forEach((ev) => {
    if (ev?.isPredict) return;
    if (!Number.isFinite(Number(ev?.id))) return;

    const songId = toFiniteSongId(ev?.song_id);
    if (songId === null) return;
    const song = songsById.get(songId);
    const songName = String(song?.title || '').trim();
    if (!songName) return;

    const bannerName = String(ev?.banner || '').trim();
    if (!bannerName) return;
    const unitKey = getUnitByChar(bannerName);
    if (!unitKeys.includes(unitKey)) return;

    const normalizedName = normalizeCharacterName(bannerName);
    const memberName = normalizedName || bannerName;
    const memberMap = groupMap[unitKey];
    if (!memberMap.has(memberName)) {
      memberMap.set(memberName, {
        name: memberName,
        unit: unitKey,
        avatar: getCharacterAvatarSrc(memberName),
        tint: mixHexWithWhite(getCharacterColor(memberName), cardTintAlpha),
        songs: []
      });
    }

    const tag = makeSongTagSingle(ev);
    memberMap.get(memberName).songs.push({
      tag,
      tagNumber: makeSongTagNumber(ev),
      tagColor: unitColorByKey[unitKey] || baseUnitColorByKey[unitKey] || '#334155',
      songId,
      songName,
      jacketUrl: String(song?.jacketUrl || '').trim(),
      eventId: Number(ev.id),
      seriesOrder: parseSeriesOrder(ev),
      vsIcons: buildVsIconsFromNames(parseVS(ev?.virtual_singer)),
      has2d: hasSong2DMVCategory(song),
      has3d: hasSong3DMVCategory(song)
    });
  });

  return unitOptions.map((unitItem) => {
    const memberMap = groupMap[unitItem.key];
    const memberOrder = orderMap[unitItem.key];
    const members = [...memberMap.values()]
      .map((member) => {
        const songs = [...member.songs].sort((a, b) => {
          if (a.seriesOrder !== b.seriesOrder) return a.seriesOrder - b.seriesOrder;
          if (a.eventId !== b.eventId) return a.eventId - b.eventId;
          return a.songId - b.songId;
        });
        const count3d = songs.filter((song) => song.has3d).length;
        return {
          ...member,
          songs,
          count: songs.length,
          count3d,
          count2d: songs.length - count3d
        };
      })
      .filter((member) => member.count > 0)
      .sort((a, b) => {
        const ai = memberOrder.has(a.name) ? memberOrder.get(a.name) : Number.MAX_SAFE_INTEGER;
        const bi = memberOrder.has(b.name) ? memberOrder.get(b.name) : Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        return a.name.localeCompare(b.name, 'zh-Hans-CN');
      });

    return {
      unit: unitItem.key,
      label: unitItem.label,
      tint: mixHexWithWhite(unitColorByKey[unitItem.key] || baseUnitColorByKey[unitItem.key] || '#cbd5e1', 0.18),
      members,
      totalSongs: members.reduce((sum, member) => sum + member.count, 0),
      total3d: members.reduce((sum, member) => sum + member.count3d, 0),
      total2d: members.reduce((sum, member) => sum + member.count2d, 0)
    };
  }).filter((unitGroup) => unitGroup.members.length > 0);
}
