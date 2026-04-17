import React from "react";
import { StyleSheet, View } from "react-native";

const paletteMap = {
  electrician: {
    tint: "#dcfce7",
    glow: "#bbf7d0",
    accent: "#16a34a",
    accentSoft: "#86efac",
    deep: "#14532d",
  },
  plumber: {
    tint: "#dbeafe",
    glow: "#bfdbfe",
    accent: "#0ea5e9",
    accentSoft: "#7dd3fc",
    deep: "#0f3d63",
  },
  "washroom-cleaner": {
    tint: "#ccfbf1",
    glow: "#99f6e4",
    accent: "#14b8a6",
    accentSoft: "#5eead4",
    deep: "#115e59",
  },
  "room-cleaner": {
    tint: "#ede9fe",
    glow: "#ddd6fe",
    accent: "#8b5cf6",
    accentSoft: "#c4b5fd",
    deep: "#4c1d95",
  },
  "crop-cutter": {
    tint: "#ecfccb",
    glow: "#d9f99d",
    accent: "#84cc16",
    accentSoft: "#bef264",
    deep: "#365314",
  },
  "water-supplier": {
    tint: "#dbeafe",
    glow: "#bfdbfe",
    accent: "#2563eb",
    accentSoft: "#93c5fd",
    deep: "#1e3a8a",
  },
  "home-taker": {
    tint: "#ffe4e6",
    glow: "#fecdd3",
    accent: "#ec4899",
    accentSoft: "#f9a8d4",
    deep: "#9d174d",
  },
};

function Shape({ style }) {
  return <View style={[styles.shape, style]} />;
}

function Dot({ style }) {
  return <View style={[styles.dot, style]} />;
}

function ShadowBar({ style }) {
  return <View style={[styles.shadowBar, style]} />;
}

function ElectricianArt({ palette }) {
  return (
    <View style={styles.scene}>
      <Shape
        style={[
          styles.backBlob,
          { backgroundColor: palette.glow, transform: [{ rotate: "-12deg" }] },
        ]}
      />
      <ShadowBar style={styles.shadowWide} />

      <Shape
        style={[
          styles.toolHandle,
          { backgroundColor: palette.deep, transform: [{ rotate: "-18deg" }] },
        ]}
      />
      <Shape
        style={[
          styles.toolHead,
          { backgroundColor: palette.accent, transform: [{ rotate: "-18deg" }] },
        ]}
      />
      <Shape style={[styles.toolBase, { backgroundColor: "#f8fafc" }]} />

      <Shape style={[styles.cable, { backgroundColor: palette.deep }]} />
      <Shape style={[styles.sparkCap, { backgroundColor: palette.accentSoft }]} />
      <Dot style={[styles.sparkDotA, { backgroundColor: palette.accent }]} />
      <Dot style={[styles.sparkDotB, { backgroundColor: palette.accent }]} />
      <Dot style={[styles.sparkDotC, { backgroundColor: palette.accent }]} />
      <Dot style={[styles.sparkDotD, { backgroundColor: palette.accent }]} />
      <Shape style={[styles.plugBox, { backgroundColor: "#fff" }]} />
    </View>
  );
}

function PlumberArt({ palette }) {
  return (
    <View style={styles.scene}>
      <Shape
        style={[
          styles.backBlob,
          { backgroundColor: palette.glow, transform: [{ rotate: "8deg" }] },
        ]}
      />
      <ShadowBar style={styles.shadowWide} />

      <Shape style={[styles.pipeVertical, { backgroundColor: palette.accent }]} />
      <Shape style={[styles.pipeElbow, { backgroundColor: palette.deep }]} />
      <Shape style={[styles.pipeHorizontal, { backgroundColor: palette.accent }]} />
      <Shape style={[styles.tapStem, { backgroundColor: "#fff" }]} />
      <Shape style={[styles.tapHead, { backgroundColor: palette.deep }]} />
      <Shape style={[styles.tapSpout, { backgroundColor: palette.deep }]} />
      <Shape style={[styles.waterDrop, { backgroundColor: palette.accentSoft }]} />
      <Dot style={[styles.dropHighlight, { backgroundColor: "#fff" }]} />
    </View>
  );
}

