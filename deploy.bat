@echo off
setlocal enabledelayedexpansion
REM ============================================================
REM  Kas Tunai — deploy
REM
REM    deploy            tarik kode + unggah SAJA  (tanpa versi baru)
REM    deploy rilis      tarik kode + unggah + BUAT VERSI BARU
REM    deploy nopull     unggah saja, lewati git pull
REM    deploy rilis nopull
REM
REM  KENAPA VERSI DIPISAH — baca ini sebelum mengubahnya kembali:
REM    Apps Script membatasi 200 VERSI per proyek. Versi lama deploy.bat
REM    membuat versi baru SETIAP KALI dijalankan, jadi tiap percobaan kecil
REM    ikut membakar satu jatah -- dan batas itu tercapai 30 Jul 2026.
REM    Versi lama BISA dihapus (URL tidak berubah), tetapi itu pekerjaan
REM    manual yang tidak perlu ada kalau jatahnya tidak dibakar sia-sia.
REM
REM    Sekarang: saat mencoba-coba pakai "deploy" biasa lalu periksa lewat
REM    URL /dev (Deploy > Test deployments) yang selalu menjalankan kode
REM    terbaru. Buat versi HANYA saat perubahan itu memang mau dipakai staf.
REM ============================================================

SET DEPLOY_ID=AKfycbye24yskdQ-NvEpBLVfhATRxBzeE-Vq6VcDUlG_0n9EoN8P9vswtYSVApxJTvaLQgI
SET BRANCH=claude/determined-archimedes-od8jtc

REM --- baca argumen (boleh ditulis dalam urutan apa pun) ---
SET MODE=push
SET DOPULL=1
:bacaarg
if "%~1"=="" goto :selesaiarg
if /I "%~1"=="rilis"  SET MODE=rilis
if /I "%~1"=="nopull" SET DOPULL=0
shift
goto :bacaarg
:selesaiarg

if "%MODE%"=="rilis" (SET LANGKAH=3) else (SET LANGKAH=2)

REM --- pastikan dijalankan di folder repo ---
if not exist ".clasp.json" (
  echo [GAGAL] File .clasp.json tidak ada di folder ini.
  echo         Jalankan deploy.bat dari DALAM folder repo kas-tunai.
  echo         Contoh:  cd C:\Users\Daba\kas-tunai
  goto :akhir
)

REM --- 1) git pull ---
if "%DOPULL%"=="0" goto :lewatipull
echo(
echo === 1/%LANGKAH%  Menarik kode terbaru dari GitHub ===
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
echo === 2/%LANGKAH%  Mengunggah kode ke Apps Script ===
call clasp push --force
if errorlevel 1 goto :gagalclasp

if "%MODE%"=="rilis" goto :buatversi

echo(
echo ============================================================
echo  KODE SUDAH TERUNGGAH - tetapi BELUM dipakai staf.
echo(
echo  Web app masih menyajikan versi lama. Untuk memeriksa hasilnya
echo  sekarang juga, buka URL /dev:
echo    editor Apps Script -^> Deploy -^> Test deployments -^> salin URL
echo  URL itu SELALU menjalankan kode terbaru, tanpa membuat versi.
echo(
echo  Bila sudah yakin dan mau dipakai staf, jalankan:
echo      deploy rilis
echo ============================================================
goto :akhir

:buatversi
echo(
echo === 3/3  Membuat versi baru web app ===
if "%DEPLOY_ID%"=="GANTI_DENGAN_DEPLOYMENT_ID" (
  echo [LEWAT] DEPLOY_ID belum diisi. Jalankan: clasp deployments
  echo         lalu salin ID yang diawali AKfycb... ke dalam deploy.bat
  goto :akhir
)
for /f "tokens=1-4 delims=/ " %%a in ("%DATE%") do set TGL=%%a%%b%%c
call clasp deploy -i %DEPLOY_ID% -d "rilis %TGL% %TIME:~0,5%"
if errorlevel 1 goto :gagaldeploy

echo(
echo ============================================================
echo  SELESAI. Kode + versi baru sudah aktif untuk staf.
echo  Buka web app lalu tekan Ctrl+Shift+R (hard refresh).
echo  Di HP: tutup tab lalu buka ulang dari pintasan.
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
echo(
echo  Bila pesannya "Script has reached the limit of 200 versions":
echo    HAPUS sebagian versi lama, lalu jalankan  deploy rilis  lagi.
echo    URL web app TIDAK berubah, pintasan di HP staf tetap jalan.
echo    Jangan hapus versi yang sedang dipakai deployment aktif -
echo    lihat dulu di Deploy ^> Manage deployments.
echo    Panduan lengkap:  docs\BATAS-VERSI-APPS-SCRIPT.md
echo(
echo   Penyebab lain: DEPLOY_ID salah. Lihat daftarnya:  clasp deployments
echo   Kode tetap sudah terunggah; bisa juga buat versi manual lewat
echo   editor: Deploy ^> Manage deployments ^> Edit (pensil) ^> New version.
goto :akhir

:akhir
echo(
pause
