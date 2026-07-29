# Papan Kerja Desktop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun layar "Papan kerja" — layar pembuka desktop yang menjawab satu pertanyaan: apa yang harus saya kerjakan hari ini.

**Architecture:** Satu endpoint agregasi `serverGetPapanKerja` (round-trip tunggal, meniru `serverGetDashboard`). Kriteria "menunggu tindakan" dihitung di klien dengan salinan rumus dari `mobile.html`. Status antrean HP disimpan di `AppCache` (bukan sheet) karena murni sementara.

**Tech Stack:** Google Apps Script ES5 (`.gs`), vanilla JS satu berkas (`index.html`, `mobile.html`), tanpa build step. Verifikasi: Playwright klik nyata + `node --check`.

**Spec:** `docs/superpowers/specs/2026-07-28-papan-kerja-desktop-design.md`
**Acuan visual:** `docs/HANDOFF-DESKTOP.md` bagian 3b.1 (susunan), bagian 3 (tabel kerapatan), bagian 6 (token).

---

## Global Constraints

- **Backend ES5.** Semua `.gs` pakai `var` + `function`. Tanpa `let`, `const`, arrow, template literal, `Promise`, `class`.
- **Frontend vanilla JS, satu file per entry point.** Tanpa framework, tanpa build step, tanpa dependency eksternal baru.
- **Tidak ada hard delete.** Semua penghapusan lewat `IS_DELETED='Y'`.
- **`SpreadsheetApp.flush()` sekali di akhir request** via `DeferredFlush.commitAndInvalidate()`.
- **Menambah file `.gs` baru berarti mendaftarkannya di `filePushOrder` `.clasp.json`.** `_Config.gs` harus dievaluasi lebih dulu.
- **Endpoint tidak boleh memanggil endpoint.** Panggil fungsi modulnya langsung.
- Semua panggilan frontend→backend lewat `google.script.run.serverXxx(token, ...)`, dibungkus `_run(token, fn)`.
- **Bahasa UI Indonesia.** Target klik minimal 40px; baris tabel ≈48px.
- **Tidak ada warna baru.** Hanya token `--bs-*` yang sudah ada di `:root`.
- **Dokumen cetak tidak disentuh** — fungsi yang merakit `<html>`/`<head>` sendiri lalu dibuka lewat `_bukaPopup`.
- **Commit:** Conventional Commits, subjek Bahasa Indonesia, imperatif, < 72 karakter.

---

## Tabel penerjemahan token — WAJIB dipakai

Spec ditulis sebelum pekerjaan tema Broadsheet selesai, jadi ia menyebut nama token
**lama yang sudah tidak ada** di kode. Setiap kali spec menyebut nama di kolom kiri,
pakai nama di kolom kanan.

| Nama di spec | Token sebenarnya | Nilai |
|---|---|---|
| `--color-accent` | `var(--bs-ac)` | `#0088b0` teal |
| `--color-accent-2` | `var(--bs-a2)` | `#d6006c` magenta |
| `--color-accent-2-100` | `var(--bs-a21)` | `#fff1f4` magenta lembut |
| `--color-neutral-200` | `var(--bs-n200)` | `#eae7e7` |
| `--color-neutral-600` | `var(--bs-n600)` | `#6a6767` |
| `--font-heading` | `var(--bs-fh)` | `'Source Serif 4',Georgia,serif` |
| (teks di atas accent) | `var(--bs-paper)` | `#fff` |
| (ink teks utama) | `var(--bs-ink)` / `var(--bs-n800)` | `#201e1d` / `#444141` |

**Kosakata warna yang mengikat** (disetujui pengguna, jangan ditawar):
`--bs-a2` magenta = **perlu tindakan Anda, dan hanya itu**; `--bs-a21` = latar baris/kartu
perlu tindakan; `--bs-n800` ink = informasi netral; `--bs-n200`/`--bs-n700` = keadaan
beres; `--bs-ac` teal = aktif/penting.

---

## Yang berubah dari spec karena keadaan kode sekarang

Spec ditulis 28 Jul; kode bergerak sesudahnya. Empat penyesuaian, semuanya wajib:

1. **Rail sekarang punya 7 menu, bukan 6.** Urutannya: Transaksi, Nota Kena Pajak,
   Pagu & realisasi, Perjalanan dinas, Rekonsiliasi, Laporan (plus avatar menu akun).
   Papan kerja menjadi menu **kedelapan, di posisi pertama**.
2. **Nama token diterjemahkan** lewat tabel di atas.
3. **`switchTab` sekarang juga mengatur `#tbSlot`** (kolom cari + pemilih bulan) —
   `tab!=='transaksi'` sudah menyembunyikannya, jadi Papan kerja otomatis benar. Jangan
   menambah penanganan khusus.
4. **`serverGetDashboard` memuat migrasi header** (`hdr_fixed_v11`) yang **tidak** boleh
   diduplikasi ke endpoint baru — itu milik satu endpoint saja.

---

## Struktur berkas

| Berkas | Peran | Task |
|---|---|---|
| `Anggaran.gs` | tambah `ringkasSerapan()` + ekspor | 1 |
| `AntreanStatus.gs` | **BARU** — status antrean HP di `AppCache` | 2 |
| `.clasp.json` | daftarkan `AntreanStatus.gs` di `filePushOrder` | 2 |
| `Code.gs` | tambah `serverLaporAntrean`, `serverGetPapanKerja` | 2, 3 |
| `mobile.html` | lapor jumlah draft saat kirim antrean | 4 |
| `index.html` | menu rail, `#viewPapan`, CSS, JS render | 5, 6 |
| `docs/HANDOFF-DESKTOP.md`, `docs/HANDOFF-MOBILE.md` | papan status | 8 |

---

### Task 1: `Anggaran.ringkasSerapan()`

**Files:**
- Modify: `Anggaran.gs` (tambah fungsi sebelum `return {...}` modul, sekitar baris 150)

**Interfaces:**
- Consumes: `ketersediaan()` yang sudah ada — mengembalikan `{items, total, belanjaTanpaItem, periode}`. Tiap `item` punya `akun`, `uraianAkun`, `pagu`, `realisasiSakti`, `belanjaKas`.
- Produces: `Anggaran.ringkasSerapan()` → `{top5: [{akun, uraian, pagu, realisasiSakti, belanjaKas, persen, sisa}]}`, terurut `persen` menurun, maksimal 5 entri.

