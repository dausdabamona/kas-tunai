@echo off
setlocal enabledelayedexpansion
REM ============================================================
REM  Kas Tunai — deploy sekali klik
REM    1) tarik kode terbaru dari GitHub (git pull)
REM    2) unggah ke Apps Script (clasp push --force)
REM    3) buat VERSI BARU pada deployment web app yang sama
REM       -> URL web app TIDAK berubah
REM
REM  Cara pakai:  deploy.bat            (pull + push + versi baru)
REM               deploy.bat nopull     (lewati git pull)
REM
REM  Diuji dengan clasp 3.3.0:
REM    clasp push -f
REM    clasp deploy -i <deploymentId> -d "<deskripsi>"
REM ============================================================

SET DEPLOY_ID=AKfycbye24yskdQ-NvEpBLVfhATRxBzeE-Vq6VcDUlG_0n9EoN8P9vswtYSVApxJTvaLQgI
SET BRANCH=claude/determined-archimedes-od8jtc

REM --- pastikan dijalankan di folder repo ---
if not exist ".clasp.json" (
  echo [GAGAL] File .clasp.json tidak ada di folder ini.
  echo         Jalankan deploy.bat dari DALAM folder repo kas-tunai.
  echo         Contoh:  cd C:\Users\Daba\kas-tunai
  goto :akhir
)

REM --- 1) git pull ---
if /I "%~1"=="nopull" goto :lewatipull
echo(
echo === 1/3  Menarik kode terbaru dari GitHub ===
git pull origin %BRANCH%
if errorlevel 1 (
  echo [PERINGATAN] git pull gagal / dilewati. Lanjut memakai kode lokal.
)
:lewatipull

REM --- 1b) periksa hak akses web app di appsscript.json ---
REM  ANYONE_ANONYMOUS = "Siapa saja" (tanpa login Google).
REM  ANYONE (tanpa _ANONYMOUS) = "Siapa saja yang memiliki Akun Google" —
REM  itu menghalangi staf yang memakai Gmail pribadi di luar domain satker.
findstr /C:"ANYONE_ANONYMOUS" appsscript.json >nul
if errorlevel 1 (
  echo(
  echo [PERINGATAN] appsscript.json belum memakai "access": "ANYONE_ANONYMOUS".
  echo              Web app akan tetap meminta Akun Google.
  echo              Perbaiki dulu baris "access" di appsscript.json.
  echo(
  choice /C YT /N /M "Lanjutkan juga? (Y=ya, T=tidak) "
  if errorlevel 2 goto :akhir
)

REM --- 2) clasp push ---
echo(
echo === 2/3  Mengunggah kode ke Apps Script ===
call clasp push --force
if errorlevel 1 goto :gagalclasp

REM --- 3) versi baru deployment ---
echo(
echo === 3/3  Membuat versi baru web app ===
if "%DEPLOY_ID%"=="GANTI_DENGAN_DEPLOYMENT_ID" (
  echo [LEWAT] DEPLOY_ID belum diisi. Jalankan: clasp deployments
  echo         lalu salin ID yang diawali AKfycb... ke dalam deploy.bat
  goto :akhir
)
for /f "tokens=1-4 delims=/ " %%a in ("%DATE%") do set TGL=%%a%%b%%c
call clasp deploy -i %DEPLOY_ID% -d "update %TGL% %TIME:~0,5%"
if errorlevel 1 goto :gagaldeploy

echo(
echo ============================================================
echo  SELESAI. Kode + versi baru sudah aktif.
echo  Buka web app lalu tekan Ctrl+Shift+R (hard refresh).
echo  Tip: ketik  clasp open-web-app  untuk membukanya langsung.
echo ============================================================
echo(
echo  PERIKSA HAK AKSES - sekali saja, tidak perlu diulang tiap deploy:
echo    Apps Script mengunci pengaturan "Who has access" pada deployment
echo    yang sudah ada, jadi mengubah appsscript.json belum tentu cukup.
echo    Buka editor -^> Deploy -^> Manage deployments -^> ikon pensil,
echo    lalu setel "Who has access" ke  Anyone  - BUKAN "Anyone with a
echo    Google Account" - kemudian tekan Deploy.
echo    Uji: buka URL web app di jendela penyamaran. Bila TIDAK diminta
echo    memilih Akun Google, pengaturannya sudah benar.
echo ============================================================
goto :akhir

:gagalclasp
echo(
echo [GAGAL] clasp push bermasalah.
echo   - Bila tertulis "invalid_grant" atau diminta login:  clasp login
echo   - Bila "command not found": pasang clasp -^> npm install -g @google/clasp
goto :akhir

:gagaldeploy
echo(
echo [GAGAL] Pembuatan versi baru bermasalah.
echo   - Pastikan DEPLOY_ID benar. Lihat daftarnya:  clasp deployments
echo   - Kode tetap sudah terunggah; Anda bisa buat versi baru manual lewat
echo     editor: Deploy ^> Manage deployments ^> Edit (pensil) ^> New version.
goto :akhir

:akhir
echo(
pause
