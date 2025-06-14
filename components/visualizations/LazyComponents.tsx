import { lazy, Suspense } from 'react';
import { 
  VisualizationSkeleton, 
  ChartSkeleton, 
  Molecule3DSkeleton,
  CodePreviewSkeleton
} from '@/lib/lazy-loading';

// Lazy load heavy visualization components
export const LazyPlotlyPlot = lazy(() => 
  import('react-plotly.js').then(module => ({
    default: module.default
  }))
);

export const LazyPlotlyPlotter = lazy(() => 
  import('./PlotlyPlotter').then(module => ({
    default: module.default
  }))
);

export const LazyMolecule3DViewer = lazy(() => 
  import('./Molecule3DViewer').then(module => ({
    default: module.default
  }))
);

export const LazyAdvanced3DMolViewer = lazy(() => 
  import('./Advanced3DMolViewer').then(module => ({
    default: module.default
  }))
);

export const LazySimple3DMolViewer = lazy(() => 
  import('./Simple3DMolViewer').then(module => ({
    default: module.default
  }))
);

export const LazyMolStarWrapper = lazy(() => 
  import('./MolStarWrapper').then(module => ({ default: module.MolStarWrapper }))
);

export const LazyMatterSimulator = lazy(() => 
  import('./MatterSimulator').then(module => ({
    default: module.default
  }))
);

export const LazyConwaysGameOfLife = lazy(() => 
  import('./ConwaysGameOfLife').then(module => ({
    default: module.default
  }))
);

export const LazyCodePreview = lazy(() => 
  import('../CodePreview').then(module => ({
    default: module.default
  }))
);

// Wrapper components with Suspense
export function PlotlyPlot(props: any) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyPlotlyPlot {...props} />
    </Suspense>
  );
}

export function PlotlyPlotter(props: any) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyPlotlyPlotter {...props} />
    </Suspense>
  );
}

export function Molecule3DViewer(props: any) {
  return (
    <Suspense fallback={<Molecule3DSkeleton />}>
      <LazyMolecule3DViewer {...props} />
    </Suspense>
  );
}

export function Advanced3DMolViewer(props: any) {
  return (
    <Suspense fallback={<Molecule3DSkeleton />}>
      <LazyAdvanced3DMolViewer {...props} />
    </Suspense>
  );
}

export function Simple3DMolViewer(props: any) {
  return (
    <Suspense fallback={<Molecule3DSkeleton />}>
      <LazySimple3DMolViewer {...props} />
    </Suspense>
  );
}

export function MolStarWrapper(props: any) {
  return (
    <Suspense fallback={<Molecule3DSkeleton />}>
      <LazyMolStarWrapper {...props} />
    </Suspense>
  );
}

export function MatterSimulator(props: any) {
  return (
    <Suspense fallback={<VisualizationSkeleton />}>
      <LazyMatterSimulator {...props} />
    </Suspense>
  );
}

export function ConwaysGameOfLife(props: any) {
  return (
    <Suspense fallback={<VisualizationSkeleton />}>
      <LazyConwaysGameOfLife {...props} />
    </Suspense>
  );
}

export function CodePreview(props: any) {
  return (
    <Suspense fallback={<CodePreviewSkeleton />}>
      <LazyCodePreview {...props} />
    </Suspense>
  );
} 