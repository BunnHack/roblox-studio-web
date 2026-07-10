import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AppWindow,
  BadgeCheck,
  Box,
  Boxes,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Cloud,
  Code2,
  Component,
  Copy,
  Cuboid,
  Eye,
  ExternalLink,
  Folder,
  Gamepad2,
  Grid3X3,
  Grid2X2,
  Hammer,
  Hand,
  Image,
  Layers3,
  List,
  Lightbulb,
  LoaderCircle,
  LocateFixed,
  Lock,
  LogIn,
  Menu,
  MessageSquare,
  Minus,
  MonitorPlay,
  Moon,
  MoreHorizontal,
  MousePointer2,
  Move3D,
  Package,
  PanelBottomClose,
  PanelRightClose,
  Pause,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  Rotate3D,
  Save,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  SquareDashedMousePointer,
  StopCircle,
  Sun,
  Tag,
  TerminalSquare,
  Trash2,
  Undo2,
  UserCircle2,
  Users,
  WifiOff,
  Wrench,
  X,
  ZoomIn,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Tool = 'Select' | 'Move' | 'Scale' | 'Rotate'
type PlayState = 'editing' | 'playing' | 'paused'
type ToolboxCategory = 'All' | 'Models' | 'Decals' | 'Meshes' | 'Audio' | 'Plugins'

type SceneNode = {
  id: string
  name: string
  kind: 'service' | 'part' | 'model' | 'script' | 'camera' | 'terrain'
  children?: SceneNode[]
}

type ToolboxAsset = {
  id: string
  assetId: number
  assetTypeId: number
  name: string
  creator: string
  category: Exclude<ToolboxCategory, 'All'>
  categoryName: string
  color?: string
  glyph?: string
  thumbnail?: string | null
  source?: 'roblox' | 'demo'
  verified?: boolean
}

type RobloxUser = {
  id: number
  name: string
  displayName: string
}

type RobloxConnection = {
  status: 'checking' | 'connected' | 'missing' | 'invalid' | 'offline'
  user?: RobloxUser
  message?: string
}

type ToolboxView = 'grid' | 'list'

const toolboxCategoryApi: Record<ToolboxCategory, string> = {
  All: 'FreeModels',
  Models: 'FreeModels',
  Decals: 'FreeDecals',
  Meshes: 'FreeMeshes',
  Audio: 'FreeAudio',
  Plugins: 'WhitelistedPlugins',
}

const toolboxVisuals: Record<Exclude<ToolboxCategory, 'All'>, { color: string; glyph: string }> = {
  Models: { color: '#5f7e9b', glyph: '◆' },
  Decals: { color: '#9c6f64', glyph: '▧' },
  Meshes: { color: '#647681', glyph: '⬡' },
  Audio: { color: '#78679d', glyph: '♫' },
  Plugins: { color: '#4f789f', glyph: '✦' },
}

const initialScene: SceneNode[] = [
  {
    id: 'workspace',
    name: 'Workspace',
    kind: 'service',
    children: [
      { id: 'camera', name: 'Camera', kind: 'camera' },
      { id: 'terrain', name: 'Terrain', kind: 'terrain' },
      { id: 'baseplate', name: 'Baseplate', kind: 'part' },
      {
        id: 'spawn-model',
        name: 'Spawn Area',
        kind: 'model',
        children: [
          { id: 'spawn', name: 'SpawnLocation', kind: 'part' },
          { id: 'platform', name: 'Platform', kind: 'part' },
        ],
      },
      { id: 'script', name: 'Main.server.lua', kind: 'script' },
    ],
  },
  { id: 'players', name: 'Players', kind: 'service' },
  { id: 'lighting', name: 'Lighting', kind: 'service' },
  { id: 'material', name: 'MaterialService', kind: 'service' },
  { id: 'replicated', name: 'ReplicatedStorage', kind: 'service' },
  { id: 'server-script', name: 'ServerScriptService', kind: 'service' },
  { id: 'server-storage', name: 'ServerStorage', kind: 'service' },
  { id: 'starter-gui', name: 'StarterGui', kind: 'service' },
  { id: 'starter-pack', name: 'StarterPack', kind: 'service' },
  { id: 'starter-player', name: 'StarterPlayer', kind: 'service' },
  { id: 'sound', name: 'SoundService', kind: 'service' },
]

