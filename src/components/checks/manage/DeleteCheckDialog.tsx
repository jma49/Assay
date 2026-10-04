"use client";

import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/components/common/LanguageProvider";
import type { CheckDefinition } from "@/components/runs/types";
import { manageCopy } from "./copy";

interface DeleteScriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  script: CheckDefinition | null;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function DeleteCheckDialog({ open, onOpenChange, script, onCancel, onConfirm, isSubmitting }: DeleteScriptDialogProps) {
  const t = manageCopy(useLanguage().language);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.deleteTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.deleteMessage(String(script?.name || script?.scriptId || ""))}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{t.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isSubmitting}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isSubmitting && <Loader2 className="mr-0 h-4 w-4 animate-spin" />}
            {t.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
