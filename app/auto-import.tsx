import { router } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function AutoImportScreen() {
  const handleBrokerSelect = (broker: string) => {
    switch (broker) {
      case 'interactive-brokers':
        router.push('/ib-import');
        break;
      case 'csv-upload':
        // TODO: Implement CSV upload functionality
        alert('CSV upload functionality will be implemented soon');
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Auto Import</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Select a broker to automatically import your trades
          </Text>

          {/* Broker Options */}
          <View style={styles.brokerOptions}>
            {/* Interactive Brokers */}
            <TouchableOpacity
              style={styles.brokerCard}
              onPress={() => handleBrokerSelect('interactive-brokers')}
            >
              <View style={styles.brokerHeader}>
                <Text style={styles.brokerName}>Interactive Brokers</Text>
                <Text style={styles.brokerArrow}>→</Text>
              </View>
              <Text style={styles.brokerDescription}>
                Import trades automatically using your Flex Query configuration
              </Text>
            </TouchableOpacity>

            {/* Manual CSV Upload */}
            <TouchableOpacity
              style={styles.brokerCard}
              onPress={() => handleBrokerSelect('csv-upload')}
            >
              <View style={styles.brokerHeader}>
                <Text style={styles.brokerName}>Manual CSV Upload</Text>
                <Text style={styles.brokerArrow}>→</Text>
              </View>
              <Text style={styles.brokerDescription}>
                Upload a CSV file with your trade data (Coming Soon)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>How it works</Text>
            <Text style={styles.instructionsText}>
              1. Configure your broker settings in the Settings page{'\n'}
              2. Select your broker from the options above{'\n'}
              3. Review and confirm the imported trades{'\n'}
              4. Your trades will be automatically added to your portfolio
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E5E5E5',
  },
  placeholder: {
    width: 60,
  },
  content: {
    padding: 16,
  },
  subtitle: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  brokerOptions: {
    gap: 16,
  },
  brokerCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  brokerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  brokerName: {
    color: '#E5E5E5',
    fontSize: 18,
    fontWeight: '600',
  },
  brokerArrow: {
    color: '#3B82F6',
    fontSize: 18,
    fontWeight: 'bold',
  },
  brokerDescription: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
  },
  instructionsCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#333333',
  },
  instructionsTitle: {
    color: '#E5E5E5',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  instructionsText: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 22,
  },
});
