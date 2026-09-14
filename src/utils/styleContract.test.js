import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isExplicitStyleContractUpdate,
  mergeStyleContract,
  pickStyleContractEntries
} from './styleContract.js';

test('ordinary Playwright snapshot modes keep style-contract writes disabled', () => {
  for (const mode of ['none', 'missing', 'changed', undefined]) {
    assert.equal(isExplicitStyleContractUpdate(mode), false);
  }
  assert.equal(isExplicitStyleContractUpdate('all'), true);
});

test('focused style-contract comparisons read only the collected keys', () => {
  const baseline = {
    history: { radius: 12 },
    songs: { radius: 16 },
    stats: { radius: 20 }
  };

  assert.deepEqual(
    pickStyleContractEntries(baseline, { songs: { radius: 16 } }),
    { songs: { radius: 16 } }
  );
});

test('focused style-contract updates merge collected keys into the complete baseline', () => {
  const baseline = {
    history: { radius: 12 },
    songs: { radius: 16 },
    stats: { radius: 20 }
  };

  assert.deepEqual(
    mergeStyleContract(baseline, { songs: { radius: 18 } }),
    {
      history: { radius: 12 },
      songs: { radius: 18 },
      stats: { radius: 20 }
    }
  );
});
