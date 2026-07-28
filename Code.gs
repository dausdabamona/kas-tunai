/**
 * Code.gs
 * Entry point web app (doGet) + semua fungsi server* yang dipanggil
 * frontend via google.script.run. Tiap wrapper tipis: validasi -> delegasi
 * ke modul business logic -> commitAndInvalidate -> return.
 */

/* ============================================================
 * Entry point
 * ============================================================ */
function doGet(e) {
  // Cangkang HTML saja. Identitas & role TIDAK lagi dari Session.getActiveUser()
  // (staf pakai Gmail biasa → selalu kosong). Frontend memperoleh role dari
  // respons serverLogin/serverGetDashboard yang berbasis sesi token.
  // ?m=1 → tampilan mobile (mobile.html); selain itu tampilan desktop.
  var p = (e && e.parameter) ? e.parameter : {};
  var mobile = (p.m === '1' || p.mobile === '1');
  var tpl = HtmlService.createTemplateFromFile(mobile ? 'mobile' : 'index');
  // URL web app disuntik agar halaman bisa berpindah antara tampilan desktop
  // dan mobile (halaman GAS berjalan di dalam iframe, jadi tak bisa membaca
  // alamatnya sendiri).
  try { tpl.webAppUrl = ScriptApp.getService().getUrl() || ''; } catch (err) { tpl.webAppUrl = ''; }
  tpl.iconUrl = CONFIG.ICON_URL || '';
  // addMetaTag hanya menerima daftar tag tertentu (viewport,
  // apple-mobile-web-app-capable, mobile-web-app-capable,
  // google-site-verification). Tag lain — termasuk theme-color — ditolak
  // dengan "Tag meta yang Anda tentukan tidak diperbolehkan dalam konteks ini"
  // dan membuat SELURUH halaman gagal dimuat. Jangan tambahkan di sini.
  var out = tpl.evaluate()
    .setTitle('Kas Tunai - Poltek KP Sorong')
    .addMetaTag('viewport', mobile
      ? 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover'
      : 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  // Ikon halaman: dipakai browser untuk tab dan untuk pintasan layar utama.
  // Hanya setFaviconUrl yang berpengaruh — <link rel="icon"> di dalam berkas
  // HTML kita tidak terbaca karena halaman ini berjalan di dalam iframe.
  // Dibungkus try/catch: hiasan tidak boleh menjatuhkan seluruh aplikasi.
  try { if (CONFIG.ICON_URL) out.setFaviconUrl(CONFIG.ICON_URL); } catch (err2) {}
  return out;
}

/** Include partial HTML/CSS/JS (dipakai bila file dipecah). */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Bungkus pemanggilan modul: validasi token sesi SEKALI di sini (satu-satunya
 * gerbang identitas), suntik operator ke cache yang dibaca getOperator, jalankan
 * business logic, flush sekali di akhir. Melempar bila token invalid/kadaluarsa.
 */
function _run(token, fn) {
  var auth;
  try { auth = Sessions.validate(token); }         // {email, role, mustChange}
  catch (e) { throw new Error('SESI_BERAKHIR'); }   // penanda agar frontend redirect ke login
  _ExecCache.set('__operator__', auth.email);        // getOperator membaca kunci ini
  try {
    var result = fn(auth);
    DeferredFlush.commitAndInvalidate();
    return result;
  } catch (e) {
    Logger.log('[Code] Error: ' + e.message + '\n' + (e.stack || ''));
    DeferredFlush.commitAndInvalidate();
    throw e;
  }
}

/* ============================================================
 * Transaksi
 * ============================================================ */
function serverGetTransaksi(token) {
  return _run(token, function (auth) { return KasTunai.getTransaksi(); });
}

/** Muat data dashboard awal dalam satu round-trip: transaksi + jumlah foto + surat tugas. */
function serverGetDashboard(token) {
  return _run(token, function (auth) {
    // Perbaiki/isi label header kolom yang kosong (sekali per TTL cache; idempotent).
    // Bump kunci ke v3 agar kolom rekonsiliasi (No Kuitansi/DRPP/SPP) ikut ter-migrasi.
    // Naikkan versi kunci ini SETIAP KALI ada kolom baru di CONFIG.HEADERS,
    // kalau tidak migrasi header dilewati sampai cache 6 jam kedaluwarsa.
    // v6 = DIBAYAR_PENYEDIA, v7 = MODE_BAYAR (Multi Nota), v8 = JENIS
    // (Pengembalian), v9 = CLIENT_ID (Kas Tunai), v10 = MASTER_PUM (sheet
    // baru), v11 = SETOR_STATUS/SETOR_TANGGAL/SETOR_NTPN (Multi Nota).
    if (!AppCache.get('hdr_fixed_v11')) {
      try { SheetRepo.ensureHeaders(); } catch (e) { Logger.log('[ensureHeaders] ' + e.message); }
      AppCache.put('hdr_fixed_v11', 1);
    }
    var role = auth.role;
    var full = (role === 'admin' || role === 'full');
    var tx = KasTunai.getTransaksi();
    if (!full) { for (var i = 0; i < tx.length; i++) { delete tx[i].saldo; } } // sembunyikan saldo berjalan
    return {
      transaksi: tx,
      fotoMap: FotoNota.getJmlFotoPerTransaksi(),
      suratMap: SuratTugas.getMap(),
      saldo: full ? KasTunai.ringkasanSaldo() : null,
      role: role,
      isAdmin: (role === 'admin'),
      // Tabel pajak dikirim dari server supaya desktop dan mobile memakai
      // acuan yang sama persis (tarif, ambang batas, kode MAP/KJS).
      pajakRef: { list: CONFIG.PAJAK_REF, def: CONFIG.PAJAK_DEFAULT },
      // Nomor HP PUM untuk tombol Tagih — dikirim sekali di sini supaya tidak
      // perlu pemanggilan terpisah tiap membuka papan pemantau uang muka.
      petaPUM: MasterPUM.getSemuaPeta(),
      // Batas setor pajak — SATU sumber, lihat komentar CONFIG.BATAS_SETOR_TANGGAL.
      batasSetorTanggal: CONFIG.BATAS_SETOR_TANGGAL
    };
  });
}

/* ============================================================
 * Manajemen User (khusus admin)
 * ============================================================ */
function serverListUsers(token) {
  return _run(token, function (auth) { if (auth.role !== 'admin') throw new Error('Akses ditolak: khusus admin'); return Users.list(); });
}
function serverAddUser(token, email, nama, role) {
  return _run(token, function (auth) { if (auth.role !== 'admin') throw new Error('Akses ditolak: khusus admin'); return Users.add(email, nama, role); });
}
function serverUpdateUser(token, email, nama, role) {
  return _run(token, function (auth) { if (auth.role !== 'admin') throw new Error('Akses ditolak: khusus admin'); return Users.update(email, nama, role); });
}
function serverDeleteUser(token, email) {
  return _run(token, function (auth) { if (auth.role !== 'admin') throw new Error('Akses ditolak: khusus admin'); return Users.remove(email); });
}

/** Perbaiki header kolom kosong secara manual (dari frontend bila perlu). */
function serverPerbaikiHeader(token) {
  return _run(token, function (auth) { return SheetRepo.ensureHeaders(); });
}

/** Jalankan langsung dari editor Apps Script untuk mengisi header kosong sekarang juga. */
function perbaikiHeader() {
  return SheetRepo.ensureHeaders();
}

/**
 * PERBAIKAN DATA: isi kolom NO yang kosong pada sheet "Kas Tunai".
 * Baris transaksi tanpa nomor tak bisa ditautkan ke nota/foto — nota yang
 * disimpan ke baris seperti itu akan "hilang". Jalankan dari editor Apps
 * Script: pilih fungsi ini → Run. Aman diulang (hanya mengisi yang kosong).
 */
function perbaikiNomorTransaksi() {
  var C = CONFIG.COLS, nama = CONFIG.SHEETS.KAS_TUNAI;
  var data = SheetRepo.getData(nama);
  var maks = 0, i;
  for (i = 0; i < data.length; i++) {
    var n = parseInt(data[i][C.NO], 10);
    if (!isNaN(n) && n > maks) maks = n;
  }
  var diperbaiki = [];
  for (i = 0; i < data.length; i++) {
    var r = data[i];
    if (isDeleted(r[C.IS_DELETED])) continue;
    var kosong = (r[C.NO] === '' || r[C.NO] === null || r[C.NO] === undefined);
    if (!kosong) continue;
    // hanya baris yang benar-benar berisi data transaksi
    var adaIsi = (r[C.KEGIATAN] || Util.num(r[C.DEBET]) > 0 || Util.num(r[C.KREDIT]) > 0);
    if (!adaIsi) continue;
    maks++;
    SheetRepo.setCells(nama, i + 2, Util.set(C.NO, maks));
    diperbaiki.push({ baris: i + 2, no: maks, kegiatan: r[C.KEGIATAN] });
  }

  // Sambungkan kembali data anak yang sempat tersimpan ke transaksi tanpa nomor
  // (nota, foto, item, dll). Hanya bila TEPAT SATU transaksi diperbaiki —
  // selain itu tidak bisa dipastikan milik siapa, jadi dibiarkan.
  var relink = [];
  if (diperbaiki.length === 1) {
    var noBaru = diperbaiki[0].no;
    var anak = ['MULTI_NOTA', 'FOTO_NOTA', 'DETAIL_NOTA', 'FOTO_BARANG',
                'PENGEMBALIAN', 'BUKTI_PD', 'SURAT_TUGAS'];
    for (var a = 0; a < anak.length; a++) {
      var sName = CONFIG.SHEETS[anak[a]];
      if (!sName) continue;
      var cmap = Util.colMap(sName);
      if (!cmap || cmap.NO_TRANSAKSI === undefined) continue;
      var rows = SheetRepo.getData(sName), n = 0;
      for (var k = 0; k < rows.length; k++) {
        var v = rows[k][cmap.NO_TRANSAKSI];
        var yatim = (v === '' || v === null || v === undefined ||
                     String(v).toLowerCase() === 'undefined');
        if (!yatim) continue;
        SheetRepo.setCells(sName, k + 2, Util.set(cmap.NO_TRANSAKSI, noBaru));
        n++;
      }
      if (n) relink.push({ sheet: sName, baris: n });
    }
    if (relink.length) {
      try { KasTunai.recalcNota(noBaru); } catch (e) { Logger.log('[recalcNota] ' + e.message); }
    }
  }

  DeferredFlush.commitAndInvalidate();
  Logger.log('[perbaikiNomorTransaksi] ' + diperbaiki.length + ' transaksi diberi nomor: ' +
    JSON.stringify(diperbaiki) + ' | data anak disambungkan: ' + JSON.stringify(relink));
  return { success: true, jumlah: diperbaiki.length, detail: diperbaiki, disambungkan: relink };
}

/** Migrasi Fase 1 rekonsiliasi: pastikan lebar kolom cukup lalu isi 3 label baru
 *  (No Kuitansi/DRPP/SPP). Idempoten — aman dijalankan berulang dari editor GAS. */
function migrasiKolomRekonsiliasi() {
  SheetRepo.ensureMinCols(CONFIG.SHEETS.KAS_TUNAI, CONFIG.HEADERS.KAS_TUNAI.length);
  return SheetRepo.ensureHeaders();
}

/** Pindah dana antar kas (Bank <-> Tunai). arah: 'BANK_TUNAI' | 'TUNAI_BANK'. */
function serverPindahDana(token, arah, nominal, tanggal, keterangan) {
  return _run(token, function (auth) { return KasTunai.pindahDana(arah, nominal, tanggal, keterangan); });
}
/** Ubah transaksi keluar yang ternyata penarikan/penyetoran jadi Pindah Dana. */
function serverKonversiPindahDana(token, no) {
  return _run(token, function (auth) { return KasTunai.konversiPindahDana(no); });
}
/** SPBY gabungan: beri 1 nomor SPBY ke beberapa transaksi. */
function serverSpbyGabungan(token, noSpby, tglSpby, nos) {
  return _run(token, function (auth) { return KasTunai.spbyGabungan(noSpby, tglSpby, nos); });
}
/** Pecah 1 transaksi pengeluaran menjadi beberapa transaksi. */
function serverPecahTransaksi(token, no, parts) {
  return _run(token, function (auth) { return KasTunai.pecahTransaksi(no, parts); });
}

/* ============================================================
 * Impor lampiran dari folder scan (EPSON Scan-to-Drive)
 * ============================================================ */
function serverScanAktif(token) {
  return _run(token, function (auth) { return !!Settings.scanFolderId(); });
}

/* ---- Rapikan penyimpanan Drive (pindah file lama ke folder per transaksi) ---- */
function serverMigrateDrive(token, dryRun) {
  return _run(token, function (auth) { if (auth.role !== 'admin') throw new Error('Akses ditolak: khusus admin'); return DriveHelper.migrateDriveStorage({ dryRun: !!dryRun }); });
}
/** Jalankan langsung dari editor Apps Script: pratinjau rencana migrasi. */
function rapikanDriveDryRun() { return DriveHelper.migrateDriveStorage({ dryRun: true }); }
/** Jalankan langsung dari editor Apps Script: pindahkan file sungguhan. */
function rapikanDrive() { return DriveHelper.migrateDriveStorage({ dryRun: false }); }

/* ============================================================
 * Pengaturan penyimpanan (folder Drive) — khusus admin
 * ============================================================ */
function _folderInfo(id) {
  if (!id) return { id: '', nama: '(root My Drive / belum diatur)', ok: true };
  try { return { id: id, nama: DriveApp.getFolderById(id).getName(), ok: true }; }
  catch (e) { return { id: id, nama: '(tidak dapat diakses!)', ok: false }; }
}
function serverGetSettings(token) {
  return _run(token, function (auth) {
    if (auth.role !== 'admin') throw new Error('Akses ditolak: khusus admin');
    return {
      driveFolderId: Settings.get('DRIVE_FOLDER_ID', ''),
      scanFolderId:  Settings.get('SCAN_FOLDER_ID', ''),
      driveInfo: _folderInfo(Settings.driveFolderId()),
      scanInfo:  _folderInfo(Settings.scanFolderId())
    };
  });
}
/** Ambil ID folder dari input: ID langsung, URL Drive, atau '' . Tolak bila berupa path. */
function _folderIdFrom(v, label) {
  v = String(v == null ? '' : v).trim();
  if (!v) return '';
  var m = v.match(/[-\w]{25,}/);            // ID Drive (>=25 char) di URL atau langsung
  if (m && (v.indexOf('http') === 0 || v === m[0])) return m[0];
  if (v.indexOf('/') >= 0 || v.indexOf(' ') >= 0) {
    throw new Error(label + ': masukkan ID folder atau URL Drive, bukan path/nama folder. Buka folder di Drive → salin dari drive.google.com/drive/folders/<ID>');
  }
  return v;
}
function serverSetSettings(token, driveFolderId, scanFolderId) {
  return _run(token, function (auth) {
    if (auth.role !== 'admin') throw new Error('Akses ditolak: khusus admin');
    driveFolderId = _folderIdFrom(driveFolderId, 'Folder penyimpanan');
    scanFolderId  = _folderIdFrom(scanFolderId, 'Folder scan');
    // Validasi folder bila diisi
    if (driveFolderId) { try { DriveApp.getFolderById(driveFolderId); } catch (e) { throw new Error('Folder penyimpanan tidak ditemukan / tak bisa diakses'); } }
    if (scanFolderId)  { try { DriveApp.getFolderById(scanFolderId);  } catch (e) { throw new Error('Folder scan tidak ditemukan / tak bisa diakses'); } }
    Settings.set('DRIVE_FOLDER_ID', driveFolderId);
    Settings.set('SCAN_FOLDER_ID', scanFolderId);
    return { success: true, driveInfo: _folderInfo(Settings.driveFolderId()), scanInfo: _folderInfo(Settings.scanFolderId()) };
  });
}
function serverListScan(token) {
  return _run(token, function (auth) { return ScanInbox.list(60); });
}
function serverGetScanFile(token, fileId) {
  return _run(token, function (auth) { return ScanInbox.getFile(fileId); });
}
function serverArchiveScan(token, fileId) {
  return _run(token, function (auth) { return ScanInbox.archive(fileId); });
}

/* ============================================================
 * Perjalanan Dinas / Surat Tugas
 * ============================================================ */
/** Ringkas data SPD → field transaksi kas (total, penjab, kegiatan, keterangan, porsiBank).
 * porsiBank = Σ item "dibayar bendahara" (transport ditandai + penginapan ditandai) → dibebankan Kas Bank. */
function _pdMeta(data) {
  var list = (data.pegawaiList && data.pegawaiList.length) ? data.pegawaiList
           : [{ nama: data.pegawai || '', biaya: Util.num(data.biaya) }];
  var total = 0, nama = [], porsiBank = 0;
  for (var i = 0; i < list.length; i++) {
    var p = list[i];
    total += Util.num(p.biaya);
    if (p.nama) nama.push(p.nama);
    var tr = p.transport || [];
    for (var j = 0; j < tr.length; j++) if (tr[j] && tr[j].bendahara) porsiBank += Util.num(tr[j].jumlah);
    if (p.penginapanBendahara) porsiBank += Util.num(p.penginapan);
  }
  if (porsiBank > total) porsiBank = total;
  var jenisLbl = (data.jenis === 'LUAR_KOTA') ? 'Luar Kota' : 'Dalam Kota';
  var up = function (s) { return (String(s || '').toUpperCase() === 'BANK') ? 'BANK' : 'TUNAI'; };
  return {
    tanggal: data.tglMulai, debet: 0, kredit: total, porsiBank: porsiBank,
    sumberPelaksana: up(data.sumberPelaksana),               // default TUNAI
    sumberBendahara: up(data.sumberBendahara || 'BANK'),     // default BANK
    penjab: nama.join(', '),
    kegiatan: data.maksud || ('Perjalanan Dinas ' + (data.nomor || '')),
    keterangan: 'Surat Tugas ' + (data.nomor || '') + ' (' + jenisLbl + ', ' +
                Util.num(data.jumlahHari) + ' hari, ' + list.length + ' pegawai)'
  };
}
/** Baris induk PD (porsi ke Pelaksana) — sumber sesuai pilihan. */
function _pdPokokRow(meta) {
  return { tanggal: meta.tanggal, debet: 0, kredit: meta.kredit - meta.porsiBank,
    sumber: meta.sumberPelaksana, penjab: meta.penjab,
    kegiatan: meta.kegiatan, keterangan: meta.keterangan };
}
/** Baris porsi tiket/hotel dibayar langsung Bendahara — sumber sesuai pilihan, tertaut ke PD primary. */
function _pdBendaharaRow(meta, no) {
  var srcLbl = (meta.sumberBendahara === 'BANK') ? 'Kas Bank' : 'Kas Tunai';
  return { tanggal: meta.tanggal, debet: 0, kredit: meta.porsiBank, sumber: meta.sumberBendahara,
    penjab: meta.penjab, kegiatan: 'Tiket/Hotel dibayar Bendahara — ' + meta.kegiatan,
    keterangan: 'Dibayar langsung oleh Bendahara (' + srcLbl + '), ref PD No ' + no };
}
function serverSimpanPerjalananDinas(token, data) {
  return _run(token, function (auth) {
    var meta = _pdMeta(data);
    var res = KasTunai.tambahTransaksi(_pdPokokRow(meta));
    var no = res.no;
    if (meta.porsiBank > 0) {
      var bd = _pdBendaharaRow(meta, no); bd.refTransfer = 'PD-' + no;
      KasTunai.tambahTransaksi(bd);
    }
    SuratTugas.simpan(no, data);
    return { success: true, no: no };
  });
}
function serverUpdatePerjalananDinas(token, no, data) {
  return _run(token, function (auth) {
    var meta = _pdMeta(data);
    KasTunai.updateTransaksi(no, _pdPokokRow(meta));
    var refNo = KasTunai.findByRef('PD-' + no);            // baris porsi bendahara (sumber apa pun)
    if (meta.porsiBank > 0) {
      var bd = _pdBendaharaRow(meta, no); bd.refTransfer = 'PD-' + no;
      if (refNo) KasTunai.updateTransaksi(refNo, bd);
      else KasTunai.tambahTransaksi(bd);
    } else if (refNo) {
      KasTunai.hapusTransaksi(refNo);
    }
    SuratTugas.update(no, data);
    return { success: true, no: no };
  });
}
function serverGetSuratTugas(token, noTransaksi) {
  return _run(token, function (auth) { return SuratTugas.get(noTransaksi); });
}
/** Batalkan status Perjalanan Dinas: hapus record Surat Tugas (transaksi kas tetap
 *  ada sebagai pengeluaran biasa). Baris porsi bendahara (bila ada) dibiarkan. */
function serverBatalkanPd(token, noTransaksi) {
  return _run(token, function (auth) { return SuratTugas.remove(noTransaksi); });
}
function serverTambahTransaksi(token, data) {
  return _run(token, function (auth) { return KasTunai.tambahTransaksi(data); });
}
function serverUpdateTransaksi(token, no, data) {
  return _run(token, function (auth) { return KasTunai.updateTransaksi(no, data); });
}
function serverSimpanPajak(token, no, d) {
  return _run(token, function (auth) { return KasTunai.simpanPajak(no, d); });
}
/** Simpan pajak satu nota (per penyedia); total otomatis dijumlahkan ke transaksi. */
function serverSimpanPajakNota(token, no, urutan, d) {
  return _run(token, function (auth) { return KasTunai.simpanPajakNota(no, urutan, d); });
}
/** Daftar seluruh nota yang dipotong pajak (rekap setoran / SPT Masa). */
function serverGetNotaPajak(token) {
  return _run(token, function (auth) { return KasTunai.getNotaPajak(); });
}
/** Seluruh nota lintas transaksi (dengan/tanpa pajak) — worklist pajak (tugas 10). */
function serverGetSemuaNota(token) {
  return _run(token, function (auth) { return KasTunai.getSemuaNota(); });
}
/** Tandai satu/beberapa nota sudah disetor: [{no, urutan, tanggal, ntpn}]. */
function serverTandaiSetorPajak(token, list) {
  return _run(token, function (auth) { return KasTunai.tandaiSetorPajak(list); });
}

/* ============================================================
 * Anggaran / ketersediaan dana (Laporan FA Detail 16 Segmen)
 * ============================================================ */
/** Impor pagu per item POK. list sudah dipetakan di frontend. Idempoten. */
function serverImporPagu(token, list, periode) {
  return _run(token, function (auth) { return Anggaran.imporPagu(list, periode); });
}
/** Identitas instansi & pejabat (dipakai tampilan mobile untuk mencetak). */
function serverGetInstansi(token) {
  return _run(token, function (auth) { return CONFIG.INSTANSI; });
}

/** Daftar item pagu (untuk pemilih Detail Kegiatan di form transaksi). */
function serverGetPagu(token) {
  return _run(token, function (auth) { return Anggaran.getPagu(); });
}
/** Pagu disandingkan dengan belanja kas → sisa aman per item. */
function serverKetersediaanDana(token) {
  return _run(token, function (auth) { return Anggaran.ketersediaan(); });
}

/* ============================================================
 * Impor Rekening Koran (Bank) — .xlsx via Advanced Drive Service
 * ============================================================ */
/** Konversi .xlsx (base64) ke Google Sheet sementara, baca semua sel, lalu hapus.
 *  Kembalikan array 2D (tanggal di-format string) untuk pratinjau & pemetaan di frontend. */
function serverParseRekKoran(token, base64, filename) {
  Sessions.validate(token);   // gerbang sesi (endpoint ini tidak lewat _run)
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), MimeType.MICROSOFT_EXCEL, filename || 'rk.xlsx');
  var tmp = Drive.Files.insert({ title: 'tmp_rk_' + Date.now(), mimeType: MimeType.GOOGLE_SHEETS }, blob, { convert: true });
  var tz = Session.getScriptTimeZone();
  try {
    var sheet = SpreadsheetApp.openById(tmp.id).getSheets()[0];
    var values = sheet.getDataRange().getValues();
    return values.map(function (row) {
      return row.map(function (c) {
        return (c instanceof Date) ? Utilities.formatDate(c, tz, 'yyyy-MM-dd') : c;
      });
    });
  } finally {
    try { Drive.Files.remove(tmp.id); } catch (e) {}
  }
}

