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
import { APP_VERSION, isUpdateAvailable } from '../../src/services/appVersion';
import { borderRadius, colors, spacing, typography } from '../styles/theme';

export default function UpdatesScreen({ navigation }) {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  // 🔄 Ricarica quando la schermata diventa visibile (massimo ogni 5 minuti)
  useFocusEffect(
    useCallback(() => {
      const shouldRefresh = !lastChecked || 
        (new Date() - lastChecked) > 5 * 60 * 1000; // 5 minuti
      
      if (shouldRefresh) {
        console.log('🔄 UpdatesScreen focus - ricarico dati');
        loadUpdateInfo(false);
      }
    }, [lastChecked])
  );

  const loadUpdateInfo = async (showLoader = true) => {
    try {
      if (showLoader) setRefreshing(true);
      
      const result = await ApiService.getAppUpdateInfo();
      
      console.log('🔍 Update check:', {
        current: APP_VERSION,
        latest: result.latestVersion,
        needsUpdate: isUpdateAvailable(APP_VERSION, result.latestVersion)
      });
      
      if (result.updateAvailable && result.latestVersion) {
        result.isUpdateNeeded = isUpdateAvailable(APP_VERSION, result.latestVersion);
      } else {
        result.isUpdateNeeded = false;
      }
      
      setUpdateInfo(result);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Error loading update info:', error);
      setUpdateInfo({
        success: false,
        updateAvailable: false,
        isUpdateNeeded: false
      });
    } finally {
      if (showLoader) setRefreshing(false);
    }
  };

  const handleUpdate = async () => {
    if (!updateInfo?.expoLink) return;

    try {
      const supported = await Linking.canOpenURL(updateInfo.expoLink);
      
      if (supported) {
        await Linking.openURL(updateInfo.expoLink);
      } else {
        Alert.alert('Errore', 'Impossibile aprire il link di aggiornamento');
      }
    } catch (error) {
      Alert.alert('Errore', 'Si è verificato un errore durante l\'apertura del link');
    }
  };

  const onRefresh = () => {
    loadUpdateInfo(true);
  };

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
      {/* Header con pulsante refresh */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Aggiornamenti</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <MaterialCommunityIcons 
              name="refresh" 
              size={24} 
              color={colors.primary} 
              style={refreshing && styles.refreshingIcon} 
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.currentVersion}>Versione attuale: {APP_VERSION}</Text>
        {lastChecked && (
          <Text style={styles.lastChecked}>
            Ultimo controllo: {lastChecked.toLocaleTimeString()}
          </Text>
        )}
      </View>

      {updateInfo?.isUpdateNeeded ? (
        <View style={styles.updateCard}>
          {/* Icona animata */}
          <View style={styles.animatedIcon}>
            <MaterialCommunityIcons 
              name="update" 
              size={64} 
              color={colors.warning} 
            />
            <MaterialCommunityIcons 
              name="arrow-up" 
              size={24} 
              color={colors.warning} 
              style={styles.floatingArrow}
            />
          </View>
          
          <Text style={styles.updateTitle}>
            {updateInfo.mandatory ? '⚠️ AGGIORNAMENTO OBBLIGATORIO' : '📱 Aggiornamento Disponibile'}
          </Text>
          
          <View style={styles.versionComparison}>
            <View style={styles.versionItem}>
              <Text style={styles.versionLabel}>Versione attuale:</Text>
              <Text style={styles.versionCurrent}>{APP_VERSION}</Text>
            </View>
            <View style={styles.versionItem}>
              <Text style={styles.versionLabel}>Nuova versione:</Text>
              <Text style={styles.versionLatest}>{updateInfo.latestVersion}</Text>
            </View>
          </View>

          <Text style={styles.updateDescription}>
            {updateInfo.message}
          </Text>

          <Text style={styles.instructions}>
            {updateInfo.mandatory 
              ? 'Per continuare a utilizzare l\'app, segui questa procedura:'
              : 'Per avere le ultime funzionalità, segui questa procedura:'
            }
          </Text>

          <View style={styles.steps}>
            <Text style={styles.step}>1. Clicca "Scarica Aggiornamento"</Text>
            <Text style={styles.step}>2. Segui le istruzioni su Expo</Text>
            <Text style={styles.step}>3. Riapri l'app</Text>
          </View>

          <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
            <MaterialCommunityIcons name="download" size={24} color={colors.textPrimary} />
            <Text style={styles.updateButtonText}>Scarica Aggiornamento</Text>
          </TouchableOpacity>

          {updateInfo.mandatory && (
            <Text style={styles.mandatoryWarning}>
              ⚠️ Questo aggiornamento è obbligatorio per continuare
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.noUpdateCard}>
          <MaterialCommunityIcons name="check-circle" size={64} color={colors.success} />
          <Text style={styles.noUpdateTitle}>App Aggiornata</Text>
          <Text style={styles.noUpdateText}>
            Stai utilizzando l'ultima versione disponibile ({APP_VERSION})
          </Text>
          
          {updateInfo?.latestVersion && (
            <View style={styles.latestVersionInfo}>
              <Text style={styles.latestVersionText}>
                Ultima versione disponibile: {updateInfo.latestVersion}
              </Text>
            </View>
          )}

          {/* Istruzioni per refresh */}
          <View style={styles.refreshInstructions}>
            <Text style={styles.refreshInstructionsText}>
              💡 Tira verso il basso per controllare nuovi aggiornamenti
            </Text>
          </View>
        </View>
      )}

      {/* Info tecniche */}
      <View style={styles.techInfo}>
        <Text style={styles.techInfoTitle}>Informazioni Tecniche</Text>
        <View style={styles.techInfoRow}>
          <Text style={styles.techInfoLabel}>Versione installata:</Text>
          <Text style={styles.techInfoValue}>{APP_VERSION}</Text>
        </View>
        {updateInfo?.latestVersion && (
          <View style={styles.techInfoRow}>
            <Text style={styles.techInfoLabel}>Ultima versione:</Text>
            <Text style={styles.techInfoValue}>{updateInfo.latestVersion}</Text>
          </View>
        )}
        <View style={styles.techInfoRow}>
          <Text style={styles.techInfoLabel}>Stato:</Text>
          <Text style={[
            styles.techInfoValue,
            { color: updateInfo?.isUpdateNeeded ? colors.warning : colors.success }
          ]}>
            {updateInfo?.isUpdateNeeded ? 'Aggiornamento disponibile' : 'Aggiornato'}
          </Text>
        </View>
        {lastChecked && (
          <View style={styles.techInfoRow}>
            <Text style={styles.techInfoLabel}>Ultimo controllo:</Text>
            <Text style={styles.techInfoValue}>{lastChecked.toLocaleTimeString()}</Text>
          </View>
        )}
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
  currentVersion: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
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
  updateCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.warning,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  animatedIcon: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  floatingArrow: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  updateTitle: {
    ...typography.h2,
    color: colors.warning,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  versionComparison: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
  },
  versionItem: {
    alignItems: 'center',
  },
  versionLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  versionCurrent: {
    ...typography.h3,
    color: colors.textTertiary,
  },
  versionLatest: {
    ...typography.h3,
    color: colors.warning,
    fontWeight: 'bold',
  },
  updateDescription: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  instructions: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  steps: {
    alignSelf: 'stretch',
    marginBottom: spacing.xl,
  },
  step: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    paddingLeft: spacing.md,
  },
  updateButton: {
    flexDirection: 'row',
    backgroundColor: colors.warning,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  updateButtonText: {
    ...typography.h3,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  mandatoryWarning: {
    ...typography.bodySmall,
    color: colors.warning,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noUpdateCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  noUpdateTitle: {
    ...typography.h2,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  noUpdateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  latestVersionInfo: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  latestVersionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  refreshInstructions: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
  },
  refreshInstructionsText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  techInfo: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  techInfoTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
    color: colors.textSecondary,
  },
  techInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  techInfoLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  techInfoValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});