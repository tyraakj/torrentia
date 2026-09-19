import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  leftIcon,
  rightIcon,
  style,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          background: '#1c1917',
          color: '#ffffff',
          boxShadow: '0 4px 14px rgba(28, 25, 23, 0.16)',
          border: '1px solid #1c1917',
        }
      case 'secondary':
        return {
          background: 'rgba(255, 255, 255, 0.82)',
          color: '#1c1917',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(28, 25, 23, 0.12)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
        }
      case 'destructive':
        return {
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#dc2626',
          border: '1px solid rgba(239, 68, 68, 0.25)',
        }
      case 'ghost':
        return {
          background: 'transparent',
          color: '#57534e',
          border: '1px solid transparent',
        }
    }
  }

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return {
          padding: '0.375rem 0.85rem',
          fontSize: 'var(--text-xs)',
          borderRadius: '9999px',
          gap: '0.375rem',
        }
      case 'lg':
        return {
          padding: '0.75rem 1.6rem',
          fontSize: 'var(--text-base)',
          borderRadius: '9999px',
          gap: '0.625rem',
        }
      case 'md':
      default:
        return {
          padding: '0.5rem 1.25rem',
          fontSize: 'var(--text-sm)',
          borderRadius: '9999px',
          gap: '0.5rem',
        }
    }
  }

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.6 : 1,
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    userSelect: 'none',
    textDecoration: 'none',
    outline: 'none',
    ...getSizeStyles(),
    ...getVariantStyles(),
    ...style,
  }

  return (
    <button
      disabled={disabled || isLoading}
      style={baseStyles}
      {...props}
    >
      {isLoading ? (
        <span
          style={{
            width: '1em',
            height: '1em',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.7s linear infinite',
          }}
        />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  )
}
