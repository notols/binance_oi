import axios from 'axios';

class BinanceOpenInterestUpdater {
    constructor(data) {
        this.data = data; // 업데이트할 데이터 배열
        this.API_URL = 'https://fapi.binance.com/futures/data/openInterestHist';
        this.interval = null;
    }

    async fetchOpenInterest(symbol) {
        try {
            const response = await axios.get(this.API_URL, {
                params: {
                    symbol: symbol,
                    period: "15m", // 15분 캔들로 변경
                    limit: 2 // 최신값 + 직전값 2개 가져오기
                }
            });

            if (response.data.length >= 2) {
                // 시간 순서대로 명확하게 재명명
                return {
                    newerOpenInterest: parseFloat(response.data[0].sumOpenInterest),  // 최신 15분 OI
                    olderOpenInterest: parseFloat(response.data[1].sumOpenInterest), // 직전 15분 OI
                    newerOpenInterestTime: new Date(response.data[0].timestamp), // 최신 타임스탬프
                    olderOpenInterestTime: new Date(response.data[1].timestamp) // 직전 타임스탬프
                };
            } else if (response.data.length === 1) {
                return {
                    newerOpenInterest: parseFloat(response.data[0].sumOpenInterest),
                    olderOpenInterest: null, // 이전값이 없으면 null
                    newerOpenInterestTime: new Date(response.data[0].timestamp),
                    olderOpenInterestTime: null
                };
            }
            return { 
                newerOpenInterest: null, 
                olderOpenInterest: null,
                newerOpenInterestTime: null,
                olderOpenInterestTime: null
            };
        } catch (error) {
            console.error(`❌ Error fetching open interest for ${symbol}:`, error.message);
            return { 
                newerOpenInterest: null, 
                olderOpenInterest: null,
                newerOpenInterestTime: null,
                olderOpenInterestTime: null
            };
        }
    }

    async updateOpenInterest() {
        console.log('🔄 Fetching Open Interest for all symbols (15m)...');
        const promises = this.data.map(item => this.fetchOpenInterest(item.symbol));

        const results = await Promise.all(promises);

        this.data.forEach((item, index) => {
            if (results[index]) {
                // 새로운 변수명에 맞게 속성 매핑
                item.latestOpenInterest = results[index].newerOpenInterest;
                item.previousOpenInterest = results[index].olderOpenInterest;
                item.latestOpenInterestTime = results[index].newerOpenInterestTime;
                item.previousOpenInterestTime = results[index].olderOpenInterestTime;
            }
        });

        console.log('✅ Updated Open Interest (15m):', this.data);
    }

    start() {
        this.updateOpenInterest(); // 최초 1회 실행

        const checkAndUpdate = () => {
            const now = new Date();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();

            if (minutes % 15 === 0 && seconds === 2) {
                console.log('⏳ 15분마다 Open Interest 업데이트...');
                this.updateOpenInterest();
            }
        };

        // 1초마다 현재 시간을 확인하고, 15분 단위로 OI 업데이트
        this.interval = setInterval(checkAndUpdate, 1000);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            console.log('⏹️ Stopped Open Interest updates.');
        }
    }
}

export default BinanceOpenInterestUpdater;