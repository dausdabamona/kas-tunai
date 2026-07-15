# Setup clasp di Windows — dari Nol

Panduan ini untuk Anda yang **belum meng-install apa pun**. Setelah selesai,
Anda cukup mengetik `clasp push --force` setiap kali ingin meng-upload perubahan
kode ke Google Apps Script (GAS).

> **Kabar baik:** semua konfigurasi di dalam repo ini **sudah lengkap**
> (`.clasp.json`, `.claspignore`, `appsscript.json`). Anda **tidak perlu**
> menjalankan `clasp create` atau memasukkan Script ID secara manual — Script ID
> sudah tersimpan di `.clasp.json`. Yang perlu Anda lakukan hanya menyiapkan
> perkakas di komputer, lalu `push`.

---

## Langkah 1 — Install Node.js (sekali saja)

clasp berjalan di atas Node.js.

1. Buka <https://nodejs.org> dan unduh versi **LTS** untuk Windows (file `.msi`).
2. Jalankan installer. Klik **Next** terus sampai selesai. Pastikan opsi
   **"Add to PATH"** tercentang (biasanya default sudah tercentang).
3. Buka **PowerShell** (klik Start → ketik `powershell` → Enter) dan verifikasi:

   ```powershell
   node -v
   npm -v
   ```

   Jika muncul nomor versi (mis. `v20.11.0`), berarti Node.js sudah terpasang.

> Jika `node -v` tidak dikenali, **tutup PowerShell lalu buka lagi** (PATH baru
> ter-load setelah jendela baru). Kalau masih gagal, restart komputer.

---

## Langkah 2 — Install clasp (sekali saja)

Di PowerShell:

```powershell
npm install -g @google/clasp
```

Verifikasi:

```powershell
clasp -v
```

Muncul nomor versi = berhasil.

---

## Langkah 3 — Aktifkan Google Apps Script API (sekali saja)

1. Buka <https://script.google.com/home/usersettings>.
2. Nyalakan toggle **"Google Apps Script API"** menjadi **ON**.

Tanpa langkah ini, `clasp push` akan gagal dengan pesan
*"User has not enabled the Apps Script API"*.

---

## Langkah 4 — Login (sekali saja)

```powershell
clasp login
```

Browser akan terbuka. **Pilih akun Google yang memiliki project ini**
(akun yang sama dengan pemilik spreadsheet & Apps Script). Setelah muncul
tulisan sukses di browser, kembali ke PowerShell — sudah login.

> Kredensial tersimpan di komputer Anda, jadi langkah ini tidak perlu diulang
> setiap kali.

---

## Langkah 5 — Masuk ke folder repo

`clasp push` harus dijalankan **dari dalam folder yang berisi `.clasp.json`**
(folder repo ini).

**Jika repo sudah ada di komputer:** buka File Explorer, masuk ke folder repo,
lalu **Shift + klik kanan** di area kosong → **"Open PowerShell window here"**.

**Jika belum ada** (dan Anda punya Git), clone dulu:

```powershell
git clone <URL-repo-Anda>
cd kas-tunai
```

Pastikan Anda di folder yang benar — cek dengan:

```powershell
dir .clasp.json
```

Kalau file itu muncul, Anda sudah di tempat yang tepat.

---

## Langkah 6 — Push kode ke Apps Script

```powershell
clasp push --force
```

- `--force` artinya "timpa file di project dengan versi lokal" — memang itu yang
  kita mau saat meng-upload perubahan.
- Urutan muat file sudah diatur otomatis lewat `filePushOrder` di `.clasp.json`
  (`_Config.gs` dimuat lebih dulu).
- Folder `docs/` (termasuk file panduan ini) **otomatis dilewati** — tidak ikut
  ter-upload ke GAS, karena diatur di `.claspignore`.

Selesai! Kode Anda sudah masuk ke Apps Script.

---

## Langkah 7 — Melihat hasil di web app

Setelah `push`, buka editor untuk memeriksa:

```powershell
clasp open
```

### Agar perubahan muncul di URL web app yang sudah ada

`clasp push` hanya meng-update **kode**. Agar URL web app yang selama ini Anda
pakai menampilkan versi terbaru **tanpa berganti URL**, update deployment-nya:

1. Di editor Apps Script (`clasp open`), klik **Deploy** → **Manage deployments**.
2. Pada deployment web app yang aktif, klik ikon **pensil (Edit)**.
3. Di kolom **Version**, pilih **New version**, lalu **Deploy**.
4. Buka URL web app dan lakukan **hard refresh** (`Ctrl + Shift + R`).

> Kalau Anda membuat deployment **baru** (bukan edit yang lama), URL-nya akan
> berbeda. Untuk mempertahankan URL lama, selalu pakai **Edit** pada deployment
> yang sudah ada.

---

## Ringkasan perintah harian

Setelah semua terpasang, alur sehari-hari cukup:

```powershell
clasp push --force      # upload perubahan kode
# lalu (jika perlu tampil di web app): Deploy → Manage deployments → Edit → New version
```

---

## Troubleshooting (Windows)

| Gejala | Solusi |
|--------|--------|
| `node`/`clasp` : *is not recognized* | Tutup lalu buka lagi PowerShell. Masih gagal → restart komputer. |
| `clasp : cannot be loaded because running scripts is disabled` | Jalankan sekali: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` (jawab `Y`). |
| *User has not enabled the Apps Script API* | Ulangi **Langkah 3**, tunggu ~1 menit, coba lagi. |
| Salah akun Google | `clasp logout` lalu `clasp login` ulang, pilih akun yang benar. |
| *Could not read API credentials* / diminta login terus | `clasp login` ulang. |
| Error Script ID / project tidak ditemukan | Pastikan Anda berada di folder repo (`dir .clasp.json` harus muncul). |
| `clasp push` menimpa perubahan yang saya buat di editor online | Tarik dulu: `clasp pull` (lihat catatan di bawah). |

> **Catatan `clasp pull`:** jika Anda pernah mengedit kode langsung di editor
> Apps Script online, `clasp push --force` akan **menimpanya**. Untuk menarik
> versi online ke lokal terlebih dulu, jalankan `clasp pull`. Sebaiknya edit
> hanya di satu tempat (lokal) agar tidak bentrok.
