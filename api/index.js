const http = require('http')
const fs = require('fs')
const url = require('url')
const express = require('express')
const indexPage = fs.readFileSync(`${__dirname}/../web/index.html`,'utf-8')
const loginPage = fs.readFileSync(`${__dirname}/../web/login.html`,'utf-8')
const staticPage = fs.readFileSync(`${__dirname}/../web/static.html`,'utf-8')
const editPage = fs.readFileSync(`${__dirname}/../web/edit_plant.html`,'utf-8')
const feedbackPage = fs.readFileSync(`${__dirname}/../web/feedback.html`,'utf-8')

const server = http.createServer((req,res)=>{//สร้าง req,res สำหรับ url ที่เข้าไป
    const {pathname,query} = url.parse(req.url,true)
    res.writeHead(200)
    if(pathname==="/login" || pathname==="/"){
        res.end(loginPage)
    }else if(pathname==="/index"){
        res.end(indexPage)
    }else if(pathname==="/static"){
        res.end(staticPage)
    }else if(pathname==="/edit_plant"){
        res.end(editPage)
    }else if(pathname==="/feedback"){
        res.end(feedbackPage)
    }else{
        res.writeHead(404)
        res.end("<h1>404 Not found</h1>")
    }
})
server.listen(8000,'localhost',()=>{//เซิฟเวอร์พอร์ต8000
    console.log("Start server at port 8000")
})