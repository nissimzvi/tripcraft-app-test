/* TripCraft Mobile V110 controls, retained and hardened for V111. */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const isEnglish = () => (document.documentElement.lang || 'he').toLowerCase().startsWith('en');
  const text = (he, en) => isEnglish() ? en : he;
  const editableIds = new Set([
    'plannerGlobalPostInput',
    'plannerChatInput',
    'plannerDayChatInput',
    'plannerDayTitleInput'
  ]);
  let activePress = null;
  let lastActivatedButton = null;
  let lastActivatedAt = 0;

  function installStyles() {
    if ($('tc-v109-mobile-fix-styles')) return;
    const style = document.createElement('style');
    style.id = 'tc-v109-mobile-fix-styles';
    style.textContent = `
      #plannerGlobalPostInput,#plannerChatInput,#plannerDayChatInput,#plannerDayTitleInput{
        position:relative!important;z-index:3!important;pointer-events:auto!important;
        touch-action:manipulation!important;-webkit-user-select:text!important;user-select:text!important;
        font-size:16px!important;caret-color:#0d3557!important
      }
      #plannerGlobalPostInput:focus,#plannerChatInput:focus,#plannerDayChatInput:focus,#plannerDayTitleInput:focus{
        outline:3px solid rgba(47,128,237,.24)!important;border-color:#2f80ed!important
      }
      .day-row .day-action{gap:8px!important}
      .day-row .day-action .btn{white-space:normal!important;word-break:normal!important;overflow-wrap:normal!important}
      #plannerDraftDays .day-action .btn,.tc-v108-result-actions .btn{
        position:relative!important;z-index:4!important;pointer-events:auto!important;touch-action:manipulation!important;
        -webkit-tap-highlight-color:rgba(13,53,87,.12)!important
      }
      @media(max-width:620px){
        html,body{width:100%!important;min-width:0!important;max-width:100vw!important;overflow-x:clip!important;overscroll-behavior-x:none!important}
        body{position:relative!important;margin:0!important;touch-action:pan-y pinch-zoom!important}
        #mainApp,.page,main.wrap,.wrap,#planner,.planner-panel,.planner-step,.planner-result,#plannerResult,
        .planner-result-head,#plannerDraftDays,.day-list,.day-row,.day-main,.budget-summary,.chatbox,
        .planner-global-post,.planner-grid,.v59-plan-groups,.v59-topic,.v59-topic-body,.journey-row,.field{
          box-sizing:border-box!important;min-width:0!important;max-width:100%!important;width:100%!important;
          margin-left:0!important;margin-right:0!important;transform:none!important
        }
        main.wrap{padding-left:10px!important;padding-right:10px!important}
        #planner{padding-left:12px!important;padding-right:12px!important;overflow:visible!important}
        #plannerResult,#plannerResult>*{min-width:0!important;max-width:100%!important}
        #plannerShareBox>div{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important}
        #plannerShareLink{min-width:0!important;width:100%!important}
        .tc-header{left:0!important;right:0!important;width:100%!important;max-width:100vw!important;transform:none!important}
        #plannerDraftDays{gap:10px!important;margin-top:12px!important}
        #plannerDraftDays>.day-row{
          display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:auto auto auto!important;
          min-height:0!important;border-radius:16px!important;overflow:hidden!important
        }
        #plannerDraftDays>.day-row>.day-no{
          grid-column:1!important;grid-row:1!important;min-width:0!important;width:100%!important;min-height:38px!important;
          display:flex!important;flex-direction:row!important;justify-content:center!important;align-items:center!important;
          gap:6px!important;padding:6px 10px!important;font-size:12px!important;line-height:1!important
        }
        #plannerDraftDays>.day-row>.day-no b{font-size:21px!important;line-height:1!important;margin:0!important}
        #plannerDraftDays>.day-row>.day-no .day-weekday,
        #plannerDraftDays>.day-row>.day-no .day-date{font-size:11px!important;line-height:1!important;margin:0!important;white-space:nowrap!important}
        #plannerDraftDays>.day-row>.day-main{
          grid-column:1!important;grid-row:2!important;padding:10px 11px 8px!important;min-height:0!important
        }
        #plannerDraftDays>.day-row>.day-main h3{font-size:19px!important;line-height:1.2!important;margin:0 0 6px!important}
        #plannerDraftDays .day-route-line{
          display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;
          overflow:hidden!important;font-size:13px!important;line-height:1.35!important;margin:0 0 7px!important
        }
        #plannerDraftDays .day-mini-meta{
          display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:5px!important;margin-top:5px!important
        }
        #plannerDraftDays .day-mini-meta>*{
          width:100%!important;min-width:0!important;padding:5px 6px!important;border-radius:9px!important;
          font-size:11px!important;line-height:1.25!important;white-space:normal!important
        }
        #plannerDraftDays .lodging-chip,#plannerDraftDays .cost-chip{
          display:block!important;margin-top:5px!important;padding:5px 7px!important;border-radius:9px!important;
          font-size:11px!important;line-height:1.3!important
        }
        #plannerDraftDays>.day-row>.day-action{
          grid-column:1!important;grid-row:3!important;display:grid!important;
          grid-template-columns:repeat(2,minmax(0,1fr))!important;padding:7px 10px 10px!important
        }
        .day-row .day-action .btn{min-width:0!important;width:100%!important;min-height:44px!important;
          padding:9px 7px!important;border-radius:10px!important;font-size:14px!important;line-height:1.15!important}
        #plannerDraftDays .day-action .btn:only-child{grid-column:1/-1!important;justify-self:center!important;width:min(190px,100%)!important}
        body.tc-v108-built #plannerResult{padding-bottom:calc(96px + env(safe-area-inset-bottom,0px))!important}
        body.tc-v108-built .tc-v108-result-actions{
          position:fixed!important;left:10px!important;right:10px!important;bottom:calc(8px + env(safe-area-inset-bottom,0px))!important;
          z-index:1000!important;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;max-width:calc(100vw - 20px)!important;
          gap:8px!important;width:auto!important;padding:9px!important;background:rgba(255,255,255,.97)!important;
          border:1px solid #d6e2ea!important;border-radius:16px!important;box-shadow:0 10px 30px rgba(13,53,87,.23)!important;
          -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)
        }
        body.tc-v108-built .tc-v108-result-actions .btn{
          width:100%!important;min-width:0!important;min-height:46px!important;padding:9px 6px!important;
          border-radius:10px!important;font-size:14px!important;line-height:1.15!important;white-space:normal!important
        }
        body.tc-v109-input-active .tc-v108-result-actions{display:none!important}
        #plannerDayModal .modal-card{max-height:calc(100dvh - 18px)!important;overflow:auto!important;-webkit-overflow-scrolling:touch!important}
        #plannerGlobalPostInput,#plannerChatInput,#plannerDayChatInput,#plannerDayTitleInput{scroll-margin-block:120px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function focusEditor(input) {
    if (!input || input.disabled || input.readOnly) return;
    try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); }
    setTimeout(() => {
      if (document.activeElement === input) input.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 260);
  }

  function prepareEditors() {
    editableIds.forEach(id => {
      const input = $(id);
      if (!input) return;
      input.disabled = false;
      input.readOnly = false;
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('enterkeyhint', input.tagName === 'TEXTAREA' ? 'done' : 'send');
    });
  }

  function prepareActionButtons() {
    const save = $('plannerSaveTrip');
    const discard = $('plannerDiscardTrip');
    if (save) save.dataset.v110Action = 'save';
    if (discard) discard.dataset.v110Action = 'discard';
    document.querySelectorAll('#plannerDraftDays > .day-row').forEach((row, index) => {
      const button = row.querySelector('.day-action button:first-child');
      if (!button) return;
      button.dataset.v110Action = 'open-day';
      button.dataset.v110Day = String(index);
    });
  }

  function openPlannerDay(button) {
    const row = button.closest('.day-row');
    if (!row) return false;
    const rows = [...document.querySelectorAll('#plannerDraftDays > .day-row')];
    const storedIndex = Number(button.dataset.v110Day);
    const index = Number.isInteger(storedIndex) && storedIndex >= 0 ? storedIndex : rows.indexOf(row);
    if (index < 0 || typeof window.plannerEditDay !== 'function') return false;
    window.plannerEditDay(index);
    return true;
  }

  function saveStatus(message, ok) {
    const notice = $('tcV108SaveNotice');
    if (!notice) return;
    notice.className = `${ok ? 'safe' : 'warn'} tc-v108-save-notice`;
    notice.style.display = 'block';
    notice.innerHTML = `<strong>${message}</strong>`;
  }

  async function saveTrip(button) {
    if (!window.planner?.draft || button.dataset.v109Busy === '1') return;
    button.dataset.v109Busy = '1';
    button.disabled = true;
    button.textContent = text('שומר...', 'Saving...');
    try {
      const id = await window.TripCraftV102?.saveDraft?.();
      if (!id) throw new Error(text('לא התקבל אישור שמירה מהשרת.', 'The server did not confirm the save.'));
      window.TripCraftV108State?.markSaved?.();
      sessionStorage.setItem('tc_v111_saved_notice', String(Date.now()));
      location.hash = '#account';
      window.tcRouteRefresh?.('account');
      try { await window.TripCraftV102?.renderAccount?.(); }
      catch (accountError) { console.warn('Trip saved; account refresh will retry on route change.', accountError); }
      window.scrollTo?.({ top: 0, behavior: 'auto' });
    } catch (error) {
      window.TripCraftV108State?.markDirty?.();
      saveStatus(text('השמירה לא הושלמה. הטיול נשאר פתוח ולא נמחק.', 'Save was not completed. Your trip remains open and was not deleted.'), false);
      alert(text('שמירת הטיול נכשלה: ', 'Could not save the trip: ') + (error?.message || text('שגיאה לא ידועה', 'Unknown error')));
    } finally {
      button.dataset.v109Busy = '0';
      button.disabled = false;
      if (button.textContent === text('שומר...', 'Saving...')) button.textContent = text('שמור טיול וקבל קישור', 'Save Trip & Get Link');
    }
  }

  function discardTrip() {
    const approved = confirm(text(
      'לצאת ללא שמירה? השינויים שלא נשמרו יימחקו, אך טיול שנשמר בעבר בחשבון לא יימחק.',
      'Exit without saving? Unsaved changes will be discarded, but a previously saved trip in your account will not be deleted.'
    ));
    if (!approved) return;
    window.TripCraftV108State?.resetState?.();
    window.TripCraftV102?.resetNewTrip?.();
    location.hash = '#account';
    window.tcRouteRefresh?.('account');
    setTimeout(() => window.TripCraftV102?.renderAccount?.(), 0);
  }

  function storedCustomer() {
    for (const key of ['tc_v433_customer', 'tripcraft_customer']) {
      try {
        const value = JSON.parse(localStorage.getItem(key) || 'null');
        if (value?.id || value?.email) return value;
      } catch (_) { }
    }
    return null;
  }

  function isLoggedIn() {
    try {
      if (typeof window.tcCustomer === 'function' && window.tcCustomer()) return true;
    } catch (_) { }
    return document.body.classList.contains('tc-logged-in') || Boolean(storedCustomer());
  }

  function routeToAccount() {
    location.hash = isLoggedIn() ? '#account' : '#home';
    window.tcRouteRefresh?.(isLoggedIn() ? 'account' : 'home');
    if (isLoggedIn()) setTimeout(() => window.TripCraftV102?.renderAccount?.(), 0);
  }

  function protectDirtyExit() {
    if (!document.body.classList.contains('tc-v108-unsaved')) return false;
    alert(text(
      'לפני היציאה יש לבחור: „שמור טיול וקבל קישור” או „יציאה ללא שמירה”.',
      'Before leaving, choose “Save Trip & Get Link” or “Exit Without Saving”.'
    ));
    $('plannerSaveTrip')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return true;
  }

  function handleLogo(event) {
    const logo = event.target.closest?.('.tc-header .brand,[data-tc-home-logo="1"]');
    if (!logo) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!protectDirtyExit()) routeToAccount();
    return true;
  }

  function handlePrevious(event) {
    const button = event.target.closest?.('#plannerPrev');
    if (!button) return false;
    button.disabled = false;
    const activeStep = Number(document.querySelector('.planner-step.active')?.dataset.step || window.planner?.step || 1);
    const stepOnePart = Number(document.body.dataset.tcStep1Part || 1);
    if (activeStep !== 1 || stepOnePart !== 1) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!protectDirtyExit()) routeToAccount();
    return true;
  }

  function addIsoDays(value, days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '';
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function syncDateLimits() {
    const start = $('plStart');
    const end = $('plEnd');
    if (!start || !end) return;
    const now = new Date();
    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    start.min = today;
    end.min = start.value ? addIsoDays(start.value, 1) : today;
    if (start.value && end.value && end.value <= start.value) {
      end.value = '';
      end.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function actionButton(target) {
    return target?.closest?.('[data-v110-action],#plannerSaveTrip,#plannerDiscardTrip,#plannerDraftDays .day-action button:first-child') || null;
  }

  function activateAction(button) {
    if (!button || button.disabled) return false;
    const action = button.dataset.v110Action ||
      (button.id === 'plannerSaveTrip' ? 'save' : button.id === 'plannerDiscardTrip' ? 'discard' : 'open-day');
    if (action === 'open-day') return openPlannerDay(button);
    if (action === 'save') { saveTrip(button); return true; }
    if (action === 'discard') { discardTrip(); return true; }
    return false;
  }

  function rememberActivation(button) {
    lastActivatedButton = button;
    lastActivatedAt = Date.now();
  }

  function stopEvent(event) {
    if (event.cancelable) event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function onPressStart(event) {
    const button = actionButton(event.target);
    if (!button) return;
    activePress = { button, x: event.clientX, y: event.clientY, pointerId: event.pointerId, started: Date.now() };
  }

  function onPressEnd(event) {
    const press = activePress;
    activePress = null;
    if (!press || (press.pointerId !== undefined && event.pointerId !== press.pointerId)) return;
    const button = actionButton(event.target);
    if (!button || button !== press.button) return;
    const moved = Math.hypot((event.clientX || 0) - (press.x || 0), (event.clientY || 0) - (press.y || 0));
    if (moved > 18 || Date.now() - press.started > 1400) return;
    stopEvent(event);
    if (activateAction(button)) rememberActivation(button);
  }

  function onClick(event) {
    if (handleLogo(event) || handlePrevious(event)) return;
    const button = actionButton(event.target);
    if (!button) return;
    stopEvent(event);
    if (button === lastActivatedButton && Date.now() - lastActivatedAt < 900) return;
    if (activateAction(button)) rememberActivation(button);
  }

  function onPointer(event) {
    const input = event.target.closest?.('textarea,input');
    if (input && editableIds.has(input.id)) focusEditor(input);
  }

  function install() {
    installStyles();
    prepareEditors();
    prepareActionButtons();
    syncDateLimits();
    if ($('plannerPrev')) $('plannerPrev').disabled = false;
    document.addEventListener('click', onClick, true);
    /* A single capture-phase click path is more reliable on iOS than
       synthesizing an action from pointerup and then suppressing click. */
    document.addEventListener('pointerup', onPointer, true);
    document.addEventListener('touchend', onPointer, { capture: true, passive: true });
    document.addEventListener('focusin', event => {
      if (!editableIds.has(event.target.id)) return;
      document.body.classList.add('tc-v109-input-active');
      setTimeout(() => event.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 280);
    });
    document.addEventListener('focusout', event => {
      if (!editableIds.has(event.target.id)) return;
      setTimeout(() => {
        if (!editableIds.has(document.activeElement?.id)) document.body.classList.remove('tc-v109-input-active');
      }, 180);
    });
    $('plStart')?.addEventListener('input', syncDateLimits);
    $('plStart')?.addEventListener('change', syncDateLimits);
    $('plEnd')?.addEventListener('focus', syncDateLimits);
    new MutationObserver(() => {
      prepareEditors();
      prepareActionButtons();
      syncDateLimits();
      if ($('plannerPrev')) $('plannerPrev').disabled = false;
    }).observe(document.body, { childList: true, subtree: true });
    document.documentElement.dataset.tripcraftMobileFix = 'V110-mobile';
    document.documentElement.dataset.tripcraftVersion = 'V110';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
