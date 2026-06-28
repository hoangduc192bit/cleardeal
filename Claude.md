# Claude (ArcStream)

Tài liệu ngắn mô tả việc tích hợp và sử dụng Claude trong dự án ArcStream.

## Mục đích
- Ghi lại vai trò, phạm vi và các điểm tích hợp chính của Claude trong ArcStream.

## Vị trí liên quan
- Thư mục agent: `agents/` — chứa các agent thực thi (ví dụ: `research-agent.ts`, `price-agent.ts`).
- Helpers/SDK: `lib/` và `app/api/` — các helper, client và route liên quan.

## Hướng dẫn tích hợp nhanh
1. Kiểm tra agent cụ thể trong `agents/` để hiểu contract và luồng dữ liệu.
2. Nếu cần gọi Claude như service ngoài, cấu hình endpoint và khóa (nếu có) trong biến môi trường.
3. Sử dụng các helper trong `lib/` để chuẩn hóa request/response và metering.

## Ví dụ cấu hình (mẫu)
- ENV (ví dụ):
  - `CLAUDE_API_URL` — URL endpoint của Claude (nếu áp dụng)
  - `CLAUDE_API_KEY` — Khóa truy cập (nếu cần)

## Lưu ý vận hành
- Ghi logs cho mỗi interaction để dễ debug và kiểm toán.
- Giới hạn tần suất gọi (rate-limit) và tính toán chi phí nếu dùng dịch vụ trả phí.

## Cập nhật
Cập nhật tệp này khi thay đổi cách tích hợp, credential, hoặc luồng dữ liệu giữa agents và Claude.
