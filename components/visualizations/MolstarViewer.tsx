"use client";

import React, { useEffect, useRef, useState } from 'react';
import { DefaultPluginUISpec, type PluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { Plugin } from 'molstar/lib/mol-plugin-ui/plugin';
import { createRoot } from 'react-dom/client';
// NOTE: The global Mol* stylesheet is now imported once in `app/layout.tsx` to avoid
// build-time errors with global CSS from node_modules and to keep bundle size down.
// import 'molstar/lib/mol-plugin-ui/skin/light.scss';

interface MolstarViewerProps {
  pdbId: string;
  title?: string;
  /** Height of the viewer in pixels (defaults to 400) */
  height?: number;
  /** Custom layout options */
  layoutOptions?: {
    isExpanded?: boolean;
    showControls?: boolean;
    showSequence?: boolean;
    showLog?: boolean;
  };
}

/**
 * Native Mol* React UI viewer component.
 * Uses the official Mol* React components to avoid overlay issues
 * and provide proper interaction with built-in controls.
 */
export const MolstarViewer: React.FC<MolstarViewerProps> = ({
  pdbId,
  title,
  height = 400,
  layoutOptions = {
    isExpanded: false,
    showControls: true,
    showSequence: true,
    showLog: false, // This prevents the log overlay issues!
  },
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginUIContext | null>(null);
  // Store the React root so we can unmount it in Strict-Mode cleanup
  const rootRef = useRef<ReturnType<typeof createRoot> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Token used to cancel outdated loads (e.g. React 18 strict-mode remounts or
  // rapid prop changes). If the component unmounts we increment the counter so
  // any pending async work can abort early.
  const loadTokenRef = useRef(0);

  const initViewer = async () => {
    if (!containerRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      // Create plugin spec with custom layout options
      const spec: PluginUISpec = {
        ...DefaultPluginUISpec(),
        layout: {
          initial: {
            isExpanded: layoutOptions.isExpanded || false,
            showControls: layoutOptions.showControls !== false,
            controlsDisplay: 'reactive',
          },
        },
        components: {
          ...DefaultPluginUISpec().components,
          // optionally hide the task/log overlay
          hideTaskOverlay: layoutOptions.showLog === false,
        },
      };

      // Initialize plugin context
      const plugin = new PluginUIContext(spec);
      await plugin.init();

      // Override plugin.unmount so it doesn't remove the React managed container.
      // The original implementation removes the container element from the DOM which
      // React still expects to own, leading to `removeChild` errors in StrictMode.
      // eslint-disable-next-line
      // @ts-ignore
      plugin.unmount = () => {
        // Prevent Mol* from manipulating DOM nodes that React owns. Simply
        // release WebGL resources; React will take care of tearing down the
        // actual elements during its commit phase.
        try {
          // canvas3d might be undefined if plugin failed early.
          (plugin as any).canvas3d?.dispose?.();
        } catch {
          /* swallow */
        }
      };

      // Render Mol* React UI once into the container and keep a reference
      if (!rootRef.current) {
        rootRef.current = createRoot(containerRef.current);
      }
      rootRef.current.render(<Plugin plugin={plugin} />);

      pluginRef.current = plugin;

      // Load the initial structure
      await loadStructure(plugin, pdbId);

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to initialize Mol* viewer:', err);
      setError(`Failed to load structure: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  const loadStructure = async (plugin: PluginUIContext, pdbId: string) => {
    const token = ++loadTokenRef.current;
    try {
      // Clear existing state before loading the new structure to avoid layering
      plugin.clear();
      // Download structure data
      const data = await plugin.builders.data.download({
        url: `https://models.rcsb.org/${pdbId}.bcif`,
        isBinary: true,
      });

      // If the component has been unmounted or a newer request started, exit.
      if (token !== loadTokenRef.current) return;

      // Parse trajectory
      const trajectory = await plugin.builders.structure.parseTrajectory(data, 'mmcif');
      
      // Apply default preset for visualization
      await plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default');
      
    } catch (err) {
      // Fallback to CIF format if BCIF fails
      try {
        const data = await plugin.builders.data.download({
          url: `https://www.ebi.ac.uk/pdbe/entry-files/download/${pdbId}.cif`,
          isBinary: false,
        });

        if (token !== loadTokenRef.current) return;

        const trajectory = await plugin.builders.structure.parseTrajectory(data, 'mmcif');
        await plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default');
        
      } catch (fallbackErr) {
        // Ensure viewer is cleared so no half-loaded state lingers.
        plugin.clear();
        throw new Error(`Failed to load structure from both BCIF and CIF sources: ${fallbackErr}`);
      }
    }
  };

  // Initialize viewer once when component mounts
  useEffect(() => {
    initViewer();

    // Dispose plugin on unmount to free resources
    return () => {
      // Invalidate any in-flight load requests.
      loadTokenRef.current++;

      // Capture current references and immediately null them out so any
      // logic running after unmount sees a "disposed" state.
      const plugin = pluginRef.current;
      const root = rootRef.current;

      pluginRef.current = null;
      rootRef.current = null;

      // React warns if a root is unmounted synchronously while it is still
      // finishing the current render/commit cycle. Defer the teardown to the
      // micro-task queue so it runs right after React is done.
      queueMicrotask(() => {
        // 1. Unmount the React root we created for the Mol* UI first so that
        //    DOM nodes are removed in the order React expects.
        try {
          root?.unmount();
        } catch (e) {
          console.warn('Molstar root unmount error', e);
        }

        // 2. Dispose the Mol* plugin. This will trigger its own internal cleanup
        //    (including plugin.unmount we patched above) but at this point the
        //    React tree is already gone so there's no risk of double-removal.
        if (plugin) {
          try {
            plugin.dispose();
          } catch (e) {
            console.warn('Molstar plugin dispose error', e);
          }
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload structure when the pdbId changes
  useEffect(() => {
    if (pluginRef.current) {
      setIsLoading(true);
      loadStructure(pluginRef.current, pdbId)
        .catch(err => {
          console.error('Failed to load structure:', err);
          setError(`Failed to load structure: ${err instanceof Error ? err.message : 'Unknown error'}`);
        })
        .finally(() => setIsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      
      {/* Native Mol* React UI Container */}
      <div
        ref={containerRef}
        className="w-full border rounded-lg overflow-hidden relative"
        style={{ height }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-50">
            <div className="text-center space-y-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-sm text-gray-600">Loading {pdbId.toUpperCase()}...</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Info footer */}
      <div className="text-xs text-gray-500 flex items-center justify-between">
        <span>Native Mol* React UI • Interactive controls enabled</span>
        <a 
          href="https://molstar.org/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800"
        >
          Powered by Mol*
        </a>
      </div>
    </div>
  );
}; 