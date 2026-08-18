@echo off
echo Step 1: Create a fresh orphan branch (no history)...
git checkout --orphan clean_main

echo Step 2: Stage all current files (keys already removed)...
git add -A

echo Step 3: Commit cleanly...
git commit -m "SIH 2025 - Rainwater Harvesting Feasibility App (initial release)"

echo Step 4: Delete old main branch...
git branch -D main

echo Step 5: Rename clean_main to main...
git branch -m main

echo Step 6: Force push clean history to GitHub...
git push -u origin main --force

echo.
echo Done! Exit code: %ERRORLEVEL%
