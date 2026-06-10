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
    growth: 'Growth Engine', pipeline: 'Pipeline', dailyTarget: 'Daily Target',
    leadsGenerated: 'Leads Generated', leadsContacted: 'Leads Contacted',
    conversions: 'Conversions', conversionRate: 'Conversion Rate',
    runPipeline: 'Run Pipeline', autoMode: 'Auto Mode',
    stopAutoMode: 'Stop Auto Mode', platforms: 'Platforms',
    reddit: 'Reddit', twitter: 'Twitter', youtube: 'YouTube',
    telegram: 'Telegram', forums: 'Forums',
    totalLeads: 'Total Leads', totalConverted: 'Total Converted',
    todayLeads: 'Today Leads', todayConversions: 'Today Conversions',
    dailyProgress: 'Daily Progress', dailyPercentage: 'Daily %',
    topSources: 'Top Sources', topPlatforms: 'Top Platforms',
    campaigns: 'Campaigns', affiliates: 'Affiliates',
    contentReady: 'Content Ready', generateContent: 'Generate Content',
    massOutreach: 'Mass Outreach', selectLeads: 'Select Leads',
    outreachTemplate: 'Outreach Template', sendOutreach: 'Send Outreach',
    referrals: 'Referrals', registerAffiliate: 'Register Affiliate',
    affiliateName: 'Affiliate Name', affiliateEmail: 'Affiliate Email',
    affiliateCode: 'Affiliate Code', earnings: 'Earnings',
    intelligence: 'Intelligence', brainCycle: 'Brain Cycle', brainCycles: 'Brain Cycles', validated: 'Validated',
    templates: 'Templates', templateInjection: 'Template Injection',
    templateType: 'Template Type', templateName: 'Template Name',
    templateContent: 'Template Content', templateVariables: 'Variables',
    generateTemplate: 'Generate Template', bulkGenerate: 'Bulk Generate',
    campaignName: 'Campaign Name', count: 'Count',
    injections: 'Injections', target: 'Target', position: 'Position',
    abTests: 'A/B Tests', createABTest: 'Create A/B Test',
    trafficSplit: 'Traffic Split', endTest: 'End Test',
    winner: 'Winner', analytics: 'Analytics',
    impressions: 'Impressions', clicks: 'Clicks', conversions: 'Conversions',
    ctr: 'CTR', cvr: 'CVR', autoOptimize: 'Auto Optimize',
    renderTemplate: 'Render Template', preview: 'Preview',
    saveTemplate: 'Save Template', deleteTemplate: 'Delete',
    active: 'Active', inactive: 'Inactive',
    allTypes: 'All Types', selectType: 'Select Type',
    prompt: 'Prompt', injectionTarget: 'Injection Target',
    injectionPosition: 'Position', conditions: 'Conditions',
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
    growth: 'Moteur de Croissance', pipeline: 'Pipeline', dailyTarget: 'Objectif Journalier',
    leadsGenerated: 'Leads Générés', leadsContacted: 'Leads Contactés',
    conversions: 'Conversions', conversionRate: 'Taux de Conversion',
    runPipeline: 'Lancer Pipeline', autoMode: 'Mode Auto',
    stopAutoMode: 'Arrêter Mode Auto', platforms: 'Plateformes',
    reddit: 'Reddit', twitter: 'Twitter', youtube: 'YouTube',
    telegram: 'Telegram', forums: 'Forums',
    totalLeads: 'Total Leads', totalConverted: 'Total Convertis',
    todayLeads: 'Leads Aujourd\'hui', todayConversions: 'Conversions Aujourd\'hui',
    dailyProgress: 'Progrès Journalier', dailyPercentage: '% Journalier',
    topSources: 'Top Sources', topPlatforms: 'Top Plateformes',
    campaigns: 'Campagnes', affiliates: 'Affiliés',
    contentReady: 'Contenu Prêt', generateContent: 'Générer Contenu',
    massOutreach: 'Outreach Massif', selectLeads: 'Sélectionner Leads',
    outreachTemplate: 'Template Outreach', sendOutreach: 'Envoyer Outreach',
    referrals: 'Parrainages', registerAffiliate: 'Enregistrer Affilié',
    affiliateName: 'Nom Affilié', affiliateEmail: 'Email Affilié',
    affiliateCode: 'Code Affilié', earnings: 'Gains',
    intelligence: 'Intelligence', brainCycle: 'Cycle Cérébral', brainCycles: 'Cycles Cérébraux', validated: 'Validé',
    templates: 'Templates', templateInjection: 'Injection de Templates',
    templateType: 'Type de Template', templateName: 'Nom du Template',
    templateContent: 'Contenu du Template', templateVariables: 'Variables',
    generateTemplate: 'Générer Template', bulkGenerate: 'Génération en Masse',
    campaignName: 'Nom de la Campagne', count: 'Nombre',
    injections: 'Injections', target: 'Cible', position: 'Position',
    abTests: 'Tests A/B', createABTest: 'Créer Test A/B',
    trafficSplit: 'Répartition du Trafic', endTest: 'Terminer Test',
    winner: 'Gagnant', analytics: 'Analytiques',
    impressions: 'Impressions', clicks: 'Clics', conversions: 'Conversions',
    ctr: 'CTR', cvr: 'CVR', autoOptimize: 'Optimisation Auto',
    renderTemplate: 'Rendre Template', preview: 'Aperçu',
    saveTemplate: 'Sauvegarder', deleteTemplate: 'Supprimer',
    active: 'Actif', inactive: 'Inactif',
    allTypes: 'Tous Types', selectType: 'Choisir Type',
    prompt: 'Prompt', injectionTarget: 'Cible Injection',
    injectionPosition: 'Position', conditions: 'Conditions',
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
  const [templates, setTemplates] = useState([])
  const [templateTypes, setTemplateTypes] = useState({})
  const [selectedTemplateType, setSelectedTemplateType] = useState('email_sequence')
  const [templateName, setTemplateName] = useState('')
  const [templatePrompt, setTemplatePrompt] = useState('')
  const [templateContent, setTemplateContent] = useState('')
  const [templateVariables, setTemplateVariables] = useState('')
  const [generatedTemplate, setGeneratedTemplate] = useState(null)
  const [injections, setInjections] = useState([])
  const [abTests, setAbTests] = useState([])
  const [campaignName, setCampaignName] = useState('')
  const [bulkCount, setBulkCount] = useState(5)
  const [injectionTarget, setInjectionTarget] = useState('')
  const [injectionPosition, setInjectionPosition] = useState('append')
  const [selectedTemplateId, setSelectedTemplateId] = useState(null)
  const [renderedPreview, setRenderedPreview] = useState('')
  const [templateAnalytics, setTemplateAnalytics] = useState(null)
  const [abTestName, setAbTestName] = useState('')
  const [abTestTemplateIds, setAbTestTemplateIds] = useState('')
  const [abTestSplit, setAbTestSplit] = useState('50,50')
  const [growthStats, setGrowthStats] = useState(null)
  const [growthLeads, setGrowthLeads] = useState([])
  const [growthCampaigns, setGrowthCampaigns] = useState([])
  const [growthContent, setGrowthContent] = useState([])
  const [selectedGrowthLeads, setSelectedGrowthLeads] = useState([])
  const [outreachTemplate, setOutreachTemplate] = useState('')
  const [affiliateName, setAffiliateName] = useState('')
  const [affiliateEmail, setAffiliateEmail] = useState('')
  const [affiliatePhone, setAffiliatePhone] = useState('')
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const [brainStats, setBrainStats] = useState(null)
  const [brainCycles, setBrainCycles] = useState([])
  const [brainLoading, setBrainLoading] = useState(false)
  const bottomRef = useRef(null)

  const t = (key) => TITAN_LOCALE[lang]?.[key] || key

  useEffect(() => {
    const ws = window.__WEBSITE__
    setLang(ws?.language === 'fr' ? 'fr' : 'en')
    loadStatus()
    loadAgents()
    loadProspects()
    loadGrowthStats()
    loadGrowthLeads()
    loadGrowthCampaigns()
    loadGrowthContent()
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

  async function loadTemplates() {
    try {
      const res = await api.get('/titan-templates/templates')
      setTemplates(res.data)
    } catch (e) {
      console.error('Load templates error:', e)
    }
  }

  async function loadTemplateTypes() {
    try {
      const res = await api.get('/titan-templates/types')
      setTemplateTypes(res.data)
    } catch (e) {
      console.error('Load template types error:', e)
    }
  }

  async function loadInjections() {
    try {
      const res = await api.get('/titan-templates/injections')
      setInjections(res.data)
    } catch (e) {
      console.error('Load injections error:', e)
    }
  }

  async function loadABTests() {
    try {
      const res = await api.get('/titan-templates/ab-tests')
      setAbTests(res.data)
    } catch (e) {
      console.error('Load AB tests error:', e)
    }
  }

  async function generateTemplate() {
    if (!templatePrompt || !selectedTemplateType) return
    setLoading(true)
    try {
      const res = await api.post('/titan-templates/generate', {
        type: selectedTemplateType,
        prompt: templatePrompt,
      })
      setGeneratedTemplate(res.data)
      setTemplateContent(res.data.content)
      setTemplateVariables(JSON.stringify(res.data.variables || []))
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveTemplate() {
    if (!templateName || !templateContent) return
    setLoading(true)
    try {
      await api.post('/titan-templates/save', {
        name: templateName,
        type: selectedTemplateType,
        content: templateContent,
        variables: JSON.parse(templateVariables || '[]'),
      })
      alert('Template saved!')
      loadTemplates()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function deleteTemplate(id) {
    if (!confirm('Delete this template?')) return
    setLoading(true)
    try {
      await api.delete(`/titan-templates/templates/${id}`)
      loadTemplates()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function renderTemplate() {
    if (!selectedTemplateId) return
    setLoading(true)
    try {
      const template = templates.find(t => t.id === selectedTemplateId)
      if (!template) return
      const vars = {}
      try {
        const parsedVars = JSON.parse(template.variables || '[]')
        parsedVars.forEach(v => { vars[v] = `{{${v}}}` })
      } catch { /* ignore */ }
      const res = await api.post('/titan-templates/render', {
        name: template.name,
        type: template.type,
        variables: vars,
      })
      setRenderedPreview(res.data.rendered)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function injectTemplate() {
    if (!selectedTemplateId || !injectionTarget) return
    setLoading(true)
    try {
      await api.post('/titan-templates/inject', {
        templateId: selectedTemplateId,
        target: injectionTarget,
        position: injectionPosition,
      })
      alert('Template injected!')
      loadInjections()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function bulkGenerate() {
    if (!campaignName || !selectedTemplateType) return
    setLoading(true)
    try {
      const res = await api.post('/titan-templates/bulk-generate', {
        campaignName,
        type: selectedTemplateType,
        count: bulkCount,
      })
      alert(`Generated ${res.data.count} templates!`)
      loadTemplates()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function createABTest() {
    if (!abTestName || !abTestTemplateIds) return
    setLoading(true)
    try {
      const ids = abTestTemplateIds.split(',').map(id => parseInt(id.trim()))
      const split = abTestSplit.split(',').map(s => parseInt(s.trim()))
      await api.post('/titan-templates/ab-tests', {
        name: abTestName,
        templateIds: ids,
        trafficSplit: split,
      })
      alert('A/B test created!')
      loadABTests()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function endABTest(id) {
    const winnerId = prompt('Enter winner template ID:')
    if (!winnerId) return
    setLoading(true)
    try {
      await api.post(`/titan-templates/ab-tests/${id}/end`, { winnerId: parseInt(winnerId) })
      loadABTests()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function autoOptimizeTemplate(id) {
    setLoading(true)
    try {
      const res = await api.post(`/titan-templates/optimize/${id}`)
      alert(res.data.message || 'Optimized!')
      loadTemplates()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadAnalytics(id) {
    setLoading(true)
    try {
      const res = await api.get(`/titan-templates/analytics/${id}?days=7`)
      setTemplateAnalytics(res.data)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadGrowthStats() {
    try {
      const res = await api.get('/titan-growth/stats')
      setGrowthStats(res.data)
    } catch (e) {
      console.error('Load growth stats error:', e)
    }
  }

  async function loadGrowthLeads() {
    try {
      const res = await api.get('/titan-growth/leads?status=new&limit=50')
      setGrowthLeads(res.data)
    } catch (e) {
      console.error('Load growth leads error:', e)
    }
  }

  async function loadGrowthCampaigns() {
    try {
      const res = await api.get('/titan-growth/campaigns')
      setGrowthCampaigns(res.data)
    } catch (e) {
      console.error('Load growth campaigns error:', e)
    }
  }

  async function loadGrowthContent() {
    try {
      const res = await api.get('/titan-growth/content?status=ready&limit=20')
      setGrowthContent(res.data)
    } catch (e) {
      console.error('Load growth content error:', e)
    }
  }

  async function runGrowthPipeline() {
    setPipelineRunning(true)
    setLoading(true)
    try {
      const res = await api.post('/titan-growth/pipeline')
      alert(`Pipeline complete! Generated ${res.data.total} leads`)
      loadGrowthStats()
      loadGrowthLeads()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
      setPipelineRunning(false)
    }
  }

  async function runGrowthScrape(platform) {
    setLoading(true)
    try {
      const res = await api.post(`/titan-growth/scrape/${platform}`, { limit: 50 })
      alert(`Scraped ${res.data.leads} leads from ${platform}`)
      loadGrowthLeads()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function sendMassOutreach() {
    if (selectedGrowthLeads.length === 0) {
      alert('Select leads first')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/titan-growth/outreach', {
        leadIds: selectedGrowthLeads,
        template: outreachTemplate,
      })
      alert(`Sent ${res.data.sent} messages, ${res.data.failed} failed`)
      loadGrowthLeads()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function registerAffiliate() {
    if (!affiliateName || !affiliateEmail) {
      alert('Name and email required')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/titan-growth/affiliates', {
        name: affiliateName,
        email: affiliateEmail,
        phone: affiliatePhone,
      })
      alert(`Affiliate registered! Code: ${res.data.code}`)
      setAffiliateName('')
      setAffiliateEmail('')
      setAffiliatePhone('')
      loadGrowthStats()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function generateGrowthContent() {
    setLoading(true)
    try {
      const res = await api.post('/titan-growth/content/generate', { count: 20 })
      alert(`Generated ${res.data.count} content pieces`)
      loadGrowthContent()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadBrainStats() {
    try {
      const res = await api.get('/titan-intelligence/stats')
      setBrainStats(res.data)
      const cyclesRes = await api.get('/titan-intelligence/brain-cycles')
      setBrainCycles(cyclesRes.data || [])
    } catch (e) {
      console.error('Load brain stats error:', e)
    }
  }

  async function runBrainCycle() {
    setBrainLoading(true)
    try {
      const res = await api.post('/titan-intelligence/brain-cycle')
      alert(`Brain Cycle complete! Validated: ${res.data.dataValidated}, Campaigns: ${res.data.campaignsExecuted}`)
      loadBrainStats()
    } catch (e) {
      alert(e.message)
    } finally {
      setBrainLoading(false)
    }
  }

  const tabs = [
    { id: 'chat', label: t('chat'), icon: '💬' },
    { id: 'system', label: t('system'), icon: '🖥️' },
    { id: 'security', label: t('security'), icon: '🛡️' },
    { id: 'scanner', label: t('scanner'), icon: '🔍' },
    { id: 'agents', label: t('agents'), icon: '🤖' },
    { id: 'templates', label: t('templates'), icon: '📄' },
    { id: 'growth', label: t('growth'), icon: '🚀' },
    { id: 'intelligence', label: t('intelligence'), icon: '🧠' },
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

        {/* TEMPLATES TAB */}
        {activeTab === 'templates' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto' }}>
            {/* Template Generator */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
                <h4 style={{ margin: '0 0 12px', color: '#00d4ff', fontSize: 14 }}>📝 {t('generateTemplate')}</h4>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 6 }}>{t('templateType')}</label>
                  <select value={selectedTemplateType} onChange={e => setSelectedTemplateType(e.target.value)} style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13 }}>
                    <option value="email_sequence">Email Sequence</option>
                    <option value="landing_page">Landing Page</option>
                    <option value="chat_response">Chat Response</option>
                    <option value="social_post">Social Media Post</option>
                    <option value="whatsapp_message">WhatsApp Message</option>
                    <option value="ad_copy">Ad Copy</option>
                    <option value="push_notification">Push Notification</option>
                    <option value="sms_message">SMS Message</option>
                    <option value="popup_modal">Popup Modal</option>
                    <option value="video_script">Video Script</option>
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 6 }}>{t('templateName')}</label>
                  <input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g., world_cup_2026_email"
                    style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13 }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 6 }}>{t('prompt')}</label>
                  <textarea value={templatePrompt} onChange={e => setTemplatePrompt(e.target.value)} placeholder="Describe what you want the template to do..."
                    style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={generateTemplate} disabled={loading} style={{ padding: '10px 20px', background: '#00d4ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                    {t('generateTemplate')}
                  </button>
                  <button onClick={saveTemplate} disabled={loading} style={{ padding: '10px 20px', background: '#00ff88', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                    {t('saveTemplate')}
                  </button>
                </div>
              </div>
              <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
                <h4 style={{ margin: '0 0 12px', color: '#00ff88', fontSize: 14 }}>👁️ {t('preview')}</h4>
                {templateContent ? (
                  <div style={{ background: '#0f0f0f', padding: 16, borderRadius: 8, fontSize: 13, color: '#fff', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>
                    {templateContent}
                  </div>
                ) : (
                  <div style={{ color: '#666', textAlign: 'center', padding: 40 }}>
                    <p>Generated template will appear here.</p>
                  </div>
                )}
                {templateVariables && (
                  <div style={{ marginTop: 12, padding: 8, background: '#00d4ff10', borderRadius: 6, fontSize: 11, color: '#00d4ff' }}>
                    Variables: {templateVariables}
                  </div>
                )}
              </div>
            </div>

            {/* Bulk Generate */}
            <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
              <h4 style={{ margin: '0 0 12px', color: '#ff6b35', fontSize: 14 }}>🚀 {t('bulkGenerate')}</h4>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 6 }}>{t('campaignName')}</label>
                  <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g., World Cup 2026 Campaign"
                    style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13 }} />
                </div>
                <div style={{ width: 120 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 6 }}>{t('count')}</label>
                  <input value={bulkCount} onChange={e => setBulkCount(parseInt(e.target.value) || 5)} type="number" min="1" max="20"
                    style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13 }} />
                </div>
                <button onClick={bulkGenerate} disabled={loading} style={{ padding: '10px 24px', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  {t('bulkGenerate')}
                </button>
              </div>
            </div>

            {/* Template Injection */}
            <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
              <h4 style={{ margin: '0 0 12px', color: '#7b2dff', fontSize: 14 }}>💉 {t('templateInjection')}</h4>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 6 }}>{t('selectType')}</label>
                  <select value={selectedTemplateId || ''} onChange={e => setSelectedTemplateId(parseInt(e.target.value))}
                    style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13 }}>
                    <option value="">{t('selectType')}</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 6 }}>{t('injectionTarget')}</label>
                  <input value={injectionTarget} onChange={e => setInjectionTarget(e.target.value)} placeholder="e.g., landing_page, chat_widget"
                    style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13 }} />
                </div>
                <div style={{ width: 150 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 6 }}>{t('injectionPosition')}</label>
                  <select value={injectionPosition} onChange={e => setInjectionPosition(e.target.value)}
                    style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13 }}>
                    <option value="append">Append</option>
                    <option value="prepend">Prepend</option>
                    <option value="replace">Replace</option>
                    <option value="before">Before</option>
                    <option value="after">After</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={injectTemplate} disabled={loading} style={{ padding: '10px 20px', background: '#7b2dff', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                    💉 {t('templateInjection')}
                  </button>
                  <button onClick={renderTemplate} disabled={loading} style={{ padding: '10px 20px', background: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                    👁️ {t('preview')}
                  </button>
                </div>
              </div>
              {renderedPreview && (
                <div style={{ marginTop: 12, padding: 12, background: '#0f0f0f', borderRadius: 8, fontSize: 13, color: '#fff', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto', border: '1px solid #2a2a2a' }}>
                  {renderedPreview}
                </div>
              )}
            </div>

            {/* A/B Tests */}
            <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
              <h4 style={{ margin: '0 0 12px', color: '#ffd700', fontSize: 14 }}>🧪 {t('abTests')}</h4>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 6 }}>{t('abTests')} {t('name')}</label>
                  <input value={abTestName} onChange={e => setAbTestName(e.target.value)} placeholder="e.g., Email Subject Line Test"
                    style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 6 }}>Template IDs (comma separated)</label>
                  <input value={abTestTemplateIds} onChange={e => setAbTestTemplateIds(e.target.value)} placeholder="1,2"
                    style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13 }} />
                </div>
                <div style={{ width: 120 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 6 }}>{t('trafficSplit')}</label>
                  <input value={abTestSplit} onChange={e => setAbTestSplit(e.target.value)} placeholder="50,50"
                    style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13 }} />
                </div>
                <button onClick={createABTest} disabled={loading} style={{ padding: '10px 20px', background: '#ffd700', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  {t('createABTest')}
                </button>
              </div>
              {abTests.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {abTests.map(test => (
                    <div key={test.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: '#0f0f0f', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{test.name}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>Status: {test.status} | Split: {test.traffic_split}</div>
                      </div>
                      {test.status === 'running' && (
                        <button onClick={() => endABTest(test.id)} style={{ padding: '6px 12px', background: '#ff4444', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                          {t('endTest')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Saved Templates */}
            <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0, color: '#fff', fontSize: 14 }}>📄 {t('templates')}</h4>
                <button onClick={() => { loadTemplates(); loadInjections(); loadABTests(); }} style={{ padding: '6px 12px', background: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                  🔄 Refresh
                </button>
              </div>
              {templates.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {templates.map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 12, background: '#0f0f0f', borderRadius: 8, border: '1px solid #2a2a2a' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#00d4ff', background: '#00d4ff15', padding: '2px 8px', borderRadius: 4 }}>{t.type}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{t.name}</span>
                          <span style={{ fontSize: 11, color: t.active ? '#00ff88' : '#666' }}>{t.active ? t('active') : t('inactive')}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5, maxHeight: 60, overflow: 'hidden' }}>{t.content?.substring(0, 150)}...</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
                        <button onClick={() => { setSelectedTemplateId(t.id); renderTemplate(); }} style={{ padding: '4px 8px', background: '#00d4ff', color: '#000', border: 'none', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>
                          👁️
                        </button>
                        <button onClick={() => autoOptimizeTemplate(t.id)} style={{ padding: '4px 8px', background: '#ffd700', color: '#000', border: 'none', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>
                          ⚡
                        </button>
                        <button onClick={() => loadAnalytics(t.id)} style={{ padding: '4px 8px', background: '#00ff88', color: '#000', border: 'none', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>
                          📊
                        </button>
                        <button onClick={() => deleteTemplate(t.id)} style={{ padding: '4px 8px', background: '#ff4444', color: '#fff', border: 'none', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#666', textAlign: 'center', padding: 20 }}>
                  <p>No templates saved yet. Generate your first template above.</p>
                </div>
              )}
            </div>

            {/* Analytics */}
            {templateAnalytics && (
              <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
                <h4 style={{ margin: '0 0 12px', color: '#00ff88', fontSize: 14 }}>📊 {t('analytics')}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                  <div style={{ textAlign: 'center', padding: 12, background: '#0f0f0f', borderRadius: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#00d4ff' }}>{templateAnalytics.impressions}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{t('impressions')}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 12, background: '#0f0f0f', borderRadius: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#ffd700' }}>{templateAnalytics.clicks}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{t('clicks')}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 12, background: '#0f0f0f', borderRadius: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#00ff88' }}>{templateAnalytics.conversions}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{t('conversions')}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 12, background: '#0f0f0f', borderRadius: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#ff6b35' }}>{templateAnalytics.ctr}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{t('ctr')}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 12, background: '#0f0f0f', borderRadius: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#7b2dff' }}>{templateAnalytics.cvr}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{t('cvr')}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CODE GENERATION TAB */}
        {/* GROWTH ENGINE TAB */}
        {activeTab === 'growth' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto' }}>
            {/* Stats Header */}
            {growthStats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#00d4ff' }}>{growthStats.summary?.dailyProgress || 0}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{t('todayLeads')} / {growthStats.summary?.dailyTarget || 1000}</div>
                  <div style={{ marginTop: 8, height: 6, background: '#2a2a2a', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${growthStats.summary?.dailyPercentage || 0}%`, background: '#00d4ff', borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                </div>
                <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#00ff88' }}>{growthStats.summary?.todayConversions || 0}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{t('todayConversions')}</div>
                </div>
                <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#ffd700' }}>{growthStats.summary?.conversionRate || 0}%</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{t('conversionRate')}</div>
                </div>
                <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#ff6b35' }}>{growthStats.summary?.totalLeads || 0}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{t('totalLeads')}</div>
                </div>
              </div>
            )}

            {/* Pipeline Controls */}
            <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
              <h4 style={{ margin: '0 0 12px', color: '#00d4ff', fontSize: 14 }}>🚀 {t('pipeline')}</h4>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={runGrowthPipeline} disabled={loading || pipelineRunning} style={{ padding: '12px 24px', background: '#00d4ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {pipelineRunning ? '⚡ Running...' : '🚀 ' + t('runPipeline')}
                </button>
                <button onClick={() => runGrowthScrape('reddit')} disabled={loading} style={{ padding: '10px 20px', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  🔴 Reddit
                </button>
                <button onClick={() => runGrowthScrape('twitter')} disabled={loading} style={{ padding: '10px 20px', background: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  🐦 Twitter
                </button>
                <button onClick={() => runGrowthScrape('youtube')} disabled={loading} style={{ padding: '10px 20px', background: '#ff4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  📺 YouTube
                </button>
                <button onClick={() => runGrowthScrape('telegram')} disabled={loading} style={{ padding: '10px 20px', background: '#00d4ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  ✈️ Telegram
                </button>
                <button onClick={() => runGrowthScrape('forums')} disabled={loading} style={{ padding: '10px 20px', background: '#7b2dff', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  💬 Forums
                </button>
                <button onClick={generateGrowthContent} disabled={loading} style={{ padding: '10px 20px', background: '#ffd700', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  📝 {t('generateContent')}
                </button>
              </div>
            </div>

            {/* Mass Outreach */}
            <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
              <h4 style={{ margin: '0 0 12px', color: '#ff6b35', fontSize: 14 }}>📨 {t('massOutreach')}</h4>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 6 }}>{t('outreachTemplate')}</label>
                  <textarea value={outreachTemplate} onChange={e => setOutreachTemplate(e.target.value)} placeholder="Enter outreach template..."
                    style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
                <button onClick={sendMassOutreach} disabled={loading || selectedGrowthLeads.length === 0} style={{ padding: '10px 24px', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  {t('sendOutreach')} ({selectedGrowthLeads.length})
                </button>
              </div>
              {growthLeads.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflow: 'auto' }}>
                  {growthLeads.map(lead => (
                    <div key={lead.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 10, background: '#0f0f0f', borderRadius: 8, border: '1px solid #2a2a2a' }}>
                      <input type="checkbox" checked={selectedGrowthLeads.includes(lead.id)} onChange={e => {
                        if (e.target.checked) setSelectedGrowthLeads(prev => [...prev, lead.id])
                        else setSelectedGrowthLeads(prev => prev.filter(id => id !== lead.id))
                      }} style={{ cursor: 'pointer' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#00d4ff', background: '#00d4ff15', padding: '2px 6px', borderRadius: 4 }}>{lead.platform}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>@{lead.username}</span>
                          <span style={{ fontSize: 11, color: lead.sentiment === 'high_intent' ? '#00ff88' : lead.sentiment === 'frustrated' ? '#ff4444' : '#ffd700' }}>🔥 {lead.intent_score}/10</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4 }}>{lead.body?.substring(0, 100)}...</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#666', textAlign: 'center', padding: 20 }}>
                  <p>No leads yet. Run a pipeline scan to find prospects.</p>
                </div>
              )}
            </div>

            {/* Affiliate Registration */}
            <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
              <h4 style={{ margin: '0 0 12px', color: '#ffd700', fontSize: 14 }}>👥 {t('registerAffiliate')}</h4>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 6 }}>{t('affiliateName')}</label>
                  <input value={affiliateName} onChange={e => setAffiliateName(e.target.value)} placeholder="Name"
                    style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 6 }}>{t('affiliateEmail')}</label>
                  <input value={affiliateEmail} onChange={e => setAffiliateEmail(e.target.value)} placeholder="Email"
                    style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 6 }}>Phone</label>
                  <input value={affiliatePhone} onChange={e => setAffiliatePhone(e.target.value)} placeholder="Phone"
                    style={{ width: '100%', padding: 10, background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 13 }} />
                </div>
                <button onClick={registerAffiliate} disabled={loading} style={{ padding: '10px 24px', background: '#ffd700', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  {t('registerAffiliate')}
                </button>
              </div>
            </div>

            {/* Content Ready */}
            {growthContent.length > 0 && (
              <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
                <h4 style={{ margin: '0 0 12px', color: '#00ff88', fontSize: 14 }}>📝 {t('contentReady')} ({growthContent.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflow: 'auto' }}>
                  {growthContent.slice(0, 10).map(c => (
                    <div key={c.id} style={{ padding: 8, background: '#0f0f0f', borderRadius: 6, fontSize: 12, color: '#888' }}>
                      <span style={{ color: '#00d4ff', fontWeight: 700 }}>{c.platform}</span> — {c.content?.substring(0, 100)}...
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* INTELLIGENCE ENGINE TAB */}
        {activeTab === 'intelligence' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto' }}>
            {/* Brain Stats */}
            {brainStats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#00d4ff' }}>{brainStats.totalLeads || 0}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{t('totalLeads')}</div>
                </div>
                <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#00ff88' }}>{brainStats.validatedLeads || 0}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Validated Leads</div>
                </div>
                <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#ffd700' }}>{brainStats.highValueLeads || 0}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>High Value Leads</div>
                </div>
                <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#ff6b35' }}>{brainStats.campaignsExecuted || 0}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Campaigns Executed</div>
                </div>
                <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#7b2dff' }}>{brainStats.brainCycles || 0}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Brain Cycles</div>
                </div>
              </div>
            )}

            {/* Brain Cycle Controls */}
            <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a' }}>
              <h4 style={{ margin: '0 0 12px', color: '#00d4ff', fontSize: 14 }}>🧠 {t('brainCycle')}</h4>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={runBrainCycle} disabled={brainLoading} style={{ padding: '12px 24px', background: '#00d4ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {brainLoading ? '⚡ Running...' : '🧠 Run Brain Cycle'}
                </button>
                <button onClick={loadBrainStats} disabled={brainLoading} style={{ padding: '10px 20px', background: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  📊 Refresh Stats
                </button>
              </div>
              <p style={{ color: '#888', fontSize: 12, marginTop: 12 }}>
                The Brain Cycle: Collect → Validate → Score → Strategize → Execute → Learn
              </p>
            </div>

            {/* Brain Cycle History */}
            <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 20, border: '1px solid #2a2a2a', flex: 1, overflow: 'auto' }}>
              <h4 style={{ margin: '0 0 12px', color: '#00d4ff', fontSize: 14 }}>📜 Brain Cycle History</h4>
              {brainCycles.length === 0 ? (
                <div style={{ color: '#666', textAlign: 'center', padding: 40 }}>
                  <p>No brain cycles yet. Run the Brain Cycle to start.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {brainCycles.map((cycle, i) => (
                    <div key={i} style={{ padding: 12, background: '#0f0f0f', borderRadius: 8, border: '1px solid #2a2a2a' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ color: '#00d4ff', fontWeight: 700, fontSize: 13 }}>{cycle.cycle_name || `Brain Cycle #${cycle.id}`}</span>
                        <span style={{ color: '#888', fontSize: 11 }}>{new Date(cycle.timestamp).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 12, color: '#888' }}>
                        <div>Collected: <span style={{ color: '#00d4ff' }}>{cycle.data_collected || 0}</span></div>
                        <div>Validated: <span style={{ color: '#00ff88' }}>{cycle.data_validated || 0}</span></div>
                        <div>Campaigns: <span style={{ color: '#ffd700' }}>{cycle.campaigns_executed || 0}</span></div>
                        <div>Converted: <span style={{ color: '#ff6b35' }}>{cycle.leads_converted || 0}</span></div>
                      </div>
                      {cycle.insights && (
                        <div style={{ marginTop: 8, padding: 8, background: '#1a1a1a', borderRadius: 6, fontSize: 11, color: '#888', maxHeight: 80, overflow: 'auto' }}>
                          <strong style={{ color: '#00d4ff' }}>Insights:</strong> {cycle.insights.substring(0, 200)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
