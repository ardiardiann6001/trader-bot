class Backtester:
    def __init__(self, strategy_class, candles, **kwargs):
        self.strategy = strategy_class(candles)
        self.candles = candles
        self.kwargs = kwargs

    def run(self):
        # TODO: Implementasi backtest loop
        results = []
        for i in range(len(self.candles)):
            # Contoh: strategi entry di candle ke-i
            # entry_signal = self.strategy.entry_signal(self.candles[:i+1])
            # if entry_signal:
            #     results.append(entry_signal)
            pass
        return results