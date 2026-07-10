import { useMemo, useState } from 'react'
import {
  AppWindow,
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
  Folder,
  Gamepad2,
  Grid3X3,
  Hammer,
  Hand,
  Image,
  Layers3,
  Lightbulb,
  LocateFixed,
  Lock,
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
  Rotate3D,
  Save,
  Search,
  Settings,
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
  Users,
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
  color: string
  glyph: string
  verified?: boolean
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
              background: asset.color,
            }}
            title={asset.name}
            onClick={(event) => {
              event.stopPropagation()
              onSelect(`toolbox-${asset.id}`)
            }}
          >
            <span>{asset.glyph}</span>
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
  search,
  category,
  installed,
  onSearch,
  onCategory,
  onInsert,
  onClose,
}: {
  search: string
  category: ToolboxCategory
  installed: Set<string>
  onSearch: (value: string) => void
  onCategory: (value: ToolboxCategory) => void
  onInsert: (asset: ToolboxAsset) => void
  onClose: () => void
}) {
  const visibleAssets = toolboxAssets.filter((asset) => {
    const matchesCategory = category === 'All' || asset.category === category
    const query = search.trim().toLowerCase()
    return matchesCategory && (!query || `${asset.name} ${asset.creator}`.toLowerCase().includes(query))
  })

  return (
    <aside className="toolbox-panel" aria-label="Toolbox">
      <header className="toolbox-header">
        <div><Gamepad2 size={16} /><strong>Toolbox</strong></div>
        <IconButton icon={X} label="Close Toolbox" onClick={onClose} />
      </header>
      <div className="toolbox-market-tabs">
        <button className="active">Marketplace</button>
        <button>Inventory</button>
        <button>Recent</button>
        <button>My Creations</button>
      </div>
      <label className="toolbox-search">
        <Search size={15} />
        <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search Marketplace" autoFocus />
        {search && <button onClick={() => onSearch('')} aria-label="Clear search"><X size={13} /></button>}
      </label>
      <div className="toolbox-categories">
        {(['All', 'Models', 'Decals', 'Meshes', 'Audio', 'Plugins'] as ToolboxCategory[]).map((item) => (
          <button key={item} className={category === item ? 'active' : ''} onClick={() => onCategory(item)}>{item}</button>
        ))}
      </div>
      <div className="toolbox-results-label">
        <span>Creator Marketplace</span>
        <button title="Filter assets"><SlidersHorizontal size={14} /></button>
      </div>
      <div className="toolbox-grid">
        {visibleAssets.map((asset) => {
          const isInstalled = installed.has(asset.id)
          return (
            <article className="asset-card" key={asset.id}>
              <button className="asset-preview" style={{ background: `linear-gradient(145deg, ${asset.color}, #25272a)` }} onClick={() => onInsert(asset)}>
                <span>{asset.glyph}</span>
                <i>{asset.category}</i>
              </button>
              <div className="asset-info">
                <strong title={asset.name}>{asset.name}</strong>
                <span>{asset.verified ? '◉ ' : ''}{asset.creator}</span>
                <small>Asset ID {asset.assetId}</small>
                <button className={isInstalled ? 'installed' : ''} onClick={() => onInsert(asset)}>
                  {isInstalled ? '✓ Inserted' : '+ Insert'}
                </button>
              </div>
            </article>
          )
        })}
        {!visibleAssets.length && (
          <div className="toolbox-empty"><Package size={28} /><span>No assets found</span></div>
        )}
      </div>
      <footer className="toolbox-footer">{visibleAssets.length} assets · Toolbox Service preview</footer>
    </aside>
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
  const [lastInserted, setLastInserted] = useState<string | null>(null)

  const selectedName = findNodeName(sceneNodes, selected) ?? 'Workspace'
  const insertedAssets = toolboxAssets.filter((asset) => installedAssets.has(asset.id))

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

  const insertAsset = (asset: ToolboxAsset) => {
    const nodeId = `toolbox-${asset.id}`
    if (!installedAssets.has(asset.id)) {
      setInstalledAssets((current) => new Set(current).add(asset.id))
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
            search={toolboxSearch}
            category={toolboxCategory}
            installed={installedAssets}
            onSearch={setToolboxSearch}
            onCategory={setToolboxCategory}
            onInsert={insertAsset}
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
          <span>Grid 1 stud</span><span>Rotation 45°</span><span><Users size={12} /> 1</span><CircleHelp size={14} />
        </div>
      </footer>
    </div>
  )
}

export default App
