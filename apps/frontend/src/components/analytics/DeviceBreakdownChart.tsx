import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Monitor, Smartphone, Tablet, Cpu } from 'lucide-react';

interface DeviceCounts {
  desktop: number;
  mobile: number;
  tablet: number;
}

interface ItemCount {
  name: string;
  count: number;
}

interface DeviceBreakdownChartProps {
  devices: DeviceCounts;
  browsers: ItemCount[];
  os: ItemCount[];
  totalViews: number;
}

export function DeviceBreakdownChart({
  devices,
  browsers,
  os,
  totalViews,
}: DeviceBreakdownChartProps) {
  const totalDev = (devices.desktop || 0) + (devices.mobile || 0) + (devices.tablet || 0);

  const desktopPct = totalDev > 0 ? Math.round((devices.desktop / totalDev) * 100) : 0;
  const mobilePct = totalDev > 0 ? Math.round((devices.mobile / totalDev) * 100) : 0;
  const tabletPct = totalDev > 0 ? Math.round((devices.tablet / totalDev) * 100) : 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" /> Devices & Platforms
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Visitor hardware, browsers, and operating systems
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Device Types Row */}
        <div>
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
            Device Type
          </span>
          <div className="grid grid-cols-3 gap-2">
            {/* Desktop */}
            <div className="p-2.5 border rounded-lg bg-card text-center">
              <Monitor className="w-4 h-4 text-blue-500 mx-auto mb-1" />
              <div className="text-xs font-semibold text-foreground">{desktopPct}%</div>
              <div className="text-[10px] text-muted-foreground">Desktop ({devices.desktop})</div>
            </div>
            {/* Mobile */}
            <div className="p-2.5 border rounded-lg bg-card text-center">
              <Smartphone className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
              <div className="text-xs font-semibold text-foreground">{mobilePct}%</div>
              <div className="text-[10px] text-muted-foreground">Mobile ({devices.mobile})</div>
            </div>
            {/* Tablet */}
            <div className="p-2.5 border rounded-lg bg-card text-center">
              <Tablet className="w-4 h-4 text-purple-500 mx-auto mb-1" />
              <div className="text-xs font-semibold text-foreground">{tabletPct}%</div>
              <div className="text-[10px] text-muted-foreground">Tablet ({devices.tablet})</div>
            </div>
          </div>
        </div>

        {/* Browsers & OS grid */}
        <div className="grid grid-cols-2 gap-4 pt-1 border-t text-xs">
          {/* Browsers */}
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Top Browsers
            </span>
            {browsers.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic">No browser data</p>
            ) : (
              <div className="space-y-1.5">
                {browsers.slice(0, 4).map((b, i) => {
                  const pct = totalViews > 0 ? Math.round((b.count / totalViews) * 100) : 0;
                  return (
                    <div key={i} className="flex justify-between items-center text-[11px]">
                      <span className="truncate max-w-[90px]">{b.name}</span>
                      <span className="font-mono text-muted-foreground">
                        {b.count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* OS */}
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Top OS
            </span>
            {os.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic">No OS data</p>
            ) : (
              <div className="space-y-1.5">
                {os.slice(0, 4).map((o, i) => {
                  const pct = totalViews > 0 ? Math.round((o.count / totalViews) * 100) : 0;
                  return (
                    <div key={i} className="flex justify-between items-center text-[11px]">
                      <span className="truncate max-w-[90px]">{o.name}</span>
                      <span className="font-mono text-muted-foreground">
                        {o.count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
