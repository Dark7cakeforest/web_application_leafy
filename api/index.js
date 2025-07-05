const fs = require('fs')
const path = require('path')
const express = require('express')
const server = express();

//ดึงพวกภาพ กับ static ต่าง ๆ มาใช้
server.use(express.static(path.join(__dirname, '../web')));

server.get(['/','/login'],(req,res)=>{//บังคับมาหน้า login ก่อน (รอรับ jwt)
    res.sendFile(path.join(__dirname, '../web/login.html'));
})

server.get('/index',(req,res)=>{//หน้าแรก (ต้องมี token ถึงเข้าได้)
    res.sendFile(path.join(__dirname, '../web/index.html'));
})

server.get('/static',(req,res)=>{//สถิติ (ต้องมี token ถึงเข้าได้)
    res.sendFile(path.join(__dirname, '../web/static.html'));
})

server.get('/edit_plant',(req,res)=>{//ดูพืช แก้ไขพืช (ต้องมี token ถึงเข้าได้)
    res.sendFile(path.join(__dirname, '../web/edit_plant.html'));
})

server.get('/feedback',(req,res)=>{//หน้าที่เอาไว้รับข้อเสนอแนะ (ต้องมี token ถึงเข้าได้)
    res.sendFile(path.join(__dirname, '../web/feedback.html'));
})

// หน้า 404
server.use((req, res) => {
  res.status(404).send('404 Not Found');
});

server.listen(8000,'localhost',()=>{//เซิฟเวอร์พอร์ต8000
    console.log("Start server at port 8000")
})