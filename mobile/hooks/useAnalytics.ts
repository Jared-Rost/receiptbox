import { useState, useEffect, useCallback } from 'react';
import { Receipt } from '@/data/models/Receipt';
import { Folder } from '@/data/models/Folder';
import * as ReceiptService from '@/services/ReceiptService';
import * as FolderService from '@/services/FolderService';

export interface SpendingByFolder {
  folderId: number | null;
  folderName: string;
  totalAmount: number;
  receiptCount: number;
}

export interface MonthlySpending {
  month: string;
  totalAmount: number;
  receiptCount: number;
}

export interface TopExpense {
  id: number;
  storeName: string;
  totalAmount: number;
  date: string;
  folderName: string;
}

export interface AnalyticsData {
  totalSpent: number;
  totalReceipts: number;
  avgReceiptAmount: number;
  spendingByFolder: SpendingByFolder[];
  monthlySpending: MonthlySpending[];
  topExpenses: TopExpense[];
  recentActivity: Receipt[];
}

export const useAnalytics = (timeframe: 'month' | 'quarter' | 'year' = 'month') => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const calculateDateRange = useCallback(() => {
    const now = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return { startDate: startDate.toISOString(), endDate: now.toISOString() };
  }, [timeframe]);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { startDate, endDate } = calculateDateRange();
      
      // Fetch all receipts and folders
      const [allReceipts, allFolders] = await Promise.all([
        ReceiptService.getAllReceipts(),
        FolderService.getAllFolders()
      ]);

      // Filter receipts by date range - fix null date handling
      const filteredReceipts = allReceipts.filter(receipt => {
        if (!receipt.date) return false; // Skip receipts with null dates
        const receiptDate = new Date(receipt.date);
        return receiptDate >= new Date(startDate) && receiptDate <= new Date(endDate);
      });

      // Calculate total metrics
      const totalSpent = filteredReceipts.reduce((sum, receipt) => sum + (receipt.totalAmount || 0), 0);
      const totalReceipts = filteredReceipts.length;
      const avgReceiptAmount = totalReceipts > 0 ? totalSpent / totalReceipts : 0;

      // Calculate spending by folder
      const folderSpending = new Map<number | null, { total: number; count: number }>();
      
      filteredReceipts.forEach(receipt => {
        const folderId = receipt.folderId;
        const current = folderSpending.get(folderId) || { total: 0, count: 0 };
        folderSpending.set(folderId, {
          total: current.total + (receipt.totalAmount || 0),
          count: current.count + 1
        });
      });

      const spendingByFolder: SpendingByFolder[] = Array.from(folderSpending.entries()).map(([folderId, data]) => {
        const folder = folderId ? allFolders.find(f => f.id === folderId) : null;
        return {
          folderId,
          folderName: folder?.name || 'Root Folder',
          totalAmount: data.total,
          receiptCount: data.count
        };
      }).sort((a, b) => b.totalAmount - a.totalAmount);

      // Calculate monthly spending (last 6 months) - fix null date handling
      const monthlySpending: MonthlySpending[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const monthReceipts = allReceipts.filter(receipt => {
          if (!receipt.date) return false; // Skip receipts with null dates
          const receiptDate = new Date(receipt.date);
          return receiptDate >= monthStart && receiptDate <= monthEnd;
        });
        
        const monthTotal = monthReceipts.reduce((sum, receipt) => sum + (receipt.totalAmount || 0), 0);
        
        monthlySpending.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          totalAmount: monthTotal,
          receiptCount: monthReceipts.length
        });
      }

      // Top 5 expenses - fix null date handling
      const topExpenses: TopExpense[] = filteredReceipts
        .sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0))
        .slice(0, 5)
        .map(receipt => {
          const folder = receipt.folderId ? allFolders.find(f => f.id === receipt.folderId) : null;
          return {
            id: receipt.id,
            storeName: receipt.storeName || 'Unknown Store',
            totalAmount: receipt.totalAmount || 0,
            date: receipt.date || new Date().toISOString(), // Provide fallback for null dates
            folderName: folder?.name || 'Root Folder'
          };
        });

      // Recent activity (last 10 receipts)
      const recentActivity = allReceipts
        .filter(receipt => receipt.date !== null) // Only include receipts with valid dates
        .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime()) // Use ! since we filtered nulls
        .slice(0, 10);

      setAnalytics({
        totalSpent,
        totalReceipts,
        avgReceiptAmount,
        spendingByFolder,
        monthlySpending,
        topExpenses,
        recentActivity
      });

    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch analytics'));
    } finally {
      setIsLoading(false);
    }
  }, [calculateDateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refetch: fetchAnalytics
  };
};