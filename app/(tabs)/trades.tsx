import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function TradesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Trade History</Text>
        <Text style={styles.subtitle}>Your trading history will appear here</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  subtitle: {
    color: '#94A3B8',
    textAlign: 'center',
  },
});
