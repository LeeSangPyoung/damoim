#!/usr/bin/env python3
"""동창가게 100개 등록 스크립트"""
import requests
import json
import random
import os
import time
import urllib.request

BASE_URL = "http://localhost:8080/api"
UPLOAD_URL = f"{BASE_URL}/posts/upload-image"
SHOP_URL = f"{BASE_URL}/shops"

# 유저 목록
USERS = [
    "user0001","user0002","user0003","user0004","user0005",
    "user0006","user0007","user0008","user0009","user0010",
    "user0011","user0012","user0013","user0014","user0015",
    "user0016","user0017","user0018","user0019","user0020",
    "user0021","user0022","user0023","user0024","user0025",
    "user0026","user0027","user0028","user0029","user0030",
    "user0031","user0032","user0033","user0034","user0035",
    "user0036","user0037","user0038","user0039","user0040",
    "user0041","user0042","user0043","user0044","user0045",
    "user0046","user0047","user0048","user0049","user0050",
    "user0051","user0052","user0053","user0054","user0055",
    "user0056","user0057","user0058","user0059","user0060",
    "user0061","user0062","user0063","user0064","user0065",
    "user0066","user0067","user0068","user0069","user0070",
    "user0071","user0072","user0073","user0074","user0075",
    "user0076","user0077","user0078","user0079","user0080",
    "user0081","user0082","user0083","user0084","user0085",
    "user0086","user0087","user0088","user0089","user0090",
    "user0091","user0092","user0093","user0094","user0095",
    "user0096","user0097","user0098","user0099","user0100",
]

