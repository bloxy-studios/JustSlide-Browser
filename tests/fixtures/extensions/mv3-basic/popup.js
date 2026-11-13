document.getElementById('b').addEventListener('click', async () => {
  const r = await chrome.runtime.sendMessage({ type: 'create-tab', url: 'http://127.0.0.1:8765/agent.html' });
  document.getElementById('s').textContent = `created tab ${r.tabId}`;
});
