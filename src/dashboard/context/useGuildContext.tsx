'use client'
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { basePath } from '@/helpers'

type GuildSummary = { id: string; name: string }

type GuildContextType = {
  guilds: GuildSummary[]
  selectedGuildId: string
  setSelectedGuildId: (id: string) => void
  loading: boolean
}

const GuildContext = createContext<GuildContextType | undefined>(undefined)

export const useGuildContext = () => {
  const context = useContext(GuildContext)
  if (!context) throw new Error('useGuildContext can only be used within GuildProvider')
  return context
}

export const GuildProvider = ({ children }: { children: React.ReactNode }) => {
  const [guilds, setGuilds] = useState<GuildSummary[]>([])
  const [selectedGuildId, setSelectedGuildId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchGuilds() {
      try {
        const res = await fetch(`${basePath}/api/v1/guilds`)
        if (res.ok) {
          const data: GuildSummary[] = await res.json()
          setGuilds(data)
          if (data.length > 0) setSelectedGuildId(data[0].id)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchGuilds()
  }, [])

  const value = useMemo(
    () => ({ guilds, selectedGuildId, setSelectedGuildId, loading }),
    [guilds, selectedGuildId, loading],
  )

  return <GuildContext.Provider value={value}>{children}</GuildContext.Provider>
}
