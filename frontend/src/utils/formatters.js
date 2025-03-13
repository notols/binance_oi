/**
 * 큰 숫자를 K, M, B 포맷으로 변환
 */
export function formatLargeNumber(num) {
    if (num === null || num === undefined) return '-';
    
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(2) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    } else {
      return num.toFixed(2);
    }
  }
  
  /**
   * OI 변화율 계산
   */
  export function calculateOIChange(latestOI, previousOI) {
    if (latestOI !== null && previousOI !== null && previousOI !== 0) {
      return ((latestOI - previousOI) / previousOI) * 100;
    }
    return null;
  }
  
  /**
   * 경과 시간 계산 (x분 전, x시간 전 형식)
   */
  export function getTimeAgo(timestamp) {
    if (!timestamp) return '?';
    
    // 날짜 객체가 아니라 문자열로 전달된 경우 처리
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    
    if (diffHour > 0) {
      return `${diffHour}시간`;
    } else if (diffMin > 0) {
      return `${diffMin}분`;
    } else {
      return `${diffSec}초`;
    }
  }
  
  /**
   * 바이낸스 선물 페이지 URL 생성
   */
  export function generateBinanceLink(symbol) {
    return `https://www.binance.com/en/futures/${symbol}`;
  }