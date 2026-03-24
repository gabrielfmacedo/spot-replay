import React from 'react';
import { X, NotebookPen, GripHorizontal } from 'lucide-react';
import { useDraggable } from '../hooks/useDraggable';
import HandNotes from './HandNotes';
import { HandNote } from '../types';

interface Props {
  handKey: string;
  note: HandNote | undefined;
  onChange: (key: string, note: HandNote) => void;
  customTags: string[];
  onCreateTag: (name: string) => void;
  onClose: () => void;
}

const FloatingHandNote: React.FC<Props> = ({
  handKey, note, onChange, customTags, onCreateTag, onClose,
}) => {
  const { pos, handleMouseDown } = useDraggable({
    x: Math.max(20, window.innerWidth - 340),
    y: Math.max(80, window.innerHeight - 320),
  });

  return (
    <div
      className="fixed z-[350] w-72 bg-[#0a0f1a]/98 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between px-3 py-2.5 bg-white/[0.03] border-b border-white/5 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={12} className="text-slate-600" />
          <NotebookPen size={11} className="text-blue-400" />
          <span className="text-[11px] font-black uppercase text-white">Nota da Mão</span>
          {note?.text && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
          )}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors">
          <X size={13} />
        </button>
      </div>

      {/* HandNotes content */}
      <HandNotes
        handKey={handKey}
        note={note}
        onChange={onChange}
        customTags={customTags}
        onCreateTag={onCreateTag}
      />
    </div>
  );
};

export default FloatingHandNote;
