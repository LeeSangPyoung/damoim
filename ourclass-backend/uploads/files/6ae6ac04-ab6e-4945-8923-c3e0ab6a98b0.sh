#!/bin/bash
# leesp의 동창 500명 랜덤 생성 스크립트

BASE_URL="http://localhost:8080/api"

# 한국 성씨
LAST_NAMES=("김" "이" "박" "최" "정" "강" "조" "윤" "장" "임" "한" "오" "서" "신" "권" "황" "안" "송" "류" "전" "홍" "고" "문" "양" "손" "배" "백" "허" "유" "남" "심" "노" "하" "곽" "성" "차" "주" "우" "구" "민")

# 이름 글자
NAME_CHARS=("준" "민" "서" "현" "우" "진" "건" "호" "성" "영" "재" "석" "태" "수" "혁" "용" "동" "철" "상" "기" "원" "정" "훈" "근" "승" "지" "은" "연" "아" "혜" "유" "미" "하" "윤" "경" "선" "주" "희" "린" "나")

# bio 목록
BIOS=("안녕하세요! 반갑습니다" "추억을 찾아서..." "오랜 친구들을 만나고 싶어요" "동창 여러분 보고싶어요!" "잘 지내고 계시죠?" "그때 그 시절이 그립네요" "우리 반 친구들 어디 있나요?" "연락 주세요~" "동창회 하고 싶다!" "옛 친구를 찾습니다" "좋은 하루 보내세요" "소중한 인연을 다시 찾아서" "반가워요 여러분!" "학교 다닐 때가 좋았지..." "다시 만나서 반가워요" "" "" "" "" "")

# 학교 정보
# 초등학교: schoolCode=7134112, 서울중마초등학교, 1996, grade 1-6, class 1-8
# 중학교: schoolCode=7134139, 용곡중학교, 1999, grade 1-3, class 1-12
# 고등학교: schoolCode=7010141, 대원고등학교, 2002, grade 1-3, class 1-15

SUCCESS=0
FAIL=0
ELEM=0
MID=0
HIGH=0

echo "============================================================"
echo "동창 500명 생성 시작"
echo "============================================================"

