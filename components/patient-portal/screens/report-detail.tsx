"use client";

import { ArrowLeft, FileText, Info, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { Badge, Button, Card } from "@/components/patient-portal/ui/base";
import { formatRelativeTimestamp } from "@/lib/patient-portal";
import { useAuthStore, usePatientPortalStore } from "@/store";

export function ReportDetailScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const { user } = useAuthStore();
  const { records } = usePatientPortalStore();
  const record = records.find((entry) => entry.id === id && entry.userId === user?.id);

  if (!record) {
    return (
      <div className="pb-24 pt-6 px-5 lg:px-10 space-y-8 max-w-screen-2xl mx-auto">
        <header className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 bg-surface-low rounded-2xl active:scale-90 transition-all hover:bg-surface-high"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-headline font-extrabold">Record Not Found</h1>
            <p className="text-sm text-on-surface-variant">This record is not available in your patient history.</p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-6 px-5 lg:px-10 space-y-8 max-w-screen-2xl mx-auto">
      <header className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="p-2.5 bg-surface-low rounded-2xl active:scale-90 transition-all hover:bg-surface-high"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-headline font-extrabold">{record.title}</h1>
          <p className="text-sm text-on-surface-variant">
            {record.recordType} · {record.doctorName || "Doctor not added"} · {formatRelativeTimestamp(record.uploadedAt)}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="bg-primary/5 border border-primary/10 p-6 space-y-4 rounded-[2rem] shadow-xl shadow-primary/5">
              <div className="flex items-center gap-3 text-primary">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <FileText size={20} />
                </div>
                <h3 className="text-lg font-bold">Record Summary</h3>
              </div>
              <p className="text-sm text-on-surface leading-relaxed font-medium">{record.summary}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge
                  status={
                    record.status === "Normal"
                      ? "Normal"
                      : record.status === "Attention"
                      ? "Attention"
                      : "Urgent"
                  }
                >
                  {record.status}
                </Badge>
                <Badge status="Info" className="bg-surface-low text-on-surface-variant border-transparent">
                  {record.recordType}
                </Badge>
              </div>
            </Card>
          </motion.div>

          <Card className="p-6 bg-surface-low/30 border border-outline-variant/20 rounded-3xl space-y-4">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Info size={16} className="text-primary" />
              Record Metadata
            </h4>
            <div className="space-y-3 text-sm text-on-surface-variant">
              <p><span className="font-bold text-on-surface">File:</span> {record.fileName}</p>
              <p><span className="font-bold text-on-surface">Doctor:</span> {record.doctorName || "Not added"}</p>
              <p><span className="font-bold text-on-surface">Hospital:</span> {record.hospitalName || "Not added"}</p>
              <p><span className="font-bold text-on-surface">Uploaded:</span> {formatRelativeTimestamp(record.uploadedAt)}</p>
            </div>
          </Card>

          <div className="space-y-3">
            <Button className="w-full h-14 rounded-2xl shadow-lg shadow-primary/10">
              Download Record Summary
            </Button>
            <Button variant="secondary" className="w-full h-14 rounded-2xl">
              <Share2 size={16} />
              Share With Doctor
            </Button>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">
              Patient Notes
            </h2>
            <Badge status="Info" className="bg-surface-low text-on-surface-variant border-transparent">
              Record ID: {record.id}
            </Badge>
          </div>

          <Card className="p-6 space-y-6 border border-outline-variant/10 hover:border-primary/20 transition-all hover:shadow-lg hover:shadow-primary/5 rounded-[2rem]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">Summary</p>
              <p className="text-sm text-on-surface leading-relaxed">{record.summary}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">Notes Added By Patient</p>
              <p className="text-sm text-on-surface leading-relaxed">
                {record.notes || "No patient notes were added for this record."}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