/** Simpan mutasi rekening koran sbg transaksi BANK (dedup via REF 'RK-...').
 *  list: [{tanggal, uraian, debet, kredit}] — perspektif REKENING:
 *  debet rekening = uang KELUAR (kredit app), kredit rekening = uang MASUK (debet app). */
function serverImporBank(token, list) {
  return _run(token, function (auth) {
    var hasil = { ditambah: 0, dilewati: 0 };
    list = list || [];
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      var masuk = Util.num(it.kredit);   // kredit rekening → masuk
      var keluar = Util.num(it.debet);   // debet rekening → keluar
      if (masuk <= 0 && keluar <= 0) continue;
      // Dedup: No Journal BNI dipakai bersama oleh transaksi induk + baris biayanya,
      // jadi gabungkan ID + nominal agar baris biaya (ATM/Prima) tidak ikut terbuang.
      var ref = 'RK-' + (it.id ? (String(it.id) + '-' + (masuk - keluar))
                                : _rkRef(it.tanggal, masuk - keluar, it.uraian));
      if (KasTunai.findByRef(ref)) { hasil.dilewati++; continue; }
      KasTunai.tambahTransaksi({
        tanggal: it.tanggal, debet: masuk, kredit: keluar, sumber: 'BANK', refTransfer: ref,
        kegiatan: (it.uraian || 'Mutasi bank'), penjab: 'Bank',
        keterangan: 'Impor rekening koran' });
      hasil.ditambah++;
    }
    return hasil;
  });
}

