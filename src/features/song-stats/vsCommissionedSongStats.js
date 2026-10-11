/** Build the VS commissioned-song statistics with the page's existing rules. */
export function buildVsCommissionedSongStats({
  events,
  songsById,
  singerNames,
  unitOrderByKey,
  cardTintAlpha,
  toFiniteSongId,
  getUnitByChar,
  getCharacterAvatarSrc,
  getCharacterColor,
  mixHexWithWhite,
  makeSongTagSingle,
  makeSongTagAbbr,
  makeSongTagNumber,
  getSongTagColor,
  getSongTagImageColor,
  parseVS,
  hasSong2DMVCategory,
  hasSong3DMVCategory,
}) {
  const map = Object.fromEntries(singerNames.map((name) => [name, []]));

  (Array.isArray(events) ? events : []).forEach((ev) => {
    if (ev?.isPredict) return;
    if (ev?.event_type !== '箱活') return;
    if (!Number.isFinite(Number(ev?.id))) return;
    const songId = toFiniteSongId(ev?.song_id);
    if (songId === null) return;
    const song = songsById.get(songId);
    const songTitle = String(song?.title || '').trim();
    if (!songTitle) return;

    const bannerName = String(ev?.banner || '').trim();
    const unitRaw = String(ev?.unit || '').trim().toLowerCase();
    const inferredUnit = bannerName ? getUnitByChar(bannerName) : unitRaw;

    const songItem = {
      tag: makeSongTagSingle(ev),
      textTag: makeSongTagAbbr(ev),
      tagNumber: makeSongTagNumber(ev),
      tagIcon: getCharacterAvatarSrc(bannerName),
      songId,
      songName: songTitle,
      jacketUrl: String(song?.jacketUrl || '').trim(),
      color: getSongTagColor(ev),
      imageColor: getSongTagImageColor(ev),
      unit: inferredUnit,
      eventId: Number(ev.id),
      has3d: hasSong3DMVCategory(song),
      no2dMv: !hasSong2DMVCategory(song)
    };

    parseVS(ev?.virtual_singer).forEach((vsName) => {
      if (!map[vsName]) return;
      map[vsName].push(songItem);
    });
  });

  return singerNames.map((name) => {
    const songsList = [...(map[name] || [])].sort((a, b) => {
      const ua = unitOrderByKey[a.unit] || 99;
      const ub = unitOrderByKey[b.unit] || 99;
      if (ua !== ub) return ua - ub;
      if (a.eventId !== b.eventId) return a.eventId - b.eventId;
      return a.songId - b.songId;
    });

    const unitCounts = { ln: 0, mmj: 0, vbs: 0, ws: 0, nc: 0 };
    const unit3dCounts = { ln: 0, mmj: 0, vbs: 0, ws: 0, nc: 0 };
    songsList.forEach((songItem) => {
      if (Object.prototype.hasOwnProperty.call(unitCounts, songItem.unit)) {
        unitCounts[songItem.unit] += 1;
        if (songItem.has3d) {
          unit3dCounts[songItem.unit] += 1;
        }
      }
    });
    const unit2dCounts = {
      ln: unitCounts.ln - unit3dCounts.ln,
      mmj: unitCounts.mmj - unit3dCounts.mmj,
      vbs: unitCounts.vbs - unit3dCounts.vbs,
      ws: unitCounts.ws - unit3dCounts.ws,
      nc: unitCounts.nc - unit3dCounts.nc
    };
    const total3d = unit3dCounts.ln + unit3dCounts.mmj + unit3dCounts.vbs + unit3dCounts.ws + unit3dCounts.nc;
    const total2d = songsList.length - total3d;

    return {
      name,
      avatar: getCharacterAvatarSrc(name),
      tint: mixHexWithWhite(getCharacterColor(name), cardTintAlpha),
      count: songsList.length,
      songs: songsList,
      unitCounts,
      unit3dCounts,
      unit2dCounts,
      total2d,
      total3d
    };
  });
}

/** Group one singer's image cards in the established unit order. */
export function buildVsCommissionedSongImageGroups(row, {
  unitOrder,
  unitColorByKey,
  baseUnitColorByKey,
  mixHexWithWhite,
}) {
  const songs = Array.isArray(row?.songs) ? row.songs : [];
  return unitOrder.map((unitKey) => {
    const unitSongs = songs.filter((song) => song.unit === unitKey);
    if (!unitSongs.length) return null;
    return {
      unit: unitKey,
      tint: mixHexWithWhite(unitColorByKey[unitKey] || baseUnitColorByKey[unitKey] || '#cbd5e1', 0.14),
      songs: unitSongs,
    };
  }).filter(Boolean);
}
