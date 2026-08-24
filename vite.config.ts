import { defineConfig, PluginOption } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import solidPlugin from 'vite-plugin-solid';
import autoprefixer from 'autoprefixer';
import postcssJitProps from 'postcss-jit-props';
import OpenProps from 'open-props';
import { resolve } from 'path';
import { readdirSync } from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'node:http';


export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE_PATH || '/',
  define: {
    Locales: readdirSync(resolve(__dirname, './src/locales')).map(file => file.slice(0, 2)),
    Build: JSON.stringify('v' + require('./package.json').version),
    Backend: JSON.stringify([
      '',
    ]),
  },
  resolve: {
    alias: {
      '@components': path.resolve(__dirname, './src/components'),
      '@lib': path.resolve(__dirname, './src/lib'),
    },
  },
  plugins: [
    solidPlugin(),
    localVercelApi(),
    injectEruda(command === 'serve'),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        "short_name": "Ytify",
        "name": "Listen with ytify",
        "description": "32kb/s to 128kb/s youtube audio streaming website. Copy a youtube video link and listen to it as an audio totally free.",
        "icons": [
          {
            "src": "logo192.png",
            "type": "image/png",
            "sizes": "192x192",
            "purpose": "any maskable"
          },
          {
            "src": "logo512.png",
            "type": "image/png",
            "sizes": "512x512",
            "purpose": "any maskable"
          },
          {
            "src": "monochrome.png",
            "type": "image/png",
            "sizes": "512x512",
            "purpose": "monochrome"
          },
          {
            "src": "logo512.png",
            "type": "image/png",
            "sizes": "44x44",
            "purpose": "any"
          }
        ],
        "shortcuts": [
          {
            "name": "History",
            "url": "/?collection=history",
            "icons": [
              {
                "src": "memories-fill.png",
                "sizes": "192x192",
              }]
          },
          {
            "name": "Favorites",
            "url": "/?collection=favorites",
            "icons": [
              {
                "src": "heart-fill.png",
                "sizes": "192x192",
              }]
          },
          {
            "name": "Listen Later",
            "url": "/?collection=listenLater",
            "icons": [
              {
                "src": "calendar-schedule-fill.png",
                "sizes": "192x192",
              }]
          }
        ],
        "start_url": "/",
        "display": "standalone",
        "theme_color": "#F2F2F7",
        "background_color": "#F2F2F7",
        "share_target": {
          "action": "/",
          "method": "GET",
          "params": {
            "title": "title",
            "text": "text",
            "url": "url"
          }
        }
      },
      disable: command !== 'build',
      includeAssets: ['*.woff2', 'ytify_banner.webp']
    })
  ],
  css: {
    postcss: {
      plugins: [
        autoprefixer(),
        postcssJitProps(OpenProps)
      ]
    }
  }
}));


const API_ROUTES = ['iv', 'stream', 'search', 'album', 'artists', 'suggestions', 'tracks', 'subfeed'];

function decorateVercel(req: IncomingMessage, res: ServerResponse) {
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url || '/', `http://${host}`);
  (req as any).query = Object.fromEntries(url.searchParams.entries());
  (res as any).status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  (res as any).json = (body: unknown) => {
    if (!res.getHeader('Content-Type'))
      res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
    return res;
  };
  (res as any).redirect = (status: number | string, location?: string) => {
    if (typeof status === 'string') {
      location = status;
      status = 302;
    }
    res.statusCode = status as number;
    res.setHeader('Location', location || '/');
    res.end();
    return res;
  };
}

function localVercelApi(): PluginOption {
  return {
    name: 'local-vercel-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url || '').split('?')[0].replace(/\/$/, '');
        if (!pathname.startsWith('/api/')) return next();
        const name = pathname.slice(5);
        if (!API_ROUTES.includes(name)) return next();
        try {
          decorateVercel(req, res);
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          await mod.default(req, res);
        } catch (e) {
          const err = e instanceof Error ? (e.stack || e.message) : String(e);
          console.error('[api]', name, err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'API handler failed' }));
          }
        }
      });
    },
  };
}

const injectEruda = (serve: boolean) => serve ? (<PluginOption>{
  name: 'erudaInjector',
  transformIndexHtml: html => ({
    html,
    tags: [
      {
        tag: 'script',
        attrs: {
          src: '/node_modules/eruda/eruda'
        },
        injectTo: 'body-prepend'
      },
      {
        tag: 'script',
        injectTo: 'body-prepend',
        children: 'eruda.init()'
      }
    ]
  })
}) : [];


