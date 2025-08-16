import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, Button, ActivityIndicator, StyleSheet, Image, Alert, SafeAreaView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native'; // Add this import
import { useReceipts } from '@/hooks/useReceipts';
import { useFolders } from '@/hooks/useFolders';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Folder } from '@/data/models/Folder';
import { Receipt } from '@/data/models/Receipt';

// Combined item type for the FlatList
type FolderOrReceipt = 
  | { type: 'folder'; data: Folder }
  | { type: 'receipt'; data: Receipt };

export default function ReceiptsScreen() {
  // --- STATE MANAGEMENT ---
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState('Home');

  // Hooks for data fetching
  const { receipts, isLoading: receiptsLoading, error: receiptsError, selectedReceipt, getReceiptById, updateReceipt, fetchReceipts, addReceipt, deleteReceipt } = useReceipts(currentFolderId);
  const { folders, isLoading: foldersLoading, error: foldersError, addFolder, getFolderById, deleteFolder, fetchAllFolders } = useFolders(); // Add fetchAllFolders

  // Add focus effect to refresh both receipts and folders when tab becomes active
  useFocusEffect(
    React.useCallback(() => {
      console.log('Receipts screen focused - refreshing data');
      fetchReceipts(); // Refresh receipts when user navigates to this tab
      fetchAllFolders(); // Also refresh folders in case new ones were created in scan tab
    }, [fetchReceipts, fetchAllFolders])
  );

  // Modal visibility states
  const [addFolderModalVisible, setAddFolderModalVisible] = useState(false);
  const [editReceiptModalVisible, setEditReceiptModalVisible] = useState(false);
  const [addReceiptModalVisible, setAddReceiptModalVisible] = useState(false);
  
  // State for forms
  const [newFolderName, setNewFolderName] = useState('');

  // --- DATA & NAVIGATION ---
  React.useEffect(() => {
    const fetchCurrentFolderName = async () => {
      if (currentFolderId === null) {
        setCurrentFolderName('Home');
      } else {
        const folder = await getFolderById(currentFolderId);
        setCurrentFolderName(folder?.name ?? 'Folder');
      }
    };
    fetchCurrentFolderName();
  }, [currentFolderId, getFolderById]);

  // Get current folder's subfolders
  const currentSubfolders = useMemo(() => {
    return folders.filter(folder => folder.parentId === currentFolderId);
  }, [folders, currentFolderId]);

  // Combine folders and receipts for display
  const combinedItems = useMemo((): FolderOrReceipt[] => {
    const folderItems: FolderOrReceipt[] = currentSubfolders.map(folder => ({
      type: 'folder' as const,
      data: folder
    }));
    
    const receiptItems: FolderOrReceipt[] = receipts.map(receipt => ({
      type: 'receipt' as const,
      data: receipt
    }));

    return [...folderItems, ...receiptItems];
  }, [currentSubfolders, receipts]);

  const handleBackPress = async () => {
    if (currentFolderId === null) return;
    const currentFolder = await getFolderById(currentFolderId);
    setCurrentFolderId(currentFolder?.parentId ?? null);
  };

  const handleFolderPress = (folder: Folder) => {
    setCurrentFolderId(folder.id);
  };

  const handleAddFolder = async () => {
    if (newFolderName.trim()) {
      await addFolder({
        name: newFolderName.trim(),
        parentId: currentFolderId
      });
      setNewFolderName('');
      setAddFolderModalVisible(false);
    }
  };

  // Delete handlers with confirmation
  const handleDeleteFolder = (folder: Folder) => {
    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${folder.name}"? This will also delete all receipts and subfolders inside it.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFolder(folder.id);
              Alert.alert('Success', 'Folder deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete folder');
            }
          },
        },
      ]
    );
  };

  const handleDeleteReceipt = (receipt: Receipt) => {
    Alert.alert(
      'Delete Receipt',
      `Are you sure you want to delete the receipt from "${receipt.storeName || 'Unknown Store'}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReceipt(receipt.id);
              Alert.alert('Success', 'Receipt deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete receipt');
            }
          },
        },
      ]
    );
  };

  const [editFields, setEditFields] = useState({
    storeName: '',
    date: new Date(),
    totalAmount: '',
    notes: '',
    imageUri: null as string | null,
  });

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addFields, setAddFields] = useState({
    storeName: '',
    date: new Date(),
    totalAmount: '',
    notes: '',
    imageUri: null as string | null,
  });

  // Camera logic
  const takePhoto = async (onImage: (uri: string) => void) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera permission is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      onImage(result.assets[0].uri);
    }
  };

  // Handle receipt selection and open edit modal
  const handlePressReceipt = async (id: number) => {
    await getReceiptById(id);
    setEditReceiptModalVisible(true);
  };

  React.useEffect(() => {
    if (selectedReceipt) {
      setEditFields({
        storeName: selectedReceipt.storeName ?? '',
        date: selectedReceipt.date ? new Date(selectedReceipt.date) : new Date(),
        totalAmount: selectedReceipt.totalAmount?.toString() ?? '',
        notes: selectedReceipt.notes ?? '',
        imageUri: selectedReceipt.imageUri ?? null,
      });
    }
  }, [selectedReceipt]);

  const handleSave = async () => {
    if (!selectedReceipt) return;
    await updateReceipt(selectedReceipt.id, {
      storeName: editFields.storeName,
      date: editFields.date.toISOString(),
      totalAmount: parseFloat(editFields.totalAmount) || 0,
      notes: editFields.notes,
      imageUri: editFields.imageUri,
    });
    setEditReceiptModalVisible(false);
    fetchReceipts();
  };

  const handleAddReceipt = async () => {
    await addReceipt({
      storeName: addFields.storeName,
      date: addFields.date.toISOString(),
      totalAmount: parseFloat(addFields.totalAmount) || 0,
      imageUri: addFields.imageUri,
      notes: addFields.notes,
      folderId: currentFolderId,
    });
    setAddModalVisible(false);
    setAddFields({ storeName: '', date: new Date(), totalAmount: '', notes: '', imageUri: null });
    fetchReceipts();
  };

  // Date picker handlers
  const onEditDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'set' && selectedDate) {
      setEditFields(f => ({ ...f, date: selectedDate }));
    }
  };

  const onAddDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'set' && selectedDate) {
      setAddFields(f => ({ ...f, date: selectedDate }));
    }
  };

  const renderItem = ({ item }: { item: FolderOrReceipt }) => {
    if (item.type === 'folder') {
      return (
        <View style={[styles.item, styles.folderItem]}>
          <TouchableOpacity 
            style={styles.itemMainContent}
            onPress={() => handleFolderPress(item.data)}
          >
            <Text style={styles.folderIcon}>📁</Text>
            <Text style={styles.title}>{item.data.name}</Text>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteFolder(item.data)}
          >
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <View style={[styles.item, styles.receiptItem]}>
          <TouchableOpacity 
            style={styles.itemMainContent}
            onPress={() => handlePressReceipt(item.data.id)}
          >
            <View style={styles.receiptContent}>
              <Text style={styles.title}>{item.data.storeName || 'No Store'}</Text>
              <Text>Date: {item.data.date || 'N/A'}</Text>
              <Text>Amount: ${item.data.totalAmount?.toFixed(2) ?? '0.00'}</Text>
            </View>
            {item.data.imageUri ? (
              <Image source={{ uri: item.data.imageUri }} style={styles.thumbnail} />
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteReceipt(item.data)}
          >
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  if (receiptsLoading || foldersLoading) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }

  if (receiptsError || foldersError) {
    return <Text style={{ color: 'red', margin: 20 }}>Error: {(receiptsError || foldersError)?.message}</Text>;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button and current folder name */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {currentFolderId !== null && (
            <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={styles.headerTitle}>{currentFolderName}</Text>
        
        <View style={styles.headerRight} />
      </View>

      {/* Action buttons */}
      <View style={styles.actionButtons}>
        <Button title="Add Folder" onPress={() => setAddFolderModalVisible(true)} />
        <Button title="Add Receipt" onPress={() => setAddModalVisible(true)} />
      </View>

      <FlatList
        data={combinedItems}
        keyExtractor={(item, index) => `${item.type}-${item.data.id}-${index}`}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No folders or receipts found in this location.
          </Text>
        }
      />

      {/* Add Folder Modal */}
      <Modal visible={addFolderModalVisible} animationType="slide" onRequestClose={() => setAddFolderModalVisible(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Folder</Text>
          <TextInput
            style={styles.input}
            placeholder="Folder Name"
            value={newFolderName}
            onChangeText={setNewFolderName}
          />
          <View style={styles.buttonRow}>
            <Button title="Add" onPress={handleAddFolder} />
            <Button title="Cancel" color="gray" onPress={() => setAddFolderModalVisible(false)} />
          </View>
        </View>
      </Modal>

      {/* Edit Receipt Modal */}
      <Modal visible={editReceiptModalVisible} animationType="slide" onRequestClose={() => setEditReceiptModalVisible(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Receipt</Text>
          <TextInput
            style={styles.input}
            placeholder="Store Name"
            value={editFields.storeName}
            onChangeText={text => setEditFields(f => ({ ...f, storeName: text }))}
          />
          
          <View style={styles.dateInput}>
            <Text style={styles.dateInputLabel}>Date</Text>
            <DateTimePicker
              value={editFields.date}
              mode="date"
              display="compact"
              onChange={onEditDateChange}
              style={styles.datePicker}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Total Amount"
            keyboardType="numeric"
            value={editFields.totalAmount}
            onChangeText={text => setEditFields(f => ({ ...f, totalAmount: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Notes"
            value={editFields.notes}
            onChangeText={text => setEditFields(f => ({ ...f, notes: text }))}
          />
          <Button
            title="Take Photo"
            onPress={() => takePhoto(uri => setEditFields(f => ({ ...f, imageUri: uri })))}
          />
          {editFields.imageUri ? (
            <Image source={{ uri: editFields.imageUri }} style={styles.preview} />
          ) : null}
          <View style={styles.buttonRow}>
            <Button title="Save" onPress={handleSave} />
            <Button title="Cancel" color="gray" onPress={() => setEditReceiptModalVisible(false)} />
          </View>
        </View>
      </Modal>

      {/* Add Receipt Modal */}
      <Modal visible={addModalVisible} animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Receipt</Text>
          <TextInput
            style={styles.input}
            placeholder="Store Name"
            value={addFields.storeName}
            onChangeText={text => setAddFields(f => ({ ...f, storeName: text }))}
          />

          <View style={styles.dateInput}>
            <Text style={styles.dateInputLabel}>Date</Text>
            <DateTimePicker
              value={addFields.date}
              mode="date"
              display="compact"
              onChange={onAddDateChange}
              style={styles.datePicker}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Total Amount"
            keyboardType="numeric"
            value={addFields.totalAmount}
            onChangeText={text => setAddFields(f => ({ ...f, totalAmount: text }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Notes"
            value={addFields.notes}
            onChangeText={text => setAddFields(f => ({ ...f, notes: text }))}
          />
          <Button
            title="Take Photo"
            onPress={() => takePhoto(uri => setAddFields(f => ({ ...f, imageUri: uri })))}
          />
          {addFields.imageUri ? (
            <Image source={{ uri: addFields.imageUri }} style={styles.preview} />
          ) : null}
          <View style={styles.buttonRow}>
            <Button title="Add" onPress={handleAddReceipt} />
            <Button title="Cancel" color="gray" onPress={() => setAddModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerLeft: {
    width: 80, // Fixed width to maintain consistent spacing
    justifyContent: 'flex-start',
  },
  headerRight: {
    width: 80, // Same width as left side for balance
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1, // This will take up remaining space between left and right
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginBottom: 4,
    borderRadius: 6,
  },
  itemMainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderItem: {
    backgroundColor: '#f0f8ff',
  },
  receiptItem: {
    backgroundColor: '#f9f9f9',
  },
  folderIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  arrow: {
    fontSize: 16,
    color: '#666',
    marginLeft: 'auto',
  },
  receiptContent: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginLeft: 12,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 40,
  },
  modalContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  preview: {
    width: 120,
    height: 120,
    marginVertical: 10,
    alignSelf: 'center',
    borderRadius: 8,
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 12,
  },
  dateInputLabel: {
    fontSize: 16,
    color: '#333',
  },
  datePicker: {
    width: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});