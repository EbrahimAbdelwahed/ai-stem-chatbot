"use client";

import React, { useEffect, useRef, useState } from 'react';

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
  // Hold `Stage` instance from NGL once dynamically imported
  const stageRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep reference to resize handler so it can be removed in cleanup
  const handleResizeRef = useRef<() => void>(() => {});

  useEffect(() => {
    let isDisposed = false;

    if (!stageContainerRef.current) return;

    setIsLoading(true);
    setError(null);

    // Dynamically import NGL only in the browser to avoid SSR issues and missing exports
    import('ngl')
      .then((mod) => {
        if (isDisposed) return;

        // `Stage` might be a named export or a property on the default export depending on the bundle.
        const StageCtor: any = (mod as any).Stage || (mod as any)?.default?.Stage;

        if (!StageCtor) {
          setError('Failed to load NGL Stage constructor.');
          setIsLoading(false);
          return;
        }

        const stage = new StageCtor(stageContainerRef.current!, {
          backgroundColor: 'white',
        });
        stageRef.current = stage;

        const handleResize = () => stage.handleResize();
        window.addEventListener('resize', handleResize);
        handleResizeRef.current = handleResize;

        stage
          .loadFile(`rcsb://${pdbId}`, { defaultRepresentation: true })
          .then((component: any) => {
            // Auto-view is already part of defaultRepresentation but keep for safety
            component.autoView();
            setIsLoading(false);
          })
          .catch((err: any) => {
            console.error('NGL Error:', err);
            setError(`Failed to load structure: ${err?.message || 'Unknown error'}`);
            setIsLoading(false);
            // Dispose the stage early to free resources and avoid double-disposal issues
            try {
              stage.dispose?.();
            } catch (_) {
              /* noop */
            }
            stageRef.current = null;
          });
      })
      .catch((err) => {
        console.error('Failed to dynamically import NGL:', err);
        if (!isDisposed) {
          setError('Failed to load NGL library.');
          setIsLoading(false);
        }
      });

    return () => {
      isDisposed = true;
      try {
        stageRef.current?.dispose?.();
      } catch (err) {
        // ignore dispose errors
      }
      stageRef.current = null;
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResizeRef.current);
      }
    };
  }, [pdbId]);

  return (
    <div className="flex flex-col gap-2 w-full">
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium leading-none">{title}</h3>
          <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
            {pdbId ? pdbId.toUpperCase() : '—'}
          </div>
        </div>
      )}

      <div
        ref={stageContainerRef}
        className={`w-full border rounded-lg overflow-hidden relative ${error ? 'bg-red-50 border-red-200' : ''}`}
        style={{ height }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-50">
            <div className="text-center space-y-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div className="text-sm text-gray-600">Loading {pdbId ? pdbId.toUpperCase() : ''}...</div>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-50">
            <div className="text-center p-4">
              <div className="text-red-600 font-medium mb-1">Error Loading Structure</div>
              <div className="text-red-500 text-sm">{error}</div>
              <div className="text-red-400 text-xs mt-2">PDB ID: {pdbId ? pdbId.toUpperCase() : '—'}</div>
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
