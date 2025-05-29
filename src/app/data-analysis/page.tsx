"use client"; // Assuming client-side interactions might be added later

import React, { useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Settings, BarChart2, TableIcon, Info } from 'lucide-react';
import { useLanguage } from '@/components/ClientLayoutWrapper';
import { dashboardTranslations, DashboardTranslationKeys } from '@/components/dashboard/types';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DataAnalysisPage() {
  const { language } = useLanguage();

  const t = useCallback((key: DashboardTranslationKeys | string): string => {
    const langTranslations = dashboardTranslations[language] || dashboardTranslations.en;
    return langTranslations[key as keyof typeof langTranslations] || key.toString();
  }, [language]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="space-y-8 animate-fadeIn">
          {/* Header Section */}
          <header className="text-center lg:text-left">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="space-y-2">
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  {t('dataAnalysisTitle') || 'Data Analysis'}
                </h1>
                <p className="text-lg text-muted-foreground">
                  {t('dataAnalysisSubTitle') || 'Explore trends and insights from your script execution data.'}
                </p>
              </div>
              <Link href="/" passHref legacyBehavior>
                <Button variant="outline" size="lg" className="group shadow-md hover:shadow-lg transition-all duration-300" asChild>
                  <a>
                    <Home className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                    {t('backToDashboardButton') || 'Back to Dashboard'}
                  </a>
                </Button>
              </Link>
            </div>
          </header>

          {/* Analysis Parameters Card */}
          <Card className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40">
            {/* 装饰性背景 */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
            
            <CardHeader className="relative px-6 py-5 border-b border-border/30 bg-gradient-to-r from-muted/20 to-muted/10">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20 group-hover:ring-primary/30 transition-all duration-300">
                  <Settings className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold text-foreground">
                    {t('selectAnalysisParamsTitle') || 'Analysis Parameters'}
                  </CardTitle>
                  <CardDescription className="text-base text-muted-foreground">
                    {t('selectAnalysisParamsDesc') || 'Filter data to refine your analysis.'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="relative px-6 py-6 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-start">
                <div className="space-y-3">
                  <Label htmlFor="date-range" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-primary" />
                    {t('dateRangeLabel') || 'Date Range'}
                  </Label>
                  <Input 
                    id="date-range" 
                    type="text" 
                    placeholder="Select date range (e.g., using a date picker)" 
                    disabled 
                    className="h-12 text-base border-2 border-border/50 bg-background/50"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="script-type" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
                    {t('scriptTypeLabel') || 'Script Type'}
                  </Label>
                  <Select disabled>
                    <SelectTrigger id="script-type" className="h-12 text-base border-2 border-border/50 bg-background/50">
                      <SelectValue placeholder="Select script type (e.g., Check, Validate)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="check">{t('scriptTypes.check') || 'Check'}</SelectItem>
                      <SelectItem value="validate">{t('scriptTypes.validate') || 'Validate'}</SelectItem>
                      <SelectItem value="monitor">{t('scriptTypes.monitor') || 'Monitor'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="analysis-period" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <TableIcon className="h-4 w-4 text-primary" />
                    {t('analysisPeriodLabel') || 'Analysis Period'}
                  </Label>
                  <Select disabled>
                    <SelectTrigger id="analysis-period" className="h-12 text-base border-2 border-border/50 bg-background/50">
                      <SelectValue placeholder="Select period (e.g., Daily, Weekly)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t('daily') || 'Daily'}</SelectItem>
                      <SelectItem value="weekly">{t('weekly') || 'Weekly'}</SelectItem>
                      <SelectItem value="monthly">{t('monthly') || 'Monthly'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button disabled size="lg" className="shadow-md">
                  <BarChart2 className="mr-2 h-5 w-5" />
                  {t('generateReportButton') || 'Generate Report'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Results Card */}
          <Card className="group relative overflow-hidden border-2 border-border/20 bg-gradient-to-br from-card via-card to-card/90 shadow-lg hover:shadow-xl transition-all duration-500 hover:border-border/40">
            {/* 装饰性背景 */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
            
            <CardHeader className="relative px-6 py-5 border-b border-border/30 bg-gradient-to-r from-muted/20 to-muted/10">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 ring-2 ring-primary/20 group-hover:ring-primary/30 transition-all duration-300">
                  <BarChart2 className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold text-foreground">
                    {t('analysisResultsTitle') || 'Analysis Results'}
                  </CardTitle>
                  <CardDescription className="text-base text-muted-foreground">
                    {t('analysisResultsDesc') || 'Visualizations and summaries will appear here.'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="relative px-6 py-6 space-y-6">
              <div className="bg-gradient-to-r from-background/80 to-background/60 rounded-xl border-2 border-dashed border-border/30 shadow-md overflow-hidden">
                <div className="p-8 flex flex-col items-center justify-center min-h-[200px] space-y-4">
                  <div className="p-4 rounded-xl bg-primary/10 ring-2 ring-primary/20">
                    <BarChart2 className="h-12 w-12 text-primary" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">{t('chartPlaceholderTitle') || 'Performance Trend (Placeholder)'}</h3>
                    <p className="text-sm text-muted-foreground">{t('noDataForAnalysis') || 'No data available for analysis under the current criteria.'}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-background/80 to-background/60 rounded-xl border-2 border-dashed border-border/30 shadow-md overflow-hidden">
                <div className="p-8 flex flex-col items-center justify-center min-h-[150px] space-y-4">
                  <div className="p-4 rounded-xl bg-primary/10 ring-2 ring-primary/20">
                    <TableIcon className="h-12 w-12 text-primary" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">{t('summaryTablePlaceholderTitle') || 'Key Metrics Summary (Placeholder)'}</h3>
                    <p className="text-sm text-muted-foreground">{t('noDataForAnalysis') || 'No data available for analysis under the current criteria.'}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-border/30 p-6">
                <div className="flex items-center justify-center gap-3 text-center">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Info className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-foreground font-medium">{t('comingSoonMessage') || 'More detailed analysis features are coming soon! Stay tuned.'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 