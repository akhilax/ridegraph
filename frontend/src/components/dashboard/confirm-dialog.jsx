// confirm-dialog.jsx - "Are you sure?" modal used before destructive actions (cancel ride).
// Built on the shadcn/Radix Dialog: focus is trapped inside, Esc closes it, and focus
// returns to the button that opened it.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export function ConfirmDialog({
  trigger, title, description, confirmLabel = "Confirm", cancelLabel = "Keep it", onConfirm, destructive = true,
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">{cancelLabel}</Button></DialogClose>
          <Button variant={destructive ? "destructive" : "default"}
            className={destructive ? "bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive dark:text-primary-foreground" : undefined}
            onClick={() => { setOpen(false); onConfirm(); }}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
