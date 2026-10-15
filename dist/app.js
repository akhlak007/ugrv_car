/**
 * EchoPath Sonar Map Studio
 * Interactive reconstruction of left/right UGRV sonar telemetry
 * High-performance 2D canvas viewport with pan, zoom, corridor stretching,
 * interactive inspection tooltip, HUD controls, and minimap navigator.
 */

(function () {
  'use strict';

  // DOM Elements
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const reloadButton = document.getElementById('reloadButton');
  const fileNameEl = document.getElementById('fileName');
  const fileMetaEl = document.getElementById('fileMeta');
  const speedInput = document.getElementById('speedInput');
  const speedValue = document.getElementById('speedValue');
  const rangeInput = document.getElementById('rangeInput');
  const rangeValue = document.getElementById('rangeValue');
  const aspectInput = document.getElementById('aspectInput');
  const aspectValue = document.getElementById('aspectValue');
  const followToggle = document.getElementById('followToggle');
  const smoothToggle = document.getElementById('smoothToggle');
  const connectToggle = document.getElementById('connectToggle');
  const hazardToggle = document.getElementById('hazardToggle');
  const sampleCounter = document.getElementById('sampleCounter');
  const canvasWrap = document.getElementById('canvasWrap');
  const mapCanvas = document.getElementById('mapCanvas');
  const zoomLevelDisplay = document.getElementById('zoomLevelDisplay');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const fitViewBtn = document.getElementById('fitViewBtn');
  const centerVehicleBtn = document.getElementById('centerVehicleBtn');
  const resetZoomBtn = document.getElementById('resetZoomBtn');
  const mapTooltip = document.getElementById('mapTooltip');
  const ttSample = document.getElementById('ttSample');
  const ttTime = document.getElementById('ttTime');
  const ttLeft = document.getElementById('ttLeft');
  const ttRight = document.getElementById('ttRight');
  const ttClearance = document.getElementById('ttClearance');
  const ttDist = document.getElementById('ttDist');
  const ttStatus = document.getElementById('ttStatus');
  const minimapCanvas = document.getElementById('minimapCanvas');
  const minimapViewbox = document.getElementById('minimapViewbox');
  const emptyState = document.getElementById('emptyState');
  const rangeTopEl = document.getElementById('rangeTop');
  const playButton = document.getElementById('playButton');
  const currentTimeEl = document.getElementById('currentTime');
  const timeline = document.getElementById('timeline');
  const endTimeEl = document.getElementById('endTime');
  const playbackSpeedBtn = document.getElementById('playbackSpeed');
  const radarCanvas = document.getElementById('radarCanvas');
  const radarIndexEl = document.getElementById('radarIndex');
  const leftValueEl = document.getElementById('leftValue');
  const rightValueEl = document.getElementById('rightValue');
  const clearanceValueEl = document.getElementById('clearanceValue');
  const clearanceBarEl = document.getElementById('clearanceBar');
  const clearanceStatusEl = document.getElementById('clearanceStatus');
  const statSamplesEl = document.getElementById('statSamples');
  const statDurationEl = document.getElementById('statDuration');
  const statDistanceEl = document.getElementById('statDistance');
  const statMinEl = document.getElementById('statMin');
  const systemStatusEl = document.getElementById('systemStatus');
  const themeToggle = document.getElementById('themeToggle');
  const themeColorMeta = document.getElementById('themeColorMeta');

  // AI Tactical DOM Elements
  const aiDebriefBtn = document.getElementById('aiDebriefBtn');
  const aiZoningToggle = document.getElementById('aiZoningToggle');
  const aiTrajectoryToggle = document.getElementById('aiTrajectoryToggle');
  const tankThresholdInput = document.getElementById('tankThresholdInput');
  const tankThresholdVal = document.getElementById('tankThresholdVal');
  const soldierThresholdInput = document.getElementById('soldierThresholdInput');
  const soldierThresholdVal = document.getElementById('soldierThresholdVal');
  const unitTankBadge = document.getElementById('unitTankBadge');
  const unitSoldierBadge = document.getElementById('unitSoldierBadge');
  const unitRoverBadge = document.getElementById('unitRoverBadge');
  const unitTankReqLabel = document.getElementById('unitTankReqLabel');
  const unitSoldierReqLabel = document.getElementById('unitSoldierReqLabel');
  const unitRoverReqLabel = document.getElementById('unitRoverReqLabel');
  const soldierViabilityBar = document.getElementById('soldierViabilityBar');
  const soldierViabilityVal = document.getElementById('soldierViabilityVal');
  const tankViabilityBar = document.getElementById('tankViabilityBar');
  const tankViabilityVal = document.getElementById('tankViabilityVal');
  const ttSoldierTag = document.getElementById('ttSoldierTag');
  const ttTankTag = document.getElementById('ttTankTag');

  // Mission Mode & Disaster DOM Elements
  const modeDefenseBtn = document.getElementById('modeDefenseBtn');
  const modeDisasterBtn = document.getElementById('modeDisasterBtn');
  const aiCardTitle = document.getElementById('aiCardTitle');
  const aiCardChip = document.getElementById('aiCardChip');
  const unit1Icon = document.getElementById('unit1Icon');
  const unit1Title = document.getElementById('unit1Title');
  const unit2Icon = document.getElementById('unit2Icon');
  const unit2Title = document.getElementById('unit2Title');
  const unit3Icon = document.getElementById('unit3Icon');
  const unit3Title = document.getElementById('unit3Title');
  const summaryBar1Label = document.getElementById('summaryBar1Label');
  const summaryBar2Label = document.getElementById('summaryBar2Label');
  const collapseRiskValue = document.getElementById('collapseRiskValue');
  const collapseRiskBar = document.getElementById('collapseRiskBar');
  const collapseRiskHint = document.getElementById('collapseRiskHint');

  // Debrief Modal DOM Elements
  const aiDebriefModal = document.getElementById('aiDebriefModal');
  const aiModalClose = document.getElementById('aiModalClose');
  const aiModalCloseBtn = document.getElementById('aiModalCloseBtn');
  const aiPrintBtn = document.getElementById('aiPrintBtn');
  const debriefDistance = document.getElementById('debriefDistance');
  const debriefSamples = document.getElementById('debriefSamples');
  const debriefSoldierPct = document.getElementById('debriefSoldierPct');
  const debriefSoldierDist = document.getElementById('debriefSoldierDist');
  const debriefTankPct = document.getElementById('debriefTankPct');
  const debriefTankDist = document.getElementById('debriefTankDist');
  const debriefChokepoints = document.getElementById('debriefChokepoints');
  const debriefRecommendation = document.getElementById('debriefRecommendation');
  const debriefSectorTable = document.getElementById('debriefSectorTable');
  const debriefSubtitle = document.getElementById('debriefSubtitle');
  const aiDebriefTitle = document.getElementById('aiDebriefTitle');
  const debriefUnit1Label = document.getElementById('debriefUnit1Label');
  const debriefUnit2Label = document.getElementById('debriefUnit2Label');
  const debriefUnit1Header = document.getElementById('debriefUnit1Header');
  const debriefUnit2Header = document.getElementById('debriefUnit2Header');

  const mapCtx = mapCanvas ? mapCanvas.getContext('2d') : null;
  const radarCtx = radarCanvas ? radarCanvas.getContext('2d') : null;
  const minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

  // Application State
  let samples = [];
  let currentIndex = 0;
  let isPlaying = false;
  let playbackSpeed = 1;
  const speedMultipliers = [1, 2, 5, 10];
  let playbackTimer = null;
  let vehicleSpeed = 0.05; // m/s
  let corridorAspect = 3.0; // Corridor width expansion multiplier for clarity
  let isFollowVehicle = true;
  let isSmooth = true;
  let isConnected = true;
  let isHazardsEnabled = true;
  let displayRange = 0; // 0 = Auto
  let radarAngle = 0;
  let animFrameId = null;

  // AI Tactical State
  let isAiZoning = true;
  let isAiTrajectory = true;
  let currentMissionMode = 'defense'; // 'defense' or 'disaster'
  let tankClearanceReq = 110; // cm
  let soldierClearanceReq = 60; // cm
  let roverClearanceReq = 28; // cm
  let stretcherClearanceReq = 85; // cm
  let firefighterClearanceReq = 65; // cm
  let lastFocusedElement = null;

  // Pan & Zoom Viewport State
  let viewScale = 1.0;
  let baselineScale = 1.0;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let hasDragged = false;
  let userPannedManually = false;

  // Touch gesture state
  let touchStartDist = 0;
  let touchStartScale = 1;

  // Hover & Tooltip State
  let hoveredSampleIndex = -1;
  let mouseWorldPos = { x: 0, y: 0 };
  let isMouseOverCanvas = false;

  // Initialize
  function init() {
    initializeTheme();
    setupEventListeners();
    setupCanvasDPI();

    // Auto-load demo data if present
    if (window.ECHOPATH_DEMO_CSV) {
      loadCSVContent(window.ECHOPATH_DEMO_CSV, 'sample-data.csv (Demo)');
    }

    startRenderLoop();
  }

  function setupCanvasDPI() {
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      if (mapCanvas && canvasWrap) {
        const rect = canvasWrap.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          mapCanvas.width = Math.round(rect.width * dpr);
          mapCanvas.height = Math.round(rect.height * dpr);
        }
      }
      if (radarCanvas && radarCanvas.parentElement) {
        const rect = radarCanvas.parentElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          radarCanvas.width = Math.round(rect.width * dpr);
          radarCanvas.height = Math.round(rect.height * dpr);
        }
      }
      if (minimapCanvas) {
        minimapCanvas.width = 80 * dpr;
        minimapCanvas.height = 140 * dpr;
      }

      if (samples.length > 0 && !userPannedManually) {
        if (isFollowVehicle) {
          centerCameraOnSample(currentIndex, false);
        } else {
          fitMapToView();
        }
      }
    }

    window.addEventListener('resize', resize);
    setTimeout(resize, 60);
  }

  function initializeTheme() {
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    applyTheme(theme, false);
  }

  function applyTheme(theme, persist = true) {
    const isLight = theme === 'light';
    if (isLight) document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;

    if (themeToggle) {
      const icon = themeToggle.querySelector('.theme-toggle-icon');
      const label = themeToggle.querySelector('.theme-toggle-label');
      themeToggle.setAttribute('aria-pressed', String(isLight));
      themeToggle.setAttribute('aria-label', 'Light mode');
      themeToggle.title = `Switch to ${isLight ? 'dark' : 'light'} mode`;
      if (icon) icon.textContent = isLight ? '☀' : '☾';
      if (label) label.textContent = isLight ? 'LIGHT' : 'DARK';
    }
    if (themeColorMeta) themeColorMeta.content = isLight ? '#eef5f1' : '#07110f';

    if (persist) {
      try {
        localStorage.setItem('echopath-theme', isLight ? 'light' : 'dark');
      } catch (_) {}
    }
  }

  function setupEventListeners() {
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
        applyTheme(nextTheme);
      });
    }

    // File upload
    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag');
      });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag');
        if (e.dataTransfer.files.length > 0) {
          handleFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          handleFile(e.target.files[0]);
        }
      });
    }

    if (reloadButton) {
      reloadButton.addEventListener('click', () => {
        if (fileInput) fileInput.click();
      });
    }

    // Vehicle Speed Input
    if (speedInput) {
      speedInput.addEventListener('input', (e) => {
        vehicleSpeed = parseFloat(e.target.value);
        if (speedValue) speedValue.textContent = `${vehicleSpeed.toFixed(2)} m/s`;
        recomputeSpatialCoordinates();
        updateStats();
        if (!userPannedManually) fitMapToView();
      });
    }

    // Display Range Input
    if (rangeInput) {
      rangeInput.addEventListener('input', (e) => {
        displayRange = parseInt(e.target.value, 10);
        if (rangeValue) rangeValue.textContent = displayRange === 0 ? 'Auto' : `${displayRange} cm`;
      });
    }

    // Corridor Width Zoom (Aspect)
    if (aspectInput) {
      aspectInput.addEventListener('input', (e) => {
        corridorAspect = parseFloat(e.target.value);
        if (aspectValue) aspectValue.textContent = `${corridorAspect.toFixed(1)}×`;
      });
    }

    // Follow Vehicle Toggle
    if (followToggle) {
      followToggle.addEventListener('click', () => {
        setFollowVehicleMode(!isFollowVehicle);
      });
    }

    // Smoothing Toggle
    if (smoothToggle) {
      smoothToggle.addEventListener('click', () => {
        isSmooth = !isSmooth;
        smoothToggle.classList.toggle('active', isSmooth);
        smoothToggle.setAttribute('aria-checked', String(isSmooth));
      });
    }

    // Connect Returns Toggle
    if (connectToggle) {
      connectToggle.addEventListener('click', () => {
        isConnected = !isConnected;
        connectToggle.classList.toggle('active', isConnected);
        connectToggle.setAttribute('aria-checked', String(isConnected));
      });
    }

    // Hazards Toggle
    if (hazardToggle) {
      hazardToggle.addEventListener('click', () => {
        isHazardsEnabled = !isHazardsEnabled;
        hazardToggle.classList.toggle('active', isHazardsEnabled);
        hazardToggle.setAttribute('aria-checked', String(isHazardsEnabled));
      });
    }

    // AI Tactical Controls
    if (aiZoningToggle) {
      aiZoningToggle.addEventListener('click', () => {
        isAiZoning = !isAiZoning;
        aiZoningToggle.classList.toggle('active', isAiZoning);
        aiZoningToggle.setAttribute('aria-checked', String(isAiZoning));
      });
    }

    if (aiTrajectoryToggle) {
      aiTrajectoryToggle.addEventListener('click', () => {
        isAiTrajectory = !isAiTrajectory;
        aiTrajectoryToggle.classList.toggle('active', isAiTrajectory);
        aiTrajectoryToggle.setAttribute('aria-checked', String(isAiTrajectory));
      });
    }

    if (tankThresholdInput) {
      tankThresholdInput.addEventListener('input', (e) => {
        tankClearanceReq = parseInt(e.target.value, 10);
        if (tankThresholdVal) tankThresholdVal.textContent = `${tankClearanceReq} cm`;
        if (unitTankReqLabel && currentMissionMode === 'defense') unitTankReqLabel.textContent = `≥ ${tankClearanceReq} cm`;
        updateTacticalViabilityStats();
        setSampleIndex(currentIndex);
      });
    }

    if (soldierThresholdInput) {
      soldierThresholdInput.addEventListener('input', (e) => {
        soldierClearanceReq = parseInt(e.target.value, 10);
        if (soldierThresholdVal) soldierThresholdVal.textContent = `${soldierClearanceReq} cm`;
        if (unitSoldierReqLabel && currentMissionMode === 'defense') unitSoldierReqLabel.textContent = `≥ ${soldierClearanceReq} cm`;
        updateTacticalViabilityStats();
        setSampleIndex(currentIndex);
      });
    }

    // Mission Mode Switcher (Defense vs Disaster Rescue)
    if (modeDefenseBtn) {
      modeDefenseBtn.addEventListener('click', () => setMissionMode('defense'));
    }
    if (modeDisasterBtn) {
      modeDisasterBtn.addEventListener('click', () => setMissionMode('disaster'));
    }

    // AI Debrief Modal triggers
    if (aiDebriefBtn) {
      aiDebriefBtn.addEventListener('click', openAiDebriefModal);
    }
    if (aiModalClose) {
      aiModalClose.addEventListener('click', closeAiDebriefModal);
    }
    if (aiModalCloseBtn) {
      aiModalCloseBtn.addEventListener('click', closeAiDebriefModal);
    }
    if (aiDebriefModal) {
      aiDebriefModal.addEventListener('click', (e) => {
        if (e.target === aiDebriefModal) closeAiDebriefModal();
      });
    }
    if (aiPrintBtn) {
      aiPrintBtn.addEventListener('click', () => {
        window.print();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (!aiDebriefModal || !aiDebriefModal.classList.contains('active')) return;
      if (e.key === 'Escape') closeAiDebriefModal();
      if (e.key !== 'Tab') return;

      const focusable = [...aiDebriefModal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    // Playback Controls
    if (playButton) {
      playButton.addEventListener('click', togglePlay);
    }

    if (timeline) {
      timeline.addEventListener('input', (e) => {
        setSampleIndex(parseInt(e.target.value, 10));
      });
    }

    if (playbackSpeedBtn) {
      playbackSpeedBtn.addEventListener('click', () => {
        const nextIdx = (speedMultipliers.indexOf(playbackSpeed) + 1) % speedMultipliers.length;
        playbackSpeed = speedMultipliers[nextIdx];
        playbackSpeedBtn.textContent = `${playbackSpeed}×`;
        if (isPlaying) {
          stopPlayback();
          startPlayback();
        }
      });
    }

    // HUD Zoom & Pan Buttons
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => zoomByFactor(1.35));
    }
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => zoomByFactor(1 / 1.35));
    }
    if (fitViewBtn) {
      fitViewBtn.addEventListener('click', () => {
        setFollowVehicleMode(false);
        userPannedManually = true;
        fitMapToView();
      });
    }
    if (centerVehicleBtn) {
      centerVehicleBtn.addEventListener('click', () => {
        setFollowVehicleMode(true);
        userPannedManually = false;
        centerCameraOnSample(currentIndex, true);
      });
    }
    if (resetZoomBtn) {
      resetZoomBtn.addEventListener('click', () => {
        viewScale = 1.0;
        updateZoomDisplay();
        centerCameraOnSample(currentIndex, true);
      });
    }

    // Map Canvas Interaction: Mouse Pan, Zoom, Hover & Click-to-Seek
    if (canvasWrap) {
      canvasWrap.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // only left click
        isDragging = true;
        hasDragged = false;
        dragStartX = e.clientX - panX;
        dragStartY = e.clientY - panY;
        canvasWrap.classList.add('grabbing');
      });

      window.addEventListener('mousemove', (e) => {
        if (isDragging) {
          const dx = Math.abs(e.clientX - (dragStartX + panX));
          const dy = Math.abs(e.clientY - (dragStartY + panY));
          if (dx > 3 || dy > 3) {
            hasDragged = true;
            userPannedManually = true;
          }
          panX = e.clientX - dragStartX;
          panY = e.clientY - dragStartY;
        }

        // Handle hover tooltip if mouse is over canvas wrap
        if (isMouseOverCanvas && samples.length > 0) {
          updateHoverSample(e.clientX, e.clientY);
        }
      });

      window.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        if (canvasWrap) canvasWrap.classList.remove('grabbing');

        // If it was a click (not a drag), jump timeline to hovered sample
        if (!hasDragged && hoveredSampleIndex >= 0 && hoveredSampleIndex < samples.length) {
          setSampleIndex(hoveredSampleIndex);
        }
      });

      canvasWrap.addEventListener('mouseenter', () => {
        isMouseOverCanvas = true;
      });

      canvasWrap.addEventListener('mouseleave', () => {
        isMouseOverCanvas = false;
        hoveredSampleIndex = -1;
        if (mapTooltip) mapTooltip.style.display = 'none';
      });

      // Mouse Wheel Zoom
      canvasWrap.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.15 : (1 / 1.15);
        const rect = canvasWrap.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Zoom relative to mouse position
        panX = mouseX - (mouseX - panX) * zoomFactor;
        panY = mouseY - (mouseY - panY) * zoomFactor;
        viewScale *= zoomFactor;
        viewScale = Math.max(0.02, Math.min(50, viewScale));
        userPannedManually = true;
        updateZoomDisplay();
      }, { passive: false });

      // Double-click to toggle fit / center
      canvasWrap.addEventListener('dblclick', () => {
        if (isFollowVehicle) {
          setFollowVehicleMode(false);
          fitMapToView();
        } else {
          setFollowVehicleMode(true);
          centerCameraOnSample(currentIndex, true);
        }
      });

      // Touch Gestures: Pan & Pinch-to-zoom
      canvasWrap.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          isDragging = true;
          hasDragged = false;
          dragStartX = e.touches[0].clientX - panX;
          dragStartY = e.touches[0].clientY - panY;
        } else if (e.touches.length === 2) {
          isDragging = false;
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          touchStartDist = Math.hypot(dx, dy);
          touchStartScale = viewScale;
        }
      }, { passive: true });

      canvasWrap.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && isDragging) {
          panX = e.touches[0].clientX - dragStartX;
          panY = e.touches[0].clientY - dragStartY;
          hasDragged = true;
          userPannedManually = true;
        } else if (e.touches.length === 2 && touchStartDist > 0) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const currentDist = Math.hypot(dx, dy);
          const factor = currentDist / touchStartDist;
          viewScale = Math.max(0.02, Math.min(50, touchStartScale * factor));
          updateZoomDisplay();
          userPannedManually = true;
        }
      }, { passive: true });

      canvasWrap.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
          isDragging = false;
          touchStartDist = 0;
        }
      }, { passive: true });
    }

    // Minimap Navigation: Click to jump along route
    if (minimapCanvas) {
      minimapCanvas.addEventListener('click', (e) => {
        if (!samples.length) return;
        const rect = minimapCanvas.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const ratio = 1 - (clickY / rect.height); // Invert: 0 is bottom, 1 is top
        const targetSampleIdx = Math.round(Math.max(0, Math.min(samples.length - 1, ratio * (samples.length - 1))));
        setSampleIndex(targetSampleIdx);
        centerCameraOnSample(targetSampleIdx, true);
      });
    }
  }

  function setFollowVehicleMode(enabled) {
    isFollowVehicle = enabled;
    if (followToggle) {
      followToggle.classList.toggle('active', isFollowVehicle);
      followToggle.setAttribute('aria-checked', String(isFollowVehicle));
    }
  }

  function zoomByFactor(factor) {
    if (!canvasWrap) return;
    const rect = canvasWrap.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    panX = cx - (cx - panX) * factor;
    panY = cy - (cy - panY) * factor;
    viewScale *= factor;
    viewScale = Math.max(0.02, Math.min(50, viewScale));
    updateZoomDisplay();
  }

  function updateZoomDisplay() {
    if (zoomLevelDisplay) {
      const pct = Math.round(viewScale * 100);
      zoomLevelDisplay.textContent = `${pct}%`;
    }
  }

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      loadCSVContent(e.target.result, file.name);
    };
    reader.readAsText(file);
  }

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    let leftIdx = header.findIndex(h => h.includes('left') && h.includes('dist'));
    let rightIdx = header.findIndex(h => h.includes('right') && h.includes('dist'));
    let dateIdx = header.findIndex(h => h.includes('date'));
    let timeIdx = header.findIndex(h => h.includes('time'));

    // Fallbacks if header differs
    if (leftIdx === -1) leftIdx = header.findIndex(h => h.includes('left'));
    if (rightIdx === -1) rightIdx = header.findIndex(h => h.includes('right'));
    if (leftIdx === -1 && header.length >= 4) leftIdx = 2;
    if (rightIdx === -1 && header.length >= 4) rightIdx = 3;

    const parsed = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length <= Math.max(leftIdx, rightIdx)) continue;

      const leftVal = parseFloat(cols[leftIdx]);
      const rightVal = parseFloat(cols[rightIdx]);

      if (isNaN(leftVal) || isNaN(rightVal)) continue;

      const dateStr = dateIdx !== -1 ? cols[dateIdx] : '';
      const timeStr = timeIdx !== -1 ? cols[timeIdx] : '';

      // Parse timestamp
      let timestamp = null;
      if (dateStr && timeStr) {
        const dParts = dateStr.split('-');
        let year, month, day;
        if (dParts.length === 3) {
          if (dParts[0].length === 4) {
            year = parseInt(dParts[0], 10);
            month = parseInt(dParts[1], 10) - 1;
            day = parseInt(dParts[2], 10);
          } else {
            day = parseInt(dParts[0], 10);
            month = parseInt(dParts[1], 10) - 1;
            year = parseInt(dParts[2], 10);
          }
        }
        const timeMatch = timeStr.match(/(\d+):(\d+):(\d+)\s*(AM|PM)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const seconds = parseInt(timeMatch[3], 10);
          const ampm = timeMatch[4] ? timeMatch[4].toUpperCase() : null;
          if (ampm === 'PM' && hours < 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
          timestamp = new Date(year || 2026, month || 0, day || 1, hours, minutes, seconds).getTime();
        }
      }

      parsed.push({
        rawIndex: i,
        date: dateStr,
        time: timeStr,
        timestamp: timestamp,
        left: leftVal,
        right: rightVal,
        clearance: leftVal + rightVal,
        y: 0 // Will be computed in recomputeSpatialCoordinates
      });
    }

    return parsed;
  }

  function loadCSVContent(csvText, fileName) {
    const data = parseCSV(csvText);
    if (!data.length) {
      alert('Unable to parse valid sonar records from the CSV file.');
      return;
    }

    samples = data;
    if (fileNameEl) fileNameEl.textContent = fileName;
    if (fileMetaEl) {
      const firstDate = samples[0].date || 'Active Log';
      fileMetaEl.textContent = `${samples.length} samples • ${firstDate}`;
    }
    if (emptyState) emptyState.classList.add('hidden');
    if (playButton) playButton.disabled = false;
    if (timeline) {
      timeline.disabled = false;
      timeline.min = '0';
      timeline.max = String(samples.length - 1);
      timeline.value = '0';
    }
    if (endTimeEl && samples.length > 0) {
      endTimeEl.textContent = samples[samples.length - 1].time || `${samples.length}s`;
    }
    if (systemStatusEl) {
      systemStatusEl.textContent = 'TELEMETRY LOADED';
    }

    recomputeSpatialCoordinates();
    updateStats();
    setSampleIndex(0);
    userPannedManually = false;
    centerCameraOnSample(0, true);
  }

  function recomputeSpatialCoordinates() {
    if (!samples.length) return;

    let cumulativeY = 0;
    const MAX_GAP_SECONDS = 60; // Gaps longer than 60s are treated as pauses
    const DEFAULT_STEP_SEC = 20;

    for (let i = 0; i < samples.length; i++) {
      if (i === 0) {
        samples[i].y = 0;
        continue;
      }

      let dtSec = DEFAULT_STEP_SEC;
      const prev = samples[i - 1];
      const curr = samples[i];

      if (prev.timestamp && curr.timestamp) {
        const delta = (curr.timestamp - prev.timestamp) / 1000;
        if (delta > 0 && delta <= MAX_GAP_SECONDS) {
          dtSec = delta;
        } else if (delta > MAX_GAP_SECONDS) {
          dtSec = DEFAULT_STEP_SEC;
        }
      }

      // y in meters along vehicle track
      cumulativeY += dtSec * vehicleSpeed;
      samples[i].y = cumulativeY;
    }
  }

  function updateStats() {
    if (!samples.length) return;

    if (statSamplesEl) statSamplesEl.textContent = samples.length;

    let totalActiveSeconds = 0;
    const MAX_GAP_SECONDS = 60;
    const DEFAULT_STEP_SEC = 20;

    for (let i = 1; i < samples.length; i++) {
      const prev = samples[i - 1];
      const curr = samples[i];
      if (prev.timestamp && curr.timestamp) {
        const delta = (curr.timestamp - prev.timestamp) / 1000;
        if (delta > 0 && delta <= MAX_GAP_SECONDS) {
          totalActiveSeconds += delta;
        } else {
          totalActiveSeconds += DEFAULT_STEP_SEC;
        }
      } else {
        totalActiveSeconds += DEFAULT_STEP_SEC;
      }
    }

    const minutes = Math.floor(totalActiveSeconds / 60);
    const seconds = Math.floor(totalActiveSeconds % 60);
    if (statDurationEl) statDurationEl.textContent = `${minutes}m ${seconds}s`;

    const totalDistance = samples[samples.length - 1].y;
    if (statDistanceEl) statDistanceEl.textContent = `${totalDistance.toFixed(1)} m`;

    const minClearance = Math.min(...samples.map(s => s.clearance));
    if (statMinEl) statMinEl.textContent = `${minClearance.toFixed(1)} cm`;

    // Recompute AI route viability
    updateTacticalViabilityStats();
  }

  // Switch between Defense and Disaster Rescue Modes
  function setMissionMode(mode) {
    currentMissionMode = mode;
    if (mode === 'disaster') {
      if (tankThresholdInput) tankThresholdInput.disabled = true;
      if (soldierThresholdInput) soldierThresholdInput.disabled = true;
      if (modeDisasterBtn) modeDisasterBtn.classList.add('active');
      if (modeDefenseBtn) modeDefenseBtn.classList.remove('active');
      if (modeDisasterBtn) modeDisasterBtn.setAttribute('aria-pressed', 'true');
      if (modeDefenseBtn) modeDefenseBtn.setAttribute('aria-pressed', 'false');
      if (aiCardTitle) aiCardTitle.textContent = 'AI RESCUE CLEARANCE';
      if (aiCardChip) aiCardChip.textContent = 'USAR / INSARAG';
      if (unit1Icon) unit1Icon.textContent = '🚑';
      if (unit1Title) unit1Title.textContent = 'MEDICAL STRETCHER';
      if (unitTankReqLabel) unitTankReqLabel.innerHTML = `&ge; ${stretcherClearanceReq} cm`;
      if (unit2Icon) unit2Icon.textContent = '🧑‍🚒';
      if (unit2Title) unit2Title.textContent = 'FIREFIGHTER (SCBA)';
      if (unitSoldierReqLabel) unitSoldierReqLabel.innerHTML = `&ge; ${firefighterClearanceReq} cm`;
      if (unit3Icon) unit3Icon.textContent = '🐕';
      if (unit3Title) unit3Title.textContent = 'K9 SEARCH DOG';
      if (unitRoverReqLabel) unitRoverReqLabel.innerHTML = '&ge; 45 cm';
      if (summaryBar1Label) summaryBar1Label.textContent = '🧑‍🚒 Firefighter Viable';
      if (summaryBar2Label) summaryBar2Label.textContent = '🚑 Stretcher Access';
    } else {
      if (tankThresholdInput) tankThresholdInput.disabled = false;
      if (soldierThresholdInput) soldierThresholdInput.disabled = false;
      if (modeDefenseBtn) modeDefenseBtn.classList.add('active');
      if (modeDisasterBtn) modeDisasterBtn.classList.remove('active');
      if (modeDefenseBtn) modeDefenseBtn.setAttribute('aria-pressed', 'true');
      if (modeDisasterBtn) modeDisasterBtn.setAttribute('aria-pressed', 'false');
      if (aiCardTitle) aiCardTitle.textContent = 'AI TACTICAL UNIT CLEARANCE';
      if (aiCardChip) aiCardChip.textContent = 'NEURAL SLAM';
      if (unit1Icon) unit1Icon.textContent = '🛡️';
      if (unit1Title) unit1Title.textContent = 'ARMORED TANK / MBT';
      if (unitTankReqLabel) unitTankReqLabel.innerHTML = `&ge; ${tankClearanceReq} cm`;
      if (unit2Icon) unit2Icon.textContent = '🪖';
      if (unit2Title) unit2Title.textContent = 'INFANTRY SOLDIER';
      if (unitSoldierReqLabel) unitSoldierReqLabel.innerHTML = `&ge; ${soldierClearanceReq} cm`;
      if (unit3Icon) unit3Icon.textContent = '🤖';
      if (unit3Title) unit3Title.textContent = 'UGRV RECON ROVER';
      if (unitRoverReqLabel) unitRoverReqLabel.innerHTML = `&ge; ${roverClearanceReq} cm`;
      if (summaryBar1Label) summaryBar1Label.textContent = '🪖 Soldier Viability';
      if (summaryBar2Label) summaryBar2Label.textContent = '🛡️ Tank Accessible';
    }
    updateTacticalViabilityStats();
    setSampleIndex(currentIndex);
  }

  // Calculate Structural Collapse Risk (Acoustic Rubble Symmetry)
  function calculateStructuralCollapseRisk(sample, prevSample) {
    if (!sample) return { riskPct: 14, label: 'LOW (14%)', hint: 'Acoustic geometry stable' };
    let pinchRisk = 0;
    if (sample.clearance < 32) pinchRisk += 50;
    else if (sample.clearance < 48) pinchRisk += 28;

    // Asymmetry risk (one wall pinching inwards)
    const asymmetry = Math.abs(sample.left - sample.right);
    if (asymmetry > 35) pinchRisk += 25;
    else if (asymmetry > 18) pinchRisk += 14;

    // Sudden narrowing from previous step
    if (prevSample) {
      const dClearance = prevSample.clearance - sample.clearance;
      if (dClearance > 10) pinchRisk += 20;
    }

    const riskPct = Math.min(94, Math.max(12, pinchRisk));
    let label = `LOW (${riskPct}%)`;
    let hint = 'Acoustic wall symmetry: Stable';
    if (riskPct > 65) {
      label = `CRITICAL (${riskPct}%)`;
      hint = 'Severe asymmetric wall buckling / collapse hazard';
    } else if (riskPct >= 35) {
      label = `MODERATE (${riskPct}%)`;
      hint = 'Structural rubble constriction detected';
    }
    return { riskPct, label, hint };
  }

  // AI Tactical / Disaster Evaluation for single sample
  function evaluateSampleTactical(sample) {
    if (!sample) return { unit1: 'denied', unit2: 'denied', unit3: 'pinch', soldier: 'denied', tank: 'denied', rover: 'pinch' };
    const cl = sample.clearance;
    const l = sample.left;
    const r = sample.right;

    if (currentMissionMode === 'disaster') {
      // Unit 1: Medical Stretcher (>= stretcherClearanceReq, e.g. 85cm)
      const isStretcherViable = cl >= stretcherClearanceReq && l >= 20 && r >= 20;

      // Unit 2: Firefighter SCBA (>= firefighterClearanceReq, e.g. 65cm)
      let ffStatus = 'denied';
      if (cl >= firefighterClearanceReq) {
        ffStatus = 'viable';
      } else if (cl >= 42) {
        ffStatus = 'restricted'; // crawl
      } else {
        ffStatus = 'denied';
      }

      // Unit 3: K9 Search Dog (>= 45cm)
      const isK9Viable = cl >= 45 ? 'clearway' : 'pinch';

      return {
        unit1: isStretcherViable ? 'viable' : 'denied',
        unit2: ffStatus,
        unit3: isK9Viable,
        soldier: ffStatus,
        tank: isStretcherViable ? 'viable' : 'denied',
        rover: isK9Viable
      };
    } else {
      // Defense Mode: Tank, Soldier, Rover
      const isTankViable = cl >= tankClearanceReq && l >= 25 && r >= 25;
      let soldierStatus = 'denied';
      if (cl >= soldierClearanceReq) {
        soldierStatus = 'viable';
      } else if (cl >= 38) {
        soldierStatus = 'restricted';
      } else {
        soldierStatus = 'denied';
      }
      const roverStatus = cl >= roverClearanceReq ? 'clearway' : 'pinch';

      return {
        unit1: isTankViable ? 'viable' : 'denied',
        unit2: soldierStatus,
        unit3: roverStatus,
        soldier: soldierStatus,
        tank: isTankViable ? 'viable' : 'denied',
        rover: roverStatus
      };
    }
  }

  function summarizeRouteViability() {
    if (samples.length < 2) {
      const tactical = samples.length ? evaluateSampleTactical(samples[0]) : null;
      return {
        unit1Pct: tactical && tactical.unit1 === 'viable' ? 100 : 0,
        unit2Pct: tactical && tactical.unit2 === 'viable' ? 100 : 0,
        unit1Distance: 0,
        unit2Distance: 0
      };
    }

    let unit1Distance = 0;
    let unit2Distance = 0;
    let totalDistance = 0;
    for (let i = 0; i < samples.length - 1; i++) {
      const segmentDistance = Math.max(0, samples[i + 1].y - samples[i].y);
      const current = evaluateSampleTactical(samples[i]);
      const next = evaluateSampleTactical(samples[i + 1]);
      totalDistance += segmentDistance;
      unit1Distance += segmentDistance * ((current.unit1 === 'viable' ? 1 : 0) + (next.unit1 === 'viable' ? 1 : 0)) / 2;
      unit2Distance += segmentDistance * ((current.unit2 === 'viable' ? 1 : 0) + (next.unit2 === 'viable' ? 1 : 0)) / 2;
    }

    return {
      unit1Pct: totalDistance ? Math.round((unit1Distance / totalDistance) * 100) : 0,
      unit2Pct: totalDistance ? Math.round((unit2Distance / totalDistance) * 100) : 0,
      unit1Distance,
      unit2Distance
    };
  }

  function countChokepointSegments(threshold = 35) {
    let count = 0;
    let insideChokepoint = false;
    for (const sample of samples) {
      const isChokepoint = sample.clearance < threshold;
      if (isChokepoint && !insideChokepoint) count++;
      insideChokepoint = isChokepoint;
    }
    return count;
  }

  // Update overall route stats for active mode
  function updateTacticalViabilityStats() {
    if (!samples.length) return;
    const { unit1Pct, unit2Pct } = summarizeRouteViability();

    if (soldierViabilityBar) soldierViabilityBar.style.width = `${unit2Pct}%`;
    if (soldierViabilityVal) soldierViabilityVal.textContent = `${unit2Pct}%`;
    if (tankViabilityBar) tankViabilityBar.style.width = `${unit1Pct}%`;
    if (tankViabilityVal) tankViabilityVal.textContent = `${unit1Pct}%`;
  }

  function setSampleIndex(idx) {
    if (idx < 0 || idx >= samples.length) return;
    currentIndex = idx;
    const sample = samples[currentIndex];

    // UI Updates
    if (timeline) timeline.value = String(currentIndex);
    if (currentTimeEl) currentTimeEl.textContent = sample.time || `+${currentIndex}s`;
    if (sampleCounter) sampleCounter.textContent = `SAMPLE ${currentIndex + 1} / ${samples.length}`;
    if (radarIndexEl) radarIndexEl.textContent = `#${currentIndex + 1}`;
    if (leftValueEl) leftValueEl.innerHTML = `${sample.left.toFixed(1)}<small>cm</small>`;
    if (rightValueEl) rightValueEl.innerHTML = `${sample.right.toFixed(1)}<small>cm</small>`;

    // Clearance
    const clearance = sample.clearance;
    if (clearanceValueEl) clearanceValueEl.innerHTML = `${clearance.toFixed(1)} <small>cm</small>`;
    if (clearanceBarEl) {
      const pct = Math.min(100, Math.max(5, (clearance / 160) * 100));
      clearanceBarEl.style.width = `${pct}%`;
      if (clearance < 30) {
        clearanceBarEl.style.background = 'var(--orange)';
      } else if (clearance < 70) {
        clearanceBarEl.style.background = 'var(--acid)';
      } else {
        clearanceBarEl.style.background = 'var(--cyan)';
      }
    }

    if (clearanceStatusEl) {
      if (clearance < 30) {
        clearanceStatusEl.textContent = 'CRITICAL TIGHT CORRIDOR';
        clearanceStatusEl.style.color = 'var(--orange)';
      } else if (clearance < 60) {
        clearanceStatusEl.textContent = 'RESTRICTED PASSAGEWAY';
        clearanceStatusEl.style.color = 'var(--acid)';
      } else {
        clearanceStatusEl.textContent = 'OPEN CLEARWAY';
        clearanceStatusEl.style.color = 'var(--cyan)';
      }
    }

    // Update Live AI Unit Indicators
    const tac = evaluateSampleTactical(sample);
    if (unitTankBadge) {
      if (tac.unit1 === 'viable') {
        unitTankBadge.className = 'tactical-badge viable';
        unitTankBadge.textContent = 'PASSABLE';
      } else {
        unitTankBadge.className = 'tactical-badge denied';
        unitTankBadge.textContent = currentMissionMode === 'disaster' ? 'STRETCHER BLOCKED' : 'ACCESS DENIED';
      }
    }

    if (unitSoldierBadge) {
      if (tac.unit2 === 'viable') {
        unitSoldierBadge.className = 'tactical-badge viable';
        unitSoldierBadge.textContent = 'PASSABLE';
      } else if (tac.unit2 === 'restricted') {
        unitSoldierBadge.className = 'tactical-badge restricted';
        unitSoldierBadge.textContent = currentMissionMode === 'disaster' ? 'CRAWL ENTRY ONLY' : 'TACTICAL CRAWL';
      } else {
        unitSoldierBadge.className = 'tactical-badge denied';
        unitSoldierBadge.textContent = 'BLOCKED / IMPASSE';
      }
    }

    if (unitRoverBadge) {
      if (tac.unit3 === 'clearway') {
        unitRoverBadge.className = 'tactical-badge clearway';
        unitRoverBadge.textContent = 'CLEARWAY';
      } else {
        unitRoverBadge.className = 'tactical-badge denied';
        unitRoverBadge.textContent = currentMissionMode === 'disaster' ? 'K9 BLOCKED' : 'PINCH HAZARD';
      }
    }

    // Update Structural Collapse Risk Meter
    const prevSample = currentIndex > 0 ? samples[currentIndex - 1] : null;
    const collapseRisk = calculateStructuralCollapseRisk(sample, prevSample);
    if (collapseRiskValue) {
      collapseRiskValue.textContent = collapseRisk.label;
      if (collapseRisk.riskPct > 65) collapseRiskValue.style.color = 'var(--danger)';
      else if (collapseRisk.riskPct >= 35) collapseRiskValue.style.color = 'var(--orange)';
      else collapseRiskValue.style.color = 'var(--acid)';
    }
    if (collapseRiskBar) {
      collapseRiskBar.style.width = `${collapseRisk.riskPct}%`;
    }
    if (collapseRiskHint) {
      collapseRiskHint.textContent = collapseRisk.hint;
    }

    // Auto-scroll map camera along route if follow mode is active
    if (isFollowVehicle) {
      centerCameraOnSample(currentIndex, false);
    }
  }

  function togglePlay() {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }

  function startPlayback() {
    if (!samples.length) return;
    isPlaying = true;
    if (playButton) {
      playButton.textContent = '❚❚';
      playButton.setAttribute('aria-label', 'Pause scan');
    }
    if (systemStatusEl) {
      systemStatusEl.textContent = 'MISSION PLAYBACK';
    }

    const intervalMs = Math.max(40, Math.round(500 / playbackSpeed));
    playbackTimer = setInterval(() => {
      let next = currentIndex + 1;
      if (next >= samples.length) {
        next = 0; // loop
      }
      setSampleIndex(next);
    }, intervalMs);
  }

  function stopPlayback() {
    isPlaying = false;
    if (playbackTimer) {
      clearInterval(playbackTimer);
      playbackTimer = null;
    }
    if (playButton) {
      playButton.textContent = '▶';
      playButton.setAttribute('aria-label', 'Play scan');
    }
    if (systemStatusEl) {
      systemStatusEl.textContent = 'MISSION PAUSED';
    }
  }

  // Smooth smoothing function (Moving Average 3-point)
  function getSmoothedSamples() {
    if (!isSmooth || samples.length < 3) return samples;

    const smoothed = [];
    for (let i = 0; i < samples.length; i++) {
      const prev = samples[Math.max(0, i - 1)];
      const curr = samples[i];
      const next = samples[Math.min(samples.length - 1, i + 1)];

      smoothed.push({
        ...curr,
        left: (prev.left + curr.left * 2 + next.left) / 4,
        right: (prev.right + curr.right * 2 + next.right) / 4,
        y: curr.y
      });
    }
    return smoothed;
  }

  // Fit Entire Route into view
  function fitMapToView() {
    if (!canvasWrap || !samples.length) return;
    const rect = canvasWrap.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    const maxDist = displayRange > 0 ? displayRange : Math.max(...samples.map(s => Math.max(s.left, s.right)));
    const totalRouteYcm = samples[samples.length - 1].y * 100; // in cm

    const fitScaleX = (w * 0.7) / (maxDist * 2 * corridorAspect || 200);
    const fitScaleY = (h * 0.75) / (totalRouteYcm || 500);

    viewScale = Math.min(fitScaleX, fitScaleY);
    viewScale = Math.max(0.04, Math.min(10, viewScale));

    panX = w / 2;
    panY = h - 50;

    updateZoomDisplay();

    if (rangeTopEl) {
      rangeTopEl.textContent = `${(totalRouteYcm / 100).toFixed(1)} m`;
    }
  }

  // Center camera smoothly on a sample index
  function centerCameraOnSample(idx, resetScale) {
    if (!canvasWrap || !samples[idx]) return;
    const rect = canvasWrap.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (resetScale) {
      viewScale = 1.0;
      updateZoomDisplay();
    }

    const sampleYcm = samples[idx].y * 100;
    panX = w / 2;
    panY = (h * 0.65) + (sampleYcm * viewScale);
  }

  // Hover detection for interactive inspection
  function updateHoverSample(clientX, clientY) {
    if (!canvasWrap || !samples.length) return;
    const rect = canvasWrap.getBoundingClientRect();
    const mouseCanvasX = clientX - rect.left;
    const mouseCanvasY = clientY - rect.top;

    // Convert mouse canvas coordinates to world coordinates (in cm)
    // Canvas transform: translate(panX, panY), scale(viewScale, -viewScale)
    const worldY = -(mouseCanvasY - panY) / viewScale;
    const worldX = (mouseCanvasX - panX) / (viewScale * corridorAspect);

    mouseWorldPos = { x: worldX, y: worldY };

    // Find sample closest in Y
    let bestIdx = -1;
    let minDiff = Infinity;
    const renderData = getSmoothedSamples();

    for (let i = 0; i < renderData.length; i++) {
      const sY = renderData[i].y * 100;
      const diff = Math.abs(sY - worldY);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = i;
      }
    }

    // Proximity check in screen pixels (within 35px vertically)
    if (bestIdx >= 0 && minDiff * viewScale < 40) {
      hoveredSampleIndex = bestIdx;
      const s = samples[hoveredSampleIndex];
      
      if (mapTooltip) {
        mapTooltip.style.display = 'block';
        mapTooltip.style.left = `${mouseCanvasX}px`;
        mapTooltip.style.top = `${mouseCanvasY}px`;

        if (ttSample) ttSample.textContent = `SAMPLE #${s.rawIndex || (hoveredSampleIndex + 1)}`;
        if (ttTime) ttTime.textContent = s.time || `${s.y.toFixed(1)}m`;
        if (ttLeft) ttLeft.textContent = `${s.left.toFixed(1)} cm`;
        if (ttRight) ttRight.textContent = `${s.right.toFixed(1)} cm`;
        if (ttClearance) ttClearance.textContent = `${s.clearance.toFixed(1)} cm`;
        if (ttDist) ttDist.textContent = `${s.y.toFixed(1)} m`;

        // Tooltip Tactical Badges
        const hsTac = evaluateSampleTactical(s);
        if (ttSoldierTag) {
          const unit2Name = currentMissionMode === 'disaster' ? 'Firefighter' : 'Soldier';
          ttSoldierTag.textContent = `${currentMissionMode === 'disaster' ? '🧑‍🚒' : '🪖'} ${unit2Name}: ${hsTac.unit2 === 'viable' ? 'PASSABLE' : (hsTac.unit2 === 'restricted' ? 'CRAWL' : 'BLOCKED')}`;
          ttSoldierTag.className = `tt-tag ${hsTac.unit2 === 'viable' ? 'viable' : (hsTac.unit2 === 'restricted' ? 'restricted' : 'denied')}`;
        }
        if (ttTankTag) {
          const unit1Name = currentMissionMode === 'disaster' ? 'Stretcher' : 'Tank';
          ttTankTag.textContent = `${currentMissionMode === 'disaster' ? '🚑' : '🛡️'} ${unit1Name}: ${hsTac.unit1 === 'viable' ? 'ACCESSIBLE' : 'DENIED'}`;
          ttTankTag.className = `tt-tag ${hsTac.unit1 === 'viable' ? 'viable' : 'denied'}`;
        }

        if (ttStatus) {
          if (s.clearance < 30) {
            ttStatus.textContent = '⚠️ CRITICAL BOTTLENECK';
            ttStatus.style.color = 'var(--orange)';
          } else if (s.clearance < 60) {
            ttStatus.textContent = '⚡ NARROW PASSAGEWAY';
            ttStatus.style.color = 'var(--acid)';
          } else {
            ttStatus.textContent = '✓ CLEAR PASSAGE';
            ttStatus.style.color = 'var(--cyan)';
          }
        }
      }
    } else {
      hoveredSampleIndex = -1;
      if (mapTooltip) mapTooltip.style.display = 'none';
    }
  }

  function getColorForDistance(cm) {
    const palette = getCanvasPalette();
    if (cm < 25) return palette.orange; // near
    if (cm < 60) return palette.acid; // mid
    return palette.cyan; // far
  }

  function getCanvasPalette() {
    if (document.documentElement.dataset.theme === 'light') {
      return {
        grid: 'rgba(49, 78, 66, 0.38)',
        label: 'rgba(38, 67, 56, 0.92)',
        centerline: 'rgba(49, 78, 66, 0.62)',
        quiet: 'rgba(49, 78, 66, 0.32)',
        faint: 'rgba(49, 78, 66, 0.2)',
        acid: '#557700',
        acidStrong: 'rgba(85, 119, 0, 0.9)',
        acidSoft: 'rgba(85, 119, 0, 0.16)',
        cyan: '#007e70',
        cyanStrong: 'rgba(0, 126, 112, 0.9)',
        cyanSoft: 'rgba(0, 126, 112, 0.16)',
        orange: '#ad4d10',
        orangeStrong: 'rgba(173, 77, 16, 0.9)',
        orangeSoft: 'rgba(173, 77, 16, 0.15)',
        dangerSoft: 'rgba(197, 53, 53, 0.2)',
        hazardFill: 'rgba(173, 77, 16, 0.18)',
        corridorCyan: 'rgba(0, 126, 112, 0.11)',
        corridorOrange: 'rgba(173, 77, 16, 0.11)',
        boundary: 'rgba(85, 119, 0, 0.78)',
        crossbeamHover: 'rgba(0, 126, 112, 0.9)',
        trajectory: 'rgba(0, 126, 112, 0.86)',
        startFill: 'rgba(0, 126, 112, 0.18)',
        radarGrid: 'rgba(49, 78, 66, 0.46)',
        sweepFill: 'rgba(85, 119, 0, 0.24)',
        sweepLine: 'rgba(85, 119, 0, 0.82)',
        sensorCyan: 'rgba(0, 126, 112, 0.72)',
        sensorOrange: 'rgba(173, 77, 16, 0.72)',
        minimapTrack: 'rgba(49, 78, 66, 0.76)',
        minimapCorridor: 'rgba(0, 126, 112, 0.18)',
        vehicleFill: '#ffffff',
        blipOutline: '#10241d'
      };
    }

    return {
      grid: 'rgba(27, 48, 42, 0.4)',
      label: 'rgba(111, 139, 128, 0.6)',
      centerline: 'rgba(55, 80, 70, 0.6)',
      quiet: 'rgba(55, 80, 70, 0.35)',
      faint: 'rgba(27, 48, 42, 0.2)',
      acid: '#b9f52d',
      acidStrong: 'rgba(185, 245, 45, 0.85)',
      acidSoft: 'rgba(185, 245, 45, 0.09)',
      cyan: '#39e6c5',
      cyanStrong: 'rgba(57, 230, 197, 0.9)',
      cyanSoft: 'rgba(57, 230, 197, 0.15)',
      orange: '#ff9b50',
      orangeStrong: 'rgba(255, 155, 80, 0.9)',
      orangeSoft: 'rgba(255, 155, 80, 0.1)',
      dangerSoft: 'rgba(255, 77, 77, 0.22)',
      hazardFill: 'rgba(255, 155, 80, 0.18)',
      corridorCyan: 'rgba(57, 230, 197, 0.08)',
      corridorOrange: 'rgba(255, 155, 80, 0.08)',
      boundary: 'rgba(185, 245, 45, 0.45)',
      crossbeamHover: 'rgba(57, 230, 197, 0.8)',
      trajectory: 'rgba(57, 230, 197, 0.75)',
      startFill: 'rgba(57, 230, 197, 0.2)',
      radarGrid: 'rgba(27, 48, 42, 0.8)',
      sweepFill: 'rgba(185, 245, 45, 0.25)',
      sweepLine: 'rgba(185, 245, 45, 0.7)',
      sensorCyan: 'rgba(57, 230, 197, 0.3)',
      sensorOrange: 'rgba(255, 155, 80, 0.3)',
      minimapTrack: 'rgba(27, 48, 42, 0.9)',
      minimapCorridor: 'rgba(57, 230, 197, 0.15)',
      vehicleFill: '#0f221b',
      blipOutline: '#ffffff'
    };
  }

  // Animation / Render Loop
  function startRenderLoop() {
    function frame() {
      renderMap();
      renderRadar();
      renderMinimap();
      animFrameId = requestAnimationFrame(frame);
    }
    animFrameId = requestAnimationFrame(frame);
  }

  // Main Map Canvas Renderer
  function renderMap() {
    if (!mapCtx || !mapCanvas || !canvasWrap) return;
    const rect = canvasWrap.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const dpr = window.devicePixelRatio || 1;

    // Reset transform & clear entire canvas buffer
    mapCtx.setTransform(1, 0, 0, 1, 0, 0);
    mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
    mapCtx.scale(dpr, dpr);

    if (!samples.length) return;

    const renderData = getSmoothedSamples();
    const curSample = renderData[currentIndex] || renderData[0];
    const maxYcm = samples[samples.length - 1].y * 100;
    const palette = getCanvasPalette();

    mapCtx.save();
    mapCtx.translate(panX, panY);
    mapCtx.scale(viewScale, -viewScale); // Invert Y so vehicle travels UPWARDS

    // 1. Grid Lines & Meter Guides
    mapCtx.strokeStyle = palette.grid;
    mapCtx.lineWidth = 1 / viewScale;
    
    // Horizontal distance lines every 1 meter (100 cm) or 5m depending on scale
    const meterStepCm = viewScale < 0.2 ? 500 : (viewScale < 0.5 ? 200 : 100);
    for (let y = 0; y <= maxYcm + 100; y += meterStepCm) {
      mapCtx.beginPath();
      mapCtx.moveTo(-300 * corridorAspect, y);
      mapCtx.lineTo(300 * corridorAspect, y);
      mapCtx.stroke();

      // Distance label in canvas space
      mapCtx.save();
      mapCtx.scale(1 / viewScale, -1 / viewScale); // Un-invert for readable text
      mapCtx.fillStyle = palette.label;
      mapCtx.font = '9px "DM Mono", monospace';
      mapCtx.fillText(`${(y / 100).toFixed(0)}m`, (-320 * corridorAspect) * viewScale, -y * viewScale + 3);
      mapCtx.restore();
    }

    // Vertical Centerline (Vehicle track reference)
    mapCtx.setLineDash([4 / viewScale, 4 / viewScale]);
    mapCtx.strokeStyle = palette.centerline;
    mapCtx.lineWidth = 1 / viewScale;
    mapCtx.beginPath();
    mapCtx.moveTo(0, 0);
    mapCtx.lineTo(0, maxYcm + 50);
    mapCtx.stroke();
    mapCtx.setLineDash([]);

    // 2. Bottleneck / Hazard Warning Zones (Clearance < 30 cm)
    if (isHazardsEnabled) {
      for (let i = 0; i < renderData.length; i++) {
        const s = renderData[i];
        if (s.clearance < 30 || s.left < 15 || s.right < 15) {
          const y = s.y * 100;
          mapCtx.fillStyle = palette.hazardFill;
          mapCtx.beginPath();
          mapCtx.rect(-s.left * corridorAspect, y - 8, (s.left + s.right) * corridorAspect, 16);
          mapCtx.fill();
        }
      }
    }

    // 3. Corridor Polygon & Boundaries (Connected Returns)
    if (isConnected && renderData.length > 1) {
      mapCtx.beginPath();
      // Left boundary upwards
      for (let i = 0; i < renderData.length; i++) {
        const s = renderData[i];
        const lx = -s.left * corridorAspect;
        const ly = s.y * 100;
        if (i === 0) mapCtx.moveTo(lx, ly);
        else mapCtx.lineTo(lx, ly);
      }
      // Right boundary downwards
      for (let i = renderData.length - 1; i >= 0; i--) {
        const s = renderData[i];
        const rx = s.right * corridorAspect;
        const ry = s.y * 100;
        mapCtx.lineTo(rx, ry);
      }
      mapCtx.closePath();

      // Shaded corridor area
      const corridorGrad = mapCtx.createLinearGradient(0, 0, 0, maxYcm || 100);
      corridorGrad.addColorStop(0, palette.corridorCyan);
      corridorGrad.addColorStop(0.5, palette.acidSoft);
      corridorGrad.addColorStop(1, palette.corridorOrange);
      mapCtx.fillStyle = corridorGrad;
      mapCtx.fill();

      // Outer boundary walls
      mapCtx.strokeStyle = palette.boundary;
      mapCtx.lineWidth = 1.5 / viewScale;
      mapCtx.stroke();
    }

    // 4. Sonar Return Crossbeams & Point Clouds
    for (let i = 0; i < renderData.length; i++) {
      const s = renderData[i];
      const y = s.y * 100;
      const isCurrent = i === currentIndex;
      const isHovered = i === hoveredSampleIndex;
      const isPast = i <= currentIndex;

      // Crossbeams connecting center to walls
      mapCtx.strokeStyle = isCurrent 
        ? palette.acidStrong
        : (isHovered ? palette.crossbeamHover : (isPast ? palette.quiet : palette.faint));
      mapCtx.lineWidth = (isCurrent || isHovered ? 2 : 1) / viewScale;
      mapCtx.beginPath();
      mapCtx.moveTo(-s.left * corridorAspect, y);
      mapCtx.lineTo(s.right * corridorAspect, y);
      mapCtx.stroke();

      // Left point
      const ptRadius = (isCurrent || isHovered ? 5.5 : 3.0) / viewScale;
      mapCtx.fillStyle = getColorForDistance(s.left);
      mapCtx.beginPath();
      mapCtx.arc(-s.left * corridorAspect, y, ptRadius, 0, Math.PI * 2);
      mapCtx.fill();

      // Right point
      mapCtx.fillStyle = getColorForDistance(s.right);
      mapCtx.beginPath();
      mapCtx.arc(s.right * corridorAspect, y, ptRadius, 0, Math.PI * 2);
      mapCtx.fill();
    }

    // 5. Vehicle Trajectory Track Line
    mapCtx.beginPath();
    for (let i = 0; i <= currentIndex && i < renderData.length; i++) {
      const y = renderData[i].y * 100;
      if (i === 0) mapCtx.moveTo(0, y);
      else mapCtx.lineTo(0, y);
    }
    mapCtx.strokeStyle = palette.acid;
    mapCtx.lineWidth = 2.5 / viewScale;
    mapCtx.stroke();

    // AI Tactical Unit Zoning Bands
    if (isAiZoning) {
      for (let i = 0; i < renderData.length; i++) {
        const s = renderData[i];
        const tac = evaluateSampleTactical(s);
        const y = s.y * 100;
        const leftX = -s.left * corridorAspect;
        const rightX = s.right * corridorAspect;
        const corridorWidth = rightX - leftX;

        if (tac.tank === 'viable') {
          // All-unit viable zone: subtle acid-green tactical ribbon
          mapCtx.fillStyle = palette.acidSoft;
          mapCtx.fillRect(leftX, y - 6, corridorWidth, 12);
        } else if (tac.soldier === 'viable') {
          // Personnel-only access: amber warning ribbon
          mapCtx.fillStyle = palette.orangeSoft;
          mapCtx.fillRect(leftX, y - 6, corridorWidth, 12);
        } else {
          // Chokepoint / Impasse: red crosshatch hazard highlight
          mapCtx.fillStyle = palette.dangerSoft;
          mapCtx.fillRect(leftX, y - 8, corridorWidth, 16);
          mapCtx.strokeStyle = 'rgba(255, 77, 77, 0.55)';
          mapCtx.lineWidth = 1 / viewScale;
          mapCtx.beginPath();
          mapCtx.moveTo(leftX, y - 8);
          mapCtx.lineTo(Math.min(rightX, leftX + 16), y + 8);
          mapCtx.moveTo(rightX, y - 8);
          mapCtx.lineTo(Math.max(leftX, rightX - 16), y + 8);
          mapCtx.stroke();
        }
      }
    }

    // AI Optimal Autonomous Collision-Free Trajectory (Centerline)
    if (isAiTrajectory && renderData.length > 1) {
      mapCtx.beginPath();
      for (let i = 0; i < renderData.length; i++) {
        const s = renderData[i];
        const optimalX = ((s.right - s.left) / 2) * corridorAspect;
        const optimalY = s.y * 100;
        if (i === 0) mapCtx.moveTo(optimalX, optimalY);
        else mapCtx.lineTo(optimalX, optimalY);
      }
      mapCtx.strokeStyle = palette.trajectory;
      mapCtx.lineWidth = 1.8 / viewScale;
      mapCtx.setLineDash([6 / viewScale, 4 / viewScale]);
      mapCtx.lineDashOffset = -(performance.now() / 80) / viewScale;
      mapCtx.stroke();
      mapCtx.setLineDash([]);
      mapCtx.lineDashOffset = 0;

      // Sparse waypoint nodes keep the autonomous route legible at any zoom.
      const waypointStep = Math.max(1, Math.floor(renderData.length / 12));
      mapCtx.fillStyle = palette.cyanStrong;
      for (let i = 0; i < renderData.length; i += waypointStep) {
        const waypoint = renderData[i];
        const waypointX = ((waypoint.right - waypoint.left) / 2) * corridorAspect;
        mapCtx.beginPath();
        mapCtx.arc(waypointX, waypoint.y * 100, 2 / viewScale, 0, Math.PI * 2);
        mapCtx.fill();
      }

      // Draw active target node on the optimal trajectory
      const curOptimalX = ((curSample.right - curSample.left) / 2) * corridorAspect;
      const curOptimalY = curSample.y * 100;
      mapCtx.fillStyle = palette.cyan;
      mapCtx.beginPath();
      mapCtx.arc(curOptimalX, curOptimalY, 3.5 / viewScale, 0, Math.PI * 2);
      mapCtx.fill();
    }

    // 6. Hover Crosshair Highlight
    if (hoveredSampleIndex >= 0 && hoveredSampleIndex < renderData.length) {
      const hs = renderData[hoveredSampleIndex];
      const hy = hs.y * 100;
      mapCtx.strokeStyle = palette.cyanStrong;
      mapCtx.lineWidth = 1.5 / viewScale;
      mapCtx.setLineDash([3 / viewScale, 3 / viewScale]);
      mapCtx.beginPath();
      mapCtx.moveTo(-hs.left * corridorAspect - 15, hy);
      mapCtx.lineTo(hs.right * corridorAspect + 15, hy);
      mapCtx.stroke();
      mapCtx.setLineDash([]);
    }

    // 7. Start / End Markers
    // Start Marker (0m)
    mapCtx.fillStyle = palette.startFill;
    mapCtx.strokeStyle = palette.cyan;
    mapCtx.lineWidth = 1.5 / viewScale;
    mapCtx.beginPath();
    mapCtx.arc(0, 0, 6 / viewScale, 0, Math.PI * 2);
    mapCtx.fill();
    mapCtx.stroke();

    // End Marker
    mapCtx.strokeStyle = palette.orange;
    mapCtx.beginPath();
    mapCtx.arc(0, maxYcm, 6 / viewScale, 0, Math.PI * 2);
    mapCtx.stroke();

    // 8. Vehicle Marker at currentIndex
    const curY = curSample.y * 100;
    const vehWidth = 18 / viewScale;
    const vehLength = 26 / viewScale;

    // Active Beam Lines from vehicle body to walls
    mapCtx.setLineDash([3 / viewScale, 3 / viewScale]);
    mapCtx.strokeStyle = palette.cyan;
    mapCtx.lineWidth = 1.5 / viewScale;
    mapCtx.beginPath();
    mapCtx.moveTo(-vehWidth / 2, curY);
    mapCtx.lineTo(-curSample.left * corridorAspect, curY);
    mapCtx.stroke();

    mapCtx.strokeStyle = palette.orange;
    mapCtx.beginPath();
    mapCtx.moveTo(vehWidth / 2, curY);
    mapCtx.lineTo(curSample.right * corridorAspect, curY);
    mapCtx.stroke();
    mapCtx.setLineDash([]);

    // Vehicle Body
    mapCtx.fillStyle = palette.vehicleFill;
    mapCtx.strokeStyle = palette.acid;
    mapCtx.lineWidth = 2 / viewScale;
    mapCtx.beginPath();
    mapCtx.roundRect(-vehWidth / 2, curY - vehLength / 2, vehWidth, vehLength, 3 / viewScale);
    mapCtx.fill();
    mapCtx.stroke();

    // Forward Direction Arrow
    mapCtx.fillStyle = palette.acid;
    mapCtx.beginPath();
    mapCtx.moveTo(0, curY + vehLength * 0.35);
    mapCtx.lineTo(-vehWidth * 0.3, curY);
    mapCtx.lineTo(0, curY + vehLength * 0.1);
    mapCtx.lineTo(vehWidth * 0.3, curY);
    mapCtx.closePath();
    mapCtx.fill();

    // Pulsing Sonar Ping Wave
    const pulseRadius = ((Date.now() / 25) % 40) / viewScale;
    mapCtx.strokeStyle = document.documentElement.dataset.theme === 'light'
      ? `rgba(85, 119, 0, ${Math.max(0, 1 - pulseRadius / (40 / viewScale))})`
      : `rgba(185, 245, 45, ${Math.max(0, 1 - pulseRadius / (40 / viewScale))})`;
    mapCtx.lineWidth = 1.5 / viewScale;
    mapCtx.beginPath();
    mapCtx.arc(0, curY, pulseRadius, 0, Math.PI * 2);
    mapCtx.stroke();

    mapCtx.restore();
  }

  // Radar Return Scope Renderer (Right Panel)
  function renderRadar() {
    if (!radarCtx || !radarCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = radarCanvas.width / dpr;
    const h = radarCanvas.height / dpr;

    radarCtx.setTransform(1, 0, 0, 1, 0, 0);
    radarCtx.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
    radarCtx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h - 22;
    const maxR = Math.min(cx - 15, cy - 15);
    if (maxR <= 0) return;
    const palette = getCanvasPalette();

    // Draw Radar Rings (Arc from PI to 2*PI)
    radarCtx.strokeStyle = palette.radarGrid;
    radarCtx.lineWidth = 1;
    const rings = [0.25, 0.5, 0.75, 1.0];
    rings.forEach(r => {
      radarCtx.beginPath();
      radarCtx.arc(cx, cy, maxR * r, Math.PI, 0);
      radarCtx.stroke();
    });

    // Angle spokes
    const angles = [Math.PI, (5 * Math.PI) / 6, (3 * Math.PI) / 4, (2 * Math.PI) / 3, Math.PI / 2, Math.PI / 3, Math.PI / 4, Math.PI / 6, 0];
    angles.forEach(ang => {
      radarCtx.beginPath();
      radarCtx.moveTo(cx, cy);
      radarCtx.lineTo(cx + Math.cos(ang) * maxR, cy - Math.sin(ang) * maxR);
      radarCtx.stroke();
    });

    // Sweeping Radar Beam
    radarAngle = (radarAngle + 0.035) % Math.PI;
    const sweepX = cx + Math.cos(Math.PI + radarAngle) * maxR;
    const sweepY = cy + Math.sin(Math.PI + radarAngle) * maxR;

    const sweepGrad = radarCtx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    sweepGrad.addColorStop(0, palette.sweepFill);
    sweepGrad.addColorStop(1, 'rgba(185, 245, 45, 0)');

    radarCtx.beginPath();
    radarCtx.moveTo(cx, cy);
    radarCtx.arc(cx, cy, maxR, Math.PI + radarAngle - 0.22, Math.PI + radarAngle);
    radarCtx.closePath();
    radarCtx.fillStyle = sweepGrad;
    radarCtx.fill();

    radarCtx.beginPath();
    radarCtx.moveTo(cx, cy);
    radarCtx.lineTo(sweepX, sweepY);
    radarCtx.strokeStyle = palette.sweepLine;
    radarCtx.lineWidth = 1.5;
    radarCtx.stroke();

    if (!samples.length) return;

    const curSample = samples[currentIndex];
    const maxRangeCm = 150; // Reference range for display
    const leftDist = curSample.left;
    const rightDist = curSample.right;

    // Left sensor blip (180 deg)
    const leftR = Math.min(maxR, (leftDist / maxRangeCm) * maxR);
    const lx = cx - leftR;
    const ly = cy;

    radarCtx.strokeStyle = palette.sensorCyan;
    radarCtx.lineWidth = 2;
    radarCtx.beginPath();
    radarCtx.moveTo(cx, cy);
    radarCtx.lineTo(lx, ly);
    radarCtx.stroke();

    radarCtx.fillStyle = getColorForDistance(leftDist);
    radarCtx.beginPath();
    radarCtx.arc(lx, ly, 6, 0, Math.PI * 2);
    radarCtx.fill();
    radarCtx.strokeStyle = palette.blipOutline;
    radarCtx.lineWidth = 1;
    radarCtx.stroke();

    // Right sensor blip (0 deg)
    const rightR = Math.min(maxR, (rightDist / maxRangeCm) * maxR);
    const rx = cx + rightR;
    const ry = cy;

    radarCtx.strokeStyle = palette.sensorOrange;
    radarCtx.lineWidth = 2;
    radarCtx.beginPath();
    radarCtx.moveTo(cx, cy);
    radarCtx.lineTo(rx, ry);
    radarCtx.stroke();

    radarCtx.fillStyle = getColorForDistance(rightDist);
    radarCtx.beginPath();
    radarCtx.arc(rx, ry, 6, 0, Math.PI * 2);
    radarCtx.fill();
    radarCtx.strokeStyle = palette.blipOutline;
    radarCtx.lineWidth = 1;
    radarCtx.stroke();

    // Center Vehicle Marker
    radarCtx.fillStyle = palette.acid;
    radarCtx.beginPath();
    radarCtx.arc(cx, cy, 4, 0, Math.PI * 2);
    radarCtx.fill();
  }

  // Minimap Navigator Renderer
  function renderMinimap() {
    if (!minimapCtx || !minimapCanvas || !samples.length) return;
    const dpr = window.devicePixelRatio || 1;
    const mw = minimapCanvas.width / dpr;
    const mh = minimapCanvas.height / dpr;

    minimapCtx.setTransform(1, 0, 0, 1, 0, 0);
    minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    minimapCtx.scale(dpr, dpr);

    const maxYcm = samples[samples.length - 1].y * 100 || 1;
    const pad = 6;
    const drawH = mh - (pad * 2);
    const cx = mw / 2;
    const palette = getCanvasPalette();

    // Draw route track
    minimapCtx.strokeStyle = palette.minimapTrack;
    minimapCtx.lineWidth = 1;
    minimapCtx.beginPath();
    minimapCtx.moveTo(cx, mh - pad);
    minimapCtx.lineTo(cx, pad);
    minimapCtx.stroke();

    // Draw corridor outline
    minimapCtx.fillStyle = palette.minimapCorridor;
    minimapCtx.beginPath();
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const ny = mh - pad - ((s.y * 100) / maxYcm) * drawH;
      const nx = cx - (s.left / 150) * (mw * 0.35);
      if (i === 0) minimapCtx.moveTo(nx, ny);
      else minimapCtx.lineTo(nx, ny);
    }
    for (let i = samples.length - 1; i >= 0; i--) {
      const s = samples[i];
      const ny = mh - pad - ((s.y * 100) / maxYcm) * drawH;
      const nx = cx + (s.right / 150) * (mw * 0.35);
      minimapCtx.lineTo(nx, ny);
    }
    minimapCtx.closePath();
    minimapCtx.fill();

    // Draw Vehicle Dot on Minimap
    const curSample = samples[currentIndex] || samples[0];
    const curMinimapY = mh - pad - ((curSample.y * 100) / maxYcm) * drawH;
    minimapCtx.fillStyle = palette.acid;
    minimapCtx.beginPath();
    minimapCtx.arc(cx, curMinimapY, 3.5, 0, Math.PI * 2);
    minimapCtx.fill();

    // Update Viewbox on Minimap
    if (minimapViewbox && canvasWrap) {
      const wrapRect = canvasWrap.getBoundingClientRect();
      const topWorldY = -(0 - panY) / viewScale;
      const botWorldY = -(wrapRect.height - panY) / viewScale;

      const topMinimapY = mh - pad - (topWorldY / maxYcm) * drawH;
      const botMinimapY = mh - pad - (botWorldY / maxYcm) * drawH;

      const boxTop = Math.max(0, Math.min(mh, Math.min(topMinimapY, botMinimapY)));
      const boxHeight = Math.max(8, Math.min(mh, Math.abs(botMinimapY - topMinimapY)));

      minimapViewbox.style.top = `${boxTop + 20}px`; // accounting for title header
      minimapViewbox.style.left = '6px';
      minimapViewbox.style.width = `${mw}px`;
      minimapViewbox.style.height = `${boxHeight}px`;
    }
  }

  // AI Tactical Mission Debrief Modal Handler
  function openAiDebriefModal() {
    if (!aiDebriefModal || !samples.length) {
      alert('Please load a telemetry log before generating the AI tactical debrief.');
      return;
    }

    const totalDist = samples[samples.length - 1].y;
    const routeSummary = summarizeRouteViability();
    const unit2Pct = routeSummary.unit2Pct;
    const unit1Pct = routeSummary.unit1Pct;
    const unit2Dist = routeSummary.unit2Distance.toFixed(1);
    const unit1Dist = routeSummary.unit1Distance.toFixed(1);
    const chokepointCount = countChokepointSegments();

    if (debriefDistance) debriefDistance.textContent = `${totalDist.toFixed(1)} m`;
    if (debriefSamples) debriefSamples.textContent = `${samples.length} telemetry samples`;
    if (debriefSoldierPct) debriefSoldierPct.textContent = `${unit2Pct}%`;
    if (debriefSoldierDist) debriefSoldierDist.textContent = `${unit2Dist}m traversable`;
    if (debriefTankPct) debriefTankPct.textContent = `${unit1Pct}%`;
    if (debriefTankDist) debriefTankDist.textContent = `${unit1Dist}m clearance`;
    if (debriefChokepoints) debriefChokepoints.textContent = String(chokepointCount);

    // Dual-Mode AI Strategic Directive Text & Subtitle
    if (currentMissionMode === 'disaster') {
      if (aiDebriefTitle) aiDebriefTitle.textContent = 'UN-INSARAG Search & Extraction SITREP';
      if (debriefSubtitle) debriefSubtitle.textContent = 'UN-INSARAG USAR Emergency Search & Extraction Assessment';
      if (debriefUnit2Label) debriefUnit2Label.textContent = '🧑‍🚒 FIREFIGHTER PASSAGE';
      if (debriefUnit1Label) debriefUnit1Label.textContent = '🚑 STRETCHER ACCESS';
      if (debriefUnit2Header) debriefUnit2Header.textContent = '🧑‍🚒 Firefighter Status';
      if (debriefUnit1Header) debriefUnit1Header.textContent = '🚑 Stretcher Status';
      if (debriefRecommendation) {
        let advice = '';
        if (unit1Pct < 40) {
          advice = `<strong>CRITICAL RESCUE BOTTLENECK:</strong> Stretcher evacuation is blocked across <strong>${100 - unit1Pct}%</strong> of the collapsed rubble corridor due to narrow structural pinching (&lt;${stretcherClearanceReq}cm). <strong>USAR Directive:</strong> Halt manual patient stretcher extrication. Deploy concrete saws, hydraulic spreaders, and shoring at classified choke sectors. Firefighter crawl ingress is ${unit2Pct > 70 ? 'viable' : 'restricted'}; send the K9 search team forward where marked clear.`;
        } else if (unit1Pct < 75) {
          advice = `<strong>PARTIAL RESCUE ACCESS:</strong> Stretcher teams have approximately <strong>${unit1Dist}m</strong> of route-wide access. <strong>USAR Directive:</strong> Establish a forward casualty collection point before the first restricted sector and shore unstable walls before victim movement.`;
        } else {
          advice = `<strong>CLEAR RESCUE CORRIDOR:</strong> Corridor supports stretcher evacuation and first responder deployment across <strong>${unit1Pct}%</strong> of the route. <strong>USAR Directive:</strong> Full medical evacuation team ingress is permitted, subject to continuous structural monitoring.`;
        }
        debriefRecommendation.innerHTML = advice;
      }
    } else {
      if (aiDebriefTitle) aiDebriefTitle.textContent = 'UGRV-AI Reconnaissance Assessment';
      if (debriefSubtitle) debriefSubtitle.textContent = 'Corridor Viability Analysis & Threat Classification';
      if (debriefUnit2Label) debriefUnit2Label.textContent = '🪖 SOLDIER PASSAGE';
      if (debriefUnit1Label) debriefUnit1Label.textContent = '🛡️ TANK / ARMOR ACCESS';
      if (debriefUnit2Header) debriefUnit2Header.textContent = '🪖 Soldier Status';
      if (debriefUnit1Header) debriefUnit1Header.textContent = '🛡️ Tank Status';
      if (debriefRecommendation) {
        let advice = '';
        if (unit1Pct < 30) {
          advice = `<strong>CRITICAL ACCESS RESTRICTION:</strong> Heavy armored vehicles are denied access across <strong>${100 - unit1Pct}%</strong> of the inspected corridor. <strong>Directive:</strong> Mechanized armor must halt at the perimeter; deploy dismounted infantry with breach equipment and use the UGRV to reconnoiter marked clearways.`;
        } else if (unit1Pct < 70) {
          advice = `<strong>PARTIAL VEHICLE ACCESS:</strong> Armored vehicles have approximately <strong>${unit1Dist}m</strong> of route-wide access before critical lateral restrictions. <strong>Directive:</strong> Establish a mechanized halt point before the first denied sector; advance dismounted squads through personnel-only sectors.`;
        } else {
          advice = `<strong>HIGH CLEARANCE CORRIDOR:</strong> Corridor supports armored tactical vehicles across <strong>${unit1Pct}%</strong> of the route. <strong>Directive:</strong> Vehicular advance is permitted with continuous sonar monitoring at identified chokepoints.`;
        }
        debriefRecommendation.innerHTML = advice;
      }
    }

    // Generate Sector Breakdown Table
    if (debriefSectorTable) {
      debriefSectorTable.innerHTML = '';
      const sectorSize = Math.max(1, Math.ceil(samples.length / 5));
      const sectorNames = ['Sector Alpha', 'Sector Bravo', 'Sector Charlie', 'Sector Delta', 'Sector Echo'];
      let sectorIdx = 0;

      for (let i = 0; i < samples.length; i += sectorSize) {
        const slice = samples.slice(i, i + sectorSize);
        if (!slice.length) continue;
        const name = sectorNames[sectorIdx % sectorNames.length];
        sectorIdx++;

        const startY = slice[0].y.toFixed(1);
        const endY = slice[slice.length - 1].y.toFixed(1);
        const avgCl = (slice.reduce((acc, s) => acc + s.clearance, 0) / slice.length).toFixed(1);

        const unit2Viable = slice.filter(s => evaluateSampleTactical(s).unit2 === 'viable').length / slice.length >= 0.7;
        const unit1Viable = slice.filter(s => evaluateSampleTactical(s).unit1 === 'viable').length / slice.length >= 0.7;
        const unit3Viable = slice.filter(s => evaluateSampleTactical(s).unit3 === 'clearway').length / slice.length >= 0.7;

        let directive = '';
        if (currentMissionMode === 'disaster') {
          if (unit1Viable) directive = 'Stretcher extraction clear; monitor and shore as needed';
          else if (unit2Viable) directive = 'SCBA/K9 ingress only; shore and widen before extraction';
          else if (unit3Viable) directive = 'K9 reconnaissance only; structural breach required';
          else directive = 'Impasse; stabilize rubble before entry';
        } else if (unit1Viable) {
          directive = 'All units permitted (armor + infantry)';
        } else if (unit2Viable) {
          directive = 'Mechanized halt point; dismounted infantry only';
        } else if (unit3Viable) {
          directive = 'UGRV reconnaissance only; engineering breach required';
        } else {
          directive = 'Impasse; breach and route-clearance operation required';
        }

        const row = document.createElement('tr');
        row.innerHTML = `
          <td><strong>${name}</strong></td>
          <td>${startY}m – ${endY}m</td>
          <td>${avgCl} cm</td>
          <td><span class="tt-tag ${unit2Viable ? 'viable' : 'denied'}">${unit2Viable ? 'PASSABLE' : 'RESTRICTED'}</span></td>
          <td><span class="tt-tag ${unit1Viable ? 'viable' : 'denied'}">${unit1Viable ? 'ACCESSIBLE' : 'DENIED'}</span></td>
          <td>${directive}</td>
        `;
        debriefSectorTable.appendChild(row);
      }
    }

    lastFocusedElement = document.activeElement;
    aiDebriefModal.hidden = false;
    aiDebriefModal.classList.add('active');
    aiDebriefModal.setAttribute('aria-hidden', 'false');
    for (const element of document.querySelectorAll('body > :not(#aiDebriefModal):not(script)')) element.inert = true;
    if (aiModalClose) aiModalClose.focus();
  }

  function closeAiDebriefModal() {
    if (aiDebriefModal) {
      aiDebriefModal.classList.remove('active');
      aiDebriefModal.setAttribute('aria-hidden', 'true');
      aiDebriefModal.hidden = true;
      for (const element of document.querySelectorAll('body > :not(#aiDebriefModal):not(script)')) element.inert = false;
      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
    }
  }

  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
