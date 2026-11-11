@echo off
chcp 65001 >nul
rem 在 Windows 本機打包 debug APK（需先安裝 Node.js 22+ 與 Android Studio）
call npm install || goto :err
call npm run build || goto :err
call npx cap sync android || goto :err
cd android
call gradlew.bat assembleDebug || goto :err
cd ..
echo.
echo 完成！APK 位置：android\app\build\outputs\apk\debug\app-debug.apk
pause
exit /b 0
:err
echo.
echo 打包失敗，請看上面的錯誤訊息。
pause
exit /b 1
