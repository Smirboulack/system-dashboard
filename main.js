const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const si = require('systeminformation');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    titleBarStyle: 'default'
  });

  mainWindow.loadFile('index.html');
  
  // Ouvrir DevTools en mode développement
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers pour récupérer les données système
ipcMain.handle('get-system-info', async () => {
  try {
    const [cpu, mem, osInfo, disk, network, graphics] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.osInfo(),
      si.fsSize(),
      si.networkInterfaces(),
      si.graphics() // Ajout des informations graphiques
    ]);
    
    return {
      cpu,
      memory: mem,
      os: osInfo,
      disk,
      network,
      graphics // Ajout des données graphiques
    };
  } catch (error) {
    console.error('Erreur récupération données système:', error);
    return null;
  }
});

ipcMain.handle('get-dynamic-data', async () => {
  try {
    const [cpuLoad, memInfo, processes, networkStats, gpuData] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.processes(),
      si.networkStats(),
      si.graphics() // Ajout des données GPU dynamiques
    ]);
    
    return {
      cpuLoad,
      memory: memInfo,
      processes: processes.list.slice(0, 10),
      networkStats,
      gpu: gpuData // Ajout des données GPU
    };
  } catch (error) {
    console.error('Erreur récupération données dynamiques:', error);
    return null;
  }
});
