import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useEffect, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { borderRadius, colors, spacing, typography } from '../styles/theme';

export default function SlotsScreen({ navigation, route }) {
  const { giorno, data, dataFormattata } = route.params || {};
  
  const { 
    slots, 
    loading, 
    loadSlots, 
    bookSlot: contextBookSlot 
  } = useApp();
  
  const [filteredSlots, setFilteredSlots] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [booking, setBooking] = useState(null);

  // ⚡ CARICA SLOTS SOLO SE NECESSARIO
  useFocusEffect(
    useCallback(() => {
      console.log('📅 SlotsScreen focused');
      
      // Carica solo se vuoti
      if (slots.length === 0 && !loading.slots) {
        loadSlots();
      }
    }, []) // Empty deps
  );

  // Filtra slots quando cambiano data o slots
  useEffect(() => {
    if (giorno && slots.length > 0) {
      filterSlotsByDay();
    }
  }, [giorno, slots]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSlots(true); // Force refresh
    setRefreshing(false);
  };

  // ⚡ MEMOIZZATO - Estrae data dalla descrizione
  const extractDateFromDescription = useCallback((description) => {
    const dateMatch = description.match(/\((.*?)\)/);
    return dateMatch ? dateMatch[1] : 'Data non disponibile';
  }, []);

  // ⚡ MEMOIZZATO - Estrae info slot
  const extractSlotInfo = useCallback((description) => {
    const countMatch = description.match(/(\d+)\/8/);
    const currentCount = countMatch ? parseInt(countMatch[1]) : 0;
    const dateStr = extractDateFromDescription(description);
    
    return {
      currentCount,
      available: 8 - currentCount,
      date: dateStr
    };
  }, [extractDateFromDescription]);

  // ⚡ MEMOIZZATO - Filtra slot per giorno
  const filterSlotsByDay = useCallback(() => {
    if (!giorno) {
      setFilteredSlots(slots);
      return;
    }
    
    const today = new Date();
    const isToday = data === today.toISOString().split("T")[0];

    const filtered = slots
      .filter(slot => slot.Giorno === giorno)
      .filter(slot => {
        if (!isToday) return true;

        const nowMinutes = today.getHours() * 60 + today.getMinutes();
        const [startHour, startMin] = slot.Ora_Inizio.split(":").map(Number);
        const slotMinutes = startHour * 60 + startMin;

        if (slotMinutes < nowMinutes) {
          return false;
        }

        const minAllowedMinutes = nowMinutes + 120;
        return slotMinutes >= minAllowedMinutes;
      });

    setFilteredSlots(filtered);
  }, [giorno, slots, data]);

  const handleBookSlot = useCallback((slot) => {
    const slotInfo = extractSlotInfo(slot.Descrizione);
    
    Alert.alert(
      'Conferma Prenotazione',
      `Vuoi prenotare per:\n📅 ${slotInfo.date}\n🕐 ${slot.Ora_Inizio} - ${slot.Ora_Fine}\n\nPosti disponibili: ${slotInfo.available}/8`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: () => confirmBooking(slot),
        },
      ]
    );
  }, [extractSlotInfo]);

  // 🚀 OPTIMISTIC UPDATE - Prenotazione istantanea
  const confirmBooking = async (slot) => {
    setBooking(slot.ID_Spazio);
    
    try {
      const { email, code } = await require('../services/api').default.getSavedCredentials();
      
      // 🚀 STEP 1: Mostra successo IMMEDIATAMENTE (Optimistic)
      setBooking(null);
      Alert.alert(
        'Prenotazione Confermata! ✅',
        'La tua prenotazione è stata registrata',
        [{ text: 'OK' }]
      );
      
      // 🚀 STEP 2: API call in BACKGROUND (non bloccante)
      contextBookSlot(email, code, slot.ID_Spazio, data)
        .then(result => {
          console.log('✅ Prenotazione completata in background');
          
          if (!result.success) {
            // ⚠️ Se fallisce, notifica l'utente
            Alert.alert(
              'Attenzione',
              result.message || 'C\'è stato un problema con la prenotazione. Controlla le tue prenotazioni.',
              [{ text: 'OK' }]
            );
          }
        })
        .catch(error => {
          console.error('❌ Errore prenotazione background:', error);
          Alert.alert(
            'Errore',
            'Si è verificato un problema. Controlla le tue prenotazioni per verificare.',
            [{ text: 'OK' }]
          );
        });
        
    } catch (error) {
      // Solo se fallisce PRIMA della chiamata API
      setBooking(null);
      Alert.alert('Errore', 'Impossibile effettuare la prenotazione. Riprova.');
    }
  };

  // ⚡ MEMOIZZATO - Calcola status slot
  const getSlotStatus = useCallback((description) => {
    const slotInfo = extractSlotInfo(description);
    
    if (slotInfo.available <= 0) {
      return { color: colors.error, text: 'COMPLETO' };
    } else if (slotInfo.available <= 2) {
      return { color: colors.warning, text: `Solo ${slotInfo.available} posto${slotInfo.available === 1 ? '' : 'i'}!` };
    }
    return { color: colors.success, text: `${slotInfo.available} posti disponibili` };
  }, [extractSlotInfo]);

  // ⚡ MEMOIZZATO - Render slot (Evita re-render)
  const renderSlot = useCallback(({ item }) => {
    const status = getSlotStatus(item.Descrizione);
    const slotInfo = extractSlotInfo(item.Descrizione);
    const isBooking = booking === item.ID_Spazio;

    return (
      <View style={styles.slotCard}>
        <View style={styles.slotDetails}>
          <Text style={styles.slotTime}>
            {item.Ora_Inizio} - {item.Ora_Fine}
          </Text>
          <Text style={styles.slotDate}>
            📅 {slotInfo.date}
          </Text>
          <Text style={[styles.slotStatus, { color: status.color }]}>
            {status.text}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.bookButton, 
            isBooking && styles.bookButtonDisabled,
            status.text === 'COMPLETO' && styles.bookButtonFull
          ]}
          onPress={() => handleBookSlot(item)}
          disabled={isBooking || status.text === 'COMPLETO'}
        >
          {isBooking ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <Text style={styles.bookButtonText}>
              {status.text === 'COMPLETO' ? 'Completo' : 'Prenota'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }, [booking, getSlotStatus, extractSlotInfo, handleBookSlot]);

  if (loading.slots && slots.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento slot...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scegli lo Slot</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Info Box con data selezionata */}
      {data && (
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="calendar-check" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Visualizzando gli slot per: <Text style={{fontWeight: 'bold'}}>{dataFormattata || data}</Text>
          </Text>
        </View>
      )}

      {/* Slots List */}
      <FlatList
        data={filteredSlots}
        renderItem={renderSlot}
        keyExtractor={(item) => item.ID_Spazio.toString()}
        contentContainerStyle={styles.slotsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        updateCellsBatchingPeriod={50}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-remove" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyText}>Nessuno slot disponibile per questo giorno</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.h2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 157, 255, 0.1)',
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 18,
  },
  slotsContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  slotDetails: {
    flex: 1,
    marginRight: spacing.lg,
  },
  slotTime: {
    ...typography.h3,
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  slotDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  slotStatus: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  bookButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    minWidth: 90,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  bookButtonFull: {
    backgroundColor: colors.error,
  },
  bookButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});