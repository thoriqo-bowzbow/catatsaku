import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, RefreshCcw, Check, Landmark, CloudUpload, Info, ExternalLink, HelpCircle, Key, ChevronDown, CheckSquare, Plus, CheckCircle2 } from 'lucide-react';
import { SyncConfig, Transaction, Category, BankAccount } from '../types';
import { findSpreadsheet, createSpreadsheet, syncAllToSheets, backupDataToDrive } from '../utils/googleSync';

interface SpreadsheetSyncCardProps {
  syncConfig: SyncConfig;
  setSyncConfig: React.Dispatch<React.SetStateAction<SyncConfig>>;
  transactions: Transaction[];
  categories: Category[];
  bankAccounts: BankAccount[];
  addNotification: (title: string, msg: string, type: 'info' | 'warning' | 'success') => void;
  onSyncCompleted: (syncedCount: number) => void;
}

export default function SpreadsheetSyncCard({
  syncConfig,
  setSyncConfig,
  transactions,
  categories,
  bankAccounts,
  addNotification,
  onSyncCompleted
}: SpreadsheetSyncCardProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showConfigGuide, setShowConfigGuide] = useState(false);

  // Manual configuration inputs for flexibility if popup client credentials are changed
  const [manualToken, setManualToken] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Use localStorage to persist login token and Spreadsheet ID session-wise
  useEffect(() => {
    const savedToken = localStorage.getItem('google_oauth_token');
    if (savedToken) setToken(savedToken);
    
    const savedSheetId = localStorage.getItem('catatsaku_spreadsheet_id');
    if (savedSheetId) {
      setSyncConfig(prev => ({
        ...prev,
        spreadsheetId: savedSheetId,
        isConnected: true,
        lastSynced: localStorage.getItem('catatsaku_last_synced')
      }));
    }
  }, []);

  // Real OAuth Google Auth Trigger via Custom Client-side popup / Implicit Flow redirection
  const handleGoogleLogin = () => {
    setIsLoggingIn(true);
    try {
      // Setup typical Implicit Grant Flow
      // We generate auth request to standard Google Accounts
      // The redirect URI is standard current window location origin
      const clientId = '468302926068-example.apps.googleusercontent.com'; // Standard runtime template
      const redirectUri = `${window.location.origin}/`;
      const scope = encodeURIComponent('https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file');
      const responseType = 'token';
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}&prompt=consent`;

      // Open OAuth provider in a popup
      const authWindow = window.open(authUrl, 'google_oauth_popup', 'width=550,height=650,left=150,top=100');
      
      if (!authWindow) {
        // Fallback for sandboxed developer popup blocker
        addNotification(
          'Pop-up Diblokir',
          'Harap aktifkan izin pop-up browser Anda untuk login Google, atau gunakan opsi input token manual.',
          'warning'
        );
        setIsLoggingIn(false);
        setShowManualInput(true);
        return;
      }

      // Poll current popup URL hash containing accessToken
      const timer = setInterval(() => {
        try {
          if (authWindow.closed) {
            clearInterval(timer);
            setIsLoggingIn(false);
            return;
          }

          const currentHref = authWindow.location.href;
          if (currentHref && currentHref.includes('access_token=')) {
            clearInterval(timer);
            
            // Extract tokens from url hash
            const hash = authWindow.location.hash;
            const params = new URLSearchParams(hash.slice(1));
            const accessToken = params.get('access_token');
            
            if (accessToken) {
              handleTokenAcquired(accessToken);
            }
            
            authWindow.close();
            setIsLoggingIn(false);
          }
        } catch (e) {
          // Cross origin origin error expected until redirected back to our app
        }
      }, 500);

      // Timeout safety
      setTimeout(() => {
        clearInterval(timer);
        setIsLoggingIn(false);
      }, 60000);

    } catch (err) {
      console.error('Google Sign-In Trigger error:', err);
      setIsLoggingIn(false);
    }
  };

  const handleApplyManualToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    handleTokenAcquired(manualToken.trim());
    setManualToken('');
    setShowManualInput(false);
  };

  const handleTokenAcquired = async (acquiredToken: string) => {
    setToken(acquiredToken);
    localStorage.setItem('google_oauth_token', acquiredToken);
    addNotification('Google Berhasil Terhubung', 'Token otentikasi Google diperoleh dengan aman untuk durasi sesi ini.', 'success');
    
    // Auto find existing spreadsheet or prompt
    await searchExistingSpreadsheet(acquiredToken);
  };

  const searchExistingSpreadsheet = async (authToken: string) => {
    setIsSearching(true);
    addNotification('Mencari Spreadsheet', 'Mencari dokumen pencatatan di Google Drive...', 'info');
    
    const spreadsheetId = await findSpreadsheet(authToken);
    if (spreadsheetId) {
      setSyncConfig(prev => ({
        ...prev,
        spreadsheetId,
        isConnected: true
      }));
      localStorage.setItem('catatsaku_spreadsheet_id', spreadsheetId);
      addNotification('Spreadsheet Diterima', 'Menghubungkan ke berkas Google Sheet aktif: "CatatSaku: Keuangan Spreadsheet".', 'success');
    } else {
      addNotification('Spreadsheet Baru Dibutuhkan', 'Dokumen belum ditemukan di Drive Anda. Harap ketuk "Buat Spreadsheet Baru".', 'info');
    }
    setIsSearching(false);
  };

  const handleCreateNewSpreadsheet = async () => {
    if (!token) return;
    setIsCreating(true);
    addNotification('Membuat Spreadsheet', 'Menginisialisasi file buku kas di Google Sheets & Google Drive...', 'info');
    
    const result = await createSpreadsheet(token);
    if (result) {
      setSyncConfig(prev => ({
        ...prev,
        spreadsheetId: result.id,
        spreadsheetName: 'CatatSaku: Keuangan Spreadsheet',
        isConnected: true
      }));
      localStorage.setItem('catatsaku_spreadsheet_id', result.id);
      addNotification('Sheets Berhasil Dibuat', 'Spreadsheet baru telah dirilis. Silakan mulai sinkronisasi data!', 'success');
      
      // Perform initial sync
      await runSyncAll(token, result.id);
    } else {
      addNotification('Gagal Membuat Spreadsheet', 'Akses API ditolak. Anda mungkin perlu menggunakan token baru atau melengkapi kredensial.', 'warning');
      setShowConfigGuide(true);
    }
    setIsCreating(false);
  };

  const handleManualSyncTrigger = async () => {
    if (!token || !syncConfig.spreadsheetId) return;
    setIsSyncing(true);
    addNotification('Sinkronisasi Spreadsheet', 'Menulis data transaksi ke Google Sheets...', 'info');
    
    const success = await runSyncAll(token, syncConfig.spreadsheetId);
    if (success) {
      onSyncCompleted(transactions.length);
    } else {
      addNotification('Sinkronisasi Tertunda', 'Sesi autentikasi Google habis. Mohon lakukan login ulang.', 'warning');
    }
    setIsSyncing(false);
  };

  const runSyncAll = async (authToken: string, sheetId: string): Promise<boolean> => {
    const success = await syncAllToSheets(authToken, sheetId, transactions, categories);
    if (success) {
      const nowStr = new Date().toLocaleString('id-ID');
      setSyncConfig(prev => ({
        ...prev,
        lastSynced: nowStr
      }));
      localStorage.setItem('catatsaku_last_synced', nowStr);
      addNotification('Sinkronisasi Sukses', `Buku Kas berhasil disimpan! ${transactions.length} mutasi dan anggaran keuangan diperbarui di cloud.`, 'success');
      return true;
    }
    return false;
  };

  const handleBackupToDriveTrigger = async () => {
    if (!token) return;
    setIsBackingUp(true);
    addNotification('Drive Backup', 'Sedang mengirim salinan cadangan data keuangan ke Google Drive...', 'info');

    const result = await backupDataToDrive(token, { transactions, categories, bankAccounts });
    if (result) {
      addNotification(
        'Dicadangkan Aman',
        `Pencadangan berhasil disimpan di Drive Anda: "catatsaku_backup.json"`,
        'success'
      );
    } else {
      addNotification('Gagal Cadangkan', 'Koneksi API Google Drive terhambat. Coba login ulang untuk token baru.', 'warning');
    }
    setIsBackingUp(false);
  };

  const handleDisconnect = () => {
    const confirmDisc = window.confirm('Apakah Anda ingin memutus sinkronisasi Google Sheets?');
    if (!confirmDisc) return;
    
    setToken(null);
    setSyncConfig({
      spreadsheetId: '',
      spreadsheetName: 'CatatSaku: Keuangan Spreadsheet',
      isConnected: false,
      isAutoSync: false,
      lastSynced: null
    });
    localStorage.removeItem('google_oauth_token');
    localStorage.removeItem('catatsaku_spreadsheet_id');
    localStorage.removeItem('catatsaku_last_synced');
    addNotification('Otentikasi Diputus', 'Berhasil melakukan log out. Sinkronisasi Spreadsheet dimatikan.', 'info');
  };

  // Simulated Quick Sandbox connection (for instant mock checkout/evaluation inside iframe sandboxes)
  const handleConnectSandbox = () => {
    const mockToken = 'mock_sandbox_access_token_juni2026';
    const mockSheetId = '1_mockSpReAdShEeTIdXuYz12345';
    setToken(mockToken);
    localStorage.setItem('google_oauth_token', mockToken);
    
    setSyncConfig(prev => ({
      ...prev,
      spreadsheetId: mockSheetId,
      isConnected: true,
      lastSynced: new Date().toLocaleString('id-ID')
    }));
    localStorage.setItem('catatsaku_spreadsheet_id', mockSheetId);
    
    addNotification(
      'Sandbox Spreadsheet Tersambung',
      'Berhasil mengaktifkan mode simulasi Google Sheets! Data transaksi akan masuk ke Spreadsheet Dummy di layar.',
      'success'
    );
  };

  return (
    <div className="bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 p-6 shadow-sm transition-all selection:bg-emerald-500 selection:text-black">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-white/5 text-emerald-500">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-black uppercase text-gray-950 dark:text-white tracking-[0.15em]">Sinkronisasi Google Sheets & Drive</h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
            Database tersambung langsung ke berkas Google Excel. Pembaruan data transaksi dilakukan secara otomatis atau manual.
          </p>
        </div>

        {token && (
          <button
            onClick={handleDisconnect}
            className="text-[10px] font-extrabold uppercase tracking-widest text-rose-500 border border-rose-100 dark:border-rose-950/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            Putuskan
          </button>
        )}
      </div>

      {!token ? (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-4 rounded-2xl">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-white">Otentikasi Akun Google</h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mt-1">
              Hubungkan aplikasi dengan Cloud Google Drive dan Google Sheets untuk integrasi data tanpa batasan.
            </p>
            
            <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
              {/* Google Sign In Material Button Layout constraint compliance */}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="inline-flex items-center justify-center bg-white dark:bg-[#0a0a0a] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-xs font-semibold py-2.5 px-4 rounded-xl shadow-xs active:scale-98 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 mr-2.5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isLoggingIn ? 'Memuat Otentikasi...' : 'Masuk Dengan Google'}</span>
              </button>

              <button
                onClick={handleConnectSandbox}
                className="inline-flex items-center justify-center bg-[#0a0a0a] text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500 hover:text-black hover:border-emerald-500 text-[10px] uppercase tracking-widest font-extrabold py-2.5 px-4 rounded-xl active:scale-98 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>Simulasi Sandbox Google</span>
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowManualInput(!showManualInput)}
              className="text-xs text-gray-500 hover:text-emerald-500 flex items-center gap-1 cursor-pointer font-bold"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Otorisasi manual (Developer Token)</span>
            </button>
            <span className="text-gray-300 dark:text-white/10">|</span>
            <button
              onClick={() => setShowConfigGuide(!showConfigGuide)}
              className="text-xs text-gray-500 hover:text-emerald-500 flex items-center gap-1 cursor-pointer font-bold"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Cara Konfigurasi</span>
            </button>
          </div>

          {showManualInput && (
            <form onSubmit={handleApplyManualToken} className="flex gap-2 bg-gray-50 dark:bg-white/5 p-3 rounded-2xl border border-gray-100 dark:border-white/10">
              <input
                type="password"
                required
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Tempel Google Access Token..."
                className="flex-grow p-2.5 text-xs bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
              />
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-black uppercase tracking-widest px-4 rounded-xl cursor-pointer"
              >
                Simpan
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-500/5 dark:bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                <Check className="w-4.5 h-4.5" />
                <span className="text-[10px] font-black uppercase tracking-[0.1em]">Metode Sinkronisasi Aktif</span>
              </div>
              
              {syncConfig.spreadsheetId ? (
                <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-bold uppercase text-[9px]">Status Google:</span>
                    <span className="font-extrabold text-emerald-400">Ready Terintegrasi</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-bold uppercase text-[9px]">Sheet ID:</span>
                    <span className="font-mono text-[10px] break-all max-w-[120px] overflow-hidden text-right">{syncConfig.spreadsheetId}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-dashed border-gray-100 dark:border-white/10 mt-1">
                    <span className="text-gray-400 font-bold uppercase text-[9px]">Sinkron Terakhir:</span>
                    <span className="font-extrabold">{syncConfig.lastSynced || 'Baru'}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Spreadsheet belum terpaut.</p>
                  <button
                    onClick={handleCreateNewSpreadsheet}
                    disabled={isCreating}
                    className="mt-3 w-full bg-emerald-500 hover:bg-emerald-600 text-black p-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isCreating ? 'Mempersiapkan...' : 'Buat Spreadsheet Baru'}
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">Google Cloud Actions</span>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  Semua perubahan pada applet lokal dapat ditulis ke spreadsheet dan dicadangkan ke Google Drive secara aman.
                </p>
              </div>

              {syncConfig.spreadsheetId && (
                <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
                  <button
                    onClick={handleManualSyncTrigger}
                    disabled={isSyncing}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-506 bg-emerald-600 text-black py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Sinkron</span>
                  </button>

                  <button
                    onClick={handleBackupToDriveTrigger}
                    disabled={isBackingUp}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <CloudUpload className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-pulse' : ''}`} />
                    <span>Backup</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Spreadsheet:</span> 
            {syncConfig.spreadsheetId?.startsWith('1_mock') ? (
              <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black tracking-widest px-2-3 px-2 py-0.5 rounded-full uppercase">Sandbox Developer Mode</span>
            ) : (
              <a
                href={`https://docs.google.com/spreadsheets/d/${syncConfig.spreadsheetId}`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-bold text-emerald-400 hover:underline flex items-center gap-0.5"
              >
                <span>Buka Google Sheet Aktif</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Guide details panel */}
      {showConfigGuide && (
        <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-gray-400 space-y-2 leading-relaxed shrink-0">
          <h4 className="font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-4 h-4 text-emerald-500" />
            <span>Petunjuk Integrasi Google API</span>
          </h4>
          <p>
            Bila Anda menggunakan token pengembang (developer token), pastikan Google Cloud scopes yang dicakup mencakup:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-[11px] font-mono select-all text-emerald-400">
            <li>https://www.googleapis.com/auth/spreadsheets</li>
            <li>https://www.googleapis.com/auth/drive.file</li>
          </ul>
          <p className="text-[11px]">
            Di lingkungan sandbox bimbingan AI Studio, otorisasi default otomatis dapat disimulasikan menggunakan tombol <strong>Simulasi Sandbox Google</strong> untuk review visual seketika.
          </p>
        </div>
      )}
    </div>
  );
}
export { SpreadsheetSyncCard };
