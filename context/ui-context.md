# UI Context — Torrentia

## Design Philosophy
Premium, dark-mode-first marketplace that feels like a next-gen platform.
The UI must make the **split payment visualization** the hero moment — judges should immediately see and understand the atomic on-chain split.

## Color Palette

### Primary
- `--color-bg-primary`: `hsl(230, 25%, 7%)` — deep space black
- `--color-bg-secondary`: `hsl(230, 20%, 11%)` — card/panel bg
- `--color-bg-tertiary`: `hsl(230, 18%, 15%)` — elevated surfaces
- `--color-bg-glass`: `hsla(230, 20%, 15%, 0.6)` — glassmorphism panels

### Accent (Brand)
- `--color-accent`: `hsl(265, 90%, 65%)` — electric violet (primary brand)
- `--color-accent-bright`: `hsl(265, 100%, 75%)` — hover/focus states
- `--color-accent-dim`: `hsl(265, 60%, 45%)` — subtle accents
- `--color-accent-glow`: `hsla(265, 90%, 65%, 0.25)` — glow effects

### Semantic
- `--color-success`: `hsl(155, 75%, 55%)` — seeder active, tx confirmed
- `--color-warning`: `hsl(40, 90%, 60%)` — pending states
- `--color-error`: `hsl(0, 75%, 60%)` — failures
- `--color-info`: `hsl(200, 85%, 60%)` — informational

### Payment Split Visualization (Critical)
- `--color-creator-share`: `hsl(265, 90%, 65%)` — violet (creator earnings)
- `--color-seeder-share`: `hsl(155, 75%, 55%)` — green (seeder earnings)
- These two colors must have high contrast with each other — they're shown side by side in the split bar.

### Text
- `--color-text-primary`: `hsl(0, 0%, 95%)`
- `--color-text-secondary`: `hsl(230, 15%, 65%)`
- `--color-text-muted`: `hsl(230, 10%, 45%)`

## Typography
- **Font Family**: `'Inter', system-ui, -apple-system, sans-serif` (Google Fonts)
- **Headings**: Inter 600–700 weight
- **Body**: Inter 400
- **Mono (hashes, addresses)**: `'JetBrains Mono', 'Fira Code', monospace`

### Scale
- `--text-xs`: 0.75rem
- `--text-sm`: 0.875rem
- `--text-base`: 1rem
- `--text-lg`: 1.125rem
- `--text-xl`: 1.25rem
- `--text-2xl`: 1.5rem
- `--text-3xl`: 1.875rem
- `--text-4xl`: 2.25rem

## Spacing
- `--space-1`: 0.25rem
- `--space-2`: 0.5rem
- `--space-3`: 0.75rem
- `--space-4`: 1rem
- `--space-6`: 1.5rem
- `--space-8`: 2rem
- `--space-12`: 3rem
- `--space-16`: 4rem

## Border Radius
- `--radius-sm`: 6px
- `--radius-md`: 10px
- `--radius-lg`: 16px
- `--radius-xl`: 24px
- `--radius-full`: 9999px

## Effects
- **Glassmorphism**: `backdrop-filter: blur(20px); background: var(--color-bg-glass); border: 1px solid hsla(0, 0%, 100%, 0.08);`
- **Card shadow**: `0 4px 24px hsla(265, 90%, 10%, 0.4)`
- **Glow**: `box-shadow: 0 0 40px var(--color-accent-glow);`
- **Micro-animations**: 200ms ease-out for hovers, 300ms for page transitions
- **Gradient accent**: `linear-gradient(135deg, hsl(265, 90%, 65%), hsl(200, 85%, 60%))`

## Key UI Components

### Split Payment Visualization (HERO component)
- Animated bar showing 80/20 split in real-time
- Creator portion (violet) | Seeder portion (green)
- Shows ETH amounts + addresses (truncated)
- Links to Monadscan transaction
- Pulse animation on new payments

### Model Card
- Glassmorphism card with gradient border on hover
- Model name, creator address, chunk price, seeder count
- Download progress bar when active
- Status badges (active, seeding, downloading)

### Peer Swarm Indicator
- Live count of active seeders
- Animated dots/nodes showing peer connections
- Chunk availability heatmap (which chunks are available)

## Page Structure
1. **Marketplace** (`/`) — grid of model cards, search/filter
2. **Model Detail** (`/model/:id`) — full model card, download button, seeder info, payment history
3. **Upload** (`/upload`) — drag-and-drop upload flow, wallet connection
4. **Dashboard** (`/dashboard`) — creator's uploaded models, earnings summary
