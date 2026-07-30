# Hak Akses per Peran — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin bisa mengatur, per peran dan per layar, apakah sebuah layar **tidak terlihat**, **hanya bisa dilihat**, atau **boleh diubah** — dan penjagaannya berlaku di server, bukan cuma menyembunyikan tombol.

**Architecture:** Satu modul `HakAkses.gs` menyimpan matriks izin di `PropertiesService` (lewat `Settings` yang sudah ada) dan menyediakan `boleh(role, layar, level)`. Setiap endpoint tulis dan baca dibungkus penjaga yang melempar galat bila tidak berhak. Frontend menerima matriksnya lalu menyembunyikan menu dan tombol — itu kenyamanan, bukan pengamanan.

**Tech Stack:** Google Apps Script ES5 (`.gs`), vanilla JS satu berkas (`index.html`), tanpa build step.

---

## Global Constraints

- **Backend ES5.** Semua `.gs` pakai `var` + `function`. Tanpa `let`, `const`, arrow, template literal, `Promise`, `class`, `Object.keys`, `Array.forEach`/`map`/`filter`.
- **Frontend vanilla JS**, tanpa framework, tanpa build step, tanpa dependency baru.
- **Menambah berkas `.gs` berarti mendaftarkannya di `filePushOrder` `.clasp.json`**, sebelum `Code.gs`.
- **Endpoint tidak boleh memanggil endpoint.** Panggil fungsi modulnya langsung.
- **Tidak ada warna baru.** Hanya token `--bs-*` yang sudah ada.
- **Bahasa UI Indonesia.** Target klik minimal 40px.
- **Commit:** Conventional Commits, subjek Bahasa Indonesia, imperatif, < 72 karakter.

---

## Keputusan yang sudah disetujui pengguna (30 Jul 2026)

| Topik | Keputusan |
|---|---|
| Kerincian | **Per layar + hak tulis.** Tiap peran × layar bernilai `tidak` / `lihat` / `ubah`. |
| Peran | **Tiga peran yang sudah ada** (`admin`, `full`, `viewer`) diubah isinya. Tidak membuat peran baru. |

---

## Kenapa ini dikerjakan — keadaan sekarang

Ditemukan saat menjawab pertanyaan pengguna, **diverifikasi terhadap `Code.gs`**:

- Dari **76 endpoint, hanya 10 memeriksa peran**, semuanya sekadar "apakah admin".
- **28 endpoint tulis tidak memeriksa peran sama sekali**, termasuk seluruh penghapusan
  (`serverHapusNotaItem`, `serverHapusFotoNota`, `serverHapusPengembalian`,
  `serverHapusSpby`, `serverHapusKuitansi`, `serverHapusBuktiPD`) dan seluruh impor
  (`serverImporPagu`, `serverImporBank`, `serverImporSakti`).
- Satu-satunya yang benar-benar dibatasi untuk `viewer` adalah **saldo**
  (`saldo: full ? ... : null` + `delete tx[i].saldo`).
- Peran di luar tiga nama itu **diam-diam menjadi `viewer`** (`Users.gs::_validRole`).

Artinya seorang staf beperan `viewer` — yang dimaksudkan "hanya melihat" — sebenarnya
bisa menghapus nota dan mengimpor pagu. Rencana ini menutup itu.

---

## Model izin

**Delapan layar** (sesuai `switchTab`, plus satu semu untuk saldo):

`papan`, `transaksi`, `pajak`, `dana`, `spd`, `rekon`, `laporan`, `saldo`

**Tiga tingkat**, berurut naik: `'tidak'` < `'lihat'` < `'ubah'`.

`saldo` hanya mengenal `tidak` / `lihat` (tidak ada yang "mengubah saldo").

**Bawaan** — dipakai bila belum pernah diatur, dan **wajib sama dengan perilaku hari ini**
supaya pemasangan tidak mengubah apa pun sampai admin menyetelnya:

```js
admin  : semua layar 'ubah', saldo 'lihat'
full   : semua layar 'ubah', saldo 'lihat'
viewer : semua layar 'ubah', saldo 'tidak'
```

> `viewer` sengaja bawaan `'ubah'`, **bukan** `'lihat'`. Itu memang keadaan hari ini.
> Menurunkannya otomatis akan mengunci staf yang sedang bekerja tanpa peringatan.
> Admin yang memutuskan kapan mengetatkannya, lewat layar baru ini.

