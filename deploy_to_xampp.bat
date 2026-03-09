@echo off
echo Deploying API to XAMPP...
xcopy /E /I /Y "api" "C:\xampp\htdocs\chollones-api"

echo Deploying Frontend to XAMPP...
xcopy /E /I /Y "src" "C:\xampp\htdocs\chollones_app\src"
copy /Y "index.html" "C:\xampp\htdocs\chollones_app\" 2>nul
copy /Y "package.json" "C:\xampp\htdocs\chollones_app\" 2>nul
xcopy /E /I /Y "*" "C:\xampp\htdocs\chollones_app" /exclude:deploy_exclude.txt

echo Deployment complete.
