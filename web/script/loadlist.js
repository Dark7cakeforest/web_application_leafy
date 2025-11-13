const RETURN_CONTEXT_KEY = 'listReturnContext';
const TABLE_PAGE_SIZE = 10;
const paginationState = {};
let pendingReturnContext = null;
let correctionPatchCache = null;

function getDateParams() {// ดึงค่าจาก datepickers แล้วแปลงเป็น query string
  const d1 = document.querySelector('.datepick')?.value || '';
  const d2 = document.querySelector('.datepick2')?.value || '';
  const params = new URLSearchParams();

  if (d1 && !d2) params.set('date', d1);
  if (!d1 && d2) params.set('date', d2);
  if (d1 && d2) {
    let start = d1, end = d2;
    if (new Date(end) < new Date(start)) { const t = start; start = end; end = t; }
    params.set('start', start);
    params.set('end', end);
  }
  return params.toString();
}

function getDateValues() {
  return {
    datepick: document.querySelector('.datepick')?.value || '',
    datepick2: document.querySelector('.datepick2')?.value || ''
  };
}

function formatIsCorrect(value) {
  if (value === 1 || value === '1') return 'ถูกต้อง';
  if (value === 0 || value === '0') return 'ผิด';
  return 'ผู้ใช้ยังไม่ให้คะแนน';
}

function buildRowHTML(rowNumber, row, mode) {
  const nameMap = window.__plantNameByClassId || {};
  const mappedName = nameMap[String(row.class_id)] ?? nameMap[row.class_id];
  const plantName = mappedName || row.plant_name || row.class_label || '-';
  const scoreText = formatIsCorrect(row.is_correct);
  const processed = row.processed_time || '-';
  let classIdValue = null;
  if (row.class_id !== null && row.class_id !== undefined && row.class_id !== 'null') {
    const parsed = Number(row.class_id);
    classIdValue = Number.isNaN(parsed) ? null : parsed;
  }
  const classIdLiteral = classIdValue === null ? 'null' : classIdValue;
  return `<tr>
    <td>${rowNumber}</td>
    <td>${plantName}</td>
    <td>${scoreText}</td>
    <td>${processed}</td>
    <td><button onclick="openResultDetail(${row.result_id}, '${mode}', ${classIdLiteral})">แก้ไข</button></td>
  </tr>`;
}

function updatePaginationControls(tbodyId) {
  const state = paginationState[tbodyId];
  if (!state) return;
  const { rows, pageSize, paginationId, currentPage } = state;
  const container = paginationId ? document.getElementById(paginationId) : null;
  if (!container) return;
  const totalPages = Math.ceil(rows.length / pageSize);
  if (totalPages <= 1) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }
  const isAllPagination = container.id === 'pagination-queryAllResult';
  const dropdown = document.getElementById('dateperiod');
  const shouldShow = !isAllPagination || (dropdown && dropdown.value === 'all');

  container.innerHTML = '';
  container.style.display = shouldShow ? 'flex' : 'none';
  container.style.gap = '0.5rem';
  container.style.justifyContent = 'center';
  container.style.marginTop = '0.75rem';

  const makeButton = (label, page, disabled = false, isActive = false) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.disabled = disabled;
    if (isActive) btn.classList.add('active');
    btn.addEventListener('click', () => renderTablePage(tbodyId, page));
    return btn;
  };

  const MAX_VISIBLE = 10;
  const startPage = Math.max(1, Math.min(currentPage, totalPages - MAX_VISIBLE + 1));
  const endPage = Math.min(totalPages, startPage + MAX_VISIBLE - 1);

  container.appendChild(makeButton('<', currentPage - 1, currentPage === 1));
  for (let i = startPage; i <= endPage; i++) {
    container.appendChild(makeButton(String(i), i, false, i === currentPage));
  }
  container.appendChild(makeButton('>', currentPage + 1, currentPage === totalPages));
}

function renderTablePage(tbodyId, page) {
  const state = paginationState[tbodyId];
  if (!state) return;
  const { rows, pageSize, context } = state;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const targetPage = Math.min(Math.max(page, 1), totalPages);
  state.currentPage = targetPage;

  const offset = (targetPage - 1) * pageSize;
  const subset = rows.slice(offset, offset + pageSize);
  const html = subset.map((row, idx) => buildRowHTML(offset + idx + 1, row, context.mode)).join('');
  const tbody = document.getElementById(tbodyId);
  if (tbody) tbody.innerHTML = html;
  updatePaginationControls(tbodyId);
}

