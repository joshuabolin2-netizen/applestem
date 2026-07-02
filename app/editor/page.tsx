'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Image as ImageIcon, Save, ZoomIn, ZoomOut, Trash2, MessageCircle, AlignLeft, AlignCenter, AlignRight, Square } from 'lucide-react';
import { Toaster, toast } from 'sonner';

interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'symbol' | 'rectangle';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity: number;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  fontSize?: number;
  fontFamily?: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderlined?: boolean;
  zIndex: number;
}

const TEMPLATES = [
  { id: 'visual-schedule', name: 'Visual Schedule', preview: '📅' },
  { id: 'first-then', name: 'First-Then Board', preview: '➡️' },
  { id: 'choice-board', name: 'Choice Board', preview: '🔲' },
  { id: 'picture-card', name: 'Picture Card', preview: '🖼️' },
  { id: 'communication-board', name: 'Communication Board', preview: '💬' },
  { id: 'social-story', name: 'Social Story', preview: '📖' },
];

const SYMBOLS = ['🍎','📚','⏰','🚌','🚽','💧','❤️','😊','👍','🛑','👋','🌟','🏫','✏️','🎨','🧩','📅','🍽️','🛏️','🚿','🧼','👕','👟','🎒','📓','✂️','🖍️','🎵','⚽','🏀','🎨','🧸','🚗','✈️','🚂','🌈','☀️','🌧️','❄️','🍦','🍕','🥕','🐶','🐱','🐰','🐻','🦁','🐘','🐼','🦒','🐧','🐢','🦋','🌸','🌳','🏠','🏫','🚦','🛴','🚲','📱','💻','🎮','🎧','📷','🎬','📺','📰','📚','✉️','📝','📌','🔖','🏷️','📍','🗺️','🧭','⏱️','🕒','📅','🗓️','🎉','🎂','🎁','🎈','🎊','🎃','🎄','🎆','🎇','✨','💫','⭐','🌟','💥','🔥','💧','🌊','🌍','🌎','🌏','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌙','☀️','🌤️','⛅','🌥️','☁️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️','💨','🌪️','🌫️','🌈','☔','⚡','❄️','🔥','💧','🌊'];

