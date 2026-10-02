/* BibTeX links remain downloadable when JavaScript is unavailable. */
(() => {
    const status = document.getElementById('citation-status');
    const dialog = document.getElementById('citation-dialog');
    const text = document.getElementById('citation-text');
    let statusTimer;

    function notify(message) {
        clearTimeout(statusTimer);
        status.textContent = message;
        status.className = 'citation-feedback';
        statusTimer = setTimeout(() => {
            status.className = 'visually-hidden';
        }, 4000);
    }

    document.querySelectorAll('a[data-citation]').forEach(link => {
        link.addEventListener('click', async event => {
            // Keep modifier clicks and browsers without dialog support native.
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
                !dialog || typeof dialog.showModal !== 'function') return;
            event.preventDefault();
            try {
                const response = await fetch(link.href);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const citation = await response.text();
                try {
                    await navigator.clipboard.writeText(citation);
                    notify(window.SitePreferences?.t('citation.copied') || 'BibTeX copied to clipboard.');
                } catch {
                    text.value = citation;
                    if (!dialog.open) dialog.showModal();
                    text.focus();
                    text.select();
                }
            } catch {
                notify(window.SitePreferences?.t('citation.failed') || 'Unable to load BibTeX. Please download the citation.');
                const download = document.createElement('a');
                download.href = link.href;
                download.download = '';
                download.click();
            }
        });
    });
})();
