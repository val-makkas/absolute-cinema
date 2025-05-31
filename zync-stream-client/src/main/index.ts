import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { startIdleMpv, closeAll } from './mpv'
import { spawn, ChildProcess } from 'child_process'
import { createMpvOverlayWindow, removeMpvOverlayWindow } from './overlay'
import path from 'path'
import { Socket } from 'net'

let mpvProcess: ChildProcess | null = null
let windowMergerProcess: ChildProcess | null = null
let mpvIpcSocket!: Socket
let mainWindow!: BrowserWindow
let command: { command: string[] } | null = null

let currentTorrentInfo = { infoHash: null, fileIdx: null }

let overlayWindow!: BrowserWindow
let isFull: boolean | null

const mpvTitle = 'MPV-EMBED-' + Date.now()

const parentHelperPath =
  process.platform === 'win32'
    ? path.join(app.getAppPath(), '..', 'tools', 'window-merger', 'window-merger-win.exe')
    : path.join(app.getAppPath(), '..', 'tools', 'window-merger', 'window-merger-wayland')

const mpvPath =
  process.platform === 'win32' ? join(app.getAppPath(), '..', 'tools', 'mpv', 'mpv.exe') : 'mpv'

const pipeName = process.platform === 'win32' ? `\\\\.\\pipe\\mpvpipe` : '/tmp/mpvpipe' + Date.now()

let request_id = 0

