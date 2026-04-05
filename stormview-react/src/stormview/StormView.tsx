import { useEffect, useRef } from 'react'
import { StormViewController } from './controller'
import { StormViewBottomBar } from './components/StormViewBottomBar'
import { StormViewHeader } from './components/StormViewHeader'
import { StormViewLeftPanel } from './components/StormViewLeftPanel'
import { StormViewMapWrap } from './components/StormViewMapWrap'
import { StormViewRightPanel } from './components/StormViewRightPanel'
import './stormview.css'

export function StormView() {
  const controllerRef = useRef<StormViewController | null>(null)

  useEffect(() => {
    const controller = new StormViewController()
    controllerRef.current = controller
    controller.init()

    return () => {
      controllerRef.current = null
      controller.destroy()
    }
  }, [])

  const ctrl = () => controllerRef.current

  return (
    <>
      <StormViewHeader />

      <div id="wrap">
        <StormViewLeftPanel ctrl={ctrl} />
        <StormViewMapWrap ctrl={ctrl} />
        <StormViewRightPanel ctrl={ctrl} />
      </div>

      <StormViewBottomBar />
    </>
  )
}
