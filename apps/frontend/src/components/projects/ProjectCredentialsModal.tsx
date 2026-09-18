import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProjectCredentialsCard } from './ProjectCredentialsCard';
import { Project } from '@/types';

interface ProjectCredentialsModalProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectCredentialsModal({
  project,
  open,
  onOpenChange,
}: ProjectCredentialsModalProps) {
  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            {project.name} — Credentials & Access
          </DialogTitle>
        </DialogHeader>
        <div className="pt-2">
          <ProjectCredentialsCard
            notes={project.ownerNotes}
            projectName={project.name}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
