import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatsBar } from '../components/marketplace/StatsBar'
import { ModelCard } from '../components/marketplace/ModelCard'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { useModels, useStats } from '../hooks/use-models'
import { Sparkles, Search, PlusCircle, RefreshCw, AlertCircle, Layers } from 'lucide-react'

const CATEGORIES = ['All', 'Vision', 'NLP', 'Audio', 'LoRA'] as const
type Category = (typeof CATEGORIES)[number]

export const Marketplace: React.FC = () => {
  const navigate = useNavigate()
  const [searchValue, setSearchValue] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category>('All')

  // 300ms debounce for search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchValue])

  const { data: stats, isLoading: statsLoading } = useStats()
  const {
    data: models,
    isLoading: modelsLoading,
    isError,
    error,
    refetch,
  } = useModels(debouncedSearch, selectedCategory)

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: 'var(--space-8) var(--space-6)', width: '100%' }}>
      {/* Hero Header */}
      <section
        style={{
          textAlign: 'center',
          padding: 'var(--space-8) 0 var(--space-6)',
          position: 'relative',
        }}
      >
        {/* Monad settlement badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.95rem',
            borderRadius: 'var(--radius-full)',
            background: 'hsla(265, 90%, 65%, 0.12)',
            border: '1px solid hsla(265, 90%, 65%, 0.3)',
            color: 'var(--color-accent-bright)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            marginBottom: 'var(--space-4)',
          }}
        >
          <Sparkles size={14} />
          <span>Settled atomically on Monad Testnet via x402</span>
        </div>

        {/* Main Tagline */}
        <h1
          style={{
            fontSize: 'clamp(2rem, 5vw, 2.75rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            marginBottom: 'var(--space-4)',
          }}
        >
          Decentralized P2P Model Swarms
          <br />
          <span className="gradient-text">Stream weights peer-to-peer with on-chain incentives.</span>
        </h1>

        <p
          style={{
            fontSize: 'var(--text-lg)',
            color: 'var(--color-text-secondary)',
            maxWidth: '680px',
            margin: '0 auto var(--space-8)',
            lineHeight: 1.5,
          }}
        >
          Distribute multi-gigabyte open-source AI weights directly browser-to-browser. Every chunk transfer atomically splits revenue 70/30 between the serving peer and the original creator on Monad.
        </p>

        {/* Aggregate Stats Bar */}
        <StatsBar stats={stats} isLoading={statsLoading} />
      </section>

      {/* Filter & Search Toolbar */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-8)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
            flexWrap: 'wrap',
          }}
        >
          {/* Category Filter Chips */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease-out',
                    border: isSelected
                      ? '1px solid var(--color-accent)'
                      : '1px solid hsla(230, 20%, 25%, 0.6)',
                    background: isSelected
                      ? 'hsla(265, 90%, 65%, 0.2)'
                      : 'hsla(230, 20%, 12%, 0.5)',
                    color: isSelected
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-secondary)',
                  }}
                >
                  {cat === 'All' ? 'All Models' : cat}
                </button>
              )
            })}
          </div>

          {/* Upload Model Action */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/upload')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <PlusCircle size={15} />
            <span>Publish Model</span>
          </Button>
        </div>

        {/* Search Bar Input */}
        <div style={{ position: 'relative' }}>
          <Input
            placeholder="Search open weights by name, format (ONNX, Safetensors), or creator address..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            leftIcon={<Search size={18} />}
          />
        </div>
      </section>

      {/* Model Grid or Empty / Loading / Error States */}
      <section>
        {/* Loading Skeletons */}
        {modelsLoading && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 'var(--space-6)',
            }}
          >
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="glass-panel"
                style={{
                  height: '320px',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-6)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Skeleton width="80px" height="20px" />
                  <Skeleton width="60px" height="20px" />
                </div>
                <Skeleton width="100%" height="28px" />
                <Skeleton width="60%" height="16px" />
                <div style={{ flex: 1 }} />
                <Skeleton width="100%" height="60px" />
                <Skeleton width="100%" height="20px" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!modelsLoading && isError && (
          <div
            className="glass-panel"
            style={{
              padding: 'var(--space-12)',
              textAlign: 'center',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid hsla(0, 75%, 60%, 0.3)',
              maxWidth: '540px',
              margin: '0 auto',
            }}
          >
            <AlertCircle size={40} color="var(--color-error)" style={{ margin: '0 auto var(--space-4)' }} />
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
              Failed to load models
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
              {error?.message || 'Could not connect to indexer or load model catalog.'}
            </p>
            <Button variant="secondary" onClick={() => refetch()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={15} />
              <span>Retry</span>
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!modelsLoading && !isError && models && models.length === 0 && (
          <div
            className="glass-panel"
            style={{
              padding: 'var(--space-12) var(--space-6)',
              textAlign: 'center',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '520px',
              margin: 'var(--space-8) auto',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-full)',
                background: 'hsla(265, 90%, 65%, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-4)',
                color: 'var(--color-accent-bright)',
              }}
            >
              <Layers size={28} />
            </div>
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
              No models found
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
              {searchValue || selectedCategory !== 'All'
                ? 'Try adjusting your search query or category filters.'
                : 'Be the first to publish an open-source model to the Torrentia swarm.'}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
              {(searchValue || selectedCategory !== 'All') && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchValue('')
                    setSelectedCategory('All')
                  }}
                >
                  Clear Filters
                </Button>
              )}
              <Button variant="primary" onClick={() => navigate('/upload')}>
                Publish Model
              </Button>
            </div>
          </div>
        )}

        {/* Model Grid */}
        {!modelsLoading && !isError && models && models.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 'var(--space-6)',
            }}
          >
            {models.map((model) => (
              <ModelCard key={model.modelId} model={model} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
