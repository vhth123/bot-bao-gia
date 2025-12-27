const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Proxy configuration
const PROXY_HOST = '36.50.175.182';
const PROXY_PORT = 26478;
const PROXY_USER = 'muaproxy694e3e7aec20c';
const PROXY_PASS = 'byi9e1qgiyolt00b';

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
        console.log(`🔄 Đang gọi: ${endpoint}${path}`);

        const response = await axios.get(`${endpoint}${path}`, {
          timeout: 20000,
          httpsAgent: proxyAgent,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
          }
        });

        // Chi tiết debug response
        console.log(`✅ Status: ${response.status} ${response.statusText}`);
        console.log(`📋 Headers:`, JSON.stringify(response.headers, null, 2));
        console.log(`📊 Data type: ${typeof response.data}`);
        console.log(`📊 Data is array: ${Array.isArray(response.data)}`);
        console.log(`📊 Data length: ${response.data?.length || 'N/A'}`);

        if (typeof response.data === 'string') {
          console.log(`📄 Raw string data (first 500 chars):`, response.data.substring(0, 500));
        } else if (Array.isArray(response.data)) {
          console.log(`✅ Array received with ${response.data.length} items`);
          if (response.data.length > 0) {
            console.log(`📝 First item:`, JSON.stringify(response.data[0], null, 2));
          }
        } else {
          console.log(`⚠️ Unexpected data format:`, JSON.stringify(response.data).substring(0, 500));
        }

        return response.data;
      } catch (error) {
        lastError = error;
        console.error(`❌ Lỗi với ${getApiEndpoint()}: ${error.message}`);
        if (error.response) {
          console.error(`❌ Response status: ${error.response.status}`);
          console.error(`❌ Response data:`, JSON.stringify(error.response.data).substring(0, 200));
        }
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

    // Debug: log the response type and content
    console.log('📊 API Response type:', typeof data);
    console.log('📊 Is array:', Array.isArray(data));

    if (!Array.isArray(data)) {
      console.error('❌ API did not return an array:', JSON.stringify(data).substring(0, 200));
      return [];
    }

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
