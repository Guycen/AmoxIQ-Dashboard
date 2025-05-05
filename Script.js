// AmoxIQ Dashboard - Data Update and API Management
// Global configuration 
const CONFIG = {
    // Application version
    VERSION: '1.0.0',
    
    // Debug mode - set to true to see detailed API logs
    DEBUG: true,
    
    // Testing mode - set to false to use actual API calls
    TESTING_MODE: {
        ENABLED: false,
        FORCE_ERRORS: false // Set to true to simulate API errors
    },
    
    // API keys
    API_KEYS: {
        BLS_API_KEY: '', // BLS API key
        EIA_API_KEY: '', // EIA API key
        USDA_API_KEY: '' // USDA API key
    },
    
    // Update intervals
    UPDATE_INTERVALS: {
        CHECK_FOR_UPDATES: 3600000, // Check for updates every hour (in ms)
        REFRESH_DISPLAY: 86400000,  // Fully refresh display daily (in ms)
        ANIMATION_DURATION: 800     // Animation duration in ms
    },
    
    // Cache settings
    CACHE: {
        ENABLED: true,
        MAX_AGE: 86400000, // Cache data for 24 hours (in ms)
        STORAGE_KEY: 'amoxiq_price_data',
        HISTORY_KEY: 'amoxiq_history_data',
        CONFIG_KEY: 'amoxiq_api_config'
    },
    
    // API endpoints
    ENDPOINTS: {
        BLS_API: 'https://api.bls.gov/publicAPI/v2/timeseries/data/',
        EIA_API: 'https://api.eia.gov/series/',
        USDA_API: 'https://api.data.gov/usda/nass/api/',  // National Agricultural Statistics Service API
        USDA_ALTERNATIVE: 'https://api.data.gov/usda/ers/data/' // Economic Research Service API (backup)
    },
    
    // Series IDs for different APIs
    SERIES_IDS: {
        BLS: {
            eggs: 'APU0000708111',
            milk: 'APU0000709112',
            bread: 'APU0000702111',
            chicken: 'APU0000706111',
            coffee: 'APU0000717311',
            cheese: 'APU0000710212',
            apparel: 'CUUR0000SAA'
        },
        EIA: {
            gasoline: 'PET.EMM_EPM0_PTE_NUS_DPG.W'
        },
        USDA: {
            chicken: 'poultry/chicken-retail' // Example endpoint
        }
    }
};

