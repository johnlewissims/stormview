import * as L from 'leaflet'

import { CITIES, LAYERS, NEXRAD_STATIONS, SPC_URLS, WCFG } from './controller/config'
import type { AlertItem, City, LayerId, OverlayName, SpcDay, WarningType } from './controller/types'
import { classifyNwsEvent, getSpcColor, p2, parseVtecToWwaUrl, stationCodeForIEM } from './controller/utils'

export class StormViewController {
  private map: L.Map | null = null

  private curLayer: LayerId = 'ref'
  private radOp = 0.85
  private wrnOp = 0.8
  private lblMode = 1

  private rvFrames: Array<{ time: number; path: string }> = []
  private rvHost = ''
  private radLayers: Record<string, L.TileLayer> = {}
  private frameIndex = 0
  private frameCount = 50

  private playing = false
  private speed = 3
  private lastAnimTs = 0
  private animRaf: number | null = null

  private autoOn = true

  private warningVisible: Record<WarningType, boolean> = {
    TOR: true,
    SVR: true,
    SPS: true,
    SMW: true,
    TWA: true,
    SWA: true,
    MCD: true,
    FF: true,
    FLD: true,
    WS: true,
    HEAT: true,
    FIRE: true,
    WIND: true,
    MAR: true,
    GEN: true,
  }

  private warningLayers: Record<string, L.Layer> = {}
  private alertCenters: Record<string, L.LatLng> = {}
  private alerts: AlertItem[] = []

  private cityGroup: L.LayerGroup | null = null
  private pinMarker: L.Marker | null = null

  private nexradGroup: L.LayerGroup | null = null
  private nexradDotsOn = true

  private activeStation: string | null = null
  private isolationMode = false

  private overlayVis: Record<OverlayName, boolean> = {
    county: false,
    state: false,
    cwa: false,
  }

  private countyOverlay: L.TileLayer.WMS | null = null
  private stateOverlay: L.TileLayer.WMS | null = null
  private cwaOverlay: L.TileLayer.WMS | null = null

  private spcLayers: Record<SpcDay, L.GeoJSON | null> = { 1: null, 2: null, 3: null }
  private spcOn: Record<SpcDay, boolean> = { 1: false, 2: false, 3: false }
  private spcHighlight: L.GeoJSON | null = null

  private utcInterval: number | null = null
  private fetchAllInterval: number | null = null
  private warningsInterval: number | null = null
  private radarAutoRefreshInterval: number | null = null

  private hrrrLayer: L.TileLayer | null = null
  private rrfsLayer: L.TileLayer | null = null
  private hrrrOn = false
  private rrfsOn = false

  private weatherBellOpen = false

  private cleanupSearchOutsideClick: (() => void) | null = null
  private alertListClickHandlerAttached = false

  init() {
    this.startUtcClock()
    this.initMap()
    this.buildLegend()
    this.updateQuickAnalysis()
    this.startRadarAutoRefresh()

    // Build initial layers shortly after map initializes.
    window.setTimeout(() => {
      this.rebuildCities()
      this.buildNexradDots()
    }, 800)

    // Initial fetch + auto timers
    this.fetchAll().catch(() => {})

    this.fetchAllInterval = window.setInterval(() => {
      if (!this.autoOn) return
      this.fetchAll().catch(() => {})
    }, 120000)

    // Warnings refresh is faster per spec when auto is enabled.
    this.warningsInterval = window.setInterval(() => {
      if (!this.autoOn) return
      this.loadWarningsAndSpc().catch(() => {})
    }, 60000)

    this.attachGlobalHandlers()
    this.attachAlertListClickHandler()
    this.initWeatherBellPanel()
  }

  destroy() {
    if (this.utcInterval) window.clearInterval(this.utcInterval)
    if (this.fetchAllInterval) window.clearInterval(this.fetchAllInterval)
    if (this.warningsInterval) window.clearInterval(this.warningsInterval)
    if (this.radarAutoRefreshInterval) window.clearInterval(this.radarAutoRefreshInterval)

    this.stopAnimation()

    if (this.cleanupSearchOutsideClick) this.cleanupSearchOutsideClick()

    if (this.map) {
      this.map.off()
      this.map.remove()
      this.map = null
    }

    this.cityGroup = null
    this.nexradGroup = null
    this.pinMarker = null
    this.warningLayers = {}
    this.radLayers = {}
    this.alerts = []
  }

  // ─────────────────────────────────────────────────────────────
  // UI actions (called from React)
  // ─────────────────────────────────────────────────────────────

  toggleSection(id: string) {
    const el = document.getElementById(id)
    if (el) el.classList.toggle('collapsed')
  }

  setLayer(id: LayerId) {
    if (id === 'vel') {
      this.msg('Velocity disabled — no live feed')
      return
    }

    if (id === 'sat') {
      this.msg('Satellite disabled — radar-focused build')
      this.syncModeTabs({ satDisabled: true })
      return
    }

    this.curLayer = 'ref'

    document.getElementById('btn-ref')?.classList.add('on')
    document.getElementById('btn-sat')?.classList.remove('on')
    document.getElementById('btn-vel')?.classList.remove('on')

    const layerLabel = document.getElementById('blyr')
    if (layerLabel) layerLabel.textContent = 'Reflectivity (dBZ)'

    this.syncModeTabs({ radarOn: true })
    this.buildLegend()
    this.buildRadarLayers()
    this.updateQuickAnalysis()
  }

  radarTab() {
    this.syncModeTabs({ radarOn: true })
    this.setLayer('ref')
  }

  satelliteTab() {
    this.syncModeTabs({ satDisabled: true })
    this.setLayer('sat')
  }

  homeTab() {
    this.syncModeTabs({ homeOn: true })
    this.resetView()
  }

  toggleNexradDots() {
    this.nexradDotsOn = !this.nexradDotsOn
    document.getElementById('ov-nexrad')?.classList.toggle('on', this.nexradDotsOn)
    this.buildNexradDots()
  }

  setStation(stn: string | null) {
    this.activeStation = stn

    const astn = document.getElementById('active-stn')
    if (astn) astn.textContent = stn ? `${stn} — Single Site` : 'CONUS Composite'

    this.buildRadarLayers()
    this.updateQuickAnalysis()
    this.buildNexradDots()

    if (stn) {
      this.enterStationView(stn)
    } else {
      this.isolationMode = false
      document.getElementById('station-banner')?.classList.remove('on')
      this.rebuildCities()
      this.buildNexradDots()
    }
  }

  exitStationView() {
    this.isolationMode = false
    this.rebuildCities()
    this.buildNexradDots()

    ;([1, 2, 3] as const).forEach((d) => {
      const layer = this.spcLayers[d]
      if (layer && this.map && this.map.hasLayer(layer)) {
        layer.setStyle((feat) => {
          const f = feat as GeoJSON.Feature
          const props = (f.properties || {}) as Record<string, unknown>
          const cfg = getSpcColor(props)
          const opacity = d === 1 ? 0.38 : d === 2 ? 0.28 : 0.2
          return { fillOpacity: opacity, fillColor: cfg.fill, color: cfg.stroke }
        })
      }
    })

    document.getElementById('station-banner')?.classList.remove('on')
    this.setStation(null)
  }

  toggleOverlay(name: OverlayName) {
    this.overlayVis[name] = !this.overlayVis[name]
    document.getElementById(`ov-${name}`)?.classList.toggle('on', this.overlayVis[name])
    this.syncOverlayVisibility()
    this.msg(`${name} overlay ${this.overlayVis[name] ? 'on' : 'off'}`)
  }

  toggleSPCDay(day: SpcDay) {
    this.spcOn[day] = !this.spcOn[day]

    document.getElementById(`ov-d${day}`)?.classList.toggle('on', this.spcOn[day])

    const topBtn = document.getElementById('mode-outlook')
    if (day === 1 && topBtn) {
      topBtn.classList.toggle('on', this.spcOn[1])
      topBtn.classList.toggle('dim', !this.spcOn[1])
    }

    if (this.spcOn[day]) {
      if (!this.spcLayers[day]) {
        this.loadSpcDay(day).catch(() => {})
      } else {
        const layer = this.spcLayers[day]
        if (layer && this.map && !this.map.hasLayer(layer)) layer.addTo(this.map)
      }
      this.msg(`SPC Day ${day} outlook on`)
    } else {
      const layer = this.spcLayers[day]
      if (layer && this.map && this.map.hasLayer(layer)) this.map.removeLayer(layer)
      this.msg(`SPC Day ${day} outlook off`)
    }

    this.updateQuickAnalysis()
  }

