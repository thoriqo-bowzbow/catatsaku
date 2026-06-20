import React, { useState, useEffect } from 'react';
import { Fingerprint, ShieldAlert, KeyRound, Lock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BiometricVerifyProps {
  onSuccess: () => void;
  passcode: string;
}

export default function BiometricVerify({ onSuccess, passcode }: BiometricVerifyProps) {
  const [pin, setPin] = useState<string>('');
  const [errorCount, setErrorCount] = useState<number>(0);
  const [status, setStatus] = useState<'locked' | 'verifying' | 'success' | 'error'>('locked');
  const [isVerifyingBiometric, setIsVerifyingBiometric] = useState<boolean>(false);

  const handleNumberClick = (num: number) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin === passcode) {
        handleSuccess();
      } else if (newPin.length === 4) {
        // Wrong PIN
        setTimeout(() => {
          setStatus('error');
          setPin('');
          setErrorCount(prev => prev + 1);
          setTimeout(() => setStatus('locked'), 1500);
        }, 300);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const startBiometricScan = () => {
    setIsVerifyingBiometric(true);
    setStatus('verifying');
    
    // Simulate biometric matching delay
    setTimeout(() => {
      setIsVerifyingBiometric(false);
      const isMatch = Math.random() > 0.15; // 85% success chance for realism
      if (isMatch) {
        handleSuccess();
      } else {
        setStatus('error');
        setErrorCount(prev => prev + 1);
        setTimeout(() => setStatus('locked'), 1500);
      }
    }, 1800);
  };

  const handleSuccess = () => {
    setStatus('success');
    setTimeout(() => {
      onSuccess();
    }, 800);
  };

  useEffect(() => {
    // Automatically trigger biometric scan on mount
    const timer = setTimeout(() => {
      startBiometricScan();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a] text-white font-sans selection:bg-emerald-500 selection:text-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.06),transparent_70%)] pointer-events-none" />
      
      <div className="w-full max-w-sm px-6 flex flex-col items-center">
        {/* Branding & Status Banner */}
        <div className="mb-8 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-white/5 border border-white/10 mb-3 shadow-xl">
            <Lock className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-sm font-black uppercase text-white tracking-[0.25em]">CatatSaku Aman</h1>
          <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-1">Sistem Terkunci • Amankan Keuangan Anda</p>
        </div>

        {/* Interactive Biometric Area */}
        <div className="relative w-full aspect-square max-w-[200px] flex items-center justify-center mb-8">
          <AnimatePresence mode="wait">
            {status === 'verifying' && (
              <motion.div
                key="verifying"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [0.9, 1.1, 0.95, 1], opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center"
              >
                <div className="relative">
                  <Fingerprint className="w-16 h-16 text-emerald-500 animate-pulse" />
                  <div className="absolute inset-0 border border-emerald-500 rounded-full scale-125 animate-ping opacity-25" />
                </div>
                <span className="text-emerald-400 text-[10px] uppercase tracking-widest font-bold mt-4 animate-pulse">Menyamakan Sidik Jari...</span>
              </motion.div>
            )}

            {status === 'locked' && (
              <motion.button
                key="locked"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startBiometricScan}
                className="flex flex-col items-center cursor-pointer p-4 rounded-3xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
              >
                <Fingerprint className="w-16 h-16 text-white/30 hover:text-emerald-500 transition-colors" />
                <span className="text-gray-400 text-[10px] uppercase tracking-wider font-bold mt-4">Ketuk untuk Pindai Sidik Jari</span>
              </motion.button>
            )}

            {status === 'success' && (
              <motion.div
                key="success"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center text-emerald-500"
              >
                <CheckCircle2 className="w-16 h-16" />
                <span className="text-[10px] uppercase tracking-widest font-bold mt-4">Akses Diberikan</span>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                key="error"
                initial={{ x: [-10, 10, -5, 5, 0], opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex flex-col items-center text-rose-500"
              >
                <ShieldAlert className="w-16 h-16" />
                <span className="text-[10px] uppercase tracking-widest font-bold mt-4 text-center">Pengenalan Gagal • Gunakan PIN</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* PIN Entry Display */}
        <div className="w-full flex flex-col items-center mb-8">
          <div className="flex gap-4 justify-center mb-4">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`w-4.5 h-4.5 rounded-full border border-white/20 transition-all duration-200 ${
                  pin.length > index
                    ? 'bg-emerald-500 border-emerald-500 shadow-md shadow-emerald-500/20 scale-115'
                    : 'bg-transparent'
                }`}
              />
            ))}
          </div>
          {errorCount > 0 && (
            <p className="text-rose-400 text-[10px] uppercase tracking-widest font-extrabold font-mono">PIN Salah ({errorCount}x Percobaan)</p>
          )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-y-4 gap-x-8 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num)}
              className="w-14 h-14 rounded-full bg-white/5 text-lg font-black hover:bg-white/10 flex items-center justify-center active:scale-95 transition-all text-white border border-white/10 cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setPin('')}
            className="w-14 h-14 text-[10px] uppercase tracking-widest font-black text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            Bersih
          </button>
          <button
            onClick={() => handleNumberClick(0)}
            className="w-14 h-14 rounded-full bg-white/5 text-lg font-black hover:bg-white/10 flex items-center justify-center active:scale-95 transition-all text-white border border-white/10 cursor-pointer"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="w-14 h-14 text-[10px] uppercase tracking-widest font-black text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            Hapus
          </button>
        </div>

        {/* Footer info */}
        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-8">Default PIN: 1234 (Edit di Tab Pengaturan)</p>
      </div>
    </div>
  );
}
export { BiometricVerify };
