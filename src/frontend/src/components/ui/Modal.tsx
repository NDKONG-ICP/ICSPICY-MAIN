import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  /** Don't show the × button */
  hideClose?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  hideClose,
  size = "md",
}: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.dialog
            key="panel"
            open
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
              "w-full mx-4 bg-card border border-border rounded-xl shadow-elevated overflow-hidden",
              sizeMap[size],
              className,
            )}
          >
            {(title || !hideClose) && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                {title && (
                  <h2 className="font-display font-semibold text-lg text-foreground">
                    {title}
                  </h2>
                )}
                {!hideClose && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    aria-label="Close modal"
                    className="ml-auto -mr-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
            <div className="px-6 py-4">{children}</div>
          </motion.dialog>
        </>
      )}
    </AnimatePresence>
  );
}
