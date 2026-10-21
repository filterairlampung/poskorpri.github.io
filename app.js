// =========================================================
// KONFIGURASI URL BACKEND GOOGLE APPS SCRIPT & SPREADSHEET
// =========================================================
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycby65bXgUabR18JjEKgTaY_9tjvI9xQJxk5aE4eJ5kniKzuYh2bBCn0aHAFfBIJ1vJdnsg/exec";
const SPREADSHEET_ID = "1YGUEjmgn-LNlAcD52vApdRkMKlZ5ECiC06T3e08JLLM";

// =========================================================
// VARIABEL GLOBAL STATE APLIKASI
// =========================================================
var namaKasirAktif = "Kasir";
var roleAktif = "Kasir";
var dataMasterProduk = [];
var dataHargaKhusus = [];
var keranjang = [];
var totalKeranjangRp = 0;
var totalItemKeranjang = 0;
var totalAkhirSetelahDiskon = 0;
var riwayatMaster = [];
var teksStrukTerakhir = "";
var dataStrukTerakhir = null;
var idNotaTerakhir = "";
var currentKategoriKasir = "";
var currentReportModul = "penjualan";
var tglStart = "";
var tglEnd = "";
var periodeAktif = "Bulan Ini";
var rawLaporanPenjualanData = null;
var currentTipeRincianPenj = "ringkasan";
var currentViewModePenj = "table";
var rincianChartPenjObj = null;
var rawStokData = null;
var rawLaporanPengeluaranData = null;
var currentTipeRincianPeng = "harian";
var currentViewModePeng = "table";
var rincianChartPengObj = null;
var rawLaporanPiutangData = null;
var currentTabPiutang = "pelanggan";
var settingToko = {};
var keranjangMutasi = [];
var dataPiutangAktif = [];
var currentPiutangId = "";
var currentPiutangSisa = 0;
var currentEditId = "";
var currentEditJenis = "";
var currentEditDataLama = null;
var currentNgampasId = "";
var currentNgampasItems = [];
var calculatedTotalNgampas = 0;
var teksLaporGlobal = "";
var elemenUntukPDF = null;
var opsiPDF = null;
var currentFilterPelangganKhusus = "";

// Variabel Web Bluetooth Printer & PWA
var btDevice = null;
var btCharacteristic = null;
var deferredPromptPWA = null;

// =========================================================
// HELPER SAFEGUARD DOM (ANTI ERROR NULL CLASSLIST)
// =========================================================
function getEl(id) {
  return document.getElementById(id);
}

function hasClassActive(id) {
  var el = document.getElementById(id);
  return !!(el && el.classList && el.classList.contains("active"));
}

function addClassSafe(elOrId, className) {
  var el = typeof elOrId === "string" ? document.getElementById(elOrId) : elOrId;
  if (!el || !el.classList) return;
  el.classList.add(className);
}

function removeClassSafe(elOrId, className) {
  var el = typeof elOrId === "string" ? document.getElementById(elOrId) : elOrId;
  if (!el || !el.classList) return;
  el.classList.remove(className);
}

function toggleClassSafe(elOrId, className) {
  var el = typeof elOrId === "string" ? document.getElementById(elOrId) : elOrId;
  if (!el || !el.classList) return;
  el.classList.toggle(className);
}

function getTanggalHariIniStr() {
  var d = new Date();
  return (
    ("0" + d.getDate()).slice(-2) +
    "/" +
    ("0" + (d.getMonth() + 1)).slice(-2) +
    "/" +
    d.getFullYear()
  );
}

function getWaktuSekarangStr() {
  var d = new Date();
  return (
    ("0" + d.getHours()).slice(-2) +
    ":" +
    ("0" + d.getMinutes()).slice(-2) +
    ":" +
    ("0" + d.getSeconds()).slice(-2)
  );
}

function konversiTanggalInputKeStr(valInput) {
  if (!valInput) return getTanggalHariIniStr();
  var p = valInput.split("-");
  if (p.length === 3) return p[2] + "/" + p[1] + "/" + p[0];
  return valInput;
}

// =========================================================
// JEMBATAN KOMUNIKASI REST API KE GOOGLE APPS SCRIPT
// =========================================================
function callBackend(action, payload, onSuccess, onError) {
  var bodyData = Object.assign(
    { action: action, spreadsheetId: SPREADSHEET_ID },
    payload || {}
  );

  // Fallback otomatis jika dijalankan di dalam lingkungan iframe Google Apps Script
  if (
    (!GAS_WEB_APP_URL || GAS_WEB_APP_URL === "MASUKKAN_URL_DEPLOYMENT_GAS_ANDA_DI_SINI") &&
    typeof google !== "undefined" &&
    google.script &&
    google.script.run
  ) {
    var runner = google.script.run
      .withSuccessHandler(function (res) {
        if (onSuccess) onSuccess(res);
      })
      .withFailureHandler(function (err) {
        if (onError) onError(err);
        else alert("Sistem Error: " + (err.message || err));
      });

    switch (action) {
      case "prosesLogin":
        return runner.prosesLogin(bodyData.username, bodyData.password);
      case "getProduk":
        return runner.getProduk();
      case "getDashboardData":
        return runner.getDashboardData();
      case "simpanTransaksi":
        return runner.simpanTransaksi(bodyData.data);
      case "simpanArusKas":
        return runner.simpanArusKas(bodyData.data);
      case "simpanMutasiBatch":
        return runner.simpanMutasiBatch(bodyData.data);
      case "tambahProdukBaru":
        return runner.tambahProdukBaru(bodyData.data);
      case "lunasiHutang":
        return runner.lunasiHutang(
          bodyData.idTrx,
          bodyData.nominalCicilan,
          bodyData.metodeCicilan
        );
      case "batalkanTransaksi":
        return runner.batalkanTransaksi(bodyData.idTrx);
      case "getDetailTransaksi":
        return runner.getDetailTransaksi(bodyData.idTrx);
      case "getDetailForEdit":
        return runner.getDetailForEdit(bodyData.id, bodyData.jenis);
      case "simpanUpdateEdit":
        return runner.simpanUpdateEdit(
          bodyData.id,
          bodyData.jenis,
          bodyData.dataLama,
          bodyData.dataBaru
        );
      case "getDaftarNgampasTerintegrasi":
        return runner.getDaftarNgampasTerintegrasi();
      case "selesaikanNgampasTerintegrasi":
        return runner.selesaikanNgampasTerintegrasi(
          bodyData.idTrx,
          bodyData.dataRetur,
          bodyData.setoranAktual,
          bodyData.diskonMurni,
          bodyData.metodeSetoran
        );
      case "getDaftarPiutangAktif":
        return runner.getDaftarPiutangAktif();
      case "getLaporanPenjualanLengkap":
        return runner.getLaporanPenjualanLengkap(bodyData.startDate, bodyData.endDate);
      case "getLaporanStokLengkap":
        return runner.getLaporanStokLengkap();
      case "getLaporanPengeluaranLengkap":
        return runner.getLaporanPengeluaranLengkap(bodyData.startDate, bodyData.endDate);
      case "getLaporanPiutangLengkap":
        return runner.getLaporanPiutangLengkap(bodyData.startDate, bodyData.endDate);
      case "getPengaturanToko":
        return runner.getPengaturanToko();
      case "simpanPengaturanToko":
        return runner.simpanPengaturanToko(bodyData.data);
      case "tutupKasManualSistem":
        return runner.tutupKasManualSistem();
      case "tutupKasMasaLaluSistem":
        return runner.tutupKasMasaLaluSistem(bodyData.tanggalStr);
    }
  }

  if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL === "MASUKKAN_URL_DEPLOYMENT_GAS_ANDA_DI_SINI") {
    var msg = "URL Backend Google Apps Script belum dipasang di file app.js!";
    if (onError) onError(new Error(msg));
    else alert(msg);
    return;
  }

  fetch(GAS_WEB_APP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(bodyData)
  })
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP Status " + response.status);
      return response.json();
    })
    .then(function (res) {
      if (onSuccess) onSuccess(res);
    })
    .catch(function (err) {
      if (onError) onError(err);
      else alert("Gagal terhubung ke server: " + err.message);
    });
}

// =========================================================
// INISIALISASI SAAT HALAMAN DIMUAT & PWA SETUP
// =========================================================
window.onload = function () {
  // Registrasi Service Worker untuk PWA
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }

  // Listener tombol Enter pada halaman Login
  var inputUser = getEl("username");
  var inputPass = getEl("password");
  if (inputUser) {
    inputUser.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        if (inputPass) inputPass.focus();
      }
    });
  }
  if (inputPass) {
    inputPass.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        cekLogin();
      }
    });
  }

  // Auto-format titik ribuan Rupiah pada semua input uang
  var idUang = [
    "nominal-bayar",
    "input-diskon",
    "kas-nominal",
    "add-modal",
    "add-jual",
    "input-setoran-aktual",
    "input-bayar-piutang"
  ];
  idUang.forEach(function (id) {
    var el = getEl(id);
    if (el) {
      el.type = "text";
      el.addEventListener("input", function () {
        formatInputRupiah(this);
      });
    }
  });

  // Inisialisasi opsi dropdown Jenis Arus Kas
  ubahKategoriKas();

  // Cek sesi login 24 jam
  try {
    cekSesiLogin();
  } catch (e) {}

  muatPengaturan();
};

// Event untuk menampilkan tombol Install App (PWA)
window.addEventListener("beforeinstallprompt", function (e) {
  e.preventDefault();
  deferredPromptPWA = e;
  var btnInstall = getEl("btn-install-pwa");
  if (btnInstall) btnInstall.style.display = "inline-block";
});

function installPWA() {
  if (!deferredPromptPWA) return;
  deferredPromptPWA.prompt();
  deferredPromptPWA.userChoice.then(function () {
    deferredPromptPWA = null;
    var btnInstall = getEl("btn-install-pwa");
    if (btnInstall) btnInstall.style.display = "none";
  });
}

// =========================================================
// HELPER FORMAT RUPIAH & MODAL UI
// =========================================================
function formatInputRupiah(el) {
  if (!el) return;
  var val = el.value.toString().replace(/[^0-9]/g, "");
  el.value = val ? new Intl.NumberFormat("id-ID").format(val) : "";
}

function getAngka(id) {
  var el = getEl(id);
  if (!el || !el.value) return 0;
  return parseInt(el.value.toString().replace(/[^0-9]/g, ""), 10) || 0;
}

function formatRupiah(angka) {
  var num = Number(angka) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(num);
}

function tutupModal(idModal) {
  var m = getEl(idModal);
  if (m) m.style.display = "none";
}

function toggleSidebar() {
  toggleClassSafe("sidebar", "active");
  toggleClassSafe("overlay", "active");
}

// =========================================================
// NAVIGASI HALAMAN, TOMBOL KEMBALI OTOMATIS & REFRESH SISTEM
// =========================================================
var halamanAktifSekarang = "home";
var riwayatNavigasiHalaman = [];

// Peta halaman induk untuk sub-halaman
var petaHalamanInduk = {
  "rincian-penjualan": "laporan-penjualan",
  "rincian-pengeluaran": "laporan-pengeluaran",
  "rincian-piutang": "laporan-piutang",
  "laporan-penjualan": "laporan-menu",
  "laporan-stok": "laporan-menu",
  "laporan-pengeluaran": "laporan-menu",
  "laporan-piutang": "laporan-menu",
  "laporan-transaksi": "laporan-menu",
  "harga-khusus": "kasir",
  "struk": "kasir",
  "kasir": "home",
  "aruskas": "home",
  "restock": "home",
  "ngampas": "home",
  "piutang-kasir": "home",
  "riwayat": "home",
  "laporan-menu": "home",
  "pengaturan": "home"
};

function bukaHalaman(id, navEl, isBackAction) {
  if (halamanAktifSekarang && halamanAktifSekarang !== id && !isBackAction) {
    riwayatNavigasiHalaman.push(halamanAktifSekarang);
  }
  halamanAktifSekarang = id;

  document.querySelectorAll(".page-section").forEach(function (p) {
    removeClassSafe(p, "active");
  });

  var target = getEl("page-" + id);
  if (target) addClassSafe(target, "active");

  if (navEl && navEl.classList) {
    document.querySelectorAll(".nav-link").forEach(function (l) {
      removeClassSafe(l, "active");
    });
    addClassSafe(navEl, "active");
  } else {
    document.querySelectorAll(".nav-link").forEach(function (l) {
      var onclickAttr = l.getAttribute("onclick") || "";
      if (onclickAttr.indexOf("'" + id + "'") !== -1) {
        addClassSafe(l, "active");
      } else if (id.indexOf("laporan-") === 0 || id.indexOf("rincian-") === 0) {
        if (onclickAttr.indexOf("'laporan-menu'") !== -1) addClassSafe(l, "active");
        else removeClassSafe(l, "active");
      } else if (id === "struk" || id === "harga-khusus") {
        if (onclickAttr.indexOf("'kasir'") !== -1) addClassSafe(l, "active");
        else removeClassSafe(l, "active");
      } else {
        removeClassSafe(l, "active");
      }
    });
  }

  var t = {
    "home": "Home Dashboard",
    "kasir": "Kasir",
    "harga-khusus": "Harga Pelanggan Khusus",
    "aruskas": "Arus Kas",
    "restock": "Barang Masuk / Keluar",
    "riwayat": "Riwayat Transaksi",
    "piutang-kasir": "Daftar Piutang",
    "laporan-menu": "Menu Laporan",
    "laporan-penjualan": "Laporan Pemasukan",
    "rincian-penjualan": "Rincian Pemasukan",
    "laporan-stok": "Laporan Stok",
    "laporan-pengeluaran": "Laporan Pengeluaran",
    "rincian-pengeluaran": "Rincian Pengeluaran",
    "laporan-piutang": "Laporan Piutang",
    "rincian-piutang": "Rincian Piutang",
    "struk": "Struk Pembayaran",
    "pengaturan": "Pengaturan Struk",
    "ngampas": "Monitoring Ngampas",
    "laporan-transaksi": "Laporan Mutasi Kas"
  };

  var headerTitle = getEl("header-title");
  if (t[id] && headerTitle) headerTitle.innerText = t[id];

  // Tampilkan tombol Kembali di Topbar jika bukan di halaman Home
  var btnKembaliTop = getEl("btn-kembali-top");
  if (btnKembaliTop) {
    btnKembaliTop.style.display = id === "home" ? "none" : "inline-flex";
  }

  // Tutup sidebar otomatis di layar HP
  if (window.innerWidth < 768 && hasClassActive("sidebar")) {
    toggleSidebar();
  }

  var todayISO = new Date().toISOString().split("T")[0];
  if (id === "harga-khusus") renderHalamanHargaKhusus();
  if (id === "ngampas") loadDataNgampas();
  if (id === "piutang-kasir") loadDataPiutangKasir();
  if (id === "riwayat") {
    var tabAktif = document.querySelector("#page-riwayat .tab-btn.active");
    if (tabAktif) {
      tabAktif.click();
    } else {
      var tabHariIni = document.querySelector("#page-riwayat .tab-btn");
      if (tabHariIni) tabHariIni.click();
    }
  }
  if (id === "aruskas") {
    var tglKas = getEl("input-tgl-kas");
    if (tglKas && !tglKas.value) tglKas.value = todayISO;
  }
  if (id === "restock") {
    var tglBm = getEl("input-tgl-bm");
    if (tglBm && !tglBm.value) tglBm.value = todayISO;
  }

  window.scrollTo(0, 0);
}

// Fungsi saat tombol Kembali di Topbar diklik
function kembaliKeInduk() {
  var targetInduk = petaHalamanInduk[halamanAktifSekarang];
  if (targetInduk) {
    bukaHalaman(targetInduk, null, true);
  } else if (riwayatNavigasiHalaman.length > 0) {
    var prev = riwayatNavigasiHalaman.pop();
    bukaHalaman(prev, null, true);
  } else {
    bukaHalaman("home", null, true);
  }
}

// Fungsi Tombol Refresh Bawaan Sistem (Tanpa Reload Browser)
function segarkanSistem() {
  var btn = getEl("btn-refresh-sistem");
  var icon = getEl("icon-refresh-sistem");
  var toast = getEl("toast-sistem");

  if (icon && icon.classList) icon.classList.add("fa-spin");
  if (btn) btn.disabled = true;
  if (toast) {
    toast.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Menyegarkan data sistem...';
    toast.classList.add("show");
  }

  // Buka kembali tombol yang mungkin macet/disabled karena koneksi lambat
  document.querySelectorAll("button:disabled").forEach(function (b) {
    if (b.id !== "btn-refresh-sistem") b.disabled = false;
  });

  // Tarik ulang data utama di latar belakang
  tarikDataProduk();
  tarikDataDashboard(true);
  muatPengaturan();

  // Tarik ulang data spesifik sesuai halaman yang sedang aktif dibuka
  if (
    halamanAktifSekarang === "laporan-penjualan" ||
    halamanAktifSekarang === "rincian-penjualan"
  ) {
    tarikDataLaporanPenjualan();
  } else if (halamanAktifSekarang === "laporan-stok") {
    tarikDataLaporanStok();
  } else if (
    halamanAktifSekarang === "laporan-pengeluaran" ||
    halamanAktifSekarang === "rincian-pengeluaran"
  ) {
    tarikDataLaporanPengeluaran();
  } else if (
    halamanAktifSekarang === "laporan-piutang" ||
    halamanAktifSekarang === "rincian-piutang"
  ) {
    tarikDataLaporanPiutang();
  } else if (halamanAktifSekarang === "laporan-transaksi") {
    loadLaporanTransaksi();
  } else if (halamanAktifSekarang === "ngampas") {
    loadDataNgampas();
  } else if (halamanAktifSekarang === "piutang-kasir") {
    loadDataPiutangKasir();
  } else if (halamanAktifSekarang === "harga-khusus") {
    renderHalamanHargaKhusus();
  }

  setTimeout(function () {
    if (icon && icon.classList) icon.classList.remove("fa-spin");
    if (btn) btn.disabled = false;
    if (toast) {
      toast.innerHTML = '<i class="fas fa-check-circle"></i> Data sistem berhasil diperbarui!';
      setTimeout(function () {
        toast.classList.remove("show");
      }, 1500);
    }
  }, 1200);
}

// =========================================================
// FITUR LOGIN, LIHAT PASSWORD & SESI 24 JAM
// =========================================================
function togglePasswordVisibility() {
  var passInput = getEl("password");
  var icon = getEl("icon-mata");
  if (!passInput || !icon || !icon.classList) return;

  if (passInput.type === "password") {
    passInput.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    passInput.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
}

function cekSesiLogin() {
  var sessionData = localStorage.getItem("pos_session");
  if (sessionData) {
    var session = JSON.parse(sessionData);
    if (new Date().getTime() < session.expiry) {
      masukKeDashboard(session.nama, session.role);
    } else {
      localStorage.removeItem("pos_session");
    }
  }
}

function cekLogin() {
  var userEl = getEl("username");
  var passEl = getEl("password");
  var btn = getEl("btn-submit");
  var pesanErr = getEl("pesan-error");

  var user = userEl ? userEl.value.trim() : "";
  var pass = passEl ? passEl.value.trim() : "";
  if (pesanErr) pesanErr.innerText = "";

  if (user === "" || pass === "") {
    if (pesanErr) pesanErr.innerText = "Username & Password wajib diisi!";
    else alert("Isi username & password!");
    return;
  }

  if (btn) {
    btn.innerText = "Memeriksa...";
    btn.disabled = true;
  }

  callBackend(
    "prosesLogin",
    { username: user, password: pass },
    function (res) {
      if (btn) {
        btn.innerText = "MASUK";
        btn.disabled = false;
      }
      if (res && res.status === "sukses") {
        var exp = new Date().getTime() + 24 * 3600 * 1000;
        localStorage.setItem(
          "pos_session",
          JSON.stringify({ nama: res.nama, role: res.role, expiry: exp })
        );
        masukKeDashboard(res.nama, res.role);
      } else {
        var msg = res && res.pesan ? res.pesan : "Login gagal!";
        if (pesanErr) pesanErr.innerText = msg;
        else alert(msg);
      }
    },
    function (err) {
      if (btn) {
        btn.innerText = "MASUK";
        btn.disabled = false;
      }
      if (pesanErr) pesanErr.innerText = "Gagal terhubung: " + err.message;
      else alert("SISTEM ERROR: " + err.message);
    }
  );
}

function logout() {
  localStorage.removeItem("pos_session");
  location.reload();
}

function masukKeDashboard(nama, role) {
  var halLogin = getEl("halaman-login");
  var dashApp = getEl("dashboard-app");
  var namaTampil = getEl("nama-user-tampil");

  if (halLogin) halLogin.style.display = "none";
  if (dashApp) dashApp.style.display = "flex";
  if (namaTampil) namaTampil.innerText = nama;

  namaKasirAktif = nama;
  roleAktif = role || "Kasir";

  var adminElements = document.querySelectorAll(".admin-only");
  if (roleAktif === "Kasir" || roleAktif === "Karyawan") {
    adminElements.forEach(function (el) {
      el.style.display = "none";
    });
  } else {
    adminElements.forEach(function (el) {
      el.style.display = "";
    });
  }

  tarikDataProduk();
  tarikDataDashboard();
  hitungRentangTanggal("Bulan Ini");
}

// =========================================================
// COLLAPSIBLE PERINGATAN STOK DI HOME
// =========================================================
function toggleStokAlert() {
  var body = getEl("alert-stok-body");
  var icon = getEl("icon-collapse-stok");
  if (!body || !body.classList || !icon || !icon.classList) return;

  body.classList.toggle("collapsed");
  if (body.classList.contains("collapsed")) {
    icon.classList.remove("fa-chevron-up");
    icon.classList.add("fa-chevron-down");
  } else {
    icon.classList.remove("fa-chevron-down");
    icon.classList.add("fa-chevron-up");
  }
}

function renderAlertStokLokal() {
  var alertBox = getEl("alert-stok");
  var jmlStokEl = getEl("jumlah-stok-tipis");
  var listEl = getEl("list-stok-tipis");
  if (!alertBox || !listEl) return;

  var tipis = dataMasterProduk.filter(function (p) {
    var s = parseInt(p.stok, 10);
    return !isNaN(s) && s < 10;
  });

  if (tipis.length > 0) {
    alertBox.style.display = "block";
    if (jmlStokEl) jmlStokEl.innerText = tipis.length;
    var liHTML = "";
    tipis.forEach(function (s) {
      var warna = s.stok <= 0 ? "color:#dc2626; font-weight:bold;" : "";
      liHTML += "<li>" + s.nama + " (Sisa: <b style='" + warna + "'>" + s.stok + "</b>)</li>";
    });
    listEl.innerHTML = liHTML;
  } else {
    alertBox.style.display = "none";
  }
}

// =========================================================
// PENGATURAN TOKO & LOGO
// =========================================================
function muatPengaturan() {
  callBackend("getPengaturanToko", {}, function (res) {
    if (res && res.status === "sukses") {
      settingToko = res.data || {};
      if (getEl("set-nama-toko")) getEl("set-nama-toko").value = settingToko.nama_toko || "";
      if (getEl("set-alamat-toko")) getEl("set-alamat-toko").value = settingToko.alamat_toko || "";
      if (getEl("set-kontak-toko")) getEl("set-kontak-toko").value = settingToko.kontak_toko || "";
      if (getEl("set-footer-struk"))
        getEl("set-footer-struk").value = settingToko.footer_struk || "";
      if (getEl("set-logo-url")) getEl("set-logo-url").value = settingToko.logo_url || "";
    }
  });
}

var formPengaturanEl = getEl("form-pengaturan");
if (formPengaturanEl) {
  formPengaturanEl.addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = getEl("btn-simpan-pengaturan");
    if (btn) {
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
      btn.disabled = true;
    }

    var dataBaru = {
      nama_toko: getEl("set-nama-toko") ? getEl("set-nama-toko").value.trim() : "",
      alamat_toko: getEl("set-alamat-toko") ? getEl("set-alamat-toko").value.trim() : "",
      kontak_toko: getEl("set-kontak-toko") ? getEl("set-kontak-toko").value.trim() : "",
      footer_struk: getEl("set-footer-struk") ? getEl("set-footer-struk").value.trim() : "",
      logo_url: getEl("set-logo-url") ? getEl("set-logo-url").value.trim() : ""
    };

    callBackend(
      "simpanPengaturanToko",
      { data: dataBaru },
      function (res) {
        alert((res && res.pesan) || "Pengaturan disimpan!");
        if (btn) {
          btn.innerHTML = "SIMPAN PENGATURAN";
          btn.disabled = false;
        }
        settingToko = dataBaru;
      },
      function (err) {
        alert("Gagal menyimpan: " + err.message);
        if (btn) {
          btn.innerHTML = "SIMPAN PENGATURAN";
          btn.disabled = false;
        }
      }
    );
  });
}

