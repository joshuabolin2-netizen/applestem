'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';

interface CanvasItem {
  id: number;
  type: 'text' | 'photo' | 'group';
  content?: string;
  src?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  locked?: boolean;
  hidden?: boolean;
  children?: number[]; // for groups
}

export default function Editor() {
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<{ id: number; corner: string } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [past, setPast] = useState<CanvasItem[][]>([]);
  const [future, setFuture] = useState<CanvasItem[][]>([]);
  const [zoom, setZoom] = useState(1);
  const [clipboard, setClipboard] = useState<CanvasItem[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selected = items.filter(i => selectedIds.includes(i.id));
  const primary = selected[0];

  // ---------- History ----------
  const pushHistory = useCallback((next: CanvasItem[]) => {
    setPast(p => [...p.slice(-40), items]); // keep last 40
    setFuture([]);
    setItems(next);
  }, [items]);

  const undo = () => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setFuture(f => [items, ...f]);
    setPast(p => p.slice(0, -1));
    setItems(prev);
    setSelectedIds([]);
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
      const meta = e.metaKey || e.ctrlKey;

      // Undo / Redo
      if (meta && e.key === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if (meta && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Duplicate
      if (meta && e.key === 'd') {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      // Copy
      if (meta && e.key === 'c') {
        e.preventDefault();
        setClipboard(selected.map(i => ({ ...i })));
        return;
      }

      // Paste
      if (meta && e.key === 'v') {
        e.preventDefault();
        if (clipboard.length === 0) return;
        const newItems = clipboard.map(i => ({
          ...i,
          id: Date.now() + Math.random(),
          x: i.x + 20,
          y: i.y + 20,
        }));
        pushHistory([...items, ...newItems]);
        setSelectedIds(newItems.map(i => i.id));
        return;
      }

      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length && !editingId) {
        e.preventDefault();
        pushHistory(items.filter(i => !selectedIds.includes(i.id)));
        setSelectedIds([]);
        return;
      }

      // Nudge
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedIds.length && !editingId) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        const next = items.map(i =>
          selectedIds.includes(i.id) && !i.locked
            ? { ...i, x: i.x + dx, y: i.y + dy }
            : i
        );
        setItems(next);
      }

      // Escape
      if (e.key === 'Escape') {
        setEditingId(null);
        setSelectedIds([]);
      }

      // Group
      if (meta && e.key === 'g' && selectedIds.length > 1) {
        e.preventDefault();
        groupSelected();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ---------- Helpers ----------
  const updateItems = (updater: (items: CanvasItem[]) => CanvasItem[]) => {
    const next = updater(items);
    setItems(next);
  };

  const commit = () => pushHistory(items);

  const duplicateSelected = () => {
    if (selectedIds.length === 0) return;
    const copies = selected.map(i => ({
      ...i,
      id: Date.now() + Math.random(),
      x: i.x + 25,
      y: i.y + 25,
    }));
    pushHistory([...items, ...copies]);
    setSelectedIds(copies.map(c => c.id));
  };

  const groupSelected = () => {
    if (selectedIds.length < 2) return;
    const groupId = Date.now();
    const group: CanvasItem = {
      id: groupId,
      type: 'group',
      x: Math.min(...selected.map(i => i.x)),
      y: Math.min(...selected.map(i => i.y)),
      width: 200,
      height: 100,
      rotation: 0,
      children: selectedIds,
    };
    // For simplicity we keep children as separate items but mark them
    pushHistory([...items, group]);
    setSelectedIds([groupId]);
  };

  // ---------- Add content ----------
  const addText = () => {
    const item: CanvasItem = {
      id: Date.now(),
      type: 'text',
      content: 'Double-click to edit',
      x: 280,
      y: 220,
      width: 240,
      height: 48,
      rotation: 0,
      fontSize: 22,
      color: '#0f172a',
      fontFamily: 'system-ui, sans-serif',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
    };
    pushHistory([...items, item]);
    setSelectedIds([item.id]);
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
        x: 300,
        y: 180,
        width: 260,
        height: 180,
        rotation: 0,
      };
      pushHistory([...items, item]);
      setSelectedIds([item.id]);
    };
    reader.readAsDataURL(file);
  };

  // ---------- Templates ----------
  const loadTemplate = (name: string) => {
    const base = Date.now();
    let news: CanvasItem[] = [];

    if (name === 'Visual Schedule') {
      news = [
        { id: base, type: 'text', content: "Today's Schedule", x: 200, y: 60, width: 320, height: 44, rotation: 0, fontSize: 26, color: '#0f766e', fontWeight: 'bold' },
        { id: base + 1, type: 'text', content: '1. Morning Meeting', x: 200, y: 130, width: 280, height: 36, rotation: 0, fontSize: 18 },
        { id: base + 2, type: 'text', content: '2. Reading Time', x: 200, y: 175, width: 280, height: 36, rotation: 0, fontSize: 18 },
        { id: base + 3, type: 'text', content: '3. Snack', x: 200, y: 220, width: 280, height: 36, rotation: 0, fontSize: 18 },
        { id: base + 4, type: 'text', content: '4. Centers', x: 200, y: 265, width: 280, height: 36, rotation: 0, fontSize: 18 },
      ];
    } else if (name === 'First-Then') {
      news = [
        { id: base, type: 'text', content: 'FIRST', x: 150, y: 140, width: 160, height: 40, rotation: 0, fontSize: 24, color: '#0f766e', fontWeight: 'bold' },
        { id: base + 1, type: 'text', content: 'Work Task', x: 150, y: 200, width: 160, height: 36, rotation: 0, fontSize: 18 },
        { id: base + 2, type: 'text', content: 'THEN', x: 420, y: 140, width: 160, height: 40, rotation: 0, fontSize: 24, color: '#0f766e', fontWeight: 'bold' },
        { id: base + 3, type: 'text', content: 'Choice', x: 420, y: 200, width: 160, height: 36, rotation: 0, fontSize: 18 },
      ];
    } else if (name === 'Communication Board') {
      news = [
        { id: base, type: 'text', content: 'I want...', x: 260, y: 80, width: 200, height: 40, rotation: 0, fontSize: 22, color: '#0f766e', fontWeight: 'bold' },
        { id: base + 1, type: 'text', content: '🍎 Food', x: 160, y: 160, width: 140, height: 44, rotation: 0, fontSize: 18 },
        { id: base + 2, type: 'text', content: '🚽 Bathroom', x: 340, y: 160, width: 140, height: 44, rotation: 0, fontSize: 18 },
        { id: base + 3, type: 'text', content: '💧 Drink', x: 160, y: 230, width: 140, height: 44, rotation: 0, fontSize: 18 },
        { id: base + 4, type: 'text', content: '🛑 Break', x: 340, y: 230, width: 140, height: 44, rotation: 0, fontSize: 18 },
      ];
    }

    pushHistory([...items, ...news]);
  };

  // ---------- Mouse ----------
  const onMouseDownItem = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const item = items.find(i => i.id === id);
    if (!item || item.locked) return;

    if (e.shiftKey) {
      setSelectedIds(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }

    setDragging(true);
    setOffset({ x: e.clientX - item.x, y: e.clientY - item.y });
  };

  const onMouseDownHandle = (e: React.MouseEvent, id: number, corner: string) => {
    e.stopPropagation();
    setResizing({ id, corner });
    setSelectedIds([id]);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (dragging && selectedIds.length > 0) {
      const primaryItem = items.find(i => i.id === selectedIds[0]);
      if (!primaryItem) return;
      const dx = e.clientX - offset.x - primaryItem.x;
      const dy = e.clientY - offset.y - primaryItem.y;

      setItems(items.map(i =>
        selectedIds.includes(i.id) && !i.locked
          ? { ...i, x: i.x + dx, y: i.y + dy }
          : i
      ));
      setOffset({ x: e.clientX - (primaryItem.x + dx), y: e.clientY - (primaryItem.y + dy) });
    }

    if (resizing) {
      const item = items.find(i => i.id === resizing.id);
      if (!item) return;
      let { x, y, width, height } = item;
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      if (resizing.corner.includes('e')) width = Math.max(40, mouseX - x);
      if (resizing.corner.includes('s')) height = Math.max(30, mouseY - y);
      if (resizing.corner.includes('w')) {
        const newW = Math.max(40, width + (x - mouseX));
        x = mouseX;
        width = newW;
      }
      if (resizing.corner.includes('n')) {
        const newH = Math.max(30, height + (y - mouseY));
        y = mouseY;
        height = newH;
      }
      setItems(items.map(i => i.id === resizing.id ? { ...i, x, y, width, height } : i));
    }
  };

  const onMouseUp = () => {
    if (dragging || resizing) {
      pushHistory(items);
    }
    setDragging(false);
    setResizing(null);
  };

  // ---------- Layers helpers ----------
  const bringForward = () => {
    if (selectedIds.length !== 1) return;
    const idx = items.findIndex(i => i.id === selectedIds[0]);
    if (idx < items.length - 1) {
      const next = [...items];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      pushHistory(next);
    }
  };

  const sendBackward = () => {
    if (selectedIds.length !== 1) return;
    const idx = items.findIndex(i => i.id === selectedIds[0]);
    if (idx > 0) {
      const next = [...items];
      [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
      pushHistory(next);
    }
  };

  const toggleLock = () => {
    if (!primary) return;
    const next = items.map(i =>
      selectedIds.includes(i.id) ? { ...i, locked: !i.locked } : i
    );
    pushHistory(next);
  };

  const toggleHide = () => {
    if (!primary) return;
    const next = items.map(i =>
      selectedIds.includes(i.id) ? { ...i, hidden: !i.hidden } : i
    );
    pushHistory(next);
  };

  const flip = (dir: 'h' | 'v') => {
    // Simple visual flip via scale for photos; for text we just note it
    // (full flip matrix is more complex)
    console.log('Flip', dir);
  };

  // ---------- Alignment ----------
  const align = (type: string) => {
    if (!primary) return;
    const canvasW = 900;
    const canvasH = 650;
    const next = items.map(i => {
      if (!selectedIds.includes(i.id)) return i;
      let x = i.x, y = i.y;
      if (type === 'left') x = 40;
      if (type === 'center') x = (canvasW - i.width) / 2;
      if (type === 'right') x = canvasW - i.width - 40;
      if (type === 'top') y = 40;
      if (type === 'middle') y = (canvasH - i.height) / 2;
      if (type === 'bottom') y = canvasH - i.height - 40;
      return { ...i, x, y };
    });
    pushHistory(next);
  };

  // ---------- Export ----------
  const exportCanvas = async (format: 'png' | 'jpg') => {
    const el = document.getElementById('canvas');
    if (!el) return;
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
    const link = document.createElement('a');
    link.download = `applestem-${Date.now()}.${format}`;
    link.href = canvas.toDataURL(`image/${format}`, 0.95);
    link.click();
  };

  return (
    <div
      className="flex h-screen bg-slate-100 overflow-hidden select-none"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {/* Left Sidebar */}
      <div className="w-56 bg-white border-r flex flex-col shrink-0">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center text-white text-lg">🍎</div>
            <span className="font-bold text-teal-800">AppleStem</span>
          </div>
        </div>

        <div className="p-3 space-y-2 border-b">
          <button onClick={addText} className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-medium transition">
            + Text
          </button>
          <label className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-medium flex items-center justify-center cursor-pointer transition">
            + Photo
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
        </div>

        <div className="p-3 border-b">
          <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Templates</div>
          <div className="space-y-1">
            {['Visual Schedule', 'First-Then', 'Communication Board'].map(t => (
              <button
                key={t}
                onClick={() => loadTemplate(t)}
                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-teal-50 text-slate-700 transition"
              >
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
          <div className="flex gap-2">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="flex-1 py-2 text-sm border rounded-lg">−</button>
            <button onClick={() => setZoom(1)} className="flex-1 py-2 text-sm border rounded-lg">{Math.round(zoom * 100)}%</button>
            <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="flex-1 py-2 text-sm border rounded-lg">+</button>
          </div>
          <button onClick={() => exportCanvas('png')} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium">
            Export PNG
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        className="flex-1 flex items-center justify-center p-8 overflow-auto bg-slate-200"
        onClick={() => {
          setSelectedIds([]);
          setEditingId(null);
        }}
      >
        <div
          id="canvas"
          ref={canvasRef}
          className="relative bg-white shadow-2xl rounded-2xl origin-center"
          style={{
            width: 900,
            height: 650,
            transform: `scale(${zoom})`,
          }}
        >
          {items.filter(i => !i.hidden).map(item => (
            <div
              key={item.id}
              className={`absolute ${selectedIds.includes(item.id) ? 'z-20' : 'z-10'}`}
              style={{
                left: item.x,
                top: item.y,
                width: item.width,
                height: item.height,
                transform: `rotate(${item.rotation}deg)`,
                outline: selectedIds.includes(item.id) ? '2px solid #0d9488' : 'none',
                outlineOffset: 2,
              }}
              onMouseDown={(e) => onMouseDownItem(e, item.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (item.type === 'text' && !item.locked) {
                  setEditingId(item.id);
                }
              }}
            >
              {item.type === 'text' ? (
                editingId === item.id ? (
                  <textarea
                    autoFocus
                    className="w-full h-full p-1 resize-none border-none outline-none bg-transparent"
                    style={{
                      fontSize: item.fontSize,
                      color: item.color,
                      fontFamily: item.fontFamily,
                      fontWeight: item.fontWeight,
                      fontStyle: item.fontStyle,
                      textAlign: item.textAlign,
                    }}
                    value={item.content}
                    onChange={(e) => {
                      setItems(items.map(i =>
                        i.id === item.id ? { ...i, content: e.target.value } : i
                      ));
                    }}
                    onBlur={() => {
                      setEditingId(null);
                      pushHistory(items);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
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
                )
              ) : item.type === 'photo' ? (
                <img
                  src={item.src}
                  alt=""
                  className="w-full h-full object-cover rounded"
                  draggable={false}
                />
              ) : null}

              {/* Resize handles */}
              {selectedIds.includes(item.id) && !item.locked && editingId !== item.id && (
                <>
                  {['nw', 'ne', 'sw', 'se'].map(corner => (
                    <div
                      key={corner}
                      className="absolute w-3 h-3 bg-teal-600 border-2 border-white rounded-sm shadow"
                      style={{
                        left: corner.includes('w') ? -6 : undefined,
                        right: corner.includes('e') ? -6 : undefined,
                        top: corner.includes('n') ? -6 : undefined,
                        bottom: corner.includes('s') ? -6 : undefined,
                        cursor: `${corner}-resize`,
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

      {/* Right Panel */}
      <div className="w-64 bg-white border-l flex flex-col shrink-0">
        <div className="p-4 border-b">
          <div className="font-semibold text-slate-800">Layers</div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {[...items].reverse().map(item => (
            <div
              key={item.id}
              onClick={(e) => {
                e.stopPropagation();
                if (e.shiftKey) {
                  setSelectedIds(prev =>
                    prev.includes(item.id) ? prev.filter(x => x !== item.id) : [...prev, item.id]
                  );
                } else {
                  setSelectedIds([item.id]);
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer mb-1 transition ${
                selectedIds.includes(item.id) ? 'bg-teal-50 text-teal-800' : 'hover:bg-slate-50'
              }`}
            >
              <span className="truncate flex-1">
                {item.type === 'text' ? (item.content?.slice(0, 20) || 'Text') : item.type === 'photo' ? 'Photo' : 'Group'}
              </span>
              {item.locked && <span className="text-xs opacity-60">🔒</span>}
              {item.hidden && <span className="text-xs opacity-60">👁️</span>}
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-sm text-slate-400 text-center py-8">No layers yet</div>
          )}
        </div>

        {primary && (
          <div className="p-4 border-t space-y-3 max-h-[50%] overflow-y-auto">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Properties</div>

            {primary.type === 'text' && (
              <>
                <div>
                  <label className="text-xs text-slate-500">Size</label>
                  <input
                    type="number"
                    value={primary.fontSize || 22}
                    onChange={(e) => {
                      const val = +e.target.value;
                      setItems(items.map(i =>
                        selectedIds.includes(i.id) ? { ...i, fontSize: val } : i
                      ));
                    }}
                    onBlur={commit}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Color</label>
                  <input
                    type="color"
                    value={primary.color || '#0f172a'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setItems(items.map(i =>
                        selectedIds.includes(i.id) ? { ...i, color: val } : i
                      ));
                    }}
                    onBlur={commit}
                    className="w-full h-9 rounded-lg mt-1 cursor-pointer"
                  />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setItems(items.map(i =>
                        selectedIds.includes(i.id)
                          ? { ...i, fontWeight: i.fontWeight === 'bold' ? 'normal' : 'bold' }
                          : i
                      ));
                      commit();
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-sm border font-bold ${
                      primary.fontWeight === 'bold' ? 'bg-teal-700 text-white border-teal-700' : ''
                    }`}
                  >
                    B
                  </button>
                  <button
                    onClick={() => {
                      setItems(items.map(i =>
                        selectedIds.includes(i.id)
                          ? { ...i, fontStyle: i.fontStyle === 'italic' ? 'normal' : 'italic' }
                          : i
                      ));
                      commit();
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-sm border italic ${
                      primary.fontStyle === 'italic' ? 'bg-teal-700 text-white border-teal-700' : ''
                    }`}
                  >
                    I
                  </button>
                </div>
              </>
            )}

            <div className="grid grid-cols-3 gap-1">
              {['left', 'center', 'right', 'top', 'middle', 'bottom'].map(a => (
                <button
                  key={a}
                  onClick={() => align(a)}
                  className="py-1.5 text-xs border rounded-lg hover:bg-slate-50 capitalize"
                >
                  {a}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={bringForward} className="flex-1 py-1.5 text-xs border rounded-lg hover:bg-slate-50">
                ↑ Forward
              </button>
              <button onClick={sendBackward} className="flex-1 py-1.5 text-xs border rounded-lg hover:bg-slate-50">
                ↓ Back
              </button>
            </div>

            <div className="flex gap-2">
              <button onClick={toggleLock} className="flex-1 py-1.5 text-xs border rounded-lg hover:bg-slate-50">
                {primary.locked ? 'Unlock' : 'Lock'}
              </button>
              <button onClick={toggleHide} className="flex-1 py-1.5 text-xs border rounded-lg hover:bg-slate-50">
                {primary.hidden ? 'Show' : 'Hide'}
              </button>
            </div>

            <button
              onClick={duplicateSelected}
              className="w-full py-2 text-sm border rounded-xl hover:bg-slate-50"
            >
              Duplicate
            </button>

            <button
              onClick={() => {
                pushHistory(items.filter(i => !selectedIds.includes(i.id)));
                setSelectedIds([]);
              }}
              className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}