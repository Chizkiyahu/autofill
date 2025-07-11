// Pass GET_FIELDS from popup to content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_FIELDS') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0].id, msg, resp => sendResponse(resp));
    });
    return true;
  }
});