function WashroomArt({ palette }) {
  return (
    <View style={styles.scene}>
      <Shape
        style={[
          styles.backBlob,
          { backgroundColor: palette.glow, transform: [{ rotate: "-6deg" }] },
        ]}
      />
      <ShadowBar style={styles.shadowMedium} />

      <Shape style={[styles.toiletTank, { backgroundColor: palette.accentSoft }]} />
      <Shape style={[styles.toiletBowl, { backgroundColor: "#fff" }]} />
      <Shape style={[styles.toiletSeat, { backgroundColor: palette.deep }]} />
      <Shape style={[styles.broomHandle, { backgroundColor: palette.accent, transform: [{ rotate: "28deg" }] }]} />
      <Shape style={[styles.broomHead, { backgroundColor: palette.deep, transform: [{ rotate: "28deg" }] }]} />
      <Dot style={[styles.soapDotA, { backgroundColor: "#fff" }]} />
      <Dot style={[styles.soapDotB, { backgroundColor: "#fff" }]} />
      <Dot style={[styles.soapDotC, { backgroundColor: "#fff" }]} />
    </View>
  );
}

function RoomCleanerArt({ palette }) {
  return (
    <View style={styles.scene}>
      <Shape
        style={[
          styles.backBlob,
          { backgroundColor: palette.glow, transform: [{ rotate: "10deg" }] },
        ]} 
      />
      <ShadowBar style={styles.shadowMedium} />

      <Shape style={[styles.windowFrame, { backgroundColor: "#fff" }]} />
      <Shape style={[styles.windowBarH, { backgroundColor: palette.accent }]} />
      <Shape style={[styles.windowBarV, { backgroundColor: palette.accent }]} />
      <Shape style={[styles.windowScene, { backgroundColor: palette.glow }]} />

      <Shape style={[styles.sweepHandle, { backgroundColor: palette.deep, transform: [{ rotate: "-18deg" }] }]} />
      <Shape style={[styles.sweepHead, { backgroundColor: palette.accentSoft, transform: [{ rotate: "-18deg" }] }]} />
      <Shape style={[styles.mopHandle, { backgroundColor: palette.accent, transform: [{ rotate: "16deg" }] }]} />
      <Shape style={[styles.mopHead, { backgroundColor: palette.deep, transform: [{ rotate: "16deg" }] }]} />
      <Shape style={[styles.dustPan, { backgroundColor: "#fff" }]} />
      <Dot style={[styles.cleanDotA, { backgroundColor: palette.accent }]} />
      <Dot style={[styles.cleanDotB, { backgroundColor: palette.accent }]} />
      <Dot style={[styles.cleanDotC, { backgroundColor: palette.accent }]} />
    </View>
  );
}

function CropCutterArt({ palette }) {
  return (
    <View style={styles.scene}>
      <Shape
        style={[
          styles.backBlob,
          { backgroundColor: palette.glow, transform: [{ rotate: "-8deg" }] },
        ]}
      />
      <ShadowBar style={styles.shadowWide} />

      <Shape style={[styles.stalkA, { backgroundColor: palette.accent }]} />
      <Shape style={[styles.stalkB, { backgroundColor: palette.accentSoft }]} />
      <Shape style={[styles.stalkC, { backgroundColor: palette.accent }]} />
      <Shape style={[styles.seedTopA, { backgroundColor: palette.deep }]} />
      <Shape style={[styles.seedTopB, { backgroundColor: palette.deep }]} />
      <Shape style={[styles.seedTopC, { backgroundColor: palette.deep }]} />
      <Shape style={[styles.sickleHandle, { backgroundColor: palette.deep, transform: [{ rotate: "20deg" }] }]} />
      <Shape style={[styles.sickleBlade, { backgroundColor: palette.accent }]} />
    </View>
  );
}

