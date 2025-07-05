function loadTable() {//ฟังก์ชันตาราง
    fetch('http://localhost:3001/api/read/feedback')
        .then((response) => response.json())
        .then((responseData) => {
            console.log('responseData', responseData);
            const messagelist = responseData.plant;
            let trHTML = '';//กำหนดตาราง
            for (let i = 0; i < messagelist.length; i++) {
                const object = messagelist[i];
                trHTML += '<tr>';
                trHTML += '<td>'+object['id']+'</td>';
                trHTML += '<td>'+object['title']+'</td>';
                trHTML += '<td>'+object['body']+'</td>';
                trHTML += '<td align="center">'+'<button onclick="deleteFeedback('+object['id']+')">ลบ</button>'+'</td>';
                trHTML += '</tr>';
            }
            document.getElementById("test01").innerHTML = trHTML;
        })
        .catch((error) => {
            console.error("Error fetching plant data:", error);
        });
}

loadTable();//เรียกฟังก์ชันโหลดตารางมาตอนเข้ามาในเว็บ

function deleteFeedback(suggestions_id){//ลบfeedback ออก
    fetch("http://localhost:3001/api/delete/feedback/" + suggestions_id, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "suggestions_id": suggestions_id
        })
    })
    .then(response => response.json())
    .then(data => {
        Swal.fire("ลบสำเร็จ! Suggestions_id: " + data['suggestions_id']);
        loadTable();
    })
    .catch(error => {
        console.error("Error deleting feedback:", error);
        Swal.fire("Error Delete data:");
    });
}