const toolboxAssets: ToolboxAsset[] = [
  { id: 'city-house', assetId: 5657301130, assetTypeId: 10, name: 'Modern City House', creator: 'Studio Essentials', category: 'Models', categoryName: 'FreeModels', color: '#7b94ad', glyph: '🏠', verified: true },
  { id: 'pine-tree', assetId: 5657301131, assetTypeId: 10, name: 'Low Poly Pine Tree', creator: 'BlockWorks', category: 'Models', categoryName: 'FreeModels', color: '#4f8b61', glyph: '🌲' },
  { id: 'sports-car', assetId: 5657301132, assetTypeId: 10, name: 'Sports Car', creator: 'Velocity Motors', category: 'Models', categoryName: 'FreeModels', color: '#b04c4c', glyph: '🏎️', verified: true },
  { id: 'street-lamp', assetId: 5657301133, assetTypeId: 40, name: 'Classic Street Lamp', creator: 'Urban Kit', category: 'Meshes', categoryName: 'FreeMeshes', color: '#86744c', glyph: '💡' },
  { id: 'treasure', assetId: 5657301134, assetTypeId: 10, name: 'Treasure Chest', creator: 'Adventure Pack', category: 'Models', categoryName: 'FreeModels', color: '#9a6a3e', glyph: '🧰' },
  { id: 'sky', assetId: 5657301135, assetTypeId: 13, name: 'Golden Hour Sky', creator: 'Atmos Studio', category: 'Decals', categoryName: 'FreeDecals', color: '#b97963', glyph: '🌅', verified: true },
  { id: 'rocks', assetId: 5657301136, assetTypeId: 40, name: 'Stylized Rock Set', creator: 'Nature Forge', category: 'Meshes', categoryName: 'FreeMeshes', color: '#777d85', glyph: '🪨' },
  { id: 'spawn', assetId: 5657301137, assetTypeId: 10, name: 'Team Spawn Pad', creator: 'Studio Essentials', category: 'Models', categoryName: 'FreeModels', color: '#4d8fa8', glyph: '✨', verified: true },
  { id: 'adventure-audio', assetId: 5657301138, assetTypeId: 3, name: 'Adventure Theme', creator: 'Roblox Audio', category: 'Audio', categoryName: 'FreeAudio', color: '#6c579b', glyph: '🎵', verified: true },
  { id: 'terrain-tools', assetId: 5657301139, assetTypeId: 38, name: 'Terrain Tools', creator: 'Creator Utilities', category: 'Plugins', categoryName: 'WhitelistedPlugins', color: '#4779a8', glyph: '🧩', verified: true },
]

const findNodeName = (nodes: SceneNode[], id: string): string | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node.name
    const childName = node.children ? findNodeName(node.children, id) : undefined
    if (childName) return childName
  }
}

function RobloxMark() {
  return <span className="roblox-mark" aria-label="Roblox Studio" />
}

function IconButton({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  onClick,
}: {
  icon: LucideIcon
  label: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      className={`icon-button${active ? ' active' : ''}`}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={16} strokeWidth={1.8} />
    </button>
  )
}

function RibbonTool({
  icon: Icon,
  label,
  active = false,
  onClick,
  accent,
}: {
  icon: LucideIcon
  label: string
  active?: boolean
  onClick?: () => void
  accent?: string
}) {
  return (
    <button className={`ribbon-tool${active ? ' active' : ''}`} onClick={onClick} title={label}>
      <span className="ribbon-icon" style={accent ? { color: accent } : undefined}>
        <Icon size={20} strokeWidth={1.65} />
      </span>
      <span>{label}</span>
    </button>
  )
}

function NodeIcon({ kind }: { kind: SceneNode['kind'] }) {
  const icons: Record<SceneNode['kind'], { icon: LucideIcon; className: string }> = {
    service: { icon: Boxes, className: 'blue' },
    part: { icon: Cuboid, className: 'gray' },
    model: { icon: Package, className: 'blue' },
    script: { icon: Code2, className: 'green' },
    camera: { icon: Eye, className: 'gray' },
    terrain: { icon: Grid3X3, className: 'green' },
  }
  const config = icons[kind]
  const Icon = config.icon
  return <Icon className={`node-icon ${config.className}`} size={15} strokeWidth={1.8} />
}

function ExplorerNode({
  node,
  depth,
  selected,
  onSelect,
  expanded,
  onToggle,
}: {
  node: SceneNode
  depth: number
  selected: string
  onSelect: (id: string) => void
  expanded: Set<string>
  onToggle: (id: string) => void
}) {
  const hasChildren = Boolean(node.children?.length)
  const isOpen = expanded.has(node.id)
  return (
    <>
      <div
        className={`tree-row${selected === node.id ? ' selected' : ''}`}
        style={{ paddingLeft: 4 + depth * 16 }}
        onClick={() => onSelect(node.id)}
      >
        <button
          className="tree-toggle"
          aria-label={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
          onClick={(event) => {
            event.stopPropagation()
            if (hasChildren) onToggle(node.id)
          }}
        >
          {hasChildren ? isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} /> : null}
        </button>
        <NodeIcon kind={node.kind} />
        <span className="tree-label">{node.name}</span>
        {selected === node.id && <Plus className="row-add" size={14} />}
      </div>
      {hasChildren && isOpen
        ? node.children!.map((child) => (
            <ExplorerNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))
        : null}
    </>
  )
}

const propertyRows = [
  ['Name', 'Baseplate'],
  ['Archivable', 'true'],
  ['ClassName', 'Part'],
  ['Parent', 'Workspace'],
]

