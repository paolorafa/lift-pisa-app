// ========================================
// LIFT PRENOTAZIONI - GOOGLE APPS SCRIPT
// Versione 2.3 - SICUREZZA SEMPLIFICATA + DEBUG
// ========================================

// === CONFIGURAZIONE ===
const SECURITY_CONFIG = {
  MAX_CODE_REQUESTS: 30,            // Max richieste codice in 1 ora
  CODE_REQUEST_LOCKOUT_MINUTES: 60, // Blocco richieste codice per 1 ora
  TEMP_CODE_VALIDITY_HOURS: 24,   
  ADMIN_EMAIL: 'pisalift@gmail.com'
};

// Classe di utilità per gestire il foglio di calcolo
class SpreadsheetManager {
  constructor() {
    this.ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!this.ss) {
      this.ss = SpreadsheetApp.openById('1Sx_dwJLtM3kWfrw1Z3IXWdEMD0_1YJU2c1heVuJjkRA');
    }
  }
  
  getSheet(name = null) {
    return name ? this.ss.getSheetByName(name) : this.ss.getSheets()[0];
  }
}

// ⭐ Ottieni o crea foglio LOG (solo per debug)
function getDebugLogSheet() {
  const sm = new SpreadsheetManager();
  let logSheet = sm.ss.getSheetByName('DebugLogs');
  
  if (!logSheet) {
    logSheet = sm.ss.insertSheet('DebugLogs');
    logSheet.appendRow([
      'Timestamp', 'Email', 'Azione', 'Risultato', 'Dettagli'
    ]);
    Logger.log('✅ Creato foglio DebugLogs');
  }
  
  return logSheet;
}

// ⭐ Log per debug (non blocca mai)
function logDebug(email, action, result, details = '') {
  try {
    const logSheet = getDebugLogSheet();
    const now = new Date();
    
    logSheet.appendRow([
      now,
      email,
      action,
      result,
      details
    ]);
    
    Logger.log(`[${action}] ${email} - ${result}: ${details}`);
    
  } catch(error) {
    Logger.log('Errore in logDebug: ' + error.toString());
  }
}

// Ottieni o crea foglio codici temporanei
function getTempCodesSheet() {
  const sm = new SpreadsheetManager();
  let tempSheet = sm.ss.getSheetByName('CodiciTemporanei');
  
  if (!tempSheet) {
    tempSheet = sm.ss.insertSheet('CodiciTemporanei');
    tempSheet.appendRow([
      'Email', 'CodiceOriginale', 'CodiceTemporaneo', 
      'DataCreazione', 'Scadenza', 'Utilizzato'
    ]);
    Logger.log('✅ Creato foglio CodiciTemporanei');
  }
  
  return tempSheet;
}

// Genera codice temporaneo randomizzato
function generateTempCode(originalCode) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let tempCode = '';
  
  for(let i = 0; i < 8; i++) {
    tempCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return tempCode;
}

// Salva codice temporaneo
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
    
    Logger.log('✅ Codice temporaneo salvato: ' + tempCode + ' per ' + email);
    
    return true;
    
  } catch(error) {
    Logger.log('❌ Errore salvataggio codice temporaneo: ' + error.toString());
    return false;
  }
}

// ⭐ CORRETTO: Non marca come usato durante la verifica
function verifyTempCode(email, inputCode) {
  try {
    const tempSheet = getTempCodesSheet();
    const data = tempSheet.getDataRange().getValues();
    
    if(data.length <= 1) {
      Logger.log('❌ Nessun codice temporaneo nel foglio');
      return null;
    }
    
    const now = new Date();
    const emailLower = email.toLowerCase().trim();
    const codeLower = inputCode.toUpperCase().trim();
    
    Logger.log(`🔍 Cerco codice temp: ${codeLower} per email: ${emailLower}`);
    
    for(let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowEmail = row[0] ? row[0].toString().toLowerCase().trim() : '';
      const originalCode = row[1] ? row[1].toString().trim() : '';
      const tempCode = row[2] ? row[2].toString().trim() : '';
      const expiry = row[4] ? new Date(row[4]) : null;
      const used = row[5] || false;
      
      if(rowEmail === emailLower && tempCode === codeLower) {
        Logger.log(`✅ Codice trovato! Riga ${i}`);
        
        if(used) {
          Logger.log('⚠️ Codice già utilizzato');
          logDebug(email, 'VERIFY_TEMP_CODE', 'GIA_USATO', 'Codice: ' + codeLower);
          return null;
        }
        
        if(!expiry || expiry <= now) {
          Logger.log('⚠️ Codice scaduto: ' + (expiry ? expiry.toLocaleString() : 'no expiry'));
          logDebug(email, 'VERIFY_TEMP_CODE', 'SCADUTO', 'Scadenza: ' + expiry);
          return null;
        }
        
        Logger.log('✅ Codice temporaneo valido! Originale: ' + originalCode);
        logDebug(email, 'VERIFY_TEMP_CODE', 'VALIDO', 'TempCode: ' + codeLower + ' -> Original: ' + originalCode);
        
        // ⭐ NON marca come usato qui! Lo faremo dopo il login completo
        
        return originalCode;
      }
    }
    
    Logger.log('❌ Codice temporaneo non trovato');
    logDebug(email, 'VERIFY_TEMP_CODE', 'NON_TROVATO', 'Input: ' + codeLower);
    return null;
    
  } catch(error) {
    Logger.log('❌ Errore verifica codice temporaneo: ' + error.toString());
    return null;
  }
}

