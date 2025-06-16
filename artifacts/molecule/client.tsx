"use client";

import { Artifact, type ArtifactComponentProps } from '@/components/create-artifact';
import { NGLViewer } from '@/components/visualizations/NGLViewer';
import { CopyIcon } from 'lucide-react'; // Assuming lucide-react is used for icons

// Wrapper component to adapt props
const Molecule3DContent = (props: ArtifactComponentProps) => {
  // props.content here is the object returned by displayMolecule3D's execute function
  // It can also be the full artifact object if the stream has completed.
  const contentData = props.content; 

  if (!contentData || typeof contentData !== 'object') {
    return <div className="p-4 text-gray-500">Initializing 3D Molecule Viewer...</div>;
  }

  const { identifierType, identifier, title } = contentData;

  if (identifierType !== 'pdb') {
    return (
      <div className="p-4 text-red-500">
        Error: This viewer currently only supports PDB identifiers. Received type: {identifierType}
      </div>
    );
  }

  if (!identifier) {
    return (
      <div className="p-4 text-orange-500">
        Warning: No PDB identifier provided.
      </div>
    );
  }

  return <NGLViewer pdbId={identifier} title={title as string | undefined} height={600} />;
};

export const molecule3dArtifact = new Artifact({
  kind: 'molecule3d',
  description: 'Interactive 3D molecule viewer using NGL.',
  onStreamPart: ({ streamPart, setArtifact, getArtifact }) => {
    if (streamPart.type === 'molecule3d' && streamPart.content) {
      setArtifact(prev => ({
        ...prev,
        // The content from the tool IS the artifact content
        content: { ...prev.content, ...streamPart.content },
        isVisible: true,
        status: 'idle',
      }));
    } else if (streamPart.type === 'artifact_ui' && streamPart.content) {
      // Handle general UI updates if necessary, e.g. title
      setArtifact(prev => ({
        ...prev,
        title: streamPart.content.title || prev.title,
        // content might also be updated here if the UI stream carries it
        content: streamPart.content.content ? { ...prev.content, ...streamPart.content.content } : prev.content,
        isVisible: true,
        status: 'idle',
      }));
    } else if (streamPart.type === 'error') {
      setArtifact(prev => ({
        ...prev,
        status: 'error',
        error: streamPart.error,
        isVisible: true,
      }));
    }
  },
  content: Molecule3DContent,
  actions: [
    {
      id: 'copy-pdb-id',
      label: 'Copy PDB ID',
      icon: CopyIcon,
      action: async ({ artifact }) => {
        const content = artifact.content as { identifier?: string };
        if (content?.identifier && navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(content.identifier);
            // Optionally: show a toast or notification for success
            console.log('PDB ID copied to clipboard:', content.identifier);
          } catch (err) {
            console.error('Failed to copy PDB ID:', err);
            // Optionally: show an error toast
          }
        }
      },
      // Disable if identifier is not available
      disabled: ({ artifact }) => {
        const content = artifact.content as { identifier?: string, identifierType?: string };
        return !content?.identifier || content?.identifierType !== 'pdb';
      },
    },
  ],
  toolbar: [],
});
