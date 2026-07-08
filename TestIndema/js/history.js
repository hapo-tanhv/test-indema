function renderHistoryTable() {
  const tableBody = document.getElementById('history-table-body');
  const tableInfo = document.getElementById('history-table-info');
  const pagination = document.getElementById('history-pagination');
  if (!tableBody || !tableInfo || !pagination) return;

  tableBody.innerHTML = '';
  
  const query = state.historySearchQuery.toLowerCase().trim();
  const filteredRecords = historyData.filter(r => {
    const machineName = `Máy số ${r.machineId}`.toLowerCase();
    const machineIdStr = `máy dập ${r.machineId}`.toLowerCase();
    const matchesSearch = r.machineId.includes(query) || machineName.includes(query) || machineIdStr.includes(query);

    let matchesDate = true;
    if (state.historyStartDate && state.historyEndDate) {
      const parts = r.start.split(' ')[0].split('/');
      const recordDate = new Date(parts[2], parts[1] - 1, parts[0]);
      recordDate.setHours(0,0,0,0);
      
      const start = new Date(state.historyStartDate);
      start.setHours(0,0,0,0);
      const end = new Date(state.historyEndDate);
      end.setHours(0,0,0,0);
      
      matchesDate = recordDate >= start && recordDate <= end;
    }

    const matchesStatus = state.historyStatusFilter === 'all' || r.status === state.historyStatusFilter;

    let matchesQuality = true;
    if (state.historyQualityFilter === 'high') {
      matchesQuality = r.quality >= 95;
    } else if (state.historyQualityFilter === 'low') {
      matchesQuality = r.quality < 95;
    }

    return matchesSearch && matchesDate && matchesStatus && matchesQuality;
  });

  const totalRecords = filteredRecords.length;
  const totalPages = Math.ceil(totalRecords / state.historyRowsPerPage) || 1;

  if (state.historyCurrentPage > totalPages) {
    state.historyCurrentPage = totalPages;
  }
  if (state.historyCurrentPage < 1) {
    state.historyCurrentPage = 1;
  }

  const startIndex = (state.historyCurrentPage - 1) * state.historyRowsPerPage;
  const endIndex = Math.min(startIndex + state.historyRowsPerPage, totalRecords);
  const pageRecords = filteredRecords.slice(startIndex, endIndex);

  const lang = state.language || 'vi';
  if (totalRecords === 0) {
    tableInfo.textContent = lang === 'vi' ? 'Hiển thị 0 - 0 của 0 bản ghi' : 'Showing 0 - 0 of 0 records';
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-secondary);">
          ${lang === 'vi' ? 'Không tìm thấy lịch sử dập máy nào phù hợp.' : 'No matching stamping history found.'}
        </td>
      </tr>
    `;
    pagination.innerHTML = '';
    return;
  }

  const showText = lang === 'vi' ? 'Hiển thị' : 'Showing';
  const ofText = lang === 'vi' ? 'của' : 'of';
  const recordsText = lang === 'vi' ? 'bản ghi' : 'records';
  tableInfo.textContent = `${showText} ${startIndex + 1} - ${endIndex} ${ofText} ${totalRecords} ${recordsText}`;

  pageRecords.forEach(r => {
    const isRunning = r.status === 'running';
    const statusText = isRunning 
      ? (translations[lang].status_completed || 'HOÀN THÀNH') 
      : (translations[lang].status_emergency_stop || 'DỪNG KHẨN CẤP');
    const badgeClass = isRunning ? 'badge-success' : 'badge-danger';
    const progressColorClass = r.quality >= 90 ? 'green' : 'orange';

    const tr = document.createElement('tr');
    const pressText = lang === 'vi' ? 'MÁY DẬP' : 'PRESS';
    tr.innerHTML = `
      <td>
        <span style="font-weight: 700;">${pressText} ${r.machineId}</span>
      </td>
      <td>${r.start}</td>
      <td>${r.end}</td>
      <td style="font-weight: 700; color: #fff;">${r.strokes}</td>
      <td>
        <div class="td-progress-bg">
          <div class="td-progress-fill ${progressColorClass}" style="width: ${r.quality}%"></div>
        </div>
        <span class="td-progress-text">${r.quality}%</span>
      </td>
      <td>
        <span class="${badgeClass}">${statusText}</span>
      </td>
      <td>
        <button class="ml-eye-btn" title="Xem chi tiết máy dập này">
          <svg class="ml-eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      </td>
    `;
    
    const eyeBtn = tr.querySelector('.ml-eye-btn');
    if (eyeBtn) {
      eyeBtn.addEventListener('click', () => {
        state.selectedMachineId = r.machineId;
        
        const overviewCards = document.querySelectorAll('.machine-grid-card');
        overviewCards.forEach(c => {
          if (c.getAttribute('data-machine-id') === r.machineId) {
            c.classList.add('selected');
          } else {
            c.classList.remove('selected');
          }
        });

        const overviewNav = document.querySelector('.nav-item[data-tab="overview"]');
        if (overviewNav) {
          overviewNav.click();
        }
      });
    }

    tableBody.appendChild(tr);
  });

  pagination.innerHTML = '';
  
  const prevBtn = document.createElement('button');
  prevBtn.className = `page-link ${state.historyCurrentPage === 1 ? 'disabled' : ''}`;
  prevBtn.innerHTML = `&lt;`;
  prevBtn.addEventListener('click', () => {
    if (state.historyCurrentPage > 1) {
      state.historyCurrentPage--;
      renderHistoryTable();
    }
  });
  pagination.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `page-link ${state.historyCurrentPage === i ? 'active' : ''}`;
    pageBtn.textContent = i;
    pageBtn.addEventListener('click', () => {
      state.historyCurrentPage = i;
      renderHistoryTable();
    });
    pagination.appendChild(pageBtn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = `page-link ${state.historyCurrentPage === totalPages ? 'disabled' : ''}`;
  nextBtn.innerHTML = `&gt;`;
  nextBtn.addEventListener('click', () => {
    if (state.historyCurrentPage < totalPages) {
      state.historyCurrentPage++;
      renderHistoryTable();
    }
  });
  pagination.appendChild(nextBtn);
}

let weeklyChart = null;

function initWeeklyPerformanceChart() {
  const canvas = document.getElementById('weekly-performance-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (weeklyChart) {
    weeklyChart.destroy();
  }

  const lang = state.language || 'vi';
  const actualData = [11200, 12568, 11800, 13000, 12800, 9500, 8000];
  const targetData = [12000, 12000, 12000, 12000, 12000, 10000, 8000];
  
  const labels = lang === 'vi' 
    ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] 
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  weeklyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: translations[lang].history_legend_actual || 'Thực tế',
          data: actualData,
          backgroundColor: '#00d2ff',
          borderColor: '#00d2ff',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.5
        },
        {
          label: translations[lang].history_legend_target || 'Mục tiêu',
          data: targetData,
          backgroundColor: '#16223f',
          borderColor: '#4e5b6e',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#0c1527',
          titleColor: '#ffffff',
          bodyColor: '#7f91a8',
          borderColor: '#16223f',
          borderWidth: 1,
          padding: 10,
          displayColors: true,
          font: {
            family: "'Outfit', sans-serif"
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#7f91a8',
            font: {
              family: "'Outfit', sans-serif",
              size: 11
            }
          }
        },
        y: {
          grid: {
            color: '#16223f'
          },
          ticks: {
            color: '#7f91a8',
            font: {
              family: "'Outfit', sans-serif",
              size: 11
            },
            callback: function(value) {
              return value >= 1000 ? (value/1000) + 'k' : value;
            }
          }
        }
      }
    }
  });
}

// Global chart instances for Reports view
let operatingChartInstance = null;
let errorChartInstance = null;

function initHistoryControls() {
  const searchInput = document.getElementById('history-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.historySearchQuery = e.target.value;
      state.historyCurrentPage = 1;
      renderHistoryTable();
    });
  }

  const exportBtn = document.getElementById('history-export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      let csvContent = "\uFEFF";
      csvContent += "MÃ MÁY,THỜI GIAN BẮT ĐẦU,THỜI GIAN KẾT THÚC,TỔNG SỐ LẦN DẬP,TỶ LỆ CHẤT LƯỢNG,TRẠNG THÁI\r\n";
      
      historyData.forEach(r => {
        const statusStr = r.status === 'running' ? "HOÀN THÀNH" : "DỪNG KHẨN CẤP";
        csvContent += `MÁY DẬP ${r.machineId},${r.start},${r.end},${r.strokes.replace('.', '')},${r.quality}%,${statusStr}\r\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `bao_cao_lich_su_dap_may_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  const dateInput = document.getElementById('history-date-range');
  if (dateInput) {
    flatpickr(dateInput, {
      mode: "range",
      dateFormat: "d/m/Y",
      defaultDate: ["20/05/2024", "27/05/2024"],
      onReady: function(selectedDates) {
        if (selectedDates.length === 2) {
          state.historyStartDate = selectedDates[0];
          state.historyEndDate = selectedDates[1];
        }
      },
      onChange: function(selectedDates) {
        if (selectedDates.length === 2) {
          state.historyStartDate = selectedDates[0];
          state.historyEndDate = selectedDates[1];
        } else if (selectedDates.length === 0) {
          state.historyStartDate = null;
          state.historyEndDate = null;
        }
        state.historyCurrentPage = 1;
        renderHistoryTable();
      }
    });
  }

  const filterBtn = document.getElementById('history-filter-btn');
  const filterDropdown = document.getElementById('history-filter-dropdown');
  if (filterBtn && filterDropdown) {
    filterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      filterDropdown.classList.toggle('hidden');
    });

    filterDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    const applyBtn = document.getElementById('filter-apply-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const statusRadio = document.querySelector('input[name="filter-status"]:checked');
        const qualityRadio = document.querySelector('input[name="filter-quality"]:checked');

        if (statusRadio) state.historyStatusFilter = statusRadio.value;
        if (qualityRadio) state.historyQualityFilter = qualityRadio.value;

        if (state.historyStatusFilter !== 'all' || state.historyQualityFilter !== 'all') {
          filterBtn.style.borderColor = 'var(--accent-blue)';
          filterBtn.style.color = 'var(--accent-blue)';
        } else {
          filterBtn.style.borderColor = '';
          filterBtn.style.color = '';
        }

        filterDropdown.classList.add('hidden');
        state.historyCurrentPage = 1;
        renderHistoryTable();
      });
    }

    const resetBtn = document.getElementById('filter-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const defaultStatus = document.querySelector('input[name="filter-status"][value="all"]');
        const defaultQuality = document.querySelector('input[name="filter-quality"][value="all"]');

        if (defaultStatus) defaultStatus.checked = true;
        if (defaultQuality) defaultQuality.checked = true;

        state.historyStatusFilter = 'all';
        state.historyQualityFilter = 'all';

        filterBtn.style.borderColor = '';
        filterBtn.style.color = '';

        filterDropdown.classList.add('hidden');
        state.historyCurrentPage = 1;
        renderHistoryTable();
      });
    }
  }

  document.addEventListener('click', () => {
    if (filterDropdown) filterDropdown.classList.add('hidden');
  });
}
