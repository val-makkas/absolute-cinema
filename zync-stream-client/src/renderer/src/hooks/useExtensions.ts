import { useState, useEffect } from 'react'

interface Extension {
  url: string
}

export default function useExtensions(extensions: Extension[] | null) {
  const [extensionManifests, setExtensionManifests] = useState<Record<string, unknown>>({})
  const [extensionsOpen, setExtensionsOpen] = useState(false)
  const [newManifestUrl, setNewManifestUrl] = useState('')
  const [showExtensionDetails, setShowExtensionDetails] = useState<string | null>(null)

  // Fetch manifests when extensions change
  useEffect(() => {
    async function fetchManifests(): Promise<void> {
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

  const addExtension = async (updateExtensions: (exts: Extension[]) => Promise<void>) => {
    if (!newManifestUrl) return
    if (!/^https?:\/\//.test(newManifestUrl)) return alert('Please enter a valid URL')

    // Check for duplicates
    if (
      extensions?.some(
        (ext) =>
          ext.url === newManifestUrl || (typeof ext === 'object' && ext.url === newManifestUrl)
      )
    ) {
      return alert('Extension already added')
    }

    try {
      // Fetch the manifest data first
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

      // Validate the manifest has the required fields
      if (!manifestData.name) {
        throw new Error('Invalid manifest: missing name property')
      }

      // Store the manifest data
      setExtensionManifests((prevManifests) => ({
        ...prevManifests,
        [newManifestUrl]: manifestData
      }))

      // Update extensions list
      await updateExtensions([...extensions, { url: newManifestUrl }])

      console.log('Extension added successfully:', manifestData.name)
      setNewManifestUrl('')
    } catch (error) {
      console.error('Failed to add extension:', error)
      alert(`Failed to add extension: ${(error as Error).message}`)
    }
  }

  const removeExtension = async (
    url: string,
    updateExtensions: (exts: Extension[]) => Promise<void>
  ) => {
    try {
      await updateExtensions(extensions.filter((ext) => ext.url !== url))

      // Remove the manifest data for this URL
      setExtensionManifests((prevManifests) => {
        const newManifests = { ...prevManifests }
        delete newManifests[url]
        return newManifests
      })
    } catch (error) {
      console.error('Failed to remove extension:', error)
      alert('Failed to remove extension.')
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
