import { Card, CardContent } from '@/components/ui/card';
import { Users, CalendarDays, Flame, Percent } from 'lucide-react';

interface AnalyticsOverviewCardsProps {
  realtimeActive: number;
  registeredUsers?: number;
  registeredUserSource?: string;
  dailyUsers?: number;
  weeklyUsers?: number;
  monthlyUsers?: number;
  totalViews?: number;
  uniqueVisitors?: number;
  pagesPerVisit?: number;
  rangeLabel?: string;
}

export function AnalyticsOverviewCards({
  realtimeActive,
  registeredUsers = 0,
  registeredUserSource,
  dailyUsers = 0,
  weeklyUsers = 0,
  monthlyUsers = 0,
  totalViews = 0,
  pagesPerVisit = 0,
}: AnalyticsOverviewCardsProps) {
  const activeToday = dailyUsers > 0 ? dailyUsers : realtimeActive;
  const activityRate =
    registeredUsers > 0 ? ((activeToday / registeredUsers) * 100).toFixed(1) : '0.0';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Verified Registered Accounts (from Production DB) */}
      <Card className="border-border/60 bg-card shadow-xs">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Registered Accounts
            </span>
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {registeredUsers.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 truncate" title={registeredUserSource}>
            {registeredUserSource || 'Production MongoDB'}
          </p>
        </CardContent>
      </Card>

      {/* 2. Active Users Today (Last 24 Hours) */}
      <Card className="border-emerald-500/30 bg-emerald-500/[0.04] shadow-xs">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Active Users Today
              </span>
            </div>
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
            {activeToday.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Real active accounts in last 24h</p>
        </CardContent>
      </Card>

      {/* 3. Active Users This Week (7 Days) */}
      <Card className="border-border/60 bg-card shadow-xs">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Active Users (7 Days)
            </span>
            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {(weeklyUsers > 0 ? weeklyUsers : activeToday).toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Active in 7d{monthlyUsers > 0 ? ` • ${monthlyUsers.toLocaleString()} monthly` : ''}
          </p>
        </CardContent>
      </Card>

      {/* 4. Today's User Engagement Rate (%) */}
      <Card className="border-border/60 bg-card shadow-xs">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Today Activity Rate
            </span>
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {activityRate}%
          </div>
          <div className="w-full bg-muted h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, parseFloat(activityRate) * 4)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Optional: If web pageviews exist, show web metrics */}
      {totalViews > 0 && (
        <>
          <Card className="border-border/60 bg-card shadow-xs">
            <CardContent className="p-4">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Total Pageviews
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">
                {totalViews.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card shadow-xs">
            <CardContent className="p-4">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Pages Per Visit
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">
                {pagesPerVisit}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
