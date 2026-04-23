import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthUser } from "@/types";

interface AuthStore {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setUser: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name: "medcopilot-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ---- Visit / Consultation State ----
export interface DiagnosisRecord {
  name?: string;
  diagnosis_name?: string;
  code?: string;
  icd11_code?: string;
  prob?: number;
  probability_score?: number;
  tags?: string[];
  reasoning?: string;
  [key: string]: unknown;
}

export interface InteractionRecord {
  drug_a?: string;
  drug_b?: string;
  severity?: string;
  mechanism?: string;
  clinical_significance?: string;
  alternative_suggested?: string | null;
  alternative?: string | null;
  [key: string]: unknown;
}

interface ConsultationStore {
  visitId: string | null;
  patientId: string | null;
  activeTab: "diagnosis" | "drug-safety" | "soap";
  isAnalyzing: boolean;
  isGeneratingSoap: boolean;
  diagnoses: DiagnosisRecord[];
  interactions: InteractionRecord[];
  soapNote: { subjective: string; objective: string; assessment: string; plan: string };
  thinkingSteps: string[];
  engineStability: number;
  workflowLogs: { msg: string; type: "ok" | "busy" | "error" }[];
  setVisit: (visitId: string, patientId: string) => void;

  setActiveTab: (tab: ConsultationStore["activeTab"]) => void;
  setAnalyzing: (v: boolean) => void;
  setGeneratingSoap: (v: boolean) => void;
  addDiagnosis: (d: DiagnosisRecord) => void;
  setInteractions: (interactions: InteractionRecord[]) => void;
  updateSoapField: (field: keyof ConsultationStore["soapNote"], content: string) => void;
  addThinkingStep: (msg: string) => void;
  setEngineStability: (v: number) => void;
  addWorkflowLog: (log: { msg: string; type: "ok" | "busy" | "error" }) => void;
  resetAnalysis: () => void;
}

export const useConsultationStore = create<ConsultationStore>()((set) => ({
  visitId: null,
  patientId: null,
  activeTab: "diagnosis",
  isAnalyzing: false,
  isGeneratingSoap: false,
  diagnoses: [],
  interactions: [],
  soapNote: { subjective: "", objective: "", assessment: "", plan: "" },
  thinkingSteps: [],
  engineStability: 0,
  workflowLogs: [],
  setVisit: (visitId, patientId) => set({ visitId, patientId }),

  setActiveTab: (activeTab) => set({ activeTab }),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setGeneratingSoap: (isGeneratingSoap) => set({ isGeneratingSoap }),
  addDiagnosis: (d) => set((state) => ({ diagnoses: [...state.diagnoses, d] })),
  setInteractions: (interactions) => set({ interactions }),
  updateSoapField: (field, content) => set((state) => ({ soapNote: { ...state.soapNote, [field]: content } })),
  addThinkingStep: (msg) => set((state) => ({ thinkingSteps: [...state.thinkingSteps, msg] })),
  setEngineStability: (engineStability) => set({ engineStability }),
  addWorkflowLog: (log) => set((state) => ({ workflowLogs: [log, ...state.workflowLogs].slice(0, 5) })),
  resetAnalysis: () => set({ 
    diagnoses: [], 
    interactions: [], 
    soapNote: { subjective: "", objective: "", assessment: "", plan: "" }, 
    thinkingSteps: [], 
    isAnalyzing: false,
    engineStability: 0,
    workflowLogs: []
  }),
}));

// ---- UI / Global State ----
interface UIStore {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  toggleSidebar: () => void;
  notifications: { id: string; type: "info" | "warning" | "error" | "success"; message: string }[];
  addNotification: (n: Omit<UIStore["notifications"][0], "id">) => void;
  removeNotification: (id: string) => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  notifications: [],
  addNotification: (n) => set((s) => ({ notifications: [...s.notifications, { ...n, id: crypto.randomUUID() }] })),
  removeNotification: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}));

