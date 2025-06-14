'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface ConwaysGameOfLifeProps {
  width?: number;
  height?: number;
  cellSize?: number;
}

type Pattern = {
  name: string;
  description: string;
  cells: [number, number][];
  type: 'growth' | 'decay' | 'oscillator';
};

// Simple SVG icons to replace lucide-react
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5,3 19,12 5,21" />
  </svg>
);

const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const ResetIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23,4 23,10 17,10" />
    <path d="M20.49,15a9,9,0,1,1-2.12-9.36L23,10" />
  </svg>
);

const ZapIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
  </svg>
);

// Predefined patterns that create growth or decay behaviors
const PATTERNS: Pattern[] = [
  {
    name: 'R-pentomino',
    description: 'Classic growth pattern that evolves for 1103 generations',
    type: 'growth',
    cells: [
      [1, 2], [2, 1], [2, 2], [2, 3], [3, 1]
    ]
  },
  {
    name: 'Acorn',
    description: 'Small pattern that grows for 5206 generations',
    type: 'growth',
    cells: [
      [2, 1], [4, 2], [1, 3], [2, 3], [5, 3], [6, 3], [7, 3]
    ]
  },
  {
    name: 'Diehard',
    description: 'Pattern that completely disappears after 130 generations',
    type: 'decay',
    cells: [
      [7, 1], [1, 2], [2, 2], [2, 3], [6, 3], [7, 3], [8, 3]
    ]
  },
  {
    name: 'Seeds',
    description: 'Expanding pattern that creates scattered structures',
    type: 'growth',
    cells: [
      [3, 1], [4, 1], [2, 2], [3, 2], [3, 3], [4, 3], [4, 4], [5, 4]
    ]
  },
  {
    name: 'Random Growth',
    description: 'Random initial state optimized for growth',
    type: 'growth',
    cells: [] // Will be filled with random pattern
  }
];

