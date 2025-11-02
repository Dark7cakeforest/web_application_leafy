document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.add-plant-form');
    if (!form) return;

    // Check if we're on edit.html page - if so, skip UI initialization (populateEdit.js handles it)
    const isEditPage = window.location.pathname.includes('edit.html');
    const hasEditId = new URLSearchParams(window.location.search).get('id');
    
    // ---- nutritional_text / nutritional_table (UI) ----
    const ensureNutritionalUI = () => {
        // show textarea when checkbox nutritional_text is present and checked
        const textCb = document.querySelector('input[name="nutritional_text"]');
        if (textCb) {
            let area = document.getElementById('nutritional_textarea');
            if (!area) {
                area = document.createElement('textarea');
                area.id = 'nutritional_textarea';
                area.placeholder = 'คำอธิบาย';
                // insert after the checkbox-group div
                const checkboxGroup = textCb.closest('.checkbox-group');
                if (checkboxGroup && checkboxGroup.parentNode) {
                    checkboxGroup.parentNode.insertBefore(area, checkboxGroup.nextSibling);
                } else {
                    textCb.parentNode.insertBefore(area, textCb.nextSibling);
                }
            }
            area.style.display = textCb.checked ? 'block' : 'none';
        }

        // show table when checkbox nutritional_table is present and checked
        const tableCb = document.querySelector('input[name="nutritional_table"]');
        if (tableCb) {
            let wrapper = document.getElementById('nutritional_table_wrapper');
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.id = 'nutritional_table_wrapper';
                
                const tbl = document.createElement('table');
                tbl.className = 'nutritional_table_edit';
                const thead = document.createElement('thead');
                const tb = document.createElement('tbody');
                
                // Additional columns array
                const additionalKeys = [];
                
                // Default header
                let headerHtml = '<tr><th>รายการ</th>';
                headerHtml += '<th>หน่วย</th><th>แอคชัน</th></tr>';
                thead.innerHTML = headerHtml;
                tbl.appendChild(thead);
                
                // Preload with 2 empty rows
                for (let i = 0; i < 2; i++) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = '<td><input type="text" class="n_name" /></td><td><input type="text" class="n_unit" /></td><td><button class="rm">ลบ</button></td>';
                    tb.appendChild(tr);
                }
                tbl.appendChild(tb);
                wrapper.appendChild(tbl);
                
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
                wrapper.appendChild(btnContainer);

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
                    
                    const headerRow = thead.querySelector('tr');
                    const secondToLast = headerRow.children[headerRow.children.length - 2];
                    const newHeader = document.createElement('th');
                    newHeader.innerHTML = `${trimmedName}<button class="rm-col" data-col="${trimmedName}">×</button>`;
                    headerRow.insertBefore(newHeader, secondToLast);
                    
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
                
                // Remove handler (delegate)
                wrapper.addEventListener('click', (ev) => {
                    if (ev.target && ev.target.classList.contains('rm')) {
                        const row = ev.target.closest('tr');
                        if (row && tb.querySelectorAll('tr').length > 1) {
                            row.remove();
                        } else {
                            alert('ต้องมีอย่างน้อย 1 แถว');
                        }
                    } else if (ev.target && ev.target.classList.contains('rm-col')) {
                        const colName = ev.target.getAttribute('data-col');
                        const index = additionalKeys.indexOf(colName);
                        if (index > -1) additionalKeys.splice(index, 1);
                        
                        const headerRow = thead.querySelector('tr');
                        headerRow.querySelectorAll('th').forEach(th => {
                            if (th.textContent.includes(colName)) th.remove();
                        });
                        
                        tb.querySelectorAll('tr').forEach(tr => {
                            tr.querySelectorAll('td').forEach(td => {
                                const inp = td.querySelector(`.n_col_${colName}`);
                                if (inp) td.remove();
                            });
                        });
                    }
                });

                const checkboxGroup = tableCb.closest('.checkbox-group');
                if (checkboxGroup && checkboxGroup.parentNode) {
                    checkboxGroup.parentNode.insertBefore(wrapper, checkboxGroup.nextSibling);
                } else {
                    const formEl = document.querySelector('.add-plant-form');
                    if (formEl) formEl.appendChild(wrapper);
                }
            }
            wrapper.style.display = tableCb.checked ? 'block' : 'none';
        }
    };

    // initialize UI only if not on edit.html (populateEdit.js handles edit page)
    if (!isEditPage || !hasEditId) {
        ensureNutritionalUI();
        document.addEventListener('change', (e)=>{ if (e.target && (e.target.name==='nutritional_text' || e.target.name==='nutritional_table')) ensureNutritionalUI(); });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

    // Accept multiple possible keys (legacy): prefer 'jwt'
    const token = localStorage.getItem('jwt') || localStorage.getItem('token') || localStorage.getItem('accessToken');
        if (!token) {
            alert('Unauthorized. Please log in.');
            return;
        }

        const imageInput = document.getElementById('image');
        const file = imageInput && imageInput.files && imageInput.files[0];

        // helper to obtain value either by id or by class (edit.html uses classes)
        const getVal = (id, cls) => {
            const byId = document.getElementById(id);
            if (byId) return (byId.value || '').trim();
            const byClass = document.querySelector(cls);
            return byClass ? (byClass.value || '').trim() : '';
        };

        try {
            let imagePath = '';
            if (file) {
                const fd = new FormData();
                fd.append('image', file);

                const upRes = await fetch('/api/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: fd
                });

                if (!upRes.ok) {
                    const err = await upRes.json().catch(() => ({}));
                    throw new Error(err.error || err.msg || 'Image upload failed');
                }

                const upJson = await upRes.json();
                imagePath = upJson.imagePath || '';
            }

            // build nutritional_value JSON array from optional UI elements
            const nutritional_value = [];
            // existing JSON from original plant (if editing) should be preserved first
            const orig = window.__originalPlant && window.__originalPlant.nutritional_value ? window.__originalPlant.nutritional_value : null;
            if (Array.isArray(orig)) nutritional_value.push(...orig);

            // textual description (from add form or edit form)
            // textual description: accept either add-form textarea, edit textarea, or the single-line edit input used by populateEdit
            const descArea = document.getElementById('nutritional_textarea') || document.getElementById('nutritional_textarea_edit') || document.getElementById('nutritional_textarea_edit_input');
            if (descArea && descArea.value && descArea.value.trim()) {
                const obj = { "คำอธิบาย": descArea.value.trim() };
                nutritional_value.push(obj);
            }

            // table entries (from add form or edit form)
            const tableWrapper = document.getElementById('nutritional_table_wrapper') || document.getElementById('nutritional_table_edit_container');
            if (tableWrapper) {
                    // prefer a table with class 'nutritional_table_edit' (edit page) or any table inside wrapper
                    const tbl = tableWrapper.querySelector('table.nutritional_table_edit') || tableWrapper.querySelector('table');
                    if (tbl) {
                        const rows = tbl.querySelectorAll('tbody tr');
                        // Get all columns from header
                        const headers = tbl.querySelectorAll('thead th');
                        const columns = [];
                        headers.forEach((th, idx) => {
                            const colText = th.textContent.trim().replace('×', '').trim();
                            if (colText !== 'รายการ' && colText !== 'แอคชัน' && colText !== 'หน่วย') {
                                columns.push({
                                    index: idx,
                                    name: colText,
                                    className: 'n_col_' + colText
                                });
                            }
                        });
                        
                        rows.forEach(r => {
                            const inputName = r.querySelector('.n_name');
                            const inputUnit = r.querySelector('.n_unit');
                            const nameVal = inputName ? (inputName.value || '').trim() : '';
                            if (!nameVal) return; // skip empty rows
                            
                            const obj = {};
                            obj.name = nameVal;
                            
                            // Add dynamic columns
                            columns.forEach(col => {
                                const colInput = r.querySelector(`.${col.className}`) || 
                                                (r.children[col.index] && r.children[col.index].querySelector('input'));
                                let colVal = colInput ? (colInput.value || '').trim() : '';
                                // try to convert to number when possible
                                if (colVal !== '') {
                                    const n = Number(colVal);
                                    if (!Number.isNaN(n)) colVal = n;
                                }
                                if (colVal !== '') {
                                    obj[col.name] = colVal;
                                }
                            });
                            
                            const unitVal = inputUnit ? (inputUnit.value || '').trim() : '';
                            if (unitVal) obj.unit = unitVal;
                            
                            nutritional_value.push(obj);
                        });
                    }
            }

            const payload = {
                // only include image_leaf_path when available
                ...(imagePath ? { image_leaf_path: imagePath } : {}),
                name: getVal('name', '.name'),
                common_name: getVal('common_name', '.common_name'),
                scientific_name: getVal('scientific_name', '.scientific_name'),
                family: getVal('family', '.family'),
                medicinal_benefits: getVal('medicinal_benefits', '.medicinal_benefits'),
                nutritional_benefits: getVal('nutritional_benefits', '.nutritional_benefits'),
                nutritional_value: nutritional_value
            };

            // debug: log collected nutritional_value
            console.debug('Collected nutritional_value:', nutritional_value);

            // if either checkbox is checked, ensure we actually have at least one nutritional item
            const textCb = document.querySelector('input[name="nutritional_text"]');
            const tableCb = document.querySelector('input[name="nutritional_table"]');
            if ((textCb && textCb.checked) || (tableCb && tableCb.checked)) {
                if (!nutritional_value || nutritional_value.length === 0) {
                    alert('คุณได้เลือกที่จะเพิ่มข้อมูลคุณค่าทางโภชนาการ แต่ยังไม่มีรายการ กรุณาเพิ่มอย่างน้อยหนึ่งรายการ');
                    return;
                }
            }

            // detect edit mode (edit.html opens with ?id=...)
            const params = new URLSearchParams(window.location.search);
            const editId = params.get('id');

            // merge with original plant: only send fields that have non-empty values to avoid overwriting
            // accepts (orig, updates) and returns merged object where `updates` override `orig` but empty strings do not overwrite
            const mergePayload = (orig = {}, updates = {}) => {
                const out = {};
                // start with original values
                Object.keys(orig).forEach(k => { out[k] = orig[k]; });
                // apply updates but skip empty string values
                Object.keys(updates).forEach(k => {
                    const v = updates[k];
                    if (v === undefined || v === null) return;
                    if (typeof v === 'string') {
                        if (v !== '') out[k] = v; // only overwrite with non-empty string
                    } else {
                        out[k] = v;
                    }
                });
                return out;
            };

            if (editId) {
                // UPDATE path
                const origPlant = window.__originalPlant || {};
                const sendPayload = mergePayload(origPlant, payload);
                const res = await fetch(`/api/update/${encodeURIComponent(editId)}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(sendPayload)
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || err.msg || 'Update failed');
                }

                await res.json();
                alert('Updated successfully');
                // after edit, go back to edit_plant listing
                window.location.href = './edit_plant.html';
                return;
            }

            // INSERT path (original behaviour)
            // Basic validation: require a name
            if (!payload.name || payload.name.trim() === '') {
                alert('Please provide a plant name.');
                return;
            }
            console.debug('Sending payload to /api/insert:', payload);
            const res = await fetch('/api/insert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                // try to extract JSON or plain text error body for better diagnostics
                let errBody = null;
                try { errBody = await res.json(); } catch(e) { try { errBody = await res.text(); } catch(e2) { errBody = '<unreadable response>'; } }
                console.error('Insert failed, status:', res.status, 'body:', errBody);
                throw new Error((errBody && (errBody.error || errBody.msg || JSON.stringify(errBody))) || `Insert failed (status ${res.status})`);
            }

            await res.json();
            alert('Saved successfully');
            // close modal if present
            const overlay = document.getElementById('addPlantOverlay');
            if (overlay) {
                overlay.classList.remove('show');
                overlay.setAttribute('aria-hidden','true');
                document.body.classList.remove('modal-open');
            }
            // reload page
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('Error: ' + err.message);
        }
    });
});
