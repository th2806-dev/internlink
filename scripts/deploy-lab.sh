#!/usr/bin/env bash
# =============================================================================
# InternLink - Deploy demo trên máy tại khoa / lab (chi phí 0 đồng)
# =============================================================================
# Yêu cầu:
#   - Máy Linux (Ubuntu/Debian khuyên dùng) hoặc Windows + Git Bash + Docker Desktop
#   - Docker Engine + Docker Compose plugin (script tự kiểm tra & hướng dẫn cài)
#   - RAM tối thiểu 4GB (khuyên 8GB)
#   - VMware network: Bridged khuyên dùng để các máy trong mạng lab truy cập trực tiếp
#
# Cách dùng:
#   bash scripts/deploy-lab.sh
#
# Tùy chọn (qua biến môi trường):
#   PORTAL_URL="https://ten-mien-cua-ban" bash scripts/deploy-lab.sh
#       -> URL công khai, dùng cho email thư mời & CORS
#   CLOUDFLARE_TUNNEL_TOKEN="..." bash scripts/deploy-lab.sh
#       -> Dùng Cloudflare Tunnel "named" (URL ổn định, cần tài khoản CF + domain)
#          Nếu không set, script dùng "quick tunnel" (URL https://xxx.trycloudflare.com
#          ngẫu nhiên, miễn phí, không cần tài khoản - URL đổi mỗi lần restart)
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT_DIR="$(pwd)"
PORTAL_URL="${PORTAL_URL:-http://localhost:3000}"

echo "==> InternLink deploy tại khoa"
echo "    Thư mục: $ROOT_DIR"
echo "    Portal URL: $PORTAL_URL"

# ---------------------------------------------------------------------------
# 1. Kiểm tra / cài Docker
# ---------------------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  echo ""
  echo "==> Docker chưa được cài đặt."
  echo "    Đang cài Docker Engine (Ubuntu/Debian)..."
  curl -fsSL https://get.docker.com | sh
  sudo systemctl enable --now docker || true
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose plugin chưa được cài. Chạy:"
  echo "  sudo apt-get install -y docker-compose-plugin"
  exit 1
fi

echo "==> Docker version:"
docker --version
docker compose version

# ---------------------------------------------------------------------------
# 2. Tạo .env với secret mạnh (chỉ tạo nếu chưa tồn tại)
# ---------------------------------------------------------------------------
ENV_FILE="$ROOT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "==> Tạo $ENV_FILE với secret tự sinh..."
  JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n=')"
  MSSQL_SA_PASSWORD="InternLink_$(openssl rand -base64 18 | tr -d '/+=')_!1a"
  cat > "$ENV_FILE" <<EOF
# InternLink - Môi trường Production (tự sinh bởi scripts/deploy-lab.sh)
# KHÔNG commit file này lên git!
MSSQL_SA_PASSWORD=$MSSQL_SA_PASSWORD
JWT_SECRET=$JWT_SECRET
EMAIL_ENABLED=false
EMAIL_USERNAME=internlink.cntt@gmail.com
EMAIL_PASSWORD=
PORTAL_URL=$PORTAL_URL
EOF
  echo "    Đã tạo. Chỉnh sửa $ENV_FILE nếu cần (vd: điền EMAIL_PASSWORD)."
else
  echo "==> .env đã tồn tại, giữ nguyên."
  # Cập nhật PORTAL_URL nếu được truyền qua đối số
  if [ "$PORTAL_URL" != "http://localhost:3000" ]; then
    sed -i "s|^PORTAL_URL=.*|PORTAL_URL=$PORTAL_URL|" "$ENV_FILE"
    echo "    Đã cập nhật PORTAL_URL=$PORTAL_URL"
  fi
fi

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon chưa chạy hoặc user hiện tại chưa có quyền Docker."
  echo "    Thử: sudo systemctl enable --now docker"
  echo "    Nếu lỗi permission: sudo usermod -aG docker \$USER rồi đăng nhập lại."
  exit 1
fi

# ---------------------------------------------------------------------------
# 3. Build & khởi động toàn bộ hệ thống
# ---------------------------------------------------------------------------
echo ""
echo "==> Build & khởi động (docker compose up -d --build)..."
docker compose up -d --build

