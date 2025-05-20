import { spawn, spawnSync } from 'child_process'
import fs from 'fs'
import net from 'net'

export async function startIdleMpv(
  mpvTitle: string,
  mpvPath: string,
  pipeName: string,
  pendingRequests: Map<any, any>
): Promise<{ process: any; socket: any }> {
  await waitForPipeToBeDeleted(pipeName, 5000)

  const args = [
    '--idle',
    '--force-window=no',
    '--no-video',
    `--title=${mpvTitle}`,
    '--no-terminal',
    '--hwdec=auto',
    '--no-border',
    '--no-osc', // Disable on-screen controller
    '--no-osd-bar', // Disable on-screen display bar
    '--osd-level=0', // Disable on-screen display completely
    '--cursor-autohide=no', // Keep cursor hidden
    `--input-ipc-server=${pipeName}`
  ]

  console.log('Starting idle MPV with args:', args)
  const process = spawn(mpvPath, args, { detached: true })

  // Connect to the IPC socket
  await waitForPipe(pipeName)
  const socket = net.connect(pipeName)
  setupMpvIpcListener(socket, pendingRequests)

  socket.on('connect', () => {
    console.log('Connected to MPV IPC socket!')
  })

  socket.on('error', (err) => {
    console.error('MPV IPC socket error:', err)
  })

  return { process, socket }
}

export function setupMpvIpcListener(mpvIpcSocket, pendingRequests): void {
  if (!mpvIpcSocket) {
    console.error('[MPV] Cannot setup listener: mpvIpcSocket is null')
    return
  }

  console.log('[MPV] Setting up MPV IPC listener')

  // Test the socket with a ping command
  try {
    const pingId = Date.now()
    console.log('[MPV] Sending ping command with id:', pingId)

    mpvIpcSocket.write(
      JSON.stringify({
        command: ['get_property', 'pid'],
        request_id: pingId
      }) + '\n'
    )

    pendingRequests.set(pingId, (msg) => {
      console.log('[MPV] Received ping response:', msg)
      pendingRequests.delete(pingId)
    })
  } catch (err) {
    console.error('[MPV] Error sending ping command:', err)
  }

  mpvIpcSocket.on('data', (data) => {
    console.log('[MPV] Received data from MPV socket')
    data
      .toString()
      .split('\n')
      .forEach((line) => {
        if (!line.trim()) return
        try {
          const msg = JSON.parse(line)
          if (msg.request_id !== undefined && pendingRequests.has(msg.request_id)) {
            pendingRequests.get(msg.request_id)(msg)
            pendingRequests.delete(msg.request_id)
          }
        } catch (e) {
          console.error('Failed to parse MPV IPC response:', e, line)
        }
      })
  })

  mpvIpcSocket.on('error', (err) => {
    console.error('[MPV] Socket error:', err)
  })

  mpvIpcSocket.on('end', () => {
    console.log('[MPV] Socket ended')
  })

  mpvIpcSocket.on('close', () => {
    console.log('[MPV] Socket closed')
  })
}

export function waitForPipe(pipePath: string, timeout: number = 5000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const start: number = Date.now()
    ;(function check(): void {
      fs.access(pipePath, fs.constants.F_OK, (err: NodeJS.ErrnoException | null) => {
        if (!err) return resolve()
        if (Date.now() - start > timeout) {
          return reject(new Error('Pipe not created after timeout'))
        }
        setTimeout(check, 100)
      })
    })()
  })
}

export function waitForPipeToBeDeleted(pipePath: string, timeout = 5000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now()
    ;(function check() {
      fs.access(pipePath, fs.constants.F_OK, (err) => {
        if (err) return resolve()
        if (Date.now() - start > timeout)
          return reject(new Error('Pipe still exists after timeout'))
        setTimeout(check, 100)
      })
    })()
  })
}

export function closeAll(
  mpvProcess: any,
  windowMergerProcess: any,
  removeMpvOverlayWindow: () => void
): void {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/IM', 'mpv.exe', '/F', '/T'])
  } else {
    mpvProcess.kill('SIGKILL')
  }
  if (windowMergerProcess) {
    try {
      windowMergerProcess.kill('SIGKILL')
    } catch {
      /* empty */
    }
    windowMergerProcess = null
  }
  removeMpvOverlayWindow()
}
