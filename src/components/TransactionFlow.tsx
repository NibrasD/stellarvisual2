import React, { useCallback, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  NodeTypes,
  Connection,
  MiniMap,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { OperationNode } from '../types/stellar';
import { OperationNodeComponent } from './OperationNode';

const nodeTypes: NodeTypes = {
  operation: OperationNodeComponent,
};

interface TransactionFlowProps {
  nodes: Node<OperationNode>[];
  edges: Edge[];
}

export function TransactionFlow({ nodes, edges }: TransactionFlowProps) {
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'staggered'>('staggered');
  const [showConnections, setShowConnections] = useState(true);

  const onConnect = useCallback((params: Connection) => {
    console.log('Connection:', params);
  }, []);

  const handleLayoutChange = () => {
    setLayoutMode(prev => prev === 'horizontal' ? 'staggered' : 'horizontal');
  };

  const adjustedNodes = nodes.map((node, index) => ({
    ...node,
    position: layoutMode === 'horizontal' 
      ? { x: index * 450, y: 100 }
      : { x: index * 400, y: 50 + (index % 2) * 120 }
  }));

  const adjustedEdges = showConnections ? edges.map(edge => ({
    ...edge,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#3b82f6',
    },
    style: { 
      ...edge.style,
      stroke: '#3b82f6', 
      strokeWidth: 2
    }
  })) : [];

  return (
    <div className="w-full h-[800px] bg-gray-50 rounded-lg overflow-hidden border border-gray-100 relative">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={handleLayoutChange}
          className="px-3 py-1 bg-white rounded-md shadow-sm border border-gray-200 text-sm font-medium hover:bg-gray-50"
        >
          {layoutMode === 'horizontal' ? 'Staggered View' : 'Horizontal View'}
        </button>
        <button
          onClick={() => setShowConnections(!showConnections)}
          className="px-3 py-1 bg-white rounded-md shadow-sm border border-gray-200 text-sm font-medium hover:bg-gray-50"
        >
          {showConnections ? 'Hide Arrows' : 'Show Arrows'}
        </button>
      </div>
      <ReactFlow
        nodes={adjustedNodes}
        edges={adjustedEdges}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.1, maxZoom: 1.2 }}
        className="bg-gray-50"
        defaultEdgeOptions={{
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#3b82f6',
          },
        }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        minZoom={0.5}
        maxZoom={2}
      >
        <Background color="#e2e8f0" gap={16} />
        <Controls className="bg-white shadow-md border border-gray-100" />
        <MiniMap 
          className="bg-white border border-gray-200 rounded"
          nodeColor="#3b82f6"
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}