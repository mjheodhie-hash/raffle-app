'use client';

import { useState, useEffect, useRef } from 'react';
import BlockchainAnimation from '@/components/BlockchainAnimation';
import SpinningCube from '@/components/SpinningCube';
import MatrixRain from '@/components/MatrixRain';
import PixelCongrats from '@/components/PixelCongrats';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

function generateTxId() {
  return '0x' + Math.random().toString(16).substring(2, 15) + '...' + Math.random().toString(16).substring(2, 7);
}

interface Config {
  title: string;
  logo: string;
  theme: string;
  background: string;
  backgroundImage?: string;
}

interface RaffleData {
  participants: any[];
  schools: any[];
  winners: {
    participants: any[];
    schools: any[];
  };
}

export default function RafflePage() {
  const [config, setConfig] = useState<Config>({
    title: '7th IT Congress Raffle',
    logo: '',
    theme: 'purple',
    background: 'gradient',
    backgroundImage: ''
  });
  const router = useRouter();
  const [mode, setMode] = useState<'participants' | 'schools'>('participants');
  const [speed, setSpeed] = useState<'normal' | 'fast'>('normal');
  const [data, setData] = useState<RaffleData>({
    participants: [],
    schools: [],
    winners: { participants: [], schools: [] }
  });
  const [currentWinner, setCurrentWinner] = useState<any>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentTxId, setCurrentTxId] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [isAutoScroll, setIsAutoScroll] = useState<boolean>(true);
  const [lastParticipantWinner, setLastParticipantWinner] = useState<any>(null);
  const [lastSchoolWinner, setLastSchoolWinner] = useState<any>(null);
  const [vanishingId, setVanishingId] = useState<string | null>(null);
  const [locallyRemovedIds, setLocallyRemovedIds] = useState<string[]>([]);
  const [showWinners, setShowWinners] = useState(false);
  const [winnersList, setWinnersList] = useState<any[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const resumeTimerRef = useRef<any>(null);
  const winnerResetTimerRef = useRef<any>(null);
  const vanishTimerRef = useRef<any>(null);
  const vanishDoneTimerRef = useRef<any>(null);
  const freezeUntilRef = useRef<number | null>(null);

  useEffect(() => {
    loadConfig();
    loadData();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const configData = await res.json();
      setConfig(configData);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const loadData = async () => {
    try {
      const res = await fetch('/api/data');
      const raffleData = await res.json();
      setData(raffleData);
      return raffleData as RaffleData;
    } catch (error) {
      console.error('Failed to load data:', error);
      return data;
    }
  };

  const getDurations = () => (
    speed === 'fast'
      ? { pickDuration: 1200, freezeMs: 800, vanishDuration: 400 }
      : { pickDuration: 4000, freezeMs: 3000, vanishDuration: 700 }
  );

  const pickWinner = async () => {
    // Refresh pool at the start of a new picking to remove previous winners
    const latest = await loadData();
    const pool = mode === 'participants' ? latest.participants : latest.schools;
    
    if (pool.length === 0) {
      alert('No available entries to pick from!');
      return;
    }

    if (resumeTimerRef.current) { clearTimeout(resumeTimerRef.current); resumeTimerRef.current = null; }
    if (winnerResetTimerRef.current) { clearTimeout(winnerResetTimerRef.current); winnerResetTimerRef.current = null; }
    if (vanishTimerRef.current) { clearTimeout(vanishTimerRef.current); vanishTimerRef.current = null; }
    if (vanishDoneTimerRef.current) { clearTimeout(vanishDoneTimerRef.current); vanishDoneTimerRef.current = null; }
    setVanishingId(null);
    // Reset local removals on new pick to rely on fresh backend filtering
    setLocallyRemovedIds([]);
    setIsAutoScroll(false);
    setIsAnimating(true);
    setDisplayText('');
    setCurrentWinner(null);
    setProgress(0);
    setHighlightedIndex(-1);

    const durations = getDurations();
    const start = performance.now();
    const duration = durations.pickDuration; // ms

    const progressInterval = setInterval(() => {
      const now = performance.now();
      const pct = Math.min(100, Math.round(((now - start) / duration) * 100));
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(progressInterval);
        finalize();
      }
    }, 50);

    const txInterval = setInterval(() => {
      setCurrentTxId(generateTxId());
    }, 300);

    const finalize = () => {
      clearInterval(txInterval);
      const winnerIndex = Math.floor(Math.random() * pool.length);
      const winner = pool[winnerIndex];
      setCurrentWinner(winner);
      setHighlightedIndex(winnerIndex);
const finalDisplay = mode === 'participants'
        ? (winner.Name || winner.name || JSON.stringify(winner))
        : (winner.School || winner.school || winner.Schools || winner.schools || JSON.stringify(winner));
      setDisplayText(finalDisplay);
      setIsAnimating(false);
      setProgress(100);
      saveWinner(winner);
      if (mode === 'participants') setLastParticipantWinner(winner); else setLastSchoolWinner(winner);
      // Center on winner row immediately
      scrollToActualIndex(winnerIndex, 'smooth');
      // After 3s freeze, play vanish animation for the winner row, then resume auto-scroll
      const vanishDuration = durations.vanishDuration; // ms
      const freezeMs = durations.freezeMs; // ms before vanish
      freezeUntilRef.current = Date.now() + freezeMs + vanishDuration;
      if (resumeTimerRef.current) { clearTimeout(resumeTimerRef.current); }
      vanishTimerRef.current = setTimeout(() => {
        setVanishingId((winner as any).id);
        vanishDoneTimerRef.current = setTimeout(() => {
          setLocallyRemovedIds((prev) => prev.includes((winner as any).id) ? prev : [...prev, (winner as any).id]);
          setVanishingId(null);
          setHighlightedIndex(-1);
          setIsAutoScroll(true);
        }, vanishDuration);
      }, freezeMs);
      if (winnerResetTimerRef.current) { clearTimeout(winnerResetTimerRef.current); }
      winnerResetTimerRef.current = setTimeout(() => {
        setCurrentWinner(null);
        setDisplayText('');
        setHighlightedIndex(-1);
      }, 30000);
    };
  };

  const saveWinner = async (winner: any) => {
    try {
      await fetch('/api/winners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, winner })
      });
      // Do not refresh data here to keep winner visible until next picking
    } catch (error) {
      console.error('Failed to save winner:', error);
    }
  };

  const getThemeColors = () => {
    const themes: any = {
      purple: 'from-purple-900 via-blue-900 to-indigo-900',
      blue: 'from-blue-900 via-cyan-900 to-teal-900',
      green: 'from-green-900 via-emerald-900 to-teal-900',
      red: 'from-red-900 via-pink-900 to-rose-900',
      orange: 'from-orange-900 via-red-900 to-pink-900',
      cyber: 'from-gray-900 via-cyan-900 to-gray-900',
      neon: 'from-pink-900 via-purple-900 to-blue-900',
      matrix: 'from-black via-green-900 to-black',
      bitcoin: 'from-orange-900 via-yellow-900 to-orange-900',
      ethereum: 'from-indigo-900 via-purple-900 to-pink-900'
    };
    return themes[config.theme] || themes.purple;
  };

  const getThemeAccentColor = () => {
    const accents: any = {
      purple: 'text-purple-400 border-purple-500',
      blue: 'text-blue-400 border-blue-500',
      green: 'text-green-400 border-green-500',
      red: 'text-red-400 border-red-500',
      orange: 'text-orange-400 border-orange-500',
      cyber: 'text-cyan-400 border-cyan-500',
      neon: 'text-pink-400 border-pink-500',
      matrix: 'text-green-400 border-green-500',
      bitcoin: 'text-orange-400 border-orange-500',
      ethereum: 'text-purple-400 border-purple-500'
    };
    return accents[config.theme] || accents.purple;
  };

  const getButtonGradient = () => {
    const gradients: any = {
      purple: 'from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-purple-500/50',
      blue: 'from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 shadow-blue-500/50',
      green: 'from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/50',
      red: 'from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-red-500/50',
      orange: 'from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-orange-500/50',
      cyber: 'from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-cyan-500/50',
      neon: 'from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-pink-500/50',
      matrix: 'from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/50',
      bitcoin: 'from-orange-500 to-yellow-600 hover:from-orange-600 hover:to-yellow-700 shadow-orange-500/50',
      ethereum: 'from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/50'
    };
    return gradients[config.theme] || gradients.purple;
  };

  const getBackgroundClass = () => {
    if (config.background === 'image' && config.backgroundImage) {
      return '';
    } else if (config.background === 'solid') {
      return `bg-${config.theme}-900`;
    } else if (config.background === 'animated') {
      return `bg-gradient-to-br ${getThemeColors()} animate-gradient`;
    }
    return `bg-gradient-to-br ${getThemeColors()}`;
  };

  const openWinnersModal = async () => {
    try {
      const res = await fetch('/api/winners');
      const json = await res.json();
      const list = mode === 'participants' ? (json.participants || []) : (json.schools || []);
      setWinnersList(list);
      setShowWinners(true);
    } catch (e) {
      setWinnersList([]);
      setShowWinners(true);
    }
  };

  const availableCount = mode === 'participants' 
    ? data.participants.length 
    : data.schools.length;

  const winnersCount = mode === 'participants'
    ? data.winners.participants.length
    : data.winners.schools.length;

  const displayParticipants = mode === 'participants' ? data.participants : data.schools;
  const listItems = (displayParticipants || []).filter((it: any) => !locallyRemovedIds.includes(it.id));

  const scrollToActualIndex = (actualIndex: number, behavior: ScrollBehavior = 'auto') => {
    const container = listRef.current;
    if (!container) return;
    const candidates = Array.from(container.querySelectorAll(`[data-actual-index="${actualIndex}"]`)) as HTMLElement[];
    if (candidates.length === 0) return;
    const containerRect = container.getBoundingClientRect();
    let bestEl: HTMLElement | null = null as HTMLElement | null;
    let bestDelta = Number.POSITIVE_INFINITY;
    candidates.forEach((el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      const delta = Math.abs((r.top + r.height / 2) - (containerRect.top + containerRect.height / 2));
      if (delta < bestDelta) { bestDelta = delta; bestEl = el; }
    });
    const elToScroll = bestEl as HTMLElement | null;
    if (elToScroll) elToScroll.scrollIntoView({ behavior, block: 'center' });
  };

  useEffect(() => {
    if (!isAnimating && currentWinner) {
      const id = (currentWinner as any).id;
      const base = displayParticipants || [];
      const filtered = base.filter((it: any) => !locallyRemovedIds.includes(it.id));
      const idx = filtered.findIndex((x: any) => x.id === id);
      if (idx >= 0) {
        setHighlightedIndex(idx);
        scrollToActualIndex(idx, 'smooth');
      } else {
        setHighlightedIndex(-1);
      }
    }
  }, [isAnimating, currentWinner, displayParticipants, locallyRemovedIds]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [mode]);

  useEffect(() => {
    const scrolling = isAutoScroll;
    if (!scrolling) return;
    const container = listRef.current;
    if (!container) return;
    let last = performance.now();
    let lastUpdate = last;
    const speed = 100; // px per second when idle
    let dir = 1; // 1 = down, -1 = up

    const updateCenter = () => {
      const items = Array.from(container.querySelectorAll('[data-actual-index]')) as HTMLElement[];
      const midY = container.getBoundingClientRect().top + container.clientHeight / 2;
      let bestIdx = -1;
      let bestDist = Infinity;
      for (const el of items) {
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const dist = Math.abs(center - midY);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = Number(el.getAttribute('data-actual-index') || -1);
        }
      }
      if (bestIdx >= 0) {
        if (isAnimating) setHighlightedIndex(bestIdx);
      }
    };

    const step = (ts: number) => {
      const dt = (ts - last) / 1000;
      last = ts;
      const max = Math.max(0, container.scrollHeight - container.clientHeight);
      container.scrollTop += dir * speed * dt;
      if (container.scrollTop <= 0) { container.scrollTop = 0; dir = 1; }
      if (container.scrollTop >= max) { container.scrollTop = max; dir = -1; }
      if (ts - lastUpdate > 80) { updateCenter(); lastUpdate = ts; }
      rafId = requestAnimationFrame(step);
    };

    let rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isAnimating, isAutoScroll, displayParticipants, mode]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      if (winnerResetTimerRef.current) clearTimeout(winnerResetTimerRef.current);
      if (vanishTimerRef.current) clearTimeout(vanishTimerRef.current);
      if (vanishDoneTimerRef.current) clearTimeout(vanishDoneTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isAutoScroll || isAnimating) return;
    const id = setInterval(() => {
      if (!isAnimating && freezeUntilRef.current && Date.now() >= freezeUntilRef.current) {
        setIsAutoScroll(true);
        clearInterval(id);
      }
    }, 150);
    return () => clearInterval(id);
  }, [isAutoScroll, isAnimating]);

  return (
    <div 
      className={`min-h-screen ${getBackgroundClass()} p-6 relative overflow-hidden`}
      style={config.background === 'image' && config.backgroundImage ? {
        backgroundImage: `url(${config.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      } : {}}
    >
      <BlockchainAnimation isAnimating={isAnimating} />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-6 bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 p-4"
          style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
        >
          <div className="flex items-center gap-3">
            {config.logo && (
              <div className="relative w-12 h-12">
                <Image src={config.logo} alt="Logo" fill className="object-contain" />
              </div>
            )}
            <h1 className="text-3xl font-bold text-white">
              {config.title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('participants')}
              className={`px-4 py-2 text-xs font-bold transition-all ${
                mode === 'participants'
                  ? `bg-gradient-to-r ${getButtonGradient().split('hover')[0]} text-white`
                  : `bg-gray-800 border ${getThemeAccentColor().split(' ')[1]}/50 ${getThemeAccentColor().split(' ')[0]} hover:bg-gray-700`
              }`}
              style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            >
              PARTICIPANTS
            </button>
            <button
              onClick={() => setMode('schools')}
              className={`px-4 py-2 text-xs font-bold transition-all ${
                mode === 'schools'
                  ? `bg-gradient-to-r ${getButtonGradient().split('hover')[0]} text-white`
                  : `bg-gray-800 border ${getThemeAccentColor().split(' ')[1]}/50 ${getThemeAccentColor().split(' ')[0]} hover:bg-gray-700`
              }`}
              style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            >
              SCHOOLS
            </button>
            <button
              onClick={() => router.push('/admin')}
              className={`ml-6 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r ${getButtonGradient().split('hover')[0]} transition-all`}
              style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            >
              CUSTOMIZE
            </button>
            <div className="flex items-center gap-2 ml-6">
              <span className="text-xs text-white/80">Speed</span>
              <select
                value={speed}
                onChange={(e) => setSpeed(e.target.value as 'normal' | 'fast')}
                className="bg-gray-800 text-white text-xs border border-purple-500/50 px-2 py-1 focus:outline-none"
              >
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-900/70 backdrop-blur-sm border-2 border-cyan-500/50 h-[500px] overflow-hidden flex flex-col"
            style={{ clipPath: 'polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px)' }}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-cyan-500/30">
              <h2 className="text-xl font-bold text-white tracking-wider">PARTICIPANTS</h2>
              <div className="px-3 py-1 bg-cyan-500/20 text-white rounded text-sm font-bold border border-cyan-500/50">
                {availableCount}
              </div>
            </div>
            
            <div className="flex-1 relative overflow-hidden">
              <div ref={listRef} className="h-full overflow-y-auto space-y-2 px-6 py-4 infinite-scroll-list">
                {listItems.map((item, idx) => {
                  const actualIndex = idx;
const name = mode === 'participants' 
                    ? (item.Name || item.name || 'Unknown')
                    : (item.School || item.school || item.Schools || item.schools || 'Unknown');
                  const uid = item.id || item.ID || item.uid || '';
                  const isHighlighted = highlightedIndex === actualIndex;
                  const isVanishing = vanishingId && (vanishingId === item.id);
                  return (
                    <div 
                      key={item.id || idx}
                      data-actual-index={actualIndex}
                      className={`p-2 transition-all duration-700 ease-in-out transform ${
                        isHighlighted 
                          ? 'bg-cyan-500/40 border-2 border-cyan-400 shadow-lg shadow-cyan-500/50 scale-105' 
                          : 'bg-gray-800/50 border border-cyan-500/20 hover:border-cyan-500/50'
                      } ${isVanishing ? 'opacity-0 -translate-x-full' : ''}`}
                    >
                      <div className="flex flex-col space-y-0.5">
                        <span className={`text-[10px] font-mono uppercase tracking-wider truncate ${
                          isHighlighted ? 'text-cyan-100' : 'text-cyan-300/70'
                        }`}>{uid}</span>
                        <span className={`text-sm font-bold ${
                          isHighlighted ? 'text-white' : 'text-gray-300'
                        }`}>{name}</span>
                      </div>
                    </div>
                  );
                })}
                {listItems.length === 0 && !isAnimating && (
                  <div className="h-full flex items-center justify-center text-center">
                    <div className="px-4 py-6 border border-cyan-500/30 bg-gray-800/40">
                      <p className="text-white font-semibold">No entries available</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-gray-900/90 to-transparent pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-900/90 to-transparent pointer-events-none"></div>

              {isAnimating && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-10 flex items-center justify-center">
                  <div className="absolute inset-0">
                    <MatrixRain active={isAnimating} />
                  </div>
                  <div className="relative z-10 text-center">
                    <div className="inline-block bg-black/60 backdrop-blur-sm border border-green-500/30 px-4 py-3">
                      <p className="text-green-400 font-bold tracking-widest text-sm">CONSENSUS IN PROGRESS...</p>
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" style={{animationDelay:'0.2s'}}></span>
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" style={{animationDelay:'0.4s'}}></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-cyan-500/30 px-6 py-4 flex gap-3">
              <button
                onClick={pickWinner}
                disabled={isAnimating || availableCount === 0}
                className={`flex-1 px-6 py-3 bg-gradient-to-r ${getButtonGradient()} text-white text-sm font-bold disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed shadow-lg transition-all`}
                style={{
                  clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)'
                }}
              >
                {isAnimating ? 'MINING...' : 'PICK NAME'}
              </button>
              <button
                onClick={loadData}
                disabled={isAnimating}
                className={`px-6 py-3 bg-gray-800 border ${getThemeAccentColor().split(' ')[1]}/50 ${getThemeAccentColor().split(' ')[0]} hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold text-white transition-all`}
                style={{
                  clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)'
                }}
              >
                REFRESH
              </button>
            </div>
          </div>

          <div className="bg-gray-900/70 backdrop-blur-sm border-2 border-purple-500/50 p-6 h-[500px] flex flex-col"
            style={{ clipPath: 'polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px)' }}
          >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-purple-500/30">
              <h2 className="text-xl font-bold text-white tracking-wider">WINNER</h2>
              <div className="px-3 py-1 bg-purple-500/20 text-white rounded text-sm font-bold border border-purple-500/50">
                {winnersCount}
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              {!isAnimating && !currentWinner && !displayText && (
                <div className="flex flex-1 items-center justify-center">
                  <div className="relative w-64 h-64 opacity-80">
                    <Image src="/uploads/question.png" alt="Awaiting selection" fill className="object-contain" />
                  </div>
                </div>
              )}

              {isAnimating && (
                <div className="w-full px-4 space-y-3">
                  <div className="text-center">
                    <p className="text-white font-bold text-sm mb-1">BLOCK CONFIRMATION...</p>
                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden border border-cyan-500/50">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-cyan-400 text-xs mt-1">{progress}%</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div className="flex items-center justify-center overflow-hidden">
                      <SpinningCube />
                    </div>
                    <div className="flex flex-col justify-center space-y-1">
                      <p className="text-gray-400 text-xs">TX ID:</p>
                      <p className="text-cyan-400 font-mono text-xs truncate">{currentTxId}</p>
                      <div className="space-y-0.5 pt-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></div>
                          <span className="text-xs">Mining...</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                          <span className="text-xs">Verifying...</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                          <span className="text-xs">Confirming...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!isAnimating && displayText && (
                <>
                  <div className="flex-1 flex flex-col items-center justify-center gap-0.5">
                    <div className="text-center text-white font-light tracking-widest leading-tight">CONGRATULATIONS</div>
                    <div className="text-4xl font-bold text-center text-white leading-tight">
                      {displayText}
                    </div>
                    {mode === 'participants' && currentWinner && (
                      <div className="text-purple-300 text-sm font-medium text-center leading-tight mt-0">
                        {(currentWinner as any).School || (currentWinner as any).school || ''}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-purple-500/30 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-gray-400">LAST WINNER</div>
                <div className="mt-1 text-sm text-purple-300 font-mono truncate">
                  {mode === 'participants' 
                    ? (lastParticipantWinner ? (lastParticipantWinner.Name || lastParticipantWinner.name || JSON.stringify(lastParticipantWinner)) : '—')
                    : (lastSchoolWinner ? (lastSchoolWinner.School || lastSchoolWinner.school || lastSchoolWinner.Schools || lastSchoolWinner.schools || JSON.stringify(lastSchoolWinner)) : '—')
                  }
                </div>
              </div>
              <button
                onClick={openWinnersModal}
                className={`px-4 py-2 bg-gradient-to-r ${getButtonGradient()} text-white text-xs font-bold transition-all`}
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                VIEW WINNERS
              </button>
            </div>
          </div>
        </div>
      <div className="w-full mt-2">
        <PixelCongrats />
      </div>
      </div>
      {showWinners && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowWinners(false)}>
          <div
            className="bg-gray-900/95 border-2 border-purple-500/50 w-full max-w-xl max-h-[70vh] overflow-hidden"
            style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/30">
              <div className="text-white font-bold text-sm tracking-wider">WINNERS • {mode.toUpperCase()}</div>
              <button className="text-white/70 hover:text-white text-sm" onClick={() => setShowWinners(false)}>CLOSE</button>
            </div>
            <div className="p-4 space-y-2 overflow-y-auto" style={{ maxHeight: '58vh' }}>
              {winnersList.length === 0 && (
                <div className="text-center text-gray-400 text-sm">No winners yet</div>
              )}
              {winnersList.map((w: any, i: number) => {
const label = mode === 'participants' ? (w.Name || w.name || JSON.stringify(w)) : (w.School || w.school || w.Schools || w.schools || JSON.stringify(w));
                const uid = w.id || w.ID || w.uid || '';
                return (
                  <div key={(w.id || '') + i} className="flex items-start justify-between gap-3 bg-gray-800/50 border border-purple-500/30 p-2">
                    <div className="flex-1">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-purple-300/80 truncate">{uid}</div>
                      <div className="text-white text-sm font-semibold truncate">{label}</div>
                    </div>
                    <div className="text-purple-300 text-xs">#{i + 1}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
