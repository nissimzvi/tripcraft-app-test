const VERSION='tripcraft-v72';
const STATIC=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(c=>c.addAll(STATIC)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==VERSION)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith((async()=>{try{const r=await fetch(e.request);if(r&&r.ok&&new URL(e.request.url).origin===self.location.origin){const c=await caches.open(VERSION);c.put(e.request,r.clone()).catch(()=>{});}return r;}catch(err){return (await caches.match(e.request))||(await caches.match('./index.html'))||Response.error();}})());});
