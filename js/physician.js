// HMC Connect Pro - Physician Portal Controller
document.addEventListener("DOMContentLoaded", () => {
  const db = window.HMCDatabase;
  if (!db) {
    console.error("Database mockData.js not loaded.");
    return;
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

    if (tabId === "dashboard") {
      dashboardView.classList.remove("hidden");
      consultView.classList.add("hidden");
      
      // Stop video camera when leaving consult room
      releaseWebcam();
      renderQueue();
    } else if (tabId === "consult") {
      dashboardView.classList.add("hidden");
      consultView.classList.remove("hidden");
      initConsultation();
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
        overlay.remove();
        // Add to database mock
        db.prescriptions.unshift({
          id: `rx-${Date.now()}`,
          date: getFormattedDate(),
          doctorName: "Dr. Carlos Valladares",
          specialty: "Cardiología",
          code: rxNum,
          active: true,
          medications: prescriptionDraft.map(m => ({
            name: m.name,
            dosage: m.dose,
            instructions: m.instr,
            quantity: 90
          }))
        });

        showToast("💊 Receta firmada digitalmente y enviada al paciente.", "pill");
        prescriptionDraft = [];
        renderPrescriptionDraft();
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

  // Initial trigger
  switchTab("dashboard");
});
