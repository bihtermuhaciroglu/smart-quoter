import os
from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))


def ask_ai(prompt: str) -> str:
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
