import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Connection,
  type OnConnect,
  type NodeTypes,
  type EdgeTypes,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useStudioStore } from '../../store/useStudioStore';
import { InstrumentNode } from '../Nodes/InstrumentNode';
import { CustomEdge } from './CustomEdge';
import type { InstrumentPreset, InstrumentNodeData } from '../../types';
// InstrumentNodeData used for type assertions
import { wouldCreateCycle } from '../../utils/loopDetection';

const nodeTypes: NodeTypes = {
  instrument: InstrumentNode as any,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

function StudioCanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const {
    nodes,
    edges,
    hasLoop,
    loopEdges,
    addEdge,
    removeEdge,
    onNodesChange,
    onEdgesChange,
    addNode,
    setSelectedNode,
  } = useStudioStore();

  // Validate connection: check port types match
  const isValidConnection = useCallback(
    (connection: Connection) => {
      const { source, target, sourceHandle, targetHandle } = connection;
      if (!source || !target || !sourceHandle || !targetHandle) return false;

      // Prevent self-connections
      if (source === target) return false;

      // Find the source and target nodes
      const sourceNode = nodes.find((n) => n.id === source);
      const targetNode = nodes.find((n) => n.id === target);
      if (!sourceNode || !targetNode) return false;

      const sourceData = sourceNode.data as InstrumentNodeData;
      const targetData = targetNode.data as InstrumentNodeData;

      // Find the port types
      const sourcePort = sourceData.outputs.find((p) => p.id === sourceHandle);
      const targetPort = targetData.inputs.find((p) => p.id === targetHandle);
      if (!sourcePort || !targetPort) return false;

      // Types must match
      if (sourcePort.type !== targetPort.type) return false;

      // Allow cycles - just show warning, don't block
      // (MIDI feedback loops are sometimes intentional for recording/thru setups)

      return true;
    },
    [nodes]
  );

  // Handle new connections
  const onConnect: OnConnect = useCallback(
    (connection) => {
      const { source, target, sourceHandle, targetHandle } = connection;
      if (!source || !target || !sourceHandle || !targetHandle) return;

      // Find the port type
      const sourceNode = nodes.find((n) => n.id === source);
      if (!sourceNode) return;

      const sourceData = sourceNode.data as InstrumentNodeData;
      const sourcePort = sourceData.outputs.find((p) => p.id === sourceHandle);
      if (!sourcePort) return;

      // Remove any existing connection to this target handle (replace behavior)
      const existingEdge = edges.find(
        (e) => e.target === target && e.targetHandle === targetHandle
      );
      if (existingEdge) {
        removeEdge(existingEdge.id);
      }

      addEdge(connection, sourcePort.type);
    },
    [nodes, edges, addEdge, removeEdge]
  );

  // Handle drag over for dropping new nodes
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop for creating new nodes
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const presetData = event.dataTransfer.getData('application/studiograph-preset');
      if (!presetData) return;

      const preset: InstrumentPreset = JSON.parse(presetData);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(preset, position);
    },
    [screenToFlowPosition, addNode]
  );

  // Deselect when clicking canvas background
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  // Style edges based on loop detection
  const styledEdges = edges.map((edge) => ({
    ...edge,
    className: loopEdges.includes(edge.id) ? 'loop-edge' : '',
    animated: loopEdges.includes(edge.id),
  }));

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full">
      <ReactFlow
        nodes={nodes as any}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection as any}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onPaneClick={onPaneClick}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode={['Backspace', 'Delete']}
        defaultEdgeOptions={{
          type: 'custom',
        }}
      >
        <Background color="#374151" gap={20} />
        <Controls className="!bg-gray-800 !border-gray-600" />
      </ReactFlow>

      {/* Loop Warning Toast */}
      {hasLoop && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-900 border border-red-500 text-red-200 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
            <span className="text-xl">Warning</span>
            <span className="font-semibold">MIDI Feedback Loop Detected!</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function StudioCanvas() {
  return (
    <ReactFlowProvider>
      <StudioCanvasInner />
    </ReactFlowProvider>
  );
}
