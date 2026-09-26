/* TripCraft Mobile V116 - reliable save/update, AI changes and day details. */
(() => {
  'use strict';

  const VERSION = 'V116';
  const LANG_KEY = 'tc_v433_lang';
  const CUSTOMER_KEY = 'tc_v433_customer';
  const LOCAL_TRIPS_KEY = 'tc_v433_purchases';
  const $ = id => document.getElementById(id);
  let records = [];
  let accountLoadToken = 0;
  let calendarState = null;
  let accountRepairQueued = false;
  let editing = { id: '', source: '', original: null };
  let activeDayIndex = -1;

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
        console.warn(`V115: ${table} unavailable`, error?.message || error);
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
        <button class="btn secondary" type="button" data-v115-action="open" data-trip-id="${escapeHtml(record.id)}">${t('פתח ועדכן טיול', 'Open and Update Trip')}</button>
        <button class="btn green" type="button" data-v115-action="copy" data-trip-id="${escapeHtml(record.id)}">${t('העתק קישור', 'Copy Link')}</button>
        <button class="btn tc-v112-delete" type="button" data-v115-action="delete" data-trip-id="${escapeHtml(record.id)}">${t('מחק טיול', 'Delete Trip')}</button>
      </div>
    </article>`;
  }

  function renderAccountBody(list) {
    const box = $('tcAccountBody');
    const user = customer();
    if (!box) return;
    if (!user) {
      box.innerHTML = `<div class="safe tc-v115-account-view">${t('כדי לראות את הטיולים יש להיכנס עם אימייל וקוד אימות.', 'Sign in with your email and verification code to view your trips.')}</div>`;
      return;
    }
    const name = [user.firstName || user.first_name, user.lastName || user.last_name].filter(Boolean).join(' ') || t('החשבון שלי', 'My Account');
    const notice = Number(sessionStorage.getItem('tc_v115_saved_notice') || 0);
    const saved = notice && Date.now() - notice < 15000
      ? `<div class="safe tc-v112-saved"><strong>${t('הטיול נשמר בהצלחה ✓', 'Trip saved successfully ✓')}</strong></div>` : '';
    box.dataset.v115Rendered = '1';
    box.innerHTML = `${saved}<section class="account-card tc-v112-account-card tc-v115-account-card tc-v115-account-view">
      <h3>${escapeHtml(name)}</h3>
      <p>${escapeHtml(user.email || '')}${user.phone ? ` · ${escapeHtml(user.phone)}` : ''}</p>
      <div class="cta"><button class="btn planner-color" id="tcV115NewTrip" data-v115-action="new" type="button">${t('בניית טיול חדש', 'Build a New Trip')}</button></div>
    </section>
    <h3 class="tc-v112-my-trips">${t('הטיולים שלי', 'My Trips')}</h3>
    <p>${t('בחרו טיול קיים כדי לפתוח ולעדכן אותו, או התחילו טיול חדש.', 'Open and update an existing trip, or start a new one.')}</p>
    <div class="tc-v112-trip-list">${list.length ? list.map(accountCard).join('') : `<div class="warn">${t('עדיין אין טיולים בחשבון.', 'There are no trips in this account yet.')}</div>`}</div>`;
    bindAccountActions(box);
  }

  function showPlanner() {
    const app = $('mainApp');
    if (app) {
      app.classList.add('page-focus');
      app.dataset.page = 'planner';
    }
    if (location.hash !== '#planner') location.hash = '#planner';
    window.tcRouteRefresh?.('planner');
    window.plannerShowStep?.(1);
    window.scrollTo?.({ top: 0, behavior: 'auto' });
  }

  function startNewTrip() {
    editing = { id: '', source: '', original: null };
    activeDayIndex = -1;
    document.body.classList.remove('tc-v115-editing');
    window.TripCraftV108State?.resetState?.();
    try { window.TripCraftV102?.resetNewTrip?.(); }
    finally { showPlanner(); }
    window.setTimeout(() => $('plTripName')?.focus(), 120);
    return true;
  }

  function bindAccountActions(box) {
    box.querySelectorAll('[data-v115-action]').forEach(button => {
      button.onclick = event => { event.preventDefault(); activateAccountAction(button); };
    });
  }

  async function activateAccountAction(button) {
    if (!button || button.disabled) return false;
    const action = button.dataset.v115Action;
    if (action === 'new') return startNewTrip();
    if (action === 'copy') { copyText(actionUrl(button.dataset.tripId), button); return true; }
    if (action === 'delete') { deleteTrip(button.dataset.tripId); return true; }
    if (action !== 'open' || button.dataset.v115Busy === '1') return false;
    button.dataset.v115Busy = '1';
    button.disabled = true;
    const old = button.textContent;
    button.textContent = t('פותח...', 'Opening...');
    try { await openTrip(button.dataset.tripId); return true; }
    catch (error) { alert(t('לא ניתן לפתוח את הטיול: ', 'Could not open the trip: ') + (error?.message || error)); return false; }
    finally {
      if (button.isConnected !== false) {
        button.dataset.v115Busy = '0';
        button.disabled = false;
        button.textContent = old;
      }
    }
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
    const draft = deepCopy(record.draft);
    draft.tripId = id;
    window.planner = window.planner || {};
    window.planner.draft = draft;
    window.planner.currentTripId = id;
    editing = { id, source: record.source || '', original: deepCopy(draft) };
    document.body.classList.add('tc-v115-editing');
    if (typeof window.tcFillPlannerFromDraft === 'function') window.tcFillPlannerFromDraft(draft);
    if (typeof window.renderPlannerDraft === 'function') window.renderPlannerDraft();
    showPlanner();
    window.TripCraftV108State?.markOpened?.();
    syncActionLabels();
    window.setTimeout(() => {
      $('plannerResult')?.scrollIntoView({ block: 'start', behavior: 'auto' });
      enhancePlanner();
      syncActionLabels();
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
        } catch (error) { console.warn(`V115: delete from ${table} skipped`, error?.message || error); }
      }
    }
    const local = parseJson(LOCAL_TRIPS_KEY, []).filter(row => String(row.tripId || row.id) !== String(id));
    localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify(local));
    records = records.filter(row => row.id !== id);
    renderAccountBody(records);
  }

  function newTripId() {
    return `TC-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  }

  function localSave(row, email) {
    const list = parseJson(LOCAL_TRIPS_KEY, []);
    const user = customer() || { id: row.user_id, email };
    const record = {
      tripId: row.id,
      tripName: row.name,
      destination: row.destination,
      start: row.start_date || '',
      end: row.end_date || '',
      personalUrl: actionUrl(row.id),
      tripDraft: deepCopy(row.draft),
      date: row.updated_at,
      customer: { ...user, id: row.user_id, email: email || user.email || '' }
    };
    const index = list.findIndex(item => String(item.tripId || item.id) === String(row.id));
    if (index >= 0) list[index] = { ...list[index], ...record };
    else list.unshift(record);
    localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify(list));
  }

  async function persistDraft() {
    const api = window.TripCraftV102;
    const sb = api?.supabase?.();
    if (!sb) throw new Error(t('שירות השמירה אינו זמין.', 'The save service is unavailable.'));
    const session = (await sb.auth.getSession())?.data?.session;
    if (!session?.user) throw new Error(t('החיבור לחשבון פג. יש להיכנס שוב.', 'Your account session expired. Please sign in again.'));
    const draft = window.planner?.draft;
    if (!draft) throw new Error(t('לא נמצא טיול לשמירה.', 'There is no trip to save.'));
    const profile = draft.plannerProfile || {};
    const id = editing.id || window.planner.currentTripId || draft.tripId || newTripId();
    draft.tripId = id;
    window.planner.currentTripId = id;
    const row = {
      id,
      user_id: session.user.id,
      name: draft.name || profile.tripName || t('טיול', 'Trip'),
      destination: profile.destination || '',
      start_date: profile.start || null,
      end_date: profile.end || null,
      draft: deepCopy(draft),
      updated_at: new Date().toISOString()
    };
    const tables = [...new Set([editing.source, 'tripcraft_trips', 'trips'].filter(name => name && name !== 'local'))];
    const errors = [];
    let savedTable = '';
    for (const table of tables) {
      try {
        const { error } = await sb.from(table).upsert(row, { onConflict: 'id' });
        if (error) throw error;
        savedTable = table;
        break;
      } catch (error) {
        errors.push(`${table}: ${error?.message || error}`);
      }
    }
    if (!savedTable) throw new Error(errors.join(' | ') || t('לא התקבל אישור מהשרת.', 'The server did not confirm the save.'));
    localSave(row, session.user.email || '');
    editing.source = savedTable;
    return id;
  }

  function goToAccount() {
    activeDayIndex = -1;
    $('plannerDayModal')?.classList.remove('show');
    $('plannerResult')?.classList.remove('show');
    document.body.classList.remove('tc-v116-result-mode');
    const app = $('mainApp');
    if (app) { app.classList.add('page-focus'); app.dataset.page = 'account'; }
    if (location.hash !== '#account') location.hash = '#account';
    window.tcRouteRefresh?.('account');
    window.scrollTo?.({ top: 0, behavior: 'auto' });
  }

  async function saveCurrentTrip(button) {
    if (!window.planner?.draft || button?.dataset.v115Busy === '1') return false;
    const wasEditing = Boolean(editing.id);
    if (button) {
      button.dataset.v115Busy = '1';
      button.disabled = true;
      button.textContent = t('שומר...', 'Saving...');
    }
    try {
      const id = await persistDraft();
      if (!id) throw new Error(t('לא התקבל אישור שמירה.', 'The save was not confirmed.'));
      window.TripCraftV108State?.markSaved?.();
      sessionStorage.setItem('tc_v115_saved_notice', String(Date.now()));
      editing = { id: '', source: '', original: null };
      document.body.classList.remove('tc-v115-editing');
      goToAccount();
      await renderAccount();
      return true;
    } catch (error) {
      window.TripCraftV108State?.markDirty?.();
      alert((wasEditing ? t('עדכון הטיול נכשל: ', 'Could not update the trip: ') : t('שמירת הטיול נכשלה: ', 'Could not save the trip: ')) + (error?.message || t('שגיאה לא ידועה', 'Unknown error')));
      return false;
    } finally {
      if (button) {
        button.dataset.v115Busy = '0';
        button.disabled = false;
      }
      syncActionLabels();
    }
  }

  async function routeAfterPlannerExit() {
    const user = customer();
    if (!user) {
      location.hash = '#home';
      window.tcRouteRefresh?.('home');
      window.scrollTo?.({ top: 0, behavior: 'auto' });
      return 'home';
    }
    let hasTrips = localRecords().length > 0;
    if (!hasTrips) {
      try { hasTrips = (await cloudRecords()).length > 0; } catch (_) { }
    }
    if (hasTrips) {
      goToAccount();
      await renderAccount();
      return 'account';
    }
    location.hash = '#home';
    window.tcRouteRefresh?.('home');
    window.scrollTo?.({ top: 0, behavior: 'auto' });
    return 'home';
  }

  async function discardCurrentTrip() {
    if (!confirm(t('לצאת ללא שמירה? השינויים שלא נשמרו יימחקו.', 'Exit without saving? Unsaved changes will be discarded.'))) return false;
    if (editing.original && window.planner) window.planner.draft = deepCopy(editing.original);
    window.TripCraftV108State?.resetState?.();
    if (!editing.id) window.TripCraftV102?.resetNewTrip?.();
    editing = { id: '', source: '', original: null };
    document.body.classList.remove('tc-v115-editing');
    await routeAfterPlannerExit();
    return true;
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

  function ensureFloatingResultActions() {
    const bar = document.querySelector('.planner-actions');
    if (!bar) return;
    let saveProxy = $('tcV116SaveProxy');
    let discardProxy = $('tcV116DiscardProxy');
    if (!saveProxy) {
      saveProxy = document.createElement('button');
      saveProxy.type = 'button';
      saveProxy.id = 'tcV116SaveProxy';
      saveProxy.className = 'btn green tc-v116-result-proxy';
      bar.appendChild(saveProxy);
    }
    if (!discardProxy) {
      discardProxy = document.createElement('button');
      discardProxy.type = 'button';
      discardProxy.id = 'tcV116DiscardProxy';
      discardProxy.className = 'btn tc-v108-discard tc-v116-result-proxy';
      bar.appendChild(discardProxy);
    }
  }

  function syncFloatingActions() {
    ensureFloatingResultActions();
    const resultVisible = $('plannerResult')?.classList.contains('show');
    const bar = document.querySelector('.planner-actions');
    const prev = $('plannerPrev');
    const next = $('plannerNext');
    const build = $('plannerBuild');
    const saveProxy = $('tcV116SaveProxy');
    const discardProxy = $('tcV116DiscardProxy');
    document.body.classList.toggle('tc-v116-result-mode', Boolean(resultVisible));
    if (!bar || !saveProxy || !discardProxy) return;
    const floatingSaveLabel = editing.id ? t('שמור עדכון', 'Save Update') : t('שמור טיול', 'Save Trip');
    const floatingDiscardLabel = t('יציאה ללא שמירה', 'Exit Without Saving');
    if (saveProxy.textContent !== floatingSaveLabel) saveProxy.textContent = floatingSaveLabel;
    if (discardProxy.textContent !== floatingDiscardLabel) discardProxy.textContent = floatingDiscardLabel;
    saveProxy.style.display = resultVisible ? 'inline-flex' : 'none';
    discardProxy.style.display = resultVisible ? 'inline-flex' : 'none';
    if (prev) prev.style.display = resultVisible ? 'none' : '';
    if (next) next.style.display = resultVisible ? 'none' : '';
    if (build) {
      if (resultVisible) build.style.display = 'none';
      else if (window.planner?.step === 7) build.style.display = '';
    }
  }

  function enhancePlanner() {
    ensurePickerButtons();
    syncDateRules();
    [$('plannerCopyLink'), $('tcV102CopyTrip')].filter(Boolean).forEach(button => {
      button.classList.remove('soft', 'secondary');
      button.classList.add('green');
    });
    document.querySelectorAll('#plannerDraftDays > .day-row').forEach((row, index) => {
      row.dataset.v115Day = String(index);
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      const button = row.querySelector('.day-action button:first-child');
      if (button) { button.dataset.v115OpenDay = String(index); button.dataset.v116OpenDay = String(index); button.style.pointerEvents = 'auto'; button.style.touchAction = 'manipulation'; }
    });
    syncActionLabels();
    syncFloatingActions();
  }

  function syncActionLabels() {
    const save = $('plannerSaveTrip');
    const discard = $('plannerDiscardTrip');
    const resultVisible = $('plannerResult')?.classList.contains('show');
    document.body.classList.toggle('tc-v115-editing', Boolean(editing.id));
    if (save && save.dataset.v115Busy !== '1') {
      const saveLabel = editing.id ? t('שמור עדכון', 'Save Update') : t('שמור טיול וקבל קישור', 'Save Trip and Get Link');
      if (save.textContent !== saveLabel) save.textContent = saveLabel;
      save.disabled = false;
    }
    if (discard) {
      const discardLabel = t('יציאה ללא שמירה', 'Exit Without Saving');
      if (discard.textContent !== discardLabel) discard.textContent = discardLabel;
      discard.style.display = resultVisible ? 'inline-flex' : 'none';
    }
    syncFloatingActions();
  }

  function dayIndexFromElement(element) {
    const explicit = element?.dataset?.v115OpenDay ?? element?.dataset?.v115Day;
    if (explicit !== undefined && Number.isInteger(Number(explicit))) return Number(explicit);
    const row = element?.closest?.('#plannerDraftDays > .day-row');
    if (!row) return -1;
    return [...document.querySelectorAll('#plannerDraftDays > .day-row')].indexOf(row);
  }

  function openDayDetails(index) {
    const day = window.planner?.draft?.days?.[index];
    if (!day) {
      alert(t('לא נמצא פירוט היום שנבחר.', 'The selected day could not be found.'));
      return false;
    }
    activeDayIndex = index;
    const open = window.plannerEditDay || globalThis.plannerEditDay;
    if (typeof open !== 'function') {
      alert(t('פירוט היום אינו זמין. רעננו את הדף ונסו שוב.', 'Day details are unavailable. Refresh and try again.'));
      return false;
    }
    open(index);
    const modal = $('plannerDayModal');
    if (modal) {
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
    }
    return true;
  }

  function chatMessage(log, kind, message) {
    if (!log) return;
    log.insertAdjacentHTML('beforeend', `<div class="chatmsg ${kind}">${escapeHtml(message)}</div>`);
    log.scrollTop = log.scrollHeight;
  }

  function requestedDay(text, fallback = -1) {
    const match = String(text || '').match(/(?:יום|day)\s*(\d+)/i);
    const index = match ? Number(match[1]) - 1 : fallback;
    return Number.isInteger(index) && index >= 0 && index < (window.planner?.draft?.days?.length || 0) ? index : fallback;
  }

  function cleanInstructionValue(value) {
    return String(value || '').replace(/[.!?]+$/g, '').trim();
  }

  function applyLocalInstruction(baseDraft, instruction, scope, selectedDay) {
    const draft = deepCopy(baseDraft);
    const text = String(instruction || '').trim();
    const lower = text.toLowerCase();
    const fallback = scope === 'day' ? selectedDay : requestedDay(text, -1);
    const index = requestedDay(text, fallback);
    const day = index >= 0 ? draft.days[index] : null;
    let changed = false;
    let message = '';

    const move = text.match(/(?:העבר|תעביר|move)\s+(.+?)\s+(?:ליום|to day)\s*(\d+)/i);
    if (move) {
      const name = cleanInstructionValue(move[1]);
      const target = Number(move[2]) - 1;
      let found = null;
      for (const source of draft.days) {
        const stopIndex = (source.stops || []).findIndex(stop => String(stop.place || '').toLowerCase().includes(name.toLowerCase()));
        if (stopIndex >= 0) { found = source.stops.splice(stopIndex, 1)[0]; break; }
      }
      if (found && draft.days[target]) {
        draft.days[target].stops = draft.days[target].stops || [];
        draft.days[target].stops.push(found);
        changed = true;
        message = t(`העברתי את ${name} ליום ${target + 1}.`, `Moved ${name} to day ${target + 1}.`);
      }
    }

    const replace = !changed && text.match(/(?:החלף|תחליף|replace)\s+(.+?)\s+(?:ב-|ב |עם |with )(.+)/i);
    if (replace) {
      const from = cleanInstructionValue(replace[1]);
      const to = cleanInstructionValue(replace[2]);
      const days = day ? [day] : draft.days;
      for (const item of days) {
        const stop = (item.stops || []).find(candidate => String(candidate.place || '').toLowerCase().includes(from.toLowerCase()));
        if (stop) { stop.place = to; stop.what = t('עודכן לפי בקשת המשתמש.', 'Updated at the traveler’s request.'); changed = true; break; }
      }
      if (changed) message = t(`החלפתי את ${from} ב־${to}.`, `Replaced ${from} with ${to}.`);
    }

    const hotel = !changed && text.match(/(?:שנה|החלף|עדכן|change|replace|update).*?(?:מלון|לינה|hotel|lodging).*?(?:ל-|ל |ב-|ב |to )(.+)/i);
    if (hotel && day) {
      const value = cleanInstructionValue(hotel[1]);
      if (value) {
        day.lodging = value;
        day.lodgingArea = day.lodgingArea || value;
        changed = true;
        message = t(`עדכנתי את הלינה ביום ${index + 1} ל־${value}.`, `Updated day ${index + 1} lodging to ${value}.`);
      }
    }

    const add = !changed && text.match(/(?:תוסיף|הוסף|להוסיף|add)\s+(.+)/i);
    if (add && day) {
      const value = cleanInstructionValue(add[1].replace(/(?:ליום|ביום|to day)\s*\d+/i, ''));
      if (value) {
        day.stops = day.stops || [];
        day.stops.push({ time: '', place: value, what: t('נוסף לפי בקשת המשתמש. יש לאמת במפה וב־TripCheck.', 'Added at the traveler’s request. Verify in Maps and TripCheck.') });
        changed = true;
        message = t(`הוספתי את ${value} ליום ${index + 1}.`, `Added ${value} to day ${index + 1}.`);
      }
    }

    const remove = !changed && text.match(/(?:תוריד|הורד|הסר|למחוק|remove|delete)\s+(.+)/i);
    if (remove && day) {
      const value = cleanInstructionValue(remove[1].replace(/(?:מיום|ביום|from day|day)\s*\d+/i, ''));
      const stopIndex = (day.stops || []).findIndex(stop => String(stop.place || '').toLowerCase().includes(value.toLowerCase()));
      if (stopIndex >= 0) {
        day.stops.splice(stopIndex, 1);
        changed = true;
        message = t(`הסרתי את ${value} מיום ${index + 1}.`, `Removed ${value} from day ${index + 1}.`);
      } else if ((day.stops || []).length && /תחנה|אחרונ|last stop/i.test(value)) {
        day.stops.pop();
        changed = true;
        message = t(`הסרתי את התחנה האחרונה מיום ${index + 1}.`, `Removed the last stop from day ${index + 1}.`);
      }
    }

    const title = !changed && text.match(/(?:שנה|עדכן|change|update).*?(?:כותרת|שם היום|title).*?(?:ל-|ל |to )(.+)/i);
    if (title && day) {
      day.title = cleanInstructionValue(title[1]);
      changed = Boolean(day.title);
      message = t(`כותרת יום ${index + 1} עודכנה.`, `Day ${index + 1} title was updated.`);
    }

    if (!changed && /רגוע|פחות עמוס|דלל|relax|less busy/i.test(lower)) {
      const days = day ? [day] : draft.days;
      days.forEach(item => { if ((item.stops || []).length > 3) item.stops = item.stops.slice(0, 3); item.title = String(item.title || '').replace(/ · קצב רגוע$/, '') + t(' · קצב רגוע', ' · Relaxed pace'); });
      changed = true;
      message = day ? t(`ריווחתי את יום ${index + 1}.`, `Made day ${index + 1} more relaxed.`) : t('ריווחתי את כל ימי הטיול.', 'Made the full trip more relaxed.');
    }

    return { changed, draft, message: message || t('לא הצלחתי להבין שינוי מעשי. כתבו יום ומקום בצורה מפורשת.', 'I could not identify a concrete change. Please specify the day and place.') };
  }

  async function requestAiChange(instruction, scope, dayIndex) {
    const sb = window.TripCraftV102?.supabase?.();
    if (!sb?.functions?.invoke) throw new Error('AI endpoint unavailable');
    const functionName = window.TRIPCRAFT_CONFIG?.aiFunctionName || 'tripcraft-ai';
    const request = sb.functions.invoke(functionName, { body: { instruction, scope, dayIndex, draft: deepCopy(window.planner.draft) } });
    const result = await Promise.race([request, new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 15000))]);
    if (result?.error) throw result.error;
    const data = result?.data || {};
    if (!data.draft || !Array.isArray(data.draft.days)) throw new Error('Invalid AI response');
    return { changed: true, draft: data.draft, message: data.message || t('השינוי בוצע באמצעות AI.', 'The change was applied by AI.') };
  }

  function validAiDraft(candidate, original) {
    if (!candidate || !Array.isArray(candidate.days) || !candidate.plannerProfile) return false;
    if (!candidate.days.length || candidate.days.length > 60) return false;
    candidate.tripId = original.tripId;
    candidate.maxChanges = original.maxChanges || 10;
    return candidate.days.every(day => day && Array.isArray(day.stops));
  }

  async function applyAiChange(scope) {
    const dayScope = scope === 'day';
    const input = $(dayScope ? 'plannerDayChatInput' : 'plannerChatInput');
    const log = $(dayScope ? 'plannerDayChatLog' : 'plannerChatLog');
    const button = $(dayScope ? 'plannerDayChatSend' : 'plannerChatSend');
    const instruction = String(input?.value || '').trim();
    if (!instruction || !window.planner?.draft || button?.dataset.v115Busy === '1') return false;
    const dayIndex = dayScope ? activeDayIndex : requestedDay(instruction, -1);
    if (dayScope && !window.planner.draft.days?.[dayIndex]) {
      chatMessage(log, 'bot', t('לא נמצא היום שנבחר. סגרו את החלון ופתחו שוב את פירוט היום.', 'The selected day was not found. Close and reopen day details.'));
      return false;
    }
    const max = window.planner.draft.maxChanges || 10;
    const count = window.planner.draft.changeCount || 0;
    if (count >= max) { alert(t('בפיילוט ניתן לבצע עד 10 שינויים בטיול.', 'The pilot allows up to 10 trip changes.')); return false; }
    if (button) { button.dataset.v115Busy = '1'; button.disabled = true; button.textContent = t('מעדכן...', 'Updating...'); }
    chatMessage(log, 'user', instruction);
    const original = deepCopy(window.planner.draft);
    let result;
    try {
      try { result = await requestAiChange(instruction, scope, dayIndex); }
      catch (remoteError) {
        console.warn('V115 secure AI unavailable; applying local verified instruction', remoteError?.message || remoteError);
        result = applyLocalInstruction(original, instruction, scope, dayIndex);
      }
      if (!result.changed || !validAiDraft(result.draft, original)) {
        chatMessage(log, 'bot', result.message || t('לא בוצע שינוי.', 'No change was made.'));
        return false;
      }
      result.draft.changeCount = count + 1;
      window.planner.draft = result.draft;
      if (typeof window.renderPlannerDraft === 'function') window.renderPlannerDraft();
      window.TripCraftV108State?.markDirty?.();
      enhancePlanner();
      if (dayScope && typeof window.plannerRenderDayEditor === 'function') window.plannerRenderDayEditor();
      chatMessage(log, 'bot', result.message);
      if (input) input.value = '';
      return true;
    } catch (error) {
      window.planner.draft = original;
      chatMessage(log, 'bot', t('השינוי לא בוצע: ', 'The change was not applied: ') + (error?.message || error));
      return false;
    } finally {
      if (button) { button.dataset.v115Busy = '0'; button.disabled = false; button.textContent = t('שלח', 'Send'); }
      syncActionLabels();
    }
  }

  function actionUrl(id) {
    return window.TripCraftV102?.tripUrl?.(id) || `${location.origin}${location.pathname}#trip/${encodeURIComponent(id)}`;
  }

  function stop(event) {
    if (event.cancelable) event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function closeDayModal() {
    const modal = $('plannerDayModal');
    if (!modal) return false;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    activeDayIndex = -1;
    return true;
  }

  function saveDayTitle() {
    const input = $('plannerDayTitleInput');
    const index = activeDayIndex >= 0 ? activeDayIndex : Number(globalThis.plannerEditingDay);
    const day = window.planner?.draft?.days?.[index];
    if (!day || !input) return false;
    const value = input.value.trim();
    if (value) day.title = value;
    window.plannerRenderDayEditor?.();
    window.renderPlannerDraft?.();
    window.TripCraftV108State?.markDirty?.();
    return true;
  }

  function handleModalAction(target) {
    if (!target?.closest) return false;
    if (target.closest('#plannerDayModalClose')) return closeDayModal();
    if (target.closest('#plannerApplyDayTitle')) return saveDayTitle();
    if (target.closest('#plannerDayChatSend')) { applyAiChange('day'); return true; }
    const edit = target.closest('#plannerDayStopsEditor .stop-edit-row .edit');
    if (edit) {
      const match = String(edit.getAttribute('onclick') || '').match(/plannerEditStop\((\d+)\)/);
      if (match && typeof window.plannerEditStop === 'function') window.plannerEditStop(Number(match[1]));
      return true;
    }
    const remove = target.closest('#plannerDayStopsEditor .stop-edit-row .remove');
    if (remove) {
      const match = String(remove.getAttribute('onclick') || '').match(/plannerRemoveStop\((\d+)\)/);
      if (match && typeof window.plannerRemoveStop === 'function') window.plannerRemoveStop(Number(match[1]));
      return true;
    }
    const hotels = target.closest('#plannerDayModal button[onclick*="openHotelsForDay"]');
    if (hotels) {
      const match = String(hotels.getAttribute('onclick') || '').match(/openHotelsForDay\((\d+)\)/);
      if (match && typeof window.openHotelsForDay === 'function') window.openHotelsForDay(Number(match[1]));
      return true;
    }
    return false;
  }

  function handleClick(event) {
    const modalTap = event.target.closest?.('#plannerDayModalClose,#plannerApplyDayTitle,#plannerDayChatSend,#plannerDayStopsEditor .stop-edit-row button,#plannerDayModal button[onclick*="openHotelsForDay"]');
    if (modalTap && Number(modalTap.dataset.v116LastTap || 0) + 650 > Date.now()) { stop(event); return; }
    if (handleModalAction(event.target)) { stop(event); return; }
    const accountAction = event.target.closest?.('[data-v115-action]');
    if (accountAction) {
      stop(event);
      activateAccountAction(accountAction);
      return;
    }
    const language = event.target.closest?.('[data-lang]');
    if (language) { stop(event); switchLanguage(language.dataset.lang); return; }
    const saveProxy = event.target.closest?.('#tcV116SaveProxy');
    if (saveProxy) { stop(event); saveCurrentTrip(saveProxy); return; }
    const discardProxy = event.target.closest?.('#tcV116DiscardProxy');
    if (discardProxy) { stop(event); discardCurrentTrip(); return; }
    const save = event.target.closest?.('#plannerSaveTrip');
    if (save) { stop(event); saveCurrentTrip(save); return; }
    const discard = event.target.closest?.('#plannerDiscardTrip');
    if (discard) { stop(event); discardCurrentTrip(); return; }
    const aiTrip = event.target.closest?.('#plannerChatSend');
    if (aiTrip) { stop(event); applyAiChange('trip'); return; }
    const aiDay = event.target.closest?.('#plannerDayChatSend');
    if (aiDay) { stop(event); applyAiChange('day'); return; }
    const editCopy = event.target.closest?.('#plannerCopyLink,#tcV102CopyTrip');
    if (editCopy) {
      stop(event);
      const input = editCopy.id === 'plannerCopyLink' ? $('plannerShareLink') : $('tcV102TripLink');
      copyText(input?.value || '', editCopy); return;
    }
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
    const dayButton = event.target.closest?.('[data-v115-open-day],[data-v116-open-day],#plannerDraftDays>.day-row .day-action>button:first-child');
    if (dayButton) { stop(event); openDayDetails(dayIndexFromElement(dayButton)); return; }
    const day = event.target.closest?.('#plannerDraftDays > .day-row');
    if (day && !event.target.closest('a,button,input,textarea,select,label')) { stop(event); openDayDetails(dayIndexFromElement(day)); }
  }

  function handleKey(event) {
    const day = event.target.closest?.('#plannerDraftDays > .day-row');
    if (day && ['Enter', ' '].includes(event.key)) { stop(event); openDayDetails(dayIndexFromElement(day)); }
    if (event.key === 'Escape' && calendarState) closeCalendar();
  }

  function installStyles() {
    const style = document.createElement('style');
    style.id = 'tc-v116-styles';
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
      #plannerDraftDays>.day-row .day-action,#plannerDraftDays>.day-row .day-action button{pointer-events:auto!important;position:relative!important;z-index:3!important}
      #plannerResult .tc-v108-result-actions{z-index:1200!important}
      body.tc-v115-editing #plannerDiscardTrip{display:inline-flex!important}
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

      .tc-v116-result-proxy{display:none!important}
      body.tc-v116-result-mode .planner-actions{pointer-events:auto!important}
      body.tc-v108-built.tc-v116-result-mode #planner>.planner-actions{display:flex!important;pointer-events:auto!important;visibility:visible!important;opacity:1!important}
      #plannerDayModal.show,#plannerDayModal.show .planner-modal-card,#plannerDayModal.show button,#plannerDayModal.show input,#plannerDayModal.show a{pointer-events:auto!important}
      #plannerDayModal.show{z-index:40000!important}
      #plannerDayModal.show .planner-modal-card{position:relative!important;z-index:40001!important}
      body.tc-v116-result-mode .planner-actions .tc-v116-result-proxy{display:inline-flex!important;align-items:center!important;justify-content:center!important}
      body.tc-v116-result-mode .planner-actions #tcV116SaveProxy{background:#16875d!important;color:#fff!important}
      body.tc-v116-result-mode .planner-actions #tcV116DiscardProxy{background:#d1262b!important;color:#fff!important}
      #plannerDraftDays,#plannerDraftDays>.day-row,#plannerDraftDays>.day-row .day-action,#plannerDraftDays>.day-row .day-action button{pointer-events:auto!important}
      #plannerDraftDays>.day-row .day-action button{touch-action:manipulation!important;cursor:pointer!important}
      @media(max-width:620px){
        body.tc-v116-result-mode .planner-actions,body.tc-v108-built.tc-v116-result-mode #planner>.planner-actions{position:fixed!important;left:12px!important;right:12px!important;bottom:calc(env(safe-area-inset-bottom,0px) + 8px)!important;z-index:30000!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;margin:0!important;padding:8px!important;border-radius:18px!important;background:rgba(255,255,255,.98)!important;box-shadow:0 8px 28px rgba(13,53,87,.22)!important}
        body.tc-v116-result-mode .planner-actions .tc-v116-result-proxy{width:100%!important;min-height:54px!important;font-size:17px!important;font-weight:900!important}
        body.tc-v116-result-mode #plannerResult .tc-v108-result-actions{display:none!important}
        body.tc-v116-result-mode #plannerResult{padding-bottom:92px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyles();
    ensureLogoutMenu();
    ensureCalendar();
    enhancePlanner();
    window.TripCraftV115 = { VERSION, renderAccount, openTrip, startNewTrip, saveCurrentTrip, discardCurrentTrip, deleteTrip, activateAccountAction, openDayDetails, applyAiChange, persistDraft, routeAfterPlannerExit, closeDayModal };
    window.tcRenderAccount = renderAccount;
    if (window.TripCraftV102) {
      window.TripCraftV102.renderAccount = renderAccount;
      window.TripCraftV102.openTrip = openTrip;
    }
    window.addEventListener('click', handleClick, true);
    window.addEventListener('pointerup', event => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      const modalAction = event.target.closest?.('#plannerDayModalClose,#plannerApplyDayTitle,#plannerDayChatSend,#plannerDayStopsEditor .stop-edit-row button,#plannerDayModal button[onclick*="openHotelsForDay"]');
      if (modalAction) {
        const now = Date.now();
        if (Number(modalAction.dataset.v116LastTap || 0) + 450 > now) return;
        modalAction.dataset.v116LastTap = String(now);
        stop(event);
        handleModalAction(modalAction);
        return;
      }
      const actionable = event.target.closest?.('#tcV116SaveProxy,#tcV116DiscardProxy,[data-v116-open-day]');
      if (!actionable) return;
      const now = Date.now();
      if (Number(actionable.dataset.v116LastTap || 0) + 450 > now) return;
      actionable.dataset.v116LastTap = String(now);
      if (actionable.id === 'tcV116SaveProxy') { stop(event); saveCurrentTrip(actionable); return; }
      if (actionable.id === 'tcV116DiscardProxy') { stop(event); discardCurrentTrip(); return; }
      stop(event); openDayDetails(dayIndexFromElement(actionable));
    }, true);
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
        if (location.hash === '#account' && account && !account.querySelector('.tc-v115-account-view') && !accountRepairQueued) {
          accountRepairQueued = true;
          setTimeout(() => {
            accountRepairQueued = false;
            renderAccount();
          }, 0);
        }
      });
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('hashchange', () => {
      if (location.hash === '#account') renderAccount();
      setTimeout(enhancePlanner, 30);
    });
    if (location.hash === '#account') renderAccount();
    document.documentElement.dataset.tripcraftVersion = VERSION;
    document.documentElement.dataset.tripcraftBuild = 'V116-FIXED-MOBILE';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
