// Auto-fill on every page load
(() => {
  const host = location.hostname;
  const storageKey = `prefs__${host}`;
  chrome.storage.local.get(storageKey, data => {
    const prefs = data[storageKey] || [];
    prefs.forEach(({ selector, value }) => {
      document.querySelectorAll(selector).forEach(el => {
        if ('value' in el) {
          el.value = value;
        }
      });
    });
  });
})();

// Respond to popup's GET_FIELDS request
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_FIELDS') {
    const fields = [];
    document.querySelectorAll('input, textarea, select').forEach(el => {
      const label = el.name || el.id || el.placeholder || el.tagName.toLowerCase();
      let selector;
      if (el.id) {
        selector = `#${el.id}`;
      } else if (el.name) {
        selector = `${el.tagName.toLowerCase()}[name="${el.name}"]`;
      } else {
        const sameTag = Array.from(el.parentNode.querySelectorAll(el.tagName));
        const idx = sameTag.indexOf(el) + 1;
        selector = `${el.tagName.toLowerCase()}:nth-of-type(${idx})`;
      }
      fields.push({ label, selector });
    });
    sendResponse(fields);
    return true;
  }
});
