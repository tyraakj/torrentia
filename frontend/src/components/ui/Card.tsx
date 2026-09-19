import React, { useState } from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean
  glow?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverEffect = false,
  glow = false,
  style,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false)

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.78)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: isHovered && hoverEffect
      ? '1px solid rgba(28, 25, 23, 0.18)'
      : '1px solid rgba(255, 255, 255, 0.9)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: glow
      ? '0 14px 38px rgba(99, 102, 241, 0.15)'
      : isHovered && hoverEffect
      ? '0 20px 40px rgba(28, 25, 23, 0.09)'
      : '0 10px 30px rgba(28, 25, 23, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    transform: isHovered && hoverEffect ? 'translateY(-3px)' : 'none',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    color: 'var(--color-text-primary)',
    ...style,
  }

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  style,
  ...props
}) => (
  <div
    style={{
      padding: 'var(--space-4) var(--space-6)',
      borderBottom: '1px solid rgba(28, 25, 23, 0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
)

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  style,
  ...props
}) => (
  <div
    style={{
      padding: 'var(--space-6)',
      flex: 1,
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
)

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  style,
  ...props
}) => (
  <div
    style={{
      padding: 'var(--space-4) var(--space-6)',
      borderTop: '1px solid rgba(28, 25, 23, 0.06)',
      background: 'rgba(255, 255, 255, 0.45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
)
