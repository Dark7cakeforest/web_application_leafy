fetch('http://localhost:3001/api/read')
  .then((response) => response.json())
  .then((responseData) => {
    console.log('responseData', responseData);
    const plants = responseData.plant;
    const containerMain = document.getElementById("plants");

    containerMain.innerHTML = "";
    const indexPage = window.location.pathname.includes("index.html");//เช็คหน้า
    const staticPage = window.location.pathname.includes("static.html");//เช็คหน้า
    const isEditPage = window.location.pathname.includes("edit_plant.html");//เช็คหน้า
    const islistPage = window.location.pathname.includes("list.html");//เช็คหน้า

    for (let i = 0; i < plants.length; i++) {
      const plant = plants[i];

      const container = document.createElement("div");
      container.className = "content";
      container.id = `plant-${i}`;

      if(indexPage || staticPage){
        const rating = document.createElement("p");

        rating.className = "stamp";
        rating.textContent = `${i+1}`;

        container.appendChild(rating);
        if(i === 10){
          break;
        }
      }

      if(islistPage){
        container.addEventListener("click", () => {
          showOne(`id=${plant.id}`);
        });
      }

      const img = document.createElement("img");
      img.src = plant.image_leaf_path;
      img.alt = plant.name;
      img.width = 300;
      img.height = 300;

      const name = document.createElement("p");
      name.textContent = plant.name;
      
      container.appendChild(img);
      container.appendChild(name);

      // ถ้าเป็นหน้า edit_plant.html
      if (isEditPage) {
        const editButton = document.createElement("button");
        editButton.className = "edit-btn";
        editButton.textContent = "แก้ไข";
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
  })
  .catch((error) => {
    console.error("Error fetching plant data:", error);
  });