/* ============================================================
 * Rekonsiliasi SAKTI (Fase 2) — impor + auto-cocok Tier 0
 * ============================================================ */
/** Impor baris ekspor SAKTI (sudah dipetakan di frontend) → upsert SAKTI_SPBy +
 *  jalankan pencocokan Tier 0. list: [{tglPb,noPb,akun,nilai,noKuitansi,tglKuitansi,
 *  noDrpp,noSpp,noBuktiPungut,statusValidasi}]. Kembalikan ringkasan hasil. */
function serverImporSakti(token, list) {
  return _run(token, function (auth) { return Rekonsiliasi.impor(list); });
}
/** Jalankan ulang pencocokan Tier 0 tanpa impor baru (idempoten). */
function serverCocokRekon(token) {
  return _run(token, function (auth) { return Rekonsiliasi.cocok(); });
}
/** Backfill massal No Kuitansi/DRPP/SPP dari file (isi hanya bila sel kosong).
 *  list: [{noTransaksi, noKuitansi, noDrpp, noSpp}]. Kembalikan ringkasan. */
function serverBackfillKuitansi(token, list) {
  return _run(token, function (auth) { return Rekonsiliasi.backfillKuitansi(list); });
}
/** Ringkasan rekonsiliasi utk Kartu Ketenangan (baca Status Rekon + saldo).
 *  periode '' = semua; 'YYYY-MM' = bulan tertentu. */
