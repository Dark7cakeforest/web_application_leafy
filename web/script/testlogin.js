let jwt = localStorage.getItem("jwt")//ดึงค่าjwt ใน localstorageที่เก็บข้อมูล ตัวแปร ค่าต่าง ๆในเว็บ
if (jwt == null){//ออกแล้วเด้งไปหน้า login
    window.location.href = './login.html'
}

function loadUser(){
    const xhttp = new XMLHttpRequest();//เรียก api
    xhttp.open("GET","https://www.melivecode.com/api/auth/user");//method open + url
    xhttp.setRequestHeader("Content-Type","application/json;charset=UTF-8");//ส่ง header ไป api
    xhttp.setRequestHeader("Authorization","Bearer "+jwt);//ส่ง token
    xhttp.send();
    xhttp.onreadystatechange = function(){//callback เรียกค่าที่ถูกส่งกลับมาจาก api
        if (this.readyState == 4){
            const objects = JSON.parse(this.responseText);
            console.log(objects);
            if (objects['status'] == 'ok'){
                const user = objects['user'];
                document.getElementById("displayname").innerHTML = user["fname"];
            }
        }
    }
}
loadUser();

function logout(){
    localStorage.removeItem("jwt");
    window.location.href = "./login.html";
}