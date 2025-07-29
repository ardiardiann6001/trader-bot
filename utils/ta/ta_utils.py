def get_high(candles):
    return max(c['high'] for c in candles)

def get_low(candles):
    return min(c['low'] for c in candles)

def get_body(candle):
    return abs(candle['close'] - candle['open'])

def get_wick(candle):
    return (candle['high'] - max(candle['close'], candle['open'])), (min(candle['close'], candle['open']) - candle['low'])

def moving_average(candles, period=14, key='close'):
    if len(candles) < period:
        return None
    return sum(c[key] for c in candles[-period:]) / period