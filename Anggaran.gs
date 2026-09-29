/**
 * Anggaran.gs — Ketersediaan dana per item POK.
 *
 * Sumber: "Laporan FA Detail 16 Segmen" SAKTI (pagu, realisasi, sisa per item).
 * Diimpor berkala; angka REALISASI_SAKTI di sini adalah versi RESMI yang baru
 * bergerak setelah SPM/SP2D terbit.
 *
 * Nilai tambah aplikasi: menyandingkannya dengan BELANJA KAS (transaksi yang
 * sudah benar-benar dibayar dari kas ini). Selisihnya = belanja yang sudah
 * keluar tapi belum masuk SAKTI — penyebab klasik pagu terasa cukup padahal
 * sudah habis. Karena itu disediakan "sisa aman".
 */
var Anggaran = (function () {

  var C = CONFIG.COLS;
  function PG() { return Util.colMap(CONFIG.SHEETS.PAGU); }

  function _norm(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  /** Kunci item: kode item + akun + RO — cukup unik lintas komponen. */
  /**
   * Identitas baris pagu untuk pencocokan saat impor ulang.
   *
   * AKUN SENGAJA TIDAK IKUT. Akun adalah data turunan yang bisa berubah antar
   * impor (mis. terbaca salah lalu dikoreksi). Kalau ia ikut jadi identitas,
   * satu koreksi akun membuat kunci berubah -> baris lama tidak ketemu -> baris
   * baru ditambahkan, dan seluruh pagu BERLIPAT tanpa peringatan apa pun.
   * Yang menentukan identitas hanyalah kode item dan RO-nya.
   */
  function _key(kodeItem, akun, ro) {
    return _norm(kodeItem).toUpperCase() + '|' + _norm(ro).toUpperCase();
  }
  function _batchId() {
    return 'P' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  }

  /* ---------------- Impor / upsert pagu ---------------- */
  /**
   * list item: {kodeItem, uraianItem, akun, uraianAkun, komponen, ro, uraianRo,
   *             kegiatan, program, pagu, realisasi, sisa}
   * Idempoten: kunci sama → baris diperbarui, bukan ditambah.
   */
  function imporPagu(list, periode) {
    var nama = CONFIG.SHEETS.PAGU;
    SheetRepo.sheet(nama);                       // buat sheet bila belum ada
    SheetRepo.ensureMinCols(nama, CONFIG.HEADERS.PAGU.length);
    var p = PG(), batch = _batchId(), lebar = CONFIG.HEADERS.PAGU.length;
    var data = SheetRepo.getData(nama), idx = {};
    for (var i = 0; i < data.length; i++) {
      idx[_key(data[i][p.KODE_ITEM], data[i][p.AKUN], data[i][p.KODE_RO])] = i + 2;
    }
    var res = { ditambah: 0, diperbarui: 0, totalPagu: 0, totalRealisasi: 0 };
    list = list || [];
    for (var j = 0; j < list.length; j++) {
      var it = list[j];
      if (!_norm(it.kodeItem)) continue;
      var pagu = Util.num(it.pagu), real = Util.num(it.realisasi);
      var sisa = (it.sisa === undefined || it.sisa === null || it.sisa === '')
                 ? (pagu - real) : Util.num(it.sisa);
      res.totalPagu += pagu; res.totalRealisasi += real;
      var k = _key(it.kodeItem, it.akun, it.ro);
      var isi = Util.set(
        p.URAIAN_ITEM,     _norm(it.uraianItem),
        p.AKUN,            _norm(it.akun),
        p.URAIAN_AKUN,     _norm(it.uraianAkun),
        p.KODE_KOMPONEN,   _norm(it.komponen),
        p.KODE_RO,         _norm(it.ro),
        p.URAIAN_RO,       _norm(it.uraianRo),
        p.KODE_KEGIATAN,   _norm(it.kegiatan),
        p.KODE_PROGRAM,    _norm(it.program),
        p.PAGU,            pagu,
        p.REALISASI_SAKTI, real,
        p.SISA_SAKTI,      sisa,
        p.PERIODE,         _norm(periode),
        p.IMPORT_BATCH,    batch);
      if (idx[k]) {
        SheetRepo.setCells(nama, idx[k], isi);
        res.diperbarui++;
      } else {
        var row = []; for (var z = 0; z < lebar; z++) row[z] = '';
        row[p.KODE_ITEM] = _norm(it.kodeItem);
        for (var c in isi) row[c] = isi[c];
        idx[k] = SheetRepo.appendRow(nama, row);
        res.ditambah++;
      }
    }
    DeferredFlush.mark();
    AuditLog.write('IMPOR_PAGU', nama, periode || '-',
      res.ditambah + ' baru, ' + res.diperbarui + ' diperbarui');
    res.batch = batch;
    return res;
  }

  /* ---------------- Baca pagu ---------------- */
  function getPagu() {
    var nama = CONFIG.SHEETS.PAGU;
    SheetRepo.sheet(nama);
    var p = PG(), data = SheetRepo.getData(nama), out = [];
    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      if (!_norm(r[p.KODE_ITEM])) continue;
      out.push({
        kodeItem: _norm(r[p.KODE_ITEM]), uraianItem: _norm(r[p.URAIAN_ITEM]),
        akun: _norm(r[p.AKUN]), uraianAkun: _norm(r[p.URAIAN_AKUN]),
        komponen: _norm(r[p.KODE_KOMPONEN]), ro: _norm(r[p.KODE_RO]),
        uraianRo: _norm(r[p.URAIAN_RO]), kegiatan: _norm(r[p.KODE_KEGIATAN]),
        program: _norm(r[p.KODE_PROGRAM]),
        pagu: Util.num(r[p.PAGU]), realisasiSakti: Util.num(r[p.REALISASI_SAKTI]),
        sisaSakti: Util.num(r[p.SISA_SAKTI]), periode: _norm(r[p.PERIODE])
      });
    }
    return out;
  }

  /* ---------------- Pembebanan ke beberapa item ---------------- */
  function PB() { return Util.colMap(CONFIG.SHEETS.PEMBEBANAN); }

  /**
   * Rincian pembebanan satu transaksi, atau [] bila transaksi itu beritem
   * tunggal (yang merupakan keadaan normal untuk hampir semua transaksi).
   */
  function getPembebanan(no) {
    var nama = CONFIG.SHEETS.PEMBEBANAN;
    SheetRepo.sheet(nama);
    var b = PB(), data = SheetRepo.getData(nama), out = [];
    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      if (isDeleted(r[b.IS_DELETED])) continue;
      if (String(r[b.NO_TRANSAKSI]) !== String(no)) continue;
      out.push({ kodeItem: _norm(r[b.KODE_ITEM]), uraianItem: _norm(r[b.URAIAN_ITEM]),
                 akun: _norm(r[b.AKUN]), nilai: Util.num(r[b.NILAI]) });
    }
    return out;
  }

  /**
   * Ganti seluruh rincian satu transaksi.
   *
   * rincian: [{kodeItem, uraianItem, akun, nilai}] — kurang dari dua baris
   * berarti transaksi beritem tunggal, jadi rinciannya DIHAPUS dan pembebanan
   * kembali mengikuti KAS_TUNAI.KODE_ITEM. Itu bukan kasus khusus yang harus
   * dihindari, melainkan jalur normalnya.
   *
   * totalKredit dipakai sebagai penjaga: Σ nilai wajib sama persis. Uang dan
   * pagu bilangan bulat, jadi perbandingannya juga bulat -- tanpa toleransi.
   */
  /**
   * Saring + periksa rincian TANPA menyentuh sheet. Dipisah supaya endpoint
   * bisa menolak masukan yang timpang SEBELUM transaksinya tersimpan; kalau
   * pemeriksaan baru terjadi sesudahnya, pengguna melihat pesan galat padahal
   * transaksinya sudah terlanjur ada.
   * @return {{bersih:Array, total:number}}
   */
  function periksaRincian(rincian, totalKredit) {
    rincian = rincian || [];
    var bersih = [], jml = 0, i, dipakai = {};
    for (i = 0; i < rincian.length; i++) {
      var it = rincian[i] || {};
      var kode = _norm(it.kodeItem);
      var nilai = Util.num(it.nilai);
      if (!kode || nilai <= 0) continue;
      // Item kembar akan dihitung dua kali oleh ketersediaan() dan membuat pagu
      // item itu terserap berlipat -- ditolak, bukan digabung diam-diam.
      if (dipakai[kode.toUpperCase()])
        throw new Error('Item ' + kode + ' dipilih lebih dari sekali.');
      dipakai[kode.toUpperCase()] = true;
      bersih.push({ kodeItem: kode, uraianItem: _norm(it.uraianItem),
                    akun: _norm(it.akun), nilai: nilai });
      jml += nilai;
    }
    if (bersih.length >= 2) {
      var target = Util.num(totalKredit);
      if (jml !== target)
        throw new Error('Rincian pembebanan Rp ' + jml + ' tidak sama dengan nilai transaksi Rp '
                        + target + '. Selisih Rp ' + (target - jml) + '.');
    }
    return { bersih: bersih, total: jml };
  }

  function simpanPembebanan(no, rincian, totalKredit) {
    var nama = CONFIG.SHEETS.PEMBEBANAN;
    SheetRepo.sheet(nama);
    SheetRepo.ensureMinCols(nama, CONFIG.HEADERS.PEMBEBANAN.length);
    var b = PB(), lebar = CONFIG.HEADERS.PEMBEBANAN.length, i;
    var hasil = periksaRincian(rincian, totalKredit);
    var bersih = hasil.bersih, jml = hasil.total;

    // Baris lama dimatikan lebih dulu supaya penggantian tidak meninggalkan
    // sisa yang ikut terhitung. Tanpa hard delete, sesuai aturan proyek.
    var data = SheetRepo.getData(nama), n = 0;
    for (i = 0; i < data.length; i++) {
      if (isDeleted(data[i][b.IS_DELETED])) continue;
      if (String(data[i][b.NO_TRANSAKSI]) !== String(no)) continue;
      SheetRepo.setCells(nama, i + 2, Util.set(
        b.IS_DELETED, 'Y', b.DELETED_AT, new Date(), b.DELETED_BY, getOperator()));
      n++;
    }
    if (bersih.length >= 2) {
      for (i = 0; i < bersih.length; i++) {
        var row = []; for (var z = 0; z < lebar; z++) row[z] = '';
        row[b.NO_TRANSAKSI] = no;
        row[b.KODE_ITEM]    = bersih[i].kodeItem;
        row[b.URAIAN_ITEM]  = bersih[i].uraianItem;
        row[b.AKUN]         = bersih[i].akun;
        row[b.NILAI]        = bersih[i].nilai;
        row[b.IS_DELETED]   = '';
        SheetRepo.appendRow(nama, row);
      }
    }
    DeferredFlush.mark();
    AuditLog.write('PEMBEBANAN', nama, no,
      (bersih.length >= 2 ? (bersih.length + ' item, Rp ' + jml) : 'kembali ke item tunggal')
      + (n ? (' (' + n + ' baris lama diganti)') : ''));
    return { success: true, jumlahItem: bersih.length, total: jml };
  }

  /** Peta NO transaksi -> rincian, dibaca sekali untuk seluruh ketersediaan(). */
  function _petaPembebanan() {
    var nama = CONFIG.SHEETS.PEMBEBANAN;
    SheetRepo.sheet(nama);
    var b = PB(), data = SheetRepo.getData(nama), peta = {};
    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      if (isDeleted(r[b.IS_DELETED])) continue;
      var no = String(r[b.NO_TRANSAKSI]);
      if (!no) continue;
      if (!peta[no]) peta[no] = [];
      peta[no].push({ kode: _norm(r[b.KODE_ITEM]).toUpperCase(), nilai: Util.num(r[b.NILAI]) });
    }
    return peta;
  }

  /* ---------------- Ketersediaan dana ---------------- */
  /**
   * Sandingkan pagu dengan belanja kas per item.
   *   belanjaKas  = Σ kredit transaksi aktif yang dibebankan ke item ini
   *   sisaAman    = pagu − realisasi SAKTI − belanja kas yang BELUM masuk SAKTI
   * Karena tak ada penanda per transaksi "sudah masuk SAKTI", pendekatan aman:
   * bila belanjaKas > realisasiSakti, selisihnya dianggap belum terserap SAKTI.
   */
  function ketersediaan() {
    var pagu = getPagu();
    var kas = SheetRepo.getData(CONFIG.SHEETS.KAS_TUNAI), belanja = {}, tanpaItem = 0, i, j;
    var rinci = _petaPembebanan();
    for (i = 0; i < kas.length; i++) {
      var r = kas[i];
      if (isDeleted(r[C.IS_DELETED])) continue;
      var nilai = Util.num(r[C.KREDIT]);
      if (nilai <= 0) continue;
      var ref = String(r[C.REF_TRANSFER] || '');
      if (ref.indexOf('TF-') === 0) continue;            // pindah dana, bukan belanja
      // Transaksi yang dibebankan ke beberapa item POK: pakai rinciannya, dan
      // JANGAN juga membebani KODE_ITEM -- kolom itu hanya menyimpan item
      // pertama untuk keperluan tampilan, jadi menghitung keduanya berarti
      // membebani pagu hampir dua kali lipat.
      var pecah = rinci[String(r[C.NO])];
      if (pecah && pecah.length) {
        for (j = 0; j < pecah.length; j++)
          belanja[pecah[j].kode] = (belanja[pecah[j].kode] || 0) + pecah[j].nilai;
        continue;
      }
      var kode = _norm(r[C.KODE_ITEM]).toUpperCase();
      if (!kode) { tanpaItem += nilai; continue; }
      belanja[kode] = (belanja[kode] || 0) + nilai;
    }
    var out = [], tot = { pagu: 0, realisasiSakti: 0, belanjaKas: 0, sisaAman: 0 };
    // Belanja pegawai (akun 51xxxx: gaji, tunjangan, uang makan, lembur) dibayar
    // lewat LS/payroll, TIDAK PERNAH lewat kas tunai. Menampilkannya di layar POK
    // hanya memenuhi daftar dengan ratusan baris yang tidak akan pernah dibebani
    // dari sini, dan membuat "sisa pagu paling tipis" didominasi akun yang bukan
    // urusan bendahara kas tunai.
    //
    // Disaring di sini, BUKAN di tiap layar, karena ketersediaan() adalah satu-
    // satunya corong untuk layar Pagu & realisasi, dropdown item POK, dan panel
    // Papan kerja. getPagu() sengaja TIDAK disaring supaya data tersimpan utuh.
    var pegawai = { jumlah: 0, pagu: 0, realisasiSakti: 0 };
    for (i = 0; i < pagu.length; i++) {
      var it = pagu[i];
      if (/^51/.test(_norm(it.akun))) {
        pegawai.jumlah++;
        pegawai.pagu += it.pagu;
        pegawai.realisasiSakti += it.realisasiSakti;
        continue;
      }
      var bk = belanja[it.kodeItem.toUpperCase()] || 0;
      var belumSakti = Math.max(0, bk - it.realisasiSakti);
      var sisaAman = it.pagu - it.realisasiSakti - belumSakti;
      it.belanjaKas = bk;
      it.belumMasukSakti = belumSakti;
      it.sisaAman = sisaAman;
      it.lebihPagu = (sisaAman < 0);
      tot.pagu += it.pagu; tot.realisasiSakti += it.realisasiSakti;
      tot.belanjaKas += bk; tot.sisaAman += sisaAman;
      out.push(it);
    }
    out.sort(function (a, b) {
      return String(a.akun).localeCompare(String(b.akun)) ||
             String(a.kodeItem).localeCompare(String(b.kodeItem));
    });
    return { items: out, total: tot, belanjaTanpaItem: tanpaItem,
             // Dilaporkan, bukan dibuang diam-diam: layar menyebut berapa yang
             // dikecualikan supaya total yang tampil tidak terbaca sebagai
             // seluruh pagu satker.
             pegawaiDikecualikan: pegawai,
             periode: (pagu.length ? pagu[0].periode : '') };
  }

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

  /**
   * MAK satu baris pagu, format yang dipakai satker: KEGIATAN.RO.AKUN
   * (mis. "DL.2376" + "SAC.302" + "521211" -> "DL.2376.SAC.302.521211").
   * Segmen kosong dilewati. Fungsi murni supaya bisa diuji (ujiMakCetak_).
   */
  function susunMak(kegiatan, ro, akun) {
    var seg = [_norm(kegiatan), _norm(ro), _norm(akun)], out = [];
    for (var i = 0; i < seg.length; i++) if (seg[i]) out.push(seg[i]);
    return out.join('.');
  }

  /**
   * Rincian pembebanan + MAK untuk dicetak di Tanda Terima / Bukti Transfer.
   * Satu-satunya tempat MAK cetakan disusun -- desktop dan HP sama-sama
   * memanggil ini, jadi keduanya selalu mencetak MAK yang sama.
   *
   * Urutan sumber MAK per item:
   *   1. baris Pagu dengan KODE_ITEM sama -> susunMak(kegiatan, ro, akun);
   *      bila kode itu muncul di >1 baris Pagu dengan MAK berbeda, dipersempit
   *      dengan akun item; masih ambigu -> TIDAK menebak (dicatat di log);
   *   2. akun item itu sendiri.
   * Transaksi tanpa item POK sama sekali -> kolom AKUN transaksi.
   * Semua kosong -> mak = [] dan pencetak menampilkan titik-titik untuk diisi tangan.
   *
   * @return {rincian:[{kodeItem,uraianItem,akun,nilai,mak}], mak:[String]}
   */
  function rincianCetak(no) {
    var tx = getRowByTransactionId(no);
    if (!tx) throw new Error('Transaksi No ' + no + ' tidak ditemukan.');
    var v = tx.values;
    var rinc = getPembebanan(no);
    if (!rinc.length && _norm(v[C.KODE_ITEM])) {
      rinc = [{ kodeItem: _norm(v[C.KODE_ITEM]), uraianItem: _norm(v[C.URAIAN_ITEM]),
                akun: _norm(v[C.AKUN]), nilai: Util.num(v[C.KREDIT]) }];
    }
    var idx = {};
    if (rinc.length) {
      var pagu = getPagu();
      for (var p = 0; p < pagu.length; p++) {
        var k = pagu[p].kodeItem.toUpperCase();
        (idx[k] = idx[k] || []).push({ akun: pagu[p].akun,
          mak: susunMak(pagu[p].kegiatan, pagu[p].ro, pagu[p].akun) });
      }
    }
    var makList = [], ada = {}, i, j;
    for (i = 0; i < rinc.length; i++) {
      var kand = idx[rinc[i].kodeItem.toUpperCase()] || [], beda = {}, pilihan = [];
      for (j = 0; j < kand.length; j++) if (!beda[kand[j].mak]) { beda[kand[j].mak] = true; pilihan.push(kand[j]); }
      if (pilihan.length > 1 && rinc[i].akun) {
        var sempit = [];
        for (j = 0; j < pilihan.length; j++) if (pilihan[j].akun === rinc[i].akun) sempit.push(pilihan[j]);
        pilihan = sempit;
      }
      var mak = '';
      if (pilihan.length === 1) mak = pilihan[0].mak;
      else if (pilihan.length > 1) Logger.log('[rincianCetak] MAK ambigu untuk item ' + rinc[i].kodeItem + ' transaksi ' + no);
      if (!mak) mak = rinc[i].akun || '';
      rinc[i].mak = mak;
      if (mak && !ada[mak]) { ada[mak] = true; makList.push(mak); }
    }
    if (!makList.length && _norm(v[C.AKUN])) makList.push(_norm(v[C.AKUN]));
    return { rincian: rinc, mak: makList };
  }

  return { imporPagu: imporPagu, getPagu: getPagu, ketersediaan: ketersediaan,
           ringkasSerapan: ringkasSerapan,
           getPembebanan: getPembebanan, simpanPembebanan: simpanPembebanan,
           periksaRincian: periksaRincian, susunMak: susunMak, rincianCetak: rincianCetak };
})();

/** Uji manual susunMak — jalankan dari editor Apps Script, baca Log. */
function ujiMakCetak_() {
  var kasus = [
    ['lengkap',             ['DL.2376', 'SAC.302', '521211'], 'DL.2376.SAC.302.521211'],
    ['RO kosong',           ['DL.2376', '', '521211'],        'DL.2376.521211'],
    ['spasi dibersihkan',   [' DL.2376 ', 'SAC.302 ', '521211'], 'DL.2376.SAC.302.521211'],
    ['semua kosong',        ['', null, undefined],            '']
  ];
  var gagal = 0;
  for (var i = 0; i < kasus.length; i++) {
    var a = kasus[i][1], hasil = Anggaran.susunMak(a[0], a[1], a[2]), ok = hasil === kasus[i][2];
    if (!ok) gagal++;
    Logger.log((ok ? 'PASS' : 'FAIL') + ' — ' + kasus[i][0] + ': "' + hasil + '"');
  }
  Logger.log(gagal ? (gagal + ' kasus GAGAL') : 'Semua kasus lulus (' + kasus.length + ')');
  return gagal === 0;
}
