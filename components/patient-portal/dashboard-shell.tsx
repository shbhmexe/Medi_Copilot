"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/patient-portal/ui/base";
import { PatientDashboardScreen } from "@/components/patient-portal/screens/dashboard";
import { AppointmentBookingScreen } from "@/components/patient-portal/screens/appointment-booking";
import { UploadReportScreen } from "@/components/patient-portal/screens/upload-report";
import { ChatAssistant } from "@/components/patient-portal/screens/chat-assistant";

type ActiveModal = "upload" | "booking" | null;

export function PatientDashboardShell() {
  const router = useRouter();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const handleNavigate = (target: "records" | "booking" | "upload" | "profile" | "notifications") => {
    if (target === "upload") {
      setActiveModal("upload");
      return;
    }

    if (target === "booking") {
      setActiveModal("booking");
      return;
    }

    if (target === "records") {
      router.push("/records");
      return;
    }

    if (target === "profile") {
      router.push("/profile");
      return;
    }

    router.push("/notifications");
  };

  return (
    <>
      <PatientDashboardScreen
        onNavigate={handleNavigate}
        onOpenChat={() => setIsChatOpen(true)}
      />

      <Modal
        isOpen={activeModal === "upload"}
        onClose={() => setActiveModal(null)}
        title="Upload Medical Report"
        maxWidth="4xl"
      >
        <UploadReportScreen
          onBack={() => setActiveModal(null)}
          onComplete={(recordId) => {
            setActiveModal(null);
            router.push(`/records/${recordId}`);
          }}
          isModal
        />
      </Modal>

      <Modal
        isOpen={activeModal === "booking"}
        onClose={() => setActiveModal(null)}
        title="Book Appointment"
        maxWidth="6xl"
      >
        <AppointmentBookingScreen isModal />
      </Modal>

      <ChatAssistant isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
}
