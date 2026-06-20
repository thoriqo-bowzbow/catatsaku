export interface Transaction {
  id: string;
  date: string; // ISO string or YYYY-MM-DD
  type: 'income' | 'expense';
  category: string;
  amount: number;
  note: string;
  bankName?: string; // Optional reference to synced bank
  synced: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string; // Tailwind color class or hex code
  icon: string; // Lucide icon name
  budget?: number | null; // Optional budget limit
}

export interface NotificationLog {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
}

export interface BankAccount {
  id: string;
  bankName: 'BCA' | 'Mandiri' | 'BNI' | 'BRI' | 'Mock';
  accountName: string;
  accountNo: string;
  balance: number;
  isConnected: boolean;
  lastSynced: string | null;
}

export interface SyncConfig {
  spreadsheetId: string;
  spreadsheetName: string;
  driveFolderId?: string;
  isConnected: boolean;
  isAutoSync: boolean;
  lastSynced: string | null;
}

export interface SecurityConfig {
  isBiometricEnabled: boolean;
  isLocked: boolean;
  passcode: string; // numeric 4-digit PIN fallback or passcode
}
