'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'
import type { ReactNode } from 'react'

interface DraggableWidgetProps {
  id: string
  title: string
  isEditMode: boolean
  onRemove?: (id: string) => void
  className?: string
  children: ReactNode
}

export function DraggableWidget({
  id,
  title,
  isEditMode,
  onRemove,
  className = '',
  children,
}: DraggableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditMode })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.85 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-card/30 border rounded-lg overflow-hidden flex flex-col ${
        isDragging
          ? 'border-theme-green shadow-2xl shadow-theme-green/20 ring-2 ring-theme-green/50'
          : isEditMode
            ? 'border-theme-green/40 border-dashed'
            : 'border-border'
      } ${className}`}
    >
      {/* Edit mode overlay - drag handle + remove */}
      {isEditMode && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
          {onRemove && (
            <button
              onClick={() => onRemove(id)}
              className="p-1 rounded bg-theme-red/20 hover:bg-theme-red/40 text-theme-red border border-theme-red/40 transition-colors"
              title="Remove widget"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            {...attributes}
            {...listeners}
            className="p-1 rounded bg-theme-green/20 hover:bg-theme-green/40 text-theme-green border border-theme-green/40 transition-colors cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Edit mode label */}
      {isEditMode && (
        <div className="absolute top-2 left-2 z-20 px-1.5 py-0.5 bg-theme-green/20 text-theme-green text-[9px] font-mono font-bold tracking-widest uppercase border border-theme-green/40 rounded">
          {title}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}
