import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CatalogItem } from './types';

export function SelectModal({ visible, title, options, onSelect, onClose }: { visible: boolean; title: string; options: CatalogItem[]; onSelect: (item: CatalogItem) => void; onClose: () => void }) {
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.overlay}><View style={styles.sheet}>
      <View style={styles.header}><Text style={styles.title}>{title}</Text><Pressable onPress={onClose}><Text style={styles.close}>Fechar</Text></Pressable></View>
      <ScrollView>{options.map((option) => <Pressable key={option.id} style={styles.option} onPress={() => onSelect(option)}><Text style={styles.optionText}>{option.name}</Text><Text style={styles.code}>{option.code}</Text></Pressable>)}</ScrollView>
    </View></View>
  </Modal>;
}

export function ChoicePill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.pill, selected && styles.pillActive]}><Text style={[styles.pillText, selected && styles.pillTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(28, 15, 26, .42)', justifyContent: 'flex-end' }, sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16 }, title: { fontSize: 19, fontWeight: '700', color: '#31132b' }, close: { color: '#9b2c6b', fontWeight: '700' },
  option: { borderTopWidth: 1, borderTopColor: '#f0e6ed', paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between' }, optionText: { color: '#31132b', fontSize: 16 }, code: { color: '#856f80' },
  pill: { borderWidth: 1, borderColor: '#e3cbd9', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, marginRight: 8 }, pillActive: { backgroundColor: '#7c174f', borderColor: '#7c174f' }, pillText: { color: '#6b3957', fontWeight: '600' }, pillTextActive: { color: '#fff' },
});
