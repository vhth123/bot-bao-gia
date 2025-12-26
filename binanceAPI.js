const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Proxy configuration
const PROXY_HOST = '89.106.0.16';
const PROXY_PORT = 11104;
const PROXY_USER = 'muaproxy693f7352b9777';
const PROXY_PASS = 'kmyawni1fon1znpt';

// Create proxy agent with explicit configuration
const proxyUrl = `http://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}`;
const proxyAgent = new HttpsProxyAgent(proxyUrl, {
  rejectUnauthorized: false // Allow self-signed certificates
});

// Danh sách các API endpoints thay thế (fallback)
const BINANCE_API_ENDPOINTS = [
  'https://fapi.binance.com',
  'https://fapi1.binance.com',
  'https://fapi2.binance.com',
  'https://fapi3.binance.com'
];

let currentEndpointIndex = 0;

/**
 * Lấy API endpoint hiện tại
 */
function getApiEndpoint() {
  return BINANCE_API_ENDPOINTS[currentEndpointIndex];
}

/**
 * Thử endpoint tiếp theo nếu hiện tại bị lỗi
 */
function switchToNextEndpoint() {
  currentEndpointIndex = (currentEndpointIndex + 1) % BINANCE_API_ENDPOINTS.length;
  console.log(`🔄 Chuyển sang endpoint: ${getApiEndpoint()}`);
}

/**
 * Gọi API với retry và fallback endpoints qua proxy
 */
async function callBinanceAPI(path, maxRetries = 3) {
  let lastError;

  for (let retry = 0; retry < maxRetries; retry++) {
    for (let i = 0; i < BINANCE_API_ENDPOINTS.length; i++) {
      try {
        const endpoint = getApiEndpoint();
        const response = await axios.get(`${endpoint}${path}`, {
          timeout: 20000,
          httpsAgent: proxyAgent,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        return response.data;
      } catch (error) {
        lastError = error;
        console.error(`❌ Lỗi với ${getApiEndpoint()}: ${error.message}`);
        switchToNextEndpoint();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Đợi 1 giây
      }
    }
  }

  throw lastError;
}

/**
 * Lấy danh sách tất cả các trading pairs trên Binance Futures
 */
async function getAllFuturesPairs() {
  try {
    const data = await callBinanceAPI('/fapi/v1/exchangeInfo');
    const symbols = data.symbols
      .filter(s => s.status === 'TRADING' && s.contractType === 'PERPETUAL')
      .map(s => s.symbol);
    return symbols;
  } catch (error) {
    console.error('Error fetching futures pairs:', error.message);
    return [];
  }
}

/**
 * Lấy funding rate của tất cả các cặp
 * @returns {Array} Array of {symbol, fundingRate, nextFundingTime}
 */
async function getAllFundingRates() {
  try {
    const data = await callBinanceAPI('/fapi/v1/premiumIndex');
    return data.map(item => ({
      symbol: item.symbol,
      fundingRate: parseFloat(item.lastFundingRate) * 100, // Convert to percentage
      nextFundingTime: new Date(parseInt(item.nextFundingTime)),
      markPrice: parseFloat(item.markPrice)
    }));
  } catch (error) {
    console.error('Error fetching funding rates:', error.message);
    return [];
  }
}

/**
 * Lọc các cặp có funding rate vượt ngưỡng
 * @param {number} threshold - Ngưỡng funding rate (%)
 */
async function getHighFundingRates(threshold = 1.0) {
  const allRates = await getAllFundingRates();
  return allRates.filter(item => Math.abs(item.fundingRate) >= threshold);
}

/**
 * Tìm funding rate của một symbol cụ thể
 * @param {string} searchTerm - Symbol cần tìm (có thể là BTC, BTCUSDT, btc, v.v.)
 * @returns {Object|null} Thông tin funding rate hoặc null nếu không tìm thấy
 */
async function searchSymbol(searchTerm) {
  const allRates = await getAllFundingRates();

  // Chuẩn hóa search term
  const normalized = searchTerm.toUpperCase().trim();

  // Tìm chính xác
  let result = allRates.find(item => item.symbol === normalized);

  // Nếu không tìm thấy, thử thêm USDT
  if (!result && !normalized.endsWith('USDT')) {
    result = allRates.find(item => item.symbol === `${normalized}USDT`);
  }

  // Nếu vẫn không tìm thấy, thử tìm gần đúng
  if (!result) {
    result = allRates.find(item => item.symbol.includes(normalized));
  }

  return result || null;
}

module.exports = {
  getAllFuturesPairs,
  getAllFundingRates,
  getHighFundingRates,
  searchSymbol
};
