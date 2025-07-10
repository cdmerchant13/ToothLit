
/**
 * ToothLit - contentScript.js
 *
 * This script is injected into every webpage. Its primary jobs are:
 * 1. Apply dark mode on page load if it was previously enabled for the domain.
 * 2. Listen for messages from the background script to toggle dark mode on/off.
 * 3. Inject and remove the fallback CSS stylesheet.
 */

(() => {
    const FALLBACK_STYLE_ID = 'toothlit-dark-mode-fallback-css';
    const domain = window.location.hostname;

    // --- Core Functions ---

    /**
     * Enables dark mode.
     * It first tries to use the native 'color-scheme' CSS property.
     * Then, it injects the fallback stylesheet for sites that don't respect it.
     */
    const enableDarkMode = () => {
        // 1. Use the modern, native approach first.
        document.documentElement.style.setProperty('color-scheme', 'dark', 'important');

        // 2. Inject the fallback stylesheet if it doesn't already exist.
        if (!document.getElementById(FALLBACK_STYLE_ID)) {
            const link = document.createElement('link');
            link.id = FALLBACK_STYLE_ID;
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = browser.runtime.getURL('dark-mode.css');
            document.head.appendChild(link);
        }
    };

    /**
     * Disables dark mode by removing the styles.
     */
    const disableDarkMode = () => {
        // 1. Remove the native color-scheme override.
        document.documentElement.style.removeProperty('color-scheme');

        // 2. Remove the fallback stylesheet.
        const fallbackStyle = document.getElementById(FALLBACK_STYLE_ID);
        if (fallbackStyle) {
            fallbackStyle.remove();
        }
    };

    // --- Event & Message Handling ---

    /**
     * Listen for messages from the background script.
     * Using window.postMessage to receive messages from executeScript.
     */
    window.addEventListener('message', (event) => {
        // We only accept messages from ourselves
        if (event.source === window && event.data && event.data.source === 'toothlit-background') {
            if (event.data.action === 'enableDarkMode') {
                enableDarkMode();
            } else if (event.data.action === 'disableDarkMode') {
                disableDarkMode();
            }
        }
    }, false);


    /**
     * On initial script load, check storage and apply dark mode if needed.
     * This ensures the page loads in dark mode without a flash of light.
     */
    const SETTINGS_KEY = 'toothlit_settings';
    browser.storage.local.get(SETTINGS_KEY).then(settings => {
        const allDomains = settings[SETTINGS_KEY] || {};
        if (allDomains[domain]) {
            enableDarkMode();
        }
    }).catch(e => {
        console.error('ToothLit: Could not read storage.', e);
    });

})();
