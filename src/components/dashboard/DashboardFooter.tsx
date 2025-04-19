import React from 'react';
import { DashboardTranslationKeys } from './types';

interface DashboardFooterProps {
  theme: string | undefined;
  t: (key: DashboardTranslationKeys) => string;
}

export const DashboardFooter: React.FC<DashboardFooterProps> = ({ theme, t }) => {
  return (
    <footer className="text-center text-xs text-muted-foreground py-4 border-t">
      <p>{t('footerSystem')} &copy; {new Date().getFullYear()}</p>
      <p className="mt-1">
        {t('footerInfo')}
        <span className="inline-block ml-2 text-primary">
          {t('footerTheme').replace('%s', theme || t('loading'))}
        </span>
      </p>
    </footer>
  );
}; 