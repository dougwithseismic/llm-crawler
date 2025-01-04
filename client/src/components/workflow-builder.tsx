import { ReactNode } from 'react';
import ReactFlow, { Background, Controls, MiniMap, Edge } from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Input Node' },
    position: { x: 250, y: 25 },
  },
];

const initialEdges: Edge[] = [];

export const WorkflowBuilder = (): ReactNode => {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow nodes={initialNodes} edges={initialEdges} fitView>
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};
