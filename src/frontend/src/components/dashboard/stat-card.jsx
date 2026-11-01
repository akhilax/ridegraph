// stat-card.jsx - one headline number (earnings, rides, rating, status ...)
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CountUp } from "./motion-kit";
import { EASE_OUT } from "@/lib/motion";

const TINTS = {
  primary: "bg-primary-soft text-primary",
  gold: "bg-gold/15 text-gold dark:text-gold",
  success: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-destructive",
};

// value: a number (counts up, formatted with `format`) or any node (e.g. a badge)
export function StatCard({ icon: Icon, label, value, format, hint, tint = "primary", i = 0, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: i * 0.06, ease: EASE_OUT }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      className={cn("flex items-start gap-4 rounded-lg border bg-card p-5 shadow-card transition-shadow duration-200 hover:shadow-float", className)}>
      {Icon && (
        <span className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-md", TINTS[tint])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold tracking-tight xl:text-[1.75rem]">
          {typeof value === "number" ? <CountUp value={value} format={format} /> : value}
        </div>
        {hint && <div className="mt-1 truncate text-xs text-muted-foreground">{hint}</div>}
      </div>
    </motion.div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="flex items-start gap-4 rounded-lg border bg-card p-5 shadow-card" aria-hidden="true">
      <Skeleton className="size-11 rounded-md" />
      <div className="grid flex-1 gap-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-7 w-32" /></div>
    </div>
  );
}
