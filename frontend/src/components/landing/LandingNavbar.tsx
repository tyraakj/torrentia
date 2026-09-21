import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Zap, ArrowUpRight } from 'lucide-react'

export const LandingNavbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header className="landing-navbar-wrapper">
      <nav className={`landing-navbar-pill ${scrolled ? 'navbar-scrolled' : ''}`}>
        {/* Logo / Brand */}
        <Link to="/" className="landing-nav-logo">
          <div className="landing-nav-logo-icon">
            <Zap size={16} color="#ffffff" />
          </div>
          <span className="landing-nav-logo-text">TORRENTIA</span>
        </Link>

        {/* Center Links */}
        <div className="landing-nav-links">
          <a
            href="#comparison"
            className="landing-nav-link"
            onClick={(e) => scrollToSection(e, 'comparison')}
          >
            Comparison
          </a>
          <a
            href="#features"
            className="landing-nav-link"
            onClick={(e) => scrollToSection(e, 'features')}
          >
            Features
          </a>
          <a
            href="#workflow"
            className="landing-nav-link"
            onClick={(e) => scrollToSection(e, 'workflow')}
          >
            How it Works
          </a>
          <a
            href="#faqs"
            className="landing-nav-link"
            onClick={(e) => scrollToSection(e, 'faqs')}
          >
            FAQs
          </a>
        </div>

        {/* Right CTA Actions */}
        <div className="landing-nav-actions">
          <Link
            to="/upload"
            className="landing-nav-link"
            style={{ fontWeight: 600, fontSize: '0.8125rem' }}
          >
            Upload Model
          </Link>
          <Link to="/marketplace" className="btn-nav-primary">
            <span>Launch App</span>
            <ArrowUpRight size={14} style={{ marginLeft: '4px' }} />
          </Link>
        </div>
      </nav>
    </header>
  )
}
