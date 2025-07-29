"use client";

import React, { useState, useEffect, useRef } from 'react';
import Binance from 'binance-api-node';
import BinanceAPIManager from '../utils/binanceApi';
import BinanceApiTester from '../components/BinanceApiTester';
import { 
  Line, Bar 
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import dynamic from 'next/dynamic';
import { 
  FaPlay, FaStop, FaChartLine, FaDollarSign, 
  FaCog, FaSignal, FaHistory, FaExchangeAlt,
  FaInfoCircle, FaRedo, FaFlask, FaHome
} from 'react-icons/fa';

// Lazy load untuk Technical Analysis
const TechnicalAnalysis = dynamic(
  () => import('react-ts-tradingview-widgets').then(mod => mod.TechnicalAnalysis),
  { ssr: false }
);

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Library untuk indikator teknikal
const { SMA, EMA, RSI, Stochastic, MACD, ATR } = require('technicalindicators');

// Konfigurasi Binance
const createClient = (apiKey, apiSecret, isTestnet) => {
  return Binance({
    apiKey: apiKey,
    apiSecret: apiSecret,
    httpBase: isTestnet ? 'https://testnet.binance.vision' : undefined,
  });
};

const ProfessionalTradingBot = () => {
  // State management
  const [activeTab, setActiveTab] = useState('trading');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('5m');
  const [balance, setBalance] = useState({ USDT: 10000, BTC: 0 });
  const [trades, setTrades] = useState([]);
  const [signals, setSignals] = useState([]);
  const [botStatus, setBotStatus] = useState('stopped');
  const [settings, setSettings] = useState({
    riskPerTrade: 1,
    rrr: 2.5,
    emaShort: 9,
    emaLong: 21,
    rsiPeriod: 14,
    stochasticPeriod: 14,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    atrPeriod: 14,
  });
  const [candles, setCandles] = useState([]);
  const [h1Candles, setH1Candles] = useState([]);
  const [d1Candles, setD1Candles] = useState([]);
  const [indicators, setIndicators] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [botLogs, setBotLogs] = useState([]);
  const [apiManager, setApiManager] = useState(null);
  
  // Ambil config dari environment variables
  const [config] = useState({
    apiKey: process.env.NEXT_PUBLIC_BINANCE_API_KEY || '',
    apiSecret: process.env.NEXT_PUBLIC_BINANCE_API_SECRET || '',
    isTestnet: process.env.NEXT_PUBLIC_BINANCE_TESTNET === 'true',
  });
  
  const [performanceStats, setPerformanceStats] = useState(null);
  
  const clientRef = useRef(null);
  const wsRef = useRef(null);
  const botIntervalRef = useRef(null);

  // Initialize Enhanced API Manager
  useEffect(() => {
    const initApiManager = async () => {
      if (config.apiKey && config.apiSecret) {
        try {
          const manager = new BinanceAPIManager(config);
          setApiManager(manager);
          addLog('✅ Enhanced Binance API Manager initialized');
          
          // Run health check
          const healthCheck = await manager.performHealthCheck();
          addLog(`🏥 API Health Score: ${healthCheck.healthScore}% - Status: ${healthCheck.status}`);
          
        } catch (error) {
          addLog(`❌ Failed to initialize API Manager: ${error.message}`);
        }
      }
    };

    initApiManager();
  }, [config]);

  // Fungsi untuk menambahkan log
  const addLog = (message) => {
    setBotLogs(prev => [
      { timestamp: new Date(), message },
      ...prev.slice(0, 19) // Simpan hanya 20 log terbaru
    ]);
  };

  // Hitung semua indikator
  const calculateAllIndicators = (candles) => {
    if (!candles || candles.length < 30) {
      addLog(`Tidak cukup data untuk kalkulasi indikator (hanya ${candles?.length || 0} candle)`);
      return {};
    }
    
    try {
      const closes = candles.map(c => parseFloat(c.close));
      const highs = candles.map(c => parseFloat(c.high));
      const lows = candles.map(c => parseFloat(c.low));
      const volumes = candles.map(c => parseFloat(c.volume));
      
      // EMA
      const emaShort = EMA.calculate({ period: settings.emaShort, values: closes });
      const emaLong = EMA.calculate({ period: settings.emaLong, values: closes });
      
      // RSI
      const rsi = RSI.calculate({ values: closes, period: settings.rsiPeriod });
      
      // Stochastic
      const stochastic = Stochastic.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: settings.stochasticPeriod,
        signalPeriod: 3
      });
      
      // MACD
      const macd = MACD.calculate({
        values: closes,
        fastPeriod: settings.macdFast,
        slowPeriod: settings.macdSlow,
        signalPeriod: settings.macdSignal,
        SimpleMAOscillator: false,
        SimpleMASignal: false
      });
      
      // ATR
      const atr = ATR.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: settings.atrPeriod
      });
      
      // Volume SMA
      const volumeSMA = SMA.calculate({ period: 20, values: volumes });
      
      // Fibonacci Levels (dari 100 candle terakhir)
      const recentHigh = Math.max(...highs.slice(-100));
      const recentLow = Math.min(...lows.slice(-100));
      const fibLevels = {
        level0: recentHigh,
        level23: recentHigh - (recentHigh - recentLow) * 0.236,
        level38: recentHigh - (recentHigh - recentLow) * 0.382,
        level50: recentHigh - (recentHigh - recentLow) * 0.5,
        level61: recentHigh - (recentHigh - recentLow) * 0.618,
        level100: recentLow
      };
      
      return {
        emaShort: emaShort[emaShort.length - 1],
        emaLong: emaLong[emaLong.length - 1],
        rsi: rsi[rsi.length - 1],
        stochasticK: stochastic[stochastic.length - 1]?.k || 0,
        stochasticD: stochastic[stochastic.length - 1]?.d || 0,
        macdHistogram: macd[macd.length - 1]?.histogram || 0,
        macdSignal: macd[macd.length - 1]?.signal || 0,
        macd: macd[macd.length - 1]?.macd || 0,
        atr: atr[atr.length - 1] || 0,
        volumeSMA: volumeSMA[volumeSMA.length - 1] || 0,
        fibLevels,
        recentHigh,
        recentLow
      };
    } catch (e) {
      addLog(`Error kalkulasi indikator: ${e.message}`);
      return {};
    }
  };

  // Fetch data candle untuk multi timeframe
  const fetchMultiTimeframeCandles = async () => {
    if (!clientRef.current) {
      addLog("Client Binance belum diinisialisasi");
      return;
    }
    
    try {
      setLoading(true);
      addLog(`Memulai fetch candle untuk ${symbol} (${timeframe})`);
      
      // Timeframe utama
      const mainCandles = await clientRef.current.candles({
        symbol,
        interval: timeframe,
        limit: 100
      });
      setCandles(mainCandles);
      addLog(`Berhasil fetch ${mainCandles.length} candle utama`);
      
      // Konfirmasi tren (H1)
      const h1Candles = await clientRef.current.candles({
        symbol,
        interval: '1h',
        limit: 50
      });
      setH1Candles(h1Candles);
      
      // Tren besar (D1)
      const d1Candles = await clientRef.current.candles({
        symbol,
        interval: '1d',
        limit: 30
      });
      setD1Candles(d1Candles);
      
      // Hitung indikator untuk semua timeframe
      const mainIndicators = calculateAllIndicators(mainCandles);
      const h1Indicators = calculateAllIndicators(h1Candles);
      const d1Indicators = calculateAllIndicators(d1Candles);
      
      setIndicators({
        main: mainIndicators,
        h1: h1Indicators,
        d1: d1Indicators
      });
      
      addLog("Indikator berhasil dihitung");
      
      return {
        mainCandles,
        h1Candles,
        d1Candles,
        mainIndicators,
        h1Indicators,
        d1Indicators
      };
    } catch (error) {
      const errMsg = `Error fetching candles: ${error.message}`;
      console.error(errMsg);
      setError(errMsg);
      addLog(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Generate trading signal dengan multi konfirmasi
  const generateSignal = (candlesData, indicatorsData) => {
    if (!candlesData || !indicatorsData) {
      addLog("Data candle/indikator tidak tersedia untuk generate sinyal");
      return null;
    }
    
    const { mainCandles, h1Indicators, d1Indicators } = candlesData;
    const { main: mainInd, h1: h1Ind, d1: d1Ind } = indicatorsData;
    
    if (!mainInd || !h1Ind || !d1Ind) {
      addLog("Indikator utama tidak lengkap");
      return null;
    }
    
    try {
      const lastCandle = mainCandles[mainCandles.length - 1];
      const lastClose = parseFloat(lastCandle.close);
      const lastVolume = parseFloat(lastCandle.volume);
      
      // 1. Konfirmasi arah tren besar (H1 dan D1)
      const isBullishTrend = 
        h1Ind.emaShort > h1Ind.emaLong && 
        d1Ind.emaShort > d1Ind.emaLong;
        
      const isBearishTrend = 
        h1Ind.emaShort < h1Ind.emaLong && 
        d1Ind.emaShort < d1Ind.emaLong;
      
      // 2. Kondisi entry (dilonggarkan sedikit)
      const buyConditions = {
        rsi: mainInd.rsi < 35,  // dari 30 menjadi 35
        stochastic: mainInd.stochasticK < 25 && mainInd.stochasticK > mainInd.stochasticD, // dari 20 menjadi 25
        ema: mainInd.emaShort > mainInd.emaLong,
        macd: mainInd.macdHistogram > 0 && mainInd.macdHistogram > mainInd.macdSignal,
        volume: lastVolume > (mainInd.volumeSMA * 1.3), // dari 1.5 menjadi 1.3
        fibonacci: lastClose <= (mainInd.fibLevels.level61 * 1.01) // tambah toleransi 1%
      };
      
      const sellConditions = {
        rsi: mainInd.rsi > 65,  // dari 70 menjadi 65
        stochastic: mainInd.stochasticK > 75 && mainInd.stochasticK < mainInd.stochasticD, // dari 80 menjadi 75
        ema: mainInd.emaShort < mainInd.emaLong,
        macd: mainInd.macdHistogram < 0 && mainInd.macdHistogram < mainInd.macdSignal,
        volume: lastVolume > (mainInd.volumeSMA * 1.3), // dari 1.5 menjadi 1.3
        fibonacci: lastClose >= (mainInd.fibLevels.level38 * 0.99) // tambah toleransi 1%
      };
      
      // Hitung jumlah kondisi terpenuhi
      const buyScore = Object.values(buyConditions).filter(Boolean).length;
      const sellScore = Object.values(sellConditions).filter(Boolean).length;
      
      // 3. Validasi sinyal dengan tren besar
      let signal = null;
      
      // Sinyal beli kuat: tren bullish + 4+ kondisi
      if (isBullishTrend && buyScore >= 4) {
        signal = {
          type: 'BUY',
          price: lastClose,
          timestamp: Date.now(),
          symbol,
          timeframe,
          conditions: buyConditions,
          score: buyScore
        };
        addLog(`🚀 BUY signal terdeteksi! Skor: ${buyScore}/6 | Harga: $${lastClose}`);
      }
      // Sinyal jual kuat: tren bearish + 4+ kondisi
      else if (isBearishTrend && sellScore >= 4) {
        signal = {
          type: 'SELL',
          price: lastClose,
          timestamp: Date.now(),
          symbol,
          timeframe,
          conditions: sellConditions,
          score: sellScore
        };
        addLog(`🚨 SELL signal terdeteksi! Skor: ${sellScore}/6 | Harga: $${lastClose}`);
      }
      // Sinyal counter-trend (hanya jika 5+ kondisi)
      else if (buyScore >= 4) { // dari 5 menjadi 4
        signal = {
          type: 'BUY',
          price: lastClose,
          timestamp: Date.now(),
          symbol,
          timeframe,
          conditions: buyConditions,
          score: buyScore,
          counterTrend: true
        };
        addLog(`⚠️ Counter BUY signal terdeteksi! Skor: ${buyScore}/6 | Harga: $${lastClose}`);
      }
      else if (sellScore >= 4) { // dari 5 menjadi 4
        signal = {
          type: 'SELL',
          price: lastClose,
          timestamp: Date.now(),
          symbol,
          timeframe,
          conditions: sellConditions,
          score: sellScore,
          counterTrend: true
        };
        addLog(`⚠️ Counter SELL signal terdeteksi! Skor: ${sellScore}/6 | Harga: $${lastClose}`);
      } else {
        addLog(`Tidak ada sinyal yang memenuhi syarat. Skor BUY: ${buyScore}, SELL: ${sellScore}`);
      }
      
      return signal;
    } catch (e) {
      addLog(`Error generate sinyal: ${e.message}`);
      return null;
    }
  };

  // Eksekusi trade dengan manajemen risiko
  const executeTrade = async (signal) => {
    if (!clientRef.current || !signal) return;
    
    try {
      addLog(`Memulai eksekusi order ${signal.type}...`);
      
      // Hitung ukuran posisi (1% risiko)
      const usdtBalance = balance.USDT;
      const riskAmount = usdtBalance * (settings.riskPerTrade / 100);
      const entryPrice = signal.price;
      
      // Hitung SL dan TP berdasarkan ATR
      const atrValue = indicators.main.atr || 100; // default value jika ATR tidak ada
      const sl = signal.type === 'BUY' 
        ? entryPrice - (1.5 * atrValue)
        : entryPrice + (1.5 * atrValue);
      
      const tp = signal.type === 'BUY' 
        ? entryPrice + (settings.rrr * 1.5 * atrValue)
        : entryPrice - (settings.rrr * 1.5 * atrValue);
      
      // Hitung kuantitas
      const priceDifference = Math.abs(entryPrice - sl);
      const quantity = riskAmount / priceDifference;
      
      // Simulasi order
      const newTrade = {
        id: `TRADE-${Date.now()}`,
        symbol,
        type: signal.type,
        quantity: parseFloat(quantity.toFixed(6)),
        entryPrice,
        stopLoss: parseFloat(sl.toFixed(2)),
        takeProfit: parseFloat(tp.toFixed(2)),
        timestamp: Date.now(),
        status: 'OPEN',
        signalScore: signal.score,
        counterTrend: signal.counterTrend || false
      };
      
      // Update state
      setTrades(prev => [...prev, newTrade]);
      
      // Simulasi update balance
      if (signal.type === 'BUY') {
        setBalance(prev => ({
          USDT: prev.USDT - (entryPrice * quantity),
          BTC: prev.BTC + quantity
        }));
      } else {
        setBalance(prev => ({
          USDT: prev.USDT + (entryPrice * quantity),
          BTC: prev.BTC - quantity
        }));
      }
      
      addLog(`✅ Order ${signal.type} dieksekusi! 
        Jumlah: ${quantity.toFixed(6)} | 
        Entry: $${entryPrice.toFixed(2)} | 
        SL: $${sl.toFixed(2)} | 
        TP: $${tp.toFixed(2)}`);
      
      return newTrade;
      
    } catch (error) {
      const errMsg = `Trade execution error: ${error.message}`;
      console.error(errMsg);
      addLog(errMsg);
    }
  };

  // Cek apakah trade perlu ditutup
  const checkTradeClosure = () => {
    if (candles.length === 0) return;
    
    const currentPrice = parseFloat(candles[candles.length - 1]?.close);
    if (!currentPrice) {
      addLog("Harga saat ini tidak tersedia untuk pengecekan trade");
      return;
    }
    
    setTrades(prev => prev.map(trade => {
      if (trade.status !== 'OPEN') return trade;
      
      let shouldClose = false;
      let closeReason = '';
      
      if (trade.type === 'BUY') {
        if (currentPrice >= trade.takeProfit) {
          shouldClose = true;
          closeReason = 'TP HIT';
        } else if (currentPrice <= trade.stopLoss) {
          shouldClose = true;
          closeReason = 'SL HIT';
        }
      } else {
        if (currentPrice <= trade.takeProfit) {
          shouldClose = true;
          closeReason = 'TP HIT';
        } else if (currentPrice >= trade.stopLoss) {
          shouldClose = true;
          closeReason = 'SL HIT';
        }
      }
      
      if (shouldClose) {
        // Simulasi update balance
        const profit = trade.type === 'BUY'
          ? (currentPrice - trade.entryPrice) * trade.quantity
          : (trade.entryPrice - currentPrice) * trade.quantity;
        
        setBalance(prev => ({
          USDT: prev.USDT + (trade.type === 'BUY' 
            ? currentPrice * trade.quantity 
            : (trade.entryPrice * trade.quantity) + profit),
          BTC: trade.type === 'BUY' 
            ? prev.BTC - trade.quantity 
            : prev.BTC + trade.quantity
        }));
        
        addLog(`🔔 Trade ditutup: ${trade.type} ${trade.symbol} 
          | Alasan: ${closeReason} 
          | Profit: $${profit.toFixed(2)}`);
        
        return {
          ...trade,
          exitPrice: currentPrice,
          closeTime: Date.now(),
          status: 'CLOSED',
          pnl: profit,
          closeReason
        };
      }
      
      return trade;
    }));
  };

  // Main bot loop
  const runBotCycle = async () => {
    if (botStatus !== 'running') {
      addLog("Bot tidak berjalan, skip cycle");
      return;
    }
    
    try {
      addLog("Memulai siklus bot...");
      const candlesData = await fetchMultiTimeframeCandles();
      if (!candlesData) {
        addLog("Data candle tidak tersedia, skip siklus");
        return;
      }
      
      const signal = generateSignal(candlesData, indicators);
      if (signal) {
        setSignals(prev => [signal, ...prev.slice(0, 19)]);
        await executeTrade(signal);
      }
      
      checkTradeClosure();
      
      // Hitung statistik performa
      calculatePerformance();
      
      addLog("Siklus bot selesai");
    } catch (error) {
      const errMsg = `Bot cycle error: ${error.message}`;
      console.error(errMsg);
      addLog(errMsg);
    }
  };

  // Setup Binance client
  useEffect(() => {
    const initClient = async () => {
      if (config.apiKey && config.apiSecret) {
        try {
          clientRef.current = createClient(
            config.apiKey, 
            config.apiSecret, 
            config.isTestnet
          );
          
          // Test connection
          await clientRef.current.time();
          
          addLog(`✅ Client Binance diinisialisasi (${config.isTestnet ? 'TESTNET' : 'LIVE'})`);
          
          // Inisialisasi balance
          setBalance({ USDT: 10000, BTC: 0 });
          await fetchMultiTimeframeCandles();
        } catch (e) {
          const errMsg = `❌ Gagal inisialisasi client: ${e.message}`;
          setError(errMsg);
          addLog(errMsg);
        }
      } else {
        const errMsg = "⚠️ API Key/Secret tidak ditemukan. Silakan konfigurasi di .env";
        setError(errMsg);
        addLog(errMsg);
      }
    };

    initClient();
  }, [config]);

  // Setup WebSocket untuk harga real-time
  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.close();
      addLog("WebSocket sebelumnya ditutup");
    }
    
    addLog(`Menyiapkan WebSocket untuk ${symbol}@kline_${timeframe}`);
    
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${timeframe}`);
    wsRef.current = ws;
    
    ws.onopen = () => {
      addLog("✅ WebSocket terhubung");
    };
    
    ws.onerror = (err) => {
      addLog(`❌ WebSocket error: ${err.message || 'Unknown error'}`);
    };
    
    ws.onclose = () => {
      addLog("📛 WebSocket ditutup");
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const kline = data.k;
      
      // Update candle terakhir
      setCandles(prev => {
        if (!prev || prev.length === 0) return prev;
        
        const newCandles = [...prev];
        const lastCandle = newCandles[newCandles.length - 1];
        
        if (lastCandle && lastCandle.openTime === kline.t) {
          newCandles[newCandles.length - 1] = {
            open: kline.o,
            high: kline.h,
            low: kline.l,
            close: kline.c,
            volume: kline.v,
            openTime: kline.t,
            closeTime: kline.T
          };
        } else {
          newCandles.push({
            open: kline.o,
            high: kline.h,
            low: kline.l,
            close: kline.c,
            volume: kline.v,
            openTime: kline.t,
            closeTime: kline.T
          });
          
          // Pertahankan maks 100 candle
          if (newCandles.length > 100) {
            newCandles.shift();
          }
        }
        
        return newCandles;
      });
    };
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [symbol, timeframe]);

  // Setup bot interval
  useEffect(() => {
    if (botStatus === 'running') {
      addLog("🚀 Memulai bot trading");
      runBotCycle(); // Jalankan segera
      botIntervalRef.current = setInterval(runBotCycle, 30000); // Jalankan setiap 30 detik
      addLog("⏱️ Interval bot diatur setiap 30 detik");
    } else {
      if (botIntervalRef.current) {
        clearInterval(botIntervalRef.current);
        addLog("⏹️ Bot dihentikan");
      }
    }
    
    return () => {
      if (botIntervalRef.current) {
        clearInterval(botIntervalRef.current);
      }
    };
  }, [botStatus, symbol, timeframe]);

  // Kalkulasi statistik performa
  const calculatePerformance = () => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    if (closedTrades.length === 0) return;
    
    const winningTrades = closedTrades.filter(t => t.pnl > 0);
    const losingTrades = closedTrades.filter(t => t.pnl < 0);
    
    const winRate = (winningTrades.length / closedTrades.length) * 100;
    const avgWin = winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length;
    const avgLoss = losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length;
    const expectancy = (winRate/100 * avgWin) - ((100-winRate)/100 * Math.abs(avgLoss));
    
    const stats = {
      totalTrades: closedTrades.length,
      winRate: parseFloat(winRate.toFixed(2)),
      avgWin: parseFloat(avgWin.toFixed(2)),
      avgLoss: parseFloat(avgLoss.toFixed(2)),
      expectancy: parseFloat(expectancy.toFixed(2)),
      netProfit: closedTrades.reduce((sum, t) => sum + t.pnl, 0),
      bestTrade: Math.max(...closedTrades.map(t => t.pnl), 0),
      worstTrade: Math.min(...closedTrades.map(t => t.pnl), 0),
      maxDrawdown: 0
    };
    
    // Hitung drawdown
    let equity = 10000;
    let peak = 10000;
    let maxDD = 0;
    
    closedTrades.sort((a, b) => a.closeTime - b.closeTime).forEach(trade => {
      equity += trade.pnl;
      if (equity > peak) peak = equity;
      
      const drawdown = ((peak - equity) / peak) * 100;
      if (drawdown > maxDD) maxDD = drawdown;
    });
    
    stats.maxDrawdown = parseFloat(maxDD.toFixed(2));
    
    setPerformanceStats(stats);
  };

  // Render chart
  const renderMainChart = () => {
    if (loading) {
      return (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-400">Memuat data chart...</p>
          </div>
        </div>
      );
    }
    
    if (candles.length < 10) {
      return (
        <div className="h-80 flex items-center justify-center text-gray-400">
          Tidak cukup data untuk menampilkan chart (minimal 10 candle)
        </div>
      );
    }
    
    const labels = candles.map(c => new Date(c.openTime).toLocaleTimeString());
    const closes = candles.map(c => parseFloat(c.close));
    const volumes = candles.map(c => parseFloat(c.volume));
    
    const data = {
      labels,
      datasets: [
        {
          label: 'Price',
          data: closes,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.1,
          yAxisID: 'y',
        },
        {
          label: 'Volume',
          data: volumes,
          backgroundColor: 'rgba(107, 114, 128, 0.5)',
          borderColor: 'rgba(107, 114, 128, 1)',
          type: 'bar',
          yAxisID: 'y1',
        }
      ]
    };
    
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: {
            color: 'rgba(55, 65, 81, 0.5)',
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: {
            drawOnChartArea: false,
          },
        },
        x: {
          grid: {
            color: 'rgba(55, 65, 81, 0.5)',
          },
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#D1D5DB',
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          titleColor: '#60A5FA',
          bodyColor: '#D1D5DB',
          borderColor: '#4B5563',
          borderWidth: 1,
        }
      }
    };
    
    return (
      <div className="h-80">
        <Line data={data} options={options} />
      </div>
    );
  };

  // Render kondisi sinyal
  const renderConditionBadge = (condition, label) => {
    return (
      <span className={`px-2 py-1 rounded text-xs ${
        condition ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'
      }`}>
        {label}
      </span>
    );
  };

  // Render log timestamp
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Force refresh data
  const handleRefresh = async () => {
    setLoading(true);
    await fetchMultiTimeframeCandles();
    addLog("Data diperbarui manual");
    
    // Also run API health check if manager is available
    if (apiManager) {
      const health = await apiManager.performHealthCheck();
      addLog(`API Health: ${health.healthScore}% - ${health.status}`);
    }
  };

  // Render tab navigation
  const renderTabNavigation = () => {
    const tabs = [
      { id: 'trading', name: 'Trading Bot', icon: FaChartLine },
      { id: 'testing', name: 'API Testing', icon: FaFlask }
    ];

    return (
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <Icon className="mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    );
  };

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'testing':
        return <BinanceApiTester />;
      case 'trading':
      default:
        return renderTradingBotContent();
    }
  };

  // Render trading bot content (existing content)
  const renderTradingBotContent = () => {
    return (
      <>
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 p-3 rounded-lg mb-4 flex items-center">
            <FaInfoCircle className="mr-2" />
            {error}
          </div>
        )}

        {/* API Health Status */}
        {apiManager && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
            <h2 className="text-lg font-semibold mb-3 flex items-center">
              <FaFlask className="mr-2 text-green-400" /> API Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-400">Environment</div>
                <div className={`font-bold ${config.isTestnet ? 'text-green-400' : 'text-red-400'}`}>
                  {config.isTestnet ? 'TESTNET' : 'LIVE'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400">API Manager</div>
                <div className="font-bold text-green-400">READY</div>
              </div>
              <div className="text-center">
                <button
                  onClick={async () => {
                    if (apiManager) {
                      const health = await apiManager.performHealthCheck();
                      addLog(`Health check completed: ${health.healthScore}%`);
                    }
                  }}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                >
                  Run Health Check
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Control Bar */}
        <div className="sm:hidden bg-gray-800 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-gray-700 text-white px-2 py-1 text-sm rounded"
              >
                <option value="BTCUSDT">BTC/USDT</option>
                <option value="ETHUSDT">ETH/USDT</option>
                <option value="BNBUSDT">BNB/USDT</option>
                <option value="SOLUSDT">SOL/USDT</option>
                <option value="XRPUSDT">XRP/USDT</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Timeframe</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full bg-gray-700 text-white px-2 py-1 text-sm rounded"
              >
                <option value="1m">1m</option>
                <option value="3m">3m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Panel Kontrol & Statistik */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            {/* Kontrol Bot */}
            <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
              <h2 className="text-md sm:text-lg font-semibold mb-3 flex items-center">
                <FaCog className="mr-2 text-blue-400 text-sm sm:text-base" /> Bot Control
              </h2>
              
              {/* Desktop-only controls */}
              <div className="hidden sm:grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Symbol</label>
                  <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                  >
                    <option value="BTCUSDT">BTC/USDT</option>
                    <option value="ETHUSDT">ETH/USDT</option>
                    <option value="BNBUSDT">BNB/USDT</option>
                    <option value="SOLUSDT">SOL/USDT</option>
                    <option value="XRPUSDT">XRP/USDT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Timeframe</label>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                  >
                    <option value="1m">1 Minute</option>
                    <option value="3m">3 Minutes</option>
                    <option value="5m">5 Minutes</option>
                    <option value="15m">15 Minutes</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm text-gray-400 mb-1">Risk Management</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Risk/Trade</span>
                      <span>{settings.riskPerTrade}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.5"
                      value={settings.riskPerTrade}
                      onChange={e => setSettings({...settings, riskPerTrade: parseFloat(e.target.value)})}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Risk/Reward</span>
                      <span>1:{settings.rrr}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.1"
                      value={settings.rrr}
                      onChange={e => setSettings({...settings, rrr: parseFloat(e.target.value)})}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                <div className="text-xs sm:text-sm">
                  <div className="text-gray-400">Status</div>
                  <div className={botStatus === 'running' ? 'text-green-400' : 'text-red-400'}>
                    {botStatus === 'running' ? 'RUNNING' : 'STOPPED'}
                  </div>
                </div>
                <div className="text-xs sm:text-sm">
                  <div className="text-gray-400">Last Signal</div>
                  <div>
                    {signals.length > 0 ? 
                      new Date(signals[0].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Statistik Akun */}
            <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
              <h2 className="text-md sm:text-lg font-semibold mb-3 flex items-center">
                <FaDollarSign className="mr-2 text-green-400 text-sm sm:text-base" /> Account
              </h2>
              
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">USDT:</span>
                  <span className="font-bold">${balance.USDT.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{symbol.replace('USDT', '')}:</span>
                  <span className="font-bold">{balance.BTC.toFixed(6)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Equity:</span>
                  <span className="font-bold">
                    ${(balance.USDT + (balance.BTC * (candles[candles.length - 1]?.close || 0))).toFixed(2)}
                  </span>
                </div>
                
                {performanceStats && (
                  <div className="pt-3 border-t border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Win Rate:</span>
                      <span className={performanceStats.winRate > 60 ? 'text-green-400' : 'text-yellow-400'}>
                        {performanceStats.winRate}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Profit:</span>
                      <span className={performanceStats.netProfit > 0 ? 'text-green-400' : 'text-red-400'}>
                        ${performanceStats.netProfit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bot Logs */}
            <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
              <h2 className="text-md sm:text-lg font-semibold mb-3 flex items-center">
                <FaInfoCircle className="mr-2 text-blue-400" /> Bot Logs
              </h2>
              <div className="h-60 overflow-y-auto">
                {botLogs.length > 0 ? (
                  <div className="text-xs space-y-2">
                    {botLogs.map((log, index) => (
                      <div key={index} className="border-b border-gray-700 pb-2">
                        <div className="text-gray-400 text-xs">
                          {formatTime(log.timestamp)}
                        </div>
                        <div className="mt-1">{log.message}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    Tidak ada log tersedia
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Chart Utama dan konten lainnya - sisanya tetap sama */}
          {/* ... existing chart and other content ... */}
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-2 sm:px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <FaChartLine className="text-blue-500 text-xl sm:text-2xl" />
            <h1 className="text-lg sm:text-xl font-bold">ProTrade Bot</h1>
            <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded hidden sm:block">
              {config.isTestnet ? 'TESTNET' : 'LIVE'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="text-xs sm:text-sm">
              <span className="text-gray-400 hidden sm:inline">Equity: </span>
              <span className="font-bold">
                ${(balance.USDT + (balance.BTC * (candles[candles.length - 1]?.close || 0))).toFixed(2)}
              </span>
            </div>
            <div className="flex space-x-1 sm:space-x-2">
              <button 
                onClick={() => setBotStatus('running')}
                disabled={botStatus === 'running'}
                className={`px-2 py-1 sm:px-3 sm:py-1 rounded flex items-center text-xs sm:text-sm ${
                  botStatus === 'running' 
                    ? 'bg-green-700 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                <FaPlay className="mr-0 sm:mr-1" /> 
                <span className="hidden sm:inline">Start</span>
              </button>
              <button 
                onClick={() => setBotStatus('stopped')}
                disabled={botStatus === 'stopped'}
                className={`px-2 py-1 sm:px-3 sm:py-1 rounded flex items-center text-xs sm:text-sm ${
                  botStatus === 'stopped' 
                    ? 'bg-red-700 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                <FaStop className="mr-0 sm:mr-1" /> 
                <span className="hidden sm:inline">Stop</span>
              </button>
              <button
                onClick={handleRefresh}
                className="px-2 py-1 sm:px-3 sm:py-1 rounded flex items-center bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
              >
                <FaRedo className="mr-0 sm:mr-1" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Tab Navigation */}
      {renderTabNavigation()}
      
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {/* Tab Content */}
        {renderTabContent()}
      </main>
    </div>
  );
};

export default ProfessionalTradingBot;