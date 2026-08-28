/**
 * FastTracker PWA - Core Application Logic
 */

// ==========================================
// CONSTANTS & METABOLIC STAGES
// ==========================================
const RING_CIRCUMFERENCE = 2 * Math.PI * 135; // 848.23

const METABOLIC_STAGES = [
  {
    id: 'stage-1',
    name: 'Blood Sugar Rise & Digestion',
    hoursMin: 0,
    hoursMax: 4,
    short: '0–4 hrs',
    desc: 'Body digests recent meal. Blood sugar and insulin levels rise, then begin to stabilize.',
    tag: 'Digestion'
  },
  {
    id: 'stage-2',
    name: 'Insulin Drop & Glycogen Use',
    hoursMin: 4,
    hoursMax: 8,
    short: '4–8 hrs',
    desc: 'Digestion complete. Blood glucose normalizes, insulin drops, and stored glycogen is tapped.',
    tag: 'Insulin Drop'
  },
  {
    id: 'stage-3',
    name: 'Glycogen Depletion & Fat Mobilization',
    hoursMin: 8,
    hoursMax: 12,
    short: '8–12 hrs',
    desc: 'Liver glycogen stores are depleted. The body transitions towards burning stored body fat.',
    tag: 'Fat Mobilization'
  },
  {
    id: 'stage-4',
    name: 'Ketosis Zone Initiation',
    hoursMin: 12,
    hoursMax: 16,
    short: '12–16 hrs',
    desc: 'Ketone production accelerates. Body shifts into fat-burning ketosis for clean cellular fuel.',
    tag: 'Ketosis'
  },
  {
    id: 'stage-5',
    name: 'Autophagy & Deep Ketosis',
    hoursMin: 16,
    hoursMax: 24,
    short: '16–24 hrs',
    desc: 'Cellular cleanup (autophagy) initiates, recycling damaged proteins and mitochondrial components.',
    tag: 'Autophagy'
  },
  {
    id: 'stage-6',
    name: 'Extended Fast & Growth Hormone',
    hoursMin: 24,
    hoursMax: 168,
    short: '24+ hrs',
    desc: 'Autophagy peaks. Growth hormone increases to preserve lean muscle and promote immune regeneration.',
    tag: 'Deep Fast'
  }
];

// ==========================================
// STATE MANAGEMENT
// ==========================================
const defaultState = {
  currentFast: null, // { startTime: ISOString, targetHours: 16, notifiedCompletion: false }
  lastEndedFast: null, // { endTime: ISOString } for eating window
  history: [], // Array of { id, startTime, endTime, targetHours, achieved: bool }
  settings: {
    defaultProtocol: '16',
    customHours: 16,
    notifyComplete: true,
    notifyMilestones: true
  }
};

let appState = loadState();
let timerInterval = null;
let currentTab = 'tab-timer';

