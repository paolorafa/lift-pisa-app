import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ IMPORTANTE: Questo è il TUO URL dello script Google Apps
const API_URL = 'https://script.google.com/macros/s/AKfycbxcVaz2ior8uGiabNWVekpZ7905jCKlgff11XuXQGSa535Qeh2useIycWPGfgNOleP7/exec';

const MAX_RETRIES = 2;
const RETRY_DELAY = 500;
const TIMEOUT_MS = 8000;

class ApiService {
  /**
   * Fetch con retry automatico e timeout
   */
  async fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      if (retries > 0 && error.name !== 'AbortError') {
        console.log(`Retry ${MAX_RETRIES - retries + 1}/${MAX_RETRIES}`);
        await this.delay(RETRY_DELAY);
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Richiedi codice temporaneo via email
   */
  async requestCode(email) {
    try {
      const url = `${API_URL}?action=sendClientCode&email=${encodeURIComponent(email)}`;
      const data = await this.fetchWithRetry(url, { method: 'GET' });
      return data;
    } catch (error) {
      console.error('Error requesting code:', error);
      throw new Error('Impossibile inviare il codice. Controlla la connessione.');
    }
  }

  /**
   * Login con email e codice
   */
  async login(email, code) {
    try {
      const url = `${API_URL}?action=getClientDataWithBookings&email=${encodeURIComponent(email)}&clientId=${encodeURIComponent(code)}`;
      const data = await this.fetchWithRetry(url, { method: 'GET' });
      
      if (data.found) {
        // ⭐ IMPORTANTE: Salva il codice ORIGINALE, non quello temporaneo
        const originalCode = data.clientId; // Il server restituisce il codice originale
        
        await AsyncStorage.setItem('user_email', email);
        await AsyncStorage.setItem('user_code', originalCode); // ✅ Salva codice originale
        await AsyncStorage.setItem('user_data', JSON.stringify(data));
        
        console.log('✅ Login salvato con codice originale:', originalCode);
      }
      
      return data;
      
    } catch (error) {
      console.error('Error during login:', error);
      throw new Error('Errore di connessione. Riprova.');
    }
  }

  /**
   * ⚡ MODIFICA: Ottieni slot disponibili con supporto per data specifica
   */
  async getAvailableSlots(targetDate = null) {
    try {
      // Crea chiave cache basata sulla data
      const cacheKey = targetDate ? `cached_slots_${targetDate}` : 'cached_slots';
      const cacheTimeKey = targetDate ? `cache_time_${targetDate}` : 'cache_time';
      
      // Controlla cache (valida per 2 minuti)
      const cached = await AsyncStorage.getItem(cacheKey);
      const cacheTime = await AsyncStorage.getItem(cacheTimeKey);
      
      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 300000) { // 2 minuti
          console.log('Using cached slots for date:', targetDate);
          return JSON.parse(cached);
        }
      }
      
      // ⚡ MODIFICA: Aggiungi targetDate alla richiesta se presente
      let url = `${API_URL}?action=getAvailableSlots`;
      if (targetDate) {
        url += `&targetDate=${targetDate}`;
      }
      
      const data = await this.fetchWithRetry(url, { method: 'GET' });
      
      // Salva in cache con chiave specifica per la data
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
      await AsyncStorage.setItem(cacheTimeKey, Date.now().toString());
      
      return data;
      
    } catch (error) {
      console.error('Error fetching slots:', error);
      
      // Fallback su cache vecchia se disponibile
      const cacheKey = targetDate ? `cached_slots_${targetDate}` : 'cached_slots';
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        console.log('Using old cached slots as fallback for date:', targetDate);
        return JSON.parse(cached);
      }
      
