@echo off
color 0b
cls
REM ################################# Inicio MENU ###########################################
echo                        ##         .
echo                  ## ## ##        ==
echo               ## ## ## ## ##    ===
echo           /"""""""""""""""""\___/ ===
echo      ~~~ {~~ ~~~~ ~~~ ~~~~ ~~~ ~ /  ===- ~~~
echo           \______ o           __/
echo             \    \         __/
echo              \____\_______/
date /t
echo Paulinho :D 
echo Computador: %computername%		Usuario: %username%
echo 			GIT Up 
echo =====================================
echo Digite commit
set /p comentario= 
git pull 
echo git add . 
git add . 
echo git commit -m "%comentario%"
git commit -m "%comentario%"
echo git push
git push
@REM set discorURL=https://discordapp.com/api/webhooks/984851456073019443/kXrdu6zkQsUcNpXx-SQwurfW9OvIDcBkLcOOyeHcfDQoMPs-_rELpJ2gQxPawgK9sFRd
echo =====================================
@REM curl -i -H "Accept: application/json" -H "Content-Type:application/json" -X POST --data "{\"content\": \"Hey! Um novo push foi lancado. Computador: %computername%, Usuario: %username%, Hora: %date% %time%, commit: %comentario%\"}" %discorURL%
echo Up concluido! :) 
