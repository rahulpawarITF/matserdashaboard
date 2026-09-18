import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { servicesApi } from '@/api/services.api';
import { PageHeader } from '@/components/shared/PageHeader';
import { ServiceCard } from '@/components/services/ServiceCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Plus, Plug } from 'lucide-react';
import { AddServiceModal } from '@/components/services/AddServiceModal';

export default function ServicesPage() {
  const [addModalOpen, setAddModalOpen] = useState(false);

  const { data: res, isLoading } = useQuery<any>({
    queryKey: ['services'],
    queryFn: () => servicesApi.list().then((r) => r.data),
  });

  const servicesList: any[] = Array.isArray(res)
    ? res
    : Array.isArray(res?.data)
    ? res.data
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader title="Services" description="Manage third-party services and APIs your projects depend on (WhatsApp, Payment, SMS, Email).">
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Service
        </Button>
      </PageHeader>

      {isLoading ? (
        <LoadingSpinner fullPage />
      ) : servicesList.length === 0 ? (
        <EmptyState
          icon={<Plug className="w-12 h-12" />}
          title="No services configured"
          description="Add third-party services like WhatsApp Cloud API, payment gateways, or custom APIs to monitor their live status."
          action={
            <Button onClick={() => setAddModalOpen(true)} className="mt-2">
              <Plus className="w-4 h-4 mr-2" /> Add First Service
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {servicesList.map((service: any) => (
            <ServiceCard key={service._id} service={service} />
          ))}
        </div>
      )}

      <AddServiceModal open={addModalOpen} onOpenChange={setAddModalOpen} />
    </div>
  );
}
