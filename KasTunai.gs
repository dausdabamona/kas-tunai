/**
 * KasTunai.gs
 * Business logic transaksi utama, multi-nota, dan foto barang.
 * Dipanggil oleh wrapper server* di Code.gs.
 */

var KasTunai = (function () {

  var C = CONFIG.COLS;                              // Kas Tunai
  function NC() { return Util.colMap(CONFIG.SHEETS.MULTI_NOTA); }
  function FBC() { return Util.colMap(CONFIG.SHEETS.FOTO_BARANG); }

  /* -------------------------------------------------------- *
   * Mapping baris -> objek transaksi
   * -------------------------------------------------------- */
  function rowToObj(row, rowIndex) {
    return {
      rowIndex:        rowIndex,
      no:              row[C.NO],
      tanggal:         Util.fmtDate(row[C.TANGGAL]),
      kegiatan:        row[C.KEGIATAN],
      penjab:          row[C.PENJAB],
      debet:           Util.num(row[C.DEBET]),
      kredit:          Util.num(row[C.KREDIT]),
      saldo:           Util.num(row[C.SALDO]),
      keterangan:      row[C.KETERANGAN],
      fileId:          row[C.FILE_ID],
      namaFile:        row[C.NAMA_FILE],
      urlFile:         row[C.URL_FILE],
      statusSpj:       row[C.STATUS_SPJ],
      tglNota:         Util.fmtDate(row[C.TGL_NOTA]),
      fotoBarangJml:   Util.num(row[C.FOTO_BARANG_JML]),
      notaJml:         Util.num(row[C.NOTA_JML]),
      notaTotal:       Util.num(row[C.NOTA_TOTAL]),
      uangDiserahkan:  Util.num(row[C.UANG_DISERAHKAN]),
      kembalianJml:    Util.num(row[C.KEMBALIAN_JML]),
      kembalianTotal:  Util.num(row[C.KEMBALIAN_TOTAL]),
      noSpby:          row[C.NO_SPBY],
      tglSpby:         Util.fmtDate(row[C.TGL_SPBY])
    };
  }

  /* -------------------------------------------------------- *
   * Ambil daftar transaksi aktif, recompute saldo berjalan
   * -------------------------------------------------------- */
  function getTransaksi() {
    var data = SheetRepo.getData(CONFIG.SHEETS.KAS_TUNAI);
    var out = [];
    var saldo = CONFIG.SALDO_AWAL;

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (isDeleted(row[C.IS_DELETED])) continue;
      // Saldo kas = +debet (masuk) - kredit (keluar) + kembalian (uang sisa kembali ke kas)
      saldo += Util.num(row[C.DEBET]) - Util.num(row[C.KREDIT]) + Util.num(row[C.KEMBALIAN_TOTAL]);
      var obj = rowToObj(row, i + 2);
      obj.saldo = saldo;
      out.push(obj);
    }
    return out;
  }

  /* -------------------------------------------------------- *
   * Tambah transaksi baru
   * -------------------------------------------------------- */
  function tambahTransaksi(data) {
    if (!data) throw new Error('Data transaksi kosong');

    var no = nextTransactionNo();
    var row = Util.emptyRow(CONFIG.HEADERS.KAS_TUNAI.length);
    row[C.NO]         = no;
    row[C.TANGGAL]    = data.tanggal ? new Date(data.tanggal) : new Date();
    row[C.KEGIATAN]   = data.kegiatan || '';
    row[C.PENJAB]     = data.penjab || '';
    row[C.DEBET]      = Util.num(data.debet);
    row[C.KREDIT]     = Util.num(data.kredit);
    row[C.SALDO]      = '';            // dihitung ulang saat getTransaksi
    row[C.KETERANGAN] = data.keterangan || '';
    row[C.STATUS_SPJ] = 'Belum';
    row[C.NOTA_JML]   = 0;
    row[C.NOTA_TOTAL] = 0;
    row[C.FOTO_BARANG_JML] = 0;
    row[C.KEMBALIAN_JML]   = 0;
    row[C.KEMBALIAN_TOTAL] = 0;
    row[C.IS_DELETED] = FLAG_ACTIVE;

    SheetRepo.appendRow(CONFIG.SHEETS.KAS_TUNAI, row);
    DeferredFlush.mark();
    AuditLog.write('CREATE', CONFIG.SHEETS.KAS_TUNAI, no, 'kegiatan: ' + (data.kegiatan || ''));
    return { success: true, no: no };
  }

  /* -------------------------------------------------------- *
   * Multi Nota
   * -------------------------------------------------------- */
  function getMultiNota(transactionId) {
    var n = NC();
    var rows = findRows(CONFIG.SHEETS.MULTI_NOTA, function (r) {
      return String(r[n.NO_TRANSAKSI]) === String(transactionId) && !isDeleted(r[n.IS_DELETED]);
    });
    return rows.map(function (x) {
      var r = x.values;
      return {
        rowIndex: x.rowIndex,
        noTransaksi: r[n.NO_TRANSAKSI], urutan: r[n.URUTAN], namaPenyedia: r[n.NAMA_PENYEDIA],
        npwp: r[n.NPWP_PENYEDIA], alamat: r[n.ALAMAT_PENYEDIA],
        noNota: r[n.NO_NOTA], tglNota: Util.fmtDate(r[n.TGL_NOTA]), nilai: Util.num(r[n.NILAI]),
        keterangan: r[n.KETERANGAN], fileId: r[n.FILE_ID], namaFile: r[n.NAMA_FILE], urlFile: r[n.URL_FILE]
      };
    });
  }

  function tambahNota(transactionId, notaData) {
    var urutan = getMultiNota(transactionId).length + 1;
    var file = (notaData.file && notaData.file.base64) ? DriveHelper.upload(notaData.file) : null;

    SheetRepo.appendRow(CONFIG.SHEETS.MULTI_NOTA, [
      transactionId, urutan, notaData.namaPenyedia || '', notaData.npwp || '', notaData.alamat || '',
      notaData.noNota || '', notaData.tglNota ? new Date(notaData.tglNota) : '', Util.num(notaData.nilai),
      notaData.keterangan || '',
      file ? file.fileId : '', file ? file.namaFile : '', file ? file.url : '',
      new Date(), FLAG_ACTIVE, '', ''
    ]);
    DeferredFlush.mark();
    _recalcNota(transactionId);
    return { success: true, urutan: urutan };
  }

  function hapusNotaItem(transactionId, urutan, fileId) {
    var hit = _findNotaRow(transactionId, urutan);
    if (!hit) throw new Error('Nota tidak ditemukan');
    softDelete(CONFIG.SHEETS.MULTI_NOTA, hit.rowIndex, transactionId + '#' + urutan);
    if (fileId) DriveHelper.trash(fileId);
    _recalcNota(transactionId);
    return { success: true };
  }

  function restoreNota(transactionId, urutan) {
    var n = NC();
    var rows = findRows(CONFIG.SHEETS.MULTI_NOTA, function (r) {
      return String(r[n.NO_TRANSAKSI]) === String(transactionId) && String(r[n.URUTAN]) === String(urutan);
    });
    if (!rows.length) throw new Error('Nota tidak ditemukan');
    restoreRecord(CONFIG.SHEETS.MULTI_NOTA, rows[0].rowIndex, transactionId + '#' + urutan);
    _recalcNota(transactionId);
    return { success: true };
  }

  function _findNotaRow(transactionId, urutan) {
    var n = NC();
    var rows = findRows(CONFIG.SHEETS.MULTI_NOTA, function (r) {
      return String(r[n.NO_TRANSAKSI]) === String(transactionId) &&
             String(r[n.URUTAN]) === String(urutan) && !isDeleted(r[n.IS_DELETED]);
    });
    return rows.length ? rows[0] : null;
  }

  /** Hitung ulang NOTA_JML & NOTA_TOTAL pada transaksi induk. */
  function _recalcNota(transactionId) {
    var notas = getMultiNota(transactionId);
    var total = 0;
    for (var i = 0; i < notas.length; i++) total += notas[i].nilai;

    var t = getRowByTransactionId(transactionId);
    if (!t) return;
    var kredit = Util.num(t.values[C.KREDIT]);
    var lunas = (total >= kredit && kredit > 0);

    SheetRepo.setCells(CONFIG.SHEETS.KAS_TUNAI, t.rowIndex, Util.set(
      C.NOTA_JML, notas.length,
      C.NOTA_TOTAL, total,
      C.STATUS_SPJ, lunas ? 'Lunas' : (t.values[C.STATUS_SPJ] || 'Belum')
    ));
    DeferredFlush.mark();
  }

  /* -------------------------------------------------------- *
   * Foto Barang
   * -------------------------------------------------------- */
  function tambahFotoBarang(transactionId, fotoArr) {
    var fb = FBC();
    var urutan = findRows(CONFIG.SHEETS.FOTO_BARANG, function (r) {
      return String(r[fb.NO_TRANSAKSI]) === String(transactionId) && !isDeleted(r[fb.IS_DELETED]);
    }).length;

    for (var i = 0; i < fotoArr.length; i++) {
      var f = DriveHelper.upload(fotoArr[i]);
      urutan++;
      SheetRepo.appendRow(CONFIG.SHEETS.FOTO_BARANG, [
        transactionId, urutan, f.fileId, f.namaFile, f.url, new Date(), FLAG_ACTIVE, '', ''
      ]);
    }
    DeferredFlush.mark();
    updateByTransactionId(transactionId, Util.set(C.FOTO_BARANG_JML, urutan));
    return { success: true, jml: urutan };
  }

  /* -------------------------------------------------------- *
   * SPBY
   * -------------------------------------------------------- */
  function simpanSpby(rowIndex, noSpby, tglSpby) {
    SheetRepo.setCells(CONFIG.SHEETS.KAS_TUNAI, rowIndex, Util.set(
      C.NO_SPBY, noSpby || '',
      C.TGL_SPBY, tglSpby ? new Date(tglSpby) : ''
    ));
    DeferredFlush.mark();
    return { success: true };
  }

  function hapusSpby(rowIndex) {
    return simpanSpby(rowIndex, '', '');
  }

  /* -------------------------------------------------------- *
   * Rekap
   * -------------------------------------------------------- */
  function getRekap() {
    var list = getTransaksi();
    var totalDebet = 0, totalKredit = 0, totalKembali = 0;
    for (var i = 0; i < list.length; i++) {
      totalDebet += list[i].debet;
      totalKredit += list[i].kredit;
      totalKembali += list[i].kembalianTotal;
    }
    return {
      saldoAwal: CONFIG.SALDO_AWAL,
      totalDebet: totalDebet,
      totalKredit: totalKredit,
      totalKembali: totalKembali,
      saldoAkhir: CONFIG.SALDO_AWAL + totalDebet - totalKredit + totalKembali,
      jmlTransaksi: list.length
    };
  }

  return {
    getTransaksi: getTransaksi,
    tambahTransaksi: tambahTransaksi,
    getMultiNota: getMultiNota,
    tambahNota: tambahNota,
    hapusNotaItem: hapusNotaItem,
    restoreNota: restoreNota,
    tambahFotoBarang: tambahFotoBarang,
    simpanSpby: simpanSpby,
    hapusSpby: hapusSpby,
    getRekap: getRekap
  };
})();
