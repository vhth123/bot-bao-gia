const TelegramBot = require('node-telegram-bot-api');

class TelegramNotifier {
  constructor(token, chatId) {
    this.bot = new TelegramBot(token, { polling: true });
    this.chatId = chatId;
    this.commandHandlers = {};
  }

  /**
   * Đăng ký handler cho lệnh
   */
  onCommand(command, handler) {
    this.commandHandlers[command] = handler;
  }

  /**
   * Khởi động listening cho commands
   */
  startListening() {
    // Xử lý tất cả các messages
    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;

      // Chỉ xử lý tin nhắn từ chat ID được cấu hình
      if (chatId.toString() !== this.chatId.toString()) {
        return;
      }

      if (!text || !text.startsWith('/')) {
        return;
      }

      // Parse command và args
      const parts = text.trim().split(' ');
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      // Gọi handler nếu có
      if (this.commandHandlers[command]) {
        try {
          await this.commandHandlers[command](msg, args);
        } catch (error) {
          console.error(`❌ Lỗi khi xử lý lệnh ${command}:`, error.message);
          await this.sendMessage('❌ Có lỗi xảy ra khi xử lý lệnh');
        }
      }
    });

    console.log('✅ Đang lắng nghe các lệnh từ Telegram...');
  }

  /**
   * Gửi tin nhắn đơn giản
   */
  async sendMessage(text, options = {}) {
    try {
      await this.bot.sendMessage(this.chatId, text, options);
    } catch (error) {
      console.error('❌ Lỗi khi gửi tin nhắn:', error.message);
    }
  }

  /**
   * Gửi thông báo về funding rate cao
   * @param {Array} highRates - Array of {symbol, fundingRate, nextFundingTime, markPrice}
   */
  async sendFundingRateAlert(highRates) {
    if (highRates.length === 0) {
      return;
    }

    let message = '🚨 *CẢNH BÁO FUNDING RATE CAO* 🚨\n\n';

    // Sắp xếp theo funding rate tuyệt đối (cao nhất trước)
    const sorted = highRates.sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate));

    sorted.forEach((item, index) => {
      const emoji = item.fundingRate > 0 ? '📈' : '📉';
      const sign = item.fundingRate > 0 ? '+' : '';

      message += `${index + 1}. ${emoji} *${item.symbol}*\n`;
      message += `   Funding Rate: *${sign}${item.fundingRate.toFixed(4)}%*\n`;
      message += `   Mark Price: $${item.markPrice.toLocaleString()}\n`;
      message += `   Next Funding: ${this.formatTime(item.nextFundingTime)}\n\n`;
    });

    message += `_Thời gian kiểm tra: ${new Date().toLocaleString('vi-VN')}_`;

    try {
      await this.bot.sendMessage(this.chatId, message, { parse_mode: 'Markdown' });
      console.log(`✅ Đã gửi thông báo ${highRates.length} cặp có funding rate cao`);
    } catch (error) {
      console.error('❌ Lỗi khi gửi Telegram:', error.message);
    }
  }

  /**
   * Gửi thông báo bot đã khởi động
   */
  async sendStartupMessage() {
    const message = '✅ *Bot Funding Rate đã khởi động*\n\n' +
                   'Bot sẽ theo dõi funding rate trên Binance Futures và thông báo khi có cặp nào > ±1%\n\n' +
                   '*Các lệnh có sẵn:*\n' +
                   '/check - Kiểm tra ngay lập tức\n' +
                   '/search <symbol> - Tìm funding rate của một đồng\n' +
                   '/help - Xem hướng dẫn';

    try {
      await this.bot.sendMessage(this.chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('❌ Lỗi khi gửi thông báo khởi động:', error.message);
    }
  }

  /**
   * Gửi thông báo help
   */
  async sendHelpMessage() {
    const message = '📖 *HƯỚNG DẪN SỬ DỤNG BOT*\n\n' +
                   '*Các lệnh:*\n\n' +
                   '🔍 `/check`\n' +
                   'Kiểm tra ngay lập tức tất cả các cặp có funding rate > ±1%\n\n' +
                   '🔎 `/search <symbol>`\n' +
                   'Tìm funding rate của một đồng cụ thể\n' +
                   'Ví dụ: `/search BTCUSDT` hoặc `/search BTC`\n\n' +
                   '❓ `/help`\n' +
                   'Hiển thị hướng dẫn này\n\n' +
                   '*Lưu ý:*\n' +
                   '• Bot tự động kiểm tra mỗi 5 phút\n' +
                   '• Mỗi cặp chỉ thông báo 1 lần để tránh spam\n' +
                   '• Sử dụng lệnh `/check` để kiểm tra thủ công bất cứ lúc nào';

    await this.sendMessage(message, { parse_mode: 'Markdown' });
  }

  /**
   * Gửi thông báo kết quả search
   */
  async sendSearchResult(result) {
    if (!result) {
      await this.sendMessage('❌ Không tìm thấy symbol này trên Binance Futures');
      return;
    }

    const emoji = result.fundingRate > 0 ? '📈' : '📉';
    const sign = result.fundingRate > 0 ? '+' : '';
    const status = Math.abs(result.fundingRate) >= 1.0 ? '🚨 CAO' : '✅ Bình thường';

    const message = `${emoji} *${result.symbol}*\n\n` +
                   `Funding Rate: *${sign}${result.fundingRate.toFixed(4)}%* ${status}\n` +
                   `Mark Price: $${result.markPrice.toLocaleString()}\n` +
                   `Next Funding: ${this.formatTime(result.nextFundingTime)}\n\n` +
                   `_Thời gian: ${new Date().toLocaleString('vi-VN')}_`;

    await this.sendMessage(message, { parse_mode: 'Markdown' });
  }

  /**
   * Gửi kết quả check
   */
  async sendCheckResult(highRates, threshold) {
    if (highRates.length === 0) {
      const message = `✅ *Không có cặp nào vượt ngưỡng*\n\n` +
                     `Tất cả các cặp đều có funding rate < ±${threshold}%\n\n` +
                     `_Thời gian: ${new Date().toLocaleString('vi-VN')}_`;
      await this.sendMessage(message, { parse_mode: 'Markdown' });
      return;
    }

    await this.sendFundingRateAlert(highRates);
  }

  /**
   * Format thời gian
   */
  formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}

module.exports = TelegramNotifier;
