import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { startIdleMpv, closeAll } from './mpv'
import { spawn, ChildProcess } from 'child_process'
import { createMpvOverlayWindow, removeMpvOverlayWindow } from './overlay'
import path from 'path'
import { Socket } from 'net'
import { writeFileSync, existsSync, mkdirSync } from 'fs'

const API_SUBS = import.meta.env.VITE_API_SUBS

let mpvProcess: ChildProcess | null = null
let windowMergerProcess: ChildProcess | null = null
let mpvIpcSocket!: Socket
let mainWindow!: BrowserWindow
let command: { command: string[] } | null = null

let currentTorrentInfo = {
  infoHash: null,
  fileIdx: null,
  imdbId: null,
  title: null,
  year: null,
  type: null,
  season: null,
  episode: null,
  episodeTitle: null
}

let overlayWindow: BrowserWindow | null = null
let isFull: boolean | null

const instanceId = `${(Math.random() * 10).toString().replace('.', '')}`

const mpvTitle = `MPV-EMBED-${instanceId}`

const parentHelperPath =
  process.platform === 'win32'
    ? path.join(app.getAppPath(), '..', 'tools', 'window-merger', 'window-merger-win.exe')
    : path.join(app.getAppPath(), '..', 'tools', 'window-merger', 'window-merger-wayland')

const mpvPath =
  process.platform === 'win32' ? join(app.getAppPath(), '..', 'tools', 'mpv', 'mpv.exe') : 'mpv'

const pipeName =
  process.platform === 'win32' ? `\\\\.\\pipe\\mpvpipe-${instanceId}` : `/tmp/mpvpipe${instanceId}`

let request_id = 0

let currentWatchParty: {
  roomId: number | null
  isHost: boolean
  streamPrepared: boolean
  allMembersReady: boolean
} = {
  roomId: null,
  isHost: false,
  streamPrepared: false,
  allMembersReady: false
}

const pendingRequests = new Map()

function createWindow(): void {
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
  electronApp.setAppUserModelId(`com.zync.client.${instanceId}`)

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

ipcMain.handle('mpv-command', async (_, args) => {
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
      case 'set-subtitle':
        if (args.value === null) {
          command = { command: ['set_property', 'sid', 'false'] }
        } else {
          command = { command: ['set_property', 'sid', args.value] }
        }
        break
      case 'add-subtitle':
        command = { command: ['sub-add', args.value] }
        break
      case 'subtitle-delay':
        command = { command: ['set_property', 'sub-delay', args.value] }
        break
      default:
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
        case 'subtitleTracks':
          command = { command: ['get_property', 'track-list'], request_id: thisRequestId }
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

const extractMetadata = (details) => {
  if (!details)
    return {
      imdbId: null,
      title: null,
      year: null,
      type: null,
      season: null,
      episode: null,
      episodeTitle: null
    }

  return {
    imdbId: details.imdb_id || null,
    title: details.title || null,
    year: details.year || null,
    type: details.type || null,
    season: details.season || null,
    episode: details.episode || null,
    episodeTitle: details.episodeTitle || null
  }
}

ipcMain.handle('prepare-stream', async (_, streamUrl, infoHash, fileIdx, movieDetails) => {
  const metadata = extractMetadata(movieDetails)

  currentTorrentInfo = {
    infoHash,
    fileIdx,
    ...metadata
  }

  try {
    if (!mpvProcess || mpvProcess.killed) {
      const { process, socket } = await startIdleMpv(mpvTitle, mpvPath, pipeName, pendingRequests)
      mpvProcess = process
      mpvIpcSocket = socket
    }
    if (mpvIpcSocket) {
      command = {
        command: ['loadfile', streamUrl]
      }
      mpvIpcSocket.write(JSON.stringify(command) + '\n')
      mpvIpcSocket.write(JSON.stringify({ command: ['set_property', 'pause', true] }) + '\n')
    } else {
      throw new Error('MPV IPC socket is not initialized')
    }

    const waitForReady = async (retries = 100): Promise<boolean> => {
      for (let i = 0; i < retries; i++) {
        try {
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

          if (typeof duration === 'number' && duration > 0) {
            mainWindow.webContents.send('member-ready-local')
            return true
          }
        } catch (e) {
          console.error('[Stream] Error checking stream readiness:', e)
        }
        await new Promise((r) => setTimeout(r, 200))
      }
      return false
    }

    const isReady = await waitForReady()
    return { success: isReady, ready: isReady }
  } catch (err) {
    console.error('Failed to prepare stream:', err)
    return { success: false, error: err, ready: false }
  }
})

ipcMain.handle('search-subtitles', async () => {
  try {
    const searchData = currentTorrentInfo
    if (!searchData.imdbId && !searchData.title) {
      throw new Error('Didnt pass torrent info correctly idiot.')
    }
    let apiUrl: string

    if (searchData.type === 'series' && searchData.season && searchData.episode) {
      apiUrl = `${API_SUBS}/subtitles/series/${searchData.imdbId}:${searchData.season}:${searchData.episode}.json`
    } else {
      apiUrl = `${API_SUBS}/subtitles/movie/${searchData.imdbId}.json`
    }

    const res = await fetch(apiUrl)
    if (!res.ok) {
      throw new Error(`Subs APi Error: ${res.status}, ${res.statusText}`)
    }

    const data = await res.json()
    const subs = data.subtitles || []

    const prefferedLanguages = ['eng', 'en', 'ell']
    const filteredSubs = subs.filter(
      (sub) => prefferedLanguages.includes(sub.lang) || subs.length < 10
    )

    return {
      success: true,
      subtitles: filteredSubs.length > 0 ? filteredSubs : subs.slice(0, 20),
      searchData,
      totalFound: subs.length
    }
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      subtitles: []
    }
  }
})

let idx = 1

ipcMain.handle('download-subtitle', async (_, subsInfo) => {
  try {
    const downloadUrl = subsInfo.url

    if (!downloadUrl) {
      throw new Error('No downlaod URL')
    }

    const res = await fetch(downloadUrl)
    if (!res.ok) {
      throw new Error(`Download failed: ${res.status}, ${res.statusText}`)
    }

    const subsContent = await res.text()
    console.log('[SUBTITLES] Downloaded content length:', subsContent.length)

    const subsDir = join(app.getPath('temp'), 'zync-subs')
    if (!existsSync(subsDir)) {
      mkdirSync(subsDir, { recursive: true })
    }

    const lang = subsInfo.lang || 'unknown'
    const encoding = subsInfo.SubEncoding || 'utf8'
    const filename = `subtitles_${lang}_${idx}.srt`
    const filepath = join(subsDir, filename)
    idx++

    writeFileSync(filepath, subsContent, encoding)

    return {
      success: true,
      filepath,
      filename,
      language: subsInfo.lang,
      encoding: subsInfo.SubEncoding
    }
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    }
  }
})

ipcMain.handle('init-watch-party', async (_, roomId, isHost) => {
  try {
    currentWatchParty = {
      roomId,
      isHost,
      streamPrepared: false,
      allMembersReady: false
    }
    return { success: true, party: currentWatchParty }
  } catch (err) {
    console.error(`[PARTY-${instanceId}] Failed to initialize watch party:`, err)
    return { success: false, error: err }
  }
})

ipcMain.handle('all-members-ready', async () => {
  try {
    currentWatchParty.allMembersReady = true

    if (currentWatchParty.isHost) {
      let countdown = 5
      const countdownInterval = setInterval(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('party-countdown-broadcast', countdown)
        } else {
          console.error(`[PARTY-${instanceId}] MainWindow is null or destroyed!`)
        }

        countdown--

        if (countdown < 0) {
          clearInterval(countdownInterval)

          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('party-start-playback-broadcast')
          } else {
            console.error(
              `[PARTY-${instanceId}] MainWindow is null or destroyed for playback start!`
            )
          }
        }
      }, 1000)
    } else {
      //
    }

    return { success: true }
  } catch (err) {
    console.error(`[PARTY-${instanceId}] Failed to handle all members ready:`, err)
    return { success: false, error: err }
  }
})

