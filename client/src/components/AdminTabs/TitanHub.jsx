import { useState, useEffect, useRef } from 'react'
import api from '../../api'

const TITAN_LOCALE = {
  en: {
    title: 'Titan Hub', subtitle: 'Central AI Orchestrator',
    status: 'Status', memory: 'Memory', database: 'Database',
    security: 'Security', scanner: 'Scanner', agents: 'Agents',
    chat: 'Chat with Titan', system: 'System',
    prospects: 'Prospects', vulnerabilities: 'Vulnerabilities',
    score: 'Score', critical: 'Critical', warnings: 'Warnings',
    info: 'Info', fixes: 'Suggested Fixes',
    platform: 'Platform', source: 'Source', sentiment: 'Sentiment',
    priority: 'Priority', action: 'Action', status: 'Status',
    markContacted: 'Mark Contacted', generateOutreach: 'Generate Outreach',
    scanNow: 'Scan Now', scanTrends: 'Scan Trends',
    fixAll: 'Fix All Issues', runCommand: 'Run Command',
    typeMessage: 'Ask Titan anything...', send: 'Send',
    clear: 'Clear', loading: 'Titan is thinking...',
    online: 'Online', offline: 'Offline',
    uptime: 'Uptime', customers: 'Customers',
    orders: 'Orders', revenue: 'Revenue Today',
    pendingEmails: 'Pending Emails', hotLeads: 'Hot Leads',
    model: 'Model', cpu: 'CPU', disk: 'Disk',
    memoryUsage: 'Memory Usage', recentErrors: 'Recent Errors',
    noProspects: 'No prospects found yet. Run a scan.',
    noVulns: 'No vulnerabilities detected. System is secure.',
    titanSays: 'Titan says:', youSay: 'You say:',
    generateCode: 'Generate Code', feature: 'Feature',
    description: 'Description', generate: 'Generate',
    codeGenerated: 'Code generated successfully',
    agentsStatus: 'AI Agents Status',
    chatAgent: 'Chat Agent (Alex)', salesAgent: 'Sales Agent',
    buildAgent: 'Build Agent', scoutAgent: 'Scout Agent',
    securityAgent: 'Security Agent', titanBrain: 'Titan Brain',
    feedDirective: 'Feed Directive', directive: 'Directive',
    feed: 'Feed', strategy: 'Strategy',
    feedStrategy: 'Feed Strategy', updateStrategy: 'Update Strategy',
    analyze: 'Analyze Conversations', conversations: 'Conversations',
    optimizeSales: 'Optimize Sales Sequence', sequenceType: 'Sequence Type',
    optimize: 'Optimize',
  },
  fr: {
    title: 'Titan Hub', subtitle: 'Orchestrateur IA Central',
    status: 'Statut', memory: 'Mémoire', database: 'Base de Données',
    security: 'Sécurité', scanner: 'Scanner', agents: 'Agents',
    chat: 'Discuter avec Titan', system: 'Système',
    prospects: 'Prospects', vulnerabilities: 'Vulnérabilités',
    score: 'Score', critical: 'Critique', warnings: 'Avertissements',
    info: 'Info', fixes: 'Corrections Sugérées',
    platform: 'Plateforme', source: 'Source', sentiment: 'Intention',
    priority: 'Priorité', action: 'Action', status: 'Statut',
    markContacted: 'Marquer Contacté', generateOutreach: 'Générer Message',
    scanNow: 'Scanner Maintenant', scanTrends: 'Tendances',
    fixAll: 'Tout Corriger', runCommand: 'Exécuter Commande',
    typeMessage: 'Demandez à Titan...', send: 'Envoyer',
    clear: 'Effacer', loading: 'Titan réfléchit...',
    online: 'En Ligne', offline: 'Hors Ligne',
    uptime: 'Disponibilité', customers: 'Clients',
    orders: 'Commandes', revenue: 'Revenu Aujourd\'hui',
    pendingEmails: 'Emails en Attente', hotLeads: 'Leads Chauds',
    model: 'Modèle', cpu: 'CPU', disk: 'Disque',
    memoryUsage: 'Utilisation Mémoire', recentErrors: 'Erreurs Récentes',
    noProspects: 'Aucun prospect trouvé. Lancez un scan.',
    noVulns: 'Aucune vulnérabilité détectée. Système sécurisé.',
    titanSays: 'Titan dit :', youSay: 'Vous dites :',
    generateCode: 'Générer Code', feature: 'Fonctionnalité',
    description: 'Description', generate: 'Générer',
    codeGenerated: 'Code généré avec succès',
    agentsStatus: 'Statut des Agents IA',
    chatAgent: 'Agent Chat (Alex)', salesAgent: 'Agent Ventes',
    buildAgent: 'Agent Build', scoutAgent: 'Agent Scout',
    securityAgent: 'Agent Sécurité', titanBrain: 'Cerveau Titan',
    feedDirective: 'Feed Directive', directive: 'Directive',
    feed: 'Feed', strategy: 'Stratégie',
    feedStrategy: 'Feed Stratégie', updateStrategy: 'Mettre à Jour',
    analyze: 'Analyser Conversations', conversations: 'Conversations',
    optimizeSales: 'Optimiser Séquence de Ventes', sequenceType: 'Type de Séquence',
    optimize: 'Optimiser',
  },
}