function loadState() {
  try {
    const saved = localStorage.getItem('fasttracker_state_v1');
    if (saved) {
      return { ...defaultState, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Error loading state from localStorage', e);
  }
  return JSON.parse(JSON.stringify(defaultState));
}

function saveState() {
  try {
    localStorage.setItem('fasttracker_state_v1', JSON.stringify(appState));
  } catch (e) {
    console.error('Error saving state to localStorage', e);
  }
}

// ==========================================
// DOM ELEMENTS
// ==========================================
const elements = {
  // Timer & Ring
  progressRing: document.getElementById('timer-progress-ring'),
  statusBadge: document.getElementById('fast-status-badge'),
  primaryTime: document.getElementById('timer-primary-time'),
  subInfo: document.getElementById('timer-sub-info'),
  percentText: document.getElementById('timer-progress-percent'),
  stageTicks: document.getElementById('stage-ticks'),
  
  // Meta Times
  metaStartTime: document.getElementById('meta-start-time'),
  metaTargetTime: document.getElementById('meta-target-time'),
  metaTargetDate: document.getElementById('meta-target-date'),
  btnEditStartTime: document.getElementById('btn-edit-start-time'),
  
  // Action Button
  btnMainAction: document.getElementById('btn-main-action'),
  btnMainActionText: document.getElementById('btn-main-action-text'),
  
  // Protocol Selector
  protocolChips: document.getElementById('protocol-chips'),
  chipCustom: document.getElementById('chip-custom'),
  
  // Stages
  stagesTimeline: document.getElementById('stages-timeline'),
  currentStageTitle: document.getElementById('current-stage-title'),
  
  // Header / Badges
  streakCount: document.getElementById('streak-count'),
  notifToggleBtn: document.getElementById('notif-toggle-btn'),
  
  // Nav
  navItems: document.querySelectorAll('.nav-item'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  
  // History Tab
  statTotalFasts: document.getElementById('stat-total-fasts'),
  statCurrentStreak: document.getElementById('stat-current-streak'),
  statLongestStreak: document.getElementById('stat-longest-streak'),
  statAvgHours: document.getElementById('stat-avg-hours'),
  historyItemsContainer: document.getElementById('history-items-container'),
  historyCountBadge: document.getElementById('history-count-badge'),
  btnAddManualFast: document.getElementById('btn-add-manual-fast'),
  
  // Settings
  settingDefaultProtocol: document.getElementById('setting-default-protocol'),
  settingCustomHoursRow: document.getElementById('setting-custom-hours-row'),
  settingCustomHoursInput: document.getElementById('setting-custom-hours-input'),
  settingNotifComplete: document.getElementById('setting-notif-complete'),
  settingNotifMilestones: document.getElementById('setting-notif-milestones'),
  btnExportData: document.getElementById('btn-export-data'),
  inputImportData: document.getElementById('input-import-data'),
  btnClearData: document.getElementById('btn-clear-data'),
  
  // Modals
  modalEditStart: document.getElementById('modal-edit-start'),
  inputEditStartTime: document.getElementById('input-edit-start-time'),
  btnSaveStartTime: document.getElementById('btn-save-start-time'),
  
  modalCustomProtocol: document.getElementById('modal-custom-protocol'),
  inputCustomHours: document.getElementById('input-custom-hours'),
  btnSaveCustomProtocol: document.getElementById('btn-save-custom-protocol'),
  
  modalManualFast: document.getElementById('modal-manual-fast'),
  manualStartInput: document.getElementById('manual-start-input'),
  manualEndInput: document.getElementById('manual-end-input'),
  manualTargetInput: document.getElementById('manual-target-input'),
  btnSaveManualFast: document.getElementById('btn-save-manual-fast'),
  
  toast: document.getElementById('toast')
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initServiceWorker();
  initRingVisuals();
  renderStages();
  bindEvents();
  syncSettingsUI();
  updateStreakUI();
  renderHistory();
  
  // Sync selected protocol chip
  const activeHours = appState.currentFast ? appState.currentFast.targetHours : parseInt(appState.settings.defaultProtocol, 10);
  setActiveProtocolChip(activeHours);

  // Start tick loop
  updateTimerUI();
  timerInterval = setInterval(updateTimerUI, 1000);
});

// ==========================================
// PWA & NOTIFICATIONS
// ==========================================
function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('FastTracker ServiceWorker registered'))
      .catch((err) => console.log('ServiceWorker registration failed', err));
  }
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('Notifications not supported in this browser');
    return false;
  }
  if (Notification.permission === 'granted') {
    elements.notifToggleBtn.classList.add('active');
    showToast('Notifications are active');
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      elements.notifToggleBtn.classList.add('active');
      showToast('Notifications enabled!');
      return true;
    }
  }
  elements.notifToggleBtn.classList.remove('active');
  showToast('Notification permission was dismissed or blocked');
  return false;
}

function sendNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon: 'icons/icon-192.png',
          badge: 'icons/icon.svg',
          vibrate: [200, 100, 200]
        });
      });
    } else {
      new Notification(title, { body, icon: 'icons/icon-192.png' });
    }
  } catch (e) {
    console.error('Failed to trigger notification', e);
  }
}

// ==========================================
// RING & STAGE TICKS VISUALS
// ==========================================
function initRingVisuals() {
  elements.progressRing.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;
  elements.progressRing.style.strokeDashoffset = `${RING_CIRCUMFERENCE}`;
  
  // Render milestone markers at 4h, 8h, 12h, 16h, 24h
  const milestones = [4, 8, 12, 16, 20, 24];
  const maxH = 24;
  let tickSvg = '';
  
  milestones.forEach((h) => {
    const angle = (h / maxH) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    const cx = 160 + 135 * Math.cos(rad);
    const cy = 160 + 135 * Math.sin(rad);
    tickSvg += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3" fill="#1C2536" stroke="#26334D" stroke-width="1.5" />`;
  });
  elements.stageTicks.innerHTML = tickSvg;
}

// ==========================================
// TIMER ENGINE & CALCULATIONS
// ==========================================
function updateTimerUI() {
  const isFasting = !!appState.currentFast;

  if (isFasting) {
    handleActiveFastTick();
  } else if (appState.lastEndedFast) {
    handleEatingWindowTick();
  } else {
    handleIdleStateTick();
  }
}

function handleActiveFastTick() {
  const fast = appState.currentFast;
  const startTime = new Date(fast.startTime).getTime();
  const now = Date.now();
  const elapsedMs = Math.max(0, now - startTime);
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  const targetHours = fast.targetHours || 16;
  const targetMs = targetHours * 60 * 60 * 1000;
  const targetTime = startTime + targetMs;
  const isOvertime = now >= targetTime;

  // Format Elapsed Time
  elements.primaryTime.textContent = formatDuration(elapsedSec);

  // Status & Ring calculations
  if (isOvertime) {
    elements.statusBadge.textContent = 'GOAL REACHED • OVERTIME';
    elements.statusBadge.className = 'fast-status-badge overtime';
    elements.progressRing.setAttribute('stroke', 'url(#ring-gradient-overtime)');
    
    // Check notification for completion once
    if (!fast.notifiedCompletion && appState.settings.notifyComplete) {
      fast.notifiedCompletion = true;
      saveState();
      sendNotification('Fasting Goal Achieved! 🎉', `You completed your ${targetHours}h fast target.`);
    }

    // Full progress ring in overtime
    elements.progressRing.style.strokeDashoffset = '0';
    const percent = Math.floor((elapsedMs / targetMs) * 100);
    elements.percentText.textContent = `${percent}%`;
    elements.subInfo.textContent = `Goal was ${targetHours}h 00m`;
  } else {
    elements.statusBadge.textContent = 'FASTING IN PROGRESS';
    elements.statusBadge.className = 'fast-status-badge active-fast';
    elements.progressRing.setAttribute('stroke', 'url(#ring-gradient-fasting)');
    
    const progressFraction = Math.min(1, elapsedMs / targetMs);
    const offset = RING_CIRCUMFERENCE * (1 - progressFraction);
    elements.progressRing.style.strokeDashoffset = `${offset.toFixed(2)}`;
    
    const percent = Math.floor(progressFraction * 100);
    elements.percentText.textContent = `${percent}%`;
    
    const remainingSec = Math.ceil((targetTime - now) / 1000);
    elements.subInfo.textContent = `Remaining: ${formatShortDuration(remainingSec)}`;
  }

  // Timestamps meta
  elements.metaStartTime.textContent = formatClockTime(new Date(startTime));
  elements.metaTargetTime.textContent = formatClockTime(new Date(targetTime));
  elements.metaTargetDate.textContent = formatRelativeDate(new Date(targetTime));

  // Main Action button
  elements.btnMainAction.className = 'btn-primary-action btn-end';
  elements.btnMainActionText.textContent = 'END FAST';
  elements.btnEditStartTime.style.display = 'block';

  // Update Metabolic Stage
  updateMetabolicStagesUI(elapsedHours);
}

