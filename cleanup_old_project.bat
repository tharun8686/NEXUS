@echo off
echo =====================================================
echo   NexusTech — Old Project Cleanup
echo   This will COMPLETELY DELETE D:\electronics-store
echo =====================================================
echo.
echo The following will be permanently deleted:
echo   D:\electronics-store  (entire folder)
echo.
echo Make sure you have extracted the new nexustech
echo folder before running this!
echo.
echo Press any key to delete, or close to cancel.
pause > nul

IF NOT EXIST "D:\electronics-store" (
    echo [SKIP] D:\electronics-store not found. Nothing to delete.
    pause & exit /b 0
)

echo.
echo Deleting D:\electronics-store...
rmdir /s /q "D:\electronics-store"

IF NOT EXIST "D:\electronics-store" (
    echo [OK] D:\electronics-store completely deleted.
) ELSE (
    echo [ERROR] Could not fully delete. Some files may be in use.
    echo Try closing VS Code, terminals, or any open files and retry.
)

echo.
echo =====================================================
echo   Done!
echo =====================================================
pause
