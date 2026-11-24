import { shouldSplitCapture } from '../../services/capture/captureSections.js';

const panelSections = {
  'panel-related': ':scope > .record-grid > .record-block',
  'panel-special': ':scope > .record-grid > .record-block',
  'panel-duo': ':scope > .duo-record-grid > .record-block:not(.duo-unit-section), :scope > .duo-record-grid > .duo-unit-section > .duo-unit-row-list > .duo-unit-row',
  'duo-unit-pool': ':scope > .duo-unit-row-list > .duo-unit-row',
  'panel-lineup': ':scope > .lineup-grid > .lineup-card',
  'panel-attr-summary': ':scope > .attr-summary-grid > .attr-summary-card',
  'panel-festival': ':scope > .festival-grid > .festival-card'
};

export function getCardCaptureSections(element) {
  if (element.matches('.year-stats-panel') && element.querySelector('.year-stats-table')) {
    return [...element.querySelectorAll('.year-stats-card')];
  }
  const selector = Object.hasOwn(panelSections, element.id) ? panelSections[element.id] : '';
  return selector && shouldSplitCapture(element) ? [...element.querySelectorAll(selector)] : [];
}
