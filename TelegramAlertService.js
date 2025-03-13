import axios from 'axios';

class TelegramAlertService {
    constructor(botToken, chatId, thresholdPercent = 50) {
        this.botToken = botToken;
        this.chatId = chatId;
        this.thresholdPercent = thresholdPercent;
        this.API_URL = `https://api.telegram.org/bot${botToken}/sendMessage`;
        this.alertedSymbols = new Map(); // 이미 알림을 보낸 심볼 추적 (스팸 방지)
        this.alertCooldown = 4 * 60 * 60 * 1000; // 동일 심볼에 대한 알림 쿨다운 (기본 4시간)
    }

    // OI 변화율 계산
    calculateOIChange(latestOI, previousOI) {
        if (latestOI !== null && previousOI !== null && previousOI !== 0) {
            return ((latestOI - previousOI) / previousOI) * 100;
        }
        return null;
    }

    // 큰 숫자 포맷팅 (K, M, B)
    formatLargeNumber(num) {
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(2) + 'B';
        } else if (num >= 1000000) {
            return (num / 1000000).toFixed(2) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(2) + 'K';
        } else {
            return num.toFixed(2);
        }
    }

    // 바이낸스 선물 페이지 URL 생성
    generateBinanceLink(symbol) {
        return `https://www.binance.com/en/futures/${symbol}`;
    }

    // 알림 전송
    async sendAlert(symbol, oiChange, latestOI, previousOI, price) {
        try {
            // 현재 시간 구하기
            const now = new Date();
            const timeString = now.toISOString();
            const formattedTime = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

            // 바이낸스 링크 생성
            const binanceLink = this.generateBinanceLink(symbol);

            // 알림 메시지 구성
            const message = `🚨 *OI 급등* 🚨\n\n` +
                `*${symbol}*\n` +
                `*변화율:* + ${oiChange.toFixed(2)}%\n` +
                `*현재 OI:* ${this.formatLargeNumber(latestOI)}\n` +
                `*이전 OI:* ${this.formatLargeNumber(previousOI)}\n` +
                `*현재가:* ${price} USDT\n\n` +
                `${formattedTime}\n\n` +
                `[바이낸스 바로가기](${binanceLink})`;
            
            // 텔레그램 API로 메시지 전송
            const response = await axios.post(this.API_URL, {
                chat_id: this.chatId,
                text: message,
                parse_mode: 'Markdown',
                disable_web_page_preview: true // 링크 미리보기 활성화
            });
            
            console.log(`✅ Telegram alert sent for ${symbol} (${oiChange.toFixed(2)}% 증가)`);
            
            // 알림 전송 시간 기록 (쿨다운을 위해)
            this.alertedSymbols.set(symbol, now.getTime());
            
            return true;
        } catch (error) {
            console.error(`❌ Error sending Telegram alert for ${symbol}:`, error.message);
            return false;
        }
    }

    // 데이터 모니터링 및 알림 처리
    async monitorData(futuresData) {
        const alertsToSend = [];
        const now = new Date().getTime();
        
        // 알림 조건 확인
        futuresData.forEach(item => {
            // OI 데이터가 있는지 확인
            if (item.latestOpenInterest !== null && item.previousOpenInterest !== null) {
                const oiChange = this.calculateOIChange(item.latestOpenInterest, item.previousOpenInterest);
                
                // 급증 감지 (임계값 초과 && 양수 변화율만)
                if (oiChange !== null && oiChange >= this.thresholdPercent) {
                    const lastAlertTime = this.alertedSymbols.get(item.symbol) || 0;
                    const timeSinceLastAlert = now - lastAlertTime;
                    
                    // 쿨다운 시간이 지났는지 확인 (스팸 방지)
                    if (timeSinceLastAlert > this.alertCooldown) {
                        alertsToSend.push({
                            symbol: item.symbol,
                            oiChange: oiChange,
                            latestOI: item.latestOpenInterest,
                            previousOI: item.previousOpenInterest,
                            price: item.price || 0
                        });
                    }
                }
            }
        });
        
        // 알림 전송 (병렬로 처리)
        if (alertsToSend.length > 0) {
            console.log(`🔔 Detected ${alertsToSend.length} OI increase alerts to send...`);
            
            const promises = alertsToSend.map(alert => 
                this.sendAlert(
                    alert.symbol, 
                    alert.oiChange, 
                    alert.latestOI, 
                    alert.previousOI, 
                    alert.price
                )
            );
            
            await Promise.all(promises);
        }
    }

    // 알림 임계값 설정
    setThreshold(newThresholdPercent) {
        this.thresholdPercent = newThresholdPercent;
        console.log(`🔧 Alert threshold updated to ${newThresholdPercent}%`);
    }

    // 알림 쿨다운 설정 (밀리초)
    setAlertCooldown(newCooldownMs) {
        this.alertCooldown = newCooldownMs;
        console.log(`🔧 Alert cooldown updated to ${newCooldownMs}ms (${newCooldownMs / (60 * 60 * 1000)} hours)`);
    }
}

export default TelegramAlertService;