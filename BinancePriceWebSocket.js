import WebSocket from 'ws';

class BinancePriceWebSocket {
    constructor(onPriceUpdate) {
        this.WS_URL = 'wss://fstream.binance.com/ws/!markPrice@arr@1s';
        this.ws = null;
        this.onPriceUpdate = onPriceUpdate; // 가격 업데이트 콜백 함수
    }

    connect() {
        this.ws = new WebSocket(this.WS_URL);

        this.ws.on('open', () => {
            console.log('✅ WebSocket Connected: Binance Futures Price Stream');
        });

        this.ws.on('message', (data) => {
            try {
                const priceUpdates = JSON.parse(data);
                if (this.onPriceUpdate) {
                    this.onPriceUpdate(priceUpdates); // 콜백 함수 실행하여 데이터 업데이트
                }
            } catch (error) {
                console.error('❌ Error parsing WebSocket message:', error);
            }
        });

        this.ws.on('close', () => {
            console.log('⚠️ WebSocket Disconnected. Reconnecting...');
            setTimeout(() => this.connect(), 3000);
        });

        this.ws.on('error', (error) => {
            console.error('❌ WebSocket Error:', error);
        });
    }

    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

export default BinancePriceWebSocket;
