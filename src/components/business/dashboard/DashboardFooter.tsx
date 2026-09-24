import React from "react";
import { DashboardTranslationKeys } from "./types";

interface DashboardFooterProps {
  t: (key: DashboardTranslationKeys) => string;
}

export const DashboardFooter: React.FC<DashboardFooterProps> = ({ t }) => {
  return (
    <footer className="flex flex-col gap-1 py-6 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p>
        <span className="font-serif text-[15px] font-semibold text-foreground">
          {t("footerSystem")}
        </span>{" "}
        &copy; {new Date().getFullYear()} · {t("footerInfo")}
      </p>
      <p>Designed and built by Jincheng</p>
    </footer>
  );
};
