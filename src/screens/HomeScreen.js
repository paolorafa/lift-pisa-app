import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState, useCallback } from 'react';

import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
} from 'react-native';
import ApiService from '../services/api';
import { APP_VERSION } from '../services/appVersion'; // ⬅️ Importa da appVersion.js
import { borderRadius, colors, spacing, typography } from '../styles/theme';

export default function HomeScreen({ navigation, route }) {
  const [userData, setUserData] = useState(route.params?.userData || null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(!route.params?.userData);
  const [communications, setCommunications] = useState([]);

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      const { email, code } = await ApiService.getSavedCredentials();
      
      if (!email || !code) {
        navigation.replace('Login');
        return;
      }
      
      console.log('🔄 Caricamento dati utente...');
      const freshData = await ApiService.refreshUserData(email, code);
      
      if (freshData.found) {
        setUserData(freshData);
        console.log('✅ Dati utente caricati:', freshData.nome, freshData.cognome);
        
        // Carica comunicazioni
        const comms = await ApiService.getCommunications();
        setCommunications(comms);
        console.log('✅ Comunicazioni caricate:', comms.length);
      } else {
        Alert.alert('Errore', 'Impossibile caricare i dati utente');
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('❌ Errore caricamento dati:', error);
      Alert.alert('Errore', 'Impossibile caricare i dati. Riprova.');
      navigation.replace('Login');
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    if (route.params?.userData) {
      setUserData(route.params.userData);
      setLoading(false);
      // Carica comunque le comunicazioni
      ApiService.getCommunications().then(setCommunications);
    } else {
      loadUserData();
    }
  }, [route.params?.userData, loadUserData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const { email, code } = await ApiService.getSavedCredentials();
      if (email && code) {
        const freshData = await ApiService.refreshUserData(email, code);
        if (freshData.found) {
          setUserData(freshData);
        }
        
        // Ricarica comunicazioni
        const comms = await ApiService.getCommunications();
        setCommunications(comms);
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
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

  const handleCancelBooking = async (bookingId) => {
    Alert.alert(
      'Conferma Cancellazione',
      'Sei sicuro di voler cancellare questa prenotazione?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sì, Cancella',
          style: 'destructive',
          onPress: async () => {
            try {
              const { email } = await ApiService.getSavedCredentials();
              const result = await ApiService.cancelBooking(email, bookingId);
              
              if (result.success) {
                Alert.alert('Successo', result.message);
                onRefresh();
              } else {
                Alert.alert('Errore', result.message);
              }
            } catch (error) {
              Alert.alert('Errore', 'Impossibile cancellare la prenotazione');
            }
          },
        },
      ]
    );
  };

  const getCommunicationStyle = (tipo) => {
    switch(tipo) {
      case 'warning':
        return {
          icon: 'alert',
          bgColor: 'rgba(251, 191, 36, 0.1)',
          borderColor: colors.warning,
          iconColor: colors.warning,
        };
      case 'important':
        return {
          icon: 'alert-circle',
          bgColor: 'rgba(239, 68, 68, 0.1)',
          borderColor: colors.error,
          iconColor: colors.error,
        };
      case 'info':
      default:
        return {
          icon: 'information',
          bgColor: 'rgba(59, 157, 255, 0.1)',
          borderColor: colors.primary,
          iconColor: colors.primary,
        };
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento dati...</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Errore nel caricamento dati</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadUserData}
        >
          <Text style={styles.retryButtonText}>Riprova</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const upcomingBookings = (userData.bookings || []).slice(0, 3);
  const hasMoreBookings = (userData.bookings || []).length > 3;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <MaterialCommunityIcons name="arm-flex" size={32} color={colors.primary} />
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <MaterialCommunityIcons name="account-circle" size={32} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Welcome */}
      <Text style={styles.welcomeTitle}>
        Ciao, {userData.nome || 'Utente'}!
      </Text>

      {/* Comunicazioni */}
      {communications.length > 0 && (
        <View style={styles.communicationsSection}>
          {communications.map((comm) => {
            const style = getCommunicationStyle(comm.tipo);
            return (
              <View
                key={comm.id}
                style={[
                  styles.communicationCard,
                  {
                    backgroundColor: style.bgColor,
                    borderColor: style.borderColor,
                  }
                ]}
              >
                <MaterialCommunityIcons
                  name={style.icon}
                  size={24}
                  color={style.iconColor}
                />
                <View style={styles.communicationContent}>
                  <Text style={styles.communicationTitle}>{comm.titolo}</Text>
                  <Text style={styles.communicationMessage}>{comm.messaggio}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Status Cards - Griglia 2x2 */}
      <View style={styles.statusGrid}>
        {/* Abbonamento */}
        <View style={[styles.statusCard, styles.halfCard]}>
          <MaterialCommunityIcons 
            name="credit-card" 
            size={24} 
            color={userData.abbonamentoExpired ? colors.error : colors.textPrimary} 
          />
          <Text style={styles.statusLabel}>Abbonamento</Text>
          <Text
            style={[
              styles.statusValue,
              { color: userData.abbonamentoExpired ? colors.error : colors.success },
              styles.statusValueSmall,
            ]}
          >
            {userData.abbonamentoExpired ? 'Scad. ' : 'Scad. '}
            {userData.abbonamentoExpiryString || 'N/A'}
          </Text>
        </View>

        {/* Certificato Medico */}
        <View style={[styles.statusCard, styles.halfCard]}>
          <MaterialCommunityIcons
            name="file-document"
            size={24}
            color={userData.certificateExpired ? colors.error : colors.textPrimary}
          />
          <Text style={styles.statusLabel}>Certificato</Text>
          <Text
            style={[
              styles.statusValue,
              { color: userData.certificateExpired ? colors.error : colors.success },
              styles.statusValueSmall,
            ]}
          >
            {userData.certificateExpired ? 'Scad. ' : 'Scad. '}
            {userData.certificateExpiryString || 'N/A'}
          </Text>
        </View>

        {/* Tessera ASI */}
        <View style={[styles.statusCard, styles.halfCard]}>
          <MaterialCommunityIcons
            name="card-account-details"
            size={24}
            color={userData.asiExpired ? colors.error : colors.textPrimary}
          />
          <Text style={styles.statusLabel}>Tessera ASI</Text>
          <Text
            style={[
              styles.statusValue,
              { color: userData.asiExpired ? colors.error : colors.success },
              styles.statusValueSmall,
            ]}
          >
            {userData.asiExpired ? 'Scad. ' : 'Scad. '}
            {userData.asiExpiryString || 'N/A'}
          </Text>
        </View>

        {/* Prenotazioni */}
        <View style={[styles.statusCard, styles.halfCard]}>
          <MaterialCommunityIcons name="calendar-check" size={24} color={colors.textPrimary} />
          <Text style={styles.statusLabel}>Prenotazioni</Text>
          <Text style={[styles.statusValue, styles.statusValueSmall]}>
            {userData.weeklyBookings || 0}
            {userData.frequenza !== 'Open' && `/${userData.frequenza}`}
          </Text>
        </View>
      </View>

      {/* Prossime Prenotazioni */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Le Tue Prossime Prenotazioni</Text>

        {upcomingBookings.length > 0 ? (
          <>
            {upcomingBookings.map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingIcon}>
                  <MaterialCommunityIcons name="dumbbell" size={24} color={colors.primary} />
                </View>
                <View style={styles.bookingDetails}>
                  <Text style={styles.bookingTitle}>Sala Pesi</Text>
                  <Text style={styles.bookingTime}>
                    {booking.dataFormatted}, {booking.oraInizio} - {booking.oraFine}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleCancelBooking(booking.id)}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Annulla</Text>
                </TouchableOpacity>
              </View>
            ))}

            {hasMoreBookings && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('Bookings')}
              >
                <Text style={styles.viewAllText}>
                  Vedi tutte le prenotazioni ({userData.bookings.length})
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-remove" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>Non hai altre attività in programma.</Text>
          </View>
        )}
      </View>

      {/* CTA Button */}
      {userData.isPaid && !userData.certificateExpired && (
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => navigation.navigate('Slots')}
        >
          <Text style={styles.ctaButtonText}>Prenota Ora</Text>
          <MaterialCommunityIcons name="arrow-right" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      )}

      {/* Warning */}
      {(!userData.isPaid || userData.certificateExpired) && (
        <View style={styles.warningBox}>
          <MaterialCommunityIcons name="alert-circle" size={24} color={colors.warning} />
          <Text style={styles.warningText}>
            {!userData.isPaid
              ? 'Abbonamento non attivo. Contatta la reception.'
              : 'Certificato medico scaduto. Devi rinnovarlo per prenotare.'}
          </Text>
        </View>
      )}
      <View style={styles.versionFooter}>
        <Text style={styles.versionText}>
           Versione {APP_VERSION}
        </Text>
      </View>


    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  welcomeTitle: {
    ...typography.h1,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  communicationsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  communicationCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    alignItems: 'flex-start',
  },
  communicationContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  communicationTitle: {
    ...typography.h3,
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  communicationMessage: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  statusCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  halfCard: {
    width: '48%',
  },
  statusLabel: {
    ...typography.bodySmall,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  statusValue: {
    ...typography.h3,
    fontWeight: 'bold',
  },
  statusValueSmall: {
    fontSize: 16,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.h2,
    marginBottom: spacing.lg,
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
    width: 48,
    height: 48,
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
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cancelButtonText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  viewAllText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  ctaButtonText: {
    ...typography.h3,
    fontWeight: 'bold',
    marginRight: spacing.sm,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warningText: {
    ...typography.body,
    color: colors.warning,
    flex: 1,
    marginLeft: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    alignSelf: 'center',
  },
  retryButtonText: {
    ...typography.h3,
    fontWeight: 'bold',
  },
 versionFooter: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingBottom: spacing.xxl * 2,
  },
  versionText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 12,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});