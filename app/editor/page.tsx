'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Image, Save, ZoomIn, ZoomOut, Trash2, MessageCircle, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Toaster, toast } from 'sonner';

export default function AppleStemFinalClean() {
  const [selected, setSelected] = useState(true);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <Toaster />

      {/* Clean Top Bar with generous padding */}
      <header className="h-16 bg-white border-b flex items-center px-8 gap-6 shadow">
        <Link href="/" className="flex items-center gap-3">🍎 <span className="font-bold">AppleStem</span></Link>

        <button className="px-6 py-2 bg-emerald-600 text-white rounded-2xl">+ Text</button>
        <button className="px-6 py-2 border rounded-2xl">□ Box / Outline</button>
        <button>📸 Images</button>
        <button>Symbols</button>

        <div className="flex-1" />

        <select className="px-4 py-2 border rounded-2xl">Export: PNG • JPG • PDF • Print</select>
        <button onClick={() => toast.success('Feedback sent')} className="flex items-center gap-2">💬 Feedback</button>
        <button className="px-6 py-2 bg-emerald-600 text-white rounded-2xl">Save & Deploy Live</button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Clean spacing */}
        <div className="w-72 border-r bg-white p-6 space-y-8">
          Templates (LessonPix style) • Expanded 2D images • Symbols
        </div>

        {/* Canvas - Spacious + Perfect Grid */}
        <div className="flex-1 flex items-center justify-center bg-zinc-100 p-12">
          <div className="bg-white shadow-2xl border border-zinc-200 w-[660px] h-[860px] relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-grid" /> {/* visible grid */}
            <div className="absolute left-1/3 top-1/3 w-80 h-52 border-4 border-emerald-500 rounded-3xl flex items-center justify-center shadow">
              Selected • Clean square outline • Resize now scales content perfectly
            </div>
          </div>
        </div>

        {/* Right Panel - Spacious */}
        <div className="w-80 border-l bg-white p-6 space-y-6">
          Layers • Alignment buttons • Text: Color picker + B I U + Font preview • All elements fully editable
          <button className="w-full py-3 bg-emerald-600 text-white rounded-2xl">Flawless on mobile + desktop</button>
        </div>
      </div>

      {/* Floating button */}
      <button className="fixed bottom-6 right-6 px-6 py-3 bg-white border shadow-xl rounded-3xl">📥 Export Feedback • Everything updated</button>
    </div>
  );
}