// HMC Connect Pro - Administrative Dashboard Controller
document.addEventListener("DOMContentLoaded", () => {
  const db = window.HMCDatabase;
  if (!db) {
    console.error("Database mockData.js not loaded.");
    return;
  }

  // State Variables
  let isLoggedIn = false;
  let currentTab = "overview";
  let realTimeInterval = null;
  const storedReports = localStorage.getItem('patientDailyReports');
  const initialReports = storedReports ? JSON.parse(storedReports) : (db.patientDailyReports || []);
  let activeKPIValues = {
    occupancy: 84,
    revenue: 1.84,
    satisfaction: 4.82,
    doctors: 68,
    monitoring: initialReports.length
  };

  // Shared activity logs for the chronological timeline feed
  let activityLogs = [
    { icon: "check_circle", color: "green", text: "Reclamación <strong>CLM-102</strong> aprobada con Ficohsa Seguros (L. 12,350.00)", time: "Hace 5 minutos" },
    { icon: "medical_services", color: "blue", text: "Consulta finalizada y receta digital enviada para <strong>Andrés Mendoza</strong>", time: "Hace 15 minutos" },
    { icon: "add_circle", color: "orange", text: "Nueva reclamación <strong>CLM-105</strong> ingresada por Urgencias", time: "Hace 1 hora" },
    { icon: "cancel", color: "red", text: "Reclamación <strong>CLM-104</strong> rechazada con Seguros Crefisa (L. 5,120.00)", time: "Hace 2 horas" }
  ];

  // Tooltip DOM elements created dynamically
  const chartTooltip = document.createElement("div");
  chartTooltip.className = "chart-tooltip";
  document.body.appendChild(chartTooltip);

  const heatmapTooltip = document.createElement("div");
  heatmapTooltip.className = "chart-tooltip";
  document.body.appendChild(heatmapTooltip);

  // --- Dynamic Spanish Date ---
  function getFormattedDate(offsetDays = 0) {
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const d = new Date();
    if (offsetDays !== 0) d.setDate(d.getDate() + offsetDays);
    return `${d.getDate()} de ${months[d.getMonth()]}, ${d.getFullYear()}`;
  }

  // --- Tab Routing Engine ---
  function switchTab(tabId) {
    currentTab = tabId;

    // Sidebar active item styling
    document.querySelectorAll(".admin-nav-item").forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Hide all views first
    const views = [
      "overview", "claims", "patients", "appointments", 
      "consults", "billing", "reports", "users", "settings"
    ];
    views.forEach(v => {
      const el = document.getElementById(`admin-view-${v}`);
      if (el) el.classList.add("hidden");
    });

    // Show active view
    const activeView = document.getElementById(`admin-view-${tabId}`);
    if (activeView) {
      activeView.classList.remove("hidden");
    }

    if (tabId === "overview") {
      initOverview();
      startRealTimeUpdates();
    } else if (tabId === "claims") {
      stopRealTimeUpdates();
      renderClaims();
    } else if (tabId === "appointments") {
      stopRealTimeUpdates();
      renderAdminAppointments();
    } else {
      stopRealTimeUpdates();
    }
  }

  // Bind Sidebar items
  document.querySelectorAll(".admin-nav-item").forEach(btn => {
    btn.onclick = () => {
      const tab = btn.dataset.tab;
      if (tab) switchTab(tab);
    };
  });

  // --- Real-time updates synchronization loop ---
  function startRealTimeUpdates() {
    if (!isLoggedIn) return;
    if (realTimeInterval) clearInterval(realTimeInterval);
    
    updateSyncTime();
    realTimeInterval = setInterval(() => {
      // Slightly vary KPI metrics randomly
      activeKPIValues.occupancy = Math.min(95, Math.max(75, activeKPIValues.occupancy + Math.floor(Math.random() * 5 - 2)));
      activeKPIValues.revenue = Math.min(2.5, Math.max(1.2, activeKPIValues.revenue + (Math.random() * 0.16 - 0.08)));
      activeKPIValues.satisfaction = Math.min(5.0, Math.max(4.5, activeKPIValues.satisfaction + (Math.random() * 0.06 - 0.03)));
      activeKPIValues.doctors = Math.min(80, Math.max(55, activeKPIValues.doctors + Math.floor(Math.random() * 3 - 1)));

      updateSyncTime();
      showToast("🟢 Dashboard sincronizado en tiempo real.", "success");
      
      // Update KPIs in Overview DOM
      animateKPIValues();
    }, 15000);
  }

  function stopRealTimeUpdates() {
    if (realTimeInterval) {
      clearInterval(realTimeInterval);
      realTimeInterval = null;
    }
  }

  function updateSyncTime() {
    const syncSpan = document.getElementById("sync-time");
    if (syncSpan) {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      syncSpan.innerText = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }
  }

  // --- KPI Value Counter & Progress Animation ---
  function animateKPIValues() {
    // Occupancy
    const occVal = document.getElementById("kpi-occupancy-val");
    if (occVal) {
      countToVal(occVal, parseInt(occVal.innerText) || 0, activeKPIValues.occupancy, "%");
      document.getElementById("kpi-occupancy-bar").style.width = `${activeKPIValues.occupancy}%`;
    }

    // Revenue
    const revVal = document.getElementById("kpi-revenue-val");
    if (revVal) {
      countToValFloat(revVal, parseFloat(revVal.innerText) || 0.0, activeKPIValues.revenue, "");
      const pct = (activeKPIValues.revenue / 3.0) * 100;
      document.getElementById("kpi-revenue-bar").style.width = `${pct}%`;
    }

    // Satisfaction
    const satVal = document.getElementById("kpi-satisfaction-val");
    if (satVal) {
      countToValFloat(satVal, parseFloat(satVal.innerText) || 0.0, activeKPIValues.satisfaction, "", 2);
      const pct = (activeKPIValues.satisfaction / 5.0) * 100;
      document.getElementById("kpi-satisfaction-bar").style.width = `${pct}%`;
    }

    // Doctors
    const docVal = document.getElementById("kpi-doctors-val");
    if (docVal) {
      countToVal(docVal, parseInt(docVal.innerText) || 0, activeKPIValues.doctors, "");
      const pct = (activeKPIValues.doctors / 80) * 100;
      document.getElementById("kpi-doctors-bar").style.width = `${pct}%`;
    }

    // Daily Monitoring Reports
    const monVal = document.getElementById("kpi-monitoring-val");
    if (monVal) {
      const stored = localStorage.getItem('patientDailyReports');
      if (stored) {
        const parsed = JSON.parse(stored);
        activeKPIValues.monitoring = parsed.length;
      }
      countToVal(monVal, parseInt(monVal.innerText) || 0, activeKPIValues.monitoring, "");
      const pct = Math.min(100, (activeKPIValues.monitoring / 20) * 100);
      document.getElementById("kpi-monitoring-bar").style.width = `${pct}%`;
    }
  }

  function countToVal(element, start, end, suffix = "") {
    let current = start;
    const duration = 800; // ms
    const stepTime = Math.max(10, Math.floor(duration / Math.abs(end - start || 1)));
    const increment = end > start ? 1 : -1;
    
    if (start === end) {
      element.innerText = `${end}${suffix}`;
      return;
    }

    const timer = setInterval(() => {
      current += increment;
      element.innerText = `${current}${suffix}`;
      if (current === end) {
        clearInterval(timer);
      }
    }, stepTime);
  }

  function countToValFloat(element, start, end, suffix = "", decimals = 2) {
    let current = start;
    const steps = 30;
    const increment = (end - start) / steps;
    let stepCount = 0;

    const timer = setInterval(() => {
      current += increment;
      element.innerText = `${current.toFixed(decimals)}${suffix}`;
      stepCount++;
      if (stepCount >= steps) {
        clearInterval(timer);
        element.innerText = `${end.toFixed(decimals)}${suffix}`;
      }
    }, 25);
  }

  // --- Executive Overview Initialize ---
  function initOverview() {
    // Current date label
    const dateDiv = document.getElementById("overview-date");
    if (dateDiv) dateDiv.innerText = getFormattedDate();

    // Initial counter animations
    animateKPIValues();

    // Render Revenue line chart
    renderRevenueChart();

    // Render occupied departments progress bars (previously heatmap)
    renderHeatmap();

    // Render compact recent claims panel
    renderRecentClaims();

    // Render recent timeline activity logs
    renderRecentActivity();
  }

  // --- SVG Revenue Curve Render with tooltips and shaded areas ---
  function renderRevenueChart() {
    const svg = document.getElementById("admin-revenue-svg");
    if (!svg) return;

    // Revenue numbers
    const data = [1.2, 1.4, 1.35, 1.6, 1.5, 1.84];
    const variations = ["+5.2%", "+16.6%", "-3.5%", "+18.5%", "-6.2%", "+22.6%"];
    const labels = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
    
    const width = 500;
    const height = 160;

    // Coordinate calculation
    const coords = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - 60) + 30;
      const y = height - ((val - 1.0) / 1.0) * (height - 40) - 20;
      return { x, y, val, label: labels[idx], variation: variations[idx] };
    });

    const pointsPath = coords.map(c => `${c.x},${c.y}`).join(" ");

    // Points closed for area shading polygon
    const shadePath = `30,${height - 20} ${pointsPath} ${coords[coords.length-1].x},${height - 20}`;

    let labelsSvg = "";
    coords.forEach(c => {
      labelsSvg += `<text x="${c.x-10}" y="${height - 2}" fill="#94A3B8" font-size="9" font-weight="700">${c.label}</text>`;
    });

    svg.innerHTML = `
      <defs>
        <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1976D2" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#1976D2" stop-opacity="0.0"/>
        </linearGradient>
      </defs>

      <!-- Gridlines -->
      <line x1="30" y1="20" x2="470" y2="20" stroke="#E2E8F0" stroke-width="1" />
      <line x1="30" y1="70" x2="470" y2="70" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4" />
      <line x1="30" y1="120" x2="470" y2="120" stroke="#E2E8F0" stroke-width="1" />
      
      <!-- Axis labels -->
      <text x="5" y="24" fill="#94A3B8" font-size="9" font-weight="700">L 2.0M</text>
      <text x="5" y="74" fill="#94A3B8" font-size="9" font-weight="700">L 1.5M</text>
      <text x="5" y="124" fill="#94A3B8" font-size="9" font-weight="700">L 1.0M</text>
      
      <!-- Shaded polygon under curve -->
      <polygon points="${shadePath}" class="chart-area-fill" />

      <!-- Curve Line path -->
      <polyline fill="none" stroke="#1976D2" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${pointsPath}" />
      
      <!-- Points nodes -->
      ${coords.map((c, idx) => `
        <circle cx="${c.x}" cy="${c.y}" r="4.5" class="chart-point" data-idx="${idx}" />
      `).join("")}

      <!-- Bottom day labels -->
      ${labelsSvg}
    `;

    // Tooltip hover interactions on chart points
    svg.querySelectorAll(".chart-point").forEach(circle => {
      circle.addEventListener("mouseenter", (e) => {
        const idx = parseInt(circle.dataset.idx);
        const pt = coords[idx];

        chartTooltip.innerHTML = `
          <strong>Día:</strong> ${pt.label}<br>
          <strong>Ingreso:</strong> L. ${pt.val}M<br>
          <strong>Variación:</strong> <span style="color:${pt.variation.startsWith('+') ? 'var(--success-green)' : 'var(--danger-red)'}">${pt.variation}</span>
        `;
        chartTooltip.classList.add("visible");
      });

      circle.addEventListener("mousemove", (e) => {
        chartTooltip.style.left = `${e.pageX + 10}px`;
        chartTooltip.style.top = `${e.pageY - 15}px`;
      });

      circle.addEventListener("mouseleave", () => {
        chartTooltip.classList.remove("visible");
      });
    });
  }

  // --- Horizontal Progress Bars for Wing occupancy with colored statuses ---
  function renderHeatmap() {
    const container = document.getElementById("admin-heatmap-container");
    if (!container) return;

    container.innerHTML = "";
    db.adminStats.occupancyByWing.forEach(wing => {
      const row = document.createElement("div");
      row.className = "occupancy-dept-row";
      
      // Determine bar status color
      let barColor = "var(--success-green)"; // <60%
      if (wing.pct >= 60 && wing.pct <= 85) {
        barColor = "var(--warning-orange)"; // 60-85%
      } else if (wing.pct > 85) {
        barColor = "var(--danger-red)"; // >85%
      }

      row.innerHTML = `
        <div class="occupancy-dept-meta">
          <span>${wing.wing}</span>
          <span>${wing.pct}%</span>
        </div>
        <div class="occupancy-progress-bg">
          <div class="occupancy-progress-fill" style="width:${wing.pct}%; background-color:${barColor};"></div>
        </div>
      `;

      // Hover tooltip bindings
      row.addEventListener("mouseenter", (e) => {
        const available = wing.capacity - wing.occupied;
        heatmapTooltip.innerHTML = `
          <div style="font-weight:800; border-bottom:1px solid rgba(255,255,255,0.1); margin-bottom:4px; padding-bottom:2px;">${wing.wing}</div>
          <strong>Camas Ocupadas:</strong> ${wing.occupied}<br>
          <strong>Camas Disponibles:</strong> ${available}<br>
          <strong>Capacidad Total:</strong> ${wing.capacity}<br>
          <strong>Porcentaje Ocupación:</strong> <span style="color:${barColor}; font-weight:800;">${wing.pct}%</span>
        `;
        heatmapTooltip.classList.add("visible");
      });

      row.addEventListener("mousemove", (e) => {
        heatmapTooltip.style.left = `${e.pageX + 12}px`;
        heatmapTooltip.style.top = `${e.pageY - 20}px`;
      });

      row.addEventListener("mouseleave", () => {
        heatmapTooltip.classList.remove("visible");
      });

      container.appendChild(row);
    });
  }

  // --- Render Compact Recent Claims Cards (Max 5 elements visible) ---
  function renderRecentClaims() {
    const container = document.getElementById("recent-claims-container");
    if (!container) return;

    container.innerHTML = "";
    // Grab first 3 items (changed from 5 to fit layout without scrolling)
    const recent = db.adminStats.billingClaims.slice(0, 3);

    recent.forEach(claim => {
      const card = document.createElement("div");
      card.className = "recent-claim-card";
      const statusClass = claim.status.toLowerCase();
      
      let statusIcon = "pending_actions";
      if (claim.status === "Aprobada") statusIcon = "check_circle";
      if (claim.status === "Rechazada") statusIcon = "cancel";

      card.innerHTML = `
        <div class="recent-claim-info">
          <strong style="font-size:0.88rem; color:var(--text-dark);">${claim.patient}</strong>
          <span class="recent-claim-meta">${claim.id} &bull; ${claim.insurance} &bull; ${claim.department}</span>
        </div>
        <div class="recent-claim-right">
          <strong style="font-size:0.9rem; color:var(--text-dark);">${claim.amount}</strong>
          <span class="status-pill ${statusClass}" style="padding: 3px 8px; font-size:0.7rem; border-radius:10px;">
            <span class="material-symbols-rounded" style="font-size:0.85rem;">${statusIcon}</span>
            ${claim.status}
          </span>
        </div>
      `;
      container.appendChild(card);
    });

    // Bind link to the full list tab view
    const viewAllBtn = document.getElementById("btn-view-all-claims");
    if (viewAllBtn) {
      viewAllBtn.onclick = () => {
        switchTab("claims");
      };
    }
  }

  // --- Render Chronological Activity Timeline Feed ---
  function renderRecentActivity() {
    const container = document.getElementById("recent-activity-container");
    if (!container) return;

    container.innerHTML = "";
    activityLogs.forEach(evt => {
      const item = document.createElement("div");
      item.className = "timeline-item";
      
      item.innerHTML = `
        <div class="timeline-line"></div>
        <div class="timeline-dot-indicator ${evt.color}"></div>
        <div class="timeline-content">
          <span>${evt.text}</span>
          <span class="timeline-time">${evt.time}</span>
        </div>
      `;
      container.appendChild(item);
    });
  }

  function addActivityLog(claim, finalStatus) {
    const color = finalStatus === "Aprobada" ? "green" : "red";
    const icon = finalStatus === "Aprobada" ? "check_circle" : "cancel";
    activityLogs.unshift({
      icon: icon,
      color: color,
      text: `Reclamación <strong>${claim.id}</strong> ${finalStatus.toLowerCase()} para ${claim.patient} (${claim.amount})`,
      time: "Ahora mismo"
    });
    renderRecentActivity();
  }

  // --- Filtering & Search Claim queues (Claims tab) ---
  const searchInput = document.getElementById("claims-search-input");
  const filterIns = document.getElementById("filter-insurance");
  const filterDept = document.getElementById("filter-dept");
  const filterStatus = document.getElementById("filter-status");
  const filterDate = document.getElementById("filter-date");

  [searchInput, filterIns, filterDept, filterStatus, filterDate].forEach(elem => {
    if (elem) elem.addEventListener("input", renderClaims);
  });

  function renderClaims() {
    const tableBody = document.getElementById("claims-table-body");
    if (!tableBody) return;

    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const insurance = filterIns ? filterIns.value : "all";
    const department = filterDept ? filterDept.value : "all";
    const status = filterStatus ? filterStatus.value : "all";
    const dateSel = filterDate ? filterDate.value : "all";

    const filtered = db.adminStats.billingClaims.filter(claim => {
      const matchesSearch = claim.id.toLowerCase().includes(query) ||
                            claim.patient.toLowerCase().includes(query) ||
                            claim.insurance.toLowerCase().includes(query);

      const matchesIns = insurance === "all" || claim.insurance === insurance;
      const matchesDept = department === "all" || claim.department === department;
      const matchesStatus = status === "all" || claim.status === status;
      
      let matchesDate = true;
      if (dateSel === "today") {
        matchesDate = claim.date === "2026-07-23";
      } else if (dateSel === "yesterday") {
        matchesDate = claim.date !== "2026-07-23";
      }

      return matchesSearch && matchesIns && matchesDept && matchesStatus && matchesDate;
    });

    tableBody.innerHTML = "";
    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-muted); font-style:italic;">No se encontraron reclamaciones para los filtros seleccionados.</td></tr>`;
      return;
    }

    filtered.forEach(claim => {
      const tr = document.createElement("tr");
      tr.id = `claim-row-${claim.id}`;
      const statusClass = claim.status.toLowerCase();
      
      let statusIcon = "pending_actions";
      if (claim.status === "Aprobada") statusIcon = "check_circle";
      if (claim.status === "Rechazada") statusIcon = "cancel";

      // Select patient avatar based on name
      let avatarPath = "assets/patient_avatar.png";
      if (claim.patient.includes("Estela")) avatarPath = "assets/doctor_female_profile.png";
      if (claim.patient.includes("Francisco")) avatarPath = "assets/doctor_male_profile_2.png";
      if (claim.patient.includes("Xiomara")) avatarPath = "assets/doctor_female_profile_2.png";

      // Build insurance company logo/text
      let insHtml = "";
      if (claim.insurance === "Ficohsa Seguros") {
        insHtml = `<div style="display:flex; align-items:center; gap:8px;"><span class="material-symbols-rounded" style="color:#0284C7; font-size:1.25rem;">security</span> <span style="font-size:0.85rem; font-weight:600; color:#475569;">Ficohsa Seguros</span></div>`;
      } else if (claim.insurance === "Seguros Atlántida") {
        insHtml = `<div style="display:flex; align-items:center; gap:8px;"><span class="material-symbols-rounded" style="color:#DC2626; font-size:1.25rem;">account_balance</span> <span style="font-size:0.85rem; font-weight:600; color:#475569;">Seguros Atlántida</span></div>`;
      } else if (claim.insurance === "MAPFRE Honduras") {
        insHtml = `<div style="display:flex; align-items:center; gap:8px;"><span class="material-symbols-rounded" style="color:#EF4444; font-size:1.25rem;">brightness_low</span> <span style="font-size:0.85rem; font-weight:600; color:#475569;">MAPFRE Honduras</span></div>`;
      } else {
        insHtml = `<div style="display:flex; align-items:center; gap:8px;"><span class="material-symbols-rounded" style="color:#059669; font-size:1.25rem;">local_hospital</span> <span style="font-size:0.85rem; font-weight:600; color:#475569;">Seguros CREFISA</span></div>`;
      }

      // Build department icon/text
      let deptHtml = "";
      if (claim.department === "Cardiología") {
        deptHtml = `<span style="display:inline-flex; align-items:center; gap:6px; color:#DC2626; font-weight:600; font-size:0.82rem;"><span class="material-symbols-rounded" style="font-size:1.05rem; color:#EF4444;">favorite</span> Cardiología</span>`;
      } else if (claim.department === "Ginecología") {
        deptHtml = `<span style="display:inline-flex; align-items:center; gap:6px; color:#EC4899; font-weight:600; font-size:0.82rem;"><span class="material-symbols-rounded" style="font-size:1.05rem; color:#EC4899;">child_care</span> Ginecología</span>`;
      } else if (claim.department === "Traumatología") {
        deptHtml = `<span style="display:inline-flex; align-items:center; gap:6px; color:#8B5CF6; font-weight:600; font-size:0.82rem;"><span class="material-symbols-rounded" style="font-size:1.05rem; color:#8B5CF6;">accessibility</span> Traumatología</span>`;
      } else {
        deptHtml = `<span style="display:inline-flex; align-items:center; gap:6px; color:#EF4444; font-weight:600; font-size:0.82rem;"><span class="material-symbols-rounded" style="font-size:1.05rem; color:#EF4444;">emergency</span> Urgencias</span>`;
      }

      // Action column configuration
      let actionsHtml = "";
      if (claim.status === "Pendiente") {
        actionsHtml = `
          <div style="display:flex; justify-content:center; gap:6px;">
            <button class="claim-btn approve ripple-btn" style="border: 1px solid #D1FAE5; background-color:#F0FDF4; color:#16A34A; padding:6px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px;" title="Aprobar" data-id="${claim.id}"><span class="material-symbols-rounded" style="font-size:1.25rem;">check</span></button>
            <button class="claim-btn reject ripple-btn" style="border: 1px solid #FEE2E2; background-color:#FEF2F2; color:#DC2626; padding:6px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px;" title="Rechazar" data-id="${claim.id}"><span class="material-symbols-rounded" style="font-size:1.25rem;">close</span></button>
            <button class="claim-btn view-details ripple-btn" style="border: 1px solid #E2E8F0; background-color:#F8FAFC; color:#64748B; padding:6px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px;" title="Ver Detalles" onclick="showToast('🔍 Detalle de reclamación ${claim.id} (Simulado)', 'success')"><span class="material-symbols-rounded" style="font-size:1.25rem;">visibility</span></button>
          </div>
        `;
      } else {
        actionsHtml = `
          <div style="display:flex; justify-content:center; gap:6px;">
            <button class="claim-btn view-details ripple-btn" style="border: 1px solid #E2E8F0; background-color:#F8FAFC; color:#64748B; padding:6px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px;" title="Ver Detalles" onclick="showToast('🔍 Detalle de reclamación ${claim.id} (Simulado)', 'success')"><span class="material-symbols-rounded" style="font-size:1.25rem;">visibility</span></button>
            <button class="claim-btn view-doc ripple-btn" style="border: 1px solid #DBEAFE; background-color:#EFF6FF; color:#2563EB; padding:6px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px;" title="Ver Documento" onclick="showToast('📄 Documento de liquidación emitido (Simulado)', 'success')"><span class="material-symbols-rounded" style="font-size:1.25rem;">description</span></button>
          </div>
        `;
      }

      tr.innerHTML = `
        <td style="padding:14px 20px;"><strong>${claim.id}</strong></td>
        <td style="padding:14px 20px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${avatarPath}" alt="${claim.patient}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid #E2E8F0;">
            <span style="font-weight:700; color:#1E293B; font-size:0.88rem;">${claim.patient}</span>
          </div>
        </td>
        <td style="padding:14px 20px;">${insHtml}</td>
        <td style="padding:14px 20px;">${deptHtml}</td>
        <td style="padding:14px 20px;"><strong style="color:#1E293B;">${claim.amount}</strong></td>
        <td style="padding:14px 20px; color:#64748B; font-size:0.85rem; font-weight:500;">${claim.date}</td>
        <td style="padding:14px 20px;">
          <span class="status-pill ${statusClass}" id="claim-pill-${claim.id}">
            <span class="material-symbols-rounded" style="font-size:1rem;">${statusIcon}</span>
            ${claim.status}
          </span>
        </td>
        <td id="claim-actions-${claim.id}" style="padding:14px 20px;">
          ${actionsHtml}
        </td>
      `;

      // Bind claim actions
      const approveBtn = tr.querySelector(".claim-btn.approve");
      if (approveBtn) {
        approveBtn.onclick = () => processClaim(claim, "Aprobada");
      }

      const rejectBtn = tr.querySelector(".claim-btn.reject");
      if (rejectBtn) {
        rejectBtn.onclick = () => processClaim(claim, "Rechazada");
      }

      tableBody.appendChild(tr);
    });
  }

  // --- Process individual claims dynamically without full table re-render ---
  function processClaim(claim, finalStatus) {
    claim.status = finalStatus;

    // Apply flash highlight to the row
    const row = document.getElementById(`claim-row-${claim.id}`);
    if (row) {
      row.classList.add("claim-row-updating");
      setTimeout(() => row.classList.remove("claim-row-updating"), 800);
    }
    
    // Update pill status inside row
    const pill = document.getElementById(`claim-pill-${claim.id}`);
    if (pill) {
      pill.className = `status-pill ${finalStatus.toLowerCase()}`;
      
      let statusIcon = "check_circle";
      if (finalStatus === "Rechazada") statusIcon = "cancel";

      pill.innerHTML = `
        <span class="material-symbols-rounded" style="font-size:1rem;">${statusIcon}</span>
        ${finalStatus}
      `;
    }

    // Clear and update actions cell inside row
    const actionsCell = document.getElementById(`claim-actions-${claim.id}`);
    if (actionsCell) {
      actionsCell.innerHTML = `
        <div style="display:flex; justify-content:center; gap:6px;">
          <button class="claim-btn view-details ripple-btn" style="border: 1px solid #E2E8F0; background-color:#F8FAFC; color:#64748B; padding:6px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px;" title="Ver Detalles" onclick="showToast('🔍 Detalle de reclamación ${claim.id} (Simulado)', 'success')"><span class="material-symbols-rounded" style="font-size:1.25rem;">visibility</span></button>
          <button class="claim-btn view-doc ripple-btn" style="border: 1px solid #DBEAFE; background-color:#EFF6FF; color:#2563EB; padding:6px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px;" title="Ver Documento" onclick="showToast('📄 Documento de liquidación emitido (Simulado)', 'success')"><span class="material-symbols-rounded" style="font-size:1.25rem;">description</span></button>
        </div>
      `;
    }

    // Sync updates to Overview recent cards and timeline dynamic feeds
    renderRecentClaims();
    addActivityLog(claim, finalStatus);

    showToast(`💼 Reclamación ${claim.id} marcada como ${finalStatus}.`, "success");
  }

  // --- Portal Custom Toast Notification Engine ---
  function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "hmc-portal-toast slide-up";

    let iconName = "check_circle";
    if (type === "warning") iconName = "warning";
    if (type === "danger") iconName = "error";

    toast.innerHTML = `
      <span class="material-symbols-rounded icon">${iconName}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Fade out and remove after 3s
    setTimeout(() => {
      toast.style.animation = "fadeIn 0.3s reverse forwards";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // --- Admin Appointments System Logic ---
  let defaultAdminAppts = [
    { id: "APT-1002", patientName: "Andrés Mendoza Salgado", doctorName: "Dr. Carlos Valladares", specialty: "Cardiología", date: "2026-07-28", time: "09:30 AM", type: "Presencial", room: "Consultorio 302 - Torre A", status: "Confirmada" },
    { id: "APT-1003", patientName: "Estela Maria Bonilla", doctorName: "Dra. Sofía Murillo", specialty: "Dermatología", date: "2026-07-31", time: "02:00 PM", type: "Telemedicina", room: "Sala Virtual EMR", status: "Confirmada" },
    { id: "APT-1004", patientName: "Carmen Elena Zelaya", doctorName: "Dr. Carlos Valladares", specialty: "Cardiología", date: "2026-07-24", time: "10:15 AM", type: "Presencial", room: "Consultorio 302 - Torre A", status: "Completada" }
  ];

  function getAdminAppointments() {
    const stored = localStorage.getItem('adminAppointments');
    if (stored) {
      return JSON.parse(stored);
    }
    localStorage.setItem('adminAppointments', JSON.stringify(defaultAdminAppts));
    return defaultAdminAppts;
  }

  function saveAdminAppointments(appts) {
    localStorage.setItem('adminAppointments', JSON.stringify(appts));
  }

  window.filterAdminAppointments = function() {
    renderAdminAppointments();
  };

  window.openNewAppointmentModal = function() {
    document.getElementById("new-appt-modal").classList.remove("hidden");
  };

  window.closeNewAppointmentModal = function() {
    document.getElementById("new-appt-modal").classList.add("hidden");
  };

  window.updateDoctorsDropdown = function() {
    const specialty = document.getElementById("new-appt-specialty").value;
    const docSelect = document.getElementById("new-appt-doctor");
    const roomSelect = document.getElementById("new-appt-room");
    docSelect.innerHTML = "";
    if (specialty === "Cardiología") {
      docSelect.innerHTML = `<option value="Dr. Carlos Valladares">Dr. Carlos Valladares</option>`;
      roomSelect.value = "Consultorio 302 - Torre A";
    } else {
      docSelect.innerHTML = `<option value="Dra. Sofía Murillo">Dra. Sofía Murillo</option>`;
      roomSelect.value = "Sala Virtual EMR";
    }
  };

  window.saveNewAppointment = function() {
    const patientName = document.getElementById("new-appt-patient").value;
    const specialty = document.getElementById("new-appt-specialty").value;
    const doctorName = document.getElementById("new-appt-doctor").value;
    const date = document.getElementById("new-appt-date").value;
    const time = document.getElementById("new-appt-time").value;
    const mode = document.querySelector('input[name="new-appt-mode"]:checked').value;
    const room = document.getElementById("new-appt-room").value;
    const notes = document.getElementById("new-appt-notes").value;

    if (!date) {
      showToast("⚠️ Por favor selecciona una fecha.", "warning");
      return;
    }

    const newAptId = `APT-${Math.floor(1000 + Math.random() * 9000)}`;

    const newAptObj = {
      id: newAptId,
      patientName: patientName,
      doctorName: doctorName,
      specialty: specialty,
      date: date,
      time: time,
      type: mode,
      room: room,
      status: "Confirmada",
      notes: notes
    };

    // Save to adminAppointments
    const appts = getAdminAppointments();
    appts.unshift(newAptObj);
    saveAdminAppointments(appts);

    // Sync to Patient mobile app if it's Andrés Mendoza
    if (patientName === "Andrés Mendoza Salgado") {
      const storedPatientApts = localStorage.getItem('appointments');
      const patientApts = storedPatientApts ? JSON.parse(storedPatientApts) : db.appointments;
      
      const newPatientApt = {
        id: newAptId.toLowerCase(),
        doctorName: doctorName,
        specialty: specialty,
        avatar: doctorName.includes("Carlos") ? "doctor_male_profile.png" : "doctor_female_profile.png",
        date: date,
        time: time,
        room: room,
        type: mode,
        status: "Confirmada",
        canCheckIn: true
      };
      
      patientApts.unshift(newPatientApt);
      localStorage.setItem('appointments', JSON.stringify(patientApts));
    }

    // Sync to Physician queue if doctor is Dr. Carlos Valladares
    if (doctorName === "Dr. Carlos Valladares") {
      const storedQueue = localStorage.getItem('doctorQueue');
      const queue = storedQueue ? JSON.parse(storedQueue) : db.doctorQueue;

      const queueObj = {
        id: `q-${Math.floor(100 + Math.random() * 900)}`,
        patientName: patientName,
        code: patientName.includes("Andrés") ? "HMC-98231-AM" : patientName.includes("Carmen") ? "HMC-77218-CZ" : "HMC-11029-MC",
        age: patientName.includes("Andrés") ? 34 : patientName.includes("Carmen") ? 62 : 48,
        reason: notes || `Consulta de ${specialty}`,
        status: "Esperando",
        time: time,
        telemetryStatus: "vital-ok"
      };

      queue.push(queueObj);
      localStorage.setItem('doctorQueue', JSON.stringify(queue));
    }

    showToast("📅 Cita programada y sincronizada correctamente.", "success");
    closeNewAppointmentModal();
    renderAdminAppointments();
  };

  window.cancelAppointment = function(apptId) {
    if (!confirm(`¿Estás seguro de que deseas cancelar la cita ${apptId}?`)) return;

    let appts = getAdminAppointments();
    appts = appts.map(a => {
      if (a.id === apptId) {
        a.status = "Cancelada";
      }
      return a;
    });
    saveAdminAppointments(appts);

    // Sync cancel state to Patient mobile app if applicable
    const storedPatientApts = localStorage.getItem('appointments');
    if (storedPatientApts) {
      let patientApts = JSON.parse(storedPatientApts);
      patientApts = patientApts.map(pa => {
        if (pa.id === apptId.toLowerCase()) {
          pa.status = "Cancelada";
        }
        return pa;
      });
      localStorage.setItem('appointments', JSON.stringify(patientApts));
    }

    showToast(`📅 Cita ${apptId} cancelada con éxito.`, "success");
    renderAdminAppointments();
  };

  window.reprogramAppointment = function(apptId) {
    const appts = getAdminAppointments();
    const appt = appts.find(a => a.id === apptId);
    if (!appt) return;

    const newDate = prompt("Ingresa la nueva fecha (AAAA-MM-DD):", appt.date);
    if (!newDate) return;
    const newTime = prompt("Ingresa la nueva hora (ej. 10:30 AM):", appt.time);
    if (!newTime) return;

    const updatedAppts = appts.map(a => {
      if (a.id === apptId) {
        a.date = newDate;
        a.time = newTime;
      }
      return a;
    });
    saveAdminAppointments(updatedAppts);

    // Sync reschedule state to Patient mobile app
    const storedPatientApts = localStorage.getItem('appointments');
    if (storedPatientApts) {
      let patientApts = JSON.parse(storedPatientApts);
      patientApts = patientApts.map(pa => {
        if (pa.id === apptId.toLowerCase()) {
          pa.date = newDate;
          pa.time = newTime;
        }
        return pa;
      });
      localStorage.setItem('appointments', JSON.stringify(patientApts));
    }

    showToast(`📅 Cita ${apptId} reprogramada para el ${newDate} a las ${newTime}.`, "success");
    renderAdminAppointments();
  };

  window.changeDoctor = function(apptId) {
    const appts = getAdminAppointments();
    const appt = appts.find(a => a.id === apptId);
    if (!appt) return;

    const newDoc = prompt("Ingresa el nombre del nuevo médico:", appt.doctorName);
    if (!newDoc) return;

    const updatedAppts = appts.map(a => {
      if (a.id === apptId) {
        a.doctorName = newDoc;
      }
      return a;
    });
    saveAdminAppointments(updatedAppts);
    showToast(`📅 Médico cambiado a ${newDoc} para la cita ${apptId}.`, "success");
    renderAdminAppointments();
  };

  window.changeRoom = function(apptId) {
    const appts = getAdminAppointments();
    const appt = appts.find(a => a.id === apptId);
    if (!appt) return;

    const newRoom = prompt("Ingresa el nuevo consultorio:", appt.room);
    if (!newRoom) return;

    const updatedAppts = appts.map(a => {
      if (a.id === apptId) {
        a.room = newRoom;
      }
      return a;
    });
    saveAdminAppointments(updatedAppts);
    showToast(`📅 Consultorio cambiado a ${newRoom} para la cita ${apptId}.`, "success");
    renderAdminAppointments();
  };

  function renderAdminAppointments() {
    const tableBody = document.getElementById("admin-appointments-table-body");
    if (!tableBody) return;

    const appts = getAdminAppointments();

    const searchQuery = document.getElementById("admin-appt-search").value.toLowerCase();
    const doctorFilter = document.getElementById("admin-appt-doctor-filter").value;
    const specialtyFilter = document.getElementById("admin-appt-specialty-filter").value;
    const statusFilter = document.getElementById("admin-appt-status-filter").value;

    const filtered = appts.filter(a => {
      const matchSearch = a.patientName.toLowerCase().includes(searchQuery);
      const matchDoc = doctorFilter === "all" || a.doctorName === doctorFilter;
      const matchSpec = specialtyFilter === "all" || a.specialty === specialtyFilter;
      const matchStatus = statusFilter === "all" || a.status === statusFilter;
      return matchSearch && matchDoc && matchSpec && matchStatus;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" style="padding:40px; text-align:center; color:#64748B; font-weight:600; font-size:0.9rem;">
            📭 No se encontraron citas con los filtros seleccionados.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filtered.map(a => {
      let statusColor = "#E2E8F0";
      let statusText = "#475569";
      if (a.status === "Confirmada") {
        statusColor = "#E8F7F3";
        statusText = "#0A6D5E";
      } else if (a.status === "Completada") {
        statusColor = "#E0F2FE";
        statusText = "#0369A1";
      } else if (a.status === "Cancelada") {
        statusColor = "#FFEBEE";
        statusText = "#C62828";
      }

      const typeBadge = a.type === "Telemedicina" 
        ? `<span style="background-color:#E0F2FE; color:#0369A1; padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">Telemedicina</span>`
        : `<span style="background-color:#E8F7F3; color:#0A6D5E; padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">Presencial</span>`;

      const patientAvatar = a.patientName.includes("Andrés") ? "patient_avatar.png" : a.patientName.includes("Carmen") ? "doctor_female_profile_2.png" : "patient_avatar.png";

      return `
        <tr style="border-bottom:1px solid #F1F5F9;">
          <td style="padding:14px 20px;"><strong>${a.id}</strong></td>
          <td style="padding:14px 20px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="assets/${patientAvatar}" style="width:36px; height:36px; border-radius:50%; border:1px solid #E2E8F0; object-fit:cover;">
              <span style="font-weight:700; color:#1E293B;">${a.patientName}</span>
            </div>
          </td>
          <td style="padding:14px 20px; font-weight:600; color:#1E293B;">${a.doctorName}</td>
          <td style="padding:14px 20px; font-weight:600; color:#475569;">${a.specialty}</td>
          <td style="padding:14px 20px; font-weight:500;">${a.date} &bull; ${a.time}</td>
          <td style="padding:14px 20px;">${typeBadge}</td>
          <td style="padding:14px 20px; color:#64748B; font-weight:500;">${a.room}</td>
          <td style="padding:14px 20px;">
            <span style="background-color:${statusColor}; color:${statusText}; padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:700;">${a.status}</span>
          </td>
          <td style="padding:14px 20px; text-align:center;">
            <div style="display:flex; justify-content:center; gap:6px;">
              <button class="claim-btn ripple-btn" style="border: 1px solid #E2E8F0; background-color:#F8FAFC; color:#64748B; padding:6px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px;" title="Reprogramar Fecha/Hora" onclick="reprogramAppointment('${a.id}')">
                <span class="material-symbols-rounded" style="font-size:1.15rem;">edit_calendar</span>
              </button>
              <button class="claim-btn ripple-btn" style="border: 1px solid #E2E8F0; background-color:#F8FAFC; color:#64748B; padding:6px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px;" title="Cambiar Médico" onclick="changeDoctor('${a.id}')">
                <span class="material-symbols-rounded" style="font-size:1.15rem;">supervisor_account</span>
              </button>
              <button class="claim-btn ripple-btn" style="border: 1px solid #E2E8F0; background-color:#F8FAFC; color:#64748B; padding:6px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px;" title="Cambiar Consultorio" onclick="changeRoom('${a.id}')">
                <span class="material-symbols-rounded" style="font-size:1.15rem;">room</span>
              </button>
              <button class="claim-btn ripple-btn" style="border: 1px solid #FFEBEE; background-color:#FFEBEE; color:#C62828; padding:6px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px;" title="Cancelar Cita" onclick="cancelAppointment('${a.id}')" ${a.status === 'Cancelada' ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
                <span class="material-symbols-rounded" style="font-size:1.15rem;">cancel</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  window.loginAdmin = function() {
    const email = document.getElementById("admin-login-email").value;
    if (!email) {
      showToast("⚠️ Por favor ingresa tu correo electrónico.", "warning");
      return;
    }
    
    isLoggedIn = true;
    
    // Hide login, show main container
    document.getElementById("admin-login-view").classList.add("hidden");
    document.getElementById("admin-main-container").classList.remove("hidden");
    
    // Trigger real-time updates and metrics counter animation
    startRealTimeUpdates();
    animateKPIValues();
    
    showToast("🟢 Sesión iniciada con éxito. ¡Bienvenido, Administrador!", "success");
  };

  window.logoutAdmin = function() {
    isLoggedIn = false;
    stopRealTimeUpdates();
    
    // Hide main, show login
    document.getElementById("admin-main-container").classList.add("hidden");
    document.getElementById("admin-login-view").classList.remove("hidden");
    
    showToast("🔑 Sesión cerrada correctamente.", "success");
  };

  // Initial tab loading
  switchTab("overview");
});
