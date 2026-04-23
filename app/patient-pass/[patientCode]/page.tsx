import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/patient-portal/ui/base";
import { BookingPass } from "@/components/patient-portal/ui/booking-pass";
import { PatientPassDetailView } from "@/components/patient-portal/ui/patient-pass-detail-view";
import { PatientPassActions } from "@/components/patient-portal/ui/patient-pass-actions";
import { buildPatientPassDetailRoute } from "@/lib/patient-portal";
import { readPatientPass } from "@/lib/patient-pass-store";

export const dynamic = "force-dynamic";

export default async function PatientPassPage({
  params,
}: {
  params: Promise<{ patientCode: string }>;
}) {
  const { patientCode } = await params;
  const patientPass = await readPatientPass(patientCode);

  if (!patientPass) {
    notFound();
  }

  const bookingLabel = [
    patientPass.booking?.appointmentDate,
    patientPass.booking?.appointmentTime,
    patientPass.booking?.visitType,
  ]
    .filter(Boolean)
    .join(" · ");
  const detailRoute = patientPass.detailRoute || buildPatientPassDetailRoute(patientPass.patientCode);

  return (
    <div className="min-h-screen bg-[#f7faf9] px-4 py-8 lg:px-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="rounded-[2rem] border border-primary/10 bg-primary/5 p-6 lg:p-8 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/70">Doctor Patient Pass</p>
              <h1 className="text-3xl font-bold text-on-surface">{patientPass.patient.fullName || patientPass.patientCode}</h1>
              <p className="text-sm text-on-surface-variant">Patient ID: {patientPass.patientCode}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge status="Info">HTML Handoff</Badge>
              {patientPass.booking?.status ? <Badge status="Success">{patientPass.booking.status}</Badge> : null}
            </div>
          </div>

          <p className="text-sm text-on-surface-variant leading-relaxed">
            QR-first doctor handoff is ready. Scan the code below to open a clean patient-details page that does not show the QR again.
          </p>

          <PatientPassActions consultationRoute={patientPass.consultationRoute} />
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-7">
            <Card className="rounded-[2rem] border border-primary/10 bg-white p-6 space-y-5">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Doctor Quick Handoff</p>
                <h2 className="text-2xl font-bold text-on-surface">Scan QR Or Jump To Consultation</h2>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  This is the short doctor-facing summary. The QR now opens a detail-only patient page for cleaner scanning.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">Patient</p>
                  <p className="text-sm text-on-surface leading-relaxed">{patientPass.patient.fullName || patientPass.patientCode}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">Appointment</p>
                  <p className="text-sm text-on-surface leading-relaxed">{bookingLabel}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">Doctor</p>
                  <p className="text-sm text-on-surface leading-relaxed">{patientPass.booking?.doctorName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">Specialty</p>
                  <p className="text-sm text-on-surface leading-relaxed">{patientPass.booking?.specialty}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">Hospital</p>
                  <p className="text-sm text-on-surface leading-relaxed">{patientPass.booking?.hospitalName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">Reason</p>
                  <p className="text-sm text-on-surface leading-relaxed">{patientPass.booking?.reason}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">Symptoms Shared</p>
                  <p className="text-sm text-on-surface leading-relaxed">{patientPass.booking?.symptoms}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">Emergency Contact</p>
                  <p className="text-sm text-on-surface leading-relaxed">{patientPass.emergencyContact?.name}</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="xl:col-span-5">
            <BookingPass
              title="Doctor Handoff QR"
              subtitle="Scan this code to open the patient details page directly. The action buttons below still take you straight to consultation."
              qrValue={detailRoute}
              route={detailRoute}
              routeLabel="Patient Detail Route"
              compact
            />
          </div>
        </div>

        <details className="group rounded-[2rem] border border-outline-variant/20 bg-white overflow-hidden">
          <summary className="list-none cursor-pointer px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">Expanded Clinical View</p>
              <h2 className="text-xl font-bold text-on-surface mt-1">View Full Patient Details</h2>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary group-open:hidden">Open</span>
            <span className="hidden group-open:inline text-xs font-bold uppercase tracking-widest text-primary">Close</span>
          </summary>

          <div className="px-6 pb-6">
            <PatientPassDetailView
              patientPass={patientPass}
              bookingLabel={bookingLabel}
              showConsultationRoute
            />
          </div>
        </details>
      </div>
    </div>
  );
}
