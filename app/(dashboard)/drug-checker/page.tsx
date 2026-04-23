"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  Search, 
  Activity,
  Plus,
  Stethoscope,
  Download,
  RefreshCw,
  Loader2,
  X
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore, usePatientStore, type PatientRecord } from "@/store";

type DrugInteraction = {
  drug_a: string;
  drug_b: string;
  severity: string;
  mechanism?: string;
  clinical_significance?: string;
  alternative_suggested?: string | null;
};

export default function DrugCheckerPage() {
  const { accessToken, user, setUser, clearAuth } = useAuthStore();
  const { patients, updatePatient } = usePatientStore();
  const [drugs, setDrugs] = useState<string[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [hasChecked, setHasChecked] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pairsAnalyzed, setPairsAnalyzed] = useState(0);
  const [safeCombinations, setSafeCombinations] = useState(0);
  const [analysisSource, setAnalysisSource] = useState<"neo4j" | "fallback" | null>(null);
  const [neo4jConnected, setNeo4jConnected] = useState<boolean | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const normalizeSeverity = (severity?: string) => severity?.trim().toUpperCase() || "LOW";
  const hasPairReady = drugs.length === 2;
  const pairInteraction = hasPairReady
    ? interactions.find(
        (interaction) =>
          (interaction.drug_a.toLowerCase() === drugs[0].toLowerCase() &&
            interaction.drug_b.toLowerCase() === drugs[1].toLowerCase()) ||
          (interaction.drug_a.toLowerCase() === drugs[1].toLowerCase() &&
            interaction.drug_b.toLowerCase() === drugs[0].toLowerCase())
      ) || null
    : null;

  const addDrug = (drugName: string) => {
    const nextDrug = drugName.trim();
    if (!nextDrug) return;
    if (drugs.some((drug) => drug.toLowerCase() === nextDrug.toLowerCase())) {
      return;
    }
    if (drugs.length >= 2) {
      toast.error("Only 2 drugs can be compared at one time.");
      return;
    }

    setDrugs([...drugs, nextDrug]);
    setInputVal("");
    setSearchResults([]);
    setShowSuggestions(false);
    setHasChecked(false);
  };

  const handleAddDrug = () => {
    addDrug(inputVal);
  };

  const removeDrug = (d: string) => {
    setDrugs(drugs.filter(i => i !== d));
    setHasChecked(false);
    setInteractions([]);
    setPairsAnalyzed(0);
    setSafeCombinations(0);
    setAnalysisSource(null);
  };

  useEffect(() => {
    const query = inputVal.trim();
    if (query.length < 2 || drugs.length >= 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const buildHeaders = (token: string | null) => ({
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        });

        const runRequest = (token: string | null) =>
          fetch(`/api/drugs/search?q=${encodeURIComponent(query)}`, {
            headers: buildHeaders(token),
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          });

        let res = await runRequest(accessToken);

        if (res.status === 401 && user) {
          const refreshRes = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include",
          });
          const refreshData = await refreshRes.json().catch(() => ({}));
          const refreshedToken =
            typeof refreshData?.data?.access_token === "string"
              ? refreshData.data.access_token
              : null;

          if (refreshRes.ok && refreshedToken) {
            setUser(user, refreshedToken);
            res = await runRequest(refreshedToken);
          } else {
            clearAuth();
            setSearchResults([]);
            setShowSuggestions(false);
            toast.error("Session expired. Please log in again.");
            return;
          }
        }

        const payload = await res.json().catch(() => ({}));
        if (!res.ok || payload?.success === false) {
          throw new Error(
            typeof payload?.error?.message === "string"
              ? payload.error.message
              : "Drug search failed."
          );
        }
        const suggestions: unknown[] = Array.isArray(payload?.data) ? payload.data : [];
        setSearchResults(
          suggestions.filter(
            (drug: unknown): drug is string =>
              typeof drug === "string" &&
              !drugs.some((selectedDrug) => selectedDrug.toLowerCase() === drug.toLowerCase())
          )
        );
      } catch (error) {
        if (!(error instanceof Error) || error.name !== "AbortError") {
          setSearchResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [inputVal, drugs, accessToken, user, setUser, clearAuth]);

  const checkInteractions = async () => {
    if (drugs.length !== 2) {
      toast.error("Please select exactly 2 drugs to compare.");
      return;
    }

    setIsChecking(true);
    try {
      const requestBody = JSON.stringify({ drugs });
      const buildHeaders = (token: string | null) => ({
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      });
      const runRequest = (token: string | null) =>
        fetch("/api/drug-interactions", {
          method: "POST",
          headers: buildHeaders(token),
          credentials: "include",
          body: requestBody,
        });

      let res = await runRequest(accessToken);

      if (res.status === 401 && user) {
        const refreshRes = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        const refreshData = await refreshRes.json().catch(() => ({}));
        const refreshedToken =
          typeof refreshData?.data?.access_token === "string"
            ? refreshData.data.access_token
            : null;

        if (refreshRes.ok && refreshedToken) {
          setUser(user, refreshedToken);
          res = await runRequest(refreshedToken);
        } else {
          clearAuth();
          throw new Error("Session expired. Please log in again.");
        }
      }

      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) {
        const message =
          typeof payload?.error?.message === "string"
            ? payload.error.message
            : "Failed to check drug interactions.";
        throw new Error(message);
      }

      const data = payload.data || {};
      const nextInteractions = Array.isArray(data.interactions) ? data.interactions : [];

      setInteractions(nextInteractions);
      setPairsAnalyzed(typeof data.pairs_analyzed === "number" ? data.pairs_analyzed : 0);
      setSafeCombinations(typeof data.safe_combinations === "number" ? data.safe_combinations : 0);
      setAnalysisSource(data.source === "fallback" ? "fallback" : "neo4j");
      setNeo4jConnected(typeof data.neo4j_connected === "boolean" ? data.neo4j_connected : null);
      setHasChecked(true);
      toast.success(`Check complete. Found ${nextInteractions.length} interaction${nextInteractions.length !== 1 ? "s" : ""}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to connect to the intelligence engine.";
      toast.error(message);
    } finally {
      setIsChecking(false);
    }
  };

  // Helper to determine matrix cell color
  const getCellStatus = (d1: string, d2: string) => {
    if (d1 === d2) return "bg-slate-50";
    const conflict = interactions.find(it => 
      (it.drug_a.toLowerCase() === d1.toLowerCase() && it.drug_b.toLowerCase() === d2.toLowerCase()) ||
      (it.drug_a.toLowerCase() === d2.toLowerCase() && it.drug_b.toLowerCase() === d1.toLowerCase())
    );
    if (!conflict) return "bg-[#16a34a]/10";
    return conflict.severity.toUpperCase().includes("MAJOR") ? "bg-[#ca4d4d]" : "bg-[#ca8a04]";
  };

  const buildMergedMedicationList = (existingMedications?: string) => {
    const existing = (existingMedications || "")
      .split(/[;,\n]/)
      .map((medication) => medication.trim())
      .filter(Boolean);

    const merged = [...existing];
    for (const drug of drugs) {
      if (!merged.some((medication) => medication.toLowerCase() === drug.toLowerCase())) {
        merged.push(drug);
      }
    }

    return merged.join("; ");
  };

  const buildSyncedPatientRecord = (patient: PatientRecord): PatientRecord => ({
    ...patient,
    clinicalFields: {
      ...(patient.clinicalFields || {}),
      current_medications: buildMergedMedicationList(patient.clinicalFields?.current_medications),
    },
  });

  const persistPatientSync = (patient: PatientRecord) => {
    const syncedPatient = buildSyncedPatientRecord(patient);
    updatePatient(patient.id, syncedPatient);

    try {
      const cacheKey = `medcopilot:onboarding:${patient.id}`;
      const cachedPayload = localStorage.getItem(cacheKey);
      const parsedPayload = cachedPayload ? JSON.parse(cachedPayload) : {};

      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          ...parsedPayload,
          patientId: syncedPatient.id,
          name: syncedPatient.name,
          age: syncedPatient.age,
          sex: syncedPatient.gender,
          summary: syncedPatient.complaint,
          rawText: syncedPatient.rawText,
          clinicalFields: syncedPatient.clinicalFields,
          modelResult: syncedPatient.modelResult,
        })
      );
    } catch (storageError) {
      console.warn("Unable to update patient sync cache:", storageError);
    }

    toast.success(`Drug check synced to ${patient.name}`);
    setIsSyncModalOpen(false);
  };

  const handleExportClinicalReport = () => {
    if (!hasChecked || !hasPairReady) {
      toast.error("Run a 2-drug comparison before exporting.");
      return;
    }

    const generatedAt = new Date();
    const reportText = [
      "MEDCOPILOT DRUG INTERACTION REPORT",
      `Generated: ${generatedAt.toLocaleString()}`,
      `Analysis source: ${analysisSource === "neo4j" ? "Neo4j Graph Analysis" : "Clinical Fallback Rules"}`,
      `Neo4j connected: ${neo4jConnected ? "Yes" : "No"}`,
      "",
      `Drug A: ${drugs[0]}`,
      `Drug B: ${drugs[1]}`,
      `Pairs analyzed: ${pairsAnalyzed}`,
      `Safe combinations: ${safeCombinations}`,
      "",
      pairInteraction
        ? `Interaction severity: ${normalizeSeverity(pairInteraction.severity)}`
        : "Interaction severity: LOW",
      pairInteraction?.mechanism
        ? `Mechanism: ${pairInteraction.mechanism}`
        : "Mechanism: No clinically significant interaction detected for this pair.",
      pairInteraction?.clinical_significance
        ? `Clinical significance: ${pairInteraction.clinical_significance}`
        : "Clinical significance: Routine clinical monitoring remains appropriate.",
      `Recommended action: ${pairInteraction?.alternative_suggested || "Continue standard clinical monitoring."}`,
    ].join("\n");

    const safeName = drugs.map((drug) => drug.toLowerCase().replace(/[^a-z0-9]+/g, "-")).join("-vs-");
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `drug-interaction-report-${safeName}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast.success("Clinical report exported");
  };

  const handleSyncToPatientRecord = () => {
    if (!hasChecked || !hasPairReady) {
      toast.error("Run a 2-drug comparison before syncing.");
      return;
    }

    if (patients.length === 0) {
      toast.error("No patient records available to sync.");
      return;
    }

    if (patients.length === 1) {
      persistPatientSync(patients[0]);
      return;
    }

    setIsSyncModalOpen(true);
  };

  return (
    <div className="p-10 max-w-[1400px] mx-auto bg-white min-h-screen">
      {/* Header Section */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold font-serif text-[#1e293b] mb-4">Drug Interaction Checker</h1>
        <div className="flex items-center gap-4">
           <div className="h-0.5 w-64 bg-[#16a34a]" />
           <div className="flex h-6 items-center px-4 rounded-full bg-[#f1fdf4] border border-[#dcfce7] text-[10px] font-bold tracking-widest text-[#16a34a] uppercase">
              <div className="w-1.5 h-1.5 bg-[#16a34a] rounded-full mr-2 animate-pulse" />
              Intelligence Mode // Active
           </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-10 mb-12 shadow-sm">
         <h3 className="text-sm font-bold text-[#1e293b] mb-4">Input drug profile</h3>
         <div className="flex gap-4">
            <div className="relative flex-1">
              <div className="flex flex-wrap gap-2 p-3 border-2 border-[#16a34a]/30 focus-within:border-[#16a34a] rounded-xl transition-all min-h-[56px]">
                 {drugs.map(d => (
                   <motion.span 
                     initial={{ scale: 0.8, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     key={d} 
                     className="px-4 py-1.5 bg-[#167c58] text-white text-xs font-bold rounded-lg flex items-center gap-2"
                   >
                      {d}
                      <button type="button" onClick={() => removeDrug(d)} className="hover:scale-110"><Plus size={14} className="rotate-45" /></button>
                   </motion.span>
                 ))}
                 <input 
                   value={inputVal}
                   onChange={e => {
                      setInputVal(e.target.value);
                      setShowSuggestions(true);
                    }}
                   disabled={drugs.length >= 2}
                   onFocus={() => setShowSuggestions(true)}
                   onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 120);
                   }}
                   onKeyDown={e => {
                     if (e.key === "Enter") {
                       e.preventDefault();
                       handleAddDrug();
                     }
                   }}
                   placeholder={drugs.length >= 2 ? "Pairwise mode active: remove one drug to change selection" : "Search drugs..."}
                   className="flex-1 min-w-[200px] bg-transparent border-none outline-none text-sm text-[#475569] font-bold"
                 />
              </div>
              <AnimatePresence>
                {showSuggestions && (isSearching || searchResults.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-2xl border border-[#E2E8F0] bg-white shadow-xl overflow-hidden"
                  >
                    {isSearching ? (
                      <div className="px-4 py-3 text-xs font-bold tracking-widest uppercase text-[#94a3b8] flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin" />
                        Searching drug graph...
                      </div>
                    ) : (
                      searchResults.map((result) => (
                        <button
                          key={result}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            addDrug(result);
                          }}
                          className="w-full px-4 py-3 text-left text-sm font-semibold text-[#334155] hover:bg-[#f8fafc] transition-colors"
                        >
                          {result}
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button 
              onClick={checkInteractions}
              disabled={isChecking}
              className="bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white px-8 rounded-xl text-xs font-bold tracking-widest uppercase flex items-center gap-2 shadow-lg shadow-green-600/20 active:scale-95 transition-all"
            >
               {isChecking ? <Loader2 size={18} className="animate-spin" /> : <Stethoscope size={18} />}
               Check Interactions
            </button>
         </div>
         <p className="mt-4 text-[10px] font-bold tracking-widest uppercase text-[#94a3b8]">
           Pairwise mode: compare exactly 2 drugs at a time for a cleaner risk matrix.
         </p>
      </div>

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {hasChecked ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
             {/* Clinical Analysis Column */}
             <div className="lg:col-span-6 space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-[#f1fdf4] border border-[#dcfce7] text-[10px] font-bold tracking-widest uppercase text-[#16a34a]">
                    {analysisSource === "neo4j" ? "Neo4j Graph Analysis" : "Clinical Fallback Rules"}
                  </span>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[#94a3b8]">
                    Pairs analyzed: {pairsAnalyzed}
                  </span>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[#94a3b8]">
                    Safe combinations: {safeCombinations}
                  </span>
                  {neo4jConnected === false && (
                    <span className="text-[10px] font-bold tracking-widest uppercase text-[#ca8a04]">
                      Neo4j unavailable
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold font-serif text-[#1e293b] mb-2">Clinical Analysis</h2>
                {interactions.length > 0 ? (
                  interactions.map((it, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white border-2 border-[#E2E8F0] rounded-2xl p-8 shadow-md"
                    >
                       <span className={`inline-block px-3 py-1 ${it.severity.toUpperCase().includes("MAJOR") ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"} text-[10px] font-bold tracking-widest uppercase rounded-lg mb-4`}>
                          {it.severity}
                       </span>
                       <h3 className="text-3xl font-bold font-serif text-[#1e293b] mb-4">{it.drug_a} + {it.drug_b}</h3>
                       <p className="text-sm font-semibold text-[#64748b] leading-relaxed mb-8 italic">
                         &ldquo;{it.mechanism || "No mechanism returned."}&rdquo;
                       </p>
                       {it.clinical_significance && (
                         <p className="text-sm text-[#475569] leading-relaxed mb-6">
                           {it.clinical_significance}
                         </p>
                       )}
                       <div className="flex items-start gap-4 p-4 bg-[#f1fdf4] border border-[#dcfce7] rounded-xl text-[#16a34a]">
                          <Activity size={20} className="shrink-0" />
                          <div className="text-xs font-bold tracking-widest uppercase flex flex-col gap-1">
                             <span>Recommended Action</span>
                             <span className="text-[#64748b] font-medium tracking-normal text-sm capitalize">{it.alternative_suggested || "Continue standard clinical monitoring"}</span>
                          </div>
                       </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="p-12 text-center bg-emerald-50 rounded-2xl border-2 border-dashed border-emerald-200">
                    <CheckCircle2 size={48} className="mx-auto text-[#16a34a] mb-4" />
                    <p className="text-lg font-bold text-[#14532d] font-serif">
                      {analysisSource === "neo4j"
                        ? "No graph interactions detected for this drug profile."
                        : "No fallback interaction rules were triggered for this drug profile."}
                    </p>
                  </div>
                )}
             </div>

             {/* Matrix Column */}
             <div className="lg:col-span-6 space-y-8">
                <h2 className="text-2xl font-bold font-serif text-[#1e293b]">Dynamic Risk Matrix</h2>
                
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-sm">
                   {hasPairReady ? (
                     <div className="space-y-8">
                       <div className="mx-auto max-w-[520px]">
                         <div className="grid grid-cols-[140px_repeat(2,minmax(0,1fr))] gap-3 items-center">
                           <div />
                           {drugs.map((drug) => (
                             <div key={`matrix-col-${drug}`} className="text-center text-[11px] font-bold uppercase tracking-widest text-[#94a3b8]">
                               {drug}
                             </div>
                           ))}

                           {drugs.map((rowDrug) => (
                             <div key={`matrix-row-${rowDrug}`} className="contents">
                               <div className="pr-3 text-sm font-semibold text-[#64748b]">{rowDrug}</div>
                               {drugs.map((colDrug) => {
                                 const isDiagonal = rowDrug === colDrug;
                                 const cellStatus = getCellStatus(rowDrug, colDrug);
                                 const interactionSeverity = pairInteraction ? normalizeSeverity(pairInteraction.severity) : "LOW";
                                 return (
                                   <div
                                     key={`${rowDrug}-${colDrug}`}
                                     className={`h-28 rounded-2xl border border-[#E2E8F0] flex flex-col items-center justify-center px-3 text-center transition-colors ${
                                       isDiagonal ? "bg-slate-50 text-[#94a3b8]" : cellStatus
                                     }`}
                                   >
                                     {isDiagonal ? (
                                       <>
                                         <span className="text-[10px] font-bold tracking-widest uppercase">Self</span>
                                         <span className="mt-2 text-xs font-semibold">No comparison</span>
                                       </>
                                     ) : (
                                       <>
                                         <span className="text-[11px] font-bold tracking-widest uppercase text-white">
                                           {interactionSeverity}
                                         </span>
                                         <span className="mt-2 text-xs font-semibold text-white/90">
                                           {pairInteraction ? "Interaction flagged" : "No major signal"}
                                         </span>
                                       </>
                                     )}
                                   </div>
                                 );
                               })}
                             </div>
                           ))}
                         </div>
                       </div>

                       <div className="rounded-2xl border border-[#E2E8F0] bg-[#f8fafb] p-5">
                         <div className="flex flex-wrap items-center justify-between gap-4">
                           <div>
                             <p className="text-[10px] font-bold tracking-widest uppercase text-[#94a3b8]">Compared Pair</p>
                             <p className="mt-2 text-lg font-bold font-serif text-[#1e293b]">{drugs[0]} + {drugs[1]}</p>
                           </div>
                           <div className={`px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest uppercase ${
                             pairInteraction
                               ? normalizeSeverity(pairInteraction.severity) === "MAJOR"
                                 ? "bg-red-50 text-red-500"
                                 : "bg-amber-50 text-amber-600"
                               : "bg-emerald-50 text-emerald-600"
                           }`}>
                             {pairInteraction ? `${normalizeSeverity(pairInteraction.severity)} risk` : "Low risk"}
                           </div>
                         </div>
                       </div>

                       <div className="grid grid-cols-3 gap-4 text-center text-[10px] font-bold tracking-widest uppercase text-[#94a3b8]">
                         <span>Low Risk</span>
                         <span>Pairwise Interaction</span>
                         <span>High Risk</span>
                       </div>
                     </div>
                   ) : (
                     <div className="rounded-2xl border border-dashed border-[#E2E8F0] bg-[#f8fafb] px-6 py-16 text-center">
                       <p className="text-lg font-bold font-serif text-[#1e293b] mb-2">Pairwise matrix ready</p>
                       <p className="text-sm text-[#94a3b8] max-w-sm mx-auto">
                         Select exactly two drugs and run the checker to render a clean side-by-side risk matrix.
                       </p>
                     </div>
                   )}
                </div>

                <div className="flex gap-4">
                   <button
                     onClick={handleExportClinicalReport}
                     disabled={!hasChecked || !hasPairReady}
                     className="flex-1 py-4 border-2 border-[#16a34a] text-[#16a34a] rounded-xl text-[10px] font-bold tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-[#f1fdf4] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                      <Download size={16} /> Export clinical Report
                   </button>
                   <button
                     onClick={handleSyncToPatientRecord}
                     disabled={!hasChecked || !hasPairReady}
                     className="flex-1 py-4 border-2 border-[#16a34a] text-[#16a34a] rounded-xl text-[10px] font-bold tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-[#f1fdf4] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                      <RefreshCw size={16} /> Sync to Patient Record
                   </button>
                </div>
             </div>
          </motion.div>
        ) : (
          <div className="text-center py-32 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
             <Search className="mx-auto text-[#94a3b8] mb-4" size={48} />
             <p className="text-xl font-bold text-[#64748b] font-serif mb-2">Awaiting Prescription Analysis</p>
             <p className="text-sm text-[#94a3b8] max-w-sm mx-auto">Add drugs to the profile above and trigger the clinical intelligence engine to check for polypharmacy risks.</p>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSyncModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/25 backdrop-blur-sm p-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="w-full max-w-xl rounded-3xl border border-[#E2E8F0] bg-white p-8 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-[#16a34a] mb-2">Sync Drug Check</p>
                  <h3 className="text-2xl font-bold font-serif text-[#1e293b]">Choose patient record</h3>
                  <p className="mt-2 text-sm text-[#64748b]">
                    We&apos;ll add these medications to the selected patient&apos;s current medications field.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(false)}
                  className="rounded-full border border-[#E2E8F0] p-2 text-[#64748b] hover:text-[#1e293b] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mb-5 rounded-2xl border border-[#dcfce7] bg-[#f1fdf4] px-4 py-3">
                <p className="text-[10px] font-bold tracking-widest uppercase text-[#16a34a]">Selected drugs</p>
                <p className="mt-2 text-sm font-semibold text-[#1e293b]">{drugs.join(" + ")}</p>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {patients.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => persistPatientSync(patient)}
                    className="w-full rounded-2xl border border-[#E2E8F0] px-4 py-4 text-left hover:border-[#16a34a] hover:bg-[#f8fafb] transition-all"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-[#1e293b]">{patient.name}</p>
                        <p className="mt-1 text-[10px] font-bold tracking-widest uppercase text-[#94a3b8]">
                          {patient.gender} • {patient.age} years • ID: {patient.id}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold tracking-widest uppercase text-[#16a34a]">Sync</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