  toggleWarningType(type: WarningType) {
    this.warningVisible[type] = !this.warningVisible[type]
    document.getElementById(`wt-${type}`)?.classList.toggle('on', this.warningVisible[type])
    // simplest safe approach: refetch + redraw
    this.loadWarningsAndSpc().catch(() => {})
  }

  toggleHighDetail() {
    document.getElementById('wt-HD')?.classList.toggle('on')
    document.getElementById('wxchip-hd')?.classList.toggle('on')
    // safe build uses radar-only basemap; no additional imagery logic.
    this.msg('Radar-only mode')
  }

  setOpacity(which: 0 | 1, value: number) {
    if (which === 0) {
      this.radOp = value / 100
      const vr = document.getElementById('v-rad')
      if (vr) vr.textContent = `${value}%`

      const layer = this.radLayers[String(this.frameIndex)]
      if (layer) layer.setOpacity(this.radOp)
      return
    }

    this.wrnOp = value / 100
    const vw = document.getElementById('v-wrn')
    if (vw) vw.textContent = `${value}%`

    Object.values(this.warningLayers).forEach((l) => {
      // Polygon layers support setStyle
      const anyLayer = l as unknown as { setStyle?: (s: unknown) => void }
      if (!anyLayer.setStyle) return
      anyLayer.setStyle({
        fillOpacity: 0.15 * this.wrnOp,
        opacity: Math.min(1, this.wrnOp * 1.3),
      })
    })
  }

  setLabelMode(mode: number) {
    this.lblMode = mode
    const lbl = document.getElementById('v-lbl')
    if (lbl) lbl.textContent = ['Off', 'Med', 'Hi', 'All'][mode] ?? String(mode)
    this.rebuildCities()
  }

  togglePlay() {
    // No replay in single-site mode.
    if (this.activeStation) {
      this.msg('Replay paused in station mode')
      return
    }

    this.playing = !this.playing

    const btn = document.getElementById('tl-play')
    if (btn) {
      btn.textContent = this.playing ? '⏹' : '▶'
      btn.classList.toggle('on', this.playing)
    }

    const pbtn = document.getElementById('pbtn')
    if (pbtn) {
      pbtn.textContent = this.playing ? '⏹ Stop' : '▶ Play'
      pbtn.classList.toggle('on', this.playing)
    }

    if (this.playing) {
      this.lastAnimTs = performance.now()
      this.animRaf = window.requestAnimationFrame((t) => this.animLoop(t))
    } else {
      this.stopAnimation()
    }
  }

  step(delta: number) {
    if (!this.rvFrames.length) return
    const total = this.rvFrames.length
    const next = ((this.frameIndex + delta) % total + total) % total
    this.showFrame(next)
  }

  setSpeed(speed: number) {
    this.speed = speed
    const v = document.getElementById('v-spd')
    if (v) v.textContent = `${speed}x`

    const sel = document.getElementById('tl-spd') as HTMLSelectElement | null
    if (sel) sel.value = String(speed)
  }

  setFrameCount(count: number) {
    this.frameCount = count

    document.querySelectorAll('[id^="fcount-"]').forEach((b) => b.classList.remove('on'))
    document.getElementById(`fcount-${count}`)?.classList.add('on')

    this.loadRadar().catch(() => {})
    this.msg(`Replay set to ${count} frames`)
  }

  toggleAutoRefresh() {
    this.autoOn = !this.autoOn
    document.getElementById('auto-btn')?.classList.toggle('on', this.autoOn)
    this.msg(`Auto refresh ${this.autoOn ? 'on' : 'off'}`)
  }

  async fetchAll() {
    this.spin(true)
    this.msg('Fetching live radar...')

    try {
      await this.loadRadar()
    } catch (e) {
      this.msg(`Radar error: ${(e as Error).message}`)
    }

    await this.loadWarningsAndSpc()

    this.msg('Fetching SPC outlooks...')
    this.loadSpcDay(1).catch(() => {})
    this.loadSpcDay(2).catch(() => {})
    this.loadSpcDay(3).catch(() => {})

    this.syncOverlayVisibility()

    this.spin(false)

    const n = new Date()
    const ts = `${p2(n.getUTCHours())}:${p2(n.getUTCMinutes())}Z`
    const upd = document.getElementById('upd')
    if (upd) upd.textContent = `Updated ${ts}`

    this.msg(`Live · ${ts} · ${this.alerts.length} alerts active`)
    window.setTimeout(() => {
      const sb = document.getElementById('sb')
      if (sb) sb.style.opacity = '0.4'
    }, 5000)
  }

  zoomIn() {
    this.map?.zoomIn()
  }

  zoomOut() {
    this.map?.zoomOut()
  }

  resetView() {
    if (!this.map) return
    this.map.flyTo([38, -96], 5, { duration: 1 })
    if (this.pinMarker) {
      this.map.removeLayer(this.pinMarker)
      this.pinMarker = null
    }
  }

  timelineSeek(e: MouseEvent | { clientX: number }) {
    const bar = document.getElementById('tl-bar')
    if (!bar || !this.rvFrames.length) return
    const rect = bar.getBoundingClientRect()

    const clientX = 'clientX' in e ? e.clientX : 0
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const idx = Math.round(pct * (this.rvFrames.length - 1))
    this.showFrame(idx)
  }

