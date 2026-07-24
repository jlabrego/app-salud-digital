// HMC Connect - Administrative Dashboard Controller
document.addEventListener("DOMContentLoaded", () => {
  const db = window.HMCDatabase;
  if (!db) return;

  let currentTab = "overview";

  function switchTab(tabId) {
    currentTab = tabId;

    // Sidebar active item highlight
    document.querySelectorAll(".admin-nav-item").forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Content view switcher
    const overviewView = document.getElementById("admin-view-overview");
    const claimsView = document.getElementById("admin-view-claims");

    if (tabId === "overview") {
      overviewView.classList.remove("hidden");
      claimsView.classList.add("hidden");
      initOverview();
    } else if (tabId === "claims") {
      overviewView.classList.add("hidden");
      claimsView.classList.remove("hidden");
      renderClaims();
    }
  }

  // Bind Sidebar Buttons
  document.querySelectorAll(".admin-nav-item").forEach(btn => {
    btn.onclick = () => {
      const tab = btn.dataset.tab;
      if (tab) switchTab(tab);
    };
  });

  // --- Executive Overview Tab ---
  function initOverview() {
    // Populate KPIs
    document.getElementById("kpi-occupancy-val").innerText = db.adminStats.kpis.occupancy.value;
    document.getElementById("kpi-revenue-val").innerText = db.adminStats.kpis.revenue.value;
    document.getElementById("kpi-satisfaction-val").innerText = db.adminStats.kpis.patientSatisfaction.value;
    document.getElementById("kpi-doctors-val").innerText = db.adminStats.kpis.activeDoctors.value;

    // Render Revenue SVGs Line Chart
    renderRevenueChart();

    // Render Hospital Wing Heatmap
    renderHeatmap();
  }

  function renderRevenueChart() {
    const svg = document.getElementById("admin-revenue-svg");
    if (!svg) return;

    // Fictional weekly revenues
    const data = [1.2, 1.4, 1.35, 1.6, 1.5, 1.84];
    const labels = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
    
    const width = 500;
    const height = 160;
    
    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - 60) + 30;
      const y = height - ((val - 1.0) / 1.0) * (height - 40) - 20;
      return `${x},${y}`;
    }).join(" ");

    let labelsSvg = "";
    data.forEach((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - 60) + 30;
      labelsSvg += `<text x="${x-10}" y="${height - 2}" fill="#94A3B8" font-size="9" font-weight="600">${labels[idx]}</text>`;
    });

    svg.innerHTML = `
      <!-- Gridlines -->
      <line x1="30" y1="20" x2="470" y2="20" stroke="#E2E8F0" stroke-width="1" />
      <line x1="30" y1="70" x2="470" y2="70" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4" />
      <line x1="30" y1="120" x2="470" y2="120" stroke="#E2E8F0" stroke-width="1" />
      
      <!-- Axis labels -->
      <text x="5" y="24" fill="#94A3B8" font-size="9" font-weight="700">L 2.0M</text>
      <text x="5" y="74" fill="#94A3B8" font-size="9" font-weight="700">L 1.5M</text>
      <text x="5" y="124" fill="#94A3B8" font-size="9" font-weight="700">L 1.0M</text>
      
      <!-- Chart line path -->
      <polyline fill="none" stroke="#1976D2" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
      
      <!-- Interactive Nodes -->
      ${data.map((val, idx) => {
        const x = (idx / (data.length - 1)) * (width - 60) + 30;
        const y = height - ((val - 1.0) / 1.0) * (height - 40) - 20;
        return `
          <circle cx="${x}" cy="${y}" r="5" fill="#FFFFFF" stroke="#1976D2" stroke-width="3" style="cursor:pointer;" />
          <text x="${x - 14}" y="${y - 12}" fill="#263238" font-size="9" font-weight="700">L.${val}M</text>
        `;
      }).join("")}

      <!-- Bottom day labels -->
      ${labelsSvg}
    `;
  }

  function renderHeatmap() {
    const container = document.getElementById("admin-heatmap-container");
    if (!container) return;

    container.innerHTML = "";
    db.adminStats.occupancyByWing.forEach(wing => {
      const row = document.createElement("div");
      row.className = `heatmap-row ${wing.class}`;
      row.innerHTML = `
        <span>${wing.wing}</span>
        <span>${wing.occupied} / ${wing.capacity} Camas (${wing.pct}%)</span>
      `;
      container.appendChild(row);
    });
  }

  // --- Billing & Claims Review Tab ---
  function renderClaims() {
    const tableBody = document.getElementById("claims-table-body");
    if (!tableBody) return;

    tableBody.innerHTML = "";
    db.adminStats.billingClaims.forEach(claim => {
      const tr = document.createElement("tr");
      const statusClass = claim.status.toLowerCase();
      
      tr.innerHTML = `
        <td><strong>${claim.id}</strong></td>
        <td>${claim.patient}</td>
        <td>${claim.insurance}</td>
        <td>${claim.department}</td>
        <td><strong>${claim.amount}</strong></td>
        <td>${claim.date}</td>
        <td>
          <span class="status-pill ${statusClass}" id="claim-pill-${claim.id}">${claim.status}</span>
        </td>
        <td id="claim-actions-${claim.id}">
          ${claim.status === "Pendiente" 
            ? `<button class="claim-btn approve ripple-btn" data-id="${claim.id}">Aprobar</button>
               <button class="claim-btn reject ripple-btn" data-id="${claim.id}">Rechazar</button>`
            : `<span style="font-size:0.8rem; color:var(--text-muted); font-weight:600;">Procesada</span>`
          }
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

  function processClaim(claim, finalStatus) {
    claim.status = finalStatus;
    
    // Update pill status
    const pill = document.getElementById(`claim-pill-${claim.id}`);
    if (pill) {
      pill.className = `status-pill ${finalStatus.toLowerCase()}`;
      pill.innerText = finalStatus;
    }

    // Clear actions column
    const actionsCell = document.getElementById(`claim-actions-${claim.id}`);
    if (actionsCell) {
      actionsCell.innerHTML = `<span style="font-size:0.8rem; color:var(--text-muted); font-weight:600;">Procesada</span>`;
    }

    alert(`💼 Reclamación ${claim.id} para ${claim.patient} ha sido marcada como ${finalStatus}. Notificación enviada a ${claim.insurance}.`);
    renderClaims();
  }

  // Initial trigger
  switchTab("overview");
});