// ---- Patient / Queue State (Persisted) ----
export interface PatientRecord {
  id: string;
  clinicId?: string;
  name: string;
  age: number;
  gender: string;
  initials: string;
  complaint: string;
  status: string;
  isUrgent: boolean;
  wait: string;
  rawText?: string;
  clinicalFields?: {
    chief_complaint?: string;
    medical_history?: string;
    current_medications?: string;
    vitals?: Record<string, string>;
    document_excerpt?: string;
  } | null;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  assignedDoctorSpecialty?: string;
  assignedDoctorEmail?: string;
  bookingId?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  modelResult?: {
    predictions?: {
      disease: string;
      probability: number;
      icd11_code: string;
    }[];
    matched_keywords?: Record<string, string[]>;
    extracted_text?: string;
  } | null;
  xrayResult?: any | null;
}

interface PatientStore {
  patients: PatientRecord[];
  addPatient: (p: PatientRecord) => void;
  removePatient: (id: string) => void;
  updatePatient: (id: string, updater: Partial<PatientRecord> | ((patient: PatientRecord) => PatientRecord)) => void;
}

export const usePatientStore = create<PatientStore>()(
  persist(
    (set) => ({
      patients: [],
      addPatient: (p) => set((state) => {
        // Prevent duplicates
        if (state.patients.find(x => x.id === p.id)) return state;
        return { patients: [p, ...state.patients] };
      }),
      removePatient: (id) => set((state) => ({ patients: state.patients.filter(p => p.id !== id) })),
      updatePatient: (id, updater) =>
        set((state) => ({
          patients: state.patients.map((patient) => {
            if (patient.id !== id) return patient;
            return typeof updater === "function" ? updater(patient) : { ...patient, ...updater };
          }),
        })),
    }),
    {
      name: "medcopilot-patients",
    }
  )
);

// ---- Doctor Inbox State (Persisted) ----
export interface DoctorInboxItem {
  id: string;
  doctorId: string;
  doctorName: string;
  clinicId?: string;
  bookingId: string;
  patientCode: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  message: string;
  reason: string;
  symptoms: string;
  appointmentDate: string;
  appointmentTime: string;
  specialty: string;
  hospitalName: string;
  handoffRoute: string;
  consultationRoute: string;
  patientRecord: PatientRecord;
  createdAt: string;
  isRead: boolean;
  status: "pending" | "added";
}

interface DoctorInboxStore {
  items: DoctorInboxItem[];
  addBookingRequest: (
    item: Omit<DoctorInboxItem, "id" | "createdAt" | "isRead" | "status">
  ) => DoctorInboxItem;
  updateItem: (id: string, updates: Partial<DoctorInboxItem>) => void;
  markItemRead: (id: string) => void;
  markAllReadForDoctor: (doctorId: string) => void;
  dismissItem: (id: string) => void;
}

export const useDoctorInboxStore = create<DoctorInboxStore>()(
  persist(
    (set) => ({
      items: [],
      addBookingRequest: (item) => {
        const nextItem: DoctorInboxItem = {
          ...item,
          id: createPortalId("DIN"),
          createdAt: new Date().toISOString(),
          isRead: false,
          status: "pending",
        };

        set((state) => ({
          items: [nextItem, ...state.items],
        }));

        return nextItem;
      },
      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
        })),
      markItemRead: (id) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
        })),
      markAllReadForDoctor: (doctorId) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.doctorId === doctorId ? { ...item, isRead: true } : item
          ),
        })),
      dismissItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
    }),
    {
      name: "medcopilot-doctor-inbox",
    }
  )
);

// ---- Patient Portal State (Persisted) ----
export interface PatientPortalProfile {
  userId: string;
  patientCode: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  age: string;
  gender: string;
  bloodGroup: string;
  address: string;
  occupation: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  chronicConditions: string;
  allergies: string;
  currentMedications: string;
  pastHistory: string;
  surgicalHistory: string;
  familyHistory: string;
  lifestyleNotes: string;
  currentSymptoms: string;
  insuranceId: string;
  bpSystolic: string;
  bpDiastolic: string;
  sugarMgDl: string;
  weightKg: string;
  heightCm: string;
  pulse: string;
  spo2: string;
  temperatureF: string;
  updatedAt: string;
}

