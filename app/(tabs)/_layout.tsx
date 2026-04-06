import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors, FontSize } from '@/constants/theme'
import { Platform } from 'react-native'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

interface TabConfig {
  name:       string
  title:      string
  icon:       IoniconsName
  iconActive: IoniconsName
}

const TABS: TabConfig[] = [
  { name: 'index',    title: 'For You',  icon: 'sparkles-outline',  iconActive: 'sparkles' },
  { name: 'discover', title: 'Discover', icon: 'search-outline',    iconActive: 'search' },
  { name: 'favorites',title: 'Saved',    icon: 'bookmark-outline',  iconActive: 'bookmark' },
  { name: 'pet',      title: 'Pet',      icon: 'paw-outline',       iconActive: 'paw' },
  { name: 'profile',  title: 'Profile',  icon: 'person-outline',    iconActive: 'person' },
]

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown:       false,
        tabBarActiveTintColor:   Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: {
          backgroundColor:  Colors.tabBg,
          borderTopColor:   Colors.border,
          borderTopWidth:   0.5,
          paddingBottom:    Platform.OS === 'ios' ? 20 : 8,
          paddingTop:       8,
          height:           Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarLabelStyle: {
          fontSize:   FontSize.xs,
          fontWeight: '600',
          marginTop:  2,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title:    tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.iconActive : tab.icon}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  )
}