**Admin tidak bisa mengunci dirinya sendiri:** apa pun isi matriks, peran `admin` selalu
diperlakukan `'ubah'` untuk semua layar. Dijaga di server, bukan di UI.

---

## Peta endpoint → layar

Dipakai Task 2. **Ini daftar lengkapnya** — jangan menebak yang tidak tercantum.

| Layar | Endpoint **tulis** (butuh `ubah`) | Endpoint **baca** (butuh `lihat`) |
|---|---|---|
| `transaksi` | `serverTambahTransaksi`, `serverUpdateTransaksi`, `serverKonversiPindahDana`, `serverPindahDana`, `serverPecahTransaksi`, `serverTambahNota`, `serverUpdateNota`, `serverHapusNotaItem`, `serverRestoreNota`, `serverUploadFotoNota`, `serverUploadFotoBarang`, `serverHapusFotoNota`, `serverUpdateFotoNota`, `serverUploadKuitansi`, `serverHapusKuitansi`, `serverSimpanSpby`, `serverHapusSpby`, `serverSpbyGabungan`, `serverTambahPengembalian`, `serverHapusPengembalian`, `serverRestorePengembalian`, `serverSimpanPenyedia`, `serverSimpanNoHpPUM`, `serverArchiveScan` | `serverGetTransaksi`, `serverGetMultiNota`, `serverGetSemuaNota`, `serverGetNotaDanFoto`, `serverGetFotoNota`, `serverGetJmlFotoPerTransaksi`, `serverGetPengembalian`, `serverGetPetaPUM`, `serverCariPenyedia`, `serverGetAllPenyedia`, `serverListScan`, `serverGetScanFile`, `serverScanAktif` |
| `pajak` | `serverSimpanPajak`, `serverSimpanPajakNota`, `serverTandaiSetorPajak` | `serverGetNotaPajak` |
| `dana` | `serverImporPagu` | `serverGetPagu`, `serverKetersediaanDana` |
| `spd` | `serverSimpanPerjalananDinas`, `serverUpdatePerjalananDinas`, `serverBatalkanPd`, `serverUploadBuktiPD`, `serverHapusBuktiPD` | `serverGetSuratTugas`, `serverGetBuktiPD`, `serverZipBuktiPD` |
| `rekon` | `serverImporBank`, `serverImporSakti`, `serverCocokRekon`, `serverBackfillKuitansi` | `serverRingkasanRekon`, `serverParseRekKoran` |
| `laporan` | — | `serverGetRekap`, `serverGetSpjData` |
| `papan` | — | `serverGetPapanKerja` |

**Sengaja TIDAK dijaga** (dan alasannya):

- `serverLogin`, `serverLogout`, `serverGantiPassword` — milik sesi, bukan layar.
  Mengunci ganti-password akan mengunci orang dari akunnya sendiri.
- `serverGetDashboard` — dipakai semua layar; redaksi saldonya sudah ada dan tetap.
- `serverGetInstansi` — identitas satker, dipakai kop cetak.
- `serverLaporAntrean` — laporan sepihak dari HP, bukan tindakan pengguna.
- `serverPerbaikiHeader` — pemeliharaan skema.
- Sepuluh endpoint yang sudah `khusus admin` — biarkan apa adanya.

---

## Struktur berkas

| Berkas | Peran | Task |
|---|---|---|
| `HakAkses.gs` | **BARU** — matriks izin + `boleh()` | 1 |
| `.clasp.json` | daftarkan `HakAkses.gs` | 1 |
| `Code.gs` | penjaga `_butuh()` di tiap endpoint + 2 endpoint baru | 2, 3 |
| `index.html` | layar pengaturan admin + penerapan di UI | 4, 5 |
| `docs/HANDOFF-DESKTOP.md` | catat fitur & bawaannya | 6 |

---

### Task 1: Modul `HakAkses`

**Files:**
- Create: `HakAkses.gs`
- Modify: `.clasp.json`

**Interfaces:**
- Consumes: `Settings.get(key, dflt)` / `Settings.set(key, val)` (`Settings.gs`, berbasis `PropertiesService`).
- Produces: `HakAkses.ambil()` → matriks lengkap; `HakAkses.simpan(matriks)`; `HakAkses.boleh(role, layar, minimal)` → boolean.

- [ ] **Step 1: Tulis modulnya**

