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

test('focused style-contract updates reject changes to existing invariant fields', () => {
  const baseline = {
    history: { radius: 12 },
    songs: { radius: 16 },
    stats: { radius: 20 }
  };

  assert.throws(
    () => mergeStyleContract(baseline, { songs: { radius: 18 } }),
    /songs\.radius.*16.*18/
  );
});

test('style-contract updates retain every invariant while accepting material leaf changes', () => {
  const baseline = {
    history: {
      featureNavigation: {
        fontSize: '16px',
        backgroundImage: 'linear-gradient(old)',
        boxShadow: 'old-shadow',
        boundingBox: { x: 20, y: 73, width: 1400, height: 54 }
      }
    }
  };
  const collected = {
    history: {
      featureNavigation: {
        fontSize: '16px',
        backgroundImage: 'linear-gradient(new)',
        boxShadow: 'new-shadow',
        boundingBox: { x: 20, y: 73, width: 1400, height: 54 }
      }
    }
  };

  assert.deepEqual(mergeStyleContract(baseline, collected), collected);
});

test('focused material updates preserve omitted invariant siblings and bounding boxes', () => {
  const baseline = {
    history: {
      featureNavigation: {
        fontSize: '16px',
        padding: '8px 10px',
        backgroundImage: 'linear-gradient(old)',
        boxShadow: 'old-shadow',
        boundingBox: { x: 20, y: 73, width: 1400, height: 54 }
      }
    }
  };
  const collected = {
    history: {
      featureNavigation: {
        backgroundImage: 'linear-gradient(new)',
        boxShadow: 'new-shadow'
      }
    }
  };

  assert.deepEqual(mergeStyleContract(baseline, collected), {
    history: {
      featureNavigation: {
        fontSize: '16px',
        padding: '8px 10px',
        backgroundImage: 'linear-gradient(new)',
        boxShadow: 'new-shadow',
        boundingBox: { x: 20, y: 73, width: 1400, height: 54 }
      }
    }
  });
});

test('style-contract updates reject changes to existing invariant style fields', () => {
  const baseline = {
    history: {
      featureNavigation: {
        fontSize: '16px',
        backgroundImage: 'linear-gradient(old)',
        boxShadow: 'old-shadow',
        boundingBox: { x: 20, y: 73, width: 1400, height: 54 }
      }
    }
  };
  const collected = {
    history: {
      featureNavigation: {
        fontSize: '17px',
        backgroundImage: 'linear-gradient(new)',
        boxShadow: 'new-shadow',
        boundingBox: { x: 20, y: 73, width: 1400, height: 54 }
      }
    }
  };

  assert.throws(
    () => mergeStyleContract(baseline, collected),
    /history\.featureNavigation\.fontSize.*16px.*17px/
  );
});

test('style-contract updates reject changes to existing bounding-box values', () => {
  const baseline = {
    history: {
      featureNavigation: {
        fontSize: '16px',
        backgroundImage: 'linear-gradient(old)',
        boxShadow: 'old-shadow',
        boundingBox: { x: 20, y: 73, width: 1400, height: 54 }
      }
    }
  };
  const collected = {
    history: {
      featureNavigation: {
        fontSize: '16px',
        backgroundImage: 'linear-gradient(new)',
        boxShadow: 'new-shadow',
        boundingBox: { x: 21, y: 73, width: 1400, height: 54 }
      }
    }
  };

  assert.throws(
    () => mergeStyleContract(baseline, collected),
    /history\.featureNavigation\.boundingBox\.x.*20.*21/
  );
});

test('style-contract update mode creates an initial baseline when none exists', () => {
  const collected = {
    history: {
      featureNavigation: {
        fontSize: '16px',
        backgroundImage: 'linear-gradient(new)',
        boxShadow: 'new-shadow',
        boundingBox: { x: 20, y: 73, width: 1400, height: 54 }
      }
    }
  };

  assert.deepEqual(mergeStyleContract(undefined, collected), collected);
});
