function loadTable() {//ฟังก์ชันตาราง
    const xhttp = new XMLHttpRequest();//XML HTTP 
    xhttp.open("GET","https://jsonplaceholder.typicode.com/posts")//method กับ เว็บ APIจำลอง
    xhttp.send();//ส่ง
    xhttp.onreadystatechange = function (){//ฟังก์ชันเปลี่ยน state รับค่าสถานะ
        if (this.readyState == 4 && this.status == 200){//สถานะพร้อม รหัส 200
            console.log(this.responseText);//ข้อความ response
            let trHTML = '';//กำหนดตาราง
            const objects = JSON.parse(this.responseText);//แปลง JSON ออกมาใช้ JSON -> javascript object
            for (let object of objects){//วนลูปสร้างตารางจากข้อมูลที่ดึงมา ใช้ ' กับ tag html ได้
                trHTML += '<tr>';
                trHTML += '<td>'+object['id']+'</td>';
                trHTML += '<td>'+object['title']+'</td>';
                trHTML += '<td>'+object['body']+'</td>';
                trHTML += '<td align="center">'+'<button onclick="deleteFeedback('+object['id']+')">ลบ</button>'+'</td>';
                trHTML += '</tr>';
            }
            document.getElementById("test01").innerHTML = trHTML;//เขียนข้อมูลลงไปใน id test01 ที่ตั้งชื่อในไว้ไฟล์ html ของตัวตาราง
        }
    }
}

loadTable();//เรียกฟังก์ชันโหลดตารางมาตอนเข้ามาในเว็บ

function createNewFeedbackbox(){//กล่องแจ้งกรอกข้อมูล
    Swal.fire({
    title: "สร้าง Feedback",
    html:
        '<input id="title" class="swal2-input" placeholder="title">' +
        '<input id="body" class="swal2-input" placeholder="body">'
    ,
    focusConfirm: false,
    preConfirm: () => {//ปุ่มกดส่งใช้ฟังก์ชันสร้าง
        createFeedback();
    }
    });
}

function createFeedback(){//สร้าง feedback
    const title = document.getElementById("title").value;
    const body = document.getElementById("body").value;

    const xhttp = new XMLHttpRequest();//ตัว object การส่งข้อมูล แบบ XML ที่ไม่ต้องรีเฟรชหน้าเพื่อส่งข้อมูลกับ server
    xhttp.open("POST","https://jsonplaceholder.typicode.com/posts");//method กับ เว็บ APIจำลอง
    xhttp.setRequestHeader("Content-Type","application/json;charset=UTF-8");//แปลงค่ารหัสการส่ง req UTF-8
    xhttp.send(JSON.stringify({//ส่งค่าไปที่URL javascript -> JSON
        "title":title,"body":body
    }));
    xhttp.onreadystatechange = function(){//ฟังก์ชันเปลี่ยน state รับค่าสถานะ
        if (this.readyState == 4 && this.status == 201){
            const objects = JSON.parse(this.responseText);//แปลง JSON ออกมาใช้ JSON -> javascript object
            Swal.fire("สร้างสำเร็จ! ID: " + objects['id']);//ใช้ตัว pop up ของ swal alert message ออกมา
            loadTable();//โหลดตารางใหม่จากข้อมูลที่เพิ่มเข้าไป
        }
    }
}

function deleteFeedback(id){//ลบfeedback ออก
    const xhttp = new XMLHttpRequest();//ตัว object การส่งข้อมูล แบบ XML ที่ไม่ต้องรีเฟรชหน้าเพื่อส่งข้อมูลกับ server
    xhttp.open("DELETE","https://jsonplaceholder.typicode.com/posts" + id);//method กับ เว็บ APIจำลอง
    xhttp.setRequestHeader("Content-Type","application/json;charset=UTF-8");//แปลงค่ารหัสการส่ง req UTF-8
    xhttp.send(JSON.stringify({//ส่งค่าไปที่URL javascript -> JSON
        "id":id
    }));
    xhttp.onreadystatechange = function(){//ฟังก์ชันเปลี่ยน state รับค่าสถานะ
        if (this.readyState == 4 && this.status == 200){
            const objects = JSON.parse(this.responseText);//แปลง JSON ออกมาใช้ JSON -> javascript object
            Swal.fire("ลบสำเร็จ! ID: " + objects['id']);//ใช้ตัว pop up ของ swal alert message ออกมา
            loadTable();//โหลดตารางใหม่จากข้อมูลที่ลบออกไป
        }
    }
}