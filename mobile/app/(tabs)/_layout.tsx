
import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Bookmark, Plus, ListChecks, Sparkles } from 'lucide-react-native';
import { View, Text, Platform, TouchableOpacity, Alert } from 'react-native';
import { BlurView } from 'expo-blur';

const AddButton = () => (
  <TouchableOpacity
    onPress={() => Alert.alert("Add Content", "This will open the add content dialog.")}
    style={{
      top: -20,
      justifyContent: 'center',
      alignItems: 'center',
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#6750A4',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 8,
    }}
  >
    <Plus size={30} color="#fff" />
  </TouchableOpacity>
);

const TabIcon = ({ icon: Icon, label, focused, color }: { icon: React.ElementType, label: string, focused: boolean, color: string }) => (
    <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Icon color={focused ? '#6750A4' : color} size={24} />
        <Text style={{ color: focused ? '#6750A4' : color, fontSize: 10, marginTop: 4 }}>{label}</Text>
    </View>
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 90 : 70,
        },
        tabBarBackground: () => (
          <BlurView intensity={90} tint="light" style={{ flex: 1 }} />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => <TabIcon icon={Home} label="Home" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="zones"
        options={{
          tabBarIcon: ({ color, focused }) => <TabIcon icon={Bookmark} label="Zones" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          tabBarButton: () => <AddButton />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          tabBarIcon: ({ color, focused }) => <TabIcon icon={ListChecks} label="Tasks" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="declutter"
        options={{
          tabBarIcon: ({ color, focused }) => <TabIcon icon={Sparkles} label="Declutter" focused={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}