# 가게 데이터 100개
SHOPS = [
    # === 음식점 (25개) ===
    {"shopName": "엄마손 칼국수", "category": "음식점", "subCategory": "한식", "description": "30년 전통 수제 칼국수와 만두가 일품인 집. 직접 반죽한 면발이 쫄깃합니다.", "address": "서울시 종로구 종로 123", "detailAddress": "1층", "phone": "02-1234-5678", "businessHours": "매일 10:00~21:00 / 월요일 휴무", "query": "korean noodle restaurant"},
    {"shopName": "진미 갈비탕", "category": "음식점", "subCategory": "한식", "description": "소갈비를 12시간 우려낸 진한 갈비탕 전문점. 밑반찬도 정성스럽습니다.", "address": "서울시 강남구 테헤란로 456", "detailAddress": "지하1층", "phone": "02-2345-6789", "businessHours": "매일 07:00~22:00 / 일요일 휴무", "query": "korean beef soup"},
    {"shopName": "미소 김밥천국", "category": "음식점", "subCategory": "분식", "description": "가성비 최고! 다양한 김밥과 떡볶이를 즐길 수 있는 곳.", "address": "서울시 마포구 홍대입구로 78", "detailAddress": "", "phone": "02-3456-7890", "businessHours": "매일 08:00~23:00", "query": "korean kimbap"},
    {"shopName": "용용 중화요리", "category": "음식점", "subCategory": "중식", "description": "짬뽕과 탕수육이 유명한 정통 중화요리 전문점.", "address": "서울시 중구 을지로 234", "detailAddress": "2층", "phone": "02-4567-8901", "businessHours": "매일 11:00~21:30 / 화요일 휴무", "query": "chinese restaurant"},
    {"shopName": "스시 하나", "category": "음식점", "subCategory": "일식", "description": "신선한 회와 초밥을 합리적인 가격에. 오마카세도 운영합니다.", "address": "서울시 서초구 서초대로 567", "detailAddress": "3층", "phone": "02-5678-9012", "businessHours": "매일 11:30~22:00 / 월요일 휴무", "query": "sushi restaurant"},
    {"shopName": "파스타 에 비노", "category": "음식점", "subCategory": "양식", "description": "수제 파스타와 와인이 어우러지는 이탈리안 레스토랑.", "address": "서울시 용산구 이태원로 89", "detailAddress": "1층", "phone": "02-6789-0123", "businessHours": "매일 11:00~22:00", "query": "pasta restaurant"},
    {"shopName": "황금 치킨", "category": "음식점", "subCategory": "치킨", "description": "바삭한 후라이드와 매콤한 양념치킨의 조화! 배달도 됩니다.", "address": "서울시 송파구 올림픽로 345", "detailAddress": "", "phone": "02-7890-1234", "businessHours": "매일 15:00~02:00", "query": "korean fried chicken"},
    {"shopName": "나폴리 피자", "category": "음식점", "subCategory": "피자", "description": "화덕에서 구운 정통 나폴리 피자. 도우가 쫄깃합니다.", "address": "서울시 강서구 공항대로 678", "detailAddress": "1층", "phone": "02-8901-2345", "businessHours": "매일 11:00~22:00 / 화요일 휴무", "query": "napoli pizza"},
    {"shopName": "할매 순대국", "category": "음식점", "subCategory": "한식", "description": "3대째 이어온 전통 순대국밥. 직접 만든 순대가 일품.", "address": "서울시 동대문구 왕산로 12", "detailAddress": "", "phone": "02-9012-3456", "businessHours": "매일 06:00~21:00 / 일요일 휴무", "query": "korean sundae soup"},
    {"shopName": "버거 팩토리", "category": "음식점", "subCategory": "패스트푸드", "description": "수제 패티와 신선한 재료로 만든 프리미엄 수제버거.", "address": "서울시 영등포구 여의대로 901", "detailAddress": "B1", "phone": "02-0123-4567", "businessHours": "매일 10:00~22:00", "query": "hamburger restaurant"},
    {"shopName": "산들바람 한정식", "category": "음식점", "subCategory": "한식", "description": "제철 재료로 정성껏 차린 한정식 코스. 접대와 모임에 적합합니다.", "address": "서울시 강북구 도봉로 234", "detailAddress": "2층", "phone": "02-1111-2222", "businessHours": "매일 11:30~21:30 / 월요일 휴무", "query": "korean traditional meal"},
    {"shopName": "대박 삼겹살", "category": "음식점", "subCategory": "한식", "description": "두툼한 국내산 삼겹살을 숯불에 구워 먹는 맛! 된장찌개 서비스.", "address": "서울시 관악구 관악로 56", "detailAddress": "", "phone": "02-2222-3333", "businessHours": "매일 16:00~01:00", "query": "korean bbq pork belly"},
    {"shopName": "명동 칼국수", "category": "음식점", "subCategory": "한식", "description": "바지락 칼국수와 수제비가 유명한 인기맛집.", "address": "서울시 중구 명동길 45", "detailAddress": "1층", "phone": "02-3333-4444", "businessHours": "매일 10:30~20:30", "query": "korean handmade noodle"},
    {"shopName": "돈카츠 명가", "category": "음식점", "subCategory": "일식", "description": "두툼한 등심과 안심 돈카츠. 직접 빻은 빵가루 사용.", "address": "서울시 성동구 왕십리로 78", "detailAddress": "1층", "phone": "02-4444-5555", "businessHours": "매일 11:00~21:00 / 수요일 휴무", "query": "tonkatsu pork cutlet"},
    {"shopName": "마라탕 천하", "category": "음식점", "subCategory": "중식", "description": "마라탕과 마라샹궈 전문점. 매운맛 단계 조절 가능!", "address": "서울시 광진구 능동로 90", "detailAddress": "", "phone": "02-5555-6666", "businessHours": "매일 11:00~22:00", "query": "chinese mala hot pot"},
    {"shopName": "뷔페 가든", "category": "음식점", "subCategory": "뷔페", "description": "한식, 양식, 일식 200가지 메뉴를 한번에! 가족 모임 추천.", "address": "서울시 노원구 동일로 123", "detailAddress": "5층", "phone": "02-6666-7777", "businessHours": "매일 11:00~15:00, 17:00~21:30", "query": "buffet restaurant"},
    {"shopName": "감나무집 닭갈비", "category": "음식점", "subCategory": "한식", "description": "춘천식 닭갈비와 막국수를 서울에서 즐기세요.", "address": "서울시 마포구 와우산로 34", "detailAddress": "1층", "phone": "02-7777-8888", "businessHours": "매일 11:30~22:00", "query": "korean spicy chicken"},
    {"shopName": "스테이크 하우스 블루", "category": "음식점", "subCategory": "양식", "description": "프라임급 소고기를 사용한 정통 스테이크 전문 레스토랑.", "address": "서울시 강남구 압구정로 456", "detailAddress": "1층", "phone": "02-8888-9999", "businessHours": "매일 11:30~22:30", "query": "steak restaurant"},
    {"shopName": "해물 포차", "category": "음식점", "subCategory": "한식", "description": "싱싱한 해물찜과 조개구이를 포장마차 분위기에서!", "address": "서울시 서대문구 연세로 67", "detailAddress": "", "phone": "02-1010-2020", "businessHours": "매일 17:00~02:00 / 일요일 휴무", "query": "korean seafood"},
    {"shopName": "베트남 쌀국수 포", "category": "음식점", "subCategory": "기타", "description": "하노이 정통 레시피 쌀국수. 사골육수를 24시간 우려냅니다.", "address": "서울시 동작구 상도로 89", "detailAddress": "1층", "phone": "02-2020-3030", "businessHours": "매일 10:00~21:00", "query": "vietnamese pho"},
    {"shopName": "타코 엘 무쵸", "category": "음식점", "subCategory": "기타", "description": "멕시칸 타코와 부리또 전문점. 살사 소스는 직접 만듭니다.", "address": "서울시 마포구 어울마당로 12", "detailAddress": "1층", "phone": "02-3030-4040", "businessHours": "매일 11:00~21:30 / 월요일 휴무", "query": "mexican tacos"},
    {"shopName": "장수 설렁탕", "category": "음식점", "subCategory": "한식", "description": "소뼈를 48시간 고아 만든 진한 설렁탕. 깍두기도 직접 담급니다.", "address": "서울시 종로구 삼봉로 45", "detailAddress": "", "phone": "02-4040-5050", "businessHours": "매일 06:00~22:00", "query": "korean ox bone soup"},
    {"shopName": "교동 떡볶이", "category": "음식점", "subCategory": "분식", "description": "옛날식 간장 떡볶이와 매콤 떡볶이 두 가지 맛을 즐기세요.", "address": "서울시 종로구 인사동길 23", "detailAddress": "", "phone": "02-5050-6060", "businessHours": "매일 10:00~20:00 / 일요일 휴무", "query": "korean tteokbokki"},
    {"shopName": "오늘 회 한접시", "category": "음식점", "subCategory": "일식", "description": "노량진에서 직송! 매일 새벽 공수되는 신선한 회.", "address": "서울시 동작구 노량진로 78", "detailAddress": "2층", "phone": "02-6060-7070", "businessHours": "매일 12:00~23:00", "query": "korean raw fish sashimi"},
    {"shopName": "양꼬치 양", "category": "음식점", "subCategory": "중식", "description": "직화로 구운 양꼬치와 칭따오 맥주의 환상 조합.", "address": "서울시 광진구 자양로 56", "detailAddress": "1층", "phone": "02-7070-8080", "businessHours": "매일 16:00~01:00", "query": "chinese lamb skewer"},

    # === 카페/디저트 (15개) ===
    {"shopName": "브라운 빈 커피", "category": "카페/디저트", "subCategory": "카페", "description": "직접 로스팅한 원두로 내린 핸드드립 커피 전문점.", "address": "서울시 마포구 연남로 12", "detailAddress": "1층", "phone": "02-1234-1111", "businessHours": "매일 08:00~22:00", "query": "coffee shop cafe"},
    {"shopName": "밀가루 베이커리", "category": "카페/디저트", "subCategory": "베이커리", "description": "매일 아침 갓 구운 빵과 케이크. 버터 크루아상이 인기!", "address": "서울시 서초구 반포대로 34", "detailAddress": "1층", "phone": "02-1234-2222", "businessHours": "매일 07:00~21:00 / 월요일 휴무", "query": "bakery bread"},
    {"shopName": "달콤 마카롱", "category": "카페/디저트", "subCategory": "디저트", "description": "프랑스식 수제 마카롱 전문점. 20가지 맛을 즐기세요.", "address": "서울시 강남구 신사동 가로수길 56", "detailAddress": "2층", "phone": "02-1234-3333", "businessHours": "매일 10:00~21:00", "query": "macaron dessert"},
    {"shopName": "바닐라 스쿱", "category": "카페/디저트", "subCategory": "아이스크림", "description": "천연 재료로 만든 젤라또 아이스크림. 계절별 한정 메뉴 운영.", "address": "서울시 용산구 녹사평대로 78", "detailAddress": "1층", "phone": "02-1234-4444", "businessHours": "매일 11:00~22:00", "query": "gelato ice cream"},
    {"shopName": "숲속의 카페", "category": "카페/디저트", "subCategory": "카페", "description": "녹지 가득한 테라스에서 즐기는 여유로운 커피 타임.", "address": "서울시 성북구 성북로 90", "detailAddress": "", "phone": "02-1234-5555", "businessHours": "매일 09:00~21:00 / 화요일 휴무", "query": "garden cafe"},
    {"shopName": "빵공장", "category": "카페/디저트", "subCategory": "베이커리", "description": "소금빵, 크로플, 식빵이 매일 완판되는 동네 빵집.", "address": "서울시 강동구 천호대로 123", "detailAddress": "1층", "phone": "02-1234-6666", "businessHours": "매일 08:00~20:00 / 일요일 휴무", "query": "artisan bakery"},
    {"shopName": "달빛 디저트", "category": "카페/디저트", "subCategory": "디저트", "description": "티라미수, 바스크치즈케이크 등 수제 디저트 전문.", "address": "서울시 마포구 합정동 월드컵로 45", "detailAddress": "2층", "phone": "02-1234-7777", "businessHours": "매일 12:00~21:00 / 월요일 휴무", "query": "tiramisu dessert cafe"},
    {"shopName": "모닝 커피", "category": "카페/디저트", "subCategory": "카페", "description": "출근길 테이크아웃 전문. 아메리카노 2,000원!", "address": "서울시 영등포구 국회대로 67", "detailAddress": "1층", "phone": "02-1234-8888", "businessHours": "평일 06:30~19:00 / 주말 휴무", "query": "morning coffee takeout"},
    {"shopName": "라떼 아트", "category": "카페/디저트", "subCategory": "카페", "description": "라떼 아트 챔피언이 운영하는 스페셜티 카페.", "address": "서울시 종로구 북촌로 34", "detailAddress": "1층", "phone": "02-1234-9999", "businessHours": "매일 10:00~20:00 / 수요일 휴무", "query": "latte art specialty coffee"},
    {"shopName": "소보로 베이커리", "category": "카페/디저트", "subCategory": "베이커리", "description": "어릴 적 그 맛! 소보로빵, 크림빵, 단팥빵 전문.", "address": "서울시 구로구 디지털로 89", "detailAddress": "1층", "phone": "02-2345-1111", "businessHours": "매일 07:00~19:00", "query": "traditional korean bakery"},
    {"shopName": "그린티 카페", "category": "카페/디저트", "subCategory": "카페", "description": "제주 녹차를 사용한 녹차 라떼, 녹차 빙수가 인기.", "address": "서울시 서대문구 연세로 12", "detailAddress": "1층", "phone": "02-2345-2222", "businessHours": "매일 10:00~21:00", "query": "green tea matcha cafe"},
    {"shopName": "크레페 하우스", "category": "카페/디저트", "subCategory": "디저트", "description": "바삭한 크레페에 다양한 토핑을 올려 즐기는 프렌치 디저트.", "address": "서울시 강남구 도산대로 78", "detailAddress": "1층", "phone": "02-2345-3333", "businessHours": "매일 11:00~21:00", "query": "crepe dessert"},
    {"shopName": "호두과자 마을", "category": "카페/디저트", "subCategory": "기타", "description": "갓 구운 호두과자와 붕어빵을 맛볼 수 있는 간식 가게.", "address": "서울시 강북구 수유로 45", "detailAddress": "", "phone": "02-2345-4444", "businessHours": "매일 10:00~20:00 / 월요일 휴무", "query": "korean walnut cookie snack"},
    {"shopName": "타르트 팜", "category": "카페/디저트", "subCategory": "디저트", "description": "에그타르트, 과일타르트 전문. 매일 소량만 제작합니다.", "address": "서울시 송파구 백제고분로 56", "detailAddress": "1층", "phone": "02-2345-5555", "businessHours": "매일 10:00~19:00 / 일요일 휴무", "query": "egg tart pastry"},
    {"shopName": "코코 초콜릿", "category": "카페/디저트", "subCategory": "디저트", "description": "벨기에 초콜릿을 사용한 수제 초콜릿 & 핫초코 전문.", "address": "서울시 종로구 삼청로 23", "detailAddress": "1층", "phone": "02-2345-6666", "businessHours": "매일 11:00~20:00 / 화요일 휴무", "query": "handmade chocolate shop"},

    # === 주점/바 (8개) ===
    {"shopName": "맥주창고", "category": "주점/바", "subCategory": "호프/맥주", "description": "국내외 100가지 수제 맥주를 즐길 수 있는 비어펍.", "address": "서울시 마포구 잔다리로 34", "detailAddress": "1층", "phone": "02-3456-1111", "businessHours": "매일 17:00~02:00", "query": "craft beer pub"},
    {"shopName": "소주한잔", "category": "주점/바", "subCategory": "소주방", "description": "안주가 맛있는 정통 소주방. 직접 담근 매실주도 인기.", "address": "서울시 종로구 대학로 56", "detailAddress": "지하1층", "phone": "02-3456-2222", "businessHours": "매일 18:00~03:00 / 일요일 휴무", "query": "korean soju bar"},
    {"shopName": "와인 셀라", "category": "주점/바", "subCategory": "와인바", "description": "소믈리에가 추천하는 와인과 치즈 페어링.", "address": "서울시 강남구 청담동 도산대로 90", "detailAddress": "2층", "phone": "02-3456-3333", "businessHours": "매일 18:00~01:00 / 월요일 휴무", "query": "wine bar cellar"},
    {"shopName": "칵테일 바 문라이트", "category": "주점/바", "subCategory": "칵테일바", "description": "시그니처 칵테일과 재즈 음악이 흐르는 분위기 좋은 바.", "address": "서울시 용산구 이태원로 123", "detailAddress": "3층", "phone": "02-3456-4444", "businessHours": "매일 19:00~03:00 / 화요일 휴무", "query": "cocktail bar night"},
    {"shopName": "별빛 포차", "category": "주점/바", "subCategory": "포차", "description": "노천 포장마차 느낌의 실내 포차. 닭발과 골뱅이무침이 인기.", "address": "서울시 관악구 신림로 78", "detailAddress": "", "phone": "02-3456-5555", "businessHours": "매일 18:00~04:00", "query": "korean pojangmacha street food"},
    {"shopName": "호프집 이층", "category": "주점/바", "subCategory": "호프/맥주", "description": "치킨과 맥주의 정석! 동창 모임 장소로 인기 만점.", "address": "서울시 노원구 상계로 45", "detailAddress": "2층", "phone": "02-3456-6666", "businessHours": "매일 17:00~01:00", "query": "korean chicken beer pub"},
    {"shopName": "막걸리 사랑", "category": "주점/바", "subCategory": "기타", "description": "전국 30가지 수제 막걸리와 전통 안주를 즐기는 주막.", "address": "서울시 종로구 인사동길 67", "detailAddress": "1층", "phone": "02-3456-7777", "businessHours": "매일 17:00~23:00 / 월요일 휴무", "query": "korean makgeolli rice wine"},
    {"shopName": "루프탑 바", "category": "주점/바", "subCategory": "칵테일바", "description": "도심 야경을 바라보며 즐기는 루프탑 칵테일 바.", "address": "서울시 중구 을지로 234", "detailAddress": "옥상", "phone": "02-3456-8888", "businessHours": "매일 18:00~02:00", "query": "rooftop bar city view"},

    # === 뷰티/미용 (8개) ===
    {"shopName": "헤어 스튜디오 봄", "category": "뷰티/미용", "subCategory": "헤어샵", "description": "트렌디한 컷과 염색 전문. 두피 케어 서비스도 제공.", "address": "서울시 강남구 논현로 45", "detailAddress": "2층", "phone": "02-4567-1111", "businessHours": "매일 10:00~20:00 / 월요일 휴무", "query": "hair salon studio"},
    {"shopName": "네일 아트 쁘띠", "category": "뷰티/미용", "subCategory": "네일샵", "description": "젤네일, 패디큐어, 속눈썹 연장까지 원스톱 뷰티샵.", "address": "서울시 서초구 강남대로 67", "detailAddress": "3층", "phone": "02-4567-2222", "businessHours": "매일 10:00~20:00 / 일요일 휴무", "query": "nail art salon"},
    {"shopName": "글로우 피부관리", "category": "뷰티/미용", "subCategory": "피부관리", "description": "피부 타입별 맞춤 관리. 여드름, 미백, 탄력 관리 전문.", "address": "서울시 송파구 올림픽로 89", "detailAddress": "4층", "phone": "02-4567-3333", "businessHours": "매일 10:00~19:00 / 수요일 휴무", "query": "skin care facial"},
    {"shopName": "뷰티 에스테틱", "category": "뷰티/미용", "subCategory": "에스테틱", "description": "바디 마사지, 림프 순환, 체형 관리 전문 에스테틱.", "address": "서울시 강남구 역삼로 12", "detailAddress": "5층", "phone": "02-4567-4444", "businessHours": "매일 10:00~21:00 / 일요일 휴무", "query": "esthetic body massage"},
    {"shopName": "가위손 미용실", "category": "뷰티/미용", "subCategory": "헤어샵", "description": "20년 경력 원장의 커트 실력. 남성 전문 미용실.", "address": "서울시 성동구 성수이로 34", "detailAddress": "1층", "phone": "02-4567-5555", "businessHours": "매일 09:00~20:00 / 화요일 휴무", "query": "barber shop mens haircut"},
    {"shopName": "럭셔리 네일", "category": "뷰티/미용", "subCategory": "네일샵", "description": "웨딩 네일, 시즌 아트 전문. 프리미엄 젤 사용.", "address": "서울시 강남구 청담동 34", "detailAddress": "2층", "phone": "02-4567-6666", "businessHours": "매일 10:00~20:00 / 월요일 휴무", "query": "luxury nail art"},
    {"shopName": "헤어 살롱 드미", "category": "뷰티/미용", "subCategory": "헤어샵", "description": "펌, 염색, 클리닉 전문. 유기농 제품 사용.", "address": "서울시 마포구 양화로 56", "detailAddress": "2층", "phone": "02-4567-7777", "businessHours": "매일 10:00~20:00 / 월요일 휴무", "query": "hair perm color salon"},
    {"shopName": "뷰티풀 속눈썹", "category": "뷰티/미용", "subCategory": "기타", "description": "속눈썹 연장, 펌 전문. 자연스럽고 오래 지속됩니다.", "address": "서울시 영등포구 당산로 78", "detailAddress": "3층", "phone": "02-4567-8888", "businessHours": "매일 10:00~19:00 / 일요일 휴무", "query": "eyelash extension"},

    # === 건강/의료 (8개) ===
    {"shopName": "우리 가정의학과", "category": "건강/의료", "subCategory": "병원", "description": "내과, 가정의학과 전문. 건강검진도 가능합니다.", "address": "서울시 강남구 봉은사로 12", "detailAddress": "3층", "phone": "02-5678-1111", "businessHours": "평일 09:00~18:00, 토 09:00~13:00", "query": "medical clinic hospital"},
    {"shopName": "보은 한의원", "category": "건강/의료", "subCategory": "한의원", "description": "체질별 맞춤 한방 치료. 침, 뜸, 부항, 한약 처방.", "address": "서울시 강서구 화곡로 34", "detailAddress": "2층", "phone": "02-5678-2222", "businessHours": "평일 09:00~18:00, 토 09:00~13:00 / 일요일 휴무", "query": "korean oriental medicine clinic"},
    {"shopName": "스마일 치과", "category": "건강/의료", "subCategory": "치과", "description": "임플란트, 교정, 미백 전문. 무통 마취 시스템.", "address": "서울시 서초구 서초중앙로 56", "detailAddress": "4층", "phone": "02-5678-3333", "businessHours": "평일 09:30~18:30, 토 09:30~14:00", "query": "dental clinic dentist"},
    {"shopName": "건강 약국", "category": "건강/의료", "subCategory": "약국", "description": "처방전 조제 및 건강기능식품 상담. 야간 운영.", "address": "서울시 중구 충무로 78", "detailAddress": "1층", "phone": "02-5678-4444", "businessHours": "매일 09:00~22:00", "query": "pharmacy drugstore"},
    {"shopName": "밝은눈 안과", "category": "건강/의료", "subCategory": "안과", "description": "라식, 라섹, 백내장 수술 전문. 최신 장비 보유.", "address": "서울시 영등포구 국제금융로 90", "detailAddress": "6층", "phone": "02-5678-5555", "businessHours": "평일 09:00~18:00, 토 09:00~13:00", "query": "eye clinic ophthalmology"},
    {"shopName": "이편한 정형외과", "category": "건강/의료", "subCategory": "병원", "description": "관절, 척추 전문 정형외과. 물리치료실 운영.", "address": "서울시 송파구 삼전로 12", "detailAddress": "3층", "phone": "02-5678-6666", "businessHours": "평일 09:00~19:00, 토 09:00~13:00", "query": "orthopedic clinic"},
    {"shopName": "참사랑 한의원", "category": "건강/의료", "subCategory": "한의원", "description": "통증 치료, 다이어트 한약, 성장 클리닉 전문.", "address": "서울시 노원구 상계로 34", "detailAddress": "2층", "phone": "02-5678-7777", "businessHours": "평일 09:00~18:30 / 토 09:00~14:00", "query": "traditional korean medicine"},
    {"shopName": "소아과 키즈", "category": "건강/의료", "subCategory": "병원", "description": "소아청소년과 전문. 예방접종, 영유아 건강검진.", "address": "서울시 강동구 성내로 56", "detailAddress": "2층", "phone": "02-5678-8888", "businessHours": "평일 09:00~18:00, 토 09:00~13:00", "query": "pediatric clinic children"},

    # === 교육 (8개) ===
    {"shopName": "대치 수학학원", "category": "교육", "subCategory": "학원", "description": "초중고 수학 전문 학원. 1:4 소규모 그룹 수업.", "address": "서울시 강남구 대치동 삼성로 12", "detailAddress": "3층", "phone": "02-6789-1111", "businessHours": "평일 14:00~22:00, 토 10:00~18:00", "query": "math academy classroom"},
    {"shopName": "글로벌 영어학원", "category": "교육", "subCategory": "어학원", "description": "원어민 강사진의 회화, 토익, 토플 전문 어학원.", "address": "서울시 서초구 방배로 34", "detailAddress": "4층", "phone": "02-6789-2222", "businessHours": "평일 09:00~21:00, 토 09:00~17:00", "query": "english language school"},
    {"shopName": "피아노 아카데미", "category": "교육", "subCategory": "음악/미술", "description": "유아부터 성인까지 1:1 피아노 레슨. 연습실 개방.", "address": "서울시 서대문구 연희로 56", "detailAddress": "2층", "phone": "02-6789-3333", "businessHours": "평일 13:00~21:00, 토 10:00~18:00", "query": "piano music academy"},
    {"shopName": "아트 스튜디오", "category": "교육", "subCategory": "음악/미술", "description": "성인 취미 미술, 유화, 수채화, 드로잉 수업.", "address": "서울시 종로구 삼청로 78", "detailAddress": "2층", "phone": "02-6789-4444", "businessHours": "평일 14:00~21:00, 토 10:00~17:00 / 일요일 휴무", "query": "art studio painting class"},
    {"shopName": "태권 체육관", "category": "교육", "subCategory": "체육", "description": "태권도 전문 도장. 유아, 초등, 성인반 운영.", "address": "서울시 강북구 한천로 90", "detailAddress": "1층", "phone": "02-6789-5555", "businessHours": "평일 15:00~21:00, 토 10:00~13:00", "query": "taekwondo martial arts gym"},
    {"shopName": "코딩 아카데미", "category": "교육", "subCategory": "학원", "description": "초등~고등 코딩 교육. 파이썬, 자바, 앱 개발 수업.", "address": "서울시 강남구 역삼로 12", "detailAddress": "5층", "phone": "02-6789-6666", "businessHours": "평일 14:00~21:00, 토 10:00~17:00", "query": "coding programming academy"},
    {"shopName": "수영 스포츠센터", "category": "교육", "subCategory": "체육", "description": "실내 수영장. 유아, 성인, 마스터즈반 운영. 자유수영 가능.", "address": "서울시 마포구 월드컵로 34", "detailAddress": "B1", "phone": "02-6789-7777", "businessHours": "매일 06:00~22:00", "query": "indoor swimming pool"},
    {"shopName": "요리 교실 맛있는", "category": "교육", "subCategory": "기타", "description": "한식, 양식, 베이킹 원데이 클래스. 커플 수업 인기.", "address": "서울시 중구 명동길 56", "detailAddress": "3층", "phone": "02-6789-8888", "businessHours": "매일 10:00~20:00 / 월요일 휴무", "query": "cooking class kitchen"},

    # === 생활서비스 (8개) ===
    {"shopName": "깨끗한 세탁소", "category": "생활서비스", "subCategory": "세탁", "description": "드라이클리닝, 빨래방, 수선까지. 당일 세탁 가능.", "address": "서울시 성동구 왕십리로 12", "detailAddress": "1층", "phone": "02-7890-1111", "businessHours": "매일 08:00~21:00 / 일요일 휴무", "query": "laundry dry cleaning"},
    {"shopName": "금손 수선집", "category": "생활서비스", "subCategory": "수선", "description": "의류 수선, 지퍼 교체, 기장 줄임 전문.", "address": "서울시 동대문구 휘경로 34", "detailAddress": "1층", "phone": "02-7890-2222", "businessHours": "평일 09:00~19:00 / 주말 휴무", "query": "clothing alteration tailor"},
    {"shopName": "모던 인테리어", "category": "생활서비스", "subCategory": "인테리어", "description": "아파트, 오피스텔 인테리어 전문. 무료 상담 & 견적.", "address": "서울시 강남구 논현로 56", "detailAddress": "6층", "phone": "02-7890-3333", "businessHours": "평일 09:00~18:00", "query": "interior design renovation"},
    {"shopName": "번개 이사", "category": "생활서비스", "subCategory": "이사/청소", "description": "포장이사, 원룸이사, 사무실이사 전문. 무료 방문견적.", "address": "서울시 구로구 구로동로 78", "detailAddress": "3층", "phone": "02-7890-4444", "businessHours": "매일 07:00~19:00", "query": "moving service truck"},
    {"shopName": "행복 부동산", "category": "생활서비스", "subCategory": "부동산", "description": "아파트, 오피스텔, 원룸 매매/전세/월세 전문.", "address": "서울시 강남구 테헤란로 90", "detailAddress": "1층", "phone": "02-7890-5555", "businessHours": "매일 09:00~19:00 / 일요일 휴무", "query": "real estate agency"},
    {"shopName": "새집 청소", "category": "생활서비스", "subCategory": "이사/청소", "description": "입주 청소, 이사 청소, 에어컨 청소 전문업체.", "address": "서울시 노원구 공릉로 12", "detailAddress": "2층", "phone": "02-7890-6666", "businessHours": "매일 08:00~18:00", "query": "house cleaning service"},
    {"shopName": "열쇠 119", "category": "생활서비스", "subCategory": "기타", "description": "긴급 열쇠 개문, 도어락 설치, 보안 시스템 전문.", "address": "서울시 관악구 봉천로 34", "detailAddress": "1층", "phone": "02-7890-7777", "businessHours": "24시간 연중무휴", "query": "locksmith key service"},
    {"shopName": "세탁 팩토리", "category": "생활서비스", "subCategory": "세탁", "description": "무인 세탁소. 대형 빨래도 OK! 운동화 세탁 전문.", "address": "서울시 은평구 통일로 56", "detailAddress": "1층", "phone": "02-7890-8888", "businessHours": "24시간 연중무휴", "query": "coin laundromat"},

    # === 쇼핑/유통 (6개) ===
    {"shopName": "프리미엄 꽃집 블룸", "category": "쇼핑/유통", "subCategory": "꽃집", "description": "꽃다발, 화환, 꽃바구니 전문. 전국 당일 배송.", "address": "서울시 서초구 방배로 12", "detailAddress": "1층", "phone": "02-8901-1111", "businessHours": "매일 09:00~21:00", "query": "flower shop bouquet"},
    {"shopName": "멋쟁이 의류", "category": "쇼핑/유통", "subCategory": "의류", "description": "남녀 캐주얼 & 정장. 동대문 직송 최신 트렌드.", "address": "서울시 중구 명동길 34", "detailAddress": "2층", "phone": "02-8901-2222", "businessHours": "매일 10:00~21:00", "query": "clothing fashion store"},
    {"shopName": "편의점 24시", "category": "쇼핑/유통", "subCategory": "편의점/마트", "description": "동네 편의점. 택배, 공과금 납부, ATM 서비스.", "address": "서울시 광진구 능동로 56", "detailAddress": "1층", "phone": "02-8901-3333", "businessHours": "24시간 연중무휴", "query": "convenience store"},
    {"shopName": "슈즈 갤러리", "category": "쇼핑/유통", "subCategory": "신발/잡화", "description": "운동화, 구두, 샌들 전문 편집샵. 수선도 가능.", "address": "서울시 마포구 홍대입구로 78", "detailAddress": "1층", "phone": "02-8901-4444", "businessHours": "매일 11:00~21:00 / 월요일 휴무", "query": "shoe store gallery"},
    {"shopName": "동네 마트", "category": "쇼핑/유통", "subCategory": "편의점/마트", "description": "신선한 과일, 야채, 정육 전문. 배달 서비스 운영.", "address": "서울시 성북구 정릉로 90", "detailAddress": "1층", "phone": "02-8901-5555", "businessHours": "매일 08:00~23:00", "query": "grocery supermarket"},
    {"shopName": "리본 선물가게", "category": "쇼핑/유통", "subCategory": "기타", "description": "기념일 선물, 생일 파티용품, 포장 서비스 전문.", "address": "서울시 강남구 선릉로 12", "detailAddress": "1층", "phone": "02-8901-6666", "businessHours": "매일 10:00~20:00 / 일요일 휴무", "query": "gift shop present"},

    # === 자동차 (6개) ===
    {"shopName": "최고 자동차 정비", "category": "자동차", "subCategory": "정비", "description": "수입차, 국산차 정비 전문. 엔진오일, 타이어 교체.", "address": "서울시 영등포구 도림로 12", "detailAddress": "", "phone": "02-9012-1111", "businessHours": "평일 08:00~19:00, 토 09:00~15:00", "query": "auto repair mechanic"},
    {"shopName": "번쩍 세차장", "category": "자동차", "subCategory": "세차", "description": "손세차 전문. 실내 클리닝, 유리막 코팅 서비스.", "address": "서울시 강서구 공항대로 34", "detailAddress": "", "phone": "02-9012-2222", "businessHours": "매일 09:00~19:00", "query": "car wash detailing"},
    {"shopName": "드림 렌터카", "category": "자동차", "subCategory": "렌터카", "description": "단기, 장기 렌트 전문. 최신 차량 보유.", "address": "서울시 송파구 올림픽로 56", "detailAddress": "1층", "phone": "02-9012-3333", "businessHours": "매일 08:00~20:00", "query": "car rental service"},
    {"shopName": "중고차 직거래", "category": "자동차", "subCategory": "중고차", "description": "허위매물 ZERO! 직거래 중고차 매매 전문.", "address": "서울시 서초구 양재대로 78", "detailAddress": "", "phone": "02-9012-4444", "businessHours": "매일 09:00~19:00 / 일요일 휴무", "query": "used car dealership"},
    {"shopName": "타이어 프로", "category": "자동차", "subCategory": "정비", "description": "타이어 교체, 휠 얼라인먼트, 밸런스 조정 전문.", "address": "서울시 구로구 경인로 90", "detailAddress": "", "phone": "02-9012-5555", "businessHours": "매일 08:00~19:00 / 일요일 휴무", "query": "tire shop wheel"},
    {"shopName": "광택 코팅 전문", "category": "자동차", "subCategory": "세차", "description": "유리막 코팅, PPF 시공, 광택 복원 전문업체.", "address": "서울시 강동구 천호대로 12", "detailAddress": "", "phone": "02-9012-6666", "businessHours": "매일 09:00~18:00 / 일요일 휴무", "query": "car polish coating"},

    # === IT/전자 (5개) ===
    {"shopName": "PC 닥터", "category": "IT/전자", "subCategory": "컴퓨터", "description": "컴퓨터 수리, 조립, 업그레이드 전문. 출장 서비스.", "address": "서울시 용산구 한강대로 12", "detailAddress": "2층", "phone": "02-0123-1111", "businessHours": "매일 10:00~20:00 / 일요일 휴무", "query": "computer repair service"},
    {"shopName": "폰 수리 센터", "category": "IT/전자", "subCategory": "핸드폰", "description": "스마트폰 액정 수리, 배터리 교체, 데이터 복구.", "address": "서울시 종로구 종로 34", "detailAddress": "1층", "phone": "02-0123-2222", "businessHours": "매일 10:00~21:00", "query": "phone repair service"},
    {"shopName": "인터넷 플러스", "category": "IT/전자", "subCategory": "인터넷", "description": "인터넷, IPTV, 결합상품 설치 전문. 최저가 보장.", "address": "서울시 마포구 마포대로 56", "detailAddress": "3층", "phone": "02-0123-3333", "businessHours": "매일 09:00~18:00 / 주말 휴무", "query": "internet service provider"},
    {"shopName": "게이밍 PC방", "category": "IT/전자", "subCategory": "컴퓨터", "description": "최신 RTX 장비! 쾌적한 환경의 프리미엄 PC방.", "address": "서울시 관악구 관악로 78", "detailAddress": "2층", "phone": "02-0123-4444", "businessHours": "24시간 연중무휴", "query": "gaming pc room"},
    {"shopName": "중고 노트북 마켓", "category": "IT/전자", "subCategory": "컴퓨터", "description": "검수 완료된 중고 노트북 판매. 3개월 보증.", "address": "서울시 용산구 전자상가 90", "detailAddress": "1층", "phone": "02-0123-5555", "businessHours": "매일 10:00~19:00 / 일요일 휴무", "query": "used laptop market"},

    # === 기타 (3개) ===
    {"shopName": "사진관 스냅", "category": "기타", "subCategory": "기타", "description": "증명사진, 가족사진, 프로필 촬영 전문 사진관.", "address": "서울시 강남구 역삼로 34", "detailAddress": "2층", "phone": "02-1111-0001", "businessHours": "매일 10:00~19:00 / 월요일 휴무", "query": "photo studio portrait"},
    {"shopName": "반려동물 호텔", "category": "기타", "subCategory": "기타", "description": "강아지, 고양이 호텔 & 데이케어. 미용도 가능.", "address": "서울시 송파구 석촌호수로 56", "detailAddress": "1층", "phone": "02-1111-0002", "businessHours": "매일 08:00~20:00", "query": "pet hotel grooming"},
    {"shopName": "프린트 24시", "category": "기타", "subCategory": "기타", "description": "문서 출력, 복사, 제본, 스캔, 명함 제작 전문.", "address": "서울시 중구 충무로 78", "detailAddress": "1층", "phone": "02-1111-0003", "businessHours": "24시간 연중무휴", "query": "print copy center"},
]

