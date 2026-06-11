import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ws = typeof window !== 'undefined' && window.__WEBSITE__
const lang = ws?.language || 'fr'

const FR = {
  title: 'Blog Atlas Pro IPTV',
  subtitle: 'Actualités, guides, astuces et nouveautés du monde IPTV',
  home: 'Accueil',
  blog: 'Blog',
  support: 'Support',
  downloads: 'Téléchargements',
  freeTrial: 'Essai Gratuit',
  readMore: 'Lire l\'article',
  by: 'Par',
  comments: 'commentaires',
  share: 'Partager',
  relatedPosts: 'Articles similaires',
  showComments: 'Afficher les commentaires',
  hideComments: 'Masquer les commentaires',
}

const t = (key) => lang === 'fr' ? (FR[key] || key) : key

const ARTICLES = [
  {
    id: 1,
    title: 'Atlas Pro IPTV – Le Meilleur Service IPTV en France en 2026',
    excerpt: 'Découvrez pourquoi Atlas Pro IPTV est devenu le leader des services IPTV en France. Plus de 179 000 chaînes, 4K Ultra HD, et une stabilité incomparable.',
    date: '10 Juin 2026',
    author: 'Alex',
    authorRole: 'Expert IPTV',
    image: '📺',
    category: 'Guide',
    readTime: '4 min',
    tags: ['Atlas Pro', 'IPTV', 'France', 'Comparatif'],
    content: [
      { type: 'p', text: 'L\'IPTV a révolutionné la façon dont nous consommons la télévision. En 2026, Atlas Pro IPTV s\'impose comme le service le plus complet et le plus fiable du marché français.' },
      { type: 'h3', text: 'Pourquoi Atlas Pro IPTV domine le marché ?' },
      { type: 'p', text: 'Avec un catalogue de plus de 179 000 chaînes, des milliers de films et séries en VOD, et une qualité 4K Ultra HD, Atlas Pro IPTV offre une expérience incomparable. Les utilisateurs bénéficient d\'une stabilité à 99.9% grâce à des serveurs redondants en Europe.' },
      { type: 'ul', items: ['179 915 chaînes live', '25 000+ films et séries VOD', '4K Ultra HD sur les chaînes principales', 'Anti-freeze et anti-buffer technologique', 'Applications officielles pour tous les appareils', 'Support client réactif 7j/7'] },
      { type: 'h3', text: 'Des prix adaptés à tous les besoins' },
      { type: 'p', text: 'Que vous soyez un utilisateur occasionnel ou un passionné de sport, Atlas Pro a un plan pour vous. Du forfait Basic à 9,99€/mois jusqu\'à l\'Annuel à 69,99€/an (économie de 42%), chaque plan est conçu pour offrir le meilleur rapport qualité-prix.' },
      { type: 'h3', text: 'Applications officielles' },
      { type: 'p', text: 'L\'un des plus grands atouts d\'Atlas Pro IPTV est la disponibilité d\'applications officielles. Atlas Pro ONTV pour Android/Fire TV et Atlas Pro IPTV Ontv GSE pour iOS/Apple TV offrent une expérience fluide et optimisée. Plus besoin de configuration complexe : entrez votre code d\'activation et regardez !' },
      { type: 'cta', text: '🏆 Essayez Atlas Pro IPTV gratuitement pendant 24h', link: '/' },
    ],
    comments: [
      { name: 'Jean-Michel L.', avatar: 'JM', date: '10 Juin 2026', text: 'Utilisateur depuis 6 mois, je confirme que c\'est le meilleur service IPTV que j\'ai testé. Le support est vraiment réactif !', likes: 24 },
      { name: 'Sophie D.', avatar: 'SD', date: '9 Juin 2026', text: 'Passée de Canalsat à Atlas Pro. J\'économise 80€/mois et j\'ai plus de chaînes. Je recommande à 100% !', likes: 18 },
      { name: 'Karim B.', avatar: 'KB', date: '8 Juin 2026', text: 'La qualité 4K est incroyable. Les matchs de la LDC sont superbes. Et le service après-vente est au top.', likes: 15 },
      { name: 'Marie C.', avatar: 'MC', date: '7 Juin 2026', text: 'Installation hyper simple sur ma Fire TV avec l\'app officielle. Mon mari qui n\'est pas technique a réussi tout seul !', likes: 12 },
    ],
  },
  {
    id: 2,
    title: 'Comment Installer Atlas Pro IPTV sur Tous Vos Appareils ? Guide Complet 2026',
    excerpt: 'Guide pas à pas pour installer Atlas Pro IPTV sur Firestick, Android TV, iPhone, iPad, Apple TV, Smart TV, PC et Mac.',
    date: '8 Juin 2026',
    author: 'Alex',
    authorRole: 'Expert IPTV',
    image: '📱',
    category: 'Tutoriel',
    readTime: '6 min',
    tags: ['Installation', 'Guide', 'Firestick', 'Android TV', 'iOS', 'Apple TV'],
    content: [
      { type: 'p', text: 'Que vous soyez sur Firestick, Android TV, iPhone, ou Smart TV, installer Atlas Pro IPTV est plus simple que vous ne le pensez. Suivez notre guide complet.' },
      { type: 'h3', text: 'Sur Amazon Fire TV / Firestick' },
      { type: 'p', text: 'Le Firestick est le dispositif le plus populaire pour l\'IPTV. Voici comment installer Atlas Pro :' },
      { type: 'ol', items: [
        'Allez dans Paramètres → Mon Fire TV → Options pour les développeurs → Activez "Applications provenant de sources inconnues"',
        'Installez "Downloader" depuis l\'Amazon App Store',
        'Ouvrez Downloader et entrez l\'URL de l\'APK Atlas Pro ONTV',
        'Téléchargez et installez l\'application',
        'Ouvrez Atlas Pro ONTV et entrez votre code d\'activation',
        'Profitez de vos chaînes !'
      ]},
      { type: 'h3', text: 'Sur iPhone, iPad et Apple TV' },
      { type: 'p', text: 'Atlas Pro IPTV Ontv GSE est disponible sur l\'App Store officiel. Téléchargez l\'application, ouvrez-la et entrez votre code d\'abonné actif. L\'interface est optimisée pour iOS et tvOS avec une navigation fluide.' },
      { type: 'h3', text: 'Sur Android TV / Google TV' },
      { type: 'p', text: 'Deux options : l\'application officielle Atlas Pro ONTV (disponible sur le Google Play Store) ou des applications tierces comme TiviMate (recommandé pour les puristes) et IPTV Smarters (pour les débutants).' },
      { type: 'h3', text: 'Sur PC et Mac' },
      { type: 'p', text: 'Utilisez VLC Media Player. Ouvrez VLC → Media → Open Network Stream → collez votre lien M3U. Simple et rapide pour tester vos chaînes.' },
      { type: 'cta', text: '📥 Téléchargez les applications Atlas Pro', link: '/downloads' },
    ],
    comments: [
      { name: 'Pierre A.', avatar: 'PA', date: '8 Juin 2026', text: 'Merci pour ce guide ! L\'installation sur Firestick a pris 5 minutes chrono.', likes: 9 },
      { name: 'Leila M.', avatar: 'LM', date: '7 Juin 2026', text: 'Enfin un guide clair ! J\'ai tout installé sur ma Samsung TV et ça marche parfaitement.', likes: 7 },
      { name: 'Thomas R.', avatar: 'TR', date: '6 Juin 2026', text: 'Petite précision : pour les débutants, IPTV Smarters est vraiment plus simple que TiviMate. Mais TiviMate est plus beau.', likes: 5 },
    ],
  },
  {
    id: 3,
    title: 'Coupe du Monde 2026 : Regardez Tous les Matchs en Direct sur Atlas Pro IPTV',
    excerpt: 'Ne manquez aucun match de la Coupe du Monde 2026 avec Atlas Pro IPTV. Diffusion intégrale en 4K, multi-angles, et sans coupure.',
    date: '5 Juin 2026',
    author: 'Alex',
    authorRole: 'Expert IPTV',
    image: '🏆',
    category: 'Sport',
    readTime: '3 min',
    tags: ['Coupe du Monde', '2026', 'Sport', 'Direct', '4K'],
    content: [
      { type: 'p', text: 'La Coupe du Monde 2026 bat son plein et avec Atlas Pro IPTV, vous ne manquerez rien de cet événement planétaire. Tous les matchs en direct, en 4K Ultra HD, sur tous vos appareils.' },
      { type: 'h3', text: 'Pourquoi choisir Atlas Pro pour la Coupe du Monde ?' },
      { type: 'ul', items: [
        'Tous les matchs en direct (48 équipes, 104 matchs)',
        'Qualité 4K Ultra HD sans buffer',
        'Multi-angles : choisissez votre caméra',
        'Replay : revoyez les matchs après diffusion',
        'Jusqu\'à 4 écrans simultanés avec le plan Premium',
        'Compatible avec tous les appareils'
      ]},
      { type: 'p', text: 'Profitez de chaque but, chaque arrêt, chaque émotion en direct avec une qualité d\'image exceptionnelle. Nos serveurs sont dimensionnés pour absorber les pics de charge des grands événements.' },
      { type: 'cta', text: '⚽ Essayez Gratuitement pour la Coupe du Monde', link: '/' },
    ],
    comments: [
      { name: 'Hassan K.', avatar: 'HK', date: '5 Juin 2026', text: 'Les matchs en 4K sont magnifiques. Aucune coupure même pendant les heures de pointe. Impressionnant !', likes: 31 },
      { name: 'Antoine V.', avatar: 'AV', date: '4 Juin 2026', text: 'J\'ai regardé le match d\'ouverture sans aucun problème. Mes potes qui ont Canalsat avaient des coupures, pas moi !', likes: 22 },
      { name: 'Yassine E.', avatar: 'YE', date: '4 Juin 2026', text: 'Le multi-angles est génial. Je regarde le match principal sur ma TV et les autres matchs sur ma tablette en même temps.', likes: 17 },
    ],
  },
  {
    id: 4,
    title: 'IPTV vs Câble : Pourquoi Les Français Passent à Atlas Pro IPTV en 2026',
    excerpt: 'Comparaison détaillée entre les abonnements TV traditionnels et l\'IPTV. Découvrez pourquoi des milliers de Français font le switch.',
    date: '3 Juin 2026',
    author: 'Alex',
    authorRole: 'Expert IPTV',
    image: '⚡',
    category: 'Comparatif',
    readTime: '5 min',
    tags: ['Comparatif', 'IPTV vs Câble', 'Économies', 'France'],
    content: [
      { type: 'p', text: 'En 2026, le débat n\'est plus entre l\'IPTV et le câble — l\'IPTV a gagné. Voici pourquoi des milliers de Français abandonnent chaque mois leurs abonnements traditionnels pour Atlas Pro IPTV.' },
      { type: 'h3', text: 'Le prix : la différence est abyssale' },
      { type: 'p', text: 'Canalsat : 49,99€/mois pour 200 chaînes. Bouygues TV : 29,99€/mois. Orange TV : 35,99€/mois. Atlas Pro IPTV : à partir de 9,99€/mois pour 179 915 chaînes. Le calcul est vite fait : économisez jusqu\'à 80% sur votre facture TV.' },
      { type: 'h3', text: 'Le contenu : l\'IPTV surpasse tout' },
      { type: 'ul', items: [
        'Chaînes : 179 915 (vs 200 pour Canalsat)',
        'VOD : 25 000+ films et séries (illimité)',
        'Régions : France, Monde, Sport, Enfants, Découverte...',
        'Qualité : 4K Ultra HD, HDR, 60fps',
        'Multi-écrans : jusqu\'à 4 appareils simultanés'
      ]},
      { type: 'h3', text: 'La flexibilité : regardez partout, sur tout' },
      { type: 'p', text: 'Avec le câble, vous êtes coincé devant votre TV. Avec Atlas Pro IPTV, regardez vos chaînes sur votre TV, votre téléphone dans le métro, votre tablette au lit, votre PC au bureau. Vos amis qui sont restés chez Orange vous envieront.' },
      { type: 'cta', text: '💶 Faites le switch maintenant — Économisez 80%', link: '/' },
    ],
    comments: [
      { name: 'François D.', avatar: 'FD', date: '3 Juin 2026', text: 'Je payais 78€/mois chez Free. Maintenant 9.99€. Même pas besoin de m\'adapter, j\'ai tout de suite accroché.', likes: 35 },
      { name: 'Amina S.', avatar: 'AS', date: '2 Juin 2026', text: 'Le meilleur argument pour moi c\'est la portabilité. Je regarde dans le bus, à la pause dej, partout !', likes: 14 },
      { name: 'Luc P.', avatar: 'LP', date: '2 Juin 2026', text: 'J\'hésitais depuis 1 an. Finalement j\'ai sauté le pas et je regrette de ne pas l\'avoir fait plus tôt.', likes: 10 },
    ],
  },
]

