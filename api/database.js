const { setupModelRoutes } = require('./model.js');
const bodyParser = require('body-parser');
const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
const port = 3001;
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const databasepassword = fs.readFileSync(path.join(__dirname, 'databasepassword.env'), 'utf8').trim();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const verifyToken = require('./authMiddleware');
const multer = require('multer'); // added for file uploads

// ensure images folder exists
// store uploaded images in ../src/images so they become part of the web static assets
const imagesDir = path.join(__dirname, '..', 'src', 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, imagesDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
        cb(null, unique);
    }
});
const upload = multer({ storage });

// ===== สร้างเงื่อนไขช่วงวันที่จาก query =====
function buildDateRangeWhere(alias, q) {
  const a = alias || 'ar';
  const { date, start, end } = q || {};
  let where = '';
  let params = [];

  // เทียบเฉพาะ 'วัน' ด้วย DATE()
  if (date && !start && !end) {
    where = `WHERE DATE(${a}.processed_time) = ?`;
    params.push(date);
  } else if (start || end) {
    // สลับถ้า end < start
    let s = start || end;
    let e = end || start;
    if (s && e && new Date(e) < new Date(s)) {
      const tmp = s; s = e; e = tmp;
    }
    if (s && e) {
      where = `WHERE DATE(${a}.processed_time) BETWEEN ? AND ?`;
      params.push(s, e);
    } else if (s && !e) {
      where = `WHERE DATE(${a}.processed_time) >= ?`;
      params.push(s);
    } else if (!s && e) {
      where = `WHERE DATE(${a}.processed_time) <= ?`;
      params.push(e);
    }
  }
  return { where, params };
}

app.use(express.json());
app.use(bodyParser.json());
app.use(cors({
  origin: ['http://localhost:5501', 'http://127.0.0.1:5501', 'http://localhost:8000', 'http://192.168.1.33:8081'],
  credentials: true
}));
app.use('/images', express.static(imagesDir));//หน้า images ให้เป็น static folder

