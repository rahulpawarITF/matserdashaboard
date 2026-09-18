import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Share2, Compass, MessageCircle, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TopReferrer {
  referrer: string;
  views: number;
}

interface ReferrerListProps {
  referrers: TopReferrer[];
  totalViews: number;
}

export function ReferrerList({ referrers, totalViews }: ReferrerListProps) {
  const getReferrerIcon = (ref: string) => {
    const r = ref.toLowerCase();
    if (r === 'direct') return <Compass className="w-3.5 h-3.5 text-sky-500" />;
    if (r.includes('whatsapp')) return <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />;
    if (r.includes('google') || r.includes('bing') || r.includes('yahoo'))
      return <Search className="w-3.5 h-3.5 text-amber-500" />;
    return <Share2 className="w-3.5 h-3.5 text-purple-500" />;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Share2 className="w-4 h-4 text-primary" /> Traffic Sources / Referrers
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Where your project visitors are coming from
        </p>
      </CardHeader>
      <CardContent>
        {referrers.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground border rounded-lg border-dashed bg-muted/20">
            No referrer data recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {referrers.map((r, idx) => {
              const pct = totalViews > 0 ? Math.round((r.views / totalViews) * 100) : 0;
              return (
                <div key={idx} className="group text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-foreground capitalize truncate max-w-[200px] flex items-center gap-1.5">
                      {getReferrerIcon(r.referrer)}
                      <span>{r.referrer}</span>
                    </span>
                    <div className="flex items-center gap-2 font-mono flex-shrink-0">
                      <Badge variant="outline" className="text-[10px] py-0 font-normal">
                        {r.views.toLocaleString()} hits
                      </Badge>
                      <span className="text-muted-foreground text-[11px] w-9 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
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
