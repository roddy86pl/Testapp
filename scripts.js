// ============================================================================
// POLFUN BOX - APLIKACJA IPTV DLA AMAZON VEGA OS (FIRE TV STICK)
// ============================================================================
/* jshint esversion: 6, unused: vars, eqeqeq: false, bitwise: false */
/* globals Hls, escape */

// Promise.finally polyfill
if (typeof Promise.prototype.finally !== 'function') {
    Promise.prototype.finally = function(callback) {
        var P = this.constructor;
        return this.then(
            function(value) { return P.resolve(callback()).then(function() { return value; }); },
            function(reason) { return P.resolve(callback()).then(function() { throw reason; }); }
        );
    };
}

(function() {
    'use strict';
    
    // KONFIGURACJA
    var CONFIG = {
        version: '1.0.0-vega',
        storagePrefix: 'polfun_',
        configUrl: 'http://api.polfun.de/api/config.php',
        defaultDeviceApi: 'http://api.polfun.de/api/device.php',
        defaultRegisterApi: 'http://api.polfun.de/api/register.php',
        debugMode: false
    };
    
    // STAN APLIKACJI
    var STATE = {
        deviceCode: null,
        deviceBrand: 'Amazon Fire TV',
        isVegaOS: false,
        isTizenOS: false, // Zachowujemy dla kompatybilności, ale zawsze false
        isLoggedIn: false,
        serverUrl: '',
        username: '',
        password: '',
        userInfo: null,
        deviceApiUrl: '',
        registerApiUrl: '',
        currentScreen: 'login',
        liveCategories: [],
        liveChannels: [],
        allLiveChannels: [],
        currentChannel: null,
        vodCategories: [],
        vodMovies: [],
        allMovies: [],
        seriesCategories: [],
        seriesList: [],
        allSeries:  [],
        currentSeries: null,
        currentSeasonEpisodes: [],
        currentMovie: null,
        hls: null,
        epgInterval: null,
        lastClick: { id: null, time: 0 },
        avplayReady: false,
        avplayListener: null,
        focusedElement: null,
        playerRect: null,
        backPressed: false,
        backTimeout: null,
        lastFocusedElement: null,  // Dodane: pamiętanie fokusu przed fullscreen
        settings: {
            streamFormat: 'm3u8',
            vodFormat: 'mp4',
            pinCode: null,
            pinEnabled: false
        },
        pinInput: '',
        pinMode: null,
        pinSetupFirst: '',
        pinCallback: null,
        pinUnlockedCategories: [],
        favoriteChannels: [],
        watchHistory: { movies: [], series: [] },
        searchQuery: '',
        searchResults: { channels: [], movies: [], series: [] }
    };
    
    // Fire TV Remote key codes (różne od Tizen!)
    var KEYS = {
        ENTER: 13,
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        BACK: 27,           // ESC = Back na Fire TV
        BACK_BROWSER: 27,
        BACK_LG: 461,       // Kompatybilność
        BACK_TIZEN: 10009,  // Kompatybilność z kodem Tizen
        PLAY: 415,
        PAUSE: 19,
        PLAY_PAUSE: 179,    // MediaPlayPause na Fire TV
        STOP: 413,
        FF: 228,            // MediaFastForward
        RW: 227,            // MediaRewind
        CH_UP: 33,          // PageUp jako CH+
        CH_DOWN: 34,        // PageDown jako CH-
        RED: 403,
        GREEN: 404,
        YELLOW: 405,
        BLUE: 406,
        MENU: 18,           // Menu button Fire TV
        NUM_0: 48,
        NUM_9: 57
    };
    
    // Flaga wymuszająca HLS (true = zawsze HLS, bez AVPlay)
    // Na VegaOS zawsze używamy HLS.js
    var FORCE_HLS = true;
    
    // VOD controls globals
    var vodControlsTimeout = null;
    var vodControlsVisible = false;
    var vodCurrentVideo = null;
    var vodIsPlaying = false;
    var vodIsSeeking = false;
    var avplayVodInterval = null;
    var fsEpgTimeout = null;
    
    // PIN keywords
    var ADULT_KEYWORDS = ['xxx', 'adult', '18+', 'erotic', 'porn', 'sex', 'dla dorosłych', 'erotyka', 'vod xxx'];
    // ==================== DEBUG ====================
    function log(msg, type) {
        var prefix = {
            info: '📘',
            success: '✅',
            warn: '⚠️',
            error: '❌',
            debug: '🔧'
        };
        var icon = prefix[type] || '📘';
        console.log(icon + ' ' + msg);
        
        if (CONFIG.debugMode) {
            var debugEl = document.getElementById('debugLog');
            if (debugEl) {
                var time = new Date().toLocaleTimeString('pl-PL');
                debugEl.innerHTML += '<div>[' + time + '] ' + icon + ' ' + msg + '</div>';
                debugEl.scrollTop = debugEl.scrollHeight;
            }
        }
    }
    
    // ==================== HTTP REQUEST (XMLHttpRequest wrapper dla Tizen) ====================
    function httpRequest(url, options) {
        options = options || {};
        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            var method = options.method || 'GET';
            
            xhr.open(method, url, true);
            
            // Set headers (ale nie dla FormData - przeglądarka ustawi automatycznie)
            var isFormData = options.body && options.body instanceof FormData;
            if (options.headers && !isFormData) {
                Object.keys(options.headers).forEach(function(key) {
                    xhr.setRequestHeader(key, options.headers[key]);
                });
            }
            
            // Set content type for POST with JSON (nie dla FormData)
            if (method === 'POST' && options.body && !isFormData) {
                xhr.setRequestHeader('Content-Type', 'application/json');
            }
            
            xhr.timeout = options.timeout || 15000;
            
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve({
                        ok: true,
                        status: xhr.status,
                        json: function() {
                            try {
                                return Promise.resolve(JSON.parse(xhr.responseText));
                            } catch (e) {
                                return Promise.reject(new Error('Invalid JSON: ' + e.message));
                            }
                        },
                        text: function() {
                            return Promise.resolve(xhr.responseText);
                        }
                    });
                } else {
                    reject(new Error('HTTP ' + xhr.status + ': ' + xhr.statusText));
                }
            };
            
            xhr.onerror = function() {
                log('XHR Error for: ' + url, 'error');
                reject(new Error('Network error - sprawdź połączenie'));
            };
            
            xhr.ontimeout = function() {
                log('XHR Timeout for: ' + url, 'error');
                reject(new Error('Request timeout'));
            };
            
            if (options.body) {
                if (isFormData) {
                    xhr.send(options.body);
                } else {
                    xhr.send(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
                }
            } else {
                xhr.send();
            }
        });
    }
    
    // ==================== INICJALIZACJA ====================
    function init() {
        log('PolFun Box v' + CONFIG.version + ' - Start... ', 'info');
        
        initDeviceInfo()
            .then(function() {
                loadSavedData();
                return fetchRemoteConfig();
            })
            .then(function() {
                updateLoginUI();
                setupEventListeners();
                setupFocusNavigation();
                startClock();
                return checkAutoLogin();
            })
            .then(function() {
                log('PolFun Box gotowa! ', 'success');
                var firstFocusable = document.querySelector('#loginScreen .focusable');
                if (firstFocusable) {
                    firstFocusable.focus();
                }
            })
            .catch(function(err) {
                log('Błąd inicjalizacji: ' + err.message, 'error');
                showAlert('error', 'Błąd inicjalizacji: ' + err.message);
            });
    }
    
    // ==================== WYKRYWANIE URZĄDZENIA ====================
    function initDeviceInfo() {
        return new Promise(function(resolve) {
            log('Wykrywanie platformy...', 'info');
            
            STATE.isVegaOS = detectVegaOS();
            STATE.isTizenOS = false; // Na VegaOS zawsze false
            log('Vega OS: ' + STATE.isVegaOS, 'debug');
            
            // Sprawdź czy mamy kod urządzenia z React Native WebView
            if (window.DEVICE_CODE) {
                STATE.deviceCode = window.DEVICE_CODE;
                STATE.deviceBrand = window.DEVICE_BRAND || 'Amazon Fire TV';
                log('Device Code from React Native: ' + STATE.deviceCode, 'success');
            } else {
                STATE.deviceCode = generateBrowserDeviceCode();
                STATE.deviceBrand = 'Amazon Fire TV';
                log('Generated Device Code: ' + STATE.deviceCode, 'debug');
            }
            
            // Ustaw handler dla informacji z React Native
            window.onDeviceInfoReceived = function(data) {
                log('Received device info from React Native', 'info');
                STATE.deviceCode = data.deviceCode || STATE.deviceCode;
                STATE.deviceBrand = data.brand || STATE.deviceBrand;
                updateLoginUI();
            };
            
            // Handler dla przycisku BACK z React Native
            window.handleBackButton = function() {
                log('BACK from React Native', 'debug');
                var backEvent = new KeyboardEvent('keydown', {
                    keyCode: KEYS.BACK,
                    which: KEYS.BACK,
                    bubbles: true
                });
                document.dispatchEvent(backEvent);
            };
            
            resolve();
        });
    }
    
    function detectVegaOS() {
        // Sprawdź flagę ustawianą przez React Native WebView
        if (window.VEGA_OS === true) {
            log('VegaOS flag detected', 'debug');
            return true;
        }
        
        // Sprawdź platformę
        if (window.PLATFORM === 'VegaOS') {
            return true;
        }
        
        // Sprawdź User Agent
        var ua = navigator.userAgent.toLowerCase();
        if (ua.indexOf('vegaos') !== -1 || ua.indexOf('fire tv') !== -1 || 
            ua.indexOf('aftss') !== -1 || ua.indexOf('polfunbox') !== -1) {
            log('Fire TV User-Agent detected', 'debug');
            return true;
        }
        
        return false;
    }
    
    function detectTizenOS() {
        // Na VegaOS zawsze zwracamy false
        return false;
    }
    
    function getTizenDeviceCode() {
        // Stub dla kompatybilności - nie używane na VegaOS
        return Promise.resolve();
    }
    
    function convertToDeviceCode(rawId) {
        if (!rawId) return generateBrowserDeviceCode();
        
        var str = String(rawId).toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        if (/^[A-Z0-9]{8}$/.test(str)) {
            return str;
        }
        
        var hash = 0;
        for (var i = 0; i < str. length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var code = '';
        var num = Math.abs(hash);
        
        for (var j = 0; j < 8; j++) {
            code += chars[num % chars.length];
            num = Math.floor(num / chars.length) + (j * 7);
        }
        
        return code;
    }
    
    function generateBrowserDeviceCode() {
        try {
            var stored = localStorage.getItem(CONFIG. storagePrefix + 'device_code');
            if (stored && stored.length === 8) {
                return stored;
            }
        } catch (e) {}
        
        var fp = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            screen.colorDepth,
            new Date().getTimezoneOffset(),
            navigator.hardwareConcurrency || 0,
            navigator.platform
        ].join('|');
        
        var hash = 0;
        for (var i = 0; i < fp.length; i++) {
            hash = ((hash << 5) - hash) + fp.charCodeAt(i);
            hash = hash & hash;
        }
        
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var code = '';
        var num = Math.abs(hash);
        
        for (var j = 0; j < 8; j++) {
            code += chars[num % chars.length];
            num = Math.floor(num / chars.length) + (j * 7);
        }
        
        try {
            localStorage.setItem(CONFIG.storagePrefix + 'device_code', code);
        } catch (e) {}
        
        return code;
    }
    
    // ==================== FIRE TV REMOTE KEYS (stubbed) ====================
    function registerTizenKeys() {
        // Nie potrzebne na VegaOS - klawisze są automatycznie obsługiwane
        log('Fire TV remote keys ready', 'success');
    }
    
    // ==================== AVPLAY (stubbed for VegaOS) ====================
    function initAVPlay() {
        // AVPlay nie istnieje na VegaOS - używamy HLS.js
        log('Using HLS.js video player (VegaOS mode)', 'info');
    }
    // ==================== FOCUS NAVIGATION ====================
    function setupFocusNavigation() {
        document.querySelectorAll('.focusable').forEach(function(el) {
            // tabindex="-1" pozwala na programowy focus() ale wyłącza natywną nawigację TAB
            el.setAttribute('tabindex', '-1');
            
            el.addEventListener('focus', function() {
                STATE.focusedElement = el;
                scrollIntoViewIfNeeded(el);
            });
        });
    }
    
    function scrollIntoViewIfNeeded(element) {
        var rect = element.getBoundingClientRect();
        var container = element.closest('.sidebar-categories, .sidebar-channels, .vod-grid-container, .episodes-list');
        
        if (container) {
            var containerRect = container.getBoundingClientRect();
            
            if (rect.top < containerRect.top) {
                container.scrollTop -= containerRect.top - rect.top + 20;
            } else if (rect.bottom > containerRect.bottom) {
                container.scrollTop += rect.bottom - containerRect.bottom + 20;
            }
        }
    }
    
    function updateFocusables(containerId) {
        var container = document.getElementById(containerId);
        if (!container) return;
        
        container.querySelectorAll('.focusable').forEach(function(el) {
            if (!el.hasAttribute('tabindex')) {
                el.setAttribute('tabindex', '-1');
            }
            
            if (!el._focusHandlerSet) {
                el.addEventListener('focus', function() {
                    STATE.focusedElement = el;
                    scrollIntoViewIfNeeded(el);
                });
                el._focusHandlerSet = true;
            }
        });
    }
    
    function navigateFocus(direction) {
        var focused = document.activeElement;
        if (!focused || !focused.classList.contains('focusable')) {
            var firstFocusable = document.querySelector('.screen.active .focusable');
            if (firstFocusable) firstFocusable.focus();
            return;
        }
        
        var allFocusables = Array.from(document.querySelectorAll('.screen.active .focusable:not([disabled])'));
        var focusedRect = focused.getBoundingClientRect();
        
        var candidates = [];
        
        allFocusables.forEach(function(el, index) {
            if (el === focused) return;
            
            var rect = el.getBoundingClientRect();
            var dx = rect.left + rect.width/2 - (focusedRect.left + focusedRect.width/2);
            var dy = rect.top + rect.height/2 - (focusedRect.top + focusedRect.height/2);
            
            var isValid = false;
            var distance = Math.sqrt(dx*dx + dy*dy);
            
            switch (direction) {
                case 'up':
                    isValid = dy < -10 && Math.abs(dx) < rect.width * 2;
                    break;
                case 'down':
                    isValid = dy > 10 && Math.abs(dx) < rect.width * 2;
                    break;
                case 'left':
                    isValid = dx < -10 && Math. abs(dy) < rect.height * 2;
                    break;
                case 'right': 
                    isValid = dx > 10 && Math.abs(dy) < rect.height * 2;
                    break;
            }
            
            if (isValid) {
                candidates. push({ el: el, distance: distance });
            }
        });
        
        if (candidates.length > 0) {
            candidates.sort(function(a, b) { return a.distance - b.distance; });
            candidates[0].el.focus();
        }
    }
    
    // ==================== KONFIGURACJA ZDALNA ====================
    function fetchRemoteConfig() {
        return new Promise(function(resolve) {
            log('Pobieranie config.php...', 'info');
            
            httpRequest(CONFIG.configUrl)
                .then(function(r) { return r.json(); })
                .then(function(config) {
                    if (config.device_api_url) {
                        STATE.deviceApiUrl = config.device_api_url.replace('https://', 'http://');
                    }
                    if (config.manual_register_url) {
                        STATE.registerApiUrl = config.manual_register_url.replace('https://', 'http://');
                    }
                    log('Config załadowany', 'success');
                    resolve();
                })
                .catch(function(err) {
                    log('Config error, używam domyślnych: ' + err.message, 'warn');
                    STATE.deviceApiUrl = CONFIG.defaultDeviceApi;
                    STATE.registerApiUrl = CONFIG.defaultRegisterApi;
                    resolve();
                });
        });
    }
    
    // ==================== STORAGE ====================
    function loadSavedData() {
        var p = CONFIG.storagePrefix;
        STATE.isLoggedIn = localStorage.getItem(p + 'is_logged') === 'true';
        STATE.serverUrl = localStorage.getItem(p + 'server_url') || '';
        STATE.username = localStorage. getItem(p + 'username') || '';
        STATE.password = localStorage.getItem(p + 'password') || '';
        
        loadSettingsFromStorage();
        
        // Załaduj ulubione kanały i historię oglądania
        STATE.favoriteChannels = JSON.parse(localStorage.getItem(p + 'favoriteChannels') || '[]');
        STATE.watchHistory = JSON.parse(localStorage.getItem(p + 'watchHistory') || '{"movies":[],"series":[]}');
    }
    
    function saveLoginData(serverUrl, username, password) {
        var p = CONFIG.storagePrefix;
        localStorage.setItem(p + 'is_logged', 'true');
        localStorage.setItem(p + 'server_url', serverUrl);
        localStorage.setItem(p + 'username', username);
        localStorage.setItem(p + 'password', password);
        
        STATE.isLoggedIn = true;
        STATE.serverUrl = serverUrl;
        STATE.username = username;
        STATE.password = password;
    }
    
    function clearLoginData() {
        var p = CONFIG.storagePrefix;
        localStorage.removeItem(p + 'is_logged');
        localStorage.removeItem(p + 'server_url');
        localStorage.removeItem(p + 'username');
        localStorage.removeItem(p + 'password');
        
        STATE.isLoggedIn = false;
        STATE.serverUrl = '';
        STATE.username = '';
        STATE. password = '';
        STATE.userInfo = null;
    }
    
    function loadSettingsFromStorage() {
        try {
            var saved = localStorage.getItem(CONFIG. storagePrefix + 'settings');
            if (saved) {
                var parsed = JSON.parse(saved);
                STATE.settings = Object.assign(STATE.settings, parsed);
            }
        } catch (e) {
            log('Error loading settings: ' + e.message, 'warn');
        }
    }

    // ==================== ULUBIONE KANAŁY ====================
    function addToFavoriteChannels(channelId) {
        channelId = String(channelId); // Konwertuj na string
        if (!STATE.favoriteChannels.includes(channelId)) {
            STATE.favoriteChannels.push(channelId);
            saveFavoriteChannels();
            showAlert('success', 'Dodano do ulubionych!');
            return true;
        }
        return false;
    }
    
    function removeFromFavoriteChannels(channelId) {
        channelId = String(channelId); // Konwertuj na string
        var index = STATE.favoriteChannels.indexOf(channelId);
        if (index !== -1) {
            STATE.favoriteChannels.splice(index, 1);
            saveFavoriteChannels();
            showAlert('info', 'Usunięto z ulubionych');
            return true;
        }
        return false;
    }
    
    function toggleFavoriteChannel(channelId) {
        if (isFavoriteChannel(channelId)) {
            return removeFromFavoriteChannels(channelId);
        } else {
            return addToFavoriteChannels(channelId);
        }
    }
    
    function isFavoriteChannel(channelId) {
        return STATE.favoriteChannels.includes(String(channelId)); // Konwertuj na string
    }
    
    function saveFavoriteChannels() {
        try {
            localStorage.setItem(CONFIG.storagePrefix + 'favoriteChannels', JSON.stringify(STATE.favoriteChannels));
        } catch (e) {
            log('Error saving favorite channels: ' + e.message, 'error');
        }
    }
    
    function getFavoriteChannelsList() {
        return STATE.allLiveChannels.filter(function(ch) {
            return isFavoriteChannel(ch.stream_id);
        });
    }
    
    // ==================== HISTORIA OGLĄDANIA ====================
    function addToWatchHistory(type, item) {
        try {
            var historyItem = {
                id: type === 'movies' ? item.stream_id : item.series_id,
                name: item.name || item.title,
                cover: type === 'movies' ? (item.stream_icon || item.cover) : item.cover,
                timestamp: Date.now(),
                type: type
            };
            
            if (type === 'series' && item.episodeId) {
                historyItem.episodeId = item.episodeId;
                historyItem.seasonNum = item.seasonNum;
                historyItem.episodeNum = item.episodeNum;
            }
            
            // Usuń jeśli już istnieje (żeby był na początku)
            STATE.watchHistory[type] = STATE.watchHistory[type].filter(function(h) {
                return h.id !== historyItem.id;
            });
            
            // Dodaj na początek
            STATE.watchHistory[type].unshift(historyItem);
            
            // Ogranicz do 50 ostatnich
            if (STATE.watchHistory[type].length > 50) {
                STATE.watchHistory[type] = STATE.watchHistory[type].slice(0, 50);
            }
            
            saveWatchHistory();
        } catch (e) {
            log('Error adding to watch history: ' + e.message, 'error');
        }
    }
    
    function saveWatchHistory() {
        try {
            localStorage.setItem(CONFIG.storagePrefix + 'watchHistory', JSON.stringify(STATE.watchHistory));
        } catch (e) {
            log('Error saving watch history: ' + e.message, 'error');
        }
    }
    
    function getWatchHistory(type) {
        return STATE.watchHistory[type] || [];
    }
    
    // ==================== WYSZUKIWANIE ====================
    function performSearch(query) {
        if (!query || query.length < 2) {
            STATE.searchResults = { channels: [], movies: [], series: [] };
            return;
        }
        
        var q = normalizeSearchQuery(query.toLowerCase());
        
        // Resetuj wszystkie wyniki
        STATE.searchResults = { channels: [], movies: [], series: [] };
        
        // Szukaj tylko w odpowiedniej kategorii w zależności od ekranu
        if (STATE.currentScreen === 'liveTv') {
            // Tylko kanały
            STATE.searchResults.channels = STATE.allLiveChannels.filter(function(ch) {
                return normalizeSearchQuery(ch.name.toLowerCase()).indexOf(q) !== -1;
            }).slice(0, 20);
            log('Search in LiveTV: ' + STATE.searchResults.channels.length + ' channels', 'info');
        } else if (STATE.currentScreen === 'movies') {
            // Tylko filmy
            STATE.searchResults.movies = STATE.allMovies.filter(function(m) {
                var name = (m.name || m.title || '').toLowerCase();
                return normalizeSearchQuery(name).indexOf(q) !== -1;
            }).slice(0, 20);
            log('Search in Movies: ' + STATE.searchResults.movies.length + ' movies', 'info');
        } else if (STATE.currentScreen === 'series') {
            // Tylko seriale
            STATE.searchResults.series = STATE.allSeries.filter(function(s) {
                var name = (s.name || s.title || '').toLowerCase();
                return normalizeSearchQuery(name).indexOf(q) !== -1;
            }).slice(0, 20);
            log('Search in Series: ' + STATE.searchResults.series.length + ' series', 'info');
        }
    }
    
    function normalizeSearchQuery(text) {
        var polishChars = {
            'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
            'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
            'Ą': 'a', 'Ć': 'c', 'Ę': 'e', 'Ł': 'l', 'Ń': 'n',
            'Ó': 'o', 'Ś': 's', 'Ź': 'z', 'Ż': 'z'
        };
        return text.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, function(match) {
            return polishChars[match] || match;
        });
    }
    
    function showSearchModal() {
        var modal = document.getElementById('searchModal');
        if (modal) {
            modal.style.display = 'flex';
            var input = document.getElementById('searchInput');
            if (input) {
                input.value = '';
                input.focus();
            }
            renderSearchResults();
        }
    }
    
    function hideSearchModal() {
        var modal = document.getElementById('searchModal');
        if (modal) {
            modal.style.display = 'none';
            STATE.searchQuery = '';
            STATE.searchResults = { channels: [], movies: [], series: [] };
        }
    }
    
    function renderSearchResults() {
        var resultsDiv = document.getElementById('searchResults');
        if (!resultsDiv) return;
        
        var html = '';
        var totalResults = STATE.searchResults.channels.length + 
                          STATE.searchResults.movies.length + 
                          STATE.searchResults.series.length;
        
        if (totalResults === 0 && STATE.searchQuery.length >= 2) {
            html = '<div class="search-empty">Brak wyników dla "' + STATE.searchQuery + '"</div>';
        } else if (STATE.searchQuery.length < 2) {
            html = '<div class="search-hint">Wpisz co najmniej 2 znaki aby wyszukać</div>';
        } else {
            // Kanały
            if (STATE.searchResults.channels.length > 0) {
                html += '<div class="search-section"><h3>Kanały (' + STATE.searchResults.channels.length + ')</h3>';
                html += '<div class="search-items">';
                STATE.searchResults.channels.forEach(function(ch) {
                    html += '<div class="search-item channel-search focusable" data-type="channel" data-id="' + ch.stream_id + '" tabindex="0">' +
                           '<img class="search-thumb" src="' + (ch.stream_icon || '') + '" onerror="this.style.background=\'#333\'">' +
                           '<div class="search-info"><div class="search-title">' + ch.name + '</div></div></div>';
                });
                html += '</div></div>';
            }
            
            // Filmy
            if (STATE.searchResults.movies.length > 0) {
                html += '<div class="search-section"><h3>Filmy (' + STATE.searchResults.movies.length + ')</h3>';
                html += '<div class="search-items">';
                STATE.searchResults.movies.forEach(function(m) {
                    html += '<div class="search-item movie-search focusable" data-type="movie" data-id="' + m.stream_id + '" tabindex="0">' +
                           '<img class="search-thumb" src="' + (m.stream_icon || m.cover || '') + '" onerror="this.style.background=\'#21262d\'">' +
                           '<div class="search-info"><div class="search-title">' + (m.name || m.title) + '</div>' +
                           '<div class="search-meta">' + (m.year || '') + '</div></div></div>';
                });
                html += '</div></div>';
            }
            
            // Seriale
            if (STATE.searchResults.series.length > 0) {
                html += '<div class="search-section"><h3>Seriale (' + STATE.searchResults.series.length + ')</h3>';
                html += '<div class="search-items">';
                STATE.searchResults.series.forEach(function(s) {
                    html += '<div class="search-item series-search focusable" data-type="series" data-id="' + s.series_id + '" tabindex="0">' +
                           '<img class="search-thumb" src="' + (s.cover || '') + '" onerror="this.style.background=\'#21262d\'">' +
                           '<div class="search-info"><div class="search-title">' + (s.name || s.title) + '</div>' +
                           '<div class="search-meta">' + (s.year || '') + '</div></div></div>';
                });
                html += '</div></div>';
            }
        }
        
        resultsDiv.innerHTML = html;
        
        // Dodaj event listenery
        resultsDiv.querySelectorAll('.search-item').forEach(function(item) {
            item.addEventListener('click', function() {
                handleSearchItemClick(item.dataset.type, item.dataset.id);
            });
            item.addEventListener('keydown', function(e) {
                if (e.keyCode === KEYS.ENTER) {
                    handleSearchItemClick(item.dataset.type, item.dataset.id);
                }
            });
        });
        
        updateFocusables('searchResults');
    }
    
    function handleSearchItemClick(type, id) {
        hideSearchModal();
        
        if (type === 'channel') {
            showScreen('liveTv');
            setTimeout(function() {
                playLiveChannel(id, true);
            }, 300);
        } else if (type === 'movie') {
            showScreen('movies');
            setTimeout(function() {
                openMovieDetails(id);
            }, 300);
        } else if (type === 'series') {
            showScreen('series');
            setTimeout(function() {
                openSeriesDetails(id);
            }, 300);
        }
    }
    
    function saveSettings() {
        STATE.settings. streamFormat = document.getElementById('settingStreamFormat').value;
        STATE. settings.vodFormat = document.getElementById('settingVodFormat').value;
        
        try {
            localStorage.setItem(CONFIG.storagePrefix + 'settings', JSON.stringify(STATE.settings));
            showAlert('success', 'Ustawienia zapisane');
            log('Settings saved', 'success');
        } catch (e) {
            showAlert('error', 'Błąd zapisu ustawień');
            log('Error saving settings:  ' + e.message, 'error');
        }
    }
    
    // ==================== UI ====================
    function updateLoginUI() {
        document.getElementById('deviceCode').textContent = STATE.deviceCode;
        document.getElementById('versionText').textContent = 'v' + CONFIG.version + ' | ' + STATE.deviceBrand;
    }
    
    function showScreen(screenId) {
        log('Showing screen: ' + screenId, 'debug');
        
        hideFullscreenEpg();
        
        if (document.getElementById('videoOverlay').classList.contains('active')) {
            log('Closing video overlay on screen change', 'info');
            closeVideoOverlay();
        }
        
        if (STATE.currentScreen === 'liveTv' && screenId !== 'liveTv') {
            log('Leaving Live TV - stopping playback', 'info');
            stopLiveVideo();
            
            if (STATE.epgInterval) {
                clearInterval(STATE.epgInterval);
                STATE.epgInterval = null;
            }
            
            document.getElementById('epgChannelName').textContent = 'Wybierz kanał';
            document.getElementById('epgCurrent').textContent = '--';
            document.getElementById('epgNext').textContent = '';
            document.getElementById('epgProgress').style.width = '0%';
        }
        
        document.querySelectorAll('.screen').forEach(function(s) {
            s.classList.remove('active');
        });
        
        var screen = document.getElementById(screenId + 'Screen');
        if (screen) {
            screen. classList.add('active');
            STATE.currentScreen = screenId;
        }
        
        if (screenId === 'liveTv') loadLiveTV();
        else if (screenId === 'movies') loadMovies();
        else if (screenId === 'series') loadSeries();
        else if (screenId === 'account') loadAccount();
        else if (screenId === 'settings') loadSettings();
        
        setTimeout(function() {
            var firstFocusable = screen.querySelector('.focusable');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }, 100);
    }
    
    function showAlert(type, message) {
        document.querySelectorAll('.alert').forEach(function(a) {
            a.classList.remove('show');
        });
        
        var alertEl = document.getElementById('alert' + type. charAt(0).toUpperCase() + type.slice(1));
        if (alertEl) {
            alertEl.textContent = message;
            alertEl.classList.add('show');
            setTimeout(function() { alertEl.classList.remove('show'); }, 5000);
        }
    }
    
    function showLoading(elementId, show) {
        var el = document.getElementById(elementId);
        if (el) {
            el.classList.toggle('show', show);
        }
    }
    
    function startClock() {
        var update = function() {
            var now = new Date();
            document.getElementById('homeClock').textContent = 
                now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        };
        update();
        setInterval(update, 1000);
    }
    // ==================== LOGOWANIE ====================
    function checkAutoLogin() {
        return new Promise(function(resolve) {
            if (!STATE.isLoggedIn || !STATE.serverUrl || !STATE.username) {
                resolve();
                return;
            }
            
            log('Auto-login... ', 'info');
            
            verifyIPTV(STATE.serverUrl, STATE.username, STATE.password)
                .then(function(valid) {
                    if (valid) {
                        log('Auto-login OK', 'success');
                        return loadHomeData().then(function() {
                            showScreen('home');
                            resolve();
                        });
                    } else {
                        log('Auto-login failed', 'error');
                        clearLoginData();
                        showAlert('warning', 'Sesja wygasła');
                        resolve();
                    }
                })
                .catch(function() {
                    clearLoginData();
                    resolve();
                });
        });
    }
    
    function loginByDevice() {
        var btn = document.getElementById('btnLoginDevice');
        btn.disabled = true;
        btn.textContent = 'Logowanie...';
        
        log('Logowanie przez device. php...', 'info');
        log('Device Code:  ' + STATE.deviceCode, 'debug');
        
        var formData = new FormData();
        formData.append('device_code', STATE.deviceCode);
        
        httpRequest(STATE.deviceApiUrl, {
            method: 'POST',
            body: formData
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            log('Odpowiedź device.php: ' + JSON.stringify(data), 'debug');
            
            if (!data.success) {
                showAlert('error', data.message || 'Kod nie zarejestrowany');
                return;
            }
            
            if (!data.username || !data.password || !data.server_url) {
                showAlert('error', 'Niepełne dane');
                return;
            }
            
            return verifyIPTV(data.server_url, data.username, data. password)
                .then(function(valid) {
                    if (valid) {
                        saveLoginData(data.server_url, data.username, data.password);
                        return loadHomeData().then(function() {
                            showScreen('home');
                            showAlert('success', 'Zalogowano! ');
                        });
                    } else {
                        showAlert('error', 'Konto IPTV nieaktywne');
                    }
                });
        })
        .catch(function(err) {
            log('Login error: ' + err.message, 'error');
            showAlert('error', 'Błąd:  ' + err.message);
        })
        .finally(function() {
            btn.disabled = false;
            btn.textContent = 'Zaloguj kodem urządzenia';
        });
    }
    
    function register() {
        var serverUrl = document.getElementById('inputServerUrl').value.trim();
        var username = document.getElementById('inputUsername').value.trim();
        var password = document.getElementById('inputPassword').value.trim();
        
        if (!serverUrl || !username || !password) {
            showAlert('error', 'Wypełnij wszystkie pola');
            return;
        }
        
        var btn = document.getElementById('btnRegister');
        btn.disabled = true;
        btn.textContent = 'Rejestracja...';
        
        log('Rejestracja przez register.php...', 'info');
        
        var formData = new FormData();
        formData.append('device_code', STATE.deviceCode);
        formData.append('server_url', serverUrl);
        formData.append('username', username);
        formData.append('password', password);
        
        httpRequest(STATE.registerApiUrl, {
            method: 'POST',
            body: formData
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            log('Odpowiedź register.php: ' + JSON.stringify(data), 'debug');
            
            if (data.success) {
                showAlert('success', 'Rejestracja wysłana!  Oczekuj aktywacji.');
            } else {
                showAlert('error', data.message || 'Błąd rejestracji');
            }
        })
        .catch(function(err) {
            log('Register error: ' + err.message, 'error');
            showAlert('error', 'Błąd: ' + err.message);
        })
        .finally(function() {
            btn.disabled = false;
            btn. textContent = 'Zarejestruj';
        });
    }
    
    function verifyIPTV(serverUrl, username, password) {
        return new Promise(function(resolve) {
            var url = serverUrl. endsWith('/') ? serverUrl : serverUrl + '/';
            
            httpRequest(url + 'player_api.php? username=' + encodeURIComponent(username) + 
                  '&password=' + encodeURIComponent(password))
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (!data.user_info) {
                        resolve(false);
                        return;
                    }
                    
                    var ui = data.user_info;
                    STATE.userInfo = ui;
                    
                    var isActive = ui.auth === 1 || ui.auth === '1' || ui.auth === true;
                    if (ui.status && ui.status. toLowerCase() !== 'active') isActive = false;
                    if (ui.exp_date) {
                        var exp = parseInt(ui.exp_date);
                        if (exp > 0 && exp < Date.now() / 1000) isActive = false;
                    }
                    
                    resolve(isActive);
                })
                .catch(function() {
                    resolve(false);
                });
        });
    }
    
    function logout() {
        if (confirm('Na pewno wylogować? ')) {
            closeVideoOverlay();
            stopLiveVideo();
            clearLoginData();
            showScreen('login');
        }
    }
    
    function restart() {
        if (confirm('Wyczyścić dane i zrestartować?')) {
            localStorage.clear();
            location.reload();
        }
    }
    
    // ==================== HOME DATA ====================
    function loadHomeData() {
        return new Promise(function(resolve) {
            var url = STATE.serverUrl. endsWith('/') ? STATE.serverUrl : STATE.serverUrl + '/';
            var u = STATE.username, p = STATE.password;
            
            document.getElementById('homeUsername').textContent = u;
            if (STATE.userInfo && STATE.userInfo.exp_date) {
                var exp = new Date(parseInt(STATE.userInfo.exp_date) * 1000);
                document.getElementById('homeExpiry').textContent = 'Ważność: ' + exp.toLocaleDateString('pl-PL');
            }
            
            Promise.all([
                httpRequest(url + 'player_api.php?username=' + u + '&password=' + p + '&action=get_live_streams')
                    .then(function(r) { return r.json(); }).catch(function() { return []; }),
                httpRequest(url + 'player_api.php? username=' + u + '&password=' + p + '&action=get_vod_streams')
                    . then(function(r) { return r.json(); }).catch(function() { return []; }),
                httpRequest(url + 'player_api.php?username=' + u + '&password=' + p + '&action=get_series')
                    .then(function(r) { return r.json(); }).catch(function() { return []; })
            ]).then(function(results) {
                STATE.allLiveChannels = results[0] || [];
                STATE.allMovies = results[1] || [];
                STATE.allSeries = results[2] || [];
                
                document.getElementById('liveTvCount').textContent = STATE.allLiveChannels.length + ' kanałów';
                document.getElementById('moviesCount').textContent = STATE. allMovies.length;
                document.getElementById('seriesCount').textContent = STATE.allSeries.length;
                
                log('Loaded:  ' + STATE.allLiveChannels.length + ' channels, ' + STATE.allMovies.length + ' movies, ' + STATE.allSeries.length + ' series', 'success');
                resolve();
            });
        });
    }
    
    // ==================== LIVE TV ====================
    function loadLiveTV() {
        log('Loading Live TV...', 'info');
        var url = STATE.serverUrl.endsWith('/') ? STATE.serverUrl : STATE.serverUrl + '/';
        var u = STATE.username, p = STATE.password;
        
        httpRequest(url + 'player_api.php?username=' + u + '&password=' + p + '&action=get_live_categories')
            .then(function(r) { return r.json(); })
            .then(function(cats) {
                STATE.liveCategories = cats || [];
                renderLiveCategories();
                
                if (STATE.liveCategories. length > 0) {
                    selectLiveCategory(STATE.liveCategories[0]. category_id);
                }
            });
    }
    
    function renderLiveCategories() {
        var container = document.getElementById('liveTvCategories');
        
        // Dodaj kategorię "★ Ulubione" na początku
        var favCount = STATE.favoriteChannels.length;
        var html = '<div class="category-item focusable favorite-category active" data-cat-id="favorites" tabindex="0">' +
                   '<span class="category-name">★ Ulubione</span>' +
                   '<span class="category-count">' + favCount + '</span></div>';
        
        // Dodaj normalne kategorie
        html += STATE.liveCategories.map(function(cat, i) {
            var count = STATE.allLiveChannels.filter(function(c) { 
                return c.category_id == cat.category_id; 
            }).length;
            var isAdult = isAdultCategory(cat.category_name);
            var isLocked = isAdult && STATE.settings.pinEnabled && !STATE.pinUnlockedCategories.includes(cat.category_id);
            return '<div class="category-item focusable' + (isLocked ? ' category-locked' : '') + 
                   '" data-cat-id="' + cat.category_id + '" tabindex="0">' +
                   '<span class="category-name">' + cat.category_name + '</span>' +
                   '<span class="category-count">' + count + '</span></div>';
        }).join('');
        
        container.innerHTML = html;
        
        container.querySelectorAll('.category-item').forEach(function(item) {
            item.addEventListener('click', function() {
                selectLiveCategory(item.dataset.catId);
            });
            item.addEventListener('keydown', function(e) {
                if (e.keyCode === KEYS.ENTER) {
                    selectLiveCategory(item.dataset.catId);
                }
            });
        });
        
        updateFocusables('liveTvCategories');
    }
    
    function selectLiveCategory(catId) {
        if (catId === 'favorites') {
            doSelectFavoriteCategory();
            return;
        }
        
        var cat = STATE.liveCategories.find(function(c) { return c.category_id == catId; });
        
        if (cat && isAdultCategory(cat.category_name) && isCategoryLocked(catId)) {
            verifyPinForCategory(catId, function() {
                doSelectLiveCategory(catId);
            });
            return;
        }
        
        doSelectLiveCategory(catId);
    }
    
    function doSelectFavoriteCategory() {
        document.querySelectorAll('#liveTvCategories .category-item').forEach(function(el) {
            el.classList.toggle('active', el.dataset.catId === 'favorites');
        });
        
        STATE.liveChannels = getFavoriteChannelsList();
        renderLiveChannels();
    }

    
    function doSelectLiveCategory(catId) {
        document.querySelectorAll('#liveTvCategories .category-item').forEach(function(el) {
            el.classList.toggle('active', el.dataset.catId == catId);
        });
        
        STATE.liveChannels = STATE.allLiveChannels.filter(function(c) {
            return c.category_id == catId;
        });
        renderLiveChannels();
    }
    
    function renderLiveChannels() {
        var container = document.getElementById('liveTvChannels');
        container.innerHTML = STATE.liveChannels.map(function(ch) {
            var locked = isAdultChannel(ch) && STATE.settings.pinEnabled && !STATE.pinUnlockedCategories.includes(ch.category_id);
            var isFav = isFavoriteChannel(ch.stream_id);
            return '<div class="channel-item focusable' + (locked ? ' channel-locked' : '') + (isFav ? ' is-favorite' : '') + '" data-stream-id="' + ch.stream_id + '" tabindex="0">' +
                   '<img class="channel-logo" src="' + (ch.stream_icon || '') + '" onerror="this.style.background=\'#333\'">' +
                   '<div class="channel-info"><div class="channel-name">' + ch.name + '</div>' +
                   '<div class="channel-epg-preview">' + (ch.epg_channel_id || '') + '</div></div>' +
                   (isFav ? '<div class="favorite-star">★</div>' : '') + '</div>';
        }).join('');
        
        container.querySelectorAll('.channel-item').forEach(function(item) {
            var longPressTimer = null;
            var longPressTriggered = false;
            var rightPressTime = 0;
            
            // CLICK - obsługa myszy
            item.addEventListener('click', function() {
                if (longPressTriggered) {
                    longPressTriggered = false;
                    return;
                }
                playLiveChannel(item.dataset.streamId, false);
            });
            
            // KEYDOWN - start long press na STRZAŁCE W PRAWO
            item.addEventListener('keydown', function(e) {
                // ENTER - normalny wybór kanału
                if (e.keyCode === KEYS.ENTER) {
                    playLiveChannel(item.dataset.streamId, true);
                    e.preventDefault();
                    return;
                }
                
                // STRZAŁKA W PRAWO - long press = ulubione
                if (e.keyCode === KEYS.RIGHT) {
                    // Ignoruj auto-repeat (jeśli timer już działa)
                    if (rightPressTime !== 0 || longPressTimer) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                    
                    rightPressTime = Date.now();
                    
                    // Timer na long press (1 sekunda)
                    longPressTimer = setTimeout(function() {
                        var id = item.dataset.streamId;
                        toggleFavoriteChannel(id);
                        
                        // Odśwież ikonę gwiazdki
                        if (isFavoriteChannel(id)) {
                            item.classList.add('is-favorite');
                            if (!item.querySelector('.favorite-star')) {
                                var star = document.createElement('div');
                                star.className = 'favorite-star';
                                star.textContent = '★';
                                item.appendChild(star);
                            }
                        } else {
                            item.classList.remove('is-favorite');
                            var star = item.querySelector('.favorite-star');
                            if (star) star.remove();
                        }
                        
                        // Odśwież listę jeśli jesteśmy w kategorii ulubionych
                        var activeCat = document.querySelector('#liveTvCategories .category-item.active');
                        if (activeCat && activeCat.dataset.catId === 'favorites') {
                            setTimeout(function() {
                                doSelectFavoriteCategory();
                            }, 500);
                        }
                        
                        // Odśwież licznik
                        var favCat = document.querySelector('#liveTvCategories .favorite-category .category-count');
                        if (favCat) {
                            favCat.textContent = STATE.favoriteChannels.length;
                        }
                        
                        longPressTriggered = true;
                    }, 1000);
                    
                    e.preventDefault(); // Blokuj nawigację podczas przytrzymywania
                    e.stopPropagation();
                    return;
                }
            });
            
            // KEYUP - sprawdź czy było long press czy short press
            item.addEventListener('keyup', function(e) {
                if (e.keyCode === KEYS.RIGHT) {
                    var pressDuration = Date.now() - rightPressTime;
                    
                    // Reset zmiennych
                    rightPressTime = 0;
                    
                    if (longPressTimer) {
                        clearTimeout(longPressTimer);
                        longPressTimer = null;
                    }
                    
                    // Jeśli było krótkie naciśnięcie (< 1s) i nie było long press
                    // Wywołaj normalną nawigację w prawo
                    if (pressDuration < 1000 && !longPressTriggered) {
                        // Krótkie naciśnięcie - przejdź do prawej strony (player)
                        var playerArea = document.querySelector('.player-area');
                        if (playerArea) {
                            var firstFocusable = playerArea.querySelector('.focusable');
                            if (firstFocusable) {
                                firstFocusable.focus();
                            }
                        }
                    }
                    
                    // Reset flagi long press
                    longPressTriggered = false;
                }
            });
        });
        
        updateFocusables('liveTvChannels');
    }


    
    function playLiveChannel(streamId, fromKeyboard) {
        var channel = STATE.allLiveChannels.find(function(c) { return c.stream_id == streamId; });
        if (!channel) return;
        
        var now = Date.now();
        // Double click/press = fullscreen (dla myszy i klawiatury)
        if (STATE.lastClick.id == streamId && (now - STATE.lastClick.time) < 1500) {
            goFullscreen();
            return;
        }
        STATE.lastClick = { id: streamId, time: now };
        
        document.querySelectorAll('#liveTvChannels .channel-item').forEach(function(el) {
            el.classList.toggle('active', el.dataset.streamId == streamId);
        });
        
        STATE.currentChannel = channel;
        
        var url = STATE.serverUrl.endsWith('/') ? STATE.serverUrl : STATE.serverUrl + '/';
        var format = STATE.settings.streamFormat || 'm3u8';
        var streamUrl = url + 'live/' + STATE.username + '/' + STATE.password + '/' + streamId + '.' + format;
        
        log('Playing channel: ' + channel.name, 'info');
        log('Stream URL: ' + streamUrl, 'debug');
        log('FORCE_HLS: ' + FORCE_HLS, 'debug');
        log('isTizenOS: ' + STATE.isTizenOS, 'debug');
        
        showLoading('playerLoading', true);
        
        var video = document.getElementById('liveTvVideo');
        var avplayer = document.getElementById('avplayer');
        
        if (video) video.style.display = 'none';
        if (avplayer) avplayer.style.display = 'none';
        
        if (STATE.isTizenOS && !FORCE_HLS) {
            log('Trying AVPlay for Live TV', 'info');
            if (avplayer) avplayer.style.display = 'block';
            playAVPlay(streamUrl, 'liveTvPlayerContainer');
        } else {
            log('Using HLS for Live TV (FORCE_HLS=' + FORCE_HLS + ')', 'info');
            if (!video) {
                log('ERROR: liveTvVideo element not found! ', 'error');
                showLoading('playerLoading', false);
                showAlert('error', 'Brak elementu video');
                return;
            }
            video.style.display = 'block';
            playHLS(video, streamUrl);
        }
        
        document.getElementById('epgChannelName').textContent = channel.name;
        document.getElementById('epgCurrent').textContent = 'Ładowanie EPG...';
        document.getElementById('epgNext').textContent = '';
        
        loadEPG(streamId);
    }
    
    function switchChannel(direction) {
        if (!STATE.currentChannel || STATE.liveChannels.length === 0) return;
        
        var currentIndex = STATE.liveChannels.findIndex(function(c) {
            return c.stream_id == STATE.currentChannel.stream_id;
        });
        
        if (currentIndex === -1) return;
        
        var newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = STATE.liveChannels. length - 1;
        if (newIndex >= STATE.liveChannels.length) newIndex = 0;
        
        playLiveChannel(STATE.liveChannels[newIndex].stream_id, true);
    }
    
    // ==================== EPG ====================
    function loadEPG(streamId) {
        var url = STATE.serverUrl.endsWith('/') ? STATE.serverUrl : STATE.serverUrl + '/';
        
        httpRequest(url + 'player_api.php?username=' + STATE.username + '&password=' + STATE.password + 
              '&action=get_short_epg&stream_id=' + streamId)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data && data.epg_listings && data.epg_listings. length > 0) {
                    displayEPG(data.epg_listings);
                    
                    if (STATE.epgInterval) clearInterval(STATE.epgInterval);
                    STATE.epgInterval = setInterval(function() {
                        displayEPG(data.epg_listings);
                    }, 30000);
                } else {
                    document.getElementById('epgCurrent').textContent = 'Brak danych EPG';
                    document.getElementById('epgNext').textContent = '';
                    document.getElementById('epgProgress').style.width = '0%';
                }
            })
            .catch(function() {
                document.getElementById('epgCurrent').textContent = 'Błąd EPG';
            });
    }
    
    function displayEPG(listings) {
        var now = Math.floor(Date.now() / 1000);
        var current = null, next = null;
        
        for (var i = 0; i < listings.length; i++) {
            var prog = listings[i];
            var start = parseInt(prog.start_timestamp) || parseTime(prog.start);
            var stop = parseInt(prog.stop_timestamp) || parseTime(prog.stop);
            
            if (start <= now && now <= stop) {
                current = { title: prog.title, start: start, stop: stop };
                if (i + 1 < listings.length) {
                    var n = listings[i + 1];
                    next = { title:  n.title, start: parseInt(n.start_timestamp) || parseTime(n.start) };
                }
                break;
            }
        }
        
        if (current) {
            var title = decodeBase64(current.title) || current.title;
            var startTime = new Date(current.start * 1000).toLocaleTimeString('pl-PL', { hour:  '2-digit', minute: '2-digit' });
            var stopTime = new Date(current. stop * 1000).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            
            document.getElementById('epgCurrent').textContent = startTime + ' - ' + stopTime + ' ' + title;
            
            var progress = Math.min(100, Math.max(0, ((now - current.start) / (current.stop - current.start)) * 100));
            document.getElementById('epgProgress').style.width = progress + '%';
        } else {
            document.getElementById('epgCurrent').textContent = 'Brak programu';
            document.getElementById('epgProgress').style.width = '0%';
        }
        
        if (next) {
            var nextTitle = decodeBase64(next.title) || next.title;
            var nextTime = new Date(next.start * 1000).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            document.getElementById('epgNext').textContent = 'Następny:   ' + nextTime + ' ' + nextTitle;
        } else {
            document. getElementById('epgNext').textContent = '';
        }
        
        var container = document.getElementById('liveTvPlayerContainer');
        if (container && container.classList.contains('custom-fullscreen')) {
            updateFullscreenEpgData();
        }
    }
    
    function parseTime(timeStr) {
        if (!timeStr) return 0;
        try {
            return Math.floor(new Date(timeStr. replace(' ', 'T')).getTime() / 1000);
        } catch (e) {
            return 0;
        }
    }
    
    function decodeBase64(str) {
        if (!str) return str;
        try {
            if (/^[A-Za-z0-9+/=]+$/.test(str) && str.length > 10) {
                return decodeURIComponent(escape(atob(str)));
            }
            return str;
        } catch (e) {
            return str;
        }
    }
    // ==================== FULLSCREEN ====================
    function goFullscreen() {
        var container = document.getElementById('liveTvPlayerContainer');
        var leftPanel = document.querySelector('.left-panel');
        var epgPanel = document.querySelector('.epg-panel');
        var topNav = document.querySelector('#liveTvScreen .top-nav');
        
        // Zapisz aktualny fokus przed wejściem w fullscreen
        STATE.lastFocusedElement = document.activeElement;
        log('Saving focus before fullscreen: ', 'debug');
        
        if (container. classList.contains('custom-fullscreen')) {
            container.classList.remove('custom-fullscreen');
            if (leftPanel) leftPanel.style.display = '';
            if (epgPanel) epgPanel.style.display = '';
            if (topNav) topNav.style.display = '';
            hideFullscreenEpg();
            log('Exiting custom fullscreen', 'debug');
            
            if (STATE.isTizenOS && STATE.avplayReady) {
                setTimeout(function() {
                    updateAVPlayRect('liveTvPlayerContainer');
                }, 100);
            }
            
            // Przywróć fokus po wyjściu z fullscreen
            setTimeout(function() {
                if (STATE.lastFocusedElement && STATE.lastFocusedElement.classList.contains('focusable')) {
                    STATE.lastFocusedElement.focus();
                    log('Restored focus to: ' + STATE.lastFocusedElement.id || 'unknown', 'debug');
                } else {
                    // Fallback: znajdź pierwszy focusable w Live TV
                    var fallbackFocusable = document.querySelector('#liveTvScreen .focusable');
                    if (fallbackFocusable) {
                        fallbackFocusable.focus();
                        log('Fallback focus to first element in Live TV', 'debug');
                    }
                }
            }, 150);
            return;
        }
        
        if (FORCE_HLS) {
            log('Using custom fullscreen (emulator mode)', 'debug');
            enableCustomFullscreen();
            return;
        }
        
        try {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(function() {});
                return;
            }
            
            if (container.requestFullscreen) {
                container.requestFullscreen().then(function() {
                    log('Native fullscreen OK', 'debug');
                    showFullscreenEpg();
                }).catch(function(e) {
                    log('Native fullscreen failed: ' + e. message + ', using custom', 'debug');
                    enableCustomFullscreen();
                });
                return;
            }
        } catch (e) {
            log('Fullscreen API error: ' + e.message, 'debug');
        }
        
        enableCustomFullscreen();
        
        function enableCustomFullscreen() {
            container.classList.add('custom-fullscreen');
            if (leftPanel) leftPanel.style.display = 'none';
            if (epgPanel) epgPanel.style.display = 'none';
            if (topNav) topNav.style.display = 'none';
            log('Custom fullscreen enabled', 'debug');
            
            showFullscreenEpg();
            
            if (STATE.isTizenOS && STATE.avplayReady) {
                setTimeout(function() {
                    updateAVPlayRect('liveTvPlayerContainer');
                }, 100);
            }
        }
    }
    
    function showFullscreenEpg() {
        var overlay = document.getElementById('fullscreenEpgOverlay');
        
        if (! overlay) {
            log('ERROR: fullscreenEpgOverlay element not found!', 'error');
            return;
        }
        
        updateFullscreenEpgData();
        
        overlay.classList.add('show');
        overlay.style.display = 'block';
        overlay.style.opacity = '1';
        overlay.style.transform = 'translateY(0)';
        
        clearTimeout(fsEpgTimeout);
        fsEpgTimeout = setTimeout(function() {
            hideFullscreenEpg();
        }, 5000);
        
        log('Fullscreen EPG shown', 'success');
    }

    function hideFullscreenEpg() {
        var overlay = document.getElementById('fullscreenEpgOverlay');
        if (overlay) {
            overlay. classList.remove('show');
            overlay.style.opacity = '0';
            overlay. style.transform = 'translateY(100%)';
            overlay.style.display = 'none';
        }
        clearTimeout(fsEpgTimeout);
        log('Fullscreen EPG hidden', 'debug');
    }

    function updateFullscreenEpgData() {
        if (!STATE.currentChannel) return;
        
        var logo = document.getElementById('fsChannelLogo');
        if (logo) {
            logo. src = STATE.currentChannel.stream_icon || '';
            logo. alt = STATE.currentChannel.name || '';
        }
        
        var currentTime = document.getElementById('epgCurrent').textContent;
        var nextText = document.getElementById('epgNext').textContent;
        var progress = document.getElementById('epgProgress').style.width;
        
        var currentMatch = currentTime.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\s*(.+)/);
        if (currentMatch) {
            document.getElementById('fsCurrentTime').textContent = currentMatch[1] + ' - ' + currentMatch[2];
            document.getElementById('fsCurrentTitle').textContent = currentMatch[3]. trim();
        } else {
            document.getElementById('fsCurrentTime').textContent = '--:--';
            document.getElementById('fsCurrentTitle').textContent = currentTime || 'Brak programu';
        }
        
        if (nextText && nextText.length > 0) {
            var cleanNext = nextText.replace('Następny:', '').trim();
            var nextMatch = cleanNext.match(/^(\d{2}:\d{2})\s+(.+)$/);
            if (nextMatch) {
                document.getElementById('fsNextTime').textContent = nextMatch[1];
                document.getElementById('fsNextTitle').textContent = nextMatch[2].trim();
            } else {
                document.getElementById('fsNextTime').textContent = '';
                document.getElementById('fsNextTitle').textContent = cleanNext || 'Brak danych';
            }
        } else {
            document.getElementById('fsNextTime').textContent = '';
            document.getElementById('fsNextTitle').textContent = 'Brak danych';
        }
        
        document.getElementById('fsEpgProgressBar').style.width = progress || '0%';
    }

    function toggleFullscreenEpg() {
        var overlay = document.getElementById('fullscreenEpgOverlay');
        if (overlay. classList.contains('show')) {
            hideFullscreenEpg();
        } else {
            showFullscreenEpg();
        }
    }
    
    function updateAVPlayRect(containerId) {
        if (typeof webapis === 'undefined' || !webapis.avplay || !STATE.avplayReady) return;
        
        try {
            var container = document. getElementById(containerId);
            var rect;
            
            if (container. classList.contains('custom-fullscreen')) {
                rect = { x: 0, y: 0, width: window.innerWidth || 1920, height: window.innerHeight || 1080 };
            } else {
                var cr = container.getBoundingClientRect();
                rect = { x:  Math.round(cr.left), y: Math.round(cr.top), width: Math.round(cr.width), height: Math.round(cr.height) };
            }
            
            log('Updating AVPlay rect:  ' + rect.x + ',' + rect.y + ' ' + rect.width + 'x' + rect.height, 'debug');
            webapis.avplay.setDisplayRect(rect. x, rect.y, rect. width, rect.height);
        } catch (e) {
            log('updateAVPlayRect error: ' + e.message, 'warn');
        }
    }
    
    // ==================== MOVIES ====================
    function loadMovies() {
        var url = STATE.serverUrl.endsWith('/') ? STATE.serverUrl : STATE.serverUrl + '/';
        var u = STATE.username, p = STATE.password;
        
        httpRequest(url + 'player_api.php?username=' + u + '&password=' + p + '&action=get_vod_categories')
            .then(function(r) { return r.json(); })
            .then(function(cats) {
                STATE.vodCategories = cats || [];
                renderMovieCategories();
                
                if (STATE.vodCategories.length > 0) {
                    selectMovieCategory(STATE.vodCategories[0].category_id);
                }
            });
    }
    
    function renderMovieCategories() {
        var container = document.getElementById('moviesCategories');
        
        // Dodaj kategorię Historia na początku
        var historyCount = getWatchHistory('movies').length;
        var html = '<div class="category-item focusable history-category active" data-cat-id="history" tabindex="0">' +
                   '<span class="category-name">📜 Historia</span>' +
                   '<span class="category-count">' + historyCount + '</span></div>';
        
        // Dodaj normalne kategorie
        html += STATE.vodCategories.map(function(cat, i) {
            var count = STATE.allMovies.filter(function(m) { 
                return m.category_id == cat.category_id; 
            }).length;
            return '<div class="category-item focusable" data-cat-id="' + cat.category_id + '" tabindex="0">' +
                   '<span class="category-name">' + cat.category_name + '</span>' +
                   '<span class="category-count">' + count + '</span></div>';
        }).join('');
        
        container.innerHTML = html;
        
        container.querySelectorAll('.category-item').forEach(function(item) {
            item.addEventListener('click', function() {
                selectMovieCategory(item.dataset.catId);
            });
            item.addEventListener('keydown', function(e) {
                if (e.keyCode === KEYS.ENTER) {
                    selectMovieCategory(item.dataset.catId);
                }
            });
        });
        
        updateFocusables('moviesCategories');
    }
    
    function selectMovieCategory(catId) {
        document.querySelectorAll('#moviesCategories .category-item').forEach(function(el) {
            el.classList.toggle('active', el.dataset.catId == catId);
        });
        
        if (catId === 'history') {
            // Pokaż filmy z historii
            var historyItems = getWatchHistory('movies');
            STATE.vodMovies = historyItems.map(function(h) {
                return STATE.allMovies.find(function(m) { return m.stream_id == h.id; });
            }).filter(Boolean); // Usuń undefined
        } else {
            // Normalna kategoria
            STATE.vodMovies = STATE.allMovies.filter(function(m) {
                return m.category_id == catId;
            });
        }
        renderMovies();
    }
    
    function renderMovies() {
        var container = document.getElementById('moviesGrid');
        container.innerHTML = STATE.vodMovies.map(function(m) {
            var rating = m.rating || m.rating_5based || '';
            if (m.rating_5based) rating = (parseFloat(m.rating_5based) * 2).toFixed(1);
            return '<div class="vod-item focusable" data-stream-id="' + m.stream_id + 
                   '" data-ext="' + (m.container_extension || 'mp4') + '" tabindex="0">' +
                   '<img class="vod-poster" src="' + (m.stream_icon || m.cover || '') + 
                   '" onerror="this.style.background=\'#21262d\'">' +
                   '<div class="vod-info"><div class="vod-title">' + (m.name || m.title || 'Bez tytułu') + '</div>' +
                   '<div class="vod-meta">' + (rating ?  '★ ' + rating : '') + '</div></div></div>';
        }).join('');
        
        container.querySelectorAll('.vod-item').forEach(function(item) {
            item.addEventListener('click', function() {
                openMovieDetails(item.dataset.streamId);
            });
            item.addEventListener('keydown', function(e) {
                if (e.keyCode === KEYS.ENTER) {
                    openMovieDetails(item.dataset.streamId);
                }
            });
        });
        
        updateFocusables('moviesGrid');
    }
    
    function openMovieDetails(streamId) {
        var movie = STATE.allMovies.find(function(m) { return m.stream_id == streamId; });
        if (!movie) {
            log('Movie not found: ' + streamId, 'error');
            return;
        }
        
        var url = STATE.serverUrl.endsWith('/') ? STATE.serverUrl :  STATE.serverUrl + '/';
        var u = STATE.username, p = STATE.password;
        
        httpRequest(url + 'player_api.php?username=' + u + '&password=' + p + '&action=get_vod_info&vod_id=' + streamId)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data && data.info) {
                    movie = Object.assign({}, movie, data.info);
                    if (data.movie_data) {
                        movie = Object.assign(movie, data. movie_data);
                    }
                }
                showMovieDetails(movie);
            })
            .catch(function(err) {
                log('Error getting movie info: ' + err.message, 'warn');
                showMovieDetails(movie);
            });
    }
    
    function showMovieDetails(movie) {
        STATE.currentMovie = movie;
        log('Showing movie details:  ' + movie.name, 'info');
        
        document.getElementById('moviePoster').src = movie.stream_icon || '';
        document.getElementById('movieBackdrop').style.backgroundImage = 'url(' + (movie.stream_icon || '') + ')';
        document.getElementById('movieTitle').textContent = movie.name || '--';
        document.getElementById('movieYear').textContent = movie.year || movie.releaseDate || '--';
        
        var duration = '--';
        if (movie.duration) {
            var dur = movie.duration;
            if (typeof dur === 'string' && dur.indexOf(':') !== -1) {
                duration = dur;
            } else {
                var mins = parseInt(dur);
                if (mins > 0) {
                    var hours = Math.floor(mins / 60);
                    var minutes = mins % 60;
                    duration = hours > 0 ? hours + 'h ' + minutes + 'min' : minutes + ' min';
                }
            }
        }
        document.getElementById('movieDuration').textContent = duration;
        
        var rating = movie.rating || movie. rating_5based;
        if (rating) {
            var ratingNum = parseFloat(rating);
            if (movie.rating_5based) ratingNum = ratingNum * 2;
            document.getElementById('movieRating').textContent = ratingNum.toFixed(1) + '/10';
        } else {
            document.getElementById('movieRating').textContent = '--';
        }
        
        document.getElementById('movieGenres').textContent = movie.genre || movie.category_name || '--';
        document. getElementById('moviePlot').textContent = movie.plot || movie.description || 'Brak opisu';
        
        var castParts = [];
        if (movie. director) castParts.push('Reżyser: ' + movie.director);
        if (movie.cast) castParts.push('Obsada: ' + movie.cast);
        document.getElementById('movieCast').textContent = castParts.join(' | ') || '';
        
        var trailerBtn = document.getElementById('btnTrailer');
        if (movie.trailer_url || movie.youtube_trailer) {
            trailerBtn.style.display = 'inline-flex';
            trailerBtn.onclick = function() {
                window.open(movie.trailer_url || movie.youtube_trailer, '_blank');
            };
        } else {
            trailerBtn. style.display = 'none';
        }
        
        showScreen('movieDetails');
    }
    
    function playCurrentMovie() {
        if (!STATE.currentMovie) return;
        
        var movie = STATE.currentMovie;
        
        // Dodaj do historii oglądania
        addToWatchHistory('movies', movie);
        
        var ext = STATE.settings.vodFormat || 'mp4';
        var url = STATE.serverUrl.endsWith('/') ? STATE.serverUrl : STATE.serverUrl + '/';
        var streamUrl = url + 'movie/' + STATE.username + '/' + STATE.password + '/' + movie.stream_id + '.' + ext;
        
        log('Playing movie: ' + movie.name, 'info');
        log('Stream URL: ' + streamUrl, 'debug');
        
        var title = movie.name || 'Film';
        openVideoOverlay(streamUrl, title);
    }
    
    // ==================== SERIES ====================
    function loadSeries() {
        var url = STATE.serverUrl.endsWith('/') ? STATE.serverUrl : STATE. serverUrl + '/';
        var u = STATE.username, p = STATE.password;
        
        httpRequest(url + 'player_api.php?username=' + u + '&password=' + p + '&action=get_series_categories')
            .then(function(r) { return r.json(); })
            .then(function(cats) {
                STATE.seriesCategories = cats || [];
                renderSeriesCategories();
                
                if (STATE.seriesCategories.length > 0) {
                    selectSeriesCategory(STATE.seriesCategories[0].category_id);
                }
            });
    }
    
    function renderSeriesCategories() {
        var container = document.getElementById('seriesCategories');
        
        // Dodaj kategorię Historia na początku
        var historyCount = getWatchHistory('series').length;
        var html = '<div class="category-item focusable history-category active" data-cat-id="history" tabindex="0">' +
                   '<span class="category-name">📜 Historia</span>' +
                   '<span class="category-count">' + historyCount + '</span></div>';
        
        // Dodaj normalne kategorie
        html += STATE.seriesCategories.map(function(cat, i) {
            var count = STATE.allSeries.filter(function(s) { 
                return s.category_id == cat.category_id; 
            }).length;
            return '<div class="category-item focusable" data-cat-id="' + cat.category_id + '" tabindex="0">' +
                   '<span class="category-name">' + cat.category_name + '</span>' +
                   '<span class="category-count">' + count + '</span></div>';
        }).join('');
        
        container.innerHTML = html;
        
        container.querySelectorAll('.category-item').forEach(function(item) {
            item.addEventListener('click', function() {
                selectSeriesCategory(item.dataset.catId);
            });
            item.addEventListener('keydown', function(e) {
                if (e.keyCode === KEYS.ENTER) {
                    selectSeriesCategory(item.dataset.catId);
                }
            });
        });
        
        updateFocusables('seriesCategories');
    }
    
    function selectSeriesCategory(catId) {
        document.querySelectorAll('#seriesCategories .category-item').forEach(function(el) {
            el.classList.toggle('active', el.dataset.catId == catId);
        });
        
        if (catId === 'history') {
            // Pokaż seriale z historii
            var historyItems = getWatchHistory('series');
            STATE.seriesList = historyItems.map(function(h) {
                return STATE.allSeries.find(function(s) { return s.series_id == h.id; });
            }).filter(Boolean); // Usuń undefined
        } else {
            // Normalna kategoria
            STATE.seriesList = STATE.allSeries.filter(function(s) {
                return s.category_id == catId;
            });
        }
        renderSeries();
    }
    
    function renderSeries() {
        var container = document.getElementById('seriesGrid');
        container.innerHTML = STATE.seriesList.map(function(s) {
            return '<div class="vod-item focusable" data-series-id="' + s.series_id + '" tabindex="0">' +
                   '<img class="vod-poster" src="' + (s.cover || '') + 
                   '" onerror="this.style.background=\'#21262d\'">' +
                   '<div class="vod-info"><div class="vod-title">' + (s.name || s.title || 'Bez tytułu') + '</div>' +
                   '<div class="vod-meta">' + (s.rating || '') + '</div></div></div>';
        }).join('');
        
        container.querySelectorAll('.vod-item').forEach(function(item) {
            item.addEventListener('click', function() {
                openSeriesDetails(item.dataset.seriesId);
            });
            item.addEventListener('keydown', function(e) {
                if (e.keyCode === KEYS.ENTER) {
                    openSeriesDetails(item.dataset.seriesId);
                }
            });
        });
        
        updateFocusables('seriesGrid');
    }
    
    function openSeriesDetails(seriesId) {
        var url = STATE.serverUrl.endsWith('/') ? STATE.serverUrl :  STATE.serverUrl + '/';
        var u = STATE.username, p = STATE.password;
        
        httpRequest(url + 'player_api.php?username=' + u + '&password=' + p + '&action=get_series_info&series_id=' + seriesId)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data || !data.info) {
                    showAlert('error', 'Nie można załadować serialu');
                    return;
                }
                
                STATE.currentSeries = data;
                
                document.getElementById('detailsPoster').src = data.info.cover || '';
                document. getElementById('detailsTitle').textContent = data.info. name || 'Bez tytułu';
                document.getElementById('detailsYear').textContent = 'Rok: ' + (data.info.releaseDate || data.info.year || '--');
                document.getElementById('detailsRating').textContent = 'Ocena: ' + (data.info.rating || '--');
                document.getElementById('detailsGenre').textContent = 'Gatunek: ' + (data. info.genre || '--');
                document.getElementById('detailsPlot').textContent = data.info.plot || 'Brak opisu';
                
                var seasons = Object.keys(data.episodes || {}).sort(function(a, b) { return a - b; });
                document.getElementById('seasonsTabs').innerHTML = seasons.map(function(s, i) {
                    return '<button class="season-tab focusable' + (i === 0 ?  ' active' : '') + 
                           '" data-season="' + s + '" tabindex="0">Sezon ' + s + '</button>';
                }).join('');
                
                document.querySelectorAll('#seasonsTabs .season-tab').forEach(function(btn) {
                    btn.addEventListener('click', function() {
                        selectSeason(btn.dataset.season);
                    });
                    btn.addEventListener('keydown', function(e) {
                        if (e.keyCode === KEYS.ENTER) {
                            selectSeason(btn.dataset.season);
                        }
                    });
                });
                
                if (seasons.length > 0) {
                    selectSeason(seasons[0]);
                }
                
                showScreen('seriesDetails');
            })
            .catch(function(err) {
                log('Series error: ' + err.message, 'error');
                showAlert('error', 'Błąd ładowania');
            });
    }
    
    function selectSeason(seasonNum) {
        document.querySelectorAll('#seasonsTabs .season-tab').forEach(function(el) {
            el.classList.toggle('active', el.dataset.season == seasonNum);
        });
        
        STATE.currentSeasonEpisodes = STATE.currentSeries.episodes[seasonNum] || [];
        renderEpisodes();
    }
    
    function renderEpisodes() {
        var container = document.getElementById('episodesList');
        container.innerHTML = STATE.currentSeasonEpisodes.map(function(ep) {
            return '<div class="episode-item focusable" data-episode-id="' + ep. id + 
                   '" data-ext="' + (ep.container_extension || 'mp4') + '" tabindex="0">' +
                   '<img class="episode-thumb" src="' + ((ep.info && ep.info.movie_image) || '') + 
                   '" onerror="this. style.background=\'#21262d\'">' +
                   '<div class="episode-info"><div class="episode-number">Odcinek ' + ep.episode_num + '</div>' +
                   '<div class="episode-title">' + (ep.title || 'Odcinek ' + ep.episode_num) + '</div>' +
                   '<div class="episode-duration">' + ((ep.info && ep.info.duration) || '') + '</div></div></div>';
        }).join('');
        
        container. querySelectorAll('.episode-item').forEach(function(item) {
            item.addEventListener('click', function() {
                playEpisode(item.dataset.episodeId, item.dataset.ext);
            });
            item.addEventListener('keydown', function(e) {
                if (e.keyCode === KEYS.ENTER) {
                    playEpisode(item.dataset.episodeId, item.dataset.ext);
                }
            });
        });
        
        updateFocusables('episodesList');
    }
    
    function playEpisode(episodeId, ext) {
        var url = STATE.serverUrl.endsWith('/') ? STATE.serverUrl : STATE.serverUrl + '/';
        var streamUrl = url + 'series/' + STATE.username + '/' + STATE.password + '/' + episodeId + '.' + (ext || 'mp4');
        
        log('Playing episode: ' + streamUrl, 'info');
        
        var episodeInfo = '';
        var seasonNum = '';
        var episodeNum = '';
        
        if (STATE.currentSeasonEpisodes && STATE.currentSeasonEpisodes.length > 0) {
            var episode = STATE.currentSeasonEpisodes.find(function(ep) {
                return ep.id == episodeId;
            });
            
            if (episode) {
                seasonNum = episode.season;
                episodeNum = episode.episode_num;
                episodeInfo = 'S' + seasonNum + 'E' + episodeNum;
                if (episode.title) {
                    episodeInfo += ' - ' + episode.title;
                }
            }
        }
        
        // Dodaj do historii oglądania
        if (STATE.currentSeries) {
            addToWatchHistory('series', {
                series_id: STATE.currentSeries.series_id,
                name: STATE.currentSeries.info ? STATE.currentSeries.info.name : 'Serial',
                cover: STATE.currentSeries.info ? STATE.currentSeries.info.cover : '',
                episodeId: episodeId,
                seasonNum: seasonNum,
                episodeNum: episodeNum
            });
        }
        
        var seriesTitle = STATE.currentSeries && STATE.currentSeries.info ? STATE.currentSeries.info.name : 'Serial';
        
        openVideoOverlay(streamUrl, seriesTitle, episodeInfo);
    }
    
    // ==================== VIDEO OVERLAY ====================
    function openVideoOverlay(streamUrl, title, episodeInfo) {
        var overlay = document. getElementById('videoOverlay');
        var overlayVideo = document.getElementById('overlayVideo');
        
        log('Opening video overlay:  ' + (title || 'Unknown'), 'info');
        log('Episode info: ' + (episodeInfo || 'N/A'), 'debug');
        
        showLoading('overlayLoading', true);
        
        if (STATE.isTizenOS && typeof webapis !== 'undefined' && webapis.avplay && !FORCE_HLS) {
            var avplayer = document.getElementById('avplayerOverlay');
            avplayer.style.display = 'block';
            overlayVideo.style.display = 'none';
            
            initAVPlayVodControls(title || 'Odtwarzanie', episodeInfo || '');
            
            try {
                playAVPlay(streamUrl, 'videoOverlay');
            } catch (e) {
                log('AVPlay failed, using HLS:  ' + e.message, 'warn');
                avplayer.style.display = 'none';
                overlayVideo.style.display = 'block';
                playHLS(overlayVideo, streamUrl);
                initVodControls(overlayVideo, title || 'Odtwarzanie', episodeInfo || '');
            }
        } else {
            log('Using HLS player for VOD', 'info');
            document.getElementById('avplayerOverlay').style.display = 'none';
            overlayVideo.style.display = 'block';
            playHLS(overlayVideo, streamUrl);
            
            initVodControls(overlayVideo, title || 'Odtwarzanie', episodeInfo || '');
        }
        
        overlay. classList.add('active');
        
        setTimeout(function() {
            var firstBtn = document.getElementById('vodBtnPlayPause');
            if (firstBtn) firstBtn.focus();
        }, 100);
    }
    
    function closeVideoOverlay() {
        var overlay = document.getElementById('videoOverlay');
        
        hideFullscreenEpg();
        
        if (STATE.isTizenOS) {
            cleanupAVPlayVodControls();
        } else {
            cleanupVodControls();
        }
        
        if (STATE.isTizenOS) {
            stopAVPlay();
            var avplayer = document.getElementById('avplayerOverlay');
            avplayer.style.display = 'none';
        }
        
        var video = document.getElementById('overlayVideo');
        video.pause();
        video.src = '';
        video.style.display = 'none';
        
        if (STATE.hls) {
            STATE.hls.destroy();
            STATE.hls = null;
        }
        
        showLoading('overlayLoading', false);
        overlay.classList.remove('active');

        // Przywróć fokus po zamknięciu nakładki wideo
        setTimeout(function() {
            var currentScreen = document.getElementById(STATE.currentScreen + 'Screen');
            if (currentScreen) {
                var firstFocusable = currentScreen.querySelector('.focusable');
                if (firstFocusable) {
                    firstFocusable.focus();
                }
            }
        }, 100);
    }
    // ==================== VOD PLAYER CONTROLS ====================
    function showVodControls() {
        var controls = document.getElementById('vodControls');
        if (! controls) return;
        
        controls.classList.add('show');
        vodControlsVisible = true;
        
        clearTimeout(vodControlsTimeout);
        vodControlsTimeout = setTimeout(function() {
            hideVodControls();
        }, 5000);
    }

    function hideVodControls() {
        var controls = document. getElementById('vodControls');
        if (controls) {
            controls.classList.remove('show');
            vodControlsVisible = false;
        }
        clearTimeout(vodControlsTimeout);
    }

    function toggleVodControls() {
        if (vodControlsVisible) {
            hideVodControls();
        } else {
            showVodControls();
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity) return '00:00';
        
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        var s = Math.floor(seconds % 60);
        
        if (h > 0) {
            return (h < 10 ? '0' : '') + h + ':' + 
                   (m < 10 ? '0' : '') + m + ':' + 
                   (s < 10 ?   '0' : '') + s;
        } else {
            return (m < 10 ?  '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
        }
    }

    function updateVodProgress() {
        if (!vodCurrentVideo || vodIsSeeking) return;
        
        var current = vodCurrentVideo.currentTime || 0;
        var duration = vodCurrentVideo.duration || 0;
        
        if (duration > 0) {
            var progress = (current / duration) * 100;
            document. getElementById('vodSeekbarProgress').style.width = progress + '%';
            document.getElementById('vodSeekbarThumb').style.left = progress + '%';
        }
        
        document.getElementById('vodTimeCurrent').textContent = formatTime(current);
        document.getElementById('vodTimeTotal').textContent = formatTime(duration);
    }

    function vodPlayPause() {
        if (!vodCurrentVideo) return;
        
        if (vodIsPlaying) {
            vodCurrentVideo.pause();
            document.getElementById('vodPlayIcon').style.display = 'block';
            document.getElementById('vodPauseIcon').style.display = 'none';
            document.getElementById('vodPlayIconSmall').style.display = 'block';
            document.getElementById('vodPauseIconSmall').style.display = 'none';
            vodIsPlaying = false;
        } else {
            vodCurrentVideo.play();
            document.  getElementById('vodPlayIcon').style.display = 'none';
            document.getElementById('vodPauseIcon').style.display = 'block';
            document.getElementById('vodPlayIconSmall').style.display = 'none';
            document.getElementById('vodPauseIconSmall').style.display = 'block';
            vodIsPlaying = true;
        }
        
        showVodControls();
    }

    function vodSeek(seconds) {
        if (!vodCurrentVideo) return;
        
        vodCurrentVideo.currentTime = Math.max(0, Math.min(vodCurrentVideo.duration, vodCurrentVideo.currentTime + seconds));
        showVodControls();
    }

    function vodSeekTo(percent) {
        if (!vodCurrentVideo) return;
        
        vodCurrentVideo.currentTime = (percent / 100) * vodCurrentVideo.duration;
    }

    function initVodControls(videoElement, title, episodeInfo) {
        vodCurrentVideo = videoElement;
        vodIsPlaying = true;
        
        log('initVodControls called', 'debug');
        log('Title: ' + title, 'debug');
        
        var titleElement = document.getElementById('vodTitle');
        var episodeElement = document.getElementById('vodEpisodeInfo');
        
        if (titleElement) {
            titleElement.  textContent = title || 'Odtwarzanie';
            log('Title set to: ' + titleElement.textContent, 'debug');
        }
        
        if (episodeElement) {
            episodeElement.textContent = episodeInfo || '';
            episodeElement.style.display = episodeInfo ? 'block' :   'none';
        }
        
        showVodControls();
        
        videoElement.addEventListener('timeupdate', updateVodProgress);
        
        videoElement.addEventListener('play', function() {
            vodIsPlaying = true;
            document. getElementById('vodPlayIcon').style.display = 'none';
            document.getElementById('vodPauseIcon').style.display = 'block';
            document.getElementById('vodPlayIconSmall').style.display = 'none';
            document.getElementById('vodPauseIconSmall').style.display = 'block';
            hideVodControls();
        });
        
        videoElement.addEventListener('pause', function() {
            vodIsPlaying = false;
            document.getElementById('vodPlayIcon').style.display = 'block';
            document.getElementById('vodPauseIcon').style.display = 'none';
            document.getElementById('vodPlayIconSmall').style.display = 'block';
            document.getElementById('vodPauseIconSmall').style.display = 'none';
            showVodControls();
        });
        
        videoElement.addEventListener('waiting', function() {
            document.getElementById('vodLoading').classList.add('show');
        });
        
        videoElement.addEventListener('canplay', function() {
            document.getElementById('vodLoading').classList.remove('show');
        });
        
        var seekbarTrack = document.getElementById('vodSeekbarTrack');
        if (seekbarTrack) {
            seekbarTrack.addEventListener('click', function(e) {
                var rect = seekbarTrack.getBoundingClientRect();
                var percent = ((e.clientX - rect.left) / rect.width) * 100;
                vodSeekTo(percent);
                showVodControls();
            });
        }
        
        var overlay = document.getElementById('videoOverlay');
        if (overlay) {
            overlay.  addEventListener('mousemove', function() {
                showVodControls();
            });
        }
    }

    function cleanupVodControls() {
        if (vodCurrentVideo) {
            vodCurrentVideo.removeEventListener('timeupdate', updateVodProgress);
        }
        vodCurrentVideo = null;
        vodIsPlaying = false;
        hideVodControls();
        clearTimeout(vodControlsTimeout);
    }
    
    // ==================== AVPLAY VOD SUPPORT ====================
    function initAVPlayVodControls(title, episodeInfo) {
        log('Initializing AVPlay VOD controls', 'debug');
        
        var titleElement = document.getElementById('vodTitle');
        var episodeElement = document.getElementById('vodEpisodeInfo');
        
        if (titleElement) {
            titleElement.textContent = title || 'Odtwarzanie';
        }
        
        if (episodeElement) {
            episodeElement.textContent = episodeInfo || '';
            episodeElement. style.display = episodeInfo ?  'block' : 'none';
        }
        
        showVodControls();
        
        vodIsPlaying = true;
        document.getElementById('vodPlayIcon').style.display = 'none';
        document.getElementById('vodPauseIcon').style.display = 'block';
        document.getElementById('vodPlayIconSmall').style.display = 'none';
        document.getElementById('vodPauseIconSmall').style.display = 'block';
        
        document.getElementById('vodTimeCurrent').textContent = '00:00';
        document.  getElementById('vodTimeTotal').textContent = '00:00';
        document.getElementById('vodSeekbarProgress').style.width = '0%';
        document.getElementById('vodSeekbarThumb').style.left = '0%';
    }

    function updateAVPlayVodProgress() {
        if (!STATE.isTizenOS || !STATE.avplayReady || typeof webapis === 'undefined') return;
        
        try {
            var state = webapis.avplay.getState();
            
            if (state !== 'PLAYING' && state !== 'PAUSED') {
                return;
            }
            
            var currentTime = webapis.avplay.getCurrentTime() / 1000;
            var duration = webapis.avplay.getDuration() / 1000;
            
            if (duration > 0 && ! isNaN(duration) && duration !== Infinity) {
                var progress = (currentTime / duration) * 100;
                
                var progressBar = document.getElementById('vodSeekbarProgress');
                var thumb = document.getElementById('vodSeekbarThumb');
                
                if (progressBar) {
                    progressBar.style.width = progress + '%';
                }
                
                if (thumb) {
                    thumb.style. left = progress + '%';
                }
            }
            
            var currentElement = document.getElementById('vodTimeCurrent');
            var totalElement = document.getElementById('vodTimeTotal');
            
            if (currentElement) {
                currentElement.textContent = formatTime(currentTime);
            }
            
            if (totalElement) {
                totalElement.textContent = formatTime(duration);
            }
            
        } catch (e) {
            log('AVPlay progress error:  ' + e.message, 'warn');
        }
    }

    function avplayVodPlayPause() {
        if (!STATE.isTizenOS || ! STATE.avplayReady || typeof webapis === 'undefined') return;
        
        try {
            var state = webapis.avplay.  getState();
            
            if (state === 'PAUSED') {
                webapis.  avplay.play();
                vodIsPlaying = true;
                document.getElementById('vodPlayIcon').style.display = 'none';
                document.getElementById('vodPauseIcon').style.display = 'block';
                document.  getElementById('vodPlayIconSmall').style.display = 'none';
                document.getElementById('vodPauseIconSmall').style.display = 'block';
                log('AVPlay resumed', 'debug');
            } else if (state === 'PLAYING') {
                webapis. avplay.pause();
                vodIsPlaying = false;
                document.  getElementById('vodPlayIcon').style.display = 'block';
                document.getElementById('vodPauseIcon').style.display = 'none';
                document.getElementById('vodPlayIconSmall').style.display = 'block';
                document.getElementById('vodPauseIconSmall').style.display = 'none';
                log('AVPlay paused', 'debug');
            }
            
            showVodControls();
        } catch (e) {
            log('AVPlay play/pause error: ' + e.message, 'warn');
        }
    }

    function avplayVodSeek(seconds) {
        if (!STATE.isTizenOS || !STATE.avplayReady || typeof webapis === 'undefined') return;
        
        try {
            var currentTime = webapis.avplay.  getCurrentTime();
            var newTime = Math.max(0, currentTime + (seconds * 1000));
            
            webapis.avplay. seekTo(newTime, function() {
                log('AVPlay seek to:   ' + (newTime / 1000) + 's', 'debug');
                showVodControls();
            }, function(e) {
                log('AVPlay seek error: ' + e, 'warn');
            });
        } catch (e) {
            log('AVPlay seek error:   ' + e. message, 'warn');
        }
    }

    function cleanupAVPlayVodControls() {
        if (avplayVodInterval) {
            clearInterval(avplayVodInterval);
            avplayVodInterval = null;
        }
        hideVodControls();
    }
    
    // ==================== TIZEN AVPLAY ====================
    function playAVPlay(streamUrl, containerId) {
        if (!STATE.isTizenOS || typeof webapis === 'undefined') {
            log('AVPlay not available', 'warn');
            return;
        }
        
        try {
            var state = webapis.avplay.getState();
            log('AVPlay state: ' + state, 'debug');
            
            if (state !== 'IDLE' && state !== 'NONE') {
                log('Stopping previous AVPlay instance', 'debug');
                try {
                    webapis.avplay.stop();
                    webapis.avplay.close();
                } catch (e) {
                    log('Error stopping AVPlay: ' + e.message, 'debug');
                }
            }
            
            log('AVPlay open:   ' + streamUrl, 'info');
            webapis.avplay.open(streamUrl);
            
            var listener = {
                onbufferingstart: function() {
                    log('AVPlay buffering...  ', 'debug');
                    showLoading(containerId === 'liveTvPlayerContainer' ? 'liveTvLoading' : 'overlayLoading', true);
                },
                onbufferingprogress: function(percent) {
                    log('Buffering:   ' + percent + '%', 'debug');
                },
                onbufferingcomplete: function() {
                    log('AVPlay buffering complete', 'debug');
                    showLoading(containerId === 'liveTvPlayerContainer' ? 'liveTvLoading' :   'overlayLoading', false);
                    
                    if (containerId === 'videoOverlay' || containerId === 'avplayerOverlay') {
                        log('Starting AVPlay VOD progress tracker', 'debug');
                        setTimeout(function() {
                            if (avplayVodInterval) {
                                clearInterval(avplayVodInterval);
                            }
                            avplayVodInterval = setInterval(function() {
                                updateAVPlayVodProgress();
                            }, 1000);
                            
                            updateAVPlayVodProgress();
                        }, 500);
                    }
                },
                onstreamcompleted: function() {
                    log('AVPlay stream completed', 'info');
                    if (containerId === 'videoOverlay' || containerId === 'avplayerOverlay') {
                        cleanupAVPlayVodControls();
                    }
                },
                oncurrentplaytime: function(currentTime) {
                    if (containerId === 'videoOverlay' || containerId === 'avplayerOverlay') {
                        updateAVPlayVodProgress();
                    }
                },
                onerror: function(eventType) {
                    log('AVPlay error:  ' + eventType, 'error');
                    showLoading(containerId === 'liveTvPlayerContainer' ? 'liveTvLoading' :   'overlayLoading', false);
                },
                onevent: function(eventType, eventData) {
                    log('AVPlay event: ' + eventType, 'debug');
                },
                onsubtitlechange: function(duration, text, data3, data4) {},
                ondrmevent: function(drmEvent, drmData) {
                    log('DRM event: ' + drmEvent, 'debug');
                }
            };
            
            webapis.avplay.setListener(listener);
            updateAVPlayRect(containerId);
            
            webapis.avplay.prepareAsync(function() {
                log('AVPlay prepared successfully', 'info');
                webapis.avplay.play();
                STATE.avplayReady = true;
                showLoading(containerId === 'liveTvPlayerContainer' ? 'liveTvLoading' :   'overlayLoading', false);
            }, function(e) {
                log('AVPlay prepare error: ' + e, 'error');
                showLoading(containerId === 'liveTvPlayerContainer' ?  'liveTvLoading' :  'overlayLoading', false);
            });
            
        } catch (e) {
            log('AVPlay exception: ' + e.message, 'error');
            
            if (containerId === 'liveTvPlayerContainer') {
                log('Forcing HLS fallback for Live TV', 'warn');
                FORCE_HLS = true;
                
                try {
                    webapis.avplay.stop();
                    webapis.avplay.close();
                } catch (e2) {}
                
                var liveTvFallbackVideo = document.getElementById('liveTvVideo');
                if (liveTvFallbackVideo) {
                    liveTvFallbackVideo.style.display = 'block';
                    document.getElementById('avplayer').style.display = 'none';
                    playHLS(liveTvFallbackVideo, streamUrl);
                }
            } else {
                log('Forcing HLS fallback for VOD', 'warn');
                FORCE_HLS = true;
                
                try {
                    webapis.avplay.stop();
                    webapis.avplay.close();
                } catch (e2) {}
                
                document.getElementById('avplayerOverlay').style.display = 'none';
                var overlayFallbackVideo = document. getElementById('overlayVideo');
                if (overlayFallbackVideo) {
                    overlayFallbackVideo.style.display = 'block';
                    playHLS(overlayFallbackVideo, streamUrl);
                    showLoading('overlayLoading', false);
                }
            }
        }
    }
    
    function stopAVPlay() {
        if (typeof webapis !== 'undefined' && webapis.avplay) {
            try {
                var state = webapis.avplay.  getState();
                if (state === 'PLAYING' || state === 'PAUSED') {
                    webapis.  avplay.stop();
                }
                if (state !== 'NONE' && state !== 'IDLE') {
                    webapis.avplay.close();
                }
            } catch (e) {
                log('stopAVPlay:   ' + e.message, 'debug');
            }
        }
        STATE.avplayReady = false;
        
        var avplayer = document.getElementById('avplayer');
        var avplayerOverlay = document. getElementById('avplayerOverlay');
        if (avplayer) avplayer.style.display = 'none';
        if (avplayerOverlay) avplayerOverlay.style.display = 'none';
    }
    
    // ==================== HLS. JS FALLBACK ====================
    function playHLS(videoEl, streamUrl) {
        if (STATE.hls) {
            STATE.hls.destroy();
            STATE.hls = null;
        }
        
        videoEl.style.display = 'block';
        
        log('playHLS called with URL: ' + streamUrl, 'debug');
        log('HLS.js available:   ' + (typeof Hls !== 'undefined'), 'debug');
        log('HLS.js supported: ' + (typeof Hls !== 'undefined' && Hls.isSupported()), 'debug');
        
        if (streamUrl.  indexOf('.m3u8') !== -1 && typeof Hls !== 'undefined' && Hls.isSupported()) {
            log('Using HLS.js player', 'info');
            
            STATE.hls = new Hls({
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                enableWorker: true,
                debug: false
            });
            
            STATE. hls.on(Hls.Events.ERROR, function(event, data) {
                log('HLS Error: ' + data. type + ' - ' + data.details, 'error');
                
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            log('Fatal network error, trying to recover...  ', 'warn');
                            STATE.hls.startLoad();
                            break;
                        case Hls.ErrorTypes. MEDIA_ERROR:  
                            log('Fatal media error, trying to recover... ', 'warn');
                            STATE.hls.recoverMediaError();
                            break;
                        default:
                            log('Fatal error, cannot recover', 'error');
                            STATE.hls.destroy();
                            showLoading('playerLoading', false);
                            showAlert('error', 'Błąd odtwarzania');
                            break;
                    }
                }
            });
            
            STATE.hls.on(Hls.Events.MANIFEST_PARSED, function() {
                log('HLS manifest parsed, starting playback', 'success');
                videoEl.play()
                    .then(function() {
                        log('Playback started', 'success');
                        showLoading('playerLoading', false);
                        showLoading('overlayLoading', false);
                    })
                    .catch(function(e) {
                        log('Play blocked:  ' + e. message, 'warn');
                        showLoading('playerLoading', false);
                        showLoading('overlayLoading', false);
                        
                        videoEl.muted = true;
                        videoEl.play()
                            .then(function() {
                                log('Playback started (muted)', 'success');
                                showAlert('info', 'Kliknij aby włączyć dźwięk');
                                videoEl.addEventListener('click', function() {
                                    videoEl.muted = false;
                                }, { once: true });
                            })
                            .catch(function(e2) {
                                log('Muted play also blocked: ' + e2.message, 'error');
                                showAlert('error', 'Nie można odtworzyć');
                            });
                    });
            });
            
            STATE.hls.loadSource(streamUrl);
            STATE.hls.attachMedia(videoEl);
            
        } else if (streamUrl. indexOf('.m3u8') !== -1 && videoEl.canPlayType('application/vnd.apple.mpegurl')) {
            log('Using native HLS support (Safari/iOS)', 'info');
            videoEl.src = streamUrl;
            videoEl.play()
                .then(function() {
                    log('Playback started', 'success');
                    showLoading('playerLoading', false);
                    showLoading('overlayLoading', false);
                })
                .catch(function(e) {
                    log('Play blocked: ' + e.message, 'warn');
                    showLoading('playerLoading', false);
                    showLoading('overlayLoading', false);
                });
        } else {
            log('Using direct playback (MP4)', 'info');
            videoEl.src = streamUrl;
            videoEl.play()
                .then(function() {
                    log('Playback started', 'success');
                    showLoading('playerLoading', false);
                    showLoading('overlayLoading', false);
                })
                .catch(function(e) {
                    log('Play blocked: ' + e.  message, 'warn');
                    showLoading('playerLoading', false);
                    showLoading('overlayLoading', false);
                });
        }
    }
    
    function stopLiveVideo() {
        log('Stopping live video...  ', 'debug');
        
        hideFullscreenEpg();
        
        if (STATE.isTizenOS) {
            stopAVPlay();
        }
        
        var video = document.getElementById('liveTvVideo');
        if (video) {
            video.pause();
            video.src = '';
            video.load();
            video.style.display = 'none';
        }
        
        if (STATE.hls) {
            try {
                STATE.hls.  destroy();
            } catch (e) {
                log('HLS destroy error: ' + e.  message, 'debug');
            }
            STATE.hls = null;
        }
        
        showLoading('playerLoading', false);
        STATE.currentChannel = null;
        
        document.querySelectorAll('#liveTvChannels .channel-item').forEach(function(el) {
            el.classList.remove('active');
        });
        
        log('Live video stopped', 'success');
    }
    
    // ==================== PIN SYSTEM ====================
    function isAdultCategory(categoryName) {
        if (! categoryName) return false;
        var name = categoryName.toLowerCase();
        return ADULT_KEYWORDS.some(function(kw) {
            return name.indexOf(kw) !== -1;
        });
    }
    
    function isAdultChannel(channel) {
        if (!channel) return false;
        var cat = STATE.liveCategories.find(function(c) { return c.category_id == channel.category_id; });
        if (cat && isAdultCategory(cat.category_name)) return true;
        var name = (channel.name || '').toLowerCase();
        return ADULT_KEYWORDS.some(function(kw) { return name.indexOf(kw) !== -1; });
    }
    
    function isCategoryLocked(categoryId) {
        if (!STATE.settings.pinEnabled || !STATE.settings.pinCode) return false;
        var cat = STATE.liveCategories.  find(function(c) { return c.category_id == categoryId; });
        if (! cat) return false;
        if (! isAdultCategory(cat.category_name)) return false;
        return STATE.pinUnlockedCategories.indexOf(categoryId) === -1;
    }
    
    function showPinModal(title, mode, callback) {
        STATE.pinInput = '';
        STATE.pinMode = mode;
        STATE.pinCallback = callback;
        STATE.pinSetupFirst = '';
        
        document.getElementById('pinModalTitle').textContent = title;
        document.getElementById('pinError').textContent = '';
        updatePinDots();
        
        var modal = document.getElementById('pinModal');
        modal.style.display = 'flex';
        modal.classList.add('active');
        
        setTimeout(function() {
            var firstKey = document.querySelector('.pin-key');
            if (firstKey) firstKey.focus();
        }, 100);
    }
    
    function closePinModal() {
        var modal = document.getElementById('pinModal');
        modal.style.display = 'none';
        modal.classList.remove('active');
        STATE.pinInput = '';
        STATE.pinMode = null;
        STATE.pinCallback = null;
        STATE.pinSetupFirst = '';
    }
    
    function showPinSetup() {
        showPinModal('Ustaw nowy PIN (4 cyfry)', 'setup', function(pin) {
            STATE.settings.pinCode = pin;
            STATE.settings.pinEnabled = true;
            saveSettings();
            updatePinStatus();
            showAlert('success', 'PIN został ustawiony');
        });
    }
    
    function showPinDisable() {
        showPinModal('Wprowadź PIN aby wyłączyć', 'disable', function() {
            STATE.settings.pinCode = null;
            STATE.settings.pinEnabled = false;
            STATE.pinUnlockedCategories = [];
            saveSettings();
            updatePinStatus();
            showAlert('success', 'PIN został wyłączony');
        });
    }
    
    function verifyPinForCategory(categoryId, callback) {
        showPinModal('Wprowadź PIN', 'verify', function() {
            STATE.pinUnlockedCategories.  push(categoryId);
            if (callback) callback();
        });
    }
    
    function handlePinKey(key) {
        var error = document.getElementById('pinError');
        
        if (key === 'clear') {
            STATE.pinInput = '';
            error.textContent = '';
        } else if (key === 'back') {
            STATE.pinInput = STATE.pinInput.slice(0, -1);
            error.textContent = '';
        } else if (STATE.pinInput.length < 4) {
            STATE.pinInput += key;
        }
        
        updatePinDots();
        
        if (STATE.pinInput.length === 4) {
            setTimeout(function() {
                processPinEntry();
            }, 200);
        }
    }
    
    function updatePinDots() {
        for (var i = 1; i <= 4; i++) {
            var dot = document.getElementById('pinDot' + i);
            if (dot) {
                dot.classList.toggle('filled', i <= STATE.pinInput.length);
            }
        }
    }
    
    function processPinEntry() {
        var error = document.getElementById('pinError');
        
        if (STATE.pinMode === 'setup') {
            if (! STATE.pinSetupFirst) {
                STATE.pinSetupFirst = STATE.  pinInput;
                STATE.pinInput = '';
                updatePinDots();
                document.getElementById('pinModalTitle').textContent = 'Powtórz PIN';
            } else {
                if (STATE.pinInput === STATE.pinSetupFirst) {
                    if (STATE.pinCallback) STATE.pinCallback(STATE.pinInput);
                    closePinModal();
                } else {
                    error.textContent = 'PIN nie pasuje, spróbuj ponownie';
                    STATE.pinInput = '';
                    STATE.pinSetupFirst = '';
                    updatePinDots();
                    document.getElementById('pinModalTitle').textContent = 'Ustaw nowy PIN (4 cyfry)';
                }
            }
        } else if (STATE.pinMode === 'verify' || STATE.pinMode === 'disable') {
            if (STATE.pinInput === STATE.settings.pinCode) {
                if (STATE.pinCallback) STATE.pinCallback();
                closePinModal();
            } else {
                error.  textContent = 'Nieprawidłowy PIN';
                STATE.pinInput = '';
                updatePinDots();
            }
        }
    }
    
    function updatePinStatus() {
        var statusDesc = document.getElementById('pinStatusDesc');
        var disableBtn = document.getElementById('btnDisablePin');
        var setupBtn = document.getElementById('btnSetupPin');
        
        if (STATE.settings.pinEnabled && STATE.settings.pinCode) {
            statusDesc.textContent = 'PIN aktywny - kanały dla dorosłych są zablokowane';
            statusDesc.style.color = '#4caf50';
            disableBtn.style.display = 'inline-block';
            setupBtn.  textContent = 'Zmień PIN';
        } else {
            statusDesc.textContent = 'PIN nie ustawiony';
            statusDesc.  style.color = '#999';
            disableBtn.style.display = 'none';
            setupBtn.textContent = 'Ustaw PIN';
        }
    }
    
    // ==================== ACCOUNT ====================
    function loadAccount() {
        log('Loading account info... ', 'info');
        
        document.getElementById('accountUsername').textContent = STATE.username || '--';
        document.getElementById('accountServer').textContent = STATE.serverUrl || '--';
        document.  getElementById('accountDeviceCode').textContent = STATE.deviceCode || '--';
        
        if (STATE.userInfo) {
            var info = STATE.userInfo;
            document.getElementById('accountStatus').textContent = info.status === 'Active' ? 'Aktywne' : (info.status || '--');
            document.getElementById('accountStatus').style.color = info.status === 'Active' ? '#4caf50' : '#ff5252';
            
            if (info.exp_date) {
                var expDate = new Date(parseInt(info.exp_date) * 1000);
                document.  getElementById('accountExpiry').textContent = expDate.toLocaleDateString('pl-PL');
                
                var daysLeft = Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24));
                if (daysLeft < 7 && daysLeft > 0) {
                    document.getElementById('accountExpiry').style.color = '#ff9800';
                } else if (daysLeft <= 0) {
                    document.getElementById('accountExpiry').style.color = '#ff5252';
                }
            }
            
            if (info.created_at) {
                var createdDate = new Date(parseInt(info.  created_at) * 1000);
                document.getElementById('accountCreated').textContent = createdDate.toLocaleDateString('pl-PL');
            }
            
            document.getElementById('accountConnections').textContent = info.active_cons || '0';
            document.getElementById('accountMaxConnections').textContent = info.  max_connections || '1';
        }
    }
    
    // ==================== SETTINGS ====================
    function loadSettings() {
        log('Loading settings... ', 'info');
        
        loadSettingsFromStorage();
        
        document.getElementById('settingStreamFormat').value = STATE.settings.streamFormat;
        document.getElementById('settingVodFormat').value = STATE.settings.vodFormat;
        document.getElementById('settingsVersion').textContent = CONFIG.version;
        
        updatePinStatus();
    }
        // ==================== EVENT LISTENERS ====================
    function setupEventListeners() {
        var btnLoginDevice = document.getElementById('btnLoginDevice');
        if (btnLoginDevice) btnLoginDevice.addEventListener('click', loginByDevice);
        
        var btnRegister = document.getElementById('btnRegister');
        if (btnRegister) btnRegister.addEventListener('click', register);
        
        var btnRestart = document.getElementById('btnRestart');
        if (btnRestart) btnRestart.addEventListener('click', restart);
        
        var cardLiveTv = document.getElementById('cardLiveTv');
        if (cardLiveTv) cardLiveTv.addEventListener('click', function() { showScreen('liveTv'); });
        
        var cardMovies = document.getElementById('cardMovies');
        if (cardMovies) cardMovies.addEventListener('click', function() { showScreen('movies'); });
        
        var cardSeries = document.getElementById('cardSeries');
        if (cardSeries) cardSeries.addEventListener('click', function() { showScreen('series'); });
        
        var cardRefresh = document.getElementById('cardRefresh');
        if (cardRefresh) cardRefresh.addEventListener('click', function() {
            STATE.allLiveChannels = [];
            STATE.allMovies = [];
            STATE.allSeries = [];
            loadHomeData();
        });
        
        var cardLogout = document.getElementById('cardLogout');
        if (cardLogout) cardLogout.addEventListener('click', logout);
        
        var cardAccount = document.getElementById('cardAccount');
        if (cardAccount) cardAccount.addEventListener('click', function() { showScreen('account'); });
        
        var cardSettings = document.getElementById('cardSettings');
        if (cardSettings) cardSettings.addEventListener('click', function() { showScreen('settings'); });
        
        var vodBtnBack = document.getElementById('vodBtnBack');
        if (vodBtnBack) vodBtnBack.addEventListener('click', closeVideoOverlay);
        
        var vodBtnPlayPause = document.getElementById('vodBtnPlayPause');
        if (vodBtnPlayPause) vodBtnPlayPause.addEventListener('click', function() {
            if (STATE.isTizenOS && STATE.avplayReady) { avplayVodPlayPause(); } else { vodPlayPause(); }
        });
        
        var vodBtnPlayPauseSmall = document.getElementById('vodBtnPlayPauseSmall');
        if (vodBtnPlayPauseSmall) vodBtnPlayPauseSmall.addEventListener('click', function() {
            if (STATE.isTizenOS && STATE.avplayReady) { avplayVodPlayPause(); } else { vodPlayPause(); }
        });
        
        var vodBtnRewind = document.getElementById('vodBtnRewind');
        if (vodBtnRewind) vodBtnRewind.addEventListener('click', function() {
            if (STATE.isTizenOS && STATE.avplayReady) { avplayVodSeek(-10); } else { vodSeek(-10); }
        });
        
        var vodBtnForward = document.getElementById('vodBtnForward');
        if (vodBtnForward) vodBtnForward.addEventListener('click', function() {
            if (STATE.isTizenOS && STATE.avplayReady) { avplayVodSeek(10); } else { vodSeek(10); }
        });
        
        var accountBtnBack = document.getElementById('accountBtnBack');
        if (accountBtnBack) accountBtnBack.addEventListener('click', function() { showScreen('home'); });
        
        var settingsBtnBack = document.getElementById('settingsBtnBack');
        if (settingsBtnBack) settingsBtnBack.addEventListener('click', function() { showScreen('home'); });
        
        var btnSetupPin = document.getElementById('btnSetupPin');
        if (btnSetupPin) btnSetupPin.addEventListener('click', showPinSetup);
        
        var btnDisablePin = document.getElementById('btnDisablePin');
        if (btnDisablePin) btnDisablePin.addEventListener('click', showPinDisable);
        
        var btnSaveSettings = document.getElementById('btnSaveSettings');
        if (btnSaveSettings) btnSaveSettings.addEventListener('click', saveSettings);
        
        var movieDetailsBtnBack = document.getElementById('movieDetailsBtnBack');
        if (movieDetailsBtnBack) movieDetailsBtnBack.addEventListener('click', function() { showScreen('movies'); });
        
        var btnPlayMovie = document.getElementById('btnPlayMovie');
        if (btnPlayMovie) btnPlayMovie.addEventListener('click', playCurrentMovie);
        
        var pinModalClose = document.getElementById('pinModalClose');
        if (pinModalClose) pinModalClose.addEventListener('click', closePinModal);
        
        document.querySelectorAll('.pin-key').forEach(function(key) {
            key.addEventListener('click', function() {
                handlePinKey(key.dataset.key);
            });
        });
        
        var liveTvBtnHome = document.getElementById('liveTvBtnHome');
        if (liveTvBtnHome) liveTvBtnHome.addEventListener('click', function() { showScreen('home'); });
        
        var liveTvBtnMovies = document.getElementById('liveTvBtnMovies');
        if (liveTvBtnMovies) liveTvBtnMovies.addEventListener('click', function() { showScreen('movies'); });
        
        var liveTvBtnSeries = document.getElementById('liveTvBtnSeries');
        if (liveTvBtnSeries) liveTvBtnSeries.addEventListener('click', function() { showScreen('series'); });
        
        var moviesBtnHome = document.getElementById('moviesBtnHome');
        if (moviesBtnHome) moviesBtnHome.addEventListener('click', function() { showScreen('home'); });
        
        var moviesBtnTv = document.getElementById('moviesBtnTv');
        if (moviesBtnTv) moviesBtnTv.addEventListener('click', function() { showScreen('liveTv'); });
        
        var moviesBtnSeries = document.getElementById('moviesBtnSeries');
        if (moviesBtnSeries) moviesBtnSeries.addEventListener('click', function() { showScreen('series'); });
        
        var seriesBtnHome = document.getElementById('seriesBtnHome');
        if (seriesBtnHome) seriesBtnHome.addEventListener('click', function() { showScreen('home'); });
        
        var seriesBtnTv = document.getElementById('seriesBtnTv');
        if (seriesBtnTv) seriesBtnTv.addEventListener('click', function() { showScreen('liveTv'); });
        
        var seriesBtnMovies = document.getElementById('seriesBtnMovies');
        if (seriesBtnMovies) seriesBtnMovies.addEventListener('click', function() { showScreen('movies'); });
        
        var detailsBtnBack = document.getElementById('detailsBtnBack');
        if (detailsBtnBack) detailsBtnBack.addEventListener('click', function() { showScreen('series'); });
        
        var fsBtnPrev = document.getElementById('fsBtnPrev');
        if (fsBtnPrev) fsBtnPrev.addEventListener('click', function() {
            switchChannel(-1);
            showFullscreenEpg();
        });
        
        var fsBtnNext = document.getElementById('fsBtnNext');
        if (fsBtnNext) fsBtnNext.addEventListener('click', function() {
            switchChannel(1);
            showFullscreenEpg();
        });
        
        var closeOverlay = document.getElementById('closeOverlay');
        if (closeOverlay) closeOverlay.addEventListener('click', closeVideoOverlay);
        
        var liveTvPlayerContainer = document.getElementById('liveTvPlayerContainer');
        if (liveTvPlayerContainer) liveTvPlayerContainer.addEventListener('dblclick', goFullscreen);
        
        // WAŻNE: capture: true przechwytuje event PRZED natywną nawigacją przeglądarki
        document.addEventListener('keydown', handleRemoteKey, true);
        
        var debugKeySequence = [];
        document.addEventListener('keydown', function(e) {
            debugKeySequence.push(e.keyCode);
            if (debugKeySequence.length > 5) debugKeySequence.shift();
            
            if (debugKeySequence.slice(-3).join(',') === [KEYS.BLUE, KEYS.RED, KEYS.BLUE].join(',')) {
                CONFIG.debugMode = !CONFIG.debugMode;
                document.getElementById('debugLog').classList.toggle('show', CONFIG.debugMode);
                log('Debug mode: ' + (CONFIG.debugMode ? 'ON' : 'OFF'), 'info');
            }
        });
        
        // ==================== WYSZUKIWANIE ====================
        // Wszystkie przyciski wyszukiwania
        document.querySelectorAll('#btnSearch').forEach(function(btn) {
            btn.addEventListener('click', showSearchModal);
            btn.addEventListener('keydown', function(e) {
                if (e.keyCode === KEYS.ENTER) {
                    showSearchModal();
                }
            });
        });
        
        // Input wyszukiwania
        var searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                STATE.searchQuery = e.target.value;
                performSearch(STATE.searchQuery);
                renderSearchResults();
            });
            searchInput.addEventListener('keydown', function(e) {
                if (e.keyCode === 27) { // ESC
                    hideSearchModal();
                }
            });
        }
        
        // Przycisk zamknięcia modalu
        var searchClose = document.getElementById('searchClose');
        if (searchClose) {
            searchClose.addEventListener('click', hideSearchModal);
        }
        
        // Zamknij modal przy kliknięciu poza nim
        var searchModal = document.getElementById('searchModal');
        if (searchModal) {
            searchModal.addEventListener('click', function(e) {
                if (e.target === searchModal) {
                    hideSearchModal();
                }
            });
        }
    }
    
    function handleRemoteKey(e) {
        var key = e.keyCode;
        
        // Blokuj natywną nawigację dla strzałek - MUSI być na początku
        if (key === KEYS.UP || key === KEYS.DOWN || key === KEYS.LEFT || key === KEYS.RIGHT ||
            key === 38 || key === 40 || key === 37 || key === 39) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        log('Key pressed: ' + key, 'debug');
        
        if (document.getElementById('pinModal').classList.contains('active')) {
            if (key >= 48 && key <= 57) {
                e.preventDefault();
                handlePinKey(String(key - 48));
                return;
            }
            if (key >= 96 && key <= 105) {
                e.preventDefault();
                handlePinKey(String(key - 96));
                return;
            }
            if (key === 8) {
                e.preventDefault();
                handlePinKey('back');
                return;
            }
            if (key === 46) {
                e.preventDefault();
                handlePinKey('clear');
                return;
            }
        }
        
        var videoOverlay = document.getElementById('videoOverlay');
        if (videoOverlay && videoOverlay.classList.contains('active')) {
            if (key === KEYS.BACK || key === KEYS.BACK_BROWSER || key === KEYS.BACK_LG || key === 8 || key === 10009) {
                e.preventDefault();
                closeVideoOverlay();
                return;
            }
            
            if (key === KEYS. PLAY_PAUSE || key === KEYS. PLAY || key === KEYS.PAUSE || key === 415 || key === 19 || key === 179) {
                e.preventDefault();
                if (STATE.isTizenOS && STATE.avplayReady) {
                    avplayVodPlayPause();
                } else {
                    vodPlayPause();
                }
                return;
            }
            
            if (key === KEYS.LEFT || key === 37 || key === KEYS.RW || key === 412) {
                e.preventDefault();
                if (STATE.isTizenOS && STATE.avplayReady) {
                    avplayVodSeek(-10);
                } else {
                    vodSeek(-10);
                }
                return;
            }
            
            if (key === KEYS. RIGHT || key === 39 || key === KEYS.FF || key === 417) {
                e.preventDefault();
                if (STATE.isTizenOS && STATE.avplayReady) {
                    avplayVodSeek(10);
                } else {
                    vodSeek(10);
                }
                return;
            }
            
            if (key === KEYS.UP || key === KEYS.DOWN || key === KEYS.ENTER || key === 38 || key === 40 || key === 13) {
                e.preventDefault();
                toggleVodControls();
                return;
            }
            
            showVodControls();
            return;
        }
        
        if (key === KEYS.BACK || key === KEYS.BACK_BROWSER || key === KEYS.BACK_LG || key === KEYS.BACK_TIZEN || key === 8) {
            e.preventDefault();
            
            log('BACK pressed, currentScreen: ' + STATE.currentScreen + ', key: ' + key, 'debug');
            
            if (document.getElementById('pinModal').classList.contains('active')) {
                closePinModal();
                return;
            
            // Zamknij modal wyszukiwania
            var searchModal = document.getElementById('searchModal');
            if (searchModal && searchModal.style.display === 'flex') {
                hideSearchModal();
                return;
            }
            }
            
            var videoContainer = document.getElementById('liveTvPlayerContainer');
            var isFullscreen = videoContainer && videoContainer.classList.contains('custom-fullscreen');
            
            log('Is fullscreen: ' + isFullscreen, 'debug');
            
            if (isFullscreen) {
                log('Exiting fullscreen, staying in Live TV', 'info');
                
                videoContainer.classList.remove('custom-fullscreen');
                var leftPanel = document.querySelector('.left-panel');
                var epgPanel = document.querySelector('.epg-panel');
                var topNav = document.querySelector('#liveTvScreen .top-nav');
                
                if (leftPanel) leftPanel.style.display = '';
                if (epgPanel) epgPanel.style.display = '';
                if (topNav) topNav.style.display = '';
                hideFullscreenEpg();
                
                if (STATE.isTizenOS && STATE.avplayReady) {
                    setTimeout(function() {
                        updateAVPlayRect('liveTvPlayerContainer');
                    }, 100);
                }
                
                // Przywróć fokus po wyjściu z fullscreen
                setTimeout(function() {
                    if (STATE.lastFocusedElement && STATE.lastFocusedElement.classList.contains('focusable')) {
                        STATE.lastFocusedElement.focus();
                        log('Restored focus to: ' + (STATE.lastFocusedElement.id || 'unknown'), 'debug');
                    } else {
                        // Fallback: znajdź pierwszy focusable w Live TV
                        var fallbackFocusable = document.querySelector('#liveTvScreen .focusable');
                        if (fallbackFocusable) {
                            fallbackFocusable.focus();
                            log('Fallback focus to first element in Live TV', 'debug');
                        }
                    }
                }, 150);
                return false;
            }
            
            if (document.fullscreenElement) {
                document.exitFullscreen();
                e.stopPropagation();
                return false;
            }
            
            if (STATE.currentScreen === 'seriesDetails') {
                showScreen('series');
                return;
            }
            
            if (STATE.currentScreen === 'movieDetails') {
                showScreen('movies');
                return;
            }
            
            if (STATE.currentScreen === 'account' || STATE.currentScreen === 'settings') {
                showScreen('home');
                return;
            }
            
            if (STATE.currentScreen === 'liveTv' || STATE.currentScreen === 'movies' || STATE.currentScreen === 'series') {
                log('Returning to home from:  ' + STATE.currentScreen, 'debug');
                showScreen('home');
                return;
            }
            
            if (STATE.currentScreen === 'home') {
                // Na VegaOS informujemy React Native o chęci wyjścia
                if (window.postToNative) {
                    window.postToNative({ type: 'EXIT_APP' });
                }
                return;
            }
            
            return;
        }
        
        if (key === KEYS.UP) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            navigateFocus('up');
            return;
        }
        if (key === KEYS.DOWN) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            navigateFocus('down');
            return;
        }
        if (key === KEYS.LEFT) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            navigateFocus('left');
            return;
        }
        if (key === KEYS.RIGHT) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            navigateFocus('right');
            return;
        }
        
        if (key === KEYS. ENTER) {
            var tvPlayerContainer = document.getElementById('liveTvPlayerContainer');
            if (tvPlayerContainer && tvPlayerContainer.classList.contains('custom-fullscreen')) {
                e.preventDefault();
                toggleFullscreenEpg();
                return;
            }
            
            var focused = document.activeElement;
            if (focused && focused.classList.contains('focusable')) {
                focused.click();
            }
            return;
        }
        
        if (key === KEYS.PLAY || key === KEYS.PLAY_PAUSE) {
            if (STATE.avplayReady && typeof webapis !== 'undefined') {
                try {
                    var state = webapis.avplay.getState();
                    if (state === 'PAUSED') {
                        webapis.avplay.play();
                    } else if (state === 'PLAYING') {
                        webapis.avplay.pause();
                    }
                } catch (e) {}
            }
        }
        
        if (key === KEYS.PAUSE) {
            if (STATE.avplayReady && typeof webapis !== 'undefined') {
                try {
                    webapis.avplay.pause();
                } catch (e) {}
            }
        }
        
        if (key === KEYS.STOP) {
            stopAVPlay();
            stopLiveVideo();
        }
        
        if (key === KEYS.CH_UP || key === 33) {
            e.preventDefault();
            if (STATE.currentScreen === 'liveTv') {
                switchChannel(-1);
                var chUpContainer = document.getElementById('liveTvPlayerContainer');
                if (chUpContainer && chUpContainer.classList.contains('custom-fullscreen')) {
                    showFullscreenEpg();
                }
            }
        }
        
        if (key === KEYS.CH_DOWN || key === 34) {
            e.preventDefault();
            if (STATE.currentScreen === 'liveTv') {
                switchChannel(1);
                var chDownContainer = document.getElementById('liveTvPlayerContainer');
                if (chDownContainer && chDownContainer.classList.contains('custom-fullscreen')) {
                    showFullscreenEpg();
                }
            }
        }
        
        if (key === KEYS.RED) {
            log('RED button pressed', 'debug');
        }
        
        if (key === KEYS.GREEN) {
            log('GREEN button pressed', 'debug');
        }
        
        if (key === KEYS.YELLOW) {
            log('YELLOW button pressed', 'debug');
        }
        
        if (key === KEYS.BLUE) {
            log('BLUE button pressed', 'debug');
        }
    }
    
    // ==================== START ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();