echo "==> Chờ các container khỏe mạnh (tối đa ~2.5 phút)..."
HEALTHY_COUNT=0
for i in $(seq 1 30); do
  HEALTHY_COUNT="$(docker compose ps --format '{{.Health}}' | grep -c healthy || true)"
  [ "$HEALTHY_COUNT" -ge 3 ] && break
  sleep 5
done
if [ "$HEALTHY_COUNT" -lt 3 ]; then
  echo "WARN: Chưa đủ 3 container healthy (hiện $HEALTHY_COUNT/3). Kiểm tra: docker compose ps"
fi

echo ""
echo "==> Trạng thái container:"
docker compose ps

# ---------------------------------------------------------------------------
# 4. Cloudflare Tunnel - expose công khai qua HTTPS (không cần mở port)
# ---------------------------------------------------------------------------
if ! command -v cloudflared >/dev/null 2>&1; then
  echo ""
  echo "==> Cài cloudflared (Cloudflare Tunnel)..."
  # Ubuntu/Debian 64-bit
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list >/dev/null
  sudo apt-get update && sudo apt-get install -y cloudflared
fi

TUNNEL_URL=""
if [ -n "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]; then
  echo ""
  echo "==> Chạy Cloudflare Tunnel (named tunnel)..."
  cloudflared service install "$CLOUDFLARE_TUNNEL_TOKEN"
  TUNNEL_URL="$PORTAL_URL"
  echo "    Tunnel đã chạy dưới dạng service. Kiểm tra: systemctl status cloudflared"
elif [ -n "${PORTAL_URL:-}" ] && [ "$PORTAL_URL" != "http://localhost:3000" ]; then
  echo ""
  echo "==> Bỏ qua quick tunnel vì đã có PORTAL_URL=$PORTAL_URL"
  echo "    (Tự cấu hình tunnel/named tunnel cho domain này nếu cần.)"
  TUNNEL_URL="$PORTAL_URL"
else
  echo ""
  echo "==> Chạy Cloudflare Quick Tunnel (không cần tài khoản)..."
  cloudflared tunnel --url "http://localhost:3000" --no-autoupdate \
    > /tmp/internlink-tunnel.log 2>&1 &
  TUNNEL_PID=$!
  for i in $(seq 1 15); do
    TUNNEL_URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/internlink-tunnel.log | head -1 || true)"
    [ -n "$TUNNEL_URL" ] && break
    sleep 2
  done
  if [ -z "$TUNNEL_URL" ]; then
    echo "WARN: Chưa lấy được URL tunnel. Xem log: tail -f /tmp/internlink-tunnel.log"
  fi
  echo "    Tunnel chạy nền (PID $TUNNEL_PID, log /tmp/internlink-tunnel.log)"
  echo "    LƯU Ý: URL quick tunnel đổi mỗi lần restart. Muốn URL ổn định 6 tuần,"
  echo "    dùng: CLOUDFLARE_TUNNEL_TOKEN=... bash scripts/deploy-lab.sh"
fi

# ---------------------------------------------------------------------------
# 5. Tổng kết
# ---------------------------------------------------------------------------
cat <<EOF

==============================================================================
  InternLink ĐÃ SẴN SÀNG ✅
------------------------------------------------------------------------------
  Truy cập nội bộ:   http://localhost:3000
  Truy cập công khai: ${TUNNEL_URL:-<chưa có - xem log tunnel>}

  Tài khoản demo hiện tại: admin / Password123!  (SuperAdmin)
  Lưu ý: seed mặc định chỉ tạo tài khoản admin; chưa có gv001/sv001.

  Backup dữ liệu (chạy định kỳ, vd cron hằng ngày):
    docker run --rm -v internlink_database_data:/data -v \$(pwd):/backup \
      alpine tar czf /backup/internlink-db-\$(date +%F).tar.gz -C /data .
    docker run --rm -v internlink_uploads_data:/data -v \$(pwd):/backup \
      alpine tar czf /backup/internlink-uploads-\$(date +%F).tar.gz -C /data .

  Gỡ cài đặt:        docker compose down -v  (XÓA cả dữ liệu!)
==============================================================================
EOF