@echo off
echo ==============================================
echo  Staging all changes and committing...
echo ==============================================
git add -A
git commit -m "fix(vercel): configure serverless functions in api root and update vercel.json"
echo.
echo ==============================================
echo  Pushing to GitHub...
echo ==============================================
git push origin main
echo.
echo ==============================================
echo  Done! Exit code: %ERRORLEVEL%
echo ==============================================
