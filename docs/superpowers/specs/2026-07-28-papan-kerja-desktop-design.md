# Desain: Layar Papan Kerja (Dashboard) — Desktop

> **Revisi 28 Jul 2026 (v2).** Spec ini ditulis lebih dulu berdasarkan ringkasan desain
> v1. Paket desain v2 (`docs/HANDOFF-DESKTOP.md` bagian 3b.1) kemudian memberi susunan
> layar yang **berbeda**. Karena layar ini belum pernah diimplementasikan (tidak ada
> plan/kode yang menggantung padanya), spec disesuaikan mengikuti v2 — atas persetujuan
> pengguna. Yang **dipertahankan** dari versi sebelumnya: keputusan arsitektur yang tidak
> disentuh v2 (satu endpoint agregasi, kriteria dihitung di klien, arti "antrean unggah",
> modul `AntreanStatus`). Yang **diganti**: isi 4 kartu statistik, panel serapan, dan
> susunan panel kanan. Ringkas perbedaannya ada di bagian 0.

## Konteks

Tugas **urutan-11** di `docs/HANDOFF-DESKTOP.md` (nomor tugas asli: 2) — paling akhir
dalam urutan rev-2/v2, karena tergolong kosmetik dan diblokir verifikasi rail-nav
(urutan-1). Spec ini disiapkan lebih dulu supaya siap dieksekusi saat gilirannya tiba;
**jangan mulai implementasi sebelum urutan-1 diverifikasi manual di browser sungguhan.**

Rail-nav (urutan-1, kode selesai `f89dd42`) sekarang punya 6 menu — "Papan kerja"
**sengaja belum ada** di rail itu. Tugas ini membangun layar itu dan menambahkannya
sebagai menu rail **pertama**.

Desain sumber: `docs/HANDOFF-DESKTOP.md` bagian **3b.1** (paket v2). Detail token/ukuran
di bagian 6 dokumen yang sama; perilaku responsif (kartu 2×2 di bawah 1440px, dst.) di
tabel kerapatan bagian 3.

## 0. Yang berubah dari spec versi pertama

| Bagian | Versi pertama | v2 (berlaku sekarang) | Kenapa |
|---|---|---|---|
| Kartu statistik #3 | Serapan Anggaran (%) | **Belum di-SPBY** | v2 memindahkan angka serapan ke panel "Sisa pagu paling tipis" yang lebih bisa ditindaklanjuti; kartu diisi hal yang butuh tindakan hari itu. |
| Kartu statistik #4 | Jumlah item "menunggu tindakan" | **Pajak belum disetor** | Angka "menunggu tindakan" sudah terlihat sebagai panjang daftar tepat di bawahnya — kartu yang mengulanginya mubazir. Pajak belum setor punya tenggat nyata. |
| Panel serapan | "Bar serapan 5 akun tertinggi", ambang magenta >80% | **"Sisa pagu paling tipis"**, tabel `1fr 120px`, bar 54×7px, ambang magenta **>90%**, baris >90% berlatar `--color-accent-2-100` | v2 membingkainya sebagai peringatan pembebanan ("tempat pembebanan berikutnya paling mudah melampaui pagu"), bukan laporan serapan. Ambang naik supaya yang tersorot benar-benar sedikit dan dibaca. |
| Panel kanan | antrean · kotak masuk scan · catatan batas setor pajak | antrean · kotak masuk scan · **Kartu ketenangan** (ringkasan rekonsiliasi) | Batas setor pajak naik jadi kartu statistik; slot ketiga diisi ringkasan rekon supaya bendahara tahu kondisi pencocokan tanpa membuka layar Rekonsiliasi. |
| `Anggaran.ringkasSerapan()` | mengembalikan `{top5, persenTotal}` | mengembalikan `{top5}` saja, tiap entri **ditambah `sisa`** | `persenTotal` tadinya hanya dipakai kartu "Serapan Anggaran" yang sudah dihapus — tidak ada konsumen lagi (YAGNI). Panel baru butuh nilai sisa rupiah, bukan cuma persen. |

## Keputusan yang sudah disetujui pengguna (28 Jul 2026, **tetap berlaku**)

