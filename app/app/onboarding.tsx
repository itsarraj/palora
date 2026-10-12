import { useEffect, useState } from 'react';
import { Alert, Pressable, StatusBar, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { BirthdayField, Field, OptionGroup, PhotoGrid, isValidBirthday } from '@/components/palora/forms';
import { BackIcon, PinIcon } from '@/components/icons';
import { IconButton, LoadingState, PrimaryButton } from '@/components/palora/ui';
import { useLogout, useSession } from '@/hooks/useAuth';
import { usePatchProfile, useProfile, useSetLocation } from '@/hooks/useDating';
import { GENDERS, INTENTS } from '@/lib/fixtures';
import { getPosition } from '@/lib/native';
import { colors } from '@/constants/theme';

const STEPS = ['About you', 'Looking for', 'Photos'] as const;

/**
 * First-run profile setup. Each step persists immediately so a user who quits
 * halfway resumes where they left off. The final step flips onboarding_complete.
 */
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const session = useSession();
  const me = useProfile(Boolean(session.data?.hasToken));
  const patch = usePatchProfile();
  const setLocation = useSetLocation();
  const logout = useLogout();


  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [intent, setIntent] = useState('both');
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [about, setAbout] = useState('');
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!me.data || seeded) return;
    setSeeded(true);
    setName(me.data.display_name === 'You' || me.data.display_name.startsWith('User ') ? '' : me.data.display_name);
    setBirthday(me.data.birthday ?? '');
    setGender(me.data.gender);
    setCity(me.data.city);
    setIntent(me.data.intent);
    setLookingFor(me.data.looking_for);
    setAbout(me.data.about.slice(0, 100));
    if (!me.data.gender || !me.data.birthday) setStep(0);
    else if (me.data.looking_for.length === 0) setStep(1);
    else setStep(2);
  }, [me.data, seeded]);

  if (session.isLoading) return <LoadingState />;
  if (!session.data?.hasToken) return <Redirect href="/welcome" />;
  if (me.data?.onboarding_complete) return <Redirect href="/(app)" />;
  if (me.isLoading || !me.data) return <LoadingState label="Setting up your profile…" />;

  const fail = (e: unknown) => Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again');

  const next = async () => {
    try {
      if (step === 0) {
        if (name.trim().length < 2) return Alert.alert('Name', 'Tell us what to call you.');
        const v = isValidBirthday(birthday);
        if (!v.ok) return Alert.alert('Birthday', v.reason);
        if (!gender) return Alert.alert('Gender', 'Pick one to continue.');
        if (about.trim().length > 100) return Alert.alert('About', 'Keep it to 100 characters.');
        await patch.mutateAsync({
          display_name: name.trim(),
          birthday,
          gender,
          city: city.trim() || undefined,
          about: about.trim(),
        });
      } else if (step === 1) {
        if (lookingFor.length === 0) return Alert.alert('Show me', 'Pick at least one.');
        await patch.mutateAsync({ intent, looking_for: lookingFor });
      } else {
        await patch.mutateAsync({ complete_onboarding: true });
        router.replace('/(app)');
        return;
      }
      setStep((s) => s + 1);
    } catch (e) {
      fail(e);
    }
  };

  const useMyLocation = async () => {
    try {
      const pos = await getPosition();
      await setLocation.mutateAsync(pos);
      if (pos.city) setCity(pos.city);
    } catch (e) {
      Alert.alert('Location', e instanceof Error ? e.message : 'Could not get your location');
    }
  };

  return (
    <View className="flex-1 bg-fz-canvas" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />
      <View className="flex-row items-center justify-between px-4 pt-2">
        {step > 0 ? (
          <IconButton onPress={() => setStep((s) => s - 1)}>
            <BackIcon size={20} color={colors.ink} />
          </IconButton>
        ) : (
          <Pressable
            onPress={async () => {
              await logout.mutateAsync();
              router.replace('/welcome');
            }}
            className="h-10 justify-center px-2">
            <Text className="text-sm text-fz-muted">Sign out</Text>
          </Pressable>
        )}
        <Text className="text-sm text-fz-muted">
          {step + 1} / {STEPS.length}
        </Text>
        <View className="w-10" />
      </View>
      <View className="mt-3 flex-row gap-1.5 px-4">
        {STEPS.map((s, i) => (
          <View key={s} className="h-1 flex-1 rounded-full" style={{ backgroundColor: i <= step ? colors.pink : '#EADCE8' }} />
        ))}
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 32,
        }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text className="fz-title mt-4">{STEPS[step]}</Text>

        {step === 0 ? (
          <View className="mt-4">
            <Text className="mb-6 text-sm text-fz-muted">This is how you’ll appear to others. You must be 18 or older.</Text>
            <Field label="Name" value={name} onChangeText={setName} placeholder="Your first name" maxLength={40} autoCapitalize="words" />
            <BirthdayField label="Birthday" value={birthday} onChange={setBirthday} hint="Only your age is shown." />
            <OptionGroup label="I am a" options={GENDERS} value={gender} onChange={setGender} />
            <Field label="City" value={city} onChangeText={setCity} placeholder="Mumbai" maxLength={80} />
            <Field label="About" value={about} onChangeText={(t) => setAbout(t.slice(0, 100))} multiline maxLength={100} placeholder="A short bio" hint={`${about.length}/100`} />
            <Pressable onPress={useMyLocation} disabled={setLocation.isPending} className="mb-2 flex-row items-center gap-2 self-start rounded-full bg-fz-soft px-3 py-2">
              <PinIcon size={18} color={colors.pink} />
              <Text className="text-sm text-fz-plum">{setLocation.isPending ? 'Locating…' : me.data.lat != null ? 'Location saved' : 'Use my location'}</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 1 ? (
          <View className="mt-4">
            <Text className="mb-6 text-sm text-fz-muted">Palora is for friendships and relationships alike — tell us what you’re open to.</Text>
            <OptionGroup label="I’m here to" options={INTENTS} value={intent} onChange={setIntent} />
            <OptionGroup
              label="Show me"
              options={GENDERS}
              value={lookingFor}
              multiple
              onChange={(g) => setLookingFor((v) => (v.includes(g) ? v.filter((x) => x !== g) : [...v, g]))}
            />
          </View>
        ) : null}

        {step === 2 ? (
          <View className="mt-4">
            <Text className="mb-6 text-sm text-fz-muted">Profiles with photos get far more matches. Add at least one clear photo of you.</Text>
            <PhotoGrid photos={me.data.photos} />
          </View>
        ) : null}

        <PrimaryButton
          label={step === STEPS.length - 1 ? (me.data.photos.length ? 'Start exploring' : 'Skip for now') : 'Continue'}
          onPress={next}
          loading={patch.isPending}
          className="mt-6"
          variant={step === STEPS.length - 1 && !me.data.photos.length ? 'ghost' : 'plum'}
        />
      </KeyboardAwareScrollView>
    </View>
  );
}
