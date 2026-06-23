/**
 * DriveHelper.gs
 * Upload file (base64 dari frontend) ke Google Drive dan kembalikan metadata.
 * Foto sudah dikompresi di browser sebelum dikirim (max 1280px, q 0.7).
 */

var DriveHelper = (function () {

  /** Folder tujuan upload (root bila tak diatur). Diutamakan dari Settings (Script Properties). */
  function targetFolder() {
    var id = Settings.driveFolderId();
    if (id) {
      try { return DriveApp.getFolderById(id); } catch (e) {}
    }
    return DriveApp.getRootFolder();
  }

  /**
   * Upload satu file.
   * @param {object} file  {base64, mimeType, namaFile}
   *        base64 boleh berisi prefix "data:...;base64," (akan dibersihkan).
   * @return {{fileId, namaFile, url}}
   */
  function upload(file) {
    if (!file || !file.base64) throw new Error('Data file kosong');

    var raw = file.base64;
    var comma = raw.indexOf(',');
    if (raw.indexOf('base64') !== -1 && comma !== -1) {
      raw = raw.substring(comma + 1);
    }
    var bytes = Utilities.base64Decode(raw);
    var mime = file.mimeType || 'application/octet-stream';
    var nama = file.namaFile || ('upload_' + Date.now());

    var blob = Utilities.newBlob(bytes, mime, nama);
    var created = targetFolder().createFile(blob);

    // Bisa diakses siapa pun yang punya link (untuk preview di frontend).
    try {
      created.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      Logger.log('[DriveHelper] setSharing gagal: ' + e.message);
    }

    var id = created.getId();
    return {
      fileId: id,
      namaFile: nama,
      url: 'https://drive.google.com/uc?export=view&id=' + id
    };
  }

  /** Upload banyak file sekaligus. */
  function uploadMany(files) {
    var out = [];
    for (var i = 0; i < files.length; i++) out.push(upload(files[i]));
    return out;
  }

  /** Hapus (trash) file dari Drive berdasarkan fileId. Tidak melempar error. */
  function trash(fileId) {
    if (!fileId) return;
    try { DriveApp.getFileById(fileId).setTrashed(true); }
    catch (e) { Logger.log('[DriveHelper] trash gagal (' + fileId + '): ' + e.message); }
  }

  return { upload: upload, uploadMany: uploadMany, trash: trash };
})();
