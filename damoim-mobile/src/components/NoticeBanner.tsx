import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI, AnnouncementItem } from '../api/admin';
import { userAPI } from '../api/user';
import { useAuth } from '../hooks/useAuth';

// 웹 Layout.tsx와 동일한 구조:
// - 기본 메시지 레이어 (idle일 때 active)
// - 공지 이벤트 레이어 (slide-in/slide-out)
type AnimState = 'idle' | 'slide-in' | 'slide-out';

export default function NoticeBanner() {
  const { user } = useAuth();
  const [onlineCount, setOnlineCount] = useState(0);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);

  // 웹과 동일: bannerEvent + bannerAnimState 구조
  const [bannerEvent, setBannerEvent] = useState<{ text: string; isAnnouncement?: boolean } | null>(null);
  const [bannerAnimState, setBannerAnimState] = useState<AnimState>('idle');

  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announcementTimersRef = useRef<ReturnType<typeof setInterval>[]>([]);

  // 애니메이션 값: 기본 레이어
  const defaultOpacity = useRef(new Animated.Value(1)).current;
  const defaultSlide = useRef(new Animated.Value(0)).current;
  // 애니메이션 값: 이벤트 레이어
  const eventOpacity = useRef(new Animated.Value(0)).current;
  const eventSlide = useRef(new Animated.Value(20)).current;

  // ---- 접속 중인 동창 수 로드 ----
  const loadOnlineCount = useCallback(async () => {
    if (!user) return;
    try {
      const profile = await userAPI.getProfile(user.userId);
      const allOnline = new Map<string, boolean>();
      const promises = profile.schools
        .filter(s => s.schoolCode && s.graduationYear)
        .map(s =>
          userAPI.searchClassmates(user.userId, s.schoolCode!, s.graduationYear)
            .catch(() => ({ classmates: [], totalCount: 0 }))
        );
      const results = await Promise.all(promises);
      for (const r of results) {
        for (const c of r.classmates) {
          if (!allOnline.has(c.userId)) allOnline.set(c.userId, true);
        }
      }
      setOnlineCount(allOnline.size);
    } catch {}
  }, [user]);

  // ---- 공지사항 로드 ----
  const loadAnnouncements = useCallback(async () => {
    try {
      const data = await adminAPI.getActiveAnnouncements();
      setAnnouncements(data.filter(a => a.active));
    } catch {}
  }, []);

  useEffect(() => {
    loadOnlineCount();
    loadAnnouncements();
    const onlineInterval = setInterval(loadOnlineCount, 10000);
    const announceInterval = setInterval(loadAnnouncements, 30000);
    return () => {
      clearInterval(onlineInterval);
      clearInterval(announceInterval);
    };
  }, [loadOnlineCount, loadAnnouncements]);

  // animState 변경에 따라 실제 애니메이션 실행
  useEffect(() => {
    const duration = 400;

    if (bannerAnimState === 'idle') {
      // 기본 메시지 보이기, 이벤트 숨기기
      Animated.parallel([
        Animated.timing(defaultOpacity, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(defaultSlide, { toValue: 0, duration, useNativeDriver: true }),
        Animated.timing(eventOpacity, { toValue: 0, duration, useNativeDriver: true }),
        Animated.timing(eventSlide, { toValue: 20, duration, useNativeDriver: true }),
      ]).start();
    } else if (bannerAnimState === 'slide-out') {
      // 기본 메시지 slide out
      Animated.parallel([
        Animated.timing(defaultOpacity, { toValue: 0, duration, useNativeDriver: true }),
        Animated.timing(defaultSlide, { toValue: -20, duration, useNativeDriver: true }),
      ]).start();
    } else if (bannerAnimState === 'slide-in') {
      // 이벤트 메시지 slide in
      eventSlide.setValue(20);
      Animated.parallel([
        Animated.timing(defaultOpacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(eventOpacity, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(eventSlide, { toValue: 0, duration, useNativeDriver: true }),
      ]).start();
    }
  }, [bannerAnimState]);

  // ---- 공지사항 interval 타이머 (웹 Layout.tsx와 동일 로직) ----
  useEffect(() => {
    announcementTimersRef.current.forEach(t => clearInterval(t));
    announcementTimersRef.current = [];
    if (announcements.length === 0) return;

    const showAnnouncement = (a: AnnouncementItem) => {
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);

      // 1) slide-out 현재 내용
      setBannerAnimState('slide-out');

      setTimeout(() => {
        // 2) 공지 내용 설정 + slide-in
        setBannerEvent({ text: `[공지] ${a.title} - ${a.content}`, isAnnouncement: true });
        setBannerAnimState('slide-in');

        // 3) 6초 후 복귀
        bannerTimeoutRef.current = setTimeout(() => {
          setBannerAnimState('slide-out');
          setTimeout(() => {
            setBannerEvent(null);
            setBannerAnimState('idle');
          }, 550);
        }, 6000);
      }, 550);
    };

    // 각 공지사항마다 개별 interval 타이머
    announcements.forEach((a, i) => {
      const intervalMs = (a.intervalSeconds || 30) * 1000;
      const firstDelay = 3000 + i * 2000;
      const firstTimer = setTimeout(() => {
        showAnnouncement(a);
        const repeater = setInterval(() => showAnnouncement(a), intervalMs);
        announcementTimersRef.current.push(repeater);
      }, firstDelay);
      announcementTimersRef.current.push(firstTimer as unknown as ReturnType<typeof setInterval>);
    });

    return () => {
      announcementTimersRef.current.forEach(t => clearInterval(t));
      announcementTimersRef.current = [];
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    };
  }, [announcements]);

  if (!user) return null;

  const isAnnouncement = bannerEvent?.isAnnouncement;

  return (
    <View style={[styles.container, isAnnouncement && bannerAnimState === 'slide-in' && styles.containerAnnouncement]}>
      <Ionicons
        name={isAnnouncement && bannerAnimState === 'slide-in' ? 'megaphone-outline' : 'happy-outline'}
        size={14}
        color={isAnnouncement && bannerAnimState === 'slide-in' ? '#b45309' : '#1d4ed8'}
      />
      <View style={styles.roller}>
        {/* 기본 메시지 레이어 */}
        <Animated.Text
          style={[
            styles.text,
            styles.layerText,
            { opacity: defaultOpacity, transform: [{ translateY: defaultSlide }] },
          ]}
          numberOfLines={1}
        >
          반가워요, {user.name}님! 현재 {onlineCount}명의 동창이 접속 중이에요
        </Animated.Text>
        {/* 이벤트(공지) 메시지 레이어 */}
        {bannerEvent && (
          <Animated.Text
            style={[
              styles.text,
              styles.layerText,
              styles.textAnnouncement,
              { opacity: eventOpacity, transform: [{ translateY: eventSlide }] },
            ]}
            numberOfLines={1}
          >
            {bannerEvent.text}
          </Animated.Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
    overflow: 'hidden',
  },
  containerAnnouncement: {
    backgroundColor: '#fffbeb',
    borderBottomColor: '#fde68a',
  },
  roller: {
    flex: 1,
    height: 18,
    position: 'relative',
  },
  layerText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e40af',
  },
  textAnnouncement: {
    color: '#92400e',
  },
});
