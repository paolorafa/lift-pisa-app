// ========================================
// LIFT PRENOTAZIONI - GOOGLE APPS SCRIPT
// Versione 2.4 - PERFORMANCE OTTIMIZZATA
// ========================================

// === CONFIGURAZIONE ===
const SECURITY_CONFIG = {
  MAX_CODE_REQUESTS: 30,
  CODE_REQUEST_LOCKOUT_MINUTES: 60,
  TEMP_CODE_VALIDITY_HOURS: 24,   
  ADMIN_EMAIL: 'pisalift@gmail.com'
};

// ⚡ CACHE GLOBALE PER RIDURRE LETTURE
const CACHE = {
  spreadsheet: null,
  sheets: {},
  data: {},
  timestamp: {}
};

const CACHE_DURATION = 5000; // 5 secondi di cache

// ⚡ OTTIMIZZATO: Cache del foglio di calcolo
class SpreadsheetManager {
  constructor() {
    if (!CACHE.spreadsheet) {
      CACHE.spreadsheet = SpreadsheetApp.getActiveSpreadsheet() || 
        SpreadsheetApp.openById('1Sx_dwJLtM3kWfrw1Z3IXWdEMD0_1YJU2c1heVuJjkRA');
    }
    this.ss = CACHE.spreadsheet;
  }
  
  getSheet(name = null) {
    if (name && !CACHE.sheets[name]) {
      CACHE.sheets[name] = this.ss.getSheetByName(name);
    }
    return name ? CACHE.sheets[name] : this.ss.getSheets()[0];
  }
  
  // ⚡ NUOVO: Ottieni dati con cache
  getCachedData(sheetName) {
    const now = Date.now();
    const cacheKey = sheetName || 'main';
    
    // Se cache valida, ritorna dati cached
    if (CACHE.data[cacheKey] && CACHE.timestamp[cacheKey] && 
        (now - CACHE.timestamp[cacheKey] < CACHE_DURATION)) {
      Logger.log('⚡ Using cached data for: ' + cacheKey);
      return CACHE.data[cacheKey];
    }
    
    // Altrimenti leggi e aggiorna cache
    const sheet = this.getSheet(sheetName);
    if (!sheet) return null;
    
    const data = sheet.getDataRange().getValues();
    CACHE.data[cacheKey] = data;
    CACHE.timestamp[cacheKey] = now;
    
    return data;
  }
  
  // ⚡ Invalida cache quando si modifica
  invalidateCache(sheetName) {
    const cacheKey = sheetName || 'main';
    delete CACHE.data[cacheKey];
    delete CACHE.timestamp[cacheKey];
  }
}

// ⚡ OTTIMIZZATO: Batch delle operazioni di log
const LOG_BUFFER = [];
let LOG_TIMEOUT = null;

function logDebug(email, action, result, details = '') {
  LOG_BUFFER.push([new Date(), email, action, result, details]);
  
  // Scrivi in batch dopo 100ms
  if (LOG_TIMEOUT) clearTimeout(LOG_TIMEOUT);
  LOG_TIMEOUT = Utilities.sleep(100);
  flushLogs();
}

function flushLogs() {
  if (LOG_BUFFER.length === 0) return;
  
  try {
    const logSheet = getDebugLogSheet();
    if (logSheet && LOG_BUFFER.length > 0) {
      // ⚡ Scrittura batch invece di una per volta
      const range = logSheet.getRange(
        logSheet.getLastRow() + 1, 1, 
        LOG_BUFFER.length, 5
      );
      range.setValues(LOG_BUFFER);
      LOG_BUFFER.length = 0; // Svuota buffer
    }
  } catch(e) {
    Logger.log('Errore flush logs: ' + e.toString());
  }
}

// ⚡ OTTIMIZZATO: Ricerca veloce con indici
function findClientByEmail(email) {
  const sm = new SpreadsheetManager();
  const data = sm.getCachedData(); // Usa cache
  
  if (!data || data.length <= 1) return null;
  
  const emailLower = email.toLowerCase().trim();
  
  // ⚡ Cerca solo nella colonna email (indice 3)
  for(let i = 1; i < data.length; i++) {
    if(data[i][3] && data[i][3].toString().toLowerCase().trim() === emailLower) {
      return {
        row: data[i],
        index: i + 1
      };
    }
  }
  
  return null;
}

// ⚡ OTTIMIZZATO: Verifica codici temporanei più veloce
function verifyTempCode(email, inputCode) {
  try {
    const tempSheet = getTempCodesSheet();
    const data = tempSheet.getDataRange().getValues();
    
    if(data.length <= 1) return null;
    
    const now = new Date();
    const emailLower = email.toLowerCase().trim();
    const codeLower = inputCode.toUpperCase().trim();
    
    // ⚡ Cerca dal fondo (codici più recenti)
    for(let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      if(row[0]?.toString().toLowerCase().trim() === emailLower && 
         row[2]?.toString().trim() === codeLower) {
        
        // Verifica validità
        if(row[5]) return null; // Già usato
        
        const expiry = row[4] ? new Date(row[4]) : null;
        if(!expiry || expiry <= now) return null; // Scaduto
        
        return row[1]; // Ritorna codice originale
      }
    }
    
    return null;
  } catch(error) {
    return null;
  }
}

