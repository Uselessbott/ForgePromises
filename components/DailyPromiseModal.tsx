import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

type Habit = {
  id: string;
  emoji?: string;
  name: string;
};

type Props = {
  visible: boolean;
  promises: Habit[];
  onConfirm: (id: string) => void;
};

export function DailyPromiseModal({
  visible,
  promises,
  onConfirm,
}: Props) {
  const colors = useColors();
  const [selected, setSelected] = useState<string>();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              { color: colors.foreground },
            ]}
          >
            ❤️ Today's Promise
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: colors.mutedForeground },
            ]}
          >
            Choose one promise you'll keep today.
          </Text>

          {promises.map((habit) => {
            const active = selected === habit.id;

            return (
              <TouchableOpacity
                key={habit.id}
                onPress={() => setSelected(habit.id)}
                style={[
                  styles.item,
                  {
                    borderColor: active
                      ? colors.primary
                      : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.foreground,
                    fontSize: 16,
                  }}
                >
                  {habit.emoji ?? '❤️'} {habit.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            disabled={!selected}
            onPress={async () => {
              await Haptics.impactAsync(
                Haptics.ImpactFeedbackStyle.Light
              );

              if (selected) onConfirm(selected);
            }}
            style={[
              styles.button,
              {
                backgroundColor: colors.primary,
                opacity: selected ? 1 : 0.5,
              },
            ]}
          >
            <Text style={styles.buttonText}>
              Confirm Promise
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0008',
  },

  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },

  subtitle: {
    marginBottom: 20,
  },

  item: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },

  button: {
    marginTop: 10,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
