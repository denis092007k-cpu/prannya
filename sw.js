/* Прання: офлайн-кеш і нагадування */
const C = 'prannya-v3';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/')) {   // бібліотека Firebase (версія в адресі не змінюється)
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => {
      if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); }
      return res;
    })));
    return;
  }
  if (u.origin !== location.origin) return;           // Firebase, Google, лічильник: напряму
  if (r.mode === 'navigate') {                         // сторінка: спершу свіжа з мережі
    e.respondWith(fetch(r).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put('index.html', cp)); }
      return res;
    }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(r).then(m => m || fetch(r)));
});
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Прання', {
    body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png',
    tag: d.tag || 'prannya', renotify: true,
    data: { url: (typeof d.url === 'string' && /^https:\/\/prannya-push\.xeufqs\.workers\.dev\//.test(d.url)) ? d.url : './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const to = (e.notification.data && e.notification.data.url) || './';
  if (to !== './') { e.waitUntil(clients.openWindow(to)); return; }
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) if ('focus' in w) return w.focus();
    return clients.openWindow('./');
  }));
});
