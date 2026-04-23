"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  HelpCircle,
  Pill,
  Settings as SettingsIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button, Card, Modal } from "@/components/patient-portal/ui/base";
import { cn } from "@/lib/utils";

const MOCK_MEDS = [
  { id: "1", name: "Atorvastatin", dosage: "20mg", time: "08:00 AM", period: "Morning", tags: ["Chronic", "After Food"], taken: true },
  { id: "2", name: "Vitamin D3", dosage: "1000 IU", time: "09:30 AM", period: "Morning", tags: ["Supplement"], taken: false },
  { id: "3", name: "Metformin", dosage: "500mg", time: "01:30 PM", period: "Afternoon", tags: ["Chronic", "After Food"], taken: false },
  { id: "4", name: "Magnesium", dosage: "250mg", time: "09:00 PM", period: "Night", tags: ["Supplement"], taken: false },
];

type MedPeriod = "Morning" | "Afternoon" | "Night";

export function MedicineReminderScreen({ onNavigate }: { onNavigate?: (screen: "help" | "settings") => void }) {
  const [meds, setMeds] = useState(MOCK_MEDS);
  const [streak] = useState(5);
  const [confirmMed, setConfirmMed] = useState<(typeof MOCK_MEDS)[number] | null>(null);

  const toggleTaken = (id: string) => {
    setMeds((previous) => previous.map((med) => (med.id === id ? { ...med, taken: !med.taken } : med)));
    setConfirmMed(null);
  };

  const missedCount = meds.filter((med) => !med.taken && med.period === "Morning").length;

  return (
    <div className="pb-24 pt-6 px-5 lg:px-10 space-y-8 max-w-screen-2xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex justify-between items-start w-full sm:w-auto">
          <div>
            <h1 className="text-2xl font-headline font-extrabold">Medications</h1>
            <p className="text-sm text-on-surface-variant">Your daily schedule for today</p>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => onNavigate?.("help")}
              className="p-2.5 bg-surface-lowest whisper-shadow rounded-2xl border border-outline-variant/30 text-on-surface-variant"
            >
              <HelpCircle size={20} />
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.("settings")}
              className="p-2.5 bg-surface-lowest whisper-shadow rounded-2xl border border-outline-variant/30 text-on-surface-variant"
            >
              <SettingsIcon size={20} />
            </button>
          </div>
        </div>

        <div className="bg-surface-lowest whisper-shadow px-6 py-3 rounded-2xl flex items-center gap-4 border border-outline-variant/30 neumorph-inset">
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
            <Flame size={26} className="text-orange-500 fill-orange-500 animate-bounce" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
              Adherence Streak
            </p>
            <p className="text-lg font-extrabold text-orange-700">{streak}-day streak</p>
          </div>
        </div>
      </header>

      {missedCount > 0 ? (
        <Card className="bg-error-container/40 border border-destructive/10 flex gap-4 items-center p-5 rounded-2xl">
          <div className="p-2 bg-destructive/10 rounded-lg text-destructive">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-destructive">Attention Needed</p>
            <p className="text-xs text-destructive/80">
              You missed {missedCount} dose{missedCount > 1 ? "s" : ""} this morning. Please
              review your schedule.
            </p>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {(["Morning", "Afternoon", "Night"] as MedPeriod[]).map((period) => (
          <section key={period} className="space-y-5">
            <div className="flex items-center gap-3 px-1">
              <div className="p-1.5 bg-surface-low rounded-lg text-on-surface-variant/40">
                <Clock size={16} />
              </div>
              <h2 className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">
                {period}
              </h2>
              <div className="h-px bg-outline-variant/20 flex-1" />
            </div>

            <div className="space-y-4">
              {meds.filter((med) => med.period === period).map((med) => (
                <motion.div key={med.id} layout>
                  <Card
                    className={cn(
                      "p-5 flex items-center gap-4 transition-all duration-500 border border-outline-variant/10",
                      med.taken
                        ? "opacity-60 bg-surface-low grayscale-[0.5]"
                        : "bg-surface-lowest hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                    )}
                  >
                    <div
                      className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all",
                        med.taken ? "bg-tertiary/10 text-tertiary" : "bg-primary/10 text-primary"
                      )}
                    >
                      <Pill size={28} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3
                          className={cn(
                            "text-base font-bold truncate transition-all",
                            med.taken ? "line-through text-on-surface-variant/40" : ""
                          )}
                        >
                          {med.name}
                        </h3>
                        <span className="text-[10px] font-bold text-on-surface-variant/60 bg-surface-low px-2 py-0.5 rounded-md">
                          {med.time}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant/70 mb-3 font-medium">{med.dosage}</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {med.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] font-bold bg-surface-low px-2 py-0.5 rounded-md text-on-surface-variant/60 uppercase tracking-tighter"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => (med.taken ? toggleTaken(med.id) : setConfirmMed(med))}
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-sm",
                        med.taken
                          ? "bg-tertiary text-white shadow-tertiary/20"
                          : "bg-surface-low text-on-surface-variant/30 hover:bg-primary/10 hover:text-primary"
                      )}
                    >
                      <CheckCircle2 size={28} />
                    </button>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Modal isOpen={!!confirmMed} onClose={() => setConfirmMed(null)} title="Confirm Medication">
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <Pill size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">{confirmMed?.name}</p>
              <p className="text-xs text-on-surface-variant">
                {confirmMed?.dosage} - {confirmMed?.time}
              </p>
            </div>
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Are you sure you have taken this medication? This will update your adherence streak.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmMed(null)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={() => (confirmMed ? toggleTaken(confirmMed.id) : null)}>
              Confirm Taken
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
