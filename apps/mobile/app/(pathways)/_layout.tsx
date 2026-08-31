import { Tier } from '@purposemint/contracts'; import { Redirect, Stack } from 'expo-router';
import { PathwaysProvider } from '@/contexts/PathwaysContext'; import { useAuth } from '@/contexts/AuthContext';
export default function PathwaysLayout(){const {session}=useAuth();if(session?.user.tier!==Tier.ELEVATE)return <Redirect href="/(tabs)"/>;return <PathwaysProvider><Stack screenOptions={{headerShown:false,animation:'slide_from_right'}}/></PathwaysProvider>}
