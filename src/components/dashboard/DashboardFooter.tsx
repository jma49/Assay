import React from "react";
import { DashboardTranslationKeys } from "./types";

interface DashboardFooterProps {
  t: (key: DashboardTranslationKeys) => string;
}

export const DashboardFooter: React.FC<DashboardFooterProps> = ({ t }) => {
  return (
    <footer className="text-center text-xs text-muted-foreground py-6 border-t border-border/20">
      <div className="space-y-2">
        <p className="font-medium">
          {t("footerSystem")} &copy; {new Date().getFullYear()}
        </p>
        <p className="text-muted-foreground/80 leading-relaxed">
          {t("footerInfo")}
        </p>
        <p className="text-muted-foreground/60 font-bold text-xs tracking-wide mt-2">
          INDEPENDENTLY DESIGNED AND DEVELOPED BY{" "}
          <span className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 bg-clip-text text-transparent">
            JINCHENG 🩵
          </span>
        </p>
      </div>
    </footer>
  );
};
