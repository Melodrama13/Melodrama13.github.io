// High-level interactions dismiss previews before opening their own surface.
// Each mounted feature owns and unregisters its local dismissal callback.
const dismissals = new Set();

export const registerTransientOverlayDismissal = dismiss => {
  dismissals.add(dismiss);
  return () => dismissals.delete(dismiss);
};

export const dismissTransientOverlays = () => {
  for (const dismiss of [...dismissals]) dismiss();
};
