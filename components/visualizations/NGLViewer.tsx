"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Stage } from 'ngl';

interface NGLViewerProps {
  pdbId: string;
  title?: string;
  height?: number;
}

export const NGLViewer: React.FC<NGLViewerProps> = ({
  pdbId,
  title,
  height = 400,
}) => {
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stageContainerRef.current) return;

    setIsLoading(true);
    setError(null);

    // Initialize NGL Stage
    const stage = new Stage(stageContainerRef.current);
    stageRef.current = stage;

    stage.loadFile(`rcsb://${pdbId}`)
      .then(component => {
        component.addRepresentation('cartoon');
        component.autoView();
        setIsLoading(false);
      })
      .catch(err => {
        console.error('NGL Error:', err);
        setError(`Failed to load structure: ${err.message || 'Unknown error'}`);
        setIsLoading(false);
      });

    return () => {
      stageRef.current?.dispose();
      stageRef.current = null;
    };
  }, [pdbId]);

  if (error) {
    return (
      <div className="flex flex-col gap-2 w-full">
        {title && <h3 className="text-sm font-medium leading-none mb-1">{title}</h3>}
        <div
          className="w-full border rounded-lg overflow-hidden bg-red-50 border-red-200 flex items-center justify-center"
          style={{ height }}
        >
          <div className="text-center p-4">
            <div className="text-red-600 font-medium mb-1">Error Loading Structure</div>
            <div className="text-red-500 text-sm">{error}</div>
            <div className="text-red-400 text-xs mt-2">PDB ID: {pdbId}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium leading-none">{title}</h3>
          <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
            {pdbId.toUpperCase()}
          </div>
        </div>
      )}

      <div
        ref={stageContainerRef}
        className="w-full border rounded-lg overflow-hidden relative"
        style={{ height }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-50">
            <div className="text-center space-y-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div className="text-sm text-gray-600">Loading {pdbId.toUpperCase()}...</div>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 flex items-center justify-between">
        <span>Powered by NGL Viewer</span>
        <a
          href="http://nglviewer.org/ngl/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800"
        >
          nglviewer.org
        </a>
      </div>
    </div>
  );
};