// Main dashboard controller
const AmoxIQDashboard = {
    // Data state
    data: {
        priceData: null,
        lastUpdated: null,
        apiStatus: {
            BLS: 'pending',
            EIA: 'pending',
            USDA: 'pending'
        },
        historyData: {} // Store historical data for charts
    },
    
    // Initialize the dashboard
    init: async function() {
        console.log('Initializing AmoxIQ Dashboard v' + CONFIG.VERSION);
        
        // Load saved API configuration
        this.loadApiConfiguration();
        
        // Setup UI components
        this.setupUIComponents();
        
        // Load cached data if available
        const cachedDataLoaded = this.loadCachedData();
        
        // Check for data updates
        if (!cachedDataLoaded) {
            await this.checkForUpdates(true); // Force update on first load if no cache
        } else {
            // Still check for updates in the background
            setTimeout(() => this.checkForUpdates(false), 2000);
        }
        
        // Setup update intervals
        this.setupUpdateIntervals();
        
        // Show welcome notification
        this.showWelcomeMessage();
        
        console.log('Dashboard initialization complete');
    },
    
    // Load API configuration from localStorage
    loadApiConfiguration: function() {
        try {
            const savedConfig = localStorage.getItem(CONFIG.CACHE.CONFIG_KEY);
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                
                // Update configuration
                CONFIG.API_KEYS.BLS_API_KEY = config.BLS_API_KEY || CONFIG.API_KEYS.BLS_API_KEY;
                CONFIG.API_KEYS.EIA_API_KEY = config.EIA_API_KEY || CONFIG.API_KEYS.EIA_API_KEY;
                CONFIG.API_KEYS.USDA_API_KEY = config.USDA_API_KEY || CONFIG.API_KEYS.USDA_API_KEY;
                CONFIG.TESTING_MODE.ENABLED = config.TESTING_MODE || false;
                
                console.log('Loaded API configuration from localStorage');
            }
        } catch (error) {
            console.error('Error loading API configuration:', error);
        }
    },
    
    // Setup all UI components
    setupUIComponents: function() {
        setupAxolotlMascot();
        setupCardHoverEffects();
        setupThemeToggle();
        setupNotifications();
        setupTabInteractions();
    },
    
    // Load data from cache if available
    loadCachedData: function() {
        if (!CONFIG.CACHE.ENABLED) return false;
        
        try {
            const cachedData = localStorage.getItem(CONFIG.CACHE.STORAGE_KEY);
            if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                const cacheAge = new Date() - new Date(parsedData.timestamp);
                
                // Use cached data if it's not too old
                if (cacheAge < CONFIG.CACHE.MAX_AGE) {
                    this.data.priceData = parsedData;
                    this.data.lastUpdated = new Date(parsedData.timestamp);
                    
                    // Update UI with cached data
                    updateDashboard(parsedData);
                    updateAllTimes(new Date(parsedData.timestamp));
                    
                    // Also load historical data
                    this.loadHistoricalData();
                    
                    console.log('Using cached data from:', new Date(parsedData.timestamp));
                    return true;
                } else {
                    console.log('Cached data is too old, will fetch new data');
                }
            }
        } catch (error) {
            console.error('Error loading cached data:', error);
        }
        
        return false;
    },
    
    // Load historical data from cache
    loadHistoricalData: function() {
        try {
            const historyData = localStorage.getItem(CONFIG.CACHE.HISTORY_KEY);
            if (historyData) {
                this.data.historyData = JSON.parse(historyData);
                console.log('Loaded historical data from cache');
            }
        } catch (error) {
            console.error('Error loading historical data:', error);
        }
    },
    
    // Check if updates are needed and fetch new data
    checkForUpdates: async function(forceUpdate = false) {
        const now = new Date();
        
        // Update global time display
        const globalTimeDisplay = document.getElementById('global-update-time');
        if (globalTimeDisplay && this.data.lastUpdated) {
            globalTimeDisplay.textContent = this.data.lastUpdated.toLocaleString();
        }
        
        // Determine if we need to fetch new data
        const needsUpdate = forceUpdate || 
            !this.data.lastUpdated || 
            now.toDateString() !== this.data.lastUpdated.toDateString() ||
            now - this.data.lastUpdated > CONFIG.CACHE.MAX_AGE;
            
        if (needsUpdate) {
            console.log('Fetching new price data...');
            showNotification('Updating price data...', 'info');
            
            try {
                // Fetch new data
                this.data.priceData = await fetchAllPriceData();
                this.data.lastUpdated = new Date();
                
                // Update UI with new data
                updateDashboard(this.data.priceData);
                updateAllTimes(this.data.lastUpdated);
                
                // Cache the data
                if (CONFIG.CACHE.ENABLED) {
                    localStorage.setItem(CONFIG.CACHE.STORAGE_KEY, JSON.stringify(this.data.priceData));
                }
                
                showNotification('Price data updated successfully!', 'success');
                return true;
            } catch (error) {
                console.error('Error fetching updated data:', error);
                showNotification('Error updating prices. Using last available data.', 'error');
                return false;
            }
        } else {
            console.log('No update needed, last update was:', this.data.lastUpdated);
            return false;
        }
    },
    
    // Setup intervals for periodic updates
    setupUpdateIntervals: function() {
        // Check for updates periodically
        setInterval(() => this.checkForUpdates(), CONFIG.UPDATE_INTERVALS.CHECK_FOR_UPDATES);
        
        // Force a full refresh daily
        setInterval(() => window.location.reload(), CONFIG.UPDATE_INTERVALS.REFRESH_DISPLAY);
    },
    
    // Show welcome message
    showWelcomeMessage: function() {
        setTimeout(() => {
            showNotification("Welcome to AmoxIQ Consumer Price Dashboard! Data is updated daily from official sources.", 'info');
        }, 1000);
    },
    
    // Update API status indicators
    updateAPIStatus: function(api, status) {
        this.data.apiStatus[api] = status;
        
        // Update UI status indicators
        document.querySelectorAll('.api-status').forEach(element => {
            const source = element.parentElement.textContent;
            
            if (source.includes('BLS')) {
                updateStatusIndicator(element, this.data.apiStatus.BLS);
            } else if (source.includes('EIA')) {
                updateStatusIndicator(element, this.data.apiStatus.EIA);
            } else if (source.includes('USDA')) {
                updateStatusIndicator(element, this.data.apiStatus.USDA);
            }
        });
    }
};

