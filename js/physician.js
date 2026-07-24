// HMC Connect - Physician Portal Controller
document.addEventListener("DOMContentLoaded", () => {
  const db = window.HMCDatabase;
  if (!db) return;

  let currentTab = "dashboard";
  let activeConsultPatient = null;
  let prescriptionDraft = [];

  function switchTab(tabId) {
    currentTab = tabId;
    
    // Sidebar active item styling
    document.querySelectorAll(".portal-nav-item").forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Content views visibility
    const dashboardView = document.getElementById("portal-view-dashboard");
    const consultView = document.getElementById("portal-view-consult");

    if (tabId === "dashboard") {
      dashboardView.classList.remove("hidden");
      consultView.classList.add("hidden");
      renderQueue();
    } else if (tabId === "consult") {
      dashboardView.classList.add("hidden");
      consultView.classList.remove("hidden");
      initConsultation();
    }
  }

  // Bind Sidebar Buttons
  document.querySelectorAll(".portal-nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (tab === "consult" && !activeConsultPatient) {
        // Default to first patient in queue if none active
        activeConsultPatient = db.doctorQueue[0];
      }
      switchTab(tab);
    });
  });

  // --- Render Queue List ---
  function renderQueue() {
    const queueBody = document.getElementById("queue-table-body");
    if (!queueBody) return;

    queueBody.innerHTML = "";
    db.doctorQueue.forEach(p => {
      const initials = p.patientName.split(" ").map(n => n[0]).slice(0, 2).join("");
      const tr = document.createElement("tr");
      
      tr.innerHTML = `
        <td>
          <div class="patient-badge-cell">
            <div class="patient-initials">${initials}</div>
            <div>
              <strong>${p.patientName}</strong>
              <div style="font-size:0.75rem; color:var(--text-muted);">${p.code}</div>
            </div>
          </div>
        </td>
        <td>${p.age} años</td>
        <td>${p.reason}</td>
        <td>${p.time}</td>
        <td>
          <span class="telemetry-dot ${p.telemetryStatus}"></span>
          <span style="font-size:0.8rem; font-weight:600;">${p.status}</span>
        </td>
        <td>
          ${p.status === "Completado" 
            ? `<span style="color:var(--success-green); font-weight:700;">Revisado</span>`
            : `<button class="start-consult-btn ripple-btn" data-patient-id="${p.id}">Atender</button>`
          }
        </td>
      `;

      const attendBtn = tr.querySelector(".start-consult-btn");
      if (attendBtn) {
        attendBtn.onclick = () => {
          activeConsultPatient = p;
          switchTab("consult");
        };
      }

      queueBody.appendChild(tr);
    });
  }

  // --- Consultation / EMR Room Logic ---
  function initConsultation() {
    if (!activeConsultPatient) return;

    // Load Patient Header
    document.getElementById("emr-patient-name").innerText = activeConsultPatient.patientName;
    document.getElementById("emr-patient-meta").innerText = `Código: ${activeConsultPatient.code} | Edad: ${activeConsultPatient.age} años | Tipo Sangre: ${db.patient.bloodType}`;

    // Fill EMR Note Placeholder
    const notesText = document.getElementById("emr-notes-input");
    if (notesText && notesText.value === "") {
      notesText.value = `PACIENTE: Andrés Mendoza Salgado, 34 años.\nMOTIVO: Control trimestral de presión arterial.\nSÍNTOMAS: Asintomático. Refiere buena tolerancia al Losartán 50mg.\nSIGNOS VITALES: Presión promedio semanal 118/78 mmHg. Frecuencia cardiaca 72 lpm.\nIMPRESIÓN DIAGNÓSTICA: Hipertensión arterial esencial controlada.\nTRATAMIENTO: Continuar Losartán 50mg VO diario.`;
    }

    // Load Vitals Chart
    initEMRVitalsChart();

    // Load Lab and Imaging items inside EMR
    initEMRRecordsList();

    // Start Telehealth video loop simulation
    initEMRTelehealthVideo();

    // Reset Prescription form
    prescriptionDraft = [];
    renderPrescriptionDraft();
  }

  // Tab switcher inside EMR
  const emrTabButtons = document.querySelectorAll(".emr-tab-btn");
  emrTabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      emrTabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const viewId = btn.dataset.view; // 'history', 'labs', 'vitals'
      document.querySelectorAll(".emr-sub-view").forEach(v => v.classList.add("hidden"));
      document.getElementById(`emr-view-${viewId}`).classList.remove("hidden");
    });
  });

  // --- Render Vitals Curve SVG ---
  function initEMRVitalsChart() {
    const svg = document.getElementById("emr-bp-svg");
    if (!svg) return;

    // Generate beautiful multi-line path for Blood Pressure history
    // db.vitals.bloodPressure.history: array of {sys, dia}
    const data = db.vitals.bloodPressure.history;
    const width = 450;
    const height = 150;

    const sysPoints = data.map((d, idx) => {
      const x = (idx / (data.length - 1)) * (width - 40) + 20;
      const y = height - ((d.sys - 80) / 70) * (height - 40) - 20;
      return `${x},${y}`;
    }).join(" ");

    const diaPoints = data.map((d, idx) => {
      const x = (idx / (data.length - 1)) * (width - 40) + 20;
      const y = height - ((d.dia - 40) / 70) * (height - 40) - 20;
      return `${x},${y}`;
    }).join(" ");

    svg.innerHTML = `
      <!-- Gridlines -->
      <line x1="20" y1="20" x2="430" y2="20" stroke="#E2E8F0" stroke-width="1" />
      <line x1="20" y1="65" x2="430" y2="65" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4" />
      <line x1="20" y1="110" x2="430" y2="110" stroke="#E2E8F0" stroke-width="1" />
      
      <!-- Axis Labels -->
      <text x="5" y="24" fill="#94A3B8" font-size="9" font-weight="700">150</text>
      <text x="5" y="69" fill="#94A3B8" font-size="9" font-weight="700">100</text>
      <text x="5" y="114" fill="#94A3B8" font-size="9" font-weight="700">50</text>
      
      <!-- Systolic Curve -->
      <polyline fill="none" stroke="#D32F2F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${sysPoints}" />
      <!-- Diastolic Curve -->
      <polyline fill="none" stroke="#1976D2" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${diaPoints}" />
      
      <!-- Legend -->
      <rect x="330" y="10" width="10" height="10" fill="#D32F2F" rx="2" />
      <text x="345" y="18" fill="#546E7A" font-size="9" font-weight="600">Sistólica</text>
      <rect x="330" y="25" width="10" height="10" fill="#1976D2" rx="2" />
      <text x="345" y="33" fill="#546E7A" font-size="9" font-weight="600">Diastólica</text>
    `;
  }

  function initEMRRecordsList() {
    const listContainer = document.getElementById("emr-patient-lab-list");
    if (!listContainer) return;

    listContainer.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        <h4 style="font-size:0.95rem; font-weight:700; color:var(--primary-blue);">Reportes de Laboratorio</h4>
        ${db.labResults.map(lab => `
          <div style="background-color:var(--bg-gray); padding:10px; border-radius:8px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong>${lab.testName}</strong>
              <div style="font-size:0.75rem; color:var(--text-muted);">${lab.date}</div>
            </div>
            <span style="font-size:0.75rem; font-weight:700; background-color:var(--success-light); color:var(--success-green); padding:2px 6px; border-radius:4px;">Listo</span>
          </div>
        `).join("")}
        
        <h4 style="font-size:0.95rem; font-weight:700; color:var(--primary-blue); margin-top:16px;">Imágenes Médicas</h4>
        ${db.imagingReports.map(img => `
          <div style="background-color:var(--bg-gray); padding:10px; border-radius:8px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong>${img.studyName}</strong>
              <div style="font-size:0.75rem; color:var(--text-muted);">${img.date}</div>
            </div>
            <a href="assets/${img.imagePath}" target="_blank" style="font-size:0.75rem; font-weight:700; color:var(--primary-blue); text-decoration:underline;">Ver Placa</a>
          </div>
        `).join("")}
      </div>
    `;
  }

  function initEMRTelehealthVideo() {
    const video = document.getElementById("emr-video-feed-element");
    if (!video) return;

    // Grab user webcam or loop simulated feed
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        video.srcObject = stream;
        video.play();
      })
      .catch(err => {
        console.log("No webcam access for doctor feed, simulated view", err);
      });
  }

  // --- E-Prescription Form Logic ---
  const addRxBtn = document.getElementById("rx-add-btn");
  if (addRxBtn) {
    addRxBtn.onclick = () => {
      const medName = document.getElementById("rx-input-med").value.trim();
      const medDose = document.getElementById("rx-input-dose").value.trim();
      const medInstr = document.getElementById("rx-input-instr").value.trim();

      if (!medName || !medDose || !medInstr) {
        alert("Por favor completa los tres campos de la prescripción.");
        return;
      }

      prescriptionDraft.push({
        name: medName,
        dose: medDose,
        instr: medInstr
      });

      // Clear fields
      document.getElementById("rx-input-med").value = "";
      document.getElementById("rx-input-dose").value = "";
      document.getElementById("rx-input-instr").value = "";

      renderPrescriptionDraft();
    };
  }

  function renderPrescriptionDraft() {
    const list = document.getElementById("rx-draft-list");
    if (!list) return;

    list.innerHTML = "";
    if (prescriptionDraft.length === 0) {
      list.innerHTML = `<span style="font-size:0.8rem; color:var(--text-muted); padding:6px; font-style:italic;">No hay medicamentos añadidos al borrador.</span>`;
      return;
    }

    prescriptionDraft.forEach((item, idx) => {
      const div = document.createElement("div");
      div.className = "rx-added-item";
      div.innerHTML = `
        <div>
          <strong>${item.name}</strong> - ${item.dose} 
          <div style="font-size:0.75rem; color:var(--text-muted);">${item.instr}</div>
        </div>
        <span class="remove" data-idx="${idx}">&times;</span>
      `;

      div.querySelector(".remove").onclick = () => {
        prescriptionDraft.splice(idx, 1);
        renderPrescriptionDraft();
      };

      list.appendChild(div);
    });
  }

  // Submit Prescription & Sign digitally
  const submitPrescriptionBtn = document.getElementById("emr-submit-prescription");
  if (submitPrescriptionBtn) {
    submitPrescriptionBtn.onclick = () => {
      if (prescriptionDraft.length === 0) {
        alert("Por favor añade al menos un medicamento a la receta.");
        return;
      }

      alert("✍️ Receta firmada digitalmente con éxito y enviada a la App del paciente.");
      
      // Reset draft
      prescriptionDraft = [];
      renderPrescriptionDraft();
    };
  }

  // End consultation
  const finishConsultBtn = document.getElementById("emr-finish-consult");
  if (finishConsultBtn) {
    finishConsultBtn.onclick = () => {
      if (activeConsultPatient) {
        activeConsultPatient.status = "Completado";
      }
      alert("✅ Consulta guardada con éxito en el Expediente Clínico de HMC.");
      switchTab("dashboard");
    };
  }

  // Initial render
  switchTab("dashboard");
});
