// Feedback button + modal. Plain DOM and a native <dialog>: no OOUI, and nothing extra is
// loaded until the user actually submits (mediawiki.api is loaded on demand).

const FEEDBACK_STYLE = `
<style>
.fb-button {
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
body.ns-0 .fb-button {
    display: inline-block;
}
.fb-button::before {
    content: '';
    width: 20px;
    height: 15px;
    mask-image: __FEEDBACK_ICON__;
    mask-size: contain;
    mask-repeat: no-repeat;
    background-color: var(--link-color);
    display: inline-block;
    margin-right: 3px;
    top: 1px;
    position: relative;
}
.fb-button:hover {
    background-color: var(--background-color-base-2);
    text-decoration: none;
}

.fb-dialog {
    width: min(640px, calc(100vw - 32px));
    max-height: calc(100vh - 32px);
    padding: 0;
    border: 1px solid var(--border-color-base, #a2a9b1);
    border-radius: 4px;
    background: var(--background-color-base, #fff);
    color: var(--color-base, #202122);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}
.fb-dialog[open] {
    animation: fb-in 150ms ease-out;
}
.fb-dialog::backdrop {
    background: rgba(25, 25, 25, 0.6);
}
@keyframes fb-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
    .fb-dialog[open] { animation: none; }
}
.fb-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px 20px 16px;
}
.fb-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}
.fb-title {
    margin: 0;
    padding: 0;
    border: 0;
    font-family: 'Retail Demo', 'Radiance', sans-serif;
    font-size: 20px;
    font-weight: bold;
    color: var(--color-emphasized, inherit);
}
.fb-close {
    flex: none;
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--color-subtle, inherit);
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
}
.fb-close:hover {
    background: var(--background-color-base-2, rgba(0, 0, 0, 0.08));
    color: var(--color-base, inherit);
}
.fb-hint {
    margin: 0;
    font-size: 14px;
    color: var(--color-subtle, inherit);
}
.fb-textarea {
    box-sizing: border-box;
    width: 100%;
    min-height: 140px;
    padding: 10px 12px;
    resize: vertical;
    border: 1px solid var(--border-color-base, #a2a9b1);
    border-radius: 4px;
    background: var(--background-color-neutral-subtle, transparent);
    color: var(--color-base, inherit);
    font: inherit;
    font-size: 15px;
    line-height: 1.5;
}
.fb-textarea:focus {
    outline: 2px solid var(--link-color);
    outline-offset: -1px;
}
.fb-error {
    margin: 0;
    font-size: 14px;
    color: var(--color-destructive, #d33);
}
.fb-error:empty {
    display: none;
}
.fb-footer {
    display: flex;
    align-items: center;
    gap: 8px;
}
.fb-count {
    margin-right: auto;
    font-size: 13px;
    color: var(--color-subtle, inherit);
    font-variant-numeric: tabular-nums;
}
.fb-count.is-invalid {
    color: var(--color-destructive, #d33);
}
.fb-btn {
    min-height: 34px;
    padding: 0 16px;
    border: 1px solid var(--border-color-base, #a2a9b1);
    border-radius: 4px;
    background: transparent;
    color: var(--color-base, inherit);
    font: inherit;
    font-weight: bold;
    cursor: pointer;
}
.fb-btn:hover {
    background: var(--background-color-base-2, rgba(0, 0, 0, 0.08));
}
.fb-btn--primary {
    border-color: transparent;
    background: var(--background-color-interactive, #36c);
}
.fb-btn--primary:hover {
    background: #534b42;
}
.fb-btn:disabled {
    opacity: 0.6;
    cursor: default;
}
.fb-btn:focus-visible,
.fb-close:focus-visible {
    outline: 2px solid var(--link-color);
    outline-offset: 2px;
}
@media (max-width: 768px) {
    .fb-form {
        padding: 14px;
    }
    .fb-btn {
        flex: 1;
    }
    .fb-count {
        flex-basis: 100%;
    }
    .fb-footer {
        flex-wrap: wrap;
    }
}
</style>
`;

