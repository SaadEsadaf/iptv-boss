import { useState, useEffect } from 'react'
import api from '../../api'

const PERMS = [
  { id: 'overview', label: 'Overview', desc: 'Dashboard overview & stats' },
  { id: 'providers', label: 'Providers', desc: 'Manage providers & plans' },
  { id: 'codes', label: 'Codes', desc: 'Manage activation codes' },
  { id: 'trials', label: 'Trials', desc: 'Manage trial codes' },
  { id: 'orders', label: 'Orders', desc: 'View & manage orders' },
  { id: 'chat', label: 'Chat', desc: 'View chat sessions' },
  { id: 'pages', label: 'Pages', desc: 'Manage landing pages' },
  { id: 'seo', label: 'SEO', desc: 'SEO audits, leads, sources, analytics' },
  { id: 'agent-log', label: 'Agent Log', desc: 'View agent activity log' },
  { id: 'websites', label: 'Websites', desc: 'Manage websites' },
  { id: 'servers', label: 'Servers', desc: 'Manage deploy targets' },
  { id: 'domains', label: 'Domains', desc: 'Manage DNS & domains' },
  { id: 'settings', label: 'Settings', desc: 'View & edit all settings' },
  { id: 'brain', label: 'Brain', desc: 'Business brain status & control' },
]

export default function SubAdmins() {
  const [subadmins, setSubadmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ username: '', password: '', permissions: [] })

  useEffect(() => { fetchSubAdmins() }, [])

  function fetchSubAdmins() {
    setLoading(true)
    api.get('/admin/subadmins').then(r => setSubadmins(r.data)).catch(() => {}).finally(() => setLoading(false))
  }

  function togglePerm(permId) {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(permId)
        ? f.permissions.filter(p => p !== permId)
        : [...f.permissions, permId],
    }))
  }

  function openCreate() {
    setEditing(null)
    setForm({ username: '', password: '', permissions: [] })
    setShowModal(true)
  }

  function openEdit(sa) {
    setEditing(sa)
    setForm({ username: sa.username, password: '', permissions: sa.permissions || [] })
    setShowModal(true)
  }

  async function handleSave() {
    try {
      if (editing) {
        const payload = { username: form.username, permissions: form.permissions }
        if (form.password) payload.password = form.password
        await api.put(`/admin/subadmins/${editing.id}`, payload)
      } else {
        await api.post('/admin/subadmins', form)
      }
      setShowModal(false)
      fetchSubAdmins()
    } catch (e) {
      alert(e.response?.data?.error || 'Save failed')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this subadmin?')) return
    try {
      await api.delete(`/admin/subadmins/${id}`)
      fetchSubAdmins()
    } catch (e) {
      alert(e.response?.data?.error || 'Delete failed')
    }
  }

  const modalStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  }
  const cardStyle = {
    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16,
    padding: 32, width: 520, maxHeight: '90vh', overflowY: 'auto',
  }
  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2a2a2a',
    background: '#0f0f0f', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12,
  }
  const badgeStyle = (on) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8,
    border: `1px solid ${on ? '#00d4ff44' : '#2a2a2a'}`, cursor: 'pointer', fontSize: 13,
    background: on ? '#00d4ff10' : 'transparent', color: on ? '#00d4ff' : '#888',
    transition: 'all .2s', userSelect: 'none',
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Sub-Admin Accounts</h2>
        <button onClick={openCreate} style={{
          padding: '10px 24px', background: '#00d4ff', color: '#000', border: 'none',
          borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14,
        }}>+ Create Sub-Admin</button>
      </div>

      {loading && <p style={{ color: '#666' }}>Loading...</p>}

      {!loading && subadmins.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
          <p style={{ fontSize: 18, margin: '0 0 8px' }}>No sub-admin accounts yet</p>
          <p style={{ fontSize: 14, margin: 0 }}>Create one to grant limited access to your team</p>
        </div>
      )}

      {subadmins.map(sa => (
        <div key={sa.id} style={{
          background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12,
          padding: '20px 24px', marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <strong style={{ fontSize: 16 }}>{sa.username}</strong>
              <span style={{ color: '#666', fontSize: 12, marginLeft: 8 }}>
                Created {new Date(sa.created_at).toLocaleDateString()}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => openEdit(sa)} style={{
                padding: '6px 16px', background: 'transparent', color: '#00d4ff',
                border: '1px solid #00d4ff44', borderRadius: 6, cursor: 'pointer', fontSize: 13,
              }}>Edit</button>
              <button onClick={() => handleDelete(sa.id)} style={{
                padding: '6px 16px', background: 'transparent', color: '#ff4444',
                border: '1px solid #ff444444', borderRadius: 6, cursor: 'pointer', fontSize: 13,
              }}>Delete</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {sa.permissions && sa.permissions.length > 0
              ? sa.permissions.map(p => {
                  const perm = PERMS.find(x => x.id === p)
                  return perm ? (
                    <span key={p} style={{
                      padding: '4px 12px', background: '#00d4ff10', border: '1px solid #00d4ff22',
                      borderRadius: 6, fontSize: 12, color: '#00d4ff',
                    }}>{perm.label}</span>
                  ) : null
                })
              : <span style={{ color: '#666', fontSize: 13 }}>No permissions</span>
            }
          </div>
        </div>
      ))}

      {showModal && (
        <div style={modalStyle} onClick={() => setShowModal(false)}>
          <div style={cardStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>{editing ? 'Edit Sub-Admin' : 'Create Sub-Admin'}</h3>
            <input
              placeholder="Username" value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              style={inputStyle}
            />
            <input
              type="password" placeholder={editing ? 'New password (leave empty to keep)' : 'Password'}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              style={inputStyle}
            />
            <p style={{ color: '#aaa', fontSize: 13, margin: '16px 0 10px' }}>Permissions:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {PERMS.map(p => (
                <div key={p.id} style={badgeStyle(form.permissions.includes(p.id))}
                  onClick={() => togglePerm(p.id)}
                  title={p.desc}
                >
                  <span>{form.permissions.includes(p.id) ? '✓' : '+'}</span>
                  <span>{p.label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{
                padding: '10px 24px', background: 'transparent', color: '#aaa',
                border: '1px solid #2a2a2a', borderRadius: 8, cursor: 'pointer', fontSize: 14,
              }}>Cancel</button>
              <button onClick={handleSave} style={{
                padding: '10px 24px', background: '#00d4ff', color: '#000',
                border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14,
              }}>{editing ? 'Save Changes' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
