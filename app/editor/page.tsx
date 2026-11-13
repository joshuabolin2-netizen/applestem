'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas, Rect, Circle, Triangle, IText, FabricImage, Group, Line } from 'fabric';

export default function Editor() {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [objects, setObjects] = useState<any[]>([]);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const isRestoring = useRef(false);
  const guidesRef = useRef<any[]>([]);

  const refreshObjects = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setObjects([...canvas.getObjects()].filter(o => !o.excludeFromExport).reverse());
  };

  const pushHistory = () => {
    const canvas = fabricRef.current;
    if (!canvas || isRestoring.current) return;
    const json = JSON.stringify(canvas.toJSON(['excludeFromExport']));
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

  const drawGrid = () => {
    const canvas = fabricRef.current;
    if (!canvas || !showGrid) return;
    guidesRef.current.forEach(g => canvas.remove(g));
    guidesRef.current = [];
    const gridSize = 40;
    for (let i = 0; i < canvas.width! / gridSize; i++) {
      const line = new Line([i * gridSize, 0, i * gridSize, canvas.height!], {
        stroke: '#f1f5f9', strokeWidth: 1, selectable: false, evented: false, excludeFromExport: true
      });
      canvas.add(line);
      guidesRef.current.push(line);
    }
    for (let i = 0; i < canvas.height! / gridSize; i++) {
      const line = new Line([0, i * gridSize, canvas.width!, i * gridSize], {
        stroke: '#f1f5f9', strokeWidth: 1, selectable: false, evented: false, excludeFromExport: true
      });
      canvas.add(line);
      guidesRef.current.push(line);
    }
    if (guidesRef.current[0]) canvas.sendObjectToBack(guidesRef.current[0]);
    canvas.renderAll();
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
      if (showGrid) drawGrid();
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
      if (showGrid) drawGrid();
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
        if (showGrid) drawGrid();
      });
    } else {
      pushHistory();
      if (showGrid) drawGrid();
    }

    canvas.on('object:modified', pushHistory);
    canvas.on('object:added', (e) => { if (!e.target?.excludeFromExport) pushHistory(); });
    canvas.on('object:removed', pushHistory);

    canvas.on('selection:created', (e) => { setSelected(e.selected?.[0] || null); refreshObjects(); });
    canvas.on('selection:updated', (e) => { setSelected(e.selected?.[0] || null); refreshObjects(); });
    canvas.on('selection:cleared', () => { setSelected(null); refreshObjects(); });

    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if ((e.key === 'Delete' || e.key === 'Backspace') && canvas.getActiveObject()) {
        e.preventDefault();
        canvas.getActiveObjects().forEach((obj) => canvas.remove(obj));
        canvas.discardActiveObject();
        canvas.renderAll();
      }
      if (meta && e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
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
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key) && canvas.getActiveObject()) {
        e.preventDefault();
        const obj = canvas.getActiveObject()!;
        const step = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowUp') obj.set({ top: (obj.top || 0) - step });
        if (e.key === 'ArrowDown') obj.set({ top: (obj.top || 0) + step });
        if (e.key === 'ArrowLeft') obj.set({ left: (obj.left || 0) - step });
        if (e.key === 'ArrowRight') obj.set({ left: (obj.left || 0) + step });
        canvas.renderAll();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      canvas.dispose();
    };
  }, []);

  useEffect(() => { if (fabricRef.current) drawGrid(); }, [showGrid]);

  const addText = (content = 'Double-click to edit', size = 28, family = 'system-ui') => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const text = new IText(content, {
      left: 200 + Math.random() * 40,
      top: 200 + Math.random() * 40,
      fontSize: size, fill: '#0f172a', fontFamily: family,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addRect = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const rect = new Rect({ left: 250, top: 180, width: 180, height: 100, fill: '#0f766e', rx: 0, ry: 0 });
    canvas.add(rect); canvas.setActiveObject(rect); canvas.renderAll();
  };

  const addCircle = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const circle = new Circle({ left: 300, top: 200, radius: 70, fill: '#14b8a6' });
    canvas.add(circle); canvas.setActiveObject(circle); canvas.renderAll();
  };

  const addTriangle = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const tri = new Triangle({ left: 320, top: 200, width: 120, height: 100, fill: '#f59e0b' });
    canvas.add(tri); canvas.setActiveObject(tri); canvas.renderAll();
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
    if (showGrid) drawGrid();

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
    } else if (name === 'Token Board') {
      const title = new IText('Token Board', { left: 280, top: 80, fontSize: 28, fill: '#0f766e', fontWeight: 'bold' });
      for (let i = 0; i < 5; i++) {
        const box = new Rect({ left: 140 + i * 110, top: 180, width: 90, height: 90, fill: '#f8fafc', stroke: '#cbd5e1', strokeWidth: 2, rx: 0, ry: 0 });
        canvas.add(box);
      }
      canvas.add(title);
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

  const distribute = (dir: 'horizontal' | 'vertical') => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length < 3) return;
    const sorted = [...active].sort((a, b) => dir === 'horizontal' ? (a.left || 0) - (b.left || 0) : (a.top || 0) - (b.top || 0));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const total = dir === 'horizontal'
      ? ((last.left || 0) - (first.left || 0))
      : ((last.top || 0) - (first.top || 0));
    const step = total / (sorted.length - 1);
    sorted.forEach((obj, i) => {
      if (dir === 'horizontal') obj.set({ left: (first.left || 0) + step * i });
      else obj.set({ top: (first.top || 0) + step * i });
    });
    canvas.renderAll();
    pushHistory();
  };

  const bringToFront = () => {
    const canvas = fabricRef.current;
    if (!canvas || !selected) return;
    canvas.bringObjectToFront(selected);
    canvas.renderAll();
    pushHistory();
  };

  const sendToBack = () => {
    const canvas = fabricRef.current;
    if (!canvas || !selected) return;
    canvas.sendObjectToBack(selected);
    canvas.renderAll();
    pushHistory();
  };

  const toggleLock = () => {
    if (!selected) return;
    const locked = !selected.lockMovementX;
    selected.set({ lockMovementX: locked, lockMovementY: locked, lockRotation: locked, lockScalingX: locked, lockScalingY: locked });
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

  const changeZoom = (delta: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const newZoom = Math.min(2, Math.max(0.4, zoom + delta));
    setZoom(newZoom);
    canvas.setZoom(newZoom);
    canvas.setWidth(900 * newZoom);
    canvas.setHeight(650 * newZoom);
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

  const saveToCloud = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const json = canvas.toJSON();
    console.log('Ready for Supabase:', json);
    alert('Cloud save ready — connect Supabase env vars to enable.');
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <span className="text-2xl">🍎</span>
          <span className="font-semibold text-slate-800 text-lg tracking-tight">AppleStem</span>
        </div>

        <div className="p-4 space-y-2 border-b border-slate-100">
          <button onClick={() => addText()} className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors">+ Text</button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={addRect} className="py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">Rectangle</button>
            <button onClick={addCircle} className="py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">Circle</button>
            <button onClick={addTriangle} className="py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">Triangle</button>
            <label className="py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer">
              + Image
              <input type="file" accept="image/*" className="hidden" onChange={addImage} />
            </label>
          </div>
        </div>

        <div className="p-4 border-b border-slate-100">
          <div className="text-[11px] font-semibold text-slate-400 mb-3 uppercase tracking-wider">Symbols</div>
          <div className="grid grid-cols-4 gap-2">
            {[['🍎','Food'],['🚽','Bath'],['💧','Drink'],['🛑','Break'],['📖','Read'],['✏️','Write'],['🤝','Help'],['✅','Done']].map(([e, l]) => (
              <button key={l} onClick={() => addSymbol(e, l)} className="aspect-square flex items-center justify-center text-xl border border-slate-200 rounded-lg hover:bg-teal-50 hover:border-teal-200 transition-colors" title={l}>{e}</button>
            ))}
          </div>
        </div>

        <div className="p-4 border-b border-slate-100">
          <div className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">Templates</div>
          <div className="space-y-1">
            {['Visual Schedule','First-Then','Communication Board','Token Board'].map(name => (
              <button key={name} onClick={() => loadTemplate(name)} className="w-full text-left px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">{name}</button>
            ))}
          </div>
        </div>

        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Background</div>
          <input type="color" value={bgColor} onChange={(e) => setBackground(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 cursor-pointer" />
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} className="rounded" />
            Show grid
          </label>
        </div>

        <div className="p-4 mt-auto space-y-2 border-t border-slate-100">
          <div className="flex gap-2">
            <button onClick={() => changeZoom(-0.1)} className="flex-1 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">−</button>
            <div className="flex-1 py-2 text-sm text-center border border-slate-200 rounded-lg text-slate-600">{Math.round(zoom * 100)}%</div>
            <button onClick={() => changeZoom(0.1)} className="flex-1 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">+</button>
          </div>
          <div className="flex gap-2">
            <button onClick={undo} className="flex-1 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700">Undo</button>
            <button onClick={redo} className="flex-1 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700">Redo</button>
          </div>
          <button onClick={deleteSelected} className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">Delete</button>
          <button onClick={exportPNG} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors">Export PNG</button>
          <button onClick={saveToCloud} className="w-full py-2 text-sm border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50">Save to Cloud</button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-slate-100 overflow-auto">
        <div className="relative">
          <canvas ref={canvasEl} className="shadow-xl rounded-xl bg-white" />
        </div>
      </div>

      <div className="w-72 bg-white border-l border-slate-200 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-slate-100 font-medium text-slate-800">Layers</div>
        <div className="flex-1 overflow-y-auto p-3 max-h-48">
          {objects.length === 0 && (
            <div className="text-sm text-slate-400 text-center py-6">No objects yet<br/><span className="text-xs">Add text or a shape to start</span></div>
          )}
          {objects.map((obj, i) => (
            <div
              key={i}
              onClick={() => selectObject(obj)}
              className={`px-3 py-2 text-sm rounded-lg cursor-pointer mb-1 flex items-center justify-between transition-colors ${
                selected === obj ? 'bg-teal-50 text-teal-800' : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span className="truncate">
                {obj.type === 'i-text' ? (obj.text?.slice(0, 20) || 'Text') :
                 obj.type === 'rect' ? 'Rectangle' :
                 obj.type === 'circle' ? 'Circle' :
                 obj.type === 'triangle' ? 'Triangle' :
                 obj.type === 'group' ? 'Group' :
                 obj.type === 'image' ? 'Image' : obj.type}
              </span>
              <span className="flex gap-1 text-xs">
                {obj.lockMovementX && <span>🔒</span>}
                {obj.visible === false && <span>👁️</span>}
              </span>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Align</div>
          <div className="grid grid-cols-3 gap-1.5">
            {['left','center','right','top','middle','bottom'].map(d => (
              <button key={d} onClick={() => align(d)} className="py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50 capitalize text-slate-700">{d}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => distribute('horizontal')} className="py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-700">Dist H</button>
            <button onClick={() => distribute('vertical')} className="py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-700">Dist V</button>
            <button onClick={bringToFront} className="py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-700">Front</button>
            <button onClick={sendToBack} className="py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-700">Back</button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={groupSelected} className="py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-700">Group</button>
            <button onClick={ungroup} className="py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-700">Ungroup</button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Properties</div>
          {selected ? (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={toggleLock} className="py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50">{selected.lockMovementX ? 'Unlock' : 'Lock'}</button>
                <button onClick={toggleHide} className="py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50">{selected.visible === false ? 'Show' : 'Hide'}</button>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Fill</label>
                <input type="color" value={selected.fill || '#000000'} onChange={(e) => updateSelected({ fill: e.target.value })} className="w-full h-9 rounded-lg border border-slate-200 cursor-pointer" />
              </div>
              {selected.type === 'rect' && (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Corner radius</label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={selected.rx || 0}
                    onChange={(e) => updateSelected({ rx: Number(e.target.value), ry: Number(e.target.value) })}
                    className="w-full"
                  />
                  <div className="text-xs text-slate-400 text-right">{selected.rx || 0}px</div>
                </div>
              )}
              {selected.type === 'i-text' && (
                <>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Font</label>
                    <select value={selected.fontFamily || 'system-ui'} onChange={(e) => updateSelected({ fontFamily: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm">
                      <option value="system-ui">System</option>
                      <option value="Georgia, serif">Serif</option>
                      <option value="'Comic Sans MS', cursive">Friendly</option>
                      <option value="monospace">Mono</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button onClick={() => updateSelected({ fontWeight: selected.fontWeight === 'bold' ? 'normal' : 'bold' })} className={`py-1.5 text-xs border rounded-md font-bold ${selected.fontWeight === 'bold' ? 'bg-slate-100' : 'border-slate-200'}`}>B</button>
                    <button onClick={() => updateSelected({ fontStyle: selected.fontStyle === 'italic' ? 'normal' : 'italic' })} className={`py-1.5 text-xs border rounded-md italic ${selected.fontStyle === 'italic' ? 'bg-slate-100' : 'border-slate-200'}`}>I</button>
                    <button onClick={() => updateSelected({ underline: !selected.underline })} className={`py-1.5 text-xs border rounded-md underline ${selected.underline ? 'bg-slate-100' : 'border-slate-200'}`}>U</button>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button onClick={() => updateSelected({ textAlign: 'left' })} className="py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50">Left</button>
                    <button onClick={() => updateSelected({ textAlign: 'center' })} className="py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50">Center</button>
                    <button onClick={() => updateSelected({ textAlign: 'right' })} className="py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50">Right</button>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Size</label>
                    <input type="number" value={selected.fontSize || 24} onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm" />
                  </div>
                </>
              )}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Opacity</label>
                <input type="range" min="0" max="1" step="0.05" value={selected.opacity ?? 1} onChange={(e) => updateSelected({ opacity: Number(e.target.value) })} className="w-full" />
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400 py-4 text-center">Select an object to edit</div>
          )}
        </div>
      </div>
    </div>
  );
}
