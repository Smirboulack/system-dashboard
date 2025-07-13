const { ipcRenderer } = require('electron');

class SystemDashboard {
    constructor() {
        this.charts = {};
        this.updateInterval = null;
        this.init();
    }

    async init() {
        await this.loadSystemInfo();
        this.setupCharts();
        this.startRealTimeUpdates();
    }

    async loadSystemInfo() {
        try {
            const systemInfo = await ipcRenderer.invoke('get-system-info');
            if (systemInfo) {
                this.updateSystemInfo(systemInfo);
                this.updateGPUInfo(systemInfo.graphics); // Ajout GPU
            }
        } catch (error) {
            console.error('Erreur chargement infos système:', error);
        }
    }

    updateSystemInfo(info) {
        // OS Info
        document.getElementById('os-info').textContent = 
            `${info.os.platform} ${info.os.release}`;
        
        // CPU Info
        document.getElementById('cpu-info').textContent = 
            `${info.cpu.manufacturer} ${info.cpu.brand}`;
        
        // Memory Total
        document.getElementById('memory-total').textContent = 
            `${(info.memory.total / 1024 / 1024 / 1024).toFixed(2)} GB`;
        
        // Uptime
        const uptime = this.formatUptime(info.os.uptime);
        document.getElementById('uptime').textContent = uptime;

        // Disk Info
        this.updateDiskInfo(info.disk);
    }

    // Nouvelle méthode pour les infos GPU
    updateGPUInfo(graphics) {
        if (graphics && graphics.controllers && graphics.controllers.length > 0) {
            const gpu = graphics.controllers[0]; // Première carte graphique
            
            // Modèle GPU
            document.getElementById('gpu-model').textContent = 
                gpu.model || 'Non détecté';
            
            // Fabricant
            document.getElementById('gpu-vendor').textContent = 
                gpu.vendor || 'Non détecté';
            
            // VRAM
            if (gpu.vram) {
                document.getElementById('gpu-vram').textContent = 
                    `${gpu.vram} MB`;
            } else {
                document.getElementById('gpu-vram').textContent = 'Non détecté';
            }
            
            // Résolution (premier display)
            if (graphics.displays && graphics.displays.length > 0) {
                const display = graphics.displays[0];
                document.getElementById('gpu-resolution').textContent = 
                    `${display.resolutionX || 'N/A'} x ${display.resolutionY || 'N/A'}`;
            } else {
                document.getElementById('gpu-resolution').textContent = 'Non détecté';
            }
        } else {
            // Pas de GPU détecté
            document.getElementById('gpu-model').textContent = 'Non détecté';
            document.getElementById('gpu-vendor').textContent = 'Non détecté';
            document.getElementById('gpu-vram').textContent = 'Non détecté';
            document.getElementById('gpu-resolution').textContent = 'Non détecté';
        }
    }

