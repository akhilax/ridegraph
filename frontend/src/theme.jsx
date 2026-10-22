// theme.jsx - light / dark mode. Follows the OS setting until the user picks one.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Moon, Sun } from "lucide-react";

const KEY = "ridegraph-theme";            // "light" | "dark" | missing (= follow the OS)
const ThemeContext = createContext({ theme: "light", toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

function systemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function savedTheme() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => savedTheme() || systemTheme());

  // keep the .dark class on <html> in sync (index.html sets it before first paint)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  // follow OS changes as long as the user has not chosen manually
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if (!savedTheme()) setTheme(systemTheme()); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try { localStorage.setItem(KEY, next); } catch { /* private mode: just don't remember */ }
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

// Sun / moon button. 44x44 touch target, labelled for screen readers.
export function ThemeToggle({ className = "" }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button type="button" onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}
      className={`inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground ${className}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} className="inline-flex">
          {dark ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
