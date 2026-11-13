'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas, Rect, Circle, IText, FabricImage } from 'fabric';

export default function Editor() {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    if (!canvasEl.current) return;

    const canvas = new Canvas(canvasEl.current, {
      width: 900,
      height: 650,
      backgroundColor: '#ffffff',
      selection: true,
    });

    fabricRef.current = canvas;

    // Load from localStorage if present
    const saved = localStorage.getItem('applestem-fabric');
    if (saved) {
      canvas.loadFromJSON(saved).then(() => canvas.renderAll());
    }

    const save = () => {
      localStorage.setItem('applestem-fabric', JSON.stringify(canvas.toJSON()));
    };

    canvas.on('object:modified', save);
    canvas.on('object:added', save);
    canvas.on('object:removed', save);

    canvas.on('selection:created', (e) => setSelected(e.selected?.[0] || null));
    canvas.on('selection:updated', (e) => setSelected(e.selected?.[0] || null));
    canvas.on('selection:cleared', () => setSelected(null));

    return () => {
      canvas.dispose();
    };
  }, []);

  const addText = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const text = new IText('Double-click to edit', {
      left: 200,
      top: 200,
      fontSize: 28,
      fill: '#0f172a',
      fontFamily: 'system-ui',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addRect = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const rect = new Rect({
      left: 250,
      top: 180,
      width: 180,
      height: 100,
      fill: '#0f766e',
      rx: 12,
      ry: 12,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  };

  const addCircle = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const circle = new Circle({
      left: 300,
      top: 200,
      radius: 70,
      fill: '#14b8a6',
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
  };

  const addImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricRef.current) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const img = await FabricImage.fromURL(ev.target?.result as string);
      img.set({ left: 200, top: 150, scaleX: 0.4, scaleY: 0.4 });
      fabricRef.current!.add(img);
      fabricRef.current!.setActiveObject(img);
      fabricRef.current!.renderAll();
    };
    reader.readAsDataURL(file);
  };

  const deleteSelected = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    active.forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  const exportPNG = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL({ format: 'png', multiplier: 2 });
    const a = document.createElement('a');
    a.href = data;
    a.download = `applestem-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Left sidebar */}
      <div className="w-56 bg-white border-r p-3 space-y-2">
        <div className="font-bold text-teal-800 text-lg mb-4">🍎 AppleStem</div>
        <button onClick={addText} className="w-full py-2 bg-teal-700 text-white rounded-lg text-sm">+ Text</button>
        <button onClick={addRect} className="w-full py-2 border rounded-lg text-sm">+ Rectangle</button>
        <button onClick={addCircle} className="w-full py-2 border rounded-lg text-sm">+ Circle</button>
        <label className="w-full py-2 border rounded-lg text-sm flex justify-center cursor-pointer">
          + Image
          <input type="file" accept="image/*" className="hidden" onChange={addImage} />
        </label>
        <button onClick={deleteSelected} className="w-full py-2 bg-red-500 text-white rounded-lg text-sm">Delete</button>
        <button onClick={exportPNG} className="w-full py-2 bg-slate-900 text-white rounded-lg text-sm mt-4">Export PNG</button>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center p-8">
        <canvas ref={canvasEl} className="shadow-2xl rounded-xl bg-white" />
      </div>

      {/* Right panel */}
      <div className="w-64 bg-white border-l p-4">
        <div className="font-semibold mb-2">Properties</div>
        {selected ? (
          <div className="text-sm text-slate-600">
            Type: {selected.type}<br />
            Position: {Math.round(selected.left)}, {Math.round(selected.top)}
          </div>
        ) : (
          <div className="text-sm text-slate-400">Select an object</div>
        )}
      </div>
    </div>
  );
}
