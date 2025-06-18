'use client';

import useSWR from 'swr';
import { Skeleton } from '@/components/ui/skeleton';
import { MolstarViewer } from '@/components/visualizations/MolstarViewer';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface VisualizationData {
  id: string;
  title: string;
  description: string;
  pdbId: string; // pdbId is expected by MolstarViewer
  // Add any other fields that might come from the API and are needed
}

interface MoleculeArtifactProps {
  visualizationId: string;
}

export default function MoleculeArtifact({ visualizationId }: MoleculeArtifactProps) {
  const { data: visualization, error } = useSWR<VisualizationData>(
    `/api/visualizations/${visualizationId}`,
    fetcher
  );

  if (error) return <div>Failed to load visualization.</div>;
  if (!visualization) return <Skeleton className="h-64 w-full" />; // Adjusted skeleton size

  return (
    <div className="p-4">
      {visualization.title && (
        <h2 className="text-lg font-semibold mb-2">{visualization.title}</h2>
      )}
      {visualization.description && (
        <p className="text-sm text-muted-foreground mb-4">{visualization.description}</p>
      )}
      <MolstarViewer pdbId={visualization.pdbId} title={visualization.title} />
    </div>
  );
}
