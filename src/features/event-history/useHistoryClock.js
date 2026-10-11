import { ref } from 'vue';

/** Clock owns its per-instance state and behavior.
 * Named peer ports are explicit, lazy references to preserve cross-feature initialization.
 * Dependencies: none.
 */
export function useHistoryClock(ports = {}) {
const SPOILER_CLOCK_INTERVAL_MS = 60 * 1000;

const spoilerNow = ref(new Date());

let spoilerClockTimer = 0;

const refreshSpoilerClock = () => {
  spoilerNow.value = new Date();
};


return {
  spoilerNow,
  refreshSpoilerClock,
  get spoilerClockTimer() { return spoilerClockTimer; },
  set spoilerClockTimer(value) { spoilerClockTimer = value; },
  SPOILER_CLOCK_INTERVAL_MS,
};
}
