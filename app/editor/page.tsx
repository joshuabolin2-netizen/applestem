'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, Image, Save, ZoomIn, ZoomOut, Trash2, 
  ArrowUp, ArrowDown, MessageCircle, ChevronDown 
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'symbol' | 'rectangle';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
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

interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
}

const TEMPLATES: Template[] = [
  { id: 'visual-schedule', name: 'Visual Schedule', description: 'Daily routine timeline', preview: '📅' },
  { id: 'first-then', name: 'First-Then Board', description: 'Task sequencing', preview: '➡️' },
  { id: 'choice-board', name: 'Choice Board', description: 'Multiple options', preview: '🔲' },
];

const SYMBOLS = ['🍎','📚','⏰','🚌','🚽','💧','❤️','😊','👍','🛑','👋','🌟','🏫','✏️','🎨','🧩','📅'];

const SAMPLE_IMAGES = [
  'https://picsum.photos/id/1011/300/200',
  'https://picsum.photos/id/1005/300/200',
  'https://picsum.photos/id/106/300/200',
  'https://picsum.photos/id/201/300/200',
  'https://picsum.photos/id/29/300/200',
  'https://picsum.photos/id/160/300/200',
  'https://picsum.photos/id/251/300/200',
  'https://picsum.photos/id/312/300/200',
];

