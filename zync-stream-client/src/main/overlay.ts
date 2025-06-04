import { BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { existsSync } from 'fs'

let overlayWindow: BrowserWindow | null = null

export function createMpvOverlayWindow(mainWindow: BrowserWindow): BrowserWindow {
  console.log('[Overlay] Creating overlay window...')

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close()
    overlayWindow = null
  }

  const preloadPath = join(__dirname, '../preload/overlay-preload.js')
  console.log('[Overlay] Overlay preload path:', preloadPath)
  console.log('[Overlay] Preload script exists:', existsSync(preloadPath))

  const bounds = mainWindow.getContentBounds()

  overlayWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    focusable: true,
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
    console.log('Open dev tool...')
    overlayWindow.webContents.openDevTools({ mode: 'detach' })
  }

  setupOverlayPositionSync(overlayWindow, mainWindow)

  overlayWindow.on('ready-to-show', () => {
    console.log('[Overlay] Overlay window ready to show')
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      if (mainWindow.isMinimized() || !mainWindow.isVisible()) {
        console.log('[Overlay] Main window not visible, hiding overlay')
        overlayWindow.hide()
      } else {
        console.log('[Overlay] Showing overlay')
        overlayWindow.show()
        overlayWindow.focus()
        mainWindow.moveTop()
        mainWindow.focus()
      }
    }
  })

  overlayWindow.on('closed', () => {
    console.log('[Overlay] Overlay window closed')
    overlayWindow = null
  })

  return overlayWindow
}

function setupOverlayPositionSync(overlay: BrowserWindow, main: BrowserWindow): void {
  console.log('[Overlay] Setting up position sync between overlay and main window')

  let isMainMinimized = false
  let isDestroyed = false

  overlay.on('closed', () => {
    console.log('[Overlay] Overlay closed, cleaning up event listeners')
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
    main.removeAllListeners('blur')
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
    console.log('[Overlay] Main window minimized')
    isMainMinimized = true
    if (overlay && !isDestroyed && !overlay.isDestroyed()) {
      overlay.hide()
    }
  })

  main.on('maximize', () => {
    console.log('[Overlay] Main window maximized')
    isMainMinimized = false
    if (!isDestroyed && overlay && !overlay.isDestroyed()) {
      overlay.show()
      syncOverlayToMain(overlay, main)
    }
  })

  main.on('restore', () => {
    console.log('[Overlay] Main window restored')
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
    console.log('[Overlay] Main window shown')
    if (overlay && !overlay.isDestroyed()) {
      overlay.show()
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

  main.on('blur', () => {
    setTimeout(() => {
      if (isDestroyed) return
      const focusedWindow = BrowserWindow.getFocusedWindow()
      const isAppFocused = !!focusedWindow && (focusedWindow === main || focusedWindow === overlay)

      if (!isAppFocused && !main.isMinimized() && overlay && !overlay.isDestroyed()) {
        console.log('[Overlay] App lost focus - hiding overlay')
        overlay.hide()
      } else {
        console.log('[Overlay] Focus switched between app windows, keeping overlay visible')
      }
    }, 100)
  })

  overlay.on('blur', () => {
    setTimeout(() => {
      if (isDestroyed) return

      const focusedWindow = BrowserWindow.getFocusedWindow()
      const isAppFocused = !!focusedWindow && (focusedWindow === main || focusedWindow === overlay)

      if (
        !isAppFocused &&
        !main.isFocused() &&
        !main.isMinimized() &&
        overlay &&
        !overlay.isDestroyed()
      ) {
        console.log('[Overlay] Overlay lost focus to external app - hiding overlay')
        overlay.hide()
      }
    }, 50)
  })
  main.on('focus', () => {
    console.log('[Overlay] Main window focused')
    if (
      !isDestroyed &&
      overlay &&
      !overlay.isDestroyed() &&
      !isMainMinimized &&
      !main.isMinimized()
    ) {
      overlay.show()
      syncOverlayToMain(overlay, main)
    }
  })

  overlay.on('focus', () => {
    console.log('[Overlay] Overlay focused')
    if (
      !isDestroyed &&
      overlay &&
      !overlay.isDestroyed() &&
      !isMainMinimized &&
      !main.isMinimized()
    ) {
      overlay.show()
    } else if (main.isMinimized()) {
      overlay.hide()
    }
  })
}

export function syncOverlayToMain(overlayWindow: BrowserWindow, mainWindow: BrowserWindow): void {
  if (overlayWindow && !overlayWindow.isDestroyed() && mainWindow && !mainWindow.isDestroyed()) {
    try {
      console.log('[Overlay] Syncing overlay position with main window')

      const bounds = mainWindow.getContentBounds()
      overlayWindow.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      })
    } catch (err) {
      console.error('[Overlay] Error syncing overlay position:', err)
    }
  }
}

export function removeMpvOverlayWindow(overlayWindow: BrowserWindow | null): void {
  console.log('[Overlay] Removing overlay window...')
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close()
  }
}
