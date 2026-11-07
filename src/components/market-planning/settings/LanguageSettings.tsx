"use client";

import SettingsDialog from "./SettingsDialog";
import LanguagePicker from "../builder/LanguagePicker";
import ui from "../ui.module.css";

/** Agent languages. English is the default; add the languages your team can really support. */
export default function LanguageSettings({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Agent languages"
      lead="Languages decide which markets your team can serve, including audiences abroad."
      footer={
        <button type="button" className={ui.btnPrimary} onClick={() => onOpenChange(false)}>
          Done
        </button>
      }
    >
      <LanguagePicker />
    </SettingsDialog>
  );
}
