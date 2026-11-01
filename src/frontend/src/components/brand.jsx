// brand.jsx - the RideGraph logo mark + wordmark (used on the login page and in the navbar)
import { CarTaxiFront } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className, inverted = false }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-bold tracking-tight", className)}>
      <span className={cn("inline-flex size-9 items-center justify-center rounded-md",
        inverted ? "bg-gold text-gold-foreground" : "bg-primary text-primary-foreground")}>
        <CarTaxiFront className="size-5" aria-hidden="true" />
      </span>
      <span className="text-lg">
        Ride<span className={inverted ? "text-gold" : "text-primary"}>Graph</span>
      </span>
    </span>
  );
}
