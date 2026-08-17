'use client';

import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';

interface CanvasItem {
  id: number;
  type: 'text' | 'photo';
  content?: string;
  src?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  locked?: boolean;
  hidden?: boolean;
}

export default function Editor() {
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [resizing, setResizing] = useState<{ id: number; corner: string } | null>(null);
  const [rotating, setRotating] = useState<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [past, setPast] = useState<CanvasItem[][]>([]);
  const [future, setFuture] = useState<CanvasItem[][]>([]);
  const [canvasBg, setCanvasBg] = useState('#ffffff');
  const [snap, setSnap] = useState(true);
  const grid = 10;

  const selected = items.find(i => i.id === selectedId);

  // ---------- History ----------
  const pushHistory = (next: CanvasItem[]) => {
    setPast(p => [...p, items]);
    setFuture([]);
    setItems(next);
  };

  const undo = () => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setFuture(f => [items, ...f]);
    setPast(p => p.slice(0, -1));
    setItems(prev);
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setPast(p => [...p, items]);
    setFuture(f => f.slice(1));
    setItems(next);
  };

  // ---------- Keyboard ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !selected?.locked) {
        deleteSelected();
      }
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ---------- Helpers ----------
  const updateItem = (id: number, changes: Partial<CanvasItem>) => {
    const next = items.map(i => (i.id === id ? { ...i, ...changes } : i));
    setItems(next);
  };

  const commit = () => pushHistory(items);

  const deleteSelected = () => {
    if (!selectedId) return;
    pushHistory(items.filter(i => i.id !== selectedId));
    setSelectedId(null);
  };

  // ---------- Add content ----------
  const addText = () => {
    const item: CanvasItem = {
      id: Date.now(),
      type: 'text',
      content: 'Double-click to edit',
      x: 200,
      y: 180,
      width: 220,
      height: 50,
      fontSize: 22,
      color: '#0f172a',
      fontFamily: 'system-ui',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
      rotation: 0,
    };
    pushHistory([...items, item]);
    setSelectedId(item.id);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const item: CanvasItem = {
        id: Date.now(),
        type: 'photo',
        src: ev.target?.result as string,
        x: 250,
        y: 160,
        width: 240,
        height: 180,
        rotation: 0,
      };
      pushHistory([...items, item]);
      setSelectedId(item.id);
    };
    reader.readAsDataURL(file);
  };

  // ---------- Templates ----------
  const loadTemplate = (name: string) => {
    const base = Date.now();
    let news: CanvasItem[] = [];

    if (name === 'Visual Schedule') {
      news = [
        { id: base, type: 'text', content: "Today's Schedule", x: 180, y: 80, width: 300, height: 40, fontSize: 26, color: '#0f766e', fontWeight: 'bold', rotation: 0 },
        { id: base + 1, type: 'text', content: '☀️  Morning Work', x: 180, y: 140, width: 280, height: 36, fontSize: 20, rotation: 0 },
        { id: base + 2, type: 'text', content: '🍎  Snack', x: 180, y: 185, width: 280, height: 36, fontSize: 20, rotation: 0 },
        { id: base + 3, type: 'text', content: '📚  Reading', x: 180, y: 230, width: 280, height: 36, fontSize: 20, rotation: 0 },
        { id: base + 4, type: 'text', content: '🍽️  Lunch', x: 180, y: 275, width: 280, height: 36, fontSize: 20, rotation: 0 },
      ];
    } else if (name === 'First-Then') {
      news = [
        { id: base, type: 'text', content: 'FIRST', x: 160, y: 120, width: 140, height: 40, fontSize: 24, color: '#0f766e', fontWeight: 'bold', rotation: 0 },
        { id: base + 1, type: 'text', content: 'Work Task', x: 160, y: 170, width: 140, height: 36, fontSize: 18, rotation: 0 },
        { id: base + 2, type: 'text', content: 'THEN', x: 380, y: 120, width: 140, height: 40, fontSize: 24, color: '#0f766e', fontWeight: 'bold', rotation: 0 },
        { id: base + 3, type: 'text', content: 'Choice Time', x: 380, y: 170, width: 140, height: 36, fontSize: 18, rotation: 0 },
      ];
    } else if (name === 'Communication Board') {
      news = [
        { id: base, type: 'text', content: 'I want...', x: 220, y: 90, width: 200, height: 40, fontSize: 22, color: '#0f766e', fontWeight: 'bold', rotation: 0 },
        { id: base + 1, type: 'text', content: '🍎 Food', x: 140, y: 160, width: 140, height: 40, fontSize: 18, rotation: 0 },
        { id: base + 2, type: 'text', content: '🚽 Bathroom', x: 320, y: 160, width: 140, height: 40, fontSize: 18, rotation: 0 },
        { id: base + 3, type: 'text', content: '💧 Drink', x: 140, y: 220, width: 140, height: 40, fontSize: 18, rotation: 0 },
        { id: base + 4, type: 'text', content: '🛑 Break', x: 320, y: 220, width: 140, height: 40, fontSize: 18, rotation: 0 },
      ];
    }

    pushHistory([...items, ...news]);
  };

  // ---------- Mouse handlers ----------
  const onMouseDownItem = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const item = items.find(i => i.id === id);
    if (!item || item.locked) return;
    setSelectedId(id);
    setDraggingId(id);
    setOffset({ x: e.clientX - item.x, y: e.clientY - item.y });
  };

  const onMouseDownHandle = (e: React.MouseEvent, id: number, corner: string) => {
    e.stopPropagation();
    setResizing({ id, corner });
    setSelectedId(id);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (draggingId !== null) {
      let x = e.clientX - offset.x;
      let y = e.clientY - offset.y;
      if (snap) {
        x = Math.round(x / grid) * grid;
        y = Math.round(y / grid) * grid;
      }
      setItems(items.map(i => (i.id === draggingId ? { ...i, x, y } : i)));
    }

    if (resizing) {
      const item = items.find(i => i.id === resizing.id);
      if (!item) return;
      let { x, y, width, height } = item;
      const dx = e.clientX - (item.x + (resizing.corner.includes('e') ? width : 0));
      const dy = e.clientY - (item.y + (resizing.corner.includes('s') ? height : 0));

      if (resizing.corner.includes('e')) width = Math.max(40, width + dx);
      if (resizing.corner.includes('s')) height = Math.max(30, height + dy);
      if (resizing.corner.includes('w')) {
        const newW = Math.max(40, width - dx);
        x = x + (width - newW);
        width = newW;
      }
      if (resizing.corner.includes('n')) {
        const newH = Math.max(30, height - dy);
        y = y + (height - newH);
        height = newH;
      }
      setItems(items.map(i => (i.id === resizing.id ? { ...i, x, y, width, height } : i)));
    }
  };

  const onMouseUp = () => {
    if (draggingId || resizing) commit();
    setDraggingId(null);
    setResizing(null);
    setRotating(null);
  };

  // ---------- Layers helpers ----------
  const bringForward = () => {
    if (!selectedId) return;
    const idx = items.findIndex(i => i.id === selectedId);
    if (idx < items.length - 1) {
      const next = [...items];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      pushHistory(next);
    }
  };

  const sendBackward = () => {
    if (!selectedId) return;
    const idx = items.findIndex(i => i.id === selectedId);
    if (idx > 0) {
      const next = [...items];
      [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
      pushHistory(next);
    }
  };

  const toggleLock = () => {
    if (!selected) return;
    updateItem(selected.id, { locked: !selected.locked });
    commit();
  };

  const toggleHide = () => {
    if (!selected) return;
    updateItem(selected.id, { hidden: !selected.hidden });
    commit();
  };

  // ---------- Alignment ----------
  const align = (type: string) => {
    if (!selected) return;
    const canvasW = 900;
    const canvasH = 650;
    let changes: Partial<CanvasItem> = {};
    if (type === 'left') changes.x = 40;
    if (type === 'center') changes.x = (canvasW - selected.width) / 2;
    if (type === 'right') changes.x = canvasW - selected.width - 40;
    if (type === 'top') changes.y = 40;
    if (type === 'middle') changes.y = (canvasH - selected.height) / 2;
    if (type === 'bottom') changes.y = canvasH - selected.height - 40;
    updateItem(selected.id, changes);
    commit();
  };

  // ---------- Export ----------
  const exportCanvas = async (format: 'png' | 'jpg') => {
    const el = document.getElementById('canvas');
    if (!el) return;
    const canvas = await html2canvas(el, { scale: 2 });
    const link = document.createElement('a');
    link.download = `applestem.${format}`;
    link.href = canvas.toDataURL(`image/${format}`);
    link.click();
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden" onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      {/* Left Toolbar */}
      <div className="w-56 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center text-white text-xl">🍎</div>
            <span className="font-bold text-teal-800 text-lg">AppleStem</span>
          </div>
        </div>

        <div className="p-3 space-y-2 border-b">
          <button onClick={addText} className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-medium">
            + Text
          </button>
          <label className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-medium flex items-center justify-center cursor-pointer">
            + Photo
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
        </div>

        <div className="p-3 border-b">
          <div className="text-xs font-semibold text-slate-500 mb-2">TEMPLATES</div>
          <div className="space-y-1">
            {['Visual Schedule', 'First-Then', 'Communication Board'].map(t => (
              <button key={t} onClick={() => loadTemplate(t)} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-teal-50">
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 mt-auto space-y-2 border-t">
          <div className="flex gap-2">
            <button onClick={undo} className="flex-1 py-2 text-sm border rounded-lg hover:bg-slate-50">Undo</button>
            <button onClick={redo} className="flex-1 py-2 text-sm border rounded-lg hover:bg-slate-50">Redo</button>
          </div>
          <button onClick={() => exportCanvas('png')} className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium">
            Export PNG
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto bg-slate-200" onClick={() => setSelectedId(null)}>
        <div
          id="canvas"
          className="relative bg-white shadow-xl rounded-2xl"
          style={{
            width: 900,
            height: 650,
            backgroundColor: canvasBg,
            backgroundImage: snap ? 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)' : 'none',
            backgroundSize: `${grid}px ${grid}px`,
          }}
        >
          {items.filter(i => !i.hidden).map(item => (
            <div
              key={item.id}
              className={`absolute select-none ${selectedId === item.id ? 'z-20' : 'z-10'}`}
              style={{
                left: item.x,
                top: item.y,
                width: item.width,
                height: item.height,
                transform: `rotate(${item.rotation || 0}deg)`,
                border: selectedId === item.id ? '2px solid #0d9488' : '1px solid transparent',
              }}
              onMouseDown={(e) => onMouseDownItem(e, item.id)}
              onDoubleClick={() => {
                if (item.type === 'text' && !item.locked) {
                  const val = prompt('Edit text', item.content);
                  if (val !== null) {
                    updateItem(item.id, { content: val });
                    commit();
                  }
                }
              }}
            >
              {item.type === 'text' ? (
                <div
                  style={{
                    fontSize: item.fontSize,
                    color: item.color,
                    fontFamily: item.fontFamily,
                    fontWeight: item.fontWeight,
                    fontStyle: item.fontStyle,
                    textAlign: item.textAlign,
                    width: '100%',
                    height: '100%',
                    padding: 4,
                    wordBreak: 'break-word',
                  }}
                >
                  {item.content}
                </div>
              ) : (
                <img src={item.src} alt="" className="w-full h-full object-cover rounded" draggable={false} />
              )}

              {/* Resize handles */}
              {selectedId === item.id && !item.locked && (
                <>
                  {['nw', 'ne', 'sw', 'se'].map(corner => (
                    <div
                      key={corner}
                      className="absolute w-3 h-3 bg-teal-600 border border-white rounded-sm cursor-pointer"
                      style={{
                        left: corner.includes('w') ? -6 : undefined,
                        right: corner.includes('e') ? -6 : undefined,
                        top: corner.includes('n') ? -6 : undefined,
                        bottom: corner.includes('s') ? -6 : undefined,
                      }}
                      onMouseDown={(e) => onMouseDownHandle(e, item.id, corner)}
                    />
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Layers + Properties */}
      <div className="w-64 bg-white border-l flex flex-col">
        <div className="p-4 border-b">
          <div className="font-semibold text-slate-800">Layers</div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {[...items].reverse().map(item => (
            <div
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer mb-1 ${
                selectedId === item.id ? 'bg-teal-50 text-teal-800' : 'hover:bg-slate-50'
              }`}
            >
              <span className="truncate flex-1">
                {item.type === 'text' ? item.content?.slice(0, 18) || 'Text' : 'Photo'}
              </span>
              {item.locked && <span className="text-xs">🔒</span>}
              {item.hidden && <span className="text-xs">👁️</span>}
            </div>
          ))}
        </div>

        {selected && (
          <div className="p-4 border-t space-y-3">
            <div className="text-xs font-semibold text-slate-500">PROPERTIES</div>

            {selected.type === 'text' && (
              <>
                <div>
                  <label className="text-xs text-slate-500">Size</label>
                  <input
                    type="number"
                    value={selected.fontSize || 22}
                    onChange={(e) => updateItem(selected.id, { fontSize: +e.target.value })}
                    onBlur={commit}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Color</label>
                  <input
                    type="color"
                    value={selected.color || '#0f172a'}
                    onChange={(e) => updateItem(selected.id, { color: e.target.value })}
                    onBlur={commit}
                    className="w-full h-9 rounded-lg"
                  />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      updateItem(selected.id, { fontWeight: selected.fontWeight === 'bold' ? 'normal' : 'bold' });
                      commit();
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-sm border ${selected.fontWeight === 'bold' ? 'bg-teal-700 text-white' : ''}`}
                  >
                    B
                  </button>
                  <button
                    onClick={() => {
                      updateItem(selected.id, { fontStyle: selected.fontStyle === 'italic' ? 'normal' : 'italic' });
                      commit();
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-sm border ${selected.fontStyle === 'italic' ? 'bg-teal-700 text-white' : ''}`}
                  >
                    I
                  </button>
                </div>
              </>
            )}

            <div className="grid grid-cols-3 gap-1">
              {['left', 'center', 'right', 'top', 'middle', 'bottom'].map(a => (
                <button key={a} onClick={() => align(a)} className="py-1.5 text-xs border rounded-lg hover:bg-slate-50 capitalize">
                  {a}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={bringForward} className="flex-1 py-1.5 text-xs border rounded-lg">↑ Forward</button>
              <button onClick={sendBackward} className="flex-1 py-1.5 text-xs border rounded-lg">↓ Back</button>
            </div>

            <div className="flex gap-2">
              <button onClick={toggleLock} className="flex-1 py-1.5 text-xs border rounded-lg">
                {selected.locked ? 'Unlock' : 'Lock'}
              </button>
              <button onClick={toggleHide} className="flex-1 py-1.5 text-xs border rounded-lg">
                {selected.hidden ? 'Show' : 'Hide'}
              </button>
            </div>

            <button onClick={deleteSelected} className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm">
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}