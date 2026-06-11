const express = require('express')
const { Pool } = require('pg')
const { getDb } = require('../db')

const router = express.Router()

const pgPool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'xtream_crawler',
  password: 'xtream_crawler_pass_2026',
  database: 'xtream_vault',
  max: 3,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 3000,
})

async function queryPG(text, params) {
  const client = await pgPool.connect()
  try {
    const res = await client.query(text, params)
    return res.rows
  } finally {
    client.release()
  }
}

router.get('/events', async (req, res) => {
  try {
    const sports = await queryPG(`
      SELECT ep.title, ec.display_name as channel, ep.source,
        to_char(to_timestamp(ep.start_ts), 'HH24:MI') as start_time,
        to_char(to_timestamp(ep.stop_ts), 'HH24:MI') as stop_time
      FROM epg_programs ep
      JOIN epg_channels ec ON ep.epg_channel_id = ec.epg_id
      WHERE 
        LOWER(ep.title) LIKE '%' || ANY($1) || '%'
        OR LOWER(ec.display_name) LIKE '%' || ANY($1) || '%'
      ORDER BY ep.start_ts DESC
      LIMIT 40
    `, [['sport', 'football', 'world cup', 'nba', 'ufc', 'boxing', 'tennis', 'formula', 'champions league', 'fifa', 'match', 'game', 'nfl', 'mlb', 'hockey', 'wrestling']])

    const movies = await queryPG(`
      SELECT ep.title, ec.display_name as channel, ep.source,
        to_char(to_timestamp(ep.start_ts), 'HH24:MI') as start_time
      FROM epg_programs ep
      JOIN epg_channels ec ON ep.epg_channel_id = ec.epg_id
      WHERE 
        (LOWER(ep.title) LIKE '%movie%' OR LOWER(ep.title) LIKE '%film%'
         OR LOWER(ec.display_name) LIKE '%movie%' OR LOWER(ec.display_name) LIKE '%cinema%'
         OR LOWER(ec.display_name) LIKE '%film%')
      ORDER BY ep.start_ts DESC
      LIMIT 20
    `)

    const db = getDb()
    const m3uRow = db.prepare("SELECT value FROM app_settings WHERE key = 'm3u_data_4'").get()
    let stats = { live: 0, movies: 0, series: 0, total: 0 }
    if (m3uRow) {
      try {
        const m3u = JSON.parse(m3uRow.value)
        stats = m3u.stats || stats
      } catch {}
    }

    // Get provider info
    const provider = db.prepare("SELECT name, specialty FROM providers_catalog WHERE id = 4").get()
    const planCount = db.prepare("SELECT COUNT(*) as c FROM provider_plans WHERE provider_id = 4 AND active = 1").get().c

    const channels = db.prepare("SELECT value FROM app_settings WHERE key = 'telegram_channels'").get()
    let channelNames = []
    try { channelNames = JSON.parse(channels?.value || '[]').slice(0, 4) } catch {}

    res.json({
      sports: sports.map(s => ({
        title: s.title,
        channel: s.channel,
        start_time: s.start_time,
        stop_time: s.stop_time,
        source: s.source,
        type: s.title.toLowerCase().includes('movie') || s.title.toLowerCase().includes('film') ? 'movie' : 'sport'
      })),
      movies: movies.map(m => ({
        title: m.title,
        channel: m.channel,
        start_time: m.start_time,
      })),
      stats,
      provider: provider || { name: 'Atlas Pro IPTV', specialty: 'Sports & Entertainment' },
      planCount,
    })
  } catch (err) {
    console.error('Hero events error:', err.message)
    res.json({
      sports: [],
      movies: [],
      stats: { live: 34887, movies: 157, series: 144604, total: 179915 },
      provider: { name: 'Atlas Pro IPTV', specialty: 'Sports & Entertainment' },
      planCount: 4,
    })
  }
})

module.exports = router
