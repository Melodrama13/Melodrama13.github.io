import { collectColorMilestones } from './milestoneColors.js';
import { collectCountCeilings } from './milestoneCounts.js';
import { collectIntervals } from './milestoneIntervals.js';
import { collectPoolFirsts } from './milestonePools.js';
import { normalizeMilestoneRules } from './milestoneRules.js';
import { milestoneEventKey } from './milestoneShared.js';
import { getMilestoneLabel, getMilestoneGrade, getMilestoneBadges, compareMilestones } from './milestoneLabels.js';

/** Compute once per history/rules snapshot; changing the activity only reads its index. */
export function buildMilestoneIndex(catalog, options = {}) {
  const rules = normalizeMilestoneRules(options), index = new Map();
  const emit = record => {
    record.badgeParts = getMilestoneLabel(record);
    record.badge = record.badgeParts.text;
    record.grade = getMilestoneGrade(record);
    record.badges = getMilestoneBadges(record);
    for (const event of record.events) {
      const id = milestoneEventKey(event.id);
      if (!index.has(id)) index.set(id, []);
      index.get(id).push(record);
    }
  };
  collectColorMilestones(catalog, emit);
  collectCountCeilings(catalog, emit, rules);
  collectPoolFirsts(catalog, emit, rules);
  collectIntervals(catalog, emit, rules);
  for (const records of index.values()) records.sort(compareMilestones);
  return index;
}
export function getEventMilestones(catalog, id, options = {}) {
  return buildMilestoneIndex(catalog, options).get(milestoneEventKey(id)) || [];
}
