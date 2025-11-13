const el1 = document.querySelector('.separatePlant');  // การ์ดเลือกพืช
const el2 = document.querySelector('.allOfList');       // ตารางทั้งหมด
const el3 = document.querySelector('.selectedPlant');   // ตารางของพืชที่เลือก
const pagAll = document.getElementById('pagination-queryAllResult');
const pagPerPlant = document.getElementById('pagination-plantSelect');

function hidePagination(el) {
  if (el) el.style.display = 'none';
}

function showPerPlant() {
  if (!el1 || !el2 || !el3) return;
  el1.style.display = 'inline-block';
  el2.style.display = 'none';
  el3.style.display = 'none';
  hidePagination(pagAll);
  hidePagination(pagPerPlant);
  const dropdown = document.getElementById('dateperiod');
  if (dropdown) {
    dropdown.value = 'perPlant';
  }
}

function showAll() {
  if (!el1 || !el2 || !el3) return;
  el1.style.display = 'none';
  el2.style.display = 'inline-block';
  el3.style.display = 'none';
  hidePagination(pagPerPlant);
  const dropdown = document.getElementById('dateperiod');
  if (dropdown) {
    dropdown.value = 'all';
  }
}

function showOne(classId) {
  if (!el1 || !el2 || !el3) return;
  el1.style.display = 'none';
  el2.style.display = 'none';
  el3.style.display = 'inline-block';
  hidePagination(pagAll);

  // บรรทัดนี้เรียกให้ loadlist.js เติมตารางจาก classId ที่เลือก
  if (typeof loadPerPlantTable === 'function') {
    loadPerPlantTable(classId);
  }
}
