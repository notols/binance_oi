import axios from 'axios';

class BinanceOpenInterestUpdater {
    constructor(data) {
        this.data = data; // 업데이트할 데이터 배열
        this.API_URL = 'https://fapi.binance.com/fapi/v1/openInterest';
        this.interval = null;
    }

    async fetchOpenInterest(symbol) {
        try {
            const response = await axios.get(`${this.API_URL}?symbol=${symbol}`);
            return parseFloat(response.data.openInterest);
        } catch (error) {
            console.error(`❌ Error fetching open interest for ${symbol}:`, error.message);
            return null;
        }
    }

    async updateOpenInterest() {
        console.log('🔄 Fetching Open Interest for all symbols...');
        const promises = this.data.map(item => this.fetchOpenInterest(item.symbol));

        const results = await Promise.all(promises);

        this.data.forEach((item, index) => {
            item.openInterest = results[index] !== null ? results[index] : item.openInterest;
        });

        console.log('✅ Updated Open Interest:', this.data);
    }

    start(interval = 15000) {
        this.updateOpenInterest(); // 최초 실행
        this.interval = setInterval(() => this.updateOpenInterest(), interval);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            console.log('⏹️ Stopped Open Interest updates.');
        }
    }
}

export default BinanceOpenInterestUpdater;
