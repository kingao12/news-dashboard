/**
 * 금융 데이터 포맷팅 유틸리티
 */

/**
 * 한국식 단위로 숫자 포맷팅 (만, 억, 조)
 */
export const formatKoreanNumber = (value: number): string => {
  if (value === 0) return '0';
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1e12) {
    return `${sign}${(absValue / 1e12).toLocaleString(undefined, { maximumFractionDigits: 1 })}조`;
  }
  if (absValue >= 1e8) {
    return `${sign}${(absValue / 1e8).toLocaleString(undefined, { maximumFractionDigits: 1 })}억`;
  }
  if (absValue >= 1e4) {
    return `${sign}${(absValue / 1e4).toLocaleString(undefined, { maximumFractionDigits: 1 })}만`;
  }
  
  return `${sign}${absValue.toLocaleString()}`;
};

/**
 * 원화(₩) 포맷팅
 */
export const formatKRW = (value: number, includeUnit = true): string => {
  const formatted = value.toLocaleString('ko-KR');
  return includeUnit ? `₩${formatted}` : formatted;
};

/**
 * 원화(₩) + 한국식 단위 결합 포맷팅 (예: ₩3억 1,200만)
 */
export const formatKoreanCurrency = (value: number): string => {
  if (Math.abs(value) < 1e4) return formatKRW(value);
  return `₩${formatKoreanNumber(value)}`;
};

/**
 * 원화(₩) + 달러($) 병기 포맷팅
 * @param krwValue 원화 가치
 * @param usdValue 달러 가치 (선택 사항)
 */
export const formatCurrencyWithUSD = (krwValue: number, usdValue?: number): string => {
  const krw = formatKoreanCurrency(krwValue);
  if (usdValue === undefined) return krw;
  
  const usd = usdValue.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
  
  return `${krw} (${usd})`;
};

/**
 * 금리, 등락률 등 퍼센트 포맷팅
 */
export const formatPercent = (value: number, includeSign = false): string => {
  const sign = includeSign && value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
};
