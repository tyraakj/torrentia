import React, { useState, useRef } from 'react'
import { UploadCloud, File, X, AlertTriangle, ShieldCheck } from 'lucide-react'
import { formatFileSize } from '../../lib/utils'

export interface FileDropZoneProps {
  file: File | null
  onFileSelect: (file: File | null) => void
  disabled?: boolean
}

const ALLOWED_EXTENSIONS = ['.gguf', '.safetensors', '.onnx']
const BLOCKED_EXTENSIONS = ['.exe', '.bin', '.py', '.sh', '.bat', '.cmd', '.msi', '.dll']

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  file,
  onFileSelect,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateAndSelect = (selectedFile: File) => {
    setFileError(null)
    const lowerName = selectedFile.name.toLowerCase()

    const isBlocked = BLOCKED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
    if (isBlocked) {
      setFileError(`Executable or raw binary files (${BLOCKED_EXTENSIONS.join(', ')}) are blocked for security. Please provide a standard model format (.gguf, .safetensors, .onnx).`)
      return
    }

    const isAllowed = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
    if (!isAllowed) {
      setFileError(`Unsupported format. Torrentia strictly supports open model weight formats: ${ALLOWED_EXTENSIONS.join(', ')}.`)
      return
    }

    onFileSelect(selectedFile)
  }

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
      validateAndSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelect(e.target.files[0])
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
              {formatFileSize(file.size)} • Ready for client-side piece streaming
            </div>
          </div>
        </div>

        {!disabled && (
          <button
            type="button"
            onClick={() => onFileSelect(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#78716c',
              cursor: 'pointer',
              padding: 'var(--space-1)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#78716c')}
            title="Remove File"
          >
            <X size={18} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled) inputRef.current?.click()
        }}
        style={{
          border: isDragOver
            ? '2px dashed #7c3aed'
            : fileError
            ? '2px dashed #ef4444'
            : '2px dashed rgba(28, 25, 23, 0.16)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-8) var(--space-6)',
          textAlign: 'center',
          background: isDragOver ? 'rgba(124, 58, 237, 0.05)' : 'rgba(255, 255, 255, 0.65)',
          cursor: disabled ? 'not-allowed' : 'pointer',
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
          accept=".gguf,.safetensors,.onnx"
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
            Supports <strong>.gguf</strong>, <strong>.safetensors</strong>, or <strong>.onnx</strong> model weights
          </div>
        </div>
      </div>

      {fileError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#b91c1c',
            fontSize: '0.8125rem',
          }}
        >
          <AlertTriangle size={15} />
          <span>{fileError}</span>
        </div>
      )}

      {/* Non-Confusing Architecture Explanation (Spec 25) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.75rem',
          color: '#57534e',
          background: 'rgba(28, 25, 23, 0.04)',
          padding: '6px 12px',
          borderRadius: '8px',
        }}
      >
        <ShieldCheck size={14} color="#059669" />
        <span>Model weights stay in the peer swarm; only the small model passport (~2 KB) is pinned to IPFS.</span>
      </div>
    </div>
  )
}
