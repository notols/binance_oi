import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Header from './components/Header';
import FuturesTable from './components/FuturesTable';
import AlertThresholdControl from './components/AlertThresholdControl';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

function App() {
  const [futuresData, setFuturesData] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    column: 'oiChange',
    direction: 'desc'
  });

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('data_update', (data) => {
      setFuturesData(data);
      setLastUpdated(new Date());
    });

    // 초기 데이터 로드 (소켓 연결 전에 사용)
    const fetchInitialData = async () => {
      try {
        const response = await fetch(`${SOCKET_URL}/api/data`);
        const data = await response.json();
        setFuturesData(data);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      }
    };

    fetchInitialData();

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSort = (column) => {
    setSortConfig((prevConfig) => {
      if (prevConfig.column === column) {
        return {
          column,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return {
        column,
        direction: 'desc'
      };
    });
  };

  return (
    <div className="min-h-screen bg-dark-300 text-gray-100">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Header isConnected={isConnected} lastUpdated={lastUpdated} />
        
        <div className="mb-6">
          <AlertThresholdControl />
        </div>
        
        <FuturesTable 
          data={futuresData} 
          sortConfig={sortConfig} 
          onSort={handleSort} 
        />
        
        <div className="text-xs text-gray-400 mt-4 text-center">
          데이터는 실시간으로 업데이트됩니다. OI 데이터는 15분마다 갱신됩니다.
        </div>
      </div>
    </div>
  );
}

export default App;