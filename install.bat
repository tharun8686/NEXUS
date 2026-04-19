@echo off
echo =====================================================
echo   NexusTech — Fresh Install Script
echo =====================================================
echo.
set "ROOT=D:\nexustech"

REM ── 1. Check Node.js ──────────────────────────────────
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed.
    echo Download from: https://nodejs.org
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Node.js %NODE_VER%

REM ── 2. Find MySQL ─────────────────────────────────────
set "MYSQL_EXE="
IF EXIST "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"  set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
IF EXIST "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"  set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
IF EXIST "C:\Program Files\MySQL\MySQL Server 8.1\bin\mysql.exe"  set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 8.1\bin\mysql.exe"
IF EXIST "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe"  set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe"
IF EXIST "C:\xampp\mysql\bin\mysql.exe"                           set "MYSQL_EXE=C:\xampp\mysql\bin\mysql.exe"
IF EXIST "C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe"          set "MYSQL_EXE=C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe"

IF "%MYSQL_EXE%"=="" (
    echo [WARN] mysql.exe not found automatically.
set /p "MYSQL_EXE=Enter full path to mysql.exe: "
)
echo [OK] MySQL: %MYSQL_EXE%
echo.

REM ── 3. Ask for MySQL credentials ──────────────────────
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
    echo         Please check your username and password, then re-run install.bat.
    pause & exit /b 1
)
echo [OK] Connected to MySQL successfully.
echo.

REM ── 4. Create database ────────────────────────────────
echo [1/5] Creating database...
"%MYSQL_EXE%" -u %MYSQL_USER% %PASS_FLAG% -e "CREATE DATABASE IF NOT EXISTS electronics_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
IF %ERRORLEVEL% NEQ 0 (
    echo [WARN] Could not create database. Create manually:
    echo        CREATE DATABASE electronics_store;
    echo Continuing...
) ELSE (
    echo [OK] Database ready.
)

REM ── 5. Run schema ─────────────────────────────────────
echo [2/5] Applying schema (all tables)...
set "SCHEMA_PATH=%ROOT%\backend\db\schema.sql"

"%MYSQL_EXE%" -u %MYSQL_USER% %PASS_FLAG% electronics_store --execute="source %SCHEMA_PATH%"
IF %ERRORLEVEL% NEQ 0 (
    echo [WARN] Trying pipe method for schema...
    type "%SCHEMA_PATH%" | "%MYSQL_EXE%" -u %MYSQL_USER% %PASS_FLAG% electronics_store
    IF %ERRORLEVEL% NEQ 0 (
        echo [WARN] Schema may need manual apply. Run:
        echo        source %SCHEMA_PATH%
    ) ELSE (
        echo [OK] Schema applied.
    )
) ELSE (
    echo [OK] Schema applied.
)

REM ── 6. Seed 200 products ──────────────────────────────
echo [3/5] Seeding 200 real products...

echo [INFO] Auto-matching local images into SQL...
node "%ROOT%\backend\match-images.js"

REM ── Point the seed path to the NEW fixed file ─────────
set "SEED_PATH=%ROOT%\backend\db\seed_products_fixed.sql"

"%MYSQL_EXE%" -u %MYSQL_USER% %PASS_FLAG% electronics_store --execute="source %SEED_PATH%"
IF %ERRORLEVEL% NEQ 0 (
    echo [WARN] Trying pipe method for seed...
    type "%SEED_PATH%" | "%MYSQL_EXE%" -u %MYSQL_USER% %PASS_FLAG% electronics_store
    IF %ERRORLEVEL% NEQ 0 (
        echo [WARN] Seed may need manual apply. Run:
        echo        source %SEED_PATH%
    ) ELSE (
        echo [OK] 200 products seeded with exact image paths!
    )
) ELSE (
    echo [OK] 200 products seeded with exact image paths!
)
echo.

REM ── 7. Backend npm install ────────────────────────────
echo [4/5] Installing backend dependencies...
echo.
cd /d "%ROOT%\backend"
call npm install
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend npm install failed.
    pause & exit /b 1
)
echo [OK] Backend ready.
echo.

REM ── 8. Frontend npm install ───────────────────────────
echo [5/5] Installing frontend dependencies...
echo.
cd /d "%ROOT%\frontend"
call npm install
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend npm install failed.
    pause & exit /b 1
)
echo [OK] Frontend ready.
echo.
echo =====================================================
echo   Install complete!
echo.
echo   Open TWO separate terminals:
echo.
echo   Terminal 1 (Backend):
echo     cd /d %ROOT%\backend
echo     node server.js
echo.
echo   Terminal 2 (Frontend):
echo     cd /d %ROOT%\frontend
echo     npm run dev
echo.
echo   Store : http://localhost:5173
echo   Admin : http://localhost:5173/admin
echo =====================================================
echo.
pause