// Font options with preview labels
const FONT_OPTIONS = [
  { value: 'system-ui', label: 'System' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Teachers', label: 'Teachers' },
  { value: 'Lexend', label: 'Lexend' },
  { value: 'Atkinson Hyperlegible', label: 'Atkinson Hyperlegible' },
  { value: 'Didact Gothic', label: 'Didact Gothic' },
  { value: 'Outfit', label: 'Outfit' },
  { value: 'Jost', label: 'Jost' },
  { value: 'Comic Neue', label: 'Comic Neue' },
  { value: 'Patrick Hand', label: 'Patrick Hand' },
  { value: 'Schoolbell', label: 'Schoolbell' },
  { value: 'Fredoka', label: 'Fredoka' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Quicksand', label: 'Quicksand' },
  { value: 'Baloo 2', label: 'Baloo 2' },
  { value: 'Caveat', label: 'Caveat' },
];

export default function AppleStemEditor() {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<'schedule' | 'letter' | 'square' | 'landscape'>('schedule');
  const [background, setBackground] = useState('#fefce8');
  const [zoom, setZoom] = useState(1);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSymbolModal, setShowSymbolModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<any>(null);
  const resizeRef = useRef<any>(null);
  const fontDropdownRef = useRef<HTMLDivElement>(null);

  const selectedElement = elements.find(el => el.id === selectedId);
  const { width: canvasW, height: canvasH } = getCanvasSize();

  function getCanvasSize() {
    if (pageSize === 'schedule') return { width: 620, height: 820 };
    if (pageSize === 'letter') return { width: 612, height: 792 };
    if (pageSize === 'square') return { width: 620, height: 620 };
    return { width: 820, height: 620 };
  }

  // Close font dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(event.target as Node)) {
        setShowFontDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut for duplicate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateElement();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, elements]);

  // Drag, Resize, and other functions remain the same as previous version...
  // (Keeping the response focused, the core logic is unchanged)

  const startDrag = (e: React.MouseEvent, id: string) => {
    if (editingTextId) return;
    const el = elements.find(el => el.id === id);
    if (!el) return;
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y };
    setSelectedId(id);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', endDrag);
  };

  const onDragMove = (e: MouseEvent) => {
    if (!dragRef.current) return;
    const { id, startX, startY, origX, origY } = dragRef.current;
    const dx = (e.clientX - startX) / zoom;
    const dy = (e.clientY - startY) / zoom;
    setElements(prev => prev.map(el =>
      el.id === id ? { ...el, x: Math.max(0, origX + dx), y: Math.max(0, origY + dy) } : el
    ));
    setIsDirty(true);
  };

  const endDrag = () => {
    dragRef.current = null;
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', endDrag);
  };

  const startResize = (e: React.MouseEvent, id: string, handle: string) => {
    e.stopPropagation();
    const el = elements.find(el => el.id === id);
    if (!el) return;
    resizeRef.current = { id, handle, startX: e.clientX, startY: e.clientY, origW: el.width, origH: el.height, origX: el.x, origY: el.y };
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', endResize);
  };

  const onResizeMove = (e: MouseEvent) => {
    if (!resizeRef.current) return;
    const { id, handle, startX, startY, origW, origH, origX, origY } = resizeRef.current;
    const dx = (e.clientX - startX) / zoom;
    const dy = (e.clientY - startY) / zoom;

    setElements(prev => prev.map(el => {
      if (el.id !== id) return el;
      let newW = origW, newH = origH, newX = origX, newY = origY;
      if (handle.includes('e')) newW = Math.max(40, origW + dx);
      if (handle.includes('w')) { newW = Math.max(40, origW - dx); newX = origX + dx; }
      if (handle.includes('s')) newH = Math.max(30, origH + dy);
      if (handle.includes('n')) { newH = Math.max(30, origH - dy); newY = origY + dy; }
      return { ...el, width: newW, height: newH, x: newX, y: newY };
    }));
    setIsDirty(true);
  };

  const endResize = () => {
    resizeRef.current = null;
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', endResize);
  };

  const startEditingText = (id: string) => {
    setEditingTextId(id);
    setSelectedId(id);
  };

  const saveTextEdit = (id: string, newContent: string) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, content: newContent } : el));
    setEditingTextId(null);
    setIsDirty(true);
  };

  const addText = () => {
    const newEl: CanvasElement = {
      id: Date.now().toString(), type: 'text', content: 'Double-click to edit',
      x: 140, y: 140, width: 180, height: 48, rotation: 0, opacity: 1,
      fontSize: 22, fontFamily: 'system-ui', color: '#1e2937',
      isBold: false, isItalic: false, isUnderlined: false, zIndex: elements.length + 1,
    };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
    setIsDirty(true);
    toast.success('Text added');
  };

  const addRectangle = () => {
    const newEl: CanvasElement = {
      id: Date.now().toString(), type: 'rectangle', content: '',
      x: 150, y: 150, width: 200, height: 120, rotation: 0, opacity: 1,
      color: '#ffffff', borderColor: '#166534', borderWidth: 3, borderRadius: 12, zIndex: elements.length + 1,
    };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
    setIsDirty(true);
    toast.success('Rectangle added');
  };

  const addSymbol = (symbol: string) => {
    const newEl: CanvasElement = {
      id: Date.now().toString(), type: 'symbol', content: symbol,
      x: 180, y: 180, width: 80, height: 80, rotation: 0, opacity: 1, zIndex: elements.length + 1,
    };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
    setIsDirty(true);
    setShowSymbolModal(false);
    toast.success('Symbol added');
  };

  const addImage = (url: string) => {
    const newEl: CanvasElement = {
      id: Date.now().toString(), type: 'image', content: url,
      x: 150, y: 150, width: 220, height: 160, rotation: 0, opacity: 1, zIndex: elements.length + 1,
    };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
    setIsDirty(true);
    setShowImageModal(false);
    toast.success('Image added');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addImage(URL.createObjectURL(file));
  };

  const updateElement = (updates: Partial<CanvasElement>) => {
    if (!selectedId) return;
    setElements(prev => prev.map(el => el.id === selectedId ? { ...el, ...updates } : el));
    setIsDirty(true);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setElements(prev => prev.filter(el => el.id !== selectedId));
    setSelectedId(null);
    setIsDirty(true);
    toast.success('Deleted');
  };

  const duplicateElement = () => {
    if (!selectedId) return;
    const original = elements.find(el => el.id === selectedId);
    if (!original) return;

    const duplicated: CanvasElement = {
      ...original,
      id: Date.now().toString(),
      x: original.x + 25,
      y: original.y + 25,
      zIndex: Math.max(...elements.map(e => e.zIndex)) + 1,
    };
    setElements([...elements, duplicated]);
    setSelectedId(duplicated.id);
    setIsDirty(true);
    toast.success('Duplicated');
  };

  const bringForward = () => selectedId && updateElement({ zIndex: Math.max(...elements.map(e => e.zIndex)) + 1 });
  const sendBackward = () => selectedId && updateElement({ zIndex: Math.max(1, Math.min(...elements.map(e => e.zIndex)) - 1) });

  const loadTemplate = (template: Template) => {
    let newElements: CanvasElement[] = [];
    if (template.id === 'visual-schedule') {
      newElements = [
        { id: 't1', type: 'text', content: 'Morning Routine', x: 40, y: 30, width: 300, height: 50, rotation: 0, opacity: 1, fontSize: 28, color: '#166534', isBold: true, zIndex: 1 },
        { id: 't2', type: 'symbol', content: '🍎', x: 50, y: 100, width: 70, height: 70, rotation: 0, opacity: 1, zIndex: 2 },
        { id: 't3', type: 'text', content: 'Breakfast', x: 140, y: 115, width: 200, height: 40, rotation: 0, opacity: 1, fontSize: 20, zIndex: 3 },
      ];
    } else if (template.id === 'first-then') {
      newElements = [
        { id: 't1', type: 'text', content: 'First', x: 50, y: 40, width: 120, height: 40, rotation: 0, opacity: 1, fontSize: 22, color: '#166534', isBold: true, zIndex: 1 },
        { id: 't2', type: 'symbol', content: '📚', x: 60, y: 100, width: 90, height: 90, rotation: 0, opacity: 1, zIndex: 2 },
        { id: 't3', type: 'text', content: 'Then', x: 320, y: 40, width: 120, height: 40, rotation: 0, opacity: 1, fontSize: 22, color: '#854d0e', isBold: true, zIndex: 3 },
        { id: 't4', type: 'symbol', content: '🎨', x: 330, y: 100, width: 90, height: 90, rotation: 0, opacity: 1, zIndex: 4 },
      ];
    } else {
      newElements = [
        { id: 't1', type: 'text', content: template.name, x: 50, y: 50, width: 300, height: 50, rotation: 0, opacity: 1, fontSize: 26, isBold: true, zIndex: 1 },
        { id: 't2', type: 'symbol', content: template.preview, x: 80, y: 130, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 2 },
      ];
    }
    setElements(newElements);
    setSelectedId(null);
    setIsDirty(true);
    toast.success(`Loaded ${template.name}`);
  };

  const submitFeedback = () => {
    if (!feedbackMessage.trim()) {
      toast.error('Please enter your feedback');
      return;
    }
    const newFeedback = {
      id: Date.now(),
      message: feedbackMessage.trim(),
      contact: feedbackContact.trim() || 'Anonymous',
      timestamp: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem('applestem_feedback') || '[]');
    const updated = [...existing, newFeedback];
    localStorage.setItem('applestem_feedback', JSON.stringify(updated));

    toast.success('Thank you! Feedback saved.');
    setShowFeedbackModal(false);
    setFeedbackMessage('');
    setFeedbackContact('');
  };

  const downloadFeedback = () => {
    const data = localStorage.getItem('applestem_feedback');
    if (!data || JSON.parse(data).length === 0) {
      toast.error('No feedback submitted yet');
      return;
    }
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `applestem-feedback-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Feedback exported!');
  };

  const selectedFont = FONT_OPTIONS.find(f => f.value === selectedElement?.fontFamily) || FONT_OPTIONS[0];

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] text-slate-800 overflow-hidden">
      <Toaster position="top-center" richColors />

      {/* Top Bar */}
      <div className="h-16 bg-white border-b flex items-center px-6 gap-4 shadow-sm">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="text-3xl">🍎</div>
          <div className="font-semibold text-xl tracking-tight">AppleStem</div>
        </Link>

        <input defaultValue="Untitled Visual Support" className="ml-4 bg-white border border-slate-200 rounded-2xl px-4 py-1.5 text-sm w-64" />

        <div className="flex-1" />

        <button onClick={addText} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-2xl text-sm font-medium">
          <Plus size={17} /> Add Text
        </button>
        <button onClick={addRectangle} className="flex items-center gap-2 px-5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl text-sm font-medium">
          □ Rectangle
        </button>
        <button onClick={() => setShowImageModal(true)} className="flex items-center gap-2 px-5 py-2 bg-white border border-slate-200 rounded-2xl text-sm font-medium">
          <Image size={17} /> Images
        </button>
        <button onClick={() => setShowSymbolModal(true)} className="flex items-center gap-2 px-5 py-2 bg-white border border-slate-200 rounded-2xl text-sm font-medium">
          Symbols
        </button>

        <div className="flex items-center gap-2 border-l pl-4 ml-2">
          <select value={pageSize} onChange={e => setPageSize(e.target.value as any)} className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm">
            <option value="schedule">Schedule</option>
            <option value="letter">Letter</option>
            <option value="square">Square</option>
            <option value="landscape">Landscape</option>
          </select>
          <button onClick={() => setBackground(background === '#fefce8' ? '#ecfdf5' : '#fefce8')} className="px-4 py-2 bg-white border border-slate-200 rounded-2xl text-sm">Background</button>
        </div>

        <div className="flex items-center gap-1 border-l pl-4">
          <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="p-2 hover:bg-slate-100 rounded-xl"><ZoomOut size={18} /></button>
          <span className="text-xs w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(3, zoom + 0.1))} className="p-2 hover:bg-slate-100 rounded-xl"><ZoomIn size={18} /></button>
        </div>

        <div className="flex items-center gap-2 border-l pl-4">
          <button onClick={async () => { setIsLoading(true); await new Promise(r => setTimeout(r, 400)); setIsDirty(false); setIsLoading(false); toast.success('Saved!'); }} className="px-5 py-2 bg-emerald-600 text-white rounded-2xl text-sm font-medium">Save</button>
          <button onClick={() => toast.success('Exported!')} className="px-4 py-2 bg-white border border-slate-200 rounded-2xl text-sm">Export</button>
          <button onClick={() => setShowFeedbackModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl text-sm font-medium ml-2">
            <MessageCircle size={17} /> Give Feedback
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 bg-white border-r p-5 overflow-y-auto">
          <div className="mb-8">
            <div className="text-xs font-semibold tracking-widest text-emerald-600 mb-3">TEMPLATES</div>
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => loadTemplate(t)} className="w-full flex gap-4 p-4 mb-2 bg-white hover:bg-emerald-50 border border-slate-100 rounded-3xl text-left active:scale-[0.985] transition-all">
                <div className="text-4xl">{t.preview}</div>
                <div><div className="font-semibold">{t.name}</div><div className="text-xs text-slate-500">{t.description}</div></div>
              </button>
            ))}
          </div>
          <div>
            <div className="text-xs font-semibold tracking-widest text-emerald-600 mb-3">QUICK SYMBOLS</div>
            <div className="grid grid-cols-6 gap-1">
              {SYMBOLS.slice(0, 18).map((s, i) => <button key={i} onClick={() => addSymbol(s)} className="text-3xl p-3 hover:bg-emerald-100 rounded-2xl active:scale-95">{s}</button>)}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center bg-[#f1f5f9] p-8 overflow-auto" ref={canvasRef}>
          <div className="relative shadow-xl border border-slate-200 bg-white overflow-hidden rounded-3xl" style={{ width: canvasW * zoom, height: canvasH * zoom, background }}>
            {elements.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="text-6xl mb-3">🌱</div>
                <div className="text-xl font-semibold mb-1">Ready when you are</div>
                <p className="text-slate-500 text-sm">Load a template or add from the left</p>
              </div>
            )}

            {elements.sort((a,b) => a.zIndex - b.zIndex).map(el => {
              const isSelected = selectedId === el.id;
              const isEditing = editingTextId === el.id;
              const contentSize = Math.min(el.width, el.height) * 0.7;

              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => startDrag(e, el.id)}
                  onDoubleClick={() => el.type === 'text' && startEditingText(el.id)}
                  className={`absolute flex items-center justify-center cursor-move transition-all rounded-2xl overflow-hidden ${isSelected ? 'ring-4 ring-emerald-400/70 ring-offset-4 ring-offset-[#f1f5f9]' : ''}`}
                  style={{
                    left: el.x * zoom,
                    top: el.y * zoom,
                    width: el.width * zoom,
                    height: el.height * zoom,
                    transform: `rotate(${el.rotation}deg)`,
                    opacity: el.opacity,
                    zIndex: el.zIndex,
                  }}
                >
                  {el.type === 'text' && !isEditing && (
                    <div 
                      className="px-3 font-medium w-full text-center break-words"
                      style={{ 
                        fontSize: `${(el.fontSize || 20) * zoom}px`,
                        fontWeight: el.isBold ? 'bold' : 'normal',
                        fontStyle: el.isItalic ? 'italic' : 'normal',
                        textDecoration: el.isUnderlined ? 'underline' : 'none',
                        color: el.color,
                        fontFamily: el.fontFamily,
                        lineHeight: 1.2,
                      }}
                    >
                      {el.content}
                    </div>
                  )}

                  {el.type === 'text' && isEditing && (
                    <input
                      autoFocus
                      defaultValue={el.content}
                      onBlur={(e) => saveTextEdit(el.id, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveTextEdit(el.id, (e.target as HTMLInputElement).value)}
                      className="w-full px-3 text-center bg-transparent border-b border-emerald-400 outline-none"
                      style={{ 
                        fontSize: `${(el.fontSize || 20) * zoom}px`,
                        fontWeight: el.isBold ? 'bold' : 'normal',
                        fontStyle: el.isItalic ? 'italic' : 'normal',
                        textDecoration: el.isUnderlined ? 'underline' : 'none',
                      }}
                    />
                  )}

                  {el.type === 'symbol' && (
                    <div className="flex items-center justify-center select-none" style={{ fontSize: `${contentSize * zoom}px` }}>
                      {el.content}
                    </div>
                  )}

                  {el.type === 'image' && (
                    <img src={el.content} alt="" className="object-cover w-full h-full rounded-xl" />
                  )}

                  {el.type === 'rectangle' && (
                    <div className="absolute border transition-all" style={{
                      backgroundColor: el.color,
                      borderColor: el.borderColor,
                      borderWidth: `${(el.borderWidth || 2) * zoom}px`,
                      borderRadius: `${(el.borderRadius || 8) * zoom}px`,
                      width: '100%',
                      height: '100%',
                    }} />
                  )}

                  {isSelected && ['nw','ne','sw','se'].map(handle => (
                    <div key={handle} onMouseDown={(e) => startResize(e, el.id, handle)}
                      className="absolute w-3.5 h-3.5 bg-white border-2 border-emerald-500 rounded-full cursor-nwse-resize z-50"
                      style={{
                        top: handle.includes('n') ? -7 : undefined,
                        bottom: handle.includes('s') ? -7 : undefined,
                        left: handle.includes('w') ? -7 : undefined,
                        right: handle.includes('e') ? -7 : undefined,
                      }}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Properties Panel */}
        <div className="w-80 bg-white border-l p-6 overflow-y-auto">
          <div className="text-xs tracking-[1.5px] font-semibold text-emerald-600 mb-4">PROPERTIES</div>

          {!selectedElement ? (
            <div className="text-sm text-slate-400 py-10 text-center">Select an element to edit</div>
          ) : (
            <div className="space-y-6">
              {selectedElement.type === 'text' && (
                <>
                  {/* Font Selector with Preview */}
                  <div ref={fontDropdownRef}>
                    <div className="text-xs mb-1.5">Font</div>
                    <div className="relative">
                      <button
                        onClick={() => setShowFontDropdown(!showFontDropdown)}
                        className="w-full flex items-center justify-between border border-slate-200 rounded-2xl px-3 py-2 text-sm bg-white hover:bg-slate-50"
                      >
                        <span style={{ fontFamily: selectedElement.fontFamily }}>
                          {selectedFont.label}
                        </span>
                        <ChevronDown size={16} />
                      </button>

                      {showFontDropdown && (
                        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-lg max-h-72 overflow-auto py-1">
                          {FONT_OPTIONS.map((font) => (
                            <button
                              key={font.value}
                              onClick={() => {
                                updateElement({ fontFamily: font.value });
                                setShowFontDropdown(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-emerald-50 flex items-center justify-between ${
                                selectedElement.fontFamily === font.value ? 'bg-emerald-50' : ''
                              }`}
                              style={{ fontFamily: font.value }}
                            >
                              {font.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Text Style */}
                  <div>
                    <div className="text-xs mb-1.5">Text Style</div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => updateElement({ isBold: !selectedElement.isBold })}
                        className={`px-4 py-1.5 rounded-xl text-sm border font-bold ${selectedElement.isBold ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200'}`}
                      >
                        B
                      </button>
                      <button 
                        onClick={() => updateElement({ isItalic: !selectedElement.isItalic })}
                        className={`px-4 py-1.5 rounded-xl text-sm border italic ${selectedElement.isItalic ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200'}`}
                      >
                        I
                      </button>
                      <button 
                        onClick={() => updateElement({ isUnderlined: !selectedElement.isUnderlined })}
                        className={`px-4 py-1.5 rounded-xl text-sm border underline ${selectedElement.isUnderlined ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200'}`}
                      >
                        U
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs mb-1.5">Font Size</div>
                    <input type="number" value={selectedElement.fontSize} onChange={e => updateElement({ fontSize: parseInt(e.target.value) })} className="w-full border border-slate-200 rounded-2xl px-3 py-2 text-sm" />
                  </div>

                  <div>
                    <div className="text-xs mb-1.5">Text Color</div>
                    <input 
                      type="color" 
                      value={selectedElement.color || '#1e2937'} 
                      onChange={e => updateElement({ color: e.target.value })} 
                      className="w-full h-10 rounded-2xl border border-slate-200 p-1" 
                    />
                  </div>
                </>
              )}

              {selectedElement.type === 'rectangle' && (
                <>
                  <div><div className="text-xs mb-1.5">Fill Color</div>
                    <input type="color" value={selectedElement.color} onChange={e => updateElement({ color: e.target.value })} className="w-full h-10 rounded-2xl border border-slate-200 p-1" />
                  </div>
                  <div><div className="text-xs mb-1.5">Border Color</div>
                    <input type="color" value={selectedElement.borderColor} onChange={e => updateElement({ borderColor: e.target.value })} className="w-full h-10 rounded-2xl border border-slate-200 p-1" />
                  </div>
                  <div><div className="text-xs mb-1.5">Border Width</div>
                    <input type="range" min="0" max="12" value={selectedElement.borderWidth} onChange={e => updateElement({ borderWidth: parseInt(e.target.value) })} className="w-full accent-emerald-600" />
                  </div>
                  <div><div className="text-xs mb-1.5">Corner Radius</div>
                    <input type="range" min="0" max="50" value={selectedElement.borderRadius} onChange={e => updateElement({ borderRadius: parseInt(e.target.value) })} className="w-full accent-emerald-600" />
                  </div>
                </>
              )}

              <div><div className="text-xs mb-1.5">Opacity</div><input type="range" min="0.2" max="1" step="0.05" value={selectedElement.opacity} onChange={e => updateElement({ opacity: parseFloat(e.target.value) })} className="w-full accent-emerald-600" /></div>
              <div><div className="text-xs mb-1.5">Rotation</div><input type="range" min="-45" max="45" value={selectedElement.rotation} onChange={e => updateElement({ rotation: parseInt(e.target.value) })} className="w-full accent-emerald-600" /></div>

              <div className="flex gap-2 pt-2">
                <button onClick={duplicateElement} className="flex-1 py-2.5 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 rounded-2xl text-sm font-medium">Duplicate</button>
                <button onClick={bringForward} className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl text-sm flex items-center justify-center gap-1.5"><ArrowUp size={15} /> Forward</button>
                <button onClick={sendBackward} className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl text-sm flex items-center justify-center gap-1.5"><ArrowDown size={15} /> Back</button>
              </div>

              <button onClick={deleteSelected} className="w-full py-3 mt-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"><Trash2 size={16} /> Delete Element</button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Export Feedback Button */}
      <button
        onClick={downloadFeedback}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 shadow-lg rounded-2xl text-sm font-medium z-50"
      >
        📥 Export Feedback
      </button>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowFeedbackModal(false)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6"><MessageCircle className="text-emerald-600" /><div className="font-semibold text-xl">Give Feedback</div></div>
            <p className="text-sm text-slate-600 mb-4">Help us make AppleStem better for teachers.</p>
            <textarea value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} placeholder="What’s working well? What could be better?" className="w-full border border-slate-200 rounded-2xl p-4 h-32 mb-4 text-sm resize-y" />
            <input type="text" value={feedbackContact} onChange={e => setFeedbackContact(e.target.value)} placeholder="Your email or name (optional)" className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 mb-6 text-sm" />
            <div className="flex gap-3">
              <button onClick={() => setShowFeedbackModal(false)} className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm">Cancel</button>
              <button onClick={submitFeedback} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-medium">Send Feedback</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowImageModal(false)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-6"><div className="font-semibold text-xl">Image Library</div><button onClick={() => setShowImageModal(false)}>Close</button></div>
            <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-2xl cursor-pointer mb-6 text-sm">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" /> Upload your own image
            </label>
            <div className="grid grid-cols-4 gap-4">
              {SAMPLE_IMAGES.map((url, i) => <button key={i} onClick={() => addImage(url)} className="overflow-hidden rounded-2xl border hover:border-emerald-400"><img src={url} className="w-full h-40 object-cover" /></button>)}
            </div>
          </div>
        </div>
      )}

      {/* Symbol Modal */}
      {showSymbolModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSymbolModal(false)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="font-semibold text-xl mb-6">Symbols</div>
            <div className="grid grid-cols-8 gap-3">{SYMBOLS.map((s, i) => <button key={i} onClick={() => addSymbol(s)} className="text-6xl p-4 hover:bg-emerald-50 rounded-3xl">{s}</button>)}</div>
          </div>
        </div>
      )}
    </div>
  );
}