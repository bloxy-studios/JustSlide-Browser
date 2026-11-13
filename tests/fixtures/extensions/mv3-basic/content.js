document.documentElement.dataset.justslideFixture = 'content-script-ran';
chrome.runtime.sendMessage({ type: 'ping' }, (r) => { document.documentElement.dataset.justslidePong = r?.type ?? 'none'; });
