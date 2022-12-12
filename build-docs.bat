@setlocal
@echo off
pushd %~dp0

if not exist "%CHEM_PHP%" (
  echo %%CHEM_PHP%% not defined or not path to existing file
  exit /b 1
)

if exist docs rd /s /q docs
rem If yours is in a different location then give --esprima-node argument to
rem this batch script's command-line.
set NODE=cmd /C """cd /D """"""C:\\Program Files\\Node.js"""""" ^&^& node.exe -"""

set COMMIT=master
git rev-parse --verify HEAD >tmp
if %errorlevel% equ 0 set /p COMMIT=<tmp
del tmp

php "%CHEM_PHP%" --esprima-node="%NODE%" -p=docs -z ^
  -iid=sqimitive -ititle=Sqimitive -iwww=https://squizzle.me/js/sqimitive/ ^
  --f-codeLineURL=https://github.com/ProgerXP/Sqimitive/blob/%COMMIT%/%%s#L%%d-L%%d ^
  --f-codeSnippets ^
  --f-link-GitHub=https://github.com/ProgerXP/Sqimitive ^
  --f-link-download=https://github.com/ProgerXP/Sqimitive/archive/master.zip ^
  --f-link-issues=https://github.com/ProgerXP/Sqimitive/issues ^
  --extchem-no=https://squizzle.me/js/nodash/ ^
  --extchem-jq=https://api.jquery.com/[?s=%%r] ^
  --extchem-un=https://underscorejs.org/[#%%r] ^
  --extchem-bb=https://backbonejs.org/[#%%r] ^
  HELP.chem main.js async.js jquery.js %*
