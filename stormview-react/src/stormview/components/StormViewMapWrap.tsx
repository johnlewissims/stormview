import type { StormViewController } from '../controller'

type Props = {
  ctrl: () => StormViewController | null
}

export function StormViewMapWrap({ ctrl }: Props) {
  return (
    <div id="map-wrap">
      <div id="wxbar">
        <div className="wxg">
          <span className="wxt">Mode</span>
          <span
            className="wxchip on"
            id="wxchip-radar"
            onClick={() => ctrl()?.selectWxChip('radar')}
            style={{ cursor: 'pointer' }}
          >
            RADAR
          </span>
          <span
            className="wxchip"
            id="wxchip-model"
            onClick={() => ctrl()?.selectWxChip('model')}
            style={{ cursor: 'pointer' }}
          >
            MODEL
          </span>
          <span
            className="wxchip"
            id="wxchip-spc"
            onClick={() => ctrl()?.selectWxChip('spc')}
            style={{ cursor: 'pointer' }}
          >
            SPC
          </span>
        </div>
        <div className="wxg">
          <span className="wxt">Radar</span>
          <span className="wxchip on" id="wx-stn">
            CONUS
          </span>
          <span className="wxchip on" id="wx-prod">
            N0Q
          </span>
          <span className="wxchip" id="wx-live">
            Live
          </span>
        </div>
        <div className="wxg">
          <span className="wxt">Overlay</span>
          <span className="wxchip tor">Tornado</span>
          <span className="wxchip warn">Day 1</span>
          <span className="wxchip">HRRR</span>
        </div>
        <div className="wxg">
          <span className="wxt">Region</span>
          <span className="wxchip on" onClick={() => ctrl()?.resetView()} style={{ cursor: 'pointer' }}>
            CONUS
          </span>
          <span className="wxchip" id="wxchip-hd" onClick={() => ctrl()?.toggleHighDetail()} style={{ cursor: 'pointer' }}>
            Zoom HD
          </span>
        </div>
      </div>

      <div className="compact-note">Radar-only dark map · NWS sources</div>

      <div id="minitools">
        <div className="mtbtn on" onClick={() => ctrl()?.miniTool('R')} title="Radar" style={{ cursor: 'pointer' }}>
          R
        </div>
        <div className="mtbtn" onClick={() => ctrl()?.miniTool('S')} title="Satellite" style={{ cursor: 'pointer' }}>
          S
        </div>
        <div className="mtbtn" onClick={() => ctrl()?.miniTool('M')} title="Model" style={{ cursor: 'pointer' }}>
          M
        </div>
        <div className="mtbtn" onClick={() => ctrl()?.miniTool('W')} title="Warnings/Outlook" style={{ cursor: 'pointer' }}>
          ⚠
        </div>
      </div>

      <div id="modeldock" style={{ display: 'none' }} />

      <div id="map" />
      <div id="tor-ban">⚠ TORNADO WARNING ACTIVE — TAKE SHELTER NOW ⚠</div>

      <div id="station-banner">
        <span id="station-banner-txt">📡 CONUS — Composite View</span>
        <button type="button" onClick={() => ctrl()?.exitStationView()}>
          ✕ Exit Station View
        </button>
      </div>

      <div id="warn-card">
        <div id="warn-card-head">
          <span id="warn-card-title" style={{ fontSize: 12, fontWeight: 'bold' }} />
          <button
            type="button"
            onClick={() => ctrl()?.closeWarnCard()}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              fontSize: 14,
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>
        <div id="warn-card-body" />
      </div>

      {/* <div id="modebar">
        <button type="button" className="mtab" onClick={() => ctrl()?.homeTab()}>
          🏠 Home
        </button>
        <button type="button" className="mtab on" id="mtab-radar" onClick={() => ctrl()?.radarTab()}>
          🌀 Radar
        </button>
        <button type="button" className="mtab dim" id="mtab-sat" onClick={() => ctrl()?.satelliteTab()}>
          🛰 Satellite
        </button>
        <button type="button" className="mtab dim" id="mode-outlook" onClick={() => ctrl()?.toggleSPCDay(1)}>
          ⚠ SPC Day 1
        </button>
      </div> */}

      <div id="sbar">
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            id="li"
            placeholder="Search city or lat,lon..."
            autoComplete="off"
            onInput={() => ctrl()?.onSearchInput()}
            onKeyDown={(e) => ctrl()?.onSearchKeyDown(e)}
          />
          <div id="sg" />
        </div>
        <button type="button" id="lbtn" onClick={() => ctrl()?.doSearch()}>
          GO
        </button>
      </div>

      <div id="zc">
        <button type="button" className="zb" onClick={() => ctrl()?.zoomIn()}>
          +
        </button>
        <button type="button" className="zb" onClick={() => ctrl()?.zoomOut()}>
          −
        </button>
        <button
          type="button"
          className="zb"
          onClick={() => ctrl()?.resetView()}
          style={{ fontSize: 8, fontFamily: 'var(--mono)' }}
        >
          FIT
        </button>
      </div>

      <div id="timeline">
        <button
          type="button"
          className="tlchip"
          id="tl-prev"
          onClick={() => ctrl()?.step(-1)}
          title="Previous frame"
          style={{ cursor: 'pointer', fontSize: 13 }}
        >
          ◀
        </button>
        <button
          type="button"
          className="tlchip"
          id="tl-play"
          onClick={() => ctrl()?.togglePlay()}
          title="Play/Stop"
          style={{ cursor: 'pointer', fontSize: 13, minWidth: 36 }}
        >
          ▶
        </button>
        <button
          type="button"
          className="tlchip"
          id="tl-next"
          onClick={() => ctrl()?.step(1)}
          title="Next frame"
          style={{ cursor: 'pointer', fontSize: 13 }}
        >
          ▶▶
        </button>
        <div
          className="tlbar"
          id="tl-bar"
          onClick={(e) => ctrl()?.timelineSeek(e)}
          style={{ cursor: 'pointer', position: 'relative' }}
        >
          <div
            id="tl-head"
            style={{
              position: 'absolute',
              top: -3,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#51b8ff',
              transform: 'translateX(-50%)',
              left: '100%',
              transition: 'left .3s',
            }}
          />
        </div>
        <span className="tlchip on" id="tl-time" style={{ minWidth: 58, textAlign: 'center' }}>
          LIVE
        </span>
        <span className="tlchip" id="tl-stn" style={{ color: '#86aaca' }}>
          CONUS
        </span>
        <select
          id="tl-spd"
          defaultValue="3"
          onChange={(e) => ctrl()?.setSpeed(Number((e.target as HTMLSelectElement).value))}
          style={{
            background: 'rgba(17,26,40,.96)',
            border: '1px solid rgba(78,111,150,.78)',
            borderRadius: 999,
            color: '#d7ebfa',
            fontFamily: 'var(--mono)',
            fontSize: 10,
            padding: '5px 8px',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="1">1×</option>
          <option value="2">2×</option>
          <option value="3">3×</option>
          <option value="4">4×</option>
          <option value="5">5×</option>
          <option value="6">6×</option>
          <option value="7">7×</option>
          <option value="8">8×</option>
        </select>
      </div>

      <div id="sb">
        <div className="sp" id="sp2" />
        <span id="smsg">Initializing live radar...</span>
      </div>

      <div id="wb-panel">
        <div id="wb-head">
          <span>RRFS-A Composite Reflectivity</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <a
              href="https://maps.weatherbell.com/view/model/rrfs_a?d=scentus&p=refc"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--acc)',
                textDecoration: 'none',
                fontFamily: 'var(--mono)',
                fontSize: 10,
              }}
            >
              Open full
            </a>
            <button type="button" id="wb-close" onClick={() => ctrl()?.toggleWeatherBell(false)}>
              ✕
            </button>
          </div>
        </div>
        <iframe
          id="wb-frame"
          src="https://maps.weatherbell.com/view/model/rrfs_a?d=scentus&p=refc"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="WeatherBell RRFS-A"
        />
        <div id="wb-fallback">
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--txt)' }}>
            WeatherBell panel could not load here
          </div>
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.5,
              color: '#9db7cb',
              maxWidth: 320,
              textAlign: 'center',
            }}
          >
            WeatherBell sometimes blocks iframe embedding or requires an active WeatherBell session in a separate tab.
          </div>
          <a
            id="wb-open"
            href="https://maps.weatherbell.com/view/model/rrfs_a?d=scentus&p=refc"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open WeatherBell
          </a>
        </div>
      </div>
    </div>
  )
}
