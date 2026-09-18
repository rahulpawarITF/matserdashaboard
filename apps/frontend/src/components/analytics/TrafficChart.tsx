import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TimelinePoint {
  time: string;
  views: number;
  uniqueVisitors: number;
}

interface TrafficChartProps {
  data: TimelinePoint[];
  range: '24h' | '7d' | '30d';
  onRangeChange: (range: '24h' | '7d' | '30d') => void;
  title?: string;
}

export function TrafficChart({
  data,
  range,
  onRangeChange,
  title = 'Traffic & Visitor Trends',
}: TrafficChartProps) {
  // Format X-axis labels nicely based on range
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    if (range === '24h') {
      // "2026-09-11 14:00" -> "14:00"
      const parts = timeStr.split(' ');
      return parts[1] || timeStr;
    }
    // "2026-09-11" -> "Sep 11"
    const date = new Date(timeStr);
    return isNaN(date.getTime())
      ? timeStr
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pageviews and unique visitors over time
          </p>
        </div>
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border">
          <Button
            size="sm"
            variant={range === '24h' ? 'secondary' : 'ghost'}
            className="h-7 px-2.5 text-xs font-medium"
            onClick={() => onRangeChange('24h')}
          >
            24h
          </Button>
          <Button
            size="sm"
            variant={range === '7d' ? 'secondary' : 'ghost'}
            className="h-7 px-2.5 text-xs font-medium"
            onClick={() => onRangeChange('7d')}
          >
            7d
          </Button>
          <Button
            size="sm"
            variant={range === '30d' ? 'secondary' : 'ghost'}
            className="h-7 px-2.5 text-xs font-medium"
            onClick={() => onRangeChange('30d')}
          >
            30d
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground text-sm border rounded-lg border-dashed bg-muted/20 p-4 text-center">
            <p className="font-medium text-foreground">No active user records found for this period.</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              User activity is calculated directly from live database records. As users interact with this application, activity points will appear here.
            </p>
          </div>
        ) : (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis
                  dataKey="time"
                  tickFormatter={formatTime}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Legend
                  verticalAlign="top"
                  height={30}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  name="Pageviews"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#viewsGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="uniqueVisitors"
                  name="Unique Visitors"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#visitorsGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
