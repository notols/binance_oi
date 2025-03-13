import React from 'react';

const Header = ({ isConnected, lastUpdated }) => {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold text-center mb-4">Binance Futures OI Dashboard</h1>
      
      <div className="flex justify-between items-center text-sm text-gray-400">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{isConnected ? '연결됨' : '연결 중...'}</span>
        </div>
        
        {lastUpdated && (
          <div>
            최근 업데이트: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;