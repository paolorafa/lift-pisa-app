import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import ApiService from '../services/api';
import { borderRadius, colors, spacing, typography } from '../styles/theme';

export default function BookingsScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async (showLoader = false, forceRefresh = false) => {
    try {
      if (showLoader) setReloading(true);
      
      const { email, code } = await ApiService.getSavedCredentials();
      
      // ⚡ MODIFICA: Forza il refresh dei dati
      const userData = await ApiService.refreshUserData(email, code, forceRefresh);
      
      if (userData.found) {
        setBookings(userData.bookings || []);
      }
    } catch (_error) {
      console.error('Error loading bookings');
    } finally {
      if (showLoader) setReloading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings(false, true); // ⚡ Forza refresh
    setRefreshing(false);
  };

  const handleCancelBooking = (booking) => {
    Alert.alert(
      'Conferma Cancellazione',
      `Sei sicuro di voler cancellare questa prenotazione?\n\n${booking.slotDescription}`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sì, Cancella',
          style: 'destructive',
          onPress: () => confirmCancelBooking(booking),
        },
      ]
    );
  };

  const confirmCancelBooking = async (booking) => {
    setCancelling(booking.id);
    try {
      const { email } = await ApiService.getSavedCredentials();
      const result = await ApiService.cancelBooking(email, booking.id);
      
      if (result.success) {
        Alert.alert('Successo ✅', result.message);
        // ⚡ MODIFICA: Forza il refresh completo
        await loadBookings(true, true);
      } else {
        Alert.alert('Errore', result.message);
      }
    } catch (_error) {
      Alert.alert('Errore', 'Impossibile cancellare la prenotazione');
    } finally {
      setCancelling(null);
    }
  };

  const getActivityIcon = (description) => {
    const lower = description.toLowerCase();
    if (lower.includes('yoga')) return 'yoga';
    if (lower.includes('zumba')) return 'music';
    if (lower.includes('pilates')) return 'pilates';
    return 'dumbbell';
  };

  const renderBooking = ({ item }) => {
    const isCancelling = cancelling === item.id;
    const icon = getActivityIcon(item.slotDescription);

    return (
      <View style={styles.bookingCard}>
        <View style={styles.bookingIcon}>
          <MaterialCommunityIcons name={icon} size={28} color={colors.primary} />
        </View>
        
        <View style={styles.bookingDetails}>
          <Text style={styles.bookingTitle}>Sala Pesi</Text>
          <Text style={styles.bookingTime}>{item.slotDescription}</Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleCancelBooking(item)}
          disabled={isCancelling || reloading}
        >
          {isCancelling ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <MaterialCommunityIcons
              name="delete-outline"
              size={24}
              color={colors.error}
            />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // Mostra loader globale durante il ricaricamento
  if (reloading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Le Tue Prenotazioni</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Aggiornamento prenotazioni...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Le Tue Prenotazioni</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={bookings}
        renderItem={renderBooking}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          bookings.length === 0 && styles.emptyListContainer // ⚡ AGGIUNTA
        ]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary} 
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-remove" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyText}>
              Non hai prenotazioni attive
            </Text>
            <TouchableOpacity
              style={styles.bookNowButton}
              onPress={() => navigation.navigate('Slots')}
            >
              <Text style={styles.bookNowButtonText}>Prenota Ora</Text>
            </TouchableOpacity>
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
  listContainer: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  // ⚡ AGGIUNTA: Stile per lista vuota
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  bookingIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  bookingDetails: {
    flex: 1,
  },
  bookingTitle: {
    ...typography.h3,
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  bookingTime: {
    ...typography.bodySmall,
  },
  deleteButton: {
    padding: spacing.sm,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  bookNowButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  bookNowButtonText: {
    ...typography.h3,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});