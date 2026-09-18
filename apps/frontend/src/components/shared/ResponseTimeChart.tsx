import { HealthCheckResult } from '@/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface ResponseTimeChartProps {
  results: HealthCheckResult[];
  height?: number;
}

export function ResponseTimeChart({ results, height = 200 }: ResponseTimeChartProps) {
  if (!results || results.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground bg-muted/20 rounded-md border border-dashed" style={{ height }}>
        No response time data available
      </div>
    );
  }

  const data = [...results].reverse().map(r => ({
    time: format(new Date(r.checkedAt), 'HH:mm'),
    fullTime: format(new Date(r.checkedAt), 'MMM d, HH:mm'),
    responseTimeMs: r.responseTimeMs || 0,
  }));

  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888833" />
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#888888' }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#888888' }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '6px' }}
            itemStyle={{ color: 'hsl(var(--foreground))' }}
            labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
            labelFormatter={(label, payload) => payload?.[0]?.payload?.fullTime || label}
            formatter={(value: number) => [`${value} ms`, 'Response Time']}
          />
          <Line 
            type="monotone" 
            dataKey="responseTimeMs" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
