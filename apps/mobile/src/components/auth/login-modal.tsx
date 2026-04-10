import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Button } from '@quickrent/design-system';

import { useSessionStore } from '../../store/session.store';

type LoginModalProps = {
  visible: boolean;
  onClose: () => void;
  onContinue?: () => void;
  isArabic?: boolean;
};

export function LoginModal({ visible, onClose, onContinue, isArabic = false }: LoginModalProps) {
  const signInAsTenant = useSessionStore((state) => state.signInAsTenant);

  const labels = isArabic
    ? { title: 'أنشئ حسابك', continue: 'متابعة' }
    : { title: 'Create your account', continue: 'Continue' };

  const handleContinue = () => {
    signInAsTenant();
    onClose();
    onContinue?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, isArabic && styles.rtl]} onPress={() => undefined}>
          <Text style={[styles.title, isArabic && styles.rtlText]}>{labels.title}</Text>

          <View style={styles.optionsWrap}>
            <TouchableOpacity activeOpacity={0.85} style={styles.optionBtn}>
              <Text style={[styles.optionText, isArabic && styles.rtlText]}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} style={styles.optionBtn}>
              <Text style={[styles.optionText, isArabic && styles.rtlText]}>Apple</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} style={styles.optionBtn}>
              <Text style={[styles.optionText, isArabic && styles.rtlText]}>Phone</Text>
            </TouchableOpacity>
          </View>

          <Button label={labels.continue} onPress={handleContinue} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 22, 46, 0.42)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8E2EF',
    padding: 12,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  title: {
    color: '#1F2937',
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  optionsWrap: {
    gap: 8,
  },
  optionBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E2EF',
    backgroundColor: '#F7F9FC',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  optionText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  rtl: {
    direction: 'rtl',
  },
  rtlText: {
    textAlign: 'right',
  },
});
