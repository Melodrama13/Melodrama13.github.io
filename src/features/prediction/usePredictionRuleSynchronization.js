import { watch } from "vue";

/** Owns prediction rule synchronization; state is per editor instance. */
export const usePredictionRuleSynchronization = (dependencies = {}) => {
  watch(
    () => dependencies.form.eventType,
    () => {
      dependencies.applyAllRules();
    }
  );

  watch(
    () => [dependencies.form.bannerName, dependencies.form.selectedChars.map((c) => c.name).join('|')],
    () => {
      dependencies.applyAllRules();
    }
  );

  watch(
    () => [dependencies.form.predictAttr, dependencies.form.selectedChars.map(c => c.rarity).join('|')],
    () => {
      dependencies.applyAllRules();
    }
  );

  watch(
    () => dependencies.form.gachaType,
    () => {
      dependencies.applyAllRules();
    }
  );

  watch(
    () => dependencies.normalizedBoxLockedUnits.value.join('|'),
    () => {
      dependencies.applyAllRules();
    }
  );

  watch(
    () => dependencies.form.selectedChars.map(c => c.skillType).join('|'),
    () => {
      dependencies.applyAllRules();
    }
  );

  watch(
    () => dependencies.form.selectedChars.map(c => `${c.name}:${c.rarity}:${c.skillType}`).join('|'),
    () => {
      dependencies.syncBannerName();
    }
  );

  watch(
    () => [
      dependencies.props.isOpen,
      dependencies.form.selectedChars.map((c) => [
        c.name,
        c.attr,
        c.rarity,
        c.selectedUnit,
        c.skillType
      ].join(':')).join('|')
    ],
    ([open]) => {
      if (!open) {
        dependencies.emit('selection-change', []);
        return;
      }
      dependencies.emit('selection-change', dependencies.form.selectedChars.map((c) => ({ ...c })));
    },
    { immediate: true }
  );
  return {

  };
};
