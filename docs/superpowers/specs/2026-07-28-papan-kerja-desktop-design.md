# Desain: Layar Papan Kerja (Dashboard) — Desktop

## Konteks

Tugas 2 dari `docs/HANDOFF-DESKTOP.md`. Rail-nav (tugas 1, kode selesai `f89dd42`) sekarang
punya 6 menu (Transaksi/Perjalanan Dinas/Laporan/Nota Kena Pajak/Ketersediaan Dana/
Rekonsiliasi) — "Papan kerja" **sengaja belum ada** di rail itu, sesuai keputusan terkunci di
`docs/HANDOFF-DESKTOP.md` bagian 2 ("dua nama itu baru masuk saat tugasnya sendiri selesai").
Tugas ini membangun layar itu dan menambahkannya sebagai menu rail **pertama**.

Desain sumber (README paket desain, Bagian II layar #1, diringkas `docs/HANDOFF-DESKTOP.md`
bagian 3): *"4 kartu statistik, daftar 'Menunggu tindakan Anda', bar serapan per akun (bar
tinggi 8px radius 999px, isi >80% jadi magenta), panel kanan: antrean unggah (magenta), kotak
masuk scan, catatan batas setor pajak."*

## Keputusan yang sudah disetujui pengguna (lewat `AskUserQuestion`/persetujuan langsung, 28 Jul 2026)

