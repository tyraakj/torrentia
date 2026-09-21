import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

export const SkylineFooter: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <footer className="skyline-footer">
      <div className="footer-container">
        {/* Top 3-Column Section */}
        <div className="footer-grid-row">
          {/* Col 1: Brand & Tagline (No logo icon) */}
          <div className="footer-brand-col">
            <span className="footer-brand-title">Torrentia</span>
            <p className="footer-brand-desc">
              The decentralized P2P AI model distribution network. Weights stream directly browser-to-browser with atomic creator &amp; seeder royalties on Monad.
            </p>
          </div>

          {/* Col 2: PRODUCT (Only routes & sections that exist in codebase) */}
          <div className="footer-nav-col">
            <span className="footer-col-header">PRODUCT</span>
            <ul className="footer-links-list">
              <li>
                <Link to="/marketplace" className="footer-nav-link">Explore Swarm</Link>
              </li>
              <li>
                <Link to="/upload" className="footer-nav-link">Upload Model</Link>
              </li>
              <li>
                <Link to="/dashboard" className="footer-nav-link">Creator Dashboard</Link>
              </li>
              <li>
                <a href="#features" className="footer-nav-link" onClick={(e) => scrollToSection(e, 'features')}>Features</a>
              </li>
              <li>
                <a href="#workflow" className="footer-nav-link" onClick={(e) => scrollToSection(e, 'workflow')}>How It Works</a>
              </li>
              <li>
                <a href="#faqs" className="footer-nav-link" onClick={(e) => scrollToSection(e, 'faqs')}>FAQs</a>
              </li>
            </ul>
          </div>

          {/* Col 3: DEVELOPERS & CODE (Only existing codebase links) */}
          <div className="footer-nav-col">
            <span className="footer-col-header">DEVELOPERS &amp; CODE</span>
            <ul className="footer-links-list">
              <li>
                <a
                  href="https://github.com/tyraakj/torrentia.git"
                  target="_blank"
                  rel="noreferrer"
                  className="footer-nav-link footer-ext-link"
                >
                  <span>GitHub Repository</span>
                  <ArrowUpRight size={13} />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar with Divider */}
        <div className="footer-bottom-bar">
          <div className="footer-copyright">
            &copy; 2026 Torrentia Protocol. MIT Open Source.
          </div>
          <button onClick={scrollToTop} className="footer-back-to-top" title="Scroll to top">
            Back to top &uarr;
          </button>
        </div>
      </div>
    </footer>
  )
}
