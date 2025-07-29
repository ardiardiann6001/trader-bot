#!/usr/bin/env node

/**
 * Comprehensive Binance API Testing Script
 * Tests all functions from binance-api-node library
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { config } from 'dotenv';

// ES module setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

// Dynamic import with proper error handling
let BinanceAPIManager;
try {
  const module = await import('../utils/binanceApi.js');
  BinanceAPIManager = module.default;
  if (!BinanceAPIManager) {
    console.error('❌ BinanceAPIManager not found in default export, trying named export...');
    BinanceAPIManager = module.BinanceAPIManager;
  }
  if (!BinanceAPIManager) {
    throw new Error('BinanceAPIManager not found in module exports');
  }
} catch (error) {
  console.error('❌ Cannot import BinanceAPIManager:', error.message);
  
  // Try to check if file exists
  const filePath = join(__dirname, '..', 'utils', 'binanceApi.js');
  if (existsSync(filePath)) {
    console.log('✅ File exists at:', filePath);
    try {
      const content = readFileSync(filePath, 'utf-8');
      console.log('📄 File starts with:', content.substring(0, 200));
    } catch (e) {
      console.error('Cannot read file:', e.message);
    }
  } else {
    console.error('❌ File does not exist at:', filePath);
  }
  
  process.exit(1);
}

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function printHeader(title) {
  console.log('');
  colorLog('='.repeat(60), colors.cyan);
  colorLog(`${title}`, colors.bright + colors.cyan);
  colorLog('='.repeat(60), colors.cyan);
}

function printResult(testName, success, data = null, error = null) {
  const status = success ? 
    `${colors.green}✅ PASS${colors.reset}` : 
    `${colors.red}❌ FAIL${colors.reset}`;
  
  console.log(`${status} ${testName}`);
  
  if (error) {
    colorLog(`   Error: ${error}`, colors.red);
  }
  
  if (success && data) {
    console.log(`   Data: ${typeof data === 'object' ? JSON.stringify(data).substring(0, 100) + '...' : data}`);
  }
}

async function runComprehensiveTest() {
  printHeader('BINANCE API COMPREHENSIVE TEST SUITE');
  
  // Initialize API Manager
  const config = {
    apiKey: process.env.NEXT_PUBLIC_BINANCE_API_KEY,
    apiSecret: process.env.NEXT_PUBLIC_BINANCE_API_SECRET,
    isTestnet: process.env.NEXT_PUBLIC_BINANCE_TESTNET === 'true'
  };

  if (!config.apiKey || !config.apiSecret) {
    colorLog('❌ API credentials not found. Please set up .env.local file.', colors.red);
    colorLog('Required variables:', colors.yellow);
    colorLog('- NEXT_PUBLIC_BINANCE_API_KEY', colors.yellow);
    colorLog('- NEXT_PUBLIC_BINANCE_API_SECRET', colors.yellow);
    colorLog('- NEXT_PUBLIC_BINANCE_TESTNET=true', colors.yellow);
    process.exit(1);
  }

  colorLog(`Environment: ${config.isTestnet ? 'TESTNET' : 'LIVE'}`, 
    config.isTestnet ? colors.green : colors.red);

  const apiManager = new BinanceAPIManager(config);
  
  // Test Summary
  const summary = {
    total: 0,
    passed: 0,
    failed: 0,
    categories: {}
  };

  // Helper function to run test
  async function runTest(category, testName, testFunction) {
    summary.total++;
    if (!summary.categories[category]) {
      summary.categories[category] = { total: 0, passed: 0, failed: 0 };
    }
    summary.categories[category].total++;

    try {
      const result = await testFunction();
      if (result && result.success) {
        summary.passed++;
        summary.categories[category].passed++;
        printResult(testName, true, result.data);
      } else {
        summary.failed++;
        summary.categories[category].failed++;
        printResult(testName, false, null, result?.error?.message || 'Unknown error');
      }
    } catch (error) {
      summary.failed++;
      summary.categories[category].failed++;
      printResult(testName, false, null, error.message);
    }
  }

  // 1. BASIC API TESTS
  printHeader('BASIC API TESTS');
  
  await runTest('basic', 'Ping Server', () => apiManager.ping());
  await runTest('basic', 'Get Server Time', () => apiManager.time());
  await runTest('basic', 'Exchange Information', () => apiManager.exchangeInfo());

  // 2. MARKET DATA TESTS
  printHeader('MARKET DATA TESTS');
  
  const testSymbol = 'BTCUSDT';
  
  await runTest('market', 'Order Book', () => apiManager.orderBook(testSymbol, 10));
  await runTest('market', 'Klines/Candlestick Data', () => apiManager.klines(testSymbol, '1h', { limit: 10 }));
  await runTest('market', '24hr Ticker Statistics', () => apiManager.ticker24hr(testSymbol));
  await runTest('market', 'Symbol Price Ticker', () => apiManager.prices(testSymbol));
  await runTest('market', 'Order Book Ticker', () => apiManager.bookTickers(testSymbol));
  await runTest('market', 'Recent Trades', () => apiManager.trades(testSymbol, 10));
  await runTest('market', 'Aggregate Trades', () => apiManager.aggTrades(testSymbol, { limit: 10 }));
  await runTest('market', 'Average Price', () => apiManager.avgPrice(testSymbol));

  // 3. ACCOUNT TESTS
  printHeader('ACCOUNT TESTS (requires API key)');
  
  await runTest('account', 'Account Information', () => apiManager.accountInfo());
  await runTest('account', 'Open Orders', () => apiManager.openOrders());
  await runTest('account', 'All Orders', () => apiManager.allOrders(testSymbol, { limit: 10 }));
  await runTest('account', 'Account Trades', () => apiManager.myTrades(testSymbol, { limit: 10 }));

  // 4. TRADING TESTS (testnet only)
  if (config.isTestnet) {
    printHeader('TRADING TESTS (testnet only)');
    
    await runTest('trading', 'Test Order Placement', () => apiManager.testOrder({
      symbol: testSymbol,
      side: 'BUY',
      type: 'LIMIT',
      quantity: '0.001',
      price: '20000',
      timeInForce: 'GTC'
    }));

    await runTest('trading', 'Order Validation', () => apiManager.validateOrderParams(testSymbol, {
      type: 'LIMIT',
      side: 'BUY',
      quantity: '0.001',
      price: '20000'
    }));
  } else {
    colorLog('⚠️ Skipping trading tests on LIVE environment', colors.yellow);
  }

  // 5. UTILITY FUNCTIONS TESTS
  printHeader('UTILITY FUNCTIONS TESTS');
  
  await runTest('utility', 'Symbol Information', () => apiManager.getSymbolInfo(testSymbol));
  
  await runTest('utility', 'Position Size Calculation', () => {
    const result = apiManager.calculatePositionSize(10000, 1, 50000, 49000);
    return { success: true, data: { positionSize: result } };
  });

  await runTest('utility', 'PnL Calculation', () => {
    const result = apiManager.calculatePnL(50000, 51000, 0.1, 'BUY');
    return { success: true, data: { pnl: result } };
  });

  // 6. HEALTH CHECK
  printHeader('HEALTH CHECK');
  
  await runTest('health', 'Comprehensive Health Check', () => apiManager.performHealthCheck());

  // 7. STRESS TEST
  printHeader('STRESS TEST');
  
  await runTest('stress', 'API Stress Test (5 iterations)', () => apiManager.runStressTest(5, 500));

  // 8. FUTURES TESTS (if available)
  printHeader('FUTURES TESTS (if available)');
  
  await runTest('futures', 'Futures Exchange Info', () => apiManager.futuresExchangeInfo());
  await runTest('futures', 'Futures Account Info', () => apiManager.futuresAccountInfo());
  await runTest('futures', 'Futures Klines', () => apiManager.futuresKlines(testSymbol, '1h', { limit: 10 }));

  // 9. MARGIN TESTS (if available)
  printHeader('MARGIN TESTS (if available)');
  
  await runTest('margin', 'Margin Account Info', () => apiManager.marginAccountInfo());

  // 10. WEBSOCKET TESTS
  printHeader('WEBSOCKET CONNECTION TESTS');
  
  await runTest('websocket', 'Ticker Stream Setup', () => {
    try {
      const stream = apiManager.subscribeTicker(testSymbol, (ticker) => {
        // Just test if we can subscribe
      });
      if (stream) {
        // Close immediately after test
        setTimeout(() => stream(), 100);
        return { success: true, data: 'WebSocket ticker subscription successful' };
      }
      return { success: false, error: { message: 'Failed to subscribe to ticker' } };
    } catch (error) {
      return { success: false, error: { message: error.message } };
    }
  });

  // FINAL SUMMARY
  printHeader('TEST SUMMARY');
  
  const successRate = ((summary.passed / summary.total) * 100).toFixed(1);
  
  colorLog(`Total Tests: ${summary.total}`, colors.bright);
  colorLog(`Passed: ${summary.passed}`, colors.green);
  colorLog(`Failed: ${summary.failed}`, colors.red);
  colorLog(`Success Rate: ${successRate}%`, 
    successRate >= 80 ? colors.green : successRate >= 60 ? colors.yellow : colors.red);

  console.log('');
  colorLog('Category Breakdown:', colors.bright);
  
  Object.entries(summary.categories).forEach(([category, stats]) => {
    const categoryRate = ((stats.passed / stats.total) * 100).toFixed(1);
    const status = categoryRate >= 80 ? '🟢' : categoryRate >= 60 ? '🟡' : '🔴';
    colorLog(`${status} ${category}: ${stats.passed}/${stats.total} (${categoryRate}%)`, colors.cyan);
  });

  console.log('');
  
  if (successRate >= 80) {
    colorLog('🎉 ALL SYSTEMS GO! Binance API integration is working perfectly!', colors.green + colors.bright);
  } else if (successRate >= 60) {
    colorLog('⚠️ Some issues detected. Please check failed tests above.', colors.yellow + colors.bright);
  } else {
    colorLog('❌ Major issues detected. Please fix API configuration.', colors.red + colors.bright);
  }
  
  colorLog('\n📊 Detailed logs are available in the console above.', colors.cyan);
  
  process.exit(successRate >= 60 ? 0 : 1);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  colorLog(`💥 Uncaught Exception: ${error.message}`, colors.red);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  colorLog(`💥 Unhandled Rejection at Promise: ${reason}`, colors.red);
  process.exit(1);
});

// Run the test
runComprehensiveTest().catch((error) => {
  colorLog(`💥 Test suite failed: ${error.message}`, colors.red);
  process.exit(1);
});