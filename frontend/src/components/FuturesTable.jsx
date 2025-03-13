import React, { useMemo } from 'react';
import { formatLargeNumber, calculateOIChange, getTimeAgo } from '../utils/formatters';

const FuturesTable = ({ data, sortConfig, onSort }) => {
  // 정렬된 데이터 계산
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return [...data].sort((a, b) => {
      let valueA, valueB;
      
      switch(sortConfig.column) {
        case 'symbol':
          valueA = a.symbol;
          valueB = b.symbol;
          break;
        case 'price':
          valueA = a.price || 0;
          valueB = b.price || 0;
          break;
        case 'openInterest':
          valueA = a.latestOpenInterest || 0;
          valueB = b.latestOpenInterest || 0;
          break;
        case 'oiChange':
          valueA = calculateOIChange(a.latestOpenInterest, a.previousOpenInterest) || -Infinity;
          valueB = calculateOIChange(b.latestOpenInterest, b.previousOpenInterest) || -Infinity;
          break;
        case 'marketCap':
          valueA = (a.price && a.circulatingSupply) ? a.price * a.circulatingSupply : 0;
          valueB = (b.price && b.circulatingSupply) ? b.price * b.circulatingSupply : 0;
          break;
        default:
          return 0;
      }
      
      // 문자열인 경우
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortConfig.direction === 'asc' 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA);
      }
      
      // 숫자인 경우
      return sortConfig.direction === 'asc' 
        ? valueA - valueB 
        : valueB - valueA;
    });
  }, [data, sortConfig]);

  // 정렬 방향 표시기
  const getSortIndicator = (column) => {
    if (sortConfig.column !== column) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse bg-dark-100 rounded-lg overflow-hidden shadow-xl">
        <thead className="bg-opacity-80 sticky top-0">
          <tr>
            <th 
              className={`p-3 text-left text-gray-400 font-normal border-b border-gray-700 cursor-pointer hover:text-white transition-colors ${sortConfig.column === 'symbol' ? 'text-white' : ''}`}
              onClick={() => onSort('symbol')}
            >
              Symbol{getSortIndicator('symbol')}
            </th>
            <th 
              className={`p-3 text-left text-gray-400 font-normal border-b border-gray-700 cursor-pointer hover:text-white transition-colors ${sortConfig.column === 'price' ? 'text-white' : ''}`}
              onClick={() => onSort('price')}
            >
              Price (USDT){getSortIndicator('price')}
            </th>
            <th 
              className={`p-3 text-left text-gray-400 font-normal border-b border-gray-700 cursor-pointer hover:text-white transition-colors ${sortConfig.column === 'openInterest' ? 'text-white' : ''}`}
              onClick={() => onSort('openInterest')}
            >
              Open Interest{getSortIndicator('openInterest')}
            </th>
            <th 
              className={`p-3 text-left text-gray-400 font-normal border-b border-gray-700 cursor-pointer hover:text-white transition-colors ${sortConfig.column === 'oiChange' ? 'text-white' : ''}`}
              onClick={() => onSort('oiChange')}
            >
              OI Change (%){getSortIndicator('oiChange')}
            </th>
            <th 
              className={`p-3 text-left text-gray-400 font-normal border-b border-gray-700 cursor-pointer hover:text-white transition-colors ${sortConfig.column === 'marketCap' ? 'text-white' : ''}`}
              onClick={() => onSort('marketCap')}
            >
              Market Cap{getSortIndicator('marketCap')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan="5" className="p-3 text-center text-gray-400 border-b border-gray-700">
                데이터를 로딩 중입니다...
              </td>
            </tr>
          ) : (
            sortedData.map((item) => {
              const oiChange = calculateOIChange(item.latestOpenInterest, item.previousOpenInterest);
              let oiChangeClass = "";
              let oiChangeText = "로딩 중...";

              if (oiChange !== null) {
                oiChangeText = `${oiChange.toFixed(2)}%`;
                oiChangeClass = oiChange >= 0 ? "positive-change" : "negative-change";
              }
              
              // 시가총액 계산
              let marketCapText = '-';
              if (item.price !== null && item.circulatingSupply !== null) {
                const marketCap = item.price * item.circulatingSupply;
                marketCapText = formatLargeNumber(marketCap);
              }

              return (
                <tr 
                  key={item.symbol} 
                  className="hover:bg-gray-800 transition-colors border-b border-gray-700 last:border-b-0"
                >
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span>{item.symbol}</span>
                      <span className="text-xs text-gray-400">{item.baseAsset}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    {item.price !== null ? item.price : '로딩 중...'}
                  </td>
                  <td className="p-3">
                    {item.latestOpenInterest !== null ? (
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <span className="text-xs text-gray-400 mr-1">
                            {getTimeAgo(item.latestOpenInterestTime)}전:
                          </span> 
                          <span className="font-medium">{formatLargeNumber(item.latestOpenInterest)}</span>
                        </div>
                        
                        {item.previousOpenInterest !== null && (
                          <div className="flex items-center mt-1">
                            <span className="text-xs text-gray-400 mr-1">
                              {getTimeAgo(item.previousOpenInterestTime)}전:
                            </span> 
                            <span className="font-medium">{formatLargeNumber(item.previousOpenInterest)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      '로딩 중...'
                    )}
                  </td>
                  <td className={`p-3 ${oiChangeClass}`}>
                    {oiChangeText}
                  </td>
                  <td className="p-3">
                    {marketCapText}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default FuturesTable;