for i in $(seq 1 500); do
    USER_ID=$(printf "classmate%04d" $i)
    EMAIL="${USER_ID}@test.com"

    # 랜덤 이름
    LAST=${LAST_NAMES[$((RANDOM % ${#LAST_NAMES[@]}))]}
    C1=${NAME_CHARS[$((RANDOM % ${#NAME_CHARS[@]}))]}
    C2=${NAME_CHARS[$((RANDOM % ${#NAME_CHARS[@]}))]}
    if (( RANDOM % 10 < 7 )); then
        NAME="${LAST}${C1}${C2}"
    else
        NAME="${LAST}${C1}"
    fi

    # 학교 배분 (초/중/고 골고루)
    R=$((RANDOM % 100))

    # 학교 JSON 생성
    SCHOOLS_JSON=""

    if (( R < 20 )); then
        # 초등학교만
        G=$((RANDOM % 6 + 1))
        C=$((RANDOM % 8 + 1))
        SCHOOLS_JSON="{\"schoolCode\":\"7134112\",\"schoolType\":\"초등학교\",\"schoolName\":\"서울중마초등학교\",\"graduationYear\":\"1996\",\"grade\":\"$G\",\"classNumber\":\"$C\"}"
        ELEM=$((ELEM+1))
    elif (( R < 40 )); then
        # 중학교만
        G=$((RANDOM % 3 + 1))
        C=$((RANDOM % 12 + 1))
        SCHOOLS_JSON="{\"schoolCode\":\"7134139\",\"schoolType\":\"중학교\",\"schoolName\":\"용곡중학교\",\"graduationYear\":\"1999\",\"grade\":\"$G\",\"classNumber\":\"$C\"}"
        MID=$((MID+1))
    elif (( R < 60 )); then
        # 고등학교만
        G=$((RANDOM % 3 + 1))
        C=$((RANDOM % 15 + 1))
        SCHOOLS_JSON="{\"schoolCode\":\"7010141\",\"schoolType\":\"고등학교\",\"schoolName\":\"대원고등학교\",\"graduationYear\":\"2002\",\"grade\":\"$G\",\"classNumber\":\"$C\"}"
        HIGH=$((HIGH+1))
    elif (( R < 73 )); then
        # 초+중
        G1=$((RANDOM % 6 + 1)); C1R=$((RANDOM % 8 + 1))
        G2=$((RANDOM % 3 + 1)); C2R=$((RANDOM % 12 + 1))
        SCHOOLS_JSON="{\"schoolCode\":\"7134112\",\"schoolType\":\"초등학교\",\"schoolName\":\"서울중마초등학교\",\"graduationYear\":\"1996\",\"grade\":\"$G1\",\"classNumber\":\"$C1R\"},{\"schoolCode\":\"7134139\",\"schoolType\":\"중학교\",\"schoolName\":\"용곡중학교\",\"graduationYear\":\"1999\",\"grade\":\"$G2\",\"classNumber\":\"$C2R\"}"
        ELEM=$((ELEM+1)); MID=$((MID+1))
    elif (( R < 86 )); then
        # 중+고
        G1=$((RANDOM % 3 + 1)); C1R=$((RANDOM % 12 + 1))
        G2=$((RANDOM % 3 + 1)); C2R=$((RANDOM % 15 + 1))
        SCHOOLS_JSON="{\"schoolCode\":\"7134139\",\"schoolType\":\"중학교\",\"schoolName\":\"용곡중학교\",\"graduationYear\":\"1999\",\"grade\":\"$G1\",\"classNumber\":\"$C1R\"},{\"schoolCode\":\"7010141\",\"schoolType\":\"고등학교\",\"schoolName\":\"대원고등학교\",\"graduationYear\":\"2002\",\"grade\":\"$G2\",\"classNumber\":\"$C2R\"}"
        MID=$((MID+1)); HIGH=$((HIGH+1))
    else
        # 초+중+고 전부
        G1=$((RANDOM % 6 + 1)); C1R=$((RANDOM % 8 + 1))
        G2=$((RANDOM % 3 + 1)); C2R=$((RANDOM % 12 + 1))
        G3=$((RANDOM % 3 + 1)); C3R=$((RANDOM % 15 + 1))
        SCHOOLS_JSON="{\"schoolCode\":\"7134112\",\"schoolType\":\"초등학교\",\"schoolName\":\"서울중마초등학교\",\"graduationYear\":\"1996\",\"grade\":\"$G1\",\"classNumber\":\"$C1R\"},{\"schoolCode\":\"7134139\",\"schoolType\":\"중학교\",\"schoolName\":\"용곡중학교\",\"graduationYear\":\"1999\",\"grade\":\"$G2\",\"classNumber\":\"$C2R\"},{\"schoolCode\":\"7010141\",\"schoolType\":\"고등학교\",\"schoolName\":\"대원고등학교\",\"graduationYear\":\"2002\",\"grade\":\"$G3\",\"classNumber\":\"$C3R\"}"
        ELEM=$((ELEM+1)); MID=$((MID+1)); HIGH=$((HIGH+1))
    fi

    # 회원가입 요청
    SIGNUP_JSON="{\"userId\":\"$USER_ID\",\"password\":\"test1234!\",\"name\":\"$NAME\",\"email\":\"$EMAIL\",\"schools\":[$SCHOOLS_JSON]}"

    RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/auth/signup" \
        -H "Content-Type: application/json" \
        -d "$SIGNUP_JSON")

    if [ "$RESP" = "200" ]; then
        # bio 업데이트 (50% 확률)
        BIO_IDX=$((RANDOM % ${#BIOS[@]}))
        BIO_TEXT="${BIOS[$BIO_IDX]}"
        if [ -n "$BIO_TEXT" ]; then
            curl -s -o /dev/null -X PUT "$BASE_URL/users/$USER_ID/profile" \
                -H "Content-Type: application/json" \
                -d "{\"bio\":\"$BIO_TEXT\"}"
        fi
        SUCCESS=$((SUCCESS+1))
    else
        FAIL=$((FAIL+1))
        if [ $FAIL -le 3 ]; then
            echo "  실패 [$i]: HTTP $RESP"
        fi
    fi

    # 진행 상황 출력
    if (( SUCCESS % 50 == 0 && SUCCESS > 0 )); then
        echo "  진행: $SUCCESS/500 완료 | 초:$ELEM 중:$MID 고:$HIGH"
    fi
done

echo "============================================================"
echo "완료! 성공: $SUCCESS, 실패: $FAIL"
echo "학교별 등록 수:"
echo "  초등학교(서울중마초): $ELEM 명"
echo "  중학교(용곡중): $MID 명"
echo "  고등학교(대원고): $HIGH 명"
echo "============================================================"
