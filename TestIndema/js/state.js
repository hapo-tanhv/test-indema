// app.js

// 1. Quản lý trạng thái hệ thống (In-memory State)
const state = {
  currentTab: 'overview',
  selectedMachineId: '03',
  selectedMachineListId: '01',
  historySearchQuery: '',
  historyCurrentPage: 1,
  historyRowsPerPage: 5,
  historyStartDate: null,
  historyEndDate: null,
  historyStatusFilter: 'all',
  historyQualityFilter: 'all',
  reportTimeRange: '24h',
  reportMachineId: 'all',
  alarmSearchQuery: '',
  alarmSeverityFilter: 'all',
  alarmCurrentPage: 1,
  alarmRowsPerPage: 5,
  selectedAlarmId: null,
  systemName: 'Dây chuyền sản xuất HP-01',
  operatingArea: 'area2',
  language: 'vi',
  downtimeThresholdWarning: 15,
  downtimeThresholdEmergency: 30,
  efficiencyThresholdWarning: 85,
  efficiencyDelay: 60,
  downtimeAlarmEnabled: true,
  efficiencyAlarmEnabled: true,
  usersData: [
    { name: 'Lê Văn Nam', role: 'Quản lý kỹ thuật (Manager)', initials: 'LN' },
    { name: 'Nguyễn Thị Mai', role: 'Vận hành viên (Operator)', initials: 'NM' }
  ]
};

// Dữ liệu mô phỏng tĩnh của 10 máy dập
const machinesData = {
  '01': { name: 'Máy số 01', sp: 'Vỏ motor A', order: 'LSX-240520-01', strokes: '1.125', dailyTarget: '1.500', totalOrder: '5.000', efficiency: '75%', timeEfficiency: '56.7%', runtime: '04:32:15', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 75, trend: [600, 850, 1125, 950] },
  '02': { name: 'Máy số 02', sp: 'Nắp hộp B', order: 'LSX-240520-03', strokes: '980', dailyTarget: '1.200', totalOrder: '4.000', efficiency: '82%', timeEfficiency: '62%', runtime: '03:58:40', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 82, trend: [400, 650, 980, 800] },
  '03': { name: 'Máy số 03', sp: 'Vỏ motor A', order: 'LSX-240520-01', strokes: '1.256', dailyTarget: '1.500', totalOrder: '5.000', efficiency: '83.7%', timeEfficiency: '64.6%', runtime: '05:10:23', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 83.7, trend: [500, 800, 1256, 1000] },
  '04': { name: 'Máy số 04', sp: 'Đế quạt C', order: 'LSX-240520-02', strokes: '870', dailyTarget: '1.100', totalOrder: '3.200', efficiency: '79%', timeEfficiency: '60%', runtime: '03:20:11', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 79, trend: [300, 500, 870, 700] },
  '05': { name: 'Máy số 05', sp: 'Vỏ motor A', order: 'LSX-240520-01', strokes: '1.030', dailyTarget: '1.200', totalOrder: '4.000', efficiency: '85.8%', timeEfficiency: '66.5%', runtime: '04:15:42', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 85.8, trend: [550, 750, 1030, 900] },
  '06': { name: 'Máy số 06', sp: 'Đế quạt C', order: 'LSX-240520-04', strokes: '560', dailyTarget: '1.000', totalOrder: '3.000', efficiency: '56%', timeEfficiency: '40%', runtime: '02:10:05', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'stopped', load: 56, trend: [560, 560, 560, 560] },
  '07': { name: 'Máy số 07', sp: 'Nắp hộp B', order: 'LSX-240520-05', strokes: '0', dailyTarget: '1.000', totalOrder: '2.500', efficiency: '0%', timeEfficiency: '0%', runtime: '00:00:00', stoptime: '00:00:00', runtimeMax: '08:00:00', status: 'stopped', load: 0, trend: [0, 0, 0, 0] },
  '08': { name: 'Máy số 08', sp: 'Vỏ motor A', order: 'LSX-240520-02', strokes: '760', dailyTarget: '1.000', totalOrder: '3.500', efficiency: '76%', timeEfficiency: '57.0%', runtime: '03:45:18', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 76, trend: [400, 550, 760, 600] },
  '09': { name: 'Máy số 09', sp: 'Nắp hộp B', order: 'LSX-240520-03', strokes: '1.100', dailyTarget: '1.300', totalOrder: '4.500', efficiency: '84.6%', timeEfficiency: '66.8%', runtime: '04:28:33', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'running', load: 84.6, trend: [500, 750, 1100, 950] },
  '10': { name: 'Máy số 10', sp: 'Đế quạt C', order: 'LSX-240520-04', strokes: '320', dailyTarget: '800', totalOrder: '2.800', efficiency: '40%', timeEfficiency: '32.0%', runtime: '01:35:47', stoptime: '00:15:30', runtimeMax: '08:00:00', status: 'stopped', load: 40, trend: [320, 320, 320, 320] }
};

