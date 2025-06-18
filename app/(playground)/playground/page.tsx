// app/(playground)/playground/page.tsx

import PlaygroundWorkspace from '@/components/playground-workspace'; // Adjust path if necessary

interface PlaygroundPageProps {
  searchParams?: {
    visualizationId?: string;
    // Potentially other params like 'new' could explicitly be used,
    // but presence of visualizationId implies not new.
  };
}

export default function PlaygroundPage({ searchParams }: PlaygroundPageProps) {
  const visualizationId = searchParams?.visualizationId;
  const isNew = !visualizationId; // If there's a visualizationId, it's not a new workspace from scratch.

  return (
    <PlaygroundWorkspace
      visualizationId={visualizationId}
      isNew={isNew}
    />
  );
}
