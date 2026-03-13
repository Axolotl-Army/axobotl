'use client'
import { useEffect } from 'react'
import Waves from 'node-waves'

const WavesInitializer = () => {
  useEffect(() => {
    Waves.attach('.waves-effect', ['waves-button'])
    Waves.init()
  }, [])

  return null
}

export default WavesInitializer
