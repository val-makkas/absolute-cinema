import { BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let overlayWindow: BrowserWindow | null = null

function setupKeyboardForwarding(overlay: BrowserWindow, main: BrowserWindow): void {
  main.webContents.on('before-input-event', (_, input) => {
    if (overlay && !overlay.isDestroyed() && overlay.isVisible()) {
      const forwardKeys = [
        'Space',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'KeyF',
        'KeyM'
      ]

      if (forwardKeys.includes(input.code) && input.type === 'keyDown') {
        console.log('✅ Forwarding key to overlay:', input.code)
        overlay.webContents.send('forwarded-key', {
          code: input.code,
          key: input.key,
          type: input.type
        })
      }
    }
  })
}

export function createMpvOverlayWindow(mainWindow: BrowserWindow): BrowserWindow {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close()
    overlayWindow = null
  }

  const preloadPath = join(__dirname, '../preload/overlay-preload.js')
  const bounds = mainWindow.getContentBounds()

  overlayWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    focusable: true,
    autoHideMenuBar: true,
    titleBarOverlay: false,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    parent: mainWindow,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  if (process.platform === 'win32') {
    overlayWindow.setAppDetails({
      appId: '',
      appIconPath: '',
      appIconIndex: 0,
      relaunchCommand: '',
      relaunchDisplayName: ''
    })
  }

  overlayWindow.setSkipTaskbar(true)
  overlayWindow.setMenuBarVisibility(false)
  overlayWindow.setVisibleOnAllWorkspaces(true)
  overlayWindow.setIgnoreMouseEvents(true)

  if (is.dev) {
    overlayWindow.webContents.once('dom-ready', () => {
      overlayWindow?.webContents.openDevTools({ mode: 'detach' })
    })
  }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    overlayWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay.html`)
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/overlay.html'))
  }

  setupOverlayPositionSync(overlayWindow, mainWindow)

  overlayWindow.on('ready-to-show', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.setSkipTaskbar(true)
      if (mainWindow.isMinimized() || !mainWindow.isVisible()) {
        overlayWindow.hide()
      } else {
        overlayWindow.show()
        setTimeout(() => {
          if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.focus()
          }
        }, 100)
      }
    }
  })

  overlayWindow.on('show', () => {
    overlayWindow?.setSkipTaskbar(true)
    // Focus overlay when it shows
    setTimeout(() => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.focus()
      }
    }, 50)
  })

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })

  return overlayWindow
}

function setupOverlayPositionSync(overlay: BrowserWindow, main: BrowserWindow): void {
  let isMainMinimized = false
  let isDestroyed = false

  overlay.on('closed', () => {
    overlayWindow = null
    isDestroyed = true
    main.removeAllListeners('minimize')
    main.removeAllListeners('maximize')
    main.removeAllListeners('restore')
    main.removeAllListeners('move')
    main.removeAllListeners('resize')
    main.removeAllListeners('unmaximize')
    main.removeAllListeners('enter-full-screen')
    main.removeAllListeners('leave-full-screen')
    main.removeAllListeners('show')
    main.removeAllListeners('hide')
    main.removeAllListeners('focus')
  })

  const syncPosition = (): void => {
    setTimeout(() => {
      syncOverlayToMain(overlay, main)
    }, 10)
  }

  const syncPositionImmediate = (): void => {
    syncOverlayToMain(overlay, main)
  }

  main.on('minimize', () => {
    isMainMinimized = true
    if (overlay && !isDestroyed && !overlay.isDestroyed()) {
      overlay.hide() // CHANGE: only hide, don't minimize
    }
  })

  main.on('maximize', () => {
    isMainMinimized = false
    if (!isDestroyed && overlay && !overlay.isDestroyed()) {
      overlay.show()
      overlay.setSkipTaskbar(true)
      syncOverlayToMain(overlay, main)
      setTimeout(() => overlay.focus(), 50)
    }
  })

  main.on('restore', () => {
    isMainMinimized = false
    if (!isDestroyed && overlay && !overlay.isDestroyed()) {
      overlay.show()
      overlay.setSkipTaskbar(true)
      setTimeout(() => {
        if (!isDestroyed && overlay && !overlay.isDestroyed()) {
          syncOverlayToMain(overlay, main)
          overlay.focus()
        }
      }, 50)
    }
  })

  main.on('move', syncPositionImmediate)
  main.on('resize', syncPositionImmediate)
  main.on('unmaximize', syncPosition)
  main.on('enter-full-screen', syncPosition)
  main.on('leave-full-screen', syncPosition)

  main.on('show', () => {
    if (overlay && !overlay.isDestroyed()) {
      overlay.show()
      overlay.setSkipTaskbar(true)
      syncPosition()
      setTimeout(() => overlay.focus(), 50)
    }
  })

  main.on('hide', () => {
    if (!isDestroyed && overlay && !overlay.isDestroyed()) {
      overlay.hide()
    }
  })

  let isSyncingPosition = false
  overlay.on('show', () => {
    if (isSyncingPosition) return
    isSyncingPosition = true
    syncOverlayToMain(overlay, main)
    setTimeout(() => {
      isSyncingPosition = false
      if (!overlay.isDestroyed()) {
        overlay.focus()
      }
    }, 50)
  })

  main.on('close', () => {
    if (overlay && !overlay.isDestroyed()) {
      overlay.close()
      overlayWindow = null
    }
  })
}

export function syncOverlayToMain(overlayWindow: BrowserWindow, mainWindow: BrowserWindow): void {
  if (overlayWindow && !overlayWindow.isDestroyed() && mainWindow && !mainWindow.isDestroyed()) {
    try {
      const bounds = mainWindow.getContentBounds()
      overlayWindow.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      })
    } catch {
      //
    }
  }
}

export function removeMpvOverlayWindow(overlayWindow: BrowserWindow | null): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close()
  }
}
