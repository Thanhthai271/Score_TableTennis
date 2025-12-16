// script.js (HOÀN CHỈNH)

const API_BASE_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    fetchRankings();

    // Logic Ẩn/Hiện Form Thêm VĐV
    const toggleButton = document.getElementById('toggleAddPlayerForm');
    const formContainer = document.getElementById('addPlayerFormContainer');
    const cancelButton = document.getElementById('cancelAddPlayer');

    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            formContainer.style.display = 'block';
            toggleButton.style.display = 'none';
        });
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            formContainer.style.display = 'none';
            toggleButton.style.display = 'block';
            document.getElementById('addPlayerForm').reset();
        });
    }

    // Gắn sự kiện Form
    const addForm = document.getElementById('addPlayerForm');
    if (addForm) {
        addForm.addEventListener('submit', handleAddPlayer);
    }

    const updateForm = document.getElementById('updateMatchForm');
    if (updateForm) {
        updateForm.addEventListener('submit', handleUpdateMatch);
    }

    // Gắn sự kiện cho các nút "Sửa" và "Xóa"
    document.getElementById('rankingBody').addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const playerId = e.target.dataset.id;
            const playerName = e.target.dataset.name;
            handleEditPlayer(playerId, playerName);
        } else if (e.target.classList.contains('delete-btn')) {
            const playerName = e.target.dataset.name;
            handleDeletePlayer(playerName);
        }
    });
});

// --- PHẦN HỖ TRỢ CHUNG ---

function displayMessage(message, type = 'success', duration = 3000) {
    const messageBox = document.getElementById('messageBox');
    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`;
    messageBox.style.display = 'block';

    setTimeout(() => {
        messageBox.style.display = 'none';
    }, duration);
}

// --- HÀM GỢI Ý TÊN VĐV ---

function populatePlayerNames(data) {
    const dataList = document.getElementById('playerNames');
    if (!dataList) return;
    dataList.innerHTML = '';

    data.forEach(player => {
        const option = document.createElement('option');
        option.value = player.name;
        dataList.appendChild(option);
    });
}

// --- 1. TẠO NGƯỜI CHƠI (CREATE) ---

async function handleAddPlayer(event) {
    event.preventDefault();

    const name = document.getElementById('newPlayerName').value.trim();
    const points = parseInt(document.getElementById('newPlayerPoints').value);
    const phoneNumber = document.getElementById('newPlayerPhone').value.trim();

    if (!name || isNaN(points) || points < 0) {
        displayMessage("Vui lòng nhập Tên và Tổng Điểm (>= 0) hợp lệ.", 'error');
        return;
    }

    const playerData = {
        name: name,
        total_points: points,
        phone_number: phoneNumber
    };

    try {
        const response = await fetch(`${API_BASE_URL}/scores/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(playerData)
        });

        const result = await response.json();

        if (response.ok) {
            displayMessage(result.message, 'success');
            document.getElementById('addPlayerForm').reset();
            document.getElementById('addPlayerFormContainer').style.display = 'none';
            document.getElementById('toggleAddPlayerForm').style.display = 'block';
            fetchRankings();
        } else {
            displayMessage(`Lỗi (${response.status}): ${result.message || 'Lỗi không xác định từ Server'}`, 'error');
        }

    } catch (error) {
        displayMessage(`Lỗi kết nối hoặc xử lý dữ liệu: ${error.message}`, 'error');
    }
}

// --- 2. TẢI BẢNG XẾP HẠNG (READ) ---

async function fetchRankings() {
    try {
        const response = await fetch(`${API_BASE_URL}/scores`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const rankings = await response.json();
        renderRankings(rankings);
        populatePlayerNames(rankings);

    } catch (error) {
        console.error("Lỗi khi fetch rankings:", error);
        displayMessage("Không thể kết nối tới API xếp hạng. Vui lòng kiểm tra Server.", 'error');
    }
}

function renderRankings(data) {
    const tbody = document.getElementById('rankingBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">Chưa có người chơi nào.</td></tr>';
        return;
    }

    data.forEach((player, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${player.name}</td>
            <td>${player.rank}</td>
            <td>${player.total_points}</td>
            <td>${player.phone_number || 'N/A'}</td> 
            <td>
                <button class="edit-btn btn-sm btn-primary" data-id="${player._id}" data-name="${player.name}">Sửa</button>
                <button class="delete-btn btn-sm btn-danger" data-name="${player.name}">Xóa</button>
            </td>
        `;
    });
}

// --- 3. CẬP NHẬT TRẬN ĐẤU (UPDATE) ---

async function handleUpdateMatch(event) {
    event.preventDefault();

    const p1_name = document.getElementById('p1Name').value.trim();
    const p2_name = document.getElementById('p2Name').value.trim();
    const set1 = parseInt(document.getElementById('set1').value);
    const set2 = parseInt(document.getElementById('set2').value);

    if (!p1_name || !p2_name || isNaN(set1) || isNaN(set2)) {
        displayMessage("Vui lòng nhập tên người chơi và tỷ số hợp lệ.", 'error');
        return;
    }

    // Kiểm tra tính hợp lệ của tỷ số trên Front-end
    const isWin = (set1 === 3 && set2 < 3 && set2 >= 0) || (set2 === 3 && set1 < 3 && set1 >= 0);

    if (!isWin) {
        displayMessage("Tỷ số set phải là 3-0, 3-1, 3-2, 0-3, 1-3, hoặc 2-3.", 'error');
        return;
    }

    const matchData = { p1_name, p2_name, set1, set2 };

    try {
        const response = await fetch(`${API_BASE_URL}/scores/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(matchData)
        });

        const result = await response.json();

        if (response.ok) {
            displayMessage(`Cập nhật thành công! ${p1_name}: ${result.p1_update.points} điểm, ${p2_name}: ${result.p2_update.points} điểm.`, 'success');
            document.getElementById('updateMatchForm').reset();
            document.getElementById('set1').value = '3';
            document.getElementById('set2').value = '0';
            fetchRankings();
        } else {
            displayMessage(`Lỗi cập nhật: ${result.message}`, 'error');
        }

    } catch (error) {
        displayMessage("Lỗi kết nối Server khi cập nhật trận đấu.", 'error');
    }
}