export interface PatientPortalRecord {
  id: string;
  userId: string;
  title: string;
  recordType: "Report" | "Prescription" | "Scan" | "Visit Note";
  doctorName: string;
  hospitalName: string;
  status: "Normal" | "Attention" | "Urgent";
  fileName: string;
  summary: string;
  notes: string;
  uploadedAt: string;
}

export interface PatientPortalAppointment {
  id: string;
  userId: string;
  patientCode: string;
  clinicId?: string;
  doctorId?: string;
  doctorName: string;
  specialty: string;
  hospitalName: string;
  appointmentDate: string;
  appointmentTime: string;
  visitType: "In-person" | "Video" | "Follow-up";
  reason: string;
  symptoms: string;
  status: "Booked" | "Completed" | "Cancelled";
  doctorRoute: string;
  doctorEmail?: string;
  doctorRole?: "doctor" | "admin";
  qrValue: string;
  createdAt: string;
}

export interface PatientPortalNotification {
  id: string;
  userId: string;
  title: string;
  desc: string;
  time: string;
  type: "success" | "info" | "urgent";
  isRead: boolean;
}

export interface PatientPortalPreferences {
  appointmentReminders: boolean;
  reportAlerts: boolean;
  generalNotifications: boolean;
  aiSuggestions: boolean;
  shareHistoryWithDoctor: boolean;
}

interface PatientPortalStore {
  profiles: Record<string, PatientPortalProfile>;
  records: PatientPortalRecord[];
  appointments: PatientPortalAppointment[];
  notifications: PatientPortalNotification[];
  preferences: Record<string, PatientPortalPreferences>;
  ensureProfile: (user: AuthUser | null) => PatientPortalProfile | null;
  saveProfile: (userId: string, updates: Partial<PatientPortalProfile>) => void;
  addRecord: (
    record: Omit<PatientPortalRecord, "id" | "uploadedAt">
  ) => PatientPortalRecord;
  addAppointment: (
    appointment: Omit<PatientPortalAppointment, "id" | "createdAt">
  ) => PatientPortalAppointment;
  updateAppointment: (
    id: string,
    updates: Partial<PatientPortalAppointment>
  ) => void;
  addNotification: (
    notification: Omit<PatientPortalNotification, "id" | "time" | "isRead">
  ) => PatientPortalNotification;
  dismissNotification: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  updatePreferences: (userId: string, updates: Partial<PatientPortalPreferences>) => void;
}

