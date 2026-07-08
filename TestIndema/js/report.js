function getReportData(range, machineId) {
  const lang = state.language || 'vi';
  let factor = 1.0;
  if (machineId !== 'all') {
    factor = 0.1;
    const num = parseInt(machineId);
    factor = factor * (0.8 + (num % 5) * 0.1);
  }
  
  if (range === '7d') {
    factor = factor * 7;
  } else if (range === 'month') {
    factor = factor * 30;
  }
  
  const strokes = Math.round(128402 * factor);
  const uptime = parseFloat((22.4 * factor).toFixed(1));
  const downtime = parseFloat((1.6 * factor).toFixed(1));
  const maintenance = parseFloat((downtime * 0.375).toFixed(1));
  const incident = parseFloat((downtime * 0.625).toFixed(1));
  
  let oee = 93.3;
  if (machineId !== 'all') {
    const num = parseInt(machineId);
    oee = 90 + (num * 1.3) % 9;
  }
  
  let labels = [];
  let prodData = [];
  let errData = [];
  
  if (range === '24h') {
    labels = ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
    prodData = [75, 80, 72, 85, 78, 70];
    errData = [0, 15, 0, 0, 10, 0];
  } else if (range === '7d') {
    labels = lang === 'vi' 
      ? ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    prodData = [120, 125, 118, 130, 122, 115, 95];
    errData = [5, 8, 2, 4, 12, 0, 15];
  } else {
    labels = lang === 'vi'
      ? ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4']
      : ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    prodData = [450, 480, 460, 490];
    errData = [25, 15, 30, 10];
  }
  
  if (machineId !== 'all') {
    prodData = prodData.map(v => Math.round(v * 0.1));
    errData = errData.map(v => Math.round(v * 0.1));
  }
  
  const baseErrors = Math.round(24 * factor);
  const mouldErrors = Math.round(baseErrors * 0.5);
  const pressureErrors = Math.round(baseErrors * 0.33);
  const otherErrors = baseErrors - mouldErrors - pressureErrors;
  
  let tableRows = [];
  const statusCompleted = lang === 'vi' ? 'Hoàn thành' : 'Completed';
  const statusMaint = lang === 'vi' ? 'Đang bảo trì' : 'Maintenance';
  const allMachines = lang === 'vi' ? 'Tất cả' : 'All';

  if (range === '24h') {
    tableRows = [
      { shift: lang === 'vi' ? 'Ca Sáng (06:00 - 14:00)' : 'Morning Shift (06:00 - 14:00)', machine: machineId === 'all' ? (lang === 'vi' ? 'Machine P-01' : 'Machine P-01') : `Machine P-${machineId}`, strokes: Math.round(42150 * factor * 10), uptime: '7.8h', downtime: '12m', oee: '96.4%', status: statusCompleted, statusClass: 'badge-running' },
      { shift: lang === 'vi' ? 'Ca Sáng (06:00 - 14:00)' : 'Morning Shift (06:00 - 14:00)', machine: machineId === 'all' ? (lang === 'vi' ? 'Machine P-02' : 'Machine P-02') : `Machine P-${machineId}`, strokes: Math.round(38900 * factor * 10), uptime: '7.2h', downtime: '48m', oee: '89.2%', status: statusMaint, statusClass: 'badge-info' },
      { shift: lang === 'vi' ? 'Ca Chiều (14:00 - 22:00)' : 'Afternoon Shift (14:00 - 22:00)', machine: machineId === 'all' ? (lang === 'vi' ? 'Machine P-01' : 'Machine P-01') : `Machine P-${machineId}`, strokes: Math.round(47352 * factor * 10), uptime: '7.4h', downtime: '36m', oee: '94.1%', status: statusCompleted, statusClass: 'badge-running' }
    ];
  } else if (range === '7d') {
    tableRows = [
      { shift: lang === 'vi' ? 'Tuần này - Ca Sáng' : 'This Week - Morning Shift', machine: machineId === 'all' ? allMachines : `Machine P-${machineId}`, strokes: Math.round(252150 * factor), uptime: '48.5h', downtime: '2.1h', oee: '95.2%', status: statusCompleted, statusClass: 'badge-running' },
      { shift: lang === 'vi' ? 'Tuần này - Ca Chiều' : 'This Week - Afternoon Shift', machine: machineId === 'all' ? allMachines : `Machine P-${machineId}`, strokes: Math.round(238900 * factor), uptime: '46.2h', downtime: '4.8h', oee: '91.8%', status: statusCompleted, statusClass: 'badge-running' },
      { shift: lang === 'vi' ? 'Tuần này - Ca Tối' : 'This Week - Night Shift', machine: machineId === 'all' ? allMachines : `Machine P-${machineId}`, strokes: Math.round(187352 * factor), uptime: '40.4h', downtime: '8.6h', oee: '88.5%', status: statusCompleted, statusClass: 'badge-running' }
    ];
  } else {
    tableRows = [
      { shift: lang === 'vi' ? 'Tháng này - Ca Sáng' : 'This Month - Morning Shift', machine: machineId === 'all' ? allMachines : `Machine P-${machineId}`, strokes: Math.round(1025120 * factor), uptime: '198.5h', downtime: '8.4h', oee: '96.1%', status: statusCompleted, statusClass: 'badge-running' },
      { shift: lang === 'vi' ? 'Tháng này - Ca Chiều' : 'This Month - Afternoon Shift', machine: machineId === 'all' ? allMachines : `Machine P-${machineId}`, strokes: Math.round(987200 * factor), uptime: '190.2h', downtime: '16.8h', oee: '93.4%', status: statusCompleted, statusClass: 'badge-running' },
      { shift: lang === 'vi' ? 'Tháng này - Ca Tối' : 'This Month - Night Shift', machine: machineId === 'all' ? allMachines : `Machine P-${machineId}`, strokes: Math.round(847350 * factor), uptime: '180.4h', downtime: '25.6h', oee: '89.7%', status: statusCompleted, statusClass: 'badge-running' }
    ];
  }
  
  return {
    strokes: strokes.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US'),
    uptime,
    downtime,
    maintenance: maintenance > 0 ? (maintenance >= 1 ? `${maintenance.toFixed(1)}h` : `${Math.round(maintenance * 60)}m`) : '0m',
    incident: incident > 0 ? (incident >= 1 ? `${incident.toFixed(1)}h` : `${Math.round(incident * 60)}m`) : '0m',
    oee: oee.toFixed(1),
    labels,
    prodData,
    errData,
    baseErrors,
    mouldErrors,
    pressureErrors,
    otherErrors,
    tableRows
  };
}

