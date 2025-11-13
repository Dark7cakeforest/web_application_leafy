const FEEDBACK_PAGE_SIZE = 10;
const feedbackState = {
    rows: [],
    currentPage: 1
};

function updateFeedbackPagination() {
    const container = document.getElementById('feedbackPagination');
    if (!container) return;
    const totalRows = feedbackState.rows.length;
    const totalPages = Math.ceil(totalRows / FEEDBACK_PAGE_SIZE);

    if (totalPages <= 1) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }

    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.gap = '0.5rem';
    container.style.justifyContent = 'center';

    const makeButton = (label, targetPage, disabled = false, isActive = false) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        btn.disabled = disabled;
        if (isActive) btn.classList.add('active');
        btn.addEventListener('click', () => renderFeedbackTablePage(targetPage));
        return btn;
    };

    container.appendChild(makeButton('<', feedbackState.currentPage - 1, feedbackState.currentPage === 1));
    const MAX_VISIBLE = 10;
    const startPage = Math.max(1, Math.min(feedbackState.currentPage, totalPages - MAX_VISIBLE + 1));
    const endPage = Math.min(totalPages, startPage + MAX_VISIBLE - 1);
    for (let i = startPage; i <= endPage; i++) {
        container.appendChild(makeButton(String(i), i, false, i === feedbackState.currentPage));
    }
    container.appendChild(makeButton('>', feedbackState.currentPage + 1, feedbackState.currentPage === totalPages));
}

function renderFeedbackTablePage(page = 1) {
    const tbody = document.getElementById('feedback');
    if (!tbody) return;
    const totalRows = feedbackState.rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / FEEDBACK_PAGE_SIZE));
    const targetPage = Math.min(Math.max(page, 1), totalPages);
    feedbackState.currentPage = targetPage;

    const start = (targetPage - 1) * FEEDBACK_PAGE_SIZE;
    const slice = feedbackState.rows.slice(start, start + FEEDBACK_PAGE_SIZE);

    let trHTML = '';
    slice.forEach((object, idx) => {
        const rowNumber = start + idx + 1;
        trHTML += '<tr>';
        trHTML += `<td>${rowNumber}</td>`;
        trHTML += `<td>${object.message || ''}</td>`;
        trHTML += `<td>${object.created_at || ''}</td>`;
        trHTML += `<td><button onclick="deleteFeedback(${object.suggestions_id})">ลบ</button></td>`;
        trHTML += '</tr>';
    });
    tbody.innerHTML = trHTML;
    updateFeedbackPagination();
}

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

        feedbackState.rows = messagelist;
        const maxPage = Math.max(1, Math.ceil(messagelist.length / FEEDBACK_PAGE_SIZE));
        if (feedbackState.currentPage > maxPage) feedbackState.currentPage = maxPage;
        renderFeedbackTablePage(feedbackState.currentPage);
    })
    .catch((error) => {
        console.error("Error fetching feedback data:", error);
    });
}

loadTable();//เรียกฟังก์ชันโหลดตารางมาตอนเข้ามาในเว็บ

async function deleteFeedback(suggestions_id) {//ลบfeedback ออก
    const token = localStorage.getItem('jwt') || localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = './login.html';
        return;
    }

    const confirmResult = await Swal.fire({
        title: 'ยืนยันการลบ?',
        text: 'คุณต้องการลบ Feedback นี้หรือไม่',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ลบ',
        cancelButtonText: 'ยกเลิก'
    });

    if (!confirmResult.isConfirmed) {
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
        // หลังลบแล้วโหลดข้อมูลใหม่และรักษาหน้าปัจจุบันให้ใกล้เคียงเดิม
        const previousPage = feedbackState.currentPage;
        loadTable();
        feedbackState.currentPage = previousPage;
    })
    .catch(error => {
        console.error("Error deleting feedback:", error);
        Swal.fire("Error Delete data:");
    });
}