// ⚡ OTTIMIZZATO: Conta prenotazioni con meno iterazioni
function countWeeklyBookings(email, ss) {
  try {
    const sm = new SpreadsheetManager();
    const prenData = sm.getCachedData('Prenotazioni');
    
    if(!prenData || prenData.length <= 1) return 0;
    
    const today = new Date();
    const currentWeek = getWeekNumber(today);
    const currentYear = today.getFullYear();
    const emailLower = email.toLowerCase();
    
    let count = 0;
    
    // ⚡ Parti dal fondo (prenotazioni più recenti)
    for(let i = prenData.length - 1; i >= 1; i--) {
      const row = prenData[i];
      
      // Skip se email diversa
      if(!row[1] || row[1].toString().toLowerCase() !== emailLower) continue;
      
      // Skip se data mancante
      if(!row[8]) continue;
      
      const bookingDate = new Date(row[8]);
      if(isNaN(bookingDate.getTime())) continue;
      
      // Se è settimana precedente, possiamo fermarci
      const bookingWeek = getWeekNumber(bookingDate);
      const bookingYear = bookingDate.getFullYear();
      
      if(bookingYear < currentYear || 
         (bookingYear === currentYear && bookingWeek < currentWeek)) {
        break; // ⚡ Ferma il ciclo, non servono altre
      }
      
      if(bookingYear === currentYear && bookingWeek === currentWeek) {
        count++;
      }
    }
    
    return count;
    
  } catch(error) {
    Logger.log('Errore in countWeeklyBookings: ' + error.toString());
    return 0;
  }
}

// ⚡ OTTIMIZZATO: Filtra slot con meno calcoli
function filterAvailableSlotsWithCount(slots, prenData) {
  const now = new Date();
  const currentHour = now.getHours();
  const dayMap = { "Domenica":0, "Lunedì":1, "Martedì":2, "Mercoledì":3, "Giovedì":4, "Venerdì":5, "Sabato":6 };

  // ⚡ Pre-calcola conteggi in un'unica passata
  const bookingCounts = {};
  
  if(prenData && prenData.length > 0) {
    for(const pren of prenData) {
      if(!pren[4] || !pren[8]) continue;
      
      const slotId = pren[4];
      const bookingDate = parseDateItalian(pren[8]);
      if(!bookingDate) continue;
      
      const dateKey = formatDateForComparison(bookingDate);
      const countKey = `${slotId}_${dateKey}`;
      
      bookingCounts[countKey] = (bookingCounts[countKey] || 0) + 1;
    }
  }
  
  // ⚡ Filtra con conteggi pre-calcolati
  return slots.filter(slot => {
    const slotHour = parseInt(slot.Ora_Inizio.toString().split(':')[0]);
    
    if(slotHour < 6 || slotHour >= 21) return false;
    if(currentHour >= 21 && slotHour < 7) return false;
    
    const slotDate = getNextSlotDate(slot.Giorno, slot.Ora_Inizio);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const slotDateOnly = new Date(slotDate);
    slotDateOnly.setHours(0, 0, 0, 0);
    
    const isToday = slotDateOnly.getTime() === today.getTime();
    if(isToday && currentHour >= (slotHour - 2)) return false;
    
    const slotDateString = formatDateForComparison(slotDate);
    const countKey = `${slot.ID_Spazio}_${slotDateString}`;
    const count = bookingCounts[countKey] || 0;
    
    const status = count >= 8 ? "COMPLETO" : "disponibile";
    slot.Descrizione = `${slot.Giorno} ${slot.Ora_Inizio}-${slot.Ora_Fine} (${count}/8 - ${status} - ${formatBookingDate(slotDate)})`;
    
    return count < 8;
  });
}

