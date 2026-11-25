import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, SlideInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MessageKey } from '../../i18n';
import { useSettings } from '../../store/settings';
import { MIN_TOUCH, RADIUS, SPACE, TYPE, useTheme } from '../../theme';
import { useFeedback } from '../feedback/feedback';
import { capitalize, numberToWords } from './numberWords';
import { afterAnswer, lockRemaining, makeQuestion, type GateLock, type GateQuestion } from './question';

/** What the parent is about to do; changes the sentence under the title (S10). */
export type GateReason = 'share' | 'saveImage' | 'settings' | 'external' | 'systemSettings';

const BODY: Record<GateReason, MessageKey> = {
  share: 'gate.body.share',
  saveImage: 'gate.body.saveImage',
  settings: 'gate.body.settings',
  external: 'gate.body.external',
  systemSettings: 'gate.body.systemSettings',
};

/** Drag the sheet down further than this (pt) to cancel. */
const DISMISS_DRAG = 110;

type Props = {
  reason: GateReason;
  /** Shared lock state (kept between openings: 3 wrong answers lock the gate for 30 s, F05). */
  lock: { get: () => GateLock; set: (l: GateLock) => void };
  onDone: (passed: boolean) => void;
};

/** S10 – parental gate bottom sheet (design 15). Mounted only while open. */
export function ParentalGateSheet({ reason, lock, onDone }: Props) {
  const { t, language } = useSettings();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const feedback = useFeedback();
  const [question, setQuestion] = useState<GateQuestion>(() => makeQuestion());
  const [wrong, setWrong] = useState(false);
  const [lockLeft, setLockLeft] = useState(() => lockRemaining(lock.get(), Date.now()));
  const closed = useRef(false);

  const finish = useCallback(
    (passed: boolean) => {
      if (closed.current) return;
      closed.current = true;
      onDone(passed);
    },
    [onDone],
  );

  // Locked: count down, then show a new question.
  useEffect(() => {
    if (lockLeft <= 0) return;
    const id = setInterval(() => {
      const left = lockRemaining(lock.get(), Date.now());
      setLockLeft(left);
      if (left <= 0) setQuestion((q) => makeQuestion(Math.random, q));
    }, 500);
    return () => clearInterval(id);
  }, [lockLeft, lock]);

  // ---- shake on a wrong answer, drag down to cancel ------------------------------------
  const shakeX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));

  const drag = Gesture.Pan()
    .runOnJS(true) // simple JS-thread gesture, like the canvas (P3)
    .activeOffsetY(12)
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DRAG || e.velocityY > 900) finish(false);
      else dragY.value = withSpring(0, { damping: 20, stiffness: 220 });
    });

  const answer = (value: number) => {
    if (closed.current) return;
    const correct = value === question.answer;
    const next = afterAnswer(lock.get(), correct, Date.now());
    lock.set(next);
    if (correct) {
      finish(true);
      return;
    }
    feedback.wrong();
    shakeX.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 80 }),
      withTiming(-8, { duration: 70 }),
      withTiming(8, { duration: 70 }),
      withTiming(0, { duration: 50 }),
    );
    if (lockRemaining(next, Date.now()) > 0) {
      // 3rd wrong answer in a row: close; the gate stays locked for 30 s (F05).
      finish(false);
      return;
    }
    setWrong(true);
    setQuestion((q) => makeQuestion(Math.random, q));
  };

  const words = (n: number) => numberToWords(n, language);
  const questionText = capitalize(t('gate.question', { a: words(question.a), b: words(question.b) }));
  const locked = lockLeft > 0;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => finish(false)}>
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View entering={FadeIn.duration(180)} style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]}>
          <Pressable style={styles.fill} onPress={() => finish(false)} accessibilityRole="button" accessibilityLabel={t('common.cancel')} />
        </Animated.View>
        <View style={styles.bottom} pointerEvents="box-none">
          <Animated.View entering={SlideInDown.duration(260)} style={styles.sheetWrap}>
            <GestureDetector gesture={drag}>
              <Animated.View
                style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + SPACE.lg }, dragStyle]}
                accessibilityViewIsModal
              >
                <View style={[styles.handle, { backgroundColor: c.borderStrong }]} />
                <View style={styles.topRow}>
                  <View style={[styles.lockIcon, { backgroundColor: c.bg }]}>
                    <Feather name="lock" size={20} color={c.text} />
                  </View>
                  <Pressable onPress={() => finish(false)} hitSlop={12} accessibilityRole="button" style={styles.cancel}>
                    <Text style={[TYPE.bodyStrong, { color: c.primary }]}>{t('common.cancel')}</Text>
                  </Pressable>
                </View>
                <Text style={[TYPE.title, { color: c.text }]} accessibilityRole="header">
                  {t('gate.title')}
                </Text>
                <Text style={[TYPE.body, styles.body, { color: c.textMuted }]}>{t(BODY[reason])}</Text>

                {locked ? (
                  <View style={[styles.question, { backgroundColor: c.bg }]} accessibilityLiveRegion="polite">
                    <Feather name="clock" size={22} color={c.textMuted} />
                    <Text style={[TYPE.bodyStrong, styles.center, { color: c.text }]}>
                      {t('gate.locked', { s: Math.ceil(lockLeft / 1000) })}
                    </Text>
                  </View>
                ) : (
                  <Animated.View style={shakeStyle}>
                    <View style={[styles.question, { backgroundColor: c.bg }]}>
                      <Text style={[TYPE.heading, styles.questionText, { color: c.text }]} accessibilityLiveRegion="polite">
                        {questionText}
                      </Text>
                    </View>
                    <View style={styles.grid}>
                      {question.choices.map((n) => (
                        <Pressable
                          key={`${question.a}x${question.b}-${n}`}
                          onPress={() => answer(n)}
                          accessibilityRole="button"
                          accessibilityLabel={t('gate.answer', { n })}
                          style={({ pressed }) => [
                            styles.choice,
                            { backgroundColor: pressed ? c.surfaceAlt : c.surface, borderColor: c.borderStrong },
                          ]}
                        >
                          <Text style={[styles.choiceText, { color: c.text }]}>{n}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {wrong && <Text style={[TYPE.caption, styles.center, { color: c.danger }]}>{t('gate.wrong')}</Text>}
                  </Animated.View>
                )}

                <Text style={[TYPE.caption, styles.center, styles.footer, { color: c.textMuted }]}>{t('gate.footer')}</Text>
              </Animated.View>
            </GestureDetector>
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bottom: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end', alignItems: 'center' },
  sheetWrap: { width: '100%', maxWidth: 560 },
  sheet: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACE.lg + SPACE.xs,
    paddingTop: SPACE.sm,
    gap: SPACE.xs,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: SPACE.md },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.sm },
  lockIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cancel: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: SPACE.xs },
  body: { marginBottom: SPACE.md },
  question: {
    minHeight: 64,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    gap: SPACE.sm,
    marginBottom: SPACE.md,
  },
  questionText: { fontSize: 19, lineHeight: 26, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm + 2, marginBottom: SPACE.sm },
  choice: {
    width: '48%',
    flexGrow: 1,
    minHeight: 60,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceText: { ...TYPE.title, fontSize: 24 },
  center: { textAlign: 'center' },
  footer: { marginTop: SPACE.sm },
});
