import os
import base64
from pathlib import Path

import httpx
from dotenv import load_dotenv
from groq import Groq

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

def _get_client() -> Groq:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY tanımlı değil. backend/.env dosyasını kontrol edin.")

    http_client = httpx.Client(trust_env=False, timeout=60.0)
    return Groq(api_key=api_key, http_client=http_client)


def ask_ai(prompt: str) -> str:
    client = _get_client()
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": """Sen bir CNC talaşlı imalat uzmanısın. 
                Tornalama, frezeleme, delme gibi operasyonlar ve FMEA analizi konusunda 
                uzmansın. Cevaplarını her zaman Türkçe ver. 
                Sayısal değerler ve teknik detaylar konusunda gerçekçi ol."""
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.3,
        max_tokens=1024,
    )
    return response.choices[0].message.content


def suggest_operations(part_name: str, material: str) -> str:
    prompt = f"""
    Parça adı: {part_name}
    Malzeme: {material}
    
    Bu parça için gerekli CNC operasyon sırasını öner.
    Her operasyon için şunları belirt:
    - Operasyon tipi (tornalama/frezeleme/delme/taşlama)
    - Tahmini çevrim süresi (dakika)
    - Kullanılacak takım
    - Makine tipi
    
    Madde madde, kısa ve net yaz.
    """
    return ask_ai(prompt)


def suggest_fmea(operation_type: str, part_name: str) -> str:
    prompt = f"""
    Parça: {part_name}
    Operasyon: {operation_type}
    
    Bu operasyon için FMEA analizi yap.
    Şunları belirt:
    - Potansiyel hata modu
    - Hatanın etkisi
    - Hatanın nedeni
    - Şiddet puanı S (1-10)
    - Oluşma olasılığı O (1-10)
    - Saptama güçlüğü D (1-10)
    - Önerilen önlem
    
    Madde madde yaz.
    """
    return ask_ai(prompt)


def analyze_part_image(image_base64: str, mime_type: str = "image/jpeg") -> str:
    """Analyze a part image using Groq vision model."""
    client = _get_client()
    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{image_base64}"
                        }
                    },
                    {
                        "type": "text",
                        "text": """Bu fotoğraftaki makine parçasını analiz et. Türkçe yanıt ver.

Şunları belirt:
1. PARÇA TİPİ: Ne tür bir parça olduğunu tahmin et (mil, flanş, dişli, bağlantı parçası vb.)
2. MALZEME TAHMİNİ: Görünümden malzeme tahmin et (çelik, alüminyum, dökme demir vb.)
3. İMALAT YÖNTEMİ: Hangi CNC operasyonlarıyla üretilebileceğini belirt
4. KOMPLEKSİTE: Basit / Orta / Karmaşık
5. TAVSİYE: Bu parçayı nerede yaptırabileceğine dair öneri (CNC torna atölyesi, freze atölyesi, genel imalat atölyesi vb.)

Kısa ve net yaz."""
                    }
                ]
            }
        ],
        temperature=0.3,
        max_tokens=800,
    )
    return response.choices[0].message.content


def suggest_price(part_name: str, material: str, operations: str) -> str:
    prompt = f"""
    Parça: {part_name}
    Malzeme: {material}
    Operasyonlar: {operations}
    
    Bu parça için Türkiye piyasasında gerçekçi bir teklif fiyatı öner.
    Şunları belirt:
    - Tahmini hammadde maliyeti (TL)
    - Tahmini işleme maliyeti (TL)
    - Önerilen birim fiyat (TL)
    - Fiyatı etkileyen faktörler
    
    Kısa ve net yaz.
    """
    return ask_ai(prompt)
