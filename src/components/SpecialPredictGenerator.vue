<template>
  <div
    class="special-predict-page"
    @compositionstart="onEditorCompositionStart"
    @compositionend="onEditorCompositionEnd"
  >
    <SpecialPredictionUnlockPanel v-if="!isUnlocked"
  :unlock="unlockFeature"
/>

    <section v-else class="special-generator-shell">
      <div v-liquid-glass class="special-toolbar ui-liquid-glass ui-liquid-glass--regular">
        <SpecialPredictionSourceControls
  :sourceSelection="sourceSelectionFeature"
  :pageAppearance="pageAppearanceFeature"
  :caseRows="caseRowsFeature"
  :rangeSelection="rangeSelectionFeature"
/>

        <SpecialPredictionColorControls
  :metadata="metadataFeature"
  :presentation="presentationFeature"
/>

        <SpecialPredictionTextControls
  :textSettings="textSettingsFeature"
  :history="historyFeature"
  :coverText="coverTextFeature"
  :fonts="fontsFeature"
/>

        <SpecialPredictionExportControls
  :background="backgroundFeature"
  :capture="captureFeature"
/>
      </div>

      <div v-if="exportStatus" class="special-export-status" role="status" aria-live="polite">{{ exportStatus }}</div>

      <div ref="canvasWrapRef" class="special-canvas-wrap">
        <SpecialPredictionSingleCanvas v-if="!isMultiCaseMode"
  :preview="previewFeature"
  :capture="captureFeature"
  :presentation="presentationFeature"
  :textTransform="textTransformFeature"
  :background="backgroundFeature"
  :textSettings="textSettingsFeature"
  :coverText="coverTextFeature"
  :caseRows="caseRowsFeature"
  :metadata="metadataFeature"
  :eventNotes="eventNotesFeature"
  :noteEditing="noteEditingFeature"
  :credit="creditFeature"
/>
        <SpecialPredictionMultiCanvas v-else
  :caseRows="caseRowsFeature"
  :preview="previewFeature"
  :capture="captureFeature"
  :presentation="presentationFeature"
  :textTransform="textTransformFeature"
  :pageAppearance="pageAppearanceFeature"
  :textSettings="textSettingsFeature"
  :coverText="coverTextFeature"
  :manualCases="manualCasesFeature"
  :metadata="metadataFeature"
  :eventNotes="eventNotesFeature"
  :noteEditing="noteEditingFeature"
  :credit="creditFeature"
/>
    </div>
  </section>
  </div>
</template>

<script setup>
import SpecialPredictionUnlockPanel from '../features/prediction/SpecialPredictionUnlockPanel.vue';
import SpecialPredictionSourceControls from '../features/prediction/SpecialPredictionSourceControls.vue';
import SpecialPredictionColorControls from '../features/prediction/SpecialPredictionColorControls.vue';
import SpecialPredictionTextControls from '../features/prediction/SpecialPredictionTextControls.vue';
import SpecialPredictionExportControls from '../features/prediction/SpecialPredictionExportControls.vue';
import SpecialPredictionSingleCanvas from '../features/prediction/SpecialPredictionSingleCanvas.vue';
import SpecialPredictionMultiCanvas from '../features/prediction/SpecialPredictionMultiCanvas.vue';

import { useSpecialUnlock } from '../features/prediction/useSpecialUnlock.js';

import { useSpecialFonts } from '../features/prediction/useSpecialFonts.js';
import { useSpecialSourceSelection } from '../features/prediction/useSpecialSourceSelection.js';
import { useSpecialPreview } from '../features/prediction/useSpecialPreview.js';
import { useSpecialCapture } from '../features/prediction/useSpecialCapture.js';
import { useSpecialRangeSelection } from '../features/prediction/useSpecialRangeSelection.js';
import { useSpecialPresentation } from '../features/prediction/useSpecialPresentation.js';
import { useSpecialBackground } from '../features/prediction/useSpecialBackground.js';
import { useSpecialCredit } from '../features/prediction/useSpecialCredit.js';
import { useSpecialPageAppearance } from '../features/prediction/useSpecialPageAppearance.js';
import { useSpecialTextSettings } from '../features/prediction/useSpecialTextSettings.js';
import { useSpecialEventNotes } from '../features/prediction/useSpecialEventNotes.js';
import { useSpecialManualCases } from '../features/prediction/useSpecialManualCases.js';
import { useSpecialTextTransform } from '../features/prediction/useSpecialTextTransform.js';
import { useSpecialHistory } from '../features/prediction/useSpecialHistory.js';
import { useSpecialCoverText } from '../features/prediction/useSpecialCoverText.js';
import { useSpecialSettingsPersistence } from '../features/prediction/useSpecialSettingsPersistence.js';

