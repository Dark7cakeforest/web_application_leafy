const bodyParser = require('body-parser');
const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3001;
const cors = require('cors');

app.use(express.json())
app.use(bodyParser.json())
app.use(cors())

const connection = mysql.createConnection({//สร้างตัวเชื่อมฐานข้อมูล
    host: "localhost",
    user: "root",
    password: "Ca!0831881170",
    database: "app_database"
});

connection.connect((err)=>{//เชื่อมต่อฐานข้อมูล
    if(err){
        console.error("Error connecting to MySQL",err);
        return;
    }
    console.log("Connected to MySQL Successfully.");
})

//สร้าง endpoint ของ api สำหรับเพิ่มข้อมูล
app.post('/api/insert',(req, res)=>{
    const {image_leaf_path, name, common_name, scientific_name, family, medicinal_benefits, nutritional_benefits, nutritional_value} = req.body;
    const query = "INSERT INTO vegetables (image_leaf_path, name, common_name, scientific_name, family, medicinal_benefits, nutritional_benefits, nutritional_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    const value = [image_leaf_path,name,common_name,scientific_name,family,medicinal_benefits,nutritional_benefits,
        JSON.stringify(nutritional_value)];//แปลงอันที่เป็นให้เป็น JSON ก่อนไปเก็บในฐานข้อมูล
    connection.query(query,value,(err, results)=>{
        if(err){
            console.log("Error to insert Data ",err);
            res.status(500).json({error:"Internal Server Error"});
        }
        res.json({
            msg:"Inserted successfully",
            insertedId: results.insertId
        })
    })
})

//สร้าง endpoint ของ api สำหรับอ่านข้อมูลทั้งหมด
app.get('/api/read',(req, res)=>{
    const query = "SELECT image_leaf_path, name FROM vegetables";
    connection.query(query,(err, results)=>{
        if(err){
            console.log("Error to read Data ",err);
            res.status(500).json({error:"Internal Server Error"});
        }
        res.json({
            msg:"Read successfully",
            plant: results
        })
    })
})

//สร้าง endpoint ของ api สำหรับอ่านข้อมูลเจาะจงพืช
app.get('/api/read/:id',(req, res)=>{
    let id = req.params.id;//รับค่า param id เข้ามา
    const query = `SELECT image_leaf_path, name, common_name, scientific_name, family, medicinal_benefits, nutritional_benefits, nutritional_value FROM vegetables WHERE plant_id = ?`;
    connection.query(query,[id],(err, results)=>{
        if(err){
            console.log("Error to read Data ",err);
            res.status(500).json({error:"Internal Server Error"});
        }
        if (results.length === 0) {
            return res.status(404).json({ error: "Plant not found" });
        }
        res.json({
            msg:"Read successfully",
            plant: results[0]
        })
    })
})

//สร้าง endpoint ของ api สำหรับแก้ไขข้อมูล(แบบบางส่วนและทั้งหมด)
app.put('/api/update/:id',(req, res)=>{
    let id = req.params.id;//รับค่า param id เข้ามา
    let updatePlant = req.body;
    const query = `UPDATE vegetables SET ? WHERE plant_id = ?`;
    const value = [updatePlant, id];
    connection.query(query,value,(err, results)=>{
        if(err){
            console.log("Error to update Data ",err);
            res.status(500).json({error:"Internal Server Error"});
            return;
        }
        res.json({
            msg:"Updated successfully",
            affectedRows: results.affectedRows
        })
    })
})

//สร้าง endpoint ของ api สำหรับลบข้อมูล
app.delete('/api/delete/:id',(req, res)=>{
    let id = req.params.id;
    const query = "DELETE FROM vegetables WHERE plant_id = ?";
    connection.query(query,[id],(err, results)=>{
        if(err){
            console.log("Error to insert Data ",err);
            res.status(500).json({error:"Internal Server Error"});
        }
        res.json({
            msg:"Deleted successfully",
        })
    })
})

app.listen(port,()=>{
    console.log(`Server running in port: ${port}`);
})