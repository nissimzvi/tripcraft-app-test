/* TripCraft Mobile V109 - final iPhone interaction fixes. */
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
      @media(max-width:620px){
        html,body{max-width:100%!important;overflow-x:hidden!important}
        #mainApp,.page,.wrap,#planner{max-width:100%!important;overflow-x:clip!important}
        .day-row .day-action{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;padding:0 12px 14px!important}
        .day-row .day-action .btn{min-width:0!important;width:100%!important;min-height:44px!important;
          padding:9px 7px!important;border-radius:10px!important;font-size:14px!important;line-height:1.15!important}
        .day-row .day-action .btn:only-child{grid-column:1/-1!important;justify-self:center!important;width:min(220px,100%)!important}
        body.tc-v108-built #plannerResult{padding-bottom:calc(96px + env(safe-area-inset-bottom,0px))!important}
        body.tc-v108-built .tc-v108-result-actions{
          position:fixed!important;left:10px!important;right:10px!important;bottom:calc(8px + env(safe-area-inset-bottom,0px))!important;
          z-index:1000!important;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
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

  function openPlannerDay(button) {
    const row = button.closest('.day-row');
    const list = row?.parentElement;
    if (!row || !list || list.id !== 'plannerDraftDays') return false;
    const index = [...list.children].indexOf(row);
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
      await window.TripCraftV102?.renderAccount?.();
      saveStatus(text('הטיול נשמר בהצלחה והקישור הקבוע מוכן ✓', 'Trip saved successfully. Your permanent link is ready ✓'), true);
      $('tcV102TripLink')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
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

  function onClick(event) {
    const dayButton = event.target.closest?.('#plannerDraftDays .day-action button:first-child');
    if (dayButton && openPlannerDay(dayButton)) {
      event.preventDefault(); event.stopImmediatePropagation(); return;
    }
    const save = event.target.closest?.('#plannerSaveTrip');
    if (save) {
      event.preventDefault(); event.stopImmediatePropagation(); saveTrip(save); return;
    }
    const discard = event.target.closest?.('#plannerDiscardTrip');
    if (discard) {
      event.preventDefault(); event.stopImmediatePropagation(); discardTrip();
    }
  }

  function onPointer(event) {
    const input = event.target.closest?.('textarea,input');
    if (input && editableIds.has(input.id)) focusEditor(input);
  }

  function install() {
    installStyles();
    prepareEditors();
    document.addEventListener('click', onClick, true);
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
    new MutationObserver(prepareEditors).observe(document.body, { childList: true, subtree: true });
    document.documentElement.dataset.tripcraftMobileFix = 'V109-final';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
