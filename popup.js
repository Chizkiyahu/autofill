document.addEventListener('DOMContentLoaded', () => {
  // grab UI elements
  const listEl = document.getElementById('prefs-list');
  const addNewBtn = document.getElementById('add-new');
  const manageAllBtn = document.getElementById('manage-all');
  const formContainer = document.getElementById('form-container');
  const fieldSelect = document.getElementById('field-select');
  const valueInput = document.getElementById('value-input');
  const saveBtn = document.getElementById('save-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const hostNameEl = document.getElementById('host-name');
  const noPrefsEl = document.getElementById('no-prefs');
  const formTitle = document.getElementById('form-title');

  let prefs = [];
  let editIndex = -1;
  let storageKey;

  // first, figure out the active tab's hostname
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const url = new URL(tabs[0].url);
    const host = url.hostname;
    storageKey = `prefs__${host}`;
    if (hostNameEl) {
      hostNameEl.textContent = host;
    }
    loadPrefs();
  });

  function renderList() {
    listEl.innerHTML = '';
    if (!prefs.length) {
      noPrefsEl.classList.remove('hidden');
      return;
    }
    noPrefsEl.classList.add('hidden');
    prefs.forEach((p, i) => {
      const item = document.createElement('div');
      item.className = 'pref-item';
      item.innerHTML = `
        <span>${p.label}: ${p.value}</span>
        <span class="pref-actions">
          <button data-action="edit" data-index="${i}">Edit</button>
          <button data-action="del" data-index="${i}">Delete</button>
        </span>
      `;
      listEl.appendChild(item);
    });
  }

  function loadPrefs() {
    chrome.storage.local.get(storageKey, data => {
      prefs = data[storageKey] || [];
      renderList();
    });
  }

  function savePrefs() {
    chrome.storage.local.set({ [storageKey]: prefs }, () => {
      renderList();
      hideForm();
    });
  }

  function showForm(edit = false) {
    formContainer.classList.remove('hidden');
    addNewBtn.disabled = true;
    if (formTitle) {
      formTitle.textContent = edit ? 'Edit Preference' : 'Add Preference';
    }

    // fetch page fields
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: 'GET_FIELDS' },
        fields => {
          fieldSelect.innerHTML = '';
          fields.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.selector;
            opt.textContent = f.label;
            fieldSelect.appendChild(opt);
          });

          if (edit && prefs[editIndex]) {
            fieldSelect.value = prefs[editIndex].selector;
            valueInput.value = prefs[editIndex].value;
          } else {
            valueInput.value = '';
          }
        }
      );
    });
  }

  function hideForm() {
    formContainer.classList.add('hidden');
    addNewBtn.disabled = false;
    editIndex = -1;
    valueInput.value = '';
  }

  addNewBtn.addEventListener('click', () => {
    editIndex = -1;
    showForm();
  });

  manageAllBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('global.html') });
  });

  cancelBtn.addEventListener('click', hideForm);

  saveBtn.addEventListener('click', () => {
    const selector = fieldSelect.value;
    const label = fieldSelect.options[fieldSelect.selectedIndex].text;
    const value = valueInput.value;
    if (!selector) {
      alert('Please select a field.');
      return;
    }
    if (editIndex >= 0) {
      prefs[editIndex] = { selector, label, value };
    } else {
      prefs.push({ selector, label, value });
    }
    savePrefs();
  });

  listEl.addEventListener('click', e => {
    const btn = e.target;
    const idx = parseInt(btn.dataset.index, 10);
    if (btn.dataset.action === 'edit') {
      editIndex = idx;
      showForm(true);
    }
    if (btn.dataset.action === 'del') {
      prefs.splice(idx, 1);
      savePrefs();
    }
  });
});
