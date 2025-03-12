import axios from 'axios';

class BinanceOpenInterestUpdater {
    constructor(data) {
        this.data = data; // 업데이트할 데이터 배열
        this.API_URL = 'https://fapi.binance.com/futures/data/openInterestHist';
        this.interval = null;
        this.BATCH_SIZE = 100; // 배치 크기 설정
        this.isUpdating = false; // 업데이트 진행 중 상태 관리
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

    // 배치 단위로 처리하는 함수
    async processBatch(symbols) {
        try {
            console.log(`🔄 Fetching batch of ${symbols.length} symbols...`);
            const promises = symbols.map(symbol => this.fetchOpenInterest(symbol));
            return await Promise.all(promises);
        } catch (error) {
            console.error('❌ Error processing batch:', error.message);
            return symbols.map(() => ({
                newerOpenInterest: null, 
                olderOpenInterest: null,
                newerOpenInterestTime: null,
                olderOpenInterestTime: null
            }));
        }
    }

    async updateOpenInterest() {
        // 이미 업데이트 중이면 중복 실행 방지
        if (this.isUpdating) {
            console.log('⏳ Update already in progress, skipping...');
            return;
        }

        this.isUpdating = true;
        console.log('🔄 Fetching Open Interest for all symbols (15m)...');
        
        try {
            // 모든 심볼 추출
            const symbols = this.data.map(item => item.symbol);
            const results = [];
            
            // 배치 단위로 처리
            for (let i = 0; i < symbols.length; i += this.BATCH_SIZE) {
                const batchSymbols = symbols.slice(i, i + this.BATCH_SIZE);
                console.log(`🔄 Processing batch ${i/this.BATCH_SIZE + 1}: ${batchSymbols.length} symbols...`);
                
                const batchResults = await this.processBatch(batchSymbols);
                results.push(...batchResults);
                
                // API 제한을 피하기 위해 배치 사이에 잠시 대기
                if (i + this.BATCH_SIZE < symbols.length) {
                    console.log('⏱️ Waiting before next batch...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            // 결과를 데이터 배열에 매핑
            this.data.forEach((item, index) => {
                if (index < results.length && results[index]) {
                    item.latestOpenInterest = results[index].newerOpenInterest;
                    item.previousOpenInterest = results[index].olderOpenInterest;
                    item.latestOpenInterestTime = results[index].newerOpenInterestTime;
                    item.previousOpenInterestTime = results[index].olderOpenInterestTime;
                }
            });
            
            console.log('✅ Updated Open Interest (15m):', new Date().toISOString());
        } catch (error) {
            console.error('❌ Error updating open interest:', error.message);
        } finally {
            this.isUpdating = false;
        }
    }

    start() {
        // 초기 1회 실행은 즉시 하지 않고 첫 번째 15분 정시 5초 후에 실행
        console.log('⏳ Waiting for the next 15-minute mark to update Open Interest...');
        
        const checkAndUpdate = () => {
            const now = new Date();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();

            // 15분 정시에서 5초 후에 업데이트 (0, 15, 30, 45분 + 5초)
            if (minutes % 15 === 0 && seconds === 5) {
                console.log(`⏳ 15분 정시 후 5초 경과, Open Interest 업데이트 시작 (${now.toISOString()})...`);
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