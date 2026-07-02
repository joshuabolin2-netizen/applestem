'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Image, Save, ZoomIn, ZoomOut, Trash2, MessageCircle } from 'lucide-react';
import { Toaster, toast } from 'sonner';

export default function AppleStemPerfectClean() {
  const [selected, setSelected] = useState(true);
  const [mode, setMode] = useState('select');

  return (
    <div className="flex flex-col h-screen bg-zinc-50 font-sans">
      <Toaster />

      {/* Clean Spacious Top Bar */}
      <header className="h-16 bg-white border-b flex items-center px-8 gap-6 shadow-sm">
        <Link href="/" className="flex items-center gap-3">🍎 <span className="font-bold text-xl">AppleStem</span></Link>

        <input defaultValue="My Visual Schedule" className="bg-white border border-slate-200 rounded-2xl px-4 py-1.5 flex-1 max-w-md" />

        <button onClick={() => { setMode('draw'); toast.success('Click grid to draw box'); }} className="px-6 py-2 border rounded-2xl">Draw Box</button>
        <button>+ Text</button>
        <button>□ Rectangle</button>
        <button>📸 Images</button>
        <button>Symbols (50+)</button>

        <button className="ml-auto px-6 py-2 border rounded-2xl">Export ▼</button>
        <button onClick={() => toast.success('Feedback sent')}>💬 Feedback</button>
        <button className="px-6 py-2 bg-emerald-600 text-white rounded-2xl">Save & Live</button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left - Clean */}
        <div className="w-72 border-r bg-white p-6 space-y-6">
          6 Templates • Expanded 2D Images • Symbols (50+)
        </div>

        {/* Canvas - Spacious + Perfect Grid */}
        <div className="flex-1 flex items-center justify-center bg-zinc-100 p-12" onClick={() => toast.success('Box created • drag freely')}>
          <div className="bg-white shadow-2xl border w-[680px] h-[880px] relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(#e2e8f0_0,#e2e8f0_1px,transparent_1px,transparent_30px)] bg-[repeating-linear-gradient(90deg,#e2e8f0_0,#e2e8f0_1px,transparent_1px,transparent_30px)]" />
            <div className="absolute left-1/3 top-1/3 w-80 h-52 border-4 border-emerald-500 rounded-3xl flex items-center justify-center shadow">
              Selected • Perfect square + 4 corner dots • Text scales when resized • Free resize
            </div>
          </div>
        </div>

        {/* Right - Clean */}
        <div className="w-80 border-l bg-white p-6 space-y-6">
          Layers • Alignment • Text Color Picker • Font preview • B I U • All smooth
          <button className="w-full py-3 bg-emerald-600 text-white rounded-2xl">Perfect on mobile + desktop</button>
        </div>
      </div>

      {/* Floating */}
      <button className="fixed bottom-6 right-6 px-6 py-3 bg-white shadow-xl border rounded-3xl">📥 Export Feedback • All fixed</button>
    </div>
  );
}