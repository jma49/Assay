import Link from "next/link";
import { Search } from "lucide-react";
import { WindowToolbar } from "@/components/layout/WindowChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { HistoryFilters, OperationFilter, Translate } from "./edit-history";

interface EditHistoryToolbarProps {
  filters: HistoryFilters;
  loading: boolean;
  language: string;
  t: Translate;
  onFiltersChange: (changes: Partial<HistoryFilters>) => void;
  onOperationChange: (operation: OperationFilter) => void;
  onApply: () => void;
  onReset: () => void;
}

/** Search and operation filters inline; author and dates in the "More filters" popover. */
export function EditHistoryToolbar({
  filters,
  loading,
  language,
  t,
  onFiltersChange,
  onOperationChange,
  onApply,
  onReset,
}: EditHistoryToolbarProps) {
  return (
    <WindowToolbar>
      <Button asChild variant="outline" size="sm">
        <Link href="/checks/manage">‹ {language === "zh" ? "脚本" : "Scripts"}</Link>
      </Button>
      <div className="relative w-56 max-sm:w-full">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label={t("scriptName")}
          placeholder={t("searchScriptsPlaceholder")}
          value={filters.scriptName}
          onChange={(e) => onFiltersChange({ scriptName: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && onApply()}
          className="h-7 rounded-full pl-8 text-[13px]"
        />
      </div>
      <Select value={filters.operation} onValueChange={(value) => onOperationChange(value as OperationFilter)}>
        <SelectTrigger size="sm" className="h-7 w-36 text-[13px]" aria-label={t("operationType")}>
          <SelectValue placeholder={t("selectOperationPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("operationAll")}</SelectItem>
          <SelectItem value="create">{t("operationCreate")}</SelectItem>
          <SelectItem value="update">{t("operationUpdate")}</SelectItem>
          <SelectItem value="delete">{t("operationDelete")}</SelectItem>
        </SelectContent>
      </Select>
      <div className="ml-auto flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline">
              {language === "zh" ? "更多筛选…" : "More Filters…"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="author-filter" className="text-[13px]">{t("author")}</Label>
              <Input id="author-filter" value={filters.author} onChange={(e) => onFiltersChange({ author: e.target.value })} className="h-8" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="date-from-filter" className="text-[13px]">{t("dateFrom")}</Label>
                <Input id="date-from-filter" type="date" value={filters.dateFrom} onChange={(e) => onFiltersChange({ dateFrom: e.target.value })} className="h-8" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date-to-filter" className="text-[13px]">{t("dateTo")}</Label>
                <Input id="date-to-filter" type="date" value={filters.dateTo} onChange={(e) => onFiltersChange({ dateTo: e.target.value })} className="h-8" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={onReset} disabled={loading}>
                {t("resetFilters")}
              </Button>
              <Button size="sm" onClick={onApply} disabled={loading}>
                {t("searchEditHistory")}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </WindowToolbar>
  );
}
