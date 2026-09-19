import React, { useState, useRef } from 'react'
import { UploadCloud, File, X } from 'lucide-react'
import { formatFileSize } from '../../lib/utils'

export interface FileDropZoneProps {
  file: File | null
  onFileSelect: (file: File | null) => void
  disabled?: boolean
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  file,
  onFileSelect,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (disabled) return
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (disabled) return
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0])
    }
  }

  if (file) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-6)',
          background: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(28, 25, 23, 0.12)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(124, 58, 237, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7c3aed',
            }}
          >
            <File size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: '#1c1917' }}>
              {file.name}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: '#78716c' }}>
              {formatFileSize(file.size)} • Ready for client-side chunking
            </div>
          </div>
        </div>

        {!disabled && (
          <button
            type="button"
            onClick={() => onFileSelect(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.4rem',
              borderRadius: 'var(--radius-sm)',
              color: '#78716c',
              background: 'rgba(28, 25, 23, 0.05)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-error)'
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#78716c'
              e.currentTarget.style.background = 'rgba(28, 25, 23, 0.05)'
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      style={{
        padding: 'var(--space-8) var(--space-6)',
        borderRadius: 'var(--radius-lg)',
        background: isDragOver ? 'rgba(124, 58, 237, 0.06)' : 'rgba(255, 255, 255, 0.7)',
        border: isDragOver
          ? '2px dashed #7c3aed'
          : '2px dashed rgba(28, 25, 23, 0.15)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-3)',
        transition: 'all var(--transition-normal)',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={disabled}
      />
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'rgba(124, 58, 237, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#7c3aed',
        }}
      >
        <UploadCloud size={28} />
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: '#1c1917', marginBottom: '0.25rem' }}>
          Drag & drop AI model weights here, or <span style={{ color: '#7c3aed' }}>browse</span>
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: '#78716c' }}>
          Supports .safetensors, .bin, .gguf, .onnx, or any model file format
        </div>
      </div>
    </div>
  )
}