```js
/**
 * HakAkses.gs
 * Matriks izin per peran x layar. Disimpan di PropertiesService lewat Settings
 * (bukan sheet) -- isinya kecil, jarang berubah, dan dibaca di hampir tiap request.
 */
var HakAkses = (function () {
  var KUNCI  = 'HAK_AKSES_V1';
  var LAYAR  = ['papan','transaksi','pajak','dana','spd','rekon','laporan','saldo'];
  var PERAN  = ['admin','full','viewer'];
  var TINGKAT = { tidak: 0, lihat: 1, ubah: 2 };

  /**
   * Bawaan WAJIB sama dengan perilaku sebelum fitur ini ada: semua peran boleh
   * mengubah semua layar, hanya saldo yang tertutup untuk viewer. Menurunkan
   * viewer jadi 'lihat' secara otomatis akan mengunci staf yang sedang bekerja
   * tanpa ada yang memutuskannya -- itu keputusan admin, bukan keputusan pemasangan.
   */
  function _bawaan() {
    var m = {}, i, j;
    for (i = 0; i < PERAN.length; i++) {
      m[PERAN[i]] = {};
      for (j = 0; j < LAYAR.length; j++) m[PERAN[i]][LAYAR[j]] = 'ubah';
      m[PERAN[i]].saldo = (PERAN[i] === 'viewer') ? 'tidak' : 'lihat';
    }
    return m;
  }

  function ambil() {
    var s = Settings.get(KUNCI, '');
    var m = _bawaan();
    if (!s) return m;
    var tersimpan;
    try { tersimpan = JSON.parse(s); } catch (e) { return m; }   // rusak -> pakai bawaan
    var i, j, p, l;
    for (i = 0; i < PERAN.length; i++) {
      p = PERAN[i];
      if (!tersimpan[p]) continue;
      for (j = 0; j < LAYAR.length; j++) {
        l = LAYAR[j];
        if (TINGKAT[tersimpan[p][l]] !== undefined) m[p][l] = tersimpan[p][l];
      }
    }
    return m;
  }

  function simpan(matriks) {
    var bersih = _bawaan(), i, j, p, l;
    matriks = matriks || {};
    for (i = 0; i < PERAN.length; i++) {
      p = PERAN[i];
      if (!matriks[p]) continue;
      for (j = 0; j < LAYAR.length; j++) {
        l = LAYAR[j];
        if (TINGKAT[matriks[p][l]] !== undefined) bersih[p][l] = matriks[p][l];
      }
    }
    // Saldo tidak mengenal 'ubah' -- tidak ada yang "mengubah saldo".
    for (i = 0; i < PERAN.length; i++)
      if (bersih[PERAN[i]].saldo === 'ubah') bersih[PERAN[i]].saldo = 'lihat';
    // Admin TIDAK BOLEH mengunci dirinya sendiri. Dipaksa di sini, bukan di UI.
    for (j = 0; j < LAYAR.length; j++) bersih.admin[LAYAR[j]] = 'ubah';
    bersih.admin.saldo = 'lihat';
    Settings.set(KUNCI, JSON.stringify(bersih));
    return { success: true, matriks: bersih };
  }

  /** minimal = 'lihat' atau 'ubah'. Peran admin selalu lolos. */
  function boleh(role, layar, minimal) {
    role = String(role || 'viewer').toLowerCase();
    if (role === 'admin') return true;
    var m = ambil();
    var punya = (m[role] && m[role][layar]) ? m[role][layar] : 'tidak';
    return (TINGKAT[punya] || 0) >= (TINGKAT[minimal] || 0);
  }

  return { ambil: ambil, simpan: simpan, boleh: boleh, LAYAR: LAYAR, PERAN: PERAN };
})();
```

- [ ] **Step 2: Daftarkan di `.clasp.json`**

Sisipkan `'HakAkses.gs'` ke `filePushOrder`, **sesudah** `'Settings.gs'` (modul ini
memakainya) dan **sebelum** `'Code.gs'`.

- [ ] **Step 3: Periksa sintaks dan pendaftaran**