function WaterSupplierArt({ palette }) {
  return (
    <View style={styles.scene}>
      <Shape
        style={[
          styles.backBlob,
          { backgroundColor: palette.glow, transform: [{ rotate: "8deg" }] },
        ]}
      />
      <ShadowBar style={styles.shadowWide} />

      <Shape style={[styles.dropBody, { backgroundColor: palette.accent }]} />
      <Shape style={[styles.dropCut, { backgroundColor: "#f3f4f6" }]} />
      <Shape style={[styles.dropHighlight, { backgroundColor: "#fff" }]} />
      <Shape style={[styles.tankerBody, { backgroundColor: "#fff" }]} />
      <Shape style={[styles.tankerRoof, { backgroundColor: palette.deep }]} />
      <Shape style={[styles.tankerWheelA, { backgroundColor: palette.accent }]} />
      <Shape style={[styles.tankerWheelB, { backgroundColor: palette.accent }]} />
    </View>
  );
}

function HomeTakerArt({ palette }) {
  return (
    <View style={styles.scene}>
      <Shape
        style={[
          styles.backBlob,
          { backgroundColor: palette.glow, transform: [{ rotate: "-8deg" }] },
        ]} 
      />
      <ShadowBar style={styles.shadowMedium} />

      <Shape style={[styles.houseBase, { backgroundColor: "#fff" }]} />
      <Shape style={[styles.houseRoof, { backgroundColor: palette.accent, transform: [{ rotate: "45deg" }] }]} />
      <Shape style={[styles.homeWindow, { backgroundColor: "#fff" }]} />
      <Shape style={[styles.homeWindowBarH, { backgroundColor: palette.accentSoft }]} />
      <Shape style={[styles.homeWindowBarV, { backgroundColor: palette.accentSoft }]} />
      <Shape style={[styles.door, { backgroundColor: palette.deep }]} />
      <Shape style={[styles.stairStep1, { backgroundColor: palette.accentSoft }]} />
      <Shape style={[styles.stairStep2, { backgroundColor: palette.accent }]} />
      <Shape style={[styles.stairStep3, { backgroundColor: palette.deep }]} />
      <Shape style={[styles.stairRail, { backgroundColor: palette.deep }]} />
      <Shape style={[styles.heartBadge, { backgroundColor: palette.accent }]} />
      <Dot style={[styles.heartDotA, { backgroundColor: "#fff" }]} />
      <Dot style={[styles.heartDotB, { backgroundColor: "#fff" }]} />
    </View>
  );
}

export default function ServiceIllustration({ serviceId, color = "#16a34a" }) {
  const palette = paletteMap[serviceId] || {
    tint: "#f3f4f6",
    glow: "#e5e7eb",
    accent: color,
    accentSoft: color,
    deep: "#0f172a",
  };

  switch (serviceId) {
    case "electrician":
      return <ElectricianArt palette={palette} />;
    case "plumber":
      return <PlumberArt palette={palette} />;
    case "washroom-cleaner":
      return <WashroomArt palette={palette} />;
    case "room-cleaner":
      return <RoomCleanerArt palette={palette} />;
    case "crop-cutter":
      return <CropCutterArt palette={palette} />;
    case "water-supplier":
      return <WaterSupplierArt palette={palette} />;
    case "home-taker":
      return <HomeTakerArt palette={palette} />;
    default:
      return <ElectricianArt palette={palette} />;
  }
}

