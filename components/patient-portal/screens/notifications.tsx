"use client";

import { ArrowLeft, Bell, CheckCircle2, Clock, AlertCircle, Settings, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button, Card } from "@/components/patient-portal/ui/base";
import { cn } from "@/lib/utils";
import { formatRelativeTimestamp } from "@/lib/patient-portal";
import { useAuthStore, usePatientPortalStore } from "@/store";

const ICONS = {
  success: CheckCircle2,
  info: Bell,
  urgent: AlertCircle,
};

export function NotificationsScreen({ onBack }: { onBack?: () => void }) {
  const { user } = useAuthStore();
  const { notifications, markAllNotificationsRead, dismissNotification } = usePatientPortalStore();

  const items = notifications.filter((notification) => notification.userId === user?.id);
  const unreadItems = items.filter((notification) => !notification.isRead);
  const readItems = items.filter((notification) => notification.isRead);

  return (
    <div className="pb-24 pt-6 px-5 lg:px-10 space-y-8 max-w-screen-2xl mx-auto">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="p-2.5 bg-surface-low rounded-2xl active:scale-90 transition-all hover:bg-surface-high lg:hidden"
            >
              <ArrowLeft size={20} />
            </button>
          ) : null}
          <div>
            <h1 className="text-2xl font-headline font-extrabold">Notifications</h1>
            <p className="text-sm text-on-surface-variant">Updates based on your real bookings, records, and profile actions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="p-3 bg-surface-low rounded-2xl text-on-surface-variant/60 hover:bg-surface-high transition-all"
          >
            <Settings size={20} />
          </button>
          <Button
            size="sm"
            variant="secondary"
            className="hidden sm:flex rounded-xl"
            onClick={() => (user ? markAllNotificationsRead(user.id) : null)}
          >
            Mark all as read
          </Button>
        </div>
      </header>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <h2 className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">Unread</h2>
                <div className="h-px bg-outline-variant/20 flex-1" />
              </div>
              <div className="space-y-4">
                {(unreadItems.length > 0 ? unreadItems : readItems.slice(0, 2)).map((notification) => {
                  const Icon = ICONS[notification.type];
                  return (
                    <motion.div key={notification.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <Card
                        className={cn(
                          "p-5 flex gap-5 items-start transition-all hover:shadow-md border border-outline-variant/10",
                          notification.type === "urgent" ? "bg-error-container/10 border-destructive/20" : "bg-surface-lowest"
                        )}
                      >
                        <div
                          className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                            notification.type === "success"
                              ? "bg-tertiary/10 text-tertiary"
                              : notification.type === "urgent"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          <Icon size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1 gap-3">
                            <h3 className="text-base font-bold">{notification.title}</h3>
                            <span className="text-[10px] font-bold text-on-surface-variant/40 bg-surface-low px-2 py-0.5 rounded-md">
                              {formatRelativeTimestamp(notification.time)}
                            </span>
                          </div>
                          <p className="text-sm text-on-surface-variant/80 leading-relaxed">{notification.desc}</p>
                          <div className="mt-4 flex gap-3">
                            <Button size="sm" className="rounded-xl h-8 text-[11px] px-4" onClick={() => (user ? markAllNotificationsRead(user.id) : null)}>
                              Mark Read
                            </Button>
                            <button
                              type="button"
                              onClick={() => dismissNotification(notification.id)}
                              className="text-[11px] font-bold text-on-surface-variant/40 hover:text-primary transition-colors"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </section>

            {readItems.length > 0 ? (
              <section className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                  <h2 className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">Earlier</h2>
                  <div className="h-px bg-outline-variant/20 flex-1" />
                </div>
                <div className="space-y-4">
                  {readItems.map((notification) => {
                    const Icon = ICONS[notification.type];
                    return (
                      <Card
                        key={notification.id}
                        className="p-5 flex gap-5 items-start opacity-70 bg-surface-low/50 border border-transparent hover:opacity-100 hover:bg-surface-lowest hover:border-outline-variant/20 transition-all"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-surface-low text-on-surface-variant/40 flex items-center justify-center shrink-0">
                          <Icon size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-3 mb-1">
                            <h3 className="text-base font-bold">{notification.title}</h3>
                            <span className="text-[10px] font-bold text-on-surface-variant/40">
                              {formatRelativeTimestamp(notification.time)}
                            </span>
                          </div>
                          <p className="text-sm text-on-surface-variant/70 leading-relaxed">{notification.desc}</p>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="lg:col-span-4 space-y-6">
            <Card className="bg-gradient-to-br from-primary to-primary-container p-8 relative overflow-hidden rounded-[2rem] shadow-xl shadow-primary/20">
              <div className="relative z-10 space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-white/20 text-white">
                    Summary
                  </div>
                  <h4 className="text-white font-bold text-2xl leading-tight font-headline">
                    {unreadItems.length} unread update{unreadItems.length === 1 ? "" : "s"}
                  </h4>
                  <p className="text-white/80 text-sm leading-relaxed">
                    Every booking, record upload, and profile update appears here automatically.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-white text-primary rounded-2xl px-8 w-full font-bold shadow-lg"
                  onClick={() => (user ? markAllNotificationsRead(user.id) : null)}
                >
                  Mark Everything Read
                </Button>
              </div>
              <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            </Card>

            <Card className="p-6 bg-surface-low/30 border border-outline-variant/20 rounded-3xl">
              <h4 className="text-sm font-bold mb-4">Notification Controls</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-on-surface-variant">Unread notifications</span>
                  <span className="text-sm font-extrabold text-on-surface">{unreadItems.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-on-surface-variant">Total notifications</span>
                  <span className="text-sm font-extrabold text-on-surface">{items.length}</span>
                </div>
                <Button
                  variant="secondary"
                  className="w-full rounded-2xl text-destructive hover:bg-destructive/5"
                  onClick={() => items.forEach((notification) => dismissNotification(notification.id))}
                >
                  <Trash2 size={16} />
                  Clear All
                </Button>
              </div>
            </Card>
          </aside>
        </div>
      ) : (
        <div className="text-center py-24 bg-surface-low rounded-[2rem] border-2 border-dashed border-outline-variant/20">
          <Bell className="mx-auto text-on-surface-variant/40 mb-4" size={48} />
          <p className="text-lg font-bold text-on-surface font-headline">No notifications yet</p>
          <p className="text-sm text-on-surface-variant mt-2">
            Save your health profile, upload a report, or book an appointment to start receiving updates.
          </p>
        </div>
      )}
    </div>
  );
}
