"use client";

import dynamic from 'next/dynamic';
import React, { Suspense } from 'react';
import Spinner from '@/components/ui/Spinner';

// Dynamically load the heavy Molstar viewer on the client only
const MolstarViewer = dynamic(
  () => import('./MolstarViewer').then((m) => m.MolstarViewer),
  {
    ssr: false,
    // While loading show the same spinner used elsewhere in the app
    loading: () => (
      <div className="flex items-center justify-center p-4">
        <Spinner />
      </div>
    ),
  },
);

export interface MoleculeCardProps {
  pdbId: string;
  title?: string;
  height?: number;
  // Additional options forwarded to MolstarViewer
  layoutOptions?: {
    isExpanded?: boolean;
    showControls?: boolean;
    showSequence?: boolean;
    showLog?: boolean;
  };
}

/**
 * MoleculeCard – artifact-like wrapper around <MolstarViewer> so that
 * the interactive molecule embeds fit visually with the other artifact
 * components (images, code, sheets, …).
 */
export function MoleculeCard({
  pdbId,
  title,
  height = 400,
  layoutOptions,
}: MoleculeCardProps) {
  return (
    <div className="w-full border rounded-lg bg-background shadow-sm">
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
          <h3 className="text-sm font-medium leading-none truncate">{title}</h3>
          <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            {pdbId.toUpperCase()}
          </span>
        </div>
      )}

      {/* Interactive viewer */}
      <Suspense fallback={<Spinner />}>
        <MolstarViewer
          pdbId={pdbId}
          title={undefined /* title already rendered above */}
          height={height}
          layoutOptions={layoutOptions}
        />
      </Suspense>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-3 py-2 border-t bg-muted/50">
        <span>Interactive molecule</span>
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
} 