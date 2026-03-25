@echo off
REM =====================================================
REM START PHP SERVER FOR CHOLLONES APP
REM =====================================================
REM This starts PHP's built-in web server on port 8000
REM Make sure you have PHP installed and in PATH

echo.
echo Starting PHP Server on http://localhost:8000...
echo.
echo The app will run on: http://localhost:8100
echo API will proxy to: http://localhost:8000/api/
echo.

REM Change to the app directory
cd /d "%~dp0"

REM Start PHP server
php -S localhost:8000

REM If above fails, try full path to php.exe (XAMPP users)
REM "C:\xampp\php\php.exe" -S localhost:8000

echo.
echo Server stopped.
pause
