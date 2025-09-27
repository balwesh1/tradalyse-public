import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  location: string | null;
  trading_experience: string | null;
  preferred_markets: string | null;
  avatar_url: string | null;
}

interface TradingStats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  bestMonth: number;
  avgTradeSize: number;
  riskScore: number;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tradingStats, setTradingStats] = useState<TradingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchTradingStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      console.log('Fetching profile for user:', user?.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      console.log('Profile fetch result:', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        // If profile doesn't exist, create it
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user?.id,
            email: user?.email,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
        } else {
          console.log('Created new profile:', newProfile);
          setProfile(newProfile);
        }
      } else if (data) {
        console.log('Found existing profile:', data);
        setProfile(data);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTradingStats = async () => {
    try {
      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error fetching trades:', error);
        return;
      }

      // Calculate trading statistics
      const totalTrades = trades?.length || 0;
      const closedTrades = trades?.filter(trade => trade.status === 'closed') || [];
      const winningTrades = closedTrades.filter(trade => (trade.pnl || 0) > 0);
      const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
      const totalPnl = closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      
      // Mock data for demonstration
      const stats: TradingStats = {
        totalTrades,
        winRate,
        totalPnl,
        bestMonth: 2450.00,
        avgTradeSize: 1250,
        riskScore: 7.2,
      };

      setTradingStats(stats);
    } catch (error) {
      console.error('Error in fetchTradingStats:', error);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      console.log('Saving profile:', profile);
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          location: profile.location,
          trading_experience: profile.trading_experience,
          preferred_markets: profile.preferred_markets,
          updated_at: new Date().toISOString(),
        });

      console.log('Save result:', { error });

      if (error) {
        Alert.alert('Error', 'Failed to save profile');
        console.error('Error saving profile:', error);
      } else {
        Alert.alert('Success', 'Profile updated successfully');
        setIsEditing(false);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Error in handleSave:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/signin');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>
              Manage your account information and view your trading statistics.
            </Text>
          </View>

          <View style={styles.mainContent}>
            {/* Profile Information Card */}
            <View style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <Text style={styles.cardTitle}>Profile Information</Text>
                <View style={styles.profileActions}>
                  {isEditing ? (
                    <>
                      <TouchableOpacity 
                        style={styles.saveButton}
                        onPress={handleSave}
                        disabled={saving}
                      >
                        <Text style={styles.saveButtonText}>
                          {saving ? 'Saving...' : 'Save'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.cancelButton}
                        onPress={() => setIsEditing(false)}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => setIsEditing(true)}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Avatar Section */}
              <View style={styles.avatarSection}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {profile?.full_name || 'User'}
                    
                  </Text>
                  <Text style={styles.userEmail}>{profile?.email}</Text>
                </View>
              </View>

              {/* Form Fields */}
              <View style={styles.formSection}>
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Full Name</Text>
                    <TextInput
                      style={[styles.input, !isEditing && styles.inputDisabled]}
                      value={profile?.full_name || ''}
                      onChangeText={(text) => setProfile(prev => prev ? {...prev, full_name: text} : null)}
                      editable={isEditing}
                      placeholder="Enter your full name"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Email</Text>
                    <TextInput
                      style={[styles.input, styles.inputDisabled]}
                      value={profile?.email || ''}
                      editable={false}
                      placeholder="Email address"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Phone</Text>
                    <TextInput
                      style={[styles.input, !isEditing && styles.inputDisabled]}
                      value={profile?.phone || ''}
                      onChangeText={(text) => setProfile(prev => prev ? {...prev, phone: text} : null)}
                      editable={isEditing}
                      placeholder="+1 (555) 123-4567"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Location</Text>
                    <TextInput
                      style={[styles.input, !isEditing && styles.inputDisabled]}
                      value={profile?.location || ''}
                      onChangeText={(text) => setProfile(prev => prev ? {...prev, location: text} : null)}
                      editable={isEditing}
                      placeholder="New York, NY"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Trading Experience</Text>
                    <TextInput
                      style={[styles.input, !isEditing && styles.inputDisabled]}
                      value={profile?.trading_experience || ''}
                      onChangeText={(text) => setProfile(prev => prev ? {...prev, trading_experience: text} : null)}
                      editable={isEditing}
                      placeholder="3 years"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Preferred Markets</Text>
                    <TextInput
                      style={[styles.input, !isEditing && styles.inputDisabled]}
                      value={profile?.preferred_markets || ''}
                      onChangeText={(text) => setProfile(prev => prev ? {...prev, preferred_markets: text} : null)}
                      editable={isEditing}
                      placeholder="Stocks, Options"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Trading Statistics Card */}
            <View style={styles.statsCard}>
              <Text style={styles.cardTitle}>Trading Statistics</Text>
              
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total Trades</Text>
                  <Text style={styles.statValue}>{tradingStats?.totalTrades || 0}</Text>
                  <Text style={styles.statSubtext}>This year</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Win Rate</Text>
                  <Text style={styles.statValue}>{tradingStats?.winRate.toFixed(1) || 0}%</Text>
                  <Text style={styles.statSubtext}>Above average</Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total P&L</Text>
                  <Text style={styles.statValue}>${tradingStats?.totalPnl.toFixed(2) || '0.00'}</Text>
                  <Text style={styles.statSubtext}>All time</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Best Month</Text>
                  <Text style={styles.statValue}>${tradingStats?.bestMonth.toFixed(2) || '0.00'}</Text>
                  <Text style={styles.statSubtext}>October 2024</Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Avg. Trade Size</Text>
                  <Text style={styles.statValue}>${tradingStats?.avgTradeSize || 0}</Text>
                  <Text style={styles.statSubtext}>Position sizing</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Risk Score</Text>
                  <Text style={styles.statValue}>{tradingStats?.riskScore}/10</Text>
                  <Text style={styles.statSubtext}>Moderate risk</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 16,
  },
  mainContent: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 32,
  },
  profileCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  profileActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  editButtonText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  cancelButtonText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '500',
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  proTag: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    backgroundColor: '#1E40AF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  userEmail: {
    fontSize: 16,
    color: '#94A3B8',
  },
  formSection: {
    gap: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  formField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#475569',
  },
  inputDisabled: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    color: '#94A3B8',
  },
  statsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 12,
    color: '#64748B',
  },
  signOutButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  signOutText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
