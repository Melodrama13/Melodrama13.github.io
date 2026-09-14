export const isExplicitStyleContractUpdate = (updateSnapshots) => updateSnapshots === 'all';

export const pickStyleContractEntries = (baseline, collected) => {
  const source = baseline && typeof baseline === 'object' ? baseline : {};
  const keys = collected && typeof collected === 'object' ? Object.keys(collected) : [];
  return Object.fromEntries(keys.sort().map((key) => [key, source[key]]));
};

export const mergeStyleContract = (baseline, collected) => ({
  ...(baseline && typeof baseline === 'object' ? baseline : {}),
  ...(collected && typeof collected === 'object' ? collected : {})
});
