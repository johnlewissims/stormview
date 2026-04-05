import type { StormViewController } from '../controller'

type Props = {
  ctrl: () => StormViewController | null
}

export function StormViewRightPanel({ ctrl }: Props) {
  return (
    <div id="right">
      <div className="sec">
        <div className="st">Location / Forecast</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--acc)', marginTop: 2 }} id="rll">
          Click city or map
        </div>
        <div style={{ fontFamily: 'var(--cond)', fontSize: 11, color: 'var(--muted)', marginTop: 3 }} id="rmode">
          Click a city label for NWS forecast
        </div>
        <div
          id="city-fc"
          style={{
            marginTop: 6,
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--muted)',
          }}
        >
          Click any city or NEXRAD dot on the map.
        </div>
      </div>

      <div className="sec">
        <div className="st">Refresh</div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button
            type="button"
            className="cb on"
            id="auto-btn"
            onClick={() => ctrl()?.toggleAutoRefresh()}
            style={{ fontSize: 11 }}
          >
            AUTO
          </button>
          <button type="button" className="cb" onClick={() => ctrl()?.fetchAll()} style={{ fontSize: 11 }}>
            ↺ Now
          </button>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', marginTop: 5 }}>
          Auto refresh every 2 min · replay supports 5 / 7 / 14 / 30 / 50 frames
        </div>
      </div>

      <div className="sec">
        <div className="st">Quick Analysis</div>
        <div
          className="mdgrid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
            gap: 8,
            marginTop: 2,
          }}
        >
          <div
            className="mdcell"
            style={{
              padding: 10,
              borderRadius: 10,
              border: '1px solid rgba(78,111,150,.78)',
              background: 'rgba(17,26,40,.96)',
            }}
          >
            <div
              className="mdlabel"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                color: '#7fa5c3',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Radar Site
            </div>
            <div className="mdval" style={{ fontFamily: 'var(--mono)', fontSize: 14, color: '#e8f6ff', marginTop: 5 }} id="qa-stn">
              CONUS
            </div>
          </div>
          <div
            className="mdcell"
            style={{
              padding: 10,
              borderRadius: 10,
              border: '1px solid rgba(78,111,150,.78)',
              background: 'rgba(17,26,40,.96)',
            }}
          >
            <div
              className="mdlabel"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                color: '#7fa5c3',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Product
            </div>
            <div className="mdval" style={{ fontFamily: 'var(--mono)', fontSize: 14, color: '#e8f6ff', marginTop: 5 }} id="qa-prod">
              N0Q REF
            </div>
          </div>
          <div
            className="mdcell"
            style={{
              padding: 10,
              borderRadius: 10,
              border: '1px solid rgba(78,111,150,.78)',
              background: 'rgba(17,26,40,.96)',
            }}
          >
            <div
              className="mdlabel"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                color: '#7fa5c3',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Outlook
            </div>
            <div className="mdval" style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#3a5870', marginTop: 5 }} id="qa-ovl">
              Off
            </div>
          </div>
          <div
            className="mdcell"
            style={{
              padding: 10,
              borderRadius: 10,
              border: '1px solid rgba(78,111,150,.78)',
              background: 'rgba(17,26,40,.96)',
            }}
          >
            <div
              className="mdlabel"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                color: '#7fa5c3',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Model
            </div>
            <div className="mdval" style={{ fontFamily: 'var(--mono)', fontSize: 14, color: '#3a5870', marginTop: 5 }} id="qa-mdl">
              Off
            </div>
          </div>
        </div>
      </div>

      <div className="sec">
        <div className="st">Data Sources</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, lineHeight: 2.2, color: 'var(--muted)' }}>
          Radar: <span style={{ color: 'var(--txt)' }}>RainViewer + IEM NEXRAD ridge</span>
          <br />
          Warns: <span style={{ color: 'var(--txt)' }}>api.weather.gov</span>
          <br />
          Outlook: <span style={{ color: 'var(--txt)' }}>SPC GeoJSON Day 1/2/3</span>
          <br />
          Model: <span style={{ color: 'var(--txt)' }}>Iowa State HRRR REFD + RRFS-A</span>
        </div>
      </div>
    </div>
  )
}
