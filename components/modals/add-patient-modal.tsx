"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  X, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  User, 
  Calendar,
  Database,
  Stethoscope,
  Activity
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  getXrayDisplayFindings,
  getXraySummaryLabel,
  getXrayToneClasses,
} from "@/lib/xray-display";

export interface OnboardingSuccessPayload {
  patientId: string;
  name: string;
  age: number;
  sex: string;
  summary: string;
  rawText?: string;
  clinicalFields?: ClinicalFields | null;
  modelResult?: ModelResult | null;
  xrayResult?: any | null;
  analysisInput?: string;
  xrayImageBase64?: string | null;
}

export interface ClinicalFields {
  chief_complaint?: string;
  medical_history?: string;
  current_medications?: string;
  provisional_diagnosis?: string;
  advice?: string;
  follow_up?: string;
  vitals?: Record<string, string>;
  labs?: Array<{ parameter?: string; value?: string; unit?: string }>;
  document_excerpt?: string;
  structured_summary?: string;
  handwriting_notes?: string;
  source_quality?: string;
  confidence_score?: number;
}

interface Prediction {
  disease: string;
  probability: number;
  icd11_code: string;
}

interface ModelResult {
  predictions: Prediction[];
  matched_keywords: Record<string, string[]>;
  extracted_text?: string;
}

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payload: OnboardingSuccessPayload) => void;
}

import { useAuthStore } from "@/store";

function createLocalPatientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `PAT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  }

  return `PAT-${Date.now().toString(16).slice(-8).toUpperCase()}`;
}

export function AddPatientModal({ isOpen, onClose, onSuccess }: AddPatientModalProps) {
  const { accessToken, user, setUser } = useAuthStore();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: "", age: "", sex: "Male" });
  
  const [file, setFile] = useState<File | null>(null);
  
  // New States
  const [symptomsInput, setSymptomsInput] = useState<string>("");
  const [xrayFile, setXrayFile] = useState<File | null>(null);
  const [xrayResult, setXrayResult] = useState<any | null>(null);
  
  const [isExtractingKeywords, setIsExtractingKeywords] = useState(false);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);

  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [patientId, setPatientId] = useState<string>("");
  const [rawText, setRawText] = useState<string>("");
  const [clinicalFields, setClinicalFields] = useState<ClinicalFields | null>(null);
  const [modelResult, setModelResult] = useState<ModelResult | null>(null);

  const fileToBase64Payload = useCallback((inputFile: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result !== "string") {
          reject(new Error("Could not read file"));
          return;
        }
        resolve(result.split(",")[1] || "");
      };
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(inputFile);
    });
  }, []);

  const runPredictReport = useCallback(async (input: string) => {
    const requestBody = JSON.stringify({ mode: "text", input });
    const buildHeaders = (token: string | null) => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
    const runRequest = (token: string | null) =>
      fetch("/api/predict-report", {
        method: "POST",
        headers: buildHeaders(token),
        credentials: "include",
        body: requestBody,
      });

    let response = await runRequest(accessToken);

    if (response.status === 401 && user) {
      const refreshResponse = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      const refreshData = await refreshResponse.json().catch(() => ({}));
      const refreshedToken =
        typeof refreshData?.data?.access_token === "string"
          ? refreshData.data.access_token
          : null;

      if (refreshResponse.ok && refreshedToken) {
        setUser(user, refreshedToken);
        response = await runRequest(refreshedToken);
      }
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      const errorDetail =
        typeof data?.error === "string"
          ? data.error
          : typeof data?.error?.message === "string"
          ? data.error.message
          : `Prediction failed (HTTP ${response.status})`;
      throw new Error(errorDetail);
    }

    return data as ModelResult & { success?: boolean };
  }, [accessToken, setUser, user]);

  const buildFinalClinicalFields = () => {
    const manualSymptoms = symptomsInput.trim();
    const existingChiefComplaint = clinicalFields?.chief_complaint?.trim() || "";
    const mergedChiefComplaint = manualSymptoms || existingChiefComplaint;

    return {
      ...(clinicalFields || {}),
      chief_complaint: mergedChiefComplaint || undefined,
      document_excerpt:
        clinicalFields?.document_excerpt ||
        rawText.trim() ||
        summary.trim() ||
        undefined,
    } satisfies ClinicalFields;
  };

  const updateClinicalField = useCallback((key: keyof ClinicalFields, value: string) => {
    setClinicalFields((current) => ({
      ...(current || {}),
      [key]: value,
    }));
  }, []);

  const onDropDoc = useCallback((acceptedFiles: File[]) => {
    setFile(acceptedFiles[0]);
    toast.success("Clinical document attached");
  }, []);

  const { getRootProps: getDocRootProps, getInputProps: getDocInputProps, isDragActive: isDocDragActive } = useDropzone({ 
    onDrop: onDropDoc,
    accept: { 'image/*': [], 'application/pdf': [] },
    multiple: false 
  });

  const { getRootProps: getXrayRootProps, getInputProps: getXrayInputProps, isDragActive: isXrayDragActive } = useDropzone({
    onDrop: (accepted) => { setXrayFile(accepted[0]); toast.success("X-Ray attached"); },
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    multiple: false
  });

  const handleStartOnboarding = async () => {
    if (!formData.name || !formData.age) {
        toast.error("Please provide basic patient details");
        return;
    }
    setStep(2);
  };

  const handleProcessDocument = async () => {
    if (!file) {
      toast.error("Please attach a clinical report to proceed, or use quick add.");
      return;
    }

    const localPatientId = patientId || createLocalPatientId();
    setPatientId(localPatientId);
    
    // Jump straight to the Medical input form (Step 4) without a blocking loading screen
    setStep(4);
    setSymptomsInput(""); 
    setSuggestedKeywords([]);
    setIsExtractingKeywords(true);
    setRawText("");
    setClinicalFields(null);
    setModelResult(null);
    
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("name", formData.name);
      uploadData.append("age", formData.age);
      uploadData.append("sex", formData.sex);

      const response = await fetch("/api/ai/add-patient", {
        method: "POST",
        body: uploadData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data?.error?.message || data?.error || `Onboarding failed (HTTP ${response.status})`);
      }

      if (!data.patient_id) {
        toast.warning("AI service did not return a patient id. Using a local visit id.");
      } else {
        setPatientId(data.patient_id);
      }

      setSummary(data.summary || "No summary returned by ingestion service.");
      
      const extractedText = typeof data.raw_text === "string" ? data.raw_text : "";
      setRawText(extractedText);
      const extractedFields = data.clinical_fields || null;
      setClinicalFields(extractedFields);

      const suggestedComplaint =
        extractedFields?.chief_complaint ||
        extractedFields?.provisional_diagnosis ||
        extractedFields?.structured_summary ||
        "";
      if (typeof suggestedComplaint === "string" && suggestedComplaint.trim()) {
        setSymptomsInput(suggestedComplaint.trim());
      }
      
      // Extract keywords silently
      if (extractedText.trim()) {
         try {
           const modelData = await runPredictReport(extractedText);
           if (modelData?.matched_keywords) {
               const kwSet = new Set<string>();
               Object.values(modelData.matched_keywords).forEach((arr: any) => {
                   if (Array.isArray(arr)) arr.forEach((k: string) => kwSet.add(k));
               });
               setSuggestedKeywords(Array.from(kwSet).slice(0, 10)); 
           }
         } catch(e) {}
      }

      if (typeof data.warning === "string" && data.warning.trim()) {
        toast.warning(data.warning);
      }
      
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "Unknown error";
      setSummary("Document extraction did not finish, but the patient can still be reviewed from the queue.");
      toast.error(`Background extraction failed: ${message}`);
    } finally {
      setIsExtractingKeywords(false);
    }
  };

  const handleAnalyzeAll = async () => {
    let finalInputForModel = symptomsInput.trim();
    if (!finalInputForModel) {
        if (rawText.trim()) {
            finalInputForModel = rawText.trim();
        } else {
            toast.error("Provide some symptoms, an X-Ray, or wait for OCR to extract from document.");
            return;
        }
    }

    setStep(5);
    setProcessingStatus("Running comprehensive clinical models...");
    
    try {
      let trainedModelRes = null;
      let xrayResObj = null;
      let xrayImageBase64: string | null = null;

      if (finalInputForModel) {
        setProcessingStatus("Running NLP symptom classifier...");
        try {
          const modelData = await runPredictReport(finalInputForModel);
          trainedModelRes = modelData;
          setModelResult(trainedModelRes);
        } catch (error) {
          const message = error instanceof Error ? error.message : "NLP model failed to analyze symptoms.";
          toast.warning(message);
        }
      }

      if (xrayFile) {
        setProcessingStatus("Running pneumonia subtype and broad X-Ray checks...");
        xrayImageBase64 = await fileToBase64Payload(xrayFile);
        
        const res = await fetch("/api/predict-xray", {
          method: "POST",
          headers: { 
              "Content-Type": "application/json",
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
          },
          credentials: "include",
          body: JSON.stringify({ image: xrayImageBase64 }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          xrayResObj = data.data;
          setXrayResult(xrayResObj);
        } else {
          toast.warning("X-Ray engine failed to classify image.");
        }
      }

      setProcessingStatus("Finalizing clinical record...");
      const finalClinicalFields = buildFinalClinicalFields();
      const finalPatientId = patientId || createLocalPatientId();
      if (!patientId) {
        setPatientId(finalPatientId);
      }
      
      const successPayload: OnboardingSuccessPayload = {
        patientId: finalPatientId,
        name: formData.name.trim(),
        age: Number(formData.age) || 0,
        sex: formData.sex,
        summary,
        rawText,
        clinicalFields: finalClinicalFields,
        modelResult: trainedModelRes || modelResult,
        xrayResult: xrayResObj || xrayResult,
        analysisInput: finalInputForModel,
        xrayImageBase64,
      };

      try {
        localStorage.setItem(`medcopilot:onboarding:${finalPatientId}`, JSON.stringify(successPayload));
      } catch (storageError) {}

      setStep(6);
      onSuccess(successPayload);
      toast.success("Patient diagnostics compiled.");
    } catch (err) {
      setStep(4);
      toast.error("Analysis failed. Please check inputs.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold font-serif text-[#1e293b]">Clinical Onboarding</h3>
            <p className="text-[10px] font-bold text-[#94a3b8] tracking-widest uppercase mt-1">Patient History Ingestion</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200/50 rounded-full transition-all">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-8 max-h-[75vh] overflow-y-auto hidden-scrollbar">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="space-y-4">
                    <div className="relative">
                       <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input 
                         placeholder="Full Name" 
                         value={formData.name}
                         onChange={e => setFormData({...formData, name: e.target.value})}
                         className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 focus:border-[#16a34a] focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm"
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                           <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                           <input 
                             placeholder="Age" 
                             value={formData.age}
                             onChange={e => setFormData({...formData, age: e.target.value})}
                             className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 focus:border-[#16a34a] focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm"
                           />
                        </div>
                        <select 
                          value={formData.sex}
                          onChange={e => setFormData({...formData, sex: e.target.value})}
                          className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 focus:border-[#16a34a] focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm appearance-none"
                        >
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                        </select>
                    </div>
                  </div>
                  <button onClick={handleStartOnboarding} className="w-full py-4 bg-[#1e293b] text-white rounded-2xl font-bold tracking-widest text-xs uppercase hover:bg-black transition-all">
                    Continue to Document Upload
                  </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div {...getDocRootProps()} className={`border-3 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer ${isDocDragActive ? "border-[#16a34a] bg-emerald-50" : "border-slate-100 bg-slate-50 hover:border-slate-200"}`}>
                    <input {...getDocInputProps()} />
                    <UploadCloud size={48} className={`mx-auto mb-4 ${isDocDragActive ? "text-[#16a34a]" : "text-slate-300"}`} />
                    <p className="text-sm font-bold text-slate-600 mb-1">{file ? file.name : "Drag clinical report here"}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PDF or Medical Imagery</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setStep(1)} className="flex-1 py-4 border-2 border-slate-100 text-slate-400 rounded-2xl font-bold text-xs uppercase hover:bg-slate-50 transition-all">Back</button>
                    <button onClick={handleProcessDocument} className="flex-1 py-4 bg-[#16a34a] text-white rounded-2xl font-bold tracking-widest text-xs uppercase shadow-lg shadow-emerald-500/20 hover:bg-[#15803d] transition-all">Next</button>
                  </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="step5" className="py-12 flex flex-col items-center text-center space-y-6">
                 <div className="relative">
                    <Loader2 size={64} className="text-[#16a34a] animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <Activity size={24} className="text-[#16a34a]" />
                    </div>
                 </div>
                 <div>
                    <h4 className="text-xl font-bold font-serif text-[#1e293b] mb-1">
                      Analyzing Diagnostics
                    </h4>
                    <p className="text-[10px] font-bold text-[#16a34a] tracking-widest uppercase">{processingStatus}</p>
                 </div>
                 <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 3 }} className="h-full bg-[#16a34a]" />
                 </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div>
                    <h4 className="text-lg font-bold font-serif text-[#1e293b]">Symptoms & Imagery</h4>
                    <p className="text-xs text-slate-500 mt-1">Add symptoms manually. Optionally attach a Chest X-Ray.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                         Symptoms Outline
                         {isExtractingKeywords && (
                            <span className="flex items-center gap-1.5 text-emerald-500 font-bold animate-pulse">
                               <Loader2 size={10} className="animate-spin" /> EXTRACTING SUGGESTIONS...
                            </span>
                         )}
                      </label>
                      <textarea
                        value={symptomsInput}
                        onChange={(e) => setSymptomsInput(e.target.value)}
                        placeholder="Doctor input: Describe symptoms manually..."
                        className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-semibold focus:border-[#16a34a] focus:bg-white focus:ring-4 focus:ring-emerald-50 outline-none transition-all resize-none"
                      />
                      
                      {!isExtractingKeywords && suggestedKeywords.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Suggested Keywords from Report</p>
                           <div className="flex flex-wrap gap-2">
                             {suggestedKeywords.map(kw => (
                                <button 
                                   key={kw} 
                                   onClick={() => setSymptomsInput(prev => prev ? `${prev}, ${kw}` : kw)}
                                   className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-colors"
                                >
                                   + {kw}
                                </button>
                             ))}
                           </div>
                        </motion.div>
                      )}
                    </div>

                    {(clinicalFields || rawText.trim() || summary.trim()) && (
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold text-[#16a34a] uppercase tracking-widest">
                              AI extracted fields
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1">
                              Review and edit before analysis.
                            </p>
                          </div>
                          {typeof clinicalFields?.confidence_score === "number" && (
                            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-white border border-emerald-100 rounded-lg px-2 py-1">
                              {Math.round(clinicalFields.confidence_score * 100)}%
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          <label className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Relevant History</span>
                            <textarea
                              value={clinicalFields?.medical_history || ""}
                              onChange={(e) => updateClinicalField("medical_history", e.target.value)}
                              placeholder="Past history, clinical history, allergies, comorbidities..."
                              className="w-full min-h-20 bg-white border border-emerald-100 rounded-xl p-3 text-xs font-semibold text-slate-700 focus:border-[#16a34a] outline-none resize-none"
                            />
                          </label>

                          <label className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Medications</span>
                            <textarea
                              value={clinicalFields?.current_medications || ""}
                              onChange={(e) => updateClinicalField("current_medications", e.target.value)}
                              placeholder="Medicine name, dose, frequency, duration..."
                              className="w-full min-h-16 bg-white border border-emerald-100 rounded-xl p-3 text-xs font-semibold text-slate-700 focus:border-[#16a34a] outline-none resize-none"
                            />
                          </label>

                          {(clinicalFields?.provisional_diagnosis || clinicalFields?.advice || clinicalFields?.follow_up) && (
                            <div className="grid grid-cols-1 gap-2 text-xs text-slate-600">
                              {clinicalFields?.provisional_diagnosis && (
                                <p><span className="font-bold text-slate-500">Diagnosis:</span> {clinicalFields.provisional_diagnosis}</p>
                              )}
                              {clinicalFields?.advice && (
                                <p><span className="font-bold text-slate-500">Advice:</span> {clinicalFields.advice}</p>
                              )}
                              {clinicalFields?.follow_up && (
                                <p><span className="font-bold text-slate-500">Follow-up:</span> {clinicalFields.follow_up}</p>
                              )}
                            </div>
                          )}

                          {clinicalFields?.handwriting_notes && (
                            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                              {clinicalFields.handwriting_notes}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block flex items-center justify-between">
                         X-Ray Evidence <span className="text-slate-300">(Optional)</span>
                      </label>
                      <div {...getXrayRootProps()} className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${isXrayDragActive ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-blue-200"}`}>
                        <input {...getXrayInputProps()} />
                        <Stethoscope size={28} className={`mx-auto mb-2 ${isXrayDragActive ? "text-blue-500" : "text-slate-400"}`} />
                        <p className="text-sm font-bold text-slate-600">
                          {xrayFile ? xrayFile.name : "Drop X-Ray image here"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={() => { setStep(2); setSymptomsInput(""); }} className="w-[100px] py-4 border-2 border-slate-100 text-slate-400 rounded-2xl font-bold text-xs uppercase hover:bg-slate-50 transition-all">Back</button>
                    <button disabled={isExtractingKeywords} onClick={handleAnalyzeAll} className="flex-1 py-4 bg-[#16a34a] text-white rounded-2xl font-bold tracking-widest text-xs uppercase shadow-lg shadow-emerald-500/20 hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                       Analyze Symptoms
                    </button>
                  </div>
              </motion.div>
            )}

            {step === 6 && (
              <motion.div key="step6" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col space-y-6">
                 <div className="flex flex-col items-center text-center">
                   <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 size={32} className="text-[#16a34a]" />
                   </div>
                   <h4 className="text-2xl font-bold font-serif text-[#1e293b] mb-1">Analysis Complete</h4>
                   <p className="text-sm font-bold text-[#16a34a] bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest mt-2">{formData.name} (ID: {patientId || "Generating..."})</p>
                 </div>

                 {modelResult?.predictions?.length ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-left">
                    <h5 className="text-[10px] font-bold text-[#16a34a] uppercase tracking-widest mb-3">Predicted Conditions (NLP)</h5>
                    <div className="space-y-2">
                      {modelResult.predictions.slice(0, 3).map((prediction) => (
                        <div key={prediction.disease} className="flex items-center justify-between text-xs font-bold text-slate-600">
                          <span>{prediction.disease}</span>
                          <span className="font-mono text-[#16a34a]">{Math.round(prediction.probability * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                 ) : null}

                 {xrayResult && (() => {
                  const tone = getXrayToneClasses(xrayResult);
                  const findings = getXrayDisplayFindings(xrayResult);
                  const abnormalFindings = findings.filter((finding) => finding.category !== "normal");

                  return (
                  <div className={`border rounded-2xl p-5 text-left ${tone.card}`}>
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex flex-row items-center gap-2">
                       <Stethoscope size={12}/> X-Ray Verdict
                    </h5>
                    <div className="flex justify-between items-start gap-4">
                       <div>
                         <p className={`text-sm font-bold ${tone.text}`}>{getXraySummaryLabel(xrayResult)}</p>
                         {findings.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {findings.slice(0, 4).map((finding) => (
                              <span key={`${finding.source}-${finding.label}`} className="rounded-lg bg-white/70 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                                {finding.label}
                              </span>
                            ))}
                          </div>
                         )}
                       </div>
                       <p className={`text-xs font-mono font-bold ${tone.text}`}>{abnormalFindings.length} findings</p>
                    </div>
                  </div>
                  );
                 })()}

                 <button
                   onClick={() => {
                     onClose();
                     const routePatientId = patientId || createLocalPatientId();
                     router.push(`/consultation/${routePatientId}`);
                   }}
                   className="w-full py-4 bg-[#1e293b] text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all mt-4"
                 >
                    View in Consultation
                 </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
