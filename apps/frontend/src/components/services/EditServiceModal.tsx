import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '@/api/services.api';
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
import { Edit3, Loader2, Lock, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Service, ServiceType } from '@/types';

interface EditServiceModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HeaderEntry {
  key: string;
  value: string;
}

export function EditServiceModal({ service, open, onOpenChange }: EditServiceModalProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [type, setType] = useState<ServiceType>('whatsapp');
  const [checkMethod, setCheckMethod] = useState<'http' | 'custom_api' | 'webhook'>('http');
  const [statusEndpoint, setStatusEndpoint] = useState('');
  const [expectedStatusCode, setExpectedStatusCode] = useState<number>(200);
  const [expectedBodyContains, setExpectedBodyContains] = useState('');
  const [credentials, setCredentials] = useState('');
  const [checkIntervalMinutes, setCheckIntervalMinutes] = useState(5);
  const [headers, setHeaders] = useState<HeaderEntry[]>([]);

  useEffect(() => {
    if (service) {
      setName(service.name || '');
      setProvider(service.provider || '');
      setType(service.type || 'whatsapp');
      setCheckMethod(service.checkMethod || 'http');
      setStatusEndpoint(service.statusEndpoint || '');
      setExpectedStatusCode(service.expectedStatusCode || 200);
      setExpectedBodyContains(service.expectedBodyContains || '');
      setCheckIntervalMinutes(service.checkIntervalMinutes || 5);
      setCredentials(service.credentials ? JSON.stringify(service.credentials, null, 2) : '');

      if (service.customHeaders) {
        const entries = Object.entries(service.customHeaders).map(([key, value]) => ({
          key,
          value,
        }));
        setHeaders(entries);
      } else {
        setHeaders([]);
      }
    }
  }, [service]);

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

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!service) return;

      const customHeaders: Record<string, string> = {};
      for (const h of headers) {
        if (h.key.trim() && h.value.trim()) {
          customHeaders[h.key.trim()] = h.value.trim();
        }
      }

      const payload: any = {
        name,
        provider,
        type,
        checkMethod,
        statusEndpoint,
        expectedStatusCode: Number(expectedStatusCode) || 200,
        expectedBodyContains: expectedBodyContains.trim() || undefined,
        customHeaders: Object.keys(customHeaders).length > 0 ? customHeaders : {},
        checkIntervalMinutes,
      };

      if (credentials.trim()) {
        payload.credentials = credentials;
      }

      return servicesApi.update(service._id, payload);
    },
    onSuccess: () => {
      toast.success('Service updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to update service');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Service name is required');
      return;
    }
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-primary" /> Edit Third-Party Service
          </DialogTitle>
          <DialogDescription>Modify endpoints, auth tokens, or check intervals for this service.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-service-name">Service Name *</Label>
              <Input
                id="edit-service-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-service-provider">Provider *</Label>
              <Input
                id="edit-service-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
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
                  <SelectItem value="custom">Custom Server / API</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                  <SelectItem value="5">Every 5 minutes</SelectItem>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                  <SelectItem value="60">Every 1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-status-endpoint">Status Endpoint URL *</Label>
            <Input
              id="edit-status-endpoint"
              value={statusEndpoint}
              onChange={(e) => setStatusEndpoint(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expected Status Code</Label>
              <Input
                type="number"
                value={expectedStatusCode}
                onChange={(e) => setExpectedStatusCode(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Expected Keyword</Label>
              <Input
                value={expectedBodyContains}
                onChange={(e) => setExpectedBodyContains(e.target.value)}
                placeholder='e.g. "connected"'
              />
            </div>
          </div>

          {/* Headers */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Custom Headers & Auth</Label>
              <Button type="button" variant="outline" size="sm" onClick={addHeader}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Header
              </Button>
            </div>

            {headers.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Header"
                  value={h.key}
                  onChange={(e) => updateHeader(i, 'key', e.target.value)}
                  className="w-1/3 text-xs"
                />
                <Input
                  placeholder="Value"
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

          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-credentials" className="flex items-center gap-1.5 text-xs">
                <Lock className="w-3.5 h-3.5 text-primary" /> Update Credentials (Encrypted)
              </Label>
              <span className="text-[11px] text-muted-foreground">Leave blank to keep existing</span>
            </div>
            <Textarea
              id="edit-credentials"
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
              placeholder="Enter new JSON credentials to replace existing"
              className="font-mono text-xs h-16"
            />
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
