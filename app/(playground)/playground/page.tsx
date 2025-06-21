import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/app/(auth)/auth';
import { getUserVisualizations } from '@/lib/db/queries';
import { PlaygroundCard } from '@/components/playground-card';
import PlaygroundWorkspace from '@/components/playground-workspace';
import { Button } from '@/components/ui/button';
import { PlusIcon, ChevronLeft } from 'lucide-react';

interface PlaygroundPageProps {
  searchParams: {
    id?: string;
    new?: string;
  };
}

export default async function PlaygroundPage({ searchParams }: PlaygroundPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/playground');
  }
  const userId = session.user.id;

  const { id, new: isNew } = searchParams;

  // If we are in a workspace view (either new or existing), render the workspace.
  if (id || isNew === 'true') {
    return (
      <div className="flex flex-col h-full p-4">
        <div className="mb-4 shrink-0">
          <Link href="/playground">
            <Button variant="outline" size="sm">
              <ChevronLeft className="mr-2 size-4" />
              Back to Gallery
            </Button>
          </Link>
        </div>
        <div className="grow min-h-0">
          <PlaygroundWorkspace
            visualizationId={id}
            isNew={isNew === 'true'}
          />
        </div>
      </div>
    );
  }

  // Otherwise, fetch data for and render the gallery view.
  const userVisualizations = await getUserVisualizations(userId);

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Playground</h1>
        <Link href="/playground?new=true">
          <Button>
            <PlusIcon className="mr-2 size-4" /> Create New
          </Button>
        </Link>
      </div>

      {userVisualizations.length === 0 ? (
        <div className="text-center text-muted-foreground mt-12">
          <p className="text-lg">You haven&apos;t created any visualizations yet.</p>
          <p className="text-sm mt-2">
            Click &quot;Create New&quot; to get started!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {userVisualizations.map((viz) => (
            <PlaygroundCard key={viz.id} visualization={viz} />
          ))}
        </div>
      )}
    </div>
  );
}