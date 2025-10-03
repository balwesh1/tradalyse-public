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

interface Trade {
  id: string;
  symbol: string;
  side: string;
  trade_type: string;
  asset_type: string;
  entry_price: number;
  exit_price: number | null;
  standard_lot_size: number;
  quantity: number;
  commission: number;
  pnl: number | null;
  status: string;
  entry_date: string;
  exit_date: string | null;
}

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

interface MetricCardProps {
  title: string;
  value: string;
  valueColor?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  valueColor = '#FFFFFF'
}) => (
  <View style={styles.metricCard}>
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

      // Largest losing trade
      const largestLosingTrade = losingTrades.length > 0 
        ? Math.max(...losingTrades.map(trade => trade.pnl)) 
        : 0;

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

  useEffect(() => {
    fetchTradeMetrics();
  }, [fetchTradeMetrics]);

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
          <Text style={styles.sectionTitle}>Trade Section</Text>
          
          <View style={[styles.metricsGrid, isSmallDevice && styles.metricsGridSmall]}>
            {isSmallDevice ? (
              // Two-column layout for small devices
              <>
                <View style={styles.metricsColumn}>
                  <MetricCard
                    title="Win %"
                    value={formatPercentage(tradeMetrics.winPercentage)}
                  />
                  <MetricCard
                    title="Longs win %"
                    value={formatPercentage(tradeMetrics.longsWinPercentage)}
                  />
                  <MetricCard
                    title="Avg net trade P&L"
                    value={formatCurrency(tradeMetrics.avgNetTradePnL)}
                  />
                  <MetricCard
                    title="Avg trade win/loss"
                    value={Math.round(tradeMetrics.avgTradeWinLoss * 100) / 100}
                  />
                  <MetricCard
                    title="Trade expectancy"
                    value={formatCurrency(tradeMetrics.tradeExpectancy)}
                  />
                </View>
                <View style={styles.metricsColumn}>
                  <MetricCard
                    title="Average trading days duration"
                    value={tradeMetrics.avgTradingDaysDuration}
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
                  />
                  <MetricCard
                    title="Longs win %"
                    value={formatPercentage(tradeMetrics.longsWinPercentage)}
                  />
                  <MetricCard
                    title="Avg net trade P&L"
                    value={formatCurrency(tradeMetrics.avgNetTradePnL)}
                  />
                </View>

                {/* Column 2 */}
                <View style={styles.metricsColumn}>
                  <MetricCard
                    title="Avg trade win/loss"
                    value={Math.round(tradeMetrics.avgTradeWinLoss * 100) / 100}
                  />
                  <MetricCard
                    title="Trade expectancy"
                    value={formatCurrency(tradeMetrics.tradeExpectancy)}
                  />
                  <MetricCard
                    title="Average trading days duration"
                    value={tradeMetrics.avgTradingDaysDuration}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
    color: '#94A3B8',
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
    color: '#F8FAFC',
    marginBottom: 24,
  },
  tradeSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F8FAFC',
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
  metricCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 80, // Equal height for all cards
    justifyContent: 'space-between',
  },
  metricTitle: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});