export default function ConwaysGameOfLife({ 
  width = 800, 
  height = 600, 
  cellSize = 8 
}: ConwaysGameOfLifeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const [isRunning, setIsRunning] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [speed, setSpeed] = useState(100); // milliseconds between generations
  const [selectedPattern, setSelectedPattern] = useState<Pattern>(PATTERNS[0]);
  const [population, setPopulation] = useState(0);
  
  const rows = Math.floor(height / cellSize);
  const cols = Math.floor(width / cellSize);
  const gridRef = useRef<number[][]>([]);

  // Initialize empty grid
  const createEmptyGrid = useCallback(() => {
    return Array(rows).fill(null).map(() => Array(cols).fill(0));
  }, [rows, cols]);

  // Count living neighbors
  const countNeighbors = useCallback((grid: number[][], row: number, col: number) => {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        const newRow = row + i;
        const newCol = col + j;
        if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
          count += grid[newRow][newCol];
        }
      }
    }
    return count;
  }, [rows, cols]);

  // Apply Conway's rules
  const updateGrid = useCallback((grid: number[][]) => {
    const newGrid = createEmptyGrid();
    let livingCells = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const neighbors = countNeighbors(grid, row, col);
        const isAlive = grid[row][col] === 1;

        if (isAlive && (neighbors === 2 || neighbors === 3)) {
          newGrid[row][col] = 1;
          livingCells++;
        } else if (!isAlive && neighbors === 3) {
          newGrid[row][col] = 1;
          livingCells++;
        }
      }
    }

    setPopulation(livingCells);
    return newGrid;
  }, [rows, cols, countNeighbors, createEmptyGrid]);

  // Enhanced drawing with gradients and colors
  const drawGrid = useCallback((grid: number[][]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines (subtle)
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= rows; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(width, i * cellSize);
      ctx.stroke();
    }
    for (let i = 0; i <= cols; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, height);
      ctx.stroke();
    }

    // Draw living cells with enhanced visuals
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (grid[row][col] === 1) {
          const x = col * cellSize;
          const y = row * cellSize;
          
          // Create gradient for living cells
          const gradient = ctx.createRadialGradient(
            x + cellSize/2, y + cellSize/2, 0,
            x + cellSize/2, y + cellSize/2, cellSize/2
          );
          
          // Color based on pattern type
          if (selectedPattern.type === 'growth') {
            gradient.addColorStop(0, '#00ff88');
            gradient.addColorStop(1, '#00aa44');
          } else if (selectedPattern.type === 'decay') {
            gradient.addColorStop(0, '#ff6b6b');
            gradient.addColorStop(1, '#cc3333');
          } else {
            gradient.addColorStop(0, '#4dabf7');
            gradient.addColorStop(1, '#2b77aa');
          }
          
          ctx.fillStyle = gradient;
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
          
          // Add glow effect
          ctx.shadowColor = selectedPattern.type === 'growth' ? '#00ff88' : 
                           selectedPattern.type === 'decay' ? '#ff6b6b' : '#4dabf7';
          ctx.shadowBlur = 4;
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
          ctx.shadowBlur = 0;
        }
      }
    }
  }, [width, height, cellSize, rows, cols, selectedPattern.type]);

  // Place pattern in the center of the grid
  const placePattern = useCallback((pattern: Pattern) => {
    const grid = createEmptyGrid();
    const centerRow = Math.floor(rows / 2);
    const centerCol = Math.floor(cols / 2);

    if (pattern.name === 'Random Growth') {
      // Create optimized random pattern for growth
      let cellCount = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Higher density in center, sparse at edges for growth potential
          const distanceFromCenter = Math.sqrt(
            Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2)
          );
          const maxDistance = Math.sqrt(centerRow * centerRow + centerCol * centerCol);
          const probability = Math.max(0.1, 0.4 * (1 - distanceFromCenter / maxDistance));
          
          if (Math.random() < probability && cellCount < rows * cols * 0.15) {
            grid[row][col] = 1;
            cellCount++;
          }
        }
      }
    } else {
      // Place predefined pattern
      pattern.cells.forEach(([offsetRow, offsetCol]) => {
        const row = centerRow + offsetRow;
        const col = centerCol + offsetCol;
        if (row >= 0 && row < rows && col >= 0 && col < cols) {
          grid[row][col] = 1;
        }
      });
    }

    gridRef.current = grid;
    setGeneration(0);
    setPopulation(grid.flat().reduce((sum, cell) => sum + cell, 0));
    drawGrid(grid);
  }, [rows, cols, createEmptyGrid, drawGrid]);

  // Animation loop
  useEffect(() => {
    if (isRunning) {
      const animate = () => {
        gridRef.current = updateGrid(gridRef.current);
        drawGrid(gridRef.current);
        setGeneration(prev => prev + 1);
        
        setTimeout(() => {
          animationRef.current = requestAnimationFrame(animate);
        }, speed);
      };
      
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, speed, updateGrid, drawGrid]);

  // Initialize grid on mount
  useEffect(() => {
    gridRef.current = createEmptyGrid();
    placePattern(selectedPattern);
  }, [createEmptyGrid, placePattern, selectedPattern]);

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleReset = () => {
    setIsRunning(false);
    placePattern(selectedPattern);
  };

  const handlePatternChange = (pattern: Pattern) => {
    setIsRunning(false);
    setSelectedPattern(pattern);
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ZapIcon />
          Conway&apos;s Game of Life
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          A cellular automaton demonstrating how complex patterns emerge from simple rules. 
          Watch growth and decay patterns evolve over time.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-2">
              <Button 
                onClick={handleStart} 
                disabled={isRunning}
                variant="primary"
                size="sm"
                icon={<PlayIcon />}
              >
                Start
              </Button>
              <Button 
                onClick={handlePause} 
                disabled={!isRunning}
                variant="outline"
                size="sm"
                icon={<PauseIcon />}
              >
                Pause
              </Button>
              <Button 
                onClick={handleReset}
                variant="outline"
                size="sm"
                icon={<ResetIcon />}
              >
                Reset
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Speed:</label>
              <input
                type="range"
                min="10"
                max="500"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-xs text-muted-foreground">{speed}ms</span>
            </div>
          </div>

          {/* Pattern Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Pattern:</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {PATTERNS.map((pattern) => (
                <Button
                  key={pattern.name}
                  onClick={() => handlePatternChange(pattern)}
                  variant={selectedPattern.name === pattern.name ? "primary" : "outline"}
                  size="sm"
                  className="text-xs"
                >
                  {pattern.name}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedPattern.description}
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-6 text-sm">
            <div>
              <span className="font-medium">Generation:</span> {generation}
            </div>
            <div>
              <span className="font-medium">Population:</span> {population}
            </div>
            <div>
              <span className="font-medium">Type:</span> 
              <span className={`ml-1 capitalize ${
                selectedPattern.type === 'growth' ? 'text-green-500' : 
                selectedPattern.type === 'decay' ? 'text-red-500' : 'text-blue-500'
              }`}>
                {selectedPattern.type}
              </span>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              className="border border-border rounded-lg"
              style={{ 
                maxWidth: '100%', 
                height: 'auto',
                background: '#0a0a0a'
              }}
            />
          </div>

          {/* Educational Info */}
          <div className="mt-6 p-4 bg-muted rounded-lg text-sm">
            <h4 className="font-semibold mb-2">The Rules of Life:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Birth:</strong> A dead cell with exactly 3 live neighbors becomes alive</li>
              <li>• <strong>Survival:</strong> A live cell with 2 or 3 neighbors stays alive</li>
              <li>• <strong>Death:</strong> A live cell with fewer than 2 or more than 3 neighbors dies</li>
            </ul>
            <p className="mt-2 text-muted-foreground">
              These simple rules create complex emergent behaviors, demonstrating how mathematical 
              systems can exhibit unpredictable growth, decay, and pattern formation.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 