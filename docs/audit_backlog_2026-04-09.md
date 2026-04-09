# Meal Prep Audit Backlog (2026-04-09)

Bu dokuman, kod denetimi sonucunda tespit edilen arizalari uygulanabilir backlog formatina cevirir.

## Hedef
- Uygulamayi guvenlik, veri dogrulugu ve UX dayanikliligi acisindan uretim seviyesine getirmek.

## Kapsam
- Frontend: auth, planner, recipes, inventory, dashboard
- Backend: auth, plan, tracker, foods, inventory
- Operasyon: startup, seed, deploy

## Oncelik Seviyeleri
- P0: Uretim riski cok yuksek, hemen yapilmali
- P1: Yuksek etki, sonraki sprintte tamamlanmali
- P2: Orta etki, planli iyilestirme

---

## P0 Ticketlari

### BG-001 - Password Hashing ve Kimlik Guvenligi
Durum: Acik
Oncelik: P0

Problem:
- Sifreler duz metin saklaniyor ve duz metin karsilastiriliyor.

Etkisi:
- Veritabani sizintisinda tum hesaplar risk altinda.

Cozum:
- Argon2 veya bcrypt ile hash saklama.
- Register akisinda hashleme, login akisinda verify.
- Minimum sifre politikasi (uzunluk + karma kurali) uygulama.

Kabul Kriterleri:
1. DB de password kolonunda sadece hash deger var.
2. Duz metin sifre ile DB satirinda birebir eslesme yok.
3. Login dogru sifrede basarili, yanlis sifrede 401 doner.
4. Eski duz metin kullanicilar icin migration veya tek seferlik reset plani vardir.

Test Senaryolari:
1. Register -> DB password hash formatinda olmalı.
2. Login basarili/hatali senaryolari API testinden gecmeli.
3. SQL dump incelemesinde duz metin sifre bulunmamali.

---

### BG-002 - AUTH_SECRET Zorunlulugu ve Token Guvenligi
Durum: Acik
Oncelik: P0

Problem:
- AUTH_SECRET fallback sabit degerle calisiyor.

Etkisi:
- Uretimde yanlis konfig ile token guvenligi zayiflayabilir.

Cozum:
- AUTH_SECRET yoksa servis boot fail etsin.
- Secret uzunluk kontrolu (en az 32 karakter).
- Opsiyonel key rotation stratejisi.

Kabul Kriterleri:
1. AUTH_SECRET olmadan server baslamaz.
2. Kisa secret ile server fail verir.
3. Dogru secret ile token olusturma/dogrulama normal calisir.

Test Senaryolari:
1. ENV olmadan start komutu fail olmali.
2. Kisa secret ile start fail olmali.
3. Gecerli secret ile login ve me endpointleri calismali.

---

### BG-003 - Planner Combo Cesitliligi
Durum: Acik
Oncelik: P0

Problem:
- Plan olusturmada kombinasyon engeli sadece bir onceki ogune uygulaniyor.

Etkisi:
- 6 ogunde tekrarli ABABAB yapisi olusabiliyor.

Cozum:
- Tum onceki combo keyleri set olarak tutulmali.
- Gerektiginde penalti tabanli ikinci en iyi secim stratejisi eklenmeli.

Kabul Kriterleri:
1. 6 ogunde ayni combo en fazla 1 kez gorunmeli (normal kosullarda).
2. Malzeme cesidi dusukse sistem kontrollu fallback ile acikca raporlamali.

Test Senaryolari:
1. En az 2x2x2 secimle 6 ogun testinde tekrar oranı kontrolu.
2. 1x1x1 secimle fallback davranisi beklenen sekilde olmali.

---

### BG-004 - Recipes ve Curated Data Uyumlandirma
Durum: Acik
Oncelik: P0

Problem:
- Recipe template foodId listesi curated katalogla tam uyumlu degil.

Etkisi:
- Tarif makrolari eksik ingredient nedeniyle yanlis hesaplanabiliyor.

Cozum:
- Tariflerdeki tum foodId degerlerini curated katalogla birebir uyumlu hale getir.
- Eksik ingredient varsa tarifi yayinlama veya hard fail stratejisi belirle.

Kabul Kriterleri:
1. recipesWithMissing = 0 olmalı.
2. Tum tarifler ingredient bazli hesaplanmis makro ile donmeli.
3. dataQuality.missingIngredientIds daima bos array olmali.

Test Senaryolari:
1. Recipe katalog smoke testinde eksik id sayisi sifir cikmali.
2. 7 tarifin hepsi toplam makro hesap testinden gecmeli.

---

## P1 Ticketlari

### BG-005 - App Init Dayanikliligi (Partial Success)
Durum: Acik
Oncelik: P1

Problem:
- Ilk yuklemede Promise.all kullanildigi icin tek endpoint hatasi tum state i dusuruyor.

Etkisi:
- Ornegin recipes endpoint arizasi, foods ve inventory goruntulemesini de bloke ediyor.

Cozum:
- Promise.allSettled kullan.
- Her kaynagi bagimsiz fallback ile yukle.
- Kullaniciya kaynak bazli hata mesaji goster.

Kabul Kriterleri:
1. /recipes fail olsa bile /foods ve /inventory render olmali.
2. Tek endpoint hatasi global beyaz ekran yaratmamali.

Test Senaryolari:
1. recipes endpoint 500 mock ile acilis testi.
2. foods endpoint 500 mock ile acilis testi.
3. inventory endpoint 500 mock ile acilis testi.

---

### BG-006 - Role Bazli UI Yetki Hizalama
Durum: Acik
Oncelik: P1

Problem:
- Normal user ingredient CRUD butonlarini goruyor, backend 403 donuyor.

