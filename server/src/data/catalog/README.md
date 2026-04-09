# Food Catalog

Bu klasorde dogrulanmis food katalog dosyalari tutulur.

Beklenen varsayilan dosya:
- `foods.usda.json`

Format:
```json
{
  "source": "USDA FoodData Central",
  "generatedAt": "2026-04-09T00:00:00.000Z",
  "itemCount": 500,
  "items": [
    {
      "id": "chicken",
      "name": "Chicken, broilers or fryers, breast, meat only, raw",
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
Dosya yoksa mevcut dahili fallback seed devreye girer.
