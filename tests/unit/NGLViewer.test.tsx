import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { NGLViewer } from '@/components/visualizations/NGLViewer';

// Mock the `ngl` package used via dynamic import inside the component.
// The mock adds a <canvas> element to the provided container so that React
// needs to clean it up on re-render—mirroring the real library's behaviour.
// It intentionally rejects `loadFile` to trigger the error path we are testing.

jest.mock('ngl', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function Stage(this: any, container: HTMLElement) {
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    this.handleResize = jest.fn();
    this.loadFile = jest.fn(() =>
      Promise.reject(new Error('Download failed with status code 404')),
    );
    this.dispose = jest.fn(() => {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    });
  }

  return {
    __esModule: true,
    Stage,
    default: { Stage },
  };
});

describe('NGLViewer', () => {
  it('shows an error overlay when structure download fails without crashing React', async () => {
    render(<NGLViewer pdbId="1ABC" title="Test viewer" />);

    // Wait until the component displays the error overlay
    await waitFor(() =>
      expect(screen.getByText(/Error Loading Structure/i)).toBeInTheDocument(),
    );

    // Confirm that the PDB ID is displayed in uppercase as part of the error overlay
    expect(screen.getByText(/PDB ID: 1ABC/i)).toBeInTheDocument();
  });
}); 