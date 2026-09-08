// 极简 Service Worker：离线缓存应用外壳，让工作台在弱网/离线也可打开
const CACHE = 'fw-shell-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.respondWith = null;
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // 网络优先，失败回退缓存（保证最新内容，同时支持离线）
  e.respondWith(
    fetch(req).catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  );
});
