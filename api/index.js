const fs = require('fs')
const path = require('path')
const express = require('express')
const http = require('http');
const server = express();

server.set('view engine', 'ejs');//set ตัว ejs สำหรับ dynamic web
// Simple proxy: forward any /api requests to the API server running on port 3001
// This allows the static server (port 8000) to serve the UI while forwarding
// backend requests to the backend process on 3001 without changing client code.
server.use('/api', (req, res) => {
    const options = {
        hostname: '127.0.0.1',
        port: 3001,
        path: req.originalUrl,
        method: req.method,
        headers: req.headers
    };

    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    req.pipe(proxyReq, { end: true });

    proxyReq.on('error', (err) => {
        console.error('API proxy error:', err);
        if (!res.headersSent) res.status(502).send('Bad Gateway');
    });
});

//ดึงพวกภาพ กับ static ต่าง ๆ มาใช้
server.use(express.static(path.join(__dirname, '../web')));
server.use('/src', express.static(path.join(__dirname, '../src')));

server.get(['/','/login'],(req,res)=>{//บังคับมาหน้า login ก่อน (รอรับ jwt)
    // send only the HTML; linked CSS will be requested by the browser
    res.sendFile(path.join(__dirname, '../web/login.html'));
})

server.get('/index',(req,res)=>{//หน้าแรก (ต้องมี token ถึงเข้าได้)
    res.sendFile(path.join(__dirname, '../web/index.html'));
})

server.get('/static',(req,res)=>{//สถิติ(10อันดับ) (ต้องมี token ถึงเข้าได้)
    res.sendFile(path.join(__dirname, '../web/static.html'));
})

server.get('/list',(req,res)=>{//สถิติ(ตาราง) (ต้องมี token ถึงเข้าได้)
    res.sendFile(path.join(__dirname, '../web/list.html'));
})

server.get('/detail',(req,res)=>{//รายละเอียด (ต้องมี token ถึงเข้าได้)
    res.sendFile(path.join(__dirname, '../web/detail.html'));
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

server.listen(process.env.PORT || 8000, '0.0.0.0',()=>{//เซิฟเวอร์พอร์ต8000
    console.log(`Start server at port ${process.env.PORT || 8000}`)
})