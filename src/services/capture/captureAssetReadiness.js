/**
 * Wait until an image is complete, emits load/error, or reaches its deadline.
 * All outcomes resolve without a value; completion does not imply valid pixels.
 * Removes its own listeners and timer, without aborting the image request.
 * @param {unknown} imgEl
 * @param {number} [timeoutMs=2200]
 * @returns {Promise<void>}
 */
export const waitForCaptureImageReady = (imgEl, timeoutMs = 2200) => new Promise((resolve) => {
  if (!(imgEl instanceof HTMLImageElement)) {
    resolve();
    return;
  }
  if (imgEl.complete) {
    resolve();
    return;
  }
  let done = false;
  let timer = 0;
  const finish = () => {
    if (done) return;
    done = true;
    imgEl.removeEventListener('load', finish);
    imgEl.removeEventListener('error', finish);
    if (timer) clearTimeout(timer);
    resolve();
  };
  imgEl.addEventListener('load', finish, { once: true });
  imgEl.addEventListener('error', finish, { once: true });
  timer = window.setTimeout(finish, timeoutMs);
});

/**
 * Bound the wait for document fonts and descendant images of a capture root.
 * Retains the existing numeric option coercion, image limit, and deadline race.
 * Defaults to 2600 ms and 72 images, with each image wait capped at 2400 ms.
 * Reaching the deadline does not cancel font/image work or underlying requests.
 * @param {unknown} rootEl
 * @param {{ maxWaitMs?: number | string, maxImages?: number | string } | null} [options={}]
 * @returns {Promise<void>}
 */
export const waitForCaptureAssetsReady = async (rootEl, options = {}) => {
  if (!(rootEl instanceof HTMLElement)) return;
  const maxWaitMs = Number(options?.maxWaitMs || 0) > 0 ? Number(options.maxWaitMs) : 2600;
  const maxImages = Number(options?.maxImages || 0) > 0 ? Number(options.maxImages) : 72;

  const fontReadyPromise = (document?.fonts?.ready && typeof document.fonts.ready.then === 'function')
    ? document.fonts.ready.catch(() => undefined)
    : Promise.resolve();
  const images = Array.from(rootEl.querySelectorAll('img')).slice(0, maxImages);
  const imageReadyPromise = Promise.allSettled(images.map((img) => waitForCaptureImageReady(img, Math.min(2400, maxWaitMs))));

  await Promise.race([
    Promise.allSettled([fontReadyPromise, imageReadyPromise]),
    new Promise((resolve) => window.setTimeout(resolve, maxWaitMs))
  ]);
};
