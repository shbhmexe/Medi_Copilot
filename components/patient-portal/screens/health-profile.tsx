"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, HeartHandshake, QrCode, Save, ShieldPlus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { BookingPass } from "@/components/patient-portal/ui/booking-pass";
import { Button, Card } from "@/components/patient-portal/ui/base";
import {
  buildDoctorPassRecord,
  buildPatientPassDetailRoute,
  getMissingProfileFields,
  getProfileCompletion,
  getUpcomingAppointment,
} from "@/lib/patient-portal";
import { useAuthStore, usePatientPortalStore, type PatientPortalProfile } from "@/store";

type FormField = keyof PatientPortalProfile;

const PERSONAL_FIELDS: Array<{ key: FormField; label: string; placeholder: string; type?: string }> = [
  { key: "fullName", label: "Full Name", placeholder: "Patient full name" },
  { key: "phone", label: "Phone Number", placeholder: "9876543210", type: "tel" },
  { key: "email", label: "Email", placeholder: "name@example.com", type: "email" },
  { key: "dateOfBirth", label: "Date of Birth", placeholder: "", type: "date" },
  { key: "age", label: "Age", placeholder: "28", type: "number" },
  { key: "gender", label: "Gender", placeholder: "Male / Female / Other" },
  { key: "bloodGroup", label: "Blood Group", placeholder: "B+" },
  { key: "occupation", label: "Occupation", placeholder: "Student / Working / Retired" },
  { key: "insuranceId", label: "Insurance ID", placeholder: "Optional insurance number" },
];

const EMERGENCY_FIELDS: Array<{ key: FormField; label: string; placeholder: string }> = [
  { key: "emergencyContactName", label: "Emergency Contact Name", placeholder: "Emergency contact name" },
  { key: "emergencyContactPhone", label: "Emergency Contact Phone", placeholder: "Emergency contact phone" },
  { key: "emergencyContactRelation", label: "Relation", placeholder: "Parent / Partner / Sibling" },
];

const VITAL_FIELDS: Array<{ key: FormField; label: string; placeholder: string }> = [
  { key: "bpSystolic", label: "BP Systolic", placeholder: "120" },
  { key: "bpDiastolic", label: "BP Diastolic", placeholder: "80" },
  { key: "sugarMgDl", label: "Sugar (mg/dL)", placeholder: "98" },
  { key: "weightKg", label: "Weight (kg)", placeholder: "72.5" },
  { key: "heightCm", label: "Height (cm)", placeholder: "172" },
  { key: "pulse", label: "Pulse", placeholder: "76" },
  { key: "spo2", label: "SpO2", placeholder: "98" },
  { key: "temperatureF", label: "Temperature (F)", placeholder: "98.4" },
];

const HISTORY_FIELDS: Array<{ key: FormField; label: string; placeholder: string }> = [
  { key: "pastHistory", label: "Past Medical History", placeholder: "Past illnesses, prior admissions, chronic issues..." },
  { key: "chronicConditions", label: "Chronic Conditions", placeholder: "Diabetes, hypertension, asthma..." },
  { key: "surgicalHistory", label: "Surgical History", placeholder: "Any surgeries or procedures..." },
  { key: "familyHistory", label: "Family History", placeholder: "Family diseases or inherited risks..." },
  { key: "allergies", label: "Allergies", placeholder: "Drug / food / environmental allergies..." },
  { key: "currentMedications", label: "Current Medications", placeholder: "Medicines with dose and frequency..." },
  { key: "lifestyleNotes", label: "Lifestyle Notes", placeholder: "Smoking, alcohol, diet, sleep, exercise..." },
  { key: "currentSymptoms", label: "Current Symptoms / Main Complaint", placeholder: "Symptoms you are facing right now..." },
];

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof UserRound;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
        <Icon size={20} />
      </div>
      <div>
        <h2 className="text-lg font-headline font-bold text-on-surface">{title}</h2>
        <p className="text-xs text-on-surface-variant">{subtitle}</p>
      </div>
    </div>
  );
}

