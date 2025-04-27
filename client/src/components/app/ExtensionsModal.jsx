import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{
        background: 'rgba(0, 0, 0, 0.80)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 40, 0.37)',
        borderRadius: 22,
        border: '1.5px solid #23272f',
        padding: '2.5rem 2rem',
        minWidth: 420,
        maxWidth: 520,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        color: '#e5e5e5',
      }}>
        <DialogHeader style={{ width: '100%' }}>
          <DialogTitle style={{ color: '#e5e5e5', fontWeight: 900, fontSize: 28, letterSpacing: 1 }}>Extensions</DialogTitle>
        </DialogHeader>
        <div style={{ width: '100%' }}>
          <div style={{ marginBottom: 16 }}>
            <Input
              value={newManifestUrl}
              onChange={e => setNewManifestUrl(e.target.value)}
              placeholder="Enter a URL that points to a manifest.json file..."
              style={{ width: '100%', marginBottom: 8 }}
            />
            <Button onClick={onAdd} style={{ width: '100%' }}>
              Add Extension
            </Button>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Added Extensions:</div>
            {extensions.length === 0 && <div style={{ color: '#bbb' }}>No extensions added yet.</div>}
            {extensions.map(url => {
              const manifest = extensionManifests[url];
              const isDetailsOpen = showExtensionDetails === url;
              return (
                <div key={url} style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  marginBottom: 18,
                  background: manifest && manifest.background ? `linear-gradient(90deg, #18181b 70%, rgba(32,32,40,0.92)), url(${manifest.background}) center/cover no-repeat` : 'linear-gradient(90deg, #18181b 60%, #222 100%)',
                  borderRadius: 14,
                  padding: '16px 20px',
                  boxShadow: '0 4px 18px #18181b44',
                  border: '1.5px solid #23272f',
                  minHeight: 60,
                  transition: 'background 0.2s',
                  gap: 20,
                  position: 'relative',
                }}>
                  {manifest && manifest.logo && (
                    <img src={manifest.logo} alt={manifest.name + ' logo'} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'contain', background: '#23272f', boxShadow: '0 2px 8px #0008', marginRight: 18 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontWeight: 800, color: '#ffe082', fontSize: 19, marginBottom: 1, letterSpacing: 0.1, textShadow: manifest && manifest.background ? '0 1px 8px #000b' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {manifest && manifest.name ? manifest.name : url}
                    </span>
                    <span style={{ color: '#e5e5e5', fontSize: 14, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 350, textShadow: manifest && manifest.background ? '0 1px 8px #000b' : 'none', lineHeight: 1.4 }}>
                      {manifest && manifest.description ? manifest.description.slice(0, 100) + (manifest.description.length > 100 ? '...' : '') : ''}
                    </span>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <Button variant="destructive" size="sm" onClick={() => onRemove(url)} style={{ fontSize: 13, padding: '5px 14px', borderRadius: 7, fontWeight: 600, boxShadow: '0 1px 6px #0005' }}>
                        Remove
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        style={{ fontSize: 13, padding: '5px 14px', borderRadius: 7, fontWeight: 600, background: 'rgba(32,32,40,0.85)', color: '#ffe082', border: 'none', boxShadow: '0 1px 6px #0008', fontStyle: 'italic', letterSpacing: 0.2 }}
                        onClick={() => setShowExtensionDetails(isDetailsOpen ? null : url)}
                      >
                        {isDetailsOpen ? 'Hide Details' : 'Show Details'}
                      </Button>
                    </div>
                    {isDetailsOpen && manifest && (
                      <div style={{
                        marginTop: 12,
                        background: 'rgba(24,24,27,0.93)',
                        color: '#ffe082',
                        borderRadius: 8,
                        padding: '14px 16px',
                        fontSize: 14.5,
                        fontStyle: 'italic',
                        fontWeight: 400,
                        boxShadow: '0 2px 8px #0008',
                        maxWidth: 480,
                        lineHeight: 1.7,
                        textShadow: '0 1px 8px #000b',
                      }}>
                        {manifest.description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div style={{
              background: 'none',
              color: '#ffb300',
              borderRadius: 8,
              padding: '0.5rem 0',
              marginTop: 18,
              width: '100%',
              fontWeight: 400,
              fontSize: 13,
              fontStyle: 'italic',
              opacity: 0.85,
              textAlign: 'center',
              letterSpacing: 0.1,
              border: 'none',
              lineHeight: 1.6,
            }}>
              <span>
                This app does not host or distribute any media content.<br/>
                Users are responsible for any third-party add-ons they choose to use.<br/>
                Use at your own risk and responsibility.
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
