export type SpriteArchetype =
  | 'SOLO_STAND_1'
  | 'SOLO_STAND_2'
  | 'PAIR_TALKING'
  | 'HUDDLE_GROUP'
  | 'SKIER_POLES'
  | 'WALKER_FORWARD'
  | 'DUO_HUDDLE'
  | 'DISTANCE_SOLO'
  | 'TRIO_GATHER'
  | 'CROUCH_PAUSE'
  | 'WALKER_AWAY'
  | 'LARGE_HUDDLE'
  | 'TRAIL_DUO'
  | 'SUMMIT_WATCH'

export interface NetworkNode {
  id: number
  x: number // normalized 0..1
  y: number // normalized 0..1
  archetype: SpriteArchetype
  scale: number // multiplier (e.g. 0.8 to 1.6)
  depth: number // for parallax (0.5 to 1.2)
  tag?: string // optional micro-tag e.g. '[0x8F]'
}

export interface NetworkLabel {
  text: string
  x: number // normalized 0..1
  y: number // normalized 0..1
  size: number // font size in px at 1440w
}

// Graph nodes positioned to recreate the reference composition
export const NETWORK_NODES: NetworkNode[] = [
  // 0: Far-left anchor
  { id: 0, x: 0.02, y: 0.51, archetype: 'DISTANCE_SOLO', scale: 0.8, depth: 0.6, tag: '00' },

  // Top-left ridgeline (1-7)
  { id: 1, x: 0.045, y: 0.16, archetype: 'DISTANCE_SOLO', scale: 0.75, depth: 0.6 },
  { id: 2, x: 0.06, y: 0.20, archetype: 'SKIER_POLES', scale: 0.85, depth: 0.7 },
  { id: 3, x: 0.075, y: 0.22, archetype: 'DISTANCE_SOLO', scale: 0.7, depth: 0.5 },
  { id: 4, x: 0.12, y: 0.09, archetype: 'SOLO_STAND_1', scale: 0.9, depth: 0.8 },
  { id: 5, x: 0.15, y: 0.12, archetype: 'DISTANCE_SOLO', scale: 0.75, depth: 0.6 },
  { id: 6, x: 0.21, y: 0.05, archetype: 'SUMMIT_WATCH', scale: 0.95, depth: 0.9 },
  { id: 7, x: 0.21, y: 0.19, archetype: 'SOLO_STAND_2', scale: 0.9, depth: 0.8 },

  // Left basin mid-tier (8-13)
  { id: 8, x: 0.125, y: 0.28, archetype: 'WALKER_FORWARD', scale: 0.9, depth: 0.8 },
  { id: 9, x: 0.16, y: 0.36, archetype: 'DUO_HUDDLE', scale: 1.0, depth: 0.9 },
  { id: 10, x: 0.195, y: 0.35, archetype: 'SKIER_POLES', scale: 0.95, depth: 0.85 },
  { id: 11, x: 0.16, y: 0.46, archetype: 'SOLO_STAND_1', scale: 0.85, depth: 0.75 },
  { id: 12, x: 0.24, y: 0.32, archetype: 'DISTANCE_SOLO', scale: 0.8, depth: 0.7 },
  { id: 13, x: 0.28, y: 0.21, archetype: 'SOLO_STAND_2', scale: 0.85, depth: 0.8 },

  // Left Basin: The Large Focal Huddle and surrounding satellites (14-22)
  { id: 14, x: 0.115, y: 0.57, archetype: 'LARGE_HUDDLE', scale: 1.6, depth: 1.2, tag: '[SWARM_01]' },
  { id: 15, x: 0.075, y: 0.51, archetype: 'SOLO_STAND_2', scale: 0.95, depth: 0.85 },
  { id: 16, x: 0.11, y: 0.45, archetype: 'WALKER_AWAY', scale: 0.9, depth: 0.8 },
  { id: 17, x: 0.125, y: 0.43, archetype: 'DISTANCE_SOLO', scale: 0.8, depth: 0.7 },
  { id: 18, x: 0.10, y: 0.65, archetype: 'CROUCH_PAUSE', scale: 0.95, depth: 0.9 },
  { id: 19, x: 0.21, y: 0.56, archetype: 'TRIO_GATHER', scale: 1.1, depth: 1.0 },
  { id: 20, x: 0.23, y: 0.53, archetype: 'SKIER_POLES', scale: 0.9, depth: 0.85 },
  { id: 21, x: 0.24, y: 0.62, archetype: 'WALKER_FORWARD', scale: 0.95, depth: 0.9 },
  { id: 22, x: 0.24, y: 0.71, archetype: 'SOLO_STAND_1', scale: 0.95, depth: 0.9 },

  // Central Spanning Bridge (23-31)
  { id: 23, x: 0.315, y: 0.22, archetype: 'DISTANCE_SOLO', scale: 0.8, depth: 0.7 },
  { id: 24, x: 0.325, y: 0.17, archetype: 'DISTANCE_SOLO', scale: 0.75, depth: 0.65 },
  { id: 25, x: 0.355, y: 0.11, archetype: 'SUMMIT_WATCH', scale: 0.9, depth: 0.85 },
  { id: 26, x: 0.39, y: 0.24, archetype: 'TRIO_GATHER', scale: 1.0, depth: 0.9 },
  { id: 27, x: 0.40, y: 0.37, archetype: 'PAIR_TALKING', scale: 1.4, depth: 1.1, tag: '[PEER_SYNC]' },
  { id: 28, x: 0.32, y: 0.55, archetype: 'WALKER_FORWARD', scale: 0.95, depth: 0.85 },
  { id: 29, x: 0.385, y: 0.54, archetype: 'DISTANCE_SOLO', scale: 0.85, depth: 0.75 },
  { id: 30, x: 0.425, y: 0.27, archetype: 'DISTANCE_SOLO', scale: 0.75, depth: 0.7 },
  { id: 31, x: 0.445, y: 0.28, archetype: 'SOLO_STAND_1', scale: 0.85, depth: 0.8 },

  // Central & Crossing Links (32-38)
  { id: 32, x: 0.478, y: 0.28, archetype: 'SKIER_POLES', scale: 0.85, depth: 0.8 },
  { id: 33, x: 0.51, y: 0.33, archetype: 'DUO_HUDDLE', scale: 1.05, depth: 0.95 },
  { id: 34, x: 0.565, y: 0.33, archetype: 'SOLO_STAND_2', scale: 0.9, depth: 0.85 },
  { id: 35, x: 0.42, y: 0.73, archetype: 'WALKER_FORWARD', scale: 0.95, depth: 0.85 },
  { id: 36, x: 0.44, y: 0.80, archetype: 'HUDDLE_GROUP', scale: 1.1, depth: 1.0 },
  { id: 37, x: 0.465, y: 0.84, archetype: 'SKIER_POLES', scale: 0.95, depth: 0.9 },
  { id: 38, x: 0.485, y: 0.86, archetype: 'DISTANCE_SOLO', scale: 0.8, depth: 0.75 },

  // Right High Ridge & Plateau (39-49)
  { id: 39, x: 0.655, y: 0.33, archetype: 'SOLO_STAND_1', scale: 0.9, depth: 0.85 },
  { id: 40, x: 0.688, y: 0.34, archetype: 'DISTANCE_SOLO', scale: 0.8, depth: 0.75 },
  { id: 41, x: 0.75, y: 0.28, archetype: 'DUO_HUDDLE', scale: 0.9, depth: 0.8 },
  { id: 42, x: 0.765, y: 0.29, archetype: 'DISTANCE_SOLO', scale: 0.75, depth: 0.7 },
  { id: 43, x: 0.80, y: 0.29, archetype: 'TRIO_GATHER', scale: 0.95, depth: 0.85 },
  { id: 44, x: 0.835, y: 0.28, archetype: 'DISTANCE_SOLO', scale: 0.8, depth: 0.75 },
  { id: 45, x: 0.85, y: 0.27, archetype: 'SOLO_STAND_2', scale: 0.85, depth: 0.8 },
  { id: 46, x: 0.87, y: 0.26, archetype: 'SKIER_POLES', scale: 0.85, depth: 0.8 },
  { id: 47, x: 0.91, y: 0.27, archetype: 'DISTANCE_SOLO', scale: 0.8, depth: 0.75 },
  { id: 48, x: 0.71, y: 0.41, archetype: 'WALKER_FORWARD', scale: 1.1, depth: 1.0, tag: '[HUB_07]' },
  { id: 49, x: 0.77, y: 0.38, archetype: 'SOLO_STAND_1', scale: 0.95, depth: 0.9 },

  // Right Web / Fan-out Network (50-59)
  { id: 50, x: 0.82, y: 0.44, archetype: 'SOLO_STAND_2', scale: 0.9, depth: 0.85 },
  { id: 51, x: 0.84, y: 0.37, archetype: 'DISTANCE_SOLO', scale: 0.75, depth: 0.7 },
  { id: 52, x: 0.825, y: 0.64, archetype: 'SUMMIT_WATCH', scale: 1.0, depth: 0.95 },
  { id: 53, x: 0.84, y: 0.67, archetype: 'DISTANCE_SOLO', scale: 0.8, depth: 0.75 },
  { id: 54, x: 0.87, y: 0.70, archetype: 'WALKER_FORWARD', scale: 0.85, depth: 0.8 },
  { id: 55, x: 0.89, y: 0.71, archetype: 'DISTANCE_SOLO', scale: 0.8, depth: 0.75 },
  { id: 56, x: 0.935, y: 0.48, archetype: 'SOLO_STAND_1', scale: 0.85, depth: 0.8 },
  { id: 57, x: 0.97, y: 0.47, archetype: 'DUO_HUDDLE', scale: 0.95, depth: 0.85 },
  { id: 58, x: 0.975, y: 0.56, archetype: 'DISTANCE_SOLO', scale: 0.8, depth: 0.75 },
  { id: 59, x: 0.985, y: 0.65, archetype: 'SOLO_STAND_2', scale: 0.85, depth: 0.8 },

  // Lower Basin & Trails (60-68)
  { id: 60, x: 0.30, y: 0.77, archetype: 'PAIR_TALKING', scale: 0.95, depth: 0.85 },
  { id: 61, x: 0.37, y: 0.84, archetype: 'CROUCH_PAUSE', scale: 0.85, depth: 0.8 },
  { id: 62, x: 0.395, y: 0.91, archetype: 'DISTANCE_SOLO', scale: 0.8, depth: 0.75 },
  { id: 63, x: 0.525, y: 0.89, archetype: 'TRAIL_DUO', scale: 0.95, depth: 0.9 },
  { id: 64, x: 0.575, y: 0.90, archetype: 'HUDDLE_GROUP', scale: 1.15, depth: 1.05 },
  { id: 65, x: 0.678, y: 0.88, archetype: 'SOLO_STAND_1', scale: 0.9, depth: 0.85 },
  { id: 66, x: 0.695, y: 0.81, archetype: 'DISTANCE_SOLO', scale: 0.8, depth: 0.75 },
  { id: 67, x: 0.73, y: 0.95, archetype: 'DISTANCE_SOLO', scale: 0.85, depth: 0.8 },
  { id: 68, x: 0.76, y: 0.91, archetype: 'WALKER_AWAY', scale: 1.05, depth: 0.95 }
]

