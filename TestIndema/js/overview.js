function updateActiveMachineDetails(machineId) {
  const machine = machinesData[machineId];
  if (!machine) return;

  // Cập nhật tên và số lượng dập
  const nameEl = document.getElementById('selected-machine-name');
  const strokesEl = document.getElementById('selected-machine-strokes');
  
  if (nameEl) {
    nameEl.textContent = state.language === 'vi' ? `Máy số ${machineId}` : `Press #${machineId}`;
  }
  if (strokesEl) {
    const unitText = translations[state.language].overview_strokes_unit;
    strokesEl.innerHTML = `${machine.strokes} <span class="unit">${unitText}</span>`;
  }

  // Cập nhật trạng thái chạy/dừng và LED
  const dotEl = document.getElementById('selected-machine-dot');
  const statusEl = document.getElementById('selected-machine-status');
  
  if (dotEl && statusEl) {
    if (machine.status === 'running') {
      dotEl.className = 'status-indicator-dot running';
      statusEl.className = 'status-text text-running';
      statusEl.textContent = translations[state.language].active_machine_running;
    } else {
      dotEl.className = 'status-indicator-dot stopped';
      statusEl.className = 'status-text text-stopped';
      statusEl.textContent = translations[state.language].active_machine_stopped;
    }
  }

  // Cập nhật đường cong biểu đồ xu hướng SVG
  const fillPath = document.getElementById('chart-fill-path');
  const trendPath = document.getElementById('chart-trend-path');
  const dots = document.querySelectorAll('.trend-chart-svg circle');

  if (machine.trend && machine.trend.length === 4) {
    const y0 = getValueY(machine.trend[0]);
    const y1 = getValueY(machine.trend[1]);
    const y2 = getValueY(machine.trend[2]);
    const y3 = getValueY(machine.trend[3]);

    // Tạo chuỗi path Cubic Bezier mượt mà nối 4 điểm
    const pathD = `M 40,${y0} C 75,${y0} 75,${y1} 110,${y1} C 145,${y1} 145,${y2} 180,${y2} C 215,${y2} 215,${y3} 250,${y3}`;
    const fillD = `${pathD} L 250,90 L 40,90 Z`;

    if (trendPath) trendPath.setAttribute('d', pathD);
    if (fillPath) fillPath.setAttribute('d', fillD);

    // Cập nhật toạ độ Y của 4 nút chấm tròn dữ liệu
    if (dots.length === 4) {
      dots[0].setAttribute('cy', y0.toString());
      dots[1].setAttribute('cy', y1.toString());
      dots[2].setAttribute('cy', y2.toString());
      dots[3].setAttribute('cy', y3.toString());
    }
  }
}

