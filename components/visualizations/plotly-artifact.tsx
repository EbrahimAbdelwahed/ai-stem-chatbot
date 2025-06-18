'use client';

import useSWR from 'swr';
import { Skeleton } from '@/components/ui/skeleton';
import { PlotlyChart, type FigureJSON } from '@/components/visualizations/PlotlyChart'; // Ensure PlotlyChartProps is exported or defined here

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface VisualizationData {
  id: string;
  title: string;
  description: string;
  data: FigureJSON; // This should match the structure expected by PlotlyChart
  layout: any; // This should match the structure expected by PlotlyChart
}

interface PlotlyArtifactProps {
  visualizationId: string;
}

export default function PlotlyArtifact({ visualizationId }: PlotlyArtifactProps) {
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
      <PlotlyChart figure={{data: visualization.data, layout: visualization.layout}} />
    </div>
  );
}