// Helper function to update status indicators
function updateStatusIndicator(element, status) {
    element.className = 'api-status';
    
    switch(status) {
        case 'success':
            element.classList.add('success');
            break;
        case 'error':
            element.classList.add('error');
            break;
        case 'loading':
            element.classList.add('loading');
            break;
        default:
            // Default pending state
            break;
    }
}

// Mock data generation function
async function fetchMockData(name, currentPrice, previousPrice, source) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
    
    const change = currentPrice - previousPrice;
    const percentChange = ((change / previousPrice) * 100).toFixed(1);
    
    return {
        name: name,
        current: currentPrice,
        previous: previousPrice,
        change: parseFloat(change.toFixed(2)),
        percentChange: parseFloat(percentChange),
        source: source,
        history: generateMockHistory(currentPrice, 12)
    };
}

// Mock yearly data generation function
async function fetchMockYearlyData(name, yearlyChange, source) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
    
    return {
        name: name,
        current: yearlyChange,
        previous: 0,
        change: yearlyChange,
        percentChange: 100,
        source: source,
        history: generateMockHistory(yearlyChange, 12)
    };
}

// Generate mock historical data
function generateMockHistory(basePrice, months) {
    const history = [];
    for (let i = months - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        history.push({
            date: date.toISOString().split('T')[0],
            value: basePrice + (Math.random() - 0.5) * (basePrice * 0.1)
        });
    }
    return history;
}