function Properties({ selected, displayName }: { selected: string; displayName: string }) {
  const isPart = ['baseplate', 'spawn', 'platform'].includes(selected)
  return (
    <div className="properties-content">
      <section className="property-section">
        <button className="property-heading">
          <ChevronDown size={13} /> Appearance
        </button>
        <div className="property-grid">
          <div>BrickColor</div><div><span className="color-swatch" />Medium stone grey</div>
          <div>CastShadow</div><div><input type="checkbox" defaultChecked /></div>
          <div>Color</div><div>163, 162, 165</div>
          <div>Material</div><div>{isPart ? 'Plastic' : '—'}</div>
          <div>Transparency</div><div>0</div>
        </div>
      </section>
      <section className="property-section">
        <button className="property-heading">
          <ChevronDown size={13} /> Data
        </button>
        <div className="property-grid">
          {propertyRows.map(([name, value]) => (
            <div className="property-pair" key={name}>
              <div>{name}</div>
              <div className={name === 'Name' ? 'editable-cell' : ''}>{name === 'Name' ? displayName : value}</div>
            </div>
          ))}
          <div>Locked</div><div><input type="checkbox" defaultChecked={selected === 'baseplate'} /></div>
          <div>Tags</div><div className="add-tag"><Plus size={12} /> Add tag</div>
        </div>
      </section>
      <section className="property-section">
        <button className="property-heading">
          <ChevronDown size={13} /> Transform
        </button>
        <div className="property-grid vector-grid">
          <div>Position</div><div><span>X 0</span><span>Y 0</span><span>Z 0</span></div>
          <div>Orientation</div><div><span>X 0</span><span>Y 0</span><span>Z 0</span></div>
          <div>Size</div><div><span>X 128</span><span>Y 1</span><span>Z 128</span></div>
        </div>
      </section>
      <section className="property-section">
        <button className="property-heading">
          <ChevronRight size={13} /> Collision
        </button>
      </section>
    </div>
  )
}

function Viewport({
  selected,
  selectedName,
  insertedAssets,
  onSelect,
}: {
  selected: string
  selectedName: string
  insertedAssets: ToolboxAsset[]
  onSelect: (id: string) => void
}) {
  return (
    <main className="viewport" onClick={() => onSelect('workspace')}>
      <div className="viewport-tools">
        <IconButton icon={Hand} label="Pan camera" />
        <IconButton icon={ZoomIn} label="Zoom camera" />
        <IconButton icon={LocateFixed} label="Focus selected" />
      </div>

      <div className="camera-cube" title="Camera orientation">
        <span className="cube-top">TOP</span>
        <span className="cube-front">FRONT</span>
        <span className="cube-side">RIGHT</span>
      </div>

      <div className="world" aria-label="3D viewport">
        <div className="baseplate" onClick={(e) => { e.stopPropagation(); onSelect('baseplate') }}>
          {selected === 'baseplate' && <div className="selection-outline baseplate-selection" />}
        </div>
        <div className="scene-part tower" onClick={(e) => { e.stopPropagation(); onSelect('platform') }}>
          <div className="part-face part-front" />
          <div className="part-face part-right" />
          <div className="part-face part-top" />
          {selected === 'platform' && <div className="selection-outline part-selection" />}
        </div>
        <div className="scene-part spawn-pad" onClick={(e) => { e.stopPropagation(); onSelect('spawn') }}>
          <div className="part-face part-front" />
          <div className="part-face part-right" />
          <div className="part-face part-top spawn-symbol"><Sparkles size={20} /></div>
          {selected === 'spawn' && <div className="selection-outline part-selection" />}
        </div>
        {insertedAssets.map((asset, index) => (
          <button
            key={asset.id}
            className={`toolbox-scene-object${selected === `toolbox-${asset.id}` ? ' selected' : ''}`}
            style={{
              left: 85 + (index % 4) * 125,
              top: 85 + Math.floor(index / 4) * 105,
              background: asset.color ?? toolboxVisuals[asset.category].color,
            }}
            title={asset.name}
            onClick={(event) => {
              event.stopPropagation()
              onSelect(`toolbox-${asset.id}`)
            }}
          >
            <span>{asset.glyph ?? toolboxVisuals[asset.category].glyph}</span>
          </button>
        ))}
      </div>

      <div className="axis-gizmo" aria-label="World axes">
        <span className="axis y">Y</span>
        <span className="axis x">X</span>
        <span className="axis z">Z</span>
        <span className="axis-origin" />
      </div>
      <div className="viewport-hint"><MousePointer2 size={13} /> {selectedName}</div>
    </main>
  )
}

