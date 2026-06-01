const { XMLParser } = require('fast-xml-parser')

const API_URL = 'https://api.namecheap.com/xml.response'
const SANDBOX_URL = 'https://api.sandbox.namecheap.com/xml.response'

let credsCache = null
let credsTimer = null

function getCredentials() {
  if (credsCache) return credsCache
  try {
    const { getDb } = require('../db')
    const db = getDb()
    const get = key => (db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key) || {}).value
    credsCache = {
      apiUser: get('namecheap_api_user') || process.env.NAMECHEAP_API_USER || '',
      apiKey: get('namecheap_api_key') || process.env.NAMECHEAP_API_KEY || '',
      userName: get('namecheap_username') || process.env.NAMECHEAP_USERNAME || '',
      clientIp: get('namecheap_client_ip') || process.env.NAMECHEAP_CLIENT_IP || '',
    }
    if (credsTimer) clearTimeout(credsTimer)
    credsTimer = setTimeout(() => { credsCache = null }, 30000)
  } catch {
    credsCache = {
      apiUser: process.env.NAMECHEAP_API_USER || '',
      apiKey: process.env.NAMECHEAP_API_KEY || '',
      userName: process.env.NAMECHEAP_USERNAME || '',
      clientIp: process.env.NAMECHEAP_CLIENT_IP || '',
    }
  }
  return credsCache
}

function getErrorText(err) {
  if (typeof err === 'string') return err
  if (err && typeof err === 'object') return err['#text'] || JSON.stringify(err)
  return String(err)
}

function areCredsValid(creds) {
  return creds.apiUser && creds.apiKey && creds.userName && creds.clientIp
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['Domain', 'DomainCheckResult', 'host', 'Nameserver'].includes(name),
})

async function apiCall(command, extraParams = {}) {
  const creds = getCredentials()
  if (!areCredsValid(creds)) throw new Error('Namecheap API not configured')

  const params = new URLSearchParams({
    ApiUser: creds.apiUser,
    ApiKey: creds.apiKey,
    UserName: creds.userName,
    Command: command,
    ClientIp: creds.clientIp,
    ...extraParams,
  })

  const url = `${API_URL}?${params}`
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  const xml = await res.text()
  const parsed = parser.parse(xml)
  const response = parsed.ApiResponse || parsed['ApiResponse'] || {}

  const status = response['@_Status'] || ''
  if (status !== 'OK') {
    const errors = response.Errors
    let msg = 'Namecheap API error'
    if (errors) {
      if (typeof errors === 'string') msg = errors
      else if (typeof errors.Error === 'string') msg = errors.Error
      else if (Array.isArray(errors.Error)) msg = errors.Error.map(getErrorText).join('; ')
      else if (errors.Error && typeof errors.Error === 'object') msg = getErrorText(errors.Error)
    }
    throw new Error(msg)
  }

  return response
}

async function testConnection() {
  const res = await apiCall('namecheap.users.getPricing', { ProductType: 'DOMAIN' })
  return { success: true, message: 'Connected to Namecheap API' }
}

async function getDomains(page = 1, pageSize = 100) {
  const res = await apiCall('namecheap.domains.getList', {
    PageSize: String(pageSize),
    PageNum: String(page),
    SortBy: 'NAME',
  })
  const result = res.CommandResponse?.DomainGetListResult || {}
  const domains = result.Domain || []
  const list = Array.isArray(domains) ? domains : [domains]
  const total = parseInt(result['@_TotalItems'] || '0') || list.length

  return {
    total,
    page,
    pageSize,
    domains: list.filter(Boolean).map(d => ({
      id: parseInt(d['@_ID'] || '0'),
      name: d['@_Name'] || '',
      expires: d['@_Expires'] || '',
      isExpired: d['@_IsExpired'] === 'true',
      isLocked: d['@_IsLocked'] === 'true',
      autoRenew: d['@_AutoRenew'] === 'true',
      whoisGuard: d['@_WhoisGuard'] === 'true',
      isPremium: d['@_IsPremium'] === 'true',
      isOurDomain: d['@_IsOurDomain'] === 'true',
    })),
  }
}