  onSearchInput() {
    const input = document.getElementById('li') as HTMLInputElement | null
    const q = input?.value.trim() ?? ''
    if (q.length < 2) {
      this.hideSuggestions()
      return
    }

    const m = CITIES.filter((c) => c.n.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
    if (m.length) this.showSuggestions(m)
    else this.hideSuggestions()
  }

  onSearchKeyDown(e: KeyboardEvent | { key: string; preventDefault: () => void }) {
    if (e.key === 'Enter') {
      e.preventDefault()
      this.doSearch()
    }
    if (e.key === 'Escape') this.hideSuggestions()
  }

  async doSearch() {
    const input = document.getElementById('li') as HTMLInputElement | null
    const q = input?.value.trim() ?? ''
    if (!q) return

    this.hideSuggestions()

    const match = CITIES.find((c) => c.n.toLowerCase().includes(q.toLowerCase()))
    if (match) {
      await this.showCityPanel(match)
      return
    }

    const co = q.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/)
    if (co) {
      this.flyTo(+co[1], +co[2], 10, q)
      return
    }

    try {
      const res = await this.fetchWithTimeout(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=us`,
        { headers: { 'Accept-Language': 'en' } },
        8000,
      )
      const d = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>
      if (d && d[0]) {
        const label = d[0].display_name.split(',').slice(0, 2).join(',')
        this.flyTo(+d[0].lat, +d[0].lon, 9, label)
      } else {
        this.msg(`Not found: ${q}`)
      }
    } catch {
      this.msg('Search error')
    }
  }

  selectWxChip(mode: 'radar' | 'model' | 'spc') {
    const ids: Array<[string, 'radar' | 'model' | 'spc']> = [
      ['wxchip-radar', 'radar'],
      ['wxchip-model', 'model'],
      ['wxchip-spc', 'spc'],
    ]

    ids.forEach(([id, m]) => {
      document.getElementById(id)?.classList.toggle('on', m === mode)
    })

    if (mode === 'radar') {
      this.setLayer('ref')
      return
    }

    if (mode === 'spc') {
      this.toggleSPCDay(1)
      return
    }

    // model
    this.toggleRRFS()
    this.toggleWeatherBell()
  }

  miniTool(t: 'R' | 'S' | 'M' | 'W') {
    document.querySelectorAll('.mtbtn').forEach((b) => b.classList.remove('on'))

    if (t === 'R') {
      this.setLayer('ref')
      this.addMiniToolOn(t)
      return
    }

    if (t === 'S') {
      this.setLayer('sat')
      this.addMiniToolOn(t)
      return
    }

    if (t === 'M') {
      this.toggleHRRR()
      this.addMiniToolOn(t)
      return
    }

    this.toggleSPCDay(1)
    this.addMiniToolOn(t)
  }

  closeWarnCard() {
    document.getElementById('warn-card')?.classList.remove('open')
  }

  toggleWeatherBell(force?: boolean) {
    this.weatherBellOpen = typeof force === 'boolean' ? force : !this.weatherBellOpen
    document.getElementById('wb-panel')?.classList.toggle('open', this.weatherBellOpen)
  }

  // ─────────────────────────────────────────────────────────────
  // Map init
  // ─────────────────────────────────────────────────────────────

  private initMap() {
    const mapEl = document.getElementById('map')
    if (!mapEl) throw new Error('Missing #map element')

    const map = L.map(mapEl, {
      center: [38, -96],
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
      maxZoom: 12,
      minZoom: 3,
    })

    this.map = map

    map.createPane('baseLabels')
    const baseLabels = map.getPane('baseLabels')
    if (baseLabels) {
      baseLabels.style.zIndex = '350'
      baseLabels.style.pointerEvents = 'none'
    }

    map.createPane('boundaries')
    const boundaries = map.getPane('boundaries')
    if (boundaries) {
      boundaries.style.zIndex = '360'
      boundaries.style.pointerEvents = 'none'
    }

    map.createPane('outlook')
    const outlook = map.getPane('outlook')
    if (outlook) {
      outlook.style.zIndex = '390'
      outlook.style.pointerEvents = 'none'
    }

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(map)

    this.setupReferenceOverlays()

    L.control.scale({ imperial: true, metric: false, position: 'bottomleft' }).addTo(map)

    map.on('zoom', () => {
      const z = map.getZoom()
      document.getElementById('zbadge')!.textContent = `Zoom ${z}`
      document.getElementById('bzm')!.textContent = String(z)
      this.rebuildCities()
      this.buildNexradDots()
    })

    map.on('mousemove', (e) => {
      const la = Math.abs(e.latlng.lat).toFixed(3) + (e.latlng.lat >= 0 ? '°N' : '°S')
      const lo = Math.abs(e.latlng.lng).toFixed(3) + (e.latlng.lng <= 0 ? '°W' : '°E')
      const rll = document.getElementById('rll')
      if (rll && !this.isolationMode) rll.textContent = `${la} / ${lo}`
      document.getElementById('bco')!.textContent = `${la} ${lo}`
    })

    map.on('click', (e) => {
      const lat = e.latlng.lat
      const lon = e.latlng.lng
      const lbl = `${Math.abs(lat).toFixed(3)}°,${Math.abs(lon).toFixed(3)}°`
      this.dropPin(lat, lon, lbl)
      this.showCityPanel({ n: lbl, lat, lon, p: 1 }).catch(() => {})
    })
  }

  private setupReferenceOverlays() {
    if (!this.map) return
    const refBase =
      'https://mapservices.weather.noaa.gov/static/services/nws_reference_maps/nws_reference_map/MapServer/WMSServer'

    this.countyOverlay = L.tileLayer.wms(refBase, {
      layers: '2',
      format: 'image/png',
      transparent: true,
      opacity: 0.42,
      version: '1.3.0',
      pane: 'boundaries',
    })

    this.stateOverlay = L.tileLayer.wms(refBase, {
      layers: '3',
      format: 'image/png',
      transparent: true,
      opacity: 0.72,
      version: '1.3.0',
      pane: 'boundaries',
    })

    this.cwaOverlay = L.tileLayer.wms(refBase, {
      layers: '1',
      format: 'image/png',
      transparent: true,
      opacity: 0.55,
      version: '1.3.0',
      pane: 'boundaries',
    })

    this.syncOverlayVisibility()
  }

  private syncOverlayVisibility() {
    if (!this.map) return

    const pairs: Array<[OverlayName, L.TileLayer.WMS | null]> = [
      ['county', this.countyOverlay],
      ['state', this.stateOverlay],
      ['cwa', this.cwaOverlay],
    ]

    pairs.forEach(([key, layer]) => {
      if (!layer) return
      if (this.overlayVis[key]) {
        if (!this.map!.hasLayer(layer)) layer.addTo(this.map!)
      } else {
        if (this.map!.hasLayer(layer)) this.map!.removeLayer(layer)
      }
    })

    ;([1, 2, 3] as const).forEach((day) => {
      const layer = this.spcLayers[day]
      if (!layer) return
      if (this.spcOn[day]) {
        if (!this.map!.hasLayer(layer)) layer.addTo(this.map!)
      } else {
        if (this.map!.hasLayer(layer)) this.map!.removeLayer(layer)
      }
    })
  }

  // ─────────────────────────────────────────────────────────────
  // Radar
  // ─────────────────────────────────────────────────────────────

  private async loadRadar() {
    const res = await this.fetchWithTimeout('https://api.rainviewer.com/public/weather-maps.json', undefined, 12000)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as {
      host: string
      radar?: { past?: Array<{ time: number; path: string }> }
    }

    this.rvHost = data.host
    this.rvFrames = (data.radar?.past ?? []).slice(-this.frameCount)
    this.buildRadarLayers()
  }

  private buildRadarLayers() {
    if (!this.map) return

    const wasPlaying = this.playing
    if (wasPlaying) this.playing = false

    Object.values(this.radLayers).forEach((l) => {
      try {
        this.map!.removeLayer(l)
      } catch {
        // ignore
      }
    })
    this.radLayers = {}

    if (this.curLayer === 'sat') return

    if (this.activeStation) {
      const code = stationCodeForIEM(this.activeStation)
      if (!code) return

      const url = `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::${code}-N0Q-0/{z}/{x}/{y}.png`
      const layer = L.tileLayer(url, {
        opacity: this.radOp,
        tileSize: 256,
        zIndex: 200,
        maxZoom: 12,
        maxNativeZoom: 10,
        crossOrigin: true,
        updateWhenZooming: false,
        keepBuffer: 2,
        errorTileUrl:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      })
      layer.addTo(this.map)

      this.radLayers['0'] = layer
      this.frameIndex = 0

      const tlTime = document.getElementById('tl-time')
      if (tlTime) {
        tlTime.textContent = 'Latest'
        tlTime.classList.add('on')
      }

      document.getElementById('tl-stn')!.textContent = this.activeStation
      document.getElementById('frn')!.textContent = this.activeStation
      document.getElementById('frt')!.textContent = 'Latest'

      const playBtn = document.getElementById('tl-play')
      if (playBtn) {
        playBtn.textContent = '▶'
        playBtn.classList.remove('on')
      }

      const sidePlay = document.getElementById('pbtn')
      if (sidePlay) {
        sidePlay.textContent = '▶ Play'
        sidePlay.classList.remove('on')
      }

      this.msg(`${this.activeStation} latest radar loaded · replay paused in station mode`)
      this.updateTimelineBar()
      this.updateQuickAnalysis()
      return
    }

    if (this.rvFrames.length > 0 && this.rvHost) {
      this.rvFrames.forEach((frame, i) => {
        const url = `${this.rvHost}${frame.path}/256/{z}/{x}/{y}/6/1_1.png`
        const layer = L.tileLayer(url, {
          opacity: i === this.rvFrames.length - 1 ? this.radOp : 0,
          tileSize: 256,
          zIndex: 200,
          maxZoom: 12,
          maxNativeZoom: 10,
          crossOrigin: true,
          updateWhenZooming: false,
          keepBuffer: 2,
        })

        layer.addTo(this.map!)
        this.radLayers[String(i)] = layer
      })

      this.frameIndex = this.rvFrames.length - 1
      this.showFrame(this.frameIndex)
    } else {
      const layer = L.tileLayer(
        'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png',
        {
          opacity: this.radOp,
          tileSize: 256,
          zIndex: 200,
          maxZoom: 12,
          maxNativeZoom: 10,
          crossOrigin: true,
          keepBuffer: 2,
        },
      )

      layer.addTo(this.map!)
      this.radLayers['0'] = layer
      this.frameIndex = 0
    }

    document.getElementById('tl-time')!.textContent = 'LIVE'
    document.getElementById('tl-time')!.classList.add('on')
    document.getElementById('tl-stn')!.textContent = 'CONUS'

    document.getElementById('frn')!.textContent = 'LIVE'
    document.getElementById('frt')!.textContent = 'Current'

    this.msg(`CONUS radar · ${this.rvFrames.length} frames`)
    this.updateTimelineBar()
    this.updateQuickAnalysis()

    if (wasPlaying && this.rvFrames.length > 1) {
      this.playing = true
      this.lastAnimTs = performance.now()
      this.animRaf = window.requestAnimationFrame((t) => this.animLoop(t))
    }
  }

  private showFrame(i: number) {
    const total = this.rvFrames.length
    if (!total) return

    const idx = Math.max(0, Math.min(i, total - 1))

    for (let j = 0; j < total; j++) {
      const layer = this.radLayers[String(j)]
      if (layer) layer.setOpacity(j === idx ? this.radOp : 0)
    }

    this.frameIndex = idx
    const isLive = idx === total - 1
    document.getElementById('frn')!.textContent = isLive ? 'LIVE' : String(idx + 1)

    const tc = document.getElementById('tl-time')
    const frame = this.rvFrames[idx]
    if (frame) {
      const d = new Date(frame.time * 1000)
      const ts = `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}Z`
      if (tc) {
        tc.textContent = isLive ? 'LIVE' : ts
        tc.classList.toggle('on', isLive)
      }
      document.getElementById('frt')!.textContent = ts
    }

    this.updateTimelineBar()
  }

  private updateTimelineBar() {
    const total = this.rvFrames.length
    if (!total) return

    const pct = total > 1 ? (this.frameIndex / (total - 1)) * 100 : 100
    const head = document.getElementById('tl-head')
    if (head) (head as HTMLDivElement).style.left = `${pct}%`

    const stn = document.getElementById('tl-stn')
    if (stn) stn.textContent = this.activeStation || 'CONUS'

    const bar = document.getElementById('tl-bar')
    if (bar && bar.getAttribute('data-ticks') !== String(total)) {
      bar.setAttribute('data-ticks', String(total))
      bar.querySelectorAll('.tl-tick').forEach((t) => t.remove())

      for (let i = 0; i < total; i++) {
        const tick = document.createElement('div')
        tick.className = 'tl-tick'
        tick.style.cssText = `position:absolute;top:0;bottom:0;left:${(i / (total - 1)) * 100}%;width:2px;background:rgba(255,255,255,0.15);pointer-events:none;`
        bar.appendChild(tick)
      }
    }
  }

  private animLoop(ts: number) {
    if (!this.playing) return

    const delay = 800 / this.speed
    if (ts - this.lastAnimTs >= delay) {
      this.lastAnimTs = ts

      const total = this.rvFrames.length || 1
      const next = (this.frameIndex + 1) % total
      this.showFrame(next)

      if (next === 0 && this.autoOn) this.loadRadar().catch(() => {})
    }

    this.animRaf = window.requestAnimationFrame((t) => this.animLoop(t))
  }

  private stopAnimation() {
    this.playing = false
    if (this.animRaf) {
      window.cancelAnimationFrame(this.animRaf)
      this.animRaf = null
    }
  }

  private startRadarAutoRefresh() {
    if (this.radarAutoRefreshInterval) window.clearInterval(this.radarAutoRefreshInterval)

    this.radarAutoRefreshInterval = window.setInterval(async () => {
      if (!this.autoOn || this.curLayer === 'sat') return

      try {
        const res = await this.fetchWithTimeout('https://api.rainviewer.com/public/weather-maps.json', undefined, 12000)
        if (!res.ok) return

        const data = (await res.json()) as {
          host: string
          radar?: { past?: Array<{ time: number; path: string }> }
        }

        const newFrames = (data.radar?.past ?? []).slice(-Math.min(50, this.frameCount))
        const lastNew = newFrames[newFrames.length - 1]?.time
        const lastOld = this.rvFrames[this.rvFrames.length - 1]?.time

        if (lastNew && lastNew !== lastOld) {
          const wasPlaying = this.playing
          if (wasPlaying) this.playing = false

          this.rvHost = data.host
          this.rvFrames = newFrames
          this.buildRadarLayers()

          const n = new Date()
          const ts = `${p2(n.getUTCHours())}:${p2(n.getUTCMinutes())}Z`
          document.getElementById('upd')!.textContent = `Updated ${ts}`
          this.msg(`Radar auto-refreshed ${ts} · ${this.rvFrames.length} frames`)

          if (wasPlaying) {
            this.playing = true
            this.lastAnimTs = performance.now()
            this.animRaf = window.requestAnimationFrame((t) => this.animLoop(t))
          }
        }
      } catch {
        // ignore
      }
    }, 120000)
  }

  // ─────────────────────────────────────────────────────────────
  // Warnings + SPC watches/MCD
  // ─────────────────────────────────────────────────────────────

  private async loadWarningsAndSpc() {
    this.spin(true)
    this.msg('Fetching NWS warnings...')

    try {
      await this.loadWarnings()
    } catch (e) {
      this.msg(`Warnings error: ${(e as Error).message}`)
    }

    this.msg('Fetching SPC watches & MCDs...')
    try {
      await this.loadSpcWatchesAndMcds()
    } catch {
      // ignore
    }

    this.spin(false)
  }

  private async loadWarnings() {
    if (!this.map) return

    // Clear NWS layers but keep SPC layers
    Object.entries(this.warningLayers).forEach(([k, l]) => {
      if (!k.startsWith('spc_')) {
        try {
          this.map!.removeLayer(l)
        } catch {
          // ignore
        }
        delete this.warningLayers[k]
      }
    })

    this.alerts = this.alerts.filter((a) => a.src === 'spc')

    const res = await this.fetchWithTimeout(
      'https://api.weather.gov/alerts/active?status=actual&message_type=alert,update',
      { headers: { Accept: 'application/geo+json' } },
      15000,
    )

    if (!res.ok) throw new Error(`NWS API HTTP ${res.status}`)

    const data = (await res.json()) as GeoJSON.FeatureCollection

    let torCount = 0

    ;(data.features ?? []).forEach((f, i) => {
      const props = (f.properties ?? {}) as Record<string, unknown>
      const ev = String(props.event ?? '').trim()
      const wt = classifyNwsEvent(ev)
      if (!f.geometry) return

      const area = String(props.areaDesc ?? '')
      const exp = String(props.expires ?? '')
      const key = `nws_${i}`

      this.alerts.push({ type: wt, event: ev, area, exp, src: 'nws', key, feat: f })
      if (wt === 'TOR') torCount++

      this.addWarningPolygon(f, wt, ev, area, exp, key)
    })

    this.updateAlertList()
    const acnt = document.getElementById('acnt')
    if (acnt) acnt.textContent = this.alerts.length ? `(${this.alerts.length})` : ''

    const ban = document.getElementById('tor-ban')
    const upd = document.getElementById('upd')

    if (torCount > 0) {
      if (ban) {
        ban.textContent = `⚠  ${torCount} TORNADO WARNING${torCount > 1 ? 'S' : ''} ACTIVE — TAKE SHELTER NOW  ⚠`
        ban.style.display = 'block'
        window.setTimeout(() => {
          if (ban) ban.style.display = 'none'
        }, 20000)
      }
      if (upd) {
        upd.innerHTML = `<span style="color:#ff2020;animation:blink 1s steps(1) infinite">⚠ ${torCount} TORNADO WARNING${torCount > 1 ? 'S' : ''}</span>`
      }
    } else {
      if (ban) ban.style.display = 'none'
    }
  }

  private async loadSpcWatchesAndMcds() {
    if (!this.map) return

    Object.entries(this.warningLayers).forEach(([k, l]) => {
      if (k.startsWith('spc_')) {
        try {
          this.map!.removeLayer(l)
        } catch {
          // ignore
        }
        delete this.warningLayers[k]
      }
    })

    this.alerts = this.alerts.filter((a) => a.src !== 'spc')

    // Active watches
    try {
      const res = await this.fetchWithTimeout('https://www.spc.noaa.gov/products/watch/ActiveWW.geojson', undefined, 8000)
      if (res.ok) {
        const d = (await res.json()) as GeoJSON.FeatureCollection
        ;(d.features ?? []).forEach((f, i) => {
          const props = (f.properties ?? {}) as Record<string, unknown>
          const t = String(props.WATCH_TYPE ?? props.type ?? 'TOR').toUpperCase()
          const wt: WarningType = t.includes('TOR') ? 'TWA' : 'SWA'
          const num = String(props.WATCH_NUM ?? props.WNO ?? i)
          const ev = `${wt === 'TWA' ? 'Tornado' : 'Svr T-Storm'} Watch #${num}`
          const key = `spc_w${i}`

          this.alerts.push({ type: wt, event: ev, area: String(props.STATES ?? ''), exp: '', src: 'spc', key })
          this.addWarningPolygon(f, wt, ev, String(props.STATES ?? ''), '', key)
        })
      }
    } catch {
      // ignore
    }

    // MCDs
    try {
      const res = await this.fetchWithTimeout('https://www.spc.noaa.gov/products/md/ActiveMD.geojson', undefined, 8000)
      if (res.ok) {
        const d = (await res.json()) as GeoJSON.FeatureCollection
        ;(d.features ?? []).forEach((f, i) => {
          const props = (f.properties ?? {}) as Record<string, unknown>
          const num = String(props.MDNUM ?? i)
          const txt = String(props.CONCERNING ?? props.text ?? '').substring(0, 60)
          const ev = `SPC MCD #${num}`
          const key = `spc_m${i}`

          this.alerts.push({ type: 'MCD', event: ev, area: txt, exp: '', src: 'spc', key })
          this.addWarningPolygon(f, 'MCD', ev, txt, '', key)
        })
      }
    } catch {
      // ignore
    }

    this.updateAlertList()
  }

  private addWarningPolygon(feature: GeoJSON.Feature, wt: WarningType, ev: string, area: string, exp: string, key: string) {
    if (!this.map) return
    if (!this.warningVisible[wt]) return

    const cfg = WCFG[wt]
    const geom = feature.geometry
    if (!geom) return

    const rings =
      geom.type === 'Polygon'
        ? [geom.coordinates]
        : geom.type === 'MultiPolygon'
          ? geom.coordinates
          : []

    rings.forEach((poly, pi) => {
      const ring = poly[0]
      if (!ring || ring.length < 3) return

      const lls: L.LatLngTuple[] = ring.map((pt) => [pt[1] as number, pt[0] as number])

      const layer = L.polygon(lls, {
        color: cfg.c,
        fillColor: cfg.f,
        fillOpacity: cfg.fa * this.wrnOp,
        weight: cfg.w,
        opacity: Math.min(1, this.wrnOp * 1.3),
        dashArray: cfg.d,
      }).addTo(this.map!)

      const expStr = exp
        ? new Date(exp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
          })
        : '—'

      layer.on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        if (feature.properties) {
          this.showWarnCard(feature)
        } else {
          layer
            .bindPopup(
              `<div style="font-family:Share Tech Mono,monospace;font-size:10px;min-width:180px;">
                <div style="color:${cfg.c};font-size:12px;font-weight:bold;margin-bottom:4px;">${wt === 'TOR' ? '⚠ ' : ''}${ev}</div>
                <div style="color:#6a90b0;font-size:9px;">${area}</div>
                ${exp ? `<div style="color:#3a5870;font-size:9px;margin-top:2px;">Expires: ${expStr}</div>` : ''}
              </div>`,
              { maxWidth: 260 },
            )
            .openPopup()
        }
      })

      layer.on('contextmenu', () => {
        const url = parseVtecToWwaUrl((feature.properties as { parameters?: unknown })?.parameters)
        if (url) window.open(url, '_blank', 'noopener,noreferrer')
      })

      layer.bindTooltip(
        `<span style="font-family:Share Tech Mono,monospace;font-size:9px;color:${cfg.c};">${ev}<br><span style="color:#6a90b0;font-size:8px;">${area
          .split(';')[0]
          .substring(0, 40)}</span></span>`,
        { sticky: true, opacity: 0.95 },
      )

      // centroid label for key warn types
      const clat = lls.reduce((s, p) => s + p[0], 0) / lls.length
      const clon = lls.reduce((s, p) => s + p[1], 0) / lls.length

      this.alertCenters[key] = L.latLng(clat, clon)

      if (wt === 'TOR' || wt === 'TWA' || wt === 'SWA' || wt === 'MCD') {
        const lblText = wt === 'TOR' ? '⚠ TORNADO' : ev
        const icon = L.divIcon({
          className: '',
          html: `<div style="font-family:Share Tech Mono,monospace;font-size:9px;font-weight:bold;
          color:${cfg.c};background:rgba(4,4,4,.88);border:1px solid ${cfg.c};border-radius:3px;
          padding:1px 4px;white-space:nowrap;${wt === 'TOR' ? 'animation:blink 1s steps(1) infinite;' : ''}">${lblText}</div>`,
          iconSize: [0, 0],
          iconAnchor: [40, 9],
        })

        const marker = L.marker([clat, clon], { icon, interactive: false }).addTo(this.map!)
        this.warningLayers[`${key}_lbl_${pi}`] = marker
      }

      this.warningLayers[`${key}_${pi}`] = layer
    })
  }

  private updateAlertList() {
    const el = document.getElementById('alist')
    if (!el) return

    if (!this.alerts.length) {
      el.innerHTML = '<div style="font-family:var(--mono);font-size:10px;color:var(--muted);">No active alerts</div>'
      return
    }

    const ord: Partial<Record<WarningType, number>> = {
      TOR: 0,
      SVR: 1,
      SPS: 2,
      SMW: 3,
      TWA: 4,
      SWA: 5,
      MCD: 6,
      FF: 7,
      FLD: 8,
      WS: 9,
      HEAT: 10,
      FIRE: 11,
      WIND: 12,
      MAR: 13,
      GEN: 14,
    }

    const dc: Record<WarningType, string> = {
      TOR: '#ff2020',
      SVR: '#ff8800',
      SPS: '#ffd166',
      SMW: '#00b4ff',
      TWA: '#ffff00',
      SWA: '#dbdb00',
      MCD: '#cc77ff',
      FF: '#00cc44',
      FLD: '#00e0a0',
      WS: '#ff69b4',
      HEAT: '#ff5e5e',
      FIRE: '#ff7b00',
      WIND: '#8fd3ff',
      MAR: '#4dd0e1',
      GEN: '#b0bec5',
    }

    const sorted = [...this.alerts].sort((a, b) => (ord[a.type] ?? 99) - (ord[b.type] ?? 99))

    const items = sorted.slice(0, 18)

    el.innerHTML = items
      .map((a) => {
        const dot = dc[a.type] ?? '#888'
        return `
          <div class="al" data-key="${a.key}">
            <div class="ad" style="background:${dot}"></div>
            <div class="atx">
              <div class="aev" style="${a.type === 'TOR' ? 'color:#ff6060;' : ''}">${a.type === 'TOR' ? '⚠ ' : ''}${a.event}</div>
              <div class="aar">${(a.area || '').split(';')[0].substring(0, 40)}</div>
            </div>
          </div>
        `
      })
      .join('')

    if (sorted.length > 18) {
      el.innerHTML += `<div style="font-family:var(--mono);font-size:8px;color:var(--muted);padding:2px 0;">+${sorted.length - 18} more</div>`
    }
  }

  private attachAlertListClickHandler() {
    if (this.alertListClickHandlerAttached) return
    const el = document.getElementById('alist')
    if (!el) return

    el.addEventListener('click', (e) => {
      const t = e.target as HTMLElement
      const row = t.closest('.al') as HTMLElement | null
      if (!row) return

      const key = row.dataset.key
      if (!key) return

      this.zoomToAlertByKey(key)
    })

    this.alertListClickHandlerAttached = true
  }

  private zoomToAlertByKey(key: string) {
    if (!this.map) return

    // Prefer centroid
    const center = this.alertCenters[key]
    if (center) {
      this.map.flyTo(center, Math.max(this.map.getZoom(), 8), { duration: 1.0 })
      this.switchToNearestRadar(center.lat, center.lng)
      this.msg('Zoomed to alert')
      return
    }

    // Otherwise try polygon bounds
    const poly = Object.entries(this.warningLayers).find(([k]) => k.startsWith(key + '_'))?.[1] as
      | L.Polygon
      | undefined

    if (poly && 'getBounds' in poly) {
      try {
        const bounds = (poly as L.Polygon).getBounds()
        if (bounds.isValid()) {
          const c = bounds.getCenter()
          this.map.flyToBounds(bounds.pad(0.25), { duration: 1.0, maxZoom: 9 })
          this.switchToNearestRadar(c.lat, c.lng)
          this.msg('Zoomed to alert')
        }
      } catch {
        // ignore
      }
    }
  }

  private switchToNearestRadar(lat: number, lon: number) {
    const nearest = this.nearestNexrad(lat, lon)
    if (nearest && nearest !== this.activeStation) {
      this.setStation(nearest)
      return nearest
    }
    return null
  }

  // ─────────────────────────────────────────────────────────────
  // SPC outlooks
  // ─────────────────────────────────────────────────────────────

  private async loadSpcDay(day: SpcDay) {
    if (!this.map) return

    if (this.spcLayers[day]) {
      try {
        this.map.removeLayer(this.spcLayers[day]!)
      } catch {
        // ignore
      }
      this.spcLayers[day] = null
    }

    const info = SPC_URLS[day]

    try {
      const res = await this.fetchWithTimeout(info.cat, undefined, 12000)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = (await res.json()) as GeoJSON.FeatureCollection
      if (!d.features || d.features.length === 0) throw new Error('No outlook data')

      const layer = L.geoJSON(d, {
        pane: 'outlook',
        style: (feat) => {
          const f = feat as GeoJSON.Feature
          const props = (f.properties || {}) as Record<string, unknown>
          const cfg = getSpcColor(props)
          const opacity = day === 1 ? 0.38 : day === 2 ? 0.28 : 0.2
          const dashArr = day === 1 ? 'none' : day === 2 ? '6,4' : '4,6'
          return {
            fillColor: cfg.fill,
            fillOpacity: opacity,
            color: cfg.stroke,
            weight: day === 1 ? 1.8 : 1.2,
            dashArray: dashArr,
          }
        },
        onEachFeature: (feat, lay) => {
          const f = feat as GeoJSON.Feature
          const cfg = getSpcColor((f.properties || {}) as Record<string, unknown>)
          ;(lay as L.Layer).bindTooltip(`<b>SPC ${info.label}</b> — ${cfg.label}`, { sticky: true, opacity: 0.95 })
          lay.on('click', () => this.highlightOutlook(lay as unknown as L.Path, cfg, info.label, day))
        },
      })

      this.spcLayers[day] = layer

      if (this.spcOn[day]) layer.addTo(this.map)

      this.updateQuickAnalysis()
    } catch (e) {
      // CORS may block in some browsers.
      console.warn('SPC Day load failed', day, e)
    }
  }

  private highlightOutlook(layer: L.Path, cfg: { fill: string; stroke: string; label: string }, dayLabel: string, dayNum: SpcDay) {
    if (!this.map) return

    if (this.spcHighlight) {
      try {
        this.map.removeLayer(this.spcHighlight)
      } catch {
        // ignore
      }
      this.spcHighlight = null
    }

    const geojson = (layer as unknown as L.GeoJSON).toGeoJSON?.()
    if (!geojson) return

    this.spcHighlight = L.geoJSON(geojson as unknown as GeoJSON.GeoJsonObject, {
      pane: 'outlook',
      style: {
        fillColor: 'transparent',
        fillOpacity: 0,
        color: cfg.stroke,
        weight: 4,
        opacity: 1,
        className: 'spc-highlight-pulse',
      },
    }).addTo(this.map)

    window.setTimeout(() => {
      if (!this.map || !this.spcHighlight) return
      try {
        this.map.removeLayer(this.spcHighlight)
      } catch {
        // ignore
      }
      this.spcHighlight = null
    }, 4000)

    this.msg(`SPC ${dayLabel} — ${cfg.label} (highlighted)`)
    void dayNum
  }

  // ─────────────────────────────────────────────────────────────
  // Cities + NEXRAD dots
  // ─────────────────────────────────────────────────────────────

  private rebuildCities() {
    if (!this.map) return

    if (this.cityGroup) {
      try {
        this.map.removeLayer(this.cityGroup)
      } catch {
        // ignore
      }
      this.cityGroup = null
    }

    if (this.lblMode === 0) return

    const z = this.map.getZoom()
    let max = 1
    if (z >= 6 && this.lblMode >= 1) max = 2
    if (z >= 8 && this.lblMode >= 1) max = 3
    if (z >= 10 && this.lblMode >= 1) max = 4

    const grp = L.layerGroup()

    CITIES.forEach((c) => {
      if (c.p > max) return

      const maj = c.p === 1
      const lrg = c.p === 2
      const fs = maj ? 13 : lrg ? 11 : c.p === 3 ? 10 : 9
      const fc = maj ? '#fff' : lrg ? '#cde4f5' : c.p === 3 ? 'rgba(180,210,230,.9)' : 'rgba(155,190,215,.8)'
      const ds = maj ? 10 : lrg ? 8 : c.p === 3 ? 6 : 5

      const icon = L.divIcon({
        className: '',
        html: `<div style="font-family:Barlow Condensed,sans-serif;font-size:${fs}px;font-weight:${maj ? 700 : 500};color:${fc};background:rgba(4,7,14,.85);padding:2px 5px;border-radius:3px;white-space:nowrap;display:flex;align-items:center;gap:4px;cursor:pointer;border:1px solid rgba(0,212,255,.2);">
        <div style="width:${ds}px;height:${ds}px;border-radius:50%;background:${fc};flex-shrink:0;box-shadow:0 0 4px ${fc}88;"></div>${c.n}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 8],
      })

      const m = L.marker([c.lat, c.lon], { icon, zIndexOffset: 500 }).addTo(grp)
      m.on('click', () => {
        this.showCityPanel(c).catch(() => {})
      })
    })

    grp.addTo(this.map)
    this.cityGroup = grp
  }

  private buildNexradDots() {
    if (!this.map) return

    if (this.nexradGroup) {
      try {
        this.map.removeLayer(this.nexradGroup)
      } catch {
        // ignore
      }
      this.nexradGroup = null
    }

    if (!this.nexradDotsOn) return

    const z = this.map.getZoom()
    if (z < 4) return

    const grp = L.layerGroup()

    NEXRAD_STATIONS.forEach((s) => {
      const isActive = s.id === this.activeStation

      const icon = L.divIcon({
        className: '',
        html: `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:translate(-50%,-50%);">
        <div style="width:${isActive ? 22 : 14}px;height:${isActive ? 22 : 14}px;border-radius:50%;
          background:${isActive ? '#00ff88' : 'rgba(0,212,255,0.15)'};
          border:${isActive ? '3px solid #00ff88' : '2px solid #00d4ff'};
          box-shadow:0 0 ${isActive ? '14px #00ff8888' : '8px #00d4ff44'};
          display:flex;align-items:center;justify-content:center;
          font-family:Share Tech Mono,monospace;font-size:${isActive ? 8 : 7}px;
          color:${isActive ? '#000' : '#00d4ff'};font-weight:bold;transition:all .2s;">
          ${isActive ? '📡' : ''}
        </div>
        ${z >= 6 ? `<div style="font-family:Share Tech Mono,monospace;font-size:${isActive ? 10 : 8}px;color:${isActive ? '#00ff88' : '#00d4ffaa'};white-space:nowrap;margin-top:2px;font-weight:${isActive ? 'bold' : 'normal'};text-shadow:0 0 6px ${isActive ? '#00ff88' : '#00d4ff'};">${s.id}</div>` : ''}
      </div>`,
        iconSize: [0, 0],
      })

      const m = L.marker([s.lat, s.lon], { icon, zIndexOffset: 600 }).addTo(grp)

      m.on('click', () => {
        this.setStation(s.id)
        this.flyTo(s.lat, s.lon, Math.max(this.map!.getZoom(), 8), `${s.id} Radar`)
        this.buildNexradDots()
      })

      m.bindTooltip(
        `<b style="color:#00d4ff;">${s.id}</b><br><span style="font-size:8px;color:#86aaca;">${s.name}</span>`,
        { sticky: false, opacity: 0.95 },
      )
    })

    grp.addTo(this.map)
    this.nexradGroup = grp
  }

  private nearestNexrad(lat: number, lon: number) {
    let best: string | null = null
    let bestD = Infinity

    NEXRAD_STATIONS.forEach((s) => {
      const d = Math.hypot(s.lat - lat, s.lon - lon)
      if (d < bestD) {
        bestD = d
        best = s.id
      }
    })

    return best
  }

  private enterStationView(stnId: string) {
    this.isolationMode = true

    if (this.nexradGroup) {
      try {
        this.map?.removeLayer(this.nexradGroup)
      } catch {
        // ignore
      }
      this.nexradGroup = null
    }

    ;([1, 2, 3] as const).forEach((d) => {
      const layer = this.spcLayers[d]
      if (layer && this.map && this.map.hasLayer(layer)) {
        layer.setStyle({ fillOpacity: 0.12, opacity: 0.4 })
      }
    })

    const ban = document.getElementById('station-banner')
    const txt = document.getElementById('station-banner-txt')

    ban?.classList.add('on')
    if (txt) txt.textContent = `🎯 Single Site View: ${stnId}`
  }

  // ─────────────────────────────────────────────────────────────
  // Forecast
  // ─────────────────────────────────────────────────────────────

  private async showCityPanel(city: { n: string; lat: number; lon: number; p: 1 | 2 | 3 | 4 }) {
    if (!this.map) return

    const nearest = this.nearestNexrad(city.lat, city.lon)
    if (nearest && nearest !== this.activeStation) {
      this.setStation(nearest)
      this.msg(`Radar → ${nearest} (nearest to ${city.n})`)
    }

    this.map.flyTo([city.lat, city.lon], Math.max(this.map.getZoom(), 9), { duration: 1.0 })
    this.dropPin(city.lat, city.lon, city.n)

    document.getElementById('rll')!.textContent = city.n
    document.getElementById('rmode')!.textContent = 'Loading forecast...'

    try {
      const ptRes = await this.fetchWithTimeout(
        `https://api.weather.gov/points/${city.lat.toFixed(4)},${city.lon.toFixed(4)}`,
        { headers: { Accept: 'application/geo+json' } },
        8000,
      )

      if (!ptRes.ok) throw new Error('Point lookup failed')

      const ptData = (await ptRes.json()) as {
        properties: {
          forecast: string
          cwa?: string
        }
      }

      const office = ptData.properties.cwa || ''
      const fcUrl = ptData.properties.forecast

      const fcRes = await this.fetchWithTimeout(fcUrl, undefined, 8000)
      if (!fcRes.ok) throw new Error('Forecast fetch failed')

      const fcData = (await fcRes.json()) as { properties: { periods: Array<Record<string, unknown>> } }
      const periods = (fcData.properties.periods || []).slice(0, 6)

      const fcHtml = periods
        .map((p) => {
          const name = String(p.name ?? '')
          const shortForecast = String(p.shortForecast ?? '').substring(0, 30)
          const temperature = String(p.temperature ?? '')
          const temperatureUnit = String(p.temperatureUnit ?? '')
          const windSpeed = String(p.windSpeed ?? '')
          const windDirection = String(p.windDirection ?? '')
          const isDaytime = Boolean(p.isDaytime)

          return `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:4px 0;border-bottom:1px solid var(--brd);">
            <div>
              <div style="font-family:var(--cond);font-size:11px;font-weight:700;color:#e8f4ff;">${name}</div>
              <div style="font-family:var(--mono);font-size:8px;color:var(--muted);line-height:1.4;">${shortForecast}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;margin-left:6px;">
              <div style="font-family:var(--mono);font-size:14px;font-weight:bold;color:${isDaytime ? '#ffcc44' : '#aaccff'};">${temperature}°${temperatureUnit}</div>
              <div style="font-family:var(--mono);font-size:8px;color:var(--muted);">${windSpeed} ${windDirection}</div>
            </div>
          </div>
        `
        })
        .join('')

      document.getElementById('rmode')!.textContent = `${city.n} Forecast`
      document.getElementById('city-fc')!.innerHTML = `
        <div style="font-family:var(--cond);font-size:10px;font-weight:700;letter-spacing:1px;color:var(--acc);margin-bottom:5px;">NWS ${office} OFFICE</div>
        ${fcHtml}
        <div style="font-family:var(--mono);font-size:8px;color:var(--muted);margin-top:4px;"><a href="https://forecast.weather.gov/MapClick.php?CityName=${encodeURIComponent(city.n)}&state=&site=${office}&textField1=${city.lat}&textField2=${city.lon}" target="_blank" style="color:var(--acc);">Full NWS Forecast ↗</a></div>
      `
    } catch (e) {
      document.getElementById('rmode')!.textContent = 'Forecast unavailable'
      document.getElementById('city-fc')!.innerHTML = `<div style="font-family:var(--mono);font-size:9px;color:var(--muted);">Could not load NWS forecast.<br>${(e as Error).message}</div>`
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Model overlays
  // ─────────────────────────────────────────────────────────────

  private toggleHRRR() {
    if (!this.map) return

    this.hrrrOn = !this.hrrrOn

    if (this.hrrrOn) {
      if (!this.hrrrLayer) {
        this.hrrrLayer = L.tileLayer(
          'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/hrrr::REFD/{z}/{x}/{y}.png',
          {
            opacity: 0.7,
            zIndex: 210,
            maxZoom: 12,
            maxNativeZoom: 10,
            tileSize: 256,
            crossOrigin: true,
            keepBuffer: 2,
            errorTileUrl:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          },
        )
      }
      this.hrrrLayer.addTo(this.map)
      this.msg('HRRR REFD overlay on')
    } else {
      if (this.hrrrLayer && this.map.hasLayer(this.hrrrLayer)) this.map.removeLayer(this.hrrrLayer)
      this.msg('HRRR REFD overlay off')
    }

    this.updateQuickAnalysis()
  }

  private toggleRRFS() {
    if (!this.map) return

    this.rrfsOn = !this.rrfsOn

    if (this.rrfsOn) {
      if (!this.rrfsLayer) {
        this.rrfsLayer = L.tileLayer('https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/rrfs_refc/{z}/{x}/{y}.png', {
          opacity: 0.72,
          zIndex: 215,
          maxZoom: 12,
          maxNativeZoom: 10,
          tileSize: 256,
          crossOrigin: true,
          keepBuffer: 2,
          errorTileUrl:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        })
      }
      this.rrfsLayer.addTo(this.map)
      this.msg('RRFS-A REFC overlay on')
    } else {
      if (this.rrfsLayer && this.map.hasLayer(this.rrfsLayer)) this.map.removeLayer(this.rrfsLayer)
      this.msg('RRFS-A REFC overlay off')
    }

    this.updateQuickAnalysis()
  }

  // ─────────────────────────────────────────────────────────────
  // Warning card
  // ─────────────────────────────────────────────────────────────

  private showWarnCard(feat: GeoJSON.Feature) {
    const p = (feat.properties || {}) as Record<string, unknown>

    const ev = String(p.event ?? p.headline ?? 'Warning').trim()
    const wt = classifyNwsEvent(ev)
    const cfg = WCFG[wt] || { c: '#888888', f: '#888888', fa: 0.08, w: 2, d: '', z: 250, lbl: ev }

    const exp = p.expires
      ? new Date(String(p.expires)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
      : '—'

    const upd = p.sent
      ? new Date(String(p.sent)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
      : '—'

    const area = String(p.areaDesc ?? '')
    const headline = String(p.headline ?? ev)
    const desc = String(p.description ?? '').replace(/\n{3,}/g, '\n\n')
    const instr = String(p.instruction ?? '')

    const hazMatch = desc.match(/HAZARD\.{3}(.*?)(?=\n\n|SOURCE|$)/is)
    const srcMatch = desc.match(/SOURCE\.{3}(.*?)(?=\n\n|IMPACT|$)/is)
    const impMatch = desc.match(/IMPACT\.{3}(.*?)(?=\n\n|$)/is)

    const card = document.getElementById('warn-card')
    const title = document.getElementById('warn-card-title')
    const body = document.getElementById('warn-card-body')

    if (!card || !title || !body) return

    title.textContent = `${wt === 'TOR' ? '⚠ ' : ''}${ev}`
    ;(title as HTMLElement).style.color = cfg.c
    ;(card as HTMLElement).style.borderTop = `3px solid ${cfg.c}`

    body.innerHTML = `
      <div class="wc-row">
        <span class="wc-chip" style="color:${cfg.c};border-color:${cfg.c};background:${cfg.c}18;">Updated ${upd}</span>
        <span class="wc-chip" style="color:#f6e04a;border-color:#9a8c10;background:#6a600010;">Expires ${exp}</span>
      </div>
      ${p.senderName ? `<div style="color:#7fb3d0;font-size:9px;font-weight:bold;margin-bottom:4px;">📡 ${String(p.senderName)}</div>` : ''}
      <div style="color:#cce4f5;font-size:9px;margin-bottom:6px;">${headline}</div>
      <div style="color:#8aaccc;font-size:8.5px;margin-bottom:6px;">📍 ${area}</div>
      ${hazMatch ? `<div style="margin-bottom:4px;"><span class="wc-bold">HAZARD</span> <span style="color:#ffd080;">${hazMatch[1].trim()}</span></div>` : ''}
      ${srcMatch ? `<div style="margin-bottom:4px;"><span class="wc-bold">SOURCE</span> ${srcMatch[1].trim()}</div>` : ''}
      ${impMatch ? `<div style="margin-bottom:4px;"><span class="wc-bold">IMPACT</span> ${impMatch[1].trim()}</div>` : ''}
      ${desc ? `<div class="wc-text">${desc.substring(0, 800)}${desc.length > 800 ? '…' : ''}</div>` : ''}
      ${instr ? `<div style="margin-top:6px;padding:5px 8px;background:rgba(255,60,60,.08);border:1px solid rgba(255,60,60,.25);border-radius:4px;font-size:9px;color:#ffaaaa;">${instr}</div>` : ''}
    `

    card.classList.add('open')
  }

  // ─────────────────────────────────────────────────────────────
  // Legend
  // ─────────────────────────────────────────────────────────────

  private buildLegend() {
    const m = LAYERS[this.curLayer]
    const canvas = document.getElementById('lgc') as HTMLCanvasElement | null
    if (!canvas) return

    canvas.width = canvas.offsetWidth || 185

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const n = m.cols.length
    const bw = canvas.width / n
    m.cols.forEach((c, i) => {
      ctx.fillStyle = c
      ctx.fillRect(Math.floor(i * bw), 0, Math.ceil(bw), 12)
    })

    const tk = document.getElementById('ltks')
    if (tk) {
      tk.innerHTML = ''
      const vals = [m.stops[0], m.stops[Math.floor(m.stops.length / 2)], m.stops[m.stops.length - 1]]
      vals.forEach((v) => {
        const el = document.createElement('span')
        el.className = 'ltk'
        el.textContent = String(v)
        tk.appendChild(el)
      })
    }

    const unit = document.getElementById('lunit')
    if (unit) unit.textContent = `${m.unit} — ${m.label}`
  }

  // ─────────────────────────────────────────────────────────────
  // Status helpers
  // ─────────────────────────────────────────────────────────────

  private msg(s: string) {
    const sb = document.getElementById('sb')
    if (sb) sb.style.opacity = '1'
    const smsg = document.getElementById('smsg')
    if (smsg) smsg.textContent = s
  }

  private spin(on: boolean) {
    ;['hsp', 'sp2'].forEach((id) => {
      const el = document.getElementById(id)
      if (el) (el as HTMLElement).style.display = on ? 'block' : 'none'
    })
  }

  private startUtcClock() {
    this.utcInterval = window.setInterval(() => {
      const n = new Date()
      const utc = document.getElementById('utc')
      if (utc) utc.textContent = `${p2(n.getUTCHours())}:${p2(n.getUTCMinutes())}:${p2(n.getUTCSeconds())}Z`
    }, 1000)
  }

  private updateQuickAnalysis() {
    const stn = this.activeStation || 'CONUS'
    const prod = this.curLayer === 'ref' ? 'N0Q REF' : this.curLayer === 'sat' ? 'SAT IR' : 'VEL'

    const d1 = this.spcOn[1] ? (this.spcLayers[1] ? 'D1 ✓' : 'D1…') : ''
    const d2 = this.spcOn[2] ? (this.spcLayers[2] ? 'D2 ✓' : 'D2…') : ''
    const d3 = this.spcOn[3] ? (this.spcLayers[3] ? 'D3 ✓' : 'D3…') : ''

    const ovl = [d1, d2, d3].filter(Boolean).join(' ') || 'Off'
    const mdl = [this.hrrrOn ? 'HRRR' : '', this.rrfsOn ? 'RRFS' : ''].filter(Boolean).join('+') || 'Off'

    const anyOvl = this.spcOn[1] || this.spcOn[2] || this.spcOn[3]
    const anyMdl = this.hrrrOn || this.rrfsOn

    const setSafe = (id: string, val: string, color?: string) => {
      const el = document.getElementById(id)
      if (!el) return
      el.textContent = val
      if (color) (el as HTMLElement).style.color = color
    }

    setSafe('qa-stn', stn)
    setSafe('qa-prod', prod)
    setSafe('qa-ovl', ovl, anyOvl ? '#f6f67a' : '#3a5870')
    setSafe('qa-mdl', mdl, anyMdl ? '#00d4ff' : '#3a5870')

    const stnChip = document.getElementById('wx-stn')
    if (stnChip) stnChip.textContent = stn

    const prodChip = document.getElementById('wx-prod')
    if (prodChip) prodChip.textContent = this.curLayer === 'ref' ? 'N0Q' : this.curLayer.toUpperCase()

    const tlStn = document.getElementById('tl-stn')
    if (tlStn) tlStn.textContent = stn
  }

  private syncModeTabs(opts: { radarOn?: boolean; homeOn?: boolean; satDisabled?: boolean }) {
    const radar = document.getElementById('mtab-radar')
    const sat = document.getElementById('mtab-sat')

    if (opts.radarOn && radar) {
      radar.classList.add('on')
      radar.classList.remove('dim')
    }

    if (opts.homeOn && radar) {
      radar.classList.remove('on')
      radar.classList.add('dim')
    }

    if (opts.satDisabled && sat) {
      sat.classList.remove('on')
      sat.classList.add('dim')
    }
  }

  private addMiniToolOn(t: 'R' | 'S' | 'M' | 'W') {
    // in JSX we don't have access to currentTarget; keep best-effort.
    const nodes = Array.from(document.querySelectorAll('#minitools .mtbtn')) as HTMLElement[]
    const idx = t === 'R' ? 0 : t === 'S' ? 1 : t === 'M' ? 2 : 3
    nodes[idx]?.classList.add('on')
  }

  // ─────────────────────────────────────────────────────────────
  // Pin helpers
  // ─────────────────────────────────────────────────────────────

  private dropPin(lat: number, lon: number, lbl: string) {
    if (!this.map) return

    if (this.pinMarker) {
      try {
        this.map.removeLayer(this.pinMarker)
      } catch {
        // ignore
      }
    }

    const icon = L.divIcon({
      className: '',
      html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
      <div style="background:rgba(4,7,14,.92);border:1px solid #00d4ff;border-radius:3px;padding:2px 6px;font-family:Share Tech Mono,monospace;font-size:9px;color:#00d4ff;white-space:nowrap;margin-bottom:2px;">${lbl}</div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:9px solid #00d4ff;"></div></div>`,
      iconSize: [0, 0],
    })

    this.pinMarker = L.marker([lat, lon], { icon, zIndexOffset: 1000 }).addTo(this.map)
  }

  private flyTo(lat: number, lon: number, z: number, lbl: string) {
    if (!this.map) return
    this.map.flyTo([lat, lon], z, { duration: 1.2 })
    window.setTimeout(() => this.dropPin(lat, lon, lbl), 400)
  }

  // ─────────────────────────────────────────────────────────────
  // Suggestions
  // ─────────────────────────────────────────────────────────────

  private showSuggestions(items: City[]) {
    const s = document.getElementById('sg')
    if (!s) return

    s.innerHTML = ''

    items.forEach((c) => {
      const el = document.createElement('div')
      el.className = 'si'
      el.textContent = c.n

      el.addEventListener('click', () => {
        this.flyTo(c.lat, c.lon, 9, c.n)
        const input = document.getElementById('li') as HTMLInputElement | null
        if (input) input.value = c.n
        this.hideSuggestions()
      })

      s.appendChild(el)
    })

    ;(s as HTMLElement).style.display = 'block'
  }

  private hideSuggestions() {
    const s = document.getElementById('sg') as HTMLElement | null
    if (s) s.style.display = 'none'
  }

  private attachGlobalHandlers() {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!t.closest('#sbar')) this.hideSuggestions()
    }

    document.addEventListener('click', onDocClick)

    this.cleanupSearchOutsideClick = () => {
      document.removeEventListener('click', onDocClick)
    }
  }

  private initWeatherBellPanel() {
    const frame = document.getElementById('wb-frame') as HTMLIFrameElement | null
    const fallback = document.getElementById('wb-fallback') as HTMLElement | null

    if (!frame || !fallback) return

    const showFallback = () => {
      fallback.style.display = 'flex'
      frame.style.display = 'none'
    }

    const hideFallback = () => {
      fallback.style.display = 'none'
      frame.style.display = 'block'
    }

    hideFallback()

    const timer = window.setTimeout(showFallback, 5000)

    frame.addEventListener('load', () => {
      window.clearTimeout(timer)
      hideFallback()
    })

    frame.addEventListener('error', () => {
      window.clearTimeout(timer)
      showFallback()
    })
  }

  // ─────────────────────────────────────────────────────────────
  // Fetch helper
  // ─────────────────────────────────────────────────────────────

  private async fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 10000) {
    const controller = new AbortController()
    const id = window.setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(url, { ...init, signal: controller.signal })
      return res
    } finally {
      window.clearTimeout(id)
    }
  }
}
