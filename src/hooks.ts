import { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc,
  runTransaction, 
  serverTimestamp, 
  orderBy,
  limit,
  Timestamp,
  where
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { Customer, Transaction, GlobalStats, UserProfile } from './types';

export function useLedger() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      setCustomers([]);
      setTransactions([]);
      setStats(null);
      setLoading(false);
      return;
    }

    const customersPath = `users/${user.uid}/customers`;
    const transactionsPath = `users/${user.uid}/transactions`;
    const statsPath = `users/${user.uid}/stats/main`;

    const unsubscribeCustomers = onSnapshot(
      query(collection(db, customersPath), orderBy('name')),
      (snapshot) => {
        setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, customersPath)
    );

    const unsubscribeTransactions = onSnapshot(
      query(collection(db, transactionsPath), orderBy('timestamp', 'desc'), limit(50)),
      (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, transactionsPath)
    );

    const unsubscribeStats = onSnapshot(
      doc(db, statsPath),
      (docSnap) => {
        if (docSnap.exists()) {
          setStats(docSnap.data() as GlobalStats);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, statsPath)
    );

    const profilePath = `users/${user.uid}/config/profile`;
    const unsubscribeProfile = onSnapshot(
      doc(db, profilePath),
      (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          setProfile({
            vendorName: user.displayName || '',
            businessName: '',
            phone: '',
            marketName: '',
            address: '',
            vendorType: 'General Store',
            language: 'en',
            whatsappTemplate: 'Hello {customer}, this is a reminder from {business}. Your pending due is ₹{amount}.'
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, profilePath)
    );

    return () => {
      unsubscribeCustomers();
      unsubscribeTransactions();
      unsubscribeStats();
      unsubscribeProfile();
    };
  }, [user]);

  const addTransaction = async (customerId: string, amount: number, type: 'credit' | 'payment', note: string = '') => {
    if (!user) return;

    try {
      await runTransaction(db, async (txn) => {
        const customerRef = doc(db, `users/${user.uid}/customers`, customerId);
        const customerSnap = await txn.get(customerRef);
        
        if (!customerSnap.exists()) {
          throw new Error("Customer not found");
        }

        const currentData = customerSnap.data() as Customer;
        const newTotalDue = type === 'credit' 
          ? (currentData.totalDue || 0) + amount 
          : (currentData.totalDue || 0) - amount;

        const transactionRef = doc(collection(db, `users/${user.uid}/transactions`));
        const statsRef = doc(db, `users/${user.uid}/stats/main`);
        const statsSnap = await txn.get(statsRef);
        
        const currentStats = statsSnap.exists() ? (statsSnap.data() as GlobalStats) : { totalOutstanding: 0, totalSalesToday: 0 };
        const newTotalOutstanding = type === 'credit' 
          ? currentStats.totalOutstanding + amount 
          : currentStats.totalOutstanding - amount;

        // Transaction payload
        txn.set(transactionRef, {
          customerId,
          amount,
          type,
          note,
          timestamp: serverTimestamp()
        });

        // Update customer
        txn.set(customerRef, {
          totalDue: newTotalDue,
          lastTransactionDate: serverTimestamp()
        }, { merge: true });

        // Update global stats
        txn.set(statsRef, {
          totalOutstanding: newTotalOutstanding,
          lastUpdated: serverTimestamp()
        }, { merge: true });
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/transactions`);
    }
  };

  const addCustomer = async (name: string, phone: string = '') => {
    if (!user) return;
    const customersPath = `users/${user.uid}/customers`;
    try {
      const customerRef = doc(collection(db, customersPath));
      await runTransaction(db, async (txn) => {
        txn.set(customerRef, {
          name,
          phone,
          totalDue: 0,
          createdAt: serverTimestamp()
        });
      });
      return customerRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, customersPath);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const profilePath = `users/${user.uid}/config/profile`;
    try {
      await setDoc(doc(db, profilePath), {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, profilePath);
    }
  };

  const editCustomer = async (customerId: string, name: string, phone: string = '') => {
    if (!user) return;
    const customerPath = `users/${user.uid}/customers/${customerId}`;
    try {
      await runTransaction(db, async (txn) => {
        txn.update(doc(db, customerPath), {
          name,
          phone,
          updatedAt: serverTimestamp()
        });
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, customerPath);
    }
  };

  const statsWithDaily = useMemo(() => {
    if (!stats) return { totalOutstanding: 0, totalSalesToday: 0 };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = transactions
      .filter(t => t.type === 'credit' && t.timestamp && t.timestamp.toDate() >= today)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      ...stats,
      totalSalesToday: todaySales
    };
  }, [stats, transactions]);

  return { 
    customers, 
    transactions, 
    stats: statsWithDaily, 
    profile,
    loading, 
    error, 
    addTransaction, 
    addCustomer,
    editCustomer,
    updateProfile
  };
}
