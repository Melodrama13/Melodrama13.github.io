import { PRECEDENT_ATTRIBUTES as ATTRS, PRECEDENT_SKILL_LABELS } from './precedentRecords.js';
import { makeThresholdCheckpoint, getThresholdAdvancement } from './precedentThresholds.js';
import { scopesFor, groupBy, makeMilestone, cohortOf } from './milestoneShared.js';
import { isFesMilestoneSkill } from './milestoneRules.js';

export function collectColorMilestones(catalog, emit) {
  const scopes = scopesFor(catalog);
  const firstReached = new Map(scopes.map(s => [s.key, new Map()]));
  const flowerFirstReached = new Map(scopes.filter(s => ['oc', 'vs'].includes(s.key))
    .map(s => [s.key, new Map(ATTRS.map(attribute => [attribute, new Map()]))]));
  const completedTiers = new Map(scopes.map(s => [s.key, new Map()]));
  const states = new Map(catalog.characters.map(c => [c.zh_name, {
    attrs: Object.fromEntries(ATTRS.map(attr => [attr, []])), skills: new Set(), attributeSkills: new Set(),
    completionHistory: new Map(),
    streak: { attribute: '', entries: [], best: 1 },
  }]));
  for (const step of catalog.steps) {
    const pending = [];
    const before = new Map([...states].map(([name, state]) => [name, Object.fromEntries(ATTRS.map(attr => [attr, state.attrs[attr].length]))]));
    for (const [name, entries] of groupBy(step.entries, e => e.name)) {
      const state = states.get(name), cohort = cohortOf(catalog, name);
      for (const [attribute, attrEntries] of groupBy(entries, e => e.attribute)) {
        const previous = state.attrs[attribute], evidence = [...previous, ...attrEntries];
        state.attrs[attribute] = evidence;
        for (let threshold = previous.length + 1; threshold <= evidence.length; threshold += 1) {
          pending.push(makeMilestone('attribute', 'attribute', attrEntries, evidence, {
            key: `attribute:${name}:${attribute}:${threshold}`, name, attribute, cohort, subject: { kind: 'person', name },
            metric: 'attributeFour', threshold, before: previous.length, after: evidence.length, priority: 40,
          }));
        }
        for (const [skill, skillEntries] of groupBy(attrEntries, e => String(e.card.Skill || '').toLowerCase())) {
          const skillKey = `${attribute}:${skill}`;
          if (!PRECEDENT_SKILL_LABELS[skill] || isFesMilestoneSkill(skill) || state.attributeSkills.has(skillKey)) continue;
          const firstOverall = !state.skills.has(skill);
          emit(makeMilestone('skillFirst', 'attribute', skillEntries, skillEntries, {
            key: `skill:${name}:${skillKey}`, name, attribute, skill, firstOverall, cohort, subject: { kind: 'person', name },
            priority: firstOverall ? 25 : 45,
          }));
          state.attributeSkills.add(skillKey);
        }
      }
      entries.forEach(e => state.skills.add(String(e.card.Skill || '').toLowerCase()));
      const oldFloor = Math.min(...Object.values(before.get(name)));
      const floor = Math.min(...ATTRS.map(attr => state.attrs[attr].length));
      for (let threshold = oldFloor + 1; threshold <= floor; threshold += 1) {
        const triggers = entries.filter(e => before.get(name)[e.attribute] < threshold);
        state.completionHistory.set(threshold, makeThresholdCheckpoint(threshold, triggers));
        emit(makeMilestone('personalCompletion', 'attribute', triggers, [...new Set(triggers.map(e => e.attribute))].flatMap(attr => state.attrs[attr]), {
          key: `personal-completion:${name}:${threshold}`, name, cohort, subject: { kind: 'person', name }, threshold,
          before: ATTRS.filter(attr => before.get(name)[attr] >= threshold).length, after: 5, total: 5,
          cells: ATTRS.map(attribute => ({ name, attribute, count: state.attrs[attribute].length })),
          priority: 20,
          advancement: getThresholdAdvancement(state.completionHistory, threshold, name),
        }));
      }
      const attributes = new Set(entries.map(e => e.attribute));
      if (attributes.size === 1) {
        const attribute = entries[0].attribute;
        const run = state.streak.attribute === attribute ? [...state.streak.entries, ...entries] : entries;
        if (run.length > state.streak.best) emit(makeMilestone('streak', 'attribute', entries, run, {
          key: `streak:${name}:${attribute}:${run.length}`, name, attribute, cohort, after: run.length,
          priority: 55,
        }));
        state.streak = { attribute, entries: run, best: Math.max(state.streak.best, run.length) };
      } else state.streak = { attribute: '', entries: [], best: state.streak.best };
    }
    for (const scope of scopes) {
      const reached = firstReached.get(scope.key);
      const ceiling = Math.max(...scope.names.flatMap(name => ATTRS.map(attr => states.get(name).attrs[attr].length)));
      for (let threshold = reached.size + 1; threshold <= ceiling; threshold += 1) {
        const triggers = step.entries.filter(e => scope.names.includes(e.name) && states.get(e.name).attrs[e.attribute].length >= threshold);
        reached.set(threshold, makeThresholdCheckpoint(threshold, triggers));
      }
      for (const [attribute, history] of flowerFirstReached.get(scope.key) || []) {
        const flowerCeiling = Math.max(...scope.names.map(name => states.get(name).attrs[attribute].length));
        for (let threshold = history.size + 1; threshold <= flowerCeiling; threshold += 1) {
          const triggers = step.entries.filter(e => scope.names.includes(e.name) && e.attribute === attribute
            && states.get(e.name).attrs[attribute].length >= threshold);
          history.set(threshold, makeThresholdCheckpoint(threshold, triggers));
        }
      }
      const oldFloor = Math.min(...scope.names.flatMap(name => Object.values(before.get(name))));
      const floor = Math.min(...scope.names.flatMap(name => ATTRS.map(attr => states.get(name).attrs[attr].length)));
      const history = completedTiers.get(scope.key);
      for (let threshold = oldFloor + 1; threshold <= floor; threshold += 1) {
        const triggers = step.entries.filter(e => scope.names.includes(e.name) && before.get(e.name)[e.attribute] < threshold);
        history.set(threshold, makeThresholdCheckpoint(threshold, triggers));
        emit(makeMilestone('completion', 'attribute', triggers, [...new Map(triggers.map(e => [`${e.name}:${e.attribute}`, e])).values()]
          .flatMap(e => states.get(e.name).attrs[e.attribute]), {
          key: `completion:${scope.key}:${threshold}`, scope: scope.key, scopeLabel: scope.label, threshold,
          subject: { kind: ['all', 'oc'].includes(scope.key) ? 'cohort' : 'unit', unit: scope.key },
          before: scope.names.flatMap(name => Object.values(before.get(name))).filter(count => count >= threshold).length,
          after: scope.names.length * ATTRS.length, total: scope.names.length * ATTRS.length,
          cells: scope.names.flatMap(name => ATTRS.map(attribute => ({ name, attribute, count: states.get(name).attrs[attribute].length }))),
          priority: 10,
          advancement: getThresholdAdvancement(history, threshold, scope.key),
        }));
      }
    }
    for (const record of pending) {
      const scope = record.cohort;
      record.ceilingFirsts = [['any', firstReached.get(scope)], [record.attribute, flowerFirstReached.get(scope).get(record.attribute)]]
        .filter(([, history]) => history.get(record.threshold)?.timestamp === step.timestamp)
        .map(([attribute, history]) => ({ attribute, advancement: getThresholdAdvancement(history, record.threshold, scope) }));
      if (!record.ceilingFirsts.length) continue;
      record.scopeFirsts = [scope];
      record.advancement = record.ceilingFirsts[0].advancement;
      record.advancementsByScope = { [scope]: record.advancement };
      const isAnyFirst = record.ceilingFirsts[0].attribute === 'any';
      record.priority = isAnyFirst ? 0 : 5;
      emit(record);
    }
  }
}
