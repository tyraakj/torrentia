import React from 'react'
import { formatEther } from 'viem'

export interface MonAmountProps {
  amountWei?: bigint | string
  amountMon?: number | string
  decimals?: number
  showSymbol?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  style?: React.CSSProperties
}

export const MonAmount: React.FC<MonAmountProps> = ({
  amountWei,
  amountMon,
  decimals = 4,
  showSymbol = true,
  size = 'md',
  style,
}) => {
  let displayValue = '0'

  if (amountWei !== undefined) {
    try {
      const parsedBigInt = typeof amountWei === 'string' ? BigInt(amountWei) : amountWei
      const fullEther = formatEther(parsedBigInt)
      const num = parseFloat(fullEther)
      displayValue = num.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
      })
    } catch {
      displayValue = '0'
    }
  } else if (amountMon !== undefined) {
    const num = typeof amountMon === 'string' ? parseFloat(amountMon) : amountMon
    displayValue = Number.isNaN(num)
      ? '0'
      : num.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: decimals,
        })
  }

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return 'var(--text-xs)'
      case 'lg':
        return 'var(--text-xl)'
      case 'xl':
        return 'var(--text-3xl)'
      case 'md':
      default:
        return 'var(--text-sm)'
    }
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '0.25rem',
        fontFamily: 'var(--font-mono)',
        fontSize: getFontSize(),
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        ...style,
      }}
    >
      <span>{displayValue}</span>
      {showSymbol && (
        <span
          style={{
            fontSize: '0.85em',
            fontWeight: 700,
            color: 'var(--color-accent)',
            letterSpacing: '0.05em',
          }}
        >
          MON
        </span>
      )}
    </span>
  )
}
