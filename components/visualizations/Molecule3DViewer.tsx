'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo, lazy, Suspense } from 'react';

// Lazy load the heavy MolStar wrapper only when needed
const MolStarWrapper = lazy(() => 
  import('./MolStarWrapper').then(module => ({ default: module.MolStarWrapper }))
);

// Define RDKitModule interface
interface RDKitModule {
  get_mol: (smiles: string) => any;
  version: () => string;
}

declare global {
  interface Window {
    RDKit: RDKitModule | undefined;
    initRDKitModule: (options?: { locateFile?: (file: string) => string }) => Promise<RDKitModule>;
  }
}

export interface Molecule3DViewerProps {
  identifierType: 'smiles' | 'inchi' | 'inchikey' | 'name' | 'cid';
  identifier: string;
  representationStyle?: 'stick' | 'sphere' | 'line' | 'cartoon' | 'surface';
  colorScheme?: 'element' | 'residue' | 'chain' | 'structure';
  title?: string;
  description?: string;
}

// Loading component with retry functionality
const LoadingComponent = ({ 
  attempt, 
  maxAttempts, 
  onRetry 
}: { 
  attempt: number; 
  maxAttempts: number; 
  onRetry: () => void;
}) => (
  <div className="p-4 text-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
    <p>Loading 3D library...</p>
    <p className="text-sm text-gray-500">Attempt {attempt} of {maxAttempts}</p>
    <p className="text-xs text-gray-400 mt-1">This may take a few moments...</p>
    {attempt > 1 && (
      <button 
        onClick={onRetry}
        className="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Retry
      </button>
    )}
  </div>
);

// Error component with retry functionality
const ErrorComponent = ({ 
  error, 
  onRetry 
}: { 
  error: string; 
  onRetry: () => void;
}) => (
  <div className="p-4 text-red-500 bg-red-100 border border-red-500 rounded">
    <p className="font-semibold">Error loading 3D viewer:</p>
    <p className="text-sm">{error}</p>
    <button 
      onClick={onRetry}
      className="mt-2 px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
    >
      Retry
    </button>
  </div>
);

