const FEEDBACK_STYLE = `
<style>
.feedback-button {
    display: none; /* Hide by default on non-article pages */
    margin-left: 20px;
    font-size: 16px;
    cursor: pointer;
    position: relative;
    font-family: 'Retail Demo', 'Open Sans';
    color: var(--link-color);
    padding: 0 5px;
    transition: 0.1s background-color ease;
}
/* Instantly display the button on Main/Article namespace pages */
body.ns-0 .feedback-button {
    display: inline-block;
}
.feedback-button::before {
    content: '';
    width: 20px;
    height: 15px;
    mask-image: url("data:image/svg+xml,%3Csvg width='20' height='18' viewBox='0 0 20 18' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M9.25 3.007C9.648 3.007 10 3.359 10 3.757C10 4.171 9.664 4.507 9.25 4.507C7.745 4.507 1.5 4.507 1.5 4.507V16.507H18.5V7.757C18.5 7.343 18.836 7.007 19.25 7.007C19.664 7.007 20 7.343 20 7.757V17.007C20 17.628 19.478 18.007 19 18.007H1C0.52 18.007 0 17.628 0 17.007V4.007C0 3.526 0.38 3.007 1 3.007H9.25ZM7.239 9.533C6.194 12.536 6.001 12.983 6.001 13.373C6.001 13.814 6.386 13.999 6.628 13.999C6.9 13.999 7.736 13.698 10.457 12.75L7.239 9.533ZM8.127 8.644L11.347 11.864L19.755 3.464C19.918 3.301 20 3.087 20 2.872C20 2.659 19.918 2.445 19.755 2.281C19.175 1.703 18.297 0.824 17.716 0.245C17.553 0.0819999 17.339 0 17.125 0C16.912 0 16.697 0.0819999 16.533 0.245L8.127 8.644Z' fill='white'/%3E%3C/svg%3E") !important;
    mask-size: contain;
    mask-repeat: no-repeat;
    background-color: var(--link-color);
    display: inline-block;
    margin-right: 3px;
    top: 1px;
    position: relative;
}
.feedback-button:hover {
    background-color: var(--background-color-base-2);
}
.feedback-box {
    margin: 0.8em 0;
    padding: 12px 14px;
    border: 1px solid var(--border-color-subtle);
    background: var(--background-color-neutral-subtle);
    color: var(--color-base);
}
.feedback-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.65em;
    font-size: 0.85rem;
    color: var(--color-subtle);
}
.feedback-user {
    font-weight: 700;
    color: var(--color-emphasized);
}
.feedback-separator {
    opacity: 0.7;
}
.feedback-status {
    display: inline-flex;
    align-items: center;
    padding: 0.15rem 0.55rem;
    border-radius: 4px;
    font-size: 0.72rem;
    text-transform: uppercase;
    border: 1px solid transparent;
}
.feedback-status--unresolved {
    color: white;
    background: var(--color-destructive);
    border-color: var(--color-destructive);
}
.feedback-status--resolved {
    color: white;
    background: var(--color-content-added);
    border-color: var(--color-content-added);
}
.feedback-body {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.6;
    font-size: 0.95rem;
    color: var(--color-base);
}
/*///////////////////////////////*/
.oo-ui-windowManager-modal > .oo-ui-dialog {
    background-color: rgba(25, 25, 25, 0.6);
    opacity: 0;
    transition-property: opacity;
    transition-duration: 150ms;
}
.feedback-wrapper .oo-ui-messageDialog-title {
    text-align: left;
    font-size: 18px;
}
/*///////////////////////////////*/
.feedback-wrapper .oo-ui-window-frame {
    width: 60% !important;
}
.feedback-wrapper .oo-ui-textInputWidget {
    max-width: unset !important;
}
.feedback-wrapper .oo-ui-buttonElement-framed.oo-ui-widget-enabled.oo-ui-flaggedElement-primary.oo-ui-flaggedElement-progressive > .oo-ui-buttonElement-button {
    background-color: var(--background-color-interactive);
}
.feedback-wrapper .oo-ui-buttonElement-framed.oo-ui-widget-enabled.oo-ui-flaggedElement-primary.oo-ui-flaggedElement-progressive > .oo-ui-buttonElement-button:hover {
    background-color: #534b42;
}
.feedback-wrapper .oo-ui-messageDialog-actions-vertical {
    display: flex;
    width: 100%;
}
.feedback-wrapper .oo-ui-messageDialog-actions-vertical .oo-ui-actionWidget {
    flex: 1 !important;
}
.feedback-wrapper .oo-ui-window-frame {
    height: 239.719px !important;
}
.feedback-wrapper .oo-ui-textInputWidget.oo-ui-widget-enabled .oo-ui-inputWidget-input {
    height: 132px !important;
}
.feedback-wrapper .oo-ui-messageDialog-title {
    font-weight: bold;
    font-family: 'Retail Demo', 'Radiance', sans-serif !important;
    margin-bottom: 2px;
}
.oo-ui-textInputWidget.oo-ui-widget-enabled:hover .oo-ui-inputWidget-input:focus,
.oo-ui-textInputWidget.oo-ui-widget-enabled textarea.oo-ui-inputWidget-input:focus,
.oo-ui-buttonElement-framed.oo-ui-widget-enabled.oo-ui-flaggedElement-primary.oo-ui-flaggedElement-progressive > .oo-ui-buttonElement-button:focus,
.oo-ui-buttonElement-framed.oo-ui-widget-enabled > .oo-ui-buttonElement-button {
    border: 1px solid var(--border-color-base, #a2a9b1) !important;
    outline: none !important;
    box-shadow: none !important;
}
.oo-ui-buttonElement-frameless.oo-ui-widget-enabled > .oo-ui-buttonElement-button:focus {
    border-color: transparent !important;
    box-shadow: none !important;
}
.feedback-instruction {
    font-size: 13px;
    display: block;
    opacity: 0.7;
}
</style>
`;

