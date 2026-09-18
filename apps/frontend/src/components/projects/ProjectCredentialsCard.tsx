import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  Globe,
  User,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

interface ProjectCredentialsCardProps {
  notes?: string;
  projectName: string;
}

export function ProjectCredentialsCard({ notes, projectName }: ProjectCredentialsCardProps) {
  const [showPasswords, setShowPasswords] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!notes || notes.trim() === '') {
    return (
      <Card className="border border-dashed border-border/80 bg-muted/10">
        <CardContent className="py-6 text-center text-xs text-muted-foreground">
          <KeyRound className="w-5 h-5 mx-auto mb-2 text-muted-foreground/60" />
          No access credentials or notes recorded for {projectName}.
        </CardContent>
      </Card>
    );
  }

  const handleCopy = (text: string, label: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Helper to parse notes into structured sections
  const lines = notes.split('\n').map((l) => l.trim()).filter(Boolean);

  // Extract Play Store and App Store links
  const playStoreLine = lines.find((l) => l.toLowerCase().includes('play.google.com') || l.toLowerCase().includes('play store:'));
  const appStoreLine = lines.find((l) => l.toLowerCase().includes('apps.apple.com') || l.toLowerCase().includes('app store:'));

  const playStoreUrl = playStoreLine
    ? playStoreLine.match(/https?:\/\/[^\s]+/)?.[0]
    : null;
  const appStoreUrl = appStoreLine
    ? appStoreLine.match(/https?:\/\/[^\s]+/)?.[0]
    : null;

  // Extract credentials like Email / Password
  const credentialPairs: Array<{ label: string; email?: string; password?: string; url?: string }> = [];

  let currentSection = 'Main Credentials';
  let tempEmail = '';
  let tempPassword = '';
  let tempUrl = '';

  for (const line of lines) {
    if (line.includes('===') || line.endsWith(':')) {
      if (tempEmail || tempPassword || tempUrl) {
        credentialPairs.push({
          label: currentSection,
          email: tempEmail,
          password: tempPassword,
          url: tempUrl,
        });
        tempEmail = '';
        tempPassword = '';
        tempUrl = '';
      }
      currentSection = line.replace(/[:=]/g, '').trim() || 'Access Info';
    }

    const emailMatch = line.match(/(?:Email|Admin|Editor|User):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[0-9]{10})/i);
    if (emailMatch) {
      tempEmail = emailMatch[1];
    }

    const passMatch = line.match(/(?:Password|Pass):\s*([^\s|]+)/i);
    if (passMatch) {
      tempPassword = passMatch[1];
    }

    const urlMatch = line.match(/(?:Panel|Portal|Link|URL):\s*(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      tempUrl = urlMatch[1];
    }
  }

  if (tempEmail || tempPassword || tempUrl) {
    credentialPairs.push({
      label: currentSection,
      email: tempEmail,
      password: tempPassword,
      url: tempUrl,
    });
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-xs">
      <CardHeader className="pb-3 border-b bg-muted/15 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              Access Credentials & Project Hub
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                <ShieldCheck className="w-3 h-3 mr-1 inline" /> Read-Only Vault
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Secure administrative credentials, testing accounts, and store releases for {projectName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setShowPasswords(!showPasswords)}
          >
            {showPasswords ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showPasswords ? 'Mask Passwords' : 'Reveal Passwords'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => handleCopy(notes, 'All credentials & notes', 'all_notes')}
          >
            {copiedKey === 'all_notes' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            Copy All
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Mobile App Releases */}
        {(playStoreUrl || appStoreUrl) && (
          <div className="p-3 rounded-lg bg-muted/30 border border-border/70 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-xs font-semibold text-foreground">Mobile App Releases</span>
                <p className="text-[11px] text-muted-foreground">Official store deployments for this project</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {playStoreUrl && (
                <a
                  href={playStoreUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-medium transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Google Play Store
                </a>
              )}
              {appStoreUrl && (
                <a
                  href={appStoreUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-medium transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Apple App Store
                </a>
              )}
            </div>
          </div>
        )}

        {/* Structured Credentials Grid or Formatted View */}
        {credentialPairs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {credentialPairs.map((pair, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-card border border-border/80 hover:border-primary/30 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" /> {pair.label}
                  </span>
                  {pair.url && (
                    <a
                      href={pair.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" /> Open Link
                    </a>
                  )}
                </div>

                {pair.email && (
                  <div className="flex items-center justify-between text-xs bg-muted/40 px-2.5 py-1.5 rounded border border-border/50">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <User className="w-3 h-3" /> Login:
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-foreground select-all">{pair.email}</span>
                      <button
                        onClick={() => handleCopy(pair.email!, 'Email', `email_${idx}`)}
                        className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                        title="Copy Login"
                      >
                        {copiedKey === `email_${idx}` ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {pair.password && (
                  <div className="flex items-center justify-between text-xs bg-muted/40 px-2.5 py-1.5 rounded border border-border/50">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Lock className="w-3 h-3" /> Password:
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-foreground select-all">
                        {showPasswords ? pair.password : '••••••••••••'}
                      </span>
                      <button
                        onClick={() => handleCopy(pair.password!, 'Password', `pass_${idx}`)}
                        className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                        title="Copy Password"
                      >
                        {copiedKey === `pass_${idx}` ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {/* Formatted Full Notes Viewer */}
        <div className="p-3 rounded-lg bg-muted/20 border border-border/60 text-xs font-mono whitespace-pre-wrap leading-relaxed text-muted-foreground select-all">
          {notes}
        </div>
      </CardContent>
    </Card>
  );
}