function jalankanUploadLogo() {
  var fileInput = getEl("file-logo-upload");
  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    alert("Silakan pilih file gambar logo terlebih dahulu!");
    return;
  }
  var file = fileInput.files[0];

  var statusTeks = getEl("status-upload-logo");
  var btn = getEl("btn-upload-logo");

  if (btn) {
    btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Proses...";
    btn.disabled = true;
  }
  if (statusTeks) {
    statusTeks.innerHTML = "<span style='color:#0284c7;'>Memproses gambar ke dalam sistem...</span>";
  }

  var reader = new FileReader();
  reader.onload = function (e) {
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement("canvas");
      var ctx = canvas.getContext("2d");
      var maxWidth = 150;
      var scale = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      var dataURL = canvas.toDataURL("image/png");
      if (getEl("set-logo-url")) getEl("set-logo-url").value = dataURL;

      if (statusTeks) {
        statusTeks.innerHTML =
          "<span style='color:green;'><i class='fas fa-check-circle'></i> Gambar siap! Klik tombol SIMPAN PENGATURAN di bawah.</span>";
      }
      if (btn) {
        btn.innerHTML = "<i class='fas fa-upload'></i> Proses";
        btn.disabled = false;
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// =========================================================
// DASHBOARD & RIWAYAT TRANSAKSI (DENGAN OPTIMISTIC UI)
// =========================================================
function refreshTampilanRiwayatAktif() {
  var tabHariIni = getEl("tab-hari-ini");
  var tabKemarin = getEl("tab-kemarin");
  var tabSemua = getEl("tab-semua");

  if (tabKemarin && tabKemarin.classList && tabKemarin.classList.contains("active")) {
    filterRiwayatKemarin();
  } else if (tabSemua && tabSemua.classList && tabSemua.classList.contains("active")) {
    filterRiwayatSemua();
  } else {
    filterRiwayatHariIni();
  }
}

function tarikDataDashboard(isSilent) {
  if (!isSilent && riwayatMaster.length === 0) {
    if (getEl("tabel-hari-ini"))
      getEl("tabel-hari-ini").innerHTML =
        "<tr><td colspan='8' style='text-align:center;'>Memuat data...</td></tr>";
    if (getEl("tabel-kemarin"))
      getEl("tabel-kemarin").innerHTML =
        "<tr><td colspan='8' style='text-align:center;'>Memuat data...</td></tr>";
    if (getEl("tabel-semua"))
      getEl("tabel-semua").innerHTML =
        "<tr><td colspan='8' style='text-align:center;'>Memuat data...</td></tr>";
  }

  callBackend("getDashboardData", {}, function (res) {
    if (res && res.status === "sukses") {
      var alertBox = getEl("alert-stok");
      var jmlStokEl = getEl("jumlah-stok-tipis");
      var listStokEl = getEl("list-stok-tipis");
      if (alertBox && listStokEl) {
        if (res.stokTipis && res.stokTipis.length > 0) {
          alertBox.style.display = "block";
          if (jmlStokEl) jmlStokEl.innerText = res.stokTipis.length;
          var liHTML = "";
          res.stokTipis.forEach(function (s) {
            var warna = s.stok <= 0 ? "color:#dc2626; font-weight:bold;" : "";
            liHTML += "<li>" + s.nama + " (Sisa: <b style='" + warna + "'>" + s.stok + "</b>)</li>";
          });
          listStokEl.innerHTML = liHTML;
        } else {
          alertBox.style.display = "none";
        }
      }

      riwayatMaster = res.riwayat || [];
      refreshTampilanRiwayatAktif();
    }
  });
}

function gantiTabRiwayat(tabId, element) {
  document.querySelectorAll("#page-riwayat .tab-btn").forEach(function (b) {
    removeClassSafe(b, "active");
  });
  document.querySelectorAll("#page-riwayat .tab-content").forEach(function (c) {
    removeClassSafe(c, "active");
  });

  if (element && element.classList) {
    addClassSafe(element, "active");
  } else {
    var defaultTab = document.querySelector("#page-riwayat .tab-btn");
    if (defaultTab) addClassSafe(defaultTab, "active");
  }

  var targetContent = getEl("tab-" + tabId);
  if (targetContent) addClassSafe(targetContent, "active");

  if (tabId === "hari-ini") filterRiwayatHariIni();
  if (tabId === "kemarin") filterRiwayatKemarin();
  if (tabId === "semua") filterRiwayatSemua();
}

function hitungRingkasanRiwayat(data) {
  var tMasuk = 0;
  var tKeluar = 0;
  var tSetor = 0;
  var tTutup = 0;

  var adaArusKas = data.some(function (r) {
    var j = r.jenis || "";
    return j.includes("Pemasukan") || j.includes("Pengeluaran") || j.includes("Arus Kas");
  });

  data.forEach(function (r) {
    var jenisStr = r.jenis || "";
    var statusStr = r.status || "";
    var rincianStr = r.rincian || "";

    if (jenisStr.includes("Penjualan")) {
      if (statusStr === "Lunas") {
        tMasuk += r.nominal || 0;
      } else if (statusStr.toLowerCase() === "dilunasi" && !adaArusKas) {
        tMasuk += r.nominal || 0;
      }
    } else if (jenisStr.includes("Pemasukan") || jenisStr.includes("Arus Kas Masuk")) {
      var stringCek = (jenisStr + " " + statusStr + " " + rincianStr).toLowerCase();
      if (!stringCek.includes("penjualan kasir")) {
        tMasuk += r.nominal || 0;
      }
    } else if (jenisStr.includes("Pengeluaran") || jenisStr.includes("Arus Kas Keluar")) {
      var stringCekKeluar = (statusStr + " " + rincianStr).toLowerCase();
      if (stringCekKeluar.includes("tutup kas") || stringCekKeluar.includes("pindah saldo")) {
        tTutup += r.nominal || 0;
      } else if (stringCekKeluar.includes("setoran")) {
        tSetor += r.nominal || 0;
      } else {
        tKeluar += r.nominal || 0;
      }
    }
  });

  var tSisa = tMasuk - tKeluar - tSetor - tTutup;

  if (getEl("riw-masuk")) getEl("riw-masuk").innerText = formatRupiah(tMasuk);
  if (getEl("riw-keluar")) getEl("riw-keluar").innerText = formatRupiah(tKeluar);
  if (getEl("riw-setor")) getEl("riw-setor").innerText = formatRupiah(tSetor);
  if (getEl("riw-sisa")) getEl("riw-sisa").innerText = formatRupiah(tSisa);
}

function generateTabelRiwayat(data, idTabel) {
  hitungRingkasanRiwayat(data);
  var isAdmin = roleAktif !== "Kasir" && roleAktif !== "Karyawan";

  var html =
    "<thead><tr><th>Tgl/Waktu</th><th>ID</th><th>Jenis</th><th>Nama Barang</th><th>Keterangan</th><th>Nominal</th><th>Status</th><th class='kolom-aksi'>Aksi</th></tr></thead><tbody>";

  if (!data || data.length === 0) {
    html += "<tr><td colspan='8' style='text-align:center;'>Tidak ada data transaksi</td></tr>";
  } else {
    data.forEach(function (r) {
      var bgBadge = "badge lunas";
      if (r.status === "Hutang") bgBadge = "badge hutang";
      else if (r.status === "Pengeluaran") bgBadge = "badge pengeluaran";
      else if (r.status === "Pemasukan") bgBadge = "badge pemasukan";
      else if (r.status === "Stok") bgBadge = "badge stok";

      var tombolAksi = "";
      if (r.jenis === "Penjualan") {
        if (isAdmin) {
          tombolAksi +=
            "<button class='btn-aksi' title='Hapus & Kasir Ulang' onclick='editTransaksi(\"" +
            r.id +
            "\")'><i class='fas fa-edit'></i></button>";
        }
        tombolAksi +=
          "<button class='btn-aksi' title='Lihat Struk' onclick='lihatDetailTransaksi(\"" +
          r.id +
          "\")'><i class='fas fa-eye'></i></button>";

        if (r.status === "Hutang") {
          var sisaNota = (r.nominal || 0) - (r.dibayar || 0);
          var pelClean = (r.rincian || "").replace("Pelanggan: ", "").replace(/"/g, "");
          var isNgampasRow =
            pelClean.toUpperCase().includes("NGAMPAS") ||
            pelClean.toUpperCase().includes("KANVAS");
          if (isNgampasRow) {
            tombolAksi +=
              "<button class='btn-aksi btn-bayar-htg' onclick='bukaHalaman(\"ngampas\")'><i class='fas fa-truck'></i> Ngampas</button>";
          } else {
            tombolAksi +=
              "<button class='btn-aksi btn-bayar-htg' onclick='bukaModalBayarPiutang(\"" +
              r.id +
              "\", \"" +
              pelClean +
              "\", " +
              sisaNota +
              ")'><i class='fas fa-money-bill'></i> Bayar</button>";
          }
        }
      } else if (
        r.jenis.indexOf("Arus Kas") > -1 ||
        r.jenis === "Pengeluaran" ||
        r.jenis === "Pemasukan"
      ) {
        if (isAdmin) {
          tombolAksi =
            "<button class='btn-aksi' title='Edit Arus Kas' onclick='bukaModalEdit(\"kas\", \"" +
            r.id +
            "\")' style='background:#ffc107; color:#000;'><i class='fas fa-edit'></i> Edit</button>";
        } else {
          tombolAksi = "<span style='color:#999; font-size:11px;'>Terkunci</span>";
        }
      } else if (r.jenis.indexOf("Restock") > -1 || r.jenis === "Barang Masuk") {
        if (isAdmin) {
          tombolAksi =
            "<button class='btn-aksi' title='Edit Barang Masuk/Keluar' onclick='bukaModalEdit(\"restock\", \"" +
            r.id +
            "\")' style='background:#ffc107; color:#000;'><i class='fas fa-edit'></i> Edit</button>";
        } else {
          tombolAksi = "<span style='color:#999; font-size:11px;'>Terkunci</span>";
        }
      }

      var teksBarang = r.detailBarang ? r.detailBarang : "<i style='color:#999;'>-</i>";

      html +=
        "<tr><td>" +
        r.tanggal +
        "<br><small style='color:#888;'>" +
        (r.waktu || "") +
        "</small></td><td><small>" +
        r.id +
        "</small></td><td><b>" +
        r.jenis +
        "</b></td><td style='font-size:12px; line-height:1.4;'>" +
        teksBarang +
        "</td><td>" +
        r.rincian +
        "</td><td><b>" +
        formatRupiah(r.nominal) +
        "</b></td><td><span class='" +
        bgBadge +
        "'>" +
        r.status +
        "</span></td><td class='kolom-aksi' style='white-space:nowrap;'>" +
        tombolAksi +
        "</td></tr>";
    });
  }
  html += "</tbody>";
  var tabelEl = getEl(idTabel);
  if (tabelEl) tabelEl.innerHTML = html;
}

function sortUrutTanggal(a, b) {
  var pa = (a.tanggal || "").split("/");
  var waktuA = a.waktu && a.waktu !== "-" ? a.waktu.split(":") : ["00", "00", "00"];
  var d1 = new Date(
    pa[2] || 2000,
    (pa[1] || 1) - 1,
    pa[0] || 1,
    waktuA[0] || 0,
    waktuA[1] || 0,
    waktuA[2] || 0
  );
  var pb = (b.tanggal || "").split("/");
  var waktuB = b.waktu && b.waktu !== "-" ? b.waktu.split(":") : ["00", "00", "00"];
  var d2 = new Date(
    pb[2] || 2000,
    (pb[1] || 1) - 1,
    pb[0] || 1,
    waktuB[0] || 0,
    waktuB[1] || 0,
    waktuB[2] || 0
  );
  return d1 - d2;
}

function filterRiwayatHariIni() {
  var hariIni = getTanggalHariIniStr();
  var searchEl = getEl("search-hariini");
  var search = searchEl ? searchEl.value.toLowerCase() : "";

  var filtered = riwayatMaster.filter(function (r) {
    var rDate = r.rawDate || r.tanggal || "";
    var matchDate = rDate.includes(hariIni) || (r.tanggal || "").includes(hariIni);
    var gabungCari = (
      (r.id || "") +
      " " +
      (r.rincian || "") +
      " " +
      (r.detailBarang || "")
    ).toLowerCase();
    var matchSearch = gabungCari.includes(search);
    return matchDate && matchSearch;
  });
  filtered.sort(sortUrutTanggal);
  generateTabelRiwayat(filtered, "tabel-hari-ini");
}

function filterRiwayatKemarin() {
  var d = new Date();
  d.setDate(d.getDate() - 1);
  var kemarin =
    ("0" + d.getDate()).slice(-2) +
    "/" +
    ("0" + (d.getMonth() + 1)).slice(-2) +
    "/" +
    d.getFullYear();
  var searchEl = getEl("search-kemarin");
  var search = searchEl ? searchEl.value.toLowerCase() : "";

  var filtered = riwayatMaster.filter(function (r) {
    var rDate = r.rawDate || r.tanggal || "";
    var matchDate = rDate.includes(kemarin) || (r.tanggal || "").includes(kemarin);
    var gabungCari = (
      (r.id || "") +
      " " +
      (r.rincian || "") +
      " " +
      (r.detailBarang || "")
    ).toLowerCase();
    var matchSearch = gabungCari.includes(search);
    return matchDate && matchSearch;
  });
  filtered.sort(sortUrutTanggal);
  generateTabelRiwayat(filtered, "tabel-kemarin");
}

function filterRiwayatSemua() {
  var startEl = getEl("riwayat-start");
  var endEl = getEl("riwayat-end");
  var jenisEl = getEl("filter-jenis");

  var start = startEl ? startEl.value : "";
  var end = endEl ? endEl.value : "";
  var jenis = jenisEl ? jenisEl.value : "Semua";

  var filtered = riwayatMaster.filter(function (r) {
    var matchJenis = jenis === "Semua" ? true : (r.jenis || "").includes(jenis);
    var matchDate = true;
    if (start && end) {
      var p = (r.tanggal || "").split("/");
      var d = new Date(p[2], p[1] - 1, p[0]);
      var dS = new Date(start);
      dS.setHours(0, 0, 0, 0);
      var dE = new Date(end);
      dE.setHours(23, 59, 59, 999);
      matchDate = d >= dS && d <= dE;
    }
    return matchJenis && matchDate;
  });
  filtered.sort(sortUrutTanggal);
  generateTabelRiwayat(filtered, "tabel-semua");
}

function cetakPDFRiwayat() {
  var areaCetak = getEl("area-cetak-riwayat");
  if (!areaCetak) return;
  var printContent = areaCetak.innerHTML;
  var valMasuk = getEl("riw-masuk") ? getEl("riw-masuk").innerText : "Rp 0";
  var valKeluar = getEl("riw-keluar") ? getEl("riw-keluar").innerText : "Rp 0";
  var valSetor = getEl("riw-setor") ? getEl("riw-setor").innerText : "Rp 0";
  var valSisa = getEl("riw-sisa") ? getEl("riw-sisa").innerText : "Rp 0";

  var summaryHtml = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px; text-align: center; font-family: 'Helvetica', sans-serif;">
      <div style="flex: 1; border: 1px solid #555; margin: 0 5px; padding: 10px; border-radius: 5px; background: #f8fafc;">
        <div style="font-size: 11px; font-weight: bold; color: #555; margin-bottom: 5px;">TOTAL PEMASUKAN</div>
        <div style="font-size: 14px; font-weight: bold; color: #000;">${valMasuk}</div>
      </div>
      <div style="flex: 1; border: 1px solid #555; margin: 0 5px; padding: 10px; border-radius: 5px; background: #f8fafc;">
        <div style="font-size: 11px; font-weight: bold; color: #555; margin-bottom: 5px;">PENGELUARAN TOKO</div>
        <div style="font-size: 14px; font-weight: bold; color: #000;">${valKeluar}</div>
      </div>
      <div style="flex: 1; border: 1px solid #555; margin: 0 5px; padding: 10px; border-radius: 5px; background: #f8fafc;">
        <div style="font-size: 11px; font-weight: bold; color: #555; margin-bottom: 5px;">SETORAN BUNDA</div>
        <div style="font-size: 14px; font-weight: bold; color: #000;">${valSetor}</div>
      </div>
      <div style="flex: 1; border: 1px solid #555; margin: 0 5px; padding: 10px; border-radius: 5px; background: #f8fafc;">
        <div style="font-size: 11px; font-weight: bold; color: #555; margin-bottom: 5px;">SISA UANG LACI</div>
        <div style="font-size: 14px; font-weight: bold; color: #000;">${valSisa}</div>
      </div>
    </div>
  `;

  var printWindow = window.open("", "", "width=900,height=700");
  if (!printWindow) {
    alert("Pop-up diblokir oleh browser. Izinkan pop-up untuk mencetak PDF.");
    return;
  }
  printWindow.document.write(`
    <html>
      <head>
        <title>Cetak PDF - Riwayat Transaksi</title>
        <style>
          body { font-family: 'Helvetica', sans-serif; color: #333; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
          th, td { border: 1px solid #999; padding: 8px; text-align: left; }
          th { background-color: #eee; font-weight: bold; color: #000; }
          .kolom-aksi { display: none !important; }
          h2 { text-align: center; margin-bottom: 5px; color: #005A9C; font-size: 18px; text-transform: uppercase;}
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h2>LAPORAN RIWAYAT TRANSAKSI</h2>
        <p style='text-align:center; font-size:12px; margin-top:0; color:#666; margin-bottom: 25px;'>
          Dicetak pada: ${new Date().toLocaleString("id-ID")}
        </p>
        ${summaryHtml}
        ${printContent}
      </body>
    </html>
  `);

  printWindow.document.close();
  setTimeout(function () {
    printWindow.print();
  }, 500);
}

// =========================================================
// EDIT RIWAYAT TRANSAKSI (KHUSUS ADMIN)
// =========================================================
function bukaModalEdit(jenis, id) {
  currentEditId = id;
  currentEditJenis = jenis;
  var judulEl = getEl("judul-modal-edit");
  var formEl = getEl("form-edit-dinamis");
  var modalEl = getEl("modal-edit-riwayat");

  if (judulEl) judulEl.innerText = "Memuat data...";
  if (formEl) {
    formEl.innerHTML =
      "<div style='text-align:center; padding:30px;'><i class='fas fa-spinner fa-spin' style='font-size:30px; color:#005A9C;'></i><br><br>Menarik data dari server...</div>";
  }
  if (modalEl) modalEl.style.display = "flex";

  callBackend("getDetailForEdit", { id: id, jenis: jenis }, function (res) {
    if (res && res.status === "sukses") {
      currentEditDataLama = res.data;
      renderFormEdit(jenis, res.data);
    } else {
      alert((res && res.pesan) || "Data tidak ditemukan");
      tutupModal("modal-edit-riwayat");
    }
  });
}

function renderFormEdit(jenis, data) {
  var html = "";
  var tglInput = "";
  if (data.tanggal) {
    var p = data.tanggal.split("/");
    if (p.length === 3) tglInput = p[2] + "-" + p[1] + "-" + p[0];
  }

  var judulEl = getEl("judul-modal-edit");
  var formEl = getEl("form-edit-dinamis");
  if (!formEl) return;

  if (jenis === "kas") {
    if (judulEl) {
      judulEl.innerHTML = "<i class='fas fa-wallet'></i> Edit Kas (" + currentEditId + ")";
    }
    html +=
      "<div class='input-group'><label>Tanggal</label><input type='date' id='edit-tgl' value='" +
      tglInput +
      "'></div>";
    html +=
      "<div class='input-group'><label>Kategori</label><select id='edit-kategori'><option value='Pengeluaran' " +
      (data.kategori === "Pengeluaran" ? "selected" : "") +
      ">Pengeluaran</option><option value='Pemasukan' " +
      (data.kategori === "Pemasukan" ? "selected" : "") +
      ">Pemasukan</option></select></div>";
    html +=
      "<div class='input-group'><label>Jenis</label><input type='text' id='edit-jenis' value='" +
      data.jenis +
      "'></div>";
    html +=
      "<div class='input-group'><label>Nominal</label><input type='number' id='edit-nominal' value='" +
      data.nominal +
      "'></div>";
    html +=
      "<div class='input-group'><label>Keterangan</label><input type='text' id='edit-keterangan' value='" +
      data.keterangan +
      "'></div>";
  } else if (jenis === "restock") {
    var isKeluar = currentEditId.indexOf("OUT-") > -1;
    var judul = isKeluar ? "Edit Barang Keluar" : "Edit Barang Masuk";
    if (judulEl) {
      judulEl.innerHTML = "<i class='fas fa-box-open'></i> " + judul + " (" + currentEditId + ")";
    }
    html +=
      "<div style='background:#fef3c7; color:#92400e; padding:10px; border-radius:5px; font-size:12px; margin-bottom:15px; border:1px solid #fcd34d;'><b>Info:</b> Stok otomatis menyesuaikan.</div>";
    html +=
      "<div class='input-group'><label>Tanggal</label><input type='date' id='edit-tgl' value='" +
      tglInput +
      "'></div>";
    html +=
      "<div class='input-group'><label>Barang</label><input type='text' value='" +
      data.namaBarang +
      "' disabled style='background:#eee; color:#666;'></div>";
    html +=
      "<div class='input-group'><label>Jumlah " +
      (isKeluar ? "Keluar" : "Masuk") +
      " (Qty)</label><input type='number' id='edit-qty' value='" +
      data.qty +
      "'></div>";
    html +=
      "<div class='input-group'><label>Keterangan</label><input type='text' id='edit-keterangan' value='" +
      data.keterangan +
      "'></div>";
  }
  formEl.innerHTML = html;
}

function simpanEditRiwayat() {
  var btn = getEl("btn-simpan-edit");
  if (btn) {
    btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Menyimpan...";
    btn.disabled = true;
  }

  var rawTgl = getEl("edit-tgl") ? getEl("edit-tgl").value : "";
  var tglSheet = konversiTanggalInputKeStr(rawTgl);

  var dataBaru = {};
  if (currentEditJenis === "kas") {
    dataBaru = {
      tanggal: tglSheet,
      kategori: getEl("edit-kategori") ? getEl("edit-kategori").value : "Pengeluaran",
      jenis: getEl("edit-jenis") ? getEl("edit-jenis").value : "",
      nominal: parseInt(getEl("edit-nominal") ? getEl("edit-nominal").value : 0, 10) || 0,
      keterangan: getEl("edit-keterangan") ? getEl("edit-keterangan").value : ""
    };
  } else {
    dataBaru = {
      tanggal: tglSheet,
      qty: parseInt(getEl("edit-qty") ? getEl("edit-qty").value : 0, 10) || 0,
      keterangan: getEl("edit-keterangan") ? getEl("edit-keterangan").value : ""
    };
  }

  callBackend(
    "simpanUpdateEdit",
    {
      id: currentEditId,
      jenis: currentEditJenis,
      dataLama: currentEditDataLama,
      dataBaru: dataBaru
    },
    function (res) {
      if (btn) {
        btn.innerHTML = "SIMPAN PERUBAHAN";
        btn.disabled = false;
      }
      if (res && res.status === "sukses") {
        alert("Perubahan berhasil disimpan!");
        tutupModal("modal-edit-riwayat");
        tarikDataDashboard();
        tarikDataProduk();
      } else {
        alert("Gagal: " + (res ? res.pesan : "Error"));
      }
    },
    function (err) {
      if (btn) {
        btn.innerHTML = "SIMPAN PERUBAHAN";
        btn.disabled = false;
      }
      alert("Gagal menyimpan: " + err.message);
    }
  );
}

// =========================================================
// HALAMAN KASIR, KERANJANG, HARGA KHUSUS & NGAMPAS TERPISAH
// =========================================================
function tarikDataProduk() {
  var areaProduk = getEl("area-produk");
  if (areaProduk && dataMasterProduk.length === 0) {
    areaProduk.innerHTML = "<div style='text-align:center; padding:20px;'>Memuat data barang...</div>";
  }

  callBackend("getProduk", {}, function (res) {
    if (res && res.status === "sukses") {
      dataMasterProduk = res.data || [];
      dataHargaKhusus = res.dataHargaKhusus || [];
      renderKategoriChips();
      tampilkanProduk();
      renderDropdownBarangMutasi("");
      renderDatalistPelangganKhusus();
    }
  });
}

function renderDatalistPelangganKhusus() {
  var dl = getEl("list-pelanggan-khusus-dl");
  if (!dl) return;

  var unikMap = {};
  dataHargaKhusus.forEach(function (h) {
    var key = (h.pelanggan || "").toLowerCase().trim();
    if (!key) return;
    var label = h.pelangganAsli || h.pelanggan.toUpperCase();
    if (!unikMap[key]) unikMap[key] = label;
  });

  var html = "";
  Object.keys(unikMap)
    .sort()
    .forEach(function (k) {
      var safeVal = unikMap[k].replace(/"/g, "");
      html += "<option value=\"" + safeVal + "\">Pelanggan Harga Khusus</option>";
    });
  dl.innerHTML = html;
}

function renderKategoriChips() {
  var katSet = new Set();
  dataMasterProduk.forEach(function (p) {
    if (p.kategori && p.kategori !== "") katSet.add(p.kategori);
  });
  var html =
    "<div class='chip " +
    (currentKategoriKasir === "" ? "active" : "") +
    "' onclick='filterKategori(\"\")'>Semua</div>";
  katSet.forEach(function (k) {
    var cls = currentKategoriKasir === k ? "active" : "";
    html += "<div class='chip " + cls + "' onclick='filterKategori(\"" + k + "\")'>" + k + "</div>";
  });
  var chipArea = getEl("area-kategori-chips");
  if (chipArea) chipArea.innerHTML = html;
}

function filterKategori(kat) {
  currentKategoriKasir = kat;
  renderKategoriChips();
  cariProduk();
}

function cariProduk() {
  var inputCari = getEl("input-cari");
  var kw = inputCari ? inputCari.value.toLowerCase() : "";
  var filtered = dataMasterProduk.filter(function (p) {
    var matchName = (p.nama || "").toLowerCase().includes(kw);
    var matchKat = currentKategoriKasir === "" ? true : p.kategori === currentKategoriKasir;
    return matchName && matchKat;
  });
  tampilkanProduk(filtered);
}

function tampilkanProduk(listData) {
  var dataToRender = listData || dataMasterProduk;
  var html = "";

  if (dataToRender.length === 0) {
    html = "<div style='text-align:center; padding:20px; color:#888;'>Produk tidak ditemukan</div>";
  }

  for (var i = 0; i < dataToRender.length; i++) {
    var p = dataToRender[i];
    var idx = keranjang.findIndex(function (k) {
      return k.id.toString() === p.id.toString();
    });
    var qty = idx !== -1 ? keranjang[idx].qty : 0;

    var btn =
      qty > 0
        ? "<div class='qty-control'><button class='btn-qty min' onclick='ubahQty(\"" +
          p.id +
          "\", -1)'>-</button><input type='number' class='qty-input' value='" +
          qty +
          "' onchange='setQtyManual(\"" +
          p.id +
          "\", this.value)'><button class='btn-qty' onclick='ubahQty(\"" +
          p.id +
          "\", 1)'>+</button></div>"
        : "<button class='btn-tambah' onclick='ubahQty(\"" +
          p.id +
          "\", 1)'>+ Tambah</button>";

    var warnaStok = "#28a745";
    if (p.stok <= 0) warnaStok = "#dc3545";
    else if (p.stok <= 5) warnaStok = "#fd7e14";

    var teksStok =
      "<br><span style='font-size:12px; font-weight:bold; color:" +
      warnaStok +
      ";'>📦 Sisa Stok: " +
      p.stok +
      "</span>";

    html +=
      "<div class='produk-item'><div class='produk-info'><h4>" +
      p.nama +
      "</h4><p>" +
      formatRupiah(p.hargaJual) +
      teksStok +
      "</p></div>" +
      btn +
      "</div>";
  }

  var area = getEl("area-produk");
  if (area) area.innerHTML = html;
}

function ubahQty(id, per) {
  var p = dataMasterProduk.find(function (x) {
    return x.id.toString() === id.toString();
  });
  if (!p) return;

  var idx = keranjang.findIndex(function (k) {
    return k.id.toString() === id.toString();
  });

  if (per > 0) {
    var qtySekarang = idx !== -1 ? keranjang[idx].qty : 0;
    if (p.stok <= 0 && qtySekarang === 0) {
      var lanjut = confirm(
        "⚠️ PERINGATAN STOK HABIS!\n\nStok \"" +
          p.nama +
          "\" saat ini tercatat " +
          p.stok +
          " Pcs.\nApakah Anda tetap ingin memasukkan barang ini ke keranjang?"
      );
      if (!lanjut) return;
    } else if (p.stok > 0 && qtySekarang + per > p.stok) {
      alert(
        "⚠️ Perhatian: Jumlah yang dipilih (" +
          (qtySekarang + per) +
          ") melebihi sisa stok di sistem (" +
          p.stok +
          " Pcs)."
      );
    }
  }

  if (idx !== -1) {
    keranjang[idx].qty += per;
    if (keranjang[idx].qty <= 0) keranjang.splice(idx, 1);
    else keranjang[idx].subtotal = keranjang[idx].qty * keranjang[idx].harga;
  } else {
    if (per > 0) {
      keranjang.push({
        id: p.id,
        nama: p.nama,
        harga: p.hargaJual,
        qty: 1,
        subtotal: p.hargaJual,
        isManualDiskon: false
      });
    }
  }
  cekHargaPelanggan(true);
  updateUIKeranjang();
  cariProduk();
}

function setQtyManual(id, val) {
  var p = dataMasterProduk.find(function (x) {
    return x.id.toString() === id.toString();
  });
  if (!p) return;

  var idx = keranjang.findIndex(function (k) {
    return k.id.toString() === id.toString();
  });
  var newVal = parseInt(val, 10) || 0;

  if (newVal <= 0) {
    if (idx !== -1) keranjang.splice(idx, 1);
  } else {
    if (p.stok <= 0) {
      alert("⚠️ Peringatan: Stok \"" + p.nama + "\" saat ini " + p.stok + " Pcs!");
    } else if (newVal > p.stok) {
      alert(
        "⚠️ Perhatian: Qty (" +
          newVal +
          ") melebihi sisa stok di sistem (" +
          p.stok +
          " Pcs)."
      );
    }

    if (idx !== -1) {
      keranjang[idx].qty = newVal;
      keranjang[idx].subtotal = newVal * keranjang[idx].harga;
    } else {
      keranjang.push({
        id: p.id,
        nama: p.nama,
        harga: p.hargaJual,
        qty: newVal,
        subtotal: newVal * p.hargaJual,
        isManualDiskon: false
      });
    }
  }
  cekHargaPelanggan(true);
  updateUIKeranjang();
  cariProduk();
}

function updateUIKeranjang() {
  totalKeranjangRp = 0;
  totalItemKeranjang = 0;
  for (var i = 0; i < keranjang.length; i++) {
    totalKeranjangRp += keranjang[i].subtotal;
    totalItemKeranjang += keranjang[i].qty;
  }
  if (getEl("jumlah-item")) getEl("jumlah-item").innerText = totalItemKeranjang;
  if (getEl("total-harga-tampil"))
    getEl("total-harga-tampil").innerText = formatRupiah(totalKeranjangRp);
}

function renderRincianModal() {
  var htmlList = "";
  keranjang.forEach(function (k) {
    var badgeManual = "";
    if (k.isManualDiskon) {
      badgeManual =
        " <span style='color:#16a34a; font-size:11px; font-weight:600;'>(Diskon Manual)</span>";
    } else if (k.isHargaKhususPelanggan) {
      badgeManual =
        " <span style='color:#0284c7; font-size:11px; font-weight:600;'>(Harga Khusus)</span>";
    }
    htmlList +=
      "<div class='cart-item'><div><b>" +
      k.nama +
      "</b>" +
      badgeManual +
      "<br>" +
      k.qty +
      " x " +
      formatRupiah(k.harga) +
      " <span class='icon-diskon-item' onclick='ubahHargaItem(\"" +
      k.id +
      "\")'><i class='fas fa-tag'></i> Ubah Harga</span></div><div><b>" +
      formatRupiah(k.subtotal) +
      "</b></div></div>";
  });
  var rincianEl = getEl("rincian-keranjang");
  if (rincianEl) rincianEl.innerHTML = htmlList;
  hitungTotalAkhir();
}

function ubahHargaItem(id) {
  var item = keranjang.find(function (k) {
    return k.id.toString() === id.toString();
  });
  if (!item) return;

  var hargaBaru = prompt(
    "Masukkan HARGA JUAL BARU (setelah diskon) untuk:\n" +
      item.nama +
      "\n\nHarga saat ini: " +
      item.harga,
    item.harga
  );
  if (hargaBaru !== null && hargaBaru.toString().trim() !== "") {
    var angkaHarga = parseInt(hargaBaru.toString().replace(/[^0-9]/g, ""), 10);
    if (!isNaN(angkaHarga) && angkaHarga >= 0) {
      item.harga = angkaHarga;
      item.subtotal = item.qty * item.harga;
      item.isManualDiskon = true;
      updateUIKeranjang();
      renderRincianModal();
    } else {
      alert("Angka tidak valid!");
    }
  }
}

// Deteksi Cerdas Substring Nama Pelanggan Khusus (Tetap Aktif Meskipun Lewat Ngampas)
function cariKeyPelangganKhusus(teksInput) {
  var raw = (teksInput || "").toLowerCase().trim();
  if (!raw || dataHargaKhusus.length === 0) return "";

  // Bersihkan awalan ngampas/kanvas jika kasir tidak sengaja mengetiknya di kolom pelanggan
  var bersih = raw.replace(/^ngampas\s*-\s*/i, "").trim();
  if (!bersih) return "";

  // Kumpulkan daftar nama pelanggan khusus unik, urutkan dari nama terpanjang agar pencarian lebih spesifik
  var unikPel = [];
  dataHargaKhusus.forEach(function (h) {
    var p = (h.pelanggan || "").toLowerCase().trim();
    if (p && unikPel.indexOf(p) === -1) unikPel.push(p);
  });
  unikPel.sort(function (a, b) {
    return b.length - a.length;
  });

  // 1. Cek kecocokan persis (Exact Match)
  for (var i = 0; i < unikPel.length; i++) {
    if (bersih === unikPel[i]) return unikPel[i];
  }

  // 2. Cek apakah input mengandung nama pelanggan khusus (misal: "Hapis ke Bu Parlan" mengandung "bu parlan" / "parhan")
  for (var j = 0; j < unikPel.length; j++) {
    if (unikPel[j].length >= 3 && bersih.indexOf(unikPel[j]) !== -1) {
      return unikPel[j];
    }
  }

  return "";
}

function cekHargaPelanggan(silentRender) {
  var inputPel = getEl("nama-pelanggan");
  var infoBox = getEl("info-harga-khusus-aktif");
  var namaKetikan = inputPel ? inputPel.value : "";

  var matchedPelangganKey = cariKeyPelangganKhusus(namaKetikan);
  var adaPerubahan = false;
  var jumlahBarangKhusus = 0;
  var labelPelangganAktif = "";

  for (var i = 0; i < keranjang.length; i++) {
    var item = keranjang[i];
    if (item.isManualDiskon) continue;

    var memori = null;
    if (matchedPelangganKey !== "") {
      memori = dataHargaKhusus.find(function (h) {
        return (
          (h.pelanggan || "").toLowerCase().trim() === matchedPelangganKey &&
          h.idBarang.toString() === item.id.toString()
        );
      });
    }

    if (memori) {
      jumlahBarangKhusus++;
      labelPelangganAktif = memori.pelangganAsli || matchedPelangganKey.toUpperCase();
      if (item.harga !== memori.harga || !item.isHargaKhususPelanggan) {
        item.harga = memori.harga;
        item.subtotal = item.qty * item.harga;
        item.isHargaKhususPelanggan = true;
        adaPerubahan = true;
      }
    } else {
      var master = dataMasterProduk.find(function (m) {
        return m.id.toString() === item.id.toString();
      });
      if (master && (item.harga !== master.hargaJual || item.isHargaKhususPelanggan)) {
        item.harga = master.hargaJual;
        item.subtotal = item.qty * master.hargaJual;
        item.isHargaKhususPelanggan = false;
        adaPerubahan = true;
      }
    }
  }

  if (infoBox) {
    if (matchedPelangganKey !== "") {
      var sampleObj = dataHargaKhusus.find(function (h) {
        return (h.pelanggan || "").toLowerCase().trim() === matchedPelangganKey;
      });
      var tampilNama =
        labelPelangganAktif ||
        (sampleObj && sampleObj.pelangganAsli) ||
        matchedPelangganKey.toUpperCase();
      infoBox.style.display = "block";
      infoBox.innerHTML =
        "<i class='fas fa-check-circle'></i> Harga Khusus Pelanggan <b>" +
        tampilNama +
        "</b> Aktif (" +
        jumlahBarangKhusus +
        " barang di keranjang mendapat harga khusus)";
    } else {
      infoBox.style.display = "none";
      infoBox.innerHTML = "";
    }
  }

  if (adaPerubahan && !silentRender) {
    updateUIKeranjang();
    renderRincianModal();
  } else if (adaPerubahan && silentRender) {
    updateUIKeranjang();
  }
}

function sinkronStatusPembayaran(sumber) {
  var statusEl = getEl("status-trx");
  var metodeEl = getEl("metode-bayar");
  var nominalEl = getEl("nominal-bayar");
  var areaNominal = getEl("area-nominal-bayar");
  if (!statusEl || !metodeEl) return;

  if (sumber === "status") {
    if (statusEl.value === "Lunas") {
      if (metodeEl.value === "Belum Bayar") {
        metodeEl.value = "Tunai";
      }
      if (areaNominal) areaNominal.style.display = "block";
    } else if (statusEl.value === "Hutang") {
      var byr = getAngka("nominal-bayar");
      if (byr === 0) {
        metodeEl.value = "Belum Bayar";
      }
    }
  } else if (sumber === "metode") {
    if (metodeEl.value === "Belum Bayar") {
      statusEl.value = "Hutang";
      if (nominalEl) nominalEl.value = "0";
      hitungKembalian();
    } else {
      var byrNow = getAngka("nominal-bayar");
      if (byrNow >= totalAkhirSetelahDiskon && totalAkhirSetelahDiskon > 0) {
        statusEl.value = "Lunas";
      }
    }
  }
  hitungKembalian();
}

// Pemisahan Input Supir Pengantar Ngampas & Nama Pelanggan Tujuan
function toggleModeNgampasKasir() {
  var cek = getEl("cek-bawa-ngampas");
  var wadahSupir = getEl("wadah-supir-ngampas");
  var inputSupir = getEl("nama-supir-ngampas");
  var inputPel = getEl("nama-pelanggan");
  var labelPel = getEl("label-input-pelanggan");
  var statusEl = getEl("status-trx");
  var metodeEl = getEl("metode-bayar");
  var nominalEl = getEl("nominal-bayar");

  if (!cek || !statusEl || !metodeEl || !nominalEl) return;

  if (cek.checked) {
    if (wadahSupir) wadahSupir.style.display = "block";
    if (labelPel) {
      labelPel.innerHTML =
        "Nama Pelanggan Tujuan <small style='color:#0284c7; font-weight:normal;'>(Opsional / Ketik untuk Harga Khusus)</small>";
    }
    if (inputPel) {
      inputPel.value = inputPel.value.replace(/^NGAMPAS\s*-\s*/i, "").trim();
      inputPel.placeholder = "Contoh: Parhan, Bu Parlan (Kosongkan jika rute umum)...";
    }
    statusEl.value = "Hutang";
    metodeEl.value = "Belum Bayar";
    nominalEl.value = "0";
    statusEl.disabled = true;
    metodeEl.disabled = true;
    nominalEl.disabled = true;
    if (inputSupir) inputSupir.focus();
  } else {
    if (wadahSupir) wadahSupir.style.display = "none";
    if (inputSupir) inputSupir.value = "";
    if (labelPel) labelPel.innerText = "Nama Pelanggan";
    if (inputPel) {
      inputPel.value = inputPel.value.replace(/^NGAMPAS\s*-\s*/i, "").trim();
      inputPel.placeholder = "Ketik nama pelanggan (atau pilih pelanggan khusus)...";
    }
    statusEl.disabled = false;
    metodeEl.disabled = false;
    nominalEl.disabled = false;
    statusEl.value = "Lunas";
    metodeEl.value = "Tunai";
    nominalEl.value = "";
  }
  cekHargaPelanggan();
  hitungKembalian();
}

function hitungTotalAkhir() {
  var diskon = getAngka("input-diskon");
  totalAkhirSetelahDiskon = totalKeranjangRp - diskon;
  if (totalAkhirSetelahDiskon < 0) totalAkhirSetelahDiskon = 0;
  var modalTotalEl = getEl("modal-total-tagihan");
  if (modalTotalEl) modalTotalEl.innerText = formatRupiah(totalAkhirSetelahDiskon);
  hitungKembalian();
}

function hitungKembalian() {
  var bayar = getAngka("nominal-bayar");
  var box = getEl("box-kembalian");
  var statusEl = getEl("status-trx");
  if (!box || !statusEl) return;

  if (statusEl.value === "Hutang" || bayar < totalAkhirSetelahDiskon) {
    box.style.display = "none";
    return;
  }
  box.innerText = "Kembalian: " + formatRupiah(bayar - totalAkhirSetelahDiskon);
  box.style.display = "block";
}

function bukaModalPembayaran() {
  if (keranjang.length === 0) {
    alert("Keranjang masih kosong!");
    return;
  }
  cekHargaPelanggan(true);
  renderRincianModal();

  var today = new Date().toISOString().split("T")[0];
  var inputTgl = getEl("input-tanggal-trx");
  if (inputTgl) inputTgl.value = today;

  var modal = getEl("modal-pembayaran");
  if (modal) modal.style.display = "flex";
}

function prosesTransaksi() {
  var cekNgampas = getEl("cek-bawa-ngampas");
  var isNgampas = !!(cekNgampas && cekNgampas.checked);
  var statusEl = getEl("status-trx");
  var metodeEl = getEl("metode-bayar");
  var inputSupir = getEl("nama-supir-ngampas");
  var inputPel = getEl("nama-pelanggan");
  var inputTgl = getEl("input-tanggal-trx");

  var statusTrx = statusEl ? statusEl.value : "Lunas";
  var metode = metodeEl ? metodeEl.value : "Tunai";
  var namaSupir = inputSupir ? inputSupir.value.trim() : "";
  var namaPelMurni = inputPel ? inputPel.value.replace(/^NGAMPAS\s*-\s*/i, "").trim() : "";
  var pelangganFinal = namaPelMurni || "Umum";
  var bayar = getAngka("nominal-bayar");
  var diskon = getAngka("input-diskon");
  var tglManual = inputTgl ? inputTgl.value : "";

  if (isNgampas) {
    // Jika kasir lupa mengisi kolom supir tetapi mengetik di kolom pelanggan, gunakan sebagai cadangan
    if (!namaSupir && namaPelMurni) {
      namaSupir = namaPelMurni;
      namaPelMurni = "";
    }
    if (!namaSupir) {
      alert("Silakan isi 'Nama Supir Pengantar' terlebih dahulu (contoh: Hapis, Vais)!");
      if (inputSupir) inputSupir.focus();
      return;
    }

    if (namaPelMurni && namaPelMurni.toLowerCase() !== namaSupir.toLowerCase()) {
      pelangganFinal = "NGAMPAS - " + namaSupir + " ke " + namaPelMurni;
    } else {
      pelangganFinal = "NGAMPAS - " + namaSupir;
    }

    statusTrx = "Hutang";
    metode = "Belum Bayar";
    bayar = 0;
  }

  // Validasi Anti-Salah Ketik Kasir
  if (statusTrx === "Lunas" && bayar < totalAkhirSetelahDiskon) {
    alert(
      "Nominal uang kurang! Ubah Status Transaksi menjadi HUTANG jika pelanggan membayar sebagian/belum bayar."
    );
    return;
  }
  if (statusTrx === "Hutang" && bayar >= totalAkhirSetelahDiskon && totalAkhirSetelahDiskon > 0) {
    alert("Uang yang diterima sudah cukup! Silakan ubah Status Transaksi menjadi LUNAS.");
    return;
  }
  if (statusTrx === "Hutang" && metode === "Belum Bayar" && bayar > 0) {
    alert(
      "Jika ada nominal DP (Uang Muka), pilih metode pembayarannya (Tunai/Transfer/Qris), jangan 'Belum Bayar'!"
    );
    return;
  }
  if (statusTrx === "Hutang" && bayar === 0 && metode !== "Belum Bayar") {
    metode = "Belum Bayar";
    if (metodeEl) metodeEl.value = "Belum Bayar";
  }

  var kembalian = statusTrx === "Hutang" ? 0 : bayar - totalAkhirSetelahDiskon;
  var keranjangSnapshot = keranjang.map(function (k) {
    return Object.assign({}, k);
  });

  var dataPenjualan = {
    kasir: namaKasirAktif,
    pelanggan: pelangganFinal,
    metode: metode,
    status: statusTrx,
    totalBelanja: totalAkhirSetelahDiskon,
    bayar: bayar,
    kembalian: kembalian,
    keranjang: keranjangSnapshot,
    tanggalCustom: tglManual
  };

  var btn = getEl("btn-proses-trx");
  var oriText = btn ? btn.innerHTML : "SIMPAN TRANSAKSI";
  if (btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;
  }

  callBackend(
    "simpanTransaksi",
    { data: dataPenjualan },
    function (res) {
      if (btn) {
        btn.innerHTML = oriText;
        btn.disabled = false;
      }
      if (res && res.status === "sukses") {
        var idNotaBaru = res.nota || "TRX-BARU";
        var tglFormatted = konversiTanggalInputKeStr(tglManual);
        var waktuSekarang = getWaktuSekarangStr();

        // 1. OPTIMISTIC UI: Suntikkan langsung transaksi baru ke riwayatMaster lokal tanpa tunggu refresh!
        var detailBrgHtml = keranjangSnapshot
          .map(function (it) {
            return "• " + it.nama + " (" + it.qty + " x " + formatRupiah(it.harga) + ")";
          })
          .join("<br>");

        riwayatMaster.unshift({
          id: idNotaBaru,
          tanggal: tglFormatted,
          waktu: waktuSekarang,
          jenis: "Penjualan",
          detailBarang: detailBrgHtml,
          rincian: "Pelanggan: " + pelangganFinal,
          nominal: totalAkhirSetelahDiskon,
          dibayar: bayar,
          status: statusTrx,
          rawDate: tglFormatted
        });

        // Jika ada uang masuk via Transfer/QRIS (Auto-Setor), atau DP Hutang, suntikkan juga ke riwayatMaster lokal
        var kasMasukLokal = statusTrx === "Hutang" ? bayar : totalAkhirSetelahDiskon;
        if (statusTrx === "Hutang" && bayar > 0) {
          riwayatMaster.unshift({
            id: "KAS-DP-" + idNotaBaru,
            tanggal: tglFormatted,
            waktu: waktuSekarang,
            jenis: "Arus Kas (Pemasukan)",
            detailBarang: "-",
            rincian:
              "Pemasukan DP - Nota: " + idNotaBaru + " (Uang Muka via " + metode + ")",
            nominal: bayar,
            status: "Pemasukan",
            rawDate: tglFormatted
          });
        }
        var metodeLower = metode.toLowerCase();
        if (
          kasMasukLokal > 0 &&
          (metodeLower === "transfer" || metodeLower === "qris" || metodeLower === "shopee")
        ) {
          riwayatMaster.unshift({
            id: "KAS-AUT-" + idNotaBaru,
            tanggal: tglFormatted,
            waktu: waktuSekarang,
            jenis: "Arus Kas (Pengeluaran)",
            detailBarang: "-",
            rincian: "Setoran - Auto-Setor (" + metode + ") - Nota: " + idNotaBaru,
            nominal: kasMasukLokal,
            status: "Pengeluaran",
            rawDate: tglFormatted
          });
        }

        // 2. OPTIMISTIC UI: Kurangi langsung stok di dataMasterProduk lokal
        keranjangSnapshot.forEach(function (item) {
          var prod = dataMasterProduk.find(function (p) {
            return p.id.toString() === item.id.toString();
          });
          if (prod) {
            prod.stok = (parseInt(prod.stok, 10) || 0) - item.qty;
          }
        });
        renderAlertStokLokal();
        refreshTampilanRiwayatAktif();

        // 3. Gambar Struk & Bersihkan Keranjang
        var dataStruk = {
          keranjang: keranjangSnapshot,
          totalAsli: totalKeranjangRp,
          diskon: diskon,
          total: totalAkhirSetelahDiskon,
          bayar: bayar,
          kembalian: kembalian,
          pelanggan: pelangganFinal,
          metode: metode,
          status: statusTrx
        };
        gambarStruk(idNotaBaru, dataStruk, false);
        keranjang = [];
        updateUIKeranjang();
        cariProduk();
        tutupModal("modal-pembayaran");

        // Bersihkan form modal pembayaran
        if (cekNgampas) {
          cekNgampas.checked = false;
          toggleModeNgampasKasir();
        }
        if (inputSupir) inputSupir.value = "";
        if (inputPel) inputPel.value = "";
        if (getEl("nominal-bayar")) getEl("nominal-bayar").value = "";
        if (getEl("input-diskon")) getEl("input-diskon").value = "";
        if (metodeEl) metodeEl.value = "Tunai";
        if (statusEl) statusEl.value = "Lunas";
        if (getEl("info-harga-khusus-aktif"))
          getEl("info-harga-khusus-aktif").style.display = "none";

        bukaHalaman("struk");

        // Sinkronisasi latar belakang secara senyap untuk memastikan kesamaan ID dengan Google Sheets
        tarikDataProduk();
        tarikDataDashboard(true);
      } else {
        alert("Gagal: " + (res ? res.pesan : "Error"));
      }
    },
    function (err) {
      if (btn) {
        btn.innerHTML = oriText;
        btn.disabled = false;
      }
      alert("Gagal menyimpan transaksi: " + err.message);
    }
  );
}

// =========================================================
// HALAMAN ARUS KAS DINAMIS (DENGAN OPTIMISTIC UI)
// =========================================================
function ubahKategoriKas() {
  var katEl = getEl("kas-kategori");
  var jenisEl = getEl("kas-jenis");
  if (!katEl || !jenisEl) return;

  var kategori = katEl.value;
  var htmlOptions = "";

  if (kategori === "Pengeluaran") {
    htmlOptions += '<option value="Setoran">Setoran ke Bos / Bunda</option>';
    htmlOptions += '<option value="Operasional">Biaya Operasional Toko</option>';
    htmlOptions += '<option value="Gaji">Gaji / Kasbon Karyawan</option>';
    htmlOptions += '<option value="Lain-lain">Pengeluaran Lain-lain</option>';
  } else {
    htmlOptions += '<option value="Tambahan Modal">Tambahan Modal / Uang Kembalian</option>';
    htmlOptions += '<option value="Pelunasan Hutang">Pemasukan Piutang / Cicilan</option>';
    htmlOptions += '<option value="Lain-lain">Pemasukan Lain-lain</option>';
  }

  jenisEl.innerHTML = htmlOptions;
}

function simpanKas(ev) {
  var kategori = getEl("kas-kategori") ? getEl("kas-kategori").value : "Pengeluaran";
  var jenis = getEl("kas-jenis") ? getEl("kas-jenis").value : "Operasional";
  var nominal = getAngka("kas-nominal");
  var keterangan = getEl("kas-keterangan") ? getEl("kas-keterangan").value.trim() : "";
  var kotakTgl = getEl("input-tgl-kas");
  var tglManualKas = kotakTgl ? kotakTgl.value : "";

  if (nominal <= 0) {
    alert("Nominal harus lebih dari 0!");
    return;
  }

  var btn = ev ? ev.currentTarget || ev.target : null;
  var oriText = btn ? btn.innerHTML : "SIMPAN KAS";
  if (btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    btn.disabled = true;
  }

  callBackend(
    "simpanArusKas",
    {
      data: {
        kategori: kategori,
        jenis: jenis,
        nominal: nominal,
        keterangan: keterangan,
        tanggalCustom: tglManualKas
      }
    },
    function (res) {
      if (btn) {
        btn.innerHTML = oriText;
        btn.disabled = false;
      }
      if (res && res.status === "sukses") {
        // Optimistic UI: Masukkan langsung ke riwayatMaster lokal
        var tglFmt = konversiTanggalInputKeStr(tglManualKas);
        riwayatMaster.unshift({
          id: "KAS-" + new Date().getTime().toString().slice(-6),
          tanggal: tglFmt,
          waktu: getWaktuSekarangStr(),
          jenis: "Arus Kas (" + kategori + ")",
          detailBarang: "-",
          rincian: jenis + " - " + keterangan,
          nominal: nominal,
          status: kategori,
          rawDate: tglFmt
        });
        refreshTampilanRiwayatAktif();

        alert("Catatan Kas Berhasil Disimpan!");
        if (getEl("kas-nominal")) getEl("kas-nominal").value = "";
        if (getEl("kas-keterangan")) getEl("kas-keterangan").value = "";
        bukaHalaman("home");
        tarikDataDashboard(true);
      } else {
        alert("Gagal: " + (res ? res.pesan : "Error"));
      }
    },
    function (err) {
      if (btn) {
        btn.innerHTML = oriText;
        btn.disabled = false;
      }
      alert("Error: " + err.message);
    }
  );
}

// =========================================================
// HALAMAN BARANG MASUK / MUTASI STOK & PRODUK BARU
// =========================================================
function renderDropdownBarangMutasi(keyword) {
  var selectEl = getEl("restock-barang");
  if (!selectEl) return;

  var kw = (keyword || "").toLowerCase().trim();
  var htmlDD = "<option value=''>-- Pilih Barang --</option>";

  var filtered = dataMasterProduk.filter(function (p) {
    return (
      (p.nama || "").toLowerCase().includes(kw) ||
      (p.id || "").toString().toLowerCase().includes(kw)
    );
  });

  filtered.forEach(function (p) {
    htmlDD += "<option value='" + p.id + "'>" + p.nama + " (Sisa: " + p.stok + ")</option>";
  });

  selectEl.innerHTML = htmlDD;
  if (kw !== "" && filtered.length > 0) {
    selectEl.selectedIndex = 1;
  }
}

function filterDropdownBarangMutasi() {
  var cariEl = getEl("cari-barang-mutasi");
  var kw = cariEl ? cariEl.value : "";
  renderDropdownBarangMutasi(kw);
}

function bukaModalTambahProduk() {
  var m = getEl("modal-tambah-produk");
  if (m) m.style.display = "flex";
}

function tambahKeKeranjangMutasi() {
  var dropdown = getEl("restock-barang");
  if (!dropdown || !dropdown.value) {
    alert("Pilih barang terlebih dahulu!");
    return;
  }
  var idBarang = dropdown.value;
  var namaBarang = dropdown.options[dropdown.selectedIndex].text.split(" (Sisa:")[0];

  var qtyInput = parseInt(getEl("restock-qty") ? getEl("restock-qty").value : 0, 10);
  var jenisSatuan = getEl("jenis-satuan") ? getEl("jenis-satuan").value : "Pcs";
  var isiPerSatuan =
    parseInt(getEl("isi-per-satuan") ? getEl("isi-per-satuan").value : 1, 10) || 1;
  var totalQtyPcs = qtyInput * isiPerSatuan;

  if (isNaN(totalQtyPcs) || totalQtyPcs <= 0) {
    alert("Isi jumlah (Qty) yang valid terlebih dahulu!");
    return;
  }

  var infoSatuan =
    jenisSatuan !== "Pcs" ? "[" + qtyInput + " " + jenisSatuan + " isi " + isiPerSatuan + "]" : "";

  keranjangMutasi.push({
    idBarang: idBarang,
    namaBarang: namaBarang,
    qtyPcs: totalQtyPcs,
    infoSatuan: infoSatuan
  });

  if (getEl("restock-qty")) getEl("restock-qty").value = "";
  if (getEl("jenis-satuan")) getEl("jenis-satuan").value = "Pcs";
  if (getEl("isi-per-satuan")) getEl("isi-per-satuan").value = "1";
  if (getEl("wadah-isi-paket")) getEl("wadah-isi-paket").style.display = "none";
  if (getEl("tampil-total-pcs")) getEl("tampil-total-pcs").innerText = "0";
  if (getEl("cari-barang-mutasi")) {
    getEl("cari-barang-mutasi").value = "";
    renderDropdownBarangMutasi("");
  }

  gambarTabelMutasi();
}

function gambarTabelMutasi() {
  var wadah = getEl("area-tabel-mutasi");
  var jmlEl = getEl("jumlah-item-mutasi");
  if (jmlEl) jmlEl.innerText = keranjangMutasi.length;
  if (!wadah) return;

  if (keranjangMutasi.length === 0) {
    wadah.innerHTML = "<p class='empty-mutasi-text'>Belum ada barang di daftar.</p>";
    return;
  }

  var html = "<table>";
  html +=
    "<thead><tr><th>Nama Barang</th><th style='text-align: center;'>Jumlah (Pcs)</th><th style='text-align: center;'>Hapus</th></tr></thead><tbody>";

  keranjangMutasi.forEach(function (item, index) {
    html += "<tr>";
    html +=
      "<td>" +
      item.namaBarang +
      (item.infoSatuan
        ? "<br><span style='color:#0284c7; font-size:11px;'>" + item.infoSatuan + "</span>"
        : "") +
      "</td>";
    html += "<td style='text-align: center; font-weight: bold;'>" + item.qtyPcs + "</td>";
    html +=
      "<td style='text-align: center;'><button onclick='hapusItemMutasi(" +
      index +
      ")' style='background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;'><i class='fas fa-trash'></i></button></td>";
    html += "</tr>";
  });
  html += "</tbody></table>";
  wadah.innerHTML = html;
}

function hapusItemMutasi(index) {
  keranjangMutasi.splice(index, 1);
  gambarTabelMutasi();
}

function simpanSemuaMutasi() {
  if (keranjangMutasi.length === 0) {
    alert("Daftar masih kosong! Tambahkan minimal 1 barang ke daftar.");
    return;
  }

  var jenisTrx = getEl("restock-jenisTrx") ? getEl("restock-jenisTrx").value : "Masuk";
  var keteranganGlobal = getEl("restock-keterangan")
    ? getEl("restock-keterangan").value.trim()
    : "";
  var tglManual = getEl("input-tgl-bm") ? getEl("input-tgl-bm").value : "";

  if (jenisTrx === "Keluar" && keteranganGlobal === "") {
    alert("Keterangan Umum WAJIB diisi jika Jenis Mutasi adalah Barang Keluar!");
    return;
  }

  var btn = getEl("btn-simpan-semua-mutasi");
  var oriText = btn ? btn.innerHTML : "SIMPAN SEMUA TRANSAKSI";
  if (btn) {
    btn.innerHTML =
      "<i class='fas fa-spinner fa-spin'></i> Menyimpan " + keranjangMutasi.length + " Barang...";
    btn.disabled = true;
  }

  var snapshotMutasi = keranjangMutasi.slice();
  var paketDataMutasi = {
    penerima: namaKasirAktif,
    jenisTrx: jenisTrx,
    keteranganGlobal: keteranganGlobal,
    tanggalCustom: tglManual,
    daftarBarang: snapshotMutasi
  };

  callBackend(
    "simpanMutasiBatch",
    { data: paketDataMutasi },
    function (res) {
      if (btn) {
        btn.innerHTML = oriText;
        btn.disabled = false;
      }
      if (res && res.status === "sukses") {
        // Optimistic UI: Perbarui stok lokal & riwayat lokal
        var pengali = jenisTrx === "Keluar" ? -1 : 1;
        var tglFmt = konversiTanggalInputKeStr(tglManual);
        snapshotMutasi.forEach(function (it, idx) {
          var prod = dataMasterProduk.find(function (p) {
            return p.id.toString() === it.idBarang.toString();
          });
          if (prod) {
            prod.stok = (parseInt(prod.stok, 10) || 0) + it.qtyPcs * pengali;
          }
          riwayatMaster.unshift({
            id: (jenisTrx === "Keluar" ? "OUT-" : "IN-") + new Date().getTime() + "-" + (idx + 1),
            tanggal: tglFmt,
            waktu: "-",
            jenis: "Barang Masuk",
            detailBarang: "• " + it.namaBarang + " (" + it.qtyPcs + " qty)",
            rincian:
              (it.infoSatuan ? it.infoSatuan + " " : "") +
              (jenisTrx === "Keluar" ? "[BARANG KELUAR] " : "") +
              keteranganGlobal,
            nominal: 0,
            status: "Stok",
            rawDate: tglFmt
          });
        });

        renderAlertStokLokal();
        refreshTampilanRiwayatAktif();

        alert("Sukses! " + snapshotMutasi.length + " barang berhasil diproses ke dalam stok.");
        keranjangMutasi = [];
        gambarTabelMutasi();
        if (getEl("restock-keterangan")) getEl("restock-keterangan").value = "";
        bukaHalaman("home");
        tarikDataProduk();
        tarikDataDashboard(true);
      } else {
        alert("Gagal: " + (res ? res.pesan : "Error"));
      }
    },
    function (err) {
      if (btn) {
        btn.innerHTML = oriText;
        btn.disabled = false;
      }
      alert("Error: " + err.message);
    }
  );
}

function aturFormSatuan() {
  var jenisEl = getEl("jenis-satuan");
  var wadahIsi = getEl("wadah-isi-paket");
  var inputIsi = getEl("isi-per-satuan");
  if (!jenisEl || !wadahIsi || !inputIsi) return;

  if (jenisEl.value === "Pcs") {
    wadahIsi.style.display = "none";
    inputIsi.value = 1;
  } else {
    wadahIsi.style.display = "block";
    inputIsi.value = "";
  }
  hitungTotalPcs();
}

function hitungTotalPcs() {
  var qty = parseInt(getEl("restock-qty") ? getEl("restock-qty").value : 0, 10) || 0;
  var isi = parseInt(getEl("isi-per-satuan") ? getEl("isi-per-satuan").value : 1, 10) || 1;
  var tampilEl = getEl("tampil-total-pcs");
  if (tampilEl) tampilEl.innerText = qty * isi;
}

function simpanProdukBaru() {
  var nama = getEl("add-nama") ? getEl("add-nama").value.trim() : "";
  var kategori = getEl("add-kategori") ? getEl("add-kategori").value.trim() || "Umum" : "Umum";
  var modal = getAngka("add-modal");
  var jual = getAngka("add-jual");
  var stok = parseInt(getEl("add-stok") ? getEl("add-stok").value : 0, 10) || 0;

  if (nama === "" || jual <= 0) {
    alert("Nama Barang & Harga Jual wajib diisi!");
    return;
  }

  var btn = getEl("btn-simpan-produk");
  var oriText = btn ? btn.innerHTML : "SIMPAN PRODUK";
  if (btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;
  }

  callBackend(
    "tambahProdukBaru",
    {
      data: {
        nama: nama,
        kategori: kategori,
        modal: modal,
        jual: jual,
        stok: stok,
        penerima: namaKasirAktif
      }
    },
    function (res) {
      if (btn) {
        btn.innerHTML = oriText;
        btn.disabled = false;
      }
      if (res && res.status === "sukses") {
        alert("Produk Baru Berhasil Ditambahkan!");
        tutupModal("modal-tambah-produk");
        if (getEl("add-nama")) getEl("add-nama").value = "";
        if (getEl("add-kategori")) getEl("add-kategori").value = "";
        if (getEl("add-modal")) getEl("add-modal").value = "";
        if (getEl("add-jual")) getEl("add-jual").value = "";
        if (getEl("add-stok")) getEl("add-stok").value = "";
        tarikDataProduk();
        tarikDataDashboard(true);
        if (hasClassActive("page-laporan-stok")) {
          tarikDataLaporanStok();
        }
      } else {
        alert("Gagal: " + (res ? res.pesan : "Error"));
      }
    },
    function (err) {
      if (btn) {
        btn.innerHTML = oriText;
        btn.disabled = false;
      }
      alert("Error: " + err.message);
    }
  );
}

// =========================================================
// HALAMAN PIUTANG & MODAL PELUNASAN PIUTANG
// =========================================================
function loadDataPiutangKasir() {
  var tbody = getEl("body-piutang-kasir");
  if (!tbody) return;
  tbody.innerHTML =
    "<tr><td colspan='6' style='text-align:center; padding:20px;'><i class='fas fa-spinner fa-spin'></i> Mencari data hutang...</td></tr>";

  callBackend("getDaftarPiutangAktif", {}, function (res) {
    if (res && res.status === "sukses") {
      dataPiutangAktif = (res.data || []).filter(function (p) {
        var namaUpper = (p.pelanggan || "").toUpperCase();
        return namaUpper.indexOf("NGAMPAS") === -1 && namaUpper.indexOf("KANVAS") === -1;
      });
      renderTabelPiutangKasir(dataPiutangAktif);
    } else {
      tbody.innerHTML =
        "<tr><td colspan='6' style='text-align:center; color:red;'>Gagal memuat: " +
        (res ? res.pesan : "Error") +
        "</td></tr>";
    }
  });
}

function renderTabelPiutangKasir(data) {
  var tbody = getEl("body-piutang-kasir");
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML =
      "<tr><td colspan='6' style='text-align:center; padding:20px; color:#999;'><i class='fas fa-check-circle' style='color:#28a745; font-size:24px;'></i><br>Bagus! Tidak ada pelanggan reguler yang berhutang.</td></tr>";
    return;
  }

  var html = "";
  data.forEach(function (p) {
    var pelSafe = (p.pelanggan || "Umum").replace(/"/g, "");
    html += "<tr>";
    html += "<td>" + p.tanggal + "</td>";
    html += "<td><small>" + p.id + "</small></td>";
    html += "<td style='color:#005A9C;'><b>" + p.pelanggan + "</b></td>";
    html += "<td style='text-align:right;'>" + formatRupiah(p.total) + "</td>";
    html +=
      "<td style='text-align:right; color:#dc3545; font-weight:bold; font-size:15px;'>" +
      formatRupiah(p.sisa) +
      "</td>";
    html +=
      "<td style='text-align:center;'><button class='btn-aksi btn-bayar-htg' onclick='bukaModalBayarPiutang(\"" +
      p.id +
      "\", \"" +
      pelSafe +
      "\", " +
      p.sisa +
      ")' style='padding:8px 14px; width:100%;'><i class='fas fa-money-bill'></i> Bayar</button></td>";
    html += "</tr>";
  });
  tbody.innerHTML = html;
}

function filterPiutangKasir() {
  var searchEl = getEl("search-piutang-kasir");
  var kw = searchEl ? searchEl.value.toLowerCase() : "";
  var filtered = dataPiutangAktif.filter(function (p) {
    return (
      (p.pelanggan || "").toLowerCase().includes(kw) ||
      (p.id || "").toLowerCase().includes(kw)
    );
  });
  renderTabelPiutangKasir(filtered);
}

function bukaModalBayarPiutang(idTrx, namaPelanggan, sisaHutang) {
  currentPiutangId = idTrx;
  currentPiutangSisa = parseInt(sisaHutang, 10) || 0;

  if (getEl("piutang-id-nota")) getEl("piutang-id-nota").innerText = idTrx;
  if (getEl("piutang-nama-pelanggan"))
    getEl("piutang-nama-pelanggan").innerText = namaPelanggan || "Umum";
  if (getEl("piutang-sisa-tampil"))
    getEl("piutang-sisa-tampil").innerText = formatRupiah(currentPiutangSisa);

  var inputBayar = getEl("input-bayar-piutang");
  if (inputBayar) {
    inputBayar.value =
      currentPiutangSisa > 0 ? new Intl.NumberFormat("id-ID").format(currentPiutangSisa) : "";
  }
  if (getEl("metode-bayar-piutang")) getEl("metode-bayar-piutang").value = "Tunai";

  var modal = getEl("modal-bayar-piutang");
  if (modal) modal.style.display = "flex";
}

function konfirmasiBayarPiutang() {
  var bayarAngka = getAngka("input-bayar-piutang");
  var metodeCicilan = getEl("metode-bayar-piutang")
    ? getEl("metode-bayar-piutang").value
    : "Tunai";

  if (bayarAngka <= 0) {
    alert("Masukkan nominal pembayaran yang valid!");
    return;
  }

  var btn = getEl("btn-konfirmasi-piutang");
  var oriText = btn ? btn.innerHTML : "SIMPAN PEMBAYARAN HUTANG";
  if (btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    btn.disabled = true;
  }

  callBackend(
    "lunasiHutang",
    {
      idTrx: currentPiutangId,
      nominalCicilan: bayarAngka,
      metodeCicilan: metodeCicilan
    },
    function (res) {
      if (btn) {
        btn.innerHTML = oriText;
        btn.disabled = false;
      }
      if (res && res.status === "sukses") {
        tutupModal("modal-bayar-piutang");

        // Optimistic UI: Catat pelunasan ke riwayatMaster lokal
        var tglHariIni = getTanggalHariIniStr();
        var ketLunas = res.sisa <= 0 ? "Pelunasan Hutang (Lunas 100%)" : "Cicilan Hutang";
        riwayatMaster.unshift({
          id: "KAS-HTG-" + new Date().getTime().toString().slice(-5),
          tanggal: tglHariIni,
          waktu: getWaktuSekarangStr(),
          jenis: "Arus Kas (Pemasukan)",
          detailBarang: "-",
          rincian: "Pelunasan Hutang - Nota: " + currentPiutangId + " - " + ketLunas,
          nominal: bayarAngka,
          status: "Pemasukan",
          rawDate: tglHariIni
        });
        if (metodeCicilan === "Transfer" || metodeCicilan === "Qris") {
          riwayatMaster.unshift({
            id: "KAS-AUT-" + new Date().getTime().toString().slice(-5),
            tanggal: tglHariIni,
            waktu: getWaktuSekarangStr(),
            jenis: "Arus Kas (Pengeluaran)",
            detailBarang: "-",
            rincian:
              "Setoran - Auto-Setor (" + metodeCicilan + ") Pelunasan - Nota: " + currentPiutangId,
            nominal: bayarAngka,
            status: "Pengeluaran",
            rawDate: tglHariIni
          });
        }
        // Update status nota di riwayatMaster lokal jika sudah lunas
        riwayatMaster.forEach(function (r) {
          if (r.id === currentPiutangId && res.sisa <= 0) {
            r.status = "Dilunasi";
          }
        });
        refreshTampilanRiwayatAktif();

        var pesan =
          res.sisa > 0
            ? "Cicilan Berhasil Dicatat!\nSisa hutang nota ini sekarang: " + formatRupiah(res.sisa)
            : "LUNAS 100%!\nHutang pada nota " + currentPiutangId + " telah lunas sepenuhnya.";
        alert(pesan);

        tarikDataDashboard(true);
        if (hasClassActive("page-piutang-kasir")) {
          loadDataPiutangKasir();
        }
        if (hasClassActive("page-laporan-piutang")) {
          tarikDataLaporanPiutang();
        }
      } else {
        alert("Gagal: " + (res ? res.pesan : "Error"));
      }
    },
    function (err) {
      if (btn) {
        btn.innerHTML = oriText;
        btn.disabled = false;
      }
      alert("Error: " + err.message);
    }
  );
}

// =========================================================
// EDIT & LIHAT DETAIL TRANSAKSI PENJUALAN
// =========================================================
function editTransaksi(idTrx) {
  if (roleAktif === "Kasir" || roleAktif === "Karyawan") {
    alert("Akses Ditolak: Hanya Admin yang dapat menghapus/mengedit nota transaksi.");
    return;
  }
  if (!confirm("Hapus Nota " + idTrx + " dan pindahkan isinya ke Keranjang Kasir untuk diedit?"))
    return;

  callBackend("getDetailTransaksi", { idTrx: idTrx }, function (res) {
    if (res && res.status === "sukses") {
      var detailLama = res.detail || [];
      var pelangganLama = res.header ? res.header.pelanggan : "Umum";
      callBackend("batalkanTransaksi", { idTrx: idTrx }, function (resBatal) {
        if (resBatal && resBatal.status === "sukses") {
          keranjang = detailLama.map(function (item) {
            return Object.assign({}, item, { isManualDiskon: true });
          });
          if (getEl("nama-pelanggan")) {
            getEl("nama-pelanggan").value = pelangganLama === "Umum" ? "" : pelangganLama;
          }
          updateUIKeranjang();
          tarikDataDashboard();
          bukaHalaman("kasir");
          tarikDataProduk();
        } else {
          alert("Gagal membatalkan nota lama: " + (resBatal ? resBatal.pesan : "Error"));
        }
      });
    } else {
      alert("Gagal mengambil detail nota: " + (res ? res.pesan : "Error"));
    }
  });
}

function lihatDetailTransaksi(idTrx) {
  callBackend("getDetailTransaksi", { idTrx: idTrx }, function (res) {
    if (res && res.status === "sukses") {
      var h = res.header;
      var dataStrukUlang = {
        keranjang: res.detail,
        totalAsli: h.totalAsli,
        diskon: h.diskon,
        total: h.totalBelanja,
        bayar: h.bayar,
        kembalian: h.kembalian,
        pelanggan: h.pelanggan,
        metode: h.metode,
        status: h.status,
        waktuCetakUlang: h.tanggal + " " + h.waktu,
        kasirAwal: h.kasir
      };
      gambarStruk(idTrx, dataStrukUlang, true);
      bukaHalaman("struk");
    } else {
      alert("Gagal memuat struk: " + (res ? res.pesan : "Error"));
    }
  });
}

// =========================================================
// STRUK DINAMIS & PRINTER THERMAL BLUETOOTH 58MM
// =========================================================
function gambarStruk(idNota, data, isCetakUlang) {
  idNotaTerakhir = idNota;
  dataStrukTerakhir = data;

  var d = new Date();
  var tglTampil =
    ("0" + d.getDate()).slice(-2) +
    "/" +
    ("0" + (d.getMonth() + 1)).slice(-2) +
    "/" +
    d.getFullYear() +
    " " +
    ("0" + d.getHours()).slice(-2) +
    ":" +
    ("0" + d.getMinutes()).slice(-2);
  var waktuTampil = isCetakUlang ? data.waktuCetakUlang : tglTampil;
  var kasirTampil = isCetakUlang ? data.kasirAwal : namaKasirAktif;
  var tandaCetakUlang = isCetakUlang
    ? "<div style='text-align:center; font-style:italic; font-size:11px; margin-bottom:5px;'>(Salinan Struk)</div>"
    : "";

  var namaToko = settingToko.nama_toko || "AL-KAUTSAR FILTER AIR";
  var alamatToko =
    settingToko.alamat_toko ||
    "Jl. Ahmad Yani, Bulukarto, Sidoharjo, Kab. Pringsewu, Lampung 35372";
  var kontakToko =
    settingToko.kontak_toko || "0813-7961-2518 (Ibu Veramon) / 0812-7964-5858 (Pak Jon)";
  var footerStruk =
    settingToko.footer_struk ||
    "Terimakasih atas pesanan anda.\nHubungi nomor di atas untuk pemesanan selanjutnya!";

  var tampilanLogo = settingToko.logo_url
    ? "<img src='" + settingToko.logo_url + "' style='max-width:75px; margin-bottom:6px;'><br>"
    : "";

  var html = "<div style='width: 100%; margin: 0 auto; color: #000;'>";
  html += "<div style='text-align:center; margin-bottom:8px;'>" + tampilanLogo;
  html +=
    "<h2 style='margin:0; font-size:16px; font-weight:bold; text-transform:uppercase;'>" +
    namaToko +
    "</h2>";
  html += "<div style='font-size:11px; line-height:1.3; margin-top:2px;'>" + alamatToko + "</div>";
  html +=
    "<div style='font-size:11px; font-weight:bold; margin-top:2px;'>" + kontakToko + "</div></div>";
  html += tandaCetakUlang;

  html +=
    "<div style='border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; font-size:11px; text-align:left;'>";
  html +=
    "<div style='display:flex;'><span style='width:80px; flex-shrink:0;'>Nota</span><span>: " +
    idNota +
    "</span></div>";
  html +=
    "<div style='display:flex;'><span style='width:80px; flex-shrink:0;'>Waktu</span><span>: " +
    waktuTampil +
    "</span></div>";
  html +=
    "<div style='display:flex;'><span style='width:80px; flex-shrink:0;'>Kasir</span><span>: " +
    kasirTampil +
    "</span></div>";
  html +=
    "<div style='display:flex;'><span style='width:80px; flex-shrink:0;'>Pelanggan</span><span>: " +
    (data.pelanggan || "Umum") +
    "</span></div></div>";

  html += "<div style='font-size:11px; min-height:40px; text-align:left;'>";
  data.keranjang.forEach(function (k) {
    html +=
      "<div style='margin-bottom:4px;'><div><b>" +
      k.nama +
      "</b></div><div style='display:flex; justify-content:space-between;'><span>" +
      k.qty +
      " x " +
      formatRupiah(k.harga) +
      "</span><span><b>" +
      formatRupiah(k.subtotal) +
      "</b></span></div></div>";
  });
  html += "</div><div style='border-top: 1px dashed #000; padding-top: 5px; font-size:11px;'>";

  if (data.diskon > 0) {
    html +=
      "<div style='display:flex; justify-content:space-between;'><span>Subtotal</span><span>" +
      formatRupiah(data.totalAsli) +
      "</span></div>";
    html +=
      "<div style='display:flex; justify-content:space-between;'><span>Diskon</span><span>-" +
      formatRupiah(data.diskon) +
      "</span></div>";
  }
  html +=
    "<div style='display:flex; justify-content:space-between; font-size:13px; margin-top:4px; margin-bottom:4px;'><b>TOTAL</b><b>" +
    formatRupiah(data.total) +
    "</b></div>";

  var sisaKekurangan = data.total - data.bayar;
  if (sisaKekurangan > 0 || data.status === "Hutang") {
    var sisaFix = sisaKekurangan > 0 ? sisaKekurangan : 0;
    html +=
      "<div style='display:flex; justify-content:space-between;'><span>Sudah Bayar (DP)</span><span>" +
      formatRupiah(data.bayar) +
      "</span></div>";
    html +=
      "<div style='display:flex; justify-content:space-between;'><b>Sisa Hutang</b><b>" +
      formatRupiah(sisaFix) +
      "</b></div>";
    html +=
      "<div style='text-align:center; font-weight:bold; font-size:13px; margin-top:8px; border:1px dashed #000; padding:3px;'>STATUS: HUTANG</div>";
  } else {
    html +=
      "<div style='display:flex; justify-content:space-between;'><span>BAYAR (" +
      (data.metode || "Tunai") +
      ")</span><span>" +
      formatRupiah(data.bayar) +
      "</span></div>";
    html +=
      "<div style='display:flex; justify-content:space-between;'><span>KEMBALI</span><span>" +
      formatRupiah(data.kembalian) +
      "</span></div>";
  }

  html +=
    "</div><div style='text-align:center; margin-top:12px; font-size:11px; border-top: 1px dashed #000; padding-top: 6px; white-space:pre-line;'>" +
    footerStruk +
    "</div></div>";

  if (getEl("tampilan-struk")) getEl("tampilan-struk").innerHTML = html;

  var waText =
    "*" +
    namaToko.toUpperCase() +
    "*\n" +
    alamatToko +
    "\n" +
    kontakToko +
    "\n--------------------------------\nNota: " +
    idNota +
    "\nWaktu: " +
    waktuTampil +
    "\nKasir: " +
    kasirTampil +
    "\nPelanggan: " +
    (data.pelanggan || "Umum") +
    "\n--------------------------------\n";
  data.keranjang.forEach(function (k) {
    waText +=
      "*" +
      k.nama +
      "*\n" +
      k.qty +
      " x " +
      formatRupiah(k.harga) +
      " = " +
      formatRupiah(k.subtotal) +
      "\n";
  });
  waText += "--------------------------------\n";
  if (data.diskon > 0) {
    waText +=
      "SUBTOTAL: " +
      formatRupiah(data.totalAsli) +
      "\nDISKON: -" +
      formatRupiah(data.diskon) +
      "\n";
  }
  waText += "*TOTAL: " + formatRupiah(data.total) + "*\n";

  if (sisaKekurangan > 0 || data.status === "Hutang") {
    waText +=
      "Sudah Bayar: " +
      formatRupiah(data.bayar) +
      "\nSisa Hutang: " +
      formatRupiah(sisaKekurangan > 0 ? sisaKekurangan : 0) +
      "\n\n*STATUS: HUTANG*\n";
  } else {
    waText +=
      "BAYAR (" +
      (data.metode || "Tunai") +
      "): " +
      formatRupiah(data.bayar) +
      "\nKEMBALI: " +
      formatRupiah(data.kembalian) +
      "\n";
  }

  waText += "\n_" + footerStruk + "_";
  teksStrukTerakhir = waText;
}

function kirimStrukWA() {
  var noWA = prompt(
    "Nomor WA Pelanggan (awali 62 atau 08):\nKosongkan lalu klik OK untuk memilih kontak manual di WhatsApp"
  );
  if (noWA !== null) {
    var cleanNo = noWA.replace(/\D/g, "");
    if (cleanNo.startsWith("08")) cleanNo = "62" + cleanNo.slice(1);
    window.open(
      "https://wa.me/" + cleanNo + "?text=" + encodeURIComponent(teksStrukTerakhir),
      "_blank"
    );
  }
}

function barisKiriKanan58mm(kiri, kanan) {
  var lebar = 32;
  var k1 = (kiri || "").toString();
  var k2 = (kanan || "").toString();
  var sisaSpasi = lebar - k1.length - k2.length;
  if (sisaSpasi < 1) {
    return k1.slice(0, lebar - k2.length - 1) + " " + k2 + "\n";
  }
  return k1 + " ".repeat(sisaSpasi) + k2 + "\n";
}

function buatStringEscPos58mm() {
  if (!dataStrukTerakhir) return "";
  var data = dataStrukTerakhir;
  var namaToko = (settingToko.nama_toko || "AL-KAUTSAR FILTER AIR").toUpperCase();
  var alamatToko = settingToko.alamat_toko || "Jl. Ahmad Yani, Bulukarto, Pringsewu";
  var kontakToko = settingToko.kontak_toko || "0813-7961-2518 / 0812-7964-5858";
  var footerStruk = settingToko.footer_struk || "Terimakasih atas pesanan anda.";

  var d = new Date();
  var tglSekarang =
    ("0" + d.getDate()).slice(-2) +
    "/" +
    ("0" + (d.getMonth() + 1)).slice(-2) +
    "/" +
    d.getFullYear() +
    " " +
    ("0" + d.getHours()).slice(-2) +
    ":" +
    ("0" + d.getMinutes()).slice(-2);
  var waktu = data.waktuCetakUlang || tglSekarang;
  var kasir = data.kasirAwal || namaKasirAktif;
  var garis = "--------------------------------\n";

  var esc = "";
  esc += "\x1B\x40";
  esc += "\x1B\x61\x01";
  esc += "\x1B\x45\x01";
  esc += namaToko + "\n";
  esc += "\x1B\x45\x00";
  esc += alamatToko + "\n";
  esc += kontakToko + "\n";
  esc += garis;

  esc += "\x1B\x61\x00";
  esc += "Nota : " + idNotaTerakhir + "\n";
  esc += "Waktu: " + waktu + "\n";
  esc += "Kasir: " + kasir + "\n";
  esc += "Plg  : " + (data.pelanggan || "Umum") + "\n";
  esc += garis;

  data.keranjang.forEach(function (k) {
    esc += k.nama.slice(0, 32) + "\n";
    var kiri = k.qty + " x " + new Intl.NumberFormat("id-ID").format(k.harga);
    var kanan = new Intl.NumberFormat("id-ID").format(k.subtotal);
    esc += barisKiriKanan58mm(kiri, kanan);
  });

  esc += garis;
  if (data.diskon > 0) {
    esc += barisKiriKanan58mm(
      "Subtotal",
      "Rp " + new Intl.NumberFormat("id-ID").format(data.totalAsli)
    );
    esc += barisKiriKanan58mm(
      "Diskon",
      "-Rp " + new Intl.NumberFormat("id-ID").format(data.diskon)
    );
  }

  esc += "\x1B\x45\x01";
  esc += barisKiriKanan58mm(
    "TOTAL",
    "Rp " + new Intl.NumberFormat("id-ID").format(data.total)
  );
  esc += "\x1B\x45\x00";

  var sisa = data.total - data.bayar;
  if (sisa > 0 || data.status === "Hutang") {
    esc += barisKiriKanan58mm(
      "Sudah Bayar",
      "Rp " + new Intl.NumberFormat("id-ID").format(data.bayar)
    );
    esc += barisKiriKanan58mm(
      "Sisa Hutang",
      "Rp " + new Intl.NumberFormat("id-ID").format(sisa > 0 ? sisa : 0)
    );
    esc += "\x1B\x61\x01";
    esc += "\x1B\x45\x01** STATUS: HUTANG **\x1B\x45\x00\n";
  } else {
    esc += barisKiriKanan58mm(
      "Bayar (" + (data.metode || "Tunai") + ")",
      "Rp " + new Intl.NumberFormat("id-ID").format(data.bayar)
    );
    esc += barisKiriKanan58mm(
      "Kembali",
      "Rp " + new Intl.NumberFormat("id-ID").format(data.kembalian)
    );
  }

  esc += garis;
  esc += "\x1B\x61\x01";
  esc += footerStruk + "\n\n\n\n";
  return esc;
}

async function cetakStrukBluetooth(ev) {
  if (!navigator.bluetooth) {
    alert(
      "Browser ini belum mendukung Web Bluetooth langsung.\nGunakan browser Google Chrome di Android/Laptop, atau klik tombol 'RAWBT APP'."
    );
    return;
  }

  var btn = ev ? ev.currentTarget || ev.target : null;
  var oriHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghubungkan Printer...';
    btn.disabled = true;
  }

  try {
    if (!btDevice || !btDevice.gatt.connected || !btCharacteristic) {
      btDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "000018f0-0000-1000-8000-00805f9b34fb",
          "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
          "49535343-fe7d-4ae5-8fa9-9fafd205e455"
        ]
      });

      var server = await btDevice.gatt.connect();
      var services = await server.getPrimaryServices();
      btCharacteristic = null;

      for (var i = 0; i < services.length; i++) {
        var chars = await services[i].getCharacteristics();
        for (var j = 0; j < chars.length; j++) {
          if (chars[j].properties.write || chars[j].properties.writeWithoutResponse) {
            btCharacteristic = chars[j];
            break;
          }
        }
        if (btCharacteristic) break;
      }
    }

    if (!btCharacteristic) {
      throw new Error("Karakteristik cetak tidak ditemukan pada perangkat Bluetooth ini.");
    }

    var escPosText = buatStringEscPos58mm();
    var encoder = new TextEncoder();
    var bytes = encoder.encode(escPosText);

    var chunkSize = 100;
    for (var offset = 0; offset < bytes.length; offset += chunkSize) {
      var chunk = bytes.slice(offset, offset + chunkSize);
      if (btCharacteristic.properties.writeWithoutResponse) {
        await btCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await btCharacteristic.writeValue(chunk);
      }
      await new Promise(function (r) {
        setTimeout(r, 25);
      });
    }
  } catch (err) {
    if (err.name !== "NotFoundError") {
      alert("Gagal mencetak via Bluetooth: " + err.message);
    }
  } finally {
    if (btn) {
      btn.innerHTML = oriHtml;
      btn.disabled = false;
    }
  }
}

function cetakStrukRawBT() {
  var escPosText = buatStringEscPos58mm();
  if (!escPosText) return;
  var base64Data = btoa(unescape(encodeURIComponent(escPosText)));
  window.location.href =
    "intent:base64," +
    base64Data +
    "#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;";
}

// =========================================================
// LAPOR BOS VIA PDF & WHATSAPP
// =========================================================
function laporBosWA(tipe, ev) {
  var btn = ev ? ev.currentTarget || ev.target : null;
  var oriHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyiapkan PDF...';
    btn.disabled = true;
  }

  var d = new Date();
  if (tipe === "kemarin") d.setDate(d.getDate() - 1);
  var targetTgl =
    ("0" + d.getDate()).slice(-2) +
    "/" +
    ("0" + (d.getMonth() + 1)).slice(-2) +
    "/" +
    d.getFullYear();

  var tMasuk = 0;
  var tKeluar = 0;
  var tSetor = 0;
  var tPiutang = 0;

  riwayatMaster.forEach(function (r) {
    var rDate = r.rawDate || r.tanggal || "";
    if (rDate.includes(targetTgl) || (r.tanggal || "").includes(targetTgl)) {
      if ((r.jenis || "").includes("Penjualan")) {
        if (r.status === "Lunas") tMasuk += r.nominal || 0;
        else if (r.status === "Hutang") tPiutang += (r.nominal || 0) - (r.dibayar || 0);
      } else if (
        (r.jenis || "").includes("Pemasukan") ||
        (r.jenis || "").includes("Arus Kas Masuk")
      ) {
        var stringCek = ((r.jenis || "") + " " + (r.status || "") + " " + (r.rincian || "")).toLowerCase();
        if (!stringCek.includes("penjualan kasir")) tMasuk += r.nominal || 0;
      } else if (
        (r.jenis || "").includes("Pengeluaran") ||
        (r.jenis || "").includes("Arus Kas Keluar")
      ) {
        var stringCekKeluar = ((r.status || "") + " " + (r.rincian || "")).toLowerCase();
        if (stringCekKeluar.includes("setoran")) tSetor += r.nominal || 0;
        else if (!stringCekKeluar.includes("tutup kas")) tKeluar += r.nominal || 0;
      }
    }
  });

  var sisaLaci = tMasuk - tKeluar - tSetor;

  teksLaporGlobal =
    "*LAPORAN SHIFT KASIR*\nTanggal: " +
    targetTgl +
    "\nKasir: " +
    namaKasirAktif +
    "\n\n*Total Pemasukan:* " +
    formatRupiah(tMasuk) +
    "\n*Pengeluaran Toko:* " +
    formatRupiah(tKeluar) +
    "\n*Setoran Bunda:* " +
    formatRupiah(tSetor) +
    "\n*Sisa Uang Laci:* " +
    formatRupiah(sisaLaci) +
    "\n\n*Piutang Baru:* " +
    formatRupiah(tPiutang) +
    "\n\n_Berikut saya lampirkan file PDF rinciannya di atas_";

  var targetID = tipe === "kemarin" ? "tabel-kemarin" : "tabel-hari-ini";
  var tabelAsli = getEl(targetID);

  elemenUntukPDF = document.createElement("div");
  elemenUntukPDF.style.padding = "20px";
  elemenUntukPDF.style.fontFamily = "'Helvetica', sans-serif";
  elemenUntukPDF.style.color = "#333";

  var namaTokoHeader = settingToko.nama_toko || "AL-KAUTSAR FILTER AIR";
  var kopSurat =
    "<h2 style='text-align:center; color:#005A9C; margin-bottom:5px; text-transform:uppercase; font-size: 20px;'>" +
    namaTokoHeader +
    "</h2>";
  kopSurat +=
    "<p style='text-align:center; font-size:12px; margin-top:0; border-bottom:2px solid #333; padding-bottom:10px;'>Laporan Kasir Harian | Tanggal: " +
    targetTgl +
    "</p>";

  var ringkasanPDF = `
    <div style="display: flex; justify-content: space-between; margin-top: 15px; margin-bottom: 20px; text-align: center;">
      <div style="flex: 1; border: 1px solid #ccc; margin: 0 4px; padding: 8px; border-radius: 5px; background: #e6fced;">
        <div style="font-size: 10px; font-weight: bold; color: #155724;">TOTAL PEMASUKAN</div>
        <div style="font-size: 13px; font-weight: bold; color: #000;">${formatRupiah(tMasuk)}</div>
      </div>
      <div style="flex: 1; border: 1px solid #ccc; margin: 0 4px; padding: 8px; border-radius: 5px; background: #fdf2f2;">
        <div style="font-size: 10px; font-weight: bold; color: #721c24;">PENGELUARAN</div>
        <div style="font-size: 13px; font-weight: bold; color: #000;">${formatRupiah(tKeluar)}</div>
      </div>
      <div style="flex: 1; border: 1px solid #ccc; margin: 0 4px; padding: 8px; border-radius: 5px; background: #fff8e6;">
        <div style="font-size: 10px; font-weight: bold; color: #856404;">SETORAN BUNDA</div>
        <div style="font-size: 13px; font-weight: bold; color: #000;">${formatRupiah(tSetor)}</div>
      </div>
      <div style="flex: 1; border: 1px solid #ccc; margin: 0 4px; padding: 8px; border-radius: 5px; background: #e6f7ff;">
        <div style="font-size: 10px; font-weight: bold; color: #004085;">SISA UANG LACI</div>
        <div style="font-size: 13px; font-weight: bold; color: #000;">${formatRupiah(sisaLaci)}</div>
      </div>
    </div>
  `;

  elemenUntukPDF.innerHTML =
    kopSurat +
    ringkasanPDF +
    "<table style='width:100%; border-collapse:collapse; font-size:11px; margin-top:15px;'>" +
    (tabelAsli ? tabelAsli.innerHTML : "") +
    "</table>";

  elemenUntukPDF.querySelectorAll(".kolom-aksi").forEach(function (el) {
    if (el.parentNode) el.parentNode.removeChild(el);
  });
  elemenUntukPDF.querySelectorAll("th").forEach(function (th) {
    th.style.border = "1px solid #999";
    th.style.padding = "6px";
    th.style.backgroundColor = "#f4f4f4";
    th.style.color = "#000";
  });
  elemenUntukPDF.querySelectorAll("td").forEach(function (td) {
    td.style.border = "1px solid #999";
    td.style.padding = "6px";
  });

  var namaFile = "Laporan_Kasir_" + targetTgl.replace(/\//g, "-") + ".pdf";
  var textFileEl = getEl("nama-file-pdf");
  if (textFileEl) textFileEl.innerText = namaFile;

  opsiPDF = {
    margin: 10,
    filename: namaFile,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };

  if (btn) {
    btn.innerHTML = oriHtml;
    btn.disabled = false;
  }
  var modalPreview = getEl("modal-preview-lapor");
  if (modalPreview) modalPreview.style.display = "flex";
}

function downloadPDFLaporan(ev) {
  var btn = ev ? ev.currentTarget || ev.target : null;
  var oriHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengunduh...';
    btn.disabled = true;
  }

  if (typeof html2pdf === "undefined") {
    alert("Library PDF belum siap. Pastikan koneksi internet aktif lalu muat ulang halaman.");
    if (btn) {
      btn.innerHTML = oriHtml;
      btn.disabled = false;
    }
    return;
  }

  html2pdf()
    .set(opsiPDF)
    .from(elemenUntukPDF)
    .save()
    .then(function () {
      if (btn) {
        btn.innerHTML = oriHtml;
        btn.disabled = false;
      }
    });
}

function bukaWASetelahFoto() {
  var noWA = prompt(
    "Pastikan file PDF sudah diunduh.\n\nMasukkan nomor WA Bos/Bunda (awali 62 atau 08):"
  );
  if (noWA !== null && noWA.trim() !== "") {
    var cleanNo = noWA.replace(/\D/g, "");
    if (cleanNo.startsWith("08")) cleanNo = "62" + cleanNo.slice(1);
    window.open(
      "https://wa.me/" + cleanNo + "?text=" + encodeURIComponent(teksLaporGlobal),
      "_blank"
    );
    tutupModal("modal-preview-lapor");
  }
}

// =========================================================
// FILTER PERIODE & LAPORAN ADMIN (DENGAN SAFEGUARD PENUH)
// =========================================================
function hitungRentangTanggal(jenis) {
  var d = new Date();
  var y = d.getFullYear();
  var m = d.getMonth();
  var dt = d.getDate();
  var f = function (date) {
    return (
      date.getFullYear() +
      "-" +
      ("0" + (date.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + date.getDate()).slice(-2)
    );
  };
  if (jenis === "Hari Ini") {
    tglStart = f(d);
    tglEnd = f(d);
  } else if (jenis === "Kemarin") {
    var yest = new Date(y, m, dt - 1);
    tglStart = f(yest);
    tglEnd = f(yest);
  } else if (jenis === "Minggu Ini") {
    var first = dt - d.getDay() + 1;
    tglStart = f(new Date(y, m, first));
    tglEnd = f(new Date(y, m, first + 6));
  } else if (jenis === "Minggu Lalu") {
    var firstL = dt - d.getDay() + 1 - 7;
    tglStart = f(new Date(y, m, firstL));
    tglEnd = f(new Date(y, m, firstL + 6));
  } else if (jenis === "Bulan Ini") {
    tglStart = f(new Date(y, m, 1));
    tglEnd = f(new Date(y, m + 1, 0));
  } else if (jenis === "Bulan Lalu") {
    tglStart = f(new Date(y, m - 1, 1));
    tglEnd = f(new Date(y, m, 0));
  } else if (jenis === "Tahun Ini") {
    tglStart = f(new Date(y, 0, 1));
    tglEnd = f(new Date(y, 11, 31));
  } else if (jenis === "Tahun Lalu") {
    tglStart = f(new Date(y - 1, 0, 1));
    tglEnd = f(new Date(y - 1, 11, 31));
  }
}

function bukaModalPeriode(modul) {
  currentReportModul = modul;
  var m = getEl("modal-periode");
  if (m) m.style.display = "flex";
}

function pilihPeriode(jenis) {
  periodeAktif = jenis;
  tutupModal("modal-periode");
  hitungRentangTanggal(jenis);
  terapkanPeriodeKeModul(jenis.toUpperCase());
}

function pilihBulanTertentu() {
  var inputBulan = getEl("input-bulan-tertentu");
  var val = inputBulan ? inputBulan.value : "";
  if (!val) {
    alert("Pilih bulan terlebih dahulu!");
    return;
  }
  var parts = val.split("-");
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10) - 1;
  var dateStart = new Date(y, m, 1);
  var dateEnd = new Date(y, m + 1, 0);
  var f = function (date) {
    return (
      date.getFullYear() +
      "-" +
      ("0" + (date.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + date.getDate()).slice(-2)
    );
  };
  tglStart = f(dateStart);
  tglEnd = f(dateEnd);
  var namaBulan = dateStart.toLocaleString("id-ID", { month: "long", year: "numeric" });
  periodeAktif = namaBulan.toUpperCase();
  tutupModal("modal-periode");
  terapkanPeriodeKeModul(periodeAktif);
}

function terapkanPeriodeKeModul(labelStr) {
  if (currentReportModul === "penjualan") {
    if (getEl("label-periode-penjualan")) getEl("label-periode-penjualan").innerText = labelStr;
    if (getEl("label-periode-rincian-penj"))
      getEl("label-periode-rincian-penj").innerText = labelStr;
    tarikDataLaporanPenjualan();
  } else if (currentReportModul === "pengeluaran") {
    if (getEl("label-periode-pengeluaran"))
      getEl("label-periode-pengeluaran").innerText = labelStr;
    if (getEl("label-periode-rincian-peng"))
      getEl("label-periode-rincian-peng").innerText = labelStr;
    tarikDataLaporanPengeluaran();
  } else if (currentReportModul === "piutang") {
    if (getEl("label-periode-piutang")) getEl("label-periode-piutang").innerText = labelStr;
    if (getEl("label-periode-rincian-piutang"))
      getEl("label-periode-rincian-piutang").innerText = labelStr;
    tarikDataLaporanPiutang();
  }
}

function toggleViewMode(mode, modul) {
  if (modul === "penjualan") {
    currentViewModePenj = mode;
    if (getEl("btn-view-table-penj"))
      getEl("btn-view-table-penj").style.background = mode === "table" ? "#ffc107" : "#fff";
    if (getEl("btn-view-chart-penj"))
      getEl("btn-view-chart-penj").style.background = mode === "chart" ? "#ffc107" : "#fff";
    if (getEl("view-table-penj"))
      getEl("view-table-penj").style.display = mode === "table" ? "block" : "none";
    if (getEl("view-chart-penj"))
      getEl("view-chart-penj").style.display = mode === "chart" ? "block" : "none";
    renderRincianPenjualanView();
  } else if (modul === "pengeluaran") {
    currentViewModePeng = mode;
    if (getEl("btn-view-table-peng"))
      getEl("btn-view-table-peng").style.background = mode === "table" ? "#ffc107" : "#fff";
    if (getEl("btn-view-chart-peng"))
      getEl("btn-view-chart-peng").style.background = mode === "chart" ? "#ffc107" : "#fff";
    if (getEl("view-table-peng"))
      getEl("view-table-peng").style.display = mode === "table" ? "block" : "none";
    if (getEl("view-chart-peng"))
      getEl("view-chart-peng").style.display = mode === "chart" ? "block" : "none";
    renderRincianPengeluaranView();
  }
}

// =========================================================
// FITUR CEK HARGA PELANGGAN KHUSUS (HALAMAN DAFTAR)
// =========================================================
function filterChipPelangganKhusus(namaPel) {
  currentFilterPelangganKhusus = namaPel;
  renderHalamanHargaKhusus();
}

function pakaiPelangganKhususDiKasir(namaAsli) {
  var inputPel = getEl("nama-pelanggan");
  if (inputPel) {
    inputPel.value = namaAsli;
    cekHargaPelanggan();
  }
  alert(
    "Pelanggan \"" +
      namaAsli +
      "\" telah dipilih!\nSaat Anda masuk ke Pembayaran Kasir (baik Penjualan Biasa maupun diantar Supir Ngampas), harga barang akan otomatis menyesuaikan harga khusus " +
      namaAsli +
      "."
  );
  bukaHalaman("kasir");
}

function renderHalamanHargaKhusus() {
  var chipContainer = getEl("chip-pelanggan-khusus");
  var listContainer = getEl("area-daftar-harga-khusus");
  if (!chipContainer || !listContainer) return;

  var cariKhususEl = getEl("input-cari-khusus");
  var kw = cariKhususEl ? cariKhususEl.value.toLowerCase().trim() : "";

  var pelMap = {};
  dataHargaKhusus.forEach(function (item) {
    var key = item.pelanggan;
    var label = item.pelangganAsli || item.pelanggan.toUpperCase();
    if (!pelMap[key]) pelMap[key] = label;
  });

  var htmlChips =
    "<div class='chip " +
    (currentFilterPelangganKhusus === "" ? "active" : "") +
    "' onclick='filterChipPelangganKhusus(\"\")'>Semua Pelanggan (" +
    Object.keys(pelMap).length +
    ")</div>";

  Object.keys(pelMap)
    .sort()
    .forEach(function (key) {
      var activeCls = currentFilterPelangganKhusus === key ? "active" : "";
      var safeKey = key.replace(/"/g, "");
      htmlChips +=
        "<div class='chip " +
        activeCls +
        "' onclick='filterChipPelangganKhusus(\"" +
        safeKey +
        "\")'><i class='fas fa-user-tag'></i> " +
        pelMap[key] +
        "</div>";
    });
  chipContainer.innerHTML = htmlChips;

  var filtered = dataHargaKhusus.filter(function (h) {
    var namaBrg = h.namaBarang || "";
    if (!namaBrg) {
      var m = dataMasterProduk.find(function (p) {
        return p.id.toString() === h.idBarang.toString();
      });
      if (m) namaBrg = m.nama;
    }
    var matchChip =
      currentFilterPelangganKhusus === "" ? true : h.pelanggan === currentFilterPelangganKhusus;
    var matchKw =
      kw === ""
        ? true
        : (h.pelanggan || "").includes(kw) ||
          namaBrg.toLowerCase().includes(kw) ||
          h.idBarang.toString().toLowerCase().includes(kw);
    return matchChip && matchKw;
  });

  if (filtered.length === 0) {
    listContainer.innerHTML =
      "<div style='text-align:center; padding:30px; color:#888;'>Tidak ada data harga khusus yang cocok.</div>";
    return;
  }

  var grouped = {};
  filtered.forEach(function (h) {
    if (!grouped[h.pelanggan]) {
      grouped[h.pelanggan] = {
        namaTampil: h.pelangganAsli || h.pelanggan.toUpperCase(),
        items: []
      };
    }
    var m = dataMasterProduk.find(function (p) {
      return p.id.toString() === h.idBarang.toString();
    });
    grouped[h.pelanggan].items.push({
      idBarang: h.idBarang,
      namaBarang: h.namaBarang || (m ? m.nama : h.idBarang),
      hargaNormal: h.hargaNormal || (m ? m.hargaJual : 0),
      hargaKhusus: h.harga
    });
  });

  var html = "";
  Object.keys(grouped).forEach(function (k) {
    var g = grouped[k];
    var safeNama = g.namaTampil.replace(/"/g, "");
    html += "<div class='khusus-group-card'>";
    html += "<div class='khusus-group-header'>";
    html +=
      "<div style='font-size:15px; font-weight:700; color:var(--primary-blue);'><i class='fas fa-user-check'></i> " +
      g.namaTampil +
      " <span style='font-size:12px; color:#666; font-weight:normal;'>(" +
      g.items.length +
      " Barang)</span></div>";
    html +=
      "<button class='btn-aksi btn-bayar-htg' style='padding:7px 12px; font-weight:600;' onclick='pakaiPelangganKhususDiKasir(\"" +
      safeNama +
      "\")'><i class='fas fa-check'></i> Pakai di Kasir</button>";
    html += "</div>";
    html +=
      "<table><thead><tr><th>Nama Barang</th><th style='text-align:right;'>Harga Normal</th><th style='text-align:right;'>Harga Khusus</th></tr></thead><tbody>";

    g.items.forEach(function (it) {
      var hemat = it.hargaNormal > it.hargaKhusus ? it.hargaNormal - it.hargaKhusus : 0;
      html += "<tr>";
      html += "<td><b>" + it.namaBarang + "</b></td>";
      html +=
        "<td style='text-align:right; color:#888; text-decoration:line-through;'>" +
        (it.hargaNormal > 0 ? formatRupiah(it.hargaNormal) : "-") +
        "</td>";
      html +=
        "<td style='text-align:right; color:#15803d; font-weight:700; font-size:14px;'>" +
        formatRupiah(it.hargaKhusus) +
        (hemat > 0
          ? "<br><small style='color:#dc2626; font-weight:500;'>Hemat " +
            formatRupiah(hemat) +
            "</small>"
          : "") +
        "</td>";
      html += "</tr>";
    });

    html += "</tbody></table></div>";
  });

  listContainer.innerHTML = html;
}

// =========================================================
// 1. LAPORAN PENJUALAN & REKAP SEARCH PELANGGAN/NGAMPAS
// =========================================================
function bukaLaporanPenjualan() {
  currentReportModul = "penjualan";
  bukaHalaman("laporan-penjualan");
  if (tglStart === "") hitungRentangTanggal("Bulan Ini");
  tarikDataLaporanPenjualan();
}

function tarikDataLaporanPenjualan() {
  if (getEl("sum-penjualan"))
    getEl("sum-penjualan").innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  callBackend(
    "getLaporanPenjualanLengkap",
    { startDate: tglStart, endDate: tglEnd },
    function (res) {
      if (res && res.status === "sukses") {
        rawLaporanPenjualanData = res.data;
        renderDashboardPenjualan();
        if (hasClassActive("page-rincian-penjualan")) {
          renderRincianPenjualanView();
        }
      }
    }
  );
}

function renderDashboardPenjualan() {
  var d = rawLaporanPenjualanData;
  if (!d) return;

  if (getEl("top-masuk-global"))
    getEl("top-masuk-global").innerText = formatRupiah(d.header.pemasukan);
  if (getEl("top-penjualan-toko"))
    getEl("top-penjualan-toko").innerText = formatRupiah(d.ringkasan.penjualan);
  if (getEl("top-modal-toko"))
    getEl("top-modal-toko").innerText = formatRupiah(d.ringkasan.modal);
  if (getEl("top-neraca-laba"))
    getEl("top-neraca-laba").innerText = formatRupiah(d.ringkasan.laba);

  if (getEl("sum-penjualan"))
    getEl("sum-penjualan").innerText = formatRupiah(d.ringkasan.penjualan);
  if (getEl("sum-laba")) getEl("sum-laba").innerText = formatRupiah(d.ringkasan.laba);
  if (getEl("sum-trx")) getEl("sum-trx").innerText = d.ringkasan.transaksi;
  if (getEl("sum-item")) getEl("sum-item").innerText = d.ringkasan.item;

  var htmlProduk = "";
  (d.produk || []).slice(0, 3).forEach(function (p) {
    htmlProduk +=
      "<div class='lap-list-item'><div><div class='lap-list-title'>" +
      p.nama +
      "</div><div style='font-size:12px; color:#666;'>Terjual: " +
      p.item +
      " Pcs | Keuntungan: " +
      formatRupiah(p.laba) +
      "</div></div><div class='lap-badge'>" +
      formatRupiah(p.penjualan) +
      "</div></div>";
  });
  if (getEl("list-top-produk")) {
    getEl("list-top-produk").innerHTML =
      htmlProduk || "<div style='padding:12px; color:#888; text-align:center;'>Belum ada data</div>";
  }

  var htmlPelanggan = "";
  (d.pelanggan || []).slice(0, 3).forEach(function (p) {
    htmlPelanggan +=
      "<div class='lap-list-item'><div><div class='lap-list-title'>" +
      p.nama +
      "</div><div style='font-size:12px; color:#666;'>Belanja: " +
      p.transaksi +
      "x | Keuntungan: " +
      formatRupiah(p.laba) +
      "</div></div><div class='lap-badge'>" +
      formatRupiah(p.penjualan) +
      "</div></div>";
  });
  if (getEl("list-top-pelanggan")) {
    getEl("list-top-pelanggan").innerHTML =
      htmlPelanggan ||
      "<div style='padding:12px; color:#888; text-align:center;'>Belum ada data</div>";
  }

  cariRekapPemasukan();
}

function resetSearchRekapPemasukan() {
  var inp = getEl("input-search-rekap-pemasukan");
  if (inp) inp.value = "";
  cariRekapPemasukan();
}

function susunFallbackRiwayatGabunganPenjualan() {
  if (!rawLaporanPenjualanData) return [];
  if (
    rawLaporanPenjualanData.riwayat_gabungan &&
    rawLaporanPenjualanData.riwayat_gabungan.length > 0
  ) {
    return rawLaporanPenjualanData.riwayat_gabungan;
  }

  // Fallback cerdas dari riwayatMaster jika backend belum mengirim riwayat_gabungan
  var dS = tglStart ? new Date(tglStart) : new Date(0);
  dS.setHours(0, 0, 0, 0);
  var dE = tglEnd ? new Date(tglEnd) : new Date("2100-01-01");
  dE.setHours(23, 59, 59, 999);

  var hasil = [];
  riwayatMaster.forEach(function (r) {
    var p = (r.tanggal || "").split("/");
    if (p.length !== 3) return;
    var rd = new Date(p[2], p[1] - 1, p[0]);
    if (rd < dS || rd > dE) return;

    if (r.jenis === "Penjualan") {
      hasil.push({
        id: r.id,
        tanggal: r.tanggal,
        sumber: "Penjualan Kasir",
        status: r.status,
        pelanggan: (r.rincian || "").replace("Pelanggan: ", ""),
        rincian: (r.detailBarang || "-").replace(/<br>/g, ", "),
        nominal: r.nominal || 0
      });
    } else if ((r.jenis || "").includes("Pemasukan")) {
      hasil.push({
        id: r.id,
        tanggal: r.tanggal,
        sumber: "Arus Kas",
        status: r.status,
        pelanggan: "Kas Masuk",
        rincian: r.rincian || "-",
        nominal: r.nominal || 0
      });
    }
  });
  return hasil;
}

function cariRekapPemasukan() {
  if (!rawLaporanPenjualanData) return;
  var listGabungan = susunFallbackRiwayatGabunganPenjualan();
  var inputRekap = getEl("input-search-rekap-pemasukan");
  var kw = inputRekap ? inputRekap.value.toLowerCase().trim() : "";

  var filtered = listGabungan.filter(function (r) {
    if (kw === "") return true;
    var gabungTeks = (
      (r.pelanggan || "") +
      " " +
      (r.rincian || "") +
      " " +
      (r.sumber || "") +
      " " +
      (r.tanggal || "") +
      " " +
      (r.id || "")
    ).toLowerCase();
    return gabungTeks.includes(kw);
  });

  var totalDariPenjualan = 0;
  var totalDariArusKas = 0;
  var jmlTrxPenjualan = 0;
  var jmlTrxKas = 0;

  var html =
    "<thead><tr><th>Tanggal</th><th>Sumber Pemasukan</th><th>Pelanggan / Pengantar</th><th>Rincian Barang / Keterangan</th><th style='text-align:right;'>Nominal</th></tr></thead><tbody>";

  if (filtered.length === 0) {
    html +=
      "<tr><td colspan='5' style='text-align:center; padding:20px; color:#888;'>Tidak ditemukan transaksi dengan kata kunci tersebut pada periode ini.</td></tr>";
  } else {
    filtered.forEach(function (r) {
      var isPenjualan = r.sumber === "Penjualan Kasir";
      if (isPenjualan) {
        totalDariPenjualan += r.nominal || 0;
        jmlTrxPenjualan++;
      } else {
        totalDariArusKas += r.nominal || 0;
        jmlTrxKas++;
      }

      var badgeSumber = isPenjualan
        ? "<span class='badge lunas'>Penjualan Kasir</span>"
        : "<span class='badge stok'>Di Luar Penjualan (Arus Kas)</span>";

      html += "<tr>";
      html += "<td>" + r.tanggal + "<br><small style='color:#888;'>" + r.id + "</small></td>";
      html += "<td>" + badgeSumber + "<br><small>" + (r.status || "") + "</small></td>";
      html += "<td><b>" + (r.pelanggan || "-") + "</b></td>";
      html += "<td style='font-size:12px;'>" + (r.rincian || "-") + "</td>";
      html +=
        "<td style='text-align:right; font-weight:700; color:#005A9C;'>" +
        formatRupiah(r.nominal) +
        "</td>";
      html += "</tr>";
    });
  }
  html += "</tbody>";
  var tabelEl = getEl("tabel-rekap-pemasukan");
  if (tabelEl) tabelEl.innerHTML = html;

  var bannerEl = getEl("kotak-hasil-rekap-pemasukan");
  if (bannerEl) {
    if (kw !== "") {
      var grandTotal = totalDariPenjualan + totalDariArusKas;
      bannerEl.style.display = "block";
      bannerEl.innerHTML =
        "<div style='font-size:15px; font-weight:700; margin-bottom:4px;'>📌 Hasil Rekap Pencarian: \"" +
        kw.toUpperCase() +
        "\" (" +
        periodeAktif +
        ")</div>" +
        "<div style='font-size:20px; font-weight:800; color:#15803d; margin-bottom:6px;'>Total Keseluruhan: " +
        formatRupiah(grandTotal) +
        " <span style='font-size:13px; font-weight:600;'>(" +
        filtered.length +
        " Transaksi)</span></div>" +
        "<div style='font-size:13px; border-top:1px dashed #86efac; padding-top:6px;'>" +
        "• Dari <b>Penjualan Kasir / Ngampas</b>: <b>" +
        formatRupiah(totalDariPenjualan) +
        "</b> (" +
        jmlTrxPenjualan +
        " nota)<br>" +
        "• Dari <b>Luar Penjualan / Arus Kas</b>: <b>" +
        formatRupiah(totalDariArusKas) +
        "</b> (" +
        jmlTrxKas +
        " catatan kas)" +
        "</div>";
    } else {
      bannerEl.style.display = "none";
    }
  }
}

function bukaRincianPenjualan(tipe) {
  currentTipeRincianPenj = tipe;
  var filterMet = getEl("filter-metric");
  if (filterMet) filterMet.value = tipe === "ringkasan" ? "tanggal" : "penjualan";

  bukaHalaman("rincian-penjualan");
  if (getEl("header-title")) {
    getEl("header-title").innerText =
      tipe === "ringkasan"
        ? "Rincian Pemasukan"
        : tipe === "produk"
        ? "Produk Terlaris"
        : "Pelanggan Utama";
  }
  renderRincianPenjualanView();
}

function parseTglSort(str) {
  if (!str) return "";
  if (!str.includes("/")) return str.toLowerCase();
  var p = str.split("/");
  return p[2] + p[1] + p[0];
}

function renderRincianPenjualanView() {
  if (!rawLaporanPenjualanData) return;
  var filterMetEl = getEl("filter-metric");
  var metric = filterMetEl && filterMetEl.value ? filterMetEl.value : "tanggal";
  var dataArr = [];

  if (currentTipeRincianPenj === "ringkasan")
    dataArr = (rawLaporanPenjualanData.harian || []).slice();
  else if (currentTipeRincianPenj === "produk")
    dataArr = (rawLaporanPenjualanData.produk || []).slice();
  else if (currentTipeRincianPenj === "pelanggan")
    dataArr = (rawLaporanPenjualanData.pelanggan || []).slice();

  var searchInput = getEl("search-rincian-penjualan");
  if (searchInput && searchInput.value.trim() !== "") {
    var kataKunci = searchInput.value.toLowerCase();
    dataArr = dataArr.filter(function (r) {
      var teksTarget = (r.nama || r.tanggal || "").toLowerCase();
      return teksTarget.includes(kataKunci);
    });
  }

  dataArr.sort(function (a, b) {
    if (metric === "tanggal") {
      var valA = parseTglSort(a.tanggal || a.nama);
      var valB = parseTglSort(b.tanggal || b.nama);
      return valA > valB ? -1 : valA < valB ? 1 : 0;
    } else {
      return (b[metric] || 0) - (a[metric] || 0);
    }
  });

  if (currentViewModePenj === "table") {
    var isUang = metric === "penjualan" || metric === "laba" || metric === "tanggal";
    var thText =
      metric === "tanggal"
        ? "Nominal Pemasukan"
        : metric.charAt(0).toUpperCase() + metric.slice(1);

    var html =
      "<thead><tr><th>Tanggal</th><th>Nama / Rincian</th><th>" +
      thText +
      "</th><th>Laba</th><th>Trx</th><th>Item</th></tr></thead><tbody>";
    var totalMet = 0;
    var totalLaba = 0;
    var totalTrx = 0;
    var totalItem = 0;

    if (dataArr.length === 0) {
      html +=
        "<tr><td colspan='6' style='text-align:center; color:#999; padding:20px;'>Data tidak ditemukan.</td></tr>";
    } else {
      dataArr.forEach(function (r) {
        var nilaiTampil = metric === "tanggal" ? r.penjualan : r[metric];
        var tglFix = r.tanggal ? r.tanggal : "-";
        var namaFix = r.nama ? r.nama : "Semua Transaksi";

        html +=
          "<tr><td>" +
          tglFix +
          "</td><td><b>" +
          namaFix +
          "</b></td><td style='font-weight:600; color:#005A9C;'>" +
          (isUang ? formatRupiah(nilaiTampil) : nilaiTampil) +
          "</td><td style='color:#16a34a;'>" +
          formatRupiah(r.laba || 0) +
          "</td><td>" +
          r.transaksi +
          "</td><td>" +
          (r.item || 0) +
          "</td></tr>";

        totalMet += r.penjualan || 0;
        totalLaba += r.laba || 0;
        totalTrx += r.transaksi || 0;
        totalItem += r.item || 0;
      });
    }

    html +=
      "<tr class='row-total'><td>TOTAL</td><td></td><td>" +
      formatRupiah(totalMet) +
      "</td><td>" +
      formatRupiah(totalLaba) +
      "</td><td>" +
      totalTrx +
      "</td><td>" +
      totalItem +
      "</td></tr></tbody>";
    if (getEl("rincian-table-penj")) getEl("rincian-table-penj").innerHTML = html;
  } else {
    var canvasEl = getEl("rincianCanvasPenj");
    if (!canvasEl) return;
    if (rincianChartPenjObj) rincianChartPenjObj.destroy();
    var ctx = canvasEl.getContext("2d");
    rincianChartPenjObj = new Chart(ctx, {
      type: currentTipeRincianPenj === "ringkasan" ? "line" : "bar",
      data: {
        labels: dataArr
          .map(function (r) {
            return r.tanggal || r.nama;
          })
          .slice(0, 12),
        datasets: [
          {
            label: metric.toUpperCase(),
            data: dataArr
              .map(function (r) {
                return r[metric === "tanggal" ? "penjualan" : metric];
              })
              .slice(0, 12),
            backgroundColor: "#005A9C",
            borderColor: "#005A9C",
            borderWidth: 1,
            tension: 0.3
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

// =========================================================
// 2. LAPORAN STOK
// =========================================================
function bukaLaporanStok() {
  bukaHalaman("laporan-stok");
  if (getEl("stok-nilai-aset"))
    getEl("stok-nilai-aset").innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  tarikDataLaporanStok();
}

function tarikDataLaporanStok() {
  callBackend("getLaporanStokLengkap", {}, function (res) {
    if (res && res.status === "sukses") {
      rawStokData = res.data;
      if (getEl("stok-nilai-aset"))
        getEl("stok-nilai-aset").innerText = formatRupiah(rawStokData.total_nilai_aset);
      if (getEl("stok-total-item"))
        getEl("stok-total-item").innerText = rawStokData.total_item_stok;
      renderDaftarStok();
      renderPergerakanStok();
    }
  });
}

function gantiTabStok(tabId, el) {
  document.querySelectorAll("#page-laporan-stok .stok-tab-btn").forEach(function (b) {
    removeClassSafe(b, "active");
  });
  document.querySelectorAll("#page-laporan-stok .stok-tab-content").forEach(function (c) {
    removeClassSafe(c, "active");
  });
  if (el && el.classList) addClassSafe(el, "active");
  addClassSafe("tab-stok-" + tabId, "active");
}

function renderDaftarStok() {
  if (!rawStokData) return;
  var searchEl = getEl("search-stok");
  var search = searchEl ? searchEl.value.toLowerCase() : "";
  var html =
    "<thead><tr><th>Nama Barang</th><th>Sisa Stok</th><th>Nilai Aset (Modal)</th></tr></thead><tbody>";
  var filtered = (rawStokData.daftar_stok || []).filter(function (s) {
    return (s.nama || "").toLowerCase().includes(search);
  });
  filtered.forEach(function (s) {
    html +=
      "<tr><td><b>" +
      s.nama +
      "</b><br><small style='color:#666;'>Modal: " +
      formatRupiah(s.modal) +
      " | Jual: " +
      formatRupiah(s.jual) +
      "</small></td><td " +
      (s.stok < 10 ? "style='color:#dc2626;font-weight:bold;'" : "") +
      ">" +
      s.stok +
      "</td><td>" +
      formatRupiah(s.aset) +
      "</td></tr>";
  });
  html += "</tbody>";
  if (getEl("tabel-daftar-stok")) getEl("tabel-daftar-stok").innerHTML = html;
}

function renderPergerakanStok() {
  if (!rawStokData) return;
  var searchEl = getEl("search-pergerakan");
  var search = searchEl ? searchEl.value.toLowerCase() : "";
  var html =
    "<thead><tr><th>Tanggal</th><th>Barang & Keterangan</th><th>In/Out</th></tr></thead><tbody>";
  var filtered = (rawStokData.riwayat_pergerakan || []).filter(function (r) {
    return (
      (r.nama || "").toLowerCase().includes(search) ||
      (r.keterangan || "").toLowerCase().includes(search)
    );
  });
  filtered.forEach(function (r) {
    var badge =
      r.jenis === "Masuk"
        ? "<span class='badge-in'>+" + r.qty + "</span>"
        : "<span class='badge-out'>-" + r.qty + "</span>";
    html +=
      "<tr><td>" +
      r.tanggal +
      "</td><td><b>" +
      r.nama +
      "</b><br><small style='color:#666;'>" +
      r.keterangan +
      "</small></td><td>" +
      badge +
      "</td></tr>";
  });
  html += "</tbody>";
  if (getEl("tabel-pergerakan-stok")) getEl("tabel-pergerakan-stok").innerHTML = html;
}

// =========================================================
// 3. LAPORAN PENGELUARAN & RINCIAN KATEGORI
// =========================================================
function bukaLaporanPengeluaran() {
  currentReportModul = "pengeluaran";
  bukaHalaman("laporan-pengeluaran");
  if (tglStart === "") hitungRentangTanggal("Bulan Ini");
  tarikDataLaporanPengeluaran();
}

function tarikDataLaporanPengeluaran() {
  if (getEl("total-pengeluaran-val"))
    getEl("total-pengeluaran-val").innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  callBackend(
    "getLaporanPengeluaranLengkap",
    { startDate: tglStart, endDate: tglEnd },
    function (res) {
      if (res && res.status === "sukses") {
        rawLaporanPengeluaranData = res.data;
        renderDashboardPengeluaran();
        if (hasClassActive("page-rincian-pengeluaran")) {
          renderRincianPengeluaranView();
        }
      }
    }
  );
}

function renderDashboardPengeluaran() {
  var d = rawLaporanPengeluaranData;
  if (!d) return;
  if (getEl("total-pengeluaran-val"))
    getEl("total-pengeluaran-val").innerText = formatRupiah(d.total);
  var htmlKat = "";
  var arrKat = (d.kategori || []).slice(0, 5);
  if (arrKat.length === 0)
    htmlKat =
      "<div style='padding:15px; text-align:center; color:#888;'>Belum ada pengeluaran</div>";
  arrKat.forEach(function (k) {
    htmlKat +=
      "<div class='lap-list-item'><div><div class='lap-list-title'>" +
      k.nama +
      "</div><div style='font-size:12px; color:#666;'>Jumlah Transaksi: " +
      k.transaksi +
      "x</div></div><div class='lap-badge' style='background:#dc3545;'>" +
      formatRupiah(k.nominal) +
      "</div></div>";
  });
  if (getEl("list-top-pengeluaran")) getEl("list-top-pengeluaran").innerHTML = htmlKat;

  cariRekapPengeluaran();
}

function bukaRincianPengeluaran(tipe) {
  currentTipeRincianPeng = tipe || "kategori";
  var selectTipe = getEl("tipe-rincian-peng");
  if (selectTipe) selectTipe.value = currentTipeRincianPeng;

  var labelTipe = getEl("label-tipe-rincian-peng");
  if (labelTipe) {
    labelTipe.innerText =
      currentTipeRincianPeng === "harian"
        ? "Rincian Pengeluaran Harian"
        : currentTipeRincianPeng === "kategori"
        ? "Rincian Per Kategori"
        : "Detail Riwayat Pengeluaran";
  }

  bukaHalaman("rincian-pengeluaran");
  renderRincianPengeluaranView();
}

function resetSearchRekapPengeluaran() {
  var inp = getEl("input-search-rekap-pengeluaran");
  if (inp) inp.value = "";
  cariRekapPengeluaran();
}

function cariRekapPengeluaran() {
  if (!rawLaporanPengeluaranData) return;
  var listRiwayat = rawLaporanPengeluaranData.riwayat || [];
  var inputCari = getEl("input-search-rekap-pengeluaran");
  var kw = inputCari ? inputCari.value.toLowerCase().trim() : "";

  var filtered = listRiwayat.filter(function (r) {
    if (kw === "") return true;
    var gabung = ((r.kategori || "") + " " + (r.keterangan || "") + " " + (r.tanggal || "")).toLowerCase();
    return gabung.includes(kw);
  });

  var totalCari = 0;
  var html =
    "<thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan Pengeluaran</th><th style='text-align:right;'>Nominal</th></tr></thead><tbody>";

  if (filtered.length === 0) {
    html +=
      "<tr><td colspan='4' style='text-align:center; padding:20px; color:#888;'>Tidak ditemukan pengeluaran dengan kata kunci tersebut pada periode ini.</td></tr>";
  } else {
    filtered.forEach(function (r) {
      totalCari += r.nominal || 0;
      html += "<tr>";
      html += "<td>" + r.tanggal + "</td>";
      html += "<td><span class='badge pengeluaran'>" + r.kategori + "</span></td>";
      html += "<td><b>" + (r.keterangan || "-") + "</b></td>";
      html +=
        "<td style='text-align:right; color:#dc2626; font-weight:700;'>" +
        formatRupiah(r.nominal) +
        "</td>";
      html += "</tr>";
    });
  }
  html += "</tbody>";

  var tabelEl = getEl("tabel-rekap-pengeluaran");
  if (tabelEl) tabelEl.innerHTML = html;

  var bannerEl = getEl("kotak-hasil-rekap-pengeluaran");
  if (bannerEl) {
    if (kw !== "") {
      bannerEl.style.display = "block";
      bannerEl.innerHTML =
        "<div style='font-size:15px; font-weight:700; margin-bottom:4px;'>📌 Hasil Rekap Pengeluaran: \"" +
        kw.toUpperCase() +
        "\" (" +
        periodeAktif +
        ")</div>" +
        "<div style='font-size:20px; font-weight:800; color:#b91c1c;'>Total Keluar: " +
        formatRupiah(totalCari) +
        " <span style='font-size:13px; font-weight:600;'>(Dari " +
        filtered.length +
        " kali pengeluaran)</span></div>";
    } else {
      bannerEl.style.display = "none";
    }
  }
}

function ubahTipeRincianPengDropdown() {
  var selectTipe = getEl("tipe-rincian-peng");
  if (!selectTipe) return;
  currentTipeRincianPeng = selectTipe.value;

  var labelTipe = getEl("label-tipe-rincian-peng");
  if (labelTipe) {
    labelTipe.innerText =
      currentTipeRincianPeng === "harian"
        ? "Rincian Pengeluaran Harian"
        : currentTipeRincianPeng === "kategori"
        ? "Rincian Per Kategori"
        : "Detail Riwayat Pengeluaran";
  }
  renderRincianPengeluaranView();
}

function renderRincianPengeluaranView() {
  if (!rawLaporanPengeluaranData) return;
  var selectTipe = getEl("tipe-rincian-peng");
  var tipe = selectTipe ? selectTipe.value : currentTipeRincianPeng;
  var filterMetEl = getEl("filter-metric-peng");
  var metric = filterMetEl && filterMetEl.value ? filterMetEl.value : "tanggal";
  var dataArr = [];

  if (tipe === "harian") dataArr = (rawLaporanPengeluaranData.harian || []).slice();
  else if (tipe === "kategori") dataArr = (rawLaporanPengeluaranData.kategori || []).slice();
  else if (tipe === "riwayat") dataArr = (rawLaporanPengeluaranData.riwayat || []).slice();

  dataArr.sort(function (a, b) {
    if (metric === "tanggal") {
      var valA = parseTglSort(a.tanggal || a.nama);
      var valB = parseTglSort(b.tanggal || b.nama);
      return valA > valB ? -1 : valA < valB ? 1 : 0;
    } else {
      return (b[metric] || 0) - (a[metric] || 0);
    }
  });

  if (currentViewModePeng === "table") {
    var html = "";
    var totalNom = 0;
    var totalTrx = 0;
    if (tipe === "riwayat") {
      html =
        "<thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan Detail</th><th>Nominal</th></tr></thead><tbody>";
      dataArr.forEach(function (r) {
        html +=
          "<tr><td>" +
          r.tanggal +
          "</td><td><span class='badge pengeluaran'>" +
          r.kategori +
          "</span></td><td>" +
          (r.keterangan || "-") +
          "</td><td style='color:#ef4444; font-weight:bold;'>" +
          formatRupiah(r.nominal) +
          "</td></tr>";
        totalNom += r.nominal || 0;
      });
      html +=
        "<tr class='row-total'><td colspan='3' style='text-align:right;'>TOTAL PENGELUARAN</td><td style='color:#ef4444;'>" +
        formatRupiah(totalNom) +
        "</td></tr></tbody>";
    } else {
      html =
        "<thead><tr><th>Tanggal</th><th>Nama Kategori</th><th>Total Biaya</th><th style='text-align:center;'>Trx</th></tr></thead><tbody>";
      dataArr.forEach(function (r) {
        var tglFix = r.tanggal ? r.tanggal : "-";
        var namaFix = r.nama ? r.nama : "Semua Kategori";
        html +=
          "<tr><td>" +
          tglFix +
          "</td><td><b>" +
          namaFix +
          "</b></td><td style='color:#ef4444; font-weight:bold;'>" +
          formatRupiah(r.nominal) +
          "</td><td style='text-align:center;'>" +
          r.transaksi +
          "</td></tr>";
        totalNom += r.nominal || 0;
        totalTrx += r.transaksi || 0;
      });
      html +=
        "<tr class='row-total'><td>TOTAL KESELURUHAN</td><td></td><td style='color:#ef4444;'>" +
        formatRupiah(totalNom) +
        "</td><td style='text-align:center;'>" +
        totalTrx +
        "</td></tr></tbody>";
    }
    if (getEl("rincian-table-peng")) getEl("rincian-table-peng").innerHTML = html;
  } else {
    var canvasEl = getEl("rincianCanvasPeng");
    if (!canvasEl) return;
    if (rincianChartPengObj) rincianChartPengObj.destroy();
    var ctx = canvasEl.getContext("2d");
    rincianChartPengObj = new Chart(ctx, {
      type: tipe === "harian" ? "line" : "bar",
      data: {
        labels: dataArr
          .map(function (r) {
            return r.tanggal || r.nama;
          })
          .slice(0, 15),
        datasets: [
          {
            label: "Pengeluaran (Rp)",
            data: dataArr
              .map(function (r) {
                return r.nominal;
              })
              .slice(0, 15),
            backgroundColor: "#ef4444",
            borderColor: "#b91c1c",
            borderWidth: 1,
            tension: 0.3
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

// =========================================================
// 4. LAPORAN PIUTANG ADMIN
// =========================================================
function bukaLaporanPiutang() {
  currentReportModul = "piutang";
  bukaHalaman("laporan-piutang");
  if (tglStart === "") hitungRentangTanggal("Bulan Ini");
  tarikDataLaporanPiutang();
}

function tarikDataLaporanPiutang() {
  if (getEl("piutang-global-val"))
    getEl("piutang-global-val").innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  callBackend(
    "getLaporanPiutangLengkap",
    { startDate: tglStart, endDate: tglEnd },
    function (res) {
      if (res && res.status === "sukses") {
        rawLaporanPiutangData = res.data;
        renderDashboardPiutang();
        if (hasClassActive("page-rincian-piutang")) {
          renderRincianPiutangView();
        }
      }
    }
  );
}

function renderDashboardPiutang() {
  var d = rawLaporanPiutangData;
  if (!d) return;
  if (getEl("piutang-global-val")) getEl("piutang-global-val").innerText = formatRupiah(d.global);
  if (getEl("piutang-baru-val")) getEl("piutang-baru-val").innerText = "+ " + formatRupiah(d.baru);
  if (getEl("piutang-bayar-val"))
    getEl("piutang-bayar-val").innerText = "- " + formatRupiah(d.bayar);

  var htmlTop = "";
  var topArr = (d.pelanggan || []).slice(0, 5);
  if (topArr.length === 0)
    htmlTop =
      "<div style='padding:15px; text-align:center; color:#888;'>Tidak ada pelanggan berhutang.</div>";
  topArr.forEach(function (p) {
    htmlTop +=
      "<div class='lap-list-item'><div><div class='lap-list-title'>" +
      p.nama +
      "</div><div style='font-size:12px; color:#666;'>Nota Aktif: " +
      p.trx +
      "</div></div><div class='lap-badge' style='background:#dc3545;'>" +
      formatRupiah(p.nominal) +
      "</div></div>";
  });
  if (getEl("list-top-piutang")) getEl("list-top-piutang").innerHTML = htmlTop;
}

function bukaRincianPiutang(tab) {
  currentReportModul = "piutang";
  bukaHalaman("rincian-piutang");
  var tabBtns = document.querySelectorAll("#page-rincian-piutang .stok-tab-btn");
  gantiTabRincianPiutang(tab, tabBtns[0]);
}

function gantiTabRincianPiutang(tabId, el) {
  currentTabPiutang = tabId;
  document.querySelectorAll("#page-rincian-piutang .stok-tab-btn").forEach(function (b) {
    removeClassSafe(b, "active");
  });
  if (el && el.classList) addClassSafe(el, "active");
  renderRincianPiutangView();
}

function renderRincianPiutangView() {
  if (!rawLaporanPiutangData) return;
  var html = "";
  if (currentTabPiutang === "pelanggan") {
    html =
      "<thead><tr><th>Nama Pelanggan</th><th>Nota Nunggak</th><th>Sisa Hutang</th></tr></thead><tbody>";
    (rawLaporanPiutangData.pelanggan || []).forEach(function (p) {
      html +=
        "<tr><td><b>" +
        p.nama +
        "</b></td><td>" +
        p.trx +
        "</td><td style='color:#dc3545; font-weight:bold;'>" +
        formatRupiah(p.nominal) +
        "</td></tr>";
    });
    html += "</tbody>";
  } else if (currentTabPiutang === "baru") {
    html =
      "<thead><tr><th>Tanggal</th><th>ID Nota</th><th>Pelanggan</th><th>Sisa Hutang</th></tr></thead><tbody>";
    (rawLaporanPiutangData.riwayat_baru || []).forEach(function (r) {
      html +=
        "<tr><td>" +
        r.tanggal +
        "</td><td><small>" +
        r.id +
        "</small></td><td>" +
        r.pelanggan +
        "</td><td style='color:#dc3545; font-weight:bold;'>" +
        formatRupiah(r.nominal) +
        "</td></tr>";
    });
    html += "</tbody>";
  } else if (currentTabPiutang === "bayar") {
    html =
      "<thead><tr><th>Tanggal</th><th>ID Kas</th><th>Keterangan</th><th>Dibayar</th></tr></thead><tbody>";
    (rawLaporanPiutangData.riwayat_bayar || []).forEach(function (r) {
      html +=
        "<tr><td>" +
        r.tanggal +
        "</td><td><small>" +
        r.id +
        "</small></td><td>" +
        r.keterangan +
        "</td><td style='color:#25D366; font-weight:bold;'>+ " +
        formatRupiah(r.nominal) +
        "</td></tr>";
    });
    html += "</tbody>";
  }
  if (getEl("rincian-table-piutang")) getEl("rincian-table-piutang").innerHTML = html;
}

// =========================================================
// 5. LAPORAN TRANSAKSI / MUTASI KAS
// =========================================================
function bukaLaporanTransaksi() {
  bukaHalaman("laporan-transaksi");
  var today = new Date().toISOString().split("T")[0];
  var tglMulai = getEl("tgl-mulai-mutasi");
  var tglAkhir = getEl("tgl-akhir-mutasi");
  if (tglMulai && !tglMulai.value) {
    tglMulai.value = today;
    if (tglAkhir) tglAkhir.value = today;
  }
}

function loadLaporanTransaksi(ev) {
  var btn = ev ? ev.currentTarget || ev.target : null;
  var originalText = btn ? btn.innerHTML : "Tampilkan";
  if (btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat...';
    btn.disabled = true;
  }

  var start = getEl("tgl-mulai-mutasi") ? getEl("tgl-mulai-mutasi").value : "";
  var end = getEl("tgl-akhir-mutasi") ? getEl("tgl-akhir-mutasi").value : "";

  callBackend("getDashboardData", {}, function (res) {
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
    if (res && res.status === "sukses") {
      var html = "";
      var tM = 0;
      var tK = 0;
      var tS = 0;
      var dS = start ? new Date(start) : new Date(0);
      dS.setHours(0, 0, 0, 0);
      var dE = end ? new Date(end) : new Date("2100-01-01");
      dE.setHours(23, 59, 59, 999);

      (res.riwayat || []).forEach(function (r) {
        var p = (r.tanggal || "").split("/");
        var rd = new Date(p[2], p[1] - 1, p[0]);
        if (rd >= dS && rd <= dE) {
          var isM =
            ((r.jenis || "").indexOf("Penjualan") > -1 && r.status === "Lunas") ||
            (r.jenis || "").indexOf("Pemasukan") > -1;
          var isK =
            (r.jenis || "").indexOf("Arus Kas (Pengeluaran)") > -1 ||
            r.jenis === "Pengeluaran";
          if (isM || isK) {
            if (isM) tM += r.nominal || 0;
            if (isK) {
              if ((r.rincian || "").toLowerCase().indexOf("setoran") > -1) tS += r.nominal || 0;
              else if ((r.rincian || "").toLowerCase().indexOf("tutup kas") === -1)
                tK += r.nominal || 0;
            }
            html +=
              "<tr><td>" +
              r.tanggal +
              "</td><td><b>" +
              r.jenis +
              "</b><br><small>" +
              r.rincian +
              "</small></td><td style='text-align:right; font-weight:bold;'>" +
              formatRupiah(r.nominal) +
              "</td></tr>";
          }
        }
      });

      if (getEl("body-mutasi-laporan")) {
        getEl("body-mutasi-laporan").innerHTML =
          html || "<tr><td colspan='3' style='text-align:center;'>Tidak ada data</td></tr>";
      }
      if (getEl("mutasi-masuk")) getEl("mutasi-masuk").innerText = formatRupiah(tM);
      if (getEl("mutasi-keluar")) getEl("mutasi-keluar").innerText = formatRupiah(tK);
      if (getEl("mutasi-setoran")) getEl("mutasi-setoran").innerText = formatRupiah(tS);
      if (getEl("mutasi-saldo")) getEl("mutasi-saldo").innerText = formatRupiah(tM - tK - tS);
    }
  });
}

// =========================================================
// MONITORING & PENYELESAIAN NGAMPAS / KANVAS
// =========================================================
function loadDataNgampas() {
  var body = getEl("body-daftar-ngampas");
  if (!body) return;
  body.innerHTML =
    '<tr><td colspan="3" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Mencari data supir...</td></tr>';

  callBackend(
    "getDaftarNgampasTerintegrasi",
    {},
    function (res) {
      if (res && res.status === "sukses") {
        var html = "";
        if (res.data && res.data.length > 0) {
          res.data.forEach(function (r) {
            var supirSafe = (r.supir || "").replace(/"/g, "");
            html +=
              "<tr><td>" +
              r.tanggal +
              "</td><td><b>" +
              r.supir +
              "</b><br><small style='color:#0284c7;'>" +
              r.bawaan +
              "</small></td><td style='text-align:center;'><button class='btn-aksi btn-bayar-htg' style='padding:8px 14px;' onclick='bukaModalReturNgampas(\"" +
              r.id +
              "\", \"" +
              supirSafe +
              "\")'>Proses</button></td></tr>";
          });
          body.innerHTML = html;
        } else {
          body.innerHTML =
            "<tr><td colspan='3' style='text-align:center; padding:20px; color:#999;'>Tidak ada supir Ngampas yang sedang jalan.</td></tr>";
        }
      } else {
        body.innerHTML =
          "<tr><td colspan='3' style='text-align:center; color:red; padding:20px;'><b>Gagal:</b> " +
          (res ? res.pesan : "Error") +
          "</td></tr>";
      }
    },
    function (err) {
      body.innerHTML =
        "<tr><td colspan='3' style='text-align:center; color:red; padding:20px;'><b>Error Sistem:</b> " +
        err.message +
        "</td></tr>";
    }
  );
}

function bukaModalReturNgampas(idTrx, namaSupir) {
  currentNgampasId = idTrx;
  if (getEl("label-supir-ngampas"))
    getEl("label-supir-ngampas").innerText = "Supir: " + namaSupir;
  if (getEl("body-retur-ngampas")) {
    getEl("body-retur-ngampas").innerHTML =
      "<tr><td colspan='3' style='text-align:center;'>Memuat barang bawaan...</td></tr>";
  }
  if (getEl("modal-retur-ngampas")) getEl("modal-retur-ngampas").style.display = "flex";

  callBackend("getDetailTransaksi", { idTrx: idTrx }, function (res) {
    if (res && res.status === "sukses") {
      currentNgampasItems = res.detail || [];
      var html = "";
      currentNgampasItems.forEach(function (item, index) {
        html +=
          "<tr><td><b>" +
          item.nama +
          "</b><br><small>" +
          formatRupiah(item.harga) +
          "</small></td><td style='text-align:center; font-weight:bold;'>" +
          item.qty +
          "</td><td style='text-align:center;'><input type='number' id='retur-qty-" +
          index +
          "' min='0' max='" +
          item.qty +
          "' value='0' style='width:65px; padding:6px; text-align:center; border:1px solid #cbd5e1; border-radius:6px;' oninput='hitungEstimasiNgampas()' onchange='hitungEstimasiNgampas()'></td></tr>";
      });
      if (getEl("body-retur-ngampas")) getEl("body-retur-ngampas").innerHTML = html;
      hitungEstimasiNgampas();
    }
  });
}

function hitungEstimasiNgampas() {
  calculatedTotalNgampas = 0;
  currentNgampasItems.forEach(function (item, index) {
    var retInput = getEl("retur-qty-" + index);
    var ret = retInput ? parseInt(retInput.value, 10) || 0 : 0;
    if (ret < 0) ret = 0;
    if (ret > item.qty) {
      ret = item.qty;
      if (retInput) retInput.value = item.qty;
    }
    calculatedTotalNgampas += (item.qty - ret) * item.harga;
  });
  if (getEl("estimasi-setoran-ngampas"))
    getEl("estimasi-setoran-ngampas").innerText = formatRupiah(calculatedTotalNgampas);

  var inputAktual = getEl("input-setoran-aktual");
  if (inputAktual) {
    inputAktual.value = new Intl.NumberFormat("id-ID").format(calculatedTotalNgampas);
  }
  hitungDiskonNgampas();
}

function hitungDiskonNgampas() {
  var aktual = getAngka("input-setoran-aktual");
  var diskon = calculatedTotalNgampas - aktual;
  var info = getEl("info-diskon-ngampas");
  var angkaEl = getEl("angka-diskon-ngampas");
  if (!info) return;

  if (diskon > 0) {
    info.style.display = "block";
    if (angkaEl) angkaEl.innerText = formatRupiah(diskon);
  } else {
    info.style.display = "none";
  }
}

function simpanReturNgampas(ev) {
  var dataRetur = [];
  currentNgampasItems.forEach(function (item, index) {
    var retInput = getEl("retur-qty-" + index);
    var ret = retInput ? parseInt(retInput.value, 10) || 0 : 0;
    if (ret > 0) dataRetur.push({ idBarang: item.id, qtyRetur: ret });
  });

  var aktual = getAngka("input-setoran-aktual");
  var diskon = calculatedTotalNgampas - aktual;
  if (diskon < 0) diskon = 0;
  var metodeSetoran = getEl("metode-setoran-ngampas")
    ? getEl("metode-setoran-ngampas").value
    : "Tunai";

  var btn = getEl("btn-simpan-retur-ngampas");
  var oriHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses Pelunasan...';
  }

  callBackend(
    "selesaikanNgampasTerintegrasi",
    {
      idTrx: currentNgampasId,
      dataRetur: dataRetur,
      setoranAktual: aktual,
      diskonMurni: diskon,
      metodeSetoran: metodeSetoran
    },
    function (res) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = oriHtml;
      }
      if (res && res.status === "sukses") {
        tutupModal("modal-retur-ngampas");

        // Optimistic UI: Kembalikan stok barang retur di memori lokal & catat setoran di riwayatMaster
        dataRetur.forEach(function (retObj) {
          var prod = dataMasterProduk.find(function (p) {
            return p.id.toString() === retObj.idBarang.toString();
          });
          if (prod) {
            prod.stok = (parseInt(prod.stok, 10) || 0) + retObj.qtyRetur;
          }
        });
        riwayatMaster.forEach(function (r) {
          if (r.id === currentNgampasId) {
            r.status = "Lunas";
            r.nominal = aktual;
          }
        });
        renderAlertStokLokal();
        refreshTampilanRiwayatAktif();

        alert(
          "Pelunasan Ngampas Berhasil!\nSetoran Aktual " +
            formatRupiah(aktual) +
            " (" +
            metodeSetoran +
            ") telah dicatat ke sistem."
        );
        loadDataNgampas();
        tarikDataProduk();
        tarikDataDashboard(true);
      } else {
        alert("Gagal: " + (res ? res.pesan : "Error"));
      }
    },
    function (err) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = oriHtml;
      }
      alert("Error: " + err.message);
    }
  );
}

// =========================================================
// TUTUP KAS MANUAL & MASA LALU
// =========================================================
function jalankanTutupKasManual() {
  var pesan =
    "TUTUP KAS SEKARANG?\n\nSisa uang di laci hari ini akan di-nol-kan dan dipindahkan menjadi Saldo Pindahan besok pagi.\n\nLanjutkan?";
  if (!confirm(pesan)) return;

  var btn = getEl("btn-tutup-kas");
  var oriHtml = "";
  if (btn) {
    oriHtml = btn.innerHTML;
    btn.innerHTML = "Memproses...";
    btn.disabled = true;
  }

  callBackend("tutupKasManualSistem", {}, function (res) {
    if (btn) {
      btn.innerHTML = oriHtml;
      btn.disabled = false;
    }
    alert((res && res.pesan) || "Selesai");
    if (res && res.status === "sukses") {
      tarikDataDashboard();
    }
  });
}

function jalankanTutupKasMasaLalu() {
  var tglInputEl = getEl("riwayat-start");
  var tglInput = tglInputEl ? tglInputEl.value : "";
  if (!tglInput) {
    alert("Pilih tanggal terlebih dahulu pada kotak kalender paling kiri!");
    return;
  }

  var tglFormat = konversiTanggalInputKeStr(tglInput);

  if (
    !confirm(
      "TUTUP KAS MASA LALU?\n\nSistem akan menghitung sisa laci pada tanggal " +
        tglFormat +
        " dan memindahkannya ke hari berikutnya.\n\nLanjutkan?"
    )
  )
    return;

  callBackend("tutupKasMasaLaluSistem", { tanggalStr: tglFormat }, function (res) {
    alert((res && res.pesan) || "Selesai");
    if (res && res.status === "sukses") {
      tarikDataDashboard();
    }
  });
}