export interface Extension {
  url: string
  name?: string
  version?: string
  type?: 'movie' | 'metadata' | 'subtitle'
}

export interface ExtensionManifest {
  name: string
  version: string
  description?: string
  logo?: string
  catalogs?: ExtensionCatalog[]
  resources?: string[]
  types?: string[]
}

export interface ExtensionCatalog {
  type: string
  id: string
  name: string
}

export interface ExtensionsState {
  manifests: Record<string, ExtensionManifest | undefined>
  loading: boolean
  error: string | null
}
