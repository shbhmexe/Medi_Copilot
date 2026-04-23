"use client";

import { Printer, Stethoscope } from "lucide-react";
import { Button } from "@/components/patient-portal/ui/base";

export function PatientPassActions({
  consultationRoute,
}: {
  consultationRoute: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Button className="rounded-2xl" onClick={() => window.print()}>
        <Printer size={16} />
        Print / Save PDF
      </Button>
      <Button
        variant="secondary"
        className="rounded-2xl"
        onClick={() => window.open(consultationRoute, "_blank", "noopener,noreferrer")}
      >
        <Stethoscope size={16} />
        Open Consultation
      </Button>
    </div>
  );
}
