# S13 - Booking Concurrency Service Requirement Specification

## 1. User Story
Là một khách hàng đặt phòng/vé xem phim thời gian thực, tôi muốn hệ thống đảm bảo giữ chỗ tạm thời trong 10 phút và ngăn chặn tuyệt đối tình trạng đặt trùng lặp (Double Booking / Race Condition) khi nhiều người dùng cùng thao tác đồng thời vào một khung giờ.

---

## 2. Business Rules (Quy tắc nghiệp vụ)

1. **Khung thời gian hợp lệ**:
   - `startTime` phải diễn ra trước `endTime`.
   - `startTime` không được diễn ra trong quá khứ so với thời điểm hiện tại (`now`).
   - Nếu vi phạm, ném ngoại lệ `InvalidBookingTimeException`.
2. **Kiểm soát tương tranh phân tán (Distributed Concurrency Control)**:
   - Trước khi kiểm tra trùng lịch và giữ chỗ trên một tài nguyên (`resourceId`), hệ thống bắt buộc phải thu được khóa phân tán (`IDistributedLock.acquireLock`) với thời gian khóa an toàn.
   - Nếu không lấy được khóa (do đang có phiên xử lý khác tranh chấp cùng tài nguyên), ném `LockAcquisitionException`. Khóa phải luôn được giải phóng (`releaseLock`) trong khối `finally`.
3. **Phát hiện trùng lịch (Conflict Overlap Detection)**:
   - Một khung giờ bị xem là xung đột nếu có bất kỳ đơn đặt chỗ nào khác trên cùng `resourceId` đang ở trạng thái:
     - `CONFIRMED`, hoặc
     - `HELD` và thời gian giữ chỗ (`heldUntil`) còn hiệu lực (`heldUntil > now`).
   - Hai khoảng thời gian `[S1, E1]` và `[S2, E2]` bị trùng khi: `S1 < E2` và `E1 > S2`.
   - Khi phát hiện trùng lịch, ném ngoại lệ `ResourceAlreadyBookedException`.
4. **Cơ chế giữ chỗ tạm thời (Hold Mechanism)**:
   - Khi thỏa mãn, hệ thống tạo bản ghi đặt chỗ với trạng thái `"HELD"` và thời gian hết hạn giữ chỗ `heldUntil = now + 10 phút`.
5. **Xác nhận thanh toán (Confirm Booking)**:
   - Chỉ người dùng tạo phiên giữ chỗ (`userId`) mới có quyền xác nhận đơn đặt.
   - Nếu đơn đặt đã chuyển sang `"CONFIRMED"`, trả về kết quả thành công (Idempotency).
   - Nếu đơn đặt không ở trạng thái `"HELD"` hoặc thời hạn `heldUntil` đã trôi qua so với `now`, đơn hàng bị đánh dấu `"EXPIRED"` và ném `BookingExpiredException`.

---

## 3. Acceptance Criteria (Gherkin Format)

### Scenario 1: Giữ chỗ thành công trong khung giờ còn trống
- **Given**: Phòng họp `"ROOM-101"` hoàn toàn trống từ `14:00` đến `16:00`.
- **When**: Người dùng `"USR-1"` gửi yêu cầu `holdSlot("ROOM-101", "USR-1", 14:00, 16:00, 200)`.
- **Then**: 
  - Khóa phân tán được thu thập và giải phóng đúng quy trình.
  - Trạng thái trả về là `"HELD"`.
  - `heldUntil` được đặt chính xác sau thời điểm hiện tại 10 phút.

### Scenario 2: Từ chối giữ chỗ do tranh chấp khóa phân tán (Lock conflict)
- **Given**: Khóa phân tán của tài nguyên `"ROOM-101"` đang bị chiếm giữ bởi request khác.
- **When**: Gọi `holdSlot("ROOM-101", "USR-2", 14:00, 16:00, 200)`.
- **Then**: Hệ thống ném `LockAcquisitionException`.

### Scenario 3: Từ chối khi trùng lịch với suất đã xác nhận hoặc đang giữ chỗ
- **Given**: Suất `14:00 - 15:00` đã được xác nhận `"CONFIRMED"`.
- **When**: Người dùng yêu cầu giữ chỗ từ `14:30 - 16:00`.
- **Then**: Hệ thống ném ngoại lệ `ResourceAlreadyBookedException`.

### Scenario 4: Xác nhận đặt chỗ thành công trong thời hạn giữ chỗ
- **Given**: Đơn đặt chỗ `"BK-001"` đang ở trạng thái `"HELD"` và chưa quá 10 phút.
- **When**: Người dùng hợp lệ gọi `confirmBooking("BK-001", "USR-1")`.
- **Then**: Đơn đặt chuyển sang trạng thái `"CONFIRMED"`.

### Scenario 5: Hết hạn giữ chỗ 10 phút bị từ chối xác nhận
- **Given**: Đơn đặt chỗ `"BK-002"` ở trạng thái `"HELD"` nhưng thời điểm gọi đã vượt qua `heldUntil`.
- **When**: Gọi `confirmBooking("BK-002", "USR-1")`.
- **Then**: Đơn bị cập nhật `"EXPIRED"` và ném `BookingExpiredException`.
