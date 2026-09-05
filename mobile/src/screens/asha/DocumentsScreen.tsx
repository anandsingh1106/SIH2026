import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AshaStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AshaStackParamList, 'Documents'>;

interface Doc {
  id: string;
  title: string;
  category: string;
  lang: string;
  description: string;
  content: string;
}

// Same static IEC field-materials text as frontend/src/pages/asha/Documents.tsx
// — real government health-education pamphlet content, not per-user data, so
// it stays hardcoded here rather than needing a backend endpoint.
const DOCS: Doc[] = [
  {
    id: 'doc-1',
    title: 'Maternal Nutrition & Diet Counseling Chart (मराठी)',
    category: 'Maternal Health',
    lang: 'मराठी / English',
    description: 'Visual dietary guide showing balanced diet portions, iron-rich local green vegetables, jaggery, drumsticks, and calcium sources for pregnant mothers.',
    content: '१. दररोज आहारात पालेभाज्या (पालक, मेथी), गूळ आणि शेंगदाणे यांचा समावेश करावा.\n२. जेवणानंतर लगेच चहा किंवा कॉफी पिणे टाळावे, यामुळे शरीरातील लोह शोषणात अडथळा येतो.\n३. डॉक्टर किंवा आशा ताईंनी दिलेल्या आयर्न (IFA) च्या लाल गोळ्या न चुकता दररोज घ्याव्यात.',
  },
  {
    id: 'doc-2',
    title: 'National Immunization Schedule (NIS) Wall Poster 2026',
    category: 'Child Health',
    lang: 'मराठी / हिंदी / English',
    description: 'Comprehensive milestone chart detailing vaccine dosages from birth, 6 wks, 10 wks, 14 wks, 9 months, 16-24 months, and 5-6 years.',
    content: 'जन्म: बी.सी.जी., पोलिओ (OPV 0), हेपॅटायटीस बी\n६ आठवडे: पेंटाव्हॅलेंट १, पोलिओ १, रोटाव्हायरस १, एफ.आय.पी.व्ही. १\n१० आठवडे: पेंटाव्हॅलेंट २, पोलिओ २, रोटाव्हायरस २\n१४ आठवडे: पेंटाव्हॅलेंट ३, पोलिओ ३, रोटाव्हायरस ३, एफ.आय.पी.व्ही. २\n९ महिने: गोवर-रुबेला (MR 1), व्हिटॅमिन ए',
  },
  {
    id: 'doc-3',
    title: 'Snakebite & Poisoning Community Awareness Pamphlet',
    category: 'Emergency Care',
    lang: 'मराठी',
    description: 'Critical DOs and DONTs for rural community education on snakebite prevention, whole blood clotting tests, and immediate 108 ambulance dispatch.',
    content: 'साप चावल्यास काय करावे:\n- रुग्णाला त्वरित शांत बसवावे.\n- चावलेला अवयव काठी किंवा पट्टीने बांधून स्थिर ठेवावा.\n- लगेच १०८ रुग्णवाहिका बोलवून जवळच्या प्राथमिक आरोग्य केंद्रात न्यावे.\nकाय करू नये:\n- चावलेल्या जागी काप मारू नका.\n- तोंडाने विष चोखण्याचा प्रयत्न करू नका.\n- दोरीने घट्ट आवळून बांधू नका.',
  },
];

/** Mirrors frontend/src/pages/asha/Documents.tsx. Drops the "Save PDF" action, which only ever showed an alert() on web with nothing behind it. */
export function DocumentsScreen(_props: Props) {
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.list}>
        {DOCS.map((doc) => (
          <View key={doc.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.categoryBadge}>{doc.category}</Text>
              <Text style={styles.langText}>{doc.lang}</Text>
            </View>
            <Text style={styles.docTitle}>{doc.title}</Text>
            <Text style={styles.docDesc} numberOfLines={3}>{doc.description}</Text>
            <Pressable style={styles.inspectBtn} onPress={() => setSelectedDoc(doc)}>
              <Text style={styles.inspectBtnText}>Inspect Material</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!selectedDoc} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedDoc && (
              <>
                <Text style={styles.modalTitle}>{selectedDoc.title}</Text>
                <Text style={styles.modalMeta}>
                  Category: {selectedDoc.category} • Directorate of Health Services
                </Text>
                <ScrollView style={styles.modalScroll}>
                  <Text style={styles.modalDesc}>{selectedDoc.description}</Text>
                  <View style={styles.contentBox}>
                    <Text style={styles.contentText}>{selectedDoc.content}</Text>
                  </View>
                </ScrollView>
                <Pressable style={styles.closeBtn} onPress={() => setSelectedDoc(null)}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6' },
  list: { flex: 1, padding: 16 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryBadge: { fontSize: 9, fontWeight: '800', color: '#134E4A', backgroundColor: '#F0FDFA', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  langText: { fontSize: 10, fontWeight: '600', color: '#6B7280' },
  docTitle: { fontSize: 13, fontWeight: '800', color: '#111827', marginTop: 8 },
  docDesc: { fontSize: 11, color: '#6B7280', marginTop: 6, lineHeight: 16 },
  inspectBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingVertical: 9, alignItems: 'center', marginTop: 12 },
  inspectBtnText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  modalMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 4, marginBottom: 12 },
  modalScroll: { maxHeight: 380 },
  modalDesc: { fontSize: 12, color: '#4B5563', fontStyle: 'italic', backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, lineHeight: 17 },
  contentBox: { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, marginTop: 12 },
  contentText: { fontSize: 12, color: '#166534', lineHeight: 20, fontWeight: '500' },
  closeBtn: { backgroundColor: '#15803D', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  closeBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
