@echo off
echo =====================================================
echo   NexusTech — Cleanup Script
echo   Removes everything install.bat put in place:
echo     - backend\node_modules
echo     - backend\package-lock.json
echo     - frontend\node_modules
echo     - frontend\package-lock.json
echo     - frontend\.vite cache
echo     - frontend\dist
echo     - electronics_store MySQL database
echo =====================================================
echo.
echo After cleanup, the project folder will be lean and
echo ready to share or upload.
echo Re-run install.bat anytime
echo to fully restore everything.
echo.
echo Press any key to start cleanup, or close to cancel.
pause > nul
echo.

set "ROOT=D:\nexustech"

REM ── 1. Remove backend node_modules ───────────────────
IF EXIST "%ROOT%\backend\node_modules" (
    echo [1/5] Removing backend\node_modules...
    rmdir /s /q "%ROOT%\backend\node_modules"
    echo [OK] backend\node_modules deleted.
) ELSE (
    echo [SKIP] backend\node_modules not found.
)

REM ── 2. Remove backend package-lock.json ──────────────
IF EXIST "%ROOT%\backend\package-lock.json" (
    del /q "%ROOT%\backend\package-lock.json"
    echo [OK] backend\package-lock.json deleted.
) ELSE (
    echo [SKIP] backend\package-lock.json not found.
)

REM ── 3. Remove frontend node_modules ──────────────────
IF EXIST "%ROOT%\frontend\node_modules" (
    echo [2/5] Removing frontend\node_modules...
    rmdir /s /q "%ROOT%\frontend\node_modules"
    echo [OK] frontend\node_modules deleted.
) ELSE (
    echo [SKIP] frontend\node_modules not found.
)

REM ── 4. Remove frontend package-lock.json ─────────────
IF EXIST "%ROOT%\frontend\package-lock.json" (
    del /q "%ROOT%\frontend\package-lock.json"
    echo [OK] frontend\package-lock.json deleted.
) ELSE (
    echo [SKIP] frontend\package-lock.json not found.
)

REM ── 5. Remove Vite build cache ────────────────────────
IF EXIST "%ROOT%\frontend\.vite" (
    echo [3/5] Removing frontend\.vite cache...
    rmdir /s /q "%ROOT%\frontend\.vite"
    echo [OK] frontend\.vite deleted.
) ELSE (
    echo [SKIP] frontend\.vite not found.
)

IF EXIST "%ROOT%\frontend\dist" (
    echo [4/5] Removing frontend\dist...
    rmdir /s /q "%ROOT%\frontend\dist"
    echo [OK] frontend\dist deleted.
) ELSE (
    echo [SKIP] frontend\dist not found.
)

REM ── 6. Drop MySQL database ────────────────────────────
echo [5/5] Dropping electronics_store database...

set "MYSQL_EXE="
IF EXIST "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"  set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
IF EXIST "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"  set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
IF EXIST "C:\Program Files\MySQL\MySQL Server 8.1\bin\mysql.exe"  set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 8.1\bin\mysql.exe"
IF EXIST "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe"  set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe"
IF EXIST "C:\xampp\mysql\bin\mysql.exe"                           set "MYSQL_EXE=C:\xampp\mysql\bin\mysql.exe"
IF EXIST "C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe"          set "MYSQL_EXE=C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe"

IF "%MYSQL_EXE%"=="" (
    echo [WARN] mysql.exe not found automatically.
set /p "MYSQL_EXE=Enter full path to mysql.exe (or press Enter to skip DB drop): "
)

IF "%MYSQL_EXE%"=="" (
    echo [SKIP] Skipping database drop.
    GOTO DONE
)

echo.
echo Enter your MySQL credentials:
set /p "MYSQL_USER=   MySQL username (press Enter for root): "
IF "%MYSQL_USER%"=="" set "MYSQL_USER=root"

set /p "MYSQL_PASS=   MySQL password (press Enter for root): "
IF "%MYSQL_PASS%"=="" set "MYSQL_PASS=root"

set "PASS_FLAG="
IF NOT "%MYSQL_PASS%"=="" set "PASS_FLAG=-p%MYSQL_PASS%"

echo.
echo [INFO] Testing connection...
"%MYSQL_EXE%" -u %MYSQL_USER% %PASS_FLAG% -e "SELECT 1;" >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Could not connect to MySQL with the provided credentials.
    echo         Skipping database drop. Drop it manually if needed:
    echo         DROP DATABASE electronics_store;
    GOTO DONE
)

"%MYSQL_EXE%" -u %MYSQL_USER% %PASS_FLAG% -e "DROP DATABASE IF EXISTS electronics_store;"
IF %ERRORLEVEL% EQU 0 (
    echo [OK] electronics_store database dropped.
) ELSE (
    echo [WARN] Could not drop database. Drop it manually if needed:
    echo         DROP DATABASE electronics_store;
)

:DONE
echo.
echo =====================================================
echo   Cleanup complete!
echo.
echo   Your project folder is now clean and lightweight —
echo   safe to zip, upload, or share.
echo.
echo   To restore everything, just run install.bat again.
echo =====================================================
echo.
pause