self.addEventListener('push', event => {
 let data;
 try { data=event.data.json(); } catch { data={}; }
 event.waitUntil(self.registration.showNotification(data.title || 'Personal Tools', {body:data.body || 'Open your routines.',icon:'/icon-192.png',badge:'/icon-192.png',tag:data.tag || 'routine',data:{url:'/#home'}}));
});
self.addEventListener('notificationclick', event => {
 event.notification.close();
 event.waitUntil((async()=>{const tabs=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const tab of tabs){if(new URL(tab.url).origin===self.location.origin){await tab.navigate('/#home');return tab.focus();}}return self.clients.openWindow('/#home');})());
});