- [ ] **Step 1: Tulis fungsinya**

Sisipkan tepat sebelum baris `return { imporPagu: imporPagu, getPagu: getPagu, ketersediaan: ketersediaan };`:

```js
  /* ---------------- Ringkas serapan per akun ---------------- */
  /**
   * Lima akun dengan serapan tertinggi -- dipakai panel "Sisa pagu paling tipis"
   * di Papan kerja. Prinsipnya sama dengan sisaAman: MAX(realisasiSakti, belanjaKas),
   * BUKAN penjumlahan. Belanja kas yang belum masuk SAKTI tetap dihitung mengurangi
   * pagu, supaya pagu tidak terlihat aman padahal sudah lewat.
   */
  function ringkasSerapan() {
    var data = ketersediaan();
    var perAkun = {}, i, k;
    for (i = 0; i < data.items.length; i++) {
      var it = data.items[i];
      var a = perAkun[it.akun] || { akun: it.akun, uraian: it.uraianAkun || '',
                                    pagu: 0, realisasiSakti: 0, belanjaKas: 0 };
      a.pagu += it.pagu;
      a.realisasiSakti += it.realisasiSakti;
      a.belanjaKas += it.belanjaKas;
      perAkun[it.akun] = a;
    }
    var out = [];
    for (k in perAkun) {
      if (!perAkun.hasOwnProperty(k)) continue;
      var b = perAkun[k];
      var pakai = Math.max(b.realisasiSakti, b.belanjaKas);
      b.persen = b.pagu > 0 ? (pakai / b.pagu) : 0;
      b.sisa = b.pagu - pakai;
      out.push(b);
    }
    out.sort(function (x, y) { return y.persen - x.persen; });
    return { top5: out.slice(0, 5) };
  }

```

- [ ] **Step 2: Daftarkan di ekspor modul**

Ganti baris ekspor menjadi:

```js
  return { imporPagu: imporPagu, getPagu: getPagu, ketersediaan: ketersediaan,
           ringkasSerapan: ringkasSerapan };
```

- [ ] **Step 3: Periksa sintaks ES5**

```bash
cd /home/user/kas-tunai
node --check < Anggaran.gs && echo "SINTAKS OK"   # lewat stdin: node menolak ekstensi .gs
grep -nE "\b(let|const|=>|class )" Anggaran.gs | grep -v "^\s*//" || echo "ES5 BERSIH"
```
Expected: `SINTAKS OK` lalu `ES5 BERSIH`.

- [ ] **Step 4: Uji logika lewat node dengan tiruan `ketersediaan()`**

Buat berkas sementara di scratchpad (jangan di repo) yang menyalin badan `ringkasSerapan`
lalu menyuntikkan `ketersediaan` tiruan:

```js
// uji: 2 akun, 3 item. Akun 521111 -> pagu 1000, sakti 200, kas 900 => pakai 900, persen 0.9
//      Akun 522141 -> pagu  500, sakti 480, kas 100 => pakai 480, persen 0.96
function ketersediaan(){ return { items: [
  {akun:'521111',uraianAkun:'Belanja Keperluan Kantor',pagu:600,realisasiSakti:100,belanjaKas:500},
  {akun:'521111',uraianAkun:'Belanja Keperluan Kantor',pagu:400,realisasiSakti:100,belanjaKas:400},
  {akun:'522141',uraianAkun:'Belanja Sewa',pagu:500,realisasiSakti:480,belanjaKas:100}
]};}
// ... salin badan ringkasSerapan di sini ...
var r = ringkasSerapan();
console.log(JSON.stringify(r.top5, null, 1));
if (r.top5[0].akun !== '522141') throw new Error('urutan salah, terbesar harus 522141');
if (Math.abs(r.top5[0].persen - 0.96) > 1e-9) throw new Error('persen 522141 salah');
if (Math.abs(r.top5[1].persen - 0.90) > 1e-9) throw new Error('persen 521111 salah');
if (r.top5[1].sisa !== 100) throw new Error('sisa 521111 salah, harus 1000-900=100');
if (r.top5[1].pagu !== 1000) throw new Error('agregasi pagu per akun salah');
console.log('SEMUA ASERSI LULUS');
```

Run: `node <berkas>.js`
Expected: `SEMUA ASERSI LULUS`. Ini membuktikan agregasi per akun, `MAX` bukan penjumlahan, dan urutan menurun.

- [ ] **Step 5: Commit**

```bash
cd /home/user/kas-tunai
git add Anggaran.gs
git commit -m "feat(backend): ringkas serapan per akun untuk Papan kerja"
```

---

### Task 2: Modul `AntreanStatus` + endpoint pelaporan

**Files:**
- Create: `AntreanStatus.gs`
- Modify: `.clasp.json` (`filePushOrder`)
- Modify: `Code.gs` (tambah `serverLaporAntrean` dekat endpoint lain)

**Interfaces:**
- Consumes: `AppCache.put(key, value, ttl)` / `AppCache.get(key)` (`SheetRepository.gs`), `Users.list()` → array objek ber-`email`, `Util.num(v)`.
- Produces: `AntreanStatus.lapor(email, jumlahDraft, jumlahGagal)` → `{success:true}`; `AntreanStatus.getSemua()` → `[{email, jumlahDraft, jumlahGagal, waktu}]`. Endpoint `serverLaporAntrean(token, jumlahDraft, jumlahGagal)`.

- [ ] **Step 1: Buat `AntreanStatus.gs`**

