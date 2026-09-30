"use client";

import { useState } from "react";
import { Loader2, PlugZap } from "lucide-react";
import { toast } from "sonner";
import { apiErrorText } from "@/client/api-errors";
import { sendJson } from "@/client/send-json";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConnectionTestDto, DataSourceDto } from "@/contracts/data-sources";
import type { Copy } from "./copy";
import { canSave, changeForm, emptyForm, formOf, saveBody, testRequest, type Language, type SourceForm } from "./data-sources";
import { TestResult } from "./TestResult";

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-body-sm font-medium">
        {label}
      </Label>
      {children}
      {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * Adds a source, or renames one and replaces its connection. The connection
 * can be tested before saving; on edit an empty connection keeps the stored
 * one (which is never sent back to the browser) and testing tests that.
 */
export function DataSourceDialog({
  open,
  editing,
  language,
  t,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** The source being edited, or null to add one. */
  editing: DataSourceDto | null;
  language: Language;
  t: Copy;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<SourceForm>(emptyForm);
  const [test, setTest] = useState<ConnectionTestDto | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opening the dialog starts the form over (adjusted while rendering).
  const [shown, setShown] = useState<{ open: boolean; editing: DataSourceDto | null }>({ open: false, editing: null });
  if (open !== shown.open || editing !== shown.editing) {
    setShown({ open, editing });
    if (open) {
      setForm(editing ? formOf(editing) : emptyForm());
      setTest(null);
      setError(null);
    }
  }

  const change = (field: "name" | "sourceId" | "connectionString", value: string) => {
    setForm((current) => changeForm(current, field, value));
    // A result belongs to the connection it tested.
    if (field === "connectionString") setTest(null);
  };

  const runTest = async () => {
    const request = testRequest(form, editing);
    if (!request) return setError(t.testFirst);
    setTesting(true);
    setError(null);
    try {
      setTest((await sendJson<{ test: ConnectionTestDto }>(request.url, "POST", request.body)).test);
    } catch (cause) {
      setTest(null);
      setError(apiErrorText(cause, language));
    } finally {
      setTesting(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave(form, editing)) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) await sendJson(`/api/data-sources/${encodeURIComponent(editing.sourceId)}`, "PATCH", saveBody(form, editing));
      else await sendJson("/api/data-sources", "POST", saveBody(form, null));
      toast.success(editing ? t.saved : t.added);
      onSaved();
      onClose();
    } catch (cause) {
      setError(apiErrorText(cause, language));
    } finally {
      setSaving(false);
    }
  };

  const connectionHint = editing ? (editing.display ? t.connectionKeep(editing.display) : t.connectionKeepHidden) : t.connectionHint;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-4" autoComplete="off">
          <DialogHeader>
            <DialogTitle>{editing ? t.editTitle : t.addTitle}</DialogTitle>
            <DialogDescription>{editing ? <span className="font-mono">{editing.sourceId}</span> : t.addDescription}</DialogDescription>
          </DialogHeader>

          <Field id="source-name" label={t.name}>
            <Input id="source-name" value={form.name} onChange={(e) => change("name", e.target.value)} placeholder={t.namePlaceholder} autoFocus />
          </Field>

          <Field id="source-id" label={t.id} hint={editing ? t.idFixed : t.idHint}>
            <Input
              id="source-id"
              value={form.sourceId}
              onChange={(e) => change("sourceId", e.target.value)}
              placeholder="billing-replica"
              disabled={Boolean(editing)}
              className="font-mono [font-variant-ligatures:none]"
            />
          </Field>

          <Field id="source-connection" label={t.connection} hint={connectionHint}>
            <Input
              id="source-connection"
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              value={form.connectionString}
              onChange={(e) => change("connectionString", e.target.value)}
              placeholder="postgres://user:password@host:5432/database?sslmode=require"
              className="font-mono [font-variant-ligatures:none]"
            />
          </Field>

          <div className="grid gap-2">
            <div>
              <Button type="button" variant="outline" size="sm" onClick={runTest} disabled={testing || (!editing && !form.connectionString.trim())}>
                {testing ? <Loader2 className="animate-spin" /> : <PlugZap />}
                {testing ? t.testing : t.testConnection}
              </Button>
            </div>
            {test && <TestResult test={test} t={t} />}
          </div>

          {error && <p className="rounded-md bg-failure-soft px-3 py-2 text-body-sm text-failure">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={saving || !canSave(form, editing)}>
              {saving && <Loader2 className="animate-spin" />}
              {saving ? t.saving : t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
