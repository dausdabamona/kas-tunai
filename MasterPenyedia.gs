/**
 * MasterPenyedia.gs
 * Data rekanan/penyedia untuk pembuatan SSP pajak (autocomplete di frontend).
 */

var MasterPenyedia = (function () {

  function MC() { return Util.colMap(CONFIG.SHEETS.MASTER_PENYEDIA); }

  function getAll() {
    var c = MC();
    var data = SheetRepo.getData(CONFIG.SHEETS.MASTER_PENYEDIA);
    var out = [];
    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      if (isDeleted(r[c.IS_DELETED])) continue;
      out.push({ nama: r[c.NAMA], npwp: r[c.NPWP], alamat: r[c.ALAMAT] });
    }
    return out;
  }

  /** Simpan / update penyedia (key = nama, case-insensitive). */
  function simpan(p) {
    if (!p || !p.nama) throw new Error('Nama penyedia wajib diisi');
    var c = MC();
    var rows = findRows(CONFIG.SHEETS.MASTER_PENYEDIA, function (r) {
      return String(r[c.NAMA]).toLowerCase() === String(p.nama).toLowerCase() &&
             !isDeleted(r[c.IS_DELETED]);
    });

    if (rows.length) {
      SheetRepo.setCells(CONFIG.SHEETS.MASTER_PENYEDIA, rows[0].rowIndex,
        Util.set(c.NPWP, p.npwp || '', c.ALAMAT, p.alamat || ''));
      DeferredFlush.mark();
      return { success: true, updated: true };
    }

    SheetRepo.appendRow(CONFIG.SHEETS.MASTER_PENYEDIA, [
      p.nama, p.npwp || '', p.alamat || '', new Date(), FLAG_ACTIVE, '', ''
    ]);
    DeferredFlush.mark();
    return { success: true, updated: false };
  }

  /** Cari penyedia by keyword (nama/npwp). */
  function cari(keyword) {
    var kw = String(keyword || '').toLowerCase();
    if (!kw) return [];
    return getAll().filter(function (p) {
      return String(p.nama).toLowerCase().indexOf(kw) !== -1 ||
             String(p.npwp).toLowerCase().indexOf(kw) !== -1;
    });
  }

  return { getAll: getAll, simpan: simpan, cari: cari };
})();
