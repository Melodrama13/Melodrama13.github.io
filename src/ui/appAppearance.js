import { watch } from 'vue';

export function connectAppAppearance(settings, environment = {}) {
  const documentLike = environment.document === undefined ? globalThis.document : environment.document;
  const windowLike = environment.window === undefined ? globalThis.window : environment.window;
  const root = documentLike?.documentElement;
  if (!root) return () => {};
  const systemAppearance = windowLike?.matchMedia?.('(prefers-color-scheme: dark)');
  const apply = () => {
    const appearance = settings.appearance.value;
    const theme = appearance === 'dark' || (appearance === 'system' && systemAppearance?.matches) ? 'dark' : 'light';
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  };
  const stop = watch(settings.appearance, apply, { immediate: true, flush: 'sync' });
  systemAppearance?.addEventListener?.('change', apply);
  return () => {
    stop();
    systemAppearance?.removeEventListener?.('change', apply);
  };
}
