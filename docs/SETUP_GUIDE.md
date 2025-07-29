# 🚀 Setup Guide - Bot Auto Trading Binance Professional

Panduan lengkap untuk setup dan konfigurasi bot trading Binance dengan testnet.

## 📋 Daftar Isi

1. [Mendapatkan API Key Testnet](#mendapatkan-api-key-testnet)
2. [Konfigurasi Environment](#konfigurasi-environment)
3. [Setup Dependencies](#setup-dependencies)
4. [Testing & Verifikasi](#testing--verifikasi)
5. [Menjalankan Bot](#menjalankan-bot)
6. [Troubleshooting](#troubleshooting)

---

## 🔑 Mendapatkan API Key Testnet

### Step 1: Akses Binance Testnet
1. Buka website [Binance Spot Testnet](https://testnet.binance.vision/)
2. Klik **"Log In with GitHub"** 
3. Login menggunakan akun GitHub Anda
4. Authorize aplikasi Binance Testnet

### Step 2: Generate API Key
1. Setelah login, Anda akan melihat dashboard testnet
2. Klik **"Generate HMAC_SHA256 Key"** atau **"Generate RSA Key"** atau **"Generate Ed25519 Key"**
3. **RECOMMENDED**: Gunakan **Ed25519** untuk performa terbaik
4. Copy dan simpan:
   - **API Key** (Public Key)
   - **Secret Key** (Private Key)

### Step 3: Konfigurasi Permissions
API key testnet sudah otomatis memiliki semua permissions yang diperlukan:
- ✅ **Read Info** - Akses market data
- ✅ **Spot Trading** - Trading spot
- ✅ **Futures** - Trading futures (jika tersedia)

### ⚠️ PENTING: Keamanan API Key
- **JANGAN PERNAH** share API key di tempat publik
- **JANGAN** commit API key ke Git repository
- **GUNAKAN** environment variables
- API key testnet ini **HANYA** untuk testing, bukan real money

---

## ⚙️ Konfigurasi Environment

### Step 1: Update File `.env.local`

Buka file `.env.local` dan ganti placeholder dengan API key asli:

```bash
# Binance API Configuration untuk Testnet
NEXT_PUBLIC_BINANCE_API_KEY=your_real_testnet_api_key_here
NEXT_PUBLIC_BINANCE_API_SECRET=your_real_testnet_secret_here
NEXT_PUBLIC_BINANCE_TESTNET=true

# Trading Bot Configuration
NEXT_PUBLIC_BOT_MODE=demo
NEXT_PUBLIC_DEFAULT_SYMBOL=BTCUSDT
NEXT_PUBLIC_DEFAULT_TIMEFRAME=5m
NEXT_PUBLIC_INITIAL_BALANCE=10000

# Debug Mode
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_LOG_LEVEL=info

# WebSocket Configuration
NEXT_PUBLIC_WS_RECONNECT_ATTEMPTS=5
NEXT_PUBLIC_WS_RECONNECT_DELAY=1000

# Risk Management
NEXT_PUBLIC_MAX_RISK_PER_TRADE=2
NEXT_PUBLIC_MAX_DRAWDOWN=10
NEXT_PUBLIC_STOP_LOSS_PERCENTAGE=1
NEXT_PUBLIC_TAKE_PROFIT_PERCENTAGE=3
```

### Step 2: Verifikasi Environment Variables

```bash
# Test apakah environment variables ter-load
npm run test-api
```

---

## 📦 Setup Dependencies

### Pastikan Semua Dependencies Terinstall

```bash
# Install dependencies
npm install

# Verifikasi instalasi
npm list binance-api-node
npm list react-chartjs-2
npm list technicalindicators
```

### Dependencies Utama:
- `binance-api-node` - Binance API client
- `react-chartjs-2` - Charts untuk UI
- `technicalindicators` - Technical analysis
- `dotenv` - Environment variables
- `next` - React framework

---

## 🧪 Testing & Verifikasi

### Step 1: Test API Connection

```bash
# Test koneksi dasar
npm run test-api

# Health check
npm run health-check

# Stress test
npm run stress-test
```

### Step 2: Memahami Output Testing

#### ✅ Test yang HARUS BERHASIL:
- **Basic API Tests** (3/3)
- **Market Data Tests** (8/8) 
- **Utility Functions** (3/3)
- **WebSocket Tests** (1/1)
- **Futures Exchange Info** (jika tersedia)

#### ⚠️ Test yang NORMAL GAGAL tanpa API Key asli:
- **Account Information** - Butuh API key valid
- **Open Orders** - Butuh API key valid  
- **Trading Tests** - Butuh API key valid

### Step 3: Interpretasi Health Score

```
Health Score: 57.1% = NORMAL (tanpa API key asli)
Health Score: 85%+ = EXCELLENT (dengan API key valid)
```

---

## 🚀 Menjalankan Bot

### Step 1: Development Mode

```bash
# Jalankan dalam development mode
npm run dev
```

Bot akan tersedia di: http://localhost:3000

### Step 2: Fitur-Fitur Available

#### 🏠 Dashboard Utama
- Real-time price monitoring
- Technical analysis charts
- Trading signals

#### 🔬 API Testing Tab
- Test semua fungsi Binance API
- Real-time health monitoring
- Performance metrics

#### 📊 Trading Bot Tab
- Auto trading dengan multiple strategies
- Risk management controls
- Real-time P&L tracking

#### ⚙️ Settings Tab
- Konfigurasi trading parameters
- Risk management settings
- WebSocket connections

### Step 3: Trading Modes

#### Demo Mode (Default)
```bash
NEXT_PUBLIC_BOT_MODE=demo
```
- Simulasi trading dengan virtual balance
- Tidak melakukan order real
- Perfect untuk learning

#### Live Mode (Testnet)
```bash
NEXT_PUBLIC_BOT_MODE=live
```
- Trading dengan testnet balance
- Order placement real (tapi testnet)
- Full bot functionality

---

## 🔧 Troubleshooting

### Problem: "API-key format invalid"

**Penyebab**: API key placeholder masih digunakan

**Solusi**:
1. Pastikan API key di `.env.local` adalah key asli dari testnet
2. Restart aplikasi: `npm run dev`
3. Clear cache browser

### Problem: "Connection timeout"

**Penyebab**: Network/firewall issues

**Solusi**:
1. Check internet connection
2. Disable VPN jika ada
3. Check corporate firewall
4. Try different DNS (8.8.8.8)

### Problem: WebSocket connection failed

**Penyebab**: WebSocket port blocked

**Solusi**:
1. Check firewall settings
2. Try different network
3. Enable port 443 for WebSocket

### Problem: "Permission denied"

**Penyebab**: API key permissions tidak cukup

**Solusi**:
1. Generate API key baru di testnet
2. Pastikan semua permissions enabled
3. Tunggu 1-2 menit setelah generate

### Problem: High latency / slow response

**Penyebab**: Network atau region issues

**Solusi**:
1. Check internet speed
2. Use closer VPN server (Singapore/Tokyo for Asia)
3. Restart router/modem

---

## 📈 Advanced Configuration

### Customisasi Trading Strategies

Edit file `utils/tradingStrategies.js`:
```javascript
export const customStrategy = {
  name: 'Your Custom Strategy',
  timeframe: '5m',
  indicators: ['RSI', 'MACD', 'EMA'],
  entryConditions: {
    rsi_oversold: 30,
    macd_bullish: true,
    ema_trend: 'up'
  },
  exitConditions: {
    rsi_overbought: 70,
    stop_loss: 1,
    take_profit: 3
  }
};
```

### WebSocket Advanced Settings

```javascript
// utils/websocketManager.js
const wsConfig = {
  reconnectAttempts: 10,
  reconnectDelay: 1000,
  pingInterval: 20000,
  pongTimeout: 60000
};
```

---

## 🎯 Quick Start Checklist

- [ ] Buat akun di Binance Testnet
- [ ] Generate API key (Ed25519 recommended)
- [ ] Update `.env.local` dengan API key asli
- [ ] Run `npm install`
- [ ] Run `npm run test-api` 
- [ ] Verify Health Score > 50%
- [ ] Run `npm run dev`
- [ ] Open http://localhost:3000
- [ ] Test trading dengan virtual balance
- [ ] Monitor performance dan logs

---

## 📞 Support & Resources

### Official Links
- [Binance Testnet](https://testnet.binance.vision/)
- [Binance API Docs](https://developers.binance.com/)
- [binance-api-node GitHub](https://github.com/Ashlar/binance-api-node)

### Bot Support
- Check `README.md` untuk detailed features
- Review logs di browser console
- Use built-in debugging tools di Settings tab

### Community
- Join Binance API Developer Community
- Follow best practices untuk API usage
- Always test pada testnet dulu sebelum production

---

**⚡ Sekarang Anda siap untuk auto trading dengan bot professional!**

Bot ini dirancang untuk:
- ✅ Zero downtime dengan robust error handling
- ✅ Professional-grade risk management  
- ✅ Real-time market analysis
- ✅ Multiple trading strategies
- ✅ Complete testing & debugging tools