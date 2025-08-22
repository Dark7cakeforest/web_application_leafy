function loadResultTable() {//ฟังก์ชันตาราง
    fetch('http://localhost:3001/api/read/results')
        .then((response) => response.json())
        .then((responseData) => {
            console.log('responseData', responseData);
            const messagelist = responseData.ai_result;
            let trHTML = '';//กำหนดตาราง
            for (let i = 0; i < messagelist.length; i++) {
                const object = messagelist[i];
                trHTML += '<tr>';
                trHTML += '<td><a>'+(i + 1)+'</a></td>';
                trHTML += '<td><a>'+object['class_id']+'</a></td>';
                trHTML += '<td><a>'+object['processed_time']+'</a></td>';
                trHTML += '<td><button onclick="window.location.href=\'detail.html\'">'+'แก้ไข'+'</button></td>';
                trHTML += '</tr>';
            }
            document.getElementById("plantSelect").innerHTML = trHTML;
            document.getElementById("queryAllResult").innerHTML = trHTML;
        })
        .catch((error) => {
            console.error("Error fetching result data:", error);
        });
}

loadResultTable()
