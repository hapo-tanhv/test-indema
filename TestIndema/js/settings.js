function renderSettingsView() {
  document.getElementById('settings-sys-name').value = state.systemName;
  document.getElementById('settings-op-area').value = state.operatingArea;
  
  document.querySelectorAll('.language-selector-buttons .lang-btn').forEach(btn => {
    if (btn.getAttribute('data-lang') === state.language) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.getElementById('settings-downtime-enabled').checked = state.downtimeAlarmEnabled;
  document.getElementById('settings-downtime-warning').value = state.downtimeThresholdWarning;
  document.getElementById('settings-downtime-emergency').value = state.downtimeThresholdEmergency;

  document.getElementById('settings-efficiency-enabled').checked = state.efficiencyAlarmEnabled;
  document.getElementById('settings-efficiency-warning').value = state.efficiencyThresholdWarning;
  document.getElementById('settings-efficiency-delay').value = state.efficiencyDelay;

  const usersGrid = document.getElementById('settings-users-grid');
  if (usersGrid) {
    usersGrid.innerHTML = '';
    state.usersData.forEach(u => {
      const card = document.createElement('div');
      card.className = 'user-card';
      card.innerHTML = `
        <div class="user-profile-info">
          <div class="user-card-avatar">${u.initials}</div>
          <div class="user-card-details">
            <span class="user-card-name">${u.name}</span>
            <span class="user-card-role">${u.role}</span>
          </div>
        </div>
        <svg class="user-action-dots" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      `;
      usersGrid.appendChild(card);
    });
  }
}

function initSettingsControls() {
  const menuItems = document.querySelectorAll('.settings-menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      menuItems.forEach(m => m.classList.remove('active'));
      item.classList.add('active');
      const secId = item.getAttribute('data-sec');
      const targetSec = document.getElementById(`sec-${secId}`);
      if (targetSec) {
        targetSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });

  const langVi = document.getElementById('lang-btn-vi');
  const langEn = document.getElementById('lang-btn-en');
  
  if (langVi && langEn) {
    langVi.addEventListener('click', () => {
      state.language = 'vi';
      renderSettingsView();
      translateUI('vi');
    });
    langEn.addEventListener('click', () => {
      state.language = 'en';
      renderSettingsView();
      translateUI('en');
    });
  }

  const saveBtn = document.getElementById('settings-btn-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      state.systemName = document.getElementById('settings-sys-name').value;
      state.operatingArea = document.getElementById('settings-op-area').value;
      
      state.downtimeAlarmEnabled = document.getElementById('settings-downtime-enabled').checked;
      state.downtimeThresholdWarning = parseInt(document.getElementById('settings-downtime-warning').value) || 15;
      state.downtimeThresholdEmergency = parseInt(document.getElementById('settings-downtime-emergency').value) || 30;
      
      state.efficiencyAlarmEnabled = document.getElementById('settings-efficiency-enabled').checked;
      state.efficiencyThresholdWarning = parseInt(document.getElementById('settings-efficiency-warning').value) || 85;
      state.efficiencyDelay = parseInt(document.getElementById('settings-efficiency-delay').value) || 60;

      const stationText = document.querySelector('.header-title');
      if (stationText) {
        stationText.textContent = state.systemName.toUpperCase();
      }

      if (state.efficiencyAlarmEnabled) {
        Object.keys(machinesData).forEach(id => {
          const m = machinesData[id];
          const efficiency = m.load || 85;
          if (efficiency < state.efficiencyThresholdWarning && m.status !== 'stopped') {
            const alarmCode = `LOW-EFF-${id}`;
            if (!alarmsData.some(a => a.code === alarmCode && a.status !== 'resolved')) {
              const timeStr = new Date().toLocaleTimeString('vi-VN', { hour12: false });
              const dateStr = new Date().toLocaleDateString('vi-VN');
              alarmsData.unshift({
                id: `low_eff_${id}`,
                time: timeStr,
                date: dateStr,
                severity: 'warning',
                severityText: state.language === 'vi' ? 'Cảnh báo' : 'Warning',
                code: alarmCode,
                machine: `MÁY DẬP #${id}`,
                desc: state.language === 'vi' 
                  ? `Hiệu suất máy dập (${efficiency}%) giảm sâu dưới ngưỡng thiết lập (${state.efficiencyThresholdWarning}%).`
                  : `Machine efficiency (${efficiency}%) dropped below threshold (${state.efficiencyThresholdWarning}%).`,
                status: 'emergency',
                statusText: state.language === 'vi' ? 'Khẩn cấp' : 'Emergency'
              });
            }
          }
        });
      }

      const successMsg = state.language === 'vi' ? translations.vi.toast_save_success : translations.en.toast_save_success;
      showToast(successMsg, 'success');
    });
  }

  const cancelBtn = document.getElementById('settings-btn-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      renderSettingsView();
    });
  }

  const addUserBtn = document.getElementById('settings-btn-add-user');
  const addUserModal = document.getElementById('add-user-modal');
  const addUserCloseBtn = document.getElementById('add-user-close-btn');
  const addUserCancelBtn = document.getElementById('add-user-btn-cancel');
  const addUserSubmitBtn = document.getElementById('add-user-btn-submit');
  
  if (addUserBtn && addUserModal) {
    addUserBtn.addEventListener('click', () => {
      document.getElementById('add-user-name-input').value = '';
      addUserModal.classList.remove('hidden');
    });
  }

  const closeAddUser = () => {
    if (addUserModal) addUserModal.classList.add('hidden');
  };

  if (addUserCloseBtn) addUserCloseBtn.addEventListener('click', closeAddUser);
  if (addUserCancelBtn) addUserCancelBtn.addEventListener('click', closeAddUser);

  if (addUserSubmitBtn) {
    addUserSubmitBtn.addEventListener('click', () => {
      const name = document.getElementById('add-user-name-input').value.trim();
      const role = document.getElementById('add-user-role-select').value;
      if (!name) return;

      const names = name.split(' ');
      const initials = names.length > 1 
        ? (names[0][0] + names[names.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();

      let roleText = 'Vận hành viên (Operator)';
      if (role === 'Manager') roleText = 'Quản lý kỹ thuật (Manager)';
      if (role === 'Admin') roleText = 'Quản trị viên (Administrator)';

      state.usersData.push({
        name: name,
        role: roleText,
        initials: initials
      });

      closeAddUser();
      renderSettingsView();

      const toastMsg = state.language === 'vi' ? translations.vi.toast_add_user_success : translations.en.toast_add_user_success;
      showToast(toastMsg, 'success');
    });
  }
}
