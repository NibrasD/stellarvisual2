import React, { useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  NodeTypes,
  Connection,
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
  const onConnect = useCallback((params: Connection) => {
    console.log('Connection:', params);
  }, []);

  return (
    <div className="w-full h-[800px] bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.1, maxZoom: 1.2 }}
        className="bg-gray-50"
        defaultEdgeOptions={{
          style: { stroke: '#94a3b8' },
          animated: true,
        }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        minZoom={0.5}
        maxZoom={2}
      >
        <Background color="#e2e8f0" gap={16} />
        <Controls className="bg-white shadow-md border border-gray-100" />
      </ReactFlow>
    </div>
  );
}