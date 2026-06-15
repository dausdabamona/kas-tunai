/**
 * Pengembalian.gs
 * Business logic pengembalian uang per transaksi (sheet "Pengembalian").
 */

var Pengembalian = (function () {

  function PC() { return Util.colMap(CONFIG.SHEETS.PENGEMBALIAN); }

  function getPengembalian(transactionId) {
    var p = PC();
    var rows = findRows(CONFIG.SHEETS.PENGEMBALIAN, function (r) {
      return String(r[p.NO_TRANSAKSI]) === String(transactionId) && !isDeleted(r[p.IS_DELETED]);
    });
    return rows.map(function (x) {
      var r = x.values;
      return {
        rowIndex: x.rowIndex,
        noTransaksi: r[p.NO_TRANSAKSI], urutan: r[p.URUTAN],
        tanggal: Util.fmtDate(r[p.TANGGAL]), nilai: Util.num(r[p.NILAI]),
        keterangan: r[p.KETERANGAN]
      };
    });
  }

  function tambahPengembalian(transactionId, data) {
    var urutan = getPengembalian(transactionId).length + 1;
    SheetRepo.appendRow(CONFIG.SHEETS.PENGEMBALIAN, [
      transactionId, urutan, data.tanggal ? new Date(data.tanggal) : new Date(),
      Util.num(data.nilai), data.keterangan || '', new Date(), FLAG_ACTIVE, '', ''
    ]);
    DeferredFlush.mark();
    _recalc(transactionId);
    return { success: true, urutan: urutan };
  }

  function hapusPengembalian(transactionId, urutan) {
    var hit = _findRow(transactionId, urutan, false);
    if (!hit) throw new Error('Pengembalian tidak ditemukan');
    softDelete(CONFIG.SHEETS.PENGEMBALIAN, hit.rowIndex, transactionId + '#' + urutan);
    _recalc(transactionId);
    return { success: true };
  }

  function restorePengembalian(transactionId, urutan) {
    var hit = _findRow(transactionId, urutan, true);
    if (!hit) throw new Error('Pengembalian tidak ditemukan');
    restoreRecord(CONFIG.SHEETS.PENGEMBALIAN, hit.rowIndex, transactionId + '#' + urutan);
    _recalc(transactionId);
    return { success: true };
  }

  function _findRow(transactionId, urutan, includeDeleted) {
    var p = PC();
    var rows = findRows(CONFIG.SHEETS.PENGEMBALIAN, function (r) {
      return String(r[p.NO_TRANSAKSI]) === String(transactionId) &&
             String(r[p.URUTAN]) === String(urutan) &&
             (includeDeleted || !isDeleted(r[p.IS_DELETED]));
    });
    return rows.length ? rows[0] : null;
  }

  /** Hitung ulang KEMBALIAN_JML & KEMBALIAN_TOTAL pada transaksi induk. */
  function _recalc(transactionId) {
    var list = getPengembalian(transactionId);
    var total = 0;
    for (var i = 0; i < list.length; i++) total += list[i].nilai;
    updateByTransactionId(transactionId, Util.set(
      CONFIG.COLS.KEMBALIAN_JML, list.length,
      CONFIG.COLS.KEMBALIAN_TOTAL, total
    ));
  }

  return {
    getPengembalian: getPengembalian,
    tambahPengembalian: tambahPengembalian,
    hapusPengembalian: hapusPengembalian,
    restorePengembalian: restorePengembalian
  };
})();
