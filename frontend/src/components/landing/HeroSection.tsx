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
              Zero server bills. Share AI models directly.
            </h1>
            <p className="hero-subtitle">
              When AI models go viral, cloud hosts send massive bandwidth bills or crash. Torrentia shares models directly across a community of connected devices: zero server bills, faster downloads, and automatic earnings every time someone downloads.
            </p>
          </div>

          <div className="hero-cta-group">
            <Link to="/marketplace" className="btn-hero-primary">
              <span>Browse Models</span>
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

