// script/filter.js   (กรองการ์ดที่ #plants .content)
(function () {
  const input = document.querySelector('.search'); 
  const container = document.getElementById('plants');
  const statusEl = document.getElementById('status');

  if (!input) {
    console.warn('ไม่พบ input.search - ใส่ class="search" ให้ช่องค้นหาใน navbar.html');
    return;
  }
  if (!container) {
    console.warn('ไม่พบ #plants บนหน้านี้');
    return;
  }

  function doFilter() {
    const q = (input.value || '').trim().toLowerCase();
    const cards = container.querySelectorAll('.content');
    let shown = 0;

    cards.forEach(card => {
      // ใช้ data-name ที่เราตั้งไว้; ถ้าไม่มี fallback ไปอ่านจาก .plant-name หรือ textContent
      const text = (card.dataset.name 
                    || card.querySelector('.plant-name')?.textContent 
                    || card.textContent || '')
                    .toLowerCase();

      const match = !q || text.includes(q);
      card.style.display = match ? '' : 'none';
      if (match) shown++;
    });

    if (statusEl) statusEl.textContent = shown ? '' : 'ไม่พบรายการ';
  }

  // กรองทุกครั้งที่พิมพ์
  input.addEventListener('input', doFilter);

  // กรองรอบแรกหลัง navbar โหลดแล้ว (การ์ดอาจมาทีหลังจาก loadplant.js)
  window.addEventListener('load', doFilter);

  // เผื่อกรณีการ์ดเพิ่งถูกเติมเข้ามาทีหลัง (เช่นจาก loadplant.js)
  // จะเรียกกรองอีกครั้งหลัง DOM เปลี่ยนเล็กน้อย
  const mo = new MutationObserver(() => doFilter());
  mo.observe(container, { childList: true, subtree: false });
})();
