# FisikaSeru Monorepo

FisikaSeru menyediakan laboratorium eksperimen fisika berbasis data dengan pipeline ilmiah lengkap.

## Struktur Utama

```
/platform
  /client     # React platform (Home, Lab Hub, Detail, Dashboard)
  /server     # Express OAuth + API history + PDF
  /auth       # Dokumentasi autentikasi
  /database   # Dokumentasi skema Mongo

/labs/simulations
  /modern/milikan        # Implementasi lengkap stage 0-4 + post-test
  /classical/projectile  # Placeholder serius
  /classical/shm         # Placeholder serius
  /waves/optics          # Placeholder serius
  /em/rlc                # Placeholder serius
  /thermo/ideal-gas      # Placeholder serius
  /modern/photoelectric  # Placeholder serius

/core                    # Sumber tunggal persamaan fisika
/public/js/core          # Export physics-core + data analysis
```

## Menjalankan Aplikasi

1) Install dependencies root:
```bash
npm install
```

2) Install dependencies platform server & client:
```bash
cd platform/server && npm install
cd ../client && npm install
```

3) Jalankan lab statis (offline-friendly):
```bash
npm run dev:labs
```

4) Jalankan platform server:
```bash
npm run dev:platform:server
```

5) Jalankan platform client:
```bash
npm run dev:platform:client
```

## Environment Variables (Platform Server)

```
PLATFORM_PORT=4000
CLIENT_URL=http://localhost:5173
JWT_SECRET=CHANGE_ME
MONGO_URL=mongodb://localhost:27017/fisikaseru

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=http://localhost:4000/auth/github/callback
```

## Catatan

- Semua persamaan fisika berada di folder `core/`.
- Simulasi menggunakan `public/js/core/physics-core.js` sebagai satu-satunya entrypoint fisika.
- PDF ekspor membutuhkan login dan menggunakan LaTeX (tectonic/latexmk).
