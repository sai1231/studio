
import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Bookmark, Plus, ListChecks, Sparkles } from 'lucide-react-native';
import { View, Text, Platform, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

// Animated AddButton component
const AddButton = () => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const onPressIn = () => {
        scale.value = withSpring(0.9, { damping: 15, stiffness: 200 });
    };

    const onPressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    };

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => Alert.alert("Add Content", "This will open the add content dialog.")}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
        >
            <Animated.View style={[styles.addButton, animatedStyle]}>
                <Plus size={30} color="#fff" />
            </Animated.View>
        </TouchableOpacity>
    );
};

// AnimatedTabIcon component
const AnimatedTabIcon = ({ icon: Icon, label, focused }: { icon: React.ElementType, label: string, focused: boolean }) => {
    const scale = useSharedValue(focused ? 1.1 : 1);
    const translateY = useSharedValue(focused ? -8 : 0);
    const color = focused ? '#6750A4' : '#49454F';

    React.useEffect(() => {
        scale.value = withSpring(focused ? 1.1 : 1, { damping: 10, stiffness: 100 });
        translateY.value = withSpring(focused ? -8 : 0, { damping: 10, stiffness: 100 });
    }, [focused, scale, translateY]);

    const animatedIconStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }, { translateY: translateY.value }],
        };
    });

    return (
        <View style={styles.tabIconContainer}>
            <Animated.View style={animatedIconStyle}>
                <Icon color={color} size={26} />
            </Animated.View>
            <Text style={[styles.tabLabel, { color }]}>{label}</Text>
        </View>
    );
};

// Main Layout Component
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false, // We use our own label
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0, // Remove elevation from here to apply on the blur view
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 90 : 70,
        },
        tabBarBackground: () => (
          <View style={styles.tabBarBackgroundContainer}>
            <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <AnimatedTabIcon icon={Home} label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="zones"
        options={{
          tabBarIcon: ({ focused }) => <AnimatedTabIcon icon={Bookmark} label="Zones" focused={focused} />,
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
          tabBarIcon: ({ focused }) => <AnimatedTabIcon icon={ListChecks} label="Tasks" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="declutter"
        options={{
          tabBarIcon: ({ focused }) => <AnimatedTabIcon icon={Sparkles} label="Declutter" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

// Styles
const styles = StyleSheet.create({
    addButton: {
        top: -25, // Adjusted for better visual alignment
        justifyContent: 'center',
        alignItems: 'center',
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#6750A4',
        // Cross-platform shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    tabBarBackgroundContainer: {
        flex: 1,
        overflow: 'hidden',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    tabIconContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 10,
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
    },
});
