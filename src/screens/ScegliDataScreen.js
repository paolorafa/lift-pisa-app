import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/theme';

// Configurazione italiana
LocaleConfig.locales['it'] = {
  monthNames: [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ],
  monthNamesShort: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
  dayNames: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'],
  today: 'Oggi'
};
LocaleConfig.defaultLocale = 'it';

export default function ScegliDataScreen({ navigation }) {
  const [selected, setSelected] = useState('');

  // Calcola date disponibili (prossimi 30 giorni, escluse domeniche)
  const getDateAvailability = () => {
    const markedDates = {};
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dateString = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      
      // Escludi domenica (0)
      if (dayOfWeek !== 0) {
        markedDates[dateString] = {
          disabled: false,
          disableTouchEvent: false
        };
      } else {
        markedDates[dateString] = {
          disabled: true,
          disableTouchEvent: true,
          textColor: '#d9d9d9'
        };
      }
    }
    
    // Aggiungi selezione se c'è
    if (selected) {
      markedDates[selected] = {
        ...markedDates[selected],
        selected: true,
        selectedColor: colors.primary
      };
    }
    
    return markedDates;
  };

  const handleDayPress = (day) => {
    const selectedDate = new Date(day.dateString);
    const dayOfWeek = selectedDate.getDay();
    
    // Controlla se è domenica
    if (dayOfWeek === 0) {
      Alert.alert('Giorno non disponibile', 'La palestra è chiusa la domenica');
      return;
    }
    
    setSelected(day.dateString);
  };

  const handleContinue = () => {
    if (!selected) {
      Alert.alert('Attenzione', 'Seleziona una data prima di continuare');
      return;
    }
    
    // Converti data in giorno della settimana
    const selectedDate = new Date(selected);
    const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const giornoSettimana = giorni[selectedDate.getDay()];
    
    // Formatta data per visualizzazione
    const dataFormattata = selectedDate.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    // Naviga a ScegliSlotScreen passando sia data che giorno
    navigation.navigate('ScegliSlot', {
      giorno: giornoSettimana,
      data: selected,
      dataFormattata: dataFormattata
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Scegli la Data</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Istruzioni */}
      <View style={styles.instructionBox}>
        <Ionicons name="information-circle" size={20} color={colors.primary} />
        <Text style={styles.instructionText}>
          Seleziona la data in cui vuoi allenarti
        </Text>
      </View>

      {/* Calendario */}
      <Calendar
        current={new Date().toISOString().split('T')[0]}
        minDate={new Date().toISOString().split('T')[0]}
        maxDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
        onDayPress={handleDayPress}
        markedDates={getDateAvailability()}
        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#666',
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: '#ffffff',
          todayTextColor: colors.primary,
          dayTextColor: '#333',
          textDisabledColor: '#d9d9d9',
          dotColor: colors.primary,
          selectedDotColor: '#ffffff',
          arrowColor: colors.primary,
          monthTextColor: '#333',
          textDayFontFamily: 'System',
          textMonthFontFamily: 'System',
          textDayHeaderFontFamily: 'System',
          textDayFontWeight: '400',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 14
        }}
        style={styles.calendar}
      />

      {/* Data selezionata */}
      {selected && (
        <View style={styles.selectedBox}>
          <Ionicons name="calendar" size={24} color={colors.primary} />
          <Text style={styles.selectedText}>
            {new Date(selected).toLocaleDateString('it-IT', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </Text>
        </View>
      )}

      {/* Bottone Continua */}
      <TouchableOpacity 
        style={[styles.button, !selected && styles.buttonDisabled]} 
        onPress={handleContinue}
        disabled={!selected}
      >
        <Text style={styles.buttonText}>Continua</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>

      {/* Legenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Giorno selezionato</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#d9d9d9' }]} />
          <Text style={styles.legendText}>Non disponibile</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 157, 255, 0.1)',
    padding: 15,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  calendar: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  selectedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
    textTransform: 'capitalize',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: 18,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    paddingBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});