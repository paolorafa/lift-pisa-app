import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { borderRadius, colors, spacing, typography } from '../styles/theme';

export default function PaymentsScreen({ navigation }) {
  const { 
    paymentData, 
    loading, 
    loadPayments 
  } = useApp();
  
  const [refreshing, setRefreshing] = useState(false);

  // ⚡ CARICA PAGAMENTI SOLO SE NECESSARIO
  useFocusEffect(
    useCallback(() => {
      console.log('💳 PaymentsScreen focused');
      
      // Carica solo se vuoti
      if (!paymentData && !loading.payments) {
        loadPayments();
      }
    }, []) // Empty deps
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPayments(true); // Force refresh
    setRefreshing(false);
  };

  const handlePayment = async () => {
    if (!paymentData?.paymentLink) return;

    try {
      console.log('🔗 Apertura link pagamento:', paymentData.paymentLink);
      const supported = await Linking.canOpenURL(paymentData.paymentLink);
      
      if (supported) {
        await Linking.openURL(paymentData.paymentLink);
        
        Alert.alert(
          'Pagamento Avviato',
          'Completa il pagamento nella pagina che si è aperta.\n\nTorna qui dopo aver completato.',
          [
            { 
              text: 'Ho Completato', 
              onPress: () => {
                // Ricarica i dati dopo il pagamento (forza refresh)
                setTimeout(() => {
                  loadPayments(true);
                }, 2000);
              }
            },
            { text: 'Annulla', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Errore', 'Impossibile aprire il link di pagamento');
      }
    } catch (error) {
      Alert.alert('Errore', 'Si è verificato un errore durante l\'apertura del pagamento');
    }
  };

  // ⚡ SKELETON LOADER per caricamento iniziale
  if (loading.payments && !paymentData) {
    return (
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pagamento</Text>
        </View>
        
        <View style={[styles.paymentCard, styles.skeletonCard]}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonText} />
          <View style={[styles.skeletonText, { width: '70%' }]} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh} 
          tintColor={colors.primary} 
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Pagamento</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <MaterialCommunityIcons 
              name="refresh" 
              size={24} 
              color={colors.primary} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {!paymentData?.success ? (
        <View style={styles.errorCard}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Errore</Text>
          <Text style={styles.errorText}>
            Impossibile caricare i dati di pagamento
          </Text>
          
          <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
            <MaterialCommunityIcons name="reload" size={20} color={colors.primary} />
            <Text style={styles.retryButtonText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      ) : paymentData?.hasPayment ? (
        <View style={styles.paymentCard}>
          <MaterialCommunityIcons name="credit-card-fast" size={64} color={colors.warning} />
          <Text style={styles.paymentTitle}>Pagamento in Sospeso</Text>
          
          {paymentData.importo && (
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Importo:</Text>
              <Text style={styles.amountText}>{paymentData.importo}</Text>
            </View>
          )}
          
          {paymentData.scadenza && (
            <View style={styles.dueDateContainer}>
              <Text style={styles.dueDateLabel}>Scadenza:</Text>
              <Text style={styles.dueDateText}>{paymentData.scadenza}</Text>
            </View>
          )}
          
          <Text style={styles.paymentDescription}>
            {paymentData.descrizione || 'È disponibile un pagamento in sospeso per il tuo abbonamento.'}
          </Text>
          
          <TouchableOpacity style={styles.payButton} onPress={handlePayment}>
            <MaterialCommunityIcons name="lock-open-outline" size={24} color={colors.textPrimary} />
            <Text style={styles.payButtonText}>Procedi al Pagamento</Text>
          </TouchableOpacity>
          
          <Text style={styles.noteText}>
            💡 Clicca il pulsante sopra per completare il pagamento in modo sicuro.
          </Text>
        </View>
      ) : (
        <View style={styles.noPaymentCard}>
          <MaterialCommunityIcons name="check-circle-outline" size={64} color={colors.success} />
          <Text style={styles.noPaymentTitle}>Nessun Pagamento in Sospeso</Text>
          <Text style={styles.noPaymentDescription}>
            Al momento non ci sono pagamenti pendenti. Tutto è in regola!
          </Text>
          
          <View style={styles.refreshHint}>
            <Text style={styles.refreshHintText}>
              💡 Tira verso il basso per aggiornare lo stato pagamenti
            </Text>
          </View>
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
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingVertical: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    ...typography.h1,
  },
  refreshButton: {
    padding: spacing.sm,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.round,
  },
  // ⚡ SKELETON STYLES
  skeletonCard: {
    justifyContent: 'flex-start',
    paddingTop: spacing.lg,
  },
  skeletonIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundLight,
    marginBottom: spacing.lg,
  },
  skeletonText: {
    height: 16,
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  paymentCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.warning,
    marginBottom: spacing.lg,
  },
  paymentTitle: {
    ...typography.h2,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    color: colors.warning,
    textAlign: 'center',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  amountLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  amountText: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dueDateLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  dueDateText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  paymentDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  payButton: {
    flexDirection: 'row',
    backgroundColor: colors.warning,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  payButtonText: {
    ...typography.h3,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  noteText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noPaymentCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  noPaymentTitle: {
    ...typography.h2,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  noPaymentDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  refreshHint: {
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
  },
  refreshHintText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.error,
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.h2,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    color: colors.error,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    ...typography.bodySmall,
    color: colors.primary,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
});