// ⭐ NUOVA FUNZIONE: Marca codice come usato DOPO login riuscito
function markTempCodeAsUsed(email, tempCode) {
  try {
    const tempSheet = getTempCodesSheet();
    const data = tempSheet.getDataRange().getValues();
    
    if(data.length <= 1) return;
    
    const emailLower = email.toLowerCase().trim();
    const codeLower = tempCode.toUpperCase().trim();
    
    for(let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowEmail = row[0] ? row[0].toString().toLowerCase().trim() : '';
      const rowTempCode = row[2] ? row[2].toString().trim() : '';
      
      if(rowEmail === emailLower && rowTempCode === codeLower) {
        tempSheet.getRange(i + 1, 6).setValue(true);
        Logger.log('✅ Codice temporaneo marcato come usato: ' + codeLower);
        logDebug(email, 'MARK_TEMP_CODE_USED', 'SUCCESSO', codeLower);
        return;
      }
    }
    
  } catch(error) {
    Logger.log('Errore in markTempCodeAsUsed: ' + error.toString());
  }
}

// Pulizia codici scaduti
function cleanupExpiredTempCodes() {
  try {
    const tempSheet = getTempCodesSheet();
    const data = tempSheet.getDataRange().getValues();
    
    if(data.length <= 1) {
      Logger.log('Nessun codice temporaneo da pulire');
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
    
    Logger.log('✅ Pulizia codici temporanei completata - Eliminati: ' + deletedCount);
    
    return {
      success: true,
      message: 'Pulizia completata',
      deleted: deletedCount,
      kept: rowsToKeep.length
    };
    
  } catch(error) {
    Logger.log('❌ Errore pulizia codici temporanei: ' + error.toString());
    return {success: false, message: error.toString()};
  }
}

// ⭐ SOLO per richieste codice - evita spam
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
      const rowEmail = row[1] ? row[1].toString().toLowerCase() : '';
      const action = row[2] ? row[2].toString() : '';
      
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
    return {allowed: true}; // In caso di errore, permetti
  }
}

