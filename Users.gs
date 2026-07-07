/**
 * Users.gs
 * Manajemen pengguna + peran (role) untuk akses web app.
 * Role: 'admin' (kelola user + lihat saldo), 'full' (lihat saldo), 'viewer' (tanpa saldo).
 * Super Admin (CONFIG.SUPER_ADMIN) selalu 'admin' dan tak dapat diubah/dihapus.
 */
var Users = (function () {

  function UC() { return Util.colMap(CONFIG.SHEETS.USERS); }
  function _norm(e) { return String(e || '').trim().toLowerCase(); }
  function _isSuper(email) { return _norm(email) === _norm(CONFIG.SUPER_ADMIN); }

  /** Role untuk satu email. Tak dikenal / kosong → 'viewer'. */
  function getRole(email) {
    email = _norm(email);
    if (email && _isSuper(email)) return 'admin';
    if (!email) return 'viewer';
    var c = UC(), data = SheetRepo.getData(CONFIG.SHEETS.USERS);
    for (var i = 0; i < data.length; i++) {
      if (_norm(data[i][c.EMAIL]) === email) {
        return String(data[i][c.ROLE] || 'viewer').toLowerCase();
      }
    }
    return 'viewer';
  }

  /** Daftar user (Super Admin selalu di atas, terkunci). */
  function list() {
    var c = UC(), data = SheetRepo.getData(CONFIG.SHEETS.USERS), out = [];
    out.push({ email: CONFIG.SUPER_ADMIN, nama: '(Super Admin)', role: 'admin', locked: true });
    for (var i = 0; i < data.length; i++) {
      var e = _norm(data[i][c.EMAIL]);
      if (!e || _isSuper(e)) continue;
      out.push({
        email: data[i][c.EMAIL], nama: data[i][c.NAMA] || '',
        role: String(data[i][c.ROLE] || 'viewer').toLowerCase(), locked: false
      });
    }
    return out;
  }

  function _findRow(email) {
    var c = UC(), data = SheetRepo.getData(CONFIG.SHEETS.USERS);
    email = _norm(email);
    for (var i = 0; i < data.length; i++) if (_norm(data[i][c.EMAIL]) === email) return i + 2;
    return 0;
  }

  function _validRole(r) {
    r = String(r || 'viewer').toLowerCase();
    return (r === 'admin' || r === 'full' || r === 'viewer') ? r : 'viewer';
  }

  function add(email, nama, role) {
    email = _norm(email);
    if (!email) throw new Error('Email wajib diisi');
    if (email.indexOf('@') < 0) throw new Error('Format email tidak valid');
    if (_isSuper(email)) throw new Error('Email tersebut adalah Super Admin (otomatis admin)');
    if (_findRow(email)) throw new Error('Email sudah terdaftar');
    SheetRepo.appendRow(CONFIG.SHEETS.USERS,
      [email, nama || '', _validRole(role), new Date(), getOperator()]);
    DeferredFlush.mark();
    return { success: true };
  }

  function update(email, nama, role) {
    email = _norm(email);
    if (_isSuper(email)) throw new Error('Super Admin tidak dapat diubah');
    var row = _findRow(email);
    if (!row) throw new Error('User tidak ditemukan');
    var c = UC();
    SheetRepo.setCells(CONFIG.SHEETS.USERS, row,
      Util.set(c.NAMA, nama || '', c.ROLE, _validRole(role)));
    DeferredFlush.mark();
    return { success: true };
  }

  function remove(email) {
    email = _norm(email);
    if (_isSuper(email)) throw new Error('Super Admin tidak dapat dihapus');
    var row = _findRow(email);
    if (!row) throw new Error('User tidak ditemukan');
    SheetRepo.sheet(CONFIG.SHEETS.USERS).deleteRow(row);
    DeferredFlush.mark();
    return { success: true };
  }

  /** Pastikan sheet Users punya cukup kolom untuk kolom password. */
  function _ensureUserCols() {
    SheetRepo.ensureMinCols(CONFIG.SHEETS.USERS, CONFIG.HEADERS.USERS.length);
  }

  /**
   * Ambil data login user (termasuk hash & salt) untuk proses autentikasi.
   * Return null bila email tidak ditemukan di sheet.
   */
  function findForLogin(email) {
    email = _norm(email);
    if (!email) return null;
    var c = UC(), data = SheetRepo.getData(CONFIG.SHEETS.USERS);
    for (var i = 0; i < data.length; i++) {
      if (_norm(data[i][c.EMAIL]) === email) {
        var lockedRaw = data[i][c.LOCKED_UNTIL];
        return {
          rowIndex: i + 2,
          role: _validRole(data[i][c.ROLE]),
          nama: String(data[i][c.NAMA] || ''),
          hash: String(data[i][c.PASSWORD_HASH] || ''),
          salt: String(data[i][c.SALT] || ''),
          mustChange: String(data[i][c.MUST_CHANGE] || '') === 'Y',
          failedAttempts: parseInt(String(data[i][c.FAILED_ATTEMPTS] || '0'), 10) || 0,
          lockedUntil: lockedRaw ? new Date(lockedRaw) : null
        };
      }
    }
    return null;
  }

  /** Simpan hash & salt password user; mustChange='Y' bila mustChange=true. */
  function setPassword(email, hash, salt, mustChange) {
    _ensureUserCols();
    email = _norm(email);
    var c = UC();
    var row = _findRow(email);
    if (!row) throw new Error('User tidak ditemukan: ' + email);
    SheetRepo.setCells(CONFIG.SHEETS.USERS, row, Util.set(
      c.PASSWORD_HASH, hash,
      c.SALT, salt,
      c.MUST_CHANGE, mustChange ? 'Y' : '',
      c.FAILED_ATTEMPTS, 0,
      c.LOCKED_UNTIL, ''));
    DeferredFlush.mark();
  }

  /**
   * Tambah satu percobaan gagal login. Bila >= 5, kunci akun 15 menit.
   * Return {locked:boolean, lockUntil?:Date}.
   */
  function incrementFail(rowIndex) {
    _ensureUserCols();
    var lock = LockService.getScriptLock();
    try { lock.waitLock(5000); } catch (e) { throw new Error('Sistem sibuk, coba lagi'); }
    try {
      var c = UC(), data = SheetRepo.getData(CONFIG.SHEETS.USERS);
      var rowData = data[rowIndex - 2];
      var fails = parseInt(String(rowData ? rowData[c.FAILED_ATTEMPTS] : '0') || '0', 10) + 1;
      if (fails >= 5) {
        var lockUntil = new Date(new Date().getTime() + 15 * 60 * 1000);
        SheetRepo.setCells(CONFIG.SHEETS.USERS, rowIndex, Util.set(
          c.FAILED_ATTEMPTS, 0, c.LOCKED_UNTIL, lockUntil.toISOString()));
        DeferredFlush.mark();
        return { locked: true, lockUntil: lockUntil };
      }
      SheetRepo.setCells(CONFIG.SHEETS.USERS, rowIndex, Util.set(c.FAILED_ATTEMPTS, fails));
      DeferredFlush.mark();
      return { locked: false, fails: fails };
    } finally {
      lock.releaseLock();
    }
  }

  /** Reset hitungan gagal login setelah login berhasil. */
  function resetFail(rowIndex) {
    _ensureUserCols();
    var c = UC();
    SheetRepo.setCells(CONFIG.SHEETS.USERS, rowIndex, Util.set(
      c.FAILED_ATTEMPTS, 0, c.LOCKED_UNTIL, ''));
    DeferredFlush.mark();
  }

  return {
    getRole: getRole, list: list, add: add, update: update, remove: remove,
    findForLogin: findForLogin, setPassword: setPassword,
    incrementFail: incrementFail, resetFail: resetFail
  };
})();

