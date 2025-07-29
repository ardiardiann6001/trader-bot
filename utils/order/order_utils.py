def calculate_position_size(balance, risk_pct, entry, stop_loss):
    risk_amount = balance * risk_pct / 100
    size = risk_amount / abs(entry - stop_loss)
    return size

def calculate_sl_tp(entry, sl_pct=1, tp_pct=2, side='buy'):
    if side == 'buy':
        sl = entry * (1 - sl_pct/100)
        tp = entry * (1 + tp_pct/100)
    else:
        sl = entry * (1 + sl_pct/100)
        tp = entry * (1 - tp_pct/100)
    return sl, tp