function ToolboxPanel({
  assets,
  search,
  category,
  installed,
  isLoading,
  error,
  connected,
  user,
  view,
  onSearch,
  onCategory,
  onInsert,
  onView,
  onConnect,
  onRefresh,
  onClose,
}: {
  assets: ToolboxAsset[]
  search: string
  category: ToolboxCategory
  installed: Set<string>
  isLoading: boolean
  error: string | null
  connected: boolean
  user?: RobloxUser
  view: ToolboxView
  onSearch: (value: string) => void
  onCategory: (value: ToolboxCategory) => void
  onInsert: (asset: ToolboxAsset) => void
  onView: (view: ToolboxView) => void
  onConnect: () => void
  onRefresh: () => void
  onClose: () => void
}) {
  return (
    <aside className="toolbox-panel" aria-label="Toolbox">
      <header className="toolbox-header">
        <div className="toolbox-title">
          <span className="toolbox-logo"><Gamepad2 size={16} /></span>
          <span><strong>Toolbox</strong><small>Creator Marketplace</small></span>
        </div>
        <div className="toolbox-header-actions">
          <button className={`toolbox-session${connected ? ' connected' : ''}`} onClick={onConnect}>
            {connected ? <UserCircle2 size={13} /> : <WifiOff size={13} />}
            <span>{connected ? user?.displayName || user?.name : 'Server session'}</span>
          </button>
          <IconButton icon={X} label="Close Toolbox" onClick={onClose} />
        </div>
      </header>
      <div className="toolbox-market-tabs">
        <button className="active">Marketplace</button>
        <button title="Coming next">Inventory</button>
        <button title="Coming next">Recent</button>
        <button title="Coming next">Creations</button>
      </div>
      {!connected && (
        <button className="toolbox-connect-banner" onClick={onConnect}>
          <span className="connect-banner-icon"><LogIn size={17} /></span>
          <span><strong>Connect the server-side Roblox session</strong><small>Use live Marketplace assets instead of the preview library.</small></span>
          <ChevronRight size={16} />
        </button>
      )}
      <div className="toolbox-search-row">
        <label className="toolbox-search">
          <Search size={16} />
          <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search models, decals, audio…" autoFocus />
          {search && <button onClick={() => onSearch('')} aria-label="Clear search"><X size={14} /></button>}
        </label>
        <button className="toolbox-filter-button" title="Refresh assets" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={isLoading ? 'spin' : ''} size={15} />
        </button>
      </div>
      <div className="toolbox-categories">
        {(['All', 'Models', 'Decals', 'Meshes', 'Audio', 'Plugins'] as ToolboxCategory[]).map((item) => (
          <button key={item} className={category === item ? 'active' : ''} onClick={() => onCategory(item)}>{item}</button>
        ))}
      </div>
      <div className="toolbox-results-label">
        <span><b>{assets.length}</b> {connected ? 'Roblox results' : 'Preview assets'}</span>
        <div className="toolbox-view-switch" aria-label="Asset layout">
          <button className={view === 'grid' ? 'active' : ''} onClick={() => onView('grid')} title="Grid view"><Grid2X2 size={13} /></button>
          <button className={view === 'list' ? 'active' : ''} onClick={() => onView('list')} title="List view"><List size={14} /></button>
        </div>
      </div>
      {error && (
        <div className="toolbox-error">
          <WifiOff size={15} />
          <span>{error}</span>
          <button onClick={onRefresh}>Retry</button>
        </div>
      )}
      <div className={`toolbox-grid ${view}`}>
        {isLoading && Array.from({ length: 6 }).map((_, index) => (
          <div className="asset-card asset-skeleton" key={`skeleton-${index}`}><span /><i /><i /></div>
        ))}
        {!isLoading && assets.map((asset) => {
          const isInstalled = installed.has(asset.id)
          const visual = toolboxVisuals[asset.category]
          return (
            <article className="asset-card" key={asset.id}>
              <button
                className="asset-preview"
                style={{ background: `linear-gradient(145deg, ${asset.color ?? visual.color}, #202328)` }}
                onClick={() => onInsert(asset)}
                aria-label={`Insert ${asset.name}`}
              >
                {asset.thumbnail
                  ? <img src={asset.thumbnail} alt="" loading="lazy" />
                  : <span>{asset.glyph ?? visual.glyph}</span>}
                <i>{asset.category}</i>
                <span className={`asset-insert-icon${isInstalled ? ' installed' : ''}`}>{isInstalled ? '✓' : '+'}</span>
              </button>
              <div className="asset-info">
                <strong title={asset.name}>{asset.name}</strong>
                <span className="asset-creator">
                  {asset.creator}
                  {asset.verified && <BadgeCheck size={11} aria-label="Verified creator" />}
                </span>
                <small>ID {asset.assetId}</small>
                <button className={isInstalled ? 'installed' : ''} onClick={() => onInsert(asset)}>
                  {isInstalled ? 'Inserted' : 'Insert asset'}
                </button>
              </div>
            </article>
          )
        })}
        {!isLoading && !assets.length && (
          <div className="toolbox-empty"><Package size={28} /><strong>No assets found</strong><span>Try another search or category.</span></div>
        )}
      </div>
      <footer className="toolbox-footer">
        <span className={connected ? 'live-dot' : 'preview-dot'} />
        {connected ? 'Live through the secure Toolbox bridge' : 'Preview library · connect for live results'}
      </footer>
    </aside>
  )
}

