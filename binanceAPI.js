const axios = require('axios');

const BINANCE_API_BASE = 'https://fapi.binance.com';

/**
 * Lấy danh sách tất cả các trading pairs trên Binance Futures
 */
async function getAllFuturesPairs() {
  try {
    const response = await axios.get(`${BINANCE_API_BASE}/fapi/v1/exchangeInfo`);
    const symbols = response.data.symbols
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
    const response = await axios.get(`${BINANCE_API_BASE}/fapi/v1/premiumIndex`);
    return response.data.map(item => ({
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