    updateDiskInfo(disks) {
        const diskList = document.getElementById('disk-list');
        diskList.innerHTML = '';

        disks.forEach(disk => {
            const usedPercent = ((disk.used / disk.size) * 100).toFixed(1);
            const diskItem = document.createElement('div');
            diskItem.className = 'disk-item';
            
            diskItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span><strong>${disk.mount}</strong> (${disk.fs})</span>
                    <span>${usedPercent}%</span>
                </div>
                <div>
                    ${(disk.used / 1024 / 1024 / 1024).toFixed(2)} GB / 
                    ${(disk.size / 1024 / 1024 / 1024).toFixed(2)} GB
                </div>
                <div class="disk-progress">
                    <div class="disk-progress-fill" style="width: ${usedPercent}%"></div>
                </div>
            `;
            
            diskList.appendChild(diskItem);
        });
    }

    setupCharts() {
        // CPU Chart
        const cpuCtx = document.getElementById('cpuChart').getContext('2d');
        this.charts.cpu = new Chart(cpuCtx, {
            type: 'doughnut',
            data: {
                labels: ['Utilisé', 'Libre'],
                datasets: [{
                    data: [0, 100],
                    backgroundColor: ['#e74c3c', '#ecf0f1'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        // Memory Chart
        const memCtx = document.getElementById('memoryChart').getContext('2d');
        this.charts.memory = new Chart(memCtx, {
            type: 'doughnut',
            data: {
                labels: ['Utilisée', 'Libre'],
                datasets: [{
                    data: [0, 100],
                    backgroundColor: ['#3498db', '#ecf0f1'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    async startRealTimeUpdates() {
        this.updateInterval = setInterval(async () => {
            await this.updateDynamicData();
        }, 2000);

        // Première mise à jour immédiate
        await this.updateDynamicData();
    }

    async updateDynamicData() {
        try {
            const data = await ipcRenderer.invoke('get-dynamic-data');
            if (data) {
                this.updateCPUChart(data.cpuLoad);
                this.updateMemoryChart(data.memory);
                this.updateProcessesList(data.processes);
                this.updateNetworkStats(data.networkStats);
                this.updateGPUUsage(data.gpu); // Ajout GPU usage
                this.updateLastUpdateTime();
            }
        } catch (error) {
            console.error('Erreur mise à jour données:', error);
        }
    }

    // Nouvelle méthode pour l'usage GPU
    updateGPUUsage(gpuData) {
        if (gpuData && gpuData.controllers && gpuData.controllers.length > 0) {
            const gpu = gpuData.controllers[0];
            
            // Utilisation GPU
            const gpuUsage = gpu.utilizationGpu || 0;
            const gpuUsageBar = document.getElementById('gpu-usage-bar');
            const gpuUsagePercent = document.getElementById('gpu-usage-percent');
            
            gpuUsageBar.style.width = `${gpuUsage}%`;
            gpuUsagePercent.textContent = `${gpuUsage.toFixed(1)}%`;
            
            // Couleur selon l'utilisation
            if (gpuUsage > 80) {
                gpuUsageBar.className = 'progress-fill high-usage';
            } else if (gpuUsage > 50) {
                gpuUsageBar.className = 'progress-fill medium-usage';
            } else {
                gpuUsageBar.className = 'progress-fill';
            }
            
            // Mémoire GPU
            const gpuMemoryUsage = gpu.utilizationMemory || 0;
            const gpuMemoryBar = document.getElementById('gpu-memory-bar');
            const gpuMemoryPercent = document.getElementById('gpu-memory-percent');
            
            gpuMemoryBar.style.width = `${gpuMemoryUsage}%`;
            gpuMemoryPercent.textContent = `${gpuMemoryUsage.toFixed(1)}%`;
            
            // Couleur mémoire
            if (gpuMemoryUsage > 80) {
                gpuMemoryBar.className = 'progress-fill high-usage';
            } else if (gpuMemoryUsage > 50) {
                gpuMemoryBar.className = 'progress-fill medium-usage';
            } else {
                gpuMemoryBar.className = 'progress-fill';
            }
            
            // Température GPU
            const gpuTemp = gpu.temperatureGpu || 0;
            const gpuTemperature = document.getElementById('gpu-temperature');
            
            if (gpuTemp > 0) {
                gpuTemperature.textContent = `${gpuTemp}°C`;
                
                // Couleur selon température
                if (gpuTemp > 80) {
                    gpuTemperature.className = 'temperature-value hot';
                } else if (gpuTemp > 70) {
                    gpuTemperature.className = 'temperature-value warm';
                } else {
                    gpuTemperature.className = 'temperature-value';
                }
            } else {
                gpuTemperature.textContent = 'N/A';
                gpuTemperature.className = 'temperature-value';
            }
        } else {
            // Pas de données GPU disponibles
            document.getElementById('gpu-usage-percent').textContent = 'N/A';
            document.getElementById('gpu-memory-percent').textContent = 'N/A';
            document.getElementById('gpu-temperature').textContent = 'N/A';
            document.getElementById('gpu-usage-bar').style.width = '0%';
            document.getElementById('gpu-memory-bar').style.width = '0%';
        }
    }

    updateCPUChart(cpuLoad) {
        const cpuPercent = cpuLoad.currentLoad.toFixed(1);
        
        // Mise à jour du graphique
        this.charts.cpu.data.datasets[0].data = [cpuPercent, 100 - cpuPercent];
        this.charts.cpu.update('none');
        
        // Mise à jour du pourcentage affiché
        document.getElementById('cpu-percentage').textContent = `${cpuPercent}%`;
    }

    updateMemoryChart(memory) {
        const usedPercent = ((memory.used / memory.total) * 100).toFixed(1);
        const freePercent = (100 - usedPercent).toFixed(1);
        
        // Mise à jour du graphique
        this.charts.memory.data.datasets[0].data = [usedPercent, freePercent];
        this.charts.memory.update('none');
        
        // Mise à jour des détails mémoire
        document.getElementById('memory-used').textContent = 
            `${(memory.used / 1024 / 1024 / 1024).toFixed(2)} GB`;
        document.getElementById('memory-free').textContent = 
            `${(memory.free / 1024 / 1024 / 1024).toFixed(2)} GB`;
    }

    updateProcessesList(processes) {
        const tbody = document.getElementById('processes-body');
        tbody.innerHTML = '';

        processes.forEach(process => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${process.name}</td>
                <td>${process.pid}</td>
                <td>${process.cpu.toFixed(1)}%</td>
                <td>${(process.mem / 1024 / 1024).toFixed(0)} MB</td>
            `;
            tbody.appendChild(row);
        });
    }

    updateNetworkStats(networkStats) {
        if (networkStats && networkStats.length > 0) {
            const totalStats = networkStats.reduce((acc, stat) => {
                acc.rx_sec += stat.rx_sec || 0;
                acc.tx_sec += stat.tx_sec || 0;
                return acc;
            }, { rx_sec: 0, tx_sec: 0 });

            document.getElementById('network-download').textContent = 
                this.formatBytes(totalStats.rx_sec) + '/s';
            document.getElementById('network-upload').textContent = 
                this.formatBytes(totalStats.tx_sec) + '/s';
        }
    }

    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        document.getElementById('last-update').textContent = 
            `Dernière mise à jour: ${timeString}`;
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / (24 * 3600));
        const hours = Math.floor((seconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        return `${days}j ${hours}h ${minutes}m`;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialisation du dashboard
window.addEventListener('DOMContentLoaded', () => {
    new SystemDashboard();
});
