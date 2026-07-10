import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const distRoot = join(root, 'dist')

function loadLocalEnv() {
  const envPath = join(root, '.env.local')
  if (!existsSync(envPath)) return

  for (const sourceLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = sourceLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator < 1) continue

    const key = line.slice(0, separator).trim()
    if (!/^[A-Z_][A-Z0-9_]*$/i.test(key) || process.env[key] !== undefined) continue

    let value = line.slice(separator + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

loadLocalEnv()

const port = Number.parseInt(process.env.PORT || '4173', 10)
const host = process.env.HOST || '127.0.0.1'
const cookieValue = process.env.ROBLOX_COOKIE?.trim() || ''
const robloxCookie = cookieValue
  ? cookieValue.startsWith('.ROBLOSECURITY=')
    ? cookieValue
    : `.ROBLOSECURITY=${cookieValue}`
  : ''

const CATEGORY_NAMES = new Set([
  'FreeModels',
  'FreeDecals',
  'FreeMeshes',
  'FreeAudio',
  'WhitelistedPlugins',
])

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

function setCommonHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https://*.rbxcdn.com https://www.roblox.com; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'",
  )
}

function sendJson(response, status, payload) {
  setCommonHeaders(response)
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

function missingCookie(response) {
  sendJson(response, 503, {
    ok: false,
    code: 'missing_cookie',
    message: 'ROBLOX_COOKIE is not configured in .env.local.',
  })
}

async function fetchRoblox(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    return await fetch(url, {
      headers: {
        Accept: 'application/json',
        Cookie: robloxCookie,
        'User-Agent': 'RobloxStudioWebLocal/0.2 (localhost)',
      },
      redirect: 'manual',
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function parseJson(response) {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

function upstreamFailure(response, upstream, body) {
  if (upstream.status === 401 || upstream.status === 403) {
    sendJson(response, 401, {
      ok: false,
      code: 'invalid_cookie',
      message: 'Roblox rejected the configured session.',
    })
    return
  }

  sendJson(response, 502, {
    ok: false,
    code: 'roblox_error',
    message: body?.message || body?.errors?.[0]?.message || `Roblox returned HTTP ${upstream.status}.`,
  })
}

async function handleSession(response) {
  if (!robloxCookie) return missingCookie(response)

  try {
    const upstream = await fetchRoblox('https://users.roblox.com/v1/users/authenticated')
    const body = await parseJson(upstream)
    if (!upstream.ok) return upstreamFailure(response, upstream, body)

    sendJson(response, 200, {
      ok: true,
      user: {
        id: body.id,
        name: body.name,
        displayName: body.displayName || body.name,
      },
    })
  } catch (error) {
    sendJson(response, 502, {
      ok: false,
      code: 'network_error',
      message: error?.name === 'AbortError' ? 'Roblox did not respond in time.' : 'Unable to reach Roblox.',
    })
  }
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '')
}

function assetTypeToCategory(typeId, fallback) {
  if (Number(typeId) === 3) return 'Audio'
  if (Number(typeId) === 13) return 'Decals'
  if (Number(typeId) === 38) return 'Plugins'
  if (Number(typeId) === 40) return 'Meshes'
  return fallback || 'Models'
}

function normalizeMarketplaceItems(body, category) {
  const source = Array.isArray(body)
    ? body
    : firstValue(body.data, body.items, body.results, body.assets, body.creations)
  const items = Array.isArray(source) ? source : []

  return items.flatMap((item, index) => {
    const asset = item.asset || item.item || item
    const creator = item.creator || asset.creator || {}
    const assetId = Number(firstValue(asset.id, asset.assetId, item.assetId, item.id))
    if (!Number.isFinite(assetId) || assetId <= 0) return []

    const typeId = Number(firstValue(asset.typeId, asset.assetTypeId, item.assetTypeId, item.assetType?.id, 10))
    const thumbnail = firstValue(
      item.thumbnailUrl,
      item.thumbnail?.imageUrl,
      item.thumbnails?.[0]?.imageUrl,
      asset.thumbnailUrl,
    )

    return [{
      id: `roblox-${assetId}`,
      assetId,
      assetTypeId: Number.isFinite(typeId) ? typeId : 10,
      name: String(firstValue(asset.name, item.name, `Roblox asset ${index + 1}`)),
      creator: String(firstValue(creator.name, creator.displayName, item.creatorName, 'Roblox Creator')),
      creatorId: Number(firstValue(creator.id, creator.creatorTargetId, item.creatorId, 0)),
      category: assetTypeToCategory(typeId, category),
      verified: Boolean(firstValue(creator.hasVerifiedBadge, creator.verified, item.creatorVerified, false)),
      thumbnail: thumbnail ? String(thumbnail) : null,
      source: 'roblox',
    }]
  })
}

async function addMissingThumbnails(items) {
  const missing = items.filter((item) => !item.thumbnail).map((item) => item.assetId).slice(0, 100)
  if (!missing.length) return items

  try {
    const url = new URL('https://thumbnails.roblox.com/v1/assets')
    url.searchParams.set('assetIds', missing.join(','))
    url.searchParams.set('returnPolicy', 'PlaceHolder')
    url.searchParams.set('size', '420x420')
    url.searchParams.set('format', 'Png')
    url.searchParams.set('isCircular', 'false')

    const upstream = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!upstream.ok) return items
    const body = await upstream.json()
    const thumbnails = new Map(
      (Array.isArray(body.data) ? body.data : []).map((entry) => [Number(entry.targetId), entry.imageUrl]),
    )
    return items.map((item) => ({ ...item, thumbnail: item.thumbnail || thumbnails.get(item.assetId) || null }))
  } catch {
    return items
  }
}

async function handleToolbox(requestUrl, response) {
  if (!robloxCookie) return missingCookie(response)

  const categoryName = CATEGORY_NAMES.has(requestUrl.searchParams.get('category') || '')
    ? requestUrl.searchParams.get('category')
    : 'FreeModels'
  const keyword = (requestUrl.searchParams.get('keyword') || '').trim().slice(0, 80)
  const limit = Math.min(Math.max(Number.parseInt(requestUrl.searchParams.get('limit') || '30', 10) || 30, 1), 50)

  const upstreamUrl = new URL('https://apis.roblox.com/toolbox-service/v1/marketplace')
  upstreamUrl.searchParams.set('category', categoryName)
  upstreamUrl.searchParams.set('limit', String(limit))
  upstreamUrl.searchParams.set('sortType', 'Relevance')
  if (keyword) upstreamUrl.searchParams.set('keyword', keyword)

  try {
    const upstream = await fetchRoblox(upstreamUrl)
    const body = await parseJson(upstream)
    if (!upstream.ok) return upstreamFailure(response, upstream, body)

    const category = assetTypeToCategory(undefined, {
      FreeModels: 'Models',
      FreeDecals: 'Decals',
      FreeMeshes: 'Meshes',
      FreeAudio: 'Audio',
      WhitelistedPlugins: 'Plugins',
    }[categoryName])
    const items = await addMissingThumbnails(normalizeMarketplaceItems(body, category))

    sendJson(response, 200, {
      ok: true,
      items,
      nextPageCursor: firstValue(body.nextPageCursor, body.nextCursor, body.cursor, null),
    })
  } catch (error) {
    sendJson(response, 502, {
      ok: false,
      code: 'network_error',
      message: error?.name === 'AbortError' ? 'Roblox did not respond in time.' : 'Unable to reach Roblox.',
    })
  }
}

function serveStatic(requestUrl, response) {
  const requested = decodeURIComponent(requestUrl.pathname)
  const safePath = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, '')
  let filePath = join(distRoot, safePath === '/' ? 'index.html' : safePath)

  if (!existsSync(filePath) || requested.endsWith('/')) filePath = join(distRoot, 'index.html')

  try {
    const content = readFileSync(filePath)
    setCommonHeaders(response)
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    })
    response.end(content)
  } catch {
    sendJson(response, 404, { ok: false, code: 'not_found', message: 'File not found.' })
  }
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`)

  if (request.method !== 'GET') {
    return sendJson(response, 405, { ok: false, code: 'method_not_allowed', message: 'Only GET is supported.' })
  }

  if (requestUrl.pathname === '/api/roblox/session') return handleSession(response)
  if (requestUrl.pathname === '/api/roblox/toolbox') return handleToolbox(requestUrl, response)
  if (requestUrl.pathname.startsWith('/api/')) {
    return sendJson(response, 404, { ok: false, code: 'not_found', message: 'Unknown local API route.' })
  }

  return serveStatic(requestUrl, response)
})

server.listen(port, host, () => {
  console.log(`Roblox Studio Web local server: http://${host}:${port}`)
  console.log(robloxCookie ? 'Roblox session: configured (value hidden)' : 'Roblox session: missing ROBLOX_COOKIE in .env.local')
})
