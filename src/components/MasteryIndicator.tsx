import { CheckCircle2, Circle, Clock } from 'lucide-react';
import type { MasteryStatus } from '../shared/contracts';

export function MasteryIndicator({ status }: { status: MasteryStatus }) {
  if (status === 'menguasai') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#059669] whitespace-nowrap shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Menguasai</span>
      </span>
    );
  }

  if (status === 'sedang_belajar') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D97706] whitespace-nowrap shrink-0">
        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Sedang Belajar</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
      <Circle className="w-3.5 h-3.5" aria-hidden="true" />
      <span>Belum Dipelajari</span>
    </span>
  );
}
