# TripCraft V115 — חיבור AI מאובטח

האתר קורא לפונקציית Supabase בשם `tripcraft-ai`. מפתח OpenAI נשמר רק כסוד בצד השרת ואינו נכתב בקובצי האתר.

```bash
supabase functions deploy tripcraft-ai
supabase secrets set OPENAI_API_KEY=YOUR_KEY
supabase secrets set OPENAI_MODEL=gpt-5-mini
```

עד לפריסת הפונקציה, V115 מפעילה מנגנון מקומי בטוח לבקשות בסיסיות: הוספה, הסרה, החלפה, שינוי כותרת, שינוי מלון, ריווח יום והעברת תחנה בין ימים.
