import React from 'react'

export interface TorrentiaLogoProps {
  /** Size in pixels or CSS dimension (default: 24) */
  size?: number | string
  /** Fill color for the vector mark (default: #0062FF) */
  color?: string
  /** Optional additional CSS class */
  className?: string
  /** Optional inline CSS styles */
  style?: React.CSSProperties
}

/**
 * Torrentia Official Brand Mark — The Swarm Torrent.
 * Two fluid laminar chutes sweeping from the flanks and cascading
 * down into an accelerated central deluge with 45° jet terminals.
 */
export const TorrentiaLogo: React.FC<TorrentiaLogoProps> = ({
  size = 24,
  color = '#0062FF',
  className = '',
  style = {},
}) => {
  const dimension = typeof size === 'number' ? `${size}px` : size

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={dimension}
      height={dimension}
      fill="none"
      role="img"
      aria-label="Torrentia Logo"
      className={`torrentia-logo-mark ${className}`.trim()}
      style={{
        flexShrink: 0,
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style,
      }}
    >
      {/* Left Chute */}
      <path
        d="M 16 18 H 36 A 12 12 0 0 1 48 30 V 90 L 34 78 V 42 A 8 8 0 0 1 26 34 H 16 Z"
        fill={color}
      />
      {/* Right Chute */}
      <path
        d="M 84 18 H 64 A 12 12 0 0 0 52 30 V 90 L 66 78 V 42 A 8 8 0 0 0 74 34 H 84 Z"
        fill={color}
      />
    </svg>
  )
}

export default TorrentiaLogo