      throw new Error('Impossibile caricare gli slot. Controlla la connessione.');
    }
  }

  /**
   * ⚡ MODIFICA: Prenota uno slot con supporto per data specifica
   */
  async bookSlot(email, code, slotId, targetDate = null) {
    try {
      console.log('📝 Prenotazione con codice:', code, 'Data:', targetDate);
      
      // ⚡ MODIFICA: Aggiungi targetDate alla richiesta se presente
      let url = `${API_URL}?action=bookSlot&email=${encodeURIComponent(email)}&clientId=${encodeURIComponent(code)}&slotId=${slotId}`;
      if (targetDate) {
        url += `&targetDate=${targetDate}`;
      }
      
      const result = await this.fetchWithRetry(url, { method: 'GET' });
      
      // ⚡ MODIFICA: Invalida tutte le cache degli slot
      const keys = await AsyncStorage.getAllKeys();
      const slotCacheKeys = keys.filter(key => key.startsWith('cached_slots') || key.startsWith('cache_time'));
      await AsyncStorage.multiRemove(slotCacheKeys);
      
      return result;
    } catch (error) {
      console.error('Error booking slot:', error);
      throw new Error('Errore durante la prenotazione. Riprova.');
    }
  }

  /**
   * Cancella una prenotazione
   */
  async cancelBooking(email, bookingId) {
    try {
      const url = `${API_URL}?action=cancelBooking&email=${encodeURIComponent(email)}&bookingId=${bookingId}`;
      const result = await this.fetchWithRetry(url, { method: 'GET' });
      
      // ⚡ MODIFICA: Invalida tutte le cache degli slot
      const keys = await AsyncStorage.getAllKeys();
      const slotCacheKeys = keys.filter(key => key.startsWith('cached_slots') || key.startsWith('cache_time'));
      await AsyncStorage.multiRemove(slotCacheKeys);
      
      return result;
    } catch (error) {
      console.error('Error canceling booking:', error);
      throw new Error('Errore durante la cancellazione. Riprova.');
    }
  }

  /**
   * Ottieni dati utente aggiornati
   */
  async refreshUserData(email, code, forceRefresh = false) {
    try {
      // ⚡ Salta cache se forceRefresh è true
      if (!forceRefresh && this.userDataCache && this.cacheTimestamp) {
        const age = Date.now() - this.cacheTimestamp;
        if (age < this.CACHE_DURATION) {
          console.log('⚡ Using cached user data');
          return this.userDataCache;
        }
      }

      const url = `${API_URL}?action=getClientDataWithBookings&email=${encodeURIComponent(email)}&clientId=${encodeURIComponent(code)}`;
      const data = await this.fetchWithRetry(url, { method: 'GET' });
      
      if (data.found) {
        this.userDataCache = data;
        this.cacheTimestamp = Date.now();
        await AsyncStorage.setItem('user_data', JSON.stringify(data));
      }
      
      return data;
    } catch (error) {
      // Fallback su dati salvati
      const saved = await AsyncStorage.getItem('user_data');
      if (saved) {
        return JSON.parse(saved);
      }
      throw error;
    }
  }

  /**
   * Ottieni comunicazioni attive
   */
  async getCommunications() {
    try {
      const url = `${API_URL}?action=getCommunications`;
      const data = await this.fetchWithRetry(url, { method: 'GET' });
      
      // Se è un array, restituiscilo, altrimenti array vuoto
      return Array.isArray(data) ? data : [];
      
    } catch (error) {
      console.error('Error fetching communications:', error);
      return []; // In caso di errore, restituisci array vuoto (non bloccare l'app)
    }
  }

  async getAppUpdateInfo() {
    try {
      const url = `${API_URL}?action=getAppUpdateInfo`;
      const data = await this.fetchWithRetry(url, { method: 'GET' });
      return data;
    } catch (error) {
      console.error('Error fetching update info:', error);
      return { success: false, updateAvailable: false };
    }
  }

  async getPaymentInfo(email) {
    try {
      const url = `${API_URL}?action=getPaymentLink&email=${encodeURIComponent(email)}`;
      const data = await this.fetchWithRetry(url, { method: 'GET' });
      return data;
    } catch (error) {
      console.error('Error fetching payment info:', error);
      return { success: false, hasPayment: false };
    }
  }

  /**
   * Logout - rimuove dati locali
   */
  async logout() {
    try {
      // ⚡ MODIFICA: Rimuove tutte le cache degli slot
      const keys = await AsyncStorage.getAllKeys();
      const allKeys = [
        'user_email',
        'user_code', 
        'user_data',
        ...keys.filter(key => key.startsWith('cached_slots') || key.startsWith('cache_time'))
      ];
      
      await AsyncStorage.multiRemove(allKeys);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  /**
   * Controlla se l'utente è loggato
   */
  async isLoggedIn() {
    try {
      const email = await AsyncStorage.getItem('user_email');
      const code = await AsyncStorage.getItem('user_code');
      return !!(email && code);
    } catch (error) {
      return false;
    }
  }

  /**
   * Ottieni credenziali salvate
   */
  async getSavedCredentials() {
    try {
      const email = await AsyncStorage.getItem('user_email');
      const code = await AsyncStorage.getItem('user_code');
      
      console.log('📋 Credenziali salvate - Email:', email, 'Code:', code);
      
      return { email, code };
    } catch (error) {
      return { email: null, code: null };
    }
  }

  // ⚡ AGGIUNGI: Costanti per cache
  CACHE_DURATION = 300000; // 5 minuti
  userDataCache = null;
  cacheTimestamp = null;
}

export default new ApiService();