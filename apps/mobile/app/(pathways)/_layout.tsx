import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { PathwaysProvider } from "@/contexts/PathwaysContext";
import { useSubscriptionPlans } from "@/hooks/use-subscriptions";
import { QueryErrorState } from "@/components/QueryErrorState";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";

export default function PathwaysLayout() {
  const membership = useSubscriptionPlans();
  const { session, isBootstrapping } = useAuth();
  if (!isBootstrapping && !session) return <Redirect href="/(auth)/login" />;
  if (membership.isError)
    return (
      <QueryErrorState
        message="Your subscription could not be loaded."
        onRetry={() => void membership.refetch()}
      />
    );
  if (membership.isLoading || !membership.data)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator color={theme.colors.deepGreen} />
      </View>
    );
  if (!membership.data.currentSubscription.entitlements.pathways)
    return <Redirect href="/pricing" />;
  return (
    <PathwaysProvider>
      <Stack
        screenOptions={{ headerShown: false, animation: "slide_from_right" }}
      />
    </PathwaysProvider>
  );
}
