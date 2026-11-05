<div dir="rtl">

# הנחיות עבודה: שמירה ועדכון ב-Git וב-GitHub

הקובץ הזה מגדיר איך עובדים על הפרויקט ואיך שומרים ומעדכנים אותו ב-GitHub. הוא כתוב גם בשביל Claude Code, שקורא אותו לפני כל שינוי ופועל לפיו.

## עקרונות

1. הענף `main` תמיד עובד. כל מה שנמצא בו נפתח בדפדפן בלי שגיאות, ו-GitHub Pages מפרסם אותו כמו שהוא.
2. לא עובדים ישירות על `main`. כל שינוי נעשה בענף נפרד ונכנס ל-`main` רק אחרי בדיקה.
3. שומרים הרבה ובקטן. עושים קומיט אחרי כל שלב שעובד, ולא קומיט אחד גדול בסוף היום.
4. האפיון הוא המקור. שינוי בהתנהגות של הדשבורד מעדכן גם את `SPEC.md`, באותו ענף ובאותו PR.

## שמות ענפים

שם הענף מתחיל בסוג השינוי, אחריו לוכסן ותיאור קצר. השם כולו באנגלית, באותיות קטנות ועם מקפים בין המילים.

| סוג שינוי | דוגמה לשם ענף |
|---|---|
| יכולת חדשה | `feature/lead-scoring` |
| תיקון באג | `fix/funnel-percent` |
| תיעוד בלבד | `docs/update-spec` |
| עיצוב בלבד | `style/dark-mode-colors` |
| תחזוקה והגדרות | `chore/pages-setup` |

## הודעות קומיט

הודעות הקומיט נכתבות באנגלית, בזמן הווה ובמבנה של סוג השינוי, נקודתיים ותקציר. השורה הראשונה היא עד 72 תווים:

```text
feat: add SLA alert for new leads older than 24 hours
fix: count lost leads in the contacted funnel stage
docs: describe the lead score in SPEC.md
style: widen chart labels on mobile
refactor: move chart helpers to one function
chore: add .gitignore
```

אם צריך להסביר למה נעשה השינוי, כותבים את זה בגוף ההודעה, אחרי שורה ריקה.

## מחזור עבודה

### 1. מתחילים מענף main מעודכן

```bash
git switch main
git pull
git switch -c feature/short-name
```

### 2. עובדים ושומרים

```bash
git status
git add app.js styles.css
git commit -m "feat: add lead card"
```

מוסיפים קבצים לפי שם ולא עם `git add .`&lrm; עיוור, כדי שלא ייכנס לריפו קובץ שלא התכוונו אליו.

### 3. בודקים לפני שדוחפים

1. פותחים את `index.html` ומוודאים שאין שגיאות בקונסול.
2. בודקים מצב בהיר, מצב כהה ורוחב טלפון.
3. עוברים על בדיקת הקבלה ב-`SPEC.md` בחלק ששונה.

### 4. דוחפים ופותחים PR

```bash
git push -u origin feature/short-name
gh pr create --base main --title "feat: add lead card" --body "What changed and how to test it"
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
git merge --no-ff feature/short-name
git push
git branch -d feature/short-name
```

### 6. מסמנים גרסה

כשמגיעים לנקודה שאפשר להציג, מסמנים אותה:

```bash
git tag -a v1.0 -m "First working dashboard"
git push origin v1.0
gh release create v1.0 --generate-notes
```

## קונפליקטים

כש-`git pull` או מיזוג נעצרים בקונפליקט, Git מסמן בקובץ את שתי הגרסאות. כך פותרים:

1. פותחים את הקובץ ומוצאים את סימני הקונפליקט.
2. בוחרים את הגרסה הנכונה, או משלבים בין החלק שמעל קו ההפרדה לחלק שמתחתיו.
3. מוחקים את שלוש שורות הסימון.
4. מריצים `git add` על הקובץ ואחר כך `git commit`.

אם לא ברור איזו גרסה נכונה, עוצרים ושואלים, ולא בוחרים צד באקראי. כך נראים הסימנים בקובץ:

```text
<<<<<<< HEAD
the version in the current branch
=======
the version from the branch being merged
>>>>>>> feature/short-name
```

## מה לא נכנס לריפו

1. סיסמאות, טוקנים ומפתחות API. אף פעם, גם לא בריפו פרטי. מפתח שנכנס בטעות מבטלים מיד אצל הספק, כי מחיקה מהקוד לא מוחקת אותו מההיסטוריה.
2. קבצי סביבה וקבצים מקומיים של מערכת ההפעלה. השמות שלהם רשומים בקובץ ההתעלמות של Git, כפי שמופיע בטבלה למטה.
3. נתונים אמיתיים של לקוחות. בריפו יש רק נתוני דמה.

| קובץ | מה הוא |
|---|---|
| &lrm;`.env` | קובץ סביבה עם מפתחות והגדרות מקומיות |
| &lrm;`.DS_Store` | קובץ מערכת של macOS |
| &lrm;`.gitignore` | הרשימה של הקבצים ש-Git מתעלם מהם |

## פרסום ב-GitHub Pages

האתר מתפרסם מהענף `main`, מהתיקייה הראשית. כל מיזוג ל-`main` מעדכן את האתר אחרי דקה או שתיים.

| מה | פרט |
|---|---|
| כתובת האתר | [1g0rh.github.io/leads-dashboard](https://1g0rh.github.io/leads-dashboard/) |
| מקור הפרסום | הענף `main`, התיקייה הראשית |
| הקובץ &lrm;`.nojekyll` | קובץ ריק שאומר ל-GitHub לפרסם את הקבצים כמו שהם, בלי לעבד אותם ב-Jekyll |

בגלל זה הקובץ `index.html` חייב להישאר בתיקייה הראשית, וכל הנתיבים בקוד הם יחסיים. כותבים `data/mock-data.js` ולא נתיב שמתחיל בלוכסן.

## מה Claude Code לא עושה בלי אישור מפורש

1. דחיפה בכוח, כלומר `git push --force`, או כל שכתוב של ההיסטוריה ב-`main`.
2. מחיקה של ענף שעוד לא מוזג.
3. שינוי הריפו מפרטי לציבורי, או הוספת משתפים.
4. שינוי בהגדרות של GitHub Pages או בהגדרות של הריפו.

## פקודות שימושיות

| פקודה | מה היא עושה |
|---|---|
| `git log --oneline --graph --all` | מציגה את כל הענפים וההיסטוריה כעץ |
| `git branch -vv` | מציגה את הענפים המקומיים, ואם הם מקדימים את GitHub או מפגרים אחריו |
| `git diff` | מציגה מה השתנה ועוד לא נוסף לקומיט |
| `git restore app.js` | מבטלת שינויים בקובץ שעוד לא נשמרו |
| `gh repo view --web` | פותחת את הריפו בדפדפן |
| `gh pr status` | מציגה את המצב של ה-PRs הפתוחים |

</div>
