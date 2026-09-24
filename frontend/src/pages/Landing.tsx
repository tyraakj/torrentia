import React from 'react'
import { LandingNavbar } from '../components/landing/LandingNavbar'
import { HeroSection } from '../components/landing/HeroSection'
import { FeaturesSection } from '../components/landing/FeaturesSection'
import { ComparisonSection } from '../components/landing/ComparisonSection'
import { WorkflowAndCalculator } from '../components/landing/WorkflowAndCalculator'
import { FaqSection } from '../components/landing/FaqSection'
import { SkylineFooter } from '../components/landing/SkylineFooter'
import '../styles/landing.css'

export const Landing: React.FC = () => {
  return (
    <div className="torrentia-landing">
      {/* 1. Minimalist Top Navbar */}
      <LandingNavbar />

      {/* 2. Hero Section */}
      <HeroSection />

      {/* 3. Core Capabilities Features Section (Interactive Vertical Tabs & Ice Showcase) */}
      <FeaturesSection />

      {/* 4. "Why AI Creators Choose Torrentia" Comparison Section (2 Editorial Cards) */}
      <ComparisonSection />

      {/* 6. 4-Step Process & Interactive Split / Cloud Bandwidth Calculator */}
      <WorkflowAndCalculator />

      {/* 7. Frequently Asked Questions Accordion */}
      <FaqSection />

      {/* 8. Epic Skyline Footer with Huge Logo Watermark */}
      <SkylineFooter />
    </div>
  )
}

export default Landing
