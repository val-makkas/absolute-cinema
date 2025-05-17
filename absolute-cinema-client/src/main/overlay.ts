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

  // Get the preload script path and verify it exists
  const preloadPath = join(__dirname, '../preload/overlay-preload.js')
  console.log('[Overlay] Overlay preload path:', preloadPath)
  console.log('[Overlay] Preload script exists:', existsSync(preloadPath))

  // Use content bounds for perfect overlay alignment
  const bounds = mainWindow.getContentBounds()

  // Create new overlay window
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

  // Make the overlay window interactive but allow click-through for non-control areas
  overlayWindow.setIgnoreMouseEvents(false)

  // Load the overlay HTML
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    overlayWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay.html`)
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/overlay.html'))
  }

  // Open DevTools in development mode (commented out to disable dev tools)
  if (is.dev) {
    console.log('Open dev tool...')
    overlayWindow.webContents.openDevTools({ mode: 'detach' })
  }

  // Setup position synchronization with main window
  setupOverlayPositionSync(overlayWindow, mainWindow)

  // Make sure the overlay is shown
  overlayWindow.show()
  overlayWindow.focus()

  if (mainWindow && (mainWindow.isMinimized() || !mainWindow.isFocused())) {
    overlayWindow.hide()
    // When main window is restored or focused, show overlay and sync bounds
    const showOverlay = (): void => {
      if (overlayWindow) {
        overlayWindow.show()
        const bounds = mainWindow.getContentBounds()
        overlayWindow.setBounds({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        })
      }
      mainWindow.off('focus', showOverlay)
      mainWindow.off('restore', showOverlay)
    }
    mainWindow.on('focus', showOverlay)
    mainWindow.on('restore', showOverlay)
  }

  overlayWindow.on('ready-to-show', () => {
    console.log('[Overlay] Overlay window ready to show')
    if (mainWindow && mainWindow.isMinimized() && overlayWindow) {
      console.log('ok')
      overlayWindow.minimize()
    }
    console.log('error')
  })
  overlayWindow.on('closed', () => {
    console.log('[Overlay] Overlay window closed')
  })

  return overlayWindow
}

function setupOverlayPositionSync(overlay: BrowserWindow, main: BrowserWindow): void {
  console.log('[Overlay] Setting up position sync between overlay and main window')

  // Track window state
  let isMainMinimized = false

  // Create a function that properly passes parameters to syncOverlayToMain with a small delay
  const syncPosition = (): void => {
    // Small delay to let window operations complete
    setTimeout(() => {
      syncOverlayToMain(overlay, main)
    }, 10)
  }

  // Create a direct sync without delay for some events
  const syncPositionImmediate = (): void => {
    syncOverlayToMain(overlay, main)
  }

  // Handle minimize event - hide overlay when main window is minimized
  main.on('minimize', () => {
    console.log('[Overlay] Main window minimized')
    isMainMinimized = true
    if (overlay && !overlay.isDestroyed()) {
      overlay.hide()
    }
  })

  // Handle maximize event - restore overlay when main window is maximized
  main.on('maximize', () => {
    console.log('[Overlay] Main window maximized')
    isMainMinimized = false
    if (overlay && !overlay.isDestroyed()) {
      overlay.show()
      syncOverlayToMain(overlay, main)
    }
  })

  // Handle restore event (from minimized)
  main.on('restore', () => {
    console.log('[Overlay] Main window restored')
    isMainMinimized = false
    if (overlay && !overlay.isDestroyed()) {
      overlay.show()
      overlay.restore()
      setTimeout(() => syncOverlayToMain(overlay, main), 50)
    }
  })

  // Keep existing event handlers
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

  // Also handle main window visibility changes
  main.on('hide', () => {
    console.log('[Overlay] Main window hidden')
    if (overlay && !overlay.isDestroyed()) {
      overlay.hide()
    }
  })

  // Same handler for overlay show events to avoid recursion
  let isSyncingPosition = false
  overlay.on('show', () => {
    if (isSyncingPosition) return
    isSyncingPosition = true

    syncOverlayToMain(overlay, main)

    setTimeout(() => {
      isSyncingPosition = false
    }, 50)
  })

  // Keep existing handlers for close, blur, focus
  main.on('close', () => {
    if (overlay && !overlay.isDestroyed()) {
      overlay.close()
      overlayWindow = null
    }
  })

  main.on('blur', () => {
    setTimeout(() => {
      const focusedWindow = BrowserWindow.getFocusedWindow()
      const isAppFocused = !!focusedWindow && (focusedWindow === main || focusedWindow === overlay)

      if (!isAppFocused) {
        console.log('[Overlay] App lost focus, hiding overlay')
        if (overlay && !overlay.isDestroyed()) {
          overlay.hide()
        }
      } else {
        console.log('[Overlay] Focus switched between app windows, keeping overlay visible')
      }
    }, 25)
  })

  overlay.on('blur', () => {
    setTimeout(() => {
      const focusedWindow = BrowserWindow.getFocusedWindow()
      const isAppFocused = !!focusedWindow && (focusedWindow === main || focusedWindow === overlay)

      if (!isAppFocused) {
        console.log('[Overlay] App lost focus, hiding overlay')
        if (overlay && !overlay.isDestroyed()) {
          overlay.hide()
        }
      } else {
        console.log('[Overlay] Focus switched between app windows, keeping overlay visible')
      }
    }, 25)
  })

  main.on('focus', () => {
    if (overlay && !overlay.isDestroyed() && !isMainMinimized) {
      overlay.show()
      syncOverlayToMain(overlay, main)
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
      overlayWindow.setAlwaysOnTop(true, 'screen-saver')
    } catch (err) {
      console.error('[Overlay] Error syncing overlay position:', err)
    }
  }
}

export function removeMpvOverlayWindow(overlayWindow: BrowserWindow): void {
  console.log('[Overlay] Removing overlay window...')
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close()
  }
}
