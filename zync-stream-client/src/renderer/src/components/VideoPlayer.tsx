import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Source, entry } from '@renderer/types'

interface ElectronAPI {
  playInMpv: (
    streamUrl: string,
    infoHash: string | undefined,
    fileIdx: number
  ) => Promise<{ success: boolean }>
}

// Extend Window interface
declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

interface TorrentResponse {
  infoHash: string
}

interface VideoPlayerProps {
  source: Source | null
  details: entry | null
}

const API_BASE_URL = 'http://localhost:8888'

export default function VideoPlayer({ source, details }: VideoPlayerProps): React.ReactElement {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [isMpvActive, setIsMpvActive] = useState(false)

  const infoHash = source!.infoHash
  const fileIdx = source!.fileIdx

  const magnetUri = `magnet:?xt=urn:btih:${infoHash}`

  const movieTitle = details!.name
  const movieYear = 'year' in details! ? details!.year : details!.releaseInfo

  useEffect(() => {
    if (!magnetUri || magnetUri.includes('undefined')) {
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
  }, [magnetUri, fileIdx])

  useEffect(() => {
    if (streamUrl && typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI
        .playInMpv(streamUrl, infoHash, fileIdx)
        .then((result) => {
          if (result && result.success) {
            setIsMpvActive(true)
          } else {
            setIsMpvActive(false)
          }
        })
        .catch((err) => {
          setError('Failed to launch MPV: ' + err.message)
          setIsMpvActive(false)
        })
    } else {
      setIsMpvActive(false)
    }
    // eslint-disable-next-line
  }, [streamUrl])

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/95 backdrop-blur-lg">
        <div className="w-full max-w-md mx-auto p-8 bg-black/80 border border-white/5 rounded-xl shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 rounded-xl p-[2px] [mask:linear-gradient(#fff_0px,#fff_100%)_content-box,linear-gradient(#fff_0px,#fff_100%)]">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-600 via-purple-600 to-red-600 animate-gradient-worm"></div>
          </div>

          <div className="relative p-6 flex flex-col items-center">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-red-500 mb-4"
            >
              <path
                d="M12 9V14M12 19C7.58172 19 4 15.4183 4 11C4 6.58172 7.58172 3 12 3C16.4183 3 20 6.58172 20 11C20 15.4183 16.4183 19 12 19ZM12 17H12.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <h3 className="text-lg font-bold bg-gradient-to-r from-white via-white/95 to-white/90 bg-clip-text text-transparent mb-2">
              Error Occurred
            </h3>

            <p className="mb-6 text-center text-white">{error}</p>

            <Button
              onClick={() => navigate('/')}
              className="font-medium px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:opacity-90 transition-all duration-200 border-0"
            >
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl">
        <div className="flex flex-col items-center justify-center max-w-md text-center px-8 py-10">
          <div className="relative w-20 h-20 mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-t-purple-600 border-r-transparent border-b-blue-600 border-l-transparent animate-spin"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-r-blue-600 border-b-transparent border-l-purple-600 animate-spin-slow"></div>
          </div>

          <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-white/95 to-white/90 bg-clip-text text-transparent mb-1">
            {movieTitle}
          </h2>

          <div className="text-base text-white/50 mb-6">{movieYear}</div>

          <div className="text-white/70 mb-8 max-w-xs">
            <div className="relative">
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-gradient-to-r from-purple-600 to-blue-600 animate-progress-indeterminate rounded-full"></div>
              </div>
              <p>Preparing your stream...</p>
            </div>
          </div>

          <Button
            onClick={() => navigate('/')}
            className="font-medium px-5 py-2.5 rounded-xl bg-black/60 text-white/80 border border-white/10 hover:bg-white/5 hover:text-white transition-all duration-200"
          >
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl">
      <div className="flex flex-col items-center justify-center max-w-md text-center px-8 py-10">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center mb-6">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-white/70"
          >
            <path
              d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10 9L16 12L10 15V9Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-white/95 to-white/90 bg-clip-text text-transparent mb-1">
          {movieTitle}
        </h2>

        <div className="text-base text-white/50 mb-6">{movieYear}</div>

        <div className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-white/10 text-white/80 text-sm mb-8">
          {isMpvActive ? 'Streaming in MPV player...' : 'Starting MPV player...'}
        </div>

        <Button
          onClick={() => navigate('/')}
          className="font-medium px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:opacity-90 transition-all duration-200 border-0"
        >
          Return to Home
        </Button>
      </div>
    </div>
  )
}
