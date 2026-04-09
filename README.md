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
- Plan ciktisindan otomatik shopping list olusturma
- Checkout analizi (kalori/makro/ingredient geri bildirimi)
- Gun bazli meal kaydi ve gecmis gun takipleri
- Gunluk su takibi

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

Startup seed modlari:

- `FOOD_SEED_MODE=insert-missing` (varsayilan): sadece eksik katalog id'leri ekler.
- `FOOD_SEED_MODE=full-sync`: katalogu upsert eder; `FOODS_PRUNE_UNKNOWN=true` ise katalog disi id'leri de siler.

Railway'de tam senkron istenirse Start komutu ornegi:

- `npm run seed:foods -w server && npm run start -w server`

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
- `POST /api/shopping-list`
- `POST /api/checkout`
- `GET /api/day-log?date=YYYY-MM-DD&targetMl=2800`
- `POST /api/water`
- `GET /api/water?date=YYYY-MM-DD&targetMl=2800`

### Shopping List Endpoint

Mevcut plan ciktisindan market listesi olusturur, tip bazinda gruplayip toplam gram/makro degerlerini verir.

Ornek istek:

```json
{
	"plan": {
		"meals": [
			{
				"id": "meal_1",
				"items": [
					{ "id": "chicken", "name": "Tavuk Gogus", "type": "protein", "grams": 140, "macros": { "protein": 43.4, "carb": 0, "fat": 5, "calories": 231 } },
					{ "id": "rice", "name": "Pirinc", "type": "carb", "grams": 180, "macros": { "protein": 4.9, "carb": 50.4, "fat": 0.5, "calories": 234 } }
				]
			}
		]
	},
	"dayCount": 3,
	"roundTo": 5,
	"excludeFoodIds": ["olive_oil"]
}
```

Ornek cevap alanlari:

- `summary`: ogun sayisi, gun sayisi, benzersiz urun sayisi
- `totals`: toplam gram ve makrolar
- `grouped`: protein/carb/fat bazli listeler
- `items`: tek bir duz listede tum urunler
- `checklistText`: kopyalanabilir markdown checklist

### Checkout Analysis Endpoint

`POST /api/checkout` cart'taki meal'leri analiz eder ve ayni anda secilen gun icin meal log kaydi olusturur.

Beklenen body alanlari:

- `cartItems`: `{ id, title, qty, calories, protein, carb, fat, ingredientIds }[]`
- `selectedFoodIds`: secili ingredient id listesi
- `profile`: hedef hesaplamasi icin profil bilgisi
- `date`: `YYYY-MM-DD` (opsiyonel, verilmezse bugun)

Cevapta:

- `analysis`: score, hedef-fark tablosu, feedback maddeleri
- `dayLog`: checkout sonrasi ilgili gunun meal + water ozeti

### Gunluk Log Endpoint

`GET /api/day-log` belirli bir tarih icin meal kayitlarini ve su durumunu dondurur.

### Water Tracking Endpoint

`POST /api/water` body: `{ date, amountMl, targetMl }`

Gonderilen suyu gunluk loga ekler ve guncel toplam/target/progress degerini dondurur.

## Not

`DATABASE_URL` yoksa uygulama memory mode'da calisir ve restartta malzeme verileri sifirlanir. `DATABASE_URL` varsa malzeme CRUD islemleri PostgreSQL'e kalici yazilir.
