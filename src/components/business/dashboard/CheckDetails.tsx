import React from "react";
import { AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RawResultsTable } from "./RawResultsTable";
import { Check, CheckStatus, DashboardTranslationKeys } from "./types";

interface CheckDetailsProps {
  check: Check;
  mode: "expanded" | "sheet";
  t: (key: DashboardTranslationKeys) => string;
}

export const CheckDetails: React.FC<CheckDetailsProps> = ({
  check,
  mode,
  t,
}) => {
  const content = (
    <>
      <div className="bg-card/90 dark:bg-card/90 backdrop-blur-sm rounded-lg border p-4">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          {check.statusType === "attention_needed" ? (
            <AlertCircle className="h-4 w-4 text-attention " />
          ) : check.status === CheckStatus.SUCCESS ? (
            <CheckCircle className="h-4 w-4 text-success" />
          ) : (
            <AlertCircle className="h-4 w-4 text-failure" />
          )}
          {t("executionStatus")}
        </h4>
        {check.statusType === "attention_needed" ? (
          <Badge
            variant="outline"
            className="bg-attention/10 text-attention border-attention/30   "
          >
            <AlertCircle className="h-3.5 w-3.5 mr-1 text-attention " />
            {t("needsAttention") || "Attention Needed"}
          </Badge>
        ) : check.status === CheckStatus.SUCCESS ? (
          <Badge
            variant="outline"
            className="bg-success/10 text-success border-success/30   "
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            {t("filterSuccess")}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-failure/10 text-failure border-failure/30   "
          >
            <AlertCircle className="h-3.5 w-3.5 mr-1" />
            {t("filterFailed")}
          </Badge>
        )}
      </div>

      <div className="bg-card/90 dark:bg-card/90 backdrop-blur-sm rounded-lg border p-4">
        <h4 className="text-sm font-semibold mb-2">{t("executionMessage")}</h4>
        <div className="bg-muted/50 p-3 rounded-md text-sm break-words border">
          {check.message || (
            <span className="italic text-muted-foreground">
              {t("noMessage")}
            </span>
          )}
        </div>
      </div>

      {check.findings && (
        <div className="bg-card/90 dark:bg-card/90 backdrop-blur-sm rounded-lg border p-4">
          <h4 className="text-sm font-semibold mb-2">{t("findings")}</h4>
          <div className="bg-attention/10 p-3 rounded-md text-sm text-attention border border-attention/30 break-words">
            {check.findings}
          </div>
        </div>
      )}

      <div className="bg-card/90 dark:bg-card/90 backdrop-blur-sm rounded-lg border p-4">
        <h4 className="text-sm font-semibold mb-2">{t("rawResults")}</h4>
        <RawResultsTable
          results={check.raw_results}
          noDataText={t("noRawData")}
        />
      </div>

      {check.github_run_id && (
        <div className="flex justify-end mt-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hover:bg-primary/10 transition-colors"
          >
            <a
              href={`https://github.com/${process.env.NEXT_PUBLIC_GITHUB_REPO || "your-org/your-repo"}/actions/runs/${check.github_run_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              {t("viewGitHubAction")}
              <ExternalLink size={12} className="ml-1.5" />
            </a>
          </Button>
        </div>
      )}
    </>
  );

  if (mode === "expanded") {
    return (
      <Card className="border overflow-x-hidden">
        <CardContent className="space-y-5 pt-5 px-4 pb-4">
          {content}
        </CardContent>
      </Card>
    );
  }

  return <div className="space-y-6 py-6">{content}</div>;
};
