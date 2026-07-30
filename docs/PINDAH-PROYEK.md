# Pindah ke proyek Apps Script baru

Dipakai saat muncul galat **"Script has reached the limit of 200 versions"**.

## Kenapa ini terjadi

Apps Script membatasi **200 versi per proyek**. Versi **tidak bisa dihapus** lewat
editor baru maupun Apps Script API — menu "Manage Versions" yang dulu bisa menghapus
ada di editor lama yang sudah dipensiunkan. Pesan galat Google menyarankan menghapus
versi; saran itu peninggalan editor lama dan **tidak bisa dijalankan**.

Batas ini tercapai **30 Juli 2026** karena `deploy.bat` versi lama membuat versi baru
setiap kali dijalankan — termasuk saat sekadar mencoba perubahan kecil. `deploy.bat`
sudah diubah: **versi hanya dibuat oleh `deploy rilis`**, sehingga percobaan sehari-hari
tidak lagi membakar jatah.

## Yang berubah dan yang tidak

| | |
|---|---|
| **BERUBAH** | URL web app, Script ID, Deployment ID |
| **TIDAK berubah** | Spreadsheet data, folder Drive, seluruh transaksi, nota, foto |

Data aman: spreadsheet ditunjuk lewat `SPREADSHEET_ID` di `_Config.gs`, bukan lewat
kepemilikan proyek. Proyek baru membaca spreadsheet yang sama persis.

## Langkah

### 1. Salin proyek

1. Buka editor: `clasp open`
2. Menu **titik tiga** di kanan atas → **Make a copy**
3. Beri nama, mis. `Kas Tunai (2026-07)`

### 2. Buat deployment web app di proyek salinan

**Deploy → New deployment → pilih jenis Web app**

- **Execute as:** `Me`
- **Who has access:** **`Anyone`**

> **`Anyone`, BUKAN `Anyone with a Google Account`.** Yang kedua berarti "siapa saja
> yang punya Akun Google" dan akan menghalangi staf yang memakai Gmail pribadi di luar
> domain satker. Ini kesalahan yang paling sering terjadi dan gejalanya membingungkan:
> staf melihat halaman pilih-akun, bukan aplikasinya.

Salin **Deployment ID** (diawali `AKfycb…`) dan **URL web app** yang muncul.

### 3. Perbarui berkas di repo

**`.clasp.json`** — ganti `scriptId` dengan Script ID proyek baru. Script ID ada di URL
editor: `https://script.google.com/…/projects/<SCRIPT_ID>/edit`

```json
{ "scriptId": "<SCRIPT_ID_BARU>", "rootDir": ".", "filePushOrder": [ ... ] }
```

> `filePushOrder` **jangan diubah**. Urutannya menentukan `_Config.gs` dievaluasi lebih
> dulu; mengacaknya membuat aplikasi gagal tanpa pesan yang jelas.

**`deploy.bat`** — ganti baris `SET DEPLOY_ID=` dengan Deployment ID baru.

Commit keduanya supaya sesi berikutnya tidak memakai ID lama.

### 4. Unggah dan rilis

```bat
deploy rilis
```

### 5. Uji sebelum memberi tahu staf

1. Buka URL web app baru di **jendela penyamaran** — kalau diminta memilih Akun Google,
   pengaturan akses masih salah, ulangi langkah 2.
2. Masuk, buka satu transaksi, pastikan datanya muncul (bukti spreadsheet tersambung).
3. Buka dari HP, pastikan layar mobile jalan.

### 6. Ganti pintasan di HP staf

Ini bagian yang paling merepotkan dan **tidak bisa diotomatiskan**: tiap HP menyimpan
pintasan ke URL lama di layar utama.

Untuk tiap staf: buka URL baru di Chrome → menu titik tiga → **Tambahkan ke layar
utama** → hapus pintasan lama.

Kirimkan URL barunya lewat WhatsApp supaya bisa langsung diketuk, jangan diketik manual
— URL Apps Script panjang dan mudah salah ketik.

### 7. Jangan hapus proyek lama

Biarkan ada, tapi **hapus deployment-nya** (Deploy → Manage deployments → Archive) agar
tidak ada yang tanpa sengaja memakai URL lama dan mengira aplikasinya rusak. Proyek
lamanya sendiri simpan saja sebagai cadangan.

## Setelah pindah — cara kerja baru

| Perintah | Efek |
|---|---|
| `deploy` | unggah kode saja, **staf belum melihat perubahan** |
| `deploy rilis` | unggah + versi baru, **staf melihat perubahan** |

Saat mencoba-coba, pakai `deploy` lalu periksa lewat URL `/dev`
(**Deploy → Test deployments**) yang selalu menjalankan kode terbaru tanpa membuat versi.
Hanya Anda yang bisa membuka URL `/dev` — ia butuh hak edit skrip.

Dengan cara ini 200 versi akan bertahan bertahun-tahun, bukan berbulan.
