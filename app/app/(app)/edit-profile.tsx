import { useEffect, useState } from 'react';
import { Alert, StatusBar, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { BirthdayField, Field, OptionGroup, PhotoGrid, ScreenHeader, isValidBirthday } from '@/components/palora/forms';
import { ErrorState, InterestChip, LoadingState, PrimaryButton } from '@/components/palora/ui';
import { usePatchProfile, useProfile } from '@/hooks/useDating';
import { GENDERS, INTERESTS } from '@/lib/fixtures';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const me = useProfile();
  const patch = usePatchProfile();
  const [name, setName] = useState('');

  const [about, setAbout] = useState('');
  const [city, setCity] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    if (!me.data) return;
    setName(me.data.display_name);
    setAbout(me.data.about.slice(0, 100));
    setCity(me.data.city);
    setBirthday(me.data.birthday ?? '');
    setGender(me.data.gender);
    setInterests(me.data.interests ?? []);
  }, [me.data]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(app)/me'));

  const save = async () => {
    if (name.trim().length < 2) return Alert.alert('Name too short');
    if (about.trim().length > 100) return Alert.alert('About', 'Keep it to 100 characters.');
    if (birthday) {
      const v = isValidBirthday(birthday);
      if (!v.ok) return Alert.alert('Birthday', v.reason);
    }
    try {
      await patch.mutateAsync({
        display_name: name.trim(),
        about: about.trim(),
        city: city.trim(),
        gender: gender ?? undefined,
        birthday: birthday || undefined,
        interests,
      });
      back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again');
    }
  };

  if (me.isLoading) return <LoadingState />;
  if (me.isError || !me.data) return <ErrorState error={me.error} onRetry={() => me.refetch()} />;

  return (
    <View className="flex-1 bg-fz-canvas" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title="Edit profile" onBack={back} />
      <KeyboardAwareScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 40,
        }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <PhotoGrid photos={me.data.photos} />
        <Field label="Name" value={name} onChangeText={setName} maxLength={40} />
        <Field label="About" value={about} onChangeText={(t) => setAbout(t.slice(0, 100))} multiline maxLength={100} placeholder="A short bio" hint={`${about.length}/100`} />
        <Field label="City" value={city} onChangeText={setCity} maxLength={80} placeholder="Mumbai" />
        <BirthdayField label="Birthday" value={birthday} onChange={setBirthday} hint="Only your age is shown." />
        <OptionGroup label="I am a" options={GENDERS} value={gender} onChange={setGender} />
        <Text className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-fz-muted">Interests</Text>
        <View className="mb-4 flex-row flex-wrap">
          {INTERESTS.map((label) => {
            const selected = interests.includes(label);
            return (
              <InterestChip
                key={label}
                label={label}
                selected={selected}
                onPress={() =>
                  setInterests((cur) =>
                    selected ? cur.filter((i) => i !== label) : [...cur, label]
                  )
                }
                small
              />
            );
          })}
        </View>
        <PrimaryButton label="Save" onPress={save} loading={patch.isPending} />
        <Text className="mt-3 text-center text-xs text-fz-muted">Your email and phone can’t be changed here.</Text>
      </KeyboardAwareScrollView>
    </View>
  );
}
