# Chi Tiết Chức Năng và Cấu Trúc Dự Án "Tu Tiên Ký: Hư Vô Lộ"

## Giới thiệu

**Tu Tiên Ký: Hư Vô Lộ** là một trò chơi văn bản gia tăng (incremental/idle game) dựa trên chủ đề tu tiên. Người chơi sẽ bắt đầu từ một Phàm Nhân, thông qua việc thiền định (tự động tích lũy linh khí), đột phá cảnh giới, rèn luyện thân thể, học công pháp, luyện đan dược và tham gia vào các hoạt động khác để từng bước trở nên mạnh mẽ hơn trên con đường trường sinh. Giao diện được thiết kế hiện đại, đáp ứng linh hoạt (responsive) cho cả trải nghiệm trên máy tính và thiết bị di động.

## Các Chức Năng Chính

-   **Tu Luyện & Đột Phá:** Tự động tích lũy Linh Khí (Qi) theo thời gian. Khi đủ linh khí, người chơi có thể tiến hành đột phá lên cảnh giới cao hơn, mở khóa các tính năng và sức mạnh mới.
-   **Luyện Thể & Thám Hiểm:** Sử dụng linh khí để tôi luyện thân thể, tăng cường các chỉ số chiến đấu. Gửi nhân vật đi thám hiểm các khu vực để tìm kiếm nguyên liệu (linh thảo).
-   **Công Pháp & Trang Bị:** Học và trang bị các loại công pháp và trang bị (vũ khí, giáp, phụ kiện) khác nhau để nhận được các hiệu ứng có lợi như tăng tốc độ tu luyện, tăng tỷ lệ đột phá, tăng chỉ số chiến đấu.
-   **Luyện Đan (Alchemy):** Sử dụng linh thảo thu thập được từ Thám Hiểm để luyện chế ra các loại đan dược, cung cấp các hiệu ứng tức thời như hồi phục linh khí hoặc tăng cường sức mạnh trong PvP.
-   **Thí Luyện Chi Địa (PvE):** Tham gia chiến đấu theo lượt với các quái vật tại các khu vực thí luyện để nhận phần thưởng. Các trận chiến sử dụng **Hệ Thống Chiến Đấu** cốt lõi của game.
-   **Hệ Thống Chiến Đấu (Combat System):**
    *   **Chiến đấu theo lượt:** Các trận đấu PvE và PvP đều diễn ra theo lượt. Tốc độ (Speed) của nhân vật quyết định thứ tự ra đòn.
    *   **Chỉ số toàn diện:** Sức mạnh của người chơi được thể hiện qua một hệ thống chỉ số chi tiết, bao gồm các chỉ số cơ bản (Sinh Lực, Công Kích, Phòng Ngự) và các chỉ số nâng cao (Tốc Độ, Bạo Kích, Sát Thương Bạo Kích, Né Tránh, Chính Xác, Hút Máu, Phản Đòn) cùng các chỉ số kháng tương ứng.
    *   **Tính toán sát thương:** Sát thương được tính toán dựa trên Công Kích của người tấn công và Phòng Ngự của người phòng thủ, có xét đến các yếu tố như Bạo Kích và Né Tránh.
    *   **Sát Khí & Tuyệt Kỹ (PvP):** Trong các trận Đấu Pháp, người chơi sẽ tích lũy Sát Khí (Energy) qua mỗi lượt. Sát Khí được dùng để thi triển các Tuyệt Kỹ PvP đặc biệt với hiệu ứng đa dạng như gây sát thương lớn, tạo khiên chắn, hoặc gây hiệu ứng bất lợi cho đối thủ.
-   **Đấu Pháp (PvP) & Vinh Dự:**
    *   **Luận Bàn Đạo Pháp:** Người chơi có thể thách đấu với những người chơi khác để kiểm chứng thực lực và tranh đoạt **Điểm Vinh Dự**. Các trận đấu sử dụng **Hệ Thống Chiến Đấu** theo lượt, nơi chiến thuật sử dụng **Tuyệt Kỹ PvP** và quản lý **Sát Khí** là chìa khóa để chiến thắng.
    *   **Cửa Hàng Vinh Dự:** Dùng Điểm Vinh Dự kiếm được để mua các trang bị, đan dược đặc biệt hoặc lĩnh ngộ các **Tuyệt Kỹ PvP** mới.
    *   **Ác Nghiệp & Thiên Phạt:** Tấn công và chiến thắng người chơi có cảnh giới thấp hơn sẽ tích lũy điểm Ác Nghiệp. Điểm Ác Nghiệp càng cao, rủi ro bị **Thiên Phạt** (rớt 1 cảnh giới) khi đột phá càng lớn.
    *   **Xem Lại Chiến Báo:** Tất cả các trận đấu PvP đều được ghi lại. Người chơi có thể xem lại chi tiết diễn biến trận đấu để phân tích và rút kinh nghiệm.
