class BackupManager {
    constructor() {
      this.updateStoragePreview();
      this.updateStorageStats();
      setInterval(() => this.updateStorageStats(), 5000);
    }

    formatBytes(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    calculateStorageSize() {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        total += localStorage.getItem(key).length * 2;
      }
      return total;
    }

    getTotalStorageSize() {
      let totalSpace;
      try {
        totalSpace = 5 * 1024 * 1024; // 5MB en bytes
      } catch {
        totalSpace = 0;
      }
      return totalSpace;
    }

    updateStorageStats() {
      const usedSpace = this.calculateStorageSize();
      const totalSpace = this.getTotalStorageSize();
      const availableSpace = totalSpace - usedSpace;
      const percentageUsed = (usedSpace / totalSpace) * 100;
      
      const statsElement = document.getElementById('storageStats');
      statsElement.innerHTML = `
        <p>Espacio Total: ${this.formatBytes(totalSpace)}</p>
        <p>Espacio Utilizado: ${this.formatBytes(usedSpace)}</p>
        <p>Espacio Disponible: ${this.formatBytes(availableSpace)}</p>
        <p>Elementos Almacenados: ${localStorage.length}</p>
      `;

      // Actualizar la barra de almacenamiento
      const barFill = document.getElementById('storageBarFill');
      barFill.style.width = `${percentageUsed}%`;
    }

    showMessage(text, type) {
      const messageEl = document.getElementById('message');
      messageEl.textContent = text;
      messageEl.className = `message ${type}`;
      messageEl.style.display = 'block';
      setTimeout(() => messageEl.style.display = 'none', 3000);
    }

    updateStoragePreview() {
      const preview = document.getElementById('storagePreview');
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
          data[key] = JSON.parse(localStorage.getItem(key));
        } catch {
          data[key] = localStorage.getItem(key);
        }
      }
      preview.textContent = JSON.stringify(data, null, 2) || 'No hay datos en el almacenamiento local';
      this.updateStorageStats();
    }

    clearLocalStorage() {
      if (confirm('¿Está seguro que desea eliminar todos los datos del almacenamiento local? Esta acción no se puede deshacer.')) {
        localStorage.clear();
        this.updateStoragePreview();
        this.showMessage('¡Almacenamiento local borrado exitosamente!', 'success');
        this.updateStorageStats();
      }
    }

    createBackup() {
      try {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          data[key] = localStorage.getItem(key);
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `respaldo-${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showMessage('¡Respaldo creado exitosamente!', 'success');
      } catch (error) {
        this.showMessage('Error al crear el respaldo: ' + error.message, 'error');
      }
    }

    restoreBackup(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const backup = JSON.parse(e.target.result);
          if (typeof backup !== 'object') {
            throw new Error('Formato de respaldo inválido');
          }
          localStorage.clear();
          Object.entries(backup).forEach(([key, value]) => {
            localStorage.setItem(key, value);
          });
          this.showMessage('¡Respaldo restaurado exitosamente!', 'success');
          this.updateStoragePreview();
          this.updateStorageStats();
        } catch (error) {
          this.showMessage('Error al restaurar el respaldo: ' + error.message, 'error');
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    }
  }

  const backupManager = new BackupManager();