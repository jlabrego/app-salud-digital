// HMC Connect - Interactive Mobile Application Logic
document.addEventListener("DOMContentLoaded", () => {
  // Check that mock database is loaded
  const db = window.HMCDatabase;
  if (!db) {
    console.error("Database mockData.js not loaded.");
    return;
  }

  // --- Mobile Navigation Router ---
  const screens = [
    "splash", "onboarding", "login", "biometric", "dashboard", 
    "doctor-search", "doctor-profile", "booking-confirm",
    "appointments", "telehealth-waiting", "telehealth-call",
    "records", "record-detail", "qr-card", "settings"
  ];

  let currentScreen = "splash";
  let activeDoctor = null;
  let activeRecordType = null; // 'lab' or 'imaging'
  let activeRecordId = null;

  function showScreen(screenId) {
    console.log("Switching to screen:", screenId);
    screens.forEach(s => {
      const el = document.getElementById(`screen-${s}`);
      if (el) {
        el.classList.add("hidden");
        el.classList.remove("active");
      }
    });

    const activeEl = document.getElementById(`screen-${screenId}`);
    if (activeEl) {
      activeEl.classList.remove("hidden");
      // Force repaint for animations
      void activeEl.offsetWidth;
      activeEl.classList.add("active");
      currentScreen = screenId;
    }
    
    // Update active state in bottom navigation bar (if visible)
    updateBottomNav(screenId);

    // Context specific screen initializations
    if (screenId === "dashboard") {
      initDashboard();
    } else if (screenId === "doctor-search") {
      renderDoctors(db.doctors);
    } else if (screenId === "appointments") {
      renderAppointments();
    } else if (screenId === "qr-card") {
      initQRCard();
    }
  }

  function updateBottomNav(screenId) {
    const bottomNavs = document.querySelectorAll(".bottom-nav");
    bottomNavs.forEach(nav => {
      // Show bottom nav only on main app tabs
      const mainTabs = ["dashboard", "doctor-search", "appointments", "records", "settings"];
      if (mainTabs.includes(screenId)) {
        nav.classList.remove("hidden");
      } else {
        nav.classList.add("hidden");
      }

      // Highlight active icon
      const tabButtons = nav.querySelectorAll(".nav-item");
      tabButtons.forEach(btn => {
        const tab = btn.dataset.tab;
        if (tab === screenId || (tab === "doctor-search" && screenId === "doctor-profile")) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    });
  }

  // Bind Navigation Clicks
  document.querySelectorAll("[data-nav]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const target = btn.dataset.nav;
      showScreen(target);
    });
  });

  // --- Splash Screen & Onboarding Sequence ---
  const splash = document.getElementById("screen-splash");
  if (splash) {
    // Automatically transition from Splash to Onboarding after 2.5 seconds
    setTimeout(() => {
      if (currentScreen === "splash") {
        showScreen("onboarding");
      }
    }, 2500);
  }

  // --- Biometric Authentication Simulator ---
  const triggerBioBtn = document.getElementById("trigger-biometric-auth");
  if (triggerBioBtn) {
    triggerBioBtn.addEventListener("click", () => {
      showScreen("biometric");
      
      const scanner = document.getElementById("biometric-scanner-ring");
      const statusText = document.getElementById("biometric-status-text");
      const successIcon = document.getElementById("biometric-success-icon");
      
      if (scanner && statusText && successIcon) {
        scanner.classList.add("scanning");
        statusText.innerText = "Escaneando Face ID...";
        successIcon.style.opacity = "0";

        setTimeout(() => {
          scanner.classList.remove("scanning");
          scanner.classList.add("success");
          successIcon.style.opacity = "1";
          statusText.innerText = "Acceso Permitido";

          setTimeout(() => {
            scanner.classList.remove("success");
            showScreen("dashboard");
          }, 1000);
        }, 2200);
      } else {
        // Fallback if elements not fully styled yet
        setTimeout(() => showScreen("dashboard"), 1500);
      }
    });
  }

  // --- Personalized Dashboard Setup ---
  function initDashboard() {
    // Random motivational health quote
    const greetingMsg = document.getElementById("dashboard-motivation");
    if (greetingMsg) {
      const idx = Math.floor(Math.random() * db.motivationalMessages.length);
      greetingMsg.innerText = db.motivationalMessages[idx];
    }

    // Load Vitals UI
    document.getElementById("vital-hr-value").innerText = db.vitals.heartRate.current;
    document.getElementById("vital-bp-value").innerText = `${db.vitals.bloodPressure.systolic}/${db.vitals.bloodPressure.diastolic}`;
    document.getElementById("vital-oxy-value").innerText = db.vitals.bloodOxygen.current;
    document.getElementById("vital-temp-value").innerText = db.vitals.temperature.current;

    // Build Vitals Sparklines (mini SVG charts)
    drawSparkline("hr-sparkline", db.vitals.heartRate.history, "#D32F2F");
    drawSparkline("oxy-sparkline", db.vitals.bloodOxygen.history, "#1976D2");
    
    // Load Meds Checklist
    const medsContainer = document.getElementById("meds-checklist");
    if (medsContainer) {
      medsContainer.innerHTML = "";
      db.medications.forEach(med => {
        const medEl = document.createElement("div");
        medEl.className = `med-item ${med.taken ? "completed" : ""}`;
        medEl.id = `med-item-${med.id}`;
        medEl.innerHTML = `
          <div class="med-checkbox-wrapper">
            <input type="checkbox" id="check-${med.id}" ${med.taken ? "checked" : ""} class="med-checkbox">
            <span class="custom-checkbox-fill"></span>
          </div>
          <div class="med-details">
            <div class="med-name">${med.name}</div>
            <div class="med-dose-info">${med.dosage} &bull; ${med.instructions}</div>
          </div>
          <div class="med-time">${med.time}</div>
        `;

        // Checkbox interaction with positive reinforcement
        const checkbox = medEl.querySelector(".med-checkbox");
        checkbox.addEventListener("change", (e) => {
          med.taken = e.target.checked;
          if (med.taken) {
            medEl.classList.add("completed");
            showToast("💊 ¡Medicación registrada! Gracias por cuidar de ti.");
          } else {
            medEl.classList.remove("completed");
          }
          updateDashboardProgress();
        });

        medsContainer.appendChild(medEl);
      });
    }

    updateDashboardProgress();
  }

  function updateDashboardProgress() {
    const total = db.medications.length;
    const completed = db.medications.filter(m => m.taken).length;
    const pct = Math.round((completed / total) * 100);
    
    // Update progress text & ring
    const progText = document.getElementById("meds-progress-text");
    if (progText) progText.innerText = `${completed}/${total} Completados`;

    const progressRing = document.getElementById("dashboard-progress-ring");
    if (progressRing) {
      // 2 * PI * r = circumference. r=24. circumference=150.8
      const offset = 150.8 - (pct / 100) * 150.8;
      progressRing.style.strokeDashoffset = offset;
    }
  }

  // Draw smooth sparkline on canvas/SVG
  function drawSparkline(svgId, data, color) {
    const svg = document.getElementById(svgId);
    if (!svg) return;
    
    const width = 100;
    const height = 30;
    const maxVal = Math.max(...data);
    const minVal = Math.min(...data);
    const range = maxVal - minVal || 1;
    
    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - minVal) / range) * (height - 6) - 3;
      return `${x},${y}`;
    }).join(" ");
    
    svg.innerHTML = `
      <polyline fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
    `;
  }

  // --- Doctor Search & Booking Flow ---
  const searchInput = document.getElementById("doctor-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = db.doctors.filter(d => 
        d.name.toLowerCase().includes(query) || 
        d.specialty.toLowerCase().includes(query)
      );
      renderDoctors(filtered);
    });
  }

  function renderDoctors(doctorList) {
    const container = document.getElementById("doctors-list-container");
    if (!container) return;

    container.innerHTML = "";
    if (doctorList.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-rounded">search_off</span>
          <p>No encontramos especialistas con ese nombre o especialidad.</p>
        </div>
      `;
      return;
    }

    doctorList.forEach(doc => {
      const card = document.createElement("div");
      card.className = "doctor-card slide-up";
      card.innerHTML = `
        <div class="doctor-card-header">
          <img src="assets/${doc.avatar}" alt="${doc.name}" class="doctor-avatar" onerror="this.src='https://via.placeholder.com/150'">
          <div class="doctor-meta">
            <h3 class="doctor-name">${doc.name}</h3>
            <span class="doctor-specialty">${doc.specialty}</span>
            <div class="doctor-rating">
              <span class="material-symbols-rounded star">star</span>
              ${doc.rating}
            </div>
          </div>
        </div>
        <div class="doctor-card-footer">
          <span class="doctor-cost">${doc.cost} <span class="cost-unit">/ consulta</span></span>
          <button class="book-btn ripple-btn" data-doc-id="${doc.id}">Reservar Cita</button>
        </div>
      `;

      card.querySelector(".book-btn").addEventListener("click", () => {
        openDoctorProfile(doc);
      });

      container.appendChild(card);
    });
  }

  function openDoctorProfile(doc) {
    activeDoctor = doc;
    showScreen("doctor-profile");

    document.getElementById("profile-doc-avatar").src = `assets/${doc.avatar}`;
    document.getElementById("profile-doc-name").innerText = doc.name;
    document.getElementById("profile-doc-specialty").innerText = doc.specialty;
    document.getElementById("profile-doc-rating").innerText = doc.rating;
    document.getElementById("profile-doc-bio").innerText = doc.bio;
    document.getElementById("profile-doc-education").innerText = doc.education;

    // Load available slots
    const slotsContainer = document.getElementById("profile-doc-slots");
    if (slotsContainer) {
      slotsContainer.innerHTML = "";
      doc.availability.forEach(time => {
        const btn = document.createElement("button");
        btn.className = "time-slot-btn";
        btn.innerText = time;
        btn.addEventListener("click", () => {
          slotsContainer.querySelectorAll(".time-slot-btn").forEach(b => b.classList.remove("selected"));
          btn.classList.add("selected");
        });
        slotsContainer.appendChild(btn);
      });
    }

    // Set default day in calendar
    const calendarDays = document.querySelectorAll(".calendar-day-btn");
    calendarDays.forEach(day => {
      day.classList.remove("selected");
      day.addEventListener("click", () => {
        calendarDays.forEach(d => d.classList.remove("selected"));
        day.classList.add("selected");
      });
    });
    // select first day
    if (calendarDays.length > 0) calendarDays[0].classList.add("selected");
  }

  // Handle Book Action from Profile
  const confirmBookBtn = document.getElementById("confirm-booking-action");
  if (confirmBookBtn) {
    confirmBookBtn.addEventListener("click", () => {
      const selectedSlot = document.querySelector(".time-slot-btn.selected");
      const selectedDayBtn = document.querySelector(".calendar-day-btn.selected");

      if (!selectedSlot) {
        showToast("⚠️ Por favor selecciona un horario de consulta.");
        return;
      }

      const time = selectedSlot.innerText;
      const dayName = selectedDayBtn.querySelector(".day-name").innerText;
      const dayNum = selectedDayBtn.querySelector(".day-num").innerText;

      // Add to database
      const newApt = {
        id: `apt-${Date.now()}`,
        doctorName: activeDoctor.name,
        specialty: activeDoctor.specialty,
        avatar: activeDoctor.avatar,
        date: `2026-07-${dayNum}`,
        time: time,
        room: activeDoctor.specialty === "Dermatología" ? "Videoconsulta HMC" : "Consultorio 302 - Torre A",
        type: activeDoctor.specialty === "Dermatología" ? "Telemedicina" : "Presencial",
        status: "Confirmada",
        canCheckIn: true
      };

      db.appointments.unshift(newApt);
      
      // Update screen details
      document.getElementById("confirm-doctor-name").innerText = activeDoctor.name;
      document.getElementById("confirm-doctor-specialty").innerText = activeDoctor.specialty;
      document.getElementById("confirm-date-time").innerText = `${dayName} 2026-07-${dayNum} a las ${time}`;
      document.getElementById("confirm-type").innerText = newApt.type;

      showScreen("booking-confirm");
    });
  }

  // --- Appointments Tab ---
  function renderAppointments() {
    const activeContainer = document.getElementById("active-appointments-list");
    const pastContainer = document.getElementById("past-appointments-list");
    
    if (!activeContainer || !pastContainer) return;

    activeContainer.innerHTML = "";
    pastContainer.innerHTML = "";

    const activeApts = db.appointments.filter(a => a.status === "Confirmada");
    const pastApts = db.appointments.filter(a => a.status === "Completada");

    if (activeApts.length === 0) {
      activeContainer.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-rounded">calendar_today</span>
          <p>No tienes citas programadas pendientes.</p>
        </div>
      `;
    } else {
      activeApts.forEach(apt => {
        const card = document.createElement("div");
        card.className = "appointment-card slide-up";
        card.innerHTML = `
          <div class="apt-header">
            <img src="assets/${apt.avatar}" alt="${apt.doctorName}" class="apt-doc-avatar" onerror="this.src='https://via.placeholder.com/150'">
            <div class="apt-doc-details">
              <h4 class="apt-doc-name">${apt.doctorName}</h4>
              <span class="apt-doc-specialty">${apt.specialty}</span>
            </div>
            <span class="apt-badge ${apt.type.toLowerCase()}">${apt.type}</span>
          </div>
          <div class="apt-body">
            <div class="apt-info-row">
              <span class="material-symbols-rounded">event</span>
              <span>${apt.date} &bull; ${apt.time}</span>
            </div>
            <div class="apt-info-row">
              <span class="material-symbols-rounded">location_on</span>
              <span>${apt.room}</span>
            </div>
          </div>
          <div class="apt-footer">
            ${apt.type === "Telemedicina" 
              ? `<button class="apt-action-btn primary start-consult-btn">Ingresar a Sala</button>`
              : `<button class="apt-action-btn outline qr-checkin-btn">Check-in QR</button>`
            }
            <button class="apt-action-btn text cancel-apt-btn">Cancelar</button>
          </div>
        `;

        // Bind teleport to consultation lounge or QR code
        const startBtn = card.querySelector(".start-consult-btn");
        if (startBtn) {
          startBtn.addEventListener("click", () => {
            initTelehealthWaiting(apt);
          });
        }

        const qrCheckinBtn = card.querySelector(".qr-checkin-btn");
        if (qrCheckinBtn) {
          qrCheckinBtn.addEventListener("click", () => {
            showScreen("qr-card");
          });
        }

        const cancelBtn = card.querySelector(".cancel-apt-btn");
        if (cancelBtn) {
          cancelBtn.addEventListener("click", () => {
            apt.status = "Cancelada";
            showToast("❌ Cita cancelada correctamente.");
            renderAppointments();
          });
        }

        activeContainer.appendChild(card);
      });
    }

    if (pastApts.length === 0) {
      pastContainer.innerHTML = `<p class="empty-text">No registras consultas anteriores.</p>`;
    } else {
      pastApts.forEach(apt => {
        const card = document.createElement("div");
        card.className = "appointment-card completed slide-up";
        card.innerHTML = `
          <div class="apt-header">
            <img src="assets/${apt.avatar}" alt="${apt.doctorName}" class="apt-doc-avatar" onerror="this.src='https://via.placeholder.com/150'">
            <div class="apt-doc-details">
              <h4 class="apt-doc-name">${apt.doctorName}</h4>
              <span class="apt-doc-specialty">${apt.specialty}</span>
            </div>
            <span class="apt-badge completed">Completada</span>
          </div>
          <div class="apt-body">
            <p class="apt-note-title">Indicaciones Clínicas:</p>
            <p class="apt-note-text">"${apt.notes}"</p>
          </div>
          <div class="apt-footer">
            <button class="apt-action-btn outline btn-view-report" data-nav="records">Ver Expediente</button>
          </div>
        `;
        activeContainer.appendChild(card);
      });
    }
  }

  // --- Telehealth Console & Waiting Room ---
  let telemedicineTimer = null;
  function initTelehealthWaiting(appointment) {
    showScreen("telehealth-waiting");
    
    document.getElementById("waiting-doctor-name").innerText = appointment.doctorName;
    document.getElementById("waiting-doctor-specialty").innerText = appointment.specialty;
    document.getElementById("waiting-doctor-avatar").src = `assets/${appointment.avatar}`;
    
    let timeRemaining = 10; // seconds for fast demo
    const timerVal = document.getElementById("waiting-countdown-timer");
    
    if (telemedicineTimer) clearInterval(telemedicineTimer);
    
    telemedicineTimer = setInterval(() => {
      timeRemaining--;
      if (timerVal) timerVal.innerText = `00:${timeRemaining < 10 ? '0' : ''}${timeRemaining}`;
      
      if (timeRemaining <= 0) {
        clearInterval(telemedicineTimer);
        // Start Telehealth Video consultation
        startTelehealthCall(appointment);
      }
    }, 1000);
  }

  function startTelehealthCall(appointment) {
    showScreen("telehealth-call");
    document.getElementById("call-doctor-name").innerText = appointment.doctorName;
    document.getElementById("call-doctor-specialty").innerText = appointment.specialty;
    
    // Simulate Video Feed using Browser Webcam or Loop Animation
    const videoElement = document.getElementById("local-video-feed");
    if (videoElement) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
          videoElement.srcObject = stream;
          videoElement.play();
        })
        .catch(err => {
          console.log("Webcam denied, running simulated backdrop", err);
          videoElement.style.backgroundColor = "#263238";
        });
    }

    // Secure chat log simulation inside call
    const chatContainer = document.getElementById("call-chat-history");
    const chatInput = document.getElementById("call-chat-input");
    const chatSendBtn = document.getElementById("call-chat-send");

    if (chatContainer && chatInput && chatSendBtn) {
      chatContainer.innerHTML = "";
      
      // Load doctors past conversations
      const docId = appointment.doctorName.includes("Valladares") ? "doc-1" : "doc-2";
      const docChats = db.chats[docId] || [];
      
      docChats.forEach(msg => {
        appendChatMessage(chatContainer, msg.sender, msg.text, msg.time.split(" ")[1]);
      });

      // Bind send action
      chatSendBtn.onclick = () => {
        const text = chatInput.value.trim();
        if (!text) return;
        
        appendChatMessage(chatContainer, "patient", text, "Hoy");
        chatInput.value = "";
        
        // Auto physician answer after 1.5s
        setTimeout(() => {
          appendChatMessage(chatContainer, "doctor", "Entendido, estoy registrando esa información en tu ficha clínica.", "Hoy");
        }, 1500);
      };
    }
  }

  function appendChatMessage(container, sender, text, time) {
    const msgEl = document.createElement("div");
    msgEl.className = `chat-bubble ${sender}`;
    msgEl.innerHTML = `
      <div class="chat-text">${text}</div>
      <div class="chat-time">${time}</div>
    `;
    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;
  }

  // Bind Telemedicine exit button
  const hangUpBtn = document.getElementById("telehealth-hangup");
  if (hangUpBtn) {
    hangUpBtn.addEventListener("click", () => {
      // stop video stream
      const videoElement = document.getElementById("local-video-feed");
      if (videoElement && videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
      }
      showToast("📞 Consulta finalizada.");
      showScreen("dashboard");
    });
  }

  // --- Medical Records View ---
  const recordsTabs = document.querySelectorAll(".records-tab-btn");
  recordsTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      recordsTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const filter = tab.dataset.filter; // 'labs', 'imaging', 'rx'
      renderMedicalRecords(filter);
    });
  });

  // Default render for Records tab opening
  document.querySelectorAll("[data-nav='records']").forEach(btn => {
    btn.addEventListener("click", () => {
      setTimeout(() => renderMedicalRecords("labs"), 100);
    });
  });

  function renderMedicalRecords(filter) {
    const container = document.getElementById("records-list-container");
    if (!container) return;

    container.innerHTML = "";

    if (filter === "labs") {
      db.labResults.forEach(lab => {
        const item = document.createElement("div");
        item.className = "record-list-item slide-up";
        item.innerHTML = `
          <div class="record-meta">
            <span class="material-symbols-rounded icon">science</span>
            <div>
              <h4 class="record-title">${lab.testName}</h4>
              <p class="record-subtitle">Solicitado por: ${lab.orderedBy} &bull; ${lab.date}</p>
            </div>
          </div>
          <span class="material-symbols-rounded chevron">chevron_right</span>
        `;
        item.onclick = () => openLabResultDetail(lab);
        container.appendChild(item);
      });
    } else if (filter === "imaging") {
      db.imagingReports.forEach(img => {
        const item = document.createElement("div");
        item.className = "record-list-item slide-up";
        item.innerHTML = `
          <div class="record-meta">
            <span class="material-symbols-rounded icon">camera_enhance</span>
            <div>
              <h4 class="record-title">${img.studyName}</h4>
              <p class="record-subtitle">Solicitado por: ${img.orderedBy} &bull; ${img.date}</p>
            </div>
          </div>
          <span class="material-symbols-rounded chevron">chevron_right</span>
        `;
        item.onclick = () => openImagingDetail(img);
        container.appendChild(item);
      });
    } else if (filter === "rx") {
      db.prescriptions.forEach(rx => {
        const item = document.createElement("div");
        item.className = "record-list-item slide-up";
        item.innerHTML = `
          <div class="record-meta">
            <span class="material-symbols-rounded icon">receipt_long</span>
            <div>
              <h4 class="record-title">Receta Electrónica ${rx.code}</h4>
              <p class="record-subtitle">Dr. Valladares &bull; ${rx.date}</p>
            </div>
          </div>
          <span class="material-symbols-rounded chevron">chevron_right</span>
        `;
        item.onclick = () => openPrescriptionDetail(rx);
        container.appendChild(item);
      });
    }
  }

  function openLabResultDetail(lab) {
    showScreen("record-detail");
    document.getElementById("detail-title").innerText = lab.testName;
    document.getElementById("detail-subtitle").innerText = `${lab.date} | Ordenado por ${lab.orderedBy}`;
    
    // Encouragement message banner
    const content = document.getElementById("detail-dynamic-content");
    content.innerHTML = `
      <div class="lab-encouragement-banner">
        <span class="material-symbols-rounded heart-icon">favorite</span>
        <p class="encouragement-text">${lab.encouragement}</p>
      </div>
      <div class="lab-parameters-list">
        <div class="lab-list-header">
          <span>Prueba</span>
          <span style="text-align: right;">Resultado</span>
        </div>
        ${lab.parameters.map(p => `
          <div class="lab-parameter-row">
            <div class="param-info">
              <span class="param-name">${p.name}</span>
              <span class="param-range">${p.range}</span>
            </div>
            <div class="param-result">
              <span class="param-val">${p.value}</span>
              <span class="param-unit">${p.unit}</span>
              <span class="status-indicator ${p.status}"></span>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function openImagingDetail(img) {
    showScreen("record-detail");
    document.getElementById("detail-title").innerText = img.studyName;
    document.getElementById("detail-subtitle").innerText = `${img.date} | Ordenado por ${img.orderedBy}`;
    
    const content = document.getElementById("detail-dynamic-content");
    content.innerHTML = `
      <div class="imaging-viewer-container">
        <div class="imaging-viewport-wrapper">
          <img src="assets/${img.imagePath}" id="interactive-xray-view" alt="${img.studyName}" class="xray-image" onerror="this.src='https://via.placeholder.com/400x400/263238/FFFFFF?text=X-RAY+FILM'">
        </div>
        <div class="imaging-controls">
          <label>Zoom</label>
          <input type="range" id="xray-zoom" min="1" max="3" step="0.1" value="1">
          <label>Brillo</label>
          <input type="range" id="xray-contrast" min="50" max="150" step="5" value="100">
        </div>
      </div>
      <div class="report-findings-card">
        <h4>Hallazgos Clínicos</h4>
        <p>${img.findings}</p>
        <h4 style="margin-top: 16px;">Conclusión</h4>
        <p style="font-weight: 600;">${img.conclusion}</p>
      </div>
    `;

    // Bind interactive X-Ray viewers
    const zoomSlider = document.getElementById("xray-zoom");
    const contrastSlider = document.getElementById("xray-contrast");
    const xrayImg = document.getElementById("interactive-xray-view");

    if (zoomSlider && contrastSlider && xrayImg) {
      const updateXrayStyles = () => {
        xrayImg.style.transform = `scale(${zoomSlider.value})`;
        xrayImg.style.filter = `brightness(${contrastSlider.value}%)`;
      };
      zoomSlider.addEventListener("input", updateXrayStyles);
      contrastSlider.addEventListener("input", updateXrayStyles);
    }
  }

  function openPrescriptionDetail(rx) {
    showScreen("record-detail");
    document.getElementById("detail-title").innerText = `Receta Médica ${rx.code}`;
    document.getElementById("detail-subtitle").innerText = `Fecha de emisión: ${rx.date}`;

    const content = document.getElementById("detail-dynamic-content");
    content.innerHTML = `
      <div class="prescription-card-detail">
        <div class="rx-card-header">
          <div class="hospital-stamp">
            <span class="material-symbols-rounded">medical_services</span>
            <strong>HMC Connect</strong>
          </div>
          <div class="doctor-badge-min">
            <strong>${rx.doctorName}</strong>
            <span>${rx.specialty}</span>
          </div>
        </div>
        <div class="rx-meds-list">
          ${rx.medications.map(m => `
            <div class="rx-med-item">
              <div class="rx-med-header">
                <span class="rx-med-name">${m.name}</span>
                <span class="rx-med-qty">Cant. ${m.quantity}</span>
              </div>
              <p class="rx-med-instructions">${m.instructions}</p>
              <span class="rx-med-dosage">${m.dosage}</span>
            </div>
          `).join("")}
        </div>
        <div class="rx-footer-qr-reveal">
          <p>Muestra este código QR en farmacias HMC para retirar tus medicamentos.</p>
          <div class="qr-placeholder-wrapper">
            <span class="material-symbols-rounded qr-scanner-icon">qr_code_2</span>
          </div>
          <span class="rx-seal-code">HMC SECURE SIGNATURE SEAL VALID</span>
        </div>
      </div>
    `;
  }

  // --- QR Medical Card Flipping ---
  function initQRCard() {
    const cardWrapper = document.querySelector(".qr-card-flip-wrapper");
    if (cardWrapper) {
      cardWrapper.onclick = () => {
        cardWrapper.classList.toggle("flipped");
      };
    }
  }

  // --- Theme Mode (Dark Mode) ---
  const themeToggle = document.getElementById("dark-mode-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("change", (e) => {
      if (e.target.checked) {
        document.body.classList.add("dark-theme");
        showToast("🌙 Modo Oscuro Activado.");
      } else {
        document.body.classList.remove("dark-theme");
        showToast("☀️ Modo Claro Activado.");
      }
    });
  }

  // --- Utility Toast Notification ---
  function showToast(message) {
    const container = document.body;
    const toast = document.createElement("div");
    toast.className = "hmc-toast slide-up";
    toast.innerText = message;
    
    // style toast inline to prevent conflicts
    toast.style.position = "fixed";
    toast.style.bottom = "80px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.backgroundColor = "rgba(38, 50, 56, 0.95)";
    toast.style.color = "#FFFFFF";
    toast.style.padding = "12px 24px";
    toast.style.borderRadius = "30px";
    toast.style.fontSize = "0.9rem";
    toast.style.fontWeight = "600";
    toast.style.zIndex = "9999";
    toast.style.boxShadow = "0 8px 16px rgba(0,0,0,0.15)";
    toast.style.textAlign = "center";
    toast.style.backdropFilter = "blur(8px)";
    toast.style.animation = "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards";

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "fadeIn 0.3s reverse forwards";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Kickstart view
  showScreen("splash");
});
