"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dagre from "@dagrejs/dagre";
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  useNodesState,
  useNodesInitialized,
  useReactFlow,
  BaseEdge,
  getSmoothStepPath,
  type Node,
  type NodeProps,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import {
  hierarchyWarningRoutes,
  type HierarchyWarning,
  type AuditStaffNode,
} from "@purposemint/contracts";
import "@xyflow/react/dist/style.css";
import styles from "./audit.module.css";

type StaffData = Record<string, unknown> & {
  user: AuditStaffNode;
  detected: boolean;
  ancestor: boolean;
  unassigned: boolean;
  onSelect: (user: AuditStaffNode) => void;
};
type StaffNode = Node<StaffData, "staff">;
const label = (value: string) =>
  value
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function WarningSymbol() {
  return (
    <g fill="#ffe17b" stroke="#8a6410" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M 0,-11 L 12,10 L -12,10 Z" />
      <path d="M 0,-4 V 2" fill="none" strokeLinecap="round" />
      <circle cx="0" cy="6" r="0.9" fill="#8a6410" stroke="none" />
    </g>
  );
}

type WarningEdge = Edge<{ signals: HierarchyWarning[] }, "warning">;

function WarningMotion({
  path,
  signal: { step, hops },
}: {
  path: string;
  signal: HierarchyWarning;
}) {
  const group = useRef<SVGGElement>(null);
  useEffect(() => {
    group.current
      ?.querySelectorAll("animateMotion, animate")
      .forEach((animation) => {
        (animation as SVGAnimationElement).beginElement();
      });
  }, [step, hops]);
  // All segments share a cycle; each triangle moves child-to-parent in turn.
  const slots = hops + 0.5;
  const start = step / slots;
  const end = (step + 1) / slots;
  const times = step === 0 ? `0;${end};1` : `0;${start};${end};1`;
  const duration = `${slots * 1.6}s`;
  return (
    <g
      ref={group}
      className={styles.warningSignal}
      opacity="0"
      aria-hidden="true"
      pointerEvents="none"
    >
      <animateMotion
        begin="indefinite"
        path={path}
        dur={duration}
        repeatCount="indefinite"
        calcMode="linear"
        keyTimes={times}
        keyPoints={step === 0 ? "1;0;0" : "1;1;0;0"}
      />
      <animate
        begin="indefinite"
        attributeName="opacity"
        dur={duration}
        repeatCount="indefinite"
        calcMode="discrete"
        keyTimes={times}
        values={step === 0 ? "1;0;0" : "0;1;0;0"}
      />
      <WarningSymbol />
    </g>
  );
}

function ReportingEdge(props: EdgeProps<WarningEdge>) {
  const [path] = getSmoothStepPath(props);
  return (
    <>
      <BaseEdge id={props.id} path={path} style={props.style} />
      {props.data?.signals.map((signal) => (
        <WarningMotion key={signal.origin} path={path} signal={signal} />
      ))}
    </>
  );
}
const edgeTypes = { warning: ReportingEdge };

function StaffCard({ data }: NodeProps<StaffNode>) {
  const { user, detected, ancestor, unassigned } = data;
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className={styles.treeHandle}
      />
      <button
        className={`nodrag ${styles.staffNode} ${detected ? styles.detected : ""} ${ancestor ? styles.ancestor : ""}`}
        title={`${user.name} · ${label(user.roleLabel)}`}
        aria-label={`${user.name}, ${label(user.roleLabel)}${detected ? `, ${user.matchCount} matching events` : ""}${ancestor ? ", matching activity in reporting team" : ""}`}
        onClick={() => data.onSelect(user)}
      >
        <strong>{user.name}</strong>
        <span>{label(user.roleLabel)}</span>
        {unassigned && <small>No supervisor assigned</small>}
        {user.status !== "active" && <small>{label(user.status)}</small>}
        {detected && <small>{user.matchCount} matches</small>}
        {ancestor && <small>Team match</small>}
      </button>
      <Handle
        type="source"
        position={Position.Bottom}
        className={styles.treeHandle}
      />
    </>
  );
}
const nodeTypes = { staff: StaffCard };