-   **Tông Môn (Guilds):** Tạo hoặc gia nhập Tông Môn. Cống hiến cho Tông Môn để tăng cấp và nhận các phúc lợi chung cho tất cả thành viên, đồng thời chuẩn bị lực lượng cho Tông Môn Chiến.
-   **Tông Môn Chiến (Guild Wars):**
    *   **Sự kiện định kỳ:** Một sự kiện tự động diễn ra theo lịch trình, nơi các tông môn đối đầu để tranh đoạt vinh quang và phần thưởng.
    *   **Ghi danh:** Tông chủ sẽ ghi danh cho tông môn của mình trong thời gian cho phép.
    *   **Ghép cặp & Thi đấu:** Hệ thống tự động ghép cặp các tông môn đã đăng ký. Các trận đấu diễn ra theo thể thức nhiều vòng (ví dụ: Thắng 2 trên 3).
    *   **Chiến thuật đội hình:** Trước mỗi vòng đấu, Tông chủ phải sắp xếp một đội hình gồm 3 thành viên. Một thành viên chỉ có thể tham gia chiến đấu một lần duy nhất trong toàn bộ trận đấu (match) với một tông môn khác, đòi hỏi sự tính toán chiến thuật để sử dụng nhân sự hiệu quả.
    *   **Phần thưởng:** Toàn bộ thành viên của tông môn chiến thắng sẽ nhận được những phần thưởng giá trị.
-   **Chợ Giao Dịch (Marketplace):**
    *   **Tiền tệ:** Sử dụng **Linh Thạch** làm đơn vị tiền tệ giao dịch giữa người chơi.
    *   **Rao bán:** Người chơi có thể rao bán các trang bị không sử dụng từ túi đồ của mình.
    *   **Mua bán:** Tìm kiếm và mua các trang bị từ những người chơi khác để nhanh chóng gia tăng sức mạnh.
    *   **Thuế:** Một khoản thuế nhỏ được áp dụng cho mỗi giao dịch thành công để duy trì sự cân bằng của nền kinh tế trong game.
-   **Lĩnh Ngộ (Insights):** Sử dụng điểm Lĩnh Ngộ nhận được khi đột phá để mở khóa các thiên phú bị động, mang lại lợi ích vĩnh viễn.
-   **Giao Diện Linh Hoạt (Responsive UI):** Giao diện được thiết kế lại hoàn toàn, tối ưu cho cả máy tính (PC) và thiết bị di động. Giao diện PC sử dụng bố cục nhiều cột dạng "dashboard" để hiển thị nhiều thông tin cùng lúc. Giao diện di động được tối ưu với thanh trạng thái Linh Khí cố định ở dưới, các nút chức năng chính được bố trí gọn gàng, và các nút truy cập nhanh cho các tính năng PvP, Thí Luyện. Mỗi chức năng sẽ mở ra trong một cửa sổ modal riêng biệt để giữ giao diện sạch sẽ và dễ sử dụng.
-   **Tính Năng Xã Hội:** Kênh chat thế giới, xem thông tin người chơi khác (Quan Sát), và bảng xếp hạng (Thiên Địa Bảng).
-   **Lưu Trữ & Offline Progress:** Toàn bộ tiến trình của người chơi được lưu trên server. Khi người chơi đăng nhập lại sau một thời gian offline, hệ thống sẽ tự động tính toán lượng tài nguyên tích lũy được trong thời gian đó.
-   **Trang Quản Trị Toàn Diện (Admin Panel):** Một giao diện web riêng biệt tại `/admin` cho phép quản trị viên (GM) quản lý toàn diện trò chơi:
    *   **Dashboard:** Xem các chỉ số tổng quan như tổng số người chơi, tổng số tông môn.
    *   **Quản lý Người chơi:** Tìm kiếm, xem, chỉnh sửa mọi thông số của người chơi (linh khí, cảnh giới, vật phẩm, v.v.), và thực hiện khóa/mở khóa tài khoản.
    *   **Quản lý Tông Môn:** Xem, chỉnh sửa thông tin, và giải tán tông môn.
    *   **Quản lý Tông Môn Chiến:** Xem trạng thái cuộc chiến hiện tại, các trận đấu, và có thể ép xử lý các vòng đấu nếu cần.
    *   **Quản lý Dữ liệu Game:** Toàn quyền Thêm/Sửa/Xóa (CRUD) đối với tất cả các dữ liệu nền của game như Cảnh Giới, Công Pháp, Trang Bị, Đan Dược, v.v.
    *   **Quản lý Sự kiện & Giftcode:** Toàn quyền Thêm/Sửa/Xóa các sự kiện và mã quà tặng trong game.

## Cấu Trúc Thư Mục

Dự án được chia thành ba phần chính: client game (thư mục gốc), backend (`server/`), và trang quản trị (`admin/`).