// Fetch all price data from various APIs
async function fetchAllPriceData() {
    try {
        // Set API statuses to loading
        AmoxIQDashboard.updateAPIStatus('BLS', 'loading');
        AmoxIQDashboard.updateAPIStatus('EIA', 'loading');
        AmoxIQDashboard.updateAPIStatus('USDA', 'loading');
        
        // Store timestamp of update
        const lastUpdated = new Date().toISOString();
        
        if (CONFIG.DEBUG) {
            console.log('Fetching price data at', new Date().toLocaleString());
            console.log('Testing mode:', CONFIG.TESTING_MODE.ENABLED ? 'ENABLED' : 'DISABLED');
        }
        
        // If in testing mode, use mock data instead of real API calls
        if (CONFIG.TESTING_MODE.ENABLED) {
            if (CONFIG.DEBUG) console.log('Using mock data instead of API calls');
            
            // Set API statuses based on testing configuration
            const apiStatus = CONFIG.TESTING_MODE.FORCE_ERRORS ? 'error' : 'success';
            
            setTimeout(() => {
                AmoxIQDashboard.updateAPIStatus('BLS', apiStatus);
                AmoxIQDashboard.updateAPIStatus('EIA', apiStatus);
                AmoxIQDashboard.updateAPIStatus('USDA', apiStatus);
            }, 1000);
            
            // Generate mock data for all items
            const items = {
                egg: await fetchMockData('eggs', 3.29, 3.34, 'BLS'),
                milk: await fetchMockData('milk', 4.15, 4.07, 'BLS'),
                bread: await fetchMockData('bread', 2.89, 2.91, 'BLS'),
                gas: await fetchMockData('gasoline', 3.45, 3.33, 'EIA'),
                chicken: await fetchMockData('chicken', 2.89, 2.72, 'USDA'),
                coffee: await fetchMockData('coffee', 8.75, 8.30, 'BLS'),
                cheese: await fetchMockData('cheese', 6.49, 6.15, 'BLS'),
            };
            
            // Generate mock yearly data
            const yearlyItems = {
                apparel: await fetchMockYearlyData('apparel', 4.2, 'BLS'),
            };
            
            // Store historical data
            storeHistoricalData(items, yearlyItems);
            
            return {
                timestamp: lastUpdated,
                items: items,
                yearlyItems: yearlyItems
            };
        }
        
        // Otherwise, fetch data from different APIs in parallel
        const [blsData, eiaData, usdaData] = await Promise.allSettled([
            fetchBLSData(),
            fetchEIAData(),
            fetchUSDAData()
        ]);
        
        // Process BLS data
        let blsResults = {};
        if (blsData.status === 'fulfilled') {
            blsResults = blsData.value;
            AmoxIQDashboard.updateAPIStatus('BLS', 'success');
        } else {
            console.error('BLS API error:', blsData.reason);
            AmoxIQDashboard.updateAPIStatus('BLS', 'error');
        }
        
        // Process EIA data
        let eiaResults = {};
        if (eiaData.status === 'fulfilled') {
            eiaResults = eiaData.value;
            AmoxIQDashboard.updateAPIStatus('EIA', 'success');
        } else {
            console.error('EIA API error:', eiaData.reason);
            AmoxIQDashboard.updateAPIStatus('EIA', 'error');
        }
        
        // Process USDA data
        let usdaResults = {};
        if (usdaData.status === 'fulfilled') {
            usdaResults = usdaData.value;
            AmoxIQDashboard.updateAPIStatus('USDA', 'success');
        } else {
            console.error('USDA API error:', usdaData.reason);
            AmoxIQDashboard.updateAPIStatus('USDA', 'error');
        }
        
        // Combine the data with fallbacks to mock data when API fails
        const items = {
            egg: blsResults.eggs || await fetchMockData('eggs', 3.29, 3.34, 'BLS'),
            milk: blsResults.milk || await fetchMockData('milk', 4.15, 4.07, 'BLS'),
            bread: blsResults.bread || await fetchMockData('bread', 2.89, 2.91, 'BLS'),
            gas: eiaResults.gasoline || await fetchMockData('gasoline', 3.45, 3.33, 'EIA'),
            chicken: usdaResults.chicken || blsResults.chicken || await fetchMockData('chicken', 2.89, 2.72, 'USDA'),
            coffee: blsResults.coffee || await fetchMockData('coffee', 8.75, 8.30, 'BLS'),
            cheese: blsResults.cheese || await fetchMockData('cheese', 6.49, 6.15, 'BLS'),
        };
        
        // Get yearly increases for apparel
        const yearlyItems = {
            apparel: blsResults.apparel || await fetchMockYearlyData('apparel', 4.2, 'BLS'),
        };
        
        // Store historical data for charts
        storeHistoricalData(items, yearlyItems);
        
        // Combine into a single dataset
        const priceData = {
            timestamp: lastUpdated,
            items: items,
            yearlyItems: yearlyItems
        };
        
        return priceData;
    } catch (error) {
        console.error('Error fetching daily price data:', error);
        
        // Set all APIs to error state
        AmoxIQDashboard.updateAPIStatus('BLS', 'error');
        AmoxIQDashboard.updateAPIStatus('EIA', 'error');
        AmoxIQDashboard.updateAPIStatus('USDA', 'error');
        
        // Show error notification
        showNotification('Error fetching price data. Using cached data if available.', 'error');
        
        // Fallback to cached data if available
        const cachedData = localStorage.getItem(CONFIG.CACHE.STORAGE_KEY);
        return cachedData ? JSON.parse(cachedData) : null;
    }
}

