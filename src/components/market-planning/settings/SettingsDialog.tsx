"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { portalContainer } from "../shell/theme";
import m from "./settings.module.css";

/** One look for every settings popup: title, optional lead line, scrolling body and a footer. */
export default function SettingsDialog({
  open,
  onOpenChange,
  title,
  lead,
  wide = false,
  fixedBody = false,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  lead?: string;
  wide?: boolean;
  /** Wide popups with their own scroll areas (the market chooser) keep the body fixed; others scroll as a whole. */
  fixedBody?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={portalContainer()}>
        <Dialog.Overlay className={m.overlay} />
        <Dialog.Content className={`${m.panel} ${wide ? m.panelWide : ""}`} aria-describedby={undefined}>
          <div className={m.head}>
            <div>
              <Dialog.Title className={m.title}>{title}</Dialog.Title>
              {lead ? <p className={m.lead}>{lead}</p> : null}
            </div>
            <Dialog.Close className={m.close} aria-label="Close">
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className={`${m.body} ${wide && fixedBody ? m.bodyWide : ""}`}>{children}</div>
          {footer ? <div className={m.foot}>{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
