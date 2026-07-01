'use client';

import { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';

interface CanvasItem {
  id: number;
  type: 'text' | 'photo';
  content?: string;
  src?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
}

interface FeedbackEntry {
  id: number;
  timestamp: string;
  message: string;
  itemId?: number;
  itemType?: string;
}

interface MyPhoto {
  id: number;
  src: string;
}

interface Toast {
  message: string;
  type: 'success' | 'info' | 'error';
}

export default function Editor() {
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [past, setPast] = useState<CanvasItem[][]>([]);
  const [future, setFuture] = useState<CanvasItem[][]>([]);

  const [feedbackMode, setFeedbackMode] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);

  const [myPhotos, setMyPhotos] = useState<MyPhoto[]>([]);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const gridSize = 20;

  const [resizingId, setResizingId] = useState<number | null>(null);
  const [resizeStart, setResizeStart] = useState<{ mouseX: number; mouseY: number; width: number; height: number } | null>(null);

  const [toast, setToast] = useState<Toast | null>(null);

  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [canvasBgColor, setCanvasBgColor] = useState('#ffffff');
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 650 });

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  };

  const saveToHistory = (newItems: CanvasItem[]) => {
    setPast(prev => [...prev, items]);
    setFuture([]);
    setItems(newItems);
  };

  const undo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setFuture(prev => [...prev, items]);
    setPast(prev => prev.slice(0, -1));
    setItems(previous);
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[future.length - 1];
    setPast(prev => [...prev, items]);
    setFuture(prev => prev.slice(0, -1));
    setItems(next);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        deleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [past, future, items, selectedId]);

  const addText = (initialContent = 'Double-click to edit', size = 22) => {
    const newItem: CanvasItem = {
      id: Date.now(),
      type: 'text',
      content: initialContent,
      x: 260,
      y: 200,
      fontSize: size,
      color: '#0f172a',
      fontFamily: 'system-ui',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
    };
    const newItems = [...items, newItem];
    saveToHistory(newItems);
    setSelectedId(newItem.id);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const newItem: CanvasItem = {
        id: Date.now(),
        type: 'photo',
        src,
        x: 300,
        y: 180,
        width: 260,
        height: 200,
      };
      const newItems = [...items, newItem];
      saveToHistory(newItems);
      setSelectedId(newItem.id);
      setMyPhotos(prev => [...prev, { id: Date.now(), src }]);
      showToast('Photo added to My Photos', 'success');
    };
    reader.readAsDataURL(file);
  };

  const addFromMyPhotos = (photo: MyPhoto) => {
    const newItem: CanvasItem = {
      id: Date.now(),
      type: 'photo',
      src: photo.src,
      x: 320,
      y: 190,
      width: 240,
      height: 180,
    };
    const newItems = [...items, newItem];
    saveToHistory(newItems);
    setSelectedId(newItem.id);
  };

  const stockPhotos = [
    { label: 'Classroom', url: 'https://picsum.photos/id/1018/300/200' },
    { label: 'Reading Time', url: 'https://picsum.photos/id/1005/300/200' },
    { label: 'Visual Timer', url: 'https://picsum.photos/id/160/300/200' },
    { label: 'Group Activity', url: 'https://picsum.photos/id/201/300/200' },
    { label: 'Morning Routine', url: 'https://picsum.photos/id/29/300/200' },
    { label: 'Choice Making', url: 'https://picsum.photos/id/1080/300/200' },
    { label: 'Calm Corner', url: 'https://picsum.photos/id/251/300/200' },
    { label: 'Work Station', url: 'https://picsum.photos/id/180/300/200' },
    { label: 'Circle Time', url: 'https://picsum.photos/id/133/300/200' },
    { label: 'Emotion Check', url: 'https://picsum.photos/id/1009/300/200' },
    { label: 'Transition', url: 'https://picsum.photos/id/312/300/200' },
    { label: 'Sensory Play', url: 'https://picsum.photos/id/292/300/200' },
  ];

  const addStockPhoto = (url: string, label: string) => {
    const newItem: CanvasItem = {
      id: Date.now(),
      type: 'photo',
      src: url,
      x: 280,
      y: 170,
      width: 260,
      height: 200,
    };
    const newItems = [...items, newItem];
    saveToHistory(newItems);
    setSelectedId(newItem.id);
    setShowImageLibrary(false);
    showToast(`Added ${label}`, 'success');
  };

  const loadTemplate = (name: string) => {
    const baseX = 180;
    let newItems: CanvasItem[] = [];

    if (name === 'Visual Schedule') {
      newItems = [
        { id: Date.now(), type: 'text', content: "Today's Schedule", x: baseX, y: 85, fontSize: 26, color: '#0f766e', fontWeight: 'bold' },
        { id: Date.now() + 1, type: 'text', content: '☀️  Morning Work', x: baseX, y: 140, fontSize: 20 },
        { id: Date.now() + 2, type: 'text', content: '🍎  Snack & Play', x: baseX, y: 180, fontSize: 20 },
        { id: Date.now() + 3, type: 'text', content: '📚  Reading Circle', x: baseX, y: 220, fontSize: 20 },
        { id: Date.now() + 4, type: 'text', content: '🍽️  Lunch', x: baseX, y: 260, fontSize: 20 },
        { id: Date.now() + 5, type: 'text', content: '🎨  Art & Centers', x: baseX, y: 300, fontSize: 20 },
      ];
    } else if (name === 'First-Then Board') {
      newItems = [
        { id: Date.now(), type: 'text', content: 'FIRST', x: baseX, y: 105, fontSize: 24, color: '#0f766e', fontWeight: 'bold' },
        { id: Date.now() + 1, type: 'text', content: 'Work Task', x: baseX, y: 150, fontSize: 20 },
        { id: Date.now() + 2, type: 'text', content: 'THEN', x: baseX + 220, y: 105, fontSize: 24, color: '#0f766e', fontWeight: 'bold' },
        { id: Date.now() + 3, type: 'text', content: 'Free Choice', x: baseX + 220, y: 150, fontSize: 20 },
        { id: Date.now() + 4, type: 'text', content: '➡️', x: baseX + 170, y: 125, fontSize: 32 },
      ];
    } else if (name === 'Picture Card') {
      newItems = [
        { id: Date.now(), type: 'text', content: 'My Calm Down Card', x: baseX, y: 95, fontSize: 22, color: '#0f766e', fontWeight: 'bold' },
        { id: Date.now() + 1, type: 'text', content: 'Take 3 deep breaths', x: baseX, y: 145, fontSize: 18 },
        { id: Date.now() + 2, type: 'text', content: 'Squeeze a stress ball', x: baseX, y: 180, fontSize: 18 },
        { id: Date.now() + 3, type: 'text', content: 'Ask for help', x: baseX, y: 215, fontSize: 18 },
      ];
    } else if (name === 'Choice Board') {
      newItems = [
        { id: Date.now(), type: 'text', content: 'Choose One', x: baseX + 80, y: 90, fontSize: 22, color: '#0f766e', fontWeight: 'bold' },
        { id: Date.now() + 1, type: 'text', content: '🧩 Puzzle', x: baseX, y: 145, fontSize: 18 },
        { id: Date.now() + 2, type: 'text', content: '🎨 Art', x: baseX + 180, y: 145, fontSize: 18 },
        { id: Date.now() + 3, type: 'text', content: '📖 Books', x: baseX, y: 200, fontSize: 18 },
        { id: Date.now() + 4, type: 'text', content: '🧸 Play', x: baseX + 180, y: 200, fontSize: 18 },
      ];
    } else if (name === 'Communication Board') {
      newItems = [
        { id: Date.now(), type: 'text', content: 'I want...', x: baseX + 100, y: 90, fontSize: 20, color: '#0f766e', fontWeight: 'bold' },
        { id: Date.now() + 1, type: 'text', content: '🍎 Food', x: baseX, y: 140, fontSize: 17 },
        { id: Date.now() + 2, type: 'text', content: '🚽 Bathroom', x: baseX + 160, y: 140, fontSize: 17 },
        { id: Date.now() + 3, type: 'text', content: '💧 Drink', x: baseX, y: 185, fontSize: 17 },
        { id: Date.now() + 4, type: 'text', content: '🛑 Break', x: baseX + 160, y: 185, fontSize: 17 },
        { id: Date.now() + 5, type: 'text', content: '❤️ Help', x: baseX + 80, y: 235, fontSize: 17 },
      ];
    } else if (name === 'Social Story') {
      newItems = [
        { id: Date.now(), type: 'text', content: 'When I feel upset...', x: baseX, y: 90, fontSize: 20, color: '#0f766e', fontWeight: 'bold' },
        { id: Date.now() + 1, type: 'text', content: '1. Stop and breathe', x: baseX, y: 140, fontSize: 17 },
        { id: Date.now() + 2, type: 'text', content: '2. Find a quiet spot', x: baseX, y: 175, fontSize: 17 },
        { id: Date.now() + 3, type: 'text', content: '3. Ask a teacher for help', x: baseX, y: 210, fontSize: 17 },
        { id: Date.now() + 4, type: 'text', content: '4. I can feel better', x: baseX, y: 250, fontSize: 17 },
      ];
    }

    const updated = [...items, ...newItems];
    saveToHistory(updated);
    showToast(`${name} loaded`, 'success');
  };

  const handleMouseDown = (e: React.MouseEvent, id: number) => {
    if (feedbackMode) {
      setSelectedId(id);
      return;
    }
    const item = items.find(i => i.id === id);
    if (!item) return;
    setDraggingId(id);
    setSelectedId(id);
    setOffset({ x: e.clientX - item.x, y: e.clientY - item.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (resizingId !== null && resizeStart) {
      const deltaX = e.clientX - resizeStart.mouseX;
      const deltaY = e.clientY - resizeStart.mouseY;
      const newWidth = Math.max(50, resizeStart.width + deltaX);
      const newHeight = Math.max(50, resizeStart.height + deltaY);
      setItems(items.map(item =>
        item.id === resizingId ? { ...item, width: newWidth, height: newHeight } : item
      ));
      return;
    }
    if (draggingId === null) return;
    setItems(items.map(item =>
      item.id === draggingId ? { ...item, x: e.clientX - offset.x, y: e.clientY - offset.y } : item
    ));
  };

  const handleMouseUp = () => {
    let shouldSave = false;
    let finalItems = items;

    if (resizingId !== null) {
      shouldSave = true;
      setResizingId(null);
      setResizeStart(null);
    }
    if (draggingId !== null) {
      shouldSave = true;
      if (snapToGrid) {
        finalItems = items.map(item => {
          if (item.id === draggingId) {
            return {
              ...item,
              x: Math.round(item.x / gridSize) * gridSize,
              y: Math.round(item.y / gridSize) * gridSize,
            };
          }
          return item;
        });
        setItems(finalItems);
      }
      setDraggingId(null);
    }
    if (shouldSave) saveToHistory(finalItems);
  };

  const startResize = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const item = items.find(i => i.id === id);
    if (!item || !item.width || !item.height) return;
    setResizingId(id);
    setResizeStart({ mouseX: e.clientX, mouseY: e.clientY, width: item.width, height: item.height });
    setSelectedId(id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    const newItems = items.filter(i => i.id !== selectedId);
    saveToHistory(newItems);
    setSelectedId(null);
  };

  const updateSelected = (key: string, value: any) => {
    if (!selectedId) return;
    const newItems = items.map(item =>
      item.id === selectedId ? { ...item, [key]: value } : item
    );
    setItems(newItems);
  };

  const toggleBold = () => {
    if (!selectedId) return;
    const item = items.find(i => i.id === selectedId);
    if (!item || item.type !== 'text') return;
    updateSelected('fontWeight', item.fontWeight === 'bold' ? 'normal' : 'bold');
  };

  const toggleItalic = () => {
    if (!selectedId) return;
    const item = items.find(i => i.id === selectedId);
    if (!item || item.type !== 'text') return;
    updateSelected('fontStyle', item.fontStyle === 'italic' ? 'normal' : 'italic');
  };

  const setTextAlign = (align: 'left' | 'center' | 'right') => {
    if (!selectedId) return;
    updateSelected('textAlign', align);
  };

  const submitFeedback = () => {
    if (!feedbackMessage.trim()) {
      showToast('Please type a feedback message', 'error');
      return;
    }
    const item = selectedId ? items.find(i => i.id === selectedId) : null;
    const entry: FeedbackEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      message: feedbackMessage.trim(),
      itemId: selectedId || undefined,
      itemType: item?.type,
    };
    setFeedbackList(prev => [...prev, entry]);
    setFeedbackMessage('');
    showToast('✅ Feedback logged! Export from sidebar.', 'success');
  };

  const exportFeedback = () => {
    if (feedbackList.length === 0) {
      showToast('No feedback to export yet.', 'info');
      return;
    }
    const content = feedbackList
      .map(f => {
        let line = `[${f.timestamp}] ${f.message}`;
        if (f.itemType) line += ` | Item: ${f.itemType}${f.itemId ? ` (ID: ${f.itemId})` : ''}`;
        return line;
      })
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applestem-feedback-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Feedback file downloaded', 'success');
  };

  const exportCanvas = async (format: 'png' | 'jpg') => {
    const canvasEl = document.getElementById('canvas');
    if (!canvasEl) return;
    const canvasImage = await html2canvas(canvasEl as HTMLElement, { scale: 2 });
    const link = document.createElement('a');
    link.download = `applestem-visual.${format}`;
    link.href = canvasImage.toDataURL(`image/${format}`);
    link.click();
    showToast(`Exported as ${format.toUpperCase()}`, 'success');
  };

  const saveWork = () => {
    localStorage.setItem('applestem_work', JSON.stringify(items));
    showToast('✅ Work saved to browser', 'success');
  };

  const loadWork = () => {
    const saved = localStorage.getItem('applestem_work');
    if (!saved) {
      showToast('No saved work found', 'info');
      return;
    }
    setItems(JSON.parse(saved));
    showToast('Work loaded', 'success');
  };

  const changePageSize = (preset: string) => {
    let newSize = { width: 900, height: 650 };
    if (preset === 'letter') newSize = { width: 816, height: 1056 };
    if (preset === 'square') newSize = { width: 700, height: 700 };
    if (preset === 'landscape') newSize = { width: 1100, height: 620 };
    setCanvasSize(newSize);
    showToast(`Page size: ${preset}`, 'success');
  };

  const selectedItem = items.find(i => i.id === selectedId);

  return (
    <div className="flex h-screen bg-slate-100" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      
      {/* Sidebar */}
      <div className="w-72 bg-white border-r flex flex-col shadow-sm">
        
        {/* Header */}
        <div className="p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-700 rounded-2xl flex items-center justify-center text-white text-3xl shadow-sm">🍎</div>
            <div className="text-3xl font-bold text-teal-800 tracking-tighter">AppleStem</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-5 space-y-2.5 border-b">
          <button onClick={() => addText()} className="w-full py-3.5 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2">
            + Add Text
          </button>
          <label className="w-full py-3.5 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 cursor-pointer">
            📸 Upload Photo
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
          <button onClick={() => setShowImageLibrary(true)} className="w-full py-3 bg-white hover:bg-teal-50 border border-teal-300 text-teal-700 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2">
            🖼️ Browse Image Library
          </button>
        </div>

        {/* Page Size & Background */}
        <div className="px-5 pt-4 border-b">
          <div className="text-xs font-bold tracking-[1.5px] text-slate-600 mb-2">PAGE SIZE</div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {['schedule', 'letter', 'square', 'landscape'].map(p => (
              <button key={p} onClick={() => changePageSize(p)} className="text-xs px-3.5 py-1.5 bg-white hover:bg-teal-50 border border-slate-300 text-slate-700 rounded-xl active:bg-teal-100">
                {p}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-bold tracking-[1.5px] text-slate-600 block mb-1.5">Background Color</label>
            <div className="flex items-center gap-3 border border-slate-300 rounded-2xl px-3 py-2">
              <input type="color" value={canvasBgColor} onChange={(e) => setCanvasBgColor(e.target.value)} className="w-9 h-9 border border-slate-300 rounded-xl p-0.5" />
              <span className="text-sm text-slate-600">Choose background</span>
            </div>
          </div>
        </div>

        {/* Symbols */}
        <div className="px-5 pt-4 border-b">
          <div className="text-xs font-bold tracking-[1.5px] text-slate-600 mb-2">SYMBOLS</div>
          <div className="grid grid-cols-6 gap-1 pb-3">
            {['🍎','📚','⏰','🚌','❤️','🛑','👍','😊','✏️','📅','🏫','🎨','🧩','🚽','💧','🧸','👋','🌟'].map((emoji, idx) => (
              <button key={idx} onClick={() => addText(emoji, 48)} className="text-3xl py-1 hover:bg-teal-50 active:bg-teal-100 rounded-xl border border-slate-100" title={emoji}>
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Templates */}
        <div className="px-5 pt-3 flex-1 overflow-y-auto">
          <div className="text-xs font-bold tracking-[1.5px] text-slate-600 mb-2">TEMPLATES (6)</div>
          <div className="space-y-0.5 text-[14px] text-slate-900">
            {['Visual Schedule', 'First-Then Board', 'Picture Card', 'Choice Board', 'Communication Board', 'Social Story'].map((t, i) => (
              <button key={i} onClick={() => loadTemplate(t)} className="block w-full text-left py-2 px-3 hover:bg-teal-50 active:bg-teal-100 rounded-xl font-medium">
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* My Photos */}
        {myPhotos.length > 0 && (
          <div className="px-5 py-3 border-t">
            <div className="text-xs font-bold tracking-[1.5px] text-slate-600 mb-2">MY PHOTOS ({myPhotos.length})</div>
            <div className="grid grid-cols-3 gap-2 max-h-24 overflow-auto">
              {myPhotos.map((photo, idx) => (
                <img key={idx} src={photo.src} onClick={() => addFromMyPhotos(photo)} className="w-full h-12 object-cover rounded-lg border border-slate-200 cursor-pointer hover:ring-2 hover:ring-teal-400" alt="My upload" />
              ))}
            </div>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="mt-auto p-5 space-y-2 border-t bg-white">
          <div className="flex gap-2">
            <button onClick={undo} className="flex-1 py-2 text-sm border border-slate-300 hover:bg-slate-50 active:bg-slate-100 rounded-2xl">Undo</button>
            <button onClick={redo} className="flex-1 py-2 text-sm border border-slate-300 hover:bg-slate-50 active:bg-slate-100 rounded-2xl">Redo</button>
          </div>

          <button onClick={saveWork} className="w-full py-2 text-sm border border-slate-300 hover:bg-slate-50 active:bg-slate-100 rounded-2xl">Save Work</button>
          <button onClick={loadWork} className="w-full py-2 text-sm border border-slate-300 hover:bg-slate-50 active:bg-slate-100 rounded-2xl">Load Work</button>

          <button onClick={() => setFeedbackMode(!feedbackMode)} className={`w-full py-2.5 text-sm rounded-2xl font-medium transition-colors ${feedbackMode ? 'bg-amber-500 text-white' : 'bg-teal-100 text-teal-700 hover:bg-teal-200'}`}>
            {feedbackMode ? 'Exit Feedback Mode' : '💬 Give Feedback'}
          </button>

          {feedbackList.length > 0 && (
            <button onClick={exportFeedback} className="w-full py-2.5 text-sm bg-teal-600 text-white rounded-2xl active:bg-teal-700">
              Export Feedback ({feedbackList.length})
            </button>
          )}

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-600">Snap to Grid</span>
            <button onClick={() => setSnapToGrid(!snapToGrid)} className={`px-3 py-0.5 rounded-full text-xs font-medium ${snapToGrid ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {snapToGrid ? 'ON' : 'OFF'}
            </button>
          </div>

          <button onClick={() => exportCanvas('png')} className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-2xl text-sm font-semibold mt-1">Export as PNG</button>
          <button onClick={() => exportCanvas('jpg')} className="w-full py-2.5 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 rounded-2xl text-sm">Export as JPG</button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-200 overflow-auto">
        <div 
          id="canvas" 
          className="bg-white shadow-2xl relative border border-slate-300 rounded-3xl overflow-hidden"
          style={{ 
            width: canvasSize.width, 
            height: canvasSize.height,
            backgroundColor: canvasBgColor,
            backgroundImage: snapToGrid ? 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)' : 'none',
            backgroundSize: `${gridSize}px ${gridSize}px`
          }}
        >
          {items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-lg">
              Use sidebar tools or load a template
            </div>
          )}

          {items.map((item) => (
            <div
              key={item.id}
              className={`absolute border shadow-sm select-none p-3 ${selectedId === item.id ? 'border-teal-600 ring-2 ring-teal-200 z-10' : 'border-slate-200'}`}
              style={{
                left: item.x,
                top: item.y,
                fontSize: item.fontSize || 20,
                color: item.color || '#0f172a',
                fontFamily: item.fontFamily || 'system-ui',
                fontWeight: item.fontWeight || 'normal',
                fontStyle: item.fontStyle || 'normal',
                textAlign: item.textAlign || 'left',
                width: item.width || 'auto',
                height: item.height || 'auto',
                minWidth: item.type === 'text' ? 120 : undefined,
                wordBreak: 'break-word',
              }}
              onMouseDown={(e) => handleMouseDown(e, item.id)}
              onClick={() => setSelectedId(item.id)}
              onDoubleClick={() => {
                if (!feedbackMode && item.type === 'text') {
                  const newText = prompt('Edit text:', item.content);
                  if (newText !== null) updateSelected('content', newText);
                }
              }}
            >
              {item.type === 'photo' ? (
                <img src={item.src} className="rounded object-cover w-full h-full" alt="Uploaded" />
              ) : (
                item.content
              )}

              {selectedId === item.id && (
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 bg-teal-600 rounded-tl cursor-se-resize z-20 border border-white"
                  onMouseDown={(e) => startResize(e, item.id)}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-72 bg-white border-l p-6 shadow-sm flex flex-col">
        <h2 className="font-semibold text-xl tracking-tight mb-5 text-slate-900">Properties</h2>

        {selectedItem && selectedItem.type === 'text' && !feedbackMode && (
          <div className="mb-4 p-2 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap gap-1">
            <button onClick={toggleBold} className={`px-3 py-1 text-sm rounded-xl font-bold ${selectedItem.fontWeight === 'bold' ? 'bg-teal-700 text-white' : 'hover:bg-slate-200'}`}>B</button>
            <button onClick={toggleItalic} className={`px-3 py-1 text-sm rounded-xl italic ${selectedItem.fontStyle === 'italic' ? 'bg-teal-700 text-white' : 'hover:bg-slate-200'}`}>I</button>
            <button onClick={() => setTextAlign('left')} className="px-2 py-1 text-sm hover:bg-slate-200 rounded-xl">L</button>
            <button onClick={() => setTextAlign('center')} className="px-2 py-1 text-sm hover:bg-slate-200 rounded-xl">C</button>
            <button onClick={() => setTextAlign('right')} className="px-2 py-1 text-sm hover:bg-slate-200 rounded-xl">R</button>
          </div>
        )}

        {feedbackMode ? (
          <div className="space-y-4">
            <div className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-2xl text-sm font-medium text-center">Feedback Mode Active</div>
            <textarea value={feedbackMessage} onChange={(e) => setFeedbackMessage(e.target.value)} placeholder="Describe the issue or suggestion..." className="w-full h-32 border border-slate-300 rounded-2xl p-4 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-amber-400" />
            <button onClick={submitFeedback} className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-2xl font-semibold text-sm">Log Feedback</button>
            <p className="text-xs text-slate-500 text-center">Select an item first (optional).</p>
          </div>
        ) : selectedItem ? (
          <div className="space-y-5 flex-1">
            {selectedItem.type === 'text' && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Text</label>
                  <input type="text" value={selectedItem.content || ''} onChange={(e) => updateSelected('content', e.target.value)} className="w-full border border-slate-300 rounded-2xl px-4 py-2.5 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Font Size</label>
                    <input type="number" value={selectedItem.fontSize || 22} onChange={(e) => updateSelected('fontSize', parseInt(e.target.value))} className="w-full border border-slate-300 rounded-2xl px-4 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Color</label>
                    <input type="color" value={selectedItem.color || '#0f172a'} onChange={(e) => updateSelected('color', e.target.value)} className="w-full h-11 border border-slate-300 rounded-2xl p-1" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Font</label>
                  <select value={selectedItem.fontFamily || 'system-ui'} onChange={(e) => updateSelected('fontFamily', e.target.value)} className="w-full border border-slate-300 rounded-2xl px-4 py-2.5 text-sm">
                    <option value="system-ui">System Sans</option>
                    <option value="Inter, system-ui">Inter</option>
                    <option value="Poppins, system-ui">Poppins</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="'Comic Sans MS', cursive">Comic Sans</option>
                    <option value="Arial, sans-serif">Arial</option>
                  </select>
                </div>
              </>
            )}

            {selectedItem.type === 'photo' && (
              <div className="space-y-3">
                <div className="text-sm text-slate-600">Drag bottom-right corner to resize, or use manual controls.</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Width</label>
                    <input type="number" value={selectedItem.width || 260} onChange={(e) => updateSelected('width', parseInt(e.target.value))} className="w-full border border-slate-300 rounded-2xl px-4 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Height</label>
                    <input type="number" value={selectedItem.height || 200} onChange={(e) => updateSelected('height', parseInt(e.target.value))} className="w-full border border-slate-300 rounded-2xl px-4 py-2.5 text-sm" />
                  </div>
                </div>
              </div>
            )}

            <button onClick={deleteSelected} className="w-full py-3 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-2xl font-semibold text-sm mt-2">
              Delete Selected
            </button>
          </div>
        ) : (
          <div className="text-sm text-slate-700 leading-relaxed flex-1">
            Select any item on the canvas to edit its size, font, color, or delete it.<br /><br />
            Use the floating toolbar for text formatting (bold, italic, align).<br />
            Drag items freely. Use templates for fast professional results.
          </div>
        )}
      </div>

      {/* Image Library Modal */}
      {showImageLibrary && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowImageLibrary(false)}>
          <div className="bg-white rounded-3xl w-[720px] max-h-[80vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-slate-900">Image Library — Teacher Visuals</h3>
              <button onClick={() => setShowImageLibrary(false)} className="text-2xl leading-none text-slate-400 hover:text-slate-600">×</button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {stockPhotos.map((sp, idx) => (
                <button key={idx} onClick={() => addStockPhoto(sp.url, sp.label)} className="text-left p-3 border border-slate-200 rounded-2xl hover:border-teal-400 active:bg-teal-50">
                  <div className="text-sm font-medium mb-1 text-slate-900">{sp.label}</div>
                  <div className="text-xs text-slate-500">Click to add to canvas</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-4 text-center">In production: Connect to real open-source education clipart libraries.</p>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-xl text-sm font-medium z-50 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}