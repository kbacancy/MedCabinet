import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform, TouchableOpacity, Text, View, StyleSheet } from 'react-native';

// Android-only floating "Done" bar that appears above the keyboard.
// iOS already handles this via InputAccessoryView per screen.
export function KeyboardDoneBar() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') return;
    const show = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
      setVisible(true);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  if (Platform.OS === 'ios' || !visible) return null;

  return (
    <View style={[styles.bar, { bottom: keyboardHeight }]}>
      <TouchableOpacity onPress={() => Keyboard.dismiss()} style={styles.btn}>
        <Text style={styles.btnText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: '#f1f1f1',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#c7c7cc',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  btn: { paddingHorizontal: 4, paddingVertical: 4 },
  btnText: { fontSize: 17, color: '#007AFF', fontWeight: '600' },
});
