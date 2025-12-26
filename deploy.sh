#!/bin/bash

# Script tự động deploy bot lên VPS
# Cách dùng: ./deploy.sh

echo "🚀 Bắt đầu deploy Funding Rate Bot..."

# Màu sắc
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kiểm tra file .env
if [ ! -f .env ]; then
    echo -e "${RED}❌ Lỗi: File .env không tồn tại!${NC}"
    echo "Vui lòng tạo file .env từ .env.example và điền thông tin"
    exit 1
fi

echo -e "${GREEN}✅ File .env đã có${NC}"

# Tạo thư mục logs nếu chưa có
mkdir -p logs

# Cài đặt dependencies
echo "📦 Đang cài đặt dependencies..."
npm install --production

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Lỗi khi cài đặt dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Đã cài đặt dependencies${NC}"

# Kiểm tra PM2
if ! command -v pm2 &> /dev/null; then
    echo "📥 PM2 chưa được cài đặt, đang cài đặt..."
    npm install -g pm2
fi

echo -e "${GREEN}✅ PM2 đã sẵn sàng${NC}"

# Dừng bot cũ nếu đang chạy
echo "🛑 Dừng bot cũ (nếu có)..."
pm2 delete funding-rate-bot 2>/dev/null || true

# Khởi động bot với PM2
echo "🚀 Khởi động bot với PM2..."
pm2 start ecosystem.config.js

# Lưu danh sách process
pm2 save

# Setup PM2 startup (chạy khi khởi động server)
echo "⚙️  Thiết lập PM2 startup..."
pm2 startup

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deploy thành công!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📊 Xem logs:"
echo "   pm2 logs funding-rate-bot"
echo ""
echo "📈 Xem status:"
echo "   pm2 status"
echo ""
echo "🔄 Restart bot:"
echo "   pm2 restart funding-rate-bot"
echo ""
echo "🛑 Dừng bot:"
echo "   pm2 stop funding-rate-bot"
echo ""
