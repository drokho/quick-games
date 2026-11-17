/**
 * Read the host safe-area insets and expose them as CSS variables.
 *
 * Copy into `src/ui/safe-area.ts`. After this runs, CSS can anchor against
 * --safe-top / --safe-right / --safe-bottom / --safe-left (all px). Call from
 * the boot flow after the SDK API module evaluates. Keep the fallback because
 * an import can resolve even when host initialization fails. The value is static; call once.
 */
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';

export function applySafeAreaVars(target: HTMLElement = document.documentElement): void {
  try {
    const { top, right, bottom, left } = RundotGameAPI.system.getSafeArea();
    target.style.setProperty('--safe-top', `${top}px`);
    target.style.setProperty('--safe-right', `${right}px`);
    target.style.setProperty('--safe-bottom', `${bottom}px`);
    target.style.setProperty('--safe-left', `${left}px`);
  } catch (err) {
    // This can throw when host initialization fails. Keep the fallback below.
    RundotGameAPI.error('polish-feel: host safe-area data unavailable', err);
  }
}