const FEEDBACK_SCRIPT = `
<script>
(function () {
    'use strict';

    var MIN_LENGTH = 5;
    var MAX_LENGTH = 5000;
    var dialog = null;

    function escapeForTemplate(value) {
        return String(value || '')
            .replaceAll('&', '&amp;')
            .replaceAll('=', '&#61;')
            .replaceAll('{', '&#123;')
            .replaceAll('}', '&#125;')
            .replaceAll('|', '&#124;')
            .replaceAll('[', '&#91;')
            .replaceAll(']', '&#93;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('~', '&#126;');
    }

    function getTalkPage() {
        return 'Talk:' + mw.config.get('wgPageName');
    }

    function getTalkEditUrl() {
        return mw.config.get('wgScript') + '?title=' + encodeURIComponent(getTalkPage()) + '&action=edit&section=new';
    }

    function buildDialog() {
        var el = document.createElement('dialog');
        el.className = 'fb-dialog';
        el.setAttribute('aria-labelledby', 'fb-title');
        el.innerHTML =
            '<form class="fb-form" novalidate>' +
                '<div class="fb-header">' +
                    '<h2 class="fb-title" id="fb-title">Submit feedback</h2>' +
                    '<button type="button" class="fb-close" aria-label="Close">&times;</button>' +
                '</div>' +
                '<p class="fb-hint">What can be improved on this page? Is anything wrong? Remember that you are welcome to edit the page too!</p>' +
                '<textarea class="fb-textarea" name="feedback" rows="6" maxlength="' + MAX_LENGTH + '" aria-label="Feedback" aria-describedby="fb-count fb-error"></textarea>' +
                '<p class="fb-error" id="fb-error" role="alert"></p>' +
                '<div class="fb-footer">' +
                    '<span class="fb-count" id="fb-count">0 / ' + MAX_LENGTH + '</span>' +
                    '<button type="button" class="fb-btn fb-cancel">Cancel</button>' +
                    '<button type="submit" class="fb-btn fb-btn--primary fb-submit">Submit</button>' +
                '</div>' +
            '</form>';
        document.body.appendChild(el);

        var form = el.querySelector('.fb-form');
        var textarea = el.querySelector('.fb-textarea');
        var count = el.querySelector('.fb-count');
        var error = el.querySelector('.fb-error');
        var submit = el.querySelector('.fb-submit');
        var busy = false;

        function close() {
            if (!busy) el.close();
        }

        function setError(message, linkText) {
            error.textContent = message || '';
            if (linkText) {
                var a = document.createElement('a');
                a.href = getTalkEditUrl();
                a.textContent = linkText;
                error.appendChild(document.createTextNode(' '));
                error.appendChild(a);
            }
        }

        function setBusy(value) {
            busy = value;
            submit.disabled = value;
            textarea.readOnly = value;
            submit.textContent = value ? 'Submitting\\u2026' : 'Submit';
            form.setAttribute('aria-busy', String(value));
        }

        function updateCount() {
            var length = textarea.value.trim().length;
            count.textContent = textarea.value.length + ' / ' + MAX_LENGTH;
            count.classList.toggle('is-invalid', length > 0 && length < MIN_LENGTH);
        }

        textarea.addEventListener('input', function () {
            updateCount();
            if (error.textContent) setError('');
        });
        el.querySelector('.fb-close').addEventListener('click', close);
        el.querySelector('.fb-cancel').addEventListener('click', close);
        // Click on the backdrop (outside the form) closes the dialog
        el.addEventListener('click', function (e) {
            if (e.target === el) close();
        });
        // Block Esc while a submission is in flight
        el.addEventListener('cancel', function (e) {
            if (busy) e.preventDefault();
        });

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (busy) return;

            var feedback = textarea.value.trim();
            if (feedback.length < MIN_LENGTH) {
                setError('Feedback is too short.');
                textarea.focus();
                return;
            }

            var user = mw.config.get('wgUserName') || 'Anonymous';
            var timestamp = new Date().toUTCString().replace('GMT', 'UTC');
            var text =
                '{{Feedback' +
                '|feedback=' + escapeForTemplate(feedback) +
                '|user=' + escapeForTemplate(user) +
                '|resolved=false' +
                '}}';

            setError('');
            setBusy(true);

            mw.loader.using('mediawiki.api').then(function () {
                return new mw.Api().postWithToken('csrf', {
                    action: 'edit',
                    title: getTalkPage(),
                    section: 'new',
                    sectiontitle: 'Feedback (' + timestamp + ')',
                    text: text,
                    summary: 'New feedback submitted'
                });
            }).then(function (res) {
                setBusy(false);
                var edit = res && res.edit;
                // CAPTCHA / AbuseFilter failures resolve with HTTP 200 and result != Success
                if (!edit || edit.result !== 'Success') {
                    setError(
                        edit && edit.captcha ? 'This edit requires a CAPTCHA.' : 'The wiki rejected the edit.',
                        'Post on the talk page directly.'
                    );
                    return;
                }
                textarea.value = '';
                updateCount();
                el.close();
                mw.notify("Feedback submitted successfully! See it in this article's talk page.", { type: 'success' });
            }, function (code) {
                setBusy(false);
                setError(
                    'Failed to submit feedback' + (typeof code === 'string' ? ' (' + code + ')' : '') + '.',
                    'Post on the talk page directly.'
                );
            });
        });

        return el;
    }

    function openDialog() {
        if (!dialog) dialog = buildDialog();
        if (dialog.open) return;
        // Text is kept between opens so an accidental close does not lose it
        dialog.showModal();
        dialog.querySelector('.fb-textarea').focus();
    }

    // The button is a real link to the talk page's new-section form, so it still works
    // without JS. With JS (and MediaWiki + <dialog> support) it opens the modal instead.
    document.addEventListener('click', function (e) {
        var button = e.target.closest && e.target.closest('.fb-button');
        if (!button || !window.mw || typeof HTMLDialogElement !== 'function') return;
        if (mw.config.get('wgNamespaceNumber') !== 0) return;
        e.preventDefault();
        openDialog();
    });
})();
</script>
`;