// Store historical data for charts
function storeHistoricalData(items, yearlyItems) {
    // Get existing history data
    let history = {};
    try {
        const savedHistory = localStorage.getItem(CONFIG.CACHE.HISTORY_KEY);
        history = savedHistory ? JSON.parse(savedHistory) : {};
    } catch (e) {
        console.error('Error parsing history data:', e);
    }
    
    // Current date as key (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    
    // Store today's prices
    for (const [key, item] of Object.entries(items)) {
        if (!history[key]) history[key] = {};
        history[key][today] = item.current;
    }
    
    // Store yearly items
    for (const [key, item] of Object.entries(yearlyItems)) {
        if (!history[key]) history[key] = {};
        history[key][today] = item.current;
    }
    
    // Limit history to 365 days by removing oldest entries
    for (const key in history) {
        const dates = Object.keys(history[key]).sort();
        if (dates.length > 365) {
            const toRemove = dates.slice(0, dates.length - 365);
            toRemove.forEach(date => delete history[key][date]);
        }
    }
    
    // Save updated history
    localStorage.setItem(CONFIG.CACHE.HISTORY_KEY, JSON.stringify(history));
    
    // Update dashboard history data
    AmoxIQDashboard.data.historyData = history;
}

// Fetch data from BLS API (stub - implement real API calls)
async function fetchBLSData() {
    // For now, return mock data
    // TODO: Implement real BLS API calls
    return {};
}

// Fetch data from EIA API (stub - implement real API calls)
async function fetchEIAData() {
    // For now, return mock data
    // TODO: Implement real EIA API calls
    return {};
}

// Fetch data from USDA API (stub - implement real API calls)
async function fetchUSDAData() {
    // For now, return mock data
    // TODO: Implement real USDA API calls
    return {};
}

// Update dashboard UI with new data
function updateDashboard(priceData) {
    if (!priceData) return;
    
    // Update regular items
    if (priceData.items) {
        for (const [key, item] of Object.entries(priceData.items)) {
            updateItemCard(key, item);
        }
    }
    
    // Update yearly items
    if (priceData.yearlyItems) {
        for (const [key, item] of Object.entries(priceData.yearlyItems)) {
            updateYearlyItemCard(key, item);
        }
    }
}

// Update individual item card
function updateItemCard(itemName, data) {
    const priceElement = document.getElementById(`${itemName}-price`);
    const changeElement = document.getElementById(`${itemName}-change`);
    const updateTimeElement = document.getElementById(`${itemName}-update-time`);
    const sourceElement = document.getElementById(`${itemName}-source`);
    
    if (priceElement) {
        priceElement.textContent = `$${data.current.toFixed(2)}`;
    }
    
    if (changeElement) {
        const sign = data.change >= 0 ? '+' : '';
        changeElement.textContent = `${sign}${data.change.toFixed(2)} (${sign}${data.percentChange}%)`;
        changeElement.className = `price-change ${data.change >= 0 ? 'positive' : 'negative'}`;
    }
    
    if (updateTimeElement) {
        updateTimeElement.textContent = new Date().toLocaleString();
    }
    
    if (sourceElement) {
        const statusSpan = sourceElement.querySelector('.api-status');
        if (statusSpan) {
            const apiStatus = AmoxIQDashboard.data.apiStatus[data.source];
            updateStatusIndicator(statusSpan, apiStatus);
        }
        sourceElement.lastChild.textContent = data.source;
    }
}

// Update yearly item card
function updateYearlyItemCard(itemName, data) {
    const priceElement = document.getElementById(`${itemName}-price`);
    const changeElement = document.getElementById(`${itemName}-change`);
    const updateTimeElement = document.getElementById(`${itemName}-update-time`);
    const sourceElement = document.getElementById(`${itemName}-source`);
    
    if (priceElement) {
        priceElement.textContent = `+${data.current}%`;
    }
    
    if (changeElement) {
        changeElement.textContent = 'Yearly Increase';
        changeElement.className = 'price-change positive';
    }
    
    if (updateTimeElement) {
        updateTimeElement.textContent = new Date().toLocaleString();
    }
    
    if (sourceElement) {
        const statusSpan = sourceElement.querySelector('.api-status');
        if (statusSpan) {
            const apiStatus = AmoxIQDashboard.data.apiStatus[data.source];
            updateStatusIndicator(statusSpan, apiStatus);
        }
        sourceElement.lastChild.textContent = data.source;
    }
}

