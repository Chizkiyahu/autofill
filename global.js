// Global settings page script

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('prefs-tbody');
  const addBtn = document.getElementById('add-btn');
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importInput = document.getElementById('import-input');
  const formContainer = document.getElementById('form-container');
  const formTitle = document.getElementById('form-title');
  const hostInput = document.getElementById('host-input');
  const labelInput = document.getElementById('label-input');
  const selectorInput = document.getElementById('selector-input');
  const valueInput = document.getElementById('value-input');
  const saveBtn = document.getElementById('save-btn');
  const cancelBtn = document.getElementById('cancel-btn');

  // object structure: { host: [ { selector, label, value } ] }
  let allPrefs = {};
  let editHost = null;
  let editIndex = -1;

  function loadPrefs() {
    chrome.storage.local.get(null, data => {
      allPrefs = {};
      Object.keys(data).forEach(key => {
        if (key.startsWith('prefs__')) {
          const host = key.slice(7);
          allPrefs[host] = data[key] || [];
        }
      });
      renderTable();
    });
  }

  function renderTable() {
    tableBody.innerHTML = '';
    Object.entries(allPrefs).forEach(([host, prefs]) => {
      prefs.forEach((p, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${host}</td>
          <td>${p.label}</td>
          <td>${p.value}</td>
          <td>${p.selector}</td>
          <td>
            <button data-act="edit" data-host="${host}" data-idx="${idx}">Edit</button>
            <button data-act="del" data-host="${host}" data-idx="${idx}">Delete</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    });
  }

  function savePrefs(host) {
    chrome.storage.local.set({ [`prefs__${host}`]: allPrefs[host] }, () => {
      loadPrefs();
    });
  }

  function showForm(edit = false) {
    formContainer.classList.remove('hidden');
    addBtn.disabled = true;
    exportBtn.disabled = true;
    formTitle.textContent = edit ? 'Edit Preference' : 'Add Preference';
  }

  function hideForm() {
    formContainer.classList.add('hidden');
    addBtn.disabled = false;
    exportBtn.disabled = false;
    editHost = null;
    editIndex = -1;
    hostInput.value = '';
    labelInput.value = '';
    selectorInput.value = '';
    valueInput.value = '';
  }

  addBtn.addEventListener('click', () => {
    editHost = null;
    editIndex = -1;
    showForm(false);
  });

  cancelBtn.addEventListener('click', hideForm);

  saveBtn.addEventListener('click', () => {
    const host = hostInput.value.trim();
    const label = labelInput.value.trim();
    const selector = selectorInput.value.trim();
    const value = valueInput.value;
    if (!host || !selector) {
      alert('Host and selector are required.');
      return;
    }
    if (!allPrefs[host]) {
      allPrefs[host] = [];
    }
    if (editIndex >= 0 && editHost !== null) {
      // update existing
      allPrefs[editHost][editIndex] = { selector, label, value };
      if (editHost !== host) {
        // move to different host
        const moved = allPrefs[editHost].splice(editIndex, 1)[0];
        if (!allPrefs[host]) allPrefs[host] = [];
        allPrefs[host].push(moved);
        savePrefs(editHost);
      }
    } else {
      allPrefs[host].push({ selector, label, value });
    }
    savePrefs(host);
    hideForm();
  });

  tableBody.addEventListener('click', e => {
    const btn = e.target;
    if (!btn.dataset.act) return;
    const host = btn.dataset.host;
    const idx = parseInt(btn.dataset.idx, 10);
    if (btn.dataset.act === 'edit') {
      editHost = host;
      editIndex = idx;
      const p = allPrefs[host][idx];
      hostInput.value = host;
      labelInput.value = p.label;
      selectorInput.value = p.selector;
      valueInput.value = p.value;
      showForm(true);
    } else if (btn.dataset.act === 'del') {
      allPrefs[host].splice(idx, 1);
      savePrefs(host);
    }
  });

  function toCsvValue(val) {
    if (val == null) return '';
    const escaped = String(val).replace(/"/g, '""');
    return `"${escaped}"`;
  }

  exportBtn.addEventListener('click', () => {
    const lines = ['url,label,selector,value'];
    Object.entries(allPrefs).forEach(([host, prefs]) => {
      prefs.forEach(p => {
        lines.push([
          toCsvValue(host),
          toCsvValue(p.label),
          toCsvValue(p.selector),
          toCsvValue(p.value)
        ].join(','));
      });
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'autofill_prefs.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  importBtn.addEventListener('click', () => {
    importInput.click();
  });

  function parseCsvLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
    }
    result.push(cur);
    return result;
  }

  importInput.addEventListener('change', () => {
    const file = importInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const lines = reader.result.split(/\r?\n/).filter(l => l);
      if (!lines.length) return;
      // assume first line is header
      lines.slice(1).forEach(line => {
        const [host, label, selector, value] = parseCsvLine(line);
        if (!host || !selector) return;
        if (!allPrefs[host]) allPrefs[host] = [];
        const existing = allPrefs[host].find(p => p.selector === selector);
        if (existing) {
          if (existing.value === value) {
            return; // same value - skip
          }
          const useImported = confirm(
            `Different value for ${selector} on ${host}.\n` +
            `Existing: "${existing.value}"\nImported: "${value}"\n` +
            `Use imported value?`
          );
          if (useImported) {
            existing.label = label;
            existing.value = value;
          }
        } else {
          allPrefs[host].push({ label, selector, value });
        }
      });
      const updates = {};
      Object.entries(allPrefs).forEach(([host, prefs]) => {
        updates[`prefs__${host}`] = prefs;
      });
      chrome.storage.local.set(updates, () => {
        importInput.value = '';
        loadPrefs();
      });
    };
    reader.readAsText(file);
  });

  loadPrefs();
});

