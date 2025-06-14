import { tool } from 'ai';
import { z } from 'zod';

export const displayMolecule3D = tool({
  description: 'Displays a 3D molecular structure with advanced visualization options. Supports PDB, SMILES, CID, and compound names with customizable representation styles, coloring schemes, surface rendering, and region-specific styling.',
  parameters: z.object({
    identifierType: z.enum(['pdb', 'smiles', 'cid', 'name'])
      .describe("Molecular identifier type: 'pdb' for Protein Data Bank IDs, 'smiles' for chemical structure notation, 'cid' for PubChem compound IDs, or 'name' for compound names"),
    identifier: z.string()
      .describe("The molecular identifier (e.g., '1CRN' for PDB, 'CCO' for ethanol SMILES, '702' for PubChem CID)"),
    
    // Advanced visualization options
    representationStyle: z.enum(['stick', 'sphere', 'line', 'cartoon', 'surface', 'ball-stick'])
      .default('stick')
      .describe("3D representation style"),
    colorScheme: z.enum(['element', 'chain', 'residue', 'ss', 'spectrum', 'custom'])
      .default('element'),
    
    // Region-specific options
    selections: z.array(z.object({
      region: z.string().describe("Selection criteria using 3Dmol syntax"),
      style: z.enum(['stick', 'sphere', 'line', 'cartoon', 'surface']),
      color: z.string().describe("Custom color for this region")
    })).default([]),
    
    // Surface options
    showSurface: z.boolean().default(false),
    surfaceType: z.enum(['vdw', 'sas', 'ms']).default('vdw'),
    surfaceOpacity: z.number().min(0).max(1).default(0.7),
    
    // Display options
    showLabels: z.boolean().default(false),
    backgroundColor: z.string().default('white'),
    description: z.string().default(''),
  }),
  execute: async ({ 
    identifierType, identifier, representationStyle, colorScheme, 
    selections, showSurface, surfaceType, surfaceOpacity, 
    showLabels, backgroundColor, description 
  }) => {
    // Return the props that will be used to render the component
    return {
      type: 'molecule3d',
      identifierType: identifierType as 'smiles' | 'pdb' | 'name' | 'cid',
      identifier,
      representationStyle: representationStyle as 'stick' | 'sphere' | 'line' | 'cartoon' | 'surface' | 'ball-stick',
      colorScheme: colorScheme as 'element' | 'chain' | 'residue' | 'ss' | 'spectrum' | 'custom',
      selections: selections || [],
      showSurface,
      surfaceType: surfaceType as 'vdw' | 'sas' | 'ms',
      surfaceOpacity,
      showLabels,
      backgroundColor,
      title: `3D Structure - ${identifier}`,
      description: description || `Advanced 3D view of ${identifierType.toUpperCase()}: ${identifier}`,
    };
  },
});

export const plotFunction2D = tool({
  description: 'Plots 2D mathematical functions. Use for single-variable functions like sin(x), x^2, etc.',
  parameters: z.object({
    functionString: z.string()
      .describe("The mathematical function to plot using math.js syntax"),
    variable: z.object({
      name: z.string().describe("Name of the variable, typically 'x'"),
      range: z.array(z.number()).length(2).describe("Range [min, max] for the variable")
    }),
    plotType: z.enum(['line', 'scatter']).default('line'),
    title: z.string().optional(),
  }),
  execute: async ({ functionString, variable, plotType, title }) => {
    return {
      type: 'plot2d',
      functionString,
      variables: [variable],
      plotType,
      title: title || `Plot of ${functionString}`,
      description: `2D ${plotType} plot of ${functionString}`,
    };
  },
});

export const plotFunction3D = tool({
  description: 'Plots 3D mathematical functions. Use for two-variable functions like sin(x)*cos(y), x^2 + y^2, etc.',
  parameters: z.object({
    functionString: z.string()
      .describe("The mathematical function to plot using math.js syntax"),
    variables: z.array(z.object({
      name: z.string(),
      range: z.array(z.number()).length(2)
    })).length(2),
    plotType: z.enum(['surface', 'contour']).default('surface'),
    title: z.string().optional(),
  }),
  execute: async ({ functionString, variables, plotType, title }) => {
    return {
      type: 'plot3d',
      functionString,
      variables,
      plotType,
      title: title || `3D Plot of ${functionString}`,
      description: `3D ${plotType} plot of ${functionString}`,
    };
  },
});

export const displayPlotlyChart = tool({
  description: 'Displays a 2D plot or chart using Plotly. Use for data that can be plotted like line charts, scatter plots, etc.',
  parameters: z.object({
    data: z.any().describe('The data array for Plotly'),
    layout: z.any().optional().describe('The layout object for Plotly'),
    description: z.string().optional(),
  }),
  execute: async ({ data, layout, description }) => {
    return {
      type: 'plotly',
      data,
      layout: layout || { title: description || 'Chart' },
      description: description || 'Interactive Plot',
    };
  },
});

export const displayPhysicsSimulation = tool({
  description: 'Displays a 2D physics simulation using Matter.js. Use for requests involving physics concepts like falling objects, collisions, pendulums, springs, projectiles, inclined planes, and other mechanics demonstrations.',
  parameters: z.object({
    simulationType: z.enum(['falling_objects', 'pendulum', 'collision', 'spring', 'projectile', 'inclined_plane', 'custom'])
      .describe('Type of physics simulation to create'),
    objects: z.array(z.object({
      type: z.enum(['circle', 'rectangle', 'polygon']),
      x: z.number(),
      y: z.number(),
      width: z.number().optional(),
      height: z.number().optional(),
      radius: z.number().optional(),
      isStatic: z.boolean().default(false),
      color: z.string().default('#3498db'),
      restitution: z.number().min(0).max(1).default(0.8),
      friction: z.number().min(0).max(1).default(0.1),
    })).describe('Array of physics objects to include in the simulation'),
    gravity: z.object({
      x: z.number().default(0),
      y: z.number().default(1),
    }).default({ x: 0, y: 1 }),
    worldBounds: z.object({
      width: z.number().default(800),
      height: z.number().default(600),
    }).default({ width: 800, height: 600 }),
    title: z.string().optional(),
    description: z.string().optional(),
  }),
  execute: async (params) => {
    return {
      type: 'physics',
      ...params,
    };
  },
});

export const performOCR = tool({
  description: 'Extract text and mathematical formulas from IMAGE FILES ONLY. This tool is EXCLUSIVELY for processing screenshots, photos, scanned images, or any visual content that contains text or mathematical formulas.',
  parameters: z.object({
    imageUrl: z.string().describe('URL of the image to process'),
    extractMath: z.boolean().default(true).describe('Whether to extract mathematical formulas'),
    language: z.string().default('eng').describe('Language for OCR (eng, fra, deu, etc.)'),
    description: z.string().optional(),
  }),
  execute: async ({ imageUrl, extractMath, language, description }) => {
    // This would typically call an OCR service
    return {
      type: 'ocr',
      text: 'OCR processing would happen here',
      confidence: 0.95,
      mathFormulas: extractMath ? ['E = mc^2'] : [],
      imageUrl,
      language,
      description: description || 'OCR Result',
    };
  },
}); 