function ConnectionDialog({
  connection,
  loginOpened,
  onOpenLogin,
  onRetry,
  onClose,
}: {
  connection: RobloxConnection
  loginOpened: boolean
  onOpenLogin: () => void
  onRetry: () => void
  onClose: () => void
}) {
  const connected = connection.status === 'connected'

  return (
    <div className="connection-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="connection-dialog" role="dialog" aria-modal="true" aria-labelledby="connection-title">
        <header className="connection-header">
          <div className="connection-brand"><RobloxMark /><span>Roblox Studio Web</span></div>
          <IconButton icon={X} label="Close connection guide" onClick={onClose} />
        </header>

        <div className="connection-hero">
          <span className={`connection-hero-icon${connected ? ' success' : ''}`}>
            {connected ? <BadgeCheck size={28} /> : <ShieldCheck size={28} />}
          </span>
          <div>
            <p className="eyebrow">SERVER CONNECTION</p>
            <h2 id="connection-title">{connected ? `Connected as ${connection.user?.displayName}` : 'Connect the Roblox service'}</h2>
            <p>
              {connected
                ? `@${connection.user?.name} is available to the server-side Toolbox bridge.`
                : 'Your session stays in the server environment. The browser UI never receives or stores the cookie.'}
            </p>
          </div>
        </div>

        {!connected && (
          <div className="connection-steps">
            <div className={loginOpened ? 'done' : ''}>
              <span>1</span>
              <div><strong>Sign in on Roblox</strong><small>Open the official login page in a separate tab.</small></div>
              <button onClick={onOpenLogin}>Open login <ExternalLink size={13} /></button>
            </div>
            <div>
              <span>2</span>
              <div>
                <strong>Configure the server bridge</strong>
                <small>Set this value in Netlify Environment variables, or in <code>.env.local</code> when running locally.</small>
                <code className="env-example">ROBLOX_COOKIE=your_cookie_value</code>
              </div>
            </div>
            <div>
              <span>3</span>
              <div><strong>Deploy or restart, then verify</strong><small>Redeploy Netlify, or run <code>npm run local</code> for local development.</small></div>
              <button onClick={onRetry} disabled={connection.status === 'checking'}>
                {connection.status === 'checking' ? <LoaderCircle className="spin" size={13} /> : <RefreshCw size={13} />}
                Check again
              </button>
            </div>
          </div>
        )}

        <div className={`connection-status ${connection.status}`}>
          {connection.status === 'checking' && <><LoaderCircle className="spin" size={15} /> Checking the server bridge…</>}
          {connection.status === 'connected' && <><BadgeCheck size={15} /> Session verified. Live Marketplace access is ready.</>}
          {connection.status === 'missing' && <><AppWindow size={15} /> No cookie is configured in the server environment yet.</>}
          {connection.status === 'invalid' && <><WifiOff size={15} /> Roblox rejected the configured session. Replace it and redeploy or restart.</>}
          {connection.status === 'offline' && <><WifiOff size={15} /> {connection.message || 'The server bridge is not reachable.'}</>}
        </div>

        <footer className="connection-footer">
          <span><Lock size={13} /> Read-only, server-side bridge</span>
          <button className="connection-primary" onClick={connected ? onClose : onRetry} disabled={connection.status === 'checking'}>
            {connected ? 'Continue to Studio' : 'Verify connection'}
          </button>
        </footer>
      </section>
    </div>
  )
}

