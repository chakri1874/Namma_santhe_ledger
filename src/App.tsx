import React, { useState, useEffect } from 'react';
import { 
  LogOut, 
  Wallet, 
  Sun,
  Moon,
  TrendingUp, 
  Search, 
  ChevronLeft,
  X,
  Check,
  User as UserIcon,
  Phone,
  Settings as SettingsIcon,
  Edit2,
  Building2,
  Store,
  MapPin,
  MessageSquare,
  Globe,
  Database,
  Lock,
  ArrowRight,
  PieChart,
  Users,
  Download,
  Trash2,
  Home,
  Clock,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { useLedger } from './hooks';
import { 
  Card, 
  CustomerList, 
  TransactionList, 
  WhatsAppReminder 
} from './components.tsx';
import { Customer, UserProfile } from './types';

type MainTab = 'home' | 'customers' | 'history' | 'profile';
type Screen = 'main' | 'add-customer' | 'amount-entry' | 'edit-customer' | 'edit-profile' | 'edit-whatsapp';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>('main');
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [amount, setAmount] = useState("");
  const [txnType, setTxnType] = useState<'credit' | 'payment'>('credit');
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const { customers, transactions, stats, profile, addTransaction, addCustomer, editCustomer, updateProfile } = useLedger();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
    });
  }, []);

  const handleLogin = () => signInWithPopup(auth, new GoogleAuthProvider());
  const handleLogout = () => {
    signOut(auth);
    setScreen('dashboard');
  };

  const exportData = () => {
    const csvRows = [];
    csvRows.push(['Customer Name', 'Phone', 'Amount', 'Type', 'Date', 'Note']);
    
    transactions.forEach(t => {
      const customer = customers.find(c => c.id === t.customerId);
      const date = t.timestamp ? t.timestamp.toDate().toLocaleString() : 'N/A';
      csvRows.push([
        customer?.name || 'Unknown',
        customer?.phone || '',
        t.amount.toString(),
        t.type,
        `"${date}"`,
        `"${t.note || ''}"`
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `namma_ledger_backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setScreen('edit-customer');
  };

  const validatePhoneNumber = (phone: string) => {
    if (!phone) return true; // Optional field
    const digitsOnly = /^\d+$/;
    if (!digitsOnly.test(phone)) {
      setFormError("Phone number must contain only digits.");
      return false;
    }
    if (phone.length < 10 || phone.length > 15) {
      setFormError("Phone number must be between 10 and 15 digits.");
      return false;
    }
    return true;
  };

  const handleUpdateCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;

    if (!validatePhoneNumber(phone)) return;
    
    try {
      await editCustomer(selectedCustomer.id, name, phone);
      setScreen('main');
      setSelectedCustomer(null);
    } catch (err) {
      setFormError("Failed to update customer.");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    
    const vendorName = (formData.get('vendorName') as string || "").trim();
    const businessName = (formData.get('businessName') as string || "").trim();
    const phone = (formData.get('phone') as string || "").trim();
    
    if (!vendorName) {
      setFormError("Vendor Name is required.");
      return;
    }

    const data: Partial<UserProfile> = {
      vendorName,
      businessName,
      phone,
      marketName: (formData.get('marketName') as string || "").trim(),
      address: (formData.get('address') as string || "").trim(),
      vendorType: (formData.get('vendorType') as UserProfile['vendorType']) || 'General Store',
    };
    
    setIsSaving(true);
    try {
      await updateProfile(data);
      setScreen('profile');
    } catch (err) {
      console.error(err);
      setFormError("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateWhatsApp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsSaving(true);
    try {
      await updateProfile({
        whatsappTemplate: formData.get('template') as string
      });
      setScreen('settings');
    } catch (err) {
      setFormError("Failed to update settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmTransaction = async () => {
    if (!selectedCustomer || !amount || isSaving) return;
    const numAmount = parseFloat(amount);
    setIsSaving(true);
    try {
      await addTransaction(selectedCustomer.id, numAmount, txnType);
      setScreen('main');
      setSelectedCustomer(null);
      setAmount("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartTransaction = (customer: Customer) => {
    setSelectedCustomer(customer);
    setAmount("");
    setScreen('amount-entry');
  };

  const handleAddNewCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;

    if (!validatePhoneNumber(phone)) return;
    
    try {
      await addCustomer(name, phone);
      setScreen('main');
      setActiveTab('customers');
    } catch (err) {
      setFormError("Failed to add customer.");
    }
  };

  const handleNumpadClick = (val: string) => {
    if (val === "C") {
      setAmount("");
    } else if (val === "back") {
      setAmount(prev => prev.slice(0, -1));
    } else {
      setAmount(prev => prev.length < 7 ? prev + val : prev);
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#12081d]">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-[#12081d] font-sans transition-colors">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-primary-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-primary-500/30 mb-10 rotate-6"
        >
          <Wallet className="w-12 h-12 text-white" />
        </motion.div>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tighter text-center">Namma-Santhe <span className="text-primary-500">Ledger</span></h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-center mb-12 max-w-xs leading-relaxed">The digital khata for your local business.</p>
        
        <button 
          onClick={handleLogin}
          className="flex items-center gap-4 bg-white dark:bg-[#1e132b] border border-slate-200 dark:border-[#2d1b41] px-10 py-5 rounded-3xl font-black text-slate-700 dark:text-white shadow-xl shadow-slate-200/50 dark:shadow-none hover:bg-slate-50 dark:hover:bg-[#2d1b41] transition-all active:scale-95"
        >
          <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="Google" />
          Get Started with Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0510] pb-24 max-w-md mx-auto relative overflow-y-auto no-scrollbar font-sans border-x border-slate-200 dark:border-[#2d1b41] transition-colors">
      
      {/* Dynamic Header Based on Tab */}
      <header className="p-6 pt-10 pb-4">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-1">
              {activeTab === 'home' && (profile.businessName || "My Ledger")}
              {activeTab === 'customers' && "Customers"}
              {activeTab === 'history' && "History"}
              {activeTab === 'profile' && "My Business"}
              {screen !== 'main' && "Back"}
            </h1>
            <p className="text-slate-400 dark:text-slate-500 font-bold text-[8px] uppercase tracking-[0.2em]">
              {activeTab === 'home' && (profile.marketName || "Local Market Santhe")}
              {activeTab === 'customers' && `${customers.length} Active Records`}
              {activeTab === 'history' && "Recent Activity Log"}
              {activeTab === 'profile' && "Control Center"}
            </p>
          </div>
          
          <button 
            onClick={() => setActiveTab('profile')} 
            className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-primary-500/20 active:scale-95 transition-all"
          >
            {profile.vendorName ? profile.vendorName[0].toUpperCase() : 'V'}
          </button>
        </div>

        {activeTab === 'home' && screen === 'main' && (
          <div className="grid grid-cols-2 gap-3 mb-2">
            <Card className="bg-[#5f259f] dark:bg-[#4c1d81] text-white p-4 shadow-xl relative overflow-hidden group border-none">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
              <div className="text-[8px] font-black uppercase tracking-widest text-white/60 mb-2">Total Udari</div>
              <div className="text-3xl font-black mb-1 leading-none tracking-tighter">₹{stats?.totalOutstanding || 0}</div>
            </Card>
            <Card className="p-4 flex flex-col justify-between border-slate-100 dark:border-[#2d1b41] bg-white dark:bg-[#1e132b] shadow-sm">
              <div className="text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-2">Today</div>
              <div className="text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">₹{stats?.totalSalesToday || 0}</div>
            </Card>
          </div>
        )}
      </header>

      <main className="px-6 pb-20 relative">
        <AnimatePresence mode="wait">
          {screen === 'main' && activeTab === 'home' && (
            <motion.div 
              key="tab-home"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <div className="flex flex-col gap-8">
                {/* Actions Section - Sliding Bar */}
                <div className="flex flex-col gap-3 -mx-6">
                  <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 px-7">Quick Actions</h2>
                  <div className="flex gap-3 overflow-x-auto px-6 pb-4 no-scrollbar touch-pan-x">
                    <button 
                      onClick={() => setScreen('add-customer')}
                      className="flex-none w-32 flex flex-col items-center justify-center p-6 bg-emerald-500 text-white rounded-[2.5rem] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                      <span className="font-black text-[10px] uppercase tracking-tight text-center">Add<br/>Customer</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('customers')}
                      className="flex-none w-32 flex flex-col items-center justify-center p-6 bg-primary-500 text-white rounded-[2.5rem] shadow-lg shadow-primary-500/20 active:scale-95 transition-all"
                    >
                      <span className="font-black text-[10px] uppercase tracking-tight text-center">Give<br/>Udari</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('history')}
                      className="flex-none w-32 flex flex-col items-center justify-center p-6 bg-blue-500 text-white rounded-[2.5rem] shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                    >
                      <span className="font-black text-[10px] uppercase tracking-tight text-center">View<br/>History</span>
                    </button>
                    <button 
                      onClick={exportData}
                      className="flex-none w-32 flex flex-col items-center justify-center p-6 bg-amber-500 text-white rounded-[2.5rem] shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                    >
                      <span className="font-black text-[10px] uppercase tracking-tight text-center">Export<br/>Data</span>
                    </button>
                  </div>
                </div>

                {/* Search & Quick Access */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Recent Activity</h2>
                    <button onClick={() => setActiveTab('history')} className="text-[10px] font-bold text-primary-500 uppercase tracking-widest">View All</button>
                  </div>
                  <TransactionList transactions={transactions.slice(0, 5)} customers={customers} />
                </div>
              </div>
            </motion.div>
          )}

          {screen === 'main' && activeTab === 'customers' && (
            <motion.div 
              key="tab-customers"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <div className="flex flex-col gap-6">
                <CustomerList 
                  customers={customers} 
                  onSelect={handleStartTransaction}
                  onAdd={() => setScreen('add-customer')}
                  onEdit={handleEditCustomer}
                />
              </div>
            </motion.div>
          )}

          {screen === 'main' && activeTab === 'history' && (
            <motion.div 
              key="tab-history"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <TransactionList transactions={transactions} customers={customers} />
            </motion.div>
          )}

          {screen === 'main' && activeTab === 'profile' && (
            <motion.div 
              key="tab-profile"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <div className="flex flex-col gap-6">
                <SettingsSection title="Business Info">
                  <div className="flex flex-col gap-4 p-2">
                    <DetailRow icon={<UserIcon className="w-4 h-4" />} label="Vendor" value={profile.vendorName} />
                    <DetailRow icon={<Building2 className="w-4 h-4" />} label="Shop" value={profile.businessName} />
                    <button 
                      onClick={() => setScreen('edit-profile')}
                      className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-black uppercase tracking-widest dark:text-white"
                    >
                      <Edit2 className="w-3 h-3" /> Edit Profile
                    </button>
                  </div>
                </SettingsSection>

                <SettingsSection title="App Settings">
                  <div className="flex flex-col gap-2 p-2">
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        {isDark ? <Sun className="w-4 h-4 text-primary-400" /> : <Moon className="w-4 h-4 text-primary-600" />}
                        <span className="font-bold dark:text-white text-sm">Theme</span>
                      </div>
                      <button onClick={() => setIsDark(!isDark)} className="w-10 h-6 bg-primary-500 rounded-full relative">
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${isDark ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-emerald-500" />
                        <span className="font-bold dark:text-white text-sm">Language</span>
                      </div>
                      <select 
                        defaultValue={profile.language}
                        onChange={(e) => updateProfile({ language: e.target.value as any })}
                        className="bg-transparent font-black text-primary-500 outline-none text-xs text-right appearance-none cursor-pointer"
                      >
                        <option value="en">English</option>
                        <option value="kn">ಕನ್ನಡ</option>
                        <option value="hi">हिन्दी</option>
                      </select>
                    </div>
                  </div>
                </SettingsSection>

                <SettingsSection title="Data">
                   <div className="grid grid-cols-2 gap-2 p-1">
                      <button onClick={exportData} className="flex items-center justify-center gap-2 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 font-black text-[10px] uppercase tracking-widest">
                        <Download className="w-3 h-3" /> Export
                      </button>
                      <button onClick={handleLogout} className="flex items-center justify-center gap-2 py-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 font-black text-[10px] uppercase tracking-widest">
                        <LogOut className="w-3 h-3" /> Logout
                      </button>
                   </div>
                </SettingsSection>
              </div>
            </motion.div>
          )}

          {/* Sub-Screens (Overlay or Replace) */}
          {screen === 'edit-profile' && (
            <motion.div key="edit-profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
               {/* Forms already logic previously mapped... I will stick to existing form blocks but ensure they work in this structure */}
               <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setScreen('main')} className="p-3 bg-white dark:bg-[#1e132b] border border-slate-200 dark:border-[#2d1b41] rounded-2xl shadow-sm active:scale-95">
                  <ChevronLeft className="w-5 h-5 dark:text-white" />
                </button>
                <h2 className="text-2xl font-black dark:text-white tracking-tight">Edit Profile</h2>
              </div>
              <form onSubmit={handleUpdateProfile} className="flex flex-col gap-6">
                <InputGroup label="Vendor Name" name="vendorName" icon={<UserIcon className="w-5 h-5" />} defaultValue={profile.vendorName} />
                <InputGroup label="Shop Name" name="businessName" icon={<Building2 className="w-5 h-5" />} defaultValue={profile.businessName} />
                <InputGroup label="Mobile Number" name="phone" icon={<Phone className="w-5 h-5" />} defaultValue={profile.phone} type="tel" />
                <InputGroup label="Market Name" name="marketName" icon={<MapPin className="w-5 h-5" />} defaultValue={profile.marketName} />
                <InputGroup label="Address" name="address" icon={<MapPin className="w-5 h-5" />} defaultValue={profile.address} />
                <div className="pt-4">
                  <button type="submit" disabled={isSaving} className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-2">
                    {isSaving ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <>Save Profile</>}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {screen === 'add-customer' && (
            <motion.div key="add-customer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              <div className="flex items-center gap-4 mb-10">
                <button onClick={() => setScreen('main')} className="p-3 bg-white dark:bg-[#1e132b] border border-slate-200 dark:border-[#2d1b41] rounded-2xl shadow-sm active:scale-95">
                  <ChevronLeft className="w-5 h-5 dark:text-white" />
                </button>
                <h2 className="text-2xl font-black dark:text-white tracking-tight">New Customer</h2>
              </div>
              <form onSubmit={handleAddNewCustomer} className="flex flex-col gap-8">
                <InputGroup label="Full Name" name="name" icon={<UserIcon className="w-5 h-5" />} defaultValue="" />
                <InputGroup label="WhatsApp Number" name="phone" icon={<Phone className="w-5 h-5" />} defaultValue="" type="tel" />
                <button type="submit" className="btn-primary py-5 mt-4 shadow-xl shadow-slate-200 rounded-3xl font-black uppercase tracking-widest text-lg">
                  Create Customer
                </button>
              </form>
            </motion.div>
          )}

          {screen === 'amount-entry' && selectedCustomer && (
            <motion.div key="amount-entry" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}>
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setScreen('main')} className="p-3 bg-white dark:bg-[#1e132b] border border-slate-200 dark:border-[#2d1b41] rounded-2xl shadow-sm">
                  <ChevronLeft className="w-5 h-5 dark:text-white" />
                </button>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white leading-none">{selectedCustomer.name}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Transaction Details</p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1e132b] rounded-[2.5rem] p-8 flex flex-col items-center justify-center mb-6 border border-slate-100 dark:border-[#2d1b41] shadow-sm">
                <div className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter">
                  ₹ <span className="text-primary-600 dark:text-primary-400">{amount || "0"}</span>
                </div>
              </div>

              <div className="flex gap-4 mb-6">
                <button onClick={() => setTxnType('payment')} className={`flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${txnType === 'payment' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white dark:bg-[#1e132b] text-slate-400 border border-slate-100 dark:border-[#2d1b41]'}`}>Payment</button>
                <button onClick={() => setTxnType('credit')} className={`flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${txnType === 'credit' ? 'bg-primary-500 text-white shadow-lg' : 'bg-white dark:bg-[#1e132b] text-slate-400 border border-slate-100 dark:border-[#2d1b41]'}`}>Udari (Credit)</button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-8">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "back"].map((val) => (
                  <button key={val} onClick={() => handleNumpadClick(val)} className="h-14 flex items-center justify-center bg-white dark:bg-[#1e132b] border border-slate-100 dark:border-[#2d1b41] rounded-2xl dark:text-white font-black text-lg">
                    {val === "back" ? <ChevronLeft className="w-5 h-5" /> : val}
                  </button>
                ))}
              </div>

              <button 
                onClick={handleConfirmTransaction}
                disabled={!amount || parseFloat(amount) === 0 || isSaving}
                className="w-full py-5 rounded-[2rem] font-black text-lg bg-primary-600 text-white shadow-xl flex items-center justify-center gap-2 uppercase tracking-tight disabled:bg-slate-200"
              >
                {isSaving ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Check className="w-6 h-6" /> Confirm Transaction</>}
              </button>
              
              <div className="mt-8 flex justify-center pb-8">
                <WhatsAppReminder 
                  customer={selectedCustomer} 
                  businessName={profile.businessName || "Namma Ledger"} 
                  template={profile.whatsappTemplate}
                />
              </div>
            </motion.div>
          )}

          {screen === 'edit-customer' && selectedCustomer && (
            <motion.div key="edit-customer" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
               <div className="flex items-center gap-4 mb-10">
                <button onClick={() => setScreen('main')} className="p-3 bg-white dark:bg-[#1e132b] rounded-2xl shadow-sm active:scale-95">
                  <ChevronLeft className="w-5 h-5 dark:text-white" />
                </button>
                <h2 className="text-2xl font-black dark:text-white tracking-tight">Edit Customer</h2>
              </div>
              <form onSubmit={handleUpdateCustomer} className="flex flex-col gap-8">
                <InputGroup label="Name" name="name" icon={<UserIcon className="w-5 h-5" />} defaultValue={selectedCustomer.name} />
                <InputGroup label="WhatsApp" name="phone" icon={<Phone className="w-5 h-5" />} defaultValue={selectedCustomer.phone} type="tel" />
                <button type="submit" className="btn-primary py-5 mt-4 rounded-[2.5rem] font-black uppercase tracking-widest text-lg">
                  Update
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      {screen === 'main' && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 dark:bg-[#0a0510]/80 backdrop-blur-xl border-t border-slate-100 dark:border-[#2d1b41] safe-area-bottom z-50">
          <div className="flex items-center justify-around p-3 pb-8">
            <NavBtn icon={<Home className="w-6 h-6" />} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
            <NavBtn icon={<Users className="w-6 h-6" />} label="Udari" active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
            <NavBtn icon={<Clock className="w-6 h-6" />} label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
            <NavBtn icon={<SettingsIcon className="w-6 h-6" />} label="Business" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          </div>
        </nav>
      )}
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-primary-500 scale-110' : 'text-slate-400 dark:text-slate-600'}`}
    >
      <div className={`p-2 rounded-2xl transition-all ${active ? 'bg-primary-50 dark:bg-primary-900/40' : ''}`}>
        {icon}
      </div>
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string }) {
  return (
    <div className="flex items-center gap-5">
      <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 dark:text-slate-600">
        {icon}
      </div>
      <div>
        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</div>
        <div className="text-[14px] font-bold text-slate-800 dark:text-white leading-tight">{value || "—"}</div>
      </div>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#1e132b] rounded-[1.5rem] border border-slate-100 dark:border-[#2d1b41] p-4 shadow-xl shadow-slate-200/40 dark:shadow-none mb-4 transition-colors">
      <h3 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-2">{title}</h3>
      <div className="flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
}

function InputGroup({ label, name, icon, defaultValue, type = "text" }: { label: string, name: string, icon: React.ReactNode, defaultValue?: string, type?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-1">{label}</label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 transition-colors">
          {icon}
        </div>
        <input 
          name={name} 
          type={type}
          defaultValue={defaultValue}
          className="w-full pl-12 pr-4 py-5 bg-white dark:bg-[#1e132b] border border-slate-200 dark:border-[#2d1b41] rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-bold text-lg dark:text-white"
        />
      </div>
    </div>
  );
}
