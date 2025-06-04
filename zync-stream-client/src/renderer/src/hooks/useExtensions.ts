import { useState, useEffect } from 'react'

interface Extension {
  url: string
}

export default function useExtensions(extensions: Extension[] | null): {
  extensionManifests
  extensionsOpen
  setExtensionsOpen
  newManifestUrl
  setNewManifestUrl
  showExtensionDetails
  setShowExtensionDetails
  addExtension
  removeExtension
} {
  const [extensionManifests, setExtensionManifests] = useState<Record<string, unknown>>({})
  const [extensionsOpen, setExtensionsOpen] = useState(false)
  const [newManifestUrl, setNewManifestUrl] = useState('')
  const [showExtensionDetails, setShowExtensionDetails] = useState<string | null>(null)

  useEffect(() => {
    async function fetchManifests(): Promise<void> {
      if (!extensions) return
      const manifests = {}
      await Promise.all(
        extensions.map(async (ext) => {
          const url = typeof ext === 'string' ? ext : ext.url
          try {
            const res = await fetch(url)
            if (!res.ok) throw new Error('Failed to fetch manifest')
            const manifest = await res.json()
            manifests[url] = manifest
          } catch (e) {
            manifests[url] = undefined
            console.log(e)
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
    if (!newManifestUrl) return
    if (!/^https?:\/\//.test(newManifestUrl)) return alert('Please enter a valid URL')

    if (
      extensions?.some(
        (ext) =>
          ext.url === newManifestUrl || (typeof ext === 'object' && ext.url === newManifestUrl)
      )
    ) {
      return alert('Extension already added')
    }

    try {
      const manifestResponse = await fetch(newManifestUrl, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      })

      if (!manifestResponse.ok) {
        throw new Error('Failed to fetch manifest data')
      }

      const manifestData = await manifestResponse.json()

      if (!manifestData.name) {
        throw new Error('Invalid manifest: missing name property')
      }

      setExtensionManifests((prevManifests) => ({
        ...prevManifests,
        [newManifestUrl]: manifestData
      }))

      await updateExtensions([...(extensions || []), { url: newManifestUrl }])

      setNewManifestUrl('')
    } catch {
      //
    }
  }

  const removeExtension = async (
    url: string,
    updateExtensions: (exts: Extension[]) => Promise<void>
  ): Promise<void> => {
    try {
      if (!extensions) return

      const filteredExtensions = extensions.filter((ext) => {
        const extUrl = typeof ext === 'string' ? ext : ext.url
        return extUrl !== url
      })

      await updateExtensions(filteredExtensions)

      setExtensionManifests((prevManifests) => {
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