| Topik | Keputusan |
|---|---|
| Kriteria "Menunggu tindakan Anda" | Gabungan 4 kategori: transaksi belum SPBY, PUM belum dipertanggungjawabkan, pajak belum diisi/belum disetor, rekonsiliasi ada selisih (`NILAI_BEDA`). |
| Arti "antrean unggah" | Ringkasan **draft offline dari HP staf** (antrean lokal mobile) — BUKAN konsep lain. Karena murni lokal di tiap HP (tidak ada catatannya di server sama sekali), `mobile.html` mendapat tambahan kecil: melaporkan jumlah draft ke server setiap kali online. **Ini menyentuh `mobile.html` juga, bukan cuma `index.html`** — dicatat di `docs/HANDOFF-MOBILE.md` juga saat diimplementasikan. |
| Pendekatan pengambilan data | Satu endpoint baru `serverGetPapanKerja` (round-trip tunggal), meniru pola `serverGetDashboard` yang sudah ada — bukan 4-5 panggilan terpisah per komponen. |
| Tempat hitung kriteria "menunggu tindakan" | **Client-side di `index.html`**, meniru pola `mobile.html` — bukan logika baru di `.gs`. Endpoint mengirim data transaksi mentah (field yang sudah ada: `kredit`, `noSpby`, `pajakKatIdx`, `refTransfer`, `statusRekon`, `notaTotal`, `kembalianTotal`, `uangDiserahkan`), `index.html` menyaring sendiri dengan salinan kecil fungsi yang sama seperti `mobile.html`. Dua salinan kecil yang dijaga tetap sama secara manual; `docs/HANDOFF-MOBILE.md` bagian 2 tetap satu-satunya rujukan rumus. |

## Bagian 1 — Backend

### 1a. Endpoint agregasi `serverGetPapanKerja`

`Code.gs`, dekat `serverGetDashboard` (pola sama — `_run(token, function(auth){...})`):

```js
function serverGetPapanKerja(token) {
  return _run(token, function (auth) {
    var role = auth.role;
    var full = (role === 'admin' || role === 'full');
    var tx = KasTunai.getTransaksi();
    if (!full) { for (var i = 0; i < tx.length; i++) { delete tx[i].saldo; } }
    return {
      transaksi: tx,
      saldo: full ? KasTunai.ringkasanSaldo() : null,
      role: role,
      isAdmin: (role === 'admin'),
      serapan: Anggaran.ringkasSerapan(),
      scanTerbaru: ScanInbox.list(3),
      batasSetorTanggal: CONFIG.BATAS_SETOR_TANGGAL,
      rekon: Rekonsiliasi.ringkasan(''),
      antreanSemua: AntreanStatus.getSemua()
    };
  });
}
```

Field `transaksi`/`saldo`/`role`/`isAdmin`/`batasSetorTanggal` sengaja bernama dan
berperilaku identik dengan `serverGetDashboard` (termasuk redaksi `saldo` untuk role
bukan admin/full) — `index.html` memakai ulang pola pembacaan yang sama.

`rekon` memanggil `Rekonsiliasi.ringkasan('')` **langsung** (fungsi modul, bukan lewat
endpoint `serverRingkasanRekon` — endpoint tidak boleh memanggil endpoint). Bentuk yang
dikembalikan sudah ada dan tidak diubah: `{saldo:{tunai,bank,total}, counts:{cocok,belum,nilaiBeda,nonRekon}, lastImport, nilaiBeda[]}`
(`Rekonsiliasi.gs:233`). Argumen `''` = semua periode.

`ScanInbox.list(3)` — v2 menetapkan kotak masuk scan menampilkan **3 baris**, jadi ambil
3, bukan 10 lalu dipotong di klien.

### 1b. Agregasi serapan per akun — `Anggaran.gs`

Fungsi baru `ringkasSerapan()`, memakai ulang `ketersediaan()` yang sudah ada (bukan
menghitung ulang dari sheet):

