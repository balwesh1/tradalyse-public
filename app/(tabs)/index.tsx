import { useAuth } from '@/contexts/AuthContext';
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

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/signin');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.welcomeText}>Welcome back!</Text>
              <Text style={styles.emailText}>{user?.email}</Text>
            </View>
            <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardLeft]}>
              <Text style={styles.statLabel}>Total Trades</Text>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statChange}>+0% this month</Text>
            </View>
            <View style={[styles.statCard, styles.statCardRight]}>
              <Text style={styles.statLabel}>Win Rate</Text>
              <Text style={styles.statValue}>0%</Text>
              <Text style={styles.statSubtext}>No trades yet</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardLeft]}>
              <Text style={styles.statLabel}>P&L</Text>
              <Text style={styles.statValue}>$0.00</Text>
              <Text style={styles.statSubtext}>No trades yet</Text>
            </View>
            <View style={[styles.statCard, styles.statCardRight]}>
              <Text style={styles.statLabel}>Best Trade</Text>
              <Text style={styles.statValue}>$0.00</Text>
              <Text style={styles.statSubtext}>No trades yet</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={[styles.actionButton, styles.blueButton]}>
                <Text style={styles.actionButtonText}>Add New Trade</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.greenButton]}>
                <Text style={styles.actionButtonText}>View Trade History</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.purpleButton]}>
                <Text style={styles.actionButtonText}>Analytics Dashboard</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Trades */}
          <View style={styles.recentTrades}>
            <Text style={styles.sectionTitle}>Recent Trades</Text>
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No trades recorded yet</Text>
              <Text style={styles.emptyStateSubtext}>Start by adding your first trade</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  emailText: {
    color: '#6B7280',
  },
  signOutButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signOutText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statCardLeft: {
    marginRight: 8,
  },
  statCardRight: {
    marginLeft: 8,
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statChange: {
    color: '#10B981',
    fontSize: 14,
  },
  statSubtext: {
    color: '#6B7280',
    fontSize: 14,
  },
  quickActions: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    borderRadius: 12,
    padding: 16,
  },
  blueButton: {
    backgroundColor: '#2563EB',
  },
  greenButton: {
    backgroundColor: '#10B981',
  },
  purpleButton: {
    backgroundColor: '#7C3AED',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 18,
    textAlign: 'center',
  },
  recentTrades: {
    marginBottom: 32,
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyStateText: {
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    color: '#9CA3AF',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
});