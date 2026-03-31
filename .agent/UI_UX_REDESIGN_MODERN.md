
Behavior: Header sẽ cuộn theo nội dung trang (Scroll with Page) thay vì cố định (Fixed) hoặc ẩn/hiện thông minh.

Sử dụng class absolute top-0 hoặc để mặc định trong luồng tài liệu (Static/Relative) nếu muốn nó biến mất hoàn toàn khi 
kéo xuống.

Nếu muốn Header "dính" nhưng vẫn cuộn đi một phần, có thể dùng sticky top-0 nhưng không thêm logic JS ẩn hiện.

Layout:

Search Bar: Hình viên thuốc (Pill-shaped), nằm ở trung tâm. Khi focus, thêm hiệu ứng ring-2 ring-indigo-400 và đổ bóng 
shadow-lg.

Layout: Thay đổi từ dạng "viên thuốc" lơ lửng sang Full-width.

Style: * w-full (100% chiều ngang).

Nền trắng bg-white/80 kết hợp backdrop-blur-md.

Một đường viền dưới siêu mảnh border-b border-slate-100.

Search Bar: Giữ pill-shaped nhưng căn chỉnh hài hòa với các nút "Thư viện", "Khám phá".

6. Micro-interactions & Instructions for Agent

Header Behavior: Loại bỏ hoàn toàn logic lastScroll và translateY. Sử dụng các class CSS chuẩn để Header đi theo luồng cuộn của trang.

Button Icons: Sử dụng thư viện Lucide-React. Logic: isPlaying && currentTrack === trackId ? <PauseIcon /> : <PlayIcon />.

Skeleton Loading: Hiệu ứng làm mờ (shimmer) cho toàn bộ danh sách bài hát trong khi chờ dữ liệu từ iTunes API.

Tailwind CSS: Tận dụng tối đa các class transition-all, duration-300, ease-out.