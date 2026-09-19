import React from 'react'

export type BadgeVariant = 'active' | 'seeding' | 'downloading' | 'inactive' | 'warning'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'active',
  dot = true,
  style,
  ...props
}) => {
  const getColors = () => {
    switch (variant) {
      case 'active':
        return {
          bg: 'hsla(155, 75%, 55%, 0.12)',
          border: 'hsla(155, 75%, 55%, 0.28)',
          text: 'var(--color-success)',
          dotColor: 'var(--color-success)',
        }
      case 'seeding':
        return {
          bg: 'hsla(265, 90%, 65%, 0.15)',
          border: 'hsla(265, 90%, 65%, 0.35)',
          text: 'var(--color-accent-bright)',
          dotColor: 'var(--color-accent)',
        }
      case 'downloading':
        return {
          bg: 'hsla(200, 85%, 60%, 0.15)',
          border: 'hsla(200, 85%, 60%, 0.35)',
          text: 'var(--color-info)',
          dotColor: 'var(--color-info)',
        }
      case 'warning':
        return {
          bg: 'hsla(40, 90%, 60%, 0.15)',
          border: 'hsla(40, 90%, 60%, 0.35)',
          text: 'var(--color-warning)',
          dotColor: 'var(--color-warning)',
        }
      case 'inactive':
      default:
        return {
          bg: 'hsla(230, 10%, 45%, 0.15)',
          border: 'hsla(230, 10%, 45%, 0.3)',
          text: 'var(--color-text-muted)',
          dotColor: 'var(--color-text-muted)',
        }
    }
  }

  const { bg, border, text, dotColor } = getColors()

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.2rem 0.6rem',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        backgroundColor: bg,
        border: `1px solid ${border}`,
        color: text,
        lineHeight: 1.2,
        userSelect: 'none',
        ...style,
      }}
      {...props}
    >
      {dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: dotColor,
            boxShadow: `0 0 8px ${dotColor}`,
          }}
        />
      )}
      <span>{children}</span>
    </span>
  )
}
