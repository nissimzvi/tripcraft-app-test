/* TripCraft Mobile V111 - approved account, date, language and trip controls. */
(() => {
  'use strict';

  const VERSION = 'V111';
  const LANG_KEY = 'tc_v433_lang';
  const SAVED_NOTICE_KEY = 'tc_v111_saved_notice';
  const $ = id => document.getElementById(id);
  const english = () => localStorage.getItem(LANG_KEY) === 'en' ||
    (document.documentElement.lang || '').toLowerCase().startsWith('en');
  const label = (he, en) => english() ? en : he;

  function addDays(value, amount) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '';
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + amount);
    return date.toISOString().slice(0, 10);
  }

  function formatDate(value) {
    const text = String(value || '').trim();
    const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (iso) return `${iso[3].padStart(2, '0')}/${iso[2].padStart(2, '0')}/${iso[1]}`;
    const local = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (local) return `${local[1].padStart(2, '0')}/${local[2].padStart(2, '0')}/${local[3]}`;
    return text;
  }

  function todayIso() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function renderDatePreview(id) {
    const input = $(id);
    const preview = $(`${id}Preview`);
    if (!input || !preview) return;
    preview.textContent = input.value ? formatDate(input.value) : '';
  }

  function syncDateRange() {
    const start = $('plStart');
    const end = $('plEnd');
    if (!start || !end) return;
    const today = todayIso();
    start.min = today;
    end.min = start.value ? addDays(start.value, 1) : today;
    start.lang = 'en-GB';
    end.lang = 'en-GB';
    start.dir = 'ltr';
    end.dir = 'ltr';
    if (start.value && end.value && end.value <= start.value) {
      end.value = '';
      end.dispatchEvent(new Event('change', { bubbles: true }));
    }
    renderDatePreview('plStart');
    renderDatePreview('plEnd');
  }

  function normalizeVisibleDates(root = document.body) {
    if (!root || typeof document.createTreeWalker !== 'function') return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(textNode => {
      const parent = textNode.parentElement;
      if (!parent || parent.closest('script,style,input,textarea,option,[contenteditable="true"]')) return;
      const current = textNode.nodeValue || '';
      const next = current
        .replace(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, (_, y, m, d) =>
          `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`)
        .replace(/\b(\d{1,2})-(\d{1,2})-(\d{4})\b/g, (_, d, m, y) =>
          `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`);
      if (next !== current) textNode.nodeValue = next;
    });
  }

  async function copyText(value) {
    const text = String(value || '');
    if (!text) return false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) { }
    const area = document.createElement('textarea');
    area.value = text;
    area.readOnly = true;
    area.setAttribute('aria-hidden', 'true');
    area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, text.length);
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) { }
    area.remove();
    if (!copied) window.prompt(label('העתיקו את הקישור:', 'Copy this link:'), text);
    return copied;
  }

  function showCopied(button) {
    if (!button) return;
    button.textContent = label('הקישור הועתק ✓', 'Link Copied ✓');
    window.setTimeout(() => {
      if (button.isConnected) button.textContent = label('העתק קישור', 'Copy Link');
    }, 1800);
  }

  function savedNotice() {
    const timestamp = Number(sessionStorage.getItem(SAVED_NOTICE_KEY) || 0);
    if (!timestamp || Date.now() - timestamp > 7000) return;
    const account = $('tcAccountBody');
    if (!account || $('tcV111SavedNotice')) return;
    const notice = document.createElement('div');
    notice.id = 'tcV111SavedNotice';
    notice.className = 'safe tc-v111-saved-notice';
    notice.innerHTML = `<strong>${label('הטיול נשמר ✓', 'Trip Saved ✓')}</strong>`;
    account.prepend(notice);
    window.setTimeout(() => {
      sessionStorage.removeItem(SAVED_NOTICE_KEY);
      notice.remove();
    }, Math.max(800, 7000 - (Date.now() - timestamp)));
  }

  function enhanceAccount() {
    const account = $('tcAccountBody');
    if (!account) return;
    account.querySelectorAll('#tcV102Logout,#tcLogout').forEach(button => button.remove());
    account.querySelectorAll('.v102-trip-card').forEach(card => {
      const open = card.querySelector('[data-v102-open],[data-v111-open]');
      if (open) {
        const id = open.dataset.v111Open || open.dataset.v102Open;
        if (id) open.dataset.v111Open = id;
        open.removeAttribute('data-v102-open');
        open.onclick = null;
        open.dataset.he = 'פתח ועדכן טיול';
        open.dataset.en = 'Open and Update Trip';
        open.textContent = label(open.dataset.he, open.dataset.en);
      }
      const copy = card.querySelector('[data-v102-copy],[data-v111-copy]');
      if (copy) {
        const id = copy.dataset.v111Copy || copy.dataset.v102Copy;
        if (id) copy.dataset.v111Copy = id;
        copy.removeAttribute('data-v102-copy');
        copy.onclick = null;
        copy.dataset.he = 'העתק קישור';
        copy.dataset.en = 'Copy Link';
        copy.textContent = label(copy.dataset.he, copy.dataset.en);
      }
    });
    savedNotice();
    normalizeVisibleDates(account);
  }

  function enhancePlanner() {
    const plannerCopy = $('plannerCopyLink');
    const savedCopy = $('tcV102CopyTrip');
    [plannerCopy, savedCopy].filter(Boolean).forEach(button => {
      button.classList.remove('soft', 'secondary');
      button.classList.add('green', 'tc-v111-edit-copy');
    });
    document.querySelectorAll('#plannerDraftDays > .day-row').forEach((row, index) => {
      row.dataset.v111Day = String(index);
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', label(`פתח פירוט יום ${index + 1}`, `Open Day ${index + 1} Details`));
      const open = row.querySelector('.day-action button:first-child');
      if (open) {
        open.dataset.v110Action = 'open-day';
        open.dataset.v110Day = String(index);
      }
    });
    syncDateRange();
    normalizeVisibleDates($('planner'));
  }

  function ensureMobileLogout() {
    const menu = $('tcMobileMenu');
    if (!menu || $('tcV111MobileLogout')) return;
    const button = document.createElement('button');
    button.id = 'tcV111MobileLogout';
    button.type = 'button';
    button.className = 'tc-v111-mobile-logout';
    button.dataset.he = 'התנתק';
    button.dataset.en = 'Sign Out';
    button.textContent = label(button.dataset.he, button.dataset.en);
    const languages = menu.querySelector('.mobile-lang');
    if (languages) languages.before(button); else menu.appendChild(button);
  }

  async function signOut() {
    try { await window.TripCraftV102?.supabase?.()?.auth.signOut(); } catch (_) { }
    localStorage.removeItem('tc_v433_customer');
    localStorage.removeItem('tc_v108_last_activity');
    sessionStorage.removeItem('tc_v108_session_window');
    document.body.classList.remove('tc-logged-in');
    window.tcMenu?.(false);
    location.hash = '#home';
    window.tcRouteRefresh?.('home');
  }

  async function openSavedTrip(button) {
    const id = button?.dataset.v111Open;
    if (!id || button.dataset.v111Busy === '1') return;
    button.dataset.v111Busy = '1';
    button.disabled = true;
    const original = label('פתח ועדכן טיול', 'Open and Update Trip');
    button.textContent = label('פותח...', 'Opening...');
    try {
      const opened = await window.TripCraftV102?.openTrip?.(id);
      if (opened === false) throw new Error(label('הטיול לא נמצא בחשבון.', 'The trip was not found in this account.'));
      window.TripCraftV108State?.markOpened?.();
    } catch (error) {
      alert(label('לא ניתן לפתוח את הטיול: ', 'Could not open the trip: ') +
        (error?.message || label('שגיאה לא ידועה', 'Unknown error')));
      button.disabled = false;
      button.textContent = original;
    } finally {
      button.dataset.v111Busy = '0';
    }
  }

  function switchLanguage(targetLanguage) {
    if (!['he', 'en'].includes(targetLanguage)) return;
    localStorage.setItem(LANG_KEY, targetLanguage);
    const url = new URL(location.href);
    const filename = targetLanguage === 'en' ? 'index-en.html' : 'index.html';
    url.pathname = url.pathname.endsWith('/') ? url.pathname + filename :
      url.pathname.replace(/[^/]*$/, filename);
    location.assign(url.toString());
  }

  function handleClick(event) {
    const languageButton = event.target.closest?.('[data-lang]');
    if (languageButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      switchLanguage(languageButton.dataset.lang);
      return;
    }
    const open = event.target.closest?.('[data-v111-open]');
    if (open) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openSavedTrip(open);
      return;
    }
    const accountCopy = event.target.closest?.('[data-v111-copy]');
    if (accountCopy) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const url = window.TripCraftV102?.tripUrl?.(accountCopy.dataset.v111Copy) || '';
      copyText(url).then(() => showCopied(accountCopy));
      return;
    }
    const editCopy = event.target.closest?.('#plannerCopyLink,#tcV102CopyTrip');
    if (editCopy) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const input = editCopy.id === 'plannerCopyLink' ? $('plannerShareLink') : $('tcV102TripLink');
      copyText(input?.value || '').then(() => showCopied(editCopy));
      return;
    }
    const changeHotel = event.target.closest?.('[data-v108-change-day]');
    if (changeHotel) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.TripCraftV108Hotels?.openDayDialog?.(Number(changeHotel.dataset.v108ChangeDay));
      return;
    }
    if (event.target.closest?.('#tcV111MobileLogout')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      signOut();
      return;
    }
    const day = event.target.closest?.('#plannerDraftDays > .day-row[data-v111-day]');
    if (day && !event.target.closest('a,button,input,textarea,select,label')) {
      event.preventDefault();
      window.plannerEditDay?.(Number(day.dataset.v111Day));
    }
  }

  function handleKeydown(event) {
    const day = event.target.closest?.('#plannerDraftDays > .day-row[data-v111-day]');
    if (!day || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    window.plannerEditDay?.(Number(day.dataset.v111Day));
  }

  function wrapAccountRenderer() {
    const api = window.TripCraftV102;
    if (!api?.renderAccount || api.renderAccount.tcV111Wrapped) return;
    const original = api.renderAccount.bind(api);
    const wrapped = async function () {
      const result = await original(...arguments);
      window.setTimeout(enhanceAccount, 0);
      return result;
    };
    wrapped.tcV111Wrapped = true;
    api.renderAccount = wrapped;
    window.tcRenderAccount = wrapped;
  }

  function installStyles() {
    if ($('tc-v111-styles')) return;
    const style = document.createElement('style');
    style.id = 'tc-v111-styles';
    style.textContent = `
      html,body{max-width:100%!important;overflow-x:hidden!important}
      #plannerCopyLink.tc-v111-edit-copy,#tcV102CopyTrip.tc-v111-edit-copy{
        background:#168657!important;color:#fff!important;border-color:#168657!important
      }
      #plannerDraftDays>.day-row{
        border:2px solid #9cb7c8!important;box-shadow:0 7px 20px rgba(13,53,87,.14)!important;
        cursor:pointer!important;outline:none!important
      }
      #plannerDraftDays>.day-row:focus-visible{
        border-color:#176ea5!important;box-shadow:0 0 0 4px rgba(23,110,165,.18)!important
      }
      .tc-v108-result-actions,.tc-v108-result-actions .btn{
        pointer-events:auto!important
      }
      body.tc-v108-built .tc-v108-result-actions{z-index:7000!important}
      #tcAccountBody .account-card .cta{grid-template-columns:1fr!important}
      #tcAccountBody .account-card .cta .planner-color{width:100%!important}
      .tc-v111-mobile-logout{
        display:none;width:calc(100% - 24px);margin:12px;padding:12px 14px;border:0;border-radius:12px;
        background:#c62828;color:#fff;font:inherit;font-weight:900;cursor:pointer
      }
      body.tc-logged-in .tc-v111-mobile-logout{display:block}
      .tc-v111-saved-notice{margin:0 0 14px!important;text-align:center;font-size:17px}
      .date-preview{direction:ltr!important;unicode-bidi:isolate!important}
      @media(max-width:620px){
        #plannerDraftDays>.day-row{border-width:2px!important;border-radius:14px!important}
        #plannerDraftDays>.day-row>.day-no{min-height:36px!important;padding:5px 8px!important}
        #plannerDraftDays>.day-row>.day-no b{font-size:20px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyles();
    wrapAccountRenderer();
    ensureMobileLogout();
    enhanceAccount();
    enhancePlanner();
    normalizeVisibleDates();
    $('plStart')?.addEventListener('input', syncDateRange);
    $('plStart')?.addEventListener('change', syncDateRange);
    $('plEnd')?.addEventListener('input', syncDateRange);
    $('plEnd')?.addEventListener('change', syncDateRange);
    $('plEnd')?.addEventListener('focus', syncDateRange);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeydown, true);
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        wrapAccountRenderer();
        ensureMobileLogout();
        enhanceAccount();
        enhancePlanner();
        normalizeVisibleDates();
      });
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('pageshow', () => {
      enhanceAccount();
      enhancePlanner();
    });
    window.addEventListener('hashchange', () => window.setTimeout(() => {
      enhanceAccount();
      enhancePlanner();
    }, 30));
    document.documentElement.dataset.tripcraftVersion = VERSION;
    document.documentElement.dataset.tripcraftBuild = 'V111-MOBILE';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
