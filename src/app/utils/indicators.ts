
export function calculateSMMA(data: number[], period: number) {
  if (data.length < period) return Array(data.length).fill(null);
  const smma: (number | null)[] = Array(data.length).fill(null);
  
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  smma[period - 1] = sum / period;

  for (let i = period; i < data.length; i++) {
    smma[i] = (smma[i - 1]! * (period - 1) + data[i]) / period;
  }
  return smma;
}

export function calculateRSI(data: number[], period: number = 14) {
  if (data.length < period + 1) return Array(data.length).fill(null);
  const rsi: (number | null)[] = Array(data.length).fill(null);

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period; i < data.length; i++) {
    if (i > period) {
      const diff = data[i] - data[i - 1];
      avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    }
    
    if (avgLoss === 0) rsi[i] = 100;
    else {
      const rs = avgGain / avgLoss;
      rsi[i] = 100 - (100 / (1 + rs));
    }
  }
  return rsi;
}

export function calculateVWMA(prices: number[], volumes: number[], period: number) {
  if (prices.length < period) return Array(prices.length).fill(null);
  const vwma: (number | null)[] = Array(prices.length).fill(null);

  for (let i = period - 1; i < prices.length; i++) {
    let priceVolSum = 0;
    let volSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      priceVolSum += prices[j] * volumes[j];
      volSum += volumes[j];
    }
    vwma[i] = volSum === 0 ? null : priceVolSum / volSum;
  }
  return vwma;
}
