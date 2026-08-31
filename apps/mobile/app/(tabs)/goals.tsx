import type { UserGoalPublic } from '@purposemint/contracts';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { AppScreen } from '@/components/AppScreen';
import { ChangeGoalModal } from '@/components/dashboard/ChangeGoalModal';
import { LogSavingsModal } from '@/components/dashboard/LogSavingsModal';
import { QueryErrorState } from '@/components/QueryErrorState';
import { theme } from '@/constants/theme';
import { useDashboard } from '@/hooks/use-dashboard';
import { formatUsdExact } from '@/lib/format/money';

export default function GoalsScreen() {
  const dashboard = useDashboard();
  const [goalOpen, setGoalOpen] = useState(false);
  const [logGoal, setLogGoal] = useState<UserGoalPublic | null>(null);
  if (dashboard.isError) return <QueryErrorState message={dashboard.error instanceof Error ? dashboard.error.message : 'Please try again.'} onRetry={() => void dashboard.refetch()} />;
  if (dashboard.isLoading || !dashboard.data) return <AppScreen><ActivityIndicator color={theme.colors.deepGreen} /></AppScreen>;
  return <AppScreen contentContainerStyle={styles.content}>
    <View style={styles.between}><Text style={styles.heading}>Goals</Text><Pressable accessibilityLabel="Add a goal" accessibilityRole="button" onPress={() => setGoalOpen(true)} style={styles.add}><Text style={styles.addText}>+ Add goal</Text></Pressable></View>
    {dashboard.data.goals.length === 0 ? <Text style={styles.empty}>No savings goals yet. Add one when you're ready to start tracking progress.</Text> : dashboard.data.goals.map((goal) => <View key={goal.id} style={[styles.card, goal.isFocus && styles.focus]}>
      <View style={styles.between}><Text style={styles.title}>{goal.iconEmoji} {goal.title}</Text>{goal.isFocus ? <Text style={styles.chip}>Focus goal</Text> : null}</View>
      <AnimatedProgressBar progress={goal.progressPercent / 100} />
      <View style={styles.between}><Text style={styles.meta}>{formatUsdExact(goal.savedAmount)} saved</Text><Text style={styles.meta}>{formatUsdExact(goal.targetAmount)} target</Text></View>
      <View style={styles.actions}>{!goal.isFocus ? <Pressable accessibilityLabel={`Make ${goal.title} the focus goal`} accessibilityRole="button" onPress={() => void dashboard.setFocusGoal(goal.id)} style={styles.action}><Text style={styles.actionText}>Make focus</Text></Pressable> : null}<Pressable accessibilityLabel={`Log savings toward ${goal.title}`} accessibilityRole="button" onPress={() => setLogGoal(goal)} style={styles.action}><Text style={styles.actionText}>Log savings</Text></Pressable></View>
    </View>)}
    <ChangeGoalModal focusGoalId={dashboard.data.focusGoal?.id ?? null} goals={dashboard.data.goals} onClose={() => setGoalOpen(false)} onCreate={dashboard.createGoal} onSelect={dashboard.setFocusGoal} visible={goalOpen} />
    <LogSavingsModal goalTitle={logGoal?.title ?? null} onClose={() => setLogGoal(null)} onSave={async (amount, note) => { if (logGoal) await dashboard.logSavings({ goalId: logGoal.id, amount, note }); }} saving={dashboard.loggingSavings} visible={Boolean(logGoal)} />
  </AppScreen>;
}

const styles = StyleSheet.create({ content:{gap:16}, heading:{color:theme.colors.text,fontSize:34,fontWeight:'900'}, between:{alignItems:'center',flexDirection:'row',justifyContent:'space-between'}, add:{justifyContent:'center',minHeight:44,paddingHorizontal:12}, addText:{color:theme.colors.deepGreen,fontWeight:'900'}, card:{backgroundColor:theme.colors.white,borderColor:theme.colors.border,borderRadius:20,borderWidth:1,gap:12,padding:16}, focus:{borderColor:theme.colors.deepGreen,borderWidth:2}, title:{color:theme.colors.text,flex:1,fontSize:17,fontWeight:'900'}, chip:{backgroundColor:theme.colors.lightMint,borderRadius:999,color:theme.colors.deepGreen,fontSize:11,fontWeight:'900',padding:7}, meta:{color:theme.colors.mutedText,fontSize:13,fontWeight:'700'}, actions:{flexDirection:'row',gap:8}, action:{alignItems:'center',borderColor:theme.colors.deepGreen,borderRadius:14,borderWidth:1,justifyContent:'center',minHeight:44,paddingHorizontal:14}, actionText:{color:theme.colors.deepGreen,fontWeight:'800'}, empty:{backgroundColor:theme.colors.white,borderRadius:18,color:theme.colors.mutedText,lineHeight:21,padding:18} });
