"use client";

import { Artifact, type ArtifactActionContext } from '@/components/create-artifact';
import { NGLViewer } from '@/components/visualizations/NGLViewer';
import { CopyIcon } from 'lucide-react'; // Assuming lucide-react is used for icons

// Wrapper component to adapt props. The artifact system passes the `content` prop as a **string**
// so we need to JSON-parse it to obtain the molecule information.
interface Molecule3DContentProps {
  title: string;
  content: string;
  status: 'streaming' | 'idle';
  isInline: boolean;
}

const Molecule3DContent = ({ content }: Molecule3DContentProps) => {
  let parsed: any = null;

  if (typeof content === 'string' && content.trim().length > 0) {
    try {
      parsed = JSON.parse(content);
    } catch {
      // If parsing fails we keep it null and show a placeholder below
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return <div className="p-4 text-gray-500">Initializing 3D Molecule Viewer...</div>;
  }

  const { identifierType, identifier, title } = parsed as {
    identifierType?: string;
    identifier?: string;
    title?: string;
  };

  if (identifierType !== 'pdb') {
    return (
      <div className="p-4 text-red-500">
        Error: This viewer currently only supports PDB identifiers. Received type: {identifierType}
      </div>
    );
  }

  if (!identifier) {
    return (
      <div className="p-4 text-orange-500">Warning: No PDB identifier provided.</div>
    );
  }

  return <NGLViewer pdbId={identifier} title={title} height={600} />;
};

export const molecule3dArtifact = new Artifact({
  kind: 'molecule3d',
  description: 'Interactive 3D molecule viewer using NGL.',
  onStreamPart: ({ streamPart, setArtifact }) => {
    // We only care about custom "molecule3d" deltas that carry the payload
    if ((streamPart as any).type === 'molecule3d') {
      const payload = streamPart as unknown as Record<string, unknown>;

      setArtifact((prev) => ({
        ...prev,
        content: JSON.stringify(payload) as unknown as string,
        isVisible: true,
        status: 'idle',
      }));
    }
  },
  content: Molecule3DContent,
  actions: [
    {
      icon: <CopyIcon size={18} />,
      description: 'Copy PDB ID',
      onClick: async ({ content }: ArtifactActionContext) => {
        try {
          const parsed = JSON.parse(content);
          if (parsed?.identifier) {
            await navigator.clipboard.writeText(parsed.identifier);
          }
        } catch {
          // ignore JSON parse errors
        }
      },
      isDisabled: ({ content }: ArtifactActionContext) => {
        try {
          const parsed = JSON.parse(content);
          return !(parsed?.identifier && parsed?.identifierType === 'pdb');
        } catch {
          return true;
        }
      },
    },
  ],
  toolbar: [],
});
