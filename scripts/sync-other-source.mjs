import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const preserveExistingCategories = !args.includes('--sync-existing-categories');

const readArgValue = (name, fallback) => {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  const next = args[idx + 1];
  return typeof next === 'string' && next.trim() ? next.trim() : fallback;
};

const SONG_SOURCE_DIR = path.resolve(ROOT, readArgValue('--songs-source', 'other_source'));
const TARGET_FILE = path.resolve(ROOT, readArgValue('--target-file', 'public/data/pjsk_songs.json'));
const TARGET_CHARACTERS_FILE = path.resolve(ROOT, readArgValue('--characters-file', 'public/data/pjsk_characters.json'));

const SONG_STITCH_FILES = Object.freeze({
  musics: 'musics.json',
  difficulties: 'musicDifficulties.json',
  units: 'musicTags.json',
  vocals: 'musicVocals.json',
  gameCharacters: 'gameCharacters.json',
  outsideCharacters: 'outsideCharacters.json'
});

const CATEGORY_MAP = Object.freeze({
  mv: '3DMV',
  mv_2d: '2DMV',
  original: 'original',
  image: 'image'
});

const UNIT_MAP = Object.freeze({
  all: 'all',
  vocaloid: 'vocaloid',
  vs: 'vs',
  light_music_club: 'ln',
  idol: 'mmj',
  street: 'vbs',
  theme_park: 'ws',
  school_refusal: 'nc',
  other: 'other'
});

const UNIT_ORDER = Object.freeze(['all', 'vs', 'ln', 'mmj', 'vbs', 'ws', 'nc', 'vocaloid', 'other']);
const VS_BLOCKED_VOCAL_TYPES = new Set(['sekai', 'instrumental']);
const VS_IGNORED_EXACT_TYPES = new Set(['streaming_live']);
const VS_IGNORED_PREFIXES = Object.freeze(['april_fool']);
const CORE_UNIT_KEYS = Object.freeze(['vs', 'ln', 'mmj', 'vbs', 'ws', 'nc']);
const SPECIAL_MULTI_CORE_ALLOWED_IDS = new Set([139, 141, 235, 366, 489, 579, 585, 739, 743]);
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const SONG_FIELD_ORDER = Object.freeze([
  'id',
  'title',
  'pronunciation',
  'composer',
  'lyricist',
  'arranger',
  'isNewlyWrittenMusic',
  'releaseDate',
  'isLimited',
  'categories',
  'units',
  'difficulties',
  'vocals'
]);

const asArray = (value) => (Array.isArray(value) ? value : []);
const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const pathExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const readJson = async (targetPath) => {
  const text = await fs.readFile(targetPath, 'utf8');
  return JSON.parse(text);
};

const writeJson = async (targetPath, data) => {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};

const normalizeUnit = (raw) => {
  const key = String(raw || '').trim();
  if (!key) return '';
  return UNIT_MAP[key] || key;
};

const normalizeVocalType = (raw) => String(raw || '').trim().toLowerCase();

const toJstDate = (msRaw) => {
  const ms = Number(msRaw);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms + JST_OFFSET_MS);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const pad2 = (n) => String(n).padStart(2, '0');

const isVsIgnoredVocalType = (typeRaw) => {
  const type = normalizeVocalType(typeRaw);
  if (!type) return true;
  if (VS_IGNORED_EXACT_TYPES.has(type)) return true;
  return VS_IGNORED_PREFIXES.some((prefix) => type.startsWith(prefix));
};

const toBoolean = (raw) => {
  if (raw === true || raw === false) return raw;
  if (raw === 1 || raw === '1') return true;
  if (raw === 0 || raw === '0') return false;
  if (typeof raw === 'string') {
    const v = raw.trim().toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
  }
  return false;
};

const normalizeHexDate = (raw) => {
  const d = toJstDate(raw);
  if (!d) return '';
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
};

const normalizeSlashDate = (raw) => {
  const d = toJstDate(raw);
  if (!d) return '';
  return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};

const dedupeStable = (items) => {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
};

const normalizeCategories = (categories) => {
  return dedupeStable(
    asArray(categories)
      .map((raw) => String(raw || '').trim())
      .filter(Boolean)
  );
};

