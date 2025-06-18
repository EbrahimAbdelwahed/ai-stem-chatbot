import { redirect } from 'next/navigation';
import { auth } from '@/app/(auth)/auth'; // Assuming auth is used to get userId
import { db } from '@/lib/db';
import { visualizations as visualizationsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { PlaygroundCard } from '@/components/playground-card'; // Import the new card
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';

export default async function PlaygroundPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/playground');
  }
  const userId = session.user.id;

  // Handle 'new' and 'id' search params if needed by other parts of the page
  // For now, we focus on fetching and displaying visualizations

  const userVisualizations = await db
    .select()
    .from(visualizationsTable)
    .where(eq(visualizationsTable.userId, userId))
    .orderBy(visualizationsTable.createdAt); // Optional: order by creation date

  // Remove old console.log and h1 if they exist
  // console.log(userVisualizations);
  // return <h1>Playground</h1>;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex justify-between items-center mb-6"> {/* Increased margin bottom */}
        <h1 className="text-3xl font-bold">Playground</h1> {/* Adjusted text size */}
        <Link href="/playground?new=true">
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" /> Create New
          </Button>
        </Link>
      </div>

      {userVisualizations.length === 0 ? (
        <div className="text-center text-muted-foreground mt-12"> {/* Increased top margin */}
          <p className="text-lg">You haven&apos;t created any visualizations yet.</p>
          <p className="text-sm mt-2">
            Click &quot;Create New&quot; to get started!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"> {/* Adjusted grid and gap */}
          {userVisualizations.map((viz) => (
            <PlaygroundCard key={viz.id} visualization={viz} />
          ))}
        </div>
      )}
    </div>
  );
}
