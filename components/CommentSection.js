import { Ionicons } from '@expo/vector-icons'; // lub lucide-react-native / inne
import { useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

export default function CommentSection({ comment, setComment, onSave, disabled }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [draft, setDraft] = useState(comment);

  const handleSave = async () => {
    setModalVisible(false);
    await onSave(draft);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Komentarz:</Text>
      <Pressable
        style={styles.previewButton}
        onPress={() => !disabled && setModalVisible(true)}
      >
        <Text
          style={[
            styles.previewText,
            !comment && styles.previewPlaceholder
          ]}
        >
          { comment || 'Dodaj notatkę...' }
        </Text>
        {!disabled && (
          <Ionicons name="pencil-outline" size={20} color="#806040" style={{ marginLeft: 8 }} />
        )}
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <Text style={styles.modalTitle}>Edytuj komentarz</Text>
            <TextInput
              style={styles.modalInput}
              multiline
              autoFocus
              placeholder="Napisz coś o nalewce..."
              placeholderTextColor="#aaa"
              value={draft}
              onChangeText={setDraft}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setModalVisible(false)} style={[styles.modalBtn, styles.cancelBtn]}>
                <Text style={styles.modalBtnText}>Anuluj</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={[styles.modalBtn, styles.saveBtn]}>
                <Text style={styles.modalBtnText}>Zapisz</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    marginVertical: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5F5DC',
    marginBottom: 6,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0ede4',
    padding: 12,
    borderRadius: 10,
  },
  previewText: {
    flex: 1,
    fontSize: 15,
    color: '#3b2a1f',
  },
  previewPlaceholder: {
    color: '#888',
    fontStyle: 'italic',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#f0ead6',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b2a1f',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#e6d5b8',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#3b2a1f',
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelBtn: {
    backgroundColor: '#d3c4a3',
  },
  saveBtn: {
    backgroundColor: '#8d6943',
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2e1d14',
  },
});