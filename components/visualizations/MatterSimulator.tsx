'use client';

import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

// Enhanced interface to match the new schema
export interface EnhancedMatterSimulatorProps {
  simulationType: string;
  simConfig?: {
    objects?: Array<{
      id?: string;
      type?: 'ball' | 'box' | 'polygon' | 'rope' | 'spring';
      position: { x: number; y: number };
      velocity?: { x: number; y: number };
      dimensions?: {
        radius?: number;
        width?: number;
        height?: number;
        sides?: number;
      };
      properties?: {
        mass?: number;
        restitution?: number;
        friction?: number;
        color?: string;
        isStatic?: boolean;
      };
    }>;
    forces?: Array<{
      type: 'gravity' | 'spring' | 'magnetic' | 'friction' | 'drag';
      strength: number;
      direction?: { x: number; y: number };
      attachedTo?: string[];
    }>;
    constraints?: Array<{
      type: 'distance' | 'point' | 'revolute' | 'weld';
      objectA?: string;
      objectB?: string;
      pointA?: { x: number; y: number };
      pointB?: { x: number; y: number };
      length?: number;
      stiffness?: number;
    }>;
    environment?: {
      gravity?: { x: number; y: number };
      airResistance?: number;
      boundaries?: {
        ground?: boolean;
        walls?: boolean;
        ceiling?: boolean;
      };
    };
  };
  metadata?: {
    title?: string;
    description?: string;
    duration?: number;
    timeScale?: number;
    educational_context?: string;
  };
  interactive?: boolean;
  showTrails?: boolean;
  showForces?: boolean;
  
  // Legacy compatibility fields
  initialConditions?: any;
  constants?: any;
  simulationDuration?: number;
  title?: string;
  description?: string;
}

// Legacy interface for backward compatibility
export interface MatterSimulatorProps {
  simulationType: 'falling_objects' | 'pendulum' | 'custom_matter_js_setup';
  initialConditions: {
    objects?: Array<{
      shape?: 'circle' | 'rectangle';
      position: { x: number; y: number };
      velocity?: { x: number; y: number };
      mass?: number;
      radius?: number;
      width?: number;
      height?: number;
      options?: any;
    }>;
    pendulumLength?: number;
    initialAngle?: number;
    customSetupInstructions?: string;
  };
  constants?: {
    gravity?: { x: number; y: number };
    timeScale?: number;
  };
  simulationDuration?: number;
  title?: string;
  description?: string;
}

// Union type for props
type MatterSimulatorAllProps = EnhancedMatterSimulatorProps | MatterSimulatorProps;