```js
/**
 * AntreanStatus.gs
 * Status antrean unggah offline mobile, dilaporkan tiap kali HP online.
 *
 * Disimpan di AppCache (BUKAN sheet) -- data ini murni sementara dan wajar basi
 * setelah beberapa jam tanpa laporan baru dari HP yang bersangkutan. Menyimpannya
 * ke sheet hanya menambah tulisan tanpa nilai historis.
 */
var AntreanStatus = (function () {
  var TTL = 3600; // 1 jam -- laporan lebih tua dianggap basi, bukan nol

  function _key(email) { return 'antrean_' + String(email || '').toLowerCase(); }

  function lapor(email, jumlahDraft, jumlahGagal) {
    AppCache.put(_key(email), {
      email: email,
      jumlahDraft: Util.num(jumlahDraft),
      jumlahGagal: Util.num(jumlahGagal),
      waktu: new Date().toISOString()
    }, TTL);
    return { success: true };
  }

  /**
   * Mengiterasi Users.list() lalu mengecek cache satu per satu KARENA CacheService
   * GAS tidak punya operasi "ambil semua key berawalan X". Ini satu-satunya cara
   * yang tersedia di platform, bukan solusi sementara. Entri kedaluwarsa otomatis
   * tidak muncul (AppCache.get mengembalikan null), tanpa pembersihan manual.
   */
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

- [ ] **Step 2: Daftarkan di `.clasp.json`**

Sisipkan `'AntreanStatus.gs'` ke `filePushOrder` **sebelum** `'Code.gs'` dan **sesudah**
`'Rekonsiliasi.gs'`. Modul ini hanya bergantung pada `AppCache`, `Users`, dan `Util` yang
semuanya dimuat lebih awal.

- [ ] **Step 3: Tambah endpoint di `Code.gs`**

Sisipkan dekat endpoint lain (mis. setelah `serverGetDashboard`):

```js
/** Laporan jumlah draft antrean dari HP staf. Dipanggil diam-diam oleh mobile.html. */
function serverLaporAntrean(token, jumlahDraft, jumlahGagal) {
  return _run(token, function (auth) {
    return AntreanStatus.lapor(auth.email, jumlahDraft, jumlahGagal);
  });
}
```

- [ ] **Step 4: Periksa sintaks dan pendaftaran**

```bash
cd /home/user/kas-tunai
node --check < AntreanStatus.gs && node --check < Code.gs && echo "SINTAKS OK"   # stdin: node menolak ekstensi .gs
grep -nE "\b(let|const|=>|class )" AntreanStatus.gs | grep -v "^\s*//" || echo "ES5 BERSIH"
python3 -c "
import json; o=json.load(open('.clasp.json')); f=o['filePushOrder']
assert 'AntreanStatus.gs' in f, 'BELUM terdaftar di filePushOrder'
assert f.index('AntreanStatus.gs') < f.index('Code.gs'), 'harus sebelum Code.gs'
print('PUSH ORDER OK, posisi', f.index('AntreanStatus.gs'), 'dari', len(f))
"
```
Expected: `SINTAKS OK`, `ES5 BERSIH`, `PUSH ORDER OK ...`.

- [ ] **Step 5: Uji logika TTL lewat node dengan tiruan `AppCache`**

Di scratchpad, salin badan modul lalu suntikkan tiruan:

```js
var _store = {};
var AppCache = {
  put: function(k,v,ttl){ _store[k] = {v:v, exp: Date.now()+ttl*1000}; },
  get: function(k){ var e=_store[k]; if(!e) return null;
                    if(Date.now()>e.exp){ delete _store[k]; return null; } return e.v; }
};
var Util = { num: function(v){ return Number(v)||0; } };
var Users = { list: function(){ return [{email:'a@x.id'},{email:'b@x.id'},{email:'c@x.id'}]; } };
// ... salin badan modul AntreanStatus di sini, dengan TTL diganti 1 detik untuk uji ...