ipcMain.handle('reset-watch-party', async () => {
  try {
    currentWatchParty = {
      roomId: null,
      isHost: false,
      streamPrepared: false,
      allMembersReady: false
    }

    return { success: true }
  } catch (err) {
    console.error(`[PARTY-${instanceId}] Failed to reset watch party:`, err)
    return { success: false, error: err }
  }
})

ipcMain.handle('start-synchronized-playback', async () => {
  try {
    if (!mpvIpcSocket) {
      throw new Error('MPV IPC socket is not initialized')
    }

    const electronTitle = mainWindow.getTitle()

    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    mainWindow.setAlwaysOnTop(true, 'screen-saver')
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(false)
      }
    }, 1000)

    mpvIpcSocket.write(JSON.stringify({ command: ['set_property', 'vid', 'auto'] }) + '\n')
    mpvIpcSocket.write(JSON.stringify({ command: ['set_property', 'force-window', 'yes'] }) + '\n')
    mpvIpcSocket.write(JSON.stringify({ command: ['set_property', 'fullscreen', true] }) + '\n')
    setTimeout(() => {
      overlayWindow = createMpvOverlayWindow(mainWindow)
      windowMergerProcess = spawn(parentHelperPath, [mpvTitle, electronTitle], {
        detached: true
      })

      setTimeout(() => {
        mainWindow.moveTop()
        mainWindow.focus()

        mpvIpcSocket.write(JSON.stringify({ command: ['set_property', 'pause', false] }) + '\n')
      }, 100)
    }, 200)

    return { success: true }
  } catch (err) {
    console.error('Failed to start synchronized playback:', err)
    return { success: false, error: err }
  }
})

ipcMain.handle('play-in-mpv-solo', async (_, streamUrl, infoHash, fileIdx, movieDetails) => {
  const metadata = extractMetadata(movieDetails)

  currentTorrentInfo = {
    infoHash,
    fileIdx,
    ...metadata
  }
  await new Promise((resolve) => setTimeout(resolve, 5000))
  try {
    if (!mpvProcess || mpvProcess.killed) {
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
      mpvIpcSocket.write(JSON.stringify({ command: ['set_property', 'fullscreen', true] }) + '\n')
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
          if (typeof duration === 'number' && duration > 0) {
            if (mainWindow.isMinimized()) {
              mainWindow.restore()
            }
            mainWindow.setAlwaysOnTop(true, 'screen-saver')
            setTimeout(() => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.setAlwaysOnTop(false)
              }
            }, 1000)
            overlayWindow = createMpvOverlayWindow(mainWindow)
            windowMergerProcess = spawn(parentHelperPath, [mpvTitle, electronTitle], {
              detached: true
            })
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

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('navigate-to-discover')
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))

    try {
      const { process, socket } = await startIdleMpv(mpvTitle, mpvPath, pipeName, pendingRequests)
      mpvProcess = process
      mpvIpcSocket = socket
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
  return currentTorrentInfo
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