export function HealthProfileScreen() {
  const { user } = useAuthStore();
  const { ensureProfile, saveProfile, addNotification, profiles, appointments } = usePatientPortalStore();
  const [formData, setFormData] = useState<PatientPortalProfile | null>(null);
  const [savedPassRoute, setSavedPassRoute] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingPass, setIsCheckingPass] = useState(false);
  const passCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) return;
    const profile = ensureProfile(user);
    if (profile) {
      setFormData(profile);
    }
  }, [ensureProfile, user]);

  useEffect(() => {
    if (!user) return;
    const profile = profiles[user.id];
    if (profile) {
      setFormData(profile);
    }
  }, [profiles, user]);

  useEffect(() => {
    if (!formData?.patientCode) return;

    let isActive = true;
    setIsCheckingPass(true);

    fetch(`/api/patient-pass?patientCode=${encodeURIComponent(formData.patientCode)}`)
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        const payload = (await response.json()) as { data?: { handoffRoute?: string; detailRoute?: string } };
        return (
          payload.data?.detailRoute ||
          buildPatientPassDetailRoute(
            formData.patientCode,
            typeof window !== "undefined" ? window.location.origin : undefined
          ) ||
          payload.data?.handoffRoute ||
          ""
        );
      })
      .then((passRoute) => {
        if (isActive && passRoute) {
          setSavedPassRoute(passRoute);
        }
      })
      .catch((error) => {
        console.warn("[HealthProfile] Could not load existing patient pass:", error);
      })
      .finally(() => {
        if (isActive) {
          setIsCheckingPass(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [formData?.patientCode]);

  if (!user || !formData) {
    return null;
  }

  const completion = getProfileCompletion(formData);
  const missingFields = getMissingProfileFields(formData).slice(0, 4);
  const upcomingAppointment = getUpcomingAppointment(appointments, user.id);

  const updateField = (field: FormField, value: string) => {
    setFormData((previous) => (previous ? { ...previous, [field]: value } : previous));
  };

  const handleSave = async () => {
    setIsSaving(true);
    saveProfile(user.id, formData);
    addNotification({
      userId: user.id,
      title: "Health profile updated",
      desc: "Your details and medical history are now ready for doctor booking.",
      type: "success",
    });

    const detailRoute = buildPatientPassDetailRoute(
      formData.patientCode,
      typeof window !== "undefined" ? window.location.origin : undefined
    );

    try {
      const response = await fetch("/api/patient-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildDoctorPassRecord(
            formData,
            upcomingAppointment,
            typeof window !== "undefined" ? window.location.origin : undefined
          )
        ),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorPayload?.error || "Could not generate patient QR handoff");
      }

      setSavedPassRoute(detailRoute);
      toast.success("Health profile saved and QR generated.");
      window.requestAnimationFrame(() => {
        passCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (error) {
      console.warn("[HealthProfile] Could not generate patient pass:", error);
      const message = error instanceof Error ? error.message : "QR could not be generated.";
      toast.error(`Health profile saved, but QR could not be generated. ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-24 pt-6 px-5 lg:px-10 space-y-8 max-w-screen-2xl mx-auto">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/70">Patient Intake</p>
          <h1 className="text-2xl font-headline font-extrabold">Health Profile</h1>
          <p className="text-sm text-on-surface-variant max-w-3xl">
            Add your complete details, past history, allergies, medications, vitals, and current symptoms.
            This profile is used for doctor booking and consultation handoff.
          </p>
        </div>

        <Card className="rounded-[2rem] border border-primary/10 bg-primary/5 p-5 min-w-[280px]">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Profile Completion</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-extrabold text-on-surface">{completion}%</p>
                <p className="text-xs text-on-surface-variant">Patient ID: {formData.patientCode}</p>
              </div>
              <Button className="rounded-2xl" onClick={handleSave} disabled={isSaving}>
                <Save size={16} />
                {isSaving ? "Saving..." : "Save & Generate QR"}
              </Button>
            </div>
          <div className="mt-4 h-2 rounded-full bg-white/70 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${completion}%` }} />
          </div>
          {missingFields.length > 0 ? (
            <p className="mt-3 text-xs text-on-surface-variant">
              Still missing: {missingFields.join(", ")}
            </p>
          ) : (
            <p className="mt-3 text-xs text-tertiary font-semibold">
              Your profile is ready for doctor booking.
            </p>
          )}
        </Card>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 space-y-6">
          <Card className="rounded-[2rem] border border-outline-variant/20 bg-surface-lowest p-6 space-y-6">
            <SectionTitle
              icon={UserRound}
              title="Personal Details"
              subtitle="Basic identity and contact information"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PERSONAL_FIELDS.map((field) => (
                <label key={field.key} className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">
                    {field.label}
                  </span>
                  <input
                    type={field.type || "text"}
                    value={formData[field.key]}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className="w-full h-12 rounded-2xl bg-surface-low border border-outline-variant/30 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              ))}
              <label className="space-y-2 md:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">
                  Address
                </span>
                <textarea
                  value={formData.address}
                  onChange={(event) => updateField("address", event.target.value)}
                  placeholder="Full address"
                  className="w-full min-h-28 rounded-[1.75rem] bg-surface-low border border-outline-variant/30 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </label>
            </div>
          </Card>

          <Card className="rounded-[2rem] border border-outline-variant/20 bg-surface-lowest p-6 space-y-6">
            <SectionTitle
              icon={HeartHandshake}
              title="Emergency Contact"
              subtitle="Who should be contacted first in case of emergency?"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {EMERGENCY_FIELDS.map((field) => (
                <label key={field.key} className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">
                    {field.label}
                  </span>
                  <input
                    value={formData[field.key]}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className="w-full h-12 rounded-2xl bg-surface-low border border-outline-variant/30 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              ))}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-5 space-y-6">
          <Card className="rounded-[2rem] border border-outline-variant/20 bg-surface-lowest p-6 space-y-6">
            <SectionTitle
              icon={Activity}
              title="Current Vitals"
              subtitle="Latest values shared with the doctor"
            />
            <div className="grid grid-cols-2 gap-4">
              {VITAL_FIELDS.map((field) => (
                <label key={field.key} className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">
                    {field.label}
                  </span>
                  <input
                    value={formData[field.key]}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className="w-full h-12 rounded-2xl bg-surface-low border border-outline-variant/30 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              ))}
            </div>
          </Card>

          <Card className="rounded-[2rem] border border-primary/10 bg-primary/5 p-6 space-y-4">
            <SectionTitle
              icon={ShieldPlus}
              title="Doctor Booking Ready"
              subtitle="This data can be shared instantly through the doctor QR handoff"
            />
            <ul className="space-y-3 text-sm text-on-surface-variant">
              <li>Personal details and emergency contact</li>
              <li>Past history, surgeries, allergies, and medications</li>
              <li>Latest vitals and current symptoms</li>
              <li>A doctor summary HTML page that can be printed or saved as PDF</li>
            </ul>
            <p className="text-xs text-on-surface-variant">
              {savedPassRoute
                ? "QR handoff is ready below. Doctor scan se patient summary HTML page khul jayega."
                : isCheckingPass
                  ? "Checking whether your QR handoff already exists..."
                  : "Save your profile once and the QR handoff will appear below."}
            </p>
          </Card>
        </div>
      </div>

      <Card className="rounded-[2rem] border border-outline-variant/20 bg-surface-lowest p-6 space-y-6">
        <SectionTitle
          icon={HeartHandshake}
          title="Past History & Current Complaint"
          subtitle="Provide the context the doctor should see before consultation"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {HISTORY_FIELDS.map((field) => (
            <label key={field.key} className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">
                {field.label}
              </span>
              <textarea
                value={formData[field.key]}
                onChange={(event) => updateField(field.key, event.target.value)}
                placeholder={field.placeholder}
                className="w-full min-h-32 rounded-[1.75rem] bg-surface-low border border-outline-variant/30 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </label>
          ))}
        </div>

        <div className="flex justify-end">
          <Button className="rounded-2xl px-8" onClick={handleSave} disabled={isSaving}>
            <Save size={16} />
            {isSaving ? "Saving..." : "Save Complete History & Generate QR"}
          </Button>
        </div>
      </Card>

      <div ref={passCardRef}>
        {savedPassRoute ? (
          <BookingPass
            title="Doctor Scan QR"
            subtitle="Doctor can scan this QR to open your full patient summary HTML page and print it as PDF."
            qrValue={savedPassRoute}
            route={savedPassRoute}
            routeLabel="Patient Summary Page"
          />
        ) : (
          <Card className="rounded-[2rem] border border-dashed border-primary/20 bg-primary/5 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0">
                <QrCode size={20} />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-on-surface">Doctor QR Handoff</h2>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Save your health profile and a QR code will be generated here. When the doctor scans it,
                  the patient summary HTML page will open with your personal details, history, vitals, allergies,
                  medications, and a print option for PDF.
                </p>
                <p className="text-xs font-medium text-primary/80">
                  {isCheckingPass
                    ? "Checking if your QR already exists..."
                    : "QR will appear here immediately after save."}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