function serverRingkasanRekon(token, periode) {
  return _run(token, function (auth) { return Rekonsiliasi.ringkasan(periode || ''); });
}

/* ============================================================
 * Bukti Perjalanan Dinas (tiket/boarding) + SPJ bundel
 * ============================================================ */
function serverGetBuktiPD(token, no, withB64) {
  return _run(token, function (auth) { return BuktiPD.getBukti(no, withB64); });
}
function serverUploadBuktiPD(token, no, fileArr) {
  return _run(token, function (auth) { return BuktiPD.uploadBukti(no, fileArr); });
}
function serverHapusBuktiPD(token, no, urutan) {
  return _run(token, function (auth) { return BuktiPD.hapusBukti(no, urutan); });
}
function serverZipBuktiPD(token, no, namaZip) {
  return _run(token, function (auth) { return BuktiPD.zipBukti(no, namaZip); });
}

/** Penanda unik baris rekening koran untuk anti-duplikat. */
function _rkRef(tanggal, nominal, uraian) {
  var key = String(tanggal || '') + '|' + nominal + '|' + String(uraian || '').replace(/\s+/g, ' ').trim();
  var h = 0;
  for (var i = 0; i < key.length; i++) { h = (h * 31 + key.charCodeAt(i)) & 0x7fffffff; }
  return h.toString(36);
}

