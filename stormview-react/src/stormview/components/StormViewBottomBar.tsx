export function StormViewBottomBar() {
  return (
    <div id="bot">
      <span>StormView WX</span>
      <span className="bs">|</span>
      <span id="blyr">Reflectivity (dBZ)</span>
      <span className="bs">|</span>
      <span id="bco">--</span>
      <span className="bs">|</span>
      Zoom <span id="bzm">5</span>
      <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>Educational — not for safety decisions</span>
    </div>
  )
}
