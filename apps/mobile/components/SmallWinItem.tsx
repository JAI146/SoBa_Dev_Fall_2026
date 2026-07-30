import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '@/constants/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

type SmallWinItemProps = {
  title: string;
  time: string;
  icon: IoniconName;
  completed: boolean;
  onToggle: () => void;
};

export function SmallWinItem({
  title,
  time,
  icon,
  completed,
  onToggle,
}: SmallWinItemProps) {
  return (
    <TouchableOpacity
      accessibilityLabel={`${completed ? 'Completed' : 'Mark complete'}: ${title}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: completed }}
      activeOpacity={0.76}
      onPress={onToggle}
      style={[styles.card, completed && styles.cardCompleted]}>
      <View style={[styles.check, completed && styles.checkCompleted]}>
        {completed ? <Ionicons color={theme.colors.white} name="checkmark" size={18} /> : null}
      </View>
      <View style={[styles.icon, completed && styles.iconCompleted]}>
        <Ionicons color={theme.colors.deepGreen} name={icon} size={20} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, completed && styles.titleCompleted]}>{title}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      <Ionicons color={theme.colors.disabled} name="chevron-forward" size={19} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 76,
    padding: theme.spacing.sm,
  },
  cardCompleted: {
    backgroundColor: theme.colors.lightMint,
    borderColor: theme.colors.mint,
  },
  check: {
    alignItems: 'center',
    borderColor: theme.colors.disabled,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  checkCompleted: {
    backgroundColor: theme.colors.deepGreen,
    borderColor: theme.colors.deepGreen,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  iconCompleted: {
    backgroundColor: theme.colors.white,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
    lineHeight: 20,
  },
  titleCompleted: {
    color: theme.colors.deepGreen,
  },
  time: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    marginTop: 3,
  },
});
