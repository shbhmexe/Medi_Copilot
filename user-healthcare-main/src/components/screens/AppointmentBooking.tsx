import { Star, Users, Calendar as CalendarIcon, Clock, ChevronRight, Stethoscope, Brain, Heart, Eye, Baby, CheckCircle, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Card, Badge, Button } from '@/src/components/ui/Base';
import { Doctor } from '@/src/types';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

const SPECIALTIES = [
  { name: 'General', icon: Stethoscope, color: 'bg-blue-100 text-blue-600' },
  { name: 'Cardiology', icon: Heart, color: 'bg-red-100 text-red-600' },
  { name: 'Neurology', icon: Brain, color: 'bg-purple-100 text-purple-600' },
  { name: 'Pediatrics', icon: Baby, color: 'bg-green-100 text-green-600' },
  { name: 'Ophthalmology', icon: Eye, color: 'bg-orange-100 text-orange-600' },
];

// Real doctors from the codex backend (match mock-users.ts IDs)
const REAL_DOCTORS: Array<Doctor & { doctorId: string; hospitalName: string }> = [
  {
    id: 'mock-doctor-uuid',
    doctorId: 'mock-doctor-uuid',
    name: 'Dr. Meera Iyer',
    specialty: 'Internal Medicine',
    rating: 4.9,
    experience: '10 years',
    patientsTreated: '3.1k+',
    nextAvailable: 'Tomorrow, 10:30 AM',
    image: 'https://i.pravatar.cc/150?u=meera',
    fee: 'Free',
    hospitalName: 'Evergreen Wellness Hospital',
  },
  {
    id: 'mock-admin-uuid',
    doctorId: 'mock-admin-uuid',
    name: 'Dr. Admin',
    specialty: 'General Medicine',
    rating: 4.8,
    experience: '12 years',
    patientsTreated: '2.5k+',
    nextAvailable: 'Today, 4:00 PM',
    image: 'https://i.pravatar.cc/150?u=admin',
    fee: 'Free',
    hospitalName: 'Evergreen Wellness Hospital',
  },
];

// Patient info — in real flow this comes from auth. Using mock for dev.
const PATIENT_INFO = {
  patientCode: 'PAT-USER001',
  patientName: 'Aakash Rana',
  patientAge: 26,
  patientGender: 'Male',
};

// Target Next.js backend URL
const CODEX_API_URL = 'http://localhost:3000';

