import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dayKeyParts } from "@/lib/utils/datetime";
import type { DailyTrendPoint } from "./analytics";
import { CHART_COLORS } from "./chart-colors";

const ANIMATIONS = `
  @keyframes progressFill {
    from {
      transform: scaleX(0);
      opacity: 0;
    }
    to {
      transform: scaleX(1);
      opacity: 1;
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .trend-item {
    animation: fadeInUp 0.3s ease-out both;
  }
`;

/** The last 14 days, newest first, each with its pass rate and a success/failure bar. */
export function DailyBreakdown({ days, language, t }: { days: DailyTrendPoint[]; language: string; t: (key: string) => string }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ANIMATIONS }} />
      <Card className="relative overflow-hidden gap-0 py-0">

        <CardHeader className="relative border-b px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <CardTitle>
                {language === "zh" ? "每日明细" : "Daily breakdown"}
              </CardTitle>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative px-6 py-6">
          <div className="space-y-3">
            {days
              .slice(-14)
              .reverse()
              .map((day, index) => {
                const successRate =
                  day.executions > 0
                    ? (day.successes / day.executions) * 100
                    : 0;

                return (
                  <div
                    key={day.date}
                    className="trend-item group/item relative overflow-hidden rounded-lg p-4 transition-[color,background-color,border-color,box-shadow,opacity,width] duration-300 border border-border/30 hover:border-border/50  "
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover/item:opacity-100 transition-opacity duration-500" />

                    <div className="relative flex items-center gap-4">
                      <div className="flex-none">
                        <div className="w-16 h-14 rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-[color,background-color,border-color,box-shadow,opacity,width] duration-300 group-hover/ text-muted-foreground border border-border/40 hover:border-border/60">
                          <div className="font-mono font-bold text-sm">
                            {dayKeyParts(day.date, language).day}
                          </div>
                          <div className="text-[10px] opacity-80 font-medium">
                            {dayKeyParts(day.date, language).month}
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-foreground">
                              {day.executions} {t("executionsLabel")}
                            </span>
                            {day.executions > 0 && (
                              <Badge
                                variant="outline"
                                className={`text-xs font-medium px-3 py-1 transition-[color,background-color,border-color,box-shadow,opacity,width] duration-300  ${
                                  successRate >= 95
                                    ? "border-success/30 text-success       "
                                    : successRate >= 85
                                      ? "border-border text-foreground       "
                                      : successRate >= 70
                                        ? "border-attention/30 text-attention       "
                                        : "border-failure/30 text-failure       "
                                }`}
                              >
                                {successRate.toFixed(1)}%
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs font-medium">
                                                                  <div className="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors"
                                   style={{ backgroundColor: CHART_COLORS.lightGreen }}>
                                <div className="w-2.5 h-2.5 rounded-full "
                                     style={{ background: `linear-gradient(to bottom right, ${CHART_COLORS.chartGreen}, ${CHART_COLORS.success})` }}></div>
                                <span className="font-semibold"
                                      style={{ color: CHART_COLORS.chartGreen }}>
                                  {day.successes}
                                </span>
                              </div>
                              {day.failures > 0 && (
                                <div className="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors"
                                     style={{ backgroundColor: CHART_COLORS.lightRed }}>
                                  <div className="w-2.5 h-2.5 rounded-full "
                                       style={{ background: `linear-gradient(to bottom right, ${CHART_COLORS.chartRed}, ${CHART_COLORS.failed})` }}></div>
                                  <span className="font-semibold"
                                        style={{ color: CHART_COLORS.chartRed }}>
                                    {day.failures}
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>

                        <div className="relative">
                          <div className="h-4 rounded-full overflow-hidden border border-border ">
                            {day.executions > 0 && (
                              <>
                                <div
                                  className="absolute left-0 top-0 h-full transition-[color,background-color,border-color,box-shadow,opacity,width] duration-700 ease-out relative overflow-hidden"
                                  style={{
                                    background: `linear-gradient(to right, ${CHART_COLORS.chartGreen}, ${CHART_COLORS.success})`,
                                    width: `${(day.successes / day.executions) * 100}%`,
                                    animation: `progressFill 1s ease-out ${index * 0.1}s both`,
                                  }}
                                >
                                  <div className="absolute inset-0    "></div>
                                </div>
                                {day.failures > 0 && (
                                  <div
                                    className="absolute top-0 h-full transition-[color,background-color,border-color,box-shadow,opacity,width] duration-700 ease-out relative overflow-hidden"
                                    style={{
                                      background: `linear-gradient(to right, ${CHART_COLORS.chartRed}, ${CHART_COLORS.failed})`,
                                      left: `${(day.successes / day.executions) * 100}%`,
                                      width: `${(day.failures / day.executions) * 100}%`,
                                      animation: `progressFill 1s ease-out ${index * 0.1 + 0.3}s both`,
                                    }}
                                  >
                                    <div className="absolute inset-0    "></div>
                                  </div>
                                )}

                                <div className="absolute inset-0 opacity-0 group-hover/item:opacity-100 transition-opacity duration-500"></div>
                              </>
                            )}
                          </div>

                          <div className="absolute inset-0 h-4 rounded-full opacity-0 group-hover/item:opacity-100 transition-[color,background-color,border-color,box-shadow,opacity,width] duration-700 transform -skew-x-12 group-hover/item:animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
