import json
from strategies.smc import SMCStrategy
from strategies.crt import CRTStrategy
from strategies.ict import ICTStrategy
from strategies.structure import MarketStructureStrategy
from utils.ta.ta_utils import get_high, get_low, moving_average
from utils.order.order_utils import calculate_position_size, calculate_sl_tp

# Contoh data candle (harus diganti dengan data real dari exchange)
candles = [
    {"open": 100, "high": 110, "low": 95, "close": 105},
    {"open": 105, "high": 115, "low": 100, "close": 110},
    # ... tambahkan data candle
]

# Inisialisasi strategi
smc = SMCStrategy(candles)
crt = CRTStrategy(candles)
ict = ICTStrategy(candles)
structure = MarketStructureStrategy(candles)

# Contoh pemanggilan fungsi strategi
order_blocks = smc.detect_order_blocks()
liquidity_grab = smc.detect_liquidity_grab()
market_shift = ict.detect_market_structure_shift()
range_analysis = crt.analyze_range()

# Contoh utilitas TA
highest = get_high(candles)
lowest = get_low(candles)
ma14 = moving_average(candles, 14)

# Contoh perhitungan order
balance = 1000
risk_pct = 1
entry = 110
stop_loss = 105
size = calculate_position_size(balance, risk_pct, entry, stop_loss)
sl, tp = calculate_sl_tp(entry, sl_pct=1, tp_pct=2, side='buy')

print("Order Blocks:", order_blocks)
print("Liquidity Grab:", liquidity_grab)
print("Market Structure Shift:", market_shift)
print("Range Analysis:", range_analysis)
print(f"Highest: {highest}, Lowest: {lowest}, MA14: {ma14}")
print(f"Position Size: {size}, SL: {sl}, TP: {tp}")

# TODO: Integrasi dengan utils/binanceApi.js via REST API/bridge jika ingin live trading otomatis