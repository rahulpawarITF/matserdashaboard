import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Eye, Smartphone } from 'lucide-react';

interface DayByDayItem {
  date: string;
  dayName: string;
  views: number;
  uniqueVisitors: number;
  mobileViews: number;
  desktopViews: number;
  mobilePercent: number;
}

interface DayByDayTableProps {
  days: DayByDayItem[];
  projectName: string;
}

export function DayByDayTable({ days, projectName }: DayByDayTableProps) {
  if (!days || days.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Daily Traffic & User Breakdown (Past 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-xs text-muted-foreground">
          No daily records recorded yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Daily Traffic & User Breakdown (Past 7 Days)
          </CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Day-by-day unique visitor counts, view volume, and mobile vs. desktop access for {projectName}
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-mono">
          {days.length} Days Recorded
        </Badge>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 border-y text-muted-foreground font-medium">
              <tr>
                <th className="py-2.5 px-4">Date & Day</th>
                <th className="py-2.5 px-4 text-right">
                  <span className="flex items-center justify-end gap-1">
                    <Users className="w-3.5 h-3.5 text-blue-500" /> Daily Users (Unique)
                  </span>
                </th>
                <th className="py-2.5 px-4 text-right">
                  <span className="flex items-center justify-end gap-1">
                    <Eye className="w-3.5 h-3.5 text-primary" /> Total Views
                  </span>
                </th>
                <th className="py-2.5 px-4">
                  <span className="flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-500" /> Mobile Share
                  </span>
                </th>
                <th className="py-2.5 px-4 text-right">Split (Mobile / Desktop)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {days.map((d, index) => (
                <tr key={d.date} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{d.dayName || 'Day'}</span>
                      <span className="text-[11px] text-muted-foreground font-normal">{d.date}</span>
                      {index === 0 && (
                        <Badge variant="secondary" className="text-[9px] py-0 px-1 font-sans bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Today
                        </Badge>
                      )}
                    </div>
                  </td>

                  <td className="py-2.5 px-4 text-right font-bold text-foreground">
                    {d.uniqueVisitors.toLocaleString()}
                  </td>

                  <td className="py-2.5 px-4 text-right text-foreground">
                    {d.views.toLocaleString()}
                  </td>

                  <td className="py-2.5 px-4 font-sans">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, d.mobilePercent))}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {d.mobilePercent}%
                      </span>
                    </div>
                  </td>

                  <td className="py-2.5 px-4 text-right text-[11px] text-muted-foreground">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {d.mobileViews}m
                    </span>{' '}
                    /{' '}
                    <span className="text-foreground">
                      {d.desktopViews}d
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
