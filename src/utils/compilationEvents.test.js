import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isCompilationEvent,
  mapLegacyPredictionId,
  resolveLegacyPredictionScheduleIndex
} from './compilationEvents.js';

const events = JSON.parse(readFileSync(new URL('../../public/data/pjsk_events.json', import.meta.url), 'utf8'));

test('the six compilation events occupy their announced dates and have no pool or banner', () => {
  const expected = [
    [221, '2026/10/21', '2026/10/25', 'VBS'],
    [222, '2026/10/26', '2026/10/30', 'MMJ'],
    [225, '2026/11/20', '2026/11/24', 'WS'],
    [226, '2026/11/25', '2026/11/29', 'LN'],
    [229, '2026/12/21', '2026/12/25', 'NC'],
    [230, '2026/12/26', '2026/12/30', 'VS']
  ];
  for (const [id, start, end, unit] of expected) {
    const event = events.find((row) => row.id === id);
    assert.ok(event, `missing event ${id}`);
    assert.equal(event.start_date, start);
    assert.equal(event.end_date, end);
    assert.equal(event.unit, unit);
    assert.equal(isCompilationEvent(event), true);
    assert.equal(event.gacha_title, '');
    assert.equal(event.gacha_type, null);
    assert.equal(event.type_series_id, null);
    assert.equal(event.banner, '');
  }
});

test('old predictions for replaced normal events are removed while retained events move by date', () => {
  const expected = new Map([
    [220, 220], [221, null], [222, 223], [223, 224],
    [224, null], [225, 227], [226, 228], [227, null],
    [228, 231], [237, 240]
  ]);
  for (const [oldId, newId] of expected) {
    assert.equal(mapLegacyPredictionId(oldId), newId, `old ${oldId}`);
  }
});

test('retained event rows keep their old dates and pool types after renumbering', () => {
  const expected = [
    [223, '2026/10/31', '普通限定'],
    [224, '2026/11/10', '常驻'],
    [227, '2026/11/30', '普通限定'],
    [228, '2026/12/11', '常驻'],
    [231, '2026/12/31', '普通限定'],
    [240, '2027/3/30', '普通限定']
  ];
  const ids = events.filter((row) => Number.isInteger(row.id)).map((row) => row.id);
  assert.equal(new Set(ids).size, ids.length, 'numeric activity IDs must remain unique');
  for (const [id, date, gacha] of expected) {
    const event = events.find((row) => row.id === id);
    assert.equal(event?.start_date, date, `event ${id} date`);
    assert.equal(event?.gacha_type, gacha, `event ${id} gacha`);
  }
});

test('v3 schedule indexes resolve against the old schedule, not the inserted compilation slots', () => {
  const expected = [
    [218, 220], [219, null], [220, 223], [221, 224],
    [222, null], [223, 227], [224, 228], [225, null], [226, 231]
  ];
  for (const [oldIndex, newId] of expected) {
    assert.equal(resolveLegacyPredictionScheduleIndex(oldIndex, events), newId, `index ${oldIndex}`);
  }
});