function renderRows(tbodyId, rows, context = {}) {
  const patchedRows = applyCorrectionPatch(rows);
  const paginationId = context.paginationId || null;
  paginationState[tbodyId] = {
    rows: patchedRows,
    context,
    paginationId,
    pageSize: TABLE_PAGE_SIZE,
    currentPage: 1
  };
  const initialPage = context.initialPage || 1;
  renderTablePage(tbodyId, initialPage);
}

function refreshTableDisplays() {
  Object.keys(paginationState).forEach(tbodyId => {
    const state = paginationState[tbodyId];
    if (state) {
      renderTablePage(tbodyId, state.currentPage || 1);
    }
  });
}
window.refreshListTablesWithNames = refreshTableDisplays;

function openResultDetail(resultId, mode, classId) {
  const numericResultId = Number(resultId);
  if (!Number.isInteger(numericResultId) || numericResultId <= 0) {
    console.error('Invalid result_id passed to openResultDetail:', resultId, mode, classId);
    alert('ไม่พบข้อมูลรายละเอียด');
    return;
  }
  const normalizedClassId =
    classId === null || classId === undefined || classId === 'null'
      ? null
      : Number(classId);
  const dropdownVal = document.getElementById('dateperiod')?.value || 'perPlant';
  const dates = getDateValues();
  const tbodyId = mode === 'all' ? 'queryAllResult' : 'plantSelect';
  const currentPage = paginationState[tbodyId]?.currentPage || 1;
  const context = {
    mode,
    classId: normalizedClassId,
    dropdown: dropdownVal,
    page: currentPage,
    ...dates
  };
  sessionStorage.setItem(RETURN_CONTEXT_KEY, JSON.stringify(context));
  window.location.href = `detail.html?result_id=${numericResultId}`;
}
window.openResultDetail = openResultDetail;

function loadAllTable(extraContext = {}) {
  const qs = getDateParams();
  const url = '/api/results' + (qs ? ('?' + qs) : '');
  fetch(url, { cache: 'no-store' })
    .then(r => r.json())
    .then(data => {
      showAll();
      const list = applyCorrectionPatch(data.ai_result || []);
      const context = {
        mode: 'all',
        paginationId: 'pagination-queryAllResult',
        initialPage: extraContext.initialPage
          || (pendingReturnContext && pendingReturnContext.mode === 'all'
              ? (pendingReturnContext.page || 1)
              : 1)
      };
      renderRows('queryAllResult', list, context);
      const perPlantPag = document.getElementById('pagination-plantSelect');
      if (perPlantPag) perPlantPag.style.display = 'none';
      const dd = document.getElementById('dateperiod');
      if (dd && dd.value === 'all') {
        const allPag = document.getElementById('pagination-queryAllResult');
        if (allPag) allPag.style.display = 'flex';
      }
      if (pendingReturnContext && pendingReturnContext.mode === 'all') {
        pendingReturnContext = null;
      }
    })
    .catch(err => console.error("Error fetching result data:", err));
}

function loadPerPlantTable(classId, extraContext = {}) {
  if (!classId) return;
  window.__lastClassIdForPerPlant = classId;
  const qs = getDateParams();
  const url = '/api/results' + (qs ? ('?' + qs) : '');
  fetch(url, { cache: 'no-store' })
    .then(r => r.json())
    .then(data => {
      showPerPlant();
      let list = applyCorrectionPatch(data.ai_result || []);
      list = list.filter(x => String(x.class_id) === String(classId));
      const context = {
        mode: 'perPlant',
        paginationId: 'pagination-plantSelect',
        initialPage: extraContext.initialPage
          || (pendingReturnContext && pendingReturnContext.mode === 'perPlant'
              ? (pendingReturnContext.page || 1)
              : 1)
      };
      renderRows('plantSelect', list, context);
      const allPag = document.getElementById('pagination-queryAllResult');
      if (allPag) allPag.style.display = 'none';
      if (pendingReturnContext && pendingReturnContext.mode === 'perPlant') {
        pendingReturnContext = null;
      }
    })
    .catch(err => console.error("Error fetching result data:", err));
}
window.loadPerPlantTable = loadPerPlantTable;

