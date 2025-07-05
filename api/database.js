const bodyParser = require('body-parser');
const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3001;
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const databasepassword = fs.readFileSync(path.join(__dirname, 'databasepassword'), 'utf8').trim();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const verifyToken = require('./authMiddleware');

app.use(express.json())
app.use(bodyParser.json())
app.use(cors({
  origin: ['http://localhost:5501', 'http://127.0.0.1:5501'],
  credentials: true
}));
app.use('/images', express.static(path.join(__dirname, 'images')));

const connection = mysql.createConnection({//สร้างตัวเชื่อมฐานข้อมูล
    host: "localhost",
    user: "root",
    password: databasepassword,
    database: "app_database"
});

connection.connect((err)=>{//เชื่อมต่อฐานข้อมูล
    if(err){
        console.error("Error connecting to MySQL",err);
        return;
    }
    console.log("Connected to MySQL Successfully.");
})

//สร้าง endpoint ของ api สำหรับตรวจสอบการเข้าสู่ระบบ
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const query = "SELECT * FROM users WHERE username = ?";
    
    connection.query(query, [username], async (err, results) => {
        if (err) {
            console.log("Error to Login", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }

        if (results.length === 1) {
            const user = results[0];
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                const token = jwt.sign({ id: user.user_id, is_guest: user.is_guest }, "your_secret", { expiresIn: "1h" });
                return res.send({ status: "ok", message: "Login success", accessToken: token });
            } else {
                return res.send({ status: "Failed To Login", message: "Invalid username or password" });
            }
        } else {
            return res.send({ status: "Failed To Login", message: "Invalid username or password" });
        }
    });
});

//สร้าง endpoint ของ api สำหรับอ่านชื่อแอดมินออกมาแสดงในหน้า index
app.get('/api/auth',verifyToken,(req, res)=>{
    const userId = req.user.id; // ได้จาก token ที่ decode แล้ว
    const query = "SELECT username FROM users WHERE user_id = ?";
    connection.query(query, [userId], (err, results) => {
        if (err) {
            console.log("Error to read user", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        const user = results[0];
        res.json({
            status: "ok",
            user: user
        });
    });
})

//สร้าง endpoint ของ api สำหรับเพิ่มข้อมูลแอดมิน
app.post('/api/insertadmin',verifyToken,async (req, res)=>{
    const {username,password,is_guest} = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = "INSERT INTO users (username, password, is_guest) VALUES (?, ?, false)";
        const value = [username, hashedPassword];

        connection.query(query, value, (err, results) => {
            if (err) {
                console.log("Error to insert user data", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }

            res.json({
                msg: "Inserted admin successfully",
                insertedId: results.insertId
            });
        });
    } catch (error) {
        res.status(500).json({ error: "Hashing error" });
    }
})

//สร้าง endpoint ของ api สำหรับเพิ่มข้อมูลพืช
app.post('/api/insert',verifyToken,(req, res)=>{
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
app.put('/api/update/:id',verifyToken,(req, res)=>{
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
app.delete('/api/delete/:id',verifyToken,(req, res)=>{
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

//สร้าง endpoint ของ api สำหรับอ่านข้อมูลทั้งหมดของ feedback
app.get('/api/read/feedback',(req, res)=>{
    const query = "SELECT user_id, message, created_at FROM suggestions";
    connection.query(query,(err, results)=>{
        if(err){
            console.log("Error to read Data ",err);
            res.status(500).json({error:"Internal Server Error"});
        }
        res.json({
            msg:"Read successfully",
            suggestions: results
        })
    })
})

//สร้าง endpoint ของ api สำหรับลบ feedback
app.delete('/api/delete/feedback',verifyToken,(req, res)=>{
    let suggestionsid = req.params.suggestions_id;
    const query = "DELETE FROM suggestions WHERE suggestions_id = ?";
    connection.query(query,[suggestionsid],(err, results)=>{
        if(err){
            console.log("Error to Delete Data ",err);
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