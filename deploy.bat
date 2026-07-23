@echo off
REM ============================================================
REM  Deploy Kas Tunai: push kode + buat VERSI BARU web app
REM  (URL web app TETAP, karena update deployment yang sama).
REM
REM  ISI SEKALI: ganti nilai DEPLOY_ID dengan ID deployment
REM  web app Anda. Cara mendapatkannya:
REM      clasp deployments
REM  lalu salin ID panjang (AKfycb...) milik deployment /exec
REM  yang Anda pakai (BUKAN yang @HEAD).
REM ============================================================
SET DEPLOY_ID=GANTI_DENGAN_DEPLOYMENT_ID

echo(
echo === 1/2  Mengunggah kode (clasp push) ===
call clasp push --force
if errorlevel 1 goto :gagal

echo(
echo === 2/2  Membuat versi baru deployment ===
if "%DEPLOY_ID%"=="GANTI_DENGAN_DEPLOYMENT_ID" (
  echo [LEWAT] DEPLOY_ID belum diisi. Edit deploy.bat dan isi ID-nya.
  echo         Sementara ini, buat versi baru manual: Deploy ^> Manage deployments ^> Edit ^> New version.
  goto :selesai
)
call clasp deploy -i %DEPLOY_ID% -d "update kas tunai"
if errorlevel 1 goto :gagal

:selesai
echo(
echo SELESAI. Buka web app lalu hard-refresh (Ctrl+Shift+R).
goto :eof

:gagal
echo(
echo GAGAL. Periksa pesan error di atas. Bila "invalid_grant" -^> jalankan: clasp login
