import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
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
import ApiService from '../services/api';
import { borderRadius, colors, spacing, typography } from '../styles/theme';

const DAYS = [
  { id: 'Lunedì', short: 'Lun', num: 1 },
  { id: 'Martedì', short: 'Mar', num: 2 },
  { id: 'Mercoledì', short: 'Mer', num: 3 },
  { id: 'Giovedì', short: 'Gio', num: 4 },
  { id: 'Venerdì', short: 'Ven', num: 5 },
  { id: 'Sabato', short: 'Sab', num: 6 },
  { id: 'Domenica', short: 'Dom', num: 0 },
];

export default function SlotsScreen({ navigation, route }) {
  const userData = route.params?.userData;
  
  const [slots, setSlots] = useState([]);
  const [filteredSlots, setFilteredSlots] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    loadSlots();
    // Imposta giorno corrente come default
    const today = new Date().getDay();
    const currentDay = DAYS.find(d => d.num === today);
    if (currentDay) {
      setSelectedDay(currentDay.id);
    }
  }, []);

  useEffect(() => {
    filterSlotsByDay();
  }, [selectedDay, slots]);

  const loadSlots = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getAvailableSlots();
      setSlots(data);
    } catch (error) {
      Alert.alert('Errore', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSlots();
    setRefreshing(false);
  };

  const filterSlotsByDay = () => {
    if (!selectedDay) {
      setFilteredSlots(slots);
      return;
    }
    const filtered = slots.filter(slot => slot.Giorno === selectedDay);
    setFilteredSlots(filtered);
  };

  const handleBookSlot = (slot) => {
    // Estrai informazioni dalla descrizione
    const match = slot.Descrizione.match(/(\d+)\/8/);
    const currentCount = match ? parseInt(match[1]) : 0;
    
    Alert.alert(
      'Conferma Prenotazione',
      `Vuoi prenotare:\n\n${slot.Descrizione}\n\nPosti disponibili: ${8 - currentCount}/8`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: () => confirmBooking(slot),
        },
      ]
    );
  };

  const confirmBooking = async (slot) => {
    setBooking(slot.ID_Spazio);
    try {
      const { email, code } = await ApiService.getSavedCredentials();
      const result = await ApiService.bookSlot(email, code, slot.ID_Spazio);
      
      if (result.success) {
        Alert.alert(
          'Prenotazione Confermata! ✅',
          result.message,
          [
            {
              text: 'OK',
              onPress: () => {
                loadSlots(); // Ricarica slot
                navigation.navigate('Home'); // Torna alla home
              },
            },
          ]
        );
      } else {
        Alert.alert('Errore', result.message);
      }
    } catch (error) {
      Alert.alert('Errore', error.message);
    } finally {
      setBooking(null);
    }
  };

  const getSlotStatus = (description) => {
    const match = description.match(/(\d+)\/8/);
    if (!match) return { color: colors.primary, text: 'Disponibile' };
    
    const count = parseInt(match[1]);
    if (count >= 7) {
      return { color: colors.warning, text: `Solo ${8 - count} posto!` };
    }
    return { color: colors.primary, text: 'Disponibile' };
  };

  const renderSlot = ({ item }) => {
    const status = getSlotStatus(item.Descrizione);
    const isBooking = booking === item.ID_Spazio;

    return (
      <View style={styles.slotCard}>
        <View style={styles.slotIcon}>
          <MaterialCommunityIcons name="clock-outline" size={24} color={colors.primary} />
        </View>
        
        <View style={styles.slotDetails}>
          <Text style={styles.slotTime}>
            {item.Ora_Inizio} - {item.Ora_Fine}
          </Text>
          <Text style={[styles.slotStatus, { color: status.color }]}>
            {status.text}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.bookButton, isBooking && styles.bookButtonDisabled]}
          onPress={() => handleBookSlot(item)}
          disabled={isBooking}
        >
          {isBooking ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <Text style={styles.bookButtonText}>Prenota</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderDayFilter = ({ item }) => {
    const isSelected = selectedDay === item.id;
    
    return (
      <TouchableOpacity
        style={[styles.dayButton, isSelected && styles.dayButtonActive]}
        onPress={() => setSelectedDay(item.id)}
      >
        <Text
          style={[styles.dayButtonText, isSelected && styles.dayButtonTextActive]}
        >
          {item.short} {item.num}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
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
        <Text style={styles.headerTitle}>Prenota il tuo Slot</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Day Filter */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={DAYS}
        renderItem={renderDayFilter}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.dayFilterContainer}
        style={styles.dayFilter}
      />

      {/* Slots List */}
      <FlatList
        data={filteredSlots}
        renderItem={renderSlot}
        keyExtractor={(item) => item.ID_Spazio.toString()}
        contentContainerStyle={styles.slotsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
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
  dayFilter: {
    maxHeight: 60,
    marginBottom: spacing.md,
  },
  dayFilterContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  dayButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dayButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dayButtonTextActive: {
    color: colors.textPrimary,
  },
  slotsContainer: {
    padding: spacing.lg,
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
  slotIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  slotDetails: {
    flex: 1,
  },
  slotTime: {
    ...typography.h3,
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  slotStatus: {
    ...typography.bodySmall,
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
