

/** Owns special prediction note editing with explicit instance dependencies. */
export function useSpecialNoteEditing(ports = {}) {
const isEventNoteIconElement = (node) => (
  node instanceof HTMLElement
  && node.matches('img.special-note-inline-icon[data-note-token]')
);

const getAdjacentEventNoteIcon = (element, range, direction) => {
  const container = range.startContainer;
  const offset = range.startOffset;
  let candidate = null;
  const getDeepestBoundaryNode = (node) => {
    let current = node;
    while (current?.nodeType === Node.ELEMENT_NODE && current.childNodes.length > 0) {
      current = current.childNodes[direction === 'backward' ? current.childNodes.length - 1 : 0];
    }
    return current;
  };
  const getBoundarySibling = (node) => {
    let current = node;
    while (current && current !== element) {
      const sibling = direction === 'backward' ? current.previousSibling : current.nextSibling;
      if (sibling) return getDeepestBoundaryNode(sibling);
      current = current.parentNode;
    }
    return null;
  };
  if (container.nodeType === Node.TEXT_NODE) {
    const text = String(container.nodeValue || '');
    if (direction === 'backward') {
      if (offset === 0) {
        candidate = getBoundarySibling(container);
      } else if (
        offset === 1
        && /^[\s\u00a0]$/u.test(text.slice(0, 1))
      ) {
        candidate = getBoundarySibling(container);
      }
    } else if (offset === text.length) {
      candidate = getBoundarySibling(container);
    }
  } else if (container.nodeType === Node.ELEMENT_NODE && element.contains(container)) {
    candidate = getDeepestBoundaryNode(
      container.childNodes[direction === 'backward' ? offset - 1 : offset] || null
    );
    if (!candidate) candidate = getBoundarySibling(container);
  }
  while (candidate?.nodeType === Node.TEXT_NODE && !candidate.nodeValue) {
    candidate = getBoundarySibling(candidate);
  }
  if (
    direction === 'backward'
    && candidate?.nodeType === Node.TEXT_NODE
    && /^[\s\u00a0]$/u.test(String(candidate.nodeValue || ''))
  ) {
    candidate = getBoundarySibling(candidate);
  }
  return isEventNoteIconElement(candidate) ? candidate : null;
};

const persistEventNoteDomEdit = (eventId, element, sourceId) => {
  const note = ports.eventNotes.ensureEventNote(eventId, sourceId);
  if (!note) return;
  note.text = ports.noteTokens.serializeEventNoteElement(element);
  ports.settingsPersistence.saveCoverTextSettings();
};

const deleteSelectedEventNoteIcons = (eventId, event, sourceId, element, selection, range) => {
  if (selection.isCollapsed) return false;
  const selectedFragment = range.cloneContents();
  if (!selectedFragment.querySelector?.('img.special-note-inline-icon[data-note-token]')) return false;
  event.preventDefault();
  event.stopPropagation();
  range.deleteContents();
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  persistEventNoteDomEdit(eventId, element, sourceId);
  return true;
};

const deleteAdjacentEventNoteIcon = (eventId, event, sourceId, element, selection, range, direction) => {
  if (!selection.isCollapsed) return false;
  const icon = getAdjacentEventNoteIcon(element, range, direction);
  if (!icon?.parentNode) return false;
  event.preventDefault();
  event.stopPropagation();
  const parent = icon.parentNode;
  const iconIndex = Array.prototype.indexOf.call(parent.childNodes, icon);
  let trailingNode = icon.nextSibling;
  let trailingParent = parent;
  while (!trailingNode && trailingParent && trailingParent !== element) {
    trailingNode = trailingParent.nextSibling;
    trailingParent = trailingParent.parentNode;
  }
  while (trailingNode?.nodeType === Node.ELEMENT_NODE && trailingNode.childNodes.length > 0) {
    trailingNode = trailingNode.firstChild;
  }
  icon.remove();
  if (trailingNode?.nodeType === Node.TEXT_NODE && /^[\s\u00a0]/u.test(String(trailingNode.nodeValue || ''))) {
    trailingNode.deleteData(0, 1);
    if (!trailingNode.nodeValue) trailingNode.remove();
  }
  const caretRange = document.createRange();
  caretRange.setStart(parent, Math.min(iconIndex, parent.childNodes.length));
  caretRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(caretRange);
  persistEventNoteDomEdit(eventId, element, sourceId);
  return true;
};

const getEventNoteInputSelection = (event) => {
  const element = event.currentTarget;
  const selection = window.getSelection();
  if (!(element instanceof HTMLElement) || !selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!element.contains(range.commonAncestorContainer)) return null;
  return { element, selection, range };
};

const replaceEventNoteCommand = (eventId, event, sourceId, context) => {
  const { element, selection, range } = context;
  if (!selection.isCollapsed) return false;
  const textNode = range.startContainer;
  if (textNode.nodeType !== Node.TEXT_NODE || !element.contains(textNode)) return false;
  const before = String(textNode.nodeValue || '').slice(0, range.startOffset);
  const match = before.match(/\/([^\s/]+)$/u);
  if (!match) return false;
  const descriptor = ports.noteTokens.resolveNoteIconCommand(match[1]);
  if (!descriptor) return false;

  event.preventDefault();
  event.stopPropagation();
  const commandStart = range.startOffset - match[0].length;
  const replacementRange = document.createRange();
  replacementRange.setStart(textNode, commandStart);
  replacementRange.setEnd(textNode, range.startOffset);
  replacementRange.deleteContents();
  const image = ports.noteTokens.createEventNoteIconElement(descriptor);
  replacementRange.insertNode(image);
  const caretRange = document.createRange();
  caretRange.setStartAfter(image);
  caretRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(caretRange);

  persistEventNoteDomEdit(eventId, element, sourceId);
  return true;
};

const deleteEventNoteIconFromInput = (eventId, event, sourceId, context, direction) => {
  const { element, selection, range } = context;
  if (deleteSelectedEventNoteIcons(eventId, event, sourceId, element, selection, range)) return true;
  return deleteAdjacentEventNoteIcon(eventId, event, sourceId, element, selection, range, direction);
};

const onEventNoteBeforeInput = (eventId, event, sourceId = ports.sourceSelection.selectedSource.value?.id) => {
  if (!event || event.isComposing) return;
  const context = getEventNoteInputSelection(event);
  if (!context) return;
  if (event.inputType === 'insertText' && event.data === ' ') {
    replaceEventNoteCommand(eventId, event, sourceId, context);
    return;
  }
  if (event.inputType === 'deleteContentBackward') {
    deleteEventNoteIconFromInput(eventId, event, sourceId, context, 'backward');
  } else if (event.inputType === 'deleteContentForward') {
    deleteEventNoteIconFromInput(eventId, event, sourceId, context, 'forward');
  }
};

const onEventNoteKeydown = (eventId, event, sourceId = ports.sourceSelection.selectedSource.value?.id) => {
  if (!event || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
  const context = getEventNoteInputSelection(event);
  if (!context) return;
  if (event.key === 'Backspace' || event.key === 'Delete') {
    deleteEventNoteIconFromInput(
      eventId,
      event,
      sourceId,
      context,
      event.key === 'Backspace' ? 'backward' : 'forward'
    );
    return;
  }
  if (event.key === ' ') replaceEventNoteCommand(eventId, event, sourceId, context);
};

return { isEventNoteIconElement,
getAdjacentEventNoteIcon,
persistEventNoteDomEdit,
deleteSelectedEventNoteIcons,
deleteAdjacentEventNoteIcon,
getEventNoteInputSelection,
replaceEventNoteCommand,
deleteEventNoteIconFromInput,
onEventNoteBeforeInput,
onEventNoteKeydown };
}