```bash
cd /home/user/kas-tunai
node --check < HakAkses.gs && echo "SINTAKS OK"   # stdin: node menolak ekstensi .gs
grep -nE "\b(let|const|=>|class )" HakAkses.gs | grep -v "^\s*[0-9]*:\s*//" || echo "ES5 BERSIH"
python3 -c "
import json; f=json.load(open('.clasp.json'))['filePushOrder']
assert 'HakAkses.gs' in f, 'BELUM terdaftar'
assert f.index('HakAkses.gs') > f.index('Settings.gs'), 'harus sesudah Settings.gs'
assert f.index('HakAkses.gs') < f.index('Code.gs'), 'harus sebelum Code.gs'
print('PUSH ORDER OK')"
```

- [ ] **Step 4: Uji logika lewat node**

Di scratchpad (`/tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/`,
**jangan** di repo), salin badan modul, suntikkan `Settings` tiruan berbasis objek, lalu:

```js
var _p={};
var Settings={get:function(k,d){return _p[k]===undefined?d:_p[k];},set:function(k,v){_p[k]=v;}};
// ... salin badan HakAkses di sini ...

// 1. Bawaan = perilaku hari ini
var m=HakAkses.ambil();
if(m.viewer.transaksi!=='ubah') throw new Error('bawaan viewer harus ubah');
if(m.viewer.saldo!=='tidak')    throw new Error('bawaan viewer saldo harus tidak');
if(m.full.saldo!=='lihat')      throw new Error('bawaan full saldo harus lihat');
console.log('LULUS bawaan');

// 2. Simpan lalu baca kembali
HakAkses.simpan({viewer:{transaksi:'lihat', dana:'tidak', pajak:'ubah'}});
var m2=HakAkses.ambil();
if(m2.viewer.transaksi!=='lihat') throw new Error('simpan transaksi gagal');
if(m2.viewer.dana!=='tidak')      throw new Error('simpan dana gagal');
if(m2.viewer.laporan!=='ubah')    throw new Error('layar yang tak disebut harus tetap bawaan');
console.log('LULUS simpan-baca');

// 3. Admin tidak bisa dikunci
HakAkses.simpan({admin:{transaksi:'tidak', dana:'tidak', saldo:'tidak'}});
var m3=HakAkses.ambil();
if(m3.admin.transaksi!=='ubah') throw new Error('admin terkunci -- TIDAK BOLEH');
if(!HakAkses.boleh('admin','dana','ubah')) throw new Error('boleh() admin harus selalu true');
console.log('LULUS admin tak bisa mengunci diri');

// 4. Tingkat berjenjang
HakAkses.simpan({viewer:{transaksi:'lihat'}});
if(!HakAkses.boleh('viewer','transaksi','lihat')) throw new Error('lihat harus boleh');
if( HakAkses.boleh('viewer','transaksi','ubah'))  throw new Error('ubah TIDAK boleh');
HakAkses.simpan({viewer:{transaksi:'tidak'}});
if( HakAkses.boleh('viewer','transaksi','lihat')) throw new Error('tidak berarti tidak lihat');
console.log('LULUS jenjang tingkat');

// 5. Nilai ngawur & data rusak tidak melumpuhkan
HakAkses.simpan({viewer:{transaksi:'ngawur'}});
if(HakAkses.ambil().viewer.transaksi!=='ubah') throw new Error('nilai ngawur harus jatuh ke bawaan');
_p['HAK_AKSES_V1']='{bukan json';
if(HakAkses.ambil().viewer.transaksi!=='ubah') throw new Error('JSON rusak harus jatuh ke bawaan');
console.log('LULUS tahan nilai ngawur');

// 6. Saldo tidak mengenal 'ubah'
_p={}; HakAkses.simpan({full:{saldo:'ubah'}});
if(HakAkses.ambil().full.saldo!=='lihat') throw new Error('saldo ubah harus turun jadi lihat');
console.log('LULUS saldo tanpa ubah');
console.log('\nSEMUA ASERSI LULUS');
```

Run: `node <berkas>.js` → semua baris `LULUS` lalu `SEMUA ASERSI LULUS`.

- [ ] **Step 5: Commit**

```bash
cd /home/user/kas-tunai
git add HakAkses.gs .clasp.json
git commit -m "feat(backend): modul hak akses per peran dan layar"
```

---

### Task 2: Penjaga di endpoint

**Files:**
- Modify: `Code.gs`

**Interfaces:**
- Consumes: `HakAkses.boleh(role, layar, minimal)` (Task 1).
- Produces: helper `_butuh(auth, layar, minimal)` yang melempar `Error` bila tidak berhak.

