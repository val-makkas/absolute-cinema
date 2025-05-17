import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Extension } from '@/types'

// Update the ExtensionsModalProps interface
interface ExtensionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  extensions: Extension[] // This might need to be any[] or (string | {url: string})[]
  extensionManifests: Record<string, any> // Should be an object mapping URLs to manifest data
  newManifestUrl: string
  setNewManifestUrl: (url: string) => void
  onAdd: () => Promise<void>
  onRemove: (url: string) => Promise<void>
  showExtensionDetails: string | null
  setShowExtensionDetails: (url: string | null) => void
}

export default function ExtensionsModal({
  open,
  onOpenChange,
  extensions,
  extensionManifests,
  newManifestUrl,
  setNewManifestUrl,
  onAdd,
  onRemove,
  showExtensionDetails,
  setShowExtensionDetails
}: ExtensionsModalProps): React.ReactElement {
  console.log('Received extensions:', extensions)
  console.log('Extension manifests:', extensionManifests)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {' '}
      <DialogContent className="bg-black/80 backdrop-blur-xl p-0 border-6 border-white/5 shadow-2xl max-w-xl animate-in fade-in-50 slide-in-from-bottom-10 duration-300">
        <div
          className="relative w-full max-h-[90vh] overflow-hidden flex flex-col"
          style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
        >
          {' '}
          {/* Subtle gradient border */}
          <div className="absolute inset-0 rounded-xl p-[1px] [mask:linear-gradient(#fff_0px,#fff_100%)_content-box,linear-gradient(#fff_0px,#fff_100%)]">
            <div className="absolute inset-0 rounded-x1"></div>
          </div>
          <div className="relative w-full max-h-[90vh] flex flex-col bg-black/80 backdrop-blur-xl rounded-xl overflow-hidden">
            <DialogHeader className="px-8 pt-6 pb-4">
              {' '}
              <div className="flex items-center gap-3">
                {' '}
                <div className="h-10 w-10 rounded-lg relative overflow-hidden shadow-lg">
                  <span className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20"></span>
                  <span className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M20 14V7C20 5.34315 18.6569 4 17 4H14M4 14V7C4 5.34315 5.34315 4 7 4H10M8 20H16M12 4V20"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
                <DialogTitle className="text-xl font-bold text-white">Extensions</DialogTitle>
              </div>
              <p className="text-sm text-white/50 mt-2 ml-[52px]">
                Add extensions to enhance your streaming experience
              </p>
            </DialogHeader>
          </div>{' '}
          {/* Content area with scrolling */}
          <div className="px-8 py-4 flex-1 overflow-y-auto">
            {/* Add new extension */}
            <div className="mb-6">
              <div className="text-sm text-white/60 mb-2 flex items-center">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  className="mr-1"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 5V19M5 12H19"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Add Extension
              </div>{' '}
              <div className="flex gap-2 relative">
                <Input
                  value={newManifestUrl}
                  onChange={(e) => setNewManifestUrl(e.target.value)}
                  placeholder="Enter a manifest.json URL..."
                  className="flex-1 px-4 py-3 h-11 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-white placeholder:text-white/40 focus:border-purple-500/30 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />{' '}
                <Button
                  onClick={onAdd}
                  className="px-5 h-11 rounded-xl relative overflow-hidden group border-0 shadow-lg"
                >
                  {/* Subtle gradient background */}
                  <span className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-md"></span>
                  {/* Dark overlay for contrast */}
                  <span className="absolute inset-0 bg-black/70"></span>
                  {/* Subtle accent on hover */}
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-purple-600/10 to-blue-600/10 transition-opacity"></span>

                  <span className="relative z-10 text-white font-semibold">Add</span>
                </Button>
              </div>
            </div>{' '}
            {/* Installed extensions section */}
            <div>
              {' '}
              <div className="flex items-center justify-between mb-4">
                {' '}
                <div className="font-semibold text-base text-white">Installed Extensions</div>
                <div className="text-xs text-white/70 font-medium px-2 py-1 rounded-full relative overflow-hidden">
                  <span className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10"></span>
                  <span className="absolute inset-0 bg-black/70 backdrop-blur-md"></span>
                  <span className="relative z-10">
                    {extensions.length} {extensions.length === 1 ? 'extension' : 'extensions'}
                  </span>
                </div>
              </div>
              {extensions && extensions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 px-4 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 text-center">
                  <div className="w-12 h-12 rounded-full relative overflow-hidden">
                    <span className="absolute inset-0 bg-gradient-to-br from-purple-600/15 to-blue-600/15"></span>
                    <span className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 14V7C20 5.34315 18.6569 4 17 4H14M4 14V7C4 5.34315 5.34315 4 7 4H10M8 20H16M12 4V20"
                          stroke="white"
                          strokeOpacity="0.6"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-1">No extensions added</h3>
                    <p className="text-sm text-white/60">
                      Add an extension URL above to get started
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {extensions.map((extension) => {
                    // Extract the URL consistently
                    const url = typeof extension === 'string' ? extension : extension.url
                    console.log('Rendering extension:', url) // Debug log

                    const manifest = extensionManifests[url]
                    const isDetailsOpen = showExtensionDetails === url

                    return (
                      <div
                        key={url}
                        className={`flex flex-row items-start mb-[18px] rounded-[14px] p-[16px_20px] shadow-[0_4px_18px_#18181b44] border-[1.5px] border-[#23272f] min-h-[60px] transition-all duration-200 gap-5 relative ${
                          manifest?.background
                            ? 'bg-cover bg-center bg-no-repeat'
                            : 'bg-black/60 backdrop-blur-xl'
                        }`}
                        style={
                          manifest?.background
                            ? { backgroundImage: `url(${manifest.background})` }
                            : {}
                        }
                      >
                        {manifest?.logo && (
                          <img
                            src={manifest.logo}
                            alt={`${manifest.name || 'Extension'} logo`}
                            className="w-12 h-12 rounded-[10px] object-contain bg-[#23272f] shadow-[0_2px_8px_#0008] mr-[18px]"
                          />
                        )}

                        <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                          <span
                            className="font-extrabold text-[#ffe082] text-[19px] mb-[1px] tracking-[0.1px] overflow-hidden text-ellipsis whitespace-nowrap"
                            style={{
                              textShadow: manifest?.background
                                ? '0 1px 8px rgba(0,0,0,0.7)'
                                : 'none'
                            }}
                          >
                            {manifest?.name || url}
                          </span>

                          <span
                            className="text-[#e5e5e5] text-[14px] italic overflow-hidden text-ellipsis whitespace-nowrap max-w-[350px] leading-[1.4]"
                            style={{
                              textShadow: manifest?.background
                                ? '0 1px 8px rgba(0,0,0,0.7)'
                                : 'none'
                            }}
                          >
                            {manifest?.description
                              ? `${manifest.description.slice(0, 100)}${
                                  manifest.description.length > 100 ? '...' : ''
                                }`
                              : ''}
                          </span>

                          <div className="flex gap-2 mt-[10px]">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => onRemove(url)}
                              className="text-[13px] px-[14px] py-[5px] rounded-[7px] font-semibold shadow-[0_1px_6px_rgba(0,0,0,0.3)]"
                            >
                              Remove
                            </Button>

                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-[13px] px-[14px] py-[5px] rounded-[7px] font-semibold bg-[rgba(32,32,40,0.85)] text-[#ffe082] border-none shadow-[0_1px_6px_rgba(0,0,0,0.5)] italic tracking-[0.2px]"
                              onClick={() => setShowExtensionDetails(isDetailsOpen ? null : url)}
                            >
                              {isDetailsOpen ? 'Hide Details' : 'Show Details'}
                            </Button>
                          </div>

                          {isDetailsOpen && manifest && (
                            <div
                              className="mt-3 bg-[rgba(24,24,27,0.93)] text-[#ffe082] rounded-[8px] p-[14px_16px] text-[14.5px] italic font-normal shadow-[0_2px_8px_rgba(0,0,0,0.5)] max-w-[480px] leading-[1.7]"
                              style={{ textShadow: '0 1px 8px rgba(0,0,0,0.7)' }}
                            >
                              {manifest.description}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  <div className="bg-transparent text-[#ffb300] rounded-[8px] py-2 mt-[18px] w-full font-normal text-[13px] italic opacity-85 text-center tracking-[0.1px] border-none leading-[1.6]">
                    <span>
                      This app does not host or distribute any media content.
                      <br />
                      Users are responsible for any third-party add-ons they choose to use.
                      <br />
                      Use at your own risk and responsibility.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