function createPortalId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function createDefaultPortalProfile(user: AuthUser): PatientPortalProfile {
  const isMockPatient = user.id === "mock-user-uuid" || user.email === "user@medcopilot.com";
  
  if (isMockPatient) {
    return {
      userId: user.id,
      patientCode: "PAT-19CBB47C",
      fullName: "Aakash Rana",
      email: "user@medcopilot.com",
      phone: "9876543210",
      dateOfBirth: "1998-01-01",
      age: "28",
      gender: "Male",
      bloodGroup: "B+",
      address: "H.No 123, Sector 45, Gurgaon, Haryana, India",
      occupation: "Student",
      emergencyContactName: "Raj Rana",
      emergencyContactPhone: "9988776655",
      emergencyContactRelation: "Brother",
      chronicConditions: "None",
      allergies: "Dust, Pollen",
      currentMedications: "Multivitamins once daily",
      pastHistory: "Mild seasonal allergies, no prior surgeries.",
      surgicalHistory: "None",
      familyHistory: "No major hereditary conditions.",
      lifestyleNotes: "Active lifestyle, regular exercise, non-smoker.",
      currentSymptoms: "Occasional mild sneezing due to weather change.",
      insuranceId: "IND-88223344",
      bpSystolic: "120",
      bpDiastolic: "80",
      sugarMgDl: "98",
      weightKg: "72.5",
      heightCm: "172",
      pulse: "76",
      spo2: "98",
      temperatureF: "98.4",
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    userId: user.id,
    patientCode: createPortalId("PAT"),
    fullName: user.name || "",
    email: user.email || "",
    phone: "",
    dateOfBirth: "",
    age: "",
    gender: "",
    bloodGroup: "",
    address: "",
    occupation: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
    chronicConditions: "",
    allergies: "",
    currentMedications: "",
    pastHistory: "",
    surgicalHistory: "",
    familyHistory: "",
    lifestyleNotes: "",
    currentSymptoms: "",
    insuranceId: "",
    bpSystolic: "",
    bpDiastolic: "",
    sugarMgDl: "",
    weightKg: "",
    heightCm: "",
    pulse: "",
    spo2: "",
    temperatureF: "",
    updatedAt: new Date().toISOString(),
  };
}

function createDefaultPortalPreferences(): PatientPortalPreferences {
  return {
    appointmentReminders: true,
    reportAlerts: true,
    generalNotifications: true,
    aiSuggestions: true,
    shareHistoryWithDoctor: true,
  };
}

export const usePatientPortalStore = create<PatientPortalStore>()(
  persist(
    (set, get) => ({
      profiles: {},
      records: [],
      appointments: [],
      notifications: [],
      preferences: {},
      ensureProfile: (user) => {
        if (!user) return null;

        const existingProfile = get().profiles[user.id];
        if (existingProfile) {
          const syncedProfile = {
            ...existingProfile,
            fullName: existingProfile.fullName || user.name || "",
            email: existingProfile.email || user.email || "",
          };

          if (
            syncedProfile.fullName !== existingProfile.fullName ||
            syncedProfile.email !== existingProfile.email
          ) {
            set((state) => ({
              profiles: {
                ...state.profiles,
                [user.id]: {
                  ...syncedProfile,
                  updatedAt: new Date().toISOString(),
                },
              },
            }));
          }

          return syncedProfile;
        }

        const nextProfile = createDefaultPortalProfile(user);
        set((state) => ({
          profiles: {
            ...state.profiles,
            [user.id]: nextProfile,
          },
          preferences: {
            ...state.preferences,
            [user.id]: state.preferences[user.id] || createDefaultPortalPreferences(),
          },
        }));
        return nextProfile;
      },
      saveProfile: (userId, updates) =>
        set((state) => ({
          profiles: {
            ...state.profiles,
            [userId]: {
              ...(state.profiles[userId] || {
                ...createDefaultPortalProfile({
                  id: userId,
                  clinic_id: "",
                  name: "",
                  email: "",
                  role: "user",
                }),
              }),
              ...updates,
              updatedAt: new Date().toISOString(),
            },
          },
        })),
      addRecord: (record) => {
        const nextRecord: PatientPortalRecord = {
          ...record,
          id: createPortalId("REC"),
          uploadedAt: new Date().toISOString(),
        };

        set((state) => ({
          records: [nextRecord, ...state.records],
        }));

        return nextRecord;
      },
      addAppointment: (appointment) => {
        const nextAppointment: PatientPortalAppointment = {
          ...appointment,
          id: createPortalId("BK"),
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          appointments: [nextAppointment, ...state.appointments],
        }));

        return nextAppointment;
      },
      updateAppointment: (id, updates) =>
        set((state) => ({
          appointments: state.appointments.map((appointment) =>
            appointment.id === id ? { ...appointment, ...updates } : appointment
          ),
        })),
      addNotification: (notification) => {
        const nextNotification: PatientPortalNotification = {
          ...notification,
          id: createPortalId("NTF"),
          time: new Date().toISOString(),
          isRead: false,
        };

        set((state) => ({
          notifications: [nextNotification, ...state.notifications],
        }));

        return nextNotification;
      },
      dismissNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((notification) => notification.id !== id),
        })),
      markAllNotificationsRead: (userId) =>
        set((state) => ({
          notifications: state.notifications.map((notification) =>
            notification.userId === userId ? { ...notification, isRead: true } : notification
          ),
        })),
      updatePreferences: (userId, updates) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            [userId]: {
              ...(state.preferences[userId] || createDefaultPortalPreferences()),
              ...updates,
            },
          },
        })),
    }),
    {
      name: "medcopilot-patient-portal",
    }
  )
);