# Unsplash 이미지 - 각 카테고리별 고정 이미지 URL
CATEGORY_IMAGES = {
    "korean noodle restaurant": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600",
    "korean beef soup": "https://images.unsplash.com/photo-1583224964978-2d50e4c45806?w=600",
    "korean kimbap": "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600",
    "chinese restaurant": "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600",
    "sushi restaurant": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600",
    "pasta restaurant": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600",
    "korean fried chicken": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600",
    "napoli pizza": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600",
    "korean sundae soup": "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=600",
    "hamburger restaurant": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600",
    "korean traditional meal": "https://images.unsplash.com/photo-1580651315530-69c8e0026377?w=600",
    "korean bbq pork belly": "https://images.unsplash.com/photo-1590330297626-d7aff25a0431?w=600",
    "korean handmade noodle": "https://images.unsplash.com/photo-1552611052-33e04de1b100?w=600",
    "tonkatsu pork cutlet": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600",
    "chinese mala hot pot": "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600",
    "buffet restaurant": "https://images.unsplash.com/photo-1555244162-803834f70033?w=600",
    "korean spicy chicken": "https://images.unsplash.com/photo-1632558610911-6e41b4a37e87?w=600",
    "steak restaurant": "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600",
    "korean seafood": "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=600",
    "vietnamese pho": "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600",
    "mexican tacos": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600",
    "korean ox bone soup": "https://images.unsplash.com/photo-1547592180-85f173990554?w=600",
    "korean tteokbokki": "https://images.unsplash.com/photo-1635363638580-c2809d049eee?w=600",
    "korean raw fish sashimi": "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=600",
    "chinese lamb skewer": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600",
    "coffee shop cafe": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600",
    "bakery bread": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600",
    "macaron dessert": "https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=600",
    "gelato ice cream": "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=600",
    "garden cafe": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600",
    "artisan bakery": "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600",
    "tiramisu dessert cafe": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600",
    "morning coffee takeout": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600",
    "latte art specialty coffee": "https://images.unsplash.com/photo-1534778101976-62847782c213?w=600",
    "traditional korean bakery": "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600",
    "green tea matcha cafe": "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600",
    "crepe dessert": "https://images.unsplash.com/photo-1519676867240-f03562e64571?w=600",
    "korean walnut cookie snack": "https://images.unsplash.com/photo-1558303155-3463c9543adb?w=600",
    "egg tart pastry": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600",
    "handmade chocolate shop": "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600",
    "craft beer pub": "https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=600",
    "korean soju bar": "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600",
    "wine bar cellar": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600",
    "cocktail bar night": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600",
    "korean pojangmacha street food": "https://images.unsplash.com/photo-1567521464027-f127ff144326?w=600",
    "korean chicken beer pub": "https://images.unsplash.com/photo-1575367439058-6096bb9cf5e1?w=600",
    "korean makgeolli rice wine": "https://images.unsplash.com/photo-1574856344991-aaa31b6f4ce3?w=600",
    "rooftop bar city view": "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600",
    "hair salon studio": "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600",
    "nail art salon": "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600",
    "skin care facial": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600",
    "esthetic body massage": "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600",
    "barber shop mens haircut": "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600",
    "luxury nail art": "https://images.unsplash.com/photo-1610992015732-2449b0ae3355?w=600",
    "hair perm color salon": "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600",
    "eyelash extension": "https://images.unsplash.com/photo-1583001931096-959e9a1a6223?w=600",
    "medical clinic hospital": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600",
    "korean oriental medicine clinic": "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=600",
    "dental clinic dentist": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600",
    "pharmacy drugstore": "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600",
    "eye clinic ophthalmology": "https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?w=600",
    "orthopedic clinic": "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=600",
    "traditional korean medicine": "https://images.unsplash.com/photo-1611241893603-3c359704e0ee?w=600",
    "pediatric clinic children": "https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?w=600",
    "math academy classroom": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600",
    "english language school": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600",
    "piano music academy": "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=600",
    "art studio painting class": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600",
    "taekwondo martial arts gym": "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=600",
    "coding programming academy": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600",
    "indoor swimming pool": "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600",
    "cooking class kitchen": "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600",
    "laundry dry cleaning": "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=600",
    "clothing alteration tailor": "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600",
    "interior design renovation": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600",
    "moving service truck": "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=600",
    "real estate agency": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600",
    "house cleaning service": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600",
    "locksmith key service": "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600",
    "coin laundromat": "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=600",
    "flower shop bouquet": "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600",
    "clothing fashion store": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600",
    "convenience store": "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600",
    "shoe store gallery": "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600",
    "grocery supermarket": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600",
    "gift shop present": "https://images.unsplash.com/photo-1549465220-1a8b9238f684?w=600",
    "auto repair mechanic": "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=600",
    "car wash detailing": "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=600",
    "car rental service": "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600",
    "used car dealership": "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600",
    "tire shop wheel": "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600",
    "car polish coating": "https://images.unsplash.com/photo-1507136566006-cfc505b114fc?w=600",
    "computer repair service": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600",
    "phone repair service": "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=600",
    "internet service provider": "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600",
    "gaming pc room": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600",
    "used laptop market": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600",
    "photo studio portrait": "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=600",
    "pet hotel grooming": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600",
    "print copy center": "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=600",
}

