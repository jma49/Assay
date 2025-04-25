import React from 'react';
import { DashboardTranslationKeys } from './types';

interface DashboardFooterProps {
  t: (key: DashboardTranslationKeys) => string;
}

export const DashboardFooter: React.FC<DashboardFooterProps> = ({ t }) => {
  return (
    <footer className="text-center text-xs text-muted-foreground py-4 border-t">
      <p>{t('footerSystem')} &copy; {new Date().getFullYear()}</p>
      <p className="mt-1">
        {t('footerInfo')}
      </p>
    </footer>
  );
}; 