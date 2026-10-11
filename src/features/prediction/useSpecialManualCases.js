import { nextTick, ref } from "vue";
import { normalizeId, normalizeGeneratedCardAttribute } from './specialPredictionFormatters.js';

/** Owns special prediction manual cases with explicit instance dependencies. */
export function useSpecialManualCases(ports = {}) {
const manualCaseEditsByEvent = ref({});

const activeCaseControlKey = ref('');

const normalizeManualCaseEdits = (value) => {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value).map(([eventId, edit]) => {
    const normalizedEventId = normalizeId(eventId);
    const removedCaseKeys = Array.isArray(edit?.removedCaseKeys)
      ? [...new Set(edit.removedCaseKeys.map(normalizeId).filter(Boolean))]
      : [];
    const manualCases = Array.isArray(edit?.manualCases)
      ? edit.manualCases.map((manualCase, index) => ({
        id: normalizeId(manualCase?.id) || `manual-${normalizedEventId}-${index + 1}`,
        afterCaseKey: normalizeId(manualCase?.afterCaseKey),
        commands: Array.from({ length: 8 }, (_, slot) => String(manualCase?.commands?.[slot] || '')),
        basePatch: manualCase?.basePatch && typeof manualCase.basePatch === 'object'
          ? { ...manualCase.basePatch, memberCards: undefined }
          : {}
      }))
      : [];
    return [normalizedEventId, { removedCaseKeys, manualCases }];
  }).filter(([eventId]) => eventId));
};

const parseManualCaseCardCommand = (rawCommand, eventId, slotIndex) => {
  const command = String(rawCommand || '').trim().toLowerCase();
  if (!command) return null;
  const parts = command.split('-').map((part) => part.trim()).filter(Boolean);
  const character = ports.metadata.characterCommandMap.value.get(parts[0]);
  if (!character) return null;
  const rarityIndex = parts.findIndex((part, index) => index > 0 && /^[1-4]$/u.test(part));
  const rarity = rarityIndex >= 0 ? Number(parts[rarityIndex]) : NaN;
  const attribute = parts
    .slice(1)
    .map((part) => ports.noteTokens.findNoteCommandAlias(ports.noteTokens.NOTE_ATTRIBUTE_COMMANDS, part))
    .find(Boolean);
  const requestedUnit = parts
    .slice(1)
    .map((part) => ports.noteTokens.findNoteCommandAlias(ports.noteTokens.NOTE_UNIT_COMMANDS, part))
    .find(Boolean);
  if (!Number.isFinite(rarity) || !attribute) return null;
  return {
    CardID: `MANUAL-${normalizeId(eventId)}-${slotIndex}`,
    Name: character.zhName,
    Affiliation: requestedUnit || character.unit || 'vs',
    CardName: '手动 Case',
    Rarity: rarity,
    Type: 'normal',
    Attribute: normalizeGeneratedCardAttribute(attribute),
    Skill: '',
    EventID: normalizeId(eventId)
  };
};

const getManualCaseCard = (caseItem, slotIndex) => caseItem?.manualCards?.[slotIndex] || null;

const ensureManualCaseEdit = (eventId) => {
  const id = normalizeId(eventId);
  if (!manualCaseEditsByEvent.value[id]) {
    manualCaseEditsByEvent.value[id] = { removedCaseKeys: [], manualCases: [] };
  }
  return manualCaseEditsByEvent.value[id];
};

const removeRenderedCase = (eventId, caseItem) => {
  const id = normalizeId(eventId);
  const caseKey = normalizeId(caseItem?.caseKey);
  if (!id || !caseKey) return;
  const edit = ensureManualCaseEdit(id);
  if (caseItem?.isManual) {
    edit.manualCases = edit.manualCases.filter((item) => item.id !== caseItem.manualId);
  } else if (!edit.removedCaseKeys.includes(caseKey)) {
    edit.removedCaseKeys.push(caseKey);
  }
  activeCaseControlKey.value = '';
  ports.eventNotes.syncEventNotesWithSources();
  ports.settingsPersistence.saveCoverTextSettings();
  nextTick(ports.preview.updatePreviewScale);
};

const updateManualCaseCommand = (eventId, manualId, slotIndex, value) => {
  const edit = manualCaseEditsByEvent.value[normalizeId(eventId)];
  const manualCase = edit?.manualCases?.find((item) => item.id === manualId);
  if (!manualCase || slotIndex < 0 || slotIndex >= 8) return;
  manualCase.commands[slotIndex] = String(value || '');
};

return { manualCaseEditsByEvent,
activeCaseControlKey,
normalizeManualCaseEdits,
parseManualCaseCardCommand,
getManualCaseCard,
ensureManualCaseEdit,
removeRenderedCase,
updateManualCaseCommand };
}
