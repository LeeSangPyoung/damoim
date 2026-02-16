#!/usr/bin/env python3
"""leesp의 동창 500명을 랜덤 생성하는 스크립트"""

import requests
import random
import json
import time

BASE_URL = "http://localhost:8080/api"

# leesp의 학교 정보
SCHOOLS = {
    "초등학교": {
        "schoolCode": "7134112",
        "schoolType": "초등학교",
        "schoolName": "서울중마초등학교",
        "graduationYear": "1996",
        "grades": ["1", "2", "3", "4", "5", "6"],
        "maxClass": 8
    },
    "중학교": {
        "schoolCode": "7134139",
        "schoolType": "중학교",
        "schoolName": "용곡중학교",
        "graduationYear": "1999",
        "grades": ["1", "2", "3"],
        "maxClass": 12
    },
    "고등학교": {
        "schoolCode": "7010141",
        "schoolType": "고등학교",
        "schoolName": "대원고등학교",
        "graduationYear": "2002",
        "grades": ["1", "2", "3"],
        "maxClass": 15
    }
}

# 한국 성씨 (빈도 순)
LAST_NAMES = [
    "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
    "한", "오", "서", "신", "권", "황", "안", "송", "류", "전",
    "홍", "고", "문", "양", "손", "배", "백", "허", "유", "남",
    "심", "노", "하", "곽", "성", "차", "주", "우", "구", "민",
    "진", "나", "지", "엄", "변", "채", "원", "천", "방", "공"
]

# 이름 글자
NAME_CHARS_MALE = [
    "준", "민", "서", "현", "우", "진", "건", "호", "성", "영",
    "재", "석", "태", "수", "혁", "용", "동", "철", "상", "기",
    "원", "정", "훈", "근", "승", "규", "형", "범", "창", "환",
    "한", "종", "광", "남", "일", "찬", "희", "경", "학", "중"
]

NAME_CHARS_FEMALE = [
    "서", "지", "민", "수", "현", "은", "연", "아", "영", "혜",
    "유", "진", "미", "정", "하", "윤", "경", "선", "주", "희",
    "린", "나", "빈", "원", "소", "채", "인", "성", "다", "예",
    "라", "율", "온", "담", "별", "솔", "이", "슬", "보", "혜"
]

# 한줄소개 템플릿
BIOS = [
    "안녕하세요! 반갑습니다 😊",
    "추억을 찾아서...",
    "오랜 친구들을 만나고 싶어요",
    "동창 여러분 보고싶어요!",
    "잘 지내고 계시죠?",
    "그때 그 시절이 그립네요",
    "우리 반 친구들 어디 있나요?",
    "연락 주세요~",
    "동창회 하고 싶다!",
    "옛 친구를 찾습니다",
    "좋은 하루 보내세요",
    "소중한 인연을 다시 찾아서",
    "반가워요 여러분!",
    "학교 다닐 때가 좋았지...",
    "다시 만나서 반가워요",
    None, None, None, None, None,  # 일부는 bio 없음
]


def generate_name():
    """랜덤 한국 이름 생성"""
    last = random.choice(LAST_NAMES)
    is_male = random.random() < 0.5
    chars = NAME_CHARS_MALE if is_male else NAME_CHARS_FEMALE

    if random.random() < 0.7:  # 70% 2글자 이름
        first = random.choice(chars) + random.choice(chars)
    else:  # 30% 1글자 이름
        first = random.choice(chars)

    return last + first


def generate_school_info(school_key):
    """학교 정보 생성"""
    school = SCHOOLS[school_key]
    grade = random.choice(school["grades"])
    class_num = str(random.randint(1, school["maxClass"]))

    return {
        "schoolCode": school["schoolCode"],
        "schoolType": school["schoolType"],
        "schoolName": school["schoolName"],
        "graduationYear": school["graduationYear"],
        "grade": grade,
        "classNumber": class_num
    }


def create_user(index):
    """사용자 생성"""
    user_id = f"classmate{index:04d}"
    name = generate_name()
    email = f"{user_id}@test.com"
    bio = random.choice(BIOS)

    # 학교 배분: 초등 ~170, 중등 ~165, 고등 ~165
    school_keys = list(SCHOOLS.keys())

    # 최소 1개, 최대 3개 학교
    # 50% 확률로 1개 학교, 30% 2개, 20% 3개
    r = random.random()
    if r < 0.5:
        num_schools = 1
    elif r < 0.8:
        num_schools = 2
    else:
        num_schools = 3

    selected_schools = random.sample(school_keys, num_schools)

    schools = []
    for sk in selected_schools:
        # 같은 학교에서 여러 학년 정보 추가 (1~2개)
        num_grades = 1 if random.random() < 0.7 else 2
        school = SCHOOLS[sk]
        used_grades = set()

        for _ in range(num_grades):
            available = [g for g in school["grades"] if g not in used_grades]
            if not available:
                break
            grade = random.choice(available)
            used_grades.add(grade)

            schools.append({
                "schoolCode": school["schoolCode"],
                "schoolType": school["schoolType"],
                "schoolName": school["schoolName"],
                "graduationYear": school["graduationYear"],
                "grade": grade,
                "classNumber": str(random.randint(1, school["maxClass"]))
            })

    signup_data = {
        "userId": user_id,
        "password": "test1234!",
        "name": name,
        "email": email,
        "schools": schools
    }

    return signup_data, bio


def main():
    success = 0
    fail = 0
    school_count = {"초등학교": 0, "중학교": 0, "고등학교": 0}

    print("=" * 60)
    print("동창 500명 생성 시작")
    print("=" * 60)

    for i in range(1, 501):
        signup_data, bio = create_user(i)

        try:
            # 회원가입
            resp = requests.post(
                f"{BASE_URL}/auth/signup",
                json=signup_data,
                timeout=10
            )

            if resp.status_code == 200:
                # bio 업데이트 (있는 경우만)
                if bio:
                    requests.put(
                        f"{BASE_URL}/users/{signup_data['userId']}/profile",
                        json={"bio": bio},
                        timeout=10
                    )

                success += 1
                for s in signup_data["schools"]:
                    school_count[s["schoolType"]] += 1

                if success % 50 == 0:
                    print(f"  진행: {success}/500 완료 | 초:{school_count['초등학교']} 중:{school_count['중학교']} 고:{school_count['고등학교']}")
            else:
                fail += 1
                if fail <= 5:
                    print(f"  실패 [{i}]: {resp.status_code} - {resp.text[:100]}")

        except Exception as e:
            fail += 1
            if fail <= 5:
                print(f"  에러 [{i}]: {str(e)[:100]}")

    print("=" * 60)
    print(f"완료! 성공: {success}, 실패: {fail}")
    print(f"학교별 등록 수 (학년 포함):")
    print(f"  초등학교(서울중마초): {school_count['초등학교']}")
    print(f"  중학교(용곡중): {school_count['중학교']}")
    print(f"  고등학교(대원고): {school_count['고등학교']}")
    print("=" * 60)


if __name__ == "__main__":
    main()
