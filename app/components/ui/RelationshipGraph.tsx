import React, { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyEdgeChanges,
  applyNodeChanges,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  addEdge,
  Connection,
  EdgeChange,
  NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { HierarchicalEntity, Relationship } from '../../types';

interface RelationshipGraphProps {
  entities: HierarchicalEntity[];
  relationships: Relationship[];
}

export const RelationshipGraph: React.FC<RelationshipGraphProps> = ({ entities, relationships }) => {
  const initialNodes: Node[] = useMemo(() => {
    return entities.map((entity, index) => ({
      id: entity.id,
      data: { label: entity.name },
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      style: {
        background: entity.type === 'Character' ? '#e0e7ff' : '#f0fdf4',
        border: '1px solid #6366f1',
        borderRadius: '12px',
        padding: '10px',
        fontSize: '12px',
        fontWeight: 'bold',
        width: 150,
        textAlign: 'center',
      },
    }));
  }, [entities]);

  const initialEdges: Edge[] = useMemo(() => {
    return relationships.map((rel) => ({
      id: rel.id,
      source: rel.sourceId,
      target: rel.targetId,
      label: rel.type,
      animated: true,
      style: { stroke: '#6366f1' },
      labelStyle: { fill: '#6366f1', fontWeight: 700, fontSize: 10 },
    }));
  }, [relationships]);

  const [nodes, setNodes] = React.useState<Node[]>(initialNodes);
  const [edges, setEdges] = React.useState<Edge[]>(initialEdges);

  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  const onNodesChange: OnNodesChange = React.useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange: OnEdgesChange = React.useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect: OnConnect = React.useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '500px' }} className="bg-slate-50 dark:bg-slate-950 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};
