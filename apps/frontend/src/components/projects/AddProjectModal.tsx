import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects.api';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Loader2, Globe, Plug, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import { Environment } from '@/types';

interface AddProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UrlEntry {
  label: string;
  url: string;
  expectedStatusCode: number;
  expectedBodyContains?: string;
  isHealthCheckTarget: boolean;
}

export function AddProjectModal({ open, onOpenChange }: AddProjectModalProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [environment, setEnvironment] = useState<Environment>('production');
  const [checkIntervalMinutes, setCheckIntervalMinutes] = useState(5);
  const [tags, setTags] = useState('');
  const [ownerNotes, setOwnerNotes] = useState('');
  const [documentationUrl, setDocumentationUrl] = useState('');
  const [ga4PropertyId, setGa4PropertyId] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Fetch available third-party services (SMG99, WhatsApp, Razorpay)
  const { data: servicesRes } = useQuery({
    queryKey: ['services', 'for-project-modal'],
    queryFn: () => servicesApi.list().then((r) => r.data),
    enabled: open,
  });

  const availableServices = Array.isArray(servicesRes)
    ? servicesRes
    : Array.isArray((servicesRes as any)?.data)
    ? (servicesRes as any).data
    : [];

  const [urls, setUrls] = useState<UrlEntry[]>([
    { label: 'Frontend', url: 'https://', expectedStatusCode: 200, isHealthCheckTarget: true },
  ]);

  const addUrl = () => {
    setUrls([...urls, { label: 'Admin', url: 'https://', expectedStatusCode: 200, isHealthCheckTarget: true }]);
  };

  const removeUrl = (index: number) => {
    if (urls.length <= 1) {
      toast.warning('At least one URL is required.');
      return;
    }
    setUrls(urls.filter((_, i) => i !== index));
  };

  const updateUrl = (index: number, field: keyof UrlEntry, value: any) => {
    const updated = [...urls];
    updated[index] = { ...updated[index], [field]: value };
    setUrls(updated);
  };

  const toggleService = (serviceId: string) => {
    if (selectedServiceIds.includes(serviceId)) {
      setSelectedServiceIds(selectedServiceIds.filter((id) => id !== serviceId));
    } else {
      setSelectedServiceIds([...selectedServiceIds, serviceId]);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('');
    setEnvironment('production');
    setCheckIntervalMinutes(5);
    setTags('');
    setOwnerNotes('');
    setDocumentationUrl('');
    setGa4PropertyId('');
    setSelectedServiceIds([]);
    setUrls([{ label: 'Frontend', url: 'https://', expectedStatusCode: 200, isHealthCheckTarget: true }]);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      // Validate URLs
      for (const u of urls) {
        if (!u.url || !u.url.startsWith('http')) {
          throw new Error(`Invalid URL for ${u.label}: must start with http:// or https://`);
        }
      }

      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        name,
        description,
        category,
        environment,
        checkIntervalMinutes,
        tags: tagList,
        ownerNotes,
        documentationUrl: documentationUrl || undefined,
        ga4PropertyId: ga4PropertyId.trim() || undefined,
        linkedServiceIds: selectedServiceIds,
        urls: urls.map((u) => ({
          label: u.label,
          url: u.url,
          expectedStatusCode: Number(u.expectedStatusCode) || 200,
          expectedBodyContains: u.expectedBodyContains || undefined,
          isHealthCheckTarget: u.isHealthCheckTarget,
        })),
      };

      return projectsApi.create(payload as any);
    },
    onSuccess: () => {
      toast.success('Project created successfully!');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      resetForm();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to create project');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" /> Add New Project
          </DialogTitle>
          <DialogDescription>
            Register a new web application, store, or portal to monitor its uptime, live status, and visitor metrics.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name *</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. VCard / Digital Card"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-category">Category</Label>
              <Input
                id="project-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. SaaS, E-Commerce, Portal"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-desc">Description</Label>
            <Input
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of what this project does"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select value={environment} onValueChange={(v) => setEnvironment(v as Environment)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Health Check Interval</Label>
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
          </div>

          {/* GA4 Property ID (Free Visitor Tracking) */}
          <div className="p-3.5 rounded-lg border border-blue-500/20 bg-blue-500/[0.03] space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BarChart2 className="w-4 h-4 text-blue-500" />
              Google Analytics 4 (GA4) Integration (Free)
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your GA4 Property ID to display Today & Week visitor counts directly on the project card. (If empty, uses built-in live tracking).
            </p>
            <Input
              placeholder="e.g. 389201942 (Google Analytics Property ID)"
              value={ga4PropertyId}
              onChange={(e) => setGa4PropertyId(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          {/* Linked Third-Party Services (SMG99, WhatsApp, etc.) */}
          {availableServices.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Plug className="w-4 h-4 text-purple-500" /> Linked Third-Party Services
              </Label>
              <p className="text-xs text-muted-foreground">
                Select third-party integrations (SMS, WhatsApp, Payment) used by this project:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableServices.map((svc: any) => {
                  const isChecked = selectedServiceIds.includes(svc._id);
                  return (
                    <label
                      key={svc._id}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors text-xs ${
                        isChecked
                          ? 'border-primary/50 bg-primary/5 font-medium'
                          : 'border-border/60 hover:bg-muted/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleService(svc._id)}
                        className="rounded text-primary"
                      />
                      <span className="truncate">{svc.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto uppercase font-mono">
                        {svc.type}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dynamic URLs */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Live Endpoints *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addUrl}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Another URL
              </Button>
            </div>

            {urls.map((u, i) => (
              <div key={i} className="p-3 border rounded-lg space-y-3 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-32">
                    <Input
                      placeholder="Label (e.g. Frontend)"
                      value={u.label}
                      onChange={(e) => updateUrl(i, 'label', e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="https://example.com"
                      value={u.url}
                      onChange={(e) => updateUrl(i, 'url', e.target.value)}
                      required
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      placeholder="Code (200)"
                      value={u.expectedStatusCode}
                      onChange={(e) => updateUrl(i, 'expectedStatusCode', Number(e.target.value))}
                      title="Expected HTTP status code"
                    />
                  </div>
                  {urls.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeUrl(i)}
                      className="text-destructive hover:text-destructive h-9 w-9"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <Input
                    placeholder="Expected body contains text (optional keyword check)"
                    value={u.expectedBodyContains || ''}
                    onChange={(e) => updateUrl(i, 'expectedBodyContains', e.target.value)}
                    className="h-8 text-xs"
                  />
                  <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={u.isHealthCheckTarget}
                      onChange={(e) => updateUrl(i, 'isHealthCheckTarget', e.target.checked)}
                      className="rounded"
                    />
                    <span>Active check target</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-2">
              <Label htmlFor="doc-url">Documentation URL</Label>
              <Input
                id="doc-url"
                value={documentationUrl}
                onChange={(e) => setDocumentationUrl(e.target.value)}
                placeholder="https://wiki.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Owner Notes</Label>
              <Input
                id="notes"
                value={ownerNotes}
                onChange={(e) => setOwnerNotes(e.target.value)}
                placeholder="Server credentials location, contact person..."
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