```js
function ringkasSerapan() {
  var data = ketersediaan();  // sudah ada -- { items, total, belanjaTanpaItem, periode }
  var perAkun = {}, i;
  for (i = 0; i < data.items.length; i++) {
    var it = data.items[i];
    var a = perAkun[it.akun] || { akun: it.akun, uraian: it.uraianAkun || '', pagu: 0, realisasiSakti: 0, belanjaKas: 0 };
    a.pagu += it.pagu; a.realisasiSakti += it.realisasiSakti; a.belanjaKas += it.belanjaKas;
    perAkun[it.akun] = a;
  }
  var out = [];
  for (var k in perAkun) {
    var a = perAkun[k];
    // MAX, bukan penjumlahan: belanja kas tunai yang belum masuk SAKTI tetap
    // dihitung mengurangi pagu -- supaya pagu tidak terlihat aman padahal sudah lewat.
    var pakai = Math.max(a.realisasiSakti, a.belanjaKas);
    a.persen = a.pagu > 0 ? (pakai / a.pagu) : 0;
    a.sisa = a.pagu - pakai;
    out.push(a);
  }
  out.sort(function (x, y) { return y.persen - x.persen; });
  return { top5: out.slice(0, 5) };
}
```

Tambahkan `ringkasSerapan: ringkasSerapan` ke `return {...}` modul `Anggaran.gs`.

**Catatan desain**: prinsip `MAX(realisasiSakti, belanjaKas)` sama dengan rumus
`sisaTersedia`/`serapan` di `docs/HANDOFF-DESKTOP.md` bagian 4 — walau fungsi ini bekerja
pada sistem pagu **lama** (`PAGU_POK` belum dibangun, itu tugas urutan-5), prinsipnya
tetap satu. Saat sistem pagu baru menggantikan yang lama (urutan-6), fungsi ini ikut
dialihkan, jangan dibiarkan membaca sumber yang sudah diarsipkan.

`uraian` diambil dari `it.uraianAkun` — field itu **sudah ada** di tiap item yang
dikembalikan `getPagu()`/`ketersediaan()` (`Anggaran.gs:94`), jadi tidak perlu lookup
tambahan ke sheet.

### 1c. Status antrean lintas HP — modul baru `AntreanStatus`

Tidak pakai sheet baru — status ini murni sementara, jadi cukup `AppCache` (sudah ada,
`SheetRepository.gs`). File **baru** `AntreanStatus.gs`, didaftarkan di `filePushOrder`
`.clasp.json` (setelah `MasterPUM.gs`; urutan tidak kritis, tidak ada dependensi lain
ke modul ini):

```js
/**
 * AntreanStatus.gs
 * Status antrean unggah offline mobile, dilaporkan tiap kali HP online.
 * Disimpan di AppCache (bukan sheet) -- data ini murni sementara, kedaluwarsa
 * wajar setelah beberapa jam tanpa laporan baru dari HP yang bersangkutan.
 */
var AntreanStatus = (function () {
  var TTL = 3600; // 1 jam -- laporan lebih tua dianggap basi, bukan 0

  function _key(email) { return 'antrean_' + String(email || '').toLowerCase(); }

  function lapor(email, jumlahDraft, jumlahGagal) {
    AppCache.put(_key(email), {
      email: email, jumlahDraft: Util.num(jumlahDraft), jumlahGagal: Util.num(jumlahGagal),
      waktu: new Date().toISOString()
    }, TTL);
    return { success: true };
  }

  function getSemua() {
    var users = Users.list(), out = [], i, v;
    for (i = 0; i < users.length; i++) {
      v = AppCache.get(_key(users[i].email));
      if (v) out.push(v);
    }
    return out;
  }

  return { lapor: lapor, getSemua: getSemua };
})();
```

`Code.gs`, endpoint baru:

```js
function serverLaporAntrean(token, jumlahDraft, jumlahGagal) {
  return _run(token, function (auth) { return AntreanStatus.lapor(auth.email, jumlahDraft, jumlahGagal); });
}
```

**Catatan desain**: `getSemua()` mengiterasi `Users.list()` lalu mengecek cache satu-satu
KARENA `CacheService` GAS tidak punya operasi "ambil semua key berawalan X" — ini
satu-satunya cara yang tersedia di platform, bukan solusi sementara. Entri kedaluwarsa
otomatis tidak muncul (`AppCache` mengembalikan `null`), tanpa pembersihan manual.

### 1d. Modul yang dipakai ulang apa adanya (tidak diubah)

