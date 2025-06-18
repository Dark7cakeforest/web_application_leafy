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
  .then((response)=>{
    return response.json()
  })
  .then((responseData)=>{
    console.log('responseData',responseData)
  })
