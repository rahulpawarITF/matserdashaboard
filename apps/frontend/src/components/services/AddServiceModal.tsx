import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '@/api/services.api';
import { projectsApi } from '@/api/projects.api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plug, Loader2, Lock, Sparkles, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ServiceType } from '@/types';

interface AddServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
}

interface HeaderEntry {
  key: string;
  value: string;
}

export function AddServiceModal({ open, onOpenChange, defaultProjectId }: AddServiceModalProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [provider, setProvider] = useState('MagicQR / VCard WhatsApp');
  const [type, setType] = useState<ServiceType>('whatsapp');
  const [checkMethod, setCheckMethod] = useState<'http' | 'custom_api' | 'webhook'>('http');
  const [statusEndpoint, setStatusEndpoint] = useState('https://vcard.itfuturz.in/api/whatsapp/status');
  const [expectedStatusCode, setExpectedStatusCode] = useState<number>(200);
  const [expectedBodyContains, setExpectedBodyContains] = useState('');
  const [credentials, setCredentials] = useState('');
  const [checkIntervalMinutes, setCheckIntervalMinutes] = useState(5);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(defaultProjectId || 'none');
  const [headers, setHeaders] = useState<HeaderEntry[]>([]);

  // Load available projects for linking
  const { data: projectsRes } = useQuery({
    queryKey: ['projects', 'select-list'],
    queryFn: () => projectsApi.list({ limit: 100 }).then((res) => res.data),
    enabled: open,
  });

  const projectsList = Array.isArray(projectsRes)
    ? projectsRes
    : Array.isArray((projectsRes as any)?.data)
    ? (projectsRes as any).data
    : Array.isArray((projectsRes as any)?.projects)
    ? (projectsRes as any).projects
    : [];

  const handleTemplateSelect = (template: string) => {
    if (template === 'magicqr_whatsapp') {
      setName('MagicQR WhatsApp Bot');
      setProvider('MagicQR / VCard');
      setType('whatsapp');
      setCheckMethod('http');
      setStatusEndpoint('https://vcard.itfuturz.in/api/whatsapp/status');
      setExpectedStatusCode(200);
      setExpectedBodyContains('');
      setHeaders([{ key: 'Authorization', value: 'Bearer ' }]);
      toast.info('Loaded MagicQR WhatsApp Bot template');
    } else if (template === 'msg99_sms') {
      setName('SMG99 SMS Gateway');
      setProvider('SMG99 / MSG99 API');
      setType('sms');
      setCheckMethod('http');
      setStatusEndpoint('https://api.msg99.com/status');
      setExpectedStatusCode(200);
      setExpectedBodyContains('');
      setHeaders([{ key: 'authkey', value: '' }]);
      toast.info('Loaded SMG99 SMS Gateway template');
    } else if (template === 'meta_whatsapp') {
      setName('Meta WhatsApp Cloud API');
      setProvider('Meta');
      setType('whatsapp');
      setCheckMethod('http');
      setStatusEndpoint('https://graph.facebook.com/v19.0/');
      setExpectedStatusCode(200);
      toast.info('Loaded Meta WhatsApp Cloud API template');
    } else if (template === 'razorpay') {
      setName('Razorpay Payments');
      setProvider('Razorpay');
      setType('payment');
      setCheckMethod('http');
      setStatusEndpoint('https://api.razorpay.com/v1/');
      setExpectedStatusCode(200);
      toast.info('Loaded Razorpay template');
    } else if (template === 'custom_server') {
      setName('Server Status Endpoint');
      setProvider('Internal Server');
      setType('custom');
      setCheckMethod('http');
      setStatusEndpoint('https://');
      setExpectedStatusCode(200);
    }
  };

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...headers];
    updated[index][field] = val;
    setHeaders(updated);
  };

  const resetForm = () => {
    setName('');
    setProvider('MagicQR / VCard WhatsApp');
    setType('whatsapp');
    setCheckMethod('http');
    setStatusEndpoint('https://vcard.itfuturz.in/api/whatsapp/status');
    setExpectedStatusCode(200);
    setExpectedBodyContains('');
    setCredentials('');
    setHeaders([]);
    setCheckIntervalMinutes(5);
    setSelectedProjectId(defaultProjectId || 'none');
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!statusEndpoint.startsWith('http')) {
        throw new Error('Status Endpoint must start with http:// or https://');
      }

      // Build customHeaders record
      const customHeaders: Record<string, string> = {};
      for (const h of headers) {
        if (h.key.trim() && h.value.trim()) {
          customHeaders[h.key.trim()] = h.value.trim();
        }
      }

      const payload = {
        name,
        provider,
        type,
        checkMethod,
        statusEndpoint,
        expectedStatusCode: Number(expectedStatusCode) || 200,
        expectedBodyContains: expectedBodyContains.trim() || undefined,
        customHeaders: Object.keys(customHeaders).length > 0 ? customHeaders : undefined,
        credentials: credentials.trim() ? credentials : undefined,
        checkIntervalMinutes,
        linkedProjectIds:
          selectedProjectId && selectedProjectId !== 'none' ? [selectedProjectId] : [],
      };

      return servicesApi.create(payload as any);
    },
    onSuccess: () => {
      toast.success('Third-party service added and monitoring scheduled!');
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      resetForm();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to add service');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Service name is required');
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Plug className="w-5 h-5 text-primary" /> Add Third-Party Service / Integration
          </DialogTitle>
          <DialogDescription>
            Monitor WhatsApp bots, SMS gateways (MSG99), Payment gateways, or server integrations.
          </DialogDescription>
        </DialogHeader>

        {/* Quick Presets */}
        <div className="bg-muted/40 p-3 rounded-lg border flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-muted-foreground flex items-center gap-1 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Presets:
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => handleTemplateSelect('magicqr_whatsapp')}
          >
            MagicQR WhatsApp
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => handleTemplateSelect('msg99_sms')}
          >
            SMG99 SMS
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => handleTemplateSelect('meta_whatsapp')}
          >
            Meta Cloud API
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => handleTemplateSelect('razorpay')}
          >
            Razorpay
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="service-name">Service Name *</Label>
              <Input
                id="service-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. MagicQR WhatsApp Bot"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-provider">Provider *</Label>
              <Input
                id="service-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. MagicQR, MSG99, Meta"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ServiceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp Integration / Bot</SelectItem>
                  <SelectItem value="sms">SMS Provider (MSG99, etc.)</SelectItem>
                  <SelectItem value="payment">Payment Gateway</SelectItem>
                  <SelectItem value="email">Email Service</SelectItem>
                  <SelectItem value="custom">Custom Server / Microservice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Check Method</Label>
              <Select value={checkMethod} onValueChange={(v) => setCheckMethod(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP Endpoint (GET check)</SelectItem>
                  <SelectItem value="custom_api">Custom API Health Check</SelectItem>
                  <SelectItem value="webhook">Webhook Listener</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-endpoint">Status / Health Endpoint URL *</Label>
            <Input
              id="status-endpoint"
              value={statusEndpoint}
              onChange={(e) => setStatusEndpoint(e.target.value)}
              placeholder="https://vcard.itfuturz.in/api/whatsapp/status"
              required
            />
          </div>

          {/* Validation conditions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expected-status">Expected HTTP Status Code</Label>
              <Input
                id="expected-status"
                type="number"
                value={expectedStatusCode}
                onChange={(e) => setExpectedStatusCode(Number(e.target.value))}
                placeholder="200"
              />
              <p className="text-[11px] text-muted-foreground">Default is 200 (or 304 / 2xx)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected-body">Expected Keyword in Response (Optional)</Label>
              <Input
                id="expected-body"
                value={expectedBodyContains}
                onChange={(e) => setExpectedBodyContains(e.target.value)}
                placeholder='e.g. "connected" or "success": true'
              />
              <p className="text-[11px] text-muted-foreground">Marks degraded if not found in body</p>
            </div>
          </div>

          {/* Custom Headers / Auth Token */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Authentication & Custom Headers</Label>
                <p className="text-xs text-muted-foreground">
                  Provide Bearer tokens, cookies, or API keys if the status endpoint requires auth.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addHeader}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Header
              </Button>
            </div>

            {headers.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Header (e.g. Authorization)"
                  value={h.key}
                  onChange={(e) => updateHeader(i, 'key', e.target.value)}
                  className="w-1/3 text-xs"
                />
                <Input
                  placeholder="Value (e.g. Bearer eyJ... or key)"
                  value={h.value}
                  onChange={(e) => updateHeader(i, 'value', e.target.value)}
                  className="flex-1 text-xs font-mono"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeHeader(i)}
                  className="text-destructive h-9 w-9"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-2">
              <Label>Check Interval</Label>
              <Select
                value={String(checkIntervalMinutes)}
                onValueChange={(v) => setCheckIntervalMinutes(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Every 1 minute</SelectItem>
                  <SelectItem value="5">Every 5 minutes (Recommended)</SelectItem>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                  <SelectItem value="60">Every 1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Link to Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Standalone)</SelectItem>
                  {projectsList.map((p: any) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name} ({p.environment})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label htmlFor="credentials" className="flex items-center gap-1.5 text-xs">
                <Lock className="w-3.5 h-3.5 text-primary" /> Credentials (Encrypted at rest)
              </Label>
              <span className="text-[11px] text-muted-foreground">Optional</span>
            </div>
            <Textarea
              id="credentials"
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
              placeholder='{"apiKey": "...", "secret": "..."}'
              className="font-mono text-xs h-16"
            />
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding & Scheduling...
                </>
              ) : (
                'Add Service'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
