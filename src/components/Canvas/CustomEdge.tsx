import { BaseEdge, type EdgeProps } from '@xyflow/react';

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  selected,
  data,
}: EdgeProps) {
  const routingOffset = (data as { routingOffset?: number })?.routingOffset ?? 0;

  // Minimum distance to travel up before going horizontal (since handles are on top)
  const minVerticalDistance = 25;

  // Calculate the Y position for the horizontal segment
  const minY = Math.min(sourceY, targetY);
  const baseHorizontalY = minY - minVerticalDistance;

  // Each edge gets a different vertical level based on its computed offset
  const adjustedHorizontalY = baseHorizontalY - routingOffset;

  // Small horizontal nudge when source and target are nearly vertical
  // to prevent overlapping vertical segments
  const dx = targetX - sourceX;
  const nudge = Math.abs(dx) < 50 ? routingOffset * 0.4 : 0;

  // Create path: up from source, horizontal, down to target
  const edgePath = `M ${sourceX} ${sourceY}
    L ${sourceX} ${adjustedHorizontalY}
    L ${targetX + nudge} ${adjustedHorizontalY}
    L ${targetX + nudge} ${targetY}`;

  // Apply selected styling
  const selectedStyle = selected
    ? {
        ...style,
        strokeWidth: 4,
        stroke: '#fff',
      }
    : style;

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={selectedStyle}
      markerEnd={markerEnd}
    />
  );
}
