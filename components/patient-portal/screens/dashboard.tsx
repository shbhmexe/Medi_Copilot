"use client";

import { useEffect } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bell,
  Calendar,
  FileText,
  Plus,
  Sparkles,
  UserRound,
  Weight,
} from "lucide-react";
import { motion } from "framer-motion";
import { BookingPass } from "@/components/patient-portal/ui/booking-pass";
import { Badge, Button, Card } from "@/components/patient-portal/ui/base";
import {
  buildMedicalHistorySummary,
  formatAppointmentDateTime,
  getProfileCompletion,
  getUnreadNotificationCount,
  getUpcomingAppointment,
} from "@/lib/patient-portal";
import { useAuthStore, usePatientPortalStore } from "@/store";

interface PatientDashboardScreenProps {
  onNavigate: (screen: "records" | "booking" | "upload" | "profile" | "notifications") => void;
  onOpenChat: () => void;
}

function OverviewMetric({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Activity;
  tone: "primary" | "tertiary" | "warning" | "default";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    tertiary: "bg-tertiary/10 text-tertiary",
    warning: "bg-orange-500/10 text-orange-500",
    default: "bg-surface-low text-on-surface-variant",
  };

  return (
    <Card className="border border-outline-variant/20 rounded-[1.75rem] p-5 bg-surface-lowest space-y-4">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${tones[tone]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">{label}</p>
        <p className="mt-2 text-2xl font-extrabold text-on-surface">{value}</p>
        <p className="mt-1 text-xs text-on-surface-variant">{hint}</p>
      </div>
    </Card>
  );
}

export function PatientDashboardScreen({
  onNavigate,
  onOpenChat,
}: PatientDashboardScreenProps) {
  const { user } = useAuthStore();
  const { ensureProfile, profiles, appointments, records, notifications } = usePatientPortalStore();

  useEffect(() => {
    ensureProfile(user);
  }, [ensureProfile, user]);

  if (!user) return null;

  const profile = profiles[user.id];
  const appointment = getUpcomingAppointment(appointments, user.id);
  const patientRecords = records.filter((record) => record.userId === user.id);
  const unreadCount = getUnreadNotificationCount(notifications, user.id);
  const completion = getProfileCompletion(profile);
  const historySummary = profile ? buildMedicalHistorySummary(profile) : "";
  const latestRecord = patientRecords[0];

  return (
    <div className="pb-24 pt-6 px-5 lg:px-10 space-y-8 max-w-screen-2xl mx-auto">
      <header className="flex justify-between items-center lg:hidden">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/5">
            <span className="text-sm font-bold text-primary">
              {(profile?.fullName || user.name || "PT")
                .split(" ")
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest opacity-60">
              Patient Portal
            </p>
            <h1 className="text-xl font-headline font-extrabold text-on-surface">
              {profile?.fullName || user.name}
            </h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate("notifications")}
          className="relative p-2.5 bg-surface-lowest whisper-shadow rounded-2xl active:scale-90 transition-transform border border-outline-variant/30"
        >
          <Bell size={20} className="text-on-surface-variant" />
          {unreadCount > 0 ? (
            <span className="absolute top-2 right-2 min-w-5 h-5 px-1 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center border-2 border-surface-lowest">
              {unreadCount}
            </span>
          ) : null}
        </button>
      </header>

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative lg:hidden">
        <button className="w-full bg-destructive text-white h-14 rounded-2xl flex items-center justify-center gap-3 font-bold shadow-lg shadow-destructive/20 active:scale-[0.98] transition-transform sos-pulse">
          <AlertCircle size={24} />
          EMERGENCY HELP (SOS)
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            {appointment ? (
              <Card className="bg-gradient-to-br from-primary to-primary-container text-white p-6 relative overflow-hidden rounded-[2rem]">
                <div className="relative z-10 space-y-6">
                  <div className="flex justify-between items-start gap-6">
                    <div className="space-y-2">
                      <p className="text-white/75 text-[10px] font-bold uppercase tracking-[0.2em]">
                        Upcoming Appointment
                      </p>
                      <h3 className="text-2xl font-bold">{appointment.doctorName}</h3>
                      <p className="text-white/80 text-sm">
                        {appointment.specialty} · {appointment.hospitalName}
                      </p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl">
                      <Calendar size={24} />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-white/20 px-4 py-2 rounded-xl text-xs font-bold">
                      {formatAppointmentDateTime(appointment.appointmentDate, appointment.appointmentTime)}
                    </div>
                    <div className="bg-white/10 px-4 py-2 rounded-xl text-xs font-bold">
                      {appointment.visitType}
                    </div>
                    <div className="bg-white/10 px-4 py-2 rounded-xl text-xs font-bold">
                      Booking ID: {appointment.id}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="secondary"
                      size="md"
                      className="bg-white text-primary rounded-xl px-6 py-2 text-sm font-extrabold"
                      onClick={() => onNavigate("booking")}
                    >
                      View Booking Pass
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      className="bg-white/10 text-white rounded-xl px-6 py-2 text-sm font-bold border border-white/20"
                      onClick={() => onNavigate("notifications")}
                    >
                      {unreadCount > 0 ? `${unreadCount} Alerts` : "No New Alerts"}
                    </Button>
                  </div>
                </div>
                <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
              </Card>
            ) : (
              <Card className="rounded-[2rem] border border-primary/10 bg-primary/5 p-6 space-y-5">
                <Badge status="Info" className="w-fit">
                  No appointment booked
                </Badge>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-on-surface">Book your next doctor visit</h3>
                  <p className="text-sm text-on-surface-variant max-w-2xl">
                    Complete your health profile once, then book an appointment. The doctor will receive
                    your symptoms, past history, and a direct consultation route through your booking QR pass.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button className="rounded-2xl" onClick={() => onNavigate("profile")}>
                    <UserRound size={16} />
                    Complete Profile
                  </Button>
                  <Button variant="secondary" className="rounded-2xl" onClick={() => onNavigate("booking")}>
                    <Calendar size={16} />
                    Book Appointment
                  </Button>
                </div>
              </Card>
            )}
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Button
              variant="secondary"
              className="h-20 rounded-2xl shadow-sm border border-outline-variant/30 flex-col gap-1"
              onClick={() => onNavigate("upload")}
            >
              <Plus size={24} className="text-primary" />
              <span className="text-xs font-bold">Upload Report</span>
            </Button>
            <Button
              variant="secondary"
              className="h-20 rounded-2xl shadow-sm border border-outline-variant/30 flex-col gap-1"
              onClick={() => onNavigate("booking")}
            >
              <Calendar size={24} className="text-primary" />
              <span className="text-xs font-bold">Book Visit</span>
            </Button>
            <Button
              variant="secondary"
              className="h-20 rounded-2xl shadow-sm border border-outline-variant/30 flex-col gap-1 hidden sm:flex"
              onClick={() => onNavigate("records")}
            >
              <FileText size={24} className="text-primary" />
              <span className="text-xs font-bold">Records</span>
            </Button>
            <Button
              variant="secondary"
              className="h-20 rounded-2xl shadow-sm border border-outline-variant/30 flex-col gap-1 hidden sm:flex"
              onClick={() => onNavigate("profile")}
            >
              <Activity size={24} className="text-primary" />
              <span className="text-xs font-bold">Health Profile</span>
            </Button>
          </div>

          <section className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-headline font-bold">Health Overview</h2>
                <p className="text-sm text-on-surface-variant">Live values taken from your saved health profile</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("profile")}
                className="text-primary text-xs font-bold flex items-center gap-1"
              >
                Update <ArrowRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <OverviewMetric
                label="Blood Pressure"
                value={
                  profile?.bpSystolic && profile?.bpDiastolic
                    ? `${profile.bpSystolic}/${profile.bpDiastolic}`
                    : "Not Added"
                }
                hint="mmHg"
                icon={Activity}
                tone="primary"
              />
              <OverviewMetric
                label="Sugar"
                value={profile?.sugarMgDl ? profile.sugarMgDl : "Not Added"}
                hint="mg/dL"
                icon={Sparkles}
                tone="tertiary"
              />
              <OverviewMetric
                label="Weight"
                value={profile?.weightKg ? profile.weightKg : "Not Added"}
                hint="kg"
                icon={Weight}
                tone="warning"
              />
              <OverviewMetric
                label="Blood Group"
                value={profile?.bloodGroup || "Not Added"}
                hint={`Completion ${completion}%`}
                icon={UserRound}
                tone="default"
              />
            </div>
          </section>

          {appointment ? (
            <BookingPass
              compact
              title="Direct Doctor Check-in"
              subtitle="This QR/check-in pass opens your doctor consultation route."
              qrValue={appointment.qrValue}
              route={appointment.qrValue}
              routeLabel="Patient Detail Route"
            />
          ) : null}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="hidden lg:block">
            <button className="w-full bg-destructive text-white h-20 rounded-2xl flex items-center justify-center gap-3 font-bold shadow-lg shadow-destructive/20 active:scale-[0.98] transition-transform sos-pulse">
              <AlertCircle size={28} />
              SOS EMERGENCY
            </button>
          </motion.div>

          <Card className="bg-surface-lowest border border-primary/10 p-6 space-y-5 whisper-shadow rounded-[2rem]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                  <UserRound size={20} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-on-surface">Profile Snapshot</h4>
                  <p className="text-xs text-on-surface-variant">Real details shared with doctor on booking</p>
                </div>
              </div>
              <Badge status={completion >= 85 ? "Success" : "Attention"}>{completion}% Ready</Badge>
            </div>

            <div className="space-y-4 text-sm text-on-surface-variant">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">
                  Current Symptoms
                </p>
                <p className="leading-relaxed">
                  {profile?.currentSymptoms || "Add your current complaint and symptoms from Health Profile."}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">
                  Past History
                </p>
                <p className="leading-relaxed">
                  {historySummary || "Past history, surgeries, allergies, and medications are not complete yet."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-2xl bg-surface-low p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">Records</p>
                  <p className="mt-2 text-2xl font-extrabold text-on-surface">{patientRecords.length}</p>
                </div>
                <div className="rounded-2xl bg-surface-low p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">Alerts</p>
                  <p className="mt-2 text-2xl font-extrabold text-on-surface">{unreadCount}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-surface-lowest border border-outline-variant/20 p-6 space-y-5 rounded-[2rem]">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-on-surface">Latest Activity</h4>
              <button
                type="button"
                onClick={() => onNavigate("notifications")}
                className="text-xs font-bold text-primary"
              >
                View All
              </button>
            </div>

            <div className="space-y-4">
              {latestRecord ? (
                <div className="rounded-2xl bg-surface-low p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">Latest Record</p>
                  <p className="text-sm font-bold text-on-surface">{latestRecord.title}</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{latestRecord.summary}</p>
                </div>
              ) : (
                <div className="rounded-2xl bg-surface-low p-4 text-sm text-on-surface-variant">
                  No reports uploaded yet. Use Upload Report to add your first record.
                </div>
              )}

              <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Patient Code</p>
                <p className="text-lg font-extrabold text-on-surface">{profile?.patientCode || "Not generated"}</p>
                <p className="text-xs text-on-surface-variant">
                  This code is used to sync your booking directly to the doctor consultation screen.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onOpenChat}
        className="fixed bottom-24 right-6 w-16 h-16 bg-primary text-white rounded-2xl shadow-2xl flex flex-col items-center justify-center z-50 border-2 border-white/20"
      >
        <Sparkles size={24} className="animate-pulse" />
        <span className="text-[8px] font-bold uppercase tracking-tighter mt-1">Ask AI</span>
      </motion.button>
    </div>
  );
}
