// Source: https://sekai-world.github.io/sekai-master-db-diff/worldBlooms.json
// aggregateAt ends scoring; chapterEndAt closes the chapter ten minutes later.
export function normalizeWorldLinkChapters(rows, characters = []) {
  if (!Array.isArray(rows) || !rows.length) throw new Error('Invalid WL chapter data');
  const names = new Map(characters.map(character => [Number(character.id), String(character.zh_name || '').trim()]));
  const events = new Map();
  for (const row of rows) {
    const { eventId, chapterNo, worldBloomChapterType: chapterType, gameCharacterId: characterId, chapterStartAt: startAt, aggregateAt: endAt } = row;
    if (![eventId, chapterNo, startAt, endAt].every(value => Number.isSafeInteger(value) && value > 0) || endAt <= startAt
      || !['game_character', 'finale'].includes(chapterType)) throw new Error('Invalid WL chapter');
    const character = chapterType === 'game_character' ? names.get(characterId) : '';
    if (chapterType === 'game_character' && !character) throw new Error(`Invalid WL character: ${characterId}`);
    const chapters = events.get(eventId) || [];
    if (chapters.some(chapter => chapter.chapterNo === chapterNo)) throw new Error(`Duplicate WL chapter: ${eventId}/${chapterNo}`);
    chapters.push({ chapterNo, character, startAt, endAt });
    events.set(eventId, chapters);
  }
  return [...events].sort(([a], [b]) => a - b).map(([eventId, chapters]) => {
    chapters.sort((a, b) => a.chapterNo - b.chapterNo);
    if (chapters.some((chapter, index) => chapter.chapterNo !== index + 1
      || index > 0 && chapter.startAt !== chapters[index - 1].endAt + 1000)) throw new Error(`Invalid WL sequence: ${eventId}`);
    return { event_id: eventId, chapters: chapters.map(chapter => ({ character: chapter.character,
      start_date: formatStoredChapterTime(chapter.startAt), end_date: formatStoredChapterTime(chapter.endAt) })) };
  });
}

const chapterTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
const timeParts = timestamp => Object.fromEntries(chapterTimeFormatter.formatToParts(timestamp).map(part => [part.type, part.value]));
function formatStoredChapterTime(timestamp) {
  const parts = timeParts(timestamp);
  return `${parts.year}/${Number(parts.month)}/${Number(parts.day)} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function parseChapterTime(value) {
  const match = typeof value === 'string' && value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) throw new Error('Invalid WL date');
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  const timestamp = Date.UTC(year, month - 1, day, hour - 8, minute, second);
  const local = new Date(timestamp + 8 * 60 * 60 * 1000);
  if ([local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate(), local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds()]
    .some((value, index) => value !== [year, month, day, hour, minute, second][index])) throw new Error('Invalid WL date');
  return timestamp;
}

export function validateWorldLinkChapters(rows) {
  if (!Array.isArray(rows) || !rows.length) throw new Error('Invalid WL chapter resource');
  const seen = new Set();
  for (const event of rows) {
    if (!Number.isSafeInteger(event.event_id) || event.event_id <= 0 || seen.has(event.event_id)
      || !Array.isArray(event.chapters) || !event.chapters.length) throw new Error('Invalid WL event');
    seen.add(event.event_id);
    let previousEnd;
    for (const chapter of event.chapters) {
      if (typeof chapter.character !== 'string' || !chapter.character.trim() && event.chapters.length !== 1) throw new Error('Invalid WL character');
      const start = parseChapterTime(chapter.start_date), end = parseChapterTime(chapter.end_date);
      if (end <= start || previousEnd !== undefined && start !== previousEnd + 1000) throw new Error('Invalid WL sequence');
      previousEnd = end;
    }
  }
  return rows;
}

export function formatWorldLinkChapterTime(value) {
  const timestamp = parseChapterTime(value);
  const parts = timeParts(timestamp);
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}`;
  return { text: `${date.replaceAll('-', '/')} ${time}`, dateTime: `${date}T${time}:00+08:00` };
}

let chaptersRequest;
export function loadWorldLinkChapters() {
  if (!chaptersRequest) {
    const version = typeof __PUBLIC_DATA_VERSION__ !== 'undefined' ? __PUBLIC_DATA_VERSION__ : '';
    chaptersRequest = fetch(`${import.meta.env?.BASE_URL || '/'}data/pjsk_wl_chapters.json?v=${encodeURIComponent(version)}`)
      .then(response => {
        if (!response.ok) throw new Error(`WL chapters: HTTP ${response.status}`);
        return response.json();
      }).then(validateWorldLinkChapters).catch(error => { chaptersRequest = undefined; throw error; });
  }
  return chaptersRequest;
}
