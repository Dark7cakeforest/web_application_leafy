function getDateParams() {// ดึงค่าจาก datepickers แล้วแปลงเป็น query string
  const d1 = document.querySelector('.datepick')?.value || '';
  const d2 = document.querySelector('.datepick2')?.value || '';
  const params = new URLSearchParams();

  if (d1 && !d2) params.set('date', d1);
  if (!d1 && d2) params.set('date', d2);
  if (d1 && d2) {
    let start = d1, end = d2;
    if (new Date(end) < new Date(start)) { const t = start; start = end; end = t; }
    params.set('start', start);
    params.set('end', end);
  }
  return params.toString();
}

function renderRows(tbodyId, rows) {// แสดงผลลัพธ์ลงตาราง
  let trHTML = '';
  for (let i = 0; i < rows.length; i++) {
    const o = rows[i];
    trHTML += '<tr>';
    trHTML += `<td><a>${i + 1}</a></td>`;
    trHTML += `<td><a>${o.class_label}</a></td>`;
    trHTML += `<td><a>${o.processed_time}</a></td>`;
    trHTML += `<td><button onclick="window.location.href='detail.html?result_id=${o.result_id}'">แก้ไข</button></td>`;
    trHTML += '</tr>';
  }
  document.getElementById(tbodyId).innerHTML = trHTML;
}

// โหมด "ทั้งหมด"
function loadAllTable() {
  const qs = getDateParams();
  const url = '/api/results' + (qs ? ('?' + qs) : '');
  fetch(url)
    .then(r => r.json())
    .then(data => {
      const list = data.ai_result || [];
      renderRows('queryAllResult', list);
    })
    .catch(err => console.error("Error fetching result data:", err));
}

// โหมด "พืชชนิดนั้น" เมื่อคลิกการ์ด: รับ class_id แล้ว filter
function loadPerPlantTable(classId) {
  const qs = getDateParams();
  const url = '/api/results' + (qs ? ('?' + qs) : '');
  fetch(url)
    .then(r => r.json())
    .then(data => {
      let list = data.ai_result || [];
      list = list.filter(x => String(x.class_id) === String(classId));
      renderRows('plantSelect', list);
    })
    .catch(err => console.error("Error fetching result data:", err));
}

// เริ่มต้นหน้า: ยังไม่กรองวันที่ ให้ดึงทั้งหมด (all mode ไม่ filter)
function initList() {
  // เติมโหมดทั้งหมดเป็นค่าเริ่มต้นตาราง "ทั้งหมด"
  loadAllTable();

  // ผูก dropdown
  const dd = document.getElementById('dateperiod');
  if (dd) {
    dd.addEventListener('change', (e) => {
      if (e.target.value === 'all') {
        showAll();
        loadAllTable();
      } else {
        showPerPlant();
        // ผู้ใช้ต้องคลิกการ์ดเพื่อเลือกพืช จึงยังไม่โหลดอะไรที่ตาราง perPlant ตอนนี้
      }
    });
  }

  // ผูก datepicker ให้รีเฟรชตารางตามโหมด
  const d1 = document.querySelector('.datepick');
  const d2 = document.querySelector('.datepick2');
  const onDateChange = () => {
    if (dd?.value === 'all') {
      loadAllTable();
    } else {
      // ถ้าอยู่โหมด perPlant และผู้ใช้เลือกพืชไปแล้ว ให้รีเฟรชใหม่ (เก็บ classId ล่าสุดไว้ชั่วคราว)
      const last = window.__lastClassIdForPerPlant;
      if (last) loadPerPlantTable(last);
    }
  };
  [d1, d2].forEach(el => el && el.addEventListener('change', onDateChange));

  // เก็บ classId ล่าสุดเมื่อ user เลือกการ์ด (hook จาก showOne)
  window.loadPerPlantTable = function(cid) {
    window.__lastClassIdForPerPlant = cid;
    loadPerPlantTableInternal(cid);
  };
  function loadPerPlantTableInternal(cid) {
    const qs = getDateParams();
  const url = '/api/results' + (qs ? ('?' + qs) : '');
    fetch(url)
      .then(r => r.json())
      .then(data => {
        let list = data.ai_result || [];
        list = list.filter(x => String(x.class_id) === String(cid));
        renderRows('plantSelect', list);
      })
      .catch(err => console.error("Error fetching result data:", err));
  }
}

// สำหรับการ์ดเดิมที่เรียก showOne(cid)
window.loadPerPlantTable = loadPerPlantTable;

// เริ่มทำงาน
initList();