AntreanStatus.lapor('a@x.id', 3, 1);
AntreanStatus.lapor('B@X.ID', 5, 0);   // huruf besar -- kunci harus dinormalkan
var s = AntreanStatus.getSemua();
if (s.length !== 2) throw new Error('harus 2 entri, dapat ' + s.length);
if (s[0].jumlahDraft !== 3 || s[0].jumlahGagal !== 1) throw new Error('nilai a salah');
if (s[1].jumlahDraft !== 5) throw new Error('kunci tidak dinormalkan ke huruf kecil');
AntreanStatus.lapor('a@x.id', 'bukan angka', null);
if (AntreanStatus.getSemua()[0].jumlahDraft !== 0) throw new Error('Util.num tidak dipakai');
console.log('ASERSI DASAR LULUS');
// TTL: mundurkan waktu kedaluwarsa secara paksa, jangan menunggu sungguhan
for (var k in _store) _store[k].exp = Date.now() - 1;
if (AntreanStatus.getSemua().length !== 0) throw new Error('entri basi masih muncul');
console.log('ASERSI TTL LULUS');
```

Run: `node <berkas>.js`
Expected: `ASERSI DASAR LULUS` lalu `ASERSI TTL LULUS`.

- [ ] **Step 6: Commit**

```bash
cd /home/user/kas-tunai
git add AntreanStatus.gs .clasp.json Code.gs
git commit -m "feat(backend): modul status antrean HP di AppCache"
```

---

### Task 3: Endpoint agregasi `serverGetPapanKerja`

**Files:**
- Modify: `Code.gs` (sisipkan setelah `serverLaporAntrean`)

**Interfaces:**
- Consumes: `KasTunai.getTransaksi()`, `KasTunai.ringkasanSaldo()` → `{saldoTunai, saldoBank, saldoTotal}`, `Anggaran.ringkasSerapan()` (Task 1), `ScanInbox.list(3)`, `Rekonsiliasi.ringkasan('')` → `{saldo, counts:{cocok,belum,nilaiBeda,nonRekon}, lastImport, nilaiBeda[]}`, `AntreanStatus.getSemua()` (Task 2), `KasTunai.getSemuaNota()` → tiap entri punya `pajakPph`, `pajakPpn`, `setorStatus` (`'SETOR'` atau `''`), `CONFIG.BATAS_SETOR_TANGGAL`.
- Produces: `serverGetPapanKerja(token)` → `{transaksi, saldo, role, isAdmin, serapan, scanTerbaru, batasSetorTanggal, rekon, antreanSemua, pajakBelumSetor}`.

- [ ] **Step 1: Tulis endpoint**

```js
/**
 * Agregasi satu round-trip untuk layar Papan kerja.
 *
 * Field transaksi/saldo/role/isAdmin/batasSetorTanggal sengaja bernama dan
 * berperilaku IDENTIK dengan serverGetDashboard (termasuk redaksi saldo untuk
 * peran bukan admin/full) supaya index.html memakai ulang pola pembacaan yang sama.
 *
 * Migrasi header (hdr_fixed_*) TIDAK diduplikasi ke sini -- itu milik
 * serverGetDashboard saja, satu tempat.
 */
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
      // v2 menetapkan kotak masuk scan menampilkan 3 baris -- ambil 3, bukan
      // 60 (bawaan) lalu dipotong di klien.
      scanTerbaru: ScanInbox.list(3),
      batasSetorTanggal: CONFIG.BATAS_SETOR_TANGGAL,
      // Panggil fungsi modul langsung, BUKAN endpoint serverRingkasanRekon --
      // endpoint tidak boleh memanggil endpoint. Argumen '' = semua periode.
      rekon: Rekonsiliasi.ringkasan(''),
      antreanSemua: AntreanStatus.getSemua(),
      // Status setor pajak tersimpan per NOTA (kolom SETOR_STATUS sheet Multi Nota),
      // bukan per transaksi. getSemuaNota() sudah mengembalikannya; hitung di sini
      // supaya klien tidak perlu menarik seluruh daftar nota hanya untuk satu angka.
      pajakBelumSetor: (function () {
        var nota = KasTunai.getSemuaNota(), n = 0, j;
        for (j = 0; j < nota.length; j++) {
          var x = nota[j];
          if ((Util.num(x.pajakPph) + Util.num(x.pajakPpn)) > 0 && x.setorStatus !== 'SETOR') n++;
        }
        return n;
      })()
    };
  });
}
```

- [ ] **Step 2: Periksa sintaks dan ketiadaan panggilan endpoint→endpoint**

```bash
cd /home/user/kas-tunai
node --check < Code.gs && echo "SINTAKS OK"   # lewat stdin: node menolak ekstensi .gs
sed -n "/function serverGetPapanKerja/,/^}/p" Code.gs | grep -c "server[A-Z]" 
```
Expected: `SINTAKS OK`, lalu angka `0` (nol pemanggilan endpoint lain dari dalam endpoint ini).

- [ ] **Step 3: Buktikan semua modul yang dipanggil benar-benar ada dengan nama itu**

```bash
cd /home/user/kas-tunai
for s in "Anggaran.gs:ringkasSerapan" "ScanInbox.gs:list" "Rekonsiliasi.gs:ringkasan" \
         "AntreanStatus.gs:getSemua" "KasTunai.gs:getTransaksi" "KasTunai.gs:ringkasanSaldo"; do
  f=${s%%:*}; n=${s#*:}
  printf "%-32s " "$s"
  grep -q "^\s*function $n\b" $f && grep -q "$n: *$n" $f && echo "ADA + DIEKSPOR" || echo "PERIKSA MANUAL"
done
grep -c "BATAS_SETOR_TANGGAL" _Config.gs
```
Expected: keenamnya `ADA + DIEKSPOR`, dan `BATAS_SETOR_TANGGAL` ≥ 1.

- [ ] **Step 4: Commit**

```bash
cd /home/user/kas-tunai
git add Code.gs
git commit -m "feat(backend): endpoint agregasi Papan kerja"
```

---

### Task 4: `mobile.html` melaporkan jumlah draft

**Files:**
- Modify: `mobile.html` (fungsi `aqKirimSemua`)

**Interfaces:**
- Consumes: `serverLaporAntrean(token, jumlahDraft, jumlahGagal)` (Task 2), `AQ.semua(cb)` yang sudah ada, variabel token sesi yang sudah dipakai panggilan lain di berkas itu.
- Produces: tidak ada — laporan sepihak, tidak ada tampilan baru.

- [ ] **Step 1: Temukan titik sisip yang benar**

```bash
cd /home/user/kas-tunai
grep -n "function aqKirimSemua" mobile.html
sed -n "$(grep -n 'function aqKirimSemua' mobile.html | cut -d: -f1),+14p" mobile.html
grep -n "serverLaporAntrean\|google.script.run" mobile.html | head -5
```
Variabel token di berkas ini bernama **`_tok`** — sudah diverifikasi, dipakai semua
panggilan `google.script.run` lain di sana.

- [ ] **Step 2: Sisipkan pelaporan**

Di dalam callback `AQ.semua(function(list){ ... })`, **sebagai baris paling awal**, sebelum
penyaringan status `GAGAL` yang sudah ada:

```js
    // Lapor jumlah draft ke server supaya Papan kerja desktop tahu antrean tiap HP.
    // withFailureHandler kosong disengaja: kegagalan lapor status TIDAK boleh
    // mengganggu alur kirim antrean yang sesungguhnya.
    var _nGagal = 0, _i;
    for (_i = 0; _i < list.length; _i++) if (list[_i].status === 'GAGAL') _nGagal++;
    try {
      google.script.run.withFailureHandler(function(){})
        .serverLaporAntrean(_tok, list.length, _nGagal);
    } catch(e) {}
```

Jangan mengubah satu baris pun dari isi callback yang sudah ada — penyisipan ini murni
penambahan di baris paling awal.

- [ ] **Step 3: Periksa sintaks**

```bash
cd /home/user/kas-tunai
node -e "
var fs=require('fs'), s=fs.readFileSync('mobile.html','utf8');
var m=/<script>([\s\S]*)<\/script>/.exec(s); fs.writeFileSync('/tmp/mh.js', m[1]);
" && node --check /tmp/mh.js && echo "SINTAKS OK" && rm -f /tmp/mh.js
```
Expected: `SINTAKS OK`.

- [ ] **Step 4: Buktikan alur lama tidak berubah**

```bash
cd /home/user/kas-tunai
git diff mobile.html | grep "^-" | grep -v "^---" | wc -l
```
Expected: `0` — penyisipan murni penambahan, tidak ada baris lama yang dihapus atau diubah.

- [ ] **Step 5: Commit**

```bash
cd /home/user/kas-tunai
git add mobile.html
git commit -m "feat(mobile): lapor jumlah draft antrean ke server"
```

---

### Task 5: Markup dan CSS `#viewPapan`

**Files:**
- Modify: `index.html` — menu rail (dekat `id="tabTransaksi"`), kontainer view (sebelum `#viewTransaksi`), blok `<style>` bersama

**Interfaces:**
- Consumes: token `--bs-*` di `:root`; kelas `.rail-item`, `.wrap`, `.hidden` yang sudah ada.
- Produces: `#tabPapan` (tombol rail), `#viewPapan` (kontainer), dan `id` berikut yang diisi Task 6: `pkKartu`, `pkTindakan`, `pkPagu`, `pkAntrean`, `pkScan`, `pkRekon`.

- [ ] **Step 1: Tambah menu rail di posisi pertama**

Sisipkan **sebelum** tombol `id="tabTransaksi"`:

```html
    <button id="tabPapan" class="rail-item" onclick="switchTab('papan')">Papan kerja</button>
```

- [ ] **Step 2: Tambah kontainer view sebelum `#viewTransaksi`**

```html
  <div id="viewPapan" class="wrap hidden">
    <div class="pk-grid">
      <div class="pk-main">
        <div id="pkKartu" class="pk-stats"></div>
        <div class="pk-sec">
          <div class="pk-h">Menunggu tindakan Anda</div>
          <div id="pkTindakan"></div>
        </div>
        <div class="pk-sec">
          <div class="pk-h">Sisa pagu paling tipis</div>
          <div class="pk-sub">Tempat pembebanan berikutnya paling mudah melampaui pagu.</div>
          <div id="pkPagu"></div>
        </div>
      </div>
      <div class="pk-side">
        <div id="pkAntrean"></div>
        <div class="pk-sec">
          <div class="pk-h">Kotak masuk scan</div>
          <div id="pkScan"></div>
        </div>
        <div id="pkRekon"></div>
      </div>
    </div>
  </div>
```

- [ ] **Step 3: Tambah CSS di blok `<style>` bersama**

Sisipkan setelah aturan `.wrap` yang sudah ada:

```css
  /* ---- Papan kerja ---- */
  .pk-grid{display:flex;gap:18px;align-items:flex-start}
  .pk-main{flex:1;min-width:0}
  .pk-side{flex:0 0 404px;display:flex;flex-direction:column;gap:14px}
  .pk-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}
  .pk-card{border-radius:20px;padding:20px 22px;background:var(--bs-n200)}
  .pk-card.utama{background:var(--bs-ac);color:var(--bs-paper)}
  .pk-card .lbl{font-size:12px;font-weight:700;opacity:.85;margin-bottom:6px}
  .pk-card .num{font-family:var(--bs-fh);font-weight:600;font-size:24px;
    font-variant-numeric:tabular-nums}
  .pk-card.utama .num{font-size:31px}
  .pk-card .sub{font-size:11.5px;margin-top:4px;color:var(--bs-n600)}
  .pk-card.utama .sub{color:var(--bs-paper);opacity:.9}
  .pk-card .sub.lewat{color:var(--bs-a2);font-weight:700}
  .pk-sec{background:var(--bs-paper);border:1px solid var(--bs-n300);
    border-radius:16px;padding:16px 18px;margin-bottom:16px}
  .pk-h{font-family:var(--bs-fh);font-weight:600;font-size:16px;color:var(--bs-ink)}
  .pk-sub{font-size:12px;color:var(--bs-n600);margin-top:2px;margin-bottom:10px}
  .pk-row{display:grid;align-items:center;gap:10px;min-height:48px;
    padding:6px 8px;border-radius:14px;cursor:pointer}
  .pk-row:hover{background:var(--bs-n200)}
  .pk-row.tindakan{grid-template-columns:1fr 148px 130px}
  .pk-row.pagu{grid-template-columns:1fr 120px}
  .pk-row.pagu.tipis{background:var(--bs-a21)}
  .pk-row .t1{font-size:15px;color:var(--bs-ink)}
  .pk-row .t2{font-size:12px;color:var(--bs-n600);margin-top:2px}
  .pk-row .nom{text-align:right;font-family:var(--bs-fh);font-weight:600;
    font-variant-numeric:tabular-nums}
  .pk-bar{height:7px;width:54px;border-radius:999px;background:var(--bs-n300);
    overflow:hidden;display:inline-block;vertical-align:middle}
  .pk-bar>i{display:block;height:100%;background:var(--bs-ac)}
  .pk-bar.tipis>i{background:var(--bs-a2)}
  .pk-pct{font-size:13px;font-weight:600;margin-left:8px;
    font-variant-numeric:tabular-nums}
  .pk-antre{background:var(--bs-a2);color:var(--bs-paper);border-radius:20px;
    padding:16px 18px}
  .pk-antre .pk-h{color:var(--bs-paper)}
  .pk-tenang{background:var(--bs-n200);border-radius:16px;padding:16px 18px;
    cursor:pointer}
  .pk-kosong{font-size:13px;color:var(--bs-n600);padding:10px 8px}
  @media(max-width:1439px){
    .pk-stats{grid-template-columns:repeat(2,1fr)}
    .pk-card{padding:16px 18px}
    .pk-card .num{font-size:21px}
    .pk-card.utama .num{font-size:26px}
    .pk-side{flex-basis:348px}
  }
```

- [ ] **Step 4: Periksa markup dan token**

```bash
cd /home/user/kas-tunai
for id in tabPapan viewPapan pkKartu pkTindakan pkPagu pkAntrean pkScan pkRekon; do
  printf "%-12s %s\n" "$id" "$(grep -c "id=\"$id\"" index.html)"
done
sed -n '/---- Papan kerja ----/,/@media(max-width:1439px)/p' index.html \
  | grep -oE "#[0-9a-fA-F]{3,6}\b" | sort -u
```
Expected: kedelapan `id` bernilai `1`; pemeriksaan hex **tidak menghasilkan keluaran** (nol warna hardcoded).

- [ ] **Step 5: Commit**

```bash
cd /home/user/kas-tunai
git add index.html
git commit -m "feat(desktop): kerangka dan gaya layar Papan kerja"
```

---

### Task 6: JS render Papan kerja

**Files:**
- Modify: `index.html` — tambah fungsi baru dekat `muatDana()`; ubah `switchTab()` (baris ±1414); ubah pemanggil layar awal

**Interfaces:**
- Consumes: `serverGetPapanKerja` (Task 3); `id` dari Task 5; helper yang sudah ada — `esc()`, `rupiah()`, `todayISO()`, `switchTab()`, `_notTransfer()`.
- Produces: `muatPapanKerja()`, `_pkKriteriaTindakan(t)`, `_pkRenderKartu`, `_pkRenderTindakan`, `_pkRenderPagu`, `_pkRenderAntrean`, `_pkRenderScan`, `_pkRenderRekon`.

- [ ] **Step 1: Tambah `switchTab` menangani `'papan'`**

Di dalam `switchTab(tab)`, tambahkan pada kelompok yang sesuai:

```js
  document.getElementById('viewPapan').classList.toggle('hidden',tab!=='papan');
  document.getElementById('tabPapan').classList.toggle('active',tab==='papan');
```
dan di kelompok pemanggilan data, tambah baris:
```js
  if(tab==='papan') muatPapanKerja();
```

Jangan menyentuh baris `#tbSlot` — `tab!=='transaksi'` sudah benar untuk layar ini.

- [ ] **Step 2: Tulis kriteria "menunggu tindakan"**

```js
/* ============== Papan kerja ============== */
/**
 * Kriteria "Menunggu tindakan Anda" -- 4 kategori yang disetujui pengguna.
 * Rumus sisaPUM DISALIN PERSIS dari mode ringkas hitungNeraca di mobile.html,
 * didokumentasikan docs/HANDOFF-MOBILE.md bagian 2. Bila rumus itu berubah,
 * fungsi ini HARUS ikut diperbarui manual -- ini dua salinan yang sengaja
 * dijaga sama, bukan kebetulan.
 */
function _pkKriteriaTindakan(t){
  var alasan=[];
  if((+t.kredit||0)>0 && !t.noSpby) alasan.push('Belum SPBY');
  if((+t.kredit||0)>0 && (t.pajakKatIdx===null||t.pajakKatIdx===undefined)) alasan.push('Pajak belum diisi');
  if((+t.kredit||0)>0 && _notTransfer(t)){
    var um=(+t.uangDiserahkan>0)?(+t.uangDiserahkan):(+t.kredit||0);
    var sisaPUM=um-(+t.notaTotal||0)-(+t.kembalianTotal||0);
    if(sisaPUM>0) alasan.push('PUM belum bernota');
  }
  if(String(t.statusRekon||'').toUpperCase()==='NILAI_BEDA') alasan.push('Rekon selisih');
  return alasan;
}
```

- [ ] **Step 3: Tulis pemuat dan perendernya**

```js
var pkData=null;

function muatPapanKerja(){
  document.getElementById('pkTindakan').innerHTML='<div class="pk-kosong">Memuat…</div>';
  google.script.run
    .withSuccessHandler(function(res){
      pkData=res;
      _pkRenderKartu(res); _pkRenderTindakan(res); _pkRenderPagu(res);
      _pkRenderAntrean(res); _pkRenderScan(res); _pkRenderRekon(res);
    })
    .withFailureHandler(function(e){
      document.getElementById('pkTindakan').innerHTML=
        '<div class="pk-kosong">Gagal memuat: '+esc(e&&e.message?e.message:String(e))+'</div>';
    })
    .serverGetPapanKerja(_tok);
}

function _pkRenderKartu(res){
  var tx=res.transaksi||[], i, nSpby=0, rpSpby=0;
  for(i=0;i<tx.length;i++){
    var t=tx[i];
    if((+t.kredit||0)>0 && !t.noSpby){ nSpby++; rpSpby+=(+t.kredit||0); }
  }
  // Status setor pajak ada di baris NOTA (sheet Multi Nota), bukan di transaksi --
  // jadi angkanya dihitung di server dan dikirim jadi. Jangan menghitungnya dari
  // field transaksi: t.pajakTotal TIDAK ADA.
  var nPajak=+res.pajakBelumSetor||0;
  var hariIni=new Date().getDate(), batas=+res.batasSetorTanggal||0;
  var lewat=(batas>0 && hariIni>batas);
  // Peran viewer: saldo diredaksi jadi null oleh server -- tampilkan placeholder,
  // BUKAN angka 0 (itu menyesatkan, seolah kasnya kosong).
  var s=res.saldo, adaSaldo=!!s;
  document.getElementById('pkKartu').innerHTML=
     '<div class="pk-card utama"><div class="lbl">Saldo kas tunai</div>'
    +'<div class="num">'+(adaSaldo?rupiah(s.saldoTunai):'—')+'</div>'
    +'<div class="sub">'+(adaSaldo?'per '+esc(todayISO()):'Tidak ditampilkan untuk peran ini')+'</div></div>'
    +'<div class="pk-card"><div class="lbl">Bank / UP</div>'
    +'<div class="num">'+(adaSaldo?rupiah(s.saldoBank):'—')+'</div></div>'
    +'<div class="pk-card"><div class="lbl">Belum di-SPBY</div>'
    +'<div class="num">'+nSpby+'</div><div class="sub">'+rupiah(rpSpby)+'</div></div>'
    +'<div class="pk-card"><div class="lbl">Pajak belum disetor</div>'
    +'<div class="num">'+nPajak+'</div>'
    +'<div class="sub'+(lewat?' lewat':'')+'">batas setor tanggal '+batas
    +(lewat?' — sudah lewat':'')+'</div></div>';
}

function _pkRenderTindakan(res){
  var tx=res.transaksi||[], h='', i, n=0;
  for(i=0;i<tx.length;i++){
    var t=tx[i], al=_pkKriteriaTindakan(t);
    if(!al.length) continue;
    n++;
    h+='<div class="pk-row tindakan" onclick="_pkBukaTransaksi('+(+t.no||0)+')">'
      +'<div><div class="t1">'+esc(t.uraian||'(tanpa uraian)')+'</div>'
      +'<div class="t2">'+esc(String(t.no||''))+(t.penyedia?(' · '+esc(t.penyedia)):'')+'</div></div>'
      +'<div><span class="chip no">'+esc(al[0])+'</span></div>'
      +'<div class="nom">'+rupiah(+t.kredit||0)+'</div></div>';
  }
  document.getElementById('pkTindakan').innerHTML=
    n?h:'<div class="pk-kosong">Tidak ada yang menunggu tindakan.</div>';
}

/**
 * Buka layar Transaksi lalu sorot kartunya. TIDAK ada fungsi "buka detail" di
 * desktop -- layar Transaksi adalah daftar kartu, bukan master-detail. Jadi
 * penanda data-no ditambahkan ke _cardHtml (Step 3b) supaya kartunya bisa
 * ditemukan dan digulir ke tengah layar.
 */
function _pkBukaTransaksi(no){
  switchTab('transaksi');
  setTimeout(function(){
    var el=document.querySelector('.tcard[data-no="'+no+'"]');
    if(!el) return;
    el.scrollIntoView({behavior:'smooth',block:'center'});
    el.classList.add('pk-sorot');
    setTimeout(function(){ el.classList.remove('pk-sorot'); }, 2200);
  }, 60);
}

function _pkRenderPagu(res){
  var top=(res.serapan&&res.serapan.top5)||[], h='', i;
  if(!top.length){
    document.getElementById('pkPagu').innerHTML='<div class="pk-kosong">Belum ada data pagu.</div>';
    return;
  }
  for(i=0;i<top.length;i++){
    var a=top[i], pct=Math.round((+a.persen||0)*100);
    // Ambang '>' bukan '>=': 90% pas TIDAK tersorot.
    var tipis=((+a.persen||0)>0.9);
    h+='<div class="pk-row pagu'+(tipis?' tipis':'')+'" onclick="switchTab(\'dana\')">'
      +'<div><div class="t1">'+esc(a.akun)+(a.uraian?(' · '+esc(a.uraian)):'')+'</div>'
      +'<div class="t2">sisa '+rupiah(+a.sisa||0)+'</div></div>'
      +'<div><span class="pk-bar'+(tipis?' tipis':'')+'"><i style="width:'
      +Math.min(100,Math.max(0,pct))+'%"></i></span>'
      +'<span class="pk-pct">'+pct+'%</span></div></div>';
  }
  document.getElementById('pkPagu').innerHTML=h;
}

function _pkRenderAntrean(res){
  var a=res.antreanSemua||[], h='', i;
  if(!a.length){
    // BUKAN angka 0 per staf -- itu menyesatkan, seolah semua sudah sinkron
    // padahal sebenarnya cuma belum melapor.
    document.getElementById('pkAntrean').innerHTML=
      '<div class="pk-antre"><div class="pk-h">Antrean HP</div>'
      +'<div class="pk-kosong" style="color:inherit;opacity:.9">Belum ada laporan terbaru dari HP.</div></div>';
    return;
  }
  for(i=0;i<a.length;i++){
    h+='<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0">'
      +'<span>'+esc(a[i].email)+'</span><span><b>'+(+a[i].jumlahDraft||0)+'</b> draft'
      +((+a[i].jumlahGagal||0)>0?(' · <b>'+(+a[i].jumlahGagal)+'</b> gagal'):'')+'</span></div>';
  }
  document.getElementById('pkAntrean').innerHTML=
    '<div class="pk-antre"><div class="pk-h">Antrean HP</div>'+h+'</div>';
}

function _pkRenderScan(res){
  var s=res.scanTerbaru||[], h='', i;
  if(!s.length){
    document.getElementById('pkScan').innerHTML='<div class="pk-kosong">Tidak ada berkas scan terbaru.</div>';
    return;
  }
  for(i=0;i<s.length;i++){
    h+='<div class="pk-row" style="grid-template-columns:1fr auto">'
      +'<div><div class="t1">'+esc(s[i].nama||s[i].name||'(tanpa nama)')+'</div>'
      +'<div class="t2">'+esc(String(s[i].tanggal||s[i].updated||''))+'</div></div>'
      +'<div><span class="chip no">Belum dikaitkan</span></div></div>';
  }
  document.getElementById('pkScan').innerHTML=h;
}

function _pkRenderRekon(res){
  var r=res.rekon||{}, c=r.counts||{};
  var beda=+c.nilaiBeda||0;
  document.getElementById('pkRekon').innerHTML=
     '<div class="pk-tenang" onclick="switchTab(\'rekon\')"><div class="pk-h">Kartu ketenangan</div>'
    +'<div class="t2" style="margin-top:6px">'
    +(+c.cocok||0)+' cocok · '+(+c.belum||0)+' belum · '
    +'<b'+(beda>0?' style="color:var(--bs-a2)"':'')+'>'+beda+'</b> selisih nilai</div>'
    +'<div class="t2">'+(r.lastImport?('Impor terakhir: '+esc(String(r.lastImport)))
                                     :'Belum ada impor rekening koran')+'</div></div>';
}
```

- [ ] **Step 3b: Tambah penanda nomor pada kartu transaksi**

Di `_cardHtml`, tambahkan atribut `data-no` pada `<div class="tcard ...">` yang sudah ada:

```js
'<div class="tcard '+st+'" data-no="'+(+t.no||0)+'">'
```

Ini satu-satunya perubahan di luar `#viewPapan` yang dibolehkan tugas ini, dan tanpa itu
klik dari daftar tindakan tidak bisa menemukan kartunya. Tambahkan juga aturan sorot ke
blok `<style>`:

```css
  .tcard.pk-sorot{outline:3px solid var(--bs-ac);outline-offset:2px}
```

- [ ] **Step 4: Ubah layar pembuka jadi Papan kerja**

Temukan pemanggilan `switchTab('transaksi')` yang menentukan layar awal setelah dashboard
termuat, dan ganti argumennya jadi `'papan'`:

```bash
cd /home/user/kas-tunai
grep -n "switchTab('transaksi')" index.html
```
Ubah **hanya** pemanggilan yang berperan sebagai layar awal — jangan mengubah yang dipanggil
dari tombol atau dari `_pkBukaTransaksi`.

- [ ] **Step 5: Periksa sintaks dan bug kutip**

```bash
cd /home/user/kas-tunai
node -e "
var fs=require('fs'), s=fs.readFileSync('index.html','utf8');
var m=/<script>([\s\S]*)<\/script>/.exec(s); fs.writeFileSync('/tmp/ih.js', m[1]);
" && node --check /tmp/ih.js && echo "SINTAKS OK" && rm -f /tmp/ih.js
sed -n '/<div id="viewPapan"/,/^  <\/div>/p' index.html | grep -oE "on(click|change)=\"[^\"]*\"" | sort -u
```
Expected: `SINTAKS OK`. Periksa tiap `onclick` yang tercetak — pastikan tidak ada kutip yang
menutup lebih awal (pelajaran `docs/HANDOFF-MOBILE.md` bagian 1).

- [ ] **Step 6: Commit**

```bash
cd /home/user/kas-tunai
git add index.html
git commit -m "feat(desktop): render Papan kerja dan jadikan layar pembuka"
```

---

### Task 7: Verifikasi Playwright klik nyata

**Files:**
- Create: skrip uji di scratchpad (jangan di repo)

**Interfaces:**
- Consumes: seluruh hasil Task 5-6.
- Produces: bukti terukur untuk 12 skenario spec bagian 5.

- [ ] **Step 1: Siapkan halaman yang bisa dirender**

Salin `index.html` ke scratchpad, bersihkan scriptlet GAS `<?= ... ?>`, lalu muat lewat
`page.goto('file://...')` — **jangan** `page.setContent()`: origin `about:blank` membuat
`localStorage` melempar `Access denied` dan menghentikan skrip di tengah. Sediakan stub
`google.script.run` yang mengembalikan data uji untuk `serverGetPapanKerja`.

Data uji wajib memuat, minimal:
- satu transaksi memenuhi **tiap** dari 4 kriteria (satu per kriteria, boleh terpisah);
- satu transaksi yang **tidak** memenuhi kriteria apa pun;
- `serapan.top5` berisi 5 akun, salah satunya `persen` **tepat 0.90** dan satunya `0.95`;
- `scanTerbaru` 3 entri; `antreanSemua` 2 entri, salah satunya `jumlahGagal>0`;
- `rekon.counts.nilaiBeda` > 0 dan `rekon.lastImport` terisi.

- [ ] **Step 2: Jalankan 12 asersi**

Semua lewat **klik sungguhan** (`page.click`), bukan `page.evaluate` memanggil fungsi:

1. Buka aplikasi → `#viewPapan` terlihat, `#viewTransaksi` tersembunyi, `#tabPapan` ber-`active`.
2. Keempat kartu terisi; kartu 1 `background` = `rgb(0, 136, 176)`, teks `rgb(255, 255, 255)`.
3. `#pkTindakan` memuat tepat sejumlah baris transaksi yang memenuhi kriteria; transaksi yang tidak memenuhi **tidak** ada.
4. Klik baris pertama `#pkTindakan` → `#viewTransaksi` terlihat, `#viewPapan` tersembunyi, **dan** kartu ber-`data-no` yang sesuai mendapat kelas `pk-sorot`.
5. `#pkPagu` memuat 5 baris; yang `persen=0.95` ber-`background` `rgb(255, 241, 244)`; yang **tepat 0.90 TIDAK** tersorot (uji ambang `>`, bukan `>=`).
6. Klik baris `#pkPagu` → `#viewDana` terlihat.
7. `#pkRekon` menampilkan angka `nilaiBeda` dengan `color` `rgb(214, 0, 108)`; klik → `#viewRekon` terlihat.
8. Dengan `saldo:null` (peran viewer) → kartu 1 dan 2 menampilkan `—`, bukan `Rp 0`.
9. Tiap keadaan kosong (pagu, scan, antrean, tindakan, `lastImport`) menampilkan kalimatnya masing-masing; `page.on('pageerror')` **nol galat baru**.
10. Viewport 1366px → `.pk-stats` `grid-template-columns` menghasilkan 2 kolom; `.pk-side` lebar 348px.
11. Cetak seluruh `onclick`/`onchange` di `#viewPapan` dan periksa tidak ada bug kutip.
12. Kartu antrean menampilkan jumlah gagal **terpisah** dari jumlah draft.

- [ ] **Step 3: Skrip tema tidak boleh mundur**

```bash
cd /home/user/kas-tunai
node /tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-tema-ui.js 2>&1 | grep -c "^PASS"
node /tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-tema-ui.js 2>&1 | grep -c "^FAIL"
```
Expected: **22** lalu **0**. Skrip itu selalu mencetak 8 baris `GALAT HALAMAN` dan keluar
dengan exit code bukan-nol — itu kondisi pra-ada, bukan kegagalan.

- [ ] **Step 4: Simpan bukti dan commit bila ada perbaikan**

Simpan tangkapan layar ke scratchpad. Bila Step 2 menemukan cacat, perbaiki di `index.html`
lalu ulangi seluruh asersi sebelum melanjutkan.

```bash
cd /home/user/kas-tunai
git add index.html
git commit -m "fix(desktop): perbaikan hasil verifikasi Papan kerja"
```
(Lewati commit ini bila tidak ada perbaikan.)

---

### Task 8: Perbarui dokumen acuan

**Files:**
- Modify: `docs/HANDOFF-DESKTOP.md` (papan status, urutan-11)
- Modify: `docs/HANDOFF-MOBILE.md` (bagian 4 dan papan status)
- Modify: `docs/superpowers/specs/2026-07-28-papan-kerja-desktop-design.md` (bagian Status)

**Interfaces:**
- Consumes: hasil Task 1-7.
- Produces: dokumen yang menyatakan keadaan sebenarnya.

- [ ] **Step 1: Perbarui papan status desktop**

Di `docs/HANDOFF-DESKTOP.md`, tandai tugas urutan-11 (Papan kerja) selesai. Tulis jujur:
kode selesai dan diverifikasi otomatis lewat Playwright, **belum diuji manual di browser
sungguhan** — itu baru terjadi setelah pengguna menjalankan `deploy.bat`. Sebutkan juga
layar pembuka berubah dari Transaksi ke Papan kerja.

- [ ] **Step 2: Catat perubahan lintas dokumen di handoff mobile**

Di `docs/HANDOFF-MOBILE.md`, catat bahwa `aqKirimSemua` kini melaporkan jumlah draft ke
`serverLaporAntrean` setiap kali antrean dikirim, tanpa tampilan baru, dan kegagalan lapor
sengaja diabaikan agar tidak mengganggu alur kirim. Sebutkan bahwa `_pkKriteriaTindakan`
di `index.html` menyalin rumus `sisaPUM` dari bagian 2 dokumen itu, sehingga **perubahan
rumus wajib diterapkan ke dua tempat**.

- [ ] **Step 3: Tutup spec**

Ubah bagian **Status** spec dari "Belum boleh dieksekusi" menjadi selesai, dengan tanggal
dan daftar commit-nya.

- [ ] **Step 4: Commit**

```bash
cd /home/user/kas-tunai
git add docs/
git commit -m "docs: catat Papan kerja selesai di papan status"
```

---

## Kasus tepi yang wajib tertangani (spec bagian 4)

| Keadaan | Yang harus tampil | Task |
|---|---|---|
| Peran `viewer` (`saldo:null`) | kartu 1 & 2 menampilkan `—`, bukan `Rp 0` | 6 |
| `ketersediaan().items` kosong | "Belum ada data pagu." | 6 |
| `scanTerbaru` kosong | "Tidak ada berkas scan terbaru." | 6 |
| `antreanSemua` kosong | "Belum ada laporan terbaru dari HP." — **bukan** 0 per staf | 6 |
| `rekon.lastImport` kosong | "Belum ada impor rekening koran" | 6 |
| Tidak ada yang menunggu tindakan | "Tidak ada yang menunggu tindakan." | 6 |
