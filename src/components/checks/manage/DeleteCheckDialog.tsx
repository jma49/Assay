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
import type { DashboardTranslationKeys, CheckDefinition } from "@/components/business/dashboard/types";

interface DeleteScriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  script: CheckDefinition | null;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  t: (key: DashboardTranslationKeys | string) => string;
}

export function DeleteCheckDialog({ open, onOpenChange, script, onCancel, onConfirm, isSubmitting, t }: DeleteScriptDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("confirmDeleteScriptTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("confirmDeleteScriptMessage").replace(
              "{scriptName}",
              String(script?.name || script?.scriptId || ""),
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{t("cancelButton")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isSubmitting}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isSubmitting && <Loader2 className="mr-0 h-4 w-4 animate-spin" />}
            {t("deleteButton")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
