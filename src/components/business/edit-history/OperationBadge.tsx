import { Edit, History, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/utils";
import { editHistoryCopy } from "./copy";
import { operationBadgeClass, operationLabel } from "./edit-history";

export function OperationIcon({ operation }: { operation: string }) {
  switch (operation) {
    case "create":
      return <Plus className="w-4 h-4 text-success" />;
    case "update":
      return <Edit className="w-4 h-4 text-muted-foreground" />;
    case "delete":
      return <Trash2 className="w-4 h-4 text-failure" />;
    default:
      return <History className="w-4 h-4 text-muted-foreground" />;
  }
}

export function OperationBadge({ operation, className }: { operation: string; className?: string }) {
  const copy = editHistoryCopy(useLanguage().language);
  return (
    <Badge variant="outline" className={cn(operationBadgeClass(operation), className)}>
      {operationLabel(operation, copy)}
    </Badge>
  );
}
