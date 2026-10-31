@echo off
rem Relais TV de Mon Ecran : laisse cette fenetre ouverte pendant que tu regardes la TV dans le dock.
cd /d "%~dp0"
title Relais TV - Mon Ecran
node tv-relais.mjs
pause
