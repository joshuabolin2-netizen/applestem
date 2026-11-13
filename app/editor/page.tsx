'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas, Rect, Circle, Triangle, IText, FabricImage, Group } from 'fabric';

export default function Editor() {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [objects, setObjects] = useState<any[]>([]);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isRestoring = useRef(false);

  const refreshObjects = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setObjects([...canvas.getObjects()].reverse());
  };

  const pushHistory = () => {
    const canvas = fabricRef.current;
    if (!canvas || isRestoring.current) return;
    const json = JSON.stringify(canvas.toJSON());
    setHistory(h => {
      const next = h.slice(0, historyIndex + 1);
      next.push(json);
      if (next.length > 40) next.shift();
      return next;
    });
    setHistoryIndex(i => Math.min(i + 1, 39));
    localStorage.setItem('applestem-fabric', json);
    refreshObjects();
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const canvas = fabricRef.current;
    if (!canvas) return;
    isRestoring.current = true;
    const prev = history[historyIndex - 1];
    canvas.loadFromJSON(prev).then(() => {
      canvas.renderAll();
      setHistoryIndex(i => i - 1);
      setBgColor(canvas.backgroundColor as string || '#ffffff');
      refreshObjects();
      isRestoring.current = false;
    });
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const canvas = fabricRef.current;
    if (!canvas) return;
    isRestoring.current = true;
    const next = history[historyIndex + 1];
    canvas.loadFromJSON(next).then(() => {
      canvas.renderAll();
      setHistoryIndex(i => i + 1);
      setBgColor(canvas.backgroundColor as string || '#ffffff');
      refreshObjects();
      isRestoring.current = false;
    });
  };

  useEffect(() => {
    if (!canvasEl.current) return;

    const canvas = new Canvas(canvasEl.current, {
      width: 900,
      height: 650,
      backgroundColor: '#ffffff',
      selection: true,
    });

    fabricRef.current = canvas;

    const saved = localStorage.getItem('applestem-fabric');
    if (saved) {
      canvas.loadFromJSON(saved).then(() => {
        canvas.renderAll();
        refreshObjects();
        setBgColor(canvas.backgroundColor as string || '#ffffff');
        setHistory([saved]);
        setHistoryIndex(0);
      });
    } else {
      pushHistory();
    }

    canvas.on('object:modified', pushHistory);
    canvas.on('object:added', pushHistory);
    canvas.on('object:removed', pushHistory);

    canvas.on('selection:created', (e) => {
      setSelected(e.selected?.[0] || null);
      refreshObjects();
    });
    canvas.on('selection:updated', (e) => {
      setSelected(e.selected?.[0] || null);
      refreshObjects();
    });
    canvas.on('selection:cleared', () => {
      setSelected(null);
      refreshObjects();
    });

    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if ((e.key === 'Delete' || e.key === 'Backspace') && canvas.getActiveObject()) {
        e.preventDefault();
        canvas.getActiveObjects().forEach((obj) => canvas.remove(obj));
        canvas.discardActiveObject();
        canvas.renderAll();
      }
      if (meta && e.key === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if (meta && e.key === 'd') {
        e.preventDefault();
        const active = canvas.getActiveObject();
        if (active) {
          active.clone().then((cloned: any) => {
            cloned.set({ left: (cloned.left || 0) + 20, top: (cloned.top || 0) + 20 });
            canvas.add(cloned);
            canvas.setActiveObject(cloned);
            canvas.renderAll();
          });
        }
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      canvas.dispose();
    };
  }, []);

  const addText = (content = 'Double-click to edit', size = 28, family = 'system-ui') => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const text = new IText(content, {
      left: 200 + Math.random() * 40,
      top: 200 + Math.random() * 40,
      fontSize: size,
      fill: '#0f172a',
      fontFamily: family,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addRect = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const rect = new Rect({
      left: 250, top: 180, width: 180, height: 100,
      fill: '#0f766e', rx: 12, ry: 12,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  };

  const addCircle = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const circle = new Circle({
      left: 300, top: 200, radius: 70, fill: '#14b8a6',
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
  };

  const addTriangle = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const tri = new Triangle({
      left: 320, top: 200, width: 120, height: 100, fill: '#f59e0b',
    });
    canvas.add(tri);
    canvas.setActiveObject(tri);
    canvas.renderAll();
  };

  const addImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricRef.current) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const img = await FabricImage.fromURL(ev.target?.result as string);
      img.set({ left: 200, top: 150, scaleX: 0.35, scaleY: 0.35 });
      fabricRef.current!.add(img);
      fabricRef.current!.setActiveObject(img);
      fabricRef.current!.renderAll();
    };
    reader.readAsDataURL(file);
  };

  const addSymbol = (emoji: string, label: string) => addText(`${emoji} ${label}`, 22);

  const loadTemplate = (name: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    setBgColor('#ffffff');

    if (name === 'Visual Schedule') {
      const title = new IText("Today's Schedule", { left: 180, top: 80, fontSize: 32, fill: '#0f766e', fontWeight: 'bold' });
      const t1 = new IText('1. Morning Meeting', { left: 180, top: 160, fontSize: 20, fill: '#0f172a' });
      const t2 = new IText('2. Reading Time', { left: 180, top: 210, fontSize: 20, fill: '#0f172a' });
      const t3 = new IText('3. Snack', { left: 180, top: 260, fontSize: 20, fill: '#0f172a' });
      canvas.add(title, t1, t2, t3);
    } else if (name === 'First-Then') {
      const first = new IText('FIRST', { left: 140, top: 140, fontSize: 28, fill: '#0f766e', fontWeight: 'bold' });
      const task = new IText('Work Task', { left: 140, top: 200, fontSize: 20 });
      const then = new IText('THEN', { left: 420, top: 140, fontSize: 28, fill: '#0f766e', fontWeight: 'bold' });
      const choice = new IText('Choice', { left: 420, top: 200, fontSize: 20 });
      canvas.add(first, task, then, choice);
    } else if (name === 'Communication Board') {
      const title = new IText('I want...', { left: 260, top: 60, fontSize: 28, fill: '#0f766e', fontWeight: 'bold' });
      const food = new IText('🍎 Food', { left: 140, top: 160, fontSize: 22 });
      const bath = new IText('🚽 Bathroom', { left: 340, top: 160, fontSize: 22 });
      const drink = new IText('💧 Drink', { left: 140, top: 240, fontSize: 22 });
      const brk = new IText('🛑 Break', { left: 340, top: 240, fontSize: 22 });
      canvas.add(title, food, bath, drink, brk);
    }
    canvas.renderAll();
    pushHistory();
  };

  const deleteSelected = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getActiveObjects().forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  const updateSelected = (props: any) => {
    const canvas = fabricRef.current;
    if (!canvas || !selected) return;
    selected.set(props);
    canvas.renderAll();
    pushHistory();
  };

  const setBackground = (color: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.backgroundColor = color;
    setBgColor(color);
    canvas.renderAll();
    pushHistory();
  };

  const align = (dir: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length < 1) return;
    const canvasW = canvas.width || 900;
    const canvasH = canvas.height || 650;
    active.forEach((obj) => {
      if (dir === 'left') obj.set({ left: 40 });
      if (dir === 'center') obj.set({ left: (canvasW - (obj.width || 0) * (obj.scaleX || 1)) / 2 });
      if (dir === 'right') obj.set({ left: canvasW - (obj.width || 0) * (obj.scaleX || 1) - 40 });
      if (dir === 'top') obj.set({ top: 40 });
      if (dir === 'middle') obj.set({ top: (canvasH - (obj.height || 0) * (obj.scaleY || 1)) / 2 });
      if (dir === 'bottom') obj.set({ top: canvasH - (obj.height || 0) * (obj.scaleY || 1) - 40 });
    });
    canvas.renderAll();
    pushHistory();
  };

  const toggleLock = () => {
    if (!selected) return;
    const locked = !selected.lockMovementX;
    selected.set({
      lockMovementX: locked,
      lockMovementY: locked,
      lockRotation: locked,
      lockScalingX: locked,
      lockScalingY: locked,
    });
    fabricRef.current?.renderAll();
    pushHistory();
    setSelected({ ...selected });
  };

  const toggleHide = () => {
    if (!selected) return;
    selected.set({ visible: !selected.visible });
    fabricRef.current?.renderAll();
    pushHistory();
    setSelected({ ...selected });
  };

  const groupSelected = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length < 2) return;
    const group = new Group(active);
    active.forEach((obj) => canvas.remove(obj));
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  };

  const ungroup = () => {
    const canvas = fabricRef.current;
    if (!canvas || !selected || selected.type !== 'group') return;
    const items = (selected as Group).getObjects();
    canvas.remove(selected);
    items.forEach((item) => canvas.add(item));
    canvas.renderAll();
  };

  const selectObject = (obj: any) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setActiveObject(obj);
    canvas.renderAll();
    setSelected(obj);
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

  const saveToCloud = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const json = canvas.toJSON();
    console.log('Ready for Supabase:', json);
    alert('Cloud save ready — connect Supabase env vars to enable.');
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <div className="w-60 bg-white border-r flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b font-bold text-teal-800 text-lg">🍎 AppleStem</div>

        <div className="p-3 space-y-2 border-b">
          <button onClick={() => addText()} className="w-full py-2.5 bg-teal-700 text-white rounded-xl text-sm font-medium">+ Text</button>
          <button onClick={addRect} className="w-full py-2 border rounded-lg text-sm hover:bg-slate-50">Rectangle</button>
          <button onClick={addCircle} className="w-full py-2 border rounded-lg text-sm hover:bg-slate-50">Circle</button>
          <button onClick={addTriangle} className="w-full py-2 border rounded-lg text-sm hover:bg-slate-50">Triangle</button>
          <label className="w-full py-2 border rounded-lg text-sm flex justify-center cursor-pointer hover:bg-slate-50">
            + Image
            <input type="file" accept="image/*" className="hidden" onChange={addImage} />
          </label>
        </div>

        <div className="p-3 border-b">
          <div className="text-xs font-semibold text-slate-500 mb-2 uppercase">Symbols</div>
          <div className="grid grid-cols-4 gap-1">
            {[['🍎','Food'],['🚽','Bath'],['💧','Drink'],['🛑','Break'],['📖','Read'],['✏️','Write'],['🤝','Help'],['✅','Done']].map(([e, l]) => (
              <button key={l} onClick={() => addSymbol(e, l)} className="py-1.5 text-lg border rounded hover:bg-teal-50" title={l}>{e}</button>
            ))}
          </div>
        </div>

        <div className="p-3 border-b">
          <div className="text-xs font-semibold text-slate-500 mb-2 uppercase">Templates</div>
          <button onClick={() => loadTemplate('Visual Schedule')} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-teal-50">Visual Schedule</button>
          <button onClick={() => loadTemplate('First-Then')} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-teal-50">First-Then</button>
          <button onClick={() => loadTemplate('Communication Board')} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-teal-50">Communication Board</button>
        </div>

        <div className="p-3 border-b">
          <div className="text-xs font-semibold text-slate-500 mb-2 uppercase">Background</div>
          <input type="color" value={bgColor} onChange={(e) => setBackground(e.target.value)} className="w-full h-9 rounded cursor-pointer" />
        </div>

        <div className="p-3 mt-auto space-y-2 border-t">
          <div className="flex gap-1">
            <button onClick={undo} className="flex-1 py-2 text-sm border rounded-lg hover:bg-slate-50">Undo</button>
            <button onClick={redo} className="flex-1 py-2 text-sm border rounded-lg hover:bg-slate-50">Redo</button>
          </div>
          <button onClick={deleteSelected} className="w-full py-2 bg-red-500 text-white rounded-lg text-sm">Delete</button>
          <button onClick={exportPNG} className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm">Export PNG</button>
          <button onClick={saveToCloud} className="w-full py-2 text-sm border rounded-lg text-slate-600">Save to Cloud</button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-slate-200 overflow-auto">
        <canvas ref={canvasEl} className="shadow-2xl rounded-xl" />
      </div>

      <div className="w-72 bg-white border-l flex flex-col shrink-0">
        <div className="p-3 border-b font-semibold">Layers</div>
        <div className="flex-1 overflow-y-auto p-2 max-h-40">
          {objects.map((obj, i) => (
            <div
              key={i}
              onClick={() => selectObject(obj)}
              className={`px-2 py-1.5 text-sm rounded cursor-pointer mb-1 flex justify-between ${
                selected === obj ? 'bg-teal-50 text-teal-800' : 'hover:bg-slate-50'
              }`}
            >
              <span className="truncate">
                {obj.type === 'i-text' ? (obj.text?.slice(0, 18) || 'Text') :
                 obj.type === 'rect' ? 'Rectangle' :
                 obj.type === 'circle' ? 'Circle' :
                 obj.type === 'triangle' ? 'Triangle' :
                 obj.type === 'group' ? 'Group' :
                 obj.type === 'image' ? 'Image' : obj.type}
              </span>
              {obj.lockMovementX && <span className="text-xs">🔒</span>}
              {obj.visible === false && <span className="text-xs">👁️</span>}
            </div>
          ))}
          {objects.length === 0 && <div className="text-xs text-slate-400 p-2">No objects yet</div>}
        </div>

        <div className="p-3 border-t space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase">Align</div>
          <div className="grid grid-cols-3 gap-1">
            {['left','center','right','top','middle','bottom'].map(d => (
              <button key={d} onClick={() => align(d)} className="py-1 text-xs border rounded capitalize hover:bg-slate-50">{d}</button>
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={groupSelected} className="flex-1 py-1.5 text-xs border rounded hover:bg-slate-50">Group</button>
            <button onClick={ungroup} className="flex-1 py-1.5 text-xs border rounded hover:bg-slate-50">Ungroup</button>
          </div>
        </div>

        <div className="p-3 border-t space-y-3">
          <div className="text-xs font-semibold text-slate-500 uppercase">Properties</div>
          {selected ? (
            <>
              <div className="flex gap-1">
                <button onClick={toggleLock} className="flex-1 py-1.5 text-xs border rounded">{selected.lockMovementX ? 'Unlock' : 'Lock'}</button>
                <button onClick={toggleHide} className="flex-1 py-1.5 text-xs border rounded">{selected.visible === false ? 'Show' : 'Hide'}</button>
              </div>
              <div>
                <label className="text-xs text-slate-500">Fill / Color</label>
                <input type="color" value={selected.fill || '#000000'} onChange={(e) => updateSelected({ fill: e.target.value })} className="w-full h-9 mt-1 rounded cursor-pointer" />
              </div>
              {selected.type === 'i-text' && (
                <>
                  <div>
                    <label className="text-xs text-slate-500">Font</label>
                    <select
                      value={selected.fontFamily || 'system-ui'}
                      onChange={(e) => updateSelected({ fontFamily: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm mt-1"
                    >
                      <option value="system-ui">System</option>
                      <option value="Georgia, serif">Serif</option>
                      <option value="'Comic Sans MS', cursive">Friendly</option>
                      <option value="monospace">Mono</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Font size</label>
                    <input type="number" value={selected.fontSize || 24} onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })} className="w-full border rounded px-2 py-1 text-sm mt-1" />
                  </div>
                </>
              )}
              <div>
                <label className="text-xs text-slate-500">Opacity</label>
                <input type="range" min="0" max="1" step="0.05" value={selected.opacity ?? 1} onChange={(e) => updateSelected({ opacity: Number(e.target.value) })} className="w-full mt-1" />
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400">Select an object</div>
          )}
        </div>
      </div>
    </div>
  );
}