function applyDateValues(ctx) {
  if (!ctx) return;
  const d1 = document.querySelector('.datepick');
  const d2 = document.querySelector('.datepick2');
  if (d1 && ctx.datepick !== undefined) d1.value = ctx.datepick || '';
  if (d2 && ctx.datepick2 !== undefined) d2.value = ctx.datepick2 || '';
}

function restoreListContext() {
  const stored = sessionStorage.getItem(RETURN_CONTEXT_KEY);
  if (!stored) return;
  sessionStorage.removeItem(RETURN_CONTEXT_KEY);
  try {
    pendingReturnContext = JSON.parse(stored);
  } catch (err) {
    console.warn('Failed to parse list return context', err);
    pendingReturnContext = null;
    return;
  }
  if (!pendingReturnContext) return;

  applyDateValues(pendingReturnContext);
  const dd = document.getElementById('dateperiod');
  if (dd && pendingReturnContext.dropdown) {
    dd.value = pendingReturnContext.dropdown;
  }

  if (pendingReturnContext.mode === 'all') {
    showAll();
    loadAllTable();
  } else if (pendingReturnContext.mode === 'perPlant' && pendingReturnContext.classId) {
    showOne(pendingReturnContext.classId);
  }
}

function initList() {
  const ref = document.referrer || '';
  if (!ref.includes('detail.html')) {
    sessionStorage.removeItem(RETURN_CONTEXT_KEY);
  }
  const dd = document.getElementById('dateperiod');
  if (dd) {
    dd.addEventListener('change', (e) => {
      if (e.target.value === 'all') {
        showAll();
        loadAllTable();
      } else {
        showPerPlant();
        const last = window.__lastClassIdForPerPlant;
        if (last) {
          loadPerPlantTable(last);
        }
      }
    });
  }

  const d1 = document.querySelector('.datepick');
  const d2 = document.querySelector('.datepick2');
  const onDateChange = () => {
    if (dd?.value === 'all') {
      loadAllTable();
    } else {
      const last = window.__lastClassIdForPerPlant;
      if (last) loadPerPlantTable(last);
    }
  };
  [d1, d2].forEach(el => el && el.addEventListener('change', onDateChange));

  loadAllTable();
  restoreListContext();
}

initList();

window.addEventListener('pageshow', (event) => {
  if (sessionStorage.getItem('LIST_FORCE_REFRESH') === '1') {
    sessionStorage.removeItem('LIST_FORCE_REFRESH');
    const stored = sessionStorage.getItem(RETURN_CONTEXT_KEY);
    if (stored) {
      try {
        pendingReturnContext = JSON.parse(stored);
      } catch (err) {
        pendingReturnContext = null;
      }
    }
    const mode = pendingReturnContext?.mode;
    if (mode === 'perPlant' && pendingReturnContext.classId) {
      showOne(pendingReturnContext.classId);
      loadPerPlantTable(pendingReturnContext.classId, { initialPage: pendingReturnContext.page || 1 });
    } else {
      showAll();
      loadAllTable({ initialPage: pendingReturnContext?.page || 1 });
    }
  }
});


function loadCorrectionPatch() {
  if (correctionPatchCache !== null) return correctionPatchCache;
  if (typeof sessionStorage === 'undefined') {
    correctionPatchCache = null;
    return correctionPatchCache;
  }
  const stored = sessionStorage.getItem('LIST_CORRECTION_PATCH');
  if (!stored) {
    correctionPatchCache = null;
    return correctionPatchCache;
  }
  try {
    const parsed = JSON.parse(stored);
    if (parsed && parsed.resultId !== undefined) {
      correctionPatchCache = parsed;
    } else {
      correctionPatchCache = null;
    }
  } catch (err) {
    console.warn('Failed to parse LIST_CORRECTION_PATCH', err);
    correctionPatchCache = null;
  }
  return correctionPatchCache;
}

function clearCorrectionPatch() {
  correctionPatchCache = null;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('LIST_CORRECTION_PATCH');
  }
}

function applyCorrectionPatch(rows) {
  const patch = loadCorrectionPatch();
  if (!patch) return rows;
  let applied = false;
  const { resultId, is_correct } = patch;
  const resultIdNum = Number(resultId);
  rows.forEach(row => {
    if (Number(row.result_id) === resultIdNum) {
      row.is_correct = is_correct;
      applied = true;
    }
  });
  if (applied) {
    clearCorrectionPatch();
  }
  return rows;
}