export default function BlogPage() {
  const navigate = useNavigate()
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [showComments, setShowComments] = useState({})

  const article = selectedArticle !== null ? ARTICLES.find(a => a.id === selectedArticle) : null

  if (article) {
    return (
      <div style={{ minHeight: '100vh', background: '#050510', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <nav style={{ position: 'sticky', top: 0, background: '#050510ee', backdropFilter: 'blur(20px)', borderBottom: '1px solid #ffffff10', zIndex: 100, padding: '0 20px' }}>
          <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', alignItems: 'center', height: 68, gap: 32 }}>
            <div onClick={() => navigate('/')} style={{ fontSize: 24, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: 28 }}>LUX</span>
              <span style={{ color: '#fff' }}>STREAM</span>
            </div>
            <div style={{ display: 'flex', gap: 20, flex: 1, justifyContent: 'center' }}>
              <a onClick={() => navigate('/')} style={{ color: '#8888aa', textDecoration: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Accueil</a>
              <a onClick={() => setSelectedArticle(null)} style={{ color: '#00d4ff', textDecoration: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Blog</a>
              <a onClick={() => navigate('/support')} style={{ color: '#8888aa', textDecoration: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Support</a>
              <a onClick={() => navigate('/downloads')} style={{ color: '#8888aa', textDecoration: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Téléchargements</a>
            </div>
            <button onClick={() => navigate('/')} style={{ padding: '9px 24px', background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', color: '#fff', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer', fontSize: 13, boxShadow: '0 4px 20px #ff6b3533' }}>
              Essai Gratuit
            </button>
          </div>
        </nav>

        <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 80px' }}>
          <button onClick={() => setSelectedArticle(null)} style={{ background: 'transparent', border: 'none', color: '#00d4ff', cursor: 'pointer', fontSize: 14, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
            ← Retour aux articles
          </button>

          <div style={{ fontSize: 48, marginBottom: 16 }}>{article.image}</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#00d4ff', background: '#00d4ff20', padding: '4px 10px', borderRadius: 20 }}>{article.category}</span>
            <span style={{ fontSize: 12, color: '#666' }}>{article.readTime}</span>
            <span style={{ fontSize: 12, color: '#666' }}>•</span>
            <span style={{ fontSize: 12, color: '#666' }}>{article.date}</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 12, lineHeight: 1.3 }}>{article.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#00d4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#000' }}>{article.author[0]}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{t('by')} {article.author}</div>
              <div style={{ color: '#666', fontSize: 11 }}>{article.authorRole}</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #ffffff10', paddingTop: 24 }}>
            {article.content.map((block, i) => {
              if (block.type === 'p') return <p key={i} style={{ color: '#a0a0a0', fontSize: 15, lineHeight: 1.7, marginBottom: 16 }}>{block.text}</p>
              if (block.type === 'h3') return <h3 key={i} style={{ fontSize: 20, fontWeight: 700, marginTop: 28, marginBottom: 12, color: '#fff' }}>{block.text}</h3>
              if (block.type === 'ul') return (
                <ul key={i} style={{ color: '#a0a0a0', fontSize: 14, lineHeight: 1.8, paddingLeft: 20, marginBottom: 16 }}>
                  {block.items.map((item, j) => <li key={j} style={{ marginBottom: 4 }}>✅ {item}</li>)}
                </ul>
              )
              if (block.type === 'ol') return (
                <ol key={i} style={{ color: '#a0a0a0', fontSize: 14, lineHeight: 1.8, paddingLeft: 20, marginBottom: 16 }}>
                  {block.items.map((item, j) => <li key={j} style={{ marginBottom: 6 }}>{j+1}. {item}</li>)}
                </ol>
              )
              if (block.type === 'cta') return (
                <div key={i} style={{ textAlign: 'center', margin: '28px 0', padding: '24px', background: '#0a1628', borderRadius: 14, border: '1px solid #00d4ff20' }}>
                  <button onClick={() => navigate(block.link)} style={{
                    padding: '14px 32px',
                    background: 'linear-gradient(135deg, #ff6b35, #ff2d92)',
                    color: '#fff', border: 'none', borderRadius: 50,
                    fontWeight: 700, cursor: 'pointer', fontSize: 15,
                    boxShadow: '0 4px 20px rgba(255,45,146,0.3)',
                  }}>
                    {block.text}
                  </button>
                </div>
              )
              return null
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 24, paddingTop: 24, borderTop: '1px solid #ffffff10' }}>
            {article.tags.map(tag => (
              <span key={tag} style={{ fontSize: 12, color: '#666', background: '#0a0a1a', padding: '4px 12px', borderRadius: 20, border: '1px solid #ffffff10' }}>
                #{tag}
              </span>
            ))}
          </div>

          <div style={{ marginTop: 40 }}>
            <button onClick={() => setShowComments(s => ({ ...s, [article.id]: !s[article.id] }))} style={{
              width: '100%', padding: '12px', background: '#0a0a1a', border: '1px solid #ffffff10',
              borderRadius: 10, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              💬 {article.comments.length} {t(showComments[article.id] ? 'hideComments' : 'showComments')}
            </button>
            {showComments[article.id] && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {article.comments.map((c, i) => (
                  <div key={i} style={{ background: '#0a0a1a', border: '1px solid #ffffff08', borderRadius: 12, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ff6b3520', color: '#ff6b35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{c.avatar}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                        <div style={{ color: '#666', fontSize: 11 }}>{c.date}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', color: '#ff6b35', fontSize: 12 }}>❤️ {c.likes}</div>
                    </div>
                    <p style={{ color: '#a0a0a0', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{c.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <footer style={{ borderTop: '1px solid #ffffff10', padding: '24px', textAlign: 'center', color: '#666', fontSize: 13 }}>
          © 2026 LuxStream. Tous droits réservés.
        </footer>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050510', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, background: '#050510ee', backdropFilter: 'blur(20px)', borderBottom: '1px solid #ffffff10', zIndex: 100, padding: '0 20px' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', alignItems: 'center', height: 68, gap: 32 }}>
          <div onClick={() => navigate('/')} style={{ fontSize: 24, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: 28 }}>LUX</span>
            <span style={{ color: '#fff' }}>STREAM</span>
          </div>
          <div style={{ display: 'flex', gap: 20, flex: 1, justifyContent: 'center' }}>
            <a onClick={() => navigate('/')} style={{ color: '#8888aa', textDecoration: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Accueil</a>
            <a style={{ color: '#00d4ff', textDecoration: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Blog</a>
            <a onClick={() => navigate('/support')} style={{ color: '#8888aa', textDecoration: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Support</a>
            <a onClick={() => navigate('/downloads')} style={{ color: '#8888aa', textDecoration: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Téléchargements</a>
          </div>
          <button onClick={() => navigate('/')} style={{ padding: '9px 24px', background: 'linear-gradient(135deg, #ff6b35, #ff2d92)', color: '#fff', border: 'none', borderRadius: 50, fontWeight: 700, cursor: 'pointer', fontSize: 13, boxShadow: '0 4px 20px #ff6b3533' }}>
            Essai Gratuit
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8, background: 'linear-gradient(135deg, #ff6b35, #ff2d92, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('title')}
          </h1>
          <p style={{ color: '#8888aa', fontSize: 16 }}>{t('subtitle')}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
          {ARTICLES.map(article => (
            <div key={article.id} onClick={() => setSelectedArticle(article.id)} style={{
              background: 'linear-gradient(135deg, #0a1628, #1a1a2e)',
              border: '1px solid #ffffff10', borderRadius: 16, overflow: 'hidden',
              cursor: 'pointer', transition: 'all 0.3s',
            }}>
              <div style={{
                height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 56, background: 'radial-gradient(ellipse at center, #00d4ff10, transparent)',
              }}>
                {article.image}
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#00d4ff', background: '#00d4ff20', padding: '3px 8px', borderRadius: 20 }}>{article.category}</span>
                  <span style={{ fontSize: 11, color: '#666' }}>{article.readTime}</span>
                </div>
                <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>{article.title}</h2>
                <p style={{ color: '#a0a0a0', fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>{article.excerpt}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666', fontSize: 12 }}>{article.date}</span>
                  <span style={{ color: '#00d4ff', fontSize: 13, fontWeight: 600 }}>{t('readMore')} →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer style={{ borderTop: '1px solid #ffffff10', padding: '24px', textAlign: 'center', color: '#666', fontSize: 13 }}>
        © 2026 LuxStream. Tous droits réservés.
      </footer>
    </div>
  )
}
