import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface TradingStats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  bestTrade: number;
  monthlyChange: number;
  monthlyTrades: number;
  profitFactor: number;
  dayWinRate: number;
  avgWinTrade: number;
  avgLossTrade: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
}

interface Trade {
  id: string;
  symbol: string;
  side: string;
  trade_type: string;
  asset_type: string;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  standard_lot_size: number;
  quantity: number;
  commission: number;
  pnl: number | null;
  status: string;
  entry_date: string;
  exit_date: string | null;
  strategy_id: string | null;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface DailyPnL {
  date: string;
  pnl: number;
  tradeCount: number;
}

// Circular Progress Component
const CircularProgress = ({ percentage, size = 60, strokeWidth = 6, color = '#10B981' }: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) => {

  return (
    <View style={{ width: size, height: size }}>
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: '#333333',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
      }}>
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: 'transparent',
          borderTopColor: color,
          transform: [{ rotate: `${(percentage / 100) * 360 - 90}deg` }],
        }} />
        <View style={{
          position: 'absolute',
          width: size - strokeWidth * 2,
          height: size - strokeWidth * 2,
          borderRadius: (size - strokeWidth * 2) / 2,
          backgroundColor: '#1A1A1A',
        }} />
      </View>
    </View>
  );
};

// Horizontal Bar Chart Component
const HorizontalBarChart = ({ 
  winAmount, 
  lossAmount, 
  width = 200, 
  height = 20 
}: {
  winAmount: number;
  lossAmount: number;
  width?: number;
  height?: number;
}) => {
  const totalAmount = Math.abs(winAmount) + Math.abs(lossAmount);
  const winWidth = totalAmount > 0 ? (Math.abs(winAmount) / totalAmount) * width : 0;
  const lossWidth = totalAmount > 0 ? (Math.abs(lossAmount) / totalAmount) * width : 0;

  return (
    <View style={{
      flexDirection: 'row',
      width: width,
      height: height,
      borderRadius: height / 2,
      overflow: 'hidden',
      backgroundColor: '#333333',
    }}>
      <View style={{
        width: winWidth,
        height: height,
        backgroundColor: '#10B981',
      }} />
      <View style={{
        width: lossWidth,
        height: height,
        backgroundColor: '#EF4444',
      }} />
    </View>
  );
};

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<TradingStats>({
    totalTrades: 0,
    winRate: 0,
    totalPnl: 0,
    bestTrade: 0,
    monthlyChange: 0,
    monthlyTrades: 0,
    profitFactor: 0,
    dayWinRate: 0,
    avgWinTrade: 0,
    avgLossTrade: 0,
    winningTrades: 0,
    losingTrades: 0,
    breakEvenTrades: 0,
  });
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [dailyPnLData, setDailyPnLData] = useState<DailyPnL[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  const fetchRecentTrades = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching recent trades:', error);
        return;
      }

      setRecentTrades(data || []);
    } catch (error) {
      console.error('Error fetching recent trades:', error);
    }
  }, [user]);

  const fetchDailyPnLData = useCallback(async () => {
    if (!user) return;

    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'closed')
        .gte('entry_date', startOfMonth.toISOString())
        .lte('entry_date', endOfMonth.toISOString())
        .not('pnl', 'is', null);

      if (error) {
        console.error('Error fetching daily P&L data:', error);
        return;
      }

      // Group trades by date and calculate daily P&L
      const dailyData: { [key: string]: DailyPnL } = {};
      
      (data || []).forEach(trade => {
        const tradeDate = new Date(trade.entry_date).toISOString().split('T')[0];
        
        if (!dailyData[tradeDate]) {
          dailyData[tradeDate] = {
            date: tradeDate,
            pnl: 0,
            tradeCount: 0
          };
        }
        
        dailyData[tradeDate].pnl += trade.pnl || 0;
        dailyData[tradeDate].tradeCount += 1;
      });

      setDailyPnLData(Object.values(dailyData));
    } catch (error) {
      console.error('Error fetching daily P&L data:', error);
    }
  }, [user, currentMonth]);

  const fetchTradingStats = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch recent trades and daily P&L data
      await fetchRecentTrades();
      await fetchDailyPnLData();
      
      // Get current month start date
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Fetch all trades
      const { data: allTrades, error: allTradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id);

      if (allTradesError) {
        console.error('Error fetching all trades:', allTradesError);
        return;
      }

      // Fetch current month trades
      const { data: currentMonthTrades, error: currentMonthError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_date', currentMonthStart.toISOString());

      if (currentMonthError) {
        console.error('Error fetching current month trades:', currentMonthError);
        return;
      }

      // Fetch last month trades
      const { data: lastMonthTrades, error: lastMonthError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_date', lastMonthStart.toISOString())
        .lte('entry_date', lastMonthEnd.toISOString());

      if (lastMonthError) {
        console.error('Error fetching last month trades:', lastMonthError);
        return;
      }

      const trades = allTrades || [];
      const currentMonth = currentMonthTrades || [];
      const lastMonth = lastMonthTrades || [];

      // Calculate statistics
      const totalTrades = trades.length;
      const closedTrades = trades.filter(trade => trade.status === 'closed' && trade.pnl !== null);
      const winningTrades = closedTrades.filter(trade => trade.pnl > 0);
      const losingTrades = closedTrades.filter(trade => trade.pnl < 0);
      const breakEvenTrades = closedTrades.filter(trade => trade.pnl === 0);
      
      const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
      
      const totalPnl = closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      const bestTrade = closedTrades.length > 0 ? Math.max(...closedTrades.map(trade => trade.pnl || 0)) : 0;
      
      // Calculate profit factor
      const totalWins = winningTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0));
      const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;
      
      // Calculate average win/loss
      const avgWinTrade = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
      const avgLossTrade = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
      
      // Calculate day win rate (simplified - using entry dates)
      const tradingDays = new Set(closedTrades.map(trade => trade.entry_date.split('T')[0]));
      const winningDays = new Set();
      tradingDays.forEach(day => {
        const dayTrades = closedTrades.filter(trade => trade.entry_date.split('T')[0] === day);
        const dayPnl = dayTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
        if (dayPnl > 0) winningDays.add(day);
      });
      const dayWinRate = tradingDays.size > 0 ? (winningDays.size / tradingDays.size) * 100 : 0;
      
      const monthlyTrades = currentMonth.length;
      const monthlyChange = lastMonth.length > 0 ? ((monthlyTrades - lastMonth.length) / lastMonth.length) * 100 : 0;

      setStats({
        totalTrades,
        winRate,
        totalPnl,
        bestTrade,
        monthlyChange,
        monthlyTrades,
        profitFactor,
        dayWinRate,
        avgWinTrade,
        avgLossTrade,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        breakEvenTrades: breakEvenTrades.length,
      });
    } catch (error) {
      console.error('Error calculating trading stats:', error);
    } finally {
      setLoading(false);
    }
  }, [user, fetchRecentTrades, fetchDailyPnLData]);

  useEffect(() => {
    fetchTradingStats();
  }, [fetchTradingStats]);

  // Refresh data when screen comes into focus (e.g., after adding a trade)
  useFocusEffect(
    useCallback(() => {
      fetchTradingStats();
    }, [fetchTradingStats])
  );

  // Refetch daily P&L data when current month changes
  useEffect(() => {
    if (user) {
      fetchDailyPnLData();
    }
  }, [currentMonth, fetchDailyPnLData, user]);

  // Listen for screen size changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/signin');
  };

  // Utility functions for formatting
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    return status === 'closed' ? '#10B981' : '#F59E0B';
  };

  const getStatusText = (status: string) => {
    return status === 'closed' ? 'CLOSED' : 'OPEN';
  };

  const getPnLColor = (pnl: number | null) => {
    if (pnl === null) return '#CCCCCC';
    return pnl >= 0 ? '#10B981' : '#EF4444';
  };

  const handleTradePress = (trade: Trade) => {
    router.push(`/trade-details/${trade.id}`);
  };

  // Calendar utility functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getDayPnL = (day: number) => {
    const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      .toISOString().split('T')[0];
    return dailyPnLData.find(data => data.date === dateStr);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Add day headers
    const dayHeaders = dayNames.map(day => (
      <View key={day} style={styles.dayHeader}>
        <Text style={styles.dayHeaderText}>{day}</Text>
      </View>
    ));

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View key={`empty-${i}`} style={styles.calendarDay} />
      );
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayPnL = getDayPnL(day);
      const isToday = new Date().toDateString() === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString();

      days.push(
        <View key={day} style={[styles.calendarDay, isToday && styles.todayDay]}>
          <Text style={[styles.dayNumber, isToday && styles.todayDayNumber]}>
            {day}
          </Text>
          {dayPnL && (
            <View style={[
              styles.pnlIndicator,
              { backgroundColor: dayPnL.pnl >= 0 ? '#10B981' : '#EF4444' }
            ]}>
              <Text style={styles.pnlText}>
                {dayPnL.pnl >= 0 ? '+' : ''}${dayPnL.pnl.toFixed(0)}
              </Text>
              <Text style={styles.tradeCountText}>
                {dayPnL.tradeCount} trade{dayPnL.tradeCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.calendar}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity 
            onPress={() => navigateMonth('prev')}
            style={styles.monthNavButton}
          >
            <Text style={styles.monthNavText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthYearText}>
            {formatMonthYear(currentMonth)}
          </Text>
          <TouchableOpacity 
            onPress={() => navigateMonth('next')}
            style={styles.monthNavButton}
          >
            <Text style={styles.monthNavText}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.dayHeadersRow}>
          {dayHeaders}
        </View>
        <View style={styles.daysGrid}>
          {days}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.welcomeText}>
                Welcome back!
              </Text>
              <Text style={styles.emailText}>
                {user?.email}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSignOut}
              style={styles.signOutButton}
            >
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E5E5E5" />
              <Text style={styles.loadingText}>Loading statistics...</Text>
            </View>
          ) : (
            <>
              {/* First Row */}
              <View style={styles.statsRow}>
                {/* Net P&L */}
                <View style={styles.statCard}>
                  <View style={styles.statHeader}>
                    <Text style={styles.statLabel}>Net P&L</Text>
                    <View style={styles.infoIcon}>
                      <Text style={styles.infoIconText}>i</Text>
                    </View>
                  </View>
                  <Text style={[styles.statValue, { color: stats.totalPnl >= 0 ? '#10B981' : '#EF4444' }]}>
                    ${stats.totalPnl.toFixed(2)}
                  </Text>
                  <Text style={styles.statSubtext}>{stats.totalTrades}</Text>
                </View>

                {/* Trade Win % */}
                <View style={styles.statCard}>
                  <View style={styles.statHeader}>
                    <Text style={styles.statLabel}>Trade win %</Text>
                    <View style={styles.infoIcon}>
                      <Text style={styles.infoIconText}>i</Text>
                    </View>
                  </View>
                  <View style={styles.chartContainer}>
                    <CircularProgress 
                      percentage={stats.winRate} 
                      size={80} 
                      strokeWidth={8}
                      color={stats.winRate >= 50 ? '#10B981' : '#EF4444'}
                    />
                    <Text style={styles.chartCenterText}>{stats.winRate.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.chartLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                      <Text style={styles.legendText}>{stats.winningTrades}</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#333333' }]} />
                      <Text style={styles.legendText}>{stats.breakEvenTrades}</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                      <Text style={styles.legendText}>{stats.losingTrades}</Text>
                    </View>
                  </View>
                </View>

                {/* Profit Factor */}
                <View style={styles.statCard}>
                  <View style={styles.statHeader}>
                    <Text style={styles.statLabel}>Profit factor</Text>
                    <View style={styles.infoIcon}>
                      <Text style={styles.infoIconText}>i</Text>
                    </View>
                  </View>
                  <View style={styles.chartContainer}>
                    <CircularProgress 
                      percentage={Math.min(stats.profitFactor * 25, 100)} 
                      size={80} 
                      strokeWidth={8}
                      color={stats.profitFactor >= 1 ? '#10B981' : '#EF4444'}
                    />
                    <Text style={styles.chartCenterText}>{stats.profitFactor.toFixed(2)}</Text>
                  </View>
                </View>
              </View>

              {/* Second Row */}
              <View style={styles.statsRow}>
                {/* Day Win % */}
                <View style={styles.statCard}>
                  <View style={styles.statHeader}>
                    <Text style={styles.statLabel}>Day win %</Text>
                    <View style={styles.infoIcon}>
                      <Text style={styles.infoIconText}>i</Text>
                    </View>
                  </View>
                  <Text style={styles.statValue}>{stats.dayWinRate.toFixed(1)}%</Text>
                  <View style={styles.chartContainer}>
                    <CircularProgress 
                      percentage={stats.dayWinRate} 
                      size={60} 
                      strokeWidth={6}
                      color={stats.dayWinRate >= 50 ? '#10B981' : '#EF4444'}
                    />
                  </View>
                </View>

                {/* Avg Win/Loss Trade */}
                <View style={[styles.statCard, styles.wideCard]}>
                  <View style={styles.statHeader}>
                    <Text style={styles.statLabel}>Avg win/loss trade</Text>
                    <View style={styles.infoIcon}>
                      <Text style={styles.infoIconText}>i</Text>
                    </View>
                  </View>
                  <Text style={styles.statValue}>{(stats.avgWinTrade / Math.abs(stats.avgLossTrade) || 0).toFixed(2)}</Text>
                  <View style={styles.barChartContainer}>
                    <HorizontalBarChart 
                      winAmount={stats.avgWinTrade}
                      lossAmount={stats.avgLossTrade}
                      width={180}
                      height={16}
                    />
                    <View style={styles.barChartLabels}>
                      <Text style={styles.winLabel}>${stats.avgWinTrade.toFixed(0)}</Text>
                      <Text style={styles.lossLabel}>-${Math.abs(stats.avgLossTrade).toFixed(0)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </>
          )}


          {/* Calendar and Recent Trades Container */}
          <View style={[
            styles.responsiveContainer,
            screenWidth > 768 && {
              flexDirection: 'row',
              gap: 24,
            }
          ]}>
            {/* Trading Calendar */}
            <View style={[
              styles.section, 
              styles.calendarSection,
              screenWidth > 768 && { flex: 1 }
            ]}>
              <Text style={styles.sectionTitle}>
                Trading Calendar
              </Text>
              {loading ? (
                <View style={styles.calendarCard}>
                  <ActivityIndicator size="small" color="#E5E5E5" />
                  <Text style={styles.emptyText}>Loading calendar...</Text>
                </View>
              ) : (
                <View style={styles.calendarCard}>
                  {renderCalendar()}
                </View>
              )}
            </View>

            {/* Recent Trades */}
            <View style={[
              styles.section, 
              styles.recentTradesSection,
              screenWidth > 768 && { flex: 1 }
            ]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Recent Trades
              </Text>
              <TouchableOpacity 
                onPress={() => router.push('/(tabs)/trades')}
                style={styles.viewAllLink}
              >
                <Text style={styles.viewAllLinkText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {loading ? (
              <View style={styles.recentTradesCard}>
                <ActivityIndicator size="small" color="#E5E5E5" />
                <Text style={styles.emptyText}>Loading recent trades...</Text>
              </View>
            ) : recentTrades.length === 0 ? (
              <View style={styles.recentTradesCard}>
                <Text style={styles.emptyText}>
                  No trades recorded yet
                </Text>
                <Text style={styles.emptySubtext}>
                  Start by adding your first trade
                </Text>
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => router.push('/add-trade')}
                >
                  <Text style={styles.viewAllButtonText}>Add Trade</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.recentTradesCard}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={styles.headerText}>Open Date</Text>
                  <Text style={styles.headerText}>Symbol</Text>
                  <Text style={styles.headerText}>Status</Text>
                  <Text style={styles.headerText}>Entry Price</Text>
                  <Text style={styles.headerText}>Exit Price</Text>
                  <Text style={styles.headerText}>P&L</Text>
                </View>
                
                {/* Trade Rows */}
                {recentTrades.map((trade) => (
                  <TouchableOpacity
                    key={trade.id}
                    style={styles.tradeRow}
                    onPress={() => handleTradePress(trade)}
                  >
                    <Text style={styles.cellText}>{formatDate(trade.entry_date)}</Text>
                    <Text style={styles.cellText}>{trade.symbol}</Text>
                    
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trade.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(trade.status)}</Text>
                    </View>
                    
                    <Text style={styles.cellText}>{formatPrice(trade.entry_price)}</Text>
                    <Text style={styles.cellText}>
                      {trade.exit_price ? formatPrice(trade.exit_price) : '-'}
                    </Text>
                    <Text style={[styles.cellText, { color: getPnLColor(trade.pnl) }]}>
                      {trade.pnl !== null ? formatPrice(trade.pnl) : '-'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
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
    backgroundColor: '#000000',
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
    color: '#E5E5E5',
  },
  emailText: {
    color: '#CCCCCC',
    marginTop: 4,
  },
  signOutButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signOutText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  wideCard: {
    flex: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '500',
  },
  infoIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoIconText: {
    color: '#CCCCCC',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E5E5E5',
    marginBottom: 4,
  },
  statSubtext: {
    color: '#999999',
    fontSize: 14,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    position: 'relative',
  },
  chartCenterText: {
    position: 'absolute',
    color: '#E5E5E5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  legendItem: {
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '500',
  },
  barChartContainer: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  barChartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 180,
  },
  winLabel: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '500',
  },
  lossLabel: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#E5E5E5',
    marginBottom: 16,
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
  },
  greenButton: {
    backgroundColor: '#10B981',
  },
  purpleButton: {
    backgroundColor: '#8B5CF6',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 18,
    textAlign: 'center',
  },
  recentTradesCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyText: {
    color: '#999999',
    textAlign: 'center',
    fontSize: 16,
  },
  emptySubtext: {
    color: '#666666',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
  loadingContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  loadingText: {
    color: '#CCCCCC',
    fontSize: 16,
    marginTop: 12,
  },
  viewAllButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
  },
  viewAllButtonText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllLink: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewAllLinkText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '500',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#262626',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  headerText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  tradeRow: {
    flexDirection: 'row',
    backgroundColor: '#0F0F0F',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  cellText: {
    color: '#E5E5E5',
    fontSize: 12,
    flex: 1,
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginHorizontal: 2,
    minWidth: 60,
  },
  statusText: {
    color: '#FFFFFF',
    alignItems: 'center',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Calendar styles
  calendarCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  calendar: {
    width: '100%',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  monthNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthNavText: {
    color: '#E5E5E5',
    fontSize: 20,
    fontWeight: 'bold',
  },
  monthYearText: {
    color: '#E5E5E5',
    fontSize: 20,
    fontWeight: '600',
  },
  dayHeadersRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  dayHeaderText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRadius: 6,
    marginBottom: 6,
  },
  todayDay: {
    backgroundColor: '#262626',
  },
  dayNumber: {
    color: '#E5E5E5',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  todayDayNumber: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  pnlIndicator: {
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 3,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
    width: '95%',
  },
  pnlText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 12,
  },
  tradeCountText: {
    color: '#FFFFFF',
    fontSize: 8,
    textAlign: 'center',
    opacity: 0.9,
    marginTop: 1,
  },
  // Responsive layout styles
  responsiveContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  calendarSection: {
    width: '100%',
  },
  recentTradesSection: {
    width: '100%',
  },
});
