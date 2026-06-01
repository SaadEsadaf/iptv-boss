import { useState, useRef, useEffect } from 'react'
import api from '../api'

export default function AIAssistant({ activeTab }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEnd = useRef(null)

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function addMessage(role, text, autofill) {
    setMessages(m => [...m, { role, text, autofill }])
  }

  async function send() {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    addMessage('user', q)
    setLoading(true)
    try {
      const res = await api.post('/admin/assistant/query', { tab: activeTab, question: q })
      addMessage('assistant', res.data.answer, res.data.autofill || [])
    } catch {
      addMessage('assistant', 'Sorry, I couldn\'t reach the server. Make sure you\'re connected.')
    }
    setLoading(false)
  }

  async function handleAutofill(key, value) {
    try {
      await api.post('/admin/assistant/apply', { key, value })
      addMessage('assistant', `✅ Set \`${key}\` to "${value}". You may need to refresh the Settings page to see the change.`)
    } catch {
      addMessage('assistant', `Failed to save ${key}. Try doing it manually in Settings.`)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const tabName = activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ')

  return (
    <>
      {open && (
        <div style={{
          position: 'fixed', bottom: 80, right: 24, width: 380, maxHeight: 520,
          background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16,
          display: 'flex', flexDirection: 'column', zIndex: 9999, boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 18px', background: '#0f0f0f', borderBottom: '1px solid #2a2a2a',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 14 }}>🤖 AI Assistant</span>
              <span style={{ color: '#666', fontSize: 11, marginLeft: 8 }}>— {tabName}</span>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 200, maxHeight: 360 }}>
            {messages.length === 0 && (
              <div style={{ color: '#666', fontSize: 13, textAlign: 'center', padding: 30 }}>
                <p style={{ margin: '0 0 8px', fontSize: 24 }}>🤖</p>
                <p>Ask me anything about this tab!</p>
                <p style={{ fontSize: 12, color: '#555' }}>
                  e.g. "How do I set up SMTP?", "What should I put in AI keys?", "How do sniffers work?"
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                  background: m.role === 'user' ? '#00d4ff20' : '#0f0f0f',
                  border: m.role === 'user' ? '1px solid #00d4ff30' : '1px solid #2a2a2a',
                  color: '#ddd',
                }}>
                  {m.text}
                </div>
                {m.autofill && m.autofill.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {m.autofill.map((a, j) => (
                      <button key={j} onClick={() => handleAutofill(a.key, a.value)}
                        style={{
                          padding: '5px 10px', background: '#00d4ff15', border: '1px solid #00d4ff33',
                          borderRadius: 6, color: '#00d4ff', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                        }}>
                        Apply {a.key}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#666', fontSize: 12, padding: '4px 0' }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, background: '#00d4ff', borderRadius: '50%', animation: 'pulse 1s infinite' }}></span>
                Thinking...
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          <div style={{ padding: '10px 12px', borderTop: '1px solid #2a2a2a', display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Ask me anything..." disabled={loading}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #2a2a2a',
                background: '#0f0f0f', color: '#fff', fontSize: 13, outline: 'none',
              }} />
            <button onClick={send} disabled={loading || !input.trim()}
              style={{
                padding: '10px 16px', background: loading ? '#2a2a2a' : '#00d4ff',
                color: loading ? '#666' : '#000', border: 'none', borderRadius: 10,
                fontWeight: 600, cursor: loading ? 'default' : 'pointer', fontSize: 14,
              }}>Send</button>
          </div>
        </div>
      )}

      <button onClick={() => setOpen(!open)} style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        width: 52, height: 52, borderRadius: '50%',
        background: open ? '#ff4444' : '#00d4ff', border: 'none',
        cursor: 'pointer', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: open ? '0 4px 20px rgba(255,68,68,0.4)' : '0 4px 20px rgba(0,212,255,0.4)',
        transition: 'all .2s',
      }}>
        {open ? '✕' : '🤖'}
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  )
}
