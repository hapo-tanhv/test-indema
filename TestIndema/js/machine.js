function renderMachineList(filterQuery = '') {
  const container = document.getElementById('machine-list-container');
  if (!container) return;

  const lang = state.language || 'vi';

  container.innerHTML = '';

  const filteredIds = Object.keys(machinesData).filter(id => {
    const m = machinesData[id];
    const query = filterQuery.toLowerCase().trim();
    return m.name.toLowerCase().includes(query) || id.includes(query);
  });

  if (filteredIds.length === 0) {
    container.innerHTML = `
      <div class="no-results">
        <p>Không tìm thấy máy dập nào phù hợp.</p>
      </div>
    `;
    return;
  }

  filteredIds.forEach(id => {
    const m = machinesData[id];
    const isRunning = m.status === 'running';
    const statusText = isRunning ? 'ĐANG HOẠT ĐỘNG' : 'MÁY DỪNG';
    const statusClass = isRunning ? 'running' : 'stopped';
    const textClass = isRunning ? 'text-running' : 'text-stopped';
    const isSelected = state.selectedMachineListId === id ? 'selected' : '';

    const card = document.createElement('div');
    card.className = `machine-list-card ${isSelected}`;
    card.setAttribute('data-machine-id', id);

    card.innerHTML = `
      <div class="ml-card-header">
        <div class="ml-card-thumb-wrapper">
          <img src="${window.basePath || ''}Image/maydap.jpeg" alt="${m.name}" class="ml-card-thumb">
        </div>
        <div class="ml-card-title-block">
          <div class="ml-card-title-row">
            <h3 class="ml-card-name">${m.name.toUpperCase()}</h3>
            <svg class="ml-card-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </div>
          <div class="ml-card-status">
            <span class="status-indicator-dot ${statusClass}"></span>
            <span class="status-text ${textClass}">${statusText}</span>
          </div>
        </div>
      </div>
      
      <div class="ml-card-body">
        <div class="ml-body-row">
          <div class="ml-body-col">
            <span class="ml-col-label">STROKE COUNT</span>
            <span class="ml-col-value value-highlight">${m.strokes} <span class="unit">lần</span></span>
          </div>
          <div class="ml-body-col">
            <span class="ml-col-label">THỜI GIAN CHẠY</span>
            <span class="ml-col-value">${m.runtime}</span>
          </div>
        </div>
        <div class="ml-body-row" style="margin-top: 15px;">
          <div class="ml-body-col">
            <span class="ml-col-label">THỜI GIAN DỪNG</span>
            <span class="ml-col-value">${m.stoptime}</span>
          </div>
        </div>
      </div>

      <div class="ml-card-footer">
        <div class="ml-load-row">
          <span class="ml-load-label">${translations[lang].machine_list_load.toUpperCase()}</span>
          <span class="ml-load-value">${m.load}%</span>
        </div>
        <div class="ml-load-bar-bg">
          <div class="ml-load-bar-fill" style="width: ${m.load}%"></div>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      document.querySelectorAll('.machine-list-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.selectedMachineListId = id;
    });

    container.appendChild(card);
  });
}

function initSearchAndFilter() {
  const searchInput = document.getElementById('machine-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderMachineList(e.target.value);
    });
  }
}

// 5.2. Khởi tạo bộ dữ liệu lịch sử và các hàm hiển thị điều khiển (Task 5.7)
const historyData = [
  { machineId: '01', start: '20/05/2024 07:30', end: '20/05/2024 16:45', strokes: '1.125', quality: 98, status: 'running' },
  { machineId: '03', start: '20/05/2024 08:15', end: '20/05/2024 17:00', strokes: '1.256', quality: 99, status: 'running' },
  { machineId: '06', start: '20/05/2024 07:00', end: '20/05/2024 11:30', strokes: '560',  quality: 75, status: 'stopped' },
  { machineId: '09', start: '20/05/2024 07:45', end: '20/05/2024 16:00', strokes: '1.100', quality: 95, status: 'running' },
  { machineId: '02', start: '20/05/2024 08:30', end: '20/05/2024 17:30', strokes: '980',  quality: 97, status: 'running' },
  
  { machineId: '04', start: '21/05/2024 08:00', end: '21/05/2024 17:00', strokes: '870',  quality: 96, status: 'running' },
  { machineId: '05', start: '21/05/2024 08:15', end: '21/05/2024 17:30', strokes: '1.030', quality: 97, status: 'running' },
  { machineId: '08', start: '21/05/2024 08:30', end: '21/05/2024 16:45', strokes: '760',  quality: 94, status: 'running' },
  { machineId: '10', start: '21/05/2024 09:00', end: '21/05/2024 13:00', strokes: '320',  quality: 80, status: 'stopped' },
  { machineId: '01', start: '21/05/2024 07:30', end: '21/05/2024 16:45', strokes: '1.120', quality: 98, status: 'running' },
  
  { machineId: '03', start: '22/05/2024 08:15', end: '22/05/2024 17:00', strokes: '1.240', quality: 99, status: 'running' },
  { machineId: '02', start: '22/05/2024 08:30', end: '22/05/2024 17:30', strokes: '990',  quality: 98, status: 'running' },
  { machineId: '06', start: '22/05/2024 07:00', end: '22/05/2024 11:30', strokes: '550',  quality: 76, status: 'stopped' },
  { machineId: '09', start: '22/05/2024 07:45', end: '22/05/2024 16:00', strokes: '1.080', quality: 95, status: 'running' },
  { machineId: '04', start: '22/05/2024 08:00', end: '22/05/2024 17:00', strokes: '860',  quality: 96, status: 'running' },
  
  { machineId: '05', start: '23/05/2024 08:15', end: '23/05/2024 17:30', strokes: '1.020', quality: 97, status: 'running' },
  { machineId: '08', start: '23/05/2024 08:30', end: '23/05/2024 16:45', strokes: '750',  quality: 95, status: 'running' },
  { machineId: '10', start: '23/05/2024 09:00', end: '23/05/2024 13:00', strokes: '310',  quality: 82, status: 'stopped' },
  { machineId: '01', start: '23/05/2024 07:30', end: '23/05/2024 16:45', strokes: '1.130', quality: 98, status: 'running' },
  { machineId: '03', start: '23/05/2024 08:15', end: '23/05/2024 17:00', strokes: '1.250', quality: 99, status: 'running' },
  
  { machineId: '02', start: '24/05/2024 08:30', end: '24/05/2024 17:30', strokes: '985',  quality: 97, status: 'running' },
  { machineId: '06', start: '24/05/2024 07:00', end: '24/05/2024 11:30', strokes: '570',  quality: 74, status: 'stopped' },
  { machineId: '09', start: '24/05/2024 07:45', end: '24/05/2024 16:00', strokes: '1.110', quality: 96, status: 'running' },
  { machineId: '04', start: '24/05/2024 08:00', end: '24/05/2024 17:00', strokes: '880',  quality: 95, status: 'running' }
];
