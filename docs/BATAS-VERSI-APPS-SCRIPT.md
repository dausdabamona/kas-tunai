# Batas 200 versi Apps Script

Dipakai saat muncul galat **"Script has reached the limit of 200 versions"** pada
langkah 3 `deploy.bat`.

Artinya: **kode sudah terunggah, tetapi belum disajikan ke staf.** Web app masih
menunjuk versi lama sampai versi baru berhasil dibuat.

## Jalan keluar: hapus versi lama

Apps Script membatasi 200 versi per proyek, tetapi **versi lama bisa dihapus** —
dikonfirmasi pengguna 30 Jul 2026. Hapus sebagian versi lama, lalu `deploy rilis`
seperti biasa.

**URL web app tidak berubah**, jadi pintasan di HP staf tetap berfungsi dan tidak ada
yang perlu diganti.

> Catatan koreksi: dokumen ini sempat menyatakan versi tidak bisa dihapus dan
> menyarankan menyalin proyek. Itu **keliru**. Menyalin proyek mengubah URL dan
> memaksa semua pintasan staf diganti — jangan lakukan itu kecuali penghapusan versi
> benar-benar tidak bisa dilakukan.

### Versi mana yang aman dihapus

- **Jangan hapus** versi yang sedang dipakai deployment aktif. Lihat dulu versi berapa
  yang aktif: **Deploy → Manage deployments**, perhatikan nomor versi di deployment
  web app.
- Sisakan beberapa versi terakhir sebagai jalan mundur bila rilis baru bermasalah.
  Menyisakan 10–20 versi terakhir sudah lebih dari cukup.
- Sisanya (versi lama berbulan-bulan) aman dihapus.

### Setelah menghapus

```bat
deploy rilis
```

Lalu buka web app, tekan `Ctrl+Shift+R`. Di HP: tutup tab, buka ulang dari pintasan.

## Supaya tidak terulang

`deploy.bat` sudah diubah supaya **versi hanya dibuat oleh `deploy rilis`**:

| Perintah | Efek |
|---|---|
| `deploy` | unggah kode saja — **staf belum melihat perubahan** |
| `deploy rilis` | unggah + versi baru — **staf melihat perubahan** |

Saat mencoba-coba, pakai `deploy` biasa lalu periksa lewat URL `/dev`
(**Deploy → Test deployments**) yang selalu menjalankan kode terbaru tanpa membuat versi.
Hanya pemilik/editor skrip yang bisa membuka URL `/dev`.

Penyebab batas ini tercapai: `deploy.bat` versi lama membuat versi **setiap kali**
dijalankan, termasuk saat sekadar mencoba perubahan kecil. Dengan pemisahan ini, 200
versi akan bertahan bertahun-tahun.

## Bila suatu saat penghapusan tidak mungkin

Baru pertimbangkan menyalin proyek — dan sadari konsekuensinya:

1. Editor Apps Script → menu titik tiga → **Make a copy**
2. Di salinan: **Deploy → New deployment → Web app**, `Execute as: Me`,
   **`Who has access: Anyone`** (BUKAN "Anyone with a Google Account" — itu
   menghalangi staf yang memakai Gmail pribadi)
3. Perbarui `scriptId` di `.clasp.json` dan `DEPLOY_ID` di `deploy.bat`, lalu commit
4. **URL berubah** → pintasan di layar utama tiap HP staf harus diganti satu per satu
5. Arsipkan deployment proyek lama supaya tidak ada yang memakai URL lama

Data tetap aman dalam skenario ini: spreadsheet ditunjuk lewat `SPREADSHEET_ID` di
`_Config.gs`, bukan lewat kepemilikan proyek.
