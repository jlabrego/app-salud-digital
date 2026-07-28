const HMCDatabase = {
  patient: {
    id: "HMC-98231-AM",
    firstName: "Andrés",
    lastName: "Mendoza",
    fullName: "Andrés Mendoza Salgado",
    age: 34,
    dob: "1992-04-12",
    gender: "Masculino",
    bloodType: "O+",
    weight: "78 kg",
    height: "1.76 m",
    allergies: ["Penicilina", "Polen"],
    conditions: ["Hipertensión arterial leve"],
    insurance: {
      provider: "Ficohsa Seguros",
      policyNumber: "POL-88329-HMC",
      coverage: "85% Red Hospitalaria",
      status: "Activa"
    },
    emergencyContact: {
      name: "Gabriela de Mendoza",
      relationship: "Esposa",
      phone: "+504 9982-3341"
    }
  },

  motivationalMessages: [
    "¡Buen día, Andrés! Dar un pequeño paso hoy es un gran avance para tu salud a largo plazo.",
    "Recuerda mantenerte hidratado. Tu cuerpo te lo agradecerá hoy.",
    "Completar tu tratamiento a tiempo es la clave para una recuperación exitosa. ¡Vas muy bien!",
    "Tu presión arterial promedio ha mejorado un 4% esta semana. ¡Sigue así!"
  ],

  vitals: {
    heartRate: {
      current: 72,
      unit: "lpm",
      status: "Normal",
      history: [68, 70, 75, 72, 71, 74, 72]
    },
    bloodPressure: {
      systolic: 118,
      diastolic: 78,
      unit: "mmHg",
      status: "Normal",
      history: [
        { sys: 122, dia: 80 },
        { sys: 120, dia: 79 },
        { sys: 118, dia: 78 },
        { sys: 119, dia: 78 },
        { sys: 117, dia: 77 },
        { sys: 118, dia: 78 }
      ]
    },
    bloodOxygen: {
      current: 98,
      unit: "%",
      status: "Excelente",
      history: [97, 98, 98, 99, 98, 98, 98]
    },
    temperature: {
      current: 36.6,
      unit: "°C",
      status: "Normal",
      history: [36.5, 36.7, 36.6, 36.6, 36.5, 36.6]
    }
  },

  medications: [
    {
      id: "med-1",
      name: "Losartán Potásico",
      dosage: "50 mg",
      instructions: "1 tableta por la mañana con agua",
      time: "08:00 AM",
      taken: true,
      category: "Presión Arterial"
    },
    {
      id: "med-2",
      name: "Vitamina D3",
      dosage: "2000 UI",
      instructions: "1 cápsula blanda con el desayuno",
      time: "08:30 AM",
      taken: true,
      category: "Suplemento"
    },
    {
      id: "med-3",
      name: "Omega 3 (Aceite de Pescado)",
      dosage: "1000 mg",
      instructions: "1 cápsula blanda con la cena",
      time: "07:00 PM",
      taken: false,
      category: "Suplemento"
    }
  ],

  appointments: [
    {
      id: "apt-1",
      doctorName: "Dr. Carlos Valladares",
      specialty: "Cardiología",
      avatar: "doctor_male_profile.png",
      date: "2026-07-28",
      time: "09:30 AM",
      room: "Consultorio 302 - Torre A",
      type: "Presencial",
      status: "Confirmada",
      canCheckIn: true
    },
    {
      id: "apt-2",
      doctorName: "Dra. Sofía Murillo",
      specialty: "Dermatología",
      avatar: "doctor_female_profile.png",
      date: "2026-07-31",
      time: "02:00 PM",
      room: "Videoconsulta HMC",
      type: "Telemedicina",
      status: "Confirmada",
      canCheckIn: false
    },
    {
      id: "apt-3",
      doctorName: "Dr. Carlos Valladares",
      specialty: "Cardiología",
      avatar: "doctor_male_profile.png",
      date: "2026-05-15",
      time: "10:00 AM",
      room: "Consultorio 302 - Torre A",
      type: "Presencial",
      status: "Completada",
      notes: "Paciente muestra excelente evolución. Se mantiene dosis de Losartán 50mg."
    }
  ],

  doctors: [
    {
      id: "doc-1",
      name: "Dr. Carlos Valladares",
      specialty: "Cardiología",
      rating: "4.9 (124 reviews)",
      education: "Universidad Nacional Autónoma de Honduras (UNAH), Especialidad en Cardiología por el Instituto Nacional de Cardiología Ignacio Chávez (México).",
      languages: "Español, Inglés",
      avatar: "doctor_male_profile.png",
      cost: "L. 1,200.00",
      availability: ["09:00 AM", "09:30 AM", "11:00 AM", "03:30 PM"],
      bio: "Especialista en prevención de enfermedades cardiovasculares, control de hipertensión y arritmias con más de 12 años de trayectoria médica."
    },
    {
      id: "doc-2",
      name: "Dra. Sofía Murillo",
      specialty: "Dermatología",
      rating: "4.8 (98 reviews)",
      education: "Universidad de Costa Rica, Subespecialidad en Dermatología Estética y Oncológica.",
      languages: "Español, Inglés, Francés",
      avatar: "doctor_female_profile.png",
      cost: "L. 1,400.00",
      availability: ["01:30 PM", "02:00 PM", "04:00 PM"],
      bio: "Apasionada por la salud de la piel. Especialista en acné, rejuvenecimiento celular, mapeo de lunares y prevención de cáncer cutáneo."
    },
    {
      id: "doc-3",
      name: "Dr. Alejandro Ponce",
      specialty: "Pediatría",
      rating: "5.0 (210 reviews)",
      education: "UNAH, Especialidad en Pediatría por el Hospital Pediátrico de Barcelona.",
      languages: "Español",
      avatar: "doctor_male_profile_2.png",
      cost: "L. 1,000.00",
      availability: ["08:00 AM", "10:30 AM", "02:30 PM"],
      bio: "Dedicado al cuidado integral del niño y del adolescente, enfatizando la medicina preventiva y el desarrollo psicomotriz saludable."
    },
    {
      id: "doc-4",
      name: "Dra. Elena Zelaya",
      specialty: "Medicina Interna",
      rating: "4.7 (86 reviews)",
      education: "Universidad de El Salvador, Postgrado en Medicina Interna por Baylor College of Medicine (USA).",
      languages: "Español, Inglés",
      avatar: "doctor_female_profile_2.png",
      cost: "L. 1,100.00",
      availability: ["09:00 AM", "02:00 PM", "03:00 PM"],
      bio: "Diagnóstico y tratamiento de condiciones médicas complejas en adultos, control metabólico integral y chequeo clínico ejecutivo."
    }
  ],

  labResults: [
    {
      id: "lab-1",
      testName: "Perfil de Lípidos Completo",
      date: "2026-06-10",
      orderedBy: "Dr. Carlos Valladares",
      status: "Listo",
      encouragement: "¡Felicidades! Tus niveles de Colesterol HDL (bueno) se encuentran en el rango óptimo, protegiendo activamente tu corazón.",
      parameters: [
        { name: "Colesterol Total", value: 185, unit: "mg/dL", range: "Deseable < 200", status: "normal" },
        { name: "Colesterol HDL", value: 55, unit: "mg/dL", range: "Óptimo > 40", status: "normal" },
        { name: "Colesterol LDL", value: 110, unit: "mg/dL", range: "Óptimo < 130", status: "normal" },
        { name: "Triglicéridos", value: 145, unit: "mg/dL", range: "Deseable < 150", status: "normal" }
      ]
    },
    {
      id: "lab-2",
      testName: "Hemoglobina Glicosilada (HbA1c) y Glucosa",
      date: "2026-06-10",
      orderedBy: "Dr. Carlos Valladares",
      status: "Listo",
      encouragement: "Tu control de azúcar en sangre está en niveles excelentes. Mantén tu régimen dietético actual.",
      parameters: [
        { name: "Glucosa en Ayunas", value: 92, unit: "mg/dL", range: "Normal 70 - 100", status: "normal" },
        { name: "Hemoglobina Glicosilada (HbA1c)", value: 5.4, unit: "%", range: "Normal < 5.7%", status: "normal" }
      ]
    }
  ],

  imagingReports: [
    {
      id: "img-1",
      studyName: "Radiografía de Tórax (PA)",
      date: "2026-05-14",
      orderedBy: "Dr. Carlos Valladares",
      indication: "Dolor torácico atípico leve transitorio.",
      findings: "Campos pulmonares limpios, sin evidencia de infiltrados focales ni derrames. Silueta cardiaca dentro de límites normales. Estructura ósea torácica intacta.",
      conclusion: "Estudio radiológico de tórax de aspecto normal y negativo para patología cardiopulmonar aguda.",
      imagePath: "radiology_chest_xray.png",
      status: "Listo"
    }
  ],

  prescriptions: [
    {
      id: "rx-1",
      date: "2026-05-15",
      doctorName: "Dr. Carlos Valladares",
      specialty: "Cardiología",
      code: "RX-2026-9812",
      active: true,
      status: "Enviada a Farmacia",
      farmaciaDestino: "Honduras Medical Center Pharmacy",
      dateSent: "2026-05-15",
      refNum: "RX-2026-000098",
      medications: [
        { name: "Losartán Potásico", dosage: "50 mg", instructions: "1 tableta por vía oral cada mañana por 90 días.", quantity: 90 },
        { name: "Aspirina Prevent", dosage: "81 mg", instructions: "1 tableta al día después del almuerzo por 90 días.", quantity: 90 }
      ]
    }
  ],

  chats: {
    "doc-1": [
      { sender: "doctor", text: "Hola Andrés, ¿cómo has estado sintiendo la presión en las mañanas?", time: "2026-07-22 09:15 AM" },
      { sender: "patient", text: "Hola Dr. Valladares, me he estado sintiendo muy bien. Mi presión ha estado controlada.", time: "2026-07-22 09:30 AM" },
      { sender: "doctor", text: "Excelente reporte. Eso significa que la dosis de Losartán de 50mg es la correcta. Continúa así y nos vemos en la consulta del 28 de Julio.", time: "2026-07-22 09:35 AM" }
    ],
    "doc-2": [
      { sender: "doctor", text: "Andrés, recuerda aplicar el protector solar mineral fps 50 cada 4 horas en zonas expuestas.", time: "2026-07-21 02:40 PM" },
      { sender: "patient", text: "Entendido Dra. Murillo, lo he estado usando diario. La rojez del brazo ya desapareció.", time: "2026-07-21 03:00 PM" }
    ]
  },

  notifications: [
    { id: 1, title: "Recordatorio de Medicación", message: "Es hora de tomar tu tableta de Losartán Potásico (50 mg).", time: "Hace 15 min", read: false, type: "med" },
    { id: 2, title: "Estudios de Laboratorio Listos", message: "Tu Perfil Lipídico ya se encuentra disponible para su revisión.", time: "Ayer", read: true, type: "lab" },
    { id: 3, title: "Confirmación de Consulta", message: "Tu cita con el Dr. Carlos Valladares el 28 de Julio ha sido confirmada.", time: "Hace 2 días", read: true, type: "apt" }
  ],

  // Physician / Doctor Portal Specific Data
  doctorQueue: [
    { id: "q-1", patientName: "Andrés Mendoza Salgado", code: "HMC-98231-AM", age: 34, reason: "Chequeo Trimestral Control de Presión", status: "Esperando", time: "09:30 AM", telemetryStatus: "vital-ok" },
    { id: "q-2", patientName: "Carmen Elena Zelaya", code: "HMC-77218-CZ", age: 62, reason: "Dolor Torácico de Esfuerzo", status: "Triage Realizado", time: "10:15 AM", telemetryStatus: "vital-warning" },
    { id: "q-3", patientName: "Manuel de Jesús Cruz", code: "HMC-11029-MC", age: 48, reason: "Seguimiento Pos-Angioplastia", status: "En Espera", time: "11:00 AM", telemetryStatus: "vital-ok" },
    { id: "q-4", patientName: "René Orlando Aguilar", code: "HMC-34198-RA", age: 55, reason: "Lectura de Holter e Informe", status: "Completado", time: "08:30 AM", telemetryStatus: "vital-ok" }
  ],

  // Executive Dashboard / Admin Specific Data
  patientDailyReports: [
    {
      date: "2026-07-23",
      time: "08:15 AM",
      symptoms: ["Dolor de cabeza", "Fatiga"],
      painScale: 3,
      temperature: 36.8,
      heartRate: 75,
      bloodPressure: "125/82",
      oxygenSaturation: 98,
      bloodGlucose: 95,
      weight: 78.2,
      mood: "🙂 Bueno",
      medicationAdherence: "Sí",
      notes: "Sentí un leve dolor de cabeza al despertarme, pero disminuyó después de desayunar.",
      status: "Reportado por el Paciente"
    },
    {
      date: "2026-07-24",
      time: "09:00 AM",
      symptoms: ["Ninguno"],
      painScale: 0,
      temperature: 36.5,
      heartRate: 71,
      bloodPressure: "120/80",
      oxygenSaturation: 99,
      bloodGlucose: 90,
      weight: 78.0,
      mood: "😊 Excelente",
      medicationAdherence: "Sí",
      notes: "Día tranquilo, sin molestias físicas. Tomé los medicamentos a la hora correspondiente.",
      status: "Reportado por el Paciente"
    }
  ],

  adminStats: {
    kpis: {
      occupancy: { value: "84%", trend: "+3.2% vs mes anterior", status: "warning" },
      revenue: { value: "L. 1.84M", trend: "+14.8% vs meta diaria", status: "ok" },
      patientSatisfaction: { value: "4.82/5.0", trend: "+0.12 pts este mes", status: "ok" },
      activeDoctors: { value: "68", trend: "4 en turno de guardia", status: "ok" }
    },
    occupancyByWing: [
      { wing: "Cuidados Intensivos (UCI)", occupied: 12, capacity: 15, pct: 80, class: "warning-grid" },
      { wing: "Urgencias / Emergencias", occupied: 24, capacity: 25, pct: 96, class: "danger-grid" },
      { wing: "Maternidad y Neonatología", occupied: 18, capacity: 30, pct: 60, class: "success-grid" },
      { wing: "Hospitalización General - Torre B", occupied: 45, capacity: 50, pct: 90, class: "warning-grid" },
      { wing: "Pediatría Clínica", occupied: 8, capacity: 20, pct: 40, class: "success-grid" }
    ],
    billingClaims: [
      { id: "clm-101", patient: "Andrés Mendoza Salgado", insurance: "Ficohsa Seguros", department: "Cardiología", amount: "L. 8,400.00", status: "Pendiente", date: "2026-07-23" },
      { id: "clm-102", patient: "Estela Maria Bonilla", insurance: "Seguros Atlántida", department: "Ginecología", amount: "L. 12,350.00", status: "Aprobada", date: "2026-07-23" },
      { id: "clm-103", patient: "Francisco Roberto Suazo", insurance: "MAPFRE Honduras", department: "Traumatología", amount: "L. 34,200.00", status: "Pendiente", date: "2026-07-22" },
      { id: "clm-104", patient: "Xiomara Mercedes Castro", insurance: "Seguros Crefisa", department: "Urgencias", amount: "L. 5,120.00", status: "Rechazada", date: "2026-07-22" }
    ]
  }
};

// Export to window object for access in frontend JS scripts without module bundles
window.HMCDatabase = HMCDatabase;
