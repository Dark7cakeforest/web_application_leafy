document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.add-plant-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('accessToken'); // adjust key if different
        if (!token) {
            alert('Unauthorized. Please log in.');
            return;
        }

        const imageInput = document.getElementById('image');
        const file = imageInput && imageInput.files && imageInput.files[0];

        try {
            let imagePath = '';
            if (file) {
                const fd = new FormData();
                fd.append('image', file);

                const upRes = await fetch('http://localhost:3001/api/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: fd
                });

                if (!upRes.ok) {
                    const err = await upRes.json().catch(() => ({}));
                    throw new Error(err.error || err.msg || 'Image upload failed');
                }

                const upJson = await upRes.json();
                imagePath = upJson.imagePath || '';
            }

            // build payload from form fields
            const payload = {
                image_leaf_path: imagePath,
                name: document.getElementById('name').value.trim(),
                common_name: document.getElementById('common_name').value.trim(),
                scientific_name: document.getElementById('scientific_name').value.trim(),
                family: document.getElementById('family').value.trim(),
                medicinal_benefits: document.getElementById('medicinal_benefits').value.trim(),
                nutritional_benefits: document.getElementById('nutritional_benefits').value.trim(),
                // example: send an empty object or build from additional inputs
                nutritional_value: {} 
            };

            const res = await fetch('http://localhost:3001/api/insert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || err.msg || 'Insert failed');
            }

            const data = await res.json();
            alert('Saved successfully');
            // ปิด modal
            const overlay = document.getElementById('addPlantOverlay');
            if (overlay) {
                overlay.classList.remove('show');
                overlay.setAttribute('aria-hidden','true');
                document.body.classList.remove('modal-open');
            }
            // รีโหลดหน้า
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('Error: ' + err.message);
        }
    });
});