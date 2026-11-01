// panel.jsx - a titled section card + the empty / loading / error states every list uses
import { CircleAlert, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Section card: title, optional count badge, optional description, optional actions on the right
export function Panel({ title, count, description, actions, className, bodyClassName, children, id, ...rest }) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId}
      className={cn("scroll-mt-24 rounded-lg border bg-card shadow-card", className)} {...rest}>
      <header className="flex items-start justify-between gap-4 border-b px-6 py-4">
        <div className="min-w-0">
          <h2 id={headingId} className="flex items-center gap-2.5 text-base font-semibold">
            {title}
            {count != null && (
              <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary tabular-nums"
                aria-label={`${count} items`}>{count}</span>
            )}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className={cn("p-6", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon, title, description, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-md border border-dashed px-6 py-10 text-center", className)}>
      {Icon && (
        <span className="mb-3 inline-flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-6" aria-hidden="true" />
        </span>
      )}
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

// onRetry is optional; when given it simply calls the page's existing loader again
export function ErrorState({ message, onRetry, className }) {
  return (
    <div role="alert" className={cn("flex items-start gap-3 rounded-md border border-destructive/30 bg-danger-soft p-4 text-sm", className)}>
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-semibold text-destructive">Something went wrong</p>
        <p className="mt-0.5 text-destructive/90">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}><RotateCw aria-hidden="true" />Retry</Button>
      )}
    </div>
  );
}

// grey placeholder rows while a list loads
export function ListSkeleton({ rows = 3, className }) {
  return (
    <div className={cn("grid gap-3", className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-md border p-4">
          <div className="grid flex-1 gap-2"><Skeleton className="h-4 w-3/5" /><Skeleton className="h-3 w-2/5" /></div>
          <Skeleton className="h-5 w-16" /><Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