- [ ] **Step 1: Tulis helper, tepat setelah `_run`**

```js
/**
 * Penjaga hak akses. Dipanggil di AWAL badan endpoint, di dalam _run.
 * Melempar galat yang terbaca pengguna -- frontend sudah menampilkan pesan
 * galat apa adanya, jadi tidak perlu penanganan khusus.
 *
 * Ini penjaga yang SESUNGGUHNYA. Menyembunyikan menu di frontend hanya
 * kenyamanan; siapa pun yang tahu nama endpoint bisa memanggilnya langsung.
 */
function _butuh(auth, layar, minimal) {
  if (!HakAkses.boleh(auth.role, layar, minimal)) {
    throw new Error('Akses ditolak: peran Anda tidak berhak ' +
      (minimal === 'ubah' ? 'mengubah' : 'membuka') + ' bagian ini.');
  }
}
```

- [ ] **Step 2: Pasang penjaga sesuai peta endpoint→layar**

Untuk **tiap** endpoint di tabel "Peta endpoint → layar" di atas, sisipkan satu baris
sebagai **pernyataan pertama** di dalam `_run(token, function (auth) { ... })`:

```js
_butuh(auth, '<layar>', 'ubah');    // untuk kolom tulis
_butuh(auth, '<layar>', 'lihat');   // untuk kolom baca
```

Contoh utuh:

```js
function serverHapusNotaItem(token, no, urutan) {
  return _run(token, function (auth) {
    _butuh(auth, 'transaksi', 'ubah');
    return KasTunai.hapusNotaItem(no, urutan);
  });
}
```

**Jangan** menyentuh endpoint di daftar "Sengaja TIDAK dijaga", dan **jangan** mengubah
sepuluh endpoint yang sudah memeriksa `khusus admin`.

- [ ] **Step 3: Buktikan cakupannya lengkap dan tidak berlebih**

```bash
cd /home/user/kas-tunai
node --check < Code.gs && echo "SINTAKS OK"
echo "--- endpoint dengan penjaga ---"; grep -c "_butuh(auth" Code.gs
echo "--- endpoint tulis yang MASIH tanpa penjaga (harus kosong) ---"
for f in $(grep -oE "^function server[A-Za-z]+" Code.gs | sed 's/function //'); do
  b=$(sed -n "/^function $f(/,/^}/p" Code.gs)
  echo "$b" | grep -q "_butuh(auth\|khusus admin" && continue
  case $f in serverTambah*|serverUpdate*|serverHapus*|serverSimpan*|serverImpor*|\
             serverUpload*|serverKonversi*|serverBatalkan*|serverCocok*|serverBackfill*|\
             serverArchive*|serverPecah*|serverPindah*|serverRestore*|serverSpby*|serverTandai*)
    echo "  BOLONG: $f";; esac
done
echo "(selesai)"
```
Expected: `SINTAKS OK`, jumlah penjaga sesuai tabel, dan **tidak ada baris `BOLONG:`**.

- [ ] **Step 4: Uji penjaga lewat node**

Di scratchpad, muat `HakAkses` + `_butuh` dengan `Settings` tiruan, lalu buktikan:
`viewer` bertingkat `'lihat'` pada `transaksi` **boleh** `lihat` dan **ditolak** `ubah`;
`admin` lolos meski matriksnya disetel `'tidak'`; pesan galatnya memuat kata
"Akses ditolak". Laporkan ketiga hasilnya.

- [ ] **Step 5: Commit**

```bash
cd /home/user/kas-tunai
git add Code.gs
git commit -m "feat(backend): jaga endpoint sesuai hak akses peran"
```

---

### Task 3: Endpoint baca & simpan matriks

**Files:**
- Modify: `Code.gs`

**Interfaces:**
- Produces: `serverGetHakAkses(token)` → `{matriks, layar, peran}`; `serverSimpanHakAkses(token, matriks)` → `{success, matriks}`.

- [ ] **Step 1: Tulis kedua endpoint**

```js
/** Matriks hak akses — dibaca semua peran (frontend perlu tahu haknya sendiri). */
function serverGetHakAkses(token) {
  return _run(token, function (auth) {
    return { matriks: HakAkses.ambil(), layar: HakAkses.LAYAR,
             peran: HakAkses.PERAN, peranSaya: auth.role };
  });
}

/** Ubah matriks — khusus admin. */
function serverSimpanHakAkses(token, matriks) {
  return _run(token, function (auth) {
    if (auth.role !== 'admin') throw new Error('Akses ditolak: khusus admin');
    return HakAkses.simpan(matriks);
  });
}
```