/* ============================================================
 * Multi Nota
 * ============================================================ */
function serverGetMultiNota(token, transactionId) {
  return _run(token, function (auth) { return KasTunai.getMultiNota(transactionId); });
}
function serverTambahNota(token, transactionId, notaData) {
  return _run(token, function (auth) { return KasTunai.tambahNota(transactionId, notaData); });
}
function serverUpdateNota(token, transactionId, urutan, notaData) {
  return _run(token, function (auth) { return KasTunai.updateNota(transactionId, urutan, notaData); });
}
function serverHapusNotaItem(token, transactionId, urutan, fileId) {
  return _run(token, function (auth) { return KasTunai.hapusNotaItem(transactionId, urutan, fileId); });
}
function serverRestoreNota(token, transactionId, urutan) {
  return _run(token, function (auth) { return KasTunai.restoreNota(transactionId, urutan); });
}

/* ============================================================
 * Foto Nota
 * ============================================================ */
function serverGetJmlFotoPerTransaksi(token) {
  return _run(token, function (auth) { return FotoNota.getJmlFotoPerTransaksi(); });
}
function serverGetFotoNota(token, noTransaksi, notaId) {
  return _run(token, function (auth) { return FotoNota.getFotoNota(noTransaksi, notaId); });
}
function serverUploadFotoNota(token, noTransaksi, notaId, fotoArr) {
  return _run(token, function (auth) { return FotoNota.uploadFotoNota(noTransaksi, notaId, fotoArr); });
}
function serverHapusFotoNota(token, noTransaksi, notaId, urutan) {
  return _run(token, function (auth) { return FotoNota.hapusFotoNota(noTransaksi, notaId, urutan); });
}
function serverGetNotaDanFoto(token, noTransaksi) {
  return _run(token, function (auth) { return FotoNota.getNotaDanFoto(noTransaksi); });
}
function serverGetSpjData(token, noTransaksi) {
  return _run(token, function (auth) { return FotoNota.getSpjData(noTransaksi); });
}

