/**
 * BerkasGup.gs — Penyusunan berkas pertanggungjawaban GUP.
 *
 * Hierarki pertanggungjawaban, dikonfirmasi pengguna 3 Agu 2026:
 *
 *     SPP  =  GUP        (satu SPP tepat satu GUP di satker ini)
 *      └─ DRPP           Daftar Rincian Permintaan Pembayaran
 *          └─ SPBy       Surat Perintah Bayar
 *              └─ transaksi kas → nota → foto bukti
 *
 * Ketiganya SUDAH ada sebagai kolom di sheet Kas Tunai (NO_SPP, NO_DRPP,
 * NO_SPBY), jadi tidak ada kolom baru dan tidak ada migrasi.
 *
 * FOTO TIDAK DIPINDAH KE POHON FOLDER KEDUA. Ia tetap tinggal di
 * Bukti Transaksi/{tahun}/{bulan}/Txn-NNNN/ — satu berkas, satu rumah. Yang
 * dibuat di sini adalah SALINAN GABUNGAN sekali pakai (ZIP) untuk diserahkan.
 * Kalau fotonya disalin permanen ke pohon per-GUP, cepat atau lambat kedua
 * salinan itu berbeda dan tidak ada yang tahu mana yang benar.
 */
var BerkasGup = (function () {

  var C = CONFIG.COLS;

  function _norm(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function _pad4(no) { return ('000' + no).slice(-4); }
  /** Nama aman untuk dipakai sebagai segmen di dalam ZIP. */
  function _san(s) {
    return _norm(s).replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, '_') || '_';
  }
  /**
   * Beri awalan HANYA bila nomornya belum memuatnya. Nomor DRPP di satker ini
   * kadang sudah ditulis "DRPP-11"; menempelkan awalan tanpa memeriksa
   * menghasilkan folder "DRPP-DRPP-11" di dalam berkas yang diserahkan.
   */
  function _seg(awalan, nilai, kosong) {
    var v = _san(nilai);
    if (!nilai) return awalan + '-' + kosong;
    return (v.toUpperCase().indexOf(awalan.toUpperCase() + '-') === 0) ? v : (awalan + '-' + v);
  }

  /* ---------------- Kumpulkan bukti per transaksi ---------------- */
  /** {noTransaksi: [{fileId, namaFile, jenis}]} — nota + foto nota + kuitansi. */
  function _petaBukti() {
    var peta = {}, i, r, no;
    function tambah(no, fileId, namaFile, jenis) {
      no = String(no);
      if (!no || !fileId) return;
      if (!peta[no]) peta[no] = [];
      peta[no].push({ fileId: String(fileId), namaFile: _norm(namaFile), jenis: jenis });
    }
    var nc = Util.colMap(CONFIG.SHEETS.MULTI_NOTA), nr = SheetRepo.getData(CONFIG.SHEETS.MULTI_NOTA);
    for (i = 0; i < nr.length; i++) {
      r = nr[i];
      if (isDeleted(r[nc.IS_DELETED])) continue;
      tambah(r[nc.NO_TRANSAKSI], r[nc.FILE_ID], r[nc.NAMA_FILE], 'nota');
    }
    var fc = Util.colMap(CONFIG.SHEETS.FOTO_NOTA), fr = SheetRepo.getData(CONFIG.SHEETS.FOTO_NOTA);
    for (i = 0; i < fr.length; i++) {
      r = fr[i];
      if (isDeleted(r[fc.IS_DELETED])) continue;
      tambah(r[fc.NO_TRANSAKSI], r[fc.FILE_ID], r[fc.NAMA_FILE], 'foto');
    }
    var kr = SheetRepo.getData(CONFIG.SHEETS.KAS_TUNAI);
    for (i = 0; i < kr.length; i++) {
      r = kr[i];
      if (isDeleted(r[C.IS_DELETED])) continue;
      tambah(r[C.NO], r[C.KUITANSI_FILE_ID], r[C.KUITANSI_NAMA_FILE], 'kuitansi');
    }
    return peta;
  }

  /* ---------------- Pohon GUP → DRPP → SPBy → transaksi ---------------- */
  /**
   * Seluruh belanja aktif dikelompokkan menurut hierarki pertanggungjawaban.
   *
   * Transaksi yang BELUM punya nomor SPP masuk kelompok tersendiri bertanda
   * `belumSpp:true`, bukan dibuang. Justru itulah yang paling perlu dilihat:
   * belanja yang belum masuk GUP mana pun. Hal yang sama untuk DRPP dan SPBy
   * yang masih kosong di dalam satu SPP.
   */
  function daftar() {
    var kas = SheetRepo.getData(CONFIG.SHEETS.KAS_TUNAI);
    var bukti = _petaBukti();
    var perSpp = {}, urutSpp = [], i;

    for (i = 0; i < kas.length; i++) {
      var r = kas[i];
      if (isDeleted(r[C.IS_DELETED])) continue;
      var kredit = Util.num(r[C.KREDIT]);
      if (kredit <= 0) continue;                                  // bukan belanja
      if (String(r[C.REF_TRANSFER] || '').indexOf('TF-') === 0) continue;  // pindah dana

      var no    = String(r[C.NO]);
      var spp   = _norm(r[C.NO_SPP]);
      var drpp  = _norm(r[C.NO_DRPP]);
      var spby  = _norm(r[C.NO_SPBY]);
      var lampiran = bukti[no] || [];
      var jmlNota = 0, jmlFoto = 0, j;
      for (j = 0; j < lampiran.length; j++) {
        if (lampiran[j].jenis === 'foto') jmlFoto++; else if (lampiran[j].jenis === 'nota') jmlNota++;
      }

      var kSpp = spp || '(belum ada SPP)';
      if (!perSpp[kSpp]) {
        perSpp[kSpp] = { spp: spp, belumSpp: !spp, nilai: 0, jmlTxn: 0,
                         jmlBukti: 0, tanpaBukti: 0, tanpaSpby: 0,
                         _drpp: {}, drpp: [] };
        urutSpp.push(kSpp);
      }
      var g = perSpp[kSpp];
      var kDrpp = drpp || '(belum ada DRPP)';
      if (!g._drpp[kDrpp]) {
        g._drpp[kDrpp] = { drpp: drpp, belumDrpp: !drpp, nilai: 0, jmlTxn: 0, _spby: {}, spby: [] };
        g.drpp.push(g._drpp[kDrpp]);
      }
      var d = g._drpp[kDrpp];
      var kSpby = spby || '(belum ada SPBy)';
      if (!d._spby[kSpby]) {
        d._spby[kSpby] = { spby: spby, belumSpby: !spby, nilai: 0, txn: [] };
        d.spby.push(d._spby[kSpby]);
      }
      var s = d._spby[kSpby];

      s.txn.push({ no: no, tanggal: Util.fmtDate(r[C.TANGGAL]), kegiatan: _norm(r[C.KEGIATAN]),
                   penjab: _norm(r[C.PENJAB]), kredit: kredit,
                   jmlNota: jmlNota, jmlFoto: jmlFoto, jmlBukti: lampiran.length,
                   statusSpj: _norm(r[C.STATUS_SPJ]) });
      s.nilai += kredit; d.nilai += kredit;
      g.nilai += kredit; g.jmlTxn++; d.jmlTxn++;
      g.jmlBukti += lampiran.length;
      if (!lampiran.length) g.tanpaBukti++;
      if (!spby) g.tanpaSpby++;
    }

    // Bersihkan penampung sementara supaya muatan ke klien tidak berlipat.
    var out = [];
    for (i = 0; i < urutSpp.length; i++) {
      var x = perSpp[urutSpp[i]];
      delete x._drpp;
      for (var a = 0; a < x.drpp.length; a++) delete x.drpp[a]._spby;
      out.push(x);
    }
    out.sort(function (p, q) {
      // Yang belum punya SPP ditaruh paling atas: itu pekerjaan yang tertinggal.
      if (p.belumSpp !== q.belumSpp) return p.belumSpp ? -1 : 1;
      return String(q.spp).localeCompare(String(p.spp));
    });
    return { gup: out };
  }

  /* ---------------- Ekspor satu GUP jadi ZIP ---------------- */
  /**
   * Bungkus seluruh bukti satu GUP jadi satu ZIP di Exports/{tahun}/.
   * Struktur di dalam ZIP mengikuti hierarki pertanggungjawaban, sehingga
   * berkasnya bisa langsung dicetak/diserahkan berurutan:
   *
   *   GUP-{spp}/DRPP-{drpp}/SPBy-{spby}/Txn-0333/namafile.jpg
   *
   * @param noSpp string. Kosong = kelompok transaksi yang belum punya SPP.
   */
  function ekspor(noSpp) {
    var target = _norm(noSpp);
    var data = daftar(), grup = null, i;
    for (i = 0; i < data.gup.length; i++) {
      if (_norm(data.gup[i].spp) === target) { grup = data.gup[i]; break; }
    }
    if (!grup) throw new Error('GUP / No SPP "' + target + '" tidak ditemukan.');

    var bukti = _petaBukti(), blobs = [], gagal = 0, dipakai = {};
    var akarZip = _seg('GUP', target, 'TANPA-SPP');

    for (i = 0; i < grup.drpp.length; i++) {
      var d = grup.drpp[i];
      var segD = _seg('DRPP', d.drpp, 'TANPA-DRPP');
      for (var j = 0; j < d.spby.length; j++) {
        var s = d.spby[j];
        var segS = _seg('SPBy', s.spby, 'TANPA-SPBy');
        for (var k = 0; k < s.txn.length; k++) {
          var t = s.txn[k], segT = 'Txn-' + _pad4(t.no);
          var lampiran = bukti[String(t.no)] || [];
          for (var m = 0; m < lampiran.length; m++) {
            var f = lampiran[m];
            var nama = _san(f.namaFile) || (f.jenis + '_' + (m + 1) + '.jpg');
            var jalur = akarZip + '/' + segD + '/' + segS + '/' + segT + '/' + nama;
            // Nama kembar di dalam ZIP membuat sebagian berkas tertimpa diam-diam.
            if (dipakai[jalur]) { jalur = jalur.replace(/(\.[^.]*)?$/, '_' + (m + 1) + '$1'); }
            dipakai[jalur] = true;
            try { blobs.push(DriveApp.getFileById(f.fileId).getBlob().setName(jalur)); }
            catch (e) { gagal++; Logger.log('[BerkasGup] lewat ' + f.fileId + ': ' + e.message); }
          }
        }
      }
    }
    if (!blobs.length) throw new Error('Tidak ada berkas bukti yang bisa dibaca untuk GUP ini.');

    var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
    var zip = Utilities.zip(blobs, akarZip + '_' + stamp + '.zip');
    var folder = DriveHelper.exportFolder();
    var file = folder.createFile(zip);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    AuditLog.write('EKSPOR_GUP', 'Drive', target, blobs.length + ' berkas, gagal ' + gagal);
    return { url: 'https://drive.google.com/uc?export=download&id=' + file.getId(),
             nama: akarZip + '_' + stamp + '.zip', jml: blobs.length, gagal: gagal,
             jmlTxn: grup.jmlTxn, nilai: grup.nilai };
  }

  return { daftar: daftar, ekspor: ekspor };
})();
