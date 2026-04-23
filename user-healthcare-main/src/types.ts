export type Screen = 'landing' | 'home' | 'records' | 'booking' | 'meds' | 'notifications' | 'report-detail' | 'profile' | 'upload' | 'settings' | 'help';

export interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  time: string;
  date: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  image?: string;
}

export interface HealthMetric {
  label: string;
  value: string;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

export interface MedicalRecord {
  id: string;
  title: string;
  date: string;
  doctor: string;
  type: 'Report' | 'Prescription';
  status: 'Normal' | 'Attention' | 'Urgent';
}

export interface Biomarker {
  name: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  status: 'Low' | 'Normal' | 'High';
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string;
  period: 'Morning' | 'Afternoon' | 'Night';
  tags: string[];
  taken: boolean;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  experience: string;
  patientsTreated: string;
  nextAvailable: string;
  image: string;
  fee: string;
}
