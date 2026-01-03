import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
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

// ⚡ SKELETON LOADER COMPONENT
function SkeletonCard() {
  return (
    <View style={styles.bookingCard}>
      <View style={styles.skeletonIcon} />
      <View style={{ flex: 1 }}>
        <View style={styles.skeletonText} />
        <View style={[styles.skeletonText, { width: '80%' }]} />
      </View>
      <View style={[styles.skeletonIcon, { width: 40, height: 40 }]} />
    </View>
  );
}

export default function BookingsScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [reloading, setReloading] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  
  // ⚡ SMART REFRESH INTERVAL - Non ricarica se è recente
  const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minuti

  const loadBookings = async (showLoader = false, forceRefresh = false) => {
    try {
      if (showLoader) setReloading(true);
      
      const { email, code } = await ApiService.getSavedCredentials();
      
      // ⚡ Forza il refresh dei dati se richiesto
      const userData = await ApiService.refreshUserData(email, code, forceRefresh);
      
      if (userData.found) {
        setBookings(userData.bookings || []);
        console.log('✅ Prenotazioni caricate:', userData.bookings?.length || 0);
      }
    } catch (_error) {
      console.error('Error loading bookings');
    } finally {
      if (showLoader) setReloading(false);
    }
  };

  // ⚡ SMART FOCUS EFFECT - Ricarica SOLO se passati 5+ minuti
  useFocusEffect(
    useCallback(() => {
      const shouldRefresh = !lastRefreshTime || 
        (Date.now() - lastRefreshTime) > REFRESH_INTERVAL;
      
      if (shouldRefresh) {
        console.log('🔄 Focus → Ricarica prenotazioni (passati 5+ min)');
        loadBookings(false, true);
        setLastRefreshTime(Date.now());
      } else {
        const minutesAgo = Math.floor((Date.now() - lastRefreshTime) / 60000);
        console.log(`⚡ Focus → Salta ricarica (dati di ${minutesAgo} min fa)`);
      }
    }, [lastRefreshTime])
  );

  // ⚡ INITIAL LOAD
  useEffect(() => {
    loadBookings();
    setLastRefreshTime(Date.now());
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings(false, true);
    setRefreshing(false);
    setLastRefreshTime(Date.now());
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
        await loadBookings(true, true);
        setLastRefreshTime(Date.now());
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

  // ⚡ MEMOIZZATO - Evita re-render inutili
  const renderBooking = useCallback(({ item }) => {
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
  }, [cancelling, reloading]);

  // Mostra skeleton durante il caricamento globale
  if (reloading && bookings.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Le Tue Prenotazioni</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.listContainer}>
          {/* ⚡ SKELETON LOADING */}
          {Array(3).fill(0).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
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
          bookings.length === 0 && styles.emptyListContainer
        ]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary} 
          />
        }
        // ⚡ FLATLIST OPTIMIZATIONS
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        updateCellsBatchingPeriod={50}
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
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  // ⚡ SKELETON STYLES
  skeletonIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundLight,
    marginRight: spacing.md,
  },
  skeletonText: {
    height: 16,
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    marginBottom: spacing.xs,
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
});