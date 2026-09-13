export const UI_BREAKPOINTS = Object.freeze({
  phoneXsMax: 520,
  editorTransition: 700,
  smallTabletMax: 768,
  compactMax: 900,
  historyPreviewMax: 1000,
  tabletMax: 1200,
  cardWideMax: 1360
});

const isFiniteWidth = (width) => Number.isFinite(Number(width));

export const isViewportAtMost = (width, boundary) => (
  isFiniteWidth(width)
  && isFiniteWidth(boundary)
  && Number(width) <= Number(boundary)
);

export const isViewportAbove = (width, boundary) => (
  isFiniteWidth(width)
  && isFiniteWidth(boundary)
  && Number(width) > Number(boundary)
);

export const toMaxWidthMediaQuery = (boundary) => `(max-width: ${Number(boundary)}px)`;