- [ ] **Step 2: Kirim matriks bersama dashboard**

Di `serverGetDashboard` dan `serverGetPapanKerja`, tambahkan satu field ke objek yang
dikembalikan supaya frontend tidak perlu panggilan terpisah saat memuat:

```js
      hakSaya: HakAkses.ambil()[role] || null,
```

- [ ] **Step 3: Periksa**

```bash
cd /home/user/kas-tunai
node --check < Code.gs && echo "SINTAKS OK"
grep -c "serverGetHakAkses\|serverSimpanHakAkses" Code.gs
sed -n "/function serverSimpanHakAkses/,/^}/p" Code.gs | grep -c "khusus admin"
grep -c "hakSaya:" Code.gs
```
Expected: `SINTAKS OK`; endpoint ada; `khusus admin` = 1; `hakSaya:` = 2.

- [ ] **Step 4: Commit**

```bash
cd /home/user/kas-tunai
git add Code.gs
git commit -m "feat(backend): endpoint baca dan simpan matriks hak akses"
```

---

### Task 4: Layar pengaturan hak akses (admin)

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `serverGetHakAkses`, `serverSimpanHakAkses` (Task 3); token `_tok`; helper `esc()`, `toast()`, `openModal()`.
- Produces: tombol `#btnHak` di menu akun, modal `#modalHak`, fungsi `bukaModalHak()`, `simpanHakAkses()`.

- [ ] **Step 1: Tambah tombol di menu akun**

Di dekat `id="btnUsers"` (yang sudah hanya tampil untuk admin), sisipkan:

```html
      <button id="btnHak" class="hidden" onclick="bukaModalHak()">&#128274; Hak Akses</button>
```

Lalu di `_applyRoleUI()` tambahkan satu baris mengikuti pola yang sudah ada:

```js
  var bh=document.getElementById('btnHak'); if(bh) bh.classList.toggle('hidden', !IS_ADMIN);
```

- [ ] **Step 2: Tambah modal**

```html
  <div id="modalHak" class="modal">
    <div class="sheet" style="max-width:720px">
      <div class="sheet-h">&#128274; Hak Akses per Peran</div>
      <div class="tgl" style="margin-bottom:10px">
        Atur tiap peran boleh melihat atau mengubah layar mana. Peran <b>admin</b>
        selalu berhak penuh dan tidak bisa dibatasi.
      </div>
      <div id="hakIsi"></div>
      <div class="sheet-f">
        <button class="btn ghost" onclick="closeModal('modalHak')">Batal</button>
        <button class="btn" onclick="simpanHakAkses()">Simpan</button>
      </div>
    </div>
  </div>
```

- [ ] **Step 3: Tulis JS-nya**

