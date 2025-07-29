import React, { useState, useEffect } from 'react';
import BinanceAPIManager from '../utils/binanceApi';
import { FaPlay, FaStop, FaCheck, FaTimes, FaSpinner, FaDownload, FaCog } from 'react-icons/fa';

const BinanceApiTester = () => {
  const [apiManager, setApiManager] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');
  const [config, setConfig] = useState({
    apiKey: process.env.NEXT_PUBLIC_BINANCE_API_KEY || '',
    apiSecret: process.env.NEXT_PUBLIC_BINANCE_API_SECRET || '',
    isTestnet: process.env.NEXT_PUBLIC_BINANCE_TESTNET === 'true',
    testSymbol: 'BTCUSDT'
  });

  // Initialize API Manager
  useEffect(() => {
    if (config.apiKey && config.apiSecret) {
      try {
        const manager = new BinanceAPIManager(config);
        setApiManager(manager);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize API Manager:', error);
        setTestResults(prev => ({
          ...prev,
          initialization: {
            success: false,
            error: error.message,
            timestamp: Date.now()
          }
        }));
      }
    }
  }, [config]);

  // Test categories
  const testCategories = {
    basic: {
      name: 'Basic API Tests',
      tests: [
        { name: 'Ping', method: 'ping' },
        { name: 'Server Time', method: 'time' },
        { name: 'Exchange Info', method: 'exchangeInfo' }
      ]
    },
    marketData: {
      name: 'Market Data Tests',
      tests: [
        { name: 'Order Book', method: 'orderBook', params: [config.testSymbol, 10] },
        { name: 'Klines', method: 'klines', params: [config.testSymbol, '1h', { limit: 10 }] },
        { name: '24hr Ticker', method: 'ticker24hr', params: [config.testSymbol] },
        { name: 'Price Ticker', method: 'prices', params: [config.testSymbol] },
        { name: 'Book Tickers', method: 'bookTickers', params: [config.testSymbol] },
        { name: 'Recent Trades', method: 'trades', params: [config.testSymbol, 10] },
        { name: 'Agg Trades', method: 'aggTrades', params: [config.testSymbol, { limit: 10 }] }
      ]
    },
    account: {
      name: 'Account Tests (Requires API Key)',
      tests: [
        { name: 'Account Info', method: 'accountInfo' },
        { name: 'Open Orders', method: 'openOrders' },
        { name: 'All Orders', method: 'allOrders', params: [config.testSymbol, { limit: 10 }] },
        { name: 'My Trades', method: 'myTrades', params: [config.testSymbol, { limit: 10 }] }
      ]
    },
    trading: {
      name: 'Trading Tests (Testnet Only)',
      tests: [
        { name: 'Test Order', method: 'testOrder', params: [{
          symbol: config.testSymbol,
          side: 'BUY',
          type: 'LIMIT',
          quantity: '0.001',
          price: '20000',
          timeInForce: 'GTC'
        }] },
        { name: 'Order Validation', method: 'validateOrderParams', params: [config.testSymbol, {
          type: 'LIMIT',
          side: 'BUY',
          quantity: '0.001',
          price: '20000'
        }] }
      ]
    },
    advanced: {
      name: 'Advanced Tests',
      tests: [
        { name: 'Health Check', method: 'performHealthCheck' },
        { name: 'Position Size Calc', method: 'calculatePositionSize', params: [10000, 1, 50000, 49000] },
        { name: 'PnL Calculation', method: 'calculatePnL', params: [50000, 51000, 0.1, 'BUY'] },
        { name: 'Symbol Info', method: 'getSymbolInfo', params: [config.testSymbol] }
      ]
    }
  };

  // Run individual test
  const runTest = async (categoryKey, testKey, test) => {
    if (!apiManager) return;

    const testId = `${categoryKey}_${testKey}`;
    setCurrentTest(testId);

    try {
      let result;
      
      if (test.params) {
        result = await apiManager[test.method](...test.params);
      } else {
        result = await apiManager[test.method]();
      }

      setTestResults(prev => ({
        ...prev,
        [testId]: {
          ...result,
          timestamp: Date.now(),
          testName: test.name,
          method: test.method
        }
      }));

    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [testId]: {
          success: false,
          error: { message: error.message },
          timestamp: Date.now(),
          testName: test.name,
          method: test.method
        }
      }));
    }

    setCurrentTest('');
  };

  // Run all tests in a category
  const runCategoryTests = async (categoryKey) => {
    if (!apiManager) return;

    setIsRunning(true);
    const category = testCategories[categoryKey];
    
    for (let i = 0; i < category.tests.length; i++) {
      const test = category.tests[i];
      await runTest(categoryKey, i, test);
      
      // Small delay between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsRunning(false);
  };

  // Run all tests
  const runAllTests = async () => {
    if (!apiManager) return;

    setIsRunning(true);
    setTestResults({});

    for (const categoryKey of Object.keys(testCategories)) {
      await runCategoryTests(categoryKey);
    }

    setIsRunning(false);
  };

  // Run comprehensive test suite
  const runComprehensiveTest = async () => {
    if (!apiManager) return;

    setIsRunning(true);
    setCurrentTest('comprehensive');

    try {
      const result = await apiManager.runCompleteTestSuite(config.testSymbol);
      setTestResults(prev => ({
        ...prev,
        comprehensive: {
          ...result,
          timestamp: Date.now(),
          testName: 'Comprehensive Test Suite'
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        comprehensive: {
          success: false,
          error: { message: error.message },
          timestamp: Date.now(),
          testName: 'Comprehensive Test Suite'
        }
      }));
    }

    setCurrentTest('');
    setIsRunning(false);
  };

  // Run stress test
  const runStressTest = async () => {
    if (!apiManager) return;

    setIsRunning(true);
    setCurrentTest('stress');

    try {
      const result = await apiManager.runStressTest(10, 1000);
      setTestResults(prev => ({
        ...prev,
        stress: {
          success: true,
          data: result,
          timestamp: Date.now(),
          testName: 'Stress Test'
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        stress: {
          success: false,
          error: { message: error.message },
          timestamp: Date.now(),
          testName: 'Stress Test'
        }
      }));
    }

    setCurrentTest('');
    setIsRunning(false);
  };

  // Export test results
  const exportResults = () => {
    const dataStr = JSON.stringify(testResults, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `binance-api-test-results-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Render test result
  const renderTestResult = (testId, result) => {
    if (!result) return null;

    const isRunning = currentTest === testId;
    
    return (
      <div key={testId} className={`p-3 rounded border ${
        result.success ? 'border-green-500 bg-green-900 bg-opacity-20' : 
        'border-red-500 bg-red-900 bg-opacity-20'
      }`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center">
            {isRunning ? (
              <FaSpinner className="animate-spin text-blue-400 mr-2" />
            ) : result.success ? (
              <FaCheck className="text-green-400 mr-2" />
            ) : (
              <FaTimes className="text-red-400 mr-2" />
            )}
            <span className="font-semibold">{result.testName || testId}</span>
          </div>
          <span className="text-xs text-gray-400">
            {new Date(result.timestamp).toLocaleTimeString()}
          </span>
        </div>

        {result.error && (
          <div className="text-red-400 text-sm mb-2">
            Error: {result.error.message}
          </div>
        )}

        {result.success && result.data && (
          <div className="text-xs text-gray-300">
            <details>
              <summary className="cursor-pointer hover:text-white">View Response</summary>
              <pre className="mt-2 p-2 bg-gray-800 rounded overflow-auto max-h-32">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <FaCog className="mr-3 text-blue-400" />
            Binance API Testing Suite
          </h1>
          <p className="text-gray-400">
            Comprehensive testing for all binance-api-node functions
          </p>
        </div>

        {/* Configuration */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-3">Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Test Symbol</label>
              <input
                type="text"
                value={config.testSymbol}
                onChange={(e) => setConfig({ ...config, testSymbol: e.target.value })}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                placeholder="BTCUSDT"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Environment</label>
              <div className={`px-3 py-2 rounded ${
                config.isTestnet ? 'bg-green-700 text-green-200' : 'bg-red-700 text-red-200'
              }`}>
                {config.isTestnet ? 'TESTNET' : 'LIVE'}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <div className={`px-3 py-2 rounded ${
                isInitialized ? 'bg-green-700 text-green-200' : 'bg-red-700 text-red-200'
              }`}>
                {isInitialized ? 'READY' : 'NOT READY'}
              </div>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-3">Test Controls</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={runAllTests}
              disabled={!isInitialized || isRunning}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded flex items-center"
            >
              <FaPlay className="mr-2" />
              Run All Tests
            </button>
            
            <button
              onClick={runComprehensiveTest}
              disabled={!isInitialized || isRunning}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded flex items-center"
            >
              <FaCheck className="mr-2" />
              Comprehensive Test
            </button>
            
            <button
              onClick={runStressTest}
              disabled={!isInitialized || isRunning}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 rounded flex items-center"
            >
              <FaSpinner className="mr-2" />
              Stress Test
            </button>
            
            <button
              onClick={exportResults}
              disabled={Object.keys(testResults).length === 0}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded flex items-center"
            >
              <FaDownload className="mr-2" />
              Export Results
            </button>
          </div>
        </div>

        {/* Test Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(testCategories).map(([categoryKey, category]) => (
            <div key={categoryKey} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{category.name}</h3>
                <button
                  onClick={() => runCategoryTests(categoryKey)}
                  disabled={!isInitialized || isRunning}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm"
                >
                  Run Category
                </button>
              </div>

              <div className="space-y-3">
                {category.tests.map((test, index) => {
                  const testId = `${categoryKey}_${index}`;
                  const result = testResults[testId];
                  const isTestRunning = currentTest === testId;

                  return (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                      <div className="flex items-center">
                        {isTestRunning ? (
                          <FaSpinner className="animate-spin text-blue-400 mr-2" />
                        ) : result ? (
                          result.success ? (
                            <FaCheck className="text-green-400 mr-2" />
                          ) : (
                            <FaTimes className="text-red-400 mr-2" />
                          )
                        ) : (
                          <div className="w-4 h-4 mr-2" />
                        )}
                        <span className="text-sm">{test.name}</span>
                      </div>
                      
                      <button
                        onClick={() => runTest(categoryKey, index, test)}
                        disabled={!isInitialized || isRunning}
                        className="px-2 py-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 rounded text-xs"
                      >
                        Test
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Results Section */}
        {Object.keys(testResults).length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <div className="space-y-4">
              {Object.entries(testResults).map(([testId, result]) =>
                renderTestResult(testId, result)
              )}
            </div>
          </div>
        )}

        {/* Summary Statistics */}
        {Object.keys(testResults).length > 0 && (
          <div className="mt-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold mb-3">Test Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {Object.keys(testResults).length}
                </div>
                <div className="text-sm text-gray-400">Total Tests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {Object.values(testResults).filter(r => r.success).length}
                </div>
                <div className="text-sm text-gray-400">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  {Object.values(testResults).filter(r => !r.success).length}
                </div>
                <div className="text-sm text-gray-400">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {Object.keys(testResults).length > 0 ? 
                    ((Object.values(testResults).filter(r => r.success).length / Object.keys(testResults).length) * 100).toFixed(1) : 0}%
                </div>
                <div className="text-sm text-gray-400">Success Rate</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BinanceApiTester;