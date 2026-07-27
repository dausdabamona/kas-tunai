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
  function _key(kodeItem, akun, ro) {
    return _norm(kodeItem).toUpperCase() + '|' + _norm(akun) + '|' + _norm(ro).toUpperCase();
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
    var kas = SheetRepo.getData(CONFIG.SHEETS.KAS_TUNAI), belanja = {}, tanpaItem = 0, i;
    for (i = 0; i < kas.length; i++) {
      var r = kas[i];
      if (isDeleted(r[C.IS_DELETED])) continue;
      var nilai = Util.num(r[C.KREDIT]);
      if (nilai <= 0) continue;
      var ref = String(r[C.REF_TRANSFER] || '');
      if (ref.indexOf('TF-') === 0) continue;            // pindah dana, bukan belanja
      var kode = _norm(r[C.KODE_ITEM]).toUpperCase();
      if (!kode) { tanpaItem += nilai; continue; }
      belanja[kode] = (belanja[kode] || 0) + nilai;
    }
    var out = [], tot = { pagu: 0, realisasiSakti: 0, belanjaKas: 0, sisaAman: 0 };
    for (i = 0; i < pagu.length; i++) {
      var it = pagu[i];
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
             periode: (pagu.length ? pagu[0].periode : '') };
  }

  return { imporPagu: imporPagu, getPagu: getPagu, ketersediaan: ketersediaan };
})();