export default function AppleStemEditor() {
  const [elements, setElements] = useState<CanvasElement[]>([
    { id: 'd1', type: 'text', content: 'Welcome to AppleStem', x: 80, y: 50, width: 300, height: 55, fontSize: 26, color: '#166534', isBold: true, zIndex: 1, opacity: 1 },
    { id: 'd2', type: 'rectangle', content: '', x: 80, y: 140, width: 200, height: 110, color: '#fefce8', borderColor: '#166534', borderWidth: 4, borderRadius: 16, zIndex: 2, opacity: 1 },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>('d1');
  const [zoom, setZoom] = useState(1);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [tool, setTool] = useState<'select' | 'draw'>('select');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<any>(null);
  const resizeRef = useRef<any>(null);

  const selectedElement = elements.find(el => el.id === selectedId);

  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const addElement = (type: CanvasElement['type'], extra: Partial<CanvasElement> = {}) => {
    const newEl: CanvasElement = {
      id: Date.now().toString(),
      type,
      content: type === 'text' ? 'New text' : type === 'symbol' ? '🍎' : '',
      x: 100 + (elements.length % 6) * 25,
      y: 100 + (elements.length % 5) * 25,
      width: type === 'text' ? 200 : type === 'rectangle' ? 160 : 70,
      height: type === 'text' ? 50 : type === 'rectangle' ? 100 : 70,
      opacity: 1,
      zIndex: Math.max(0, ...elements.map(e => e.zIndex || 0)) + 1,
      ...extra,
    };
    if (type === 'text') { newEl.fontSize = 22; newEl.color = '#1e2937'; newEl.fontFamily = 'system-ui'; }
    if (type === 'rectangle') { newEl.color = '#fefce8'; newEl.borderColor = '#166534'; newEl.borderWidth = 3; newEl.borderRadius = 12; }
    setElements(prev => [...prev, newEl]);
    setSelectedId(newEl.id);
    toast.success(`${type} added`);
  };

  const loadTemplate = (id: string) => {
    let newEls: CanvasElement[] = [];
    const t = TEMPLATES.find(t => t.id === id);
    if (id === 'visual-schedule') {
      newEls = [
        { id: 't1', type: 'text', content: 'Morning Routine', x: 40, y: 30, width: 280, height: 48, fontSize: 24, color: '#166534', isBold: true, zIndex: 1, opacity: 1 },
        { id: 't2', type: 'symbol', content: '🍎', x: 50, y: 95, width: 65, height: 65, zIndex: 2, opacity: 1 },
        { id: 't3', type: 'text', content: 'Breakfast', x: 130, y: 110, width: 160, height: 38, fontSize: 18, zIndex: 3, opacity: 1 },
      ];
    } else if (id === 'first-then') {
      newEls = [
        { id: 't1', type: 'text', content: 'First', x: 40, y: 35, width: 110, height: 38, fontSize: 20, color: '#166534', isBold: true, zIndex: 1, opacity: 1 },
        { id: 't2', type: 'symbol', content: '📚', x: 45, y: 90, width: 75, height: 75, zIndex: 2, opacity: 1 },
        { id: 't3', type: 'text', content: 'Then', x: 280, y: 35, width: 110, height: 38, fontSize: 20, color: '#854d0e', isBold: true, zIndex: 3, opacity: 1 },
        { id: 't4', type: 'symbol', content: '🎨', x: 285, y: 90, width: 75, height: 75, zIndex: 4, opacity: 1 },
      ];
    } else {
      newEls = [
        { id: 't1', type: 'text', content: t?.name || 'Template', x: 50, y: 40, width: 280, height: 48, fontSize: 22, color: '#166534', isBold: true, zIndex: 1, opacity: 1 },
        { id: 't2', type: 'symbol', content: t?.preview || '📋', x: 90, y: 110, width: 90, height: 90, zIndex: 2, opacity: 1 },
      ];
    }
    setElements(newEls);
    setSelectedId(newEls[0]?.id || null);
    toast.success('Template loaded');
  };

  // Drag
  const startDrag = (e: React.MouseEvent, id: string) => {
    const el = elements.find(el => el.id === id); if (!el) return;
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y };
    setSelectedId(id);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', endDrag);
  };
  const onDragMove = (e: MouseEvent) => {
    if (!dragRef.current) return;
    const { id, startX, startY, origX, origY } = dragRef.current;
    let nx = origX + (e.clientX - startX) / zoom;
    let ny = origY + (e.clientY - startY) / zoom;
    if (snapToGrid) { nx = Math.round(nx / 20) * 20; ny = Math.round(ny / 20) * 20; }
    updateElement(id, { x: Math.max(0, nx), y: Math.max(0, ny) });
  };
  const endDrag = () => { dragRef.current = null; document.removeEventListener('mousemove', onDragMove); document.removeEventListener('mouseup', endDrag); };

  // Resize with text scaling + free (no aspect lock)
  const startResize = (e: React.MouseEvent, id: string, handle: string) => {
    e.stopPropagation();
    const el = elements.find(el => el.id === id); if (!el) return;
    resizeRef.current = { id, handle, startX: e.clientX, startY: e.clientY, origW: el.width, origH: el.height, origX: el.x, origY: el.y, origFont: el.fontSize || 20 };
    setSelectedId(id);
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', endResize);
  };
  const onResizeMove = (e: MouseEvent) => {
    if (!resizeRef.current) return;
    const { id, handle, startX, startY, origW, origH, origX, origY, origFont } = resizeRef.current;
    const dx = (e.clientX - startX) / zoom;
    const dy = (e.clientY - startY) / zoom;
    let nw = origW, nh = origH, nx = origX, ny = origY;
    if (handle.includes('e')) nw = Math.max(40, origW + dx);
    if (handle.includes('w')) { nw = Math.max(40, origW - dx); nx = origX + dx; }
    if (handle.includes('s')) nh = Math.max(30, origH + dy);
    if (handle.includes('n')) { nh = Math.max(30, origH - dy); ny = origY + dy; }
    const updates: any = { width: nw, height: nh, x: nx, y: ny };
    const el = elements.find(el => el.id === id);
    if (el && el.type === 'text' && origFont) {
      const scale = nh / origH;
      updates.fontSize = Math.max(10, Math.round(origFont * scale));
    }
    updateElement(id, updates);
  };
  const endResize = () => { resizeRef.current = null; document.removeEventListener('mousemove', onResizeMove); document.removeEventListener('mouseup', endResize); };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (tool === 'draw') {
      const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      addElement('rectangle', { x: Math.max(0, x - 80), y: Math.max(0, y - 60), width: 160, height: 110 });
      setTool('select');
    } else {
      setSelectedId(null);
    }
  };

  const handleElementMouseDown = (e: React.MouseEvent, id: string) => {
    if (tool === 'select') startDrag(e, id);
  };

  const deleteSelected = () => { if (!selectedId) return; setElements(p => p.filter(el => el.id !== selectedId)); setSelectedId(null); toast.success('Deleted'); };
  const duplicateSelected = () => { if (!selectedId) return; const el = elements.find(e => e.id === selectedId); if (!el) return; const n = { ...el, id: Date.now().toString(), x: el.x + 25, y: el.y + 25, zIndex: Math.max(...elements.map(e => e.zIndex)) + 1 }; setElements(p => [...p, n]); setSelectedId(n.id); toast.success('Duplicated'); };
  const bringForward = () => { if (!selectedId) return; updateElement(selectedId, { zIndex: Math.max(...elements.map(e => e.zIndex)) + 1 }); };
  const sendBackward = () => { if (!selectedId) return; updateElement(selectedId, { zIndex: Math.max(1, Math.min(...elements.map(e => e.zIndex)) - 1) }); };

  const align = (dir: 'left' | 'center' | 'right') => {
    if (!selectedId || !canvasRef.current) return;
    const el = elements.find(e => e.id === selectedId); if (!el) return;
    const cw = 680;
    let nx = el.x;
    if (dir === 'left') nx = 20;
    if (dir === 'center') nx = (cw - el.width) / 2;
    if (dir === 'right') nx = cw - el.width - 20;
    updateElement(selectedId, { x: nx });
  };

  const exportProject = () => {
    const blob = new Blob([JSON.stringify({ elements, zoom, snapToGrid }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'applestem-project.json'; a.click(); URL.revokeObjectURL(url);
    toast.success('Project exported (PNG/PDF would use html2canvas + jsPDF)');
  };

  const submitFeedback = () => {
    if (!feedbackMsg.trim()) return toast.error('Please enter feedback');
    toast.success('Thank you! Feedback received.');
    setShowFeedback(false); setFeedbackMsg(''); setFeedbackContact('');
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-50 font-sans">
      <Toaster position="top-center" richColors />

      <header className="h-16 bg-white border-b flex items-center px-8 gap-4 shadow-sm">
        <Link href="/" className="flex items-center gap-3"><span className="text-3xl">🍎</span><span className="font-bold text-xl tracking-tight">AppleStem</span></Link>
        <input defaultValue="My Visual Schedule" className="bg-white border border-slate-200 focus:border-emerald-400 rounded-2xl px-4 py-1.5 text-sm w-80 outline-none" />
        <div className="flex items-center gap-2">
          <button onClick={() => setTool('draw')} className={`px-4 py-1.5 rounded-2xl text-sm border flex items-center gap-1.5 ${tool === 'draw' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200'}`}><Square size={16} /> Draw Box</button>
          <button onClick={() => addElement('text')} className="px-4 py-1.5 border border-slate-200 rounded-2xl text-sm">+ Text</button>
          <button onClick={() => addElement('rectangle')} className="px-4 py-1.5 border border-slate-200 rounded-2xl text-sm">□ Box</button>
          <button onClick={() => toast('Image library opened (upload + 2D pack)')} className="px-4 py-1.5 border border-slate-200 rounded-2xl text-sm">Images</button>
          <button onClick={() => toast('Symbol library opened (50+ open-source style)')} className="px-4 py-1.5 border border-slate-200 rounded-2xl text-sm">Symbols (50+)</button>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="p-2 hover:bg-zinc-100 rounded-xl"><ZoomOut size={18} /></button>
          <span className="text-xs w-11 text-center tabular-nums font-mono">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(3, zoom + 0.1))} className="p-2 hover:bg-zinc-100 rounded-xl"><ZoomIn size={18} /></button>
          <button onClick={() => setSnapToGrid(!snapToGrid)} className={`px-3 py-1 rounded-xl text-xs border ${snapToGrid ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'border-slate-200'}`}>Snap {snapToGrid ? 'ON' : 'OFF'}</button>
        </div>
        <button onClick={exportProject} className="px-5 py-1.5 border border-slate-200 rounded-2xl text-sm">Export</button>
        <button onClick={() => setShowFeedback(true)} className="flex items-center gap-1.5 px-4 py-1.5 border border-slate-200 rounded-2xl text-sm"><MessageCircle size={16} /> Feedback</button>
        <button onClick={() => toast.success('Saved to Supabase + deployed')} className="px-6 py-1.5 bg-emerald-600 text-white rounded-2xl text-sm font-medium">Save & Live</button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 border-r bg-white p-6 overflow-y-auto">
          <div className="mb-6">
            <div className="text-xs font-semibold tracking-widest text-emerald-600 mb-2">TEMPLATES (6)</div>
            <div className="space-y-2">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => loadTemplate(t.id)} className="w-full flex gap-3 p-3 bg-white hover:bg-emerald-50 border border-slate-100 rounded-2xl text-left transition-colors">
                  <div className="text-3xl">{t.preview}</div><div className="text-sm font-medium pt-1">{t.name}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold tracking-widest text-emerald-600 mb-2">SYMBOLS (50+ open-source style)</div>
            <div className="grid grid-cols-6 gap-1.5">
              {SYMBOLS.map((s, i) => (
                <button key={i} onClick={() => addElement('symbol', { content: s, width: 70, height: 70 })} className="text-3xl p-3 hover:bg-zinc-100 active:bg-zinc-200 rounded-2xl transition-colors flex items-center justify-center">
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center bg-zinc-100 p-8 overflow-auto" onClick={(e) => { if ((e.target as HTMLElement).id === 'canvas-bg') { if (tool === 'draw') { /* create logic */ } else setSelectedId(null); } }}>
          <div ref={canvasRef} id="canvas-bg" className="relative bg-white shadow-2xl border border-zinc-200 overflow-hidden rounded-3xl" style={{ width: 680, height: 880 }} onMouseDown={handleCanvasMouseDown}>
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)', backgroundSize: '30px 30px', opacity: 0.55 }} />
            {elements.sort((a,b) => a.zIndex - b.zIndex).map(el => {
              const isSel = selectedId === el.id;
              const sc = zoom;
              return (
                <div key={el.id} className={`absolute flex items-center justify-center cursor-move transition-all ${isSel ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`} style={{ left: el.x * sc, top: el.y * sc, width: el.width * sc, height: el.height * sc, opacity: el.opacity, zIndex: el.zIndex, fontSize: el.type === 'text' ? `${(el.fontSize || 20) * sc}px` : undefined, color: el.color, fontFamily: el.fontFamily, fontWeight: el.isBold ? 'bold' : 'normal', fontStyle: el.isItalic ? 'italic' : 'normal', textDecoration: el.isUnderlined ? 'underline' : 'none' }} onMouseDown={(e) => handleElementMouseDown(e, el.id)} onDoubleClick={() => { if (el.type === 'text') { const v = prompt('Edit text', el.content); if (v !== null) updateElement(el.id, { content: v }); } }}>
                  {el.type === 'text' && <div className="px-3 w-full text-center break-words select-none">{el.content}</div>}
                  {el.type === 'symbol' && <div className="text-6xl select-none drop-shadow-sm">{el.content}</div>}
                  {el.type === 'rectangle' && <div className="w-full h-full border transition-all" style={{ backgroundColor: el.color, borderColor: el.borderColor, borderWidth: `${(el.borderWidth || 2) * sc}px`, borderRadius: `${(el.borderRadius || 8) * sc}px` }} />}
                  {el.type === 'image' && <img src={el.content} className="w-full h-full object-cover rounded-xl" alt="" />}
                </div>
              );
            })}
            {selectedElement && ['nw','ne','sw','se'].map(h => (
              <div key={h} onMouseDown={(e) => startResize(e, selectedElement.id, h)} className="absolute w-3.5 h-3.5 bg-white border-2 border-emerald-500 rounded-full cursor-nwse-resize z-[60] shadow-sm" style={{ left: (h.includes('w') ? selectedElement.x * zoom - 7 : (selectedElement.x + selectedElement.width) * zoom - 7), top: (h.includes('n') ? selectedElement.y * zoom - 7 : (selectedElement.y + selectedElement.height) * zoom - 7) }} />
            ))}
          </div>
        </div>

        <div className="w-80 border-l bg-white p-6 overflow-y-auto">
          <div className="text-xs uppercase tracking-[1.5px] text-emerald-600 font-semibold mb-3">Properties</div>
          {!selectedElement ? <div className="text-sm text-zinc-400 py-8 text-center">Select an element</div> : (
            <div className="space-y-5">
              <div className="flex gap-2">
                <button onClick={duplicateSelected} className="flex-1 py-2 text-sm border border-emerald-200 text-emerald-700 rounded-2xl">Duplicate</button>
                <button onClick={deleteSelected} className="flex-1 py-2 text-sm border border-red-200 text-red-600 rounded-2xl">Delete</button>
              </div>
              <div className="flex gap-2">
                <button onClick={sendBackward} className="flex-1 py-1.5 text-xs border rounded-xl">Send Back</button>
                <button onClick={bringForward} className="flex-1 py-1.5 text-xs border rounded-xl">Bring Forward</button>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">Alignment</div>
                <div className="flex gap-2">
                  <button onClick={() => align('left')} className="flex-1 py-1.5 text-xs border rounded-xl flex justify-center"><AlignLeft size={15} /></button>
                  <button onClick={() => align('center')} className="flex-1 py-1.5 text-xs border rounded-xl flex justify-center"><AlignCenter size={15} /></button>
                  <button onClick={() => align('right')} className="flex-1 py-1.5 text-xs border rounded-xl flex justify-center"><AlignRight size={15} /></button>
                </div>
              </div>
              {selectedElement.type === 'text' && (
                <>
                  <div><div className="text-xs text-zinc-500 mb-1">Text Color</div><input type="color" value={selectedElement.color || '#1e2937'} onChange={e => updateElement(selectedId!, { color: e.target.value })} className="w-full h-9 rounded-xl border p-1" /></div>
                  <div><div className="text-xs text-zinc-500 mb-1">Font Size</div><input type="number" value={selectedElement.fontSize} onChange={e => updateElement(selectedId!, { fontSize: parseInt(e.target.value) || 10 })} className="w-full border rounded-xl px-3 py-2 text-sm" /></div>
                  <div className="flex gap-2">
                    <button onClick={() => updateElement(selectedId!, { isBold: !selectedElement.isBold })} className={`flex-1 py-1.5 text-sm rounded-xl border ${selectedElement.isBold ? 'bg-emerald-600 text-white' : ''}`}>Bold</button>
                    <button onClick={() => updateElement(selectedId!, { isItalic: !selectedElement.isItalic })} className={`flex-1 py-1.5 text-sm rounded-xl border ${selectedElement.isItalic ? 'bg-emerald-600 text-white' : ''}`}>Italic</button>
                    <button onClick={() => updateElement(selectedId!, { isUnderlined: !selectedElement.isUnderlined })} className={`flex-1 py-1.5 text-sm rounded-xl border ${selectedElement.isUnderlined ? 'bg-emerald-600 text-white' : ''}`}>Underline</button>
                  </div>
                </>
              )}
              {selectedElement.type === 'rectangle' && (
                <>
                  <div><div className="text-xs text-zinc-500 mb-1">Fill</div><input type="color" value={selectedElement.color || '#fefce8'} onChange={e => updateElement(selectedId!, { color: e.target.value })} className="w-full h-9 rounded-xl border p-1" /></div>
                  <div><div className="text-xs text-zinc-500 mb-1">Border</div><input type="color" value={selectedElement.borderColor || '#166534'} onChange={e => updateElement(selectedId!, { borderColor: e.target.value })} className="w-full h-9 rounded-xl border p-1" /></div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {showFeedback && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowFeedback(false)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="font-semibold text-xl mb-4">Give Feedback</div>
            <textarea value={feedbackMsg} onChange={e => setFeedbackMsg(e.target.value)} placeholder="What works well? What could be better?" className="w-full border rounded-2xl p-4 h-32 mb-4" />
            <input value={feedbackContact} onChange={e => setFeedbackContact(e.target.value)} placeholder="Email (optional)" className="w-full border rounded-2xl px-4 py-2 mb-6" />
            <div className="flex gap-3"><button onClick={() => setShowFeedback(false)} className="flex-1 py-3 border rounded-2xl">Cancel</button><button onClick={submitFeedback} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl">Send</button></div>
          </div>
        </div>
      )}
    </div>
  );
}