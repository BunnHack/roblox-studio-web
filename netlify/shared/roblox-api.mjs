const CATEGORY_NAMES = new Set([
  'FreeModels',
  'FreeDecals',
  'FreeMeshes',
  'FreeAudio',
  'WhitelistedPlugins',
])

const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
}

function jsonResponse(status, payload, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  })
}

function getRobloxCookie() {
  const value = process.env.ROBLOX_COOKIE?.trim() || ''
  if (!value) return ''
  return value.startsWith('.ROBLOSECURITY=') ? value : `.ROBLOSECURITY=${value}`
}

function missingCookie() {
  return jsonResponse(503, {
    ok: false,
    code: 'missing_cookie',
    message: 'ROBLOX_COOKIE is not configured in the server environment.',
  })
}

function methodNotAllowed() {
  return jsonResponse(405, {
    ok: false,
    code: 'method_not_allowed',
    message: 'Only GET is supported.',
  }, { Allow: 'GET' })
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

function fetchRoblox(url, robloxCookie) {
  return fetchWithTimeout(url, {
    headers: {
      Accept: 'application/json',
      Cookie: robloxCookie,
      'User-Agent': 'RobloxStudioWebNetlify/0.3',
    },
    redirect: 'manual',
  }, 6_500)
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

function upstreamFailure(upstream, body) {
  if (upstream.status === 401 || upstream.status === 403) {
    return jsonResponse(401, {
      ok: false,
      code: 'invalid_cookie',
      message: 'Roblox rejected the configured session.',
    })
  }

  return jsonResponse(502, {
    ok: false,
    code: 'roblox_error',
    message: body?.message || body?.errors?.[0]?.message || `Roblox returned HTTP ${upstream.status}.`,
  })
}

function networkFailure(error) {
  return jsonResponse(502, {
    ok: false,
    code: 'network_error',
    message: error?.name === 'AbortError' ? 'Roblox did not respond in time.' : 'Unable to reach Roblox.',
  })
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

    const upstream = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 2_000)
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

export async function handleSessionRequest(request) {
  if (request.method !== 'GET') return methodNotAllowed()

  const robloxCookie = getRobloxCookie()
  if (!robloxCookie) return missingCookie()

  try {
    const upstream = await fetchRoblox('https://users.roblox.com/v1/users/authenticated', robloxCookie)
    const body = await parseJson(upstream)
    if (!upstream.ok) return upstreamFailure(upstream, body)

    return jsonResponse(200, {
      ok: true,
      user: {
        id: body.id,
        name: body.name,
        displayName: body.displayName || body.name,
      },
    })
  } catch (error) {
    return networkFailure(error)
  }
}

export async function handleToolboxRequest(request) {
  if (request.method !== 'GET') return methodNotAllowed()

  const robloxCookie = getRobloxCookie()
  if (!robloxCookie) return missingCookie()

  const requestUrl = new URL(request.url)
  const requestedCategory = requestUrl.searchParams.get('category') || ''
  const categoryName = CATEGORY_NAMES.has(requestedCategory) ? requestedCategory : 'FreeModels'
  const keyword = (requestUrl.searchParams.get('keyword') || '').trim().slice(0, 80)
  const limit = Math.min(Math.max(Number.parseInt(requestUrl.searchParams.get('limit') || '30', 10) || 30, 1), 50)

  const upstreamUrl = new URL('https://apis.roblox.com/toolbox-service/v1/marketplace')
  upstreamUrl.searchParams.set('category', categoryName)
  upstreamUrl.searchParams.set('limit', String(limit))
  upstreamUrl.searchParams.set('sortType', 'Relevance')
  if (keyword) upstreamUrl.searchParams.set('keyword', keyword)

  try {
    const upstream = await fetchRoblox(upstreamUrl, robloxCookie)
    const body = await parseJson(upstream)
    if (!upstream.ok) return upstreamFailure(upstream, body)

    const category = assetTypeToCategory(undefined, {
      FreeModels: 'Models',
      FreeDecals: 'Decals',
      FreeMeshes: 'Meshes',
      FreeAudio: 'Audio',
      WhitelistedPlugins: 'Plugins',
    }[categoryName])
    const items = await addMissingThumbnails(normalizeMarketplaceItems(body, category))

    return jsonResponse(200, {
      ok: true,
      items,
      nextPageCursor: firstValue(body.nextPageCursor, body.nextCursor, body.cursor, null),
    })
  } catch (error) {
    return networkFailure(error)
  }
}