/* ============================================================
 * Foto Barang
 * ============================================================ */
function serverUploadFotoBarang(token, transactionId, fotoArr) {
  return _run(token, function (auth) { return KasTunai.tambahFotoBarang(transactionId, fotoArr); });
}

/* ============================================================
 * Pengembalian
 * ============================================================ */
function serverGetPengembalian(token, transactionId) {
  return _run(token, function (auth) { return Pengembalian.getPengembalian(transactionId); });
}
function serverTambahPengembalian(token, transactionId, data) {
  return _run(token, function (auth) { return Pengembalian.tambahPengembalian(transactionId, data); });
}
function serverHapusPengembalian(token, transactionId, urutan) {
  return _run(token, function (auth) { return Pengembalian.hapusPengembalian(transactionId, urutan); });
}
function serverRestorePengembalian(token, transactionId, urutan) {
  return _run(token, function (auth) { return Pengembalian.restorePengembalian(transactionId, urutan); });
}

/* ============================================================
 * Master Penyedia
 * ============================================================ */
function serverGetAllPenyedia(token) {
  return _run(token, function (auth) { return MasterPenyedia.getAll(); });
}
function serverSimpanPenyedia(token, data) {
  return _run(token, function (auth) { return MasterPenyedia.simpan(data); });
}
function serverCariPenyedia(token, keyword) {
  return _run(token, function (auth) { return MasterPenyedia.cari(keyword); });
}
/** Peta nama PUM -> nomor HP, untuk tombol Tagih di papan pemantau uang muka. */
function serverGetPetaPUM(token) {
  return _run(token, function (auth) { return MasterPUM.getSemuaPeta(); });
}
/** Simpan nomor HP PUM (dipakai saat pertama kali menagih orang itu). */
function serverSimpanNoHpPUM(token, nama, noHp) {
  return _run(token, function (auth) { return MasterPUM.simpan(nama, noHp); });
}

