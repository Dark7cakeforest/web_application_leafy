const axios = require('axios');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');

// URL ของ Python Server
const PYTHON_SERVER_URL = 'http://127.0.0.1:5000/predict'; 

function setupModelRoutes(app, connection, upload) {

    app.post('/api/predict', upload.single('image'), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded.' });
        }

        const imagePath = req.file.path;
        const relativeImagePath = path.join('..', 'src', 'images', req.file.filename).replace(/\\/g, '/');

        let guestUserId;
        let uploadId;

        try {
            // Step 1: ส่งรูปไปให้ Python Server ประมวลผล
            const form = new FormData();
            form.append('image', fs.createReadStream(imagePath));
            const response = await axios.post(PYTHON_SERVER_URL, form, { headers: form.getHeaders() });
            const { predicted_index, confidence, class_label } = response.data;
            const classId = predicted_index + 1; // แปลง index (0-9) เป็น class_id (1-10)

            // Step 2: สร้าง Guest User และบันทึกการอัปโหลด
            const insertUserQuery = "INSERT INTO users (is_guest) VALUES (true)";
            const [userResult] = await connection.query(insertUserQuery); 
            const guestUserId = userResult.insertId;

            const [uploadResult] = await connection.query(
                "INSERT INTO upload_photos (user_id, image_path, upload_time) VALUES (?, ?, NOW())",
                [guestUserId, relativeImagePath]
            );
            const uploadId = uploadResult.insertId;

            // Step 3: บันทึกผลลัพธ์ลงตาราง ai_results 
            const [aiResult] = await connection.query(
                "INSERT INTO ai_results (upload_id, class_id, confidence_score, processed_time) VALUES (?, ?, ?, NOW())",
                [uploadId, classId, confidence]
            );
            const resultId = aiResult.insertId;

            // Step 4: ดึงข้อมูลพืชจากตาราง vegetables
            const [vegRows] = await connection.query(
                "SELECT name, image_leaf_path FROM vegetables WHERE class_id = ?",
                [classId]
            );

            if (vegRows.length === 0) {
                return res.status(404).json({ error: `Plant details not found for class_id: ${classId}` });
            }

            // Step 5: ส่งผลลัพธ์กลับไปให้ Flutter
            res.json({
                success: true,
                guest_user_id: guestUserId,
                result_id: resultId,
                class_id: classId,
                class_label: class_label,
                confidence: confidence,
                plant_info: {
                    name: vegRows[0].name,
                    leaf_image_url: `http://127.0.0.1:3001/${vegRows[0].image_leaf_path.replace('../src/', '')}`
                }
            });

        } catch (err) {
            console.error('Error during prediction process:', err.response ? err.response.data : err.message);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.put('/api/mobile_feedback/:result_id', async (req, res) => {
        const { result_id } = req.params;
        const { is_correct } = req.body;
        if (is_correct !== 0 && is_correct !== 1) {
            return res.status(400).json({ error: 'is_correct must be 0 or 1' });
        }
        try {
            const [updateResult] = await connection.query(
                "UPDATE ai_results SET is_correct = ?, feedback_time = NOW() WHERE result_id = ?",
                [is_correct, result_id]
            );
            if (updateResult.affectedRows === 0) {
                return res.status(404).json({ error: 'Result ID not found.' });
            }
            res.json({ success: true, message: 'Feedback received successfully.' });
        } catch (err) {
            console.error('Error updating feedback:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/plant_details/:class_id', async (req, res) => {
        const { class_id } = req.params;
        try {
            const [rows] = await connection.query(
                "SELECT * FROM vegetables WHERE class_id = ?",
                [class_id]
            );
            if (rows.length === 0) {
                return res.status(404).json({ error: 'Plant details not found.' });
            }
            const plantData = rows[0];
            plantData.image_leaf_url = `http://127.0.0.1:3001/${plantData.image_leaf_path.replace('../src/', '')}`;
            res.json({ success: true, details: plantData });
        } catch (err) {
            console.error('Error fetching plant details:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

// แก้ไข module.exports ให้ส่งออกแค่ setupModelRoutes
module.exports = {
    setupModelRoutes
};