Etkisi:
- Kullanici deneyimi bozuluyor, guven kaybi olusuyor.

Cozum:
- User role state ini frontendde kullan.
- CRUD kontrollerini sadece admin role gorur hale getir.
- Unauthorized aksiyonlari gizle veya disabled + aciklama ekle.

Kabul Kriterleri:
1. User rolde Add/Edit/Delete butonlari gorunmemeli.
2. Admin rolde mevcut islev bozulmadan devam etmeli.

Test Senaryolari:
1. Admin oturumunda CRUD butonlari gorunur test.
2. User oturumunda CRUD butonlari gizli test.

---

### BG-007 - Inventory Veri Butunlugu (FK + Validation)
Durum: Acik
Oncelik: P1

Problem:
- Inventory yaziminda food id varligi zorlanmiyor.
- Food silinince orphan inventory satirlari kalabiliyor.

Etkisi:
- Veri kirliligi ve beklenmedik eski miktar geri donusu.

Cozum:
- user_inventory.food_id icin foods.id foreign key ekle.
- /inventory post oncesi food varligi dogrula.
- Food silmede ON DELETE CASCADE veya app-level cleanup.

Kabul Kriterleri:
1. Geçersiz foodId ile inventory yazimi 400 donmeli.
2. Food silindiginde ilgili inventory satirlari temizlenmeli.

Test Senaryolari:
1. fake foodId ile /inventory post testi.
2. food create -> inventory yaz -> food delete -> inventory kontrol testi.

---

### BG-008 - Manual Entry Validasyon ve Hata Mesajlari
Durum: Acik
Oncelik: P1

Problem:
- Manual meal entryde calories=0 ama macro > 0 gibi durumlarda davranis net degil.

Etkisi:
- Kullanici kaydin neden reddedildigini anlayamayabiliyor.

Cozum:
- Entry validasyon kurallarini tek yerde tanimla.
- calories veya makrolardan en az biri > 0 zorunlulugu koy.
- Acik ve aksiyon odakli hata metni don.

Kabul Kriterleri:
1. Gecersiz payload deterministic 400 ve net mesaj donmeli.
2. Gecerli payload her zaman loga eklenmeli.

Test Senaryolari:
1. Tum degerler sifir payload testi.
2. Sadece protein dolu payload testi.
3. Sadece calories dolu payload testi.

---

### BG-009 - Seed Stratejisi (Auto Seed vs Full Sync)
Durum: Acik
Oncelik: P1

Problem:
- Startup seed sadece eksik kayit ekliyor, tam guncelleme yapmiyor.

Etkisi:
- Deploy sonrasi katalog degisiklikleri otomatik senkron olmayabilir.

Cozum:
- Iki mod tanimla:
  - Safe startup mode: sadece eksik ekle
  - Full sync mode: seed script ile upsert + prune
- Railway deploy komutuna istege bagli full sync adimi ekle.

Kabul Kriterleri:
1. Startup mode ve full sync mode davranislari dokumante ve testli olmali.
2. Full sync calistiginda DB katalog curated dosya ile birebir eslesmeli.

Test Senaryolari:
1. Startup mode dry run testi.
2. Full sync sonrasi DB count ve id set karsilastirma testi.

---

## P2 Ticketlari

### BG-010 - Sessiz Clamp Yerine Acik Geri Bildirim
Durum: Acik
Oncelik: P2

Problem:
- Water ve inventory degerlerinde sessiz clamp var.

Etkisi:
- Kullanici farkli bir degerin kaydedildigini anlamiyor.

Cozum:
- API response a appliedValue ve isClamped alanlari ekle.
- Frontendde bilgi toasti goster.

Kabul Kriterleri:
1. Clamp oldugunda API bu durumu acikca belirtmeli.
2. UI da bilgilendirici mesaj gorunmeli.

Test Senaryolari:
1. Water 1 ml gonderimi.
2. Inventory 50000 g gonderimi.

---

### BG-011 - Login Ekrani Varsayilan Admin Bilgilerini Kaldirma
Durum: Acik
Oncelik: P2

Problem:
- Login formu admin email/sifre ile prefill geliyor.

Etkisi:
- Guvenlik algisi olumsuz.

Cozum:
- Varsayilan degerleri bos yap.
- Demo ortaminda sadece README uzerinden bilgilendirme ver.

Kabul Kriterleri:
1. Login formu bos gelmeli.
2. Demo kullanici bilgisi UI da acik sifre olarak gosterilmemeli.

Test Senaryolari:
1. Login sayfasi ilk acilis state kontrolu.

---

### BG-012 - Otomatik Test Kapsami (API + E2E)
Durum: Acik
Oncelik: P2

Problem:
- Kritik akislar icin otomatik test kapsami yetersiz.

Etkisi:
- Regression riski yuksek.

Cozum:
- API contract testleri: auth, inventory, recipes, checkout, day-log.
- E2E smoke: login -> inventory -> planner -> cart -> checkout -> dashboard.

Kabul Kriterleri:
1. CI pipeline en az bir API ve bir E2E job calistirmali.
2. P0/P1 ticketlari icin regression testleri ekli olmali.

Test Senaryolari:
1. Happy path E2E.
2. Yetkisiz user CRUD E2E.
3. Recipe data integrity API testi.

---

## Sprint Onerisi

Sprint 1:
- BG-001, BG-002, BG-003, BG-004

Sprint 2:
- BG-005, BG-006, BG-007, BG-008, BG-009

Sprint 3:
- BG-010, BG-011, BG-012

## Definition of Done
- Kod degisikligi + test + dokumantasyon birlikte tamamlanmis olmali.
- Uretim konfigurasyonu (Railway env) checklist ile dogrulanmis olmali.
- Kritik senaryolarin smoke testi release oncesi zorunlu olmali.
