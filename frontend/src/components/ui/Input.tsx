import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  id,
  style,
  disabled,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: '#1c1917',
          }}
        >
          {label}
        </label>
      )}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
        }}
      >
        {leftIcon && (
          <div
            style={{
              position: 'absolute',
              left: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              color: '#78716c',
            }}
          >
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          disabled={disabled}
          style={{
            width: '100%',
            padding: leftIcon ? '0.625rem 0.875rem 0.625rem 2.5rem' : '0.625rem 0.875rem',
            paddingRight: rightIcon ? '2.5rem' : '0.875rem',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(10px)',
            border: error
              ? '1px solid var(--color-error)'
              : '1px solid rgba(28, 25, 23, 0.12)',
            borderRadius: 'var(--radius-md)',
            color: '#1c1917',
            fontSize: 'var(--text-sm)',
            outline: 'none',
            transition: 'border-color var(--transition-normal), box-shadow var(--transition-normal)',
            boxShadow: error ? '0 0 0 1px var(--color-error)' : '0 1px 3px rgba(0, 0, 0, 0.02)',
            ...style,
          }}
          onFocus={(e) => {
            if (!error) {
              e.currentTarget.style.borderColor = '#6366f1'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)'
            }
          }}
          onBlur={(e) => {
            if (!error) {
              e.currentTarget.style.borderColor = 'rgba(28, 25, 23, 0.12)'
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.02)'
            }
          }}
          {...props}
        />
        {rightIcon && (
          <div
            style={{
              position: 'absolute',
              right: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              color: '#78716c',
            }}
          >
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', fontWeight: 500 }}>
          {error}
        </span>
      )}
      {!error && helperText && (
        <span style={{ fontSize: 'var(--text-xs)', color: '#78716c' }}>
          {helperText}
        </span>
      )}
    </div>
  )
}
