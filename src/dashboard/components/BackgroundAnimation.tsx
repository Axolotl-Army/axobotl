'use client'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import HALO from 'vanta/dist/vanta.halo.min'

const BackgroundAnimation = () => {
  const vantaRef = useRef<HTMLDivElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [vantaEffect, setVantaEffect] = useState<any>(null)

  useEffect(() => {
    if (!vantaEffect && vantaRef.current) {
      setVantaEffect(
        HALO({
          el: vantaRef.current,
          THREE: THREE,
          mouseControls: false,
          touchControls: false,
          gyroControls: false,
          color: 0x5865f2,
          backgroundColor: '#2c2f33',
          size: 1.6,
          scale: 0.75,
          xOffset: 0.22,
          scaleMobile: 0.5,
        }),
      )
    }

    return () => {
      if (vantaEffect) vantaEffect.destroy()
    }
  }, [vantaEffect])

  return <div id="net" ref={vantaRef}></div>
}

export default BackgroundAnimation
