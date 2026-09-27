import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompactHashtagFilter } from "@/components/ui/compact-hashtag-filter";
import type { DashboardTranslationKeys } from "../types";

interface HistoryFiltersProps {
  t: (key: DashboardTranslationKeys) => string;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  availableHashtags: string[];
  selectedHashtags: string[];
  onHashtagsChange?: (hashtags: string[]) => void;
}

/** Search by check name, plus the tag filter when any check has tags. */
export function HistoryFilters({
  t,
  searchTerm,
  onSearchChange,
  availableHashtags,
  selectedHashtags,
  onHashtagsChange,
}: HistoryFiltersProps) {
  return (
    <div className="pt-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative sm:col-span-3">
          <Search className="absolute left-3 top-3 z-10 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="border border-input bg-card h-10 w-full rounded-[4px] pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-[color,background-color,border-color,box-shadow,opacity,width] duration-200"
              onClick={() => onSearchChange("")}
            >
              <span className="sr-only">{t("clearSearch")}</span>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {availableHashtags.length > 0 && onHashtagsChange && (
          <div className="sm:col-span-1">
            <CompactHashtagFilter
              availableHashtags={availableHashtags}
              selectedHashtags={selectedHashtags}
              onHashtagsChange={onHashtagsChange}
              className="w-full h-10"
            />
          </div>
        )}
      </div>
    </div>
  );
}
