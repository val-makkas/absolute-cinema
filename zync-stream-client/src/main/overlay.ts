import { BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let overlayWindow: BrowserWindow | null = null

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
    frame: false,
    alwaysOnTop: true,
    focusable: false,
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

  overlayWindow.setIgnoreMouseEvents(false)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    overlayWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay.html`)
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/overlay.html'))
  }

  if (is.dev) {
    overlayWindow.webContents.openDevTools({ mode: 'detach' })
  }

  setupOverlayPositionSync(overlayWindow, mainWindow)

  overlayWindow.on('ready-to-show', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      if (mainWindow.isMinimized() || !mainWindow.isVisible()) {
        overlayWindow.hide()
      } else {
        overlayWindow.show()
        overlayWindow.focus()
      }
    }
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
      overlay.hide()
      overlay.minimize()
    }
  })

  main.on('maximize', () => {
    isMainMinimized = false
    if (!isDestroyed && overlay && !overlay.isDestroyed()) {
      overlay.show()
      syncOverlayToMain(overlay, main)
    }
  })

  main.on('restore', () => {
    isMainMinimized = false
    if (!isDestroyed && overlay && !overlay.isDestroyed()) {
      overlay.show()
      overlay.restore()
      setTimeout(() => {
        if (!isDestroyed && overlay && !overlay.isDestroyed()) {
          syncOverlayToMain(overlay, main)
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
      overlay.restore()
      syncPosition()
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
    }, 50)
  })

  main.on('close', () => {
    if (overlay && !overlay.isDestroyed()) {
      overlay.close()
      overlayWindow = null
    }
  })

  main.on('focus', () => {
    if (
      !isDestroyed &&
      overlay &&
      !overlay.isDestroyed() &&
      !isMainMinimized &&
      !main.isMinimized()
    ) {
      overlay.focus()
      syncOverlayToMain(overlay, main)
    }
  })

  overlay.on('focus', () => {
    if (!main.isDestroyed() && !main.isMinimized()) {
      main.focus()
    }
  })

  overlay.on('blur', () => {
    if (!main.isDestroyed() && !main.isMinimized()) {
      setTimeout(() => {
        if (!main.isFocused()) {
          main.focus()
        }
      }, 10)
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
