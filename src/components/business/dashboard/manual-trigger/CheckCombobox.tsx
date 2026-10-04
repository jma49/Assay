import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils/utils";
import type { CheckListItem } from "../types";
import { triggerCopy } from "./copy";
import { filterChecks } from "./script-search";

interface CheckComboboxProps {
  id?: string;
  checks: CheckListItem[];
  value: string;
  onChange: (scriptId: string) => void;
  language: string;
  disabled?: boolean;
}

const displayName = (check: CheckListItem, language: string) => (language === "zh" && check.cnName) || check.name || check.scriptId;

/** Pick one check: a button that opens a searchable list (words match names and ids, `#tag` matches tags). */
export function CheckCombobox({ id, checks, value, onChange, language, disabled }: CheckComboboxProps) {
  const copy = triggerCopy(language);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const matches = useMemo(() => filterChecks(checks, query), [checks, query]);
  const selected = checks.find((check) => check.scriptId === value);

  const openChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setQuery("");
      setActive(Math.max(0, checks.findIndex((check) => check.scriptId === value)));
    }
  };

  const choose = (check: CheckListItem | undefined) => {
    if (!check) return;
    onChange(check.scriptId);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (matches.length === 0 ? 0 : (index + step + matches.length) % matches.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(matches[active]);
    }
  };

  return (
    <Popover open={open} onOpenChange={openChange}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          disabled={disabled}
          className="flex h-8 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-card px-2.5 text-left text-body-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted-foreground")}>
            {selected ? displayName(selected, language) : copy.choose}
          </span>
          {selected && <span className="shrink-0 truncate font-mono text-caption text-muted-foreground max-sm:hidden">{selected.scriptId}</span>}
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <input
          autoFocus
          role="searchbox"
          aria-label={copy.search}
          aria-controls={listId}
          aria-activedescendant={matches[active] ? `${listId}-${active}` : undefined}
          placeholder={copy.search}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="h-9 w-full border-b bg-transparent px-3 text-body-sm outline-none placeholder:text-muted-foreground"
        />
        <ul id={listId} role="listbox" aria-label={copy.check} className="max-h-64 overflow-y-auto p-1">
          {matches.length === 0 ? (
            <li className="px-2 py-3 text-center text-body-sm text-muted-foreground">{copy.noMatch}</li>
          ) : (
            matches.map((check, index) => (
              <li
                key={check.scriptId}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={check.scriptId === value}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(check)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-body-sm",
                  index === active && "bg-muted",
                )}
              >
                <Check className={cn("size-4 shrink-0 text-primary", check.scriptId !== value && "invisible")} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{displayName(check, language)}</span>
                <span className="shrink-0 truncate font-mono text-caption text-muted-foreground max-sm:hidden">{check.scriptId}</span>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
