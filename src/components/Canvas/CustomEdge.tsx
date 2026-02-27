import { BaseEdge, type EdgeProps } from '@xyflow/react';

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  sourceHandleId,
  selected,
}: EdgeProps) {
  // Calculate a stable offset based on source handle to prevent overlap
  // Use sourceHandleId to determine offset - each handle gets its own level
  const handleOffset = sourceHandleId ?
    (sourceHandleId.charCodeAt(sourceHandleId.length - 1) % 10) * 8 : 0;

  // Minimum distance to travel up before going horizontal (since handles are on top)
  const minVerticalDistance = 25;

  // Calculate the Y position for the horizontal segment
  const minY = Math.min(sourceY, targetY);
  const baseHorizontalY = minY - minVerticalDistance;

  // Each edge from different handles gets a different level based on handle ID
  const adjustedHorizontalY = baseHorizontalY - handleOffset;

  // Create path: up from source, horizontal, down to target
  const edgePath = `M ${sourceX} ${sourceY}
    L ${sourceX} ${adjustedHorizontalY}
    L ${targetX} ${adjustedHorizontalY}
    L ${targetX} ${targetY}`;

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
