/**
 * SoftDelete.gs
 * Mekanisme soft-delete & restore lintas sheet + Audit Log.
 * Tidak ada hard delete - baris hanya ditandai IS_DELETED = 'Y'.
 *
 * Setiap sheet diasumsikan punya 3 kolom standar di akhir kelompok metadata:
 *   IS_DELETED, DELETED_AT, DELETED_BY
 * Posisi kolomnya diberikan oleh pemanggil agar generik.
 */

/**
 * Email operator aktif = pelaku sesi token. Diisi oleh _run() (Code.gs) via
 * _ExecCache '__operator__' sebelum business logic jalan. Tidak lagi menebak
 * lewat Session.getActiveUser()/getEffectiveUser() (yang salah atribusi ke akun
 * deployer). Bila dipanggil di luar _run → 'unknown'.
 */
function getOperator() {
  return _ExecCache.has('__operator__') ? _ExecCache.get('__operator__') : 'unknown';
}

/** Index kolom metadata soft-delete sebuah sheet (dari header). */
function _metaCols(sheetName) {
  var c = Util.colMap(sheetName);
  return { IS_DELETED: c.IS_DELETED, DELETED_AT: c.DELETED_AT, DELETED_BY: c.DELETED_BY };
}

/**
 * Tandai satu baris sebagai terhapus. Kolom IS_DELETED/DELETED_AT/DELETED_BY
 * diturunkan dari header sheet, jadi caller tak perlu tahu index-nya.
 * @param {string} sheetName  nama sheet
 * @param {number} rowIndex   baris 1-based
 * @param {string} recordId   id untuk audit log
 */
function softDelete(sheetName, rowIndex, recordId) {
  var cols = _metaCols(sheetName);
  SheetRepo.setCells(sheetName, rowIndex,
    Util.set(cols.IS_DELETED, FLAG_DELETED, cols.DELETED_AT, new Date(), cols.DELETED_BY, getOperator()));
  DeferredFlush.mark();
  AuditLog.write('DELETE', sheetName, recordId, 'row ' + rowIndex);
  return { success: true };
}

/** Pulihkan baris yang sebelumnya di-soft-delete. */
function restoreRecord(sheetName, rowIndex, recordId) {
  var cols = _metaCols(sheetName);
  SheetRepo.setCells(sheetName, rowIndex,
    Util.set(cols.IS_DELETED, FLAG_ACTIVE, cols.DELETED_AT, '', cols.DELETED_BY, ''));
  DeferredFlush.mark();
  AuditLog.write('RESTORE', sheetName, recordId, 'row ' + rowIndex);
  return { success: true };
}

/** Cek apakah nilai sel IS_DELETED menandakan terhapus. */
function isDeleted(val) {
  return String(val).toUpperCase() === FLAG_DELETED;
}

/* ============================================================
 * Audit Log
 * ============================================================ */
var AuditLog = (function () {
  function write(action, sheetName, recordId, detail) {
    try {
      // Kolom: TIMESTAMP, ACTION, SHEET, ROW_REF, DETAIL, OPERATOR
      SheetRepo.appendRow(CONFIG.SHEETS.AUDIT_LOG, [
        new Date(), action, sheetName,
        recordId == null ? '' : recordId, detail || '', getOperator()
      ]);
      DeferredFlush.mark();
    } catch (e) {
      Logger.log('[AuditLog] gagal menulis: ' + e.message);
    }
  }
  return { write: write };
})();
