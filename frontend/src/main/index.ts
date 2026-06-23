import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as fs from 'fs'
import * as net from 'net'

let backendProcess: ChildProcess | null = null
const BACKEND_PORT = 8000

// Find the backend executable path
function getBackendPath(): string | null {
  if (is.dev) {
    // Dev mode: no embedded backend, assume uvicorn running separately
    return null
  }
  // Production: look for bundled backend
  const candidates = [
    join(process.resourcesPath, 'backend', 'backend_server', 'backend_server'),
    join(process.resourcesPath, 'backend_server', 'backend_server'),
    join(app.getAppPath(), '..', 'backend', 'backend_server', 'backend_server'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return null
}

// Wait until the backend port is open
function waitForBackend(port: number, maxMs = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      const socket = net.connect(port, '127.0.0.1')
      socket.on('connect', () => { socket.destroy(); resolve() })
      socket.on('error', () => {
        socket.destroy()
        if (Date.now() - start > maxMs) {
          reject(new Error(`Backend ${port} portunda başlamadı`))
        } else {
          setTimeout(check, 300)
        }
      })
    }
    check()
  })
}

async function startBackend(): Promise<void> {
  const exePath = getBackendPath()
  if (!exePath) {
    console.log('Dev mode: backend external olarak çalışıyor')
    return
  }

  const userData = app.getPath('userData')
  console.log('Backend başlatılıyor:', exePath)
  console.log('Data dizini:', userData)

  backendProcess = spawn(exePath, [], {
    env: {
      ...process.env,
      SMART_QUOTER_DATA: userData,
      SMART_QUOTER_PORT: String(BACKEND_PORT),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  backendProcess.stdout?.on('data', (d) => console.log('[backend]', d.toString().trim()))
  backendProcess.stderr?.on('data', (d) => console.error('[backend]', d.toString().trim()))
  backendProcess.on('exit', (code) => console.log('Backend kapandı, kod:', code))

  await waitForBackend(BACKEND_PORT)
  console.log('Backend hazır')
}

function stopBackend(): void {
  if (backendProcess && !backendProcess.killed) {
    console.log('Backend durduruluyor...')
    backendProcess.kill('SIGTERM')
    backendProcess = null
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Smart Quoter',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => { mainWindow.show() })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.dbscnc.smartquoter')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  // Start backend before showing window
  try {
    await startBackend()
  } catch (err) {
    console.error('Backend başlatılamadı:', err)
    dialog.showErrorBox(
      'Backend Hatası',
      'Uygulama sunucusu başlatılamadı.\n' + String(err)
    )
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopBackend()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopBackend()
})
