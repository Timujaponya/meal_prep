# Food Catalog

Bu klasorde dogrulanmis food katalog dosyalari tutulur.

Beklenen varsayilan dosyalar:
- `foods.curated.json` (server seed icin varsayilan)
- `foods.curated.csv` (kaynak tablo referansi)

Format:
```json
{
  "source": "Verified unified food dataset",
  "generatedAt": "2026-04-09T00:00:00.000Z",
  "itemCount": 15,
  "items": [
    {
      "id": "chicken",
      "name": "Chicken breast (raw)",
      "type": "protein",
      "protein": 23.2,
      "carb": 0,
      "fat": 2.6,
      "calories": 120,
      "defaultPortion": 120
    }
  ]
}
```

Sunucu acilisinda `FOOD_CATALOG_PATH` varsa bu dosyayi seed olarak kullanir.
`FOOD_CATALOG_PATH` yoksa varsayilan olarak `foods.curated.json` yuklenir.
Curated dosya yoksa mevcut dahili fallback seed devreye girer.
