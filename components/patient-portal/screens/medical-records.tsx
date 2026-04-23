"use client";

import { useEffect, useState } from "react";
import { ChevronRight, ClipboardList, FileSearch, FileText, Search } from "lucide-react";
import { motion } from "framer-motion";
import { Badge, Card } from "@/components/patient-portal/ui/base";
import { cn } from "@/lib/utils";
import { formatRelativeTimestamp } from "@/lib/patient-portal";
import { useAuthStore, usePatientPortalStore, type PatientPortalRecord } from "@/store";

const RECORD_FILTERS: Array<"All" | PatientPortalRecord["recordType"]> = [
  "All",
  "Report",
  "Prescription",
  "Scan",
  "Visit Note",
];

function monthLabel(dateValue: string) {
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return "Recent";
  return parsedDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function MedicalRecordsScreen({ onSelectRecord }: { onSelectRecord: (id: string) => void }) {
  const { user } = useAuthStore();
  const { ensureProfile, records } = usePatientPortalStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<(typeof RECORD_FILTERS)[number]>("All");

  useEffect(() => {
    ensureProfile(user);
  }, [ensureProfile, user]);

  const patientRecords = records
    .filter((record) => record.userId === user?.id)
    .filter((record) => {
      if (activeFilter !== "All" && record.recordType !== activeFilter) return false;
      const query = searchTerm.trim().toLowerCase();
      if (!query) return true;
      return [record.title, record.doctorName, record.hospitalName, record.notes, record.summary]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });

  const groupedMap = new Map<string, PatientPortalRecord[]>();
  patientRecords.forEach((record) => {
    const key = monthLabel(record.uploadedAt);
    groupedMap.set(key, [...(groupedMap.get(key) || []), record]);
  });
  const groupedRecords = [...groupedMap.entries()];

  return (
    <div className="pb-24 pt-6 px-5 lg:px-10 space-y-8 max-w-screen-2xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-headline font-extrabold">Medical Records</h1>
          <p className="text-sm text-on-surface-variant">Your uploaded reports, prescriptions, scans, and visit notes</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search reports, doctors, hospitals..."
              className="w-full bg-surface-low border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar sm:pb-0">
            {RECORD_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                  activeFilter === filter
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "bg-surface-low text-on-surface-variant hover:bg-surface-high"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </header>

      {groupedRecords.length > 0 ? (
        <div className="space-y-12">
          {groupedRecords.map(([month, monthRecords]) => (
            <section key={month} className="space-y-6">
              <div className="flex items-center gap-4">
                <h2 className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest whitespace-nowrap">
                  {month}
                </h2>
                <div className="h-px bg-outline-variant/30 flex-1" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {monthRecords.map((record) => (
                  <motion.div
                    key={record.id}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectRecord(record.id)}
                  >
                    <Card className="flex items-center gap-4 p-5 cursor-pointer group border border-outline-variant/20 hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5 rounded-[1.8rem]">
                      <div
                        className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                          record.recordType === "Prescription" ? "bg-tertiary/10 text-tertiary" : "bg-primary/10 text-primary"
                        )}
                      >
                        {record.recordType === "Prescription" ? <ClipboardList size={28} /> : <FileText size={28} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1.5 gap-3">
                          <h3 className="text-base font-bold truncate pr-2 group-hover:text-primary transition-colors">
                            {record.title}
                          </h3>
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
                        </div>
                        <p className="text-xs text-on-surface-variant/70 font-medium">
                          {record.recordType} · {record.doctorName || "Doctor not added"}
                        </p>
                        <p className="text-xs text-on-surface-variant/70 mt-1">
                          {record.hospitalName || "Hospital not added"} · {formatRelativeTimestamp(record.uploadedAt)}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-surface-low flex items-center justify-center text-on-surface-variant/30 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                        <ChevronRight size={18} />
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-surface-low rounded-[2rem] border-2 border-dashed border-outline-variant/20">
          <FileSearch className="mx-auto text-on-surface-variant/40 mb-4" size={48} />
          <p className="text-lg font-bold text-on-surface font-headline">No records found</p>
          <p className="text-sm text-on-surface-variant mt-2">
            Upload your real reports and prescriptions to build your medical history here.
          </p>
        </div>
      )}
    </div>
  );
}
