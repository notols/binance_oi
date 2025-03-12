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
                    period: "15m",
                    limit: 2
                }
            });

            if (response.data.length >= 2) {
                // 바이낸스 API 응답의 실제 데이터 확인
                const newer = {
                    value: parseFloat(response.data[0].sumOpenInterest),
                    time: new Date(response.data[0].timestamp)
                };
                const older = {
                    value: parseFloat(response.data[1].sumOpenInterest),
                    time: new Date(response.data[1].timestamp)
                };

                // 실제 시간값을 확인하여 올바르게 매핑
                // 시간이 더 최근인 데이터를 newer로, 더 과거인 데이터를 older로 설정
                if (newer.time > older.time) {
                    return {
                        latestOpenInterest: newer.value,     // 최신 OI 값
                        previousOpenInterest: older.value,   // 과거 OI 값
                        latestOpenInterestTime: newer.time,  // 최신 OI 시간
                        previousOpenInterestTime: older.time // 과거 OI 시간
                    };
                } else {
                    return {
                        latestOpenInterest: older.value,     // 최신 OI 값
                        previousOpenInterest: newer.value,   // 과거 OI 값
                        latestOpenInterestTime: older.time,  // 최신 OI 시간
                        previousOpenInterestTime: newer.time // 과거 OI 시간
                    };
                }
            } else if (response.data.length === 1) {
                return {
                    latestOpenInterest: parseFloat(response.data[0].sumOpenInterest),
                    previousOpenInterest: null,
                    latestOpenInterestTime: new Date(response.data[0].timestamp),
                    previousOpenInterestTime: null
                };
            }
            return {
                latestOpenInterest: null,
                previousOpenInterest: null,
                latestOpenInterestTime: null,
                previousOpenInterestTime: null
            };
        } catch (error) {
            console.error(`❌ Error fetching open interest for ${symbol}:`, error.message);
            return {
                latestOpenInterest: null,
                previousOpenInterest: null,
                latestOpenInterestTime: null,
                previousOpenInterestTime: null
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
                latestOpenInterest: null, 
                previousOpenInterest: null,
                latestOpenInterestTime: null,
                previousOpenInterestTime: null
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
                    item.latestOpenInterest = results[index].latestOpenInterest;
                    item.previousOpenInterest = results[index].previousOpenInterest;
                    item.latestOpenInterestTime = results[index].latestOpenInterestTime;
                    item.previousOpenInterestTime = results[index].previousOpenInterestTime;
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