const FEEDBACK_SCRIPT = `
<script>
(function() {
    function initFeedback() {
        // Poll until jQuery, mediaWiki, AND ResourceLoader dependencies are fully built
        if (!window.jQuery || !window.mediaWiki || !window.mediaWiki.loader || typeof window.mediaWiki.loader.using !== 'function') {
            setTimeout(initFeedback, 50);
            return;
        }
        (function ($, mw) {
            'use strict';
            function escapeForTemplate(value) {
                return String(value || '')
                    .replace(/&/g, '&amp;')
                    .replace(/\\{/g, '&#123;')
                    .replace(/\\}/g, '&#125;')
                    .replace(/\\|/g, '&#124;')
                    .replace(/\\[/g, '&#91;')
                    .replace(/\\]/g, '&#93;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
            }
            function init() {
                // Double-check namespace just to be safe
                if (mw.config.get('wgNamespaceNumber') !== 0) {
                    return;
                }
                const api = new mw.Api();
                const windowManager = new OO.ui.WindowManager();
                $(document.body).append(windowManager.$element);
                
                const feedbackDialog = new OO.ui.MessageDialog();
                feedbackDialog.$element.addClass('feedback-wrapper');
                const feedbackInput = new OO.ui.MultilineTextInputWidget({
                    placeholder: 'What can be improved on this page? Is anything wrong? Is there anything you would like to see added?',
                    rows: 6,
                    autosize: true
                });
                windowManager.addWindows([feedbackDialog]);
                
                function submitFeedback(feedback) {
                    const pageName = mw.config.get('wgPageName');
                    let talkPage;
                    try {
                        talkPage = new mw.Title(pageName).getTalkPage().getPrefixedText();
                    } catch (e) {
                        mw.notify('Cannot determine talk page.', { type: 'error' });
                        return;
                    }
                    const user = mw.config.get('wgUserName') || 'Anonymous';
                    const timestamp = new Date().toUTCString().replace('GMT', 'UTC');
                    const text =
                        '{{Feedback' +
                        '|feedback=' + escapeForTemplate(feedback) +
                        '|user=' + escapeForTemplate(user) +
                        '|resolved=false' +
                        '}}';
                    mw.notify('Submitting feedback...', { type: 'info' });
                    api.postWithToken('csrf', {
                        action: 'edit',
                        title: talkPage,
                        section: 'new',
                        sectiontitle: 'Feedback (' + timestamp + ')',
                        text: text,
                        summary: 'New feedback submitted'
                    }).then(function () {
                        mw.notify('Feedback submitted successfully!', { type: 'success' });
                        feedbackInput.setValue('');
                    }).catch(function () {
                        mw.notify('Failed to submit feedback.', { type: 'error' });
                    });
                }
                
                function openFeedbackDialog() {
                    const opening = windowManager.openWindow(feedbackDialog, {
                        title: 'Submit feedback',
                        message: feedbackInput.$element,
                        actions: [
                            {
                                action: 'submit',
                                label: 'Submit',
                                flags: ['primary', 'progressive']
                            },
                            {
                                action: 'cancel',
                                label: 'Cancel',
                                flags: ['safe']
                            }
                        ]
                    });
                    opening.closed.then(function (data) {
                        if (!data || data.action !== 'submit') {
                            return;
                        }
                        const feedback = feedbackInput.getValue().trim();
                        if (!feedback) {
                            mw.notify('Please enter feedback.', { type: 'warning' });
                            return;
                        }
                        if (feedback.length < 5) {
                            mw.notify('Feedback is too short.', { type: 'warning' });
                            return;
                        }
                        submitFeedback(feedback);
                    });
                }
                
                // Bind click event handler to the pre-rendered server-side button
                $('.feedback-button').on('click', function (e) {
                    e.preventDefault(); 
                    openFeedbackDialog();
                });
            }
            // Standard module loading happens async here, long after the button is visible
            mw.loader.using([
                'mediawiki.api',
                'mediawiki.Title',
                'oojs-ui-core',
                'oojs-ui-windows'
            ]).then(init);
        })(window.jQuery, window.mediaWiki);
    }
    initFeedback();
})();
</script>
`;

export function applyFeedbackRewriter(rewriter) {
    // 1. Append styles to the <head> tag to ensure browser applies it immediately
    rewriter.on("head", {
        element(el) {
            el.append(FEEDBACK_STYLE, { html: true });
        },
    });

    // 2. Inject the HTML string natively onto the edge proxy directly inside #firstHeading
    rewriter.on("#firstHeading", {
        element(el) {
            el.append('<a href="#" class="feedback-button">Give feedback</a>', { html: true });
        },
    });

    // 3. Append the operational logic script before the closing body tag
    rewriter.on("body", {
        element(el) {
            el.append(FEEDBACK_SCRIPT, { html: true });
        },
    });
    return rewriter;
}
