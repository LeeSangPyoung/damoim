import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { userAPI, SchoolInfo } from '../api/user';
import { postAPI } from '../api/post';
import { Colors } from '../constants/colors';
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
    case '초등학교': return 'leaf';
    case '중학교': return 'book';
    case '고등학교': return 'school';
    case '대학교': return 'business';
    default: return 'school';
  }
}

function getSchoolTypeColor(type: string): string {
  switch (type) {
    case '초등학교': return '#10b981';
    case '중학교': return '#3b82f6';
    case '고등학교': return '#8b5cf6';
    case '대학교': return '#f59e0b';
    default: return Colors.primary;
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
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>학교 정보를 불러오는 중...</Text>
      </View>
    );
  }

  const totalClassmates = schools.reduce((acc, s) => acc + s.classmateCount, 0);
  const totalNewPosts = schools.reduce((acc, s) => acc + s.newPostCount, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>우리학교</Text>
        <HeaderActions navigation={navigation} />
      </View>

      <NoticeBanner />

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="school-outline" size={24} color="#3b82f6" />
            <Text style={[styles.summaryValue, { color: '#3b82f6' }]}>{schools.length}</Text>
            <Text style={styles.summaryLabel}>등록 학교</Text>
          </View>
          <TouchableOpacity
            style={[styles.summaryCard, { backgroundColor: '#f0fdf4' }]}
            activeOpacity={0.7}
            onPress={() => navigation.getParent()?.navigate('Friends', { initialTab: 'search', autoSearch: true })}
          >
            <Ionicons name="people-outline" size={24} color="#10b981" />
            <Text style={[styles.summaryValue, { color: '#10b981' }]}>{totalClassmates}</Text>
            <Text style={styles.summaryLabel}>전체 동창</Text>
          </TouchableOpacity>
          <View style={[styles.summaryCard, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="document-text-outline" size={24} color="#f59e0b" />
            <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>{totalNewPosts}</Text>
            <Text style={styles.summaryLabel}>새 글</Text>
          </View>
        </View>

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
                    <Ionicons name={typeIcon} size={24} color="#fff" />
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

                {/* Stats Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="people" size={14} color={Colors.textSecondary} />
                    <Text style={styles.statText}>동창 {school.classmateCount}명</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="document-text" size={14} color={Colors.textSecondary} />
                    <Text style={styles.statText}>새 글 {school.newPostCount}개</Text>
                  </View>
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
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
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
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 11,
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
    color: Colors.primary,
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
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
    backgroundColor: '#ef4444',
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
    fontSize: 12,
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
    borderTopColor: '#f1f5f9',
  },
  gradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    borderTopColor: '#f1f5f9',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: '600',
  },
});