`KasTunai.getTransaksi()`, `KasTunai.ringkasanSaldo()`, `Anggaran.ketersediaan()`,
`Rekonsiliasi.ringkasan()`, `ScanInbox.list()`, `Users.list()`,
`CONFIG.BATAS_SETOR_TANGGAL`, `AppCache`.

## Bagian 2 — Perubahan `mobile.html`

Di `aqKirimSemua(diam)` (fungsi yang sudah ada), tepat setelah `AQ.semua(...)`
mengembalikan `list` (baris paling awal callback-nya, sebelum penyaringan status
`GAGAL`), tambahkan satu panggilan pelaporan:

```js
AQ.semua(function(list){
  var gagal = 0, i;
  for (i=0;i<list.length;i++) if (list[i].status === 'GAGAL') gagal++;
  google.script.run.withFailureHandler(function(){}).serverLaporAntrean(_tok, list.length, gagal);
  // ... isi function yang sudah ada, TIDAK diubah, lanjut persis seperti sekarang ...
```

Tidak ada tampilan baru di mobile — laporan ini murni "diam-diam".
`withFailureHandler(function(){})` sengaja kosong: kegagalan lapor status TIDAK boleh
mengganggu alur kirim antrean yang sesungguhnya.

**Wajib dicatat** di `docs/HANDOFF-MOBILE.md` saat tugas ini diimplementasikan (bagian 4
dan papan status), karena ini perubahan lintas dokumen.

## Bagian 3 — Frontend desktop (`index.html`)

Semua ukuran/warna dari `docs/HANDOFF-DESKTOP.md` bagian 6 (token Broadsheet). Tidak ada
warna baru. Target klik minimal 40px; baris tabel ≈48px.

### 3a. Struktur layar

Menu rail baru **paling atas** (sebelum Transaksi):
`<button id="tabPapan" class="rail-item" onclick="switchTab('papan')">Papan kerja</button>`,
kontainer `<div id="viewPapan" class="wrap hidden">` diletakkan sebelum `viewTransaksi` di
dalam `.app-main`. Layar default saat aplikasi dibuka berubah dari Transaksi → **Papan
kerja**.

Isi `#viewPapan`, kiri (utama) ke kanan (panel):

**Kolom utama**

1. **4 kartu statistik** — radius 20px, padding `20px 22px`:
   | # | Judul | Isi | Gaya |
   |---|---|---|---|
   | 1 | Saldo kas tunai | `saldo.saldoTunai` | isi `--color-accent`, teks putih, angka 31px (kartu terpenting) |
   | 2 | Bank / UP | `saldo.saldoBank` | `--color-neutral-200`, angka 24px |
   | 3 | Belum di-SPBY | jumlah transaksi keluar tanpa `noSpby` + total rupiahnya sebagai subteks | `--color-neutral-200`, angka 24px |
   | 4 | Pajak belum disetor | jumlah nota kena pajak belum setor + subteks "batas setor &lt;`batasSetorTanggal`&gt;" | `--color-neutral-200`, angka 24px; subteks magenta bila tanggal batas sudah lewat |

   Di bawah 1440px kartu jadi grid 2×2, angka 26px/21px, padding `16px 18px`
   (tabel kerapatan, `docs/HANDOFF-DESKTOP.md` bagian 3).

2. **Menunggu tindakan Anda** — tabel `1fr 148px 130px`:
   - kolom 1: uraian transaksi (15px) + baris kedua `No · penyedia` (12px neutral-600);
   - kolom 2: pil status (alasan pertama dari `_pkKriteriaTindakan`, mis. "Belum SPBY");
   - kolom 3: nominal, rata kanan, `--font-heading` 600.
   - Klik baris → `switchTab('transaksi')` lalu buka/sorot transaksi terkait (memakai
     ulang mekanisme buka-detail yang sudah ada di layar Transaksi).

3. **Sisa pagu paling tipis** — subjudul: "tempat pembebanan berikutnya paling mudah
   melampaui pagu". Tabel `1fr 120px` dari `serapan.top5` (sudah terurut serapan
   menurun dari server):
   - kolom 1: kode akun + uraian (bila ada) + sisa rupiah sebagai subteks;
   - kolom 2: bar **54×7px** radius 999px + persen 13px/600 di sebelahnya;
   - bar berwarna `--color-accent-2` (magenta) bila `persen > 0.9`, selain itu
     `--color-accent`;
   - baris dengan `persen > 0.9` berlatar `--color-accent-2-100` radius 14px;
   - klik baris → `switchTab('dana')` (layar Ketersediaan Dana yang sudah ada; setelah
     tugas urutan-3 selesai, ganti ke layar Pagu & realisasi yang baru).

