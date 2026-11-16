'use client';
// contrast-force: 2026-11-16

import { useEffect, useRef, useState } from 'react';
import { Canvas, Rect, Circle, Triangle, IText, FabricImage, Group, Line } from 'fabric';

export default function Editor() {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<any>(null);
  const [objects, setObjects] = useState<any[]>([]);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [activePanel, setActivePanel] = useState<'text'|'shapes'|'symbols'|'templates'|null>(null);
  const [pageSize, setPageSize] = useState({ w: 800, h: 600, name: 'Square' });
  const [renaming, setRenaming] = useState<any>(null);
  const [renameValue, setRenameValue] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<any>>(new Set());
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [lockVersion, setLockVersion] = useState(0);
  const isRestoring = useRef(false);
  const guidesRef = useRef<any[]>([]);
  const tempGuidesRef = useRef<any[]>([]);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setShowLayers(true);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const refreshObjects = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setObjects([...canvas.getObjects()].filter(o => !o.excludeFromExport).reverse());
  };

  const pushHistory = () => {
    const canvas = fabricRef.current;
    if (!canvas || isRestoring.current) return;
    const json = JSON.stringify(canvas.toJSON(['excludeFromExport', 'name']));
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

  const clearTempGuides = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    tempGuidesRef.current.forEach(g => { try { canvas.remove(g); } catch {} });
    tempGuidesRef.current = [];
    canvas.getObjects().forEach(o => {
      if ((o as any).__isTempGuide) canvas.remove(o);
    });
    canvas.renderAll();
  };

  const drawGrid = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    guidesRef.current.forEach(g => { try { canvas.remove(g); } catch {} });
    guidesRef.current = [];
    if (!showGrid) { canvas.renderAll(); return; }
    const gridSize = 40;
    const w = canvas.width || 800;
    const h = canvas.height || 600;
    for (let i = 0; i < w / gridSize; i++) {
      const line = new Line([i * gridSize, 0, i * gridSize, h], {
        stroke: '#cbd5e1', strokeWidth: 1, selectable: false, evented: false, excludeFromExport: true
      });
      (line as any).__isGrid = true;
      canvas.add(line);
      guidesRef.current.push(line);
    }
    for (let i = 0; i < h / gridSize; i++) {
      const line = new Line([0, i * gridSize, w, i * gridSize], {
        stroke: '#cbd5e1', strokeWidth: 1, selectable: false, evented: false, excludeFromExport: true
      });
      (line as any).__isGrid = true;
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
    clearTempGuides();
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
    clearTempGuides();
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
      preserveObjectStacking: true,
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

    canvas.on('object:moving', clearTempGuides);
    canvas.on('object:modified', () => { clearTempGuides(); pushHistory(); });
    canvas.on('object:added', (e) => { if (!e.target?.excludeFromExport && !(e.target as any).__isGrid) pushHistory(); });
    canvas.on('object:removed', pushHistory);

    canvas.on('selection:created', (e) => { clearTempGuides(); setSelected(e.selected?.[0] || null); setShowContext(true); refreshObjects(); });
    canvas.on('selection:updated', (e) => { clearTempGuides(); setSelected(e.selected?.[0] || null); setShowContext(true); refreshObjects(); });
    canvas.on('selection:cleared', () => { clearTempGuides(); setSelected(null); setShowContext(false); refreshObjects(); });

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
      if (meta && e.key === ']') { e.preventDefault(); bringForward(); }
      if (meta && e.key === '[') { e.preventDefault(); sendBackward(); }
      if (meta && e.key === 'g') { e.preventDefault(); groupSelected(); }
      if (meta && e.shiftKey && e.key === 'G') { e.preventDefault(); ungroup(); }
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key) && canvas.getActiveObject()) {
        e.preventDefault();
        clearTempGuides();
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

  useEffect(() => { if (fabricRef.current) { clearTempGuides(); drawGrid(); } }, [showGrid]);

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
    setActivePanel(null);
  };

  const addRect = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const rect = new Rect({ left: 220, top: 160, width: 160, height: 90, fill: '#0f766e', rx: 0, ry: 0 });
    canvas.add(rect); canvas.setActiveObject(rect); canvas.renderAll();
    setActivePanel(null);
  };

  const addCircle = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const circle = new Circle({ left: 260, top: 180, radius: 60, fill: '#14b8a6' });
    canvas.add(circle); canvas.setActiveObject(circle); canvas.renderAll();
    setActivePanel(null);
  };

  const addTriangle = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const tri = new Triangle({ left: 280, top: 180, width: 110, height: 90, fill: '#f59e0b' });
    canvas.add(tri); canvas.setActiveObject(tri); canvas.renderAll();
    setActivePanel(null);
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
      setActivePanel(null);
    };
    reader.readAsDataURL(file);
  };

  const addSymbol = (emoji: string, label: string) => addText(`${emoji} ${label}`, 22);

  const loadTemplate = (name: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    clearTempGuides();
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
    setActivePanel(null);
  };

  const deleteSelected = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getActiveObjects().forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
    setShowContext(false);
  };

  const updateSelected = (props: any) => {
    const canvas = fabricRef.current;
    if (!canvas || !selected) return;
    selected.set(props);
    canvas.renderAll();
    pushHistory();
    setLockVersion(v => v + 1);
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
    clearTempGuides();
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

  const bringForward = () => {
    const canvas = fabricRef.current;
    if (!canvas || !selected) return;
    canvas.bringObjectForward(selected);
    canvas.renderAll();
    pushHistory();
  };

  const sendBackward = () => {
    const canvas = fabricRef.current;
    if (!canvas || !selected) return;
    canvas.sendObjectBackwards(selected);
    canvas.renderAll();
    pushHistory();
  };

  const toggleLock = (obj?: any) => {
    const target = obj || selected;
    if (!target) return;
    const locked = !target.lockMovementX;
    target.set({
      lockMovementX: locked,
      lockMovementY: locked,
      lockRotation: locked,
      lockScalingX: locked,
      lockScalingY: locked,
      hasControls: !locked,
      selectable: true,
    });
    fabricRef.current?.renderAll();
    pushHistory();
    setLockVersion(v => v + 1);
    setSelected({ ...target, _lock: locked });
  };

  const toggleVisible = (obj: any) => {
    obj.set({ visible: !obj.visible });
    fabricRef.current?.renderAll();
    pushHistory();
    setLockVersion(v => v + 1);
  };

  const groupSelected = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length < 2) return;
    const group = new Group(active, { name: `Group ${objects.filter(o => o.type === 'group').length + 1}` });
    active.forEach((obj) => canvas.remove(obj));
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
    setExpandedGroups(prev => new Set(prev).add(group));
  };

  const ungroup = () => {
    const canvas = fabricRef.current;
    if (!canvas || !selected || selected.type !== 'group') return;
    const items = (selected as Group).getObjects();
    const groupLeft = selected.left || 0;
    const groupTop = selected.top || 0;
    canvas.remove(selected);
    items.forEach((item) => {
      item.set({ left: (item.left || 0) + groupLeft, top: (item.top || 0) + groupTop });
      canvas.add(item);
    });
    canvas.renderAll();
    setExpandedGroups(prev => { const n = new Set(prev); n.delete(selected); return n; });
  };

  const selectObject = (obj: any) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setActiveObject(obj);
    canvas.renderAll();
    setSelected(obj);
    if (isMobile) setShowLayers(false);
  };

  const changeZoom = (delta: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const newZoom = Math.min(2, Math.max(0.3, zoom + delta));
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

  const getLabel = (obj: any) => {
    if (obj.name) return obj.name;
    if (obj.type === 'i-text') return obj.text?.slice(0, 18) || 'Text';
    if (obj.type === 'rect') return 'Rectangle';
    if (obj.type === 'circle') return 'Circle';
    if (obj.type === 'triangle') return 'Triangle';
    if (obj.type === 'group') return 'Group';
    if (obj.type === 'image') return 'Image';
    return obj.type;
  };

  const moveLayer = (fromIdx: number, toIdx: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const all = canvas.getObjects().filter(o => !o.excludeFromExport);
    const fromObj = all[all.length - 1 - fromIdx];
    const targetObj = all[all.length - 1 - toIdx];
    if (!fromObj || !targetObj || fromObj === targetObj) return;
    const targetIndex = canvas.getObjects().indexOf(targetObj);
    canvas.moveObjectTo(fromObj, targetIndex);
    canvas.renderAll();
    pushHistory();
  };

  const renderLayerItem = (obj: any, depth = 0) => {
    const isGroup = obj.type === 'group';
    const isExpanded = expandedGroups.has(obj);
    const children = isGroup ? (obj as Group).getObjects() : [];
    const idx = objects.indexOf(obj);
    const isLocked = !!obj.lockMovementX;

    return (
      <div key={obj} style={{ paddingLeft: depth * 12 }}>
        <div
          onClick={() => selectObject(obj)}
          className={`px-3 py-3 text-sm rounded-lg cursor-pointer mb-1 flex items-center gap-2 font-medium min-h-[48px] ${selected === obj ? 'bg-teal-100 text-teal-900' : 'hover:bg-slate-100 text-slate-900'}`}
        >
          {isGroup ? (
            <button onClick={(e) => { e.stopPropagation(); setExpandedGroups(prev => { const n = new Set(prev); if (n.has(obj)) n.delete(obj); else n.add(obj); return n; }); }} className="w-8 h-8 text-xs flex items-center justify-center hover:bg-slate-200 rounded text-slate-900">
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <span className="w-8" />
          )}
          <span className="flex-1 truncate text-slate-900">{getLabel(obj)}</span>
          <div className="flex gap-1">
            <button onClick={(e) => { e.stopPropagation(); moveLayer(idx, Math.max(0, idx - 1)); }} className="w-8 h-8 text-sm hover:bg-slate-200 rounded text-slate-900 flex items-center justify-center" title="Move up">↑</button>
            <button onClick={(e) => { e.stopPropagation(); moveLayer(idx, Math.min(objects.length - 1, idx + 1)); }} className="w-8 h-8 text-sm hover:bg-slate-200 rounded text-slate-900 flex items-center justify-center" title="Move down">↓</button>
          </div>
          <button onClick={(e) => { e.stopPropagation(); toggleVisible(obj); }} className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded text-lg" title="Toggle visibility">
            {obj.visible === false ? '🙈' : '👁'}
          </button>
          <button onClick={(e) => { e.stopPropagation(); toggleLock(obj); }} className={`w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded text-lg ${isLocked ? 'text-amber-700' : ''}`} title={isLocked ? 'Unlock' : 'Lock'}>
            {isLocked ? '🔒' : '🔓'}
          </button>
        </div>
        {isGroup && isExpanded && children.map((child: any) => renderLayerItem(child, depth + 1))}
      </div>
    );
  };

  // Mobile bottom sheet for tools
  const ToolSheet = () => {
    if (!activePanel || !isMobile) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setActivePanel(null)}>
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="sticky top-0 bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-slate-900 text-base">
              {activePanel === 'text' && 'Add Text'}
              {activePanel === 'shapes' && 'Add Shape'}
              {activePanel === 'symbols' && 'Symbols'}
              {activePanel === 'templates' && 'Templates'}
            </span>
            <button onClick={() => setActivePanel(null)} className="w-10 h-10 flex items-center justify-center text-slate-700 text-xl font-bold">✕</button>
          </div>
          <div className="p-4 pb-8">
            {activePanel === 'text' && (
              <button onClick={() => addText()} className="w-full py-4 bg-teal-700 text-white rounded-xl text-base font-semibold">+ Add text</button>
            )}
            {activePanel === 'shapes' && (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={addRect} className="py-4 border-2 border-slate-400 rounded-xl text-base font-semibold text-slate-900">Rectangle</button>
                <button onClick={addCircle} className="py-4 border-2 border-slate-400 rounded-xl text-base font-semibold text-slate-900">Circle</button>
                <button onClick={addTriangle} className="py-4 border-2 border-slate-400 rounded-xl text-base font-semibold text-slate-900">Triangle</button>
                <label className="py-4 border-2 border-slate-400 rounded-xl text-base font-semibold text-slate-900 flex items-center justify-center cursor-pointer">
                  + Image
                  <input type="file" accept="image/*" className="hidden" onChange={addImage} />
                </label>
              </div>
            )}
            {activePanel === 'symbols' && (
              <div className="grid grid-cols-4 gap-3">
                {[['🍎','Food'],['🚽','Bath'],['💧','Drink'],['🛑','Break'],['📖','Read'],['✏️','Write'],['🤝','Help'],['✅','Done']].map(([e, l]) => (
                  <button key={l} onClick={() => addSymbol(e, l)} className="aspect-square flex items-center justify-center text-3xl border-2 border-slate-400 rounded-xl hover:bg-teal-50" title={l}>{e}</button>
                ))}
              </div>
            )}
            {activePanel === 'templates' && (
              <div className="space-y-2">
                {['Visual Schedule','First-Then','Communication Board','Token Board'].map(name => (
                  <button key={name} onClick={() => loadTemplate(name)} className="w-full text-left px-4 py-4 text-base font-semibold text-slate-900 rounded-xl border-2 border-slate-300 hover:bg-slate-50">{name}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Mobile context toolbar (appears above bottom nav when selected)
  const ContextBar = () => {
    if (!isMobile || !selected || !showContext) return null;
    return (
      <div className="fixed left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg" style={{ bottom: '64px' }}>
        <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto">
          <button onClick={duplicateSelected} className="flex-shrink-0 px-3 py-2 text-sm font-semibold text-slate-900 bg-slate-100 rounded-lg">Duplicate</button>
          <button onClick={deleteSelected} className="flex-shrink-0 px-3 py-2 text-sm font-semibold text-red-700 bg-red-50 rounded-lg">Delete</button>
          <button onClick={() => toggleLock()} className="flex-shrink-0 px-3 py-2 text-sm font-semibold text-slate-900 bg-slate-100 rounded-lg">{selected.lockMovementX ? 'Unlock' : 'Lock'}</button>
          <button onClick={bringToFront} className="flex-shrink-0 px-3 py-2 text-sm font-semibold text-slate-900 bg-slate-100 rounded-lg">Front</button>
          <button onClick={sendToBack} className="flex-shrink-0 px-3 py-2 text-sm font-semibold text-slate-900 bg-slate-100 rounded-lg">Back</button>
          <button onClick={() => align('center')} className="flex-shrink-0 px-3 py-2 text-sm font-semibold text-slate-900 bg-slate-100 rounded-lg">Center</button>
          <button onClick={() => align('middle')} className="flex-shrink-0 px-3 py-2 text-sm font-semibold text-slate-900 bg-slate-100 rounded-lg">Middle</button>
          {selected.type === 'i-text' && (
            <>
              <button onClick={() => updateSelected({ fontWeight: selected.fontWeight === 'bold' ? 'normal' : 'bold' })} className={`flex-shrink-0 px-3 py-2 text-sm font-bold rounded-lg ${selected.fontWeight === 'bold' ? 'bg-teal-100 text-teal-900' : 'bg-slate-100 text-slate-900'}`}>B</button>
              <button onClick={() => updateSelected({ fontStyle: selected.fontStyle === 'italic' ? 'normal' : 'italic' })} className={`flex-shrink-0 px-3 py-2 text-sm italic rounded-lg ${selected.fontStyle === 'italic' ? 'bg-teal-100 text-teal-900' : 'bg-slate-100 text-slate-900'}`}>I</button>
            </>
          )}
          <button onClick={() => setShowContext(false)} className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-slate-600">✕</button>
        </div>
      </div>
    );
  };

  // Mobile layers sheet
  const LayersSheet = () => {
    if (!isMobile || !showLayers) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowLayers(false)}>
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
            <span className="font-bold text-slate-900 text-base">Layers</span>
            <button onClick={() => setShowLayers(false)} className="w-10 h-10 flex items-center justify-center text-slate-700 text-xl font-bold">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {objects.length === 0 && <div className="text-sm font-medium text-slate-700 text-center py-8">No objects yet</div>}
            {objects.map((obj) => renderLayerItem(obj))}
          </div>
        </div>
      </div>
    );
  };

  return (
    
      <style>{`
        /* Force dark text on light backgrounds */
        .text-slate-900, button, span, label, div, p, h1, h2, h3 {
          color: #0f172a !important;
        }
        /* Keep white text on dark buttons */
        .bg-slate-900, .bg-teal-700, .bg-teal-800, button.bg-slate-900, button.bg-teal-700 {
          color: #ffffff !important;
        }
        .bg-teal-700 *, .bg-slate-900 * {
          color: #ffffff !important;
        }
      `}</style>

    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-900 flex-col md:flex-row" style={{ touchAction: 'manipulation' }}>
      {/* Desktop left rail */}
      {!isMobile && (
        <div className="w-16 bg-white border-r border-slate-300 flex flex-col items-center py-3 shrink-0">
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
              className={`w-12 h-12 flex flex-col items-center justify-center rounded-lg mb-1 text-xs font-semibold transition-colors ${activePanel === item.id ? 'bg-teal-100 text-teal-800' : 'text-slate-900 hover:bg-slate-100'}`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </button>
          ))}
          <div className="mt-auto flex flex-col gap-1">
            <button onClick={undo} className="w-10 h-10 text-slate-900 hover:bg-slate-100 rounded-lg text-sm font-medium">↺</button>
            <button onClick={redo} className="w-10 h-10 text-slate-900 hover:bg-slate-100 rounded-lg text-sm font-medium">↻</button>
          </div>
        </div>
      )}

      {/* Desktop expandable panel */}
      {activePanel && !isMobile && (
        <div className="w-64 bg-white border-r border-slate-300 flex flex-col shrink-0 overflow-y-auto">
          <div className="px-4 py-3 border-b border-slate-300 font-bold text-slate-900 text-sm flex items-center justify-between">
            {activePanel === 'text' && 'Text'}
            {activePanel === 'shapes' && 'Shapes'}
            {activePanel === 'symbols' && 'Symbols'}
            {activePanel === 'templates' && 'Templates'}
            <button onClick={() => setActivePanel(null)} className="text-slate-700 hover:text-slate-900 text-lg font-bold">✕</button>
          </div>
          <div className="p-4 space-y-3">
            {activePanel === 'text' && (
              <button onClick={() => addText()} className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-semibold">+ Add text</button>
            )}
            {activePanel === 'shapes' && (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={addRect} className="py-3 border-2 border-slate-400 rounded-lg text-sm font-semibold text-slate-900 hover:bg-slate-100">Rectangle</button>
                <button onClick={addCircle} className="py-3 border-2 border-slate-400 rounded-lg text-sm font-semibold text-slate-900 hover:bg-slate-100">Circle</button>
                <button onClick={addTriangle} className="py-3 border-2 border-slate-400 rounded-lg text-sm font-semibold text-slate-900 hover:bg-slate-100">Triangle</button>
                <label className="py-3 border-2 border-slate-400 rounded-lg text-sm font-semibold text-slate-900 hover:bg-slate-100 flex items-center justify-center cursor-pointer">
                  + Image
                  <input type="file" accept="image/*" className="hidden" onChange={addImage} />
                </label>
              </div>
            )}
            {activePanel === 'symbols' && (
              <div className="grid grid-cols-4 gap-2">
                {[['🍎','Food'],['🚽','Bath'],['💧','Drink'],['🛑','Break'],['📖','Read'],['✏️','Write'],['🤝','Help'],['✅','Done']].map(([e, l]) => (
                  <button key={l} onClick={() => addSymbol(e, l)} className="aspect-square flex items-center justify-center text-2xl border-2 border-slate-400 rounded-lg hover:bg-teal-50" title={l}>{e}</button>
                ))}
              </div>
            )}
            {activePanel === 'templates' && (
              <div className="space-y-1">
                {['Visual Schedule','First-Then','Communication Board','Token Board'].map(name => (
                  <button key={name} onClick={() => loadTemplate(name)} className="w-full text-left px-3 py-3 text-sm font-semibold text-slate-900 rounded-lg hover:bg-slate-100">{name}</button>
                ))}
              </div>
            )}
            <div className="pt-3 border-t border-slate-300">
              <div className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wide">Page size</div>
              <div className="grid grid-cols-2 gap-1 mb-3">
                {[['Square',800,600],['Landscape',900,560],['Portrait',560,800],['A4',595,842]].map(([n,w,h]) => (
                  <button key={n as string} onClick={() => setPage(w as number, h as number, n as string)} className={`py-2 text-xs border-2 rounded font-semibold ${pageSize.name === n ? 'bg-teal-100 border-teal-500 text-teal-900' : 'border-slate-400 text-slate-900 hover:bg-slate-100'}`}>{n}</button>
                ))}
              </div>
              <div className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wide">Background</div>
              <input type="color" value={bgColor} onChange={(e) => setBackground(e.target.value)} className="w-full h-10 rounded-lg border-2 border-slate-400 cursor-pointer" />
              <label className="flex items-center gap-2 text-sm mt-2 cursor-pointer font-medium text-slate-900">
                <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                Show grid
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Main canvas area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0" ref={containerRef}>
        {/* Top bar */}
        <div className={`bg-white border-b border-slate-300 flex items-center px-3 gap-2 shrink-0 ${isMobile ? 'h-12' : 'h-14'}`}>
          <span className="font-bold text-slate-900 text-sm md:text-base">🍎 AppleStem</span>
          {!isMobile && selected && (
            <>
              <div className="w-px h-5 bg-slate-300 mx-1" />
              <button onClick={duplicateSelected} className="px-2 py-1 text-sm font-semibold text-slate-900 hover:bg-slate-100 rounded-md">Dup</button>
              <button onClick={deleteSelected} className="px-2 py-1 text-sm font-semibold text-slate-900 hover:bg-slate-100 rounded-md">Del</button>
              <button onClick={() => toggleLock()} className="px-2 py-1 text-sm font-semibold text-slate-900 hover:bg-slate-100 rounded-md">{selected.lockMovementX ? 'Unlock' : 'Lock'}</button>
              <button onClick={bringToFront} className="px-2 py-1 text-sm font-semibold text-slate-900 hover:bg-slate-100 rounded-md">Front</button>
              <button onClick={sendToBack} className="px-2 py-1 text-sm font-semibold text-slate-900 hover:bg-slate-100 rounded-md">Back</button>
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            {!isMobile && (
              <>
                <button onClick={() => changeZoom(-0.1)} className="w-8 h-8 border-2 border-slate-400 rounded text-slate-900 font-medium">−</button>
                <span className="text-sm font-semibold text-slate-900 w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => changeZoom(0.1)} className="w-8 h-8 border-2 border-slate-400 rounded text-slate-900 font-medium">+</button>
              </>
            )}
            <button onClick={exportPNG} className={`bg-slate-900 text-white font-semibold rounded-lg ${isMobile ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm'}`}>Export</button>
          </div>
        </div>

        {/* Canvas workspace */}
        <div className="flex-1 flex items-center justify-center overflow-auto bg-slate-100" style={{ paddingBottom: isMobile ? 80 : 0 }}>
          <div className="relative shadow-xl rounded-lg max-w-full" style={{ margin: isMobile ? '8px' : '24px' }}>
            <canvas ref={canvasEl} style={{ background: '#ffffff', maxWidth: '100%', height: 'auto' }} />
          </div>
        </div>

        {/* Desktop bottom bar */}
        {!isMobile && (
          <div className="h-12 bg-white border-t border-slate-300 flex items-center px-3 gap-3 shrink-0">
            <div className="text-sm font-medium text-slate-800">{objects.length} object{objects.length !== 1 ? 's' : ''}</div>
          </div>
        )}
      </div>

      {/* Desktop layers panel */}
      {!isMobile && showLayers && (
        <div className="w-72 bg-white border-l border-slate-300 flex flex-col shrink-0">
          <div className="px-3 py-2 border-b border-slate-300 font-bold text-slate-900 text-sm">Layers</div>
          <div className="flex-1 overflow-y-auto p-2">
            {objects.length === 0 && <div className="text-sm font-medium text-slate-800 text-center py-6">No objects yet</div>}
            {objects.map((obj) => renderLayerItem(obj))}
          </div>
          <div className="p-2 border-t border-slate-300 space-y-2 max-h-48 overflow-y-auto">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">Align</div>
            <div className="grid grid-cols-3 gap-1">
              {['left','center','right','top','middle','bottom'].map(d => (
                <button key={d} onClick={() => align(d)} className="py-2 text-xs border-2 border-slate-400 rounded hover:bg-slate-100 capitalize font-semibold text-slate-900">{d}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1">
              <button onClick={groupSelected} className="py-2 text-xs border-2 border-slate-400 rounded hover:bg-slate-100 font-semibold text-slate-900">Group</button>
              <button onClick={ungroup} className="py-2 text-xs border-2 border-slate-400 rounded hover:bg-slate-100 font-semibold text-slate-900">Ungroup</button>
            </div>
            {selected && (
              <div>
                <div className="text-xs font-bold text-slate-900 mb-1 uppercase tracking-wide">Opacity</div>
                <input type="range" min="0" max="1" step="0.05" value={selected.opacity ?? 1} onChange={(e) => updateSelected({ opacity: Number(e.target.value) })} className="w-full" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-300 flex items-center justify-around z-30 safe-area-bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {[
            { id: 'text', icon: 'T', label: 'Text' },
            { id: 'shapes', icon: '▢', label: 'Shapes' },
            { id: 'symbols', icon: '☺', label: 'Symbols' },
            { id: 'templates', icon: '▤', label: 'Templates' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePanel(activePanel === item.id ? null : item.id as any)}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] text-xs font-semibold ${activePanel === item.id ? 'text-teal-800' : 'text-slate-900'}`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="mt-0.5">{item.label}</span>
            </button>
          ))}
          <button onClick={() => setShowLayers(!showLayers)} className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] text-xs font-semibold text-slate-900">
            <span className="text-xl leading-none">☰</span>
            <span className="mt-0.5">Layers</span>
          </button>
        </div>
      )}

      {/* Mobile overlays */}
      <ToolSheet />
      <ContextBar />
      <LayersSheet />
    </div>
  );
}
