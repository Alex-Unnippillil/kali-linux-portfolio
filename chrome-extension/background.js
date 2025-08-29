let pipUrl = chrome.runtime.getURL('pip.html');

async function openPip() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (url) => {
      if (!window.documentPictureInPicture) return;
      window.documentPictureInPicture.requestWindow({ width: 320, height: 60 }).then((win) => {
        win.location.href = url;
      });
    },
    args: [pipUrl],
  });
}

chrome.action.onClicked.addListener(openPip);

async function queryAllTabs() {
  const tabs = await chrome.tabs.query({});
  const results = [];
  for (const tab of tabs) {
    try {
      const medias = await chrome.tabs.sendMessage(tab.id, { type: 'status' });
      results.push({ tabId: tab.id, medias });
    } catch (e) {
      // ignore tabs without the content script
    }
  }
  return results;
}

function broadcast(action) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { type: action });
    }
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'query') {
    queryAllTabs().then((data) => sendResponse(data));
    return true;
  }
  if (msg.type === 'control') {
    broadcast(msg.action);
  }
});

function notify() {
  chrome.runtime.sendMessage({ type: 'refresh' });
}

chrome.tabs.onActivated.addListener(notify);
chrome.tabs.onUpdated.addListener(notify);
