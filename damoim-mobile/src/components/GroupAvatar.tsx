import React from 'react';
import { View, Image, Text } from 'react-native';
import { Colors } from '../constants/colors';

interface Member {
  userId: string;
  name: string;
  profileImageUrl?: string;
}

interface Props {
  members: Member[];
  size?: number;
}

const COLORS = ['#e8b4b8', '#b4d4e8', '#b8e8b4', '#e8d4b4', '#d4b4e8', '#e8e4b4'];

function getColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function GroupAvatar({ members, size = 48 }: Props) {
  // 프로필 사진 있는 사람 우선 정렬
  const sorted = [...members].sort((a, b) => {
    if (a.profileImageUrl && !b.profileImageUrl) return -1;
    if (!a.profileImageUrl && b.profileImageUrl) return 1;
    return 0;
  });

  const slots = sorted.slice(0, 4);
  const count = slots.length;
  const r = size / 2;

  const renderSlot = (member: Member, slotSize: number, borderRadius: number) => {
    if (member.profileImageUrl) {
      return (
        <Image
          source={{ uri: member.profileImageUrl }}
          style={{ width: slotSize, height: slotSize, borderRadius }}
        />
      );
    }
    const initial = member.name.charAt(0);
    return (
      <View style={{
        width: slotSize, height: slotSize, borderRadius,
        backgroundColor: getColor(member.name),
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Text style={{ fontSize: slotSize * 0.45, fontWeight: '700', color: '#fff' }}>{initial}</Text>
      </View>
    );
  };

  if (count === 0) {
    return (
      <View style={{ width: size, height: size, borderRadius: r, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: size * 0.4, fontWeight: '700', color: Colors.primary }}>?</Text>
      </View>
    );
  }

  if (count === 1) {
    return (
      <View style={{ width: size, height: size, borderRadius: r, overflow: 'hidden' }}>
        {renderSlot(slots[0], size, r)}
      </View>
    );
  }

  if (count === 2) {
    const half = size / 2;
    return (
      <View style={{ width: size, height: size, borderRadius: r, overflow: 'hidden' }}>
        <View style={{ width: size, height: half, alignItems: 'center', justifyContent: 'center', backgroundColor: getColor(slots[0].name) }}>
          {slots[0].profileImageUrl ? (
            <Image source={{ uri: slots[0].profileImageUrl }} style={{ width: size, height: half }} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: half * 0.5, fontWeight: '700', color: '#fff' }}>{slots[0].name.charAt(0)}</Text>
          )}
        </View>
        <View style={{ width: size, height: half, alignItems: 'center', justifyContent: 'center', backgroundColor: getColor(slots[1].name) }}>
          {slots[1].profileImageUrl ? (
            <Image source={{ uri: slots[1].profileImageUrl }} style={{ width: size, height: half }} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: half * 0.5, fontWeight: '700', color: '#fff' }}>{slots[1].name.charAt(0)}</Text>
          )}
        </View>
      </View>
    );
  }

  // 3 or 4
  const quarter = size / 2;
  return (
    <View style={{ width: size, height: size, borderRadius: r, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap' }}>
      {renderSlot(slots[0], quarter, 0)}
      {renderSlot(slots[1], quarter, 0)}
      {renderSlot(slots[2], quarter, 0)}
      {count >= 4
        ? renderSlot(slots[3], quarter, 0)
        : <View style={{ width: quarter, height: quarter, backgroundColor: Colors.gray200, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: quarter * 0.5, color: Colors.gray400 }}>+</Text>
          </View>
      }
    </View>
  );
}
