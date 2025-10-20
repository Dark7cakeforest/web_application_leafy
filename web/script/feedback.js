function loadTable() {//ฟังก์ชันตาราง
    const token = localStorage.getItem('jwt') || localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (!token) {
        console.warn('No token found, redirecting to login');
        window.location.href = './login.html';
        return;
    }

    fetch('/api/read_feedback', {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Accept': 'application/json'
        }
    })
    .then((response) => {
        if (response.status === 401 || response.status === 403) {
            // Token missing/invalid
            window.location.href = './login.html';
            throw new Error('Unauthorized');
        }
        return response.json();
    })
    .then((responseData) => {
        console.log('responseData', responseData);
        // API returns { msg: ..., suggestions: [...] }
        const messagelist = responseData.suggestions || [];
        const countPerson = document.getElementsByClassName("explain");
        if (countPerson && countPerson[0]) {
            countPerson[0].innerHTML = "จำนวน Feedback ที่ส่งมาทั้งหมด " + messagelist.length + " คน";
        }

        let trHTML = '';//กำหนดตาราง
        for (let i = 0; i < messagelist.length; i++) {
            const object = messagelist[i];
            trHTML += '<tr>';
            trHTML += `<td>${i + 1}</td>`;
            trHTML += `<td>${(object.message || '')}</td>`;
            trHTML += `<td>${(object.created_at || '')}</td>`;
            trHTML += `<td><button onclick="deleteFeedback(${object.suggestions_id})">ลบ</button></td>`;
            trHTML += '</tr>';
        }
        document.getElementById("feedback").innerHTML = trHTML;
    })
    .catch((error) => {
        console.error("Error fetching feedback data:", error);
    });
}

loadTable();//เรียกฟังก์ชันโหลดตารางมาตอนเข้ามาในเว็บ

function deleteFeedback(suggestions_id) {//ลบfeedback ออก
    const token = localStorage.getItem('jwt') || localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = './login.html';
        return;
    }

    fetch(`/api/delete_feedback/${suggestions_id}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "Authorization": 'Bearer ' + token
        }
    })
    .then(async response => {
        if (response.status === 401 || response.status === 403) {
            window.location.href = './login.html';
            throw new Error('Unauthorized');
        }
        return response.json();
    })
    .then(data => {
        Swal.fire("ลบสำเร็จ! ");
        loadTable();
    })
    .catch(error => {
        console.error("Error deleting feedback:", error);
        Swal.fire("Error Delete data:");
    });
}