import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

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
          setProfile(newProfile);
        }
      } else if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchTradingStats = useCallback(async () => {
    try {
      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error fetching trades:', error);
        return;
      }

      // Calculate trading statistics from real data
      const totalTrades = trades?.length || 0;
      const closedTrades = trades?.filter(trade => trade.status === 'closed') || [];
      const winningTrades = closedTrades.filter(trade => (trade.pnl || 0) > 0);
      const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
      const totalPnl = closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      
      // Calculate best month from closed trades
      const monthlyPnl = closedTrades.reduce((acc, trade) => {
        if (trade.exit_date) {
          const month = new Date(trade.exit_date).toISOString().substring(0, 7); // YYYY-MM
          acc[month] = (acc[month] || 0) + (trade.pnl || 0);
        }
        return acc;
      }, {} as Record<string, number>);
      
      const bestMonth = Object.values(monthlyPnl).length > 0 
        ? Math.max(...Object.values(monthlyPnl).map(v => Number(v))) 
        : 0;
      
      // Calculate average trade size
      const avgTradeSize = trades?.length > 0 
        ? trades.reduce((sum, trade) => sum + (trade.quantity * trade.price), 0) / trades.length 
        : 0;
      
      // Calculate risk score based on PnL volatility
      const pnlValues = closedTrades.map(trade => trade.pnl || 0);
      const avgPnl = pnlValues.length > 0 ? pnlValues.reduce((sum, pnl) => sum + pnl, 0) / pnlValues.length : 0;
      const variance = pnlValues.length > 0 
        ? pnlValues.reduce((sum, pnl) => sum + Math.pow(pnl - avgPnl, 2), 0) / pnlValues.length 
        : 0;
      const riskScore = Math.min(10, Math.max(1, Math.sqrt(variance) / 100)); // Scale to 1-10

      const stats: TradingStats = {
        totalTrades,
        winRate,
        totalPnl,
        bestMonth,
        avgTradeSize,
        riskScore,
      };

      setTradingStats(stats);
    } catch (error) {
      console.error('Error in fetchTradingStats:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchTradingStats();
    } else {
      setLoading(false);
    }
  }, [user, loading, fetchProfile, fetchTradingStats]);

  const handleSave = async () => {
    if (!profile) return;

    try {
      setSaving(true);
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

  const handlePasswordChange = async () => {
    // Validate inputs
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    try {
      setSaving(true);
      setPasswordError('');

      // First, verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordData.currentPassword,
      });

      if (signInError) {
        setPasswordError('Current password is incorrect');
        return;
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (updateError) {
        setPasswordError(updateError.message);
        return;
      }

      // Success
      Alert.alert('Success', 'Password updated successfully');
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      setPasswordError('An unexpected error occurred');
      console.error('Error changing password:', error);
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

            {/* Security Settings Card */}
            <View style={styles.securityCard}>
              <View style={styles.securityHeader}>
                <Text style={styles.cardTitle}>Security Settings</Text>
                <TouchableOpacity
                  style={styles.changePasswordButton}
                  onPress={() => setIsChangingPassword(!isChangingPassword)}
                >
                  <Text style={styles.changePasswordButtonText}>
                    {isChangingPassword ? 'Cancel' : 'Change Password'}
                  </Text>
                </TouchableOpacity>
              </View>

              {isChangingPassword && (
                <View style={styles.passwordForm}>
                  <View style={styles.passwordField}>
                    <Text style={styles.fieldLabel}>Current Password</Text>
                    <TextInput
                      style={styles.input}
                      value={passwordData.currentPassword}
                      onChangeText={(text) => setPasswordData(prev => ({ ...prev, currentPassword: text }))}
                      placeholder="Enter current password"
                      placeholderTextColor="#64748B"
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.passwordField}>
                    <Text style={styles.fieldLabel}>New Password</Text>
                    <TextInput
                      style={styles.input}
                      value={passwordData.newPassword}
                      onChangeText={(text) => setPasswordData(prev => ({ ...prev, newPassword: text }))}
                      placeholder="Enter new password"
                      placeholderTextColor="#64748B"
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.passwordField}>
                    <Text style={styles.fieldLabel}>Confirm New Password</Text>
                    <TextInput
                      style={styles.input}
                      value={passwordData.confirmPassword}
                      onChangeText={(text) => setPasswordData(prev => ({ ...prev, confirmPassword: text }))}
                      placeholder="Confirm new password"
                      placeholderTextColor="#64748B"
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>

                  {passwordError ? (
                    <Text style={styles.passwordErrorText}>{passwordError}</Text>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.updatePasswordButton, saving && styles.buttonDisabled]}
                    onPress={handlePasswordChange}
                    disabled={saving}
                  >
                    <Text style={styles.updatePasswordButtonText}>
                      {saving ? 'Updating...' : 'Update Password'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

                {/* Trading Statistics Card */}
                {tradingStats && tradingStats.totalTrades > 0 ? (
                  <View style={styles.statsCard}>
                    <Text style={styles.cardTitle}>Trading Statistics</Text>

                    <View style={styles.statsGrid}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Total Trades</Text>
                        <Text style={styles.statValue}>{tradingStats.totalTrades}</Text>
                        <Text style={styles.statSubtext}>All time</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Win Rate</Text>
                        <Text style={styles.statValue}>{tradingStats.winRate.toFixed(1)}%</Text>
                        <Text style={styles.statSubtext}>
                          {tradingStats.winRate >= 60 ? 'Excellent' : 
                           tradingStats.winRate >= 50 ? 'Good' : 
                           tradingStats.winRate >= 40 ? 'Average' : 'Below average'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.statsGrid}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Total P&L</Text>
                        <Text style={[
                          styles.statValue, 
                          tradingStats.totalPnl >= 0 ? styles.profitText : styles.lossText
                        ]}>
                          ${tradingStats.totalPnl.toFixed(2)}
                        </Text>
                        <Text style={styles.statSubtext}>All time</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Best Month</Text>
                        <Text style={[
                          styles.statValue,
                          tradingStats.bestMonth >= 0 ? styles.profitText : styles.lossText
                        ]}>
                          ${tradingStats.bestMonth.toFixed(2)}
                        </Text>
                        <Text style={styles.statSubtext}>Best performing month</Text>
                      </View>
                    </View>

                    <View style={styles.statsGrid}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Avg. Trade Size</Text>
                        <Text style={styles.statValue}>${tradingStats.avgTradeSize.toFixed(0)}</Text>
                        <Text style={styles.statSubtext}>Position sizing</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Risk Score</Text>
                        <Text style={[
                          styles.statValue,
                          tradingStats.riskScore <= 3 ? styles.lowRiskText :
                          tradingStats.riskScore <= 7 ? styles.mediumRiskText : styles.highRiskText
                        ]}>
                          {tradingStats.riskScore.toFixed(1)}/10
                        </Text>
                        <Text style={styles.statSubtext}>
                          {tradingStats.riskScore <= 3 ? 'Low risk' :
                           tradingStats.riskScore <= 7 ? 'Medium risk' : 'High risk'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.statsCard}>
                    <Text style={styles.cardTitle}>Trading Statistics</Text>
                    <View style={styles.emptyStatsContainer}>
                      <Text style={styles.emptyStatsIcon}>📊</Text>
                      <Text style={styles.emptyStatsTitle}>No Trades Yet</Text>
                      <Text style={styles.emptyStatsMessage}>
                        Start tracking your trades to see detailed statistics and performance metrics here.
                      </Text>
                    </View>
                  </View>
                )}
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
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#CCCCCC',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#E5E5E5',
    marginBottom: 8,
  },
  subtitle: {
    color: '#CCCCCC',
    fontSize: 16,
  },
  mainContent: {
    flexDirection: 'column',
    gap: 24,
    marginBottom: 32,
  },
  profileCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
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
    color: '#E5E5E5',
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
    borderColor: '#4A5568',
  },
  editButtonText: {
    color: '#E5E5E5',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A5568',
  },
  cancelButtonText: {
    color: '#E5E5E5',
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
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E5E5E5',
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
    color: '#CCCCCC',
  },
  formSection: {
    gap: 16,
  },
  formRow: {
    flexDirection: 'column',
    gap: 16,
  },
  formField: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#CCCCCC',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2D3748',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#E5E5E5',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#4A5568',
  },
  inputDisabled: {
    backgroundColor: '#1A202C',
    borderColor: '#2D3748',
    color: '#6B7280',
  },
  statsCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
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
    flexWrap: 'wrap',
  },
  statItem: {
    flex: 1,
    alignItems: 'flex-start',
    minWidth: 140,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E5E5E5',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
  signOutButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  signOutText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  // Empty stats styles
  emptyStatsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStatsIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStatsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E5E5E5',
    marginBottom: 8,
  },
  emptyStatsMessage: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  // Profit/Loss text colors
  profitText: {
    color: '#10B981', // Green for profits
  },
  lossText: {
    color: '#EF4444', // Red for losses
  },
  // Risk level colors
  lowRiskText: {
    color: '#10B981', // Green for low risk
  },
  mediumRiskText: {
    color: '#F59E0B', // Yellow for medium risk
  },
  highRiskText: {
    color: '#EF4444', // Red for high risk
  },
  // Security Settings styles
  securityCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  securityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  changePasswordButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A5568',
  },
  changePasswordButtonText: {
    color: '#E5E5E5',
    fontSize: 14,
    fontWeight: '500',
  },
  passwordForm: {
    gap: 16,
  },
  passwordField: {
    marginBottom: 8,
  },
  passwordErrorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  updatePasswordButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
  },
  updatePasswordButtonText: {
    color: '#000000',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
