import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
  className?: string;
}

const variantStyles = {
  default: "bg-card",
  primary: "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20",
  success: "bg-gradient-to-br from-success/10 to-success/5 border-success/20",
  warning: "bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20",
  destructive: "bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20",
};

const iconStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/20 text-primary",
  success: "bg-success/20 text-success",
  warning: "bg-warning/20 text-warning",
  destructive: "bg-destructive/20 text-destructive",
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-6 shadow-card transition-all duration-300 hover:shadow-elevated",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 pt-1">
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}
              >
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">vs mês anterior</span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-lg",
              iconStyles[variant]
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  );
}
