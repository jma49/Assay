import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardTranslationKeys } from './types';

interface LoadingErrorProps {
  error: string | null;
  t: (key: DashboardTranslationKeys) => string;
}

export const LoadingError: React.FC<LoadingErrorProps> = ({ error, t }) => {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md border-destructive bg-card/90 dark:bg-card/90 backdrop-blur-sm">
        <CardHeader>
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
          <CardTitle className="text-center text-destructive">{t('errorTitle')}</CardTitle>
          <CardDescription className="text-center">
            {t('errorDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>{t('errorInfo')}</AlertTitle>
            <AlertDescription className="font-mono text-sm break-all">
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('retry')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}; 