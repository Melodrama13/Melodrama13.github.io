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
  tags: 'musicTags.json',
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

const TAG_MAP = Object.freeze({
  all: 'all',
  vocaloid: 'vocaloid',
  light_music_club: 'ln',
  idol: 'mmj',
  street: 'vbs',
  theme_park: 'ws',
  school_refusal: 'nc',
  other: 'other',
  vs: 'vocaloid'
});

const TAG_ORDER = Object.freeze(['all', 'vocaloid', 'ln', 'mmj', 'vbs', 'ws', 'nc', 'other']);

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

const normalizeTag = (raw) => {
  const key = String(raw || '').trim();
  if (!key) return '';
  return TAG_MAP[key] || key;
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
  const ms = Number(raw);
  if (!Number.isFinite(ms)) return '';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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

const sortByOrder = (items, order) => {
  const pos = new Map(order.map((k, idx) => [k, idx]));
  return [...items].sort((a, b) => {
    const ai = pos.has(a) ? pos.get(a) : Number.MAX_SAFE_INTEGER;
    const bi = pos.has(b) ? pos.get(b) : Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return String(a).localeCompare(String(b));
  });
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

const buildSongsFromSources = ({ musics, difficulties, tags, vocals, gameCharacters, outsideCharacters, targetCharacters }) => {
  const difficultyRowsByMusicId = byMusicId(difficulties, 'musicId');
  const tagRowsByMusicId = byMusicId(tags, 'musicId');
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

      const tagValues = dedupeStable(
        asArray(tagRowsByMusicId.get(musicId))
          .map((row) => normalizeTag(row?.musicTag))
          .filter(Boolean)
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
            characters: charactersOut
          };
        })
        .filter((item) => Number.isFinite(item.vocal_id) && item.type);

      return {
        id: musicId,
        title: String(music?.title || ''),
        composer: String(music?.composer || ''),
        lyricist: String(music?.lyricist || ''),
        arranger: String(music?.arranger || ''),
        isNewlyWrittenMusic: toBoolean(music?.isNewlyWrittenMusic),
        releaseDate: normalizeHexDate(music?.publishedAt),
        categories,
        tags: sortByOrder(tagValues, TAG_ORDER),
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

const applyCategoryPolicy = (prevRows, nextRows) => {
  if (!preserveExistingCategories) {
    return asArray(nextRows).map((row) => ({
      ...row,
      categories: normalizeCategories(row?.categories)
    }));
  }

  const prevMap = new Map();
  asArray(prevRows).forEach((row) => {
    const id = Number(row?.id);
    if (!Number.isFinite(id)) return;
    prevMap.set(id, row);
  });

  return asArray(nextRows).map((row) => {
    const id = Number(row?.id);
    const prev = prevMap.get(id);
    const sourceCategories = normalizeCategories(row?.categories);
    if (!prev) {
      return {
        ...row,
        categories: sourceCategories
      };
    }

    const preservedCategories = normalizeCategories(prev?.categories);
    return {
      ...row,
      categories: preservedCategories.length > 0 ? preservedCategories : sourceCategories
    };
  });
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

  const [musics, difficulties, tags, vocals, gameCharacters, outsideCharacters, targetCharacters, currentSongs] = await Promise.all([
    readJson(requiredSources.musics),
    readJson(requiredSources.difficulties),
    readJson(requiredSources.tags),
    readJson(requiredSources.vocals),
    readJson(requiredSources.gameCharacters),
    readJson(requiredSources.outsideCharacters),
    readJson(TARGET_CHARACTERS_FILE),
    (await pathExists(TARGET_FILE)) ? readJson(TARGET_FILE) : Promise.resolve([])
  ]);

  const allArrays = [musics, difficulties, tags, vocals, gameCharacters, outsideCharacters, targetCharacters].every(Array.isArray);
  if (!allArrays) {
    console.error('[sync-other-source] one or more source files are not JSON arrays.');
    process.exit(1);
  }

  const stitchedSongs = buildSongsFromSources({
    musics,
    difficulties,
    tags,
    vocals,
    gameCharacters,
    outsideCharacters,
    targetCharacters
  });

  const prevSongs = Array.isArray(currentSongs) ? currentSongs : [];
  const nextSongs = applyCategoryPolicy(prevSongs, stitchedSongs);
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
