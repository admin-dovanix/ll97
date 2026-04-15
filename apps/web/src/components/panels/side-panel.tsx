"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { PropsWithChildren, ReactNode } from "react";
import { Button } from "../ui/button";

export function SidePanel({
  open,
  onClose,
  title,
  subtitle,
  actions,
  children
}: PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}>) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            aria-label="Close detail panel"
            className="fixed inset-0 z-40 bg-overlay/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            type="button"
            onClick={onClose}
          />
          <motion.aside
            aria-label={title}
            aria-modal="true"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[30rem] flex-col border-l border-border bg-panel shadow-panel"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
          >
            <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div className="space-y-1">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Detail</p>
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                {actions}
                <Button aria-label="Close panel" size="icon" variant="secondary" onClick={onClose}>
                  X
                </Button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
