document.addEventListener('DOMContentLoaded', () => {
  // grab UI elements
  const listEl = document.getElementById('prefs-list');
  const addNewBtn = document.getElementById('add-new');
  const formContainer = document.getElementById('form-container');
  const fieldSelect = document.getElementById('field-select');
  const valueInput = document.getElementById('value-input');
  const saveBtn = document.getElementById('save-btn');
  const cancelBtn = document.getElementById('cancel-btn');

  let prefs = [];
  let editIndex = -1;
  let storageKey;

  // first, figure out the active tab's hostname
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const url = new URL(tabs[0].url);
    const host = url.hostname;
    storageKey = `prefs__${host}`;
    loadPrefs();
  });

  function renderList() {
    listEl.innerHTML = '';
    prefs.forEach((p, i) => {
      const item = document.createElement('div');
      item.className = 'pref-item';
      item.innerHTML = `
        <span>${p.label}: ${p.value}</span>
        <span>
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
  }

  addNewBtn.addEventListener('click', () => {
    editIndex = -1;
    showForm();
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
