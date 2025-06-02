const http = require('http')
const fs = require('fs')
const url = require('url')
const indexPage = fs.readFileSync('${__dirname}/web/index.html','utf-8')
const loginPage = fs.readFileSync('${__dirname}/web/login.html','utf-8')
const staticPage = fs.readFileSync('${__dirname}/web/static.html','utf-8')
const editPage = fs.readFileSync('${__dirname}/web/edit_plant.html','utf-8')
const feedbackPage = fs.readFileSync('${__dirname}/web/feedback.html','utf-8')

const server = http.createServer((req,res)=>{
    const {pathname,query} = url.parse(req.url,true)
    if(pathname==="/login" || pathname==="/"){
        res.end(loginPage)
    }else if(pathname==="/static"){
        res.end(staticPage)
    }else{
        res.writeHead(404)
        res.end("<h1>404 Not found</h1>")
    }
})
server.listen(8000,'localhost',()=>{
    console.log("Start server at port 8000")
})