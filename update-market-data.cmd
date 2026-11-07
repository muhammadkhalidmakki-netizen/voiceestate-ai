@echo off
rem Double-click to refresh the market data (CPLs, languages, scores) after editing country-cpl-estimates.csv.
cd /d "%~dp0"
echo Project folder: %CD%
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo ERROR: Node.js was not found, so the update cannot run.
  echo Install Node.js from nodejs.org, or open the project in a terminal where "node" works.
  echo.
  pause
  exit /b 1
)
node scripts\market-intel\update.mjs
echo.
echo ---- finished. If you saw an error above, copy it and send it to me. ----
pause
