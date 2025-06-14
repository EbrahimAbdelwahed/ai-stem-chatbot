'use client';

import React, { FC, useEffect, useRef, useState } from 'react';

// Global 3Dmol state with better tracking - only initialize on client
let $3Dmol: any = null;
let loadAttempts = 0;
const MAX_LOAD_ATTEMPTS = 3;

// Simplified 3Dmol loader with comprehensive debugging
const load3Dmol = async (): Promise<any> => {
  console.log('[3Dmol] Starting load attempt', ++loadAttempts);
  
  if ($3Dmol) {
    console.log('[3Dmol] Already loaded, returning cached instance');
    return $3Dmol;
  }

  if (typeof window === 'undefined') {
    console.log('[3Dmol] Window not available (SSR)');
    throw new Error('Window not available');
  }

  // Check if already available on window
  if (window.$3Dmol) {
    console.log('[3Dmol] Found existing window.$3Dmol');
    $3Dmol = window.$3Dmol;
    return $3Dmol;
  }

  // Create loading promise with timeout
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      console.error('[3Dmol] Loading timeout after 30 seconds');
      reject(new Error('3Dmol loading timeout'));
    }, 30000); // Increased timeout

    const onSuccess = () => {
      clearTimeout(timeoutId);
      if (window.$3Dmol) {
        $3Dmol = window.$3Dmol;
        console.log('[3Dmol] Successfully loaded, version:', window.$3Dmol?.version || 'unknown');
        resolve($3Dmol);
      } else {
        console.error('[3Dmol] Script loaded but $3Dmol not available');
        reject(new Error('3Dmol not available after script load'));
      }
    };

    const onError = (error: string) => {
      clearTimeout(timeoutId);
      console.error('[3Dmol] Loading failed:', error);
      reject(new Error(error));
    };

    // Check if script already exists
    const existingScript = document.getElementById('3dmol-script');
    if (existingScript) {
      console.log('[3Dmol] Script already exists, waiting for load...');
      // Wait for existing script to load
      let checkCount = 0;
      const checkInterval = setInterval(() => {
        checkCount++;
        console.log('[3Dmol] Checking for $3Dmol, attempt:', checkCount);
        if (window.$3Dmol) {
          clearInterval(checkInterval);
          onSuccess();
        } else if (checkCount > 50) { // 5 seconds max
          clearInterval(checkInterval);
          onError('Timeout waiting for existing script');
        }
      }, 100);
      return;
    }

    // Create and load script
    console.log('[3Dmol] Creating new script element');
    const script = document.createElement('script');
    script.id = '3dmol-script';
    script.src = 'https://3dmol.org/build/3Dmol-min.js';
    script.async = true;
    
    script.onload = () => {
      console.log('[3Dmol] Script onload event fired, checking for $3Dmol...');
      // Check immediately and then with delay
      if (window.$3Dmol) {
        onSuccess();
      } else {
        setTimeout(() => {
          if (window.$3Dmol) {
            onSuccess();
          } else {
            onError('$3Dmol not available after script load');
          }
        }, 500);
      }
    };
    
    script.onerror = (e) => {
      console.error('[3Dmol] Script error event:', e);
      onError('Failed to load 3Dmol script');
    };
    
    console.log('[3Dmol] Appending script to head');
    document.head.appendChild(script);
  });
};

// Extend Window interface for 3Dmol
declare global {
  interface Window {
    $3Dmol: any;
  }
}

export interface MolStarWrapperProps {
  moleculeInput: string | null;
  inputType: 'sdf' | 'pdb' | 'cid' | 'name' | 'smiles' | 'inchi' | 'inchikey';
  representationStyle?: 'stick' | 'sphere' | 'line' | 'cartoon' | 'surface';
  pluginRef?: React.MutableRefObject<any | null>;
  className?: string;
  style?: React.CSSProperties;
}

export const MolStarWrapper: FC<MolStarWrapperProps> = ({
  moleculeInput,
  inputType,
  representationStyle = 'stick',
  pluginRef,
  className = '',
  style = {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Initializing...');
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Main effect - always called, conditions inside
  useEffect(() => {
    // Only run on client side after mounting
    if (!isMounted || !moleculeInput || typeof window === 'undefined') {
      return;
    }

    let isCancelled = false;

    const initializeMoleculeViewer = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setStatus('Loading 3Dmol.js...');

        // Load 3Dmol
        const $3Dmol = await load3Dmol();
        
        // Check if component was unmounted
        if (isCancelled) return;

        if (!containerRef.current) {
          throw new Error('Container not available');
        }

        setStatus('Creating 3D viewer...');
        
        // Clear any existing content
        containerRef.current.innerHTML = '';
        
        // Create viewer
        const viewer = $3Dmol.createViewer(containerRef.current, {
          backgroundColor: 'white',
          antialias: true,
          width: '100%',
          height: '100%'
        });

        // Store reference if provided
        if (pluginRef) {
          pluginRef.current = viewer;
        }

        setStatus('Loading molecule...');

        // Add molecule based on input type
        if (inputType === 'pdb' || inputType === 'sdf') {
          viewer.addModel(moleculeInput, inputType);
        } else {
          // For other types, we might need to fetch the data first
          // This is a simplified implementation
          throw new Error(`Input type ${inputType} not fully supported yet`);
        }

        // Apply representation style
        const styleConfig: any = {};
        switch (representationStyle) {
          case 'stick':
            styleConfig.stick = { radius: 0.25 };
            break;
          case 'sphere':
            styleConfig.sphere = { radius: 0.3 };
            break;
          case 'line':
            styleConfig.line = { linewidth: 3 };
            break;
          case 'cartoon':
            styleConfig.cartoon = { color: 'spectrum' };
            break;
          case 'surface':
            styleConfig.surface = { opacity: 0.8 };
            break;
        }

        viewer.setStyle({}, styleConfig);
        viewer.zoomTo();
        viewer.render();

        setStatus('✅ 3D molecule loaded successfully!');
        setIsLoading(false);

      } catch (err) {
        if (isCancelled) return;
        
        console.error('[MolStarWrapper] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setStatus('❌ Failed to load molecule');
        setIsLoading(false);
      }
    };

    initializeMoleculeViewer();

    return () => {
      isCancelled = true;
    };
  }, [isMounted, moleculeInput, inputType, representationStyle, pluginRef]);

  // Don't render anything on server side
  if (!isMounted) {
    return (
      <div className={`w-full h-64 bg-gray-900 rounded-lg flex items-center justify-center ${className}`} style={style}>
        <div className="text-gray-400">Loading 3D viewer...</div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden ${className}`} style={style}>
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-90 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
          <div className="text-sm text-gray-400">{status}</div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900 bg-opacity-20 z-10">
          <div className="text-red-400 text-sm mb-2">❌ Error</div>
          <div className="text-red-300 text-xs text-center px-4">{error}</div>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: '200px' }}
      />
    </div>
  );
};

export default MolStarWrapper; 