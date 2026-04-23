"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CalendarDays, ClipboardPlus, QrCode, ShieldCheck, Stethoscope } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookingPass } from "@/components/patient-portal/ui/booking-pass";
import { Button, Card } from "@/components/patient-portal/ui/base";
import { runAuthorizedRequest } from "@/lib/client-auth";
import {
  buildConsultationSeedPayload,
  buildDoctorPassRecord,
  buildMedicalHistorySummary,
  buildPatientPassDetailRoute,
  buildPatientPassRoute,
  buildPortalPatientRecord,
  formatAppointmentDateTime,
  getMissingProfileFields,
  getProfileCompletion,
  getUpcomingAppointment,
} from "@/lib/patient-portal";
import { buildMockClinicianProfiles, isMockClinicId, MOCK_PATIENT_ID } from "@/lib/mock-users";
import { useAuthStore, usePatientPortalStore, usePatientStore, type PatientPortalAppointment } from "@/store";
import { cn } from "@/lib/utils";
import type { ClinicianProfile } from "@/types";

type BookingForm = {
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  visitType: PatientPortalAppointment["visitType"];
  reason: string;
  symptoms: string;
};

const INITIAL_FORM: BookingForm = {
  doctorId: "",
  appointmentDate: "",
  appointmentTime: "",
  visitType: "In-person",
  reason: "",
  symptoms: "",
};

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">
        {label}
      </span>
      {children}
    </label>
  );
}

