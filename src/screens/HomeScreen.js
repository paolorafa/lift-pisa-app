import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import ApiService from '../services/api';
import { borderRadius, colors, spacing, typography } from '../styles/theme';

export default function HomeScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [communications, setCommunications] = useState([]);

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 HomeScreen riceve focus - ricarico dati');
      loadUserData(false);
      loadCommunications();
    }, [])
  );

  useEffect(() => {
    loadUserData(true);
    loadCommunications();
  }, []);

  const loadUserData = async (showLoader = true) => {
    try {
      if (showLoader) setRefreshing(true);
      
      const { email, code } = await ApiService.getSavedCredentials();
      if (!email || !code) {
        navigation.replace('Login');
        return;
      }

      const data = await ApiService.refreshUserData(email, code, true);
      
      if (data.found) {
        setUserData(data);
        console.log('✅ Dati utente aggiornati:', data.bookings?.length || 0, 'prenotazioni');
      } else {
        Alert.alert('Errore', 'Impossibile caricare i dati utente');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      if (showLoader) setRefreshing(false);
    }
  };

  const loadCommunications = async () => {
    try {
      const comms = await ApiService.getCommunications();
      if (Array.isArray(comms)) {
        setCommunications(comms);
      }
    } catch (error) {
      console.error('Error loading communications:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadUserData(false),
      loadCommunications()
    ]);
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Conferma Logout',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: async () => {
            await ApiService.logout();
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  const getStatusColor = () => {
    if (!userData?.isPaid) return colors.error;
    if (userData?.certificateExpired) return colors.warning;
    return colors.success;
  };

  const getStatusText = () => {
    if (!userData?.isPaid) return 'Abbonamento Non Attivo';
    if (userData?.certificateExpired) return 'Certificato Scaduto';
    return 'Attivo';
  };

  const canBook = userData?.isPaid && !userData?.certificateExpired;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header con Logo */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Logo */}
          <Image 
            source={require('../../assets/lift-logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Ciao,</Text>
            <Text style={styles.userName}>
              {userData?.nome}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Comunicazioni */}
      {communications.length > 0 && (
        <View style={styles.communicationsSection}>
          <Text style={styles.sectionTitle}>📢 Comunicazioni</Text>
          {communications.map((comm) => (
            <View 
              key={comm.id} 
              style={[
                styles.communicationCard,
                comm.tipo === 'warning' && styles.communicationWarning,
                comm.tipo === 'important' && styles.communicationImportant
              ]}
            >
              <Text style={styles.communicationTitle}>{comm.titolo}</Text>
              <Text style={styles.communicationMessage}>{comm.messaggio}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Status Card */}
      <View style={[styles.statusCard, { borderColor: getStatusColor() }]}>
        <View style={styles.statusHeader}>
          <MaterialCommunityIcons
            name={canBook ? 'check-circle' : 'alert-circle'}
            size={32}
            color={getStatusColor()}
          />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
        </View>

        {!userData?.isPaid && (
          <Text style={styles.warningText}>
            ⚠️ Il tuo abbonamento non è attivo. Contatta la reception per rinnovarlo.
          </Text>
        )}

        {userData?.certificateExpired && (
          <Text style={styles.warningText}>
            ⚠️ Il tuo certificato medico è scaduto il {userData.certificateExpiryString}
          </Text>
        )}
      </View>

      {/* Status Grid - Tessera ASI aggiunta qui */}
      <View style={styles.statusGrid}>
        {/* Abbonamento */}
        <View style={[styles.statusCardGrid, styles.halfCard]}>
          <MaterialCommunityIcons 
            name="credit-card" 
            size={24} 
            color={userData?.abbonamentoExpired ? colors.error : colors.textPrimary} 
          />
          <Text style={styles.statusLabel}>Abbonamento</Text>
          <Text
            style={[
              styles.statusValue,
              { color: userData?.abbonamentoExpired ? colors.error : colors.success },
              styles.statusValueSmall,
            ]}
          >
            {userData?.abbonamentoExpired ? 'Scad. ' : 'Scad. '}
            {userData?.abbonamentoExpiryString || 'N/A'}
          </Text>
        </View>

        {/* Certificato Medico */}
        <View style={[styles.statusCardGrid, styles.halfCard]}>
          <MaterialCommunityIcons
            name="file-document"
            size={24}
            color={userData?.certificateExpired ? colors.error : colors.textPrimary}
          />
          <Text style={styles.statusLabel}>Certificato</Text>
          <Text
            style={[
              styles.statusValue,
              { color: userData?.certificateExpired ? colors.error : colors.success },
              styles.statusValueSmall,
            ]}
          >
            {userData?.certificateExpired ? 'Scad. ' : 'Scad. '}
            {userData?.certificateExpiryString || 'N/A'}
          </Text>
        </View>

        {/* Tessera ASI */}
        <View style={[styles.statusCardGrid, styles.halfCard]}>
          <MaterialCommunityIcons
            name="card-account-details"
            size={24}
            color={userData?.asiExpired ? colors.error : colors.textPrimary}
          />
          <Text style={styles.statusLabel}>Tessera ASI</Text>
          <Text
            style={[
              styles.statusValue,
              { color: userData?.asiExpired ? colors.error : colors.success },
              styles.statusValueSmall,
            ]}
          >
            {userData?.asiExpired ? 'Scad. ' : 'Scad. '}
            {userData?.asiExpiryString || 'N/A'}
          </Text>
        </View>

        {/* Prenotazioni */}
        <View style={[styles.statusCardGrid, styles.halfCard]}>
          <MaterialCommunityIcons name="calendar-check" size={24} color={colors.textPrimary} />
          <Text style={styles.statusLabel}>Prenotazioni</Text>
          <Text style={[styles.statusValue, styles.statusValueSmall]}>
            {userData?.weeklyBookings || 0}
            {userData?.frequenza !== 'Open' && `/${userData?.frequenza}`}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionCard, !canBook && styles.actionCardDisabled]}
          onPress={() => canBook && navigation.navigate('Slots')}
          disabled={!canBook}
        >
          <MaterialCommunityIcons
            name="calendar-plus"
            size={48}
            color={canBook ? colors.primary : colors.buttonDisabled}
          />
          <Text style={[styles.actionTitle, !canBook && styles.actionTitleDisabled]}>
            Nuova Prenotazione
          </Text>
          {!canBook && <Text style={styles.actionDisabledText}>Non disponibile</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Bookings')}
        >
          <MaterialCommunityIcons name="bookmark" size={48} color={colors.primary} />
          <Text style={styles.actionTitle}>Le Mie Prenotazioni</Text>
          <Text style={styles.actionSubtitle}>{userData?.bookings?.length || 0} attive</Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming Bookings */}
      {userData?.bookings && userData.bookings.length > 0 && (
        <View style={styles.bookingsSection}>
          <Text style={styles.sectionTitle}>Prossime Prenotazioni</Text>
          {userData.bookings.slice(0, 3).map((booking) => (
            <View key={booking.id} style={styles.bookingCard}>
              <MaterialCommunityIcons name="dumbbell" size={24} color={colors.primary} />
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingTime}>{booking.slotDescription}</Text>
              </View>
            </View>
          ))}
          {userData.bookings.length > 3 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('Bookings')}
            >
              <Text style={styles.viewAllText}>Vedi tutte ({userData.bookings.length})</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xxl * 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 2,
    paddingBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 100,
    height: 100,
    marginRight: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  userName: {
    ...typography.h1,
    fontSize: 28,
  },
  logoutButton: {
    padding: spacing.sm,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.round,
  },
  communicationsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  communicationCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  communicationWarning: {
    borderLeftColor: colors.warning,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
  },
  communicationImportant: {
    borderLeftColor: colors.error,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  communicationTitle: {
    ...typography.h3,
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  communicationMessage: {
    ...typography.bodySmall,
    lineHeight: 20,
  },
  statusCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    marginBottom: spacing.xl,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusText: {
    ...typography.h2,
    marginLeft: spacing.md,
  },
  warningText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  // Nuovi stili per la griglia status
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  statusCardGrid: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  halfCard: {
    width: '48%',
  },
  statusLabel: {
    ...typography.bodySmall,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  statusValue: {
    ...typography.h3,
    fontWeight: 'bold',
  },
  statusValueSmall: {
    fontSize: 16,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionCardDisabled: {
    opacity: 0.5,
  },
  actionTitle: {
    ...typography.h3,
    fontSize: 16,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  actionTitleDisabled: {
    color: colors.textTertiary,
  },
  actionSubtitle: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  actionDisabledText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  bookingsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h2,
    marginBottom: spacing.md,
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  bookingInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  bookingTime: {
    ...typography.body,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  viewAllText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});