```
.
├── admin/                      # Chứa giao diện trang quản trị (React + Vite)
│   ├── index.html              # HTML gốc cho trang admin
│   ├── index.tsx               # Điểm khởi đầu của React app admin
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── constants.ts            # Hằng số dùng chung cho admin
├── components/                 # Các component React tái sử dụng của client game
│   ├── AlchemyPanel.tsx        # Panel Luyện Đan
│   ├── Auth.tsx                # Component đăng nhập/đăng ký
│   ├── BodyTemperingPanel.tsx  # Panel Luyện Thể & Thám Hiểm
│   ├── ChatPanel.tsx           # Panel chat thế giới
│   ├── CombatReplayModal.tsx   # (MỚI) Modal xem lại chi tiết trận đấu PvP
│   ├── ConfirmationModal.tsx   # Modal xác nhận hành động (VD: rời tông môn)
│   ├── EnlightenmentPanel.tsx  # Panel Lĩnh Ngộ (cây thiên phú)
│   ├── EquipmentPanel.tsx      # Panel quản lý Trang Bị
│   ├── EventsPanel.tsx         # Panel hiển thị sự kiện (dùng trong SystemPanel)
│   ├── GameLog.tsx             # Component hiển thị nhật ký tu luyện
│   ├── GuildPanel.tsx          # Component quản lý Tông Môn
│   ├── GuildWarPanel.tsx       # Panel Tông Môn Chiến
│   ├── Header.tsx              # Component tiêu đề game
│   ├── HonorShopPanel.tsx      # Panel cửa hàng vinh dự (dùng trong PvpPanel)
│   ├── Icons.tsx               # Các icon SVG
│   ├── LeaderboardPanel.tsx    # Panel Bảng Xếp Hạng
│   ├── MarketPanel.tsx         # Panel Chợ Giao Dịch
│   ├── MatchDetailsModal.tsx   # Modal chi tiết trận đấu PvP (dùng cho Tông Môn Chiến)
│   ├── MatchHistoryPanel.tsx   # Panel lịch sử đấu PvP, tích hợp trong PvpPanel
│   ├── Modal.tsx               # Component modal chung, làm nền cho các cửa sổ pop-up
│   ├── PlayerInspectModal.tsx  # Modal xem thông tin người chơi khác (Quan Sát)
│   ├── PvpPanel.tsx            # Component chính cho Đấu Pháp (gồm tìm đối thủ, shop, lịch sử)
│   ├── PvpSkillsPanel.tsx      # (MỚI) Panel lĩnh ngộ Tuyệt Kỹ PvP
│   ├── RedeemCodePanel.tsx     # Panel nhập giftcode (dùng trong SystemPanel)
│   ├── SystemPanel.tsx         # Panel Hệ thống (gộp EventsPanel và RedeemCodePanel)
│   ├── TechniquesPanel.tsx     # Panel Công Pháp
│   └── TrialGroundsPanel.tsx   # Panel Thí Luyện Chi Địa (PvE)
├── readme/                     # Thư mục chứa tài liệu
│   ├── chi tiết.md             # File này, giải thích chi tiết dự án
│   └── hướng dẫn.md            # File hướng dẫn cài đặt và chạy dự án
├── server/                     # Chứa code backend Node.js (Express)
│   ├── config/
│   │   └── database.js         # Cấu hình kết nối MariaDB
│   ├── middleware/
│   │   └── auth.js             # Middleware xác thực JWT cho người chơi và admin
│   ├── routes/                 # Định nghĩa các API endpoint
│   │   ├── admin.routes.js
│   │   ├── auth.routes.js
│   │   ├── chat.routes.js
│   │   ├── game.routes.js
│   │   ├── guild-war.routes.js # (MỚI) API cho Tông Môn Chiến
│   │   ├── guild.routes.js
│   │   ├── market.routes.js
│   │   ├── player.routes.js
│   │   └── pvp.routes.js
│   ├── services/
│   │   ├── gameData.service.js   # Dịch vụ quan trọng, tải toàn bộ dữ liệu game từ DB vào cache
│   │   ├── guildWar.service.js   # (MỚI) Logic xử lý Tông Môn Chiến
│   │   └── player.service.js   # Logic xử lý chính (tính toán offline, wrapper hành động)
│   ├── utils/
│   │   ├── combatMessages.js   # (MỚI) Các mẫu câu cho combat log PvP
│   │   └── formatters.js       # Các hàm tiện ích phía server
│   ├── constants.js            # File này đã được làm trống. Dữ liệu game giờ được tải bởi gameData.service.js
│   ├── index.js                # Điểm khởi đầu của server Express
│   └── package.json            # Dependencies của server
├── App.tsx                     # Component React gốc, quản lý state và layout chính (PC & Mobile)
├── constants.ts                # Các hằng số game phía client
├── index.html                  # File HTML gốc của client game
├── index.tsx                   # Điểm khởi đầu của React client
├── metadata.json               # Metadata của ứng dụng
├── sql.md                      # Schema của database để khởi tạo
└── types.ts                    # Định nghĩa các kiểu dữ liệu TypeScript dùng chung
```