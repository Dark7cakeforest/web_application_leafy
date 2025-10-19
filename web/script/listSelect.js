const el1 = document.querySelector('.separatePlant');  // การ์ดเลือกพืช
const el2 = document.querySelector('.allOfList');       // ตารางทั้งหมด
const el3 = document.querySelector('.selectedPlant');   // ตารางของพืชที่เลือก

function showPerPlant() {
  if (!el1 || !el2 || !el3) return;
  el1.style.display = 'inline-block';
  el2.style.display = 'none';
  el3.style.display = 'none';
}

function showAll() {
  if (!el1 || !el2 || !el3) return;
  el1.style.display = 'none';
  el2.style.display = 'inline-block';
  el3.style.display = 'none';
}

function showOne(classId) {
  if (!el1 || !el2 || !el3) return;
  el1.style.display = 'none';
  el2.style.display = 'none';
  el3.style.display = 'inline-block';

  // บรรทัดนี้เรียกให้ loadlist.js เติมตารางจาก classId ที่เลือก
  if (typeof loadPerPlantTable === 'function') {
    loadPerPlantTable(classId);
  }
}
