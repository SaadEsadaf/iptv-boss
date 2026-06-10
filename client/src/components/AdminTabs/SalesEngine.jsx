import { useState, useEffect } from 'react'
import api from '../../api'

const SEQUENCE_TYPES = {
  hot_lead: '🔥 Hot Lead (5 emails)',
  warm_lead: '🌡️ Warm Lead (4 emails)',
  cold_lead: '❄️ Cold Lead (3 emails)',
  trial_to_paid: '🎁 Trial → Paid (4 emails)',
  abandoned_cart: '🛒 Abandoned Cart (3 emails)',
}

export default function SalesEngine() {
  const [stats, setStats] = useState(null)
  const [queue, setQueue] = useState([])
  const [activity, setActivity] = useState([])
  const [scoredLeads, setScoredLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [enrolling, setEnrolling] = useState(false)
  const [enrollEmail, setEnrollEmail] = useState('')
  const [enrollSequence, setEnrollSequence] = useState('hot_lead')
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [whatsappMsg, setWhatsappMsg] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [statsRes, queueRes, activityRes, leadsRes] = await Promise.all([
        axios.get('/api/sales-engine/stats'),
        axios.get('/api/sales-engine/queue'),
        axios.get('/api/sales-engine/activity'),
        axios.get('/api/sales-engine/leads/scored'),
      ])
      setStats(statsRes.data)
      setQueue(queueRes.data.queue)
      setActivity(activityRes.data.logs)
      setScoredLeads(leadsRes.data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function handleEnroll() {
    if (!enrollEmail) return
    setEnrolling(true)
    try {
      const res = await axios.post('/api/sales-engine/enroll-lead', {
        email: enrollEmail,
        sequenceType: enrollSequence,
      })
      alert(`Enrolled! ${res.data.emailsQueued} emails queued.`)
      setEnrollEmail('')
      loadData()
    } catch (e) {
      alert('Error: ' + e.response?.data?.error || e.message)
    }
    setEnrolling(false)
  }

  async function handleProcessQueue() {
    try {
      const res = await axios.post('/api/sales-engine/process-queue')
      alert(`Processed ${res.data.processed} emails`)
      loadData()
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  async function handleWhatsApp() {
    if (!whatsappPhone || !whatsappMsg) return
    try {
      const res = await axios.post('/api/sales-engine/whatsapp/send', {
        phone: whatsappPhone,
        message: whatsappMsg,
      })
      if (res.data.success) {
        alert('WhatsApp message sent!')
        setWhatsappPhone('')
        setWhatsappMsg('')
        loadData()
      } else {
        alert('Failed: ' + JSON.stringify(res.data.error))
      }
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  if (loading) return <div className="p-6 text-gray-400">Loading sales engine...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Sales Engine</h2>
          <p className="text-gray-400 text-sm mt-1">AI-powered conversion machine — auto-enrolls leads in email sequences</p>
        </div>
        <button
          onClick={handleProcessQueue}
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-2 rounded-lg text-sm"
        >
          ⚡ Process Email Queue Now
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Leads" value={stats?.totalLeads || 0} color="cyan" />
        <StatCard label="Enrolled in Sequences" value={stats?.enrolledInSequence || 0} color="green" />
        <StatCard label="Emails Sent" value={stats?.emailsSent || 0} color="blue" />
        <StatCard label="Conversion Rate" value={`${stats?.conversionRate || 0}%`} color="purple" />
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-700 pb-2">
        {['overview', 'queue', 'leads', 'activity', 'manual'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium capitalize ${
              activeTab === tab ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Sequence Performance</h3>
            <div className="space-y-3">
              {stats?.bySequence?.map(s => (
                <div key={s.sequence_type} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">{SEQUENCE_TYPES[s.sequence_type] || s.sequence_type}</span>
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-700 rounded-full h-2 w-32 overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full"
                        style={{ width: `${s.total > 0 ? (s.sent / s.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-gray-400 text-xs">{s.sent}/{s.total}</span>
                  </div>
                </div>
              ))}
              {(!stats?.bySequence || stats.bySequence.length === 0) && (
                <p className="text-gray-500 text-sm">No sequences active yet</p>
              )}
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-white mb-4">WhatsApp Outreach</h3>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-green-400">{stats?.whatsappSent || 0}</div>
              <div className="text-gray-400 text-sm">WhatsApp messages sent to leads with phone numbers</div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Phone number (e.g. +33612345678)"
                value={whatsappPhone}
                onChange={e => setWhatsappPhone(e.target.value)}
                className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm w-full"
              />
              <input
                type="text"
                placeholder="Message"
                value={whatsappMsg}
                onChange={e => setWhatsappMsg(e.target.value)}
                className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm w-full"
              />
            </div>
            <button
              onClick={handleWhatsApp}
              className="mt-3 bg-green-600 hover:bg-green-500 text-white font-semibold px-4 py-2 rounded-lg text-sm"
            >
              📱 Send WhatsApp Message
            </button>
          </div>
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="bg-gray-800 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Email Queue ({queue.length} pending)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Sequence</th>
                  <th className="text-left py-2">Step</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {queue.slice(0, 30).map(q => (
                  <tr key={q.id} className="border-b border-gray-700/50">
                    <td className="py-2 text-gray-300">{q.lead_email}</td>
                    <td className="py-2 text-gray-400 text-xs">{SEQUENCE_TYPES[q.sequence_type] || q.sequence_type}</td>
                    <td className="py-2 text-gray-400">{q.template_index + 1}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        q.status === 'sent' ? 'bg-green-900 text-green-300' :
                        q.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                        'bg-red-900 text-red-300'
                      }`}>{q.status}</span>
                    </td>
                    <td className="py-2 text-gray-400 text-xs">{q.scheduled_at}</td>
                  </tr>
                ))}
                {queue.length === 0 && <tr><td colSpan="5" className="py-4 text-gray-500 text-center">No emails in queue</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'leads' && (
        <div className="bg-gray-800 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Scored Leads</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2">Score</th>
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Source</th>
                  <th className="text-left py-2">Language</th>
                  <th className="text-left py-2">Intent</th>
                  <th className="text-left py-2">Category</th>
                </tr>
              </thead>
              <tbody>
                {scoredLeads.slice(0, 30).map(l => (
                  <tr key={l.id} className="border-b border-gray-700/50">
                    <td className="py-2">
                      <span className={`font-bold ${
                        l.score >= 80 ? 'text-red-400' : l.score >= 60 ? 'text-yellow-400' : 'text-gray-400'
                      }`}>{l.score}</span>
                    </td>
                    <td className="py-2 text-gray-300">{l.email || '—'}</td>
                    <td className="py-2 text-gray-400 text-xs">{l.source}</td>
                    <td className="py-2 text-gray-400">{l.language}</td>
                    <td className="py-2 text-gray-400">{l.intent_score}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        l.lead_category === 'hot' ? 'bg-red-900 text-red-300' :
                        l.lead_category === 'warm' ? 'bg-yellow-900 text-yellow-300' :
                        'bg-gray-700 text-gray-300'
                      }`}>{l.lead_category}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-gray-800 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-2">
            {activity.slice(0, 50).map(log => (
              <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-700/30">
                <div className="text-gray-500 text-xs mt-1">{log.created_at?.split('T')[1]?.slice(0,8) || ''}</div>
                <div>
                  <span className="text-cyan-400 text-sm font-medium">{log.action}</span>
                  {log.details && <span className="text-gray-400 text-sm ml-2">{log.details}</span>}
                </div>
              </div>
            ))}
            {activity.length === 0 && <p className="text-gray-500 text-sm">No activity yet</p>}
          </div>
        </div>
      )}

      {activeTab === 'manual' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Manual Enrollment</h3>
            <p className="text-gray-400 text-sm mb-4">Manually enroll a lead in an email sequence</p>
            <div className="flex gap-3">
              <input
                type="email"
                placeholder="Lead email address"
                value={enrollEmail}
                onChange={e => setEnrollEmail(e.target.value)}
                className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm flex-1"
              />
              <select
                value={enrollSequence}
                onChange={e => setEnrollSequence(e.target.value)}
                className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm"
              >
                {Object.entries(SEQUENCE_TYPES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <button
                onClick={handleEnroll}
                disabled={enrolling || !enrollEmail}
                className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-600 text-black font-semibold px-4 py-2 rounded-lg text-sm"
              >
                {enrolling ? 'Enrolling...' : '🚀 Enroll'}
              </button>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Sequence Breakdown</h3>
            <div className="space-y-4">
              {Object.entries(SEQUENCE_TYPES).map(([key, label]) => {
                const days = key === 'hot_lead' ? '0, 2, 4, 6, 8' :
                             key === 'warm_lead' ? '0, 3, 5, 8' :
                             key === 'cold_lead' ? '0, 5, 10' :
                             key === 'trial_to_paid' ? '1, 2, 3, 4' :
                             '0, 1, 2'
                return (
                  <div key={key} className="border border-gray-700 rounded-lg p-4">
                    <div className="font-medium text-white text-sm mb-2">{label}</div>
                    <div className="text-gray-400 text-xs">Sends over {key === 'hot_lead' ? '8' : key === 'warm_lead' ? '8' : key === 'cold_lead' ? '10' : key === 'trial_to_paid' ? '4' : '2'} days</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  const colors = {
    cyan: 'border-cyan-500/30 bg-cyan-500/5',
    green: 'border-green-500/30 bg-green-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5',
  }
  return (
    <div className={`rounded-xl p-4 border ${colors[color]}`}>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-gray-400 text-sm mt-1">{label}</div>
    </div>
  )
}