const styles = StyleSheet.create({
  scene: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  shape: {
    position: "absolute",
    borderRadius: 20,
  },
  dot: {
    position: "absolute",
    borderRadius: 999,
  },
  backBlob: {
    width: 82,
    height: 82,
    borderRadius: 28,
    top: 4,
    right: 6,
    opacity: 0.95,
  },
  shadowBar: {
    position: "absolute",
    bottom: 12,
    width: 70,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
  },
  shadowWide: {
    width: 80,
  },
  shadowMedium: {
    width: 68,
  },
  toolHandle: {
    width: 7,
    height: 58,
    left: 24,
    top: 18,
    borderRadius: 5,
  },
  toolHead: {
    width: 34,
    height: 18,
    left: 14,
    top: 60,
    borderRadius: 9,
  },
  toolBase: {
    width: 18,
    height: 10,
    left: 20,
    top: 73,
    borderRadius: 5,
  },
  cable: {
    width: 20,
    height: 4,
    left: 36,
    top: 58,
    borderRadius: 999,
  },
  sparkCap: {
    width: 16,
    height: 16,
    right: 24,
    top: 22,
    borderRadius: 8,
  },
  sparkDotA: {
    width: 5,
    height: 5,
    right: 18,
    top: 16,
  },
  sparkDotB: {
    width: 5,
    height: 5,
    right: 8,
    top: 24,
  },
  sparkDotC: {
    width: 5,
    height: 5,
    right: 20,
    top: 36,
  },
  sparkDotD: {
    width: 5,
    height: 5,
    right: 9,
    top: 10,
  },
  plugBox: {
    width: 18,
    height: 14,
    right: 18,
    bottom: 24,
    borderRadius: 5,
  },
  pipeVertical: {
    width: 12,
    height: 44,
    left: 23,
    top: 17,
    borderRadius: 8,
  },
  pipeElbow: {
    width: 26,
    height: 26,
    left: 19,
    top: 39,
    borderRadius: 13,
  },
  pipeHorizontal: {
    width: 44,
    height: 12,
    left: 24,
    top: 50,
    borderRadius: 8,
  },
  tapStem: {
    width: 7,
    height: 20,
    left: 51,
    top: 28,
    borderRadius: 4,
  },
  tapHead: {
    width: 24,
    height: 8,
    left: 43,
    top: 25,
    borderRadius: 4,
  },
  tapSpout: {
    width: 18,
    height: 8,
    left: 43,
    top: 37,
    borderRadius: 4,
  },
  waterDrop: {
    width: 15,
    height: 15,
    right: 18,
    bottom: 28,
    borderRadius: 8,
  },
  dropHighlight: {
    width: 5,
    height: 5,
    right: 21,
    bottom: 31,
  },
  toiletTank: {
    width: 24,
    height: 22,
    left: 18,
    top: 21,
    borderRadius: 8,
  },
  toiletBowl: {
    width: 40,
    height: 30,
    left: 12,
    top: 42,
    borderRadius: 16,
  },
  toiletSeat: {
    width: 22,
    height: 6,
    left: 21,
    top: 50,
    borderRadius: 4,
  },
  broomHandle: {
    width: 7,
    height: 58,
    right: 22,
    top: 18,
    borderRadius: 5,
  },
  broomHead: {
    width: 20,
    height: 12,
    right: 14,
    top: 65,
    borderRadius: 6,
  },
  soapDotA: {
    width: 6,
    height: 6,
    right: 16,
    top: 16,
  },
  soapDotB: {
    width: 5,
    height: 5,
    right: 27,
    top: 24,
  },
  soapDotC: {
    width: 5,
    height: 5,
    right: 10,
    top: 30,
  },
  windowFrame: {
    width: 28,
    height: 28,
    left: 18,
    top: 22,
    borderRadius: 8,
  },
  windowScene: {
    width: 18,
    height: 18,
    left: 23,
    top: 27,
    borderRadius: 6,
  },
  windowBarH: {
    width: 20,
    height: 4,
    left: 22,
    top: 34,
    borderRadius: 4,
  },
  windowBarV: {
    width: 4,
    height: 20,
    left: 31,
    top: 25,
    borderRadius: 4,
  },
  sweepHandle: {
    width: 6,
    height: 58,
    left: 16,
    top: 28,
    borderRadius: 5,
  },
  sweepHead: {
    width: 22,
    height: 12,
    left: 10,
    top: 72,
    borderRadius: 6,
  },
  mopHandle: {
    width: 7,
    height: 58,
    right: 16,
    top: 22,
    borderRadius: 5,
  },
  mopHead: {
    width: 22,
    height: 10,
    right: 8,
    top: 74,
    borderRadius: 5,
  },
  dustPan: {
    width: 18,
    height: 14,
    right: 28,
    top: 46,
    borderRadius: 6,
  },
  cleanDotA: {
    width: 4,
    height: 4,
    right: 24,
    top: 16,
  },
  cleanDotB: {
    width: 5,
    height: 5,
    right: 18,
    top: 28,
  },
  cleanDotC: {
    width: 4,
    height: 4,
    right: 28,
    top: 34,
  },
  stalkA: {
    width: 8,
    height: 50,
    left: 20,
    top: 18,
    borderRadius: 6,
    transform: [{ rotate: "-5deg" }],
  },
  stalkB: {
    width: 8,
    height: 42,
    left: 34,
    top: 24,
    borderRadius: 6,
    transform: [{ rotate: "2deg" }],
  },
  stalkC: {
    width: 8,
    height: 46,
    left: 48,
    top: 20,
    borderRadius: 6,
    transform: [{ rotate: "7deg" }],
  },
  seedTopA: {
    width: 16,
    height: 9,
    left: 14,
    top: 14,
    borderRadius: 5,
  },
  seedTopB: {
    width: 16,
    height: 9,
    left: 28,
    top: 20,
    borderRadius: 5,
  },
  seedTopC: {
    width: 16,
    height: 9,
    left: 42,
    top: 16,
    borderRadius: 5,
  },
  sickleHandle: {
    width: 8,
    height: 44,
    right: 20,
    top: 18,
    borderRadius: 5,
  },
  sickleBlade: {
    width: 26,
    height: 8,
    right: 12,
    top: 57,
    borderRadius: 999,
  },
  dropBody: {
    width: 30,
    height: 42,
    left: 20,
    top: 18,
    borderRadius: 18,
    transform: [{ rotate: "12deg" }],
  },
  dropCut: {
    width: 18,
    height: 18,
    left: 26,
    top: 26,
    borderRadius: 12,
    transform: [{ rotate: "12deg" }],
  },
  tankerBody: {
    width: 32,
    height: 34,
    right: 16,
    top: 28,
    borderRadius: 12,
  },
  tankerRoof: {
    width: 22,
    height: 8,
    right: 21,
    top: 22,
    borderRadius: 4,
  },
  tankerWheelA: {
    width: 8,
    height: 8,
    right: 18,
    bottom: 24,
    borderRadius: 4,
  },
  tankerWheelB: {
    width: 8,
    height: 8,
    right: 34,
    bottom: 24,
    borderRadius: 4,
  },
  houseBase: {
    width: 42,
    height: 26,
    left: 14,
    top: 40,
    borderRadius: 10,
  },
  houseRoof: {
    width: 28,
    height: 28,
    left: 19,
    top: 21,
    borderRadius: 6,
  },
  door: {
    width: 8,
    height: 15,
    left: 28,
    top: 50,
    borderRadius: 4,
  },
  homeWindow: {
    width: 16,
    height: 16,
    left: 18,
    top: 32,
    borderRadius: 5,
  },
  homeWindowBarH: {
    width: 12,
    height: 3,
    left: 20,
    top: 39,
    borderRadius: 3,
  },
  homeWindowBarV: {
    width: 3,
    height: 12,
    left: 25,
    top: 34,
    borderRadius: 3,
  },
  stairStep1: {
    width: 18,
    height: 8,
    right: 16,
    top: 56,
    borderRadius: 4,
  },
  stairStep2: {
    width: 24,
    height: 8,
    right: 10,
    top: 48,
    borderRadius: 4,
  },
  stairStep3: {
    width: 30,
    height: 8,
    right: 4,
    top: 40,
    borderRadius: 4,
  },
  stairRail: {
    width: 4,
    height: 38,
    right: 22,
    top: 22,
    borderRadius: 3,
  },
  heartBadge: {
    width: 14,
    height: 14,
    right: 18,
    top: 26,
    borderRadius: 7,
  },
  heartDotA: {
    width: 4,
    height: 4,
    right: 22,
    top: 30,
  },
  heartDotB: {
    width: 4,
    height: 4,
    right: 26,
    top: 30,
  },
});
