import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

interface HUDRingProps {
  size: number;
  active?: boolean;
  showOrb?: boolean;
}

export function HUDRing({ size, active = false, showOrb = true }: HUDRingProps) {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const pulse3 = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.7)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ND = false;

    const p1 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse1, {
          toValue: 1.04,
          duration: 2000,
          useNativeDriver: ND,
        }),
        Animated.timing(pulse1, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: ND,
        }),
      ]),
    );

    const p2 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse2, {
          toValue: 1.06,
          duration: 2600,
          useNativeDriver: ND,
        }),
        Animated.timing(pulse2, {
          toValue: 1,
          duration: 2600,
          useNativeDriver: ND,
        }),
      ]),
    );

    const p3 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse3, {
          toValue: 1.08,
          duration: 3200,
          useNativeDriver: ND,
        }),
        Animated.timing(pulse3, {
          toValue: 1,
          duration: 3200,
          useNativeDriver: ND,
        }),
      ]),
    );

    const orb = Animated.loop(
      Animated.sequence([
        Animated.timing(orbOpacity, {
          toValue: active ? 1 : 0.4,
          duration: 1200,
          useNativeDriver: ND,
        }),
        Animated.timing(orbOpacity, {
          toValue: active ? 0.5 : 0.7,
          duration: 1200,
          useNativeDriver: ND,
        }),
      ]),
    );

    const rot = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 12000,
        useNativeDriver: ND,
      }),
    );

    p1.start();
    p2.start();
    p3.start();
    orb.start();
    rot.start();

    return () => {
      p1.stop();
      p2.stop();
      p3.stop();
      orb.stop();
      rot.stop();
    };
  }, [active, orbOpacity, pulse1, pulse2, pulse3, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const cx = size / 2;
  const cy = size / 2;
  const r1 = size * 0.18;
  const r2 = size * 0.27;
  const r3 = size * 0.37;
  const r4 = size * 0.46;

  const dashLen = 2 * Math.PI * r3;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={{
          position: "absolute",
          width: size * 0.94,
          height: size * 0.94,
          transform: [{ scale: pulse3 }],
          opacity: 0.25,
        }}
      >
        <View
          style={{
            width: "100%",
            height: "100%",
            borderRadius: size / 2,
            borderWidth: 0.5,
            borderColor: "#00d4ff",
            shadowColor: "#00d4ff",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
          }}
        />
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          width: size * 0.74,
          height: size * 0.74,
          transform: [{ scale: pulse2 }],
          opacity: 0.45,
        }}
      >
        <View
          style={{
            width: "100%",
            height: "100%",
            borderRadius: size / 2,
            borderWidth: 1,
            borderColor: "#00d4ff",
            shadowColor: "#00d4ff",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: 12,
          }}
        />
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          width: size * 0.54,
          height: size * 0.54,
          transform: [{ scale: pulse1 }],
          opacity: 0.7,
        }}
      >
        <View
          style={{
            width: "100%",
            height: "100%",
            borderRadius: size / 2,
            borderWidth: 1.5,
            borderColor: "#00d4ff",
            shadowColor: "#00d4ff",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 16,
          }}
        />
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          width: size * 0.74,
          height: size * 0.74,
          transform: [{ rotate: spin }],
        }}
      >
        <Svg width={size * 0.74} height={size * 0.74} viewBox={`0 0 ${size * 0.74} ${size * 0.74}`}>
          <Circle
            cx={size * 0.37}
            cy={size * 0.37}
            r={r3}
            fill="none"
            stroke="#00d4ff"
            strokeWidth="1"
            strokeDasharray={`${dashLen * 0.08} ${dashLen * 0.08} ${dashLen * 0.04} ${dashLen * 0.8}`}
            strokeOpacity="0.9"
          />
        </Svg>
      </Animated.View>

      {showOrb && (
        <Animated.View
          style={{
            position: "absolute",
            opacity: orbOpacity,
          }}
        >
          <Svg width={size * 0.38} height={size * 0.38}>
            <Defs>
              <RadialGradient id="orbGrad" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={active ? "#00ffff" : "#00d4ff"} stopOpacity="0.9" />
                <Stop offset="40%" stopColor="#00d4ff" stopOpacity="0.4" />
                <Stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle
              cx={size * 0.19}
              cy={size * 0.19}
              r={size * 0.19}
              fill="url(#orbGrad)"
            />
            <Circle
              cx={size * 0.19}
              cy={size * 0.19}
              r={size * 0.09}
              fill={active ? "#00ffff" : "#00d4ff"}
              fillOpacity="0.3"
            />
          </Svg>
        </Animated.View>
      )}

      <Svg
        width={size}
        height={size}
        style={{ position: "absolute" }}
        viewBox={`0 0 ${size} ${size}`}
      >
        {[0, 60, 120, 180, 240, 300].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = cx + r1 * Math.cos(rad);
          const y1 = cy + r1 * Math.sin(rad);
          const x2 = cx + (r1 + 6) * Math.cos(rad);
          const y2 = cy + (r1 + 6) * Math.sin(rad);
          return (
            <Path
              key={angle}
              d={`M ${x1} ${y1} L ${x2} ${y2}`}
              stroke="#00d4ff"
              strokeWidth="1"
              strokeOpacity="0.6"
            />
          );
        })}
      </Svg>
    </View>
  );
}
