import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity,
  Dimensions 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useAnalytics, MonthlySpending, SpendingByFolder } from '@/hooks/useAnalytics'; // Add type imports
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: '#007AFF',
  },
};

type TimeframeType = 'month' | 'quarter' | 'year';

export default function AnalyticsScreen() {
  const [timeframe, setTimeframe] = useState<TimeframeType>('month');
  const { analytics, isLoading, error, refetch } = useAnalytics(timeframe);

  // Refresh data when screen becomes focused
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading analytics: {error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  // Prepare chart data
  const monthlyChartData = {
    labels: analytics.monthlySpending.map(item => item.month), // TypeScript now knows the type
    datasets: [{
      data: analytics.monthlySpending.map(item => item.totalAmount),
      color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
      strokeWidth: 2
    }]
  };

  const folderChartData = analytics.spendingByFolder.slice(0, 5).map((item, index) => ({
    name: item.folderName.length > 10 ? item.folderName.substring(0, 10) + '...' : item.folderName,
    population: item.totalAmount,
    color: [
      '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE'
    ][index] || '#007AFF',
    legendFontColor: '#333',
    legendFontSize: 12,
  }));

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent} // Add this
      showsVerticalScrollIndicator={false} // Optional: hide scroll indicator
    >
      {/* Header with timeframe selector */}
      <ThemedView style={styles.header}>
        <ThemedText type="title">Analytics</ThemedText>
        <View style={styles.timeframeSelector}>
          {(['month', 'quarter', 'year'] as TimeframeType[]).map((tf) => (
            <TouchableOpacity
              key={tf}
              style={[styles.timeframeButton, timeframe === tf && styles.activeTimeframeButton]}
              onPress={() => setTimeframe(tf)}
            >
              <Text style={[styles.timeframeButtonText, timeframe === tf && styles.activeTimeframeButtonText]}>
                {tf.charAt(0).toUpperCase() + tf.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ThemedView>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Spent</Text>
          <Text style={styles.summaryValue}>${analytics.totalSpent.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Receipts</Text>
          <Text style={styles.summaryValue}>{analytics.totalReceipts}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Avg Amount</Text>
          <Text style={styles.summaryValue}>${analytics.avgReceiptAmount.toFixed(2)}</Text>
        </View>
      </View>

      {/* Monthly Spending Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Monthly Spending Trend</Text>
        {analytics.monthlySpending.length > 0 ? (
          <LineChart
            data={monthlyChartData}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        ) : (
          <Text style={styles.noDataText}>No monthly data available</Text>
        )}
      </View>

      {/* Spending by Folder */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Top Spending Categories</Text>
        {folderChartData.length > 0 ? (
          <PieChart
            data={folderChartData}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        ) : (
          <Text style={styles.noDataText}>No folder data available</Text>
        )}
      </View>

      {/* Top Expenses List - Fix null date handling */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Top Expenses</Text>
        {analytics.topExpenses.map((expense, index) => (
          <View key={expense.id} style={styles.expenseItem}>
            <View style={styles.expenseRank}>
              <Text style={styles.expenseRankText}>{index + 1}</Text>
            </View>
            <View style={styles.expenseDetails}>
              <Text style={styles.expenseStore}>{expense.storeName}</Text>
              <Text style={styles.expenseFolder}>{expense.folderName}</Text>
              <Text style={styles.expenseDate}>
                {expense.date ? new Date(expense.date).toLocaleDateString() : 'No date'}
              </Text>
            </View>
            <Text style={styles.expenseAmount}>${expense.totalAmount.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Recent Activity - Fix null date handling */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Recent Activity</Text>
        {analytics.recentActivity.slice(0, 5).map((receipt) => (
          <View key={receipt.id} style={styles.activityItem}>
            <View style={styles.activityDetails}>
              <Text style={styles.activityStore}>{receipt.storeName || 'Unknown Store'}</Text>
              <Text style={styles.activityDate}>
                {receipt.date ? new Date(receipt.date).toLocaleDateString() : 'No date'}
              </Text>
            </View>
            <Text style={styles.activityAmount}>${(receipt.totalAmount || 0).toFixed(2)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 100, // Add padding to clear the tab bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  timeframeSelector: {
    flexDirection: 'row',
    marginTop: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTimeframeButton: {
    backgroundColor: '#007AFF',
  },
  timeframeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeTimeframeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  chartContainer: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 10,
    borderRadius: 12,
    padding: 15,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  chart: {
    borderRadius: 8,
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    paddingVertical: 40,
  },
  listContainer: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 12,
    padding: 15,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  expenseRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  expenseRankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseStore: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  expenseFolder: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  expenseDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityDetails: {
    flex: 1,
  },
  activityStore: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  activityDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});