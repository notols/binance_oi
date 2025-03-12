// BinanceFuturesData.js
import axios from 'axios';

class BinanceFuturesData {
    constructor() {
        this.BINANCE_FUTURES_API = 'https://fapi.binance.com/fapi/v1/exchangeInfo';
        this.BINANCE_META_API = 'https://www.binance.com/bapi/apex/v1/friendly/apex/marketing/complianceSymbolList';
    }

    // Binance Futures 데이터 가져오기
    async fetchData() {
        try {
            // Binance 선물 종목 조회
            const futuresResponse = await axios.get(this.BINANCE_FUTURES_API);
            const futuresSymbols = futuresResponse.data.symbols;

            // USDT 페어 필터링
            const usdtPairs = futuresSymbols
                .filter(symbol => symbol.quoteAsset === "USDT" && symbol.status === "TRADING")
                .map(symbol => ({
                    symbol: symbol.symbol,
                    baseAsset: symbol.baseAsset,
                    quoteAsset: symbol.quoteAsset,
                    circulatingSupply: null // 메타데이터에서 채워질 값
                }));

            // Binance 메타데이터 조회
            const metaResponse = await axios.get(this.BINANCE_META_API);
            const metaDataList = metaResponse.data.data;

            // baseAsset을 기준으로 메타데이터 매핑
            const result = usdtPairs.map(pair => {
                const metaData = metaDataList.find(meta => meta.baseAsset === pair.baseAsset);
                return {
                    symbol: pair.symbol,
                    baseAsset: pair.baseAsset,
                    quoteAsset: pair.quoteAsset,
                    circulatingSupply: metaData ? metaData.circulatingSupply : null
                };
            });

            return result;
        } catch (error) {
            console.error('Error fetching Binance Futures symbols with metadata:', error.message);
            return [];
        }
    }
}

// 클래스를 모듈로 내보내기
export default BinanceFuturesData;