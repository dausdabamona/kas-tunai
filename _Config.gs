/**
 * _Config.gs
 * Konfigurasi global aplikasi Kas Tunai - Poltek KP Sorong.
 * Semua konstanta, nama sheet, index kolom, dan header didefinisikan di sini
 * agar mudah dirawat dari satu tempat.
 */

var CONFIG = {

  // ID spreadsheet backend (Google Sheets)
  SPREADSHEET_ID: '15TUNtEK740ZP4MvZUJh3253H_iCCLEeoHoKryTdlNj4',

  // Saldo awal kas tunai
  SALDO_AWAL: 3461000,

  // Folder Drive root untuk upload (kosong = root My Drive)
  DRIVE_FOLDER_ID: '',

  // Nama-nama sheet
  SHEETS: {
    KAS_TUNAI:      'Kas Tunai',
    MULTI_NOTA:     'Multi Nota',
    FOTO_NOTA:      'Foto Nota',
    PENGEMBALIAN:   'Pengembalian',
    FOTO_BARANG:    'Foto Barang',
    MASTER_PENYEDIA:'Master Penyedia',
    AUDIT_LOG:      'Audit Log'
  },

  // Index kolom sheet Kas Tunai (0-based, A-X = 24 kolom)
  COLS: {
    NO: 0, TANGGAL: 1, KEGIATAN: 2, PENJAB: 3, DEBET: 4, KREDIT: 5, SALDO: 6,
    KETERANGAN: 7, FILE_ID: 8, NAMA_FILE: 9, URL_FILE: 10, STATUS_SPJ: 11,
    TGL_NOTA: 12, FOTO_BARANG_JML: 13, NOTA_JML: 14, NOTA_TOTAL: 15,
    UANG_DISERAHKAN: 16, KEMBALIAN_JML: 17, KEMBALIAN_TOTAL: 18,
    IS_DELETED: 19, DELETED_AT: 20, DELETED_BY: 21, NO_SPBY: 22, TGL_SPBY: 23
  },

  // Header tiap sheet (urut sesuai kolom)
  HEADERS: {
    KAS_TUNAI: [
      'NO', 'TANGGAL', 'KEGIATAN', 'PENJAB', 'DEBET', 'KREDIT', 'SALDO',
      'KETERANGAN', 'FILE_ID', 'NAMA_FILE', 'URL_FILE', 'STATUS_SPJ',
      'TGL_NOTA', 'FOTO_BARANG_JML', 'NOTA_JML', 'NOTA_TOTAL',
      'UANG_DISERAHKAN', 'KEMBALIAN_JML', 'KEMBALIAN_TOTAL',
      'IS_DELETED', 'DELETED_AT', 'DELETED_BY', 'NO_SPBY', 'TGL_SPBY'
    ],
    MULTI_NOTA: [
      'NO_TRANSAKSI', 'URUTAN', 'NAMA_PENYEDIA', 'NO_NOTA', 'TGL_NOTA',
      'NILAI', 'KETERANGAN', 'FILE_ID', 'NAMA_FILE', 'URL_FILE',
      'CREATED_AT', 'IS_DELETED', 'DELETED_AT', 'DELETED_BY'
    ],
    FOTO_NOTA: [
      'NO_TRANSAKSI', 'NOTA_ID', 'URUTAN', 'FILE_ID', 'NAMA_FILE', 'URL_FILE',
      'LAT', 'LNG', 'CREATED_AT', 'IS_DELETED', 'DELETED_AT', 'DELETED_BY'
    ],
    PENGEMBALIAN: [
      'NO_TRANSAKSI', 'URUTAN', 'TANGGAL', 'NILAI', 'KETERANGAN',
      'CREATED_AT', 'IS_DELETED', 'DELETED_AT', 'DELETED_BY'
    ],
    FOTO_BARANG: [
      'NO_TRANSAKSI', 'URUTAN', 'FILE_ID', 'NAMA_FILE', 'URL_FILE',
      'CREATED_AT', 'IS_DELETED', 'DELETED_AT', 'DELETED_BY'
    ],
    MASTER_PENYEDIA: [
      'NAMA', 'NPWP', 'ALAMAT', 'CREATED_AT', 'IS_DELETED', 'DELETED_AT', 'DELETED_BY'
    ],
    AUDIT_LOG: [
      'TIMESTAMP', 'OPERATOR', 'ACTION', 'SHEET', 'RECORD_ID', 'DETAIL'
    ]
  },

  // Identitas instansi (untuk laporan SPJ & SSP pajak)
  INSTANSI: {
    namaWP:   'Politeknik Kelautan dan Perikanan Sorong',
    npwpWP:   '00.000.000.0-000.000',
    alamatWP: 'Jl. Kapitan Pattimura, Tanjung Kasuari, Sorong, Papua Barat Daya',
    bendahara:'',
    kota:     'Sorong'
  }
};

// Nilai flag soft-delete
var FLAG_DELETED = 'Y';
var FLAG_ACTIVE  = '';