// ⚡ OTTIMIZZATO: Verifica cliente veloce
function verificaCliente(email, clientId = null) {
  try {
    Logger.log('⚡ Verifica veloce per: ' + email);
    
    const clientInfo = findClientByEmail(email);
    
    if(!clientInfo) {
      logDebug(email, 'LOGIN', 'NON_TROVATO', 'Cliente non esiste');
      return { found: false, error: "Email non trovata nel sistema" };
    }
    
    const clientRow = clientInfo.row;
    
    // Validazione codice
    if(clientId) {
      const idFromSheet = clientRow[0]?.toString().trim() || '';
      const idInput = clientId.toString().trim().toUpperCase();
      
      let codeValid = false;
      let usedTempCode = null;
      
      if(idFromSheet === idInput) {
        codeValid = true;
        logDebug(email, 'LOGIN', 'SUCCESSO_ORIGINALE', 'Codice: ' + idInput);
      } else {
        const tempCodeOriginal = verifyTempCode(email, idInput);
        if(tempCodeOriginal && tempCodeOriginal === idFromSheet) {
          codeValid = true;
          usedTempCode = idInput;
          logDebug(email, 'LOGIN', 'SUCCESSO_TEMP', 'TempCode: ' + idInput);
        }
      }
      
      if(!codeValid) {
        logDebug(email, 'LOGIN', 'CODICE_ERRATO', 'Input: ' + idInput);
        return { found: false, error: "Codice non corretto o scaduto" };
      }
      
      if(usedTempCode) {
        markTempCodeAsUsed(email, usedTempCode);
      }
    }
    
    // Costruisci dati cliente (resto uguale)
    const paymentStatusRaw = clientRow[9]?.toString().trim() || '';
    const isPaid = paymentStatusRaw.toLowerCase() === 'pagato';
    
    const clientData = {
      found: true,
      clientId: clientRow[0] || '',
      cognome: clientRow[1] || '',
      nome: clientRow[2] || '',
      email: clientRow[3],
      codiceFiscale: clientRow[19] || '',
      certificateExpiryDate: clientRow[6] || null,
      accessAttempts: 0,
      isBlocked: false,
      certificateExpired: false,
      certificateExpiryString: '',
      asiExpired: false,
      asiExpiryString: '',
      message: '',
      paymentStatus: paymentStatusRaw,
      isPaid: isPaid,
      abbonamentoExpired: false,
      abbonamentoExpiryString: '',
    };
    
    // Validazioni (codice esistente mantenuto)
    if(clientData.certificateExpiryDate) {
      try {
        const expiryDate = new Date(clientData.certificateExpiryDate);
        if(isNaN(expiryDate.getTime())) {
          clientData.certificateExpired = true;
          clientData.certificateExpiryString = 'Data non valida';
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          expiryDate.setHours(0, 0, 0, 0);
          clientData.certificateExpiryString = formatDate(expiryDate);
          clientData.certificateExpired = expiryDate < today;
        }
      } catch(e) {
        clientData.certificateExpired = true;
        clientData.certificateExpiryString = 'Errore lettura data';
      }
    }
    
    // ASI e Abbonamento check (uguale)
    if(clientRow[18]) {
      const asiExpiryDate = new Date(clientRow[18]);
      if(!isNaN(asiExpiryDate.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        asiExpiryDate.setHours(0, 0, 0, 0);
        clientData.asiExpiryString = formatDate(asiExpiryDate);
        clientData.asiExpired = asiExpiryDate < today;
      }
    }
    
    if(clientRow[11]) {
      const abbonamentoExpiryDate = new Date(clientRow[11]);
      if(!isNaN(abbonamentoExpiryDate.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        abbonamentoExpiryDate.setHours(0, 0, 0, 0);
        clientData.abbonamentoExpiryString = formatDate(abbonamentoExpiryDate);
        clientData.abbonamentoExpired = abbonamentoExpiryDate < today;
      }
    }
    
    // ⚡ Usa prima riga per trovare colonna frequenza
    const headers = CACHE.data.main ? CACHE.data.main[0] : [];
    const freqIndex = headers.findIndex(h => 
      h.toString().toLowerCase().includes('frequenza') && 
      h.toString().toLowerCase().includes('abbonamento')
    );
    
    clientData.frequenza = (freqIndex >= 0 && clientRow[freqIndex]) ? 
                          clientRow[freqIndex].toString() : "Open";
    
    if(!clientData.isBlocked && !clientData.certificateExpired && clientData.isPaid) {
      const sm = new SpreadsheetManager();
      clientData.weeklyBookings = countWeeklyBookings(email, sm.ss);
    }
    
    return clientData;
    
  } catch(error) {
    Logger.log('❌ Errore in verificaCliente: ' + error.toString());
    return { found: false, error: "Errore interno del server" };
  }
}

// ⚡ OTTIMIZZATO: Prenota slot più veloce
function bookSlot(email, slotId, clientId = null) {
  try {
    const clientData = verificaCliente(email, clientId);
    if(!clientData.found) {
      return {success: false, message: clientData.error};
    }
    
    if(!clientData.isPaid) {
      return {success: false, message: "⚠️ Non puoi prenotare: abbonamento non pagato."};
    }
    
    if(clientData.certificateExpired) {
      return {success: false, message: "Certificato medico scaduto"};
    }
    
    const sm = new SpreadsheetManager();
    
    // ⚡ Ottieni dati cached
    const slotsData = sm.getCachedData('SpaziOrari');
    const prenData = sm.getCachedData('Prenotazioni');
    
    // Trova slot
    const slot = slotsData.slice(1).find(r => r[0] == slotId);
    if(!slot) {
      return {success: false, message: "Slot non trovato"};
    }
    
    // Validazioni veloci
    const slotDate = getNextSlotDate(slot[1], slot[2]);
    const slotDateString = formatDateForComparison(slotDate);
    
    // ⚡ Conta veloce prenotazioni esistenti
    let count = 0;
    const emailLower = email.toLowerCase();
    let hasDuplicate = false;
    
    if(prenData && prenData.length > 1) {
      for(let i = 1; i < prenData.length; i++) {
        const booking = prenData[i];
        if(booking[4] != slotId) continue;
        
        if(booking[8]) {
          const bookingDate = parseDateItalian(booking[8]);
          if(formatDateForComparison(bookingDate) === slotDateString) {
            count++;
            
            // Check duplicato stesso utente
            if(booking[1]?.toString().toLowerCase() === emailLower) {
              hasDuplicate = true;
              break;
            }
          }
        }
      }
    }
    
    if(hasDuplicate) {
      return {success: false, message: '❌ Hai già prenotato questo slot!'};
    }
    
    if(count >= 8) {
      return {success: false, message: "❌ SLOT COMPLETO"};
    }
    
    // Crea prenotazione
    const prenSheet = sm.getSheet('Prenotazioni');
    const newRow = [
      Utilities.getUuid(),
      clientData.email,
      clientData.nome,
      clientData.cognome,
      slot[0],
      slot[1],
      slot[2],
      slot[3],
      slotDate
    ];
    
    prenSheet.appendRow(newRow);
    
    // ⚡ Invalida cache
    sm.invalidateCache('Prenotazioni');
    
    return {
      success: true, 
      message: `Prenotazione completata: ${slot[1]} ${slot[2]}-${slot[3]}`
    };
    
  } catch(error) {
    Logger.log('Errore in bookSlot: ' + error.toString());
    return {success: false, message: "Errore durante la prenotazione"};
  }
}

// ⚡ OTTIMIZZATO: Cancella prenotazione veloce
function cancelBooking(bookingId, userEmail) {
  try {
    const sm = new SpreadsheetManager();
    const prenData = sm.getCachedData('Prenotazioni');
    
    if(!prenData || prenData.length <= 1) {
      return {success: false, message: 'Nessuna prenotazione trovata'};
    }
    
    const emailLower = userEmail.toLowerCase();
    
    // ⚡ Cerca prenotazione partendo dal fondo
    for(let i = prenData.length - 1; i >= 1; i--) {
      const booking = prenData[i];
      
      if(booking[0] === bookingId && 
         booking[1]?.toString().toLowerCase() === emailLower) {
        
        // Verifica tempo minimo
        if(booking[8]) {
          const now = new Date();
          const slotDateTime = new Date(booking[8]);
          const timeStr = booking[6].toString();
          const [hour, minute = 0] = timeStr.split(':').map(Number);
          slotDateTime.setHours(hour, minute, 0, 0);
          
          const diffHours = (slotDateTime - now) / (1000 * 60 * 60);
          
          if(diffHours < 0) {
            return {success: false, message: 'Non puoi cancellare prenotazioni passate'};
          }
          
          if(diffHours < 5) {
            const ore = Math.floor(diffHours);
            const min = Math.floor((diffHours - ore) * 60);
            return {
              success: false, 
              message: `Devi cancellare almeno 5 ore prima. Mancano ${ore}h ${min}min.`
            };
          }
        }
        
        // Cancella riga
        const prenSheet = sm.getSheet('Prenotazioni');
        prenSheet.deleteRow(i + 1); // +1 perché i parte da 0
        
        // ⚡ Invalida cache
        sm.invalidateCache('Prenotazioni');
        
        const message = `Prenotazione cancellata: ${booking[5]} ${booking[6]}-${booking[7]}`;
        return {success: true, message: message};
      }
    }
    
    return {success: false, message: 'Prenotazione non trovata'};
    
  } catch(error) {
    Logger.log('Errore in cancelBooking: ' + error.toString());
    return {success: false, message: 'Errore durante la cancellazione'};
  }
}

// ⚡ OTTIMIZZATO: Get Available Slots
function getAvailableSlots() {
  try {
    const sm = new SpreadsheetManager();
    
    // ⚡ Usa dati cached
    const slotsData = sm.getCachedData('SpaziOrari');
    const prenData = sm.getCachedData('Prenotazioni');
    
    if(!slotsData || slotsData.length <= 1) return [];
    
    const slots = slotsData.slice(1).map(row => ({
      ID_Spazio: row[0],
      Giorno: row[1],
      Ora_Inizio: row[2],
      Ora_Fine: row[3],
      Descrizione: row[1] + " " + row[2] + "-" + row[3]
    }));

    return filterAvailableSlotsWithCount(slots, prenData ? prenData.slice(1) : []);
    
  } catch(error) {
    Logger.log('Errore in getAvailableSlots: ' + error.toString());
    return [];
  }
}

// ⚡ OTTIMIZZATO: Get user bookings veloce
function getUserBookings(email) {
  try {
    const sm = new SpreadsheetManager();
    const prenData = sm.getCachedData('Prenotazioni');
    
    if(!prenData || prenData.length <= 1) {
      return {success: true, bookings: [], totalBookings: 0};
    }
    
    const today = new Date();
    const currentWeek = getWeekNumber(today);
    const currentYear = today.getFullYear();
    const emailLower = email.toLowerCase();
    const userBookings = [];
    
    // ⚡ Parti dal fondo per trovare prenotazioni più recenti
    for(let i = prenData.length - 1; i >= 1; i--) {
      const booking = prenData[i];
      
      if(booking[1]?.toString().toLowerCase() !== emailLower) continue;
      if(!booking[8]) continue;
      
      const bookingDate = new Date(booking[8]);
      if(isNaN(bookingDate.getTime())) continue;
      
      const bookingWeek = getWeekNumber(bookingDate);
      const bookingYear = bookingDate.getFullYear();
      
      // Solo prenotazioni future o settimana corrente
      if(bookingYear > currentYear || 
         (bookingYear === currentYear && bookingWeek >= currentWeek)) {
        
        userBookings.push({
          id: booking[0],
          email: booking[1],
          nome: booking[2],
          cognome: booking[3],
          idSpazio: booking[4],
          giorno: booking[5],
          oraInizio: booking[6],
          oraFine: booking[7],
          dataPrenotazione: bookingDate.toISOString(),
          dataFormatted: formatBookingDate(bookingDate),
          slotDescription: `${booking[5]} ${booking[6]}-${booking[7]} (${formatBookingDate(bookingDate)})`
        });
      }
    }
    
    // Ordina per data
    userBookings.sort((a, b) => new Date(a.dataPrenotazione) - new Date(b.dataPrenotazione));
    
    return {
      success: true, 
      bookings: userBookings, 
      totalBookings: userBookings.length
    };
    
  } catch(error) {
    Logger.log('Errore in getUserBookings: ' + error.toString());
    return {success: false, bookings: [], totalBookings: 0};
  }
}

// ⚡ OTTIMIZZATO: Get client data con prenotazioni
function getClientDataWithBookings(email, clientId = null) {
  try {
    const clientData = verificaCliente(email, clientId);
    
    if(!clientData.found) {
      return JSON.parse(JSON.stringify(clientData));
    }
    
    if(clientData.isBlocked || clientData.certificateExpired || !clientData.isPaid) {
      return JSON.parse(JSON.stringify({
        ...clientData,
        weeklyBookings: 0,
        bookings: [],
        totalBookings: 0
      }));
    }
    
    const bookings = getUserBookings(email);
    
    return JSON.parse(JSON.stringify({
      ...clientData,
      bookings: bookings.bookings || [],
      totalBookings: bookings.totalBookings || 0
    }));
    
  } catch(error) {
    Logger.log('Errore in getClientDataWithBookings: ' + error.toString());
    return JSON.parse(JSON.stringify({
      found: false, 
      error: "Errore nel recupero dati"
    }));
  }
}

// === RESTO DELLE FUNZIONI RIMANGONO UGUALI ===
// (tutte le altre funzioni helper rimangono identiche)

function getTempCodesSheet() {
  const sm = new SpreadsheetManager();
  let tempSheet = sm.ss.getSheetByName('CodiciTemporanei');
  
  if (!tempSheet) {
    tempSheet = sm.ss.insertSheet('CodiciTemporanei');
    tempSheet.appendRow([
      'Email', 'CodiceOriginale', 'CodiceTemporaneo', 
      'DataCreazione', 'Scadenza', 'Utilizzato'
    ]);
  }
  
  return tempSheet;
}

function getDebugLogSheet() {
  const sm = new SpreadsheetManager();
  let logSheet = sm.ss.getSheetByName('DebugLogs');
  
  if (!logSheet) {
    logSheet = sm.ss.insertSheet('DebugLogs');
    logSheet.appendRow([
      'Timestamp', 'Email', 'Azione', 'Risultato', 'Dettagli'
    ]);
  }
  
  return logSheet;
}

function generateTempCode(originalCode) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let tempCode = '';
  
  for(let i = 0; i < 8; i++) {
    tempCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return tempCode;
}

function saveTempCode(email, originalCode, tempCode) {
  try {
    const tempSheet = getTempCodesSheet();
    const now = new Date();
    const expiry = new Date(now.getTime() + (SECURITY_CONFIG.TEMP_CODE_VALIDITY_HOURS * 60 * 60 * 1000));
    
    tempSheet.appendRow([
      email.toLowerCase(),
      originalCode,
      tempCode,
      now,
      expiry,
      false
    ]);
    
    return true;
  } catch(error) {
    Logger.log('Errore salvataggio codice temporaneo: ' + error.toString());
    return false;
  }
}

function markTempCodeAsUsed(email, tempCode) {
  try {
    const tempSheet = getTempCodesSheet();
    const data = tempSheet.getDataRange().getValues();
    
    if(data.length <= 1) return;
    
    const emailLower = email.toLowerCase().trim();
    const codeLower = tempCode.toUpperCase().trim();
    
    for(let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowEmail = row[0]?.toString().toLowerCase().trim() || '';
      const rowTempCode = row[2]?.toString().trim() || '';
      
      if(rowEmail === emailLower && rowTempCode === codeLower) {
        tempSheet.getRange(i + 1, 6).setValue(true);
        return;
      }
    }
  } catch(error) {
    Logger.log('Errore in markTempCodeAsUsed: ' + error.toString());
  }
}

function checkCodeRequestLimit(email) {
  try {
    const logSheet = getDebugLogSheet();
    const data = logSheet.getDataRange().getValues();
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    let requestCount = 0;
    
    for(let i = 1; i < data.length; i++) {
      const row = data[i];
      const timestamp = row[0] ? new Date(row[0]) : null;
      const rowEmail = row[1]?.toString().toLowerCase() || '';
      const action = row[2]?.toString() || '';
      
      if(timestamp && timestamp > oneHourAgo && 
         rowEmail === email.toLowerCase() && 
         action === 'RICHIESTA_CODICE') {
        requestCount++;
      }
    }
    
    if(requestCount >= SECURITY_CONFIG.MAX_CODE_REQUESTS) {
      return {
        allowed: false,
        message: `Troppe richieste di codice. Riprova tra un'ora.`
      };
    }
    
    return {allowed: true};
    
  } catch(error) {
    Logger.log('Errore in checkCodeRequestLimit: ' + error.toString());
    return {allowed: true};
  }
}

function sendClientCode(email) {
  try {
    if (!email || typeof email !== 'string') {
      return {success: false, message: "Email non valida"};
    }
    
    const limitCheck = checkCodeRequestLimit(email);
    if (!limitCheck.allowed) {
      return {success: false, message: limitCheck.message};
    }
    
    const clientInfo = findClientByEmail(email);
    
    if(!clientInfo) {
      return {success: false, message: "Email non trovata nel sistema"};
    }
    
    const clientRow = clientInfo.row;
    const originalCode = clientRow[0]?.toString() || '';
    const cognome = clientRow[1] || '';
    const nome = clientRow[2] || '';
    
    if(!originalCode) {
      return {success: false, message: "ID cliente non trovato"};
    }
    
    const tempCode = generateTempCode(originalCode);
    saveTempCode(email, originalCode, tempCode);
    
    try {
      const subject = 'LIFT Pisa - Il tuo codice di accesso temporaneo';
      const body = `
Ciao ${nome} ${cognome},

Ecco il tuo codice di accesso TEMPORANEO per il sistema di prenotazione LIFT Pisa:

🔑 CODICE: ${tempCode}

⏰ VALIDITÀ: ${SECURITY_CONFIG.TEMP_CODE_VALIDITY_HOURS} ore dalla ricezione di questa email

Per accedere:
1. Vai alla pagina di prenotazione
2. Inserisci la tua email: ${email}
3. Inserisci il codice: ${tempCode}

Buon allenamento!
Team LIFT Pisa`;
      
      MailApp.sendEmail({
        to: email,
        subject: subject,
        body: body
      });
      
      logDebug(email, 'RICHIESTA_CODICE', 'SUCCESSO', 'Codice: ' + tempCode);
      
      return {
        success: true, 
        message: `Codice temporaneo inviato via email! Valido per ${SECURITY_CONFIG.TEMP_CODE_VALIDITY_HOURS} ore.`
      };
      
    } catch(emailError) {
      return {success: false, message: "Errore nell'invio dell'email. Riprova più tardi."};
    }
    
  } catch(error) {
    Logger.log('ERRORE in sendClientCode: ' + error.toString());
    return {success: false, message: "Errore del server"};
  }
}

// Funzioni helper (invariate)
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function getNextSlotDate(dayName, slotTime) {
  const days = { "Domenica": 0, "Lunedì": 1, "Martedì": 2, "Mercoledì": 3, "Giovedì": 4, "Venerdì": 5, "Sabato": 6 };
  const today = new Date();
  const todayDay = today.getDay();
  const slotDay = days[dayName];
  
  let diff = slotDay - todayDay;
  if (diff < 0) diff += 7;

  const currentHour = today.getHours();
  const slotHour = parseInt(slotTime.split(':')[0]);
  
  if (diff === 0 && currentHour >= (slotHour - 2)) {
    diff += 7;
  }

  if (todayDay === 0) {
    if (diff === 0) diff = 7;
  }

  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate;
}

function formatDate(date) {
  if(!date) return '';
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return day + '/' + month + '/' + year;
}

function formatBookingDate(date) {
  if(!date) return '';
  const giorni = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const mesi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 
               'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  
  const dayName = giorni[date.getDay()];
  const day = date.getDate();
  const month = mesi[date.getMonth()];
  
  return dayName + ' ' + day + ' ' + month;
}

function formatDateForComparison(date) {
  if(!date) return '';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function parseDateItalian(dateString) {
  if(!dateString) return null;
  const str = dateString.toString().trim();
  if(str instanceof Date) return str;
  if(str.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const parts = str.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(str);
}

function getActiveCommunications() {
  try {
    const sm = new SpreadsheetManager();
    const commData = sm.getCachedData('Comunicazioni');
    
    if(!commData || commData.length <= 1) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeCommunications = [];
    
    for(let i = 1; i < commData.length; i++) {
      const row = commData[i];
      const attivo = row[5] === true || row[5] === 'TRUE';
      
      if(!attivo) continue;
      if(!row[1] || !row[2]) continue;
      
      let isInDateRange = true;
      if(row[3]) {
        const dataInizio = new Date(row[3]);
        dataInizio.setHours(0, 0, 0, 0);
        if(today < dataInizio) isInDateRange = false;
      }
      
      if(row[4] && isInDateRange) {
        const dataFine = new Date(row[4]);
        dataFine.setHours(0, 0, 0, 0);
        if(today > dataFine) isInDateRange = false;
      }
      
      if(isInDateRange) {
        activeCommunications.push({
          id: row[0],
          titolo: row[1],
          messaggio: row[2],
          tipo: row[6] || 'info'
        });
      }
    }
    
    return activeCommunications;
    
  } catch(error) {
    Logger.log('Errore in getActiveCommunications: ' + error.toString());
    return [];
  }
}

function getAppUpdateInfo() {
  try {
    const sm = new SpreadsheetManager();
    const updateData = sm.getCachedData('aggiornamenti_app');
    
    if(!updateData || updateData.length <= 1) {
      return { success: true, updateAvailable: false, latestVersion: null };
    }
    
    const updateInfo = updateData[1];
    const latestVersion = updateInfo[0]?.toString().trim() || '';
    const expoLink = updateInfo[1]?.toString().trim() || '';
    const message = updateInfo[2]?.toString().trim() || 'Aggiornamento disponibile';
    const mandatory = updateInfo[3]?.toString().toLowerCase() === 'si';
    
    if (!latestVersion || !expoLink) {
      return { success: true, updateAvailable: false, latestVersion: null };
    }
    
    return {
      success: true,
      updateAvailable: true,
      latestVersion: latestVersion,
      expoLink: expoLink,
      message: message,
      mandatory: mandatory
    };
    
  } catch(error) {
    return { success: false, updateAvailable: false, latestVersion: null };
  }
}

function getPaymentLink(email) {
  try {
    const clientInfo = findClientByEmail(email);
    
    if(!clientInfo) {
      return { success: false, hasPayment: false, message: 'Utente non trovato' };
    }
    
    const paymentLink = clientInfo.row[25]?.toString().trim() || '';
    
    if (paymentLink && paymentLink.startsWith('http')) {
      return {
        success: true,
        hasPayment: true,
        paymentLink: paymentLink,
        message: 'Link pagamento disponibile'
      };
    }
    
    return {
      success: true,
      hasPayment: false,
      message: 'Nessun pagamento pendente'
    };
    
  } catch (error) {
    Logger.log('Errore in getPaymentLink: ' + error.toString());
    return { success: false, hasPayment: false, message: 'Errore server' };
  }
}

function doGet(e) {
  Logger.log('doGet chiamato con parametri: ' + JSON.stringify(e.parameter));
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    let result = {};
    
    if (e && e.parameter && e.parameter.action) {
      const action = e.parameter.action;
      
      switch(action) {
        case "getAvailableSlots":
          result = getAvailableSlots();
          break;
          
        case "sendClientCode":
          result = sendClientCode(e.parameter.email);
          break;
          
        case "getClientDataWithBookings":
          result = getClientDataWithBookings(
            e.parameter.email,
            e.parameter.clientId || e.parameter.code
          );
          break;
          
        case "bookSlot":
          result = bookSlot(
            e.parameter.email, 
            e.parameter.slotId, 
            e.parameter.clientId || e.parameter.code
          );
          break;
          
        case "cancelBooking":
          result = cancelBooking(
            e.parameter.bookingId, 
            e.parameter.email
          );
          break;

        case "getCommunications":
          result = getActiveCommunications();
          break;

        case "getAppUpdateInfo":
          result = getAppUpdateInfo();
          break;

        case "getPaymentLink":
          result = getPaymentLink(e.parameter.email);
          break;
          
        default:
          result = {error: "Azione non valida: " + action};
      }
    } else {
      result = {
        status: 'ok', 
        message: 'API Sistema Prenotazione attiva',
        version: '2.4-PERFORMANCE',
        timestamp: new Date().toISOString()
      };
    }
    
    // ⚡ Flush logs prima di ritornare
    flushLogs();
    
    return createCorsResponse(result);
    
  } catch (error) {
    Logger.log('ERRORE CRITICO in handleRequest: ' + error.toString());
    return createCorsResponse({
      error: "Errore interno del server",
      details: error.toString()
    });
  }
}

function createCorsResponse(data) {
  const jsonString = JSON.stringify(data);
  const output = ContentService.createTextOutput(jsonString);
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// Pulizie periodiche (invariate ma con cache invalidation)
function cleanupOldBookings() {
  try {
    const sm = new SpreadsheetManager();
    const prenSheet = sm.getSheet('Prenotazioni');
    if(!prenSheet) return {success: false, message: 'Foglio non trovato'};
    
    const data = prenSheet.getDataRange().getValues();
    if(data.length <= 1) return {success: true, message: 'Nessuna prenotazione'};
    
    const headers = data[0];
    const bookings = data.slice(1);
    
    const today = new Date();
    const currentWeek = getWeekNumber(today);
    const currentYear = today.getFullYear();
    const twoWeeksAgo = currentWeek - 2;
    
    const rowsToKeep = [];
    let deletedCount = 0;
    
    for(let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];
      
      if(booking.length >= 9 && booking[8]) {
        const bookingDate = new Date(booking[8]);
        const bookingWeek = getWeekNumber(bookingDate);
        const bookingYear = bookingDate.getFullYear();
        
        let shouldKeep = false;
        
        if(bookingYear > currentYear || 
           (bookingYear === currentYear && bookingWeek >= currentWeek)) {
          shouldKeep = true;
        }
        else if(bookingYear === currentYear && bookingWeek >= twoWeeksAgo) {
          shouldKeep = true;
        }
        
        if(shouldKeep) {
          rowsToKeep.push(booking);
        } else {
          deletedCount++;
        }
      } else {
        rowsToKeep.push(booking);
      }
    }
    
    prenSheet.clear();
    prenSheet.appendRow(headers);
    
    if(rowsToKeep.length > 0) {
      const range = prenSheet.getRange(2, 1, rowsToKeep.length, headers.length);
      range.setValues(rowsToKeep);
    }
    
    // ⚡ Invalida cache dopo pulizia
    sm.invalidateCache('Prenotazioni');
    
    return {
      success: true, 
      message: 'Pulizia completata',
      deleted: deletedCount,
      kept: rowsToKeep.length
    };
    
  } catch(error) {
    return {success: false, message: error.toString()};
  }
}

function cleanupExpiredTempCodes() {
  try {
    const tempSheet = getTempCodesSheet();
    const data = tempSheet.getDataRange().getValues();
    
    if(data.length <= 1) {
      return {success: true, message: 'Nessun codice da pulire'};
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    const now = new Date();
    
    const rowsToKeep = [];
    let deletedCount = 0;
    
    for(let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const expiry = row[4] ? new Date(row[4]) : null;
      
      if(expiry && expiry > now) {
        rowsToKeep.push(row);
      } else {
        deletedCount++;
      }
    }
    
    tempSheet.clear();
    tempSheet.appendRow(headers);
    
    if(rowsToKeep.length > 0) {
      const range = tempSheet.getRange(2, 1, rowsToKeep.length, headers.length);
      range.setValues(rowsToKeep);
    }
    
    return {
      success: true,
      message: 'Pulizia completata',
      deleted: deletedCount,
      kept: rowsToKeep.length
    };
    
  } catch(error) {
    return {success: false, message: error.toString()};
  }
}

function cleanupOldDebugLogs(daysToKeep = 30) {
  try {
    const logSheet = getDebugLogSheet();
    const data = logSheet.getDataRange().getValues();
    
    if(data.length <= 1) {
      return {success: true, message: 'Nessun log da pulire'};
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const rowsToKeep = [];
    let deletedCount = 0;
    
    for(let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const logDate = row[0] ? new Date(row[0]) : null;
      
      if(logDate && logDate > cutoffDate) {
        rowsToKeep.push(row);
      } else {
        deletedCount++;
      }
    }
    
    logSheet.clear();
    logSheet.appendRow(headers);
    
    if(rowsToKeep.length > 0) {
      const range = logSheet.getRange(2, 1, rowsToKeep.length, headers.length);
      range.setValues(rowsToKeep);
    }
    
    return {
      success: true,
      message: `Logs più vecchi di ${daysToKeep} giorni eliminati`,
      deleted: deletedCount,
      kept: rowsToKeep.length
    };
    
  } catch(error) {
    return {success: false, message: error.toString()};
  }
}