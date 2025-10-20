document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.add-plant-form');
    if (!form) return;

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
                    // insert after the checkbox element; use textCb.nextSibling which is a child of the same parent
                    textCb.parentNode.insertBefore(area, textCb.nextSibling);
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
                    // controls
                    const ctrl = document.createElement('div');
                    const addRowBtn = document.createElement('button'); addRowBtn.type='button'; addRowBtn.textContent='เพิ่มแถว';
                    const addColBtn = document.createElement('button'); addColBtn.type='button'; addColBtn.textContent='เพิ่มคอลัมน์';
                    const remRowBtn = document.createElement('button'); remRowBtn.type='button'; remRowBtn.textContent='ลบแถว';
                    const remColBtn = document.createElement('button'); remColBtn.type='button'; remColBtn.textContent='ลบคอลัมน์';
                    [addRowBtn, addColBtn, remRowBtn, remColBtn].forEach(b=>ctrl.appendChild(b));
                    wrapper.appendChild(ctrl);
                    const tbl = document.createElement('table'); tbl.className='nutritional_table_edit';
                    wrapper.appendChild(tbl);
                    // default table: header row: name, unit, amount and one data row
                    const thead = document.createElement('thead'); thead.innerHTML = '<tr><th>รายการ</th><th>หน่วย</th><th>amount</th></tr>';
                    // use inputs inside TD to make extraction reliable across browsers
                    const tbody = document.createElement('tbody'); tbody.innerHTML = '<tr><td><input type="text" class="n_name" /></td><td><input type="text" class="n_unit" /></td><td><input type="text" class="n_amount" /></td></tr>';
                    tbl.appendChild(thead); tbl.appendChild(tbody);

                    // attach handlers
                    addRowBtn.addEventListener('click', ()=>{
                        const r = document.createElement('tr'); r.innerHTML = '<td><input type="text" class="n_name" /></td><td><input type="text" class="n_unit" /></td><td><input type="text" class="n_amount" /></td>';
                        tbl.querySelector('tbody').appendChild(r);
                    });
                    remRowBtn.addEventListener('click', ()=>{
                        const rows = tbl.querySelectorAll('tbody tr'); if (rows.length>0) rows[rows.length-1].remove();
                    });
                    addColBtn.addEventListener('click', ()=>{
                        // add header cell and input cell to each row
                        const th = document.createElement('th'); th.textContent = 'col'; tbl.querySelector('thead tr').appendChild(th);
                        tbl.querySelectorAll('tbody tr').forEach(tr=>{ const td = document.createElement('td'); const inp = document.createElement('input'); inp.type='text'; td.appendChild(inp); tr.appendChild(td); });
                    });
                    remColBtn.addEventListener('click', ()=>{
                        const heads = tbl.querySelectorAll('thead th'); if (heads.length>0) heads[heads.length-1].remove();
                        tbl.querySelectorAll('tbody tr').forEach(tr=>{ const tds = tr.querySelectorAll('td'); if (tds.length>0) tds[tds.length-1].remove(); });
                    });

                    const formEl = document.querySelector('.add-plant-form');
                    if (formEl) formEl.appendChild(wrapper);
                }
                wrapper.style.display = tableCb.checked ? 'block' : 'none';
            }
        };

        // initialize UI
        ensureNutritionalUI();
        document.addEventListener('change', (e)=>{ if (e.target && (e.target.name==='nutritional_text' || e.target.name==='nutritional_table')) ensureNutritionalUI(); });

        // detect edit mode (edit.html opens with ?id=...)
        const params = new URLSearchParams(window.location.search);
        const editId = params.get('id');

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
                        rows.forEach(r => {
                            // prefer inputs with our classes
                            const inputName = r.querySelector('.n_name') || r.querySelector('input');
                            const inputUnit = r.querySelector('.n_unit') || (r.children[1] && r.children[1].querySelector('input'));
                            const inputAmount = r.querySelector('.n_amount') || (r.children[2] && r.children[2].querySelector('input'));
                            const nameVal = inputName ? (inputName.value || '').trim() : (r.children[0]?.textContent || '').trim();
                            const unitVal = inputUnit ? (inputUnit.value || '').trim() : (r.children[1]?.textContent || '').trim();
                            let amtVal = inputAmount ? (inputAmount.value || '').trim() : (r.children[2]?.textContent || '').trim();
                            if (!nameVal) return; // skip empty rows
                            // try to convert amount to number when possible
                            if (amtVal !== '') {
                                const n = Number(amtVal);
                                if (!Number.isNaN(n)) amtVal = n;
                            } else {
                                amtVal = '';
                            }
                            const obj = { name: nameVal, unit: unitVal, amount: amtVal };
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