```js
/* ===== Hak akses per peran ===== */
var _hakData=null;
var _HAK_NAMA={papan:'Papan kerja',transaksi:'Transaksi',pajak:'Nota Kena Pajak',
  dana:'Pagu & realisasi',spd:'Perjalanan dinas',rekon:'Rekonsiliasi',
  laporan:'Laporan',saldo:'Saldo (angka uang)'};

function bukaModalHak(){
  document.getElementById('hakIsi').innerHTML='<div class="tgl">Memuat…</div>';
  openModal('modalHak');
  google.script.run
    .withSuccessHandler(function(res){ _hakData=res; _renderHak(); })
    .withFailureHandler(function(e){
      document.getElementById('hakIsi').innerHTML=
        '<div class="tgl">Gagal memuat: '+esc(e&&e.message?e.message:String(e))+'</div>'; })
    .serverGetHakAkses(_tok);
}

function _renderHak(){
  var m=_hakData.matriks, layar=_hakData.layar, peran=_hakData.peran;
  var h='<table style="width:100%;border-collapse:collapse">'
    +'<tr><th style="text-align:left">Layar</th>';
  var i,j;
  for(i=0;i<peran.length;i++) h+='<th style="text-align:left">'+esc(peran[i])+'</th>';
  h+='</tr>';
  for(j=0;j<layar.length;j++){
    var l=layar[j];
    h+='<tr><td style="padding:6px 0">'+esc(_HAK_NAMA[l]||l)+'</td>';
    for(i=0;i<peran.length;i++){
      var p=peran[i], nilai=(m[p]&&m[p][l])||'tidak', kunci=(p==='admin');
      h+='<td style="padding:6px 8px 6px 0">'
        +'<select data-p="'+esc(p)+'" data-l="'+esc(l)+'"'+(kunci?' disabled':'')
        +' style="min-height:40px;border:1px solid var(--bs-n300);border-radius:10px;'
        +'padding:0 8px;font:inherit;font-size:12.5px;background:var(--bs-paper)">'
        +'<option value="tidak"'+(nilai==='tidak'?' selected':'')+'>tidak tampil</option>'
        +'<option value="lihat"'+(nilai==='lihat'?' selected':'')+'>hanya lihat</option>'
        +(l==='saldo'?'':('<option value="ubah"'+(nilai==='ubah'?' selected':'')+'>boleh ubah</option>'))
        +'</select></td>';
    }
    h+='</tr>';
  }
  h+='</table>';
  document.getElementById('hakIsi').innerHTML=h;
}

function simpanHakAkses(){
  var sel=document.querySelectorAll('#hakIsi select'), out={}, i;
  for(i=0;i<sel.length;i++){
    var p=sel[i].getAttribute('data-p'), l=sel[i].getAttribute('data-l');
    if(!out[p]) out[p]={};
    out[p][l]=sel[i].value;
  }
  google.script.run
    .withSuccessHandler(function(){
      toast('Hak akses disimpan. Pengguna perlu memuat ulang aplikasi.','ok');
      closeModal('modalHak');
    })
    .withFailureHandler(function(e){ toast(e&&e.message?e.message:String(e),'error'); })
    .serverSimpanHakAkses(_tok, out);
}
```

- [ ] **Step 4: Periksa**

```bash
cd /home/user/kas-tunai
node -e "
var fs=require('fs'), s=fs.readFileSync('index.html','utf8');
var m=/<script>([\s\S]*)<\/script>/.exec(s); fs.writeFileSync('/tmp/ih.js', m[1]);
" && node --check /tmp/ih.js && echo "SINTAKS OK" && rm -f /tmp/ih.js
for id in btnHak modalHak hakIsi; do printf "%s=%s " $id "$(grep -c "id=\"$id\"" index.html)"; done; echo
sed -n '/<div id="modalHak"/,/^  <\/div>/p' index.html | grep -oE "#[0-9a-fA-F]{3,6}\b" | sort -u
```
Expected: `SINTAKS OK`; ketiga `id` bernilai 1; pemeriksaan hex **tanpa keluaran**.

- [ ] **Step 5: Commit**

```bash
cd /home/user/kas-tunai
git add index.html
git commit -m "feat(desktop): layar admin untuk mengatur hak akses"
```

---

### Task 5: Terapkan hak akses di tampilan

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: field `hakSaya` dari `serverGetDashboard`/`serverGetPapanKerja` (Task 3).
- Produces: `HAK_SAYA` global, `_bolehLihat(layar)`, `_bolehUbah(layar)`, penerapan di `_applyRoleUI()`.

- [ ] **Step 1: Simpan hak dari dashboard**

Di tempat data dashboard diterima (dekat penetapan `IS_ADMIN`/`isViewer` yang sudah ada),
tambahkan:

```js
var HAK_SAYA=null;
function _bolehLihat(l){ if(IS_ADMIN) return true; if(!HAK_SAYA) return true;
  return HAK_SAYA[l]==='lihat'||HAK_SAYA[l]==='ubah'; }
function _bolehUbah(l){ if(IS_ADMIN) return true; if(!HAK_SAYA) return true;
  return HAK_SAYA[l]==='ubah'; }
```
dan `HAK_SAYA = res.hakSaya || null;` saat data diterima.

> `HAK_SAYA` kosong berarti **izinkan** — server tetap penjaga sesungguhnya. Menutup
> layar saat data belum sempat dimuat hanya membuat aplikasi tampak rusak.

- [ ] **Step 2: Sembunyikan menu yang tidak berhak**

Di `_applyRoleUI()`, tambahkan (mengikuti pola `classList.toggle` yang sudah dipakai):

