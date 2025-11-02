document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return;

  try {
  const res = await fetch(`/api/read/${id}`);
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

    // Get all unique keys from nutritional data (excluding 'name' and 'unit')
    const getAllKeys = (arr) => {
      const keys = new Set();
      arr.forEach(item => {
        if (item && typeof item === 'object') {
          Object.keys(item).forEach(k => {
            if (k !== 'name' && k !== 'unit') keys.add(k);
          });
        }
      });
      return Array.from(keys);
    };

    // Get existing checkbox-group from HTML
    const checkboxGroup = document.querySelector('.checkbox-group');
    if (!checkboxGroup) {
      console.error('checkbox-group not found in HTML');
      return;
    }

    // helper: render existing nutrition as a table (read-only) with dynamic columns
    const renderExistingAsReadOnly = () => {
      const existingTable = document.querySelector('.nutritional_value');
      if (!existingTable) return;

      // Separate description entries from regular data
      const descEntries = nut.filter(x => x && typeof x === 'object' && Object.keys(x).includes('คำอธิบาย'));
      const dataEntries = nut.filter(x => !(x && typeof x === 'object' && Object.keys(x).includes('คำอธิบาย')));
      
      // Get unique columns from data
      const additionalKeys = getAllKeys(dataEntries);
      
      // Build header: name first, then numeric columns, unit last
      let html = '<thead><tr><th>รายการ</th>';
      additionalKeys.forEach(k => {
        html += `<th>${k}</th>`;
      });
      html += '<th>หน่วย</th></tr></thead><tbody>';
      
      // Add description rows first if they exist
      descEntries.forEach(desc => {
        const descKey = Object.keys(desc).find(k => k === 'คำอธิบาย');
        if (descKey) {
          html += '<tr>';
          html += `<td>${descKey}</td>`;
          html += `<td colspan="${additionalKeys.length + 1}">${desc[descKey]}</td>`;
          html += '</tr>';
        }
      });
      
      // Add data rows
      dataEntries.forEach(item => {
        html += '<tr>';
        html += `<td>${item.name ?? ''}</td>`;
        // Add numeric columns in middle
        additionalKeys.forEach(k => {
          html += `<td>${item[k] ?? ''}</td>`;
        });
        html += `<td>${item.unit ?? ''}</td>`;
        html += '</tr>';
      });
      html += '</tbody>';
      existingTable.innerHTML = html;
    };

    renderExistingAsReadOnly();

    // editable table container
    let editTableContainer = document.getElementById('nutritional_table_edit_container');
    if (!editTableContainer) {
      editTableContainer = document.createElement('div');
      editTableContainer.id = 'nutritional_table_edit_container';
      editTableContainer.style.display = 'none';
      const form = document.querySelector('.add-plant-form');
      const buttonDiv = form?.querySelector('.form-add-btn')?.closest('div');
      if (form && buttonDiv && buttonDiv.parentNode) {
        buttonDiv.parentNode.insertBefore(editTableContainer, buttonDiv);
      } else if (form) {
        form.appendChild(editTableContainer);
      }
    }

    // editable table implementation with dynamic columns
    const renderEditableTable = () => {
      editTableContainer.innerHTML = '';
      
      const tbl = document.createElement('table');
      tbl.className = 'nutritional_table_edit';
      const thead = document.createElement('thead');
      const tb = document.createElement('tbody');
      
      // Get existing columns from data
      const additionalKeys = getAllKeys(nut);
      
      // Build header
      let headerHtml = '<tr><th>รายการ</th>';
      additionalKeys.forEach(k => {
        headerHtml += `<th>${k}<button class="rm-col" data-col="${k}">×</button></th>`;
      });
      headerHtml += '<th>หน่วย</th><th>แอคชัน</th></tr>';
      thead.innerHTML = headerHtml;
      tbl.appendChild(thead);
      
      // Preload with two empty rows
      for (let i = 0; i < 2; i++) {
        const tr = document.createElement('tr');
        let rowHtml = '<td><input type="text" class="n_name" /></td>';
        additionalKeys.forEach(k => {
          rowHtml += `<td><input type="text" class="n_col_${k}" /></td>`;
        });
        rowHtml += '<td><input type="text" class="n_unit" /></td>';
        rowHtml += '<td><button class="rm">ลบ</button></td>';
        tr.innerHTML = rowHtml;
        tb.appendChild(tr);
      }
      tbl.appendChild(tb);
      editTableContainer.appendChild(tbl);
      
      // Button controls
      const btnContainer = document.createElement('div');
      btnContainer.style.textAlign = 'center';
      btnContainer.style.marginTop = '0.5rem';
      
      const addRowBtn = document.createElement('button');
      addRowBtn.type = 'button';
      addRowBtn.textContent = 'เพิ่มแถว';
      addRowBtn.style.margin = '0 0.25rem';
      
      const addColBtn = document.createElement('button');
      addColBtn.type = 'button';
      addColBtn.textContent = 'เพิ่มคอลัมน์';
      addColBtn.style.margin = '0 0.25rem';
      
      btnContainer.appendChild(addRowBtn);
      btnContainer.appendChild(addColBtn);
      editTableContainer.appendChild(btnContainer);
      
      // Add row handler
      addRowBtn.addEventListener('click', () => {
        const tr = document.createElement('tr');
        let rowHtml = '<td><input type="text" class="n_name" /></td>';
        additionalKeys.forEach(k => {
          rowHtml += `<td><input type="text" class="n_col_${k}" /></td>`;
        });
        rowHtml += '<td><input type="text" class="n_unit" /></td>';
        rowHtml += '<td><button class="rm">ลบ</button></td>';
        tr.innerHTML = rowHtml;
        tb.appendChild(tr);
      });
      
      // Add column handler
      addColBtn.addEventListener('click', () => {
        const colName = prompt('ชื่อคอลัมน์ใหม่:');
        if (!colName || colName.trim() === '') return;
        const trimmedName = colName.trim();
        if (additionalKeys.includes(trimmedName)) {
          alert('มีคอลัมน์นี้อยู่แล้ว');
          return;
        }
        additionalKeys.push(trimmedName);
        
        // Update header
        const headerRow = thead.querySelector('tr');
        const secondToLast = headerRow.children[headerRow.children.length - 2];
        const newHeader = document.createElement('th');
        newHeader.innerHTML = `${trimmedName}<button class="rm-col" data-col="${trimmedName}">×</button>`;
        headerRow.insertBefore(newHeader, secondToLast);
        
        // Add column to all rows
        tb.querySelectorAll('tr').forEach(tr => {
          const secondToLast = tr.children[tr.children.length - 2];
          const newCell = document.createElement('td');
          const inp = document.createElement('input');
          inp.type = 'text';
          inp.className = `n_col_${trimmedName}`;
          newCell.appendChild(inp);
          tr.insertBefore(newCell, secondToLast);
        });
      });
      
      // Remove row handler (delegate)
      editTableContainer.addEventListener('click', (ev) => {
        if (ev.target && ev.target.classList.contains('rm')) {
          const row = ev.target.closest('tr');
          if (row && tb.querySelectorAll('tr').length > 1) {
            row.remove();
          } else {
            alert('ต้องมีอย่างน้อย 1 แถว');
          }
        } else if (ev.target && ev.target.classList.contains('rm-col')) {
          const colName = ev.target.getAttribute('data-col');
          if (!colName || colName === 'name' || colName === 'unit') {
            alert('ไม่สามารถลบคอลัมน์นี้ได้');
            return;
          }
          const index = additionalKeys.indexOf(colName);
          if (index > -1) additionalKeys.splice(index, 1);
          
          // Remove column header
          const headerRow = thead.querySelector('tr');
          headerRow.querySelectorAll('th').forEach(th => {
            if (th.textContent.includes(colName)) th.remove();
          });
          
          // Remove column from all rows
          tb.querySelectorAll('tr').forEach(tr => {
            tr.querySelectorAll('td').forEach((td, idx) => {
              const inp = td.querySelector(`.n_col_${colName}`);
              if (inp) td.remove();
            });
          });
        }
      });
    };

    // Hook existing checkboxes
    const textCb = checkboxGroup.querySelector('input[name="nutritional_text"]');
    const tableCb = checkboxGroup.querySelector('input[name="nutritional_table"]');

    if (textCb) {
      textCb.addEventListener('change', (e) => {
        const checked = e.target.checked;
        
        // Insert description rows into read-only table
        const existingTable = document.querySelector('.nutritional_value');
        const prevKeyRow = existingTable?.querySelector('tr[data-desc-key]');
        const prevValRow = existingTable?.querySelector('tr[data-desc-val]');
        if (prevKeyRow) prevKeyRow.remove();
        if (prevValRow) prevValRow.remove();

        if (checked && existingTable) {
          let tb = existingTable.querySelector('tbody');
          if (!tb) {
            tb = document.createElement('tbody');
            existingTable.appendChild(tb);
          }
          const keyTr = document.createElement('tr');
          keyTr.setAttribute('data-desc-key', '1');
          const additionalKeys = getAllKeys(nut);
          keyTr.innerHTML = `<td>คำอธิบาย</td><td colspan="${additionalKeys.length + 1}"></td>`;
          const valTr = document.createElement('tr');
          valTr.setAttribute('data-desc-val', '1');
          const existingDesc = (nut.find(x => x && typeof x === 'object' && Object.keys(x).includes('คำอธิบาย')) || {})['คำอธิบาย'] || '';
          valTr.innerHTML = `<td colspan="${additionalKeys.length + 2}"><input id="nutritional_textarea_edit_input" type="text" placeholder="${existingDesc}" value="" style="width:100%" /></td>`;
          tb.appendChild(keyTr);
          tb.appendChild(valTr);
        }
      });
    }

    if (tableCb) {
      tableCb.addEventListener('change', (e) => {
        editTableContainer.style.display = e.target.checked ? 'block' : 'none';
        if (e.target.checked) renderEditableTable();
      });
    }
  } catch (err) {
    console.error('populateEdit error:', err);
  }
});