def download_image(query):
    """Unsplash에서 이미지 다운받아 업로드"""
    url = CATEGORY_IMAGES.get(query)
    if not url:
        # fallback: picsum
        url = f"https://picsum.photos/600/400"

    try:
        # 이미지 다운로드
        tmp_path = f"/tmp/shop_img_{random.randint(10000,99999)}.jpg"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as response:
            with open(tmp_path, 'wb') as f:
                f.write(response.read())

        # 백엔드에 업로드
        with open(tmp_path, 'rb') as f:
            files = {'file': ('shop.jpg', f, 'image/jpeg')}
            resp = requests.post(UPLOAD_URL, files=files, timeout=15)

        os.remove(tmp_path)

        if resp.status_code == 200:
            image_url = resp.text.strip().strip('"')
            return image_url
        else:
            print(f"  Upload failed ({resp.status_code}): {resp.text[:100]}")
            return url  # fallback to direct URL
    except Exception as e:
        print(f"  Image error: {e}")
        return url  # fallback to direct URL

def create_shop(user_id, shop_data):
    """가게 등록 API 호출"""
    payload = {
        "shopName": shop_data["shopName"],
        "category": shop_data["category"],
        "subCategory": shop_data.get("subCategory", ""),
        "description": shop_data.get("description", ""),
        "address": shop_data["address"],
        "detailAddress": shop_data.get("detailAddress", ""),
        "phone": shop_data.get("phone", ""),
        "businessHours": shop_data.get("businessHours", ""),
        "imageUrl": shop_data.get("imageUrl", ""),
    }

    resp = requests.post(
        f"{SHOP_URL}?userId={user_id}",
        json=payload,
        timeout=10
    )
    return resp

def main():
    print(f"=== 동창가게 {len(SHOPS)}개 등록 시작 ===\n")

    success = 0
    fail = 0

    for i, shop in enumerate(SHOPS):
        user_id = USERS[i % len(USERS)]
        print(f"[{i+1}/{len(SHOPS)}] {shop['shopName']} (by {user_id})")

        # 이미지 다운로드 & 업로드
        print(f"  이미지 다운로드 중... ({shop['query']})")
        image_url = download_image(shop["query"])
        shop["imageUrl"] = image_url
        print(f"  이미지: {image_url[:60]}...")

        # 가게 등록
        try:
            resp = create_shop(user_id, shop)
            if resp.status_code == 200:
                result = resp.json()
                print(f"  -> 등록 성공! (ID: {result.get('id', '?')})")
                success += 1
            else:
                print(f"  -> 등록 실패 ({resp.status_code}): {resp.text[:100]}")
                fail += 1
        except Exception as e:
            print(f"  -> 에러: {e}")
            fail += 1

    print(f"\n=== 완료! 성공: {success}, 실패: {fail} ===")

if __name__ == "__main__":
    main()
