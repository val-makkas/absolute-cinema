import { useState, useEffect } from 'react'

interface Extension {
  url: string
}

interface Manifest {
  id: string
  version: string
  name: string
  description: string
  resources: string[]
  types: string[]
  catalogs?: any[]
  behaviorHints?: {
    configurable?: boolean
    configurationRequired?: boolean
  }
}

interface UseExtensionsReturn {
  extensionManifests: Record<string, Manifest>
  extensionsOpen: boolean
  setExtensionsOpen: (open: boolean) => void
  newManifestUrl: string
  setNewManifestUrl: (url: string) => void
  showExtensionDetails: string | null
  setShowExtensionDetails: (url: string | null) => void
  addExtension: (updateExtensions: (exts: Extension[]) => Promise<void>) => Promise<void>
  removeExtension: (
    url: string,
    updateExtensions: (exts: Extension[]) => Promise<void>
  ) => Promise<void>
}

export default function useExtensions(extensions: Extension[] | null): UseExtensionsReturn {
  const [extensionManifests, setExtensionManifests] = useState<Record<string, Manifest>>({})
  const [extensionsOpen, setExtensionsOpen] = useState<boolean>(false)
  const [newManifestUrl, setNewManifestUrl] = useState<string>('')
  const [showExtensionDetails, setShowExtensionDetails] = useState<string | null>(null)

  useEffect(() => {
    async function fetchManifests(): Promise<void> {
      if (!extensions) return

      const manifests: Record<string, Manifest> = {}

      await Promise.all(
        extensions.map(async (ext: Extension) => {
          const url = typeof ext === 'string' ? ext : ext.url
          try {
            const res = await fetch(url, {
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
              }
            })

            if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`)

            const manifest: Manifest = await res.json()

            if (!manifest.name || !manifest.id || !manifest.resources) {
              throw new Error('Invalid manifest structure')
            }

            manifests[url] = manifest
          } catch {
            //
          }
        })
      )

      setExtensionManifests(manifests)
    }

    if (extensions && extensions.length > 0) {
      fetchManifests()
    } else {
      setExtensionManifests({})
    }
  }, [extensions])

  const addExtension = async (
    updateExtensions: (exts: Extension[]) => Promise<void>
  ): Promise<void> => {
    if (!newManifestUrl.trim()) {
      alert('Please enter a manifest URL')
      return
    }

    if (!/^https?:\/\//.test(newManifestUrl)) {
      alert('Please enter a valid URL starting with http:// or https://')
      return
    }

    const isAlreadyAdded = extensions?.some((ext: Extension) => {
      const extUrl = typeof ext === 'string' ? ext : ext.url
      return extUrl === newManifestUrl
    })

    if (isAlreadyAdded) {
      alert('Extension already added')
      return
    }

    try {
      const manifestResponse = await fetch(newManifestUrl, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      })

      if (!manifestResponse.ok) {
        throw new Error(
          `Failed to fetch manifest: ${manifestResponse.status} ${manifestResponse.statusText}`
        )
      }

      const manifestData: Manifest = await manifestResponse.json()

      if (!manifestData.name || !manifestData.id || !manifestData.resources) {
        throw new Error('Invalid manifest: missing required properties (name, id, resources)')
      }

      setExtensionManifests((prevManifests: Record<string, Manifest>) => ({
        ...prevManifests,
        [newManifestUrl]: manifestData
      }))

      const updatedExtensions: Extension[] = [...(extensions || []), { url: newManifestUrl }]
      await updateExtensions(updatedExtensions)

      setNewManifestUrl('')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add extension'
      alert(`Error adding extension: ${errorMessage}`)
    }
  }

  const removeExtension = async (
    url: string,
    updateExtensions: (exts: Extension[]) => Promise<void>
  ): Promise<void> => {
    try {
      if (!extensions) return

      const filteredExtensions = extensions.filter((ext: Extension) => {
        const extUrl = typeof ext === 'string' ? ext : ext.url
        return extUrl !== url
      })

      await updateExtensions(filteredExtensions)

      setExtensionManifests((prevManifests: Record<string, Manifest>) => {
        const newManifests = { ...prevManifests }
        delete newManifests[url]
        return newManifests
      })
    } catch {
      //
    }
  }

  return {
    extensionManifests,
    extensionsOpen,
    setExtensionsOpen,
    newManifestUrl,
    setNewManifestUrl,
    showExtensionDetails,
    setShowExtensionDetails,
    addExtension,
    removeExtension
  }
}

export type { Extension, Manifest, UseExtensionsReturn }
