let jwt = localStorage.getItem("jwt")//ดึงค่า jwt ใน localstorageที่เก็บข้อมูล ตัวแปร ค่าต่าง ๆในเว็บ
if (jwt != null){//loginแล้วเด้งไปหน้า index
    window.location.href = './index.html'
}

function login(){
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const xhttp = new XMLHttpRequest();//เรียก api
    xhttp.open("POST","http://localhost:3001/api/login");//method open + url ของ api ฐานข้อมูล
    xhttp.setRequestHeader("Content-Type","application/json;charset=UTF-8");//ส่ง header ไป api
    xhttp.send(//ส่งข้อมูลไป api
        JSON.stringify({"username":username,"password":password})
    );
    xhttp.onreadystatechange = function(){//callback เรียกค่าที่ถูกส่งกลับมาจาก api
        if (this.readyState == 4){
            const objects = JSON.parse(this.responseText);
            console.log(objects);
            if (objects['status'] == 'ok'){
                localStorage.setItem("jwt",objects["accessToken"]);
                Swal.fire({
                    title: objects['message'],
                    icon: 'success'
                    }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = './index.html'
                    } else if (result.isDenied) {
                        Swal.fire("Changes are not saved", "", "info");
                    }
                    });
            }else{
                Swal.fire({
                    title: objects['status'],
                    text:  objects['message'],
                    icon: "error"
                    });
            }
        }
    }
    return false;
}