**Panel kanan** (404px ≥1440px; 348px di 1366px; drawer <1366px — tabel kerapatan):

4. **Kartu antrean HP** — magenta (`--color-accent-2`) radius 20px: daftar staf +
   jumlah draft masing-masing dari `antreanSemua`. Bila ada entri `jumlahGagal > 0`,
   tampilkan jumlah gagal itu eksplisit — jangan disatukan ke jumlah draft.
5. **Kotak masuk scan** — 3 baris dari `scanTerbaru`: nama berkas + tanggal + pil
   "Belum dikaitkan" magenta.
6. **Kartu ketenangan** — kotak `--color-neutral-200` radius 16px, ringkasan rekonsiliasi
   dari `rekon`: `counts.cocok` cocok · `counts.belum` belum · `counts.nilaiBeda` selisih
   nilai · impor terakhir (`lastImport`). Angka `nilaiBeda` magenta bila > 0. Klik →
   `switchTab('rekon')`.

### 3b. Fungsi JS baru

`muatPapanKerja()` — dipanggil dari `switchTab('papan')` (menambah satu baris
`if(tab==='papan') muatPapanKerja();` ke `switchTab` yang sudah ada, mengikuti pola
`loadRekap()`/`muatDana()`) — memanggil `serverGetPapanKerja`, lalu merender keenam blok
di atas.

```js
function _pkKriteriaTindakan(t){
  var alasan = [];
  if ((+t.kredit||0) > 0 && !t.noSpby) alasan.push('Belum SPBY');
  if ((+t.kredit||0) > 0 && (t.pajakKatIdx===null || t.pajakKatIdx===undefined)) alasan.push('Pajak belum diisi');
  if ((+t.kredit||0) > 0 && String(t.refTransfer||'').indexOf('TF-')!==0){
    var um = (+t.uangDiserahkan>0) ? (+t.uangDiserahkan) : (+t.kredit||0);
    var sisaPUM = um - (+t.notaTotal||0) - (+t.kembalianTotal||0);
    if (sisaPUM > 0) alasan.push('PUM belum bernota');
  }
  if (String(t.statusRekon||'').toUpperCase()==='NILAI_BEDA') alasan.push('Rekon selisih');
  return alasan;
}
```

Rumus `sisaPUM` disalin PERSIS dari mode ringkas `hitungNeraca` (`mobile.html`,
didokumentasikan `docs/HANDOFF-MOBILE.md` bagian 2) — **jangan ditulis beda**. Bila rumus
itu berubah, `_pkKriteriaTindakan` HARUS ikut diperbarui manual.

Pemendekan rupiah (`rpk`, tabel kerapatan bagian 3) berlaku untuk kolom nominal tabel di
bawah 1440px; kartu statistik dan panel kanan **selalu angka penuh**.

## Bagian 4 — Kasus tepi

- **Peran "viewer"**: `serverGetPapanKerja` meredaksi `saldo` jadi `null` (sama seperti
  `serverGetDashboard`); kartu 1 & 2 menampilkan placeholder, bukan angka. Ini perilaku
  kontrol akses yang sudah ada — jangan dilewati.
- **Belum ada data pagu** (`ketersediaan().items` kosong): panel "Sisa pagu paling tipis"
  menampilkan "Belum ada data pagu.", bukan error atau kosong tanpa keterangan.
- **Kotak masuk scan kosong**: "Tidak ada berkas scan terbaru."
- **Belum ada laporan antrean** (`antreanSemua.length===0`): "Belum ada laporan terbaru
  dari HP." — BUKAN angka 0 untuk tiap staf (itu menyesatkan: seolah semua sudah sinkron
  padahal cuma belum lapor).
- **Belum pernah impor rekening koran** (`rekon.lastImport` kosong): kartu ketenangan
  menyebut "Belum ada impor rekening koran" alih-alih tanggal.