// Connectivity edges [nodeA, nodeB]
export const NETWORK_EDGES: [number, number][] = [
  // Far-left to ridgeline & cluster
  [0, 1], [0, 14], [0, 15],
  [1, 2], [2, 3], [1, 4], [4, 5], [5, 6], [4, 7], [6, 7],
  [2, 8], [4, 8], [7, 8], [8, 9], [7, 10], [9, 10],
  [8, 11], [9, 11], [10, 12], [6, 13], [7, 13], [12, 13],

  // Left Basin: Huddle connections
  [15, 14], [16, 14], [17, 14], [18, 14],
  [11, 14], [9, 14], [10, 19], [11, 19],
  [14, 19], [19, 20], [19, 21], [21, 22], [14, 22],
  [14, 60], [22, 60],

  // Bridge crossings across center
  [13, 23], [23, 24], [24, 25], [23, 26], [25, 26],
  [26, 27], [10, 27], [19, 27], [19, 28], [27, 28],
  [28, 29], [27, 29], [26, 30], [30, 31], [31, 32],
  [27, 33], [32, 33], [33, 34],

  // Long spanning diagonal chords
  [14, 28], [28, 35], [35, 36], [36, 37], [37, 38],
  [27, 35], [33, 35], [33, 36],
  [27, 48], [34, 48], [34, 39], [33, 48],
  [19, 48], [28, 48], [36, 48],

  // Right High Ridge & Plateau
  [34, 39], [39, 40], [40, 41], [41, 42], [42, 43], [43, 44], [44, 45], [45, 46], [46, 47],
  [39, 48], [40, 48], [48, 49], [41, 49], [49, 50], [43, 50], [44, 51], [50, 51],

  // Right Fan-out Spiders
  [48, 52], [48, 54], [48, 66], [48, 68],
  [49, 52], [50, 52], [52, 53], [53, 54], [54, 55],
  [50, 56], [51, 56], [56, 57], [57, 58], [58, 59], [56, 58],
  [47, 57], [46, 56],

  // Lower Valley Trails
  [60, 61], [61, 62], [36, 61], [37, 63], [62, 63],
  [63, 64], [37, 64], [38, 64], [64, 65],
  [65, 66], [64, 66], [66, 67], [67, 68], [65, 68],
  [52, 68], [54, 68], [55, 68], [59, 68]
]

// The exact graphic labels from the reference artwork
export const NETWORK_LABELS: NetworkLabel[] = [
  { text: '(2) crossing', x: 0.54, y: 0.055, size: 16 },
  { text: '(3) paths', x: 0.79, y: 0.125, size: 16 },
  { text: '(4) in', x: 0.155, y: 0.94, size: 16 }
]
