# Hướng Dẫn Cài Đặt và Chạy Game "Tu Tiên Ký: Hư Vô Lộ" (Phiên bản SQLite)

Tài liệu này cung cấp hai bộ hướng dẫn:
1.  **Triển khai lên máy chủ VPS Ubuntu (Production):** Dành cho việc đưa game lên môi trường online, sử dụng Nginx, PM2, và SQLite.
2.  **Chạy trên máy local (Development):** Dành cho việc phát triển và thử nghiệm trên máy tính cá nhân.

---

## I. Hướng Dẫn Triển Khai Lên VPS Ubuntu (Production)

Phần này hướng dẫn bạn cách triển khai toàn bộ ứng dụng (Backend, Game Client, Admin Panel) lên một máy chủ ảo (VPS) chạy hệ điều hành Ubuntu.

### Yêu Cầu
*   Một VPS chạy Ubuntu 20.04 hoặc mới hơn.
*   Một tên miền (domain) đã trỏ về địa chỉ IP của VPS.
*   Quyền truy cập `sudo`.

### Bước 1: Cài Đặt Môi Trường Cơ Bản

1.  **Cập nhật hệ thống:**
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```

2.  **Cài đặt các công cụ cần thiết:**
    *   **Nginx (Web Server):**
        ```bash
        sudo apt install nginx -y
        ```
    *   **SQLite3 (Database):**
        ```bash
        sudo apt install sqlite3 -y
        ```
    *   **Node.js (thông qua nvm):**
        ```bash
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
        # Tải lại shell để sử dụng nvm
        source ~/.bashrc
        # Cài đặt Node.js phiên bản 18
        nvm install 18
        nvm use 18
        ```
    *   **PM2 (Process Manager):**
        ```bash
        npm install pm2 -g
        ```
    *   **Build Tools (cần cho `sqlite3` package):**
        ```bash
        sudo apt install build-essential python3 -y
        ```

### Bước 2: Tải và Cài Đặt Dependencies

1.  **Tải mã nguồn:** Di chuyển đến thư mục bạn muốn chứa dự án (ví dụ `/var/www/`) và clone repository (hoặc tải lên qua FTP/SCP).
    ```bash
    # Ví dụ
    sudo mkdir -p /var/www
    sudo chown $USER:$USER /var/www
    cd /var/www
    git clone <your-git-repo-url> tu-tien-ky
    cd tu-tien-ky
    ```

2.  **Cài đặt dependencies:**
    *   **Game Client (Thư mục gốc):**
        ```bash
        npm install
        ```
    *   **Backend:**
        ```bash
        cd server
        npm install
        cd .. 
        ```
    *   **Admin Panel:**
        ```bash
        cd admin
        npm install
        ```

### Bước 3: Khởi Tạo Database

1.  **Nhập Schema:** Di chuyển vào thư mục gốc của dự án. Lệnh sau sẽ tạo file database `tu_tien.sqlite` trong thư mục `server/` và khởi tạo tất cả các bảng.
    ```bash
    # Từ thư mục gốc /var/www/tu-tien-ky
    sqlite3 server/tu_tien.sqlite < sql.md
    ```

2.  **Tạo tài khoản Admin đầu tiên:** Để đăng nhập vào trang quản trị, hãy chạy lệnh sau. Lệnh này tạo tài khoản `admin` với mật khẩu là `123456`.
    ```bash
    sqlite3 server/tu_tien.sqlite "INSERT INTO admins (username, password) VALUES ('admin', '$2a$10$toE5KdTvU0p9BJpLzqhSbu8cK/srrZQkldLNXRD5X6cDbmct3x0BK');"
    ```

### Bước 4: Cấu Hình Ứng Dụng Backend (Quan trọng)

1.  **Cấu hình Bảo mật (JWT Secret):**
    *   Mở file: `server/middleware/auth.js`
    *   **CẢNH BÁO:** Bắt buộc phải thay đổi `JWT_SECRET`. Sử dụng một chuỗi ký tự ngẫu nhiên và phức tạp.
    *   Bạn có thể tạo một key mạnh bằng lệnh sau trên terminal của VPS: `openssl rand -base64 32`
    *   Copy chuỗi kết quả và dán vào file.
    ```javascript
    // Ví dụ sau khi thay đổi:
    const JWT_SECRET = 'dGhpcyBpcyBhIHZlcnkgc3Ryb25nIGFuZCBzZWNyZXQga2V5Cg=='; // <-- THAY ĐỔI
    ```
2.  **Cấu hình Database:**
    *   File `server/config/database.js` đã được cấu hình để tự động sử dụng file `tu_tien.sqlite`. Không cần chỉnh sửa thêm.

### Bước 5: Build Giao Diện

1.  **Build Game Client:**
     ```bash
    npm run build
    ```
    Lệnh này sẽ tạo thư mục `dist` ở thư mục gốc.

2.  **Build Admin Panel:**
    ```bash
    cd admin
    npm run build
    ```
    Lệnh này sẽ tạo ra một thư mục `dist` bên trong `admin/`.

### Bước 6: Cấu Hình Nginx làm Reverse Proxy

1.  **Tạo file cấu hình Nginx mới:**
    ```bash
    sudo nano /etc/nginx/sites-available/tu-tien-ky
    ```

2.  **Dán nội dung sau vào file, thay `your_domain.com` bằng tên miền của bạn:**
    ```nginx
    server {
        listen 80;
        server_name your_domain.com; # THAY ĐỔI TÊN MIỀN

        # Phục vụ Game Client (build từ thư mục gốc)
        root /var/www/tu-tien-ky/dist;
        index index.html;

        location / {
            try_files $uri /index.html;
        }

        # Phục vụ Admin Panel
        location /admin {
            alias /var/www/tu-tien-ky/admin/dist;
            try_files $uri /admin/index.html;
        }

        # API backend
        location /api/ {
            proxy_pass http://127.0.0.1:3001; # Backend Node.js chạy ở port 3001
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

3.  **Kích hoạt cấu hình và kiểm tra lỗi:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/tu-tien-ky /etc/nginx/sites-enabled/
    sudo rm /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl restart nginx
    ```

### Bước 7: Cấu Hình Tường Lửa (UFW)

```bash
sudo ufw allow 'OpenSSH'
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Bước 8: Chạy Backend với PM2

1.  **Khởi động server backend:** Từ thư mục gốc của dự án (`/var/www/tu-tien-ky`), chạy lệnh:
    ```bash
    pm2 start server/index.js --name "tu-tien-ky-backend"
    ```

2.  **Lưu lại danh sách process để tự khởi động lại khi reboot:**
    ```bash
    pm2 save
    ```

3.  **Kiểm tra trạng thái và logs:**
    *   Xem danh sách process: `pm2 list`
    *   Xem log của backend: `pm2 logs tu-tien-ky-backend`

### Bước 9 (Khuyến khích): Cài Đặt SSL với Certbot

Để trang web của bạn an toàn với HTTPS.
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your_domain.com
```
Làm theo các hướng dẫn để nhận chứng chỉ và tự động cấu hình Nginx.

**Chúc mừng!** Ứng dụng của bạn giờ đã hoạt động tại `https://your_domain.com` và trang quản trị tại `https://your_domain.com/admin`.

---

## II. Hướng Dẫn Chạy trên Môi Trường Development (Local)

Phần này dành cho việc phát triển và thử nghiệm trên máy tính cá nhân.

### Yêu Cầu
1.  **Node.js**: Phiên bản 18.x trở lên.
2.  **npm** (hoặc yarn, pnpm).
3.  **SQLite3 Command-Line Tool** (để dễ dàng quản lý DB, không bắt buộc nhưng khuyến khích).

### Bước 1: Chuẩn Bị Database
1.  **Xóa file database cũ (nếu có):**
    ```bash
    # Trong thư mục server/
    rm tu_tien.sqlite
    ```
2.  **Khởi tạo Database:**
    *   Mở Terminal/Command Prompt tại **thư mục gốc của dự án**.
    *   Chạy lệnh sau để tạo và khởi tạo database:
    ```bash
    sqlite3 server/tu_tien.sqlite < sql.md
    ```
3.  **Tạo Tài Khoản Admin:** Chạy lệnh sau để tạo tài khoản `admin` với mật khẩu là `123456`.
    ```bash
    sqlite3 server/tu_tien.sqlite "INSERT OR IGNORE INTO admins (username, password) VALUES ('admin', '$2a$10$toE5KdTvU0p9BJpLzqhSbu8cK/srrZQkldLNXRD5X6cDbmct3x0BK');"
    ```

### Bước 2: Chạy các thành phần của dự án

Mở 3 cửa sổ Terminal khác nhau.

---
**Terminal 1: Backend Server**

1.  **Di chuyển vào thư mục `server`:** `cd server`
2.  **Cài đặt dependencies:** `npm install`
3.  **Khởi động Server:** `npm start`
    *   Server sẽ chạy tại `http://localhost:3001`.
    *   **Giữ cửa sổ terminal này mở.**

---
**Terminal 2: Game Client**

1.  **Di chuyển về thư mục gốc của dự án.**
2.  **Cài đặt dependencies:** `npm install`
3.  **Khởi động server phát triển:** `npm run dev`
    *   Game client sẽ có thể truy cập tại `http://localhost:3000`.
    *   **Giữ cửa sổ terminal này mở.**

---
**Terminal 3: Trang Quản Trị (Admin Panel)**

1.  **Di chuyển vào thư mục `admin`:** `cd admin`
2.  **Cài đặt dependencies:** `npm install`
3.  **Khởi động server phát triển:** `npm run dev`
    *   Admin panel sẽ có thể truy cập tại `http://localhost:3002`.
    *   **Giữ cửa sổ terminal này mở.**

---
### Tổng Kết
*   **Game:** `http://localhost:3000`
*   **Backend API:** `http://localhost:3001`
*   **Admin Panel:** `http://localhost:3002`

Bạn đã sẵn sàng để phát triển và thử nghiệm!
