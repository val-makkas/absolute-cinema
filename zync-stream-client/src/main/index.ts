import { app, shell, BrowserWindow, ipcMain, ipcRenderer } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { startIdleMpv, closeAll } from './mpv'
import { spawn, ChildProcess } from 'child_process'
import { createMpvOverlayWindow, removeMpvOverlayWindow } from './overlay'
import path from 'path'
import { Socket } from 'net'
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'fs'

if (process.type === 'renderer') {
  ipcRenderer.setMaxListeners(15)
}

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

let syncInterval: NodeJS.Timeout | null = null
let lastKnownState = { playing: false, timestamp: 0 }

const partySyncState = {
  isActive: false,
  isHost: false,
  isInSync: true,
  lastSyncTime: 0,
  memberCount: 0,
  roomId: null as number | null
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1700,
    height: 900,
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

function setMpvSocket(socket: Socket): void {
  mpvIpcSocket = socket
  setupMpvEventHandling()
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
    setMpvSocket(socket)
  } catch (err) {
    console.error('Failed to start MPV:', err)
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

function setupMpvEventHandling(): void {
  if (!mpvIpcSocket) return

  mpvIpcSocket.removeAllListeners('data')

  mpvIpcSocket.on('data', (data) => {
    const lines = data
      .toString()
      .split('\n')
      .filter((line) => line.trim())

    lines.forEach((line) => {
      try {
        const message = JSON.parse(line)

        if (
          message.event === 'property-change' &&
          partySyncState.isActive &&
          partySyncState.isHost
        ) {
          switch (message.name) {
            case 'pause':
              if (message.data === false) {
                console.log('MPV play event detected')
                sendSyncEvent('play')
              } else if (message.data === true) {
                console.log('MPV pause event detected')
                sendSyncEvent('pause')
              }
              break
          }
        }

        if (message.event === 'seek' && partySyncState.isActive && partySyncState.isHost) {
          console.log('MPV seek event detected')
          sendSyncEvent('seek')
        }

        if (message.request_id && pendingRequests.has(message.request_id)) {
          const callback = pendingRequests.get(message.request_id)
          if (callback) callback(message)
          pendingRequests.delete(message.request_id)
        }
      } catch (err) {
        console.error('Error parsing MPV message:', err)
      }
    })
  })
}

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
      case 'seek': {
        command = { command: ['set_property', 'time-pos', args.value] }
        if (partySyncState.isActive && partySyncState.isHost) {
          setTimeout(() => sendSyncEvent('seek'), 100)
        }
        break
      }
      case 'set-volume':
        command = { command: ['set_property', 'volume', args.value] }
        break
      case 'set-subtitle':
        if (args.value === null) {
          command = { command: ['set_property', 'sub-visibility', 'false'] }
        } else {
          command = { command: ['set_property', 'sid', args.value] }
          mpvIpcSocket.write(
            JSON.stringify({ command: ['set_property', 'sub-visibility', true] }) + '\n'
          )
        }
        break
      case 'add-subtitle':
        command = { command: ['sub-add', args.value, 'select'] }
        break
      case 'subtitle-delay':
        command = { command: ['set_property', 'sub-delay', args.value] }
        break
      case 'subtitle-size':
        command = { command: ['set_property', 'sub-scale', (args.value / 100).toString()] }
        break
      case 'remove-subtitle':
        command = { command: ['sub-remove', args.value] }
        break
      case 'cycle-subtitle':
        command = { command: ['cycle', 'sub'] }
        break
      case 'set-subtitle-visibility':
        command = { command: ['set_property', 'sub-visibility', args.value] }
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
        case 'subtitleDelay':
          command = { command: ['get_property', 'sub-delay'], request_id: thisRequestId }
          break
        case 'subtitleScale':
          command = { command: ['get_property', 'sub-scale'], request_id: thisRequestId }
          break
        case 'subtitleVisibility':
          command = { command: ['get_property', 'sub-visibility'], request_id: thisRequestId }
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
      setMpvSocket(socket)
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

ipcMain.handle('get-sync-status', async () => {
  return {
    isActive: partySyncState.isActive,
    isInSync: partySyncState.isInSync,
    lastSyncTime: partySyncState.lastSyncTime,
    isHost: partySyncState.isHost
  }
})

ipcMain.handle('update-party-members', async (_, memberCount) => {
  partySyncState.memberCount = memberCount

  mainWindow?.webContents.send('party-event', 'member-count-changed', {
    memberCount
  })

  return { success: true }
})

ipcMain.handle('start-party-sync', async (_, roomId: number, isHost: boolean) => {
  try {
    console.log('Starting party sync - Room:', roomId, 'Host:', isHost)

    partySyncState.isActive = true
    partySyncState.isHost = isHost
    partySyncState.roomId = roomId

    if (isHost && mpvIpcSocket) {
      // Only start sync if we have a valid room
      if (roomId && roomId > 0) {
        // Enable MPV events for pause/play detection
        mpvIpcSocket.write(
          JSON.stringify({
            command: ['observe_property', 1, 'pause']
          }) + '\n'
        )

        // Send heartbeat every 10 seconds (reduced frequency)
        syncInterval = setInterval(() => {
          if (partySyncState.isActive && partySyncState.roomId) {
            sendSyncEvent('heartbeat')
          }
        }, 10000) // 10 seconds instead of 2

        console.log('Party sync started successfully for room', roomId)
      }
    }

    return { success: true }
  } catch (err) {
    console.error('Failed to start party sync:', err)
    return { success: false, error: err }
  }
})

async function sendSyncEvent(type: 'play' | 'pause' | 'seek' | 'heartbeat'): Promise<void> {
  if (
    !mpvIpcSocket ||
    !partySyncState.isActive ||
    !partySyncState.isHost ||
    !partySyncState.roomId ||
    mpvIpcSocket.destroyed ||
    !mpvIpcSocket.writable
  ) {
    console.log(`Skipping ${type} sync event - invalid state or MPV not available`)
    return
  }

  try {
    const currentTime = await new Promise<number>((resolve) => {
      const thisRequestId = request_id++

      const timeout = setTimeout(() => {
        if (pendingRequests.has(thisRequestId)) {
          pendingRequests.delete(thisRequestId)
          console.warn('MPV time-pos request timed out')
          resolve(0)
        }
      }, 2000)

      pendingRequests.set(thisRequestId, (msg) => {
        clearTimeout(timeout)
        resolve(msg.error === 'success' ? msg.data : 0)
      })

      try {
        mpvIpcSocket.write(
          JSON.stringify({
            command: ['get_property', 'time-pos'],
            request_id: thisRequestId
          }) + '\n'
        )
      } catch (err) {
        clearTimeout(timeout)
        pendingRequests.delete(thisRequestId)
        console.error('Failed to write to MPV socket:', err)
        resolve(0)
      }
    })

    const isPaused = await new Promise<boolean>((resolve) => {
      const thisRequestId = request_id++

      const timeout = setTimeout(() => {
        if (pendingRequests.has(thisRequestId)) {
          pendingRequests.delete(thisRequestId)
          console.warn('MPV pause request timed out')
          resolve(true)
        }
      }, 2000)

      pendingRequests.set(thisRequestId, (msg) => {
        clearTimeout(timeout)
        resolve(msg.error === 'success' ? msg.data : true)
      })

      try {
        mpvIpcSocket.write(
          JSON.stringify({
            command: ['get_property', 'pause'],
            request_id: thisRequestId
          }) + '\n'
        )
      } catch (err) {
        clearTimeout(timeout)
        pendingRequests.delete(thisRequestId)
        console.error('Failed to write to MPV socket:', err)
        resolve(true)
      }
    })

    if (currentTime === 0 && type === 'heartbeat') {
      console.log('Skipping heartbeat with 0 timestamp - MPV likely not playing')
      return
    }

    const syncData = {
      timestamp: currentTime,
      playing: !isPaused,
      syncTime: Date.now(),
      type: type,
      roomId: partySyncState.roomId
    }

    if (
      type === 'heartbeat' ||
      syncData.playing !== lastKnownState.playing ||
      Math.abs(syncData.timestamp - lastKnownState.timestamp) > 2
    ) {
      console.log(`Sending ${type} sync event for room ${partySyncState.roomId}:`, syncData)
      mainWindow.webContents.send('host-sync-data', syncData)

      lastKnownState = { playing: syncData.playing, timestamp: syncData.timestamp }
    }
  } catch (err) {
    console.error('Failed to send sync event:', err)
    if (type === 'heartbeat') {
      console.log('Heartbeat failed - stopping party sync')
      partySyncState.isActive = false
    }
  }
}

ipcMain.handle('apply-sync-update', async (_, syncData) => {
  console.log('🔄 apply-sync-update called with:', syncData)
  try {
    if (!mpvIpcSocket) return { success: false }

    const {
      timestamp,
      playing,
      syncTime,
      eventType = 'heartbeat',
      isOwnEvent = false,
      senderID,
      senderUsername = 'Unknown'
    } = syncData

    if (isOwnEvent) {
      partySyncState.lastSyncTime = Date.now()
      partySyncState.isInSync = true
      return { success: true, message: 'Own event ignored' }
    }

    const latency = Date.now() - syncTime
    const adjustedTimestamp = timestamp + latency / 1000

    console.log(`🎬 Applying ${eventType} from ${senderUsername} (ID: ${senderID}):`, {
      timestamp,
      playing,
      latency: latency + 'ms',
      adjustedTimestamp
    })

    switch (eventType) {
      case 'seek':
        mpvIpcSocket.write(
          JSON.stringify({
            command: ['set_property', 'time-pos', adjustedTimestamp]
          }) + '\n'
        )
        mpvIpcSocket.write(
          JSON.stringify({
            command: ['set_property', 'pause', !playing]
          }) + '\n'
        )
        break

      case 'play':
      case 'pause':
        mpvIpcSocket.write(
          JSON.stringify({
            command: ['set_property', 'pause', !playing]
          }) + '\n'
        )
        if (Math.abs(latency) > 1000) {
          mpvIpcSocket.write(
            JSON.stringify({
              command: ['set_property', 'time-pos', adjustedTimestamp]
            }) + '\n'
          )
        }
        break

      case 'heartbeat':
      default: {
        const currentTime = await new Promise((resolve) => {
          const thisRequestId = request_id++
          pendingRequests.set(thisRequestId, (msg) => {
            resolve(msg.error === 'success' ? msg.data : 0)
          })
          mpvIpcSocket.write(
            JSON.stringify({
              command: ['get_property', 'time-pos'],
              request_id: thisRequestId
            }) + '\n'
          )
        })

        const drift = Math.abs(currentTime - adjustedTimestamp)
        if (drift > 3) {
          mpvIpcSocket.write(
            JSON.stringify({
              command: ['set_property', 'time-pos', adjustedTimestamp]
            }) + '\n'
          )
        }

        mpvIpcSocket.write(
          JSON.stringify({
            command: ['set_property', 'pause', !playing]
          }) + '\n'
        )
        break
      }
    }

    partySyncState.lastSyncTime = Date.now()
    partySyncState.isInSync = true

    return { success: true }
  } catch (err) {
    console.error('Failed to apply sync update:', err)
    partySyncState.isInSync = false
    return { success: false, error: err }
  }
})

ipcMain.handle('stop-party-sync', async () => {
  console.log('Stopping party sync')

  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }

  if (mpvIpcSocket && partySyncState.isHost) {
    try {
      mpvIpcSocket.write(
        JSON.stringify({
          command: ['unobserve_property', 1]
        }) + '\n'
      )
      console.log('MPV property observations disabled')
    } catch (err) {
      console.error('Failed to disable MPV observations:', err)
    }
  }

  partySyncState.isActive = false
  partySyncState.isHost = false
  partySyncState.roomId = null
  lastKnownState = { playing: false, timestamp: 0 }

  console.log('Party sync stopped successfully')
  return { success: true }
})

ipcMain.handle('trigger-manual-sync', async () => {
  if (partySyncState.isHost && partySyncState.isActive) {
    console.log('Triggering manual sync')
    sendSyncEvent('heartbeat')
    return { success: true }
  }
  return { success: false, error: 'Only active host can trigger manual sync' }
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

    return {
      success: true,
      subtitles: subs,
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
    if (existsSync(subsDir)) {
      rmSync(subsDir, { recursive: true, force: true })
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
  console.log('started DONT WORRY')
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
    }, 200)

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
      setMpvSocket(socket)
    }

    const electronTitle = mainWindow.getTitle()

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
            if (mpvIpcSocket) {
              mpvIpcSocket.write(
                JSON.stringify({ command: ['set_property', 'vid', 'auto'] }) + '\n'
              )
              mpvIpcSocket.write(
                JSON.stringify({ command: ['set_property', 'force-window', 'yes'] }) + '\n'
              )
              mpvIpcSocket.write(
                JSON.stringify({ command: ['set_property', 'fullscreen', true] }) + '\n'
              )
            } else {
              throw new Error('MPV IPC socket is not initialized')
            }
            if (mainWindow.isMinimized()) {
              mainWindow.restore()
            }
            mainWindow.setAlwaysOnTop(true, 'screen-saver')
            setTimeout(() => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.setAlwaysOnTop(false)
              }
            }, 1000)
            setTimeout(() => {
              overlayWindow = createMpvOverlayWindow(mainWindow)
              windowMergerProcess = spawn(parentHelperPath, [mpvTitle, electronTitle], {
                detached: true
              })
            }, 100)
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

    mainWindow.setAlwaysOnTop(true, 'screen-saver')
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(false)
      }
    }, 200)

    await new Promise((resolve) => setTimeout(resolve, 1000))

    try {
      const { process, socket } = await startIdleMpv(mpvTitle, mpvPath, pipeName, pendingRequests)
      mpvProcess = process
      setMpvSocket(socket)
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
