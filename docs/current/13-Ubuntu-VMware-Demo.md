# InternLink - Demo trên Ubuntu VMware

## Mô hình khuyến nghị

Dùng VMware Workstation/Player với Ubuntu Server 24.04 LTS:

- CPU: 2 vCPU
- RAM: 8 GB khuyến nghị, tối thiểu 4 GB
- Disk: 40 GB trở lên, SSD nếu có
- Network: **Bridged** để VM nhận IP trong cùng mạng LAN với máy trình diễn
- Nếu bắt buộc dùng NAT, cấu hình port forwarding từ host vào VM cho cổng 8000

SQL Server, backend và frontend chạy trong Docker Compose bên trong VM. Máy người dùng chỉ cần truy cập frontend qua IP VM, ví dụ `http://192.168.1.50:8000`.

## Cài Ubuntu dependencies

```bash
sudo apt update
sudo apt install -y git curl ca-certificates openssl
```

Cài Docker Engine và Compose plugin:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Đăng xuất/đăng nhập lại để group `docker` có hiệu lực, sau đó kiểm tra:

```bash
docker info
docker compose version
```

## Lấy source và triển khai

```bash
git clone <REPOSITORY_URL> internlink
cd internlink
bash scripts/deploy-lab.sh
```

Script sẽ tạo `.env` nếu chưa có, sinh JWT/SQL secret, build ba service, chạy migration/seed và in trạng thái container. Mặc định email tắt để demo không cần SMTP.

Tài khoản mặc định hiện tại:

```text
admin / Password123!
```

Seed mặc định chưa tạo tài khoản lecturer/student hoặc dữ liệu nghiệp vụ mẫu.

## Cho máy trong LAN truy cập

Lấy IP VM:

```bash
ip -4 addr show
```

Mở firewall chỉ cho frontend:

```bash
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 8000/tcp
sudo ufw enable
sudo ufw status
```

Trên máy khác trong LAN mở:

```text
http://<VM_IP>:8000
```

Không mở cổng `1433` database ra LAN. Backend và SQL Server chỉ cần giao tiếp trong Docker network. Cổng backend host cũng không cần mở trong cấu hình Compose hiện tại.

## Nếu dùng NAT

Trong VMware Network Adapter NAT, tạo port forwarding:

| Host port | VM port | Protocol |
|:--:|:--:|:--:|
| 8000 | 8000 | TCP |

Bridged vẫn được ưu tiên cho buổi demo nhiều máy vì người dùng truy cập trực tiếp IP LAN của VM.

## Kiểm tra sau triển khai

```bash
docker compose ps
curl -I http://localhost:8000/
curl -fsS http://localhost:8000/health/live
```

Xem log:

```bash
docker logs --tail 200 internlink_api
docker compose logs -f frontend backend database
```

## Dừng và cập nhật

```bash
docker compose stop

git pull
docker compose up -d --build --force-recreate
```

`docker compose down` giữ lại volumes. Không dùng `docker compose down -v` trong demo có dữ liệu vì lệnh này xóa database và upload volume.

## Backup trước demo quan trọng

```bash
mkdir -p "$HOME/internlink-backups"
docker exec internlink_database /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C \
  -Q "BACKUP DATABASE [InternLink] TO DISK = N'/var/opt/mssql/data/InternLink.bak' WITH INIT, COPY_ONLY, COMPRESSION"
docker cp internlink_database:/var/opt/mssql/data/InternLink.bak "$HOME/internlink-backups/"
docker run --rm -v internlink_uploads_data:/data -v "$HOME/internlink-backups:/backup" \
  alpine tar czf /backup/internlink-uploads-$(date +%F).tar.gz -C /data .
```

Shell hiện tại cần nạp `.env` trước khi dùng `$MSSQL_SA_PASSWORD`, hoặc thay bằng password quản trị thực tế. Không đưa file `.env` vào git.

## Cloudflare Tunnel tùy chọn

Dùng named tunnel cho URL ổn định:

```bash
CLOUDFLARE_TUNNEL_TOKEN=<token> \
PORTAL_URL=https://demo.example.edu \
bash scripts/deploy-lab.sh
```

Quick Tunnel phù hợp thử nhanh nhưng URL thay đổi sau mỗi lần restart. Không dùng quick tunnel làm địa chỉ chính cho demo kéo dài.
