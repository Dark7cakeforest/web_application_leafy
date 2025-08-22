    const el1 = document.querySelector('.separatePlant');
    const el2 = document.querySelector('.allOfList');
    const el3 = document.querySelector('.selectedPlant');

function showPerPlant() {
        if (!el1) return;
            el1.style.display = 'inline-block';
            el2.style.display = 'none';
            el3.style.display = 'none';
}

function showAll() {
        if (!el2) return;
            el1.style.display = 'none';
            el2.style.display = 'inline-block';
            el3.style.display = 'none';
        }

function showOne() {
        if (!el3) return;
            el1.style.display = 'none';
            el2.style.display = 'none';
            el3.style.display = 'inline-block';
        }