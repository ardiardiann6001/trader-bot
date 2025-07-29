import Binance from 'binance-api-node';

/**
 * Comprehensive Binance API Utility
 * Mendukung semua fungsi binance-api-node dengan testnet dan error handling
 */
class BinanceAPIManager {
  constructor(config = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.NEXT_PUBLIC_BINANCE_API_KEY,
      apiSecret: config.apiSecret || process.env.NEXT_PUBLIC_BINANCE_API_SECRET,
      isTestnet: config.isTestnet || process.env.NEXT_PUBLIC_BINANCE_TESTNET === 'true',
      timeout: config.timeout || 60000,
      recvWindow: config.recvWindow || 5000,
      ...config
    };

    this.client = null;
    this.isConnected = false;
    this.lastPing = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    this.init();
  }

  /**
   * Initialize Binance client
   */
  init() {
    try {
      const options = {
        apiKey: this.config.apiKey,
        apiSecret: this.config.apiSecret,
        timeout: this.config.timeout,
        recvWindow: this.config.recvWindow,
        getTime: () => Date.now()
      };

      // Testnet configuration
      if (this.config.isTestnet) {
        options.httpBase = 'https://testnet.binance.vision';
        options.wsBase = 'wss://testnet.binance.vision';
        options.httpFutures = 'https://testnet.binancefuture.com';
        options.wsFutures = 'wss://testnet.binancefuture.com';
      }

      // Handle both default and named exports
      const BinanceClient = Binance.default || Binance;
      
      // Check if BinanceClient is available and is a function
      if (typeof BinanceClient !== 'function') {
        console.error('Binance import issue:', typeof BinanceClient, BinanceClient);
        throw new Error('Binance client is not a function. Check binance-api-node installation.');
      }

      this.client = BinanceClient(options);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      console.log(`✅ Binance API Client initialized (${this.config.isTestnet ? 'TESTNET' : 'LIVE'})`);
    } catch (error) {
      console.error('❌ Failed to initialize Binance client:', error);
      this.handleReconnection();
    }
  }

  /**
   * Handle reconnection logic
   */
  async handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`🔄 Reconnecting attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.init();
    }, delay);
  }

  /**
   * Execute API call with error handling
   */
  async executeWithErrorHandling(apiCall, ...args) {
    try {
      if (!this.client) {
        throw new Error('Binance client not initialized');
      }

      const result = await apiCall.apply(this.client, args);
      this.reconnectAttempts = 0; // Reset on successful call
      return { success: true, data: result, error: null };
    } catch (error) {
      console.error('API Error:', error);
      
      // Handle specific error types
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        this.handleReconnection();
      }
      
      return { 
        success: false, 
        data: null, 
        error: {
          code: error.code,
          message: error.message,
          timestamp: Date.now()
        }
      };
    }
  }

  // ==========================================
  // MARKET DATA FUNCTIONS
  // ==========================================

  /**
   * Test connectivity to the API
   */
  async ping() {
    return this.executeWithErrorHandling(this.client.ping);
  }

  /**
   * Get server time
   */
  async time() {
    return this.executeWithErrorHandling(this.client.time);
  }

  /**
   * Get exchange info
   */
  async exchangeInfo(symbol = null) {
    return this.executeWithErrorHandling(this.client.exchangeInfo, symbol ? { symbol } : {});
  }

  /**
   * Get order book
   */
  async orderBook(symbol, limit = 100) {
    return this.executeWithErrorHandling(this.client.book, { symbol, limit });
  }

  /**
   * Get klines/candlestick data
   */
  async klines(symbol, interval = '1h', options = {}) {
    const params = {
      symbol,
      interval,
      limit: options.limit || 500,
      ...options
    };
    return this.executeWithErrorHandling(this.client.candles, params);
  }

  /**
   * Get aggregated trades
   */
  async aggTrades(symbol, options = {}) {
    const params = { symbol, ...options };
    return this.executeWithErrorHandling(this.client.aggTrades, params);
  }

  /**
   * Get recent trades
   */
  async trades(symbol, limit = 500) {
    return this.executeWithErrorHandling(this.client.trades, { symbol, limit });
  }

  /**
   * Get 24hr ticker statistics
   */
  async ticker24hr(symbol = null) {
    return this.executeWithErrorHandling(this.client.dailyStats, symbol ? { symbol } : {});
  }

  /**
   * Get average price
   */
  async avgPrice(symbol) {
    return this.executeWithErrorHandling(this.client.avgPrice, { symbol });
  }

  /**
   * Get all symbol prices
   */
  async prices(symbol = null) {
    return this.executeWithErrorHandling(this.client.prices, symbol ? { symbol } : {});
  }

  /**
   * Get best bid/ask prices
   */
  async bookTickers(symbol = null) {
    return this.executeWithErrorHandling(this.client.allBookTickers, symbol ? { symbol } : {});
  }

  // ==========================================
  // ACCOUNT FUNCTIONS
  // ==========================================

  /**
   * Get account information
   */
  async accountInfo() {
    return this.executeWithErrorHandling(this.client.accountInfo);
  }

  /**
   * Get account trades
   */
  async myTrades(symbol, options = {}) {
    const params = { symbol, ...options };
    return this.executeWithErrorHandling(this.client.myTrades, params);
  }

  /**
   * Get open orders
   */
  async openOrders(symbol = null) {
    return this.executeWithErrorHandling(this.client.openOrders, symbol ? { symbol } : {});
  }

  /**
   * Get all orders
   */
  async allOrders(symbol, options = {}) {
    const params = { symbol, ...options };
    return this.executeWithErrorHandling(this.client.allOrders, params);
  }

  // ==========================================
  // ORDER MANAGEMENT
  // ==========================================

  /**
   * Place new order
   */
  async placeOrder(orderParams) {
    const requiredParams = ['symbol', 'side', 'type'];
    for (const param of requiredParams) {
      if (!orderParams[param]) {
        return {
          success: false,
          data: null,
          error: { message: `Missing required parameter: ${param}` }
        };
      }
    }

    return this.executeWithErrorHandling(this.client.order, orderParams);
  }

  /**
   * Test order placement
   */
  async testOrder(orderParams) {
    return this.executeWithErrorHandling(this.client.orderTest, orderParams);
  }

  /**
   * Get order status
   */
  async getOrder(symbol, orderId = null, origClientOrderId = null) {
    const params = { symbol };
    if (orderId) params.orderId = orderId;
    if (origClientOrderId) params.origClientOrderId = origClientOrderId;
    
    return this.executeWithErrorHandling(this.client.getOrder, params);
  }

  /**
   * Cancel order
   */
  async cancelOrder(symbol, orderId = null, origClientOrderId = null) {
    const params = { symbol };
    if (orderId) params.orderId = orderId;
    if (origClientOrderId) params.origClientOrderId = origClientOrderId;
    
    return this.executeWithErrorHandling(this.client.cancelOrder, params);
  }

  /**
   * Cancel all open orders
   */
  async cancelAllOrders(symbol) {
    return this.executeWithErrorHandling(this.client.cancelOpenOrders, { symbol });
  }

  // ==========================================
  // CONVENIENCE TRADING FUNCTIONS
  // ==========================================

  /**
   * Market buy order
   */
  async marketBuy(symbol, quantity, options = {}) {
    const orderParams = {
      symbol,
      side: 'BUY',
      type: 'MARKET',
      quantity: quantity.toString(),
      ...options
    };
    return this.placeOrder(orderParams);
  }

  /**
   * Market sell order
   */
  async marketSell(symbol, quantity, options = {}) {
    const orderParams = {
      symbol,
      side: 'SELL',
      type: 'MARKET',
      quantity: quantity.toString(),
      ...options
    };
    return this.placeOrder(orderParams);
  }

  /**
   * Limit buy order
   */
  async limitBuy(symbol, quantity, price, options = {}) {
    const orderParams = {
      symbol,
      side: 'BUY',
      type: 'LIMIT',
      quantity: quantity.toString(),
      price: price.toString(),
      timeInForce: 'GTC',
      ...options
    };
    return this.placeOrder(orderParams);
  }

  /**
   * Limit sell order
   */
  async limitSell(symbol, quantity, price, options = {}) {
    const orderParams = {
      symbol,
      side: 'SELL',
      type: 'LIMIT',
      quantity: quantity.toString(),
      price: price.toString(),
      timeInForce: 'GTC',
      ...options
    };
    return this.placeOrder(orderParams);
  }

  /**
   * Stop loss order
   */
  async stopLoss(symbol, quantity, stopPrice, side = 'SELL', options = {}) {
    const orderParams = {
      symbol,
      side,
      type: 'STOP_LOSS_LIMIT',
      quantity: quantity.toString(),
      price: stopPrice.toString(),
      stopPrice: stopPrice.toString(),
      timeInForce: 'GTC',
      ...options
    };
    return this.placeOrder(orderParams);
  }

  /**
   * Take profit order
   */
  async takeProfit(symbol, quantity, price, side = 'SELL', options = {}) {
    const orderParams = {
      symbol,
      side,
      type: 'TAKE_PROFIT_LIMIT',
      quantity: quantity.toString(),
      price: price.toString(),
      stopPrice: price.toString(),
      timeInForce: 'GTC',
      ...options
    };
    return this.placeOrder(orderParams);
  }

  // ==========================================
  // WEBSOCKET FUNCTIONS
  // ==========================================

  /**
   * Subscribe to ticker updates
   */
  subscribeTicker(symbol, callback) {
    try {
      const stream = this.client.ws.ticker(symbol, callback);
      console.log(`📡 Subscribed to ticker stream for ${symbol}`);
      return stream;
    } catch (error) {
      console.error('WebSocket ticker error:', error);
      return null;
    }
  }

  /**
   * Subscribe to kline/candlestick updates
   */
  subscribeKlines(symbol, interval, callback) {
    try {
      const stream = this.client.ws.candles(symbol, interval, callback);
      console.log(`📡 Subscribed to klines stream for ${symbol} ${interval}`);
      return stream;
    } catch (error) {
      console.error('WebSocket klines error:', error);
      return null;
    }
  }

  /**
   * Subscribe to user data stream
   */
  subscribeUserData(callback) {
    try {
      const stream = this.client.ws.user(callback);
      console.log('📡 Subscribed to user data stream');
      return stream;
    } catch (error) {
      console.error('WebSocket user data error:', error);
      return null;
    }
  }

  /**
   * Subscribe to depth/order book updates
   */
  subscribeDepth(symbol, callback) {
    try {
      const stream = this.client.ws.depth(symbol, callback);
      console.log(`📡 Subscribed to depth stream for ${symbol}`);
      return stream;
    } catch (error) {
      console.error('WebSocket depth error:', error);
      return null;
    }
  }

  /**
   * Subscribe to trade updates
   */
  subscribeTrades(symbol, callback) {
    try {
      const stream = this.client.ws.trades([symbol], callback);
      console.log(`📡 Subscribed to trades stream for ${symbol}`);
      return stream;
    } catch (error) {
      console.error('WebSocket trades error:', error);
      return null;
    }
  }

  // ==========================================
  // TESTING FUNCTIONS
  // ==========================================

  /**
   * Test all market data functions
   */
  async testMarketDataFunctions(symbol = 'BTCUSDT') {
    console.log('🧪 Testing Market Data Functions...');
    
    const tests = [
      { name: 'ping', func: () => this.ping() },
      { name: 'time', func: () => this.time() },
      { name: 'exchangeInfo', func: () => this.exchangeInfo() },
      { name: 'orderBook', func: () => this.orderBook(symbol, 10) },
      { name: 'klines', func: () => this.klines(symbol, '1h', { limit: 10 }) },
      { name: 'aggTrades', func: () => this.aggTrades(symbol, { limit: 10 }) },
      { name: 'trades', func: () => this.trades(symbol, 10) },
      { name: 'ticker24hr', func: () => this.ticker24hr(symbol) },
      { name: 'avgPrice', func: () => this.avgPrice(symbol) },
      { name: 'prices', func: () => this.prices() },
      { name: 'bookTickers', func: () => this.bookTickers() }
    ];

    const results = {};
    
    for (const test of tests) {
      try {
        console.log(`Testing ${test.name}...`);
        const result = await test.func();
        results[test.name] = result;
        console.log(`✅ ${test.name}: ${result.success ? 'PASS' : 'FAIL'}`);
      } catch (error) {
        console.log(`❌ ${test.name}: ERROR - ${error.message}`);
        results[test.name] = { success: false, error: error.message };
      }
    }

    return results;
  }

  /**
   * Test account functions
   */
  async testAccountFunctions() {
    console.log('🧪 Testing Account Functions...');
    
    const tests = [
      { name: 'accountInfo', func: () => this.accountInfo() },
      { name: 'openOrders', func: () => this.openOrders() }
    ];

    const results = {};
    
    for (const test of tests) {
      try {
        console.log(`Testing ${test.name}...`);
        const result = await test.func();
        results[test.name] = result;
        console.log(`✅ ${test.name}: ${result.success ? 'PASS' : 'FAIL'}`);
      } catch (error) {
        console.log(`❌ ${test.name}: ERROR - ${error.message}`);
        results[test.name] = { success: false, error: error.message };
      }
    }

    return results;
  }

  /**
   * Test order functions (testnet only)
   */
  async testOrderFunctions(symbol = 'BTCUSDT') {
    if (!this.config.isTestnet) {
      console.warn('⚠️ Order testing only available on testnet');
      return { error: 'Testnet required for order testing' };
    }

    console.log('🧪 Testing Order Functions...');
    
    try {
      // Test order placement
      const testOrderResult = await this.testOrder({
        symbol,
        side: 'BUY',
        type: 'LIMIT',
        quantity: '0.001',
        price: '20000',
        timeInForce: 'GTC'
      });

      console.log('✅ Test order:', testOrderResult.success ? 'PASS' : 'FAIL');
      return { testOrder: testOrderResult };
    } catch (error) {
      console.log('❌ Order testing failed:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Complete API test suite
   */
  async runCompleteTestSuite(symbol = 'BTCUSDT') {
    console.log('🚀 Running Complete Binance API Test Suite...');
    console.log(`Mode: ${this.config.isTestnet ? 'TESTNET' : 'LIVE'}`);
    console.log('='.repeat(50));

    const results = {
      marketData: await this.testMarketDataFunctions(symbol),
      account: await this.testAccountFunctions(),
      orders: await this.testOrderFunctions(symbol),
      timestamp: Date.now(),
      summary: {}
    };

    // Calculate summary
    const categories = ['marketData', 'account', 'orders'];
    let totalTests = 0;
    let passedTests = 0;

    categories.forEach(category => {
      if (results[category] && !results[category].error) {
        const categoryTests = Object.values(results[category]);
        const categoryPassed = categoryTests.filter(test => test.success).length;
        
        totalTests += categoryTests.length;
        passedTests += categoryPassed;
        
        results.summary[category] = {
          total: categoryTests.length,
          passed: categoryPassed,
          failed: categoryTests.length - categoryPassed
        };
      }
    });

    results.summary.overall = {
      total: totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      successRate: totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : 0
    };

    console.log('='.repeat(50));
    console.log('📊 Test Summary:');
    console.log(`Total Tests: ${results.summary.overall.total}`);
    console.log(`Passed: ${results.summary.overall.passed}`);
    console.log(`Failed: ${results.summary.overall.failed}`);
    console.log(`Success Rate: ${results.summary.overall.successRate}%`);

    return results;
  }

  // ==========================================
  // FUTURES FUNCTIONS (jika tersedia)
  // ==========================================

  /**
   * Get futures account information
   */
  async futuresAccountInfo() {
    if (!this.client.futuresAccountInfo) {
      return { success: false, error: { message: 'Futures API not available' } };
    }
    return this.executeWithErrorHandling(this.client.futuresAccountInfo);
  }

  /**
   * Get futures exchange info
   */
  async futuresExchangeInfo() {
    if (!this.client.futuresExchangeInfo) {
      return { success: false, error: { message: 'Futures API not available' } };
    }
    return this.executeWithErrorHandling(this.client.futuresExchangeInfo);
  }

  /**
   * Get futures klines
   */
  async futuresKlines(symbol, interval = '1h', options = {}) {
    if (!this.client.futuresCandles) {
      return { success: false, error: { message: 'Futures API not available' } };
    }
    const params = {
      symbol,
      interval,
      limit: options.limit || 500,
      ...options
    };
    return this.executeWithErrorHandling(this.client.futuresCandles, params);
  }

  // ==========================================
  // MARGIN TRADING FUNCTIONS
  // ==========================================

  /**
   * Get margin account info
   */
  async marginAccountInfo() {
    if (!this.client.marginAccountInfo) {
      return { success: false, error: { message: 'Margin API not available' } };
    }
    return this.executeWithErrorHandling(this.client.marginAccountInfo);
  }

  /**
   * Transfer to margin account
   */
  async marginTransfer(asset, amount, type = 1) {
    if (!this.client.marginTransfer) {
      return { success: false, error: { message: 'Margin API not available' } };
    }
    return this.executeWithErrorHandling(this.client.marginTransfer, {
      asset,
      amount,
      type // 1 for transfer to margin, 2 for transfer to main
    });
  }

  /**
   * Margin order
   */
  async marginOrder(orderParams) {
    if (!this.client.marginOrder) {
      return { success: false, error: { message: 'Margin API not available' } };
    }
    return this.executeWithErrorHandling(this.client.marginOrder, orderParams);
  }

  // ==========================================
  // ADVANCED ORDER FUNCTIONS
  // ==========================================

  /**
   * OCO (One-Cancels-Other) order
   */
  async ocoOrder(symbol, side, quantity, price, stopPrice, stopLimitPrice, options = {}) {
    const orderParams = {
      symbol,
      side,
      quantity: quantity.toString(),
      price: price.toString(),
      stopPrice: stopPrice.toString(),
      stopLimitPrice: stopLimitPrice.toString(),
      stopLimitTimeInForce: 'GTC',
      ...options
    };
    
    if (!this.client.orderOco) {
      // Fallback jika OCO tidak tersedia
      return this.executeWithErrorHandling(this.client.order, orderParams);
    }
    
    return this.executeWithErrorHandling(this.client.orderOco, orderParams);
  }

  /**
   * Trailing stop order
   */
  async trailingStopOrder(symbol, side, quantity, callbackRate, options = {}) {
    const orderParams = {
      symbol,
      side,
      type: 'TRAILING_STOP_MARKET',
      quantity: quantity.toString(),
      callbackRate: callbackRate.toString(),
      ...options
    };
    return this.placeOrder(orderParams);
  }

  // ==========================================
  // WALLET & DEPOSIT/WITHDRAWAL FUNCTIONS
  // ==========================================

  /**
   * Get deposit history
   */
  async getDepositHistory(asset = null, options = {}) {
    const params = asset ? { asset, ...options } : options;
    return this.executeWithErrorHandling(this.client.depositHistory, params);
  }

  /**
   * Get withdraw history
   */
  async getWithdrawHistory(asset = null, options = {}) {
    const params = asset ? { asset, ...options } : options;
    return this.executeWithErrorHandling(this.client.withdrawHistory, params);
  }

  /**
   * Get deposit address
   */
  async getDepositAddress(asset, network = null) {
    const params = network ? { asset, network } : { asset };
    return this.executeWithErrorHandling(this.client.depositAddress, params);
  }

  /**
   * Withdraw asset
   */
  async withdraw(asset, address, amount, options = {}) {
    const params = {
      asset,
      address,
      amount: amount.toString(),
      ...options
    };
    return this.executeWithErrorHandling(this.client.withdraw, params);
  }

  // ==========================================
  // LENDING & STAKING FUNCTIONS
  // ==========================================

  /**
   * Get lending account
   */
  async getLendingAccount() {
    if (!this.client.lending) {
      return { success: false, error: { message: 'Lending API not available' } };
    }
    return this.executeWithErrorHandling(this.client.lending.account);
  }

  /**
   * Get staking products
   */
  async getStakingProducts(product = 'STAKING', options = {}) {
    if (!this.client.stakingProductList) {
      return { success: false, error: { message: 'Staking API not available' } };
    }
    const params = { product, ...options };
    return this.executeWithErrorHandling(this.client.stakingProductList, params);
  }

  // ==========================================
  // ADDITIONAL UTILITY FUNCTIONS
  // ==========================================

  /**
   * Get order book ticker for all symbols
   */
  async getAllOrderBookTickers() {
    return this.executeWithErrorHandling(this.client.allBookTickers);
  }

  /**
   * Get 24hr price change statistics for all symbols
   */
  async getAll24hrPriceChange() {
    return this.executeWithErrorHandling(this.client.dailyStats);
  }

  /**
   * Get symbol price ticker for all symbols
   */
  async getAllPriceTickers() {
    return this.executeWithErrorHandling(this.client.prices);
  }

  /**
   * Calculate position size based on risk percentage
   */
  calculatePositionSize(accountBalance, riskPercent, entryPrice, stopLoss) {
    const riskAmount = accountBalance * (riskPercent / 100);
    const priceRisk = Math.abs(entryPrice - stopLoss);
    return riskAmount / priceRisk;
  }

  /**
   * Calculate profit/loss
   */
  calculatePnL(entryPrice, exitPrice, quantity, side = 'BUY') {
    if (side.toUpperCase() === 'BUY') {
      return (exitPrice - entryPrice) * quantity;
    } else {
      return (entryPrice - exitPrice) * quantity;
    }
  }

  /**
   * Format number for Binance API (remove scientific notation)
   */
  formatNumber(num, precision = 8) {
    return parseFloat(num.toFixed(precision)).toString();
  }

  /**
   * Get symbol info from exchange info
   */
  async getSymbolInfo(symbol) {
    const exchangeInfoResult = await this.exchangeInfo();
    if (!exchangeInfoResult.success) {
      return exchangeInfoResult;
    }

    const symbolInfo = exchangeInfoResult.data.symbols.find(s => s.symbol === symbol);
    if (!symbolInfo) {
      return {
        success: false,
        error: { message: `Symbol ${symbol} not found` }
      };
    }

    return { success: true, data: symbolInfo };
  }

  /**
   * Validate order parameters based on symbol filters
   */
  async validateOrderParams(symbol, orderParams) {
    const symbolInfoResult = await this.getSymbolInfo(symbol);
    if (!symbolInfoResult.success) {
      return symbolInfoResult;
    }

    const symbolInfo = symbolInfoResult.data;
    const errors = [];

    // Check if trading is allowed
    if (symbolInfo.status !== 'TRADING') {
      errors.push(`Symbol ${symbol} is not trading (status: ${symbolInfo.status})`);
    }

    // Check order types
    if (!symbolInfo.orderTypes.includes(orderParams.type)) {
      errors.push(`Order type ${orderParams.type} not allowed for ${symbol}`);
    }

    // Check filters
    for (const filter of symbolInfo.filters) {
      switch (filter.filterType) {
        case 'PRICE_FILTER':
          if (orderParams.price) {
            const price = parseFloat(orderParams.price);
            const minPrice = parseFloat(filter.minPrice);
            const maxPrice = parseFloat(filter.maxPrice);
            
            if (price < minPrice || price > maxPrice) {
              errors.push(`Price ${price} outside allowed range [${minPrice}, ${maxPrice}]`);
            }
          }
          break;

        case 'LOT_SIZE':
          if (orderParams.quantity) {
            const quantity = parseFloat(orderParams.quantity);
            const minQty = parseFloat(filter.minQty);
            const maxQty = parseFloat(filter.maxQty);
            const stepSize = parseFloat(filter.stepSize);
            
            if (quantity < minQty || quantity > maxQty) {
              errors.push(`Quantity ${quantity} outside allowed range [${minQty}, ${maxQty}]`);
            }
            
            // Check step size
            const qtySteps = (quantity - minQty) / stepSize;
            if (Math.abs(qtySteps - Math.round(qtySteps)) > 1e-8) {
              errors.push(`Quantity ${quantity} does not match step size ${stepSize}`);
            }
          }
          break;

        case 'MIN_NOTIONAL':
          if (orderParams.price && orderParams.quantity) {
            const notional = parseFloat(orderParams.price) * parseFloat(orderParams.quantity);
            const minNotional = parseFloat(filter.minNotional);
            
            if (notional < minNotional) {
              errors.push(`Order notional ${notional} below minimum ${minNotional}`);
            }
          }
          break;
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: { message: 'Order validation failed', details: errors }
      };
    }

    return { success: true, data: 'Order parameters valid' };
  }

  // ==========================================
  // ENHANCED TESTING FUNCTIONS
  // ==========================================

  /**
   * Comprehensive API health check
   */
  async performHealthCheck() {
    console.log('🩺 Performing comprehensive API health check...');
    
    const healthChecks = {
      connectivity: false,
      serverTime: false,
      exchangeInfo: false,
      authentication: false,
      marketData: false,
      account: false,
      websocket: false
    };

    const results = {};

    // 1. Test connectivity
    try {
      const pingResult = await this.ping();
      healthChecks.connectivity = pingResult.success;
      results.ping = pingResult;
      console.log(`✅ Connectivity: ${healthChecks.connectivity ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      console.log('❌ Connectivity: FAIL');
      results.ping = { success: false, error: error.message };
    }

    // 2. Test server time
    try {
      const timeResult = await this.time();
      healthChecks.serverTime = timeResult.success;
      results.serverTime = timeResult;
      console.log(`✅ Server Time: ${healthChecks.serverTime ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      console.log('❌ Server Time: FAIL');
      results.serverTime = { success: false, error: error.message };
    }

    // 3. Test exchange info
    try {
      const exchangeInfoResult = await this.exchangeInfo();
      healthChecks.exchangeInfo = exchangeInfoResult.success;
      results.exchangeInfo = exchangeInfoResult;
      console.log(`✅ Exchange Info: ${healthChecks.exchangeInfo ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      console.log('❌ Exchange Info: FAIL');
      results.exchangeInfo = { success: false, error: error.message };
    }

    // 4. Test authentication (account info)
    try {
      const accountResult = await this.accountInfo();
      healthChecks.authentication = accountResult.success;
      healthChecks.account = accountResult.success;
      results.accountInfo = accountResult;
      console.log(`✅ Authentication: ${healthChecks.authentication ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      console.log('❌ Authentication: FAIL');
      results.accountInfo = { success: false, error: error.message };
    }

    // 5. Test market data
    try {
      const pricesResult = await this.prices();
      healthChecks.marketData = pricesResult.success;
      results.marketData = pricesResult;
      console.log(`✅ Market Data: ${healthChecks.marketData ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      console.log('❌ Market Data: FAIL');
      results.marketData = { success: false, error: error.message };
    }

    // Calculate overall health score
    const passedChecks = Object.values(healthChecks).filter(Boolean).length;
    const totalChecks = Object.keys(healthChecks).length;
    const healthScore = (passedChecks / totalChecks) * 100;

    console.log('='.repeat(50));
    console.log(`🏥 Health Check Summary:`);
    console.log(`Overall Health Score: ${healthScore.toFixed(1)}%`);
    console.log(`Passed Checks: ${passedChecks}/${totalChecks}`);
    console.log(`API Status: ${healthScore >= 80 ? '🟢 HEALTHY' : healthScore >= 50 ? '🟡 DEGRADED' : '🔴 UNHEALTHY'}`);

    return {
      healthScore,
      healthChecks,
      results,
      timestamp: Date.now(),
      status: healthScore >= 80 ? 'HEALTHY' : healthScore >= 50 ? 'DEGRADED' : 'UNHEALTHY'
    };
  }

  /**
   * Test advanced trading functions
   */
  async testAdvancedTrading(symbol = 'BTCUSDT') {
    if (!this.config.isTestnet) {
      console.warn('⚠️ Advanced trading testing only available on testnet');
      return { error: 'Testnet required for advanced trading testing' };
    }

    console.log('🧪 Testing Advanced Trading Functions...');
    
    const tests = {};

    // Test OCO order
    try {
      console.log('Testing OCO order...');
      const ocoResult = await this.testOrder({
        symbol,
        side: 'BUY',
        type: 'STOP_LOSS_LIMIT',
        quantity: '0.001',
        price: '20000',
        stopPrice: '19000',
        timeInForce: 'GTC'
      });
      tests.ocoOrder = ocoResult;
      console.log(`✅ OCO Order: ${ocoResult.success ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      tests.ocoOrder = { success: false, error: error.message };
      console.log('❌ OCO Order: FAIL');
    }

    // Test order validation
    try {
      console.log('Testing order validation...');
      const validationResult = await this.validateOrderParams(symbol, {
        type: 'LIMIT',
        side: 'BUY',
        quantity: '0.001',
        price: '20000'
      });
      tests.orderValidation = validationResult;
      console.log(`✅ Order Validation: ${validationResult.success ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      tests.orderValidation = { success: false, error: error.message };
      console.log('❌ Order Validation: FAIL');
    }

    // Test position size calculation
    try {
      console.log('Testing position size calculation...');
      const positionSize = this.calculatePositionSize(10000, 1, 50000, 49000);
      tests.positionSizeCalculation = {
        success: true,
        data: {
          accountBalance: 10000,
          riskPercent: 1,
          entryPrice: 50000,
          stopLoss: 49000,
          calculatedSize: positionSize
        }
      };
      console.log(`✅ Position Size Calculation: PASS (Size: ${positionSize.toFixed(6)})`);
    } catch (error) {
      tests.positionSizeCalculation = { success: false, error: error.message };
      console.log('❌ Position Size Calculation: FAIL');
    }

    return tests;
  }

  /**
   * Run stress test
   */
  async runStressTest(iterations = 10, delayMs = 1000) {
    console.log(`🏋️ Running stress test with ${iterations} iterations...`);
    
    const results = {
      successful: 0,
      failed: 0,
      errors: [],
      avgResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity
    };

    const responseTimes = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      try {
        // Test multiple endpoints simultaneously
        const promises = [
          this.ping(),
          this.time(),
          this.prices('BTCUSDT'),
          this.ticker24hr('BTCUSDT')
        ];

        const responses = await Promise.all(promises);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        responseTimes.push(responseTime);
        
        const allSuccessful = responses.every(r => r.success);
        
        if (allSuccessful) {
          results.successful++;
          console.log(`✅ Iteration ${i + 1}: SUCCESS (${responseTime}ms)`);
        } else {
          results.failed++;
          console.log(`❌ Iteration ${i + 1}: FAILED (${responseTime}ms)`);
        }
        
      } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        responseTimes.push(responseTime);
        
        results.failed++;
        results.errors.push({
          iteration: i + 1,
          error: error.message,
          responseTime
        });
        console.log(`❌ Iteration ${i + 1}: ERROR (${responseTime}ms) - ${error.message}`);
      }

      // Delay between requests to avoid rate limiting
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Calculate statistics
    results.avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    results.maxResponseTime = Math.max(...responseTimes);
    results.minResponseTime = Math.min(...responseTimes);
    results.successRate = (results.successful / iterations) * 100;

    console.log('='.repeat(50));
    console.log('📊 Stress Test Results:');
    console.log(`Success Rate: ${results.successRate.toFixed(1)}%`);
    console.log(`Successful: ${results.successful}/${iterations}`);
    console.log(`Failed: ${results.failed}/${iterations}`);
    console.log(`Avg Response Time: ${results.avgResponseTime.toFixed(0)}ms`);
    console.log(`Min Response Time: ${results.minResponseTime}ms`);
    console.log(`Max Response Time: ${results.maxResponseTime}ms`);

    return results;
  }
}

export default BinanceAPIManager;