function handleEatingWindowTick() {
  const endTime = new Date(appState.lastEndedFast.endTime).getTime();
  const now = Date.now();
  const elapsedMs = Math.max(0, now - endTime);
  const elapsedSec = Math.floor(elapsedMs / 1000);

  // Eating window usually complements the fast (e.g. 16:8 -> 8h eating window)
  const defaultFast = parseInt(appState.settings.defaultProtocol, 10) || 16;
  const eatingWindowHours = Math.max(2, 24 - defaultFast);
  const targetMs = eatingWindowHours * 60 * 60 * 1000;
  const progressFraction = Math.min(1, elapsedMs / targetMs);

  elements.statusBadge.textContent = 'EATING WINDOW';
  elements.statusBadge.className = 'fast-status-badge eating';
  elements.progressRing.setAttribute('stroke', 'url(#ring-gradient-eating)');
  
  elements.primaryTime.textContent = formatDuration(elapsedSec);
  elements.subInfo.textContent = `Open for ~${eatingWindowHours}h`;
  elements.percentText.textContent = `${Math.floor(progressFraction * 100)}%`;

  const offset = RING_CIRCUMFERENCE * (1 - progressFraction);
  elements.progressRing.style.strokeDashoffset = `${offset.toFixed(2)}`;

  elements.metaStartTime.textContent = formatClockTime(new Date(endTime));
  elements.metaTargetTime.textContent = '--:--';
  elements.metaTargetDate.textContent = 'Next Fast';
  elements.btnEditStartTime.style.display = 'none';

  // Action Button
  elements.btnMainAction.className = 'btn-primary-action btn-start';
  elements.btnMainActionText.textContent = 'START NEXT FAST';

  updateMetabolicStagesUI(0);
}

function handleIdleStateTick() {
  elements.statusBadge.textContent = 'READY TO FAST';
  elements.statusBadge.className = 'fast-status-badge';
  elements.progressRing.setAttribute('stroke', 'url(#ring-gradient-fasting)');
  elements.progressRing.style.strokeDashoffset = `${RING_CIRCUMFERENCE}`;
  
  const targetHours = getSelectedProtocolHours();
  elements.primaryTime.textContent = '00:00:00';
  elements.subInfo.textContent = `Target: ${targetHours}h 00m`;
  elements.percentText.textContent = '0%';

  elements.metaStartTime.textContent = '--:--';
  elements.metaTargetTime.textContent = '--:--';
  elements.metaTargetDate.textContent = 'Today';
  elements.btnEditStartTime.style.display = 'none';

  elements.btnMainAction.className = 'btn-primary-action btn-start';
  elements.btnMainActionText.textContent = 'START FASTING';

  updateMetabolicStagesUI(0);
}

// ==========================================
// METABOLIC STAGES UI
// ==========================================
function renderStages() {
  elements.stagesTimeline.innerHTML = METABOLIC_STAGES.map((stg, idx) => `
    <div class="stage-item" id="stage-node-${stg.id}" data-min="${stg.hoursMin}" data-max="${stg.hoursMax}">
      <div class="stage-bullet">${idx + 1}</div>
      <div class="stage-content">
        <div class="stage-top">
          <span class="stage-name">${stg.name}</span>
          <span class="stage-hours">${stg.short}</span>
        </div>
        <p class="stage-desc">${stg.desc}</p>
      </div>
    </div>
  `).join('');
}

