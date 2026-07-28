/**
 * _Config.gs
 * Konfigurasi global aplikasi Kas Tunai - Poltek KP Sorong.
 * Semua konstanta, nama sheet, index kolom, dan header didefinisikan di sini
 * agar mudah dirawat dari satu tempat.
 */

var CONFIG = {

  // ID spreadsheet backend (Google Sheets)
  SPREADSHEET_ID: '15TUNtEK740ZP4MvZUJh3253H_iCCLEeoHoKryTdlNj4',

  // Saldo awal kas tunai (saldo sebelum transaksi No.1)
  SALDO_AWAL: 3218000,

  // Saldo awal kas di bank (rekening) — sesuaikan dengan saldo rekening awal
  SALDO_AWAL_BANK: 0,

  // Email (Google) yang boleh MELIHAT SALDO (Tunai/Bank/Total). Email lain yang
  // diberi akses web app = "peninjau" (saldo disembunyikan). Kosongkan array ini
  // ([]) bila ingin SEMUA pengguna melihat saldo (mode lama). Huruf besar/kecil bebas.
  FULL_ACCESS_EMAILS: ['dausdaba@polikpsorong.ac.id'],

  // Super Admin tetap (selalu role 'admin', tak bisa dihapus/diubah dari menu user).
  SUPER_ADMIN: 'dausdaba@polikpsorong.ac.id',


  // Folder Drive root untuk upload (kosong = root My Drive)
  DRIVE_FOLDER_ID: '',

  // Folder Drive "kotak masuk hasil scan" (mis. tujuan Scan-to-Cloud EPSON DS-570W II).
  // Isi dengan ID folder Drive; kosong = fitur Impor Scan nonaktif.
  SCAN_FOLDER_ID: '',

  // Nama-nama sheet
  SHEETS: {
    KAS_TUNAI:      'Kas Tunai',
    MULTI_NOTA:     'Multi Nota',
    FOTO_NOTA:      'Foto Nota',
    PENGEMBALIAN:   'Pengembalian',
    FOTO_BARANG:    'Foto Barang',
    MASTER_PENYEDIA:'Master Penyedia',
    SURAT_TUGAS:    'Surat Tugas',
    BUKTI_PD:       'Bukti Perjalanan',
    AUDIT_LOG:      'Audit Log',
    USERS:          'Users',
    DETAIL_NOTA:    'Detail Nota',
    SESSIONS:       'Sessions',
    SAKTI_SPBY:     'SAKTI_SPBy',
    PAGU:           'Pagu',
    MASTER_PUM:     'Master PUM'
  },

  // Index kolom sheet Kas Tunai (0-based, A-X = 24 kolom inti + kolom kuitansi TTD)
  COLS: {
    NO: 0, TANGGAL: 1, KEGIATAN: 2, PENJAB: 3, DEBET: 4, KREDIT: 5, SALDO: 6,
    KETERANGAN: 7, FILE_ID: 8, NAMA_FILE: 9, URL_FILE: 10, STATUS_SPJ: 11,
    TGL_NOTA: 12, FOTO_BARANG_JML: 13, NOTA_JML: 14, NOTA_TOTAL: 15,
    UANG_DISERAHKAN: 16, KEMBALIAN_JML: 17, KEMBALIAN_TOTAL: 18,
    IS_DELETED: 19, DELETED_AT: 20, DELETED_BY: 21, NO_SPBY: 22, TGL_SPBY: 23,
    KUITANSI_FILE_ID: 24, KUITANSI_NAMA_FILE: 25, KUITANSI_URL: 26,
    SUMBER: 27, REF_TRANSFER: 28, NILAI_SPBY: 29, AKUN: 30, PERSEDIAAN: 31,
    PAJAK_KATEGORI_IDX: 32, PAJAK_PPH: 33, PAJAK_PPN: 34, PAJAK_DPP: 35,
    // Kunci penghubung rekonsiliasi SAKTI (Fase 1) — ditambah di kanan.
    NO_KUITANSI: 36, NO_DRPP: 37, NO_SPP: 38,
    // Status rekonsiliasi SAKTI (Fase 2) — diisi engine, jangan diketik manual.
    STATUS_REKON: 39, REKON_REF_PB: 40, REKON_BATCH: 41,
    // Detail kegiatan (item POK) yang dibebani belanja ini.
    KODE_ITEM: 42, URAIAN_ITEM: 43,
    // Penanda unik dari perangkat pengirim (antrean luring). Dipakai server
    // untuk menolak baris kembar bila jaringan putus SESUDAH baris tersimpan
    // tetapi SEBELUM jawabannya diterima HP.
    CLIENT_ID: 44
  },

  // Header tiap sheet (urut sesuai kolom FISIK sheet asli)
  HEADERS: {
    KAS_TUNAI: [
      'NO', 'TANGGAL', 'KEGIATAN', 'PENJAB', 'DEBET', 'KREDIT', 'SALDO',
      'KETERANGAN', 'FILE_ID', 'NAMA_FILE', 'URL_FILE', 'STATUS_SPJ',
      'TGL_NOTA', 'FOTO_BARANG_JML', 'NOTA_JML', 'NOTA_TOTAL',
      'UANG_DISERAHKAN', 'KEMBALIAN_JML', 'KEMBALIAN_TOTAL',
      'IS_DELETED', 'DELETED_AT', 'DELETED_BY', 'NO_SPBY', 'TGL_SPBY',
      'KUITANSI_FILE_ID', 'KUITANSI_NAMA_FILE', 'KUITANSI_URL',
      'SUMBER', 'REF_TRANSFER', 'NILAI_SPBY', 'AKUN', 'PERSEDIAAN',
      'PAJAK_KATEGORI_IDX', 'PAJAK_PPH', 'PAJAK_PPN', 'PAJAK_DPP',
      'NO_KUITANSI', 'NO_DRPP', 'NO_SPP',
      'STATUS_REKON', 'REKON_REF_PB', 'REKON_BATCH',
      'KODE_ITEM', 'URAIAN_ITEM',
      'CLIENT_ID'
    ],
    MULTI_NOTA: [
      'NO_TRANSAKSI', 'ROW_INDEX', 'URUTAN', 'NAMA_NOTA', 'NOMINAL',
      'FILE_ID', 'NAMA_FILE', 'URL_FILE', 'TGL_UPLOAD',
      'NPWP_PENYEDIA', 'ALAMAT_PENYEDIA', 'IS_DELETED', 'DELETED_AT', 'DELETED_BY',
      'TGL_NOTA',
      // Pajak per nota (melekat pada penyedia nota, bukan pada pengambilan uang)
      'PAJAK_KATEGORI_IDX', 'PAJAK_DPP', 'PAJAK_PPH', 'PAJAK_PPN',
      'PAJAK_TERMASUK_PPN', 'PAJAK_ADA_NPWP',
      // Uang yang benar-benar diserahkan ke penyedia. Disimpan, bukan dihitung
      // ulang saat tampil, supaya angka historisnya tidak ikut berubah bila
      // pajaknya disunting belakangan. Kosong pada baris lama -> dihitung
      // dari NOMINAL - pajak (mode NETTO).
      'DIBAYAR_PENYEDIA',
      // NETTO = pajak ditahan bendahara, toko terima nilai - pajak.
      // BRUTO = toko terima nilai penuh, pajak disetor dari sumber lain.
      // Kosong pada baris lama dibaca sebagai NETTO.
      'MODE_BAYAR'
    ],
    FOTO_NOTA: [
      'NO_TRANSAKSI', 'NOTA_ID', 'URUTAN', 'FILE_ID', 'NAMA_FILE', 'URL_FILE',
      'LAT', 'LNG', 'LOKASI', 'MAPS_URL', 'WAKTU', 'KETERANGAN',
      'IS_DELETED', 'DELETED_AT', 'DELETED_BY'
    ],
    PENGEMBALIAN: [
      'NO_TRANSAKSI', 'URUTAN', 'TANGGAL', 'JUMLAH', 'KETERANGAN',
      'DICATAT_OLEH', 'TGL_CATAT', 'IS_DELETED', 'DELETED_AT', 'DELETED_BY',
      'REF_MASUK_NO',
      // SISA = sisa uang muka yang tidak jadi dibelanjakan.
      // TITIPAN_PAJAK = uang pajak yang ditahan dari nota bermode NETTO.
      // Keduanya sama-sama uang masuk, TETAPI hanya SISA yang boleh mengurangi
      // kewajiban pertanggungjawaban (KEMBALIAN_TOTAL & STATUS_SPJ). Kalau
      // titipan pajak ikut dihitung, sisanya berkurang dua kali dan transaksi
      // terlihat lunas padahal belum. Baris lama dibaca sebagai SISA.
      'JENIS'
    ],
    FOTO_BARANG: [
      'NO_TRANSAKSI', 'ROW_INDEX', 'URUTAN', 'FILE_ID', 'NAMA_FILE', 'URL_FILE',
      'LATITUDE', 'LONGITUDE', 'MAPS_URL', 'WAKTU_FOTO',
      'IS_DELETED', 'DELETED_AT', 'DELETED_BY'
    ],
    MASTER_PENYEDIA: [
      'NO', 'NAMA_PENYEDIA', 'NPWP', 'ALAMAT', 'TERAKHIR_DIGUNAKAN', 'FREKUENSI'
    ],
    SURAT_TUGAS: [
      'NO', 'NO_TRANSAKSI', 'NOMOR_SURAT', 'PEGAWAI', 'NIP', 'PANGKAT', 'JABATAN',
      'MAKSUD', 'ANGKUTAN', 'BERANGKAT', 'TUJUAN', 'TGL_MULAI', 'TGL_SELESAI',
      'JUMLAH_HARI', 'BIAYA', 'AKUN', 'PPK', 'NIP_PPK',
      'LOK_NAMA', 'LOK_JAB', 'KERJA_NAMA', 'KERJA_JAB', 'CREATED_AT', 'CREATED_BY',
      'PEGAWAI_JSON', 'JENIS', 'DASAR_SURAT', 'UANG_MUKA', 'TGL_SURAT',
      'MENIMBANG', 'TTD_NAMA', 'TTD_JAB', 'TTD_NIP',
      'SUMBER_PELAKSANA', 'SUMBER_BENDAHARA'
    ],
    BUKTI_PD: [
      'NO_TRANSAKSI', 'URUTAN', 'FILE_ID', 'NAMA_FILE', 'URL_FILE', 'MIME',
      'JENIS_DOK', 'WAKTU', 'KETERANGAN', 'IS_DELETED', 'DELETED_AT', 'DELETED_BY'
    ],
    AUDIT_LOG: [
      'TIMESTAMP', 'ACTION', 'SHEET', 'ROW_REF', 'DETAIL', 'OPERATOR'
    ],
    USERS: [
      'EMAIL', 'NAMA', 'ROLE', 'CREATED_AT', 'CREATED_BY',
      'PASSWORD_HASH', 'SALT', 'MUST_CHANGE', 'FAILED_ATTEMPTS', 'LOCKED_UNTIL'
    ],
    SESSIONS: [
      'TOKEN', 'EMAIL', 'CREATED_AT', 'EXPIRES_AT', 'LAST_SEEN', 'USER_AGENT'
    ],
    DETAIL_NOTA: [
      'NO_TRANSAKSI', 'ROW_INDEX', 'URUTAN', 'NAMA_BARANG', 'QTY', 'SATUAN',
      'HARGA_SATUAN', 'SUBTOTAL', 'KETERANGAN', 'NOTA_URUTAN', 'FILE_ID',
      'NAMA_FILE', 'URL_FILE', 'LAT', 'LNG', 'MAPS_URL', 'WAKTU',
      'IS_DELETED', 'DELETED_AT', 'DELETED_BY'
    ],
    // Pagu / ketersediaan dana per item POK (Laporan FA Detail 16 Segmen SAKTI).
    // Ditulis hanya oleh impor pagu; angka realisasi di sini = versi SAKTI.
    PAGU: [
      'KODE_ITEM', 'URAIAN_ITEM', 'AKUN', 'URAIAN_AKUN',
      'KODE_KOMPONEN', 'KODE_RO', 'URAIAN_RO', 'KODE_KEGIATAN', 'KODE_PROGRAM',
      'PAGU', 'REALISASI_SAKTI', 'SISA_SAKTI', 'PERIODE', 'IMPORT_BATCH'
    ],
    // Nomor WhatsApp pemegang uang muka, untuk tombol Tagih (tugas 9).
    // Key = nama PUM (case-insensitive), sama seperti MASTER_PENYEDIA.
    MASTER_PUM: [
      'NAMA_PUM', 'NO_HP', 'TERAKHIR_DIPAKAI'
    ],
    // Acuan ekspor SAKTI (Fase 2) — ditulis hanya oleh impor & engine cocok.
    SAKTI_SPBY: [
      'TGL_PB', 'NO_PB', 'AKUN_BELANJA', 'NILAI_AKUN_BELANJA', 'NO_KUITANSI',
      'TGL_KUITANSI', 'NO_DRPP', 'NO_SPP_SSP', 'AKUN_PAJAK', 'NILAI_PAJAK',
      'NO_BUKTI_PUNGUT', 'STATUS_VALIDASI', 'IMPORT_BATCH', 'MATCHED', 'MATCHED_TXN_NO'
    ]
  },

  /**
   * Tabel klasifikasi pajak bendahara — SATU-SATUNYA sumber.
   * Dulu tabel ini hanya ada di index.html, sedangkan mobile memakai daftar
   * ringkas buatan sendiri, sehingga hasil hitungnya bisa berbeda untuk nota
   * yang sama. Sekarang keduanya membaca tabel ini lewat serverGetDashboard.
   *
   * minPPh / minPPN = ambang batas nilai transaksi. Di bawah ambang, pajaknya
   * TIDAK dipungut — inilah yang dulu hilang di mobile sehingga belanja kecil
   * ikut dipotong.
   */
  PAJAK_REF: [
    { label:'BBM / Bahan Bakar',
      kw:['bbm','bahan bakar','pertamina','solar','bensin','pertalite','dexlite'],
      jenisPPh:'', tarifPPh:0, ppn:0,
      mapPPh:'', kjsPPh:'', minPPh:0, minPPN:0,
      catatan:'Tidak dipungut pajak' },
    { label:'Air Minum / PDAM',
      kw:['air minum','pdam','galon','aqua','air mineral'],
      jenisPPh:'', tarifPPh:0, ppn:0,
      mapPPh:'', kjsPPh:'', minPPh:0, minPPN:0,
      catatan:'Tidak dipungut pajak' },
    { label:'Makan Minum / Jamuan / Katering',
      kw:['makan','minum','jamuan','katering','catering','konsumsi','snack','nasi','rumah makan','jasa boga'],
      jenisPPh:'PPh Pasal 23', tarifPPh:0.02, ppn:0,
      mapPPh:'411124', kjsPPh:'104', minPPh:0, minPPN:0,
      catatan:'Makan minum bukan BKP, tidak kena PPN' },
    { label:'Sewa Kapal',
      kw:['sewa kapal','sewa perahu','charter kapal','sewa speedboat'],
      jenisPPh:'PPh Pasal 23', tarifPPh:0.02, ppn:0.11,
      mapPPh:'411124', kjsPPh:'104', minPPh:0, minPPN:1000000,
      catatan:'' },
    { label:'Sewa Kendaraan Darat',
      kw:['sewa kendaraan','sewa mobil','sewa bus','rental','sewa motor'],
      jenisPPh:'PPh Pasal 23', tarifPPh:0.02, ppn:0.11,
      mapPPh:'411124', kjsPPh:'104', minPPh:0, minPPN:1000000,
      catatan:'' },
    { label:'Sewa Gedung / Ruangan',
      kw:['sewa gedung','sewa ruangan','sewa aula','sewa tempat','sewa hotel','sewa kamar'],
      jenisPPh:'PPh Final 4(2)', tarifPPh:0.1, ppn:0.11,
      mapPPh:'411128', kjsPPh:'403', minPPh:0, minPPN:1000000,
      catatan:'Sewa tanah/bangunan' },
    { label:'Perencanaan / Pengawasan Konstruksi',
      kw:['perencanaan konstruksi','pengawasan konstruksi','konsultan perencana','konsultan pengawas','manajemen konstruksi','supervisi konstruksi','konsultan konstruksi'],
      jenisPPh:'PPh Final 4(2)', tarifPPh:0.035, ppn:0.11,
      mapPPh:'411128', kjsPPh:'409', minPPh:0, minPPN:1000000,
      catatan:'Perencana/pengawas konstruksi bersertifikat (PP 9/2022) - tanpa sertifikat 6%' },
    { label:'Konstruksi (Pelaksana Menengah/Besar)',
      kw:['konstruksi pt','kontraktor besar','konstruksi menengah','kualifikasi menengah','kualifikasi besar'],
      jenisPPh:'PPh Final 4(2)', tarifPPh:0.0265, ppn:0.11,
      mapPPh:'411128', kjsPPh:'409', minPPh:0, minPPN:1000000,
      catatan:'Pelaksana konstruksi kualifikasi menengah/besar (PP 9/2022)' },
    { label:'Konstruksi / Renovasi (Pelaksana Kecil)',
      kw:['konstruksi','renovasi','pembangunan','bangun','rehab','pemasangan'],
      jenisPPh:'PPh Final 4(2)', tarifPPh:0.0175, ppn:0.11,
      mapPPh:'411128', kjsPPh:'409', minPPh:0, minPPN:1000000,
      catatan:'Pelaksana konstruksi kualifikasi kecil (PP 9/2022) - tanpa sertifikat 4%' },
    { label:'Jasa Servis / Perbaikan / Instalasi',
      kw:['servis','service','perbaikan','instalasi','reparasi','perawatan ac'],
      jenisPPh:'PPh Pasal 23', tarifPPh:0.02, ppn:0.11,
      mapPPh:'411124', kjsPPh:'104', minPPh:0, minPPN:1000000,
      catatan:'' },
    { label:'Jasa Pemeliharaan / Kebersihan',
      kw:['pemeliharaan','kebersihan','cleaning','perawatan','jasa kebersihan'],
      jenisPPh:'PPh Pasal 23', tarifPPh:0.02, ppn:0.11,
      mapPPh:'411124', kjsPPh:'104', minPPh:0, minPPN:1000000,
      catatan:'' },
    { label:'ATK / Alat Tulis',
      kw:['atk','alat tulis','kertas','tinta','pulpen','map','spidol','amplop'],
      jenisPPh:'PPh Pasal 22', tarifPPh:0.015, ppn:0.11,
      mapPPh:'411122', kjsPPh:'910', minPPh:2000000, minPPN:1000000,
      catatan:'PPh 22 hanya bila >= Rp 2 juta' },
    { label:'Peralatan / Barang Modal / Elektronik',
      kw:['peralatan','elektronik','komputer','laptop','printer','mesin','barang modal','proyektor','kamera','ac '],
      jenisPPh:'PPh Pasal 22', tarifPPh:0.015, ppn:0.11,
      mapPPh:'411122', kjsPPh:'910', minPPh:2000000, minPPN:1000000,
      catatan:'PPh 22 hanya bila >= Rp 2 juta' },
    { label:'Keperluan Kantor / Rumah Tangga',
      kw:['keperluan kantor','rumah tangga','perlengkapan','alat kebersihan','barang habis pakai'],
      jenisPPh:'PPh Pasal 22', tarifPPh:0.015, ppn:0.11,
      mapPPh:'411122', kjsPPh:'910', minPPh:2000000, minPPN:1000000,
      catatan:'PPh 22 hanya bila >= Rp 2 juta' },
    { label:'Obat / Kesehatan',
      kw:['obat','kesehatan','medis','apotek','apotik','p3k','vitamin','masker'],
      jenisPPh:'', tarifPPh:0, ppn:0,
      mapPPh:'', kjsPPh:'', minPPh:0, minPPN:0,
      catatan:'Tidak dipungut pajak' },
    { label:'Transport / Perjalanan Dinas',
      kw:['transport','perjalanan dinas','tiket','perjadin','taksi','ojek','grab','gojek','penginapan'],
      jenisPPh:'', tarifPPh:0, ppn:0,
      mapPPh:'', kjsPPh:'', minPPh:0, minPPN:0,
      catatan:'Tidak dipungut pajak' },
    { label:'Listrik / PLN / Komunikasi',
      kw:['listrik','pln','telepon','pulsa','internet','komunikasi','token','wifi','indihome'],
      jenisPPh:'', tarifPPh:0, ppn:0,
      mapPPh:'', kjsPPh:'', minPPh:0, minPPN:0,
      catatan:'Tidak dipungut pajak' },
    { label:'Pakan / Bibit Perikanan',
      kw:['pakan','bibit','benih','ikan','perikanan','pelet','udang','pupuk'],
      jenisPPh:'', tarifPPh:0, ppn:0,
      mapPPh:'', kjsPPh:'', minPPh:0, minPPN:0,
      catatan:'Tidak dipungut pajak' },
    { label:'Pendidikan / Pelatihan',
      kw:['pendidikan','pelatihan','diklat','seminar','workshop','bimtek','sosialisasi'],
      jenisPPh:'', tarifPPh:0, ppn:0,
      mapPPh:'', kjsPPh:'', minPPh:0, minPPN:0,
      catatan:'Tidak dipungut pajak' },
    { label:'Honor Narasumber',
      kw:['honor','narasumber','honorarium','fee','moderator'],
      jenisPPh:'PPh Pasal 21', tarifPPh:0, ppn:0,
      mapPPh:'411121', kjsPPh:'100', minPPh:0, minPPN:0,
      catatan:'Tarif sesuai tabel PPh 21 - hitung manual' }
  ],

  PAJAK_DEFAULT:
    { label:'Lain-lain (tanpa pajak otomatis)',
      kw:[],
      jenisPPh:'', tarifPPh:0, ppn:0,
      mapPPh:'', kjsPPh:'', minPPh:0, minPPN:0,
      catatan:'Tidak terklasifikasi - periksa manual' },

  /**
   * Ikon aplikasi (favicon + ikon layar utama HP).
   * Apps Script hanya menerima URL, bukan berkas lokal, sehingga PNG di folder
   * assets/ disajikan dari repositori publik GitHub. Ganti URL ini bila berkas
   * dipindahkan ke tempat lain (mis. Drive yang dibagikan ke publik).
   * Berkas sumbernya: assets/icon.svg.
   */
  ICON_URL: 'https://raw.githubusercontent.com/dausdabamona/kas-tunai/refs/heads/claude/determined-archimedes-od8jtc/assets/icon-192.png',

  // Identitas instansi (untuk laporan SPJ & SSP pajak)
  /**
   * Identitas instansi & pejabat penanda tangan.
   * Dipakai oleh tampilan mobile lewat serverGetInstansi(). Tampilan desktop
   * masih memakai objek INST di index.html — jaga agar keduanya sama bila ada
   * perubahan nama/NIP pejabat.
   */
  INSTANSI: {
    namaWP:      'Politeknik Kelautan dan Perikanan Sorong',
    npwpWP:      '',
    alamatWP:    'Jl. Kapitan Pattimura, Suprau, Kota Sorong',
    kota:        'Sorong',
    kementerian: 'KEMENTERIAN KELAUTAN DAN PERIKANAN',
    eselon1:     'BADAN PENYULUHAN DAN PENGEMBANGAN SUMBER DAYA MANUSIA KELAUTAN DAN PERIKANAN',
    satker:      'POLITEKNIK KELAUTAN DAN PERIKANAN SORONG',
    kopAlamat:   'Jalan Kapitan Pattimura, Kelurahan Malaingkedi, Distrik Sorong Utara, Kota Sorong, Papua Barat Daya',
    kopTelp:     '(0951) 321039',
    kopLaman:    'www.polikpsorong.ac.id',
    bendahara:   'Abdul Rauf Muhammad Saleh',
    nipBendahara:'198309122007011001',
    ppk:         'Firdaus Dabamona, S.T.',
    nipPpk:      '198201032007011002',
    namaBank: '',
    noRekening: ''
  }
};

// Nilai flag soft-delete
var FLAG_DELETED = 'Y';
var FLAG_ACTIVE  = '';