```js
  var petaTab={papan:'tabPapan',transaksi:'tabTransaksi',pajak:'tabPajak',
    dana:'tabDana',spd:'tabSpd',rekon:'tabRekon',laporan:'tabLaporan'};
  for(var lk in petaTab){
    if(!petaTab.hasOwnProperty(lk)) continue;
    var el=document.getElementById(petaTab[lk]);
    if(el) el.classList.toggle('hidden', !_bolehLihat(lk));
  }
  // Saldo memakai jalur yang sudah ada; sekarang ikut matriks, bukan cuma isViewer.
```
Ubah dua baris saldo yang sudah ada agar memakai `_bolehLihat('saldo')` alih-alih
`isViewer` — **jangan hapus** kelas `.saldo-sum`/`.saldo-pill`, keduanya kait yang dipakai.

- [ ] **Step 3: Sembunyikan tombol ubah pada layar yang hanya boleh dilihat**

Tambahkan di akhir `_applyRoleUI()`:

```js
  // Tombol "Catat transaksi" hanya berarti bila boleh mengubah layar Transaksi.
  var bc=document.getElementById('btnCatat');
  if(bc) bc.classList.toggle('hidden', !_bolehUbah('transaksi'));
```
Cari `id` tombol catat yang sebenarnya lebih dulu (`grep -n 'Catat transaksi' index.html`);
bila belum ber-`id`, beri `id="btnCatat"` tanpa mengubah teks atau posisinya.

- [ ] **Step 4: Pastikan layar tertutup tidak bisa dibuka lewat `switchTab`**

Di awal `switchTab(tab)`, tambahkan:

```js
  if(!_bolehLihat(tab)){ toast('Peran Anda tidak berhak membuka layar ini.','error'); return; }
```

- [ ] **Step 5: Verifikasi dengan render nyata**

JANGAN `page.setContent()` — origin `about:blank` membuat `localStorage` melempar dan
skrip berhenti di tengah. Pakai `page.goto('file://...')` atas salinan `index.html`
(scriptlet GAS `<?= ... ?>` dibersihkan) + stub `google.script.run`.

Buktikan dan laporkan angkanya:
- `hakSaya` dengan `transaksi:'tidak'` → `#tabTransaksi` tidak terlihat
- `hakSaya` dengan `transaksi:'lihat'` → menu terlihat, tombol catat **tidak**
- `hakSaya` dengan `transaksi:'ubah'` → keduanya terlihat
- `saldo:'tidak'` → `.saldo-pill` dan `.saldo-sum` tidak terlihat
- memanggil `switchTab('dana')` saat `dana:'tidak'` → `#viewDana` tetap tersembunyi
- `hakSaya:null` → semua terlihat (tidak melumpuhkan aplikasi)
- `page.on('pageerror')` → nol galat baru

Lalu skrip regresi bersama:
```bash
cd /home/user/kas-tunai
node /tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-tema-ui.js 2>&1 | grep -c "^PASS"
node /tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-tema-ui.js 2>&1 | grep -c "^FAIL"
```
Syarat: **22 PASS, 0 FAIL**. Skrip itu masuk sebagai admin, jadi semua menu harus tetap
terlihat — bila ada yang FAIL, kemungkinan besar `HAK_SAYA` kosong salah diperlakukan
sebagai "tidak berhak".

- [ ] **Step 6: Commit**

```bash
cd /home/user/kas-tunai
git add index.html
git commit -m "feat(desktop): sembunyikan menu dan tombol sesuai hak akses"
```

---

### Task 6: Catat di dokumen acuan

**Files:**
- Modify: `docs/HANDOFF-DESKTOP.md`

- [ ] **Step 1: Tulis bagian barunya**

Catat: matriks izin per peran × layar; tiga tingkat `tidak`/`lihat`/`ubah`; **bawaan
sengaja sama dengan perilaku lama** sehingga pemasangan tidak mengubah apa pun sampai
admin menyetelnya; admin tidak bisa mengunci dirinya sendiri; penjagaan ada di server
lewat `_butuh()` dan frontend hanya kenyamanan.

Catat juga temuan yang melatarbelakanginya: sebelum ini, 28 endpoint tulis termasuk semua
penghapusan **tidak memeriksa peran sama sekali**, dan peran di luar tiga nama sah diam-diam
menjadi `viewer`.

- [ ] **Step 2: Commit**

```bash
cd /home/user/kas-tunai
git add docs/
git commit -m "docs: catat hak akses per peran di papan status"
```