// Bản đồ tiêu đề trang để hỗ trợ cập nhật tiêu đề động đa ngôn ngữ
const pageHeaders = {
  vi: {
    overview: { title: 'TỔNG QUAN HỆ THỐNG', subtitle: 'Giám sát trạng thái 10 máy dập' },
    machine: { title: 'CHI TIẾT MÁY DẬP', subtitle: 'Danh sách và thông số chi tiết từng máy dập' },
    history: { title: 'LỊCH SỬ HOẠT ĐỘNG', subtitle: 'Nhật ký vận hành và các sự kiện hệ thống' },
    report: { title: 'BÁO CÁO HIỆU SUẤT HỆ THỐNG', subtitle: 'Phân tích dữ liệu & Hiệu suất dập' },
    alert: { title: 'CẢNH BÁO & THÔNG BÁO', subtitle: 'TRẠM: HÀ NỘI #04 • TRỰC TUYẾN' },
    settings: { title: 'CÀI ĐẶT HỆ THỐNG', subtitle: 'Quản lý hiệu suất, thời gian vận hành và các ngưỡng cảnh báo cho dây chuyền sản xuất HP-01' }
  },
  en: {
    overview: { title: 'SYSTEM OVERVIEW', subtitle: 'Monitoring status of 10 stamping machines' },
    machine: { title: 'STAMPING MACHINE DETAILS', subtitle: 'Detailed list and specifications of each stamping machine' },
    history: { title: 'OPERATIONAL HISTORY', subtitle: 'Operation log and system events' },
    report: { title: 'SYSTEM PERFORMANCE REPORT', subtitle: 'Data analysis & stamping performance' },
    alert: { title: 'ALARMS & NOTIFICATIONS', subtitle: 'STATION: HANOI #04 • ONLINE' },
    settings: { title: 'SYSTEM SETTINGS', subtitle: 'Manage performance, runtime, and alarm thresholds for production line HP-01' }
  }
};

function getValueY(value) {
  const maxY = 20;
  const minY = 110;
  const maxValue = 1500;
  
  // Tránh giá trị vượt ngưỡng
  const safeVal = Math.min(Math.max(value, 0), maxValue);
  return minY - (safeVal / maxValue) * (minY - maxY);
}

// 4. Cập nhật thông tin chi tiết Máy dập và biểu đồ xu hướng dập tương ứng
const translations = {
  vi: window.translationsVi,
  en: window.translationsEn
};

function translateUI(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      if (el.tagName === 'INPUT' && el.type === 'text') {
        el.placeholder = translations[lang][key];
      } else {
        el.textContent = translations[lang][key];
      }
    }
  });

  const sidebarItems = document.querySelectorAll('.sidebar-nav .nav-item');
  if (sidebarItems.length >= 6) {
    const keys = ['nav_overview', 'nav_machine', 'nav_history', 'nav_report', 'nav_alert', 'nav_settings'];
    sidebarItems.forEach((item, idx) => {
      const span = item.querySelector('span:not(.nav-badge)');
      if (span && keys[idx]) {
        span.textContent = translations[lang][keys[idx]];
      }
    });
  }

  const sidebarStatusLabel = document.querySelector('.status-card-label');
  const sidebarStatusVal = document.querySelector('.status-card-value');
  const sidebarStatusSub = document.querySelector('.status-card-subtext');
  if (sidebarStatusLabel) sidebarStatusLabel.textContent = translations[lang].sys_card_lbl;
  if (sidebarStatusVal) sidebarStatusVal.textContent = translations[lang].sys_card_val;
  if (sidebarStatusSub) sidebarStatusSub.textContent = translations[lang].sys_card_sub;

  const copyrightText = document.querySelector('.sidebar-footer span:first-child');
  if (copyrightText) {
    copyrightText.textContent = `© ${translations[lang].copyright} 2024`;
  }

  // Translate machine grid cards
  renderOverviewGrid();

  // Also update active machine details to refresh name translations
  updateActiveMachineDetails(state.selectedMachineId);

  const machineSelect = document.getElementById('report-machine-select');
  if (machineSelect) {
    machineSelect.options[0].textContent = translations[lang].report_all_presses;
    for (let i = 1; i <= 10; i++) {
      const pressIdStr = i < 10 ? `0${i}` : `${i}`;
      if (machineSelect.options[i]) {
        machineSelect.options[i].textContent = lang === 'vi' ? `Máy dập ${pressIdStr}` : `Stamping Press ${pressIdStr}`;
      }
    }
  }

  const alarmTabs = document.querySelectorAll('#alarm-severity-tabs .alarm-tab-btn');
  if (alarmTabs.length >= 4) {
    const allBadge = document.getElementById('alarm-count-all');
    const countText = allBadge ? allBadge.outerHTML : '';
    alarmTabs[0].innerHTML = `${translations[lang].alarm_filter_severity_all} ${countText}`;
    alarmTabs[1].textContent = translations[lang].alarm_filter_severity_critical;
    alarmTabs[2].textContent = translations[lang].alarm_filter_severity_warning;
    alarmTabs[3].textContent = translations[lang].alarm_filter_severity_info;
  }

  const activeTab = document.querySelector('.nav-item.active');
  if (activeTab) {
    const tabId = activeTab.getAttribute('data-tab');
    updateHeaderTitle(tabId);
    if (tabId === 'machine') {
      const searchInput = document.getElementById('machine-search-input');
      const query = searchInput ? searchInput.value : '';
      renderMachineList(query);
    } else if (tabId === 'history') {
      renderHistoryTable();
      initWeeklyPerformanceChart();
    } else if (tabId === 'report') {
      renderReportView();
    } else if (tabId === 'alert') {
      renderAlarmsView();
    }
  }
}
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-alert';
  toast.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="#00e676" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px;">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}
