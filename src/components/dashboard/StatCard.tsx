import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: "default" | "accent" | "success" | "warning";
}

const variantStyles = {
  default: "border-border",
  accent: "border-accent/30 bg-accent/5",
  success: "border-success/30 bg-success/5",
  warning: "border-warning/30 bg-warning/5",
};

const iconVariantStyles = {
  default: "bg-primary/10 text-primary",
  accent: "bg-accent/15 text-accent",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
};

const StatCard = ({ title, value, subtitle, icon: Icon, trend, variant = "default" }: StatCardProps) => {
  return (
    <div className={cn(
      "bg-card rounded-xl border p-5 shadow-card hover:shadow-card-hover transition-all duration-300",
      variantStyles[variant]
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconVariantStyles[variant])}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-full",
            trend.value >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}>
            {trend.value >= 0 ? "+" : ""}{trend.value}%
          </span>
        )}
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>}
    </div>
  );
};

export default StatCard;