/* ============================================================
 * SPBY
 * ============================================================ */
function serverSimpanSpby(token, rowIndex, noSpby, tglSpby, nilaiSpby) {
  return _run(token, function (auth) { return KasTunai.simpanSpby(rowIndex, noSpby, tglSpby, nilaiSpby); });
}
function serverHapusSpby(token, rowIndex) {
  return _run(token, function (auth) { return KasTunai.hapusSpby(rowIndex); });
}

/* ============================================================
 * Kuitansi ber-TTD (upload scan/foto)
 * ============================================================ */
function serverUploadKuitansi(token, transactionId, file) {
  return _run(token, function (auth) { return KasTunai.uploadKuitansi(transactionId, file); });
}
function serverHapusKuitansi(token, transactionId) {
  return _run(token, function (auth) { return KasTunai.hapusKuitansi(transactionId); });
}

/* ============================================================
 * Rekap
 * ============================================================ */
function serverGetRekap(token) {
  return _run(token, function (auth) { return KasTunai.getRekap(); });
}

/* ============================================================
 * Auth — hashing & sesi (Fase 1)
 * ============================================================ */

/** SHA-256(salt:password) → base64. Tidak pernah mengembalikan/mencetak password asli.
 *  TODO(keamanan): bila ancaman "sheet bocor" jadi nyata, ganti ke key-stretching
 *  (iterasi computeDigest N kali / PBKDF2). Untuk sekarang salt per-user + lockout memadai. */
function _hash(salt, password) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(salt || '') + ':' + String(password || ''));
  return Utilities.base64Encode(bytes);
}

