import type { StormViewController } from '../controller'

type Props = {
  ctrl: () => StormViewController | null
}

export function StormViewLeftPanel({ ctrl }: Props) {
  return (
    <div id="left">
      <div className="sec">
        <div className="st">Radar / Product</div>
        <button type="button" className="lbtn on" id="btn-ref" onClick={() => ctrl()?.setLayer('ref')}>
          <span className="ic">📡</span>
          <div>
            <div>Reflectivity (dBZ)</div>
            <div className="sub">Storm radar composite</div>
          </div>
        </button>
        <button type="button" className="lbtn dim" id="btn-sat" onClick={() => ctrl()?.setLayer('sat')}>
          <span className="ic">🛰</span>
          <div>
            <div>Satellite</div>
            <div className="sub">Disabled — radar-focused build</div>
          </div>
        </button>
        <button type="button" className="lbtn dim" id="btn-vel" onClick={() => ctrl()?.setLayer('vel')}>
          <span className="ic">⚙️</span>
          <div>
            <div>Velocity</div>
            <div className="sub">Disabled — no live feed</div>
          </div>
        </button>
      </div>

      <div className="sec collapsible" id="sec-radar-station">
        <div className="st" onClick={() => ctrl()?.toggleSection('sec-radar-station')}>
          Radar Station
        </div>
        <button type="button" className="wtgl on" id="ov-nexrad" onClick={() => ctrl()?.toggleNexradDots()}>
          <div className="wd" style={{ background: '#00ff88' }} />
          <span style={{ color: '#88ffcc' }}>NEXRAD Stations</span>
        </button>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 8,
            color: 'var(--muted)',
            marginTop: 5,
          }}
        >
          Click a cyan dot or city to switch radar stations. Replay pauses in station mode.
        </div>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 8,
            color: 'var(--acc)',
            marginTop: 4,
          }}
        >
          Active: <span id="active-stn">CONUS Composite</span>
        </div>
        <button
          type="button"
          className="cb"
          style={{ marginTop: 6, fontSize: 9, width: '100%' }}
          onClick={() => ctrl()?.setStation(null)}
        >
          ↺ CONUS Composite
        </button>
      </div>

      <div className="sec collapsible" id="sec-map-overlays">
        <div className="st" onClick={() => ctrl()?.toggleSection('sec-map-overlays')}>
          Map Overlays
        </div>
        <button type="button" className="wtgl" id="ov-county" onClick={() => ctrl()?.toggleOverlay('county')}>
          <div className="wd" style={{ background: '#9fb4c7' }} />
          <span style={{ color: '#cfe4f9' }}>County Borders</span>
        </button>
        <button type="button" className="wtgl" id="ov-state" onClick={() => ctrl()?.toggleOverlay('state')}>
          <div className="wd" style={{ background: '#ffffff' }} />
          <span style={{ color: '#ffffff' }}>State Borders</span>
        </button>
        <button type="button" className="wtgl" id="ov-cwa" onClick={() => ctrl()?.toggleOverlay('cwa')}>
          <div className="wd" style={{ background: '#00d4ff' }} />
          <span style={{ color: '#6fe6ff' }}>NWS CWA Borders</span>
        </button>
      </div>

      <div className="sec collapsible collapsed" id="sec-spc-outlooks">
        <div className="st" onClick={() => ctrl()?.toggleSection('sec-spc-outlooks')}>
          SPC Outlooks
        </div>
        <button type="button" className="wtgl" id="ov-d1" onClick={() => ctrl()?.toggleSPCDay(1)}>
          <div className="wd" style={{ background: '#f6f67a' }} />
          <span style={{ color: '#ffff88' }}>Day 1 Convective</span>
        </button>
        <button type="button" className="wtgl" id="ov-d2" onClick={() => ctrl()?.toggleSPCDay(2)}>
          <div className="wd" style={{ background: '#e6a033' }} />
          <span style={{ color: '#ffc060' }}>Day 2 Convective</span>
        </button>
        <button type="button" className="wtgl" id="ov-d3" onClick={() => ctrl()?.toggleSPCDay(3)}>
          <div className="wd" style={{ background: '#e63333' }} />
          <span style={{ color: '#ff8888' }}>Day 3 Convective</span>
        </button>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--muted)', marginTop: 4 }}>
          All off by default — click to load &amp; toggle each day.
        </div>
      </div>

      <div className="sec collapsible collapsed" id="sec-warnings-watches">
        <div className="st" onClick={() => ctrl()?.toggleSection('sec-warnings-watches')}>
          ⚠ Warnings &amp; Watches
        </div>
        <button type="button" className="wtgl on" id="wt-TOR" onClick={() => ctrl()?.toggleWarningType('TOR')}>
          <div className="wd" style={{ background: '#ff2020' }} />
          <span style={{ color: '#ff6060' }}>Tornado Warning</span>
        </button>
        <button type="button" className="wtgl on" id="wt-SVR" onClick={() => ctrl()?.toggleWarningType('SVR')}>
          <div className="wd" style={{ background: '#ff8800' }} />
          <span style={{ color: '#ffaa55' }}>Svr T-Storm Warn</span>
        </button>
        <button type="button" className="wtgl on" id="wt-TWA" onClick={() => ctrl()?.toggleWarningType('TWA')}>
          <div className="wd" style={{ background: '#ffff00' }} />
          <span style={{ color: '#ffff55' }}>Tornado Watch</span>
        </button>
        <button type="button" className="wtgl on" id="wt-SWA" onClick={() => ctrl()?.toggleWarningType('SWA')}>
          <div className="wd" style={{ background: '#dbdb00' }} />
          <span style={{ color: '#eeee55' }}>Svr T-Storm Watch</span>
        </button>
        <button type="button" className="wtgl on" id="wt-MCD" onClick={() => ctrl()?.toggleWarningType('MCD')}>
          <div className="wd" style={{ background: '#cc77ff' }} />
          <span style={{ color: '#dd99ff' }}>Meso Discussion</span>
        </button>
        <button type="button" className="wtgl on" id="wt-FF" onClick={() => ctrl()?.toggleWarningType('FF')}>
          <div className="wd" style={{ background: '#00cc44' }} />
          <span style={{ color: '#55ff88' }}>Flash Flood Warn</span>
        </button>
        <button type="button" className="wtgl on" id="wt-FLD" onClick={() => ctrl()?.toggleWarningType('FLD')}>
          <div className="wd" style={{ background: '#00e0a0' }} />
          <span style={{ color: '#9affdd' }}>Flood Alerts</span>
        </button>
        <button type="button" className="wtgl on" id="wt-WS" onClick={() => ctrl()?.toggleWarningType('WS')}>
          <div className="wd" style={{ background: '#ff69b4' }} />
          <span style={{ color: '#ff99cc' }}>Winter Storm</span>
        </button>
        <button type="button" className="wtgl on" id="wt-SPS" onClick={() => ctrl()?.toggleWarningType('SPS')}>
          <div className="wd" style={{ background: '#ffd166' }} />
          <span style={{ color: '#ffe29a' }}>Special Wx Statement</span>
        </button>
        <button type="button" className="wtgl on" id="wt-SMW" onClick={() => ctrl()?.toggleWarningType('SMW')}>
          <div className="wd" style={{ background: '#00b4ff' }} />
          <span style={{ color: '#87ddff' }}>Special Marine Warn</span>
        </button>
        <button type="button" className="wtgl on" id="wt-HEAT" onClick={() => ctrl()?.toggleWarningType('HEAT')}>
          <div className="wd" style={{ background: '#ff5e5e' }} />
          <span style={{ color: '#ffaaaa' }}>Heat Alerts</span>
        </button>
        <button type="button" className="wtgl on" id="wt-FIRE" onClick={() => ctrl()?.toggleWarningType('FIRE')}>
          <div className="wd" style={{ background: '#ff7b00' }} />
          <span style={{ color: '#ffb366' }}>Fire Weather</span>
        </button>
        <button type="button" className="wtgl on" id="wt-WIND" onClick={() => ctrl()?.toggleWarningType('WIND')}>
          <div className="wd" style={{ background: '#8fd3ff' }} />
          <span style={{ color: '#d8f1ff' }}>Wind Alerts</span>
        </button>
        <button type="button" className="wtgl on" id="wt-MAR" onClick={() => ctrl()?.toggleWarningType('MAR')}>
          <div className="wd" style={{ background: '#4dd0e1' }} />
          <span style={{ color: '#b6f4fb' }}>Marine Alerts</span>
        </button>
        <button type="button" className="wtgl on" id="wt-GEN" onClick={() => ctrl()?.toggleWarningType('GEN')}>
          <div className="wd" style={{ background: '#b0bec5' }} />
          <span style={{ color: '#dde6ea' }}>Other NWS Alerts</span>
        </button>
      </div>

      <div className="sec collapsible" id="sec-display">
        <div className="st" onClick={() => ctrl()?.toggleSection('sec-display')}>
          Display
        </div>
        <button type="button" className="wtgl on" id="wt-HD" onClick={() => ctrl()?.toggleHighDetail()}>
          <div className="wd" style={{ background: '#00d4ff' }} />
          <span style={{ color: '#99eeff' }}>Zoom High-Detail Imagery</span>
        </button>
        <div className="row">
          <label>Radar</label>
          <input
            type="range"
            min="20"
            max="100"
            defaultValue="85"
            onInput={(e) => ctrl()?.setOpacity(0, Number((e.target as HTMLInputElement).value))}
          />
          <span className="vl" id="v-rad">
            85%
          </span>
        </div>
        <div className="row">
          <label>Warnings</label>
          <input
            type="range"
            min="10"
            max="100"
            defaultValue="80"
            onInput={(e) => ctrl()?.setOpacity(1, Number((e.target as HTMLInputElement).value))}
          />
          <span className="vl" id="v-wrn">
            80%
          </span>
        </div>
        <div className="row">
          <label>Labels</label>
          <input
            type="range"
            min="0"
            max="3"
            step="1"
            defaultValue="1"
            onInput={(e) => ctrl()?.setLabelMode(Number((e.target as HTMLInputElement).value))}
          />
          <span className="vl" id="v-lbl">
            Med
          </span>
        </div>
      </div>

      <div className="sec">
        <div className="st">Loop Playback</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button type="button" className="cb" id="pbtn" onClick={() => ctrl()?.togglePlay()}>
            ▶ Play
          </button>
          <button type="button" className="cb" onClick={() => ctrl()?.step(-1)}>
            ◀
          </button>
          <button type="button" className="cb" onClick={() => ctrl()?.step(1)}>
            ▶
          </button>
          <button type="button" className="cb" id="fcount-5" onClick={() => ctrl()?.setFrameCount(5)}>
            5
          </button>
          <button type="button" className="cb" id="fcount-7" onClick={() => ctrl()?.setFrameCount(7)}>
            7
          </button>
          <button type="button" className="cb" id="fcount-14" onClick={() => ctrl()?.setFrameCount(14)}>
            14
          </button>
          <button type="button" className="cb" id="fcount-30" onClick={() => ctrl()?.setFrameCount(30)}>
            30
          </button>
          <button type="button" className="cb on" id="fcount-50" onClick={() => ctrl()?.setFrameCount(50)}>
            50
          </button>
        </div>
        <div className="row" style={{ marginTop: 5 }}>
          <label>Speed</label>
          <input type="range" min="1" max="8" defaultValue="3" onInput={(e) => ctrl()?.setSpeed(Number((e.target as HTMLInputElement).value))} />
          <span className="vl" id="v-spd">
            3x
          </span>
        </div>
        <div style={{ marginTop: 4, fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--muted)' }}>
          Frame <span id="frn" style={{ color: 'var(--acc)' }}>LIVE</span> ·{' '}
          <span id="frt" style={{ color: 'var(--muted)' }}>Current</span>
        </div>
      </div>

      <div className="sec">
        <div className="st">Color Scale</div>
        <canvas id="lgc" height={12} />
        <div className="ltks" id="ltks" />
        <div className="lunit" id="lunit">
          Reflectivity (dBZ)
        </div>
      </div>

      <div className="sec collapsible" id="sec-alerts">
        <div className="st" onClick={() => ctrl()?.toggleSection('sec-alerts')}>
          Active Alerts <span id="acnt" style={{ color: 'var(--acc)' }} />
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--muted)', marginBottom: 6 }}>
          Click an alert to zoom to it and switch to the nearest radar station.
        </div>
        <div id="alist">
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
            Loading live data...
          </div>
        </div>
      </div>
    </div>
  )
}
