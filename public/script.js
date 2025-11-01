document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const playerBar = document.getElementById('player-bar');
    const navItems = document.querySelectorAll('.nav-item');
    const contentArea = document.getElementById('content-area');
    const topBarTitle = document.getElementById('top-bar-title');
    const backBtn = document.getElementById('back-btn');
    const topBarActions = document.getElementById('top-bar-actions');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const searchMode = document.getElementById('search-mode');
    const selectAllBtn = document.getElementById('select-all-btn');
    const downloadAllBtn = document.getElementById('download-all-btn');
    const downloadSelectedBtn = document.getElementById('download-selected-btn');
    const downloadModal = document.getElementById('download-modal');
    const downloadModalClose = document.getElementById('download-modal-close');
    const downloadCancelBtn = document.getElementById('download-cancel-btn');
    const downloadConfirmBtn = document.getElementById('download-confirm-btn');
    const qualityOptionsContainer = document.getElementById('quality-options');
    const progressContainer = document.getElementById('progress-container');
    const progressTitle = document.getElementById('progress-title');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const downloadSongName = document.getElementById('download-song-name');
    const downloadArtistName = document.getElementById('download-artist-name');
    const downloadAlbumName = document.getElementById('download-album-name');
    const downloadFileName = document.getElementById('download-file-name');
    const downloadDetailsFormSong = document.getElementById('download-details-form-song');
    const downloadDetailsFormArtist = document.getElementById('download-details-form-artist');
    const downloadDetailsFormAlbum = document.getElementById('download-details-form-album');
    const downloadDetailsFormFile = document.getElementById('download-details-form-file');
    const topBar = document.getElementById('top-bar');
    const previewModal = document.getElementById('preview-modal');
    const previewModalClose = document.getElementById('preview-modal-close');
    const previewCancelBtn = document.getElementById('preview-cancel-btn');
    const previewConfirmBtn = document.getElementById('preview-confirm-btn');
    const previewQualityOptionsContainer = document.getElementById('preview-quality-options');

    let currentPage = 'search';
    let selectedQuality = 10;
    let selectedPreviewQuality = 10;
    let downloadList = [];
    let searchResults = [];
    let currentView = 'search';
    let currentKeyword = '';
    let currentType = '1';
    let currentPlaylistId = null;
    let currentAlbumId = null;
    let currentPlaylistName = '';
    let currentAlbumName = '';
    let historyStack = [];
    let itemsPerPage = 100;
    let currentPageNum = 1;
    let totalItems = 0;
    let selectedSongs = new Set();
    let addConcurrency = 5;
    let downloadConcurrency = 3;
    let retryCount = 5;
    let themeColor = '#ff6b35';
    let currentAudio = null;
    let currentPreviewItem = null;
    let downloadSource = 'netease';

    const qqQualities = [
        {id: 1, name: '有损'},
        {id: 4, name: '标准'},
        {id: 8, name: 'HQ'},
        {id: 9, name: 'HQ增强'},
        {id: 10, name: 'SQ无损'},
        {id: 11, name: 'Hi-Res'},
        {id: 12, name: '杜比全景声'},
        {id: 13, name: '臻品全景声'},
        {id: 14, name: '高清母带'},
        {id: 15, name: 'AI伴唱模式'},
        {id: 16, name: 'AI5.1'}
    ];

    const neteaseQualities = [
        {id: 1, name: '标准（64k）'},
        {id: 2, name: '标准（128k）'},
        {id: 3, name: 'HQ极高（192k）'},
        {id: 4, name: 'HQ极高（320k）'},
        {id: 5, name: 'SQ无损'},
        {id: 6, name: 'Hi-Res'},
        {id: 7, name: '高清臻音'},
        {id: 8, name: '沉浸环绕声'},
        {id: 9, name: '超清母带'}
    ];

    async function withRetry(asyncFn, maxRetries = retryCount) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await asyncFn();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            currentPage = this.dataset.page;
            updateContent();
            history.replaceState(null, '', `?page=${currentPage}`);
        });
    });

    function updateContent() {
        topBarActions.classList.remove('hidden');
        backBtn.classList.add('hidden');
        contentArea.classList.add('fade-out');
        historyStack = [];
        currentView = currentPage;
        currentPlaylistId = null;
        currentAlbumId = null;
        currentPageNum = 1;
        selectedSongs.clear();
        if (currentPage === 'downloads' || currentPage === 'settings' || currentPage === 'about') {
            topBar.classList.add('hidden');
        } else {
            topBar.classList.remove('hidden');
        }
        topBarTitle.textContent = currentPage === 'search' ? '搜索音乐' : currentPage === 'downloads' ? '下载列表' : '设置';
        
        setTimeout(() => {
            if (currentPage === 'search') {
                contentArea.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">
                            <i class="fas fa-music"></i>
                        </div>
                        <div class="empty-text">搜索音乐开始使用</div>
                    </div>
                `;
            } else if (currentPage === 'downloads') {
                contentArea.innerHTML = `
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-bold">下载列表</h2>
                        <div>
                            <button class="btn btn-primary mr-2" id="download-all-list-btn">下载全部</button>
                            <button class="btn btn-secondary" id="clear-all-btn">清空全部</button>
                        </div>
                    </div>
                    <div id="download-list-container"></div>
                `;
                renderDownloadList();
                
                document.getElementById('download-all-list-btn').addEventListener('click', downloadAllFromList);
                document.getElementById('clear-all-btn').addEventListener('click', clearDownloadList);
            } else if (currentPage === 'settings') {
                contentArea.innerHTML = `
                    <div class="form-group">
                        <div class="form-label">下载源</div>
                        <select id="download-source-select" class="form-select">
                            <option value="qq">QQ音乐</option>
                            <option value="netease">网易云音乐</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <div class="form-label">下载列表添加请求并发数 (1-15)</div>
                        <div class="custom-slider" id="add-concurrency-slider">
                            <div class="custom-slider-fill" style="width: ${((addConcurrency - 1) / 14) * 100}%"></div>
                            <div class="custom-slider-thumb" style="left: ${((addConcurrency - 1) / 14) * 100}%"></div>
                        </div>
                        <span id="add-concurrency-value">${addConcurrency}</span>
                    </div>
                    <div class="form-group">
                        <div class="form-label">下载并发数 (1-10)</div>
                        <div class="custom-slider" id="download-concurrency-slider">
                            <div class="custom-slider-fill" style="width: ${((downloadConcurrency - 1) / 9) * 100}%"></div>
                            <div class="custom-slider-thumb" style="left: ${((downloadConcurrency - 1) / 9) * 100}%"></div>
                        </div>
                        <span id="download-concurrency-value">${downloadConcurrency}</span>
                    </div>
                    <div class="form-group">
                        <div class="form-label">错误重试次数 (2-10)</div>
                        <div class="custom-slider" id="retry-count-slider">
                            <div class="custom-slider-fill" style="width: ${((retryCount - 2) / 8) * 100}%"></div>
                            <div class="custom-slider-thumb" style="left: ${((retryCount - 2) / 8) * 100}%"></div>
                        </div>
                        <span id="retry-count-value">${retryCount}</span>
                    </div>
                    <div class="form-group">
                        <div class="form-label">主题色设置</div>
                        <div class="custom-color-picker" id="theme-color-picker">
                            <div class="custom-color-thumb" style="left: ${getColorPosition(themeColor)}%"></div>
                        </div>
                    </div>
                    <div class="form-group">
                        <div class="form-label">每页显示的数量 (20-250)</div>
                        <div class="custom-slider" id="items-per-page-slider">
                            <div class="custom-slider-fill" style="width: ${((itemsPerPage - 20) / 230) * 100}%"></div>
                            <div class="custom-slider-thumb" style="left: ${((itemsPerPage - 20) / 230) * 100}%"></div>
                        </div>
                        <span id="items-per-page-value">${itemsPerPage}</span>
                    </div>
                `;
                setupSliders();
                setupColorPicker();
                setupDownloadSource();
            } else if (currentPage === 'about') {
				contentArea.innerHTML = `
					<div class="flex flex-col items-start justify-center h-full p-6" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
						<h2 class="text-2xl font-semibold mb-6 text-black">关于</h2>
						<div class="space-y-4 text-base text-black">
							<p>
								<span>开发：</span>
								<a href="https://enashpinal.pages.dev" target="_blank" class="text-blue-600 hover:underline">Enashpinal</a>
							</p>
							<p>
								<span>搜索源：</span>
								<a href="https://neteasecloudmusicapi.js.org/" target="_blank" class="text-blue-600 hover:underline">网易云音乐 Node.js 版 API</a>
							</p>
							<p>
								<span>下载源：</span>
								<span>QQ音乐 / 网易云音乐</span>
							</p>
							<p>
								<span>Github：</span>
								<a href="https://github.com/Enashpinal/cloudmusic_downloader/" target="_blank" class="text-blue-600 hover:underline">Enashpinal/cloudmusic_downloader</a>
							</p>
							<p>
								<span>网站仅用于学习技术 请勿用于商业或非法用途！<br>
								QQ下载源可能出现少数歌曲搜索源和下载源不一致的情况。<br>
								</span>

							</p>
						</div>
					</div>
				`;
			}
            contentArea.classList.remove('fade-out');
        }, 150);
    }

    function setupSliders() {
        const addSlider = document.getElementById('add-concurrency-slider');
        const addValue = document.getElementById('add-concurrency-value');
        const downloadSlider = document.getElementById('download-concurrency-slider');
        const downloadValue = document.getElementById('download-concurrency-value');
        const retrySlider = document.getElementById('retry-count-slider');
        const retryValue = document.getElementById('retry-count-value');
        const itemsSlider = document.getElementById('items-per-page-slider');
        const itemsValue = document.getElementById('items-per-page-value');

        function createSliderHandler(slider, valueEl, min, max, current) {
            const thumb = slider.querySelector('.custom-slider-thumb');
            const fill = slider.querySelector('.custom-slider-fill');
            let isDragging = false;

            function updatePosition(x) {
                const rect = slider.getBoundingClientRect();
                let pos = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
                thumb.style.left = `${pos * 100}%`;
                fill.style.width = `${pos * 100}%`;
                let val = Math.round(min + pos * (max - min));
                valueEl.textContent = val;
                return val;
            }

            slider.addEventListener('mousedown', (e) => {
                isDragging = true;
                updatePosition(e.clientX);
            });

            document.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    updatePosition(e.clientX);
                }
            });

            document.addEventListener('mouseup', (e) => {
                if (isDragging) {
                    isDragging = false;
                    const val = updatePosition(e.clientX);
                    if (slider.id === 'add-concurrency-slider') addConcurrency = val;
                    if (slider.id === 'download-concurrency-slider') downloadConcurrency = val;
                    if (slider.id === 'retry-count-slider') retryCount = val;
                    if (slider.id === 'items-per-page-slider') itemsPerPage = val;
                    saveSettings();
                }
            });
        }

        createSliderHandler(addSlider, addValue, 1, 15, addConcurrency);
        createSliderHandler(downloadSlider, downloadValue, 1, 10, downloadConcurrency);
        createSliderHandler(retrySlider, retryValue, 2, 10, retryCount);
        createSliderHandler(itemsSlider, itemsValue, 20, 250, itemsPerPage);
    }

    function setupDownloadSource() {
        const select = document.getElementById('download-source-select');
        select.value = downloadSource;
        select.addEventListener('change', function() {
            downloadSource = this.value;
            saveSettings();
        });
    }

    function getColorPosition(color) {
        return 50;
    }

    function setupColorPicker() {
        const picker = document.getElementById('theme-color-picker');
        const thumb = picker.querySelector('.custom-color-thumb');
        let isDragging = false;

        function updatePosition(x) {
            const rect = picker.getBoundingClientRect();
            let pos = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
            thumb.style.left = `${pos * 100}%`;
            const color = getColorFromPosition(pos);
            document.documentElement.style.setProperty('--primary', color);
            document.documentElement.style.setProperty('--primary-dark', darkenColor(color, 0.9));
            document.documentElement.style.setProperty('--primary-light', lightenColor(color, 1.1));
            themeColor = color;
        }

        function getColorFromPosition(pos) {
            return `hsl(${pos * 360}, 100%, 50%)`;
        }

        function darkenColor(color, factor) {
            const hsl = rgbToHsl(hexToRgb(color));
            hsl[2] *= factor;
            return rgbToHex(hslToRgb(hsl));
        }

        function lightenColor(color, factor) {
            const hsl = rgbToHsl(hexToRgb(color));
            hsl[2] *= factor;
            return rgbToHex(hslToRgb(hsl));
        }

        function hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }

        function rgbToHex({r, g, b}) {
            return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        }

        function rgbToHsl({r, g, b}) {
            r /= 255, g /= 255, b /= 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;
            if (max === min) {
                h = s = 0;
            } else {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            return [h, s, l];
        }

        function hslToRgb([h, s, l]) {
            let r, g, b;
            if (s === 0) {
                r = g = b = l;
            } else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }
            return {r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255)};
        }

        picker.addEventListener('mousedown', (e) => {
            isDragging = true;
            updatePosition(e.clientX);
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                updatePosition(e.clientX);
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            saveSettings();
        });
    }

    function renderDownloadList() {
        const container = document.getElementById('download-list-container');
        
        if (downloadList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-download"></i>
                    </div>
                    <div class="empty-text">下载列表为空</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        downloadList.forEach((item, index) => {
            const downloadItem = document.createElement('div');
            downloadItem.className = 'download-item liquid-glass';
            downloadItem.innerHTML = `
                <img class="download-cover" src="${item.cover || 'https://via.placeholder.com/50'}" alt="封面">
                <div class="download-info">
                    <div class="download-title">${item.title}</div>
                    <div class="download-details">${item.artist} - ${item.album}</div>
                </div>
                <div class="edit-btn liquid-glass liquid-glass-hover" data-index="${index}">
                    <i class="fas fa-edit"></i>
                </div>
                <div class="delete-btn liquid-glass liquid-glass-hover" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </div>
            `;
            container.appendChild(downloadItem);
        });
        
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                editDownloadItem(index);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                removeDownloadItem(index);
            });
        });
    }

    function removeDownloadItem(index) {
        if (confirm('确定删除此项吗？')) {
            downloadList.splice(index, 1);
            saveDownloadList();
            renderDownloadList();
        }
    }

    function editDownloadItem(index) {
        const item = downloadList[index];
        downloadSongName.value = item.title;
        downloadArtistName.value = item.artist;
        downloadAlbumName.value = item.album;
        const extMatch = item.fileName.match(/\.[^/.]+$/);
        downloadFileName.value = item.fileName.replace(/\.[^/.]+$/, '');
        
        downloadDetailsFormSong.classList.remove('hidden');
        downloadDetailsFormArtist.classList.remove('hidden');
        downloadDetailsFormAlbum.classList.remove('hidden');
        downloadDetailsFormFile.classList.remove('hidden');
        downloadModal.classList.add('active');
        
        downloadConfirmBtn.onclick = function() {
            downloadList[index].title = downloadSongName.value;
            downloadList[index].artist = downloadArtistName.value;
            downloadList[index].album = downloadAlbumName.value;
            const ext = extMatch ? extMatch[0] : '.mp3';
            downloadList[index].fileName = downloadFileName.value + ext;
            
            saveDownloadList();
            renderDownloadList();
            downloadModal.classList.remove('active');
            hideDetailsForms();
        };
    }

    function getExtensionFromUrl(url) {
        try {
            const pathname = new URL(url).pathname;
            const filename = pathname.split('/').pop().split('?')[0];
            const parts = filename.split('.');
            if (parts.length > 1) {
                const ext = parts.pop();
                if (ext.length < 5 && ext.match(/^[a-z0-9]+$/i)) {
                    return '.' + ext;
                }
            }
        } catch (e) {}
        return '.mp3';
    }

    function saveDownloadList() {
        localStorage.setItem('downloadList', JSON.stringify(downloadList));
    }

    function loadDownloadList() {
        const saved = localStorage.getItem('downloadList');
        if (saved) {
            downloadList = JSON.parse(saved);
        }
    }

    function saveSettings() {
        localStorage.setItem('addConcurrency', addConcurrency);
        localStorage.setItem('downloadConcurrency', downloadConcurrency);
        localStorage.setItem('retryCount', retryCount);
        localStorage.setItem('themeColor', themeColor);
        localStorage.setItem('itemsPerPage', itemsPerPage);
        localStorage.setItem('downloadSource', downloadSource);
        localStorage.setItem('selectedQuality', selectedQuality);
        localStorage.setItem('selectedPreviewQuality', selectedPreviewQuality);
    }

    function loadSettings() {
        addConcurrency = parseInt(localStorage.getItem('addConcurrency')) || 5;
        downloadConcurrency = parseInt(localStorage.getItem('downloadConcurrency')) || 3;
        retryCount = parseInt(localStorage.getItem('retryCount')) || 5;
        themeColor = localStorage.getItem('themeColor') || '#ff6b35';
        itemsPerPage = parseInt(localStorage.getItem('itemsPerPage')) || 100;
        downloadSource = localStorage.getItem('downloadSource') || 'netease';
        selectedQuality = parseInt(localStorage.getItem('selectedQuality')) || 10;
        selectedPreviewQuality = parseInt(localStorage.getItem('selectedPreviewQuality')) || 10;
        document.documentElement.style.setProperty('--primary', themeColor);
        document.documentElement.style.setProperty('--primary-dark', darkenColor(themeColor, 0.9));
        document.documentElement.style.setProperty('--primary-light', lightenColor(themeColor, 1.1));
    }

    function clearDownloadList() {
        if (confirm('确定要清空下载列表吗？')) {
            downloadList = [];
            saveDownloadList();
            renderDownloadList();
        }
    }

    async function addID3Tags(blob, title, artist, album, coverUrl) {
        if (typeof ID3Writer === 'undefined') {
            return blob;
        }
        const arrayBuffer = await blob.arrayBuffer();
        const writer = new ID3Writer(arrayBuffer);
        writer.setFrame('TIT2', title);
        writer.setFrame('TPE1', [artist]);
        writer.setFrame('TALB', album);
        if (coverUrl) {
            try {
                const r = await fetch(coverUrl);
                const coverBlob = await r.blob();
                const coverArrayBuffer = await coverBlob.arrayBuffer();
                writer.setFrame('APIC', {
                    type: 3,
                    data: coverArrayBuffer,
                    description: 'Cover'
                });
            } catch (e) {}
        }
        writer.addTag();
        return writer.getBlob();
    }

    async function downloadAllFromList() {
        if (downloadList.length === 0) {
            alert('下载列表为空');
            return;
        }
        
        progressTitle.textContent = '正在缓存音频';
        progressContainer.classList.add('active');
        let cachedSize = 0;
        let cachedCount = 0;
        let currentSongName = '';
        let blobs = [];
        let errors = [];
        let erroredItems = [];

        async function fetchWithConcurrency(items, concurrency) {
            let index = 0;
            const results = new Array(items.length);

            const worker = async () => {
                while (index < items.length) {
                    const i = index++;
                    const item = items[i];
                    currentSongName = item.title;
                    try {
                        const proxyUrl = 'https://mscdownload.pages.dev/proxy?url=' + encodeURIComponent(item.url);
                        const response = await withRetry(() => fetch(proxyUrl), retryCount);
                        if (!response.ok) throw new Error('Network response was not ok');
                        let size = 0;
                        const reader = response.body.getReader();
                        let chunks = [];
                        while (true) {
                            const {done, value} = await reader.read();
                            if (done) break;
                            chunks.push(value);
                            size += value.length;
                            cachedSize += value.length / (1024 * 1024);
                            progressText.textContent = `已缓存: ${cachedSize.toFixed(2)} MB | 当前: ${currentSongName} | ${cachedCount}/${items.length}`;
                        }
                        let blob = new Blob(chunks);
                        let taggedBlob = blob;
                        const ext = getExtensionFromUrl(item.url);
                        if (ext === '.mp3') {
                            taggedBlob = await addID3Tags(blob, item.title, item.artist, item.album, item.cover);
                        }
                        results[i] = { blob: taggedBlob, item };
                        cachedCount++;
                    } catch (error) {}
                    progressText.textContent = `已缓存: ${cachedSize.toFixed(2)} MB | 当前: ${currentSongName} | ${cachedCount}/${items.length}`;
                }
            };

            await Promise.all(new Array(concurrency).fill(0).map(() => worker()));
            return results;
        }

        const results = await fetchWithConcurrency(downloadList, downloadConcurrency);
        blobs = results.filter(r => r);
        erroredItems = downloadList.filter((_, i) => !results[i]);

        await new Promise(resolve => setTimeout(resolve, 3000));

        for (const item of erroredItems) {
            progressTitle.textContent = `正在重试 ${item.title}`;
            currentSongName = item.title;
            try {
                const proxyUrl = 'https://mscdownload.pages.dev/proxy?url=' + encodeURIComponent(item.url);
                const response = await withRetry(() => fetch(proxyUrl), retryCount);
                if (!response.ok) throw new Error('Network response was not ok');
                let size = 0;
                const reader = response.body.getReader();
                let chunks = [];
                while (true) {
                    const {done, value} = await reader.read();
                    if (done) break;
                    chunks.push(value);
                    size += value.length;
                    cachedSize += value.length / (1024 * 1024);
                    progressText.textContent = `已缓存: ${cachedSize.toFixed(2)} MB | 当前: 重试 ${currentSongName} | ${cachedCount}/${downloadList.length}`;
                }
                let blob = new Blob(chunks);
                let taggedBlob = blob;
                const ext = getExtensionFromUrl(item.url);
                if (ext === '.mp3') {
                    taggedBlob = await addID3Tags(blob, item.title, item.artist, item.album, item.cover);
                }
                blobs.push({ blob: taggedBlob, item });
                cachedCount++;
            } catch (error) {
                errors.push(item.title);
            }
            progressText.textContent = `已缓存: ${cachedSize.toFixed(2)} MB | 当前: ${currentSongName} | ${cachedCount}/${downloadList.length}`;
        }

        if (errors.length > 0) {
            alert(`以下歌曲缓存失败: ${errors.join(', ')}`);
        }

        progressTitle.textContent = '正在打包ZIP';
        const zip = new JSZip();
        blobs.forEach(({ blob, item }) => {
            zip.file(item.fileName, blob);
        });
        
        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = '音乐下载.zip';
        link.click();
        
        setTimeout(() => {
            progressContainer.classList.remove('active');
            progressText.textContent = '0%';
        }, 1000);
    }

    searchBtn.addEventListener('click', performSearch);

    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    function performSearch() {
        const keyword = searchInput.value.trim();
        if (!keyword) {
            alert('请输入搜索关键词');
            return;
        }
        currentKeyword = keyword;
        currentType = searchMode.value;
        currentPageNum = 1;
        currentView = 'search';
        historyStack = [];
        backBtn.classList.add('hidden');
        if (currentType === 'playlist_id') {
            currentView = 'playlist';
            currentPlaylistId = keyword;
            loadPlaylistDetails(keyword, 1);
            history.replaceState(null, '', `?playlist=${keyword}`);
        } else if (currentType === 'album_id') {
            currentView = 'album';
            currentAlbumId = keyword;
            loadAlbumDetails(keyword, 1);
            history.replaceState(null, '', `?album=${keyword}`);
        } else {
            searchMusic(keyword, currentType, 1);
            history.replaceState(null, '', `?search=${encodeURIComponent(keyword)}&type=${currentType}`);
        }
    }

    async function searchMusic(keyword, type, page) {
        contentArea.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">正在搜索...</div>
            </div>
        `;
        
        const offset = (page - 1) * itemsPerPage;
        let url = `https://163api.qijieya.cn/cloudsearch?keywords=${encodeURIComponent(keyword)}&type=${type}&limit=${itemsPerPage}&offset=${offset}`;
        try {
            const response = await withRetry(() => fetch(url));
            const data = await response.json();
            searchResults = type === '1' ? data.result.songs : type === '10' ? data.result.albums : data.result.playlists;
            totalItems = type === '1' ? data.result.songCount : type === '10' ? data.result.albumCount : data.result.playlistCount;
            renderResults(searchResults, type === '1', totalItems);
        } catch (error) {
            contentArea.innerHTML = '<div class="empty-state"><div class="empty-text">搜索失败，请重试</div></div>';
        }
    }

    async function loadPlaylistDetails(id, page) {
        contentArea.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">正在加载歌单...</div>
            </div>
        `;
        
        if (page === 1) {
            try {
                const detailResponse = await withRetry(() => fetch(`https://163api.qijieya.cn/playlist/detail?id=${id}`));
                const detailData = await detailResponse.json();
                currentPlaylistName = detailData.playlist.name;
                totalItems = detailData.playlist.trackCount;
                topBarTitle.textContent = currentPlaylistName;
            } catch (error) {}
        }
        
        const offset = (page - 1) * itemsPerPage;
        try {
            const trackResponse = await withRetry(() => fetch(`https://163api.qijieya.cn/playlist/track/all?id=${id}&limit=${itemsPerPage}&offset=${offset}`));
            const trackData = await trackResponse.json();
            searchResults = trackData.songs;
            renderResults(searchResults, true, totalItems);
        } catch (error) {
            contentArea.innerHTML = '<div class="empty-state"><div class="empty-text">加载失败，请重试</div></div>';
        }
    }

    async function loadAlbumDetails(id, page) {
        contentArea.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">正在加载专辑...</div>
            </div>
        `;
        
        const offset = (page - 1) * itemsPerPage;
        try {
            const response = await withRetry(() => fetch(`https://163api.qijieya.cn/album?id=${id}`));
            const data = await response.json();
            searchResults = data.songs;
            currentAlbumName = data.album.name;
            topBarTitle.textContent = currentAlbumName;
            totalItems = searchResults.length;
            const paginatedResults = searchResults.slice(offset, offset + itemsPerPage);
            renderResults(paginatedResults, true, totalItems);
        } catch (error) {
            contentArea.innerHTML = '<div class="empty-state"><div class="empty-text">加载失败，请重试</div></div>';
        }
    }

    function renderResults(results, isSong, total) {
        contentArea.innerHTML = '';
        results.forEach((item, index) => {
            const songItem = document.createElement('div');
            songItem.className = 'song-item liquid-glass';
            songItem.dataset.index = index;
            const cover = item.picUrl || item.coverImgUrl || item.al?.picUrl || 'https://via.placeholder.com/50';
            const title = item.name || item.title;
            const artist = (item.ar?.map(a => a.name).join(', ') || item.artists?.map(a => a.name).join(', ') || item.artist || '') ;
            const album = item.al?.name || item.album;
            let actionsHtml = '';
            if (isSong) {
                actionsHtml = `
                    <div class="song-actions">
                        <div class="action-btn liquid-glass liquid-glass-hover add-to-download" data-index="${index}">
                            <i class="fas fa-list"></i>
                        </div>
                        <div class="action-btn liquid-glass liquid-glass-hover download-single" data-index="${index}">
                            <i class="fas fa-download"></i>
                        </div>
                        <div class="action-btn liquid-glass liquid-glass-hover preview-btn" data-index="${index}">
                            <svg data-slot="icon" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5V18M15 7.5V18M3 16.811V8.69c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061A1.125 1.125 0 0 1 3 16.811Z"></path>
                            </svg>
                        </div>
                    </div>
                `;
            }
            songItem.innerHTML = `
                <img class="song-cover" src="${cover}" alt="封面">
                <div class="song-info">
                    <div class="song-title">${title}</div>
                    <div class="song-artist">${artist}${album ? ` - ${album}` : ''}</div>
                </div>
                ${actionsHtml}
            `;
            contentArea.appendChild(songItem);

            if (!isSong) {
                songItem.addEventListener('dblclick', function() {
                    historyStack.push({view: currentView, keyword: currentKeyword, type: currentType, page: currentPageNum, title: topBarTitle.textContent});
                    backBtn.classList.remove('hidden');
                    currentPageNum = 1;
                    if (currentType === '1000') {
                        currentView = 'playlist';
                        currentPlaylistId = item.id;
                        loadPlaylistDetails(item.id, 1);
                        history.replaceState(null, '', `?playlist=${item.id}`);
                    } else if (currentType === '10') {
                        currentView = 'album';
                        currentAlbumId = item.id;
                        loadAlbumDetails(item.id, 1);
                        history.replaceState(null, '', `?album=${item.id}`);
                    }
                });
            } else {
                songItem.addEventListener('click', function(e) {
                    if (e.target.closest('.preview-progress')) return;
                    this.classList.toggle('selected');
                    const idx = parseInt(this.dataset.index);
                    if (selectedSongs.has(idx)) {
                        selectedSongs.delete(idx);
                    } else {
                        selectedSongs.add(idx);
                    }
                });
            }
        });
        
        const pagination = document.createElement('div');
        pagination.className = 'pagination';
        pagination.innerHTML = `
            <button class="pagination-btn ${currentPageNum === 1 ? 'disabled' : ''}" id="prev-page-btn">上一页</button>
            <span class="pagination-text">第 ${currentPageNum} 页 / 共 ${Math.ceil(totalItems / itemsPerPage)} 页</span>
            <button class="pagination-btn ${currentPageNum >= Math.ceil(totalItems / itemsPerPage) ? 'disabled' : ''}" id="next-page-btn">下一页</button>
        `;
        contentArea.appendChild(pagination);

        document.getElementById('prev-page-btn').addEventListener('click', function() {
            if (currentPageNum > 1) {
                currentPageNum--;
                loadCurrentView();
            }
        });

        document.getElementById('next-page-btn').addEventListener('click', function() {
            if (currentPageNum < Math.ceil(totalItems / itemsPerPage)) {
                currentPageNum++;
                loadCurrentView();
            }
        });

        if (isSong) {
            document.querySelectorAll('.add-to-download').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const index = parseInt(this.dataset.index);
                    addToDownloadList(index);
                });
            });
            
            document.querySelectorAll('.download-single').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const index = parseInt(this.dataset.index);
                    downloadSingle(index);
                });
            });

            document.querySelectorAll('.preview-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const index = parseInt(this.dataset.index);
                    handlePreview(index);
                });
            });
        }
    }

    function editDistance(s1, s2) {
        var costs = new Array();
        for (var i = 0; i <= s1.length; i++) {
            var lastValue = i;
            for (var j = 0; j <= s2.length; j++) {
                if (i == 0)
                    costs[j] = j;
                else {
                    if (j > 0) {
                        var newValue = costs[j - 1];
                        if (s1.charAt(i - 1) != s2.charAt(j - 1))
                            newValue = Math.min(Math.min(newValue, lastValue),
                                costs[j]) + 1;
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0)
                costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    }

    function similarity(s1, s2) {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();
        var longer = s1;
        var shorter = s2;
        if (s1.length < s2.length) {
            longer = s2;
            shorter = s1;
        }
        var longerLength = longer.length;
        if (longerLength == 0) {
            return 1.0;
        }
        return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
    }

    async function fetchAudioUrl(songName, artistsArray, albumName, quality, songId) {
        if (downloadSource === 'netease') {
            const getUrlFn = async () => {
                const getUrl = `https://api.vkeys.cn/v2/music/netease?id=${songId}&quality=${quality}`;
                const response = await fetch(getUrl);
                if (!response.ok) throw new Error('Get URL failed');
                const urlData = await response.json();
                if (urlData.code !== 200 || !urlData.data || !urlData.data.url) throw new Error('Invalid URL response');
                return urlData;
            };
            try {
                return await withRetry(getUrlFn, retryCount);
            } catch (error) {
                return null;
            }
        } else {
            const hasChinese = /[\u4e00-\u9fa5]/.test(songName);
            let word;
            if (hasChinese) {
                word = encodeURIComponent(songName);
            } else {
                const firstArtist = artistsArray[0] || '';
                word = encodeURIComponent(`${songName}`);
            }
            let selected = null;
            const searchFn = async () => {
                const url = `https://api.vkeys.cn/v2/music/tencent?word=${word}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error('Search failed');
                const apiData = await response.json();
                if (apiData.code !== 200 || !apiData.data) throw new Error('Invalid search response');
                return apiData.data;
            };
            let searchResults;
            try {
                searchResults = await withRetry(searchFn, retryCount);
            } catch (error) {
                return null;
            }
            if (searchResults.length === 0) return null;
            selected = searchResults.find(item => item.song === songName && item.album === albumName);
            if (selected) {
            } else {
                let exactMatches = searchResults.filter(item => item.song === songName && artistsArray.some(art => item.singer.includes(art)));
                if (exactMatches.length > 0) {
                    let albumMatches = exactMatches.filter(item => item.album === albumName);
                    selected = albumMatches.length > 0 ? albumMatches[0] : exactMatches[0];
                } else {
                    let filtered = searchResults.filter(item => artistsArray.some(art => item.singer.includes(art)));
                    filtered = filtered.filter(item => item.song.includes(songName));
                    if (filtered.length > 0) {
                        filtered.sort((a, b) => similarity(b.song, songName) - similarity(a.song, songName));
                        selected = filtered[0];
                    } else {
                        selected = searchResults[0];
                    }
                }
            }
            if (!selected) return null;
            const getUrlFn = async () => {
                const getUrl = `https://api.vkeys.cn/v2/music/tencent/geturl?id=${selected.id}&quality=${quality}`;
                const response = await fetch(getUrl);
                if (!response.ok) throw new Error('Get URL failed');
                const urlData = await response.json();
                if (urlData.code !== 200 || !urlData.data || !urlData.data.url) throw new Error('Invalid URL response');
                return urlData;
            };
            try {
                return await withRetry(getUrlFn, retryCount);
            } catch (error) {
                return null;
            }
        }
    }

    async function handlePreview(index) {
        const item = contentArea.querySelector(`.song-item[data-index="${index}"]`);
        if (currentPreviewItem === item) {
            stopPreview();
            return;
        }
        stopPreview();
        currentPreviewItem = item;
        renderPreviewQualityOptions();
        previewModal.classList.add('active');
        previewConfirmBtn.onclick = async function() {
            const selectedOpt = document.querySelector('#preview-quality-options .selected');
            if (selectedOpt) {
                selectedPreviewQuality = parseInt(selectedOpt.dataset.quality);
                saveSettings();
            }
            previewModal.classList.remove('active');
            const song = searchResults[index];
            let artistsArray = song.ar?.map(a => a.name) || song.artists?.map(a => a.name) || [song.artist || ''];
            let albumName = song.al?.name || song.album || '';
            const loading = document.createElement('div');
            loading.className = 'preview-loading';
            loading.innerHTML = '<div class="preview-spinner"></div>';
            item.appendChild(loading);
            let apiData = await fetchAudioUrl(song.name, artistsArray, albumName, selectedPreviewQuality, song.id);
            if (!apiData || !apiData.data || !apiData.data.url) {
                alert('获取音频链接失败');
                item.removeChild(loading);
                return;
            }
            currentAudio = new Audio('https://mscdownload.pages.dev/proxy?url=' + encodeURIComponent(apiData.data.url));
            currentAudio.addEventListener('loadeddata', () => {
                item.removeChild(loading);
                const progress = document.createElement('div');
                progress.className = 'preview-progress';
                progress.innerHTML = '<div class="preview-progress-bar"></div>';
                item.appendChild(progress);
                currentAudio.play();
                currentAudio.addEventListener('timeupdate', updatePreviewProgress);
                progress.addEventListener('click', seekPreview);
            });
            currentAudio.addEventListener('error', () => {
                alert('加载预览失败');
                item.removeChild(loading);
            });
        };
    }

    function updatePreviewProgress() {
        if (!currentPreviewItem) return;
        const bar = currentPreviewItem.querySelector('.preview-progress-bar');
        if (bar) {
            const percent = (currentAudio.currentTime / currentAudio.duration) * 100;
            bar.style.width = `${percent}%`;
        }
    }

    function seekPreview(e) {
        e.stopPropagation();
        if (!currentAudio) return;
        const progress = e.currentTarget;
        const rect = progress.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        currentAudio.currentTime = pos * currentAudio.duration;
    }

    function stopPreview() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.remove();
            currentAudio = null;
        }
        if (currentPreviewItem) {
            const progress = currentPreviewItem.querySelector('.preview-progress');
            if (progress) progress.remove();
            const loading = currentPreviewItem.querySelector('.preview-loading');
            if (loading) loading.remove();
            currentPreviewItem = null;
        }
    }

    function loadCurrentView() {
        selectedSongs.clear();
        stopPreview();
        if (currentView === 'search') {
            searchMusic(currentKeyword, currentType, currentPageNum);
        } else if (currentView === 'playlist') {
            loadPlaylistDetails(currentPlaylistId, currentPageNum);
        } else if (currentView === 'album') {
            loadAlbumDetails(currentAlbumId, currentPageNum);
        }
    }

    backBtn.addEventListener('click', function() {
        if (historyStack.length > 0) {
            const prev = historyStack.pop();
            currentView = prev.view;
            currentKeyword = prev.keyword;
            currentType = prev.type;
            currentPageNum = prev.page;
            topBarTitle.textContent = prev.title;
            if (historyStack.length === 0) {
                backBtn.classList.add('hidden');
            }
            loadCurrentView();
        }
    });

    selectAllBtn.addEventListener('click', function() {
        document.querySelectorAll('.song-item').forEach(item => {
            item.classList.add('selected');
            selectedSongs.add(parseInt(item.dataset.index));
        });
    });

    downloadAllBtn.addEventListener('click', function() {
        if (searchResults.length === 0) {
            alert('当前页面无歌曲');
            return;
        }
        showQualityModal('all');
    });

    downloadSelectedBtn.addEventListener('click', function() {
        if (selectedSongs.size === 0) {
            alert('未选择歌曲');
            return;
        }
        showQualityModal('selected');
    });

    function showQualityModal(mode) {
        hideDetailsForms();
        renderQualityOptions();
        downloadModal.classList.add('active');
        downloadConfirmBtn.onclick = function() {
            const selectedOpt = document.querySelector('#quality-options .selected');
            if (selectedOpt) {
                selectedQuality = parseInt(selectedOpt.dataset.quality);
                saveSettings();
            }
            const songsToAdd = mode === 'all' ? searchResults : searchResults.filter((_, idx) => selectedSongs.has(idx));
            addMultipleToDownloadList(songsToAdd, mode);
            downloadModal.classList.remove('active');
        };
    }

    function renderQualityOptions() {
        const qualities = downloadSource === 'netease' ? neteaseQualities : qqQualities;
        qualityOptionsContainer.innerHTML = qualities.map(q => `
            <div class="quality-option liquid-glass liquid-glass-hover ${q.id === selectedQuality ? 'selected' : ''}" data-quality="${q.id}">${q.name}</div>
        `).join('');
        document.querySelectorAll('#quality-options .quality-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('#quality-options .quality-option').forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
    }

    function renderPreviewQualityOptions() {
        const qualities = downloadSource === 'netease' ? neteaseQualities : qqQualities;
        previewQualityOptionsContainer.innerHTML = qualities.map(q => `
            <div class="quality-option liquid-glass liquid-glass-hover ${q.id === selectedPreviewQuality ? 'selected' : ''}" data-quality="${q.id}">${q.name}</div>
        `).join('');
        document.querySelectorAll('#preview-quality-options .quality-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('#preview-quality-options .quality-option').forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
    }

    async function addMultipleToDownloadList(songs, mode) {
        progressContainer.classList.add('active');
        let completed = 0;
        let currentSongName = '';
        let errors = [];
        let erroredSongs = [];

        async function fetchWithConcurrency(items, concurrency) {
            let index = 0;
            const results = new Array(items.length);

            const worker = async () => {
                while (index < items.length) {
                    const i = index++;
                    const song = items[i];
                    currentSongName = song.name;
                    progressTitle.textContent = `正在添加歌曲 ${currentSongName}`;
                    let artistsArray = song.ar?.map(a => a.name) || song.artists?.map(a => a.name) || [song.artist || ''];
                    let albumName = song.al?.name || song.album || '';
                    try {
                        const apiData = await fetchAudioUrl(song.name, artistsArray, albumName, selectedQuality, song.id);
                        if (apiData && apiData.data && apiData.data.url) {
                            const ext = getExtensionFromUrl(apiData.data.url);
                            results[i] = {
                                url: apiData.data.url,
                                title: song.name,
                                artist: artistsArray.join(', '),
                                album: apiData.data.album || albumName,
                                fileName: `${song.name} - ${artistsArray.join(', ')}${ext}`,
                                cover: `https://mscdownload.pages.dev/proxy?url=${encodeURIComponent(apiData.data.cover)}`
                            };
                        } else {
                            throw new Error();
                        }
                    } catch (error) {}
                    completed++;
                    const percent = Math.round((completed / items.length) * 100);
                    progressBar.style.width = percent + '%';
                    progressText.textContent = `${completed}/${songs.length}`;
                }
            };

            await Promise.all(new Array(concurrency).fill(0).map(() => worker()));
            return results;
        }

        const results = await fetchWithConcurrency(songs, addConcurrency);
        const newItems = results.filter(r => r);
        downloadList.push(...newItems);
        saveDownloadList();
        erroredSongs = songs.filter((_, i) => !results[i]);

        await new Promise(resolve => setTimeout(resolve, 3000));

        for (const song of erroredSongs) {
            progressTitle.textContent = `正在重试 ${song.name}`;
            currentSongName = song.name;
            let artistsArray = song.ar?.map(a => a.name) || song.artists?.map(a => a.name) || [song.artist || ''];
            let albumName = song.al?.name || song.album || '';
            let success = false;
            try {
                const apiData = await fetchAudioUrl(song.name, artistsArray, albumName, selectedQuality, song.id);
                if (apiData && apiData.data && apiData.data.url) {
                    const ext = getExtensionFromUrl(apiData.data.url);
                    downloadList.push({
                        url: apiData.data.url,
                        title: song.name,
                        artist: artistsArray.join(', '),
                        album: apiData.data.album || albumName,
                        fileName: `${song.name} - ${artistsArray.join(', ')}${ext}`,
                        cover: `https://mscdownload.pages.dev/proxy?url=${encodeURIComponent(apiData.data.cover)}`
                    });
                    success = true;
                } else {
                    throw new Error();
                }
            } catch (error) {}
            if (!success) {
                errors.push(song.name);
            }
            completed++;
            const percent = Math.round((completed / songs.length) * 100);
            progressBar.style.width = percent + '%';
            progressText.textContent = `${completed}/${songs.length}`;
        }
        saveDownloadList();

        if (errors.length > 0) {
            alert(`以下歌曲添加失败: ${errors.join(', ')}`);
        }

        setTimeout(() => {
            progressContainer.classList.remove('active');
            progressBar.style.width = '0%';
            progressText.textContent = '0%';
        }, 1000);
        alert('已添加到下载列表');
        selectedSongs.clear();
        document.querySelectorAll('.song-item').forEach(item => item.classList.remove('selected'));
    }

    function hideDetailsForms() {
        downloadDetailsFormSong.classList.add('hidden');
        downloadDetailsFormArtist.classList.add('hidden');
        downloadDetailsFormAlbum.classList.add('hidden');
        downloadDetailsFormFile.classList.add('hidden');
    }

    function addToDownloadList(index) {
        const song = searchResults[index];
        downloadSongName.value = song.name;
        downloadArtistName.value = song.ar?.map(a => a.name).join(', ') || song.artists?.map(a => a.name).join(', ') || song.artist || '';
        downloadAlbumName.value = song.al?.name || song.album;
        downloadFileName.value = `${song.name} - ${downloadArtistName.value}`;
        
        downloadDetailsFormSong.classList.remove('hidden');
        downloadDetailsFormArtist.classList.remove('hidden');
        downloadDetailsFormAlbum.classList.remove('hidden');
        downloadDetailsFormFile.classList.remove('hidden');
        renderQualityOptions();
        downloadModal.classList.add('active');
        
        downloadConfirmBtn.onclick = async function() {
            const selectedOpt = document.querySelector('#quality-options .selected');
            if (selectedOpt) {
                selectedQuality = parseInt(selectedOpt.dataset.quality);
                saveSettings();
            }
            progressTitle.textContent = `正在添加歌曲 ${downloadSongName.value}`;
            progressContainer.classList.add('active');
            let artistsArray = downloadArtistName.value.split(', ').filter(a => a.trim());
            let apiData = await fetchAudioUrl(downloadSongName.value, artistsArray, downloadAlbumName.value, selectedQuality, song.id);
            if (apiData && apiData.data && apiData.data.url) {
                const ext = getExtensionFromUrl(apiData.data.url);
                const baseName = downloadFileName.value.trim() || `${downloadSongName.value} - ${downloadArtistName.value}`;
                downloadList.push({
                    url: apiData.data.url,
                    title: downloadSongName.value,
                    artist: downloadArtistName.value,
                    album: apiData.data.album || downloadAlbumName.value,
                    fileName: baseName + ext,
                    cover: `https://mscdownload.pages.dev/proxy?url=${encodeURIComponent(apiData.data.cover)}`
                });
                saveDownloadList();
                downloadModal.classList.remove('active');
                hideDetailsForms();
                alert('已添加到下载列表');
            } else {
                alert('获取音频链接失败');
            }
            progressContainer.classList.remove('active');
        };
    }

    async function downloadSingle(index) {
        const song = searchResults[index];
        downloadSongName.value = song.name;
        downloadArtistName.value = song.ar?.map(a => a.name).join(', ') || song.artists?.map(a => a.name).join(', ') || song.artist || '';
        downloadAlbumName.value = song.al?.name || song.album;
        downloadFileName.value = `${song.name} - ${downloadArtistName.value}`;
        
        downloadDetailsFormSong.classList.remove('hidden');
        downloadDetailsFormArtist.classList.remove('hidden');
        downloadDetailsFormAlbum.classList.remove('hidden');
        downloadDetailsFormFile.classList.remove('hidden');
        renderQualityOptions();
        downloadModal.classList.add('active');
        
        downloadConfirmBtn.onclick = async function() {
            const selectedOpt = document.querySelector('#quality-options .selected');
            if (selectedOpt) {
                selectedQuality = parseInt(selectedOpt.dataset.quality);
                saveSettings();
            }
            progressTitle.textContent = `正在缓存歌曲 ${downloadSongName.value}`;
            progressContainer.classList.add('active');
            let cachedSize = 0;
            let currentSongName = downloadSongName.value;
            progressText.textContent = `已缓存: ${cachedSize.toFixed(2)} MB | 当前: ${currentSongName} | 0/1`;
            let artistsArray = downloadArtistName.value.split(', ').filter(a => a.trim());
            let apiData = await fetchAudioUrl(downloadSongName.value, artistsArray, downloadAlbumName.value, selectedQuality, song.id);
            if (!apiData || !apiData.data || !apiData.data.url) {
                alert('获取下载链接失败');
                progressContainer.classList.remove('active');
                return;
            }
            try {
                const proxyUrl = 'https://mscdownload.pages.dev/proxy?url=' + encodeURIComponent(apiData.data.url);
                const response = await withRetry(() => fetch(proxyUrl), retryCount);
                if (!response.ok) throw new Error('Network response was not ok');
                const reader = response.body.getReader();
                let chunks = [];
                let size = 0;
                while (true) {
                    const {done, value} = await reader.read();
                    if (done) break;
                    chunks.push(value);
                    size += value.length;
                    cachedSize = size / (1024 * 1024);
                    progressText.textContent = `已缓存: ${cachedSize.toFixed(2)} MB | 当前: ${currentSongName} | 0/1`;
                }
                let blob = new Blob(chunks);
                let taggedBlob = blob;
                const ext = getExtensionFromUrl(apiData.data.url);
                if (ext === '.mp3') {
                    taggedBlob = await addID3Tags(blob, downloadSongName.value, downloadArtistName.value, downloadAlbumName.value, `https://mscdownload.pages.dev/proxy?url=${encodeURIComponent(apiData.data.cover)}`);
                }
                progressText.textContent = `已缓存: ${cachedSize.toFixed(2)} MB | 当前: ${currentSongName} | 1/1`;
                const baseName = downloadFileName.value.trim() || `${downloadSongName.value} - ${downloadArtistName.value}`;
                const fileName = baseName + ext;
                const link = document.createElement('a');
                link.href = URL.createObjectURL(taggedBlob);
                link.download = fileName;
                link.click();
                downloadModal.classList.remove('active');
                hideDetailsForms();
            } catch (error) {
                console.error('下载失败:', error);
                alert('下载失败');
            }
            progressContainer.classList.remove('active');
        };
    }

    downloadModalClose.addEventListener('click', function() {
        downloadModal.classList.remove('active');
        hideDetailsForms();
    });

    downloadCancelBtn.addEventListener('click', function() {
        downloadModal.classList.remove('active');
        hideDetailsForms();
    });

    previewModalClose.addEventListener('click', function() {
        previewModal.classList.remove('active');
    });

    previewCancelBtn.addEventListener('click', function() {
        previewModal.classList.remove('active');
    });

    function handleQueryParams() {
        const params = new URLSearchParams(window.location.search);
        const page = params.get('page');
        const search = params.get('search');
        const type = params.get('type');
        const playlist = params.get('playlist');
        const album = params.get('album');
        if (page) {
            navItems.forEach(nav => {
                if (nav.dataset.page === page) {
                    nav.click();
                }
            });
        } else if (playlist) {
            currentView = 'playlist';
            currentPlaylistId = playlist;
            loadPlaylistDetails(playlist, 1);
            backBtn.classList.remove('hidden');
            historyStack.push({view: 'search', keyword: '', type: '1000', page: 1, title: '搜索音乐'});
        } else if (album) {
            currentView = 'album';
            currentAlbumId = album;
            loadAlbumDetails(album, 1);
            backBtn.classList.remove('hidden');
            historyStack.push({view: 'search', keyword: '', type: '10', page: 1, title: '搜索音乐'});
        } else if (search && type) {
            searchInput.value = search;
            searchMode.value = type;
            performSearch();
        }
    }

    loadSettings();
    loadDownloadList();
    updateContent();
    handleQueryParams();
});
