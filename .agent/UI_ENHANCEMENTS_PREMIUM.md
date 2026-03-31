Feature: Premium Loading States & Interactive Components

1. Context

Nâng cấp trải nghiệm người dùng thông qua các hiệu ứng phản hồi thị giác (Visual Feedback) trong khi chờ dữ liệu và khi tương tác với các menu điều hướng.

2. Skeleton Loading (Shimmer Effect)

Thay vì dùng biểu tượng quay vòng (spinner) cổ điển, chúng ta sử dụng các khối hình học mờ ảo.

Cấu trúc: * Một khối vuông bo góc 24px cho ảnh bìa.

Hai dòng chữ nhật hẹp với chiều dài khác nhau bên dưới cho tên bài hát và nghệ sĩ.

Hiệu ứng: Sử dụng animate-pulse kết hợp với gradient di chuyển từ trái sang phải (shimmer).

CSS:

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
}


3. Premium Dropdown List (Glassmorphism)

Chỉnh lại các menu thả xuống (ví dụ: Sort, Filter, hoặc User Menu).

Thiết kế: * Nền: rgba(255, 255, 255, 0.8) kết hợp backdrop-blur-xl.

Bo góc: 16px.

Border: 1px solid rgba(255, 255, 255, 0.3).

Shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1).

Animation: Khi mở, menu phải "bung" ra nhẹ nhàng từ trên xuống với transform: translateY(10px) và opacity: 0 chuyển sang trạng thái mặc định.

4. Interactive Pointers & Hover States

Cursor: Mọi phần tử tương tác (Card, Button, Chip, Tab, Dropdown Item) phải có cursor: pointer.

Tab/Menu Hover: * Thay vì đổi màu chữ thô kệch, hãy dùng một lớp nền mờ (bg-slate-100/50) bo tròn nhẹ hiện lên phía sau chữ khi hover.

Active Tab: Có một thanh chỉ báo (indicator) mỏng màu Indigo phía dưới, bo tròn hai đầu.

Button Feedback: Khi nhấn (:active), nút phải thu nhỏ nhẹ (scale-95) để mô phỏng cảm giác nhấn vật lý.

5. Modern Loading Overlay (Page Level)

Khi chuyển đổi giữa Library và Search, nếu dữ liệu chưa sẵn sàng, hiển thị một thanh tiến trình (Progress Bar) siêu mỏng (2px) chạy ở sát mép dưới Header (giống trình duyệt Safari hoặc YouTube).

6. Hướng dẫn thực thi cho Agent (Cursor/Copilot)

Logic hiển thị Skeleton:

"Khi hàm search được gọi, hãy render ngay lập tức 12 thẻ .music-card giả lập với class .skeleton. Chỉ ẩn chúng đi và thay thế bằng dữ liệu thật sau khi iTunes API trả về kết quả thành công."

CSS cho Dropdown mượt mà:

.dropdown-menu {
  transform-origin: top;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  visibility: hidden;
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}
.dropdown-container:hover .dropdown-menu {
  visibility: visible;
  opacity: 1;
  transform: translateY(0) scale(1);
}


Chỉ báo Tab (Active Indicator):

"Đảm bảo các Tab có position: relative. Phần tử line phía dưới phải sử dụng layoutId (nếu dùng thư viện animation) hoặc đơn giản là một span tuyệt đối để có thể di chuyển mượt mà giữa các tab."