/** Perbandingan hash constant-time (cegah timing attack). */
function _compareHash(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Validasi token sesi; return {email, role, mustChange}. */
function _auth(token) {
  return Sessions.validate(token);
}

/**
 * Login: verifikasi email+password, buat sesi, kembalikan token.
 * TIDAK memanggil _run() — token belum ada.
 */
function serverLogin(email, password) {
  var _norm = function (e) { return String(e || '').trim().toLowerCase(); };
  email = _norm(email);
  if (!email || !password) throw new Error('Email dan password wajib diisi');

  var user = Users.findForLogin(email);
  if (!user) {
    Utilities.sleep(300);
    throw new Error('Email atau password salah');
  }

  // Cek lockout
  if (user.lockedUntil && !isNaN(user.lockedUntil.getTime()) &&
      user.lockedUntil.getTime() > new Date().getTime()) {
    var hh = ('0' + user.lockedUntil.getHours()).slice(-2);
    var mm = ('0' + user.lockedUntil.getMinutes()).slice(-2);
    throw new Error('Akun terkunci hingga pukul ' + hh + ':' + mm + '. Hubungi admin.');
  }

  if (!user.hash || !user.salt) {
    Utilities.sleep(300);
    throw new Error('Password belum diatur — minta admin untuk mengatur password Anda');
  }

  var hashed = _hash(user.salt, password);
  if (!_compareHash(hashed, user.hash)) {
    var lockInfo = Users.incrementFail(user.rowIndex);
    DeferredFlush.commitAndInvalidate();
    if (lockInfo && lockInfo.locked) {
      throw new Error('Terlalu banyak percobaan gagal — akun dikunci 15 menit');
    }
    throw new Error('Email atau password salah');
  }

  // Berhasil
  Users.resetFail(user.rowIndex);
  var token = Sessions.create(email, user.role, user.mustChange, '');
  DeferredFlush.commitAndInvalidate();
  return { token: token, role: user.role, mustChange: user.mustChange, namaUser: user.nama };
}

/**
 * Logout: invalidasi token.
 * TIDAK memanggil _run() — token mungkin sudah kadaluarsa.
 */
function serverLogout(token) {
  try {
    Sessions.invalidate(String(token || ''));
    DeferredFlush.commitAndInvalidate();
  } catch (e) {
    Logger.log('[Logout] ' + e.message);
  }
  return { success: true };
}

/** Ganti password (token harus valid; boleh dipanggil saat mustChange=Y). */
function serverGantiPassword(token, passwordLama, passwordBaru) {
  var auth = _auth(token);
  if (!passwordBaru || passwordBaru.length < 8) throw new Error('Password baru minimal 8 karakter');

  var user = Users.findForLogin(auth.email);
  if (!user) throw new Error('Pengguna tidak ditemukan');

  if (!user.hash || !user.salt) throw new Error('Password lama belum diatur');
  var hashedLama = _hash(user.salt, passwordLama);
  if (!_compareHash(hashedLama, user.hash)) throw new Error('Password lama salah');

  if (passwordBaru === passwordLama) throw new Error('Password baru tidak boleh sama dengan password lama');

  var saltBaru = Utilities.getUuid();
  var hashBaru = _hash(saltBaru, passwordBaru);
  Users.setPassword(auth.email, hashBaru, saltBaru, false);
  AppCache.remove('sess_' + String(token || ''));
  DeferredFlush.commitAndInvalidate();
  return { success: true };
}

/**
 * Admin atur password user lain (otomatis mustChange=true).
 */
function serverSetPasswordUser(token, targetEmail, passwordBaru) {
  var auth = _auth(token);
  if (auth.role !== 'admin') throw new Error('Akses ditolak: khusus admin');
  if (!passwordBaru || passwordBaru.length < 8) throw new Error('Password minimal 8 karakter');
  var targetNorm = String(targetEmail || '').trim().toLowerCase();
  if (!targetNorm || targetNorm.indexOf('@') < 0) throw new Error('Email target tidak valid');

  var salt = Utilities.getUuid();
  var hash = _hash(salt, passwordBaru);
  Users.setPassword(targetNorm, hash, salt, true);
  DeferredFlush.commitAndInvalidate();
  return { success: true };
}

/**
 * Bootstrap: jalankan sekali dari editor GAS untuk menyiapkan password Super Admin.
 * Contoh: setupSuperAdminPassword('password_sementara_anda')
 */
function setupSuperAdminPassword(passwordBaru) {
  if (!passwordBaru || String(passwordBaru).length < 8) throw new Error('Password minimal 8 karakter');
  var superEmail = String(CONFIG.SUPER_ADMIN || '').trim().toLowerCase();
  if (!superEmail) throw new Error('CONFIG.SUPER_ADMIN belum dikonfigurasi');

  var salt = Utilities.getUuid();
  var hash = _hash(salt, passwordBaru);

  var user = Users.findForLogin(superEmail);
  if (user) {
    Users.setPassword(superEmail, hash, salt, false);
  } else {
    // Super Admin belum ada di sheet Users — tambahkan
    SheetRepo.appendRow(CONFIG.SHEETS.USERS,
      [superEmail, '(Super Admin)', 'admin', new Date(), 'system',
       hash, salt, '', 0, '']);
    DeferredFlush.mark();
  }
  DeferredFlush.commitAndInvalidate();
  Logger.log('Password Super Admin berhasil disiapkan. Email: ' + superEmail);
  return { success: true, email: superEmail };
}

/**
 * BREAK-GLASS: reset password + buka lockout, dijalankan langsung dari editor GAS
 * (bukan lewat web app). Dipakai bila admin terkunci / lupa password.
 * Cara pakai: edit dua konstanta di bawah, lalu klik Run. Setelah bisa masuk,
 * ganti password lewat menu aplikasi. JANGAN commit password asli ke repo.
 */
function resetPasswordDarurat() {
  // ====== EDIT DUA BARIS INI, lalu klik Run ======
  var EMAIL         = 'dausdaba@polikpsorong.ac.id'; // email yang mau direset
  var PASSWORD_BARU = 'GANTI_MIN_8_KARAKTER';        // password sementara (min 8 karakter)
  // ================================================

  var email = String(EMAIL || '').trim().toLowerCase();
  if (!email || email.indexOf('@') < 0) throw new Error('EMAIL tidak valid');
  if (PASSWORD_BARU === 'GANTI_MIN_8_KARAKTER')
    throw new Error('Ganti PASSWORD_BARU dulu sebelum menjalankan');
  if (!PASSWORD_BARU || PASSWORD_BARU.length < 8)
    throw new Error('Password minimal 8 karakter');

  var salt = Utilities.getUuid();
  var hash = _hash(salt, PASSWORD_BARU);
  var user = Users.findForLogin(email);
  if (user) {
    Users.setPassword(email, hash, salt, false);        // set password + buka lockout
  } else if (email === String(CONFIG.SUPER_ADMIN || '').trim().toLowerCase()) {
    // Super Admin belum punya baris di sheet Users — tambahkan (spt setupSuperAdminPassword)
    SheetRepo.appendRow(CONFIG.SHEETS.USERS,
      [email, '(Super Admin)', 'admin', new Date(), 'system', hash, salt, '', 0, '']);
    DeferredFlush.mark();
  } else {
    throw new Error('User ' + email + ' belum terdaftar. Tambahkan via Kelola User dulu.');
  }
  DeferredFlush.commitAndInvalidate();
  Logger.log('[resetPasswordDarurat] password direset & lockout dibuka: ' + email);
  return { success: true, email: email };
}
