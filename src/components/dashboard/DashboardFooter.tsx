import React from 'react';
import { DashboardTranslationKeys } from './types';

interface DashboardFooterProps {
  t: (key: DashboardTranslationKeys) => string;
}

export const DashboardFooter: React.FC<DashboardFooterProps> = ({ t }) => {
  return (
    <footer className="text-center text-xs text-muted-foreground py-6 border-t border-border/20">
      <div className="space-y-2">
        <p className="font-medium">{t('footerSystem')} &copy; {new Date().getFullYear()}</p>
        <p className="text-muted-foreground/80 leading-relaxed">
          {t('footerInfo')}
        </p>
      </div>
    </footer>
  );
}; 