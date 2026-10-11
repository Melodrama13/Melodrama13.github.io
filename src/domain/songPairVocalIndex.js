/**
 * Index each song's preferred Sekai vocal for a pair of original characters.
 * Member names use the page's existing Chinese collation. For equal vocal
 * IDs, more virtual singers win; equal counts retain the first vocal.
 * Duplicate song keys retain the last matching song, as in the page model.
 *
 * @param {Array} songs Normalized songs in the page's existing order.
 * @param {string[]} unitKeys Original-character units included in statistics.
 * @param {(names: unknown) => Array<{name: string, unit: string, order: number}>} resolveCharacters
 * @returns {Map<string, Map<string, {song: object, vsNames: string[]}>>}
 */
export function buildSongPairVocalIndex(songs, unitKeys, resolveCharacters) {
  const originalCharacterUnits = new Set(unitKeys);
  const pairVocalsByMemberKey = new Map();

  for (const song of songs) {
    const preferredVocalsByMemberKey = new Map();
    for (const vocal of song.vocals) {
      if (String(vocal?.type || '').trim().toLowerCase() !== 'sekai') continue;
      const vocalCharacters = resolveCharacters(vocal?.characters);
      const originalCharacters = Array.from(new Map(vocalCharacters
        .filter((character) => originalCharacterUnits.has(character.unit))
        .map((character) => [character.name, character])).values());
      if (originalCharacters.length !== 2) continue;

      const unitKey = originalCharacters[0].unit;
      if (originalCharacters[1].unit !== unitKey) continue;
      const memberNames = originalCharacters.map((character) => character.name)
        .sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'));
      const memberKey = JSON.stringify([unitKey, ...memberNames]);
      const vsNames = vocalCharacters.filter((character) => character.unit === 'vs')
        .sort((left, right) => left.order - right.order)
        .map((character) => character.name)
        .slice(0, 2);
      const vocalId = Number(vocal?.vocal_id);
      const vocalSortId = Number.isFinite(vocalId) ? vocalId : Number.MAX_SAFE_INTEGER;
      const previousVocal = preferredVocalsByMemberKey.get(memberKey);
      if (!previousVocal || vocalSortId < previousVocal.vocalSortId
        || (vocalSortId === previousVocal.vocalSortId && vsNames.length > previousVocal.vsNames.length)) {
        preferredVocalsByMemberKey.set(memberKey, { vocalSortId, vsNames });
      }
    }

    for (const [memberKey, { vsNames }] of preferredVocalsByMemberKey) {
      if (!pairVocalsByMemberKey.has(memberKey)) pairVocalsByMemberKey.set(memberKey, new Map());
      pairVocalsByMemberKey.get(memberKey).set(`${song.id}-${song.title}`, { song, vsNames });
    }
  }
  return pairVocalsByMemberKey;
}