// ⭐ Invia codice temporaneo (solo protezione spam)
function sendClientCode(email) {
  try {
    Logger.log('Richiesta codice per email: ' + email);
    
    if (!email || typeof email !== 'string') {
      logDebug(email, 'RICHIESTA_CODICE', 'ERRORE', 'Email non valida');
      return {success: false, message: "Email non valida"};
    }
    
    // ⭐ SOLO protezione spam per richieste codice
    const limitCheck = checkCodeRequestLimit(email);
    if (!limitCheck.allowed) {
      logDebug(email, 'RICHIESTA_CODICE', 'BLOCCATO_SPAM', limitCheck.message);
      return {
        success: false, 
        message: limitCheck.message
      };
    }
    
    const sm = new SpreadsheetManager();
    const sheet = sm.getSheet();
    
    if (!sheet) {
      return {success: false, message: "Database non disponibile"};
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return {success: false, message: "Database vuoto"};
    }
    
    let clientRow = null;
    
    for(let i = 1; i < data.length; i++) {
      const row = data[i];
      if(row[3] && row[3].toString().toLowerCase().trim() === email.toLowerCase().trim()) {
        clientRow = row;
        break;
      }
    }
    
    if(!clientRow) {
      logDebug(email, 'RICHIESTA_CODICE', 'NON_TROVATO', 'Email non nel database');
      return {
        success: false, 
        message: "Email non trovata nel sistema"
      };
    }
    
    const originalCode = clientRow[0] ? clientRow[0].toString() : '';
    const nome = clientRow[1] || '';
    const cognome = clientRow[2] || '';
    
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

⚠️ NOTA SICUREZZA: 
- Questo codice è valido SOLO per ${SECURITY_CONFIG.TEMP_CODE_VALIDITY_HOURS} ore
- Se non hai richiesto tu questo codice, contatta immediatamente la reception

Per accedere:
1. Vai alla pagina di prenotazione
2. Inserisci la tua email: ${email}
3. Inserisci il codice: ${tempCode}

Buon allenamento!
Team LIFT Pisa
      `;
      
      MailApp.sendEmail({
        to: email,
        subject: subject,
        body: body
      });
      
      logDebug(email, 'RICHIESTA_CODICE', 'SUCCESSO', 'Codice: ' + tempCode);
      
      Logger.log('✅ Email con codice temporaneo inviata a: ' + email);
      return {
        success: true, 
        message: `Codice temporaneo inviato via email! Valido per ${SECURITY_CONFIG.TEMP_CODE_VALIDITY_HOURS} ore.`
      };
      
    } catch(emailError) {
      Logger.log('❌ Errore invio email: ' + emailError.toString());
      logDebug(email, 'RICHIESTA_CODICE', 'ERRORE_EMAIL', emailError.toString());
      return {
        success: false, 
        message: "Errore nell'invio dell'email. Riprova più tardi."
      };
    }
    
  } catch(error) {
    Logger.log('❌ ERRORE in sendClientCode: ' + error.toString());
    return {
      success: false, 
      message: "Errore del server"
    };
  }
}

// ⭐ Verifica cliente (NO BLOCCHI, SOLO LOG)
function verificaCliente(email, clientId = null) {
  try {
    Logger.log('Verifica cliente per email: ' + email);
    
    if (!email || typeof email !== 'string') {
      logDebug(email, 'LOGIN', 'ERRORE', 'Email non valida');
      return {found: false, error: "Email non valida"};
    }
    
    const sm = new SpreadsheetManager();
    const sheet = sm.getSheet();
    
    if (!sheet) {
      Logger.log('ERRORE: Foglio non trovato');
      return {found: false, error: "Database non disponibile"};
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      Logger.log('ERRORE: Nessun dato nel foglio');
      return {found: false, error: "Database vuoto"};
    }
    
    const headers = data[0];
    let clientRow = null;
    let rowIndex = -1;
    
    for(let i = 1; i < data.length; i++) {
      const row = data[i];
      if(row[3] && row[3].toString().toLowerCase().trim() === email.toLowerCase().trim()) {
        clientRow = row;
        rowIndex = i + 1;
        break;
      }
    }
    
    if(!clientRow) {
      logDebug(email, 'LOGIN', 'NON_TROVATO', 'Cliente non esiste');
      return {
        found: false, 
        error: "Email non trovata nel sistema"
      };
    }
    
    // ⭐ VALIDAZIONE CODICE con tracking
    if(clientId) {
      const idFromSheet = clientRow[0] ? clientRow[0].toString().trim() : '';
      const idInput = clientId.toString().trim().toUpperCase();
      
      if(!idFromSheet) {
        logDebug(email, 'LOGIN', 'ERRORE', 'ID non presente nel DB');
        return {found: false, error: "ID cliente non presente nel database"};
      }
      
      let codeValid = false;
      let usedTempCode = null; // ⭐ NUOVO: Traccia quale codice temp è stato usato
      
      // Verifica codice originale
      if(idFromSheet === idInput) {
        codeValid = true;
        logDebug(email, 'LOGIN', 'SUCCESSO_ORIGINALE', 'Codice: ' + idInput);
      } else {
        // Verifica codice temporaneo
        const tempCodeOriginal = verifyTempCode(email, idInput);
        if(tempCodeOriginal && tempCodeOriginal === idFromSheet) {
          codeValid = true;
          usedTempCode = idInput; // ⭐ Salva il codice temp usato
          logDebug(email, 'LOGIN', 'SUCCESSO_TEMP', 'TempCode: ' + idInput);
        }
      }
      
      if(!codeValid) {
        logDebug(email, 'LOGIN', 'CODICE_ERRATO', 'Input: ' + idInput + ', Atteso: ' + idFromSheet);
        return {
          found: false, 
          error: "Codice non corretto o scaduto"
        };
      }
      
      // ⭐ NUOVO: Marca codice temp come usato SOLO dopo login riuscito
      if(usedTempCode) {
        markTempCodeAsUsed(email, usedTempCode);
      }
    }
    
    // ✅ LOGIN RIUSCITO - Costruisci dati cliente
    const paymentStatusRaw = clientRow[9] ? clientRow[9].toString().trim() : '';
    const isPaid = paymentStatusRaw.toLowerCase() === 'pagato';
    
    const clientData = {
      found: true,
      clientId: clientRow[0] || '',
      nome: clientRow[1] || '',
      cognome: clientRow[2] || '',
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
      isPaid: isPaid
    };
    
    // Validazione certificato
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
    } else {
      clientData.certificateExpired = true;
      clientData.certificateExpiryString = 'Non presente';
    }
    
    // Validazione ASI
    if(clientRow[18]) {
      try {
        const asiExpiryDate = new Date(clientRow[18]);
        
        if(isNaN(asiExpiryDate.getTime())) {
          clientData.asiExpired = true;
          clientData.asiExpiryString = 'Data non valida';
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          asiExpiryDate.setHours(0, 0, 0, 0);
          
          clientData.asiExpiryString = formatDate(asiExpiryDate);
          clientData.asiExpired = asiExpiryDate < today;
        }
      } catch(e) {
        clientData.asiExpired = true;
        clientData.asiExpiryString = 'Errore lettura data';
      }
    } else {
      clientData.asiExpired = true;
      clientData.asiExpiryString = 'Non presente';
    }
    
    const freqIndex = findFrequencyColumn(headers);
    clientData.frequenza = (freqIndex >= 0 && clientRow[freqIndex]) ? 
                          clientRow[freqIndex].toString() : "Open";
    
    if(!clientData.isBlocked && !clientData.certificateExpired && clientData.isPaid) {
      clientData.weeklyBookings = countWeeklyBookings(email, sm.ss);
    } else {
      clientData.weeklyBookings = 0;
    }
    
    logDebug(email, 'VERIFICA_COMPLETA', 'SUCCESSO', 
            'Pagato: ' + isPaid + ', Cert: ' + !clientData.certificateExpired);
    
    Logger.log('✅ Client data retrieved successfully for: ' + email);
    
    return clientData;
    
  } catch(error) {
    Logger.log('❌ ERRORE CRITICO in verificaCliente: ' + error.toString());
    logDebug(email, 'VERIFICA', 'ERRORE_CRITICO', error.toString());
    return {
      found: false, 
      error: "Errore interno del server"
    };
  }
}

// === RESTO DELLE FUNZIONI ===

function findFrequencyColumn(headers) {
  for(let h = 0; h < headers.length; h++) {
    const header = headers[h].toString().toLowerCase();
    if(header.includes('frequenza') && header.includes('abbonamento')) {
      return h;
    }
  }
  return -1;
}

function testConnection() {
  try {
    const sm = new SpreadsheetManager();
    const sheet = sm.getSheet();
    
    if (!sheet) {
      return {success: false, message: "Cannot access spreadsheet"};
    }
    
    const data = sheet.getDataRange().getValues();
    return {
      success: true,
      message: "Connection successful",
      rowCount: data.length,
      columnCount: data.length > 0 ? data[0].length : 0
    };
    
  } catch(error) {
    return {
      success: false,
      message: "Connection failed: " + error.message
    };
  }
}

function countWeeklyBookings(email, ss) {
  try {
    const prenSheet = ss.getSheetByName('Prenotazioni');
    if(!prenSheet) return 0;
    
    const prenData = prenSheet.getDataRange().getValues();
    if(prenData.length <= 1) return 0;
    
    prenData.shift();
    
    const today = new Date();
    const currentWeek = getWeekNumber(today);
    const currentYear = today.getFullYear();
    
    return prenData.filter(row => {
      if(!row[1] || row[1].toString().toLowerCase() !== email.toLowerCase()) return false;
      if(row.length < 9 || !row[8]) return false;
      
      try {
        const bookingDate = new Date(row[8]);
        if(isNaN(bookingDate.getTime())) return false;
        
        const bookingWeek = getWeekNumber(bookingDate);
        const bookingYear = bookingDate.getFullYear();
        
        return bookingYear === currentYear && bookingWeek === currentWeek;
      } catch(e) {
        return false;
      }
    }).length;
    
  } catch(error) {
    Logger.log('Errore in countWeeklyBookings: ' + error.toString());
    return 0;
  }
}

function getClientDataWithBookings(email, clientId = null) {
  try {
    Logger.log('getClientDataWithBookings chiamata per: ' + email);
    
    const clientData = verificaCliente(email, clientId);
    
    if(!clientData.found) {
      Logger.log('Cliente non trovato: ' + clientData.error);
      return JSON.parse(JSON.stringify(clientData));
    }
    
    if(clientData.isBlocked || clientData.certificateExpired || !clientData.isPaid) {
      Logger.log('Cliente bloccato, certificato scaduto o abbonamento non pagato');
      const result = {
        ...clientData,
        weeklyBookings: 0,
        bookings: [],
        totalBookings: 0
      };
      return JSON.parse(JSON.stringify(result));
    }
    
    Logger.log('Recupero prenotazioni per: ' + email);
    const bookings = getUserBookings(email);
    
    const result = {
      ...clientData,
      bookings: bookings.bookings || [],
      totalBookings: bookings.totalBookings || 0
    };
    
    const serializedResult = JSON.parse(JSON.stringify(result, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }));
    
    return serializedResult;
    
  } catch(error) {
    Logger.log('ERRORE in getClientDataWithBookings: ' + error.toString());
    return JSON.parse(JSON.stringify({
      found: false, 
      error: "Errore nel recupero dati: " + error.toString()
    }));
  }
}

function getAvailableSlots() {
  try {
    const sm = new SpreadsheetManager();
    const slotsSheet = sm.getSheet('SpaziOrari');
    const data = slotsSheet.getDataRange().getValues();
    data.shift();

    const slots = data.map(row => ({
      ID_Spazio: row[0],
      Giorno: row[1],
      Ora_Inizio: row[2],
      Ora_Fine: row[3],
      Descrizione: row[1] + " " + row[2] + "-" + row[3]
    }));

    const prenSheet = sm.getSheet('Prenotazioni');
    let prenData = [];
    if(prenSheet) {
      const allPrenData = prenSheet.getDataRange().getValues();
      if(allPrenData.length > 1) prenData = allPrenData.slice(1);
    }

    return filterAvailableSlotsWithCount(slots, prenData);
    
  } catch(error) {
    Logger.log('Errore in getAvailableSlots: ' + error.toString());
    return [];
  }
}

function filterAvailableSlotsWithCount(slots, prenData) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();
  const dayMap = { "Domenica":0, "Lunedì":1, "Martedì":2, "Mercoledì":3, "Giovedì":4, "Venerdì":5, "Sabato":6 };

  return slots.filter(slot => {
    const slotHour = parseInt(slot.Ora_Inizio.toString().split(':')[0]);
    const slotDay = dayMap[slot.Giorno];
    
    if(slotHour < 6 || slotHour >= 21) return false;
    if(currentHour >= 21) {
      if(slotHour < 7) return false;
    }
    
    if(slotDay === currentDay && currentHour >= (slotHour - 2)) return false;
    
    const slotDate = getNextSlotDate(slot.Giorno, slot.Ora_Inizio);
    const slotDateString = formatDateForComparison(slotDate);
    
    const count = prenData.filter(p => {
      if(p[4] !== slot.ID_Spazio) return false;
      
      if(p[8]) {
        try {
          const bookingDate = parseDateItalian(p[8]);
          const bookingDateString = formatDateForComparison(bookingDate);
          
          return bookingDateString === slotDateString;
        } catch(e) {
          return false;
        }
      }
      return false;
    }).length;
    
    const status = count >= 8 ? "COMPLETO" : "disponibile";
    slot.Descrizione = slot.Giorno + " " + slot.Ora_Inizio + "-" + slot.Ora_Fine + 
                      " (" + count + "/8 - " + status + " - " + formatBookingDate(slotDate) + ")";
    
    return count < 8;
  });
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

function formatDateForComparison(date) {
  if(!date) return '';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function checkDuplicateBooking(email, slotId, slot, sm) {
  try {
    const prenSheet = sm.getSheet('Prenotazioni');
    if(!prenSheet) return {allowed: true};
    
    const prenData = prenSheet.getDataRange().getValues();
    if(prenData.length <= 1) return {allowed: true};
    
    const slotDate = getNextSlotDate(slot[1], slot[2]);
    const slotDateString = formatDateForComparison(slotDate);
    const bookings = prenData.slice(1);
    
    for(let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];
      const bookingEmail = booking[1] ? booking[1].toString().toLowerCase().trim() : '';
      if(bookingEmail !== email.toLowerCase().trim()) continue;
      if(booking[4] != slotId) continue;
      
      if(booking[8]) {
        try {
          const bookingDate = parseDateItalian(booking[8]);
          const bookingDateString = formatDateForComparison(bookingDate);
          
          if(bookingDateString === slotDateString) {
            logDebug(email, 'PRENOTAZIONE', 'DUPLICATO', 'Slot: ' + slotId + ', Data: ' + slotDate.toLocaleDateString());
            return {
              allowed: false,
              message: '❌ Hai già prenotato questo slot per ' + formatBookingDate(slotDate) + 
                      '!\n\nNon puoi prenotare lo stesso orario due volte nella stessa data.'
            };
          }
        } catch(e) {
          Logger.log('Errore parsing data in checkDuplicateBooking: ' + e.toString());
        }
      }
    }
    
    return {allowed: true};
    
  } catch(error) {
    Logger.log('Errore in checkDuplicateBooking: ' + error.toString());
    return {allowed: true};
  }
}

function bookSlot(email, slotId, clientId = null) {
  try {
    logDebug(email, 'BOOK_START', 'INIZIO', 'Slot: ' + slotId);
    
    const clientData = verificaCliente(email, clientId);
    if(!clientData.found) {
      logDebug(email, 'BOOK_FAIL', 'CLIENTE_NON_TROVATO', clientData.error);
      return {success: false, message: clientData.error};
    }
    
    if(!clientData.isPaid) {
      logDebug(email, 'BOOK_FAIL', 'NON_PAGATO', 'Status: ' + clientData.paymentStatus);
      return {
        success: false, 
        message: "⚠️ Non puoi prenotare: abbonamento non pagato.\n\nContatta la reception."
      };
    }
    
    if(clientData.isBlocked) {
      logDebug(email, 'BOOK_FAIL', 'BLOCCATO', clientData.message);
      return {success: false, message: "Account bloccato: " + clientData.message};
    }
    
    if(clientData.certificateExpired) {
      logDebug(email, 'BOOK_FAIL', 'CERTIFICATO_SCADUTO', clientData.certificateExpiryString);
      return {success: false, message: "Certificato medico scaduto"};
    }
    
    const sm = new SpreadsheetManager();
    
    const slotValidation = validateSlot(slotId, sm);
    if(!slotValidation.valid) {
      logDebug(email, 'BOOK_FAIL', 'SLOT_NON_VALIDO', slotValidation.message);
      return {success: false, message: slotValidation.message};
    }
    
    const duplicateCheck = checkDuplicateBooking(email, slotId, slotValidation.slot, sm);
    if(!duplicateCheck.allowed) {
      return {success: false, message: duplicateCheck.message};
    }
    
    const frequencyCheck = checkFrequencyLimit(clientData);
    if(!frequencyCheck.allowed) {
      logDebug(email, 'BOOK_FAIL', 'LIMITE_FREQUENZA', frequencyCheck.message);
      return {success: false, message: frequencyCheck.message};
    }
    
    const finalCheck = validateSlotAvailability(slotValidation.slot, sm);
    if(!finalCheck.available) {
      logDebug(email, 'BOOK_FAIL', 'SLOT_PIENO', 'Count: ' + finalCheck.currentCount);
      return {success: false, message: "Slot completo. Riprova con un altro orario."};
    }
    
    const result = createBooking(clientData, slotValidation.slot, sm);
    
    if(result.success) {
      logDebug(email, 'BOOK_SUCCESS', 'COMPLETATA', result.message);
    }
    
    return result;
    
  } catch(error) {
    Logger.log('Errore in bookSlot: ' + error.toString());
    logDebug(email, 'BOOK_ERROR', 'ERRORE_CRITICO', error.toString());
    return {success: false, message: "Errore durante la prenotazione"};
  }
}

function validateSlot(slotId, sm) {
  const slotsSheet = sm.getSheet('SpaziOrari');
  const slotsData = slotsSheet.getDataRange().getValues();
  slotsData.shift();

  const slot = slotsData.find(r => r[0] == slotId);
  if(!slot) return {valid: false, message: "Slot non trovato"};

  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();
  const slotHour = parseInt(slot[2].toString().split(':')[0]);
  
  if(slotHour < 6 || slotHour >= 21) {
    return {valid: false, message: "Slot non in orario prenotabile"};
  }
  
  const dayMap = { "Domenica":0, "Lunedì":1, "Martedì":2, "Mercoledì":3, "Giovedì":4, "Venerdì":5, "Sabato":6 };
  const slotDay = dayMap[slot[1]];
  
  if(slotDay === currentDay && currentHour >= (slotHour - 2)) {
    return {valid: false, message: "Devi prenotare almeno 2 ore prima"};
  }

  const slotDate = getNextSlotDate(slot[1], slot[2]);
  const slotDateString = formatDateForComparison(slotDate);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const slotDateOnly = new Date(slotDate);
  slotDateOnly.setHours(0, 0, 0, 0);
  
  if(slotDateOnly < today) {
    return {valid: false, message: "Non puoi prenotare un giorno passato"};
  }

  if(currentHour >= 21) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const tomorrowDateString = formatDateForComparison(tomorrow);
    
    if(slotDateString === tomorrowDateString && slotHour < 7) {
      return {valid: false, message: "Dopo le 21:00 puoi prenotare solo da slot alle 7:00 in poi"};
    }
  }

  const prenSheet = sm.getSheet('Prenotazioni');
  if(prenSheet) {
    const prenData = prenSheet.getDataRange().getValues();
    if(prenData.length > 1) {
      const bookings = prenData.slice(1);
      
      const count = bookings.filter(r => {
        if(r[4] != slotId) return false;
        if(r[8]) {
          try {
            const bookingDate = parseDateItalian(r[8]);
            const bookingDateString = formatDateForComparison(bookingDate);
            const slotDateCompare = formatDateForComparison(slotDate);
            
            return bookingDateString === slotDateCompare;
          } catch(e) {
            return false;
          }
        }
        return false;
      }).length;
      
      if(count >= 8) {
        return {valid: false, message: "❌ SLOT COMPLETO per " + formatBookingDate(slotDate)};
      }
    }
  }

  return {valid: true, slot: slot};
}

function validateSlotAvailability(slot, sm) {
  const slotDate = getNextSlotDate(slot[1], slot[2]);
  slotDate.setHours(0, 0, 0, 0);

  const prenSheet = sm.getSheet('Prenotazioni');
  if(!prenSheet) return {available: false};

  const prenData = prenSheet.getDataRange().getValues();
  if(prenData.length <= 1) return {available: true};

  const bookings = prenData.slice(1);
  const count = bookings.filter(r => {
    if(r[4] != slot[0]) return false;
    if(r[8]) {
      const bookingDate = new Date(r[8]);
      bookingDate.setHours(0, 0, 0, 0);
      return bookingDate.getTime() === slotDate.getTime();
    }
    return false;
  }).length;

  return {available: count < 8, currentCount: count};
}

function checkFrequencyLimit(clientData) {
  const freq = clientData.frequenza || "Open";
  if(freq === "Open") return {allowed: true};
  
  const maxBookings = parseInt(freq);
  if(isNaN(maxBookings)) return {allowed: true};
  
  if(clientData.weeklyBookings >= maxBookings) {
    return {
      allowed: false, 
      message: `Limite raggiunto: ${maxBookings} prenotazioni/settimana`
    };
  }
  
  return {allowed: true};
}

function createBooking(clientData, slot, sm) {
  const prenSheet = sm.getSheet('Prenotazioni') || sm.ss.insertSheet('Prenotazioni');
  
  const data = prenSheet.getDataRange().getValues();
  if(data.length === 0) {
    prenSheet.appendRow(['ID_Prenotazione','Email','Nome','Cognome','ID_Spazio','Giorno','Ora_Inizio','Ora_Fine','Data_Prenotazione']);
  }

  const slotDate = getNextSlotDate(slot[1], slot[2]);
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
  
  return {
    success: true, 
    message: `Prenotazione completata: ${slot[1]} ${slot[2]}-${slot[3]}`
  };
}

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

function getUserBookings(email) {
  try {
    const sm = new SpreadsheetManager();
    const prenSheet = sm.getSheet('Prenotazioni');
    
    if(!prenSheet) {
      return {success: true, bookings: [], totalBookings: 0};
    }
    
    const data = prenSheet.getDataRange().getValues();
    if(data.length <= 1) {
      return {success: true, bookings: [], totalBookings: 0};
    }
    
    const allBookings = data.slice(1);
    const today = new Date();
    const currentWeek = getWeekNumber(today);
    const currentYear = today.getFullYear();
    
    const userBookings = [];
    
    for(let i = 0; i < allBookings.length; i++) {
      const booking = allBookings[i];
      
      if(booking[1] && booking[1].toString().toLowerCase() === email.toLowerCase()) {
        if(booking.length >= 9 && booking[8]) {
          try {
            const bookingDate = new Date(booking[8]);
            if(isNaN(bookingDate.getTime())) continue;
            
            const bookingWeek = getWeekNumber(bookingDate);
            const bookingYear = bookingDate.getFullYear();
            
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
                slotDescription: booking[5] + " " + booking[6] + "-" + booking[7] + " (" + formatBookingDate(bookingDate) + ")"
              });
            }
          } catch(e) {
            continue;
          }
        }
      }
    }
    
    userBookings.sort((a, b) => new Date(a.dataPrenotazione) - new Date(b.dataPrenotazione));
    
    return {
      success: true, 
      bookings: userBookings, 
      totalBookings: userBookings.length
    };
    
  } catch(error) {
    Logger.log('ERRORE in getUserBookings: ' + error.toString());
    return {
      success: false, 
      bookings: [], 
      totalBookings: 0
    };
  }
}

function cancelBooking(bookingId, userEmail) {
  try {
    const sm = new SpreadsheetManager();
    const prenSheet = sm.getSheet('Prenotazioni');
    if(!prenSheet) {
      return {success: false, message: 'Foglio prenotazioni non trovato'};
    }
    
    const data = prenSheet.getDataRange().getValues();
    if(data.length <= 1) {
      return {success: false, message: 'Nessuna prenotazione trovata'};
    }
    
    const bookings = data.slice(1);
    
    let bookingFound = false;
    let bookingDetails = null;
    let rowToDelete = -1;
    
    for(let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];
      
      if(booking[0] === bookingId && 
         booking[1] && booking[1].toString().toLowerCase() === userEmail.toLowerCase()) {
        
        bookingFound = true;
        rowToDelete = i + 2;
        
        bookingDetails = {
          giorno: booking[5],
          oraInizio: booking[6],
          oraFine: booking[7],
          dataPrenotazione: booking[8] ? new Date(booking[8]) : null
        };
        break;
      }
    }
    
    if(!bookingFound) {
      return {success: false, message: 'Prenotazione non trovata'};
    }
    
    if(bookingDetails.dataPrenotazione) {
      const now = new Date();
      const slotDateTime = new Date(bookingDetails.dataPrenotazione);
      
      const timeStr = bookingDetails.oraInizio.toString();
      const timeParts = timeStr.split(':');
      const slotHour = parseInt(timeParts[0]);
      const slotMinute = timeParts.length > 1 ? parseInt(timeParts[1]) : 0;
      
      slotDateTime.setHours(slotHour, slotMinute, 0, 0);
      
      const diffMs = slotDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      if(diffMs < 0) {
        return {success: false, message: 'Non puoi cancellare prenotazioni passate'};
      }
      
      if(diffHours < 5) {
        const oreRestanti = Math.floor(diffHours);
        const minutiRestanti = Math.floor((diffHours - oreRestanti) * 60);
        return {
          success: false, 
          message: `Devi cancellare almeno 5 ore prima. Mancano ${oreRestanti}h ${minutiRestanti}min.`
        };
      }
    }
    
    prenSheet.deleteRow(rowToDelete);
    
    logDebug(userEmail, 'CANCEL', 'SUCCESSO', 'Booking: ' + bookingId);
    
    let message = 'Prenotazione cancellata: ' + 
                  bookingDetails.giorno + ' ' + 
                  bookingDetails.oraInizio + '-' + bookingDetails.oraFine;
    
    if(bookingDetails.dataPrenotazione) {
      message += ' (' + formatBookingDate(bookingDetails.dataPrenotazione) + ')';
    }
    
    return {success: true, message: message};
    
  } catch(error) {
    Logger.log('Errore in cancelBooking: ' + error.toString());
    return {success: false, message: 'Errore durante la cancellazione'};
  }
}

function cleanupOldBookings() {
  try {
    const sm = new SpreadsheetManager();
    const prenSheet = sm.getSheet('Prenotazioni');
    if(!prenSheet) {
      return {success: false, message: 'Foglio Prenotazioni non trovato'};
    }
    
    const data = prenSheet.getDataRange().getValues();
    if(data.length <= 1) {
      return {success: true, message: 'Nessuna prenotazione da pulire'};
    }
    
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
        else if(bookingYear === (currentYear - 1) && currentWeek < 3) {
          const weeksInPreviousYear = getWeekNumber(new Date(bookingYear, 11, 31));
          if(bookingWeek >= (weeksInPreviousYear - (2 - currentWeek))) {
            shouldKeep = true;
          }
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
    
    return {
      success: true, 
      message: 'Pulizia completata',
      deleted: deletedCount,
      kept: rowsToKeep.length
    };
    
  } catch(error) {
    Logger.log('Errore in cleanupOldBookings: ' + error.toString());
    return {success: false, message: error.toString()};
  }
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
          
        default:
          result = {error: "Azione non valida: " + action};
      }
    } else {
      result = {
        status: 'ok', 
        message: 'API Sistema Prenotazione attiva',
        version: '2.3-SIMPLE-DEBUG',
        timestamp: new Date().toISOString()
      };
    }
    
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