export function AppointmentBookingScreen({ isModal = false }: { isModal?: boolean }) {
  const router = useRouter();
  const { user, accessToken, setUser, clearAuth } = useAuthStore();
  const { ensureProfile, profiles, addAppointment, updateAppointment, addNotification, appointments } = usePatientPortalStore();
  const { patients } = usePatientStore();
  const [form, setForm] = useState<BookingForm>(INITIAL_FORM);
  const [bookedAppointment, setBookedAppointment] = useState<PatientPortalAppointment | null>(null);
  const [clinicians, setClinicians] = useState<ClinicianProfile[]>([]);
  const [isLoadingClinicians, setIsLoadingClinicians] = useState(true);

  useEffect(() => {
    ensureProfile(user);
  }, [ensureProfile, user]);

  useEffect(() => {
    let isActive = true;
    const fallbackClinicians =
      user && (isMockClinicId(user.clinic_id) || user.id === MOCK_PATIENT_ID)
        ? buildMockClinicianProfiles()
        : [];

    const requestHeaders: HeadersInit = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {};

    fetch("/api/doctors", { credentials: "include", headers: requestHeaders })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(payload?.error?.message || "Could not load clinician profiles");
        }

        return response.json() as Promise<{ data?: ClinicianProfile[] }>;
      })
      .then((payload) => {
        if (!isActive) return;

        const items = payload.data?.length ? payload.data : fallbackClinicians;
        setClinicians(items);
        setForm((previous) => ({
          ...previous,
          doctorId: previous.doctorId || items[0]?.id || "",
        }));
      })
      .catch((error) => {
        console.warn("[Booking] Could not load clinicians:", error);
        if (isActive) {
          if (fallbackClinicians.length > 0) {
            setClinicians(fallbackClinicians);
            setForm((previous) => ({
              ...previous,
              doctorId: previous.doctorId || fallbackClinicians[0]?.id || "",
            }));
          } else {
            toast.error("Doctor profiles could not be loaded.");
          }
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingClinicians(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [accessToken, user]);

  if (!user) return null;

  const profile = profiles[user.id];
  if (!profile) return null;

  const completion = getProfileCompletion(profile);
  const missingFields = getMissingProfileFields(profile);
  const profileReady =
    Boolean(profile.fullName && profile.phone && profile.age && profile.gender && profile.currentSymptoms) &&
    completion >= 55;
  const existingAppointment = getUpcomingAppointment(appointments, user.id);
  const historySummary = buildMedicalHistorySummary(profile);
  const selectedDoctor = clinicians.find((doctor) => doctor.id === form.doctorId) || null;

  const updateForm = <K extends keyof BookingForm>(key: K, value: BookingForm[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const syncAppointmentToDoctorInbox = useCallback(
    async (appointment: PatientPortalAppointment) => {
      const existingPatient = patients.find((patient) => patient.id === profile.patientCode);
      const doctorPatientRecord = buildPortalPatientRecord(profile, appointment, existingPatient);
      const handoffRoute = buildPatientPassRoute(
        profile.patientCode,
        typeof window !== "undefined" ? window.location.origin : undefined
      );

      const response = await runAuthorizedRequest("/api/doctor-inbox", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctorId: appointment.doctorId,
          doctorName: appointment.doctorName,
          clinicId: appointment.clinicId || user.clinic_id,
          bookingId: appointment.id,
          patientCode: profile.patientCode,
          patientName: profile.fullName || "Patient",
          patientAge: Number(profile.age) || 0,
          patientGender: profile.gender || "Other",
          message: `${profile.fullName || "A patient"} booked an appointment with ${appointment.doctorName}. Review the handoff and add to patients when ready.`,
          reason: appointment.reason,
          symptoms: appointment.symptoms,
          appointmentDate: appointment.appointmentDate,
          appointmentTime: appointment.appointmentTime,
          specialty: appointment.specialty,
          hospitalName: appointment.hospitalName,
          handoffRoute,
          consultationRoute: appointment.doctorRoute,
          patientRecord: doctorPatientRecord,
        }),
      }, { accessToken, user, setUser, clearAuth });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: { message?: string } | string } | null;
        const errorMessage =
          typeof errorPayload?.error === "string"
            ? errorPayload.error
            : errorPayload?.error?.message || "Could not notify doctor";
        throw new Error(errorMessage);
      }
    },
    [accessToken, clearAuth, patients, profile, setUser, user]
  );

  // Removed automatic sync useEffect to prevent double POST requests and API spam on re-render.

  const handleBookAppointment = async () => {
    if (!profileReady) {
      toast.error("Complete your health profile before booking.");
      router.push("/profile");
      return;
    }

    const requiredFields: Array<keyof BookingForm> = [
      "appointmentDate",
      "appointmentTime",
      "reason",
      "symptoms",
    ];

    const missingBookingFields = requiredFields.filter((field) => !form[field].trim());
    if (!selectedDoctor || missingBookingFields.length > 0) {
      toast.error("Fill all appointment details before booking.");
      return;
    }

    const doctorRoute =
      typeof window !== "undefined"
        ? `${window.location.origin}/consultation/${profile.patientCode}`
        : `/consultation/${profile.patientCode}`;
    const handoffRoute = buildPatientPassRoute(
      profile.patientCode,
      typeof window !== "undefined" ? window.location.origin : undefined
    );
    const detailRoute = buildPatientPassDetailRoute(
      profile.patientCode,
      typeof window !== "undefined" ? window.location.origin : undefined
    );
    const nextAppointment = addAppointment({
      userId: user.id,
      patientCode: profile.patientCode,
      clinicId: selectedDoctor.clinic_id || user.clinic_id,
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      specialty: selectedDoctor.specialty,
      hospitalName: selectedDoctor.clinic_name,
      appointmentDate: form.appointmentDate,
      appointmentTime: form.appointmentTime,
      visitType: form.visitType,
      reason: form.reason.trim(),
      symptoms: form.symptoms.trim(),
      status: "Booked",
      doctorRoute,
      doctorEmail: selectedDoctor.email,
      doctorRole: selectedDoctor.role,
      qrValue: detailRoute,
    });

    const syncedAppointment = { ...nextAppointment, qrValue: detailRoute };
    updateAppointment(nextAppointment.id, { qrValue: detailRoute });

    try {
      await syncAppointmentToDoctorInbox(syncedAppointment);
    } catch (error) {
      console.warn("[Booking] Could not save doctor inbox notification:", error);
      toast.error("Appointment saved, but doctor notification could not be delivered.");
      return;
    }

    try {
      localStorage.setItem(
        `medcopilot:onboarding:${profile.patientCode}`,
        JSON.stringify(buildConsultationSeedPayload(profile, syncedAppointment))
      );
    } catch (error) {
      console.warn("[Booking] Could not persist consultation seed payload:", error);
    }

    try {
      const response = await fetch("/api/patient-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildDoctorPassRecord(
            profile,
            syncedAppointment,
            typeof window !== "undefined" ? window.location.origin : undefined
          )
        ),
      });
      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorPayload?.error || "Could not save patient pass");
      }
    } catch (error) {
      console.warn("[Booking] Could not persist patient pass:", error);
    }

    addNotification({
      userId: user.id,
      title: "Appointment booked successfully",
      desc: `Your visit with ${syncedAppointment.doctorName} is confirmed for ${formatAppointmentDateTime(
        syncedAppointment.appointmentDate,
        syncedAppointment.appointmentTime
      )}.`,
      type: "success",
    });

    toast.success("Appointment booked and doctor notification sent.");
    setBookedAppointment(syncedAppointment);
  };

  return (
    <div className={cn("space-y-8 w-full", !isModal ? "pb-24 pt-6 px-5 lg:px-10 max-w-screen-2xl mx-auto" : "")}>
      {!isModal ? (
        <header className="space-y-1">
          <h1 className="text-2xl font-headline font-extrabold">Book Appointment</h1>
          <p className="text-sm text-on-surface-variant">
            Share your real health history and generate a doctor-facing check-in QR when you book.
          </p>
        </header>
      ) : null}

      {bookedAppointment ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-7 space-y-6">
            <Card className="rounded-[2rem] border border-primary/10 bg-primary/5 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Booking Confirmed</p>
                  <h2 className="text-2xl font-bold text-on-surface">{bookedAppointment.doctorName}</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/70 border border-primary/10 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">Appointment</p>
                  <p className="mt-2 text-base font-bold text-on-surface">
                    {formatAppointmentDateTime(bookedAppointment.appointmentDate, bookedAppointment.appointmentTime)}
                  </p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {bookedAppointment.specialty} · {bookedAppointment.hospitalName}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/70 border border-primary/10 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">Booking ID</p>
                  <p className="mt-2 text-base font-bold text-on-surface">{bookedAppointment.id}</p>
                  <p className="mt-1 text-sm text-on-surface-variant">Patient code: {profile.patientCode}</p>
                </div>
              </div>
            </Card>

            <BookingPass
              title="Scan For Doctor Check-in"
              subtitle="Doctor can scan this QR and open your full patient summary page."
              qrValue={bookedAppointment.qrValue}
              route={bookedAppointment.qrValue}
              routeLabel="Patient Summary Page"
            />
          </div>

          <div className="xl:col-span-5 space-y-6">
            <Card className="rounded-[2rem] border border-outline-variant/20 bg-surface-lowest p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <ClipboardPlus size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface">Shared With Doctor</h3>
                  <p className="text-xs text-on-surface-variant">This information is already synced</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-on-surface-variant">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">Reason</p>
                  <p>{bookedAppointment.reason}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">Symptoms</p>
                  <p>{bookedAppointment.symptoms}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">Past History</p>
                  <p>{historySummary || "No additional past history entered."}</p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button className="rounded-2xl" onClick={() => setBookedAppointment(null)}>
                Book Another Visit
              </Button>
              <Button variant="secondary" className="rounded-2xl" onClick={() => router.push("/dashboard")}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-4 space-y-6">
            <Card className="rounded-[2rem] border border-outline-variant/20 bg-surface-lowest p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-on-surface">Profile Readiness</h2>
                  <p className="text-xs text-on-surface-variant">Required before booking</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-extrabold text-on-surface">{completion}%</p>
                  <Button variant="secondary" className="rounded-2xl" onClick={() => router.push("/profile")}>
                    Update Profile
                  </Button>
                </div>
                <div className="h-2 rounded-full bg-surface-low overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completion}%` }} />
                </div>
                <p className="text-xs text-on-surface-variant">
                  {profileReady
                    ? "Profile is ready for booking and doctor sync."
                    : `Please complete: ${missingFields.slice(0, 4).join(", ")}`}
                </p>
              </div>
            </Card>

            <Card className="rounded-[2rem] border border-primary/10 bg-primary/5 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface">Doctor Sync Preview</h3>
                  <p className="text-xs text-on-surface-variant">Sent to doctor at booking time</p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-on-surface-variant">
                <p><span className="font-bold text-on-surface">Selected Doctor:</span> {selectedDoctor?.name || "Choose a doctor"}</p>
                <p><span className="font-bold text-on-surface">Department:</span> {selectedDoctor?.specialty || "Will appear after selection"}</p>
                <p><span className="font-bold text-on-surface">Patient:</span> {profile.fullName || "Not added"}</p>
                <p><span className="font-bold text-on-surface">Current Symptoms:</span> {profile.currentSymptoms || "Not added"}</p>
                <p><span className="font-bold text-on-surface">Past History:</span> {historySummary || "Not added"}</p>
                <p><span className="font-bold text-on-surface">Current Medications:</span> {profile.currentMedications || "Not added"}</p>
              </div>
            </Card>

            {existingAppointment ? (
              <Card className="rounded-[2rem] border border-outline-variant/20 bg-surface-lowest p-6 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Current Active Booking</p>
                <p className="text-lg font-bold text-on-surface">{existingAppointment.doctorName}</p>
                <p className="text-sm text-on-surface-variant">
                  {formatAppointmentDateTime(existingAppointment.appointmentDate, existingAppointment.appointmentTime)}
                </p>
              </Card>
            ) : null}
          </div>

          <div className="xl:col-span-8 space-y-6">
            <Card className="rounded-[2rem] border border-outline-variant/20 bg-surface-lowest p-6 lg:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-on-surface">Appointment Details</h2>
                  <p className="text-sm text-on-surface-variant">
                    Choose a real doctor profile from the current platform, then add your visit details.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">
                    Choose Doctor From Current Platform
                  </p>
                  {isLoadingClinicians ? (
                    <div className="rounded-[1.75rem] border border-outline-variant/20 bg-surface-low p-5 text-sm text-on-surface-variant">
                      Loading doctor profiles...
                    </div>
                  ) : clinicians.length > 0 ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      {clinicians.map((doctor) => {
                        const isSelected = doctor.id === form.doctorId;

                        return (
                          <button
                            key={doctor.id}
                            type="button"
                            onClick={() => updateForm("doctorId", doctor.id)}
                            className={cn(
                              "text-left rounded-[1.5rem] border p-4 transition-all",
                              isSelected
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-outline-variant/20 bg-surface-low hover:border-primary/30"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-base font-bold text-on-surface">{doctor.name}</p>
                                <p className="text-xs text-primary font-semibold mt-1">{doctor.specialty}</p>
                              </div>
                              <span
                                className={cn(
                                  "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                                  doctor.role === "admin"
                                    ? "bg-[#eff6ff] text-[#2563eb]"
                                    : "bg-[#f0fdf4] text-[#16a34a]"
                                )}
                              >
                                {doctor.role}
                              </span>
                            </div>
                            <div className="mt-3 space-y-1 text-xs text-on-surface-variant">
                              <p>{doctor.email}</p>
                              <p>{doctor.clinic_name}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[1.75rem] border border-dashed border-outline-variant/40 bg-surface-low p-5 text-sm text-on-surface-variant">
                      No doctor profiles are available in this clinic yet.
                    </div>
                  )}
                </div>
                <FormField label="Selected Doctor">
                  <input
                    value={selectedDoctor?.name || ""}
                    readOnly
                    placeholder="Select doctor from current platform"
                    className="w-full h-12 rounded-2xl bg-surface-low border border-outline-variant/30 px-4 text-sm font-medium focus:outline-none"
                  />
                </FormField>
                <FormField label="Specialty / Department">
                  <input
                    value={selectedDoctor?.specialty || ""}
                    readOnly
                    placeholder="Doctor specialty"
                    className="w-full h-12 rounded-2xl bg-surface-low border border-outline-variant/30 px-4 text-sm font-medium focus:outline-none"
                  />
                </FormField>
                <FormField label="Hospital / Clinic">
                  <input
                    value={selectedDoctor?.clinic_name || ""}
                    readOnly
                    placeholder="Clinic name"
                    className="w-full h-12 rounded-2xl bg-surface-low border border-outline-variant/30 px-4 text-sm font-medium focus:outline-none"
                  />
                </FormField>
                <FormField label="Visit Type">
                  <select
                    value={form.visitType}
                    onChange={(event) => updateForm("visitType", event.target.value as PatientPortalAppointment["visitType"])}
                    className="w-full h-12 rounded-2xl bg-surface-low border border-outline-variant/30 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option>In-person</option>
                    <option>Video</option>
                    <option>Follow-up</option>
                  </select>
                </FormField>
                <FormField label="Appointment Date">
                  <input
                    type="date"
                    value={form.appointmentDate}
                    onChange={(event) => updateForm("appointmentDate", event.target.value)}
                    className="w-full h-12 rounded-2xl bg-surface-low border border-outline-variant/30 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </FormField>
                <FormField label="Appointment Time">
                  <input
                    type="time"
                    value={form.appointmentTime}
                    onChange={(event) => updateForm("appointmentTime", event.target.value)}
                    className="w-full h-12 rounded-2xl bg-surface-low border border-outline-variant/30 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </FormField>
                <FormField label="Reason For Visit">
                  <textarea
                    value={form.reason}
                    onChange={(event) => updateForm("reason", event.target.value)}
                    placeholder="Main reason for booking this consultation"
                    className="w-full min-h-32 rounded-[1.75rem] bg-surface-low border border-outline-variant/30 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </FormField>
                <FormField label="Symptoms To Share With Doctor">
                  <textarea
                    value={form.symptoms}
                    onChange={(event) => updateForm("symptoms", event.target.value)}
                    placeholder="Symptoms, duration, severity, and any concerns"
                    className="w-full min-h-32 rounded-[1.75rem] bg-surface-low border border-outline-variant/30 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </FormField>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button className="rounded-2xl px-8" onClick={handleBookAppointment} disabled={!selectedDoctor || isLoadingClinicians}>
                  <QrCode size={16} />
                  Book And Generate QR
                </Button>
                <Button
                  variant="secondary"
                  className="rounded-2xl"
                  onClick={() => router.push("/profile")}
                >
                  Edit Health Profile
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