function App() {
  const [sceneNodes, setSceneNodes] = useState<SceneNode[]>(initialScene)
  const [activeTab, setActiveTab] = useState('Home')
  const [tool, setTool] = useState<Tool>('Select')
  const [playState, setPlayState] = useState<PlayState>('editing')
  const [selected, setSelected] = useState('baseplate')
  const [expanded, setExpanded] = useState(new Set(['workspace', 'spawn-model']))
  const [explorerSearch, setExplorerSearch] = useState('')
  const [rightDockOpen, setRightDockOpen] = useState(true)
  const [outputOpen, setOutputOpen] = useState(true)
  const [activeBottomTab, setActiveBottomTab] = useState('Output')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [toolboxOpen, setToolboxOpen] = useState(false)
  const [toolboxSearch, setToolboxSearch] = useState('')
  const [toolboxCategory, setToolboxCategory] = useState<ToolboxCategory>('All')
  const [installedAssets, setInstalledAssets] = useState(new Set<string>())
  const [insertedAssetRecords, setInsertedAssetRecords] = useState<ToolboxAsset[]>([])
  const [lastInserted, setLastInserted] = useState<string | null>(null)
  const [toolboxView, setToolboxView] = useState<ToolboxView>('grid')
  const [remoteAssets, setRemoteAssets] = useState<ToolboxAsset[]>([])
  const [toolboxLoading, setToolboxLoading] = useState(false)
  const [toolboxError, setToolboxError] = useState<string | null>(null)
  const [toolboxRefresh, setToolboxRefresh] = useState(0)
  const [connection, setConnection] = useState<RobloxConnection>({ status: 'checking' })
  const [loginOpened, setLoginOpened] = useState(false)
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(() => {
    try {
      return window.localStorage.getItem('rbstudio:connection-guide') !== 'dismissed'
    } catch {
      return true
    }
  })

  const selectedName = findNodeName(sceneNodes, selected) ?? 'Workspace'
  const insertedAssets = insertedAssetRecords

  const previewAssets = useMemo(() => {
    const query = toolboxSearch.trim().toLowerCase()
    return toolboxAssets.filter((asset) => {
      const matchesCategory = toolboxCategory === 'All' || asset.category === toolboxCategory
      return matchesCategory && (!query || `${asset.name} ${asset.creator}`.toLowerCase().includes(query))
    })
  }, [toolboxCategory, toolboxSearch])

  const visibleToolboxAssets = connection.status === 'connected' ? remoteAssets : previewAssets

  const checkRobloxSession = useCallback(async () => {
    setConnection({ status: 'checking' })
    try {
      const response = await fetch('/api/roblox/session', { cache: 'no-store' })
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error('The Roblox API route is unavailable. Deploy the Netlify Functions or run npm run local.')
      }
      const body = await response.json()
      if (response.ok && body.ok && body.user) {
        setConnection({ status: 'connected', user: body.user })
        try { window.localStorage.setItem('rbstudio:connection-guide', 'dismissed') } catch { /* storage may be disabled */ }
        return
      }
      if (body.code === 'missing_cookie') {
        setConnection({ status: 'missing', message: body.message })
      } else if (body.code === 'invalid_cookie') {
        setConnection({ status: 'invalid', message: body.message })
      } else {
        setConnection({ status: 'offline', message: body.message || 'Unable to verify the server-side Roblox session.' })
      }
    } catch (error) {
      setConnection({
        status: 'offline',
        message: error instanceof Error ? error.message : 'The server bridge is not reachable.',
      })
    }
  }, [])

  useEffect(() => {
    void checkRobloxSession()
  }, [checkRobloxSession])

  useEffect(() => {
    if (!toolboxOpen || connection.status !== 'connected') {
      setToolboxLoading(false)
      setToolboxError(null)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setToolboxLoading(true)
      setToolboxError(null)
      const params = new URLSearchParams({
        category: toolboxCategoryApi[toolboxCategory],
        limit: '30',
      })
      if (toolboxSearch.trim()) params.set('keyword', toolboxSearch.trim())

      try {
        const response = await fetch(`/api/roblox/toolbox?${params}`, { signal: controller.signal, cache: 'no-store' })
        const body = await response.json()
        if (!response.ok || !body.ok) throw new Error(body.message || 'Unable to load Creator Marketplace assets.')

        const categories: ToolboxCategory[] = ['Models', 'Decals', 'Meshes', 'Audio', 'Plugins']
        const assets = (Array.isArray(body.items) ? body.items : []).map((asset: Partial<ToolboxAsset>) => {
          const fallbackCategory = toolboxCategory === 'All' ? 'Models' : toolboxCategory
          const assetCategory = categories.includes(asset.category as ToolboxCategory)
            ? asset.category as Exclude<ToolboxCategory, 'All'>
            : fallbackCategory as Exclude<ToolboxCategory, 'All'>
          const visual = toolboxVisuals[assetCategory]
          return {
            id: String(asset.id || `roblox-${asset.assetId}`),
            assetId: Number(asset.assetId),
            assetTypeId: Number(asset.assetTypeId || 10),
            name: String(asset.name || `Roblox asset ${asset.assetId}`),
            creator: String(asset.creator || 'Roblox Creator'),
            category: assetCategory,
            categoryName: toolboxCategoryApi[assetCategory],
            color: visual.color,
            glyph: visual.glyph,
            thumbnail: asset.thumbnail || null,
            verified: Boolean(asset.verified),
            source: 'roblox' as const,
          }
        }).filter((asset: ToolboxAsset) => Number.isFinite(asset.assetId))
        setRemoteAssets(assets)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setRemoteAssets([])
        setToolboxError(error instanceof Error ? error.message : 'Unable to load Creator Marketplace assets.')
      } finally {
        if (!controller.signal.aborted) setToolboxLoading(false)
      }
    }, 320)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [connection.status, toolboxCategory, toolboxOpen, toolboxRefresh, toolboxSearch])

  const filteredScene = useMemo(() => {
    if (!explorerSearch.trim()) return sceneNodes
    const query = explorerSearch.toLowerCase()
    const filterNodes = (nodes: SceneNode[]): SceneNode[] =>
      nodes.flatMap((node) => {
        const children = node.children ? filterNodes(node.children) : []
        return node.name.toLowerCase().includes(query) || children.length
          ? [{ ...node, children }]
          : []
      })
    return filterNodes(sceneNodes)
  }, [explorerSearch, sceneNodes])

  const toggleExpanded = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handlePlay = () => setPlayState((state) => (state === 'playing' ? 'paused' : 'playing'))

  const openRobloxLogin = () => {
    setLoginOpened(true)
    window.open('https://www.roblox.com/login', '_blank', 'noopener,noreferrer')
  }

  const closeConnectionDialog = () => {
    setConnectionDialogOpen(false)
    try { window.localStorage.setItem('rbstudio:connection-guide', 'dismissed') } catch { /* storage may be disabled */ }
  }

  const insertAsset = (asset: ToolboxAsset) => {
    const nodeId = `toolbox-${asset.id}`
    if (!installedAssets.has(asset.id)) {
      setInstalledAssets((current) => new Set(current).add(asset.id))
      setInsertedAssetRecords((current) => [...current, asset])
      setSceneNodes((current) => current.map((node) =>
        node.id === 'workspace'
          ? { ...node, children: [...(node.children ?? []), { id: nodeId, name: asset.name, kind: 'model' }] }
          : node
      ))
    }
    setExpanded((current) => new Set(current).add('workspace'))
    setSelected(nodeId)
    setLastInserted(asset.name)
  }

  return (
    <div className={`studio-app theme-${theme}`}>
      <header className="titlebar">
        <div className="title-left">
          <button className="app-menu" title="Studio menu"><RobloxMark /></button>
          <span className="window-title">Untitled - Roblox Studio Web</span>
        </div>
        <div className="quick-actions">
          <IconButton icon={Save} label="Save to Roblox" />
          <IconButton icon={Undo2} label="Undo" />
          <IconButton icon={Redo2} label="Redo" disabled />
        </div>
        <div className="title-actions">
          <span className="save-state"><Cloud size={13} /> Saved</span>
          <button
            className={`roblox-session-button ${connection.status}`}
            onClick={() => setConnectionDialogOpen(true)}
            title="Local Roblox connection"
          >
            {connection.status === 'checking'
              ? <LoaderCircle className="spin" size={13} />
              : connection.status === 'connected'
                ? <BadgeCheck size={13} />
                : <WifiOff size={13} />}
            <span>{connection.status === 'connected' ? connection.user?.displayName : 'Connect Roblox'}</span>
          </button>
          <button className="share-button"><Users size={14} /> Share</button>
          <IconButton icon={theme === 'dark' ? Sun : Moon} label="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
          <IconButton icon={Minus} label="Minimize" />
          <IconButton icon={Square} label="Maximize" />
          <IconButton icon={X} label="Close" />
        </div>
      </header>

      <nav className="tabs-bar" aria-label="Studio tabs">
        <button className="file-tab">File</button>
        {['Home', 'Model', 'Avatar', 'Test', 'View', 'Plugins'].map((tab) => (
          <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
        <button className="tab-overflow" aria-label="More tabs"><MoreHorizontal size={16} /></button>
      </nav>

      <section className="ribbon" aria-label={`${activeTab} tools`}>
        <div className="ribbon-group clipboard-group">
          <RibbonTool icon={Copy} label="Paste" />
          <div className="mini-tools">
            <button><Copy size={14} /> Copy</button>
            <button><Trash2 size={14} /> Cut</button>
          </div>
          <span className="group-label">Clipboard</span>
        </div>

        <div className="ribbon-group transform-group">
          <RibbonTool icon={MousePointer2} label="Select" active={tool === 'Select'} onClick={() => setTool('Select')} />
          <RibbonTool icon={Move3D} label="Move" active={tool === 'Move'} onClick={() => setTool('Move')} accent="#e64b4b" />
          <RibbonTool icon={SquareDashedMousePointer} label="Scale" active={tool === 'Scale'} onClick={() => setTool('Scale')} accent="#39a96b" />
          <RibbonTool icon={Rotate3D} label="Rotate" active={tool === 'Rotate'} onClick={() => setTool('Rotate')} accent="#4c8fec" />
          <span className="group-label">Transform</span>
        </div>

        <div className="ribbon-group">
          <RibbonTool icon={Lock} label="Lock" />
          <RibbonTool icon={Component} label="Group" />
          <RibbonTool icon={Box} label="Part" />
          <span className="group-label">Edit</span>
        </div>

        <div className="ribbon-group play-group">
          <RibbonTool icon={playState === 'paused' ? Play : Pause} label={playState === 'playing' ? 'Pause' : 'Play'} active={playState !== 'editing'} onClick={handlePlay} accent="#39a96b" />
          <RibbonTool icon={StopCircle} label="Stop" onClick={() => setPlayState('editing')} accent="#e64b4b" />
          <RibbonTool icon={MonitorPlay} label="Run" onClick={() => setPlayState('playing')} />
          <span className="group-label">Test</span>
        </div>

        <div className="ribbon-group insert-group">
          <RibbonTool icon={Gamepad2} label="Toolbox" active={toolboxOpen} onClick={() => setToolboxOpen((value) => !value)} />
          <RibbonTool icon={Package} label="Asset Manager" />
          <RibbonTool icon={Hammer} label="Terrain" />
          <RibbonTool icon={Sparkles} label="Material" />
          <span className="group-label">Insert</span>
        </div>

        <div className="ribbon-spacer" />
        <div className="ribbon-group compact-group">
          <RibbonTool icon={PanelRightClose} label="Panels" active={rightDockOpen} onClick={() => setRightDockOpen((value) => !value)} />
          <RibbonTool icon={Settings} label="Game Settings" />
          <span className="group-label">Settings</span>
        </div>
      </section>

      <div className={`workspace-shell${rightDockOpen ? '' : ' dock-closed'}${outputOpen ? '' : ' output-closed'}`}>
        <Viewport selected={selected} selectedName={selectedName} insertedAssets={insertedAssets} onSelect={setSelected} />

        {toolboxOpen && (
          <ToolboxPanel
            assets={visibleToolboxAssets}
            search={toolboxSearch}
            category={toolboxCategory}
            installed={installedAssets}
            isLoading={toolboxLoading}
            error={toolboxError}
            connected={connection.status === 'connected'}
            user={connection.user}
            view={toolboxView}
            onSearch={setToolboxSearch}
            onCategory={setToolboxCategory}
            onInsert={insertAsset}
            onView={setToolboxView}
            onConnect={() => setConnectionDialogOpen(true)}
            onRefresh={() => setToolboxRefresh((value) => value + 1)}
            onClose={() => setToolboxOpen(false)}
          />
        )}

        {rightDockOpen && (
          <aside className="right-dock">
            <section className="dock-panel explorer-panel">
              <header className="panel-header">
                <span>Explorer</span>
                <div><IconButton icon={Plus} label="Insert object" /><IconButton icon={MoreHorizontal} label="Explorer options" /></div>
              </header>
              <div className="panel-search">
                <Search size={14} />
                <input value={explorerSearch} onChange={(e) => setExplorerSearch(e.target.value)} placeholder="Filter workspace" />
                {explorerSearch && <button onClick={() => setExplorerSearch('')}><X size={13} /></button>}
              </div>
              <div className="tree-view">
                {filteredScene.map((node) => (
                  <ExplorerNode key={node.id} node={node} depth={0} selected={selected} onSelect={setSelected} expanded={expanded} onToggle={toggleExpanded} />
                ))}
              </div>
            </section>

            <section className="dock-panel properties-panel">
              <header className="panel-header">
                <span>Properties <b>{selectedName}</b></span>
                <IconButton icon={SlidersHorizontal} label="Property options" />
              </header>
              <div className="panel-search"><Search size={14} /><input placeholder="Filter properties" /></div>
              <Properties selected={selected} displayName={selectedName} />
            </section>
          </aside>
        )}

        {outputOpen && (
          <section className="bottom-panel">
            <header className="bottom-tabs">
              {[
                ['Output', TerminalSquare],
                ['Script Analysis', Code2],
                ['Find Results', Search],
              ].map(([tab, Icon]) => (
                <button key={tab as string} className={activeBottomTab === tab ? 'active' : ''} onClick={() => setActiveBottomTab(tab as string)}>
                  <Icon size={14} /> {tab as string}
                </button>
              ))}
              <span className="bottom-tab-spacer" />
              <IconButton icon={Trash2} label="Clear output" />
              <IconButton icon={X} label="Close output" onClick={() => setOutputOpen(false)} />
            </header>
            <div className="output-content">
              <div><span className="timestamp">09:41:06.112</span> Studio session started</div>
              <div><span className="timestamp">09:41:06.184</span> Auto-recovery file was created</div>
              {playState !== 'editing' && <div className="output-info"><span className="timestamp">09:42:11.027</span> Running game simulation</div>}
              {lastInserted && <div className="output-info"><span className="timestamp">Toolbox</span> Inserted {lastInserted} into Workspace</div>}
              <span className="output-caret" />
            </div>
          </section>
        )}
      </div>

      <footer className="statusbar">
        <div className="status-left">
          {!outputOpen && <button onClick={() => setOutputOpen(true)}><PanelBottomClose size={13} /> Output</button>}
          <span>{playState === 'editing' ? 'Ready' : playState === 'playing' ? 'Simulation running' : 'Simulation paused'}</span>
        </div>
        <div className="status-right">
          <span className={`status-session ${connection.status}`}>
            {connection.status === 'connected' ? <BadgeCheck size={12} /> : <WifiOff size={12} />}
            {connection.status === 'connected' ? 'Roblox connected' : 'Local preview'}
          </span>
          <span>Grid 1 stud</span><span>Rotation 45°</span><span><Users size={12} /> 1</span><CircleHelp size={14} />
        </div>
      </footer>

      {connectionDialogOpen && (
        <ConnectionDialog
          connection={connection}
          loginOpened={loginOpened}
          onOpenLogin={openRobloxLogin}
          onRetry={checkRobloxSession}
          onClose={closeConnectionDialog}
        />
      )}
    </div>
  )
}

export default App
