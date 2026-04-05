export function StormViewHeader() {
  return (
    <div id="hdr">
      <div className="logo">
        <div className="pdot" />StormView
      </div>
      <div className="chip">LIVE</div>
      <div id="hdr-info">
        Radar + NWS layers &nbsp;|&nbsp; <b id="upd">Connecting...</b>
      </div>
      <div className="sp" id="hsp" />
      <div className="zbadge" id="zbadge">
        Zoom 5
      </div>
      <div id="utc">--:--Z</div>
    </div>
  )
}