function renderReportView() {
  const lang = state.language || 'vi';
  const data = getReportData(state.reportTimeRange, state.reportMachineId);
  
  document.getElementById('r-kpi-strokes').textContent = data.strokes;
  const hourText = lang === 'vi' ? 'giờ' : 'hours';
  document.getElementById('r-kpi-uptime').innerHTML = `${data.uptime} <span class="unit">${hourText}</span>`;
  document.getElementById('r-kpi-uptime-progress').style.width = `${data.oee}%`;
  
  const uptimeDescText = lang === 'vi' ? 'Hiệu suất khả dụng: ' : 'Uptime efficiency: ';
  document.getElementById('r-kpi-uptime-desc').textContent = `${uptimeDescText}${data.oee}%`;
  document.getElementById('r-kpi-downtime').innerHTML = `${data.downtime} <span class="unit">${hourText}</span>`;
  document.getElementById('r-kpi-dt-maintenance').textContent = data.maintenance;
  document.getElementById('r-kpi-dt-incident').textContent = data.incident;
  
  const barCtx = document.getElementById('operating-performance-chart');
  if (barCtx) {
    if (operatingChartInstance) {
      operatingChartInstance.destroy();
    }
    operatingChartInstance = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: lang === 'vi' ? 'Sản xuất' : 'Production',
            data: data.prodData,
            backgroundColor: '#00e676',
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: lang === 'vi' ? 'Lỗi kĩ thuật' : 'Technical Errors',
            data: data.errData,
            backgroundColor: 'rgba(255, 61, 0, 0.4)',
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: {
              display: false
            },
            ticks: {
              color: '#8f9cae',
              font: {
                family: 'inherit',
                size: 11
              }
            }
          },
          y: {
            stacked: true,
            grid: {
              color: '#16223f'
            },
            ticks: {
              color: '#8f9cae',
              font: {
                family: 'inherit',
                size: 11
              }
            }
          }
        }
      }
    });
  }

  document.getElementById('r-total-errors-text').textContent = data.baseErrors;
  
  const pieCtx = document.getElementById('error-distribution-chart');
  if (pieCtx) {
    if (errorChartInstance) {
      errorChartInstance.destroy();
    }
    
    const errorDataValues = data.baseErrors > 0 ? [data.mouldErrors, data.pressureErrors, data.otherErrors] : [1];
    const errorDataColors = data.baseErrors > 0 ? ['#00d2ff', '#ff3d00', '#8f9cae'] : ['#16223f'];
    const pieLabels = lang === 'vi' 
      ? ['Lỗi khuôn dập', 'Áp suất thấp', 'Khác']
      : ['Mould Errors', 'Low Pressure', 'Other'];
    
    errorChartInstance = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: pieLabels,
        datasets: [{
          data: errorDataValues,
          backgroundColor: errorDataColors,
          borderWidth: 0,
          borderRadius: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '85%',
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
    
    const legendContainer = document.getElementById('r-error-legend-container');
    if (legendContainer) {
      legendContainer.innerHTML = `
        <div class="r-legend-row">
          <div class="r-legend-lbl-group">
            <span class="r-legend-square" style="background-color: #00d2ff;"></span>
            <span>${pieLabels[0]}</span>
          </div>
          <span class="r-legend-val">${data.mouldErrors}</span>
        </div>
        <div class="r-legend-row">
          <div class="r-legend-lbl-group">
            <span class="r-legend-square" style="background-color: #ff3d00;"></span>
            <span>${pieLabels[1]}</span>
          </div>
          <span class="r-legend-val">${data.pressureErrors}</span>
        </div>
        <div class="r-legend-row">
          <div class="r-legend-lbl-group">
            <span class="r-legend-square" style="background-color: #8f9cae;"></span>
            <span>${pieLabels[2]}</span>
          </div>
          <span class="r-legend-val">${data.otherErrors}</span>
        </div>
      `;
    }
  }

  const tableBody = document.getElementById('report-table-body');
  if (tableBody) {
    tableBody.innerHTML = '';
    data.tableRows.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.shift}</td>
        <td>${row.machine}</td>
        <td>${row.strokes.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')}</td>
        <td>${row.uptime}</td>
        <td style="color: ${row.downtime !== '0m' && row.downtime !== '12m' ? 'rgba(255, 61, 0, 0.8)' : 'var(--text-primary)'}">${row.downtime}</td>
        <td style="color: ${parseFloat(row.oee) >= 92 ? 'var(--status-running)' : 'var(--text-primary)'}; font-weight: 700;">${row.oee}</td>
        <td><span class="badge ${row.statusClass}">${row.status}</span></td>
      `;
      tableBody.appendChild(tr);
    });
  }
}

function initReportControls() {
  const timeSegmentContainer = document.getElementById('report-time-segments');
  if (timeSegmentContainer) {
    const btns = timeSegmentContainer.querySelectorAll('.segment-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.reportTimeRange = btn.getAttribute('data-range');
        renderReportView();
      });
    });
  }

  const machineSelect = document.getElementById('report-machine-select');
  if (machineSelect) {
    machineSelect.addEventListener('change', (e) => {
      state.reportMachineId = e.target.value;
      renderReportView();
    });
  }

  const exportBtn = document.getElementById('report-export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const data = getReportData(state.reportTimeRange, state.reportMachineId);
      
      let csvContent = "\uFEFF";
      csvContent += "CA LÀM VIỆC,MÁY DẬP,STROKE COUNT,UPTIME,DOWNTIME,HIỆU SUẤT OEE,TRẠNG THÁI\r\n";
      
      data.tableRows.forEach(row => {
        csvContent += `"${row.shift}","${row.machine}","${row.strokes}","${row.uptime}","${row.downtime}","${row.oee}","${row.status}"\r\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `bao_cao_hieu_suat_ca_${state.reportTimeRange}_${state.reportMachineId}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  const historyLink = document.getElementById('report-view-history-link');
  if (historyLink) {
    historyLink.addEventListener('click', (e) => {
      e.preventDefault();
      const historyTab = document.querySelector('[data-tab="history"]');
      if (historyTab) {
        historyTab.click();
      }
    });
  }
}

// Base alarms dataset (initial static mock alarms matching the image)
let alarmsData = [
  { id: 'a1', time: '14:22:15', date: '12/10/2024', severity: 'critical', severityText: 'Nghiêm trọng', code: 'ERR-DOWNTIME-902', machine: 'MÁY ÉP #08', desc: 'Áp suất thủy lực vượt ngưỡng cho phép (185 bar). Hệ thống tự động ngắt khẩn cấp.', status: 'processing', statusText: 'Đang xử lý' },
  { id: 'a2', time: '14:10:45', date: '12/10/2024', severity: 'warning', severityText: 'Cảnh báo', code: 'MAINT-STROKE-COUNT', machine: 'MÁY CẮT #02', desc: 'Số nhịp đạt 500,000. Yêu cầu thay dầu bôi trơn và kiểm tra lưỡi cắt.', status: 'scheduled', statusText: 'Đã lên lịch' },
  { id: 'a3', time: '13:55:02', date: '12/10/2024', severity: 'info', severityText: 'Thông tin', code: 'SYS-UPTIME-NOTIF', machine: 'TOÀN HỆ THỐNG', desc: 'Hoàn tất sao lưu dữ liệu tự động hàng ngày. Trạng thái ổn định.', status: 'resolved', statusText: 'Hoàn tất' },
  { id: 'a4', time: '13:42:20', date: '12/10/2024', severity: 'critical', severityText: 'Nghiêm trọng', code: 'CONN-LOST-04', machine: 'CẢM BIẾN NHIỆT #11', desc: 'Mất kết nối với cảm biến nhiệt độ vùng lò hơi. Cảnh báo cháy tiềm ẩn.', status: 'emergency', statusText: 'Khẩn cấp' },
  { id: 'a5', time: '11:30:15', date: '12/10/2024', severity: 'warning', severityText: 'Cảnh báo', code: 'TEMP-HIGH-02', machine: 'MÁY DẬP #03', desc: 'Nhiệt độ động cơ vượt ngưỡng 75°C. Cần kiểm tra hệ thống quạt tản nhiệt.', status: 'resolved', statusText: 'Hoàn tất' },
  { id: 'a6', time: '09:15:00', date: '12/10/2024', severity: 'info', severityText: 'Thông tin', code: 'SYS-REPORT-AUTO', machine: 'TOÀN HỆ THỐNG', desc: 'Gửi báo cáo hiệu suất tự động hàng tuần về email quản trị thành công.', status: 'resolved', statusText: 'Hoàn tất' },
  { id: 'a7', time: '08:45:10', date: '12/10/2024', severity: 'critical', severityText: 'Nghiêm trọng', code: 'E-STOP-PRESSED', machine: 'MÁY DẬP #05', desc: 'Nút nhấn dừng khẩn cấp bị kích hoạt thủ công từ bảng điều khiển.', status: 'resolved', statusText: 'Hoàn tất' }
];
