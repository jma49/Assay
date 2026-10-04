import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/components/common/LanguageProvider";

const COPY = {
  en: {
    title: "Data loading failed",
    description: "Could not connect or process the request. Check your connection or try again later.",
    info: "Error information",
    retry: "Retry load",
  },
  zh: {
    title: "数据加载失败",
    description: "无法连接到服务器或处理请求时出错。请检查您的网络连接或稍后重试。",
    info: "错误信息",
    retry: "重试加载",
  },
};

interface LoadingErrorProps {
  error: string | null;
}

export const LoadingError: React.FC<LoadingErrorProps> = ({ error }) => {
  const t = COPY[useLanguage().language];
  return (
    <div className="flex flex-col justify-center items-center min-h-screen p-4">
      <Card className="w-full max-w-md border-destructive bg-card/90 dark:bg-card/90 backdrop-blur-sm">
        <CardHeader>
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
          <CardTitle className="text-center text-destructive">
            {t.title}
          </CardTitle>
          <CardDescription className="text-center">
            {t.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>{t.info}</AlertTitle>
            <AlertDescription className="font-mono text-body-md break-all">
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => window.location.reload()} className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t.retry}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
