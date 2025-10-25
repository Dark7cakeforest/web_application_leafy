// Read JWT (accept legacy keys)
let jwt = localStorage.getItem("jwt");

// Helper: decode base64url
function base64UrlDecode(str) {
    try {
        // Add padding
        let s = str.replace(/-/g, '+').replace(/_/g, '/');
        while (s.length % 4) s += '=';
        return decodeURIComponent(Array.prototype.map.call(atob(s), function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    } catch (e) {
        return null;
    }
}

// Returns true if token is expired (or invalid)
function isTokenExpired(token) {
    if (!token) return true;
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = base64UrlDecode(parts[1]);
    if (!payload) return true;
    try {
        const obj = JSON.parse(payload); // 1. แปลง payload เป็น JSON
        if (!obj.exp) return false; // 2. ตรวจสอบว่ามี 'exp' claim หรือไม่
        const now = Math.floor(Date.now() / 1000); // 3. เวลาปัจจุบัน (วินาที)
        return now >= obj.exp; // 4. 'obj.exp' คือเวลาหมดอายุที่ Server กำหนด
    } catch (e) {
        return true;
    }
}

function redirectToLogin() {
    try { localStorage.removeItem('jwt'); localStorage.removeItem('token'); localStorage.removeItem('accessToken'); } catch (e) {}
    // preserve friendly relative redirect
    window.location.href = './login.html';
}

// If token is missing or expired, redirect immediately
if (!jwt || isTokenExpired(jwt)) {
    redirectToLogin();
}

function loadUser(){
    const xhttp = new XMLHttpRequest();//เรียก api
    xhttp.open("GET","/api/auth");//method open + url ของ api ฐานข้อมูล
    xhttp.setRequestHeader("Authorization","Bearer "+jwt);//ส่ง token
    xhttp.send();
    xhttp.onreadystatechange = function(){//callback เรียกค่าที่ถูกส่งกลับมาจาก api
        if (this.readyState == 4){
            if (this.status === 200) {
                try {
                    const objects = JSON.parse(this.responseText || '{}');
                    const user = objects.user;
                    if (user && document.getElementById("displayname")) {
                        document.getElementById("displayname").innerHTML = user.username;
                    }
                } catch (e) {
                    console.error('Failed parsing /api/auth response', e, this.responseText);
                    // fallback: redirect to login to force re-auth
                    redirectToLogin();
                }
            } else if (this.status === 401 || this.status === 403) {
                // Token invalid or expired on server side
                redirectToLogin();
            } else {
                console.error("Failed to load user:", this.status, this.responseText);
            }
        }
    }
}
loadUser();

function logout(){
    try { localStorage.removeItem("jwt"); } catch (e) {}
    redirectToLogin();
}