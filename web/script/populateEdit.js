document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return;

  try {
    const res = await fetch(`http://localhost:3001/api/read/${id}`);
    if (!res.ok) throw new Error('Failed to fetch plant data');
    const data = await res.json();
    const plant = data.plant;
    if (!plant) return;

    
  const setIfExists = (sel, value) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const v = value ?? '';
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      // Prefill the input so users can edit directly (previously placeholder-only)
      el.value = v;
      el.setAttribute('aria-label', v);
    } else {
      el.textContent = v;
    }
  };

  // expose original plant for other scripts (used to merge updates)
  window.__originalPlant = plant;

  setIfExists('.name', plant.name);
    setIfExists('.common_name', plant.common_name);
    setIfExists('.scientific_name', plant.scientific_name);
    setIfExists('.family', plant.family);
    setIfExists('.medicinal_benefits', plant.medicinal_benefits);
    setIfExists('.nutritional_benefits', plant.nutritional_benefits);

    // Image preview + filename
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview && plant.image_leaf_path) {
      imagePreview.src = plant.image_leaf_path;
      imagePreview.hidden = false;
    }
    const imageNameEl = document.querySelector('.file-name');
    if (imageNameEl) {
      imageNameEl.textContent = plant.image_leaf_path ? plant.image_leaf_path.split('/').pop() : 'ยังไม่ได้เลือกไฟล์';
    }

    // Ensure selecting a new file updates preview and filename on edit page as well
    const fileInput = document.getElementById('image');
    if (fileInput) {
      let objectUrl;
      fileInput.addEventListener('change', () => {
        const f = fileInput.files && fileInput.files[0];
        if (imageNameEl) imageNameEl.textContent = f ? f.name : (plant.image_leaf_path ? plant.image_leaf_path.split('/').pop() : 'ยังไม่ได้เลือกไฟล์');
        if (f && f.type && f.type.startsWith('image/')) {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          objectUrl = URL.createObjectURL(f);
          if (imagePreview) {
            imagePreview.src = objectUrl;
            imagePreview.hidden = false;
          }
        } else {
          if (imagePreview) {
            imagePreview.hidden = true;
            imagePreview.removeAttribute('src');
          }
          if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
        }
      });
    }

    // Build nutritional display and editable UI from JSON
    let nut = plant.nutritional_value;
    if (typeof nut === 'string') {
      try { nut = JSON.parse(nut); } catch (e) { nut = []; }
    }
    if (!Array.isArray(nut)) nut = [];

    // expose parsed nutritional array for addPlant to reuse/merge
    window.__originalPlant = { ...plant, nutritional_value: nut };


    // Create editable controls wrapper; reuse ids used by addPlant.js so collection logic can find them
    // If a wrapper already exists (from addPlant.js or previous run), reuse it.
    let tableWrapper = document.getElementById('nutritional_table_wrapper');
    if (!tableWrapper) {
      tableWrapper = document.createElement('div');
      tableWrapper.id = 'nutritional_table_wrapper';
      tableWrapper.style.marginTop = '0.5rem';
    }

    // header controls for edit page: use same checkbox names as add form so addPlant.js responds
    const controls = document.createElement('div');
    controls.className = 'checkbox-group';
    controls.innerHTML = `
      <label><input type="checkbox" name="nutritional_text" id="texting_cb">เพิ่มใส่ข้อความ</label>
      <label><input type="checkbox" name="nutritional_table" id="table_cb">เพิ่มแถวตาราง</label>
    `;
    // remove any previous similar control to avoid duplicates
    const prevControls = tableWrapper.querySelector('.checkbox-group');
    if (prevControls) prevControls.remove();
    tableWrapper.appendChild(controls);

    // textarea for textual nutrition (hidden unless checked) - ensure single element
    let textArea = document.getElementById('nutritional_textarea_edit');
    if (!textArea) {
      textArea = document.createElement('textarea');
      textArea.id = 'nutritional_textarea_edit';
      textArea.rows = 3;
      textArea.placeholder = 'พิมพ์คำอธิบายทางโภชนาการที่นี่...';
    }
    textArea.style.display = 'none';
    // move/remove existing and append
    if (textArea.parentNode !== tableWrapper) tableWrapper.appendChild(textArea);

    // editable table container (used by edit UI)
    let editTableContainer = document.getElementById('nutritional_table_edit_container');
    if (!editTableContainer) {
      editTableContainer = document.createElement('div');
      editTableContainer.id = 'nutritional_table_edit_container';
    }
    editTableContainer.style.display = 'none';
    if (editTableContainer.parentNode !== tableWrapper) tableWrapper.appendChild(editTableContainer);

    // helper: render existing nutrition as a simple table (read-only) and also prepare editable defaults
    const renderExistingAsReadOnly = () => {
      const existingTable = document.querySelector('.nutritional_value');
      if (!existingTable) return;
      // Build header
      // determine variants (additional keys) — but we will keep simple 3-col view (name/unit/amount)
      let html = '<thead><tr><th>รายการ</th><th>หน่วย</th><th>amount</th></tr></thead><tbody>';
      nut.forEach(item => {
        html += '<tr>';
        html += `<td>${item.name ?? ''}</td>`;
        html += `<td>${item.unit ?? ''}</td>`;
        // find numeric-like value (amount) — try common keys 'amount', 'value'
        const amt = item.amount ?? item.value ?? '';
        html += `<td>${amt}</td>`;
        html += '</tr>';
      });
      html += '</tbody>';
      existingTable.innerHTML = html;
    };

    renderExistingAsReadOnly();

    // editable table implementation: simple 3-column editor with add/remove row
    const renderEditableTable = () => {
      editTableContainer.innerHTML = '';
      const tbl = document.createElement('table');
      tbl.className = 'nutritional_table_edit';
      const thead = document.createElement('thead');
      thead.innerHTML = '<tr><th>รายการ (name)</th><th>หน่วย (unit)</th><th>amount</th><th>แอคชัน</th></tr>';
      tbl.appendChild(thead);
      const tb = document.createElement('tbody');
      // preload with two empty rows
      for (let i = 0; i < 2; i++) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><input class="n_name" /></td><td><input class="n_unit" /></td><td><input class="n_amount" type="number" step="any" /></td><td><button class="rm">ลบ</button></td>`;
        tb.appendChild(tr);
      }
      tbl.appendChild(tb);
      const addRowBtn = document.createElement('button');
      addRowBtn.type = 'button';
      addRowBtn.textContent = 'เพิ่มแถว';
      addRowBtn.addEventListener('click', () => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><input class="n_name" /></td><td><input class="n_unit" /></td><td><input class="n_amount" type="number" step="any" /></td><td><button class="rm">ลบ</button></td>`;
        tb.appendChild(tr);
      });
      editTableContainer.appendChild(tbl);
      editTableContainer.appendChild(addRowBtn);

      // delegate remove (ensure single handler)
      editTableContainer.addEventListener('click', (ev) => {
        if (ev.target && ev.target.classList && ev.target.classList.contains('rm')) {
          const row = ev.target.closest('tr');
          if (row) row.remove();
        }
      });
    };

    // hook checkboxes
    // When controls change, toggle textarea/table. Also check/uncheck the equivalent checkboxes
    controls.querySelector('#texting_cb').addEventListener('change', (e) => {
      const checked = e.target.checked;
      textArea.style.display = checked ? 'block' : 'none';

      // insert two rows under the read-only nutritional_value table: first row key (คำอธิบาย) readonly, second row value editable
      const existingTable = document.querySelector('.nutritional_value');
      // remove previous helper rows if present
      const prevKeyRow = existingTable?.querySelector('tr[data-desc-key]');
      const prevValRow = existingTable?.querySelector('tr[data-desc-val]');
      if (prevKeyRow) prevKeyRow.remove();
      if (prevValRow) prevValRow.remove();

      if (checked && existingTable) {
        // ensure tbody exists
        let tb = existingTable.querySelector('tbody');
        if (!tb) {
          tb = document.createElement('tbody');
          existingTable.appendChild(tb);
        }
        // key row (non-editable)
        const keyTr = document.createElement('tr');
        keyTr.setAttribute('data-desc-key', '1');
        keyTr.innerHTML = `<td>คำอธิบาย</td><td colspan="2"></td>`;
        // value row (editable input spanning columns)
        const valTr = document.createElement('tr');
        valTr.setAttribute('data-desc-val', '1');
        const existingDesc = (nut.find(x => x && typeof x === 'object' && Object.keys(x).includes('คำอธิบาย')) || {})['คำอธิบาย'] || '';
        valTr.innerHTML = `<td colspan="3"><input id="nutritional_textarea_edit_input" type="text" placeholder="${existingDesc}" value="" style="width:100%" /></td>`;
        tb.appendChild(keyTr);
        tb.appendChild(valTr);

        // ensure regular textarea mirrors input (for addPlant's lookup of textarea id too)
        textArea.style.display = 'none';
      }

      // keep a hidden checkbox with name nutritional_text in the DOM so addPlant.js can detect it
      let cb = document.querySelector('input[name="nutritional_text"]');
      if (!cb) {
        cb = document.createElement('input'); cb.type = 'checkbox'; cb.name = 'nutritional_text'; cb.style.display = 'none';
        tableWrapper.appendChild(cb);
      }
      cb.checked = checked;
    });
    controls.querySelector('#table_cb').addEventListener('change', (e) => {
      editTableContainer.style.display = e.target.checked ? 'block' : 'none';
      if (e.target.checked) renderEditableTable();
      // create hidden checkbox nutritional_table for addPlant detection
      let cb = document.querySelector('input[name="nutritional_table"]');
      if (!cb) {
        cb = document.createElement('input'); cb.type = 'checkbox'; cb.name = 'nutritional_table'; cb.style.display = 'none';
        tableWrapper.appendChild(cb);
      }
      cb.checked = e.target.checked;
    });

    // If original JSON contains a "คำอธิบาย" object, show it in placeholder
    const descObj = nut.find(x => x && typeof x === 'object' && Object.keys(x).includes('คำอธิบาย'));
    if (descObj) {
      textArea.placeholder = descObj['คำอธิบาย'] || textArea.placeholder;
    }

    // insert tableWrapper right after the nutritional_value table
    const existingTable = document.querySelector('.nutritional_value');
    if (existingTable && existingTable.parentNode) {
      existingTable.parentNode.insertBefore(tableWrapper, existingTable.nextSibling);
    } else {
      // fallback: append to form
      const form = document.querySelector('.add-plant-form');
      if (form) form.appendChild(tableWrapper);
    }
  } catch (err) {
    console.error('populateEdit error:', err);
  }
});