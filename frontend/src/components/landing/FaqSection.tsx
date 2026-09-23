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
      q: 'How does decentralized WebRTC chunk streaming work?',
      a: 'Torrentia uses native WebRTC data channels and distributed seeders to establish direct, encrypted peer connections. Model weights are sliced into uniform 1MB chunks, partitioned into 16KB sub-slices, and streamed directly into browser IndexedDB or local disk with zero intermediate servers.',
    },
    {
      q: 'Why is Torrentia built on Monad instead of Ethereum or an L2?',
      a: 'Monad provides 10,000 TPS, 1-second block finality, and ultra-efficient execution. In a streaming marketplace where 1MB chunk transfers trigger atomic payment splits in real-time, 1-second finality is critical to keep multi-peer weight streams running without payment lag.',
    },
    {
      q: 'How does the 402 payment gate work?',
      a: 'When a downloader requests chunk #N, the serving peer issues a custom 402 challenge specifying the model price and seeder address. The downloader calls the SplitPayment contract on Monad, provides the transaction receipt as proof, and the seeder releases the weights.',
    },
    {
      q: 'Why is the chunk price uniform regardless of who seeds it?',
      a: 'Uniform chunk pricing is a core architectural invariant. If seeders were allowed to undercut each other on price, the incentive to seed unpopular or large models would collapse into a race to the bottom. Uniform pricing guarantees predictable creator royalties and sustainable bandwidth compensation.',
    },
    {
      q: 'How does Torrentia prevent poisoned or corrupted model weights?',
      a: 'Every model upload generates a ChunkManifest containing cryptographic SHA-256 hashes of every 1MB chunk, pinned immutably to IPFS. The downloader verifies each chunk client-side before committing it to storage. Corrupt, altered, or poisoned weights are rejected instantly.',
    },
    {
      q: 'Do seeders need to install software or run dedicated servers?',
      a: 'No complicated setup is required. Chunks are stored safely inside your browser IndexedDB, so simply keeping the Torrentia marketplace tab open turns you into an active, earning seeder. For 24/7 headless servers, an optional lightweight Go seeder daemon (torrentia-seeder) is also available.',
    },
  ]

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="faq-section" id="faqs">
      <div className="section-eyebrow">Frequently Asked Questions</div>
      <h2 className="section-heading-large">
        Everything you need to know
      </h2>
      <p className="section-lead">
        Key details on peer-to-peer streaming, Monad smart contract settlements, and security guarantees.
      </p>

      <div className="faq-accordion-container">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index
          return (
            <div key={index} className="faq-item">
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
