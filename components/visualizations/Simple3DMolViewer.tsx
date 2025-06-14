'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Extend existing global declarations
declare global {
  interface Window {
    $3Dmol: any;
  }
}

// Define RDKit interfaces separately
interface RDKitMol {
  is_valid(): boolean;
  get_molblock(): string;
  delete(): void;
}

interface RDKitModule {
  get_mol: (smiles: string) => RDKitMol;
  version: () => string;
}

// Global cache for successfully loaded molecules
interface CachedMolecule {
  moleculeData: string;
  format: string;
  timestamp: number;
  representationStyle: string;
}

const globalMoleculeCache = new Map<string, CachedMolecule>();
const successfullyRendered = new Set<string>();

// Helper to create cache key
function createCacheKey(identifierType: string, identifier: string, representationStyle: string): string {
  return `${identifierType}:${identifier}:${representationStyle}`;
}

export interface Simple3DMolViewerProps {
  identifierType: 'smiles' | 'pdb' | 'name' | 'cid';
  identifier: string;
  representationStyle?: 'stick' | 'sphere' | 'line' | 'cartoon' | 'surface';
  colorScheme?: 'element' | 'residue' | 'chain' | 'structure';
  title?: string;
  description?: string;
}

const Simple3DMolViewer: React.FC<Simple3DMolViewerProps> = ({
  identifierType,
  identifier,
  representationStyle = 'stick',
  title,
  description,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Initializing 3D viewer...');
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const executedRef = useRef<string>('');
  const renderedRef = useRef<boolean>(false);
  const viewerRef = useRef<any>(null);

  // Create stable keys
  const moleculeKey = `${identifierType}:${identifier}`;
  const cacheKey = createCacheKey(identifierType, identifier, representationStyle);

  // Check if this molecule was already successfully rendered
  const wasSuccessfullyRendered = successfullyRendered.has(cacheKey);
  const cachedMolecule = globalMoleculeCache.get(cacheKey);

  // Add resize observer to handle container size changes
  useEffect(() => {
    if (!containerRef.current || !viewerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (viewerRef.current && entry.target === containerRef.current) {
          // Resize the 3Dmol viewer when container size changes
          setTimeout(() => {
            if (viewerRef.current && viewerRef.current.resize) {
              viewerRef.current.resize();
            }
          }, 100);
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isLoaded]);

  // Helper function to render molecule (stable reference)
  const renderMolecule = useCallback(async (viewer: any, moleculeData: string, format: string, style: string) => {
    // Add model to viewer
    viewer.addModel(moleculeData, format);
    
    // Apply representation style
    switch (style) {
      case 'sphere':
        viewer.setStyle({}, { sphere: { radius: 0.5 } });
        break;
      case 'line':
        viewer.setStyle({}, { line: { linewidth: 2 } });
        break;
      case 'cartoon':
        viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
        break;
      case 'surface':
        viewer.setStyle({}, { stick: {} });
        viewer.addSurface(window.$3Dmol.SurfaceType.VDW, { opacity: 0.7 });
        break;
      default:
        viewer.setStyle({}, { stick: { radius: 0.15 } });
    }
    
    viewer.zoomTo();
    viewer.render();
    
    // Small delay to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 100));
  }, []);

  // Helper function to render from cache (stable reference)
  const renderFromCache = useCallback(async (cached: CachedMolecule) => {
    try {
      setStatus('Loading from cache...');
      setError(null);
      setIsLoaded(false);

      // Ensure 3Dmol is loaded
      if (!window.$3Dmol) {
        setStatus('Loading 3Dmol.js...');
        const script = document.createElement('script');
        script.src = 'https://3dmol.org/build/3Dmol-min.js';
        script.async = true;
        document.head.appendChild(script);
        
        await new Promise<void>((resolve, reject) => {
          script.onload = () => {
            if (window.$3Dmol) {
              resolve();
            } else {
              setTimeout(() => {
                if (window.$3Dmol) {
                  resolve();
                } else {
                  reject(new Error('$3Dmol not available after script load'));
                }
              }, 1000);
            }
          };
          script.onerror = () => reject(new Error('Failed to load 3Dmol script'));
        });
      }

      if (!containerRef.current) {
        throw new Error('Container not available');
      }

      setStatus('Rendering cached molecule...');
      
      // Clear container
      containerRef.current.innerHTML = '';
      
      // Create viewer
      const viewer = window.$3Dmol.createViewer(containerRef.current, {
        backgroundColor: 'white',
        antialias: true,
        width: '100%',
        height: '100%'
      });

      // Store viewer reference for resizing
      viewerRef.current = viewer;

      // Render from cached data
      await renderMolecule(viewer, cached.moleculeData, cached.format, cached.representationStyle);
      
      renderedRef.current = true;
      setStatus('✅ 3D model loaded from cache!');
      setIsLoaded(true);
      console.log('[Simple3DMolViewer] Successfully rendered from cache:', cacheKey);
      
    } catch (error: any) {
      console.error('[Simple3DMolViewer] Cache render error:', error);
      // If cache fails, remove from cache and try fresh
      globalMoleculeCache.delete(cacheKey);
      successfullyRendered.delete(cacheKey);
      setError(error.message);
      setStatus('❌ Failed to load from cache');
    }
  }, [cacheKey, renderMolecule]);

  useEffect(() => {
    // All conditions moved inside - no early returns that affect hook order
    let shouldExecute = true;
    
    // Enhanced prevention logic
    if (renderedRef.current) {
      console.log('[Simple3DMolViewer] Already rendered in this instance:', cacheKey);
      shouldExecute = false;
    }

    if (shouldExecute && executedRef.current === cacheKey) {
      console.log('[Simple3DMolViewer] Already executed for:', cacheKey);
      shouldExecute = false;
    }

    if (shouldExecute && wasSuccessfullyRendered && cachedMolecule) {
      console.log('[Simple3DMolViewer] Using cached successful render for:', cacheKey);
      // Fast path: render immediately from cache
      renderFromCache(cachedMolecule);
      shouldExecute = false;
    }

    if (shouldExecute) {
      const load3DMol = async () => {
        console.log('[Simple3DMolViewer] Starting fresh initialization for:', cacheKey);
        executedRef.current = cacheKey;
        
        try {
          setStatus('Loading 3Dmol.js...');
          setError(null);
          setIsLoaded(false);

          // Load 3Dmol script if not already loaded
          if (!window.$3Dmol) {
            const script = document.createElement('script');
            script.src = 'https://3dmol.org/build/3Dmol-min.js';
            script.async = true;
            
            await new Promise<void>((resolve, reject) => {
              script.onload = () => {
                if (window.$3Dmol) {
                  resolve();
                } else {
                  setTimeout(() => {
                    if (window.$3Dmol) {
                      resolve();
                    } else {
                      reject(new Error('$3Dmol not available after script load'));
                    }
                  }, 1000);
                }
              };
              script.onerror = () => reject(new Error('Failed to load 3Dmol script'));
              document.head.appendChild(script);
            });
          }

          if (!containerRef.current) {
            throw new Error('Container not available');
          }

          setStatus('Creating 3D viewer...');
          
          // Clear container
          containerRef.current.innerHTML = '';
          
          // Create viewer
          const viewer = window.$3Dmol.createViewer(containerRef.current, {
            backgroundColor: 'white',
            antialias: true,
            width: '100%',
            height: '100%'
          });

          // Store viewer reference for resizing
          viewerRef.current = viewer;

          setStatus('Loading molecule data...');

          let moleculeData: string;
          let format: string;

          if (identifierType === 'smiles') {
            // Load RDKit for SMILES processing
            const rdkitWindow = window as any;
            if (!rdkitWindow.RDKit) {
              setStatus('Loading RDKit for SMILES processing...');
              
              const rdkitScript = document.createElement('script');
              rdkitScript.src = 'https://unpkg.com/@rdkit/rdkit/dist/RDKit_minimal.js';
              rdkitScript.async = true;
              document.head.appendChild(rdkitScript);

              await new Promise<void>((resolve, reject) => {
                rdkitScript.onload = () => {
                  rdkitWindow.initRDKitModule({ 
                    locateFile: (file: string) => `https://unpkg.com/@rdkit/rdkit/dist/${file}` 
                  }).then((rdkit: RDKitModule) => {
                    console.log('RDKit loaded:', rdkit.version());
                    rdkitWindow.RDKit = rdkit;
                    resolve();
                  }).catch(reject);
                };
                rdkitScript.onerror = () => reject(new Error('Failed to load RDKit'));
              });
            }

            // Convert SMILES to SDF
            const rdkit: RDKitModule = rdkitWindow.RDKit;
            const mol = rdkit.get_mol(identifier);
            if (mol && mol.is_valid()) {
              moleculeData = mol.get_molblock();
              format = 'sdf';
              mol.delete();
            } else {
              if (mol) mol.delete();
              throw new Error(`Invalid SMILES: ${identifier}`);
            }
          } else if (identifierType === 'pdb' && identifier.length === 4) {
            // Fetch PDB data
            setStatus('Fetching PDB data...');
            const response = await fetch(`https://files.rcsb.org/download/${identifier.toUpperCase()}.pdb`);
            if (response.ok) {
              moleculeData = await response.text();
              format = 'pdb';
            } else {
              throw new Error(`Could not fetch PDB ${identifier}: ${response.status}`);
            }
          } else if (identifierType === 'cid') {
            // Fetch PubChem data
            setStatus('Fetching PubChem data...');
            const response = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${identifier}/SDF`);
            if (response.ok) {
              moleculeData = await response.text();
              format = 'sdf';
            } else {
              throw new Error(`Could not fetch compound ${identifier}: ${response.status}`);
            }
          } else {
            throw new Error(`Unsupported identifier type: ${identifierType}`);
          }

          // Cache the molecule data for future use
          globalMoleculeCache.set(cacheKey, {
            moleculeData,
            format,
            timestamp: Date.now(),
            representationStyle
          });

          setStatus('Rendering molecule...');
          
          // Render the molecule
          await renderMolecule(viewer, moleculeData, format, representationStyle);
          
          // Mark as successfully rendered
          successfullyRendered.add(cacheKey);
          renderedRef.current = true;
          setStatus('✅ 3D model loaded successfully!');
          setIsLoaded(true);
          console.log('[Simple3DMolViewer] Successfully loaded and cached:', cacheKey);
          
        } catch (error: any) {
          console.error('[Simple3DMolViewer] Error:', error);
          setError(error.message);
          setStatus('❌ Failed to load 3D model');
          // Reset execution guard on error so it can be retried
          executedRef.current = '';
        }
      };

      load3DMol();
    }
  }, [cacheKey, cachedMolecule, identifier, identifierType, renderFromCache, renderMolecule, representationStyle, wasSuccessfullyRendered]);

  if (error) {
    return (
      <div className="my-4 p-4 border rounded-lg shadow bg-red-50 border-red-200">
        <h3 className="text-lg font-semibold mb-2 text-red-700">Error Loading 3D Model</h3>
        <p className="text-red-600 text-sm">{error}</p>
        <button 
          onClick={() => {
            // Clear all caches and refs for this molecule
            executedRef.current = '';
            renderedRef.current = false;
            globalMoleculeCache.delete(cacheKey);
            successfullyRendered.delete(cacheKey);
            setError(null);
            setStatus('Retrying...');
          }}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="my-4 p-4 border rounded-lg shadow">
      {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
      {description && <p className="text-sm text-gray-600 mb-2">{description}</p>}
      
      <div className="bg-white rounded border border-gray-300 min-h-[400px] relative flex flex-col">
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <div className="text-sm text-gray-600">{status}</div>
              {wasSuccessfullyRendered && (
                <div className="text-xs text-green-600 mt-1">Using cached data</div>
              )}
            </div>
          </div>
        )}
        <div 
          ref={containerRef}
          className="w-full flex-grow min-h-[400px]"
        />
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        <p>Molecule: {identifier} ({identifierType.toUpperCase()})</p>
        <p>Representation: {representationStyle}</p>
        {wasSuccessfullyRendered && (
          <p className="text-green-600">✓ Previously cached</p>
        )}
      </div>
    </div>
  );
};

export default Simple3DMolViewer; 