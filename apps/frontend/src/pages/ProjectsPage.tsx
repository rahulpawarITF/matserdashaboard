import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects.api';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectFilters } from '@/components/projects/ProjectFilters';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Plus, FolderKanban } from 'lucide-react';
import { AddProjectModal } from '@/components/projects/AddProjectModal';

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [environment, setEnvironment] = useState('all');
  const [status, setStatus] = useState('all');
  const [tag, setTag] = useState('');
  const [page, setPage] = useState(1);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const { data: res, isLoading } = useQuery({
    queryKey: ['projects', { page, search, environment, status, tag }],
    queryFn: () =>
      projectsApi
        .list({
          page,
          limit: 50,
          search: search || undefined,
          environment: environment !== 'all' ? environment : undefined,
          status: status !== 'all' ? status : undefined,
          tag: tag || undefined,
        })
        .then((r) => r.data),
  });

  const clearFilters = () => {
    setSearch('');
    setEnvironment('all');
    setStatus('all');
    setTag('');
    setPage(1);
  };

  // Safely extract projects array whether backend sends { data: [...] } or { projects: [...] } or direct array
  const projectsList = Array.isArray(res)
    ? res
    : Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res?.projects)
    ? res.projects
    : [];

  const total = Number(res?.total ?? projectsList.length);
  const limit = Number(res?.limit ?? 10);
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader title="Projects" description="Manage and monitor your web projects and applications.">
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Project
        </Button>
      </PageHeader>

      <ProjectFilters
        search={search}
        setSearch={setSearch}
        environment={environment}
        setEnvironment={setEnvironment}
        status={status}
        setStatus={setStatus}
        tag={tag}
        setTag={setTag}
        onClear={clearFilters}
      />

      {isLoading ? (
        <LoadingSpinner fullPage />
      ) : projectsList.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-12 h-12" />}
          title="No projects found"
          description="We couldn't find any projects matching your filters. Try adjusting them or create a new project."
          action={
            <Button onClick={() => setAddModalOpen(true)} className="mt-2">
              <Plus className="w-4 h-4 mr-2" /> Create First Project
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectsList.map((project: any) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>

          {total > limit && (
            <div className="flex justify-center items-center gap-3 mt-6">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <AddProjectModal open={addModalOpen} onOpenChange={setAddModalOpen} />
    </div>
  );
}
