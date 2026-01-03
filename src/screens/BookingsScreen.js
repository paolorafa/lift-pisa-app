import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
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
import { useApp } from '../context/AppContext';
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
  const { 
    bookings, 
    loading, 
    loadBookings, 
    cancelBooking: contextCancelBooking 
  } = useApp();
  
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [optimisticDeletedIds, setOptimisticDeletedIds] = useState(new Set());

  // ⚡ CARICA BOOKINGS SOLO SE NECESSARIO
  useFocusEffect(
    useCallback(() => {
      console.log('📖 BookingsScreen focused');
      
      // Carica solo se vuoti
      if (bookings.length === 0 && !loading.bookings) {
        loadBookings();
      }
    }, []) // Empty deps
  );

  const onRefresh = async () => {
    setRefreshing(true);
    // Reset optimistic deletes
    setOptimisticDeletedIds(new Set());
    await loadBookings(true); // Force refresh
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

  // 🚀 OPTIMISTIC UPDATE - Cancellazione istantanea
  const confirmCancelBooking = async (booking) => {
    setCancelling(booking.id);
    
    try {
      const { email } = await require('../services/api').default.getSavedCredentials();
      
      // 🚀 STEP 1: Rimuovi SUBITO dalla lista (Optimistic)
      setOptimisticDeletedIds(prev => new Set([...prev, booking.id]));
      setCancelling(null);
      
      // 🚀 STEP 2: Mostra successo IMMEDIATAMENTE
      Alert.alert('Prenotazione Cancellata ✅', 'La prenotazione è stata rimossa');
      
      // 🚀 STEP 3: API call in BACKGROUND (non bloccante)
      contextCancelBooking(email, booking.id)
        .then(result => {
          console.log('✅ Cancellazione completata in background');
          
          if (!result.success) {
            // ⚠️ Se fallisce, ripristina e notifica
            setOptimisticDeletedIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(booking.id);
              return newSet;
            });
            
            Alert.alert(
              'Errore',
              result.message || 'Impossibile cancellare la prenotazione. È stata ripristinata.',
              [{ text: 'OK' }]
            );
          }
        })
        .catch(error => {
          console.error('❌ Errore cancellazione background:', error);
          
          // Ripristina la prenotazione
          setOptimisticDeletedIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(booking.id);
            return newSet;
          });
          
          Alert.alert(
            'Errore',
            'Si è verificato un problema. La prenotazione è stata ripristinata.',
            [{ text: 'OK' }]
          );
        });
        
    } catch (error) {
      // Solo se fallisce PRIMA della chiamata API
      setCancelling(null);
      Alert.alert('Errore', 'Impossibile cancellare la prenotazione. Riprova.');
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
          disabled={isCancelling}
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
  }, [cancelling]);

  // 🚀 Filtra le prenotazioni cancellate ottimisticamente
  const visibleBookings = bookings.filter(booking => !optimisticDeletedIds.has(booking.id));

  // Mostra skeleton durante il caricamento globale
  if (loading.bookings && bookings.length === 0) {
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
        data={visibleBookings}
        renderItem={renderBooking}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          visibleBookings.length === 0 && styles.emptyListContainer
        ]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary} 
          />
        }
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