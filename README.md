# MOVARA Virtual Lab

Website statis (HTML, CSS, JS) tanpa proses build. Semua file deteksi gerak (MediaPipe Pose & Hands) sudah ada di folder `lib/`, jadi web tidak bergantung pada server lain.

## Cara deploy (pilih salah satu)

**A. Netlify Drop (paling cepat, sekitar 2 menit)**
1. Buka https://app.netlify.com/drop dan login atau daftar gratis.
2. Ekstrak zip, lalu seret **folder `movara-site`** ke halaman tersebut.
3. Link `https://<nama>.netlify.app` langsung jadi. Nama situs bisa diubah di *Site configuration → Change site name*, misalnya `movara-lab`.

**B. Vercel (seperti VIREXA)**
1. Buat repository baru di GitHub, misalnya `movara`, lalu unggah semua isi folder `movara-site` lewat *Add file → Upload files*.
2. Di https://vercel.com pilih *Add New → Project → Import* repository tersebut.
3. Framework Preset: **Other**. Build Command dan Output Directory dikosongkan. Lalu klik Deploy.

**C. GitHub Pages**
Unggah isi folder ke repository, lalu buka *Settings → Pages → Branch: main / root*.

> Kamera hanya jalan di link **https** (ketiga cara di atas otomatis https) atau di `localhost`. Membuka `index.html` langsung dengan klik dua kali tidak akan bisa memakai kamera.

## Mencoba di laptop sendiri
Buka terminal di folder ini, jalankan `python -m http.server 8000`, lalu buka http://localhost:8000.

## Tautan langsung ke modul (mode mouse, untuk demo)
`/#m1a` Modul 1 · `/#m2a` Modul 2 · `/#m3a` Modul 3 · `/#reflect` Refleksi

## Lisensi pihak ketiga
MediaPipe © Google, Apache License 2.0.
