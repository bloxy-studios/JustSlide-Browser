// Records tab lifecycle events so tests can assert extension tab IDs and
// active/current-window semantics are intact under JustSlide workspaces.
const log = async (entry) => {
  const { events = [] } = await chrome.storage.local.get('events');
  events.push({ t: Date.now(), ...entry });
  await chrome.storage.local.set({ events: events.slice(-200) });
};
chrome.runtime.onInstalled.addListener(() => log({ type: 'installed' }));
chrome.tabs.onCreated.addListener((tab) => log({ type: 'tabs.onCreated', tabId: tab.id, windowId: tab.windowId, active: tab.active }));
chrome.tabs.onRemoved.addListener((tabId, info) => log({ type: 'tabs.onRemoved', tabId, windowId: info.windowId }));
chrome.tabs.onActivated.addListener((info) => log({ type: 'tabs.onActivated', ...info }));
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type === 'ping') { log({ type: 'message', from: sender.tab?.id }); reply({ type: 'pong', tabId: sender.tab?.id }); }
  if (msg?.type === 'create-tab') { chrome.tabs.create({ url: msg.url, active: false }).then(t => reply({ type: 'created', tabId: t.id })); return true; }
  if (msg?.type === 'close-tab') { chrome.tabs.remove(msg.tabId).then(() => reply({ type: 'closed' })); return true; }
  if (msg?.type === 'query-active') { chrome.tabs.query({ active: true, currentWindow: true }).then(t => reply({ type: 'active', tabs: t.map(x => x.id) })); return true; }
});
