import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  vendorName: string;
  businessName: string;
  phone: string;
  marketName: string;
  address: string;
  vendorType: 'Vegetables' | 'Fruits' | 'Snacks' | 'General Store' | 'Other';
  language: 'en' | 'kn' | 'hi';
  whatsappTemplate: string;
  updatedAt?: any;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  totalDue: number;
  lastTransactionDate?: Timestamp;
  createdAt: Timestamp;
}

export interface Transaction {
  id: string;
  customerId: string;
  amount: number;
  type: 'credit' | 'payment';
  timestamp: Timestamp;
  note?: string;
}

export interface GlobalStats {
  totalOutstanding: number;
  totalSalesToday: number;
  lastUpdated: Timestamp;
}