const MatterSimulator: React.FC<MatterSimulatorAllProps> = (props) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const [isRunning, setIsRunning] = useState(true);
  
  // Normalize props to work with both old and new interfaces
  const normalizeProps = (props: MatterSimulatorAllProps): EnhancedMatterSimulatorProps => {
    // Check if it's the new enhanced format
    if ('simConfig' in props && props.simConfig) {
      return props as EnhancedMatterSimulatorProps;
    }
    
    // Convert legacy format to new format
    const legacyProps = props as MatterSimulatorProps;
    return {
      simulationType: legacyProps.simulationType,
      simConfig: {
        objects: legacyProps.initialConditions?.objects?.map(obj => ({
          type: obj.shape === 'rectangle' ? 'box' : 'ball',
          position: obj.position,
          velocity: obj.velocity,
          dimensions: {
            radius: obj.radius,
            width: obj.width,
            height: obj.height,
          },
          properties: {
            mass: obj.mass,
            restitution: obj.options?.restitution || 0.8,
            friction: obj.options?.friction || 0.1,
          }
        })),
        environment: {
          gravity: legacyProps.constants?.gravity || { x: 0, y: 1 },
        }
      },
      metadata: {
        title: legacyProps.title,
        description: legacyProps.description,
        duration: legacyProps.simulationDuration,
        timeScale: legacyProps.constants?.timeScale,
      },
      // Legacy fields
      initialConditions: legacyProps.initialConditions,
      constants: legacyProps.constants,
      title: legacyProps.title,
      description: legacyProps.description,
    };
  };

  const normalizedProps = normalizeProps(props);
  const {
    simulationType,
    simConfig,
    metadata,
    interactive = false,
    showTrails = false,
    showForces = false,
    // Legacy support
    initialConditions,
    constants
  } = normalizedProps;

  // Helper function to create Matter.js bodies from enhanced config
  const createBodyFromConfig = (objConfig: any, cw: number, ch: number) => {
    const {
      id,
      type = 'ball',
      position,
      velocity = { x: 0, y: 0 },
      dimensions = {},
      properties = {}
    } = objConfig;

    const {
      radius = 25,
      width = 50,
      height = 50,
      sides = 5
    } = dimensions;

    const {
      mass = 1,
      restitution = 0.8,
      friction = 0.1,
      color,
      isStatic = false
    } = properties;

    const bodyOptions = {
      mass,
      restitution,
      friction,
      isStatic,
      render: color ? { fillStyle: color } : undefined
    };

    let body;
    switch (type) {
      case 'box':
        body = Matter.Bodies.rectangle(position.x, position.y, width, height, bodyOptions);
        break;
      case 'polygon':
        body = Matter.Bodies.polygon(position.x, position.y, sides, radius, bodyOptions);
        break;
      case 'ball':
      default:
        body = Matter.Bodies.circle(position.x, position.y, radius, bodyOptions);
        break;
    }

    // Set velocity if specified
    if (velocity.x !== 0 || velocity.y !== 0) {
      Matter.Body.setVelocity(body, velocity);
    }

    // Set label for identification
    if (id) {
      body.label = id;
    }

    return body;
  };

  // Helper function to create constraints
  const createConstraintsFromConfig = (constraintsConfig: any[], bodies: Matter.Body[]) => {
    return constraintsConfig.map(constraintConfig => {
      const {
        type,
        objectA,
        objectB,
        pointA,
        pointB,
        length,
        stiffness = 0.9
      } = constraintConfig;

      const bodyA = objectA ? bodies.find(b => b.label === objectA) : undefined;
      const bodyB = objectB ? bodies.find(b => b.label === objectB) : undefined;

      const constraintOptions: any = {
        stiffness,
        length
      };

      if (pointA) constraintOptions.pointA = pointA;
      if (pointB) constraintOptions.pointB = pointB;
      if (bodyA) constraintOptions.bodyA = bodyA;
      if (bodyB) constraintOptions.bodyB = bodyB;

      return Matter.Constraint.create(constraintOptions);
    });
  };

  // Interactive controls component
  const PhysicsControls: React.FC = () => {
    const [timeScale, setTimeScale] = useState(metadata?.timeScale || 1);

    const handlePlayPause = () => {
      if (runnerRef.current && engineRef.current) {
        if (isRunning) {
          Matter.Runner.stop(runnerRef.current);
        } else {
          Matter.Runner.run(runnerRef.current, engineRef.current);
        }
        setIsRunning(!isRunning);
      }
    };

    const handleReset = () => {
      // Trigger a re-render by updating a dependency
      if (engineRef.current) {
        Matter.World.clear(engineRef.current.world, false);
        Matter.Engine.clear(engineRef.current);
        engineRef.current = null;
      }
    };

    const handleTimeScaleChange = (value: number) => {
      if (engineRef.current) {
        engineRef.current.timing.timeScale = value;
        setTimeScale(value);
      }
    };

    if (!interactive) return null;

    return (
      <div className="physics-controls flex gap-2 mb-4 p-3 bg-gray-100 rounded">
        <button 
          onClick={handlePlayPause} 
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {isRunning ? '⏸️ Pause' : '▶️ Play'}
        </button>
        <button 
          onClick={handleReset} 
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          🔄 Reset
        </button>
        <div className="flex items-center gap-2">
          <label className="text-sm">Speed:</label>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={timeScale}
            onChange={(e) => handleTimeScaleChange(parseFloat(e.target.value))}
            className="w-20"
          />
          <span className="text-sm w-8">{timeScale}x</span>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !sceneRef.current) return;

    const cw = sceneRef.current.clientWidth;
    const ch = sceneRef.current.clientHeight || 500;

    // Clean up existing simulation
    if (engineRef.current) {
      Matter.Render.stop(renderRef.current!);
      Matter.Runner.stop(runnerRef.current!);
      Matter.World.clear(engineRef.current.world, false);
      Matter.Engine.clear(engineRef.current);
      renderRef.current!.canvas.remove();
    }

    const engine = Matter.Engine.create();
    engineRef.current = engine;

    // Set environment properties
    const environment = simConfig?.environment || constants;
    if (environment?.gravity) {
      engine.gravity.x = environment.gravity.x;
      engine.gravity.y = environment.gravity.y;
    }
    if (environment?.timeScale || metadata?.timeScale) {
      engine.timing.timeScale = environment.timeScale || metadata?.timeScale || 1;
    }

    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: cw,
        height: ch,
        wireframes: false,
        background: '#f8f9fa',
        showVelocity: showForces,
        showAngleIndicator: showForces,
        showDebug: false,
      }
    });
    renderRef.current = render;

    // Create boundaries
    const boundaries = simConfig?.environment?.boundaries || { ground: true, walls: true, ceiling: false };
    const boundaryBodies = [];
    
    if (boundaries.ground !== false) {
      boundaryBodies.push(Matter.Bodies.rectangle(cw / 2, ch - 25, cw, 50, { isStatic: true, render: { fillStyle: '#666' } }));
    }
    if (boundaries.walls !== false) {
      boundaryBodies.push(Matter.Bodies.rectangle(0, ch / 2, 50, ch, { isStatic: true, render: { fillStyle: '#666' } }));
      boundaryBodies.push(Matter.Bodies.rectangle(cw, ch / 2, 50, ch, { isStatic: true, render: { fillStyle: '#666' } }));
    }
    if (boundaries.ceiling) {
      boundaryBodies.push(Matter.Bodies.rectangle(cw / 2, 25, cw, 50, { isStatic: true, render: { fillStyle: '#666' } }));
    }
    
    Matter.World.add(engine.world, boundaryBodies);

    // Create simulation objects
    const allBodies: Matter.Body[] = [];

    // Enhanced object creation
    if (simConfig?.objects) {
      simConfig.objects.forEach(objConfig => {
        const body = createBodyFromConfig(objConfig, cw, ch);
        allBodies.push(body);
      });
      Matter.World.add(engine.world, allBodies);
    }

    // Create constraints
    if (simConfig?.constraints) {
      const constraints = createConstraintsFromConfig(simConfig.constraints, allBodies);
      Matter.World.add(engine.world, constraints);
    }

    // Legacy simulation support
    if (!simConfig?.objects && (simulationType === 'falling_objects' || simulationType === 'pendulum' || simulationType === 'custom_matter_js_setup')) {
      // Handle legacy simulations
      if (simulationType === 'falling_objects' && initialConditions?.objects) {
        initialConditions.objects.forEach((obj: any) => {
          let body;
          const bodyOptions = { 
            restitution: 0.8, 
            friction: 0.1, 
            mass: obj.mass || 1,
            ...(obj.options || {})
          };
          if (obj.shape === 'rectangle') {
            body = Matter.Bodies.rectangle(obj.position.x, obj.position.y, obj.width || 50, obj.height || 50, bodyOptions);
          } else {
            body = Matter.Bodies.circle(obj.position.x, obj.position.y, obj.radius || 25, bodyOptions);
          }
          if (obj.velocity) {
            Matter.Body.setVelocity(body, obj.velocity);
          }
          Matter.World.add(engine.world, body);
        });
      } else if (simulationType === 'pendulum') {
        const pendulumLength = initialConditions?.pendulumLength || 200;
        const initialAngleRad = ((initialConditions?.initialAngle || 0) * Math.PI) / 180;
        const pivotX = cw / 2;
        const pivotY = ch / 4;
        const bobRadius = 30;
        const bob = Matter.Bodies.circle(
          pivotX + pendulumLength * Math.sin(initialAngleRad), 
          pivotY + pendulumLength * Math.cos(initialAngleRad), 
          bobRadius, 
          { mass: 5, restitution: 0.6 }
        );
        const constraint = Matter.Constraint.create({
          pointA: { x: pivotX, y: pivotY },
          bodyB: bob,
          length: pendulumLength,
          stiffness: 0.9
        });
        Matter.World.add(engine.world, [bob, constraint]);
      } else if (simulationType === 'custom_matter_js_setup') {
        console.warn('Custom Matter.js setup instructions:', initialConditions?.customSetupInstructions);
        if (!initialConditions?.customSetupInstructions?.trim()) {
          const customObj = Matter.Bodies.polygon(cw / 2, ch / 3, 5, 40, { mass: 2 });
          Matter.World.add(engine.world, customObj);
        }
      }
    }

    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);
    Matter.Render.run(render);

    return () => {
      if (renderRef.current) Matter.Render.stop(renderRef.current);
      if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
      if (engineRef.current) {
        Matter.World.clear(engineRef.current.world, false);
        Matter.Engine.clear(engineRef.current);
        if (renderRef.current?.canvas) {
          renderRef.current.canvas.remove();
        }
      }
      engineRef.current = null;
      renderRef.current = null;
      runnerRef.current = null;
    };
  }, [simulationType, simConfig, initialConditions, constants, metadata, showForces, showTrails, interactive]);

  const displayTitle = metadata?.title || props.title;
  const displayDescription = metadata?.description || props.description;
  const educationalContext = metadata?.educational_context;

  return (
    <div className="my-4 p-4 border rounded-lg shadow">
      {displayTitle && <h3 className="text-lg font-semibold mb-2">{displayTitle}</h3>}
      {displayDescription && <p className="text-sm text-gray-600 mb-2">{displayDescription}</p>}
      {educationalContext && (
        <div className="mb-3 p-2 bg-blue-50 border-l-4 border-blue-400 rounded">
          <p className="text-sm text-blue-800">
            <strong>Physics Concept:</strong> {educationalContext}
          </p>
        </div>
      )}
      
      <PhysicsControls />
      
      <div ref={sceneRef} style={{ width: '100%', height: '500px', position: 'relative' }} />
      
      {metadata?.duration && (
        <p className="text-xs text-gray-500 mt-2">
          Suggested observation time: {metadata.duration} seconds
        </p>
      )}
    </div>
  );
};

export default MatterSimulator; 