// Update all time displays
function updateAllTimes(timestamp) {
    const timeString = timestamp.toLocaleString();
    
    document.querySelectorAll('.last-updated span').forEach(element => {
        element.textContent = timeString;
    });
    
    const globalTimeDisplay = document.getElementById('global-update-time');
    if (globalTimeDisplay) {
        globalTimeDisplay.textContent = timeString;
    }
}

// Setup notification system
function setupNotifications() {
    // Create notification container if it doesn't exist
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
}

// Show notification
function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, duration);
}

// Setup axolotl mascot
function setupAxolotlMascot() {
    const mascot = document.querySelector('.axolotl-mascot');
    if (mascot) {
        mascot.addEventListener('click', () => {
            showNotification('Hi! I\'m Axie, your friendly price tracking axolotl!', 'info');
        });
    }
}

// Setup card hover effects
function setupCardHoverEffects() {
    const cards = document.querySelectorAll('.price-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-4px)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
}

// Setup theme toggle
function setupThemeToggle() {
    const themeToggle = document.createElement('div');
    themeToggle.className = 'theme-toggle';
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    document.body.appendChild(themeToggle);
    
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const icon = themeToggle.querySelector('i');
        if (document.body.classList.contains('dark-theme')) {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    });
}

// Setup tab interactions
function setupTabInteractions() {
    const tabs = document.querySelectorAll('.tab-item');
    const pages = document.querySelectorAll('.dashboard-page');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.classList.contains('disabled')) return;
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding content
            pages.forEach(page => page.classList.remove('active'));
            const targetPage = tab.textContent.toLowerCase().replace(/\s+/g, '-') + '-content';
            const targetElement = document.getElementById(targetPage);
            if (targetElement) {
                targetElement.classList.add('active');
            }
        });
    });
    
    // Setup API test buttons
    const testButtons = document.querySelectorAll('.test-api-btn');
    testButtons.forEach(button => {
        button.addEventListener('click', () => {
            const api = button.dataset.api;
            testApiConnection(api);
        });
    });
    
    // Setup API configuration save button
    const saveConfigButton = document.getElementById('save-api-config');
    if (saveConfigButton) {
        saveConfigButton.addEventListener('click', saveApiConfiguration);
    }
}

// Test API connection
async function testApiConnection(api) {
    showNotification(`Testing ${api} API connection...`, 'info');
    
    // Update status to loading
    AmoxIQDashboard.updateAPIStatus(api, 'loading');
    
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For now, always succeed in testing mode
    if (CONFIG.TESTING_MODE.ENABLED) {
        AmoxIQDashboard.updateAPIStatus(api, 'success');
        showNotification(`${api} API connection successful!`, 'success');
    } else {
        // TODO: Implement real API tests
        AmoxIQDashboard.updateAPIStatus(api, 'error');
        showNotification(`${api} API connection failed. Check your API key.`, 'error');
    }
}

// Save API configuration
function saveApiConfiguration() {
    const config = {
        BLS_API_KEY: document.getElementById('bls-api-key').value,
        EIA_API_KEY: document.getElementById('eia-api-key').value,
        USDA_API_KEY: document.getElementById('usda-api-key').value,
        TESTING_MODE: document.getElementById('testing-mode').checked
    };
    
    localStorage.setItem(CONFIG.CACHE.CONFIG_KEY, JSON.stringify(config));
    
    // Update current configuration
    CONFIG.API_KEYS.BLS_API_KEY = config.BLS_API_KEY;
    CONFIG.API_KEYS.EIA_API_KEY = config.EIA_API_KEY;
    CONFIG.API_KEYS.USDA_API_KEY = config.USDA_API_KEY;
    CONFIG.TESTING_MODE.ENABLED = config.TESTING_MODE;
    
    showNotification('API configuration saved successfully!', 'success');
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    AmoxIQDashboard.init();
});
