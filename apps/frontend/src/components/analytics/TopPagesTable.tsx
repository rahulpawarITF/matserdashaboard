import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileCode, Globe } from 'lucide-react';

interface TopPath {
  path: string;
  views: number;
}

interface TopPagesTableProps {
  paths: TopPath[];
  totalViews: number;
}

export function TopPagesTable({ paths, totalViews }: TopPagesTableProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileCode className="w-4 h-4 text-primary" /> Top Visited Pages
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Most frequently accessed routes and pages
        </p>
      </CardHeader>
      <CardContent>
        {paths.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground border rounded-lg border-dashed bg-muted/20">
            No pageview data recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {paths.map((p, idx) => {
              const pct = totalViews > 0 ? Math.round((p.views / totalViews) * 100) : 0;
              return (
                <div key={idx} className="group text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-foreground font-medium truncate max-w-[200px] sm:max-w-[260px] flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{p.path}</span>
                    </span>
                    <div className="flex items-center gap-2 font-mono flex-shrink-0">
                      <span className="font-semibold text-foreground">{p.views.toLocaleString()}</span>
                      <span className="text-muted-foreground text-[11px] w-9 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
