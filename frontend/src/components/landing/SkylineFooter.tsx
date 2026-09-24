import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

export const SkylineFooter: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="clean-editorial-footer">
      <div className="clean-footer-inner">
        {/* Brand & Mission Line */}
        <div className="clean-footer-left">
          <span className="clean-footer-logo font-apfel">TORRENTIA</span>
          <span className="clean-footer-tagline">
            Community-powered AI model distribution. Built for Monad.
          </span>
        </div>

        {/* Essential Navigation Links & Top Button */}
        <div className="clean-footer-right">
          <Link to="/marketplace" className="clean-footer-link">
            Browse Models
          </Link>
          <Link to="/upload" className="clean-footer-link">
            Publish
          </Link>
          <a
            href="https://github.com/tyraakj/torrentia.git"
            target="_blank"
            rel="noreferrer"
            className="clean-footer-link ext-link"
          >
            <span>GitHub</span>
            <ArrowUpRight size={13} />
          </a>
          <button onClick={scrollToTop} className="clean-footer-top-btn" title="Back to top">
            Back to top &uarr;
          </button>
        </div>
      </div>

      {/* Subtle Copyright Sub-row */}
      <div className="clean-footer-bottom">
        <span>&copy; {new Date().getFullYear()} Torrentia Protocol &bull; Zero Cloud Server Bills</span>
      </div>
    </footer>
  )
}