export default function TitanHub() {
  const [lang, setLang] = useState('en')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [systemStatus, setSystemStatus] = useState(null)
  const [securityReport, setSecurityReport] = useState(null)
  const [prospects, setProspects] = useState([])
  const [agents, setAgents] = useState({})
  const [activeTab, setActiveTab] = useState('chat')
  const [codeFeature, setCodeFeature] = useState('')
  const [codeDescription, setCodeDescription] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [command, setCommand] = useState('')
  const [commandResult, setCommandResult] = useState(null)
  const [directive, setDirective] = useState('')
  const [salesStrategy, setSalesStrategy] = useState('')
  const [conversations, setConversations] = useState('')
  const [sequenceType, setSequenceType] = useState('hot_lead')
  const [analysisResult, setAnalysisResult] = useState('')
  const [optimizedSequence, setOptimizedSequence] = useState('')
  const bottomRef = useRef(null)

  const t = (key) => TITAN_LOCALE[lang]?.[key] || key

  useEffect(() => {
    const ws = window.__WEBSITE__
    setLang(ws?.language === 'fr' ? 'fr' : 'en')
    loadStatus()
    loadAgents()
    loadProspects()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadStatus() {
    try {
      const res = await api.get('/titan/status')
      setSystemStatus(res.data)
    } catch (e) {
      console.error('Status load error:', e)
    }
  }

  async function loadAgents() {
    try {
      const res = await api.get('/titan/agents')
      setAgents(res.data.agents)
    } catch (e) {
      console.error('Agents load error:', e)
    }
  }

  async function loadProspects() {
    try {
      const res = await api.get('/titan/scanner/prospects?status=new&limit=50')
      setProspects(res.data)
    } catch (e) {
      console.error('Prospects load error:', e)
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setInput('')
    setLoading(true)
    try {
      const history = messages.slice(-10)
      const res = await api.post('/titan/chat', { message: userMsg, history })
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `[ERROR] ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  async function runSecurityScan() {
    setLoading(true)
    try {
      const res = await api.get('/titan/security/scan')
      setSecurityReport(res.data)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function runCustomerScan() {
    setLoading(true)
    try {
      const res = await api.get('/titan/scanner/scan')
      setProspects(res.data.prospects)
      alert(`Found ${res.data.summary.total} new prospects!`)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function markContacted(id) {
    try {
      await api.post(`/titan/scanner/prospects/${id}/contact`, { notes: 'Contacted via Titan' })
      setProspects(prev => prev.map(p => p.id === id ? { ...p, status: 'contacted' } : p))
    } catch (e) {
      alert(e.message)
    }
  }

  async function generateOutreach(prospect) {
    setLoading(true)
    try {
      const res = await api.post('/titan/scanner/outreach', { prospect })
      alert(`Outreach message:\n\n${res.data.message}`)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function runCommand() {
    if (!command) return
    setLoading(true)
    try {
      const res = await api.post('/titan/command', { command, args: {} })
      setCommandResult(res.data)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function generateCode() {
    if (!codeFeature || !codeDescription) return
    setLoading(true)
    try {
      const res = await api.post('/titan/generate-code', { feature: codeFeature, description: codeDescription })
      setGeneratedCode(res.data.code)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function feedChatDirective() {
    if (!directive) return
    setLoading(true)
    try {
      await api.post('/titan/feed-chat-agent', { directive })
      alert('Directive fed to Chat Agent (Alex)')
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function feedSalesStrategy() {
    if (!salesStrategy) return
    setLoading(true)
    try {
      await api.post('/titan/feed-sales-agent', { strategy: salesStrategy })
      alert('Strategy fed to Sales Agent')
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function analyzeConversations() {
    if (!conversations) return
    setLoading(true)
    try {
      const res = await api.post('/titan/analyze-conversations', { conversations: JSON.parse(conversations) })
      setAnalysisResult(res.data.analysis)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function optimizeSales() {
    setLoading(true)
    try {
      const res = await api.post('/titan/optimize-sales', { type: sequenceType })
      setOptimizedSequence(res.data.strategy)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'chat', label: t('chat'), icon: '💬' },
    { id: 'system', label: t('system'), icon: '🖥️' },
    { id: 'security', label: t('security'), icon: '🛡️' },
    { id: 'scanner', label: t('scanner'), icon: '🔍' },
    { id: 'agents', label: t('agents'), icon: '🤖' },
    { id: 'code', label: t('generateCode'), icon: '💻' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 16, borderBottom: '1px solid #2a2a2a' }}>
        <div style={{ fontSize: 36 }}>🧠</div>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#00d4ff' }}>{t('title')}</h2>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}>{t('subtitle')}</p>
        </div>
        {systemStatus?.titan && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: '#00d4ff15', borderRadius: 20, border: '1px solid #00d4ff33' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d4ff' }} />
            <span style={{ fontSize: 12, color: '#00d4ff', fontWeight: 700 }}>Titan {t('online')}</span>
            <span style={{ fontSize: 11, color: '#666' }}>{systemStatus.titan.model}</span>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #2a2a2a', paddingBottom: 12 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
            background: activeTab === tab.id ? '#00d4ff' : '#1a1a1a',
            color: activeTab === tab.id ? '#000' : '#a0a0a0',
            fontWeight: activeTab === tab.id ? 700 : 400,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
            <div style={{ flex: 1, overflowY: 'auto', background: '#0f0f0f', borderRadius: 12, padding: 16, border: '1px solid #2a2a2a' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#666', padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Titan-AX is ready</p>
                  <p style={{ fontSize: 13 }}>Ask me anything about your system, sales, customers, or security.<br/>I can generate code, scan for customers, and fix vulnerabilities.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{ marginBottom: 12, display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', gap: 8 }}>
                  <div style={{
                    maxWidth: '80%', padding: '10px 14px', borderRadius: 12,
                    background: m.role === 'user' ? '#00d4ff' : '#2a2a2a',
                    color: m.role === 'user' ? '#000' : '#fff',
                    fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, opacity: 0.7 }}>
                      {m.role === 'user' ? t('youSay') : t('titanSays')}
                    </div>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#666', fontSize: 13 }}>
                  <span className="pulse">🧠</span> {t('loading')}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={input} onChange={e => setInput(e.target.value)} placeholder={t('typeMessage')}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                style={{ flex: 1, padding: '12px 16px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none' }}
              />
              <button onClick={sendMessage} disabled={loading} style={{ padding: '12px 24px', background: '#00d4ff', color: '#000', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                {t('send')}
              </button>
              <button onClick={() => setMessages([])} style={{ padding: '12px 16px', background: '#1a1a1a', color: '#a0a0a0', border: '1px solid #2a2a2a', borderRadius: 12, cursor: 'pointer', fontSize: 14 }}>
                {t('clear')}
              </button>
            </div>
          </div>
        )}

        {/* SYSTEM TAB */}
        {activeTab === 'system' && systemStatus && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
            <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, color: '#00d4ff', fontWeight: 700 }}>🖥️ {t('system')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>{t('uptime')}</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{systemStatus.uptime}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>{t('model')}</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{systemStatus.titan?.model}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>CPU</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{systemStatus.cpu?.cores} cores</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>{t('disk')}</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{systemStatus.disk?.used || 'N/A'}</span>
                </div>
              </div>
            </div>
            <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, color: '#00d4ff', fontWeight: 700 }}>🧠 {t('memoryUsage')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Heap Used</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{systemStatus.memory?.used}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Heap Total</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{systemStatus.memory?.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>RSS</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{systemStatus.memory?.rss}</span>
                </div>
              </div>
            </div>
            <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, color: '#00d4ff', fontWeight: 700 }}>📊 {t('database')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>{t('customers')}</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{systemStatus.database?.customers}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>{t('orders')}</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{systemStatus.database?.orders}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>{t('revenue')}</span>
                  <span style={{ color: '#00ff88', fontWeight: 600 }}>${systemStatus.database?.todayRevenue?.toFixed(2) || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>{t('pendingEmails')}</span>
                  <span style={{ color: '#ffd700', fontWeight: 600 }}>{systemStatus.database?.pendingEmails}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>{t('hotLeads')}</span>
                  <span style={{ color: '#ff6b35', fontWeight: 600 }}>{systemStatus.database?.hotLeads}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>{t('recentErrors')}</span>
                  <span style={{ color: systemStatus.database?.recentErrors > 0 ? '#ff4444' : '#00ff88', fontWeight: 600 }}>{systemStatus.database?.recentErrors}</span>
                </div>
              </div>
            </div>
            <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, color: '#00d4ff', fontWeight: 700 }}>⚡ {t('runCommand')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <select value={command} onChange={e => setCommand(e.target.value)} style={{ padding: '10px', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13 }}>
                  <option value="">Select command...</option>
                  <option value="get_stats">Get Stats</option>
                  <option value="get_customers">Get Customers</option>
                  <option value="get_orders">Get Orders</option>
                  <option value="get_providers">Get Providers</option>
                  <option value="get_plans">Get Plans</option>
                  <option value="get_leads">Get Hot Leads</option>
                  <option value="get_email_queue">Get Email Queue</option>
                  <option value="get_website">Get Website</option>
                  <option value="get_logs">Get Logs</option>
                  <option value="generate_strategy">Generate Strategy</option>
                </select>
                <button onClick={runCommand} disabled={loading} style={{ padding: '10px', background: '#00d4ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  {t('runCommand')}
                </button>
                {commandResult && (
                  <pre style={{ background: '#0f0f0f', padding: 10, borderRadius: 8, fontSize: 11, color: '#00ff88', overflow: 'auto', maxHeight: 200 }}>
                    {JSON.stringify(commandResult, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button onClick={runSecurityScan} disabled={loading} style={{ padding: '10px 24px', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                🛡️ {t('scanNow')}
              </button>
              {securityReport && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: '#fff' }}>{t('score')}: <span style={{ fontWeight: 800, color: securityReport.score >= 80 ? '#00ff88' : securityReport.score >= 50 ? '#ffd700' : '#ff4444' }}>{securityReport.score}/100</span></span>
                  <span style={{ fontSize: 13, color: '#ff4444' }}>🔴 {securityReport.critical?.length || 0} {t('critical')}</span>
                  <span style={{ fontSize: 13, color: '#ffd700' }}>🟡 {securityReport.warnings?.length || 0} {t('warnings')}</span>
                </div>
              )}
            </div>
            {securityReport && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                {securityReport.critical?.length > 0 && (
                  <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 16, border: '1px solid #ff4444' }}>
                    <h4 style={{ margin: '0 0 12px', color: '#ff4444', fontSize: 14 }}>🔴 {t('critical')}</h4>
                    {securityReport.critical.map((issue, i) => (
                      <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #ffffff10', fontSize: 13, color: '#fff' }}>{issue}</div>
                    ))}
                  </div>
                )}
                {securityReport.warnings?.length > 0 && (
                  <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 16, border: '1px solid #ffd700' }}>
                    <h4 style={{ margin: '0 0 12px', color: '#ffd700', fontSize: 14 }}>🟡 {t('warnings')}</h4>
                    {securityReport.warnings.map((issue, i) => (
                      <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #ffffff10', fontSize: 13, color: '#fff' }}>{issue}</div>
                    ))}
                  </div>
                )}
                {securityReport.fixes?.length > 0 && (
                  <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 16, border: '1px solid #00d4ff' }}>
                    <h4 style={{ margin: '0 0 12px', color: '#00d4ff', fontSize: 14 }}>💡 {t('fixes')}</h4>
                    {securityReport.fixes.map((fix, i) => (
                      <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #ffffff10', fontSize: 13, color: '#fff' }}>{fix}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {!securityReport && (
              <div style={{ textAlign: 'center', color: '#666', padding: 40 }}>
                <p>{t('noVulns')}</p>
                <p style={{ fontSize: 13 }}>Run a scan to check for vulnerabilities.</p>
              </div>
            )}
          </div>
        )}

        {/* SCANNER TAB */}
        {activeTab === 'scanner' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={runCustomerScan} disabled={loading} style={{ padding: '10px 24px', background: '#00d4ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                🔍 {t('scanNow')}
              </button>
              <button onClick={() => loadProspects()} style={{ padding: '10px 24px', background: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                🔄 Refresh
              </button>
            </div>
            {prospects.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {prospects.map(p => (
                  <div key={p.id || p.url} style={{ background: '#1a1a1a', borderRadius: 12, padding: 16, border: '1px solid #2a2a2a', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#00d4ff', background: '#00d4ff15', padding: '2px 8px', borderRadius: 4 }}>{p.platform}</span>
                        <span style={{ fontSize: 11, color: '#888' }}>{p.source}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: p.sentiment === 'high_intent' ? '#00ff88' : p.sentiment === 'trial_seeker' ? '#00d4ff' : '#ffd700', background: '#ffffff10', padding: '2px 8px', borderRadius: 4 }}>{p.sentiment}</span>
                        <span style={{ fontSize: 11, color: '#ff6b35' }}>⭐ {p.priority}</span>
                      </div>
                      <h4 style={{ margin: '0 0 4px', fontSize: 14, color: '#fff' }}>{p.title}</h4>
                      <p style={{ margin: 0, fontSize: 12, color: '#888', lineHeight: 1.5 }}>{p.body?.substring(0, 200)}...</p>
                      <div style={{ marginTop: 8, fontSize: 11, color: '#666' }}>{p.action}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button onClick={() => generateOutreach(p)} style={{ padding: '6px 12px', background: '#00d4ff', color: '#000', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        {t('generateOutreach')}
                      </button>
                      <button onClick={() => markContacted(p.id)} style={{ padding: '6px 12px', background: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                        {t('markContacted')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#666', padding: 40 }}>
                <p>{t('noProspects')}</p>
              </div>
            )}
          </div>
        )}

        {/* AGENTS TAB */}
        {activeTab === 'agents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {/* Agent Status Cards */}
              {Object.entries(agents).map(([key, agent]) => (
                <div key={key} style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: agent.status === 'online' ? '#00ff8815' : '#ff444415', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    {agent.status === 'online' ? '🟢' : '🔴'}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{agent.name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{key} — {agent.status}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Feed Directives */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
              <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
                <h4 style={{ margin: '0 0 12px', color: '#00d4ff', fontSize: 14 }}>💬 {t('feedDirective')} — {t('chatAgent')}</h4>
                <textarea value={directive} onChange={e => setDirective(e.target.value)} placeholder="Enter directive for Alex..."
                  style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13, minHeight: 80, resize: 'vertical', marginBottom: 8, fontFamily: 'inherit' }} />
                <button onClick={feedChatDirective} style={{ padding: '8px 16px', background: '#00d4ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  {t('feed')}
                </button>
              </div>
              <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
                <h4 style={{ margin: '0 0 12px', color: '#ff6b35', fontSize: 14 }}>🚀 {t('feedStrategy')} — {t('salesAgent')}</h4>
                <textarea value={salesStrategy} onChange={e => setSalesStrategy(e.target.value)} placeholder="Enter sales strategy..."
                  style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13, minHeight: 80, resize: 'vertical', marginBottom: 8, fontFamily: 'inherit' }} />
                <button onClick={feedSalesStrategy} style={{ padding: '8px 16px', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  {t('feed')}
                </button>
              </div>
            </div>

            {/* Analysis Tools */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
              <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
                <h4 style={{ margin: '0 0 12px', color: '#7b2dff', fontSize: 14 }}>📊 {t('analyze')}</h4>
                <textarea value={conversations} onChange={e => setConversations(e.target.value)} placeholder='Paste conversations JSON array here...'
                  style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13, minHeight: 80, resize: 'vertical', marginBottom: 8, fontFamily: 'inherit' }} />
                <button onClick={analyzeConversations} style={{ padding: '8px 16px', background: '#7b2dff', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  {t('analyze')}
                </button>
                {analysisResult && (
                  <div style={{ marginTop: 12, padding: 12, background: '#0f0f0f', borderRadius: 8, fontSize: 13, color: '#fff', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {analysisResult}
                  </div>
                )}
              </div>
              <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
                <h4 style={{ margin: '0 0 12px', color: '#00ff88', fontSize: 14 }}>🎯 {t('optimizeSales')}</h4>
                <select value={sequenceType} onChange={e => setSequenceType(e.target.value)} style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13, marginBottom: 8 }}>
                  <option value="hot_lead">Hot Lead</option>
                  <option value="warm_lead">Warm Lead</option>
                  <option value="cold_lead">Cold Lead</option>
                  <option value="trial_to_paid">Trial to Paid</option>
                  <option value="abandoned_cart">Abandoned Cart</option>
                </select>
                <button onClick={optimizeSales} style={{ padding: '8px 16px', background: '#00ff88', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  {t('optimize')}
                </button>
                {optimizedSequence && (
                  <div style={{ marginTop: 12, padding: 12, background: '#0f0f0f', borderRadius: 8, fontSize: 13, color: '#fff', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {optimizedSequence}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CODE GENERATION TAB */}
        {activeTab === 'code' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
                <h4 style={{ margin: '0 0 12px', color: '#00d4ff', fontSize: 14 }}>{t('feature')}</h4>
                <input value={codeFeature} onChange={e => setCodeFeature(e.target.value)} placeholder="e.g., Auto-backup system"
                  style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13, marginBottom: 12, fontFamily: 'inherit' }} />
                <h4 style={{ margin: '0 0 12px', color: '#00d4ff', fontSize: 14 }}>{t('description')}</h4>
                <textarea value={codeDescription} onChange={e => setCodeDescription(e.target.value)} placeholder="Describe the feature in detail..."
                  style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13, minHeight: 120, resize: 'vertical', marginBottom: 12, fontFamily: 'inherit' }} />
                <button onClick={generateCode} disabled={loading} style={{ padding: '10px 24px', background: '#00d4ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  {t('generate')}
                </button>
              </div>
              <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
                <h4 style={{ margin: '0 0 12px', color: '#00ff88', fontSize: 14 }}>{t('codeGenerated')}</h4>
                {generatedCode ? (
                  <pre style={{ background: '#0f0f0f', padding: 16, borderRadius: 8, fontSize: 12, color: '#00ff88', overflow: 'auto', maxHeight: 400, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    {generatedCode}
                  </pre>
                ) : (
                  <div style={{ color: '#666', textAlign: 'center', padding: 40 }}>
                    <p>Generated code will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
