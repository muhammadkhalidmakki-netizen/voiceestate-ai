"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { portalContainer } from "../market-planning/shell/theme";
import v from "./v2.module.css";

/** A slide-in panel for the heavier pickers (markets, languages), so the left column stays light. */
export default function Sheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={open ? portalContainer() : undefined}>
        <Dialog.Overlay className={v.overlay} />
        <Dialog.Content className={v.sheet} aria-describedby={undefined}>
          <div className={v.sheetHead}>
            <Dialog.Title className={v.sheetTitle}>{title}</Dialog.Title>
            <Dialog.Close className={v.iconCircle} aria-label="Close">
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className={v.sheetBody}>{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