/**
 * @param {HTMLRewriter} rewriter
 * @param {string|null} talkEditHref No-JS fallback link for the button, or null for "#"
 */
export function applyFeedbackRewriter(rewriter, talkEditHref) {
    const href = escapeAttribute(talkEditHref || "#");

    // 1. Append styles to the <head> tag to ensure browser applies it immediately
    rewriter.on("head", {
        element(el) {
            el.append(FEEDBACK_STYLE.replace("__FEEDBACK_ICON__", FEEDBACK_ICON), { html: true });
        },
    });

    // 2. Inject the button directly inside #firstHeading
    rewriter.on("#firstHeading", {
        element(el) {
            el.append(`<a href="${href}" class="fb-button" role="button" aria-haspopup="dialog">Give feedback</a>`, { html: true });
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

function escapeAttribute(value) {
    return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const FEEDBACK_ICON = `url("data:image/svg+xml,%3Csvg width='20' height='18' viewBox='0 0 20 18' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M9.25 3.007C9.648 3.007 10 3.359 10 3.757C10 4.171 9.664 4.507 9.25 4.507C7.745 4.507 1.5 4.507 1.5 4.507V16.507H18.5V7.757C18.5 7.343 18.836 7.007 19.25 7.007C19.664 7.007 20 7.343 20 7.757V17.007C20 17.628 19.478 18.007 19 18.007H1C0.52 18.007 0 17.628 0 17.007V4.007C0 3.526 0.38 3.007 1 3.007H9.25ZM7.239 9.533C6.194 12.536 6.001 12.983 6.001 13.373C6.001 13.814 6.386 13.999 6.628 13.999C6.9 13.999 7.736 13.698 10.457 12.75L7.239 9.533ZM8.127 8.644L11.347 11.864L19.755 3.464C19.918 3.301 20 3.087 20 2.872C20 2.659 19.918 2.445 19.755 2.281C19.175 1.703 18.297 0.824 17.716 0.245C17.553 0.0819999 17.339 0 17.125 0C16.912 0 16.697 0.0819999 16.533 0.245L8.127 8.644Z' fill='white'/%3E%3C/svg%3E")`;
