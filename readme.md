# 🤖 Binance Funding Rate Alert Bot

Bot tự động theo dõi funding rate trên Binance Futures và gửi thông báo qua Telegram khi phát hiện bất kỳ cặp giao dịch nào có funding rate > ±1%.

## ✨ Tính năng

### 🔔 Theo dõi tự động
- ✅ Theo dõi funding rate của **tất cả các cặp** trên Binance Futures
- ✅ Cảnh báo tự động qua Telegram khi funding rate vượt ngưỡng (±1%)
- ✅ Kiểm tra định kỳ mỗi 5 phút
- ✅ Chỉ thông báo một lần cho mỗi cặp để tránh spam
- ✅ Hiển thị thông tin chi tiết: symbol, funding rate, mark price, thời gian funding tiếp theo

### 💬 Lệnh tương tác
- ✅ `/check` - Kiểm tra ngay lập tức (không cần đợi)
- ✅ `/search <symbol>` - Tìm funding rate của một đồng cụ thể
- ✅ `/help` - Xem hướng dẫn sử dụng

## 📋 Yêu cầu

- Node.js v14 trở lên
- Telegram Bot Token
- Telegram Chat ID

## 🚀 Cài đặt

### 1. Clone hoặc tải project

```bash
cd bot-bao-gia
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Tạo Telegram Bot

1. Mở Telegram và tìm [@BotFather](https://t.me/botfather)
2. Gửi lệnh `/newbot` và làm theo hướng dẫn
3. Lưu lại **Bot Token** mà BotFather cung cấp

### 4. Lấy Telegram Chat ID

**Cách 1: Dùng bot GetIDs**
1. Tìm và chat với [@getidsbot](https://t.me/getidsbot) trên Telegram
2. Bot sẽ trả về Chat ID của bạn

**Cách 2: Gửi tin nhắn và check API**
1. Gửi một tin nhắn bất kỳ cho bot của bạn
2. Truy cập: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. Tìm giá trị `"chat":{"id":123456789}` trong JSON response

### 5. Cấu hình

Tạo file `.env` từ file mẫu:

```bash
cp .env.example .env
```

Mở file `.env` và điền thông tin:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here
FUNDING_RATE_THRESHOLD=1.0
CHECK_INTERVAL=300000
```

**Giải thích:**
- `TELEGRAM_BOT_TOKEN`: Token bot từ BotFather
- `TELEGRAM_CHAT_ID`: Chat ID của bạn
- `FUNDING_RATE_THRESHOLD`: Ngưỡng cảnh báo (% - mặc định 1.0%)
- `CHECK_INTERVAL`: Tần suất kiểm tra (milliseconds - mặc định 300000 = 5 phút)

## ▶️ Chạy bot

### Chạy thông thường:
```bash
npm start
```

### Chạy ở chế độ development (tự động restart khi có thay đổi):
```bash
npm run dev
```

## 💬 Các lệnh tương tác

Bot hỗ trợ các lệnh sau qua Telegram:

### `/check` - Kiểm tra ngay lập tức
Quét tất cả các cặp và báo cáo những cặp có funding rate > ±1% ngay lập tức (không cần đợi 5 phút).

**Cách dùng:**
```
/check
```

### `/search <symbol>` - Tìm funding rate của một đồng
Xem funding rate hiện tại của một đồng cụ thể.

**Cách dùng:**
```
/search BTCUSDT
/search BTC
/search ETH
```

Bot sẽ tự động thêm "USDT" nếu bạn chỉ gõ tên đồng (ví dụ: `BTC` → `BTCUSDT`).

### `/help` - Xem hướng dẫn
Hiển thị danh sách tất cả các lệnh và cách sử dụng.

**Cách dùng:**
```
/help
```

## 📱 Ví dụ thông báo Telegram

### Thông báo tự động (mỗi 5 phút):
```
🚨 CẢNH BÁO FUNDING RATE CAO 🚨

1. 📈 BTCUSDT
   Funding Rate: +1.2500%
   Mark Price: $45,234.50
   Next Funding: 16:00

2. 📉 ETHUSDT
   Funding Rate: -1.0823%
   Mark Price: $2,345.67
   Next Funding: 16:00

Thời gian kiểm tra: 26/12/2025 15:45:32
```

### Kết quả lệnh /search:
```
📈 BTCUSDT

Funding Rate: +0.0521% ✅ Bình thường
Mark Price: $45,234.50
Next Funding: 16:00

Thời gian: 26/12/2025 15:45:32
```

## 📂 Cấu trúc project

```
bot-bao-gia/
├── index.js           # File chính, logic bot
├── binanceAPI.js      # Tích hợp Binance API
├── telegramBot.js     # Tích hợp Telegram Bot
├── package.json       # Cấu hình npm
├── .env              # Cấu hình (tự tạo)
├── .env.example      # File mẫu cấu hình
├── .gitignore        # Git ignore
└── readme.md         # Hướng dẫn
```

## ⚙️ Tùy chỉnh

### Thay đổi ngưỡng cảnh báo

Sửa `FUNDING_RATE_THRESHOLD` trong file `.env`:
```env
FUNDING_RATE_THRESHOLD=0.5  # Cảnh báo khi > ±0.5%
```

### Thay đổi tần suất kiểm tra

Sửa `CHECK_INTERVAL` trong file `.env`:
```env
CHECK_INTERVAL=600000  # Kiểm tra mỗi 10 phút (600000ms)
```

## 🛠️ Chạy bot 24/7

### Sử dụng PM2 (khuyên dùng):

```bash
# Cài đặt PM2
npm install -g pm2

# Khởi động bot
pm2 start index.js --name funding-rate-bot

# Xem logs
pm2 logs funding-rate-bot

# Dừng bot
pm2 stop funding-rate-bot

# Khởi động lại
pm2 restart funding-rate-bot
```

## 🐛 Xử lý lỗi

### Lỗi "TELEGRAM_BOT_TOKEN not found"
- Kiểm tra file `.env` đã tạo chưa
- Kiểm tra đã điền đúng token và chat ID chưa

### Lỗi kết nối Binance API
- Kiểm tra kết nối internet
- Binance API có thể bị rate limit, bot sẽ tự động retry

### Bot không gửi tin nhắn Telegram
- Kiểm tra Chat ID có đúng không
- Đảm bảo đã gửi tin nhắn cho bot ít nhất 1 lần

## 📝 Lưu ý

- Bot sử dụng Binance Futures API công khai, không cần API key
- Mỗi symbol chỉ được thông báo một lần cho đến khi funding rate về dưới ngưỡng
- Funding rate được tính theo % (ví dụ: 1.0% = 0.01 trong API)

## 📄 License

MIT

## 🙏 Hỗ trợ

Nếu có vấn đề, vui lòng tạo issue hoặc liên hệ qua Telegram.
# bot-bao-gia
# bot-bao-gia
