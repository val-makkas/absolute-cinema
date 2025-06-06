import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CircleAlert } from 'lucide-react'
import { Source } from '@renderer/types'
import { RoomMovie } from '@renderer/hooks/useRoom'
import { useLocation } from 'react-router-dom'

interface TorrentResponse {
  infoHash: string
}

interface VideoPlayerProps {
  onExit: () => void
}

const API_BASE_URL = 'http://localhost:8888'

export default function StartSoloPage({ onExit }: VideoPlayerProps): React.ReactElement {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [isMpvActive, setIsMpvActive] = useState(false)
  const [loadingStep, setLoadingStep] = useState('Preparing...')
  const location = useLocation()

  const { selectedSource, details } = location.state || {}

  const infoHash = selectedSource.infoHash
  const fileIdx = selectedSource.fileIdx ?? 0

  const magnetUri = `magnet:?xt=urn:btih:${infoHash}`

  const movieTitle = details.title
  const movieYear = details.year

  useEffect(() => {
    if (!selectedSource || !details || !magnetUri || magnetUri.includes('undefined')) {
      if (!selectedSource || !details) {
        setIsLoading(false)
        return
      }
      setError('No valid magnet URI or infoHash provided.')
      setIsLoading(false)
      return
    }
    setStreamUrl(null)
    setError(null)
    setIsLoading(true)
    let infoHashResult: string | null = null

    const addTorrent = async (): Promise<void> => {
      try {
        const response = await fetch(`${API_BASE_URL}/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            magnet: magnetUri,
            fileIdx: fileIdx
          })
        })
        let data: TorrentResponse | null = null
        if (response.ok) {
          data = (await response.json()) as TorrentResponse
        } else {
          const contentType = response.headers.get('content-type') || ''
          if (contentType.includes('application/json')) {
            data = await response.json()
          }
          if (response.status === 504) {
            throw new Error(
              'Could not fetch torrent metadata. This torrent may have no seeds or is not available.'
            )
          }
          throw new Error(`Failed to add torrent: ${response.statusText}`)
        }
        if (data != null) {
          infoHashResult = data.infoHash
        }
        if (!infoHashResult) throw new Error('No infoHash returned from backend')

        const directStreamUrl = `${API_BASE_URL}/stream/${infoHashResult}/${fileIdx}`
        setStreamUrl(directStreamUrl)
        setIsLoading(false)
      } catch (err) {
        setError(`Error adding torrent: ${(err as Error).message}`)
        setIsLoading(false)
      }
    }

    addTorrent()
  }, [magnetUri, fileIdx, details, selectedSource])

  useEffect(() => {
    if (streamUrl && typeof window !== 'undefined' && window.electronAPI) {
      setLoadingStep('Launching media player...')
      window.electronAPI
        .playInMpvSolo(streamUrl, infoHash, fileIdx, details)
        .then((result) => {
          if (result && result.success) {
            setIsMpvActive(true)
          } else {
            setIsMpvActive(false)
          }
        })
        .catch((err) => {
          setError('Failed to launch Media Player: ' + err.message)
          setIsMpvActive(false)
        })
    } else {
      setIsMpvActive(false)
    }
    // eslint-disable-next-line
  }, [streamUrl])

  if (isMpvActive) {
    return <div className="fixed inset-0 bg-black"></div>
  }

  if (!selectedSource) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="relative z-10 flex flex-col items-center justify-center h-full">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center">
              <CircleAlert className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No Source Selected</h3>
            <p className="text-white/60 mb-8 leading-relaxed">
              Please select a movie or episode to start streaming.
            </p>
            <Button
              onClick={onExit}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium px-6 py-3 rounded-xl transition-all duration-300 shadow-lg"
            >
              Return to Browse
            </Button>
          </div>
        </div>
      </div>
    )
  }
  if (!details) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,87,255,0.1),transparent_50%)]"></div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center">
              <CircleAlert className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Details Unavailable</h3>
            <p className="text-white/60 mb-8 leading-relaxed">
              Movie information could not be loaded. Please try again.
            </p>
            <Button
              onClick={onExit}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium px-6 py-3 rounded-xl transition-all duration-300 shadow-lg"
            >
              Return to Browse
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-red-950/50 via-black to-gray-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(239,68,68,0.1),transparent_50%)]"></div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full">
          <div className="max-w-lg mx-auto p-8">
            <div className="bg-black/60 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 shadow-2xl">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-600/20 to-pink-600/20 flex items-center justify-center">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-red-400"
                  >
                    <path
                      d="M12 9V14M12 17H12.01M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <h3 className="text-2xl font-bold text-white mb-4">Streaming Error</h3>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                  <p className="text-red-200 text-sm leading-relaxed">{error}</p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={onExit}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 rounded-xl transition-all duration-300 shadow-lg"
                  >
                    Return to Browse
                  </Button>

                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="w-full border-white/20 text-white/80 hover:bg-white/5 py-3 rounded-xl transition-all duration-300"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,87,255,0.1),transparent_50%)]"></div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-purple-600/30"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-r-blue-500 border-b-purple-500 border-l-blue-500 animate-spin"></div>
              <div className="absolute inset-3 rounded-full border-2 border-transparent border-t-white/50 animate-spin-slow"></div>

              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-white/70"
                >
                  <path d="M10 9L16 12L10 15V9Z" fill="currentColor" />
                </svg>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">{movieTitle}</h2>
              <p className="text-white/50 text-lg">{movieYear}</p>
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 mb-8 border border-white/10">
              <div className="flex items-center space-x-3 mb-4">
                <p className="text-white font-medium">{loadingStep}</p>
              </div>
            </div>

            <Button
              onClick={onExit}
              variant="ghost"
              className="text-white/60 hover:text-white hover:bg-white/10 border border-white/20 px-6 py-3 rounded-xl transition-all duration-300"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="fixed inset-0 bg-black">
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-purple-600/30"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-r-blue-500 border-b-purple-500 border-l-blue-500 animate-spin"></div>
            <div className="absolute inset-3 rounded-full border-2 border-transparent border-t-white/50 animate-spin-slow"></div>

            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/70">
                <path d="M10 9L16 12L10 15V9Z" fill="currentColor" />
              </svg>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">{movieTitle}</h2>
            <p className="text-white/50 text-lg">{movieYear}</p>
          </div>

          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 mb-8 border border-white/10">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse"></div>
              <p className="text-white font-medium">Starting Media Player...</p>
            </div>
            <p className="text-white/60 text-sm">Please wait while we launch the video player...</p>
          </div>

          <Button
            onClick={onExit}
            variant="ghost"
            className="text-white/60 hover:text-white hover:bg-white/10 border border-white/20 px-6 py-3 rounded-xl transition-all duration-300"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
