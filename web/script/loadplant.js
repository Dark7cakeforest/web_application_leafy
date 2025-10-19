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
  return params.toString(); // '' ถ้าไม่กรอก
}

function bindDatepickReload(reloadFn) {
  const d1 = document.querySelector('.datepick');
  const d2 = document.querySelector('.datepick2');
  [d1, d2].forEach(el => el && el.addEventListener('change', reloadFn));
}

function renderCards(plants, aiResults, mode) {
  const containerMain = document.getElementById("plants");
  const statusEl = document.getElementById('status');
  containerMain.innerHTML = "";
  if (statusEl) statusEl.textContent = "";

  const pathname = window.location.pathname;
  const indexPage      = pathname.includes("index.html");
  const staticPage     = pathname.includes("static.html");
  const isListPage     = pathname.includes("list.html");
  const isEditPlantPage= pathname.includes("edit_plant.html");
  const isEditPage     = pathname.includes("edit.html");

  const aiMap = {};
  for (const r of aiResults) aiMap[r.class_id] = r;

  const createPlantCard = (plant) => {
    const container = document.createElement("div");
    container.className = "content";
    container.dataset.name = (plant.name || "").toLowerCase();
    container.dataset.classId = plant.class_id ?? '';

    const img = document.createElement("img");
    img.src = plant.image_leaf_path;
    img.alt = plant.name;
    img.width = 300;
    img.height = 300;

    const name = document.createElement("p");
    name.className = "plant-name";
    name.textContent = plant.name;

    container.appendChild(img);
    container.appendChild(name);
    return container;
  };

  // index/static: top 10 + แสดงสถิติ (อิงช่วงวันที่ที่เลือก)
  if (indexPage || staticPage) {
    const rankable = plants.filter(p => p.class_id !== null && p.class_id !== undefined);
    rankable.sort((a, b) => {
      const ca = aiMap[a.class_id]?.conclusion ?? 0;
      const cb = aiMap[b.class_id]?.conclusion ?? 0;
      if (cb !== ca) return cb - ca;
      return (a.class_id ?? 0) - (b.class_id ?? 0);
    });

    const topN = rankable.slice(0, 10);

    // ถ้าทั้งหมดของช่วงนี้ไม่มีการประมวลผลเลย ให้แจ้งสถานะ
    const totalConclusion = aiResults.reduce((s, r) => s + (r.conclusion || 0), 0);
    if (totalConclusion === 0 && statusEl) {
      statusEl.textContent = 'ไม่มีการประมวลผลในช่วงวันที่ที่คุณเลือก';
    }

    topN.forEach((plant, idx) => {
      const card = createPlantCard(plant);
      const rating = document.createElement("p");
      rating.className = "stamp";
      rating.textContent = String(idx + 1);
      card.insertBefore(rating, card.firstChild);

      const r = aiMap[plant.class_id];
      const correct = document.createElement("p");
      correct.className = "correct";
      const notcorrect = document.createElement("p");
      notcorrect.className = "not-correct";
      const conclusion = document.createElement("p");
      conclusion.className = "conclusion";

      if (r) {
        correct.textContent    = "ถูก " + r.correct + " %";
        notcorrect.textContent = "ผิด " + r.notcorrect + " %";
        conclusion.textContent = "จำนวนครั้งการประมวลผล: " + r.conclusion + " ครั้ง";
      } else {
        correct.textContent    = "ถูก 0 %";
        notcorrect.textContent = "ผิด 0 %";
        conclusion.textContent = "จำนวนครั้งการประมวลผล: 0 ครั้ง";
      }

      card.appendChild(correct);
      card.appendChild(notcorrect);
      card.appendChild(conclusion);
      containerMain.appendChild(card);
    });
    return;
  }

  // list.html: แสดงการ์ดเลือกพืช (กดแล้วไปตาราง perPlant)
  if (isListPage) {
    plants.forEach((plant, i) => {
      const card = createPlantCard(plant);
      card.id = `plant-${i}`;
      card.addEventListener("click", () => {
        const cid = plant.class_id;
        if (typeof showOne === "function") {
          showOne(cid); // ส่ง class_id ให้ตาราง perPlant
        }
      });
      containerMain.appendChild(card);
    });
    return;
  }

  // edit_*: แสดงการ์ด + ปุ่มเดิม
  if (isEditPlantPage || isEditPage) {
    plants.forEach((plant, i) => {
      const card = createPlantCard(plant);
      card.id = `plant-${i}`;

      const editButton = document.createElement("button");
      editButton.className = "edit-btn";
      editButton.textContent = "แก้ไข";
      editButton.onclick = () => {
        window.location.href = `edit.html?id=${plant.plant_id}`;
      };

      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-btn";
      deleteButton.textContent = "ลบ";
      deleteButton.onclick = async () => {
        // keep protection: do not allow deleting plants that are mapped to a class
        if (plant.class_id !== null && plant.class_id !== undefined) {
          alert("ไม่สามารถลบพืชที่ถูกแมปกับ class แล้วได้ (class_id != null)");
          return;
        }
        if (!confirm("คุณต้องการลบใช่หรือไม่?")) return;

        try {
          const token = localStorage.getItem('jwt') || localStorage.getItem('token') || localStorage.getItem('accessToken');
          const res = await fetch(`http://localhost:3001/api/delete/${plant.plant_id}`, {
            method: "DELETE",
            headers: token ? { "Authorization": "Bearer " + token } : {}
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || err.msg || 'Delete failed');
          }

          await res.json();
          alert("ลบข้อมูลเรียบร้อย");
          location.reload();
        } catch (err) {
          console.error("Error deleting:", err);
          alert('Delete failed: ' + err.message);
        }
      };

      card.appendChild(editButton);
      card.appendChild(deleteButton);
      containerMain.appendChild(card);
    });
    return;
  }

  // หน้าอื่น: รายการพื้นฐาน
  plants.forEach((plant, i) => {
    const card = createPlantCard(plant);
    card.id = `plant-${i}`;
    containerMain.appendChild(card);
  });
}

// ===== main load (ครั้งแรก + เมื่อเปลี่ยนวันที่) =====
function reloadAll() {
  const qs = getDateParams();
  const aiURL = 'http://localhost:3001/api/ai_results' + (qs ? ('?' + qs) : '');
  Promise.all([
    fetch('http://localhost:3001/api/read').then(r => r.json()),
    fetch(aiURL).then(r => r.json())
  ])
  .then(([plantResp, aiResp]) => {
    const plants = plantResp.plant || [];
    const aiResults = aiResp.ai_result || [];
    renderCards(plants, aiResults);
  })
  .catch((error) => {
    console.error("Error fetching data:", error);
  });
}

reloadAll();
bindDatepickReload(reloadAll);

