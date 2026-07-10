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

type SceneNode = {
  id: string
  name: string
  kind: 'service' | 'part' | 'model' | 'script' | 'camera' | 'terrain'
  children?: SceneNode[]
}

const scene: SceneNode[] = [
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

const objectNames = new Map<string, string>()
const indexNodes = (nodes: SceneNode[]) => {
  nodes.forEach((node) => {
    objectNames.set(node.id, node.name)
    if (node.children) indexNodes(node.children)
  })
}
indexNodes(scene)

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

function Properties({ selected }: { selected: string }) {
  const displayName = objectNames.get(selected) ?? 'Baseplate'
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

function Viewport({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
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
      </div>

      <div className="axis-gizmo" aria-label="World axes">
        <span className="axis y">Y</span>
        <span className="axis x">X</span>
        <span className="axis z">Z</span>
        <span className="axis-origin" />
      </div>
      <div className="viewport-hint"><MousePointer2 size={13} /> {objectNames.get(selected) ?? 'Workspace'}</div>
    </main>
  )
}

function App() {
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

  const filteredScene = useMemo(() => {
    if (!explorerSearch.trim()) return scene
    const query = explorerSearch.toLowerCase()
    const filterNodes = (nodes: SceneNode[]): SceneNode[] =>
      nodes.flatMap((node) => {
        const children = node.children ? filterNodes(node.children) : []
        return node.name.toLowerCase().includes(query) || children.length
          ? [{ ...node, children }]
          : []
      })
    return filterNodes(scene)
  }, [explorerSearch])

  const toggleExpanded = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handlePlay = () => setPlayState((state) => (state === 'playing' ? 'paused' : 'playing'))

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
          <RibbonTool icon={Gamepad2} label="Toolbox" />
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
        <Viewport selected={selected} onSelect={setSelected} />

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
                <span>Properties <b>{objectNames.get(selected)}</b></span>
                <IconButton icon={SlidersHorizontal} label="Property options" />
              </header>
              <div className="panel-search"><Search size={14} /><input placeholder="Filter properties" /></div>
              <Properties selected={selected} />
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
