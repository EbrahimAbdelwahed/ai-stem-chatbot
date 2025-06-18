import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { BarChart3Icon, MoleculeIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Visualization } from '@/lib/db/schema'; // Adjusted import path

interface PlaygroundCardProps {
  visualization: Visualization;
}

export function PlaygroundCard({ visualization }: PlaygroundCardProps) {
  return (
    <Link href={`/playground?id=${visualization.id}`} className="block">
      <Card>
        <CardHeader>
          <CardTitle>{visualization.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted flex items-center justify-center rounded-md mb-2">
            {visualization.type === 'plot' ? (
              <BarChart3Icon className="h-12 w-12 text-muted-foreground" />
            ) : (
              <MoleculeIcon className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {visualization.description}
          </p>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(visualization.createdAt), { addSuffix: true })}
          </p>
        </CardFooter>
      </Card>
    </Link>
  );
}
