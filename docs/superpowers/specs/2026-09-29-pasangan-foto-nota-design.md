# Spesifikasi — Pasangan Nota ↔ Foto Barang (Desktop)

Tanggal: 29 Sep 2026 · Status: **DISETUJUI pengguna (arah)** — detail teknis di bawah
Keluhan pengguna: "ketika input nota sering tergabung dengan foto barang, pasangan
antara nota dan foto barang sering tidak sinkron" (desktop).

Prioritas: **dikerjakan sebelum** spesifikasi tanda terima
(`2026-09-29-tanda-terima-cetak-design.md`), karena setiap hari data baru ikut salah.

---

## 1. Akar masalah (hasil telaah kode, commit `7486fa5`)

| # | Temuan | Lokasi | Dampak |
|---|--------|--------|--------|
| P-1 | **Foto barang dikirim dengan `notaId` tetap = `1`**, apa pun nota yang sedang ditambah/diubah. | `index.html` `sendNota()` — dua panggilan `serverUploadFotoNota(_tok, _notaTarget, 1, …)` | **Penyebab utama.** Foto barang Nota 2, 3, … menumpuk di Nota 1. |
| P-2 | Unggahan foto *fire-and-forget*: tanpa `withSuccessHandler`/`withFailureHandler`, lalu `openModalNota()` langsung dipanggil. | `sendNota()` | Foto belum tampil saat modal dimuat ulang → pengguna mengunggah ulang (duplikat). Gagal unggah tidak pernah dilaporkan. |
| P-3 | Nomor nota baru = `jumlah nota AKTIF + 1`. | `KasTunai.gs` `tambahNota()` | Setelah satu nota dihapus, nota baru **memakai ulang nomor nota yang masih hidup** (3 nota, hapus #1 → nota baru = #3, kembar). Foto (`NOTA_ID`), rincian (`NOTA_URUTAN`), dan pajak (`_findNotaRow` ambil baris pertama) ikut tercampur. |
| P-4 | Nomor foto = `jumlah foto AKTIF + 1`. | `FotoNota.gs` `uploadFotoNota()` | Pola sama dengan P-3: hapus/ubah foto berdasarkan `(tx, nota, urutan)` bisa mengenai foto yang salah. |
| P-5 | Scan dari Folder Scan selalu ditempel ke **nota terakhir**. | `Code.gs` `serverKaitkanScan()` | Scan untuk nota lain salah pasang. |
| P-6 | Centang "Salin juga foto nota ini ke Bukti B". | `index.html:1036` | Foto nota bisa ikut masuk kelompok foto barang (yang dikeluhkan sebagai "tergabung"). |

HP (`mobile.html`) sudah mengirim nomor nota yang benar di jalur utamanya; P-3, P-4,
dan P-5 ada di server sehingga **ikut diperbaiki untuk HP**.

---

## 2. Tujuan

1. Foto barang **selalu** menempel pada nota yang sedang dikerjakan.
2. Nomor nota dan nomor foto **tidak pernah dipakai ulang** dalam satu transaksi.
3. Pengguna **melihat** pasangan nota ↔ foto dan bisa **memindahkan** foto yang salah
   pasang — termasuk data lama.
4. Setiap unggah memberi hasil yang jelas: berhasil (jumlah foto) atau gagal (bisa dicoba lagi).

---

## 3. Rancangan

### 3.1 Server — satu endpoint simpan nota + foto (P-1, P-2)

`serverSimpanNotaLengkap(token, no, urutanEdit, notaData, fotoBarang)`
→ `{ urutan, jmlFotoBarang }`

- Tambah atau ubah nota, **lalu** unggah `fotoBarang` ke `(no, urutan hasil simpan)`
  dalam satu request. Nomor nota yang dipakai foto berasal dari hasil simpan, bukan
  dari klien — P-1 tidak bisa terulang.
- Urutan kerja: simpan nota → unggah foto satu per satu. Bila satu foto gagal,
  nota tetap tersimpan dan jawaban memuat `gagal: [indeks]`, supaya klien
  menawarkan "Coba unggah lagi" hanya untuk foto yang gagal (tanpa menggandakan nota).
- `serverTambahNota` / `serverUpdateNota` lama **tetap ada** (dipakai HP dan layar lain);
  desktop `sendNota()` dialihkan ke endpoint baru.
- Batas ukuran: foto sudah dikompres (maks. 1280px). Bila jumlah foto > 6, klien
  membaginya: panggilan pertama = nota + 6 foto, sisanya lewat `serverUploadFotoNota`
  dengan nomor nota dari jawaban pertama.

### 3.2 Server — nomor tidak dipakai ulang (P-3, P-4)

- `tambahNota`: `urutan = MAX(URUTAN semua baris transaksi itu, TERMASUK yang terhapus) + 1`.
- `uploadFotoNota`: `urutan = MAX(URUTAN semua foto nota itu, termasuk terhapus) + 1`.
- Data lama **tidak diubah nomornya**. Untuk kembar yang sudah terlanjur ada, lihat 3.5.

### 3.3 Server — scan ke nota yang dipilih (P-5)

`serverKaitkanScan(token, fileId, no, keterangan, notaId)` — parameter `notaId` baru.
Kosong → perilaku lama (nota terakhir) supaya pemanggil lama tetap jalan; desktop
mengirim nota yang dipilih pengguna.

### 3.4 Desktop — modal nota berkartu (P-1, P-2, P-6)

- Daftar nota di modal ditampilkan **satu kartu per nota**:
  `Penyedia · nilai · tanggal` — di bawahnya dua lajur berdampingan:
  **Bukti A (nota)** dan **Bukti B (barang)**, masing-masing ubin foto + ubin "+ Tambah".
- Ubin "+ Tambah" di kartu mengunggah **langsung ke nota kartu itu** (nomor nota
  melekat pada tombol, bukan variabel global).
- Setiap ubin foto Bukti B punya menu kecil: **Lihat · Pindahkan ke nota… · Hapus**.
- Form tambah/ubah nota tetap ada; foto barang yang dipilih di form dikirim lewat
  endpoint 3.1. Selama proses: tombol Simpan non-aktif + teks "Menyimpan nota dan
  N foto…". Hasil: toast "Nota tersimpan · N foto barang terunggah" atau
  "Nota tersimpan, 2 foto gagal diunggah — [Coba lagi]".
- Centang "Salin juga foto nota ini ke Bukti B" **dihapus** (P-6).
- `openModalNota()` dipanggil **setelah** jawaban server diterima, bukan sebelum.

### 3.5 Merapikan data lama — "Pindahkan ke nota…"

- Endpoint `serverPindahFotoNota(token, no, notaAsal, urutanFoto, notaTujuan)`:
  soft-delete baris lama + tulis baris baru di nota tujuan dengan `FILE_ID` yang sama
  (berkas Drive **tidak** diunggah ulang dan **tidak** dibuang). Tercatat di `AuditLog`
  (`PINDAH_FOTO_NOTA`, `no#asal#urutan → #tujuan`).
- Hanya dalam **satu transaksi**. Memindah antar-transaksi di luar cakupan.
- Fungsi pemeriksa `cekPasanganNota_()` dijalankan manual di editor Apps Script —
  **baca-saja**, mencatat ke log:
  - transaksi yang punya **nomor nota kembar** aktif (akibat P-3);
  - transaksi yang punya foto Bukti B di Nota 1 padahal notanya lebih dari satu
    (kandidat akibat P-1);
  - foto yang `NOTA_ID`-nya tidak cocok dengan nota aktif mana pun (yatim).
  Hasilnya jadi daftar kerja pengguna untuk dirapikan lewat "Pindahkan ke nota…".
  **Tidak ada perbaikan otomatis** — aplikasi tidak bisa tahu foto mana milik nota mana.

---

## 4. Verifikasi

1. Fungsi hitung nomor (MAX termasuk terhapus) dibuat murni dan diuji lewat
   `ujiNomorNota_()` di editor: kasus hapus-tengah, hapus-akhir, pulihkan nota.
2. Uji nyata di URL `/dev` (setelah `deploy.bat`, tanpa `rilis`), lewat **klik nyata**:
   - transaksi 3 nota, tambah foto barang ke Nota 2 dari kartu → muncul di Nota 2 saja;
   - form nota baru + 3 foto barang → tersimpan di nota baru, toast menyebut 3 foto;
   - hapus Nota 1, tambah nota baru → nomornya tidak kembar;
   - pindahkan satu foto dari Nota 1 ke Nota 3 → pindah, berkas Drive sama, AuditLog tercatat;
   - putus jaringan saat unggah (DevTools offline) → pesan gagal + tombol Coba lagi,
     nota tidak tergandakan;
   - buka transaksi yang sama di HP → pasangan foto sama dengan desktop.
3. Jalankan `cekPasanganNota_()` pada data asli → serahkan daftarnya ke pengguna.
4. `deploy.bat rilis` setelah poin 2 lolos.

---

## 5. Urutan kerja (satu commit per langkah, konfirmasi LANJUT per tahap)

**Tahap 1 — server**
1. Nomor nota & foto tidak dipakai ulang + `ujiNomorNota_()`.
2. `serverSimpanNotaLengkap`.
3. `serverPindahFotoNota` + `serverKaitkanScan` ber-`notaId`.
4. `cekPasanganNota_()` (baca-saja).

**Tahap 2 — desktop**
5. `sendNota()` pakai endpoint baru, tunggu hasil, hapus centang salin-ke-Bukti-B.
6. Modal nota berkartu + ubin tambah per nota.
7. Menu "Pindahkan ke nota…".

**Tahap 3 — uji & rilis**
8. Uji nyata (bagian 4), perbarui `docs/HANDOFF-DESKTOP.md`, jalankan
   `cekPasanganNota_()`, lalu `deploy.bat rilis`.

## 6. Di luar cakupan

- Lampiran PDF dan "link laporan" — menunggu penjelasan pengguna.
- Sheet lama `Foto Barang` (per transaksi, tanpa nota) — tidak diubah; tetap terbaca
  seperti sekarang.
- Memindah foto antar-transaksi.
