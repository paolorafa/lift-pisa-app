import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import ApiService from '../services/api';

const AppContext = createContext();

// ⚡ INTERVALLI DI REFRESH INTELLIGENTI
const REFRESH_INTERVALS = {
  slots: 3 * 60 * 1000,        // 3 minuti - cambiano spesso
  bookings: 5 * 60 * 1000,     // 5 minuti - cambiano meno
  payments: 5 * 60 * 1000,     // 5 minuti
  communications: 10 * 60 * 1000, // 10 minuti - cambiano raramente
};

export function AppProvider({ children }) {
  // 📊 STATE CENTRALIZZATO
  const [userData, setUserData] = useState(null);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [paymentData, setPaymentData] = useState(null);
  const [communications, setCommunications] = useState([]);
  
  // 🔄 LOADING STATES (separati per ogni risorsa)
  const [loading, setLoading] = useState({
    userData: false,
    slots: false,
    bookings: false,
    payments: false,
    communications: false,
  });

  // ⏰ TIMESTAMPS per smart refresh
  const lastFetch = useRef({
    slots: null,
    bookings: null,
    payments: null,
    communications: null,
  });

  // 🎯 Determina se serve ricaricare
  const shouldRefresh = useCallback((resource) => {
    const last = lastFetch.current[resource];
    if (!last) return true;
    
    const age = Date.now() - last;
    const threshold = REFRESH_INTERVALS[resource];
    
    return age > threshold;
  }, []);

  // ⚡ CARICA DATI UTENTE (con cache)
  const loadUserData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(prev => ({ ...prev, userData: true }));
      
      const { email, code } = await ApiService.getSavedCredentials();
      if (!email || !code) {
        setLoading(prev => ({ ...prev, userData: false }));
        return null;
      }

      const data = await ApiService.refreshUserData(email, code, forceRefresh);
      
      if (data.found) {
        setUserData(data);
        setBookings(data.bookings || []);
        console.log('✅ User data caricati');
      }
      
      return data;
    } catch (error) {
      console.error('❌ Errore caricamento user data:', error);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, userData: false }));
    }
  }, []);

  // ⚡ CARICA SLOTS (con smart refresh)
  const loadSlots = useCallback(async (forceRefresh = false) => {
    // Skip se non serve aggiornare
    if (!forceRefresh && !shouldRefresh('slots') && slots.length > 0) {
      console.log('⚡ Slots già freschi, skip reload');
      return slots;
    }

    try {
      setLoading(prev => ({ ...prev, slots: true }));
      
      const data = await ApiService.getAvailableSlots();
      setSlots(data);
      lastFetch.current.slots = Date.now();
      
      console.log('✅ Slots caricati:', data.length);
      return data;
    } catch (error) {
      console.error('❌ Errore caricamento slots:', error);
      return slots; // Ritorna gli slot esistenti
    } finally {
      setLoading(prev => ({ ...prev, slots: false }));
    }
  }, [slots, shouldRefresh]);

  // ⚡ CARICA PRENOTAZIONI (con smart refresh)
  const loadBookings = useCallback(async (forceRefresh = false) => {
    // Skip se non serve aggiornare
    if (!forceRefresh && !shouldRefresh('bookings') && bookings.length > 0) {
      console.log('⚡ Bookings già freschi, skip reload');
      return bookings;
    }

    try {
      setLoading(prev => ({ ...prev, bookings: true }));
      
      const { email, code } = await ApiService.getSavedCredentials();
      const data = await ApiService.refreshUserData(email, code, forceRefresh);
      
      if (data.found) {
        setBookings(data.bookings || []);
        lastFetch.current.bookings = Date.now();
        console.log('✅ Bookings caricati:', data.bookings?.length || 0);
        return data.bookings || [];
      }
      
      return bookings;
    } catch (error) {
      console.error('❌ Errore caricamento bookings:', error);
      return bookings;
    } finally {
      setLoading(prev => ({ ...prev, bookings: false }));
    }
  }, [bookings, shouldRefresh]);

  // ⚡ CARICA PAGAMENTI (con smart refresh)
  const loadPayments = useCallback(async (forceRefresh = false) => {
    // Skip se non serve aggiornare
    if (!forceRefresh && !shouldRefresh('payments') && paymentData) {
      console.log('⚡ Payments già freschi, skip reload');
      return paymentData;
    }

    try {
      setLoading(prev => ({ ...prev, payments: true }));
      
      const { email } = await ApiService.getSavedCredentials();
      if (!email) return null;

      const data = await ApiService.getPaymentInfo(email);
      setPaymentData(data);
      lastFetch.current.payments = Date.now();
      
      console.log('✅ Payments caricati');
      return data;
    } catch (error) {
      console.error('❌ Errore caricamento payments:', error);
      return paymentData;
    } finally {
      setLoading(prev => ({ ...prev, payments: false }));
    }
  }, [paymentData, shouldRefresh]);

  // ⚡ CARICA COMUNICAZIONI (con smart refresh)
  const loadCommunications = useCallback(async (forceRefresh = false) => {
    // Skip se non serve aggiornare
    if (!forceRefresh && !shouldRefresh('communications') && communications.length > 0) {
      console.log('⚡ Communications già fresche, skip reload');
      return communications;
    }

    try {
      setLoading(prev => ({ ...prev, communications: true }));
      
      const data = await ApiService.getCommunications();
      setCommunications(data);
      lastFetch.current.communications = Date.now();
      
      console.log('✅ Communications caricate:', data.length);
      return data;
    } catch (error) {
      console.error('❌ Errore caricamento communications:', error);
      return communications;
    } finally {
      setLoading(prev => ({ ...prev, communications: false }));
    }
  }, [communications, shouldRefresh]);

  // 🎯 PRENOTA SLOT - Invalida cache
  const bookSlot = useCallback(async (email, code, slotId, date) => {
    try {
      const result = await ApiService.bookSlot(email, code, slotId, date);
      
      if (result.success) {
        // Ricarica slots e bookings
        await Promise.all([
          loadSlots(true),
          loadBookings(true),
        ]);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Errore prenotazione:', error);
      throw error;
    }
  }, [loadSlots, loadBookings]);

  // 🎯 CANCELLA PRENOTAZIONE - Invalida cache
  const cancelBooking = useCallback(async (email, bookingId) => {
    try {
      const result = await ApiService.cancelBooking(email, bookingId);
      
      if (result.success) {
        // Ricarica slots e bookings
        await Promise.all([
          loadSlots(true),
          loadBookings(true),
        ]);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Errore cancellazione:', error);
      throw error;
    }
  }, [loadSlots, loadBookings]);

  // 🔄 REFRESH GLOBALE - Per pull-to-refresh
  const refreshAll = useCallback(async () => {
    console.log('🔄 Refresh globale...');
    
    await Promise.all([
      loadUserData(true),
      loadSlots(true),
      loadBookings(true),
      loadPayments(true),
      loadCommunications(true),
    ]);
    
    console.log('✅ Refresh completato');
  }, [loadUserData, loadSlots, loadBookings, loadPayments, loadCommunications]);

  // 📦 Context Value
  const value = {
    // State
    userData,
    slots,
    bookings,
    paymentData,
    communications,
    loading,
    
    // Actions
    loadUserData,
    loadSlots,
    loadBookings,
    loadPayments,
    loadCommunications,
    bookSlot,
    cancelBooking,
    refreshAll,
    
    // Utilities
    shouldRefresh,
    lastFetch: lastFetch.current,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// 🎯 Hook per usare il Context
export function useApp() {
  const context = useContext(AppContext);
  
  if (!context) {
    throw new Error('useApp deve essere usato dentro AppProvider');
  }
  
  return context;
}

export default AppContext;