const Molecule3DViewer: React.FC<Molecule3DViewerProps> = (props) => {
  const {
    identifierType,
    identifier,
    representationStyle = 'stick',
    title,
    description,
  } = props;

  // Stable memoized key to prevent unnecessary re-renders
  const moleculeKey = useMemo(() => 
    `${identifierType}:${identifier}`, [identifierType, identifier]
  );

  // Simplified state management
  const [moleculeData, setMoleculeData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(1);
  const [showViewer, setShowViewer] = useState(false);
  
  // Refs to prevent re-execution and manage cleanup
  const molstarPlugin = useRef<any | null>(null);
  const hasLoggedRef = useRef<string>('');
  const initExecutedRef = useRef<string>('');
  const rdkitRef = useRef<RDKitModule | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const maxAttempts = 3;

  // Log only once per molecule
  if (hasLoggedRef.current !== moleculeKey) {
    console.log('[Molecule3DViewer] New molecule:', { identifierType, identifier });
    hasLoggedRef.current = moleculeKey;
    if (initExecutedRef.current !== moleculeKey) {
      console.log('[Molecule3DViewer] Resetting execution guard for new molecule');
      initExecutedRef.current = '';
    }
  }

  // Enhanced RDKit loader with better error handling and caching
  const loadRDKit = useCallback(async (signal?: AbortSignal): Promise<RDKitModule | null> => {
    if (signal?.aborted) throw new Error('Aborted');
    
    if (rdkitRef.current) {
      return rdkitRef.current;
    }

    if (window.RDKit) {
      rdkitRef.current = window.RDKit;
      return window.RDKit;
    }

    const scriptId = 'rdkit-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/@rdkit/rdkit/dist/RDKit_minimal.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);

      return new Promise((resolve, reject) => {
        if (signal?.aborted) {
          reject(new Error('Aborted'));
          return;
        }

        const cleanup = () => {
          signal?.removeEventListener('abort', abortHandler);
        };

        const abortHandler = () => {
          cleanup();
          reject(new Error('Aborted'));
        };

        signal?.addEventListener('abort', abortHandler);

        script!.onload = () => {
          cleanup();
          if (signal?.aborted) {
            reject(new Error('Aborted'));
            return;
          }

          window.initRDKitModule({ 
            locateFile: (file) => `https://unpkg.com/@rdkit/rdkit/dist/${file}` 
          })
          .then((loadedRdkit) => {
            console.log('RDKit loaded:', loadedRdkit.version());
            window.RDKit = loadedRdkit;
            rdkitRef.current = loadedRdkit;
            resolve(loadedRdkit);
          })
          .catch(reject);
        };

        script!.onerror = () => {
          cleanup();
          reject(new Error('Failed to load RDKit script'));
        };
      });
    }

    // Script exists, wait for RDKit to be available
    if (window.RDKit) {
      rdkitRef.current = window.RDKit;
      return window.RDKit;
    }
    
    // Wait for RDKit with timeout and abort signal
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('Aborted'));
        return;
      }

      const cleanup = () => {
        signal?.removeEventListener('abort', abortHandler);
        clearTimeout(timeoutId);
      };

      const abortHandler = () => {
        cleanup();
        reject(new Error('Aborted'));
      };

      signal?.addEventListener('abort', abortHandler);

      const checkRDKit = () => {
        if (signal?.aborted) {
          cleanup();
          reject(new Error('Aborted'));
          return;
        }

        if (window.RDKit) {
          cleanup();
          rdkitRef.current = window.RDKit;
          resolve(window.RDKit);
        } else {
          setTimeout(checkRDKit, 100);
        }
      };

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('RDKit load timeout'));
      }, 10000);

      checkRDKit();
    });
  }, []);

  // Process SMILES to SDF with better error handling
  const processSMILES = useCallback((rdkit: RDKitModule, smiles: string): string | null => {
    try {
      const mol = rdkit.get_mol(smiles);
      if (mol && mol.is_valid()) {
        const sdf = mol.get_molblock();
        mol.delete(); // Important: clean up memory
        return sdf;
      } else {
        if (mol) mol.delete();
        return null;
      }
    } catch (e) {
      console.error('Error processing SMILES:', e);
      return null;
    }
  }, []);

  // Retry function
  const retryInitialization = useCallback(() => {
    if (loadAttempt < maxAttempts) {
      setLoadAttempt(prev => prev + 1);
      setError(null);
      setIsLoading(true);
      initExecutedRef.current = '';
    }
  }, [loadAttempt, maxAttempts]);

  // Main initialization effect with abort controller
  useEffect(() => {
    // Guard: Don't re-execute for the same molecule
    if (initExecutedRef.current === moleculeKey) {
      console.log('[Molecule3DViewer] Already initialized for:', moleculeKey, 'skipping re-initialization');
      return;
    }

    // Create abort controller for this initialization
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const initializeMolecule = async () => {
      console.log('[Molecule3DViewer] Starting initialization for:', moleculeKey, 'attempt:', loadAttempt);
      
      // Mark as executing to prevent re-runs
      initExecutedRef.current = moleculeKey;
      
      // Reset state for new molecule
      setIsLoading(true);
      setError(null);
      setMoleculeData(null);

      try {
        if (abortController.signal.aborted) return;

        if (identifierType === 'smiles') {
          console.log('[Molecule3DViewer] Loading RDKit...');
          const rdkit = await loadRDKit(abortController.signal);
          
          if (abortController.signal.aborted) return;
          
          if (!rdkit) {
            throw new Error('Failed to load RDKit');
          }
          console.log('[Molecule3DViewer] RDKit loaded successfully');

          // Process SMILES
          console.log('[Molecule3DViewer] Processing SMILES:', identifier);
          const sdf = processSMILES(rdkit, identifier);
          
          if (abortController.signal.aborted) return;

          if (sdf) {
            console.log('[Molecule3DViewer] Setting molecule data and finishing...');
            setMoleculeData(sdf);
            setIsLoading(false);
            setShowViewer(true);
            console.log('[Molecule3DViewer] ✓ Successfully processed SMILES for:', identifier);
          } else {
            console.log('[Molecule3DViewer] ✗ SMILES processing failed for:', identifier);
            setError(`Invalid SMILES: ${identifier}`);
            setIsLoading(false);
          }
        } else {
          // Non-SMILES identifiers - pass directly to 3Dmol
          console.log('[Molecule3DViewer] Using direct identifier (non-SMILES):', identifier);
          setMoleculeData(identifier);
          setIsLoading(false);
          setShowViewer(true);
          console.log('[Molecule3DViewer] ✓ Set direct identifier:', identifier);
        }
      } catch (error: any) {
        if (!abortController.signal.aborted) {
          console.error('[Molecule3DViewer] Initialization failed:', error);
          setError(error.message || 'Failed to initialize molecule');
          setIsLoading(false);
          // Reset execution guard on error so it can be retried
          initExecutedRef.current = '';
        }
      }
    };

    initializeMolecule();

    return () => {
      abortController.abort();
      abortControllerRef.current = null;
    };
  }, [moleculeKey, loadAttempt, identifier, identifierType, loadRDKit, processSMILES]);

  // Reset execution guard when molecule changes
  useEffect(() => {
    if (initExecutedRef.current && initExecutedRef.current !== moleculeKey) {
      console.log('[Molecule3DViewer] Molecule changed, resetting execution guard');
      initExecutedRef.current = '';
      setIsLoading(true);
      setError(null);
      setMoleculeData(null);
      setLoadAttempt(1);
      setShowViewer(false);
    }
  }, [moleculeKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clean up MolStar plugin if it exists
      if (molstarPlugin.current) {
        try {
          molstarPlugin.current.dispose?.();
        } catch (e) {
          console.warn('Error disposing MolStar plugin:', e);
        }
        molstarPlugin.current = null;
      }
    };
  }, []);

  // Render logic with stable references
  if (error) {
    return <ErrorComponent error={error} onRetry={retryInitialization} />;
  }

  if (isLoading) {
    return (
      <LoadingComponent 
        attempt={loadAttempt} 
        maxAttempts={maxAttempts} 
        onRetry={retryInitialization}
      />
    );
  }

  if (!moleculeData) {
    return (
      <div className="p-4 text-orange-500 bg-orange-100 border border-orange-500 rounded">
        Could not generate 3D model for {identifier}
        <button 
          onClick={retryInitialization}
          className="ml-2 px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
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
      <div style={{ height: '500px', width: '100%', position: 'relative', border: '1px solid #ccc' }}>
        {showViewer && (
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2">Loading 3D viewer...</span>
            </div>
          }>
            <MolStarWrapper
              key={moleculeKey}
              moleculeInput={moleculeData}
              inputType={identifierType === 'smiles' ? 'sdf' : identifierType}
              representationStyle={representationStyle}
              pluginRef={molstarPlugin}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default Molecule3DViewer; 