import { Search, X } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { Button } from "@/components/ui/button";
import { CompactHashtagFilter } from "@/components/ui/compact-hashtag-filter";
import { Input } from "@/components/ui/input";
import { runsCopy } from "./copy";

interface HistoryFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  availableHashtags: string[];
  selectedHashtags: string[];
  onHashtagsChange?: (hashtags: string[]) => void;
}

/** Search by check name or id, plus the tag filter when any check has tags. */
export function HistoryFilters({
  searchTerm,
  onSearchChange,
  availableHashtags,
  selectedHashtags,
  onHashtagsChange,
}: HistoryFiltersProps) {
  const copy = runsCopy(useLanguage().language);
  return (
    <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-4">
      <div className="relative sm:col-span-3">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label={copy.search}
          placeholder={copy.search}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => onSearchChange("")}
          >
            <span className="sr-only">{copy.clearSearch}</span>
            <X className="size-3.5" />
          </Button>
        )}
      </div>

      {availableHashtags.length > 0 && onHashtagsChange && (
        <CompactHashtagFilter
          availableHashtags={availableHashtags}
          selectedHashtags={selectedHashtags}
          onHashtagsChange={onHashtagsChange}
          className="h-8 w-full"
        />
      )}
    </div>
  );
}
