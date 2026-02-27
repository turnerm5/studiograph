import { Analytics } from '@vercel/analytics/react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { StudioCanvas } from './components/Canvas/StudioCanvas';
import { NodeEditor } from './components/Panels/NodeEditor';
import { useStudioStore } from './store/useStudioStore';

function App() {
  const selectedNodeId = useStudioStore((state) => state.selectedNodeId);

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <StudioCanvas />
      {selectedNodeId && <NodeEditor />}
      <Analytics />
    </div>
  );
}

export default App;
