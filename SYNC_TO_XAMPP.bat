@echo off
REM Sincronizar archivos de API a XAMPP
echo Sincronizando archivos de API a XAMPP...

REM Copiar archivos principales
copy /Y "c:\Users\franc\OneDrive\Desktop\chollones_app\api\config.php" "C:\xampp\htdocs\chollones-api\config.php"
copy /Y "c:\Users\franc\OneDrive\Desktop\chollones_app\api\historial.php" "C:\xampp\htdocs\chollones-api\historial.php"
copy /Y "c:\Users\franc\OneDrive\Desktop\chollones_app\api\carrito.php" "C:\xampp\htdocs\chollones-api\carrito.php"
copy /Y "c:\Users\franc\OneDrive\Desktop\chollones_app\api\procesar-pago.php" "C:\xampp\htdocs\chollones-api\procesar-pago.php"
copy /Y "c:\Users\franc\OneDrive\Desktop\chollones_app\api\auth.php" "C:\xampp\htdocs\chollones-api\auth.php"
copy /Y "c:\Users\franc\OneDrive\Desktop\chollones_app\api\chollos.php" "C:\xampp\htdocs\chollones-api\chollos.php"
copy /Y "c:\Users\franc\OneDrive\Desktop\chollones_app\api\cupones.php" "C:\xampp\htdocs\chollones-api\cupones.php"
copy /Y "c:\Users\franc\OneDrive\Desktop\chollones_app\api\favoritos.php" "C:\xampp\htdocs\chollones-api\favoritos.php"
copy /Y "c:\Users\franc\OneDrive\Desktop\chollones_app\api\perfil.php" "C:\xampp\htdocs\chollones-api\perfil.php"
copy /Y "c:\Users\franc\OneDrive\Desktop\chollones_app\api\categorias.php" "C:\xampp\htdocs\chollones-api\categorias.php"

echo.
echo ✓ Sincronización completada!
echo.
pause