// 5. Logic click chọn Máy dập trên Grid lưới
function renderOverviewGrid() {
  const container = document.getElementById('overview-machine-grid');
  if (!container) return;

  const lang = state.language || 'vi';
  container.innerHTML = '';

  Object.keys(machinesData).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).forEach(id => {
    const m = machinesData[id];
    const isSelected = (id === state.selectedMachineId) ? 'selected' : '';
    const statusClass = m.status === 'running' ? 'running' : 'stopped';
    const textClass = m.status === 'running' ? 'text-running' : 'text-stopped';
    const statusText = m.status === 'running' 
      ? (lang === 'vi' ? 'ĐANG HOẠT ĐỘNG' : 'RUNNING') 
      : (lang === 'vi' ? 'MÁY DỪNG' : 'STOPPED');

    const card = document.createElement('div');
    card.className = `machine-grid-card ${isSelected}`;
    card.setAttribute('data-machine-id', id);

    // Calculate dynamic percentages
    const strokesNum = parseFloat(m.strokes.replace('.', ''));
    const totalOrderNum = parseFloat(m.totalOrder.replace('.', ''));
    
    const effPct = m.efficiency; // e.g. "75%"
    const orderPct = strokesNum > 0 ? ((strokesNum / totalOrderNum) * 100).toFixed(1) + '%' : '0%';

    // Helper to parse hh:mm:ss to seconds
    const timeToSeconds = (timeStr) => {
      if (!timeStr) return 0;
      const parts = timeStr.split(':');
      if (parts.length !== 3) return 0;
      return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
    };

    const maxSec = timeToSeconds(m.runtimeMax) || 28800;
    const stopSec = timeToSeconds(m.stoptime) || 0;
    const stopPct = ((stopSec / maxSec) * 100).toFixed(1) + '%';

    card.innerHTML = `
      <div class="card-id-badge">${id}</div>
      <div class="machine-card-content">
        <div class="machine-card-header-row">
          <h4 class="machine-card-name">${lang === 'vi' ? `MÁY DẬP ${id}` : `PRESS #${id}`}</h4>
          <div class="machine-card-status">
            <span class="status-indicator-dot ${statusClass}"></span>
            <span class="status-text ${textClass}">${statusText}</span>
          </div>
        </div>
        
        <div class="machine-card-subtitle">
          <span class="subtitle-sp">SP: ${m.sp}</span>
          <span class="subtitle-divider">|</span>
          <span class="subtitle-order">${lang === 'vi' ? 'Lệnh' : 'Order'}: ${m.order}</span>
        </div>
        
        <div class="machine-card-body-row">
          <div class="machine-card-metrics-list">
            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-lbl"><span class="metric-num num-1">①</span> <span class="metric-val">${m.strokes} / ${m.dailyTarget}</span></span>
                <span class="metric-pct">${effPct}</span>
              </div>
              <div class="metric-progress-bg">
                <div class="metric-progress-fill" style="width: ${effPct}"></div>
              </div>
            </div>
            
            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-lbl"><span class="metric-num num-2">②</span> <span class="metric-val">${m.strokes} / ${m.totalOrder}</span></span>
                <span class="metric-pct">${orderPct}</span>
              </div>
              <div class="metric-progress-bg">
                <div class="metric-progress-fill" style="width: ${orderPct}"></div>
              </div>
            </div>
            
            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-lbl"><span class="metric-num num-3">③</span> <span class="metric-val">${effPct}</span></span>
                <span class="metric-desc">${lang === 'vi' ? '= Thực tế / Kế hoạch' : '= Act / Plan'}</span>
              </div>
              <div class="metric-progress-bg">
                <div class="metric-progress-fill" style="width: ${effPct}"></div>
              </div>
            </div>
            
            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-lbl"><span class="metric-num num-4">④</span> <span class="metric-val">${m.timeEfficiency}</span></span>
                <span class="metric-desc">${lang === 'vi' ? '= Thời gian chạy / Thời gian ca' : '= Run / Shift'}</span>
              </div>
              <div class="metric-progress-bg">
                <div class="metric-progress-fill" style="width: ${m.timeEfficiency}"></div>
              </div>
            </div>

            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-lbl"><span class="metric-num num-5">⑤</span> <span class="metric-val">${m.stoptime}</span></span>
                <span class="metric-desc">${lang === 'vi' ? '= Thời gian chạy thử máy' : '= Trial run time'}</span>
              </div>
              <div class="metric-progress-bg">
                <div class="metric-progress-fill" style="width: ${stopPct}"></div>
              </div>
            </div>

            <div class="metric-item">
              <div class="metric-header">
                <span class="metric-lbl"><span class="metric-num num-6">⑥</span> <span class="metric-val">${m.runtime}</span></span>
                <span class="metric-desc">${lang === 'vi' ? '= Thời gian chạy máy' : '= Production run time'}</span>
              </div>
              <div class="metric-progress-bg">
                <div class="metric-progress-fill" style="width: ${m.timeEfficiency}"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      if (id === state.selectedMachineId) return;
      state.selectedMachineId = id;
      document.querySelectorAll('#overview-machine-grid .machine-grid-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      updateActiveMachineDetails(id);
    });

    container.appendChild(card);
  });
}

function initMachineSelection() {
  renderOverviewGrid();
}

// 5.1. Render danh sách máy dập và chức năng tìm kiếm lọc động (Task 5.6)