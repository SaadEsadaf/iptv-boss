import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api'

export default function DynamicLP() {
  const { slug } = useParams()
  const [html, setHtml] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    api.get(`/lp/${slug}`).then(r => {
      setHtml(r.data)
    }).catch(() => setError(true))
  }, [slug])

  if (error) {
    return (
      <div style={{ background: '#0f0f0f', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <h1 style={{ color: '#00d4ff' }}>Page Not Found</h1>
        <p style={{ color: '#a0a0a0' }}>The page you're looking for doesn't exist.</p>
        <a href="/" style={{ color: '#00d4ff', marginTop: 16 }}>Go Home</a>
      </div>
    )
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
