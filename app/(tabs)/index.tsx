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
  screenshot_url: string | null;
  created_at: string;
  updated_at: string;
}

interface DailyPnL {
  date: string;
  pnl: number;
  tradeCount: number;
}

interface PnLDataPoint {
  date: string;
  dailyPnL: number;
  cumulativePnL: number;
}

interface WeeklyPnL {
  weekNumber: number;
  startDate: string;
  endDate: string;
  totalPnL: number;
  tradingDays: number;
}

// Enhanced Circular Progress Component
const CircularProgress = ({ percentage, size = 60, strokeWidth = 6, color = '#10B981', showGlow = true }: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  showGlow?: boolean;
}) => {
  const progressRotation = (percentage / 100) * 360 - 90;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {/* Background Circle */}
      <View 
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: '#333333',
        }}
      />
      
      {/* Progress Circle */}
      <View 
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: 'transparent',
          borderTopColor: color,
          transform: [{ rotate: `${progressRotation}deg` }],
          ...(showGlow && {
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
            elevation: 8,
          }),
        }}
      />
      
      {/* Inner Circle */}
      <View 
        style={{
          position: 'absolute',
          width: size - strokeWidth * 2,
          height: size - strokeWidth * 2,
          borderRadius: (size - strokeWidth * 2) / 2,
          backgroundColor: '#1A1A1A',
          top: strokeWidth,
          left: strokeWidth,
        }}
      />
    </View>
  );
};

// Enhanced Horizontal Bar Chart Component
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
    <View 
      style={{
        flexDirection: 'row',
        width: width,
        height: height,
        borderRadius: height / 2,
        overflow: 'hidden',
        backgroundColor: '#333333',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      {/* Win Bar */}
      <View 
        style={{
          width: winWidth,
          height: height,
          backgroundColor: '#10B981',
          shadowColor: '#10B981',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        }}
      />
      
      {/* Loss Bar */}
      <View 
        style={{
          width: lossWidth,
          height: height,
          backgroundColor: '#EF4444',
          shadowColor: '#EF4444',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        }}
      />
    </View>
  );
};

// Cumulative P&L Area Chart Component
const CumulativePnLChart = ({ data, width = 300, height = 200 }: {
  data: PnLDataPoint[];
  width?: number;
  height?: number;
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#999999', fontSize: 14 }}>No data available</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map(d => d.cumulativePnL));
  const minValue = Math.min(...data.map(d => d.cumulativePnL));
  const range = maxValue - minValue;
  const padding = 60; // Increased padding for better label positioning

  const getY = (value: number) => {
    if (range === 0) return height / 2;
    return height - padding - ((value - minValue) / range) * (height - 2 * padding);
  };

  const getX = (index: number) => {
    return padding + (index / (data.length - 1)) * (width - 2 * padding);
  };

  return (
    <View style={{ width, height, position: 'relative' }}>
      {/* Grid lines */}
      <View style={{
        position: 'absolute',
        top: padding,
        left: padding,
        right: padding,
        bottom: padding,
        borderWidth: 1,
        borderColor: '#333333',
      }}>
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              top: ratio * (height - 2 * padding),
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: '#333333',
              opacity: 0.3,
            }}
          />
        ))}
      </View>


      {/* Line */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}>
        {data.map((point, index) => {
          if (index === 0) return null;
          const prevPoint = data[index - 1];
          const x1 = getX(index - 1);
          const y1 = getY(prevPoint.cumulativePnL);
          const x2 = getX(index);
          const y2 = getY(point.cumulativePnL);
          
          return (
            <View
              key={index}
              style={{
                position: 'absolute',
                left: x1,
                top: y1,
                width: Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)),
                height: 2,
                backgroundColor: '#FFFFFF',
                transform: [{ rotate: `${Math.atan2(y2 - y1, x2 - x1)}rad` }],
                transformOrigin: '0 0',
              }}
            />
          );
        })}
      </View>

      {/* Interactive touch points */}
      {data.map((point, index) => {
        const x = getX(index);
        const y = getY(point.cumulativePnL);
        
        return (
          <TouchableOpacity
            key={`touch-${index}`}
            style={{
              position: 'absolute',
              left: x - 8,
              top: y - 8,
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: hoveredIndex === index ? '#FFFFFF' : 'transparent',
              borderWidth: 2,
              borderColor: '#FFFFFF',
              zIndex: 10,
            }}
            onPressIn={() => setHoveredIndex(index)}
            onPressOut={() => setHoveredIndex(null)}
          />
        );
      })}

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <View style={{
          position: 'absolute',
          left: getX(hoveredIndex) - 50,
          top: getY(data[hoveredIndex].cumulativePnL) - 40,
          backgroundColor: '#1A1A1A',
          padding: 8,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: '#333333',
          zIndex: 20,
        }}>
          <Text style={{ color: '#E5E5E5', fontSize: 12, fontWeight: '600' }}>
            {new Date(data[hoveredIndex].date).toLocaleDateString()}
          </Text>
          <Text style={{ color: '#FFFFFF', fontSize: 12 }}>
            ${data[hoveredIndex].cumulativePnL.toFixed(2)}
          </Text>
        </View>
      )}

      {/* Y-axis labels */}
      <View style={{ position: 'absolute', left: 0, top: padding, bottom: padding, width: padding }}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const value = minValue + (1 - ratio) * range;
          return (
            <Text
              key={i}
              style={{
                position: 'absolute',
                top: ratio * (height - 2 * padding) - 8,
                right: 4,
                color: '#999999',
                fontSize: 10,
              }}
            >
              ${value.toFixed(0)}
            </Text>
          );
        })}
      </View>

      {/* X-axis labels */}
      <View style={{ position: 'absolute', left: padding, right: padding, bottom: 0, height: padding }}>
        {data.filter((_, i) => i % Math.ceil(data.length / 4) === 0).map((point, i) => {
          const index = i * Math.ceil(data.length / 4);
          const x = getX(index);
          return (
            <Text
              key={i}
              style={{
                position: 'absolute',
                left: x - 30,
                top: 4,
                color: '#999999',
                fontSize: 10,
                width: 60,
                textAlign: 'center',
              }}
            >
              {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          );
        })}
      </View>
    </View>
  );
};