function updateMetabolicStagesUI(elapsedHours) {
  let currentStage = METABOLIC_STAGES[0];

  METABOLIC_STAGES.forEach((stg) => {
    const node = document.getElementById(`stage-node-${stg.id}`);
    if (!node) return;

    if (elapsedHours >= stg.hoursMax) {
      node.className = 'stage-item completed';
    } else if (elapsedHours >= stg.hoursMin && elapsedHours < stg.hoursMax) {
      node.className = 'stage-item active';
      currentStage = stg;
    } else {
      node.className = 'stage-item';
    }
  });

  elements.currentStageTitle.textContent = elapsedHours > 0 ? currentStage.tag : 'Not Fasting';
}

// ==========================================
// FASTING ACTIONS (START / END / EDIT)
// ==========================================
function startFast(customStartIso = null) {
  const targetHours = getSelectedProtocolHours();
  const startTime = customStartIso || new Date().toISOString();

  appState.currentFast = {
    startTime,
    targetHours,
    notifiedCompletion: false
  };
  saveState();
  updateTimerUI();
  showToast(`Fast started! Goal: ${targetHours} hours.`);
}

function endFast() {
  if (!appState.currentFast) return;

  const fast = appState.currentFast;
  const startTime = fast.startTime;
  const endTime = new Date().toISOString();
  const elapsedHours = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60);
  const targetHours = fast.targetHours || 16;
  const achieved = elapsedHours >= (targetHours - 0.05); // slight tolerance

  const logEntry = {
    id: 'fast_' + Date.now(),
    startTime,
    endTime,
    targetHours,
    durationHours: parseFloat(elapsedHours.toFixed(2)),
    achieved
  };

  appState.history.unshift(logEntry);
  appState.lastEndedFast = { endTime };
  appState.currentFast = null;

  saveState();
  updateStreakUI();
  renderHistory();
  updateTimerUI();

  if (achieved) {
    showToast(`🎉 Goal completed: ${logEntry.durationHours}h fasted!`);
  } else {
    showToast(`Fast ended: ${logEntry.durationHours}h recorded.`);
  }
}

function editStartTime(newIsoString) {
  if (!appState.currentFast) return;
  appState.currentFast.startTime = newIsoString;
  appState.currentFast.notifiedCompletion = false;
  saveState();
  updateTimerUI();
  showToast('Start time updated.');
}

// ==========================================
// PROTOCOL SELECTION
// ==========================================
function getSelectedProtocolHours() {
  const activeChip = elements.protocolChips.querySelector('.chip.active');
  if (!activeChip) return 16;
  
  const val = activeChip.getAttribute('data-hours');
  if (val === 'custom') {
    return parseInt(appState.settings.customHours, 10) || 16;
  }
  return parseInt(val, 10) || 16;
}

function setActiveProtocolChip(hours) {
  const chips = elements.protocolChips.querySelectorAll('.chip');
  let found = false;

  chips.forEach((c) => {
    const chipHours = c.getAttribute('data-hours');
    if (chipHours === String(hours)) {
      c.classList.add('active');
      found = true;
    } else {
      c.classList.remove('active');
    }
  });

  if (!found) {
    elements.chipCustom.classList.add('active');
    elements.chipCustom.textContent = `Custom (${hours}h)`;
  } else {
    elements.chipCustom.textContent = 'Custom';
  }
}

