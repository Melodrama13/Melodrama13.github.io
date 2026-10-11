import { computed } from 'vue';

/** Preview Panels owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: PredictionEditor, PreviewSelections, PreviewStatistics, PreviewCutoff, FestivalPreview.
 */
export function useHistoryPreviewPanels(ports) {
const previewFloatingPanels = computed(() => {
  if (!ports.predictionEditor.isEditorOpen.value) return [];
  return ports.previewSelections.selectedPreviewPanelIds.value
    .map((id) => ports.previewSelections.PREVIEW_PANEL_DEFS.find((d) => d.id === id))
    .filter(Boolean)
    .map((def) => ({
      id: def.id,
      title: def.title,
      icon: def.icon,
      steps: (
        def.id === 'festival'
        || def.id === 'vs-last-four'
        || def.id === 'vs-unit-four-count'
        || def.id === 'vs-unit-score'
        || def.id === 'vs-original'
        || def.id === 'daily-lineup'
        || def.id === 'char-attr'
      ) ? [] : ports.previewStatistics.getPreviewStepsByKey(def.statKey),
      festivalName: def.id === 'festival' ? ports.previewCutoff.activePreviewFestivalName.value : '',
      festivalRows: def.id === 'festival' ? ports.festivalPreview.currentPreviewFestivalRows.value : [],
      festivalIncludeFes: def.id === 'festival' ? ports.festivalPreview.previewFestivalIncludeFes.value : false,
      festivalShowFes: def.id === 'festival' ? ports.festivalPreview.previewFestivalShowFes.value : false
    }));
});


return {
  previewFloatingPanels,
};
}
