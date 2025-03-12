import axios from 'axios';

class BinanceOpenInterestUpdater {
    constructor(data) {
        this.data = data; // 업데이트할 데이터 배열
        this.API_URL = 'https://fapi.binance.com/fapi/v1/openInterest';
        this.interval = null;
        this.isUpdating = false;
    }

    async fetchOpenInterest(symbol) {
        try {
            const response = await axios.get(this.API_URL, {
                params: {
                    symbol: symbol
                },
                timeout: 10000 // 10초 타임아웃
            });
            
            if (response.data && response.data.openInterest) {
                return {
                    symbol,
                    success: true,
                    openInterest: parseFloat(response.data.openInterest),
                    time: new Date(response.data.time)
                };
            }
            
            return {
                symbol,
                success: false,
                openInterest: null,
                time: null
            };
        } catch (error) {
            console.error(`❌ Error fetching open interest for ${symbol}:`, error.message);
            return {
                symbol,
                success: false,
                openInterest: null,
                time: null
            };
        }
    }

    async updateOpenInterest() {
        // 이미 업데이트 중이면 중복 실행 방지
        if (this.isUpdating) {
            console.log('⏳ Update already in progress, skipping...');
            return;
        }

        this.isUpdating = true;
        const startTime = new Date();
        console.log(`🔄 Fetching Open Interest for all symbols at ${startTime.toISOString()}...`);
        
        try {
            // 모든 심볼 추출
            const symbols = this.data.map(item => item.symbol);
            console.log(`🔄 Processing ${symbols.length} symbols in parallel...`);
            
            // 모든 요청을 병렬로 실행
            const results = await Promise.all(
                symbols.map(symbol => this.fetchOpenInterest(symbol))
            );
            
            // 결과를 데이터 배열에 매핑
            const updateCount = this.data.reduce((count, item) => {
                const result = results.find(r => r.symbol === item.symbol);
                if (result && result.success) {
                    // 이전 값을 저장
                    if (item.latestOpenInterest !== null) {
                        item.previousOpenInterest = item.latestOpenInterest;
                        item.previousOpenInterestTime = item.latestOpenInterestTime;
                    }
                    
                    // 새로운 값을 설정
                    item.latestOpenInterest = result.openInterest;
                    item.latestOpenInterestTime = result.time;
                    
                    return count + 1;
                }
                return count;
            }, 0);
            
            const failCount = symbols.length - updateCount;
            const endTime = new Date();
            const duration = (endTime - startTime) / 1000;
            
            if (failCount > 0) {
                console.log(`⚠️ ${updateCount}/${symbols.length} symbols updated. ${failCount} symbols failed to update.`);
                
                // 실패한 심볼 확인
                const failedSymbols = results
                    .filter(r => !r.success)
                    .map(r => r.symbol);
                console.log(`❌ Failed symbols: ${failedSymbols.join(', ')}`);
            } else {
                console.log(`✅ All ${symbols.length} symbols successfully updated.`);
            }
            
            console.log(`✅ Updated Open Interest in ${duration} seconds at ${endTime.toISOString()}`);
        } catch (error) {
            console.error('❌ Error updating open interest:', error.message);
        } finally {
            this.isUpdating = false;
        }
    }

    start() {
        console.log('⏳ Waiting for the next 15-minute mark to update Open Interest...');
        
        const checkAndUpdate = () => {
            const now = new Date();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();

            // 15분 정각에 업데이트 (0, 15, 30, 45분)
            if (minutes % 15 === 0 && seconds === 0) {
                console.log(`⏳ 15분 정각, Open Interest 업데이트 시작 (${now.toISOString()})...`);
                this.updateOpenInterest();
            }
        };

        // 1초마다 현재 시간을 확인하고, 15분 단위로 OI 업데이트
        this.interval = setInterval(checkAndUpdate, 1000);
        
        // 초기 데이터를 즉시 가져오기
        this.updateOpenInterest();
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            console.log('⏹️ Stopped Open Interest updates.');
        }
    }
}

export default BinanceOpenInterestUpdater;