- **Daftar tindakan kosong**: "Tidak ada yang menunggu tindakan." — ini keadaan bagus,
  tulis begitu, jangan tabel kosong.

## Bagian 5 — Rencana uji

Verifikasi wajib lewat **interaksi nyata** (klik sungguhan, bukan memanggil fungsi
lewat `page.evaluate`), mengikuti konvensi proyek:

1. Buka aplikasi → Papan kerja otomatis terbuka (layar default berubah dari Transaksi).
2. 4 kartu statistik terisi angka yang benar, cocok dengan angka yang sama bila dibuka
   lewat layar lain (mis. Saldo kas tunai vs layar yang menampilkannya sekarang).
3. Daftar "Menunggu tindakan Anda" berisi transaksi uji yang sengaja memenuhi tiap dari 4
   kriteria (minimal satu per kriteria), dan tidak berisi transaksi yang tidak memenuhi
   kriteria apa pun.
4. Klik nyata satu item daftar tindakan → pindah ke layar Transaksi, transaksi terkait
   terbuka/tersorot.
5. "Sisa pagu paling tipis": tepat 5 baris (atau kurang bila datanya kurang), terurut
   persentase menurun; baris dengan serapan >90% berlatar magenta lembut dan barnya
   magenta; baris 90% pas **tidak** tersorot (uji ambang `>`, bukan `>=`).
6. Klik baris sisa pagu → pindah ke layar Ketersediaan Dana.
7. Kartu ketenangan: angka cocok dengan layar Rekonsiliasi bila dibuka langsung;
   `nilaiBeda > 0` tampil magenta; klik → pindah ke layar Rekonsiliasi.
8. Akun peran `viewer` (stub) → saldo tersembunyi di kartu 1 & 2.
9. Setiap keadaan kosong di bagian 4 → pesan yang wajar, tidak ada error JS di konsol.
10. Lebar viewport 1366px → kartu jadi grid 2×2, nominal tabel disingkat (`Rp 4,44 M`),
    panel kanan 348px; 1280px → panel jadi drawer dan tombol Tutup berfungsi.
11. Pemindaian `onclick`/`onchange` menyeluruh pada `#viewPapan` — tidak ada bug kutip
    (pelajaran `docs/HANDOFF-MOBILE.md` bagian 1).
12. Modul `AntreanStatus.gs`: `lapor()` lalu `getSemua()` mengembalikan entri yang baru
    dilaporkan; entri yang TTL-nya lewat (simulasi TTL sangat pendek saat uji, bukan
    menunggu 1 jam) tidak muncul.

## Status

**SELESAI (kode) 29 Jul 2026.** Diimplementasikan lewat rencana
`docs/superpowers/plans/2026-07-29-papan-kerja-desktop.md`, delapan tugas, seluruhnya
direview. Commit: `309fb0f`, `49d3abd`, `68b5b09`, `26d46f4`, `0dc9d25`, `6a5772c`,
`765691d`, `5d8e028`.

Verifikasi otomatis lengkap: 12 skenario lewat klik sungguhan, 31 asersi terukur, semuanya
lolos; skrip regresi bersama 22 PASS / 0 FAIL.

**Belum diuji manual di browser sungguhan** — itu baru terjadi setelah pengguna
menjalankan `deploy.bat`. Papan status di `docs/HANDOFF-DESKTOP.md` menandainya 🟡, bukan
✅, sampai pengguna mengonfirmasi.

Empat hal di spec ini **meleset dari kode nyata** dan sudah dikoreksi di rencana — dicatat
di sini supaya tidak menyesatkan pembaca spec di kemudian hari:

| Di spec | Kenyataan |
|---|---|
| nama token `--color-accent-2-100` dst. | sudah diganti design system Broadsheet: `--bs-a2`, `--bs-a21`, dst. |
| rail punya 6 menu | 7 sebelum tugas ini, 8 sesudahnya |
| kartu 4 membaca pajak dari transaksi | status setor tersimpan **per nota**; dihitung di server sebagai `pajakBelumSetor` |
| klik baris tindakan memakai "buka detail" | tidak ada mekanisme itu; kartu diberi `data-no` lalu digulir & disorot |