// --- 4. HÀM SỬA CHI TIẾT NGƯỜI CHƠI (EDIT/PATCH) ---

async function handleEditPlayer(id, name) {
    try {
        // Lấy thông tin người chơi theo ID (Sử dụng GET /id/:id)
        const response = await fetch(`${API_BASE_URL}/scores/id/${id}`);
        if (!response.ok) throw new Error("Không thể lấy dữ liệu người chơi.");

        const player = await response.json();

        // Sử dụng Prompt để đơn giản hóa việc sửa
        const newName = prompt(`Sửa Tên (${name}):`, player.name);
        if (newName === null) return;

        const newPointsInput = prompt(`Sửa Tổng Điểm (${player.total_points}):`, player.total_points);
        if (newPointsInput === null) return;
        const newPoints = parseInt(newPointsInput);

        const newPhone = prompt(`Sửa SĐT (${player.phone_number || 'N/A'}):`, player.phone_number || '');
        if (newPhone === null) return;

        if (isNaN(newPoints) || newPoints < 0) {
            displayMessage("Điểm nhập vào không hợp lệ.", 'error');
            return;
        }

        const updateData = {
            name: newName.trim(),
            total_points: newPoints,
            phone_number: newPhone.trim()
        };

        // Gửi yêu cầu PATCH để cập nhật (Sử dụng PATCH /id/:id)
        const updateResponse = await fetch(`${API_BASE_URL}/scores/id/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        const result = await updateResponse.json();

        if (updateResponse.ok) {
            displayMessage(result.message, 'success');
            fetchRankings();
        } else {
            displayMessage(`Lỗi cập nhật: ${result.message}`, 'error');
        }

    } catch (error) {
        console.error("Lỗi khi sửa chi tiết người chơi:", error);
        displayMessage(`Lỗi xử lý khi sửa thông tin người chơi: ${error.message || ''}`, 'error');
    }
}

// --- 5. HÀM XÓA NGƯỜI CHƠI (DELETE) ---

async function handleDeletePlayer(name) {
    if (!confirm(`Bạn có chắc chắn muốn xóa người chơi "${name}"?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/scores/delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name })
        });

        const result = await response.json();

        if (response.ok) {
            displayMessage(result.message, 'success');
            fetchRankings();
        } else {
            displayMessage(`Lỗi xóa: ${result.message}`, 'error');
        }

    } catch (error) {
        displayMessage("Lỗi kết nối Server khi xóa người chơi.", 'error');
    }
}

// index.js (Thêm vào cuối file, hoặc trong hàm initializeEvents)

const exportReportBtn = document.getElementById('exportReportBtn');
const rankingTableContainer = document.querySelector('.ranking-table-container'); // Container chứa bảng

exportReportBtn.addEventListener('click', () => {
    // 1. Tạo một bản sao của bảng xếp hạng
    const element = rankingTableContainer.cloneNode(true);
    
    // 2. Tùy chỉnh (Xóa cột "Thao tác" và các nút)
    const headers = element.querySelectorAll('th');
    const rows = element.querySelectorAll('tr');

    // Tìm và ẩn cột "Thao tác" (cột cuối cùng)
    // Lưu ý: Nếu cột Thao tác không phải là cột cuối cùng, bạn cần thay đổi logic này
    headers[headers.length - 1].style.display = 'none';

    rows.forEach(row => {
        // Ẩn ô cuối cùng (chứa nút)
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
            cells[cells.length - 1].style.display = 'none';
        }
        
        // Đảm bảo không có form ẩn nào (như form sửa) bị xuất ra
        row.querySelector('.edit-form')?.remove();
    });

    // 3. Cấu hình và tạo PDF
    const options = {
        margin: 10,
        filename: 'BaoCao_XepHang_BongBan.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Tạo PDF và tải xuống
    html2pdf().set(options).from(element).save();
    
    // Thông báo cho người dùng
    showMessage('Đang tạo và tải xuống báo cáo PDF...', 'success', 3000);
});