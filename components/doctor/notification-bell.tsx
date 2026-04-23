"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCheck, ExternalLink, PlusCircle, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuthStore, usePatientStore, type PatientRecord } from "@/store";
import { runAuthorizedRequest } from "@/lib/client-auth";

type DoctorNotificationItem = {
  id: string;
  doctorId: string;
  doctorName: string;
  clinicId?: string;
  bookingId: string;
  patientCode: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  message: string;
  reason: string;
  symptoms: string;
  appointmentDate: string;
  appointmentTime: string;
  specialty: string;
  hospitalName: string;
  handoffRoute: string;
  consultationRoute: string;
  patientRecord: PatientRecord;
  createdAt: string;
  isRead: boolean;
  status: "pending" | "added";
};

export function DoctorNotificationBell() {
  const router = useRouter();
  const { user, accessToken, setUser, clearAuth } = useAuthStore();
  const { patients, addPatient, updatePatient } = usePatientStore();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<DoctorNotificationItem[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const prevCountRef = useRef<number>(0);

  const fetchNotifications = useCallback(async () => {
    if (!user || (user.role !== "doctor" && user.role !== "admin")) {
      setItems([]);
      return;
    }
    // Skip fetch if we have no access token yet (avoids "Failed to fetch" on initial hydration)
    if (!accessToken) return;

    try {
      const response = await runAuthorizedRequest("/api/doctor-inbox", {
        cache: "no-store",
      }, { accessToken, user, setUser, clearAuth });

      if (!response.ok) {
        throw new Error("Could not load notifications");
      }

      const payload = (await response.json()) as { data?: DoctorNotificationItem[] };
      setItems(payload.data || []);
    } catch (error) {
      console.warn("[DoctorBell] Could not load inbox:", error);
    }
  }, [accessToken, clearAuth, setUser, user]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user || (user.role !== "doctor" && user.role !== "admin")) return;

    const intervalId = window.setInterval(() => {
      void fetchNotifications();
    }, 4000);

    const handleFocus = () => {
      void fetchNotifications();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchNotifications, user]);

  const doctorItems = useMemo(() => items, [items]);
  const unreadCount = doctorItems.filter((item) => !item.isRead).length;

  // Fire a toast when new notifications arrive
  useEffect(() => {
    const currentCount = items.length;
    if (currentCount > prevCountRef.current && prevCountRef.current > 0) {
      const newest = items[0];
      if (newest) {
        toast.info(
          `New booking request: ${newest.patientName} – ${newest.specialty} on ${newest.appointmentDate}`,
          { duration: 6000 }
        );
      }
    }
    prevCountRef.current = currentCount;
  }, [items]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      const response = await runAuthorizedRequest("/api/doctor-inbox", {
        method: "PATCH",
      }, { accessToken, user, setUser, clearAuth });

      if (!response.ok) {
        throw new Error("Could not mark all as read");
      }

      setItems((currentItems) =>
        currentItems.map((item) => ({ ...item, isRead: true }))
      );
    } catch (error) {
      console.warn("[DoctorBell] Could not mark all as read:", error);
    }
  };

  const updateNotification = async (
    notificationId: string,
    updates: Partial<Pick<DoctorNotificationItem, "status" | "isRead">>
  ) => {
    const response = await runAuthorizedRequest(`/api/doctor-inbox/${notificationId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    }, { accessToken, user, setUser, clearAuth });

    if (!response.ok) {
      throw new Error("Could not update notification");
    }

    const payload = (await response.json()) as { data?: DoctorNotificationItem };
    if (payload.data) {
      setItems((currentItems) =>
        currentItems.map((item) => (item.id === notificationId ? payload.data! : item))
      );
    }
  };

  const handleDismiss = async (notificationId: string) => {
    try {
      const response = await runAuthorizedRequest(`/api/doctor-inbox/${notificationId}`, {
        method: "DELETE",
      }, { accessToken, user, setUser, clearAuth });

      if (!response.ok) {
        throw new Error("Could not dismiss notification");
      }

      setItems((currentItems) => currentItems.filter((item) => item.id !== notificationId));
    } catch (error) {
      console.warn("[DoctorBell] Could not dismiss notification:", error);
      toast.error("Notification dismiss nahi ho payi.");
    }
  };

  const handleAddToPatients = async (notificationId: string) => {
    const notification = doctorItems.find((item) => item.id === notificationId);
    if (!notification) return;

    const existingPatient = patients.find((patient) => patient.id === notification.patientRecord.id);
    if (existingPatient) {
      updatePatient(notification.patientRecord.id, (currentPatient) => ({
        ...currentPatient,
        ...notification.patientRecord,
        modelResult: currentPatient.modelResult || notification.patientRecord.modelResult || null,
        xrayResult: currentPatient.xrayResult || notification.patientRecord.xrayResult || null,
      }));
    } else {
      addPatient(notification.patientRecord);
    }

    try {
      await updateNotification(notification.id, { status: "added", isRead: true });
      toast.success(`${notification.patientName} added to your patient queue.`);
    } catch (error) {
      console.warn("[DoctorBell] Could not update notification status:", error);
      toast.error("Patient queue me add hua, but notification sync fail ho gaya.");
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="relative p-2 text-[#94a3b8] hover:text-[#16a34a] transition-all"
      >
        <Bell size={20} />
        {unreadCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border border-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 mt-3 w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl shadow-slate-200/60 overflow-hidden z-50">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
            <div>
              <h3 className="text-sm font-bold text-[#1e293b]">Doctor Notifications</h3>
              <p className="text-[11px] text-[#94a3b8]">Only bookings selected for you appear here.</p>
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  className="p-2 rounded-lg text-[#64748b] hover:bg-slate-50 hover:text-[#16a34a]"
                  title="Mark all as read"
                >
                  <CheckCheck size={16} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg text-[#64748b] hover:bg-slate-50"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="max-h-[28rem] overflow-y-auto">
            {doctorItems.length > 0 ? (
              <div className="p-4 space-y-3">
                {doctorItems.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 ${
                      item.isRead ? "border-[#E2E8F0] bg-white" : "border-[#bbf7d0] bg-[#f0fdf4]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-[#1e293b]">{item.patientName}</p>
                        <p className="text-[11px] uppercase tracking-widest text-[#94a3b8]">
                          {item.specialty} • {item.appointmentDate} • {item.appointmentTime}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          item.status === "added"
                            ? "bg-[#dcfce7] text-[#15803d]"
                            : "bg-[#eff6ff] text-[#2563eb]"
                        }`}
                      >
                        {item.status === "added" ? "Added" : "Pending"}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-[#475569] leading-relaxed">{item.message}</p>
                    <p className="mt-2 text-xs text-[#64748b] leading-relaxed">
                      Reason: {item.reason}
                    </p>
                    <p className="mt-1 text-xs text-[#64748b] leading-relaxed">
                      Symptoms: {item.symptoms}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await updateNotification(item.id, { isRead: true });
                          } catch (error) {
                            console.warn("[DoctorBell] Could not mark notification as read:", error);
                          }
                          window.open(item.handoffRoute, "_blank", "noopener,noreferrer");
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-[#1e293b] hover:bg-slate-200"
                      >
                        <ExternalLink size={14} />
                        Open Pass
                      </button>

                      {item.status === "pending" ? (
                        <>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await updateNotification(item.id, { isRead: true });
                            } catch (error) {
                              console.warn("[DoctorBell] Could not mark notification as read:", error);
                            }
                            router.push(`/consultation/${item.patientCode}`);
                            setIsOpen(false);
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#16a34a] px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#15803d]"
                        >
                          <PlusCircle size={14} />
                          Open Consultation
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleAddToPatients(item.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#16a34a]/20 bg-[#f0fdf4] px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-[#16a34a] hover:bg-[#dcfce7]"
                        >
                          <UserPlus size={14} />
                          Add To Patients
                        </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await updateNotification(item.id, { isRead: true });
                            } catch (error) {
                              console.warn("[DoctorBell] Could not mark notification as read:", error);
                            }
                            router.push(`/consultation/${item.patientCode}`);
                            setIsOpen(false);
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#16a34a] px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#15803d]"
                        >
                          <PlusCircle size={14} />
                          Open Consultation
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => void handleDismiss(item.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-[#64748b] hover:bg-slate-50"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-10 text-center">
                <Bell size={28} className="mx-auto text-[#cbd5e1] mb-3" />
                <p className="text-sm font-bold text-[#1e293b]">No booking requests yet</p>
                <p className="mt-1 text-xs text-[#94a3b8]">
                  When a patient chooses you during booking, it will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
