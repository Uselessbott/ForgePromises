import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

type Props = {
  kept: number;
  current: number;
  limit: number;
  unlimited: boolean;
  onPress: () => void;
};

export function PromiseIsland({
  kept,
  current,
  limit,
  unlimited,
  onPress,
}: Props) {
  const colors = useColors();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.heart, { color: '#ef4444' }]}>
        ❤️ {kept}
      </Text>

      <View
        style={[
          styles.badge,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text style={[styles.badgeText, { color: colors.foreground }]}>
          {unlimited ? '∞' : `${current}/${limit}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  heart: {
    fontSize: 17,
    fontWeight: '700',
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  badgeText: {
    fontWeight: '700',
    fontSize: 13,
  },
});