/* ============================================================
 * Sessions — manajemen sesi berbasis token (UUID)
 * TTL sesi: 8 jam. Token di-cache AppCache (60 dtk) untuk fast path.
 * ============================================================ */
var Sessions = (function () {

  var TTL_MS   = 8 * 60 * 60 * 1000; // 8 jam
  var CACHE_TTL = 60;                  // detik (AppCache)

  function _SC() { return Util.colMap(CONFIG.SHEETS.SESSIONS); }
  function _cacheKey(token) { return 'sess_' + String(token || ''); }

  /** Baca status mustChange terbaru dari sheet Users. */
  function _getMustChange(email) {
    var c = Util.colMap(CONFIG.SHEETS.USERS);
    var data = SheetRepo.getData(CONFIG.SHEETS.USERS);
    var em = String(email || '').toLowerCase().trim();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][c.EMAIL] || '').toLowerCase().trim() === em) {
        return String(data[i][c.MUST_CHANGE] || '') === 'Y';
      }
    }
    return false;
  }

  /** Hapus baris Sessions yang sudah kadaluarsa (iterasi mundur, max limit baris). */
  function _cleanExpired(limit) {
    var c = _SC(), data = SheetRepo.getData(CONFIG.SHEETS.SESSIONS);
    var now = new Date().getTime(), deleted = 0;
    var sh = SheetRepo.sheet(CONFIG.SHEETS.SESSIONS);
    for (var i = data.length - 1; i >= 0 && deleted < limit; i--) {
      try {
        var expVal = data[i][c.EXPIRES_AT];
        if (expVal && new Date(expVal).getTime() <= now) {
          sh.deleteRow(i + 2);
          deleted++;
        }
      } catch (e) {}
    }
    if (deleted > 0) SheetRepo.invalidate(CONFIG.SHEETS.SESSIONS);
  }

  /**
   * Buat token sesi baru dan simpan ke sheet Sessions.
   * Return token (UUID string).
   */
  function create(email, role, mustChange, userAgent) {
    var token = Utilities.getUuid();
    var now = new Date();
    var expires = new Date(now.getTime() + TTL_MS);
    SheetRepo.appendRow(CONFIG.SHEETS.SESSIONS, [
      token, email, now.toISOString(), expires.toISOString(), now.toISOString(),
      String(userAgent || '')
    ]);
    DeferredFlush.mark();
    var obj = { email: String(email), role: String(role), mustChange: !!mustChange };
    AppCache.put(_cacheKey(token), obj, CACHE_TTL);
    _cleanExpired(30);
    return token;
  }

  /**
   * Validasi token: cek AppCache dulu (fast), lalu sheet.
   * Return {email, role, mustChange}. Lempar Error bila tidak valid/kadaluarsa.
   */
  function validate(token) {
    token = String(token || '').trim();
    if (!token) throw new Error('Sesi tidak valid: silakan login kembali');

    // Fast path: AppCache (60 dtk)
    var cached = AppCache.get(_cacheKey(token));
    if (cached && cached.email) return cached;

    // Slow path: baca sheet
    var c = _SC(), data = SheetRepo.getData(CONFIG.SHEETS.SESSIONS);
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][c.TOKEN] || '') !== token) continue;
      var exp = new Date(data[i][c.EXPIRES_AT]);
      if (isNaN(exp.getTime()) || exp.getTime() <= new Date().getTime()) {
        throw new Error('Sesi kadaluarsa: silakan login kembali');
      }
      var email = String(data[i][c.EMAIL] || '');
      var role = Users.getRole(email);
      var mustChange = _getMustChange(email);
      // Perbarui LAST_SEEN
      SheetRepo.setCells(CONFIG.SHEETS.SESSIONS, i + 2,
        Util.set(c.LAST_SEEN, new Date().toISOString()));
      DeferredFlush.mark();
      var out = { email: email, role: role, mustChange: mustChange };
      AppCache.put(_cacheKey(token), out, CACHE_TTL);
      return out;
    }
    throw new Error('Sesi tidak ditemukan: silakan login kembali');
  }

  /**
   * Hapus token dari AppCache dan sheet (logout / invalidasi paksa).
   */
  function invalidate(token) {
    token = String(token || '').trim();
    if (!token) return;
    AppCache.remove(_cacheKey(token));
    var c = _SC(), data = SheetRepo.getData(CONFIG.SHEETS.SESSIONS);
    var sh = SheetRepo.sheet(CONFIG.SHEETS.SESSIONS);
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][c.TOKEN] || '') === token) {
        sh.deleteRow(i + 2);
        SheetRepo.invalidate(CONFIG.SHEETS.SESSIONS);
        break;
      }
    }
  }

  return { create: create, validate: validate, invalidate: invalidate };
})();
