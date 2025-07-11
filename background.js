// Pass GET_FIELDS from popup to content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_FIELDS') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0].id, msg, resp => sendResponse(resp));
    });
    return true;
  }
});

function createContextMenu() {
  chrome.contextMenus.create({
    id: 'set-autofill',
    title: 'Set AutoFill value',
    contexts: ['editable']
  });
}

chrome.runtime.onInstalled.addListener(createContextMenu);
chrome.runtime.onStartup.addListener(createContextMenu);

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'set-autofill') {
    chrome.tabs.sendMessage(tab.id, { type: 'SET_FIELD_VALUE' });
  }
});
