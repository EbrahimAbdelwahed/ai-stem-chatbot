import { auth } from '@/app/(auth)/auth';
import { getUserVisualizations } from '@/lib/db/queries';
import PlaygroundWorkspace from '@/components/playground-workspace'; // Import the new component
import Link from 'next/link'; // For the "Back" button
import { Button } from '@/components/ui/button'; // For styling the "Back" button
// import { ChevronLeft } from 'lucide-react'; // Optional: for an icon button

interface PlaygroundPageProps {
  searchParams: {
    id?: string;
    new?: string;
  };
}

export default async function PlaygroundPage({ searchParams }: PlaygroundPageProps) {
  const session = await auth();
  const userId = session?.user?.id;

  // Data fetching for gallery (can be kept for when gallery is implemented)
  // if (userId) {
  //   try {
  //     const visualizations = await getUserVisualizations(userId);
  //     // console.log('Fetched visualizations:', visualizations);
  //   } catch (error) {
  //     console.error('Error fetching visualizations:', error);
  //   }
  // } else {
  //   // console.log('User not authenticated or session/user ID missing.');
  // }

  const { id, new: isNew } = searchParams;

  if (id || isNew === 'true') {
    return (
      <div className="flex flex-col h-screen p-4">
        <div className="mb-4">
          <Link href="/playground">
            <Button variant="outline">
              {/* <ChevronLeft className="mr-2 h-4 w-4" /> Optional Icon */}
              Back to Gallery
            </Button>
          </Link>
        </div>
        <div className="flex-grow">
          <PlaygroundWorkspace
            visualizationId={id}
            isNew={isNew === 'true'}
          />
        </div>
      </div>
    );
  }

  // Render Gallery View (Placeholder for now, as per Task 5.2)
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Visualizations Gallery</h1>
      {/* TODO: Implement the Gallery View component from Task 5.2 here */}
      <p>Gallery of visualizations will be displayed here.</p>
      <p>
        To create a new visualization, you would typically click a 'Create New' button
        which would navigate to <Link href="/playground?new=true" className="text-blue-500 hover:underline">/playground?new=true</Link>.
      </p>
      <p>
        To view an existing one, you would click on a card which would navigate to something like
        <Link href="/playground?id=example-id" className="text-blue-500 hover:underline">/playground?id=example-id</Link>.
      </p>
    </div>
  );
}