import { useSpecialNoteTokens } from '../features/prediction/useSpecialNoteTokens.js';
import { useSpecialMetadata } from '../features/prediction/useSpecialMetadata.js';
import { useSpecialNoteEditing } from '../features/prediction/useSpecialNoteEditing.js';
import { useSpecialEventCatalog } from '../features/prediction/useSpecialEventCatalog.js';
import { useSpecialCaseRows } from '../features/prediction/useSpecialCaseRows.js';
import { useSpecialLifecycle } from '../features/prediction/useSpecialLifecycle.js';


const props = defineProps({
  predictSources: { type: Array, default: () => [] },
  activePredictSourceId: { type: String, default: '' },
  allEvents: { type: Array, default: () => [] },
  allCharacters: { type: Array, default: () => [] },
  allBaseCards: { type: Array, default: () => [] },
  predictUserName: { type: String, default: '' }
});

const unlockFeature = useSpecialUnlock({

});

const fontsFeature = useSpecialFonts({
  get textSettings() { return textSettingsFeature; },
  get eventNotes() { return eventNotesFeature; },
  get presentation() { return presentationFeature; },
  get credit() { return creditFeature; },
  get pageAppearance() { return pageAppearanceFeature; }
});

const sourceSelectionFeature = useSpecialSourceSelection({
  props,
  get history() { return historyFeature; },
  get pageAppearance() { return pageAppearanceFeature; },
  get textSettings() { return textSettingsFeature; },
  get eventNotes() { return eventNotesFeature; },
  get coverText() { return coverTextFeature; },
  get credit() { return creditFeature; },
  get preview() { return previewFeature; },
  get settingsPersistence() { return settingsPersistenceFeature; }
});

const previewFeature = useSpecialPreview({
  get sourceSelection() { return sourceSelectionFeature; },
  get unlock() { return unlockFeature; },
  get caseRows() { return caseRowsFeature; },
  get rangeSelection() { return rangeSelectionFeature; },
  get background() { return backgroundFeature; }
});

const captureFeature = useSpecialCapture({
  get sourceSelection() { return sourceSelectionFeature; },
  get caseRows() { return caseRowsFeature; },
  get pageAppearance() { return pageAppearanceFeature; },
  get preview() { return previewFeature; }
});

const rangeSelectionFeature = useSpecialRangeSelection({
  get eventCatalog() { return eventCatalogFeature; }
});

const presentationFeature = useSpecialPresentation({
  get metadata() { return metadataFeature; },
  get preview() { return previewFeature; },
  get pageAppearance() { return pageAppearanceFeature; },
  get background() { return backgroundFeature; }
});

const backgroundFeature = useSpecialBackground({

});

const creditFeature = useSpecialCredit({
  props,
  get sourceSelection() { return sourceSelectionFeature; },
  get settingsPersistence() { return settingsPersistenceFeature; },
  get presentation() { return presentationFeature; },
  get pageAppearance() { return pageAppearanceFeature; }
});

const pageAppearanceFeature = useSpecialPageAppearance({
  get history() { return historyFeature; },
  get textSettings() { return textSettingsFeature; },
  get credit() { return creditFeature; },
  get presentation() { return presentationFeature; },
  get background() { return backgroundFeature; },
  get coverText() { return coverTextFeature; },
  get settingsPersistence() { return settingsPersistenceFeature; },
  get metadata() { return metadataFeature; },
  get sourceSelection() { return sourceSelectionFeature; },
  get caseRows() { return caseRowsFeature; },
  get preview() { return previewFeature; },
  get textTransform() { return textTransformFeature; }
});

const textSettingsFeature = useSpecialTextSettings({
  get eventNotes() { return eventNotesFeature; },
  get sourceSelection() { return sourceSelectionFeature; },
  get presentation() { return presentationFeature; },
  get credit() { return creditFeature; }
});

const eventNotesFeature = useSpecialEventNotes({
  get sourceSelection() { return sourceSelectionFeature; },
  get caseRows() { return caseRowsFeature; },
  get pageAppearance() { return pageAppearanceFeature; },
  get manualCases() { return manualCasesFeature; },
  get settingsPersistence() { return settingsPersistenceFeature; },
  get textSettings() { return textSettingsFeature; },
  get history() { return historyFeature; },
  get noteTokens() { return noteTokensFeature; }
});

const manualCasesFeature = useSpecialManualCases({
  get metadata() { return metadataFeature; },
  get noteTokens() { return noteTokensFeature; },
  get eventNotes() { return eventNotesFeature; },
  get settingsPersistence() { return settingsPersistenceFeature; },
  get preview() { return previewFeature; }
});

const textTransformFeature = useSpecialTextTransform({
  get textSettings() { return textSettingsFeature; },
  get capture() { return captureFeature; },
  get sourceSelection() { return sourceSelectionFeature; },
  get eventNotes() { return eventNotesFeature; },
  get settingsPersistence() { return settingsPersistenceFeature; },
  get preview() { return previewFeature; },
  get unlock() { return unlockFeature; }
});