const connection = mysql.createPool({//สร้างตัวเชื่อมฐานข้อมูล
    host: "localhost",
    user: "root",
    password: databasepassword,
    database: "app_database",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log("Connected to MySQL Successfully.");

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

//สร้าง endpoint ของ api สำหรับเพิ่มข้อมูลผู้ใช้งานทั่วไป (แบบ guest)
app.post('/api/create_user',async (req, res)=>{
    try {
        const query = "INSERT INTO users (user_id, is_guest) VALUES ( ? , true)";
        const userId = 'guest_' + Math.floor(Math.random() * 1000);
        const value = [userId];
        connection.query(query, value, (err, results) => {
            if (err) {
                console.log("Error to insert user data", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }

            res.json({
                msg: "Inserted guest successfully",
                insertedId: results.insertId
            });
        });
    } catch (error) {
        res.status(500).json({ error: "Hashing error" });
    }
})

//สร้าง endpoint ของ api สำหรับการรับข้อเสนอแนะจากผู้ใช้งาน
app.post('/api/suggestions', async (req, res) => {
    const { userId, message } = req.body;
    if (!message || !userId) {
        return res.status(400).json({ error: "userId and message are required" });
    }
    try {
        const query = `INSERT INTO suggestions (user_id, message, created_at) VALUES (?, ?, NOW())`;
        const [results] = await connection.query(query, [userId, message]);
        res.json({ msg: "Save suggestions successfully", affectedRows: results.affectedRows });
    } catch (err) {
        console.log("Error to input suggestions ", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

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
    const query = "SELECT plant_id, class_id, image_leaf_path, name FROM vegetables";
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

//สร้าง endpoint ของ api สำหรับอ่านข้อมูลทั้งหมดของ ai_results และทำการคำนวณค่า ถูก/ผิด และ จำนวนคนที่ส่งข้อมูลเข้ามา
//สรุปผลต่อ class_id + เรียงตาม conclusion มาก ไป น้อย
// ===== [UPDATE] รองรับ ?date=YYYY-MM-DD หรือ ?start=YYYY-MM-DD&end=YYYY-MM-DD ====
app.get('/api/ai_results', (req, res) => {
  const { where, params } = buildDateRangeWhere('ar', req.query);

  const query = `
    SELECT
      ac.class_id,
      ac.class_label,
      COALESCE(t.conclusion, 0)  AS conclusion,
      COALESCE(t.correct, 0)     AS correct,
      COALESCE(t.notcorrect, 0)  AS notcorrect
    FROM ai_classes ac
    LEFT JOIN (
      SELECT
        ar.class_id,
        COUNT(*) AS conclusion,
        ROUND(100 * SUM(ar.is_correct = 1) / NULLIF(COUNT(*), 0)) AS correct,
        ROUND(100 * SUM(ar.is_correct = 0) / NULLIF(COUNT(*), 0)) AS notcorrect
      FROM ai_results ar
      ${where}
      GROUP BY ar.class_id
    ) t ON t.class_id = ac.class_id
    ORDER BY conclusion DESC, ac.class_id ASC;
  `;

  connection.query(query, params, (err, results) => {
    if (err) {
      console.log("Error to read Data ", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    res.json({ msg: "Read successfully", ai_result: results });
  });
});

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
app.get('/api/read_feedback',verifyToken,(req, res)=>{
    const query = "SELECT suggestions_id, user_id, message, created_at FROM suggestions";
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
app.delete('/api/delete_feedback/:suggestions_id',verifyToken,(req, res)=>{
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

// สร้าง endpoint ของ api สำหรับอัปโหลดไฟล์ (requires auth)
app.post('/api/upload', verifyToken, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
  // return the public URL that clients can use to load the image
  const imagePath = `../src/images/${req.file.filename}`;
  res.json({ msg: 'Uploaded successfully', imagePath });
});

// สร้าง endpoint ของ api สำหรับอัปโหลดไฟล์ สำหรับ guest (no auth)
app.post('/api/guest_upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
  // return the public URL that clients can use to load the image
  const imagePath = `../src/images/${req.file.filename}`;
  res.json({ msg: 'Uploaded successfully', imagePath });
});

//สร้าง endpoint ของ api สำหรับการบันทึก log ของการค้นหาข้อมูลพืชจาก input ในช่อง search
app.put('/api/log_search', (req, res) => {
  let searchQuery = req.body.searchQuery;
  const query = `INSERT INTO search_logs (user_id, search_term, search_time) VALUES (?, ?, ?)`;
  const value = [req.user.id, searchQuery, new Date()]; // 🔧 เติม timestamp
  connection.query(query, value, (err, results) => {
    if (err) {
      console.log("Error to input log data ", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    res.json({ msg: "Save log successfully", affectedRows: results.affectedRows });
  });
});

// ===== [ADD] /api/results สำหรับ list.html (แสดงทุกแถวของผลลัพธ์ + label) =====
// รองรับพารามิเตอร์วันเดียว/ช่วงวัน เช่นเดียวกับ /api/ai_results
app.get('/api/results', (req, res) => {
  const { where, params } = buildDateRangeWhere('ar', req.query);
  const sql = `
    SELECT 
      ar.result_id,
      ar.upload_id,
      ar.class_id,
      ac.class_label,
      ar.confidence_score,
      ar.processed_time,
      ar.is_correct
    FROM ai_results ar
    JOIN ai_classes ac ON ac.class_id = ar.class_id
    ${where}
    ORDER BY ar.processed_time DESC, ar.result_id DESC
  `;
  connection.query(sql, params, (err, rows) => {
    if (err) {
      console.error('Error /api/results', err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    res.json({ msg: "Read successfully", ai_result: rows });
  });
});

// ===== [ADD] รายละเอียดของผลลัพธ์เดียว สำหรับหน้า detail.html =====
app.get('/api/result_detail', (req, res) => {
  const { result_id } = req.query;
  if (!result_id) return res.status(400).json({ error: "result_id is required" });

  const sql = `
    SELECT 
      ar.result_id,
      ar.upload_id,
      ar.class_id,
      ac.class_label,
      ar.confidence_score,
      ar.processed_time,
      ar.is_correct,
      ar.feedback_time,
      up.image_path
    FROM ai_results ar
    JOIN ai_classes ac ON ac.class_id = ar.class_id
    LEFT JOIN upload_photos up ON up.upload_id = ar.upload_id
    WHERE ar.result_id = ? 
    LIMIT 1
  `;
  connection.query(sql, [result_id], (err, rows) => {
    if (err) {
      console.error('Error /api/result_detail', err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    if (!rows.length) return res.status(404).json({ error: "Result not found" });
    res.json({ msg: "Read successfully", result: rows[0] });
  });
});

// ===== [ADD] อัปเดต is_correct + feedback_time (ต้องการสิทธิ์) =====
app.put('/api/result_feedback/:result_id', verifyToken, (req, res) => {
  const { result_id } = req.params;
  const { is_correct } = req.body; // ควรเป็น 0 หรือ 1

  if (is_correct !== 0 && is_correct !== 1) {
    return res.status(400).json({ error: "is_correct must be 0 or 1" });
  }

  const sql = `
    UPDATE ai_results 
    SET is_correct = ?, feedback_time = NOW()
    WHERE result_id = ?
  `;
  connection.query(sql, [is_correct, result_id], (err, r) => {
    if (err) {
      console.error('Error update feedback', err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    res.json({ msg: "Updated feedback successfully", affectedRows: r.affectedRows });
  });
});

setupModelRoutes(app, connection, upload);
console.log("Model routes have been set up.");

app.listen(port, () => {
    console.log(`Server running in port: ${port}`);
});