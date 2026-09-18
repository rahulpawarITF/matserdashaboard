import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, Code, Globe, Sparkles, Smartphone, Image as ImageIcon, Send, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface TrackingSnippetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
}

export function TrackingSnippetModal({
  open,
  onOpenChange,
  projectId,
  projectName,
}: TrackingSnippetModalProps) {
  const queryClient = useQueryClient();
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedPixel, setCopiedPixel] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Derive tracking URL from current location (fallback to port 3001 if on Vite port 5173)
  const scriptHost =
    window.location.port === '5173'
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : window.location.origin;

  const scriptTag = `<script defer src="${scriptHost}/api/analytics/script.js" data-project-id="${projectId}"></script>`;
  const pixelTag = `<img src="${scriptHost}/api/analytics/pixel.gif?projectId=${projectId}&path=/" width="1" height="1" style="display:none;" alt="" />`;

  const copyToClipboard = (text: string, isPixel = false) => {
    navigator.clipboard.writeText(text);
    if (isPixel) {
      setCopiedPixel(true);
      setTimeout(() => setCopiedPixel(false), 2000);
    } else {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    }
    toast.success('Snippet copied to clipboard!');
  };

  const handleTestMobileHit = async () => {
    setIsTesting(true);
    try {
      const beaconEndpoint = `${scriptHost}/api/analytics/collect`;
      const mobileHitPayload = {
        projectId,
        path: window.location.pathname || '/',
        referrer: 'https://web.whatsapp.com',
        screenWidth: 390,
        screenHeight: 844,
      };

      await fetch(beaconEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
        },
        body: JSON.stringify(mobileHitPayload),
      });

      toast.success('Mobile hit sent! Real-time visitors & mobile chart updated.', {
        duration: 4000,
      });

      // Instantly refresh queries
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      toast.error('Failed to send test beacon: ' + (err.message || 'Network error'));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Install Tracking Code</DialogTitle>
              <DialogDescription>
                Track live users, pageviews, and visitor interactions for{' '}
                <span className="font-semibold text-foreground">{projectName}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Quick Test Alert Banner */}
          <div className="p-3 border rounded-lg bg-emerald-500/10 border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-foreground">Want to verify tracking right now?</span>
                <p className="text-muted-foreground">
                  Click to simulate an instant mobile visitor and see the live counter update.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="default"
              className="h-8 text-xs gap-1.5 flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleTestMobileHit}
              disabled={isTesting}
            >
              <Send className="w-3.5 h-3.5" />
              {isTesting ? 'Sending...' : 'Test Mobile Hit'}
            </Button>
          </div>

          {/* Primary Script Tag */}
          <div className="p-3.5 border rounded-lg bg-muted/40 relative">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Option 1: 1-Line Universal Script (Recommended)
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={() => copyToClipboard(scriptTag)}
              >
                {copiedScript ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedScript ? 'Copied' : 'Copy Code'}
              </Button>
            </div>
            <pre className="font-mono text-xs bg-card p-3 rounded border overflow-x-auto text-primary whitespace-pre-wrap break-all">
              {scriptTag}
            </pre>
          </div>

          {/* Fallback Image Pixel */}
          <div className="p-3.5 border rounded-lg bg-muted/40 relative">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> Option 2: 1x1 Transparent Image Pixel (No JS)
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={() => copyToClipboard(pixelTag, true)}
              >
                {copiedPixel ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedPixel ? 'Copied' : 'Copy Code'}
              </Button>
            </div>
            <pre className="font-mono text-xs bg-card p-3 rounded border overflow-x-auto text-muted-foreground whitespace-pre-wrap break-all">
              {pixelTag}
            </pre>
          </div>

          <Tabs defaultValue="mobile" className="w-full">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="mobile">Mobile / Public</TabsTrigger>
              <TabsTrigger value="html">HTML / WordPress</TabsTrigger>
              <TabsTrigger value="react">React / Next.js</TabsTrigger>
              <TabsTrigger value="features">What is Tracked?</TabsTrigger>
            </TabsList>

            <TabsContent value="mobile" className="p-3 border rounded-lg bg-card text-xs space-y-2 mt-2">
              <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 font-medium">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Important Note for Mobile Devices & Live HTTPS Domains:</span>
              </div>
              <p className="text-muted-foreground">
                1. <strong>Localhost vs Mobile:</strong> When your dashboard runs on your PC, mobile phones cannot reach <code className="font-mono">localhost:3001</code> because &quot;localhost&quot; points to the phone itself.
              </p>
              <p className="text-muted-foreground">
                2. <strong>Testing on Wi-Fi:</strong> To test directly from a phone on the same Wi-Fi, change <code className="font-mono">localhost</code> in the script to your PC&apos;s local IP: <code className="font-mono text-primary">http://192.168.31.112:3001/analytics.js</code>.
              </p>
              <p className="text-muted-foreground">
                3. <strong>For Live HTTPS Sites (like vcard.itfuturz.in):</strong> Mobile browsers block insecure HTTP requests on HTTPS websites (Mixed Content). To test publicly for 100% free, run:
              </p>
              <div className="bg-muted p-2 rounded font-mono text-[11px] text-foreground">
                npx localtunnel --port 3001
              </div>
              <p className="text-muted-foreground text-[11px]">
                Then use the generated secure <code className="font-mono">https://xxxx.loca.lt/analytics.js</code> URL in your live website!
              </p>
            </TabsContent>

            <TabsContent value="html" className="p-3 border rounded-lg bg-card text-xs space-y-2 mt-2">
              <p className="font-medium text-foreground">For HTML, PHP, Laravel, or WordPress sites:</p>
              <p className="text-muted-foreground">
                Paste the snippet into your project&apos;s template inside the{' '}
                <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-primary">&lt;head&gt;</code>{' '}
                section or right before{' '}
                <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-primary">&lt;/body&gt;</code>.
              </p>
              <p className="text-muted-foreground">
                For WordPress, paste it into your active theme&apos;s <code className="font-mono">header.php</code> or using any &quot;Insert Headers and Footers&quot; plugin.
              </p>
            </TabsContent>

            <TabsContent value="react" className="p-3 border rounded-lg bg-card text-xs space-y-2 mt-2">
              <p className="font-medium text-foreground">For React (Vite) / Next.js / SPAs:</p>
              <p className="text-muted-foreground">
                Add the script tag directly to your <code className="font-mono text-primary">index.html</code> in the public directory.
              </p>
              <p className="text-muted-foreground">
                The script automatically detects Single-Page-App (SPA) route navigation using the HTML5 History API (<code className="font-mono">pushState</code> and <code className="font-mono">popstate</code>).
              </p>
            </TabsContent>

            <TabsContent value="features" className="p-3 border rounded-lg bg-card text-xs space-y-2 mt-2">
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-primary" /> Real-time active users (5-min window)
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-primary" /> Unique visitors & total pageviews
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-primary" /> Top visited pages & URLs
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-primary" /> Device (Mobile, Desktop, Tablet)
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-primary" /> Referrers (Direct, WhatsApp, Google)
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-primary" /> 100% Free & GDPR Compliant
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-2">
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
