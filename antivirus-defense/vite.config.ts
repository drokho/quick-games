import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { rundotGameLibrariesPlugin } from '@series-inc/rundot-game-sdk/vite';
import { f12Pwa } from '../f12-games/platform/vite-plugin';

export default defineConfig(({ mode }) => ({
    // REQUIRED for RUN: deployed builds are served from a subdirectory, so all
    // asset URLs must be relative. Do not change this.
    base: './',
    // rundotGameLibrariesPlugin: on `vite build`, libraries the RUN host embeds
    // (React 19.2.4 / react-dom 19.2.4 here — pixi.js is always bundled) are
    // externalized and served by the host on mobile / CDN on web, shrinking the
    // bundle. Externalization only engages when the installed version exactly
    // matches the host's — hence the exact react/react-dom pins in package.json.
    // `npm run build:bundled` disables it for a standalone build.
    // `vite build --mode pwa` builds the F12 Games version (RUN SDK swapped for the F12 shim)
    plugins: mode === 'pwa' ? [react(), tailwindcss(), f12Pwa()] : [rundotGameLibrariesPlugin(), react(), tailwindcss()],
    server: {
        allowedHosts: true,
    },
    build: {
        // Top-level await in the boot path (and in the SDK) needs a modern target.
        target: 'esnext',
    },
}));
