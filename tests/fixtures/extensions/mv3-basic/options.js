chrome.storage.local.get('events').then(({ events = [] }) => { document.getElementById('e').textContent = JSON.stringify(events.slice(-20), null, 2); });