async function checkDomains(domainList) {
  const res = await apiCall('namecheap.domains.check', { DomainList: domainList.join(',') })
  const results = res.CommandResponse?.DomainCheckResult || []
  const list = Array.isArray(results) ? results : [results]

  return list.filter(Boolean).map(d => ({
    domain: d['@_Domain'] || '',
    available: d['@_Available'] === 'true',
    price: d['@_Price'] || null,
    currency: d['@_Currency'] || 'USD',
    premium: d['@_IsPremiumName'] === 'true',
  }))
}

async function getDomainInfo(domainName) {
  const res = await apiCall('namecheap.domains.getInfo', { DomainName: domainName })
  const info = res.CommandResponse?.DomainGetInfoResult || {}
  return {
    name: info['@_DomainName'] || domainName,
    owner: info.OwnerEmail || '',
    created: info['@_Created'] || '',
    expires: info['@_Expires'] || '',
    isExpired: info['@_IsExpired'] === 'true',
    isLocked: info['@_IsLocked'] === 'true',
    autoRenew: info['@_AutoRenew'] === 'true',
    dns: info.DnsDetails?.NameServer || [],
    whoisGuard: info.WhoisGuard?.isEnabled === 'true',
  }
}

function splitDomain(domainName) {
  const parts = domainName.split('.')
  if (parts.length < 2) return { sld: domainName, tld: '' }
  const tld = parts.slice(1).join('.')
  const sld = parts[0]
  return { sld, tld }
}

async function getDnsRecords(domainName) {
  const { sld, tld } = splitDomain(domainName)
  const res = await apiCall('namecheap.domains.dns.getList', { SLD: sld, TLD: tld })
  const result = res.CommandResponse?.DomainDNSGetListResult || {}
  const hosts = result.hosts?.host || result.host || []
  const hostList = Array.isArray(hosts) ? hosts : [hosts]

  return {
    domain: result['@_Domain'] || domainName,
    isUsingOurDNS: result['@_IsUsingOurDNS'] === 'true',
    nameservers: result.Nameservers?.Nameserver || [],
    emailType: result['@_EmailType'] || '',
    records: hostList.filter(Boolean).map(h => ({
      hostId: parseInt(h['@_HostId'] || '0'),
      name: h['@_Name'] || '',
      type: h['@_Type'] || '',
      address: h['@_Address'] || '',
      mxPref: parseInt(h['@_MXPref'] || '10'),
      ttl: parseInt(h['@_TTL'] || '1800'),
      isActive: h['@_IsActive'] !== 'false',
    })),
  }
}

async function setDnsRecords(domainName, records) {
  const { sld, tld } = splitDomain(domainName)
  const params = { SLD: sld, TLD: tld }

  // Append each record as numbered params
  // Namecheap requires ALL records in one call (replaces the entire zone)
  for (let i = 0; i < records.length; i++) {
    const r = records[i]
    const idx = i + 1
    params[`HostName${idx}`] = r.name || '@'
    params[`RecordType${idx}`] = r.type || 'A'
    params[`Address${idx}`] = r.address || ''
    params[`MXPref${idx}`] = String(r.mxPref ?? 10)
    params[`TTL${idx}`] = String(r.ttl ?? 1800)
  }

  const res = await apiCall('namecheap.domains.dns.setHosts', params)
  const result = res.CommandResponse?.DomainDNSSetHostsResult || {}
  const isSuccess = result['@_IsSuccess'] === 'true' || String(result['@_IsSuccess'] || '').toLowerCase() === 'true'

  if (!isSuccess) {
    throw new Error('Failed to set DNS records')
  }

  return getDnsRecords(domainName)
}

module.exports = { testConnection, getDomains, checkDomains, getDomainInfo, getDnsRecords, setDnsRecords, getCredentials }
