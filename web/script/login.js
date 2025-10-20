let jwt = localStorage.getItem("jwt")//ดึงค่า jwt ใน localstorageที่เก็บข้อมูล ตัวแปร ค่าต่าง ๆในเว็บ
if (jwt != null){//loginแล้วเด้งไปหน้า index
    window.location.href = './index.html'
}

async function login(){
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Helper to perform XHR and handle non-JSON responses gracefully
    const sendLogin = (url) => new Promise((resolve, reject) => {
        const xhttp = new XMLHttpRequest();
        xhttp.open('POST', url);
        xhttp.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        xhttp.onreadystatechange = function() {
            if (this.readyState !== 4) return;
            // if server returned empty body (e.g., Live Server 405), avoid JSON.parse crash
            const text = (this.responseText || '').trim();
            let json = null;
            if (text) {
                try {
                    json = JSON.parse(text);
                } catch (err) {
                    // return raw text for debugging
                    return reject({ status: this.status, raw: text, err });
                }
            }
            resolve({ status: this.status, body: json });
        };
        xhttp.onerror = () => reject(new Error('Network error'));
        xhttp.send(JSON.stringify({ username, password }));
    });

    try {
        // Try a list of candidate endpoints in order. This handles running the static files under Live Server
        // (which will respond 405 to POST /api/login) as well as the API running on localhost:3001 or 127.0.0.1:3001.
        const candidates = ['/api/login', 'http://127.0.0.1:3001/api/login', 'http://localhost:3001/api/login'];
        let res = null;
        let lastErr = null;

        for (const url of candidates) {
            try {
                res = await sendLogin(url);
            } catch (e) {
                // Keep last error for diagnostics and continue to next candidate
                lastErr = e;
                continue;
            }
            // If we got a response and it's not a 405/404 and has a JSON body or a 200/201-ish status, accept it
            if (res && res.status && res.status < 400 && res.body) break;
            // If server returned JSON error payload, accept and break so client can show the message
            if (res && res.body && res.status >= 400) break;
            // Otherwise try next candidate
            lastErr = { status: res && res.status, raw: res && res.raw };
            res = null;
        }

        if (!res || !res.body) {
            // If still no usable response, surface a helpful message with diagnostics
            const details = lastErr ? `status=${lastErr.status || 'n/a'} raw=${lastErr.raw || 'no body'}` : 'no response';
            Swal.fire('Login failed', `Could not reach API. Tried /api/login and local backend. ${details}`, 'error');
            return false;
        }

        const objects = res.body;
        if (objects['status'] == 'ok'){
            localStorage.setItem('jwt',objects['accessToken']);
            Swal.fire({ title: objects['message'], icon: 'success' }).then((result) => {
                if (result.isConfirmed) window.location.href = './index.html';
            });
        } else {
            Swal.fire({ title: objects['status'], text: objects['message'], icon: 'error' });
        }
    } catch (err) {
        console.error('Login error', err);
        Swal.fire('Login error', err.message || JSON.stringify(err), 'error');
    }
    return false;
}