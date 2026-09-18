import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface ProjectFiltersProps {
  search: string;
  setSearch: (v: string) => void;
  environment: string;
  setEnvironment: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  tag: string;
  setTag: (v: string) => void;
  onClear: () => void;
}

export function ProjectFilters({ search, setSearch, environment, setEnvironment, status, setStatus, tag, setTag, onClear }: ProjectFiltersProps) {
  const hasFilters = search || environment !== 'all' || status !== 'all' || tag;

  return (
    <div className="flex flex-col md:flex-row gap-3 items-center w-full">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search projects..." 
          className="pl-9" 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
      </div>
      <Select value={environment} onValueChange={setEnvironment}>
        <SelectTrigger className="w-full md:w-[150px]">
          <SelectValue placeholder="Environment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Environments</SelectItem>
          <SelectItem value="production">Production</SelectItem>
          <SelectItem value="staging">Staging</SelectItem>
          <SelectItem value="development">Development</SelectItem>
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-full md:w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="up">Up</SelectItem>
          <SelectItem value="down">Down</SelectItem>
          <SelectItem value="degraded">Degraded</SelectItem>
          <SelectItem value="unknown">Unknown</SelectItem>
        </SelectContent>
      </Select>
      <Input 
        placeholder="Tag..." 
        className="w-full md:w-[120px]" 
        value={tag} 
        onChange={(e) => setTag(e.target.value)} 
      />
      {hasFilters && (
        <Button variant="ghost" className="px-2" onClick={onClear}>
          <X className="h-4 w-4 mr-1" /> Clear
        </Button>
      )}
    </div>
  );
}
