# Meal Forge MVP

Meal Forge, secilen malzemelere ve kalori hedefine gore otomatik ogun ureten moduler bir meal planner + macro tracker uygulamasidir.

## Stack

- Frontend: React + Vite + Tailwind
- Backend: Node.js + Express
- Veri: PostgreSQL (DATABASE_URL varsa) / fallback memory mode

## Ozellikler

- Kullanici profili (kilo, boy, hedef, kalori modu)
- Malzeme secimi (protein/carb/fat)
- Plan olusturma (ogun bazli makro dengesi)
- Gunluk hedef vs gerceklesen makro takibi
- Swap sistemi (meal icindeki protein/carb/fat degistirme)

## Kurulum

1. `npm install`
2. `npm run dev`

- Web: http://localhost:5173
- API: http://localhost:4000

Not: Frontend API cagrilari varsayilan olarak `/api` uzerinden gider. Lokal gelistirmede Vite proxy bunu `http://localhost:4000` adresine yonlendirir.

## Railway Deploy

1. Repoyu Railway'e bagla (GitHub repo -> New Project).
2. Root dizin bu proje klasoru olsun.
3. Railway otomatik olarak `railway.json` dosyasini kullanir.
4. Deploy sonunda tek URL uzerinden hem UI hem API calisir.

Kalici veri icin:

1. Railway projesine PostgreSQL ekle (Add Service -> Database -> PostgreSQL).
2. Backend servisine `DATABASE_URL` degiskenini bagla.
3. Uygulama acilista `foods` tablosunu otomatik olusturur ve tablo bossa seed verileri ekler.

Varsayilan komutlar:

- Build: `npm install && npm run build`
- Start: `npm run start`

Ortam degiskenleri:

- `PORT` Railway tarafindan otomatik verilir.
- `VITE_API_URL` tanimlaman gerekmez (same-origin `/api` kullaniyor).
- `DATABASE_URL` verilirse malzeme verisi PostgreSQL'e kalici yazilir.

Kontrol:

- `https://<senin-domain>/api/health` -> `{ "ok": true }`

## API

- `GET /api/health`
- `GET /api/foods`
- `POST /api/foods`
- `DELETE /api/foods/:foodId`
- `POST /api/generate`
- `POST /api/swap`

## Not

`DATABASE_URL` yoksa uygulama memory mode'da calisir ve restartta malzeme verileri sifirlanir. `DATABASE_URL` varsa malzeme CRUD islemleri PostgreSQL'e kalici yazilir.
