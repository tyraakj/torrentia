import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export const HeroSection: React.FC = () => {
  return (
    <section className="hero-atmosphere-stacked">
      {/* Upper Half: Text & Actions (Searchbar & pills removed) */}
      <div className="hero-upper-content">
        {/* Single Line Headline in Apfel Grotezk */}
        <h1 className="hero-headline">
          Stream weights. Directly.
        </h1>

        {/* Subtitle */}
        <p className="hero-subtitle">
          Distribute multi-gigabyte AI weights browser-to-browser via WebRTC
          — with atomic creator &amp; seeder payment splits on Monad.
        </p>

        {/* Action Buttons using established charcoal primary and pastel pink secondary with mint accent */}
        <div className="hero-cta-group">
          <Link to="/model/llama-3-8b" className="btn-hero-primary">
            <span>Explore Swarm</span>
            <ArrowRight size={15} />
          </Link>
          <Link to="/upload" className="btn-hero-secondary">
            <span className="btn-accent-indicator"></span>
            <span>Upload Model</span>
          </Link>
        </div>
      </div>

      {/* Lower Half: Full Width Image (Un-cut, full natural aspect ratio, no cropping) */}
      <div className="hero-fullwidth-image-wrapper">
        <img
          src="/hero-faces.png"
          alt="Torrentia P2P Swarm Distribution"
          className="hero-fullwidth-img"
        />
      </div>
    </section>
  )
}