| Topik | Keputusan |
|---|---|
| Isi 4 kartu statistik | Saldo Kas Tunai, Saldo Bank/UP, Serapan Anggaran (%), Jumlah item "menunggu tindakan" — fokus pengawasan (desktop = "pekerjaan meja"), BUKAN duplikasi Beranda mobile. |
| Kriteria "Menunggu tindakan Anda" | Gabungan 4 kategori: transaksi belum SPBY, PUM belum dipertanggungjawabkan, pajak belum diisi/belum disetor, rekonsiliasi ada selisih (`NILAI_BEDA`). |
| Arti "antrean unggah" | Ringkasan **draft offline dari HP staf** (antrean lokal mobile, tugas 6) — BUKAN konsep lain. Karena murni lokal di tiap HP (tidak ada catatannya di server sama sekali), `mobile.html` mendapat tambahan kecil: melaporkan jumlah draft ke server setiap kali online. **Ini menyentuh `mobile.html` juga, bukan cuma `index.html`** — dicatat di `docs/HANDOFF-MOBILE.md` juga saat diimplementasikan. |
| Cakupan bar serapan | 5 akun serapan tertinggi + tautan "Lihat semua" ke Ketersediaan Dana — bukan semua akun. |
| Pendekatan pengambilan data | Satu endpoint baru `serverGetPapanKerja` (round-trip tunggal), meniru pola `serverGetDashboard` yang sudah ada — bukan 4-5 panggilan terpisah per komponen. |
| Tempat hitung kriteria "menunggu tindakan" | **Client-side di `index.html`**, meniru pola `mobile.html` — bukan logika baru di `.gs`. Endpoint mengirim data transaksi mentah (field yang sudah ada: `kredit`, `noSpby`, `pajakKatIdx`, `refTransfer`, `statusRekon`, `notaTotal`, `kembalianTotal`, `uangDiserahkan`), `index.html` menyaring sendiri dengan salinan kecil fungsi yang sama seperti `mobile.html` (`isKeluar`/`pajakBelum`/`bukanPindahDana`/rumus `sisaPUM` ringkas). Dua salinan kecil yang dijaga tetap sama secara manual — pola yang **sudah ada** antara mobile dan (nanti) desktop, bukan hal baru; `docs/HANDOFF-MOBILE.md` bagian 2 tetap satu-satunya rujukan rumus. |

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
      scanTerbaru: ScanInbox.list(10),
      batasSetorTanggal: CONFIG.BATAS_SETOR_TANGGAL,
      antreanSemua: AntreanStatus.getSemua()
    };
  });
}
```

Field `transaksi`/`saldo`/`role`/`isAdmin`/`batasSetorTanggal` sengaja bernama dan berperilaku
identik dengan `serverGetDashboard` (termasuk redaksi `saldo` untuk role bukan admin/full) —
`index.html` memakai ulang pola pembacaan yang sama, tidak ada konsep baru di sisi itu.

### 1b. Agregasi serapan per akun — `Anggaran.gs`

Fungsi baru `ringkasSerapan()`, memakai ulang `ketersediaan()` yang sudah ada (bukan menghitung
ulang dari sheet):

```js
function ringkasSerapan() {
  var data = ketersediaan();  // sudah ada — { items, total, belanjaTanpaItem, periode }
  var perAkun = {}, i;
  for (i = 0; i < data.items.length; i++) {
    var it = data.items[i];
    var a = perAkun[it.akun] || { akun: it.akun, pagu: 0, realisasiSakti: 0, belanjaKas: 0 };
    a.pagu += it.pagu; a.realisasiSakti += it.realisasiSakti; a.belanjaKas += it.belanjaKas;
    perAkun[it.akun] = a;
  }
  var out = [];
  for (var k in perAkun) {
    var a = perAkun[k];
    var pakai = Math.max(a.realisasiSakti, a.belanjaKas);   // sama seperti prinsip MAX di rumus GLP039 (Bagian III HANDOFF-DESKTOP.md) — mencegah pembebanan terlihat di bawah pagu padahal sudah lebih lewat kas tunai
    a.persen = a.pagu > 0 ? (pakai / a.pagu) : 0;
    out.push(a);
  }
  out.sort(function (a, b) { return b.persen - a.persen; });
  var pakaiTotal = Math.max(data.total.realisasiSakti, data.total.belanjaKas);
  return {
    top5: out.slice(0, 5),
    // Persentase KESELURUHAN satker (semua akun, bukan cuma 5 teratas) — dipakai
    // kartu statistik "Serapan Anggaran". Kartu itu HARUS memakai angka ini, BUKAN
    // rata-rata dari top5 (top5 sengaja hanya subset akun berisiko tinggi).
    persenTotal: data.total.pagu > 0 ? (pakaiTotal / data.total.pagu) : 0
  };
}
```

Tambahkan `ringkasSerapan: ringkasSerapan` ke `return {...}` modul `Anggaran.gs` (baris terakhir
file, di samping `imporPagu`/`getPagu`/`ketersediaan` yang sudah ada).

**Catatan desain**: `pakai = MAX(realisasiSakti, belanjaKas)` sengaja meniru prinsip yang sama
seperti rumus `sisaTersedia`/`serapan` di rencana GLP039 (`docs/HANDOFF-DESKTOP.md` bagian 4,
Bagian III) — walau `ringkasSerapan` ini TIDAK menyentuh sistem `PAGU_POK` yang belum dibangun
(tugas 7-11), prinsip "pakai angka yang lebih besar supaya tidak terlihat aman padahal sudah
lebih" tetap berlaku pada sistem pagu LAMA yang sedang dipakai fungsi ini.

### 1c. Status antrean lintas HP — modul baru `AntreanStatus`

Tidak pakai sheet baru — status ini murni sementara (kedaluwarsa wajar setelah beberapa jam),
jadi cukup `AppCache` (sudah ada, `SheetRepository.gs`, TTL maksimum 21600 detik/6 jam per batas
GAS `CacheService`). Modul baru, file **baru** `AntreanStatus.gs` (didaftarkan di
`filePushOrder` `.clasp.json`, setelah `MasterPUM.gs` — sebelum `SuratTugas.gs`, urutan tidak
kritis karena tidak ada dependensi lain ke modul ini):

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

`Code.gs`, endpoint baru dekat endpoint foto/antrean lain:

```js
function serverLaporAntrean(token, jumlahDraft, jumlahGagal) {
  return _run(token, function (auth) { return AntreanStatus.lapor(auth.email, jumlahDraft, jumlahGagal); });
}
```

**Catatan desain**: `getSemua()` mengiterasi `Users.list()` (sudah ada, daftar user terbatas —
satu satker) lalu mengecek cache satu-satu, KARENA `CacheService` GAS tidak punya operasi
"ambil semua key berawalan X" — ini bukan solusi sementara, ini satu-satunya cara yang tersedia
di platform. Entri yang sudah kedaluwarsa (lewat 1 jam) otomatis tidak muncul (AppCache
mengembalikan `null`), TANPA perlu pembersihan manual.

### 1d. Modul yang sudah ada, dipakai ulang apa adanya (tidak diubah)

`KasTunai.getTransaksi()`, `KasTunai.ringkasanSaldo()`, `Anggaran.ketersediaan()`,
`ScanInbox.list()`, `Users.list()`, `CONFIG.BATAS_SETOR_TANGGAL`, `AppCache` — semua dipakai
lewat pemanggilan biasa, tidak ada satu pun yang diubah isinya oleh tugas ini.

## Bagian 2 — Perubahan `mobile.html`

Di `aqKirimSemua(diam)` (fungsi yang sudah ada, `mobile.html`), tepat setelah `AQ.semua(...)`
mengembalikan `list` (baris paling awal callback-nya, sebelum penyaringan status `GAGAL`),
tambahkan satu panggilan pelaporan — tidak mengubah alur pengiriman yang sudah ada, cuma
menumpang di titik yang sudah dipanggil tiap kali online (event `'online'`, `mobile.html:3564`)
maupun tiap kali aplikasi dibuka (pemanggilan awal di `init()`):

```js
AQ.semua(function(list){
  var gagal = 0, i;
  for (i=0;i<list.length;i++) if (list[i].status === 'GAGAL') gagal++;
  google.script.run.withFailureHandler(function(){}).serverLaporAntrean(_tok, list.length, gagal);
  // ... isi function yang sudah ada, TIDAK diubah, lanjut persis seperti sekarang ...
```

Tidak ada tampilan baru di mobile — laporan ini murni "diam-diam", staf HP tidak melihat
bedanya sama sekali (sesuai keputusan Bagian 2 yang disetujui). `withFailureHandler(function(){})`
sengaja kosong — kegagalan lapor status TIDAK boleh mengganggu alur kirim antrean yang
sesungguhnya (yang sudah punya penanganan galatnya sendiri).

**Wajib dicatat** di `docs/HANDOFF-MOBILE.md` saat tugas ini diimplementasikan — bagian 4
("Kondisi kode saat ini") dan papan status, karena ini perubahan lintas dokumen (mobile DAN
desktop), sesuai aturan main proyek.

## Bagian 3 — Frontend desktop (`index.html`)

### 3a. Struktur layar

Menu rail baru **paling atas** (sebelum Transaksi): `<button id="tabPapan" class="rail-item" onclick="switchTab('papan')">Papan kerja</button>`, kontainer `<div id="viewPapan" class="wrap hidden">` diletakkan sebelum `viewTransaksi` di dalam `.app-main` (urutan DOM mengikuti urutan menu, konsisten dengan pola 6 layar yang sudah ada). Layar default saat dibuka berubah dari Transaksi → **Papan kerja** (satu-satunya perubahan pada perilaku "layar default" sejak tugas 1).

Isi `#viewPapan` dari atas ke bawah:
1. **4 kartu statistik** — grid, mengikuti pola `.rail-saldo`/token Broadsheet (`--bs-*`) yang sudah ada sejak tugas 1: Saldo Kas Tunai, Saldo Bank/UP, Serapan Anggaran (**`serapan.persenTotal`** — persentase KESELURUHAN satker, BUKAN rata-rata dari 5 akun teratas), Jumlah item menunggu tindakan.
2. **Daftar "Menunggu tindakan Anda"** — baris per item, tiap baris bisa diklik (`switchTab('transaksi')` lalu sorot transaksi terkait, memakai ulang pola pembukaan detail yang sudah ada di layar Transaksi).
3. **Bar serapan 5 akun** — dari `serapan.top5`, bar `height:8px;border-radius:999px`, isi warna `--bs-a2` (magenta) bila `persen > 0.8`, selebihnya `--bs-ac`. Tautan "Lihat semua" → `switchTab('dana')`.
4. **Panel kanan**: kotak masuk scan (`scanTerbaru`, memakai ulang pola render `#viewDana`'s existing scan-related markup bila ada, atau daftar sederhana nama+tanggal+tombol buka), catatan batas setor pajak (`batasSetorTanggal` + jumlah nota belum setor dari `transaksi`), ringkasan antrean (`antreanSemua` — daftar staf + jumlah draft masing-masing, warna `--bs-a2` bila ada yang `jumlahGagal > 0`).

### 3b. Fungsi JS baru

`muatPapanKerja()` — dipanggil dari `switchTab('papan')` (menambah satu baris `if(tab==='papan') muatPapanKerja();` ke fungsi `switchTab` yang sudah ada, mengikuti pola pemanggilan `loadRekap()`/`muatDana()`/dst. yang sudah ada persis untuk tab lain) — memanggil `serverGetPapanKerja`, lalu:

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

Rumus `sisaPUM` di atas disalin PERSIS dari mode ringkas `hitungNeraca` (`mobile.html`,
didokumentasikan `docs/HANDOFF-MOBILE.md` bagian 2) — **jangan ditulis beda**. Bila rumus itu
berubah di masa depan, `_pkKriteriaTindakan` di `index.html` HARUS ikut diperbarui secara
manual (tidak ada mekanisme sinkron otomatis, sesuai keputusan Bagian 1 tabel di atas).

## Bagian 4 — Kasus tepi

- **Peran "viewer"**: kartu Saldo Kas Tunai/Bank-UP disembunyikan/disamarkan — `serverGetPapanKerja` sudah meredaksi `saldo` jadi `null` untuk role bukan admin/full (sama seperti `serverGetDashboard`), `index.html` menampilkan placeholder alih-alih angka saat `saldo===null`.
- **Belum ada data pagu** (`Anggaran.ketersediaan().items` kosong): bagian bar serapan menampilkan `<div class="empty">Belum ada data pagu.</div>`, bukan error/kosong-tanpa-keterangan.
- **Kotak masuk scan kosong**: `scanTerbaru.length===0` → pesan "Tidak ada berkas scan terbaru."
- **Belum ada laporan antrean** (`antreanSemua.length===0` — baru dipasang, atau semua laporan sudah kedaluwarsa >1 jam): pesan "Belum ada laporan terbaru dari HP.", BUKAN menampilkan angka 0 untuk tiap staf (itu menyesatkan — seolah semua staf sudah sinkron padahal cuma belum lapor).
- **Klik item "Menunggu tindakan Anda"**: pindah ke layar Transaksi (`switchTab('transaksi')`) dan membuka detail transaksi terkait — memakai ulang mekanisme buka-detail yang sudah ada di layar Transaksi, tidak membuat mekanisme baru.

## Bagian 5 — Rencana uji

Verifikasi wajib lewat interaksi nyata (klik sungguhan, bukan cuma panggil fungsi), mengikuti
konvensi proyek:

1. Buka aplikasi → Papan kerja otomatis terbuka (layar default berubah dari Transaksi).
2. 4 kartu statistik terisi angka yang benar, cocok dengan angka yang sama di layar lain (mis.
   Saldo Kas Tunai di kartu = Saldo Kas Tunai bila dibuka lewat layar lama yang menampilkannya).
3. Daftar "Menunggu tindakan Anda" berisi transaksi uji yang sengaja dibuat memenuhi tiap dari 4
   kriteria (satu transaksi per kriteria minimal), tidak berisi transaksi yang tidak memenuhi
   kriteria apa pun.
4. Klik nyata satu item di daftar tindakan → pindah ke layar Transaksi, transaksi terkait
   terbuka/tersorot.
5. Bar serapan menampilkan tepat 5 akun (atau kurang bila datanya kurang dari 5), terurut dari
   persentase tertinggi.
6. Akun peran viewer (stub `role:'viewer'`) → saldo tersembunyi/disamarkan di kartu.
7. Data pagu kosong / scan kosong / antrean kosong → pesan kosong yang wajar, tidak ada error
   JS di konsol.
8. Pemindaian `onclick`/`onchange` menyeluruh pada `#viewPapan` — tidak ada bug kutip.
9. Modul `AntreanStatus.gs`: uji `lapor()` lalu `getSemua()` mengembalikan entri yang baru
   dilaporkan; uji entri yang TTL-nya sudah lewat (simulasi dengan TTL sangat pendek saat uji,
   bukan menunggu 1 jam sungguhan) tidak muncul di `getSemua()`.

## Status

Kelima bagian disetujui bertahap oleh pengguna (28 Jul 2026). Langkah berikutnya: `writing-plans`.
