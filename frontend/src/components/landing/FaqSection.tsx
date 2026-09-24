import React, { useState } from 'react'
import { Plus, Minus } from 'lucide-react'

interface FaqItemData {
  q: string
  a: string
}

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs: FaqItemData[] = [
    {
      q: 'How does direct device sharing work?',
      a: 'Instead of hosting AI models on expensive cloud servers, Torrentia enables downloaders to fetch files directly from active community devices nearby. Downloads transfer over secure, encrypted browser connections, cutting bandwidth bills to zero while keeping speeds fast.',
    },
    {
      q: 'Why is Torrentia built on Monad?',
      a: 'Monad delivers 10,000 transactions per second with 1-second block completion and negligible network fees. Because download payments split automatically in real time between the creator and the community members helping share the file, 1-second finality ensures downloads stream continuously without payment lag.',
    },
    {
      q: 'How does pay-as-you-download work?',
      a: 'There are no monthly subscriptions or platform lock-in. You only pay for what you download. Downloaders stream chunks via lightweight off-chain vouchers that settle in batches directly on Monad, eliminating transaction spam while ensuring creators and community seeders receive rapid, verifiable compensation.',
    },
    {
      q: 'Can creators set their own royalty split?',
      a: 'Yes, absolutely. Creators have 100% freedom to set their preferred royalty split (up to 99%). The remainder goes directly to community members who host and share bandwidth. Creators are never forced into an arbitrary 70/30 or fixed platform cut.',
    },
    {
      q: 'How does Torrentia ensure downloaded AI models are safe and authentic?',
      a: 'Every model upload receives an immutable cryptographic digital fingerprint on Monad. As you download, your device automatically verifies every piece against the original signature. Any tampered or corrupt files are rejected instantly, guaranteeing 100% authentic models.',
    },
    {
      q: 'Do community hosts need to install complicated software?',
      a: 'No complicated setup is required. You can host models right in your browser simply by keeping a Torrentia tab open, earning bandwidth rewards automatically. For dedicated community servers, an optional lightweight background tool is also available.',
    },
  ]

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="faq-section" id="faqs">
      <div className="faq-header">
        <div className="section-eyebrow">Frequently Asked Questions</div>
        <h2 className="faq-heading">
          Everything you need to know
        </h2>
        <p className="faq-lead">
          Key architectural details on direct peer distribution, creator royalties, batched payments, and security guarantees.
        </p>
      </div>

      <div className="faq-accordion-container">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index
          return (
            <div key={index} className={`faq-item ${isOpen ? 'is-active' : ''}`}>
              <button
                className="faq-question-btn"
                onClick={() => toggleFaq(index)}
                aria-expanded={isOpen}
              >
                <span>{faq.q}</span>
                <span className={`faq-toggle-icon ${isOpen ? 'is-open' : ''}`}>
                  {isOpen ? <Minus size={15} /> : <Plus size={15} />}
                </span>
              </button>

              {isOpen && (
                <div className="faq-answer-panel">
                  {faq.a}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
