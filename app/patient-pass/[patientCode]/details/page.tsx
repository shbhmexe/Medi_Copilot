import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/patient-portal/ui/base";
import { PatientPassDetailView } from "@/components/patient-portal/ui/patient-pass-detail-view";
import { readPatientPass } from "@/lib/patient-pass-store";

export const dynamic = "force-dynamic";

export default async function PatientPassDetailPage({
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

  return (
    <div className="min-h-screen bg-[#f7faf9] px-4 py-8 lg:px-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="rounded-[2rem] border border-primary/10 bg-primary/5 p-6 lg:p-8 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/70">Patient Detail Handoff</p>
              <h1 className="text-3xl font-bold text-on-surface">{patientPass.patient.fullName || patientPass.patientCode}</h1>
              <p className="text-sm text-on-surface-variant">Patient ID: {patientPass.patientCode}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge status="Info">Details Only</Badge>
              {patientPass.booking?.status ? <Badge status="Success">{patientPass.booking.status}</Badge> : null}
            </div>
          </div>

          <p className="text-sm text-on-surface-variant leading-relaxed">
            This page only shows patient details for doctor review. No QR is displayed here.
          </p>
        </Card>

        <PatientPassDetailView patientPass={patientPass} bookingLabel={bookingLabel} />
      </div>
    </div>
  );
}