type Props = {
  users: AuditStaffNode[];
  detected: Set<string>;
  ancestors: Set<string>;
  onSelect: (user: AuditStaffNode) => void;
};

function TreeCanvas({ users, detected, ancestors, onSelect }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<StaffNode>([]);
  const [ready, setReady] = useState(false);
  const initialized = useNodesInitialized();
  const { fitView } = useReactFlow<StaffNode>();
  const edges = useMemo<Edge[]>(() => {
    const ids = new Set(users.map((user) => user.id));
    const warnings = hierarchyWarningRoutes(users, detected);
    return users
      .filter(
        (user) =>
          user.role !== "super_admin" &&
          user.reportsToUserId &&
          ids.has(user.reportsToUserId),
      )
      .map((user) => ({
        id: `${user.reportsToUserId}-${user.id}`,
        source: user.reportsToUserId!,
        target: user.id,
        type: "warning",
        data: { signals: warnings.get(user.id) ?? [] },
        zIndex:
          ancestors.has(user.reportsToUserId!) &&
          (detected.has(user.id) || ancestors.has(user.id))
            ? 10
            : 0,
        style: {
          stroke:
            ancestors.has(user.reportsToUserId!) &&
            (detected.has(user.id) || ancestors.has(user.id))
              ? "#d4ad35"
              : "#a5cdb8",
          strokeWidth: 2,
        },
      }));
  }, [users, ancestors, detected]);

  useEffect(() => {
    const ids = new Set(users.map((user) => user.id));
    setNodes((previous) =>
      users.map((user) => {
        const existing = previous.find((node) => node.id === user.id);
        return {
          ...existing,
          id: user.id,
          type: "staff",
          position: existing?.position ?? { x: 0, y: 0 },
          data: {
            user,
            detected: detected.has(user.id),
            ancestor: ancestors.has(user.id),
            unassigned:
              user.role !== "super_admin" &&
              (!user.reportsToUserId || !ids.has(user.reportsToUserId)),
            onSelect,
          },
        };
      }),
    );
  }, [users, detected, ancestors, onSelect, setNodes]);

  // Use React Flow's measured dimensions so long names cannot overlap siblings.
  const geometry = nodes
    .map(
      (node) =>
        `${node.id}:${node.measured?.width}:${node.measured?.height}:${node.data.user.reportsToUserId}:${node.data.user.role}`,
    )
    .join("|");
  useEffect(() => {
    if (!initialized || !nodes.length) return;
    const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    graph.setGraph({
      rankdir: "TB",
      nodesep: 32,
      ranksep: 72,
      marginx: 24,
      marginy: 24,
    });
    nodes.forEach((node) =>
      graph.setNode(node.id, {
        width: node.measured!.width!,
        height: node.measured!.height!,
      }),
    );
    edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
    dagre.layout(graph);
    setNodes((current) =>
      current.map((node) => {
        const position = graph.node(node.id);
        return {
          ...node,
          position: {
            x: position.x - node.measured!.width! / 2,
            y: position.y - node.measured!.height! / 2,
          },
        };
      }),
    );
    const frame = requestAnimationFrame(() => {
      void fitView({ padding: 0.15, maxZoom: 1, duration: 250 });
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
    // Layout only changes for membership, reporting lines, or measured dimensions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry, initialized, fitView, setNodes]);

  return (
    <div
      className={styles.flowViewport}
      aria-label="Administrative reporting hierarchy"
    >
      {!users.length && (
        <p className={styles.empty}>No administrative staff found.</p>
      )}
      <ReactFlow<StaffNode>
        proOptions={{ hideAttribution: true }}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_event, node) => onSelect(node.data.user)}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.1}
        maxZoom={2}
        fitView
        onlyRenderVisibleElements={false}
        style={{ opacity: ready || !users.length ? 1 : 0 }}
      >
        <Background variant={BackgroundVariant.Lines} gap={28} color="#eff7f1" bgColor="#ffffff" lineWidth={1} />
        <Controls
          showInteractive={false}
          fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
        />
      </ReactFlow>
    </div>
  );
}

export default function StaffTree(props: Props) {
  return (
    <ReactFlowProvider>
      <TreeCanvas {...props} />
    </ReactFlowProvider>
  );
}