const historyFeature = useSpecialHistory({
  get pageAppearance() { return pageAppearanceFeature; },
  get sourceSelection() { return sourceSelectionFeature; },
  get textSettings() { return textSettingsFeature; },
  get credit() { return creditFeature; },
  get presentation() { return presentationFeature; },
  get eventNotes() { return eventNotesFeature; },
  get manualCases() { return manualCasesFeature; },
  get background() { return backgroundFeature; },
  get coverText() { return coverTextFeature; },
  get preview() { return previewFeature; },
  get settingsPersistence() { return settingsPersistenceFeature; },
  get unlock() { return unlockFeature; },
  get capture() { return captureFeature; },
  get textTransform() { return textTransformFeature; }
});

const coverTextFeature = useSpecialCoverText({
  get presentation() { return presentationFeature; },
  get pageAppearance() { return pageAppearanceFeature; },
  get textSettings() { return textSettingsFeature; },
  get settingsPersistence() { return settingsPersistenceFeature; },
  get eventNotes() { return eventNotesFeature; },
  get credit() { return creditFeature; },
  get history() { return historyFeature; },
  get sourceSelection() { return sourceSelectionFeature; },
  get caseRows() { return caseRowsFeature; },
  get manualCases() { return manualCasesFeature; },
  get unlock() { return unlockFeature; }
});

const settingsPersistenceFeature = useSpecialSettingsPersistence({
  get sourceSelection() { return sourceSelectionFeature; },
  get manualCases() { return manualCasesFeature; },
  get pageAppearance() { return pageAppearanceFeature; },
  get credit() { return creditFeature; },
  get eventNotes() { return eventNotesFeature; },
  get history() { return historyFeature; },
  get noteTokens() { return noteTokensFeature; },
  get textSettings() { return textSettingsFeature; },
  get coverText() { return coverTextFeature; },
  get presentation() { return presentationFeature; },
  get background() { return backgroundFeature; },
  get preview() { return previewFeature; }
});

const noteTokensFeature = useSpecialNoteTokens({
  get metadata() { return metadataFeature; }
});

const metadataFeature = useSpecialMetadata({
  props
});

const noteEditingFeature = useSpecialNoteEditing({
  get eventNotes() { return eventNotesFeature; },
  get noteTokens() { return noteTokensFeature; },
  get settingsPersistence() { return settingsPersistenceFeature; },
  get sourceSelection() { return sourceSelectionFeature; }
});

const eventCatalogFeature = useSpecialEventCatalog({
  props,
  get metadata() { return metadataFeature; },
  get sourceSelection() { return sourceSelectionFeature; }
});

const caseRowsFeature = useSpecialCaseRows({
  get metadata() { return metadataFeature; },
  get eventCatalog() { return eventCatalogFeature; },
  get noteTokens() { return noteTokensFeature; },
  get rangeSelection() { return rangeSelectionFeature; },
  get sourceSelection() { return sourceSelectionFeature; },
  get manualCases() { return manualCasesFeature; },
  get eventNotes() { return eventNotesFeature; }
});

const lifecycleFeature = useSpecialLifecycle({
  get settingsPersistence() { return settingsPersistenceFeature; },
  get fonts() { return fontsFeature; },
  get history() { return historyFeature; },
  get unlock() { return unlockFeature; },
  get preview() { return previewFeature; },
  get textTransform() { return textTransformFeature; },
  get capture() { return captureFeature; },
  get background() { return backgroundFeature; }
});

const { isUnlocked } = unlockFeature;

const { isMultiCaseMode } = sourceSelectionFeature;
const { canvasWrapRef } = previewFeature;
const { exportStatus } = captureFeature;









const { onEditorCompositionStart, onEditorCompositionEnd } = historyFeature;





// Effects retain the original registration order after every peer is connected.
textSettingsFeature.connectSpecialTextSelection();
eventNotesFeature.connectSpecialEventNoteSources();
eventNotesFeature.connectSpecialEventNoteSelection();
sourceSelectionFeature.connectSpecialSourceSelection();
pageAppearanceFeature.connectSpecialPageAppearance();
presentationFeature.connectSpecialDefaultColors();
settingsPersistenceFeature.connectSpecialSettingsPersistence();
coverTextFeature.connectSpecialEditableText();
creditFeature.connectSpecialCreditDefault();
previewFeature.connectSpecialPreviewLayout();
lifecycleFeature.connectSpecialGeneratorMount();
lifecycleFeature.connectSpecialGeneratorUnmount();
</script>

<style scoped src="../features/prediction/styles/specialPredictionGenerator.css"></style>
