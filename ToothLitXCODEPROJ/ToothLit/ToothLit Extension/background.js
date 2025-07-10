
/**
 * ToothLit - background.js
 *
 * This script runs in the background and manages the extension's state.
 * It listens for clicks on the toolbar button, manages storage,
 * and communicates with the content script to apply or remove dark mode.
 */

// A key for storing settings. Using a single object avoids cluttering storage.
const SETTINGS_KEY = 'toothlit_settings';

// --- Helper Functions ---

/**
 * Gets the domain from a URL string.
 * @param {string} url - The URL to parse.
 * @returns {string|null} The hostname or null if invalid.
 */
function getDomainFromUrl(url) {
    try {
        return new URL(url).hostname;
    } catch (e) {
        console.error(`ToothLit: Invalid URL - ${url}`, e);
        return null;
    }
}

/**
 * Updates the toolbar icon to reflect the dark mode state.
 * @param {number} tabId - The ID of the tab to update.
 * @param {boolean} isEnabled - Whether dark mode is enabled.
 */
async function updateIcon(tabId, isEnabled) {
    const path = isEnabled ? {
        "16": "icons/icon-on-16.png",
        "32": "icons/icon-on-32.png"
    } : {
        "16": "icons/icon-off-16.png",
        "32": "icons/icon-off-32.png"
    };
    try {
        await browser.action.setIcon({ tabId, path });
    } catch (e) {
        console.error(`ToothLit: Failed to set icon for tab ${tabId}`, e);
    }
}

/**
 * Gets the dark mode state for a specific domain from storage.
 * @param {string} domain - The domain to look up.
 * @returns {Promise<boolean>} - True if dark mode is enabled for the domain.
 */
async function getDomainState(domain) {
    try {
        const settings = await browser.storage.local.get(SETTINGS_KEY);
        const allDomains = settings[SETTINGS_KEY] || {};
        return allDomains[domain] || false;
    } catch (e) {
        console.error('ToothLit: Error getting domain state', e);
        return false;
    }
}

/**
 * Sets the dark mode state for a specific domain in storage.
 * @param {string} domain - The domain to update.
 * @param {boolean} isEnabled - The new state to set.
 */
async function setDomainState(domain, isEnabled) {
    try {
        const settings = await browser.storage.local.get(SETTINGS_KEY);
        const allDomains = settings[SETTINGS_KEY] || {};
        allDomains[domain] = isEnabled;
        await browser.storage.local.set({ [SETTINGS_KEY]: allDomains });
    } catch (e) {
        console.error('ToothLit: Error setting domain state', e);
    }
}


// --- Event Listeners ---

/**
 * Handles the click on the browser action (toolbar button).
 */
browser.action.onClicked.addListener(async (tab) => {
    const domain = getDomainFromUrl(tab.url);
    if (!domain) return;

    // Toggle the state
    const currentState = await getDomainState(domain);
    const newState = !currentState;

    await setDomainState(domain, newState);
    await updateIcon(tab.id, newState);

    // Notify the content script to update the page
    try {
        await browser.scripting.executeScript({
            target: { tabId: tab.id },
            func: (isDark) => {
                window.postMessage({
                    source: 'toothlit-background',
                    action: isDark ? 'enableDarkMode' : 'disableDarkMode'
                }, '*');
            },
            args: [newState]
        });
    } catch (e) {
        console.error(`ToothLit: Could not communicate with content script in tab ${tab.id}. It might be a restricted page.`, e);
    }
});

/**
 * Fired when a tab is updated. Used to set the initial icon state.
 */
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Ensure the tab is fully loaded and has a URL before acting.
    if (changeInfo.status === 'complete' && tab.url) {
        const domain = getDomainFromUrl(tab.url);
        if (domain) {
            const isEnabled = await getDomainState(domain);
            await updateIcon(tabId, isEnabled);
        }
    }
});
