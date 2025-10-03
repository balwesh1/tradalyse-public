import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';


interface TradeMetrics {
  winPercentage: number;
  longsWinPercentage: number;
  avgNetTradePnL: number;
  avgTradeWinLoss: number;
  tradeExpectancy: number;
  avgTradingDaysDuration: string;
  largestProfitableTrade: number;
  largestLosingTrade: number;
}

interface DayMetrics {
  avgDailyWinPercentage: number;
  avgDailyWinLoss: number;
  largestProfitableDay: number;
  avgDailyNetPnL: number;
}

interface MetricCardProps {
  title: string;
  value: string;
  valueColor?: string;
  style?: any;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  valueColor = '#FFFFFF',
  style
}) => (
  <View style={[styles.metricCard, style]}>
    <Text style={styles.metricTitle}>{title}</Text>
    <Text style={[styles.metricValue, { color: valueColor }]}>{value}</Text>
  </View>
);

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [tradeMetrics, setTradeMetrics] = useState<TradeMetrics>({
    winPercentage: 0,
    longsWinPercentage: 0,
    avgNetTradePnL: 0,
    avgTradeWinLoss: 0,
    tradeExpectancy: 0,
    avgTradingDaysDuration: '0h 0m',
    largestProfitableTrade: 0,
    largestLosingTrade: 0,
  });
  const [dayMetrics, setDayMetrics] = useState<DayMetrics>({
    avgDailyWinPercentage: 0,
    avgDailyWinLoss: 0,
    largestProfitableDay: 0,
    avgDailyNetPnL: 0,
  });
  const [loading, setLoading] = useState(true);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  // Get screen dimensions to determine layout
  const isSmallDevice = screenWidth < 768; // Breakpoint for smaller devices

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

  const fetchTradeMetrics = useCallback(async () => {
    if (!user) return;

    try {
      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching trades:', error);
        return;
      }

      if (!trades || trades.length === 0) {
        setLoading(false);
        return;
      }

      // Filter closed trades with valid PnL
      const closedTrades = trades.filter(trade => 
        trade.status === 'closed' && trade.pnl !== null
      );

      if (closedTrades.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate Win %
      const winningTrades = closedTrades.filter(trade => trade.pnl > 0);
      const winPercentage = (winningTrades.length / closedTrades.length) * 100;

      // Calculate Longs Win % (assuming long trades have side = 'buy')
      const longTrades = closedTrades.filter(trade => trade.side === 'buy' || trade.side === 'long');
      const winningLongTrades = longTrades.filter(trade => trade.pnl > 0);
      const longsWinPercentage = longTrades.length > 0 
        ? (winningLongTrades.length / longTrades.length) * 100 
        : 0;

      // Calculate Avg net trade P&L
      const totalPnL = closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      const avgNetTradePnL = totalPnL / closedTrades.length;

      // Calculate Avg trade win/loss (average win / average loss)
      const losingTrades = closedTrades.filter(trade => trade.pnl <= 0);
      const avgWinAmount = winningTrades.length > 0 
        ? winningTrades.reduce((sum, trade) => sum + trade.pnl, 0) / winningTrades.length 
        : 0;
      const avgLossAmount = losingTrades.length > 0 
        ? Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0) / losingTrades.length) 
        : 0;
      const avgTradeWinLoss = avgLossAmount > 0 ? avgWinAmount / avgLossAmount : avgWinAmount;

      // Trade expectancy = (Win % * Avg Win) - (Loss % * Avg Loss)
      const tradeExpectancy = (winningTrades.length / closedTrades.length) * avgWinAmount - 
                            (losingTrades.length / closedTrades.length) * avgLossAmount;

      // Calculate Average trading days duration
      let totalDurationHours = 0;
      let validDurationCount = 0;
      
      closedTrades.forEach(trade => {
        if (trade.exit_date && trade.entry_date) {
          const entryTime = new Date(trade.entry_date).getTime();
          const exitTime = new Date(trade.exit_date).getTime();
          const durationMs = exitTime - entryTime;
          const durationHours = durationMs / (1000 * 60 * 60);
          totalDurationHours += durationHours;
          validDurationCount++;
        }
      });

      const avgDurationHours = validDurationCount > 0 ? totalDurationHours / validDurationCount : 0;
      const hours = Math.floor(avgDurationHours);
      const minutes = Math.round((avgDurationHours - hours) * 60);
      const avgTradingDaysDuration = `${hours}h ${minutes}m`;

      // Largest profitable trade
      const largestProfitableTrade = winningTrades.length > 0 
        ? Math.max(...winningTrades.map(trade => trade.pnl)) 
        : 0;

      // Largest losing trade (most negative PnL = largest loss)
      const largestLosingTrade = losingTrades.length > 0 
        ? Math.min(...losingTrades.map(trade => trade.pnl)) 
        : 0;

      // Debug logging for trade analysis
      console.log('Analytics Debug:', {
        totalClosedTrades: closedTrades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winningPnlValues: winningTrades.map(t => t.pnl),
        losingPnlValues: losingTrades.map(t => t.pnl),
        largestProfitableTrade,
        largestLosingTrade
      });

      setTradeMetrics({
        winPercentage,
        longsWinPercentage,
        avgNetTradePnL,
        avgTradeWinLoss,
        tradeExpectancy,
        avgTradingDaysDuration,
        largestProfitableTrade,
        largestLosingTrade,
      });
    } catch (error) {
      console.error('Error calculating trade metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchDayMetrics = useCallback(async () => {
    if (!user) return;

    try {
      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching trades for day metrics:', error);
        return;
      }

      if (!trades || trades.length === 0) {
        return;
      }

      // Filter closed trades with valid PnL
      const closedTrades = trades.filter(trade => 
        trade.status === 'closed' && trade.pnl !== null && trade.exit_date
      );

      if (closedTrades.length === 0) {
        return;
      }

      // Group trades by exit date to calculate daily PnL
      const dailyPnL: Record<string, number> = {};
      
      closedTrades.forEach(trade => {
        if (trade.exit_date) {
          const day = trade.exit_date.split('T')[0]; // Get YYYY-MM-DD
          dailyPnL[day] = (dailyPnL[day] || 0) + (trade.pnl || 0);
        }
      });

      const dailyValues = Object.values(dailyPnL);
      const tradingDays = Object.keys(dailyPnL).length;

      // Calculate Avg daily win %
      const profitableDays = dailyValues.filter(dayPnL => dayPnL > 0).length;
      const avgDailyWinPercentage = tradingDays > 0 ? (profitableDays / tradingDays) * 100 : 0;

      // Calculate Avg daily win/loss
      const avgProfitableDay = profitableDays > 0 
        ? dailyValues.filter(dayPnL => dayPnL > 0).reduce((sum, dayPnL) => sum + dayPnL, 0) / profitableDays 
        : 0;
      
      const avgLosingDays = tradingDays - profitableDays;
      const avgLosingDay = avgLosingDays > 0 
        ? Math.abs(dailyValues.filter(dayPnL => dayPnL <= 0).reduce((sum, dayPnL) => sum + dayPnL, 0) / avgLosingDays) 
        : 0;
      
      const avgDailyWinLoss = avgLosingDay > 0 ? avgProfitableDay / avgLosingDay : avgProfitableDay;

      // Largest profitable day
      const largestProfitableDay = dailyValues.length > 0 ? Math.max(...dailyValues.filter(dayPnL => dayPnL > 0), 0) : 0;

      // Avg daily net P&L
      const totalDailyPnL = dailyValues.reduce((sum, dayPnL) => sum + dayPnL, 0);
      const avgDailyNetPnL = tradingDays > 0 ? totalDailyPnL / tradingDays : 0;

      setDayMetrics({
        avgDailyWinPercentage,
        avgDailyWinLoss,
        largestProfitableDay,
        avgDailyNetPnL,
      });
    } catch (error) {
      console.error('Error calculating day metrics:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchTradeMetrics();
    fetchDayMetrics();
  }, [fetchTradeMetrics, fetchDayMetrics]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 10) / 10}%`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Analytics Dashboard</Text>
        
        <View style={styles.tradeSection}>
          <Text style={styles.sectionTitle}>Trade Metrics</Text>
          
          <View style={[styles.metricsGrid, isSmallDevice && styles.metricsGridSmall]}>
            {isSmallDevice ? (
              // Two-column layout for small devices
              <>
                <View style={styles.metricsColumn}>
                  <MetricCard
                    title="Win %"
                    value={formatPercentage(tradeMetrics.winPercentage)}
                    valueColor={tradeMetrics.winPercentage >= 50 ? "#10B981" : "#EF4444"}
                  />
                  <MetricCard
                    title="Longs win %"
                    value={formatPercentage(tradeMetrics.longsWinPercentage)}
                    valueColor={tradeMetrics.longsWinPercentage >= 50 ? "#10B981" : "#EF4444"}
                  />
                  <MetricCard
                    title="Avg net trade P&L"
                    value={formatCurrency(tradeMetrics.avgNetTradePnL)}
                    valueColor={tradeMetrics.avgNetTradePnL >= 0 ? "#10B981" : "#EF4444"}
                  />
                  <MetricCard
                    title="Avg trade win/loss"
                    value={String(Math.round(tradeMetrics.avgTradeWinLoss * 100) / 100)}
                    valueColor={tradeMetrics.avgTradeWinLoss >= 1 ? "#10B981" : tradeMetrics.avgTradeWinLoss > 0.5 ? "#FFB020" : "#EF4444"}
                  />
                  <MetricCard
                    title="Trade expectancy"
                    value={formatCurrency(tradeMetrics.tradeExpectancy)}
                    valueColor={tradeMetrics.tradeExpectancy >= 0 ? "#10B981" : "#EF4444"}
                  />
                </View>
                <View style={styles.metricsColumn}>
                  <MetricCard
                    title="Average trading days duration"
                    value={tradeMetrics.avgTradingDaysDuration}
                    valueColor="#FFB020"
                  />
                  <MetricCard
                    title="Largest profitable trade"
                    value={formatCurrency(tradeMetrics.largestProfitableTrade)}
                    valueColor="#10B981"
                  />
                  <MetricCard
                    title="Largest losing trade"
                    value={formatCurrency(tradeMetrics.largestLosingTrade)}
                    valueColor="#EF4444"
                  />
                </View>
              </>
            ) : (
              // Three-column layout for larger devices
              <>
                {/* Column 1 */}
                <View style={styles.metricsColumn}>
                  <MetricCard
                    title="Win %"
                    value={formatPercentage(tradeMetrics.winPercentage)}
                    valueColor={tradeMetrics.winPercentage >= 50 ? "#10B981" : "#EF4444"}
                  />
                  <MetricCard
                    title="Longs win %"
                    value={formatPercentage(tradeMetrics.longsWinPercentage)}
                    valueColor={tradeMetrics.longsWinPercentage >= 50 ? "#10B981" : "#EF4444"}
                  />
                  <MetricCard
                    title="Avg net trade P&L"
                    value={formatCurrency(tradeMetrics.avgNetTradePnL)}
                    valueColor={tradeMetrics.avgNetTradePnL >= 0 ? "#10B981" : "#EF4444"}
                  />
                </View>

                {/* Column 2 */}
                <View style={styles.metricsColumn}>
                  <MetricCard
                    title="Avg trade win/loss"
                    value={String(Math.round(tradeMetrics.avgTradeWinLoss * 100) / 100)}
                    valueColor={tradeMetrics.avgTradeWinLoss >= 1 ? "#10B981" : tradeMetrics.avgTradeWinLoss > 0.5 ? "#FFB020" : "#EF4444"}
                  />
                  <MetricCard
                    title="Trade expectancy"
                    value={formatCurrency(tradeMetrics.tradeExpectancy)}
                    valueColor={tradeMetrics.tradeExpectancy >= 0 ? "#10B981" : "#EF4444"}
                  />
                  <MetricCard
                    title="Average trading days duration"
                    value={tradeMetrics.avgTradingDaysDuration}
                    valueColor="#FFB020"
                  />
              </View>

                {/* Column 3 */}
                <View style={styles.metricsColumn}>
                  <MetricCard
                    title="Largest profitable trade"
                    value={formatCurrency(tradeMetrics.largestProfitableTrade)}
                    valueColor="#10B981"
                  />
                  <MetricCard
                    title="Largest losing trade"
                    value={formatCurrency(tradeMetrics.largestLosingTrade)}
                    valueColor="#EF4444"
                  />
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.daySection}>
          <Text style={styles.sectionTitle}>Day Metrics</Text>
          
          <View style={[styles.dayMetricsGrid, isSmallDevice && styles.dayMetricsGridSmall]}>
            {isSmallDevice ? (
              // Two-column layout for small devices (2 columns x 2 rows)
              <>
                <View style={styles.dayMetricsColumn}>
                  <MetricCard
                    title="Avg daily win %"
                    value={formatPercentage(dayMetrics.avgDailyWinPercentage)}
                    valueColor={dayMetrics.avgDailyWinPercentage >= 50 ? "#10B981" : "#EF4444"}
                  />
                  <MetricCard
                    title="Avg daily win/loss"
                    value={String(Math.round(dayMetrics.avgDailyWinLoss * 100) / 100)}
                    valueColor={dayMetrics.avgDailyWinLoss >= 1 ? "#10B981" : dayMetrics.avgDailyWinLoss > 0.5 ? "#FFB020" : "#EF4444"}
                  />
                </View>
                <View style={styles.dayMetricsColumn}>
                  <MetricCard
                    title="Largest profitable day"
                    value={formatCurrency(dayMetrics.largestProfitableDay)}
                    valueColor="#10B981"
                  />
                  <MetricCard
                    title="Avg daily net P&L"
                    value={formatCurrency(dayMetrics.avgDailyNetPnL)}
                    valueColor={dayMetrics.avgDailyNetPnL >= 0 ? "#10B981" : "#EF4444"}
                  />
                </View>
              </>
            ) : (
              // Three-column layout for larger devices (3 cards + 1 card centered)
              <>
                {/* Row 1: 3 cards */}
                <View style={styles.dayMetricsRow}>
                  <MetricCard
                    title="Avg daily win %"
                    value={formatPercentage(dayMetrics.avgDailyWinPercentage)}
                    valueColor={dayMetrics.avgDailyWinPercentage >= 50 ? "#10B981" : "#EF4444"}
                    style={styles.flexMetricCard}
                  />
                  <MetricCard
                    title="Avg daily win/loss"
                    value={String(Math.round(dayMetrics.avgDailyWinLoss * 100) / 100)}
                    valueColor={dayMetrics.avgDailyWinLoss >= 1 ? "#10B981" : dayMetrics.avgDailyWinLoss > 0.5 ? "#FFB020" : "#EF4444"}
                    style={styles.flexMetricCard}
                  />
                  <MetricCard
                    title="Largest profitable day"
                    value={formatCurrency(dayMetrics.largestProfitableDay)}
                    valueColor="#10B981"
                    style={styles.flexMetricCard}
                  />
                </View>
                
                {/* Row 2: 1 centered card */}
                <View style={styles.dayMetricsRow}>
                  <MetricCard
                    title="Avg daily net P&L"
                    value={formatCurrency(dayMetrics.avgDailyNetPnL)}
                    valueColor={dayMetrics.avgDailyNetPnL >= 0 ? "#10B981" : "#EF4444"}
                    style={styles.flexMetricCard}
                  />
                </View>
              </>
            )}
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
  scrollContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#CCCCCC',
    marginTop: 12,
    fontSize: 16,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 16,
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E5E5E5',
    marginBottom: 24,
  },
  tradeSection: {
    marginTop: 24,
  },
  daySection: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#E5E5E5',
    marginBottom: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 24,
  },
  metricsGridSmall: {
    gap: 16,
  },
  metricsColumn: {
    flex: 1,
    gap: 20,
  },
  dayMetricsGrid: {
    flexDirection: 'column',
    width: '100%',
    gap: 20,
  },
  dayMetricsGridSmall: {
    gap: 16,
  },
  dayMetricsColumn: {
    flex: 1,
    gap: 20,
  },
  dayMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
    width: '100%',
  },
  metricCard: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    minHeight: 80, // Equal height for all cards
    justifyContent: 'space-between',
  },
  flexMetricCard: {
    flex: 1,
  },
  metricTitle: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  metricValue: {
    color: '#E5E5E5',
    fontSize: 18,
    fontWeight: '600',
  },
});