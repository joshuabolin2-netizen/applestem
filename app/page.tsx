import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-teal-700 rounded-2xl flex items-center justify-center text-white text-4xl">🍎</div>
          <h1 className="text-5xl font-bold text-teal-800 tracking-tighter">AppleStem</h1>
        </div>
        <p className="text-xl text-slate-600 mb-8">Visual supports for teachers</p>
        <Link 
          href="/editor" 
          className="inline-block bg-teal-700 hover:bg-teal-800 text-white px-10 py-4 rounded-2xl text-lg font-semibold"
        >
          Open Editor
        </Link>
      </div>
    </div>
  );
}
