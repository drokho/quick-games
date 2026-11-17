// The F12 Games bar: a thin strip above every game with a way back to the game picker,
// an Update button when a new version has downloaded, and a full screen toggle where the
// browser has one.
//
// It is part of the platform, not the game. The game is moved down below it instead of being
// covered: <body> starts under the bar and holds the game's fixed-position layers, game CSS
// that sizes itself to the screen (100vh/100dvh) is rewritten to the space left over, and
// window.innerHeight reports that space too. The bar covers the notch, so the game's own
// top safe-area inset becomes 0.

const BAR_PX = 40;

/** Rewrites one game stylesheet so it fits under the bar */
export function fitCssUnderBar(css: string): string {
  return css
    .replace(/\b100[dsl]?vh\b/g, 'calc(100dvh - var(--f12-bar, 0px))')
    .replace(/env\(\s*safe-area-inset-top\s*(,[^()]*)?\)/g, '0px');
}

export function homeBarStyle(): string {
  return `
:root { --f12-bar: calc(${BAR_PX}px + env(safe-area-inset-top, 0px)); }
html { background: #10061f; }
html body {
  position: fixed !important;
  top: var(--f12-bar) !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: auto !important;
  height: auto !important;
  margin: 0 !important;
  overflow: hidden !important;
  contain: layout paint;
}
#f12-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--f12-bar);
  padding: env(safe-area-inset-top, 0px) max(6px, env(safe-area-inset-right, 0px)) 0 max(6px, env(safe-area-inset-left, 0px));
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1a0b2e;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff6fb;
  font: 600 15px/1 'Fredoka', 'Trebuchet MS', sans-serif;
  z-index: 2147483647;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}
#f12-bar button {
  height: ${BAR_PX}px;
  min-width: 44px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 100ms ease-out;
}
#f12-bar button:active { transform: scale(0.94); }
#f12-bar .f12-badge {
  padding: 3px 5px;
  border-radius: 4px;
  background: #ff4fa3;
  color: #2a1140;
  font-size: 12px;
}
#f12-bar .f12-home.f12-confirm { color: #ffd23f; }
#f12-bar .f12-update span {
  padding: 5px 8px;
  border-radius: 4px;
  background: #ffd23f;
  color: #2a1140;
  font-size: 12px;
}
#f12-bar .f12-update.f12-confirm span { background: #ff4fa3; }
#f12-bar .f12-fs svg { width: 20px; height: 20px; }
#f12-bar [hidden] { display: none; }
#f12-bar .f12-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-align: right;
  padding-right: 6px;
  color: #c9b6dd;
  font-weight: 500;
}`;
}

/** Runs in <head> before the game: adjusts innerHeight now, adds the bar once <body> exists */
export function homeBarScript(title: string, home: string): string {
  return `(() => {
  const BAR = ${BAR_PX};
  window.__f12Bar = true;
  const probe = () => {
    const p = document.createElement('div');
    p.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;height:var(--f12-bar)';
    document.documentElement.appendChild(p);
    const h = p.getBoundingClientRect().height || BAR;
    p.remove();
    return h;
  };
  let barPx = 0;
  addEventListener('resize', () => { barPx = 0; }, true);
  const desc = Object.getOwnPropertyDescriptor(window, 'innerHeight');
  if (desc && desc.get && desc.configurable) {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      get() {
        if (!barPx) barPx = probe();
        return Math.max(0, desc.get.call(window) - barPx);
      },
    });
  }

  const add = () => {
    const bar = document.createElement('nav');
    bar.id = 'f12-bar';
    bar.setAttribute('aria-label', 'F12 Games');
    bar.innerHTML =
      '<button type="button" class="f12-home" aria-label="Back to all games">' +
      '<span class="f12-badge">F12</span><span class="f12-label">Games</span></button>' +
      '<span class="f12-title"></span>' +
      '<button type="button" class="f12-update" aria-label="A new version is ready: restart to update" hidden><span>Update</span></button>' +
      '<button type="button" class="f12-fs" aria-label="Full screen" hidden></button>';
    bar.querySelector('.f12-title').textContent = ${JSON.stringify(title)};

    // Two taps, so a stray tap near the top doesn't drop someone out of their game
    const twoTaps = (btn, label, idle, confirm, go) => {
      let armed = 0;
      btn.addEventListener('click', () => {
        if (armed) return go();
        btn.classList.add('f12-confirm');
        label.textContent = confirm;
        armed = setTimeout(() => {
          armed = 0;
          btn.classList.remove('f12-confirm');
          label.textContent = idle;
        }, 3000);
      });
    };
    twoTaps(bar.querySelector('.f12-home'), bar.querySelector('.f12-label'), 'Games', 'Tap again to leave', () => {
      location.href = ${JSON.stringify(home)};
    });

    // Update: a new version finished downloading (sw.js takes over as soon as it has),
    // so offer a restart into it. Games save on pagehide, like when leaving.
    const update = bar.querySelector('.f12-update');
    twoTaps(update, update.firstChild, 'Update', 'Tap to restart', () => location.reload());
    const sw = navigator.serviceWorker;
    if (sw && sw.controller) sw.addEventListener('controllerchange', () => { update.hidden = false; });
    // An open app may sit for days: look for a new version whenever it comes back to the front
    if (sw) document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') sw.getRegistration().then((r) => r && r.update()).catch(() => {});
    });

    // Full screen: only where the browser can do it and the app isn't full screen already
    // (iPhone Safari can't; the installed app always is)
    const fs = bar.querySelector('.f12-fs');
    const d = document, el = d.documentElement;
    const installed = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
    const isFs = () => !!(d.fullscreenElement || d.webkitFullscreenElement);
    const ICON_IN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
    const ICON_OUT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
    const showFs = () => {
      fs.innerHTML = isFs() ? ICON_OUT : ICON_IN;
      fs.setAttribute('aria-label', isFs() ? 'Leave full screen' : 'Full screen');
    };
    if (!installed && (d.fullscreenEnabled || d.webkitFullscreenEnabled)) {
      fs.hidden = false;
      showFs();
      d.addEventListener('fullscreenchange', showFs);
      d.addEventListener('webkitfullscreenchange', showFs);
      fs.addEventListener('click', () => {
        const p = isFs()
          ? (d.exitFullscreen || d.webkitExitFullscreen).call(d)
          : (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
        if (p && p.catch) p.catch(() => {});
      });
    }
    for (const t of ['pointerdown', 'touchstart', 'mousedown']) bar.addEventListener(t, (e) => e.stopPropagation());
    document.documentElement.appendChild(bar);
  };
  // The portal shows "Updated" on games whose version changed since this device last opened them
  fetch('./f12.json', { cache: 'no-store' })
    .then((r) => r.json())
    .then((j) => { try { localStorage.setItem('f12:played:' + j.slug, j.version); } catch {} })
    .catch(() => {});

  if (document.body) add();
  else document.addEventListener('DOMContentLoaded', add);
})();`;
}
