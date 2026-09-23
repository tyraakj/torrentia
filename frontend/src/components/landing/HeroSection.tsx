import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { NetworkHeroCanvas } from './hero/NetworkHeroCanvas'

export const HeroSection: React.FC = () => {
  return (
    <section className="hero-atmosphere-stacked hero-white-theme">
      {/* Upper Content in Pure White: Left-aligned Text, Right-aligned CTAs */}
      <div className="hero-upper-content-wrapper">
        <div className="hero-upper-content-split">
          <div className="hero-text-block">
            <h1 className="hero-headline">
              Kill the server bill. Stream weights directly.
            </h1>
            <p className="hero-subtitle">
              When models get popular, centralized servers throttle, crash, or send crushing egress bills. Torrentia distributes weights directly across a decentralized peer swarm: zero hosting infrastructure, zero server bills, and atomic on-chain splits on Monad.
            </p>
          </div>

          <div className="hero-cta-group">
            <Link to="/marketplace" className="btn-hero-primary">
              <span>Explore Swarm</span>
              <ArrowRight size={15} />
            </Link>
            <Link to="/upload" className="btn-hero-secondary">
              <span>Upload Model</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Lower Half: Interactive Dithered Network Canvas */}
      <NetworkHeroCanvas />
    </section>
  )
}

