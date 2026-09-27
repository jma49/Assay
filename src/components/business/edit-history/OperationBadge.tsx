import { Edit, History, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/utils";
import { operationBadgeClass, operationLabel, type Translate } from "./edit-history";

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

export function OperationBadge({ operation, t, className }: { operation: string; t: Translate; className?: string }) {
  return (
    <Badge variant="outline" className={cn(operationBadgeClass(operation), className)}>
      {operationLabel(operation, t)}
    </Badge>
  );
}
