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
  const [activePanel, setActivePanel] = useState<'text'|'shapes'|'symbols'|'templates'|null>('text');
  const [pageSize, setPageSize] = useState({ w: 800, h: 600, name: 'Square' });
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
        stroke: '#e2e8f0', strokeWidth: 1, selectable: false, evented: false, excludeFromExport: true
      });
      canvas.add(line);
      guidesRef.current.push(line);
    }
    for (let i = 0; i < canvas.height! / gridSize; i++) {
      const line = new Line([0, i * gridSize, canvas.width!, i * gridSize], {
        stroke: '#e2e8f0', strokeWidth: 1, selectable: false, evented: false, excludeFromExport: true
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
      width: 800,
      height: 600,
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
      left: 180 + Math.random() * 30,
      top: 160 + Math.random() * 30,
      fontSize: size, fill: '#0f172a', fontFamily: family,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addRect = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const rect = new Rect({ left: 220, top: 160, width: 160, height: 90, fill: '#0f766e', rx: 0, ry: 0 });
    canvas.add(rect); canvas.setActiveObject(rect); canvas.renderAll();
  };

  const addCircle = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const circle = new Circle({ left: 260, top: 180, radius: 60, fill: '#14b8a6' });
    canvas.add(circle); canvas.setActiveObject(circle); canvas.renderAll();
  };

  const addTriangle = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const tri = new Triangle({ left: 280, top: 180, width: 110, height: 90, fill: '#f59e0b' });
    canvas.add(tri); canvas.setActiveObject(tri); canvas.renderAll();
  };

  const addImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricRef.current) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const img = await FabricImage.fromURL(ev.target?.result as string);
      img.set({ left: 180, top: 130, scaleX: 0.3, scaleY: 0.3 });
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
      const title = new IText("Today's Schedule", { left: 160, top: 70, fontSize: 30, fill: '#0f766e', fontWeight: 'bold' });
      const t1 = new IText('1. Morning Meeting', { left: 160, top: 140, fontSize: 18, fill: '#0f172a' });
      const t2 = new IText('2. Reading Time', { left: 160, top: 185, fontSize: 18, fill: '#0f172a' });
      const t3 = new IText('3. Snack', { left: 160, top: 230, fontSize: 18, fill: '#0f172a' });
      canvas.add(title, t1, t2, t3);
    } else if (name === 'First-Then') {
      const first = new IText('FIRST', { left: 120, top: 120, fontSize: 26, fill: '#0f766e', fontWeight: 'bold' });
      const task = new IText('Work Task', { left: 120, top: 170, fontSize: 18 });
      const then = new IText('THEN', { left: 380, top: 120, fontSize: 26, fill: '#0f766e', fontWeight: 'bold' });
      const choice = new IText('Choice', { left: 380, top: 170, fontSize: 18 });
      canvas.add(first, task, then, choice);
    } else if (name === 'Communication Board') {
      const title = new IText('I want...', { left: 240, top: 50, fontSize: 26, fill: '#0f766e', fontWeight: 'bold' });
      const food = new IText('🍎 Food', { left: 120, top: 140, fontSize: 20 });
      const bath = new IText('🚽 Bathroom', { left: 300, top: 140, fontSize: 20 });
      const drink = new IText('💧 Drink', { left: 120, top: 210, fontSize: 20 });
      const brk = new IText('🛑 Break', { left: 300, top: 210, fontSize: 20 });
      canvas.add(title, food, bath, drink, brk);
    } else if (name === 'Token Board') {
      const title = new IText('Token Board', { left: 250, top: 70, fontSize: 26, fill: '#0f766e', fontWeight: 'bold' });
      for (let i = 0; i < 5; i++) {
        const box = new Rect({ left: 120 + i * 100, top: 160, width: 80, height: 80, fill: '#f8fafc', stroke: '#cbd5e1', strokeWidth: 2, rx: 0, ry: 0 });
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
    const canvasW = canvas.width || 800;
    const canvasH = canvas.height || 600;
    active.forEach((obj) => {
      if (dir === 'left') obj.set({ left: 30 });
      if (dir === 'center') obj.set({ left: (canvasW - (obj.width || 0) * (obj.scaleX || 1)) / 2 });
      if (dir === 'right') obj.set({ left: canvasW - (obj.width || 0) * (obj.scaleX || 1) - 30 });
      if (dir === 'top') obj.set({ top: 30 });
      if (dir === 'middle') obj.set({ top: (canvasH - (obj.height || 0) * (obj.scaleY || 1)) / 2 });
      if (dir === 'bottom') obj.set({ top: canvasH - (obj.height || 0) * (obj.scaleY || 1) - 30 });
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
    const total = dir === 'horizontal' ? ((last.left || 0) - (first.left || 0)) : ((last.top || 0) - (first.top || 0));
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
    canvas.setWidth(pageSize.w * newZoom);
    canvas.setHeight(pageSize.h * newZoom);
    canvas.renderAll();
  };

  const setPage = (w: number, h: number, name: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setPageSize({ w, h, name });
    canvas.setWidth(w * zoom);
    canvas.setHeight(h * zoom);
    canvas.renderAll();
    if (showGrid) drawGrid();
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

  const duplicateSelected = () => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    active.clone().then((cloned: any) => {
      cloned.set({ left: (cloned.left || 0) + 20, top: (cloned.top || 0) + 20 });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
    });
  };

  return (
    <div className="flex h-screen bg-[#f4f5f7] overflow-hidden font-sans text-slate-900">
      <div className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-3 shrink-0">
        <div className="text-2xl mb-4">🍎</div>
        {[
          { id: 'text', icon: 'T', label: 'Text' },
          { id: 'shapes', icon: '▢', label: 'Shapes' },
          { id: 'symbols', icon: '☺', label: 'Symbols' },
          { id: 'templates', icon: '▤', label: 'Templates' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePanel(activePanel === item.id ? null : item.id as any)}
            className={`w-12 h-12 flex flex-col items-center justify-center rounded-lg mb-1 text-xs font-medium transition-colors ${
              activePanel === item.id ? 'bg-teal-50 text-teal-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </button>
        ))}
        <div className="mt-auto flex flex-col gap-1">
          <button onClick={undo} className="w-10 h-10 text-slate-700 hover:bg-slate-50 rounded-lg text-sm">↺</button>
          <button onClick={redo} className="w-10 h-10 text-slate-700 hover:bg-slate-50 rounded-lg text-sm">↻</button>
        </div>
      </div>

      {activePanel && (
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
          <div className="px-4 py-3 border-b border-slate-200 font-semibold text-slate-900 text-sm flex items-center justify-between">
            {activePanel === 'text' && 'Text'}
            {activePanel === 'shapes' && 'Shapes'}
            {activePanel === 'symbols' && 'Symbols'}
            {activePanel === 'templates' && 'Templates'}
            <button onClick={() => setActivePanel(null)} className="text-slate-500 hover:text-slate-800">✕</button>
          </div>
          <div className="p-4 space-y-3">
            {activePanel === 'text' && (
              <button onClick={() => addText()} className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium">+ Add text</button>
            )}
            {activePanel === 'shapes' && (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={addRect} className="py-3 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Rectangle</button>
                <button onClick={addCircle} className="py-3 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Circle</button>
                <button onClick={addTriangle} className="py-3 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Triangle</button>
                <label className="py-3 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center justify-center cursor-pointer">
                  + Image
                  <input type="file" accept="image/*" className="hidden" onChange={addImage} />
                </label>
              </div>
            )}
            {activePanel === 'symbols' && (
              <div className="grid grid-cols-4 gap-2">
                {[['🍎','Food'],['🚽','Bath'],['💧','Drink'],['🛑','Break'],['📖','Read'],['✏️','Write'],['🤝','Help'],['✅','Done']].map(([e, l]) => (
                  <button key={l} onClick={() => addSymbol(e, l)} className="aspect-square flex items-center justify-center text-xl border border-slate-300 rounded-lg hover:bg-teal-50" title={l}>{e}</button>
                ))}
              </div>
            )}
            {activePanel === 'templates' && (
              <div className="space-y-1">
                {['Visual Schedule','First-Then','Communication Board','Token Board'].map(name => (
                  <button key={name} onClick={() => loadTemplate(name)} className="w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-slate-50">{name}</button>
                ))}
              </div>
            )}
            <div className="pt-3 border-t border-slate-200">
              <div className="text-xs font-semibold text-slate-800 mb-2">Page size</div>
              <div className="grid grid-cols-2 gap-1 mb-3">
                {[['Square',800,600],['Landscape',900,560],['Portrait',560,800],['A4',595,842]].map(([n,w,h]) => (
                  <button key={n as string} onClick={() => setPage(w as number, h as number, n as string)} className={`py-1.5 text-xs border rounded font-medium ${pageSize.name === n ? 'bg-teal-50 border-teal-300 text-teal-800' : 'border-slate-300 hover:bg-slate-50'}`}>{n}</button>
                ))}
              </div>
              <div className="text-xs font-semibold text-slate-800 mb-2">Background</div>
              <input type="color" value={bgColor} onChange={(e) => setBackground(e.target.value)} className="w-full h-9 rounded-lg border border-slate-300 cursor-pointer" />
              <label className="flex items-center gap-2 text-sm mt-2 cursor-pointer">
                <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                Show grid
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-2 shrink-0">
          {selected ? (
            <>
              <button onClick={duplicateSelected} className="px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 rounded-md">Duplicate</button>
              <button onClick={deleteSelected} className="px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 rounded-md">Delete</button>
              <button onClick={toggleLock} className="px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 rounded-md">{selected.lockMovementX ? 'Unlock' : 'Lock'}</button>
              <div className="w-px h-6 bg-slate-200 mx-1" />
              <button onClick={bringToFront} className="px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 rounded-md">Front</button>
              <button onClick={sendToBack} className="px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 rounded-md">Back</button>
              <div className="w-px h-6 bg-slate-200 mx-1" />
              <div className="flex items-center gap-1">
                {['#0f172a','#0f766e','#14b8a6','#f59e0b','#ef4444','#3b82f6'].map(c => (
                  <button key={c} onClick={() => updateSelected({ fill: c })} className="w-6 h-6 rounded-full border border-slate-300" style={{ background: c }} />
                ))}
              </div>
              {selected.type === 'i-text' && (
                <>
                  <div className="w-px h-6 bg-slate-200 mx-1" />
                  <button onClick={() => updateSelected({ fontWeight: selected.fontWeight === 'bold' ? 'normal' : 'bold' })} className={`px-2 py-1 text-sm font-bold rounded ${selected.fontWeight === 'bold' ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>B</button>
                  <button onClick={() => updateSelected({ fontStyle: selected.fontStyle === 'italic' ? 'normal' : 'italic' })} className={`px-2 py-1 text-sm italic rounded ${selected.fontStyle === 'italic' ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>I</button>
                </>
              )}
            </>
          ) : (
            <span className="text-sm text-slate-600">Select an object to edit</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-600">{pageSize.name}</span>
            <button onClick={exportPNG} className="px-4 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800">Export</button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-10 overflow-auto relative">
          <div className="relative shadow-2xl rounded-lg">
            <canvas ref={canvasEl} style={{ background: '#ffffff' }} />
            {selected && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white shadow-lg border border-slate-200 rounded-full px-2 py-1 z-10">
                <button onClick={duplicateSelected} className="w-7 h-7 flex items-center justify-center text-sm hover:bg-slate-100 rounded-full" title="Duplicate">⎘</button>
                <button onClick={toggleLock} className="w-7 h-7 flex items-center justify-center text-sm hover:bg-slate-100 rounded-full" title="Lock">🔒</button>
                <button onClick={deleteSelected} className="w-7 h-7 flex items-center justify-center text-sm hover:bg-red-50 text-red-600 rounded-full" title="Delete">🗑</button>
              </div>
            )}
          </div>
        </div>

        <div className="h-12 bg-white border-t border-slate-200 flex items-center px-4 gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => changeZoom(-0.1)} className="w-8 h-8 border border-slate-300 rounded hover:bg-slate-50 text-slate-800">−</button>
            <span className="text-sm font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => changeZoom(0.1)} className="w-8 h-8 border border-slate-300 rounded hover:bg-slate-50 text-slate-800">+</button>
          </div>
          <div className="text-sm text-slate-600">{objects.length} object{objects.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div className="w-64 bg-white border-l border-slate-200 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-slate-200 font-semibold text-slate-900 text-sm">Layers</div>
        <div className="flex-1 overflow-y-auto p-2">
          {objects.length === 0 && (
            <div className="text-sm text-slate-700 text-center py-8">No objects yet</div>
          )}
          {objects.map((obj, i) => (
            <div
              key={i}
              onClick={() => selectObject(obj)}
              className={`px-3 py-2 text-sm rounded-lg cursor-pointer mb-1 ${selected === obj ? 'bg-teal-50 text-teal-900 font-medium' : 'hover:bg-slate-50 text-slate-900'}`}
            >
              {obj.type === 'i-text' ? (obj.text?.slice(0, 18) || 'Text') :
               obj.type === 'rect' ? 'Rectangle' :
               obj.type === 'circle' ? 'Circle' :
               obj.type === 'triangle' ? 'Triangle' :
               obj.type === 'group' ? 'Group' :
               obj.type === 'image' ? 'Image' : obj.type}
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-slate-200 space-y-2">
          <div className="text-xs font-semibold text-slate-800">Align</div>
          <div className="grid grid-cols-3 gap-1">
            {['left','center','right','top','middle','bottom'].map(d => (
              <button key={d} onClick={() => align(d)} className="py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 capitalize font-medium">{d}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1">
            <button onClick={() => distribute('horizontal')} className="py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 font-medium">Dist H</button>
            <button onClick={() => distribute('vertical')} className="py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 font-medium">Dist V</button>
            <button onClick={groupSelected} className="py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 font-medium">Group</button>
            <button onClick={ungroup} className="py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 font-medium">Ungroup</button>
          </div>
          {selected?.type === 'rect' && (
            <div>
              <div className="text-xs font-semibold text-slate-800 mb-1">Corner radius</div>
              <input type="range" min="0" max="40" value={selected.rx || 0} onChange={(e) => updateSelected({ rx: Number(e.target.value), ry: Number(e.target.value) })} className="w-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
