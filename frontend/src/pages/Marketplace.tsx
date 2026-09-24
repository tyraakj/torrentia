import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { SwarmHeroCard } from '../components/marketplace/SwarmHeroCard'
import { WaferModelCard } from '../components/marketplace/WaferModelCard'
import { Skeleton } from '../components/ui/Skeleton'
import { useModels } from '../hooks/use-models'
import { Search, PlusCircle, RefreshCw, AlertCircle, Layers, X } from 'lucide-react'

const CATEGORIES = ['All', 'Vision', 'NLP', 'Audio', 'LoRA'] as const
type Category = (typeof CATEGORIES)[number]

export const Marketplace: React.FC = () => {
  const navigate = useNavigate()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchValue, setSearchValue] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category>('All')

  // Keyboard shortcut listener: press '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 300ms debounce for search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchValue])

  const {
    data: models,
    isLoading: modelsLoading,
    isError,
    error,
    refetch,
  } = useModels(debouncedSearch, selectedCategory)

  return (
    <div
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '2.5rem 2rem 4rem',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Utility Bar with Search Pill */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: '#ffffff',
            border: '1px solid rgba(28, 25, 23, 0.12)',
            borderRadius: '9999px',
            padding: '0.35rem 0.85rem',
            boxShadow: '0 2px 10px rgba(28, 25, 23, 0.04)',
            width: '260px',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease, width 0.2s ease',
          }}
        >
          <Search size={15} color="#8c857e" style={{ marginRight: '0.45rem', flexShrink: 0 }} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search models..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#181615',
              fontSize: '0.8125rem',
              width: '100%',
            }}
          />
          {searchValue ? (
            <button
              onClick={() => setSearchValue('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8c857e',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={13} />
            </button>
          ) : (
            <div
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-mono)',
                color: '#8c857e',
                background: '#f5f6f8',
                border: '1px solid rgba(28, 25, 23, 0.06)',
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
                userSelect: 'none',
              }}
            >
              /
            </div>
          )}
        </div>
      </div>

      {/* Hero Header Typography */}
      <section style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.3rem 0.85rem',
            borderRadius: '9999px',
            background: 'rgba(0, 98, 255, 0.08)',
            border: '1px solid rgba(0, 98, 255, 0.18)',
            color: '#0062FF',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.85rem',
          }}
        >
          Community AI Catalog
        </div>
        <h1
          style={{
            fontFamily: "'Apfel Grotezk', 'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(2.2rem, 4vw, 3rem)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            color: '#181615',
            margin: '0 auto 0.85rem auto',
            maxWidth: '780px',
          }}
        >
          Discover &amp; download AI models directly
        </h1>

        <p
          style={{
            fontSize: '1.05rem',
            color: '#57534e',
            maxWidth: '620px',
            margin: '0 auto',
            lineHeight: 1.55,
          }}
        >
          Browse open-weight models shared across the community network. Zero cloud bills, instant pay-as-you-download streaming, and 100% verified safe.
        </p>
      </section>

      {/* Swarm Status Hero Card (Wafer "Get Started" Banner) */}
      <SwarmHeroCard
        onStepClick={(stepIndex) => {
          if (stepIndex === 2 && models && models.length > 0) {
            navigate(`/model/${models[0].modelId}`)
          }
        }}
      />

      {/* Category Filter Chips & Publish CTA Toolbar */}
      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1.75rem',
        }}
      >
        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  border: isSelected
                    ? '1px solid #181615'
                    : '1px solid rgba(28, 25, 23, 0.09)',
                  background: isSelected
                    ? '#181615'
                    : '#ffffff',
                  color: isSelected ? '#ffffff' : '#57534e',
                  boxShadow: isSelected ? '0 2px 8px rgba(24, 22, 21, 0.15)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat === 'All' ? 'All Models' : cat}
              </button>
            )
          })}
        </div>

        {/* Publish Model Button */}
        <button
          onClick={() => navigate('/upload')}
          style={{
            background: '#ffffff',
            border: '1px solid rgba(28, 25, 23, 0.12)',
            borderRadius: '9999px',
            padding: '0.4rem 0.95rem',
            color: '#181615',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: '0 2px 6px rgba(28, 25, 23, 0.04)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(28, 25, 23, 0.25)'
            e.currentTarget.style.background = '#fafaf8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(28, 25, 23, 0.12)'
            e.currentTarget.style.background = '#ffffff'
          }}
        >
          <PlusCircle size={14} color="#181615" />
          <span>Publish Model</span>
        </button>
      </section>

      {/* Models List Section */}
      <section>
        {/* Loading Skeletons */}
        {modelsLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  padding: '1.5rem',
                  border: '1px solid rgba(28, 25, 23, 0.08)',
                  boxShadow: '0 4px 16px rgba(28, 25, 23, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <Skeleton width="26px" height="26px" />
                  <Skeleton width="180px" height="22px" />
                </div>
                <Skeleton width="70%" height="16px" />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Skeleton width="80px" height="22px" />
                  <Skeleton width="90px" height="22px" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '0.5rem' }}>
                  <Skeleton width="100%" height="32px" />
                  <Skeleton width="100%" height="32px" />
                  <Skeleton width="100%" height="32px" />
                  <Skeleton width="100%" height="32px" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!modelsLoading && isError && (
          <div
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              borderRadius: '18px',
              background: '#ffffff',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 4px 20px rgba(239, 68, 68, 0.06)',
              maxWidth: '520px',
              margin: '2rem auto',
            }}
          >
            <AlertCircle size={36} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#181615', marginBottom: '0.5rem' }}>
              Failed to load model swarms
            </h3>
            <p style={{ color: '#57534e', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              {error?.message || 'Could not connect to indexer or load model catalog.'}
            </p>
            <button
              onClick={() => refetch()}
              style={{
                background: '#181615',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!modelsLoading && !isError && models && models.length === 0 && (
          <div
            style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              borderRadius: '18px',
              background: '#ffffff',
              border: '1px solid rgba(28, 25, 23, 0.08)',
              boxShadow: '0 6px 24px rgba(28, 25, 23, 0.04)',
              maxWidth: '500px',
              margin: '2rem auto',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: '#f5f6f8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                color: '#181615',
              }}
            >
              <Layers size={24} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#181615', marginBottom: '0.4rem' }}>
              No models found
            </h3>
            <p style={{ color: '#57534e', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              {searchValue || selectedCategory !== 'All'
                ? 'Try adjusting your search query or category filters.'
                : 'Be the first to publish an open-source model to the Torrentia swarm.'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              {(searchValue || selectedCategory !== 'All') && (
                <button
                  onClick={() => {
                    setSearchValue('')
                    setSelectedCategory('All')
                  }}
                  style={{
                    background: '#f5f6f8',
                    border: '1px solid rgba(28, 25, 23, 0.08)',
                    color: '#57534e',
                    borderRadius: '8px',
                    padding: '0.45rem 1rem',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                  }}
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={() => navigate('/upload')}
                style={{
                  background: '#181615',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '8px',
                  padding: '0.45rem 1.15rem',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(24, 22, 21, 0.15)',
                }}
              >
                Publish Model
              </button>
            </div>
          </div>
        )}

        {/* Model Cards Stack */}
        {!modelsLoading && !isError && models && models.length > 0 && (
          <div>
            {models.map((model, idx) => (
              <WaferModelCard
                key={model.modelId}
                model={model}
                defaultExpanded={idx === 0}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
