import React from 'react'
import { BookOpen } from 'lucide-react'

export interface ModelCardViewerProps {
  content?: string
  modelName: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Clean dependency-free markdown formatter for Model Card READMEs.
 */
export const ModelCardViewer: React.FC<ModelCardViewerProps> = ({
  content,
  modelName,
  style,
}) => {
  const fallbackText = `# ${modelName}\n\nThis open-source model is delivered in verified pieces from people on the Torrentia network.\n\n### How it works\n- Each piece is checked before it is saved.\n- Your payment is automatically shared between the creator and the person providing the model.\n- After downloading, you can keep sharing the model with others.\n\n### Quickstart\nConnect your account and click **Download model** to receive a verified copy.`

  const raw = content && content.trim() ? content : fallbackText

  // Split lines and parse basic markdown blocks
  const lines = raw.split('\n')
  const elements: React.ReactNode[] = []

  let inCodeBlock = false
  let codeBlockLines: string[] = []

  lines.forEach((line, index) => {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        elements.push(
          <pre
            key={`code-${index}`}
            style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(28, 25, 23, 0.04)',
              border: '1px solid rgba(28, 25, 23, 0.08)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: '#6d28d9',
              overflowX: 'auto',
              margin: '0.5rem 0',
            }}
          >
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        )
        codeBlockLines = []
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      return
    }

    if (inCodeBlock) {
      codeBlockLines.push(line)
      return
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h2
          key={index}
          style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 800,
            marginTop: '0.8rem',
            marginBottom: '0.4rem',
            color: 'var(--color-text-primary)',
          }}
        >
          {line.replace('# ', '')}
        </h2>
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <h3
          key={index}
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 700,
            marginTop: '0.6rem',
            marginBottom: '0.3rem',
            color: 'var(--color-text-primary)',
          }}
        >
          {line.replace('## ', '')}
        </h3>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h4
          key={index}
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 700,
            marginTop: '0.5rem',
            marginBottom: '0.25rem',
            color: '#6d28d9',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {line.replace('### ', '')}
        </h4>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const text = line.substring(2)
      elements.push(
        <li
          key={index}
          style={{
            marginLeft: '1.25rem',
            marginBottom: '0.25rem',
            color: '#44403c',
            fontSize: 'var(--text-sm)',
            lineHeight: 1.5,
          }}
        >
          {renderInlineMarkdown(text)}
        </li>
      )
    } else if (line.trim().length > 0) {
      elements.push(
        <p
          key={index}
          style={{
            color: '#44403c',
            fontSize: 'var(--text-sm)',
            lineHeight: 1.6,
            marginBottom: '0.5rem',
          }}
        >
          {renderInlineMarkdown(line)}
        </p>
      )
    }
  })

  return (
    <div
      className="glass"
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <BookOpen size={16} color="var(--color-accent)" />
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>
          Model Overview & Documentation
        </h3>
      </div>

      <div style={{ wordBreak: 'break-word' }}>
        {elements}
      </div>
    </div>
  )
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Support **bold** and `code`
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.9em',
            background: 'rgba(28, 25, 23, 0.06)',
            padding: '0.1rem 0.35rem',
            borderRadius: '4px',
            color: '#6d28d9',
          }}
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}
