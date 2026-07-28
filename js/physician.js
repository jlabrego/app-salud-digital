// HMC Connect Pro - Physician Portal Controller
document.addEventListener("DOMContentLoaded", () => {
  const db = window.HMCDatabase;
  if (!db) {
    console.error("Database mockData.js not loaded.");
    return;
  }

  // Load queue and appointments from localStorage if available
  const storedQueue = localStorage.getItem('doctorQueue');
  if (storedQueue) {
    db.doctorQueue = JSON.parse(storedQueue);
  }
  const storedAppts = localStorage.getItem('appointments');
  if (storedAppts) {
    db.appointments = JSON.parse(storedAppts);
  }

  // State Variables
  let currentTab = "dashboard";
  let activeConsultPatient = null;
  let prescriptionDraft = [];

  // --- Clinical Note Templates (Randomized to prevent generic content) ---
  const clinicalTemplates = [
    `PACIENTE: Andrés Mendoza Salgado, 34 años.\nMOTIVO: Control trimestral de presión arterial.\nSÍNTOMAS: Asintomático. Refiere excelente tolerancia al Losartán 50mg diario, sin cefaleas ni mareos.\nSIGNOS VITALES: Presión arterial actual: 118/78 mmHg. Frecuencia cardiaca: 72 lpm.\nIMPRESIÓN DIAGNÓSTICA: Hipertensión arterial esencial controlada.\nPLAN CLINICO: Continuar dosificación de Losartán 50mg VO diario. Control general en 3 meses.`,
    
    `PACIENTE: Andrés Mendoza Salgado, 34 años.\nMOTIVO: Seguimiento cardiológico continuo por antecedentes familiares de cardiopatía.\nSÍNTOMAS: Refiere fatiga leve tras ejercicio intenso aeróbico.\nSIGNOS VITALES: PA actual: 120/79 mmHg. Ritmo sinusal normal en ECG de control con 74 lpm.\nIMPRESIÓN DIAGNÓSTICA: Hipertensión arterial en rangos óptimos. Aptitud física preservada.\nPLAN CLINICO: Mantener tratamiento antihipertensivo. Monitoreo diario por App HMC.`,
    
    `PACIENTE: Andrés Mendoza Salgado, 34 años.\nMOTIVO: Consulta preventiva executive y lectura de estudios lipídicos.\nSÍNTOMAS: Paciente asintomático. Niega dolor opresivo precordial.\nSIGNOS VITALES: PA: 117/78 mmHg. Frecuencia cardíaca: 70 lpm. Peso: 78kg.\nIMPRESIÓN DIAGNÓSTICA: Perfil lipídico óptimo. Excelente evolución general de salud.\nPLAN CLINICO: Estimular dieta mediterránea hiposódica y ejercicio cardiovascular aeróbico.`,
    
    `PACIENTE: Andrés Mendoza Salgado, 34 años.\nMOTIVO: Evaluación de dolor torácico atípico intermitente.\nSÍNTOMAS: Refiere opresión muscular transitoria en región pectoral izquierda. Niega irradiación a mandíbula.\nSIGNOS VITALES: PA: 119/78 mmHg. Radiografía de tórax reporta silueta cardíaca normal.\nIMPRESIÓN DIAGNÓSTICA: Dolor de pared torácica atípico (probable origen muscular/estrés).\nPLAN CLINICO: Fisioterapia muscular leve. Controlar niveles de estrés.`
  ];

  // --- Date Formatting in Spanish ---
  function getFormattedDate(offsetDays = 0) {
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const d = new Date();
    if (offsetDays !== 0) {
      d.setDate(d.getDate() + offsetDays);
    }
    return `${d.getDate()} de ${months[d.getMonth()]}, ${d.getFullYear()}`;
  }

  // --- Tab Routing Engine ---
  function switchTab(tabId) {
    currentTab = tabId;
    
    // Sidebar highlight
    document.querySelectorAll(".portal-nav-item").forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    const dashboardView = document.getElementById("portal-view-dashboard");
    const consultView = document.getElementById("portal-view-consult");
    const messagesView = document.getElementById("portal-view-messages");

    if (tabId === "dashboard") {
      if (dashboardView) dashboardView.classList.remove("hidden");
      if (consultView) consultView.classList.add("hidden");
      if (messagesView) messagesView.classList.add("hidden");
      
      // Stop video camera when leaving consult room
      releaseWebcam();
      renderQueue();
    } else if (tabId === "consult") {
      if (dashboardView) dashboardView.classList.add("hidden");
      if (consultView) consultView.classList.remove("hidden");
      if (messagesView) messagesView.classList.add("hidden");
      initConsultation();
    } else if (tabId === "messages") {
      if (dashboardView) dashboardView.classList.add("hidden");
      if (consultView) consultView.classList.add("hidden");
      if (messagesView) messagesView.classList.remove("hidden");
      releaseWebcam();
      renderDoctorMessagesPage();
    }
  }

  // Bind navigation links
  document.querySelectorAll(".portal-nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (tab === "consult" && !activeConsultPatient) {
        // Fallback to first waiting patient
        activeConsultPatient = db.doctorQueue[0];
      }
      switchTab(tab);
    });
  });

  // --- Render Triage Patient Queue ---
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

  // --- Initialize EMR Consultation view ---
  function initConsultation() {
    if (!activeConsultPatient) return;

    // Set Patient Meta Headers
    document.getElementById("emr-patient-name").innerText = activeConsultPatient.patientName;
    document.getElementById("emr-patient-meta").innerText = `Código: ${activeConsultPatient.code} | Edad: ${activeConsultPatient.age} años | Tipo Sangre: ${db.patient.bloodType}`;

    // Fill notes text with random template
    const notesText = document.getElementById("emr-notes-input");
    if (notesText) {
      const idx = Math.floor(Math.random() * clinicalTemplates.length);
      notesText.value = clinicalTemplates[idx];
    }

    // Dynamic metrics summary card
    renderPatientSummaryCard();

    // Render Vitals Chart
    initEMRVitalsChart();

    // Load Lab and Imaging items inside EMR
    initEMRRecordsList();

    // Render Patient reported daily self-logs
    renderPatientDailyReports();

    // Start Telehealth video
    initEMRTelehealthVideo();

    // Reset Prescription form draft
    prescriptionDraft = [];
    renderPrescriptionDraft();
  }

  // --- Render Patient Clinical Summary Card ---
  function renderPatientSummaryCard() {
    const p = db.patient;
    const summaryDiv = document.getElementById("emr-patient-summary-card");
    if (!summaryDiv) return;

    // Calculate BMI dynamically
    const weightNum = parseFloat(p.weight);
    const heightNum = parseFloat(p.height);
    const bmi = (weightNum / (heightNum * heightNum)).toFixed(1);

    summaryDiv.innerHTML = `
      <div class="summary-metric">
        <span class="summary-metric-label">Edad</span>
        <span class="summary-metric-value">${p.age} años</span>
      </div>
      <div class="summary-metric">
        <span class="summary-metric-label">Sangre</span>
        <span class="summary-metric-value" style="color:var(--danger-red);">${p.bloodType}</span>
      </div>
      <div class="summary-metric">
        <span class="summary-metric-label">Peso</span>
        <span class="summary-metric-value">${p.weight}</span>
      </div>
      <div class="summary-metric">
        <span class="summary-metric-label">Estatura</span>
        <span class="summary-metric-value">${p.height}</span>
      </div>
      <div class="summary-metric">
        <span class="summary-metric-label">IMC</span>
        <span class="summary-metric-value">${bmi} <span style="font-size:0.75rem; font-weight:600; color:var(--warning-orange);">(25.2)</span></span>
      </div>
      <div class="summary-metric" style="grid-column: span 2;">
        <span class="summary-metric-label">Seguro Médico</span>
        <span class="summary-metric-value">${p.insurance.provider}</span>
      </div>
      <div class="summary-metric">
        <span class="summary-metric-label">Último Control</span>
        <span class="summary-metric-value" style="font-size:0.82rem;">15 Mayo, 2026</span>
      </div>
    `;
  }

  // EMR inner tabs switcher
  const emrTabButtons = document.querySelectorAll(".emr-tab-btn");
  emrTabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      emrTabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const viewId = btn.dataset.view;
      document.querySelectorAll(".emr-sub-view").forEach(v => v.classList.add("hidden"));
      document.getElementById(`emr-view-${viewId}`).classList.remove("hidden");
    });
  });

  // --- Render Vitals BP Curve SVG ---
  function initEMRVitalsChart() {
    const svg = document.getElementById("emr-bp-svg");
    if (!svg) return;

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

  // --- Render Labs and Imaging reports with dynamic dates ---
  function initEMRRecordsList() {
    const listContainer = document.getElementById("emr-patient-lab-list");
    if (!listContainer) return;

    listContainer.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        <h4 style="font-size:0.95rem; font-weight:700; color:var(--primary-blue);">Reportes de Laboratorio</h4>
        ${db.labResults.map(lab => `
          <div style="background-color:var(--bg-gray); padding:12px; border-radius:8px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong>${lab.testName}</strong>
              <div style="font-size:0.75rem; color:var(--text-muted);">${getFormattedDate(-15)}</div>
            </div>
            <span style="font-size:0.75rem; font-weight:700; background-color:var(--success-light); color:var(--success-green); padding:2px 6px; border-radius:4px;">Listo</span>
          </div>
        `).join("")}
        
        <h4 style="font-size:0.95rem; font-weight:700; color:var(--primary-blue); margin-top:16px;">Imágenes Médicas</h4>
        ${db.imagingReports.map(img => `
          <div style="background-color:var(--bg-gray); padding:12px; border-radius:8px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong>${img.studyName}</strong>
              <div style="font-size:0.75rem; color:var(--text-muted);">${getFormattedDate(-25)}</div>
            </div>
            <a href="assets/${img.imagePath}" target="_blank" style="font-size:0.75rem; font-weight:700; color:var(--primary-blue); text-decoration:underline;">Ver Placa</a>
          </div>
        `).join("")}
      </div>
    `;
  }

  // --- Telehealth webcam streaming ---
  let localStream = null;
  function initEMRTelehealthVideo() {
    const video = document.getElementById("emr-video-feed-element");
    if (!video) return;

    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        localStream = stream;
        video.srcObject = stream;
        video.play();
      })
      .catch(err => {
        console.log("Cámara no disponible o denegada, ejecutando simulación visual", err);
      });
  }

  // Clean and release camera streams completely
  function releaseWebcam() {
    const video = document.getElementById("emr-video-feed-element");
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }
  }

  // --- Telehealth Console Button Toggles ---
  const micBtn = document.getElementById("emr-video-btn-mic");
  const camBtn = document.getElementById("emr-video-btn-cam");
  const shareBtn = document.getElementById("emr-video-btn-share");
  const endBtn = document.getElementById("emr-video-btn-end");

  if (micBtn) {
    micBtn.onclick = () => {
      micBtn.classList.toggle("active");
      const icon = micBtn.querySelector("span");
      if (micBtn.classList.contains("active")) {
        icon.innerText = "mic_off";
        showToast("🎙️ Micrófono silenciado.", "warning");
      } else {
        icon.innerText = "mic";
        showToast("🎙️ Micrófono activo.", "success");
      }
    };
  }

  if (camBtn) {
    camBtn.onclick = () => {
      camBtn.classList.toggle("active");
      const icon = camBtn.querySelector("span");
      const video = document.getElementById("emr-video-feed-element");
      if (camBtn.classList.contains("active")) {
        icon.innerText = "videocam_off";
        if (video && video.srcObject) {
          video.srcObject.getVideoTracks().forEach(t => t.enabled = false);
        }
        showToast("📹 Cámara desactivada.", "warning");
      } else {
        icon.innerText = "videocam";
        if (video && video.srcObject) {
          video.srcObject.getVideoTracks().forEach(t => t.enabled = true);
        }
        showToast("📹 Cámara activa.", "success");
      }
    };
  }

  if (shareBtn) {
    shareBtn.onclick = () => {
      showToast("💻 Compartiendo pantalla (Simulación).", "success");
    };
  }

  if (endBtn) {
    endBtn.onclick = () => {
      releaseWebcam();
      showToast("📞 Videoconsulta finalizada.", "warning");
    };
  }

  // --- E-Prescription Drafting Form ---
  const addRxBtn = document.getElementById("rx-add-btn");
  if (addRxBtn) {
    addRxBtn.onclick = () => {
      const medName = document.getElementById("rx-input-med").value.trim();
      const medDose = document.getElementById("rx-input-dose").value.trim();
      const medInstr = document.getElementById("rx-input-instr").value.trim();

      if (!medName || !medDose || !medInstr) {
        showToast("⚠️ Complete todos los campos.", "warning");
        return;
      }

      prescriptionDraft.push({
        name: medName,
        dose: medDose,
        instr: medInstr
      });

      // Clear form fields
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

  // --- E-Prescription Preview Sheet Modal ---
  const submitPrescriptionBtn = document.getElementById("emr-submit-prescription");
  if (submitPrescriptionBtn) {
    submitPrescriptionBtn.onclick = () => {
      showPrescriptionPreview();
    };
  }

  function showPrescriptionPreview() {
    if (prescriptionDraft.length === 0) {
      showToast("❌ Debe agregar al menos un medicamento.", "danger");
      return;
    }

    // Modal structure
    const overlay = document.createElement("div");
    overlay.className = "rx-modal-overlay";
    overlay.id = "rx-modal-preview";
    
    const rxNum = `RX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    overlay.innerHTML = `
      <div class="rx-modal-card">
        <div class="rx-modal-body">
          <div class="prescription-card-detail" style="box-shadow:none; border:none; padding:0;">
            <div class="rx-card-header" style="margin-bottom:12px;">
              <div class="hospital-stamp">
                <svg viewBox="0 0 40 40" style="width: 24px; height: 24px; fill:none; margin-right:6px;">
                  <rect x="15" y="4" width="10" height="32" rx="4" fill="#1976D2" />
                  <rect x="4" y="15" width="32" height="10" rx="4" fill="#1976D2" />
                  <circle cx="20" cy="20" r="8" fill="#42A5F5" />
                </svg>
                <strong>HMC Connect</strong>
              </div>
              <div class="doctor-badge-min">
                <strong>Dr. Carlos Valladares</strong>
                <span>Cardiólogo Clínico</span>
              </div>
            </div>
            <div style="font-size:0.8rem; margin-bottom:12px; color:var(--text-muted); line-height:1.4;">
              <div><strong>Receta No:</strong> ${rxNum}</div>
              <div><strong>Paciente:</strong> Andrés Mendoza Salgado</div>
              <div><strong>Fecha Emisión:</strong> ${getFormattedDate()}</div>
            </div>
            <div class="rx-meds-list" style="max-height: 180px; overflow-y:auto; margin-bottom:16px; border-bottom:1px dashed var(--border-color); padding-bottom:8px;">
              ${prescriptionDraft.map(m => `
                <div class="rx-med-item" style="padding-bottom:6px; margin-bottom:6px; border:none;">
                  <div class="rx-med-header">
                    <span class="rx-med-name" style="font-size:0.9rem; font-weight:700;">${m.name}</span>
                  </div>
                  <p class="rx-med-instructions" style="font-size:0.8rem; margin:2px 0;">Dosificación: ${m.dose} &bull; ${m.instr}</p>
                </div>
              `).join("")}
            </div>
            <div class="rx-footer-qr-reveal" style="padding:12px; background-color:var(--light-blue); border-radius:8px;">
              <p style="font-size:0.75rem; margin-bottom:6px; font-weight:600;">Muestra este código QR en farmacias HMC para retirar medicamentos.</p>
              <div class="qr-placeholder-wrapper" style="width:80px; height:80px; margin: 0 auto 6px;">
                <span class="material-symbols-rounded" style="font-size:4.5rem; color:var(--text-dark);">qr_code_2</span>
              </div>
              <span class="rx-seal-code" style="font-size:0.65rem; font-weight:700; letter-spacing:1px; color:var(--primary-blue);">FIRMA DIGITAL HMC PRO - AUTORIZADA</span>
            </div>
          </div>
        </div>
        <div class="rx-modal-actions">
          <button class="rx-modal-action-btn cancel" id="rx-btn-cancel-send">Cancelar</button>
          <button class="rx-modal-action-btn confirm" id="rx-btn-confirm-send">Confirmar Firma</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Cancel Preview
    document.getElementById("rx-btn-cancel-send").onclick = () => {
      overlay.remove();
    };

    // Confirm Send
    document.getElementById("rx-btn-confirm-send").onclick = () => {
      const confirmBtn = document.getElementById("rx-btn-confirm-send");
      const cancelBtn = document.getElementById("rx-btn-cancel-send");
      if (confirmBtn && cancelBtn) {
        confirmBtn.disabled = true;
        cancelBtn.disabled = true;
        confirmBtn.innerText = "Guardando...";
      }

      setTimeout(() => {
        if (overlay) overlay.remove();
        
        const newRx = {
          id: `rx-${Date.now()}`,
          date: getFormattedDate(),
          doctorName: "Dr. Carlos Valladares",
          specialty: "Cardiología",
          code: rxNum,
          active: true,
          status: "Pendiente",
          medications: prescriptionDraft.map(m => ({
            name: m.name,
            dosage: m.dose,
            instructions: m.instr,
            quantity: 90
          }))
        };

        const prescriptionsList = getPrescriptions();
        prescriptionsList.unshift(newRx);
        localStorage.setItem('hmc_prescriptions', JSON.stringify(prescriptionsList));
        db.prescriptions = prescriptionsList;

        showToast("💊 Receta firmada digitalmente y enviada al paciente.", "pill");
        prescriptionDraft = [];
        renderPrescriptionDraft();

        // Render the active signed prescription panel on the physician portal
        renderActivePrescriptionPanel(newRx);
      }, 1000);
    };
  }

  // --- End Clinical Consultation Room session ---
  const finishConsultBtn = document.getElementById("emr-finish-consult");
  if (finishConsultBtn) {
    finishConsultBtn.onclick = () => {
      finishConsultBtn.disabled = true;
      finishConsultBtn.innerHTML = `<span class="material-symbols-rounded">check</span> Guardando...`;

      setTimeout(() => {
        if (activeConsultPatient) {
          activeConsultPatient.status = "Completado";
        }
        showToast("✅ Consulta guardada correctamente.", "success");
        finishConsultBtn.disabled = false;
        finishConsultBtn.innerHTML = `<span class="material-symbols-rounded">check</span> Guardar Consulta`;
        switchTab("dashboard");
      }, 1000);
    };
  }

  // --- Portal Custom Toast Notification Engine ---
  function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "hmc-portal-toast slide-up";

    let iconName = "check_circle";
    if (type === "pill") iconName = "medical_services";
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

  // Set Current Date dynamically in Spanish
  const dateDiv = document.querySelector(".portal-top-bar div + div");
  if (dateDiv) {
    dateDiv.innerText = getFormattedDate();
  }

  // --- Render Patient Reported Daily Self-logs ---
  function renderPatientDailyReports() {
    const listContainer = document.getElementById("emr-patient-reports-list");
    if (!listContainer) return;

    // Load from localStorage if present
    const stored = localStorage.getItem('patientDailyReports');
    if (stored) {
      db.patientDailyReports = JSON.parse(stored);
    }

    const reports = db.patientDailyReports || [];
    if (reports.length === 0) {
      listContainer.innerHTML = `
        <div style="padding: 20px; border-radius: 12px; background-color: #F8FAFC; text-align: center; color: #64748B; font-weight: 600; font-size: 0.85rem;">
          📭 No hay reportes de auto-monitoreo ingresados por el paciente.
        </div>
      `;
      return;
    }

    listContainer.innerHTML = reports.map(r => {
      // Determine pain color
      let painColor = "#2E7D32"; // Green
      if (r.painScale > 7) painColor = "#E53935"; // Red
      else if (r.painScale > 3) painColor = "#F59E0B"; // Orange

      // Adherence status badge
      let adherenceBadge = "";
      if (r.medicationAdherence === "Sí") {
        adherenceBadge = `<span style="background-color: #E8F7F3; color: #0A6D5E; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 4px;">Tomó Medicamento: Sí</span>`;
      } else if (r.medicationAdherence === "No") {
        adherenceBadge = `<span style="background-color: #FFEBEE; color: #E53935; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 4px;">Tomó Medicamento: No</span>`;
      } else {
        adherenceBadge = `<span style="background-color: #FFF8E1; color: #E65100; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 4px;">Tomó Medicamento: Parcial</span>`;
      }

      // Symptoms badges
      const symptomsHtml = r.symptoms.map(s => {
        return `<span style="background-color: #F1F5F9; color: #475569; font-size: 0.75rem; font-weight: 600; padding: 2px 6px; border-radius: 4px; border: 1px solid #E2E8F0;">${s}</span>`;
      }).join(" ");

      return `
        <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px; margin-bottom: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.01); text-align: left;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <strong style="font-size: 0.85rem; color: #1F2937;">Reporte - ${r.date} &bull; ${r.time}</strong>
            <span style="font-size: 0.7rem; color: var(--primary); font-weight: 700; background-color: var(--primary-light); padding: 2px 6px; border-radius: 4px;">Reportado por Paciente</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8rem; color: #475569; margin-bottom: 10px;">
            <div>🌡️ <strong>Temp:</strong> ${r.temperature}°C</div>
            <div>💓 <strong>Pulso:</strong> ${r.heartRate} lpm</div>
            <div>🩸 <strong>Presión:</strong> ${r.bloodPressure}</div>
            <div>🫁 <strong>SPO2:</strong> ${r.oxygenSaturation}%</div>
            <div>⚖️ <strong>Peso:</strong> ${r.weight} kg</div>
            <div>🍬 <strong>Glucosa:</strong> ${r.bloodGlucose ? r.bloodGlucose + ' mg/dL' : 'N/A'}</div>
          </div>

          <div style="margin-bottom: 8px; font-size: 0.8rem;">
            <strong>Síntomas:</strong> ${symptomsHtml}
          </div>

          <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
            <div style="font-size: 0.8rem;">
              <strong>Dolor:</strong> 
              <span style="color: ${painColor}; font-weight: 800;">${r.painScale}/10</span>
            </div>
            <div style="font-size: 0.8rem;">
              <strong>Ánimo:</strong> ${r.mood}
            </div>
          </div>

          <div style="margin-bottom: 6px;">
            ${adherenceBadge}
          </div>

          <div style="font-size: 0.8rem; background-color: #F8FAFC; padding: 8px; border-radius: 8px; border-left: 3px solid var(--primary); color: #475569; font-style: italic; margin-top: 6px;">
            "${r.notes}"
          </div>
        </div>
      `;
    }).join("");
  }

  window.loginPhysician = function() {
    const email = document.getElementById("physician-login-email").value;
    if (!email) {
      showToast("⚠️ Por favor ingresa tu usuario clínico.", "warning");
      return;
    }
    
    // Hide login, show main
    document.getElementById("physician-login-view").classList.add("hidden");
    document.getElementById("physician-main-container").classList.remove("hidden");
    
    showToast("🟢 Sesión iniciada. ¡Bienvenido, Dr. Carlos Valladares!", "success");
  };

  window.logoutPhysician = function() {
    // Hide main, show login
    document.getElementById("physician-main-container").classList.add("hidden");
    document.getElementById("physician-login-view").classList.remove("hidden");
    
    showToast("🔑 Sesión cerrada correctamente.", "success");
  };

  // --- Secure Messaging Feature ---
  let activePatientChatId = "doc-1"; // 'doc-1' = Andres Mendoza, 'doc-2' = Carmen Elena Zelaya

  // Default chats list
  if (!localStorage.getItem('hmc_chats')) {
    localStorage.setItem('hmc_chats', JSON.stringify(db.chats));
  }

  function getChats() {
    try {
      return JSON.parse(localStorage.getItem('hmc_chats')) || db.chats;
    } catch(e) {
      console.error(e);
      return db.chats;
    }
  }

  window.doctorOpenPatientEMR = function() {
    const patientName = activePatientChatId === "doc-1" ? "Andrés Mendoza Salgado" : "Carmen Elena Zelaya";
    const patientObj = db.doctorQueue.find(p => p.patientName === patientName) || db.doctorQueue[0];
    
    activeConsultPatient = patientObj;
    switchTab("consult");
    showToast(`📁 Expediente clínico de ${patientName} abierto desde el chat de seguimiento.`, "success");
  };

  window.doctorSendChatMessage = function() {
    const input = document.getElementById("doctor-message-input");
    if (!input) return;

    const val = input.value.trim();
    if (!val) return;

    const activeChats = getChats();
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const formattedTime = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg = {
      sender: "doctor",
      text: val,
      time: `${formattedDate} ${formattedTime}`
    };

    if (!activeChats[activePatientChatId]) {
      activeChats[activePatientChatId] = [];
    }
    activeChats[activePatientChatId].push(newMsg);

    localStorage.setItem('hmc_chats', JSON.stringify(activeChats));
    input.value = "";

    // Refresh messages stream
    renderDoctorActiveChat();
  };

  window.doctorSimulateAttach = function(type) {
    const activeChats = getChats();
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const formattedTime = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let attachName = type === 'doc' ? "recomendacion_farmacologica_losartan.pdf" : "esquema_toma_medicacion.png";
    const newMsg = {
      sender: "doctor",
      text: attachName,
      time: `${formattedDate} ${formattedTime}`,
      isAttachment: true,
      attachType: type
    };

    if (!activeChats[activePatientChatId]) {
      activeChats[activePatientChatId] = [];
    }
    activeChats[activePatientChatId].push(newMsg);

    localStorage.setItem('hmc_chats', JSON.stringify(activeChats));
    showToast(`📎 Archivo ${attachName} enviado al paciente.`, "success");
    renderDoctorActiveChat();
  };

  function renderDoctorMessagesPage() {
    renderDoctorChatsList();
    renderDoctorActiveChat();
  }

  function renderDoctorChatsList() {
    const container = document.getElementById("doctor-chats-list");
    if (!container) return;

    container.innerHTML = "";
    const activeChats = getChats();

    const patients = [
      { id: "doc-1", name: "Andrés Mendoza Salgado", avatar: "patient_avatar.png", diagnosis: "Hipertensión Arterial Esencial", age: 34, gender: "Masculino" },
      { id: "doc-2", name: "Carmen Elena Zelaya", avatar: "doctor_female_profile_2.png", diagnosis: "Dolor Torácico de Esfuerzo", age: 62, gender: "Femenino" }
    ];

    patients.forEach(p => {
      const messages = activeChats[p.id] || [];
      const lastMsg = messages[messages.length - 1] || { text: "Sin mensajes", time: "" };

      // Format time
      let lastTime = "09:30 AM";
      if (lastMsg.time) {
        const parts = lastMsg.time.split(" ");
        lastTime = parts.length > 1 ? parts[parts.length - 2] + " " + (parts[parts.length - 1] || "") : lastMsg.time;
      }

      const activeClass = p.id === activePatientChatId ? "background-color: #E6F6F4; border-left: 4px solid var(--primary);" : "background-color: #FFFFFF;";
      const item = document.createElement("div");
      item.style.cssText = `display:flex; align-items:center; gap:10px; padding:12px; border-radius:10px; cursor:pointer; border-bottom:1px solid #F1F5F9; transition:all 0.2s; ${activeClass}`;
      item.innerHTML = `
        <img src="assets/${p.avatar}" style="width:38px; height:38px; border-radius:50%; object-fit:cover; border:1px solid #E2E8F0;">
        <div style="flex:1; text-align:left; overflow:hidden;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
            <strong style="font-size:0.82rem; color:#1E293B;">${p.name}</strong>
            <span style="font-size:0.65rem; color:#94A3B8;">${lastTime}</span>
          </div>
          <span style="font-size:0.68rem; color:var(--primary); font-weight:700;">Seguimiento activo</span>
          <p style="font-size:0.75rem; color:#64748B; margin:2px 0 0 0; text-overflow:ellipsis; white-space:nowrap; overflow:hidden;">
            ${lastMsg.text.startsWith("🤖") || lastMsg.text.startsWith("⚠️") ? lastMsg.text.substring(4) : lastMsg.text}
          </p>
        </div>
      `;

      item.onclick = () => {
        activePatientChatId = p.id;
        renderDoctorMessagesPage();
      };

      container.appendChild(item);
    });
  }

  function renderDoctorActiveChat() {
    // Populate Patient Info Panels
    const patientName = document.getElementById("doctor-active-patient-name");
    const patientAvatar = document.getElementById("doctor-active-patient-avatar");
    const ctxName = document.getElementById("doctor-context-patient-name");
    const ctxAge = document.getElementById("doctor-context-patient-age");
    const ctxDiag = document.getElementById("doctor-context-patient-diag");
    const ctxReportStatus = document.getElementById("doctor-context-patient-report-status");

    let pName = "Andrés Mendoza Salgado";
    let pAvatar = "patient_avatar.png";
    let pAgeGender = "34 años / Masculino";
    let pDiag = "Hipertensión Arterial Esencial";

    if (activePatientChatId === "doc-2") {
      pName = "Carmen Elena Zelaya";
      pAvatar = "doctor_female_profile_2.png";
      pAgeGender = "62 años / Femenino";
      pDiag = "Dolor Torácico de Esfuerzo";
    }

    if (patientName) patientName.innerText = pName;
    if (patientAvatar) patientAvatar.src = `assets/${pAvatar}`;
    if (ctxName) ctxName.innerText = pName;
    if (ctxAge) ctxAge.innerText = pAgeGender;
    if (ctxDiag) {
      ctxDiag.innerText = pDiag;
      ctxDiag.style.backgroundColor = pDiag.includes("Hipertensión") ? "#FFF8E1" : "#FFEBEE";
      ctxDiag.style.color = pDiag.includes("Hipertensión") ? "#B45309" : "#D32F2F";
    }

    // Populate messages stream
    const container = document.getElementById("doctor-messages-stream");
    if (container) {
      container.innerHTML = "";
      const activeChats = getChats();
      const messages = activeChats[activePatientChatId] || [];

      // Add initial date separator
      const dateSep = document.createElement("div");
      dateSep.className = "chat-date-separator";
      dateSep.innerText = "Canal Seguro HMC";
      container.appendChild(dateSep);

      messages.forEach(msg => {
        const bubble = document.createElement("div");
        if (msg.sender === "system") {
          bubble.className = "chat-bubble system";
          bubble.innerHTML = `<span>${msg.text}</span>`;
        } else {
          const isDoctor = msg.sender === "doctor";
          bubble.className = `chat-bubble ${isDoctor ? 'patient' : 'doctor'}`; // Swap styling visually (doctor is local sender here)
          
          let msgContent = msg.text;
          if (msg.isAttachment) {
            msgContent = `
              <div class="chat-attach-badge">
                <span class="material-symbols-rounded">${msg.attachType === 'doc' ? 'picture_as_pdf' : 'image'}</span>
                <span>${msg.text}</span>
              </div>
            `;
          }

          let msgTime = "09:30 AM";
          if (msg.time) {
            const parts = msg.time.split(" ");
            msgTime = parts.length > 1 ? parts[parts.length - 2] + " " + (parts[parts.length - 1] || "") : msg.time;
          }

          bubble.innerHTML = `
            <span>${msgContent}</span>
            <span class="chat-time">${msgTime}</span>
          `;
        }
        container.appendChild(bubble);
      });

      // Scroll to bottom
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 50);
    }

    // Render clinical report details in context card
    const reportContainer = document.getElementById("doctor-context-report-container");
    if (reportContainer) {
      reportContainer.innerHTML = "";
      
      if (activePatientChatId === "doc-1") {
        // Read actual localStorage patientDailyReports
        const reports = JSON.parse(localStorage.getItem('patientDailyReports')) || db.patientDailyReports || [];
        if (reports.length > 0) {
          const rep = reports[0];
          
          // Determine status label color
          const isNormal = rep.temperature <= 37.5 && rep.heartRate <= 85;
          if (ctxReportStatus) {
            ctxReportStatus.innerText = isNormal ? "Normal" : "Alerta";
            ctxReportStatus.style.backgroundColor = isNormal ? "#D1FAE5" : "#FFEBEE";
            ctxReportStatus.style.color = isNormal ? "#065F46" : "#D32F2F";
          }

          reportContainer.innerHTML = `
            <div style="font-size: 0.72rem; color: #64748B; margin-bottom: 2px;">Reportado: ${rep.date} ${rep.time}</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.75rem;">
              <div>Presión: <strong>${rep.bloodPressure} mmHg</strong></div>
              <div>Pulso: <strong>${rep.heartRate} lpm</strong></div>
              <div>Temp: <strong>${rep.temperature} °C</strong></div>
              <div>SpO2: <strong>${rep.oxygenSaturation}%</strong></div>
              <div>Dolor: <strong>${rep.painScale}/10</strong></div>
              <div>Ánimo: <strong>${rep.mood.split(" ")[1] || rep.mood}</strong></div>
            </div>
            <div style="font-size:0.72rem; background-color:#F8FAFC; padding:6px; border-radius:6px; border-left:2px solid var(--primary); margin-top:4px; font-style:italic; color:#475569;">
              "${rep.notes}"
            </div>
          `;
        } else {
          if (ctxReportStatus) ctxReportStatus.innerText = "Sin reportes";
          reportContainer.innerHTML = `<span style="font-size:0.75rem; color:#94A3B8; font-style:italic;">No hay reportes clínicos registrados hoy.</span>`;
        }
      } else {
        // Carmen Elena Zelaya static clinical context report
        if (ctxReportStatus) {
          ctxReportStatus.innerText = "Alerta";
          ctxReportStatus.style.backgroundColor = "#FFEBEE";
          ctxReportStatus.style.color = "#D32F2F";
        }
        reportContainer.innerHTML = `
          <div style="font-size: 0.72rem; color: #64748B; margin-bottom: 2px;">Reportado: Hace 1 hora</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.75rem;">
            <div>Presión: <strong style="color:#D32F2F;">135/88 mmHg</strong></div>
            <div>Pulso: <strong style="color:#D32F2F;">91 lpm</strong></div>
            <div>Temp: <strong>36.7 °C</strong></div>
            <div>SpO2: <strong>96%</strong></div>
            <div>Dolor: <strong style="color:#D32F2F;">5/10</strong></div>
            <div>Ánimo: <strong>Preocupado</strong></div>
          </div>
          <div style="font-size:0.72rem; background-color:#F8FAFC; padding:6px; border-radius:6px; border-left:2px solid var(--danger-red); margin-top:4px; font-style:italic; color:#475569;">
            "Siento un leve dolor opresivo en el pecho después de caminar en la banda."
          </div>
        `;
      }
    }
  }

  // --- E-Prescription Delivery to Pharmacy ---
  if (!localStorage.getItem('hmc_prescriptions')) {
    localStorage.setItem('hmc_prescriptions', JSON.stringify(db.prescriptions));
  }

  function getPrescriptions() {
    try {
      const raw = localStorage.getItem('hmc_prescriptions');
      if (!raw || raw === "undefined" || raw === "null" || raw === "[]") {
        return db.prescriptions;
      }
      return JSON.parse(raw);
    } catch(e) {
      console.error("Error reading hmc_prescriptions:", e);
      return db.prescriptions;
    }
  }

  window.renderActivePrescriptionPanel = function(rx) {
    const container = document.getElementById("active-prescription-container");
    if (!container) return;

    container.classList.remove("hidden");
    
    let statusColor = "#B45309";
    let statusBg = "#FEF3C7";
    let statusText = "🟡 Pendiente";
    if (rx.status === "Enviada a Farmacia") {
      statusColor = "#15803D";
      statusBg = "#D1FAE5";
      statusText = "🟢 Enviada a Farmacia";
    }

    container.innerHTML = `
      <h4 style="font-size:0.85rem; font-weight:700; color:var(--text-dark); margin-bottom:8px;">Receta Activa Creada:</h4>
      <div style="background-color:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:12px; font-size:0.8rem; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <strong>Código: ${rx.code}</strong>
          <span id="active-rx-badge" style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.65rem; color: ${statusColor}; background-color: ${statusBg};">
            ${statusText}
          </span>
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:8px;">
          Fecha: ${rx.date} | Paciente: Andrés Mendoza Salgado
        </div>
        <div style="display:flex; flex-direction:column; gap:4px; max-height:80px; overflow-y:auto; border-top:1px dashed #E2E8F0; padding-top:6px; margin-bottom:6px;">
          ${rx.medications.map(m => `<div>&bull; <strong>${m.name}</strong> - ${m.dosage}</div>`).join("")}
        </div>
        ${rx.farmaciaDestino ? `
          <div style="font-size:0.75rem; color:#1E293B; border-top:1px solid #F1F5F9; padding-top:6px;">
            <strong>Farmacia destino:</strong> ${rx.farmaciaDestino}<br>
            <strong>Ref. Envío:</strong> ${rx.refNum}<br>
            <strong>Fecha envío:</strong> ${rx.dateSent}
          </div>
        ` : ''}
      </div>
      
      <button class="rx-form-btn ripple-btn" id="rx-btn-send-to-pharmacy" style="background-color:#007A64; color:#FFFFFF; border:none; width:100%; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:6px; font-size:0.8rem; padding:10px;" ${rx.status === "Enviada a Farmacia" ? "disabled" : ""}>
        <span class="material-symbols-rounded" style="font-size:1.1rem;">send_to_mobile</span>
        ${rx.status === "Enviada a Farmacia" ? "Receta Enviada a Farmacia" : "📤 Enviar a Farmacia"}
      </button>
    `;

    const sendBtn = document.getElementById("rx-btn-send-to-pharmacy");
    if (sendBtn && rx.status !== "Enviada a Farmacia") {
      sendBtn.onclick = () => {
        showSendToPharmacyConfirmModal(rx);
      };
    }
  };

  window.showSendToPharmacyConfirmModal = function(rx) {
    const overlay = document.createElement("div");
    overlay.className = "rx-modal-overlay";
    overlay.id = "rx-modal-confirm-pharmacy";
    
    overlay.innerHTML = `
      <div class="rx-modal-card" style="max-width: 320px; border-radius:16px; padding:20px; text-align:left;">
        <h3 style="font-size:1rem; font-weight:800; color:#0F172A; margin: 0 0 12px 0; border-bottom:1px solid #F1F5F9; padding-bottom:8px;">
          Enviar receta electrónica
        </h3>
        
        <div style="font-size:0.85rem; color:#475569; display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
          <div>
            <span style="display:block; font-size:0.7rem; font-weight:700; color:#94A3B8; text-transform:uppercase;">Paciente</span>
            <strong>Andrés Mendoza Salgado</strong>
          </div>
          <div>
            <span style="display:block; font-size:0.7rem; font-weight:700; color:#94A3B8; text-transform:uppercase;">Receta Ref</span>
            <strong>${rx.code}</strong>
          </div>
          <div>
            <span style="display:block; font-size:0.7rem; font-weight:700; color:#94A3B8; text-transform:uppercase;">Farmacia destino</span>
            <strong>Honduras Medical Center Pharmacy</strong>
          </div>
        </div>
        
        <div class="rx-modal-actions" style="display:flex; gap:10px; justify-content:flex-end;">
          <button class="rx-modal-action-btn cancel" id="pharmacy-btn-cancel" style="padding:8px 16px; font-size:0.8rem; border-radius:8px;">Cancelar</button>
          <button class="rx-modal-action-btn confirm" id="pharmacy-btn-confirm" style="padding:8px 16px; font-size:0.8rem; border-radius:8px; background-color:#007A64; color:#FFFFFF;">Enviar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);

    document.getElementById("pharmacy-btn-cancel").onclick = () => {
      overlay.remove();
    };

    document.getElementById("pharmacy-btn-confirm").onclick = () => {
      overlay.remove();
      
      const rxList = getPrescriptions();
      const storedRx = rxList.find(item => item.id === rx.id);
      if (storedRx) {
        storedRx.status = "Enviada a Farmacia";
        storedRx.farmaciaDestino = "Honduras Medical Center Pharmacy";
        
        const today = new Date();
        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        storedRx.dateSent = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
        storedRx.refNum = `RX-2026-${Math.floor(100000 + Math.random() * 900000)}`;
        
        localStorage.setItem('hmc_prescriptions', JSON.stringify(rxList));
        db.prescriptions = rxList;
        
        renderActivePrescriptionPanel(storedRx);
        
        showToast("✓ Electronic prescription successfully sent to the pharmacy.", "success");
      }
    };
  };

  switchTab("dashboard");
});