const normalizeUnits = (units) => {
  const normalized = dedupeStable(
    asArray(units)
      .map((raw) => normalizeUnit(raw))
      .filter(Boolean)
  );
  return sortByOrder(normalized, UNIT_ORDER);
};

const sortByOrder = (items, order) => {
  const pos = new Map(order.map((k, idx) => [k, idx]));
  return [...items].sort((a, b) => {
    const ai = pos.has(a) ? pos.get(a) : Number.MAX_SAFE_INTEGER;
    const bi = pos.has(b) ? pos.get(b) : Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return String(a).localeCompare(String(b));
  });
};

const orderSongFields = (songRow) => {
  const ordered = {};
  for (const key of SONG_FIELD_ORDER) {
    if (Object.prototype.hasOwnProperty.call(songRow, key)) {
      ordered[key] = songRow[key];
    }
  }
  for (const [key, value] of Object.entries(songRow || {})) {
    if (!Object.prototype.hasOwnProperty.call(ordered, key)) {
      ordered[key] = value;
    }
  }
  return ordered;
};

const summarizeVocalTypes = (vocalRows) => {
  const counts = new Map();
  for (const row of asArray(vocalRows)) {
    const type = normalizeVocalType(row?.musicVocalType) || '(empty)';
    counts.set(type, (counts.get(type) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
};

const byMusicId = (rows, field = 'musicId') => {
  const map = new Map();
  for (const row of asArray(rows)) {
    const key = Number(row?.[field]);
    if (!Number.isFinite(key)) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
};

const buildCharacterNameMap = (gameCharacters, outsideCharacters, targetCharacters) => {
  const map = new Map();

  for (const row of asArray(targetCharacters)) {
    const id = Number(row?.id);
    if (!Number.isFinite(id)) continue;
    const zhName = String(row?.zh_name || '').trim();
    if (zhName) map.set(`game_character:${id}`, zhName);
  }

  for (const row of asArray(gameCharacters)) {
    const id = Number(row?.id);
    if (!Number.isFinite(id)) continue;
    const first = String(row?.firstName || '').trim();
    const given = String(row?.givenName || '').trim();
    const name = `${first}${given}`.trim() || String(row?.givenName || '').trim();
    if (name && !map.has(`game_character:${id}`)) {
      map.set(`game_character:${id}`, name);
    }
  }

  for (const row of asArray(outsideCharacters)) {
    const id = Number(row?.id);
    if (!Number.isFinite(id)) continue;
    const name = String(row?.name || '').trim();
    if (name) map.set(`outside_character:${id}`, name);
  }

  return map;
};

const resolveCharacterName = ({ characterType, characterId, map }) => {
  const type = String(characterType || '').trim();
  const id = Number(characterId);
  if (!Number.isFinite(id)) return '';
  return map.get(`${type}:${id}`) || '';
};

const buildSongsFromSources = ({ musics, difficulties, units, vocals, gameCharacters, outsideCharacters, targetCharacters }) => {
  const difficultyRowsByMusicId = byMusicId(difficulties, 'musicId');
  const unitRowsByMusicId = byMusicId(units, 'musicId');
  const vocalRowsByMusicId = byMusicId(vocals, 'musicId');
  const characterNameMap = buildCharacterNameMap(gameCharacters, outsideCharacters, targetCharacters);

  return asArray(musics)
    .map((music) => {
      const musicId = Number(music?.id);
      if (!Number.isFinite(musicId)) return null;

      const categories = dedupeStable(
        asArray(music?.categories)
          .map((raw) => CATEGORY_MAP[String(raw || '').trim()] || String(raw || '').trim())
          .filter(Boolean)
      );

      const unitValues = normalizeUnits(
        asArray(unitRowsByMusicId.get(musicId))
          .map((row) => row?.musicTag)
      );

      const difficultiesOut = {};
      for (const row of asArray(difficultyRowsByMusicId.get(musicId))) {
        const diff = String(row?.musicDifficulty || '').trim();
        const level = Number(row?.playLevel);
        if (!diff || !Number.isFinite(level)) continue;
        difficultiesOut[diff] = level;
      }

      const vocalsOut = asArray(vocalRowsByMusicId.get(musicId))
        .slice()
        .sort((a, b) => {
          const seqA = Number(a?.seq);
          const seqB = Number(b?.seq);
          const idA = Number(a?.id);
          const idB = Number(b?.id);
          if (Number.isFinite(seqA) && Number.isFinite(seqB) && seqA !== seqB) return seqA - seqB;
          if (Number.isFinite(idA) && Number.isFinite(idB)) return idA - idB;
          return 0;
        })
        .map((vocal) => {
          const charactersOut = dedupeStable(
            asArray(vocal?.characters)
              .slice()
              .sort((a, b) => Number(a?.seq || 0) - Number(b?.seq || 0))
              .map((item) => resolveCharacterName({
                characterType: item?.characterType,
                characterId: item?.characterId,
                map: characterNameMap
              }))
              .filter(Boolean)
          );

          return {
            vocal_id: Number(vocal?.id),
            type: String(vocal?.musicVocalType || '').trim(),
            released_at: normalizeSlashDate(vocal?.archivePublishedAt),
            characters: charactersOut
          };
        })
        .filter((item) => Number.isFinite(item.vocal_id) && item.type);

      return {
        id: musicId,
        title: String(music?.title || ''),
        pronunciation: String(music?.pronunciation || ''),
        composer: String(music?.composer || ''),
        lyricist: String(music?.lyricist || ''),
        arranger: String(music?.arranger || ''),
        isNewlyWrittenMusic: toBoolean(music?.isNewlyWrittenMusic),
        releaseDate: normalizeHexDate(music?.publishedAt),
        categories,
        units: unitValues,
        difficulties: difficultiesOut,
        vocals: vocalsOut
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.id - b.id);
};

const compareById = (prevRows, nextRows) => {
  const prevMap = new Map();
  const nextMap = new Map();

  asArray(prevRows).forEach((row) => {
    const id = Number(row?.id);
    if (Number.isFinite(id)) prevMap.set(id, row);
  });

  asArray(nextRows).forEach((row) => {
    const id = Number(row?.id);
    if (Number.isFinite(id)) nextMap.set(id, row);
  });

  const added = [];
  const removed = [];
  const updated = [];

  for (const [id, row] of nextMap.entries()) {
    if (!prevMap.has(id)) {
      added.push(id);
      continue;
    }
    if (!deepEqual(prevMap.get(id), row)) {
      updated.push(id);
    }
  }

  for (const id of prevMap.keys()) {
    if (!nextMap.has(id)) removed.push(id);
  }

  added.sort((a, b) => a - b);
  removed.sort((a, b) => a - b);
  updated.sort((a, b) => a - b);

  return { added, removed, updated };
};

const shouldHaveVsUnit = (songRow) => {
  if (toBoolean(songRow?.isLimited)) return false;
  const vocalTypes = asArray(songRow?.vocals)
    .map((vocal) => normalizeVocalType(vocal?.type))
    .filter((type) => !!type && !isVsIgnoredVocalType(type));
  if (vocalTypes.length === 0) return false;
  return vocalTypes.every((type) => !VS_BLOCKED_VOCAL_TYPES.has(type));
};

const applyVsUnitRule = (songRow) => {
  const unitSet = new Set(normalizeUnits(songRow?.units));
  if (shouldHaveVsUnit(songRow)) {
    unitSet.add('vs');
  } else {
    unitSet.delete('vs');
  }
  const next = {
    ...songRow,
    units: sortByOrder([...unitSet], UNIT_ORDER)
  };
  return orderSongFields(next);
};

const isAprilFoolVocalType = (typeRaw) => normalizeVocalType(typeRaw).startsWith('april_fool');

const mergeManualVocals = (sourceVocals, prevVocals) => {
  const prevByVocalId = new Map();
  asArray(prevVocals).forEach((vocal) => {
    const vocalId = Number(vocal?.vocal_id);
    if (!Number.isFinite(vocalId)) return;
    prevByVocalId.set(vocalId, vocal);
  });
  if (prevByVocalId.size === 0) return sourceVocals;

  return asArray(sourceVocals).map((vocal) => {
    const vocalId = Number(vocal?.vocal_id);
    const prev = Number.isFinite(vocalId) ? prevByVocalId.get(vocalId) : null;
    if (!prev) return vocal;
    const next = {
      ...vocal,
      released_at: Object.prototype.hasOwnProperty.call(prev, 'released_at')
        ? String(prev?.released_at || '')
        : vocal.released_at
    };
    if (isAprilFoolVocalType(prev?.type)) {
      next.type = String(prev?.type || vocal?.type || '').trim();
      next.characters = asArray(prev?.characters).length > 0 ? [...prev.characters] : vocal.characters;
    }
    return next;
  });
};

const mergeManualSongFields = (songRow, prevSongRow) => {
  if (!prevSongRow || typeof prevSongRow !== 'object') return songRow;
  const next = { ...songRow };
  if (Object.prototype.hasOwnProperty.call(prevSongRow, 'isLimited')) {
    next.isLimited = toBoolean(prevSongRow.isLimited);
  }
  next.vocals = mergeManualVocals(songRow?.vocals, prevSongRow?.vocals);
  return next;
};

const applySongPolicy = (prevRows, nextRows) => {
  const prevMap = new Map();
  asArray(prevRows).forEach((row) => {
    const id = Number(row?.id);
    if (!Number.isFinite(id)) return;
    prevMap.set(id, row);
  });

  if (!preserveExistingCategories) {
    return asArray(nextRows).map((row) => {
      const id = Number(row?.id);
      const prev = Number.isFinite(id) ? prevMap.get(id) : null;
      const merged = mergeManualSongFields({
        ...row,
        categories: normalizeCategories(row?.categories)
      }, prev);
      return applyVsUnitRule(merged);
    });
  }

  return asArray(nextRows).map((row) => {
    const id = Number(row?.id);
    const prev = prevMap.get(id);
    const sourceCategories = normalizeCategories(row?.categories);
    if (!prev) {
      const merged = {
        ...row,
        categories: sourceCategories
      };
      return applyVsUnitRule(merged);
    }

    const preservedCategories = normalizeCategories(prev?.categories);
    const merged = mergeManualSongFields({
      ...row,
      categories: preservedCategories.length > 0 ? preservedCategories : sourceCategories
    }, prev);
    return applyVsUnitRule(merged);
  });
};

const mergeSongsIncremental = (prevRows, sourceRows) => {
  const sourceById = new Map();
  asArray(sourceRows).forEach((row) => {
    const id = Number(row?.id);
    if (!Number.isFinite(id)) return;
    sourceById.set(id, row);
  });

  const merged = [];
  const seen = new Set();

  asArray(prevRows)
    .filter((row) => Number.isFinite(Number(row?.id)))
    .forEach((row) => {
      const id = Number(row?.id);
      seen.add(id);
      const source = sourceById.get(id);
      // Existing songs: keep local row when source missing; otherwise use policy-merged source row.
      merged.push(orderSongFields(source || row));
    });

  asArray(sourceRows)
    .filter((row) => Number.isFinite(Number(row?.id)) && !seen.has(Number(row.id)))
    .forEach((row) => {
      merged.push(orderSongFields(row));
    });

  merged.sort((a, b) => Number(a.id) - Number(b.id));
  return merged;
};

const validateCoreUnitAssignments = (songs) => {
  const multiCoreRows = [];
  const conflicts = [];

  asArray(songs).forEach((row) => {
    const id = Number(row?.id);
    const units = normalizeUnits(row?.units);
    const coreHits = CORE_UNIT_KEYS.filter((key) => units.includes(key));
    if (coreHits.length <= 1) return;

    const item = {
      id,
      title: String(row?.title || ''),
      coreHits,
      units
    };

    multiCoreRows.push(item);
    if (!Number.isFinite(id) || !SPECIAL_MULTI_CORE_ALLOWED_IDS.has(id)) {
      conflicts.push(item);
    }
  });

  return { multiCoreRows, conflicts };
};

const run = async () => {
  const requiredSources = Object.fromEntries(
    Object.entries(SONG_STITCH_FILES).map(([key, fileName]) => [key, path.join(SONG_SOURCE_DIR, fileName)])
  );

  const missing = [];
  for (const sourcePath of Object.values(requiredSources)) {
    if (!(await pathExists(sourcePath))) missing.push(sourcePath);
  }
  if (!(await pathExists(TARGET_CHARACTERS_FILE))) {
    missing.push(TARGET_CHARACTERS_FILE);
  }

  if (missing.length > 0) {
    console.error('[sync-other-source] required files missing:');
    missing.forEach((item) => console.error(`- ${item}`));
    process.exit(1);
  }

  const [musics, difficulties, units, vocals, gameCharacters, outsideCharacters, targetCharacters, currentSongs] = await Promise.all([
    readJson(requiredSources.musics),
    readJson(requiredSources.difficulties),
    readJson(requiredSources.units),
    readJson(requiredSources.vocals),
    readJson(requiredSources.gameCharacters),
    readJson(requiredSources.outsideCharacters),
    readJson(TARGET_CHARACTERS_FILE),
    (await pathExists(TARGET_FILE)) ? readJson(TARGET_FILE) : Promise.resolve([])
  ]);

  const allArrays = [musics, difficulties, units, vocals, gameCharacters, outsideCharacters, targetCharacters].every(Array.isArray);
  if (!allArrays) {
    console.error('[sync-other-source] one or more source files are not JSON arrays.');
    process.exit(1);
  }

  const stitchedSongs = buildSongsFromSources({
    musics,
    difficulties,
    units,
    vocals,
    gameCharacters,
    outsideCharacters,
    targetCharacters
  });

  const prevSongs = Array.isArray(currentSongs) ? currentSongs : [];
  const policySongs = applySongPolicy(prevSongs, stitchedSongs);
  const nextSongs = mergeSongsIncremental(prevSongs, policySongs);
  const vocalTypeSummary = summarizeVocalTypes(vocals);
  const vsCount = nextSongs.filter((song) => normalizeUnits(song?.units).includes('vs')).length;

  console.log(`[sync-other-source] vocal types (${vocalTypeSummary.length}): ${vocalTypeSummary.map(([type, count]) => `${type}=${count}`).join(', ')}`);
  console.log('[sync-other-source] vs rule: ignore [streaming_live, april_fool_*], exclude [sekai, instrumental], require not isLimited.');
  console.log(`[sync-other-source] vs songs after rule: ${vsCount}`);

  const validation = validateCoreUnitAssignments(nextSongs);
  console.log(`[sync-other-source] core-unit validation: multi-core=${validation.multiCoreRows.length}, conflicts=${validation.conflicts.length}`);
  if (validation.conflicts.length > 0) {
    const sample = validation.conflicts.slice(0, 20).map((item) => `${item.id}:${item.title} [${item.coreHits.join('+')}]`).join('; ');
    console.error('[sync-other-source] core-unit validation failed:', sample);
    process.exit(1);
  }
  const diff = compareById(prevSongs, nextSongs);
  const changed = diff.added.length > 0 || diff.removed.length > 0 || diff.updated.length > 0 || prevSongs.length !== nextSongs.length;

  if (!dryRun && changed) {
    await writeJson(TARGET_FILE, nextSongs);
  }

  const mode = dryRun ? 'dry-run' : 'done';
  console.log(`[sync-other-source] ${mode}: songs=${nextSongs.length}, added=${diff.added.length}, removed=${diff.removed.length}, updated=${diff.updated.length}`);
  if (preserveExistingCategories) {
    console.log('[sync-other-source] categories policy: keep existing categories for non-new songs.');
  } else {
    console.log('[sync-other-source] categories policy: sync categories from source for all songs.');
  }
  console.log('[sync-other-source] merge policy: existing songs preserve isLimited/categories policy, local vocal released_at, and local april_fool vocal type/characters; other fields sync from source; missing-source rows kept; new songs appended.');

  const printSample = (label, ids) => {
    if (ids.length === 0) return;
    const sample = ids.slice(0, 20).join(', ');
    const suffix = ids.length > 20 ? ', ...' : '';
    console.log(`[sync-other-source] ${label}: ${sample}${suffix}`);
  };

  printSample('added song ids', diff.added);
  printSample('removed song ids', diff.removed);
  printSample('updated song ids', diff.updated);

  if (!changed) {
    console.log('[sync-other-source] no changes detected.');
  }
};

run().catch((error) => {
  console.error('[sync-other-source] failed:', error);
  process.exit(1);
});
