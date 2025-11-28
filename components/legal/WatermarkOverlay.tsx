import { Sparkles } from 'lucide-react';

export default function WatermarkOverlay() {
  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/30 backdrop-blur-md rounded-full border border-white/10 pointer-events-none select-none">
      <Sparkles className="w-3 h-3 text-gold" />
      <span className="text-[10px] font-medium text-white/90 tracking-wide uppercase">
        © FashionistAPP | AI Generated Preview
      </span>
    </div>
  );
}
