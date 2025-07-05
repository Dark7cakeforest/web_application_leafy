// let imageLeaf = "image_leaf_path";
// let name = "name";
// let commonName = "common_name";
// let scientificName = "scientific_name";
// let family = "family";
// let medicinalBenefits ="medicinal_benefits";
// let nutritionalBenefits ="nutritional_benefits";
// let nutritionalValue ="nutritional_value";
// const list = document.getElementById("context");

fetch('http://localhost:3001/api/read')
  .then((response) => response.json())
  .then((responseData) => {
    console.log('responseData', responseData);
    const plants = responseData.plant;
    const containerMain = document.getElementById("plants");

    containerMain.innerHTML = "";

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
      name.textContent = plant.name;

      container.appendChild(img);
      container.appendChild(name);

      containerMain.appendChild(container);
    }
  })
  .catch((error) => {
    console.error("Error fetching plant data:", error);
  });