export const AppointmentBooking = ({ isModal = false }: { isModal?: boolean }) => {
  const [selectedSpecialty, setSelectedSpecialty] = useState('General');
  const [step, setStep] = useState<'list' | 'form' | 'success'>('list');
  const [selectedDoctor, setSelectedDoctor] = useState<(typeof REAL_DOCTORS)[0] | null>(null);

  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectDoctor = (doc: (typeof REAL_DOCTORS)[0]) => {
    setSelectedDoctor(doc);
    setStep('form');
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedDoctor) return;
    if (!reason.trim() || !symptoms.trim() || !appointmentDate || !appointmentTime) {
      setError('Please fill in all fields before confirming.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const bookingId = `BKG-${Date.now().toString(36).toUpperCase()}`;
    const patientCode = PATIENT_INFO.patientCode;

    const payload = {
      doctorId: selectedDoctor.doctorId,
      doctorName: selectedDoctor.name,
      bookingId,
      patientCode,
      patientName: PATIENT_INFO.patientName,
      patientAge: PATIENT_INFO.patientAge,
      patientGender: PATIENT_INFO.patientGender,
      message: `New booking request from ${PATIENT_INFO.patientName} assigned to you.`,
      reason: reason.trim(),
      symptoms: symptoms.trim(),
      appointmentDate,
      appointmentTime,
      specialty: selectedDoctor.specialty,
      hospitalName: selectedDoctor.hospitalName,
      handoffRoute: `/api/patient-pass?patientCode=${patientCode}`,
      consultationRoute: `/consultation/${patientCode}`,
      patientRecord: {
        id: patientCode,
        name: PATIENT_INFO.patientName,
        age: PATIENT_INFO.patientAge,
        sex: PATIENT_INFO.patientGender,
        summary: `${PATIENT_INFO.patientAge}${PATIENT_INFO.patientGender === 'Male' ? 'M' : 'F'} presenting with: ${reason.trim()}. Symptoms: ${symptoms.trim()}.`,
        clinicalFields: {},
        modelResult: null,
        xrayResult: null,
      },
    };

    try {
      const response = await fetch(`${CODEX_API_URL}/api/doctor-inbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as any)?.error || `Server error ${response.status}`);
      }

      setStep('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error. Make sure the clinic portal is running.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep('list');
    setSelectedDoctor(null);
    setReason('');
    setSymptoms('');
    setAppointmentDate('');
    setAppointmentTime('');
    setError(null);
  };

  return (
    <div className={cn(
      "space-y-8 w-full",
      !isModal && "pb-24 pt-6 px-5 lg:px-10 max-w-screen-2xl mx-auto"
    )}>
      {!isModal && (
        <header className="space-y-1">
          <h1 className="text-2xl font-headline font-extrabold">Book Appointment</h1>
          <p className="text-sm text-on-surface-variant">Find the best specialists and book your visit in seconds</p>
        </header>
      )}

      <AnimatePresence mode="wait">
        {/* STEP 1: Doctor List */}
        {step === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left Sidebar - Specialties */}
            <aside className="lg:col-span-3 space-y-4">
              <h2 className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest px-1">Specialties</h2>
              <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 no-scrollbar">
                {SPECIALTIES.map((s) => {
                  const Icon = s.icon;
                  const isActive = selectedSpecialty === s.name;
                  return (
                    <button
                      key={s.name}
                      onClick={() => setSelectedSpecialty(s.name)}
                      className={cn(
                        "flex lg:flex-row flex-col items-center gap-3 shrink-0 p-3 lg:p-3.5 rounded-2xl transition-all duration-300 group w-full lg:text-left",
                        isActive ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-surface-low text-on-surface-variant hover:bg-surface-high"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 lg:w-9 lg:h-9 rounded-xl flex items-center justify-center transition-all",
                        isActive ? "bg-white/20" : "bg-surface-lowest text-primary"
                      )}>
                        <Icon size={isActive ? 22 : 18} />
                      </div>
                      <span className={cn("text-[11px] font-bold", isActive ? "text-white" : "text-on-surface-variant")}>
                        {s.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Main Content - Doctor List */}
            <section className="lg:col-span-9 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Available Doctors</h2>
                <span className="text-[10px] font-bold text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                  {REAL_DOCTORS.length} Specialists Found
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {REAL_DOCTORS.map((doc) => (
                  <motion.div key={doc.id} whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}>
                    <Card className="p-4 space-y-4 cursor-pointer group border border-outline-variant/20 hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5 rounded-[2rem]">
                      <div className="flex gap-4">
                        <div className="relative shrink-0">
                          <img
                            src={doc.image}
                            alt={doc.name}
                            className="w-20 h-20 rounded-2xl object-cover shadow-md"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute -bottom-2 -right-2 bg-white p-1 rounded-lg shadow-sm">
                            <div className="flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded-md text-orange-600">
                              <Star size={10} fill="currentColor" />
                              <span className="text-[10px] font-bold">{doc.rating}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <h3 className="text-base font-bold truncate group-hover:text-primary transition-colors">{doc.name}</h3>
                          <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1">{doc.specialty}</p>
                          <p className="text-[10px] text-on-surface-variant/50 mb-2">{doc.hospitalName}</p>
                          <div className="flex flex-wrap gap-2">
                            <div className="flex items-center gap-1.5 bg-surface-low px-2 py-1 rounded-lg text-[10px] font-bold text-on-surface-variant/70">
                              <CalendarIcon size={12} className="text-primary" />
                              {doc.experience} exp
                            </div>
                            <div className="flex items-center gap-1.5 bg-surface-low px-2 py-1 rounded-lg text-[10px] font-bold text-on-surface-variant/70">
                              <Users size={12} className="text-primary" />
                              {doc.patientsTreated} Patients
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Next Available</p>
                          <p className="text-[11px] font-bold text-tertiary flex items-center gap-1.5">
                            <Clock size={12} /> {doc.nextAvailable}
                          </p>
                        </div>
                        <Button size="sm" className="rounded-xl px-4 shadow-lg shadow-primary/10" onClick={() => handleSelectDoctor(doc)}>
                          Book Now <ChevronRight size={14} className="ml-1" />
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>
          </motion.div>
        )}

        {/* STEP 2: Booking Form */}
        {step === 'form' && selectedDoctor && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:text-primary transition-colors"
            >
              <ArrowLeft size={16} /> Back to Doctors
            </button>

            <Card className="p-6 space-y-6 rounded-[2rem] border border-outline-variant/20">
              {/* Doctor Summary */}
              <div className="flex items-center gap-4 pb-5 border-b border-outline-variant/20">
                <img src={selectedDoctor.image} alt={selectedDoctor.name} className="w-16 h-16 rounded-2xl object-cover shadow-md" referrerPolicy="no-referrer" />
                <div>
                  <h3 className="text-base font-bold">{selectedDoctor.name}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{selectedDoctor.specialty}</p>
                  <p className="text-[10px] text-on-surface-variant/50">{selectedDoctor.hospitalName}</p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block mb-2">Reason for Visit *</label>
                  <input
                    type="text"
                    placeholder="e.g. Persistent fever for 3 days"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-surface-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-semibold text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block mb-2">Symptoms *</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. High fever, body aches, dry cough, fatigue..."
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    className="w-full bg-surface-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-semibold text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block mb-2">Date *</label>
                    <input
                      type="date"
                      value={appointmentDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full bg-surface-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-semibold text-on-surface focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block mb-2">Time *</label>
                    <select
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                      className="w-full bg-surface-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-semibold text-on-surface focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                    >
                      <option value="">Select time</option>
                      {['09:00 AM', '10:00 AM', '10:30 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm font-semibold text-red-700">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}

              <Button
                className="w-full h-12 rounded-xl shadow-lg shadow-primary/10 text-xs font-bold uppercase tracking-widest"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Confirming booking...</span>
                ) : (
                  'Confirm Appointment'
                )}
              </Button>
            </Card>
          </motion.div>
        )}

        {/* STEP 3: Success */}
        {step === 'success' && selectedDoctor && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-md mx-auto text-center space-y-6 py-10"
          >
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={40} className="text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-headline">Appointment Confirmed!</h2>
              <p className="text-sm text-on-surface-variant">
                Your request has been sent to <span className="font-bold text-on-surface">{selectedDoctor.name}</span>.
                The doctor will receive a notification and review your case.
              </p>
            </div>
            <div className="bg-surface-low rounded-2xl p-5 text-left space-y-3 border border-outline-variant/20">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant font-medium">Doctor</span>
                <span className="font-bold">{selectedDoctor.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant font-medium">Date</span>
                <span className="font-bold">{appointmentDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant font-medium">Time</span>
                <span className="font-bold">{appointmentTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant font-medium">Reason</span>
                <span className="font-bold text-right max-w-[60%]">{reason}</span>
              </div>
            </div>
            <Button className="w-full rounded-xl" onClick={handleReset}>
              Book Another Appointment
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
