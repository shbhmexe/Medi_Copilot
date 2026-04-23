import { Card } from "@/components/patient-portal/ui/base";
import type { DoctorPassRecord } from "@/lib/patient-portal";

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">{label}</p>
      <p className="text-sm text-on-surface leading-relaxed">{value}</p>
    </div>
  );
}

export function PatientPassDetailView({
  patientPass,
  bookingLabel,
  showConsultationRoute = false,
}: {
  patientPass: DoctorPassRecord;
  bookingLabel: string;
  showConsultationRoute?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="xl:col-span-7 space-y-6">
        <Card className="rounded-[2rem] border border-outline-variant/20 bg-white p-6 space-y-5">
          <h2 className="text-xl font-bold text-on-surface">Patient Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailRow label="Full Name" value={patientPass.patient.fullName} />
            <DetailRow label="Age" value={patientPass.patient.age} />
            <DetailRow label="Gender" value={patientPass.patient.gender} />
            <DetailRow label="Date Of Birth" value={patientPass.patient.dateOfBirth} />
            <DetailRow label="Blood Group" value={patientPass.patient.bloodGroup} />
            <DetailRow label="Phone" value={patientPass.patient.phone} />
            <DetailRow label="Email" value={patientPass.patient.email} />
            <DetailRow label="Occupation" value={patientPass.patient.occupation} />
            <DetailRow label="Insurance ID" value={patientPass.patient.insuranceId} />
            <DetailRow label="Address" value={patientPass.patient.address} />
          </div>
        </Card>

        <Card className="rounded-[2rem] border border-outline-variant/20 bg-white p-6 space-y-5">
          <h2 className="text-xl font-bold text-on-surface">Medical History</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailRow label="Current Symptoms" value={patientPass.history?.currentSymptoms} />
            <DetailRow label="Past History" value={patientPass.history?.pastHistory} />
            <DetailRow label="Chronic Conditions" value={patientPass.history?.chronicConditions} />
            <DetailRow label="Surgical History" value={patientPass.history?.surgicalHistory} />
            <DetailRow label="Family History" value={patientPass.history?.familyHistory} />
            <DetailRow label="Allergies" value={patientPass.history?.allergies} />
            <DetailRow label="Current Medications" value={patientPass.history?.currentMedications} />
            <DetailRow label="Lifestyle Notes" value={patientPass.history?.lifestyleNotes} />
          </div>
        </Card>
      </div>

      <div className="xl:col-span-5 space-y-6">
        <Card className="rounded-[2rem] border border-outline-variant/20 bg-white p-6 space-y-5">
          <h2 className="text-xl font-bold text-on-surface">Emergency Contact</h2>
          <div className="space-y-4">
            <DetailRow label="Name" value={patientPass.emergencyContact?.name} />
            <DetailRow label="Phone" value={patientPass.emergencyContact?.phone} />
            <DetailRow label="Relation" value={patientPass.emergencyContact?.relation} />
          </div>
        </Card>

        <Card className="rounded-[2rem] border border-outline-variant/20 bg-white p-6 space-y-5">
          <h2 className="text-xl font-bold text-on-surface">Current Vitals</h2>
          <div className="grid grid-cols-2 gap-4">
            <DetailRow label="BP" value={patientPass.vitals?.bp} />
            <DetailRow label="Pulse" value={patientPass.vitals?.pulse} />
            <DetailRow label="Temperature" value={patientPass.vitals?.temperature} />
            <DetailRow label="SpO2" value={patientPass.vitals?.spo2} />
            <DetailRow label="Weight" value={patientPass.vitals?.weight} />
            <DetailRow label="Sugar" value={patientPass.vitals?.rbs} />
          </div>
        </Card>

        <Card className="rounded-[2rem] border border-primary/10 bg-primary/5 p-6 space-y-5">
          <h2 className="text-xl font-bold text-on-surface">Booking / Consultation</h2>
          <div className="space-y-4">
            <DetailRow label="Doctor" value={patientPass.booking?.doctorName} />
            <DetailRow label="Specialty" value={patientPass.booking?.specialty} />
            <DetailRow label="Hospital" value={patientPass.booking?.hospitalName} />
            <DetailRow label="Appointment" value={bookingLabel} />
            <DetailRow label="Reason" value={patientPass.booking?.reason} />
            <DetailRow label="Symptoms Shared" value={patientPass.booking?.symptoms} />
            {showConsultationRoute ? (
              <DetailRow label="Consultation Route" value={patientPass.consultationRoute} />
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
