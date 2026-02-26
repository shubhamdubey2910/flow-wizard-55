import { useEffect } from 'react';
import { Palette } from '@/components/flowchart/Palette';
import { Canvas } from '@/components/flowchart/Canvas';
import { Inspector } from '@/components/flowchart/Inspector';
import { Toolbar } from '@/components/flowchart/Toolbar';
import { useFlowchartStore } from '@/stores/flowchartStore';

const Index = () => {
  const loadDemo = useFlowchartStore(s => s.loadDemo);

  useEffect(() => {
    document.title = 'Flowchart Builder';
    loadDemo();
  }, [loadDemo]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Toolbar />
      <div className="flex flex-1 min-h-0">
        <Palette />
        <Canvas />
        <Inspector />
      </div>
    </div>
  );
};

export default Index;
