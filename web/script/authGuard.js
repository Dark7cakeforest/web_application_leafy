let jwt = localStorage.getItem("jwt")//ดึงค่า jwt ใน localstorageที่เก็บข้อมูล ตัวแปร ค่าต่าง ๆในเว็บ
if (jwt == null){//ออกแล้วเด้งไปหน้า login
    window.location.href = './login.html'
}

function loadUser(){
    const xhttp = new XMLHttpRequest();//เรียก api
    xhttp.open("GET","http://localhost:3001/api/auth");//method open + url ของ api ฐานข้อมูล
    xhttp.setRequestHeader("Authorization","Bearer "+jwt);//ส่ง token
    xhttp.send();
    xhttp.onreadystatechange = function(){//callback เรียกค่าที่ถูกส่งกลับมาจาก api
        if (this.readyState == 4){
            if (this.status === 200) {
                const objects = JSON.parse(this.responseText);
                const user = objects.user;
                document.getElementById("displayname").innerHTML = user.username;
            } else {
                console.error("Failed to load user:", this.responseText);
            }
        }
    }
}
loadUser();

function logout(){
    localStorage.removeItem("jwt");
    window.location.href = "./login.html";
}