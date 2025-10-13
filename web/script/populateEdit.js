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
            // แสดงเป็น placeholder แทน value
            el.value = '';                 // ช่องว่างให้พิมพ์ทับ
            el.placeholder = v;            // โชว์ค่าเดิมเป็น placeholder
            el.setAttribute('aria-label', el.placeholder);
        } else {
            el.textContent = v;
        }
    };

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

    // Build nutritional table from JSON
    let nut = plant.nutritional_value;
    if (typeof nut === 'string') {
      try { nut = JSON.parse(nut); } catch (e) { nut = []; }
    }
    if (!Array.isArray(nut) || nut.length === 0) {
      // nothing to show — leave the existing static table or clear it
      return;
    }

    // collect variant keys (all keys except 'name' and 'unit')
    const variantSet = new Set();
    nut.forEach(item => {
      Object.keys(item).forEach(k => {
        if (k !== 'name' && k !== 'unit') variantSet.add(k);
      });
    });
    const variants = Array.from(variantSet);

    // build table HTML: header (รายการ / หน่วย / variants...) and rows for each item
    let html = '<thead><tr><th>รายการ</th><th>หน่วย</th>';
    variants.forEach(v => { html += `<th>${v}</th>`; });
    html += '</tr></thead>';
    html += '<tbody>';
    nut.forEach(item => {
      html += '<tr>';
      html += `<td>${item.name ?? ''}</td>`;
      html += `<td>${item.unit ?? ''}</td>`;
      variants.forEach(v => {
        const cell = (typeof item[v] !== 'undefined' && item[v] !== null) ? item[v] : '';
        html += `<td>${cell}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody>';

    const table = document.querySelector('.nutritional_value');
    if (table) {
      table.innerHTML = html;
    }
  } catch (err) {
    console.error('populateEdit error:', err);
  }
});