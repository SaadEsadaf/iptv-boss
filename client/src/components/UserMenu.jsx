import { useState } from 'react'

const ws = typeof window !== 'undefined' && window.__WEBSITE__
const lang = ws?.language || 'en'
const FR = {
  mySubscriptions: 'Mes Abonnements',
  expired: 'Expiré', daysLeft: 'j restants',
  started: 'Début :', ends: 'Fin :',
  noSubscriptions: 'Aucun abonnement pour le moment. Achetez un forfait pour commencer !',
  signOut: 'Déconnexion',
}
const t = (key) => lang === 'fr' ? (FR[key] || key) : key

function getDaysRemaining(expiresAt) {
  const diff = new Date(expiresAt) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function UserMenu({ user, subscriptions, onSignOut }) {
  const [open, setOpen] = useState(false)

  const initials = (user.name || user.email || '?').charAt(0).toUpperCase()

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 6px',
        background: 'transparent', border: '1px solid #ffffff12', borderRadius: 50,
        cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
      }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#00d4ff44'; e.currentTarget.style.background = '#ffffff08' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#ffffff12'; e.currentTarget.style.background = 'transparent' }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: '#00d4ff', color: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12,
        }}>{initials}</div>
        <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.name || user.email}
        </span>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
          <div style={{
            position: 'absolute', top: '100%', right: 0, zIndex: 100, marginTop: 8,
            background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12,
            minWidth: 320, maxHeight: 480, overflowY: 'auto',
          }}>
            <div style={{ padding: 16, borderBottom: '1px solid #2a2a2a' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{user.name}</div>
              <div style={{ color: '#666', fontSize: 12 }}>{user.email}</div>
            </div>

            <div style={{ padding: 12 }}>
              <div style={{ color: '#a0a0a0', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                {t('mySubscriptions')} {subscriptions?.length > 0 ? `(${subscriptions.length})` : ''}
              </div>
              {subscriptions?.length > 0 ? subscriptions.map(sub => {
                const daysLeft = getDaysRemaining(sub.expires_at)
                const expired = daysLeft <= 0
                return (
                  <div key={sub.order_id} style={{
                    background: '#0f0f0f', borderRadius: 8, padding: 12, marginBottom: 8,
                    border: '1px solid', borderColor: expired ? '#ff444433' : '#00cc6644',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{sub.provider_name} — {sub.plan_name}</span>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                        background: expired ? '#ff444420' : '#00cc6620',
                        color: expired ? '#ff4444' : '#00cc66',
                      }}>
                        {expired ? t('expired') : `${daysLeft}${t('daysLeft')}`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: 11 }}>
                      <span>{t('started')} {new Date(sub.purchased_at).toLocaleDateString()}</span>
                      <span>{t('ends')} {new Date(sub.expires_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                )
              }) : (
                <p style={{ color: '#555', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
                  {t('noSubscriptions')}
                </p>
              )}
            </div>

            <div style={{ padding: '8px 12px 12px', borderTop: '1px solid #2a2a2a' }}>
              <button onClick={() => { onSignOut(); setOpen(false) }} style={{
                width: '100%', padding: '10px', background: 'transparent', color: '#ff4444',
                border: '1px solid #ff444433', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13,
              }}>{t('signOut')}</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
