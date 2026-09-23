/* TripCraft Mobile V109 Final - approved mobile shell, resilient logo and complete locale guard. */
(() => {
  'use strict';

  const LANG_KEY='tc_v433_lang';
  const LOGO='tripcraft-logo-v109.png?v=109-final';
  const HEBREW=/[\u0590-\u05ff]/;
  const originalText=new WeakMap();
  const originalAttrs=new WeakMap();
  const $=id=>document.getElementById(id);
  const language=()=>localStorage.getItem(LANG_KEY)==='en'?'en':'he';

  const EN=new Map(Object.entries({
    'V110 · נץ מערכות מידע':'V110 · Netz Information Systems','V109 · נץ מערכות מידע':'V109 · Netz Information Systems',
    'דף הבית':'Home','איך זה עובד':'How It Works','מחירים':'Pricing','הצעות לטיולים':'Trip Ideas','בתי מלון':'Hotels','תכנון טיול':'Plan a Trip','סל':'Cart','החשבון שלי':'My Account','כניסה':'Sign In','כניסה / הרשמה':'Sign In / Register','התקן אפליקציה':'Install App','פרטיות, תקנון ונגישות':'Privacy, Terms & Accessibility',
    'איך TripCraft עובד?':'How does TripCraft work?','לא עוד מסמך טיול — פלטפורמה חכמה שמלווה את הטיול שלכם מהרעיון ועד החזרה הביתה.':'More than an itinerary document — a smart platform that stays with you from the first idea until you return home.',
    '1. מספרים לנו על הטיול':'1. Tell us about your trip','יעד, תאריכים, שדות תעופה, מי נוסע, גילאים, קצב, תחומי עניין והעדפות.':'Destination, dates, airports, travelers, ages, pace, interests and preferences.',
    '2. המנוע בונה חכם':'2. The engine plans intelligently','חלוקת ימים, סדר גאוגרפי, נסיעות, נקודות עניין והתאמה להרכב הנוסעים.':'Daily structure, geographic order, travel times, points of interest and traveler matching.',
    '3. הכול הופך למסלול חי':'3. Everything becomes a live itinerary','ימים, Google Maps, Waze, נקודות עצירה, זמני נסיעה ועלויות אטרקציות משוערות.':'Days, Google Maps, Waze, stops, travel times and estimated attraction costs.',
    '4. גם לינה — לבחירתכם':'4. Lodging is your choice','ניתן להחליט על אזורי לינה ומלונות בהתאם למסלול. יכולות המלונות המלאות יתווספו בהמשך.':'Choose lodging areas and hotels that fit the itinerary.',
    '5. מקבלים מסלול מלא':'5. Receive a complete itinerary','הטיול המלא נשמר בחשבון וניתן לפתוח, לערוך ולשתף באמצעות קישור אישי.':'The complete trip is saved to your account and can be opened, edited and shared with a personal link.',
    'המערכת מיועדת לבדוק את היגיון המסלול, מרחקים, לינות ושינויים חשובים לקראת הנסיעה.':'TripCheck reviews route logic, distances, lodging and important changes before departure.',
    'הטיול נשאר שלכם — גם אחרי התכנון':'Your trip stays yours after planning','מתכננים פעם אחת. ממשיכים לשפר עד שחוזרים הביתה.':'Plan once. Keep improving until you return home.',
    '🔐 פרטיות ואבטחה בתכנון':'🔐 Planning privacy and security','♿ ממשק נגיש ורספונסיבי':'♿ Accessible responsive interface','💳 תשלום דרך ספק סליקה':'💳 Payment through a payment provider','🧠 AI כחלק מהטיול':'🧠 AI built into the trip','📚 היסטוריית טיולים אישית':'📚 Personal trip history','📱 הטיול זמין גם מהנייד':'📱 Your trip is available on mobile',
    'בנו טיול חדש':'Build a New Trip','ראו הצעות לטיולים':'Browse Trip Ideas','6 טיולים מוכנים שניתן לפתוח, להתרשם ולהוסיף לסל.':'Six ready-made trips to open, preview and add to your cart.','HTML מלא':'Complete HTML','8 ימים':'8 days','25 ימים':'25 days','10 ימים':'10 days','7 ימים':'7 days','12 ימים':'12 days',
    'סלובקיה + בודפשט':'Slovakia + Budapest','ויאטנם + תאילנד':'Vietnam + Thailand','יוון':'Greece','איטליה':'Italy','דולומיטים':'Dolomites','אוסטריה':'Austria','חבל טירול + מינכן':'Tyrol + Munich','ארה״ב':'USA','מפלי ניאגרה – וושינגטון – ניו יורק':'Niagara Falls – Washington – New York',
    'מסלול מוכן ·':'Ready itinerary ·','מסלול קיים עם הימים, המפות והניווט.':'An existing itinerary with daily plans, maps and navigation.','מסלול קיים עם כל דפי הימים.':'An existing itinerary with all daily pages.','מסלול קיים עם המפה והניווט.':'An existing itinerary with maps and navigation.','מסלול אגמים, מעברי הרים, רכבלים ועיירות.':'A route of lakes, mountain passes, cable cars and towns.','מסלול אלפיני עם אגמים, רכבלים, מפלים ועיירות.':'An Alpine route with lakes, cable cars, waterfalls and towns.','מסלול קלאסי בין טבע, ערים ואטרקציות.':'A classic route combining nature, cities and attractions.','פתח טיול':'Open Trip','הוסף לסל':'Add to Cart',
    '🏨 לינה חכמה':'🏨 Smart Lodging','בנו טיול כדי לראות את אזורי הלינה המומלצים.':'Build a trip to see recommended lodging areas.',
    'בנה טיול חדש':'Build a New Trip','אשף חכם שמתחיל בכמה שאלות קצרות, ואז ממשיך לשיחה פתוחה בלי להגביל אותך.':'A smart wizard that starts with a few short questions and continues as an open planning conversation.','AI Planner · שלב ראשון':'AI Planner · First Step',
    '1. לאן ומתי נוסעים?':'1. Where and when are you traveling?','1 · יעד':'1 · Destination','2 · טיסות':'2 · Flights','3 · תאריכים':'3 · Dates','יעד הטיול':'Trip Destination','בחרו מדינות ואזור מרכזי':'Choose countries and a main region','שם הטיול שלכם':'Your Trip Name','מדינות':'Countries','אפשר לבחור כמה':'Multiple selections allowed','+ הוסף':'+ Add','איפה מטיילים?':'Where are you traveling?','טיסות (אופציונלי)':'Flights (optional)','אם אין טיסות, משאירים את שני השדות ריקים':'If you have no flight details, leave both fields blank','נוחתים ב־ (אופציונלי)':'Arrival airport (optional)','חוזרים מ־ (אופציונלי)':'Departure airport (optional)','אותו שדה בחזרה — סמנו ✓ למילוי אוטומטי':'Same airport for departure — check ✓ to fill automatically','תאריכים':'Dates','מתי תרצו לטייל':'When would you like to travel?','תאריך יציאה':'Start Date','תאריך חזרה':'End Date','TripCheck יבדוק התאמה בין היעד לשדות התעופה.':'TripCheck will verify that the airports match your destination.',
    '2. מי נוסע?':'2. Who is traveling?','סוג הקבוצה':'Group Type','זוג':'Couple','משפחה':'Family','חברים':'Friends','יחיד':'Solo Traveler','רב־דורי':'Multi-generational','כמה נוסעים מכל גיל?':'How many travelers in each age group?','מבוגרים':'Adults','צעירים':'Young Adults','נוער':'Teens','ילדים':'Children','תינוקות':'Infants','כלבים':'Dogs','חיות מחמד':'Pets','אין צורך להקליד גיל. הבחירה לפי קבוצות גיל מאפשרת ל־TripCraft להתאים קצב, הליכות, אטרקציות וימי נסיעה.':'No need to enter exact ages. Age groups help TripCraft adapt pace, walking, attractions and travel days.',
    '3. איך אתם אוהבים לטייל?':'3. How do you like to travel?','באילו אמצעי תחבורה תרצו להשתמש?':'Which modes of transportation would you like to use?','רכב':'Car','רכבת':'Train','תחבורה ציבורית':'Public Transit','הליכה':'Walking','טיסות פנימיות':'Domestic Flights','מעבורת / שייט':'Ferry / Cruise','מונית / הסעה':'Taxi / Transfer','אורך יום טיול':'Length of Travel Day','יום מלא — לנצל את היום':'Full day — make the most of it','גמיש — לפי היעד':'Flexible — based on destination','חצי יום — יותר זמן חופשי':'Half day — more free time','קצב':'Pace','רגוע':'Relaxed','מאוזן':'Balanced','אינטנסיבי':'Intensive','הליכה יומית נוחה':'Comfortable Daily Walking','עד שעה':'Up to 1 hour','1–3 שעות':'1–3 hours','3–5 שעות':'3–5 hours','אין מגבלה מיוחדת':'No special limit','נהיגה יומית רצויה':'Preferred Daily Driving','עד שעתיים':'Up to 2 hours','עד 4 שעות':'Up to 4 hours','עד 6 שעות':'Up to 6 hours','לא מפריע לנו יום ארוך מדי פעם':'An occasional long day is fine','מה מעניין אתכם?':'What interests you?','נופים וטבע':'Scenery & Nature','עיירות וכפרים':'Towns & Villages','אגמים ומפלים':'Lakes & Waterfalls','ערים':'Cities','חוף':'Beach','טיולים רגליים':'Hiking','קולינריה':'Food','גסטרונומיה':'Gastronomy','שופינג':'Shopping','אטרקציות ואדרנלין':'Attractions & Adrenaline','ספורט אתגרי':'Adventure Sports','פארקי מים ואטרקציות לילדים':'Water Parks & Kids Attractions','ספורט מים':'Water Sports','שייט':'Cruises / Boating','תרבות ומוזיאונים':'Culture & Museums','היסטוריה וטירות':'History & Castles','תיאטרון ומופעים':'Theater & Shows','צילום':'Photography','ספא ובריאות':'Spa & Wellness','הליכות':'Walking','חיי לילה':'Nightlife','יין':'Wine',
    '4. תרצו ש-TripCraft יתכנן גם את הלינה?':'4. Would you like TripCraft to plan your lodging?','מה תרצו לעשות עם הלינה?':'How should we handle lodging?','כן — תציע ותתכנן לינה':'Yes — recommend and plan lodging','כבר יש לי מקומות לינה':'I already have lodging','אחליט ואוסיף אחר כך':'I will decide and add it later','לא — דלג על שלב הלינה':'No — skip lodging','איזו לינה לחפש?':'What type of lodging should we find?','מלון':'Hotel','דירה':'Apartment','וילה':'Villa','ריזורט':'Resort','בית נופש':'Holiday Home','הוסטל':'Hostel','רמת מחיר':'Price Level','יוקרתי':'Luxury','ביניים':'Mid-range','חסכוני':'Budget','זול מאוד':'Very Low Cost','מה חשוב במקום הלינה?':'What matters in your lodging?','ארוחת בוקר':'Breakfast','ארוחת בוקר וערב (חצי פנסיון)':'Breakfast and Dinner (Half Board)','הכל כלול':'All Inclusive','ביטול חינם':'Free Cancellation','חניה':'Parking','בריכה':'Pool','ספא':'Spa','מטבח':'Kitchen','מרכזי':'Central Location','נוף':'View','משפחתי':'Family-friendly','נגיש':'Accessible','כמה חדרים תרצו?':'How many rooms would you like?','הרכב לחיפוש המלונות':'Hotel Search Group','זוג אחד · חדר אחד':'One couple · one room','מה חשוב יותר?':'What matters most?','מחיר':'Price','איזון מחיר ואיכות':'Balance of price and quality','דירוג ואיכות':'Rating and quality','כמה מותר לסטות מהמסלול בשביל לינה?':'How far may lodging deviate from the route?','רק על המסלול / באזור הלינה':'Only on the route / in the lodging area','עד 10 דקות':'Up to 10 minutes','עד 20 דקות':'Up to 20 minutes','לא משנה':'No preference','שם המלון / הדירה שכבר הזמנתם':'Hotel / apartment already booked','חשוב:':'Important:',
    '5. מה חשוב לנו לדעת?':'5. What should we know?','איך אתם מעדיפים לישון?':'How do you prefer to stay?','תן ל-TripCraft לבחור חכם':'Let TripCraft choose intelligently','כמה שפחות החלפות מלון':'As few hotel changes as possible','טיול כוכב — בסיס אחד כשזה הגיוני':'Hub trip — one base when practical','מתקדמים עם המסלול ומחליפים לפי הצורך':'Move along the route and change lodging as needed','רמת מלון מועדפת':'Preferred Hotel Level','לא חשוב / תן המלצה':'No preference / recommend','3 כוכבים':'3 Stars','4 כוכבים':'4 Stars','5 כוכבים':'5 Stars','דירה / אפרטהוטל':'Apartment / Aparthotel','לכלול מלונות בתקציב?':'Include hotels in the budget?','כן — הצג הערכת לינה':'Yes — show lodging estimate','לא בשלב זה':'Not at this stage','מה חשוב לכם בטיול?':'What matters to you on this trip?','בלי ימים עמוסים':'No overloaded days','מעט החלפות מלון':'Few hotel changes','זמן חופשי':'Free time','מסלול יעיל':'Efficient itinerary','כבישים נופיים':'Scenic roads','ממה להימנע?':'What should we avoid?','טרקים קשים':'Difficult treks','נהיגה ארוכה':'Long drives','כבישים קשים':'Difficult roads','מדרגות רבות':'Many stairs','יקר מדי':'Too expensive','קימה מוקדמת':'Early starts','מקומות שחייבים להיות בטיול':'Must-see places','אירועים / טיסות / אילוצים בתאריך מסוים':'Events / flights / fixed-date constraints',
    '6. לינות ומחירים — לפני האישור הסופי':'6. Lodging and Prices — Before Final Approval','המחירים בשלב זה הם הערכה בלבד.':'Prices at this stage are estimates only.','7. סקירה ואישור לפני בניית הטיול':'7. Review and Approve Before Building','💬 עוזר התכנון':'💬 Planning Assistant','הטיול נשאר ניתן לעריכה':'Your trip remains editable','הקודם':'Back','הבא':'Next','בנה טיול':'Build Trip','בונים לכם את הטיול...':'Building your trip...','מנתחים את ההעדפות שלכם':'Analyzing your preferences','טיול חדש':'New Trip','פיילוט: עד 10 שינויים':'Pilot: up to 10 changes','שמור טיול':'Save Trip','שמור טיול וקבל קישור':'Save Trip and Get Link','הטיול נשמר ✓':'Trip Saved ✓','יציאה ללא שמירה':'Exit Without Saving','הטיול עדיין לא נשמר.':'Your trip has not been saved yet.','הקישור האישי לטיול:':'Your Personal Trip Link:','העתק קישור':'Copy Link','הקישור הועתק ✓':'Link Copied ✓','פוסטים והמלצות לכל הטיול':'Posts and Recommendations for the Entire Trip','בדוק והצע שיבוץ':'Review and Suggest Placement','הטיול הראשוני מוכן. כתבו לי מה תרצו לשנות.':'Your initial trip is ready. Tell me what you would like to change.','שלח':'Send',
    'בחרו את הדרך שמתאימה לכם':'Choose the plan that fits you','מחירים פשוטים לפי טיול':'Simple Pricing Per Trip','טיול קיים':'Ready Trip','טיול מוכן':'Ready-made Trip','הכי מתאים למי שמצא בסיס טוב':'Best if you found a good base trip','התאמת טיול':'Trip Adaptation','מאפס':'From Scratch','טיול אישי AI':'Personal AI Trip','צריכים עוד שינויים?':'Need more changes?','המשך לקופה':'Continue to Checkout','סה״כ':'Total',
    'כניסה והרשמה':'Sign In and Registration','פיילוט TripCraft:':'TripCraft Pilot:','כניסה ל-TripCraft':'Sign In to TripCraft','אימייל':'Email','נבדוק אם כבר נרשמתם':'We will check whether you are already registered','בדוק ושלח קוד':'Check and Send Code','האימייל עדיין לא רשום.':'This email is not registered yet.','שם פרטי':'First Name','שם משפחה':'Last Name','טלפון (לא חובה)':'Phone (optional)','הירשם ושלח קוד':'Register and Send Code','← חזור לתיקון האימייל':'← Back to Edit Email','הזנת קוד אימות':'Enter Verification Code','שלחנו קוד האימות אל:':'We sent a verification code to:','הזינו את הקוד שקיבלתם במייל.':'Enter the code you received by email.','אמת והמשך':'Verify and Continue','לא קיבלתם? בדקו גם בספאם. לאחר 60 שניות ניתן לשלוח קוד חדש.':'Did not receive it? Check spam. You can request a new code after 60 seconds.','שלח קוד חדש':'Send a New Code',
    'טוען את הטיולים שלך...':'Loading your trips...','הטיולים שלי':'My Trips','בניית טיול חדש':'Build a New Trip','התנתק':'Sign Out','לאן:':'Destination:','תאריכים:':'Dates:','לינק שנוצר:':'Generated Link:','פתח / ערוך טיול':'Open / Edit Trip','מחק טיול':'Delete Trip','מוחק...':'Deleting...','הטיול נמחק מהחשבון.':'The trip was deleted from your account.','עדיין אין טיולים בחשבון. בחרו „בניית טיול חדש”.':'There are no trips in your account yet. Choose “Build a New Trip”.','כדי לראות את הטיולים יש להיכנס עם אימייל ו-OTP.':'Sign in with your email and OTP to view your trips.',
    'פרטיות ומידע':'Privacy & Data','אבטחה':'Security','נגישות':'Accessibility','תנאי שימוש וביטולים':'Terms of Use & Cancellations','פרטיות':'Privacy','תקנון':'Terms','הגדל טקסט':'Larger Text','ניגודיות':'Contrast','הדגש קישורים':'Underline Links','איפוס':'Reset','הצהרת נגישות מלאה':'Full Accessibility Statement','עריכת יום':'Edit Day','סגור':'Close','כותרת היום':'Day Title','שמור כותרת':'Save Title','סגור וחזור':'Close and Return','תכנית לפי ימים':'Daily Itinerary','לחץ על יום כדי לפתוח פירוט מלא.':'Select a day to open full details.','🗺️ כל המסלול במפה':'🗺️ Entire Route on Map'
  }));

  const PLACEHOLDERS={
    'למשל: אוסטריה וגרמניה 2027':'For example: Austria and Germany 2027','הקלידו מדינה ובחרו מהרשימה':'Type a country and select it from the list','מדינה, עיר או אזור — כולל ישראל':'Country, city or region — including Israel','עיר / שדה / קוד':'City / airport / code','אותו שדה או שדה אחר':'Same or different airport','אפשר להקליד בעברית או באנגלית':'Type a hotel or apartment','למשל: אגם קומו, ניס (NCE), מפלי ניאגרה — הוסיפו נקודות חובה':'For example: Lake Como, Nice (NCE), Niagara Falls','הדבק כאן פוסט / לינק / המלצה לכל הטיול':'Paste a post, link or recommendation for the trip','למשל: יום 2 עמוס מדי, תוריד תחנה אחת':'For example: Day 2 is too busy; remove one stop','כתוב חופשי על היום הזה':'Write freely about this day'
  };

  const fragments=[
    ['שמור','Save'],['טיול','Trip'],['ימים','Days'],['יום','Day'],['לילות','Nights'],['לילה','Night'],['חדרים','Rooms'],['חדר','Room'],['מלונות','Hotels'],['מלון','Hotel'],['תאריכים','Dates'],['תאריך','Date'],['יעד','Destination'],['לינה','Lodging'],['חשבון','Account'],['קישור','Link'],['מומלץ','Recommended'],['המלצה','Recommendation'],['בחירה','Selection'],['עדכון','Update'],['עריכה','Edit'],['מחיקה','Delete'],['פתח','Open'],['העתק','Copy'],['חזור','Back'],['המשך','Continue'],['אישור','Approval'],['שגיאה','Error'],['נכשל','Failed'],['נטען','Loading'],['טוען','Loading'],['לא נמצא','Not found'],['לא ניתן','Unable'],['עדיין','Still'],['חדש','New'],['שלכם','your'],['שלך','your'],['המערכת','The system'],['משתמש','User']
  ];

  function fallbackFor(node,text){
    const tag=node.parentElement?.tagName||'';
    if(tag==='OPTION')return 'Select an option';
    if(tag==='BUTTON')return 'Continue';
    if(tag==='LABEL'||tag==='STRONG'||/^H[1-6]$/.test(tag))return 'Trip details';
    if(text.length<24)return 'Trip information';
    return 'TripCraft information is available for this step.';
  }

  function translateValue(value,node){
    if(!value||!HEBREW.test(value))return value;
    const lead=value.match(/^\s*/)?.[0]||'',tail=value.match(/\s*$/)?.[0]||'',trim=value.trim();
    if(EN.has(trim))return lead+EN.get(trim)+tail;
    let out=trim;
    for(const [he,en] of fragments)out=out.split(he).join(en);
    if(HEBREW.test(out))out=fallbackFor(node,trim);
    return lead+out+tail;
  }

  function translateNode(node){
    if(!node?.parentElement||node.parentElement.closest('script,style,[data-no-translate],#tcUserGreeting,#tcMobileUser'))return;
    if(!originalText.has(node))originalText.set(node,node.nodeValue);
    const next=translateValue(node.nodeValue,node);
    if(next!==node.nodeValue)node.nodeValue=next;
  }

  function applyEnglish(root=document.body){
    if(language()!=='en'||!root)return;
    document.documentElement.lang='en';document.documentElement.dir='ltr';document.body.classList.add('tc-en');
    const base=root.nodeType===Node.TEXT_NODE?root.parentElement:root;
    if(!base)return;
    base.querySelectorAll?.('[data-en]').forEach(el=>{if(!el.dataset.tcFinalEn)el.dataset.tcFinalEn='1';if(el.textContent!==el.dataset.en)el.textContent=el.dataset.en});
    base.querySelectorAll?.('[data-en-aria]').forEach(el=>el.setAttribute('aria-label',el.dataset.enAria));
    base.querySelectorAll?.('[placeholder],[title],[aria-label]').forEach(el=>{
      if(!originalAttrs.has(el))originalAttrs.set(el,{placeholder:el.getAttribute('placeholder'),title:el.getAttribute('title'),aria:el.getAttribute('aria-label')});
      for(const attr of ['placeholder','title','aria-label']){const value=el.getAttribute(attr);if(!value||!HEBREW.test(value))continue;el.setAttribute(attr,PLACEHOLDERS[value]||translateValue(value,{parentElement:el}));}
    });
    const walker=document.createTreeWalker(base,NodeFilter.SHOW_TEXT);const nodes=[];let n;while((n=walker.nextNode()))nodes.push(n);nodes.forEach(translateNode);
  }

  function restoreHebrewState(){document.body.classList.remove('tc-en');}

  function installLogo(){
    document.querySelectorAll('.tc-brand-logo').forEach(img=>{
      if(!img.src.includes('tripcraft-logo-v109.png'))img.src=LOGO;
      img.removeAttribute('srcset');img.alt='TripCraft';img.style.display='block';img.style.visibility='visible';img.style.opacity='1';
      img.onerror=()=>{img.onerror=null;img.src='icons/tripcraft-header-logo.png?v=109-final'};
    });
  }

  function install(){
    const style=document.createElement('style');style.id='tc-v108-final-styles';style.textContent=`
      html,body{max-width:100%;overflow-x:hidden!important}.page-focus,.wrap,.panel,.planner-step,.account-card,.v102-trip-card{min-width:0;max-width:100%}
      #import,.focus-title.import,a[href="#import"]{display:none!important}
      .lang-switch,.mobile-lang{display:flex!important;align-items:center;background:#f4f8fb;border:1px solid #d4e1e9;border-radius:999px;padding:3px!important}.lang-link.active{display:none!important}.lang-link:not(.active){display:inline-flex!important;background:#0d3b60!important;color:#fff!important;min-width:48px}
      .tc-brand-logo{display:block!important;visibility:visible!important;opacity:1!important;width:92px!important;height:74px!important;min-width:92px!important;object-fit:contain!important;object-position:center!important;background:transparent!important}
      .tc-home-account{display:none!important;background:#fff!important;color:#0d3557!important;border:1px solid rgba(255,255,255,.72)!important}.tc-logged-in .tc-home-account{display:inline-flex!important}
      #home{background:radial-gradient(circle at 15% 20%,rgba(50,155,220,.35),transparent 36%),linear-gradient(145deg,#0a3559 0%,#0d5684 55%,#12769b 100%)!important;color:#fff!important}.tc-home-final{display:flex;flex-direction:column;align-items:flex-start}.tc-home-final .home-kicker{background:rgba(255,255,255,.13)!important;border:1px solid rgba(255,255,255,.38)!important}.tc-home-final .tc-home-actions{width:100%}.tc-home-final .planner-color{background:#f59e0b!important;color:#fff!important}.tc-home-demo{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;margin-top:17px;width:min(620px,100%);padding:13px 15px;border:1px solid rgba(255,255,255,.38);border-radius:18px;background:rgba(255,255,255,.12);color:#fff;backdrop-filter:blur(8px)}.tc-home-demo-icon{display:grid;place-items:center;width:39px;height:39px;border-radius:12px;background:#f59e0b;font-size:20px}.tc-home-demo strong,.tc-home-demo small{display:block}.tc-home-demo small{margin-top:3px;color:#e7f3fa;line-height:1.35}.tc-home-demo>b{font-size:30px}.tc-home-final .home-trust{margin-top:17px!important}
      #tcAccountBody .v102-trip-card>.cta{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important;align-items:stretch!important}#tcAccountBody .v102-trip-card>.cta .btn{min-width:0!important;width:100%!important;margin:0!important}.tc-v108-delete{display:inline-flex!important;background:#c62828!important;color:#fff!important}
      .tc-en{direction:ltr}.tc-en .date-choice{direction:ltr}.tc-en .journey-arrow{transform:scaleX(-1)}
      @media(max-width:980px){
        .tc-header{height:102px!important;min-height:102px!important;max-width:100vw!important;padding:8px 12px 27px!important;overflow:visible!important}.tc-header .brand{min-width:0!important;gap:7px!important}.tc-header .brand h1{font-size:21px!important}.tc-header .brand small{font-size:11px!important;white-space:nowrap}.tc-brand-logo{width:80px!important;height:64px!important;min-width:80px!important}.hamburger{flex:0 0 52px!important}.lang-switch{flex:0 0 auto!important}
        .page-focus[data-page="home"] footer{display:none!important}.page-focus[data-page="home"] #home{height:calc(100svh - 102px)!important;min-height:0!important;overflow:hidden!important;padding:0!important}.tc-home-final{width:100%!important;height:100%!important;margin:0!important;padding:clamp(22px,5.5vh,48px) 24px 18px!important;justify-content:center!important}.tc-home-final h2{font-size:clamp(42px,12vw,64px)!important;line-height:.98!important;margin:12px 0 12px!important;max-width:650px}.tc-home-final>p{font-size:clamp(17px,4.5vw,22px)!important;line-height:1.45!important;margin:0!important;max-width:650px}.tc-home-final .tc-home-actions{display:grid!important;grid-template-columns:1fr!important;gap:9px!important;margin-top:18px!important}.tc-home-final .tc-home-actions .btn{width:100%!important;min-height:52px!important}.tc-home-demo{margin-top:12px!important;padding:10px 12px!important}.tc-home-final .home-trust{display:flex!important;gap:9px!important;flex-wrap:wrap!important;margin-top:12px!important;font-size:12px!important}.home-options,.home-subcopy{display:none!important}
        #tcAccountBody .v102-trip-card>.cta .btn{padding:9px 4px!important;font-size:11px!important;line-height:1.15!important;white-space:normal!important}
      }
      @media(max-width:380px),(max-height:700px){.tc-home-final{padding-top:12px!important;justify-content:flex-start!important}.tc-home-final .home-kicker{font-size:12px!important;padding:6px 9px!important}.tc-home-final h2{font-size:38px!important;margin:8px 0!important}.tc-home-final>p{font-size:15px!important;line-height:1.35!important}.tc-home-final .tc-home-actions{margin-top:11px!important}.tc-home-final .tc-home-actions .btn{min-height:45px!important;padding:9px 12px!important}.tc-home-demo{margin-top:9px!important}.tc-home-demo small{font-size:11px!important}.tc-home-final .home-trust{margin-top:8px!important;font-size:10px!important}}
    `;document.head.appendChild(style);
    installLogo();
    document.querySelectorAll('[data-lang]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(()=>{language()==='en'?applyEnglish():restoreHebrewState();installLogo()},0)));
    const nativeAlert=window.alert.bind(window),nativeConfirm=window.confirm.bind(window);
    window.alert=message=>nativeAlert(language()==='en'?translateValue(String(message),{parentElement:document.body}):message);
    window.confirm=message=>nativeConfirm(language()==='en'?translateValue(String(message),{parentElement:document.body}):message);
    let queued=false;new MutationObserver(records=>{installLogo();if(language()!=='en'||queued)return;queued=true;requestAnimationFrame(()=>{queued=false;records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===Node.TEXT_NODE)translateNode(node);else applyEnglish(node)}))})}).observe(document.body,{childList:true,subtree:true});
    if(language()==='en')applyEnglish();
    const leaveImport=()=>{if(location.hash==='#import')location.hash=document.body.classList.contains('tc-logged-in')?'#account':'#home'};
    leaveImport();window.addEventListener('hashchange',leaveImport);
    window.addEventListener('pageshow',()=>{installLogo();if(language()==='en')applyEnglish()});
    window.addEventListener('hashchange',()=>setTimeout(()=>{installLogo();if(language()==='en')applyEnglish()},0));
    document.documentElement.dataset.tripcraftBuild='V109-FINAL';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
