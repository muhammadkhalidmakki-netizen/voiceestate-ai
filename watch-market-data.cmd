@echo off
rem Double-click and leave open: market data refreshes by itself whenever you save country-cpl-estimates.csv.
cd /d "%~dp0"
node scripts\market-intel\watch.mjs
pause
