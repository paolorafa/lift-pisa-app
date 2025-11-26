// [file name]: appVersion.js
export const APP_VERSION = '1.0.3'; // Aggiorna questa versione quando pubblichi un update

// Funzione per confrontare le versioni
export const isUpdateAvailable = (currentVersion, latestVersion) => {
  try {
    const currentParts = currentVersion.split('.').map(Number);
    const latestParts = latestVersion.split('.').map(Number);
    
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const current = currentParts[i] || 0;
      const latest = latestParts[i] || 0;
      
      if (latest > current) return true;
      if (latest < current) return false;
    }
    
    return false; // Le versioni sono uguali
  } catch (error) {
    console.error('Error comparing versions:', error);
    return false;
  }
};