// Daily P&L Bar Chart Component
const DailyPnLChart = ({ data, width = 300, height = 200 }: {
  data: PnLDataPoint[];
  width?: number;
  height?: number;
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#999999', fontSize: 14 }}>No data available</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map(d => Math.abs(d.dailyPnL)));
  const padding = 60; // Increased padding for better label positioning
  const barWidth = (width - 2 * padding) / data.length;

  const getBarHeight = (value: number) => {
    if (maxValue === 0) return 0;
    return (Math.abs(value) / maxValue) * (height - 2 * padding);
  };

  const getBarY = (value: number) => {
    const barHeight = getBarHeight(value);
    const zeroLine = height - padding - (height - 2 * padding) / 2;
    return value >= 0 ? zeroLine - barHeight : zeroLine;
  };

  return (
    <View style={{ width, height, position: 'relative' }}>
      {/* Grid lines */}
      <View style={{
        position: 'absolute',
        top: padding,
        left: padding,
        right: padding,
        bottom: padding,
        borderWidth: 1,
        borderColor: '#333333',
      }}>
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              top: ratio * (height - 2 * padding),
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: '#333333',
              opacity: 0.3,
            }}
          />
        ))}
        {/* Zero line */}
        <View
          style={{
            position: 'absolute',
            top: (height - 2 * padding) / 2,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: '#666666',
            opacity: 0.5,
          }}
        />
      </View>

      {/* Bars */}
      {data.map((point, index) => {
        const barHeight = getBarHeight(point.dailyPnL);
        const barY = getBarY(point.dailyPnL);
        const x = padding + index * barWidth;
        
        return (
          <TouchableOpacity
            key={index}
            style={{
              position: 'absolute',
              left: x,
              top: barY,
              width: barWidth * 0.8,
              height: barHeight,
              backgroundColor: point.dailyPnL >= 0 ? '#10B981' : '#EF4444',
              opacity: hoveredIndex === index ? 1.0 : 0.8,
              zIndex: 5,
            }}
            onPressIn={() => setHoveredIndex(index)}
            onPressOut={() => setHoveredIndex(null)}
          />
        );
      })}

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <View style={{
          position: 'absolute',
          left: padding + hoveredIndex * barWidth - 50,
          top: getBarY(data[hoveredIndex].dailyPnL) - 40,
          backgroundColor: '#1A1A1A',
          padding: 8,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: '#333333',
          zIndex: 20,
        }}>
          <Text style={{ color: '#E5E5E5', fontSize: 12, fontWeight: '600' }}>
            {new Date(data[hoveredIndex].date).toLocaleDateString()}
          </Text>
          <Text style={{ 
            color: data[hoveredIndex].dailyPnL >= 0 ? '#10B981' : '#EF4444', 
            fontSize: 12 
          }}>
            ${data[hoveredIndex].dailyPnL.toFixed(2)}
          </Text>
        </View>
      )}

      {/* Y-axis labels */}
      <View style={{ position: 'absolute', left: 0, top: padding, bottom: padding, width: padding }}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const value = (1 - ratio) * maxValue;
          return (
            <Text
              key={i}
              style={{
                position: 'absolute',
                top: ratio * (height - 2 * padding) - 8,
                right: 4,
                color: '#999999',
                fontSize: 10,
              }}
            >
              ${value.toFixed(0)}
            </Text>
          );
        })}
      </View>

      {/* X-axis labels */}
      <View style={{ position: 'absolute', left: padding, right: padding, bottom: 0, height: padding }}>
        {data.filter((_, i) => i % Math.ceil(data.length / 4) === 0).map((point, i) => {
          const index = i * Math.ceil(data.length / 4);
          const x = padding + index * barWidth;
          return (
            <Text
              key={i}
              style={{
                position: 'absolute',
                left: x - 30,
                top: 4,
                color: '#999999',
                fontSize: 10,
                width: 60,
                textAlign: 'center',
              }}
            >
              {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          );
        })}
      </View>
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
  const [pnlChartData, setPnLChartData] = useState<PnLDataPoint[]>([]);
  const [weeklyPnLData, setWeeklyPnLData] = useState<WeeklyPnL[]>([]);
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

  const fetchPnLChartData = useCallback(async () => {
    if (!user) return;

    try {
      // Get all closed trades from the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'closed')
        .gte('entry_date', sixMonthsAgo.toISOString())
        .not('pnl', 'is', null)
        .order('entry_date', { ascending: true });

      if (error) {
        console.error('Error fetching P&L chart data:', error);
        return;
      }

      // Group trades by date and calculate daily P&L
      const dailyData: { [key: string]: number } = {};
      
      (data || []).forEach(trade => {
        const tradeDate = new Date(trade.entry_date).toISOString().split('T')[0];
        dailyData[tradeDate] = (dailyData[tradeDate] || 0) + (trade.pnl || 0);
      });

      // Convert to array and calculate cumulative P&L
      const sortedDates = Object.keys(dailyData).sort();
      let cumulativePnL = 0;
      const chartData: PnLDataPoint[] = [];

      sortedDates.forEach(date => {
        const dailyPnL = dailyData[date];
        cumulativePnL += dailyPnL;
        chartData.push({
          date,
          dailyPnL,
          cumulativePnL
        });
      });

      setPnLChartData(chartData);
    } catch (error) {
      console.error('Error in fetchPnLChartData:', error);
    }
  }, [user]);

  const fetchWeeklyPnLData = useCallback(async () => {
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
        console.error('Error fetching weekly P&L data:', error);
        return;
      }

      // Create all weeks for the selected month only
      const weeklyData: WeeklyPnL[] = [];
      
      // Calculate total weeks needed (some months can have 6 weeks)
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const firstWeekStart = new Date(firstDayOfMonth);
      firstWeekStart.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay()); // Start of first week (Sunday)
      const lastWeekEnd = new Date(lastDayOfMonth);
      lastWeekEnd.setDate(lastDayOfMonth.getDate() + (6 - lastDayOfMonth.getDay())); // End of last week (Saturday)
      const totalWeeks = Math.ceil((lastWeekEnd.getTime() - firstWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));


      for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
        const weekStart = new Date(firstWeekStart);
        weekStart.setDate(firstWeekStart.getDate() + (weekNum - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        // Initialize week data
        const weekData: WeeklyPnL = {
          weekNumber: weekNum,
          startDate: weekStart.toISOString().split('T')[0],
          endDate: weekEnd.toISOString().split('T')[0],
          totalPnL: 0,
          tradingDays: 0
        };

        // Calculate P&L and trading days for this week
        const tradingDays = new Set();
        (data || []).forEach(trade => {
          const tradeDate = new Date(trade.entry_date);
          const tradeDateStr = tradeDate.toISOString().split('T')[0];
          
          // Check if trade falls within this week
          if (tradeDate >= weekStart && tradeDate <= weekEnd) {
            weekData.totalPnL += trade.pnl || 0;
            tradingDays.add(tradeDateStr);
          }
        });

        weekData.tradingDays = tradingDays.size;
        weeklyData.push(weekData);
      }

      setWeeklyPnLData(weeklyData);
    } catch (error) {
      console.error('Error in fetchWeeklyPnLData:', error);
    }
  }, [user, currentMonth]);

  const fetchTradingStats = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch recent trades, daily P&L data, chart data, and weekly P&L data
      await fetchRecentTrades();
      await fetchDailyPnLData();
      await fetchPnLChartData();
      await fetchWeeklyPnLData();
      
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
  }, [user, fetchRecentTrades, fetchDailyPnLData, fetchPnLChartData, fetchWeeklyPnLData]);

  useEffect(() => {
    fetchTradingStats();
  }, [fetchTradingStats]);

  // Refresh data when screen comes into focus (e.g., after adding a trade)
  useFocusEffect(
    useCallback(() => {
      fetchTradingStats();
    }, [fetchTradingStats])
  );

  // Refetch daily P&L data and weekly P&L data when current month changes
  useEffect(() => {
    if (user) {
      fetchDailyPnLData();
      fetchWeeklyPnLData();
    }
  }, [currentMonth, fetchDailyPnLData, fetchWeeklyPnLData, user]);

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
        <View 
          key={day} 
          style={[
            styles.calendarDay, 
            isToday && styles.todayDay,
            dayPnL && {
              backgroundColor: dayPnL.pnl >= 0 ? '#10B981' : '#EF4444',
              borderRadius: 8,
            }
          ]}
        >
          <Text style={[
            styles.dayNumber, 
            isToday && styles.todayDayNumber,
            dayPnL && { color: '#FFFFFF', fontWeight: 'bold' }
          ]}>
            {day}
          </Text>
          {dayPnL && (
            <View style={styles.pnlContainer}>
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
              <View style={[
                styles.statsRow,
                screenWidth > 768 && { flexDirection: 'row', gap: 16 }
              ]}>
                {/* Net P&L */}
                <View style={[styles.statCard, styles.enhancedCard]}>
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
                <View style={[styles.statCard, styles.enhancedCard]}>
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
                      showGlow={true}
                    />
                    <Text style={styles.chartCenterText}>
                      {stats.winRate.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.chartLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                      <Text style={styles.legendText}>{stats.winningTrades}</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#666666' }]} />
                      <Text style={styles.legendText}>{stats.breakEvenTrades}</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                      <Text style={styles.legendText}>{stats.losingTrades}</Text>
                    </View>
                  </View>
                </View>

                {/* Profit Factor */}
                <View style={[styles.statCard, styles.enhancedCard]}>
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
                      showGlow={true}
                    />
                    <Text style={styles.chartCenterText}>
                      {stats.profitFactor.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Second Row */}
              <View style={[
                styles.statsRow,
                screenWidth > 768 && { flexDirection: 'row', gap: 16 }
              ]}>
                {/* Day Win % */}
                <View style={[styles.statCard, styles.enhancedCard]}>
                  <View style={styles.statHeader}>
                    <Text style={styles.statLabel}>Day win %</Text>
                    <View style={styles.infoIcon}>
                      <Text style={styles.infoIconText}>i</Text>
                    </View>
                  </View>
                  <Text style={styles.statValue}>
                    {stats.dayWinRate.toFixed(1)}%
                  </Text>
                  <View style={styles.chartContainer}>
                    <CircularProgress 
                      percentage={stats.dayWinRate} 
                      size={60} 
                      strokeWidth={6}
                      color={stats.dayWinRate >= 50 ? '#10B981' : '#EF4444'}
                      showGlow={true}
                    />
                  </View>
                </View>

                {/* Avg Win/Loss Trade */}
                <View style={[styles.statCard, styles.enhancedCard, styles.wideCard]}>
                  <View style={styles.statHeader}>
                    <Text style={styles.statLabel}>Avg win/loss trade</Text>
                    <View style={styles.infoIcon}>
                      <Text style={styles.infoIconText}>i</Text>
                    </View>
                  </View>
                  <Text style={styles.statValue}>
                    {Math.abs(stats.avgLossTrade) > 0 ? (stats.avgWinTrade / Math.abs(stats.avgLossTrade)).toFixed(2) : 'Infinity'}
                  </Text>
                  <View style={styles.barChartContainer}>
                    <HorizontalBarChart 
                      winAmount={stats.avgWinTrade}
                      lossAmount={stats.avgLossTrade}
                      width={200}
                      height={20}
                    />
                    <View style={styles.barChartLabels}>
                      <Text style={styles.winLabel}>
                        ${stats.avgWinTrade.toFixed(0)}
                      </Text>
                      <Text style={styles.lossLabel}>
                        -${Math.abs(stats.avgLossTrade).toFixed(0)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* P&L Charts Section */}
          <View style={[
            styles.responsiveContainer,
            screenWidth > 768 && {
              flexDirection: 'row',
              gap: 24,
            }
          ]}>
            {/* Daily net cumulative P&L Chart */}
            <View style={[
              styles.section,
              styles.chartSection,
              screenWidth > 768 && { flex: 1 }
            ]}>
              <View style={styles.chartHeader}>
                <Text style={styles.sectionTitle}>
                  Daily net cumulative P&L
                </Text>
                <Text style={styles.chartInfoIcon}>ⓘ</Text>
              </View>
              <View style={styles.chartCard}>
                <CumulativePnLChart 
                  data={pnlChartData} 
                  width={screenWidth > 768 ? (screenWidth - 200) / 2 : screenWidth - 140}
                  height={screenWidth > 768 ? 260 : 160}
                />
              </View>
            </View>

            {/* Net daily P&L Chart */}
            <View style={[
              styles.section,
              styles.chartSection,
              screenWidth > 768 && { flex: 1 }
            ]}>
              <View style={styles.chartHeader}>
                <Text style={styles.sectionTitle}>
                  Net daily P&L
                </Text>
                <Text style={styles.chartInfoIcon}>ⓘ</Text>
              </View>
              <View style={styles.chartCard}>
                <DailyPnLChart 
                  data={pnlChartData} 
                  width={screenWidth > 768 ? (screenWidth - 200) / 2 : screenWidth - 140}
                  height={screenWidth > 768 ? 260 : 160}
                />
              </View>
            </View>
          </View>

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

              {/* Weekly P&L Cards */}
              <View style={[
                styles.weeklyCardsContainer,
                screenWidth > 768 && styles.weeklyCardsHorizontal
              ]}>
                {weeklyPnLData.map((week) => (
                  <View key={week.weekNumber} style={styles.weeklyCard}>
                    <Text style={styles.weeklyCardTitle}>Week {week.weekNumber}</Text>
                    <Text style={[
                      styles.weeklyCardPnL,
                      { color: week.totalPnL >= 0 ? '#10B981' : '#EF4444' }
                    ]}>
                      ${week.totalPnL.toFixed(0)}
                    </Text>
                    <Text style={styles.weeklyCardDays}>
                      {week.tradingDays} day{week.tradingDays !== 1 ? 's' : ''}
                    </Text>
                  </View>
                ))}
              </View>
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
  enhancedCard: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
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
    minHeight: 60,
  },
  todayDay: {
    backgroundColor: '#262626',
  },
  dayNumber: {
    color: '#E5E5E5',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  todayDayNumber: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  pnlContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
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
  // Chart styles
  chartSection: {
    width: '100%',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chartInfoIcon: {
    fontSize: 16,
    color: '#999999',
    marginLeft: 8,
  },
  chartCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Weekly P&L Cards styles
  weeklyCardsContainer: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 16,
  },
  weeklyCardsHorizontal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  weeklyCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    minWidth: 100,
    flex: 1,
    marginHorizontal: 4,
  },
  weeklyCardTitle: {
    color: '#E5E5E5',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  weeklyCardPnL: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  weeklyCardDays: {
    color: '#8B5CF6',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});
