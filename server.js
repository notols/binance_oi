import express from 'express';
import cors from 'cors';
import BinanceFuturesData from './BinanceFuturesData.js';
import BinancePriceWebSocket from './BinancePriceWebSocket.js';
import BinanceOpenInterestUpdater from './BinanceOpenInterestUpdater.js';

const app = express();
const PORT = 3000;

app.use(cors()); // CORS 활성화
app.use(express.static('public')); // index.html 제공

let futuresData = [];

// 초기 데이터 가져오기
(async () => {
    const binanceData = new BinanceFuturesData();
    futuresData = await binanceData.fetchData();

    // 초기 데이터 설정
    futuresData = futuresData.map(item => ({
        ...item,
        price: null,
        latestOpenInterest: null,
        previousOpenInterest: null
    }));

    console.log('✅ 초기 데이터 로드 완료');

    // WebSocket을 통한 실시간 가격 업데이트
    const binanceWS = new BinancePriceWebSocket((priceUpdates) => {
        priceUpdates.forEach(update => {
            const item = futuresData.find(data => data.symbol === update.s);
            if (item) {
                item.price = parseFloat(update.p);
            }
        });

        console.log('📡 가격 업데이트됨');
    });

    binanceWS.connect();

    // 미결제약정 15분마다 업데이트
    const openInterestUpdater = new BinanceOpenInterestUpdater(futuresData);
    openInterestUpdater.start();
})();

// API 엔드포인트: 현재 데이터 제공
app.get('/api/data', (req, res) => {
    res.json(futuresData);
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
