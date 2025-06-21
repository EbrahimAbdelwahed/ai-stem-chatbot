'use client';

import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import PlotlyArtifact from '@/components/visualizations/plotly-artifact';
import MoleculeArtifact from '@/components/visualizations/molecule-artifact';
import useSWR from 'swr';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

// Define a fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PlaygroundWorkspaceProps {
  visualizationId?: string;
  isNew?: boolean;
}

// Define a simple type for the visualization data
// Adjust this based on the actual API response structure, especially for 'type'
interface VisualizationApiResponse {
  id: string;
  type: 'plotly' | 'molecule' | string; // Add other types if necessary
  title?: string;
  description?: string;
  // other fields like pdbId for molecule, data/layout for plotly will be in the full response
  // but PlotlyArtifact and MoleculeArtifact fetch these details themselves.
}

export default function PlaygroundWorkspace({ visualizationId, isNew }: PlaygroundWorkspaceProps) {
  const { data: vizDetails, error: vizDetailsError } = useSWR<VisualizationApiResponse>(
    visualizationId ? `/api/visualizations/${visualizationId}` : null, // Fetch only if visualizationId is present
    fetcher
  );

  const renderVisualization = () => {
    if (!visualizationId) return null; // Should not happen if isNew is false
    if (vizDetailsError) return <div className="p-4">Error loading visualization details.</div>;
    if (!vizDetails) return <Skeleton className="size-full" />; // Full panel skeleton

    if (vizDetails.type === 'plotly') {
      return <PlotlyArtifact visualizationId={visualizationId} />;
    } else if (vizDetails.type === 'molecule') {
      return <MoleculeArtifact visualizationId={visualizationId} />;
    } else {
      return <div className="p-4">Unsupported visualization type: {vizDetails.type}</div>;
    }
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full w-full">
      <ResizablePanel defaultSize={70}>
        <div className="flex h-full items-center justify-center p-6">
          {isNew ? (
            <p>Describe the visualization you want to create in the chat.</p>
          ) : visualizationId ? (
            renderVisualization()
          ) : (
            // Fallback, though ideally one of isNew or visualizationId is true
            <div className="p-4"><h1>Visualization Panel</h1></div>
          )}
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={30}>
        <div className="flex h-full items-center justify-center p-6">
          <h1>Chat Panel</h1>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
