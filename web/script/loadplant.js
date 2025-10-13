fetch('http://localhost:3001/api/read')
  .then((response) => response.json())
  .then((responseData) => {
    console.log('responseData', responseData);
    const plants = responseData.plant;
    const containerMain = document.getElementById("plants");

    containerMain.innerHTML = "";
    const indexPage = window.location.pathname.includes("index.html");
    const staticPage = window.location.pathname.includes("static.html");
    const isEditPage = window.location.pathname.includes("edit_plant.html");
    const islistPage = window.location.pathname.includes("list.html");

    // Only fetch AI results for index, static, or list page
    if (indexPage || staticPage || islistPage) {
      fetch('http://localhost:3001/api/ai_results')
        .then((response) => response.json())
        .then((aiData) => {
          const ai_results = aiData.ai_result;

          for (let i = 0; i < plants.length; i++) {
            // Limit to 10 items for index and static page
            if ((indexPage || staticPage) && i >= 10) break;

            const plant = plants[i];
            const container = document.createElement("div");
            container.className = "content";
            container.id = `plant-${i}`;

            // Show stamp only on index or static page
            if (indexPage || staticPage) {
              const rating = document.createElement("p");
              rating.className = "stamp";
              rating.textContent = `${i + 1}`;
              container.appendChild(rating);
            }

            if (islistPage) {
              container.addEventListener("click", () => {
                showOne(`id=${plant.plant_id}`);
              });
            }

            const img = document.createElement("img");
            img.src = plant.image_leaf_path;
            img.alt = plant.name;
            img.width = 300;
            img.height = 300;

            const name = document.createElement("p");
            name.className = "plant-name";
            name.textContent = plant.name;

            container.dataset.name = (plant.name || "").toLowerCase();
            container.appendChild(img);
            container.appendChild(name);

            // Show AI results on index, static, and list page
            const aiResult = ai_results?.find(r => r.class_id === plant.class_id);
            if (aiResult) {
              const correct = document.createElement("p");
              correct.className = "correct";
              correct.textContent = "ถูก " + aiResult.iscorrect + " %";

              const notcorrect = document.createElement("p");
              notcorrect.className = "not-correct";
              notcorrect.textContent = "ผิด " + aiResult.notcorrect + " %";

              const conclusion = document.createElement("p");
              conclusion.className = "conclusion";
              conclusion.textContent = "จำนวนครั้งการประมวลผล: " + aiResult.conclusion + "ครั้ง";
              // Append after plant name
              container.appendChild(correct);
              container.appendChild(notcorrect);
              container.appendChild(conclusion);
            }

            containerMain.appendChild(container);
          }
        })
        .catch((error) => {
          console.error("Error fetching AI results:", error);
        });
    } else {
      // Other pages (e.g. edit page)
      for (let i = 0; i < plants.length; i++) {
        const plant = plants[i];
        const container = document.createElement("div");
        container.className = "content";
        container.id = `plant-${i}`;

        const img = document.createElement("img");
        img.src = plant.image_leaf_path;
        img.alt = plant.name;
        img.width = 300;
        img.height = 300;

        const name = document.createElement("p");
        name.className = "plant-name";
        name.textContent = plant.name;

        container.dataset.name = (plant.name || "").toLowerCase();
        container.appendChild(img);
        container.appendChild(name);

        if (isEditPage) {
          const editButton = document.createElement("button");
          editButton.className = "edit-btn";
          editButton.textContent = "แก้ไข";
          // Navigate to edit page and pass plant id via query string.
          editButton.onclick = () => {
            window.location.href = `edit.html?id=${plant.plant_id}`;
          };

          const deleteButton = document.createElement("button");
          deleteButton.className = "delete-btn";
          deleteButton.textContent = "ลบ";
          deleteButton.onclick = () => {
            if (confirm("คุณต้องการลบใช่หรือไม่?")) {
              fetch(`http://localhost:3001/api/delete/${plant.plant_id}`, {
                method: "DELETE",
                headers: {
                  "Authorization": "Bearer " + localStorage.getItem("token")
                }
              })
                .then((res) => res.json())
                .then((data) => {
                  console.log("Deleted:", data);
                  alert("ลบข้อมูลเรียบร้อย");
                  location.reload();
                })
                .catch((err) => console.error("Error deleting:", err));
            }
          };

          container.appendChild(editButton);
          container.appendChild(deleteButton);
        }

        containerMain.appendChild(container);
      }
    }
  })
  .catch((error) => {
    console.error("Error fetching plant data:", error);
  });