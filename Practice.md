# הנחיות עבודה: שמירה ועדכון ב-Git ו-GitHub

הקובץ הזה מגדיר איך עובדים על הפרויקט ואיך שומרים ומעדכנים אותו ב-GitHub. הוא כתוב גם בשביל Claude Code, שקורא אותו לפני כל שינוי ופועל לפיו.

## עקרונות

1. הענף `main` תמיד עובד. כל מה שנמצא בו נפתח בדפדפן בלי שגיאות, ו-GitHub Pages מפרסם אותו כמו שהוא.
2. לא עובדים ישירות על `main`. כל שינוי נעשה בענף נפרד ונכנס ל-`main` רק אחרי בדיקה.
3. שומרים הרבה ובקטן. קומיט אחרי כל שלב שעובד, ולא קומיט אחד גדול בסוף היום.
4. ה-SPEC הוא המקור. שינוי בהתנהגות של הדשבורד מעדכן גם את `SPEC.md`, באותו ענף ובאותו PR.

## שמות ענפים

| סוג שינוי | שם הענף | דוגמה |
|---|---|---|
| יכולת חדשה | `feature/<תיאור-קצר>` | `feature/lead-scoring` |
| תיקון באג | `fix/<תיאור-קצר>` | `fix/funnel-percent` |
| תיעוד בלבד | `docs/<תיאור-קצר>` | `docs/update-spec` |
| עיצוב בלבד | `style/<תיאור-קצר>` | `style/dark-mode-colors` |
| תחזוקה והגדרות | `chore/<תיאור-קצר>` | `chore/pages-setup` |

שמות ענפים באנגלית, באותיות קטנות ועם מקפים.

## הודעות קומיט

הודעות באנגלית, בפורמט `type: summary`, בזמן הווה ועד 72 תווים בשורה הראשונה:

```
feat: add SLA alert for new leads older than 24 hours
fix: count lost leads in the contacted funnel stage
docs: describe the lead score in SPEC.md
style: widen chart labels on mobile
refactor: move chart helpers to one function
chore: add .gitignore
```

אם צריך להסביר למה, כותבים את זה בגוף ההודעה, אחרי שורה ריקה.

## מחזור עבודה

### 1. מתחילים מ-main מעודכן

```bash
git switch main
git pull
git switch -c feature/<name>
```

### 2. עובדים ושומרים

```bash
git status
git add <files>
git commit -m "feat: ..."
```

מוסיפים קבצים לפי שם ולא עם `git add .` עיוור, כדי שלא ייכנס לריפו קובץ שלא התכוונו אליו.

### 3. בודקים לפני שדוחפים

1. פותחים את `index.html` ומוודאים שאין שגיאות בקונסול.
2. בודקים מצב בהיר, מצב כהה ורוחב טלפון.
3. עוברים על בדיקת הקבלה ב-`SPEC.md` לחלק ששונה.

### 4. דוחפים ופותחים PR

```bash
git push -u origin feature/<name>
gh pr create --base main --title "feat: ..." --body "מה השתנה ואיך בודקים"
```

### 5. ממזגים ומנקים

```bash
gh pr merge --squash --delete-branch
git switch main
git pull
```

מיזוג squash הופך את כל הקומיטים של הענף לקומיט אחד מסודר ב-`main`. כשעובדים לבד ובלי gh, אפשר למזג מקומית ולשמור את ההיסטוריה של הענף:

```bash
git switch main
git merge --no-ff feature/<name>
git push
git branch -d feature/<name>
```

### 6. מסמנים גרסה

כשמגיעים לנקודה שאפשר להציג, מסמנים אותה:

```bash
git tag -a v1.0 -m "First working dashboard"
git push origin v1.0
gh release create v1.0 --generate-notes
```

## קונפליקטים

אם `git pull` או מיזוג נעצרים בקונפליקט, פותחים את הקובץ, בוחרים או משלבים בין החלק שמעל `=======` לחלק שמתחתיו, מוחקים את סימני `<<<<<<<` ו-`>>>>>>>`, ואז מריצים `git add` על הקובץ ו-`git commit`. אם לא ברור מה נכון, עוצרים ושואלים, ולא בוחרים צד באקראי.

## מה לא נכנס לריפו

1. סיסמאות, טוקנים ומפתחות API. אף פעם, גם לא בריפו פרטי. מפתח שנכנס בטעות מבטלים מיד אצל הספק, כי מחיקה מהקוד לא מוחקת אותו מההיסטוריה.
2. קבצי `.env` וקבצים מקומיים של המערכת, כמו `.DS_Store`. הם מופיעים ב-`.gitignore`.
3. נתונים אמיתיים של לקוחות. בריפו יש רק נתוני דמה.

## GitHub Pages

האתר מתפרסם מהענף `main`, מהתיקייה הראשית, בכתובת https://1g0rh.github.io/leads-dashboard/. הקובץ הריק `.nojekyll` אומר ל-GitHub לפרסם את הקבצים כמו שהם, בלי לעבד אותם ב-Jekyll. כל מיזוג ל-`main` מעדכן את האתר אחרי דקה או שתיים. לכן `index.html` חייב להישאר בתיקייה הראשית, וכל הנתיבים בקוד יחסיים, כמו `data/mock-data.js` ולא `/data/mock-data.js`.

## מה Claude Code לא עושה בלי אישור מפורש

1. `git push --force` או כל שכתוב של היסטוריה ב-`main`.
2. מחיקת ענף שעוד לא מוזג.
3. שינוי הריפו מפרטי לציבורי, או הוספת משתפים.
4. שינוי הגדרות GitHub Pages או הגדרות הריפו.

## פקודות שימושיות

| פקודה | מה היא עושה |
|---|---|
| `git log --oneline --graph --all` | מציגה את כל הענפים וההיסטוריה כעץ |
| `git branch -vv` | מציגה את הענפים המקומיים ואם הם מקדימים או מפגרים אחרי GitHub |
| `git diff` | מה השתנה ועוד לא נוסף לקומיט |
| `git restore <file>` | מבטלת שינויים בקובץ שעוד לא נשמרו |
| `gh repo view --web` | פותחת את הריפו בדפדפן |
| `gh pr status` | מציגה את מצב ה-PR הפתוחים |
