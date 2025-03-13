import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import BinanceFuturesData from './BinanceFuturesData.js';
import BinancePriceWebSocket from './BinancePriceWebSocket.js';
import BinanceOpenInterestUpdater from './BinanceOpenInterestUpdater.js';
import TelegramAlertService from './TelegramAlertService.js';
import dotenv from 'dotenv';

// ES 모듈에서 __dirname 사용하기 위한 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 변수 로드 (.env 파일)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 텔레그램 봇 설정
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const OI_CHANGE_THRESHOLD = parseFloat(process.env.OI_CHANGE_THRESHOLD || '50');

app.use(cors()); // CORS 활성화
app.use(express.static('public')); // 정적 파일을 제공할 디렉토리 설정

let futuresData = [];
let telegramAlertService = null;

// 초기 데이터 가져오기
(async () => {
    const binanceData = new BinanceFuturesData();
    futuresData = await binanceData.fetchData();

    // 초기 데이터 설정
    futuresData = futuresData.map(item => ({
        ...item,
        price: null,
        latestOpenInterest: null,     // 최신 OI 값
        previousOpenInterest: null,   // 과거 OI 값
        latestOpenInterestTime: null,  // 최신 OI 시간
        previousOpenInterestTime: null // 과거 OI 시간
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
    });

    binanceWS.connect();

    // OI 업데이터 시작 (15분마다 정각에 업데이트)
    const openInterestUpdater = new BinanceOpenInterestUpdater(futuresData);
    openInterestUpdater.start();

    // 텔레그램 알림 서비스 초기화 (환경 변수가 설정된 경우에만)
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        telegramAlertService = new TelegramAlertService(
            TELEGRAM_BOT_TOKEN,
            TELEGRAM_CHAT_ID,
            OI_CHANGE_THRESHOLD
        );
        console.log(`✅ 텔레그램 알림 서비스 초기화 완료 (임계값: ${OI_CHANGE_THRESHOLD}%)`);
        
        // OI 데이터가 업데이트될 때마다 알림 확인
        // 15분마다 한 번만 실행하기 위해 이벤트 리스너 사용
        const checkForAlerts = () => {
            if (telegramAlertService && futuresData.some(item => item.latestOpenInterest !== null)) {
                console.log('🔍 OI 변화 모니터링 중...');
                telegramAlertService.monitorData(futuresData);
            }
        };
        
        // OI 데이터 업데이트 시 알림 체크 설정
        // 서버에서 OI 데이터가 업데이트된 후 알림 체크 실행
        setInterval(checkForAlerts, 15 * 60 * 1000); // 15분마다 실행
        
        // 초기 실행
        setTimeout(checkForAlerts, 30 * 1000); // 30초 후 첫 실행 (초기 데이터가 로드될 시간 고려)
    } else {
        console.log('⚠️ 텔레그램 봇 설정이 없습니다. 알림 기능이 비활성화됩니다.');
    }
})();

// 루트 경로 설정 - HTML 페이지 제공
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API 엔드포인트: 현재 데이터 제공
app.get('/api/data', (req, res) => {
    res.json(futuresData);
});

// API 엔드포인트: 알림 임계값 설정
app.post('/api/alerts/threshold', express.json(), (req, res) => {
    const { threshold } = req.body;
    
    if (!telegramAlertService) {
        return res.status(400).json({ error: '텔레그램 알림 서비스가 비활성화되어 있습니다.' });
    }
    
    if (typeof threshold !== 'number' || threshold < 0) {
        return res.status(400).json({ error: '유효한 임계값을 입력해주세요 (0 이상의 숫자)' });
    }
    
    telegramAlertService.setThreshold(threshold);
    res.json({ success: true, threshold });
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
});