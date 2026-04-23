"use client";

import { Copy, ExternalLink, QrCode } from "lucide-react";
import ReactQrCode from "react-qr-code";
import { toast } from "sonner";
import { Button, Card } from "@/components/patient-portal/ui/base";
import { cn } from "@/lib/utils";

interface BookingPassProps {
  title?: string;
  subtitle?: string;
  qrValue: string;
  route: string;
  routeLabel?: string;
  compact?: boolean;
}

export function BookingPass({
  title = "Doctor Check-in QR",
  subtitle = "Scan this at the doctor desk to open the consultation record.",
  qrValue,
  route,
  routeLabel = "Doctor Route",
  compact = false,
}: BookingPassProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(route);
      toast.success("Doctor link copied.");
    } catch {
      toast.error("Could not copy the doctor link.");
    }
  };

  return (
    <Card className={cn("border border-primary/10 bg-primary/5 space-y-4", compact ? "p-4 rounded-[1.75rem]" : "p-6 rounded-[2rem]")}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">{title}</p>
          <p className="text-sm text-on-surface-variant leading-relaxed">{subtitle}</p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0">
          <QrCode size={20} />
        </div>
      </div>

      <div className="flex justify-center">
        <div className="rounded-[1.75rem] bg-white p-4 border border-outline-variant/20 shadow-inner">
          <div className="w-52 h-52 flex items-center justify-center">
            <ReactQrCode
              value={qrValue}
              size={208}
              bgColor="#FFFFFF"
              fgColor="#0f172a"
              level="M"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-surface-lowest border border-outline-variant/20 p-4 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">{routeLabel}</p>
        <p className="text-xs font-semibold text-on-surface break-all">{route}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button variant="secondary" className="rounded-2xl" onClick={handleCopy}>
          <Copy size={16} />
          Copy Doctor Link
        </Button>
        <Button
          className="rounded-2xl"
          onClick={() => {
            window.open(route, "_blank", "noopener,noreferrer");
          }}
        >
          <ExternalLink size={16} />
          Open Doctor View
        </Button>
      </div>
    </Card>
  );
}