// ==========================================
// HISTORY & STREAK ANALYTICS
// ==========================================
function renderHistory() {
  const logs = appState.history;
  elements.historyCountBadge.textContent = `${logs.length} records`;

  if (logs.length === 0) {
    elements.historyItemsContainer.innerHTML = `
      <div class="empty-history-state">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 14 14"/>
        </svg>
        <p>No fasting logs yet.<br>Complete your first fast to see your stats!</p>
      </div>
    `;
    updateAnalyticsSummary();
    return;
  }

  elements.historyItemsContainer.innerHTML = logs.map((item) => {
    const sDate = new Date(item.startTime);
    const eDate = new Date(item.endTime);
    const dateStr = sDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const timeSpanStr = `${formatClockTime(sDate)} – ${formatClockTime(eDate)}`;

    return `
      <div class="history-card" id="card-${item.id}">
        <div class="history-card-left">
          <div class="history-duration-row">
            <span class="history-duration">${item.durationHours} hrs</span>
            <span class="history-tag ${item.achieved ? 'achieved' : 'missed'}">
              ${item.achieved ? 'GOAL MET (' + item.targetHours + 'h)' : 'UNDER (' + item.targetHours + 'h)'}
            </span>
          </div>
          <span class="history-dates">${dateStr} • ${timeSpanStr}</span>
        </div>
        <div class="history-card-right">
          <button class="btn-delete-log" data-id="${item.id}" title="Delete log">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach delete events
  elements.historyItemsContainer.querySelectorAll('.btn-delete-log').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = btn.getAttribute('data-id');
      deleteHistoryLog(id);
    });
  });

  updateAnalyticsSummary();
}

function deleteHistoryLog(id) {
  if (!confirm('Are you sure you want to delete this log entry?')) return;
  appState.history = appState.history.filter((h) => h.id !== id);
  saveState();
  updateStreakUI();
  renderHistory();
  showToast('Log entry removed.');
}

function updateAnalyticsSummary() {
  const logs = appState.history;
  elements.statTotalFasts.textContent = logs.length;

  if (logs.length === 0) {
    elements.statAvgHours.textContent = '0.0h';
    elements.statCurrentStreak.textContent = '0d';
    elements.statLongestStreak.textContent = '0d';
    return;
  }

  // Calculate Average Duration
  const totalHours = logs.reduce((acc, curr) => acc + (curr.durationHours || 0), 0);
  const avg = (totalHours / logs.length).toFixed(1);
  elements.statAvgHours.textContent = `${avg}h`;

  // Calculate Streak based on consecutive fasting days
  const streaks = calculateStreaks(logs);
  elements.statCurrentStreak.textContent = `${streaks.current}d`;
  elements.statLongestStreak.textContent = `${streaks.longest}d`;
}

function calculateStreaks(logs) {
  if (!logs || logs.length === 0) return { current: 0, longest: 0 };

  // Collect unique days with completed fasts
  const dayTimestamps = Array.from(
    new Set(
      logs.map((item) => {
        const d = new Date(item.endTime);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      })
    )
  ).sort((a, b) => b - a); // descending order

  if (dayTimestamps.length === 0) return { current: 0, longest: 0 };

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const today = new Date();
  const todayTimestamp = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const yesterdayTimestamp = todayTimestamp - ONE_DAY_MS;

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Check if current streak is alive (fast finished today or yesterday, or ongoing fast)
  const mostRecentDay = dayTimestamps[0];
  const isStreakAlive = mostRecentDay === todayTimestamp || mostRecentDay === yesterdayTimestamp || !!appState.currentFast;

  if (isStreakAlive) {
    currentStreak = 1;
    let expected = mostRecentDay - ONE_DAY_MS;
    for (let i = 1; i < dayTimestamps.length; i++) {
      if (dayTimestamps[i] === expected) {
        currentStreak++;
        expected -= ONE_DAY_MS;
      } else {
        break;
      }
    }
  }

  // Longest streak calculation
  tempStreak = 1;
  longestStreak = 1;
  for (let i = 1; i < dayTimestamps.length; i++) {
    if (dayTimestamps[i] === dayTimestamps[i - 1] - ONE_DAY_MS) {
      tempStreak++;
    } else {
      tempStreak = 1;
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak);
  return { current: currentStreak, longest: longestStreak };
}

function updateStreakUI() {
  const streaks = calculateStreaks(appState.history);
  elements.streakCount.textContent = streaks.current;
}

// ==========================================
// SETTINGS & BACKUP/RESTORE
// ==========================================
function syncSettingsUI() {
  elements.settingDefaultProtocol.value = appState.settings.defaultProtocol || '16';
  elements.settingCustomHoursInput.value = appState.settings.customHours || 16;
  
  if (appState.settings.defaultProtocol === 'custom') {
    elements.settingCustomHoursRow.style.display = 'flex';
  } else {
    elements.settingCustomHoursRow.style.display = 'none';
  }

  elements.settingNotifComplete.checked = !!appState.settings.notifyComplete;
  elements.settingNotifMilestones.checked = !!appState.settings.notifyMilestones;
}

function exportDataAsJSON() {
  const dataStr = JSON.stringify(appState, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fasttracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Fasting history exported successfully.');
}

function importDataFromJSON(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      if (parsed && Array.isArray(parsed.history)) {
        appState = { ...defaultState, ...parsed };
        saveState();
        syncSettingsUI();
        updateStreakUI();
        renderHistory();
        updateTimerUI();
        showToast('Data imported successfully!');
      } else {
        alert('Invalid FastTracker JSON backup format.');
      }
    } catch (e) {
      alert('Failed to parse JSON file.');
    }
  };
  reader.readAsText(file);
}

// ==========================================
// EVENT BINDINGS
// ==========================================
function bindEvents() {
  // Navigation Tabs
  elements.navItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Main Action Button (Start/End Fast)
  elements.btnMainAction.addEventListener('click', () => {
    if (appState.currentFast) {
      if (confirm('Are you ready to end your current fast?')) {
        endFast();
      }
    } else {
      startFast();
    }
  });

  // Protocol Chips Click
  elements.protocolChips.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const hoursVal = chip.getAttribute('data-hours');
      if (hoursVal === 'custom') {
        openModal(elements.modalCustomProtocol);
      } else {
        const hours = parseInt(hoursVal, 10);
        setActiveProtocolChip(hours);
        if (appState.currentFast) {
          appState.currentFast.targetHours = hours;
          saveState();
        }
        updateTimerUI();
      }
    });
  });

  // Custom Protocol Modal Save
  elements.btnSaveCustomProtocol.addEventListener('click', () => {
    const val = parseInt(elements.inputCustomHours.value, 10);
    if (val >= 1 && val <= 168) {
      appState.settings.customHours = val;
      saveState();
      setActiveProtocolChip(val);
      if (appState.currentFast) {
        appState.currentFast.targetHours = val;
        saveState();
      }
      closeModal(elements.modalCustomProtocol);
      updateTimerUI();
    } else {
      alert('Please enter a duration between 1 and 168 hours.');
    }
  });

  // Edit Start Time Modal
  elements.btnEditStartTime.addEventListener('click', () => {
    if (!appState.currentFast) return;
    const currentStart = new Date(appState.currentFast.startTime);
    elements.inputEditStartTime.value = formatDateTimeLocal(currentStart);
    openModal(elements.modalEditStart);
  });

  elements.btnSaveStartTime.addEventListener('click', () => {
    const val = elements.inputEditStartTime.value;
    if (val) {
      const newDate = new Date(val);
      if (newDate.getTime() > Date.now()) {
        alert('Start time cannot be in the future.');
        return;
      }
      editStartTime(newDate.toISOString());
      closeModal(elements.modalEditStart);
    }
  });

  // Manual Fast Log Modal
  elements.btnAddManualFast.addEventListener('click', () => {
    const now = new Date();
    const sixteenHoursAgo = new Date(now.getTime() - 16 * 60 * 60 * 1000);
    elements.manualStartInput.value = formatDateTimeLocal(sixteenHoursAgo);
    elements.manualEndInput.value = formatDateTimeLocal(now);
    elements.manualTargetInput.value = 16;
    openModal(elements.modalManualFast);
  });

  elements.btnSaveManualFast.addEventListener('click', () => {
    const startVal = elements.manualStartInput.value;
    const endVal = elements.manualEndInput.value;
    const targetVal = parseInt(elements.manualTargetInput.value, 10) || 16;

    if (!startVal || !endVal) {
      alert('Please select both start and end times.');
      return;
    }

    const sDate = new Date(startVal);
    const eDate = new Date(endVal);

    if (eDate <= sDate) {
      alert('End time must be after start time.');
      return;
    }

    const durationHours = parseFloat(((eDate - sDate) / (1000 * 60 * 60)).toFixed(2));
    const achieved = durationHours >= (targetVal - 0.05);

    const logEntry = {
      id: 'fast_' + Date.now(),
      startTime: sDate.toISOString(),
      endTime: eDate.toISOString(),
      targetHours: targetVal,
      durationHours,
      achieved
    };

    appState.history.unshift(logEntry);
    appState.history.sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
    saveState();
    updateStreakUI();
    renderHistory();
    closeModal(elements.modalManualFast);
    showToast('Manual fast logged.');
  });

  // Close modals
  document.querySelectorAll('.modal-close, .btn-modal-cancel').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal');
      if (modalId) {
        closeModal(document.getElementById(modalId));
      }
    });
  });

  // Notifications Toggle
  elements.notifToggleBtn.addEventListener('click', () => {
    requestNotificationPermission();
  });

  // Settings Events
  elements.settingDefaultProtocol.addEventListener('change', (e) => {
    appState.settings.defaultProtocol = e.target.value;
    if (e.target.value === 'custom') {
      elements.settingCustomHoursRow.style.display = 'flex';
    } else {
      elements.settingCustomHoursRow.style.display = 'none';
      setActiveProtocolChip(parseInt(e.target.value, 10));
    }
    saveState();
  });

  elements.settingCustomHoursInput.addEventListener('change', (e) => {
    const val = parseInt(e.target.value, 10) || 16;
    appState.settings.customHours = Math.max(1, Math.min(168, val));
    saveState();
    if (appState.settings.defaultProtocol === 'custom') {
      setActiveProtocolChip(appState.settings.customHours);
    }
  });

  elements.settingNotifComplete.addEventListener('change', (e) => {
    appState.settings.notifyComplete = e.target.checked;
    saveState();
  });

  elements.settingNotifMilestones.addEventListener('change', (e) => {
    appState.settings.notifyMilestones = e.target.checked;
    saveState();
  });

  elements.btnExportData.addEventListener('click', exportDataAsJSON);

  elements.inputImportData.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      importDataFromJSON(e.target.files[0]);
    }
  });

  elements.btnClearData.addEventListener('click', () => {
    if (confirm('WARNING: This will permanently wipe all your active fast and history logs. Continue?')) {
      appState = JSON.parse(JSON.stringify(defaultState));
      saveState();
      syncSettingsUI();
      updateStreakUI();
      renderHistory();
      updateTimerUI();
      showToast('All data has been reset.');
    }
  });
}

function switchTab(tabId) {
  currentTab = tabId;
  elements.navItems.forEach((btn) => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  elements.tabPanes.forEach((pane) => {
    if (pane.id === tabId) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });

  if (tabId === 'tab-history') {
    renderHistory();
  }
}

function openModal(modalEl) {
  if (modalEl) modalEl.classList.add('active');
}

function closeModal(modalEl) {
  if (modalEl) modalEl.classList.remove('active');
}

function showToast(msg) {
  elements.toast.textContent = msg;
  elements.toast.classList.add('show');
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}

// ==========================================
// UTILITY FORMATTERS
// ==========================================
function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${padZero(h)}:${padZero(m)}:${padZero(s)}`;
}

function formatShortDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}h ${padZero(m)}m`;
}

function formatClockTime(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatRelativeDate(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDateTimeLocal(date) {
  const offset = date.getTimezoneOffset() * 60000;
  const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
  return localISOTime;
}

function padZero(num) {
  return String(num).padStart(2, '0');
}
