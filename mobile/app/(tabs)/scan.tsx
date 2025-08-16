import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Image,
  Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useReceiptParsing } from '@/hooks/useReceiptParsing';
import { useFolders } from '@/hooks/useFolders';
import { useReceipts } from '@/hooks/useReceipts';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { StatusBar } from 'expo-status-bar';

export default function ScanScreen() {
  const [scannedImageUri, setScannedImageUri] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  
  // Form fields
  const [formData, setFormData] = useState({
    storeName: '',
    date: new Date(),
    totalAmount: '',
    notes: '',
    selectedFolderId: null as number | null,
  });

  // Hooks
  const { 
    isProcessing, 
    lastParsedData, 
    processReceiptFromCamera, 
    clearLastParsed,
    error 
  } = useReceiptParsing();
  
  const { folders, isLoading: foldersLoading, fetchAllFolders } = useFolders(); // Add fetchAllFolders
  const { addReceipt } = useReceipts();

  // Add focus effect to refresh folders when tab becomes active
  useFocusEffect(
    React.useCallback(() => {
      console.log('Scan screen focused - refreshing folders');
      fetchAllFolders(); // Refresh folders when user navigates to this tab
    }, [fetchAllFolders])
  );

  // Reset form when component mounts
  useEffect(() => {
    setShowForm(false);
    setScannedImageUri(null);
    clearLastParsed();
    setFormData({
      storeName: '',
      date: new Date(),
      totalAmount: '',
      notes: '',
      selectedFolderId: null,
    });
  }, [clearLastParsed]);

  // Update form when parsed data is available
  useEffect(() => {
    if (lastParsedData) {
      setFormData(prev => ({
        ...prev,
        storeName: lastParsedData.storeName || '',
        date: lastParsedData.date ? new Date(lastParsedData.date) : new Date(),
        totalAmount: lastParsedData.totalAmount?.toString() || '',
        notes: lastParsedData.notes || '',
      }));
      setShowForm(true);
    }
  }, [lastParsedData]);

  const handleScanReceipt = async () => {
    try {
      const parsedData = await processReceiptFromCamera('rules');
      
      if (parsedData) {
        // Used for storing scanned image with receipt, not implemented currently
        setScannedImageUri(null);
      }
    } catch (error) {
      console.error('Scan error:', error);
    }
  };

  const handleSaveReceipt = async () => {
    try {
      await addReceipt({
        storeName: formData.storeName,
        date: formData.date.toISOString(),
        totalAmount: parseFloat(formData.totalAmount) || 0,
        notes: formData.notes,
        imageUri: scannedImageUri,
        folderId: formData.selectedFolderId,
      });

      Alert.alert(
        'Success', 
        'Receipt saved successfully!',
        [
          {
            text: 'Scan Another',
            onPress: () => {
              setShowForm(false);
              setScannedImageUri(null);
              clearLastParsed();
              setFormData({
                storeName: '',
                date: new Date(),
                totalAmount: '',
                notes: '',
                selectedFolderId: null,
              });
            }
          },
          {
            text: 'Done',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save receipt. Please try again.');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setScannedImageUri(null);
    clearLastParsed();
    setFormData({
      storeName: '',
      date: new Date(),
      totalAmount: '',
      notes: '',
      selectedFolderId: null,
    });
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'set' && selectedDate) {
      setFormData(prev => ({ ...prev, date: selectedDate }));
    }
  };

  // Build folder options for picker
  const folderOptions = useMemo(() => {
    const buildFolderPath = (folderId: number | null): string => {
      if (folderId === null) return '';
      
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return '';
      
      const parentPath = buildFolderPath(folder.parentId);
      return parentPath ? `${parentPath} > ${folder.name}` : folder.name;
    };

    const options: Array<{ label: string; value: number | null }> = [
      { label: 'Root Folder', value: null }
    ];
    
    // Add all folders with their full path
    folders.forEach(folder => {
      const path = buildFolderPath(folder.id);
      options.push({
        label: path,
        value: folder.id 
      });
    });

    return options;
  }, [folders]);

  const getSelectedFolderName = () => {
    if (formData.selectedFolderId === null) return 'Root Folder';
    const folder = folders.find(f => f.id === formData.selectedFolderId);
    return folder?.name || 'Root Folder';
  };

  if (isProcessing) {
    return (
      <>
        <StatusBar style="dark" />
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <ThemedText style={styles.loadingText}>
              Processing receipt...
            </ThemedText>
          </View>
        </View>
      </>
    );
  }

  if (showForm) {
    return (
      <>
        <StatusBar style="dark" />
        <View style={styles.container}>
          <ScrollView style={styles.formContainer}>
            <ThemedView style={styles.header}>
              <ThemedText type="title">Scanned Receipt</ThemedText>
            </ThemedView>

            {scannedImageUri && (
              <Image source={{ uri: scannedImageUri }} style={styles.previewImage} />
            )}

            <View style={styles.formSection}>
              <Text style={styles.label}>Store Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Store Name"
                value={formData.storeName}
                onChangeText={text => setFormData(prev => ({ ...prev, storeName: text }))}
              />

              <Text style={styles.label}>Date</Text>
              <View style={styles.dateInput}>
                <DateTimePicker
                  value={formData.date}
                  mode="date"
                  display="compact"
                  onChange={onDateChange}
                  style={styles.datePicker}
                />
              </View>

              <Text style={styles.label}>Total Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="numeric"
                value={formData.totalAmount}
                onChangeText={text => setFormData(prev => ({ ...prev, totalAmount: text }))}
              />

              <Text style={styles.label}>Folder</Text>
              <TouchableOpacity 
                style={styles.folderSelector}
                onPress={() => {
                  console.log('Opening folder picker, available folders:', folders.length);
                  setShowFolderPicker(true);
                }}
              >
                <Text style={styles.folderSelectorText}>{getSelectedFolderName()}</Text>
                <Text style={styles.folderSelectorArrow}>▼</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Additional notes..."
                multiline
                numberOfLines={3}
                value={formData.notes}
                onChangeText={text => setFormData(prev => ({ ...prev, notes: text }))}
              />
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveReceipt}>
                <Text style={styles.saveButtonText}>Save Receipt</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Add this Modal for folder selection */}
          <Modal 
            visible={showFolderPicker} 
            animationType="slide" 
            onRequestClose={() => setShowFolderPicker(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Folder</Text>
                <TouchableOpacity onPress={() => setShowFolderPicker(false)}>
                  <Text style={styles.modalCloseButton}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.folderList}>
                {folderOptions.map(option => (
                  <TouchableOpacity
                    key={option.value?.toString() || 'root'}
                    style={[
                      styles.folderOption,
                      formData.selectedFolderId === option.value && styles.selectedFolderOption
                    ]}
                    onPress={() => {
                      console.log('Selected folder option:', option);
                      setFormData(prev => ({ ...prev, selectedFolderId: option.value }));
                      setShowFolderPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.folderOptionText,
                      formData.selectedFolderId === option.value && styles.selectedFolderOptionText
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Modal>
        </View>
      </>
    );
  }

  // Main scan screen
  return (
    <>
      <StatusBar style="light" />
      <View style={styles.container}>
        <ThemedView style={styles.centeredContainer}>
          <IconSymbol
            size={120}
            color="#007AFF"
            name="camera"
            style={styles.cameraIcon}
          />
          
          <ThemedText type="title" style={[styles.title, { color: '#fff' }]}>
            Scan Receipt
          </ThemedText>
          
          <ThemedText style={[styles.subtitle, { color: '#ccc' }]}>
            Tap the button below to take a photo of your receipt.
            We'll automatically extract the details for you!
          </ThemedText>

          <TouchableOpacity style={styles.scanButton} onPress={handleScanReceipt}>
            <IconSymbol name="camera" size={24} color="#fff" />
            <Text style={styles.scanButtonText}>Take Photo</Text>
          </TouchableOpacity>

          {error && (
            <ThemedText style={[styles.errorText, { color: '#FF6B6B' }]}>
              {error}
            </ThemedText>
          )}
        </ThemedView>
      </View>
    </>
  );
}

// Update the styles - remove paddingTop and change the approach

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', 
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000', 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000', 
  },
  formContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff', 
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cameraIcon: {
    marginBottom: 20,
  },
  title: {
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    lineHeight: 22,
  },
  confidenceText: {
    color: '#666',
    fontSize: 14,
    marginTop: 5,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  formSection: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 15,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#f9f9f9',
  },
  datePicker: {
    width: '100%',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    gap: 15,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: '#FF3B30',
    marginTop: 20,
    textAlign: 'center',
  },
  folderSelector: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  folderSelectorText: {
    fontSize: 16,
    color: '#333',
  },
  folderSelectorArrow: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    fontSize: 18,
    color: '#FF3B30',
  },
  folderList: {
    flex: 1,
  },
  folderOption: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedFolderOption: {
    backgroundColor: '#007AFF',
  },
  folderOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedFolderOptionText: {
    color: '#fff',
    fontWeight: '600',
  },
});