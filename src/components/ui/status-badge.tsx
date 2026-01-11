import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors",
  {
    variants: {
      status: {
        approved: "bg-success/10 text-success border-success/30",
        pending: "bg-warning/10 text-warning border-warning/30",
        rejected: "bg-destructive/10 text-destructive border-destructive/30",
        in_process: "bg-info/10 text-info border-info/30",
        in_mediation: "bg-warning/10 text-warning border-warning/30",
        authorized: "bg-info/10 text-info border-info/30",
        cancelled: "bg-muted text-muted-foreground border-muted-foreground/30",
        refunded: "bg-secondary text-secondary-foreground border-secondary-foreground/30",
        charged_back: "bg-destructive/10 text-destructive border-destructive/30",
        active: "bg-success/10 text-success border-success/30",
        inactive: "bg-muted text-muted-foreground border-muted-foreground/30",
        suspended: "bg-warning/10 text-warning border-warning/30",
        connected: "bg-success/10 text-success border-success/30",
        disconnected: "bg-muted text-muted-foreground border-muted-foreground/30",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  className?: string;
  children: React.ReactNode;
  pulse?: boolean;
}

export function StatusBadge({
  status,
  className,
  children,
  pulse = false,
}: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              status === "approved" || status === "active" || status === "connected"
                ? "bg-success"
                : status === "pending" || status === "in_process" || status === "in_mediation"
                ? "bg-warning"
                : status === "rejected" || status === "charged_back"
                ? "bg-destructive"
                : "bg-muted-foreground"
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              status === "approved" || status === "active" || status === "connected"
                ? "bg-success"
                : status === "pending" || status === "in_process" || status === "in_mediation"
                ? "bg-warning"
                : status === "rejected" || status === "charged_back"
                ? "bg-destructive"
                : "bg-muted-foreground"
            )}
          />
        </span>
      )}
      {children}
    </span>
  );
}