const pendingRequests = new Map()

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1700,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? '' : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  })

  mainWindow.webContents.openDevTools({ mode: 'detach' })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('close', () => {
    closeAll(mpvProcess, windowMergerProcess, () => removeMpvOverlayWindow(overlayWindow))
  })
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.zync.client')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  try {
    const { process, socket } = await startIdleMpv(mpvTitle, mpvPath, pipeName, pendingRequests)
    mpvProcess = process
    mpvIpcSocket = socket
  } catch (err) {
    console.error('Failed to start MPV:', err)
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

console.log('[MAIN] Registering MPV IPC handlers')

ipcMain.handle('mpv-command', async (_, args) => {
  console.log('[MAIN] Received mpv-command:', args)

  if (!mpvIpcSocket) {
    console.error('[MAIN] MPV socket not initialized')
    return false
  }

  try {
    switch (args.command) {
      case 'toggle-pause':
        command = { command: ['cycle', 'pause'] }
        break
      case 'seek':
        command = { command: ['set_property', 'time-pos', args.value] }
        break
      case 'set-volume':
        command = { command: ['set_property', 'volume', args.value] }
        break
      case 'toggle-fullscreen':
        command = { command: ['cycle', 'fullscreen'] }
        break
      case 'set-subtitle':
        command = { command: ['set_property', 'sid', args.value] }
        break
      default:
        console.log("ipc handler didn't receive a command")
        return { success: false, error: 'Invalid command' }
    }
    if (command) {
      mpvIpcSocket.write(JSON.stringify(command) + '\n')
      return { success: true }
    }
    return { success: false, error: 'No command executed' }
  } catch (error) {
    console.error('[MAIN] Error executing MPV command:', error)
    return false
  }
})

ipcMain.handle('mpv-fetch', async (_, args) => {
  console.log('[MAIN] Received mpv-fetch:', args)

  if (!mpvIpcSocket) {
    console.error('[MAIN] MPV socket not initialized')
    return null
  }

  try {
    return new Promise((resolve, reject) => {
      const thisRequestId = request_id++
      const timeoutId = setTimeout(() => {
        if (pendingRequests.has(thisRequestId)) {
          pendingRequests.delete(thisRequestId)
          reject('Request timed out')
        }
      }, 3000)
      pendingRequests.set(thisRequestId, (msg) => {
        clearTimeout(timeoutId)
        if (msg.error === 'success') {
          resolve(msg.data)
        } else {
          reject(msg.error)
        }
      })
      let command
      switch (args.command) {
        case 'isPlaying':
          command = { command: ['get_property', 'pause'], request_id: thisRequestId }
          break
        case 'currentTime':
          command = { command: ['get_property', 'time-pos'], request_id: thisRequestId }
          break
        case 'duration':
          command = { command: ['get_property', 'duration'], request_id: thisRequestId }
          break
        case 'volume':
          command = { command: ['get_property', 'volume'], request_id: thisRequestId }
          break
        case 'isFullscreen':
          command = { command: ['get_property', 'fullscreen'], request_id: thisRequestId }
          break
        case 'currentSubtitle':
          command = { command: ['get_property', 'sid'], request_id: thisRequestId }
          break
        default:
          pendingRequests.delete(thisRequestId)
          clearTimeout(timeoutId)
          reject('ipc fetcher didnt receive a command')
          return
      }
      try {
        mpvIpcSocket.write(JSON.stringify(command) + '\n')
      } catch (err) {
        pendingRequests.delete(thisRequestId)
        clearTimeout(timeoutId)
        reject(`Error sending command: ${err}`)
      }
    })
  } catch (error) {
    console.error('[MAIN] Error fetching MPV property:', error)
    return null
  }
})

console.log('[MAIN] MPV IPC handlers registered')

ipcMain.handle('play-in-mpv', async (_, streamUrl, infoHash, fileIdx) => {
  currentTorrentInfo = { infoHash, fileIdx }
  await new Promise((resolve) => setTimeout(resolve, 5000))
  try {
    if (!mpvProcess || mpvProcess.killed) {
      console.log('ok')
      const { process, socket } = await startIdleMpv(mpvTitle, mpvPath, pipeName, pendingRequests)
      mpvProcess = process
      mpvIpcSocket = socket
    }

    const electronTitle = mainWindow.getTitle()

    if (mpvIpcSocket) {
      mpvIpcSocket.write(JSON.stringify({ command: ['set_property', 'vid', 'auto'] }) + '\n')
      mpvIpcSocket.write(
        JSON.stringify({ command: ['set_property', 'force-window', 'yes'] }) + '\n'
      )
    } else {
      throw new Error('MPV IPC socket is not initialized')
    }

    if (mpvIpcSocket) {
      command = {
        command: ['loadfile', streamUrl]
      }
      mpvIpcSocket.write(JSON.stringify(command) + '\n')
    } else {
      throw new Error('MPV IPC socket is not initialized')
    }
    const pollForDuration = async (retries = 100): Promise<void> => {
      for (let i = 0; i < retries; i++) {
        try {
          console.log(`[Overlay] Polling MPV for duration (attempt ${i + 1}/${retries})...`)
          const duration = await new Promise((resolve, reject) => {
            const thisRequestId = request_id++
            const timeoutId = setTimeout(() => {
              if (pendingRequests.has(thisRequestId)) {
                pendingRequests.delete(thisRequestId)
                resolve(0)
              }
            }, 500)

            pendingRequests.set(thisRequestId, (msg) => {
              clearTimeout(timeoutId)
              if (msg.error === 'success') {
                resolve(msg.data)
              } else {
                resolve(0)
              }
            })

            const cmd = { command: ['get_property', 'duration'], request_id: thisRequestId }
            if (mpvIpcSocket) {
              mpvIpcSocket.write(JSON.stringify(cmd) + '\n')
            } else {
              reject(new Error('MPV IPC socket is not initialized'))
            }
          })
          console.log(`[Overlay] MPV duration response:`, duration)
          if (typeof duration === 'number' && duration > 0) {
            console.log(
              '[Overlay] Valid duration received, merging MPV window and creating overlay window.'
            )
            windowMergerProcess = spawn(parentHelperPath, [mpvTitle, electronTitle], {
              detached: true
            })
            overlayWindow = createMpvOverlayWindow(mainWindow)
            return
          }
        } catch (e) {
          console.error('[Overlay] Error polling for duration:', e)
        }
        await new Promise((r) => setTimeout(r, 200))
      }
    }

    pollForDuration()
    return { success: true }
  } catch (err) {
    console.error('Failed to load video in MPV:', err)
    return { success: false, error: err }
  }
})

ipcMain.handle('hide-mpv', async () => {
  try {
    console.log('Killing MPV and restarting in idle mode')

    closeAll(mpvProcess, windowMergerProcess, () => removeMpvOverlayWindow(overlayWindow))
    mpvProcess = null
    windowMergerProcess = null

    try {
      if (currentTorrentInfo.infoHash) {
        await fetch(`http://localhost:8888/remove/${currentTorrentInfo.infoHash}`, {
          method: 'DELETE'
        })
      }
    } catch (err) {
      console.error('Failed to remove torrent from backend:', err)
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))

    try {
      const { process, socket } = await startIdleMpv(mpvTitle, mpvPath, pipeName, pendingRequests)
      mpvProcess = process
      mpvIpcSocket = socket
      console.log('MPV restarted in idle mode')
      return { success: true }
    } catch (restartErr) {
      console.error('Failed to restart MPV in idle mode:', restartErr)
      return { success: false, error: restartErr }
    }
  } catch (err) {
    console.error('Failed to hide and restart MPV:', err)
    return { success: false, error: err }
  }
})

ipcMain.handle('fullscreen-main-window', async () => {
  if (mainWindow) {
    isFull = mainWindow.isFullScreen()
    mainWindow.setFullScreen(!isFull)
    return { success: true }
  }
  return { success: false }
})

ipcMain.handle('get-current-torrent-info', async () => {
  console.log('[MAIN] Received get-current-torrent-info')
  return currentTorrentInfo
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
