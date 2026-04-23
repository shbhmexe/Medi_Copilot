"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileText, Loader2, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Card } from "@/components/patient-portal/ui/base";
import { formatRelativeTimestamp } from "@/lib/patient-portal";
import { cn } from "@/lib/utils";
import { useAuthStore, usePatientPortalStore, type PatientPortalRecord } from "@/store";

interface UploadReportScreenProps {
  onBack: () => void;
  onComplete: (recordId: string) => void;
  isModal?: boolean;
}

function deriveRecordStatus(notes: string, title: string): PatientPortalRecord["status"] {
  const combined = `${notes} ${title}`.toLowerCase();
  if (/(urgent|critical|immediate|severe|alert)/.test(combined)) return "Urgent";
  if (/(follow-up|abnormal|review|attention)/.test(combined)) return "Attention";
  return "Normal";
}

export function UploadReportScreen({
  onBack,
  onComplete,
  isModal = false,
}: UploadReportScreenProps) {
  const { user } = useAuthStore();
  const { ensureProfile, addRecord, addNotification } = usePatientPortalStore();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [recordType, setRecordType] = useState<PatientPortalRecord["recordType"]>("Report");
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureProfile(user);
  }, [ensureProfile, user]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setError(null);
    if (selected && !title.trim()) {
      setTitle(selected.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleAnalyze = async () => {
    if (!user || !file || !title.trim() || !doctorName.trim()) {
      setError("Add file, report title, and doctor name first.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      const generatedSummary = [
        `${recordType} "${title.trim()}" uploaded by ${user.name}.`,
        doctorName.trim() && `Doctor: ${doctorName.trim()}.`,
        hospitalName.trim() && `Hospital: ${hospitalName.trim()}.`,
        notes.trim() ? `Patient notes: ${notes.trim()}.` : "No extra patient notes were added.",
        `Source file: ${file.name}.`,
      ]
        .filter(Boolean)
        .join(" ");
      setSummary(generatedSummary);
    } catch {
      setError("Failed to prepare the record summary. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveRecord = () => {
    if (!user || !file || !summary) return;

    const savedRecord = addRecord({
      userId: user.id,
      title: title.trim(),
      doctorName: doctorName.trim(),
      hospitalName: hospitalName.trim(),
      recordType,
      fileName: file.name,
      notes: notes.trim(),
      summary,
      status: deriveRecordStatus(notes, title),
    });

    addNotification({
      userId: user.id,
      title: "New medical record saved",
      desc: `${savedRecord.title} was added to your records ${formatRelativeTimestamp(savedRecord.uploadedAt)}.`,
      type: "info",
    });

    toast.success("Record saved to patient history.");
    onComplete(savedRecord.id);
  };

  return (
    <div className={cn("space-y-8 w-full", !isModal ? "pb-24 pt-6 px-5 lg:px-10 max-w-screen-2xl mx-auto" : "")}>
      {!isModal ? (
        <header className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 bg-surface-low rounded-2xl active:scale-90 transition-all hover:bg-surface-high"
          >
            <X size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-headline font-extrabold">Upload Report</h1>
            <p className="text-sm text-on-surface-variant">
              Save your real report details into your patient record history
            </p>
          </div>
        </header>
      ) : null}

      {!summary ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-6">
            <Card
              className={cn(
                "border-2 border-dashed border-outline-variant/50 p-8 lg:p-12 flex flex-col items-center justify-center text-center space-y-6 transition-all min-h-[280px] rounded-[2.5rem]",
                file ? "bg-primary/5 border-primary/30" : "bg-surface-low/30 hover:bg-surface-low/50"
              )}
            >
              <div
                className={cn(
                  "w-16 h-16 lg:w-20 lg:h-20 rounded-3xl flex items-center justify-center shadow-lg transition-all",
                  file ? "bg-primary text-white scale-110" : "bg-white text-on-surface-variant/40"
                )}
              >
                {file ? <FileText size={32} /> : <Upload size={32} />}
              </div>

              <div className="space-y-2">
                <p className="text-base font-bold truncate max-w-[240px]">{file ? file.name : "Drop your report here"}</p>
                <p className="text-xs text-on-surface-variant/60">PDF, JPG or PNG up to 10MB</p>
              </div>

              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />

              <label
                htmlFor="file-upload"
                className="bg-primary text-white px-8 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-primary/20 cursor-pointer active:scale-95 transition-all hover:bg-primary-container hover:text-primary"
              >
                {file ? "Change File" : "Browse Files"}
              </label>
            </Card>

            <Card className="rounded-[2rem] border border-primary/10 bg-primary/5 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface">What gets saved?</h3>
                  <p className="text-xs text-on-surface-variant">Only the real details you provide here</p>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-on-surface-variant">
                <li>Report title, doctor name, and hospital</li>
                <li>File name for traceability</li>
                <li>Your own notes and follow-up summary</li>
                <li>Timeline entry inside patient records</li>
              </ul>
            </Card>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <Card className="rounded-[2.5rem] border border-outline-variant/20 bg-surface-lowest p-6 lg:p-8 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">Record Title</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="CBC, CT Scan, Prescription, Discharge Summary..."
                    className="w-full h-12 rounded-2xl bg-surface-low border border-outline-variant/30 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">Doctor Name</span>
                  <input
                    value={doctorName}
                    onChange={(event) => setDoctorName(event.target.value)}
                    placeholder="Doctor name"
                    className="w-full h-12 rounded-2xl bg-surface-low border border-outline-variant/30 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">Hospital / Clinic</span>
                  <input
                    value={hospitalName}
                    onChange={(event) => setHospitalName(event.target.value)}
                    placeholder="Clinic / hospital name"
                    className="w-full h-12 rounded-2xl bg-surface-low border border-outline-variant/30 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">Record Type</span>
                  <select
                    value={recordType}
                    onChange={(event) => setRecordType(event.target.value as PatientPortalRecord["recordType"])}
                    className="w-full h-12 rounded-2xl bg-surface-low border border-outline-variant/30 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option>Report</option>
                    <option>Prescription</option>
                    <option>Scan</option>
                    <option>Visit Note</option>
                  </select>
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">Patient Notes</span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Anything you want to remember or tell the doctor about this report..."
                    className="w-full min-h-36 rounded-[1.75rem] bg-surface-low border border-outline-variant/30 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </label>
              </div>

              {error ? (
                <p className="text-xs text-destructive font-bold text-center bg-error-container/20 py-3 rounded-xl">
                  {error}
                </p>
              ) : null}

              <Button
                className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-primary/10"
                disabled={!file || isProcessing}
                onClick={handleAnalyze}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={20} className="animate-spin mr-2" />
                    Preparing Summary...
                  </>
                ) : (
                  "Prepare Record Summary"
                )}
              </Button>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 flex flex-col items-center text-center space-y-6 p-8 bg-surface-low/30 rounded-[2.5rem]">
            <div className="w-20 h-20 bg-tertiary/10 text-tertiary rounded-3xl flex items-center justify-center shadow-inner">
              <CheckCircle2 size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold font-headline">Summary Ready</h2>
              <p className="text-xs text-on-surface-variant">Review and save this record to your medical history.</p>
            </div>
            <div className="w-full pt-4 space-y-3">
              <Button className="w-full h-12 rounded-xl" onClick={handleSaveRecord}>
                Save to Records
              </Button>
              <Button variant="secondary" className="w-full h-12 rounded-xl" onClick={() => setSummary(null)}>
                Edit Details
              </Button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <Card className="bg-surface-lowest border border-outline-variant/20 p-6 lg:p-8 space-y-6 rounded-[2.5rem] shadow-xl shadow-primary/5">
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles size={20} />
                  <h3 className="text-base font-bold">Record Summary</h3>
                </div>
                <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-primary/10 text-primary">
                  Ready
                </div>
              </div>
              <div className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap font-medium">
                {summary}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
