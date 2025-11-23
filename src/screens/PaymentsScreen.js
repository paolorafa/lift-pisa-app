import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
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
import ApiService from '../services/api';
import { borderRadius, colors, spacing, typography } from '../styles/theme';

export default function PaymentsScreen({ navigation }) {
  const [paymentData, setPaymentData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  // 🔄 Ricarica quando la schermata diventa visibile (massimo ogni 10 minuti)
  useFocusEffect(
    useCallback(() => {
      const shouldRefresh = !lastChecked || 
        (new Date() - lastChecked) > 10 * 60 * 1000; // 10 minuti
      
      if (shouldRefresh) {
        console.log('🔄 PaymentsScreen focus - ricarico dati pagamento');
        loadPaymentData(false);
      }
    }, [lastChecked])
  );

  const loadPaymentData = async (showLoader = true) => {
    try {
      if (showLoader) setRefreshing(true);
      
      console.log('🔄 Caricamento dati pagamento...');
      const { email } = await ApiService.getSavedCredentials();
      const result = await ApiService.getPaymentInfo(email);
      console.log('💰 Risultato pagamento:', result);
      
      setPaymentData(result);
      setLastChecked(new Date());
    } catch (error) {
      console.error('❌ Errore caricamento pagamento:', error);
      setPaymentData({ success: false, hasPayment: false });
    } finally {
      if (showLoader) setRefreshing(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentData?.paymentLink) return;

    try {
      console.log('🔗 Apertura link pagamento:', paymentData.paymentLink);
      const supported = await Linking.canOpenURL(paymentData.paymentLink);
      
      if (supported) {
        await Linking.openURL(paymentData.paymentLink);
        
        // Mostra un avviso
        Alert.alert(
          'Pagamento Avviato',
          'Completa il pagamento nella pagina che si è aperta.\n\nTorna qui dopo aver completato.',
          [
            { 
              text: 'Ho Completato', 
              onPress: () => {
                // Ricarica i dati dopo il pagamento
                setTimeout(() => loadPaymentData(true), 2000);
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

  const onRefresh = () => {
    loadPaymentData(true);
  };

  if (!paymentData && refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <MaterialCommunityIcons name="loading" size={48} color={colors.primary} />
        <Text style={styles.loadingText}>Caricamento pagamento...</Text>
      </View>
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
      {/* Header con ultimo controllo */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Pagamento</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <MaterialCommunityIcons 
              name="refresh" 
              size={24} 
              color={colors.primary} 
              style={refreshing && styles.refreshingIcon} 
            />
          </TouchableOpacity>
        </View>
        {lastChecked && (
          <Text style={styles.lastChecked}>
            Ultimo controllo: {lastChecked.toLocaleTimeString()}
          </Text>
        )}
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
  lastChecked: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  refreshButton: {
    padding: spacing.sm,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.round,
  },
  refreshingIcon: {
    transform: [{ rotate: '180deg' }],
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
  infoCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  infoTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
    color: colors.textSecondary,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});