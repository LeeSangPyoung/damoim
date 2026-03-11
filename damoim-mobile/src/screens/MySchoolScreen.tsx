import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { userAPI, SchoolInfo } from '../api/user';
import { postAPI } from '../api/post';
import { Colors, Fonts } from '../constants/colors';
import { HEADER_TOP_PADDING } from '../constants/config';
import HeaderActions from '../components/HeaderActions';
import NoticeBanner from '../components/NoticeBanner';

interface GradeClass {
  grade?: string;
  classNumber?: string;
}

interface SchoolWithStats extends SchoolInfo {
  classmateCount: number;
  newPostCount: number;
  gradeClasses: GradeClass[];
}

function groupSchools(schools: SchoolInfo[]): (SchoolInfo & { gradeClasses: GradeClass[] })[] {
  const map = new Map<string, SchoolInfo & { gradeClasses: GradeClass[] }>();
  for (const s of schools) {
    const key = `${s.schoolType}|${s.schoolName}|${s.graduationYear}`;
    if (map.has(key)) {
      const existing = map.get(key)!;
      if (s.grade || s.classNumber) {
        existing.gradeClasses.push({ grade: s.grade, classNumber: s.classNumber });
      }
    } else {
      const gradeClasses: GradeClass[] = [];
      if (s.grade || s.classNumber) {
        gradeClasses.push({ grade: s.grade, classNumber: s.classNumber });
      }
      map.set(key, { ...s, gradeClasses });
    }
  }
  return Array.from(map.values());
}

function getSchoolTypeIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case '초등학교': return 'leaf-outline';
    case '중학교': return 'book-outline';
    case '고등학교': return 'home-outline';
    case '대학교': return 'school-outline';
    default: return 'home-outline';
  }
}

function getSchoolTypeColor(type: string): string {
  switch (type) {
    case '초등학교': return '#5D8A3C';
    case '중학교': return '#2D5016';
    case '고등학교': return '#8B6914';
    case '대학교': return '#5D4037';
    default: return '#2D5016';
  }
}

export default function MySchoolScreen({ navigation }: any) {
  const { user } = useAuth();
  const [schools, setSchools] = useState<SchoolWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const profile = await userAPI.getProfile(user.userId);
      const grouped = groupSchools(profile.schools);

      const schoolsWithStats = await Promise.all(
        grouped
          .filter(s => s.schoolType !== '대학교')
          .map(async (school) => {
            try {
              const [classmatesData, newPostCount] = await Promise.all([
                school.schoolCode
                  ? userAPI.searchClassmates(user.userId, school.schoolCode, school.graduationYear)
                  : Promise.resolve({ classmates: [], totalCount: 0 }),
                postAPI.getNewPostCountForSchool(user.userId, school.schoolName, school.graduationYear),
              ]);
              return {
                ...school,
                classmateCount: classmatesData.totalCount,
                newPostCount,
              };
            } catch {
              return { ...school, classmateCount: 0, newPostCount: 0 };
            }
          })
      );
      setSchools(schoolsWithStats);
    } catch (error) {
      console.error('학교 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSchoolPress = (school: SchoolWithStats) => {
    navigation.navigate('Board', {
      schoolName: school.schoolName,
      graduationYear: school.graduationYear,
      schoolCode: school.schoolCode || '',
    });
  };

  const handleGradePress = (school: SchoolWithStats, gc: GradeClass) => {
    navigation.navigate('Board', {
      schoolName: school.schoolName,
      graduationYear: school.graduationYear,
      schoolCode: school.schoolCode || '',
      tab: 'myClass',
      grade: gc.grade,
      classNumber: gc.classNumber,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={'#2D5016'} />
        <Text style={styles.loadingText}>학교 정보를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="school" size={33} color="#fff" style={{ marginTop: -3 }} />
          <Text style={styles.headerTitle}>우리학교</Text>
        </View>
        <HeaderActions navigation={navigation} />
      </View>

      <NoticeBanner />

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionGuide}>
            <Text style={styles.sectionGuideHighlight}>{schools.length}개의 모교</Text>가 등록되어 있어요{'\n'}
            <Text style={styles.sectionGuideLight}>학교를 선택하면 게시글을 확인할 수 있어요</Text>
          </Text>
        </View>

        {/* School Cards */}
        {schools.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="school-outline" size={56} color={Colors.gray300} />
            <Text style={styles.emptyText}>등록된 학교가 없습니다</Text>
            <Text style={styles.emptySubText}>프로필에서 학교 정보를 등록해주세요</Text>
          </View>
        ) : (
          schools.map((school) => {
            const typeColor = getSchoolTypeColor(school.schoolType);
            const typeIcon = getSchoolTypeIcon(school.schoolType);
            return (
              <TouchableOpacity
                key={`${school.schoolName}-${school.graduationYear}`}
                style={styles.schoolCard}
                onPress={() => handleSchoolPress(school)}
                activeOpacity={0.7}
              >
                {/* Card Top: Icon + Info */}
                <View style={styles.cardTop}>
                  <View style={[styles.iconCircle, { backgroundColor: typeColor }]}>
                    <Ionicons name={typeIcon} size={26} color="#FFE156" />
                  </View>
                  <View style={styles.cardInfo}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.schoolName}>{school.schoolName}</Text>
                      {school.newPostCount > 0 && (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>NEW {school.newPostCount}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardMeta}>
                      <View style={[styles.typeBadge, { backgroundColor: typeColor + '18' }]}>
                        <Text style={[styles.typeBadgeText, { color: typeColor }]}>{school.schoolType}</Text>
                      </View>
                      <Text style={styles.gradYear}>{school.graduationYear}년 졸업</Text>
                    </View>
                  </View>
                </View>

                {/* Grade/Class Chips */}
                {school.gradeClasses.length > 0 && (
                  <View style={styles.gradeRow}>
                    {school.gradeClasses
                      .slice()
                      .sort((a, b) => Number(a.grade || 0) - Number(b.grade || 0))
                      .map((gc, i) => (
                        <TouchableOpacity
                          key={i}
                          style={styles.gradeChip}
                          onPress={() => handleGradePress(school, gc)}
                        >
                          <Ionicons name="grid-outline" size={12} color={typeColor} />
                          <Text style={[styles.gradeChipText, { color: typeColor }]}>
                            {gc.grade}학년 {gc.classNumber}반
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                )}

                {/* Bottom Arrow */}
                <View style={styles.statsRow}>
                  <View style={{ flex: 1 }} />
                  <View style={styles.cardArrow}>
                    <Text style={[styles.cardArrowText, { color: typeColor }]}>게시판 보기</Text>
                    <Ionicons name="chevron-forward" size={16} color={typeColor} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: HEADER_TOP_PADDING,
    paddingBottom: 12,
    backgroundColor: '#2D5016',
    borderBottomWidth: 3,
    borderBottomColor: '#C49A2A',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 2,
    fontFamily: Fonts.bold,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#F0E0B0',
    shadowColor: '#8B6914',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: Fonts.bold,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  // Section
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: Fonts.bold,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionGuide: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  sectionGuideHighlight: {
    fontWeight: '700',
    color: '#2D5016',
  },
  sectionGuideLight: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptySubText: {
    fontSize: 13,
    color: Colors.gray400,
  },
  // School Card
  schoolCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0E0B0',
    shadowColor: '#8B6914',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  schoolName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  newBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  gradYear: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  // Grades
  gradeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0E0B0',
  },
  gradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF8E7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F0E0B0',
  },
  gradeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0E0B0',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  cardArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 2,
  },
  cardArrowText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
