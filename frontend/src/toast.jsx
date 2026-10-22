// toast.jsx - small pop-up messages at the bottom of the screen
import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, CircleCheck } from "lucide-react";

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((text, type = "") => {
    const id = Math.random();
    setItems((x) => [...x, { id, text, type }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      {/* role=status + aria-live: screen readers announce each message */}
      <div role="status" aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {items.map((t) => {
            const Icon = t.type === "error" ? CircleAlert : CircleCheck;
            return (
              <motion.div key={t.id} layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="flex max-w-sm items-center gap-2.5 rounded-lg border bg-popover px-4 py-3 text-sm font-medium text-popover-foreground shadow-float">
                <Icon className={`size-4 shrink-0 ${t.type === "error" ? "text-destructive" : "text-success"}`} aria-hidden="true" />
                {t.text}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
