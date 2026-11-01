// app-shell.jsx - the frame around every dashboard: top navbar, page header, optional sidebar
import { motion } from "motion/react";
import { Car, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/auth";
import { ThemeToggle } from "@/theme";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ROLE_META = {
  rider: { label: "Rider", icon: UserRound },
  driver: { label: "Driver", icon: Car },
  admin: { label: "Admin", icon: ShieldCheck },
};

export function Navbar() {
  const { session, signOut } = useAuth();
  if (!session) return null;
  const role = ROLE_META[session.role] || ROLE_META.rider;
  const RoleIcon = role.icon;
  const name = session.user.name || "there";
  return (
    <header className="sticky top-0 z-40 border-b bg-card/85 backdrop-blur-md supports-[backdrop-filter]:bg-card/70">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-8">
        <BrandMark />
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
          <RoleIcon className="size-3.5" aria-hidden="true" />{role.label}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="mr-2 flex items-center gap-3">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary" aria-hidden="true">
              {name[0]?.toUpperCase()}
            </span>
            <span className="text-sm">Hi, <span className="font-semibold">{name}</span></span>
          </div>
          <ThemeToggle />
          <Button variant="outline" onClick={signOut}><LogOut aria-hidden="true" />Log out</Button>
        </div>
      </div>
    </header>
  );
}

// wide desktop page container
export function Page({ className, children }) {
  return <main className={cn("mx-auto w-full max-w-[1600px] px-8 pt-8 pb-16", className)}>{children}</main>;
}

// big page title + subtitle + optional right-hand content
export function PageHeader({ title, subtitle, actions }) {
  return (
    <motion.div className="mb-8 flex items-end justify-between gap-6"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="min-w-0">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <div className="mt-1.5 text-muted-foreground">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </motion.div>
  );
}

// left navigation for pages with several sections (admin). Links jump to the section.
export function SectionNav({ items, label = "Sections" }) {
  return (
    <nav aria-label={label} className="sticky top-24 hidden w-56 shrink-0 self-start lg:block">
      <ul className="grid gap-1">
        {items.map(({ id, label: text, icon: Icon }) => (
          <li key={id}>
            <a href={`#${id}`}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground">
              {Icon && <Icon className="size-4" aria-hidden="true" />}{text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
