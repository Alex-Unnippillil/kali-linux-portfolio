const BADGE_CLEAR_DELAY = 2500;
const badgeTimers = new Map();

function scheduleBadgeClear(tabId) {
  const timer = badgeTimers.get(tabId);
  if (timer) {
    clearTimeout(timer);
  }
  const timeoutId = setTimeout(() => {
    chrome.action.setBadgeText({ tabId, text: '' });
    badgeTimers.delete(tabId);
  }, BADGE_CLEAR_DELAY);
  badgeTimers.set(tabId, timeoutId);
}

function showBadge(tabId, text, color) {
  chrome.action.setBadgeBackgroundColor({ tabId, color });
  chrome.action.setBadgeText({ tabId, text });
  scheduleBadgeClear(tabId);
}

async function handleAction(tab) {
  if (tab.id === undefined) return;
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'toggle-reader' });
    if (!response) return;
    if (response.status === 'shown') {
      showBadge(tab.id, 'ON', '#16a34a');
    } else if (response.status === 'hidden') {
      chrome.action.setBadgeText({ tabId: tab.id, text: '' });
    } else if (response.status === 'unsupported') {
      showBadge(tab.id, '!', '#f97316');
    }
  } catch (error) {
    showBadge(tab.id, '✕', '#ef4444');
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: '#0f172a' });
});

chrome.action.onClicked.addListener(handleAction);
