/* TripCraft Mobile V113 - reliable account actions and logo-only navigation. */
(() => {
  'use strict';

  const VERSION = 'V113';
  const LANG_KEY = 'tc_v433_lang';
  const CUSTOMER_KEY = 'tc_v433_customer';
  const LOCAL_TRIPS_KEY = 'tc_v433_purchases';
  const $ = id => document.getElementById(id);
  let records = [];
  let accountLoadToken = 0;
  let calendarState = null;
  let accountRepairQueued = false;
  const stableOpenTrip = window.TripCraftV102?.openTrip?.bind(window.TripCraftV102);

  const isEnglish = () => (document.documentElement.lang || '').toLowerCase().startsWith('en') || localStorage.getItem(LANG_KEY) === 'en';
  const t = (he, en) => isEnglish() ? en : he;
  const deepCopy = value => JSON.parse(JSON.stringify(value));
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function parseJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || '') || fallback; }
    catch (_) { return fallback; }
  }

  function customer() {
    try {
      if (typeof window.tcCustomer === 'function') return window.tcCustomer();
    } catch (_) { }
    return parseJson(CUSTOMER_KEY, null);
  }

  function isoToday() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function addDays(value, amount) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '';
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + amount);
    return date.toISOString().slice(0, 10);
  }

  function formatDate(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value || '');
  }

  function timestamp(value) {
    const time = Date.parse(value || '');
    return Number.isFinite(time) ? time : 0;
  }

  function normalizeRecord(row, source) {
    const id = row?.tripId || row?.id;
    if (!id) return null;
    return {
      id: String(id),
      name: row.tripName || row.name || String(id),
      destination: row.destination || row.tripDraft?.plannerProfile?.destination || row.draft?.plannerProfile?.destination || '',
      start: row.start || row.start_date || row.tripDraft?.plannerProfile?.start || row.draft?.plannerProfile?.start || '',
      end: row.end || row.end_date || row.tripDraft?.plannerProfile?.end || row.draft?.plannerProfile?.end || '',
      draft: row.tripDraft || row.draft || null,
      updated: row.updated_at || row.date || row.created_at || '',
      source
    };
  }

  function mergeRecords(groups) {
    const map = new Map();
    groups.flat().filter(Boolean).forEach(record => {
      const current = map.get(record.id);
      if (!current || (!current.draft && record.draft) || timestamp(record.updated) > timestamp(current.updated)) {
        map.set(record.id, { ...current, ...record, draft: record.draft || current?.draft || null });
      }
    });
    return [...map.values()].sort((a, b) => timestamp(b.updated) - timestamp(a.updated));
  }

  async function cloudRecords() {
    const api = window.TripCraftV102;
    const sb = api?.supabase?.();
    if (!sb) return [];
    const session = (await sb.auth.getSession())?.data?.session;
    if (!session?.user) return [];
    const readTable = async (table, source) => {
      try {
        const { data, error } = await sb.from(table)
          .select('id,name,destination,start_date,end_date,draft,updated_at')
          .eq('user_id', session.user.id)
          .order('updated_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(row => normalizeRecord(row, source)).filter(Boolean);
      } catch (error) {
        console.warn(`V113: ${table} unavailable`, error?.message || error);
        return [];
      }
    };
    const [current, legacy] = await Promise.all([
      readTable('tripcraft_trips', 'tripcraft_trips'),
      readTable('trips', 'trips')
    ]);
    return [...current, ...legacy];
  }

  function localRecords() {
    const user = customer();
    return parseJson(LOCAL_TRIPS_KEY, [])
      .filter(row => !user || row.customer?.id === user.id || String(row.customer?.email || '').toLowerCase() === String(user.email || '').toLowerCase())
      .map(row => normalizeRecord(row, 'local'))
      .filter(Boolean);
  }

  function accountCard(record) {
    const range = record.start || record.end
      ? `<span class="tc-v112-date-range" dir="ltr">${escapeHtml(formatDate(record.start) || '—')} – ${escapeHtml(formatDate(record.end) || '—')}</span>`
      : '—';
    const url = window.TripCraftV102?.tripUrl?.(record.id) || `${location.origin}${location.pathname}#trip/${encodeURIComponent(record.id)}`;
    return `<article class="safe tc-v112-trip-card" data-v112-card="${escapeHtml(record.id)}">
      <h3>${escapeHtml(record.name)}</h3>
      <div><b>${t('יעד:', 'Destination:')}</b> ${escapeHtml(record.destination || '—')}</div>
      <div><b>${t('תאריכים:', 'Dates:')}</b> ${range}</div>
      <div class="tc-v112-link"><b>${t('קישור אישי:', 'Personal link:')}</b><span dir="ltr">${escapeHtml(url)}</span></div>
      <div class="cta tc-v112-trip-actions">
        <button class="btn secondary" type="button" data-v112-open="${escapeHtml(record.id)}">${t('פתח ועדכן טיול', 'Open and Update Trip')}</button>
        <button class="btn green" type="button" data-v112-copy="${escapeHtml(record.id)}">${t('העתק קישור', 'Copy Link')}</button>
        <button class="btn tc-v112-delete" type="button" data-v112-delete="${escapeHtml(record.id)}">${t('מחק טיול', 'Delete Trip')}</button>
      </div>
    </article>`;
  }

  function renderAccountBody(list) {
    const box = $('tcAccountBody');
    const user = customer();
    if (!box) return;
    if (!user) {
      box.innerHTML = `<div class="safe tc-v113-account-view">${t('כדי לראות את הטיולים יש להיכנס עם אימייל וקוד אימות.', 'Sign in with your email and verification code to view your trips.')}</div>`;
      return;
    }
    const name = [user.firstName || user.first_name, user.lastName || user.last_name].filter(Boolean).join(' ') || t('החשבון שלי', 'My Account');
    const notice = Number(sessionStorage.getItem('tc_v113_saved_notice') || 0);
    const saved = notice && Date.now() - notice < 15000
      ? `<div class="safe tc-v112-saved"><strong>${t('הטיול נשמר בהצלחה ✓', 'Trip saved successfully ✓')}</strong></div>` : '';
    box.dataset.v113Rendered = '1';
    box.innerHTML = `${saved}<section class="account-card tc-v112-account-card tc-v113-account-card tc-v113-account-view">
      <h3>${escapeHtml(name)}</h3>
      <p>${escapeHtml(user.email || '')}${user.phone ? ` · ${escapeHtml(user.phone)}` : ''}</p>
      <div class="cta"><button class="btn planner-color" id="tcV113NewTrip" type="button">${t('בניית טיול חדש', 'Build a New Trip')}</button></div>
    </section>
    <h3 class="tc-v112-my-trips">${t('הטיולים שלי', 'My Trips')}</h3>
    <p>${t('בחרו טיול קיים כדי לפתוח ולעדכן אותו, או התחילו טיול חדש.', 'Open and update an existing trip, or start a new one.')}</p>
    <div class="tc-v112-trip-list">${list.length ? list.map(accountCard).join('') : `<div class="warn">${t('עדיין אין טיולים בחשבון.', 'There are no trips in this account yet.')}</div>`}</div>`;
    bindAccountActions(box);
  }

  function startNewTrip() {
    window.TripCraftV108State?.resetState?.();
    window.TripCraftV102?.resetNewTrip?.();
    location.hash = '#planner';
    window.tcRouteRefresh?.('planner');
    window.scrollTo?.({ top: 0, behavior: 'auto' });
    window.setTimeout(() => $('plTripName')?.focus(), 120);
  }

  function bindAccountActions(box) {
    const newTrip = box.querySelector('#tcV113NewTrip');
    if (newTrip) newTrip.onclick = event => { event.preventDefault(); startNewTrip(); };
    box.querySelectorAll('[data-v112-open]').forEach(button => {
      button.onclick = async event => {
        event.preventDefault();
        if (button.dataset.v113Busy === '1') return;
        button.dataset.v113Busy = '1';
        button.disabled = true;
        const old = button.textContent;
        button.textContent = t('פותח...', 'Opening...');
        try { await openTrip(button.dataset.v112Open); }
        catch (error) { alert(t('לא ניתן לפתוח את הטיול: ', 'Could not open the trip: ') + error.message); }
        finally {
          if (button.isConnected) {
            button.dataset.v113Busy = '0';
            button.disabled = false;
            button.textContent = old;
          }
        }
      };
    });
    box.querySelectorAll('[data-v112-copy]').forEach(button => {
      button.onclick = event => { event.preventDefault(); copyText(actionUrl(button.dataset.v112Copy), button); };
    });
    box.querySelectorAll('[data-v112-delete]').forEach(button => {
      button.onclick = event => { event.preventDefault(); deleteTrip(button.dataset.v112Delete); };
    });
  }

  async function renderAccount() {
    const token = ++accountLoadToken;
    records = mergeRecords([localRecords(), records]);
    renderAccountBody(records);
    const cloud = await cloudRecords();
    if (token !== accountLoadToken) return records;
    records = mergeRecords([cloud, localRecords()]);
    renderAccountBody(records);
    return records;
  }

  async function findRecord(id) {
    let record = records.find(item => item.id === id);
    if (!record) {
      await renderAccount();
      record = records.find(item => item.id === id);
    }
    return record;
  }

  async function openTrip(id) {
    const record = await findRecord(id);
    if (!record) throw new Error(t('הטיול לא נמצא בחשבון.', 'The trip was not found in this account.'));
    if (!record.draft) throw new Error(t('לטיול זה לא נשמרו נתונים מלאים לעריכה.', 'This trip does not contain editable trip data.'));
    const cloud = await cloudRecords();
    if (stableOpenTrip && cloud.some(item => item.id === id)) {
      const opened = await stableOpenTrip(id);
      if (opened !== false && window.planner?.draft) {
        location.hash = '#planner';
        window.tcRouteRefresh?.('planner');
        window.setTimeout(() => {
          $('plannerResult')?.scrollIntoView({ block: 'start', behavior: 'auto' });
          enhancePlanner();
        }, 100);
        return true;
      }
    }
    const draft = deepCopy(record.draft);
    draft.tripId = id;
    window.planner = window.planner || {};
    window.planner.draft = draft;
    window.planner.currentTripId = id;
    if (typeof window.tcFillPlannerFromDraft === 'function') window.tcFillPlannerFromDraft(draft);
    if (typeof window.renderPlannerDraft === 'function') window.renderPlannerDraft();
    location.hash = '#planner';
    window.tcRouteRefresh?.('planner');
    window.TripCraftV108State?.markOpened?.();
    window.setTimeout(() => {
      $('plannerResult')?.scrollIntoView({ block: 'start', behavior: 'auto' });
      enhancePlanner();
    }, 80);
    return true;
  }

  async function copyText(value, button) {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        copied = true;
      }
    } catch (_) { }
    if (!copied) {
      const area = document.createElement('textarea');
      area.value = value;
      area.readOnly = true;
      area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(area);
      area.focus(); area.select(); area.setSelectionRange(0, value.length);
      try { copied = document.execCommand('copy'); } catch (_) { }
      area.remove();
    }
    if (!copied) window.prompt(t('העתיקו את הקישור:', 'Copy this link:'), value);
    if (button) {
      const old = button.textContent;
      button.textContent = t('הקישור הועתק ✓', 'Link Copied ✓');
      setTimeout(() => { if (button.isConnected) button.textContent = old; }, 1600);
    }
  }

  async function deleteTrip(id) {
    if (!confirm(t('למחוק את הטיול? לא ניתן לבטל פעולה זו.', 'Delete this trip? This action cannot be undone.'))) return;
    const api = window.TripCraftV102;
    const sb = api?.supabase?.();
    const user = (await sb?.auth.getSession())?.data?.session?.user;
    if (sb && user) {
      for (const table of ['tripcraft_trips', 'trips']) {
        try {
          const { error } = await sb.from(table).delete().eq('id', id).eq('user_id', user.id);
          if (error) throw error;
        } catch (error) { console.warn(`V113: delete from ${table} skipped`, error?.message || error); }
      }
    }
    const local = parseJson(LOCAL_TRIPS_KEY, []).filter(row => String(row.tripId || row.id) !== String(id));
    localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify(local));
    records = records.filter(row => row.id !== id);
    renderAccountBody(records);
  }

  async function saveCurrentTrip(button) {
    if (!window.planner?.draft || button?.dataset.v112Busy === '1') return;
    if (button) {
      button.dataset.v112Busy = '1';
      button.disabled = true;
      button.textContent = t('שומר...', 'Saving...');
    }
    try {
      const id = await window.TripCraftV102?.saveDraft?.();
      if (!id) throw new Error(t('לא התקבל אישור שמירה.', 'The save was not confirmed.'));
      window.TripCraftV108State?.markSaved?.();
      sessionStorage.setItem('tc_v113_saved_notice', String(Date.now()));
      await renderAccount();
      location.hash = '#account';
      window.tcRouteRefresh?.('account');
      window.scrollTo?.({ top: 0, behavior: 'auto' });
    } catch (error) {
      window.TripCraftV108State?.markDirty?.();
      alert(t('שמירת הטיול נכשלה: ', 'Could not save the trip: ') + (error?.message || t('שגיאה לא ידועה', 'Unknown error')));
    } finally {
      if (button) {
        button.dataset.v112Busy = '0';
        button.disabled = false;
      }
    }
  }

  function discardCurrentTrip() {
    if (!confirm(t('לצאת ללא שמירה? השינויים שלא נשמרו יימחקו.', 'Exit without saving? Unsaved changes will be discarded.'))) return;
    window.TripCraftV108State?.resetState?.();
    window.TripCraftV102?.resetNewTrip?.();
    location.hash = '#account';
    window.tcRouteRefresh?.('account');
    renderAccount();
  }

  function signOut() {
    Promise.resolve(window.TripCraftV102?.supabase?.()?.auth.signOut?.()).catch(() => {}).finally(() => {
      localStorage.removeItem(CUSTOMER_KEY);
      localStorage.removeItem('tc_v108_last_activity');
      sessionStorage.removeItem('tc_v108_session_window');
      document.body.classList.remove('tc-logged-in');
      window.tcMenu?.(false);
      location.hash = '#home';
      window.tcRouteRefresh?.('home');
    });
  }

  function ensureLogoutMenu() {
    const menu = $('tcMobileMenu');
    if (!menu) return;
    menu.querySelectorAll('#tcV111MobileLogout,#tcV112MobileLogout').forEach((button, index) => { if (index) button.remove(); });
    let button = $('tcV112MobileLogout');
    if (!button) {
      button = document.createElement('button');
      button.id = 'tcV112MobileLogout';
      button.type = 'button';
      button.className = 'tc-v112-mobile-logout';
      menu.appendChild(button);
    }
    const logoutLabel = t('התנתק', 'Sign Out');
    if (button.textContent !== logoutLabel) button.textContent = logoutLabel;
  }

  function switchLanguage(language) {
    if (!['he', 'en'].includes(language)) return;
    localStorage.setItem(LANG_KEY, language);
    const url = new URL(location.href);
    url.pathname = url.pathname.replace(/(?:index(?:-en)?\.html)?$/, language === 'en' ? 'index-en.html' : 'index.html');
    location.assign(url.toString());
  }

  function syncDateRules() {
    const start = $('plStart');
    const end = $('plEnd');
    if (!start || !end) return;
    start.min = isoToday();
    end.min = start.value ? addDays(start.value, 1) : isoToday();
    if (start.value && end.value && end.value <= start.value) {
      end.value = '';
      end.dispatchEvent(new Event('change', { bubbles: true }));
    }
    updatePickerButtons();
  }

  function calendarParts(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
  }

  function dateIso(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function ensureCalendar() {
    if ($('tcV112Calendar')) return;
    const modal = document.createElement('div');
    modal.id = 'tcV112Calendar';
    modal.className = 'tc-v112-calendar';
    modal.hidden = true;
    modal.innerHTML = `<div class="tc-v112-calendar-card" role="dialog" aria-modal="true">
      <div class="tc-v112-calendar-head"><button type="button" data-v112-cal-prev aria-label="Previous month">‹</button><strong id="tcV112CalendarMonth"></strong><button type="button" data-v112-cal-next aria-label="Next month">›</button></div>
      <div class="tc-v112-weekdays"></div><div class="tc-v112-calendar-days"></div>
      <button class="btn soft tc-v112-calendar-cancel" type="button" data-v112-cal-close>${t('ביטול', 'Cancel')}</button>
    </div>`;
    document.body.appendChild(modal);
  }

  function monthLabel(year, month) {
    return new Intl.DateTimeFormat(isEnglish() ? 'en-GB' : 'he-IL', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));
  }

  function renderCalendar() {
    ensureCalendar();
    if (!calendarState) return;
    const { year, month, inputId } = calendarState;
    const input = $(inputId);
    const min = input?.min || isoToday();
    const selected = input?.value || '';
    $('tcV112CalendarMonth').textContent = monthLabel(year, month);
    const week = document.querySelector('.tc-v112-weekdays');
    week.innerHTML = (isEnglish() ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] : ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳']).map(day => `<span>${day}</span>`).join('');
    const days = document.querySelector('.tc-v112-calendar-days');
    const first = new Date(year, month, 1).getDay();
    const count = new Date(year, month + 1, 0).getDate();
    let html = '<span></span>'.repeat(first);
    for (let day = 1; day <= count; day += 1) {
      const iso = dateIso(year, month, day);
      const disabled = iso < min;
      html += `<button type="button" data-v112-cal-day="${iso}"${disabled ? ' disabled' : ''}${iso === selected ? ' class="selected"' : ''}>${day}</button>`;
    }
    days.innerHTML = html;
  }

  function openCalendar(inputId) {
    syncDateRules();
    const input = $(inputId);
    if (!input) return;
    const base = calendarParts(input.value || input.min || isoToday()) || calendarParts(isoToday());
    calendarState = { inputId, year: base.year, month: base.month };
    ensureCalendar();
    $('tcV112Calendar').hidden = false;
    renderCalendar();
  }

  function closeCalendar() {
    if ($('tcV112Calendar')) $('tcV112Calendar').hidden = true;
    calendarState = null;
  }

  function chooseCalendarDate(value) {
    const input = $(calendarState?.inputId);
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    syncDateRules();
    closeCalendar();
  }

  function ensurePickerButtons() {
    [['plStart', 'tcV112StartPicker'], ['plEnd', 'tcV112EndPicker']].forEach(([inputId, buttonId]) => {
      const input = $(inputId);
      if (!input || $(buttonId)) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.id = buttonId;
      button.className = 'tc-v112-date-picker';
      button.dataset.v112DateInput = inputId;
      input.insertAdjacentElement('afterend', button);
    });
    updatePickerButtons();
  }

  function updatePickerButtons() {
    [['plStart', 'tcV112StartPicker'], ['plEnd', 'tcV112EndPicker']].forEach(([inputId, buttonId]) => {
      const input = $(inputId), button = $(buttonId);
      if (!input || !button) return;
      const pickerLabel = input.value ? formatDate(input.value) : t('בחרו תאריך', 'Choose a date');
      if (button.textContent !== pickerLabel) button.textContent = pickerLabel;
      button.classList.toggle('has-value', Boolean(input.value));
    });
  }

  function enhancePlanner() {
    ensurePickerButtons();
    syncDateRules();
    [$('plannerCopyLink'), $('tcV102CopyTrip')].filter(Boolean).forEach(button => {
      button.classList.remove('soft', 'secondary');
      button.classList.add('green');
    });
    document.querySelectorAll('#plannerDraftDays > .day-row').forEach((row, index) => {
      row.dataset.v112Day = String(index);
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      const button = row.querySelector('.day-action button:first-child');
      if (button) button.dataset.v112OpenDay = String(index);
    });
  }

  function actionUrl(id) {
    return window.TripCraftV102?.tripUrl?.(id) || `${location.origin}${location.pathname}#trip/${encodeURIComponent(id)}`;
  }

  function stop(event) {
    if (event.cancelable) event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function handleClick(event) {
    const language = event.target.closest?.('[data-lang]');
    if (language) { stop(event); switchLanguage(language.dataset.lang); return; }
    const save = event.target.closest?.('#plannerSaveTrip');
    if (save) { stop(event); saveCurrentTrip(save); return; }
    const discard = event.target.closest?.('#plannerDiscardTrip');
    if (discard) { stop(event); discardCurrentTrip(); return; }
    const editCopy = event.target.closest?.('#plannerCopyLink,#tcV102CopyTrip');
    if (editCopy) {
      stop(event);
      const input = editCopy.id === 'plannerCopyLink' ? $('plannerShareLink') : $('tcV102TripLink');
      copyText(input?.value || '', editCopy); return;
    }
    if (event.target.closest?.('#tcV113NewTrip,[data-v112-open],[data-v112-copy],[data-v112-delete]')) return;
    if (event.target.closest?.('#tcV112MobileLogout')) { stop(event); signOut(); return; }
    const picker = event.target.closest?.('[data-v112-date-input]');
    if (picker) { stop(event); openCalendar(picker.dataset.v112DateInput); return; }
    if (event.target.closest?.('[data-v112-cal-close]') || (event.target.id === 'tcV112Calendar')) { stop(event); closeCalendar(); return; }
    if (event.target.closest?.('[data-v112-cal-prev],[data-v112-cal-next]')) {
      stop(event);
      const change = event.target.closest('[data-v112-cal-prev]') ? -1 : 1;
      const next = new Date(calendarState.year, calendarState.month + change, 1);
      calendarState.year = next.getFullYear(); calendarState.month = next.getMonth(); renderCalendar(); return;
    }
    const calendarDay = event.target.closest?.('[data-v112-cal-day]');
    if (calendarDay && !calendarDay.disabled) { stop(event); chooseCalendarDate(calendarDay.dataset.v112CalDay); return; }
    const hotel = event.target.closest?.('[data-v108-change-day]');
    if (hotel) { stop(event); window.TripCraftV108Hotels?.openDayDialog?.(Number(hotel.dataset.v108ChangeDay)); return; }
    const dayButton = event.target.closest?.('[data-v112-open-day]');
    if (dayButton) { stop(event); window.plannerEditDay?.(Number(dayButton.dataset.v112OpenDay)); return; }
    const day = event.target.closest?.('#plannerDraftDays > .day-row[data-v112-day]');
    if (day && !event.target.closest('a,button,input,textarea,select,label')) { stop(event); window.plannerEditDay?.(Number(day.dataset.v112Day)); }
  }

  function handleKey(event) {
    const day = event.target.closest?.('#plannerDraftDays > .day-row[data-v112-day]');
    if (day && ['Enter', ' '].includes(event.key)) { stop(event); window.plannerEditDay?.(Number(day.dataset.v112Day)); }
    if (event.key === 'Escape' && calendarState) closeCalendar();
  }

  function installStyles() {
    const style = document.createElement('style');
    style.id = 'tc-v112-styles';
    style.textContent = `
      html,body{max-width:100%!important;overflow-x:hidden!important}
      .tc-v112-account-card .cta{display:grid!important;grid-template-columns:1fr!important}
      .tc-v112-account-card .planner-color{width:100%!important}
      .tc-v112-my-trips{margin-top:24px!important}
      .tc-v112-trip-card{overflow-wrap:anywhere;margin-bottom:14px!important}
      .tc-v112-link span{display:block;margin-top:5px;direction:ltr;unicode-bidi:isolate}
      .tc-v112-date-range{display:inline-block;direction:ltr;unicode-bidi:isolate}
      .tc-v112-trip-actions{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important}
      .tc-v112-trip-actions .btn{width:100%!important;min-width:0!important;padding:10px 7px!important;white-space:normal!important}
      .tc-v112-delete{background:#c62828!important;color:#fff!important}
      .tc-v112-saved{text-align:center;margin-bottom:14px!important}
      .tc-v112-mobile-logout{display:none;width:calc(100% - 24px);margin:16px 12px 12px;padding:12px 14px;border:0;border-radius:12px;background:#c62828;color:#fff;font:inherit;font-weight:900}
      body.tc-logged-in .tc-v112-mobile-logout{display:block}
      #plannerDraftDays>.day-row{border:2px solid #88a9bd!important;box-shadow:0 7px 20px rgba(13,53,87,.14)!important;cursor:pointer!important}
      #plannerDraftDays>.day-row:focus-visible{outline:4px solid rgba(23,110,165,.18)!important}
      .tc-v112-date-picker{display:none;width:100%;padding:12px;border:1px solid #cfdde6;border-radius:12px;background:#fff;color:#7b8791;font:inherit;text-align:center;direction:ltr}
      .tc-v112-date-picker.has-value{color:#173047;font-weight:800}
      .tc-v112-calendar[hidden]{display:none!important}.tc-v112-calendar{position:fixed;inset:0;z-index:25000;background:rgba(7,27,43,.48);display:flex;align-items:center;justify-content:center;padding:18px}
      .tc-v112-calendar-card{width:min(430px,100%);background:#fff;border-radius:24px;padding:18px;box-shadow:0 22px 60px rgba(0,0,0,.28);direction:rtl}
      .tc-v112-calendar-head{display:grid;grid-template-columns:48px 1fr 48px;align-items:center;gap:8px;margin-bottom:12px}
      .tc-v112-calendar-head strong{text-align:center;font-size:21px}.tc-v112-calendar-head button{border:0;background:#edf5fa;color:#0d3557;border-radius:12px;font-size:32px;line-height:42px}
      .tc-v112-weekdays,.tc-v112-calendar-days{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;text-align:center;direction:ltr}
      .tc-v112-weekdays span{padding:7px 0;color:#607887;font-weight:800}
      .tc-v112-calendar-days button{aspect-ratio:1;border:0;border-radius:50%;background:#f2f7fa;color:#173047;font:inherit;font-weight:800}
      .tc-v112-calendar-days button:disabled{background:#f4f4f4!important;color:#b8bec3!important;text-decoration:line-through;opacity:.8}
      .tc-v112-calendar-days button.selected{background:#176ea5;color:#fff}
      .tc-v112-calendar-cancel{width:100%;margin-top:14px}
      @media(max-width:620px){
        #plStart,#plEnd{display:none!important}.date-preview{display:none!important}.tc-v112-date-picker{display:block!important}
        .tc-v112-trip-actions .btn{padding:9px 4px!important;font-size:12px!important;line-height:1.15!important}
        #plannerDraftDays>.day-row{border-radius:14px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyles();
    ensureLogoutMenu();
    ensureCalendar();
    enhancePlanner();
    window.TripCraftV113 = { VERSION, renderAccount, openTrip, startNewTrip, saveCurrentTrip, deleteTrip };
    window.tcRenderAccount = renderAccount;
    if (window.TripCraftV102) {
      window.TripCraftV102.renderAccount = renderAccount;
      window.TripCraftV102.openTrip = openTrip;
    }
    window.addEventListener('click', handleClick, true);
    window.addEventListener('keydown', handleKey, true);
    $('plStart')?.addEventListener('change', syncDateRules);
    $('plEnd')?.addEventListener('change', syncDateRules);
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        ensureLogoutMenu();
        enhancePlanner();
        const account = $('tcAccountBody');
        account?.querySelectorAll('#tcLogout,#tcV102Logout').forEach(button => button.remove());
        if (location.hash === '#account' && account && !account.querySelector('.tc-v113-account-view') && !accountRepairQueued) {
          accountRepairQueued = true;
          setTimeout(() => {
            accountRepairQueued = false;
            renderAccount();
          }, 0);
        }
      });
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', () => {
      if (location.hash === '#account') renderAccount();
      setTimeout(enhancePlanner, 30);
    });
    if (location.hash === '#account') renderAccount();
    document.documentElement.dataset.tripcraftVersion = VERSION;
    document.documentElement.dataset.tripcraftBuild = 'V113-MOBILE';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
