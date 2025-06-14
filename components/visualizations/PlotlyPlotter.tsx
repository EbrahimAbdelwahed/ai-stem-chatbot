'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';
import * as math from 'mathjs'; // Assuming math.js is installed
import type { Data, Layout } from 'plotly.js';

interface PlotVariable {
  name: string;
  range: [number, number];
}

interface PlotParams {
  functionString: string;
  variables: PlotVariable[];
  plotType: 'scatter' | 'line' | 'surface' | 'contour';
  title?: string;
  // Potentially other plot-specific options from the LLM if the schema evolves
}

interface PlotlyPlotterProps {
  params: PlotParams;
  description?: string;
}

const PlotlyPlotter: React.FC<PlotlyPlotterProps> = ({ params, description }) => {
  const [plotData, setPlotData] = useState<Data[]>([]);
  const [plotLayout, setPlotLayout] = useState<Partial<Layout>>({});
  const [error, setError] = useState<string | null>(null);

  const processedParams = useMemo(() => {
    // Basic validation or defaulting for params if necessary
    return {
      ...params,
      plotType: params.plotType || 'line',
      variables: params.variables || [],
    };
  }, [params]);

  useEffect(() => {
    if (!processedParams.functionString || processedParams.variables.length === 0) {
      setError('Missing function string or variables for plotting.');
      setPlotData([]);
      return;
    }
    setError(null);

    try {
      const node = math.parse(processedParams.functionString);
      const code = node.compile();

      const newPlotData: Data[] = [];
      const newPlotLayout: Partial<Layout> = {
        title: processedParams.title || processedParams.functionString,
        margin: { t: 50, b: 50, l: 50, r: 50 }, 
        paper_bgcolor: 'rgba(0,0,0,0)', 
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: {
            color: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#FFF' : '#000'
        },
        xaxis: { 
            gridcolor: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#444' : '#ddd',
            zerolinecolor: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#666' : '#ccc',
            color: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#FFF' : '#000',
        },
        yaxis: { 
            gridcolor: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#444' : '#ddd',
            zerolinecolor: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#666' : '#ccc',
            color: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#FFF' : '#000',
        }
      };

      const numPoints = 100; 

      if (processedParams.variables.length === 1) {
        const [xVar] = processedParams.variables;
        const xValues = math.range(xVar.range[0], xVar.range[1], (xVar.range[1] - xVar.range[0]) / numPoints, true).toArray() as number[];
        const yValues = xValues.map(x => code.evaluate({ [xVar.name]: x }));
        
        newPlotLayout.xaxis = { ...newPlotLayout.xaxis, title: xVar.name };
        newPlotLayout.yaxis = { ...newPlotLayout.yaxis, title: `f(${xVar.name})` };

        if (processedParams.plotType === 'line' || processedParams.plotType === 'scatter') {
          newPlotData.push({
            x: xValues,
            y: yValues,
            type: 'scatter',
            mode: processedParams.plotType === 'line' ? 'lines' : 'markers',
            name: processedParams.functionString,
            line: { color: '#1f77b4' }, 
            marker: { color: '#1f77b4' } 
          });
        } else {
          setError(`Plot type '${processedParams.plotType}' not supported for 1 variable. Defaulting to line.`);
           newPlotData.push({
            x: xValues,
            y: yValues,
            type: 'scatter',
            mode: 'lines',
            name: processedParams.functionString,
            line: { color: '#1f77b4' },
          });
        }
      } else if (processedParams.variables.length === 2) {
        const [xVar, yVar] = processedParams.variables;
        const xGridPoints = processedParams.plotType === 'surface' || processedParams.plotType === 'contour' ? 25 : numPoints; // Fewer for surface/contour
        const yGridPoints = processedParams.plotType === 'surface' || processedParams.plotType === 'contour' ? 25 : numPoints;

        const xValues = math.range(xVar.range[0], xVar.range[1], (xVar.range[1] - xVar.range[0]) / xGridPoints, true).toArray() as number[];
        const yValues = math.range(yVar.range[0], yVar.range[1], (yVar.range[1] - yVar.range[0]) / yGridPoints, true).toArray() as number[];
        const zValues: (number | null)[][] = []; // Allow null for discontinuities

        for (let i = 0; i < yValues.length; i++) {
          const row: (number | null)[] = [];
          for (let j = 0; j < xValues.length; j++) {
            try {
              const val = code.evaluate({ [xVar.name]: xValues[j], [yVar.name]: yValues[i] });
              row.push(Number.isFinite(val) ? val : null);
            } catch (e) {
              row.push(null); // Handle evaluation errors (e.g. division by zero) as gaps
            }
          }
          zValues.push(row);
        }
        const baseGridColor = typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#444' : '#ddd';
        const baseLineColor = typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#666' : '#ccc';
        const baseFontColor = typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#FFF' : '#000';

        newPlotLayout.scene = {
            xaxis: { title: xVar.name, gridcolor: baseGridColor, zerolinecolor: baseLineColor, color: baseFontColor, titlefont: { color: baseFontColor } },
            yaxis: { title: yVar.name, gridcolor: baseGridColor, zerolinecolor: baseLineColor, color: baseFontColor, titlefont: { color: baseFontColor } },
            zaxis: { title: `f(${xVar.name}, ${yVar.name})`, gridcolor: baseGridColor, zerolinecolor: baseLineColor, color: baseFontColor, titlefont: { color: baseFontColor } },
        };

        if (processedParams.plotType === 'surface' || processedParams.plotType === 'contour') {
          newPlotData.push({
            x: xValues,
            y: yValues,
            z: zValues as number[][], // Cast assuming Plotly handles nulls appropriately or they've been filtered
            type: processedParams.plotType,
            name: processedParams.functionString,
            colorscale: 'Viridis',
            contours: processedParams.plotType === 'contour' ? { coloring: 'lines' } : undefined
          });
        } else {
           setError(`Plot type '${processedParams.plotType}' not supported for 2 variables. Defaulting to surface.`);
           newPlotData.push({
            x: xValues,
            y: yValues,
            z: zValues as number[][],
            type: 'surface',
            name: processedParams.functionString,
            colorscale: 'Viridis'
          });
        }
      } else {
        setError('Plotting supports 1 or 2 variables currently.');
        setPlotData([]);
        return;
      }

      setPlotData(newPlotData);
      setPlotLayout(newPlotLayout);
    } catch (e: any) {
      console.error('Error processing plot params or generating plot:', e);
      setError(`Failed to render plot: ${e.message}`);
      setPlotData([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processedParams]); // processedParams ensures this runs when relevant params change

  // Effect to update plot colors on theme change
  useEffect(() => {
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('dark');
          setPlotLayout(prevLayout => ({
            ...prevLayout,
            font: { ...prevLayout.font, color: isDark ? '#FFF' : '#000' },
            xaxis: { ...prevLayout.xaxis, gridcolor: isDark ? '#444' : '#ddd', zerolinecolor: isDark ? '#666' : '#ccc', color: isDark ? '#FFF' : '#000' },
            yaxis: { ...prevLayout.yaxis, gridcolor: isDark ? '#444' : '#ddd', zerolinecolor: isDark ? '#666' : '#ccc', color: isDark ? '#FFF' : '#000' },
            zaxis: { ...prevLayout.scene?.zaxis, gridcolor: isDark ? '#444' : '#ddd', zerolinecolor: isDark ? '#666' : '#ccc', color: isDark ? '#FFF' : '#000', titlefont: {color: isDark ? '#FFF' : '#000'} },
          }));
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);


  if (error) {
    return <div className="p-4 text-red-500 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-md">Error: {error}</div>;
  }

  // Do not show "Generating plot..." if there was an error during processing that didn't set plotData (e.g. unsupported variables)
  if (plotData.length === 0 && !error) {
    return <div className="p-4 text-gray-500">Generating plot...</div>;
  }

  return (
    <div className="w-full bg-transparent p-1 rounded-md">
      <Plot
        data={plotData}
        layout={plotLayout}
        useResizeHandler={true}
        className="w-full h-full min-h-[400px] md:min-h-[450px]"
        config={{ responsive: true, displaylogo: false }}
      />
      {description && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 p-1 text-center">
          {description}
        </p>
      )}
    </div>
  );
};

export default PlotlyPlotter; 