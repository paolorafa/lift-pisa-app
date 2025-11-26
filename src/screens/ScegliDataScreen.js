import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  Alert, 
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../styles/theme';

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
          textColor: colors.textTertiary
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            Scegli la Data
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Contenuto scorrevole */}
        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Istruzioni */}
          <View style={styles.instructionBox}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.instructionText} numberOfLines={2}>
              Seleziona la data in cui vuoi allenarti
            </Text>
          </View>

          {/* Calendario */}
          <View style={styles.calendarContainer}>
            <Calendar
              current={new Date().toISOString().split('T')[0]}
              minDate={new Date().toISOString().split('T')[0]}
              maxDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              onDayPress={handleDayPress}
              markedDates={getDateAvailability()}
              theme={{
                backgroundColor: colors.background,
                calendarBackground: colors.background,
                textSectionTitleColor: colors.textSecondary,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: colors.textPrimary,
                todayTextColor: colors.primary,
                dayTextColor: colors.textPrimary,
                textDisabledColor: colors.textTertiary,
                dotColor: colors.primary,
                selectedDotColor: colors.textPrimary,
                arrowColor: colors.primary,
                monthTextColor: colors.textPrimary,
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
          </View>

          {/* Data selezionata */}
          {selected && (
            <View style={styles.selectedBox}>
              <Ionicons name="calendar" size={24} color={colors.primary} />
              <Text style={styles.selectedText} numberOfLines={1}>
                {new Date(selected).toLocaleDateString('it-IT', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
              </Text>
            </View>
          )}

          {/* Legenda */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendText}>Giorno selezionato</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.textTertiary }]} />
              <Text style={styles.legendText}>Non disponibile</Text>
            </View>
          </View>

          {/* Spazio per il bottone fisso - ADATTIVO */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* ⚡ BOTTONE FISSO IN BASSO - Ultra compatibile */}
        <View style={styles.fixedBottomContainer}>
          <TouchableOpacity 
            style={[styles.button, !selected && styles.buttonDisabled]} 
            onPress={handleContinue}
            disabled={!selected}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText} numberOfLines={1}>
              Continua
            </Text>
            <Ionicons name="arrow-forward" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? spacing.md : spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    minHeight: 60, // Altezza minima garantita
  },
  backButton: {
    padding: spacing.xs,
    minWidth: 44, // Dimensione minima touch target
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  headerSpacer: {
    width: 44, // Simmetria con back button
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 120, // Spazio extra per il bottone fisso
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 157, 255, 0.1)',
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    minHeight: 60, // Altezza minima
  },
  instructionText: {
    ...typography.body,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  calendarContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    minHeight: 350, // Altezza minima calendario
  },
  calendar: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
  },
  selectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    minHeight: 60,
  },
  selectedText: {
    ...typography.h3,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    textTransform: 'capitalize',
    flex: 1,
  },
  // ⚡ BOTTONE FISSO - Ultra compatibile
  fixedBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg * 1.5, // Extra per Android
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    minHeight: 90, // Altezza minima garantita
  },
  button: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    minHeight: 56, // Altezza minima per accessibilità
  },
  buttonDisabled: {
    backgroundColor: colors.buttonDisabled,
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonText: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: 'bold',
    marginRight: spacing.sm,
    flex: 1,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap', // Si adatta su schermi piccoli
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  legendText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  bottomSpacer: {
    height: Platform.OS === 'ios' ? 20 : 30, // Spazio extra adattivo
  },
});