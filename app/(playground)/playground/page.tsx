import { auth } from '@/app/(auth)/auth';
import { getUserVisualizations } from '@/lib/db/queries';

export default async function PlaygroundPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (userId) {
    try {
      const visualizations = await getUserVisualizations(userId);
      console.log('Fetched visualizations:', visualizations);
    } catch (error) {
      console.error('Error fetching visualizations:', error);
    }
  } else {
    console.log('User not authenticated or session/user ID missing.');
  }

  return (
    <div>
      <h1>Playground</h1>
      {/* Visualizations will be rendered here in a later step */}
    </div>
  );
}
