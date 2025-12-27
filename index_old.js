require('dotenv').config();
const { getHighFundingRates, searchSymbol } = require('./binanceAPI');
const TelegramNotifier = require('./telegramBot');

// Load configuration từ .env
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const FUNDING_RATE_THRESHOLD = parseFloat(process.env.FUNDING_RATE_THRESHOLD) || 1.0;
const CHANGE_THRESHOLD = parseFloat(process.env.CHANGE_THRESHOLD) || 0.2; // Ngưỡng thay đổi
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL) || 300000; // Default 5 phút

// Kiểm tra cấu hình
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('❌ Lỗi: Vui lòng cấu hình TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID trong file .env');
  process.exit(1);
}

// Khởi tạo Telegram notifier
const notifier = new TelegramNotifier(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID);

// Set để lưu các symbol đã thông báo (để tránh spam)
const notifiedSymbols = new Set();

// Map để lưu funding rate lần quét trước {symbol: fundingRate}
const previousRates = new Map();

/**
 * Kiểm tra funding rate và gửi thông báo
 */
async function checkAndNotify() {
  console.log(`🔍 Kiểm tra funding rate lúc ${new Date().toLocaleString('vi-VN')}...`);

  try {
    const highRates = await getHighFundingRates(FUNDING_RATE_THRESHOLD);

    if (highRates.length > 0) {
      console.log(`📊 Tìm thấy ${highRates.length} cặp có funding rate cao:`);

      // Lọc ra các symbol chưa được thông báo
      const newAlerts = highRates.filter(item => !notifiedSymbols.has(item.symbol));

      if (newAlerts.length > 0) {
        // Hiển thị danh sách mới
        newAlerts.forEach(item => {
          const sign = item.fundingRate > 0 ? '+' : '';
          console.log(`   - ${item.symbol}: ${sign}${item.fundingRate.toFixed(4)}%`);
        });

        // Gửi thông báo
        await notifier.sendFundingRateAlert(newAlerts);

        // Thêm vào danh sách đã thông báo
        newAlerts.forEach(item => notifiedSymbols.add(item.symbol));
      } else {
        console.log('   (Tất cả đều đã được thông báo trước đó)');
      }

      // Xóa các symbol không còn vượt ngưỡng khỏi set
      const currentHighSymbols = new Set(highRates.map(item => item.symbol));
      for (const symbol of notifiedSymbols) {
        if (!currentHighSymbols.has(symbol)) {
          notifiedSymbols.delete(symbol);
          console.log(`   ℹ️  ${symbol} đã về mức funding rate bình thường`);
        }
      }
    } else {
      console.log('✅ Không có cặp nào có funding rate > ±' + FUNDING_RATE_THRESHOLD + '%');

      // Xóa tất cả nếu không còn symbol nào vượt ngưỡng
      if (notifiedSymbols.size > 0) {
        notifiedSymbols.clear();
      }
    }
  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra funding rate:', error.message);
  }
}

/**
 * Khởi động bot
 */
async function start() {
  console.log('=================================================');
  console.log('🤖 BINANCE FUNDING RATE ALERT BOT');
  console.log('=================================================');
  console.log(`📊 Ngưỡng cảnh báo: ±${FUNDING_RATE_THRESHOLD}%`);
  console.log(`⏱️  Tần suất kiểm tra: ${CHECK_INTERVAL / 1000} giây`);
  console.log('=================================================\n');

  // Đăng ký các lệnh Telegram
  setupCommands();

  // Bắt đầu lắng nghe lệnh
  notifier.startListening();

  // Gửi thông báo khởi động
  await notifier.sendStartupMessage();

  // Kiểm tra ngay lập tức
  await checkAndNotify();

  // Thiết lập kiểm tra định kỳ
  setInterval(checkAndNotify, CHECK_INTERVAL);

  console.log('\n✅ Bot đang chạy... Nhấn Ctrl+C để dừng\n');
}

/**
 * Đăng ký các lệnh Telegram
 */
function setupCommands() {
  // Lệnh /check - Kiểm tra ngay lập tức
  notifier.onCommand('/check', async (msg, args) => {
    console.log('📱 Nhận lệnh /check từ Telegram');
    await notifier.sendMessage('🔍 Đang kiểm tra tất cả các cặp...');

    try {
      const highRates = await getHighFundingRates(FUNDING_RATE_THRESHOLD);
      await notifier.sendCheckResult(highRates, FUNDING_RATE_THRESHOLD);
      console.log(`✅ Đã gửi kết quả check: ${highRates.length} cặp`);
    } catch (error) {
      console.error('❌ Lỗi khi xử lý /check:', error.message);
      await notifier.sendMessage('❌ Có lỗi xảy ra khi kiểm tra');
    }
  });

  // Lệnh /search - Tìm funding rate của một symbol
  notifier.onCommand('/search', async (msg, args) => {
    if (args.length === 0) {
      await notifier.sendMessage('❌ Vui lòng nhập symbol cần tìm\nVí dụ: `/search BTCUSDT` hoặc `/search BTC`', { parse_mode: 'Markdown' });
      return;
    }

    const searchTerm = args[0];
    console.log(`📱 Nhận lệnh /search ${searchTerm} từ Telegram`);
    await notifier.sendMessage(`🔍 Đang tìm ${searchTerm}...`);

    try {
      const result = await searchSymbol(searchTerm);
      await notifier.sendSearchResult(result);
      console.log(`✅ Đã gửi kết quả search cho ${searchTerm}: ${result ? 'Tìm thấy' : 'Không tìm thấy'}`);
    } catch (error) {
      console.error('❌ Lỗi khi xử lý /search:', error.message);
      await notifier.sendMessage('❌ Có lỗi xảy ra khi tìm kiếm');
    }
  });

  // Lệnh /help - Hiển thị hướng dẫn
  notifier.onCommand('/help', async (msg, args) => {
    console.log('📱 Nhận lệnh /help từ Telegram');
    await notifier.sendHelpMessage();
  });

  console.log('✅ Đã đăng ký các lệnh: /check, /search, /help');
}

// Xử lý khi dừng bot
process.on('SIGINT', () => {
  console.log('\n\n👋 Đang dừng bot...');
  process.exit(0);
});

// Khởi động
start();
