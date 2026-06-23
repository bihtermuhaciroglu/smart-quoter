# Smart Quoter — Deployment Guide

## Backend → Railway

1. GitHub'a push: `git push origin main`
2. [railway.app](https://railway.app) → New Project → Deploy from GitHub repo → `backend/` klasörü seç
3. Railway'de PostgreSQL ekle: New → Database → Add PostgreSQL
4. Environment Variables ekle:
   - `GROQ_API_KEY` = groq api key
   - `METALS_DEV_API_KEY` = metals dev api key
   - `DATABASE_URL` otomatik gelir (PostgreSQL eklenince)
5. Backend URL'ini kopyala (örn. `https://smart-quoter-backend.railway.app`)

## Frontend → Vercel

1. [vercel.com](https://vercel.com) → New Project → GitHub repo → `frontend/` klasörü seç
2. Environment Variables ekle:
   - `VITE_API_URL` = Railway backend URL'i
3. Deploy et

## Telefona Yükleme (PWA)

### Android (Chrome):
1. Vercel URL'ini Chrome'da aç
2. Sağ üst menü → "Ana ekrana ekle"
3. Uygulama ikonunu kabul et

### iPhone (Safari):
1. Vercel URL'ini Safari'de aç
2. Alt menü → Paylaş simgesi → "Ana Ekrana Ekle"
3. Uygulama ikonunu kabul et

## Yerel Ağda Kullanım (Aynı Wi-Fi)

Backend'i şu şekilde başlat:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Telefondan `http://BİLGİSAYAR-IP:8000` adresine erişebilirsiniz.
Bilgisayar IP'sini öğrenmek için: `ipconfig getifaddr en0`
