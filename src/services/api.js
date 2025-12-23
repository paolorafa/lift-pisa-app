import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// ⚠️ IMPORTANTE: Sostituisci con il TUO URL dello script Google Apps
const API_URL = 'https://script.google.com/macros/s/XXXXXXXXXXXXXX/usercontent';

// IMPOSTAZIONI MIGLIORATE
const MAX_RETRIES = 3;           // Aumentato da 2
const RETRY_DELAY = 1000;        // Aumentato da 500ms
const TIMEOUT_MS = 15000;        // Aumentato da 8000ms (8s → 15s)
const CACHE_DURATION = 300000;   // 5 minuti (corretto da 2 minuti)

class ApiService {
  constructor() {
    this.userDataCache = null;
    this.cacheTimestamp = null;
    this.CACHE_DURATION = CACHE_DURATION;
  }

  /**
   * Controlla se il dispositivo è connesso a internet
   */
  async checkNetworkConnection() {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected && state.isInternetReachable;
    } catch (error) {
      console.warn('Network check error:', error);
      // Se il check fallisce, assumi che c'è connessione (meglio provare che dare subito errore)
      return true;
    }
  }

  /**
   * Fetch con retry automatico, timeout e gestione rete
   */
  async fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
    try {
      // ✅ Controlla connessione prima di provare
      const isConnected = await this.checkNetworkConnection();
      if (!isConnected) {
        throw new Error('NO_NETWORK');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Distingui tipi di errore
      const isNetworkError = error.name === 'AbortError' || error.message === 'NO_NETWORK';
      const isServerError = error.message.startsWith('HTTP_');
      
      // ✅ Retry anche su AbortError (timeout), ma NON su errori di rete
      if (retries > 0 && (isServerError || error.message === 'Failed to fetch')) {
        console.log(`🔄 Retry ${MAX_RETRIES - retries + 1}/${MAX_RETRIES} - Errore: ${error.message}`);
        await this.delay(RETRY_DELAY);
        return this.fetchWithRetry(url, options, retries - 1);
      }
      
      // ✅ Lancia errore specifico per rete
      if (isNetworkError) {
        throw new Error('NETWORK_ERROR');
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
      
      // Messaggi di errore specifici
      if (error.message === 'NETWORK_ERROR') {
        throw new Error('Nessuna connessione internet. Controlla WiFi o dati mobili.');
      }
      if (error.message.startsWith('HTTP_')) {
        throw new Error('Il server non risponde. Riprova tra pochi secondi.');
      }
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
        const originalCode = data.clientId;
        
        await AsyncStorage.setItem('user_email', email);
        await AsyncStorage.setItem('user_code', originalCode);
        await AsyncStorage.setItem('user_data', JSON.stringify(data));
        
        console.log('✅ Login salvato con codice:', originalCode);
      }
      
      return data;
      
    } catch (error) {
      console.error('Error during login:', error);
      
      if (error.message === 'NETWORK_ERROR') {
        throw new Error('Nessuna connessione internet.');
      }
      if (error.message.startsWith('HTTP_')) {
        throw new Error('Server non disponibile. Riprova tra poco.');
      }
      throw new Error('Errore di connessione. Riprova.');
    }
  }

  /**
   * Ottieni slot disponibili con cache migliorata
   */
  async getAvailableSlots() {
    try {
      // ✅ Cache valida per 5 minuti (non 2)
      const cached = await AsyncStorage.getItem('cached_slots');
      const cacheTime = await AsyncStorage.getItem('cache_time');
      
      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < CACHE_DURATION) {
          console.log('⚡ Using cached slots (age:', Math.round(age / 1000), 's)');
          return JSON.parse(cached);
        }
      }
      
      const url = `${API_URL}?action=getAvailableSlots`;
      const data = await this.fetchWithRetry(url, { method: 'GET' });
      
      // Salva in cache
      await AsyncStorage.setItem('cached_slots', JSON.stringify(data));
      await AsyncStorage.setItem('cache_time', Date.now().toString());
      
      return data;
      
    } catch (error) {
      console.error('Error fetching slots:', error);
      
      // ✅ Fallback su cache anche se vecchia
      const cached = await AsyncStorage.getItem('cached_slots');
      if (cached) {
        console.log('⚠️ Using old cached slots as fallback');
        return JSON.parse(cached);
      }
      
      if (error.message === 'NETWORK_ERROR') {
        throw new Error('Nessuna connessione. Controlla internet.');
      }
      throw new Error('Impossibile caricare gli slot. Riprova.');
    }
  }

  /**
   * Prenota uno slot
   */
  async bookSlot(email, code, slotId) {
    try {
      console.log('📝 Prenotazione con codice:', code);
      
      const url = `${API_URL}?action=bookSlot&email=${encodeURIComponent(email)}&clientId=${encodeURIComponent(code)}&slotId=${slotId}`;
      const result = await this.fetchWithRetry(url, { method: 'GET' });
      
      // Invalida cache dopo prenotazione
      await AsyncStorage.removeItem('cached_slots');
      await AsyncStorage.removeItem('cache_time');
      
      return result;
    } catch (error) {
      console.error('Error booking slot:', error);
      
      if (error.message === 'NETWORK_ERROR') {
        throw new Error('Connessione persa. Controlla internet.');
      }
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
      
      // Invalida cache
      await AsyncStorage.removeItem('cached_slots');
      await AsyncStorage.removeItem('cache_time');
      
      return result;
    } catch (error) {
      console.error('Error canceling booking:', error);
      
      if (error.message === 'NETWORK_ERROR') {
        throw new Error('Nessuna connessione.');
      }
      throw new Error('Errore durante la cancellazione. Riprova.');
    }
  }

  /**
   * Ottieni dati utente aggiornati con cache
   */
  async refreshUserData(email, code, forceRefresh = false) {
    try {
      // ✅ Salta cache se forceRefresh è true
      if (!forceRefresh && this.userDataCache && this.cacheTimestamp) {
        const age = Date.now() - this.cacheTimestamp;
        if (age < this.CACHE_DURATION) {
          console.log('⚡ Using cached user data (age:', Math.round(age / 1000), 's)');
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
      console.error('Error refreshing user data:', error);
      
      // Fallback su dati salvati
      const saved = await AsyncStorage.getItem('user_data');
      if (saved) {
        console.log('⚠️ Using saved user data as fallback');
        return JSON.parse(saved);
      }
      
      if (error.message === 'NETWORK_ERROR') {
        throw new Error('Nessuna connessione.');
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
      
      return Array.isArray(data) ? data : [];
      
    } catch (error) {
      console.error('Error fetching communications:', error);
      // Non bloccare l'app se le comunicazioni non caricano
      return [];
    }
  }

  /**
   * Ottieni informazioni aggiornamento app
   */
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

  /**
   * Ottieni informazioni pagamento
   */
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
      await AsyncStorage.multiRemove([
        'user_email',
        'user_code',
        'user_data',
        'cached_slots',
        'cache_time'
      ]);
      this.userDataCache = null;
      this.cacheTimestamp = null;
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
      
      console.log('📋 Credenziali salvate - Email:', email);
      
      return { email, code };
    } catch (error) {
      return { email: null, code: null };
    }
  }
}

export default new ApiService();
